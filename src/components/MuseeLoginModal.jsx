import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton,
  Box,
  Divider,
  Image,
  Center
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { getStoredCSRFToken } from '../lib/csrfClient';

export default function MuseeLoginModal({ isOpen, onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez renseigner vos identifiants',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      const csrfToken = getStoredCSRFToken();
      const response = await fetch('/api/musee/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Stocker le token
        localStorage.setItem('musee_token', data.token);
        
        toast({
          title: 'Connexion réussie',
          description: 'Bienvenue au Musée',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Réinitialiser le formulaire
        setUsername('');
        setPassword('');
        
        // Appeler le callback de succès
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: 'Échec de connexion',
          description: data.error || 'Identifiants incorrects',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Erreur connexion musée:', error);
      toast({
        title: 'Erreur de connexion',
        description: 'Impossible de se connecter au serveur',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      isCentered
      closeOnOverlayClick={false}
    >
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(10px)" />
      <ModalContent
        bg="gray.900"
        borderColor="whiteAlpha.200"
        borderWidth="1px"
        maxW="md"
      >
        <ModalHeader color="white" textAlign="center" pt={6}>
          <VStack spacing={3}>
            <Center>
              <Image 
                src="/myrbe_lemusee.png" 
                alt="RBE | Le Musée" 
                height="80px"
                objectFit="contain"
              />
            </Center>
            <Text fontSize="sm" fontWeight="normal" color="whiteAlpha.700">
              Espace sécurisé - Authentification requise
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton color="whiteAlpha.700" />
        
        <ModalBody pb={6}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">
                  Nom d'utilisateur
                </FormLabel>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Votre identifiant musée"
                  bg="whiteAlpha.50"
                  color="white"
                  border="1px solid"
                  borderColor="whiteAlpha.300"
                  _hover={{ borderColor: 'whiteAlpha.400' }}
                  _focus={{
                    borderColor: 'rbe.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-rbe-500)'
                  }}
                  _placeholder={{ color: 'whiteAlpha.500' }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">
                  Mot de passe
                </FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    bg="whiteAlpha.50"
                    color="white"
                    border="1px solid"
                    borderColor="whiteAlpha.300"
                    _hover={{ borderColor: 'whiteAlpha.400' }}
                    _focus={{
                      borderColor: 'rbe.500',
                      boxShadow: '0 0 0 1px var(--chakra-colors-rbe-500)'
                    }}
                    _placeholder={{ color: 'whiteAlpha.500' }}
                  />
                  <InputRightElement>
                    <IconButton
                      variant="ghost"
                      color="whiteAlpha.700"
                      _hover={{ bg: 'whiteAlpha.100' }}
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Masquer' : 'Afficher'}
                      size="sm"
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <Divider borderColor="whiteAlpha.200" />

              <Box
                w="full"
                bg="blue.900"
                p={3}
                borderRadius="md"
                border="1px solid"
                borderColor="blue.700"
              >
                <Text fontSize="sm" color="blue.200" textAlign="center">
                  🔒 Système d'authentification sécurisé séparé
                </Text>
              </Box>

              <Button
                type="submit"
                colorScheme="rbe"
                w="full"
                size="lg"
                isLoading={isLoading}
                loadingText="Connexion..."
              >
                Se connecter au Musée
              </Button>

              <Text fontSize="xs" color="whiteAlpha.600" textAlign="center">
                Les identifiants du Musée sont différents de votre compte RBE principal
              </Text>
            </VStack>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
