/**
 * EventWizardDemoPage.jsx
 * Page de démonstration du système complet:
 * - Création avec wizard
 * - Affichage public
 * - Inscription avec questions customisées
 */

import React, { useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Badge,
  Button,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  Divider
} from '@chakra-ui/react';
import { FiArrowRight, FiEye, FiEdit } from 'react-icons/fi';
import EventCreationWizard from '../components/EventCreationWizard';
import CustomEventQuestionsForm from '../components/CustomEventQuestionsForm';

// Mock data pour démo
const DEMO_EVENT = {
  title: 'Sortie RétroBus 2026',
  date: '2026-07-15',
  time: '09:00',
  location: 'Parking de la Mairie',
  description: 'Une belle sortie en rétrobus à travers la région Essonne',
  vehicleId: 'bus-001',
  adultPrice: '15',
  childPrice: '8',
  maxParticipants: '45',
  registrationDeadline: '2026-07-10',
  status: 'DRAFT',
  isVisible: true,
  allowPublicRegistration: true,
  requiresRegistration: true,
  isFree: false,
  registrationMethod: 'internal',
  template: 'public_with_registration',
  customQuestions: [
    {
      id: 1,
      text: 'Régime alimentaire?',
      type: 'select',
      required: true,
      options: ['Normal', 'Végétarien', 'Végétalien', 'Halal', 'Casher']
    },
    {
      id: 2,
      text: 'Nombre d\'enfants accompagnants?',
      type: 'text',
      required: false,
      options: []
    },
    {
      id: 3,
      text: 'Conditions particulières ou allergies?',
      type: 'textarea',
      required: false,
      options: []
    }
  ]
};

