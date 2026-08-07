import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  useDisclosure,
  useToast,
  Checkbox,
  CheckboxGroup,
  Badge,
  IconButton,
  Divider,
  Textarea,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import PageLayout from '../components/Layout/PageLayout';
import { fetchJson } from '../apiClient';

const PLANNING_TYPES = [
  { value: 'tournee', label: 'Tournée', color: 'orange' },
  { value: 'campagne', label: 'Campagne', color: 'purple' },
  { value: 'maintenance', label: 'Maintenance', color: 'red' },
  { value: 'evenement', label: 'Événement', color: 'green' },
  { value: 'livraison', label: 'Livraison', color: 'cyan' },
  { value: 'cotisation', label: 'Cotisation', color: 'yellow' },
];

// Calendrier composant
function MonthlyCalendar({ events, currentDate, onDateClick, onPrevMonth, onNextMonth }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];
  
  // Jours du mois précédent
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }
  
  // Jours du mois actuel
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true });
  }
  
  // Jours du mois suivant
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({ day: i, isCurrentMonth: false });
  }

  const getDayEvents = (dayOfMonth) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.getDate() === dayOfMonth && 
             eventDate.getMonth() === month &&
             eventDate.getFullYear() === year;
    });
  };

  return (
    <Card mb={6}>
      <CardBody>
        <VStack spacing={4} align="stretch">
          <Flex justify="space-between" align="center">
            <Heading size="md">
              {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </Heading>
            <HStack>
              <IconButton
                icon={<ChevronLeftIcon />}
                onClick={onPrevMonth}
                variant="ghost"
                aria-label="Mois précédent"
              />
              <IconButton
                icon={<ChevronRightIcon />}
                onClick={onNextMonth}
                variant="ghost"
                aria-label="Mois suivant"
              />
            </HStack>
          </Flex>

          {/* Jours de la semaine */}
          <Grid templateColumns="repeat(7, 1fr)" gap={2}>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
              <Box key={day} textAlign="center" fontWeight="bold" fontSize="sm">
                {day}
              </Box>
            ))}

            {/* Cellules du calendrier */}
            {days.map((dayObj, idx) => {
              const dayEvents = dayObj.isCurrentMonth ? getDayEvents(dayObj.day) : [];
              return (
                <Box
                  key={idx}
                  p={2}
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                  minH="100px"
                  bg={dayObj.isCurrentMonth ? 'white' : 'gray.50'}
                  cursor={dayObj.isCurrentMonth ? 'pointer' : 'default'}
                  onClick={() => dayObj.isCurrentMonth && onDateClick(dayObj.day)}
                  _hover={dayObj.isCurrentMonth ? { bg: 'blue.50' } : {}}
                >
                  <Text fontSize="xs" fontWeight="bold" mb={1}>
                    {dayObj.day}
                  </Text>
                  <VStack spacing={1} align="stretch">
                    {dayEvents.map(event => (
                      <Badge
                        key={event.id}
                        fontSize="2xs"
                        colorScheme={getTypeColor(event.type)}
                        cursor="pointer"
                        title={event.title}
                        noOfLines={1}
                      >
                        {event.title}
                      </Badge>
                    ))}
                  </VStack>
                </Box>
              );
            })}
          </Grid>
        </VStack>
      </CardBody>
    </Card>
  );
}

// Helper functions
const getTypeColor = (type) => {
  const typeObj = PLANNING_TYPES.find(t => t.value === type);
  return typeObj?.color || 'gray';
};

const getTypeLabel = (type) => {
  const typeObj = PLANNING_TYPES.find(t => t.value === type);
  return typeObj?.label || type;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR');
};

