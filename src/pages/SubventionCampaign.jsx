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
import { FiAward, FiCheckCircle, FiFileText, FiClock, FiDollarSign, FiUsers, FiRefreshCw, FiMail, FiUpload, FiTrash2, FiHome, FiBarChart2, FiInfo, FiHelpCircle, FiPlus, FiEdit, FiArchive, FiCalendar, FiShoppingBag, FiBook, FiImage, FiPackage, FiTrendingUp, FiCreditCard, FiGift, FiLayers } from 'react-icons/fi';
import { subventionAPI } from '../api/subventionClient.js';
import { ticketingAPI } from '../api/ticketing.js';
import { museumAPI } from '../api/museum.js';
import { stocksAPI } from '../api/stocks.js';
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

  // États pour les données du musée
  const [museumModules, setMuseumModules] = useState([]);
  const [museumStats, setMuseumStats] = useState(null);
  const [museumLoading, setMuseumLoading] = useState(true);

  // États pour la billetterie
  const [ticketTypes, setTicketTypes] = useState([]);
  const [ticketingStats, setTicketingStats] = useState(null);
  const [weeklyAttendance, setWeeklyAttendance] = useState([]);
  const [ticketingLoading, setTicketingLoading] = useState(true);

  // États pour le RétroMerch
  const [stockCategories, setStockCategories] = useState([]);
  const [stockStats, setStockStats] = useState(null);
  const [stockLoading, setStockLoading] = useState(true);

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
    loadMuseumData();
    loadTicketingData();
    loadStockData();
    
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(() => {
      loadCampaigns();
      loadStats();
      loadMuseumData();
      loadTicketingData();
      loadStockData();
    }, 300000);
    
    return () => clearInterval(interval);
  }, [loadCampaigns]);

  // Charger les données du musée
  const loadMuseumData = useCallback(async () => {
    try {
      setMuseumLoading(true);
      const [modulesData, statsData] = await Promise.all([
        museumAPI.getModules().catch(() => []),
        museumAPI.getStats().catch(() => null)
      ]);
      setMuseumModules(Array.isArray(modulesData) ? modulesData : []);
      setMuseumStats(statsData);
    } catch (error) {
      console.error('Erreur chargement données musée:', error);
    } finally {
      setMuseumLoading(false);
    }
  }, []);

  // Charger les données de la billetterie
  const loadTicketingData = useCallback(async () => {
    try {
      setTicketingLoading(true);
      const [typesData, statsData, weeklyData] = await Promise.all([
        ticketingAPI.getTicketTypes().catch(() => []),
        ticketingAPI.getStats().catch(() => null),
        ticketingAPI.getWeeklyStats().catch(() => [])
      ]);
      setTicketTypes(Array.isArray(typesData) ? typesData : []);
      setTicketingStats(statsData);
      setWeeklyAttendance(Array.isArray(weeklyData) ? weeklyData : []);
    } catch (error) {
      console.error('Erreur chargement données billetterie:', error);
    } finally {
      setTicketingLoading(false);
    }
  }, []);

  // Charger les données du RétroMerch (stocks)
  const loadStockData = useCallback(async () => {
    try {
      setStockLoading(true);
      const [categoriesData, statsData] = await Promise.all([
        stocksAPI.getCategories().catch(() => []),
        stocksAPI.getStats().catch(() => null)
      ]);
      setStockCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setStockStats(statsData);
    } catch (error) {
      console.error('Erreur chargement données stock:', error);
    } finally {
      setStockLoading(false);
    }
  }, []);

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
    { id: 'overview', label: 'Vue d\'ensemble', icon: FiHome, description: 'Modules du musée' },
    { id: 'retromerch', label: 'Le RétroMerch', icon: FiShoppingBag, description: 'Boutique et produits' },
    { id: 'billetterie', label: 'Billetterie', icon: FiCreditCard, description: 'Ventes et tarifs' }
  ];

  // Rendu du contenu principal
  const renderMainContent = () => {
    switch (activeMainSection) {
      case 'overview':
        return renderOverview();
      case 'retromerch':
        return renderRetroMerch();
      case 'billetterie':
        return renderBilletterie();
      default:
        return renderOverview();
    }
  };

  // Rendu Overview
  const renderOverview = () => {
    // Modules par défaut si l'API ne retourne rien
    const defaultMuseumModules = [
      {
        id: 'collections',
        title: 'Gestion des Collections',
        description: 'Inventaire, catalogage et suivi des pièces du musée',
        icon: FiArchive,
        color: 'rbe.500',
        badge: 'Essentiel',
        stats: { items: '2,450', categories: '12' }
      },
      {
        id: 'expositions',
        title: 'Expositions',
        description: 'Planification et gestion des expositions temporaires et permanentes',
        icon: FiImage,
        color: 'blue.500',
        badge: 'Actif',
        stats: { current: '3', upcoming: '5' }
      },
      {
        id: 'billetterie',
        title: 'Billetterie',
        description: 'Vente de billets, tarifs et gestion des visiteurs',
        icon: FiCreditCard,
        color: 'green.500',
        badge: 'En ligne',
        stats: { today: '127', month: '3,842' }
      },
      {
        id: 'reservations',
        title: 'Réservations Groupes',
        description: 'Gestion des visites guidées et réservations de groupes',
        icon: FiUsers,
        color: 'purple.500',
        badge: null,
        stats: { pending: '8', confirmed: '24' }
      },
      {
        id: 'mediation',
        title: 'Médiation Culturelle',
        description: 'Ateliers, animations et programmes éducatifs',
        icon: FiBook,
        color: 'orange.500',
        badge: 'Nouveau',
        stats: { workshops: '15', participants: '342' }
      },
      {
        id: 'conservation',
        title: 'Conservation',
        description: 'Restauration, conservation préventive et suivi sanitaire',
        icon: FiLayers,
        color: 'teal.500',
        badge: null,
        stats: { inProgress: '12', scheduled: '28' }
      },
      {
        id: 'prets',
        title: 'Prêts & Emprunts',
        description: 'Gestion des œuvres prêtées et empruntées',
        icon: FiRefreshCw,
        color: 'cyan.500',
        badge: null,
        stats: { loaned: '18', borrowed: '7' }
      },
      {
        id: 'documentation',
        title: 'Documentation',
        description: 'Archives, documentation scientifique et base de données',
        icon: FiFileText,
        color: 'gray.600',
        badge: null,
        stats: { documents: '5,623', digitized: '78%' }
      },
      {
        id: 'boutique',
        title: 'Boutique',
        description: 'Merchandising, catalogue produits et ventes',
        icon: FiShoppingBag,
        color: 'pink.500',
        badge: null,
        stats: { products: '156', sales: '€8,420' }
      },
      {
        id: 'mecenat',
        title: 'Mécénat',
        description: 'Gestion des dons, mécénat et campagnes de financement',
        icon: FiGift,
        color: 'yellow.600',
        badge: 'Prioritaire',
        stats: { donors: '142', raised: '€45,000' }
      },
      {
        id: 'evenements',
        title: 'Événements',
        description: 'Organisation de vernissages, conférences et soirées',
        icon: FiCalendar,
        color: 'red.500',
        badge: null,
        stats: { upcoming: '12', capacity: '450' }
      },
      {
        id: 'analytics',
        title: 'Statistiques',
        description: 'Tableaux de bord, KPIs et analyses de fréquentation',
        icon: FiTrendingUp,
        color: 'indigo.500',
        badge: null,
        stats: { visitors: '+12%', revenue: '+8%' }
      }
    ];

    // Utiliser les données de l'API si disponibles, sinon les données par défaut
    const displayModules = museumModules.length > 0 ? museumModules : defaultMuseumModules;
    const displayStats = museumStats || {
      totalModules: 12,
      customization: '100%',
      support: '24/7'
    };

    if (museumLoading) {
      return (
        <Center h="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color="rbe.500" thickness="4px" />
            <Heading size="lg" color="black">Chargement des modules...</Heading>
            <Text fontSize="md" color="gray.600" fontStyle="italic">Préparation du musée</Text>
          </VStack>
        </Center>
      );
    }

    return (
      <VStack spacing={6} align="stretch">
        {/* En-tête de présentation */}
        <Card 
          bg="linear-gradient(135deg, #d30c4c 0%, #c10744 100%)" 
          color="white" 
          borderRadius="xl"
          overflow="hidden"
          _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }}
          transition="all 0.3s"
        >
          <CardBody p={8}>
            <VStack align="start" spacing={4}>
              <HStack spacing={3}>
                <Icon as={FiArchive} boxSize={10} />
                <Box>
                  <Heading size="xl">Le Musée - Pannel de Gestion</Heading>
                  <Text fontSize="lg" opacity={0.9} mt={1}>
                    Tous les outils pour gérer votre musée de manière professionnelle
                  </Text>
                </Box>
              </HStack>
              <Divider borderColor="whiteAlpha.400" />
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
                <Box>
                  <Text fontSize="3xl" fontWeight="bold">{displayModules.length}</Text>
                  <Text fontSize="sm" opacity={0.9}>Modules disponibles</Text>
                </Box>
                <Box>
                  <Text fontSize="3xl" fontWeight="bold">{displayStats.customization || '100%'}</Text>
                  <Text fontSize="sm" opacity={0.9}>Personnalisable</Text>
                </Box>
                <Box>
                  <Text fontSize="3xl" fontWeight="bold">{displayStats.support || '24/7'}</Text>
                  <Text fontSize="sm" opacity={0.9}>Support actif</Text>
                </Box>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Grille des modules */}
        <Box>
          <HStack justify="space-between" mb={4}>
            <Heading size="lg" color="black">Modules de Gestion</Heading>
            <Badge colorScheme="red" variant="subtle" px={3} py={1} fontSize="md">
              {displayModules.length} modules
            </Badge>
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {displayModules.map((module) => (
              <Card 
                key={module.id}
                bg={cardBg}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                _hover={{ 
                  transform: 'translateY(-4px)', 
                  shadow: 'xl',
                  borderColor: 'rbe.500'
                }}
                transition="all 0.3s"
                cursor="pointer"
              >
                <CardBody>
                  <VStack align="start" spacing={3}>
                    {/* En-tête du module */}
                    <HStack justify="space-between" w="full">
                      <Icon as={module.icon} boxSize={8} color={module.color} />
                      {module.badge && (
                        <Badge colorScheme="red" variant="subtle" px={2} py={1}>
                          {module.badge}
                        </Badge>
                      )}
                    </HStack>

                    {/* Titre et description */}
                    <Box>
                      <Heading size="md" color="black" mb={1}>
                        {module.title}
                      </Heading>
                      <Text fontSize="sm" color="gray.600" minH="40px">
                        {module.description}
                      </Text>
                    </Box>

                    <Divider />

                    {/* Statistiques */}
                    <SimpleGrid columns={2} spacing={2} w="full">
                      {Object.entries(module.stats).map(([key, value], idx) => (
                        <Box 
                          key={idx} 
                          p={2} 
                          bg={useColorModeValue('gray.50', 'gray.700')} 
                          borderRadius="md"
                          textAlign="center"
                        >
                          <Text fontSize="xs" color="gray.600" textTransform="capitalize">
                            {key}
                          </Text>
                          <Text fontSize="md" fontWeight="bold" color={module.color}>
                            {value}
                          </Text>
                        </Box>
                      ))}
                    </SimpleGrid>

                    {/* Bouton d'action */}
                    <Button 
                      w="full" 
                      colorScheme="red" 
                      variant="outline"
                      size="sm"
                      _hover={{ bg: 'rbe.50' }}
                    >
                      Accéder au module
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* Section informative */}
        <Alert
          status="info"
          variant="subtle"
          borderRadius="lg"
          bg={useColorModeValue('blue.50', 'blue.900')}
        >
          <AlertIcon />
          <Box>
            <Heading size="sm" mb={1}>Configuration personnalisée</Heading>
            <Text fontSize="sm">
              Chaque module peut être activé ou désactivé selon vos besoins. 
              Contactez l'administration pour personnaliser votre installation.
            </Text>
          </Box>
        </Alert>
      </VStack>
    );
  };

  // Rendu Le RétroMerch (Boutique)
  const renderRetroMerch = () => {
    // Catégories par défaut si l'API ne retourne rien
    const defaultMerchCategories = [
      {
        id: 'vetements',
        title: 'Vêtements & Accessoires',
        icon: FiPackage,
        color: 'rbe.500',
        products: 45,
        sales: '€12,340',
        stock: 'Bon'
      },
      {
        id: 'souvenirs',
        title: 'Souvenirs & Collectibles',
        icon: FiGift,
        color: 'purple.500',
        products: 28,
        sales: '€8,920',
        stock: 'Moyen'
      },
      {
        id: 'livres',
        title: 'Livres & Publications',
        icon: FiBook,
        color: 'blue.500',
        products: 67,
        sales: '€15,670',
        stock: 'Excellent'
      },
      {
        id: 'reproductions',
        title: 'Reproductions d\'œuvres',
        icon: FiImage,
        color: 'orange.500',
        products: 34,
        sales: '€9,450',
        stock: 'Faible'
      }
    ];

    // Utiliser les données de l'API si disponibles
    const displayCategories = stockCategories.length > 0 ? stockCategories : defaultMerchCategories;
    const displayStats = stockStats || {
      totalProducts: 174,
      monthlySales: '€46,380',
      transactions: 1247,
      growth: '+18%'
    };

    if (stockLoading) {
      return (
        <Center h="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color="rbe.500" thickness="4px" />
            <Heading size="lg" color="black">Chargement du RétroMerch...</Heading>
            <Text fontSize="md" color="gray.600" fontStyle="italic">Organisation de la boutique</Text>
          </VStack>
        </Center>
      );
    }

    return (
      <VStack spacing={6} align="stretch">
        {/* En-tête RétroMerch */}
        <Card 
          bg="linear-gradient(135deg, #d30c4c 0%, #c10744 100%)" 
          color="white" 
          borderRadius="xl"
          _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }}
          transition="all 0.3s"
        >
          <CardBody p={8}>
            <HStack spacing={4} mb={4}>
              <Icon as={FiShoppingBag} boxSize={12} />
              <Box>
                <Heading size="xl">Le RétroMerch</Heading>
                <Text fontSize="lg" opacity={0.9} mt={1}>
                  Gestion complète de la boutique du musée
                </Text>
              </Box>
            </HStack>
            <Divider borderColor="whiteAlpha.400" mb={4} />
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <Box>
                <Text fontSize="2xl" fontWeight="bold">{displayStats.totalProducts || 174}</Text>
                <Text fontSize="sm" opacity={0.9}>Produits actifs</Text>
              </Box>
              <Box>
                <Text fontSize="2xl" fontWeight="bold">{displayStats.monthlySales || '€46,380'}</Text>
                <Text fontSize="sm" opacity={0.9}>Ventes du mois</Text>
              </Box>
              <Box>
                <Text fontSize="2xl" fontWeight="bold">{displayStats.transactions || 1247}</Text>
                <Text fontSize="sm" opacity={0.9}>Transactions</Text>
              </Box>
              <Box>
                <Text fontSize="2xl" fontWeight="bold">{displayStats.growth || '+18%'}</Text>
                <Text fontSize="sm" opacity={0.9}>Progression</Text>
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Catégories de produits */}
        <Box>
          <HStack justify="space-between" mb={4}>
            <Heading size="lg" color="black">Catégories de Produits</Heading>
            <Button colorScheme="red" leftIcon={<FiPlus />} size="sm">
              Nouveau produit
            </Button>
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {displayCategories.map((category) => (
              <Card 
                key={category.id}
                bg={cardBg}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                _hover={{ 
                  transform: 'translateY(-4px)', 
                  shadow: 'xl',
                  borderColor: 'rbe.500'
                }}
                transition="all 0.3s"
                cursor="pointer"
              >
                <CardBody>
                  <VStack align="start" spacing={4}>
                    <HStack justify="space-between" w="full">
                      <Icon as={category.icon} boxSize={10} color={category.color} />
                      <Badge 
                        colorScheme={
                          category.stock === 'Excellent' ? 'green' :
                          category.stock === 'Bon' ? 'blue' :
                          category.stock === 'Moyen' ? 'orange' : 'red'
                        }
                        variant="subtle"
                        px={3}
                        py={1}
                      >
                        Stock: {category.stock}
                      </Badge>
                    </HStack>

                    <Box>
                      <Heading size="md" color="black" mb={2}>
                        {category.title}
                      </Heading>
                    </Box>

                    <Divider />

                    <SimpleGrid columns={3} spacing={3} w="full">
                      <Box textAlign="center">
                        <Text fontSize="2xl" fontWeight="bold" color={category.color}>
                          {category.products}
                        </Text>
                        <Text fontSize="xs" color="gray.600">Produits</Text>
                      </Box>
                      <Box textAlign="center">
                        <Text fontSize="2xl" fontWeight="bold" color="green.500">
                          {category.sales}
                        </Text>
                        <Text fontSize="xs" color="gray.600">Ventes</Text>
                      </Box>
                      <Box textAlign="center">
                        <Icon as={FiTrendingUp} boxSize={6} color="green.500" />
                        <Text fontSize="xs" color="gray.600">+12%</Text>
                      </Box>
                    </SimpleGrid>

                    <Button w="full" colorScheme="red" variant="outline" size="sm">
                      Gérer la catégorie
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* Outils de gestion */}
        <Box>
          <Heading size="lg" color="black" mb={4}>Outils de Gestion</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <Card 
              bg={cardBg} 
              borderRadius="lg"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              transition="all 0.3s"
              cursor="pointer"
            >
              <CardBody textAlign="center">
                <Icon as={FiPackage} boxSize={8} color="blue.500" mb={3} />
                <Heading size="sm" mb={2}>Gestion des Stocks</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Inventaire et réapprovisionnement
                </Text>
                <Button colorScheme="blue" size="sm" variant="outline" w="full">
                  Accéder
                </Button>
              </CardBody>
            </Card>

            <Card 
              bg={cardBg} 
              borderRadius="lg"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              transition="all 0.3s"
              cursor="pointer"
            >
              <CardBody textAlign="center">
                <Icon as={FiTrendingUp} boxSize={8} color="green.500" mb={3} />
                <Heading size="sm" mb={2}>Statistiques Ventes</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Analyses et rapports détaillés
                </Text>
                <Button colorScheme="green" size="sm" variant="outline" w="full">
                  Accéder
                </Button>
              </CardBody>
            </Card>

            <Card 
              bg={cardBg} 
              borderRadius="lg"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              transition="all 0.3s"
              cursor="pointer"
            >
              <CardBody textAlign="center">
                <Icon as={FiDollarSign} boxSize={8} color="orange.500" mb={3} />
                <Heading size="sm" mb={2}>Tarification</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Gestion des prix et promotions
                </Text>
                <Button colorScheme="orange" size="sm" variant="outline" w="full">
                  Accéder
                </Button>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>
      </VStack>
    );
  };

  // Rendu Billetterie
  const renderBilletterie = () => {
    // Tarifs par défaut si l'API ne retourne rien
    const defaultTicketTypes = [
      {
        id: 'plein',
        title: 'Tarif Plein',
        price: '12€',
        color: 'rbe.500',
        sold: 3842,
        revenue: '€46,104'
      },
      {
        id: 'reduit',
        title: 'Tarif Réduit',
        price: '8€',
        color: 'blue.500',
        sold: 2156,
        revenue: '€17,248'
      },
      {
        id: 'enfant',
        title: 'Tarif Enfant',
        price: '5€',
        color: 'green.500',
        sold: 1893,
        revenue: '€9,465'
      },
      {
        id: 'groupe',
        title: 'Tarif Groupe',
        price: '10€',
        color: 'purple.500',
        sold: 567,
        revenue: '€5,670'
      }
    ];

    // Utiliser les données de l'API si disponibles
    const displayTickets = ticketTypes.length > 0 ? ticketTypes : defaultTicketTypes;
    const displayStats = ticketingStats || {
      todayVisitors: 127,
      monthVisitors: 8458,
      monthRevenue: '€78,487',
      growth: '+23%'
    };
    const displayWeekly = weeklyAttendance.length > 0 ? weeklyAttendance : [89, 102, 95, 118, 145, 312, 287];

    if (ticketingLoading) {
      return (
        <Center h="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color="rbe.500" thickness="4px" />
            <Heading size="lg" color="black">Chargement de la billetterie...</Heading>
            <Text fontSize="md" color="gray.600" fontStyle="italic">Préparation des tarifs</Text>
          </VStack>
        </Center>
      );
    }

    return (
      <VStack spacing={6} align="stretch">
        {/* En-tête Billetterie */}
        <Card 
          bg="linear-gradient(135deg, #d30c4c 0%, #c10744 100%)" 
          color="white" 
          borderRadius="xl"
          _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }}
          transition="all 0.3s"
        >
          <CardBody p={8}>
            <HStack spacing={4} mb={4}>
              <Icon as={FiCreditCard} boxSize={12} />
              <Box>
                <Heading size="xl">Billetterie</Heading>
                <Text fontSize="lg" opacity={0.9} mt={1}>
                  Système de vente et gestion des entrées
                </Text>
              </Box>
            </HStack>
            <Divider borderColor="whiteAlpha.400" mb={4} />
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <Box>
                <Text fontSize="2xl" fontWeight="bold">{displayStats.todayVisitors || 127}</Text>
                <Text fontSize="sm" opacity={0.9}>Visiteurs aujourd'hui</Text>
              </Box>
              <Box>
                <Text fontSize="2xl" fontWeight="bold">{displayStats.monthVisitors || 8458}</Text>
                <Text fontSize="sm" opacity={0.9}>Ce mois</Text>
              </Box>
              <Box>
                <Text fontSize="2xl" fontWeight="bold">{displayStats.monthRevenue || '€78,487'}</Text>
                <Text fontSize="sm" opacity={0.9}>Recettes du mois</Text>
              </Box>
              <Box>
                <Text fontSize="2xl" fontWeight="bold">{displayStats.growth || '+23%'}</Text>
                <Text fontSize="sm" opacity={0.9}>vs mois dernier</Text>
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Tarifs disponibles */}
        <Box>
          <HStack justify="space-between" mb={4}>
            <Heading size="lg" color="black">Tarifs Disponibles</Heading>
            <Button colorScheme="red" leftIcon={<FiPlus />} size="sm">
              Nouveau tarif
            </Button>
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            {displayTickets.map((ticket) => (
              <Card 
                key={ticket.id}
                bg={cardBg}
                borderRadius="lg"
                borderWidth="2px"
                borderColor={ticket.color}
                _hover={{ 
                  transform: 'translateY(-4px)', 
                  shadow: 'xl'
                }}
                transition="all 0.3s"
              >
                <CardBody textAlign="center">
                  <VStack spacing={3}>
                    <Badge colorScheme="red" variant="subtle" px={3} py={1} fontSize="md">
                      {ticket.title}
                    </Badge>
                    <Heading size="2xl" color={ticket.color}>
                      {ticket.price}
                    </Heading>
                    <Divider />
                    <Box w="full">
                      <Text fontSize="sm" color="gray.600" mb={1}>Vendus</Text>
                      <Text fontSize="xl" fontWeight="bold">{ticket.sold}</Text>
                    </Box>
                    <Box w="full">
                      <Text fontSize="sm" color="gray.600" mb={1}>Recettes</Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.500">
                        {ticket.revenue}
                      </Text>
                    </Box>
                    <Button colorScheme="red" size="sm" w="full" variant="outline">
                      Modifier
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* Statistiques détaillées */}
        <Box>
          <Heading size="lg" color="black" mb={4}>Statistiques de Fréquentation</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Card bg={cardBg} borderRadius="lg">
              <CardBody>
                <VStack align="start" spacing={3}>
                  <HStack>
                    <Icon as={FiCalendar} boxSize={6} color="blue.500" />
                    <Heading size="md">Affluence Hebdomadaire</Heading>
                  </HStack>
                  <Divider />
                  <SimpleGrid columns={7} spacing={2} w="full">
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, idx) => (
                      <Box key={idx} textAlign="center">
                        <Text fontSize="xs" color="gray.600" mb={1}>{day}</Text>
                        <Text fontSize="lg" fontWeight="bold" color="rbe.500">
                          {displayWeekly[idx]}
                        </Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={cardBg} borderRadius="lg">
              <CardBody>
                <VStack align="start" spacing={3}>
                  <HStack>
                    <Icon as={FiTrendingUp} boxSize={6} color="green.500" />
                    <Heading size="md">Performance du Mois</Heading>
                  </HStack>
                  <Divider />
                  <VStack align="stretch" spacing={3} w="full">
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">Objectif mensuel</Text>
                      <Text fontSize="md" fontWeight="bold">{displayStats.monthlyGoal || '10,000'} visiteurs</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">Réalisé</Text>
                      <Text fontSize="md" fontWeight="bold" color="green.500">
                        {displayStats.monthVisitors || '8,458'} ({displayStats.goalPercentage || '84.6'}%)
                      </Text>
                    </HStack>
                    <Box>
                      <Text fontSize="xs" color="gray.600" mb={1}>Progression</Text>
                      <Box height="8px" bg={useColorModeValue('gray.200', 'gray.700')} borderRadius="full" overflow="hidden">
                        <Box
                          height="100%"
                          width={`${displayStats.goalPercentage || 84.6}%`}
                          bg="green.400"
                          transition="all 0.3s"
                        />
                      </Box>
                    </Box>
                    <Alert status="success" variant="subtle" borderRadius="md">
                      <AlertIcon />
                      <Text fontSize="sm">{displayStats.growth || '+23%'} par rapport au mois dernier</Text>
                    </Alert>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Outils de gestion billetterie */}
        <Box>
          <Heading size="lg" color="black" mb={4}>Outils de Gestion</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <Card 
              bg={cardBg} 
              borderRadius="lg"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              transition="all 0.3s"
              cursor="pointer"
            >
              <CardBody textAlign="center">
                <Icon as={FiUsers} boxSize={8} color="purple.500" mb={3} />
                <Heading size="sm" mb={2}>Réservations Groupes</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Gestion des visites de groupe
                </Text>
                <Button colorScheme="purple" size="sm" variant="outline" w="full">
                  Accéder
                </Button>
              </CardBody>
            </Card>

            <Card 
              bg={cardBg} 
              borderRadius="lg"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              transition="all 0.3s"
              cursor="pointer"
            >
              <CardBody textAlign="center">
                <Icon as={FiBarChart2} boxSize={8} color="blue.500" mb={3} />
                <Heading size="sm" mb={2}>Rapports Détaillés</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Analyses et exports de données
                </Text>
                <Button colorScheme="blue" size="sm" variant="outline" w="full">
                  Accéder
                </Button>
              </CardBody>
            </Card>

            <Card 
              bg={cardBg} 
              borderRadius="lg"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              transition="all 0.3s"
              cursor="pointer"
            >
              <CardBody textAlign="center">
                <Icon as={FiCalendar} boxSize={8} color="orange.500" mb={3} />
                <Heading size="sm" mb={2}>Planning des Horaires</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Gestion des jours d'ouverture
                </Text>
                <Button colorScheme="orange" size="sm" variant="outline" w="full">
                  Accéder
                </Button>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>
      </VStack>
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
              <Icon as={FiArchive} color="rbe.500" boxSize={6} />
              <Box>
                <Heading size="md">Le Musée</Heading>
                <Text fontSize="xs" color="gray.500">Pannel de gestion</Text>
              </Box>
            </HStack>
          </Box>
        </VStack>

        {/* Contenu principal */}
        <Box flex={1} overflowY="auto">
          <Center h="100%">
            <VStack spacing={4}>
              <Spinner size="lg" color="rbe.500" />
              <Text>Chargement du musée...</Text>
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
            <Icon as={FiArchive} color="rbe.500" boxSize={6} />
            <Box>
              <Heading size="md">Le Musée</Heading>
              <Text fontSize="xs" color="gray.500">Pannel de gestion des outils musée</Text>
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
                bg={isActive ? "red.50" : "transparent"}
                borderLeft="3px"
                borderColor={isActive ? "rbe.500" : "transparent"}
                borderRadius={0}
                px={4}
                py={6}
                fontSize="sm"
                fontWeight={isActive ? "600" : "500"}
                color={isActive ? "rbe.500" : "inherit"}
                _hover={{ bg: "gray.100", borderLeftColor: "rbe.500" }}
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