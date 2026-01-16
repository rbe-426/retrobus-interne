import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Button,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Text,
  Badge,
  Flex,
  Spinner,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Switch,
  Alert,
  AlertIcon,
  Divider,
  useToast,
  useDisclosure,
  Icon
} from '@chakra-ui/react';
import { FiPlus, FiEdit, FiList, FiGrid, FiCalendar, FiMapPin, FiDollarSign, FiUsers, FiEye, FiTrash2, FiGlobe, FiEyeOff, FiLock, FiTruck, FiDownload } from 'react-icons/fi';
import VehicleSelector from '../components/VehicleSelector';
import { eventsAPI, vehiculesAPI } from '../api';
import { formatDateFrLong, formatDateTimeFullFr } from '../utils/dateFormat.js';

// Templates d'événements prédéfinis
const EVENT_TEMPLATES = {
  public_open_access: {
    name: "Ouvert au Public",
    icon: FiGlobe,
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
    icon: FiUsers,
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
    description: "Événement public avec inscription ouverte directement au public"
  },
  private_outing: {
    name: "Évènement Privé",
    icon: FiEyeOff,
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
    description: "Sortie visible publiquement mais réservée (pas d'inscription possible)"
  },
  public_contact_required: {
    name: "Inscription via HelloAsso",
    icon: FiUsers,
    color: "blue",
    defaults: {
      isVisible: true,
      allowPublicRegistration: true,
      requiresRegistration: true,
      isFree: false,
      adultPrice: 12,
      childPrice: 6,
      maxParticipants: null,
      registrationDeadline: '',
      registrationMethod: 'helloasso',
      status: 'PUBLISHED'
    },
    description: "Événement avec inscription payante via HelloAsso"
  },
  members_only: {
    name: "Adhérents Seulement",
    icon: FiLock,
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
    description: "Réservé aux adhérents, non visible sur le site public"
  },
  private_internal: {
    name: "Événement Interne",
    icon: FiLock,
    color: "red",
    defaults: {
      isVisible: false,
      allowPublicRegistration: false,
      requiresRegistration: false,
      isFree: true,
      adultPrice: null,
      childPrice: null,
      maxParticipants: null,
      registrationDeadline: '',
      registrationMethod: 'none',
      status: 'DRAFT'
    },
    description: "Événement interne, complètement privé"
  },
  public_pdf_form: {
    name: "Formulaire PDF Public",
    icon: FiDownload,
    color: "teal",
    defaults: {
      isVisible: true,
      allowPublicRegistration: true,
      requiresRegistration: true,
      isFree: false,
      adultPrice: 12,
      childPrice: 6,
      maxParticipants: null,
      registrationDeadline: '',
      registrationMethod: 'pdf',
      status: 'PUBLISHED'
    },
    description: "Événement public avec formulaire PDF à télécharger"
  },
  parade_classic_vehicles: {
    name: "🚗 Défilé Anciennes",
    icon: FiTruck,
    color: "red",
    defaults: {
      isVisible: true,
      allowPublicRegistration: true,
      requiresRegistration: true,
      isFree: true,
      adultPrice: null,
      childPrice: null,
      maxParticipants: null,
      registrationDeadline: '',
      registrationMethod: 'internal',
      status: 'PUBLISHED',
      registrationType: 'parade_vehicles'
    },
    description: "Défilé de véhicules anciens - Inscription avec nom, véhicule et club"
  }
};

