import React, { useEffect, useMemo, useState } from "react";
import {
  Box, SimpleGrid, GridItem, Heading, Text, Button, Link as ChakraLink,
  Stack, Stat, StatLabel, StatNumber, HStack, VStack, Badge, useColorModeValue,
  Container, Flex, Card, CardBody, CardHeader, Icon, Progress, Avatar,
  Divider, Center, Spinner, Alert, AlertIcon, Tag, TagLabel, TagLeftIcon,
  useToast, IconButton, Image
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { 
  FiActivity, FiBell, FiCalendar, FiClock, FiCpu, 
  FiDollarSign, FiExternalLink, FiEye, FiFileText, FiGitBranch, 
  FiHeart, FiHome, FiMapPin, FiPlus, FiRefreshCw, FiSettings, 
  FiTrendingUp, FiTruck, FiUser, FiUsers, FiZap, FiBarChart,
  FiChevronLeft, FiChevronRight, FiShare2, FiMail
} from "react-icons/fi";
import { useUser } from '../context/UserContext';

// Import APIs avec gestion d'erreur
import { vehiculesAPI } from '../api/vehicles';
import { eventsAPI } from '../api/events';
import { membersAPI } from '../api/members';

const ANN_KEY = "rbe:announcements";

function loadFlashes() {
  try {
    const raw = localStorage.getItem(ANN_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const now = Date.now();
    return arr.filter(f => f && f.active && (!f.expiresAt || new Date(f.expiresAt).getTime() > now));
  } catch (e) {
    return [];
  }
}

export default function DashboardHome() {
  const user = useUser();
  const [flashes, setFlashes] = useState([]);
  const [stats, setStats] = useState({
    vehicles: { total: 0, active: 0, loading: true },
    events: { total: 0, upcoming: 0, published: 0, loading: true },
    members: { total: 0, active: 0, loading: true }
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retroActus, setRetroActus] = useState([]);
  const [currentActuIndex, setCurrentActuIndex] = useState(0);
  
  const toast = useToast();
  const cardBg = useColorModeValue("white", "gray.800");
  const gradientBg = useColorModeValue(
    "linear(to-r, blue.500, purple.600)",
    "linear(to-r, blue.600, purple.700)"
  );
  const borderColor = useColorModeValue("gray.200", "gray.700");

  useEffect(() => {
    setFlashes(loadFlashes());
    loadDashboardData();
    
    // Actualiser les donnÃ©es toutes les 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    // Charger chaque type de donnÃ©es en parallÃ¨le
    loadVehiclesData();
    loadEventsData();
    loadMembersData();
    
    // Charger les actus
    loadRetroActus();
  };

  const loadRetroActus = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const candidates = [
        `${API_BASE}/api/retro-news`,
        `${API_BASE}/retro-news`,
        '/data/retro-news.json'
      ];
      
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          setRetroActus(Array.isArray(data) ? data : []);
          return;
        } catch (e) {
          }
      }
      
      // Si aucune source n'a fonctionnÃ©
      setRetroActus([]);
    } catch (error) {
      setRetroActus([]);
    }
  };

  const shareRetroActu = async (actu) => {
    const subject = encodeURIComponent(`RÃ©troActus: ${actu?.title || 'News'}`);
    const body = encodeURIComponent(
      `DÃ©couvrez cette actualitÃ© de RÃ©troBus Essonne:\n\n` +
      `${actu?.title || 'Sans titre'}\n\n` +
      `${actu?.content || ''}\n\n` +
      `Site: https://retrobus-essonne.fr`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareOnWeb = async (actu) => {
    // VÃ©rifie si l'API Web Share est disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: actu?.title || 'RÃ©troActus',
          text: actu?.content || '',
          url: 'https://retrobus-essonne.fr'
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          }
      }
    } else {
      // Fallback: copier dans le presse-papiers
      const textToCopy = `${actu?.title}\n${actu?.content}\nhttps://retrobus-essonne.fr`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        toast({
          title: "CopiÃ©!",
          description: "L'actualitÃ© a Ã©tÃ© copiÃ©e dans le presse-papiers",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      });
    }
  };

  const loadVehiclesData = async () => {
    try {
      // VÃ©rifier si l'API existe
      if (!vehiculesAPI || typeof vehiculesAPI.getAll !== 'function') {
        setStats(prev => ({
          ...prev,
          vehicles: { total: 0, active: 0, loading: false }
        }));
        return;
      }

      const response = await vehiculesAPI.getAll();
      // Adapter selon la structure de la rÃ©ponse
      let vehicles = [];
      if (response?.data) {
        vehicles = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        vehicles = response;
      }

      const vehicleStats = {
        total: vehicles.length,
        active: vehicles.filter(v => {
          // Tenter diffÃ©rents noms de champs pour le statut
          const status = v?.statut || v?.status || v?.etat || '';
          return status === 'ACTIF' || status === 'ACTIVE' || status === 'active' || status === 'En service';
        }).length,
        loading: false
      };

      setStats(prev => ({
        ...prev,
        vehicles: vehicleStats
      }));

      // Ajouter Ã  l'activitÃ© rÃ©cente si nouveaux vÃ©hicules
      if (vehicles.length > 0) {
        const recentVehicles = vehicles.filter(v => {
          const created = new Date(v.createdAt || v.dateCreation || v.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return created > dayAgo;
        });

        if (recentVehicles.length > 0) {
          setRecentActivity(prev => [
            {
              id: `vehicles-${Date.now()}`,
              type: 'vehicle',
              title: `${recentVehicles.length} nouveau(x) vÃ©hicule(s) ajoutÃ©(s)`,
              time: 'Aujourd\'hui',
              icon: FiTruck,
              color: 'blue'
            },
            ...prev.filter(a => a.type !== 'vehicle')
          ]);
        }
      }

    } catch (error) {
      setStats(prev => ({
        ...prev,
        vehicles: { total: 0, active: 0, loading: false }
      }));
    }
  };

  const loadEventsData = async () => {
    try {
      // VÃ©rifier si l'API existe
      if (!eventsAPI || typeof eventsAPI.getAll !== 'function') {
        setStats(prev => ({
          ...prev,
          events: { total: 0, upcoming: 0, published: 0, loading: false }
        }));
        return;
      }

      const response = await eventsAPI.getAll();
      // Adapter selon la structure de la rÃ©ponse
      let events = [];
      if (response?.data) {
        events = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        events = response;
      }

      const now = new Date();
      const eventStats = {
        total: events.length,
        upcoming: events.filter(e => {
          try {
            const eventDate = new Date(e?.date || e?.dateEvent || e?.startDate);
            const status = e?.status || e?.statut || '';
            return eventDate > now && (status === 'PUBLISHED' || status === 'published' || status === 'PubliÃ©');
          } catch {
            return false;
          }
        }).length,
        published: events.filter(e => {
          const status = e?.status || e?.statut || '';
          return status === 'PUBLISHED' || status === 'published' || status === 'PubliÃ©';
        }).length,
        loading: false
      };

      setStats(prev => ({
        ...prev,
        events: eventStats
      }));

      // Ajouter Ã  l'activitÃ© rÃ©cente si nouveaux Ã©vÃ©nements
      if (events.length > 0) {
        const recentEvents = events.filter(e => {
          const created = new Date(e.createdAt || e.dateCreation || e.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return created > dayAgo;
        });

        if (recentEvents.length > 0) {
          setRecentActivity(prev => [
            {
              id: `events-${Date.now()}`,
              type: 'event',
              title: `${recentEvents.length} nouvel(s) Ã©vÃ©nement(s) crÃ©Ã©(s)`,
              time: 'Aujourd\'hui',
              icon: FiCalendar,
              color: 'green'
            },
            ...prev.filter(a => a.type !== 'event')
          ]);
        }
      }

    } catch (error) {
      setStats(prev => ({
        ...prev,
        events: { total: 0, upcoming: 0, published: 0, loading: false }
      }));
    }
  };

  const loadMembersData = async () => {
    try {
      // VÃ©rifier si l'API existe
      if (!membersAPI || typeof membersAPI.getAll !== 'function') {
        setStats(prev => ({
          ...prev,
          members: { total: 0, active: 0, loading: false }
        }));
        return;
      }

      const response = await membersAPI.getAll();
      // Adapter selon la structure de la rÃ©ponse
      let members = [];
      if (response?.members) {
        members = Array.isArray(response.members) ? response.members : [response.members];
      } else if (response?.data) {
        members = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        members = response;
      }

      const memberStats = {
        total: members.length,
        active: members.filter(m => {
          const status = m?.membershipStatus || m?.statut || m?.status || m?.adhesionStatus || '';
          return status === 'ACTIVE' || status === 'active' || status === 'Actif' || status === 'Ã€ jour';
        }).length,
        loading: false
      };

      setStats(prev => ({
        ...prev,
        members: memberStats
      }));

      // Ajouter Ã  l'activitÃ© rÃ©cente si nouveaux membres
      if (members.length > 0) {
        const recentMembers = members.filter(m => {
          const created = new Date(m.createdAt || m.dateCreation || m.dateAdhesion || m.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return created > dayAgo;
        });

        if (recentMembers.length > 0) {
          setRecentActivity(prev => [
            {
              id: `members-${Date.now()}`,
              type: 'member',
              title: `${recentMembers.length} nouvelle(s) adhÃ©sion(s)`,
              time: 'Aujourd\'hui',
              icon: FiUsers,
              color: 'purple'
            },
            ...prev.filter(a => a.type !== 'member')
          ]);
        }
      }

    } catch (error) {
      setStats(prev => ({
        ...prev,
        members: { total: 0, active: 0, loading: false }
      }));
    }
  };

  // Finaliser le loading quand toutes les donnÃ©es sont chargÃ©es
  useEffect(() => {
    const allLoaded = !stats.vehicles.loading && !stats.events.loading && !stats.members.loading;
    if (allLoaded && loading) {
      setLoading(false);
    }
  }, [stats, loading]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 17) return "Bon aprÃ¨s-midi";
    return "Bonsoir";
  };

  const info = useMemo(() => {
    return flashes.map(f => ({
      id: f.id,
      message: f.message,
      category: f.category || 'info',
      createdAt: f.createdAt
    }));
  }, [flashes]);

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Box
            bgGradient={gradientBg}
            color="white"
            p={8}
            borderRadius="xl"
            textAlign="center"
            w="full"
          >
            <Heading size="xl">Chargement des donnÃ©es...</Heading>
            <Text mt={2} opacity={0.9}>
              RÃ©cupÃ©ration des vÃ©hicules, Ã©vÃ©nements et membres
            </Text>
          </Box>
          <Spinner size="xl" color="blue.500" />
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8} fontFamily="Montserrat, sans-serif">
      {/* En-tÃªte avec salutation */}
      <Box
        bgGradient={gradientBg}
        color="white"
        p={8}
        borderRadius="xl"
        mb={8}
        textAlign="center"
      >
        <Heading size="xl" mb={4}>
          {getGreeting()}, {user?.prenom || user?.email || 'Utilisateur'} ! ðŸ‘‹
        </Heading>
        <Text fontSize="lg" opacity={0.9}>
          Voici un aperÃ§u de votre activitÃ© RÃ©trobuS Essonne
        </Text>
      </Box>

      {/* Grille principale */}
      <SimpleGrid columns={{ base: 1, lg: 4 }} spacing={8}>
        {/* Contenu principal */}
        <GridItem colSpan={{ base: 1, lg: 3 }}>
          <VStack spacing={8} align="stretch">
            {/* Statistiques principales */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
              <Card bg={cardBg} borderColor={borderColor} shadow="lg">
                <CardBody>
                  <Stat>
                    <StatLabel color="gray.600">VÃ©hicules actifs</StatLabel>
                    <StatNumber color="blue.500">
                      <HStack>
                        <Icon as={FiTruck} />
                        {stats.vehicles.loading ? (
                          <Spinner size="sm" />
                        ) : (
                          <Text>{stats.vehicles.active}/{stats.vehicles.total}</Text>
                        )}
                      </HStack>
                    </StatNumber>
                    <Progress 
                      value={stats.vehicles.total > 0 ? (stats.vehicles.active / stats.vehicles.total) * 100 : 0} 
                      colorScheme="blue" 
                      size="sm" 
                      mt={2} 
                      isIndeterminate={stats.vehicles.loading}
                    />
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderColor={borderColor} shadow="lg">
                <CardBody>
                  <Stat>
                    <StatLabel color="gray.600">Ã‰vÃ©nements Ã  venir</StatLabel>
                    <StatNumber color="green.500">
                      <HStack>
                        <Icon as={FiCalendar} />
                        {stats.events.loading ? (
                          <Spinner size="sm" />
                        ) : (
                          <Text>{stats.events.upcoming}/{stats.events.total}</Text>
                        )}
                      </HStack>
                    </StatNumber>
                    <Progress 
                      value={stats.events.total > 0 ? (stats.events.upcoming / stats.events.total) * 100 : 0} 
                      colorScheme="green" 
                      size="sm" 
                      mt={2} 
                      isIndeterminate={stats.events.loading}
                    />
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderColor={borderColor} shadow="lg">
                <CardBody>
                  <Stat>
                    <StatLabel color="gray.600">Membres actifs</StatLabel>
                    <StatNumber color="purple.500">
                      <HStack>
                        <Icon as={FiUsers} />
                        {stats.members.loading ? (
                          <Spinner size="sm" />
                        ) : (
                          <Text>{stats.members.active}/{stats.members.total}</Text>
                        )}
                      </HStack>
                    </StatNumber>
                    <Progress 
                      value={stats.members.total > 0 ? (stats.members.active / stats.members.total) * 100 : 0} 
                      colorScheme="purple" 
                      size="sm" 
                      mt={2} 
                      isIndeterminate={stats.members.loading}
                    />
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>



            {/* Les RÃ©troActus */}
            {retroActus.length > 0 && (
              <Card bg={cardBg} borderColor={borderColor} shadow="lg">
                <CardHeader>
                  <HStack justify="space-between">
                    <Heading size="md" fontWeight="700">ðŸ“° Les RÃ©troActus</Heading>
                    <HStack spacing={2}>
                      <IconButton
                        icon={<FiChevronLeft />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setCurrentActuIndex((prev) => 
                          prev === 0 ? retroActus.length - 1 : prev - 1
                        )}
                        aria-label="Actu prÃ©cÃ©dente"
                        isDisabled={retroActus.length <= 1}
                      />
                      <Text fontSize="xs" color="gray.500">
                        {currentActuIndex + 1} / {retroActus.length}
                      </Text>
                      <IconButton
                        icon={<FiChevronRight />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setCurrentActuIndex((prev) => 
                          (prev + 1) % retroActus.length
                        )}
                        aria-label="Actu suivante"
                        isDisabled={retroActus.length <= 1}
                      />
                    </HStack>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack align="start" spacing={3}>
                    <Heading size="sm" color="blue.600">
                      {retroActus[currentActuIndex]?.title || 'Sans titre'}
                    </Heading>
                    {retroActus[currentActuIndex]?.date && (
                      <HStack spacing={2} color="gray.500" fontSize="sm">
                        <Icon as={FiCalendar} />
                        <Text>
                          {new Date(retroActus[currentActuIndex].date).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </HStack>
                    )}
                    <Text fontSize="sm" color="gray.700">
                      {retroActus[currentActuIndex]?.content || ''}
                    </Text>
                    {retroActus[currentActuIndex]?.imageUrl && (
                      <Image
                        src={retroActus[currentActuIndex].imageUrl}
                        alt={retroActus[currentActuIndex]?.title}
                        maxH="150px"
                        w="100%"
                        objectFit="cover"
                        borderRadius="md"
                      />
                    )}
                    <HStack spacing={2} pt={4} w="100%">
                      <Button
                        size="sm"
                        leftIcon={<FiShare2 />}
                        colorScheme="blue"
                        variant="outline"
                        flex={1}
                        onClick={() => shareOnWeb(retroActus[currentActuIndex])}
                      >
                        Partager
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<FiMail />}
                        colorScheme="cyan"
                        variant="outline"
                        flex={1}
                        onClick={() => shareRetroActu(retroActus[currentActuIndex])}
                      >
                        Email
                      </Button>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            )}


          </VStack>
        </GridItem>

        {/* Sidebar */}
        <GridItem>
          <VStack spacing={6} align="stretch">
            {/* Notifications */}
            <Card bg={cardBg} borderColor={borderColor} shadow="lg">
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="md" fontWeight="700">Notifications</Heading>
                  <Badge colorScheme="blue" variant="subtle">
                    {flashes.length}
                  </Badge>
                </HStack>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  {info.length === 0 ? (
                    <Text color="gray.500" fontSize="sm" textAlign="center" py={4}>
                      Aucune notification
                    </Text>
                  ) : (
                    info.slice(0, 5).map((flash) => (
                      <Box key={flash.id} p={3} borderRadius="lg" bg="gray.50">
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={1} flex={1}>
                            <Text fontSize="sm" fontWeight="600">
                              {flash.message}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {flash.createdAt ? new Date(flash.createdAt).toLocaleDateString('fr-FR') : ''}
                            </Text>
                          </VStack>
                          <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                            {flash.category}
                          </Badge>
                        </HStack>
                      </Box>
                    ))
                  )}
                </VStack>
              </CardBody>
            </Card>

            {/* Liens utiles */}
            <Card bg={cardBg} borderColor={borderColor} shadow="lg">
              <CardHeader>
                <Heading size="md" fontWeight="700">Liens utiles</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  <Button
                    as={RouterLink}
                    to="/dashboard/myrbe"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiHome />}
                    size="sm"
                  >
                    MyRBE
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/dashboard/vehicules"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiTruck />}
                    size="sm"
                  >
                    VÃ©hicules ({stats.vehicles.total})
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/dashboard/events-management"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiCalendar />}
                    size="sm"
                  >
                    Ã‰vÃ©nements ({stats.events.total})
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/dashboard/members-management"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiUsers />}
                    size="sm"
                  >
                    Membres ({stats.members.total})
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/admin"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiDollarSign />}
                    size="sm"
                  >
                    Finance
                  </Button>
                  <Divider my={1} />
                  <Button
                    as={RouterLink}
                    to="/dashboard/api-diagnostics"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiCpu />}
                    size="sm"
                    colorScheme="orange"
                  >
                    ðŸ”§ Diagnostiques API
                  </Button>
                </VStack>
              </CardBody>
            </Card>

            {/* Informations systÃ¨me */}
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold" fontSize="sm">
                  APIs disponibles
                </Text>
                <Text fontSize="xs">
                  Les donnÃ©es sont rÃ©cupÃ©rÃ©es en temps rÃ©el quand les APIs sont disponibles.
                </Text>
              </VStack>
            </Alert>
          </VStack>
        </GridItem>
      </SimpleGrid>
    </Container>
  );
}
