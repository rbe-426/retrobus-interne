/**
 * EventCreationWizard.jsx
 * Wizard pour créer/modifier un événement étape par étape
 * Avec auto-avance et système de personnalisation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  Progress,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  SimpleGrid,
  Alert,
  AlertIcon,
  Icon,
  Flex,
  useColorModeValue,
  useToast,
  Badge,
  Divider,
  IconButton,
  Checkbox
} from '@chakra-ui/react';
import {
  FiChevronRight,
  FiChevronLeft,
  FiCheck,
  FiPlus,
  FiTrash2,
  FiAlertCircle,
  FiInfo
} from 'react-icons/fi';
import VehicleSelector from './VehicleSelector';

const WIZARD_STEPS = [
  { title: 'Infos Bases', description: 'Titre, Date, Lieu' },
  { title: 'Template', description: 'Sélectionner un modèle' },
  { title: 'Inscription', description: 'Paramètres d\'accès' },
  { title: 'Personnalisation', description: 'Questions customisées' },
  { title: 'Vérification', description: 'Aperçu & Publication' }
];

const EVENT_TEMPLATES = {
  public_open_access: {
    name: "Ouvert au Public",
    color: "green",
    defaults: {
      isVisible: true,
      allowPublicRegistration: false,
      requiresRegistration: false,
      isFree: true,
      adultPrice: null,
      childPrice: null,
      maxParticipants: null,
      registrationDeadline: '',
      registrationMethod: 'none',
      status: 'PUBLISHED'
    },
    description: "Événement ouvert au public, accès libre sans inscription"
  },
  public_with_registration: {
    name: "Public avec Inscription",
    color: "blue",
    defaults: {
      isVisible: true,
      allowPublicRegistration: true,
      requiresRegistration: true,
      isFree: false,
      adultPrice: 15,
      childPrice: 8,
      maxParticipants: 100,
      registrationDeadline: '',
      registrationMethod: 'internal',
      status: 'PUBLISHED'
    },
    description: "Événement public avec inscription ouverte"
  },
  private_outing: {
    name: "Événement Privé",
    color: "yellow",
    defaults: {
      isVisible: true,
      allowPublicRegistration: false,
      requiresRegistration: false,
      isFree: true,
      adultPrice: null,
      childPrice: null,
      maxParticipants: null,
      registrationDeadline: '',
      registrationMethod: 'none',
      status: 'PUBLISHED'
    },
    description: "Sortie visible mais réservée"
  },
  members_only: {
    name: "Adhérents Seulement",
    color: "purple",
    defaults: {
      isVisible: false,
      allowPublicRegistration: false,
      requiresRegistration: true,
      isFree: true,
      adultPrice: null,
      childPrice: null,
      maxParticipants: 50,
      registrationDeadline: '',
      registrationMethod: 'internal',
      status: 'PUBLISHED'
    },
    description: "Réservé aux adhérents"
  }
};

export default function EventCreationWizard({ events = [], vehicles = [], onSave = () => {}, initialEvent = null }) {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgSection = useColorModeValue('gray.50', 'gray.900');

  // États du wizard
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    vehicleId: '',
    adultPrice: '',
    childPrice: '',
    maxParticipants: '',
    registrationDeadline: '',
    status: 'DRAFT',
    isVisible: true,
    allowPublicRegistration: false,
    requiresRegistration: false,
    isFree: true,
    registrationMethod: 'none'
  });

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customQuestions, setCustomQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({ text: '', type: 'text', required: false });
  const [saving, setSaving] = useState(false);

  // ===== VALIDATION =====
  const isStep1Complete = formData.title.trim() && formData.date && formData.location;
  const isStep2Complete = selectedTemplate;
  const isStep3Complete = true; // Always complete after template selection
  const isStep4Complete = true; // Optional customization
  const isStep5Complete = true; // Always valid for review

  const stepsComplete = [isStep1Complete, isStep2Complete, isStep3Complete, isStep4Complete, isStep5Complete];

  // ===== AUTO-AVANCE =====
  useEffect(() => {
    if (currentStep === 0 && isStep1Complete) {
      // Auto-move to step 2 after 500ms if step 1 is complete
      const timer = setTimeout(() => {
        if (currentStep === 0) {
          setCurrentStep(1);
          toast({
            status: 'info',
            title: 'Étape 1 complétée',
            duration: 1500,
            isClosable: true
          });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isStep1Complete, currentStep, toast]);

  useEffect(() => {
    if (currentStep === 1 && isStep2Complete) {
      const timer = setTimeout(() => {
        if (currentStep === 1) {
          setCurrentStep(2);
          // Apply template defaults
          applyTemplate(selectedTemplate);
          toast({
            status: 'info',
            title: 'Étape 2 complétée',
            duration: 1500,
            isClosable: true
          });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isStep2Complete, currentStep, selectedTemplate, toast]);

  // ===== HANDLERS =====
  const applyTemplate = useCallback((templateKey) => {
    if (!templateKey || !EVENT_TEMPLATES[templateKey]) return;
    
    const template = EVENT_TEMPLATES[templateKey];
    setFormData(prev => ({
      ...prev,
      ...template.defaults
    }));
  }, []);

  const handleAddQuestion = () => {
    if (!newQuestion.text.trim()) {
      toast({ status: 'warning', title: 'Question vide', duration: 2000 });
      return;
    }
    setCustomQuestions([...customQuestions, { ...newQuestion, id: Date.now() }]);
    setNewQuestion({ text: '', type: 'text', required: false });
    toast({ status: 'success', title: 'Question ajoutée', duration: 1500 });
  };

  const handleRemoveQuestion = (id) => {
    setCustomQuestions(customQuestions.filter(q => q.id !== id));
    toast({ status: 'info', title: 'Question supprimée', duration: 1000 });
  };

  const handleSave = async () => {
    if (!isStep1Complete) {
      toast({ status: 'error', title: 'Complétez les infos de base', duration: 2000 });
      return;
    }
    
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        customQuestions,
        template: selectedTemplate
      };
      await onSave(dataToSave);
      toast({ status: 'success', title: 'Événement sauvegardé!', duration: 2000 });
    } catch (error) {
      toast({ status: 'error', title: 'Erreur', description: error.message, duration: 2000 });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ===== STEP RENDERS =====
  const renderStep1 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Informations de base</Text>
          <Text fontSize="sm">Remplissez ces champs pour passer à l'étape suivante</Text>
        </Box>
      </Alert>

      <FormControl isRequired>
        <FormLabel>Titre de l'événement</FormLabel>
        <Input
          placeholder="Ex: Sortie RétroBus 2026"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          size="lg"
        />
      </FormControl>

      <HStack spacing={4}>
        <FormControl isRequired>
          <FormLabel>Date</FormLabel>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            size="lg"
          />
        </FormControl>
        <FormControl>
          <FormLabel>Heure</FormLabel>
          <Input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
            size="lg"
          />
        </FormControl>
      </HStack>

      <FormControl isRequired>
        <FormLabel>Lieu</FormLabel>
        <Input
          placeholder="Ex: Parking de la Mairie"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          size="lg"
        />
      </FormControl>

      <FormControl>
        <FormLabel>Véhicule assigné</FormLabel>
        <VehicleSelector
          vehicles={vehicles}
          value={formData.vehicleId}
          onChange={(vehicleId) => setFormData(prev => ({ ...prev, vehicleId }))}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Description</FormLabel>
        <Textarea
          placeholder="Décrivez votre événement..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={4}
        />
      </FormControl>

      <Box bg={bgSection} p={4} borderRadius="md">
        <Progress value={isStep1Complete ? 100 : 50} size="sm" colorScheme="rbe" />
        <Text mt={2} fontSize="sm" color={isStep1Complete ? 'green.600' : 'gray.500'}>
          {isStep1Complete ? '✅ Prêt pour l\'étape suivante' : '⏳ Complétez les champs obligatoires'}
        </Text>
      </Box>
    </VStack>
  );

  const renderStep2 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Sélectionnez un template</Text>
          <Text fontSize="sm">Le template définira automatiquement les paramètres d'inscription</Text>
        </Box>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {Object.entries(EVENT_TEMPLATES).map(([key, template]) => (
          <Card
            key={key}
            cursor="pointer"
            onClick={() => setSelectedTemplate(key)}
            bg={selectedTemplate === key ? `${template.color}.50` : cardBg}
            borderColor={selectedTemplate === key ? `${template.color}.500` : 'gray.200'}
            borderWidth="2px"
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            <CardBody>
              <VStack align="start" spacing={2}>
                <HStack justify="space-between" w="100%">
                  <Heading size="sm" color={`${template.color}.600`}>{template.name}</Heading>
                  {selectedTemplate === key && <Badge colorScheme={template.color}>✓</Badge>}
                </HStack>
                <Text fontSize="sm" color="gray.600">{template.description}</Text>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {selectedTemplate && (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Template appliqué</Text>
            <Text fontSize="sm">Paramètres d'inscription : {EVENT_TEMPLATES[selectedTemplate]?.name}</Text>
          </Box>
        </Alert>
      )}
    </VStack>
  );

  const renderStep3 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Paramètres d'inscription</Text>
          <Text fontSize="sm">Basés sur le template sélectionné: {EVENT_TEMPLATES[selectedTemplate]?.name}</Text>
        </Box>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel>Gratuit?</FormLabel>
          <Select
            value={formData.isFree ? 'true' : 'false'}
            onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.value === 'true' }))}
          >
            <option value="true">Gratuit</option>
            <option value="false">Payant</option>
          </Select>
        </FormControl>

        {!formData.isFree && (
          <>
            <FormControl>
              <FormLabel>Prix adulte (€)</FormLabel>
              <Input
                type="number"
                placeholder="15"
                value={formData.adultPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, adultPrice: e.target.value }))}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Prix enfant (€)</FormLabel>
              <Input
                type="number"
                placeholder="8"
                value={formData.childPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, childPrice: e.target.value }))}
              />
            </FormControl>
          </>
        )}

        <FormControl>
          <FormLabel>Max participants</FormLabel>
          <Input
            type="number"
            placeholder="100"
            value={formData.maxParticipants}
            onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Date limite d'inscription</FormLabel>
          <Input
            type="date"
            value={formData.registrationDeadline}
            onChange={(e) => setFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
          />
        </FormControl>
      </SimpleGrid>

      <Divider />

      <FormControl>
        <FormLabel>Visibilité</FormLabel>
        <Select
          value={formData.isVisible ? 'public' : 'hidden'}
          onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.value === 'public' }))}
        >
          <option value="public">Visible sur le site public</option>
          <option value="hidden">Caché du site public</option>
        </Select>
      </FormControl>
    </VStack>
  );

  const renderStep4 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Personnalisez l'événement</Text>
          <Text fontSize="sm">Ajoutez des questions supplémentaires à votre formulaire d'inscription</Text>
        </Box>
      </Alert>

      <Card bg={cardBg}>
        <CardHeader>
          <Heading size="sm">Ajouter une question</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={3} align="stretch">
            <FormControl>
              <FormLabel>Question</FormLabel>
              <Input
                placeholder="Ex: Régime alimentaire?"
                value={newQuestion.text}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
              />
            </FormControl>

            <HStack spacing={2}>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select
                  value={newQuestion.type}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="text">Texte court</option>
                  <option value="textarea">Texte long</option>
                  <option value="select">Choix unique</option>
                  <option value="checkbox">Plusieurs choix</option>
                </Select>
              </FormControl>

              <Checkbox
                isChecked={newQuestion.required}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, required: e.target.checked }))}
                mt={6}
              >
                Obligatoire
              </Checkbox>
            </HStack>

            <Button colorScheme="rbe" leftIcon={<FiPlus />} onClick={handleAddQuestion}>
              Ajouter la question
            </Button>
          </VStack>
        </CardBody>
      </Card>

      {customQuestions.length > 0 && (
        <Card bg={bgSection}>
          <CardHeader>
            <Heading size="sm">Questions ajoutées ({customQuestions.length})</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={2} align="stretch">
              {customQuestions.map((q) => (
                <HStack
                  key={q.id}
                  p={3}
                  bg={cardBg}
                  borderRadius="md"
                  justify="space-between"
                  borderLeft="4px solid"
                  borderLeftColor="rbe.500"
                >
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontWeight="bold">{q.text}</Text>
                    <HStack spacing={2}>
                      <Badge fontSize="xs">{q.type}</Badge>
                      {q.required && <Badge fontSize="xs" colorScheme="orange">Obligatoire</Badge>}
                    </HStack>
                  </VStack>
                  <IconButton
                    icon={<FiTrash2 />}
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => handleRemoveQuestion(q.id)}
                  />
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );

  const renderStep5 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Vérification avant publication</Text>
          <Text fontSize="sm">Assurez-vous que tous les détails sont corrects</Text>
        </Box>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">Infos Basiques</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2} fontSize="sm">
              <HStack><Text fontWeight="bold">Titre:</Text><Text>{formData.title}</Text></HStack>
              <HStack><Text fontWeight="bold">Date:</Text><Text>{formData.date}</Text></HStack>
              <HStack><Text fontWeight="bold">Lieu:</Text><Text>{formData.location}</Text></HStack>
              <HStack><Text fontWeight="bold">Visible:</Text><Badge>{formData.isVisible ? '✓ Public' : '✗ Caché'}</Badge></HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">Inscription</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2} fontSize="sm">
              <HStack><Text fontWeight="bold">Template:</Text><Badge>{EVENT_TEMPLATES[selectedTemplate]?.name}</Badge></HStack>
              <HStack><Text fontWeight="bold">Gratuit:</Text><Badge>{formData.isFree ? '✓ Oui' : '✗ Non'}</Badge></HStack>
              {!formData.isFree && (
                <HStack><Text fontWeight="bold">Prix:</Text><Text>${formData.adultPrice} adulte / ${formData.childPrice} enfant</Text></HStack>
              )}
              <HStack><Text fontWeight="bold">Questions custom:</Text><Badge>{customQuestions.length}</Badge></HStack>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Box bg="rbe.50" p={4} borderRadius="md" _hover={{ shadow: 'md' }} transition="all 0.2s">
        <Heading size="sm" color="rbe.600" mb={2}>Aperçu public</Heading>
        <Text fontSize="sm" color="gray.600">
          Cet événement apparaîtra {formData.isVisible ? 'sur le site public avec les paramètres du template sélectionné.' : 'uniquement pour les adhérents en accès direct.'}
        </Text>
      </Box>
    </VStack>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <Box w="100%" bg={bgSection} p={6} borderRadius="lg">
      <VStack spacing={6} align="stretch">
        {/* Stepper */}
        <Box>
          <Stepper index={currentStep} colorScheme="rbe">
            {WIZARD_STEPS.map((step, index) => (
              <Step key={index}>
                <StepIndicator>
                  <StepStatus
                    complete={<StepIcon />}
                    incomplete={<StepNumber />}
                    active={<StepNumber />}
                  />
                </StepIndicator>
                <Box flexShrink={0}>
                  <StepTitle>{step.title}</StepTitle>
                  <StepDescription>{step.description}</StepDescription>
                </Box>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Contenu de l'étape */}
        <Card bg={cardBg}>
          <CardBody>
            {stepRenderers[currentStep]()}
          </CardBody>
        </Card>

        {/* Boutons de navigation */}
        <Flex justify="space-between" align="center">
          <Button
            leftIcon={<FiChevronLeft />}
            onClick={handlePrev}
            isDisabled={currentStep === 0}
            variant="outline"
          >
            Précédent
          </Button>

          <HStack spacing={2}>
            <Badge colorScheme="gray">
              Étape {currentStep + 1} / {WIZARD_STEPS.length}
            </Badge>
            <Text fontSize="sm" color="gray.600">
              {stepsComplete[currentStep] ? '✓ Complète' : '⏳ En cours'}
            </Text>
          </HStack>

          {currentStep === WIZARD_STEPS.length - 1 ? (
            <Button
              rightIcon={<FiCheck />}
              colorScheme="rbe"
              onClick={handleSave}
              isLoading={saving}
            >
              Publier l'événement
            </Button>
          ) : (
            <Button
              rightIcon={<FiChevronRight />}
              colorScheme="rbe"
              onClick={handleNext}
              isDisabled={!stepsComplete[currentStep]}
            >
              Suivant
            </Button>
          )}
        </Flex>
      </VStack>
    </Box>
  );
}
