/**
 * EventCreationWizardPage.jsx
 * Page d'administration pour créer/modifier un événement avec le wizard
 * Système complet: création, personnalisation, questions customisées
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Button,
  Center,
  Spinner,
  useToast,
  useColorModeValue
} from '@chakra-ui/react';
import { FiArrowLeft } from 'react-icons/fi';
import EventCreationWizard from '../components/EventCreationWizard';
import { eventsAPI, vehiculesAPI } from '../api';

export default function EventCreationWizardPage({ param } = {}) {
  const toast = useToast();
  const bgPage = useColorModeValue('gray.50', 'gray.900');

  const [vehicles, setVehicles] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== LOAD DATA =====
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [vehiclesRes, eventsRes] = await Promise.allSettled([
          vehiculesAPI.getVehicles(),
          eventsAPI.listEvents()
        ]);

        if (vehiclesRes.status === 'fulfilled') {
          setVehicles(vehiclesRes.value || []);
        }

        if (eventsRes.status === 'fulfilled') {
          setEvents(eventsRes.value || []);
        }

        if (vehiclesRes.status === 'rejected') {
          console.warn('⚠️ Erreur véhicules:', vehiclesRes.reason?.message);
        }

        if (eventsRes.status === 'rejected') {
          console.warn('⚠️ Erreur événements:', eventsRes.reason?.message);
        }
      } catch (err) {
        console.error('❌ Erreur chargement:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ===== SAVE EVENT =====
  const handleSaveEvent = useCallback(async (formData) => {
    try {
      console.log('📝 Sauvegarde:', {
        ...formData,
        customQuestionsCount: formData.customQuestions?.length || 0
      });

      // Préparer les données pour l'API
      const eventPayload = {
        title: formData.title,
        date: formData.date,
        time: formData.time || '09:00',
        location: formData.location,
        description: formData.description || '',
        vehicleId: formData.vehicleId || null,
        adultPrice: formData.isFree ? null : (formData.adultPrice ? parseFloat(formData.adultPrice) : null),
        childPrice: formData.isFree ? null : (formData.childPrice ? parseFloat(formData.childPrice) : null),
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        registrationDeadline: formData.registrationDeadline || null,
        status: formData.status || 'DRAFT',
        isVisible: formData.isVisible,
        allowPublicRegistration: formData.allowPublicRegistration,
        requiresRegistration: formData.requiresRegistration,
        isFree: formData.isFree,
        registrationMethod: formData.registrationMethod || 'none',
        // Métadonnées wizard
        template: formData.template || 'custom',
        customQuestions: formData.customQuestions || [],
        pdfUrl: null,
        eventType: formData.eventType || 'OUTING'
      };

      console.log('🚀 Envoi au serveur:', eventPayload);

      // Appel API
      const response = await eventsAPI.createEvent(eventPayload);

      if (!response || !response.id) {
        throw new Error('Réponse serveur invalide');
      }

      console.log('✅ Événement créé:', response.id);

      // Succès
      toast({
        status: 'success',
        title: 'Événement créé avec succès! 🎉',
        description: `ID: ${response.id}`,
        duration: 4000,
        isClosable: true
      });

      // Redirection après succès (optionnel)
      setTimeout(() => {
        window.location.href = '/admin/events';
      }, 2000);

      return response;
    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      throw err;
    }
  }, [toast]);

  if (loading) {
    return (
      <Center h="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="rbe.500" />
          <Box>Chargement des données...</Box>
        </VStack>
      </Center>
    );
  }

  return (
    <Box bg={bgPage} minH="100vh" p={4}>
      <VStack spacing={6} align="stretch" maxW="6xl" mx="auto">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Heading size="xl">Créer un Événement</Heading>
            <Box fontSize="sm" color="gray.600">Wizard étape par étape avec personnalisation</Box>
          </VStack>
          <Button
            leftIcon={<FiArrowLeft />}
            variant="outline"
            onClick={() => window.location.href = '/admin/events'}
          >
            Retour
          </Button>
        </HStack>

        {error && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Box>
              <Heading size="sm">Attention</Heading>
              Certaines données n'ont pas pu être chargées: {error}
            </Box>
          </Alert>
        )}

        {/* Wizard */}
        <EventCreationWizard
          vehicles={vehicles}
          events={events}
          onSave={handleSaveEvent}
        />
      </VStack>
    </Box>
  );
}
