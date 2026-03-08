import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Divider,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
  useToast,
  Badge,
  Checkbox,
  CheckboxGroup,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { FiCalendar, FiCheck, FiX } from 'react-icons/fi';
import PageLayout from '../components/Layout/PageLayout';
import { fetchJson } from '../apiClient';
import { useUser } from '../context/UserContext';

// Calendrier composant - Format français (Lun-Dim)
function MonthlyCalendar({ events, currentDate, onPrevMonth, onNextMonth, invitations, onEventClick }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  // Ajuster pour format français (lun=1, dim=0 -> lun=0, dim=6)
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];
  
  // Jours du mois précédent
  for (let i = adjustedFirstDay - 1; i >= 0; i--) {
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
      const eventDate = new Date(event.date);
      return eventDate.getDate() === dayOfMonth && 
             eventDate.getMonth() === month &&
             eventDate.getFullYear() === year;
    });
  };

  const getDayInvitations = (dayOfMonth) => {
    return invitations.filter(inv => {
      if (!inv.event) return false;
      const eventDate = new Date(inv.event.date);
      return eventDate.getDate() === dayOfMonth && 
             eventDate.getMonth() === month &&
             eventDate.getFullYear() === year;
    });
  };

  const bgOtherMonth = useColorModeValue('gray.100', 'gray.700');
  const bgCurrentDay = useColorModeValue('blue.50', 'blue.900');
  const borderCurrentDay = useColorModeValue('blue.500', 'blue.300');

  return (
    <Card>
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

          {/* En-têtes des jours - Format français (Lun à Dim) */}
          <Grid templateColumns="repeat(7, 1fr)" gap={1}>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
              <Box key={day} textAlign="center" fontWeight="bold" py={2}>
                {day}
              </Box>
            ))}
          </Grid>

          {/* Grille des jours */}
          <Grid templateColumns="repeat(7, 1fr)" gap={1}>
            {days.map((d, idx) => {
              const dayEvents = getDayEvents(d.day);
              const dayInvitations = getDayInvitations(d.day);
              const isToday = d.isCurrentMonth && 
                d.day === new Date().getDate() && 
                month === new Date().getMonth() && 
                year === new Date().getFullYear();

              return (
                <Box
                  key={idx}
                  minH="120px"
                  p={2}
                  border={isToday ? `2px solid` : '1px solid'}
                  borderColor={isToday ? borderCurrentDay : 'gray.300'}
                  bg={isToday ? bgCurrentDay : d.isCurrentMonth ? 'white' : bgOtherMonth}
                  borderRadius="md"
                  fontSize="sm"
                  opacity={d.isCurrentMonth ? 1 : 0.5}
                  cursor={dayEvents.length > 0 || dayInvitations.length > 0 ? 'pointer' : 'default'}
                  _hover={dayEvents.length > 0 || dayInvitations.length > 0 ? { shadow: 'md' } : {}}
                >
                  <Text fontWeight="bold" mb={1}>{d.day}</Text>
                  
                  {/* Événements publics */}
                  {dayEvents.length > 0 && (
                    <VStack spacing={1} align="start">
                      {dayEvents.slice(0, 1).map(event => (
                        <Badge 
                          key={event.id} 
                          fontSize="xs" 
                          colorScheme="green" 
                          w="full" 
                          isTruncated
                          onClick={() => onEventClick(event)}
                          cursor="pointer"
                        >
                          📅 {event.title}
                        </Badge>
                      ))}
                      {dayEvents.length > 1 && (
                        <Text fontSize="xs" color="gray.500">+{dayEvents.length - 1} evt</Text>
                      )}
                    </VStack>
                  )}

                  {/* Invitations personnelles */}
                  {dayInvitations.length > 0 && (
                    <VStack spacing={1} align="start">
                      {dayInvitations.slice(0, 1).map(inv => (
                        <Badge 
                          key={inv.id}
                          fontSize="xs" 
                          colorScheme={inv.status === 'ACCEPTED' ? 'green' : inv.status === 'DECLINED' ? 'red' : 'blue'}
                          w="full" 
                          isTruncated
                          onClick={() => onEventClick(inv.event)}
                          cursor="pointer"
                        >
                          ✉️ {inv.event?.title}
                        </Badge>
                      ))}
                      {dayInvitations.length > 1 && (
                        <Text fontSize="xs" color="gray.500">+{dayInvitations.length - 1} inv</Text>
                      )}
                    </VStack>
                  )}
                </Box>
              );
            })}
          </Grid>
        </VStack>
      </CardBody>
    </Card>
  );
}

