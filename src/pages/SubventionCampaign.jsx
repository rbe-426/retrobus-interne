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
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  StepSeparator,
  Box as StepBox,
  Progress,
} from '@chakra-ui/react';
import { FiAward, FiCheckCircle, FiFileText, FiClock, FiDollarSign, FiUsers, FiRefreshCw, FiMail, FiUpload, FiTrash2, FiHome, FiBarChart2, FiInfo, FiHelpCircle, FiPlus, FiEdit, FiArchive, FiCalendar, FiShoppingBag, FiBook, FiImage, FiPackage, FiTrendingUp, FiCreditCard, FiGift, FiLayers, FiPercent, FiX, FiSearch, FiShield, FiCheck, FiLogIn, FiUserCheck } from 'react-icons/fi';
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
  const { isOpen: isNewReservationOpen, onOpen: onNewReservationOpen, onClose: onNewReservationClose } = useDisclosure();
  const { isOpen: isCheckInOpen, onOpen: onCheckInOpen, onClose: onCheckInClose } = useDisclosure();
  const { isOpen: isAgendaOpen, onOpen: onAgendaOpen, onClose: onAgendaClose } = useDisclosure();
  const { isOpen: isSellTicketOpen, onOpen: onSellTicketOpen, onClose: onSellTicketClose } = useDisclosure();
  const { isOpen: isPriceEditOpen, onOpen: onPriceEditOpen, onClose: onPriceEditClose } = useDisclosure();
  const { isOpen: isDiscountEditOpen, onOpen: onDiscountEditOpen, onClose: onDiscountEditClose } = useDisclosure();

  // États pour la tarification des billets
  const [ticketPrices, setTicketPrices] = useState([
    { id: 'plein', name: 'Tarif Plein', label: 'Tarif Plein', price: 12, description: 'Adulte sans réduction', active: true },
    { id: 'reduit', name: 'Tarif Réduit', label: 'Tarif Réduit', price: 8, description: 'Étudiants, seniors, demandeurs d\'emploi', active: true },
    { id: 'enfant', name: 'Tarif Enfant', label: 'Tarif Enfant', price: 5, description: 'Enfants de 6 à 12 ans', active: true },
    { id: 'groupe', name: 'Tarif Groupe', label: 'Tarif Groupe', price: 10, description: 'À partir de 10 personnes', active: true },
    { id: 'famille', name: 'Pass Famille', label: 'Pass Famille', price: 28, description: '2 adultes + 2 enfants', active: false },
    { id: 'annuel', name: 'Abonnement Annuel', label: 'Abonnement Annuel', price: 80, description: 'Accès illimité pendant 1 an', active: true }
  ]);
  const [editingPrice, setEditingPrice] = useState(null);
  const [priceForm, setPriceForm] = useState({
    label: '',
    price: 0,
    description: '',
    active: true
  });

  // États pour les réductions
  const [discounts, setDiscounts] = useState([
    { 
      id: 'etudiant', 
      name: 'Étudiant', 
      type: 'percentage', 
      value: 33, 
      conditions: 'Carte étudiante valide', 
      active: true,
      onlineAvailable: false,
      appliedTo: ['plein']
    },
    { 
      id: 'senior', 
      name: 'Senior +65', 
      type: 'percentage', 
      value: 25, 
      conditions: 'Âge 65 ans et plus', 
      active: true,
      onlineAvailable: false,
      appliedTo: ['plein']
    },
    { 
      id: 'rsa', 
      name: 'RSA', 
      type: 'percentage', 
      value: 100, 
      conditions: 'Bénéficiaire (ou ayant droit toléré) d\'un RSA - Certificat de moins de trois mois avec validité des droits en cours (droits dits "ouverts")', 
      active: true,
      onlineAvailable: false,
      appliedTo: ['adulte', 'jeunesse', 'enfant']
    },
    { 
      id: 'css', 
      name: 'CSS (ex-CMUC-C)', 
      type: 'percentage', 
      value: 75, 
      conditions: 'Bénéficiaire (ou ayant droit toléré) de la CSS sans participation financière - Certificat de moins de trois mois avec validité des droits en cours (droits dits "ouverts")', 
      active: true,
      onlineAvailable: false,
      appliedTo: ['adulte', 'jeunesse', 'enfant']
    },
    { 
      id: 'famille-nombreuse', 
      name: 'Famille Nombreuse', 
      type: 'fixed', 
      value: 5, 
      conditions: 'Carte famille nombreuse (3+ enfants)', 
      active: true,
      onlineAvailable: false,
      appliedTo: ['plein', 'enfant']
    }
  ]);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [discountForm, setDiscountForm] = useState({
    name: '',
    type: 'percentage',
    value: 0,
    conditions: '',
    active: true,
    onlineAvailable: false,
    appliedTo: []
  });

  // États pour la station d'accueil
  const [reservations, setReservations] = useState([
    { 
      id: 1, 
      time: '09:00', 
      name: 'Dubois Sophie', 
      type: 'Individuel', 
      persons: 1, 
      status: 'Confirmé', 
      checkedIn: false,
      notes: 'Le visiteur a indiqué être bénéficiaire ou ayant droit d\'un RSA - Vérification des documents requise',
      discount: 'rsa'
    },
    { 
      id: 2, 
      time: '09:30', 
      name: 'Lefebvre Karim', 
      type: 'Individuel', 
      persons: 2, 
      status: 'Confirmé', 
      checkedIn: false,
      notes: 'Le visiteur a indiqué être bénéficiaire ou ayant droit d\'une CSS - Vérification des documents requise',
      discount: 'css'
    },
    { 
      id: 3, 
      time: '10:00', 
      name: 'École Primaire Jean Jaurès', 
      type: 'Groupe', 
      persons: 28, 
      status: 'Confirmé', 
      checkedIn: false,
      notes: 'Classe CE2 - Devis n°2026-045 réglé le 10/05/2026',
      paymentMethod: 'Devis'
    },
    { 
      id: 4, 
      time: '10:45', 
      name: 'Martinez Elena', 
      type: 'Individuel', 
      persons: 1, 
      status: 'Confirmé', 
      checkedIn: false,
      notes: 'Pièce d\'identité au nom de "Elena Rodriguez-Martinez" - Vérifier correspondance'
    },
    { 
      id: 5, 
      time: '11:15', 
      name: 'Petit Alexandre', 
      type: 'Individuel', 
      persons: 1, 
      status: 'En attente', 
      checkedIn: false,
      notes: 'Le visiteur a indiqué être bénéficiaire ou ayant droit d\'un RSA - Vérification des documents requise'
    },
    { 
      id: 6, 
      time: '13:30', 
      name: 'Nguyen Linh', 
      type: 'Individuel', 
      persons: 1, 
      status: 'Confirmé', 
      checkedIn: false,
      notes: 'Étudiante à Paris-Saclay - Carte étudiante 2025-2026',
      discount: 'etudiant'
    },
    { 
      id: 7, 
      time: '14:00', 
      name: 'Moreau Gérard', 
      type: 'Individuel', 
      persons: 2, 
      status: 'Confirmé', 
      checkedIn: false,
      notes: 'Senior 72 ans avec épouse - Tarif senior à appliquer',
      discount: 'senior'
    },
    { 
      id: 8, 
      time: '14:30', 
      name: 'Famille Bernard', 
      type: 'Individuel', 
      persons: 5, 
      status: 'Confirmé', 
      checkedIn: false,
      notes: 'Famille nombreuse (3 enfants) - Carte famille nombreuse valide',
      discount: 'famille-nombreuse'
    },
    { 
      id: 9, 
      time: '15:00', 
      name: 'Dupont Marie', 
      type: 'Individuel', 
      persons: 2, 
      status: 'Confirmé', 
      checkedIn: false,
      notes: 'Réservation en ligne - Paiement non effectué'
    },
    { 
      id: 10, 
      time: '15:30', 
      name: 'Association RétroBus Essonne', 
      type: 'Groupe', 
      persons: 15, 
      status: 'Confirmé', 
      checkedIn: false,
      notes: 'Visite partenaire - Devis n°2026-052 payé',
      paymentMethod: 'Devis'
    },
    { 
      id: 11, 
      time: '16:00', 
      name: 'Lambert Julie', 
      type: 'Individuel', 
      persons: 1, 
      status: 'Confirmé', 
      checkedIn: true,
      notes: 'Check-in effectué à 16:02',
      tickets: [{ type: 'plein', quantity: 1, price: 12 }],
      paymentMethod: 'CB'
    }
  ]);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [reservationForm, setReservationForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    type: 'Individuel',
    persons: 1,
    notes: '',
    tickets: [] // { type: 'plein', quantity: 1, price: 12 }
  });
  const [checkInSearch, setCheckInSearch] = useState('');
  
  // États pour le parcours de check-in (4 étapes)
  const [checkInStep, setCheckInStep] = useState(1); // 1: Identification, 2: Vérification, 3: Application, 4: Entrée
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [isEditingVisitor, setIsEditingVisitor] = useState(false);
  const [visitorEditForm, setVisitorEditForm] = useState({
    persons: 1,
    type: 'Individuel',
    notes: ''
  });
  const [checkInVerification, setCheckInVerification] = useState({
    identityVerified: false,
    documentsVerified: false,
    paymentStatus: 'pending', // 'pending', 'paid', 'to_pay'
    discountEligible: false,
    discountApplied: null
  });
  const [checkInPayment, setCheckInPayment] = useState({
    amount: 0,
    originalAmount: 0,
    discountAmount: 0,
    method: 'CB',
    processed: false
  });
  
  const [ticketSaleForm, setTicketSaleForm] = useState({
    ticketType: 'plein',
    quantity: 1,
    paymentMethod: 'CB'
  });

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
      const [typesData, statsData, weeklyData, discountsData] = await Promise.all([
        ticketingAPI.getTicketTypes().catch(() => []),
        ticketingAPI.getStats().catch(() => null),
        ticketingAPI.getWeeklyStats().catch(() => []),
        ticketingAPI.getDiscounts().catch(() => [])
      ]);
      setTicketTypes(Array.isArray(typesData) ? typesData : []);
      
      // Charger aussi les ticketPrices depuis l'API
      if (Array.isArray(typesData) && typesData.length > 0) {
        // Mapper les données API vers le format ticketPrices
        const pricesFromAPI = typesData.map(t => ({
          id: t.id,
          name: t.name || t.label,
          label: t.label || t.name,
          price: t.price,
          description: t.description,
          active: t.active !== undefined ? t.active : true
        }));
        setTicketPrices(pricesFromAPI);
      }

      // Charger les réductions depuis l'API
      if (Array.isArray(discountsData) && discountsData.length > 0) {
        setDiscounts(discountsData);
      }
      
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

  // Fonctions de gestion de la tarification
  const handleEditPrice = (priceItem) => {
    setEditingPrice(priceItem);
    setPriceForm({
      label: priceItem.label,
      price: priceItem.price,
      description: priceItem.description,
      active: priceItem.active
    });
    onPriceEditOpen();
  };

  const handleSavePrice = async () => {
    if (!priceForm.label || priceForm.price <= 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      const dataToSave = {
        name: priceForm.label,
        label: priceForm.label,
        price: parseFloat(priceForm.price),
        description: priceForm.description,
        active: priceForm.active
      };

      if (editingPrice) {
        // Modification via API
        await ticketingAPI.updateTicketType(editingPrice.id, dataToSave);
        
        setTicketPrices(ticketPrices.map(price => 
          price.id === editingPrice.id 
            ? { ...price, ...priceForm, name: priceForm.label }
            : price
        ));

        toast({
          title: 'Tarif mis à jour',
          description: `${priceForm.label} modifié avec succès`,
          status: 'success',
          duration: 2000,
          isClosable: true
        });
      } else {
        // Création via API
        const createdPrice = await ticketingAPI.createTicketType(dataToSave);
        
        const newPrice = {
          id: createdPrice.id || `tarif_${Date.now()}`,
          name: priceForm.label,
          ...priceForm
        };
        setTicketPrices([...ticketPrices, newPrice]);

        toast({
          title: 'Tarif créé',
          description: `${priceForm.label} ajouté avec succès`,
          status: 'success',
          duration: 2000,
          isClosable: true
        });
      }

      onPriceEditClose();
      setEditingPrice(null);
      setPriceForm({ label: '', price: 0, description: '', active: true });
    } catch (error) {
      console.error('Erreur sauvegarde tarif:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le tarif',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleTogglePriceActive = async (priceId) => {
    const price = ticketPrices.find(p => p.id === priceId);
    if (!price) return;

    try {
      // Mettre à jour via API
      await ticketingAPI.updateTicketType(priceId, {
        ...price,
        active: !price.active
      });

      setTicketPrices(ticketPrices.map(p => 
        p.id === priceId 
          ? { ...p, active: !p.active }
          : p
      ));

      toast({
        title: price.active ? 'Tarif désactivé' : 'Tarif activé',
        description: `${price.label} ${price.active ? 'n\'est plus' : 'est maintenant'} disponible`,
        status: 'info',
        duration: 2000,
        isClosable: true
      });
    } catch (error) {
      console.error('Erreur activation/désactivation tarif:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le statut du tarif',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Fonctions de gestion des réductions
  const handleEditDiscount = (discount) => {
    setEditingDiscount(discount);
    setDiscountForm({
      name: discount.name,
      type: discount.type,
      value: discount.value,
      conditions: discount.conditions,
      active: discount.active,
      onlineAvailable: discount.onlineAvailable,
      appliedTo: discount.appliedTo
    });
    onDiscountEditOpen();
  };

  const handleSaveDiscount = async () => {
    if (!discountForm.name || discountForm.value <= 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      if (editingDiscount) {
        // Modification via API
        await ticketingAPI.updateDiscount(editingDiscount.id, discountForm);
        
        setDiscounts(discounts.map(discount => 
          discount.id === editingDiscount.id 
            ? { ...discount, ...discountForm }
            : discount
        ));
        toast({
          title: 'Réduction mise à jour',
          description: `${discountForm.name} modifiée avec succès`,
          status: 'success',
          duration: 2000,
          isClosable: true
        });
      } else {
        // Création via API
        const createdDiscount = await ticketingAPI.createDiscount(discountForm);
        
        const newDiscount = {
          id: createdDiscount.id || `discount_${Date.now()}`,
          ...discountForm
        };
        setDiscounts([...discounts, newDiscount]);
        toast({
          title: 'Réduction créée',
          description: `${discountForm.name} ajoutée avec succès`,
          status: 'success',
          duration: 2000,
          isClosable: true
        });
      }

      onDiscountEditClose();
      setEditingDiscount(null);
      setDiscountForm({ 
        name: '', 
        type: 'percentage', 
        value: 0, 
        conditions: '', 
        active: true, 
        onlineAvailable: false, 
        appliedTo: [] 
      });
    } catch (error) {
      console.error('Erreur sauvegarde réduction:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la réduction',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleToggleDiscountActive = async (discountId) => {
    const discount = discounts.find(d => d.id === discountId);
    if (!discount) return;

    try {
      // Mettre à jour via API
      await ticketingAPI.updateDiscount(discountId, {
        ...discount,
        active: !discount.active
      });

      setDiscounts(discounts.map(d => 
        d.id === discountId 
          ? { ...d, active: !d.active }
          : d
      ));

      toast({
        title: discount.active ? 'Réduction désactivée' : 'Réduction activée',
        description: `${discount.name} ${discount.active ? 'n\'est plus' : 'est maintenant'} disponible`,
        status: 'info',
        duration: 2000,
        isClosable: true
      });
    } catch (error) {
      console.error('Erreur activation/désactivation réduction:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le statut de la réduction',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleDeleteDiscount = async (discountId) => {
    const discount = discounts.find(d => d.id === discountId);
    if (!discount) return;

    try {
      // Supprimer via API
      await ticketingAPI.deleteDiscount(discountId);
      
      setDiscounts(discounts.filter(d => d.id !== discountId));
      toast({
        title: 'Réduction supprimée',
        description: `${discount.name} a été supprimée`,
        status: 'warning',
        duration: 2000,
        isClosable: true
      });
    } catch (error) {
      console.error('Erreur suppression réduction:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la réduction',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Fonctions de gestion de la station d'accueil
  const handleNewReservation = async () => {
    try {
      const newReservation = {
        id: reservations.length + 1,
        time: reservationForm.time,
        name: reservationForm.name,
        type: reservationForm.type,
        persons: parseInt(reservationForm.persons),
        status: 'Confirmé',
        checkedIn: false,
        email: reservationForm.email,
        phone: reservationForm.phone,
        date: reservationForm.date,
        notes: reservationForm.notes
      };

      setReservations([...reservations, newReservation]);
      
      toast({
        title: 'Réservation créée',
        description: `Réservation pour ${reservationForm.name} confirmée`,
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Réinitialiser le formulaire
      setReservationForm({
        name: '',
        email: '',
        phone: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        type: 'Individuel',
        persons: 1,
        notes: ''
      });
      
      onNewReservationClose();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la réservation',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Fonctions pour le parcours de check-in (4 étapes)
  const resetCheckInProcess = () => {
    setCheckInStep(1);
    setSelectedVisitor(null);
    setCheckInSearch('');
    setCheckInVerification({
      identityVerified: false,
      documentsVerified: false,
      paymentStatus: 'pending',
      discountEligible: false,
      discountApplied: null
    });
    setCheckInPayment({
      amount: 0,
      originalAmount: 0,
      discountAmount: 0,
      method: 'CB',
      processed: false
    });
  };

  // Calculer le montant avec réduction
  const calculateAmountWithDiscount = (originalAmount, discountId) => {
    if (!discountId) {
      return {
        amount: originalAmount,
        originalAmount: originalAmount,
        discountAmount: 0
      };
    }

    const discount = discounts.find(d => d.id === discountId);
    if (!discount) {
      return {
        amount: originalAmount,
        originalAmount: originalAmount,
        discountAmount: 0
      };
    }

    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = originalAmount * (discount.value / 100);
    } else {
      discountAmount = discount.value;
    }

    const finalAmount = Math.max(0, originalAmount - discountAmount);

    return {
      amount: finalAmount,
      originalAmount: originalAmount,
      discountAmount: discountAmount
    };
  };

  const handleStartCheckIn = () => {
    resetCheckInProcess();
    onCheckInOpen();
  };

  // ÉTAPE 1: Identification
  const handleIdentifyVisitor = (visitor) => {
    setSelectedVisitor(visitor);
    
    // Les groupes/écoles ont déjà payé via devis
    const isGroupBooking = visitor.type === 'Groupe';
    
    // Déterminer le statut de paiement initial
    let paymentStatus;
    if (isGroupBooking) {
      paymentStatus = 'paid'; // Groupes déjà payés via devis
    } else {
      paymentStatus = visitor.paymentMethod ? 'paid' : 'to_pay';
    }
    
    const totalAmount = visitor.tickets ? 
      visitor.tickets.reduce((sum, t) => sum + (t.quantity * t.price), 0) : 
      visitor.persons * 12; // Prix par défaut

    // Si une réduction est pré-indiquée dans la réservation
    const hasPresetDiscount = visitor.discount && !isGroupBooking;
    let calculatedPayment = {
      amount: isGroupBooking ? 0 : totalAmount,
      originalAmount: totalAmount,
      discountAmount: 0
    };

    if (hasPresetDiscount) {
      calculatedPayment = calculateAmountWithDiscount(totalAmount, visitor.discount);
    }

    setCheckInVerification({
      identityVerified: false,
      documentsVerified: false,
      paymentStatus: paymentStatus,
      discountEligible: hasPresetDiscount,
      discountApplied: hasPresetDiscount ? visitor.discount : null
    });
    
    setCheckInPayment({
      ...calculatedPayment,
      method: isGroupBooking ? 'Devis' : 'CB',
      processed: isGroupBooking,
    });
    
    setCheckInStep(2);
  };

  const handleSearchVisitor = () => {
    const found = reservations.find(res => 
      res.name.toLowerCase().includes(checkInSearch.toLowerCase()) ||
      res.id.toString() === checkInSearch ||
      (res.phone && res.phone.includes(checkInSearch))
    );

    if (found && !found.checkedIn) {
      handleIdentifyVisitor(found);
    } else if (found && found.checkedIn) {
      toast({
        title: 'Déjà enregistré',
        description: 'Ce visiteur a déjà effectué son check-in',
        status: 'info',
        duration: 2000,
        isClosable: true
      });
    } else {
      toast({
        title: 'Non trouvé',
        description: 'Aucune réservation correspondante',
        status: 'warning',
        duration: 2000,
        isClosable: true
      });
    }
  };

  // Édition de la réservation pendant le check-in
  const handleStartEditVisitor = () => {
    if (!selectedVisitor) return;
    
    setVisitorEditForm({
      persons: selectedVisitor.persons,
      type: selectedVisitor.type,
      notes: selectedVisitor.notes || ''
    });
    setIsEditingVisitor(true);
  };

  const handleCancelEditVisitor = () => {
    setIsEditingVisitor(false);
    setVisitorEditForm({
      persons: 1,
      type: 'Individuel',
      notes: ''
    });
  };

  const handleSaveEditVisitor = () => {
    if (!selectedVisitor) return;

    // Mettre à jour la réservation dans la liste
    const updatedReservations = reservations.map(res => 
      res.id === selectedVisitor.id 
        ? { 
            ...res, 
            persons: parseInt(visitorEditForm.persons),
            type: visitorEditForm.type,
            notes: visitorEditForm.notes
          }
        : res
    );
    setReservations(updatedReservations);

    // Mettre à jour le visiteur sélectionné
    const updatedVisitor = {
      ...selectedVisitor,
      persons: parseInt(visitorEditForm.persons),
      type: visitorEditForm.type,
      notes: visitorEditForm.notes
    };
    setSelectedVisitor(updatedVisitor);

    // Recalculer le montant avec les nouvelles informations
    const isGroupBooking = visitorEditForm.type === 'Groupe';
    const totalAmount = updatedVisitor.tickets ? 
      updatedVisitor.tickets.reduce((sum, t) => sum + (t.quantity * t.price), 0) : 
      parseInt(visitorEditForm.persons) * 12;

    let paymentStatus;
    if (isGroupBooking) {
      paymentStatus = 'paid';
    } else {
      paymentStatus = updatedVisitor.paymentMethod ? 'paid' : 'to_pay';
    }

    const hasPresetDiscount = updatedVisitor.discount && !isGroupBooking;
    let calculatedPayment = {
      amount: isGroupBooking ? 0 : totalAmount,
      originalAmount: totalAmount,
      discountAmount: 0
    };

    if (hasPresetDiscount) {
      calculatedPayment = calculateAmountWithDiscount(totalAmount, updatedVisitor.discount);
    } else if (checkInVerification.discountApplied && !isGroupBooking) {
      calculatedPayment = calculateAmountWithDiscount(totalAmount, checkInVerification.discountApplied);
    }

    setCheckInVerification({
      ...checkInVerification,
      paymentStatus: paymentStatus,
      discountEligible: hasPresetDiscount || checkInVerification.discountEligible,
      discountApplied: hasPresetDiscount ? updatedVisitor.discount : checkInVerification.discountApplied
    });

    setCheckInPayment({
      ...calculatedPayment,
      method: isGroupBooking ? 'Devis' : checkInPayment.method,
      processed: isGroupBooking
    });

    setIsEditingVisitor(false);

    toast({
      title: 'Réservation mise à jour',
      description: 'Les informations ont été modifiées avec succès',
      status: 'success',
      duration: 2000,
      isClosable: true
    });
  };

  // ÉTAPE 2: Vérification
  const handleCompleteVerification = () => {
    if (!checkInVerification.identityVerified) {
      toast({
        title: 'Vérification incomplète',
        description: 'Veuillez vérifier l\'identité du visiteur',
        status: 'warning',
        duration: 2000,
        isClosable: true
      });
      return;
    }

    if (checkInVerification.discountEligible && !checkInVerification.documentsVerified) {
      toast({
        title: 'Documents requis',
        description: 'Veuillez vérifier les justificatifs de réduction',
        status: 'warning',
        duration: 2000,
        isClosable: true
      });
      return;
    }

    setCheckInStep(3);
  };

  // ÉTAPE 3: Application (paiement si nécessaire)
  const handleProcessPayment = () => {
    if (checkInVerification.paymentStatus === 'to_pay') {
      setCheckInPayment({ ...checkInPayment, processed: true });
      setCheckInVerification({ ...checkInVerification, paymentStatus: 'paid' });
    }
    setCheckInStep(4);
  };

  // ÉTAPE 4: Finalisation de l'entrée
  const handleFinalizeCheckIn = () => {
    if (!selectedVisitor) return;

    setReservations(reservations.map(res => 
      res.id === selectedVisitor.id ? { ...res, checkedIn: true, status: 'Check-in ✓' } : res
    ));
    
    toast({
      title: 'Entrée validée',
      description: `${selectedVisitor.name} peut entrer au musée`,
      status: 'success',
      duration: 3000,
      isClosable: true
    });

    setTimeout(() => {
      onCheckInClose();
      resetCheckInProcess();
    }, 2000);
  };

  const handleCheckIn = (reservationId) => {
    setReservations(reservations.map(res => 
      res.id === reservationId ? { ...res, checkedIn: true, status: 'Check-in ✓' } : res
    ));
    
    toast({
      title: 'Check-in effectué',
      description: 'Visiteur enregistré avec succès',
      status: 'success',
      duration: 2000,
      isClosable: true
    });
  };

  const handleCheckInSearch = () => {
    const found = reservations.find(res => 
      res.name.toLowerCase().includes(checkInSearch.toLowerCase()) ||
      res.id.toString() === checkInSearch
    );

    if (found && !found.checkedIn) {
      handleCheckIn(found.id);
      setCheckInSearch('');
      onCheckInClose();
    } else if (found && found.checkedIn) {
      toast({
        title: 'Déjà enregistré',
        description: 'Ce visiteur a déjà effectué son check-in',
        status: 'info',
        duration: 2000,
        isClosable: true
      });
    } else {
      toast({
        title: 'Non trouvé',
        description: 'Aucune réservation correspondante',
        status: 'warning',
        duration: 2000,
        isClosable: true
      });
    }
  };

  const handleEditReservation = (reservation) => {
    setSelectedReservation(reservation);
    setReservationForm({
      name: reservation.name,
      email: reservation.email || '',
      phone: reservation.phone || '',
      date: reservation.date || new Date().toISOString().split('T')[0],
      time: reservation.time,
      type: reservation.type,
      persons: reservation.persons,
      notes: reservation.notes || ''
    });
    onNewReservationOpen();
  };

  const handleSellTicket = async () => {
    try {
      const ticketType = ticketTypes.find(t => t.id === ticketSaleForm.ticketType) || 
        { title: 'Tarif Plein', price: '12€' };
      
      toast({
        title: 'Vente effectuée',
        description: `${ticketSaleForm.quantity}x ${ticketType.title} - ${ticketType.price} (${ticketSaleForm.paymentMethod})`,
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Réinitialiser
      setTicketSaleForm({
        ticketType: 'plein',
        quantity: 1,
        paymentMethod: 'CB'
      });
      
      onSellTicketClose();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter la vente',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const refreshReservations = () => {
    toast({
      title: 'Actualisation',
      description: 'Données mises à jour',
      status: 'info',
      duration: 1500,
      isClosable: true
    });
    // Ici on pourrait appeler une API pour recharger les données
  };

  // Sections principales
  const sections = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: FiHome, description: 'Modules du musée' },
    { id: 'retromerch', label: 'Le RétroMerch', icon: FiShoppingBag, description: 'Boutique et produits' },
    { id: 'billetterie', label: 'Billetterie', icon: FiCreditCard, description: 'Ventes et tarifs' },
    { id: 'station-accueil', label: 'Station d\'accueil', icon: FiUsers, description: 'Réservations et accueil' },
    { id: 'tarification', label: 'Tarification', icon: FiDollarSign, description: 'Prix des billets' }
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
      case 'station-accueil':
        return renderStationAccueil();
      case 'tarification':
        return renderTicketPricing();
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

  // Rendu Station d'accueil
  const renderStationAccueil = () => {
    if (ticketingLoading) {
      return (
        <Center h="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color="rbe.500" thickness="4px" />
            <Heading size="lg" color="black">Chargement de la station...</Heading>
            <Text fontSize="lg" fontStyle="italic" color="gray.600">
              Préparation de l'espace d'accueil...
            </Text>
          </VStack>
        </Center>
      );
    }

    const displayStats = ticketingStats || {
      todayVisitors: 0,
      monthVisitors: 0,
      monthRevenue: '€0',
      growth: '+0%'
    };

    return (
      <VStack spacing={8} align="stretch">
        {/* Carte héro avec gradient RBE */}
        <Card
          bgGradient="linear(to-r, rbe.500, rbe.600)"
          color="white"
          borderRadius="xl"
          overflow="hidden"
          position="relative"
        >
          <CardBody p={8}>
            <HStack justify="space-between" align="flex-start">
              <VStack align="flex-start" spacing={2}>
                <HStack>
                  <Icon as={FiUsers} boxSize={8} />
                  <Heading size="xl">Station d'accueil</Heading>
                </HStack>
                <Text fontSize="lg" opacity={0.9}>
                  Gestion des réservations et accueil des visiteurs
                </Text>
              </VStack>
              <Badge
                bg="white"
                color="rbe.500"
                fontSize="md"
                px={4}
                py={2}
                borderRadius="full"
                fontWeight="bold"
              >
                {displayStats.todayVisitors} visiteurs aujourd'hui
              </Badge>
            </HStack>
          </CardBody>
        </Card>

        {/* Actions rapides */}
        <Box>
          <Heading size="md" mb={4} color="gray.800">Actions rapides</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Card 
              bg="blue.50" 
              borderRadius="lg"
              borderWidth="2px"
              borderColor="blue.200"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg', borderColor: 'blue.400' }}
              transition="all 0.3s"
              cursor="pointer"
            >
              <CardBody textAlign="center">
                <Icon as={FiPlus} boxSize={10} color="blue.500" mb={3} />
                <Heading size="md" mb={2} color="blue.700">Nouvelle Réservation</Heading>
                <Text fontSize="sm" color="gray.700" mb={4}>
                  Créer une réservation sur place
                </Text>
                <Button colorScheme="blue" size="lg" w="full" onClick={onNewReservationOpen}>
                  Réserver maintenant
                </Button>
              </CardBody>
            </Card>

            <Card 
              bg="green.50" 
              borderRadius="lg"
              borderWidth="2px"
              borderColor="green.200"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg', borderColor: 'green.400' }}
              transition="all 0.3s"
              cursor="pointer"
            >
              <CardBody textAlign="center">
                <Icon as={FiCheckCircle} boxSize={10} color="green.500" mb={3} />
                <Heading size="md" mb={2} color="green.700">Check-in Visiteur</Heading>
                <Text fontSize="sm" color="gray.700" mb={4}>
                  Enregistrer l'arrivée d'un visiteur
                </Text>
                <Button colorScheme="green" size="lg" w="full" onClick={handleStartCheckIn}>
                  Scanner/Rechercher
                </Button>
              </CardBody>
            </Card>

            <Card 
              bg="purple.50" 
              borderRadius="lg"
              borderWidth="2px"
              borderColor="purple.200"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg', borderColor: 'purple.400' }}
              transition="all 0.3s"
              cursor="pointer"
            >
              <CardBody textAlign="center">
                <Icon as={FiCalendar} boxSize={10} color="purple.500" mb={3} />
                <Heading size="md" mb={2} color="purple.700">Voir Réservations</Heading>
                <Text fontSize="sm" color="gray.700" mb={4}>
                  Consulter l'agenda du jour
                </Text>
                <Button colorScheme="purple" size="lg" w="full" onClick={onAgendaOpen}>
                  Accéder à l'agenda
                </Button>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Réservations du jour */}
        <Box>
          <HStack justify="space-between" mb={4}>
            <Heading size="md" color="gray.800">Réservations du jour</Heading>
            <HStack>
              <Button leftIcon={<FiRefreshCw />} size="sm" variant="outline" colorScheme="gray" onClick={refreshReservations}>
                Actualiser
              </Button>
              <Button leftIcon={<FiCalendar />} size="sm" colorScheme="rbe" onClick={onAgendaOpen}>
                Voir tout l'agenda
              </Button>
            </HStack>
          </HStack>

          <Card bg={cardBg} borderRadius="lg">
            <CardBody>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Heure</Th>
                    <Th>Nom</Th>
                    <Th>Type</Th>
                    <Th>Personnes</Th>
                    <Th>Statut</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {reservations.map((reservation) => (
                    <Tr key={reservation.id}>
                      <Td fontWeight="medium">{reservation.time}</Td>
                      <Td>{reservation.name}</Td>
                      <Td>
                        <Badge colorScheme={reservation.type === 'Individuel' ? 'blue' : 'purple'}>
                          {reservation.type}
                        </Badge>
                      </Td>
                      <Td>{reservation.persons}</Td>
                      <Td>
                        <Badge 
                          colorScheme={
                            reservation.checkedIn ? 'green' : 
                            reservation.status === 'Confirmé' ? 'green' : 'orange'
                          }
                        >
                          {reservation.status}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          {!reservation.checkedIn ? (
                            <>
                              <IconButton
                                icon={<FiCheckCircle />}
                                size="sm"
                                colorScheme="green"
                                aria-label="Check-in"
                                onClick={() => handleCheckIn(reservation.id)}
                              />
                              <IconButton
                                icon={<FiEdit />}
                                size="sm"
                                colorScheme="blue"
                                variant="outline"
                                aria-label="Modifier"
                                onClick={() => handleEditReservation(reservation)}
                              />
                            </>
                          ) : (
                            <IconButton
                              icon={<FiInfo />}
                              size="sm"
                              colorScheme="gray"
                              variant="outline"
                              aria-label="Détails"
                            />
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        </Box>

        {/* Statistiques et outils */}
        <Box>
          <Heading size="md" mb={4} color="gray.800">Outils d'accueil</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Card 
              bg={cardBg} 
              borderRadius="lg"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              transition="all 0.3s"
              cursor="pointer"
            >
              <CardBody textAlign="center">
                <Icon as={FiBarChart2} boxSize={8} color="rbe.500" mb={3} />
                <Heading size="sm" mb={2}>Statistiques en direct</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Affluence et tendances du jour
                </Text>
                <Button colorScheme="rbe" size="sm" variant="outline" w="full">
                  Voir les stats
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
                <Icon as={FiCreditCard} boxSize={8} color="green.500" mb={3} />
                <Heading size="sm" mb={2}>Vente de Billets</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Achats sur place sans réservation
                </Text>
                <Button colorScheme="green" size="sm" variant="outline" w="full" onClick={onSellTicketOpen}>
                  Vendre un billet
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
                <Icon as={FiHelpCircle} boxSize={8} color="orange.500" mb={3} />
                <Heading size="sm" mb={2}>Aide Visiteur</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Informations et assistance
                </Text>
                <Button colorScheme="orange" size="sm" variant="outline" w="full">
                  Accéder
                </Button>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Modales */}
        {/* Modal Nouvelle Réservation */}
        <Modal isOpen={isNewReservationOpen} onClose={onNewReservationClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Icon as={FiPlus} color="blue.500" />
                <Text>{selectedReservation ? 'Modifier la réservation' : 'Nouvelle Réservation'}</Text>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nom complet</FormLabel>
                  <Input
                    placeholder="Jean Dupont"
                    value={reservationForm.name}
                    onChange={(e) => setReservationForm({ ...reservationForm, name: e.target.value })}
                  />
                </FormControl>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      placeholder="jean@example.com"
                      value={reservationForm.email}
                      onChange={(e) => setReservationForm({ ...reservationForm, email: e.target.value })}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Téléphone</FormLabel>
                    <Input
                      type="tel"
                      placeholder="06 12 34 56 78"
                      value={reservationForm.phone}
                      onChange={(e) => setReservationForm({ ...reservationForm, phone: e.target.value })}
                    />
                  </FormControl>
                </SimpleGrid>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>Date</FormLabel>
                    <Input
                      type="date"
                      value={reservationForm.date}
                      onChange={(e) => setReservationForm({ ...reservationForm, date: e.target.value })}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Heure</FormLabel>
                    <Input
                      type="time"
                      value={reservationForm.time}
                      onChange={(e) => setReservationForm({ ...reservationForm, time: e.target.value })}
                    />
                  </FormControl>
                </SimpleGrid>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>Type de visite</FormLabel>
                    <Select
                      value={reservationForm.type}
                      onChange={(e) => setReservationForm({ ...reservationForm, type: e.target.value })}
                    >
                      <option value="Individuel">Individuel</option>
                      <option value="Groupe">Groupe</option>
                    </Select>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Nombre de personnes</FormLabel>
                    <Input
                      type="number"
                      min={1}
                      value={reservationForm.persons}
                      onChange={(e) => setReservationForm({ ...reservationForm, persons: parseInt(e.target.value) || 1 })}
                    />
                  </FormControl>
                </SimpleGrid>

                {/* Section Billets */}
                <Box w="full" borderWidth="1px" borderRadius="lg" p={4} bg={useColorModeValue('blue.50', 'blue.900')}>
                  <HStack mb={3}>
                    <Icon as={FiCreditCard} color="blue.500" />
                    <Heading size="sm">Billets à acheter sur place</Heading>
                  </HStack>
                  
                  {/* Liste des billets sélectionnés */}
                  {reservationForm.tickets.length > 0 && (
                    <VStack spacing={2} mb={3}>
                      {reservationForm.tickets.map((ticket, idx) => (
                        <HStack key={idx} w="full" justify="space-between" p={2} bg="white" borderRadius="md">
                          <HStack spacing={2}>
                            <Badge colorScheme="blue">{ticket.quantity}x</Badge>
                            <Text fontWeight="medium">{ticket.type}</Text>
                            <Text fontSize="sm" color="gray.600">{ticket.price}€/billet</Text>
                          </HStack>
                          <HStack>
                            <Text fontWeight="bold" color="green.500">{(ticket.quantity * ticket.price).toFixed(2)}€</Text>
                            <IconButton
                              icon={<FiX />}
                              size="xs"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => {
                                const newTickets = reservationForm.tickets.filter((_, i) => i !== idx);
                                setReservationForm({ ...reservationForm, tickets: newTickets });
                              }}
                            />
                          </HStack>
                        </HStack>
                      ))}
                      <Divider />
                      <HStack w="full" justify="space-between">
                        <Text fontWeight="bold">Total à payer :</Text>
                        <Text fontSize="lg" fontWeight="bold" color="rbe.500">
                          {reservationForm.tickets.reduce((sum, t) => sum + (t.quantity * t.price), 0).toFixed(2)}€
                        </Text>
                      </HStack>
                    </VStack>
                  )}

                  {/* Sélection de nouveau billet */}
                  <SimpleGrid columns={3} spacing={2}>
                    <FormControl>
                      <FormLabel fontSize="sm">Type</FormLabel>
                      <Select
                        size="sm"
                        id="newTicketType"
                        defaultValue="plein"
                      >
                        {ticketPrices.filter(t => t.active).map(t => (
                          <option key={t.id} value={t.id}>{t.name} - {t.price}€</option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Quantité</FormLabel>
                      <Input
                        type="number"
                        size="sm"
                        min={1}
                        id="newTicketQty"
                        defaultValue={1}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">&nbsp;</FormLabel>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<FiPlus />}
                        w="full"
                        onClick={() => {
                          const typeSelect = document.getElementById('newTicketType');
                          const qtyInput = document.getElementById('newTicketQty');
                          const selectedTicket = ticketPrices.find(t => t.id === typeSelect.value);
                          
                          if (selectedTicket && qtyInput.value > 0) {
                            const newTicket = {
                              type: selectedTicket.name,
                              quantity: parseInt(qtyInput.value),
                              price: selectedTicket.price
                            };
                            setReservationForm({
                              ...reservationForm,
                              tickets: [...reservationForm.tickets, newTicket]
                            });
                            qtyInput.value = 1; // Reset
                          }
                        }}
                      >
                        Ajouter
                      </Button>
                    </FormControl>
                  </SimpleGrid>
                </Box>

                <FormControl>
                  <FormLabel>Notes</FormLabel>
                  <Textarea
                    placeholder="Informations complémentaires..."
                    value={reservationForm.notes}
                    onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
                    rows={3}
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onNewReservationClose}>
                Annuler
              </Button>
              <Button colorScheme="blue" onClick={handleNewReservation}>
                {selectedReservation ? 'Mettre à jour' : 'Créer la réservation'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Check-in - Parcours complet 4 étapes */}
        <Modal isOpen={isCheckInOpen} onClose={onCheckInClose} size="full">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader bg="gray.50" borderBottomWidth="1px">
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <HStack>
                    <Icon as={FiUserCheck} boxSize={6} color="blue.500" />
                    <Heading size="lg">Parcours de Check-in</Heading>
                  </HStack>
                  <ModalCloseButton position="relative" top={0} right={0} />
                </HStack>

                {/* Stepper / Fil d'Ariane */}
                <Stepper index={checkInStep - 1} colorScheme="blue" size="lg">
                  <Step>
                    <StepIndicator>
                      <StepStatus
                        complete={<StepIcon />}
                        incomplete={<StepNumber />}
                        active={<StepNumber />}
                      />
                    </StepIndicator>

                    <Box flexShrink="0">
                      <StepTitle>Identification</StepTitle>
                      <StepDescription>Trouver le visiteur</StepDescription>
                    </Box>

                    <StepSeparator />
                  </Step>

                  <Step>
                    <StepIndicator>
                      <StepStatus
                        complete={<StepIcon />}
                        incomplete={<StepNumber />}
                        active={<StepNumber />}
                      />
                    </StepIndicator>

                    <Box flexShrink="0">
                      <StepTitle>Vérification</StepTitle>
                      <StepDescription>Contrôles & documents</StepDescription>
                    </Box>

                    <StepSeparator />
                  </Step>

                  <Step>
                    <StepIndicator>
                      <StepStatus
                        complete={<StepIcon />}
                        incomplete={<StepNumber />}
                        active={<StepNumber />}
                      />
                    </StepIndicator>

                    <Box flexShrink="0">
                      <StepTitle>Application</StepTitle>
                      <StepDescription>Confirmation & paiement</StepDescription>
                    </Box>

                    <StepSeparator />
                  </Step>

                  <Step>
                    <StepIndicator>
                      <StepStatus
                        complete={<StepIcon />}
                        incomplete={<StepNumber />}
                        active={<StepNumber />}
                      />
                    </StepIndicator>

                    <Box flexShrink="0">
                      <StepTitle>Entrée</StepTitle>
                      <StepDescription>Validation finale</StepDescription>
                    </Box>
                  </Step>
                </Stepper>

                {/* Progress bar */}
                <Progress value={(checkInStep / 4) * 100} colorScheme="blue" size="sm" borderRadius="full" />
              </VStack>
            </ModalHeader>

            <ModalBody p={8}>
              <Container maxW="container.lg">
                {/* ÉTAPE 1: IDENTIFICATION */}
                {checkInStep === 1 && (
                  <VStack spacing={8} align="stretch">
                    <VStack spacing={2}>
                      <Icon as={FiSearch} boxSize={12} color="blue.500" />
                      <Heading size="xl">Identification du Visiteur</Heading>
                      <Text color="gray.600">Recherchez le visiteur par QR code, numéro de réservation, nom ou téléphone</Text>
                    </VStack>

                    <Card>
                      <CardBody>
                        <VStack spacing={4}>
                          <FormControl>
                            <FormLabel>Rechercher</FormLabel>
                            <HStack>
                              <Input
                                placeholder="QR code, numéro, nom ou téléphone..."
                                value={checkInSearch}
                                onChange={(e) => setCheckInSearch(e.target.value)}
                                size="lg"
                                autoFocus
                                onKeyPress={(e) => e.key === 'Enter' && handleSearchVisitor()}
                              />
                              <Button colorScheme="blue" size="lg" leftIcon={<FiSearch />} onClick={handleSearchVisitor}>
                                Rechercher
                              </Button>
                            </HStack>
                          </FormControl>

                          <Divider />

                          {reservations.filter(r => !r.checkedIn).length > 0 && (
                            <Box w="full">
                              <Text fontSize="md" fontWeight="medium" mb={3}>Réservations en attente aujourd'hui :</Text>
                              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                {reservations.filter(r => !r.checkedIn).map(res => (
                                  <Card 
                                    key={res.id} 
                                    cursor="pointer"
                                    borderWidth="2px"
                                    borderColor="transparent"
                                    _hover={{ borderColor: 'blue.500', shadow: 'md' }}
                                    transition="all 0.2s"
                                    onClick={() => handleIdentifyVisitor(res)}
                                  >
                                    <CardBody>
                                      <VStack align="stretch" spacing={2}>
                                        <HStack justify="space-between">
                                          <Heading size="md">{res.name}</Heading>
                                          <Badge colorScheme={res.type === 'Individuel' ? 'blue' : 'purple'} fontSize="sm">
                                            {res.type}
                                          </Badge>
                                        </HStack>
                                        <HStack spacing={4} color="gray.600">
                                          <HStack>
                                            <Icon as={FiClock} />
                                            <Text fontSize="sm">{res.time}</Text>
                                          </HStack>
                                          <HStack>
                                            <Icon as={FiUsers} />
                                            <Text fontSize="sm">{res.persons} pers.</Text>
                                          </HStack>
                                        </HStack>
                                        <HStack spacing={2}>
                                          <Badge colorScheme={res.status === 'Confirmé' ? 'green' : 'orange'} w="fit-content">
                                            {res.status}
                                          </Badge>
                                          {res.discount && (
                                            <Badge colorScheme="purple" w="fit-content">
                                              <HStack spacing={1}>
                                                <Icon as={FiPercent} boxSize={3} />
                                                <Text>Réduction</Text>
                                              </HStack>
                                            </Badge>
                                          )}
                                        </HStack>
                                        {res.notes && (
                                          <Box mt={2} p={2} bg="gray.50" borderRadius="md" borderLeftWidth="3px" borderLeftColor={
                                            res.notes.includes('RSA') ? 'green.400' :
                                            res.notes.includes('CSS') ? 'blue.400' :
                                            res.notes.includes('Devis') ? 'purple.400' :
                                            res.notes.includes('expirés') ? 'red.400' :
                                            res.notes.includes('correspondance') ? 'orange.400' :
                                            'gray.300'
                                          }>
                                            <HStack align="flex-start" spacing={2}>
                                              <Icon as={FiInfo} boxSize={4} color="gray.600" mt={0.5} />
                                              <Text fontSize="xs" color="gray.700" lineHeight="1.4">{res.notes}</Text>
                                            </HStack>
                                          </Box>
                                        )}
                                      </VStack>
                                    </CardBody>
                                  </Card>
                                ))}
                              </SimpleGrid>
                            </Box>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>
                  </VStack>
                )}

                {/* ÉTAPE 2: VÉRIFICATION */}
                {checkInStep === 2 && selectedVisitor && (
                  <VStack spacing={8} align="stretch">
                    <VStack spacing={2}>
                      <Icon as={FiShield} boxSize={12} color="purple.500" />
                      <Heading size="xl">Vérification</Heading>
                      <Text color="gray.600">Contrôles d'identité, documents et statut de paiement</Text>
                    </VStack>

                    <Card>
                      <CardBody>
                        <VStack spacing={6} align="stretch">
                          <Box>
                            <HStack justify="space-between" mb={4}>
                              <Heading size="md">Informations du visiteur</Heading>
                              <Button
                                size="sm"
                                leftIcon={<FiEdit />}
                                colorScheme="blue"
                                variant="outline"
                                onClick={handleStartEditVisitor}
                              >
                                Modifier
                              </Button>
                            </HStack>
                            <SimpleGrid columns={2} spacing={4}>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Nom complet</Text>
                                <Text fontWeight="bold" fontSize="lg">{selectedVisitor.name}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Type de visite</Text>
                                <Badge colorScheme="blue" fontSize="md">{selectedVisitor.type}</Badge>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Heure prévue</Text>
                                <Text fontWeight="medium">{selectedVisitor.time}</Text>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Nombre de personnes</Text>
                                <Text fontWeight="medium">{selectedVisitor.persons}</Text>
                              </Box>
                            </SimpleGrid>

                            {selectedVisitor.notes && (
                              <Box mt={4} p={3} bg="blue.50" borderRadius="md" borderLeftWidth="4px" borderLeftColor="blue.400">
                                <HStack align="flex-start" spacing={2}>
                                  <Icon as={FiInfo} boxSize={5} color="blue.600" mt={0.5} />
                                  <VStack align="flex-start" spacing={0}>
                                    <Text fontSize="xs" fontWeight="bold" color="blue.700" textTransform="uppercase">Notes de réservation</Text>
                                    <Text fontSize="sm" color="gray.700" mt={1}>{selectedVisitor.notes}</Text>
                                  </VStack>
                                </HStack>
                              </Box>
                            )}
                          </Box>

                          <Divider />

                          <Box>
                            <Heading size="md" mb={4}>Vérifications requises</Heading>
                            <VStack spacing={4} align="stretch">
                              <Card bg={checkInVerification.identityVerified ? 'green.50' : 'white'} borderWidth="2px" borderColor={checkInVerification.identityVerified ? 'green.500' : 'gray.200'}>
                                <CardBody>
                                  <HStack justify="space-between">
                                    <HStack>
                                      <Icon as={FiUserCheck} boxSize={6} color={checkInVerification.identityVerified ? 'green.500' : 'gray.400'} />
                                      <VStack align="flex-start" spacing={0}>
                                        <Text fontWeight="bold">Vérification d'identité</Text>
                                        <Text fontSize="sm" color="gray.600">Pièce d'identité valide</Text>
                                      </VStack>
                                    </HStack>
                                    <Checkbox
                                      size="lg"
                                      colorScheme="green"
                                      isChecked={checkInVerification.identityVerified}
                                      onChange={(e) => setCheckInVerification({ ...checkInVerification, identityVerified: e.target.checked })}
                                    />
                                  </HStack>
                                </CardBody>
                              </Card>

                              <Card bg={checkInVerification.paymentStatus === 'paid' ? 'green.50' : 'orange.50'} borderWidth="2px" borderColor={checkInVerification.paymentStatus === 'paid' ? 'green.500' : 'orange.300'}>
                                <CardBody>
                                  <VStack align="stretch" spacing={3}>
                                    <HStack justify="space-between">
                                      <HStack>
                                        <Icon as={FiCreditCard} boxSize={6} color={checkInVerification.paymentStatus === 'paid' ? 'green.500' : 'orange.500'} />
                                        <VStack align="flex-start" spacing={0}>
                                          <Text fontWeight="bold">Statut de paiement</Text>
                                          <Text fontSize="sm" color="gray.600">
                                            {checkInVerification.paymentStatus === 'paid' 
                                              ? (selectedVisitor?.type === 'Groupe' ? 'Payé par devis' : 'Payé en ligne')
                                              : 'À payer sur place'}
                                          </Text>
                                        </VStack>
                                      </HStack>
                                      <Badge colorScheme={checkInVerification.paymentStatus === 'paid' ? 'green' : 'orange'} fontSize="md">
                                        {checkInVerification.paymentStatus === 'paid' ? 'PAYÉ' : 'À PAYER'}
                                      </Badge>
                                    </HStack>
                                    {checkInVerification.paymentStatus !== 'paid' && (
                                      <Alert status="warning" variant="subtle" borderRadius="md">
                                        <AlertIcon />
                                        <Text fontSize="sm">Le paiement devra être effectué à l'étape suivante</Text>
                                      </Alert>
                                    )}
                                    {checkInVerification.paymentStatus === 'paid' && selectedVisitor?.type === 'Groupe' && (
                                      <Alert status="info" variant="subtle" borderRadius="md">
                                        <AlertIcon />
                                        <Text fontSize="sm">Paiement effectué au préalable par devis - Aucun montant à régler aujourd'hui</Text>
                                      </Alert>
                                    )}
                                  </VStack>
                                </CardBody>
                              </Card>

                              <Card borderWidth="2px" borderColor="gray.200">
                                <CardBody>
                                  <VStack align="stretch" spacing={3}>
                                    <HStack justify="space-between">
                                      <HStack>
                                        <Icon as={FiPercent} boxSize={6} color="purple.500" />
                                        <VStack align="flex-start" spacing={0}>
                                          <Text fontWeight="bold">Éligibilité aux réductions</Text>
                                          <Text fontSize="sm" color="gray.600">Justificatifs de réduction</Text>
                                        </VStack>
                                      </HStack>
                                      {selectedVisitor?.type !== 'Groupe' && (
                                        <Checkbox
                                          size="lg"
                                          colorScheme="purple"
                                          isChecked={checkInVerification.discountEligible}
                                          onChange={(e) => setCheckInVerification({ ...checkInVerification, discountEligible: e.target.checked })}
                                        />
                                      )}
                                    </HStack>
                                    
                                    {selectedVisitor?.type === 'Groupe' && (
                                      <Alert status="info" variant="subtle" borderRadius="md">
                                        <AlertIcon />
                                        <Text fontSize="sm">Les réductions ne sont pas applicables aux groupes (tarif déjà négocié par devis)</Text>
                                      </Alert>
                                    )}
                                    
                                    {checkInVerification.discountEligible && selectedVisitor?.type !== 'Groupe' && (
                                      <>
                                        <Divider />
                                        <FormControl>
                                          <FormLabel>Réduction applicable</FormLabel>
                                          <Select
                                            placeholder="Sélectionner une réduction"
                                            value={checkInVerification.discountApplied || ''}
                                            onChange={(e) => {
                                              const discountId = e.target.value;
                                              setCheckInVerification({ ...checkInVerification, discountApplied: discountId });
                                              
                                              // Recalculer le montant avec la réduction
                                              const calculatedPayment = calculateAmountWithDiscount(checkInPayment.originalAmount, discountId);
                                              setCheckInPayment({
                                                ...checkInPayment,
                                                ...calculatedPayment
                                              });
                                            }}
                                          >
                                            {discounts.filter(d => d.active).map(d => (
                                              <option key={d.id} value={d.id}>
                                                {d.name} - {d.type === 'percentage' ? `-${d.value}%` : `-${d.value}€`}
                                              </option>
                                            ))}
                                          </Select>
                                        </FormControl>
                                        
                                        {checkInVerification.discountApplied && (
                                          <Alert status="info" borderRadius="md">
                                            <AlertIcon />
                                            <VStack align="flex-start" spacing={1} fontSize="sm">
                                              <Text fontWeight="bold">
                                                Montant recalculé : {checkInPayment.amount.toFixed(2)}€
                                              </Text>
                                              <Text color="gray.600">
                                                {checkInPayment.originalAmount.toFixed(2)}€ - {checkInPayment.discountAmount.toFixed(2)}€ de réduction
                                              </Text>
                                            </VStack>
                                          </Alert>
                                        )}
                                        
                                        <FormControl>
                                          <FormLabel>Documents vérifiés</FormLabel>
                                          <HStack>
                                            <Checkbox
                                              colorScheme="green"
                                              isChecked={checkInVerification.documentsVerified}
                                              onChange={(e) => setCheckInVerification({ ...checkInVerification, documentsVerified: e.target.checked })}
                                            >
                                              <Text fontSize="sm">J'ai vérifié les justificatifs</Text>
                                            </Checkbox>
                                          </HStack>
                                        </FormControl>
                                      </>
                                    )}
                                  </VStack>
                                </CardBody>
                              </Card>
                            </VStack>
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  </VStack>
                )}

                {/* ÉTAPE 3: APPLICATION */}
                {checkInStep === 3 && selectedVisitor && (
                  <VStack spacing={8} align="stretch">
                    <VStack spacing={2}>
                      <Icon as={FiCheck} boxSize={12} color="blue.500" />
                      <Heading size="xl">Application & Confirmation</Heading>
                      <Text color="gray.600">Confirmation des vérifications et traitement du paiement</Text>
                    </VStack>

                    <Card>
                      <CardBody>
                        <VStack spacing={6} align="stretch">
                          <Box>
                            <Heading size="md" mb={4}>Récapitulatif</Heading>
                            <VStack spacing={3} align="stretch">
                              <HStack justify="space-between" p={3} bg="green.50" borderRadius="md">
                                <HStack>
                                  <Icon as={FiCheckCircle} color="green.500" />
                                  <Text fontWeight="medium">Identité vérifiée</Text>
                                </HStack>
                                <Badge colorScheme="green">OK</Badge>
                              </HStack>
                              
                              {selectedVisitor?.type === 'Groupe' && (
                                <HStack justify="space-between" p={3} bg="blue.50" borderRadius="md">
                                  <HStack>
                                    <Icon as={FiFileText} color="blue.500" />
                                    <Text fontWeight="medium">Paiement par devis</Text>
                                  </HStack>
                                  <Badge colorScheme="blue">RÉGLÉ</Badge>
                                </HStack>
                              )}
                              
                              {checkInVerification.discountEligible && (
                                <HStack justify="space-between" p={3} bg="purple.50" borderRadius="md">
                                  <HStack>
                                    <Icon as={FiPercent} color="purple.500" />
                                    <Text fontWeight="medium">Réduction appliquée</Text>
                                  </HStack>
                                  <Badge colorScheme="purple">
                                    {checkInVerification.discountApplied ? discounts.find(d => d.id === checkInVerification.discountApplied)?.name : 'Aucune'}
                                  </Badge>
                                </HStack>
                              )}
                            </VStack>
                          </Box>

                          <Divider />

                          {checkInVerification.paymentStatus === 'to_pay' && !checkInPayment.processed && (
                            <Box>
                              <Heading size="md" mb={4}>Paiement sur place</Heading>
                              <Alert status="warning" variant="left-accent" borderRadius="md" mb={4}>
                                <AlertIcon />
                                <Text>Le visiteur doit effectuer le paiement maintenant</Text>
                              </Alert>

                              <Card borderWidth="2px" borderColor="orange.300">
                                <CardBody>
                                  <VStack spacing={4}>
                                    {checkInPayment.discountAmount > 0 ? (
                                      <VStack spacing={2} w="full">
                                        <HStack justify="space-between" w="full">
                                          <Text fontSize="sm" color="gray.600">Prix initial</Text>
                                          <Text fontSize="sm" textDecoration="line-through">{checkInPayment.originalAmount.toFixed(2)}€</Text>
                                        </HStack>
                                        <HStack justify="space-between" w="full">
                                          <Text fontSize="sm" color="green.600" fontWeight="medium">
                                            Réduction appliquée
                                          </Text>
                                          <Text fontSize="sm" color="green.600" fontWeight="medium">-{checkInPayment.discountAmount.toFixed(2)}€</Text>
                                        </HStack>
                                        <Divider />
                                        <HStack justify="space-between" w="full">
                                          <Text fontSize="lg" fontWeight="bold">Montant à payer</Text>
                                          <Heading size="xl" color="rbe.500">{checkInPayment.amount.toFixed(2)}€</Heading>
                                        </HStack>
                                      </VStack>
                                    ) : (
                                      <HStack justify="space-between" w="full">
                                        <Text fontSize="lg" fontWeight="bold">Montant à payer</Text>
                                        <Heading size="xl" color="rbe.500">{checkInPayment.amount.toFixed(2)}€</Heading>
                                      </HStack>
                                    )}

                                    <Divider />

                                    <FormControl>
                                      <FormLabel>Méthode de paiement</FormLabel>
                                      <Select
                                        value={checkInPayment.method}
                                        onChange={(e) => setCheckInPayment({ ...checkInPayment, method: e.target.value })}
                                      >
                                        <option value="CB">Carte bancaire</option>
                                        <option value="Espèces">Espèces</option>
                                        <option value="Chèque">Chèque</option>
                                      </Select>
                                    </FormControl>

                                    <Button
                                      colorScheme="green"
                                      size="lg"
                                      w="full"
                                      leftIcon={<FiCreditCard />}
                                      onClick={() => {
                                        setCheckInPayment({ ...checkInPayment, processed: true });
                                        setCheckInVerification({ ...checkInVerification, paymentStatus: 'paid' });
                                        toast({
                                          title: 'Paiement enregistré',
                                          description: `${checkInPayment.amount.toFixed(2)}€ encaissé par ${checkInPayment.method}`,
                                          status: 'success',
                                          duration: 2000,
                                          isClosable: true
                                        });
                                      }}
                                    >
                                      Confirmer le paiement de {checkInPayment.amount.toFixed(2)}€
                                    </Button>
                                  </VStack>
                                </CardBody>
                              </Card>
                            </Box>
                          )}

                          {(checkInVerification.paymentStatus === 'paid' || checkInPayment.processed) && (
                            <Alert status="success" variant="solid" borderRadius="lg">
                              <AlertIcon />
                              <VStack align="flex-start" spacing={0}>
                                <Text fontWeight="bold">Paiement confirmé</Text>
                                <Text fontSize="sm">
                                  {selectedVisitor?.type === 'Groupe' 
                                    ? 'Réglé au préalable par devis - Aucun montant à régler aujourd\'hui'
                                    : 'Toutes les vérifications sont complètes'}
                                </Text>
                              </VStack>
                            </Alert>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>
                  </VStack>
                )}

                {/* ÉTAPE 4: ENTRÉE */}
                {checkInStep === 4 && selectedVisitor && (
                  <VStack spacing={8} align="stretch">
                    <VStack spacing={4}>
                      <Icon as={FiLogIn} boxSize={16} color="green.500" />
                      <Heading size="2xl">Let's Go!</Heading>
                      <Text color="gray.600" fontSize="lg">Le visiteur peut maintenant entrer au musée</Text>
                    </VStack>

                    <Card bg="green.50" borderWidth="3px" borderColor="green.500">
                      <CardBody>
                        <VStack spacing={6}>
                          <VStack spacing={2}>
                            <Heading size="xl" color="green.700">{selectedVisitor.name}</Heading>
                            <HStack spacing={4} fontSize="lg">
                              <HStack>
                                <Icon as={FiUsers} />
                                <Text>{selectedVisitor.persons} personne(s)</Text>
                              </HStack>
                              <HStack>
                                <Icon as={FiClock} />
                                <Text>{selectedVisitor.time}</Text>
                              </HStack>
                            </HStack>
                          </VStack>

                          <Divider />

                          <SimpleGrid columns={3} spacing={4} w="full">
                            <VStack>
                              <Icon as={FiCheckCircle} boxSize={8} color="green.500" />
                              <Text fontSize="sm" textAlign="center">Identité vérifiée</Text>
                            </VStack>
                            <VStack>
                              <Icon as={FiCreditCard} boxSize={8} color="green.500" />
                              <Text fontSize="sm" textAlign="center">Paiement OK</Text>
                            </VStack>
                            <VStack>
                              <Icon as={FiLogIn} boxSize={8} color="green.500" />
                              <Text fontSize="sm" textAlign="center">Entrée autorisée</Text>
                            </VStack>
                          </SimpleGrid>

                          <Button
                            colorScheme="green"
                            size="lg"
                            w="full"
                            onClick={handleFinalizeCheckIn}
                            leftIcon={<FiCheck />}
                          >
                            Finaliser l'entrée
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>

                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      <Text fontSize="sm">Le check-in sera enregistré et le visiteur sera marqué comme entré</Text>
                    </Alert>
                  </VStack>
                )}
              </Container>
            </ModalBody>

            <ModalFooter borderTopWidth="1px" bg="gray.50">
              <HStack spacing={4} w="full" justify="space-between">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (checkInStep > 1) {
                      setCheckInStep(checkInStep - 1);
                    } else {
                      onCheckInClose();
                      resetCheckInProcess();
                    }
                  }}
                  leftIcon={checkInStep === 1 ? <FiX /> : undefined}
                >
                  {checkInStep === 1 ? 'Annuler' : 'Retour'}
                </Button>

                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.600">
                    Étape {checkInStep} sur 4
                  </Text>
                </HStack>

                {checkInStep < 4 && (
                  <Button
                    colorScheme="blue"
                    onClick={() => {
                      if (checkInStep === 1 && !selectedVisitor) {
                        toast({
                          title: 'Aucun visiteur sélectionné',
                          description: 'Veuillez identifier un visiteur',
                          status: 'warning',
                          duration: 2000,
                          isClosable: true
                        });
                        return;
                      }
                      if (checkInStep === 2) {
                        handleCompleteVerification();
                      } else if (checkInStep === 3) {
                        if (checkInVerification.paymentStatus === 'to_pay' && !checkInPayment.processed) {
                          toast({
                            title: 'Paiement requis',
                            description: 'Veuillez confirmer le paiement avant de continuer',
                            status: 'warning',
                            duration: 2000,
                            isClosable: true
                          });
                          return;
                        }
                        handleProcessPayment();
                      } else {
                        setCheckInStep(checkInStep + 1);
                      }
                    }}
                  >
                    Continuer
                  </Button>
                )}
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Édition Réservation pendant Check-in */}
        <Modal isOpen={isEditingVisitor} onClose={handleCancelEditVisitor} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Icon as={FiEdit} color="blue.500" />
                <Text>Modifier la réservation</Text>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={5}>
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <VStack align="flex-start" spacing={0}>
                    <Text fontSize="sm" fontWeight="bold">Modification pendant le check-in</Text>
                    <Text fontSize="xs">
                      Les modifications seront appliquées immédiatement et le montant sera recalculé
                    </Text>
                  </VStack>
                </Alert>

                {selectedVisitor && (
                  <Box w="full" p={3} bg="gray.50" borderRadius="md">
                    <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={1}>Visiteur</Text>
                    <Text fontSize="md" fontWeight="bold">{selectedVisitor.name}</Text>
                    <Text fontSize="xs" color="gray.600">Heure: {selectedVisitor.time}</Text>
                  </Box>
                )}

                <FormControl isRequired>
                  <FormLabel>Type de visite</FormLabel>
                  <Select
                    value={visitorEditForm.type}
                    onChange={(e) => setVisitorEditForm({ ...visitorEditForm, type: e.target.value })}
                  >
                    <option value="Individuel">Individuel</option>
                    <option value="Groupe">Groupe</option>
                  </Select>
                  <FormHelperText>
                    {visitorEditForm.type === 'Groupe' 
                      ? 'Les groupes sont déjà payés par devis' 
                      : 'Visite individuelle avec paiement sur place ou en ligne'}
                  </FormHelperText>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Nombre de personnes</FormLabel>
                  <NumberInput
                    min={1}
                    max={100}
                    value={visitorEditForm.persons}
                    onChange={(valueString) => setVisitorEditForm({ ...visitorEditForm, persons: parseInt(valueString) || 1 })}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <FormHelperText>
                    Montant estimé: {(parseInt(visitorEditForm.persons) || 1) * 12}€ 
                    {visitorEditForm.type === 'Groupe' && ' (déjà réglé par devis)'}
                  </FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>Notes / Observations</FormLabel>
                  <Textarea
                    placeholder="Informations complémentaires sur la réservation..."
                    value={visitorEditForm.notes}
                    onChange={(e) => setVisitorEditForm({ ...visitorEditForm, notes: e.target.value })}
                    rows={3}
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={handleCancelEditVisitor}>
                Annuler
              </Button>
              <Button colorScheme="blue" onClick={handleSaveEditVisitor} leftIcon={<FiCheck />}>
                Enregistrer les modifications
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Agenda */}
        <Modal isOpen={isAgendaOpen} onClose={onAgendaClose} size="2xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Icon as={FiCalendar} color="purple.500" />
                <Text>Agenda des Réservations</Text>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Input type="date" value={new Date().toISOString().split('T')[0]} w="auto" />
                  <HStack>
                    <Badge colorScheme="green">
                      {reservations.filter(r => r.checkedIn).length} Check-ins
                    </Badge>
                    <Badge colorScheme="blue">
                      {reservations.length} Total
                    </Badge>
                  </HStack>
                </HStack>

                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Heure</Th>
                      <Th>Nom</Th>
                      <Th>Type</Th>
                      <Th>Pers.</Th>
                      <Th>Statut</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {reservations.map((res) => (
                      <Tr key={res.id} bg={res.checkedIn ? 'green.50' : 'white'}>
                        <Td fontWeight="medium">{res.time}</Td>
                        <Td>{res.name}</Td>
                        <Td>
                          <Badge colorScheme={res.type === 'Individuel' ? 'blue' : 'purple'} size="sm">
                            {res.type}
                          </Badge>
                        </Td>
                        <Td>{res.persons}</Td>
                        <Td>
                          <Badge 
                            colorScheme={
                              res.checkedIn ? 'green' : 
                              res.status === 'Confirmé' ? 'green' : 'orange'
                            }
                            size="sm"
                          >
                            {res.status}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="purple" onClick={onAgendaClose}>
                Fermer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Vente de Billets */}
        <Modal isOpen={isSellTicketOpen} onClose={onSellTicketClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Icon as={FiCreditCard} color="green.500" />
                <Text>Vente de Billets</Text>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Type de tarif</FormLabel>
                  <Select
                    value={ticketSaleForm.ticketType}
                    onChange={(e) => setTicketSaleForm({ ...ticketSaleForm, ticketType: e.target.value })}
                  >
                    <option value="plein">Tarif Plein - 12€</option>
                    <option value="reduit">Tarif Réduit - 8€</option>
                    <option value="enfant">Tarif Enfant - 5€</option>
                    <option value="groupe">Tarif Groupe - 10€/pers</option>
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Nombre de billets</FormLabel>
                  <Input
                    type="number"
                    min={1}
                    value={ticketSaleForm.quantity}
                    onChange={(e) => setTicketSaleForm({ ...ticketSaleForm, quantity: parseInt(e.target.value) || 1 })}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Moyen de paiement</FormLabel>
                  <Select
                    value={ticketSaleForm.paymentMethod}
                    onChange={(e) => setTicketSaleForm({ ...ticketSaleForm, paymentMethod: e.target.value })}
                  >
                    <option value="CB">Carte Bancaire</option>
                    <option value="Espèces">Espèces</option>
                    <option value="Chèque">Chèque</option>
                  </Select>
                </FormControl>

                <Card bg="blue.50" w="full">
                  <CardBody>
                    <VStack align="flex-start" spacing={2}>
                      <Text fontSize="sm" color="gray.600">Total à encaisser :</Text>
                      <Heading size="lg" color="blue.700">
                        {ticketSaleForm.ticketType === 'plein' ? ticketSaleForm.quantity * 12 :
                         ticketSaleForm.ticketType === 'reduit' ? ticketSaleForm.quantity * 8 :
                         ticketSaleForm.ticketType === 'enfant' ? ticketSaleForm.quantity * 5 :
                         ticketSaleForm.quantity * 10}€
                      </Heading>
                      <Text fontSize="xs" color="gray.600">
                        {ticketSaleForm.quantity} billet{ticketSaleForm.quantity > 1 ? 's' : ''}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onSellTicketClose}>
                Annuler
              </Button>
              <Button colorScheme="green" onClick={handleSellTicket}>
                Confirmer la vente
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    );
  };

  // Rendu Tarification
  const renderTicketPricing = () => {
    return (
      <VStack spacing={8} align="stretch">
        {/* Carte héro avec gradient RBE */}
        <Card
          bgGradient="linear(to-r, rbe.500, rbe.600)"
          color="white"
          borderRadius="xl"
          overflow="hidden"
          position="relative"
        >
          <CardBody p={8}>
            <HStack justify="space-between" align="flex-start">
              <VStack align="flex-start" spacing={2}>
                <HStack>
                  <Icon as={FiDollarSign} boxSize={8} />
                  <Heading size="xl">Tarification des Billets</Heading>
                </HStack>
                <Text fontSize="lg" opacity={0.9}>
                  Configuration des prix d'entrée et des tarifs spéciaux
                </Text>
              </VStack>
              <Badge
                bg="white"
                color="rbe.500"
                fontSize="md"
                px={4}
                py={2}
                borderRadius="full"
                fontWeight="bold"
              >
                {ticketPrices.filter(p => p.active).length} tarifs actifs
              </Badge>
            </HStack>
          </CardBody>
        </Card>

        {/* Informations importantes */}
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <VStack align="flex-start" spacing={1}>
            <Text fontWeight="medium">Oui, c'est payant !</Text>
            <Text fontSize="sm">
              Les visiteurs doivent payer leur entrée selon les tarifs configurés ci-dessous.
            </Text>
          </VStack>
        </Alert>

        {/* Liste des tarifs */}
        <Box>
          <Heading size="md" mb={4} color="gray.800">Grille Tarifaire</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {ticketPrices.map((priceItem) => (
              <Card 
                key={priceItem.id}
                bg={priceItem.active ? cardBg : 'gray.100'}
                borderRadius="lg"
                borderWidth="2px"
                borderColor={priceItem.active ? 'rbe.500' : 'gray.300'}
                opacity={priceItem.active ? 1 : 0.6}
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                transition="all 0.3s"
              >
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                      <VStack align="flex-start" spacing={1}>
                        <HStack>
                          <Heading size="md" color={priceItem.active ? 'black' : 'gray.600'}>
                            {priceItem.label}
                          </Heading>
                          {!priceItem.active && (
                            <Badge colorScheme="gray">Désactivé</Badge>
                          )}
                        </HStack>
                        <Text fontSize="sm" color="gray.600">{priceItem.description}</Text>
                      </VStack>
                      <Heading size="2xl" color="rbe.500">{priceItem.price}€</Heading>
                    </HStack>

                    <Divider />

                    <HStack spacing={3}>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<FiEdit />}
                        onClick={() => handleEditPrice(priceItem)}
                        flex={1}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        colorScheme={priceItem.active ? 'orange' : 'green'}
                        leftIcon={<Icon as={priceItem.active ? FiTrash2 : FiCheckCircle} />}
                        onClick={() => handleTogglePriceActive(priceItem.id)}
                        flex={1}
                      >
                        {priceItem.active ? 'Désactiver' : 'Activer'}
                      </Button>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* Section Réductions */}
        <Box>
          <HStack justify="space-between" mb={4}>
            <Heading size="md" color="gray.800">Réductions Disponibles</Heading>
            <Button 
              colorScheme="green" 
              leftIcon={<FiPlus />} 
              size="sm"
              onClick={() => {
                setEditingDiscount(null);
                setDiscountForm({ 
                  name: '', 
                  type: 'percentage', 
                  value: 0, 
                  conditions: '', 
                  active: true, 
                  onlineAvailable: false, 
                  appliedTo: [] 
                });
                onDiscountEditOpen();
              }}
            >
              Nouvelle réduction
            </Button>
          </HStack>

          <Alert status="info" borderRadius="lg" mb={4}>
            <AlertIcon />
            <VStack align="flex-start" spacing={1}>
              <Text fontWeight="medium">Vérification de l'éligibilité</Text>
              <Text fontSize="sm">
                Les réductions sont applicables sur place et en ligne (si activées). L'éligibilité doit être vérifiée lors du parcours de réservation.
              </Text>
            </VStack>
          </Alert>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {discounts.map((discount) => (
              <Card 
                key={discount.id}
                bg={discount.active ? cardBg : 'gray.100'}
                borderRadius="lg"
                borderWidth="2px"
                borderColor={discount.active ? 'green.500' : 'gray.300'}
                opacity={discount.active ? 1 : 0.6}
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                transition="all 0.3s"
              >
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                      <VStack align="flex-start" spacing={1}>
                        <HStack>
                          <Heading size="md" color={discount.active ? 'black' : 'gray.600'}>
                            {discount.name}
                          </Heading>
                          {!discount.active && (
                            <Badge colorScheme="gray">Désactivée</Badge>
                          )}
                          {discount.onlineAvailable && (
                            <Badge colorScheme="blue">En ligne</Badge>
                          )}
                        </HStack>
                        <Text fontSize="sm" color="gray.600">{discount.conditions}</Text>
                      </VStack>
                      <VStack>
                        <Heading size="2xl" color="green.500">
                          {discount.type === 'percentage' ? `-${discount.value}%` : `-${discount.value}€`}
                        </Heading>
                        <Text fontSize="xs" color="gray.500">
                          {discount.type === 'percentage' ? 'Pourcentage' : 'Montant fixe'}
                        </Text>
                      </VStack>
                    </HStack>

                    <Divider />

                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={2}>Applicable sur :</Text>
                      <HStack spacing={2} flexWrap="wrap">
                        {discount.appliedTo.map(tariffId => {
                          const tariff = ticketPrices.find(t => t.id === tariffId);
                          return tariff ? (
                            <Badge key={tariffId} colorScheme="purple" variant="subtle">
                              {tariff.label}
                            </Badge>
                          ) : null;
                        })}
                        {discount.appliedTo.length === 0 && (
                          <Text fontSize="sm" color="gray.500" fontStyle="italic">Aucun tarif sélectionné</Text>
                        )}
                      </HStack>
                    </Box>

                    <Divider />

                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<FiEdit />}
                        onClick={() => handleEditDiscount(discount)}
                        flex={1}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        colorScheme={discount.active ? 'orange' : 'green'}
                        onClick={() => handleToggleDiscountActive(discount.id)}
                        flex={1}
                      >
                        {discount.active ? 'Désactiver' : 'Activer'}
                      </Button>
                      <IconButton
                        size="sm"
                        colorScheme="red"
                        icon={<FiTrash2 />}
                        onClick={() => handleDeleteDiscount(discount.id)}
                      />
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* Statistiques des tarifs */}
        <Box>
          <Heading size="md" mb={4} color="gray.800">Statistiques de Vente</Heading>
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
            <Card bg={cardBg} borderRadius="lg">
              <CardBody>
                <VStack align="flex-start" spacing={2}>
                  <Text fontSize="sm" color="gray.600" fontWeight="medium">Tarif le plus vendu</Text>
                  <Heading size="lg" color="black">Tarif Plein</Heading>
                  <Badge colorScheme="rbe" variant="subtle">42% des ventes</Badge>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={cardBg} borderRadius="lg">
              <CardBody>
                <VStack align="flex-start" spacing={2}>
                  <Text fontSize="sm" color="gray.600" fontWeight="medium">Prix moyen</Text>
                  <Heading size="lg" color="black">9.80€</Heading>
                  <Badge colorScheme="blue" variant="subtle">Par visiteur</Badge>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={cardBg} borderRadius="lg">
              <CardBody>
                <VStack align="flex-start" spacing={2}>
                  <Text fontSize="sm" color="gray.600" fontWeight="medium">Recettes du mois</Text>
                  <Heading size="lg" color="black">12,450€</Heading>
                  <Badge colorScheme="green" variant="subtle">+18% vs mois dernier</Badge>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={cardBg} borderRadius="lg">
              <CardBody>
                <VStack align="flex-start" spacing={2}>
                  <Text fontSize="sm" color="gray.600" fontWeight="medium">Billets vendus</Text>
                  <Heading size="lg" color="black">1,247</Heading>
                  <Badge colorScheme="purple" variant="subtle">Ce mois-ci</Badge>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Options avancées */}
        <Box>
          <Heading size="md" mb={4} color="gray.800">Options Avancées</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Card 
              bg={cardBg} 
              borderRadius="lg"
              _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              transition="all 0.3s"
              cursor="pointer"
            >
              <CardBody textAlign="center">
                <Icon as={FiPlus} boxSize={8} color="blue.500" mb={3} />
                <Heading size="sm" mb={2}>Créer un Tarif</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Ajouter une nouvelle catégorie de prix
                </Text>
                <Button 
                  colorScheme="blue" 
                  size="sm" 
                  variant="outline" 
                  w="full"
                  onClick={() => {
                    setEditingPrice(null);
                    setPriceForm({ label: '', price: 0, description: '', active: true });
                    onPriceEditOpen();
                  }}
                >
                  Créer
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
                <Icon as={FiBarChart2} boxSize={8} color="green.500" mb={3} />
                <Heading size="sm" mb={2}>Historique des Prix</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Consulter l'évolution tarifaire
                </Text>
                <Button colorScheme="green" size="sm" variant="outline" w="full">
                  Voir l'historique
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
                <Icon as={FiFileText} boxSize={8} color="purple.500" mb={3} />
                <Heading size="sm" mb={2}>Exporter les Tarifs</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Télécharger la grille tarifaire
                </Text>
                <Button colorScheme="purple" size="sm" variant="outline" w="full">
                  Exporter PDF
                </Button>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Modal Édition/Création Tarif */}
        <Modal isOpen={isPriceEditOpen} onClose={onPriceEditClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Icon as={editingPrice ? FiEdit : FiPlus} color="blue.500" />
                <Text>{editingPrice ? 'Modifier le Tarif' : 'Créer un Tarif'}</Text>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nom du tarif</FormLabel>
                  <Input
                    placeholder="Ex: Tarif Étudiant"
                    value={priceForm.label}
                    onChange={(e) => setPriceForm({ ...priceForm, label: e.target.value })}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Prix (€)</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="0.00"
                    value={priceForm.price}
                    onChange={(e) => setPriceForm({ ...priceForm, price: parseFloat(e.target.value) || 0 })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    placeholder="Conditions d'application du tarif..."
                    value={priceForm.description}
                    onChange={(e) => setPriceForm({ ...priceForm, description: e.target.value })}
                    rows={3}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <FormLabel mb={0}>Tarif actif</FormLabel>
                  <Checkbox
                    isChecked={priceForm.active}
                    onChange={(e) => setPriceForm({ ...priceForm, active: e.target.checked })}
                  />
                </FormControl>

                <Card bg="blue.50" w="full">
                  <CardBody>
                    <VStack align="flex-start" spacing={2}>
                      <Text fontSize="sm" color="gray.600">Aperçu :</Text>
                      <Heading size="md" color="blue.700">
                        {priceForm.label || 'Nom du tarif'} - {priceForm.price}€
                      </Heading>
                      <Text fontSize="sm" color="gray.600">
                        {priceForm.description || 'Sans description'}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onPriceEditClose}>
                Annuler
              </Button>
              <Button colorScheme="blue" onClick={handleSavePrice}>
                {editingPrice ? 'Enregistrer' : 'Créer'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Édition/Création Réduction */}
        <Modal isOpen={isDiscountEditOpen} onClose={onDiscountEditClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Icon as={FiPercent} color="green.500" />
                <Text>{editingDiscount ? 'Modifier la Réduction' : 'Nouvelle Réduction'}</Text>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nom de la réduction</FormLabel>
                  <Input
                    placeholder="Ex: Étudiant, Senior, Famille nombreuse..."
                    value={discountForm.name}
                    onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                  />
                </FormControl>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>Type de réduction</FormLabel>
                    <Select
                      value={discountForm.type}
                      onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}
                    >
                      <option value="percentage">Pourcentage (%)</option>
                      <option value="fixed">Montant fixe (€)</option>
                    </Select>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Valeur</FormLabel>
                    <Input
                      type="number"
                      min={0}
                      step={discountForm.type === 'percentage' ? 1 : 0.5}
                      max={discountForm.type === 'percentage' ? 100 : undefined}
                      placeholder={discountForm.type === 'percentage' ? '0-100' : '0.00'}
                      value={discountForm.value}
                      onChange={(e) => setDiscountForm({ ...discountForm, value: parseFloat(e.target.value) || 0 })}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl isRequired>
                  <FormLabel>Conditions d'éligibilité</FormLabel>
                  <Textarea
                    placeholder="Ex: Carte étudiante valide, Âge 65 ans et plus, etc..."
                    value={discountForm.conditions}
                    onChange={(e) => setDiscountForm({ ...discountForm, conditions: e.target.value })}
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Applicable sur les tarifs :</FormLabel>
                  <VStack align="flex-start" spacing={2}>
                    {ticketPrices.map(price => (
                      <Checkbox
                        key={price.id}
                        isChecked={discountForm.appliedTo.includes(price.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDiscountForm({ 
                              ...discountForm, 
                              appliedTo: [...discountForm.appliedTo, price.id] 
                            });
                          } else {
                            setDiscountForm({ 
                              ...discountForm, 
                              appliedTo: discountForm.appliedTo.filter(id => id !== price.id) 
                            });
                          }
                        }}
                      >
                        {price.label} ({price.price}€)
                      </Checkbox>
                    ))}
                  </VStack>
                </FormControl>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb={0}>Réduction active</FormLabel>
                    <Checkbox
                      isChecked={discountForm.active}
                      onChange={(e) => setDiscountForm({ ...discountForm, active: e.target.checked })}
                    />
                  </FormControl>

                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb={0}>Disponible en ligne</FormLabel>
                    <Checkbox
                      isChecked={discountForm.onlineAvailable}
                      onChange={(e) => setDiscountForm({ ...discountForm, onlineAvailable: e.target.checked })}
                    />
                  </FormControl>
                </SimpleGrid>

                {!discountForm.onlineAvailable && (
                  <Alert status="warning" variant="subtle" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                      Cette réduction ne sera disponible qu'à la station d'accueil (vente sur place)
                    </Text>
                  </Alert>
                )}

                {discountForm.onlineAvailable && (
                  <Alert status="info" variant="subtle" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                      L'éligibilité devra être vérifiée lors de la réservation en ligne
                    </Text>
                  </Alert>
                )}

                <Card bg="green.50" w="full">
                  <CardBody>
                    <VStack align="flex-start" spacing={2}>
                      <Text fontSize="sm" color="gray.600">Aperçu :</Text>
                      <Heading size="md" color="green.700">
                        {discountForm.name || 'Nom de la réduction'}
                      </Heading>
                      <HStack>
                        <Badge colorScheme="green" fontSize="md">
                          {discountForm.type === 'percentage' 
                            ? `-${discountForm.value}%` 
                            : `-${discountForm.value}€`}
                        </Badge>
                        {discountForm.onlineAvailable && (
                          <Badge colorScheme="blue">Disponible en ligne</Badge>
                        )}
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        {discountForm.conditions || 'Sans conditions'}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onDiscountEditClose}>
                Annuler
              </Button>
              <Button colorScheme="green" onClick={handleSaveDiscount}>
                {editingDiscount ? 'Mettre à jour' : 'Créer'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
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