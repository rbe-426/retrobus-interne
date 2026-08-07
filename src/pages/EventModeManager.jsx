/**
 * EventModeManager.jsx (INTERNE - Admin)
 * 
 * Interface d'administration pour configurer le mode événement du site public
 * Permet de créer, modifier et activer/désactiver un événement spécial
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Card, CardHeader, CardBody, VStack, HStack,
  FormControl, FormLabel, Input, Textarea, Switch, Button, Select,
  SimpleGrid, Text, Badge, useToast, Divider, IconButton, Alert,
  AlertIcon, AlertTitle, AlertDescription, useColorModeValue, Code,
  Tabs, TabList, TabPanels, Tab, TabPanel
} from '@chakra-ui/react';
import {
  FiCalendar, FiMapPin, FiEdit, FiSave, FiX, FiCheck,
  FiAlertCircle, FiExternalLink, FiCopy, FiRefreshCw
} from 'react-icons/fi';

// Importer les utilitaires depuis le site externe (via copie ou lien symbolique)
const EVENT_MODE_KEY = 'rbe:public-event-mode';

const EVENT_TYPES = {
  EXPO: { label: 'Exposition', color: '#D32F2F', icon: '🚌' },
  BOURSE: { label: 'Bourse d\'échange', color: '#1976D2', icon: '🔄' },
  RALLY: { label: 'Rallye', color: '#388E3C', icon: '🏁' },
  DEFILE: { label: 'Défilé', color: '#F57C00', icon: '🎭' },
  MEETING: { label: 'Rassemblement', color: '#7B1FA2', icon: '🤝' },
  CUSTOM: { label: 'Personnalisé', color: '#5E35B1', icon: '⭐' }
};

export default function EventModeManager() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    try {
      const raw = localStorage.getItem(EVENT_MODE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setConfig(parsed);
      } else {
        // Config par défaut
        setConfig(createDefaultConfig());
      }
    } catch (error) {
      console.error('Erreur chargement config:', error);
      setConfig(createDefaultConfig());
    } finally {
      setLoading(false);
    }
  };

  const createDefaultConfig = () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      active: false,
      startDate: tomorrow.toISOString().slice(0, 16),
      endDate: nextWeek.toISOString().slice(0, 16),
      event: {
        id: '',
        name: 'Événement RétroBus Essonne',
        subtitle: '',
        description: '',
        location: '',
        type: 'EXPO',
        bannerImage: '',
        heroImage: '',
        color: '#D32F2F',
        secondaryColor: '#FFA000',
        logo: ''
      },
      registration: {
        enabled: true,
        eventId: '',
        buttonText: 'S\'inscrire à l\'événement',
        requireAuth: false,
        isPaid: false,
        price: 0,
        currency: 'EUR'
      },
      customContent: {
        showCountdown: true,
        showProgramSchedule: false,
        schedule: [],
        highlights: [
          { icon: '🚌', title: 'Exposition', description: 'Découvrez nos véhicules' },
          { icon: '📸', title: 'Photos', description: 'Séances photo' },
          { icon: '👨‍🔧', title: 'Ateliers', description: 'Visite des ateliers' },
          { icon: '🎪', title: 'Animations', description: 'Pour tous' }
        ],
        partners: [],
        practicalInfo: ''
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
  };

  const handleSave = () => {
    try {
      setSaving(true);

      const configToSave = {
        ...config,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(EVENT_MODE_KEY, JSON.stringify(configToSave));

      // Broadcast pour que le site externe se mette à jour
      window.dispatchEvent(new CustomEvent('eventModeChanged', { detail: configToSave }));

      toast({
        title: '✅ Configuration sauvegardée',
        description: 'Le mode événement a été mis à jour',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      setConfig(configToSave);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible de sauvegarder la configuration',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser la configuration ?')) {
      const defaultConfig = createDefaultConfig();
      setConfig(defaultConfig);
      toast({
        title: 'Configuration réinitialisée',
        status: 'info',
        duration: 2000
      });
    }
  };

  const copyConfigToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    toast({
      title: 'Copié !',
      description: 'Configuration copiée dans le presse-papier',
      status: 'success',
      duration: 2000
    });
  };

  const updateEventField = (field, value) => {
    setConfig(prev => ({
      ...prev,
      event: {
        ...prev.event,
        [field]: value
      }
    }));
  };

  const updateRegistrationField = (field, value) => {
    setConfig(prev => ({
      ...prev,
      registration: {
        ...prev.registration,
        [field]: value
      }
    }));
  };

  const updateCustomContentField = (field, value) => {
    setConfig(prev => ({
      ...prev,
      customContent: {
        ...prev.customContent,
        [field]: value
      }
    }));
  };

  if (loading || !config) {
    return <Box>Chargement...</Box>;
  }

  const isCurrentlyActive = () => {
    if (!config.active) return false;
    const now = new Date();
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    return now >= start && now <= end;
  };

  const eventType = EVENT_TYPES[config.event.type] || EVENT_TYPES.CUSTOM;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="flex-start">
          <VStack align="flex-start" spacing={1}>
            <Heading size="lg">🎪 Gestion du Mode Événement</Heading>
            <Text color="gray.600">
              Configure l'affichage événementiel du site public
            </Text>
          </VStack>

          <HStack>
            <Button
              leftIcon={<FiRefreshCw />}
              variant="outline"
              onClick={handleReset}
              size="sm"
            >
              Réinitialiser
            </Button>
            <Button
              leftIcon={<FiCopy />}
              variant="outline"
              onClick={copyConfigToClipboard}
              size="sm"
            >
              Copier JSON
            </Button>
            <Button
              leftIcon={<FiSave />}
              colorScheme="green"
              onClick={handleSave}
              isLoading={saving}
            >
              Enregistrer
            </Button>
          </HStack>
        </HStack>

        {/* Statut */}
        <Alert
          status={config.active && isCurrentlyActive() ? 'success' : config.active ? 'warning' : 'info'}
          variant="left-accent"
        >
          <AlertIcon />
          <VStack align="flex-start" spacing={0}>
            <AlertTitle>
              {config.active && isCurrentlyActive() 
                ? '✅ Mode événement ACTIF'
                : config.active
                  ? '⏳ Mode événement configuré (hors période)'
                  : 'ℹ️ Mode événement désactivé'
              }
            </AlertTitle>
            <AlertDescription>
              {config.active && isCurrentlyActive() 
                ? 'Le site public affiche actuellement le mode événement'
                : config.active
                  ? `Sera actif du ${new Date(config.startDate).toLocaleString('fr-FR')} au ${new Date(config.endDate).toLocaleString('fr-FR')}`
                  : 'Le site public affiche le layout normal'
              }
            </AlertDescription>
          </VStack>
        </Alert>

        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>🎯 Configuration générale</Tab>
            <Tab>📝 Détails événement</Tab>
            <Tab>📋 Inscription</Tab>
            <Tab>✨ Contenu personnalisé</Tab>
          </TabList>

          <TabPanels>
            {/* Tab 1: Configuration générale */}
            <TabPanel>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={6} align="stretch">
                    <FormControl>
                      <HStack justify="space-between">
                        <FormLabel mb={0}>Activer le mode événement</FormLabel>
                        <Switch
                          size="lg"
                          colorScheme="green"
                          isChecked={config.active}
                          onChange={(e) => setConfig({ ...config, active: e.target.checked })}
                        />
                      </HStack>
                      <Text fontSize="sm" color="gray.600" mt={1}>
                        Quand actif, le site public affiche le layout événementiel pendant la période définie
                      </Text>
                    </FormControl>

                    <Divider />

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Date de début</FormLabel>
                        <Input
                          type="datetime-local"
                          value={config.startDate.slice(0, 16)}
                          onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Date de fin</FormLabel>
                        <Input
                          type="datetime-local"
                          value={config.endDate.slice(0, 16)}
                          onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                        />
                      </FormControl>
                    </SimpleGrid>

                    <FormControl>
                      <FormLabel>Type d'événement</FormLabel>
                      <Select
                        value={config.event.type}
                        onChange={(e) => updateEventField('type', e.target.value)}
                      >
                        {Object.entries(EVENT_TYPES).map(([key, type]) => (
                          <option key={key} value={key}>
                            {type.icon} {type.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Couleur principale</FormLabel>
                        <HStack>
                          <Input
                            type="color"
                            value={config.event.color}
                            onChange={(e) => updateEventField('color', e.target.value)}
                            w="60px"
                          />
                          <Input
                            value={config.event.color}
                            onChange={(e) => updateEventField('color', e.target.value)}
                          />
                        </HStack>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Couleur secondaire</FormLabel>
                        <HStack>
                          <Input
                            type="color"
                            value={config.event.secondaryColor}
                            onChange={(e) => updateEventField('secondaryColor', e.target.value)}
                            w="60px"
                          />
                          <Input
                            value={config.event.secondaryColor}
                            onChange={(e) => updateEventField('secondaryColor', e.target.value)}
                          />
                        </HStack>
                      </FormControl>
                    </SimpleGrid>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Tab 2: Détails événement */}
            <TabPanel>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <FormControl isRequired>
                      <FormLabel>Nom de l'événement</FormLabel>
                      <Input
                        value={config.event.name}
                        onChange={(e) => updateEventField('name', e.target.value)}
                        placeholder="Journées Européennes du Patrimoine"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Sous-titre</FormLabel>
                      <Input
                        value={config.event.subtitle}
                        onChange={(e) => updateEventField('subtitle', e.target.value)}
                        placeholder="Découvrez nos véhicules historiques"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Description</FormLabel>
                      <Textarea
                        value={config.event.description}
                        onChange={(e) => updateEventField('description', e.target.value)}
                        placeholder="Description complète de l'événement..."
                        rows={4}
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Lieu</FormLabel>
                      <Input
                        value={config.event.location}
                        onChange={(e) => updateEventField('location', e.target.value)}
                        placeholder="Dépôt RBE, Corbeil-Essonnes"
                      />
                    </FormControl>

                    <Divider />

                    <FormControl>
                      <FormLabel>URL Image Hero (page d'accueil)</FormLabel>
                      <Input
                        value={config.event.heroImage}
                        onChange={(e) => updateEventField('heroImage', e.target.value)}
                        placeholder="/assets/photos/event-hero.jpg"
                      />
                      <Text fontSize="xs" color="gray.600" mt={1}>
                        Image principale affichée sur la page d'accueil événement
                      </Text>
                    </FormControl>

                    <FormControl>
                      <FormLabel>URL Logo événement (optionnel)</FormLabel>
                      <Input
                        value={config.event.logo}
                        onChange={(e) => updateEventField('logo', e.target.value)}
                        placeholder="/assets/logo-event.svg"
                      />
                      <Text fontSize="xs" color="gray.600" mt={1}>
                        Logo spécifique pour l'événement (remplace le logo RBE)
                      </Text>
                    </FormControl>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Tab 3: Inscription */}
            <TabPanel>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <HStack justify="space-between">
                        <FormLabel mb={0}>Activer l'inscription</FormLabel>
                        <Switch
                          isChecked={config.registration.enabled}
                          onChange={(e) => updateRegistrationField('enabled', e.target.checked)}
                        />
                      </HStack>
                    </FormControl>

                    {config.registration.enabled && (
                      <>
                        <FormControl>
                          <FormLabel>ID de l'événement (BD)</FormLabel>
                          <Input
                            value={config.registration.eventId}
                            onChange={(e) => updateRegistrationField('eventId', e.target.value)}
                            placeholder="event-jep-2026"
                          />
                          <Text fontSize="xs" color="gray.600" mt={1}>
                            ID de l'événement dans la base de données (pour lier les inscriptions)
                          </Text>
                        </FormControl>

                        <FormControl>
                          <FormLabel>Texte du bouton</FormLabel>
                          <Input
                            value={config.registration.buttonText}
                            onChange={(e) => updateRegistrationField('buttonText', e.target.value)}
                            placeholder="S'inscrire gratuitement"
                          />
                        </FormControl>

                        <FormControl>
                          <HStack justify="space-between">
                            <FormLabel mb={0}>Inscription payante</FormLabel>
                            <Switch
                              isChecked={config.registration.isPaid}
                              onChange={(e) => updateRegistrationField('isPaid', e.target.checked)}
                            />
                          </HStack>
                        </FormControl>

                        {config.registration.isPaid && (
                          <SimpleGrid columns={2} spacing={4}>
                            <FormControl>
                              <FormLabel>Prix</FormLabel>
                              <Input
                                type="number"
                                value={config.registration.price}
                                onChange={(e) => updateRegistrationField('price', parseFloat(e.target.value))}
                              />
                            </FormControl>

                            <FormControl>
                              <FormLabel>Devise</FormLabel>
                              <Select
                                value={config.registration.currency}
                                onChange={(e) => updateRegistrationField('currency', e.target.value)}
                              >
                                <option value="EUR">EUR (€)</option>
                                <option value="USD">USD ($)</option>
                              </Select>
                            </FormControl>
                          </SimpleGrid>
                        )}
                      </>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Tab 4: Contenu personnalisé */}
            <TabPanel>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <HStack justify="space-between">
                        <FormLabel mb={0}>Afficher le compte à rebours</FormLabel>
                        <Switch
                          isChecked={config.customContent.showCountdown}
                          onChange={(e) => updateCustomContentField('showCountdown', e.target.checked)}
                        />
                      </HStack>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Informations pratiques (HTML)</FormLabel>
                      <Textarea
                        value={config.customContent.practicalInfo}
                        onChange={(e) => updateCustomContentField('practicalInfo', e.target.value)}
                        placeholder="<ul><li>Entrée gratuite</li><li>Parking disponible</li></ul>"
                        rows={6}
                        fontFamily="monospace"
                        fontSize="sm"
                      />
                      <Text fontSize="xs" color="gray.600" mt={1}>
                        HTML simple accepté (ul, li, strong, etc.)
                      </Text>
                    </FormControl>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Preview link */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <HStack justify="space-between">
              <VStack align="flex-start" spacing={0}>
                <Text fontWeight="semibold">Prévisualiser sur le site public</Text>
                <Text fontSize="sm" color="gray.600">
                  Ouvrez le site externe pour voir le mode événement en action
                </Text>
              </VStack>
              <Button
                as="a"
                href="http://localhost:5173"
                target="_blank"
                leftIcon={<FiExternalLink />}
                colorScheme="blue"
                variant="outline"
              >
                Ouvrir le site
              </Button>
            </HStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}