export default function EventWizardDemoPage() {
  const tabsBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const [savedEvent, setSavedEvent] = useState(DEMO_EVENT);
  const [registrationResponses, setRegistrationResponses] = useState({});

  const handleSaveEvent = async (formData) => {
    console.log('🎉 Événement sauvegardé:', formData);
    setSavedEvent(formData);
    // Simuler l'appel API
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ id: 'evt-' + Date.now(), ...formData });
      }, 1500);
    });
  };

  return (
    <Box minH="100vh" p={6} bg={tabsBg}>
      <VStack spacing={6} maxW="7xl" mx="auto" align="stretch">
        {/* Header */}
        <VStack align="start" spacing={2}>
          <Heading size="2xl">🎪 Démo du Système Événements</Heading>
          <Text fontSize="lg" color="gray.600">
            Système complet: création avec wizard → affichage public → inscription avec questions customisées
          </Text>
        </VStack>

        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">Flux complet démontré:</Text>
            <Text>1️⃣ Créez un événement étape par étape</Text>
            <Text>2️⃣ Visualisez l'affichage public</Text>
            <Text>3️⃣ Testez le formulaire d'inscription avec questions customisées</Text>
          </VStack>
        </Alert>

        {/* Tabs */}
        <Tabs variant="soft-rounded" colorScheme="rbe">
          <TabList mb={4} bg={cardBg} p={2} borderRadius="lg">
            <Tab icon={<FiEdit />}>Créer Événement</Tab>
            <Tab icon={<FiEye />}>Aperçu Public</Tab>
            <Tab>Inscription Test</Tab>
          </TabList>

          <TabPanels>
            {/* TAB 1: Créer */}
            <TabPanel>
              <Card>
                <CardBody>
                  <EventCreationWizard
                    vehicles={[
                      { id: 'bus-001', name: 'RétroBus #1', parc: 'PARIS' },
                      { id: 'bus-002', name: 'RétroBus #2', parc: 'LYON' }
                    ]}
                    onSave={handleSaveEvent}
                  />
                </CardBody>
              </Card>
            </TabPanel>

            {/* TAB 2: Aperçu Public */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {/* Détails événement */}
                <Card bg={cardBg}>
                  <CardHeader>
                    <Heading size="md">{savedEvent.title}</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <Box>
                        <Text fontWeight="bold" color="gray.600">Date & Heure</Text>
                        <Text>{savedEvent.date} à {savedEvent.time}</Text>
                      </Box>
                      <Divider />
                      <Box>
                        <Text fontWeight="bold" color="gray.600">Lieu</Text>
                        <Text>{savedEvent.location}</Text>
                      </Box>
                      <Divider />
                      <Box>
                        <Text fontWeight="bold" color="gray.600">Description</Text>
                        <Text>{savedEvent.description}</Text>
                      </Box>
                      <Divider />
                      <HStack spacing={2}>
                        {!savedEvent.isFree && (
                          <>
                            <Badge colorScheme="green">
                              Adulte: {savedEvent.adultPrice}€
                            </Badge>
                            <Badge colorScheme="blue">
                              Enfant: {savedEvent.childPrice}€
                            </Badge>
                          </>
                        )}
                        {savedEvent.isFree && (
                          <Badge colorScheme="purple">Gratuit</Badge>
                        )}
                      </HStack>
                      <Divider />
                      <HStack spacing={2}>
                        {savedEvent.requiresRegistration && (
                          <Badge colorScheme="orange">Inscription requise</Badge>
                        )}
                        {savedEvent.isVisible && (
                          <Badge colorScheme="green">Visible publiquement</Badge>
                        )}
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Info supplémentaires */}
                <Card bg={cardBg}>
                  <CardHeader>
                    <Heading size="md">Infos Techniques</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <Box>
                        <Text fontWeight="bold" color="gray.600">Template</Text>
                        <Badge colorScheme="rbe">{savedEvent.template}</Badge>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color="gray.600">Max participants</Text>
                        <Text>{savedEvent.maxParticipants}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color="gray.600">Deadline inscription</Text>
                        <Text>{savedEvent.registrationDeadline}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color="gray.600">Méthode inscription</Text>
                        <Badge colorScheme="cyan">{savedEvent.registrationMethod}</Badge>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color="gray.600">Questions customisées</Text>
                        <Badge colorScheme="purple">
                          {savedEvent.customQuestions?.length || 0}
                        </Badge>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Questions customisées preview */}
              {savedEvent.customQuestions && savedEvent.customQuestions.length > 0 && (
                <Card mt={6} bg={cardBg}>
                  <CardHeader>
                    <Heading size="md">Questions ajoutées</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      {savedEvent.customQuestions.map((q) => (
                        <Box
                          key={q.id}
                          p={3}
                          borderLeft="4px solid"
                          borderLeftColor="rbe.500"
                          bg={useColorModeValue('gray.50', 'gray.700')}
                          borderRadius="md"
                        >
                          <HStack justify="space-between">
                            <Text fontWeight="bold">{q.text}</Text>
                            <HStack spacing={1}>
                              <Badge fontSize="xs">{q.type}</Badge>
                              {q.required && (
                                <Badge fontSize="xs" colorScheme="orange">
                                  Obligatoire
                                </Badge>
                              )}
                            </HStack>
                          </HStack>
                          {q.options && q.options.length > 0 && (
                            <Text fontSize="sm" mt={2} color="gray.600">
                              Options: {q.options.join(', ')}
                            </Text>
                          )}
                        </Box>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </TabPanel>

            {/* TAB 3: Inscription Test */}
            <TabPanel>
              <Card bg={cardBg}>
                <CardHeader>
                  <VStack align="start" spacing={1}>
                    <Heading size="md">Formulaire d'Inscription</Heading>
                    <Text fontSize="sm" color="gray.600">
                      Testez le formulaire public avec les questions customisées
                    </Text>
                  </VStack>
                </CardHeader>
                <CardBody>
                  <VStack spacing={6} align="stretch">
                    {/* Info événement */}
                    <Card bg={useColorModeValue('blue.50', 'blue.900')}>
                      <CardBody>
                        <VStack align="start" spacing={2}>
                          <Heading size="sm">{savedEvent.title}</Heading>
                          <HStack spacing={4}>
                            <Text fontSize="sm">📅 {savedEvent.date} à {savedEvent.time}</Text>
                            <Text fontSize="sm">📍 {savedEvent.location}</Text>
                            {!savedEvent.isFree && (
                              <Text fontSize="sm" fontWeight="bold" color="green.600">
                                💰 {savedEvent.adultPrice}€ adulte / {savedEvent.childPrice}€ enfant
                              </Text>
                            )}
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Questions customisées */}
                    <CustomEventQuestionsForm
                      questions={savedEvent.customQuestions || []}
                      responses={registrationResponses}
                      onChange={setRegistrationResponses}
                      isRequired={true}
                    />

                    {/* Boutons */}
                    <HStack justify="flex-end" spacing={4}>
                      <Button variant="outline">Annuler</Button>
                      <Button
                        colorScheme="rbe"
                        rightIcon={<FiArrowRight />}
                        onClick={() => {
                          console.log('✅ Réponses d\'inscription:', registrationResponses);
                          alert('✅ Inscription soumise! Voir le console pour les réponses.');
                        }}
                      >
                        S'inscrire
                      </Button>
                    </HStack>

                    {/* Affichage des réponses */}
                    {Object.keys(registrationResponses).length > 0 && (
                      <Card bg={useColorModeValue('green.50', 'green.900')}>
                        <CardHeader>
                          <Heading size="sm">Réponses saisies</Heading>
                        </CardHeader>
                        <CardBody>
                          <VStack align="start" spacing={2} fontSize="sm">
                            {Object.entries(registrationResponses).map(([questionId, answer]) => {
                              const question = savedEvent.customQuestions?.find(q => String(q.id) === String(questionId));
                              return (
                                <Box key={questionId}>
                                  <Text fontWeight="bold">{question?.text}</Text>
                                  <Text color="gray.600">
                                    → {Array.isArray(answer) ? answer.join(', ') : answer}
                                  </Text>
                                </Box>
                              );
                            })}
                          </VStack>
                        </CardBody>
                      </Card>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Info Footer */}
        <Alert status="success" borderRadius="lg">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">🎯 Fonctionnalités du système:</Text>
            <Text>✅ Wizard 5 étapes avec auto-avance</Text>
            <Text>✅ 4 templates d'événements avec paramètres préconfiguris</Text>
            <Text>✅ Personnalisation des questions d'inscription</Text>
            <Text>✅ Affichage public cohérent du template</Text>
            <Text>✅ Formulaire d'inscription avec questions customisées</Text>
            <Text>✅ Validation côté client des champs obligatoires</Text>
          </VStack>
        </Alert>
      </VStack>
    </Box>
  );
}
