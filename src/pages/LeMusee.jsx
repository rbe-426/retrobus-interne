import React, { useState, useEffect } from 'react';
import {
  Box, Container, VStack, HStack, Image, Center, useDisclosure, Spinner, Text, Button,
  Grid, GridItem, Heading, Badge, Divider, useToast, IconButton, Table, Thead, Tbody,
  Tr, Th, Td, Flex, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Card,
  CardHeader, CardBody, Input, Select, Textarea, FormControl, FormLabel, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Switch, Tabs, TabList, TabPanels, Tab, TabPanel, Avatar,
  Progress, Tag, TagLabel, TagCloseButton, Wrap, WrapItem
} from '@chakra-ui/react';
import {
  FiLogOut, FiCheckCircle, FiClock, FiUser, FiPackage, FiLayers, FiUsers, FiCalendar,
  FiShoppingBag, FiTrendingUp, FiMapPin, FiPlus, FiEdit2, FiTrash2, FiAlertCircle,
  FiCheck, FiX, FiSave, FiSearch, FiFilter
} from 'react-icons/fi';
import MuseeLoginModal from '../components/MuseeLoginModal';
import { useNavigate } from 'react-router-dom';
import { getStoredCSRFToken } from '../lib/csrfClient';

// ========== DONNÉES DE DÉMONSTRATION ==========

const DEMO_STOCK_ITEMS = [
  { id: 1, nom: 'Autobus Renault TN6C', ref: 'BUS-001', categorie: 'Véhicule', quantite: 1, etat: 'Excellent', emplacement: 'Salle A1', dateEntree: '2024-01-15' },
  { id: 2, nom: 'Ticket poinçonneur ancien', ref: 'ACC-045', categorie: 'Accessoire', quantite: 250, etat: 'Bon', emplacement: 'Réserve B', dateEntree: '2023-11-20' },
  { id: 3, nom: 'Plaque émaillée RATP', ref: 'SIG-012', categorie: 'Signalétique', quantite: 12, etat: 'Moyen', emplacement: 'Vitrine 3', dateEntree: '2024-03-10' },
  { id: 4, nom: 'Uniforme receveur 1960', ref: 'TEX-008', categorie: 'Textile', quantite: 3, etat: 'Bon', emplacement: 'Salle B2', dateEntree: '2024-02-05' },
  { id: 5, nom: 'Maquette bus Parisien', ref: 'MOD-022', categorie: 'Modèle réduit', quantite: 8, etat: 'Excellent', emplacement: 'Vitrine 1', dateEntree: '2023-12-18' },
];

const DEMO_FACING_ZONES = [
  { id: 1, nom: 'Vitrine d\'accueil', pieces: 15, rotation: 'Mensuelle', derniereMAJ: '2026-08-01', priorite: 'Haute' },
  { id: 2, nom: 'Exposition temporaire', pieces: 8, rotation: 'Trimestrielle', derniereMAJ: '2026-07-15', priorite: 'Moyenne' },
  { id: 3, nom: 'Collection permanente', pieces: 42, rotation: 'Annuelle', derniereMAJ: '2026-01-10', priorite: 'Basse' },
];

const DEMO_FLOORS = [
  { id: 1, nom: 'Rez-de-chaussée', salles: 5, capacite: 200, superficie: '450m²', theme: 'Histoire du transport parisien' },
  { id: 2, nom: 'Étage 1', salles: 4, capacite: 150, superficie: '380m²', theme: 'Évolution technologique' },
  { id: 3, nom: 'Sous-sol', salles: 2, capacite: 80, superficie: '200m²', theme: 'Réserves et atelier' },
];

const DEMO_STAFF = [
  { id: 1, nom: 'Martin Dupont', role: 'Conservateur', competences: ['Restauration', 'Catalogage'], disponibilite: 'Temps plein', tel: '06 12 34 56 78' },
  { id: 2, nom: 'Sophie Bernard', role: 'Guide', competences: ['Médiation', 'Anglais'], disponibilite: 'Temps partiel', tel: '06 23 45 67 89' },
  { id: 3, nom: 'Jean Moreau', role: 'Agent de sécurité', competences: ['Sécurité incendie', 'Premiers secours'], disponibilite: 'Temps plein', tel: '06 34 56 78 90' },
  { id: 4, nom: 'Claire Lefebvre', role: 'Médiatrice', competences: ['Pédagogie', 'Espagnol'], disponibilite: 'Temps partiel', tel: '06 45 67 89 01' },
];