// Composant Planning Individuel
function IndividualPlanning({ userId, userName }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState({});
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const toast = useToast();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    loadAvailabilities();
    loadInvitations();
  }, [userId, month, year]);

  const loadAvailabilities = async () => {
    try {
      setLoading(true);
      const response = await fetchJson(`/api/planning/availabilities/${userId}?month=${month}&year=${year}`);
      if (response.success) {
        setAvailabilities(response.data || {});
      }
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await fetchJson(`/api/user/${userId}/event-invitations`);
      if (response.success) {
        setInvitations(response.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
    }
  };

  const handleAvailabilityChange = (day, available) => {
    const key = `${year}-${month}-${day}`;
    setAvailabilities(prev => ({
      ...prev,
      [key]: available
    }));
  };

  const handleSave = async () => {
    try {
      const response = await fetchJson('/api/planning/availabilities', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          month,
          year,
          availabilities
        })
      });

      if (response.success) {
        toast({
          title: 'Disponibilités sauvegardées',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleInvitationResponse = async (invitationId, status) => {
    try {
      const response = await fetchJson(`/api/invitations/${invitationId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });

      if (response.success) {
        await loadInvitations();
        toast({
          title: `Réponse enregistrée`,
          description: `Vous avez répondu: ${status}`,
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const monthName = new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // Invitations du mois actuel
  const monthInvitations = invitations.filter(inv => {
    if (!inv.event) return false;
    const eventDate = new Date(inv.event.date);
    return eventDate.getMonth() === month && eventDate.getFullYear() === year;
  });

  return (
    <VStack spacing={6} align="stretch">
      {/* Section Invitations */}
      {monthInvitations.length > 0 && (
        <Box>
          <Heading size="sm" mb={3}>📬 Invitations pour ce mois</Heading>
          <Stack spacing={2}>
            {monthInvitations.map(inv => (
              <Card key={inv.id} bg={inv.status === 'PENDING' ? 'orange.50' : 'green.50'}>
                <CardBody>
                  <HStack justify="space-between">
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold">{inv.event?.title}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(inv.event?.date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </Text>
                    </VStack>
                    <HStack>
                      <Badge colorScheme={inv.status === 'ACCEPTED' ? 'green' : inv.status === 'DECLINED' ? 'red' : 'yellow'}>
                        {inv.status}
                      </Badge>
                      {inv.status === 'PENDING' && (
                        <HStack spacing={1}>
                          <IconButton
                            icon={<FiCheck />}
                            colorScheme="green"
                            size="sm"
                            onClick={() => handleInvitationResponse(inv.id, 'ACCEPTED')}
                            aria-label="Accepter"
                          />
                          <IconButton
                            icon={<FiX />}
                            colorScheme="red"
                            size="sm"
                            onClick={() => handleInvitationResponse(inv.id, 'DECLINED')}
                            aria-label="Refuser"
                          />
                        </HStack>
                      )}
                    </HStack>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {/* En-tête avec navigation */}
      <Flex justify="space-between" align="center">
        <Heading size="md">
          Mes disponibilités - {monthName}
        </Heading>
        <HStack>
          <IconButton
            icon={<ChevronLeftIcon />}
            onClick={() => setCurrentDate(new Date(year, month - 1))}
            variant="ghost"
            aria-label="Mois précédent"
          />
          <IconButton
            icon={<ChevronRightIcon />}
            onClick={() => setCurrentDate(new Date(year, month + 1))}
            variant="ghost"
            aria-label="Mois suivant"
          />
        </HStack>
      </Flex>

      {/* Grille des jours */}
      <CheckboxGroup>
        <Grid templateColumns="repeat(auto-fit, minmax(150px, 1fr))" gap={4}>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const date = new Date(year, month, day);
            const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
            const key = `${year}-${month}-${day}`;
            const isAvailable = availabilities[key] || false;

            return (
              <Card key={day}>
                <CardBody p={3}>
                  <VStack spacing={2} align="start">
                    <Box>
                      <Text fontWeight="bold">{day}</Text>
                      <Text fontSize="xs" color="gray.500">{dayName}</Text>
                    </Box>
                    <Checkbox
                      isChecked={isAvailable}
                      onChange={(e) => handleAvailabilityChange(day, e.target.checked)}
                      colorScheme="green"
                    >
                      <Text fontSize="sm" ml={2}>Disponible</Text>
                    </Checkbox>
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      </CheckboxGroup>

      {/* Bouton de sauvegarde */}
      <Button
        colorScheme="green"
        size="lg"
        isLoading={loading}
        onClick={handleSave}
        w="full"
      >
        Sauvegarder mes disponibilités
      </Button>
    </VStack>
  );
}

// Modal Détails Événement
function EventDetailsModal({ isOpen, onClose, event, invitation }) {
  const toast = useToast();

  const handleResponse = async (status) => {
    try {
      const response = await fetchJson(`/api/invitations/${invitation?.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });

      if (response.success) {
        toast({
          title: 'Réponse enregistrée',
          status: 'success',
          duration: 2000
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error'
      });
    }
  };

  if (!event) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{event.title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="start" spacing={3}>
            <Box>
              <Text fontWeight="bold">Date</Text>
              <Text>{new Date(event.date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</Text>
            </Box>
            {event.location && (
              <Box>
                <Text fontWeight="bold">Lieu</Text>
                <Text>{event.location}</Text>
              </Box>
            )}
            {event.description && (
              <Box>
                <Text fontWeight="bold">Description</Text>
                <Text>{event.description}</Text>
              </Box>
            )}

            {invitation && invitation.status === 'PENDING' && (
              <HStack spacing={2} w="full" pt={4}>
                <Button
                  flex={1}
                  colorScheme="green"
                  onClick={() => handleResponse('ACCEPTED')}
                >
                  Accepter
                </Button>
                <Button
                  flex={1}
                  colorScheme="red"
                  onClick={() => handleResponse('DECLINED')}
                >
                  Refuser
                </Button>
              </HStack>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default function PlanningRBE() {
  const { user } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    loadEvents();
    loadInvitations();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      setEventsLoading(true);
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();
      const response = await fetchJson(`/api/events?month=${month}&year=${year}`);
      
      if (response.success) {
        setEvents(response.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      if (!user?.id) return;
      const response = await fetchJson(`/api/user/${user.id}/event-invitations`);
      if (response.success) {
        setInvitations(response.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    const invitation = invitations.find(inv => inv.eventId === event.id);
    setSelectedInvitation(invitation);
    onOpen();
  };

  return (
    <PageLayout>
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* En-tête */}
          <Box>
            <Heading size="xl" mb={2}>
              <HStack spacing={3}>
                <Box as={FiCalendar} boxSize={8} />
                <span>Planning partagés</span>
              </HStack>
            </Heading>
            <Text color="gray.600">
              Consultez les événements et gérez vos disponibilités pour les sessions d'entretien
            </Text>
          </Box>

          <Divider />

          {/* Tabs */}
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList>
              <Tab fontWeight="bold">Planning d'événement</Tab>
              <Tab fontWeight="bold">Mon planning individuel</Tab>
            </TabList>

            <TabPanels>
              {/* Tab 1: Planning d'évènement */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  <MonthlyCalendar 
                    events={events}
                    currentDate={currentDate}
                    invitations={invitations}
                    onPrevMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                    onNextMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                    onEventClick={handleEventClick}
                  />

                  {/* Liste des événements du mois */}
                  <Box>
                    <Heading size="md" mb={4}>Événements du mois</Heading>
                    {events.length === 0 ? (
                      <Text color="gray.500">Aucun événement prévu ce mois-ci</Text>
                    ) : (
                      <Stack spacing={2}>
                        {events.map(event => (
                          <Card key={event.id} cursor="pointer" onClick={() => handleEventClick(event)} _hover={{ shadow: 'md' }}>
                            <CardBody>
                              <HStack justify="space-between" align="start">
                                <VStack align="start" spacing={1}>
                                  <Heading size="sm">{event.title}</Heading>
                                  <Text fontSize="sm" color="gray.600">
                                    {new Date(event.date).toLocaleDateString('fr-FR', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </Text>
                                  {event.description && (
                                    <Text fontSize="sm">{event.description}</Text>
                                  )}
                                </VStack>
                                <Badge colorScheme="green">
                                  {event.status || 'Planifié'}
                                </Badge>
                              </HStack>
                            </CardBody>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </VStack>
              </TabPanel>

              {/* Tab 2: Planning individuel */}
              <TabPanel>
                {user && (
                  <IndividualPlanning 
                    userId={user.id} 
                    userName={user.email}
                  />
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Modal Détails Événement */}
          <EventDetailsModal 
            isOpen={isOpen}
            onClose={onClose}
            event={selectedEvent}
            invitation={selectedInvitation}
          />
        </VStack>
      </Container>
    </PageLayout>
  );
}
