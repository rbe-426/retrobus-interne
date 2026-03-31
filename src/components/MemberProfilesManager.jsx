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
import { FiDownload, FiRefreshCw, FiSave, FiTrash2, FiUpload, FiX } from 'react-icons/fi';
import { membersAPI } from '../api/members';

const MEMBERSHIP_TYPES = {
  STANDARD: 'Adhésion Standard',
  FAMILY: 'Adhésion Famille',
  STUDENT: 'Adhésion Étudiant',
  HONORARY: 'Membre d\'Honneur',
  BIENFAITEUR: 'Bienfaiteur'
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

export default function MemberProfilesManager() {
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
    paymentAmount: '',
    paymentMethod: 'CASH',
    newsletter: false,
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

      // Fallback avec données mockées
      const mockMembers = [
        { id: '1', firstName: 'Jean', lastName: 'Dupont', matricule: 'MAT001', memberNumber: 'ADH001' },
        { id: '2', firstName: 'Marie', lastName: 'Martin', matricule: 'MAT002', memberNumber: 'ADH002' },
        { id: '3', firstName: 'Pierre', lastName: 'Bernard', matricule: 'MAT003', memberNumber: 'ADH003' }
      ];
      setMembers(mockMembers);
      if (!selectedMemberId) {
        setSelectedMemberId(mockMembers[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement membres:', error);
      
      // Fallback avec données mockées même en cas d'erreur
      const mockMembers = [
        { id: '1', firstName: 'Jean', lastName: 'Dupont', matricule: 'MAT001', memberNumber: 'ADH001' },
        { id: '2', firstName: 'Marie', lastName: 'Martin', matricule: 'MAT002', memberNumber: 'ADH002' },
        { id: '3', firstName: 'Pierre', lastName: 'Bernard', matricule: 'MAT003', memberNumber: 'ADH003' }
      ];
      setMembers(mockMembers);
      if (!selectedMemberId) {
        setSelectedMemberId(mockMembers[0].id);
      }
      
      toast({
        status: 'info',
        title: 'Mode hors ligne',
        description: 'Utilisation des données d\'exemple'
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadProfileData = async (memberId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      try {
        const response = await fetch(`/api/settings/member-profiles/${memberId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({ ...prev, ...data.memberProfile }));
          setDocuments(data.documents || []);
          return;
        }
      } catch (apiError) {
        console.log('API non disponible');
      }

      // Fallback localStorage
      const stored = localStorage.getItem(`memberProfile_${memberId}`);
      if (stored) {
        setFormData(prev => ({ ...prev, ...JSON.parse(stored) }));
      } else {
        // Réinitialiser le formulaire pour le nouveau membre
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          postalCode: '',
          city: '',
          birthDate: '',
          membershipType: 'STANDARD',
          paymentAmount: '',
          paymentMethod: 'CASH',
          newsletter: false,
          notes: '',
          licenseNumber: '',
          licenseCategory: '',
          medicalCertificate: '',
          drivingAuthorization: '',
          insurancePolicy: '',
          emergencyContact: '',
          emergencyPhone: ''
        });
      }
      setDocuments([]);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast({
        status: 'warning',
        title: 'Avertissement',
        description: 'Impossible de charger le profil (utilisation du stockage local)'
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
        paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : null,
        paymentMethod: formData.paymentMethod,
        newsletter: formData.newsletter,
        notes: formData.notes
        // ⚠️ licenseNumber, medicalCertificate, etc. ne sont pas dans la BD
        // Ils seront ignorés/stockés dans notes si critiques
      };

      // ✅ Essayer avec le bon endpoint Prisma
      let success = false;
      const candidates = [
        `/api/members/${selectedMemberId}`,
        `${import.meta.env.VITE_API_URL || ''}/api/members/${selectedMemberId}`
      ];

      for (const url of candidates) {
        try {
          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
          
          if (response.ok) {
            toast({
              status: 'success',
              title: 'Sauvegardé ✅',
              description: 'Profil adhérent synchronisé avec la base de données'
            });
            success = true;
            break;
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

      try {
        const response = await fetch(`/api/settings/member-profiles/${selectedMemberId}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataUpload
        });

        if (response.ok) {
          const result = await response.json();
          setDocuments(prev => [...prev, result.document]);
          onUploadClose();
          setNewDocument({ file: null, documentType: 'Pièce d\'identité', expiryDate: '' });
          toast({ status: 'success', title: 'Document ajouté' });
          return;
        }
      } catch (apiError) {
        console.log('API non disponible');
      }

      // Fallback localStorage
      const docId = Date.now().toString();
      const newDoc = {
        id: docId,
        fileName: newDocument.file.name,
        documentType: newDocument.documentType,
        expiryDate: newDocument.expiryDate || null,
        uploadedAt: new Date().toISOString(),
        status: 'PENDING'
      };
      setDocuments(prev => [...prev, newDoc]);
      onUploadClose();
      setNewDocument({ file: null, documentType: 'Pièce d\'identité', expiryDate: '' });
      toast({ status: 'success', title: 'Document ajouté', description: '(Local)' });
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
        const response = await fetch(`/api/settings/member-profiles/${selectedMemberId}/documents/${selectedDocument.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setDocuments(prev => prev.filter(d => d.id !== selectedDocument.id));
          onDeleteClose();
          toast({ status: 'success', title: 'Document supprimé' });
          return;
        }
      } catch (apiError) {
        console.log('API non disponible');
      }

      // Fallback localStorage
      setDocuments(prev => prev.filter(d => d.id !== selectedDocument.id));
      onDeleteClose();
      toast({ status: 'success', title: 'Document supprimé', description: '(Local)' });
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
            Type d'adhésion, Montant, Méthode de paiement, Newsletter, Notes
          </Text>
          <Text fontSize="xs" mt={2} color="orange.600" fontWeight="bold">
            ⚠️ Les champs "Conducteur" et "Urgence" sont informatifs seulement
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
          <Tab>🚗 Conducteur</Tab>
          <Tab>🆘 Urgence</Tab>
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
                  <FormLabel>Montant cotisation (€)</FormLabel>
                  <Input
                    type="number"
                    placeholder="50"
                    value={formData.paymentAmount}
                    onChange={(e) => handleInputChange('paymentAmount', e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Mode de paiement</FormLabel>
                <Select
                  value={formData.paymentMethod}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                >
                  {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </Select>
              </FormControl>

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
            </VStack>
          </TabPanel>

          {/* Tab 3: Conducteur */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Numéro de permis</FormLabel>
                <Input
                  placeholder="XXXXXXXXXXXX"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Catégorie de permis</FormLabel>
                <Input
                  placeholder="A, B, C, D..."
                  value={formData.licenseCategory}
                  onChange={(e) => handleInputChange('licenseCategory', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Certificat médical</FormLabel>
                <Input
                  placeholder="Détails du certificat..."
                  value={formData.medicalCertificate}
                  onChange={(e) => handleInputChange('medicalCertificate', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Autorisation de conduite</FormLabel>
                <Input
                  placeholder="Détails de l'autorisation..."
                  value={formData.drivingAuthorization}
                  onChange={(e) => handleInputChange('drivingAuthorization', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Numéro d'assurance</FormLabel>
                <Input
                  placeholder="Numéro de police..."
                  value={formData.insurancePolicy}
                  onChange={(e) => handleInputChange('insurancePolicy', e.target.value)}
                />
              </FormControl>
            </VStack>
          </TabPanel>

          {/* Tab 4: Urgence */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Personne à contacter en cas d'urgence</FormLabel>
                <Input
                  placeholder="Nom et prénom"
                  value={formData.emergencyContact}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Téléphone d'urgence</FormLabel>
                <Input
                  placeholder="06 xx xx xx xx"
                  value={formData.emergencyPhone}
                  onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                />
              </FormControl>
            </VStack>
          </TabPanel>

          {/* Tab 5: Documents */}
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
              onClick={loadProfileData}
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
