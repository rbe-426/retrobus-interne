import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Card, CardHeader, CardBody, Badge,
  Heading, SimpleGrid, Button, Center, Alert, AlertIcon,
  Divider, Progress, useToast, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel,
  Input, useDisclosure, Textarea, Switch, Spinner, Select,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, IconButton
} from '@chakra-ui/react';
import { 
  FiUser, FiCreditCard, FiCalendar, FiMail, FiPhone, 
  FiMapPin, FiKey, FiEdit, FiDownload, FiSave, FiX, FiPlus 
} from 'react-icons/fi';
import { useUser } from '../context/UserContext';
import { fetchWithCSRF } from '../lib/csrfClient';
// NOTE: Profil adhérent est géré côté serveur (créé depuis l'admin MyRBE)

// Use relative URLs by default so Vite dev proxy can route calls; fall back to env when provided
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const MEMBERSHIP_STATUS_CONFIG = {
  PENDING: { label: 'En attente', color: 'yellow', progress: 25 },
  ACTIVE: { label: 'Actif', color: 'green', progress: 100 },
  EXPIRED: { label: 'Expiré', color: 'red', progress: 0 },
  SUSPENDED: { label: 'Suspendu', color: 'orange', progress: 50 }
};

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

const OCCUPIED_POSITION_PREFIX = '[POSTE_OCCUPE]';
const EXEMPTION_PREFIX = '[EXONERATION]';

const extractExemptionDataFromNotes = (notes) => {
  const text = String(notes || '');
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith(EXEMPTION_PREFIX));
  if (!line) return { isExempted: false, exemptionReason: '' };
  const raw = line.slice(EXEMPTION_PREFIX.length).trim();
  if (!raw) return { isExempted: false, exemptionReason: '' };
  try {
    const parsed = JSON.parse(raw);
    return {
      isExempted: parsed?.isExempted === true,
      exemptionReason: String(parsed?.exemptionReason || '')
    };
  } catch {
    return { isExempted: false, exemptionReason: '' };
  }
};

