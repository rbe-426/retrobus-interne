import React from 'react';
import { Box, Container, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, VStack, FormControl, FormLabel, Input, Textarea, Select, Grid, HStack, Button, Table, Thead, Tbody, Tr, Th, Td, Spinner, Flex, Text, IconButton, Alert, AlertIcon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter, useDisclosure, useToast, Badge, Card, CardHeader, CardBody, Divider } from '@chakra-ui/react';
import { DeleteIcon, EditIcon, ViewIcon, DownloadIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons';
import PageLayout from '../components/Layout/PageLayout';
import { apiClient } from '../api/config';
import { useState, useEffect, useCallback } from 'react';

export default function RetroRequests() {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'NORMAL'
  });
  const [editingId, setEditingId] = useState(null);

  // Charger les demandes
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/retro-requests');
      if (response.requests) {
        setRequests(response.requests);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les demandes',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Créer/Modifier
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
        response = await apiClient.put(`/api/retro-requests/${editingId}`, formData);
        setRequests(requests.map(r => r.id === editingId ? response : r));
        toast({ title: 'Succès', description: 'Demande mise à jour', status: 'success', duration: 3000, isClosable: true });
      } else {
        response = await apiClient.post('/api/retro-requests', formData);
        setRequests([response, ...requests]);
        
        // Envoyer des emails après création
        try {
          await apiClient.post(`/api/retro-requests/${response.id}/send-emails`, {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            priority: formData.priority
          });
        } catch (emailError) {
          console.error('Erreur envoi emails:', emailError);
          // Ne pas bloquer si les emails échouent
        }
        
        toast({ title: 'Succès', description: 'Demande créée et email envoyé', status: 'success', duration: 3000, isClosable: true });
      }
      setFormData({ title: '', description: '', category: 'GENERAL', priority: 'NORMAL' });
      setEditingId(null);
      onClose();
    } catch (error) {
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

  const handleNew = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', category: 'GENERAL', priority: 'NORMAL' });
    onOpen();
  };

  const handleEdit = (request) => {
    if (request.status !== 'PENDING') {
      toast({ title: 'Impossible', description: 'Seules les demandes en attente peuvent être modifiées', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    setEditingId(request.id);
    setFormData({ title: request.title, description: request.description, category: request.category, priority: request.priority });
    onOpen();
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm('Êtes-vous sûr?')) return;
    try {
      await apiClient.delete(`/api/retro-requests/${requestId}`);
      setRequests(requests.filter(r => r.id !== requestId));
      toast({ title: 'Succès', description: 'Demande supprimée', status: 'success', duration: 3000, isClosable: true });
    } catch (error) {
      toast({ title: 'Erreur', description: error.response?.data?.error || 'Erreur suppression', status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    onPreviewOpen();
  };

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
    <PageLayout
      title="RétroDemandes"
      subtitle="Gérez vos demandes et consultez vos devis"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/home" },
        { label: "RétroDemandes", href: "/dashboard/retro-requests" }
      ]}
    >
      <Container maxW="7xl" py={8}>
        <Card>
          <CardHeader>
            <Tabs variant="soft-rounded" colorScheme="blue" defaultIndex={0}>
              <TabList>
                <Tab>Créer une demande</Tab>
                <Tab>Mes demandes ({requests.length})</Tab>
              </TabList>

              <TabPanels>
                {/* TAB 1: CRÉER */}
                <TabPanel>
                  <Box pt={4}>
                    <VStack spacing={4} align="stretch" as="form" onSubmit={handleSubmit}>
                      <FormControl isRequired>
                        <FormLabel>Titre de la demande</FormLabel>
                        <Input
                          placeholder="Ex: Révision complète"
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
                          minH="200px"
                        />
                      </FormControl>

                      <Grid templateColumns="1fr 1fr" gap={4}>
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

                      <HStack spacing={3} justify="flex-end">
                        <Button variant="outline" onClick={() => setFormData({ title: '', description: '', category: 'GENERAL', priority: 'NORMAL' })}>
                          Annuler
                        </Button>
                        <Button colorScheme="blue" type="submit" isLoading={loading}>
                          Créer
                        </Button>
                      </HStack>
                    </VStack>
                  </Box>
                </TabPanel>

                {/* TAB 2: MES DEMANDES */}
                <TabPanel>
                  <Box pt={4}>
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
                              <Td fontSize="sm">{new Date(request.createdAt).toLocaleDateString()}</Td>
                              <Td>
                                <HStack spacing={2}>
                                  <IconButton icon={<ViewIcon />} size="sm" variant="ghost" onClick={() => handleViewDetails(request)} title="Voir détails" />
                                  {request.status === 'PENDING' && (
                                    <>
                                      <IconButton icon={<EditIcon />} size="sm" variant="ghost" colorScheme="blue" onClick={() => handleEdit(request)} title="Éditer" />
                                      <IconButton icon={<DeleteIcon />} size="sm" variant="ghost" colorScheme="red" onClick={() => handleDelete(request.id)} title="Supprimer" />
                                    </>
                                  )}
                                </HStack>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    )}
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardHeader>
        </Card>
      </Container>

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
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </PageLayout>
  );
}
