import React, { useEffect, useState } from 'react';
import {
  Box, Button, VStack, HStack, Heading, Text, Center, Spinner, Alert, AlertIcon,
  Card, CardBody, CardHeader, useColorModeValue, useToast
} from '@chakra-ui/react';
import { FiCheck, FiX, FiCalendar } from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function AttendancePage() {
  const { eventId, memberId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [member, setMember] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [eventId, memberId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // TODO: Récupérer l'événement et les infos du membre
      // Pour l'instant, données de test
      setEvent({
        id: eventId,
        title: 'Tournée collecte février',
        date: new Date(2025, 1, 15).toISOString(),
        description: 'Tournée de collecte bi-mensuelle',
        type: 'TOURNEE',
      });

      setMember({
        id: memberId,
        prenom: 'Jean',
        nom: 'Dupont',
        email: 'jean@retrobus.fr',
      });
    } catch (e) {
      console.error('Fetch error:', e);
      setError('Impossible de charger les informations');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = async (confirmed) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/planning/attendance/${eventId}/${memberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed }),
      });

      if (!res.ok) throw new Error('Failed');

      setSubmitted(true);
      toast({
        status: 'success',
        title: confirmed ? 'Présence confirmée !' : 'Absence enregistrée',
        duration: 3000,
      });

      // Rediriger après 2s
      setTimeout(() => navigate('/'), 2000);
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Center p={6}><Spinner size="xl" /></Center>;

  if (error) {
    return (
      <Center p={6} minH="100vh">
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          {error}
        </Alert>
      </Center>
    );
  }

  if (submitted) {
    return (
      <Center p={6} minH="100vh">
        <Card bg={cardBg} maxW="500px" w="100%">
          <CardBody textAlign="center" py={10}>
            <Box mb={4}>
              <Box fontSize="60px" mb={4}>✅</Box>
              <Heading size="lg" mb={2}>Merci !</Heading>
              <Text color="gray.600">Votre réponse a été enregistrée.</Text>
            </Box>
            <Button mt={6} onClick={() => navigate('/')}>Retourner à l'accueil</Button>
          </CardBody>
        </Card>
      </Center>
    );
  }

  const eventDate = new Date(event.date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Center p={6} minH="100vh" bg="gray.50">
      <Card bg={cardBg} maxW="600px" w="100%" boxShadow="xl" borderRadius="xl">
        <CardHeader p={8} borderBottomWidth="1px">
          <VStack spacing={4} align="center">
            <Box fontSize="48px">📅</Box>
            <Heading size="lg" textAlign="center">Confirmation de présence</Heading>
            <Text color="gray.600" textAlign="center">
              Bonjour {member?.prenom} {member?.nom}
            </Text>
          </VStack>
        </CardHeader>

        <CardBody p={8}>
          <VStack spacing={6} align="stretch">
            {/* Event details */}
            <Box bg="blue.50" p={4} borderRadius="lg" borderLeft="4px" borderLeftColor="blue.500">
              <HStack spacing={3} mb={2}>
                <FiCalendar size={20} color="#3b82f6" />
                <Heading size="sm">{event?.title}</Heading>
              </HStack>
              <Text fontSize="sm" color="gray.600" mb={2}>{eventDate}</Text>
              {event?.description && (
                <Text fontSize="sm">{event.description}</Text>
              )}
            </Box>

            {/* Action buttons */}
            <VStack spacing={3} pt={4}>
              <Text fontWeight="600" textAlign="center">
                Confirmer votre présence ?
              </Text>

              <HStack spacing={3} w="100%">
                <Button
                  leftIcon={<FiCheck />}
                  colorScheme="green"
                  size="lg"
                  flex="1"
                  onClick={() => handleAttendance(true)}
                  isLoading={loading}
                >
                  ✓ Je serai présent
                </Button>
                <Button
                  leftIcon={<FiX />}
                  colorScheme="red"
                  size="lg"
                  flex="1"
                  variant="outline"
                  onClick={() => handleAttendance(false)}
                  isLoading={loading}
                >
                  ✗ Je ne pourrai pas
                </Button>
              </HStack>
            </VStack>

            {/* Info footer */}
            <Box pt={4} borderTopWidth="1px">
              <Text fontSize="xs" color="gray.500" textAlign="center">
                Votre email: {member?.email}
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>
    </Center>
  );
}
