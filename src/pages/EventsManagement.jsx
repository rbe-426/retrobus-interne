import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box, VStack, HStack, Heading, Text, Button, Card, CardBody, CardHeader,
  Table, Thead, Tbody, Tr, Th, Td, Badge, IconButton, Spinner, Center,
  SimpleGrid, Stat, StatLabel, StatNumber, Input, InputGroup, InputLeftElement,
  Select, FormControl, FormLabel, useToast, Progress, NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Divider, Icon, Flex,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure,
  Collapse, Tooltip
} from "@chakra-ui/react";
import {
  FiEdit, FiPlus, FiRefreshCw, FiSearch, FiMapPin,
  FiTruck, FiUsers, FiTrash2, FiSave, FiDollarSign, FiNavigation, FiGift, FiCalendar, FiClock, FiExternalLink,
  FiChevronDown, FiChevronUp, FiCheck, FiX
} from "react-icons/fi";
import { eventsAPI } from "../api/events";
import { membersAPI } from "../api/members";
import { formatDateFrLong } from "../utils/dateFormat.js";

const getStatusBadge = (status) => {
  const map = {
    DRAFT: { cs: "gray", label: "Brouillon" },
    PUBLISHED: { cs: "green", label: "Publié" },
    ARCHIVED: { cs: "orange", label: "Archivé" },
  };
  const cfg = map[status] ?? map.DRAFT;
  return <Badge colorScheme={cfg.cs}>{cfg.label}</Badge>;
};

const formatDate = (d) => {
  if (!d) return "Date non définie";
  return formatDateFrLong(d);
};

