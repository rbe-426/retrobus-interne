import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Container, VStack, HStack, Image, Center, useDisclosure, Spinner, Text, Button,
  Grid, GridItem, Heading, Badge, Divider, useToast, IconButton, Table, Thead, Tbody,
  Tr, Th, Td, Flex, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Card,
  CardHeader, CardBody, Input, Select, Textarea, FormControl, FormLabel,
  Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Switch, Tabs, TabList, TabPanels, Tab, TabPanel, Avatar,
  Progress, Tag, TagLabel, TagCloseButton, Wrap, WrapItem, List, ListItem, ListIcon,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Menu, MenuButton, MenuList, MenuItem, MenuDivider,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink
} from '@chakra-ui/react';
import {
  FiLogOut, FiCheckCircle, FiClock, FiUser, FiPackage, FiLayers, FiUsers, FiCalendar,
  FiShoppingBag, FiTrendingUp, FiMapPin, FiPlus, FiEdit2, FiTrash2, FiAlertCircle,
  FiCheck, FiX, FiSave, FiSearch, FiFilter, FiTool, FiBook, FiAward, FiTruck, FiCamera,
  FiFileText, FiSettings, FiActivity, FiHome, FiUserCheck, FiDollarSign, FiTag, FiPercent
} from 'react-icons/fi';
import MuseeLoginModal from '../components/MuseeLoginModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStoredCSRFToken } from '../lib/csrfClient';
import { museumAPI } from '../api/museum';
import { membersAPI } from '../api/members';
import { stocksAPI } from '../api/stocks';
import { apiClient } from '../api/config';

// ========== DONNÉES DE DÉMONSTRATION RÉTROBUS ESSONNE ==========

// Véhicules de la collection
const DEMO_VEHICLES = [
  { 
    id: 1, 
    nom: 'Renault TN6C', 
    ref: 'VEH-001', 
    annee: 1952, 
    constructeur: 'Renault',
    carrossier: 'Chausson',
    etat: 'Restauré', 
    fonctionnel: true,
    immatriculation: '91-AB-123',
    kmCompteur: 245000,
    dateAcquisition: '2018-03-15',
    localisation: 'Hangar A',
    commentaires: 'Ex-RATP ligne 21. Restauration complète 2020-2022.',
    derniereRevision: '2026-06-10',
    prochaineSortie: '2026-09-15'
  },
  { 
    id: 2, 
    nom: 'Saviem S105M', 
    ref: 'VEH-002', 
    annee: 1969, 
    constructeur: 'Saviem',
    carrossier: 'Heuliez',
    etat: 'En restauration', 
    fonctionnel: false,
    immatriculation: '91-CD-456',
    kmCompteur: 180000,
    dateAcquisition: '2020-11-22',
    localisation: 'Atelier B',
    commentaires: 'Moteur en révision, carrosserie à refaire.',
    derniereRevision: '2025-12-01',
    prochaineSortie: null
  },
];

// Pièces et accessoires
const DEMO_STOCK_ITEMS = [
  { id: 1, nom: 'Pneu 9.00-20', ref: 'PIE-001', categorie: 'Pièce mécanique', quantite: 8, etat: 'Neuf', emplacement: 'Réserve A', fournisseur: 'Michelin', dateEntree: '2024-01-15' },
  { id: 2, nom: 'Ticket poinçonneur', ref: 'ACC-045', categorie: 'Accessoire', quantite: 250, etat: 'Bon', emplacement: 'Vitrine 3', fournisseur: 'Archives RATP', dateEntree: '2023-11-20' },
  { id: 3, nom: 'Plaque destination', ref: 'SIG-012', categorie: 'Signalétique', quantite: 12, etat: 'Moyen', emplacement: 'Salle B2', fournisseur: 'Don particulier', dateEntree: '2024-03-10' },
  { id: 4, nom: 'Manuel technique S105', ref: 'DOC-008', categorie: 'Documentation', quantite: 3, etat: 'Bon', emplacement: 'Bibliothèque', fournisseur: 'Saviem', dateEntree: '2024-02-05' },
  { id: 5, nom: 'Volant d\'origine', ref: 'PIE-022', categorie: 'Pièce mécanique', quantite: 2, etat: 'Excellent', emplacement: 'Réserve B', fournisseur: 'Casse Renault', dateEntree: '2023-12-18' },
];

// Restaurations en cours
const DEMO_RESTORATIONS = [
  { 
    id: 1, 
    vehicule: 'Saviem S105M', 
    responsable: 'Martin Dupont',
    dateDebut: '2025-09-01',
    avancement: 45,
    taches: [
      { nom: 'Démontage moteur', statut: 'Terminé' },
      { nom: 'Révision moteur', statut: 'En cours' },
      { nom: 'Carrosserie', statut: 'À faire' },
      { nom: 'Peinture', statut: 'À faire' }
    ],
    budget: 15000,
    depenses: 6750
  },
];

// Documentation technique
const DEMO_DOCS = [
  { id: 1, titre: 'Manuel technique Renault TN6C', type: 'Manuel', annee: 1952, auteur: 'Renault Véhicules Industriels', pages: 248, emplacement: 'Biblio-A12', numerise: true },
  { id: 2, titre: 'Plans carrosserie Chausson APU53', type: 'Plans', annee: 1955, auteur: 'Chausson', pages: 45, emplacement: 'Biblio-B05', numerise: false },
  { id: 3, titre: 'Revue Autocar n°234', type: 'Revue', annee: 1968, auteur: 'Presse spécialisée', pages: 96, emplacement: 'Biblio-C18', numerise: true },
];

// Bénévoles de l'association
const DEMO_STAFF = [
  { id: 1, nom: 'Martin Dupont', role: 'Mécanicien', competences: ['Mécanique diesel', 'Électricité', 'Soudure'], disponibilite: 'Samedi', tel: '06 12 34 56 78', adhesion: '2018' },
  { id: 2, nom: 'Sophie Bernard', role: 'Guide', competences: ['Médiation', 'Histoire du transport', 'Anglais'], disponibilite: 'Dimanche', tel: '06 23 45 67 89', adhesion: '2020' },
  { id: 3, nom: 'Jean Moreau', role: 'Carrossier', competences: ['Carrosserie', 'Peinture', 'Tôlerie'], disponibilite: 'Mercredi/Samedi', tel: '06 34 56 78 90', adhesion: '2019' },
  { id: 4, nom: 'Claire Lefebvre', role: 'Archiviste', competences: ['Documentation', 'Numérisation', 'Catalogage'], disponibilite: 'Vendredi', tel: '06 45 67 89 01', adhesion: '2021' },
];

// Sorties et événements
const DEMO_EVENTS = [
  { id: 1, nom: 'Journées du Patrimoine', date: '2026-09-15', vehicule: 'Renault TN6C', lieu: 'Musée Évry', type: 'Exposition statique', participants: 3, statut: 'Confirmé' },
  { id: 2, nom: 'Rallye des anciens', date: '2026-10-20', vehicule: 'Renault TN6C', lieu: 'Circuit de Montlhéry', type: 'Sortie roulante', participants: 5, statut: 'En préparation' },
  { id: 3, nom: 'Visite scolaire', date: '2026-11-08', vehicule: null, lieu: 'Musée Évry', type: 'Visite guidée', participants: 2, statut: 'Confirmé' },
];

const DEMO_FACING_ZONES = [
  { id: 1, nom: 'Vitrine d\'accueil', pieces: 15, rotation: 'Mensuelle', derniereMAJ: '2026-08-01', priorite: 'Haute' },
  { id: 2, nom: 'Exposition temporaire', pieces: 8, rotation: 'Trimestrielle', derniereMAJ: '2026-07-15', priorite: 'Moyenne' },
  { id: 3, nom: 'Collection permanente', pieces: 42, rotation: 'Annuelle', derniereMAJ: '2026-01-10', priorite: 'Basse' },
];

const DEMO_FLOORS = [
  { id: 1, nom: 'Hangar A - Véhicules', salles: 3, capacite: 50, superficie: '600m²', theme: 'Collection véhicules' },
  { id: 2, nom: 'Atelier B - Restauration', salles: 2, capacite: 15, superficie: '250m²', theme: 'Ateliers techniques' },
  { id: 3, nom: 'Salle C - Archives', salles: 1, capacite: 30, superficie: '80m²', theme: 'Documentation et maquettes' },
];

const DEMO_PLANNING = [
  { id: 1, personnel: 'Martin Dupont', zone: 'Atelier B', jour: 'Samedi', horaire: '09:00-17:00', tache: 'Révision moteur S105' },
  { id: 2, personnel: 'Sophie Bernard', zone: 'Hangar A', jour: 'Dimanche', horaire: '10:00-18:00', tache: 'Visite guidée' },
  { id: 3, personnel: 'Jean Moreau', zone: 'Atelier B', jour: 'Mercredi', horaire: '14:00-18:00', tache: 'Carrosserie' },
  { id: 4, personnel: 'Claire Lefebvre', zone: 'Salle C', jour: 'Vendredi', horaire: '09:00-13:00', tache: 'Numérisation documents' },
];

// Pré-réservations visiteurs (depuis le site externe)
const DEMO_RESERVATIONS = [
  { 
    id: 1, 
    nom: 'Famille Martin', 
    nbPersonnes: 4, 
    motif: 'Visite libre',
    dateReservation: '2026-08-21',
    creneauSouhaite: '14:00',
    email: 'martin.famille@email.com',
    telephone: '06 12 34 56 78',
    statut: 'Confirmée',
    commentaire: 'Enfants de 8 et 12 ans',
    paiementEffectue: true,
    montantTotal: 36.00
  },
  { 
    id: 2, 
    nom: 'École Jean Macé - CM2', 
    nbPersonnes: 28, 
    motif: 'Scolaire',
    dateReservation: '2026-08-21',
    creneauSouhaite: '10:00',
    email: 'ecole.jeanmace@education.fr',
    telephone: '01 60 75 23 45',
    statut: 'Confirmée',
    commentaire: 'Visite pédagogique sur les transports anciens',
    paiementEffectue: false,
    montantTotal: 84.00
  },
  { 
    id: 3, 
    nom: 'Association Mémoire du 91', 
    nbPersonnes: 15, 
    motif: 'Visite guidée',
    dateReservation: '2026-08-21',
    creneauSouhaite: '15:30',
    email: 'contact@memoire91.asso.fr',
    telephone: '06 87 65 43 21',
    statut: 'Confirmée',
    commentaire: 'Seniors passionnés d\'histoire locale',
    paiementEffectue: true,
    montantTotal: 105.00
  },
  { 
    id: 4, 
    nom: 'M. Dubois', 
    nbPersonnes: 2, 
    motif: 'Visite libre',
    dateReservation: '2026-08-21',
    creneauSouhaite: '11:30',
    email: 'j.dubois@email.com',
    telephone: '06 23 45 67 89',
    statut: 'En attente',
    commentaire: 'Amateur de véhicules anciens',
    paiementEffectue: false,
    montantTotal: 18.00
  },
  { 
    id: 5, 
    nom: 'Club Photo Essonne', 
    nbPersonnes: 8, 
    motif: 'Événement',
    dateReservation: '2026-08-21',
    creneauSouhaite: '16:00',
    email: 'club.photo.essonne@gmail.com',
    telephone: '06 98 76 54 32',
    statut: 'Confirmée',
    commentaire: 'Séance photo des véhicules restaurés',
    paiementEffectue: true,
    montantTotal: 60.00
  },
  { 
    id: 6, 
    nom: 'Famille Lefebvre', 
    nbPersonnes: 5, 
    motif: 'Visite libre',
    dateReservation: '2026-08-21',
    creneauSouhaite: '13:30',
    email: 'lefebvre.claire@outlook.com',
    telephone: '07 12 34 56 78',
    statut: 'Confirmée',
    commentaire: '',
    paiementEffectue: false,
    montantTotal: 45.00
  }
];

// Zone tarifaire
const DEMO_BILLETS = [
  { id: 1, nom: 'Adulte', prix: 9.00, description: 'À partir de 18 ans', actif: true },
  { id: 2, nom: 'Enfant', prix: 5.00, description: '6-17 ans', actif: true },
  { id: 3, nom: 'Senior', prix: 7.00, description: '65 ans et plus', actif: true },
  { id: 4, nom: 'Famille', prix: 25.00, description: '2 adultes + 2 enfants', actif: true },
  { id: 5, nom: 'Groupe', prix: 7.50, description: 'À partir de 10 personnes', actif: true },
  { id: 6, nom: 'Scolaire', prix: 3.00, description: 'Par élève', actif: true }
];

const DEMO_OBJETS_BOUTIQUE = [
  { id: 1, nom: 'Miniature Renault TN6C', prix: 25.00, stock: 15, categorie: 'Miniatures' },
  { id: 2, nom: 'Carte postale collection', prix: 2.50, stock: 120, categorie: 'Papeterie' },
  { id: 3, nom: 'Livre Histoire des Bus', prix: 18.00, stock: 8, categorie: 'Livres' },
  { id: 4, nom: 'T-shirt RétroBus', prix: 20.00, stock: 25, categorie: 'Textiles' },
  { id: 5, nom: 'Porte-clés métal', prix: 8.00, stock: 45, categorie: 'Accessoires' },
  { id: 6, nom: 'Affiche vintage A3', prix: 12.00, stock: 30, categorie: 'Papeterie' }
];

const DEMO_REDUCTIONS = [
  { id: 1, nom: 'Demandeur d\'emploi', pourcentage: 30, justificatif: 'Attestation Pôle Emploi', actif: true },
  { id: 2, nom: 'Étudiant', pourcentage: 20, justificatif: 'Carte étudiante', actif: true },
  { id: 3, nom: 'Famille nombreuse', pourcentage: 15, justificatif: 'Carte famille nombreuse', actif: true },
  { id: 4, nom: 'PMR', pourcentage: 50, justificatif: 'Carte mobilité inclusion', actif: true },
  { id: 5, nom: 'Pass Culture', pourcentage: 100, justificatif: 'Application Pass Culture', actif: true }
];

const DEMO_EXONERATIONS = [
  { id: 1, nom: 'Enfant -6 ans', condition: 'Gratuité totale', justificatif: 'Pièce d\'identité', actif: true },
  { id: 2, nom: 'Accompagnateur PMR', condition: '1 accompagnateur gratuit', justificatif: 'Accompagne une personne PMR', actif: true },
  { id: 3, nom: 'Journaliste', condition: 'Sur présentation carte presse', justificatif: 'Carte de presse', actif: true },
  { id: 4, nom: 'Adhérent association', condition: 'Carte membre RBE', justificatif: 'Carte adhérent à jour', actif: true }
];

const DEFAULT_MUSEUM_LAYOUT = {
  logo: { top: 51, left: 50, size: 900, locked: true },
  modules: {
    accueil: { top: 87, left: 50 },
    vehicles: { top: 72, left: 76 },
    restorations: { top: 43, left: 87 },
    stock: { top: 18, left: 73 },
    docs: { top: 10, left: 50 },
    tarification: { top: 18, left: 27 },
    events: { top: 43, left: 13 },
    facing: { top: 72, left: 24 },
    floor: { top: 62, left: 50 },
    staff: { top: 32, left: 31 },
    planning: { top: 32, left: 69 },
    finances: { top: 51, left: 50 }
  }
};

const MUSEUM_LAYOUT_STORAGE_KEY = 'rbe-museum-layout';

const normalizeMuseumLayout = (layout) => ({
  logo: { ...DEFAULT_MUSEUM_LAYOUT.logo, ...(layout?.logo || {}) },
  modules: { ...DEFAULT_MUSEUM_LAYOUT.modules, ...(layout?.modules || {}) },
});

const MUSEUM_MODULE_KEYS = ['accueil', 'vehicles', 'restorations', 'stock', 'docs', 'tarification', 'events', 'facing', 'floor', 'staff', 'planning'];

const getMuseumModuleFromPath = (pathname) => {
  const moduleKey = pathname.replace(/^\/lemusee\/?/, '').split('/')[0];
  return MUSEUM_MODULE_KEYS.includes(moduleKey) ? moduleKey : 'dashboard';
};

// ========== COMPOSANT PRINCIPAL ==========

