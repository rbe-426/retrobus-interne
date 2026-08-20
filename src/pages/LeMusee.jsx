import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  Image,
  Center,
  useDisclosure,
  Spinner,
  Text
} from '@chakra-ui/react';
import MuseeLoginModal from '../components/MuseeLoginModal';
import { useNavigate } from 'react-router-dom';
import { getStoredCSRFToken } from '../lib/csrfClient';

export default function LeMusee() {
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
          setIsAuthenticated(true);
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

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    onClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('musee_token');
    setIsAuthenticated(false);
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
      {/* Header avec logo */}
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
          <Center>
            <Image 
              src="/myrbe_lemusee.png" 
              alt="RBE | Le Musée" 
              height="80px"
              objectFit="contain"
            />
          </Center>
        </Container>
      </Box>

      {/* Contenu principal */}
      <Container maxW="container.xl" pt="100px" pb={8}>
        {isAuthenticated ? (
          <VStack spacing={8} align="stretch">
            <Box
              bg="whiteAlpha.50"
              borderRadius="xl"
              p={8}
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <VStack spacing={4} align="start">
                <Text fontSize="3xl" fontWeight="bold" color="white">
                  Bienvenue au Musée
                </Text>
                <Text color="whiteAlpha.800" fontSize="lg">
                  Section en construction. Le contenu du musée sera disponible prochainement.
                </Text>
              </VStack>
            </Box>

            {/* Placeholder pour le futur contenu du musée */}
            <Box
              bg="whiteAlpha.50"
              borderRadius="xl"
              p={8}
              border="1px solid"
              borderColor="whiteAlpha.200"
              minH="400px"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
            >
              <VStack spacing={6}>
                <Text color="whiteAlpha.600" fontSize="6xl">
                  🏛️
                </Text>
                <Text color="whiteAlpha.600" textAlign="center" fontSize="lg">
                  Espace réservé pour les collections du musée
                </Text>
                <Box
                  as="button"
                  onClick={handleLogout}
                  px={6}
                  py={3}
                  bg="red.600"
                  color="white"
                  borderRadius="md"
                  _hover={{ bg: 'red.700' }}
                  transition="all 0.2s"
                  fontSize="sm"
                  fontWeight="medium"
                >
                  Déconnexion
                </Box>
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
