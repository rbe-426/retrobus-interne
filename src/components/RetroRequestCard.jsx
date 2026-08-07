/**
 * RetroRequestCard.jsx - Carte "RétroDemande" sur MyRBE
 * 
 * Composant pour l'espace personnel utilisateur MyRBE
 * - Formulaire pour créer une demande
 * - Liste des demandes avec statuts
 * - Preview des devis
 * - Actions (accepter/refuser)
 * 
 * SÉCURITÉ: Chaque utilisateur ne voit que SES demandes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  useToast,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  IconButton,
  Divider,
  Text,
  Grid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { 
  DeleteIcon, 
  EditIcon, 
  ViewIcon, 
  DownloadIcon, 
  CheckIcon, 
  CloseIcon 
} from '@chakra-ui/icons';
import { apiClient } from '../api/config';

export default function RetroRequestCard({ mode = "full" }) {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();

  // États
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'NORMAL'
  });
  const [editingId, setEditingId] = useState(null);

  // ========== SÉCURITÉ ==========
  // Les requêtes incluent toujours le token JWT
  // Le serveur filtre par userId automatiquement
  // L'utilisateur ne voit que SES demandes

  // Charger les demandes
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/retro-requests');
      
      if (response.data && response.data.requests) {
        setRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger vos demandes',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Charger au montage
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Créer/Mettre à jour une demande
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'Erreur',
        description: 'Titre et description requis',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      setLoading(true);

      let response;
      if (editingId) {
        // Mise à jour (uniquement si PENDING)
        response = await apiClient.put(`/api/retro-requests/${editingId}`, formData);
        setRequests(requests.map(r => r.id === editingId ? response.data : r));
        toast({
          title: 'Succès',
          description: 'Demande mise à jour',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      } else {
        // Création
        response = await apiClient.post('/api/retro-requests', formData);
        setRequests([response.data, ...requests]);
        toast({
          title: 'Succès',
          description: 'Demande créée',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }

      // Réinitialiser formulaire
      setFormData({
        title: '',
        description: '',
        category: 'GENERAL',
        priority: 'NORMAL'
      });
      setEditingId(null);
      onClose();
    } catch (error) {
      console.error('Erreur soumission:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Erreur lors de la soumission',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir formulaire pour créer
  const handleNew = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      category: 'GENERAL',
      priority: 'NORMAL'
    });
    onOpen();
  };

  // Ouvrir formulaire pour éditer
  const handleEdit = (request) => {
    if (request.status !== 'PENDING') {
      toast({
        title: 'Impossible',
        description: 'Vous ne pouvez éditer que les demandes en attente',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    setEditingId(request.id);
    setFormData({
      title: request.title,
      description: request.description,
      category: request.category,
      priority: request.priority
    });
    onOpen();
  };

  // Supprimer une demande
  const handleDelete = async (requestId) => {
    if (!window.confirm('Êtes-vous sûr?')) return;

    try {
      await apiClient.delete(`/api/retro-requests/${requestId}`);
      setRequests(requests.filter(r => r.id !== requestId));
      toast({
        title: 'Succès',
        description: 'Demande supprimée',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Erreur lors de la suppression',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Afficher détails + devis
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    onPreviewOpen();
  };

  // Accepter un devis
  const handleAcceptQuote = async (quoteId) => {
    try {
      await apiClient.put(
        `/api/retro-requests/${selectedRequest.id}/quotes/${quoteId}/accept`
      );
      
      // Recharger
      const updated = await apiClient.get(`/api/retro-requests/${selectedRequest.id}`);
      setSelectedRequest(updated.data);
      
      await loadRequests();
      
      toast({
        title: 'Succès',
        description: 'Devis accepté! Nous vous contactons bientôt.',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
    } catch (error) {
      console.error('Erreur acceptation:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Erreur acceptation devis',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Refuser un devis
  const handleRefuseQuote = async (quoteId) => {
    const reason = window.prompt('Raison du refus (optionnel):');

    try {
      await apiClient.put(
        `/api/retro-requests/${selectedRequest.id}/quotes/${quoteId}/refuse`,
        { reason: reason || '' }
      );

      // Recharger
      const updated = await apiClient.get(`/api/retro-requests/${selectedRequest.id}`);
      setSelectedRequest(updated.data);
      
      await loadRequests();
      
      toast({
        title: 'Succès',
        description: 'Devis refusé',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
    } catch (error) {
      console.error('Erreur refus:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Erreur refus devis',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Badge statut
  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { label: 'En attente', colorScheme: 'yellow' },
      UNDER_REVIEW: { label: 'En examen', colorScheme: 'blue' },
      QUOTED: { label: 'Devis reçu', colorScheme: 'purple' },
      ACCEPTED: { label: 'Accepté', colorScheme: 'green' },
      REFUSED: { label: 'Refusé', colorScheme: 'red' },
      COMPLETED: { label: 'Complété', colorScheme: 'gray' }
    };
    const info = statusMap[status] || { label: status, colorScheme: 'gray' };
    return <Badge colorScheme={info.colorScheme}>{info.label}</Badge>;
  };

  return (
    <Card width="100%" bg="white">
      <CardHeader pb={2}>
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={1}>
            <Heading size="lg">📋 RétroDemande</Heading>
            <Text fontSize="sm" color="gray.600">
              Espace personnel - Créez une demande et recevez des devis
            </Text>
          </VStack>
          <Button 
            colorScheme="blue" 
            size="sm" 
            onClick={handleNew}
          >
            + Nouvelle Demande
          </Button>
        </HStack>
      </CardHeader>

      <Divider />

      <CardBody>
        {/* ALERTE SÉCURITÉ */}
        <Alert status="info" mb={4} borderRadius="md">
          <AlertIcon />
          Cet espace est personnel. Seules vos demandes apparaissent.
        </Alert>

        {loading && requests.length === 0 ? (
          <Flex justify="center" py={10}>
            <Spinner />
          </Flex>
        ) : requests.length === 0 ? (
          <Box textAlign="center" py={10} color="gray.500">
            <Text mb={4}>Aucune demande pour le moment</Text>
            <Button colorScheme="blue" size="sm" onClick={handleNew}>
              Créer une demande
            </Button>
          </Box>
        ) : (
          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList>
              <Tab>Toutes ({requests.length})</Tab>
              <Tab>En attente ({requests.filter(r => r.status === 'PENDING').length})</Tab>
              <Tab>Devis reçus ({requests.filter(r => r.status === 'QUOTED').length})</Tab>
              <Tab>Acceptés ({requests.filter(r => r.status === 'ACCEPTED').length})</Tab>
            </TabList>

            <TabPanels>
              {/* Toutes les demandes */}
              <TabPanel>
                <Table size="sm" variant="striped">
                  <Thead>
                    <Tr>
                      <Th>Titre</Th>
                      <Th>Catégorie</Th>
                      <Th>Statut</Th>
                      <Th>Date</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {requests.map((request) => (
                      <Tr key={request.id}>
                        <Td fontWeight="medium">{request.title}</Td>
                        <Td fontSize="sm">{request.category}</Td>
                        <Td>{getStatusBadge(request.status)}</Td>
                        <Td fontSize="sm">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            <IconButton
                              icon={<ViewIcon />}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetails(request)}
                              title="Voir détails"
                            />
                            {request.status === 'PENDING' && (
                              <>
                                <IconButton
                                  icon={<EditIcon />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="blue"
                                  onClick={() => handleEdit(request)}
                                  title="Éditer"
                                />
                                <IconButton
                                  icon={<DeleteIcon />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => handleDelete(request.id)}
                                  title="Supprimer"
                                />
                              </>
                            )}
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TabPanel>

              {/* En attente */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {requests.filter(r => r.status === 'PENDING').map((request) => (
                    <Box key={request.id} p={4} border="1px solid" borderColor="yellow.200" borderRadius="md">
                      <HStack justify="space-between" mb={2}>
                        <Heading size="sm">{request.title}</Heading>
                        <Badge colorScheme="yellow">En attente</Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600" mb={3}>
                        {request.description}
                      </Text>
                      <HStack spacing={2}>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(request)}>
                          Éditer
                        </Button>
                        <Button size="sm" variant="outline" colorScheme="red" onClick={() => handleDelete(request.id)}>
                          Supprimer
                        </Button>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </TabPanel>

              {/* Devis reçus */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {requests.filter(r => r.status === 'QUOTED').map((request) => (
                    <Box key={request.id} p={4} border="1px solid" borderColor="purple.200" borderRadius="md">
                      <HStack justify="space-between" mb={2}>
                        <Heading size="sm">{request.title}</Heading>
                        <Badge colorScheme="purple">Devis reçu</Badge>
                      </HStack>
                      {request.quotes && request.quotes.length > 0 ? (
                        <>
                          <Stack spacing={2} mb={3}>
                            {request.quotes.map((quote) => (
                              <Box key={quote.id} p={3} bg="gray.50" borderRadius="md">
                                <HStack justify="space-between" mb={2}>
                                  <VStack align="start" spacing={0}>
                                    <Text fontWeight="bold">{quote.numero}</Text>
                                    <Text fontSize="sm" color="gray.600">{quote.titre}</Text>
                                  </VStack>
                                  <Text fontWeight="bold" fontSize="lg">
                                    {quote.montant}€
                                  </Text>
                                </HStack>
                                <HStack spacing={2}>
                                  <Button size="sm" colorScheme="green" leftIcon={<CheckIcon />}
                                    onClick={() => handleAcceptQuote(quote.id)}>
                                    Accepter
                                  </Button>
                                  <Button size="sm" variant="outline" colorScheme="red" leftIcon={<CloseIcon />}
                                    onClick={() => handleRefuseQuote(quote.id)}>
                                    Refuser
                                  </Button>
                                </HStack>
                              </Box>
                            ))}
                          </Stack>
                        </>
                      ) : (
                        <Text fontSize="sm" color="gray.600">Pas de devis pour cette demande</Text>
                      )}
                    </Box>
                  ))}
                </VStack>
              </TabPanel>

              {/* Acceptés */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {requests.filter(r => r.status === 'ACCEPTED').map((request) => (
                    <Box key={request.id} p={4} border="1px solid" borderColor="green.200" borderRadius="md" bg="green.50">
                      <HStack justify="space-between" mb={2}>
                        <Heading size="sm">{request.title}</Heading>
                        <Badge colorScheme="green">Accepté ✓</Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        Merci d'avoir accepté notre devis. Nous vous contacterons sous peu.
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}
      </CardBody>

      {/* MODAL FORMULAIRE */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingId ? 'Modifier la demande' : 'Nouvelle demande'}
          </ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Titre/Objet de la demande</FormLabel>
                  <Input
                    placeholder="Ex: Réparation moteur"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Description détaillée</FormLabel>
                  <Textarea
                    placeholder="Décrivez votre demande en détail..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    minH="150px"
                  />
                </FormControl>

                <Grid templateColumns="1fr 1fr" gap={4} width="100%">
                  <FormControl>
                    <FormLabel>Catégorie</FormLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="GENERAL">Général</option>
                      <option value="REPAIR">Réparation</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="SERVICE">Service</option>
                      <option value="CUSTOM">Personnalisé</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Priorité</FormLabel>
                    <Select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="LOW">Basse</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">Élevée</option>
                      <option value="URGENT">Urgent</option>
                    </Select>
                  </FormControl>
                </Grid>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <HStack spacing={3}>
                <Button variant="outline" onClick={onClose}>
                  Annuler
                </Button>
                <Button colorScheme="blue" type="submit" isLoading={loading}>
                  {editingId ? 'Mettre à jour' : 'Créer'}
                </Button>
              </HStack>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* MODAL DÉTAILS */}
      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Détails de la demande</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRequest && (
              <VStack spacing={4} align="start" width="100%">
                <Box>
                  <Text fontWeight="bold">Titre:</Text>
                  <Text>{selectedRequest.title}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Description:</Text>
                  <Text whiteSpace="pre-wrap">{selectedRequest.description}</Text>
                </Box>
                <HStack spacing={8}>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">Catégorie:</Text>
                    <Text>{selectedRequest.category}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">Priorité:</Text>
                    <Text>{selectedRequest.priority}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">Statut:</Text>
                    {getStatusBadge(selectedRequest.status)}
                  </Box>
                </HStack>

                {selectedRequest.files && selectedRequest.files.length > 0 && (
                  <Box width="100%">
                    <Text fontWeight="bold" mb={2}>Fichiers:</Text>
                    <VStack align="start" spacing={2}>
                      {selectedRequest.files.map((file) => (
                        <Button
                          key={file.id}
                          size="sm"
                          variant="outline"
                          leftIcon={<DownloadIcon />}
                          as="a"
                          href={file.fileUrl}
                          download
                        >
                          {file.fileName}
                        </Button>
                      ))}
                    </VStack>
                  </Box>
                )}

                {selectedRequest.quotes && selectedRequest.quotes.length > 0 && (
                  <Box width="100%">
                    <Text fontWeight="bold" mb={2}>Devis:</Text>
                    <VStack spacing={2} align="stretch">
                      {selectedRequest.quotes.map((quote) => (
                        <Box key={quote.id} p={3} bg="blue.50" borderRadius="md">
                          <HStack justify="space-between" mb={2}>
                            <Box>
                              <Text fontWeight="bold">{quote.numero}</Text>
                              <Text fontSize="sm">{quote.titre}</Text>
                            </Box>
                            <Text fontWeight="bold">{quote.montant}€</Text>
                          </HStack>
                          {selectedRequest.status === 'QUOTED' && (
                            <HStack spacing={2}>
                              <Button size="sm" colorScheme="green" onClick={() => handleAcceptQuote(quote.id)}>
                                Accepter
                              </Button>
                              <Button size="sm" variant="outline" colorScheme="red" onClick={() => handleRefuseQuote(quote.id)}>
                                Refuser
                              </Button>
                            </HStack>
                          )}
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Card>
  );
}
