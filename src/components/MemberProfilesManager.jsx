import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Card, CardHeader, CardBody, CardFooter,
  Heading, FormControl, FormLabel, Input, Button, useToast,
  SimpleGrid, Text, Switch, Badge, Icon, Spinner, Alert, AlertIcon,
  Divider, Select, Textarea, Tabs, TabList, TabPanels, Tab, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, IconButton, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  InputGroup, InputRightElement, Center
} from '@chakra-ui/react';
import { FiRefreshCw, FiSave, FiTrash2, FiUpload } from 'react-icons/fi';
import { membersAPI } from '../api/members';
import { fetchWithCSRF, fetchCSRFToken, getStoredCSRFToken, updateCSRFTokenFromResponse } from '../lib/csrfClient';

const MEMBERSHIP_TYPES = {
  STANDARD: 'Adhésion Standard',
  FAMILY: 'Adhésion Famille',
  STUDENT: 'Adhésion Étudiant',
  HONORARY: 'Membre d\'Honneur',
  BIENFAITEUR: 'Bienfaiteur',
  STAGIAIRE: 'Stagiaire'
};

const PAYMENT_METHODS = {
  CASH: 'Espèces',
  CHECK: 'Chèque',
  BANK_TRANSFER: 'Virement',
  CARD: 'Carte bancaire',
  PAYPAL: 'PayPal',
  HELLOASSO: 'HelloAsso'
};

const DOCUMENT_TYPES = [
  'Pièce d\'identité',
  'Justificatif de domicile',
  'Permis de conduire',
  'Certificat médical',
  'Attestation d\'assurance',
  'Justificatif d\'études',
  'Autre'
];

const OCCUPIED_POSITION_PREFIX = '[POSTE_OCCUPE]';
const EXEMPTION_PREFIX = '[EXONERATION]';
const EXEMPTION_REASON_OPTIONS = [
  { value: 'ARTICLE_4_CSAR', label: 'Article 4 du CSAR' },
  { value: 'ADHERENT_AVANT_2027', label: 'Adherent avant 2027' },
  { value: 'BUREAU_ASSOCIATIF', label: 'Bureau Associatif' },
  { value: 'AUTRE', label: 'Autre' }
];

const extractOccupiedPosition = (notes) => {
  const text = String(notes || '');
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith(OCCUPIED_POSITION_PREFIX));
  return line ? line.slice(OCCUPIED_POSITION_PREFIX.length).trim() : '';
};

const stripOccupiedPositionFromNotes = (notes) => {
  const text = String(notes || '');
  return text
    .split(/\r?\n/)
    .filter((line) => !String(line || '').trim().startsWith(OCCUPIED_POSITION_PREFIX))
    .join('\n')
    .trim();
};

const mergeOccupiedPositionIntoNotes = (notes, occupiedPosition) => {
  const cleanNotes = stripOccupiedPositionFromNotes(notes);
  const cleanPosition = String(occupiedPosition || '').trim();
  if (!cleanPosition) return cleanNotes || null;
  return cleanNotes
    ? `${OCCUPIED_POSITION_PREFIX}${cleanPosition}\n${cleanNotes}`
    : `${OCCUPIED_POSITION_PREFIX}${cleanPosition}`;
};

const defaultExemptionData = {
  isExempted: false,
  exemptionReason: '',
  exemptionCategory: '',
  exemptionOtherDetails: ''
};

const deriveExemptionConfig = (reason = '') => {
  const normalized = String(reason || '').trim();
  if (!normalized) {
    return { exemptionCategory: '', exemptionOtherDetails: '' };
  }

  const lower = normalized.toLowerCase();
  if (lower.startsWith('autre')) {
    const details = normalized.replace(/^autre\s*:?\s*/i, '').trim();
    return {
      exemptionCategory: 'AUTRE',
      exemptionOtherDetails: details
    };
  }

  const byLabel = EXEMPTION_REASON_OPTIONS.find((opt) => opt.label.toLowerCase() === lower);
  if (byLabel) {
    return {
      exemptionCategory: byLabel.value,
      exemptionOtherDetails: ''
    };
  }

  return {
    exemptionCategory: 'AUTRE',
    exemptionOtherDetails: normalized
  };
};

const buildExemptionReason = (exemptionData = {}) => {
  if (exemptionData?.isExempted !== true) return '';

  const category = String(exemptionData?.exemptionCategory || '').trim();
  const otherDetails = String(exemptionData?.exemptionOtherDetails || '').trim();

  if (category === 'AUTRE') {
    return otherDetails ? `Autre : ${otherDetails}` : 'Autre';
  }

  const option = EXEMPTION_REASON_OPTIONS.find((opt) => opt.value === category);
  if (option) return option.label;

  return String(exemptionData?.exemptionReason || '').trim();
};

