import React, { useState, useEffect, useCallback } from "react";
import {
  Grid, VStack, HStack, Badge, useToast, useColorModeValue, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Textarea, 
  Alert, AlertIcon, InputGroup, InputLeftElement, 
  ButtonGroup, IconButton, Menu, MenuButton, MenuList, MenuItem, MenuDivider, MenuOptionGroup, MenuItemOption,
  Spinner, Tabs, TabList, TabPanels, Tab, TabPanel,
  Switch, Table, Thead, Tbody, Tr, Th, Td, Text, Button, Input, Select,
  Card, CardHeader, CardBody, Icon, Heading,
  SimpleGrid, Divider, Box, Progress, Tooltip, PinInput, PinInputField,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Stat, StatLabel, StatNumber, StatHelpText,
  StatArrow, Accordion, AccordionItem, AccordionButton, AccordionPanel,
  AccordionIcon, Tag, TagLabel, TagCloseButton, Flex, Image, Link
} from "@chakra-ui/react";
import {
  FiDollarSign, FiTrendingUp, FiTrendingDown, FiPlus, FiMinus,
  FiPieChart, FiBarChart, FiCalendar, FiCreditCard, FiDownload,
  FiUpload, FiEdit3, FiTrash2, FiMoreHorizontal, FiCheck, FiX, 
  FiRefreshCw, FiClock, FiRepeat, FiTarget, FiSettings, FiLock,
  FiUnlock, FiEye, FiEyeOff, FiActivity, FiTrendingDown as FiSimulation,
  FiDatabase, FiShield, FiAlertTriangle, FiInfo, FiSave, FiRotateCcw, FiCheckCircle
} from "react-icons/fi";
import QuoteTemplatePreview from '../components/QuoteTemplatePreview';
import DevisLinesManager from '../components/DevisLinesManager';
import BankStatementImport from '../components/Finance/BankStatementImport';


