/**
 * HomeAnnouncementsManagement.jsx
 * 
 * Interface d'administration pour gérer les annonces d'accueil
 * Permet de créer, modifier, et supprimer les annonces persistées côté serveur
 */

import React, { useState } from 'react';
import {
  Box, Button, FormControl, FormLabel, Input, Select, Textarea,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, useDisclosure, Table, Thead, Tbody, Tr, Th, Td,
  Badge, HStack, VStack, IconButton, useToast, Container, Heading,
  useColorModeValue, Card, CardBody, SimpleGrid, Text, Spinner, Alert, AlertIcon
} from '@chakra-ui/react';
import { FiTrash2, FiRefreshCw, FiPlus } from 'react-icons/fi';
import { useHomeAnnouncements } from '../hooks/useHomeAnnouncements';

export default function HomeAnnouncementsManagement() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { announcements, loading, error, addAnnouncement, removeAnnouncement, clearAll, refresh } = useHomeAnnouncements();
  const safeAnnouncements = Array.isArray(announcements) ? announcements : [];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Form state
  const [formData, setFormData] = useState({
    severity: 'INFO',
    title: '',
    message: '',
    expiresInHours: 24
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAnnouncement = async () => {
    if (!formData.message.trim()) {
      toast({
        title: '⚠️ Champ obligatoire',
        description: 'Le message est requis',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const expiresAt = new Date(Date.now() + (parseInt(formData.expiresInHours) * 60 * 60 * 1000)).toISOString();

      await addAnnouncement({
        severity: formData.severity,
        title: formData.title || null,
        message: formData.message,
        expiresAt,
        dismissible: true
      });

      setFormData({ severity: 'INFO', title: '', message: '', expiresInHours: 24 });
      onClose();

      toast({
        title: '✅ Annonce créée',
        description: 'L\'annonce a été ajoutée avec succès',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Erreur ajout annonce:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible d\'ajouter l\'annonce: ' + (error.message || 'erreur serveur'),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Confirmer la suppression de cette annonce ?')) {
      return;
    }

    try {
      await removeAnnouncement(id);
      toast({
        title: '✅ Annonce supprimée',
        status: 'success',
        duration: 2000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: '❌ Erreur de suppression',
        description: error.message || 'Erreur serveur',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('⚠️ Êtes-vous sûr? Cela supprimera TOUTES les annonces.')) {
      return;
    }

    try {
      await clearAll();
      toast({
        title: '✅ Toutes les annonces ont été supprimées',
        status: 'success',
        duration: 2000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: '❌ Erreur',
        description: error.message || 'Erreur serveur',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'red';
      case 'WARNING':
        return 'orange';
      case 'SUCCESS':
        return 'green';
      case 'INFO':
      default:
        return 'blue';
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return '🚨 Alerte majeure';
      case 'WARNING':
        return '⚠️ Attention';
      case 'SUCCESS':
        return '✅ Service rétabli';
      case 'INFO':
      default:
        return 'ℹ️ Annonce';
    }
  };

  // Exemples rapides
  const handleAddTestInfo = async () => {
    try {
      await addAnnouncement({
        severity: 'INFO',
        title: 'Information de test',
        message: 'Ceci est une annonce d\'information de test. Elle apparaîtra sur l\'accueil avec une couleur bleue.',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      toast({ title: '✅ Annonce test créée', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: '❌ Erreur', description: error.message, status: 'error', duration: 3000 });
    }
  };

  const handleAddTestWarning = async () => {
    try {
      await addAnnouncement({
        severity: 'WARNING',
        title: 'Maintenance programmée',
        message: 'Le site sera en maintenance ce weekend. Certaines fonctionnalités pourraient être temporairement indisponibles.',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });
      toast({ title: '✅ Annonce test créée', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: '❌ Erreur', description: error.message, status: 'error', duration: 3000 });
    }
  };

  const handleAddTestCritical = async () => {
    try {
      await addAnnouncement({
        severity: 'CRITICAL',
        title: '🚨 Incident en cours',
        message: 'Un problème technique affecte actuellement le service. Nos équipes travaillent à résoudre la situation au plus vite.',
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      });
      toast({ title: '✅ Annonce test créée', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: '❌ Erreur', description: error.message, status: 'error', duration: 3000 });
    }
  };

  const handleAddTestSuccess = async () => {
    try {
      await addAnnouncement({
        severity: 'SUCCESS',
        title: '✅ Service rétabli',
        message: 'Le service est de nouveau disponible. Merci pour votre patience.',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      toast({ title: '✅ Annonce de rétablissement créée', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: '❌ Erreur', description: error.message, status: 'error', duration: 3000 });
    }
  };

  return (
    <Container maxW="container.lg" py={6}>
      <VStack align="stretch" spacing={6}>
        {/* En-tête */}
        <Box>
          <Heading size="lg" mb={2}>🔔 Gestion des Annonces d'Accueil</Heading>
          <Text color="gray.600">
            Créez des bandes de notification persistées en base de données avec 4 niveaux de gravité pour informer les utilisateurs.
          </Text>
        </Box>

        {/* Erreur de chargement */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            Erreur de chargement: {error}
          </Alert>
        )}

        {/* Quick presets */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <Heading size="sm">📋 Tests rapides</Heading>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={3}>
                <Button 
                  colorScheme="blue" 
                  variant="outline"
                  onClick={handleAddTestInfo}
                  isDisabled={isSubmitting}
                >
                  Test Info
                </Button>
                <Button 
                  colorScheme="orange" 
                  variant="outline"
                  onClick={handleAddTestWarning}
                  isDisabled={isSubmitting}
                >
                  Test Avertissement
                </Button>
                <Button 
                  colorScheme="red" 
                  variant="outline"
                  onClick={handleAddTestCritical}
                  isDisabled={isSubmitting}
                >
                  Test Critique
                </Button>
                <Button
                  colorScheme="green"
                  variant="outline"
                  onClick={handleAddTestSuccess}
                  isDisabled={isSubmitting}
                >
                  Test rétablissement
                </Button>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Actions */}
        <HStack spacing={3}>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            onClick={onOpen}
            isDisabled={loading}
          >
            Nouvelle annonce
          </Button>
          <Button
            leftIcon={<FiRefreshCw />}
            variant="outline"
            onClick={refresh}
            isLoading={loading}
          >
            Actualiser
          </Button>
          {safeAnnouncements.length > 0 && (
            <Button
              colorScheme="red"
              variant="outline"
              onClick={handleClearAll}
              isDisabled={loading}
            >
              Tout supprimer
            </Button>
          )}
        </HStack>

        {/* Annonces actuelles */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <Heading size="sm">
                Annonces actuelles ({safeAnnouncements.length})
              </Heading>

              {loading && safeAnnouncements.length === 0 ? (
                <HStack justify="center" py={6}>
                  <Spinner />
                  <Text color="gray.500">Chargement...</Text>
                </HStack>
              ) : safeAnnouncements.length === 0 ? (
                <Text color="gray.500" py={6} textAlign="center">
                  Aucune annonce active. Créez-en une pour commencer.
                </Text>
              ) : (
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Type</Th>
                        <Th>Titre</Th>
                        <Th>Message</Th>
                        <Th>Expire</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {safeAnnouncements.map(ann => (
                        <Tr key={ann.id} borderBottom="1px" borderColor={borderColor}>
                          <Td>
                            <Badge colorScheme={getSeverityColor(ann.severity)}>
                              {getSeverityLabel(ann.severity)}
                            </Badge>
                          </Td>
                          <Td fontWeight="bold" maxW="150px" isTruncated>
                            {ann.title || '-'}
                          </Td>
                          <Td maxW="250px" isTruncated>
                            {ann.message}
                          </Td>
                          <Td fontSize="xs" color="gray.500">
                            {ann.expiresAt ? new Date(ann.expiresAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Jamais'}
                          </Td>
                          <Td>
                            <IconButton
                              icon={<FiTrash2 />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              aria-label="Supprimer"
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>

      {/* Modal pour ajouter une annonce */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Créer une annonce</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Type de gravité</FormLabel>
                <Select
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                >
                  <option value="INFO">ℹ️ Annonce (Bleu)</option>
                  <option value="WARNING">⚠️ Attention (Orange)</option>
                  <option value="CRITICAL">🚨 Alerte majeure (Rouge)</option>
                  <option value="SUCCESS">✅ Service rétabli (Vert)</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Titre (optionnel)</FormLabel>
                <Input
                  name="title"
                  placeholder="Ex: Maintenance prévue"
                  value={formData.title}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Message *</FormLabel>
                <Textarea
                  name="message"
                  placeholder="Détails de l'annonce..."
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Expiration (heures)</FormLabel>
                <Input
                  name="expiresInHours"
                  type="number"
                  min="1"
                  max="720"
                  value={formData.expiresInHours}
                  onChange={handleInputChange}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  L'annonce disparaîtra automatiquement après ce délai
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isSubmitting}>
              Annuler
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleAddAnnouncement}
              isLoading={isSubmitting}
            >
              Créer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