const extractExemptionData = (notes) => {
  const text = String(notes || '');
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith(EXEMPTION_PREFIX));
  if (!line) return { ...defaultExemptionData };

  const raw = line.slice(EXEMPTION_PREFIX.length).trim();
  if (!raw) return { ...defaultExemptionData };
  try {
    const parsed = JSON.parse(raw);
    const parsedReason = String(parsed?.exemptionReason || '').trim();
    const normalized = deriveExemptionConfig(parsedReason);
    return {
      ...defaultExemptionData,
      ...(parsed || {}),
      ...normalized,
      isExempted: parsed?.isExempted === true
    };
  } catch {
    return { ...defaultExemptionData };
  }
};

const stripExemptionDataFromNotes = (notes) => {
  const text = String(notes || '');
  return text
    .split(/\r?\n/)
    .filter((line) => !String(line || '').trim().startsWith(EXEMPTION_PREFIX))
    .join('\n')
    .trim();
};

const mergeFormalitiesIntoNotes = (notes, occupiedPosition, exemptionData) => {
  const cleanNotes = stripExemptionDataFromNotes(stripOccupiedPositionFromNotes(notes));
  const blocks = [];
  const cleanPosition = String(occupiedPosition || '').trim();
  if (cleanPosition) {
    blocks.push(`${OCCUPIED_POSITION_PREFIX}${cleanPosition}`);
  }
  if (exemptionData?.isExempted === true) {
    blocks.push(`${EXEMPTION_PREFIX}${JSON.stringify({
      isExempted: true,
      exemptionReason: buildExemptionReason(exemptionData)
    })}`);
  }
  if (cleanNotes) {
    blocks.push(cleanNotes);
  }
  return blocks.length > 0 ? blocks.join('\n') : null;
};

