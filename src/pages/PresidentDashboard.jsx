import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Flex,
  Text,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Divider,
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  useToast,
} from '@chakra-ui/react';
import { ViewIcon, DownloadIcon } from '@chakra-ui/icons';
import PageLayout from '../components/Layout/PageLayout';
import { apiClient } from '../api/config';

export default function PresidentDashboard() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [statusCount, setStatusCount] = useState({
    PENDING: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/president/retro-requests');
      if (response.requests) {
        setRequests(response.requests);
        if (response.statusCount) {
          setStatusCount(response.statusCount);
        }
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les demandes',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRequests();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'orange',
      IN_PROGRESS: 'blue',
      COMPLETED: 'green',
      CANCELLED: 'red',
    };
    return colors[status] || 'gray';
  };

  const getStatusLabel = (status) => {
    const labels = {
      PENDING: 'En attente',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Terminé',
      CANCELLED: 'Annulé',
    };
    return labels[status] || status;
  };

  const filteredRequests = selectedStatus
    ? requests.filter((r) => r.status === selectedStatus)
    : requests;

  return (
    <PageLayout>
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Titre */}
          <Box>
            <Heading as="h1" size="xl" mb={2}>
              📊 Récapitulatif des Demandes
            </Heading>
            <Text color="gray.600">
              Suivi global de toutes les RétroDemandes de l'association
            </Text>
          </Box>

          {/* Statistiques */}
          <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
            <Card bg="orange.50" border="2px solid" borderColor="orange.200">
              <CardBody>
                <Stat>
                  <StatLabel>En attente</StatLabel>
                  <StatNumber color="orange.600">{statusCount.PENDING}</StatNumber>
                </Stat>
              </CardBody>
            </Card>

            <Card bg="blue.50" border="2px solid" borderColor="blue.200">
              <CardBody>
                <Stat>
                  <StatLabel>En cours</StatLabel>
                  <StatNumber color="blue.600">{statusCount.IN_PROGRESS}</StatNumber>
                </Stat>
              </CardBody>
            </Card>

            <Card bg="green.50" border="2px solid" borderColor="green.200">
              <CardBody>
                <Stat>
                  <StatLabel>Terminées</StatLabel>
                  <StatNumber color="green.600">{statusCount.COMPLETED}</StatNumber>
                </Stat>
              </CardBody>
            </Card>

            <Card bg="red.50" border="2px solid" borderColor="red.200">
              <CardBody>
                <Stat>
                  <StatLabel>Annulées</StatLabel>
                  <StatNumber color="red.600">{statusCount.CANCELLED}</StatNumber>
                </Stat>
              </CardBody>
            </Card>

            <Card bg="gray.50" border="2px solid" borderColor="gray.200">
              <CardBody>
                <Stat>
                  <StatLabel>Total</StatLabel>
                  <StatNumber color="gray.700">
                    {Object.values(statusCount).reduce((a, b) => a + b, 0)}
                  </StatNumber>
                </Stat>
              </CardBody>
            </Card>
          </Grid>

          {/* Filtres */}
          <HStack spacing={2} flexWrap="wrap">
            <Text fontWeight="bold">Filtrer par statut:</Text>
            <Button
              size="sm"
              variant={selectedStatus === null ? 'solid' : 'outline'}
              onClick={() => setSelectedStatus(null)}
              colorScheme="gray"
            >
              Tous ({requests.length})
            </Button>
            <Button
              size="sm"
              variant={selectedStatus === 'PENDING' ? 'solid' : 'outline'}
              onClick={() => setSelectedStatus('PENDING')}
              colorScheme="orange"
            >
              En attente
            </Button>
            <Button
              size="sm"
              variant={selectedStatus === 'IN_PROGRESS' ? 'solid' : 'outline'}
              onClick={() => setSelectedStatus('IN_PROGRESS')}
              colorScheme="blue"
            >
              En cours
            </Button>
            <Button
              size="sm"
              variant={selectedStatus === 'COMPLETED' ? 'solid' : 'outline'}
              onClick={() => setSelectedStatus('COMPLETED')}
              colorScheme="green"
            >
              Terminées
            </Button>
            <Button
              size="sm"
              variant={selectedStatus === 'CANCELLED' ? 'solid' : 'outline'}
              onClick={() => setSelectedStatus('CANCELLED')}
              colorScheme="red"
            >
              Annulées
            </Button>
          </HStack>

          {/* Tableau */}
          <Card>
            <CardHeader>
              <Flex justify="space-between" align="center">
                <Heading size="md">
                  Demandes ({filteredRequests.length})
                </Heading>
                <Button size="sm" leftIcon={<DownloadIcon />} colorScheme="blue" onClick={() => {
                  // Exporter en CSV
                  const headers = ['id','number','status','createdAt','userId','title','totalQuotes'];
                  const rows = filteredRequests.map(r => ([
                    r.id,
                    r.number || '',
                    r.status || '',
                    r.createdAt ? new Date(r.createdAt).toISOString() : '',
                    r.userId || '',
                    (r.title || '').replace(/\r?\n/g,' '),
                    r.quotes ? r.quotes.length : 0
                  ]));
                  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `retro_requests_${new Date().toISOString().slice(0,10)}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                }}>
                  Exporter
                </Button>
              </Flex>
            </CardHeader>
            <Divider />
            <CardBody>
              {loading ? (
                <Flex justify="center" align="center" py={10}>
                  <Spinner size="lg" />
                </Flex>
              ) : filteredRequests.length === 0 ? (
                <Text textAlign="center" color="gray.500" py={10}>
                  Aucune demande à afficher
                </Text>
              ) : (
                <Box overflowX="auto">
                  <Table size="sm" variant="striped">
                    <Thead>
                      <Tr bg="gray.50">
                        <Th>ID</Th>
                        <Th>Auteur</Th>
                        <Th>Titre</Th>
                        <Th>Catégorie</Th>
                        <Th>Priorité</Th>
                        <Th>Statut</Th>
                        <Th>Créée le</Th>
                        <Th>Devis</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredRequests.map((request) => (
                        <Tr key={request.id} _hover={{ bg: 'gray.50' }}>
                          <Td fontSize="xs" fontFamily="mono">
                            {request.id.slice(0, 8)}...
                          </Td>
                          <Td>
                            <Text fontSize="sm">{request.userName || 'N/A'}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {request.userEmail || 'N/A'}
                            </Text>
                          </Td>
                          <Td>
                            <Text fontWeight="medium" noOfLines={2}>
                              {request.title}
                            </Text>
                          </Td>
                          <Td>
                            <Badge fontSize="xs">{request.category || 'N/A'}</Badge>
                          </Td>
                          <Td>
                            <Badge
                              fontSize="xs"
                              colorScheme={
                                request.priority === 'HIGH'
                                  ? 'red'
                                  : request.priority === 'MEDIUM'
                                  ? 'yellow'
                                  : 'green'
                              }
                            >
                              {request.priority || 'NORMAL'}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(request.status)}>
                              {getStatusLabel(request.status)}
                            </Badge>
                          </Td>
                          <Td fontSize="xs">
                            {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                          </Td>
                          <Td>
                            {request.quotes && request.quotes.length > 0 ? (
                              <Badge colorScheme="green">{request.quotes.length}</Badge>
                            ) : (
                              <Text fontSize="xs" color="gray.500">
                                0
                              </Text>
                            )}
                          </Td>
                          <Td>
                            <Button size="xs" leftIcon={<ViewIcon />} variant="ghost">
                              Voir
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </PageLayout>
  );
}
