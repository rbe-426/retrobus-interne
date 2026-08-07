import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Grid,
  Heading,
  HStack,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  VStack,
  useToast,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Divider
} from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';

/**
 * PermissionStats - Affiche les statistiques globales des permissions
 */
export default function PermissionStats() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [allPermissions, setAllPermissions] = useState([]);
  const [stats, setStats] = useState({
    totalPermissions: 0,
    usersWithPermissions: 0,
    resourceCounts: {},
    actionCounts: {}
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user-permissions');
      const data = await response.json();

      if (data.success) {
        const permissions = data.permissions || [];
        setAllPermissions(permissions);

        // Calculer les statistiques
        const resourceCounts = {};
        const actionCounts = {};
        const usersSet = new Set();

        permissions.forEach(perm => {
          usersSet.add(perm.userId);
          
          // Compter par ressource
          resourceCounts[perm.resource] = (resourceCounts[perm.resource] || 0) + 1;

          // Compter par action
          const actions = Array.isArray(perm.actions) 
            ? perm.actions 
            : JSON.parse(perm.actions || '[]');
          actions.forEach(action => {
            actionCounts[action] = (actionCounts[action] || 0) + 1;
          });
        });

        setStats({
          totalPermissions: permissions.length,
          usersWithPermissions: usersSet.size,
          resourceCounts,
          actionCounts
        });
      } else {
        toast({
          title: 'Erreur',
          description: data.error || 'Impossible de charger les statistiques',
          status: 'error',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/user-permissions/export/all');
      const data = await response.json();

      if (data.success) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `permissions-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Succès',
          description: 'Permissions exportées',
          status: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter les permissions',
        status: 'error',
        duration: 3000
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardBody textAlign="center" py={8}>
          <Spinner />
        </CardBody>
      </Card>
    );
  }

  const RESOURCES = {
    'VEHICLES': '🚗 Véhicules',
    'EVENTS': '🎉 Événements',
    'FINANCE': '💰 Finance',
    'MEMBERS': '👥 Adhérents',
    'STOCK': '📦 Stock',
    'SITE_MANAGEMENT': '🌐 Gestion du Site',
    'NEWSLETTER': '📧 Newsletter',
    'PLANNING': '📅 Planning'
  };

  const ACTIONS_LABELS = {
    'READ': 'Lecture',
    'CREATE': 'Créer',
    'EDIT': 'Modifier',
    'DELETE': 'Supprimer'
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Résumé */}
      <Grid templateColumns={{ base: '1fr 1fr', md: '1fr 1fr' }} gap={4}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Permissions totales</StatLabel>
              <StatNumber fontSize="2xl" color="blue.600">
                {stats.totalPermissions}
              </StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Utilisateurs avec permissions</StatLabel>
              <StatNumber fontSize="2xl" color="green.600">
                {stats.usersWithPermissions}
              </StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </Grid>

      {/* Permissions par ressource */}
      <Card>
        <CardHeader>
          <Heading size="md">📊 Permissions par ressource</Heading>
        </CardHeader>
        <Divider />
        <CardBody>
          {Object.keys(stats.resourceCounts).length === 0 ? (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              Aucune permission attribuée
            </Alert>
          ) : (
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              {Object.entries(stats.resourceCounts).map(([resource, count]) => (
                <Box key={resource} p={4} bg="gray.50" borderRadius="md" borderLeft="4px" borderColor="blue.500">
                  <Heading size="sm">
                    {RESOURCES[resource] || resource}
                  </Heading>
                  <StatNumber fontSize="xl" color="blue.600" mt={2}>
                    {count} {count > 1 ? 'permissions' : 'permission'}
                  </StatNumber>
                </Box>
              ))}
            </Grid>
          )}
        </CardBody>
      </Card>

      {/* Actions les plus utilisées */}
      <Card>
        <CardHeader>
          <Heading size="md">🔑 Actions les plus utilisées</Heading>
        </CardHeader>
        <Divider />
        <CardBody>
          <Grid templateColumns={{ base: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }} gap={4}>
            {Object.entries(stats.actionCounts).map(([action, count]) => (
              <Box key={action} p={4} bg="gray.50" borderRadius="md" textAlign="center">
                <StatLabel fontSize="sm">
                  {ACTIONS_LABELS[action] || action}
                </StatLabel>
                <StatNumber fontSize="2xl" color="green.600">
                  {count}
                </StatNumber>
              </Box>
            ))}
          </Grid>
        </CardBody>
      </Card>

      {/* Actions */}
      <HStack>
        <Button
          leftIcon={<DownloadIcon />}
          colorScheme="blue"
          onClick={handleExport}
        >
          Exporter toutes les permissions
        </Button>
        <Button
          variant="outline"
          onClick={loadStats}
        >
          Rafraîchir
        </Button>
      </HStack>
    </VStack>
  );
}