export default function MemberProfilesManager() {
  const createDefaultFormData = () => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    birthDate: '',
    membershipType: 'STANDARD',
    membershipStatus: 'ACTIVE',
    membershipStartDate: '',
    membershipEndDate: '',
    paymentAmount: '',
    paymentMethod: 'CASH',
    newsletter: false,
    exemptionData: { ...defaultExemptionData },
    occupiedPosition: '',
    notes: ''
  });

  const [formData, setFormData] = useState({
    // Infos personnelles
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    birthDate: '',
    
    // Infos d'adhésion
    membershipType: 'STANDARD',
    membershipStatus: 'ACTIVE',
    membershipStartDate: '',
    membershipEndDate: '',
    paymentAmount: '',
    paymentMethod: 'CASH',
    newsletter: false,
    exemptionData: { ...defaultExemptionData },
    occupiedPosition: '',
    notes: '',
    
    // Infos conducteur
    licenseNumber: '',
    licenseCategory: '',
    medicalCertificate: '',
    drivingAuthorization: '',
    insurancePolicy: '',
    
    // Infos d'urgence
    emergencyContact: '',
    emergencyPhone: ''
  });

  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(true);
  const { isOpen: isUploadOpen, onOpen: onUploadOpen, onClose: onUploadClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [newDocument, setNewDocument] = useState({ file: null, documentType: 'Pièce d\'identité', expiryDate: '' });
  const toast = useToast();

  useEffect(() => {
    loadMembers();
  }, []); // Chargement une seule fois au montage

  useEffect(() => {
    if (selectedMemberId) {
      loadProfileData(selectedMemberId);
    }
  }, [selectedMemberId]); // Chargement quand on change de membre

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      
      // Utilise l'API membre qui gère tous les endpoints
      const result = await membersAPI.getAll();
      
      if (result?.members && result.members.length > 0) {
        setMembers(result.members);
        if (!selectedMemberId) {
          setSelectedMemberId(result.members[0].id);
        }
        return;
      }
      setMembers([]);
      setSelectedMemberId('');
    } catch (error) {
      console.error('Erreur chargement membres:', error);
      setMembers([]);
      setSelectedMemberId('');
      
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Impossible de charger les adhérents depuis l\'API'
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadProfileData = async (memberId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/members/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Impossible de charger le profil adhérent');
      }

      const rawData = await response.json();
      const memberData = rawData?.member || rawData?.data || rawData;
      const defaults = createDefaultFormData();

      setFormData({
        ...defaults,
        ...memberData,
        birthDate: memberData?.birthDate ? String(memberData.birthDate).split('T')[0] : '',
        membershipStartDate: memberData?.membershipStartDate ? String(memberData.membershipStartDate).split('T')[0] : '',
        membershipEndDate: memberData?.membershipEndDate ? String(memberData.membershipEndDate).split('T')[0] : '',
        occupiedPosition: extractOccupiedPosition(memberData?.notes),
        exemptionData: extractExemptionData(memberData?.notes),
        notes: stripExemptionDataFromNotes(stripOccupiedPositionFromNotes(memberData?.notes))
      });

      const docsResponse = await fetch(`/api/members/${memberId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setDocuments(Array.isArray(docsData?.documents) ? docsData.documents : []);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      setFormData(createDefaultFormData());
      setDocuments([]);
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Impossible de charger le profil adhérent depuis l\'API'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // 🔄 Préparer les données UNIQUEMENT pour les champs BD réels
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        postalCode: formData.postalCode,
        city: formData.city,
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
        membershipType: formData.membershipType,
        membershipStatus: formData.membershipStatus,
        membershipStartDate: formData.membershipStartDate || null,
        membershipEndDate: formData.membershipEndDate || null,
        paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : null,
        paymentMethod: formData.paymentMethod,
        newsletter: formData.newsletter,
        notes: mergeFormalitiesIntoNotes(formData.notes, formData.occupiedPosition, formData.exemptionData)
      };

      if (formData?.exemptionData?.isExempted === true) {
        payload.paymentAmount = null;
        payload.paymentMethod = null;
      }

      // ✅ Essayer avec le bon endpoint Prisma
      let success = false;
      const candidates = [
        `/api/members/${selectedMemberId}`,
        `${import.meta.env.VITE_API_URL || ''}/api/members/${selectedMemberId}`
      ];

      for (const url of candidates) {
        try {
          const response = await fetchWithCSRF(url, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          
          if (response.ok) {
            toast({
              status: 'success',
              title: 'Sauvegardé ✅',
              description: 'Profil adhérent synchronisé avec la base de données'
            });
            await loadProfileData(selectedMemberId);
            success = true;
            break;
          }
          if (response.status === 403) {
            const errBody = await response.clone().json().catch(() => ({}));
            throw new Error(errBody?.error || errBody?.code || 'Acces refuse (403)');
          }
        } catch (e) {
          console.warn(`Tentative échouée: ${url}`, e.message);
        }
      }

      if (!success) {
        throw new Error('Tous les endpoints ont échoué');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      toast({
        status: 'error',
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder le profil'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async () => {
    try {
      if (!newDocument.file) {
        toast({ status: 'error', title: 'Erreur', description: 'Veuillez sélectionner un fichier' });
        return;
      }

      setUploadingDoc(true);
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', newDocument.file);
      formDataUpload.append('documentType', newDocument.documentType);
      formDataUpload.append('expiryDate', newDocument.expiryDate || '');

      let csrfToken = getStoredCSRFToken();
      if (!csrfToken) {
        const apiBase = import.meta.env.VITE_API_URL || '';
        csrfToken = await fetchCSRFToken(apiBase);
      }

      try {
        const response = await fetch(`/api/members/${selectedMemberId}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
          },
          body: formDataUpload
        });

        if (response.ok) {
          updateCSRFTokenFromResponse(response);
          const result = await response.json();
          setDocuments(prev => [...prev, result.document || result]);
          onUploadClose();
          setNewDocument({ file: null, documentType: 'Pièce d\'identité', expiryDate: '' });
          toast({ status: 'success', title: 'Document ajouté' });
          return;
        }
      } catch (apiError) {
        throw apiError;
      }
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Impossible d\'ajouter le document'
      });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');

      try {
        const response = await fetchWithCSRF(`/api/members/${selectedMemberId}/documents/${selectedDocument.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setDocuments(prev => prev.filter(d => d.id !== selectedDocument.id));
          onDeleteClose();
          toast({ status: 'success', title: 'Document supprimé' });
          return;
        }
      } catch (apiError) {
        throw apiError;
      }
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: 'Impossible de supprimer le document'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <VStack spacing={6} align="stretch">
      <Alert status="info">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">✅ Champs synchronisés avec "Mon Adhésion":</Text>
          <Text fontSize="sm">
            Prénom, Nom, Email, Téléphone, Adresse, Code postal, Ville, Date de naissance, 
            Type d'adhésion, Statut, Dates d'adhésion, Montant, Méthode de paiement, Newsletter, Notes
          </Text>
        </Box>
      </Alert>

      {/* Sélecteur d'adhérent */}
      <Card>
        <CardHeader>
          <Heading size="md">Sélectionner un adhérent</Heading>
        </CardHeader>
        <CardBody>
          <FormControl isRequired>
            <FormLabel>Adhérent</FormLabel>
            <Select
              placeholder="Sélectionner un adhérent..."
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              isDisabled={loadingMembers || members.length === 0}
            >
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName} ({member.matricule || member.memberNumber || 'N/A'})
                </option>
              ))}
            </Select>
            {loadingMembers && <Text fontSize="sm" color="gray.600" mt={2}>Chargement des adhérents...</Text>}
            {!loadingMembers && members.length === 0 && <Text fontSize="sm" color="red.600" mt={2}>Aucun adhérent trouvé</Text>}
          </FormControl>
        </CardBody>
      </Card>

      {selectedMemberId && loading ? (
        <Center py={8}><Spinner /></Center>
      ) : selectedMemberId ? (
        <>
      <Tabs colorScheme="blue" variant="enclosed">
        <TabList>
          <Tab>👤 Infos personnelles</Tab>
          <Tab>🎫 Adhésion</Tab>
          <Tab>📄 Documents</Tab>
        </TabList>

        <TabPanels>
          {/* Tab 1: Infos personnelles */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Prénom</FormLabel>
                  <Input
                    placeholder="Prénom"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Nom</FormLabel>
                  <Input
                    placeholder="Nom"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Téléphone</FormLabel>
                  <Input
                    placeholder="06 xx xx xx xx"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Adresse</FormLabel>
                <Input
                  placeholder="Rue, numéro..."
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Code postal</FormLabel>
                  <Input
                    placeholder="75000"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Ville</FormLabel>
                  <Input
                    placeholder="Paris"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Date de naissance</FormLabel>
                <Input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                />
              </FormControl>
            </VStack>
          </TabPanel>

          {/* Tab 2: Adhésion */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Type d'adhésion</FormLabel>
                  <Select
                    value={formData.membershipType}
                    onChange={(e) => handleInputChange('membershipType', e.target.value)}
                  >
                    {Object.entries(MEMBERSHIP_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Statut d'adhésion</FormLabel>
                  <Select
                    value={formData.membershipStatus}
                    onChange={(e) => handleInputChange('membershipStatus', e.target.value)}
                  >
                    <option value="ACTIVE">Actif</option>
                    <option value="PENDING">En attente</option>
                    <option value="EXPIRED">Expiré</option>
                    <option value="SUSPENDED">Suspendu</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Montant cotisation (€)</FormLabel>
                  <Input
                    type="number"
                    placeholder="50"
                    value={formData.paymentAmount}
                    isDisabled={formData?.exemptionData?.isExempted === true}
                    onChange={(e) => handleInputChange('paymentAmount', e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Date d'adhésion</FormLabel>
                  <Input
                    type="date"
                    value={formData.membershipStartDate}
                    onChange={(e) => handleInputChange('membershipStartDate', e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Date de renouvellement / expiration</FormLabel>
                  <Input
                    type="date"
                    value={formData.membershipEndDate}
                    onChange={(e) => handleInputChange('membershipEndDate', e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Mode de paiement</FormLabel>
                <Select
                  value={formData.paymentMethod}
                  isDisabled={formData?.exemptionData?.isExempted === true}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                >
                  {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </Select>
              </FormControl>

              <Box p={4} borderWidth="1px" borderRadius="md" bg="orange.50">
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="isExemptedProfile" mb="0">Exonéré de cotisation</FormLabel>
                  <Switch
                    id="isExemptedProfile"
                    isChecked={formData?.exemptionData?.isExempted === true}
                    onChange={(e) => handleInputChange('exemptionData', {
                      ...(formData.exemptionData || defaultExemptionData),
                      isExempted: e.target.checked
                    })}
                  />
                </FormControl>
                {formData?.exemptionData?.isExempted === true && (
                  <>
                    <FormControl mt={3}>
                      <FormLabel>Motif de l'exonération</FormLabel>
                      <Select
                        value={formData?.exemptionData?.exemptionCategory || ''}
                        onChange={(e) => handleInputChange('exemptionData', {
                          ...(formData.exemptionData || defaultExemptionData),
                          exemptionCategory: e.target.value,
                          exemptionReason: buildExemptionReason({
                            ...(formData.exemptionData || defaultExemptionData),
                            exemptionCategory: e.target.value
                          })
                        })}
                      >
                        <option value="">Selectionner un motif</option>
                        {EXEMPTION_REASON_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </FormControl>
                    {formData?.exemptionData?.exemptionCategory === 'AUTRE' && (
                      <FormControl mt={3}>
                        <FormLabel>Précision du motif</FormLabel>
                        <Input
                          placeholder="Preciser le motif"
                          value={formData?.exemptionData?.exemptionOtherDetails || ''}
                          onChange={(e) => handleInputChange('exemptionData', {
                            ...(formData.exemptionData || defaultExemptionData),
                            exemptionOtherDetails: e.target.value,
                            exemptionReason: buildExemptionReason({
                              ...(formData.exemptionData || defaultExemptionData),
                              exemptionOtherDetails: e.target.value
                            })
                          })}
                        />
                      </FormControl>
                    )}
                  </>
                )}
              </Box>

              <HStack>
                <FormControl display="flex" alignItems="center" width="auto">
                  <FormLabel htmlFor="newsletter" mb="0">S'abonner à la newsletter</FormLabel>
                  <Switch
                    id="newsletter"
                    isChecked={formData.newsletter}
                    onChange={(e) => handleInputChange('newsletter', e.target.checked)}
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  placeholder="Notes personnelles ou administratives..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Poste occupé (formalité)</FormLabel>
                <Input
                  placeholder="Ex: Président 2026-2027"
                  value={formData.occupiedPosition || ''}
                  onChange={(e) => handleInputChange('occupiedPosition', e.target.value)}
                />
              </FormControl>
            </VStack>
          </TabPanel>

          {/* Tab 3: Documents */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Button
                leftIcon={<FiUpload />}
                colorScheme="blue"
                onClick={onUploadOpen}
              >
                Ajouter un document
              </Button>

              {documents.length === 0 ? (
                <Text color="gray.600" textAlign="center" py={8}>
                  Aucun document pour le moment
                </Text>
              ) : (
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Fichier</Th>
                      <Th>Type</Th>
                      <Th>Ajouté le</Th>
                      <Th>Expiration</Th>
                      <Th></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {documents.map((doc) => (
                      <Tr key={doc.id}>
                        <Td>{doc.fileName}</Td>
                        <Td>{doc.documentType || '-'}</Td>
                        <Td>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('fr-FR') : '-'}</Td>
                        <Td>{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString('fr-FR') : '-'}</Td>
                        <Td textAlign="right">
                          <IconButton
                            icon={<FiTrash2 />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => {
                              setSelectedDocument(doc);
                              onDeleteOpen();
                            }}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Actions */}
      <Card bg="blue.50">
        <CardFooter>
          <HStack spacing={4}>
            <Button
              leftIcon={<FiSave />}
              colorScheme="blue"
              onClick={handleSaveProfile}
              isLoading={saving}
            >
              Enregistrer le profil
            </Button>
            <Button
              leftIcon={<FiRefreshCw />}
              variant="outline"
              onClick={() => loadProfileData(selectedMemberId)}
            >
              Réinitialiser
            </Button>
          </HStack>
        </CardFooter>
      </Card>

      {/* Modal Upload Document */}
      <Modal isOpen={isUploadOpen} onClose={onUploadClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ajouter un document</ModalHeader>
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Fichier</FormLabel>
                <InputGroup>
                  <Input
                    type="file"
                    display="none"
                    id="file-input"
                    onChange={(e) => setNewDocument(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  />
                  <Input
                    as="label"
                    htmlFor="file-input"
                    cursor="pointer"
                    placeholder={newDocument.file?.name || 'Sélectionner un fichier'}
                    value={newDocument.file?.name || ''}
                    readOnly
                  />
                </InputGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Type de document</FormLabel>
                <Select
                  value={newDocument.documentType}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, documentType: e.target.value }))}
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Date d'expiration (optionnel)</FormLabel>
                <Input
                  type="date"
                  value={newDocument.expiryDate}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={2}>
              <Button variant="ghost" onClick={onUploadClose}>Annuler</Button>
              <Button
                colorScheme="blue"
                onClick={handleUploadDocument}
                isLoading={uploadingDoc}
              >
                Ajouter
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Delete Document */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Supprimer le document</ModalHeader>
          <ModalBody>
            Êtes-vous sûr de vouloir supprimer {selectedDocument?.fileName} ?
          </ModalBody>
          <ModalFooter>
            <HStack spacing={2}>
              <Button variant="ghost" onClick={onDeleteClose}>Annuler</Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteDocument}
                isLoading={saving}
              >
                Supprimer
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
        </>
      ) : null}
    </VStack>
  );
}
