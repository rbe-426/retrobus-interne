import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Divider,
  useColorModeValue,
  Icon,
  Container,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  List,
  ListItem,
  ListIcon,
  UnorderedList,
  Alert,
  AlertIcon,
  Spinner,
  Center,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Checkbox,
  IconButton,
  Select,
  Flex,
} from '@chakra-ui/react';
import { FiAward, FiCheckCircle, FiFileText, FiClock, FiDollarSign, FiUsers, FiRefreshCw, FiMail, FiUpload, FiTrash2, FiHome, FiBarChart2, FiInfo, FiHelpCircle, FiPlus, FiEdit } from 'react-icons/fi';
import { subventionAPI } from '../api/subventionClient.js';
import { useUserRoles } from '../hooks/useUserRoles';
import SubventionStats from '../components/Subventions/SubventionStats';
import KpiCard from '../components/Subventions/KpiCard';

const EXPENSE_CATEGORIES = ['FUEL', 'MAINTENANCE', 'INSURANCE', 'MATERIAL', 'ADMINISTRATIVE', 'OTHER'];

export default function SubventionCampaign() {
  // État de navigation
  const [activeMainSection, setActiveMainSection] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('active');

  // Couleurs et styles
  const cardBg = useColorModeValue('white', 'gray.800');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const alertBg = useColorModeValue('blue.50', 'blue.900');
  const contactCardBg = useColorModeValue('orange.50', 'orange.900');
  const sidebarBg = useColorModeValue('gray.50', 'gray.800');
  const toast = useToast();

  // États des données
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [userExpenses, setUserExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // États du formulaire
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'OTHER',
    notes: ''
  });

  const [documentForm, setDocumentForm] = useState({
    documentType: '',
    file: null
  });

  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();

  // Check admin access
  const userRolesHook = useUserRoles();
  const isAdmin = userRolesHook.hasAdminAccess();

  // États pour création/édition de campagne
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    organization: '',
    description: '',
    minAmount: '',
    maxAmount: '',
    deadline: '',
    status: 'ACTIVE',
    websiteUrl: '',
    requiredDocuments: []
  });
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();

  // Charger les campagnes depuis l'API
  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await subventionAPI.getAll();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement campagnes:', err);
      setError('Impossible de charger les campagnes');
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les campagnes de subvention',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Séparer les campagnes par statut
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE' && new Date(c.deadline) > new Date());
  const upcomingCampaigns = campaigns.filter(c => c.status === 'ACTIVE' && new Date(c.deadline) <= new Date());

  // Calcul des stats
  const campaignStats = {
    total: campaigns.length,
    active: activeCampaigns.length,
    expired: upcomingCampaigns.length,
    totalBudget: campaigns.reduce((sum, c) => sum + (c.maxAmount || 0), 0)
  };

  useEffect(() => {
    loadCampaigns();
    
    // Charger les stats
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const statsData = await subventionAPI.getStats();
        setStats(statsData);
      } catch (error) {
        console.error('Erreur chargement stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    
    loadStats();
    
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(() => {
      loadCampaigns();
      loadStats();
    }, 300000);
    
    return () => clearInterval(interval);
  }, [loadCampaigns]);

  // Ouvrir le modal de détails
  const handleOpenDetail = async (campaign) => {
    setSelectedCampaign(campaign);
    // Charger les dépenses soumises par l'utilisateur
    try {
      const expenses = await subventionAPI.getExpenses(campaign.id);
      setUserExpenses(Array.isArray(expenses) ? expenses : []);
    } catch (error) {
      console.error('Erreur chargement dépenses:', error);
      setUserExpenses([]);
    }
    onDetailOpen();
  };

  // Soumettre une dépense
  const handleSubmitExpense = async () => {
    try {
      if (!expenseForm.description || !expenseForm.amount) {
        toast({ title: 'Erreur', description: 'Description et montant sont requis', status: 'error', duration: 3000, isClosable: true });
        return;
      }

      await subventionAPI.createExpense(selectedCampaign.id, {
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        notes: expenseForm.notes
      });

      toast({ title: 'Succès', description: 'Dépense soumise avec succès', status: 'success', duration: 3000, isClosable: true });
      
      // Recharger les dépenses
      const expenses = await subventionAPI.getExpenses(selectedCampaign.id);
      setUserExpenses(Array.isArray(expenses) ? expenses : []);
      
      // Réinitialiser le formulaire
      setExpenseForm({ description: '', amount: '', category: 'OTHER', notes: '' });
    } catch (error) {
      console.error('Erreur soumission dépense:', error);
      toast({ title: 'Erreur', description: 'Impossible de soumettre la dépense', status: 'error', duration: 3000, isClosable: true });
    }
  };

  // Supprimer une dépense
  const handleDeleteExpense = async (expenseId) => {
    try {
      await subventionAPI.deleteExpense(selectedCampaign.id, expenseId);
      toast({ title: 'Succès', description: 'Dépense supprimée', status: 'success', duration: 3000, isClosable: true });
      setUserExpenses(userExpenses.filter(e => e.id !== expenseId));
    } catch (error) {
      console.error('Erreur suppression dépense:', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer la dépense', status: 'error', duration: 3000, isClosable: true });
    }
  };

  // Créer ou modifier une campagne
  const handleSaveCampaign = async () => {
    try {
      if (!campaignForm.title || !campaignForm.organization || !campaignForm.deadline) {
        toast({ title: 'Erreur', description: 'Titre, organisation et échéance sont requis', status: 'error', duration: 3000, isClosable: true });
        return;
      }

      const campaignData = {
        title: campaignForm.title,
        organization: campaignForm.organization,
        description: campaignForm.description,
        minAmount: campaignForm.minAmount ? parseFloat(campaignForm.minAmount) : null,
        maxAmount: campaignForm.maxAmount ? parseFloat(campaignForm.maxAmount) : null,
        deadline: campaignForm.deadline,
        status: campaignForm.status,
        websiteUrl: campaignForm.websiteUrl,
        requiredDocuments: campaignForm.requiredDocuments
      };

      if (editingCampaignId) {
        // Modifier
        await subventionAPI.update(editingCampaignId, campaignData);
        toast({ title: 'Succès', description: 'Campagne modifiée', status: 'success', duration: 3000, isClosable: true });
      } else {
        // Créer
        await subventionAPI.create(campaignData);
        toast({ title: 'Succès', description: 'Campagne créée', status: 'success', duration: 3000, isClosable: true });
      }

      // Réinitialiser et recharger
      setCampaignForm({
        title: '',
        organization: '',
        description: '',
        minAmount: '',
        maxAmount: '',
        deadline: '',
        status: 'ACTIVE',
        websiteUrl: '',
        requiredDocuments: []
      });
      setEditingCampaignId(null);
      onCreateClose();
      await loadCampaigns();
    } catch (error) {
      console.error('Erreur save campagne:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder la campagne', status: 'error', duration: 3000, isClosable: true });
    }
  };

  // Supprimer une campagne
  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) return;

    try {
      await subventionAPI.delete(campaignId);
      toast({ title: 'Succès', description: 'Campagne supprimée', status: 'success', duration: 3000, isClosable: true });
      await loadCampaigns();
    } catch (error) {
      console.error('Erreur suppression campagne:', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer la campagne', status: 'error', duration: 3000, isClosable: true });
    }
  };

  // Sections principales
  const sections = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: FiHome, description: 'Campagnes disponibles' },
    { id: 'details', label: 'Processus', icon: FiBarChart2, description: 'Étapes et critères' },
    { id: 'documents', label: 'Documentation', icon: FiFileText, description: 'Pièces requises' },
    { id: 'help', label: 'FAQ', icon: FiHelpCircle, description: 'Questions fréquentes' },
    ...(isAdmin ? [{ id: 'manage', label: 'Gestion', icon: FiEdit, description: 'Créer & Modifier' }] : [])
  ];

  // Rendu du contenu principal
  const renderMainContent = () => {
    switch (activeMainSection) {
      case 'overview':
        return renderOverview();
      case 'details':
        return renderProcessDetails();
      case 'documents':
        return renderDocumentation();
      case 'help':
        return renderFAQ();
      case 'manage':
        return isAdmin ? renderManageCampaigns() : renderOverview();
      default:
        return renderOverview();
    }
  };

  // Rendu Overview
  const renderOverview = () => {
    // Calculer les statistiques des dépenses
    const campaignDetailsMap = {};
    campaigns.forEach(campaign => {
      const expensesForCampaign = userExpenses.filter(e => e.campaignId === campaign.id);
      const totalExpenses = expensesForCampaign.reduce((sum, e) => sum + (e.amount || 0), 0);
      const approvedExpenses = expensesForCampaign.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + (e.amount || 0), 0);
      const pendingExpenses = expensesForCampaign.filter(e => e.status === 'SUBMITTED').reduce((sum, e) => sum + (e.amount || 0), 0);
      
      campaignDetailsMap[campaign.id] = {
        total: totalExpenses,
        approved: approvedExpenses,
        pending: pendingExpenses,
        count: expensesForCampaign.length,
        approvedCount: expensesForCampaign.filter(e => e.status === 'APPROVED').length
      };
    });

    return (
      <VStack spacing={6} align="stretch">
        {/* Stats globales depuis le backend */}
        <SubventionStats stats={stats} loading={statsLoading} />

        {/* Alerte d'information */}
        <Alert
          status="info"
          variant="subtle"
          flexDirection="column"
          alignItems="flex-start"
          borderRadius="md"
          bg={alertBg}
        >
          <HStack mb={2}>
            <AlertIcon />
            <Heading size="md">Financements disponibles</Heading>
          </HStack>
          <Text fontSize="sm">
            Découvrez les opportunités de subvention adaptées à RétroBus Essonne. Contactez l'administration pour plus de détails sur chaque campagne.
          </Text>
        </Alert>

        {/* Campagnes actives avec détails */}
        {activeCampaigns.length > 0 ? (
          <Box>
            <HStack justify="space-between" mb={4}>
              <Heading size="lg">Campagnes actives</Heading>
              <Badge colorScheme="green" px={3} py={1}>{activeCampaigns.length}</Badge>
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {activeCampaigns.map((campaign) => {
                const details = campaignDetailsMap[campaign.id] || { total: 0, approved: 0, pending: 0, count: 0, approvedCount: 0 };
                const budgetUtilization = campaign.maxAmount 
                  ? (details.total / campaign.maxAmount) * 100 
                  : 0;
                
                return (
                  <Card key={campaign.id} bg={cardBg} borderRadius="lg" boxShadow="md" _hover={{ boxShadow: 'lg' }} transition="all 0.3s">
                    <CardHeader pb={2}>
                      <HStack justify="space-between" mb={2}>
                        <Heading size="md" color="orange.600" maxW="70%">{campaign.title}</Heading>
                        <Badge colorScheme="green" px={2} py={1}>Actif</Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">{campaign.organization}</Text>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                      <VStack align="start" spacing={3}>
                        <Box>
                          <Text fontWeight="600" color="orange.500">
                            {campaign.minAmount && campaign.maxAmount 
                              ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.minAmount)} - ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.maxAmount)}`
                              : 'Montant à confirmer'}
                          </Text>
                          {campaign.description && <Text fontSize="sm" color="gray.600" noOfLines={2}>{campaign.description}</Text>}
                        </Box>

                        {/* Indicateur de budget */}
                        {campaign.maxAmount && (
                          <Box width="100%">
                            <HStack justify="space-between" mb={1}>
                              <Text fontSize="xs" fontWeight="600">Utilisation du budget</Text>
                              <Text fontSize="xs" color="gray.600">{budgetUtilization.toFixed(1)}%</Text>
                            </HStack>
                            <Box height="6px" bg={useColorModeValue('gray.200', 'gray.700')} borderRadius="full" overflow="hidden">
                              <Box
                                height="100%"
                                width={`${Math.min(budgetUtilization, 100)}%`}
                                bg={budgetUtilization > 90 ? 'red.400' : budgetUtilization > 70 ? 'orange.400' : 'green.400'}
                                transition="all 0.3s"
                              />
                            </Box>
                          </Box>
                        )}

                        {/* Stats dépenses */}
                        {details.count > 0 && (
                          <SimpleGrid columns={3} spacing={2} width="100%">
                            <Box p={2} bg={sectionBg} borderRadius="md" textAlign="center">
                              <Text fontSize="xs" color="gray.600">Soumises</Text>
                              <Heading size="sm">{details.count}</Heading>
                            </Box>
                            <Box p={2} bg={useColorModeValue('green.50', 'green.900')} borderRadius="md" textAlign="center">
                              <Text fontSize="xs" color="green.600">Approuvées</Text>
                              <Heading size="sm" color="green.600">{details.approvedCount}</Heading>
                            </Box>
                            <Box p={2} bg={useColorModeValue('yellow.50', 'yellow.900')} borderRadius="md" textAlign="center">
                              <Text fontSize="xs" color="yellow.600">Attente</Text>
                              <Heading size="sm" color="yellow.600">{details.count - details.approvedCount}</Heading>
                            </Box>
                          </SimpleGrid>
                        )}

                        <HStack color="gray.600" fontSize="sm" width="100%">
                          <Icon as={FiClock} />
                          <Text>Échéance : {new Date(campaign.deadline).toLocaleDateString('fr-FR')}</Text>
                        </HStack>

                        <HStack width="100%" spacing={2} mt={2}>
                          <Button colorScheme="orange" size="sm" width="100%" leftIcon={<FiUpload />} onClick={() => handleOpenDetail(campaign)}>
                            Soumettre dossier
                          </Button>
                          {campaign.websiteUrl && (
                            <Button colorScheme="orange" variant="outline" size="sm" leftIcon={<FiFileText />} as="a" href={campaign.websiteUrl} target="_blank">
                              Info
                            </Button>
                          )}
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                );
              })}
            </SimpleGrid>
          </Box>
        ) : (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Box>
              <Heading size="md">Aucune campagne active</Heading>
              <Text fontSize="sm" mt={2}>Les campagnes seront actualisées régulièrement.</Text>
            </Box>
          </Alert>
        )}

        {/* Campagnes expirées */}
        {upcomingCampaigns.length > 0 && (
          <Box>
            <HStack justify="space-between" mb={4}>
              <Heading size="lg">Campagnes expirées</Heading>
              <Badge colorScheme="gray" px={3} py={1}>{upcomingCampaigns.length}</Badge>
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {upcomingCampaigns.map((campaign) => (
                <Card key={campaign.id} bg={cardBg} borderRadius="lg" opacity={0.8}>
                  <CardHeader pb={2}>
                    <HStack justify="space-between" mb={2}>
                      <Heading size="md" color="gray.600">{campaign.title}</Heading>
                      <Badge colorScheme="gray" px={2} py={1}>Expirée</Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600">{campaign.organization}</Text>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <Box>
                        <Text fontWeight="600" color="gray.500">
                          {campaign.minAmount && campaign.maxAmount 
                            ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.minAmount)} - ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.maxAmount)}`
                            : 'Montant à confirmer'}
                        </Text>
                        {campaign.description && <Text fontSize="sm" color="gray.600">{campaign.description}</Text>}
                      </Box>
                      <HStack color="gray.600" fontSize="sm">
                        <Icon as={FiClock} />
                        <Text>Échéance était : {new Date(campaign.deadline).toLocaleDateString('fr-FR')}</Text>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        )}
      </VStack>
    );
  };

  // Rendu Processus et Critères
  const renderProcessDetails = () => (
    <VStack spacing={6} align="stretch">
      {/* Processus */}
      <Box>
        <Heading size="lg" mb={4}>Processus de candidature</Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          {[
            { icon: FiFileText, title: "1. Préparation du dossier", description: "Rassemblez tous les documents nécessaires" },
            { icon: FiUsers, title: "2. Validation interne", description: "Accord du bureau de l'association" },
            { icon: FiCheckCircle, title: "3. Soumission", description: "Envoi du dossier auprès de l'organisme" },
            { icon: FiClock, title: "4. Suivi", description: "Suivi du traitement de la demande" },
          ].map((step, idx) => (
            <Card key={idx} bg={cardBg} borderRadius="lg" boxShadow="sm">
              <CardBody>
                <VStack spacing={3} align="center" textAlign="center">
                  <Icon as={step.icon} w={8} h={8} color="orange.500" />
                  <Heading size="sm">{step.title}</Heading>
                  <Text fontSize="sm" color="gray.600">{step.description}</Text>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </Box>

      {/* Critères de sélection */}
      <Box>
        <Heading size="lg" mb={4}>Critères de sélection</Heading>
        <Card bg={cardBg} borderRadius="lg">
          <CardBody>
            <List spacing={3}>
              {[
                "Inscription de l'association depuis au moins 2 ans",
                "Viabilité financière démontrée",
                "Impact social ou environnemental du projet",
                "Partenariats et collaborations",
                "Budget réaliste et bien justifié"
              ].map((criterion, idx) => (
                <ListItem key={idx} display="flex" alignItems="start">
                  <ListIcon as={FiCheckCircle} color="orange.500" mt={0.5} />
                  <Text>{criterion}</Text>
                </ListItem>
              ))}
            </List>
          </CardBody>
        </Card>
      </Box>
    </VStack>
  );

  // Rendu Documentation
  const renderDocumentation = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Documents requis</Heading>
      <Card bg={cardBg} borderRadius="lg">
        <CardBody>
          <VStack align="start" spacing={3}>
            <Heading size="sm">Pièces à joindre</Heading>
            <List spacing={2}>
              {[
                "Statuts de l'association",
                "Procès-verbaux des assemblées récentes",
                "Comptes de résultat et bilans (2 derniers exercices)",
                "Dossier descriptif du projet",
                "Budget prévisionnel détaillé",
                "Justificatifs des quotes-parts pour l'apport personnel"
              ].map((doc, idx) => (
                <ListItem key={idx} display="flex" alignItems="start">
                  <ListIcon as={FiCheckCircle} color="green.500" mt={0.5} />
                  <Text>{doc}</Text>
                </ListItem>
              ))}
            </List>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );

  // Rendu FAQ
  const renderFAQ = () => (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">Questions fréquemment posées</Heading>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {[
          { q: "Quel est le montant maximum demandable ?", a: "Le montant varie selon les dispositifs, généralement entre 3,000 et 30,000 €. Consultez les conditions de chaque campagne." },
          { q: "Combien de temps avant d'avoir une réponse ?", a: "Entre 2 et 6 mois selon le dispositif. Nous vous tiendrons informés de l'avancement du dossier." },
          { q: "Peut-on cumuler plusieurs subventions ?", a: "Oui, généralement possible mais avec des conditions de cofinancement. Contactez l'administration pour vérifier la compatibilité." },
          { q: "Quel délai pour soumettre un dossier ?", a: "Vous pouvez soumettre votre candidature jusqu'à la date limite de chaque campagne indiquée ci-contre." }
        ].map((item, idx) => (
          <Card key={idx} bg={cardBg} borderRadius="lg">
            <CardBody>
              <VStack align="start" spacing={2}>
                <Heading size="sm">{item.q}</Heading>
                <Text fontSize="sm" color="gray.600">{item.a}</Text>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </VStack>
  );

  // Rendu Gestion des campagnes (Admin seulement)
  const renderManageCampaigns = () => (
    <VStack spacing={6} align="stretch">
      {/* Bouton créer campagne */}
      <HStack justify="flex-end">
        <Button colorScheme="orange" leftIcon={<FiPlus />} onClick={onCreateOpen}>
          Nouvelle campagne
        </Button>
      </HStack>

      {/* Liste des campagnes existantes */}
      <Box>
        <Heading size="lg" mb={4}>Campagnes existantes</Heading>
        {campaigns.length > 0 ? (
          <VStack spacing={4} align="stretch">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} bg={cardBg} borderRadius="lg">
                <CardHeader pb={2}>
                  <HStack justify="space-between" mb={2}>
                    <VStack align="start" spacing={0}>
                      <Heading size="md">{campaign.title}</Heading>
                      <Text fontSize="sm" color="gray.600">{campaign.organization}</Text>
                    </VStack>
                    <Badge colorScheme={campaign.status === 'ACTIVE' ? 'green' : 'gray'}>
                      {campaign.status}
                    </Badge>
                  </HStack>
                </CardHeader>
                <Divider />
                <CardBody>
                  <VStack align="start" spacing={3}>
                    <Text fontSize="sm">{campaign.description}</Text>
                    <HStack color="gray.600" fontSize="sm" spacing={4}>
                      <HStack>
                        <Icon as={FiDollarSign} />
                        <Text>
                          {campaign.minAmount && campaign.maxAmount 
                            ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.minAmount)} - ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.maxAmount)}`
                            : 'Non défini'}
                        </Text>
                      </HStack>
                      <HStack>
                        <Icon as={FiClock} />
                        <Text>{new Date(campaign.deadline).toLocaleDateString('fr-FR')}</Text>
                      </HStack>
                    </HStack>
                    <HStack spacing={2} pt={2}>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<FiEdit />}
                        onClick={() => {
                          setCampaignForm({
                            title: campaign.title,
                            organization: campaign.organization,
                            description: campaign.description,
                            minAmount: campaign.minAmount?.toString() || '',
                            maxAmount: campaign.maxAmount?.toString() || '',
                            deadline: campaign.deadline?.split('T')[0] || '',
                            status: campaign.status,
                            websiteUrl: campaign.websiteUrl || '',
                            requiredDocuments: campaign.requiredDocuments || []
                          });
                          setEditingCampaignId(campaign.id);
                          onCreateOpen();
                        }}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="red"
                        leftIcon={<FiTrash2 />}
                        onClick={() => handleDeleteCampaign(campaign.id)}
                      >
                        Supprimer
                      </Button>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        ) : (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <Heading size="sm">Aucune campagne</Heading>
              <Text fontSize="sm">Créez votre première campagne de subvention</Text>
            </Box>
          </Alert>
        )}
      </Box>
    </VStack>
  );

  // Rendu d'une carte campagne
  const renderCampaignCard = (campaign) => {
    const amountRange = campaign.minAmount && campaign.maxAmount 
      ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.minAmount)} - ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.maxAmount)}`
      : campaign.minAmount 
      ? `À partir de ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.minAmount)}`
      : 'Montant à confirmer';

    return (
      <Card key={campaign.id} bg={cardBg} borderRadius="lg" boxShadow="md" _hover={{ boxShadow: 'lg' }} transition="all 0.3s">
        <CardHeader pb={2}>
          <HStack justify="space-between" mb={2}>
            <Heading size="md" color="orange.600">{campaign.title}</Heading>
            <Badge colorScheme="green" px={2} py={1}>Actif</Badge>
          </HStack>
          <Text fontSize="sm" color="gray.600">{campaign.organization}</Text>
        </CardHeader>
        <Divider />
        <CardBody>
          <VStack align="start" spacing={3}>
            <Box>
              <Text fontWeight="600" color="orange.500">{amountRange}</Text>
              {campaign.description && <Text fontSize="sm" color="gray.600">{campaign.description}</Text>}
            </Box>
            <HStack color="gray.600" fontSize="sm">
              <Icon as={FiClock} />
              <Text>Échéance : {new Date(campaign.deadline).toLocaleDateString('fr-FR')}</Text>
            </HStack>
            <HStack width="100%" spacing={2} mt={2}>
              <Button colorScheme="orange" size="sm" width="100%" leftIcon={<FiUpload />} onClick={() => handleOpenDetail(campaign)}>
                Soumettre dossier
              </Button>
              {campaign.websiteUrl && (
                <Button colorScheme="orange" variant="outline" size="sm" leftIcon={<FiFileText />} as="a" href={campaign.websiteUrl} target="_blank">
                  Info
                </Button>
              )}
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    );
  };

  if (loading) {
    return (
      <HStack align="stretch" spacing={0} h="100vh" w="100%">
        {/* Sidebar */}
        <VStack
          align="stretch"
          spacing={0}
          w="280px"
          bg={sidebarBg}
          borderRight="1px"
          borderColor={borderColor}
          overflowY="auto"
        >
          <Box p={6} borderBottom="1px" borderColor={borderColor}>
            <HStack spacing={3} mb={3}>
              <Icon as={FiAward} color="orange.500" boxSize={6} />
              <Box>
                <Heading size="md">Subventions</Heading>
                <Text fontSize="xs" color="gray.500">Campagnes</Text>
              </Box>
            </HStack>
          </Box>
        </VStack>

        {/* Contenu principal */}
        <Box flex={1} overflowY="auto">
          <Center h="100%">
            <VStack spacing={4}>
              <Spinner size="lg" color="orange.500" />
              <Text>Chargement des campagnes...</Text>
            </VStack>
          </Center>
        </Box>
      </HStack>
    );
  }

  return (
    <HStack align="stretch" spacing={0} h="100vh" w="100%">
      {/* Sidebar Navigation */}
      <VStack
        align="stretch"
        spacing={0}
        w="280px"
        bg={sidebarBg}
        borderRight="1px"
        borderColor={borderColor}
        overflowY="auto"
      >
        {/* Header du sidebar */}
        <Box p={6} borderBottom="1px" borderColor={borderColor}>
          <HStack spacing={3} mb={3}>
            <Icon as={FiAward} color="orange.500" boxSize={6} />
            <Box>
              <Heading size="md">Subventions</Heading>
              <Text fontSize="xs" color="gray.500">Campagnes</Text>
            </Box>
          </HStack>
        </Box>

        {/* Navigation principale */}
        <VStack align="stretch" spacing={0} px={3} py={4} flex={1}>
          {sections.map((section) => {
            const isActive = section.id === activeMainSection;
            const SectionIcon = section.icon;
            return (
              <Button
                key={section.id}
                leftIcon={<Icon as={SectionIcon} />}
                variant="ghost"
                justifyContent="flex-start"
                w="full"
                bg={isActive ? "orange.50" : "transparent"}
                borderLeft="3px"
                borderColor={isActive ? "orange.500" : "transparent"}
                borderRadius={0}
                px={4}
                py={6}
                fontSize="sm"
                fontWeight={isActive ? "600" : "500"}
                color={isActive ? "orange.500" : "inherit"}
                _hover={{ bg: "gray.100", borderLeftColor: "orange.500" }}
                onClick={() => setActiveMainSection(section.id)}
              >
                <VStack align="start" spacing={0} width="100%">
                  <Text>{section.label}</Text>
                  <Text fontSize="xs" color="gray.500">{section.description}</Text>
                </VStack>
              </Button>
            );
          })}
        </VStack>

        {/* Footer du sidebar */}
        <Box p={4} borderTop="1px" borderColor={borderColor}>
          <Card bg={contactCardBg} borderRadius="md" boxShadow="sm">
            <CardBody>
              <VStack align="start" spacing={2}>
                <Text fontSize="xs" fontWeight="600" color="orange.700">Support</Text>
                <Text fontSize="xs" color="orange.700">Besoin d'aide sur les subventions ?</Text>
                <Button size="xs" colorScheme="orange" width="100%" variant="solid">
                  Contacter
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </Box>
      </VStack>

      {/* Contenu principal */}
      <Box flex={1} overflowY="auto" bg={sectionBg}>
        <VStack align="stretch" spacing={0} h="100%">
          {/* En-tête avec bouton refresh */}
          <Box bg={cardBg} borderBottom="1px" borderColor={borderColor} p={6}>
            <HStack justify="space-between" align="center">
              <Box>
                <Heading size="lg">{sections.find(s => s.id === activeMainSection)?.label}</Heading>
                <Text fontSize="sm" color="gray.600">{sections.find(s => s.id === activeMainSection)?.description}</Text>
              </Box>
              <Button
                leftIcon={<FiRefreshCw />}
                onClick={loadCampaigns}
                isLoading={loading}
                variant="outline"
                colorScheme="orange"
                size="sm"
              >
                Rafraîchir
              </Button>
            </HStack>
          </Box>

          {/* Contenu */}
          <Box flex={1} p={6} overflowY="auto">
            {renderMainContent()}
          </Box>
        </VStack>
      </Box>

      {/* Modal - Détails campagne et soumission dépenses */}
      {selectedCampaign && (
        <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="xl" scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <VStack align="start" spacing={1}>
                <Heading size="md">{selectedCampaign.title}</Heading>
                <Text fontSize="sm" color="gray.600">{selectedCampaign.organization}</Text>
              </VStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                {/* Détails campagne */}
                <Box p={3} bg={sectionBg} borderRadius="md">
                  <VStack align="start" spacing={2} fontSize="sm">
                    <Box>
                      <Text fontWeight="600">📋 Description</Text>
                      <Text>{selectedCampaign.description}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="600">💰 Montants</Text>
                      <Text>
                        {selectedCampaign.minAmount && selectedCampaign.maxAmount 
                          ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(selectedCampaign.minAmount)} - ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(selectedCampaign.maxAmount)}`
                          : 'À définir'}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontWeight="600">⏰ Échéance</Text>
                      <Text>{new Date(selectedCampaign.deadline).toLocaleDateString('fr-FR')}</Text>
                    </Box>
                    {selectedCampaign.requiredDocuments && Array.isArray(selectedCampaign.requiredDocuments) && selectedCampaign.requiredDocuments.length > 0 && (
                      <Box>
                        <Text fontWeight="600">📄 Documents requis</Text>
                        <UnorderedList fontSize="sm" ml={4}>
                          {selectedCampaign.requiredDocuments.map((doc, idx) => (
                            <ListItem key={idx}>{doc}</ListItem>
                          ))}
                        </UnorderedList>
                      </Box>
                    )}
                  </VStack>
                </Box>

                <Divider />

                {/* Formulaire soumission dépense */}
                <Box>
                  <Heading size="sm" mb={3}>Soumettre une dépense</Heading>
                  <VStack spacing={3}>
                    <FormControl isRequired>
                      <FormLabel>Description</FormLabel>
                      <Input
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                        placeholder="Ex: Carburant, maintenance, etc."
                      />
                    </FormControl>

                    <HStack spacing={3} width="100%">
                      <FormControl isRequired flex={1}>
                        <FormLabel>Montant (€)</FormLabel>
                        <Input
                          type="number"
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                          placeholder="0,00"
                          min={0}
                          step={0.01}
                        />
                      </FormControl>

                      <FormControl flex={1}>
                        <FormLabel>Catégorie</FormLabel>
                        <Select
                          value={expenseForm.category}
                          onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                        >
                          {EXPENSE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </Select>
                      </FormControl>
                    </HStack>

                    <FormControl>
                      <FormLabel>Notes/Observations</FormLabel>
                      <Textarea
                        value={expenseForm.notes}
                        onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                        placeholder="Détails supplémentaires..."
                        size="sm"
                        rows={3}
                      />
                    </FormControl>

                    <Alert status="info" borderRadius="md" fontSize="sm">
                      <AlertIcon />
                      Les justificatifs (factures, reçus) doivent être téléchargés avec votre dépense
                    </Alert>

                    <Button colorScheme="orange" width="100%" onClick={handleSubmitExpense} leftIcon={<FiUpload />}>
                      Soumettre la dépense
                    </Button>
                  </VStack>
                </Box>

                {userExpenses.length > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Heading size="sm" mb={3}>Vos soumissions ({userExpenses.length})</Heading>
                      <VStack spacing={2} align="stretch">
                        {userExpenses.map(expense => (
                          <HStack key={expense.id} p={2} bg={sectionBg} borderRadius="md" justify="space-between" align="start">
                            <VStack align="start" spacing={1} flex={1}>
                              <Text fontWeight="500" fontSize="sm">{expense.description}</Text>
                              <HStack fontSize="xs" color="gray.600" spacing={2}>
                                <Text>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(expense.amount)}</Text>
                                <Text>•</Text>
                                <Text>{expense.category}</Text>
                                <Text>•</Text>
                                <Badge size="sm" colorScheme={
                                  expense.status === 'APPROVED' ? 'green' :
                                  expense.status === 'REJECTED' ? 'red' : 'blue'
                                }>
                                  {expense.status}
                                </Badge>
                              </HStack>
                            </VStack>
                            {expense.status === 'SUBMITTED' && (
                              <IconButton
                                icon={<FiTrash2 />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleDeleteExpense(expense.id)}
                              />
                            )}
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  </>
                )}
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" onClick={onDetailClose}>Fermer</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Modal - Créer/Modifier campagne (Admin seulement) */}
      {isAdmin && (
        <Modal isOpen={isCreateOpen} onClose={() => {
          setCampaignForm({
            title: '',
            organization: '',
            description: '',
            minAmount: '',
            maxAmount: '',
            deadline: '',
            status: 'ACTIVE',
            websiteUrl: '',
            requiredDocuments: []
          });
          setEditingCampaignId(null);
          onCreateClose();
        }} size="lg" scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <Heading size="md">{editingCampaignId ? 'Modifier' : 'Créer'} une campagne</Heading>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Titre</FormLabel>
                  <Input
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                    placeholder="Titre de la campagne"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Organisation</FormLabel>
                  <Input
                    value={campaignForm.organization}
                    onChange={(e) => setCampaignForm({ ...campaignForm, organization: e.target.value })}
                    placeholder="Nom de l'organisation"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                    placeholder="Description complète de la campagne"
                    rows={4}
                  />
                </FormControl>

                <HStack spacing={3} width="100%">
                  <FormControl>
                    <FormLabel>Montant minimum (€)</FormLabel>
                    <Input
                      type="number"
                      value={campaignForm.minAmount}
                      onChange={(e) => setCampaignForm({ ...campaignForm, minAmount: e.target.value })}
                      placeholder="0"
                      min={0}
                      step={100}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Montant maximum (€)</FormLabel>
                    <Input
                      type="number"
                      value={campaignForm.maxAmount}
                      onChange={(e) => setCampaignForm({ ...campaignForm, maxAmount: e.target.value })}
                      placeholder="0"
                      min={0}
                      step={100}
                    />
                  </FormControl>
                </HStack>

                <FormControl isRequired>
                  <FormLabel>Échéance</FormLabel>
                  <Input
                    type="date"
                    value={campaignForm.deadline}
                    onChange={(e) => setCampaignForm({ ...campaignForm, deadline: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>URL du site</FormLabel>
                  <Input
                    value={campaignForm.websiteUrl}
                    onChange={(e) => setCampaignForm({ ...campaignForm, websiteUrl: e.target.value })}
                    placeholder="https://..."
                    type="url"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Statut</FormLabel>
                  <Select
                    value={campaignForm.status}
                    onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <HStack spacing={2}>
                <Button variant="ghost" onClick={() => {
                  setCampaignForm({
                    title: '',
                    organization: '',
                    description: '',
                    minAmount: '',
                    maxAmount: '',
                    deadline: '',
                    status: 'ACTIVE',
                    websiteUrl: '',
                    requiredDocuments: []
                  });
                  setEditingCampaignId(null);
                  onCreateClose();
                }}>
                  Annuler
                </Button>
                <Button colorScheme="orange" onClick={handleSaveCampaign}>
                  {editingCampaignId ? 'Modifier' : 'Créer'}
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </HStack>
  );
}