// Main Component
export default function RetroPlanning() {
  const toast = useToast();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'tournee',
    startDate: '',
    startTime: '08:00',
    endDate: '',
    endTime: '17:00',
    location: '',
    vehicleId: '',
    driverId: '',
    selectedMembers: [],
    externalEmails: '',
  });

  useEffect(() => {
    loadEvents();
    loadMembers();
    loadVehicles();
  }, []);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const response = await fetchJson('/api/members');
      if (Array.isArray(response)) {
        const membersFormatted = response.map(m => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email,
          membershipStatus: m.membershipStatus,
        }));
        setMembers(membersFormatted);
      } else {
        console.warn('Unexpected members response format:', response);
        setMembers([]);
      }
    } catch (error) {
      console.error('Erreur chargement membres:', error);
      setMembers([]);
      toast({
        title: 'Attention',
        description: 'Impossible de charger la liste des membres',
        status: 'warning',
        duration: 3,
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await fetchJson('/api/vehicles');
      if (Array.isArray(response)) {
        setVehicles(response);
      } else {
        console.warn('Unexpected vehicles response format:', response);
        setVehicles([]);
      }
    } catch (error) {
      console.error('Erreur chargement véhicules:', error);
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetchJson('/api/planning/events');
      if (Array.isArray(response)) {
        setEvents(response);
      } else if (response && typeof response === 'object' && response.data && Array.isArray(response.data)) {
        setEvents(response.data);
      } else {
        console.warn('Unexpected response format, using demo data:', response);
        setEvents([
          {
            id: '1',
            title: 'Tournée février',
            type: 'tournee',
            description: 'Collecte standard février',
            startDate: new Date().toISOString(),
            vehicleId: 'bus-1',
            driverId: 'driver-1'
          }
        ]);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      setEvents([
        {
          id: '1',
          title: 'Tournée février',
          type: 'tournee',
          description: 'Collecte standard février',
          startDate: new Date().toISOString(),
          vehicleId: 'bus-1',
          driverId: 'driver-1'
        }
      ]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMembersChange = (selected) => {
    setFormData(prev => ({ ...prev, selectedMembers: selected }));
  };

  const handleCreateEvent = async () => {
    if (!formData.title || !formData.startDate) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir au minimum le titre et la date',
        status: 'error',
        duration: 3,
      });
      return;
    }

    try {
      // Préparer les données pour l'API
      const eventData = {
        title: formData.title,
        type: formData.type,
        description: formData.description,
        startDate: new Date(`${formData.startDate}T${formData.startTime || '08:00'}`).toISOString(),
        endDate: formData.endDate ? new Date(`${formData.endDate}T${formData.endTime || '17:00'}`).toISOString() : null,
        startTime: formData.startTime || '08:00',
        endTime: formData.endTime || '17:00',
        location: formData.location,
        vehicleId: formData.vehicleId || null,
        driverId: formData.driverId || null,
        selectedMembers: formData.selectedMembers,
        externalEmails: formData.externalEmails,
      };

      // Envoyer au serveur
      const response = await fetchJson('/api/planning/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });

      if (response.success || response.event) {
        // Recharger les événements
        await loadEvents();
        
        toast({
          title: 'Succès',
          description: `Événement créé et ${response.emailsSent?.members || 0} invitation(s) envoyée(s)`,
          status: 'success',
          duration: 3,
        });

        // Réinitialiser le formulaire
        setFormData({
          title: '',
          description: '',
          type: 'tournee',
          startDate: '',
          startTime: '08:00',
          endDate: '',
          endTime: '17:00',
          location: '',
          vehicleId: '',
          driverId: '',
          selectedMembers: [],
          externalEmails: '',
        });
        onCreateClose();
      } else {
        throw new Error(response.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur création événement:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer l\'événement',
        status: 'error',
        duration: 3,
      });
    }
  };

  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    onDetailOpen();
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      // Supprimer via l'API
      const response = await fetchJson(`/api/planning/events/${eventId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        // Recharger les événements
        await loadEvents();
        toast({
          title: 'Succès',
          description: 'Événement supprimé',
          status: 'success',
          duration: 3,
        });
        onDetailClose();
      } else {
        throw new Error(response.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer l\'événement',
        status: 'error',
        duration: 3,
      });
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateClick = (day) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setFormData(prev => ({
      ...prev,
      startDate: newDate.toISOString().split('T')[0],
    }));
    onCreateOpen();
  };

  return (
    <PageLayout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Flex justify="space-between" align="center">
            <Heading as="h1" size="lg">
              📅 RétroPlanning
            </Heading>
            <Button colorScheme="blue" onClick={onCreateOpen}>
              ➕ Ajouter un événement
            </Button>
          </Flex>

          {/* Calendrier */}
          <MonthlyCalendar
            events={events}
            currentDate={currentDate}
            onDateClick={handleDateClick}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          {/* Liste des événements */}
          <Box>
            <Heading size="md" mb={4}>
              📋 Événements prévus
            </Heading>
            {!Array.isArray(events) || events.length === 0 ? (
              <Card>
                <CardBody>
                  <Text textAlign="center" color="gray.500">
                    Aucun événement prévu pour le moment
                  </Text>
                </CardBody>
              </Card>
            ) : (
              <Grid templateColumns="repeat(auto-fill, minmax(350px, 1fr))" gap={4}>
                {events.map(event => (
                  <Card key={event.id} cursor="pointer" onClick={() => handleViewEvent(event)} _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                    <CardBody>
                      <VStack align="start" spacing={3}>
                        <HStack justify="space-between" w="full">
                          <Heading size="sm">{event.title}</Heading>
                          <Badge colorScheme={getTypeColor(event.type)}>
                            {getTypeLabel(event.type)}
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">{event.description}</Text>
                        <HStack fontSize="xs" color="gray.500" spacing={4}>
                          <Text>📅 {formatDate(event.startDate)}</Text>
                          {event.vehicleId && <Text>🚌 {event.vehicleId}</Text>}
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </Grid>
            )}
          </Box>
        </VStack>

        {/* Modal Création */}
        <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="xl" scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>✏️ Créer un nouvel événement</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                {/* Détails de base */}
                <Box w="full">
                  <Heading size="sm" mb={3}>📝 Détails</Heading>
                  <VStack spacing={3}>
                    <FormControl isRequired>
                      <FormLabel>Titre</FormLabel>
                      <Input
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Titre de l'événement"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Type</FormLabel>
                      <Select name="type" value={formData.type} onChange={handleInputChange}>
                        {PLANNING_TYPES.map(t => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Description</FormLabel>
                      <Textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Détails de l'événement"
                        rows={3}
                      />
                    </FormControl>
                  </VStack>
                </Box>

                <Divider />

                {/* Date et Heure */}
                <Box w="full">
                  <Heading size="sm" mb={3}>🕐 Date et Heure</Heading>
                  <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                    <FormControl isRequired>
                      <FormLabel>Date début</FormLabel>
                      <Input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Heure début</FormLabel>
                      <Input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleInputChange}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Date fin</FormLabel>
                      <Input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Heure fin</FormLabel>
                      <Input
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleInputChange}
                      />
                    </FormControl>
                  </Grid>
                </Box>

                <Divider />

                {/* Affectations */}
                <Box w="full">
                  <Heading size="sm" mb={3}>🚌 Affectations</Heading>
                  <VStack spacing={3}>
                    <FormControl>
                      <FormLabel>Véhicule</FormLabel>
                      {loadingVehicles ? (
                        <Text fontSize="sm" color="gray.500">Chargement des véhicules...</Text>
                      ) : vehicles.length === 0 ? (
                        <Text fontSize="sm" color="red.500">Aucun véhicule disponible</Text>
                      ) : (
                        <Select name="vehicleId" value={formData.vehicleId} onChange={handleInputChange}>
                          <option value="">-- Sélectionner un véhicule --</option>
                          {vehicles.map(vehicle => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.parc} - {vehicle.modele} ({vehicle.marque})
                            </option>
                          ))}
                        </Select>
                      )}
                    </FormControl>

                    <FormControl>
                      <FormLabel>Chauffeur (Membre)</FormLabel>
                      {loadingMembers ? (
                        <Text fontSize="sm" color="gray.500">Chargement des chauffeurs...</Text>
                      ) : members.length === 0 ? (
                        <Text fontSize="sm" color="red.500">Aucun membre disponible</Text>
                      ) : (
                        <Select name="driverId" value={formData.driverId} onChange={handleInputChange}>
                          <option value="">-- Sélectionner un chauffeur --</option>
                          {members.map(member => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </Select>
                      )}
                    </FormControl>
                  </VStack>
                </Box>

                <Divider />

                {/* Participants */}
                <Box w="full">
                  <Heading size="sm" mb={3}>👥 Participants</Heading>
                  <VStack spacing={3} align="start">
                    <FormControl>
                      <FormLabel>Membres de l'association</FormLabel>
                      {loadingMembers ? (
                        <Text fontSize="sm" color="gray.500">Chargement des membres...</Text>
                      ) : members.length === 0 ? (
                        <Text fontSize="sm" color="orange.500">Aucun membre disponible</Text>
                      ) : (
                        <CheckboxGroup value={formData.selectedMembers} onChange={handleMembersChange}>
                          <Stack spacing={2}>
                            {members.map(member => (
                              <Checkbox key={member.id} value={member.id}>
                                {member.name} ({member.email})
                              </Checkbox>
                            ))}
                          </Stack>
                        </CheckboxGroup>
                      )}
                    </FormControl>

                    <FormControl>
                      <FormLabel>Invitations externes</FormLabel>
                      <Textarea
                        name="externalEmails"
                        value={formData.externalEmails}
                        onChange={handleInputChange}
                        placeholder="Adresses emails séparées par des virgules&#10;exemple@mail.com, autre@mail.com"
                        rows={3}
                      />
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Séparez les adresses par des virgules pour envoyer des invitations par email
                      </Text>
                    </FormControl>
                  </VStack>
                </Box>

                <Divider />

                {/* Boutons d'action */}
                <HStack justify="flex-end" w="full" pt={4}>
                  <Button variant="ghost" onClick={onCreateClose}>
                    Annuler
                  </Button>
                  <Button colorScheme="blue" onClick={handleCreateEvent}>
                    ✅ Créer l'événement
                  </Button>
                </HStack>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Modal Détails */}
        <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>{selectedEvent?.title}</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {selectedEvent && (
                <VStack spacing={4} align="start">
                  <Box>
                    <Text fontWeight="bold" mb={1}>Type:</Text>
                    <Badge colorScheme={getTypeColor(selectedEvent.type)}>
                      {getTypeLabel(selectedEvent.type)}
                    </Badge>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" mb={1}>Description:</Text>
                    <Text>{selectedEvent.description || '-'}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" mb={1}>Date début:</Text>
                    <Text>{formatDate(selectedEvent.startDate)}</Text>
                  </Box>
                  {selectedEvent.endDate && (
                    <Box>
                      <Text fontWeight="bold" mb={1}>Date fin:</Text>
                      <Text>{formatDate(selectedEvent.endDate)}</Text>
                    </Box>
                  )}
                  {selectedEvent.vehicleId && (
                    <Box>
                      <Text fontWeight="bold" mb={1}>Véhicule:</Text>
                      <Text>{selectedEvent.vehicleId}</Text>
                    </Box>
                  )}
                  {selectedEvent.driverId && (
                    <Box>
                      <Text fontWeight="bold" mb={1}>Chauffeur:</Text>
                      <Text>{selectedEvent.driverId}</Text>
                    </Box>
                  )}
                  <HStack spacing={3} w="full" pt={4}>
                    <Button colorScheme="red" flex={1} onClick={() => handleDeleteEvent(selectedEvent.id)}>
                      🗑️ Supprimer
                    </Button>
                    <Button variant="ghost" flex={1} onClick={onDetailClose}>
                      Fermer
                    </Button>
                  </HStack>
                </VStack>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </Container>
    </PageLayout>
  );
}