const AdminFinance = () => {
  // === ÉTATS DE NAVIGATION ===
  const [activeMainSection, setActiveMainSection] = useState("dashboard"); // dashboard, transactions, documents, ndf, scheduled, reports, settings
  const [activeNdfSubTab, setActiveNdfSubTab] = useState("my-notes"); // my-notes, management

  // === ÉTATS PRINCIPAUX ===
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // États financiers
  const [balance, setBalance] = useState(0);
  const [lastBalanceUpdate, setLastBalanceUpdate] = useState(null);
  const [isBalanceLocked, setIsBalanceLocked] = useState(true);
  
  // Ajouter l'état stats manquant
  const [stats, setStats] = useState({
    totalCredits: 0,
    totalDebits: 0,
    monthlyBalance: 0,
    scheduledMonthlyImpact: 0,
    scheduledCount: 0
  });
  
  // États des transactions
  const [transactions, setTransactions] = useState([]);
  const [events, setEvents] = useState([]);
  const [newTransaction, setNewTransaction] = useState({
    type: 'CREDIT',
    amount: '',
    description: '',
    category: 'ADHESION',
    date: new Date().toISOString().split('T')[0],
    eventId: ''
  });
  const [transactionAllocations, setTransactionAllocations] = useState([]); // Allocations pour la transaction actuelle
  const [newAllocationInForm, setNewAllocationInForm] = useState({
    categoryId: '',
    allocatedAmount: '',
    notes: ''
  });
  
  // États des opérations programmées
  const [scheduledOperations, setScheduledOperations] = useState([]);
  const [newScheduled, setNewScheduled] = useState({
    type: 'SCHEDULED_PAYMENT',
    amount: '',
    description: '',
    frequency: 'MONTHLY',
    nextDate: new Date().toISOString().split('T')[0],
    totalAmount: ''
  });
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [paymentPeriod, setPaymentPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentsList, setPaymentsList] = useState([]);
  
  // États de configuration
  const [showBalanceConfig, setShowBalanceConfig] = useState(false);
  const [configCode, setConfigCode] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [balanceHistory, setBalanceHistory] = useState([]);
  
  // États simulation
  const [simulationData, setSimulationData] = useState({
    scenarios: [],
    activeScenario: null,
    projectionMonths: 12
  });
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [editingScenario, setEditingScenario] = useState(null);

  // Formulaires simulation
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    projectionMonths: 12
  });
  const [newIncomeItem, setNewIncomeItem] = useState({
    description: '',
    amount: '',
    category: 'ADHESION',
    frequency: 'MONTHLY'
  });
  const [newExpenseItem, setNewExpenseItem] = useState({
    description: '',
    amount: '',
    category: 'MAINTENANCE',
    frequency: 'MONTHLY'
  });

  // Notes de frais (Expense Reports)
  const [expenseReports, setExpenseReports] = useState([]);
  const [newExpenseReport, setNewExpenseReport] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Rapports financiers
  const currentYear = new Date().getFullYear();
  const [reportYear, setReportYear] = useState(currentYear);
  const [reportData, setReportData] = useState(null); // { totals, monthly, byCategory, sample }

  // Catégories et allocations
  const [financeCategories, setFinanceCategories] = useState([]);
  
  // Devis & Factures
  const [documents, setDocuments] = useState([]); // {id,type:'QUOTE'|'INVOICE', number, title, date, amount, status, eventId?}
  const [editingDocument, setEditingDocument] = useState(null);
  const [docForm, setDocForm] = useState({ 
    type: 'QUOTE', 
    number: '', 
    title: '', 
    description: '',
    date: new Date().toISOString().split('T')[0], 
    dueDate: '',
    amountExcludingTax: '',
    taxRate: 20,
    taxAmount: 0,
    amount: '', 
    status: 'DRAFT', 
    eventId: '',
    memberId: '',
    destinataireName: '',
    destinataireAdresse: '',
    destinataireSociete: '',
    destinataireContacts: '',
    notes: '',
    paymentMethod: '',
    paymentDate: '',
    amountPaid: ''
  });
  
  // Lignes de devis
  const [devisLines, setDevisLines] = useState([]); // [{id, quantity, description, unitPrice, totalPrice}]
  const [newLine, setNewLine] = useState({
    quantity: 1,
    description: '',
    unitPrice: 0
  });
  
  // Mode génération document: 'manual' | 'template' | 'pdf'
  const [docGenerationMode, setDocGenerationMode] = useState('manual'); // manual editing
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [templatePreviewData, setTemplatePreviewData] = useState(null);
  const { isOpen: isTemplatePreviewOpen, onOpen: onTemplatePreviewOpen, onClose: onTemplatePreviewClose } = useDisclosure();

  // Edition/Liaison transaction
  const { isOpen: isBankImportOpen, onOpen: onBankImportOpen, onClose: onBankImportClose } = useDisclosure();
  const { isOpen: isEditTxOpen, onOpen: onEditTxOpen, onClose: onEditTxClose } = useDisclosure();
  const [editingTransaction, setEditingTransaction] = useState(null);
  const { isOpen: isLinkDocOpen, onOpen: onLinkDocOpen, onClose: onLinkDocClose } = useDisclosure();
  const [linkTxTarget, setLinkTxTarget] = useState(null);
  const [linkDocId, setLinkDocId] = useState('');
  const { isOpen: isDocOpen, onOpen: onDocOpen, onClose: onDocClose } = useDisclosure();

  // Toast
  const toast = useToast();

  // Modals
  const { isOpen: isConfigOpen, onOpen: onConfigOpen, onClose: onConfigClose } = useDisclosure();
  const { isOpen: isTransactionOpen, onOpen: onTransactionOpen, onClose: onTransactionClose } = useDisclosure();
  const { isOpen: isScheduledOpen, onOpen: onScheduledOpen, onClose: onScheduledClose } = useDisclosure();
  const { isOpen: isSimulationOpen, onOpen: onSimulationOpen, onClose: onSimulationClose } = useDisclosure();
  const { isOpen: isEditScenarioOpen, onOpen: onEditScenarioOpen, onClose: onEditScenarioClose } = useDisclosure();
  const { isOpen: isSimulationResultsOpen, onOpen: onSimulationResultsOpen, onClose: onSimulationResultsClose } = useDisclosure();
  const { isOpen: isDeclarePaymentOpen, onOpen: onDeclarePaymentOpen, onClose: onDeclarePaymentClose } = useDisclosure();
  const { isOpen: isPaymentsListOpen, onOpen: onPaymentsListOpen, onClose: onPaymentsListClose } = useDisclosure();

  // === API HELPERS ===
  // Base API: prefer same-origin relative in prod to avoid CORS; in local dev use VITE_API_* or localhost:3000
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '5173');
  // In local dev, prefer relative URLs to go through Vite proxy unless explicit env is provided
  const RAW_BASE = isLocal ? (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_URL || '') : '';
  const API_BASE = String(RAW_BASE || '').replace(/\/$/, '');
  const apiUrl = (path) => `${API_BASE}${path}`;

  // Helpers: try /api then non-/api variant
  const buildPathCandidates = (path) => {
    const clean = String(path || '');
    if (clean.startsWith('/api/')) return [clean, clean.replace(/^\/api/, '')];
    return [clean, `/api${clean}`];
  };

  const fetchJsonFirst = async (paths, init = {}) => {
    const list = Array.isArray(paths) ? paths : [paths];
    let lastErr = null;
    for (const p of list) {
      try {
        const res = await fetch(apiUrl(p), init);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) return await res.json();
        return {};
      } catch (e) { lastErr = e; }
    }
    if (lastErr) throw lastErr;
    return {};
  };

  const deleteFirst = async (paths, headers = {}) => {
    const list = Array.isArray(paths) ? paths : [paths];
    let lastErr = null;
    for (const p of list) {
      try {
        const res = await fetch(apiUrl(p), { method: 'DELETE', headers });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return true;
      } catch (e) { lastErr = e; }
    }
    if (lastErr) throw lastErr;
    return false;
  };

  const patchFirst = async (paths, body = {}, headers = {}) => {
    const list = Array.isArray(paths) ? paths : [paths];
    let lastErr = null;
    for (const p of list) {
      try {
        const res = await fetch(apiUrl(p), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) return await res.json();
        return body;
      } catch (e) { lastErr = e; }
    }
    if (lastErr) throw lastErr;
    return body;
  };

  // Local cache for documents
  const readDocsLocal = () => {
    try { const raw = localStorage.getItem('rbe:finance:documents'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  };
  const writeDocsLocal = (docs) => {
    try { localStorage.setItem('rbe:finance:documents', JSON.stringify(docs || [])); } catch {}
  };

  // === FONCTIONS DE CHARGEMENT ===
  const loadFinancialData = async () => {
    try {
      setLoading(true);
      console.log('📊 Chargement des données financières en parallèle...');
      
      // Charger toutes les données en parallèle avec gestion d'erreur isolée
      const results = await Promise.allSettled([
        loadBalance(),
        loadTransactions(),
        loadScheduledOperations(),
        loadSimulationData(),
        loadBalanceHistory(),
        loadExpenseReports(),
        loadDocuments(),
        loadReports(reportYear),
        loadFinanceCategories(),
        loadEvents()
      ]);
      
      // Compter les succès
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ Chargement finances: ${successCount}/10 sources réussies`);
      
    } catch (error) {
      console.error('❌ Erreur chargement données financières:', error);
      toast({
        status: "error",
        title: "Erreur de chargement",
        description: "Impossible de charger les données financières",
        duration: 4000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  // Charger devis/factures
  const loadDocuments = async () => {
    try {
      const paths = buildPathCandidates('/api/finance/documents');
      const data = await fetchJsonFirst(paths, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const list = Array.isArray(data?.documents) ? data.documents : (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
      if (list.length === 0) {
        const local = readDocsLocal();
        setDocuments(local);
      } else {
        setDocuments(list);
        writeDocsLocal(list);
      }
    } catch (e) {
      const local = readDocsLocal();
      setDocuments(local);
    }
  };

  // Charger templates de devis
  const loadTemplates = async () => {
    try {
      const paths = buildPathCandidates('/api/quote-templates');
      const response = await fetch(paths[0] || '/api/quote-templates', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const tmplList = Array.isArray(data) ? data : (data?.templates || []);
        setTemplates(tmplList);
      }
    } catch (e) {
      console.warn('⚠️ Impossible de charger les templates:', e);
      setTemplates([]);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await fetch(apiUrl('/api/finance/balance'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
        setLastBalanceUpdate(data.lastUpdate);
        setIsBalanceLocked(data.isLocked !== false);
      } else {
        console.warn('⚠️ Solde non disponible, utilisation de 0');
        setBalance(0);
      }
    } catch (error) {
      console.error('❌ Erreur chargement solde:', error);
      setBalance(0);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await fetch(apiUrl('/api/finance/transactions'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        console.warn('⚠️ Transactions non disponibles');
        setTransactions([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      setTransactions([]);
    }
  };

  const loadScheduledOperations = async () => {
    try {
      const response = await fetch(apiUrl('/api/finance/scheduled-operations'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setScheduledOperations(data.operations || []);
      } else {
        console.warn('⚠️ Opérations programmées non disponibles');
        setScheduledOperations([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement opérations programmées:', error);
      setScheduledOperations([]);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch(apiUrl('/api/events'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(Array.isArray(data) ? data : data?.events || []);
      } else {
        console.warn('⚠️ Événements non disponibles');
        setEvents([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement événements:', error);
      setEvents([]);
    }
  };

  const loadPaymentsForOperation = async (operationId) => {
    try {
      const response = await fetch(apiUrl(`/api/finance/scheduled-operations/${operationId}/payments`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPaymentsList(data.payments || []);
      } else {
        setPaymentsList([]);
      }
    } catch (e) {
      console.error('❌ Erreur chargement paiements échéance:', e);
      setPaymentsList([]);
    }
  };

  const loadSimulationData = async () => {
    try {
      const response = await fetch(apiUrl('/api/finance/simulations'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSimulationData(prev => ({
          ...prev,
          scenarios: data.scenarios || []
        }));
      } else {
        console.warn('⚠️ Simulations non disponibles');
        setSimulationData(prev => ({ ...prev, scenarios: [] }));
      }
    } catch (error) {
      console.error('❌ Erreur chargement simulations:', error);
      setSimulationData(prev => ({ ...prev, scenarios: [] }));
    }
  };

  const loadBalanceHistory = async () => {
    try {
      const response = await fetch(apiUrl('/api/finance/balance/history'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBalanceHistory(data.history || []);
      } else {
        console.warn('⚠️ Historique non disponible');
        setBalanceHistory([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
      setBalanceHistory([]);
    }
  };

  const loadExpenseReports = async () => {
    try {
      const response = await fetch(apiUrl('/api/finance/expense-reports'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setExpenseReports(data.reports || []);
      } else {
        setExpenseReports([]);
      }
    } catch (e) {
      console.error('❌ Erreur chargement notes de frais:', e);
      setExpenseReports([]);
    }
  };

  const loadReports = async (y) => {
    try {
      const response = await fetch(apiUrl(`/api/finance/reports?year=${encodeURIComponent(y)}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        setReportData(null);
      }
    } catch (e) {
      console.error('❌ Erreur chargement rapports:', e);
      setReportData(null);
    }
  };

  const exportReportPdf = async () => {
    try {
      const resp = await fetch(apiUrl(`/api/finance/reports/pdf?year=${encodeURIComponent(reportYear)}`), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!resp.ok) {
        toast({ status: 'error', title: 'Export PDF échoué' });
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-financier-${reportYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('❌ Export PDF:', e);
      toast({ status: 'error', title: 'Export PDF échoué' });
    }
  };

  // === FONCTIONS CATÉGORIES ET ALLOCATIONS ===
  const loadFinanceCategories = async () => {
    try {
      const response = await fetch(apiUrl('/api/finance/categories'), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFinanceCategories(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('❌ Erreur chargement catégories:', e);
    }
  };

  const saveTransactionAllocations = async (transactionId, allocations) => {
    try {
      const response = await fetch(apiUrl(`/api/finance/transactions/${transactionId}/categories`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ allocations })
      });
      if (response.ok) {
        return true;
      } else {
        console.error('Erreur lors de la sauvegarde des allocations');
        return false;
      }
    } catch (e) {
      console.error('❌ Erreur sauvegarde allocations:', e);
      return false;
    }
  };

  // Ajouter l'état manquant pour les droits utilisateur
  const [canModifyBalance, setCanModifyBalance] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const isTreasurer = (currentUser?.roles || []).some(r => String(r).toUpperCase() === 'TRESORIER');

  const loadUserInfo = async () => {
    try {
      const response = await fetch(apiUrl('/api/me'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);

        // Autoriser la modification du solde via code sécurisé uniquement (sans dépendre du matricule)
        setCanModifyBalance(true);
        console.log('👤 Utilisateur connecté:', userData.matricule, '- Modification du solde contrôlée par code');
      }
    } catch (error) {
      console.error('❌ Erreur chargement utilisateur:', error);
    }
  };

  // Calculer les stats après chargement des données
  const calculateStats = () => {
    const totalCredits = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalDebits = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Transactions du mois en cours
    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    const monthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0);
    
    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date || t.createdAt);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });
    
    const monthlyCredits = monthlyTransactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const monthlyDebits = monthlyTransactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const monthlyBalance = monthlyCredits - monthlyDebits;
    
    // Impact mensuel des opérations programmées
    const scheduledMonthlyImpact = scheduledOperations
      .filter(op => op.isActive)
      .reduce((sum, op) => {
        const multiplier = getFrequencyMultiplier(op.frequency);
        const impact = op.type === 'SCHEDULED_CREDIT' ? (op.amount || 0) : -(op.amount || 0);
        return sum + (impact * multiplier);
      }, 0);
    
    setStats({
      totalCredits,
      totalDebits,
      monthlyBalance,
      scheduledMonthlyImpact,
      scheduledCount: scheduledOperations.filter(op => op.isActive).length
    });
  };

  // === FONCTIONS UTILITAIRES ===
  // Simple semicircle gauge using SVG. percent: 0..1 or null (unknown)
  const SemicircleGauge = ({ percent, color = 'gray' }) => {
    const pct = typeof percent === 'number' ? Math.max(0, Math.min(1, percent)) : null;
    const r = 50; // radius
    const cx = 60, cy = 60; // center
    // Angles in radians for upper semicircle [PI .. 0]
    const start = Math.PI; // leftmost
    const end = Math.PI * (1 - (pct ?? 0)); // map 0->PI, 1->0
    // Start point (left)
    const x1 = cx + r * Math.cos(start);
    const y1 = cy - r * Math.sin(start); // use minus to keep arc on upper half
    // End point according to percent
    const x2 = cx + r * Math.cos(end);
    const y2 = cy - r * Math.sin(end);
    const largeArc = 0; // always <= 180°
    const sweepFlag = 0; // draw upper arc (counter-clockwise in screen coords)
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`;
    return (
      <svg viewBox="0 0 120 70" width="100%" height="70" role="img" aria-label={pct != null ? `${Math.round(pct * 100)}%` : 'N/A'}>
        {/* background arc (full upper semicircle) */}
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 ${sweepFlag} ${cx + r} ${cy}`} stroke="#E2E8F0" strokeWidth="10" fill="none" />
        {/* foreground arc */}
        {pct != null && pct > 0 && (
          <path d={path} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" />
        )}
        {/* percent label */}
        <text x="60" y="65" textAnchor="middle" fontSize="10" fill="#4A5568">
          {pct != null ? `${Math.round(pct * 100)}%` : 'N/A'}
        </text>
      </svg>
    );
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getCategoryLabel = (category) => {
    const categories = {
      'ADHESION': 'Adhésion',
      'MAINTENANCE': 'Maintenance',
      'CARBURANT': 'Carburant',
      'ASSURANCE': 'Assurance',
      'AUTRE': 'Autre'
    };
    return categories[category] || category;
  };

  // Helpers manquants pour fréquences
  const getFrequencyMultiplier = (frequency) => {
    switch (frequency) {
      case 'SEMI_ANNUAL': return 0.5; // tous les 6 mois, en moyenne
      case 'ONE_SHOT': return 0; // ponctuel, pas d'impact mensuel récurrent
      case 'WEEKLY': return 4.33;
      case 'QUARTERLY': return 1 / 3;
      case 'YEARLY': return 1 / 12;
      case 'MONTHLY':
      default: return 1;
    }
  };

  const getFrequencyLabel = (frequency) => {
    switch (frequency) {
      case 'ONE_SHOT': return 'Ponctuel';
      case 'SEMI_ANNUAL': return 'Semestriel (6 mois)';
      case 'WEEKLY': return 'Hebdomadaire';
      case 'QUARTERLY': return 'Trimestriel';
      case 'YEARLY': return 'Annuel';
      case 'MONTHLY':
      default: return 'Mensuel';
    }
  };

  // === FONCTIONS D'ACTIONS ===
  const handleBalanceConfig = async () => {
    // La modification est autorisée pour tout utilisateur authentifié, si le code est correct

    if (!configCode || configCode.length !== 4) {
      toast({
        status: "warning",
        title: "Code requis",
        description: "Veuillez saisir le code à 4 chiffres (0920)",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (configCode !== '0920') {
      toast({
        status: "error",
        title: "Code incorrect",
        description: "Le code de sécurité n'est pas valide",
        duration: 4000,
        isClosable: true
      });
      return;
    }

    if (!newBalance || isNaN(parseFloat(newBalance))) {
      toast({
        status: "warning",
        title: "Montant invalide",
        description: "Veuillez saisir un montant valide",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(apiUrl('/api/finance/balance/configure'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: configCode,
          newBalance: parseFloat(newBalance),
          reason: balanceReason?.trim() || `Mise à jour manuelle du solde par ${currentUser?.matricule || currentUser?.username || 'inconnu'} - ${new Date().toLocaleDateString('fr-FR')}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(data.newBalance);
        setConfigCode('');
        setNewBalance('');
  setBalanceReason('');
        setShowBalanceConfig(false);
        onConfigClose();
        
        toast({
          status: "success",
          title: "Solde mis à jour",
          description: `Nouveau solde: ${formatCurrency(data.newBalance)} (différence: ${data.difference >= 0 ? '+' : ''}${formatCurrency(data.difference)})`,
          duration: 5000,
          isClosable: true
        });
        
        // Recharger les données
        await loadBalanceHistory();
        await loadBalance();
      } else {
        // Safely parse error body (JSON or text/HTML)
        const raw = await response.text().catch(() => '');
        let errorData = {};
        try { errorData = raw ? JSON.parse(raw) : {}; } catch { errorData = { message: raw?.slice(0, 200) || 'Erreur inconnue' }; }
        
        if (response.status === 403) {
          toast({
            status: "error",
            title: "Accès refusé",
            description: "Vous n'avez pas l'autorisation de modifier le solde",
            duration: 5000,
            isClosable: true
          });
        } else if (response.status === 401) {
          toast({
            status: "error",
            title: "Code incorrect",
            description: "Le code de sécurité 0920 est incorrect",
            duration: 4000,
            isClosable: true
          });
        } else {
          toast({
            status: "error",
            title: "Erreur de configuration",
            description: errorData.message || "Erreur serveur",
            duration: 4000,
            isClosable: true
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur configuration solde:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible de configurer le solde. Vérifiez votre connexion.",
        duration: 4000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  // CRUD Notes de frais
  const createExpenseReport = async () => {
    if (!newExpenseReport.description || !newExpenseReport.amount) {
      toast({ status: 'warning', title: 'Champs requis', description: 'Description et montant sont obligatoires' });
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(apiUrl('/api/finance/expense-reports'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: newExpenseReport.description,
          amount: parseFloat(newExpenseReport.amount),
          date: newExpenseReport.date
        })
      });
      if (response.ok) {
        toast({ status: 'success', title: 'Note de frais ajoutée' });
        setNewExpenseReport({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
        await loadExpenseReports();
      } else {
        const err = await response.json().catch(() => ({}));
        toast({ status: 'error', title: 'Erreur', description: err.message || "Impossible d'ajouter la note de frais" });
      }
    } catch (e) {
      console.error('❌ Erreur création note de frais:', e);
      toast({ status: 'error', title: 'Erreur', description: "Impossible d'ajouter la note de frais" });
    } finally {
      setLoading(false);
    }
  };

  const updateExpenseReportStatus = async (id, status) => {
    try {
      const response = await fetch(apiUrl(`/api/finance/expense-reports/${id}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        await loadExpenseReports();
      } else {
        toast({ status: 'error', title: 'Erreur', description: "Mise à jour du statut impossible" });
      }
    } catch (e) {
      console.error('❌ Erreur MAJ statut note de frais:', e);
      toast({ status: 'error', title: 'Erreur', description: "Mise à jour du statut impossible" });
    }
  };

  const deleteExpenseReport = async (id) => {
    try {
      const response = await fetch(apiUrl(`/api/finance/expense-reports/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        toast({ status: 'success', title: 'Note de frais supprimée' });
        await loadExpenseReports();
      } else {
        toast({ status: 'error', title: 'Erreur', description: "Suppression impossible" });
      }
    } catch (e) {
      console.error('❌ Erreur suppression note de frais:', e);
      toast({ status: 'error', title: 'Erreur', description: "Suppression impossible" });
    }
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.type || !newTransaction.amount || !newTransaction.description) {
      toast({
        status: "warning",
        title: "Champs requis",
        description: "Type, montant et description sont obligatoires",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      setLoading(true);
      const paths = buildPathCandidates('/api/finance/transactions');
      const data = await fetchJsonFirst(paths, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newTransaction,
          amount: parseFloat(newTransaction.amount)
        })
      });

      if (data) {
        // Sauvegarder les allocations si présentes
        if (transactionAllocations.length > 0) {
          const allocPaths = buildPathCandidates(`/api/finance/transactions/${data.id}/categories`);
          const allocations = transactionAllocations.map(a => ({
            categoryId: a.categoryId,
            allocatedAmount: parseFloat(a.allocatedAmount),
            notes: a.notes || null
          }));
          
          await fetchJsonFirst(allocPaths, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ allocations })
          });
        }

        toast({
          status: "success",
          title: "Transaction ajoutée",
          description: transactionAllocations.length > 0 
            ? `Transaction ajoutée avec ${transactionAllocations.length} allocation(s)`
            : "La transaction a été enregistrée avec succès",
          duration: 3000,
          isClosable: true
        });
        
        setNewTransaction({
          type: 'CREDIT',
          amount: '',
          description: '',
          category: 'ADHESION',
          date: new Date().toISOString().split('T')[0]
        });
        setTransactionAllocations([]);
        setNewAllocationInForm({ categoryId: '', allocatedAmount: '', notes: '' });
        
        onTransactionClose();
        
        await loadTransactions();
        await loadBalance();
      }
    } catch (error) {
      console.error('❌ Erreur ajout transaction:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible d'ajouter la transaction. Vérifiez votre connexion.",
        duration: 4000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  // Edition transaction
  const openEditTransaction = (tx) => {
    setEditingTransaction({ ...tx });
    onEditTxOpen();
  };

  const saveEditedTransaction = async () => {
    if (!editingTransaction || !editingTransaction.id) return;
    try {
      setLoading(true);
      const paths = buildPathCandidates(`/api/finance/transactions/${encodeURIComponent(editingTransaction.id)}`);
      await fetchJsonFirst(paths, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: editingTransaction.description,
          category: editingTransaction.category,
          type: editingTransaction.type,
          amount: parseFloat(editingTransaction.amount),
          date: editingTransaction.date
        })
      });
      toast({ status: 'success', title: 'Transaction mise à jour' });
      onEditTxClose();
      await loadTransactions();
      await loadBalance();
    } catch (e) {
      console.error('❌ Erreur modification transaction:', e);
      toast({ status: 'error', title: 'Erreur', description: "Impossible de modifier la transaction" });
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (id) => {
    try {
      if (!confirm('Supprimer cette transaction ?')) return;
      const paths = buildPathCandidates(`/api/finance/transactions/${encodeURIComponent(id)}`);
      await deleteFirst(paths, { 'Authorization': `Bearer ${localStorage.getItem('token')}` });
      toast({ status: 'success', title: 'Transaction supprimée' });
      await loadTransactions();
      await loadBalance();
    } catch (e) {
      console.error('❌ Erreur suppression transaction:', e);
      toast({ status: 'error', title: 'Erreur', description: 'Suppression impossible' });
    }
  };

  // Liaison transaction ↔ document
  const openLinkDocument = (tx) => {
    setLinkTxTarget(tx);
    setLinkDocId(tx?.documentId || '');
    onLinkDocOpen();
  };

  const saveLinkDocument = async () => {
    try {
      if (!linkTxTarget) return;
      const paths = buildPathCandidates(`/api/finance/transactions/${encodeURIComponent(linkTxTarget.id)}`);
      await fetchJsonFirst(paths, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentId: linkDocId || null })
      });
      setTransactions(prev => prev.map(t => t.id === linkTxTarget.id ? { ...t, documentId: linkDocId || null } : t));
      onLinkDocClose();
      setLinkTxTarget(null);
      setLinkDocId('');
      toast({ status: 'success', title: 'Transaction liée au document' });
    } catch (e) {
      console.error('❌ Erreur liaison transaction/document:', e);
      toast({ status: 'error', title: 'Erreur', description: 'Impossible de lier la transaction' });
    }
  };

  // Charger les templates de documents HTML (éditeur)
  const loadDocumentTemplates = async () => {
    try {
      const paths = buildPathCandidates('/api/document-templates');
      const data = await fetchJsonFirst(paths, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (data && data.templates) {
        // NOTE: Pour l'instant, document-templates n'est pas utilisé
        // Les templates de devis sont chargés via loadTemplates()
      }
    } catch (e) {
      console.error('❌ Erreur chargement templates documents:', e);
    }
  };

  // Générer un document depuis un template HTML
  const generateFromTemplate = async () => {
    if (!selectedTemplate) {
      toast({ status: 'warning', title: 'Erreur', description: 'Sélectionnez un template' });
      return;
    }

    try {
      // Validation des données requises
      if (!docForm.number) {
        toast({ status: 'warning', title: 'Champ requis', description: 'Le numéro du document est obligatoire' });
        return;
      }
      if (!docForm.title) {
        toast({ status: 'warning', title: 'Champ requis', description: 'Le titre du document est obligatoire' });
        return;
      }
      if (!docForm.amount) {
        toast({ status: 'warning', title: 'Champ requis', description: 'Le montant est obligatoire' });
        return;
      }

      // Charger les lignes du devis
      let devisLinesTr = '';
      try {
        const currentDevisId = editingDocument?.id || 'temp-' + Date.now();
        const linesResponse = await fetchJson(`/api/devis-lines/${currentDevisId}`);
        const lines = Array.isArray(linesResponse) ? linesResponse : [];
        
        if (lines.length > 0) {
          devisLinesTr = lines.map(line => `
            <tr>
              <td class="num">${line.quantity}</td>
              <td class="desc">${line.description}</td>
              <td class="num">${(parseFloat(line.unitPrice) || 0).toFixed(2)} €</td>
              <td class="num">${(parseFloat(line.totalPrice) || 0).toFixed(2)} €</td>
            </tr>
          `).join('');
        }
      } catch (e) {
        console.warn('⚠️ Impossible de charger les lignes:', e.message);
      }

      // Préparer les données pour le preview avec tous les placeholders
      const previewData = {
        NUM_DEVIS: docForm.number,
        TITRE: docForm.title,
        OBJET: docForm.title,
        DESCRIPTION: docForm.description || '',
        MONTANT: parseFloat(docForm.amount || 0).toFixed(2),
        PRIX_NET: parseFloat(docForm.amount || 0).toFixed(2),
        DATE: new Date(docForm.date).toLocaleDateString('fr-FR'),
        DESTINATAIRE_NOM: docForm.destinataireName || 'Destinataire',
        DESTINATAIRE_ADRESSE: docForm.destinataireAdresse || '',
        DESTINATAIRE_SOCIETE: docForm.destinataireSociete || '',
        DESTINATAIRE_CONTACTS: docForm.destinataireContacts || '',
        NOTES: docForm.notes || '',
        LOGO_BIG: selectedTemplate.logoBig || '',
        LOGO_SMALL: selectedTemplate.logoSmall || '',
        DEVIS_LINES_TR: devisLinesTr
      };

      setTemplatePreviewData({
        templateId: selectedTemplate.id,
        data: previewData,
        templateName: selectedTemplate.name
      });
      onTemplatePreviewOpen();

      toast({
        status: 'success',
        title: 'Aperçu généré',
        description: 'Vérifiez l\'aperçu avant d\'imprimer'
      });
    } catch (e) {
      console.error('❌ Erreur génération aperçu:', e);
      toast({ status: 'error', title: 'Erreur', description: 'Impossible de générer l\'aperçu' });
    }
  };

  // Upload un PDF existant
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ status: 'warning', title: 'Erreur', description: 'Veuillez sélectionner un fichier PDF' });
      return;
    }

    setPdfFile(file);
    toast({
      status: 'info',
      title: 'PDF sélectionné',
      description: `${file.name} sera attaché au document`
    });
  };

  // CRUD Documents
  const openCreateDocument = () => {
    setEditingDocument(null);
    setDocForm({ 
      type: 'QUOTE', 
      number: '', 
      title: '', 
      description: '',
      date: new Date().toISOString().split('T')[0], 
      dueDate: '',
      amountExcludingTax: '',
      taxRate: 20,
      taxAmount: 0,
      amount: '', 
      status: 'DRAFT', 
      eventId: '',
      memberId: '',
      destinataireName: '',
      destinataireAdresse: '',
      notes: '',
      paymentMethod: '',
      paymentDate: '',
      amountPaid: ''
    });
    setSelectedTemplate(null);
    onDocOpen();
  };

  const openEditDocument = (doc) => {
    setEditingDocument(doc);
    setDocForm({
      type: doc.type || 'QUOTE',
      number: doc.number || '',
      title: doc.title || '',
      description: doc.description || '',
      date: (doc.date || new Date().toISOString()).slice(0,10),
      dueDate: doc.dueDate ? doc.dueDate.slice(0,10) : '',
      amountExcludingTax: String(doc.amountExcludingTax ?? ''),
      taxRate: doc.taxRate || 20,
      taxAmount: doc.taxAmount || 0,
      amount: String(doc.amount ?? ''),
      status: doc.quoteStatus || doc.invoiceStatus || doc.status || 'DRAFT',
      eventId: doc.eventId || '',
      memberId: doc.memberId || '',
      destinataireName: doc.destinataireName || '',
      destinataireAdresse: doc.destinataireAdresse || '',
      notes: doc.notes || '',
      paymentMethod: doc.paymentMethod || '',
      paymentDate: doc.paymentDate ? doc.paymentDate.slice(0,10) : '',
      amountPaid: String(doc.amountPaid ?? '')
    });
    setSelectedTemplate(null);
    onDocOpen();
  };

  const saveDocument = async () => {
    try {
      // Validation
      if (!docForm.number || !docForm.title) {
        toast({ status: 'warning', title: 'Erreur', description: 'Numéro et titre obligatoires' });
        return;
      }

      const isEdit = !!editingDocument?.id;
      const paths = isEdit
        ? buildPathCandidates(`/api/finance/documents/${encodeURIComponent(editingDocument.id)}`)
        : buildPathCandidates('/api/finance/documents');
      
      // Pour associations: pas de TVA (0%)
      const amount = parseFloat(docForm.amount) || 0;

      const payload = {
        type: docForm.type,
        number: docForm.number,
        title: docForm.title,
        description: docForm.description || null,
        date: docForm.date,
        dueDate: docForm.dueDate || null,
        amountExcludingTax: amount,  // Pas de TVA
        taxRate: 0,                   // TVA 0% pour associations
        taxAmount: 0,                 // Pas de calcul TVA
        amount: amount,                // Montant = montant seul
        quoteStatus: docForm.type === 'QUOTE' ? docForm.status : null,
        invoiceStatus: docForm.type === 'INVOICE' ? docForm.status : null,
        eventId: docForm.eventId || null,
        memberId: docForm.memberId || null,
        destinataireName: docForm.destinataireName || null,
        destinataireAdresse: docForm.destinataireAdresse || null,
        notes: docForm.notes || null,
        paymentMethod: docForm.paymentMethod || null,
        paymentDate: docForm.paymentDate || null,
        amountPaid: parseFloat(docForm.amountPaid || 0)
      };

      const saved = await fetchJsonFirst(paths, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // RFC: recharger
      await loadDocuments();
      onDocClose();
      toast({ status: 'success', title: isEdit ? 'Document modifié' : 'Document créé' });
    } catch (e) {
      console.error('❌ Erreur création document:', e);
      
      // Afficher l'erreur API si disponible
      if (e.message) {
        toast({ status: 'error', title: 'Erreur', description: `API: ${e.message}` });
        return;
      }

      // Fallback local si vraiment impossible
      const genId = editingDocument?.id || `local-${Date.now()}`;
      const amount = parseFloat(docForm.amount) || 0;

      const newDoc = {
        ...docForm,
        id: genId,
        amountExcludingTax: amount,
        taxRate: 0,
        taxAmount: 0,
        amount: amount,
        quoteStatus: docForm.type === 'QUOTE' ? docForm.status : null,
        invoiceStatus: docForm.type === 'INVOICE' ? docForm.status : null,
      };

      const updated = editingDocument
        ? documents.map(d => d.id === editingDocument.id ? newDoc : d)
        : [newDoc, ...documents];
      writeDocsLocal(updated);
      setDocuments(updated);
      onDocClose();
      toast({ status: 'info', title: 'Document enregistré en local' });
    }
  };

  const deleteDocument = async (id) => {
    try {
      const paths = buildPathCandidates(`/api/finance/documents/${encodeURIComponent(id)}`);
      await deleteFirst(paths, { 'Authorization': `Bearer ${localStorage.getItem('token')}` });
      await loadDocuments();
      toast({ status: 'success', title: 'Document supprimé' });
    } catch (e) {
      // Fallback local
      const updated = documents.filter(d => d.id !== id);
      writeDocsLocal(updated);
      setDocuments(updated);
      toast({ status: 'info', title: 'Document supprimé (local)' });
    }
  };

  const updateDocumentStatus = async (id, newStatus) => {
    try {
      const paths = buildPathCandidates(`/api/finance/documents/${encodeURIComponent(id)}/status`);
      const updated = await patchFirst(paths, 
        { status: newStatus },
        { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      );
      
      // Mettre à jour localement
      setDocuments(prev => 
        prev.map(d => d.id === id ? updated : d)
      );
      
      const statusLabel = id.type === 'QUOTE' ? 
        {DRAFT:'Brouillon',SENT:'Envoyé',ACCEPTED:'Accepté',REFUSED:'Refusé',REEDITED:'Réédité'}[newStatus] :
        {DRAFT:'Brouillon',SENT:'Envoyé',ACCEPTED:'Accepté',PENDING_PAYMENT:'En attente',PAID:'Payé',DEPOSIT_PAID:'Accompte'}[newStatus];
      
      toast({ status: 'success', title: 'Statut mis à jour', description: `→ ${statusLabel}` });
      await loadDocuments();
    } catch (e) {
      console.error('Erreur changement statut:', e);
      toast({ status: 'error', title: 'Erreur', description: 'Impossible de mettre à jour le statut' });
    }
  };

  const openReissueQuoteDialog = (doc) => {
    setEditingDocument(doc);
    setDocForm({
      type: 'QUOTE',
      number: `${doc.number}-REV`,
      title: `${doc.title} (Révision)`,
      date: new Date().toISOString().split('T')[0],
      amount: doc.amount,
      status: 'DRAFT',
      eventId: doc.eventId || ''
    });
    onDocOpen();
  };

  const handleAddScheduledOperation = async () => {
    const isEcheancierMode = activeTab === 2;
    if (!newScheduled.amount || !newScheduled.description || !newScheduled.nextDate || (!isEcheancierMode && !newScheduled.type) || (!isEcheancierMode && !newScheduled.frequency)) {
      toast({
        status: "warning",
        title: "Champs requis",
        description: "Tous les champs sont obligatoires",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(apiUrl('/api/finance/scheduled-operations'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newScheduled,
          type: isEcheancierMode ? 'SCHEDULED_PAYMENT' : newScheduled.type,
          frequency: isEcheancierMode ? 'MONTHLY' : newScheduled.frequency,
          amount: parseFloat(newScheduled.amount),
          totalAmount: newScheduled.totalAmount !== '' && newScheduled.totalAmount !== null ? parseFloat(newScheduled.totalAmount) : undefined
        })
      });
      if (response.ok) {
        toast({
          status: "success",
          title: isEcheancierMode ? "Échéancier créé" : "Opération programmée",
          description: isEcheancierMode ? "L'échéancier a été créé avec succès" : "L'opération a été programmée avec succès",
          duration: 3000,
          isClosable: true
        });
        
        setNewScheduled({
          type: 'SCHEDULED_PAYMENT',
          amount: '',
          description: '',
          frequency: 'MONTHLY',
          nextDate: new Date().toISOString().split('T')[0],
          totalAmount: ''
        });
        
        onScheduledClose();
        
        // Recharger les données
        await loadScheduledOperations();
      } else {
        const errorData = await response.json();
        toast({
          status: "error",
          title: "Erreur",
          description: errorData.message || "Impossible de programmer l'opération",
          duration: 4000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('❌ Erreur programmation opération:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible de programmer l'opération. Vérifiez votre connexion.",
        duration: 4000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteScheduledOperation = async (id) => {
    try {
      if (!confirm('Supprimer cette opération programmée et tous ses paiements ?')) return;
      const response = await fetch(apiUrl(`/api/finance/scheduled-operations/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        toast({ status: 'success', title: 'Opération supprimée' });
        await loadScheduledOperations();
      } else {
        const err = await response.json().catch(()=>({}));
        toast({ status: 'error', title: 'Erreur', description: err.message || 'Suppression impossible' });
      }
    } catch (e) {
      console.error('❌ Erreur suppression opération programmée:', e);
      toast({ status: 'error', title: 'Erreur', description: 'Suppression impossible' });
    }
  };

  const toggleScheduledOperation = async (id, currentStatus) => {
    try {
      const response = await fetch(apiUrl(`/api/finance/scheduled-operations/${id}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !currentStatus
        })
      });

      if (response.ok) {
        toast({
          status: "success",
          title: `Opération ${!currentStatus ? 'activée' : 'désactivée'}`,
          duration: 2000,
          isClosable: true
        });
        
        // Recharger les données
        await loadScheduledOperations();
      }
    } catch (error) {
      console.error('❌ Erreur toggle opération:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible de modifier le statut de l'opération",
        duration: 4000,
        isClosable: true
      });
    }
  };

  const openDeclarePayment = (operation) => {
    setSelectedOperation(operation);
    setPaymentAmount(operation.amount || '');
    const baseDate = operation.nextDate ? new Date(operation.nextDate) : new Date();
    const period = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;
    setPaymentPeriod(period);
    setPaymentFile(null);
    onDeclarePaymentOpen();
  };

  const submitPaymentDeclaration = async () => {
    if (!selectedOperation) return;
    if (!paymentPeriod || !/^\d{4}-\d{2}$/.test(paymentPeriod)) {
      toast({ status: 'warning', title: 'Période invalide', description: 'Format attendu: YYYY-MM' });
      return;
    }
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      toast({ status: 'warning', title: 'Montant invalide', description: 'Veuillez saisir un montant valide' });
      return;
    }
    try {
      setLoading(true);
      const form = new FormData();
      form.append('period', paymentPeriod);
      form.append('amount', String(parseFloat(paymentAmount)));
      if (paymentFile) form.append('attachment', paymentFile);
      const response = await fetch(apiUrl(`/api/finance/scheduled-operations/${selectedOperation.id}/payments`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: form
      });
      if (response.ok) {
        toast({ status: 'success', title: 'Mensualité déclarée payée' });
        onDeclarePaymentClose();
        // Recharger les données affectées avec isole error handling
        await Promise.allSettled([
          loadScheduledOperations(), 
          loadTransactions(), 
          loadBalance()
        ]);
      } else {
        const err = await response.json().catch(() => ({}));
        toast({ status: 'error', title: 'Erreur', description: err.message || 'Déclaration impossible' });
      }
    } catch (e) {
      console.error('❌ Erreur déclaration paiement:', e);
      toast({ status: 'error', title: 'Erreur', description: 'Déclaration impossible' });
    } finally {
      setLoading(false);
    }
  };

  const openPaymentsList = async (operation) => {
    setSelectedOperation(operation);
    await loadPaymentsForOperation(operation.id);
    onPaymentsListOpen();
  };

  // Charger les données au montage du composant
  useEffect(() => {
    const initializeData = async () => {
      console.log('🔄 Initialisation des données AdminFinance...');
      
      // Charger en parallèle avec error isolation
      const results = await Promise.allSettled([
        loadUserInfo(),
        loadFinancialData(),
        loadTemplates()
      ]);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ Initialisation: ${successCount}/3 sources réussies`);
    };
    
    initializeData().catch(err => console.error('❌ Erreur init globale:', err));
  }, []);

  // Re-calculer les stats quand les données changent
  useEffect(() => {
    if (transactions.length >= 0 && scheduledOperations.length >= 0) {
      calculateStats();
    }
  }, [transactions.length, scheduledOperations.length]);

  // === FONCTIONS SIMULATION ===
  const createSimulationScenario = async () => {
    if (!newScenario.name || !newScenario.description) {
      toast({
        status: "warning",
        title: "Champs requis",
        description: "Nom et description sont obligatoires",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(apiUrl('/api/finance/simulations'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newScenario)
      });

      if (response.ok) {
        const data = await response.json();
        
        toast({
          status: "success",
          title: "Scénario créé",
          description: "Vous pouvez maintenant ajouter les recettes et dépenses",
          duration: 4000,
          isClosable: true
        });
        
        setNewScenario({
          name: '',
          description: '',
          projectionMonths: 12
        });
        
        await loadSimulationData();
        onSimulationClose();
        
        // Ouvrir automatiquement l'édition du nouveau scénario
        setEditingScenario(data.scenario);
        onEditScenarioOpen();
      } else {
        const errorData = await response.json();
        toast({
          status: "error",
          title: "Erreur",
          description: errorData.message || "Impossible de créer le scénario",
          duration: 4000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('❌ Erreur création scénario:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible de créer le scénario. Vérifiez votre connexion.",
        duration: 4000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  const loadScenarioDetails = async (scenarioId) => {
    try {
      const response = await fetch(apiUrl(`/api/finance/simulations/${scenarioId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEditingScenario(data.scenario);
      } else {
        toast({
          status: "error",
          title: "Erreur",
          description: "Impossible de charger les détails du scénario",
          duration: 4000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('❌ Erreur chargement détails scénario:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible de charger les détails du scénario",
        duration: 4000,
        isClosable: true
      });
    }
  };

  const addIncomeItem = async () => {
    if (!newIncomeItem.description || !newIncomeItem.amount) {
      toast({
        status: "warning",
        title: "Champs requis",
        description: "Description et montant sont obligatoires",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/finance/simulations/${editingScenario.id}/income`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newIncomeItem,
          amount: parseFloat(newIncomeItem.amount)
        })
      });

      if (response.ok) {
        toast({
          status: "success",
          title: "Recette ajoutée",
          duration: 2000,
          isClosable: true
        });
        
        setNewIncomeItem({
          description: '',
          amount: '',
          category: 'ADHESION',
          frequency: 'MONTHLY'
        });
        
        await loadScenarioDetails(editingScenario.id);
      } else {
        const errorData = await response.json();
        toast({
          status: "error",
          title: "Erreur",
          description: errorData.message || "Impossible d'ajouter la recette",
          duration: 4000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('❌ Erreur ajout recette:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible d'ajouter la recette",
        duration: 4000,
        isClosable: true
      });
    }
  };

  const addExpenseItem = async () => {
    if (!newExpenseItem.description || !newExpenseItem.amount) {
      toast({
        status: "warning",
        title: "Champs requis",
        description: "Description et montant sont obligatoires",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/finance/simulations/${editingScenario.id}/expense`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newExpenseItem,
          amount: parseFloat(newExpenseItem.amount)
        })
      });

      if (response.ok) {
        toast({
          status: "success",
          title: "Dépense ajoutée",
          duration: 2000,
          isClosable: true
        });
        
        setNewExpenseItem({
          description: '',
          amount: '',
          category: 'MAINTENANCE',
          frequency: 'MONTHLY'
        });
        
        await loadScenarioDetails(editingScenario.id);
      } else {
        const errorData = await response.json();
        toast({
          status: "error",
          title: "Erreur",
          description: errorData.message || "Impossible d'ajouter la dépense",
          duration: 4000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('❌ Erreur ajout dépense:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible d'ajouter la dépense",
        duration: 4000,
        isClosable: true
      });
    }
  };

  const removeIncomeItem = async (itemId) => {
    try {
      const response = await fetch(apiUrl(`/api/finance/simulations/income/${itemId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          status: "success",
          title: "Recette supprimée",
          duration: 2000,
          isClosable: true
        });
        
        await loadScenarioDetails(editingScenario.id);
      } else {
        toast({
          status: "error",
          title: "Erreur",
          description: "Impossible de supprimer la recette",
          duration: 4000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('❌ Erreur suppression recette:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible de supprimer la recette",
        duration: 4000,
        isClosable: true
      });
    }
  };

  const removeExpenseItem = async (itemId) => {
    try {
      const response = await fetch(apiUrl(`/api/finance/simulations/expense/${itemId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          status: "success",
          title: "Dépense supprimée",
          duration: 2000,
          isClosable: true
        });
        
        await loadScenarioDetails(editingScenario.id);
      } else {
        toast({
          status: "error",
          title: "Erreur",
          description: "Impossible de supprimer la dépense",
          duration: 4000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('❌ Erreur suppression dépense:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible de supprimer la dépense",
        duration: 4000,
        isClosable: true
      });
    }
  };

  const runSimulation = async (scenarioId) => {
    try {
      setLoading(true);
      
      const response = await fetch(apiUrl(`/api/finance/simulations/${scenarioId}/run`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSimulationResults(data.simulation);
        onSimulationResultsOpen();
      } else {
        const errorData = await response.json();
        toast({
          status: "error",
          title: "Erreur",
          description: errorData.message || "Impossible d'exécuter la simulation",
          duration: 4000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('❌ Erreur exécution simulation:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible d'exécuter la simulation",
        duration: 4000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteScenario = async (scenarioId) => {
    try {
      const response = await fetch(apiUrl(`/api/finance/simulations/${scenarioId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          status: "success",
          title: "Scénario supprimé",
          duration: 2000,
          isClosable: true
        });
        
        await loadSimulationData();
      } else {
        toast({
          status: "error",
          title: "Erreur",
          description: "Impossible de supprimer le scénario",
          duration: 4000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('❌ Erreur suppression scénario:', error);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible de supprimer le scénario",
        duration: 4000,
        isClosable: true
      });
    }
  };

  const downloadScenarioPdf = async (scenarioId, name = 'simulation') => {
    try {
      const response = await fetch(apiUrl(`/api/finance/simulations/${scenarioId}/report.pdf`), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        toast({ status: 'error', title: 'Export PDF', description: 'Échec de la génération du PDF' });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safe = (name || 'simulation').replace(/[^a-z0-9-_]+/gi, '_');
      a.download = `simulation-${safe}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ status: 'success', title: 'Export PDF', description: 'Téléchargement démarré' });
    } catch (e) {
      console.error('❌ Erreur export PDF:', e);
      toast({ status: 'error', title: 'Export PDF', description: 'Erreur lors du téléchargement' });
    }
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* En-tête avec configuration */}
        <HStack justify="space-between" align="center">
          <Heading size="lg" color="blue.600">
            💰 Gestion Financière
          </Heading>
          <HStack>
            <IconButton
              icon={<FiRefreshCw />}
              onClick={loadFinancialData}
              isLoading={loading}
              variant="outline"
              size="sm"
            />
            <IconButton
              icon={<FiSettings />}
              onClick={onConfigOpen}
              variant="outline"
              size="sm"
              colorScheme="purple"
            />
            <Badge
              colorScheme={balance >= 0 ? "green" : "red"}
              fontSize="lg"
              p={2}
              borderRadius="md"
              cursor="pointer"
              onClick={() => setShowBalanceConfig(!showBalanceConfig)}
            >
              {isBalanceLocked ? <FiLock style={{marginRight: '0.5rem', display: 'inline-block'}} /> : <FiUnlock style={{marginRight: '0.5rem', display: 'inline-block'}} />}
              Solde: {formatCurrency(balance)}
            </Badge>
          </HStack>
        </HStack>

        {/* Configuration rapide du solde */}
        {showBalanceConfig && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <VStack align="stretch" spacing={3} flex={1}>
              <Text fontWeight="bold">Configuration du solde (Code requis)</Text>
              <HStack>
                <HStack>
                  <Text fontSize="sm">Code:</Text>
                  <HStack>
                    <PinInput value={configCode} onChange={setConfigCode} type="number">
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                    </PinInput>
                  </HStack>
                </HStack>
                <NumberInput
                  value={newBalance}
                  onChange={setNewBalance}
                  precision={2}
                  step={0.01}
                  width="150px"
                >
                  <NumberInputField placeholder="Nouveau solde" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Input
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  placeholder="Motif de régularisation"
                  width="280px"
                  size="sm"
                />
                <Button
                  size="sm"
                  colorScheme="orange"
                  onClick={handleBalanceConfig}
                  isLoading={loading}
                  leftIcon={<FiCheck />}
                >
                  Appliquer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowBalanceConfig(false)}
                  leftIcon={<FiX />}
                >
                  Annuler
                </Button>
              </HStack>
            </VStack>
          </Alert>
        )}

        {/* Statistiques étendues */}
        <SimpleGrid columns={{ base: 2, md: 6 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Solde Actuel</StatLabel>
                <StatNumber color={balance >= 0 ? "green.600" : "red.600"}>
                  {formatCurrency(balance)}
                </StatNumber>
                {lastBalanceUpdate && (
                  <StatHelpText fontSize="xs">
                    MAJ: {formatDate(lastBalanceUpdate)}
                  </StatHelpText>
                )}
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Recettes Total</StatLabel>
                <StatNumber color="green.600">
                  {formatCurrency(stats.totalCredits)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  Entrées
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Dépenses Total</StatLabel>
                <StatNumber color="red.600">
                  {formatCurrency(stats.totalDebits)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="decrease" />
                  Sorties
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Ce Mois</StatLabel>
                <StatNumber color={stats.monthlyBalance >= 0 ? "green.600" : "red.600"}>
                  {formatCurrency(stats.monthlyBalance)}
                </StatNumber>
                <StatHelpText>
                  <StatArrow type={stats.monthlyBalance >= 0 ? "increase" : "decrease"} />
                  Résultat mensuel
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Programmé/Mois</StatLabel>
                <StatNumber color={stats.scheduledMonthlyImpact >= 0 ? "green.600" : "red.600"}>
                  {formatCurrency(stats.scheduledMonthlyImpact)}
                </StatNumber>
                <StatHelpText>
                  {stats.scheduledCount} opérations
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          
        </SimpleGrid>

        {/* Onglets étendus */}
        <Tabs index={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab>💳 Transactions</Tab>
            <Tab>📄 Devis & Factures</Tab>
            <Tab>⏰ Échéanciers</Tab>
            <Tab>🏦 Paiements programmés</Tab>
            {/* Nouvel onglet Notes de frais */}
            <Tab>🧾 Notes de frais</Tab>
            <Tab>🧮 Simulations</Tab>
            <Tab>📊 Rapports</Tab>
            <Tab>⚙️ Configuration</Tab>
          </TabList>

          <TabPanels>
            {/* Onglet Transactions */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md">Transactions</Heading>
                  <HStack>
                    <Button
                      leftIcon={<FiUpload />}
                      colorScheme="teal"
                      variant="outline"
                      onClick={onBankImportOpen}
                      size="sm"
                    >
                      Importer relevé
                    </Button>
                    <Button
                      leftIcon={<FiPlus />}
                      colorScheme="blue"
                      onClick={onTransactionOpen}
                      size="sm"
                    >
                      Nouvelle transaction
                    </Button>
                  </HStack>
                </HStack>

                {loading ? (
                  <Box textAlign="center" p={8}>
                    <Spinner size="lg" />
                    <Text mt={2}>Chargement...</Text>
                  </Box>
                ) : transactions.length === 0 ? (
                  <Alert status="info">
                    <AlertIcon />
                    Aucune transaction enregistrée
                  </Alert>
                ) : (
                  <Card>
                    <CardBody p={0}>
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Date</Th>
                            <Th>Description</Th>
                            <Th>Catégorie</Th>
                            <Th>Document</Th>
                            <Th>Type</Th>
                            <Th isNumeric>Montant</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {transactions.map((transaction, index) => (
                            <Tr key={transaction.id || index}>
                              <Td>{formatDate(transaction.date || transaction.createdAt)}</Td>
                              <Td>{transaction.description}</Td>
                              <Td>
                                <Badge size="sm" variant="outline">
                                  {getCategoryLabel(transaction.category)}
                                </Badge>
                              </Td>
                              <Td>
                                {(() => {
                                  const doc = documents.find(d => d.id === transaction.documentId);
                                  return doc ? (
                                    <HStack spacing={2}>
                                      <Badge colorScheme={doc.type === 'INVOICE' ? 'purple' : 'gray'}>
                                        {doc.type === 'INVOICE' ? 'Facture' : 'Devis'}
                                      </Badge>
                                      <Text fontSize="sm">{doc.number || doc.title || doc.id}</Text>
                                    </HStack>
                                  ) : <Text fontSize="sm" color="gray.500">—</Text>;
                                })()}
                              </Td>
                              <Td>
                                <Badge
                                  colorScheme={transaction.type === 'CREDIT' ? 'green' : 'red'}
                                  size="sm"
                                >
                                  {transaction.type === 'CREDIT' ? 'Recette' : 'Dépense'}
                                </Badge>
                              </Td>
                              <Td isNumeric>
                                <Text
                                  color={transaction.type === 'CREDIT' ? 'green.600' : 'red.600'}
                                  fontWeight="bold"
                                >
                                  {transaction.type === 'CREDIT' ? '+' : '-'}
                                  {formatCurrency(Math.abs(transaction.amount))}
                                </Text>
                              </Td>
                              <Td>
                                <Menu>
                                  <MenuButton
                                    as={IconButton}
                                    icon={<FiMoreHorizontal />}
                                    variant="ghost"
                                    size="sm"
                                  />
                                  <MenuList>
                                    <MenuItem icon={<FiEdit3 />} onClick={() => openEditTransaction(transaction)}>Modifier</MenuItem>
                                    <MenuItem onClick={() => openLinkDocument(transaction)}>Lier à devis/facture…</MenuItem>
                                    <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => deleteTransaction(transaction.id)}>Supprimer</MenuItem>
                                  </MenuList>
                                </Menu>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>

            {/* Onglet Devis & Factures */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md">Devis & Factures</Heading>
                  <Button leftIcon={<FiPlus />} colorScheme="purple" size="sm" onClick={openCreateDocument}>Nouveau document</Button>
                </HStack>

                {loading ? (
                  <Box textAlign="center" p={8}><Spinner size="lg" /><Text mt={2}>Chargement…</Text></Box>
                ) : (
                  <Card>
                    <CardBody p={0}>
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Type</Th>
                            <Th>Numéro</Th>
                            <Th>Titre</Th>
                            <Th>Date</Th>
                            <Th isNumeric>Montant</Th>
                            <Th>Événement</Th>
                            <Th>Statut</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {documents.map((doc) => (
                            <Tr key={doc.id}>
                              <Td>
                                <Badge colorScheme={doc.type === 'INVOICE' ? 'purple' : 'gray'}>
                                  {doc.type === 'INVOICE' ? 'Facture' : 'Devis'}
                                </Badge>
                              </Td>
                              <Td>{doc.number || '—'}</Td>
                              <Td>{doc.title || '—'}</Td>
                              <Td>{formatDate(doc.date)}</Td>
                              <Td isNumeric>{formatCurrency(Number(doc.amount || 0))}</Td>
                              <Td>{doc.eventId ? <Badge>{doc.eventId}</Badge> : <Text fontSize="sm" color="gray.500">—</Text>}</Td>
                              <Td>
                                <Badge
                                  colorScheme={
                                    doc.type === 'INVOICE' ? 
                                      {DRAFT:'gray',SENT:'blue',ACCEPTED:'cyan',PENDING_PAYMENT:'orange',PAID:'green',DEPOSIT_PAID:'yellow'}[doc.invoiceStatus||'gray'] :
                                      {DRAFT:'gray',SENT:'blue',ACCEPTED:'green',REFUSED:'red',REEDITED:'orange'}[doc.quoteStatus||'gray']
                                  }
                                  variant="subtle"
                                >
                                  {doc.type === 'INVOICE' ? 
                                    {DRAFT:'Brouillon',SENT:'Envoyé',ACCEPTED:'Accepté',PENDING_PAYMENT:'En attente de paiement',PAID:'Payé',DEPOSIT_PAID:'Accompte payé'}[doc.invoiceStatus||'DRAFT'] :
                                    {DRAFT:'Brouillon',SENT:'Envoyé',ACCEPTED:'Accepté',REFUSED:'Refusé',REEDITED:'Réédité'}[doc.quoteStatus||'DRAFT']
                                  }
                                </Badge>
                              </Td>
                              <Td>
                                <Menu>
                                  <MenuButton as={IconButton} icon={<FiMoreHorizontal />} variant="ghost" size="sm" />
                                  <MenuList>
                                    <MenuItem icon={<FiEdit3 />} onClick={() => openEditDocument(doc)}>Modifier</MenuItem>
                                    
                                    <MenuDivider />
                                    <MenuOptionGroup title="Changer le statut">
                                      {doc.type === 'QUOTE' ? (
                                        <>
                                          <MenuItemOption onClick={() => updateDocumentStatus(doc.id, 'DRAFT')}>Brouillon</MenuItemOption>
                                          <MenuItemOption onClick={() => updateDocumentStatus(doc.id, 'SENT')}>Envoyé</MenuItemOption>
                                          <MenuItemOption onClick={() => updateDocumentStatus(doc.id, 'ACCEPTED')}>Accepté</MenuItemOption>
                                          <MenuItemOption onClick={() => updateDocumentStatus(doc.id, 'REFUSED')}>Refusé</MenuItemOption>
                                          <MenuItemOption onClick={() => openReissueQuoteDialog(doc)}>Réédité vers un nouveau</MenuItemOption>
                                        </>
                                      ) : (
                                        <>
                                          <MenuItemOption onClick={() => updateDocumentStatus(doc.id, 'DRAFT')}>Brouillon</MenuItemOption>
                                          <MenuItemOption onClick={() => updateDocumentStatus(doc.id, 'SENT')}>Envoyé</MenuItemOption>
                                          <MenuItemOption onClick={() => updateDocumentStatus(doc.id, 'ACCEPTED')}>Accepté</MenuItemOption>
                                          <MenuItemOption onClick={() => updateDocumentStatus(doc.id, 'PENDING_PAYMENT')}>En attente de paiement</MenuItemOption>
                                          <MenuItemOption onClick={() => updateDocumentStatus(doc.id, 'PAID')}>Payé</MenuItemOption>
                                          <MenuItemOption onClick={() => updateDocumentStatus(doc.id, 'DEPOSIT_PAID')}>Accompte payé</MenuItemOption>
                                        </>
                                      )}
                                    </MenuOptionGroup>
                                    
                                    <MenuDivider />
                                    <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => deleteDocument(doc.id)}>Supprimer</MenuItem>
                                  </MenuList>
                                </Menu>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>

            {/* Onglet Échéanciers */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md">Échéanciers</Heading>
                  <Button
                    leftIcon={<FiPlus />}
                    colorScheme="purple"
                    onClick={onScheduledOpen}
                    size="sm"
                  >
                    Nouvel échéancier
                  </Button>
                </HStack>

                {loading ? (
                  <Box textAlign="center" p={8}>
                    <Spinner size="lg" />
                    <Text mt={2}>Chargement...</Text>
                  </Box>
                ) : (
                  (() => {
                    const list = scheduledOperations.filter(op => op.type === 'SCHEDULED_PAYMENT' && String(op.frequency||'').toUpperCase() === 'MONTHLY');
                    return list.length === 0 ? (
                      <Alert status="info">
                        <AlertIcon />
                        Aucun échéancier (mensualités) enregistré
                      </Alert>
                    ) : (
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                        {list.map((op, idx) => {
                          const hasTotal = Number.isFinite(op.totalAmount) && op.totalAmount > 0;
                          const paid = hasTotal ? Math.max(op.totalAmount - (op.remainingTotalAmount || 0), 0) : null;
                          const hasYearPlan = Number.isFinite(op.plannedCountYear) && op.plannedCountYear > 0;
                          const yearPaidCount = hasYearPlan ? Math.max((op.plannedCountYear || 0) - (op.remainingCountYear || 0), 0) : null;
                          const percentYear = hasYearPlan ? Math.max(0, Math.min(1, yearPaidCount / op.plannedCountYear)) : null;
                          const percent = hasTotal ? Math.max(0, Math.min(1, paid / op.totalAmount)) : percentYear;
                          const gaugeColor = percent == null ? 'gray.400' : percent >= 0.75 ? 'red' : percent >= 0.4 ? 'orange' : 'red';
                          return (
                            <Card key={op.id || idx}>
                              <CardHeader>
                                <VStack align="start" spacing={1}>
                                  <Heading size="sm" noOfLines={2}>{op.description}</Heading>
                                  <HStack>
                                    <Badge variant="outline">Mensuel</Badge>
                                    <Badge colorScheme="red">DÉPENSE</Badge>
                                  </HStack>
                                </VStack>
                              </CardHeader>
                              <CardBody>
                                <HStack align="center" spacing={4}>
                                  <Box minW="120px" w="120px">
                                    <SemicircleGauge percent={percent} color={gaugeColor} />
                                  </Box>
                                  <VStack align="start" spacing={1} flex={1}>
                                    <Text fontSize="sm" color="gray.600">Prochaine date</Text>
                                    <Text fontWeight="medium">{op.nextDate ? formatDate(op.nextDate) : '—'}</Text>
                                    <Text fontSize="sm" color="gray.600">Mensualité</Text>
                                    <Text fontWeight="bold" color="red.600">- {formatCurrency(Math.abs(op.amount))}</Text>
                                    <HStack spacing={3}>
                                      <Badge variant="subtle" colorScheme="blue">Payées: {op.paymentsCount ?? 0}</Badge>
                                      {hasTotal && (
                                        <Badge variant="subtle">Restant total: {formatCurrency(op.remainingTotalAmount || 0)}</Badge>
                                      )}
                                      {!hasTotal && hasYearPlan && (
                                        <Badge variant="subtle" colorScheme="purple">Payées cette année: {yearPaidCount}</Badge>
                                      )}
                                    </HStack>
                                    {op.monthsRemainingTotal && (
                                      <Text fontSize="sm" color="gray.600">Mensualités restantes: {op.monthsRemainingTotal}</Text>
                                    )}
                                    {op.estimatedEndDate && (
                                      <Text fontSize="sm" color="gray.600">Fin estimée: {formatDate(op.estimatedEndDate)}</Text>
                                    )}
                                  </VStack>
                                </HStack>
                              </CardBody>
                              <CardBody pt={0}>
                                <HStack>
                                  <Button size="sm" onClick={() => openDeclarePayment(op)}>Déclarer payé</Button>
                                  <Button size="sm" variant="outline" onClick={() => openPaymentsList(op)}>Voir paiements</Button>
                                  <IconButton aria-label="Supprimer" icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red" onClick={() => deleteScheduledOperation(op.id)} />
                                </HStack>
                              </CardBody>
                            </Card>
                          );
                        })}
                      </SimpleGrid>
                    );
                  })()
                )}
              </VStack>
            </TabPanel>

            {/* Onglet Paiements programmés (mensuels) */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md">Paiements programmés (mensuels)</Heading>
                  <Button
                    leftIcon={<FiPlus />}
                    colorScheme="purple"
                    onClick={onScheduledOpen}
                    size="sm"
                  >
                    Ajouter un prélèvement
                  </Button>
                </HStack>

                {loading ? (
                  <Box textAlign="center" p={8}>
                    <Spinner size="lg" />
                    <Text mt={2}>Chargement...</Text>
                  </Box>
                ) : (
                  (() => {
                    const list = scheduledOperations.filter(op => op.type === 'SCHEDULED_PAYMENT' && String(op.frequency||'').toUpperCase() === 'MONTHLY');
                    return list.length === 0 ? (
                      <Alert status="info">
                        <AlertIcon />
                        Aucun paiement mensuel programmé
                      </Alert>
                    ) : (
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                        {list.map((op, idx) => {
                          const hasTotal = Number.isFinite(op.totalAmount) && op.totalAmount > 0;
                          const paid = hasTotal ? Math.max(op.totalAmount - (op.remainingTotalAmount || 0), 0) : null;
                          const hasYearPlan = Number.isFinite(op.plannedCountYear) && op.plannedCountYear > 0;
                          const yearPaidCount = hasYearPlan ? Math.max((op.plannedCountYear || 0) - (op.remainingCountYear || 0), 0) : null;
                          const percentYear = hasYearPlan ? Math.max(0, Math.min(1, yearPaidCount / op.plannedCountYear)) : null;
                          const percent = hasTotal ? Math.max(0, Math.min(1, paid / op.totalAmount)) : percentYear;
                          const gaugeColor = percent == null ? 'gray.400' : percent >= 0.75 ? 'red' : percent >= 0.4 ? 'orange' : 'red';
                          return (
                            <Card key={op.id || idx}>
                              <CardHeader>
                                <VStack align="start" spacing={1}>
                                  <Heading size="sm" noOfLines={2}>{op.description}</Heading>
                                  <HStack>
                                    <Badge variant="outline">Mensuel</Badge>
                                    <Badge colorScheme="red">DÉPENSE</Badge>
                                  </HStack>
                                </VStack>
                              </CardHeader>
                              <CardBody>
                                <HStack align="center" spacing={4}>
                                  <Box minW="120px" w="120px">
                                    <SemicircleGauge percent={percent} color={gaugeColor} />
                                  </Box>
                                  <VStack align="start" spacing={1} flex={1}>
                                    <Text fontSize="sm" color="gray.600">Prochaine date</Text>
                                    <Text fontWeight="medium">{op.nextDate ? formatDate(op.nextDate) : '—'}</Text>
                                    <Text fontSize="sm" color="gray.600">Mensualité</Text>
                                    <Text fontWeight="bold" color="red.600">- {formatCurrency(Math.abs(op.amount))}</Text>
                                    <HStack spacing={3}>
                                      <Badge variant="subtle" colorScheme="blue">Payées: {op.paymentsCount ?? 0}</Badge>
                                      {hasTotal && (
                                        <Badge variant="subtle">Restant total: {formatCurrency(op.remainingTotalAmount || 0)}</Badge>
                                      )}
                                      {!hasTotal && hasYearPlan && (
                                        <Badge variant="subtle" colorScheme="purple">Payées cette année: {yearPaidCount}</Badge>
                                      )}
                                    </HStack>
                                    {op.estimatedEndDate && (
                                      <Text fontSize="sm" color="gray.600">Fin estimée: {formatDate(op.estimatedEndDate)}</Text>
                                    )}
                                  </VStack>
                                </HStack>
                              </CardBody>
                              <CardBody pt={0}>
                                <HStack>
                                  <Button size="sm" onClick={() => openDeclarePayment(op)}>Déclarer payé</Button>
                                  <Button size="sm" variant="outline" onClick={() => openPaymentsList(op)}>Voir paiements</Button>
                                  <IconButton aria-label="Supprimer" icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red" onClick={() => deleteScheduledOperation(op.id)} />
                                </HStack>
                              </CardBody>
                            </Card>
                          );
                        })}
                      </SimpleGrid>
                    );
                  })()
                )}
              </VStack>
            </TabPanel>

            {/* Onglet Notes de frais */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md">Notes de frais</Heading>
                </HStack>

                {/* Formulaire de création */}
                <Card>
                  <CardBody>
                    <HStack spacing={3} align="end">
                      <FormControl isRequired>
                        <FormLabel>Description</FormLabel>
                        <Input
                          value={newExpenseReport.description}
                          onChange={(e) => setNewExpenseReport(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Ex: Achat fournitures"
                        />
                      </FormControl>
                      <FormControl isRequired width="220px">
                        <FormLabel>Montant (€)</FormLabel>
                        <NumberInput
                          value={newExpenseReport.amount}
                          onChange={(v) => setNewExpenseReport(prev => ({ ...prev, amount: v }))}
                          precision={2}
                          step={0.01}
                        >
                          <NumberInputField placeholder="0.00" />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                      <FormControl width="220px">
                        <FormLabel>Date</FormLabel>
                        <Input
                          type="date"
                          value={newExpenseReport.date}
                          onChange={(e) => setNewExpenseReport(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </FormControl>
                      <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={createExpenseReport}>
                        Ajouter
                      </Button>
                    </HStack>
                  </CardBody>
                </Card>

                {/* Liste des notes de frais */}
                {expenseReports.length === 0 ? (
                  <Alert status="info">
                    <AlertIcon />
                    Aucune note de frais pour le moment
                  </Alert>
                ) : (
                  <Card>
                    <CardBody p={0}>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Date</Th>
                            <Th>Description</Th>
                            <Th isNumeric>Montant</Th>
                            <Th>Statut</Th>
                            {isTreasurer && <Th>Actions</Th>}
                          </Tr>
                        </Thead>
                        <Tbody>
                          {expenseReports.map((r) => (
                            <Tr key={r.id}>
                              <Td>{formatDate(r.date || r.createdAt)}</Td>
                              <Td>{r.description}</Td>
                              <Td isNumeric>{formatCurrency(r.amount)}</Td>
                              <Td>
                                <Badge colorScheme={
                                  r.status === 'PAID' ? 'green' : r.status === 'APPROVED' ? 'blue' : r.status === 'REJECTED' ? 'red' : 'orange'
                                }>
                                  {r.status}
                                </Badge>
                              </Td>
                              {isTreasurer && (
                                <Td>
                                  <HStack>
                                    <Button size="xs" onClick={() => updateExpenseReportStatus(r.id, 'APPROVED')} leftIcon={<FiCheck />} colorScheme="blue" variant="outline">Approuver</Button>
                                    <Button size="xs" onClick={() => updateExpenseReportStatus(r.id, 'PAID')} leftIcon={<FiDollarSign />} colorScheme="green" variant="outline">Payé</Button>
                                    <Button size="xs" onClick={() => updateExpenseReportStatus(r.id, 'REJECTED')} leftIcon={<FiX />} colorScheme="red" variant="outline">Rejeter</Button>
                                    <IconButton aria-label="Supprimer" icon={<FiTrash2 />} size="xs" colorScheme="red" variant="ghost" onClick={() => deleteExpenseReport(r.id)} />
                                  </HStack>
                                </Td>
                              )}
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>

            {/* Onglet Simulations */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md">Simulations Financières</Heading>
                  <Button
                    leftIcon={<FiActivity />}
                    colorScheme="teal"
                    onClick={onSimulationOpen}
                    size="sm"
                  >
                    Nouveau scénario
                  </Button>
                </HStack>

                {simulationData.scenarios.length === 0 ? (
                  <Alert status="info">
                    <AlertIcon />
                    <VStack align="start" spacing={2}>
                      <Text fontWeight="bold">Aucun scénario de simulation</Text>
                      <Text fontSize="sm">
                        Créez des scénarios pour simuler l'évolution de votre trésorerie.
                        Étape 1: Créer le contexte, Étape 2: Ajouter recettes/dépenses.
                      </Text>
                    </VStack>
                  </Alert>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {simulationData.scenarios.map((scenario) => {
                      const isComplete = scenario.itemsCount > 0;
                      const monthlyNet = scenario.totalMonthlyIncome - scenario.totalMonthlyExpenses;
                      
                      return (
                        <Card key={scenario.id} borderWidth={2} borderColor={isComplete ? "green.200" : "orange.200"}>
                          <CardHeader>
                            <HStack justify="space-between">
                              <VStack align="start" spacing={1}>
                                <Heading size="sm">{scenario.name}</Heading>
                                <HStack>
                                  <Badge
                                    colorScheme={isComplete ? "green" : "orange"}
                                    size="sm"
                                  >
                                    {isComplete ? "Complet" : "Brouillon"}
                                  </Badge>
                                  <Badge variant="outline" size="sm">
                                    {scenario.itemsCount} élément(s)
                                  </Badge>
                                </HStack>
                              </VStack>
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<FiMoreHorizontal />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem 
                                    icon={<FiEdit3 />}
                                    onClick={async () => {
                                      await loadScenarioDetails(scenario.id);
                                      onEditScenarioOpen();
                                    }}
                                  >
                                    Éditer
                                  </MenuItem>
                                  <MenuItem 
                                    icon={<FiActivity />}
                                    onClick={() => runSimulation(scenario.id)}
                                    isDisabled={!isComplete}
                                  >
                                    Exécuter
                                  </MenuItem>
                                  <MenuItem 
                                    icon={<FiDownload />}
                                    onClick={() => downloadScenarioPdf(scenario.id, scenario.name)}
                                    isDisabled={!isComplete}
                                  >
                                    Exporter PDF
                                  </MenuItem>
                                  <Divider />
                                  <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => {
                                    if (confirm('Supprimer ce scénario ?')) deleteScenario(scenario.id);
                                  }}>
                                    Supprimer
                                  </MenuItem>
                                </MenuList>
                              </Menu>
                            </HStack>
                          </CardHeader>
                          <CardBody>
                            <VStack align="stretch" spacing={3}>
                              <Text fontSize="sm" color="gray.600" noOfLines={2}>
                                {scenario.description}
                              </Text>
                              
                              {isComplete ? (
                                <SimpleGrid columns={3} spacing={2}>
                                  <Stat size="sm">
                                    <StatLabel fontSize="xs">Revenus</StatLabel>
                                    <StatNumber fontSize="sm" color="green.600">
                                      {formatCurrency(scenario.totalMonthlyIncome)}
                                    </StatNumber>
                                  </Stat>
                                  <Stat size="sm">
                                    <StatLabel fontSize="xs">Dépenses</StatLabel>
                                    <StatNumber fontSize="sm" color="red.600">
                                      {formatCurrency(scenario.totalMonthlyExpenses)}
                                    </StatNumber>
                                  </Stat>
                                  <Stat size="sm">
                                    <StatLabel fontSize="xs">Résultat</StatLabel>
                                    <StatNumber fontSize="sm" color={monthlyNet >= 0 ? "green.600" : "red.600"}>
                                      {formatCurrency(monthlyNet)}
                                    </StatNumber>
                                  </Stat>
                                </SimpleGrid>
                              ) : (
                                <Alert status="warning" size="sm">
                                  <AlertIcon />
                                  <Text fontSize="xs">
                                    Ajoutez des recettes et dépenses pour compléter le scénario
                                  </Text>
                                </Alert>
                              )}
                              
                              <HStack>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  leftIcon={<FiEdit3 />}
                                  onClick={async () => {
                                    await loadScenarioDetails(scenario.id);
                                    onEditScenarioOpen();
                                  }}
                                >
                                  Éditer
                                </Button>
                                <Button
                                  size="xs"
                                  colorScheme="teal"
                                  leftIcon={<FiActivity />}
                                  onClick={() => runSimulation(scenario.id)}
                                  isDisabled={!isComplete}
                                  isLoading={loading}
                                >
                                  Simuler
                                </Button>
                              </HStack>
                            </VStack>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </SimpleGrid>
                )}
              </VStack>
            </TabPanel>

            {/* Onglet Rapports */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md">Rapports Financiers</Heading>
                  <HStack>
                    <FormControl width="150px">
                      <FormLabel>Année</FormLabel>
                      <Select value={reportYear} onChange={(e) => setReportYear(parseInt(e.target.value, 10))}>
                        {[0,1,2,3,4].map((off) => {
                          const y = new Date().getFullYear() - off;
                          return <option key={y} value={y}>{y}</option>;
                        })}
                      </Select>
                    </FormControl>
                    <Button leftIcon={<FiRefreshCw />} onClick={() => loadReports(reportYear)} isLoading={loading}>
                      Actualiser
                    </Button>
                    <Button leftIcon={<FiDownload />} colorScheme="purple" onClick={exportReportPdf}>
                      Export PDF
                    </Button>
                  </HStack>
                </HStack>

                {!reportData ? (
                  <Alert status="info">
                    <AlertIcon />
                    <Text>Aucun rapport disponible pour {reportYear}. Essayez d'actualiser.</Text>
                  </Alert>
                ) : (
                  <VStack spacing={4} align="stretch">
                    {/* Totaux */}
                    <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                      <Card>
                        <CardBody>
                          <Stat>
                            <StatLabel>Total recettes (période)</StatLabel>
                            <StatNumber color="green.600">{formatCurrency(reportData?.totals?.credits || 0)}</StatNumber>
                          </Stat>
                        </CardBody>
                      </Card>
                      <Card>
                        <CardBody>
                          <Stat>
                            <StatLabel>Total dépenses (période)</StatLabel>
                            <StatNumber color="red.600">{formatCurrency(reportData?.totals?.debits || 0)}</StatNumber>
                          </Stat>
                        </CardBody>
                      </Card>
                      <Card>
                        <CardBody>
                          <Stat>
                            <StatLabel>Net (période)</StatLabel>
                            <StatNumber color={(reportData?.totals?.net || 0) >= 0 ? 'green.600' : 'red.600'}>
                              {formatCurrency(reportData?.totals?.net || 0)}
                            </StatNumber>
                          </Stat>
                        </CardBody>
                      </Card>
                      <Card>
                        <CardBody>
                          <Stat>
                            <StatLabel>Solde actuel</StatLabel>
                            <StatNumber>{formatCurrency(balance)}</StatNumber>
                          </Stat>
                        </CardBody>
                      </Card>
                    </SimpleGrid>

                    {/* Solde d'ouverture / clôture */}
                    <Card>
                      <CardHeader><Heading size="sm">Soldes de période</Heading></CardHeader>
                      <CardBody>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                          <Stat>
                            <StatLabel>Solde d'ouverture</StatLabel>
                            <StatNumber>{formatCurrency(reportData?.balances?.opening || 0)}</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Solde de clôture (calculé)</StatLabel>
                            <StatNumber>{formatCurrency(reportData?.balances?.closing || 0)}</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Ouverture + Net</StatLabel>
                            <StatNumber>{formatCurrency(reportData?.balances?.closingFromOpeningPlusNet || 0)}</StatNumber>
                          </Stat>
                        </SimpleGrid>
                      </CardBody>
                    </Card>

                    {/* Par mois */}
                    <Card>
                      <CardHeader><Heading size="sm">Par mois ({reportYear})</Heading></CardHeader>
                      <CardBody p={0}>
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Mois</Th>
                              <Th isNumeric>Recettes</Th>
                              <Th isNumeric>Dépenses</Th>
                              <Th isNumeric>Net</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {(reportData?.monthly || []).map((m) => (
                              <Tr key={m.month}>
                                <Td>{String(m.month).padStart(2, '0')}</Td>
                                <Td isNumeric>{formatCurrency(m.credits)}</Td>
                                <Td isNumeric>{formatCurrency(m.debits)}</Td>
                                <Td isNumeric>
                                  <Text color={(m.net || 0) >= 0 ? 'green.600' : 'red.600'}>
                                    {formatCurrency(m.net)}
                                  </Text>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </CardBody>
                    </Card>

                    {/* Par catégorie */}
                    <Card>
                      <CardHeader><Heading size="sm">Par catégorie</Heading></CardHeader>
                      <CardBody p={0}>
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Catégorie</Th>
                              <Th isNumeric>Recettes</Th>
                              <Th isNumeric>Dépenses</Th>
                              <Th isNumeric>Net</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {Object.entries(reportData?.byCategory || {}).map(([cat, v]) => (
                              <Tr key={cat}>
                                <Td>{cat}</Td>
                                <Td isNumeric>{formatCurrency(v.credits)}</Td>
                                <Td isNumeric>{formatCurrency(v.debits)}</Td>
                                <Td isNumeric>
                                  <Text color={(v.net || 0) >= 0 ? 'green.600' : 'red.600'}>{formatCurrency(v.net)}</Text>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </CardBody>
                    </Card>

                    {/* Extraits récents */}
                    <Card>
                      <CardHeader><Heading size="sm">Transactions récentes (extrait)</Heading></CardHeader>
                      <CardBody p={0}>
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Date</Th>
                              <Th>Description</Th>
                              <Th>Catégorie</Th>
                              <Th isNumeric>Montant</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {(reportData?.sample || []).map((t) => (
                              <Tr key={`${t.id}-${t.date}`}>
                                <Td>{formatDate(t.date)}</Td>
                                <Td>{t.description}</Td>
                                <Td>{(t.category || 'AUTRE').toUpperCase()}</Td>
                                <Td isNumeric>
                                  <Text color={String(t.type).toUpperCase() === 'CREDIT' ? 'green.600' : 'red.600'}>
                                    {formatCurrency(t.amount)}
                                  </Text>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </CardBody>
                    </Card>
                  </VStack>
                )}
              </VStack>
            </TabPanel>

            {/* Onglet Configuration */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Heading size="md">Configuration Avancée</Heading>
                
                {/* Historique des modifications de solde */}
                <Card>
                  <CardHeader>
                    <Heading size="sm">Historique des Modifications de Solde</Heading>
                  </CardHeader>
                  <CardBody>
                    {balanceHistory.length === 0 ? (
                      <Text color="gray.500" fontSize="sm">Aucune modification enregistrée</Text>
                    ) : (
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Date</Th>
                            <Th>Ancien solde</Th>
                            <Th>Nouveau solde</Th>
                            <Th>Différence</Th>
                            <Th>Raison</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {balanceHistory.slice(0, 10).map((entry, index) => (
                            <Tr key={index}>
                              <Td>{formatDate(entry.date)}</Td>
                              <Td>{formatCurrency(entry.oldBalance)}</Td>
                              <Td>{formatCurrency(entry.newBalance)}</Td>
                              <Td>
                                <Text color={entry.newBalance - entry.oldBalance >= 0 ? "green.600" : "red.600"}>
                                  {entry.newBalance - entry.oldBalance >= 0 ? "+" : ""}
                                  {formatCurrency(entry.newBalance - entry.oldBalance)}
                                </Text>
                              </Td>
                              <Td fontSize="sm">{entry.reason}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    )}
                  </CardBody>
                </Card>

                {/* Paramètres de simulation */}
                <Card>
                  <CardHeader>
                    <Heading size="sm">Paramètres de Simulation</Heading>
                  </CardHeader>
                  <CardBody>
                    <FormControl>
                      <FormLabel>Nombre de mois à projeter</FormLabel>
                      <NumberInput
                        value={simulationData.projectionMonths}
                        onChange={(value) => setSimulationData(prev => ({ ...prev, projectionMonths: parseInt(value) || 12 }))
                        }
                        min={1}
                        max={60}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Entre 1 et 60 mois (actuellement: {simulationData.projectionMonths} mois)
                      </Text>
                    </FormControl>
                  </CardBody>
                </Card>

                {/* Sécurité */}
                <Card>
                  <CardHeader>
                    <Heading size="sm">Sécurité</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack>
                        <Icon as={isBalanceLocked ? FiLock : FiUnlock} color={isBalanceLocked ? "red.500" : "green.500"} />
                        <Text fontSize="sm">
                          Solde {isBalanceLocked ? "verrouillé" : "déverrouillé"} - 
                          {isBalanceLocked ? " Code requis pour modification" : " Modification libre"}
                        </Text>
                      </HStack>
                      <Alert status="warning" size="sm">
                        <AlertIcon />
                        <Text fontSize="xs">
                          Le code de sécurité à 4 chiffres est requis pour toute modification directe du solde.
                          Contactez l'administrateur système si vous avez oublié le code.
                        </Text>
                      </Alert>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Modals hors onglets pour éviter les décalages */}
        {/* Modal: Édition transaction */}
        <Modal isOpen={isEditTxOpen} onClose={onEditTxClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Modifier la transaction</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {editingTransaction && (
                <VStack spacing={3} align="stretch">
                  <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Input value={editingTransaction.description || ''} onChange={(e)=>setEditingTransaction(prev=>({...prev, description: e.target.value}))} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Catégorie</FormLabel>
                    <Select value={editingTransaction.category || 'ADHESION'} onChange={(e)=>setEditingTransaction(prev=>({...prev, category: e.target.value}))}>
                      <option value="ADHESION">Adhésion</option>
                      <option value="EVENEMENT">Événement</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="CARBURANT">Carburant</option>
                      <option value="AUTRE">Autre</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Type</FormLabel>
                    <Select value={editingTransaction.type || 'CREDIT'} onChange={(e)=>setEditingTransaction(prev=>({...prev, type: e.target.value}))}>
                      <option value="CREDIT">Recette</option>
                      <option value="DEBIT">Dépense</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Montant</FormLabel>
                    <NumberInput value={editingTransaction.amount} onChange={(v)=>setEditingTransaction(prev=>({...prev, amount: v}))} precision={2} step={0.5}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Date</FormLabel>
                    <Input type="date" value={(editingTransaction.date||'').slice(0,10)} onChange={(e)=>setEditingTransaction(prev=>({...prev, date: e.target.value}))} />
                  </FormControl>
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={onEditTxClose}>Annuler</Button>
              <Button colorScheme="blue" onClick={saveEditedTransaction}>Enregistrer</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal: Lier transaction à un document */}
        <Modal isOpen={isLinkDocOpen} onClose={onLinkDocClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Lier à un devis/une facture</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={3} align="stretch">
                <FormControl>
                  <FormLabel>Document</FormLabel>
                  <Select placeholder="Sélectionner un document" value={linkDocId} onChange={(e)=>setLinkDocId(e.target.value)}>
                    {documents.map(d => (
                      <option key={d.id} value={d.id}>{d.type === 'INVOICE' ? 'Facture' : 'Devis'} · {d.number || d.title || d.id} · {formatCurrency(Number(d.amount||0))}</option>
                    ))}
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={onLinkDocClose}>Annuler</Button>
              <Button colorScheme="blue" onClick={saveLinkDocument}>Lier</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal: Création/Édition document */}
        <Modal isOpen={isDocOpen} onClose={onDocClose} isCentered size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>{editingDocument ? 'Modifier le document' : 'Nouveau document'}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                {/* Type et Dates */}
                <HStack spacing={3}>
                  <FormControl>
                    <FormLabel fontWeight="bold">Type</FormLabel>
                    <Select 
                      value={docForm.type} 
                      onChange={(e)=>setDocForm(prev=>({...prev, type: e.target.value}))}>
                      <option value="QUOTE">📄 Devis</option>
                      <option value="INVOICE">💰 Facture</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontWeight="bold">Date</FormLabel>
                    <Input 
                      type="date" 
                      value={docForm.date} 
                      onChange={(e)=>setDocForm(prev=>({...prev, date: e.target.value}))} 
                    />
                  </FormControl>
                  {docForm.type === 'INVOICE' && (
                    <FormControl>
                      <FormLabel fontWeight="bold">Échéance</FormLabel>
                      <Input 
                        type="date" 
                        value={docForm.dueDate || ''} 
                        onChange={(e)=>setDocForm(prev=>({...prev, dueDate: e.target.value}))} 
                      />
                    </FormControl>
                  )}
                </HStack>

                {/* Numéro et Titre */}
                <HStack spacing={3}>
                  <FormControl>
                    <FormLabel fontWeight="bold">Numéro</FormLabel>
                    <Input 
                      value={docForm.number} 
                      onChange={(e)=>setDocForm(prev=>({...prev, number: e.target.value}))} 
                      placeholder={docForm.type === 'QUOTE' ? "ex: DV-2025-001" : "ex: FA-2025-001"}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontWeight="bold">Titre</FormLabel>
                    <Input 
                      value={docForm.title} 
                      onChange={(e)=>setDocForm(prev=>({...prev, title: e.target.value}))} 
                      placeholder="Objet du document" 
                    />
                  </FormControl>
                </HStack>

                {/* Description */}
                <FormControl>
                  <FormLabel fontWeight="bold">Description</FormLabel>
                  <Textarea 
                    value={docForm.description || ''} 
                    onChange={(e)=>setDocForm(prev=>({...prev, description: e.target.value}))} 
                    placeholder="Détails du document"
                    rows={2}
                  />
                </FormControl>

                {/* Montant - Simplifié pour associations (pas de TVA) */}
                {/* Les associations ne sont pas soumises à la TVA en France */}
                <Box bg="blue.50" p={4} borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <Heading size="sm">💰 Montant</Heading>
                      <Text fontSize="xs" color="gray.600">🏢 Association (exempte TVA)</Text>
                    </HStack>
                    
                    <FormControl>
                      <FormLabel fontSize="sm" fontWeight="bold">Montant total</FormLabel>
                      <NumberInput 
                        value={docForm.amount || ''} 
                        onChange={(v)=>{
                          setDocForm(prev=>({
                            ...prev, 
                            amount: v,
                            amountExcludingTax: v,
                            taxRate: 0,
                            taxAmount: 0
                          }));
                        }} 
                        precision={2} 
                        step={10}
                      >
                        <NumberInputField placeholder="0.00" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <Box p={3} bg="green.100" borderRadius="md" border="1px solid" borderColor="green.400">
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="green.700" fontWeight="bold">Montant TTC:</Text>
                        <Text fontSize="lg" color="green.700" fontWeight="bold">
                          {(parseFloat(docForm.amount) || 0).toFixed(2)} €
                        </Text>
                      </HStack>
                    </Box>
                  </VStack>
                </Box>

                {/* Statut contextualisé */}
                <FormControl>
                  <FormLabel fontWeight="bold">Statut</FormLabel>
                  <Select 
                    value={docForm.status} 
                    onChange={(e)=>setDocForm(prev=>({...prev, status: e.target.value}))}>
                    {docForm.type === 'QUOTE' ? (
                      <>
                        <option value="DRAFT">📋 Brouillon</option>
                        <option value="SENT">📤 Envoyé</option>
                        <option value="ACCEPTED">✅ Accepté</option>
                        <option value="REFUSED">❌ Refusé</option>
                        <option value="REEDITED">🔄 Réédité</option>
                      </>
                    ) : (
                      <>
                        <option value="DRAFT">📋 Brouillon</option>
                        <option value="SENT">📤 Envoyé</option>
                        <option value="ACCEPTED">✅ Accepté</option>
                        <option value="PENDING_PAYMENT">⏳ En attente de paiement</option>
                        <option value="PAID">💳 Payé</option>
                        <option value="DEPOSIT_PAID">💰 Accompte payé</option>
                      </>
                    )}
                  </Select>
                </FormControl>

                {/* Paiement pour les factures */}
                {docForm.type === 'INVOICE' && (
                  <Box bg="purple.50" p={3} borderRadius="md" borderLeft="4px solid" borderColor="purple.500">
                    <VStack spacing={2} align="stretch">
                      <FormLabel fontSize="sm" fontWeight="bold">Infos de paiement</FormLabel>
                      <HStack spacing={2}>
                        <FormControl>
                          <FormLabel fontSize="xs">Mode</FormLabel>
                          <Input 
                            size="sm"
                            value={docForm.paymentMethod || ''} 
                            onChange={(e)=>setDocForm(prev=>({...prev, paymentMethod: e.target.value}))} 
                            placeholder="ex: Virement, Espèces"
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="xs">Date paiement</FormLabel>
                          <Input 
                            size="sm"
                            type="date" 
                            value={docForm.paymentDate || ''} 
                            onChange={(e)=>setDocForm(prev=>({...prev, paymentDate: e.target.value}))} 
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="xs">Montant payé</FormLabel>
                          <NumberInput 
                            value={docForm.amountPaid || ''} 
                            onChange={(v)=>setDocForm(prev=>({...prev, amountPaid: v}))} 
                            size="sm"
                            precision={2}
                          >
                            <NumberInputField />
                          </NumberInput>
                        </FormControl>
                      </HStack>
                    </VStack>
                  </Box>
                )}

                {/* Liaison événement/membre */}
                <HStack spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="sm">Événement (optionnel)</FormLabel>
                    <Input 
                      size="sm"
                      value={docForm.eventId || ''} 
                      onChange={(e)=>setDocForm(prev=>({...prev, eventId: e.target.value}))} 
                      placeholder="ID d'événement"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Membre (optionnel)</FormLabel>
                    <Input 
                      size="sm"
                      value={docForm.memberId || ''} 
                      onChange={(e)=>setDocForm(prev=>({...prev, memberId: e.target.value}))} 
                      placeholder="ID de membre"
                    />
                  </FormControl>
                </HStack>

                {/* Destinataire - Pour le template */}
                <HStack spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="bold">Destinataire - Nom</FormLabel>
                    <Input 
                      size="sm"
                      value={docForm.destinataireName || ''} 
                      onChange={(e)=>setDocForm(prev=>({...prev, destinataireName: e.target.value}))} 
                      placeholder="Nom du destinataire (pour le template)"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="bold">Destinataire - Adresse</FormLabel>
                    <Input 
                      size="sm"
                      value={docForm.destinataireAdresse || ''} 
                      onChange={(e)=>setDocForm(prev=>({...prev, destinataireAdresse: e.target.value}))} 
                      placeholder="Adresse (pour le template)"
                    />
                  </FormControl>
                </HStack>

                <HStack spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="bold">Destinataire - Société</FormLabel>
                    <Input 
                      size="sm"
                      value={docForm.destinataireSociete || ''} 
                      onChange={(e)=>setDocForm(prev=>({...prev, destinataireSociete: e.target.value}))} 
                      placeholder="Société (optionnel)"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="bold">Destinataire - Contacts</FormLabel>
                    <Input 
                      size="sm"
                      value={docForm.destinataireContacts || ''} 
                      onChange={(e)=>setDocForm(prev=>({...prev, destinataireContacts: e.target.value}))} 
                      placeholder="Téléphone, email, etc."
                    />
                  </FormControl>
                </HStack>

                {/* Notes */}
                <FormControl>
                  <FormLabel fontSize="sm">Notes (visibles au client)</FormLabel>
                  <Textarea 
                    size="sm"
                    value={docForm.notes || ''} 
                    onChange={(e)=>setDocForm(prev=>({...prev, notes: e.target.value}))} 
                    placeholder="Remarques publiques"
                    rows={1}
                  />
                </FormControl>

                {/* Lignes du Devis - Nouveau! */}
                <Divider />
                <DevisLinesManager 
                  devisId={editingDocument?.id || 'temp-' + Date.now()} 
                  onTotalChange={(total) => {
                    setDocForm(prev => ({
                      ...prev,
                      amount: (parseFloat(total) || 0).toFixed(2)
                    }));
                  }}
                />

                {/* Section Génération - Toggleable */}
                <Box bg="amber.50" p={4} borderRadius="md" borderLeft="4px solid" borderColor="amber.500">
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <Heading size="sm">📄 Générer le document</Heading>
                    </HStack>

                    <VStack spacing={2} align="stretch">
                      {/* Sélection du template */}
                      {templates.length > 0 ? (
                        <FormControl>
                          <FormLabel fontSize="sm" fontWeight="bold">📋 Sélectionner un template</FormLabel>
                          <Select 
                            size="sm"
                            value={selectedTemplate?.id || ''} 
                            onChange={(e) => {
                              const tmpl = templates.find(t => t.id === e.target.value);
                              setSelectedTemplate(tmpl);
                            }}
                            placeholder="Choisir un template..."
                          >
                            {templates.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} {t.isDefault ? '⭐' : ''}
                              </option>
                            ))}
                          </Select>
                          {selectedTemplate && (
                            <Text fontSize="xs" color="gray.600" mt={1}>
                              ✅ {selectedTemplate.name}
                            </Text>
                          )}
                        </FormControl>
                      ) : (
                        <Alert status="warning">
                          <AlertIcon />
                          <Text fontSize="xs">Aucun template disponible. Créez-en un d'abord.</Text>
                        </Alert>
                      )}

                      {/* Bouton de prévisualisation */}
                      {selectedTemplate && (
                        <Button 
                          colorScheme="orange" 
                          size="sm"
                          onClick={generateFromTemplate}
                          leftIcon={<FiDownload />}
                          width="100%"
                        >
                          🔍 Générer l'aperçu & PDF
                        </Button>
                      )}

                      <Text fontSize="xs" color="gray.500" mt={2}>
                        💡 Remplissez tous les champs du formulaire (Numéro, Titre, Montant, Destinataire) avant de générer
                      </Text>
                    </VStack>
                  </VStack>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <HStack spacing={2}>
                <Button variant="ghost" onClick={onDocClose}>Annuler</Button>
                
                <Button colorScheme="purple" onClick={saveDocument}>
                  {editingDocument ? '💾 Enregistrer les modifications' : '➕ Créer le document'}
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Configuration */}
        <Modal isOpen={isConfigOpen} onClose={onConfigClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Configuration Rapide</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <Alert status="info">
                  <AlertIcon />
                  <Text fontSize="sm">
                    Configuration sécurisée du solde de base. Un code à 4 chiffres est requis.
                  </Text>
                </Alert>
                
                <FormControl isRequired>
                  <FormLabel>Code de sécurité (4 chiffres)</FormLabel>
                  <HStack>
                    <PinInput value={configCode} onChange={setConfigCode} type="number">
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                      <PinInputField />
                    </PinInput>
                  </HStack>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Nouveau solde (€)</FormLabel>
                  <NumberInput
                    value={newBalance}
                    onChange={setNewBalance}
                    precision={2}
                    step={0.01}
                  >
                    <NumberInputField placeholder="Entrez le nouveau solde" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                {newBalance && !isNaN(parseFloat(newBalance)) && (
                  <Alert status={parseFloat(newBalance) >= balance ? "success" : "warning"}>
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="bold">
                        Aperçu de la modification
                      </Text>
                      <Text fontSize="sm">
                        Solde actuel: {formatCurrency(balance)}
                      </Text>
                      <Text fontSize="sm">
                        Nouveau solde: {formatCurrency(parseFloat(newBalance))}
                      </Text>
                      <Text fontSize="sm" color={parseFloat(newBalance) - balance >= 0 ? "green.600" : "red.600"}>
                        Différence: {parseFloat(newBalance) - balance >= 0 ? "+" : ""}
                        {formatCurrency(parseFloat(newBalance) - balance)}
                      </Text>
                    </VStack>
                  </Alert>
                )}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onConfigClose}>
                Annuler
              </Button>
              <Button
                colorScheme="orange"
                onClick={handleBalanceConfig}
                isLoading={loading}
                leftIcon={<FiSave />}
              >
                Configurer le solde
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Déclarer mensualité payée */}
        <Modal isOpen={isDeclarePaymentOpen} onClose={onDeclarePaymentClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Déclarer une mensualité payée</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Période</FormLabel>
                  <Input type="month" value={paymentPeriod} onChange={(e) => setPaymentPeriod(e.target.value)} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Montant (€)</FormLabel>
                  <NumberInput value={paymentAmount} onChange={(v)=>setPaymentAmount(v)} precision={2} step={0.01}>
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Attestation / Photo</FormLabel>
                  <Input type="file" accept="image/*,application/pdf" onChange={(e)=>setPaymentFile(e.target.files?.[0] || null)} />
                  <Text fontSize="xs" color="gray.500" mt={1}>Pièce justificative obligatoire</Text>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onDeclarePaymentClose}>Annuler</Button>
              <Button colorScheme="green" onClick={submitPaymentDeclaration} isLoading={loading}>Déclarer</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Liste des paiements d'une opération */}
        <Modal isOpen={isPaymentsListOpen} onClose={onPaymentsListClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Paiements — {selectedOperation?.description}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {paymentsList.length === 0 ? (
                <Alert status="info"><AlertIcon />Aucun paiement enregistré</Alert>
              ) : (
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Période</Th>
                      <Th>Payé le</Th>
                      <Th isNumeric>Montant</Th>
                      <Th>Justificatif</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {paymentsList.map((p)=> (
                      <Tr key={p.id}>
                        <Td>{p.period}</Td>
                        <Td>{formatDate(p.paidAt)}</Td>
                        <Td isNumeric>{formatCurrency(p.amount)}</Td>
                        <Td>
                          {p.attachment?.dataUrl ? (
                            <Link href={p.attachment.dataUrl} target="_blank" color="blue.600">Ouvrir</Link>
                          ) : (
                            <Text fontSize="xs" color="gray.500">N/A</Text>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </ModalBody>
            <ModalFooter>
              <Button onClick={onPaymentsListClose}>Fermer</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Nouvelle Transaction */}
        <Modal isOpen={isTransactionOpen} onClose={onTransactionClose} size="xl">
          <ModalOverlay />
          <ModalContent maxH="90vh" overflowY="auto">
            <ModalHeader>Nouvelle Transaction</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={6}>
                {/* Infos principales */}
                <VStack spacing={4} width="full">
                  <Heading size="sm">Informations de la transaction</Heading>
                  
                  <FormControl isRequired>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={newTransaction.type}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="CREDIT">Recette</option>
                      <option value="DEBIT">Dépense</option>
                    </Select>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Montant (€)</FormLabel>
                    <NumberInput
                      value={newTransaction.amount}
                      onChange={(value) => setNewTransaction(prev => ({ ...prev, amount: value }))}
                      precision={2}
                      step={0.01}
                    >
                      <NumberInputField placeholder="0.00" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Description</FormLabel>
                    <Input
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description de la transaction"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Date</FormLabel>
                    <Input
                      type="date"
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Événement associé (optionnel)</FormLabel>
                    <Select
                      value={newTransaction.eventId || ''}
                      onChange={(e) => setNewTransaction(prev => ({ ...prev, eventId: e.target.value }))}
                      placeholder="Sélectionner un événement..."
                    >
                      <option value="">— Aucun événement —</option>
                      {events.map(evt => (
                        <option key={evt.id} value={evt.id}>
                          {evt.title} ({formatDate(evt.date)})
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </VStack>

                {/* Allocations par catégorie */}
                <Divider />
                
                <VStack spacing={3} width="full">
                  <Heading size="sm">Allouer par catégorie</Heading>
                  <Text fontSize="sm" color="gray.500">
                    Vous pouvez diviser ce montant entre plusieurs catégories (ex: 100€ gasoil + 13€ assurance)
                  </Text>

                  {/* Allocations existantes */}
                  {transactionAllocations.length > 0 && (
                    <Box width="full">
                      <Text fontSize="sm" fontWeight="bold" mb={2}>Allocations actuelles:</Text>
                      <VStack spacing={2} align="stretch">
                        {transactionAllocations.map((alloc, idx) => (
                          <HStack
                            key={idx}
                            p={2}
                            borderRadius="md"
                            bg={useColorModeValue('gray.100', 'gray.600')}
                            justify="space-between"
                          >
                            <VStack align="start" spacing={0}>
                              <HStack>
                                <Box
                                  w={3}
                                  h={3}
                                  borderRadius="full"
                                  bg={alloc.category?.color}
                                />
                                <Text fontWeight="bold">{alloc.category?.name}</Text>
                              </HStack>
                              {alloc.notes && (
                                <Text fontSize="xs" color="gray.500">{alloc.notes}</Text>
                              )}
                            </VStack>
                            <HStack>
                              <Text fontWeight="bold">{formatCurrency(alloc.allocatedAmount)}</Text>
                              <IconButton
                                size="sm"
                                icon={<FiTrash2 />}
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => {
                                  setTransactionAllocations(transactionAllocations.filter((_, i) => i !== idx));
                                }}
                              />
                            </HStack>
                          </HStack>
                        ))}
                      </VStack>
                      <Text fontSize="xs" color="gray.500" mt={2}>
                        Total alloué: {formatCurrency(transactionAllocations.reduce((sum, a) => sum + (parseFloat(a.allocatedAmount) || 0), 0))} / {formatCurrency(parseFloat(newTransaction.amount) || 0)}
                      </Text>
                    </Box>
                  )}

                  {/* Formulaire pour ajouter une allocation */}
                  <Card width="full">
                    <CardBody>
                      <VStack spacing={3}>
                        <Heading size="xs">Ajouter une allocation</Heading>
                        
                        <FormControl>
                          <FormLabel fontSize="sm">Catégorie</FormLabel>
                          <Select
                            value={newAllocationInForm.categoryId}
                            onChange={(e) => setNewAllocationInForm({...newAllocationInForm, categoryId: e.target.value})}
                            size="sm"
                          >
                            <option value="">Sélectionner une catégorie</option>
                            {financeCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="sm">Montant (€)</FormLabel>
                          <NumberInput
                            value={newAllocationInForm.allocatedAmount}
                            onChange={(val) => setNewAllocationInForm({...newAllocationInForm, allocatedAmount: val})}
                            precision={2}
                            step={0.01}
                            size="sm"
                          >
                            <NumberInputField placeholder="0.00" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="sm">Notes (optionnel)</FormLabel>
                          <Textarea
                            value={newAllocationInForm.notes}
                            onChange={(e) => setNewAllocationInForm({...newAllocationInForm, notes: e.target.value})}
                            placeholder="ex: gasoil station Shell"
                            rows={2}
                            size="sm"
                          />
                        </FormControl>

                        <Button
                          colorScheme="blue"
                          width="full"
                          size="sm"
                          onClick={() => {
                            if (!newAllocationInForm.categoryId || !newAllocationInForm.allocatedAmount) {
                              toast({ status: 'error', title: 'Remplissez catégorie et montant' });
                              return;
                            }

                            const category = financeCategories.find(c => c.id === newAllocationInForm.categoryId);
                            setTransactionAllocations([
                              ...transactionAllocations,
                              {
                                categoryId: newAllocationInForm.categoryId,
                                category,
                                allocatedAmount: parseFloat(newAllocationInForm.allocatedAmount),
                                notes: newAllocationInForm.notes
                              }
                            ]);
                            setNewAllocationInForm({ categoryId: '', allocatedAmount: '', notes: '' });
                          }}
                        >
                          <FiPlus /> Ajouter l'allocation
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onTransactionClose}>
                Annuler
              </Button>
              <Button
                colorScheme="blue"
                onClick={() => {
                  if (!newTransaction.type || !newTransaction.amount || !newTransaction.description) {
                    toast({ status: 'error', title: 'Remplissez les champs obligatoires' });
                    return;
                  }
                  handleAddTransaction();
                }}
                isLoading={loading}
              >
                Ajouter
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Nouvelle Opération Programmée / Échéancier */}
        <Modal isOpen={isScheduledOpen} onClose={onScheduledClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>{activeTab === 2 ? 'Nouvel Échéancier' : 'Nouvelle Opération Programmée'}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                {activeTab !== 2 && (
                  <FormControl isRequired>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={newScheduled.type}
                      onChange={(e) => setNewScheduled(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="SCHEDULED_PAYMENT">Paiement programmé</option>
                      <option value="SCHEDULED_CREDIT">Crédit programmé</option>
                    </Select>
                  </FormControl>
                )}

                <FormControl isRequired>
                  <FormLabel>{activeTab === 2 ? 'Mensualité (€ / mois)' : 'Montant (€)'}</FormLabel>
                  <NumberInput
                    value={newScheduled.amount}
                    onChange={(value) => setNewScheduled(prev => ({ ...prev, amount: value }))}
                    precision={2}
                    step={0.01}
                  >
                    <NumberInputField placeholder="0.00" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Description</FormLabel>
                  <Input
                    value={newScheduled.description}
                    onChange={(e) => setNewScheduled(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description de l'opération"
                  />
                </FormControl>

                {activeTab !== 2 && (
                  <FormControl>
                    <FormLabel>Fréquence</FormLabel>
                    <Select
                      value={newScheduled.frequency}
                      onChange={(e) => setNewScheduled(prev => ({ ...prev, frequency: e.target.value }))}
                    >
                      <option value="MONTHLY">Mensuel</option>
                      <option value="WEEKLY">Hebdomadaire</option>
                      <option value="QUARTERLY">Trimestriel</option>
                      <option value="YEARLY">Annuel</option>
                    </Select>
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel>Prochaine exécution</FormLabel>
                  <Input
                    type="date"
                    value={newScheduled.nextDate}
                    onChange={(e) => setNewScheduled(prev => ({ ...prev, nextDate: e.target.value }))}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{activeTab === 2 ? 'Montant total (optionnel)' : 'Total à amortir (optionnel)'}</FormLabel>
                  <NumberInput
                    value={newScheduled.totalAmount}
                    onChange={(value) => setNewScheduled(prev => ({ ...prev, totalAmount: value }))}
                    precision={2}
                    step={0.01}
                  >
                    <NumberInputField placeholder="Ex: 4000.00" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text fontSize="xs" color="gray.500">Permet de calculer le nombre de mensualités restantes et la date de fin estimée.</Text>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onScheduledClose}>
                Annuler
              </Button>
              <Button
                colorScheme="purple"
                onClick={handleAddScheduledOperation}
                isLoading={loading}
              >
                {activeTab === 2 ? 'Créer l’échéancier' : 'Programmer'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Nouveau Scénario de Simulation */}
        <Modal isOpen={isSimulationOpen} onClose={onSimulationClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Nouveau Scénario de Simulation</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <Alert status="info">
                  <AlertIcon />
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" fontWeight="bold">Étape 1: Contexte du scénario</Text>
                    <Text fontSize="xs">
                      Définissez le nom et la description. Vous pourrez ajouter les recettes 
                      et dépenses dans l'étape suivante.
                    </Text>
                  </VStack>
                </Alert>

                <FormControl isRequired>
                  <FormLabel>Nom du scénario</FormLabel>
                  <Input
                    value={newScenario.name}
                    onChange={(e) => setNewScenario(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ex: Scénario optimiste 2024"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={newScenario.description}
                    onChange={(e) => setNewScenario(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Décrivez les hypothèses et le contexte de ce scénario..."
                    rows={4}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Période de projection (mois)</FormLabel>
                  <NumberInput
                    value={newScenario.projectionMonths}
                    onChange={(value) => setNewScenario(prev => ({ ...prev, projectionMonths: parseInt(value) || 12 }))
                    }
                    min={1}
                    max={60}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Entre 1 et 60 mois
                  </Text>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onSimulationClose}>
                Annuler
              </Button>
              <Button
                colorScheme="teal"
                onClick={createSimulationScenario}
                isLoading={loading}
                leftIcon={<FiActivity />}
              >
                Créer le scénario
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Édition Scénario (recettes/dépenses) */}
        <Modal isOpen={isEditScenarioOpen} onClose={onEditScenarioClose} size="6xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Text>Édition: {editingScenario?.name}</Text>
                <Badge colorScheme="blue" variant="outline">
                  Étape 2: Recettes & Dépenses
                </Badge>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {editingScenario && (
                <Grid templateColumns="1fr 1fr" gap={6}>
                  {/* Colonne Recettes */}
                  <VStack align="stretch" spacing={4}>
                    <Card>
                      <CardHeader>
                        <Heading size="sm" color="green.600">
                          💰 Recettes ({editingScenario.incomeItems?.length || 0})
                        </Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={3}>
                          {/* Formulaire ajout recette */}
                          <HStack width="100%">
                            <Input
                              placeholder="Description"
                              size="sm"
                              value={newIncomeItem.description}
                              onChange={(e) => setNewIncomeItem(prev => ({ ...prev, description: e.target.value }))}
                            />
                            <NumberInput
                              size="sm"
                              width="120px"
                              value={newIncomeItem.amount}
                              onChange={(value) => setNewIncomeItem(prev => ({ ...prev, amount: value }))}
                            >
                              <NumberInputField placeholder="Montant" />
                            </NumberInput>
                            <Select
                              size="sm"
                              width="120px"
                              value={newIncomeItem.frequency}
                              onChange={(e) => setNewIncomeItem(prev => ({ ...prev, frequency: e.target.value }))}
                            >
                              <option value="ONE_SHOT">Ponctuel</option>
                              <option value="SEMI_ANNUAL">Semestriel (6 mois)</option>
                              <option value="MONTHLY">Mensuel</option>
                              <option value="QUARTERLY">Trimestriel</option>
                              <option value="YEARLY">Annuel</option>
                            </Select>
                            <IconButton
                              icon={<FiPlus />}
                              size="sm"
                              colorScheme="green"
                              onClick={addIncomeItem}
                            />
                          </HStack>
                          
                          {/* Liste des recettes */}
                          <VStack width="100%" spacing={2}>
                            {editingScenario.incomeItems?.map((item, index) => (
                              <HStack key={item.id} width="100%" justify="space-between" p={2} bg="green.50" borderRadius="md">
                                <VStack align="start" spacing={0} flex={1}>
                                  <Text fontSize="sm" fontWeight="bold">{item.description}</Text>
                                  <Text fontSize="xs" color="gray.600">
                                    {formatCurrency(item.amount)} - {getFrequencyLabel(item.frequency)}
                                  </Text>
                                </VStack>
                                <IconButton
                                  icon={<FiTrash2 />}
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => removeIncomeItem(item.id)}
                                />
                              </HStack>
                            ))}
                          </VStack>
                          
                          {/* Total recettes */}
                          <Box width="100%" p={2} bg="green.100" borderRadius="md">
                            <Text fontSize="sm" fontWeight="bold" color="green.700">
                              Total mensuel: {formatCurrency(editingScenario.totalMonthlyIncome || 0)}
                            </Text>
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  </VStack>

                  {/* Colonne Dépenses */}
                  <VStack align="stretch" spacing={4}>
                    <Card>
                      <CardHeader>
                        <Heading size="sm" color="red.600">
                          💸 Dépenses ({editingScenario.expenseItems?.length || 0})
                        </Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={3}>
                          {/* Formulaire ajout dépense */}
                          <HStack width="100%">
                            <Input
                              placeholder="Description"
                              size="sm"
                              value={newExpenseItem.description}
                              onChange={(e) => setNewExpenseItem(prev => ({ ...prev, description: e.target.value }))}
                            />
                            <NumberInput
                              size="sm"
                              width="120px"
                              value={newExpenseItem.amount}
                              onChange={(value) => setNewExpenseItem(prev => ({ ...prev, amount: value }))}
                            >
                              <NumberInputField placeholder="Montant" />
                            </NumberInput>
                            <Select
                              size="sm"
                              width="120px"
                              value={newExpenseItem.frequency}
                              onChange={(e) => setNewExpenseItem(prev => ({ ...prev, frequency: e.target.value }))}
                            >
                              <option value="ONE_SHOT">Ponctuel</option>
                              <option value="SEMI_ANNUAL">Semestriel (6 mois)</option>
                              <option value="MONTHLY">Mensuel</option>
                              <option value="QUARTERLY">Trimestriel</option>
                              <option value="YEARLY">Annuel</option>
                            </Select>
                            <IconButton
                              icon={<FiPlus />}
                              size="sm"
                              colorScheme="red"
                              onClick={addExpenseItem}
                            />
                          </HStack>
                          
                          {/* Liste des dépenses */}
                          <VStack width="100%" spacing={2}>
                            {editingScenario.expenseItems?.map((item, index) => (
                              <HStack key={item.id} width="100%" justify="space-between" p={2} bg="red.50" borderRadius="md">
                                <VStack align="start" spacing={0} flex={1}>
                                  <Text fontSize="sm" fontWeight="bold">{item.description}</Text>
                                  <Text fontSize="xs" color="gray.600">
                                    {formatCurrency(item.amount)} - {getFrequencyLabel(item.frequency)}
                                  </Text>
                                </VStack>
                                <IconButton
                                  icon={<FiTrash2 />}
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => removeExpenseItem(item.id)}
                                />
                              </HStack>
                            ))}
                          </VStack>
                          
                          {/* Total dépenses */}
                          <Box width="100%" p={2} bg="red.100" borderRadius="md">
                            <Text fontSize="sm" fontWeight="bold" color="red.700">
                              Total mensuel: {formatCurrency(editingScenario.totalMonthlyExpenses || 0)}
                            </Text>
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  </VStack>
                </Grid>
              )}
              
              {/* Résumé du scénario */}
              {editingScenario && (
                <Card mt={4}>
                  <CardBody>
                    <SimpleGrid columns={4} spacing={4}>
                      <Stat>
                        <StatLabel>Recettes/mois</StatLabel>
                        <StatNumber color="green.600">
                          {formatCurrency(editingScenario.totalMonthlyIncome || 0)}
                        </StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Dépenses/mois</StatLabel>
                        <StatNumber color="red.600">
                          {formatCurrency(editingScenario.totalMonthlyExpenses || 0)}
                        </StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Résultat/mois</StatLabel>
                        <StatNumber color={editingScenario.monthlyNet >= 0 ? "green.600" : "red.600"}>
                          {formatCurrency(editingScenario.monthlyNet || 0)}
                        </StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Éléments</StatLabel>
                        <StatNumber>
                          {(editingScenario.incomeItems?.length || 0) + (editingScenario.expenseItems?.length || 0)}
                        </StatNumber>
                      </Stat>
                    </SimpleGrid>
                  </CardBody>
                </Card>
              )}

                <FormControl>
                  <FormLabel>Motif de régularisation</FormLabel>
                  <Input
                    value={balanceReason}
                    onChange={(e) => setBalanceReason(e.target.value)}
                    placeholder="Ex: Correction comptable, ajustement bancaire, etc."
                  />
                </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onEditScenarioClose}>
                Fermer
              </Button>
              <Button
                colorScheme="teal"
                onClick={() => runSimulation(editingScenario?.id)}
                isLoading={loading}
                leftIcon={<FiActivity />}
                isDisabled={!editingScenario || editingScenario.itemsCount === 0}
              >
                Exécuter la simulation
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Résultats de Simulation */}
        <Modal isOpen={isSimulationResultsOpen} onClose={onSimulationResultsClose} size="6xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Text>Résultats: {simulationResults?.scenarioName}</Text>
                <Badge colorScheme={simulationResults?.summary?.isPositive ? "green" : "red"}>
                  {simulationResults?.summary?.isPositive ? "Positif" : "Déficitaire"}
                </Badge>
              </HStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {simulationResults && (
                <VStack spacing={6}>
                  {/* Résumé général */}
                  <SimpleGrid columns={4} spacing={4} width="100%">
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Solde initial</StatLabel>
                          <StatNumber>{formatCurrency(simulationResults.startingBalance)}</StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Solde final</StatLabel>
                          <StatNumber color={simulationResults.finalBalance >= 0 ? "green.600" : "red.600"}>
                            {formatCurrency(simulationResults.finalBalance)}
                          </StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Évolution totale</StatLabel>
                          <StatNumber color={simulationResults.totalChange >= 0 ? "green.600" : "red.600"}>
                            <StatArrow type={simulationResults.totalChange >= 0 ? "increase" : "decrease"} />
                            {formatCurrency(Math.abs(simulationResults.totalChange))}
                          </StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Résultat/mois</StatLabel>
                          <StatNumber color={simulationResults.monthlyNet >= 0 ? "green.600" : "red.600"}>
                            {formatCurrency(simulationResults.monthlyNet)}
                          </StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                  </SimpleGrid>

                  {/* Projection mensuelle */}
                  <Card width="100%">
                    <CardHeader>
                      <Heading size="sm">Évolution mensuelle</Heading>
                    </CardHeader>
                    <CardBody>
                      <Box overflowX="auto">
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Mois</Th>
                              <Th>Solde début</Th>
                              <Th isNumeric>Recettes</Th>
                              <Th isNumeric>Dépenses</Th>
                              <Th isNumeric>Résultat</Th>
                              <Th isNumeric>Solde fin</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {simulationResults.projection.slice(0, 12).map((month) => (
                              <Tr key={month.month}>
                                <Td>Mois {month.month}</Td>
                                <Td>{formatCurrency(month.startBalance)}</Td>
                                <Td isNumeric color="green.600">+{formatCurrency(month.income)}</Td>
                                <Td isNumeric color="red.600">-{formatCurrency(month.expenses)}</Td>
                                <Td isNumeric color={month.net >= 0 ? "green.600" : "red.600"}>
                                  {month.net >= 0 ? "+" : ""}{formatCurrency(month.net)}
                                </Td>
                                <Td isNumeric fontWeight="bold" color={month.endBalance >= 0 ? "green.600" : "red.600"}>
                                  {formatCurrency(month.endBalance)}
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                      {simulationResults.projection.length > 12 && (
                        <Text fontSize="sm" color="gray.500" mt={2} textAlign="center">
                          ... et {simulationResults.projection.length - 12} mois supplémentaires
                        </Text>
                      )}
                    </CardBody>
                  </Card>

                  {/* Alertes */}
                  {simulationResults.summary.breakEvenMonth && (
                    <Alert status="warning" width="100%">
                      <AlertIcon />
                      <Text>
                        Attention: Le solde devient négatif au mois {simulationResults.summary.breakEvenMonth}
                      </Text>
                    </Alert>
                  )}
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              <Button onClick={onSimulationResultsClose}>
                Fermer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal: Aperçu du template */}
        <Modal isOpen={isTemplatePreviewOpen} onClose={onTemplatePreviewClose} size="6xl">
          <ModalOverlay />
          <ModalContent maxH="90vh" overflowY="auto">
            <ModalHeader>
              <VStack align="start" spacing={0}>
                <Text>📄 Aperçu du document</Text>
                <Text fontSize="sm" color="gray.600" fontWeight="normal">{templatePreviewData?.templateName}</Text>
              </VStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {templatePreviewData && selectedTemplate && (
                <VStack spacing={4} align="stretch">
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="bold">Aperçu du rendu final</Text>
                      <Text fontSize="sm">Les variables {'{{PLACEHOLDERS}}'} ont été remplacées avec vos données. Vous pouvez imprimer ou exporter en PDF.</Text>
                    </Box>
                  </Alert>

                  {/* Template Preview Component */}
                  <Box 
                    borderWidth="1px" 
                    borderRadius="md" 
                    bg="white"
                    boxShadow="sm"
                  >
                    <QuoteTemplatePreview 
                      template={selectedTemplate} 
                      data={templatePreviewData.data}
                    />
                  </Box>
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              <HStack spacing={2}>
                <Button variant="ghost" onClick={onTemplatePreviewClose}>
                  Fermer
                </Button>
                <Button 
                  colorScheme="orange"
                  leftIcon={<FiDownload />}
                  onClick={() => {
                    // Déclencher l'impression
                    window.print();
                  }}
                >
                  🖨️ Imprimer / Exporter en PDF
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>

      <BankStatementImport
        isOpen={isBankImportOpen}
        onClose={onBankImportClose}
        onImported={() => { loadTransactions(); }}
      />
    </Box>
  );
};

export default AdminFinance;
