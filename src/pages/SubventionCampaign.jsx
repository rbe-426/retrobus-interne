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
  AlertTitle,
  AlertDescription,
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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormHelperText,
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
import { FiAward, FiCheckCircle, FiFileText, FiClock, FiDollarSign, FiUsers, FiRefreshCw, FiMail, FiUpload, FiTrash2, FiHome, FiBarChart2, FiInfo, FiHelpCircle, FiPlus, FiEdit, FiArchive, FiCalendar, FiShoppingBag, FiBook, FiImage, FiPackage, FiTrendingUp, FiCreditCard, FiGift, FiLayers, FiPercent, FiX, FiSearch, FiShield, FiCheck, FiLogIn, FiUserCheck, FiGlobe, FiPhone, FiUser, FiLock } from 'react-icons/fi';
import { subventionAPI } from '../api/subventionClient.js';
import { ticketingAPI } from '../api/ticketing.js';
import { museumAPI } from '../api/museum.js';
import { stocksAPI } from '../api/stocks.js';
import { useUserRoles } from '../hooks/useUserRoles';
import { useUser } from '../context/UserContext';
import SubventionStats from '../components/Subventions/SubventionStats';
import KpiCard from '../components/Subventions/KpiCard';

const EXPENSE_CATEGORIES = ['FUEL', 'MAINTENANCE', 'INSURANCE', 'MATERIAL', 'ADMINISTRATIVE', 'OTHER'];