export default function LeMusee() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingCheckIn, setLoadingCheckIn] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [museumLayout, setMuseumLayout] = useState(DEFAULT_MUSEUM_LAYOUT);
  const [isLayoutMode, setIsLayoutMode] = useState(false);
  const financeModal = useDisclosure();
  const [draggingItem, setDraggingItem] = useState(null);
  const [museumLogoSource, setMuseumLogoSource] = useState('/saturne_urbex.svg');
  const museumCanvasRef = useRef(null);
  const museumLogoInputRef = useRef(null);
  const suppressModuleClickRef = useRef(false);
  const loadedMuseumSections = useRef(new Set());
  const museumLayoutRecordId = useRef(null);

  // États pour les modules
  const [vehicles, setVehicles] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [restorations, setRestorations] = useState([]);
  const [docs, setDocs] = useState([]);
  const [events, setEvents] = useState([]);
  const [facingZones, setFacingZones] = useState([]);
  const [floors, setFloors] = useState([]);
  const [staff, setStaff] = useState([]);
  const [planning, setPlanning] = useState([]);
  const [rbeMembers, setRbeMembers] = useState([]);

  // États pour l'accueil visiteurs
  const [visitorForm, setVisitorForm] = useState({ nom: '', nbPersonnes: 1, motif: 'Visite libre', tarif: 'Adulte', montant: 9.00 });
  const [visitorsToday, setVisitorsToday] = useState([]);
  const [loadingVisitor, setLoadingVisitor] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [loadingReservation, setLoadingReservation] = useState(null);
  const [accueilTab, setAccueilTab] = useState(0);

  // États pour la zone tarifaire
  const [billets, setBillets] = useState([]);
  const [objetsBoutique, setObjetsBoutique] = useState([]);
  const [reductions, setReductions] = useState([]);
  const [exonerations, setExonerations] = useState([]);
  const [museumFinanceEntries, setMuseumFinanceEntries] = useState([]);
  const [museumFinanceForm, setMuseumFinanceForm] = useState({ label: '', amount: '', type: 'CREDIT' });

  // Drawers (remplace les modals)
  const vehicleDrawer = useDisclosure();
  const stockDrawer = useDisclosure();
  const restorationDrawer = useDisclosure();
  const docDrawer = useDisclosure();
  const eventDrawer = useDisclosure();
  const facingDrawer = useDisclosure();
  const floorDrawer = useDisclosure();
  const staffDrawer = useDisclosure();
  const planningDrawer = useDisclosure();
  const catalogDrawer = useDisclosure();

  // Forms
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [catalogSection, setCatalogSection] = useState('tickets');

  const catalogConfigs = {
    tickets: { title: 'tarif', defaults: { nom: '', prix: 0, description: '', actif: true }, setItems: setBillets, createdTitle: 'Tarif ajouté', updatedTitle: 'Tarif modifié' },
    'shop-items': { title: 'article', defaults: { nom: '', prix: 0, stock: 0, categorie: '' }, setItems: setObjetsBoutique, createdTitle: 'Article ajouté', updatedTitle: 'Article modifié' },
    reductions: { title: 'réduction', defaults: { nom: '', pourcentage: 0, justificatif: '', actif: true }, setItems: setReductions, createdTitle: 'Réduction ajoutée', updatedTitle: 'Réduction modifiée' },
    exonerations: { title: 'exonération', defaults: { nom: '', condition: '', justificatif: '', actif: true }, setItems: setExonerations, createdTitle: 'Exonération ajoutée', updatedTitle: 'Exonération modifiée' },
  };

  const navigateToMuseumModule = (moduleKey) => {
    setActiveModule(moduleKey);
    navigate(moduleKey === 'dashboard' ? '/lemusee' : `/lemusee/${moduleKey}`);
  };

  useEffect(() => {
    setActiveModule(getMuseumModuleFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    setIsLayoutMode(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreMuseumLayout = async () => {
      try {
        const response = await museumAPI.workspace.list('layout');
        const savedLayout = response?.records?.[0];
        if (savedLayout?.id && !cancelled) {
          museumLayoutRecordId.current = savedLayout.id;
          setMuseumLayout(normalizeMuseumLayout(savedLayout));
          return;
        }
      } catch (error) {
        console.warn('Impossible de restaurer le placement partagé du Musée:', error);
      }

      try {
        const savedLayout = localStorage.getItem(MUSEUM_LAYOUT_STORAGE_KEY);
        if (savedLayout && !cancelled) setMuseumLayout(normalizeMuseumLayout(JSON.parse(savedLayout)));
      } catch (error) {
        console.warn('Impossible de restaurer le placement local du Musée:', error);
      }
    };

    restoreMuseumLayout();

    return () => { cancelled = true; };
  }, []);

  const saveMuseumLayout = async () => {
    try {
      localStorage.setItem(MUSEUM_LAYOUT_STORAGE_KEY, JSON.stringify(museumLayout));
      const response = museumLayoutRecordId.current
        ? await museumAPI.workspace.update('layout', museumLayoutRecordId.current, museumLayout)
        : await museumAPI.workspace.create('layout', museumLayout);
      museumLayoutRecordId.current = response?.record?.id || museumLayoutRecordId.current;
      setIsLayoutMode(false);
      toast({ title: 'Placement sauvegardé', description: 'La mise en page est disponible sur tous les appareils.', status: 'success', duration: 2500, isClosable: true });
    } catch (error) {
      console.error('Impossible de sauvegarder le placement partagé du Musée:', error);
      toast({ title: 'Sauvegarde serveur impossible', description: 'Le placement est gardé localement mais le mode placement reste actif.', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const updateMuseumLayoutPosition = (itemKey, clientX, clientY) => {
    const canvas = museumCanvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const left = Math.min(93, Math.max(7, ((clientX - canvasRect.left) / canvasRect.width) * 100));
    const top = Math.min(90, Math.max(10, ((clientY - canvasRect.top) / canvasRect.height) * 100));

    setMuseumLayout((currentLayout) => {
      if (itemKey === 'logo') {
        return { ...currentLayout, logo: { top, left } };
      }

      return {
        ...currentLayout,
        modules: {
          ...currentLayout.modules,
          [itemKey]: { top, left }
        }
      };
    });
  };

  const handleLayoutPointerDown = (itemKey, event) => {
    if (!isLayoutMode || (itemKey === 'logo' && museumLayout.logo.locked)) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    suppressModuleClickRef.current = false;
    setDraggingItem({
      key: itemKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY
    });
  };

  const handleLayoutPointerMove = (event) => {
    if (!draggingItem || draggingItem.pointerId !== event.pointerId) return;

    if (Math.abs(event.clientX - draggingItem.startX) > 4 || Math.abs(event.clientY - draggingItem.startY) > 4) {
      suppressModuleClickRef.current = true;
    }

    updateMuseumLayoutPosition(draggingItem.key, event.clientX, event.clientY);
  };

  const handleLayoutPointerUp = (event) => {
    if (!draggingItem || draggingItem.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDraggingItem(null);
  };

  const resetMuseumLayout = () => {
    setMuseumLayout(DEFAULT_MUSEUM_LAYOUT);
    toast({ title: 'Maquette réinitialisée', description: 'Les positions d’origine ont été restaurées.', status: 'info', duration: 2500, isClosable: true });
  };

  const updateMuseumLogoSize = (_, logoSize) => {
    if (Number.isNaN(logoSize)) return;

    setMuseumLayout((currentLayout) => ({
      ...currentLayout,
      logo: {
        ...currentLayout.logo,
        size: Math.min(1000, Math.max(100, logoSize))
      }
    }));
  };

  const toggleMuseumLogoLock = () => {
    setMuseumLayout((currentLayout) => ({
      ...currentLayout,
      logo: {
        ...currentLayout.logo,
        locked: !currentLayout.logo.locked
      }
    }));
  };

  const handleMuseumLogoChange = (event) => {
    const [logoFile] = event.target.files;
    if (!logoFile) return;

    if (logoFile.type !== 'image/svg+xml' && !logoFile.name.toLowerCase().endsWith('.svg')) {
      toast({ title: 'Format non pris en charge', description: 'Choisissez un fichier SVG pour le logo central.', status: 'warning', duration: 3000, isClosable: true });
      event.target.value = '';
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
      const logoSource = fileReader.result;
      setMuseumLogoSource(logoSource);
      setMuseumLayout((currentLayout) => ({
        ...currentLayout,
        logo: { ...currentLayout.logo, source: logoSource }
      }));
      toast({ title: 'Logo mis à jour', description: `${logoFile.name} est utilisé dans l’atelier.`, status: 'success', duration: 2500, isClosable: true });
    };
    fileReader.readAsDataURL(logoFile);
    event.target.value = '';
  };

  // Vérifier l'authentification
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('musee_token');
        if (!token) {
          setIsLoading(false);
          onOpen();
          return;
        }

        const csrfToken = getStoredCSRFToken();
        const response = await fetch('/api/musee/verify', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': csrfToken || ''
          }
        });

        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setCurrentUser(data.user);
          loadCheckIns();
          loadStats();
          loadVehicles();
          loadStockItems();
          loadMuseumWorkspace();
          loadRbeMembers();
        } else {
          localStorage.removeItem('musee_token');
          onOpen();
        }
      } catch (error) {
        console.error('Erreur vérification auth musée:', error);
        onOpen();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [onOpen]);

  const loadCheckIns = async () => {
    try {
      const token = localStorage.getItem('musee_token');
      const response = await fetch('/api/musee/check-ins', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCheckIns(data.checkIns || []);
      }
    } catch (error) {
      console.error('Erreur chargement check-ins:', error);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('musee_token');
      const response = await fetch('/api/musee/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const apiVehicles = await apiClient.get('/api/vehicles');
      if (Array.isArray(apiVehicles)) {
        
        // Mapper les véhicules de l'API vers le format Le Musée
        const mappedVehicles = apiVehicles.map(v => ({
          id: v.id,
          nom: v.modele || 'Véhicule sans nom',
          ref: v.parc || `VEH-${v.id}`,
          annee: v.miseEnCirculation ? new Date(v.miseEnCirculation).getFullYear() : null,
          constructeur: v.marque || 'Inconnu',
          carrossier: '', // Non disponible dans l'API actuelle
          etat: v.etat || 'À définir',
          fonctionnel: v.etat === 'Opérationnel' || v.etat === 'En service',
          immatriculation: v.immat || '',
          kmCompteur: v.mileage || 0,
          dateAcquisition: v.createdAt || null,
          localisation: 'Hangar A', // Valeur par défaut
          commentaires: v.description || '',
          derniereRevision: v.updatedAt || null,
          prochaineSortie: null
        }));
        
        setVehicles(mappedVehicles);
      } else {
        setVehicles([]);
        console.warn('Impossible de charger les véhicules');
      }
    } catch (error) {
      console.error('Erreur chargement véhicules:', error);
      setVehicles([]);
    }
  };

  const loadStockItems = async () => {
    try {
      const data = await stocksAPI.getAll();
      const stocks = Array.isArray(data?.stocks) ? data.stocks : [];
      setStockItems(stocks.map((stock) => ({
        ...stock,
        nom: stock.name,
        ref: stock.reference,
        categorie: stock.category,
        quantite: stock.quantity,
        etat: stock.status,
        emplacement: stock.location,
      })));
    } catch (error) {
      console.error('Erreur chargement stocks:', error);
      setStockItems([]);
    }
  };

  const loadRbeMembers = async () => {
    try {
      const { members = [] } = await membersAPI.getAll();
      setRbeMembers(members.map((member) => ({
        id: member.id,
        name: [member.firstName, member.lastName].filter(Boolean).join(' ') || member.name || member.email,
        email: member.email || '',
        phone: member.phone || member.telephone || '',
      })));
    } catch (error) {
      console.error('Erreur chargement adhérents RBE:', error);
      setRbeMembers([]);
    }
  };

  const loadMuseumSection = async (section, setItems, defaults = []) => {
    if (loadedMuseumSections.current.has(section)) return;
    loadedMuseumSections.current.add(section);
    try {
      const data = await museumAPI.workspace.list(section);
      const records = Array.isArray(data?.records) ? data.records : [];
      if (records.length || !defaults.length) {
        setItems(records);
        return;
      }
      const seeded = await Promise.all(defaults.map((item) => museumAPI.workspace.create(section, item)));
      setItems(seeded.map((result) => result.record));
    } catch (error) {
      console.error(`Erreur chargement Musée ${section}:`, error);
      loadedMuseumSections.current.delete(section);
      setItems(defaults);
    }
  };

  const loadMuseumWorkspace = () => Promise.all([
    loadMuseumSection('restorations', setRestorations, DEMO_RESTORATIONS),
    loadMuseumSection('docs', setDocs, DEMO_DOCS),
    loadMuseumSection('events', setEvents, DEMO_EVENTS),
    loadMuseumSection('facing', setFacingZones, DEMO_FACING_ZONES),
    loadMuseumSection('floor', setFloors, DEMO_FLOORS),
    loadMuseumSection('staff', setStaff, DEMO_STAFF),
    loadMuseumSection('planning', setPlanning, DEMO_PLANNING),
    loadMuseumSection('visitors', setVisitorsToday),
    loadMuseumSection('reservations', setReservations, DEMO_RESERVATIONS),
    loadMuseumSection('tickets', setBillets, DEMO_BILLETS),
    loadMuseumSection('shop-items', setObjetsBoutique, DEMO_OBJETS_BOUTIQUE),
    loadMuseumSection('reductions', setReductions, DEMO_REDUCTIONS),
    loadMuseumSection('exonerations', setExonerations, DEMO_EXONERATIONS),
    loadMuseumSection('museum-finance', setMuseumFinanceEntries),
  ]);

  const saveMuseumFinanceEntry = async () => {
    const amount = Number(museumFinanceForm.amount);
    if (!museumFinanceForm.label.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Saisissez un libellé et un montant positif', status: 'warning', duration: 3000 });
      return;
    }
    try {
      const { record } = await museumAPI.workspace.create('museum-finance', {
        ...museumFinanceForm,
        amount,
        createdAt: new Date().toISOString(),
      });
      setMuseumFinanceEntries((current) => [record, ...current]);
      setMuseumFinanceForm({ label: '', amount: '', type: 'CREDIT' });
      toast({ title: 'Écriture Musée enregistrée', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: 'Enregistrement impossible', description: error.message, status: 'error', duration: 4000 });
    }
  };

  const museumFinanceBalance = museumFinanceEntries.reduce((total, entry) => (
    total + (entry.type === 'DEBIT' ? -Number(entry.amount || 0) : Number(entry.amount || 0))
  ), 0);

  const saveMuseumRecord = async (section, item, setItems, closeDrawer, createdTitle, updatedTitle) => {
    const { id, ...data } = item;
    const result = id ? await museumAPI.workspace.update(section, id, data) : await museumAPI.workspace.create(section, data);
    setItems((current) => id ? current.map((entry) => entry.id === id ? result.record : entry) : [...current, result.record]);
    toast({ title: id ? updatedTitle : createdTitle, status: 'success', duration: 2000 });
    closeDrawer();
  };

  const removeMuseumRecord = async (section, id, setItems, title) => {
    await museumAPI.workspace.remove(section, id);
    setItems((current) => current.filter((item) => item.id !== id));
    toast({ title, status: 'success', duration: 2000 });
  };

  const openCatalogDrawer = (section, item = null) => {
    const config = catalogConfigs[section];
    setCatalogSection(section);
    setEditingItem(item);
    setFormData(item || config.defaults);
    catalogDrawer.onOpen();
  };

  const saveCatalogItem = async () => {
    const config = catalogConfigs[catalogSection];
    if (!formData.nom?.trim()) {
      toast({ title: 'Le nom est requis', status: 'warning', duration: 2500 });
      return;
    }
    try {
      await saveMuseumRecord(catalogSection, { ...formData, id: editingItem?.id }, config.setItems, catalogDrawer.onClose, config.createdTitle, config.updatedTitle);
    } catch (error) {
      toast({ title: 'Enregistrement impossible', description: error.message, status: 'error', duration: 4000 });
    }
  };

  const handleCheckIn = async () => {
    setLoadingCheckIn(true);
    try {
      const token = localStorage.getItem('musee_token');
      const csrfToken = getStoredCSRFToken();
      const response = await fetch('/api/musee/check-in', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        }
      });

      if (response.ok) {
        toast({
          title: 'Check-in réussi !',
          description: `Enregistré à ${new Date().toLocaleTimeString('fr-FR')}`,
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        loadCheckIns();
        loadStats();
      } else {
        const error = await response.json();
        toast({
          title: 'Erreur',
          description: error.error || 'Impossible d\'enregistrer le check-in',
          status: 'error',
          duration: 4000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('Erreur check-in:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur de connexion',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    } finally {
      setLoadingCheckIn(false);
    }
  };

  const handleVisitorCheckIn = async () => {
    if (!visitorForm.nom || !visitorForm.nbPersonnes) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    setLoadingVisitor(true);
    
    const newVisitor = {
      nom: visitorForm.nom,
      nbPersonnes: parseInt(visitorForm.nbPersonnes),
      motif: visitorForm.motif,
      tarif: visitorForm.tarif,
      montantPaye: visitorForm.montant,
      heureArrivee: new Date().toLocaleTimeString('fr-FR'),
      date: new Date().toLocaleDateString('fr-FR'),
      paiementEffectue: true
    };

    try {
      const { record } = await museumAPI.workspace.create('visitors', newVisitor);
      setVisitorsToday((current) => [record, ...current]);
      toast({ title: 'Visiteur enregistré !', description: `${visitorForm.nom} - ${visitorForm.nbPersonnes} personne(s) - ${Number(visitorForm.montant).toFixed(2)}€`, status: 'success', duration: 3000, isClosable: true });
      setVisitorForm({ nom: '', nbPersonnes: 1, motif: 'Visite libre', tarif: 'Adulte', montant: 9.00 });
    } catch (error) {
      toast({ title: 'Enregistrement impossible', description: error.message, status: 'error', duration: 4000, isClosable: true });
    } finally {
      setLoadingVisitor(false);
    }
  };

  const handleReservationArrival = async (reservation, paiementConfirme = false) => {
    if (!paiementConfirme && !reservation.paiementEffectue) {
      toast({
        title: 'Paiement requis',
        description: 'Veuillez confirmer le paiement avant d\'enregistrer l\'arrivée',
        status: 'warning',
        duration: 4000,
        isClosable: true
      });
      return;
    }

    setLoadingReservation(reservation.id);
    
    try {
      const newVisitor = {
        nom: reservation.nom,
        nbPersonnes: reservation.nbPersonnes,
        motif: reservation.motif,
        heureArrivee: new Date().toLocaleTimeString('fr-FR'),
        date: new Date().toLocaleDateString('fr-FR'),
        isFromReservation: true,
        creneauSouhaite: reservation.creneauSouhaite,
        montantPaye: reservation.montantTotal,
        paiementEffectue: true
      };
      const [{ record: visitor }, { record: updatedReservation }] = await Promise.all([
        museumAPI.workspace.create('visitors', newVisitor),
        museumAPI.workspace.update('reservations', reservation.id, { ...reservation, paiementEffectue: true, arrivedAt: new Date().toISOString() }),
      ]);
      setVisitorsToday((current) => [visitor, ...current]);
      setReservations((current) => current.map((item) => item.id === updatedReservation.id ? updatedReservation : item).filter((item) => !item.arrivedAt));
      toast({ title: 'Visiteur enregistré !', description: `${reservation.nom} - ${reservation.nbPersonnes} personne(s) - ${reservation.montantTotal}€`, status: 'success', duration: 3000, isClosable: true });
    } catch (error) {
      toast({ title: 'Enregistrement impossible', description: error.message, status: 'error', duration: 4000, isClosable: true });
    } finally {
      setLoadingReservation(null);
    }
  };

  const handleConfirmPayment = async (reservationId) => {
    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation) return;
    try {
      const { record } = await museumAPI.workspace.update('reservations', reservationId, { ...reservation, paiementEffectue: true });
      setReservations((current) => current.map((item) => item.id === reservationId ? record : item));
      toast({ title: 'Paiement confirmé', status: 'success', duration: 2000, isClosable: true });
    } catch (error) {
      toast({ title: 'Paiement impossible', description: error.message, status: 'error', duration: 4000, isClosable: true });
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    onClose();
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('musee_token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    onOpen();
  };

  // Gestion Stock
  const openStockDrawer = (item = null) => {
    setEditingItem(item);
    setFormData(item || { nom: '', ref: '', categorie: '', quantite: 0, etat: 'Bon', emplacement: '', dateEntree: '' });
    stockDrawer.onOpen();
  };

  const saveStockItem = async () => {
    if (!formData.nom?.trim()) {
      toast({ title: 'Le nom est requis', status: 'warning', duration: 2500 });
      return;
    }
    const payload = {
      name: formData.nom,
      reference: formData.ref,
      category: formData.categorie,
      quantity: Number(formData.quantite) || 0,
      location: formData.emplacement,
      status: formData.etat,
    };
    try {
      if (editingItem) await stocksAPI.update(editingItem.id, payload);
      else await stocksAPI.create(payload);
      await loadStockItems();
      stockDrawer.onClose();
      toast({ title: editingItem ? 'Pièce modifiée' : 'Pièce ajoutée', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: 'Enregistrement impossible', description: error.message, status: 'error', duration: 4000 });
    }
  };

  const deleteStockItem = async (id) => {
    if (confirm('Supprimer cette pièce ?')) {
      try {
        await stocksAPI.delete(id);
        setStockItems((items) => items.filter((item) => item.id !== id));
        toast({ title: 'Pièce supprimée', status: 'info', duration: 2000 });
      } catch (error) {
        toast({ title: 'Suppression impossible', description: error.message, status: 'error', duration: 4000 });
      }
    }
  };

  // Gestion Facing (similaire)
  const saveFacingZone = async () => {
    try { await saveMuseumRecord('facing', { ...formData, id: editingItem?.id }, setFacingZones, facingDrawer.onClose, 'Zone ajoutée', 'Zone modifiée'); }
    catch (error) { toast({ title: 'Enregistrement impossible', description: error.message, status: 'error' }); }
  };

  // Gestion Floor
  const saveFloor = async () => {
    try { await saveMuseumRecord('floor', { ...formData, id: editingItem?.id }, setFloors, floorDrawer.onClose, 'Espace ajouté', 'Espace modifié'); }
    catch (error) { toast({ title: 'Enregistrement impossible', description: error.message, status: 'error' }); }
  };

  // Gestion Staff
  const saveStaff = async () => {
    try { await saveMuseumRecord('staff', { ...formData, id: editingItem?.id }, setStaff, staffDrawer.onClose, 'Membre ajouté', 'Membre modifié'); }
    catch (error) { toast({ title: 'Enregistrement impossible', description: error.message, status: 'error' }); }
  };

  // Gestion Planning
  const savePlanning = async () => {
    try { await saveMuseumRecord('planning', { ...formData, id: editingItem?.id }, setPlanning, planningDrawer.onClose, 'Affectation ajoutée', 'Affectation modifiée'); }
    catch (error) { toast({ title: 'Enregistrement impossible', description: error.message, status: 'error' }); }
  };

  // ========== FONCTIONS NOUVEAUX MODULES ==========

  const openVehicleDrawer = (vehicle = null) => {
    setEditingItem(vehicle);
    setFormData(vehicle || {
      nom: '', ref: '', annee: new Date().getFullYear(), constructeur: '', carrossier: '',
      etat: 'À restaurer', fonctionnel: false, immatriculation: '', localisation: 'Hangar A',
      kmCompteur: 0, dateAcquisition: '', commentaires: ''
    });
    vehicleDrawer.onOpen();
  };

  const saveVehicle = async () => {
    if (!formData.nom?.trim() || !formData.ref?.trim()) {
      toast({ title: 'Le nom et la référence sont requis', status: 'warning', duration: 2500 });
      return;
    }
    const payload = {
      parc: formData.ref,
      modele: formData.nom,
      marque: formData.constructeur,
      immat: formData.immatriculation,
      etat: formData.etat,
      miseEnCirculation: formData.annee ? `${formData.annee}-01-01` : null,
      description: formData.commentaires,
      mileage: Number(formData.kmCompteur) || 0,
    };
    try {
      if (editingItem) await apiClient.put(`/api/vehicles/${encodeURIComponent(editingItem.ref)}`, payload);
      else await apiClient.post('/api/vehicles', payload);
      await loadVehicles();
      vehicleDrawer.onClose();
      toast({ title: editingItem ? 'Véhicule modifié' : 'Véhicule ajouté', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: 'Enregistrement impossible', description: error.message, status: 'error', duration: 4000 });
    }
  };

  const deleteVehicle = async (vehicle) => {
    if (!confirm(`Supprimer ${vehicle.nom} ?`)) return;
    try {
      await apiClient.delete(`/api/vehicles/${encodeURIComponent(vehicle.ref)}`);
      setVehicles((items) => items.filter((item) => item.id !== vehicle.id));
      toast({ title: 'Véhicule supprimé', status: 'warning', duration: 2000 });
    } catch (error) {
      toast({ title: 'Suppression impossible', description: error.message, status: 'error', duration: 4000 });
    }
  };

  const openRestorationDrawer = (resto = null) => {
    setEditingItem(resto);
    setFormData(resto || {
      vehicule: '', responsable: '', dateDebut: new Date().toISOString().split('T')[0],
      avancement: 0, budget: 0, depenses: 0
    });
    restorationDrawer.onOpen();
  };

  const saveRestoration = async () => {
    try { await saveMuseumRecord('restorations', { ...formData, id: editingItem?.id, taches: editingItem?.taches || [] }, setRestorations, restorationDrawer.onClose, 'Restauration créée', 'Restauration modifiée'); }
    catch (error) { toast({ title: 'Enregistrement impossible', description: error.message, status: 'error' }); }
  };

  const openDocDrawer = (doc = null) => {
    setEditingItem(doc);
    setFormData(doc || {
      titre: '', type: 'Manuel', annee: new Date().getFullYear(),
      auteur: '', pages: 0, emplacement: '', numerise: false
    });
    docDrawer.onOpen();
  };

  const saveDoc = async () => {
    try { await saveMuseumRecord('docs', { ...formData, id: editingItem?.id }, setDocs, docDrawer.onClose, 'Document ajouté', 'Document modifié'); }
    catch (error) { toast({ title: 'Enregistrement impossible', description: error.message, status: 'error' }); }
  };

  const openEventDrawer = (event = null) => {
    setEditingItem(event);
    setFormData(event || {
      nom: '', date: '', vehicule: '', lieu: '', type: 'Exposition statique',
      participants: 0, statut: 'En préparation'
    });
    eventDrawer.onOpen();
  };

  const saveEvent = async () => {
    try { await saveMuseumRecord('events', { ...formData, id: editingItem?.id }, setEvents, eventDrawer.onClose, 'Événement créé', 'Événement modifié'); }
    catch (error) { toast({ title: 'Enregistrement impossible', description: error.message, status: 'error' }); }
  };

  const museumModules = [
    { key: 'accueil', icon: FiUserCheck, title: 'Accueil visiteurs', color: '#3b82f6' },
    { key: 'vehicles', icon: FiTruck, title: 'Véhicules', color: '#16a34a' },
    { key: 'restorations', icon: FiTool, title: 'Restaurations', color: '#e11d48' },
    { key: 'stock', icon: FiPackage, title: 'Pièces & stocks', color: '#d97706' },
    { key: 'docs', icon: FiBook, title: 'Documentation', color: '#8b5cf6' },
    { key: 'tarification', icon: FiDollarSign, title: 'Billetterie', color: '#0d9488' },
    { key: 'events', icon: FiCalendar, title: 'Événements', color: '#ec4899' },
    { key: 'facing', icon: FiShoppingBag, title: 'Exposition', color: '#f59e0b' },
    { key: 'floor', icon: FiMapPin, title: 'Espaces', color: '#06b6d4' },
    { key: 'staff', icon: FiUsers, title: 'Équipe', color: '#6366f1' },
    { key: 'planning', icon: FiTrendingUp, title: 'Planning', color: '#84cc16' },
    { key: 'finances', icon: FiDollarSign, title: 'Finances', color: '#facc15', onOpen: financeModal.onOpen }
  ];

  const renderMuseumBreadcrumb = (currentLabel) => (
    <Breadcrumb color="whiteAlpha.600" fontSize="sm" separator="›">
      <BreadcrumbItem>
        <BreadcrumbLink onClick={() => navigateToMuseumModule('dashboard')} _hover={{ color: 'white' }} cursor="pointer">
          Le Musée
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbItem isCurrentPage>
        <BreadcrumbLink color="whiteAlpha.800" cursor="default">{currentLabel}</BreadcrumbLink>
      </BreadcrumbItem>
    </Breadcrumb>
  );

  if (isLoading) {
    return (
      <Box minH="100vh" bg="black" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="rbe.500" thickness="4px" />
          <Text color="white">Chargement du Musée...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="black" position="relative">
      {/* Header */}
      <Box
        position="fixed" top={0} left={0} right={0} zIndex={1000}
        bg="black" borderBottom="1px solid" borderColor="whiteAlpha.200"
      >
        <Box w="full" px={{ base: 4, md: 8, xl: 12 }} py={2}>
          <Flex justifyContent="space-between" alignItems="center">
            <Image src="/myrbe_lemusee.png" alt="RBE | Le Musée" height="80px" objectFit="contain" />
            {isAuthenticated && (
              <HStack spacing={3}>
                <Text color="whiteAlpha.700" fontSize="sm">{currentUser?.username}</Text>
                <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<FiSettings />}
                    variant="ghost"
                    color="white"
                    size="lg"
                    _hover={{ bg: 'whiteAlpha.200' }}
                    _active={{ bg: 'whiteAlpha.300' }}
                    aria-label="Paramètres"
                  />
                  <MenuList bg="gray.900" borderColor="whiteAlpha.300">
                    <MenuItem
                      icon={<FiSettings />}
                      onClick={() => {
                        navigateToMuseumModule('dashboard');
                        setIsLayoutMode(true);
                      }}
                      bg="gray.900"
                      color="white"
                      _hover={{ bg: 'whiteAlpha.200' }}
                    >
                      Modifier la disposition
                    </MenuItem>
                    <MenuItem 
                      icon={<FiHome />} 
                      onClick={() => navigate('/dashboard/home')}
                      bg="gray.900"
                      color="white"
                      _hover={{ bg: 'whiteAlpha.200' }}
                    >
                      Retourner sur l'URBEX
                    </MenuItem>
                    <MenuDivider borderColor="whiteAlpha.300" />
                    <MenuItem 
                      icon={<FiLogOut />} 
                      onClick={handleLogout}
                      bg="gray.900"
                      color="red.300"
                      _hover={{ bg: 'red.900' }}
                    >
                      Déconnexion
                    </MenuItem>
                  </MenuList>
                </Menu>
              </HStack>
            )}
          </Flex>
        </Box>
      </Box>

      {/* Contenu principal */}
      <Box w="full" pt="112px" pb={0} px={{ base: 4, md: 8, xl: 12 }} minH="calc(100vh - 112px)">
        {isAuthenticated ? (
          <VStack spacing={0} align="stretch">
            {/* MODULE: Dashboard */}
            {activeModule === 'dashboard' && (
              <VStack spacing={6} align="stretch">
                <VStack spacing={1} pt={0}>
                  <Heading size="xl" color="white" textAlign="center">RBE | Le Musée</Heading>
                  <Text color="whiteAlpha.700" textAlign="center">{isLayoutMode ? 'Atelier de placement : déplacez le logo et les pastilles sur les lignes rouges.' : 'Choisissez votre espace de travail'}</Text>
                </VStack>

                {isLayoutMode && (
                  <HStack justify="center" spacing={3} flexWrap="wrap">
                  <Button size="sm" leftIcon={<FiSave />} colorScheme="green" variant="outline" onClick={saveMuseumLayout}>
                    Sauvegarder le placement
                  </Button>
                  <Button size="sm" variant="outline" color="whiteAlpha.900" borderColor="whiteAlpha.400" onClick={resetMuseumLayout}>Réinitialiser</Button>
                  <HStack spacing={2}>
                    <Text color="whiteAlpha.800" fontSize="sm">Taille du logo</Text>
                    <NumberInput size="sm" w="92px" min={100} max={1000} step={10} value={museumLayout.logo.size ?? 310} onChange={updateMuseumLogoSize} isDisabled={museumLayout.logo.locked}>
                      <NumberInputField color="white" borderColor="whiteAlpha.400" />
                      <NumberInputStepper><NumberIncrementStepper color="white" borderColor="whiteAlpha.300" /><NumberDecrementStepper color="white" borderColor="whiteAlpha.300" /></NumberInputStepper>
                    </NumberInput>
                  </HStack>
                  <HStack spacing={2}>
                    <Switch size="sm" colorScheme="red" isChecked={Boolean(museumLayout.logo.locked)} onChange={toggleMuseumLogoLock} aria-label="Verrouiller le logo central" />
                    <Text color="whiteAlpha.800" fontSize="sm">Verrouiller le logo</Text>
                  </HStack>
                  </HStack>
                )}

                <Box ref={museumCanvasRef} display={{ base: 'none', lg: 'block' }} position="relative" w="full" maxW="900px" h="650px" mx="auto" overflow="hidden" cursor={isLayoutMode ? 'crosshair' : 'default'}>
                  <input ref={museumLogoInputRef} type="file" accept="image/svg+xml,.svg" onChange={handleMuseumLogoChange} style={{ display: 'none' }} />
                  <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" w="560px" h="560px" borderRadius="full" border="1px solid" borderColor="whiteAlpha.200" pointerEvents="none" />
                  <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" w="470px" h="470px" borderRadius="full" border="1px dashed" borderColor="whiteAlpha.300" opacity="0.7" pointerEvents="none" />
                  <Center position="absolute" top={`${museumLayout.logo.top}%`} left={`${museumLayout.logo.left}%`} transform="translate(-50%, -50%)" zIndex={museumLayout.logo.locked ? 1 : 3} cursor={isLayoutMode && !museumLayout.logo.locked ? 'grab' : 'default'} onPointerDown={(event) => handleLayoutPointerDown('logo', event)} onPointerMove={handleLayoutPointerMove} onPointerUp={handleLayoutPointerUp} onPointerCancel={handleLayoutPointerUp} onDoubleClick={() => !museumLayout.logo.locked && museumLogoInputRef.current?.click()} title={museumLayout.logo.locked ? 'Logo verrouillé derrière les pastilles' : 'Double-cliquez pour remplacer le logo SVG'}>
                    <Box w={`${museumLayout.logo.size ?? 310}px`} h={`${museumLayout.logo.size ?? 310}px`} userSelect="none">
                      <Image src="/saturne_urbex.svg" alt="Saturne RétroBus" w="full" h="full" objectFit="contain" />
                    </Box>
                  </Center>
                  {museumModules.map((module) => (
                    <Button
                      key={module.key}
                      position="absolute"
                      zIndex={2}
                      top={`${museumLayout.modules[module.key]?.top ?? 50}%`}
                      left={`${museumLayout.modules[module.key]?.left ?? 50}%`}
                      transform="translate(-50%, -50%)"
                      w="118px"
                      h="118px"
                      borderRadius="full"
                      bg="gray.800"
                      border="2px solid"
                      borderColor="whiteAlpha.300"
                      color="white"
                      display="flex"
                      flexDirection="column"
                      gap={2}
                      boxShadow="lg"
                      cursor={isLayoutMode ? 'grab' : 'pointer'}
                      userSelect="none"
                      onPointerDown={(event) => handleLayoutPointerDown(module.key, event)}
                      onPointerMove={handleLayoutPointerMove}
                      onPointerUp={handleLayoutPointerUp}
                      onPointerCancel={handleLayoutPointerUp}
                      onClick={() => {
                        if (isLayoutMode || suppressModuleClickRef.current) {
                          suppressModuleClickRef.current = false;
                          return;
                        }
                        if (module.onOpen) {
                          module.onOpen();
                          return;
                        }
                        navigateToMuseumModule(module.key);
                      }}
                      aria-label={`Ouvrir ${module.title}`}
                      _hover={{ bg: 'gray.700', borderColor: module.color, boxShadow: `0 0 22px ${module.color}` }}
                      _focusVisible={{ outline: '3px solid', outlineColor: 'white' }}
                    >
                      <Box as={module.icon} boxSize={7} color={module.color} />
                      <Text fontSize="xs" whiteSpace="normal" lineHeight="short" textAlign="center">{module.title}</Text>
                    </Button>
                  ))}
                </Box>

                <SimpleGrid display={{ base: 'grid', lg: 'none' }} columns={{ base: 2, sm: 3 }} spacing={3}>
                  {museumModules.map((module) => (
                    <Button key={module.key} h="112px" variant="outline" borderColor="whiteAlpha.300" bg="gray.800" color="white" display="flex" flexDirection="column" gap={2} onClick={() => module.onOpen ? module.onOpen() : navigateToMuseumModule(module.key)} aria-label={`Ouvrir ${module.title}`} _hover={{ bg: 'gray.700', borderColor: module.color }}>
                      <Box as={module.icon} boxSize={6} color={module.color} />
                      <Text fontSize="xs" whiteSpace="normal">{module.title}</Text>
                    </Button>
                  ))}
                </SimpleGrid>

              </VStack>
            )}

            {/* MODULE: Accueil Visiteurs */}
            {(activeModule === 'accueil' || activeModule === 'tarification') && (
              <Box w="full" pb={8}>
                <VStack spacing={6} align="stretch">
                  {renderMuseumBreadcrumb(activeModule === 'tarification' ? 'Tarification & billetterie' : 'Accueil visiteurs')}

                  <Divider borderColor="whiteAlpha.300" />

                  {/* Header */}
                  <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                    <Heading size="lg" color="white">
                      <HStack>
                        {activeModule === 'tarification' ? <FiDollarSign /> : <FiUserCheck />}
                        <Text>{activeModule === 'tarification' ? 'Tarification & billetterie' : 'Accueil Visiteurs'}</Text>
                      </HStack>
                    </Heading>
                    {activeModule === 'accueil' && <HStack spacing={3}>
                      <Badge colorScheme="orange" fontSize="md" p={2}>
                        {reservations.length} réservations
                      </Badge>
                      <Badge colorScheme="blue" fontSize="md" p={2}>
                        {visitorsToday.reduce((sum, v) => sum + v.nbPersonnes, 0)} visiteurs
                      </Badge>
                    </HStack>}
                  </Flex>

                  {/* Onglets principaux */}
                  <Tabs index={activeModule === 'tarification' ? 1 : 0} onChange={(index) => navigateToMuseumModule(index === 0 ? 'accueil' : 'tarification')} colorScheme="purple" variant="soft-rounded">
                    <TabList bg="gray.800" p={2} borderRadius="lg">
                      <Tab color="white" _selected={{ bg: 'purple.500', color: 'white' }}>
                        <HStack spacing={2}>
                          <FiUserCheck />
                          <Text>Accueil & Réservations</Text>
                        </HStack>
                      </Tab>
                      <Tab color="white" _selected={{ bg: 'purple.500', color: 'white' }}>
                        <HStack spacing={2}>
                          <FiDollarSign />
                          <Text>Tarification & billetterie</Text>
                        </HStack>
                      </Tab>
                    </TabList>

                    <TabPanels>
                      {/* ONGLET 1: Accueil & Réservations */}
                      <TabPanel p={0} pt={6}>
                        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
                    {/* Formulaire d'enregistrement */}
                    <Card bg="gray.800" borderColor="whiteAlpha.300" borderWidth="1px">
                      <CardHeader>
                        <Heading size="md" color="white">Enregistrer une visite</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <FormControl>
                            <FormLabel color="whiteAlpha.700">Nom / Groupe</FormLabel>
                            <Input 
                              value={visitorForm.nom} 
                              onChange={(e) => setVisitorForm({...visitorForm, nom: e.target.value})}
                              placeholder="Famille Dupont, École..."
                              bg="gray.900"
                              borderColor="whiteAlpha.300"
                              color="white"
                              size="lg"
                            />
                          </FormControl>
                          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                            <FormControl>
                              <FormLabel color="whiteAlpha.700">Nombre de personnes</FormLabel>
                              <NumberInput 
                                value={visitorForm.nbPersonnes} 
                                onChange={(val) => {
                                  const selectedBillet = billets.find(b => b.nom === visitorForm.tarif);
                                  const prix = selectedBillet ? selectedBillet.prix : 0;
                                  setVisitorForm({...visitorForm, nbPersonnes: val, montant: prix * val});
                                }}
                                min={1}
                                bg="gray.900"
                                size="lg"
                              >
                                <NumberInputField borderColor="whiteAlpha.300" color="white" />
                                <NumberInputStepper>
                                  <NumberIncrementStepper borderColor="whiteAlpha.300" color="white" />
                                  <NumberDecrementStepper borderColor="whiteAlpha.300" color="white" />
                                </NumberInputStepper>
                              </NumberInput>
                            </FormControl>
                            <FormControl>
                              <FormLabel color="whiteAlpha.700">Type de billet</FormLabel>
                              <Select 
                                value={visitorForm.tarif} 
                                onChange={(e) => {
                                  const selectedBillet = billets.find(b => b.nom === e.target.value);
                                  const prix = selectedBillet ? selectedBillet.prix : 0;
                                  setVisitorForm({...visitorForm, tarif: e.target.value, montant: prix * visitorForm.nbPersonnes});
                                }}
                                bg="gray.900"
                                borderColor="whiteAlpha.300"
                                color="white"
                                size="lg"
                                _hover={{ borderColor: 'whiteAlpha.400' }}
                              >
                                {billets.filter(b => b.actif).map(billet => (
                                  <option key={billet.id} value={billet.nom} style={{background: '#1a202c'}}>
                                    {billet.nom} - {billet.prix.toFixed(2)}€
                                  </option>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <FormControl>
                            <FormLabel color="whiteAlpha.700">Motif de la visite</FormLabel>
                            <Select 
                              value={visitorForm.motif} 
                              onChange={(e) => setVisitorForm({...visitorForm, motif: e.target.value})}
                              bg="gray.900"
                              borderColor="whiteAlpha.300"
                              color="white"
                              size="lg"
                              _hover={{ borderColor: 'whiteAlpha.400' }}
                            >
                              <option value="Visite libre" style={{background: '#1a202c'}}>Visite libre</option>
                              <option value="Visite guidée" style={{background: '#1a202c'}}>Visite guidée</option>
                              <option value="Événement" style={{background: '#1a202c'}}>Événement</option>
                              <option value="Scolaire" style={{background: '#1a202c'}}>Scolaire</option>
                            </Select>
                          </FormControl>
                          <Box bg="gray.900" p={4} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.300">
                            <HStack justifyContent="space-between">
                              <Text color="whiteAlpha.600" fontSize="sm">Montant à encaisser:</Text>
                              <Text color="green.400" fontWeight="bold" fontSize="xl">
                                {visitorForm.montant.toFixed(2)}€
                              </Text>
                            </HStack>
                          </Box>
                          <Button 
                            colorScheme="blue" 
                            size="lg" 
                            leftIcon={<FiCheckCircle />}
                            onClick={handleVisitorCheckIn}
                            isLoading={loadingVisitor}
                            w="full"
                          >
                            Enregistrer l'arrivée
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Liste des visiteurs aujourd'hui */}
                    <Card bg="gray.800" borderColor="whiteAlpha.300" borderWidth="1px">
                      <CardHeader>
                        <HStack justifyContent="space-between">
                          <Heading size="md" color="white">Visiteurs aujourd'hui</Heading>
                          <Badge colorScheme="purple" fontSize="md">
                            {visitorsToday.length} entrées
                          </Badge>
                        </HStack>
                      </CardHeader>
                      <CardBody>
                        <Box 
                          maxH="500px" 
                          overflowY="auto" 
                          bg="gray.900" 
                          p={3} 
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="whiteAlpha.300"
                        >
                          {visitorsToday.length === 0 ? (
                            <Center py={8}>
                              <VStack spacing={3}>
                                <FiUsers size={48} color="gray" />
                                <Text color="whiteAlpha.500" textAlign="center">
                                  Aucun visiteur enregistré aujourd'hui
                                </Text>
                              </VStack>
                            </Center>
                          ) : (
                            <VStack spacing={3} align="stretch">
                              {visitorsToday.map(visitor => (
                                <Box 
                                  key={visitor.id} 
                                  p={4} 
                                  bg="whiteAlpha.100" 
                                  borderRadius="md"
                                  borderWidth="1px"
                                  borderColor="whiteAlpha.200"
                                  _hover={{ borderColor: 'purple.400', bg: 'whiteAlpha.200' }}
                                  transition="all 0.2s"
                                >
                                  <VStack align="stretch" spacing={2}>
                                    <HStack justifyContent="space-between">
                                      <VStack align="start" spacing={2}>
                                        <HStack spacing={2}>
                                          <Text color="white" fontWeight="bold" fontSize="lg">{visitor.nom}</Text>
                                          {visitor.isFromReservation && (
                                            <Badge colorScheme="orange" fontSize="xs">Pré-réservation</Badge>
                                          )}
                                        </HStack>
                                        <HStack spacing={4} fontSize="sm">
                                          <HStack color="whiteAlpha.700">
                                            <FiUsers />
                                            <Text>{visitor.nbPersonnes} pers.</Text>
                                          </HStack>
                                          <HStack color="whiteAlpha.700">
                                            <FiClock />
                                            <Text>{visitor.heureArrivee}</Text>
                                          </HStack>
                                          {visitor.creneauSouhaite && (
                                            <HStack color="whiteAlpha.500">
                                              <Text fontSize="xs">(Créneau: {visitor.creneauSouhaite})</Text>
                                            </HStack>
                                          )}
                                        </HStack>
                                      </VStack>
                                      <VStack align="end" spacing={1}>
                                        <Badge colorScheme="purple" fontSize="sm" p={2}>{visitor.motif}</Badge>
                                        {visitor.montantPaye && (
                                          <Badge colorScheme="green" fontSize="sm" p={2}>
                                            {visitor.montantPaye.toFixed(2)}€
                                          </Badge>
                                        )}
                                      </VStack>
                                    </HStack>
                                    {visitor.tarif && (
                                      <Text color="whiteAlpha.500" fontSize="xs">
                                        Tarif: {visitor.tarif}
                                      </Text>
                                    )}
                                  </VStack>
                                </Box>
                              ))}
                            </VStack>
                          )}
                        </Box>
                      </CardBody>
                    </Card>

                    {/* Pré-réservations (depuis le site externe) */}
                    <Card bg="gray.800" borderColor="whiteAlpha.300" borderWidth="1px">
                      <CardHeader>
                        <HStack justifyContent="space-between">
                          <Heading size="md" color="white">Pré-réservations</Heading>
                          <Badge colorScheme="orange" fontSize="md">
                            {reservations.length} en attente
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                          Réservations effectuées via le site web
                        </Text>
                      </CardHeader>
                      <CardBody>
                        <Box 
                          maxH="500px" 
                          overflowY="auto" 
                          bg="gray.900" 
                          p={3} 
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="whiteAlpha.300"
                        >
                          {reservations.length === 0 ? (
                            <Center py={8}>
                              <VStack spacing={3}>
                                <FiCalendar size={48} color="gray" />
                                <Text color="whiteAlpha.500" textAlign="center">
                                  Aucune réservation en attente
                                </Text>
                              </VStack>
                            </Center>
                          ) : (
                            <VStack spacing={3} align="stretch">
                              {reservations.map(reservation => (
                                <Box 
                                  key={reservation.id} 
                                  p={4} 
                                  bg="whiteAlpha.100" 
                                  borderRadius="md"
                                  borderWidth="1px"
                                  borderColor={reservation.statut === 'Confirmée' ? 'green.500' : 'orange.500'}
                                  transition="all 0.2s"
                                >
                                  <VStack align="stretch" spacing={3}>
                                    <HStack justifyContent="space-between">
                                      <VStack align="start" spacing={1}>
                                        <Text color="white" fontWeight="bold" fontSize="lg">
                                          {reservation.nom}
                                        </Text>
                                        <HStack spacing={3} fontSize="sm">
                                          <HStack color="whiteAlpha.700">
                                            <FiUsers />
                                            <Text>{reservation.nbPersonnes} pers.</Text>
                                          </HStack>
                                          <HStack color="whiteAlpha.700">
                                            <FiClock />
                                            <Text>{reservation.creneauSouhaite}</Text>
                                          </HStack>
                                        </HStack>
                                      </VStack>
                                      <Badge 
                                        colorScheme={reservation.statut === 'Confirmée' ? 'green' : 'orange'}
                                        fontSize="sm" 
                                        p={2}
                                      >
                                        {reservation.statut}
                                      </Badge>
                                    </HStack>
                                    
                                    <Divider borderColor="whiteAlpha.200" />
                                    
                                    <VStack align="stretch" spacing={2} fontSize="sm">
                                      <HStack color="whiteAlpha.600" justifyContent="space-between">
                                        <Badge colorScheme="purple">{reservation.motif}</Badge>
                                        <HStack spacing={1}>
                                          <FiDollarSign />
                                          <Text fontWeight="bold" color="white">{reservation.montantTotal.toFixed(2)}€</Text>
                                        </HStack>
                                      </HStack>
                                      {reservation.commentaire && (
                                        <Text fontSize="xs" color="whiteAlpha.500">
                                          💬 {reservation.commentaire}
                                        </Text>
                                      )}
                                      <HStack color="whiteAlpha.500" fontSize="xs">
                                        <Text>📧 {reservation.email}</Text>
                                      </HStack>
                                      {reservation.telephone && (
                                        <HStack color="whiteAlpha.500" fontSize="xs">
                                          <Text>📱 {reservation.telephone}</Text>
                                        </HStack>
                                      )}
                                      <HStack spacing={2} pt={2}>
                                        <Badge 
                                          colorScheme={reservation.paiementEffectue ? 'green' : 'red'}
                                          fontSize="xs"
                                        >
                                          {reservation.paiementEffectue ? '✓ Payé' : '✗ Non payé'}
                                        </Badge>
                                      </HStack>
                                    </VStack>

                                    <Divider borderColor="whiteAlpha.200" />

                                    <HStack spacing={2}>
                                      {!reservation.paiementEffectue && (
                                        <Button 
                                          colorScheme="orange" 
                                          size="sm" 
                                          leftIcon={<FiDollarSign />}
                                          onClick={() => handleConfirmPayment(reservation.id)}
                                          flex={1}
                                        >
                                          Confirmer paiement
                                        </Button>
                                      )}
                                      <Button 
                                        colorScheme={reservation.paiementEffectue ? 'green' : 'gray'} 
                                        size="sm" 
                                        leftIcon={<FiCheckCircle />}
                                        onClick={() => handleReservationArrival(reservation, reservation.paiementEffectue)}
                                        isLoading={loadingReservation === reservation.id}
                                        loadingText="Validation..."
                                        flex={1}
                                        isDisabled={!reservation.paiementEffectue}
                                      >
                                        Valider l'arrivée
                                      </Button>
                                  </HStack>
                                  </VStack>
                                </Box>
                              ))}
                            </VStack>
                          )}
                        </Box>
                      </CardBody>
                    </Card>
                  </Grid>
                      </TabPanel>

                      {/* ONGLET 2: Zone Tarifaire */}
                      <TabPanel p={0} pt={6}>
                        <VStack spacing={6} align="stretch">
                          {/* Sous-onglets pour la zone tarifaire */}
                          <Tabs colorScheme="purple" variant="enclosed">
                            <TabList bg="gray.800" borderRadius="md" p={1}>
                              <Tab color="white" _selected={{ bg: 'gray.700', borderColor: 'purple.400' }}>
                                <HStack><FiTag /><Text>Billets</Text></HStack>
                              </Tab>
                              <Tab color="white" _selected={{ bg: 'gray.700', borderColor: 'purple.400' }}>
                                <HStack><FiShoppingBag /><Text>Boutique</Text></HStack>
                              </Tab>
                              <Tab color="white" _selected={{ bg: 'gray.700', borderColor: 'purple.400' }}>
                                <HStack><FiPercent /><Text>Réductions</Text></HStack>
                              </Tab>
                              <Tab color="white" _selected={{ bg: 'gray.700', borderColor: 'purple.400' }}>
                                <HStack><FiCheckCircle /><Text>Exonérations</Text></HStack>
                              </Tab>
                            </TabList>

                            <TabPanels>
                              {/* Billets d'entrée */}
                              <TabPanel>
                                <Box bg="gray.800" p={6} borderRadius="lg" borderWidth="1px" borderColor="whiteAlpha.300">
                                  <VStack spacing={4} align="stretch">
                                    <Flex justify="space-between" align="center">
                                      <Heading size="md" color="white">
                                        <HStack><FiTag /><Text>Tarifs des billets</Text></HStack>
                                      </Heading>
                                      <Button leftIcon={<FiPlus />} colorScheme="green" size="sm" onClick={() => openCatalogDrawer('tickets')}>
                                        Ajouter un tarif
                                      </Button>
                                    </Flex>
                                    <Table variant="simple" size="sm">
                                      <Thead>
                                        <Tr>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Type de billet</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Prix</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Description</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Statut</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Actions</Th>
                                        </Tr>
                                      </Thead>
                                      <Tbody>
                                        {billets.map(billet => (
                                          <Tr key={billet.id}>
                                            <Td color="white" borderColor="whiteAlpha.200" fontWeight="bold">{billet.nom}</Td>
                                            <Td color="white" borderColor="whiteAlpha.200">
                                              <Badge colorScheme="green" fontSize="md" p={2}>
                                                {billet.prix.toFixed(2)}€
                                              </Badge>
                                            </Td>
                                            <Td color="whiteAlpha.600" borderColor="whiteAlpha.200" fontSize="sm">{billet.description}</Td>
                                            <Td borderColor="whiteAlpha.200">
                                              <Badge colorScheme={billet.actif ? 'green' : 'red'}>
                                                {billet.actif ? 'Actif' : 'Inactif'}
                                              </Badge>
                                            </Td>
                                            <Td borderColor="whiteAlpha.200">
                                              <HStack spacing={1}>
                                                <IconButton icon={<FiEdit2 />} size="xs" colorScheme="blue" onClick={() => openCatalogDrawer('tickets', billet)} aria-label={`Modifier ${billet.nom}`} />
                                                <IconButton icon={<FiTrash2 />} size="xs" colorScheme="red" onClick={() => removeMuseumRecord('tickets', billet.id, setBillets, 'Tarif supprimé').catch((error) => toast({ title: 'Suppression impossible', description: error.message, status: 'error' }))} aria-label={`Supprimer ${billet.nom}`} />
                                              </HStack>
                                            </Td>
                                          </Tr>
                                        ))}
                                      </Tbody>
                                    </Table>
                                  </VStack>
                                </Box>
                              </TabPanel>

                              {/* Objets boutique */}
                              <TabPanel>
                                <Box bg="gray.800" p={6} borderRadius="lg" borderWidth="1px" borderColor="whiteAlpha.300">
                                  <VStack spacing={4} align="stretch">
                                    <Flex justify="space-between" align="center">
                                      <Heading size="md" color="white">
                                        <HStack><FiShoppingBag /><Text>Articles de la boutique</Text></HStack>
                                      </Heading>
                                      <Button leftIcon={<FiPlus />} colorScheme="green" size="sm" onClick={() => openCatalogDrawer('shop-items')}>
                                        Ajouter un article
                                      </Button>
                                    </Flex>
                                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                                      {objetsBoutique.map(objet => (
                                        <Card key={objet.id} bg="gray.900" borderColor="whiteAlpha.300" borderWidth="1px">
                                          <CardBody>
                                            <VStack align="stretch" spacing={3}>
                                              <HStack justifyContent="space-between">
                                                <Text color="white" fontWeight="bold">{objet.nom}</Text>
                                                <Badge colorScheme="purple">{objet.categorie}</Badge>
                                              </HStack>
                                              <HStack justifyContent="space-between">
                                                <Text color="whiteAlpha.600" fontSize="sm">Prix:</Text>
                                                <Text color="green.400" fontWeight="bold">{objet.prix.toFixed(2)}€</Text>
                                              </HStack>
                                              <HStack justifyContent="space-between">
                                                <Text color="whiteAlpha.600" fontSize="sm">Stock:</Text>
                                                <Badge colorScheme={objet.stock > 10 ? 'green' : objet.stock > 0 ? 'orange' : 'red'}>
                                                  {objet.stock} unités
                                                </Badge>
                                              </HStack>
                                              <HStack spacing={2} pt={2}>
                                                <IconButton icon={<FiEdit2 />} size="sm" colorScheme="blue" flex={1} onClick={() => openCatalogDrawer('shop-items', objet)} aria-label={`Modifier ${objet.nom}`} />
                                                <IconButton icon={<FiTrash2 />} size="sm" colorScheme="red" flex={1} onClick={() => removeMuseumRecord('shop-items', objet.id, setObjetsBoutique, 'Article supprimé').catch((error) => toast({ title: 'Suppression impossible', description: error.message, status: 'error' }))} aria-label={`Supprimer ${objet.nom}`} />
                                              </HStack>
                                            </VStack>
                                          </CardBody>
                                        </Card>
                                      ))}
                                    </SimpleGrid>
                                  </VStack>
                                </Box>
                              </TabPanel>

                              {/* Réductions */}
                              <TabPanel>
                                <Box bg="gray.800" p={6} borderRadius="lg" borderWidth="1px" borderColor="whiteAlpha.300">
                                  <VStack spacing={4} align="stretch">
                                    <Flex justify="space-between" align="center">
                                      <Heading size="md" color="white">
                                        <HStack><FiPercent /><Text>Grille des réductions</Text></HStack>
                                      </Heading>
                                      <Button leftIcon={<FiPlus />} colorScheme="green" size="sm" onClick={() => openCatalogDrawer('reductions')}>
                                        Ajouter une réduction
                                      </Button>
                                    </Flex>
                                    <Table variant="simple" size="sm">
                                      <Thead>
                                        <Tr>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Type</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Réduction</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Justificatif requis</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Statut</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Actions</Th>
                                        </Tr>
                                      </Thead>
                                      <Tbody>
                                        {reductions.map(reduction => (
                                          <Tr key={reduction.id}>
                                            <Td color="white" borderColor="whiteAlpha.200" fontWeight="bold">{reduction.nom}</Td>
                                            <Td color="white" borderColor="whiteAlpha.200">
                                              <Badge colorScheme="orange" fontSize="md" p={2}>
                                                -{reduction.pourcentage}%
                                              </Badge>
                                            </Td>
                                            <Td color="whiteAlpha.600" borderColor="whiteAlpha.200" fontSize="sm">{reduction.justificatif}</Td>
                                            <Td borderColor="whiteAlpha.200">
                                              <Badge colorScheme={reduction.actif ? 'green' : 'red'}>
                                                {reduction.actif ? 'Actif' : 'Inactif'}
                                              </Badge>
                                            </Td>
                                            <Td borderColor="whiteAlpha.200">
                                              <HStack spacing={1}>
                                                <IconButton icon={<FiEdit2 />} size="xs" colorScheme="blue" onClick={() => openCatalogDrawer('reductions', reduction)} aria-label={`Modifier ${reduction.nom}`} />
                                                <IconButton icon={<FiTrash2 />} size="xs" colorScheme="red" onClick={() => removeMuseumRecord('reductions', reduction.id, setReductions, 'Réduction supprimée').catch((error) => toast({ title: 'Suppression impossible', description: error.message, status: 'error' }))} aria-label={`Supprimer ${reduction.nom}`} />
                                              </HStack>
                                            </Td>
                                          </Tr>
                                        ))}
                                      </Tbody>
                                    </Table>
                                  </VStack>
                                </Box>
                              </TabPanel>

                              {/* Exonérations */}
                              <TabPanel>
                                <Box bg="gray.800" p={6} borderRadius="lg" borderWidth="1px" borderColor="whiteAlpha.300">
                                  <VStack spacing={4} align="stretch">
                                    <Flex justify="space-between" align="center">
                                      <Heading size="md" color="white">
                                        <HStack><FiCheckCircle /><Text>Conditions d'exonération</Text></HStack>
                                      </Heading>
                                      <Button leftIcon={<FiPlus />} colorScheme="green" size="sm" onClick={() => openCatalogDrawer('exonerations')}>
                                        Ajouter une exonération
                                      </Button>
                                    </Flex>
                                    <Table variant="simple" size="sm">
                                      <Thead>
                                        <Tr>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Type</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Condition</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Justificatif</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Statut</Th>
                                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Actions</Th>
                                        </Tr>
                                      </Thead>
                                      <Tbody>
                                        {exonerations.map(exo => (
                                          <Tr key={exo.id}>
                                            <Td color="white" borderColor="whiteAlpha.200" fontWeight="bold">{exo.nom}</Td>
                                            <Td color="white" borderColor="whiteAlpha.200">
                                              <Badge colorScheme="green" fontSize="xs">
                                                {exo.condition}
                                              </Badge>
                                            </Td>
                                            <Td color="whiteAlpha.600" borderColor="whiteAlpha.200" fontSize="sm">{exo.justificatif}</Td>
                                            <Td borderColor="whiteAlpha.200">
                                              <Badge colorScheme={exo.actif ? 'green' : 'red'}>
                                                {exo.actif ? 'Actif' : 'Inactif'}
                                              </Badge>
                                            </Td>
                                            <Td borderColor="whiteAlpha.200">
                                              <HStack spacing={1}>
                                                <IconButton icon={<FiEdit2 />} size="xs" colorScheme="blue" onClick={() => openCatalogDrawer('exonerations', exo)} aria-label={`Modifier ${exo.nom}`} />
                                                <IconButton icon={<FiTrash2 />} size="xs" colorScheme="red" onClick={() => removeMuseumRecord('exonerations', exo.id, setExonerations, 'Exonération supprimée').catch((error) => toast({ title: 'Suppression impossible', description: error.message, status: 'error' }))} aria-label={`Supprimer ${exo.nom}`} />
                                              </HStack>
                                            </Td>
                                          </Tr>
                                        ))}
                                      </Tbody>
                                    </Table>
                                  </VStack>
                                </Box>
                              </TabPanel>
                            </TabPanels>
                          </Tabs>
                        </VStack>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </VStack>
              </Box>
            )}

            {/* MODULE: Stock */}
            {activeModule === 'stock' && (
              <Box w="full" pb={8}>
                <VStack spacing={6} align="stretch">
                  {renderMuseumBreadcrumb('Pièces & Stocks')}
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white"><HStack><FiPackage /><Text>Gestion du Stock</Text></HStack></Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => openStockDrawer()}>Ajouter une pièce</Button>
                  </Flex>

                  <Box overflowX="auto">
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Nom</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Référence</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Catégorie</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Quantité</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">État</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Emplacement</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {stockItems.map(item => (
                          <Tr key={item.id}>
                            <Td color="white" borderColor="whiteAlpha.200">{item.nom}</Td>
                            <Td color="whiteAlpha.800" borderColor="whiteAlpha.200"><Badge>{item.ref}</Badge></Td>
                            <Td color="whiteAlpha.800" borderColor="whiteAlpha.200">{item.categorie}</Td>
                            <Td color="white" borderColor="whiteAlpha.200">{item.quantite}</Td>
                            <Td color="whiteAlpha.800" borderColor="whiteAlpha.200">
                              <Badge colorScheme={item.etat === 'Excellent' ? 'green' : item.etat === 'Bon' ? 'blue' : 'yellow'}>{item.etat}</Badge>
                            </Td>
                            <Td color="whiteAlpha.800" borderColor="whiteAlpha.200">{item.emplacement}</Td>
                            <Td borderColor="whiteAlpha.200">
                              <HStack spacing={2}>
                                <IconButton size="sm" icon={<FiEdit2 />} colorScheme="blue" variant="ghost" onClick={() => openStockDrawer(item)} />
                                <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => deleteStockItem(item.id)} />
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              </Box>
            )}

            {/* MODULE: Véhicules */}
            {activeModule === 'vehicles' && (
              <Box w="full" pb={8}>
                <VStack spacing={6} align="stretch">
                  {renderMuseumBreadcrumb('Véhicules')}
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white"><HStack><FiTruck /><Text>Collection de Véhicules</Text></HStack></Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => openVehicleDrawer()}>
                      Ajouter un véhicule
                    </Button>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                    {vehicles.map(vehicle => (
                      <Card key={vehicle.id} bg="gray.800" borderColor="whiteAlpha.300" borderWidth="1px">
                        <CardHeader>
                          <HStack justify="space-between">
                            <VStack align="start" spacing={1}>
                              <Heading size="md" color="white">{vehicle.nom}</Heading>
                              <Text fontSize="sm" color="whiteAlpha.600">
                                {vehicle.constructeur} • {vehicle.annee}
                              </Text>
                            </VStack>
                            <Badge colorScheme={
                              vehicle.etat === 'Restauré' ? 'green' : 
                              vehicle.etat === 'En restauration' ? 'orange' : 'red'
                            }>
                              {vehicle.etat}
                            </Badge>
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          <VStack align="start" spacing={3}>
                            <HStack>
                              <FiMapPin />
                              <Text color="whiteAlpha.800" fontSize="sm">{vehicle.localisation}</Text>
                            </HStack>
                            <HStack>
                              <Text color="whiteAlpha.700" fontSize="sm">Fonctionnel :</Text>
                              {vehicle.fonctionnel ? (
                                <Badge colorScheme="green"><FiCheck /> Oui</Badge>
                              ) : (
                                <Badge colorScheme="red"><FiX /> Non</Badge>
                              )}
                            </HStack>
                            {vehicle.prochaineSortie && (
                              <Badge colorScheme="purple">
                                <HStack spacing={1}>
                                  <FiCalendar />
                                  <Text>Sortie : {new Date(vehicle.prochaineSortie).toLocaleDateString('fr-FR')}</Text>
                                </HStack>
                              </Badge>
                            )}
                            <Divider borderColor="whiteAlpha.300" />
                            <HStack w="full">
                              <Button size="sm" leftIcon={<FiEdit2 />} variant="outline" colorScheme="blue" 
                                      onClick={() => openVehicleDrawer(vehicle)} flex={1}>
                                Modifier
                              </Button>
                              <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" variant="outline"
                                          onClick={() => deleteVehicle(vehicle)} />
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </VStack>
              </Box>
            )}

            {/* MODULE: Restaurations */}
            {activeModule === 'restorations' && (
              <Box w="full" pb={8}>
                <VStack spacing={6} align="stretch">
                  {renderMuseumBreadcrumb('Restaurations')}
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white"><HStack><FiTool /><Text>Restaurations en Cours</Text></HStack></Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => openRestorationDrawer()}>
                      Nouveau projet
                    </Button>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
                    {restorations.map(resto => (
                      <Card key={resto.id} bg="gray.800" borderColor="whiteAlpha.300" borderWidth="1px">
                        <CardHeader>
                          <VStack align="start" spacing={1}>
                            <Heading size="md" color="white">{resto.vehicule}</Heading>
                            <Text fontSize="sm" color="whiteAlpha.600">
                              Responsable : {resto.responsable}
                            </Text>
                          </VStack>
                        </CardHeader>
                        <CardBody>
                          <VStack align="stretch" spacing={4}>
                            <Box>
                              <HStack justify="space-between" mb={2}>
                                <Text color="whiteAlpha.800" fontSize="sm">Avancement</Text>
                                <Text color="white" fontWeight="bold">{resto.avancement}%</Text>
                              </HStack>
                              <Progress value={resto.avancement} colorScheme="purple" size="lg" borderRadius="md" />
                            </Box>

                            {resto.taches && resto.taches.length > 0 && (
                              <Box>
                                <Text fontWeight="bold" color="white" mb={2} fontSize="sm">Tâches :</Text>
                                <List spacing={2}>
                                  {resto.taches.map((tache, i) => (
                                    <ListItem key={i} fontSize="sm">
                                      <HStack>
                                        <ListIcon
                                          as={tache.statut === 'Terminé' ? FiCheck : tache.statut === 'En cours' ? FiActivity : FiAlertCircle}
                                          color={tache.statut === 'Terminé' ? 'green.400' : tache.statut === 'En cours' ? 'orange.400' : 'gray.400'}
                                        />
                                        <Text color="whiteAlpha.800">{tache.nom}</Text>
                                        <Badge size="sm" colorScheme={
                                          tache.statut === 'Terminé' ? 'green' : 
                                          tache.statut === 'En cours' ? 'orange' : 'gray'
                                        }>
                                          {tache.statut}
                                        </Badge>
                                      </HStack>
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}

                            <Box>
                              <HStack justify="space-between" mb={2}>
                                <Text color="whiteAlpha.800" fontSize="sm">Budget</Text>
                                <Text color="white" fontSize="sm">{resto.depenses}€ / {resto.budget}€</Text>
                              </HStack>
                              <Progress value={(resto.depenses / resto.budget) * 100} colorScheme="blue" size="sm" borderRadius="md" />
                            </Box>

                            <Button size="sm" leftIcon={<FiEdit2 />} variant="outline" colorScheme="blue" 
                                    onClick={() => openRestorationDrawer(resto)}>
                              Modifier le projet
                            </Button>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </VStack>
              </Box>
            )}

            {/* MODULE: Documentation */}
            {activeModule === 'docs' && (
              <Box w="full" pb={8}>
                <VStack spacing={6} align="stretch">
                  {renderMuseumBreadcrumb('Documentation')}
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white"><HStack><FiBook /><Text>Documentation Technique</Text></HStack></Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => openDocDrawer()}>
                      Ajouter un document
                    </Button>
                  </Flex>

                  <Box overflowX="auto">
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Titre</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Type</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Année</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Auteur</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Emplacement</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Statut</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {docs.map(doc => (
                          <Tr key={doc.id}>
                            <Td color="white" borderColor="whiteAlpha.200">{doc.titre}</Td>
                            <Td color="whiteAlpha.800" borderColor="whiteAlpha.200">
                              <Badge>{doc.type}</Badge>
                            </Td>
                            <Td color="whiteAlpha.800" borderColor="whiteAlpha.200">{doc.annee}</Td>
                            <Td color="whiteAlpha.800" borderColor="whiteAlpha.200" fontSize="sm">{doc.auteur}</Td>
                            <Td color="whiteAlpha.800" borderColor="whiteAlpha.200" fontSize="sm">{doc.emplacement}</Td>
                            <Td borderColor="whiteAlpha.200">
                              {doc.numerise ? (
                                <Badge colorScheme="green"><FiCheck /> Numérisé</Badge>
                              ) : (
                                <Badge colorScheme="gray">Physique</Badge>
                              )}
                            </Td>
                            <Td borderColor="whiteAlpha.200">
                              <IconButton size="sm" icon={<FiEdit2 />} colorScheme="blue" variant="ghost"
                                          onClick={() => openDocDrawer(doc)} />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              </Box>
            )}

            {/* MODULE: Événements */}
            {activeModule === 'events' && (
              <Box w="full" pb={8}>
                <VStack spacing={6} align="stretch">
                  {renderMuseumBreadcrumb('Événements & sorties')}
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white"><HStack><FiCalendar /><Text>Événements & Sorties</Text></HStack></Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => openEventDrawer()}>
                      Nouvel événement
                    </Button>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
                    {events.map(event => (
                      <Card key={event.id} bg="gray.800" borderColor="whiteAlpha.300" borderWidth="1px">
                        <CardHeader>
                          <HStack justify="space-between">
                            <VStack align="start" spacing={1}>
                              <Heading size="md" color="white">{event.nom}</Heading>
                              <Text fontSize="sm" color="whiteAlpha.600">
                                {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </Text>
                            </VStack>
                            <Badge colorScheme={
                              event.statut === 'Confirmé' ? 'green' : 
                              event.statut === 'En préparation' ? 'orange' : 'red'
                            }>
                              {event.statut}
                            </Badge>
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          <VStack align="start" spacing={3}>
                            <HStack>
                              <FiMapPin />
                              <Text color="whiteAlpha.800" fontSize="sm">{event.lieu}</Text>
                            </HStack>
                            {event.vehicule && (
                              <HStack>
                                <FiTruck />
                                <Text color="whiteAlpha.800" fontSize="sm">{event.vehicule}</Text>
                              </HStack>
                            )}
                            <Badge colorScheme="purple">{event.type}</Badge>
                            <HStack>
                              <FiUsers />
                              <Text color="whiteAlpha.800" fontSize="sm">{event.participants} participants</Text>
                            </HStack>
                            <Button size="sm" leftIcon={<FiEdit2 />} variant="outline" colorScheme="blue" w="full"
                                    onClick={() => openEventDrawer(event)}>
                              Modifier
                            </Button>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </VStack>
              </Box>
            )}

            {/* MODULE: Facing */}
            {activeModule === 'facing' && (
              <Box w="full" pb={8}>
                <VStack spacing={6} align="stretch">
                  {renderMuseumBreadcrumb('Facing')}
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white"><HStack><FiShoppingBag /><Text>Gestion du Facing</Text></HStack></Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => { setEditingItem(null); setFormData({ nom: '', pieces: 0, rotation: '', derniereMAJ: '', priorite: 'Moyenne' }); facingDrawer.onOpen(); }}>Ajouter une zone</Button>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                    {facingZones.map(zone => (
                      <Card key={zone.id} bg="whiteAlpha.100" borderColor="whiteAlpha.300" borderWidth="1px">
                        <CardHeader>
                          <Flex justify="space-between" align="center">
                            <Heading size="sm" color="white">{zone.nom}</Heading>
                            <Badge colorScheme={zone.priorite === 'Haute' ? 'red' : zone.priorite === 'Moyenne' ? 'orange' : 'green'}>{zone.priorite}</Badge>
                          </Flex>
                        </CardHeader>
                        <CardBody>
                          <VStack align="stretch" spacing={2}>
                            <Text color="whiteAlpha.700" fontSize="sm">📦 {zone.pieces} pièces</Text>
                            <Text color="whiteAlpha.700" fontSize="sm">🔄 Rotation: {zone.rotation}</Text>
                            <Text color="whiteAlpha.600" fontSize="xs">Dernière MAJ: {zone.derniereMAJ}</Text>
                            <HStack spacing={2} mt={2}>
                              <IconButton size="sm" icon={<FiEdit2 />} colorScheme="blue" variant="ghost" onClick={() => { setEditingItem(zone); setFormData(zone); facingDrawer.onOpen(); }} />
                              <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => { if (confirm('Supprimer cette zone ?')) removeMuseumRecord('facing', zone.id, setFacingZones, 'Zone supprimée').catch((error) => toast({ title: 'Suppression impossible', description: error.message, status: 'error' })); }} />
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </VStack>
              </Box>
            )}

            {/* MODULE: Floor */}
            {activeModule === 'floor' && (
              <Box w="full" pb={8}>
                <VStack spacing={6} align="stretch">
                  {renderMuseumBreadcrumb('Espaces')}
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white"><HStack><FiMapPin /><Text>Floor Management</Text></HStack></Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => { setEditingItem(null); setFormData({ nom: '', salles: 0, capacite: 0, superficie: '', theme: '' }); floorDrawer.onOpen(); }}>Ajouter un espace</Button>
                  </Flex>

                  <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
                    {floors.map(floor => (
                      <Card key={floor.id} bg="whiteAlpha.100" borderColor="whiteAlpha.300" borderWidth="1px">
                        <CardHeader>
                          <Heading size="md" color="white">{floor.nom}</Heading>
                        </CardHeader>
                        <CardBody>
                          <VStack align="stretch" spacing={3}>
                            <HStack><FiLayers /><Text color="whiteAlpha.800">{floor.salles} salles</Text></HStack>
                            <HStack><FiUsers /><Text color="whiteAlpha.800">Capacité: {floor.capacite} pers.</Text></HStack>
                            <Text color="whiteAlpha.700" fontSize="sm">📐 {floor.superficie}</Text>
                            <Text color="whiteAlpha.600" fontSize="xs" fontStyle="italic">Thème: {floor.theme}</Text>
                            <HStack spacing={2} mt={2}>
                              <IconButton size="sm" icon={<FiEdit2 />} colorScheme="blue" variant="ghost" onClick={() => { setEditingItem(floor); setFormData(floor); floorDrawer.onOpen(); }} />
                              <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => { if (confirm('Supprimer cet espace ?')) removeMuseumRecord('floor', floor.id, setFloors, 'Espace supprimé').catch((error) => toast({ title: 'Suppression impossible', description: error.message, status: 'error' })); }} />
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </Grid>
                </VStack>
              </Box>
            )}

            {/* MODULE: Staff */}
            {activeModule === 'staff' && (
              <Box w="full" pb={8}>
                <VStack spacing={6} align="stretch">
                  {renderMuseumBreadcrumb('Équipe')}
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white"><HStack><FiUsers /><Text>Gestion de la Main d'œuvre</Text></HStack></Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => { setEditingItem(null); setFormData({ nom: '', role: '', competences: [], disponibilite: 'Temps plein', tel: '' }); staffDrawer.onOpen(); }}>Ajouter un membre</Button>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                    {staff.map(member => (
                      <Card key={member.id} bg="whiteAlpha.100" borderColor="whiteAlpha.300" borderWidth="1px">
                        <CardBody>
                          <Flex gap={4}>
                            <Avatar name={member.nom} size="lg" />
                            <VStack align="start" flex="1" spacing={2}>
                              <Heading size="sm" color="white">{member.nom}</Heading>
                              <Badge colorScheme="purple">{member.role}</Badge>
                              <Wrap spacing={1}>
                                {member.competences.map((comp, i) => (
                                  <WrapItem key={i}><Tag size="sm" colorScheme="blue">{comp}</Tag></WrapItem>
                                ))}
                              </Wrap>
                              <Text color="whiteAlpha.700" fontSize="sm">📞 {member.tel}</Text>
                              <Badge colorScheme={member.disponibilite === 'Temps plein' ? 'green' : 'orange'}>{member.disponibilite}</Badge>
                              <HStack spacing={2} mt={2}>
                                <IconButton size="sm" icon={<FiEdit2 />} colorScheme="blue" variant="ghost" onClick={() => { setEditingItem(member); setFormData(member); staffDrawer.onOpen(); }} />
                                <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => { if (confirm('Supprimer ce membre ?')) removeMuseumRecord('staff', member.id, setStaff, 'Membre supprimé').catch((error) => toast({ title: 'Suppression impossible', description: error.message, status: 'error' })); }} />
                              </HStack>
                            </VStack>
                          </Flex>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </VStack>
              </Box>
            )}

            {/* MODULE: Planning */}
            {activeModule === 'planning' && (
              <Box w="full" pb={8}>
                <VStack spacing={6} align="stretch">
                  {renderMuseumBreadcrumb('Plannings & affectations')}
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white"><HStack><FiCalendar /><Text>Plannings & Affectations</Text></HStack></Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => { setEditingItem(null); setFormData({ personnel: '', zone: '', jour: 'Lundi', horaire: '', tache: '' }); planningDrawer.onOpen(); }}>Nouvelle affectation</Button>
                  </Flex>

                  <Box overflowX="auto">
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Personnel</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Zone</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Jour</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Horaire</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Tâche</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {planning.map(p => (
                          <Tr key={p.id}>
                            <Td color="white" borderColor="whiteAlpha.200">{p.personnel}</Td>
                            <Td color="whiteAlpha.800" borderColor="whiteAlpha.200"><Badge colorScheme="cyan">{p.zone}</Badge></Td>
                            <Td color="whiteAlpha.800" borderColor="whiteAlpha.200">{p.jour}</Td>
                            <Td color="whiteAlpha.800" borderColor="whiteAlpha.200">{p.horaire}</Td>
                            <Td color="whiteAlpha.700" borderColor="whiteAlpha.200">{p.tache}</Td>
                            <Td borderColor="whiteAlpha.200">
                              <HStack spacing={2}>
                                <IconButton size="sm" icon={<FiEdit2 />} colorScheme="blue" variant="ghost" onClick={() => { setEditingItem(p); setFormData(p); planningDrawer.onOpen(); }} />
                                <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => { if (confirm('Supprimer cette affectation ?')) removeMuseumRecord('planning', p.id, setPlanning, 'Affectation supprimée').catch((error) => toast({ title: 'Suppression impossible', description: error.message, status: 'error' })); }} />
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              </Box>
            )}
          </VStack>
        ) : (
          <Center minH="60vh">
            <VStack spacing={4}>
              <Text color="whiteAlpha.600" fontSize="6xl">🔒</Text>
              <Text color="whiteAlpha.600" fontSize="xl">Authentification requise</Text>
              <Text color="whiteAlpha.500">Veuillez vous connecter pour accéder au Musée</Text>
            </VStack>
          </Center>
        )}
      </Box>

      <Modal isOpen={financeModal.isOpen} onClose={financeModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="gray.900" color="white">
          <ModalHeader>Finances opérationnelles du Musée</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={5}>
              <Box borderWidth="1px" borderColor="whiteAlpha.300" p={4} borderRadius="md">
                <Text color="whiteAlpha.700" fontSize="sm">Solde opérationnel Musée</Text>
                <Heading size="lg" color={museumFinanceBalance >= 0 ? 'green.300' : 'red.300'}>
                  {museumFinanceBalance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </Heading>
              </Box>
              <Grid templateColumns={{ base: '1fr', md: '1.3fr 0.8fr 0.7fr auto' }} gap={3} alignItems="end">
                <FormControl><FormLabel>Libellé</FormLabel><Input value={museumFinanceForm.label} onChange={(event) => setMuseumFinanceForm({ ...museumFinanceForm, label: event.target.value })} placeholder="Billetterie, achat pièce..." /></FormControl>
                <FormControl><FormLabel>Montant</FormLabel><NumberInput min={0} precision={2} value={museumFinanceForm.amount} onChange={(value) => setMuseumFinanceForm({ ...museumFinanceForm, amount: value })}><NumberInputField /></NumberInput></FormControl>
                <FormControl><FormLabel>Type</FormLabel><Select value={museumFinanceForm.type} onChange={(event) => setMuseumFinanceForm({ ...museumFinanceForm, type: event.target.value })}><option value="CREDIT">Recette</option><option value="DEBIT">Dépense</option></Select></FormControl>
                <Button leftIcon={<FiPlus />} colorScheme="green" onClick={saveMuseumFinanceEntry}>Ajouter</Button>
              </Grid>
              <Box maxH="260px" overflowY="auto">
                <Table size="sm">
                  <Thead><Tr><Th color="whiteAlpha.600">Libellé</Th><Th color="whiteAlpha.600">Date</Th><Th color="whiteAlpha.600" isNumeric>Montant</Th></Tr></Thead>
                  <Tbody>{museumFinanceEntries.map((entry) => <Tr key={entry.id}><Td>{entry.label}</Td><Td>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('fr-FR') : '-'}</Td><Td isNumeric color={entry.type === 'DEBIT' ? 'red.300' : 'green.300'}>{entry.type === 'DEBIT' ? '-' : '+'}{Number(entry.amount || 0).toFixed(2)} EUR</Td></Tr>)}</Tbody>
                </Table>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter><Button variant="outline" onClick={financeModal.onClose}>Fermer</Button></ModalFooter>
        </ModalContent>
      </Modal>

      {/* Drawers Latéraux - Organisation optimisée pour Rétrobus Essonne */}

      {/* Drawer Véhicules */}
      <Drawer isOpen={vehicleDrawer.isOpen} placement='right' onClose={vehicleDrawer.onClose} size='xl'>
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
            <HStack>
              <FiTruck />
              <VStack align="start" spacing={0}>
                <Heading size="md">{editingItem ? `Modifier ${editingItem.nom}` : 'Nouveau véhicule'}</Heading>
                <Text fontSize="sm" color="whiteAlpha.600">Collection Rétrobus Essonne</Text>
              </VStack>
            </HStack>
          </DrawerHeader>

          <DrawerBody>
            <Tabs colorScheme="purple" variant="enclosed">
              <TabList>
                <Tab>Général</Tab>
                <Tab>État</Tab>
                <Tab>Historique</Tab>
              </TabList>

              <TabPanels>
                {/* ONGLET GÉNÉRAL */}
                <TabPanel>
                  <VStack spacing={6} align="stretch" pt={4}>
                    <Box>
                      <Heading size="sm" mb={3} color="whiteAlpha.800">Identification</Heading>
                      <VStack spacing={4}>
                        <FormControl>
                          <FormLabel>Nom du véhicule</FormLabel>
                          <Input value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} placeholder="Renault TN6C" />
                        </FormControl>
                        <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                          <FormControl>
                            <FormLabel>Référence</FormLabel>
                            <Input value={formData.ref || ''} onChange={(e) => setFormData({...formData, ref: e.target.value})} placeholder="VEH-001" />
                          </FormControl>
                          <FormControl>
                            <FormLabel>Année</FormLabel>
                            <NumberInput value={formData.annee || ''} onChange={(val) => setFormData({...formData, annee: parseInt(val)})}>
                              <NumberInputField placeholder="1952" />
                            </NumberInput>
                          </FormControl>
                        </Grid>
                      </VStack>
                    </Box>

                    <Divider borderColor="whiteAlpha.300" />

                    <Box>
                      <Heading size="sm" mb={3} color="whiteAlpha.800">Construction</Heading>
                      <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                        <FormControl>
                          <FormLabel>Constructeur</FormLabel>
                          <Select value={formData.constructeur || ''} onChange={(e) => setFormData({...formData, constructeur: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }}>
                            <option value="" style={{background: '#1a202c'}}>Sélectionner...</option>
                            <option value="Renault" style={{background: '#1a202c'}}>Renault</option>
                            <option value="Saviem" style={{background: '#1a202c'}}>Saviem</option>
                            <option value="Berliet" style={{background: '#1a202c'}}>Berliet</option>
                            <option value="Citroën" style={{background: '#1a202c'}}>Citroën</option>
                            <option value="Autre" style={{background: '#1a202c'}}>Autre</option>
                          </Select>
                        </FormControl>
                        <FormControl>
                          <FormLabel>Carrossier</FormLabel>
                          <Select value={formData.carrossier || ''} onChange={(e) => setFormData({...formData, carrossier: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }}>
                            <option value="" style={{background: '#1a202c'}}>Sélectionner...</option>
                            <option value="Chausson" style={{background: '#1a202c'}}>Chausson</option>
                            <option value="Heuliez" style={{background: '#1a202c'}}>Heuliez</option>
                            <option value="Gruau" style={{background: '#1a202c'}}>Gruau</option>
                            <option value="Autre" style={{background: '#1a202c'}}>Autre</option>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Box>

                    <Divider borderColor="whiteAlpha.300" />

                    <Box>
                      <Heading size="sm" mb={3} color="whiteAlpha.800">Identification légale</Heading>
                      <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                        <FormControl>
                          <FormLabel>Immatriculation</FormLabel>
                          <Input value={formData.immatriculation || ''} onChange={(e) => setFormData({...formData, immatriculation: e.target.value})} placeholder="91-AB-123" />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Kilométrage</FormLabel>
                          <NumberInput value={formData.kmCompteur || 0} onChange={(val) => setFormData({...formData, kmCompteur: parseInt(val)})}>
                            <NumberInputField />
                          </NumberInput>
                        </FormControl>
                      </Grid>
                    </Box>
                  </VStack>
                </TabPanel>

                {/* ONGLET ÉTAT */}
                <TabPanel>
                  <VStack spacing={6} align="stretch" pt={4}>
                    <Box>
                      <Heading size="sm" mb={3} color="whiteAlpha.800">État général</Heading>
                      <VStack spacing={4}>
                        <FormControl>
                          <FormLabel>État</FormLabel>
                          <Select value={formData.etat || ''} onChange={(e) => setFormData({...formData, etat: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }}>
                            <option value="Restauré" style={{background: '#1a202c'}}>Restauré</option>
                            <option value="En restauration" style={{background: '#1a202c'}}>En restauration</option>
                            <option value="À restaurer" style={{background: '#1a202c'}}>À restaurer</option>
                            <option value="Pour pièces" style={{background: '#1a202c'}}>Pour pièces</option>
                          </Select>
                        </FormControl>
                        <FormControl display="flex" alignItems="center">
                          <FormLabel htmlFor="fonctionnel" mb="0">En état de rouler</FormLabel>
                          <Switch id="fonctionnel" isChecked={formData.fonctionnel || false} onChange={(e) => setFormData({...formData, fonctionnel: e.target.checked})} colorScheme="green" ml={3} />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Localisation</FormLabel>
                          <Select value={formData.localisation || ''} onChange={(e) => setFormData({...formData, localisation: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }}>
                            <option value="Hangar A" style={{background: '#1a202c'}}>Hangar A - Véhicules</option>
                            <option value="Atelier B" style={{background: '#1a202c'}}>Atelier B - Restauration</option>
                            <option value="Extérieur" style={{background: '#1a202c'}}>Extérieur</option>
                          </Select>
                        </FormControl>
                      </VStack>
                    </Box>

                    <Divider borderColor="whiteAlpha.300" />

                    <Box>
                      <Heading size="sm" mb={3} color="whiteAlpha.800">Commentaires</Heading>
                      <FormControl>
                        <Textarea value={formData.commentaires || ''} onChange={(e) => setFormData({...formData, commentaires: e.target.value})} placeholder="Historique, particularités, travaux à prévoir..." rows={6} />
                      </FormControl>
                    </Box>
                  </VStack>
                </TabPanel>

                {/* ONGLET HISTORIQUE */}
                <TabPanel>
                  <VStack spacing={6} align="stretch" pt={4}>
                    <Box>
                      <Heading size="sm" mb={3} color="whiteAlpha.800">Acquisition</Heading>
                      <FormControl>
                        <FormLabel>Date d'acquisition</FormLabel>
                        <Input type="date" value={formData.dateAcquisition || ''} onChange={(e) => setFormData({...formData, dateAcquisition: e.target.value})} />
                      </FormControl>
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </DrawerBody>

          <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
            <Button variant='outline' mr={3} onClick={vehicleDrawer.onClose}>Annuler</Button>
            <Button colorScheme='green' leftIcon={<FiSave />} onClick={saveVehicle}>Enregistrer</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer Restaurations */}
      <Drawer isOpen={restorationDrawer.isOpen} placement='right' onClose={restorationDrawer.onClose} size='lg'>
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
            <HStack>
              <FiTool />
              <VStack align="start" spacing={0}>
                <Heading size="md">{editingItem ? 'Modifier la restauration' : 'Nouvelle restauration'}</Heading>
                <Text fontSize="sm" color="whiteAlpha.600">Projet Rétrobus Essonne</Text>
              </VStack>
            </HStack>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={6} align="stretch" pt={4}>
              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">Informations du projet</Heading>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>Véhicule concerné</FormLabel>
                    <Select value={formData.vehicule || ''} onChange={(e) => setFormData({...formData, vehicule: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }} sx={{'option': {background: '#1a202c'}}}>
                      <option value="">Sélectionner...</option>
                      {vehicles.map(v => <option key={v.id} value={v.nom}>{v.nom}</option>)}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Responsable</FormLabel>
                    <Select value={formData.responsable || ''} onChange={(e) => setFormData({...formData, responsable: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }} sx={{'option': {background: '#1a202c'}}}>
                      <option value="">Sélectionner...</option>
                      {staff.map(s => <option key={s.id} value={s.nom}>{s.nom}</option>)}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Date de début</FormLabel>
                    <Input type="date" value={formData.dateDebut || ''} onChange={(e) => setFormData({...formData, dateDebut: e.target.value})} />
                  </FormControl>
                </VStack>
              </Box>

              <Divider borderColor="whiteAlpha.300" />

              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">Avancement</Heading>
                <FormControl>
                  <FormLabel>Pourcentage d'avancement</FormLabel>
                  <HStack>
                    <NumberInput value={formData.avancement || 0} onChange={(val) => setFormData({...formData, avancement: parseInt(val)})} min={0} max={100}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <Text color="white">%</Text>
                  </HStack>
                </FormControl>
              </Box>

              <Divider borderColor="whiteAlpha.300" />

              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">Budget</Heading>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <FormControl>
                    <FormLabel>Budget alloué (€)</FormLabel>
                    <NumberInput value={formData.budget || 0} onChange={(val) => setFormData({...formData, budget: parseInt(val)})}>
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Dépensé (€)</FormLabel>
                    <NumberInput value={formData.depenses || 0} onChange={(val) => setFormData({...formData, depenses: parseInt(val)})}>
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                </Grid>
              </Box>
            </VStack>
          </DrawerBody>

          <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
            <Button variant='outline' mr={3} onClick={restorationDrawer.onClose}>Annuler</Button>
            <Button colorScheme='green' leftIcon={<FiSave />} onClick={saveRestoration}>Enregistrer</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer Documentation */}
      <Drawer isOpen={docDrawer.isOpen} placement='right' onClose={docDrawer.onClose} size='lg'>
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
            <HStack>
              <FiBook />
              <Text fontSize="lg">{editingItem ? 'Modifier le document' : 'Nouveau document'}</Text>
            </HStack>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={6} align="stretch" pt={4}>
              <FormControl>
                <FormLabel>Titre</FormLabel>
                <Input value={formData.titre || ''} onChange={(e) => setFormData({...formData, titre: e.target.value})} placeholder="Manuel technique..." />
              </FormControl>

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <FormControl>
                  <FormLabel>Type</FormLabel>
                  <Select value={formData.type || ''} onChange={(e) => setFormData({...formData, type: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }}>
                    <option value="Manuel" style={{background: '#1a202c'}}>Manuel</option>
                    <option value="Plans" style={{background: '#1a202c'}}>Plans</option>
                    <option value="Revue" style={{background: '#1a202c'}}>Revue</option>
                    <option value="Catalogue" style={{background: '#1a202c'}}>Catalogue</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Année</FormLabel>
                  <NumberInput value={formData.annee || ''} onChange={(val) => setFormData({...formData, annee: parseInt(val)})}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
              </Grid>

              <FormControl>
                <FormLabel>Auteur</FormLabel>
                <Input value={formData.auteur || ''} onChange={(e) => setFormData({...formData, auteur: e.target.value})} placeholder="Renault, Saviem..." />
              </FormControl>

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <FormControl>
                  <FormLabel>Nombre de pages</FormLabel>
                  <NumberInput value={formData.pages || 0} onChange={(val) => setFormData({...formData, pages: parseInt(val)})}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Emplacement</FormLabel>
                  <Input value={formData.emplacement || ''} onChange={(e) => setFormData({...formData, emplacement: e.target.value})} placeholder="Biblio-A12" />
                </FormControl>
              </Grid>

              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="numerise" mb="0">Document numérisé</FormLabel>
                <Switch id="numerise" isChecked={formData.numerise || false} onChange={(e) => setFormData({...formData, numerise: e.target.checked})} colorScheme="green" ml={3} />
              </FormControl>
            </VStack>
          </DrawerBody>

          <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
            <Button variant='outline' mr={3} onClick={docDrawer.onClose}>Annuler</Button>
            <Button colorScheme='green' leftIcon={<FiSave />} onClick={saveDoc}>Enregistrer</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer Événements */}
      <Drawer isOpen={eventDrawer.isOpen} placement='right' onClose={eventDrawer.onClose} size='lg'>
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
            <HStack>
              <FiCalendar />
              <VStack align="start" spacing={0}>
                <Heading size="md">{editingItem ? 'Modifier l\'événement' : 'Nouvel événement'}</Heading>
                <Text fontSize="sm" color="whiteAlpha.600">Sorties & Expositions</Text>
              </VStack>
            </HStack>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={6} align="stretch" pt={4}>
              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">Informations générales</Heading>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>Nom de l'événement</FormLabel>
                    <Input value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} placeholder="Journées du Patrimoine" />
                  </FormControl>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                    <FormControl>
                      <FormLabel>Date</FormLabel>
                      <Input type="date" value={formData.date || ''} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Lieu</FormLabel>
                      <Input value={formData.lieu || ''} onChange={(e) => setFormData({...formData, lieu: e.target.value})} placeholder="Musée Évry" />
                    </FormControl>
                  </Grid>
                </VStack>
              </Box>

              <Divider borderColor="whiteAlpha.300" />

              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">Détails</Heading>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>Type d'événement</FormLabel>
                    <Select value={formData.type || ''} onChange={(e) => setFormData({...formData, type: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }}>
                      <option value="Exposition statique" style={{background: '#1a202c'}}>Exposition statique</option>
                      <option value="Sortie roulante" style={{background: '#1a202c'}}>Sortie roulante</option>
                      <option value="Visite guidée" style={{background: '#1a202c'}}>Visite guidée</option>
                      <option value="Rallye" style={{background: '#1a202c'}}>Rallye</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Véhicule(s)</FormLabel>
                    <Select value={formData.vehicule || ''} onChange={(e) => setFormData({...formData, vehicule: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }} sx={{'option': {background: '#1a202c'}}}>
                      <option value="">Aucun</option>
                      {vehicles.map(v => <option key={v.id} value={v.nom}>{v.nom}</option>)}
                    </Select>
                  </FormControl>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                    <FormControl>
                      <FormLabel>Participants</FormLabel>
                      <NumberInput value={formData.participants || 0} onChange={(val) => setFormData({...formData, participants: parseInt(val)})}>
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Statut</FormLabel>
                      <Select value={formData.statut || ''} onChange={(e) => setFormData({...formData, statut: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }}>
                        <option value="En préparation" style={{background: '#1a202c'}}>En préparation</option>
                        <option value="Confirmé" style={{background: '#1a202c'}}>Confirmé</option>
                        <option value="Annulé" style={{background: '#1a202c'}}>Annulé</option>
                      </Select>
                    </FormControl>
                  </Grid>
                </VStack>
              </Box>
            </VStack>
          </DrawerBody>

          <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
            <Button variant='outline' mr={3} onClick={eventDrawer.onClose}>Annuler</Button>
            <Button colorScheme='green' leftIcon={<FiSave />} onClick={saveEvent}>Enregistrer</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      
      {/* Drawer Stock/Pièces */}
      <Drawer isOpen={stockDrawer.isOpen} placement='right' onClose={stockDrawer.onClose} size='lg'>
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
            <HStack>
              <FiPackage />
              <VStack align="start" spacing={0}>
                <Heading size="md">{editingItem ? 'Modifier la pièce' : 'Nouvelle pièce'}</Heading>
                <Text fontSize="sm" color="whiteAlpha.600">Inventaire Rétrobus Essonne</Text>
              </VStack>
            </HStack>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={6} align="stretch" pt={4}>
              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">Identification</Heading>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel>Nom</FormLabel>
                    <Input value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} placeholder="Pneu, Ticket, Plaque..." />
                  </FormControl>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                    <FormControl>
                      <FormLabel>Référence</FormLabel>
                      <Input value={formData.ref || ''} onChange={(e) => setFormData({...formData, ref: e.target.value})} placeholder="PIE-001" />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Catégorie</FormLabel>
                      <Select value={formData.categorie || ''} onChange={(e) => setFormData({...formData, categorie: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }}>
                        <option value="" style={{background: '#1a202c'}}>Sélectionner...</option>
                        <option value="Pièce mécanique" style={{background: '#1a202c'}}>Pièce mécanique</option>
                        <option value="Accessoire" style={{background: '#1a202c'}}>Accessoire</option>
                        <option value="Signalétique" style={{background: '#1a202c'}}>Signalétique</option>
                        <option value="Documentation" style={{background: '#1a202c'}}>Documentation</option>
                      </Select>
                    </FormControl>
                  </Grid>
                </VStack>
              </Box>

              <Divider borderColor="whiteAlpha.300" />

              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">Stock & État</Heading>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <FormControl>
                    <FormLabel>Quantité</FormLabel>
                    <NumberInput value={formData.quantite || 0} onChange={(val) => setFormData({...formData, quantite: parseInt(val)})}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  <FormControl>
                    <FormLabel>État</FormLabel>
                    <Select value={formData.etat || 'Bon'} onChange={(e) => setFormData({...formData, etat: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }}>
                      <option value="Neuf" style={{background: '#1a202c'}}>Neuf</option>
                      <option value="Excellent" style={{background: '#1a202c'}}>Excellent</option>
                      <option value="Bon" style={{background: '#1a202c'}}>Bon</option>
                      <option value="Moyen" style={{background: '#1a202c'}}>Moyen</option>
                    </Select>
                  </FormControl>
                </Grid>
              </Box>

              <Divider borderColor="whiteAlpha.300" />

              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">Localisation</Heading>
                <FormControl>
                  <FormLabel>Emplacement</FormLabel>
                  <Input value={formData.emplacement || ''} onChange={(e) => setFormData({...formData, emplacement: e.target.value})} placeholder="Réserve A, Vitrine 3..." />
                </FormControl>
              </Box>
            </VStack>
          </DrawerBody>

          <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
            <Button variant='outline' mr={3} onClick={stockDrawer.onClose}>
              Annuler
            </Button>
            <Button colorScheme='green' leftIcon={<FiSave />} onClick={saveStockItem}>
              Enregistrer
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer isOpen={catalogDrawer.isOpen} placement="right" onClose={catalogDrawer.onClose} size="md">
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="whiteAlpha.200">
            {editingItem ? `Modifier ${catalogConfigs[catalogSection].title}` : `Ajouter ${catalogConfigs[catalogSection].title}`}
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={5} align="stretch">
              <FormControl isRequired><FormLabel>Nom</FormLabel><Input value={formData.nom || ''} onChange={(event) => setFormData({ ...formData, nom: event.target.value })} /></FormControl>
              {(catalogSection === 'tickets' || catalogSection === 'shop-items') && <FormControl><FormLabel>Prix</FormLabel><NumberInput min={0} precision={2} value={formData.prix ?? 0} onChange={(value) => setFormData({ ...formData, prix: Number(value) || 0 })}><NumberInputField /></NumberInput></FormControl>}
              {catalogSection === 'shop-items' && <><FormControl><FormLabel>Stock</FormLabel><NumberInput min={0} value={formData.stock ?? 0} onChange={(value) => setFormData({ ...formData, stock: Number(value) || 0 })}><NumberInputField /></NumberInput></FormControl><FormControl><FormLabel>Catégorie</FormLabel><Input value={formData.categorie || ''} onChange={(event) => setFormData({ ...formData, categorie: event.target.value })} /></FormControl></>}
              {catalogSection === 'tickets' && <FormControl><FormLabel>Description</FormLabel><Textarea value={formData.description || ''} onChange={(event) => setFormData({ ...formData, description: event.target.value })} /></FormControl>}
              {catalogSection === 'reductions' && <FormControl><FormLabel>Réduction (%)</FormLabel><NumberInput min={0} max={100} value={formData.pourcentage ?? 0} onChange={(value) => setFormData({ ...formData, pourcentage: Number(value) || 0 })}><NumberInputField /></NumberInput></FormControl>}
              {catalogSection === 'exonerations' && <FormControl><FormLabel>Condition</FormLabel><Input value={formData.condition || ''} onChange={(event) => setFormData({ ...formData, condition: event.target.value })} /></FormControl>}
              {catalogSection !== 'shop-items' && <FormControl><FormLabel>Justificatif</FormLabel><Input value={formData.justificatif || ''} onChange={(event) => setFormData({ ...formData, justificatif: event.target.value })} /></FormControl>}
              {catalogSection !== 'shop-items' && <FormControl display="flex" alignItems="center"><FormLabel mb="0">Actif</FormLabel><Switch isChecked={Boolean(formData.actif)} onChange={(event) => setFormData({ ...formData, actif: event.target.checked })} /></FormControl>}
            </VStack>
          </DrawerBody>
          <DrawerFooter borderTopWidth="1px" borderColor="whiteAlpha.200"><Button variant="outline" mr={3} onClick={catalogDrawer.onClose}>Annuler</Button><Button colorScheme="green" leftIcon={<FiSave />} onClick={saveCatalogItem}>Enregistrer</Button></DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer Facing */}
      <Drawer isOpen={facingDrawer.isOpen} placement='right' onClose={facingDrawer.onClose} size='lg'>
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
            <HStack>
              <FiShoppingBag />
              <Text fontSize="lg">{editingItem ? 'Modifier la zone' : 'Nouvelle zone'}</Text>
            </HStack>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={6} align="stretch" pt={4}>
              <FormControl>
                <FormLabel>Nom de la zone</FormLabel>
                <Input value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} />
              </FormControl>
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <FormControl>
                  <FormLabel>Nombre de pièces</FormLabel>
                  <NumberInput value={formData.pieces || 0} onChange={(val) => setFormData({...formData, pieces: parseInt(val)})}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Rotation</FormLabel>
                  <Select value={formData.rotation || ''} onChange={(e) => setFormData({...formData, rotation: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }}>
                    <option value="Mensuelle" style={{background: '#1a202c'}}>Mensuelle</option>
                    <option value="Trimestrielle" style={{background: '#1a202c'}}>Trimestrielle</option>
                    <option value="Annuelle" style={{background: '#1a202c'}}>Annuelle</option>
                  </Select>
                </FormControl>
              </Grid>

              <FormControl>
                <FormLabel>Priorité</FormLabel>
                <Select value={formData.priorite || 'Moyenne'} onChange={(e) => setFormData({...formData, priorite: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }}>
                  <option value="Haute" style={{background: '#1a202c'}}>Haute</option>
                  <option value="Moyenne" style={{background: '#1a202c'}}>Moyenne</option>
                  <option value="Basse" style={{background: '#1a202c'}}>Basse</option>
                </Select>
              </FormControl>
            </VStack>
          </DrawerBody>

          <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
            <Button variant='outline' mr={3} onClick={facingDrawer.onClose}>Annuler</Button>
            <Button colorScheme='green' leftIcon={<FiSave />} onClick={saveFacingZone}>Enregistrer</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer Floor */}
      <Drawer isOpen={floorDrawer.isOpen} placement='right' onClose={floorDrawer.onClose} size='lg'>
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
            <HStack>
              <FiMapPin />
              <Text fontSize="lg">{editingItem ? 'Modifier l\'espace' : 'Nouvel espace'}</Text>
            </HStack>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={6} align="stretch" pt={4}>
              <FormControl>
                <FormLabel>Nom</FormLabel>
                <Input value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} />
              </FormControl>
              
              <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                <FormControl>
                  <FormLabel>Salles</FormLabel>
                  <NumberInput value={formData.salles || 0} onChange={(val) => setFormData({...formData, salles: parseInt(val)})}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Capacité</FormLabel>
                  <NumberInput value={formData.capacite || 0} onChange={(val) => setFormData({...formData, capacite: parseInt(val)})}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Superficie</FormLabel>
                  <Input value={formData.superficie || ''} onChange={(e) => setFormData({...formData, superficie: e.target.value})} placeholder="450m²" />
                </FormControl>
              </Grid>

              <FormControl>
                <FormLabel>Thème</FormLabel>
                <Input value={formData.theme || ''} onChange={(e) => setFormData({...formData, theme: e.target.value})} />
              </FormControl>
            </VStack>
          </DrawerBody>

          <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
            <Button variant='outline' mr={3} onClick={floorDrawer.onClose}>Annuler</Button>
            <Button colorScheme='green' leftIcon={<FiSave />} onClick={saveFloor}>Enregistrer</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer Staff/Bénévoles */}
      <Drawer isOpen={staffDrawer.isOpen} placement='right' onClose={staffDrawer.onClose} size='lg'>
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
            <HStack>
              <FiUsers />
              <VStack align="start" spacing={0}>
                <Heading size="md">{editingItem ? 'Modifier le bénévole' : 'Nouveau bénévole'}</Heading>
                <Text fontSize="sm" color="whiteAlpha.600">Association Rétrobus Essonne</Text>
              </VStack>
            </HStack>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={6} align="stretch" pt={4}>
              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">Identité</Heading>
                <FormControl>
                  <FormLabel>Adhérent RBE</FormLabel>
                  <Select value={formData.memberId || ''} onChange={(e) => {
                    const member = rbeMembers.find((item) => item.id === e.target.value);
                    setFormData({ ...formData, memberId: member?.id || '', nom: member?.name || '', tel: member?.phone || formData.tel || '' });
                  }} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }} sx={{'option': {background: '#1a202c'}}}>
                    <option value="">Sélectionner un adhérent...</option>
                    {rbeMembers.map((member) => <option key={member.id} value={member.id}>{member.name}{member.email ? ` - ${member.email}` : ''}</option>)}
                  </Select>
                </FormControl>
              </Box>

              <Divider borderColor="whiteAlpha.300" />

              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">Rôle & Compétences</Heading>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <FormControl>
                    <FormLabel>Rôle principal</FormLabel>
                    <Select value={formData.role || ''} onChange={(e) => setFormData({...formData, role: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }} sx={{'option': {background: '#1a202c'}}}>
                      <option value="">Sélectionner...</option>
                      <option value="Mécanicien">Mécanicien</option>
                      <option value="Carrossier">Carrossier</option>
                      <option value="Guide">Guide</option>
                      <option value="Archiviste">Archiviste</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Disponibilité</FormLabel>
                    <Input value={formData.disponibilite || ''} onChange={(e) => setFormData({...formData, disponibilite: e.target.value})} placeholder="Samedi, Mercredi..." />
                  </FormControl>
                </Grid>
              </Box>

              <Divider borderColor="whiteAlpha.300" />

              <Box>
                <Heading size="sm" mb={3} color="whiteAlpha.800">Contact</Heading>
                <FormControl>
                  <FormLabel>Téléphone</FormLabel>
                  <Input value={formData.tel || ''} onChange={(e) => setFormData({...formData, tel: e.target.value})} placeholder="06 12 34 56 78" />
                </FormControl>
              </Box>
            </VStack>
          </DrawerBody>

          <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
            <Button variant='outline' mr={3} onClick={staffDrawer.onClose}>Annuler</Button>
            <Button colorScheme='green' leftIcon={<FiSave />} onClick={saveStaff}>Enregistrer</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer Planning */}
      <Drawer isOpen={planningDrawer.isOpen} placement='right' onClose={planningDrawer.onClose} size='lg'>
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth='1px' borderColor="whiteAlpha.200">
            <HStack>
              <FiCalendar />
              <Text fontSize="lg">{editingItem ? 'Modifier l\'affectation' : 'Nouvelle affectation'}</Text>
            </HStack>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={6} align="stretch" pt={4}>
              <FormControl>
                <FormLabel>Personnel</FormLabel>
                <Select value={formData.personnel || ''} onChange={(e) => setFormData({...formData, personnel: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }} sx={{'option': {background: '#1a202c'}}}>
                  <option value="">Sélectionner...</option>
                  {rbeMembers.map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}
                </Select>
              </FormControl>
              
              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <FormControl>
                  <FormLabel>Zone</FormLabel>
                  <Input value={formData.zone || ''} onChange={(e) => setFormData({...formData, zone: e.target.value})} />
                </FormControl>
                <FormControl>
                  <FormLabel>Jour</FormLabel>
                  <Select value={formData.jour || 'Lundi'} onChange={(e) => setFormData({...formData, jour: e.target.value})} bg="gray.800" borderColor="whiteAlpha.300" color="white" _hover={{ borderColor: 'whiteAlpha.400' }} sx={{'option': {background: '#1a202c'}}}>
                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(j => <option key={j} value={j}>{j}</option>)}
                  </Select>
                </FormControl>
              </Grid>

              <FormControl>
                <FormLabel>Horaire</FormLabel>
                <Input value={formData.horaire || ''} onChange={(e) => setFormData({...formData, horaire: e.target.value})} placeholder="09:00-17:00" />
              </FormControl>

              <FormControl>
                <FormLabel>Tâche</FormLabel>
                <Input value={formData.tache || ''} onChange={(e) => setFormData({...formData, tache: e.target.value})} placeholder="Révision moteur, Visite guidée..." />
              </FormControl>
            </VStack>
          </DrawerBody>

          <DrawerFooter borderTopWidth='1px' borderColor="whiteAlpha.200">
            <Button variant='outline' mr={3} onClick={planningDrawer.onClose}>Annuler</Button>
            <Button colorScheme='green' leftIcon={<FiSave />} onClick={savePlanning}>Enregistrer</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Modal de connexion */}
      <MuseeLoginModal isOpen={isOpen} onClose={() => navigate('/dashboard/home')} onSuccess={handleLoginSuccess} />
    </Box>
  );
}
