import React, { useState, useEffect } from 'react';
import {
  Box, Container, VStack, HStack, Image, Center, useDisclosure, Spinner, Text, Button,
  Grid, GridItem, Heading, Badge, Divider, useToast, IconButton, Table, Thead, Tbody,
  Tr, Th, Td, Flex, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Card,
  CardHeader, CardBody, Input, Select, Textarea, FormControl, FormLabel,
  Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton,
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
  FiFileText, FiSettings, FiActivity, FiHome, FiUserCheck
} from 'react-icons/fi';
import MuseeLoginModal from '../components/MuseeLoginModal';
import { useNavigate } from 'react-router-dom';
import { getStoredCSRFToken } from '../lib/csrfClient';

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

// ========== COMPOSANT PRINCIPAL ==========

export default function LeMusee() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingCheckIn, setLoadingCheckIn] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');

  // États pour les modules
  const [vehicles, setVehicles] = useState(DEMO_VEHICLES);
  const [stockItems, setStockItems] = useState(DEMO_STOCK_ITEMS);
  const [restorations, setRestorations] = useState(DEMO_RESTORATIONS);
  const [docs, setDocs] = useState(DEMO_DOCS);
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [facingZones, setFacingZones] = useState(DEMO_FACING_ZONES);
  const [floors, setFloors] = useState(DEMO_FLOORS);
  const [staff, setStaff] = useState(DEMO_STAFF);
  const [planning, setPlanning] = useState(DEMO_PLANNING);

  // États pour l'accueil visiteurs
  const [visitorForm, setVisitorForm] = useState({ nom: '', nbPersonnes: 1, motif: 'Visite libre' });
  const [visitorsToday, setVisitorsToday] = useState([]);
  const [loadingVisitor, setLoadingVisitor] = useState(false);

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

  // Forms
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

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
          loadVehicles(); // Charger les véhicules de la collection
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
      // Utiliser le token normal de l'application, pas le token musée
      const normalToken = localStorage.getItem('token');
      const csrfToken = getStoredCSRFToken();
      
      const response = await fetch('/api/vehicles', {
        headers: {
          'Authorization': `Bearer ${normalToken}`,
          'X-CSRF-Token': csrfToken || ''
        }
      });
      
      if (response.ok) {
        const apiVehicles = await response.json();
        
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
        
        // Combiner avec les véhicules de démo (en ajoutant un offset aux IDs pour éviter les conflits)
        const maxApiId = apiVehicles.length > 0 ? Math.max(...apiVehicles.map(v => v.id)) : 0;
        const demoVehiclesWithOffset = DEMO_VEHICLES.map(v => ({
          ...v,
          id: v.id + maxApiId,
          ref: `DEMO-${v.id}`
        }));
        
        setVehicles([...mappedVehicles, ...demoVehiclesWithOffset]);
        
        toast({
          title: 'Véhicules chargés',
          description: `${mappedVehicles.length} véhicules depuis la base de données`,
          status: 'success',
          duration: 3000
        });
      } else {
        console.warn('Impossible de charger les véhicules, utilisation des données de démo');
        // Garder les données de démo en cas d'erreur
      }
    } catch (error) {
      console.error('Erreur chargement véhicules:', error);
      // Garder les données de démo en cas d'erreur
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

  const handleVisitorCheckIn = () => {
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
      id: Date.now(),
      nom: visitorForm.nom,
      nbPersonnes: parseInt(visitorForm.nbPersonnes),
      motif: visitorForm.motif,
      heureArrivee: new Date().toLocaleTimeString('fr-FR'),
      date: new Date().toLocaleDateString('fr-FR')
    };

    setVisitorsToday([newVisitor, ...visitorsToday]);
    
    toast({
      title: 'Visiteur enregistré !',
      description: `${visitorForm.nom} - ${visitorForm.nbPersonnes} personne(s)`,
      status: 'success',
      duration: 3000,
      isClosable: true
    });

    // Réinitialiser le formulaire
    setVisitorForm({ nom: '', nbPersonnes: 1, motif: 'Visite libre' });
    setLoadingVisitor(false);
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

  const saveStockItem = () => {
    if (editingItem) {
      setStockItems(stockItems.map(i => i.id === editingItem.id ? { ...formData, id: editingItem.id } : i));
      toast({ title: 'Pièce modifiée', status: 'success', duration: 2000 });
    } else {
      setStockItems([...stockItems, { ...formData, id: Date.now() }]);
      toast({ title: 'Pièce ajoutée', status: 'success', duration: 2000 });
    }
    stockDrawer.onClose();
  };

  const deleteStockItem = (id) => {
    if (confirm('Supprimer cette pièce ?')) {
      setStockItems(stockItems.filter(i => i.id !== id));
      toast({ title: 'Pièce supprimée', status: 'info', duration: 2000 });
    }
  };

  // Gestion Facing (similaire)
  const saveFacingZone = () => {
    if (editingItem) {
      setFacingZones(facingZones.map(z => z.id === editingItem.id ? { ...formData, id: editingItem.id } : z));
      toast({ title: 'Zone modifiée', status: 'success', duration: 2000 });
    } else {
      setFacingZones([...facingZones, { ...formData, id: Date.now() }]);
      toast({ title: 'Zone ajoutée', status: 'success', duration: 2000 });
    }
    facingDrawer.onClose();
  };

  // Gestion Floor
  const saveFloor = () => {
    if (editingItem) {
      setFloors(floors.map(f => f.id === editingItem.id ? { ...formData, id: editingItem.id } : f));
      toast({ title: 'Espace modifié', status: 'success', duration: 2000 });
    } else {
      setFloors([...floors, { ...formData, id: Date.now() }]);
      toast({ title: 'Espace ajouté', status: 'success', duration: 2000 });
    }
    floorDrawer.onClose();
  };

  // Gestion Staff
  const saveStaff = () => {
    if (editingItem) {
      setStaff(staff.map(s => s.id === editingItem.id ? { ...formData, id: editingItem.id } : s));
      toast({ title: 'Personnel modifié', status: 'success', duration: 2000 });
    } else {
      setStaff([...staff, { ...formData, id: Date.now() }]);
      toast({ title: 'Personnel ajouté', status: 'success', duration: 2000 });
    }
    staffDrawer.onClose();
  };

  // Gestion Planning
  const savePlanning = () => {
    if (editingItem) {
      setPlanning(planning.map(p => p.id === editingItem.id ? { ...formData, id: editingItem.id } : p));
      toast({ title: 'Affectation modifiée', status: 'success', duration: 2000 });
    } else {
      setPlanning([...planning, { ...formData, id: Date.now() }]);
      toast({ title: 'Affectation ajoutée', status: 'success', duration: 2000 });
    }
    planningDrawer.onClose();
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

  const saveVehicle = () => {
    if (editingItem) {
      setVehicles(vehicles.map(v => v.id === editingItem.id ? { ...formData, id: editingItem.id } : v));
      toast({ title: 'Véhicule modifié', status: 'success', duration: 2000 });
    } else {
      setVehicles([...vehicles, { ...formData, id: Date.now() }]);
      toast({ title: 'Véhicule ajouté', status: 'success', duration: 2000 });
    }
    vehicleDrawer.onClose();
  };

  const deleteVehicle = (id) => {
    setVehicles(vehicles.filter(v => v.id !== id));
    toast({ title: 'Véhicule supprimé', status: 'warning', duration: 2000 });
  };

  const openRestorationDrawer = (resto = null) => {
    setEditingItem(resto);
    setFormData(resto || {
      vehicule: '', responsable: '', dateDebut: new Date().toISOString().split('T')[0],
      avancement: 0, budget: 0, depenses: 0
    });
    restorationDrawer.onOpen();
  };

  const saveRestoration = () => {
    if (editingItem) {
      setRestorations(restorations.map(r => r.id === editingItem.id ? { ...formData, id: editingItem.id } : r));
      toast({ title: 'Restauration modifiée', status: 'success', duration: 2000 });
    } else {
      setRestorations([...restorations, { ...formData, id: Date.now(), taches: [] }]);
      toast({ title: 'Restauration créée', status: 'success', duration: 2000 });
    }
    restorationDrawer.onClose();
  };

  const openDocDrawer = (doc = null) => {
    setEditingItem(doc);
    setFormData(doc || {
      titre: '', type: 'Manuel', annee: new Date().getFullYear(),
      auteur: '', pages: 0, emplacement: '', numerise: false
    });
    docDrawer.onOpen();
  };

  const saveDoc = () => {
    if (editingItem) {
      setDocs(docs.map(d => d.id === editingItem.id ? { ...formData, id: editingItem.id } : d));
      toast({ title: 'Document modifié', status: 'success', duration: 2000 });
    } else {
      setDocs([...docs, { ...formData, id: Date.now() }]);
      toast({ title: 'Document ajouté', status: 'success', duration: 2000 });
    }
    docDrawer.onClose();
  };

  const openEventDrawer = (event = null) => {
    setEditingItem(event);
    setFormData(event || {
      nom: '', date: '', vehicule: '', lieu: '', type: 'Exposition statique',
      participants: 0, statut: 'En préparation'
    });
    eventDrawer.onOpen();
  };

  const saveEvent = () => {
    if (editingItem) {
      setEvents(events.map(e => e.id === editingItem.id ? { ...formData, id: editingItem.id } : e));
      toast({ title: 'Événement modifié', status: 'success', duration: 2000 });
    } else {
      setEvents([...events, { ...formData, id: Date.now() }]);
      toast({ title: 'Événement créé', status: 'success', duration: 2000 });
    }
    eventDrawer.onClose();
  };

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
        bg="rgba(0, 0, 0, 0.95)" borderBottom="1px solid" borderColor="whiteAlpha.200" backdropFilter="blur(10px)"
      >
        <Container maxW="container.xl" py={4}>
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
        </Container>
      </Box>

      {/* Contenu principal */}
      <Container maxW="container.xl" pt="120px" pb={8}>
        {isAuthenticated ? (
          <VStack spacing={8} align="stretch">
            {/* Navigation modules */}
            <SimpleGrid columns={{ base: 2, md: 4, lg: 9 }} gap={4}>
              {[
                { key: 'dashboard', label: 'Dashboard', icon: FiTrendingUp },
                { key: 'accueil', label: 'Accueil', icon: FiUserCheck },
                { key: 'vehicles', label: 'Véhicules', icon: FiTruck },
                { key: 'restorations', label: 'Restaurations', icon: FiTool },
                { key: 'stock', label: 'Pièces', icon: FiPackage },
                { key: 'docs', label: 'Documentation', icon: FiBook },
                { key: 'events', label: 'Événements', icon: FiCalendar },
                { key: 'staff', label: 'Bénévoles', icon: FiUsers },
                { key: 'floor', label: 'Espaces', icon: FiMapPin }
              ].map(module => (
                <Button
                  key={module.key}
                  leftIcon={<module.icon />}
                  onClick={() => setActiveModule(module.key)}
                  colorScheme={activeModule === module.key ? 'purple' : 'gray'}
                  variant={activeModule === module.key ? 'solid' : 'outline'}
                  size="lg"
                  color={activeModule === module.key ? 'white' : 'whiteAlpha.800'}
                  borderColor="whiteAlpha.300"
                  _hover={{ borderColor: 'purple.400' }}
                >
                  {module.label}
                </Button>
              ))}
            </SimpleGrid>

            <Divider borderColor="whiteAlpha.300" />

            {/* MODULE: Dashboard */}
            {activeModule === 'dashboard' && (
              <VStack spacing={6} align="stretch">
                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
                  <Card bg="whiteAlpha.50" borderColor="whiteAlpha.200" borderWidth="1px">
                    <CardHeader><Heading size="md" color="white"><HStack><FiCheckCircle /><Text>Check-in rapide</Text></HStack></Heading></CardHeader>
                    <CardBody>
                      <VStack spacing={4}>
                        <Button colorScheme="green" size="lg" w="full" onClick={handleCheckIn} isLoading={loadingCheckIn} leftIcon={<FiCheckCircle />}>
                          Enregistrer ma présence
                        </Button>
                        <Text color="whiteAlpha.600" fontSize="sm">
                          Dernière visite : {checkIns[0] ? new Date(checkIns[0].timestamp).toLocaleDateString('fr-FR') : 'Jamais'}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card bg="whiteAlpha.50" borderColor="whiteAlpha.200" borderWidth="1px">
                    <CardHeader><Heading size="md" color="white"><HStack><FiClock /><Text>Statistiques</Text></HStack></Heading></CardHeader>
                    <CardBody>
                      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
                        {stats && (
                          <>
                            <Stat>
                              <StatLabel color="whiteAlpha.600" fontSize="xs">Pointages</StatLabel>
                              <StatNumber color="white">{stats.totalCheckIns}</StatNumber>
                              <StatHelpText color="whiteAlpha.500" fontSize="xs">Total</StatHelpText>
                            </Stat>
                            <Stat>
                              <StatLabel color="whiteAlpha.600" fontSize="xs">Véhicules</StatLabel>
                              <StatNumber color="white">{vehicles.length}</StatNumber>
                              <StatHelpText color="whiteAlpha.500" fontSize="xs">
                                {vehicles.filter(v => v.fonctionnel).length} opérationnels
                              </StatHelpText>
                            </Stat>
                            <Stat>
                              <StatLabel color="whiteAlpha.600" fontSize="xs">Restaurations</StatLabel>
                              <StatNumber color="white">{restorations.length}</StatNumber>
                              <StatHelpText color="whiteAlpha.500" fontSize="xs">
                                {restorations.length > 0 ? Math.round(restorations.reduce((sum, r) => sum + r.avancement, 0) / restorations.length) : 0}% moy.
                              </StatHelpText>
                            </Stat>
                            <Stat>
                              <StatLabel color="whiteAlpha.600" fontSize="xs">Événements</StatLabel>
                              <StatNumber color="white">{events.filter(e => new Date(e.date) > new Date()).length}</StatNumber>
                              <StatHelpText color="whiteAlpha.500" fontSize="xs">À venir</StatHelpText>
                            </Stat>
                          </>
                        )}
                      </SimpleGrid>
                    </CardBody>
                  </Card>
                </Grid>

                {/* Cartes modules */}
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
                  {[
                    { key: 'vehicles', icon: FiTruck, title: 'Véhicules', desc: 'Collection, fiches techniques, état' },
                    { key: 'restorations', icon: FiTool, title: 'Restaurations', desc: 'Projets en cours, avancement' },
                    { key: 'stock', icon: FiPackage, title: 'Pièces & Stock', desc: 'Inventaire, pièces détachées' },
                    { key: 'docs', icon: FiBook, title: 'Documentation', desc: 'Manuels, plans, archives' },
                    { key: 'events', icon: FiCalendar, title: 'Événements', desc: 'Sorties, expositions, rallyes' },
                    { key: 'staff', icon: FiUsers, title: 'Bénévoles', desc: 'Équipe, compétences' },
                    { key: 'floor', icon: FiMapPin, title: 'Espaces', desc: 'Hangars, ateliers, salles' }
                  ].map(mod => (
                    <Card key={mod.key} bg="whiteAlpha.50" borderColor="whiteAlpha.200" borderWidth="1px" cursor="pointer" 
                          onClick={() => setActiveModule(mod.key)} _hover={{ borderColor: 'purple.400', transform: 'translateY(-2px)' }} transition="all 0.2s">
                      <CardBody>
                        <VStack spacing={3}>
                          <Box fontSize="4xl"><mod.icon /></Box>
                          <Heading size="md" color="white">{mod.title}</Heading>
                          <Text color="whiteAlpha.600" textAlign="center" fontSize="sm">{mod.desc}</Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </VStack>
            )}

            {/* MODULE: Accueil Visiteurs */}
            {activeModule === 'accueil' && (
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
                  {/* Fil d'Ariane */}
                  <Breadcrumb color="whiteAlpha.600" fontSize="sm" separator="›">
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => setActiveModule('dashboard')} _hover={{ color: 'white' }} cursor="pointer">
                        <HStack spacing={1}>
                          <FiHome />
                          <Text>Musée</Text>
                        </HStack>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbItem isCurrentPage>
                      <BreadcrumbLink color="white">
                        <HStack spacing={1}>
                          <FiUserCheck />
                          <Text>Accueil Visiteurs</Text>
                        </HStack>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </Breadcrumb>

                  <Divider borderColor="whiteAlpha.300" />

                  {/* Header */}
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white">
                      <HStack>
                        <FiUserCheck />
                        <Text>Accueil Visiteurs</Text>
                      </HStack>
                    </Heading>
                    <Badge colorScheme="blue" fontSize="lg" p={2}>
                      {visitorsToday.reduce((sum, v) => sum + v.nbPersonnes, 0)} visiteurs aujourd'hui
                    </Badge>
                  </Flex>

                  {/* Contenu principal */}
                  <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
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
                                onChange={(val) => setVisitorForm({...visitorForm, nbPersonnes: val})}
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
                              <FormLabel color="whiteAlpha.700">Motif</FormLabel>
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
                          </Grid>
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
                                  <HStack justifyContent="space-between">
                                    <VStack align="start" spacing={2}>
                                      <Text color="white" fontWeight="bold" fontSize="lg">{visitor.nom}</Text>
                                      <HStack spacing={4} fontSize="sm">
                                        <HStack color="whiteAlpha.700">
                                          <FiUsers />
                                          <Text>{visitor.nbPersonnes} pers.</Text>
                                        </HStack>
                                        <HStack color="whiteAlpha.700">
                                          <FiClock />
                                          <Text>{visitor.heureArrivee}</Text>
                                        </HStack>
                                      </HStack>
                                    </VStack>
                                    <Badge colorScheme="purple" fontSize="sm" p={2}>{visitor.motif}</Badge>
                                  </HStack>
                                </Box>
                              ))}
                            </VStack>
                          )}
                        </Box>
                      </CardBody>
                    </Card>
                  </Grid>
                </VStack>
              </Box>
            )}

            {/* MODULE: Stock */}
            {activeModule === 'stock' && (
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
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
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
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
                                          onClick={() => deleteVehicle(vehicle.id)} />
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
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
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
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
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
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
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
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
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
                              <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => { if(confirm('Supprimer cette zone ?')) { setFacingZones(facingZones.filter(z => z.id !== zone.id)); toast({ title: 'Zone supprimée', status: 'info', duration: 2000 }); }}} />
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
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
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
                              <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => { if(confirm('Supprimer cet espace ?')) { setFloors(floors.filter(f => f.id !== floor.id)); toast({ title: 'Espace supprimé', status: 'info', duration: 2000 }); }}} />
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
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
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
                                <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => { if(confirm('Supprimer ce membre ?')) { setStaff(staff.filter(s => s.id !== member.id)); toast({ title: 'Membre supprimé', status: 'info', duration: 2000 }); }}} />
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
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
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
                                <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => { if(confirm('Supprimer cette affectation ?')) { setPlanning(planning.filter(pl => pl.id !== p.id)); toast({ title: 'Affectation supprimée', status: 'info', duration: 2000 }); }}} />
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
      </Container>

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
                  <FormLabel>Nom complet</FormLabel>
                  <Input value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} />
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
                  {staff.map(s => <option key={s.id} value={s.nom}>{s.nom}</option>)}
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