export default function EventsManagement() {
  const toast = useToast();
  const { isOpen: isManageOpen, onOpen: onManageOpen, onClose: onManageClose } = useDisclosure();
  const { isOpen: isInviteOpen, onOpen: onInviteOpen, onClose: onInviteClose } = useDisclosure();

  // État pour gestion événement
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [managingEvent, setManagingEvent] = useState(null);
  const [managingEventData, setManagingEventData] = useState({
    maxParticipants: 0,
    adultPrice: 0,
    childPrice: 0,
    registrationMethod: 'internal',
    helloAssoUrl: '',
    pdfUrl: ''
  });
  const [activeEventTab, setActiveEventTab] = useState("participants");

  // État pour invitations
  const [inviteEvent, setInviteEvent] = useState(null);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Participants, routes, finances
  const [participants, setParticipants] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [ha, setHa] = useState({ url: "", org: "", event: "" });
  const [relatedTransactions, setRelatedTransactions] = useState([]);

  // État pour expansion des détails participants
  const [expandedParticipantId, setExpandedParticipantId] = useState(null);
  const [selectedEventForParticipants, setSelectedEventForParticipants] = useState(null);

  // Planification
  const [planifications, setPlanifications] = useState([]);

  // RétroGPS
  const [gpsTracking, setGpsTracking] = useState([]);

  // === LOADERS AVEC CALLBACK ===
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await eventsAPI.getAll();
      console.log('📅 Événements chargés:', data);
      setEvents(Array.isArray(data) ? data : data?.events || []);
    } catch (e) {
      console.error('❌ Erreur chargement événements:', e);
      toast({ status: "error", title: "Erreur", description: "Impossible de charger les événements" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadInitialData = useCallback(async () => {
    try {
      // Ces fonctionnalités sont optionnelles, on ignore les erreurs
      try {
        const plans = await eventsAPI.getPlanifications();
        setPlanifications(Array.isArray(plans) ? plans : []);
      } catch (err) {
        // Planifications non disponibles, ignorer
        setPlanifications([]);
      }
      
      try {
        const gps = await eventsAPI.getGPSTracking();
        setGpsTracking(Array.isArray(gps) ? gps : []);
      } catch (err) {
        // GPS tracking non disponible, ignorer
        setGpsTracking([]);
      }
    } catch (err) {
      // Erreur générale ignorée
    }
  }, []);

  // === EFFECTS ===
  // Fetch events
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Charger planifications et GPS au démarrage
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Recalculer finances
  // === EFFECTS ===
  // Fetch events
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Charger planifications et GPS au démarrage
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Filtrer les événements
  const filteredEvents = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    return (events || []).filter((e) => {
      // Si pas de recherche, tout passe
      if (!t) {
        return filterStatus === "ALL" || e.status === filterStatus;
      }
      // Si recherche, chercher dans title ou location
      const mSearch = e.title?.toLowerCase().includes(t) || e.location?.toLowerCase().includes(t);
      const mStatus = filterStatus === "ALL" || e.status === filterStatus;
      return mSearch && mStatus;
    });
  }, [events, searchTerm, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const total = events.length;
    const published = events.filter(e => e.status === "PUBLISHED").length;
    const upcoming = events.filter(e => e.status === "PUBLISHED" && new Date(e.date) > new Date()).length;
    return { total, published, upcoming, totalParticipants: 0, totalRevenue: 0 };
  }, [events]);

  // Ouvrir événement - charger données via API
  const openEvent = async (e) => {
    setSelectedEvent(e);
    try {
      // Charger participants
      const partsData = await eventsAPI.getParticipants(e.id);
      setParticipants(Array.isArray(partsData) ? partsData : []);
    } catch (err) {
      console.warn('Erreur chargement participants:', err);
      setParticipants([]);
    }
    
    try {
      // Charger routes
      const routesData = await eventsAPI.getRoutes(e.id);
      setRoutes(Array.isArray(routesData) ? routesData : []);
    } catch (err) {
      console.warn('Erreur chargement routes:', err);
      setRoutes([]);
    }

    try {
      // Charger transactions liées
      const transData = await eventsAPI.getTransactions(e.id);
      setRelatedTransactions(Array.isArray(transData) ? transData : []);
    } catch (err) {
      console.warn('Erreur chargement transactions:', err);
      setRelatedTransactions([]);
    }
    
    setHa({ url: e.helloAssoUrl || "", org: e.helloAssoOrg || "", event: e.helloAssoEvent || "" });
  };

  const closeEvent = () => {
    setSelectedEvent(null);
    setParticipants([]);
    setRoutes([]);
  };

  // Ouvrir modal de gestion des paramètres de l'événement
  const openManageEvent = (e) => {
    let extras = {};
    try {
      extras = e.extras ? JSON.parse(e.extras) : {};
    } catch (err) {
      console.warn('Erreur parsing extras:', err);
    }

    setManagingEvent(e);
    setManagingEventData({
      maxParticipants: e.maxParticipants || extras.maxParticipants || 0,
      adultPrice: e.adultPrice || 0,
      childPrice: e.childPrice || 0,
      registrationMethod: extras.registrationMethod || 'internal',
      helloAssoUrl: extras.helloAssoUrl || '',
      pdfUrl: extras.pdfUrl || ''
    });
    onManageOpen();
  };

  const saveManageEvent = async () => {
    if (!managingEvent?.id) return;
    try {
      let extras = {};
      try {
        extras = managingEvent.extras ? JSON.parse(managingEvent.extras) : {};
      } catch (e) {
        console.warn('Erreur parsing extras:', e);
      }

      const updatedExtras = {
        ...extras,
        maxParticipants: managingEventData.maxParticipants,
        registrationMethod: managingEventData.registrationMethod,
        helloAssoUrl: managingEventData.helloAssoUrl || null,
        pdfUrl: managingEventData.pdfUrl || null,
        // ⚠️ PRÉSERVER LES CHAMPS CRITIQUES QUI NE DOIVENT PAS ÊTRE PERDUS
        isVisible: extras.isVisible !== undefined ? extras.isVisible : true,
        requiresRegistration: extras.requiresRegistration !== undefined ? extras.requiresRegistration : false,
        allowPublicRegistration: extras.allowPublicRegistration !== undefined ? extras.allowPublicRegistration : false,
        isFree: extras.isFree !== undefined ? extras.isFree : true,
        registrationDeadline: extras.registrationDeadline || null,
        eventType: extras.eventType || 'public_free_access'
      };

      const updateData = {
        maxParticipants: managingEventData.maxParticipants,
        adultPrice: managingEventData.adultPrice,
        childPrice: managingEventData.childPrice,
        extras: updatedExtras  // Passer l'objet directement, eventsAPI.update() le stringifiera
      };

      // Utiliser eventsAPI au lieu de fetch directement
      await eventsAPI.update(managingEvent.id, updateData);

      toast({ status: "success", title: "Paramètres enregistrés" });
      onManageClose();
      
      // Rafraîchir la liste des événements
      const updated = await eventsAPI.getAll();
      setEvents(Array.isArray(updated) ? updated : updated?.events || []);
    } catch (e) {
      console.error('Erreur saveManageEvent:', e);
      toast({ status: "error", title: "Erreur", description: e.message });
    }
  };

  // === GESTION DES INVITATIONS ===
  const openInviteModal = async (event) => {
    setInviteEvent(event);
    setSelectedMemberIds([]);
    setLoadingMembers(true);
    try {
      // Charger la liste des membres via l'API
      const data = await membersAPI.getAll();
      const membersList = Array.isArray(data) ? data : data?.members || [];
      setAvailableMembers(membersList);
    } catch (err) {
      console.error('Erreur chargement membres:', err);
      toast({ status: "error", title: "Erreur", description: "Impossible de charger les membres" });
    } finally {
      setLoadingMembers(false);
    }
    onInviteOpen();
  };

  const sendInvitations = async () => {
    if (!inviteEvent?.id || selectedMemberIds.length === 0) {
      toast({ status: "warning", title: "Sélectionnez au moins une personne" });
      return;
    }

    try {
      setLoadingMembers(true);
      const response = await fetch(`/api/events/${inviteEvent.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ userIds: selectedMemberIds })
      });

      if (!response.ok) throw new Error(`Erreur ${response.status}`);
      const result = await response.json();

      toast({ 
        status: "success", 
        title: "Invitations envoyées",
        description: result.message 
      });
      onInviteClose();
      setSelectedMemberIds([]);
    } catch (err) {
      console.error('Erreur envoi invitations:', err);
      toast({ status: "error", title: "Erreur", description: err.message });
    } finally {
      setLoadingMembers(false);
    }
  };

  // Participants
  const addParticipant = async (p) => {
    if (!p?.name || !p?.email) {
      toast({ status: "warning", title: "Nom et email requis" });
      return;
    }
    const eventId = selectedEventForParticipants?.id || selectedEvent?.id;
    if (!eventId) {
      toast({ status: "warning", title: "Aucun événement sélectionné" });
      return;
    }
    try {
      await eventsAPI.addParticipant(eventId, p);
      const updated = await eventsAPI.getParticipants(eventId);
      setParticipants(Array.isArray(updated) ? updated : []);
      toast({ status: "success", title: "Participant ajouté" });
    } catch (err) {
      toast({ status: "error", title: "Erreur", description: err.message });
    }
  };

  const updateParticipant = async (id, updates) => {
    const eventId = selectedEventForParticipants?.id || selectedEvent?.id;
    if (!eventId) return;
    try {
      await eventsAPI.updateParticipant(eventId, id, updates);
      const updated = await eventsAPI.getParticipants(eventId);
      setParticipants(Array.isArray(updated) ? updated : []);
      toast({ status: "success", title: "Participant mis à jour" });
    } catch (err) {
      toast({ status: "error", title: "Erreur", description: err.message });
    }
  };

  const deleteParticipant = async (id) => {
    const eventId = selectedEventForParticipants?.id || selectedEvent?.id;
    if (!eventId) return;
    try {
      await eventsAPI.deleteParticipant(eventId, id);
      const updated = await eventsAPI.getParticipants(eventId);
      setParticipants(Array.isArray(updated) ? updated : []);
      toast({ status: "success", title: "Participant supprimé" });
    } catch (err) {
      toast({ status: "error", title: "Erreur", description: err.message });
    }
  };

  // Routes
  const addRoute = async () => {
    if (!selectedEvent?.id) {
      toast({ status: "warning", title: "Aucun événement sélectionné" });
      return;
    }
    try {
      await eventsAPI.addRoute(selectedEvent.id, { name: "Nouveau trajet", vehicle: "", capacity: 0, stops: [] });
      const updated = await eventsAPI.getRoutes(selectedEvent.id);
      setRoutes(Array.isArray(updated) ? updated : []);
      toast({ status: "success", title: "Trajet ajouté" });
    } catch (err) {
      toast({ status: "error", title: "Erreur", description: err.message });
    }
  };

  const updateRouteCapacity = async (id, v) => {
    if (!selectedEvent?.id) return;
    const cap = parseInt(v || 0, 10);
    try {
      await eventsAPI.updateRoute(selectedEvent.id, id, { capacity: cap });
      const updated = await eventsAPI.getRoutes(selectedEvent.id);
      setRoutes(Array.isArray(updated) ? updated : []);
    } catch (err) {
      toast({ status: "error", title: "Erreur", description: err.message });
    }
  };

  // Finances
  const recalc = useMemo(() => {
    if (!selectedEvent) return null;
    const adultPrice = parseFloat(selectedEvent.adultPrice || 0);
    const childPrice = parseFloat(selectedEvent.childPrice || 0);
    const confirmed = participants.filter(p => p.status === "confirmed");
    const adultCount = confirmed.filter(p => p.type === "adult").length;
    const childCount = confirmed.filter(p => p.type === "child").length;
    const revenue = Math.round(adultCount * adultPrice + childCount * childPrice);
    const capacity = routes.reduce((s, r) => s + (r.capacity || 0), 0);
    const occupancy = confirmed.length;
    const rate = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;
    const expenses = Math.round(revenue * 0.25 + capacity * 2 + occupancy * 3);
    const profit = revenue - expenses;

    return {
      revenue, expenses, profit, capacity, occupancy, rate,
      breakdown: {
        adult: { price: adultPrice, count: adultCount, total: adultPrice * adultCount },
        child: { price: childPrice, count: childCount, total: childPrice * childCount },
        expenseLines: [
          { label: "Base (25%)", amount: Math.round(revenue * 0.25) },
          { label: `Capacité (${capacity})`, amount: Math.round(capacity * 2) },
          { label: `Participants (${occupancy})`, amount: Math.round(occupancy * 3) },
        ],
      },
    };
  }, [selectedEvent, participants, routes]);

  // Finances par défaut
  const defaultFin = { revenue: 0, expenses: 0, profit: 0, capacity: 0, occupancy: 0, rate: 0, breakdown: null };
  const fin = recalc || defaultFin;

  // === RENDUS DE SECTIONS ===
  const renderListTab = () => (
      <>
        <HStack spacing={4} mb={4}>
          <InputGroup maxW="320px">
            <InputLeftElement pointerEvents="none"><FiSearch /></InputLeftElement>
            <Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </InputGroup>
          <Select maxW="220px" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">Tous</option>
            <option value="PUBLISHED">Publiés</option>
            <option value="DRAFT">Brouillons</option>
          </Select>
        </HStack>

        <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} mb={6}>
          <Card _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }} transition="all 0.2s">
            <CardBody>
              <Stat>
                <StatLabel color="gray.600">Total</StatLabel>
                <StatNumber color="rbe.600">{stats.total}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }} transition="all 0.2s">
            <CardBody>
              <Stat>
                <StatLabel color="gray.600">Publiés</StatLabel>
                <StatNumber color="green.500">{stats.published}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }} transition="all 0.2s">
            <CardBody>
              <Stat>
                <StatLabel color="gray.600">À venir</StatLabel>
                <StatNumber color="orange.500">{stats.upcoming}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }} transition="all 0.2s">
            <CardBody>
              <Stat>
                <StatLabel color="gray.600">Participants</StatLabel>
                <StatNumber color="rbe.600">{stats.totalParticipants}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }} transition="all 0.2s">
            <CardBody>
              <Stat>
                <StatLabel color="gray.600">Revenus</StatLabel>
                <StatNumber color="green.500">{stats.totalRevenue}€</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {loading ? (
          <Center py={20}><Spinner size="xl" /></Center>
        ) : filteredEvents.length === 0 ? (
          <Center py={16}>
            <VStack spacing={4}>
              <Text color="gray.500">Aucun événement</Text>
              <Button as={RouterLink} to="/dashboard/evenements" leftIcon={<FiPlus />} colorScheme="blue">Créer</Button>
            </VStack>
          </Center>
        ) : (
          <Table variant="striped" colorScheme="gray" size="sm">
            <Thead><Tr><Th>Événement</Th><Th>Date</Th><Th>Statut</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {filteredEvents.map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="semibold">{e.title}</Text>
                      {e.location && <HStack fontSize="sm" color="gray.600"><FiMapPin /><Text>{e.location}</Text></HStack>}
                    </VStack>
                  </Td>
                  <Td>{formatDate(e.date)}</Td>
                  <Td>{getStatusBadge(e.status)}</Td>
                  <Td>
                    <HStack spacing={1}>
                      <Button size="sm" variant="ghost" onClick={() => openManageEvent(e)}>Gérer</Button>
                      <Button size="sm" variant="ghost" colorScheme="blue" onClick={() => openInviteModal(e)}>Inviter</Button>
                      <IconButton as={RouterLink} to="/dashboard/evenements" aria-label="Modifier" icon={<FiEdit />} size="sm" variant="ghost" />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </>
    );

  const renderParticipantsTab = () => {
    // Si aucun événement sélectionné, afficher les cartes d'événements
    if (!selectedEventForParticipants) {
      // Créer une liste d'événements filtrée spécifiquement pour cet onglet
      // On affiche tous les événements (pas de filtre par statut), juste par recherche
      const t = searchTerm.trim().toLowerCase();
      const eventsForParticipantsTab = (events || []).filter((e) => {
        if (!t) return true; // Pas de recherche = tous les événements
        return e.title?.toLowerCase().includes(t) || e.location?.toLowerCase().includes(t);
      });

      return (
        <VStack align="stretch" spacing={4}>
          <Box>
            <Heading size="md" mb={2}>Sélectionnez un événement</Heading>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Choisissez un événement pour consulter ses participants
            </Text>
          </Box>

          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="gray.400" />
            </InputLeftElement>
            <Input 
              placeholder="Rechercher un événement..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {eventsForParticipantsTab.map((event) => {
              const extras = event.extras ? JSON.parse(event.extras) : {};
              const registrationType = extras.registrationType || 'standard';
              const currentParts = event.currentParticipants || 0;
              const maxParts = event.maxParticipants || extras.maxParticipants || null;
              
              return (
                <Card 
                  key={event.id}
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ 
                    transform: "translateY(-4px)", 
                    boxShadow: "xl",
                    borderColor: "rbe.500" 
                  }}
                  borderWidth="1px"
                  borderColor="gray.200"
                  bg="white"
                  onClick={async () => {
                    setSelectedEventForParticipants(event);
                    setSelectedEvent(event);
                    // Charger les participants
                    try {
                      const partsData = await eventsAPI.getParticipants(event.id);
                      setParticipants(Array.isArray(partsData) ? partsData : []);
                    } catch (err) {
                      console.warn('Erreur chargement participants:', err);
                      setParticipants([]);
                    }
                  }}
                >
                  <CardHeader pb={2}>
                    <HStack justify="space-between" align="start">
                      <Box flex={1}>
                        <Heading size="sm" mb={1} noOfLines={2}>{event.title}</Heading>
                        <HStack spacing={2} fontSize="xs" color="gray.600">
                          <Icon as={FiCalendar} />
                          <Text>{formatDate(event.date)}</Text>
                        </HStack>
                      </Box>
                      {getStatusBadge(event.status)}
                    </HStack>
                  </CardHeader>
                  <CardBody pt={2}>
                    <VStack align="stretch" spacing={2}>
                      {event.location && (
                        <HStack fontSize="sm" color="gray.600">
                          <Icon as={FiMapPin} />
                          <Text noOfLines={1}>{event.location}</Text>
                        </HStack>
                      )}
                      <Divider />
                      <HStack justify="space-between">
                        <VStack align="start" spacing={0}>
                          <Text fontSize="xs" color="gray.500">Participants</Text>
                          <Text fontWeight="700" color="rbe.600">
                            {currentParts}{maxParts ? ` / ${maxParts}` : ''}
                          </Text>
                        </VStack>
                        {registrationType === 'parade_vehicles' && (
                          <Badge colorScheme="rbe" fontSize="xs" variant="subtle">
                            <Icon as={FiTruck} mr={1} />
                            Défilé véhicules
                          </Badge>
                        )}
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              );
            })}
          </SimpleGrid>

          {eventsForParticipantsTab.length === 0 && (
            <Center py={12}>
              <VStack spacing={2}>
                <Icon as={FiCalendar} boxSize={12} color="gray.400" />
                <Text color="gray.500">Aucun événement trouvé</Text>
              </VStack>
            </Center>
          )}
        </VStack>
      );
    }

    // Événement sélectionné : afficher les participants
    const maxParticipants = selectedEventForParticipants?.maxParticipants;
    // Utiliser participants.length au lieu de currentParticipants pour refléter les vrais participants chargés
    const currentParticipants = participants.length;
    const eventCurrentParticipants = selectedEventForParticipants?.currentParticipants || 0;
    const spotsAvailable = maxParticipants ? Math.max(0, maxParticipants - currentParticipants) : null;
    const isFull = maxParticipants && spotsAvailable === 0;

    return (
      <VStack align="stretch" spacing={4}>
        {/* Retour à la sélection */}
        <HStack justify="space-between" p={4} bg="gray.50" borderRadius="lg" borderWidth="1px" borderColor="gray.200">
          <HStack spacing={3}>
            <IconButton
              icon={<FiChevronDown />}
              size="sm"
              onClick={() => {
                setSelectedEventForParticipants(null);
                setExpandedParticipantId(null);
              }}
              aria-label="Retour"
            />
            <Box>
              <Heading size="sm">{selectedEventForParticipants.title}</Heading>
              <Text fontSize="xs" color="gray.600">
                {formatDate(selectedEventForParticipants.date)} • {selectedEventForParticipants.location}
              </Text>
            </Box>
          </HStack>
          <Button 
            size="sm" 
            leftIcon={<FiRefreshCw />} 
            onClick={async () => {
              try {
                const partsData = await eventsAPI.getParticipants(selectedEventForParticipants.id);
                setParticipants(Array.isArray(partsData) ? partsData : []);
                toast({ status: "success", title: "Participants actualisés" });
              } catch (err) {
                toast({ status: "error", title: "Erreur", description: "Impossible de charger les participants" });
              }
            }}
          >
            Actualiser
          </Button>
        </HStack>

        {/* Affichage des places disponibles */}
        {maxParticipants && (
          <Card borderLeft="4px solid" borderLeftColor={isFull ? "red.400" : "blue.400"}>
            <CardBody>
              <HStack spacing={8} justify="space-between">
                <Stat>
                  <StatLabel>Places configurées</StatLabel>
                  <StatNumber color="blue.600">{maxParticipants}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Inscriptions actuelles</StatLabel>
                  <StatNumber color="orange.600">{currentParticipants}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Places disponibles</StatLabel>
                  <StatNumber color={isFull ? "red.600" : "green.600"}>
                    {isFull ? "COMPLET" : spotsAvailable}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Taux de remplissage</StatLabel>
                  <StatNumber color="purple.600">
                    {Math.round((currentParticipants / maxParticipants) * 100)}%
                  </StatNumber>
                </Stat>
              </HStack>
            </CardBody>
          </Card>
        )}

        <HStack justify="space-between">
          <Text fontWeight="bold">Participants ({participants.length})</Text>
          <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm" 
            onClick={() => addParticipant({ name: "Nouveau", email: `user${Date.now()}@mail.com`, type: "adult", status: "pending" })}>
            Ajouter
          </Button>
        </HStack>

        {participants.length === 0 ? (
          <Center py={8}><Text color="gray.500">Aucun participant</Text></Center>
        ) : (
          <Card>
            <CardBody p={0}>
              <Table size="sm" variant="striped" colorScheme="gray">
                <Thead bg="gray.50">
                  <Tr>
                    <Th w="40px"></Th>
                    <Th>Nom</Th>
                    <Th>Email</Th>
                    <Th>Type</Th>
                    <Th>Statut</Th>
                    <Th>Date inscription</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {participants.map((p) => {
                    const isExpanded = expandedParticipantId === p.id;
                    return (
                      <React.Fragment key={p.id}>
                        <Tr 
                          _hover={{ bg: "gray.50" }}
                          bg={isExpanded ? "blue.50" : "transparent"}
                        >
                          <Td>
                            <Tooltip label={isExpanded ? "Masquer détails" : "Voir détails"}>
                              <IconButton
                                size="xs"
                                icon={isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                variant="ghost"
                                colorScheme="blue"
                                onClick={() => setExpandedParticipantId(isExpanded ? null : p.id)}
                                aria-label="Détails"
                              />
                            </Tooltip>
                          </Td>
                          <Td fontWeight="bold">{p.participantName || p.name || '—'}</Td>
                          <Td>{p.participantEmail || p.email || '—'}</Td>
                          <Td>
                            <Badge colorScheme={p.type === 'adult' ? 'rbe' : 'green'} variant="subtle">
                              {p.adultTickets || 0} adulte{(p.adultTickets || 0) > 1 ? 's' : ''} • {p.childTickets || 0} enfant{(p.childTickets || 0) > 1 ? 's' : ''}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge 
                              colorScheme={
                                p.registrationStatus === 'validated' || p.registrationStatus === 'confirmed' || p.status === 'confirmed' ? 'green' : 
                                p.registrationStatus === 'cancelled' || p.status === 'cancelled' ? 'red' : 
                                'orange'
                              }
                              variant="subtle"
                            >
                              {p.registrationStatus || p.status || 'pending'}
                            </Badge>
                          </Td>
                          <Td fontSize="xs" color="gray.600">
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}
                          </Td>
                          <Td isNumeric>
                            <IconButton 
                              aria-label="Supprimer" 
                              icon={<FiTrash2 />} 
                              size="sm" 
                              variant="ghost" 
                              colorScheme="red" 
                              onClick={() => deleteParticipant(p.id)} 
                            />
                          </Td>
                        </Tr>
                        {/* Ligne de détails expandable */}
                        <Tr>
                          <Td colSpan={7} p={0}>
                            <Collapse in={isExpanded} animateOpacity>
                              <Box bg="gray.50" p={6} borderTop="1px" borderColor="gray.200">
                                {(() => {
                                  // Parser les notes pour récupérer les données complètes
                                  let notesData = null;
                                  try {
                                    notesData = p.notes ? JSON.parse(p.notes) : null;
                                  } catch (e) {
                                    console.warn('Erreur parsing notes:', e);
                                  }
                                  
                                  // Récupérer les véhicules depuis le JSON notes ou depuis les champs directs (anciennes inscriptions)
                                  let vehicles = notesData?.vehicles || [];
                                  
                                  // Si pas de véhicules dans notes mais qu'il y a des données dans les champs directs
                                  if (vehicles.length === 0 && (p.vehicleModel || p.vehicleName)) {
                                    vehicles = [{
                                      licensePlate: null, // Les anciennes inscriptions n'ont pas de plaque stockée
                                      vehicleName: p.vehicleName,
                                      vehicleModel: p.vehicleModel,
                                      vehicleYear: p.vehicleYear
                                    }];
                                  }
                                  
                                  const licensePlates = vehicles.map(v => v.licensePlate).filter(Boolean);
                                  const hasVehicleData = vehicles.length > 0 && vehicles.some(v => v.vehicleModel || v.vehicleName);
                                  const customAnswers = notesData?.customAnswers || {};
                                  const staticGathering = customAnswers.staticGathering || {};
                                  
                                  // Séparer nom et prénom
                                  const fullName = p.participantName || p.name || '—';
                                  const nameParts = fullName.split(' ');
                                  const firstName = nameParts[0] || '—';
                                  const lastName = nameParts.slice(1).join(' ') || '—';

                                  return (
                                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                                      {/* Informations Générales */}
                                      <Card bg="white" borderRadius="lg" boxShadow="sm">
                                        <CardBody>
                                        <Heading size="sm" mb={4} color="rbe.600">Informations Générales</Heading>
                                        <VStack align="stretch" spacing={3}>
                                          <Box>
                                            <Text fontSize="xs" color="gray.500" mb={1}>Nom</Text>
                                            <Text fontSize="md" fontWeight="600">{lastName}</Text>
                                          </Box>
                                          <Box>
                                            <Text fontSize="xs" color="gray.500" mb={1}>Prénom</Text>
                                            <Text fontSize="md" fontWeight="600">{firstName}</Text>
                                          </Box>
                                          <Box>
                                            <Text fontSize="xs" color="gray.500" mb={1}>Numéro de réservation</Text>
                                            <Text fontSize="md" fontWeight="700" fontFamily="mono" color="rbe.600">
                                              {p.validationCode || '—'}
                                            </Text>
                                          </Box>
                                          <Box>
                                            <Text fontSize="xs" color="gray.500" mb={1}>Date</Text>
                                            <Text fontSize="md" fontWeight="600">
                                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}
                                            </Text>
                                          </Box>
                                          <Box>
                                            <Text fontSize="xs" color="gray.500" mb={1}>Email</Text>
                                            <Text fontSize="md" fontWeight="600">{p.participantEmail || p.email || '—'}</Text>
                                          </Box>
                                          {(p.participantPhone || p.phone) && (
                                            <Box>
                                              <Text fontSize="xs" color="gray.500" mb={1}>Téléphone</Text>
                                              <Text fontSize="md" fontWeight="600">{p.participantPhone || p.phone}</Text>
                                            </Box>
                                          )}
                                          {p.isClubMember && p.clubName && (
                                            <Box>
                                              <Text fontSize="xs" color="gray.500" mb={1}>Club / Association</Text>
                                              <Text fontSize="md" fontWeight="600">{p.clubName}</Text>
                                            </Box>
                                          )}
                                          <Box>
                                            <Text fontSize="xs" color="gray.500" mb={1}>Plaque(s) recensée(s)</Text>
                                            {licensePlates.length > 0 ? (
                                              <VStack align="stretch" spacing={1}>
                                                {licensePlates.map((plate, idx) => (
                                                  <Text 
                                                    key={idx} 
                                                    fontSize="md" 
                                                    fontWeight="700" 
                                                    fontFamily="mono" 
                                                    color="rbe.600"
                                                  >
                                                    {plate}
                                                  </Text>
                                                ))}
                                              </VStack>
                                            ) : hasVehicleData ? (
                                              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                                                Non renseignée (inscription ancienne)
                                              </Text>
                                            ) : (
                                              <Text fontSize="md" color="gray.400">Aucune</Text>
                                            )}
                                          </Box>
                                          
                                          {/* Afficher les infos du véhicule si disponibles */}
                                          {hasVehicleData && vehicles.length > 0 && (
                                            <Box>
                                              <Text fontSize="xs" color="gray.500" mb={1}>Véhicule(s) inscrit(s)</Text>
                                              <VStack align="stretch" spacing={2}>
                                                {vehicles.map((vehicle, idx) => (
                                                  <Box key={idx} bg="gray.50" p={2} borderRadius="md" borderLeft="3px solid" borderLeftColor="rbe.500">
                                                    {vehicle.vehicleName && (
                                                      <Text fontSize="sm" fontWeight="600">{vehicle.vehicleName}</Text>
                                                    )}
                                                    {vehicle.vehicleModel && (
                                                      <Text fontSize="xs" color="gray.600">Modèle: {vehicle.vehicleModel}</Text>
                                                    )}
                                                    {vehicle.vehicleYear && (
                                                      <Text fontSize="xs" color="gray.600">Année: {vehicle.vehicleYear}</Text>
                                                    )}
                                                  </Box>
                                                ))}
                                              </VStack>
                                            </Box>
                                          )}
                                        </VStack>
                                        </CardBody>
                                      </Card>

                                      {/* Options saisies */}
                                      <Card bg="white" borderRadius="lg" boxShadow="sm">
                                        <CardBody>
                                        <Heading size="sm" mb={4} color="green.500">Options saisies</Heading>
                                        <VStack align="stretch" spacing={3}>
                                          {staticGathering.wantsGroupedPlacement !== undefined && (
                                            <Box>
                                              <Text fontSize="xs" color="gray.500" mb={1}>Placement groupé</Text>
                                              <Badge colorScheme={staticGathering.wantsGroupedPlacement ? 'green' : 'gray'}>
                                                {staticGathering.wantsGroupedPlacement ? 'Oui' : 'Non'}
                                              </Badge>
                                            </Box>
                                          )}
                                          {staticGathering.placementGroupName && (
                                            <Box>
                                              <Text fontSize="xs" color="gray.500" mb={1}>Nom du groupe</Text>
                                              <Text fontSize="sm" fontWeight="600">{staticGathering.placementGroupName}</Text>
                                            </Box>
                                          )}
                                          {staticGathering.spaceRequirement && (
                                            <Box>
                                              <Text fontSize="xs" color="gray.500" mb={1}>Espace requis</Text>
                                              <Text fontSize="sm">{staticGathering.spaceRequirement}</Text>
                                            </Box>
                                          )}
                                          {staticGathering.arrivalWindow && (
                                            <Box>
                                              <Text fontSize="xs" color="gray.500" mb={1}>Créneau d'arrivée</Text>
                                              <Text fontSize="sm">{staticGathering.arrivalWindow}</Text>
                                            </Box>
                                          )}
                                          {staticGathering.wantsPublicDisplay !== undefined && (
                                            <Box>
                                              <Text fontSize="xs" color="gray.500" mb={1}>Exposition publique</Text>
                                              <Badge colorScheme={staticGathering.wantsPublicDisplay ? 'blue' : 'gray'}>
                                                {staticGathering.wantsPublicDisplay ? 'Oui' : 'Non'}
                                              </Badge>
                                            </Box>
                                          )}
                                          {staticGathering.vehicleStory && (
                                            <Box>
                                              <Text fontSize="xs" color="gray.500" mb={1}>Histoire du véhicule</Text>
                                              <Text fontSize="sm" noOfLines={3}>{staticGathering.vehicleStory}</Text>
                                            </Box>
                                          )}
                                          {staticGathering.photoPermission !== undefined && (
                                            <Box>
                                              <Text fontSize="xs" color="gray.500" mb={1}>Autorisation photos</Text>
                                              <Badge colorScheme={staticGathering.photoPermission ? 'green' : 'red'}>
                                                {staticGathering.photoPermission ? 'Autorisées' : 'Refusées'}
                                              </Badge>
                                            </Box>
                                          )}
                                          {staticGathering.organizerMessage && (
                                            <Box>
                                              <Text fontSize="xs" color="gray.500" mb={1}>Message aux organisateurs</Text>
                                              <Text fontSize="sm" noOfLines={3}>{staticGathering.organizerMessage}</Text>
                                            </Box>
                                          )}
                                          {Object.keys(staticGathering).length === 0 && (
                                            <Text fontSize="sm" color="gray.400" fontStyle="italic">Aucune option saisie</Text>
                                          )}
                                        </VStack>
                                        </CardBody>
                                      </Card>

                                      {/* Actions */}
                                      <Card bg="white" borderRadius="lg" boxShadow="sm">
                                        <CardBody>
                                        <Heading size="sm" mb={4} color="rbe.600">Actions</Heading>
                                        <VStack align="stretch" spacing={2}>
                                          <Button 
                                            colorScheme="green" 
                                            size="sm"
                                            leftIcon={<FiCheck />}
                                            onClick={() => updateParticipant(p.id, { registrationStatus: 'validated' })}
                                            isDisabled={p.registrationStatus === 'validated' || p.status === 'validated'}
                                          >
                                            Valider
                                          </Button>
                                          <Button 
                                            colorScheme="red" 
                                            size="sm"
                                            leftIcon={<FiX />}
                                            onClick={() => updateParticipant(p.id, { registrationStatus: 'cancelled' })}
                                            isDisabled={p.registrationStatus === 'cancelled' || p.status === 'cancelled'}
                                          >
                                            Annuler
                                          </Button>
                                        </VStack>
                                        </CardBody>
                                      </Card>
                                    </SimpleGrid>
                                  );
                                })()}
                              </Box>
                            </Collapse>
                          </Td>
                        </Tr>
                      </React.Fragment>
                    );
                  })}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        )}
      </VStack>
    );
  };

  const renderRoutesTab = () => (
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between">
          <Text fontWeight="bold">Trajets ({routes.length})</Text>
          <Button leftIcon={<FiPlus />} size="sm" colorScheme="blue" onClick={addRoute}>Ajouter</Button>
        </HStack>
        <Card bg="blue.50" borderLeft="4px solid" borderLeftColor="blue.400">
          <CardBody>
            <HStack spacing={8}>
              <Stat><StatLabel>Capacité</StatLabel><StatNumber color="blue.600">{fin.capacity} places</StatNumber></Stat>
              <Stat><StatLabel>Confirmés</StatLabel><StatNumber color="green.600">{fin.occupancy}</StatNumber></Stat>
              <Stat><StatLabel>Taux</StatLabel><StatNumber color="purple.600">{fin.rate}%</StatNumber></Stat>
            </HStack>
          </CardBody>
        </Card>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
          {routes.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="sm">{r.name}</Heading>
                  {r.vehicle && <Badge colorScheme="blue">{r.vehicle}</Badge>}
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  <HStack>
                    <Text fontSize="sm">Capacité:</Text>
                    <NumberInput size="sm" min={0} max={200} value={r.capacity || 0}
                      onChange={(val) => updateRouteCapacity(r.id, val)} w="90px">
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <Text fontSize="sm" color="gray.600">places</Text>
                  </HStack>
                  <HStack spacing={3}>
                    <Text fontSize="sm" fontWeight="bold">{fin.occupancy} / {r.capacity || 0}</Text>
                    <Progress value={(r.capacity || 0) > 0 ? Math.round((fin.occupancy / r.capacity) * 100) : 0} 
                      size="sm" colorScheme={fin.occupancy / (r.capacity || 1) > 0.9 ? "red" : fin.occupancy / (r.capacity || 1) > 0.75 ? "orange" : "green"} flex={1} />
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </VStack>
    );

  const renderFinancesTab = () => (
      <VStack align="stretch" spacing={6}>
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
          <Card><CardBody><Stat><StatLabel>Revenus</StatLabel><StatNumber color="green.500">{fin.revenue}€</StatNumber></Stat></CardBody></Card>
          <Card><CardBody><Stat><StatLabel>Dépenses</StatLabel><StatNumber color="red.500">{fin.expenses}€</StatNumber></Stat></CardBody></Card>
          <Card><CardBody><Stat><StatLabel>Bénéfice</StatLabel><StatNumber color={fin.profit >= 0 ? "green.500" : "red.500"}>{fin.profit}€</StatNumber></Stat></CardBody></Card>
          <Card><CardBody><Stat><StatLabel>Taux</StatLabel><StatNumber color="blue.500">{fin.rate}%</StatNumber></Stat></CardBody></Card>
        </SimpleGrid>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Card>
            <CardHeader><Heading size="sm">Revenus</Heading></CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between"><Text>Adulte ({fin.breakdown?.adult.count})</Text><Text fontWeight="bold">{Math.round(fin.breakdown?.adult.total || 0)}€</Text></HStack>
                <HStack justify="space-between"><Text>Enfant ({fin.breakdown?.child.count})</Text><Text fontWeight="bold">{Math.round(fin.breakdown?.child.total || 0)}€</Text></HStack>
                <Divider />
                <HStack justify="space-between"><Text fontWeight="bold">Total</Text><Text fontWeight="bold" color="green.500">{fin.revenue}€</Text></HStack>
              </VStack>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><Heading size="sm">Dépenses</Heading></CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={3}>
                {fin.breakdown?.expenseLines?.map((l, i) => (
                  <HStack key={i} justify="space-between"><Text fontSize="sm">{l.label}</Text><Text fontWeight="bold">{l.amount}€</Text></HStack>
                ))}
                <Divider />
                <HStack justify="space-between"><Text fontWeight="bold">Total</Text><Text fontWeight="bold" color="red.500">{fin.expenses}€</Text></HStack>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Transactions liées */}
        <Card>
          <CardHeader>
            <Heading size="sm">Transactions liées ({relatedTransactions.length})</Heading>
          </CardHeader>
          <CardBody>
            {relatedTransactions.length === 0 ? (
              <Text color="gray.500" fontSize="sm">Aucune transaction liée à cet événement</Text>
            ) : (
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr bg="gray.50">
                    <Th>Date</Th>
                    <Th>Description</Th>
                    <Th>Type</Th>
                    <Th isNumeric>Montant</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {relatedTransactions.map((t) => (
                    <Tr key={t.id}>
                      <Td fontSize="sm">{formatDate(t.date)}</Td>
                      <Td fontSize="sm">{t.description}</Td>
                      <Td><Badge colorScheme={t.type === 'CREDIT' ? 'green' : 'red'} fontSize="xs">{t.type === 'CREDIT' ? 'Recette' : 'Dépense'}</Badge></Td>
                      <Td isNumeric fontWeight="bold" color={t.type === 'CREDIT' ? 'green.600' : 'red.600'}>{t.type === 'CREDIT' ? '+' : '-'}{Math.abs(t.amount)}€</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
            <Button as="a" href="/dashboard/finance" target="_blank" size="sm" mt={3} colorScheme="blue" variant="outline">
              Gérer dans les Finances
            </Button>
          </CardBody>
        </Card>
      </VStack>
    );

  const renderHelloAssoTab = () => {
    const saveHelloAsso = async () => {
      if (!selectedEvent?.id) {
        toast({ status: "warning", title: "Aucun événement sélectionné" });
        return;
      }
      try {
        // Parser les extras actuelles
        let extras = {};
        try {
          extras = selectedEvent.extras ? JSON.parse(selectedEvent.extras) : {};
        } catch (e) {
          console.warn('Erreur parsing extras:', e);
        }

        // Mettre à jour les données HelloAsso
        const updatedExtras = {
          ...extras,
          helloAssoUrl: ha.url || null,
          helloAssoOrg: ha.org || null,
          helloAssoEvent: ha.event || null,
          registrationMethod: ha.url ? 'helloasso' : extras.registrationMethod
        };

        // Appeler l'API pour sauvegarder
        const response = await fetch(`/api/events/${selectedEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            extras: JSON.stringify(updatedExtras)
          })
        });

        if (!response.ok) throw new Error('Erreur sauvegarde');

        // Mettre à jour l'événement en mémoire
        const updated = await response.json();
        setSelectedEvent(updated);
        
        toast({ status: "success", title: "Paramètres HelloAsso enregistrés" });
      } catch (e) {
        toast({ status: "error", title: "Erreur", description: e.message });
      }
    };

    return (
      <VStack align="stretch" spacing={4}>
        <FormControl>
          <FormLabel>URL de l'événement HelloAsso</FormLabel>
          <Input placeholder="https://www.helloasso.com/associations/retrobus-essonne/evenements/..." value={ha.url}
            onChange={(e) => setHa(s => ({ ...s, url: e.target.value }))} />
        </FormControl>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl>
            <FormLabel>Organisation</FormLabel>
            <Input value={ha.org} onChange={(e) => setHa(s => ({ ...s, org: e.target.value }))} placeholder="retrobus-essonne" />
          </FormControl>
          <FormControl>
            <FormLabel>Événement</FormLabel>
            <Input value={ha.event} onChange={(e) => setHa(s => ({ ...s, event: e.target.value }))} placeholder="nom-evenement" />
          </FormControl>
        </SimpleGrid>
        <Button leftIcon={<FiSave />} onClick={saveHelloAsso} colorScheme="blue">
          Sauvegarder les paramètres HelloAsso
        </Button>
      </VStack>
    );
  };

  const renderEventsContent = () => {
    switch (activeSubTab) {
      case "participants":
        return renderParticipantsTab();
      case "routes":
        return renderRoutesTab();
      case "finances":
        return renderFinancesTab();
      case "helloasso":
        return renderHelloAssoTab();
      case "list":
      default:
        return renderListTab();
    }
  };

  const renderPlanificationSection = () => (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <Box>
          <Heading size="md">Planifications ({planifications.length})</Heading>
        </Box>
        <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm">Ajouter</Button>
      </HStack>
      <Table variant="simple" size="sm">
        <Thead><Tr bg="gray.50"><Th>Planification</Th><Th>Date</Th><Th>Places</Th><Th>Confirmés</Th><Th>Taux</Th></Tr></Thead>
        <Tbody>
          {planifications.map((p) => (
            <Tr key={p.id}>
              <Td fontWeight="bold">{p.name}</Td>
              <Td>{formatDate(p.date)}</Td>
              <Td>{p.places}</Td>
              <Td>{p.confirmed}</Td>
              <Td>
                <HStack spacing={2}>
                  <Progress value={(p.confirmed / p.places) * 100} w="100px" colorScheme="green" size="sm" />
                  <Text fontSize="sm">{Math.round((p.confirmed / p.places) * 100)}%</Text>
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </VStack>
  );

  const renderRetroGPSSection = () => (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <Heading size="md">Suivi GPS ({gpsTracking.length} actifs)</Heading>
        <Button leftIcon={<FiRefreshCw />} variant="outline" size="sm">Rafraîchir</Button>
      </HStack>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {gpsTracking.map((track) => (
          <Card key={track.id} borderLeft="4px" borderLeftColor="blue.400">
            <CardHeader>
              <HStack justify="space-between">
                <Heading size="sm">{track.bus}</Heading>
                <Badge colorScheme={track.speed > 40 ? "orange" : "green"}>{track.speed} km/h</Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={3}>
                <Box bg="gray.50" p={3} borderRadius="md" fontSize="sm">
                  <HStack spacing={6}>
                    <Box><Text fontWeight="bold" fontSize="xs" color="gray.600">LAT</Text><Text fontFamily="mono">{track.lat.toFixed(4)}</Text></Box>
                    <Box><Text fontWeight="bold" fontSize="xs" color="gray.600">LNG</Text><Text fontFamily="mono">{track.lng.toFixed(4)}</Text></Box>
                  </HStack>
                </Box>
                <Button size="sm" variant="outline" leftIcon={<FiMapPin />}>Voir sur la carte</Button>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </VStack>
  );

  // État pour les sous-onglets de Gestion des événements
  const [activeSubTab, setActiveSubTab] = useState("list");
  const [activeMainSection, setActiveMainSection] = useState("events");

  const sections = [
    { id: "events", label: "Gestion des événements", icon: FiCalendar, description: "Création & détails" },
    { id: "planning", label: "Planification", icon: FiClock, description: "Trajets & calendrier" },
    { id: "retrogps", label: "RétroGPS", icon: FiMapPin, description: "Suivi GPS" }
  ];

  const getMainContent = () => {
    switch (activeMainSection) {
      case "planning":
        return renderPlanificationSection();
      case "retrogps":
        return renderRetroGPSSection();
      case "events":
      default:
        return renderEventsContent();
    }
  };

  return (
    <HStack align="stretch" spacing={0} h="100vh" w="100%">
      {/* Sidebar avec navigation principale et sous-onglets */}
      <VStack
        align="stretch"
        spacing={0}
        w="280px"
        bg="gray.50"
        borderRight="1px"
        borderColor="gray.200"
        overflowY="auto"
      >
        {/* Header du sidebar */}
        <Box p={6} borderBottom="1px" borderColor="gray.200">
          <HStack spacing={3} mb={3}>
            <Icon as={FiCalendar} color="blue.500" boxSize={6} />
            <Box>
              <Heading size="lg" color="black">Événements</Heading>
              <Text fontSize="sm" color="gray.500">Organisation & planning</Text>
            </Box>
          </HStack>
          <Text fontSize="xs" color="gray.500">Events v2</Text>
        </Box>

        {/* Navigation principale */}
        <VStack align="stretch" spacing={0} px={3} py={4} flex={1}>
          {sections.map((section) => {
            const isActive = section.id === activeMainSection;
            const SectionIcon = section.icon;
            return (
              <Box key={section.id}>
                <Button
                  leftIcon={<Icon as={SectionIcon} />}
                  variant="ghost"
                  justifyContent="flex-start"
                  w="full"
                  bg={isActive ? "blue.50" : "transparent"}
                  borderLeft="3px"
                  borderColor={isActive ? "blue.500" : "transparent"}
                  borderRadius={0}
                  px={4}
                  py={6}
                  fontSize="sm"
                  fontWeight={isActive ? "600" : "500"}
                  color={isActive ? "blue.500" : "inherit"}
                  _hover={{ bg: "gray.100", borderLeftColor: "blue.500" }}
                  onClick={() => setActiveMainSection(section.id)}
                >
                  <Flex direction="column" align="flex-start" w="full">
                    <Text>{section.label}</Text>
                    {section.description && (
                      <Text fontSize="xs" color="gray.500">{section.description}</Text>
                    )}
                  </Flex>
                </Button>
                {/* Sous-onglets pour Gestion des événements */}
                {isActive && section.id === "events" && (
                  <VStack align="stretch" spacing={0} pl={8} bg="blue.50">
                    {[
                      { id: "list", label: "Liste des événements", icon: FiCalendar },
                      { id: "participants", label: "Participants", icon: FiUsers },
                      { id: "routes", label: "Trajets", icon: FiNavigation },
                      { id: "finances", label: "Finances", icon: FiDollarSign },
                      { id: "helloasso", label: "HelloAsso", icon: FiGift }
                    ].map((subTab) => (
                      <Button
                        key={subTab.id}
                        leftIcon={<Icon as={subTab.icon} boxSize={4} />}
                        variant="ghost"
                        justifyContent="flex-start"
                        w="full"
                        bg={activeSubTab === subTab.id ? "blue.100" : "transparent"}
                        borderLeft="3px"
                        borderColor={activeSubTab === subTab.id ? "blue.600" : "transparent"}
                        borderRadius={0}
                        px={4}
                        py={4}
                        fontSize="sm"
                        fontWeight={activeSubTab === subTab.id ? "600" : "500"}
                        color={activeSubTab === subTab.id ? "blue.600" : "gray.600"}
                        _hover={{ bg: "blue.100" }}
                        onClick={() => setActiveSubTab(subTab.id)}
                      >
                        {subTab.label}
                      </Button>
                    ))}
                  </VStack>
                )}
              </Box>
            );
          })}
        </VStack>

        {/* Footer du sidebar */}
        <Box p={4} borderTop="1px" borderColor="gray.200" fontSize="xs" color="gray.500" textAlign="center" w="full">
          MyRBE
        </Box>
      </VStack>

      {/* Contenu principal */}
      <VStack align="stretch" spacing={0} flex={1} overflowY="auto">
        {/* Header */}
        <Box p={6} borderBottom="1px" borderColor="gray.200" bg="white">
          <HStack justify="space-between">
            <Box>
              <Heading size="lg">
                {activeMainSection === "events" && "Gestion des événements"}
                {activeMainSection === "planning" && "Planification"}
                {activeMainSection === "retrogps" && "Suivi GPS"}
              </Heading>
              <Text fontSize="sm" color="gray.500">
                {activeMainSection === "events" && "Créez, planifiez et suivez les tournées RétroBus"}
                {activeMainSection === "planning" && "Gérez les itinéraires et les calendriers"}
                {activeMainSection === "retrogps" && "Suivi en temps réel des véhicules"}
              </Text>
            </Box>
            <HStack spacing={2}>
              {activeMainSection === "events" && (
                <>
                  <Button as={RouterLink} to="/dashboard/evenements" leftIcon={<FiPlus />} colorScheme="blue" variant="outline">
                    Créer un événement
                  </Button>
                  <Button leftIcon={<FiRefreshCw />} variant="outline" onClick={() => window.location.reload()}>
                    Actualiser
                  </Button>
                </>
              )}
              {activeMainSection === "planning" && (
                <Button leftIcon={<FiRefreshCw />} variant="outline" onClick={() => window.location.reload()}>
                  Actualiser
                </Button>
              )}
              {activeMainSection === "retrogps" && (
                <Button leftIcon={<FiRefreshCw />} variant="outline" onClick={() => window.location.reload()}>
                  Actualiser
                </Button>
              )}
            </HStack>
          </HStack>
        </Box>

        {/* Contenu */}
        <Box flex={1} overflowY="auto" p={6} w="full">
          {getMainContent()}
        </Box>
      </VStack>

      {/* Modal de gestion des paramètres de l'événement */}
      <Modal isOpen={isManageOpen} onClose={onManageClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack align="start" spacing={1}>
              <Heading size="md">Gérer: {managingEvent?.title}</Heading>
              <Text fontSize="sm" color="gray.600">Tarifs, places et paiement</Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={6}>
              {/* Tarifs et places */}
              <Box p={4} bg="blue.50" borderRadius="md">
                <Heading size="sm" mb={4}>Tarification & Places</Heading>
                <SimpleGrid columns={3} spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm">Places max</FormLabel>
                    <NumberInput value={managingEventData.maxParticipants} onChange={(val) => setManagingEventData(d => ({ ...d, maxParticipants: parseInt(val) || 0 }))}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Adulte (€)</FormLabel>
                    <NumberInput value={managingEventData.adultPrice} step={0.5} onChange={(val) => setManagingEventData(d => ({ ...d, adultPrice: parseFloat(val) || 0 }))}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Enfant (€)</FormLabel>
                    <NumberInput value={managingEventData.childPrice} step={0.5} onChange={(val) => setManagingEventData(d => ({ ...d, childPrice: parseFloat(val) || 0 }))}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </SimpleGrid>
              </Box>

              <Divider />

              {/* Méthode de paiement */}
              <Box>
                <Heading size="sm" mb={4}>Méthode d'inscription</Heading>
                <Select value={managingEventData.registrationMethod} onChange={(e) => setManagingEventData(d => ({ ...d, registrationMethod: e.target.value }))}>
                  <option value="internal">Inscription interne</option>
                  <option value="helloasso">HelloAsso</option>
                  <option value="pdf">Formulaire PDF</option>
                  <option value="none">Aucune inscription</option>
                </Select>
              </Box>

              {/* Configuration HelloAsso */}
              {managingEventData.registrationMethod === 'helloasso' && (
                <Box p={4} bg="purple.50" borderRadius="md" borderLeft="4px" borderLeftColor="purple.400">
                  <VStack align="stretch" spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="sm" fontWeight="bold">URL HelloAsso</FormLabel>
                      <Input 
                        placeholder="https://www.helloasso.com/associations/retrobus-essonne/evenements/..."
                        value={managingEventData.helloAssoUrl}
                        onChange={(e) => setManagingEventData(d => ({ ...d, helloAssoUrl: e.target.value }))}
                      />
                    </FormControl>
                    <HStack spacing={2} pt={2}>
                      <Icon as={FiGift} color="purple.600" />
                      <Text fontSize="sm" color="purple.700">Les participants paieront via HelloAsso</Text>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* Configuration PDF */}
              {managingEventData.registrationMethod === 'pdf' && (
                <Box p={4} bg="orange.50" borderRadius="md" borderLeft="4px" borderLeftColor="orange.400">
                  <VStack align="stretch" spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="sm" fontWeight="bold">URL du formulaire PDF</FormLabel>
                      <Input 
                        placeholder="https://..."
                        value={managingEventData.pdfUrl}
                        onChange={(e) => setManagingEventData(d => ({ ...d, pdfUrl: e.target.value }))}
                      />
                    </FormControl>
                    <HStack spacing={2} pt={2}>
                      <Icon as={FiExternalLink} color="orange.600" />
                      <Text fontSize="sm" color="orange.700">Les participants téléchargeront le PDF</Text>
                    </HStack>
                  </VStack>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onManageClose}>Annuler</Button>
              <Button leftIcon={<FiSave />} colorScheme="blue" onClick={saveManageEvent}>Sauvegarder</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal d'invitations */}
      <Modal isOpen={isInviteOpen} onClose={onInviteClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack align="start" spacing={1}>
              <Heading size="md">Inviter les gens: {inviteEvent?.title}</Heading>
              <Text fontSize="sm" color="gray.600">Sélectionnez les personnes à inviter pour cet événement</Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {loadingMembers ? (
              <Center py={8}><Spinner /></Center>
            ) : (
              <VStack align="stretch" spacing={4}>
                {availableMembers.length === 0 ? (
                  <Text color="gray.500">Aucun membre disponible</Text>
                ) : (
                  <VStack align="stretch" maxH="400px" overflowY="auto">
                    {availableMembers.map(member => (
                      <HStack key={member.id} p={3} border="1px" borderColor="gray.200" borderRadius="md" cursor="pointer" 
                        onClick={() => {
                          setSelectedMemberIds(prev => 
                            prev.includes(member.id) 
                              ? prev.filter(id => id !== member.id)
                              : [...prev, member.id]
                          );
                        }}
                        bg={selectedMemberIds.includes(member.id) ? "blue.50" : "white"}
                        _hover={{ bg: selectedMemberIds.includes(member.id) ? "blue.100" : "gray.50" }}
                      >
                        <Checkbox isChecked={selectedMemberIds.includes(member.id)} />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">{member.firstName} {member.lastName}</Text>
                          <Text fontSize="sm" color="gray.600">{member.email}</Text>
                        </VStack>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack spacing={2}>
              <Button variant="ghost" onClick={onInviteClose}>Annuler</Button>
              <Button colorScheme="blue" isLoading={loadingMembers} onClick={sendInvitations}>
                Inviter {selectedMemberIds.length} {selectedMemberIds.length <= 1 ? 'personne' : 'personnes'}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </HStack>
  );
}
