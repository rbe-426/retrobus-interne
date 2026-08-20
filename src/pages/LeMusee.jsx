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
  Flex
} from '@chakra-ui/react';
import { FiLogOut, FiCheckCircle, FiClock, FiUser } from 'react-icons/fi';
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
      {/* Header avec logo à droite et bouton déconnexion */}
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
            {/* Espace gauche */}
            <Box flex="1" />
            
            {/* Logo à droite */}
            <Flex justifyContent="flex-end" alignItems="center" gap={4}>
              <Image 
                src="/myrbe_lemusee.png" 
                alt="RBE | Le Musée" 
                height="80px"
                objectFit="contain"
              />
              {isAuthenticated && (
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
              )}
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Contenu principal */}
      <Container maxW="container.xl" pt="120px" pb={8}>
        {isAuthenticated ? (
          <VStack spacing={8} align="stretch">
            {/* En-tête avec bienvenue et check-in */}
            <Grid templateColumns={{ base: '1fr', md: '2fr 1fr' }} gap={6}>
              <GridItem>
                <Box
                  bg="whiteAlpha.50"
                  borderRadius="xl"
                  p={8}
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  h="100%"
                >
                  <VStack spacing={4} align="start" h="100%" justifyContent="center">
                    <Heading size="xl" color="white">
                      🏛️ Bienvenue au Musée
                    </Heading>
                    <Text color="whiteAlpha.800" fontSize="lg">
                      Connecté en tant que <Badge colorScheme="purple">{currentUser?.username}</Badge>
                    </Text>
                    <Text color="whiteAlpha.600">
                      Enregistrez votre présence avec le bouton Check-in →
                    </Text>
                  </VStack>
                </Box>
              </GridItem>

              <GridItem>
                <Box
                  bg="gradient.to-br"
                  bgGradient="linear(to-br, purple.600, purple.800)"
                  borderRadius="xl"
                  p={8}
                  border="1px solid"
                  borderColor="purple.500"
                  h="100%"
                  display="flex"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                >
                  <VStack spacing={4}>
                    <Text fontSize="5xl">✓</Text>
                    <Button
                      leftIcon={<FiCheckCircle />}
                      colorScheme="green"
                      size="lg"
                      onClick={handleCheckIn}
                      isLoading={loadingCheckIn}
                      loadingText="Enregistrement..."
                      w="full"
                      fontSize="xl"
                      py={7}
                    >
                      Check-in
                    </Button>
                    <Text color="whiteAlpha.800" fontSize="sm" textAlign="center">
                      Dernière visite : {checkIns[0] ? new Date(checkIns[0].timestamp).toLocaleDateString('fr-FR') : 'Jamais'}
                    </Text>
                  </VStack>
                </Box>
              </GridItem>
            </Grid>

            {/* Statistiques */}
            {stats && (
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
                <GridItem>
                  <Box
                    bg="whiteAlpha.50"
                    borderRadius="lg"
                    p={6}
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                  >
                    <VStack spacing={2}>
                      <Text color="whiteAlpha.600" fontSize="sm" textTransform="uppercase">
                        Total visites
                      </Text>
                      <Text color="white" fontSize="4xl" fontWeight="bold">
                        {stats.totalCheckIns}
                      </Text>
                    </VStack>
                  </Box>
                </GridItem>

                <GridItem>
                  <Box
                    bg="whiteAlpha.50"
                    borderRadius="lg"
                    p={6}
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                  >
                    <VStack spacing={2}>
                      <Text color="whiteAlpha.600" fontSize="sm" textTransform="uppercase">
                        Ce mois-ci
                      </Text>
                      <Text color="white" fontSize="4xl" fontWeight="bold">
                        {stats.thisMonth}
                      </Text>
                    </VStack>
                  </Box>
                </GridItem>

                <GridItem>
                  <Box
                    bg="whiteAlpha.50"
                    borderRadius="lg"
                    p={6}
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                  >
                    <VStack spacing={2}>
                      <Text color="whiteAlpha.600" fontSize="sm" textTransform="uppercase">
                        Cette semaine
                      </Text>
                      <Text color="white" fontSize="4xl" fontWeight="bold">
                        {stats.thisWeek}
                      </Text>
                    </VStack>
                  </Box>
                </GridItem>
              </Grid>
            )}

            <Divider borderColor="whiteAlpha.300" />

            {/* Historique des check-ins */}
            <Box
              bg="whiteAlpha.50"
              borderRadius="xl"
              p={8}
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <VStack spacing={6} align="stretch">
                <Heading size="md" color="white">
                  <HStack>
                    <Box as={FiClock} />
                    <Text>Historique des visites</Text>
                  </HStack>
                </Heading>

                {checkIns.length > 0 ? (
                  <Box overflowX="auto">
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Date</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Heure</Th>
                          <Th color="whiteAlpha.600" borderColor="whiteAlpha.300">Utilisateur</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {checkIns.slice(0, 10).map((checkIn, index) => {
                          const date = new Date(checkIn.timestamp);
                          return (
                            <Tr key={index}>
                              <Td color="white" borderColor="whiteAlpha.200">
                                {date.toLocaleDateString('fr-FR', { 
                                  weekday: 'short', 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </Td>
                              <Td color="white" borderColor="whiteAlpha.200">
                                {date.toLocaleTimeString('fr-FR')}
                              </Td>
                              <Td color="whiteAlpha.800" borderColor="whiteAlpha.200">
                                <Badge colorScheme="purple">{checkIn.username}</Badge>
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                ) : (
                  <Center py={8}>
                    <VStack spacing={3}>
                      <Text color="whiteAlpha.600" fontSize="5xl">📋</Text>
                      <Text color="whiteAlpha.600">Aucune visite enregistrée</Text>
                      <Text color="whiteAlpha.500" fontSize="sm">
                        Effectuez votre premier check-in pour commencer
                      </Text>
                    </VStack>
                  </Center>
                )}
              </VStack>
            </Box>
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
