import React, { useState, useEffect } from 'react';
import {
  Box, Container, VStack, HStack, Button, Badge, Card, CardBody, CardHeader, Heading, Text,
  Table, Thead, Tbody, Tr, Th, Td, Select, useToast, Spinner, Alert, AlertIcon,
  SimpleGrid, Stat, StatLabel, StatNumber
} from '@chakra-ui/react';
import { vehicleAdminAPI } from '../../api/vehicleAdmin';

export const EchancierPage = () => {
  const [echancier, setEchancier] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const toast = useToast();

  useEffect(() => {
    loadEchancier();
  }, []);

  const loadEchancier = async () => {
    try {
      setLoading(true);
      const data = await vehicleAdminAPI.getAllEchancier();
      setEchancier(data.echancier || data || []);
    } catch (error) {
      toast({ status: 'error', title: 'Erreur de chargement', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const filtered = echancier.filter(item => 
    filterStatus === 'all' ? true : item.status === filterStatus
  );

  const stats = {
    pending: echancier.filter(e => e.status === 'pending').length,
    done: echancier.filter(e => e.status === 'done').length,
    expired: echancier.filter(e => e.status === 'expired').length,
    total: echancier.length
  };

  // Identifier les éléments en retard
  const isExpired = (dueDate) => new Date(dueDate) < new Date();

  const handleStatusChange = async (id, parc, newStatus) => {
    try {
      await vehicleAdminAPI.updateEchancierItem(parc, id, { status: newStatus });
      loadEchancier();
      toast({ status: 'success', title: 'Statut mis à jour' });
    } catch (error) {
      toast({ status: 'error', title: 'Erreur', description: error.message });
    }
  };

  if (loading) return <Spinner />;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* En-tête */}
        <Box>
          <Heading size="lg">📅 Échéancier Administratif</Heading>
          <Text color="gray.600">Suivi des assurances, CT, cartes grises et renouvellements</Text>
        </Box>

        {/* Statistiques */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <StatCard label="Total" value={stats.total} color="blue" />
          <StatCard label="En attente" value={stats.pending} color="orange" />
          <StatCard label="Complétés" value={stats.done} color="green" />
          <StatCard label="En retard" value={stats.expired} color="red" />
        </SimpleGrid>

        {/* Alertes d'expiration */}
        {stats.expired > 0 && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            ⚠️ {stats.expired} élément(s) en retard - Action requise !
          </Alert>
        )}

        {/* Filtres */}
        <HStack spacing={4}>
          <Text fontWeight="bold">Filtrer par :</Text>
          <Select 
            maxW="250px" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="done">Complétés</option>
            <option value="expired">En retard</option>
          </Select>
        </HStack>

        {/* Tableau d'échéancier */}
        <Card>
          <CardHeader>
            <Heading size="md">Liste de l'Échéancier</Heading>
          </CardHeader>
          <CardBody>
            {filtered.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>
                Aucun élément ne correspond à vos critères
              </Text>
            ) : (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr bg="gray.50">
                    <Th>Véhicule</Th>
                    <Th>Type</Th>
                    <Th>Description</Th>
                    <Th>Date d'échéance</Th>
                    <Th>Statut</Th>
                    <Th>Jours restants</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filtered.map(item => {
                    const dueDate = new Date(item.dueDate);
                    const today = new Date();
                    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    const isLate = isExpired(item.dueDate);

                    return (
                      <Tr 
                        key={item.id}
                        bg={isLate && item.status !== 'done' ? 'red.50' : item.status === 'done' ? 'green.50' : 'white'}
                      >
                        <Td fontWeight="bold">{item.parc}</Td>
                        <Td>
                          <Badge colorScheme={getTypeColor(item.type)}>
                            {item.type === 'assurance' ? '🔒 Assurance' : 
                             item.type === 'ct' ? '🔧 CT' : 
                             item.type === 'cg' ? '🚗 CG' : item.type}
                          </Badge>
                        </Td>
                        <Td fontSize="sm">{item.description}</Td>
                        <Td>{dueDate.toLocaleDateString('fr-FR')}</Td>
                        <Td>
                          <HStack spacing={2}>
                            <Badge 
                              colorScheme={
                                item.status === 'done' ? 'green' :
                                isLate ? 'red' : 'blue'
                              }
                            >
                              {item.status === 'done' ? '✅ Fait' :
                               isLate ? '🔴 En retard' : '⏳ En attente'}
                            </Badge>
                          </HStack>
                        </Td>
                        <Td>
                          <Text 
                            fontWeight="bold"
                            color={daysLeft < 0 ? 'red.600' : daysLeft < 7 ? 'orange.600' : 'green.600'}
                          >
                            {daysLeft < 0 ? `-${Math.abs(daysLeft)} jours` : `${daysLeft} jours`}
                          </Text>
                        </Td>
                        <Td>
                          {item.status !== 'done' && (
                            <Button 
                              size="xs" 
                              colorScheme="green"
                              onClick={() => handleStatusChange(item.id, item.parc, 'done')}
                            >
                              Marquer fait
                            </Button>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Résumé par type */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <TypeSummary 
            type="assurance" 
            emoji="🔒" 
            items={filtered.filter(e => e.type === 'assurance')} 
          />
          <TypeSummary 
            type="ct" 
            emoji="🔧" 
            items={filtered.filter(e => e.type === 'ct')} 
          />
          <TypeSummary 
            type="cg" 
            emoji="🚗" 
            items={filtered.filter(e => e.type === 'cg')} 
          />
        </SimpleGrid>
      </VStack>
    </Container>
  );

  function StatCard({ label, value, color }) {
    return (
      <Card>
        <CardBody>
          <Stat>
            <StatLabel>{label}</StatLabel>
            <StatNumber color={`${color}.600`}>{value}</StatNumber>
          </Stat>
        </CardBody>
      </Card>
    );
  }

  function TypeSummary({ type, emoji, items }) {
    const pending = items.filter(e => e.status === 'pending').length;
    const done = items.filter(e => e.status === 'done').length;
    const expired = items.filter(e => isExpired(e.dueDate) && e.status !== 'done').length;

    const typeLabel = type === 'assurance' ? 'Assurances' :
                      type === 'ct' ? 'Contrôles Techniques' :
                      type === 'cg' ? 'Cartes Grises' : type;

    return (
      <Card>
        <CardHeader>
          <Heading size="sm">{emoji} {typeLabel}</Heading>
        </CardHeader>
        <CardBody>
          <VStack align="start" spacing={2}>
            <HStack spacing={4}>
              <Box>
                <Text fontSize="sm" color="gray.600">En attente</Text>
                <Text fontWeight="bold" fontSize="lg">{pending}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">Complétés</Text>
                <Text fontWeight="bold" fontSize="lg" color="green.600">{done}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">En retard</Text>
                <Text fontWeight="bold" fontSize="lg" color="red.600">{expired}</Text>
              </Box>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    );
  }
};

function getTypeColor(type) {
  return type === 'assurance' ? 'purple' :
         type === 'ct' ? 'orange' :
         type === 'cg' ? 'blue' : 'gray';
}