export default function EventsCreation() {
  const [events, setEvents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateCustomizations, setTemplateCustomizations] = useState({
    registrationQuestions: [],
    registrationConditions: {},
    advancedSettings: {}
  });
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isHelloAssoOpen, onOpen: onHelloAssoOpen, onClose: onHelloAssoClose } = useDisclosure();
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    adultPrice: '',
    childPrice: '',
    helloAssoUrl: '',
    vehicleId: '',
    status: 'DRAFT',
    isVisible: true,
    allowPublicRegistration: false,
    requiresRegistration: false,
    isFree: true,
    maxParticipants: '',
    registrationDeadline: '',
    registrationMethod: 'none',
    pdfUrl: '',
    eventType: 'public_info_only'
  });

  const toast = useToast();

  // Récupération des données
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await eventsAPI.getAll();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast({
        status: "error",
        title: "Erreur de chargement",
        description: "Impossible de charger les événements"
      });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchVehicles = useCallback(async () => {
    try {
      const data = await vehiculesAPI.getAll();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setVehicles([]);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchVehicles();
  }, [fetchEvents, fetchVehicles]);

  // Gestion du formulaire
  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      time: '',
      location: '',
      description: '',
      adultPrice: '',
      childPrice: '',
      helloAssoUrl: '',
      vehicleId: '',
      status: 'DRAFT',
      isVisible: true,
      allowPublicRegistration: false,
      requiresRegistration: false,
      isFree: true,
      maxParticipants: '',
      registrationDeadline: '',
      registrationMethod: 'none',
      pdfUrl: '',
      eventType: 'public_info_only'
    });
    setSelectedTemplate('');
    setTemplateCustomizations({
      registrationQuestions: [],
      registrationConditions: {},
      advancedSettings: {}
    });
    setEditingEvent(null);
  };

  const applyTemplate = (templateKey) => {
    const template = EVENT_TEMPLATES[templateKey];
    if (!template) return;

    setFormData(prev => ({
      ...prev,
      ...template.defaults,
      eventType: templateKey
    }));
    
    setSelectedTemplate(templateKey);
    
    toast({
      status: "info",
      title: "Template appliqué",
      description: template.description
    });
  };

  const generateEventSlug = (title, date) => {
    // Créer un slug unique à partir du titre et de la date
    const titleSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
    
    const dateSlug = date.replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    
    return `${titleSlug}-${dateSlug}-${randomSuffix}`;
  };

  const handleCreate = () => {
    setEditingEvent(null);
    resetForm();
    onOpen();
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    
    // Parser les extras pour récupérer la configuration
    let extras = {};
    try {
      extras = event.extras ? JSON.parse(event.extras) : {};
    } catch (e) {
      console.log('Impossible de parser extras:', e);
    }

    setFormData({
      title: event.title || '',
      date: event.date ? event.date.split('T')[0] : '',
      time: event.time || '',
      location: event.location || '',
      description: event.description || '',
      adultPrice: event.adultPrice ? event.adultPrice.toString() : '',
      childPrice: event.childPrice ? event.childPrice.toString() : '',
      helloAssoUrl: event.helloAssoUrl || '',
      vehicleId: event.vehicleId || '',
      status: event.status || 'DRAFT',
      isVisible: extras.isVisible !== undefined ? extras.isVisible : true,
      allowPublicRegistration: extras.allowPublicRegistration || false,
      requiresRegistration: extras.requiresRegistration || false,
      isFree: extras.isFree !== undefined ? extras.isFree : true,
      maxParticipants: extras.maxParticipants ? extras.maxParticipants.toString() : '',
      registrationDeadline: extras.registrationDeadline || '',
      registrationMethod: extras.registrationMethod || 'none',
      pdfUrl: extras.pdfUrl || '',
      eventType: extras.eventType || 'public_info_only'
    });
    
    setSelectedTemplate(extras.eventType || '');
    
    // Restaurer les customizations du template s'ils existent
    if (extras.templateCustomizations) {
      setTemplateCustomizations(extras.templateCustomizations);
    } else {
      setTemplateCustomizations({
        registrationQuestions: [],
        registrationConditions: {},
        advancedSettings: {}
      });
    }
    
    onOpen();
  };

  const handleSave = async () => {
    console.log('🔵 handleSave called');
    if (!formData.title.trim() || !formData.date) {
      console.log('❌ Validation failed: title or date missing');
      toast({
        status: "error",
        title: "Champs requis",
        description: "Le titre et la date sont obligatoires"
      });
      return;
    }

    try {
      setSaving(true);
      console.log('📝 Preparing event data...');
      
      const maxParticipantsNum = formData.maxParticipants ? parseInt(formData.maxParticipants) : null;
      
      const eventData = {
        title: formData.title.trim(),
        date: formData.date,
        time: formData.time || null,
        location: formData.location.trim() || null,
        description: formData.description.trim() || null,
        adultPrice: formData.adultPrice ? parseFloat(formData.adultPrice) : null,
        childPrice: formData.childPrice ? parseFloat(formData.childPrice) : null,
        helloAssoUrl: formData.helloAssoUrl.trim() || null,
        vehicleId: formData.vehicleId || null,
        status: formData.status,
        maxParticipants: maxParticipantsNum,
        extras: JSON.stringify({
          isVisible: formData.isVisible,
          allowPublicRegistration: formData.allowPublicRegistration,
          requiresRegistration: formData.requiresRegistration,
          isFree: formData.isFree,
          maxParticipants: maxParticipantsNum,
          registrationDeadline: formData.registrationDeadline || null,
          registrationMethod: formData.registrationMethod,
          pdfUrl: formData.pdfUrl || null,
          eventType: formData.eventType,
          templateCustomizations: templateCustomizations
        })
      };

      if (editingEvent) {
        console.log('✏️ Updating existing event:', editingEvent.id);
        await eventsAPI.update(editingEvent.id, eventData);
        toast({
          status: "success",
          title: "Événement modifié",
          description: "Les modifications ont été sauvegardées"
        });
      } else {
        console.log('➕ Creating new event');
        eventData.id = generateEventSlug(formData.title, formData.date);
        console.log('🆔 Generated ID:', eventData.id);
        console.log('🚀 Saving event data:', eventData);
        
        await eventsAPI.create(eventData);
        toast({
          status: "success",
          title: "Événement créé",
          description: "Le nouvel événement a été créé avec succès"
        });
      }

      fetchEvents();
      onClose();
      resetForm();
      setSelectedTemplate('');
    } catch (e) {
      console.error('❌ handleSave error:', e);
      console.error('Error stack:', e.stack);
      toast({
        status: "error",
        title: "Erreur de sauvegarde",
        description: e.message || "Impossible de sauvegarder l'événement"
      });
    } finally {
      setSaving(false);
    }
  };

  // Fonctions utilitaires pour l'affichage
  const getStatusBadge = (status) => {
    const configs = {
      DRAFT: { colorScheme: "gray", label: "Brouillon" },
      PUBLISHED: { colorScheme: "green", label: "Publié" },
      ARCHIVED: { colorScheme: "orange", label: "Archivé" }
    };
    const config = configs[status] || configs.DRAFT;
    return <Badge colorScheme={config.colorScheme}>{config.label}</Badge>;
  };

  const getEventTypeBadge = (event) => {
    const extras = typeof event.extras === 'string' ? JSON.parse(event.extras || '{}') : event.extras || {};
    const template = EVENT_TEMPLATES[extras.eventType];
    if (!template) return null;
    return <Badge colorScheme={template.color} variant="outline">{template.name}</Badge>;
  };

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(v => v.parc === vehicleId);
    return vehicle ? `${vehicle.parc} - ${vehicle.modele}` : 'Aucun véhicule';
  };

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading>📝 Création des Événements</Heading>
          <Text fontSize="sm" color="gray.600">
            Créez et configurez de nouveaux événements pour l'association
          </Text>
        </VStack>
        <HStack spacing={3}>
          <Button
            leftIcon={viewMode === 'cards' ? <FiList /> : <FiGrid />}
            size="sm"
            variant="outline"
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
          >
            {viewMode === 'cards' ? 'Vue tableau' : 'Vue cartes'}
          </Button>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="rbe"
            onClick={handleCreate}
          >
            Nouvel événement
          </Button>
        </HStack>
      </Flex>

      {loading ? (
        <Center py={20}>
          <Spinner size="xl" />
        </Center>
      ) : events.length === 0 ? (
        <Center py={20}>
          <VStack spacing={4}>
            <Text color="gray.500" fontSize="lg">Aucun événement trouvé</Text>
            <Button leftIcon={<FiPlus />} colorScheme="rbe" onClick={handleCreate}>
              Créer le premier événement
            </Button>
          </VStack>
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {events.map((event) => (
            <Card key={event.id} shadow="md" position="relative">
              <CardHeader pb={2}>
                <VStack align="start" spacing={2}>
                  <HStack justify="space-between" w="100%">
                    <Heading size="md" noOfLines={2} flex={1}>{event.title}</Heading>
                  </HStack>
                  <HStack spacing={2} wrap="wrap">
                    {getStatusBadge(event.status)}
                    {getEventTypeBadge(event)}
                  </HStack>
                </VStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="start" spacing={2}>
                  <HStack>
                    <FiCalendar />
                    <Text fontSize="sm">
                      {event.date} {event.time && `à ${event.time}`}
                    </Text>
                  </HStack>
                  
                  {event.location && (
                    <HStack>
                      <FiMapPin />
                      <Text fontSize="sm">{event.location}</Text>
                    </HStack>
                  )}

                  {event.vehicleId && (
                    <Text fontSize="sm">🚌 {getVehicleName(event.vehicleId)}</Text>
                  )}
                  
                  {event.description && (
                    <Text fontSize="sm" color="gray.600" noOfLines={3}>
                      {event.description}
                    </Text>
                  )}
                  
                  {(event.adultPrice || event.childPrice) && (
                    <HStack spacing={4}>
                      {event.adultPrice && (
                        <Text fontSize="sm" fontWeight="bold" color="green.600">
                          Adulte: {event.adultPrice}€
                        </Text>
                      )}
                      {event.childPrice && (
                        <Text fontSize="sm" fontWeight="bold" color="green.600">
                          Enfant: {event.childPrice}€
                        </Text>
                      )}
                    </HStack>
                  )}
                  
                  <HStack spacing={2} pt={4} w="100%" wrap="wrap">
                    <Button
                      leftIcon={<FiEdit />}
                      size="sm"
                      onClick={() => handleEdit(event)}
                    >
                      Modifier
                    </Button>
                    <Button
                      leftIcon={<FiEye />}
                      size="sm"
                      colorScheme={event.status === 'PUBLISHED' ? 'red' : 'green'}
                      onClick={() => {
                        // TODO: Implémenter togglePublish
                      }}
                    >
                      {event.status === 'PUBLISHED' ? 'Dépublier' : 'Publier'}
                    </Button>
                    <Button
                      leftIcon={<FiTrash2 />}
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      onClick={() => {
                        // TODO: Implémenter delete
                      }}
                    >
                      Supprimer
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Modal de création/modification */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingEvent ? 'Modifier l\'événement' : 'Créer un nouvel événement'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs>
              <TabList>
                <Tab>Informations de base</Tab>
                <Tab>Templates</Tab>
                <Tab>Inscription & Prix</Tab>
                <Tab>Informations supplémentaires</Tab>
              </TabList>

              <TabPanels>
                {/* Onglet 1: Informations de base */}
                <TabPanel>
                  <VStack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Titre</FormLabel>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Nom de l'événement"
                      />
                    </FormControl>

                    <HStack w="100%" spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Date</FormLabel>
                        <Input
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Heure</FormLabel>
                        <Input
                          type="time"
                          value={formData.time}
                          onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                        />
                      </FormControl>
                    </HStack>

                    <FormControl>
                      <FormLabel>Lieu</FormLabel>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Lieu de l'événement"
                      />
                    </FormControl>

                    {/* Sélecteur de véhicule */}
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
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description de l'événement"
                        rows={4}
                      />
                    </FormControl>
                  </VStack>
                </TabPanel>

                {/* Onglet 2: Templates */}
                <TabPanel>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Text fontWeight="bold" mb={4}>Sélectionnez un template pour configurer automatiquement les paramètres d'inscription :</Text>
                    </Box>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {Object.entries(EVENT_TEMPLATES).map(([key, template]) => (
                        <Card
                          key={key}
                          cursor="pointer"
                          onClick={() => applyTemplate(key)}
                          bg={selectedTemplate === key ? `${template.color}.50` : "white"}
                          borderColor={selectedTemplate === key ? `${template.color}.200` : "gray.200"}
                          borderWidth="2px"
                          _hover={{ borderColor: `${template.color}.300` }}
                        >
                          <CardBody>
                            <VStack align="start" spacing={2}>
                              <HStack>
                                <Icon as={template.icon} color={`${template.color}.500`} />
                                <Text fontWeight="bold" color={`${template.color}.700`}>
                                  {template.name}
                                </Text>
                              </HStack>
                              <Text fontSize="sm" color="gray.600">
                                {template.description}
                              </Text>
                              {selectedTemplate === key && (
                                <Badge colorScheme={template.color}>Sélectionné</Badge>
                              )}
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
                          <Text fontSize="sm" color="gray.700">
                            Les paramètres d'inscription ont été configurés selon le template "{EVENT_TEMPLATES[selectedTemplate]?.name}". 
                            Vous pouvez personnaliser davantage dans l'onglet "Informations supplémentaires".
                          </Text>
                        </Box>
                      </Alert>
                    )}

                    <FormControl>
                      <FormLabel>Statut</FormLabel>
                      <Select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="DRAFT">Brouillon</option>
                        <option value="PUBLISHED">Publié</option>
                        <option value="ARCHIVED">Archivé</option>
                      </Select>
                    </FormControl>

                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">
                        Visible sur le site public
                      </FormLabel>
                      <Switch
                        isChecked={formData.isVisible}
                        onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
                      />
                    </FormControl>

                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">
                        Inscription requise
                      </FormLabel>
                      <Switch
                        isChecked={formData.requiresRegistration}
                        onChange={(e) => setFormData(prev => ({ ...prev, requiresRegistration: e.target.checked, allowPublicRegistration: e.target.checked }))}
                      />
                    </FormControl>
                  </VStack>
                </TabPanel>

                {/* Onglet 3: Inscription & Prix */}
                <TabPanel>
                  <VStack spacing={4}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">
                        Événement gratuit
                      </FormLabel>
                      <Switch
                        isChecked={formData.isFree}
                        onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                      />
                    </FormControl>

                    {!formData.isFree && (
                      <HStack w="100%" spacing={4}>
                        <FormControl>
                          <FormLabel>Prix adulte (€)</FormLabel>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.adultPrice}
                            onChange={(e) => setFormData(prev => ({ ...prev, adultPrice: e.target.value }))}
                            placeholder="0.00"
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Prix enfant (€)</FormLabel>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.childPrice}
                            onChange={(e) => setFormData(prev => ({ ...prev, childPrice: e.target.value }))}
                            placeholder="0.00"
                          />
                        </FormControl>
                      </HStack>
                    )}

                    <FormControl>
                      <FormLabel>Nombre maximum de participants</FormLabel>
                      <Input
                        type="number"
                        value={formData.maxParticipants}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
                        placeholder="Illimité"
                      />
                    </FormControl>

                    {formData.requiresRegistration && (
                      <>
                        <FormControl display="flex" alignItems="center">
                          <FormLabel mb="0">
                            Inscription via HelloAsso
                          </FormLabel>
                          <Switch
                            isChecked={formData.registrationMethod === 'helloasso'}
                            onChange={(e) => setFormData(prev => ({ ...prev, registrationMethod: e.target.checked ? 'helloasso' : 'internal' }))}
                          />
                        </FormControl>

                        {formData.registrationMethod === 'helloasso' && (
                          <>
                            <FormControl isRequired>
                              <FormLabel>URL HelloAsso</FormLabel>
                              <Input
                                value={formData.helloAssoUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, helloAssoUrl: e.target.value }))}
                                placeholder="https://www.helloasso.com/..."
                              />
                            </FormControl>
                            {formData.helloAssoUrl && formData.title && formData.date && (
                              <Button
                                colorScheme="rbe"
                                size="sm"
                                onClick={() => {
                                  setSelectedEventForModal({
                                    title: formData.title,
                                    date: formData.date,
                                    time: formData.time,
                                    location: formData.location,
                                    adultPrice: formData.adultPrice,
                                    childPrice: formData.childPrice,
                                    helloAssoUrl: formData.helloAssoUrl
                                  });
                                  onHelloAssoOpen();
                                }}
                              >
                                👁️ Aperçu modale HelloAsso
                              </Button>
                            )}
                          </>
                        )}

                        {formData.registrationMethod !== 'helloasso' && (
                          <Alert status="info" borderRadius="md">
                            <AlertIcon />
                            Inscription via le système interne
                          </Alert>
                        )}
                      </>
                    )}
                  </VStack>
                </TabPanel>

                {/* Onglet 4: Informations supplémentaires */}
                <TabPanel>
                  <VStack spacing={6} align="stretch">
                    {!selectedTemplate ? (
                      <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        <Box>
                          <Text fontWeight="bold">Template requis</Text>
                          <Text fontSize="sm">Veuillez sélectionner un template dans l'onglet "Templates" pour accéder aux options de personnalisation.</Text>
                        </Box>
                      </Alert>
                    ) : (
                      <>
                        <Box bg="rbe.50" p={4} borderRadius="md" borderLeft="4px solid" borderLeftColor="rbe.400">
                          <VStack align="start" spacing={2}>
                            <Text fontWeight="bold" fontSize="sm">Template actif : {EVENT_TEMPLATES[selectedTemplate]?.name}</Text>
                            <Text fontSize="xs" color="gray.700">
                              Personnalisez les modalités d'inscription en profondeur pour ce template. Les modifications seront appliquées à cet événement uniquement.
                            </Text>
                          </VStack>
                        </Box>

                        <Divider />

                        {/* Section: Questions personnalisées d'inscription */}
                        <Box>
                          <Heading size="sm" mb={3}>📝 Questions d'inscription personnalisées</Heading>
                          <VStack spacing={3} align="stretch">
                            <Text fontSize="sm" color="gray.600">
                              Ajoutez des questions supplémentaires pour les participants (ex: régime alimentaire, niveau d'expérience, etc.)
                            </Text>
                            
                            <Button
                              size="sm"
                              colorScheme="rbe"
                              variant="outline"
                              onClick={() => {
                                setTemplateCustomizations(prev => ({
                                  ...prev,
                                  registrationQuestions: [
                                    ...prev.registrationQuestions,
                                    { id: Date.now(), title: '', type: 'text', required: false }
                                  ]
                                }));
                              }}
                            >
                              + Ajouter une question
                            </Button>

                            {templateCustomizations.registrationQuestions.map((q, idx) => (
                              <Card key={q.id} p={3} bg="gray.50">
                                <VStack spacing={2} align="stretch">
                                  <HStack spacing={2}>
                                    <FormControl flex={1}>
                                      <FormLabel fontSize="sm">Question</FormLabel>
                                      <Input
                                        size="sm"
                                        placeholder="Ex: Régime alimentaire?"
                                        value={q.title}
                                        onChange={(e) => {
                                          const newQuestions = [...templateCustomizations.registrationQuestions];
                                          newQuestions[idx].title = e.target.value;
                                          setTemplateCustomizations(prev => ({ ...prev, registrationQuestions: newQuestions }));
                                        }}
                                      />
                                    </FormControl>
                                    <FormControl w="150px">
                                      <FormLabel fontSize="sm">Type</FormLabel>
                                      <Select
                                        size="sm"
                                        value={q.type}
                                        onChange={(e) => {
                                          const newQuestions = [...templateCustomizations.registrationQuestions];
                                          newQuestions[idx].type = e.target.value;
                                          setTemplateCustomizations(prev => ({ ...prev, registrationQuestions: newQuestions }));
                                        }}
                                      >
                                        <option value="text">Texte court</option>
                                        <option value="textarea">Texte long</option>
                                        <option value="select">Sélection</option>
                                        <option value="checkbox">Case à cocher</option>
                                      </Select>
                                    </FormControl>
                                    <Button
                                      size="sm"
                                      colorScheme="red"
                                      variant="ghost"
                                      onClick={() => {
                                        setTemplateCustomizations(prev => ({
                                          ...prev,
                                          registrationQuestions: prev.registrationQuestions.filter((_q, i) => i !== idx)
                                        }));
                                      }}
                                      mt={5}
                                    >
                                      ✕
                                    </Button>
                                  </HStack>
                                  <FormControl display="flex" alignItems="center">
                                    <FormLabel mb="0" fontSize="sm">Obligatoire</FormLabel>
                                    <Switch
                                      isChecked={q.required}
                                      onChange={(e) => {
                                        const newQuestions = [...templateCustomizations.registrationQuestions];
                                        newQuestions[idx].required = e.target.checked;
                                        setTemplateCustomizations(prev => ({ ...prev, registrationQuestions: newQuestions }));
                                      }}
                                    />
                                  </FormControl>
                                </VStack>
                              </Card>
                            ))}
                          </VStack>
                        </Box>

                        <Divider />

                        {/* Section: Conditions et modalités */}
                        <Box>
                          <Heading size="sm" mb={3}>⚙️ Conditions d'inscription</Heading>
                          <VStack spacing={3} align="stretch">
                            <FormControl display="flex" alignItems="center">
                              <FormLabel mb="0">
                                Inscription uniquement sur rassemblement statique
                              </FormLabel>
                              <Switch
                                isChecked={templateCustomizations.registrationConditions?.onlyStaticGathering || false}
                                onChange={(e) => {
                                  setTemplateCustomizations(prev => ({
                                    ...prev,
                                    registrationConditions: {
                                      ...prev.registrationConditions,
                                      onlyStaticGathering: e.target.checked
                                    }
                                  }));
                                }}
                              />
                            </FormControl>

                            {templateCustomizations.registrationConditions?.onlyStaticGathering && (
                              <Alert status="info" borderRadius="md" fontSize="sm">
                                <AlertIcon />
                                En cas de rassemblement statique, les participants verront des questions spécifiques adaptées à ce mode de fonctionnement.
                              </Alert>
                            )}

                            <FormControl display="flex" alignItems="center">
                              <FormLabel mb="0">
                                Vérification d'adhésion requise
                              </FormLabel>
                              <Switch
                                isChecked={templateCustomizations.registrationConditions?.requiresMembership || false}
                                onChange={(e) => {
                                  setTemplateCustomizations(prev => ({
                                    ...prev,
                                    registrationConditions: {
                                      ...prev.registrationConditions,
                                      requiresMembership: e.target.checked
                                    }
                                  }));
                                }}
                              />
                            </FormControl>

                            <FormControl>
                              <FormLabel fontSize="sm">Message personnalisé aux participants</FormLabel>
                              <Textarea
                                placeholder="Message qui s'affichera lors de l'inscription (ex: instructions spéciales, conditions, etc.)"
                                size="sm"
                                value={templateCustomizations.registrationConditions?.customMessage || ''}
                                onChange={(e) => {
                                  setTemplateCustomizations(prev => ({
                                    ...prev,
                                    registrationConditions: {
                                      ...prev.registrationConditions,
                                      customMessage: e.target.value
                                    }
                                  }));
                                }}
                              />
                            </FormControl>
                          </VStack>
                        </Box>

                        <Divider />

                        {/* Section: Paramètres avancés */}
                        <Box>
                          <Heading size="sm" mb={3}>🔧 Paramètres avancés</Heading>
                          <VStack spacing={3} align="stretch">
                            <FormControl>
                              <FormLabel fontSize="sm">Délai limite d'inscription (avant l'événement)</FormLabel>
                              <Select
                                value={templateCustomizations.advancedSettings?.registrationDeadline || '0'}
                                onChange={(e) => {
                                  setTemplateCustomizations(prev => ({
                                    ...prev,
                                    advancedSettings: {
                                      ...prev.advancedSettings,
                                      registrationDeadline: e.target.value
                                    }
                                  }));
                                }}
                              >
                                <option value="0">Pas de limite</option>
                                <option value="1">1 jour avant</option>
                                <option value="3">3 jours avant</option>
                                <option value="7">1 semaine avant</option>
                                <option value="14">2 semaines avant</option>
                              </Select>
                            </FormControl>

                            <FormControl display="flex" alignItems="center">
                              <FormLabel mb="0">
                                Confirmations d'inscription par email
                              </FormLabel>
                              <Switch
                                isChecked={templateCustomizations.advancedSettings?.emailConfirmations !== false}
                                onChange={(e) => {
                                  setTemplateCustomizations(prev => ({
                                    ...prev,
                                    advancedSettings: {
                                      ...prev.advancedSettings,
                                      emailConfirmations: e.target.checked
                                    }
                                  }));
                                }}
                              />
                            </FormControl>

                            <FormControl display="flex" alignItems="center">
                              <FormLabel mb="0">
                                Annulations autorisées par les participants
                              </FormLabel>
                              <Switch
                                isChecked={templateCustomizations.advancedSettings?.allowCancellations !== false}
                                onChange={(e) => {
                                  setTemplateCustomizations(prev => ({
                                    ...prev,
                                    advancedSettings: {
                                      ...prev.advancedSettings,
                                      allowCancellations: e.target.checked
                                    }
                                  }));
                                }}
                              />
                            </FormControl>
                          </VStack>
                        </Box>

                        <Alert status="success" borderRadius="md" fontSize="sm">
                          <AlertIcon />
                          Toutes les modifications effectuées ici seront sauvegardées avec l'événement.
                        </Alert>
                      </>
                    )}
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { onClose(); resetForm(); }}>
              Annuler
            </Button>
            <Button colorScheme="rbe" onClick={handleSave} isLoading={saving}>
              {editingEvent ? 'Modifier' : 'Créer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modale HelloAsso pour preview/test */}
      <Modal isOpen={isHelloAssoOpen} onClose={onHelloAssoClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack align="start" spacing={1}>
              <Heading size="md">{selectedEventForModal?.title}</Heading>
              <Text fontSize="sm" color="gray.600">
                Inscription et paiement via HelloAsso
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={4}>
              {/* Infos de l'événement */}
              <Box bg="gray.50" p={4} borderRadius="md">
                <VStack align="start" spacing={3}>
                  {selectedEventForModal?.date && (
                    <HStack>
                      <Text fontWeight="600">{formatDateFrLong(selectedEventForModal.date)}</Text>
                      {selectedEventForModal.time && <Text>{selectedEventForModal.time}</Text>}
                    </HStack>
                  )}
                  {selectedEventForModal?.location && (
                    <Text>{selectedEventForModal.location}</Text>
                  )}
                  {selectedEventForModal?.adultPrice && (
                    <VStack align="start" spacing={1} w="100%">
                      <Text fontSize="sm" fontWeight="bold" color="gray.700">Tarifs :</Text>
                      <HStack spacing={6} wrap="wrap">
                        {selectedEventForModal?.adultPrice && (
                          <Text fontSize="sm" color="var(--rbe-red)" fontWeight="bold">
                            Adulte : {selectedEventForModal.adultPrice}€
                          </Text>
                        )}
                        {selectedEventForModal?.childPrice && (
                          <Text fontSize="sm" color="var(--rbe-red)" fontWeight="bold">
                            Enfant : {selectedEventForModal.childPrice}€
                          </Text>
                        )}
                      </HStack>
                    </VStack>
                  )}
                </VStack>
              </Box>

              <Divider />

              {/* Intégration HelloAsso */}
              <Box w="100%">
                <Text fontSize="sm" mb={3} color="gray.600">
                  Cliquez sur le bouton ci-dessous pour procéder à l'inscription et au paiement sécurisé.
                </Text>
                {selectedEventForModal?.helloAssoUrl ? (
                  <Button
                    as="a"
                    href={selectedEventForModal.helloAssoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    colorScheme="rbe"
                    size="lg"
                    w="100%"
                    leftIcon={<FiUsers />}
                  >
                    S'inscrire maintenant sur HelloAsso
                  </Button>
                ) : (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    Aucune URL HelloAsso configurée pour cet événement
                  </Alert>
                )}
              </Box>

              {/* Note sur la sécurité */}
              <Box bg="rbe.50" p={3} borderRadius="md" w="100%" borderLeft="4px solid" borderLeftColor="rbe.400">
                <Text fontSize="xs" color="rbe.800">
                  ℹ️ La plateforme HelloAsso est sécurisée et certifiée. Vos données de paiement ne sont jamais conservées par nos serveurs.
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onHelloAssoClose}>
              Fermer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};