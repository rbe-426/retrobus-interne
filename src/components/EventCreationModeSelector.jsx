/**
 * EventCreationModeSelector.jsx
 * Écran de sélection du mode de création d'événement
 * Import HelloAsso ou Création manuelle
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  Icon,
  SimpleGrid,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  Input,
  Spinner,
  useColorModeValue,
  useToast,
  Badge
} from '@chakra-ui/react';
import { FiDownload, FiEdit, FiArrowRight, FiExternalLink, FiCheck } from 'react-icons/fi';
import { importHelloAssoEvent } from '../utils/helloAssoParser';

export default function EventCreationModeSelector({ onModeSelected, onImportComplete }) {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  
  const [selectedMode, setSelectedMode] = useState(null);
  const [helloAssoTicketUrl, setHelloAssoTicketUrl] = useState('');
  const [helloAssoIntegrationUrl, setHelloAssoIntegrationUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const handleModeSelection = (mode) => {
    setSelectedMode(mode);
    
    if (mode === 'manual') {
      // Mode création manuelle : continuer vers le wizard
      onModeSelected('manual');
    }
  };

  const handleImportHelloAsso = async () => {
    const hasTicketUrl = !!helloAssoTicketUrl.trim();
    const hasIntegrationUrl = !!helloAssoIntegrationUrl.trim();

    if (!hasTicketUrl || !hasIntegrationUrl) {
      toast({
        status: 'warning',
        title: 'Champs obligatoires manquants',
        description: 'Renseignez le lien billetterie ET le lien d\'intégration HTML.',
        duration: 3000
      });
      return;
    }

    try {
      setImporting(true);
      const payload = {
        ticketUrl: helloAssoTicketUrl.trim(),
        integrationUrl: helloAssoIntegrationUrl.trim()
      };

      console.log('📥 Import HelloAsso:', {
        billetterie: helloAssoTicketUrl,
        integration: helloAssoIntegrationUrl,
        source: payload
      });

      // Importer les données HelloAsso
      const importedData = await importHelloAssoEvent(payload);
      
      console.log('✅ Données importées:', importedData);

      toast({
        status: 'success',
        title: 'Import réussi ! 🎉',
        description: `Événement "${importedData.title}" importé avec succès`,
        duration: 4000
      });

      // Transmettre les données importées au parent
      onImportComplete(importedData);
      
    } catch (error) {
      console.error('❌ Erreur import:', error);
      toast({
        status: 'error',
        title: 'Erreur d\'import',
        description: error.message,
        duration: 5000
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Titre */}
      <Box>
        <Heading size="lg" mb={2}>Comment souhaitez-vous créer l'événement ?</Heading>
        <Text color="gray.600">Choisissez la méthode la plus adaptée, puis suivez le parcours guidé.</Text>
      </Box>

      {/* Options de mode */}
      {!selectedMode && (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {/* Import HelloAsso */}
          <Card
            bg={cardBg}
            borderWidth="2px"
            borderColor="transparent"
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              borderColor: 'rbe.500',
              bg: hoverBg,
              transform: 'translateY(-4px)',
              shadow: 'lg'
            }}
            onClick={() => handleModeSelection('import')}
          >
            <CardBody>
              <VStack align="start" spacing={4}>
                <Icon as={FiDownload} boxSize={12} color="rbe.500" />
                <Box>
                  <HStack mb={2}>
                    <Heading size="md">Importer depuis HelloAsso</Heading>
                    <Badge colorScheme="green">Recommandé</Badge>
                  </HStack>
                  <Text color="gray.600" fontSize="sm">
                    Renseignez les liens HelloAsso de votre événement.
                    Les informations de base seront automatiquement récupérées.
                  </Text>
                </Box>
                <HStack color="rbe.500" fontWeight="600">
                  <Text>Importer un événement</Text>
                  <Icon as={FiArrowRight} />
                </HStack>
                <Box mt={2} p={3} bg="rbe.50" borderRadius="md" w="100%">
                  <Text fontSize="xs" color="gray.700">
                    ✨ <strong>Gain de temps :</strong> Titre, description, prix et lien de paiement récupérés automatiquement
                  </Text>
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Création manuelle */}
          <Card
            bg={cardBg}
            borderWidth="2px"
            borderColor="transparent"
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              borderColor: 'gray.400',
              bg: hoverBg,
              transform: 'translateY(-4px)',
              shadow: 'lg'
            }}
            onClick={() => handleModeSelection('manual')}
          >
            <CardBody>
              <VStack align="start" spacing={4}>
                <Icon as={FiEdit} boxSize={12} color="gray.700" />
                <Box>
                  <Heading size="md" mb={2}>Créer manuellement</Heading>
                  <Text color="gray.600" fontSize="sm">
                    Remplissez tous les champs du formulaire étape par étape.
                    Idéal pour les événements internes ou gratuits.
                  </Text>
                </Box>
                <HStack color="gray.700" fontWeight="600">
                  <Text>Créer un événement</Text>
                  <Icon as={FiArrowRight} />
                </HStack>
                <Box mt={2} p={3} bg="gray.100" borderRadius="md" w="100%">
                  <Text fontSize="xs" color="gray.700">
                    🎨 <strong>Contrôle total :</strong> Configuration complète avec templates et questions personnalisées
                  </Text>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}

      {/* Formulaire d'import HelloAsso */}
      {selectedMode === 'import' && (
        <Card bg={cardBg} borderWidth="2px" borderColor="rbe.500">
          <CardBody>
            <VStack spacing={6} align="stretch">
              <HStack>
                <Icon as={FiDownload} boxSize={6} color="rbe.500" />
                <Heading size="md">Importer un événement HelloAsso</Heading>
              </HStack>

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="600">Comment récupérer le lien HelloAsso ?</Text>
                  <Text fontSize="sm">
                    1. Allez sur votre événement HelloAsso<br />
                    2. Cliquez sur "Intégrer" ou "Widget"<br />
                    3. Copiez soit le <strong>lien direct</strong>, soit le <strong>code HTML de l'iframe</strong>
                  </Text>
                </VStack>
              </Alert>

              <FormControl>
                <FormLabel>
                  <HStack>
                    <Icon as={FiExternalLink} />
                    <Text>Lien billetterie HelloAsso *</Text>
                  </HStack>
                </FormLabel>
                <Input
                  placeholder="https://www.helloasso.com/associations/.../evenements/..."
                  value={helloAssoTicketUrl}
                  onChange={(e) => setHelloAssoTicketUrl(e.target.value)}
                  fontSize="sm"
                />
              </FormControl>

              <FormControl>
                <FormLabel>
                  <HStack>
                    <Icon as={FiExternalLink} />
                    <Text>Lien d'intégration HTML (widget) *</Text>
                  </HStack>
                </FormLabel>
                <Input
                  placeholder="https://www.helloasso.com/associations/.../evenements/.../widget"
                  value={helloAssoIntegrationUrl}
                  onChange={(e) => setHelloAssoIntegrationUrl(e.target.value)}
                  fontSize="sm"
                />
              </FormControl>

              <HStack spacing={4}>
                <Button
                  colorScheme="rbe"
                  size="lg"
                  onClick={handleImportHelloAsso}
                  isLoading={importing}
                  loadingText="Import en cours..."
                  leftIcon={<Icon as={FiCheck} />}
                  isDisabled={!helloAssoTicketUrl.trim() || !helloAssoIntegrationUrl.trim()}
                >
                  Importer l'événement
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setSelectedMode(null)}
                >
                  Annuler
                </Button>
              </HStack>

              {importing && (
                <HStack spacing={3} p={4} bg="blue.50" borderRadius="md">
                  <Spinner size="sm" color="rbe.500" />
                  <Text fontSize="sm">
                    Récupération des informations depuis HelloAsso...
                  </Text>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}