const DEMO_PLANNING = [
  { id: 1, personnel: 'Martin Dupont', zone: 'Rez-de-chaussée', jour: 'Lundi', horaire: '09:00-17:00', tache: 'Supervision exposition' },
  { id: 2, personnel: 'Sophie Bernard', zone: 'Étage 1', jour: 'Lundi', horaire: '10:00-14:00', tache: 'Visite guidée' },
  { id: 3, personnel: 'Jean Moreau', zone: 'Rez-de-chaussée', jour: 'Lundi', horaire: '08:00-16:00', tache: 'Surveillance' },
  { id: 4, personnel: 'Claire Lefebvre', zone: 'Exposition temporaire', jour: 'Mardi', horaire: '14:00-18:00', tache: 'Médiation scolaire' },
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
  const [stockItems, setStockItems] = useState(DEMO_STOCK_ITEMS);
  const [facingZones, setFacingZones] = useState(DEMO_FACING_ZONES);
  const [floors, setFloors] = useState(DEMO_FLOORS);
  const [staff, setStaff] = useState(DEMO_STAFF);
  const [planning, setPlanning] = useState(DEMO_PLANNING);

  // Modals
  const stockModal = useDisclosure();
  const facingModal = useDisclosure();
  const floorModal = useDisclosure();
  const staffModal = useDisclosure();
  const planningModal = useDisclosure();

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

  const handleCheckIn = async () => {
    setLoadingCheckIn(true);
    try {
      const token = localStorage.getItem('musee_token');
      const response = await fetch('/api/musee/check-in', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
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
  const openStockModal = (item = null) => {
    setEditingItem(item);
    setFormData(item || { nom: '', ref: '', categorie: '', quantite: 0, etat: 'Bon', emplacement: '', dateEntree: '' });
    stockModal.onOpen();
  };

  const saveStockItem = () => {
    if (editingItem) {
      setStockItems(stockItems.map(i => i.id === editingItem.id ? { ...formData, id: editingItem.id } : i));
      toast({ title: 'Pièce modifiée', status: 'success', duration: 2000 });
    } else {
      setStockItems([...stockItems, { ...formData, id: Date.now() }]);
      toast({ title: 'Pièce ajoutée', status: 'success', duration: 2000 });
    }
    stockModal.onClose();
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
    facingModal.onClose();
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
    floorModal.onClose();
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
    staffModal.onClose();
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
    planningModal.onClose();
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
                <IconButton
                  icon={<FiLogOut />} onClick={handleLogout} colorScheme="red" variant="ghost"
                  aria-label="Déconnexion" size="lg" color="white" _hover={{ bg: 'whiteAlpha.200' }}
                />
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
            <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap={4}>
              {[
                { key: 'dashboard', label: 'Dashboard', icon: FiTrendingUp },
                { key: 'stock', label: 'Stock', icon: FiPackage },
                { key: 'facing', label: 'Facing', icon: FiShoppingBag },
                { key: 'floor', label: 'Floor', icon: FiMapPin },
                { key: 'staff', label: 'Staff', icon: FiUsers },
                { key: 'planning', label: 'Planning', icon: FiCalendar }
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
                      {stats && (
                        <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                          <Stat><StatLabel color="whiteAlpha.600" fontSize="xs">Total</StatLabel><StatNumber color="white">{stats.totalCheckIns}</StatNumber></Stat>
                          <Stat><StatLabel color="whiteAlpha.600" fontSize="xs">Ce mois</StatLabel><StatNumber color="white">{stats.thisMonth}</StatNumber></Stat>
                          <Stat><StatLabel color="whiteAlpha.600" fontSize="xs">Semaine</StatLabel><StatNumber color="white">{stats.thisWeek}</StatNumber></Stat>
                        </Grid>
                      )}
                    </CardBody>
                  </Card>
                </Grid>

                {/* Cartes modules */}
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                  {[
                    { key: 'stock', icon: FiPackage, title: 'Gestion Stock', desc: 'Inventaire, entrées/sorties, alertes de stock' },
                    { key: 'facing', icon: FiShoppingBag, title: 'Gestion Facing', desc: 'Merchandising, disposition, rotations' },
                    { key: 'floor', icon: FiMapPin, title: 'Floor Management', desc: 'Salles, étages, zones d\'exposition' },
                    { key: 'staff', icon: FiUsers, title: 'Main d\'œuvre', desc: 'Personnel, compétences, disponibilités' },
                    { key: 'planning', icon: FiCalendar, title: 'Plannings', desc: 'Affectations, horaires, rotations' }
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

            {/* MODULE: Stock */}
            {activeModule === 'stock' && (
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white"><HStack><FiPackage /><Text>Gestion du Stock</Text></HStack></Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => openStockModal()}>Ajouter une pièce</Button>
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
                                <IconButton size="sm" icon={<FiEdit2 />} colorScheme="blue" variant="ghost" onClick={() => openStockModal(item)} />
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

            {/* MODULE: Facing */}
            {activeModule === 'facing' && (
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
                  <Flex justify="space-between" align="center">
                    <Heading size="lg" color="white"><HStack><FiShoppingBag /><Text>Gestion du Facing</Text></HStack></Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => { setEditingItem(null); setFormData({ nom: '', pieces: 0, rotation: '', derniereMAJ: '', priorite: 'Moyenne' }); facingModal.onOpen(); }}>Ajouter une zone</Button>
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
                              <IconButton size="sm" icon={<FiEdit2 />} colorScheme="blue" variant="ghost" onClick={() => { setEditingItem(zone); setFormData(zone); facingModal.onOpen(); }} />
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
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => { setEditingItem(null); setFormData({ nom: '', salles: 0, capacite: 0, superficie: '', theme: '' }); floorModal.onOpen(); }}>Ajouter un espace</Button>
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
                              <IconButton size="sm" icon={<FiEdit2 />} colorScheme="blue" variant="ghost" onClick={() => { setEditingItem(floor); setFormData(floor); floorModal.onOpen(); }} />
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
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => { setEditingItem(null); setFormData({ nom: '', role: '', competences: [], disponibilite: 'Temps plein', tel: '' }); staffModal.onOpen(); }}>Ajouter un membre</Button>
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
                                <IconButton size="sm" icon={<FiEdit2 />} colorScheme="blue" variant="ghost" onClick={() => { setEditingItem(member); setFormData(member); staffModal.onOpen(); }} />
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
                    <Button leftIcon={<FiPlus />} colorScheme="green" onClick={() => { setEditingItem(null); setFormData({ personnel: '', zone: '', jour: 'Lundi', horaire: '', tache: '' }); planningModal.onOpen(); }}>Nouvelle affectation</Button>
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
                                <IconButton size="sm" icon={<FiEdit2 />} colorScheme="blue" variant="ghost" onClick={() => { setEditingItem(p); setFormData(p); planningModal.onOpen(); }} />
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

      {/* Modals */}
      {/* Modal Stock */}
      <Modal isOpen={stockModal.isOpen} onClose={stockModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg="gray.900" color="white">
          <ModalHeader>{editingItem ? 'Modifier la pièce' : 'Ajouter une pièce'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Nom</FormLabel>
                <Input value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} placeholder="Nom de la pièce" />
              </FormControl>
              <FormControl>
                <FormLabel>Référence</FormLabel>
                <Input value={formData.ref || ''} onChange={(e) => setFormData({...formData, ref: e.target.value})} placeholder="REF-001" />
              </FormControl>
              <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                <FormControl>
                  <FormLabel>Catégorie</FormLabel>
                  <Select value={formData.categorie || ''} onChange={(e) => setFormData({...formData, categorie: e.target.value})}>
                    <option value="">Sélectionner...</option>
                    <option value="Véhicule">Véhicule</option>
                    <option value="Accessoire">Accessoire</option>
                    <option value="Signalétique">Signalétique</option>
                    <option value="Textile">Textile</option>
                    <option value="Modèle réduit">Modèle réduit</option>
                  </Select>
                </FormControl>
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
              </Grid>
              <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                <FormControl>
                  <FormLabel>État</FormLabel>
                  <Select value={formData.etat || 'Bon'} onChange={(e) => setFormData({...formData, etat: e.target.value})}>
                    <option value="Excellent">Excellent</option>
                    <option value="Bon">Bon</option>
                    <option value="Moyen">Moyen</option>
                    <option value="Mauvais">Mauvais</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Emplacement</FormLabel>
                  <Input value={formData.emplacement || ''} onChange={(e) => setFormData({...formData, emplacement: e.target.value})} placeholder="Salle A1" />
                </FormControl>
              </Grid>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={stockModal.onClose}>Annuler</Button>
            <Button colorScheme="green" leftIcon={<FiSave />} onClick={saveStockItem}>Enregistrer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Facing */}
      <Modal isOpen={facingModal.isOpen} onClose={facingModal.onClose}>
        <ModalOverlay />
        <ModalContent bg="gray.900" color="white">
          <ModalHeader>{editingItem ? 'Modifier la zone' : 'Ajouter une zone'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Nom de la zone</FormLabel>
                <Input value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} />
              </FormControl>
              <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                <FormControl>
                  <FormLabel>Nombre de pièces</FormLabel>
                  <NumberInput value={formData.pieces || 0} onChange={(val) => setFormData({...formData, pieces: parseInt(val)})}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Rotation</FormLabel>
                  <Select value={formData.rotation || ''} onChange={(e) => setFormData({...formData, rotation: e.target.value})}>
                    <option value="Mensuelle">Mensuelle</option>
                    <option value="Trimestrielle">Trimestrielle</option>
                    <option value="Semestrielle">Semestrielle</option>
                    <option value="Annuelle">Annuelle</option>
                  </Select>
                </FormControl>
              </Grid>
              <FormControl>
                <FormLabel>Priorité</FormLabel>
                <Select value={formData.priorite || 'Moyenne'} onChange={(e) => setFormData({...formData, priorite: e.target.value})}>
                  <option value="Haute">Haute</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Basse">Basse</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={facingModal.onClose}>Annuler</Button>
            <Button colorScheme="green" leftIcon={<FiSave />} onClick={saveFacingZone}>Enregistrer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Floor */}
      <Modal isOpen={floorModal.isOpen} onClose={floorModal.onClose}>
        <ModalOverlay />
        <ModalContent bg="gray.900" color="white">
          <ModalHeader>{editingItem ? 'Modifier l\'espace' : 'Ajouter un espace'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Nom</FormLabel>
                <Input value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} />
              </FormControl>
              <Grid templateColumns="repeat(3, 1fr)" gap={4} w="full">
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
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={floorModal.onClose}>Annuler</Button>
            <Button colorScheme="green" leftIcon={<FiSave />} onClick={saveFloor}>Enregistrer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Staff */}
      <Modal isOpen={staffModal.isOpen} onClose={staffModal.onClose}>
        <ModalOverlay />
        <ModalContent bg="gray.900" color="white">
          <ModalHeader>{editingItem ? 'Modifier le personnel' : 'Ajouter un membre'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Nom complet</FormLabel>
                <Input value={formData.nom || ''} onChange={(e) => setFormData({...formData, nom: e.target.value})} />
              </FormControl>
              <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                <FormControl>
                  <FormLabel>Rôle</FormLabel>
                  <Select value={formData.role || ''} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                    <option value="Conservateur">Conservateur</option>
                    <option value="Guide">Guide</option>
                    <option value="Agent de sécurité">Agent de sécurité</option>
                    <option value="Médiatrice">Médiatrice</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Disponibilité</FormLabel>
                  <Select value={formData.disponibilite || 'Temps plein'} onChange={(e) => setFormData({...formData, disponibilite: e.target.value})}>
                    <option value="Temps plein">Temps plein</option>
                    <option value="Temps partiel">Temps partiel</option>
                  </Select>
                </FormControl>
              </Grid>
              <FormControl>
                <FormLabel>Téléphone</FormLabel>
                <Input value={formData.tel || ''} onChange={(e) => setFormData({...formData, tel: e.target.value})} placeholder="06 12 34 56 78" />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={staffModal.onClose}>Annuler</Button>
            <Button colorScheme="green" leftIcon={<FiSave />} onClick={saveStaff}>Enregistrer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Planning */}
      <Modal isOpen={planningModal.isOpen} onClose={planningModal.onClose}>
        <ModalOverlay />
        <ModalContent bg="gray.900" color="white">
          <ModalHeader>{editingItem ? 'Modifier l\'affectation' : 'Nouvelle affectation'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Personnel</FormLabel>
                <Select value={formData.personnel || ''} onChange={(e) => setFormData({...formData, personnel: e.target.value})}>
                  <option value="">Sélectionner...</option>
                  {staff.map(s => <option key={s.id} value={s.nom}>{s.nom}</option>)}
                </Select>
              </FormControl>
              <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                <FormControl>
                  <FormLabel>Zone</FormLabel>
                  <Input value={formData.zone || ''} onChange={(e) => setFormData({...formData, zone: e.target.value})} />
                </FormControl>
                <FormControl>
                  <FormLabel>Jour</FormLabel>
                  <Select value={formData.jour || 'Lundi'} onChange={(e) => setFormData({...formData, jour: e.target.value})}>
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
                <Input value={formData.tache || ''} onChange={(e) => setFormData({...formData, tache: e.target.value})} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={planningModal.onClose}>Annuler</Button>
            <Button colorScheme="green" leftIcon={<FiSave />} onClick={savePlanning}>Enregistrer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de connexion */}
      <MuseeLoginModal isOpen={isOpen} onClose={() => navigate('/dashboard/home')} onSuccess={handleLoginSuccess} />
    </Box>
  );
}
