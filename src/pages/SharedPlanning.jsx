import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Select,
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
  CheckboxGroup,
  Checkbox,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { FiCalendar } from 'react-icons/fi';
import PageLayout from '../components/Layout/PageLayout';
import { fetchJson } from '../apiClient';
import { useUser } from '../context/UserContext';

// Calendrier composant
function MonthlyCalendar({ events, currentDate, onPrevMonth, onNextMonth }) {
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

          {/* En-têtes des jours */}
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
              const isToday = d.isCurrentMonth && 
                d.day === new Date().getDate() && 
                month === new Date().getMonth() && 
                year === new Date().getFullYear();

              return (
                <Box
                  key={idx}
                  minH="100px"
                  p={2}
                  border={isToday ? `2px solid` : '1px solid'}
                  borderColor={isToday ? borderCurrentDay : 'gray.300'}
                  bg={isToday ? bgCurrentDay : d.isCurrentMonth ? 'white' : bgOtherMonth}
                  borderRadius="md"
                  fontSize="sm"
                  opacity={d.isCurrentMonth ? 1 : 0.5}
                >
                  <Text fontWeight="bold" mb={1}>{d.day}</Text>
                  {dayEvents.length > 0 && (
                    <VStack spacing={1} align="start">
                      {dayEvents.slice(0, 2).map(event => (
                        <Badge key={event.id} fontSize="xs" colorScheme="green" w="full" isTruncated>
                          {event.name}
                        </Badge>
                      ))}
                      {dayEvents.length > 2 && (
                        <Text fontSize="xs" color="gray.500">+{dayEvents.length - 2}</Text>
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
  const toast = useToast();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    loadAvailabilities();
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

  const monthName = new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <VStack spacing={6} align="stretch">
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

export default function SharedPlanning() {
  const { user } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadEvents();
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
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les événements',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setEventsLoading(false);
    }
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
                    onPrevMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                    onNextMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  />

                  {/* Liste des événements du mois */}
                  <Box>
                    <Heading size="md" mb={4}>Événements du mois</Heading>
                    {events.length === 0 ? (
                      <Text color="gray.500">Aucun événement prévu ce mois-ci</Text>
                    ) : (
                      <Stack spacing={2}>
                        {events.map(event => (
                          <Card key={event.id}>
                            <CardBody>
                              <HStack justify="space-between" align="start">
                                <VStack align="start" spacing={1}>
                                  <Heading size="sm">{event.name}</Heading>
                                  <Text fontSize="sm" color="gray.600">
                                    {new Date(event.startDate).toLocaleDateString('fr-FR', {
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
        </VStack>
      </Container>
    </PageLayout>
  );
}
