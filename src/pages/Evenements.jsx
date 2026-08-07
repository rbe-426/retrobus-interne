import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, SimpleGrid, Card, CardHeader, CardBody,
  Text, Badge, HStack, Spinner, Center, Button, Flex, useToast,
  VStack, useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, FormControl, FormLabel,
  Input, Textarea, Select, ModalFooter, Table, Thead, Tbody, Tr, Th, Td,
  Tabs, TabList, TabPanels, Tab, TabPanel, Alert, AlertIcon,
  Switch, Divider, ButtonGroup, Icon, Tooltip, RadioGroup, Radio, Stack
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { 
  FiEdit, FiPlus, FiEye, FiTrash2, FiCalendar, FiGrid, FiList, 
  FiUsers, FiLock, FiGlobe, FiDollarSign, FiGift, FiClock, FiMapPin,
  FiDownload, FiExternalLink, FiEyeOff, FiTruck
} from 'react-icons/fi';
import { eventsAPI, vehiculesAPI } from '../api/index.js';
import { formatDateFrLong, formatDateTimeFullFr } from '../utils/dateFormat.js';

// Templates d'événements prédéfinis (corrigés)
const EVENT_TEMPLATES = {
  public_open_access: {
    name: "Ouvert au Public",
    icon: FiGlobe,
    color: "green",
    defaults: {
      isVisible: true,
      allowPublicRegistration: false,
      requiresRegistration: false,  // ← PAS d'inscription requise
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
      allowPublicRegistration: true,   // ← Le public PEUT s'inscrire
      requiresRegistration: true,      // ← Inscription REQUISE
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
      isVisible: true,                 // ← Visible sur le site public
      allowPublicRegistration: false, // ← Pas d'inscription publique
      requiresRegistration: false,    // ← Pas d'inscription requise
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
      allowPublicRegistration: true,   // ← Le public PEUT s'inscrire
      requiresRegistration: true,      // ← Inscription REQUISE
      isFree: false,                   // ← HelloAsso = jamais gratuit!
      adultPrice: 12,
      childPrice: 6,
      maxParticipants: null,
      registrationDeadline: '',
      registrationMethod: 'helloasso',  // ← HelloAsso!
      status: 'PUBLISHED'
    },
    description: "Événement avec inscription payante via HelloAsso"
  },
  members_only: {
    name: "Adhérents Seulement",
    icon: FiLock,
    color: "purple",
    defaults: {
      isVisible: false,             // ← Pas visible publiquement
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
      isVisible: false,             // ← Pas visible publiquement
      allowPublicRegistration: false,
      requiresRegistration: false,  // ← Pas d'inscription du tout
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
      allowPublicRegistration: true,   // ← Le public PEUT télécharger le PDF
      requiresRegistration: true,      // ← Inscription REQUISE
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
      allowPublicRegistration: true,   // ← Le public PEUT s'inscrire
      requiresRegistration: true,      // ← Inscription REQUISE
      isFree: true,
      adultPrice: null,
      childPrice: null,
      maxParticipants: null,
      registrationDeadline: '',
      registrationMethod: 'internal',  // ← Formulaire interne avec champs spécifiques
      status: 'PUBLISHED',
      registrationType: 'parade_vehicles'  // ← Champs spécialisés
    },
    description: "Défilé de véhicules anciens - Inscription avec nom, véhicule et club"
  }
};

