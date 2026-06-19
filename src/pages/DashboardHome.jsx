import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box, SimpleGrid, GridItem, Heading, Text, Button, Link as ChakraLink,
  Stack, Stat, StatLabel, StatNumber, HStack, VStack, Badge, useColorModeValue,
  Container, Flex, Card, CardBody, CardHeader, Icon, Progress, Avatar,
  Divider, Center, Spinner, Alert, AlertIcon, Tag, TagLabel, TagLeftIcon,
  useToast, IconButton, Image, useMediaQuery, Modal, ModalOverlay, ModalContent,
  ModalBody, ModalCloseButton, useDisclosure
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
// Lazy load ReactMarkdown pour réduire le bundle initial
const ReactMarkdown = React.lazy(() => import('react-markdown'));
import { 
  FiActivity, FiBell, FiCalendar, FiClock, 
  FiDollarSign, FiExternalLink, FiEye, FiFileText, FiGitBranch, 
  FiHeart, FiMapPin, FiPlus, FiRefreshCw, FiSettings, 
  FiTrendingUp, FiTruck, FiUser, FiUsers, FiZap, FiBarChart,
  FiChevronLeft, FiChevronRight, FiShare2, FiMail
} from "react-icons/fi";
import { useUser } from '../context/UserContext';
import { useCache } from '../context/CacheContext';

// Import APIs avec gestion d'erreur
import { vehiculesAPI } from '../api/vehicles';
import { eventsAPI } from '../api/events';
import { membersAPI } from '../api/members';
import { apiClient } from '../api/config';

// Import annonces d'accueil
import HomeAnnouncements, { useHomeAnnouncements } from '../components/HomeAnnouncement';
import PollDisplay from '../components/PollDisplay';

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
    console.warn("loadFlashes:", e);
    return [];
  }
}