export default function SubventionCampaign() {
  // Utilisateur connecté
  const { user: currentUser } = useUser();
  
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
  const { isOpen: isReservationDetailOpen, onOpen: onReservationDetailOpen, onClose: onReservationDetailClose } = useDisclosure();
  const [selectedReservation, setSelectedReservation] = useState(null);
  const { isOpen: isPriceEditOpen, onOpen: onPriceEditOpen, onClose: onPriceEditClose } = useDisclosure();
  const { isOpen: isDiscountEditOpen, onOpen: onDiscountEditOpen, onClose: onDiscountEditClose } = useDisclosure();

  // États pour la tarification des billets
  const [ticketPrices, setTicketPrices] = useState([
    { id: 'plein', name: 'Adulte', label: 'Adulte', price: 25, description: 'Adulte sans réduction', active: true },
    { id: 'reduit', name: 'Jeunesse / Étudiant', label: 'Jeunesse / Étudiant', price: 15, description: 'Étudiants, demandeurs d\'emploi de moins de 26 ans (14-26)', active: true },
    { id: 'enfant', name: 'Enfant -14 ans', label: 'Enfant -14 ans', price: 5, description: 'Enfants de 0 à 13 ans', active: true },
    { id: 'groupe', name: 'Tarif Groupe', label: 'Tarif Groupe', price: 10, description: 'À partir de 10 personnes', active: false },
    { id: 'famille', name: 'Pass Famille', label: 'Pass Famille', price: 28, description: '2 adultes + 2 enfants', active: false },
    { id: 'annuel', name: 'Abonnement Annuel', label: 'Abonnement Annuel', price: 80, description: 'Accès illimité pendant 1 an', active: false }
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
      active: false,
      onlineAvailable: false,
      appliedTo: ['plein']
    },
    { 
      id: 'senior', 
      name: 'Senior +65', 
      type: 'percentage', 
      value: 25, 
      conditions: 'Âge 65 ans et plus', 
      active: false,
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
      active: false,
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
      bookingChannel: 'online',
      ticketType: 'plein',
      notes: 'Le visiteur a indiqué être bénéficiaire ou ayant droit d\'un RSA - Vérification des documents requise',
      discount: 'rsa',
      visitors: [
        { name: 'Sophie Dubois', ticketType: 'plein', discount: 'rsa', hasStudentCard: false, notes: 'Bénéficiaire RSA' }
      ]
    },
    { 
      id: 2, 
      time: '09:30', 
      name: 'Lefebvre Karim', 
      type: 'Individuel', 
      persons: 3, 
      status: 'Confirmé', 
      checkedIn: false,
      bookingChannel: 'online',
      notes: 'Famille avec 2 enfants',
      visitors: [
        { name: 'Karim Lefebvre', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '' },
        { name: 'Fatima Lefebvre', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '' },
        { name: 'Yasmine Lefebvre', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '12 ans' }
      ]
    },
    { 
      id: 4, 
      time: '10:45', 
      name: 'Martinez Elena',
      type: 'Individuel', 
      persons: 1, 
      status: 'Confirmé', 
      checkedIn: false,
      bookingChannel: 'phone',
      ticketType: 'reduit',
      hasStudentCard: true,
      notes: 'Pièce d\'identité au nom de "Elena Rodriguez-Martinez" - Vérifier correspondance',
      paymentValidated: true,
      paymentDetails: {
        amount: 15.00,
        originalAmount: 15.00,
        discountAmount: 0,
        method: 'CB',
        timestamp: '2026-05-14T10:50:00.000Z',
        validatedBy: 'Personnel Accueil'
      },
      visitors: [
        { name: 'Elena Martinez', ticketType: 'reduit', discount: null, hasStudentCard: true, notes: 'Étudiante' }
      ]
    },
    { 
      id: 5, 
      time: '11:15', 
      name: 'Petit Alexandre', 
      type: 'Individuel', 
      persons: 1, 
      status: 'En attente', 
      checkedIn: false,
      bookingChannel: 'online',
      ticketType: 'plein',
      notes: 'Le visiteur a indiqué être bénéficiaire ou ayant droit d\'un RSA - Vérification des documents requise',
      visitors: []
    },
    { 
      id: 6, 
      time: '13:30', 
      name: 'Nguyen Linh', 
      type: 'Individuel', 
      persons: 1, 
      status: 'Confirmé', 
      checkedIn: false,
      bookingChannel: 'online',
      ticketType: 'reduit',
      hasStudentCard: true,
      notes: 'Étudiante à Paris-Saclay - Carte étudiante 2025-2026',
      visitors: [
        { name: 'Linh Nguyen', ticketType: 'reduit', discount: null, hasStudentCard: true, notes: 'Paris-Saclay' }
      ]
    },
    { 
      id: 7, 
      time: '14:00', 
      name: 'Moreau Gérard', 
      type: 'Individuel', 
      persons: 2, 
      status: 'Confirmé', 
      checkedIn: false,
      bookingChannel: 'phone',
      ticketType: 'plein',
      notes: 'Couple - 2 adultes',
      paymentValidated: true,
      paymentDetails: {
        amount: 50.00,
        originalAmount: 50.00,
        discountAmount: 0,
        method: 'CB',
        timestamp: '2026-05-15T14:05:00.000Z',
        validatedBy: 'Personnel Accueil'
      },
      visitors: [
        { name: 'Gérard Moreau', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '72 ans' },
        { name: 'Michèle Moreau', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '68 ans' }
      ]
    },
    { 
      id: 8, 
      time: '14:30', 
      name: 'Famille Bernard', 
      type: 'Individuel', 
      persons: 5, 
      status: 'Confirmé', 
      checkedIn: false,
      bookingChannel: 'walkin',
      ticketType: 'plein',
      notes: 'Famille avec 3 enfants - 2 adultes, 1 étudiant, 2 enfants',
      paymentValidated: true,
      paymentDetails: {
        amount: 65.00,
        originalAmount: 65.00,
        discountAmount: 0,
        method: 'CB',
        timestamp: '2026-05-14T14:35:00.000Z',
        validatedBy: 'Personnel Accueil'
      },
      visitors: [
        { name: 'Patrick Bernard', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '' },
        { name: 'Sophie Bernard', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '' },
        { name: 'Lucas Bernard', ticketType: 'reduit', discount: null, hasStudentCard: true, notes: '18 ans - étudiant' },
        { name: 'Emma Bernard', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '12 ans' },
        { name: 'Noah Bernard', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '9 ans' }
      ]
    },
    { 
      id: 9, 
      time: '15:00', 
      name: 'Rousseau Thomas', 
      type: 'Individuel', 
      persons: 3, 
      status: 'Confirmé', 
      checkedIn: false,
      bookingChannel: 'online',
      ticketType: 'enfant',
      notes: '3 enfants (7, 9 et 11 ans) - Sortie familiale',
      paymentValidated: true,
      paymentDetails: {
        amount: 15.00,
        originalAmount: 15.00,
        discountAmount: 0,
        method: 'CB',
        timestamp: '2026-05-13T09:20:00.000Z',
        validatedBy: 'Paiement en ligne'
      },
      visitors: [
        { name: 'Léa Rousseau', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '7 ans' },
        { name: 'Tom Rousseau', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '9 ans' },
        { name: 'Clara Rousseau', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '11 ans' }
      ]
    },
    { 
      id: 10,
      time: '15:30', 
      name: 'Durand Marie', 
      type: 'Individuel', 
      persons: 2, 
      status: 'Confirmé', 
      checkedIn: false,
      bookingChannel: 'phone',
      ticketType: 'plein',
      notes: '2 adultes',
      paymentValidated: true,
      paymentDetails: {
        amount: 50.00,
        originalAmount: 50.00,
        discountAmount: 0,
        method: 'Espèces',
        timestamp: '2026-05-15T15:35:00.000Z',
        validatedBy: 'Personnel Accueil'
      },
      visitors: [
        { name: 'Marie Durand', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '' },
        { name: 'Paul Durand', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '' }
      ]
    },
    { 
      id: 11, 
      time: '16:00', 
      name: 'Lambert Julie', 
      type: 'Individuel', 
      persons: 1, 
      status: 'Confirmé', 
      checkedIn: true,
      bookingChannel: 'online',
      ticketType: 'plein',
      notes: 'Check-in effectué à 16:02',
      tickets: [{ type: 'plein', quantity: 1, price: 25 }],
      paymentMethod: 'CB',
      paymentValidated: true,
      paymentDetails: {
        amount: 25.00,
        originalAmount: 25.00,
        discountAmount: 0,
        method: 'CB',
        timestamp: '2026-05-16T16:01:00.000Z',
        validatedBy: 'Personnel Accueil'
      },
      visitors: [
        { name: 'Julie Lambert', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '' }
      ]
    },
    { 
      id: 12, 
      time: '16:30', 
      name: 'Fontaine Marc', 
      type: 'Individuel', 
      persons: 1, 
      status: 'Confirmé', 
      checkedIn: false,
      bookingChannel: 'online',
      ticketType: 'plein',
      notes: 'Visiteur adulte',
      visitors: [
        { name: 'Marc Fontaine', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '' }
      ]
    },
    // Réservations supplémentaires pour atteindre les statistiques de vente
    { 
      id: 13, 
      time: '09:15', 
      name: 'Groupe Scolaire St-Michel', 
      type: 'Individuel', 
      persons: 12, 
      status: 'Confirmé', 
      checkedIn: false,
      bookingChannel: 'phone',
      ticketType: 'enfant',
      notes: 'Sortie scolaire - 12 enfants',
      paymentValidated: true,
      paymentDetails: {
        amount: 115.00,
        originalAmount: 115.00,
        discountAmount: 0,
        method: 'Chèque',
        timestamp: '2026-05-12T16:30:00.000Z',
        validatedBy: 'Personnel Accueil'
      },
      visitors: [
        { name: 'Élève 1', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' },
        { name: 'Élève 2', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' },
        { name: 'Élève 3', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' },
        { name: 'Élève 4', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' },
        { name: 'Élève 5', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' },
        { name: 'Élève 6', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' },
        { name: 'Élève 7', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' },
        { name: 'Élève 8', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' },
        { name: 'Élève 9', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' },
        { name: 'Élève 10', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' },
        { name: 'Élève 11', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' },
        { name: 'Élève 12', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8-12 ans' }
      ],
      email: 'ecole.stmichel@example.com',
      phone: '01 69 12 34 56'
    },
    { 
      id: 14, 
      time: '11:00', 
      name: 'Famille Chen', 
      type: 'Individuel', 
      persons: 4, 
      status: 'Confirmé', 
      checkedIn: false,
      bookingChannel: 'online',
      ticketType: 'plein',
      notes: 'Famille - 2 adultes, 2 enfants',
      paymentValidated: true,
      paymentDetails: {
        amount: 60.00,
        originalAmount: 60.00,
        discountAmount: 0,
        method: 'CB',
        timestamp: '2026-05-11T20:15:00.000Z',
        validatedBy: 'Paiement en ligne'
      },
      visitors: [
        { name: 'Wei Chen', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '' },
        { name: 'Li Chen', ticketType: 'plein', discount: null, hasStudentCard: false, notes: '' },
        { name: 'Mei Chen', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '10 ans' },
        { name: 'Jin Chen', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '8 ans' }
      ],
      email: 'chen.wei@example.com',
      phone: '06 45 67 89 01'
    },
    { 
      id: 15, 
      time: '13:00', 
      name: 'Groupe Jeunes Martin', 
      type: 'Individuel', 
      persons: 8, 
      status: 'Confirmé', 
      checkedIn: false,
      bookingChannel: 'walkin',
      ticketType: 'enfant',
      notes: '8 enfants - anniversaire',
      paymentValidated: true,
      paymentDetails: {
        amount: 32.00,
        originalAmount: 32.00,
        discountAmount: 0,
        method: 'CB',
        timestamp: '2026-05-16T13:05:00.000Z',
        validatedBy: 'Personnel Accueil'
      },
      visitors: [
        { name: 'Lucas Martin', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '9 ans - anniversaire' },
        { name: 'Ami 1', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '9-11 ans' },
        { name: 'Ami 2', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '9-11 ans' },
        { name: 'Ami 3', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '9-11 ans' },
        { name: 'Ami 4', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '9-11 ans' },
        { name: 'Ami 5', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '9-11 ans' },
        { name: 'Ami 6', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '9-11 ans' },
        { name: 'Ami 7', ticketType: 'enfant', discount: null, hasStudentCard: false, notes: '9-11 ans' }
      ],
      email: 'martin.lucas@example.com',
      phone: '06 23 45 67 89'
    }
  ]);
  const [reservationForm, setReservationForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    type: 'Individuel',
    persons: 1,
    ticketType: 'plein',
    discount: null,
    bookingChannel: 'walkin',
    hasStudentCard: false,
    notes: '',
    visitors: [], // Liste détaillée des visiteurs { name, ticketType, discount, hasStudentCard, notes }
    tickets: [] // { type: 'plein', quantity: 1, price: 12 }
  });
  const [checkInSearch, setCheckInSearch] = useState('');
  
  // États pour la gestion détaillée des visiteurs
  const { isOpen: isVisitorsModalOpen, onOpen: onVisitorsModalOpen, onClose: onVisitorsModalClose } = useDisclosure();
  const [visitorsStep, setVisitorsStep] = useState(1); // 1: Liste, 2: Ajout/Édition
  const [editingVisitorIndex, setEditingVisitorIndex] = useState(null);
  const [visitorForm, setVisitorForm] = useState({
    name: '',
    ticketType: 'plein',
    discount: null,
    hasStudentCard: false,
    notes: ''
  });
  
  // États pour le parcours de check-in (4 étapes)
  const [checkInStep, setCheckInStep] = useState(1); // 1: Identification, 2: Vérification, 3: Application, 4: Entrée
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [isEditingVisitor, setIsEditingVisitor] = useState(false);
  const [visitorEditForm, setVisitorEditForm] = useState({
    persons: 1,
    type: 'Individuel',
    ticketType: 'plein',
    modificationReason: '',
    tickets: [],
    notes: ''
  });
  const [checkInVerification, setCheckInVerification] = useState({
    identityVerified: false,
    studentCardVerified: false,
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

  // États pour les codes promotionnels
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeValidation, setPromoCodeValidation] = useState({
    isValidating: false,
    isValid: false,
    code: null,
    error: null
  });
  const [promoCodes, setPromoCodes] = useState([]);
  const [internalCodes, setInternalCodes] = useState([]);
  const [codeForm, setCodeForm] = useState({
    code: '',
    name: '',
    type: 'percentage',
    value: 0,
    description: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    maxUses: null,
    restrictedTo: [],
    conditions: ''
  });
  const { isOpen: isCodeFormOpen, onOpen: onCodeFormOpen, onClose: onCodeFormClose } = useDisclosure();
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [isInternalCode, setIsInternalCode] = useState(false);

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
      const [typesData, statsData, weeklyData, discountsData, promoCodesData, internalCodesData] = await Promise.all([
        ticketingAPI.getTicketTypes().catch(() => []),
        ticketingAPI.getStats().catch(() => null),
        ticketingAPI.getWeeklyStats().catch(() => []),
        ticketingAPI.getDiscounts().catch(() => []),
        ticketingAPI.getPromoCodes().catch(() => []),
        ticketingAPI.getInternalCodes().catch(() => [])
      ]);
      setTicketTypes(Array.isArray(typesData) ? typesData : []);
      
      // Charger les tarifs avec priorité localStorage > API
      let finalPrices = [];
      
      // 1. Essayer de charger depuis localStorage
      try {
        const stored = localStorage.getItem('museum_ticket_prices');
        if (stored) {
          const storedPrices = JSON.parse(stored);
          if (Array.isArray(storedPrices) && storedPrices.length > 0) {
            finalPrices = storedPrices;
            console.log('💾 Tarifs chargés depuis localStorage:', finalPrices.length);
          }
        }
      } catch (err) {
        console.warn('Impossible de charger les tarifs depuis localStorage:', err);
      }
      
      // 2. Si pas de localStorage, utiliser l'API
      if (finalPrices.length === 0 && Array.isArray(typesData) && typesData.length > 0) {
        finalPrices = typesData.map(t => ({
          id: t.id,
          name: t.name || t.label,
          label: t.label || t.name,
          price: t.price,
          description: t.description,
          active: t.active !== undefined ? t.active : true
        }));
        console.log('🌐 Tarifs chargés depuis API:', finalPrices.length);
        
        // Sauvegarder en localStorage pour la prochaine fois
        try {
          localStorage.setItem('museum_ticket_prices', JSON.stringify(finalPrices));
        } catch (err) {
          console.warn('Impossible de sauvegarder en localStorage:', err);
        }
      }
      
      if (finalPrices.length > 0) {
        setTicketPrices(finalPrices);
      }

      // Charger les réductions avec priorité localStorage > API
      let finalDiscounts = [];
      
      // 1. Essayer de charger depuis localStorage
      try {
        const stored = localStorage.getItem('museum_discounts');
        if (stored) {
          const storedDiscounts = JSON.parse(stored);
          if (Array.isArray(storedDiscounts) && storedDiscounts.length > 0) {
            finalDiscounts = storedDiscounts;
            console.log('💾 Réductions chargées depuis localStorage:', finalDiscounts.length);
          }
        }
      } catch (err) {
        console.warn('Impossible de charger les réductions depuis localStorage:', err);
      }
      
      // 2. Si pas de localStorage, utiliser l'API
      if (finalDiscounts.length === 0 && Array.isArray(discountsData) && discountsData.length > 0) {
        finalDiscounts = discountsData;
        console.log('🌐 Réductions chargées depuis API:', finalDiscounts.length);
        
        // Sauvegarder en localStorage pour la prochaine fois
        try {
          localStorage.setItem('museum_discounts', JSON.stringify(finalDiscounts));
        } catch (err) {
          console.warn('Impossible de sauvegarder les réductions en localStorage:', err);
        }
      }
      
      if (finalDiscounts.length > 0) {
        setDiscounts(finalDiscounts);
      }

      // Charger les codes promo et internes avec persistance localStorage
      const promoCodesArray = Array.isArray(promoCodesData) ? promoCodesData : [];
      const internalCodesArray = Array.isArray(internalCodesData) ? internalCodesData : [];
      
      setPromoCodes(promoCodesArray);
      setInternalCodes(internalCodesArray);
      
      // Sauvegarder dans localStorage pour persistance entre rechargements
      try {
        localStorage.setItem('museum_promo_codes', JSON.stringify(promoCodesArray));
        localStorage.setItem('museum_internal_codes', JSON.stringify(internalCodesArray));
        console.log('💾 Codes sauvegardés en localStorage');
      } catch (err) {
        console.warn('Impossible de sauvegarder les codes en localStorage:', err);
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
        
        const updatedPrices = ticketPrices.map(price => 
          price.id === editingPrice.id 
            ? { ...price, ...priceForm, name: priceForm.label }
            : price
        );
        setTicketPrices(updatedPrices);
        
        // Sauvegarder en localStorage pour persistance
        try {
          localStorage.setItem('museum_ticket_prices', JSON.stringify(updatedPrices));
          console.log('💾 Tarifs sauvegardés en localStorage');
        } catch (err) {
          console.warn('Impossible de sauvegarder les tarifs:', err);
        }

        toast({
          title: 'Tarif mis à jour',
          description: `${priceForm.label} modifié avec succès (persisté en localStorage)`,
          status: 'success',
          duration: 3000,
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
        const updatedPrices = [...ticketPrices, newPrice];
        setTicketPrices(updatedPrices);
        
        // Sauvegarder en localStorage pour persistance
        try {
          localStorage.setItem('museum_ticket_prices', JSON.stringify(updatedPrices));
          console.log('💾 Tarifs sauvegardés en localStorage');
        } catch (err) {
          console.warn('Impossible de sauvegarder les tarifs:', err);
        }

        toast({
          title: 'Tarif créé',
          description: `${priceForm.label} ajouté avec succès (persisté en localStorage)`,
          status: 'success',
          duration: 3000,
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

      const updatedPrices = ticketPrices.map(p => 
        p.id === priceId 
          ? { ...p, active: !p.active }
          : p
      );
      setTicketPrices(updatedPrices);
      
      // Sauvegarder en localStorage pour persistance
      try {
        localStorage.setItem('museum_ticket_prices', JSON.stringify(updatedPrices));
        console.log('💾 Tarifs sauvegardés en localStorage (toggle active)');
      } catch (err) {
        console.warn('Impossible de sauvegarder les tarifs:', err);
      }

      toast({
        title: price.active ? 'Tarif désactivé' : 'Tarif activé',
        description: `${price.label} ${price.active ? 'n\'est plus' : 'est maintenant'} disponible (persisté)`,
        status: 'info',
        duration: 3000,
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
        
        const updatedDiscounts = discounts.map(discount => 
          discount.id === editingDiscount.id 
            ? { ...discount, ...discountForm }
            : discount
        );
        setDiscounts(updatedDiscounts);
        
        // Sauvegarder en localStorage
        try {
          localStorage.setItem('museum_discounts', JSON.stringify(updatedDiscounts));
          console.log('💾 Réductions sauvegardées en localStorage');
        } catch (err) {
          console.warn('Impossible de sauvegarder les réductions:', err);
        }
        
        toast({
          title: 'Réduction mise à jour',
          description: `${discountForm.name} modifiée avec succès (persistée)`,
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      } else {
        // Création via API
        const createdDiscount = await ticketingAPI.createDiscount(discountForm);
        
        const newDiscount = {
          id: createdDiscount.id || `discount_${Date.now()}`,
          ...discountForm
        };
        const updatedDiscounts = [...discounts, newDiscount];
        setDiscounts(updatedDiscounts);
        
        // Sauvegarder en localStorage
        try {
          localStorage.setItem('museum_discounts', JSON.stringify(updatedDiscounts));
          console.log('💾 Réductions sauvegardées en localStorage');
        } catch (err) {
          console.warn('Impossible de sauvegarder les réductions:', err);
        }
        
        toast({
          title: 'Réduction créée',
          description: `${discountForm.name} ajoutée avec succès (persistée)`,
          status: 'success',
          duration: 3000,
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

      const updatedDiscounts = discounts.map(d => 
        d.id === discountId 
          ? { ...d, active: !d.active }
          : d
      );
      setDiscounts(updatedDiscounts);
      
      // Sauvegarder en localStorage
      try {
        localStorage.setItem('museum_discounts', JSON.stringify(updatedDiscounts));
        console.log('💾 Réductions sauvegardées en localStorage (toggle)');
      } catch (err) {
        console.warn('Impossible de sauvegarder les réductions:', err);
      }

      toast({
        title: discount.active ? 'Réduction désactivée' : 'Réduction activée',
        description: `${discount.name} ${discount.active ? 'n\'est plus' : 'est maintenant'} disponible (persistée)`,
        status: 'info',
        duration: 3000,
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
      
      const updatedDiscounts = discounts.filter(d => d.id !== discountId);
      setDiscounts(updatedDiscounts);
      
      // Sauvegarder en localStorage
      try {
        localStorage.setItem('museum_discounts', JSON.stringify(updatedDiscounts));
        console.log('💾 Réductions sauvegardées en localStorage (delete)');
      } catch (err) {
        console.warn('Impossible de sauvegarder les réductions:', err);
      }
      
      toast({
        title: 'Réduction supprimée',
        description: `${discount.name} a été supprimée (persistée)`,
        status: 'warning',
        duration: 3000,
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
  const handleOpenNewReservation = () => {
    setVisitorsStep(1);
    setReservationForm({
      name: '',
      email: '',
      phone: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      type: 'Individuel',
      persons: 1,
      ticketType: 'plein',
      discount: null,
      bookingChannel: 'walkin',
      hasStudentCard: false,
      visitors: [],
      notes: '',
      tickets: []
    });
    onNewReservationOpen();
  };

  const handleNewReservation = async () => {
    try {
      const newReservation = {
        id: reservations.length + 1,
        time: reservationForm.time,
        name: reservationForm.name,
        type: reservationForm.type,
        persons: reservationForm.visitors.length,
        status: 'Confirmé',
        checkedIn: false,
        email: reservationForm.email,
        phone: reservationForm.phone,
        date: reservationForm.date,
        bookingChannel: reservationForm.bookingChannel,
        visitors: reservationForm.visitors,
        notes: reservationForm.notes
      };

      setReservations([...reservations, newReservation]);
      
      toast({
        title: 'Réservation créée',
        description: `Réservation pour ${reservationForm.name} avec ${reservationForm.visitors.length} visiteur(s)`,
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
        ticketType: 'plein',
        discount: null,
        bookingChannel: 'walkin',
        hasStudentCard: false,
        visitors: [],
        notes: '',
        tickets: []
      });
      
      setVisitorsStep(1);
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
    
    // Calculer le montant basé sur les visiteurs détaillés ou le tarif global
    let totalAmount;
    
    if (visitor.visitors && visitor.visitors.length > 0) {
      // Nouveau système : calculer à partir des visiteurs détaillés
      totalAmount = visitor.visitors.reduce((sum, v) => {
        const tariff = ticketPrices.find(t => t.id === v.ticketType);
        const basePrice = tariff?.price || 0;
        return sum + basePrice;
      }, 0);
    } else if (visitor.tickets && visitor.tickets.length > 0) {
      // Ancien système : calculer à partir des billets
      totalAmount = visitor.tickets.reduce((sum, t) => sum + (t.quantity * t.price), 0);
    } else {
      // Fallback : calculer avec le tarif et le nombre de personnes
      let unitPrice = 25; // Prix par défaut (Adulte)
      if (visitor.ticketType) {
        const selectedTicket = ticketPrices.find(t => t.id === visitor.ticketType);
        if (selectedTicket) {
          unitPrice = selectedTicket.price;
        }
      }
      totalAmount = visitor.persons * unitPrice;
    }

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
      studentCardVerified: false,
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
      ticketType: selectedVisitor.ticketType || 'plein',
      modificationReason: '',
      tickets: selectedVisitor.tickets || [],
      notes: selectedVisitor.notes || ''
    });
    setIsEditingVisitor(true);
  };

  // ============================================
  // FONCTIONS CODES PROMOTIONNELS
  // ============================================

  const handleValidatePromoCode = async (code, userName = '') => {
    if (!code || !code.trim()) {
      setPromoCodeValidation({
        isValidating: false,
        isValid: false,
        code: null,
        error: 'Veuillez entrer un code'
      });
      return;
    }

    console.log('🔍 Validation code promo:', code, 'pour utilisateur:', userName);
    setPromoCodeValidation(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const result = await ticketingAPI.validatePromoCode(code.trim(), userName);
      
      if (result.valid) {
        setPromoCodeValidation({
          isValidating: false,
          isValid: true,
          code: result.code,
          error: null
        });
        
        toast({
          title: result.isInternal ? 'Code interne validé' : 'Code promo validé',
          description: `${result.reduction.name}: -${result.reduction.value}${result.reduction.type === 'percentage' ? '%' : '€'}`,
          status: 'success',
          duration: 3000
        });

        return result;
      }
    } catch (error) {
      console.error('Erreur validation code:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Code invalide';
      
      setPromoCodeValidation({
        isValidating: false,
        isValid: false,
        code: null,
        error: errorMsg
      });

      toast({
        title: 'Code invalide',
        description: errorMsg,
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleApplyPromoCode = async () => {
    // Utiliser le nom de l'utilisateur connecté pour valider les codes internes
    const userName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : '';
    const result = await handleValidatePromoCode(promoCode, userName);
    
    if (result && result.valid) {
      // Appliquer la réduction au formulaire
      setReservationForm(prev => ({
        ...prev,
        discount: result.code.id,
        notes: prev.notes + (prev.notes ? '\n' : '') + `Code ${result.isInternal ? 'interne' : 'promo'}: ${result.code.code}`
      }));
      
      setPromoCode(''); // Réinitialiser le champ
    }
  };

  const handleLoadPromoCodes = async () => {
    try {
      const [promos, internals] = await Promise.all([
        ticketingAPI.getPromoCodes().catch(() => []),
        ticketingAPI.getInternalCodes().catch(() => [])
      ]);
      
      setPromoCodes(promos);
      setInternalCodes(internals);
      
      // Sauvegarder en localStorage pour persistance
      try {
        localStorage.setItem('museum_promo_codes', JSON.stringify(promos));
        localStorage.setItem('museum_internal_codes', JSON.stringify(internals));
      } catch (err) {
        console.warn('Impossible de sauvegarder en localStorage:', err);
      }
    } catch (error) {
      console.error('Erreur chargement codes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les codes promotionnels',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleOpenCodeForm = (code = null, isInternal = false) => {
    if (code) {
      setIsEditingCode(true);
      setEditingCode(code);
      setIsInternalCode(isInternal);
      setCodeForm({
        code: code.code,
        name: code.name,
        type: code.type,
        value: code.value,
        description: code.description,
        validFrom: code.validFrom,
        validUntil: code.validUntil,
        maxUses: code.maxUses,
        restrictedTo: code.restrictedTo || [],
        conditions: code.conditions
      });
    } else {
      setIsEditingCode(false);
      setEditingCode(null);
      setIsInternalCode(isInternal);
      setCodeForm({
        code: '',
        name: '',
        type: 'percentage',
        value: 0,
        description: '',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        maxUses: null,
        restrictedTo: [],
        conditions: ''
      });
    }
    onCodeFormOpen();
  };

  const handleSaveCode = async () => {
    if (!codeForm.code || !codeForm.name) {
      toast({
        title: 'Erreur',
        description: 'Code et nom sont requis',
        status: 'error',
        duration: 3000
      });
      return;
    }

    try {
      const dataToSave = {
        ...codeForm,
        code: codeForm.code.toUpperCase()
      };

      let savedCode;
      if (isEditingCode) {
        if (isInternalCode) {
          savedCode = await ticketingAPI.updateInternalCode(editingCode.id, dataToSave);
        } else {
          savedCode = await ticketingAPI.updatePromoCode(editingCode.id, dataToSave);
        }
        toast({
          title: 'Code mis à jour',
          description: 'Persistance: en mémoire serveur (réinitialise au redémarrage)',
          status: 'success',
          duration: 3000
        });
      } else {
        if (isInternalCode) {
          savedCode = await ticketingAPI.createInternalCode(dataToSave);
        } else {
          savedCode = await ticketingAPI.createPromoCode(dataToSave);
        }
        toast({
          title: 'Code créé',
          description: 'Persistance: en mémoire serveur (réinitialise au redémarrage)',
          status: 'success',
          duration: 3000
        });
      }

      // Recharger depuis l'API et sauvegarder en localStorage
      await handleLoadPromoCodes();
      onCodeFormClose();
    } catch (error) {
      console.error('Erreur sauvegarde code:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Erreur lors de la sauvegarde',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleDeleteCode = async (codeId, isInternal) => {
    if (!window.confirm('Confirmer la suppression de ce code ? (Changement persistera jusqu\'au redémarrage du serveur)')) return;

    try {
      if (isInternal) {
        await ticketingAPI.deleteInternalCode(codeId);
      } else {
        await ticketingAPI.deletePromoCode(codeId);
      }

      toast({
        title: 'Code supprimé',
        description: 'Persistance: en mémoire serveur uniquement',
        status: 'success',
        duration: 3000
      });

      await handleLoadPromoCodes();
    } catch (error) {
      console.error('Erreur suppression code:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la suppression',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleToggleCodeActive = async (codeId, currentActive, isInternal) => {
    try {
      if (isInternal) {
        await ticketingAPI.updateInternalCode(codeId, { active: !currentActive });
      } else {
        await ticketingAPI.updatePromoCode(codeId, { active: !currentActive });
      }

      toast({
        title: !currentActive ? 'Code activé' : 'Code désactivé',
        status: 'success',
        duration: 2000
      });

      await handleLoadPromoCodes();
    } catch (error) {
      console.error('Erreur toggle code:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la modification',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleCancelEditVisitor = () => {
    setIsEditingVisitor(false);
    setVisitorEditForm({
      persons: 1,
      type: 'Individuel',
      ticketType: 'plein',
      modificationReason: '',
      tickets: [],
      notes: ''
    });
  };

  const handleSaveEditVisitor = () => {
    if (!selectedVisitor) return;

    // Construire la note de modification si nécessaire
    let modificationNote = visitorEditForm.notes;
    const personsChanged = parseInt(visitorEditForm.persons) !== selectedVisitor.persons;
    const ticketTypeChanged = visitorEditForm.ticketType !== selectedVisitor.ticketType;
    
    // Gérer automatiquement la carte étudiante selon le motif
    let hasStudentCard = selectedVisitor.hasStudentCard;
    if (visitorEditForm.modificationReason === 'Carte étudiante non valide') {
      hasStudentCard = false;
    }
    
    if ((personsChanged || ticketTypeChanged) && visitorEditForm.modificationReason) {
      const changes = [];
      if (personsChanged) {
        changes.push(`Personnes: ${selectedVisitor.persons} → ${visitorEditForm.persons}`);
      }
      if (ticketTypeChanged) {
        const oldTicket = ticketPrices.find(t => t.id === selectedVisitor.ticketType)?.label || 'Non défini';
        const newTicket = ticketPrices.find(t => t.id === visitorEditForm.ticketType)?.label || 'Non défini';
        changes.push(`Tarif: ${oldTicket} → ${newTicket}`);
      }
      if (visitorEditForm.modificationReason === 'Carte étudiante non valide') {
        changes.push('Carte étudiante retirée');
      }
      const modificationText = `\n\n[MODIFICATION CHECK-IN] ${changes.join(', ')} - Motif: ${visitorEditForm.modificationReason}`;
      modificationNote = (modificationNote || '') + modificationText;
    }

    // Mettre à jour la réservation dans la liste
    const updatedReservations = reservations.map(res => 
      res.id === selectedVisitor.id 
        ? { 
            ...res, 
            persons: parseInt(visitorEditForm.persons),
            type: visitorEditForm.type,
            ticketType: visitorEditForm.ticketType,
            hasStudentCard: hasStudentCard,
            tickets: visitorEditForm.tickets,
            notes: modificationNote
          }
        : res
    );
    setReservations(updatedReservations);

    // Mettre à jour le visiteur sélectionné
    const updatedVisitor = {
      ...selectedVisitor,
      persons: parseInt(visitorEditForm.persons),
      type: visitorEditForm.type,
      ticketType: visitorEditForm.ticketType,
      hasStudentCard: hasStudentCard,
      tickets: visitorEditForm.tickets,
      notes: modificationNote
    };
    setSelectedVisitor(updatedVisitor);

    // Recalculer le montant avec les nouvelles informations
    const isGroupBooking = visitorEditForm.type === 'Groupe';
    
    // Calculer le montant basé sur les tickets ou le tarif sélectionné
    let totalAmount;
    if (visitorEditForm.tickets && visitorEditForm.tickets.length > 0) {
      // Si des billets sont ajoutés, utiliser leur montant total
      totalAmount = visitorEditForm.tickets.reduce((sum, t) => sum + (t.quantity * t.price), 0);
    } else {
      // Sinon, calculer avec le tarif et le nombre de personnes
      let unitPrice = 25; // Prix par défaut (Adulte)
      if (visitorEditForm.ticketType) {
        const selectedTicket = ticketPrices.find(t => t.id === visitorEditForm.ticketType);
        if (selectedTicket) {
          unitPrice = selectedTicket.price;
        }
      }
      totalAmount = parseInt(visitorEditForm.persons) * unitPrice;
    }

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
      description: visitorEditForm.modificationReason 
        ? `Modification: ${visitorEditForm.modificationReason}` 
        : 'Les informations ont été modifiées avec succès',
      status: 'success',
      duration: 3000,
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

    if (selectedVisitor?.hasStudentCard && !checkInVerification.studentCardVerified) {
      toast({
        title: 'Carte étudiante requise',
        description: 'Veuillez vérifier la validité de la carte étudiante',
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

  // Générer le contenu du ticket de caisse
  const generateTicketReceipt = (reservation) => {
    const visitDate = new Date();
    const ticketNumber = `TICKET-${reservation.id}-${Date.now()}`;
    
    // Calculer le total et les détails
    let totalAmount = 0;
    let totalDiscount = 0;
    const items = [];
    
    if (reservation.visitors && reservation.visitors.length > 0) {
      reservation.visitors.forEach((visitor, index) => {
        const tariff = ticketPrices.find(t => t.id === visitor.ticketType);
        const reduction = visitor.discount ? discounts.find(d => d.id === visitor.discount) : null;
        const basePrice = tariff?.price || 0;
        let finalPrice = basePrice;
        let discount = 0;
        
        if (reduction) {
          if (reduction.type === 'percentage') {
            discount = basePrice * (reduction.value / 100);
            finalPrice = basePrice - discount;
          } else {
            discount = reduction.value;
            finalPrice = Math.max(0, basePrice - discount);
          }
        }
        
        totalAmount += finalPrice;
        totalDiscount += discount;
        
        items.push({
          name: visitor.name || `Visiteur ${index + 1}`,
          tariff: tariff?.label || 'Tarif',
          reduction: reduction ? reduction.name : null,
          basePrice,
          discount,
          finalPrice
        });
      });
    } else {
      // Fallback si pas de visiteurs détaillés
      const tariff = ticketPrices.find(t => t.id === reservation.ticketType);
      totalAmount = checkInPayment.amount || tariff?.price || 0;
      items.push({
        name: reservation.name,
        tariff: tariff?.label || 'Tarif Plein',
        reduction: null,
        basePrice: totalAmount,
        discount: 0,
        finalPrice: totalAmount
      });
    }
    
    return {
      ticketNumber,
      date: visitDate.toLocaleDateString('fr-FR'),
      time: visitDate.toLocaleTimeString('fr-FR'),
      reservationId: reservation.id,
      customerName: reservation.name,
      customerEmail: reservation.email,
      visitDate: reservation.date,
      visitTime: reservation.time,
      items,
      totalDiscount,
      totalAmount,
      paymentMethod: checkInPayment.method || 'CB',
      numberOfPersons: reservation.persons || items.length
    };
  };

  // Envoyer le ticket par email
  const sendTicketByEmail = async (ticketData) => {
    // TODO: Implémenter l'envoi réel via une API email (Nodemailer, SendGrid, etc.)
    // Pour l'instant, on simule l'envoi
    
    console.log('📧 Envoi du ticket de caisse par email...');
    console.log('Destinataire:', ticketData.customerEmail);
    console.log('Ticket:', ticketData);
    
    // Simuler un délai d'envoi
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('✅ Ticket envoyé avec succès!');
        resolve({ success: true, ticketNumber: ticketData.ticketNumber });
      }, 500);
    });
  };

  // ÉTAPE 4: Finalisation de l'entrée
  const handleFinalizeCheckIn = async () => {
    if (!selectedVisitor) return;

    try {
      // Marquer le check-in comme effectué
      setReservations(reservations.map(res => 
        res.id === selectedVisitor.id ? { ...res, checkedIn: true, status: 'Check-in ✓' } : res
      ));
      
      // Générer et envoyer le ticket de caisse si un email est disponible
      if (selectedVisitor.email) {
        const ticketData = generateTicketReceipt(selectedVisitor);
        
        toast({
          title: 'Envoi du ticket en cours...',
          description: 'Génération du ticket de caisse',
          status: 'info',
          duration: 1500,
          isClosable: true
        });
        
        const emailResult = await sendTicketByEmail(ticketData);
        
        if (emailResult.success) {
          toast({
            title: 'Entrée validée ✓',
            description: `${selectedVisitor.name} peut entrer au musée. Ticket envoyé par email.`,
            status: 'success',
            duration: 4000,
            isClosable: true
          });
        }
      } else {
        // Pas d'email, juste valider l'entrée
        toast({
          title: 'Entrée validée',
          description: `${selectedVisitor.name} peut entrer au musée (pas d'email renseigné)`,
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }

      setTimeout(() => {
        onCheckInClose();
        resetCheckInProcess();
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le ticket par email',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
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

  const handleUndoCheckIn = (reservationId) => {
    const reservation = reservations.find(res => res.id === reservationId);
    if (!reservation) return;

    setReservations(reservations.map(res => 
      res.id === reservationId ? { ...res, checkedIn: false, status: 'Confirmé' } : res
    ));
    
    toast({
      title: 'Check-in annulé',
      description: `Check-in de ${reservation.name} annulé avec succès`,
      status: 'warning',
      duration: 3000,
      isClosable: true
    });
    
    onReservationDetailClose();
  };

  const handleViewReservationDetails = (reservation) => {
    setSelectedReservation(reservation);
    onReservationDetailOpen();
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

  // Calculer les statistiques de vente en temps réel
  const calculateSalesStats = () => {
    // Filtrer uniquement les réservations avec paiement validé (CB confirmé sur place)
    const paidReservations = reservations.filter(res => res.paymentValidated);
    
    if (paidReservations.length === 0) {
      return {
        totalRevenue: 0,
        totalTicketsSold: 0,
        averagePrice: 0,
        mostSoldTariff: { label: 'Aucun', percentage: 0 },
        monthlyGrowth: 0
      };
    }

    let totalRevenue = 0;
    let totalTicketsSold = 0;
    const tariffCounts = {};

    paidReservations.forEach(reservation => {
      // Utiliser le montant réel payé (avec réductions) si disponible
      if (reservation.paymentDetails) {
        totalRevenue += reservation.paymentDetails.amount;
      }
      // Compter les billets et tarifs
      if (reservation.visitors && reservation.visitors.length > 0) {
        totalTicketsSold += reservation.visitors.length;
        reservation.visitors.forEach(visitor => {
          const tariff = ticketPrices.find(t => t.id === visitor.ticketType);
          
          // Compter les tarifs
          const tariffLabel = tariff?.label || 'Tarif Plein';
          tariffCounts[tariffLabel] = (tariffCounts[tariffLabel] || 0) + 1;
        });
      } else {
        // Fallback si pas de visiteurs détaillés
        const tariff = ticketPrices.find(t => t.id === reservation.ticketType);
        totalTicketsSold += reservation.persons || 1;

        const tariffLabel = tariff?.label || 'Tarif Plein';
        tariffCounts[tariffLabel] = (tariffCounts[tariffLabel] || 0) + (reservation.persons || 1);
        
        // Si pas de paymentDetails, calculer le prix
        if (!reservation.paymentDetails) {
          const price = tariff?.price || 0;
          totalRevenue += price * (reservation.persons || 1);
        }
      }
    });

    // Trouver le tarif le plus vendu
    let mostSoldTariff = { label: 'Tarif Plein', count: 0 };
    Object.entries(tariffCounts).forEach(([label, count]) => {
      if (count > mostSoldTariff.count) {
        mostSoldTariff = { label, count };
      }
    });

    const mostSoldPercentage = totalTicketsSold > 0 
      ? ((mostSoldTariff.count / totalTicketsSold) * 100).toFixed(0)
      : 0;

    const averagePrice = totalTicketsSold > 0 
      ? (totalRevenue / totalTicketsSold)
      : 0;

    // Simuler une croissance (à remplacer par une vraie comparaison mois précédent)
    const monthlyGrowth = totalRevenue > 0 ? ((Math.random() * 30) - 5).toFixed(0) : 0;

    return {
      totalRevenue,
      totalTicketsSold,
      averagePrice,
      mostSoldTariff: {
        label: mostSoldTariff.label,
        percentage: mostSoldPercentage
      },
      monthlyGrowth
    };
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
        { title: 'Adulte', price: '25€' };
      
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
        title: 'Adulte',
        price: '25€',
        color: 'rbe.500',
        sold: 3842,
        revenue: '€96,050'
      },
      {
        id: 'reduit',
        title: 'Jeunesse / Étudiant',
        price: '15€',
        color: 'blue.500',
        sold: 2156,
        revenue: '€32,340'
      },
      {
        id: 'enfant',
        title: 'Enfant -14 ans',
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
                <Button colorScheme="blue" size="lg" w="full" onClick={handleOpenNewReservation}>
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
                              onClick={() => handleViewReservationDetails(reservation)}
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
        <Modal isOpen={isNewReservationOpen} onClose={onNewReservationClose} size="full">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader bg="gray.50" borderBottomWidth="1px">
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <HStack>
                    <Icon as={FiPlus} boxSize={6} color="blue.500" />
                    <Heading size="lg">Nouvelle Réservation</Heading>
                  </HStack>
                  <ModalCloseButton position="relative" top={0} right={0} />
                </HStack>

                {/* Stepper / Fil d'Ariane */}
                <Stepper index={visitorsStep - 1} colorScheme="blue" size="lg">
                  <Step>
                    <StepIndicator>
                      <StepStatus
                        complete={<StepIcon />}
                        incomplete={<StepNumber />}
                        active={<StepNumber />}
                      />
                    </StepIndicator>

                    <Box flexShrink="0">
                      <StepTitle>Informations générales</StepTitle>
                      <StepDescription>Contact et date</StepDescription>
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
                      <StepTitle>Visiteurs</StepTitle>
                      <StepDescription>Détail par personne</StepDescription>
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
                      <StepTitle>Confirmation</StepTitle>
                      <StepDescription>Récapitulatif</StepDescription>
                    </Box>
                  </Step>
                </Stepper>
              </VStack>
            </ModalHeader>
            <ModalBody py={8} px={12} maxW="1200px" mx="auto" w="full">
              {/* ÉTAPE 1: INFORMATIONS GÉNÉRALES */}
              {visitorsStep === 1 && (
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>Informations de contact</Heading>
                    <VStack spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Nom du responsable de la réservation</FormLabel>
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
                    </VStack>
                  </Box>

                  <Divider />

                  <Box>
                    <Heading size="md" mb={4}>Date et heure de visite</Heading>
                    <SimpleGrid columns={2} spacing={4}>
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
                  </Box>

                  <Divider />

                  <Box>
                    <Heading size="md" mb={4}>Type de visite</Heading>
                    <SimpleGrid columns={2} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Type</FormLabel>
                        <Select
                          value={reservationForm.type}
                          onChange={(e) => setReservationForm({ ...reservationForm, type: e.target.value })}
                        >
                          <option value="Individuel">Individuel</option>
                          <option value="Groupe">Groupe</option>
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Canal de réservation</FormLabel>
                        <Select
                          value={reservationForm.bookingChannel || 'walkin'}
                          onChange={(e) => setReservationForm({ ...reservationForm, bookingChannel: e.target.value })}
                        >
                          <option value="walkin">Sur place</option>
                          <option value="online">En ligne</option>
                          <option value="phone">Téléphone</option>
                          <option value="email">Email</option>
                        </Select>
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  <FormControl>
                    <FormLabel>Notes générales</FormLabel>
                    <Textarea
                      placeholder="Informations complémentaires sur la réservation..."
                      value={reservationForm.notes}
                      onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
                      rows={3}
                    />
                  </FormControl>

                  <Divider />

                  {/* Code Promotionnel */}
                  <Box>
                    <Heading size="md" mb={4}>
                      <HStack>
                        <Icon as={FiPercent} color="purple.500" />
                        <Text>Code promo ou code interne</Text>
                      </HStack>
                    </Heading>
                    
                    <VStack spacing={4} align="stretch">
                      <HStack>
                        <Input
                          placeholder="Entrez un code (ex: SUMMER2026, MRBE26)"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          textTransform="uppercase"
                        />
                        <Button
                          colorScheme="purple"
                          onClick={handleApplyPromoCode}
                          isLoading={promoCodeValidation.isValidating}
                          isDisabled={!promoCode.trim()}
                        >
                          Appliquer
                        </Button>
                      </HStack>

                      {promoCodeValidation.error && (
                        <Alert status="error" borderRadius="md">
                          <AlertIcon />
                          <AlertDescription>{promoCodeValidation.error}</AlertDescription>
                        </Alert>
                      )}

                      {promoCodeValidation.isValid && promoCodeValidation.code && (
                        <Alert status="success" borderRadius="md">
                          <AlertIcon />
                          <VStack align="start" spacing={1} flex={1}>
                            <AlertDescription fontWeight="bold">
                              {promoCodeValidation.code.name}
                            </AlertDescription>
                            <Text fontSize="sm">
                              Réduction: {promoCodeValidation.code.type === 'percentage' ? `${promoCodeValidation.code.value}%` : `${promoCodeValidation.code.value}€`}
                            </Text>
                            {promoCodeValidation.code.description && (
                              <Text fontSize="xs" color="gray.600">
                                {promoCodeValidation.code.description}
                              </Text>
                            )}
                          </VStack>
                        </Alert>
                      )}

                      <Text fontSize="xs" color="gray.500">
                        <Icon as={FiInfo} /> Les codes internes sont réservés à certains utilisateurs (ex: président, direction)
                      </Text>
                    </VStack>
                  </Box>
                </VStack>
              )}

              {/* ÉTAPE 2: GESTION DES VISITEURS */}
              {visitorsStep === 2 && (
                <VStack spacing={6} align="stretch">
                  <HStack justify="space-between" align="center">
                    <Heading size="md">
                      Liste des visiteurs ({reservationForm.visitors.length} {reservationForm.visitors.length > 1 ? 'personnes' : 'personne'})
                    </Heading>
                    <Button
                      leftIcon={<FiPlus />}
                      colorScheme="blue"
                      onClick={() => {
                        setEditingVisitorIndex(null);
                        setVisitorForm({
                          name: '',
                          ticketType: 'plein',
                          discount: null,
                          hasStudentCard: false,
                          notes: ''
                        });
                        onVisitorsModalOpen();
                      }}
                    >
                      Ajouter un visiteur
                    </Button>
                  </HStack>

                  {reservationForm.visitors.length === 0 ? (
                    <Box
                      p={8}
                      borderWidth="2px"
                      borderStyle="dashed"
                      borderRadius="lg"
                      textAlign="center"
                      color="gray.500"
                    >
                      <Icon as={FiUser} boxSize={12} mb={3} />
                      <Text fontSize="lg">Aucun visiteur ajouté</Text>
                      <Text fontSize="sm">Cliquez sur "Ajouter un visiteur" pour commencer</Text>
                    </Box>
                  ) : (
                    <VStack spacing={3} align="stretch">
                      {reservationForm.visitors.map((visitor, index) => {
                        const tariff = ticketPrices.find(t => t.id === visitor.ticketType);
                        const reduction = visitor.discount ? discounts.find(d => d.id === visitor.discount) : null;
                        const price = tariff?.price || 0;
                        let finalPrice = price;
                        
                        if (reduction) {
                          if (reduction.type === 'percentage') {
                            finalPrice = price - (price * reduction.value / 100);
                          } else {
                            finalPrice = Math.max(0, price - reduction.value);
                          }
                        }

                        return (
                          <Box
                            key={index}
                            p={4}
                            borderWidth="1px"
                            borderRadius="lg"
                            bg={useColorModeValue('white', 'gray.700')}
                          >
                            <HStack justify="space-between" align="start">
                              <VStack align="start" spacing={2} flex={1}>
                                <HStack>
                                  <Icon as={FiUser} color="blue.500" />
                                  <Text fontWeight="bold" fontSize="lg">{visitor.name || `Visiteur ${index + 1}`}</Text>
                                </HStack>
                                
                                <SimpleGrid columns={2} spacing={4} w="full">
                                  <Box>
                                    <Text fontSize="sm" color="gray.600">Tarif</Text>
                                    <Text fontWeight="medium">{tariff?.label} - {price}€</Text>
                                  </Box>
                                  
                                  {reduction && (
                                    <Box>
                                      <Text fontSize="sm" color="gray.600">Réduction</Text>
                                      <Text fontWeight="medium" color="green.600">
                                        {reduction.name} ({reduction.type === 'percentage' ? `-${reduction.value}%` : `-${reduction.value}€`})
                                      </Text>
                                    </Box>
                                  )}
                                  
                                  {visitor.hasStudentCard && (
                                    <Box>
                                      <Text fontSize="sm" color="gray.600">Carte étudiante</Text>
                                      <Badge colorScheme="blue">Oui</Badge>
                                    </Box>
                                  )}
                                </SimpleGrid>

                                {visitor.notes && (
                                  <Box>
                                    <Text fontSize="sm" color="gray.600">Notes</Text>
                                    <Text fontSize="sm">{visitor.notes}</Text>
                                  </Box>
                                )}

                                <Divider />
                                
                                <HStack>
                                  <Text fontSize="sm" color="gray.600">Prix final:</Text>
                                  <Text fontWeight="bold" fontSize="lg" color="rbe.500">
                                    {finalPrice.toFixed(2)}€
                                  </Text>
                                </HStack>
                              </VStack>

                              <VStack spacing={2}>
                                <IconButton
                                  icon={<FiEdit />}
                                  size="sm"
                                  colorScheme="blue"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingVisitorIndex(index);
                                    setVisitorForm(visitor);
                                    onVisitorsModalOpen();
                                  }}
                                  aria-label="Modifier"
                                />
                                <IconButton
                                  icon={<FiX />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => {
                                    const newVisitors = reservationForm.visitors.filter((_, i) => i !== index);
                                    setReservationForm({ ...reservationForm, visitors: newVisitors });
                                  }}
                                  aria-label="Supprimer"
                                />
                              </VStack>
                            </HStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  )}
                </VStack>
              )}

              {/* ÉTAPE 3: CONFIRMATION */}
              {visitorsStep === 3 && (
                <VStack spacing={6} align="stretch">
                  <Heading size="md">Récapitulatif de la réservation</Heading>

                  <Box p={6} borderWidth="1px" borderRadius="lg" bg={useColorModeValue('blue.50', 'blue.900')}>
                    <VStack spacing={4} align="stretch">
                      <SimpleGrid columns={2} spacing={4}>
                        <Box>
                          <Text fontSize="sm" color="gray.600">Responsable</Text>
                          <Text fontWeight="bold">{reservationForm.name}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="gray.600">Email</Text>
                          <Text fontWeight="bold">{reservationForm.email}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="gray.600">Téléphone</Text>
                          <Text fontWeight="bold">{reservationForm.phone || 'Non renseigné'}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="gray.600">Date et heure</Text>
                          <Text fontWeight="bold">{reservationForm.date} à {reservationForm.time}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="gray.600">Type</Text>
                          <Text fontWeight="bold">{reservationForm.type}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="gray.600">Canal</Text>
                          <Text fontWeight="bold">
                            {reservationForm.bookingChannel === 'walkin' && 'Sur place'}
                            {reservationForm.bookingChannel === 'online' && 'En ligne'}
                            {reservationForm.bookingChannel === 'phone' && 'Téléphone'}
                            {reservationForm.bookingChannel === 'email' && 'Email'}
                          </Text>
                        </Box>
                      </SimpleGrid>
                    </VStack>
                  </Box>

                  <Box p={6} borderWidth="1px" borderRadius="lg">
                    <Heading size="sm" mb={4}>Visiteurs ({reservationForm.visitors.length})</Heading>
                    <VStack spacing={3} align="stretch">
                      {reservationForm.visitors.map((visitor, index) => {
                        const tariff = ticketPrices.find(t => t.id === visitor.ticketType);
                        const reduction = visitor.discount ? discounts.find(d => d.id === visitor.discount) : null;
                        const price = tariff?.price || 0;
                        let finalPrice = price;
                        
                        if (reduction) {
                          if (reduction.type === 'percentage') {
                            finalPrice = price - (price * reduction.value / 100);
                          } else {
                            finalPrice = Math.max(0, price - reduction.value);
                          }
                        }

                        return (
                          <HStack key={index} justify="space-between" p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md">
                            <HStack spacing={3}>
                              <Badge colorScheme="blue">{index + 1}</Badge>
                              <VStack align="start" spacing={0}>
                                <Text fontWeight="bold">{visitor.name || `Visiteur ${index + 1}`}</Text>
                                <Text fontSize="sm" color="gray.600">
                                  {tariff?.label}
                                  {reduction && ` - ${reduction.name}`}
                                </Text>
                              </VStack>
                            </HStack>
                            <Text fontWeight="bold" color="rbe.500">{finalPrice.toFixed(2)}€</Text>
                          </HStack>
                        );
                      })}
                    </VStack>

                    <Divider my={4} />

                    <HStack justify="space-between">
                      <Text fontSize="xl" fontWeight="bold">Total à payer</Text>
                      <Text fontSize="2xl" fontWeight="bold" color="rbe.500">
                        {reservationForm.visitors.reduce((sum, visitor) => {
                          const tariff = ticketPrices.find(t => t.id === visitor.ticketType);
                          const reduction = visitor.discount ? discounts.find(d => d.id === visitor.discount) : null;
                          const price = tariff?.price || 0;
                          let finalPrice = price;
                          
                          if (reduction) {
                            if (reduction.type === 'percentage') {
                              finalPrice = price - (price * reduction.value / 100);
                            } else {
                              finalPrice = Math.max(0, price - reduction.value);
                            }
                          }
                          
                          return sum + finalPrice;
                        }, 0).toFixed(2)}€
                      </Text>
                    </HStack>
                  </Box>

                  {reservationForm.notes && (
                    <Box p={4} borderWidth="1px" borderRadius="lg">
                      <Text fontSize="sm" color="gray.600" mb={2}>Notes</Text>
                      <Text>{reservationForm.notes}</Text>
                    </Box>
                  )}
                </VStack>
              )}
            </ModalBody>
            <ModalFooter borderTopWidth="1px" bg="gray.50">
              <HStack spacing={3} w="full" justify="space-between">
                <Button
                  variant="ghost"
                  onClick={visitorsStep === 1 ? onNewReservationClose : () => setVisitorsStep(visitorsStep - 1)}
                >
                  {visitorsStep === 1 ? 'Annuler' : 'Retour'}
                </Button>
                <HStack>
                  {visitorsStep < 3 ? (
                    <Button
                      colorScheme="blue"
                      onClick={() => setVisitorsStep(visitorsStep + 1)}
                      isDisabled={
                        (visitorsStep === 1 && (!reservationForm.name || !reservationForm.email || !reservationForm.date || !reservationForm.time)) ||
                        (visitorsStep === 2 && reservationForm.visitors.length === 0)
                      }
                    >
                      Suivant
                    </Button>
                  ) : (
                    <Button colorScheme="green" onClick={handleNewReservation} leftIcon={<FiCheck />}>
                      Confirmer la réservation
                    </Button>
                  )}
                </HStack>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Détails Réservation (Check-in effectué) */}
        <Modal isOpen={isReservationDetailOpen} onClose={onReservationDetailClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader bg="gray.50" borderBottomWidth="1px">
              <HStack spacing={3}>
                <Icon as={FiInfo} color="blue.500" boxSize={6} />
                <VStack align="start" spacing={0}>
                  <Text>Détails de la réservation</Text>
                  {selectedReservation && (
                    <Text fontSize="sm" fontWeight="normal" color="gray.600">
                      Réservation #{selectedReservation.id} - {selectedReservation.name}
                    </Text>
                  )}
                </VStack>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            
            {selectedReservation && (
              <ModalBody py={6}>
                <VStack spacing={6} align="stretch">
                  {/* Statut Check-in */}
                  <Alert status="success" borderRadius="lg">
                    <AlertIcon />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold">Check-in effectué ✓</Text>
                      <Text fontSize="sm">Ce visiteur a été enregistré avec succès</Text>
                    </VStack>
                  </Alert>

                  {/* Informations générales */}
                  <Box>
                    <Heading size="sm" mb={3} color="gray.700">
                      <Icon as={FiUser} display="inline" mr={2} />
                      Informations de contact
                    </Heading>
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <Text color="gray.600">Nom</Text>
                        <Text fontWeight="bold">{selectedReservation.name}</Text>
                      </HStack>
                      {selectedReservation.email && (
                        <HStack justify="space-between">
                          <Text color="gray.600">Email</Text>
                          <Text fontWeight="bold">{selectedReservation.email}</Text>
                        </HStack>
                      )}
                      {selectedReservation.phone && (
                        <HStack justify="space-between">
                          <Text color="gray.600">Téléphone</Text>
                          <Text fontWeight="bold">{selectedReservation.phone}</Text>
                        </HStack>
                      )}
                      <Divider />
                      <HStack justify="space-between">
                        <Text color="gray.600">Date de visite</Text>
                        <Text fontWeight="bold">{selectedReservation.date}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="gray.600">Heure</Text>
                        <Text fontWeight="bold">{selectedReservation.time}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="gray.600">Type</Text>
                        <Badge colorScheme={selectedReservation.type === 'Individuel' ? 'blue' : 'purple'}>
                          {selectedReservation.type}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color="gray.600">Nombre de personnes</Text>
                        <Text fontWeight="bold">{selectedReservation.persons}</Text>
                      </HStack>
                    </VStack>
                  </Box>

                  {/* Liste des visiteurs */}
                  {selectedReservation.visitors && selectedReservation.visitors.length > 0 && (
                    <Box>
                      <Heading size="sm" mb={3} color="gray.700">
                        <Icon as={FiUsers} display="inline" mr={2} />
                        Visiteurs ({selectedReservation.visitors.length})
                      </Heading>
                      <VStack spacing={2} align="stretch">
                        {selectedReservation.visitors.map((visitor, index) => {
                          const tariff = ticketPrices.find(t => t.id === visitor.ticketType);
                          const reduction = visitor.discount ? discounts.find(d => d.id === visitor.discount) : null;
                          const price = tariff?.price || 0;
                          let finalPrice = price;
                          
                          if (reduction) {
                            if (reduction.type === 'percentage') {
                              finalPrice = price - (price * reduction.value / 100);
                            } else {
                              finalPrice = Math.max(0, price - reduction.value);
                            }
                          }

                          return (
                            <HStack 
                              key={index} 
                              justify="space-between" 
                              p={3} 
                              bg="gray.50" 
                              borderRadius="md"
                              borderWidth="1px"
                              borderColor="gray.200"
                            >
                              <HStack spacing={3}>
                                <Badge colorScheme="blue">{index + 1}</Badge>
                                <VStack align="start" spacing={0}>
                                  <Text fontWeight="bold">{visitor.name || `Visiteur ${index + 1}`}</Text>
                                  <Text fontSize="sm" color="gray.600">
                                    {tariff?.label}
                                    {reduction && ` - ${reduction.name}`}
                                  </Text>
                                </VStack>
                              </HStack>
                              <Text fontWeight="bold" color="rbe.500">{finalPrice.toFixed(2)}€</Text>
                            </HStack>
                          );
                        })}
                      </VStack>
                    </Box>
                  )}

                  {/* Total payé */}
                  {selectedReservation.visitors && selectedReservation.visitors.length > 0 && (
                    <Box p={4} bg="blue.50" borderRadius="lg" borderWidth="2px" borderColor="blue.200">
                      <HStack justify="space-between">
                        <Text fontSize="lg" fontWeight="bold" color="gray.700">Total payé</Text>
                        <Text fontSize="2xl" fontWeight="bold" color="rbe.500">
                          {selectedReservation.visitors.reduce((sum, visitor) => {
                            const tariff = ticketPrices.find(t => t.id === visitor.ticketType);
                            const reduction = visitor.discount ? discounts.find(d => d.id === visitor.discount) : null;
                            const price = tariff?.price || 0;
                            let finalPrice = price;
                            
                            if (reduction) {
                              if (reduction.type === 'percentage') {
                                finalPrice = price - (price * reduction.value / 100);
                              } else {
                                finalPrice = Math.max(0, price - reduction.value);
                              }
                            }
                            
                            return sum + finalPrice;
                          }, 0).toFixed(2)}€
                        </Text>
                      </HStack>
                    </Box>
                  )}

                  {/* Notes */}
                  {selectedReservation.notes && (
                    <Box>
                      <Heading size="sm" mb={2} color="gray.700">Notes</Heading>
                      <Text fontSize="sm" color="gray.600" p={3} bg="gray.50" borderRadius="md">
                        {selectedReservation.notes}
                      </Text>
                    </Box>
                  )}

                  {/* Option d'annulation */}
                  <Alert status="warning" borderRadius="lg">
                    <AlertIcon />
                    <VStack align="start" spacing={2} flex={1}>
                      <Text fontWeight="bold" fontSize="sm">Annuler le check-in ?</Text>
                      <Text fontSize="xs" color="gray.600">
                        En cas d'erreur, vous pouvez annuler ce check-in. Le visiteur retrouvera son statut "Confirmé" et pourra être enregistré à nouveau.
                      </Text>
                      <Button
                        size="sm"
                        colorScheme="orange"
                        variant="outline"
                        leftIcon={<FiX />}
                        onClick={() => {
                          if (window.confirm(`⚠️ Confirmer l'annulation du check-in de ${selectedReservation.name} ?\n\nLe visiteur retrouvera son statut "Confirmé".`)) {
                            handleUndoCheckIn(selectedReservation.id);
                          }
                        }}
                      >
                        Annuler le check-in
                      </Button>
                    </VStack>
                  </Alert>
                </VStack>
              </ModalBody>
            )}

            <ModalFooter borderTopWidth="1px">
              <Button variant="ghost" onClick={onReservationDetailClose}>
                Fermer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Ajout/Édition Visiteur */}
        <Modal isOpen={isVisitorsModalOpen} onClose={onVisitorsModalClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Icon as={FiUser} color="blue.500" />
                <Text>{editingVisitorIndex !== null ? 'Modifier le visiteur' : 'Ajouter un visiteur'}</Text>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Nom du visiteur (optionnel)</FormLabel>
                  <Input
                    placeholder="Ex: Marie Dupont"
                    value={visitorForm.name}
                    onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })}
                  />
                  <FormHelperText>Laissez vide si anonyme</FormHelperText>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Tarif applicable</FormLabel>
                  <Select
                    value={visitorForm.ticketType}
                    onChange={(e) => setVisitorForm({ ...visitorForm, ticketType: e.target.value })}
                  >
                    {ticketPrices.filter(t => t.active).map(ticket => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.label} - {ticket.price}€
                      </option>
                    ))}
                  </Select>
                  <FormHelperText>Sélectionnez le tarif de base (Adulte, Jeunesse/Étudiant, Enfant...)</FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>Réduction éligible</FormLabel>
                  <Select
                    value={visitorForm.discount || ''}
                    onChange={(e) => setVisitorForm({ ...visitorForm, discount: e.target.value || null })}
                    placeholder="Aucune réduction"
                  >
                    {discounts.filter(d => d.active).map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} - {d.type === 'percentage' ? `-${d.value}%` : `-${d.value}€`}
                      </option>
                    ))}
                  </Select>
                  <FormHelperText>RSA, CSS, Senior, Famille nombreuse...</FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>Carte étudiante</FormLabel>
                  <Select
                    value={visitorForm.hasStudentCard ? 'yes' : 'no'}
                    onChange={(e) => setVisitorForm({ ...visitorForm, hasStudentCard: e.target.value === 'yes' })}
                  >
                    <option value="no">Non</option>
                    <option value="yes">Oui (à vérifier)</option>
                  </Select>
                  <FormHelperText>Pour les tarifs Jeunesse/Étudiant</FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>Notes particulières</FormLabel>
                  <Textarea
                    placeholder="Informations spécifiques à ce visiteur..."
                    value={visitorForm.notes}
                    onChange={(e) => setVisitorForm({ ...visitorForm, notes: e.target.value })}
                    rows={3}
                  />
                </FormControl>

                {/* Aperçu du prix */}
                <Box w="full" p={4} bg={useColorModeValue('green.50', 'green.900')} borderRadius="lg">
                  <VStack spacing={2} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm">Tarif de base:</Text>
                      <Text fontWeight="medium">
                        {ticketPrices.find(t => t.id === visitorForm.ticketType)?.price || 0}€
                      </Text>
                    </HStack>
                    
                    {visitorForm.discount && (() => {
                      const reduction = discounts.find(d => d.id === visitorForm.discount);
                      const basePrice = ticketPrices.find(t => t.id === visitorForm.ticketType)?.price || 0;
                      let discount = 0;
                      
                      if (reduction) {
                        if (reduction.type === 'percentage') {
                          discount = basePrice * reduction.value / 100;
                        } else {
                          discount = reduction.value;
                        }
                      }
                      
                      return (
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="green.600">Réduction:</Text>
                          <Text fontWeight="medium" color="green.600">-{discount.toFixed(2)}€</Text>
                        </HStack>
                      );
                    })()}
                    
                    <Divider />
                    
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Prix final:</Text>
                      <Text fontSize="xl" fontWeight="bold" color="rbe.500">
                        {(() => {
                          const basePrice = ticketPrices.find(t => t.id === visitorForm.ticketType)?.price || 0;
                          const reduction = visitorForm.discount ? discounts.find(d => d.id === visitorForm.discount) : null;
                          let finalPrice = basePrice;
                          
                          if (reduction) {
                            if (reduction.type === 'percentage') {
                              finalPrice = basePrice - (basePrice * reduction.value / 100);
                            } else {
                              finalPrice = Math.max(0, basePrice - reduction.value);
                            }
                          }
                          
                          return finalPrice.toFixed(2);
                        })()}€
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onVisitorsModalClose}>
                Annuler
              </Button>
              <Button
                colorScheme="blue"
                onClick={() => {
                  if (editingVisitorIndex !== null) {
                    // Modification
                    const newVisitors = [...reservationForm.visitors];
                    newVisitors[editingVisitorIndex] = visitorForm;
                    setReservationForm({ ...reservationForm, visitors: newVisitors });
                  } else {
                    // Ajout
                    setReservationForm({
                      ...reservationForm,
                      visitors: [...reservationForm.visitors, visitorForm]
                    });
                  }
                  onVisitorsModalClose();
                }}
              >
                {editingVisitorIndex !== null ? 'Modifier' : 'Ajouter'}
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
                                          {res.ticketType && !ticketPrices.find(t => t.id === res.ticketType)?.active && (
                                            <Badge colorScheme="red" w="fit-content">
                                              <HStack spacing={1}>
                                                <Icon as={FiInfo} boxSize={3} />
                                                <Text>Tarif désactivé</Text>
                                              </HStack>
                                            </Badge>
                                          )}
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
                              <Box>
                                <Text fontSize="sm" color="gray.600">Canal de réservation</Text>
                                <HStack>
                                  <Icon 
                                    as={selectedVisitor.bookingChannel === 'online' ? FiGlobe : selectedVisitor.bookingChannel === 'phone' ? FiPhone : FiUser} 
                                    color="gray.500" 
                                  />
                                  <Text fontWeight="medium">
                                    {selectedVisitor.bookingChannel === 'online' ? 'En ligne' : 
                                     selectedVisitor.bookingChannel === 'phone' ? 'Téléphone' : 
                                     selectedVisitor.bookingChannel === 'email' ? 'Email' : 
                                     'Sur place'}
                                  </Text>
                                </HStack>
                              </Box>
                              <Box>
                                <Text fontSize="sm" color="gray.600">Tarif sélectionné</Text>
                                {selectedVisitor.ticketType ? (
                                  <VStack align="flex-start" spacing={1}>
                                    <HStack>
                                      <Icon as={FiCreditCard} color="blue.500" />
                                      <Text fontWeight="bold" fontSize="md" color="blue.600">
                                        {ticketPrices.find(t => t.id === selectedVisitor.ticketType)?.label || 'Tarif Plein'}
                                      </Text>
                                    </HStack>
                                    <Text fontSize="sm" fontWeight="bold" color="gray.700">
                                      {ticketPrices.find(t => t.id === selectedVisitor.ticketType)?.price || 12}€
                                    </Text>
                                    {selectedVisitor.hasStudentCard && (
                                      <HStack spacing={1}>
                                        <Icon as={FiInfo} boxSize={3} color="blue.500" />
                                        <Text fontSize="xs" color="blue.600" fontWeight="medium">
                                          Carte étudiante à vérifier
                                        </Text>
                                      </HStack>
                                    )}
                                    {selectedVisitor.discount && checkInVerification.discountEligible && (
                                      <HStack spacing={1}>
                                        <Icon as={FiPercent} boxSize={3} color="purple.500" />
                                        <Text fontSize="xs" color="purple.600" fontWeight="medium">
                                          + {discounts.find(d => d.id === selectedVisitor.discount)?.name || 'Réduction'}
                                          {' '}
                                          {(() => {
                                            const disc = discounts.find(d => d.id === selectedVisitor.discount);
                                            return disc ? (disc.type === 'percentage' ? `(-${disc.value}%)` : `(-${disc.value}€)`) : '';
                                          })()}
                                        </Text>
                                      </HStack>
                                    )}
                                    {!checkInVerification.discountEligible && checkInVerification.discountApplied === null && (
                                      <HStack spacing={1}>
                                        <Icon as={FiInfo} boxSize={3} color="orange.500" />
                                        <Text fontSize="xs" color="orange.600" fontWeight="medium">
                                          Réduction retirée
                                        </Text>
                                      </HStack>
                                    )}
                                  </VStack>
                                ) : (
                                  <Text fontWeight="medium">
                                    Tarif plein ({ticketPrices.find(t => t.id === 'plein')?.price || 25}€)
                                  </Text>
                                )}
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

                              {selectedVisitor?.hasStudentCard && (
                                <Card bg={checkInVerification.studentCardVerified ? 'green.50' : 'white'} borderWidth="2px" borderColor={checkInVerification.studentCardVerified ? 'green.500' : 'gray.200'}>
                                  <CardBody>
                                    <HStack justify="space-between">
                                      <HStack>
                                        <Icon as={FiCreditCard} boxSize={6} color={checkInVerification.studentCardVerified ? 'green.500' : 'gray.400'} />
                                        <VStack align="flex-start" spacing={0}>
                                          <Text fontWeight="bold">Carte étudiante valide</Text>
                                          <Text fontSize="sm" color="gray.600">Vérifier la validité de la carte</Text>
                                        </VStack>
                                      </HStack>
                                      <Checkbox
                                        size="lg"
                                        colorScheme="green"
                                        isChecked={checkInVerification.studentCardVerified}
                                        onChange={(e) => setCheckInVerification({ ...checkInVerification, studentCardVerified: e.target.checked })}
                                      />
                                    </HStack>
                                  </CardBody>
                                </Card>
                              )}

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
                                          onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            
                                            // Si on décoche, retirer la réduction et recalculer
                                            if (!isChecked && checkInVerification.discountApplied) {
                                              setCheckInVerification({ 
                                                ...checkInVerification, 
                                                discountEligible: false,
                                                discountApplied: null 
                                              });
                                              
                                              // Retirer aussi la réduction pré-appliquée du visiteur
                                              if (selectedVisitor?.discount) {
                                                setSelectedVisitor({ 
                                                  ...selectedVisitor, 
                                                  discount: null 
                                                });
                                              }
                                              
                                              // Recalculer sans réduction
                                              setCheckInPayment({
                                                ...checkInPayment,
                                                amount: checkInPayment.originalAmount,
                                                discountAmount: 0
                                              });
                                              
                                              toast({
                                                title: 'Réduction retirée',
                                                description: 'Le montant a été recalculé sans réduction',
                                                status: 'info',
                                                duration: 2000,
                                                isClosable: true
                                              });
                                            } else {
                                              setCheckInVerification({ ...checkInVerification, discountEligible: isChecked });
                                            }
                                          }}
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

                              {/* Alerte de modification si applicable */}
                              {selectedVisitor?.notes?.includes('[MODIFICATION CHECK-IN]') && (() => {
                                const modifMatch = selectedVisitor.notes.match(/\[MODIFICATION CHECK-IN\] (.*?) - Motif: (.*?)(\n|$)/);
                                const changes = modifMatch ? modifMatch[1] : '';
                                const motif = modifMatch ? modifMatch[2] : '';
                                
                                return (
                                  <Alert status="info" variant="left-accent" borderRadius="md">
                                    <AlertIcon />
                                    <VStack align="flex-start" spacing={1}>
                                      <Text fontSize="sm" fontWeight="bold">Réservation modifiée pendant le check-in</Text>
                                      <Text fontSize="xs" color="gray.700">
                                        <strong>Motif :</strong> {motif}
                                      </Text>
                                      {changes && (
                                        <Text fontSize="xs" color="gray.600">
                                          {changes}
                                        </Text>
                                      )}
                                    </VStack>
                                  </Alert>
                                );
                              })()}

                              {/* Détail tarifaire */}
                              {selectedVisitor?.visitors && selectedVisitor.visitors.length > 0 ? (
                                <Box p={3} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
                                  <VStack spacing={2} align="stretch">
                                    <HStack mb={2}>
                                      <Icon as={FiUsers} color="blue.500" />
                                      <Text fontWeight="bold" color="blue.700">
                                        Détail tarifaire ({selectedVisitor.visitors.length} {selectedVisitor.visitors.length > 1 ? 'visiteurs' : 'visiteur'})
                                      </Text>
                                    </HStack>
                                    
                                    {selectedVisitor.visitors.map((visitor, index) => {
                                      const tariff = ticketPrices.find(t => t.id === visitor.ticketType);
                                      const reduction = visitor.discount ? discounts.find(d => d.id === visitor.discount) : null;
                                      const basePrice = tariff?.price || 0;
                                      let finalPrice = basePrice;
                                      
                                      // Appliquer la réduction si elle existe (déjà dans les données de la réservation)
                                      if (reduction) {
                                        if (reduction.type === 'percentage') {
                                          finalPrice = basePrice - (basePrice * reduction.value / 100);
                                        } else {
                                          finalPrice = Math.max(0, basePrice - reduction.value);
                                        }
                                      }

                                      return (
                                        <HStack key={index} justify="space-between" pl={2}>
                                          <HStack spacing={2} flex={1}>
                                            <Badge colorScheme="blue" size="sm">{index + 1}</Badge>
                                            <VStack align="start" spacing={0} flex={1}>
                                              <Text fontSize="sm" fontWeight="medium">
                                                {visitor.name || `Visiteur ${index + 1}`}
                                              </Text>
                                              <HStack spacing={1} fontSize="xs" color="gray.600">
                                                <Text>{tariff?.label}</Text>
                                                {reduction && (
                                                  <Text color="purple.600" fontWeight="medium">
                                                    • {reduction.name} (-{reduction.type === 'percentage' ? `${reduction.value}%` : `${reduction.value}€`})
                                                  </Text>
                                                )}
                                              </HStack>
                                            </VStack>
                                          </HStack>
                                          <VStack align="end" spacing={0}>
                                            {reduction && basePrice !== finalPrice ? (
                                              <>
                                                <Text fontSize="xs" textDecoration="line-through" color="gray.500">{basePrice.toFixed(2)}€</Text>
                                                <Text fontSize="sm" fontWeight="bold" color="green.600">{finalPrice.toFixed(2)}€</Text>
                                              </>
                                            ) : (
                                              <Text fontSize="sm" fontWeight="bold">{finalPrice.toFixed(2)}€</Text>
                                            )}
                                          </VStack>
                                        </HStack>
                                      );
                                    })}
                                    
                                    <Divider borderColor="blue.300" />
                                    
                                    <HStack justify="space-between" pt={1}>
                                      <Text fontWeight="bold" color="blue.700">
                                        {checkInPayment.originalAmount > 0 && checkInPayment.originalAmount !== checkInPayment.amount ? 'Total actuel' : 'Total'}
                                      </Text>
                                      <VStack align="end" spacing={0}>
                                        {checkInPayment.originalAmount > 0 && checkInPayment.originalAmount !== checkInPayment.amount && (
                                          <Text fontSize="sm" textDecoration="line-through" color="gray.500">
                                            {checkInPayment.originalAmount.toFixed(2)}€
                                          </Text>
                                        )}
                                        <Text fontSize="lg" fontWeight="bold" color="rbe.500">
                                          {selectedVisitor.visitors.reduce((sum, visitor) => {
                                            const tariff = ticketPrices.find(t => t.id === visitor.ticketType);
                                            const reduction = visitor.discount ? discounts.find(d => d.id === visitor.discount) : null;
                                            const basePrice = tariff?.price || 0;
                                            let finalPrice = basePrice;
                                            
                                            // Appliquer la réduction si elle existe
                                            if (reduction) {
                                              if (reduction.type === 'percentage') {
                                                finalPrice = basePrice - (basePrice * reduction.value / 100);
                                              } else {
                                                finalPrice = Math.max(0, basePrice - reduction.value);
                                              }
                                            }
                                            
                                            return sum + finalPrice;
                                          }, 0).toFixed(2)}€
                                        </Text>
                                      </VStack>
                                    </HStack>
                                  </VStack>
                                </Box>
                              ) : (
                                <Box p={3} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
                                  <HStack justify="space-between">
                                    <HStack>
                                      <Icon as={FiCreditCard} color="blue.500" />
                                      <VStack align="start" spacing={0}>
                                        <Text fontWeight="medium">
                                          {ticketPrices.find(t => t.id === selectedVisitor?.ticketType)?.label || 'Tarif Plein'}
                                        </Text>
                                        <Text fontSize="xs" color="gray.600">
                                          {selectedVisitor?.persons || 1} {selectedVisitor?.persons > 1 ? 'personnes' : 'personne'}
                                        </Text>
                                      </VStack>
                                    </HStack>
                                    <VStack align="end" spacing={0}>
                                      {checkInPayment.originalAmount > 0 && checkInPayment.originalAmount !== checkInPayment.amount && (
                                        <Text fontSize="sm" textDecoration="line-through" color="gray.500">
                                          {checkInPayment.originalAmount.toFixed(2)}€
                                        </Text>
                                      )}
                                      <Text fontSize="lg" fontWeight="bold" color="rbe.500">
                                        {checkInPayment.amount.toFixed(2)}€
                                      </Text>
                                    </VStack>
                                  </HStack>
                                </Box>
                              )}
                              
                              {selectedVisitor?.type === 'Groupe' && (
                                <HStack justify="space-between" p={3} bg="blue.50" borderRadius="md">
                                  <HStack>
                                    <Icon as={FiFileText} color="blue.500" />
                                    <Text fontWeight="medium">Paiement par devis</Text>
                                  </HStack>
                                  <Badge colorScheme="blue">RÉGLÉ</Badge>
                                </HStack>
                              )}
                              
                              {/* Afficher les réductions : soit depuis les données des visiteurs, soit depuis discountEligible */}
                              {(() => {
                                // Vérifier si au moins un visiteur a une réduction
                                const hasVisitorDiscounts = selectedVisitor?.visitors?.some(v => v.discount);
                                const hasCheckInDiscount = checkInVerification.discountEligible && checkInVerification.discountApplied;
                                
                                if (hasVisitorDiscounts || hasCheckInDiscount) {
                                  const allDiscounts = new Set();
                                  
                                  // Récupérer les réductions des visiteurs
                                  if (selectedVisitor?.visitors) {
                                    selectedVisitor.visitors.forEach(v => {
                                      if (v.discount) allDiscounts.add(v.discount);
                                    });
                                  }
                                  
                                  // Ajouter la réduction du check-in si présente
                                  if (hasCheckInDiscount) {
                                    allDiscounts.add(checkInVerification.discountApplied);
                                  }
                                  
                                  return (
                                    <VStack spacing={2} align="stretch">
                                      {Array.from(allDiscounts).map(discountId => {
                                        const discount = discounts.find(d => d.id === discountId);
                                        if (!discount) return null;
                                        
                                        return (
                                          <HStack key={discountId} justify="space-between" p={3} bg="purple.50" borderRadius="md">
                                            <HStack>
                                              <Icon as={FiPercent} color="purple.500" />
                                              <Text fontWeight="medium">Réduction appliquée</Text>
                                            </HStack>
                                            <Badge colorScheme="purple">
                                              {discount.name}
                                            </Badge>
                                          </HStack>
                                        );
                                      })}
                                    </VStack>
                                  );
                                }
                                
                                return null;
                              })()}
                            </VStack>
                          </Box>

                          {/* Section Code Promo/Interne */}
                          {checkInVerification.paymentStatus === 'to_pay' && !checkInPayment.processed && (
                            <Box>
                              <Heading size="md" mb={4}>
                                <HStack>
                                  <Icon as={FiPercent} color="purple.500" />
                                  <Text>Appliquer un code promo</Text>
                                </HStack>
                              </Heading>
                              
                              <VStack spacing={3} align="stretch">
                                <HStack>
                                  <Input
                                    placeholder="Entrez un code (ex: SUMMER2026, MRBE26)"
                                    value={promoCode}
                                    onChange={(e) => {
                                      setPromoCode(e.target.value.toUpperCase());
                                      setPromoCodeValidation({ isValidating: false, isValid: false, code: null, error: null });
                                    }}
                                    textTransform="uppercase"
                                    size="lg"
                                  />
                                  <Button
                                    colorScheme="purple"
                                    size="lg"
                                    onClick={async () => {
                                      // Utiliser le nom de l'utilisateur connecté pour valider les codes internes
                                      const userName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : '';
                                      const result = await handleValidatePromoCode(promoCode, userName);
                                      
                                      if (result && result.valid) {
                                        // Appliquer le code à la réservation
                                        const codeReduction = result.code;
                                        
                                        // Calculer le nouveau montant avec la réduction du code
                                        let newAmount = checkInPayment.originalAmount;
                                        let discountAmount = 0;
                                        
                                        if (codeReduction.type === 'percentage') {
                                          discountAmount = newAmount * (codeReduction.value / 100);
                                          newAmount = newAmount - discountAmount;
                                        } else {
                                          discountAmount = codeReduction.value;
                                          newAmount = Math.max(0, newAmount - discountAmount);
                                        }
                                        
                                        setCheckInPayment({
                                          ...checkInPayment,
                                          amount: newAmount,
                                          discountAmount: discountAmount
                                        });
                                        
                                        setCheckInVerification({
                                          ...checkInVerification,
                                          discountEligible: true,
                                          discountApplied: codeReduction.id
                                        });
                                        
                                        // Ajouter une note sur la réservation
                                        const updatedVisitor = {
                                          ...selectedVisitor,
                                          discount: codeReduction.id,
                                          notes: (selectedVisitor.notes || '') + `\n[CODE ${result.isInternal ? 'INTERNE' : 'PROMO'}] ${codeReduction.code} appliqué - ${codeReduction.name}`
                                        };
                                        setSelectedVisitor(updatedVisitor);
                                        
                                        setPromoCode(''); // Réinitialiser le champ
                                      }
                                    }}
                                    isLoading={promoCodeValidation.isValidating}
                                    isDisabled={!promoCode.trim()}
                                  >
                                    Appliquer
                                  </Button>
                                </HStack>

                                {promoCodeValidation.error && (
                                  <Alert status="error" borderRadius="md" size="sm">
                                    <AlertIcon />
                                    <AlertDescription fontSize="sm">{promoCodeValidation.error}</AlertDescription>
                                  </Alert>
                                )}

                                {promoCodeValidation.isValid && promoCodeValidation.code && (
                                  <Alert status="success" borderRadius="md" size="sm">
                                    <AlertIcon />
                                    <VStack align="start" spacing={1} flex={1}>
                                      <AlertDescription fontWeight="bold" fontSize="sm">
                                        {promoCodeValidation.code.name}
                                      </AlertDescription>
                                      <Text fontSize="xs">
                                        Réduction: {promoCodeValidation.code.type === 'percentage' ? `${promoCodeValidation.code.value}%` : `${promoCodeValidation.code.value}€`}
                                      </Text>
                                    </VStack>
                                  </Alert>
                                )}

                                <Text fontSize="xs" color="gray.500">
                                  <Icon as={FiInfo} /> Les codes internes nécessitent une autorisation spécifique
                                </Text>
                              </VStack>
                            </Box>
                          )}

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
                                        // Enregistrer les détails du paiement dans la réservation
                                        setReservations(reservations.map(res => 
                                          res.id === selectedVisitor.id ? {
                                            ...res,
                                            paymentValidated: true,
                                            paymentDetails: {
                                              amount: checkInPayment.amount,
                                              originalAmount: checkInPayment.originalAmount,
                                              discountAmount: checkInPayment.discountAmount,
                                              method: checkInPayment.method,
                                              timestamp: new Date().toISOString(),
                                              validatedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Personnel'
                                            }
                                          } : res
                                        ));
                                        
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

                          {/* Récapitulatif du ticket */}
                          {selectedVisitor.email && (
                            <>
                              <Divider />
                              <VStack spacing={3} w="full" align="stretch">
                                <HStack>
                                  <Icon as={FiMail} color="blue.500" />
                                  <Text fontSize="sm" fontWeight="bold">Ticket de caisse envoyé à :</Text>
                                </HStack>
                                <Text fontSize="sm" color="gray.600" pl={6}>{selectedVisitor.email}</Text>
                                
                                {/* Aperçu du ticket */}
                                <Box bg="white" p={4} borderRadius="md" borderWidth="1px" borderColor="gray.300">
                                  <VStack spacing={2} align="stretch" fontSize="xs">
                                    <Text fontWeight="bold" textAlign="center">🎫 TICKET DE CAISSE</Text>
                                    <Text textAlign="center" color="gray.600">Musée Rétrobus Essonne</Text>
                                    <Divider />
                                    
                                    {selectedVisitor.visitors && selectedVisitor.visitors.length > 0 ? (
                                      selectedVisitor.visitors.map((visitor, index) => {
                                        const tariff = ticketPrices.find(t => t.id === visitor.ticketType);
                                        const reduction = visitor.discount ? discounts.find(d => d.id === visitor.discount) : null;
                                        const basePrice = tariff?.price || 0;
                                        let finalPrice = basePrice;
                                        
                                        if (reduction) {
                                          if (reduction.type === 'percentage') {
                                            finalPrice = basePrice - (basePrice * reduction.value / 100);
                                          } else {
                                            finalPrice = Math.max(0, basePrice - reduction.value);
                                          }
                                        }
                                        
                                        return (
                                          <VStack key={index} spacing={1} align="stretch">
                                            <HStack justify="space-between">
                                              <Text fontWeight="medium">{visitor.name || `Visiteur ${index + 1}`}</Text>
                                              <Text fontWeight="bold">{finalPrice.toFixed(2)}€</Text>
                                            </HStack>
                                            <HStack justify="space-between" color="gray.600" fontSize="10px" pl={2}>
                                              <Text>{tariff?.label}</Text>
                                              {reduction && <Text>(-{reduction.name})</Text>}
                                            </HStack>
                                          </VStack>
                                        );
                                      })
                                    ) : (
                                      <HStack justify="space-between">
                                        <Text>{selectedVisitor.persons} personne(s)</Text>
                                        <Text fontWeight="bold">{checkInPayment.amount.toFixed(2)}€</Text>
                                      </HStack>
                                    )}
                                    
                                    <Divider />
                                    <HStack justify="space-between" fontWeight="bold">
                                      <Text>TOTAL</Text>
                                      <Text color="rbe.500">
                                        {selectedVisitor.visitors && selectedVisitor.visitors.length > 0 ? (
                                          selectedVisitor.visitors.reduce((sum, visitor) => {
                                            const tariff = ticketPrices.find(t => t.id === visitor.ticketType);
                                            const reduction = visitor.discount ? discounts.find(d => d.id === visitor.discount) : null;
                                            const basePrice = tariff?.price || 0;
                                            let finalPrice = basePrice;
                                            
                                            if (reduction) {
                                              if (reduction.type === 'percentage') {
                                                finalPrice = basePrice - (basePrice * reduction.value / 100);
                                              } else {
                                                finalPrice = Math.max(0, basePrice - reduction.value);
                                              }
                                            }
                                            
                                            return sum + finalPrice;
                                          }, 0).toFixed(2)
                                        ) : (
                                          checkInPayment.amount.toFixed(2)
                                        )}€
                                      </Text>
                                    </HStack>
                                    <Text fontSize="10px" color="gray.500" textAlign="center">
                                      Paiement: {checkInPayment.method || 'CB'}
                                    </Text>
                                  </VStack>
                                </Box>
                              </VStack>
                            </>
                          )}

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
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontSize="sm" fontWeight="bold">Le check-in sera finalisé</Text>
                        <Text fontSize="xs" color="gray.600">
                          {selectedVisitor.email ? (
                            <>✉️ Un ticket de caisse sera envoyé par email à {selectedVisitor.email}</>
                          ) : (
                            <>⚠️ Pas d'email renseigné, le ticket ne sera pas envoyé</>
                          )}
                        </Text>
                      </VStack>
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
        <Modal isOpen={isEditingVisitor} onClose={handleCancelEditVisitor} size="2xl">
          <ModalOverlay />
          <ModalContent maxH="90vh">
            <ModalHeader>
              <HStack>
                <Icon as={FiEdit} color="blue.500" />
                <Text>Modifier la réservation</Text>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6} overflowY="auto">
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
                  <FormLabel>Tarif applicable</FormLabel>
                  <Select
                    value={visitorEditForm.ticketType}
                    onChange={(e) => setVisitorEditForm({ ...visitorEditForm, ticketType: e.target.value })}
                  >
                    {ticketPrices.filter(t => t.active).map(ticket => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.label} - {ticket.price}€
                      </option>
                    ))}
                  </Select>
                  <FormHelperText>
                    Requalifiez le tarif si les droits RSA/CSS ne sont pas valides ou si le visiteur n'est pas éligible
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
                    Montant estimé: {(() => {
                      const unitPrice = visitorEditForm.ticketType ? 
                        (ticketPrices.find(t => t.id === visitorEditForm.ticketType)?.price || 25) : 25;
                      return (parseInt(visitorEditForm.persons) || 1) * unitPrice;
                    })()}€ 
                    {visitorEditForm.type === 'Groupe' && ' (déjà réglé par devis)'}
                  </FormHelperText>
                </FormControl>

                {/* Section Billets à acheter sur place */}
                <Box w="full" borderWidth="1px" borderRadius="lg" p={4} bg={useColorModeValue('blue.50', 'blue.900')}>
                  <HStack mb={3}>
                    <Icon as={FiCreditCard} color="blue.500" />
                    <Heading size="sm">Billets à acheter sur place</Heading>
                  </HStack>
                  
                  {/* Liste des billets sélectionnés */}
                  {visitorEditForm.tickets && visitorEditForm.tickets.length > 0 && (
                    <VStack spacing={2} mb={3}>
                      {visitorEditForm.tickets.map((ticket, idx) => (
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
                                const newTickets = visitorEditForm.tickets.filter((_, i) => i !== idx);
                                setVisitorEditForm({ ...visitorEditForm, tickets: newTickets });
                              }}
                            />
                          </HStack>
                        </HStack>
                      ))}
                      <Divider />
                      <HStack w="full" justify="space-between">
                        <Text fontWeight="bold">Total billets :</Text>
                        <Text fontSize="lg" fontWeight="bold" color="rbe.500">
                          {visitorEditForm.tickets.reduce((sum, t) => sum + (t.quantity * t.price), 0).toFixed(2)}€
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
                        id="editTicketType"
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
                        id="editTicketQty"
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
                          const typeSelect = document.getElementById('editTicketType');
                          const qtyInput = document.getElementById('editTicketQty');
                          const selectedTicket = ticketPrices.find(t => t.id === typeSelect.value);
                          
                          if (selectedTicket && qtyInput.value > 0) {
                            const newTicket = {
                              type: selectedTicket.name,
                              quantity: parseInt(qtyInput.value),
                              price: selectedTicket.price
                            };
                            setVisitorEditForm({
                              ...visitorEditForm,
                              tickets: [...(visitorEditForm.tickets || []), newTicket]
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

                {(parseInt(visitorEditForm.persons) !== selectedVisitor?.persons || 
                  visitorEditForm.ticketType !== selectedVisitor?.ticketType) && (
                  <FormControl isRequired>
                    <FormLabel>Motif de modification</FormLabel>
                    <Select
                      value={visitorEditForm.modificationReason}
                      onChange={(e) => setVisitorEditForm({ ...visitorEditForm, modificationReason: e.target.value })}
                      placeholder="Sélectionner un motif"
                    >
                      <option value="Absent(s) à la visite">Absent(s) à la visite</option>
                      <option value="Erreur d'inscription">Erreur d'inscription</option>
                      <option value="Droits RSA/CSS non valides">Droits RSA/CSS non valides</option>
                      <option value="Carte étudiante non valide">Carte étudiante non valide</option>
                      <option value="Non éligible à la réduction">Non éligible à la réduction</option>
                      <option value="Requalification tarifaire">Requalification tarifaire</option>
                      <option value="Personne(s) supplémentaire(s)">Personne(s) supplémentaire(s)</option>
                      <option value="Autre motif (voir notes)">Autre motif (voir notes)</option>
                    </Select>
                    <FormHelperText color="orange.600">
                      ⚠️ Obligatoire si vous modifiez le nombre de personnes ou le tarif
                    </FormHelperText>
                  </FormControl>
                )}

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
              <Button 
                colorScheme="blue" 
                onClick={handleSaveEditVisitor} 
                leftIcon={<FiCheck />}
                isDisabled={
                  (parseInt(visitorEditForm.persons) !== selectedVisitor?.persons || 
                   visitorEditForm.ticketType !== selectedVisitor?.ticketType) && 
                  !visitorEditForm.modificationReason
                }
              >
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
                      <Th>Tarif</Th>
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
                          {res.ticketType ? (
                            <VStack align="flex-start" spacing={0}>
                              <Text fontSize="xs" fontWeight="medium">
                                {ticketPrices.find(t => t.id === res.ticketType)?.label || res.ticketType}
                              </Text>
                              {!ticketPrices.find(t => t.id === res.ticketType)?.active && (
                                <Badge colorScheme="red" size="xs">Désactivé</Badge>
                              )}
                            </VStack>
                          ) : (
                            <Text fontSize="xs" color="gray.500">-</Text>
                          )}
                        </Td>
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
                    {ticketPrices.filter(t => t.active).map(ticket => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.label} - {ticket.price}€{ticket.id === 'groupe' ? '/pers' : ''}
                      </option>
                    ))}
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

        {/* Info persistance */}
        <Alert status="success" borderRadius="lg">
          <AlertIcon />
          <VStack align="flex-start" spacing={1} flex={1}>
            <AlertTitle fontSize="sm">💾 Données persistantes activées</AlertTitle>
            <AlertDescription fontSize="xs">
              Vos modifications (tarifs, réductions, codes promo) sont sauvegardées en localStorage et survivent au rechargement de la page.
            </AlertDescription>
          </VStack>
          <Button
            size="xs"
            colorScheme="orange"
            variant="outline"
            onClick={() => {
              if (window.confirm('⚠️ Réinitialiser TOUTES les données de tarification ?\n\nCeci effacera :\n- Tarifs personnalisés\n- Réductions personnalisées\n- Codes promo/internes\n\nLes données seront rechargées depuis l\'API au prochain rafraîchissement.')) {
                try {
                  localStorage.removeItem('museum_ticket_prices');
                  localStorage.removeItem('museum_discounts');
                  localStorage.removeItem('museum_promo_codes');
                  localStorage.removeItem('museum_internal_codes');
                  
                  toast({
                    title: '🗑️ Données effacées',
                    description: 'Rechargez la page pour restaurer les valeurs par défaut',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true
                  });
                  
                  // Recharger les données
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                } catch (err) {
                  console.error('Erreur effacement localStorage:', err);
                  toast({
                    title: 'Erreur',
                    description: 'Impossible d\'effacer les données',
                    status: 'error',
                    duration: 3000
                  });
                }
              }
            }}
          >
            Réinitialiser
          </Button>
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
            {(() => {
              const stats = calculateSalesStats();
              
              return (
                <>
                  <Card bg={cardBg} borderRadius="lg">
                    <CardBody>
                      <VStack align="flex-start" spacing={2}>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Tarif le plus vendu</Text>
                        <Heading size="lg" color="black">{stats.mostSoldTariff.label}</Heading>
                        <Badge colorScheme="rbe" variant="subtle">{stats.mostSoldTariff.percentage}% des ventes</Badge>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card bg={cardBg} borderRadius="lg">
                    <CardBody>
                      <VStack align="flex-start" spacing={2}>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Prix moyen</Text>
                        <Heading size="lg" color="black">{stats.averagePrice.toFixed(2)}€</Heading>
                        <Badge colorScheme="blue" variant="subtle">Par visiteur</Badge>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card bg={cardBg} borderRadius="lg">
                    <CardBody>
                      <VStack align="flex-start" spacing={2}>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Recettes du mois</Text>
                        <Heading size="lg" color="black">{stats.totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</Heading>
                        <Badge colorScheme={stats.monthlyGrowth >= 0 ? "green" : "red"} variant="subtle">
                          {stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth}% vs mois dernier
                        </Badge>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card bg={cardBg} borderRadius="lg">
                    <CardBody>
                      <VStack align="flex-start" spacing={2}>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">Billets vendus</Text>
                        <Heading size="lg" color="black">{stats.totalTicketsSold.toLocaleString('fr-FR')}</Heading>
                        <Badge colorScheme="purple" variant="subtle">Ce mois-ci</Badge>
                      </VStack>
                    </CardBody>
                  </Card>
                </>
              );
            })()}
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

        <Divider />

        {/* Section Codes Promotionnels */}
        <Box>
          <HStack justify="space-between" align="center" mb={4}>
            <HStack>
              <Icon as={FiPercent} color="purple.500" boxSize={6} />
              <Heading size="md" color="gray.800">Codes Promotionnels</Heading>
            </HStack>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="purple"
              size="sm"
              onClick={() => handleOpenCodeForm(null, false)}
            >
              Nouveau Code Promo
            </Button>
          </HStack>

          {promoCodes.length === 0 ? (
            <Card bg="gray.50" borderRadius="lg" borderWidth="2px" borderStyle="dashed" borderColor="gray.300">
              <CardBody textAlign="center" py={8}>
                <Icon as={FiPercent} boxSize={12} color="gray.400" mb={3} />
                <Text color="gray.600" fontWeight="medium" mb={2}>Aucun code promotionnel</Text>
                <Text fontSize="sm" color="gray.500" mb={4}>
                  Créez des codes promo pour offrir des réductions temporaires
                </Text>
                <Button
                  leftIcon={<FiPlus />}
                  colorScheme="purple"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenCodeForm(null, false)}
                >
                  Créer le premier code
                </Button>
              </CardBody>
            </Card>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {promoCodes.map((code) => (
                <Card
                  key={code.id}
                  bg={code.active ? cardBg : 'gray.100'}
                  borderRadius="lg"
                  borderWidth="2px"
                  borderColor={code.active ? 'purple.500' : 'gray.300'}
                  opacity={code.active ? 1 : 0.6}
                >
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <VStack align="flex-start" spacing={0}>
                          <HStack>
                            <Badge colorScheme="purple" fontSize="md" px={2}>
                              {code.code}
                            </Badge>
                            {!code.active && <Badge colorScheme="gray">Inactif</Badge>}
                          </HStack>
                          <Text fontSize="sm" fontWeight="medium" mt={1}>{code.name}</Text>
                        </VStack>
                        <Heading size="lg" color="purple.500">
                          {code.type === 'percentage' ? `-${code.value}%` : `-${code.value}€`}
                        </Heading>
                      </HStack>

                      {code.description && (
                        <Text fontSize="sm" color="gray.600">{code.description}</Text>
                      )}

                      <Divider />

                      <SimpleGrid columns={2} spacing={2}>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Validité</Text>
                          <Text fontSize="sm" fontWeight="medium">
                            {new Date(code.validFrom).toLocaleDateString('fr-FR')} → {new Date(code.validUntil).toLocaleDateString('fr-FR')}
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Utilisations</Text>
                          <Text fontSize="sm" fontWeight="medium">
                            {code.usedCount} / {code.maxUses || '∞'}
                          </Text>
                        </Box>
                      </SimpleGrid>

                      {code.conditions && (
                        <>
                          <Divider />
                          <Box>
                            <Text fontSize="xs" color="gray.500" mb={1}>Conditions</Text>
                            <Text fontSize="sm" color="gray.600">{code.conditions}</Text>
                          </Box>
                        </>
                      )}

                      <Divider />

                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          colorScheme="purple"
                          variant="outline"
                          leftIcon={<FiEdit />}
                          onClick={() => handleOpenCodeForm(code, false)}
                          flex={1}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          colorScheme={code.active ? 'orange' : 'green'}
                          variant="outline"
                          onClick={() => handleToggleCodeActive(code.id, code.active, false)}
                          flex={1}
                        >
                          {code.active ? 'Désactiver' : 'Activer'}
                        </Button>
                        <IconButton
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          icon={<FiTrash2 />}
                          onClick={() => handleDeleteCode(code.id, false)}
                        />
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Box>

        <Divider />

        {/* Section Codes Internes */}
        <Box>
          <HStack justify="space-between" align="center" mb={4}>
            <HStack>
              <Icon as={FiLock} color="red.500" boxSize={6} />
              <Heading size="md" color="gray.800">Codes Internes</Heading>
              <Badge colorScheme="red" fontSize="xs">Accès restreint</Badge>
            </HStack>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="red"
              size="sm"
              onClick={() => handleOpenCodeForm(null, true)}
            >
              Nouveau Code Interne
            </Button>
          </HStack>

          <Alert status="warning" borderRadius="lg" mb={4}>
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <AlertTitle fontSize="sm">Codes réservés</AlertTitle>
              <AlertDescription fontSize="xs">
                Les codes internes ne peuvent être utilisés que par les personnes autorisées (ex: président, direction)
              </AlertDescription>
            </VStack>
          </Alert>

          {internalCodes.length === 0 ? (
            <Card bg="gray.50" borderRadius="lg" borderWidth="2px" borderStyle="dashed" borderColor="gray.300">
              <CardBody textAlign="center" py={8}>
                <Icon as={FiLock} boxSize={12} color="gray.400" mb={3} />
                <Text color="gray.600" fontWeight="medium" mb={2}>Aucun code interne</Text>
                <Text fontSize="sm" color="gray.500" mb={4}>
                  Créez des codes internes pour des gestes commerciaux spécifiques
                </Text>
                <Button
                  leftIcon={<FiPlus />}
                  colorScheme="red"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenCodeForm(null, true)}
                >
                  Créer le premier code
                </Button>
              </CardBody>
            </Card>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {internalCodes.map((code) => (
                <Card
                  key={code.id}
                  bg={code.active ? cardBg : 'gray.100'}
                  borderRadius="lg"
                  borderWidth="2px"
                  borderColor={code.active ? 'red.500' : 'gray.300'}
                  opacity={code.active ? 1 : 0.6}
                >
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <VStack align="flex-start" spacing={0}>
                          <HStack>
                            <Badge colorScheme="red" fontSize="md" px={2}>
                              {code.code}
                            </Badge>
                            {!code.active && <Badge colorScheme="gray">Inactif</Badge>}
                            <Icon as={FiLock} boxSize={3} color="red.500" />
                          </HStack>
                          <Text fontSize="sm" fontWeight="medium" mt={1}>{code.name}</Text>
                        </VStack>
                        <Heading size="lg" color="red.500">
                          {code.type === 'percentage' ? `-${code.value}%` : `-${code.value}€`}
                        </Heading>
                      </HStack>

                      {code.description && (
                        <Text fontSize="sm" color="gray.600">{code.description}</Text>
                      )}

                      <Divider />

                      {code.restrictedTo && code.restrictedTo.length > 0 && (
                        <Box>
                          <Text fontSize="xs" color="gray.500" mb={1}>Autorisé pour</Text>
                          <HStack spacing={2} flexWrap="wrap">
                            {code.restrictedTo.map((user, idx) => (
                              <Badge key={idx} colorScheme="red" variant="subtle">
                                {user}
                              </Badge>
                            ))}
                          </HStack>
                        </Box>
                      )}

                      <SimpleGrid columns={2} spacing={2}>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Validité</Text>
                          <Text fontSize="sm" fontWeight="medium">
                            {new Date(code.validFrom).toLocaleDateString('fr-FR')} → {new Date(code.validUntil).toLocaleDateString('fr-FR')}
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Utilisations</Text>
                          <Text fontSize="sm" fontWeight="medium">
                            {code.usedCount} / {code.maxUses || '∞'}
                          </Text>
                        </Box>
                      </SimpleGrid>

                      {code.conditions && (
                        <>
                          <Divider />
                          <Box>
                            <Text fontSize="xs" color="gray.500" mb={1}>Conditions</Text>
                            <Text fontSize="sm" color="gray.600">{code.conditions}</Text>
                          </Box>
                        </>
                      )}

                      <Divider />

                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          leftIcon={<FiEdit />}
                          onClick={() => handleOpenCodeForm(code, true)}
                          flex={1}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          colorScheme={code.active ? 'orange' : 'green'}
                          variant="outline"
                          onClick={() => handleToggleCodeActive(code.id, code.active, true)}
                          flex={1}
                        >
                          {code.active ? 'Désactiver' : 'Activer'}
                        </Button>
                        <IconButton
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          icon={<FiTrash2 />}
                          onClick={() => handleDeleteCode(code.id, true)}
                        />
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Box>

        {/* Modal Édition/Création Code Promo/Interne */}
        <Modal isOpen={isCodeFormOpen} onClose={onCodeFormClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Icon as={isInternalCode ? FiLock : FiPercent} color={isInternalCode ? 'red.500' : 'purple.500'} />
                <Text>
                  {isEditingCode 
                    ? `Modifier ${isInternalCode ? 'Code Interne' : 'Code Promo'}` 
                    : `Nouveau ${isInternalCode ? 'Code Interne' : 'Code Promo'}`}
                </Text>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>Code</FormLabel>
                    <Input
                      placeholder="SUMMER2026"
                      value={codeForm.code}
                      onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                      textTransform="uppercase"
                      isDisabled={isEditingCode}
                    />
                    <FormHelperText fontSize="xs">Lettres et chiffres uniquement</FormHelperText>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Nom</FormLabel>
                    <Input
                      placeholder="Promo été 2026"
                      value={codeForm.name}
                      onChange={(e) => setCodeForm({ ...codeForm, name: e.target.value })}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    placeholder="Description du code..."
                    value={codeForm.description}
                    onChange={(e) => setCodeForm({ ...codeForm, description: e.target.value })}
                    rows={2}
                  />
                </FormControl>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>Type de réduction</FormLabel>
                    <Select
                      value={codeForm.type}
                      onChange={(e) => setCodeForm({ ...codeForm, type: e.target.value })}
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
                      max={codeForm.type === 'percentage' ? 100 : undefined}
                      placeholder={codeForm.type === 'percentage' ? '20' : '10'}
                      value={codeForm.value}
                      onChange={(e) => setCodeForm({ ...codeForm, value: parseFloat(e.target.value) || 0 })}
                    />
                  </FormControl>
                </SimpleGrid>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>Date de début</FormLabel>
                    <Input
                      type="date"
                      value={codeForm.validFrom}
                      onChange={(e) => setCodeForm({ ...codeForm, validFrom: e.target.value })}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Date de fin</FormLabel>
                    <Input
                      type="date"
                      value={codeForm.validUntil}
                      onChange={(e) => setCodeForm({ ...codeForm, validUntil: e.target.value })}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl>
                  <FormLabel>Limite d'utilisations</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Illimité"
                    value={codeForm.maxUses || ''}
                    onChange={(e) => setCodeForm({ ...codeForm, maxUses: e.target.value ? parseInt(e.target.value) : null })}
                  />
                  <FormHelperText fontSize="xs">Laisser vide pour illimité</FormHelperText>
                </FormControl>

                {isInternalCode && (
                  <FormControl>
                    <FormLabel>
                      <HStack>
                        <Icon as={FiLock} color="red.500" />
                        <Text>Utilisateurs autorisés</Text>
                      </HStack>
                    </FormLabel>
                    <Textarea
                      placeholder="Waiyl BELAIDI&#10;Nom Prénom..."
                      value={codeForm.restrictedTo.join('\n')}
                      onChange={(e) => setCodeForm({ 
                        ...codeForm, 
                        restrictedTo: e.target.value.split('\n').filter(line => line.trim())
                      })}
                      rows={3}
                    />
                    <FormHelperText fontSize="xs">Un nom par ligne</FormHelperText>
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel>Conditions</FormLabel>
                  <Textarea
                    placeholder="Conditions d'utilisation..."
                    value={codeForm.conditions}
                    onChange={(e) => setCodeForm({ ...codeForm, conditions: e.target.value })}
                    rows={2}
                  />
                </FormControl>

                <Divider />

                {/* Aperçu */}
                <Card bg={isInternalCode ? 'red.50' : 'purple.50'} w="full">
                  <CardBody>
                    <VStack align="stretch" spacing={2}>
                      <HStack justify="space-between">
                        <VStack align="flex-start" spacing={0}>
                          <HStack>
                            <Badge colorScheme={isInternalCode ? 'red' : 'purple'} fontSize="md">
                              {codeForm.code || 'CODE'}
                            </Badge>
                            {isInternalCode && <Icon as={FiLock} boxSize={3} color="red.500" />}
                          </HStack>
                          <Text fontSize="sm" fontWeight="medium" color="gray.700" mt={1}>
                            {codeForm.name || 'Nom du code'}
                          </Text>
                        </VStack>
                        <Heading size="lg" color={isInternalCode ? 'red.500' : 'purple.500'}>
                          {codeForm.type === 'percentage' ? `-${codeForm.value}%` : `-${codeForm.value}€`}
                        </Heading>
                      </HStack>
                      {codeForm.description && (
                        <Text fontSize="sm" color="gray.600">{codeForm.description}</Text>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onCodeFormClose}>
                Annuler
              </Button>
              <Button 
                colorScheme={isInternalCode ? 'red' : 'purple'} 
                onClick={handleSaveCode}
              >
                {isEditingCode ? 'Mettre à jour' : 'Créer'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

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