const Evenements = () => {
  const [events, setEvents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateCustomizations, setTemplateCustomizations] = useState({
    registrationQuestions: [],
    registrationConditions: {},
    advancedSettings: {}
  });
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
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
    // Champs corrigés pour la nouvelle logique
    isVisible: true,              // Visible sur le site public
    allowPublicRegistration: false, // Le public peut s'inscrire
    requiresRegistration: false,   // Inscription requise
    isFree: true,
    maxParticipants: '',
    registrationDeadline: '',
    registrationMethod: 'none',    // 'none', 'helloasso', 'pdf', 'internal'
    pdfUrl: '',                    // URL du PDF à télécharger
    eventType: 'public_info_only'
  });

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await eventsAPI.getAll();
      const events = response.events || response || [];
      setEvents(Array.isArray(events) ? events : []);
    } catch (e) {
      console.error('Erreur events API:', e);
      
      if (e.message.includes('401')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      if (e.message.includes('400')) {
        toast({ 
          status: "error", 
          title: "Erreur 400 - Bad Request",
          description: "Problème avec la requête. Cliquez sur 'Tester API' pour diagnostiquer."
        });
      } else {
        toast({ 
          status: "error", 
          title: "Erreur de chargement",
          description: "Impossible de charger les événements."
        });
      }
      
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await vehiculesAPI.getAll();
      const vehicles = response.vehicles || response || [];
      setVehicles(Array.isArray(vehicles) ? vehicles : []);
    } catch (e) {
      console.error(e);
      setVehicles([]);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchVehicles();
  }, [fetchEvents, fetchVehicles]);

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
  };

  const applyTemplate = (templateKey) => {
    const template = EVENT_TEMPLATES[templateKey];
    if (!template) return;

    setFormData(prev => ({
      ...prev,
      ...template.defaults,
      eventType: templateKey,
      // Conserver les champs déjà remplis
      title: prev.title,
      date: prev.date,
      time: prev.time,
      location: prev.location,
      description: prev.description,
      vehicleId: prev.vehicleId
    }));
    
    setSelectedTemplate(templateKey);
    
    toast({
      status: "info",
      title: "Template appliqué",
      description: template.description
    });
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
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      description: event.description || '',
      adultPrice: event.adultPrice || '',
      childPrice: event.childPrice || '',
      helloAssoUrl: event.helloAssoUrl || '',
      vehicleId: event.vehicleId || '',
      status: event.status || 'DRAFT',
      isVisible: extras.isVisible !== false,
      allowPublicRegistration: extras.allowPublicRegistration || false,
      requiresRegistration: extras.requiresRegistration || !!event.helloAssoUrl,
      isFree: extras.isFree !== false,
      maxParticipants: extras.maxParticipants || '',
      registrationDeadline: extras.registrationDeadline || '',
      registrationMethod: extras.registrationMethod || (event.helloAssoUrl ? 'helloasso' : 'none'),
      pdfUrl: extras.pdfUrl || '',
      eventType: extras.eventType || 'public_info_only'
    });
    setSelectedTemplate(extras.eventType || '');
    onOpen();
  };

  const generateEventSlug = (title, date) => {
    // Créer un slug unique à partir du titre et de la date
    const titleSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30); // Limiter la longueur
    
    const dateSlug = date.replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6); // Ajouter un suffixe aléatoire
    
    return `${titleSlug}-${dateSlug}-${randomSuffix}`;
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ status: "warning", title: "Le titre est requis" });
      return;
    }

    if (!formData.date) {
      toast({ status: "warning", title: "La date est requise" });
      return;
    }

    try {
      setSaving(true);
      
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
        extras: {
          isVisible: formData.isVisible,
          allowPublicRegistration: formData.allowPublicRegistration,
          requiresRegistration: formData.requiresRegistration,
          isFree: formData.isFree,
          maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
          registrationDeadline: formData.registrationDeadline || null,
          registrationMethod: formData.registrationMethod,
          pdfUrl: formData.pdfUrl || null,
          eventType: formData.eventType
        }
      };

      // Pour la création, ajouter l'ID obligatoire
      if (!editingEvent) {
        eventData.id = generateEventSlug(formData.title, formData.date);
        console.log('🆔 Generated ID:', eventData.id);
      }

      console.log('🚀 Saving event data:', eventData);

      if (editingEvent) {
        await eventsAPI.update(editingEvent.id, eventData);
        toast({ status: "success", title: "Événement modifié avec succès" });
      } else {
        await eventsAPI.create(eventData);
        toast({ status: "success", title: "Événement créé avec succès" });
      }

      await fetchEvents();
      onClose();
      resetForm();
    } catch (e) {
      console.error('Save error:', e);
      
      // Gestion spécifique des erreurs avec plus de détails
      if (e.message.includes('409') || (e.message.includes('ID déjà utilisé'))) {
        toast({ 
          status: "error", 
          title: "ID déjà utilisé",
          description: "Un événement avec ce nom et cette date existe déjà. Modifiez le titre ou la date."
        });
      } else if (e.message.includes('400')) {
        // Essayer de récupérer plus d'informations sur l'erreur 400
        console.log('Détails erreur 400 - Data envoyée:', eventData);
        toast({ 
          status: "error", 
          title: "Erreur 400 - Données invalides",
          description: "Vérifiez la console pour voir les données envoyées."
        });
      } else {
        toast({ 
          status: "error", 
          title: "Erreur lors de la sauvegarde",
          description: e.message
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${event.title}" ?`)) {
      return;
    }

    try {
      await eventsAPI.delete(event.id);
      toast({ status: "success", title: "Événement supprimé" });
      await fetchEvents();
    } catch (e) {
      toast({ 
        status: "error", 
        title: "Erreur lors de la suppression",
        description: e.message
      });
    }
  };

  const togglePublish = async (event) => {
    const newStatus = event.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      console.log('🔄 Toggling status from', event.status, 'to', newStatus);
      await eventsAPI.update(event.id, { status: newStatus });
      toast({ 
        status: "success", 
        title: `Événement ${newStatus === 'PUBLISHED' ? 'publié' : 'dépublié'}` 
      });
      await fetchEvents();
    } catch (e) {
      console.error('Erreur toggle publish:', e);
      toast({ 
        status: "error", 
        title: "Erreur lors de la publication",
        description: e.message
      });
    }
  };

  const getStatusBadge = (status) => {
    return status === 'PUBLISHED' 
      ? <Badge colorScheme="green">Publié</Badge>
      : <Badge colorScheme="gray">Brouillon</Badge>;
  };

  const getEventTypeBadge = (event) => {
    try {
      const extras = event.extras ? JSON.parse(event.extras) : {};
      const eventType = extras.eventType || 'public_info_only';
      const template = EVENT_TEMPLATES[eventType];
      
      if (template) {
        return (
          <Badge colorScheme={template.color} variant="subtle">
            <Icon as={template.icon} mr={1} />
            {template.name}
          </Badge>
        );
      }
    } catch (e) {
      console.log('Error parsing event extras:', e);
    }
    
    return <Badge colorScheme="gray">Standard</Badge>;
  };

  const getRegistrationButton = (event) => {
    try {
      const extras = event.extras ? JSON.parse(event.extras) : {};
      
      console.log(`🔍 Internal - Event "${event.title}" extras:`, extras);
      
      // Logique simple et claire
      
      // 1. Événement non visible publiquement
      if (!extras.isVisible) {
        return (
          <Button
            size="sm"
            leftIcon={<FiLock />}
            colorScheme="red"
            variant="solid"
            isDisabled
          >
            Privé/Interne
          </Button>
        );
      }
      
      // 2. Visible mais pas d'inscription requise
      if (!extras.requiresRegistration) {
        return (
          <Button
            size="sm"
            leftIcon={<FiGlobe />}
            colorScheme="green"
            variant="outline"
            isDisabled
          >
            Ouvert au public
          </Button>
        );
      }
      
      // 3. Inscription requise mais public ne peut pas s'inscrire
      if (extras.requiresRegistration && !extras.allowPublicRegistration) {
        return (
          <Button
            size="sm"
            leftIcon={<FiEyeOff />}
            colorScheme="orange"
            variant="outline"
            isDisabled
          >
            Contact requis
          </Button>
        );
      }
      
      // 4. Inscription requise ET public peut s'inscrire
      if (extras.requiresRegistration && extras.allowPublicRegistration) {
        return (
          <Button
            size="sm"
            leftIcon={<FiUsers />}
            colorScheme="blue"
            variant="solid"
            isDisabled
          >
            Inscription publique
          </Button>
        );
      }
      
      return (
        <Button size="sm" leftIcon={<FiGlobe />} colorScheme="gray" variant="outline" isDisabled>
          Indéterminé
        </Button>
      );
    } catch (e) {
      console.log(`Error parsing extras for ${event.title}:`, e);
      // Fallback très simple
      return (
        <Button size="sm" leftIcon={<FiGlobe />} colorScheme="green" variant="outline" isDisabled>
          Legacy (ouvert)
        </Button>
      );
    }
  };

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find(v => v.parc === vehicleId);
    return vehicle ? `${vehicle.parc} - ${vehicle.modele}` : 'Aucun véhicule';
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const selectedVehicle = selectedEvent ? vehicles.find(v => v.parc === selectedEvent.vehicleId) : null;

  // Vue en cartes améliorée
  const CardsView = () => (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
      {events.map((event) => (
        <Card key={event.id} shadow="md" position="relative">
          <CardHeader pb={2}>
            <VStack align="start" spacing={2}>
              <HStack justify="space-between" w="100%">
                <Heading size="md" noOfLines={2} flex={1}>{event.title}</Heading>
                {getRegistrationButton(event)}
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
  );

  // Vue en tableau
  const TableView = () => (
    <Box overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Titre</Th>
            <Th>Date</Th>
            <Th>Type</Th>
            <Th>Statut</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {events.map(event => (
            <Tr 
              key={event.id} 
              bg={event.id === selectedEventId ? "blue.50" : undefined}
              cursor="pointer"
              onClick={() => setSelectedEventId(event.id === selectedEventId ? null : event.id)}
              _hover={{ bg: "gray.50" }}
            >
              <Td fontWeight="semibold">{event.title}</Td>
              <Td>{event.date} {event.time && `à ${event.time}`}</Td>
              <Td>{getEventTypeBadge(event)}</Td>
              <Td>
                <VStack align="start" spacing={1}>
                  {getStatusBadge(event.status)}
                  {getRegistrationButton(event)}
                </VStack>
              </Td>
              <Td>
                <HStack spacing={1}>
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(event); }}>
                    Éditer
                  </Button>
                  <Button 
                    size="sm" 
                    colorScheme={event.status === 'PUBLISHED' ? 'red' : 'green'}
                    onClick={(e) => { e.stopPropagation(); togglePublish(event); }}
                  >
                    {event.status === 'PUBLISHED' ? 'Dépublier' : 'Publier'}
                  </Button>
                  <Button 
                    size="sm" 
                    colorScheme="red" 
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); handleDelete(event); }}
                  >
                    Supprimer
                  </Button>
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );

  return (
    <Box p={{ base: 4, md: 6 }}>
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading color="black" size="lg">📝 Création des Événements</Heading>
          <Text fontSize="sm" color="gray.600">
            Créez et configurez de nouveaux événements pour l'association
          </Text>
        </VStack>
        <HStack spacing={3}>
          <Button
            leftIcon={viewMode === 'cards' ? <FiList /> : <FiGrid />}
            size="sm"
            variant="outline"
          >
            {viewMode === 'cards' ? 'Vue tableau' : 'Vue cartes'}
          </Button>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="rbe"
            onClick={handleCreate}
          >
            Créer un événement
          </Button>
        </HStack>
      </Flex>

      {loading ? (
        <Center py={20}>
          <Spinner size="xl" color="rbe.500" />
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
      ) : viewMode === 'cards' ? (
        <CardsView />
      ) : (
        <TableView />
      )}

      {/* Modal de création/édition corrigé */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent maxH="90vh" overflowY="auto">
          <ModalHeader>
            {editingEvent ? 'Modifier l\'événement' : 'Créer un événement'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs>
              <TabList>
                <Tab>📋 Informations de base</Tab>
                <Tab>🏷️ Templates</Tab>
                <Tab>💰 Inscription & Prix</Tab>
                <Tab>ℹ️ Informations supplémentaires</Tab>
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

                    <FormControl>
                      <FormLabel>Véhicule participant</FormLabel>
                      <Select
                        value={formData.vehicleId || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                        placeholder="Sélectionner un véhicule (optionnel)"
                      >
                        <option value="">-- Aucun véhicule --</option>
                        {vehicles.map(vehicle => (
                          <option key={vehicle.parc} value={vehicle.parc}>
                            {vehicle.parc} - {vehicle.modele} ({vehicle.marque})
                          </option>
                        ))}
                      </Select>
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

                {/* Onglet 2: Configuration corrigée */}
                <TabPanel>
                  <VStack spacing={6}>
                    {/* Visibilité */}
                    <Box w="100%" p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
                      <Heading size="sm" mb={3}>👁️ Visibilité</Heading>
                      <FormControl>
                        <HStack>
                          <Switch
                            isChecked={formData.isVisible}
                            onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
                          />
                          <FormLabel mb={0}>Visible sur le site public</FormLabel>
                        </HStack>
                        <Alert status={formData.isVisible ? "success" : "warning"} mt={2} borderRadius="md">
                          <AlertIcon />
                          <Text fontSize="sm">
                            {formData.isVisible 
                              ? "✅ L'événement apparaîtra sur la page Events du site externe" 
                              : "🔒 Événement privé, visible seulement dans l'interface interne"}
                          </Text>
                        </Alert>
                      </FormControl>
                    </Box>

                    {/* Inscription */}
                    <Box w="100%" p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
                      <Heading size="sm" mb={3}>📝 Gestion des inscriptions</Heading>
                      <VStack spacing={4} align="start">
                        <FormControl>
                          <HStack>
                            <Switch
                              isChecked={formData.requiresRegistration}
                              onChange={(e) => setFormData(prev => ({ ...prev, requiresRegistration: e.target.checked }))}
                            />
                            <FormLabel mb={0}>Inscription requise pour participer</FormLabel>
                          </HStack>
                          <Alert status={formData.requiresRegistration ? "info" : "success"} mt={2} borderRadius="md">
                            <AlertIcon />
                            <Text fontSize="sm">
                              {formData.requiresRegistration 
                                ? "📝 Une inscription sera nécessaire pour participer à cet événement" 
                                : "🌍 Bouton 'Ouvert au public' - Aucune inscription nécessaire"}
                            </Text>
                          </Alert>
                        </FormControl>

                        {formData.requiresRegistration && (
                          <FormControl>
                            <HStack>
                              <Switch
                                isChecked={formData.allowPublicRegistration}
                                onChange={(e) => setFormData(prev => ({ ...prev, allowPublicRegistration: e.target.checked }))}
                              />
                              <FormLabel mb={0}>Le public peut s'inscrire directement</FormLabel>
                            </HStack>
                            <Alert status={formData.allowPublicRegistration ? "success" : "warning"} mt={2} borderRadius="md">
                              <AlertIcon />
                              <Text fontSize="sm">
                                {formData.allowPublicRegistration 
                                  ? "✅ Bouton d'inscription disponible sur le site externe" 
                                  : "📞 Bouton 'Contacter l'association' - Inscription via contact uniquement"}
                              </Text>
                            </Alert>
                          </FormControl>
                        )}

                        {/* Reste de la configuration d'inscription... */}
                      </VStack>
                    </Box>

                    {/* Tarification */}
                    <Box w="100%" p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
                      <Heading size="sm" mb={3}>💰 Tarification</Heading>
                      <VStack spacing={3} align="start">
                        <FormControl>
                          <HStack>
                            <Switch
                              isChecked={formData.isFree}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                isFree: e.target.checked,
                                adultPrice: e.target.checked ? '' : prev.adultPrice,
                                childPrice: e.target.checked ? '' : prev.childPrice
                              }))}
                            />
                            <FormLabel mb={0}>Événement gratuit</FormLabel>
                          </HStack>
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
                                placeholder="15.00"
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel>Prix enfant (€)</FormLabel>
                              <Input
                                type="number"
                                step="0.01"
                                value={formData.childPrice}
                                onChange={(e) => setFormData(prev => ({ ...prev, childPrice: e.target.value }))}
                                placeholder="8.00"
                              />
                            </FormControl>
                          </HStack>
                        )}
                      </VStack>
                    </Box>

                    <FormControl>
                      <FormLabel>Statut de publication</FormLabel>
                      <Select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="DRAFT">Brouillon</option>
                        <option value="PUBLISHED">Publié</option>
                      </Select>
                    </FormControl>
                  </VStack>
                </TabPanel>

                {/* Onglet 3: Templates corrigés */}
                <TabPanel>
                  <VStack spacing={4}>
                    <Text fontSize="lg" fontWeight="bold" mb={4}>
                      🎯 Choisissez un template pour configurer rapidement votre événement
                    </Text>
                    
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="100%">
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
                      <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="bold">Template appliqué</Text>
                          <Text fontSize="sm">
                            Vous pouvez maintenant personnaliser les paramètres dans l'onglet "Configuration"
                          </Text>
                        </VStack>
                      </Alert>
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
            <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
              {editingEvent ? 'Modifier' : 'Créer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Evenements;