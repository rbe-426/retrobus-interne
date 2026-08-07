/**
 * EventDashboardHome.jsx
 * 
 * Layout d'accueil spécial pour le mode événement
 * Remplace temporairement DashboardHome quand un événement est actif
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, Text, Button, SimpleGrid,
  Card, CardBody, CardHeader, VStack, HStack, Image,
  Badge, Icon, Divider, useColorModeValue, Flex,
  Stat, StatLabel, StatNumber, StatHelpText, Progress,
  Alert, AlertIcon, AlertTitle, AlertDescription,
  useToast, Spinner, Center
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import {
  FiCalendar, FiMapPin, FiClock, FiUsers, FiTruck,
  FiInfo, FiArrowRight, FiPhone, FiMail, FiShare2,
  FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import { getEventModeConfig, EVENT_TYPES } from '../utils/eventModeConfig';
import { useUser } from '../context/UserContext';

export default function EventDashboardHome() {
  const { user } = useUser();
  const [eventConfig, setEventConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('orange.500', 'orange.400');

  useEffect(() => {
    const config = getEventModeConfig();
    setEventConfig(config);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Center minH="60vh">
        <Spinner size="xl" color={accentColor} />
      </Center>
    );
  }

  if (!eventConfig) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          Configuration événement introuvable
        </Alert>
      </Container>
    );
  }

  const event = eventConfig.event || {};
  const registration = eventConfig.registration || {};
  const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.CUSTOM;

  // Formater les dates
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Calculer le temps restant avant l'événement
  const getTimeUntilEvent = () => {
    const now = new Date();
    const startDate = new Date(eventConfig.startDate);
    const diff = startDate - now;
    
    if (diff < 0) return null; // Événement déjà commencé
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { days, hours };
  };

  const timeUntil = getTimeUntilEvent();

  // Progression des inscriptions
  const registrationProgress = registration.maxParticipants 
    ? (registration.currentParticipants / registration.maxParticipants) * 100
    : 0;

  return (
    <Box bg={bgColor} minH="calc(100vh - 200px)">
      {/* Hero Section avec image de bannière */}
      {event.bannerImage && (
        <Box
          position="relative"
          h="400px"
          bgImage={`url(${event.bannerImage})`}
          bgSize="cover"
          bgPosition="center"
          bgRepeat="no-repeat"
        >
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="blackAlpha.600"
          />
          <Container maxW="container.xl" h="full" position="relative">
            <Flex align="center" justify="center" h="full">
              <VStack spacing={4} color="white" textAlign="center">
                <Heading size="2xl" textShadow="0 2px 8px rgba(0,0,0,0.4)">
                  {event.name}
                </Heading>
                {event.description && (
                  <Text fontSize="xl" maxW="800px">
                    {event.description}
                  </Text>
                )}
              </VStack>
            </Flex>
          </Container>
        </Box>
      )}

      <Container maxW="container.xl" py={8}>
        {/* Compte à rebours */}
        {timeUntil && (
          <Card bg={cardBg} mb={6} borderLeft="4px solid" borderColor={accentColor}>
            <CardBody>
              <HStack spacing={8} justify="center" flexWrap="wrap">
                <VStack spacing={0}>
                  <Text fontSize="4xl" fontWeight="bold" color={accentColor}>
                    {timeUntil.days}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {timeUntil.days > 1 ? 'jours' : 'jour'}
                  </Text>
                </VStack>
                <VStack spacing={0}>
                  <Text fontSize="4xl" fontWeight="bold" color={accentColor}>
                    {timeUntil.hours}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    heures
                  </Text>
                </VStack>
                <VStack spacing={1} align="flex-start">
                  <Text fontSize="lg" fontWeight="semibold">
                    Avant le début de l'événement !
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Ne manquez pas cette occasion unique
                  </Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
        )}

        {/* Informations principales */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
          {/* Date et horaires */}
          <Card bg={cardBg}>
            <CardHeader pb={2}>
              <HStack spacing={2}>
                <Icon as={FiCalendar} color={accentColor} fontSize="xl" />
                <Heading size="sm">Date & Horaires</Heading>
              </HStack>
            </CardHeader>
            <CardBody pt={2}>
              <VStack align="flex-start" spacing={2}>
                <Text fontWeight="medium">
                  {formatDate(eventConfig.startDate)}
                </Text>
                {eventConfig.endDate && eventConfig.startDate !== eventConfig.endDate && (
                  <>
                    <Text fontSize="sm" color="gray.600">au</Text>
                    <Text fontWeight="medium">
                      {formatDate(eventConfig.endDate)}
                    </Text>
                  </>
                )}
                <HStack spacing={2} mt={2}>
                  <Icon as={FiClock} color="gray.500" />
                  <Text fontSize="sm">
                    {formatTime(eventConfig.startDate)} - {formatTime(eventConfig.endDate)}
                  </Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Lieu */}
          <Card bg={cardBg}>
            <CardHeader pb={2}>
              <HStack spacing={2}>
                <Icon as={FiMapPin} color={accentColor} fontSize="xl" />
                <Heading size="sm">Lieu</Heading>
              </HStack>
            </CardHeader>
            <CardBody pt={2}>
              <Text fontWeight="medium" mb={2}>
                {event.location || 'À définir'}
              </Text>
              <Button
                size="sm"
                variant="outline"
                colorScheme="orange"
                leftIcon={<FiMapPin />}
                as="a"
                href={`https://www.google.com/maps/search/${encodeURIComponent(event.location || '')}`}
                target="_blank"
              >
                Voir sur la carte
              </Button>
            </CardBody>
          </Card>

          {/* Inscriptions */}
          {registration.enabled && (
            <Card bg={cardBg}>
              <CardHeader pb={2}>
                <HStack spacing={2}>
                  <Icon as={FiUsers} color={accentColor} fontSize="xl" />
                  <Heading size="sm">Inscriptions</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={2}>
                <VStack align="stretch" spacing={3}>
                  {registration.maxParticipants ? (
                    <>
                      <Stat>
                        <StatNumber fontSize="2xl">
                          {registration.currentParticipants} / {registration.maxParticipants}
                        </StatNumber>
                        <StatLabel>participants inscrits</StatLabel>
                      </Stat>
                      <Progress 
                        value={registrationProgress} 
                        colorScheme={registrationProgress > 80 ? 'red' : 'orange'}
                        borderRadius="full"
                      />
                    </>
                  ) : (
                    <Stat>
                      <StatNumber fontSize="2xl">
                        {registration.currentParticipants}
                      </StatNumber>
                      <StatLabel>participants inscrits</StatLabel>
                      <StatHelpText>Places illimitées</StatHelpText>
                    </Stat>
                  )}
                  
                  <Button
                    colorScheme="orange"
                    size="lg"
                    rightIcon={<FiArrowRight />}
                    isDisabled={
                      registration.maxParticipants && 
                      registration.currentParticipants >= registration.maxParticipants
                    }
                  >
                    {registration.maxParticipants && 
                     registration.currentParticipants >= registration.maxParticipants
                      ? 'Complet'
                      : "S'inscrire maintenant"
                    }
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          )}
        </SimpleGrid>

        {/* Programme / Description détaillée */}
        <Card bg={cardBg} mb={8}>
          <CardHeader>
            <Heading size="md">À propos de l'événement</Heading>
          </CardHeader>
          <CardBody>
            <Text mb={4}>
              {event.description || 'Rejoignez-nous pour cet événement exceptionnel !'}
            </Text>
            
            <Divider my={4} />
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <VStack align="flex-start" spacing={3}>
                <Heading size="sm">Ce qui vous attend :</Heading>
                <HStack>
                  <Icon as={FiCheckCircle} color="green.500" />
                  <Text>Exposition de véhicules historiques</Text>
                </HStack>
                <HStack>
                  <Icon as={FiCheckCircle} color="green.500" />
                  <Text>Rencontre avec les passionnés</Text>
                </HStack>
                <HStack>
                  <Icon as={FiCheckCircle} color="green.500" />
                  <Text>Découverte du patrimoine roulant</Text>
                </HStack>
                <HStack>
                  <Icon as={FiCheckCircle} color="green.500" />
                  <Text>Animations et surprises</Text>
                </HStack>
              </VStack>
              
              <VStack align="flex-start" spacing={3}>
                <Heading size="sm">Informations pratiques :</Heading>
                <HStack>
                  <Icon as={FiInfo} color="blue.500" />
                  <Text>Entrée gratuite</Text>
                </HStack>
                <HStack>
                  <Icon as={FiInfo} color="blue.500" />
                  <Text>Parking disponible</Text>
                </HStack>
                <HStack>
                  <Icon as={FiInfo} color="blue.500" />
                  <Text>Accessible PMR</Text>
                </HStack>
                <HStack>
                  <Icon as={FiInfo} color="blue.500" />
                  <Text>Restauration sur place</Text>
                </HStack>
              </VStack>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Contact */}
        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="md">Contact & Informations</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <VStack align="flex-start" spacing={3}>
                <HStack>
                  <Icon as={FiMail} color={accentColor} />
                  <Text>contact@retrobus-essonne.fr</Text>
                </HStack>
                <HStack>
                  <Icon as={FiPhone} color={accentColor} />
                  <Text>01 XX XX XX XX</Text>
                </HStack>
              </VStack>
              
              <Flex justify={{ base: 'flex-start', md: 'flex-end' }}>
                <Button
                  leftIcon={<FiShare2 />}
                  variant="outline"
                  colorScheme="orange"
                >
                  Partager l'événement
                </Button>
              </Flex>
            </SimpleGrid>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}
