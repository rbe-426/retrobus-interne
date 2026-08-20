import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Image,
  Center,
  useDisclosure,
  Spinner,
  Text,
  Button,
  Grid,
  GridItem,
  Heading,
  Badge,
  Divider,
  useToast,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Card,
  CardHeader,
  CardBody,
  Input,
  Select,
  Textarea,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { 
  FiLogOut, 
  FiCheckCircle, 
  FiClock, 
  FiUser, 
  FiPackage, 
  FiLayers, 
  FiUsers, 
  FiCalendar,
  FiShoppingBag,
  FiTrendingUp,
  FiMapPin,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiAlertCircle,
  FiCheck
} from 'react-icons/fi';
import MuseeLoginModal from '../components/MuseeLoginModal';
import { useNavigate } from 'react-router-dom';
import { getStoredCSRFToken } from '../lib/csrfClient';

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
  const [activeModule, setActiveModule] = useState('dashboard'); // dashboard, stock, facing, floor, staff, planning

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('musee_token');
        if (!token) {
          setIsLoading(false);
          onOpen();
          return;
        }

        // Vérifier la validité du token
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        const data = await response.json();
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

  if (isLoading) {
    return (
      <Box 
        minH="100vh" 
        bg="black" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="rbe.500" thickness="4px" />
          <Text color="white">Chargement du Musée...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="black" position="relative">
      {/* Header avec logo à gauche et bouton déconnexion */}
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={1000}
        bg="rgba(0, 0, 0, 0.95)"
        borderBottom="1px solid"
        borderColor="whiteAlpha.200"
        backdropFilter="blur(10px)"
      >
        <Container maxW="container.xl" py={4}>
          <Flex justifyContent="space-between" alignItems="center">
            {/* Logo à gauche */}
            <Image 
              src="/myrbe_lemusee.png" 
              alt="RBE | Le Musée" 
              height="80px"
              objectFit="contain"
            />
            
            {/* Bouton déconnexion à droite */}
            {isAuthenticated && (
              <HStack spacing={3}>
                <Text color="whiteAlpha.700" fontSize="sm">
                  {currentUser?.username}
                </Text>
                <IconButton
                  icon={<FiLogOut />}
                  onClick={handleLogout}
                  colorScheme="red"
                  variant="ghost"
                  aria-label="Déconnexion"
                  size="lg"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.200' }}
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
            {/* Menu de navigation des modules */}
            <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap={4}>
              <Button
                leftIcon={<FiTrendingUp />}
                onClick={() => setActiveModule('dashboard')}
                colorScheme={activeModule === 'dashboard' ? 'purple' : 'gray'}
                variant={activeModule === 'dashboard' ? 'solid' : 'outline'}
                size="lg"
                color={activeModule === 'dashboard' ? 'white' : 'whiteAlpha.800'}
                borderColor="whiteAlpha.300"
                _hover={{ borderColor: 'purple.400' }}
              >
                Dashboard
              </Button>
              
              <Button
                leftIcon={<FiPackage />}
                onClick={() => setActiveModule('stock')}
                colorScheme={activeModule === 'stock' ? 'purple' : 'gray'}
                variant={activeModule === 'stock' ? 'solid' : 'outline'}
                size="lg"
                color={activeModule === 'stock' ? 'white' : 'whiteAlpha.800'}
                borderColor="whiteAlpha.300"
                _hover={{ borderColor: 'purple.400' }}
              >
                Stock
              </Button>
              
              <Button
                leftIcon={<FiShoppingBag />}
                onClick={() => setActiveModule('facing')}
                colorScheme={activeModule === 'facing' ? 'purple' : 'gray'}
                variant={activeModule === 'facing' ? 'solid' : 'outline'}
                size="lg"
                color={activeModule === 'facing' ? 'white' : 'whiteAlpha.800'}
                borderColor="whiteAlpha.300"
                _hover={{ borderColor: 'purple.400' }}
              >
                Facing
              </Button>
              
              <Button
                leftIcon={<FiMapPin />}
                onClick={() => setActiveModule('floor')}
                colorScheme={activeModule === 'floor' ? 'purple' : 'gray'}
                variant={activeModule === 'floor' ? 'solid' : 'outline'}
                size="lg"
                color={activeModule === 'floor' ? 'white' : 'whiteAlpha.800'}
                borderColor="whiteAlpha.300"
                _hover={{ borderColor: 'purple.400' }}
              >
                Floor
              </Button>
              
              <Button
                leftIcon={<FiUsers />}
                onClick={() => setActiveModule('staff')}
                colorScheme={activeModule === 'staff' ? 'purple' : 'gray'}
                variant={activeModule === 'staff' ? 'solid' : 'outline'}
                size="lg"
                color={activeModule === 'staff' ? 'white' : 'whiteAlpha.800'}
                borderColor="whiteAlpha.300"
                _hover={{ borderColor: 'purple.400' }}
              >
                Staff
              </Button>
              
              <Button
                leftIcon={<FiCalendar />}
                onClick={() => setActiveModule('planning')}
                colorScheme={activeModule === 'planning' ? 'purple' : 'gray'}
                variant={activeModule === 'planning' ? 'solid' : 'outline'}
                size="lg"
                color={activeModule === 'planning' ? 'white' : 'whiteAlpha.800'}
                borderColor="whiteAlpha.300"
                _hover={{ borderColor: 'purple.400' }}
              >
                Planning
              </Button>
            </SimpleGrid>

            <Divider borderColor="whiteAlpha.300" />

            {/* MODULE: Dashboard */}
            {activeModule === 'dashboard' && (
              <VStack spacing={6} align="stretch">
                {/* Check-in rapide + Stats */}
                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
                  <GridItem>
                    <Card bg="whiteAlpha.50" borderColor="whiteAlpha.200" borderWidth="1px">
                      <CardHeader>
                        <Heading size="md" color="white">
                          <HStack>
                            <FiCheckCircle />
                            <Text>Check-in rapide</Text>
                          </HStack>
                        </Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4}>
                          <Button
                            colorScheme="green"
                            size="lg"
                            w="full"
                            onClick={handleCheckIn}
                            isLoading={loadingCheckIn}
                            leftIcon={<FiCheckCircle />}
                          >
                            Enregistrer ma présence
                          </Button>
                          <Text color="whiteAlpha.600" fontSize="sm">
                            Dernière visite : {checkIns[0] ? new Date(checkIns[0].timestamp).toLocaleDateString('fr-FR') : 'Jamais'}
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  </GridItem>

                  <GridItem>
                    <Card bg="whiteAlpha.50" borderColor="whiteAlpha.200" borderWidth="1px">
                      <CardHeader>
                        <Heading size="md" color="white">
                          <HStack>
                            <FiClock />
                            <Text>Statistiques</Text>
                          </HStack>
                        </Heading>
                      </CardHeader>
                      <CardBody>
                        {stats && (
                          <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                            <Stat>
                              <StatLabel color="whiteAlpha.600" fontSize="xs">Total</StatLabel>
                              <StatNumber color="white">{stats.totalCheckIns}</StatNumber>
                            </Stat>
                            <Stat>
                              <StatLabel color="whiteAlpha.600" fontSize="xs">Ce mois</StatLabel>
                              <StatNumber color="white">{stats.thisMonth}</StatNumber>
                            </Stat>
                            <Stat>
                              <StatLabel color="whiteAlpha.600" fontSize="xs">Semaine</StatLabel>
                              <StatNumber color="white">{stats.thisWeek}</StatNumber>
                            </Stat>
                          </Grid>
                        )}
                      </CardBody>
                    </Card>
                  </GridItem>
                </Grid>

                {/* Vue d'ensemble des modules */}
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                  <Card bg="whiteAlpha.50" borderColor="whiteAlpha.200" borderWidth="1px" cursor="pointer" onClick={() => setActiveModule('stock')} _hover={{ borderColor: 'purple.400', transform: 'translateY(-2px)' }} transition="all 0.2s">
                    <CardBody>
                      <VStack spacing={3}>
                        <Box fontSize="4xl"><FiPackage /></Box>
                        <Heading size="md" color="white">Gestion Stock</Heading>
                        <Text color="whiteAlpha.600" textAlign="center" fontSize="sm">
                          Inventaire, entrées/sorties, alertes de stock
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card bg="whiteAlpha.50" borderColor="whiteAlpha.200" borderWidth="1px" cursor="pointer" onClick={() => setActiveModule('facing')} _hover={{ borderColor: 'purple.400', transform: 'translateY(-2px)' }} transition="all 0.2s">
                    <CardBody>
                      <VStack spacing={3}>
                        <Box fontSize="4xl"><FiShoppingBag /></Box>
                        <Heading size="md" color="white">Gestion Facing</Heading>
                        <Text color="whiteAlpha.600" textAlign="center" fontSize="sm">
                          Merchandising, disposition, rotations
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card bg="whiteAlpha.50" borderColor="whiteAlpha.200" borderWidth="1px" cursor="pointer" onClick={() => setActiveModule('floor')} _hover={{ borderColor: 'purple.400', transform: 'translateY(-2px)' }} transition="all 0.2s">
                    <CardBody>
                      <VStack spacing={3}>
                        <Box fontSize="4xl"><FiMapPin /></Box>
                        <Heading size="md" color="white">Floor Management</Heading>
                        <Text color="whiteAlpha.600" textAlign="center" fontSize="sm">
                          Salles, étages, zones d'exposition
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card bg="whiteAlpha.50" borderColor="whiteAlpha.200" borderWidth="1px" cursor="pointer" onClick={() => setActiveModule('staff')} _hover={{ borderColor: 'purple.400', transform: 'translateY(-2px)' }} transition="all 0.2s">
                    <CardBody>
                      <VStack spacing={3}>
                        <Box fontSize="4xl"><FiUsers /></Box>
                        <Heading size="md" color="white">Main d'œuvre</Heading>
                        <Text color="whiteAlpha.600" textAlign="center" fontSize="sm">
                          Personnel, compétences, disponibilités
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card bg="whiteAlpha.50" borderColor="whiteAlpha.200" borderWidth="1px" cursor="pointer" onClick={() => setActiveModule('planning')} _hover={{ borderColor: 'purple.400', transform: 'translateY(-2px)' }} transition="all 0.2s">
                    <CardBody>
                      <VStack spacing={3}>
                        <Box fontSize="4xl"><FiCalendar /></Box>
                        <Heading size="md" color="white">Plannings</Heading>
                        <Text color="whiteAlpha.600" textAlign="center" fontSize="sm">
                          Affectations, horaires, rotations
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </VStack>
            )}

            {/* MODULE: Stock */}
            {activeModule === 'stock' && (
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
                  <Heading size="lg" color="white">
                    <HStack>
                      <FiPackage />
                      <Text>Gestion du Stock</Text>
                    </HStack>
                  </Heading>
                  <Text color="whiteAlpha.700">
                    Module de gestion d'inventaire : suivi des pièces, entrées/sorties, alertes de stock bas, historique des mouvements.
                  </Text>
                  <Divider borderColor="whiteAlpha.300" />
                  <Text color="whiteAlpha.500" fontStyle="italic">
                    🚧 En cours de développement - Fonctionnalités à venir : catalogage des pièces, scan codes-barres, rapports d'inventaire
                  </Text>
                </VStack>
              </Box>
            )}

            {/* MODULE: Facing */}
            {activeModule === 'facing' && (
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
                  <Heading size="lg" color="white">
                    <HStack>
                      <FiShoppingBag />
                      <Text>Gestion du Facing</Text>
                    </HStack>
                  </Heading>
                  <Text color="whiteAlpha.700">
                    Optimisation du merchandising : disposition des pièces, rotations d'exposition, mise en valeur des collections.
                  </Text>
                  <Divider borderColor="whiteAlpha.300" />
                  <Text color="whiteAlpha.500" fontStyle="italic">
                    🚧 En cours de développement - Fonctionnalités à venir : plans de facing, recommandations automatiques, analytics de visibilité
                  </Text>
                </VStack>
              </Box>
            )}

            {/* MODULE: Floor */}
            {activeModule === 'floor' && (
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
                  <Heading size="lg" color="white">
                    <HStack>
                      <FiMapPin />
                      <Text>Floor Management</Text>
                    </HStack>
                  </Heading>
                  <Text color="whiteAlpha.700">
                    Gestion des espaces : salles d'exposition, étages, zones thématiques, plans interactifs.
                  </Text>
                  <Divider borderColor="whiteAlpha.300" />
                  <Text color="whiteAlpha.500" fontStyle="italic">
                    🚧 En cours de développement - Fonctionnalités à venir : cartes interactives, affectation des pièces aux zones, statistiques de fréquentation
                  </Text>
                </VStack>
              </Box>
            )}

            {/* MODULE: Staff */}
            {activeModule === 'staff' && (
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
                  <Heading size="lg" color="white">
                    <HStack>
                      <FiUsers />
                      <Text>Gestion de la Main d'œuvre</Text>
                    </HStack>
                  </Heading>
                  <Text color="whiteAlpha.700">
                    Personnel du musée : guides, conservateurs, agents de sécurité, compétences, certifications, disponibilités.
                  </Text>
                  <Divider borderColor="whiteAlpha.300" />
                  <Text color="whiteAlpha.500" fontStyle="italic">
                    🚧 En cours de développement - Fonctionnalités à venir : fiches personnel, gestion des compétences, historique des affectations
                  </Text>
                </VStack>
              </Box>
            )}

            {/* MODULE: Planning */}
            {activeModule === 'planning' && (
              <Box bg="whiteAlpha.50" borderRadius="xl" p={8} border="1px solid" borderColor="whiteAlpha.200">
                <VStack spacing={6} align="stretch">
                  <Heading size="lg" color="white">
                    <HStack>
                      <FiCalendar />
                      <Text>Plannings & Affectations</Text>
                    </HStack>
                  </Heading>
                  <Text color="whiteAlpha.700">
                    Organisation temporelle : plannings des équipes, affectations par zone, rotations, gestion des absences.
                  </Text>
                  <Divider borderColor="whiteAlpha.300" />
                  <Text color="whiteAlpha.500" fontStyle="italic">
                    🚧 En cours de développement - Fonctionnalités à venir : calendrier interactif, génération automatique, gestion des conflits
                  </Text>
                </VStack>
              </Box>
            )}
          </VStack>
        ) : (
          <Center minH="60vh">
            <VStack spacing={4}>
              <Text color="whiteAlpha.600" fontSize="6xl">
                🔒
              </Text>
              <Text color="whiteAlpha.600" fontSize="xl">
                Authentification requise
              </Text>
              <Text color="whiteAlpha.500">
                Veuillez vous connecter pour accéder au Musée
              </Text>
            </VStack>
          </Center>
        )}
      </Container>

      {/* Modal de connexion */}
      <MuseeLoginModal
        isOpen={isOpen}
        onClose={() => navigate('/dashboard/home')}
        onSuccess={handleLoginSuccess}
      />
    </Box>
  );
}
