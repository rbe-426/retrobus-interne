import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box, VStack, HStack, Heading, Text, Button, Card, CardBody, CardHeader,
  Table, Thead, Tbody, Tr, Th, Td, Badge, IconButton, Spinner, Center,
  SimpleGrid, Stat, StatLabel, StatNumber, Input, InputGroup, InputLeftElement,
  Select, FormControl, FormLabel, useToast, Progress, NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Divider, Icon, Flex
} from "@chakra-ui/react";
import {
  FiEdit, FiPlus, FiRefreshCw, FiSearch, FiMapPin,
  FiTruck, FiUsers, FiTrash2, FiSave, FiDollarSign, FiNavigation, FiGift, FiCalendar, FiClock
} from "react-icons/fi";
import { eventsAPI } from "../api/events";

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
  try {
    return new Date(d).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "Date invalide";
  }
};

export default function EventsManagement() {
  const toast = useToast();

  // État pour gestion événement
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeEventTab, setActiveEventTab] = useState("participants");

  // Participants, routes, finances
  const [participants, setParticipants] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [fin, setFin] = useState({ revenue: 0, expenses: 0, profit: 0, capacity: 0, occupancy: 0, rate: 0, breakdown: null });
  const [ha, setHa] = useState({ url: "", org: "", event: "" });
  const [relatedTransactions, setRelatedTransactions] = useState([]);

  // Planification
  const [planifications, setPlanifications] = useState([]);

  // RétroGPS
  const [gpsTracking, setGpsTracking] = useState([]);

  // Fetch events
  useEffect(() => {
    (async () => {
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
    })();
  }, [toast]);

  // Charger planifications et GPS au démarrage
  useEffect(() => {
    (async () => {
      try {
        const plans = await eventsAPI.getPlanifications();
        setPlanifications(Array.isArray(plans) ? plans : []);
      } catch (err) {
        console.warn('Erreur chargement planifications:', err);
      }

      try {
        const gps = await eventsAPI.getGPSTracking();
        setGpsTracking(Array.isArray(gps) ? gps : []);
      } catch (err) {
        console.warn('Erreur chargement GPS:', err);
      }
    })();
  }, []);

  // Recalculer finances
  useEffect(() => {
    const confirmed = participants.filter(p => p.status === "confirmed");
    const adultCount = confirmed.filter(p => p.type === "adult").length;
    const childCount = confirmed.filter(p => p.type === "child").length;
    const capacity = routes.reduce((s, r) => s + (r.capacity || 0), 0);
    const occupancy = confirmed.length;
    const rate = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;
    
    // Prix de démo
    const adultPrice = 25;
    const childPrice = 15;
    const revenue = Math.round(adultCount * adultPrice + childCount * childPrice);
    const expenses = Math.round(revenue * 0.25 + capacity * 2 + occupancy * 3);
    const profit = revenue - expenses;

    setFin({
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
    });
  }, [participants, routes]);

  // Filtrer les événements
  const filtered = useMemo(() => {
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

  // Participants
  const addParticipant = async (p) => {
    if (!p?.name || !p?.email) {
      toast({ status: "warning", title: "Nom et email requis" });
      return;
    }
    if (!selectedEvent?.id) {
      toast({ status: "warning", title: "Aucun événement sélectionné" });
      return;
    }
    try {
      await eventsAPI.addParticipant(selectedEvent.id, p);
      const updated = await eventsAPI.getParticipants(selectedEvent.id);
      setParticipants(Array.isArray(updated) ? updated : []);
      toast({ status: "success", title: "Participant ajouté" });
    } catch (err) {
      toast({ status: "error", title: "Erreur", description: err.message });
    }
  };

  const updateParticipant = async (id, updates) => {
    if (!selectedEvent?.id) return;
    try {
      await eventsAPI.updateParticipant(selectedEvent.id, id, updates);
      const updated = await eventsAPI.getParticipants(selectedEvent.id);
      setParticipants(Array.isArray(updated) ? updated : []);
    } catch (err) {
      toast({ status: "error", title: "Erreur", description: err.message });
    }
  };

  const deleteParticipant = async (id) => {
    if (!selectedEvent?.id) return;
    try {
      await eventsAPI.deleteParticipant(selectedEvent.id, id);
      const updated = await eventsAPI.getParticipants(selectedEvent.id);
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

  useEffect(() => {
    if (recalc) setFin(recalc);
  }, [recalc]);

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
          <Card><CardBody><Stat><StatLabel>Total</StatLabel><StatNumber color="blue.500">{stats.total}</StatNumber></Stat></CardBody></Card>
          <Card><CardBody><Stat><StatLabel>Publiés</StatLabel><StatNumber color="green.500">{stats.published}</StatNumber></Stat></CardBody></Card>
          <Card><CardBody><Stat><StatLabel>À venir</StatLabel><StatNumber color="orange.500">{stats.upcoming}</StatNumber></Stat></CardBody></Card>
          <Card><CardBody><Stat><StatLabel>Participants</StatLabel><StatNumber color="purple.500">{stats.totalParticipants}</StatNumber></Stat></CardBody></Card>
          <Card><CardBody><Stat><StatLabel>Revenus</StatLabel><StatNumber color="green.600">{stats.totalRevenue}€</StatNumber></Stat></CardBody></Card>
        </SimpleGrid>

        {loading ? (
          <Center py={20}><Spinner size="xl" /></Center>
        ) : filtered.length === 0 ? (
          <Center py={16}>
            <VStack spacing={4}>
              <Text color="gray.500">Aucun événement</Text>
              <Button as={RouterLink} to="/dashboard/evenements" leftIcon={<FiPlus />} colorScheme="blue">Créer</Button>
            </VStack>
          </Center>
        ) : (
          <Table variant="simple" size="sm">
            <Thead><Tr><Th>Événement</Th><Th>Date</Th><Th>Statut</Th><Th>Actions</Th></Tr></Thead>
            <Tbody>
              {filtered.map((e) => (
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
                      <Button size="sm" variant="ghost" onClick={() => openEvent(e)}>Gérer</Button>
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

  const renderParticipantsTab = () => (
      <VStack align="stretch" spacing={4}>
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
          <Table size="sm" variant="simple">
            <Thead><Tr><Th>Nom</Th><Th>Email</Th><Th>Type</Th><Th>Statut</Th><Th></Th></Tr></Thead>
            <Tbody>
              {participants.map((p) => (
                <Tr key={p.id}>
                  <Td fontWeight="bold">{p.name}</Td>
                  <Td>{p.email}</Td>
                  <Td><Select size="sm" value={p.type} onChange={(e) => updateParticipant(p.id, { type: e.target.value })}>
                    <option value="adult">Adulte</option>
                    <option value="child">Enfant</option>
                  </Select></Td>
                  <Td><Select size="sm" value={p.status} onChange={(e) => updateParticipant(p.id, { status: e.target.value })}>
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmé</option>
                    <option value="cancelled">Annulé</option>
                  </Select></Td>
                  <Td isNumeric><IconButton aria-label="Supprimer" icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red" 
                    onClick={() => deleteParticipant(p.id)} /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </VStack>
    );

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

  const renderHelloAssoTab = () => (
      <VStack align="stretch" spacing={4}>
        <FormControl>
          <FormLabel>URL de l'événement</FormLabel>
          <Input placeholder="https://www.helloasso.com/..." value={ha.url}
            onChange={(e) => setHa(s => ({ ...s, url: e.target.value }))} />
        </FormControl>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl>
            <FormLabel>Organisation</FormLabel>
            <Input value={ha.org} onChange={(e) => setHa(s => ({ ...s, org: e.target.value }))} placeholder="nom-organisation" />
          </FormControl>
          <FormControl>
            <FormLabel>Événement</FormLabel>
            <Input value={ha.event} onChange={(e) => setHa(s => ({ ...s, event: e.target.value }))} placeholder="nom-evenement" />
          </FormControl>
        </SimpleGrid>
        <Button leftIcon={<FiSave />} onClick={() => toast({ status: "success", title: "Paramètres enregistrés" })} colorScheme="blue">
          Sauvegarder
        </Button>
      </VStack>
    );

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
              <Heading size="md" color="gray.800">Événements</Heading>
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
    </HStack>
  );
}