export default function DashboardHome() {
  const { user, isAdmin } = useUser();
  const cache = useCache();
  const footerBg = useColorModeValue('gray.900', 'gray.950');
  const [flashes, setFlashes] = useState([]);
  const [stats, setStats] = useState({
    vehicles: { total: 0, active: 0, loading: true },
    events: { total: 0, upcoming: 0, published: 0, loading: true },
    members: { total: 0, active: 0, loading: true },
    retroActus: { total: 0, loading: true }
  });
  const [loading, setLoading] = useState(true);
  const [retroActus, setRetroActus] = useState([]);
  const [currentActuIndex, setCurrentActuIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const { isOpen: isImageOpen, onOpen: onImageOpen, onClose: onImageClose } = useDisclosure();
  
  // Hook pour les annonces d'accueil
  const { announcements, removeAnnouncement } = useHomeAnnouncements();
  
  // Détection mobile
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  
  const toast = useToast();
  const cardBg = useColorModeValue("white", "gray.800");
  const gradientBg = useColorModeValue(
    "linear(to-r, rbe.500, rbe.600)",
    "linear(to-r, rbe.600, rbe.700)"
  );
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // === LOADERS DÉCLARÉS EN PREMIER (avant useEffect) ===
  const loadVehiclesData = useCallback(async () => {
    try {
      console.log('📊 Chargement des véhicules...');
      
      // Vérifier si l'API existe
      if (!vehiculesAPI || typeof vehiculesAPI.getAll !== 'function') {
        console.warn('⚠️ vehiculesAPI non disponible');
        setStats(prev => ({
          ...prev,
          vehicles: { total: 0, active: 0, loading: false }
        }));
        return;
      }

      // Utiliser le cache (5 minutes)
      const response = await cache.fetchWithCache('dashboard:vehicles', 
        () => vehiculesAPI.getAll(),
        5 * 60 * 1000
      );
      console.log('🚛 Réponse véhicules:', response);
      
      // Adapter selon la structure de la réponse
      let vehicles = [];
      if (response?.vehicles) {
        vehicles = Array.isArray(response.vehicles) ? response.vehicles : [response.vehicles];
      } else if (response?.data) {
        vehicles = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        vehicles = response;
      }

      const vehicleStats = {
        total: vehicles.length,
        active: vehicles.filter(v => {
          // Tenter différents noms de champs pour le statut
          const status = v?.statut || v?.status || v?.etat || '';
          return status === 'ACTIF' || status === 'ACTIVE' || status === 'active' || status === 'En service';
        }).length,
        loading: false
      };

      console.log('📈 Stats véhicules:', vehicleStats);

      setStats(prev => ({
        ...prev,
        vehicles: vehicleStats
      }));

    } catch (error) {
      console.error('❌ Erreur chargement véhicules:', error);
      setStats(prev => ({
        ...prev,
        vehicles: { total: 0, active: 0, loading: false }
      }));
    }
  }, [cache]);

  const loadEventsData = useCallback(async () => {
    try {
      console.log('📅 Chargement des événements...');
      
      // Vérifier si l'API existe
      if (!eventsAPI || typeof eventsAPI.getAll !== 'function') {
        console.warn('⚠️ eventsAPI non disponible');
        setStats(prev => ({
          ...prev,
          events: { total: 0, upcoming: 0, published: 0, loading: false }
        }));
        return;
      }

      const response = await cache.fetchWithCache('dashboard:events', 
        () => eventsAPI.getAll(),
        5 * 60 * 1000
      );
      console.log('📅 Réponse événements:', response);
      
      // Adapter selon la structure de la réponse
      let events = [];
      if (response?.events) {
        events = Array.isArray(response.events) ? response.events : [response.events];
      } else if (response?.data) {
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
            return eventDate > now && (status === 'PUBLISHED' || status === 'published' || status === 'Publié');
          } catch {
            return false;
          }
        }).length,
        published: events.filter(e => {
          const status = e?.status || e?.statut || '';
          return status === 'PUBLISHED' || status === 'published' || status === 'Publié';
        }).length,
        loading: false
      };

      console.log('📈 Stats événements:', eventStats);

      setStats(prev => ({
        ...prev,
        events: eventStats
      }));

    } catch (error) {
      console.error('❌ Erreur chargement événements:', error);
      setStats(prev => ({
        ...prev,
        events: { total: 0, upcoming: 0, published: 0, loading: false }
      }));
    }
  }, [cache]);

  const loadMembersData = useCallback(async () => {
    try {
      console.log('👥 Chargement des membres...');
      
      // Vérifier si l'API existe
      if (!membersAPI || typeof membersAPI.getAll !== 'function') {
        console.warn('⚠️ membersAPI non disponible');
        setStats(prev => ({
          ...prev,
          members: { total: 0, active: 0, loading: false }
        }));
        return;
      }

      const response = await cache.fetchWithCache('dashboard:members', 
        () => membersAPI.getAll(),
        5 * 60 * 1000
      );
      console.log('👥 Réponse membres:', response);
      
      // Adapter selon la structure de la réponse
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
          return status === 'ACTIVE' || status === 'active' || status === 'Actif' || status === 'À jour';
        }).length,
        loading: false
      };

      console.log('📈 Stats membres:', memberStats);

      setStats(prev => ({
        ...prev,
        members: memberStats
      }));
    } catch (error) {
      console.error('❌ Erreur chargement membres:', error);
      setStats(prev => ({
        ...prev,
        members: { total: 0, active: 0, loading: false }
      }));
    }
  }, [cache]);

  const loadRetroActus = useCallback(async () => {
    try {
      console.log('📰 Chargement des RétroActus...');
      
      // Charger les actualités publiées avec cache (5 minutes)
      const response = await cache.fetchWithCache('dashboard:retro-actus',
        () => apiClient.get('/api/retro-news'),
        5 * 60 * 1000
      );
      const data = Array.isArray(response) ? response : (response?.news || []);
      
      // Filtrer pour ne garder que les publiés et les trier (vedettes en premier)
      const published = data
        .filter(news => news.published || news.status === 'published')
        .sort((a, b) => {
          // 1. Vedettes en premier (featured = true en tête)
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          
          // 2. Puis par date de publication décroissante
          const dateA = a.publishedAt ? new Date(a.publishedAt) : new Date(a.createdAt);
          const dateB = b.publishedAt ? new Date(b.publishedAt) : new Date(b.createdAt);
          return dateB - dateA;
        });
      
      console.log('✅ RétroActus chargés:', published.length);
      if (published.length > 0) {
        console.log('📊 Premier RétroActu COMPLET:', published[0]);
        console.log('📊 Clés disponibles:', Object.keys(published[0]));
      }
      setRetroActus(published);
      
      setStats(prev => ({
        ...prev,
        retroActus: { total: published.length, loading: false }
      }));
    } catch (error) {
      console.error('❌ Erreur chargement RétroActus:', error);
      setRetroActus([]);
      setStats(prev => ({
        ...prev,
        retroActus: { total: 0, loading: false }
      }));
    }
  }, [cache]);

  const loadDashboardData = useCallback(async () => {
    try {
      console.log('🔄 Chargement des données du dashboard...');
      
      // Charger toutes les données en parallèle avec gestion d'erreur robuste (isolée par appel)
      const results = await Promise.allSettled([
        (async () => {
          try {
            await loadVehiclesData();
            return { success: true, type: 'vehicles' };
          } catch (e) {
            console.error('❌ Erreur vehicles:', e);
            return { success: false, type: 'vehicles', error: e };
          }
        })(),
        (async () => {
          try {
            await loadEventsData();
            return { success: true, type: 'events' };
          } catch (e) {
            console.error('❌ Erreur events:', e);
            return { success: false, type: 'events', error: e };
          }
        })(),
        (async () => {
          try {
            await loadMembersData();
            return { success: true, type: 'members' };
          } catch (e) {
            console.error('❌ Erreur members:', e);
            return { success: false, type: 'members', error: e };
          }
        })(),
        (async () => {
          try {
            await loadRetroActus();
            return { success: true, type: 'retroActus' };
          } catch (e) {
            console.error('❌ Erreur retroActus:', e);
            return { success: false, type: 'retroActus', error: e };
          }
        })()
      ]);
      
      // Compter les succès
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      console.log(`📊 Chargement du dashboard: ${successCount}/4 sources réussies`);
    } catch (error) {
      console.error('❌ Erreur globale loadDashboardData:', error);
    }
  }, [cache, loadVehiclesData, loadEventsData, loadMembersData, loadRetroActus]);

  const shareRetroActu = async (actu) => {
    const subject = encodeURIComponent(`RétroActus: ${actu?.title || 'News'}`);
    const bodyText = encodeURIComponent(
      `Découvrez cette actualité de RétroBus Essonne:\n\n` +
      `${actu?.title || 'Sans titre'}\n\n` +
      `${actu?.body || actu?.content || ''}\n\n` +
      `Site: https://retrobus-essonne.fr`
    );
    window.location.href = `mailto:?subject=${subject}&body=${bodyText}`;
  };

  const shareOnWeb = async (actu) => {
    // Vérifie si l'API Web Share est disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: actu?.title || 'RétroActus',
          text: actu?.body || actu?.content || '',
          url: 'https://retrobus-essonne.fr'
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Erreur partage web:', err);
        }
      }
    } else {
      // Fallback: copier dans le presse-papiers
      const textToCopy = `${actu?.title}\n${actu?.body || actu?.content}\nhttps://retrobus-essonne.fr`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        toast({
          title: "Copié!",
          description: "L'actualité a été copiée dans le presse-papiers",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      });
    }
  };

  // === EFFECTS (après les loaders) ===
  useEffect(() => {
    setFlashes(loadFlashes());
    loadDashboardData();
    
    // Actualiser les données toutes les 30 minutes (optimisé avec cache)
    const interval = setInterval(loadDashboardData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Finaliser le loading quand toutes les données sont chargées
  useEffect(() => {
    const allLoaded = !stats.vehicles.loading && !stats.events.loading && !stats.members.loading && !stats.retroActus.loading;
    if (allLoaded && loading) {
      console.log('✅ Toutes les données du dashboard sont chargées');
      setLoading(false);
    }
  }, [stats, loading]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 17) return "Bon après-midi";
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
      <Container maxW="container.xl" h="60vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="rbe.500" thickness="4px" />
          <Heading size="2xl" color="black" textAlign="center">
            On met tout en ordre...
          </Heading>
          <Text fontSize="lg" fontStyle="italic" color="gray.600">
            Promis, c'est pas long
          </Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={isMobile ? 2 : 4} px={isMobile ? 2 : 4} fontFamily="Montserrat, sans-serif">
      {/* Annonces d'accueil - affichées en priorité en haut */}
      <HomeAnnouncements 
        announcements={announcements} 
        onRemove={removeAnnouncement}
      />

      {/* En-tête avec salutation */}
      <Box
        bg={footerBg}
        color="white"
        p={isMobile ? 4 : 6}
        borderRadius="lg"
        mb={isMobile ? 4 : 6}
        textAlign="center"
      >
        <Heading size={isMobile ? "md" : "lg"} mb={2}>
          {getGreeting()}, {user?.prenom || user?.email || 'Utilisateur'} ! 👋
        </Heading>
        <Text fontSize={isMobile ? "sm" : "base"} opacity={0.9}>
          Voici un aperçu de votre activité RétroBus Essonne
        </Text>
      </Box>

      {/* Grille principale */}
      <SimpleGrid columns={{ base: 1, lg: 4 }} spacing={isMobile ? 4 : 6}>
        {/* Contenu principal */}
        <GridItem colSpan={{ base: 1, lg: 3 }} order={{ base: 1, lg: 1 }}>
          <VStack spacing={isMobile ? 4 : 8} align="stretch">
            {/* Statistiques principales - Optimisées mobile */}
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={isMobile ? 3 : 6} w="full">
              <Card bg={cardBg} borderColor={borderColor} shadow="lg" _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }} transition="all 0.2s">
                <CardBody p={isMobile ? 4 : 5}>
                  {isMobile ? (
                    // Layout Mobile: Icône + Nombre en haut, Progress en bas
                    <VStack align="start" spacing={3}>
                      <HStack spacing={3}>
                        <Icon as={FiTruck} boxSize={6} color="blue.500" />
                        {stats.vehicles.loading ? (
                          <Spinner size="md" color="blue.500" />
                        ) : (
                          <Text fontSize="xl" fontWeight="bold" color="blue.500">
                            {stats.vehicles.total} véhicule{stats.vehicles.total !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </HStack>
                      <Progress 
                        value={stats.vehicles.total > 0 ? 100 : 0} 
                        colorScheme="blue" 
                        size="sm" 
                        w="full"
                        isIndeterminate={stats.vehicles.loading}
                      />
                    </VStack>
                  ) : (
                    // Layout PC: Label en haut, Icône + Nombre, Progress en bas
                    <Stat>
                      <StatLabel color="gray.600" fontSize="sm">Véhicules</StatLabel>
                      <StatNumber color="blue.500" fontSize="2xl">
                        <HStack>
                          <Icon as={FiTruck} />
                          {stats.vehicles.loading ? (
                            <Spinner size="sm" />
                          ) : (
                            <Text>
                              {stats.vehicles.total === 0 
                                ? 'Aucun véhicule' 
                                : `${stats.vehicles.total} véhicule${stats.vehicles.total !== 1 ? 's' : ''}`}
                            </Text>
                          )}
                        </HStack>
                      </StatNumber>
                      <Progress 
                        value={stats.vehicles.total > 0 ? 100 : 0} 
                        colorScheme="blue" 
                        size="sm" 
                        mt={2} 
                        isIndeterminate={stats.vehicles.loading}
                      />
                    </Stat>
                  )}
                </CardBody>
              </Card>

              <Card bg={cardBg} borderColor={borderColor} shadow="lg" _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }} transition="all 0.2s">
                <CardBody p={isMobile ? 4 : 5}>
                  {isMobile ? (
                    // Layout Mobile: Icône + Nombre en haut, Progress en bas
                    <VStack align="start" spacing={3}>
                      <HStack spacing={3} flexWrap="wrap">
                        <Icon as={FiCalendar} boxSize={6} color="green.500" />
                        {stats.events.loading ? (
                          <Spinner size="md" color="green.500" />
                        ) : (
                          <Text fontSize="xl" fontWeight="bold" color="green.500">
                            {stats.events.total} événement{stats.events.total !== 1 ? 's' : ''}
                          </Text>
                        )}
                        {!stats.events.loading && stats.events.published > 0 && (
                          <Badge colorScheme="green" variant="subtle" fontSize="xs" ml={-1}>
                            {stats.events.published} en cours
                          </Badge>
                        )}
                      </HStack>
                      <Progress 
                        value={stats.events.total > 0 ? 100 : 0} 
                        colorScheme="green" 
                        size="sm" 
                        w="full"
                        isIndeterminate={stats.events.loading}
                      />
                    </VStack>
                  ) : (
                    // Layout PC: Label en haut, Icône + Nombre, Progress en bas
                    <Stat>
                      <HStack spacing={2} mb={1}>
                        <StatLabel color="gray.600" fontSize="sm">Événements</StatLabel>
                        {!stats.events.loading && stats.events.published > 0 && (
                          <Badge colorScheme="green" variant="subtle" fontSize="xs">
                            {stats.events.published} en cours
                          </Badge>
                        )}
                      </HStack>
                      <StatNumber color="green.500" fontSize="2xl">
                        <HStack>
                          <Icon as={FiCalendar} />
                          {stats.events.loading ? (
                            <Spinner size="sm" />
                          ) : (
                            <Text>
                              {stats.events.total === 0 
                                ? 'Aucun événement' 
                                : `${stats.events.total} événement${stats.events.total !== 1 ? 's' : ''}`}
                            </Text>
                          )}
                        </HStack>
                      </StatNumber>
                      <Progress 
                        value={stats.events.total > 0 ? 100 : 0} 
                        colorScheme="green" 
                        size="sm" 
                        mt={2} 
                        isIndeterminate={stats.events.loading}
                      />
                    </Stat>
                  )}
                </CardBody>
              </Card>

              <Card bg={cardBg} borderColor={borderColor} shadow="lg" _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }} transition="all 0.2s">
                <CardBody p={isMobile ? 4 : 5}>
                  {isMobile ? (
                    // Layout Mobile: Icône + Nombre en haut, Progress en bas
                    <VStack align="start" spacing={3}>
                      <HStack spacing={3}>
                        <Icon as={FiUsers} boxSize={6} color="gray.700" />
                        {stats.members.loading ? (
                          <Spinner size="md" color="gray.700" />
                        ) : (
                          <Text fontSize="xl" fontWeight="bold" color="gray.900">
                            {stats.members.total} adhérent{stats.members.total !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </HStack>
                      <Progress 
                        value={stats.members.total > 0 ? (stats.members.active / stats.members.total) * 100 : 0} 
                        colorScheme="gray" 
                        size="sm" 
                        w="full"
                        isIndeterminate={stats.members.loading}
                      />
                    </VStack>
                  ) : (
                    // Layout PC: Label en haut, Icône + Nombre, Progress en bas
                    <Stat>
                      <StatLabel color="gray.600" fontSize="sm">Adhérents</StatLabel>
                      <StatNumber color="gray.900" fontSize="2xl">
                        <HStack>
                          <Icon as={FiUsers} />
                          {stats.members.loading ? (
                            <Spinner size="sm" />
                          ) : (
                            <Text>
                              {stats.members.total === 0 
                                ? 'Aucun adhérent' 
                                : `${stats.members.total} adhérent${stats.members.total !== 1 ? 's' : ''}`}
                            </Text>
                          )}
                        </HStack>
                      </StatNumber>
                      <Progress 
                        value={stats.members.total > 0 ? (stats.members.active / stats.members.total) * 100 : 0} 
                        colorScheme="gray" 
                        size="sm" 
                        mt={2} 
                        isIndeterminate={stats.members.loading}
                      />
                    </Stat>
                  )}
                </CardBody>
              </Card>
            </SimpleGrid>

            {/* Les RétroActus */}
            {retroActus.length > 0 && (
              <Card bg={cardBg} borderColor={borderColor} shadow="lg" h="auto">
                <CardHeader p={isMobile ? 4 : 6}>
                  <HStack justify="space-between" flexWrap="wrap" gap={2}>
                    <Heading size={isMobile ? "sm" : "md"} fontWeight="700">📰 Les RétroActus</Heading>
                    <HStack spacing={2}>
                      <IconButton
                        icon={<FiChevronLeft />}
                        size={isMobile ? "md" : "sm"}
                        variant="ghost"
                        onClick={() => setCurrentActuIndex((prev) => 
                          prev === 0 ? retroActus.length - 1 : prev - 1
                        )}
                        aria-label="Actu précédente"
                        isDisabled={retroActus.length <= 1}
                        minW={isMobile ? "44px" : "auto"}
                        minH={isMobile ? "44px" : "auto"}
                      />
                      <Text fontSize={isMobile ? "xs" : "xs"} color="gray.500">
                        {currentActuIndex + 1} / {retroActus.length}
                      </Text>
                      <IconButton
                        icon={<FiChevronRight />}
                        size={isMobile ? "md" : "sm"}
                        variant="ghost"
                        onClick={() => setCurrentActuIndex((prev) => 
                          (prev + 1) % retroActus.length
                        )}
                        aria-label="Actu suivante"
                        isDisabled={retroActus.length <= 1}
                        minW={isMobile ? "44px" : "auto"}
                        minH={isMobile ? "44px" : "auto"}
                      />
                    </HStack>
                  </HStack>
                </CardHeader>
                <CardBody p={isMobile ? 4 : 6} pt={0}>
                  <VStack align="start" spacing={isMobile ? 2 : 3}>
                    <Heading size={isMobile ? "sm" : "md"} color="blue.600" fontWeight="600">
                      {retroActus[currentActuIndex]?.title || 'Sans titre'}
                    </Heading>
                    {retroActus[currentActuIndex]?.publishedAt && (
                      <HStack spacing={2} color="gray.500" fontSize={isMobile ? "xs" : "sm"}>
                        <Icon as={FiCalendar} />
                        <Text>
                          {new Date(retroActus[currentActuIndex].publishedAt).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </HStack>
                    )}
                    <Box fontSize={isMobile ? "xs" : "sm"} color="gray.700" sx={{
                      '& p': { mb: 2 },
                      '& strong': { fontWeight: 'bold' },
                      '& em': { fontStyle: 'italic' },
                      '& code': { 
                        bg: 'gray.100', 
                        px: 1, 
                        py: 0.5, 
                        borderRadius: '3px',
                        fontFamily: 'monospace',
                        fontSize: '0.9em'
                      },
                      '& h1, & h2, & h3': { 
                        fontWeight: 'bold',
                        my: 2
                      },
                      '& h1': { fontSize: '1.5em' },
                      '& h2': { fontSize: '1.3em' },
                      '& h3': { fontSize: '1.1em' },
                      '& ul, & ol': { pl: 4, mb: 2 },
                      '& li': { mb: 1 },
                      '& a': { 
                        color: 'blue.600',
                        _hover: { textDecoration: 'underline' }
                      },
                      '& blockquote': {
                        borderLeft: '4px solid',
                        borderColor: 'blue.300',
                        pl: 4,
                        ml: 0,
                        color: 'gray.600'
                      }
                    }}>
                      <React.Suspense fallback={<Spinner size="sm" />}>
                        <ReactMarkdown>
                          {retroActus[currentActuIndex]?.body || retroActus[currentActuIndex]?.content || ''}
                        </ReactMarkdown>
                      </React.Suspense>
                    </Box>

                    {/* Media Gallery */}
                    {(() => {
                      try {
                        const mediaStr = retroActus[currentActuIndex]?.media;
                        if (!mediaStr) return null;
                        const mediaArray = typeof mediaStr === 'string' ? JSON.parse(mediaStr) : mediaStr;
                        if (!Array.isArray(mediaArray) || mediaArray.length === 0) return null;
                        
                        return (
                          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={2} w="100%">
                            {mediaArray.map((media, idx) => (
                              <Box key={idx}>
                                {media.type === 'image' ? (
                                  <Box
                                    position="relative"
                                    cursor="pointer"
                                    onClick={() => {
                                      setSelectedImage(media);
                                      onImageOpen();
                                    }}
                                    _hover={{ transform: 'scale(1.02)', transition: 'all 0.2s' }}
                                  >
                                    <Image
                                      src={media.url}
                                      alt={media.caption || `Media ${idx + 1}`}
                                      h={isMobile ? "100px" : "120px"}
                                      w="100%"
                                      objectFit="cover"
                                      borderRadius="md"
                                    />
                                    {media.caption && (
                                      <Text
                                        fontSize="xs"
                                        color="white"
                                        bg="blackAlpha.700"
                                        px={2}
                                        py={1}
                                        position="absolute"
                                        bottom={0}
                                        left={0}
                                        right={0}
                                        borderBottomRadius="md"
                                        noOfLines={1}
                                      >
                                        {media.caption}
                                      </Text>
                                    )}
                                  </Box>
                                ) : media.type === 'video' ? (
                                  <Box
                                    as="video"
                                    controls
                                    src={media.url}
                                    h={isMobile ? "100px" : "120px"}
                                    w="100%"
                                    borderRadius="md"
                                    bg="black"
                                    objectFit="cover"
                                  />
                                ) : media.type === 'file' ? (
                                  <Box
                                    p={3}
                                    borderWidth="1px"
                                    borderColor="gray.200"
                                    borderRadius="md"
                                    h={isMobile ? "100px" : "120px"}
                                    display="flex"
                                    flexDirection="column"
                                    justifyContent="space-between"
                                    bg="gray.50"
                                  >
                                    <HStack spacing={2} align="start">
                                      <Icon as={FiFileText} color="blue.500" boxSize={5} mt={0.5} />
                                      <Text fontSize="xs" noOfLines={2}>
                                        {media.originalName || media.filename || media.caption || 'Document'}
                                      </Text>
                                    </HStack>
                                    <Button
                                      as="a"
                                      href={media.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      size="xs"
                                      variant="outline"
                                      colorScheme="blue"
                                    >
                                      Ouvrir
                                    </Button>
                                  </Box>
                                ) : null}
                              </Box>
                            ))}
                          </SimpleGrid>
                        );
                      } catch (e) {
                        console.error('Error parsing media:', e);
                        return null;
                      }
                    })()}

                    {/* Polls Display */}
                    {(() => {
                      try {
                        const pollsStr = retroActus[currentActuIndex]?.polls;
                        console.log('📊 Dashboard - pollsStr:', pollsStr);
                        
                        if (!pollsStr) {
                          console.log('📊 No polls data found');
                          return null;
                        }
                        
                        const pollsArray = typeof pollsStr === 'string' ? JSON.parse(pollsStr) : pollsStr;
                        console.log('📊 Dashboard - pollsArray:', pollsArray);
                        
                        if (!Array.isArray(pollsArray) || pollsArray.length === 0) {
                          console.log('📊 Polls array is empty or invalid');
                          return null;
                        }
                        
                        console.log('📊 Rendering', pollsArray.length, 'polls');
                        
                        return (
                          <VStack align="stretch" spacing={3} w="100%" mt={4}>
                            {pollsArray.map((poll) => (
                              <PollDisplay
                                key={poll.id}
                                newsId={retroActus[currentActuIndex]?.id}
                                poll={poll}
                              />
                            ))}
                          </VStack>
                        );
                      } catch (e) {
                        console.error('❌ Error parsing polls:', e);
                        return null;
                      }
                    })()}

                    {retroActus[currentActuIndex]?.imageUrl && (
                      <Image
                        src={retroActus[currentActuIndex].imageUrl}
                        alt={retroActus[currentActuIndex]?.title}
                        maxH={isMobile ? "200px" : "150px"}
                        w="100%"
                        objectFit="cover"
                        borderRadius="md"
                      />
                    )}
                  </VStack>
                </CardBody>
              </Card>
            )}


          </VStack>
        </GridItem>

        {/* Sidebar */}
        <GridItem order={{ base: 2, lg: 2 }}>
          <VStack spacing={isMobile ? 4 : 6} align="stretch">
            {/* Notifications */}
            <Card bg={cardBg} borderColor={borderColor} shadow="lg">
              <CardHeader p={isMobile ? 4 : 6}>
                <HStack justify="space-between">
                  <Heading size={isMobile ? "sm" : "md"} fontWeight="700">Notifications</Heading>
                  <Badge colorScheme="rbe" variant="subtle" fontSize={isMobile ? "xs" : "sm"}>
                    {flashes.length}
                  </Badge>
                </HStack>
              </CardHeader>
              <CardBody p={isMobile ? 4 : 6}>
                <VStack spacing={isMobile ? 2 : 3} align="stretch">
                  {info.length === 0 ? (
                    <Text color="gray.500" fontSize={isMobile ? "xs" : "sm"} textAlign="center" py={isMobile ? 2 : 4}>
                      Aucune notification
                    </Text>
                  ) : (
                    info.slice(0, 5).map((flash) => (
                      <Box key={flash.id} p={isMobile ? 2 : 3} borderRadius="lg" bg="gray.50">
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={1} flex={1}>
                            <Text fontSize={isMobile ? "xs" : "sm"} fontWeight="600">
                              {flash.message}
                            </Text>
                            <Text fontSize={isMobile ? "2xs" : "xs"} color="gray.500">
                              {flash.createdAt ? new Date(flash.createdAt).toLocaleDateString('fr-FR') : ''}
                            </Text>
                          </VStack>
                          <Badge colorScheme="rbe" variant="subtle" fontSize={isMobile ? "2xs" : "xs"}>
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
              <CardHeader p={isMobile ? 4 : 6}>
                <Heading size={isMobile ? "sm" : "md"} fontWeight="700">Liens utiles</Heading>
              </CardHeader>
              <CardBody p={isMobile ? 4 : 6}>
                <VStack spacing={isMobile ? 2 : 3} align="stretch">
                  <Button
                    as={RouterLink}
                    to="/dashboard/vehicules"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiTruck />}
                    size={isMobile ? "md" : "sm"}
                    minH={isMobile ? "44px" : "auto"}
                    fontSize={isMobile ? "sm" : "md"}
                  >
                    Véhicules ({stats.vehicles.total})
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/dashboard/events-management"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiCalendar />}
                    size={isMobile ? "md" : "sm"}
                    minH={isMobile ? "44px" : "auto"}
                    fontSize={isMobile ? "sm" : "md"}
                  >
                    Événements ({stats.events.total})
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/dashboard/members-management"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiUsers />}
                    size={isMobile ? "md" : "sm"}
                    minH={isMobile ? "44px" : "auto"}
                    fontSize={isMobile ? "sm" : "md"}
                  >
                    Membres ({stats.members.total})
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/dashboard/myrbe"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiBarChart />}
                    size={isMobile ? "md" : "sm"}
                    minH={isMobile ? "44px" : "auto"}
                    fontSize={isMobile ? "sm" : "md"}
                  >
                    MyRBE
                  </Button>
                  <Button
                    as={RouterLink}
                    to="/admin"
                    variant="ghost"
                    justifyContent="flex-start"
                    leftIcon={<FiDollarSign />}
                    size={isMobile ? "md" : "sm"}
                    minH={isMobile ? "44px" : "auto"}
                    fontSize={isMobile ? "sm" : "md"}
                  >
                    Finance
                  </Button>
                </VStack>
              </CardBody>
            </Card>

          </VStack>
        </GridItem>
      </SimpleGrid>

      {/* Modal pour agrandir l'image */}
      <Modal isOpen={isImageOpen} onClose={onImageClose} size="full" isCentered>
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton
            color="white"
            bg="blackAlpha.600"
            _hover={{ bg: "blackAlpha.800" }}
            size="lg"
            zIndex={2}
          />
          <ModalBody display="flex" alignItems="center" justifyContent="center" p={4}>
            {selectedImage && (
              <VStack spacing={4} maxW="90vw" maxH="90vh">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.caption || 'Image'}
                  maxH="80vh"
                  maxW="100%"
                  objectFit="contain"
                  borderRadius="md"
                />
                {selectedImage.caption && (
                  <Text
                    color="white"
                    fontSize="md"
                    textAlign="center"
                    bg="blackAlpha.700"
                    px={4}
                    py={2}
                    borderRadius="md"
                  >
                    {selectedImage.caption}
                  </Text>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}