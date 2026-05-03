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
import EventCreationWizard from '../components/EventCreationWizard';
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
  },
  jep_statiques: {
    name: "🏛️ JEP / Événements Statiques",
    icon: FiCalendar,
    color: "purple",
    defaults: {
      isVisible: true,
      allowPublicRegistration: true,
      requiresRegistration: true,
      isFree: true,
      adultPrice: null,
      childPrice: null,
      maxParticipants: 300,
      registrationDeadline: '',
      registrationMethod: 'internal',
      registrationType: 'jep_heritage',
      status: 'PUBLISHED'
    },
    description: "Template premium pour JEP et événements patrimoniaux avec créneaux horaires"
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
      const response = await eventsAPI.getAll();
      // Backend returns { success: true, data: events } or direct array
      const data = Array.isArray(response) ? response : (response?.data || []);
      setEvents(data);
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

  const handleCloseModal = () => {
    resetForm();
    onClose();
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
      adultPrice: event.adultPrice !== null && event.adultPrice !== undefined ? event.adultPrice.toString() : '',
      childPrice: event.childPrice !== null && event.childPrice !== undefined ? event.childPrice.toString() : '',
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
      handleCloseModal();
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

  // Callback pour le wizard
  const handleWizardSave = async (wizardData) => {
    try {
      setSaving(true);
      console.log('📝 Wizard save called with:', wizardData);
      
      const maxParticipantsNum = wizardData.maxParticipants ? parseInt(wizardData.maxParticipants) : null;
      
      const eventData = {
        title: wizardData.title.trim(),
        date: wizardData.date,
        time: wizardData.time || null,
        location: wizardData.location.trim() || null,
        description: wizardData.description.trim() || null,
        adultPrice: wizardData.isFree ? null : (wizardData.adultPrice ? parseFloat(wizardData.adultPrice) : null),
        childPrice: wizardData.isFree ? null : (wizardData.childPrice ? parseFloat(wizardData.childPrice) : null),
        vehicleId: wizardData.vehicleId || null,
        status: wizardData.status || 'PUBLISHED',
        maxParticipants: maxParticipantsNum,
        extras: JSON.stringify({
          isVisible: wizardData.isVisible,
          allowPublicRegistration: wizardData.allowPublicRegistration,
          requiresRegistration: wizardData.requiresRegistration,
          isFree: wizardData.isFree,
          maxParticipants: maxParticipantsNum,
          registrationDeadline: wizardData.registrationDeadline || null,
          registrationMethod: wizardData.registrationMethod,
          registrationType: wizardData.registrationType,
          template: wizardData.template,
          customQuestions: wizardData.customQuestions || [],
          eventType: wizardData.eventType || 'OUTING',
          pdfUrl: null
        })
      };

      console.log('🚀 Saving wizard event:', eventData);
      
      if (editingEvent) {
        // Mode édition : mettre à jour l'événement existant
        console.log('✏️ Updating existing event:', editingEvent.id);
        await eventsAPI.update(editingEvent.id, eventData);
        toast({
          status: "success",
          title: "Événement modifié",
          description: "Les modifications ont été sauvegardées"
        });
      } else {
        // Mode création : créer un nouvel événement
        console.log('➕ Creating new event');
        eventData.id = generateEventSlug(wizardData.title, wizardData.date);
        await eventsAPI.create(eventData);
        toast({
          status: "success",
          title: "Événement créé",
          description: "Le nouvel événement a été créé avec succès"
        });
      }

      fetchEvents();
      handleCloseModal();
      setSelectedTemplate('');
    } catch (e) {
      console.error('❌ handleWizardSave error:', e);
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

  const togglePublish = async (event) => {
    try {
      const newStatus = event.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      await eventsAPI.update(event.id, { status: newStatus });
      toast({
        status: "success",
        title: newStatus === 'PUBLISHED' ? "Événement publié" : "Événement dépublié"
      });
      fetchEvents();
    } catch (e) {
      console.error('Error updating event:', e);
      toast({
        status: "error",
        title: "Erreur",
        description: "Impossible de modifier l'événement"
      });
    }
  };

  const handleDelete = async (event) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${event.title}" ?`)) {
      try {
        await eventsAPI.delete(event.id);
        toast({
          status: "success",
          title: "Événement supprimé"
        });
        fetchEvents();
      } catch (e) {
        console.error('Error deleting event:', e);
        toast({
          status: "error",
          title: "Erreur",
          description: "Impossible de supprimer l'événement"
        });
      }
    }
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
                      onClick={() => togglePublish(event)}
                    >
                      {event.status === 'PUBLISHED' ? 'Dépublier' : 'Publier'}
                    </Button>
                    <Button
                      leftIcon={<FiTrash2 />}
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      onClick={() => handleDelete(event)}
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
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingEvent ? 'Modifier l\'événement' : 'Créer un nouvel événement'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <EventCreationWizard
              vehicles={vehicles}
              events={events}
              initialEvent={editingEvent}
              onSave={handleWizardSave}
            />
          </ModalBody>
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