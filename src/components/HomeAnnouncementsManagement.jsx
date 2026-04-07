/**
 * HomeAnnouncementsManagement.jsx
 * 
 * Interface d'administration pour gérer les annonces d'accueil
 * Permet de créer, modifier, et supprimer les annonces de l'accueil
 */

import React, { useState } from 'react';
import {
  Box, Button, FormControl, FormLabel, Input, Select, Textarea,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, useDisclosure, Table, Thead, Tbody, Tr, Th, Td,
  Badge, HStack, VStack, IconButton, useToast, Container, Heading,
  useColorModeValue, Card, CardBody, SimpleGrid, Text
} from '@chakra-ui/react';
import { FiTrash2, FiEdit2, FiPlus } from 'react-icons/fi';
import { 
  getHomeAnnouncements, 
  removeHomeAnnouncement, 
  clearHomeAnnouncements,
  AnnouncementPresets
} from '../utils/homeAnnouncementUtils';

export default function HomeAnnouncementsManagement() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [announcements, setAnnouncements] = useState(getHomeAnnouncements());
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Form state
  const [formData, setFormData] = useState({
    severity: 'info',
    title: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAnnouncement = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: '⚠️ Champs obligatoires',
        description: 'Veuillez remplir le titre et le message',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      setIsLoading(true);

      // Créer l'annonce via localStorage
      const newAnnouncement = {
        id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        severity: formData.severity,
        title: formData.title,
        message: formData.message,
        active: true,
        dismissible: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        actions: [],
        createdAt: new Date().toISOString()
      };

      const current = getHomeAnnouncements();
      const updated = [...current, newAnnouncement];
      localStorage.setItem('rbe:home-announcements', JSON.stringify(updated));

      setAnnouncements(updated);
      setFormData({ severity: 'info', title: '', message: '' });
      onClose();

      toast({
        title: '✅ Annonce ajoutée',
        description: 'L\'annonce a été créée avec succès',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Erreur ajout annonce:', error);
      toast({
        title: '❌ Erreur',
        description: 'Impossible d\'ajouter l\'annonce',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAnnouncement = (id) => {
    removeHomeAnnouncement(id);
    setAnnouncements(getHomeAnnouncements());
    toast({
      title: '✅ Annonce supprimée',
      status: 'success',
      duration: 2000,
      isClosable: true
    });
  };

  const handleClearAll = () => {
    if (window.confirm('⚠️ Êtes-vous sûr? Cela supprimera TOUTES les annonces.')) {
      clearHomeAnnouncements();
      setAnnouncements([]);
      toast({
        title: '✅ Toutes les annonces ont été supprimées',
        status: 'success',
        duration: 2000,
        isClosable: true
      });
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'warning':
        return 'orange';
      case 'info':
      default:
        return 'blue';
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'critical':
        return '🚨 Critique';
      case 'warning':
        return '⚠️ Avertissement';
      case 'info':
      default:
        return 'ℹ️ Information';
    }
  };

  return (
    <Container maxW="container.lg" py={6}>
      <VStack align="stretch" spacing={6}>
        {/* En-tête */}
        <Box>
          <Heading size="lg" mb={2}>🔔 Gestion des Annonces d'Accueil</Heading>
          <Text color="gray.600">
            Créez des bandes de notification avec 3 niveaux de gravité pour informer les utilisateurs de nouvelles importantes.
          </Text>
        </Box>

        {/* Quick presets */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <Heading size="sm">📋 Tests rapides</Heading>
              <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
                <Button 
                  colorScheme="blue" 
                  variant="outline"
                  onClick={() => {
                    AnnouncementPresets.testInfo();
                    setAnnouncements(getHomeAnnouncements());
                    toast({
                      title: '✅ Annonce de test ajoutée',
                      description: 'Vérifiez l\'accueil',
                      status: 'success',
                      duration: 3000
                    });
                  }}
                >
                  Test Info
                </Button>
                <Button 
                  colorScheme="orange" 
                  variant="outline"
                  onClick={() => {
                    AnnouncementPresets.testWarning();
                    setAnnouncements(getHomeAnnouncements());
                    toast({
                      title: '✅ Annonce de test ajoutée',
                      description: 'Vérifiez l\'accueil',
                      status: 'success',
                      duration: 3000
                    });
                  }}
                >
                  Test Avertissement
                </Button>
                <Button 
                  colorScheme="red" 
                  variant="outline"
                  onClick={() => {
                    AnnouncementPresets.testCritical();
                    setAnnouncements(getHomeAnnouncements());
                    toast({
                      title: '✅ Annonce de test ajoutée',
                      description: 'Vérifiez l\'accueil',
                      status: 'success',
                      duration: 3000
                    });
                  }}
                >
                  Test Critique
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
          >
            Nouvelle annonce
          </Button>
          {announcements.length > 0 && (
            <Button
              colorScheme="red"
              variant="outline"
              onClick={handleClearAll}
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
                Annonces actuelles ({announcements.length})
              </Heading>

              {announcements.length === 0 ? (
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
                      {announcements.map(ann => (
                        <Tr key={ann.id} borderBottom="1px" borderColor={borderColor}>
                          <Td>
                            <Badge colorScheme={getSeverityColor(ann.severity)}>
                              {getSeverityLabel(ann.severity)}
                            </Badge>
                          </Td>
                          <Td fontWeight="bold" maxW="150px" isTruncated>
                            {ann.title}
                          </Td>
                          <Td maxW="250px" isTruncated>
                            {ann.message}
                          </Td>
                          <Td fontSize="xs" color="gray.500">
                            {new Date(ann.expiresAt).toLocaleDateString('fr-FR')}
                          </Td>
                          <Td>
                            <HStack spacing={2}>
                              <IconButton
                                icon={<FiTrash2 />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                aria-label="Supprimer"
                              />
                            </HStack>
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
                  <option value="info">ℹ️ Information (Bleu)</option>
                  <option value="warning">⚠️ Avertissement (Orange)</option>
                  <option value="critical">🚨 Critique (Rouge)</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Titre *</FormLabel>
                <Input
                  name="title"
                  placeholder="Ex: Maintenance prévue"
                  value={formData.title}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Message *</FormLabel>
                <Textarea
                  name="message"
                  placeholder="Détails de l'annonce..."
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={4}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleAddAnnouncement}
              isLoading={isLoading}
            >
              Créer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