export default function MyMembership() {
  const { user, member: ctxMember, memberLoading: ctxMemberLoading, memberError: ctxMemberError, memberApiBase: ctxApiBase, memberDataReady, refreshMember } = useUser();
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState(null);
  const [apiBase, setApiBase] = useState(null); // null => relative, string => absolute base
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  // Le profil ne se crée pas côté utilisateur: pas de mode création
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const { isOpen: isLinkOpen, onOpen: onLinkOpen, onClose: onLinkClose } = useDisclosure();
  const [linking, setLinking] = useState(false);
  const [linkMembers, setLinkMembers] = useState([]);
  const [linkSelectedId, setLinkSelectedId] = useState('');
  const toast = useToast();

  // Plus de détection de profil admin local: tout vient de l'API

  useEffect(() => {
    // Primarily rely on context; still keep local states for edit form
    refreshMember();
  }, []);

  useEffect(() => {
    setMemberData(ctxMember || null);
    setLoading(ctxMemberLoading);
    setLastError(ctxMemberError);
    setApiBase(ctxApiBase || null);
  }, [ctxMember, ctxMemberLoading, ctxMemberError, ctxApiBase]);

  // Charger et fusionner les données configurées par l'admin (MemberProfilesManager)
  useEffect(() => {
    console.log('📋 useEffect: memberDataReady=', memberDataReady, 'ctxMember?.id=', ctxMember?.id);
    if (memberDataReady && ctxMember && ctxMember.id) {
      console.log('✅ Conditions remplies, appel loadAndMergeAdminProfileData');
      // Les données du contexte sont maintenant complètes, charger seulement les compléments admin
      loadAndMergeAdminProfileData(ctxMember.id);
    }
  }, [memberDataReady, ctxMember?.id]);

  useEffect(() => {
    if (memberData && memberData.id) {
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [memberData?.id]);

  // Chargement du profil adhérent depuis l'API uniquement
  const fetchMemberData = async () => {
    // Keep a manual refresh route for the Retry button
    await refreshMember(true);
  };

  // Charger les données qui sont maintenant dans la BD Prisma (pas d'API spéciale)
  const loadAndMergeAdminProfileData = async (memberId) => {
    try {
      console.log('🔍 Chargement profil depuis BD Prisma pour memberId:', memberId);
      const token = localStorage.getItem('token');
      
      // ✅ Charger directement depuis Prisma via /api/members/me ou /api/members/:id
      const endpoints = [
        `${apiBase ?? ''}/api/members/me`,
        `${API_BASE_URL || ''}/api/members/me`,
        `/api/members/me`
      ];
      

      let response = null;
      for (const endpoint of endpoints) {
        try {
          const r = await fetchWithCSRF(endpoint, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (r.ok) {
            response = r;
            console.log('✅ Données chargées depuis:', endpoint);
            break;
          }
        } catch (err) {
          console.warn(`❌ Tentative échouée: ${endpoint}`, err.message);
        }
      }

      if (response) {
        const apiData = await response.json();
        const loadedData = apiData?.member || apiData?.data || apiData;
        console.log('✅ Données Prisma reçues:', loadedData);

        if (loadedData && typeof loadedData === 'object') {
          // Conserver les infos déjà présentes et appliquer les données member corrigées.
          setMemberData(prev => ({ ...(prev || {}), ...loadedData }));
        }
      } else {
        console.log('⚠️ Impossible de charger depuis Prisma, données du contexte uniquement');
      }
    } catch (error) {
      console.error('❌ Erreur chargement profil:', error);
    }
  };

  const handleEditProfile = () => {
    setEditMode(true);
    setEditData({ ...memberData });
  };

  // Plus de création locale de profil côté utilisateur

  const handleSaveProfile = async () => {
    try {
      if (!editData.firstName || !editData.lastName) {
        throw new Error('Prénom et nom requis');
      }
      // Sauvegarde via API avec fallback sur la base détectée
      const bases = [apiBase ?? '', API_BASE_URL || ''];
      let response = null;
      for (const b of bases) {
        try {
          const r = await fetchWithCSRF(`${b}/api/members/me`, {
            method: 'PUT',
            body: JSON.stringify(editData)
          });
          if (r.ok) { response = r; break; }
        } catch {}
      }
      if (!response) {
        throw new Error('Erreur de sauvegarde');
      }

      const updatedData = await response.json();
      const updatedMember = updatedData?.member || updatedData?.data || updatedData;
      setMemberData(updatedMember);
      setEditMode(false);
      toast({ status: 'success', title: 'Profil mis à jour', description: 'Vos informations ont été sauvegardées', duration: 3000 });
      
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: error.message,
        duration: 5000
      });
    }
  };

  const fetchDocuments = async () => {
    try {
      setDocsLoading(true);
      const bases = [apiBase ?? '', API_BASE_URL || ''];
      let ok = false;
      for (const b of bases) {
        try {
          const resp = await fetch(`${b}/api/members/me/documents`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (resp.ok) {
            const data = await resp.json();
            setDocuments(data?.documents || []);
            ok = true;
            break;
          }
        } catch {}
      }
      if (!ok) throw new Error('Chargement des documents impossible');
    } catch (e) {
      console.error('Docs error', e);
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const bases = [apiBase ?? '', API_BASE_URL || ''];
      let resp = null;
      for (const b of bases) {
        try {
          const r = await fetch(`${b}/api/documents/${doc.id}/download`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (r.ok) { resp = r; break; }
        } catch {}
      }
      if (!resp) throw new Error('Téléchargement impossible');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: e.message });
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditData({ ...memberData });
  };

  if (loading) {
    return (
      <Center h="400px">
        <Spinner size="xl" />
      </Center>
    );
  }

  // Helpers dates et échéances
  const formatDate = (d) => {
    try {
      const dt = typeof d === 'string' ? new Date(d) : d;
      return dt ? dt.toLocaleDateString('fr-FR') : '-';
    } catch {
      return '-';
    }
  };
  const addYears = (date, years) => {
    const d = new Date(date.getTime());
    d.setFullYear(d.getFullYear() + years);
    return d;
  };
  const daysBetween = (a, b) => Math.ceil((b.getTime() - a.getTime()) / (1000*60*60*24));

  const defaultStartDate = new Date('2026-01-01T00:00:00');
  const startDate = memberData?.membershipStartDate ? new Date(memberData.membershipStartDate) : defaultStartDate;
  const endDate = memberData?.membershipEndDate ? new Date(memberData.membershipEndDate) : null;
  const computedRenewal = addYears(startDate, 1);
  const effectiveExpiry = endDate || computedRenewal;
  const today = new Date();
  const isExpired = effectiveExpiry ? effectiveExpiry < today : false;
  const daysLeft = effectiveExpiry ? daysBetween(today, effectiveExpiry) : null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'green';
      case 'PENDING': return 'orange';
      case 'EXPIRED': return 'red';
      case 'SUSPENDED': return 'gray';
      default: return 'gray';
    }
  };

  const statusConfig = MEMBERSHIP_STATUS_CONFIG[memberData?.membershipStatus] || 
    { label: memberData?.membershipStatus || 'Non défini', color: 'gray', progress: 0 };
  const signatureHistory = Array.isArray(memberData?.signatureHistory)
    ? memberData.signatureHistory
    : [];
  const latestSignature = memberData?.latestSignature || signatureHistory[0] || null;
  const latestSignatureSnapshot = latestSignature?.memberSnapshot || {};
  const exemptionFromNotes = extractExemptionDataFromNotes(memberData?.notes);
  const paymentAmount = latestSignatureSnapshot?.paymentAmount ?? memberData?.paymentAmount ?? null;
  const paymentMethod = memberData?.paymentMethod || latestSignatureSnapshot?.paymentMethod || null;
  const isExempted = latestSignatureSnapshot?.isExempted === true || memberData?.isExempted === true || exemptionFromNotes.isExempted === true;
  const exemptionReason = latestSignatureSnapshot?.exemptionReason || memberData?.exemptionReason || exemptionFromNotes.exemptionReason || '';
  const lastPaymentPrimaryText = isExempted
    ? 'Exonération'
    : (paymentAmount !== null && paymentAmount !== undefined && String(paymentAmount) !== '' ? `${paymentAmount}€` : '-');
  const lastPaymentSecondaryText = isExempted
    ? (exemptionReason ? `Motif: ${exemptionReason}` : 'Motif non renseigné')
    : (paymentAmount !== null && paymentAmount !== undefined && String(paymentAmount) !== ''
      ? (paymentMethod ? `${PAYMENT_METHODS[paymentMethod] || paymentMethod}` : null)
      : null);

  const formatDateTime = (d) => {
    try {
      if (!d) return '-';
      const dt = typeof d === 'string' ? new Date(d) : d;
      return Number.isNaN(dt?.getTime?.()) ? '-' : dt.toLocaleString('fr-FR');
    } catch {
      return '-';
    }
  };

  const formatSignatureChannel = (channel) => {
    const c = String(channel || '').toLowerCase();
    if (!c) return 'Non précisé';
    if (c.includes('sms')) return 'SMS';
    if (c.includes('email')) return 'Email';
    if (c.includes('paper') || c.includes('papier')) return 'Papier';
    if (c.includes('web') || c.includes('digital') || c.includes('dematerial')) return 'Dématérialisé';
    return channel;
  };

  const getRoleLabel = (role) => {
    const key = String(role || '').toUpperCase();
    const map = {
      PRESIDENT: 'Président',
      VICE_PRESIDENT: 'Vice-président',
      TRESORIER: 'Trésorier',
      SECRETAIRE_GENERAL: 'Secrétaire général',
      ADMIN: 'Administrateur',
      MEMBER: 'Adhérent',
      VOLUNTEER: 'Bénévole',
      DRIVER: 'Conducteur'
    };
    return map[key] || (role ? String(role) : 'Non renseigné');
  };

  const extractOccupiedPosition = (notes) => {
    const text = String(notes || '');
    const line = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.startsWith(OCCUPIED_POSITION_PREFIX));
    return line ? line.slice(OCCUPIED_POSITION_PREFIX.length).trim() : '';
  };

  const occupiedPosition =
    latestSignatureSnapshot?.occupiedPosition ||
    extractOccupiedPosition(memberData?.notes) ||
    getRoleLabel(latestSignatureSnapshot?.role || memberData?.role);

  return (
    <Box p={6} maxW="4xl" mx="auto">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Heading size="lg" display="flex" alignItems="center">
            <FiUser style={{ marginRight: '8px' }} />
            Mon Adhésion
          </Heading>
          {editMode ? (
            <HStack>
              <Button leftIcon={<FiSave />} colorScheme="green" onClick={handleSaveProfile}>
                Sauvegarder
              </Button>
              <Button leftIcon={<FiX />} variant="outline" onClick={handleCancelEdit}>
                Annuler
              </Button>
            </HStack>
          ) : (
            <Button leftIcon={<FiEdit />} onClick={handleEditProfile}>
              Modifier
            </Button>
          )}
        </HStack>

        {/* Si le profil n'existe pas côté serveur */}
        {!memberData && (
          <Alert status="warning">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Profil adhérent introuvable</Text>
              <Text fontSize="sm">
                {lastError === 401 ? (
                  'Vous n’êtes pas autorisé. Veuillez vous reconnecter.'
                ) : lastError === 404 ? (
                  'Votre profil n’est pas encore lié. Si vous venez de réaliser une liaison, actualisez la page ou reconnectez-vous. Sinon, merci de contacter un administrateur pour l’associer depuis la Gestion des Adhérents.'
                ) : lastError === 500 ? (
                  'Erreur serveur lors de la récupération du profil.'
                ) : lastError === 'network-error' ? (
                  'Impossible de joindre l’API. Réseau ou CORS ? Essayez à nouveau.'
                ) : (
                  'Votre profil n\'est pas encore lié. Merci de contacter un administrateur pour l\'associer depuis la Gestion des Adhérents.'
                )}
              </Text>
              <HStack mt={3}>
                <Button size="sm" onClick={fetchMemberData}>Réessayer</Button>
                {(() => {
                  const roles = (user?.roles || []).map(r => String(r).toUpperCase());
                  const canLink = roles.some(r => ['ADMIN','PRESIDENT','VICE_PRESIDENT','TRESORIER','SECRETAIRE_GENERAL'].includes(r));
                  if (!canLink) return null;
                  return (
                    <Button size="sm" variant="outline" onClick={async()=>{
                  try {
                    setLinking(true);
                    const bases = [apiBase ?? '', API_BASE_URL || ''];
                    let data = null;
                    for (const b of bases) {
                      try {
                        const r = await fetch(`${b}/api/members?limit=500`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                        if (r.ok) { data = await r.json(); break; }
                      } catch {}
                    }
                    setLinkMembers(data?.members || []);
                    onLinkOpen();
                  } finally { setLinking(false); }
                    }} isLoading={linking}>Associer mon compte</Button>
                  );
                })()}
              </HStack>
            </Box>
          </Alert>
        )}

        {memberData && (
          <>
            {/* Plus de mode profil local admin */}
            {/* Onglets d'information */}
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList>
                <Tab>Informations personnelles</Tab>
                <Tab>Informations Adhérent</Tab>
                <Tab>Documents d'adhésions</Tab>
              </TabList>
              <TabPanels>
                {/* Tab 1: Informations personnelles */}
                <TabPanel px={0}>
                  <Card>
                    <CardHeader>
                      <Heading size="md">Informations personnelles</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        {editMode ? (
                          <>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                              <FormControl isRequired>
                                <FormLabel>Prénom</FormLabel>
                                <Input
                                  value={editData.firstName || ''}
                                  onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                                />
                              </FormControl>
                              <FormControl isRequired>
                                <FormLabel>Nom</FormLabel>
                                <Input
                                  value={editData.lastName || ''}
                                  onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel>Email</FormLabel>
                                <Input
                                  type="email"
                                  value={editData.email || ''}
                                  onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel>Téléphone</FormLabel>
                                <Input
                                  value={editData.phone || ''}
                                  onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                                />
                              </FormControl>
                            </SimpleGrid>

                            <FormControl>
                              <FormLabel>Adresse</FormLabel>
                              <Input
                                value={editData.address || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
                              />
                            </FormControl>

                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                              <FormControl>
                                <FormLabel>Code postal</FormLabel>
                                <Input
                                  value={editData.postalCode || ''}
                                  onChange={(e) => setEditData(prev => ({ ...prev, postalCode: e.target.value }))}
                                />
                              </FormControl>
                              <FormControl>
                                <FormLabel>Ville</FormLabel>
                                <Input
                                  value={editData.city || ''}
                                  onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))}
                                />
                              </FormControl>
                            </SimpleGrid>

                            <FormControl>
                              <FormLabel>Date de naissance</FormLabel>
                              <Input
                                type="date"
                                value={editData.birthDate ? editData.birthDate.split('T')[0] : ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, birthDate: e.target.value }))}
                              />
                            </FormControl>
                          </>
                        ) : (
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                            <Box>
                              <HStack mb={4}>
                                <FiUser />
                                <Box>
                                  <Text fontSize="sm" color="gray.600">Nom complet</Text>
                                  <Text fontWeight="bold">{memberData.firstName} {memberData.lastName}</Text>
                                </Box>
                              </HStack>
                              {memberData.email && (
                                <HStack mb={4}>
                                  <FiMail />
                                  <Box>
                                    <Text fontSize="sm" color="gray.600">Email</Text>
                                    <Text fontWeight="bold">{memberData.email}</Text>
                                  </Box>
                                </HStack>
                              )}
                              {memberData.phone && (
                                <HStack mb={4}>
                                  <FiPhone />
                                  <Box>
                                    <Text fontSize="sm" color="gray.600">Téléphone</Text>
                                    <Text fontWeight="bold">{memberData.phone}</Text>
                                  </Box>
                                </HStack>
                              )}
                            </Box>
                            <Box>
                              {(memberData.address || memberData.city) && (
                                <HStack mb={4}>
                                  <FiMapPin />
                                  <Box>
                                    <Text fontSize="sm" color="gray.600">Adresse</Text>
                                    <Text fontWeight="bold">
                                      {memberData.address && `${memberData.address}, `}
                                      {memberData.postalCode} {memberData.city}
                                    </Text>
                                  </Box>
                                </HStack>
                              )}
                              {memberData.birthDate && (
                                <HStack mb={4}>
                                  <FiCalendar />
                                  <Box>
                                    <Text fontSize="sm" color="gray.600">Date de naissance</Text>
                                    <Text fontWeight="bold">{new Date(memberData.birthDate).toLocaleDateString('fr-FR')}</Text>
                                  </Box>
                                </HStack>
                              )}
                            </Box>
                          </SimpleGrid>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </TabPanel>

                {/* Tab 2: Infos Adhérent */}
                <TabPanel px={0}>
                  <VStack spacing={6} align="stretch">
                    <Card>
                      <CardHeader>
                        <Heading size="md">Statut de l'Adhésion</Heading>
                      </CardHeader>
                      <CardBody>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 4, md: 6 }}>
                          <Box>
                            <Text fontSize="sm" color="gray.600" mb={2}>Statut actuel</Text>
                            <Badge colorScheme={getStatusColor(memberData.membershipStatus)} fontSize="md" p={2}>
                              {statusConfig.label}
                            </Badge>
                            <Progress value={statusConfig.progress} colorScheme={getStatusColor(memberData.membershipStatus)} mt={2} size="sm" />
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.600" mb={2}>Type d'adhésion</Text>
                            <Text fontWeight="bold">{MEMBERSHIP_TYPES[memberData.membershipType] || memberData.membershipType}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.600" mb={2}>Matricule</Text>
                            <Text fontWeight="bold" color="blue.600">{memberData.matricule}</Text>
                            <Text fontSize="xs" color="gray.500">Utilisé pour se connecter au site</Text>
                          </Box>
                        </SimpleGrid>

                        {/* Validité & Renouvellement */}
                        <Divider my={4} />
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 4, md: 6 }}>
                          <Box>
                            <Text fontSize="sm" color="gray.600" mb={1}>Date d'adhésion</Text>
                            <Text fontWeight="bold">{formatDate(startDate)}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.600" mb={1}>Expiration (date de renouvellement)</Text>
                            <Text fontWeight="bold" color={isExpired ? 'red.600' : 'gray.800'}>
                              {effectiveExpiry ? formatDate(effectiveExpiry) : '-'}
                            </Text>
                            {effectiveExpiry && (
                              <Text fontSize="xs" color={isExpired ? 'red.500' : 'gray.500'}>
                                {isExpired ? 'Adhésion expirée' : `${daysLeft} jour(s) restant(s)`}
                              </Text>
                            )}
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.600" mb={1}>Dernier paiement</Text>
                            <Text fontWeight="bold">{lastPaymentPrimaryText}</Text>
                            {lastPaymentSecondaryText && (
                              <Text fontSize="xs" color="gray.600">{lastPaymentSecondaryText}</Text>
                            )}
                          </Box>
                        </SimpleGrid>
                        {/* Message incitatif si proche de l'échéance */}
                        {!isExpired && daysLeft !== null && daysLeft <= 60 && (
                          <Alert status="warning" mt={4} borderRadius="md">
                            <AlertIcon />
                            Votre adhésion arrive à échéance dans {daysLeft} jour(s). Pensez à la renouveler.
                          </Alert>
                        )}
                        {/* Message si expirée */}
                        {isExpired && (
                          <Alert status="error" mt={4} borderRadius="md">
                            <AlertIcon />
                            Votre adhésion est expirée. Veuillez procéder au renouvellement.
                          </Alert>
                        )}
                      </CardBody>
                    </Card>

                    <Card>
                      <CardHeader>
                        <Heading size="md">Signature de l'adhésion</Heading>
                      </CardHeader>
                      <CardBody>
                        {latestSignature ? (
                          <VStack align="stretch" spacing={4}>
                            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 4, md: 6 }}>
                              <Box>
                                <Text fontSize="sm" color="gray.600" mb={1}>Dernière signature</Text>
                                <Text fontWeight="bold">{formatDateTime(latestSignature.signedAt || latestSignature.createdAt)}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600" mb={1}>Canal</Text>
                                <Badge colorScheme="blue" fontSize="sm" p={2}>{formatSignatureChannel(latestSignature.channel)}</Badge>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600" mb={1}>Référence</Text>
                                <Text fontWeight="bold" noOfLines={1}>{latestSignature.token}</Text>
                              </Box>
                            </SimpleGrid>

                            {latestSignature?.signatureDataUrl && (
                              <Box>
                                <Text fontSize="sm" color="gray.600" mb={2}>Signature enregistrée</Text>
                                <Box
                                  borderWidth="1px"
                                  borderRadius="md"
                                  p={3}
                                  bg="white"
                                  maxW="420px"
                                >
                                  <Box
                                    as="img"
                                    src={latestSignature.signatureDataUrl}
                                    alt="Signature adhérent"
                                    maxH="120px"
                                    objectFit="contain"
                                    w="100%"
                                  />
                                </Box>
                              </Box>
                            )}

                            <Box>
                              <Text fontSize="sm" color="gray.600" mb={2}>Informations du bulletin signé</Text>
                              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                                <Box>
                                  <Text fontSize="xs" color="gray.500">Nom</Text>
                                  <Text fontWeight="600">{`${latestSignatureSnapshot.firstName || memberData.firstName || ''} ${latestSignatureSnapshot.lastName || memberData.lastName || ''}`.trim() || '-'}</Text>
                                </Box>
                                <Box>
                                  <Text fontSize="xs" color="gray.500">Email</Text>
                                  <Text fontWeight="600">{latestSignatureSnapshot.email || memberData.email || '-'}</Text>
                                </Box>
                                <Box>
                                  <Text fontSize="xs" color="gray.500">Téléphone</Text>
                                  <Text fontWeight="600">{latestSignatureSnapshot.phone || memberData.phone || '-'}</Text>
                                </Box>
                                <Box>
                                  <Text fontSize="xs" color="gray.500">Type d'adhésion</Text>
                                  <Text fontWeight="600">{MEMBERSHIP_TYPES[latestSignatureSnapshot.membershipType] || latestSignatureSnapshot.membershipType || '-'}</Text>
                                </Box>
                                <Box>
                                  <Text fontSize="xs" color="gray.500">Cotisation</Text>
                                  <Text fontWeight="600">
                                    {latestSignatureSnapshot.paymentAmount !== null && latestSignatureSnapshot.paymentAmount !== undefined
                                      ? `${latestSignatureSnapshot.paymentAmount}€`
                                      : (memberData?.paymentAmount ? `${memberData.paymentAmount}€` : '-')}
                                  </Text>
                                </Box>
                                <Box>
                                  <Text fontSize="xs" color="gray.500">Adresse</Text>
                                  <Text fontWeight="600">
                                    {latestSignatureSnapshot.address
                                      ? `${latestSignatureSnapshot.address}${latestSignatureSnapshot.postalCode || latestSignatureSnapshot.city ? `, ${latestSignatureSnapshot.postalCode || ''} ${latestSignatureSnapshot.city || ''}` : ''}`.trim()
                                      : '-'}
                                  </Text>
                                </Box>
                                <Box>
                                  <Text fontSize="xs" color="gray.500">Permis déclarés</Text>
                                  <Text fontWeight="600">
                                    {latestSignatureSnapshot.hasDrivingLicenses
                                      ? (Array.isArray(latestSignatureSnapshot.drivingLicenses) && latestSignatureSnapshot.drivingLicenses.length > 0
                                        ? latestSignatureSnapshot.drivingLicenses.join(', ')
                                        : 'Oui (non détaillé)')
                                      : 'Non'}
                                  </Text>
                                </Box>
                                <Box>
                                  <Text fontSize="xs" color="gray.500">Numéro de permis</Text>
                                  <Text fontWeight="600">{latestSignatureSnapshot.drivingLicenseNumber || '-'}</Text>
                                </Box>
                                <Box>
                                  <Text fontSize="xs" color="gray.500">Engagements</Text>
                                  <Text fontWeight="600">
                                    {latestSignatureSnapshot.acceptedStatuts && latestSignatureSnapshot.acceptedReglementInterieur && latestSignatureSnapshot.acceptedCsar
                                      ? 'Statuts + Règlement + CSAR acceptés'
                                      : 'Non renseigné'}
                                  </Text>
                                </Box>
                                <Box>
                                  <Text fontSize="xs" color="gray.500">Poste occupé</Text>
                                  <Text fontWeight="600">{latestSignatureSnapshot?.occupiedPosition || occupiedPosition}</Text>
                                </Box>
                              </SimpleGrid>
                            </Box>

                            {signatureHistory.length > 1 && (
                              <Box>
                                <Text fontSize="sm" color="gray.600" mb={2}>Historique interne</Text>
                                <VStack align="stretch" spacing={2}>
                                  {signatureHistory.slice(0, 5).map((item) => (
                                    <HStack key={item.token} justify="space-between" p={2} borderWidth="1px" borderRadius="md">
                                      <Text fontSize="sm" fontWeight="600">{formatDateTime(item.signedAt || item.createdAt)}</Text>
                                      <Badge colorScheme="gray">{formatSignatureChannel(item.channel)}</Badge>
                                    </HStack>
                                  ))}
                                </VStack>
                              </Box>
                            )}
                          </VStack>
                        ) : (
                          <Text color="gray.600">Aucune signature enregistrée pour le moment.</Text>
                        )}
                      </CardBody>
                    </Card>

                    <Card>
                      <CardHeader>
                        <Heading size="md">Détails de paiement</Heading>
                      </CardHeader>
                      <CardBody>
                        {editMode ? (
                          <VStack spacing={4} align="stretch">
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                              <FormControl>
                                <FormLabel>Type d'adhésion</FormLabel>
                                <Select
                                  value={editData.membershipType || 'STANDARD'}
                                  onChange={(e) => setEditData(prev => ({ ...prev, membershipType: e.target.value }))}
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
                                  step="0.01"
                                  value={editData.paymentAmount || ''}
                                  onChange={(e) => setEditData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                                />
                              </FormControl>
                            </SimpleGrid>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                              <FormControl>
                                <FormLabel>Mode de paiement</FormLabel>
                                <Select
                                  value={editData.paymentMethod || 'CASH'}
                                  onChange={(e) => setEditData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                >
                                  {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                  ))}
                                </Select>
                              </FormControl>
                              <FormControl display="flex" alignItems="center">
                                <FormLabel htmlFor="newsletter" mb="0">Newsletter</FormLabel>
                                <Switch
                                  id="newsletter"
                                  isChecked={editData.newsletter}
                                  onChange={(e) => setEditData(prev => ({ ...prev, newsletter: e.target.checked }))}
                                />
                              </FormControl>
                            </SimpleGrid>
                            <FormControl>
                              <FormLabel>Notes</FormLabel>
                              <Textarea
                                value={editData.notes || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Notes personnelles..."
                              />
                            </FormControl>
                          </VStack>
                        ) : (
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }}>
                            <Box>
                              {memberData.paymentAmount && (
                                <HStack mb={4}>
                                  <FiCreditCard />
                                  <Box>
                                    <Text fontSize="sm" color="gray.600">Cotisation</Text>
                                    <Text fontWeight="bold">{memberData.paymentAmount}€ ({PAYMENT_METHODS[memberData.paymentMethod] || memberData.paymentMethod})</Text>
                                  </Box>
                                </HStack>
                              )}
                              <HStack mb={4}>
                                <FiUser />
                                <Box>
                                  <Text fontSize="sm" color="gray.600">Type</Text>
                                  <Text fontWeight="bold">{MEMBERSHIP_TYPES[memberData.membershipType] || memberData.membershipType}</Text>
                                </Box>
                              </HStack>
                              <HStack mb={4}>
                                <FiCalendar />
                                <Box>
                                  <Text fontSize="sm" color="gray.600">Date d'adhésion</Text>
                                  <Text fontWeight="bold">{formatDate(startDate)}</Text>
                                </Box>
                              </HStack>
                            </Box>
                            <Box>
                              <HStack mb={4}>
                                <FiKey />
                                <Box>
                                  <Text fontSize="sm" color="gray.600">Matricule</Text>
                                  <Text fontWeight="bold" color="blue.600">{memberData.matricule}</Text>
                                </Box>
                              </HStack>
                              {effectiveExpiry && (
                                <HStack mb={4}>
                                  <FiCalendar />
                                  <Box>
                                    <Text fontSize="sm" color="gray.600">Expiration (date de renouvellement)</Text>
                                    <Text fontWeight="bold" color={isExpired ? 'red.600' : 'gray.800'}>{formatDate(effectiveExpiry)}</Text>
                                  </Box>
                                </HStack>
                              )}
                            </Box>
                          </SimpleGrid>
                        )}
                      </CardBody>
                    </Card>

                  </VStack>
                </TabPanel>

                {/* Tab 3: Documents d'adhésions */}
                <TabPanel px={0}>
                  <Card>
                    <CardHeader>
                      <Heading size="md">Documents d'adhésions</Heading>
                    </CardHeader>
                    <CardBody>
                      {docsLoading ? (
                        <Center><Spinner /></Center>
                      ) : documents.length === 0 ? (
                        <Text color="gray.600">Aucun document pour le moment.</Text>
                      ) : (
                        <Table size="sm">
                          <Thead>
                            <Tr>
                              <Th>Fichier</Th>
                              <Th>Type</Th>
                              <Th>Ajouté le</Th>
                              <Th>Expiration</Th>
                              <Th>Statut</Th>
                              <Th></Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {documents.map((d) => (
                              <Tr key={d.id}>
                                <Td>{d.fileName}</Td>
                                <Td>{d.documentType || '-'}</Td>
                                <Td>{d.uploadedAt ? new Date(d.uploadedAt).toLocaleString('fr-FR') : '-'}</Td>
                                <Td>{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString('fr-FR') : '-'}</Td>
                                <Td><Badge>{d.status || 'PENDING'}</Badge></Td>
                                <Td textAlign="right">
                                  <Button size="sm" leftIcon={<FiDownload />} onClick={() => handleDownload(d)}>Télécharger</Button>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      )}
                    </CardBody>
                  </Card>
                </TabPanel>
              </TabPanels>
            </Tabs>

            {/* Poste occupé */}
            {!editMode && (
              <Card>
                <CardHeader>
                  <Heading size="md">Poste occupé</Heading>
                </CardHeader>
                <CardBody>
                  <Text fontWeight="bold">{occupiedPosition}</Text>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </VStack>

      {/* Modal: Associer mon compte admin à un adhérent */}
      <Modal isOpen={isLinkOpen} onClose={onLinkClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Associer mon compte à un adhérent</ModalHeader>
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="sm" color="gray.600">Sélectionnez l’adhérent correspondant à votre compte afin d’activer la page Mon Adhésion.</Text>
              <FormControl>
                <FormLabel>Adhérent</FormLabel>
                <Select value={linkSelectedId} onChange={(e)=>setLinkSelectedId(e.target.value)} placeholder="Choisir…">
                  {linkMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.lastName?.toUpperCase()} {m.firstName} — {m.email}</option>
                  ))}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button variant="ghost" onClick={onLinkClose}>Annuler</Button>
              <Button colorScheme="blue" isDisabled={!linkSelectedId} onClick={async()=>{
                try {
                  setLinking(true);
                  let ok = false; let err = null;
                  for (const b of [apiBase ?? '', API_BASE_URL || '']) {
                    try {
                      const r = await fetchWithCSRF(`${b}/api/members/${linkSelectedId}/link-access`, {
                        method: 'POST',
                        body: JSON.stringify({ username: (user?.username || '').toLowerCase() })
                      });
                      const d = await r.json().catch(()=>({}));
                      if (r.ok) { ok = true; break; } else { err = d?.error || 'Erreur de liaison'; }
                    } catch {}
                  }
                  if (!ok) throw new Error(err || 'Erreur de liaison');
                  toast({ status:'success', title:'Compte associé' });
                  onLinkClose();
                  await refreshMember(true);
                } catch (e) {
                  toast({ status:'error', title:'Échec', description: e.message });
                } finally { setLinking(false); }
              }}>Associer</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
