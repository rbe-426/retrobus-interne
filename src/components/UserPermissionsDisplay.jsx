import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Grid,
  Heading,
  VStack,
  HStack,
  Badge,
  Text,
  Alert,
  AlertIcon,
  Divider,
  Spinner,
  useColorModeValue,
  SimpleGrid
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, LockIcon } from '@chakra-ui/icons';
import { useUser } from '../context/UserContext';
import { useUserPermissions } from '../hooks/useUserPermissions';

/**
 * UserPermissionsDisplay - Affiche les permissions de l'utilisateur actuel
 */
export default function UserPermissionsDisplay() {
  const { user } = useUser();
  const { permissions, loading } = useUserPermissions(user?.id);

  const RESOURCES = {
    'VEHICLES': { label: '🚗 Véhicules', color: 'teal' },
    'EVENTS': { label: '🎉 Événements', color: 'green' },
    'PLANNING': { label: '📅 Planning', color: 'orange' },
    'FINANCE': { label: '💰 Finance', color: 'cyan' },
    'MEMBERS': { label: '👥 Adhérents', color: 'blue' },
    'STOCK': { label: '📦 Stock', color: 'yellow' },
    'NEWSLETTER': { label: '📧 Newsletter', color: 'purple' },
    'SITE_MANAGEMENT': { label: '🌐 Gestion du Site', color: 'pink' }
  };

  const ACTIONS_LABELS = {
    'READ': 'Lecture',
    'CREATE': 'Créer',
    'EDIT': 'Modifier',
    'DELETE': 'Supprimer'
  };

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
        <Text mt={4}>Chargement de vos permissions...</Text>
      </Box>
    );
  }

  const isExpired = (expiresAt) => {
    return expiresAt && new Date(expiresAt) < new Date();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const daysUntilExpiration = (expiresAt) => {
    if (!expiresAt) return null;
    const today = new Date();
    const expiration = new Date(expiresAt);
    const diffTime = expiration - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Regrouper les permissions par ressource
  const permissionsByResource = {};
  permissions.forEach(p => {
    if (!permissionsByResource[p.resource]) {
      permissionsByResource[p.resource] = [];
    }
    permissionsByResource[p.resource].push(p);
  });

  return (
    <VStack spacing={6} align="stretch">
      {/* Vue d'ensemble */}
      <Card>
        <CardHeader>
          <Heading size="md">📋 Vue d'ensemble</Heading>
        </CardHeader>
        <Divider />
        <CardBody>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Box p={4} bg={useColorModeValue('blue.50', 'blue.900')} borderRadius="md">
              <Text fontSize="sm" color="gray.600">Permissions actives</Text>
              <Heading size="lg" color="blue.600">
                {permissions.filter(p => !isExpired(p.expiresAt)).length}
              </Heading>
            </Box>
            <Box p={4} bg={useColorModeValue('orange.50', 'orange.900')} borderRadius="md">
              <Text fontSize="sm" color="gray.600">Permissions expirées</Text>
              <Heading size="lg" color="orange.600">
                {permissions.filter(p => isExpired(p.expiresAt)).length}
              </Heading>
            </Box>
          </Grid>
        </CardBody>
      </Card>

      {/* Permissions actives */}
      {Object.keys(permissionsByResource).length > 0 ? (
        <Box>
          <Heading size="md" mb={4}>🔓 Vos accès</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {Object.entries(permissionsByResource).map(([resource, perms]) => {
              const activePerms = perms.filter(p => !isExpired(p.expiresAt));
              const expiredPerms = perms.filter(p => isExpired(p.expiresAt));

              return (
                <Card key={resource}>
                  <CardBody>
                    <VStack align="start" spacing={4}>
                      <HStack justify="space-between" w="full">
                        <Text fontWeight="bold" fontSize="lg">
                          {RESOURCES[resource]?.label || resource}
                        </Text>
                        <Badge colorScheme={RESOURCES[resource]?.color || 'gray'}>
                          {activePerms.length} actif{activePerms.length > 1 ? 's' : ''}
                        </Badge>
                      </HStack>

                      {activePerms.length > 0 && (
                        <Box w="full">
                          <Text fontSize="sm" fontWeight="bold" mb={2}>Actions autorisées:</Text>
                          <HStack spacing={2} flexWrap="wrap">
                            {activePerms[0].actions.map(action => (
                              <Badge key={action} colorScheme="green" variant="subtle">
                                ✓ {ACTIONS_LABELS[action]}
                              </Badge>
                            ))}
                          </HStack>
                        </Box>
                      )}

                      {activePerms[0]?.reason && (
                        <Box w="full" fontSize="sm" p={2} bg="gray.100" borderRadius="md">
                          <Text color="gray.700">{activePerms[0].reason}</Text>
                        </Box>
                      )}

                      {activePerms[0]?.expiresAt && (
                        <HStack spacing={2} fontSize="xs" w="full">
                          <WarningIcon />
                          <Text>
                            Expire dans {daysUntilExpiration(activePerms[0].expiresAt)} jours
                            ({formatDate(activePerms[0].expiresAt)})
                          </Text>
                        </HStack>
                      )}

                      {expiredPerms.length > 0 && (
                        <Alert status="info" borderRadius="md" fontSize="sm">
                          <AlertIcon />
                          {expiredPerms.length} permission{expiredPerms.length > 1 ? 's' : ''} expirée{expiredPerms.length > 1 ? 's' : ''}
                        </Alert>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              );
            })}
          </SimpleGrid>
        </Box>
      ) : (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Aucune permission spécifique</Text>
            <Text fontSize="sm" mt={1}>
              Vous accédez aux ressources selon votre rôle. Contactez un administrateur pour demander des permissions supplémentaires.
            </Text>
          </Box>
        </Alert>
      )}

      {/* Légende */}
      <Card>
        <CardHeader>
          <Heading size="sm">📖 Légende des actions</Heading>
        </CardHeader>
        <Divider />
        <CardBody>
          <Grid templateColumns={{ base: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }} gap={4}>
            {Object.entries(ACTIONS_LABELS).map(([action, label]) => (
              <HStack key={action} spacing={2}>
                <Badge colorScheme="green">{action}</Badge>
                <Text fontSize="sm">{label}</Text>
              </HStack>
            ))}
          </Grid>
        </CardBody>
      </Card>
    </VStack>
  );
}
