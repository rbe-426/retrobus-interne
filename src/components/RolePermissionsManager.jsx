import React, { useState } from 'react';
import {
  Box, VStack, HStack, Heading, Card, CardBody, CardHeader,
  Badge, Button, Checkbox, Grid, GridItem, Text, Divider,
  Tabs, TabList, TabPanels, Tab, TabPanel, useToast,
  Alert, AlertIcon, Flex, Icon
} from '@chakra-ui/react';
import { FiCheck, FiX, FiChevronDown, FiChevronUp, FiSave } from 'react-icons/fi';
import {
  ROLE_PERMISSIONS,
  RESOURCES,
  PERMISSION_TYPES,
  getRoleLabel,
  getRoleColor,
  getAllRoles
} from '../lib/permissions';
import { apiClient } from '../api/config';

/**
 * Composant pour gérer les permissions des rôles
 */
export default function RolePermissionsManager() {
  const toast = useToast();
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [expandedResources, setExpandedResources] = useState({});
  const [permissions, setPermissions] = useState(ROLE_PERMISSIONS);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const toggleResourceExpanded = (resource) => {
    setExpandedResources(prev => ({
      ...prev,
      [resource]: !prev[resource]
    }));
  };

  const togglePermission = (role, resource, permType) => {
    const newPermissions = { ...permissions };
    const resourcePerms = newPermissions[role].permissions[resource] || [];
    
    if (resourcePerms.includes(permType)) {
      newPermissions[role].permissions[resource] = resourcePerms.filter(p => p !== permType);
    } else {
      newPermissions[role].permissions[resource] = [...resourcePerms, permType];
    }
    
    setPermissions(newPermissions);
    setUnsavedChanges(true);
  };

  const handleSavePermissions = async () => {
    try {
      // Ici vous pouvez envoyer les permissions au serveur
      const response = await apiClient.post('/admin/roles/permissions', {
        permissions: permissions
      });
      
      toast({
        title: 'Succès',
        description: 'Les permissions ont été sauvegardées',
        status: 'success',
        duration: 3000
      });
      setUnsavedChanges(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la sauvegarde des permissions',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleResetPermissions = () => {
    setPermissions(ROLE_PERMISSIONS);
    setUnsavedChanges(false);
  };

  const roles = getAllRoles();
  const roleConfig = permissions[selectedRole];
  const resourcesForRole = Object.keys(roleConfig?.permissions || {});

  // Grouper les ressources par catégorie
  const resourcesByCategory = {
    'Gestion du site': [
      RESOURCES.SITE_MANAGEMENT,
      RESOURCES.SITE_USERS,
      RESOURCES.SITE_CONFIG,
      RESOURCES.SITE_CONTENT
    ],
    'Véhicules': [
      RESOURCES.VEHICLES,
      RESOURCES.VEHICLE_VIEW,
      RESOURCES.VEHICLE_CREATE,
      RESOURCES.VEHICLE_EDIT,
      RESOURCES.VEHICLE_DELETE
    ],
    'Événements': [
      RESOURCES.EVENTS,
      RESOURCES.EVENT_VIEW,
      RESOURCES.EVENT_CREATE,
      RESOURCES.EVENT_EDIT,
      RESOURCES.EVENT_DELETE
    ],
    'Finances': [
      RESOURCES.FINANCE,
      RESOURCES.FINANCE_VIEW,
      RESOURCES.FINANCE_EDIT
    ],
    'Membres': [
      RESOURCES.MEMBERS,
      RESOURCES.MEMBER_VIEW,
      RESOURCES.MEMBER_EDIT,
      RESOURCES.MEMBER_DELETE
    ],
    'Stocks': [
      RESOURCES.STOCK,
      RESOURCES.STOCK_VIEW,
      RESOURCES.STOCK_EDIT
    ],
    'Communications': [
      RESOURCES.NEWSLETTER,
      RESOURCES.RETROMAIL
    ],
    'Administration': [
      RESOURCES.ADMIN_PANEL,
      RESOURCES.ADMIN_LOGS,
      RESOURCES.ADMIN_SETTINGS
    ]
  };

  const getResourceLabel = (resource) => {
    const labels = {
      [RESOURCES.SITE_MANAGEMENT]: 'Gestion du site',
      [RESOURCES.SITE_USERS]: 'Utilisateurs du site',
      [RESOURCES.SITE_CONFIG]: 'Configuration du site',
      [RESOURCES.SITE_CONTENT]: 'Contenu du site',
      [RESOURCES.VEHICLES]: 'Liste des véhicules',
      [RESOURCES.VEHICLE_VIEW]: 'Voir les véhicules',
      [RESOURCES.VEHICLE_CREATE]: 'Créer des véhicules',
      [RESOURCES.VEHICLE_EDIT]: 'Modifier les véhicules',
      [RESOURCES.VEHICLE_DELETE]: 'Supprimer les véhicules',
      [RESOURCES.EVENTS]: 'Liste des événements',
      [RESOURCES.EVENT_VIEW]: 'Voir les événements',
      [RESOURCES.EVENT_CREATE]: 'Créer des événements',
      [RESOURCES.EVENT_EDIT]: 'Modifier les événements',
      [RESOURCES.EVENT_DELETE]: 'Supprimer les événements',
      [RESOURCES.FINANCE]: 'Accès finances',
      [RESOURCES.FINANCE_VIEW]: 'Voir les finances',
      [RESOURCES.FINANCE_EDIT]: 'Modifier les finances',
      [RESOURCES.MEMBERS]: 'Liste des membres',
      [RESOURCES.MEMBER_VIEW]: 'Voir les membres',
      [RESOURCES.MEMBER_EDIT]: 'Modifier les membres',
      [RESOURCES.MEMBER_DELETE]: 'Supprimer les membres',
      [RESOURCES.STOCK]: 'Accès stocks',
      [RESOURCES.STOCK_VIEW]: 'Voir les stocks',
      [RESOURCES.STOCK_EDIT]: 'Modifier les stocks',
      [RESOURCES.NEWSLETTER]: 'Accès newsletter',
      [RESOURCES.RETROMAIL]: 'Accès retromail',
      [RESOURCES.ADMIN_PANEL]: 'Panneau admin',
      [RESOURCES.ADMIN_LOGS]: 'Voir les logs',
      [RESOURCES.ADMIN_SETTINGS]: 'Paramètres admin'
    };
    return labels[resource] || resource;
  };

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* En-tête */}
        <Box>
          <Heading size="lg" mb={2}>🔐 Gestion des permissions par rôle</Heading>
          <Text color="gray.600">
            Définissez les autorisations d'accès, de vue et de modification pour chaque rôle
          </Text>
        </Box>

        {/* Alerte changements non sauvegardés */}
        {unsavedChanges && (
          <Alert status="warning" rounded="md">
            <AlertIcon />
            Vous avez des changements non sauvegardés
          </Alert>
        )}

        {/* Sélection du rôle */}
        <Card>
          <CardHeader>
            <Heading size="md">Sélectionner un rôle</Heading>
          </CardHeader>
          <CardBody>
            <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={3}>
              {roles.map(role => (
                <Button
                  key={role.code}
                  onClick={() => setSelectedRole(role.code)}
                  colorScheme={getRoleColor(role.code)}
                  variant={selectedRole === role.code ? 'solid' : 'outline'}
                  size="sm"
                >
                  {role.label}
                </Button>
              ))}
            </Grid>
          </CardBody>
        </Card>

        {/* Détails du rôle sélectionné */}
        {roleConfig && (
          <Card>
            <CardHeader display="flex" justifyContent="space-between" alignItems="center">
              <VStack align="start" spacing={0}>
                <Heading size="md">
                  {roleConfig.label}
                </Heading>
                <Text fontSize="sm" color="gray.600">
                  Permissions pour ce rôle
                </Text>
              </VStack>
              <Badge colorScheme={getRoleColor(selectedRole)} fontSize="md" px={3} py={2}>
                {selectedRole}
              </Badge>
            </CardHeader>
            <Divider />
            <CardBody>
              <VStack spacing={6} align="stretch">
                {Object.entries(resourcesByCategory).map(([category, resources]) => {
                  const categoryResources = resources.filter(r => resourcesForRole.includes(r));
                  if (categoryResources.length === 0) return null;

                  return (
                    <Box key={category}>
                      <Heading size="sm" mb={3}>📁 {category}</Heading>
                      
                      <VStack spacing={3} pl={4}>
                        {categoryResources.map(resource => {
                          const perms = roleConfig.permissions[resource] || [];
                          const isExpanded = expandedResources[resource];

                          return (
                            <Box key={resource} width="100%">
                              <HStack
                                onClick={() => toggleResourceExpanded(resource)}
                                cursor="pointer"
                                pb={2}
                                _hover={{ bg: 'gray.50' }}
                                p={2}
                                rounded="md"
                              >
                                <Icon as={isExpanded ? FiChevronUp : FiChevronDown} />
                                <Text fontWeight="medium" flex={1}>
                                  {getResourceLabel(resource)}
                                </Text>
                                <HStack spacing={1}>
                                  {perms.length === 0 ? (
                                    <Badge size="sm" colorScheme="red">Aucune</Badge>
                                  ) : (
                                    perms.map(perm => (
                                      <Badge key={perm} size="sm" colorScheme="green">
                                        {perm === 'access' && '👁️ Accès'}
                                        {perm === 'view' && '👁️ Vue'}
                                        {perm === 'edit' && '✏️ Édition'}
                                      </Badge>
                                    ))
                                  )}
                                </HStack>
                              </HStack>

                              {isExpanded && (
                                <Box pl={8} py={3} bg="gray.50" rounded="md">
                                  <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                                    {Object.values(PERMISSION_TYPES).map(permType => (
                                      <HStack key={permType} spacing={2}>
                                        <Checkbox
                                          isChecked={perms.includes(permType)}
                                          onChange={() => togglePermission(selectedRole, resource, permType)}
                                        />
                                        <VStack align="start" spacing={0}>
                                          <Text fontWeight="medium" fontSize="sm">
                                            {permType === 'access' && '👁️ Accès'}
                                            {permType === 'view' && '👀 Vue'}
                                            {permType === 'edit' && '✏️ Édition'}
                                          </Text>
                                          <Text fontSize="xs" color="gray.500">
                                            {permType === 'access' && 'Peut accéder'}
                                            {permType === 'view' && 'Peut voir détails'}
                                            {permType === 'edit' && 'Peut modifier'}
                                          </Text>
                                        </VStack>
                                      </HStack>
                                    ))}
                                  </Grid>
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </VStack>
                    </Box>
                  );
                })}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Boutons d'action */}
        <HStack spacing={3} justify="flex-end">
          <Button
            variant="outline"
            onClick={handleResetPermissions}
            isDisabled={!unsavedChanges}
          >
            Réinitialiser
          </Button>
          <Button
            colorScheme="green"
            leftIcon={<FiSave />}
            onClick={handleSavePermissions}
            isDisabled={!unsavedChanges}
          >
            Sauvegarder les modifications
          </Button>
        </HStack>

        {/* Résumé des permissions */}
        <Card bg="blue.50">
          <CardHeader>
            <Heading size="sm">📊 Résumé des permissions</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2}>
              {roles.map(role => {
                const permsCount = Object.values(roleConfig?.permissions || {})
                  .reduce((acc, p) => acc + (Array.isArray(p) ? p.length : 0), 0);
                return (
                  <HStack key={role.code} spacing={3}>
                    <Badge colorScheme={role.color}>{role.label}</Badge>
                    <Text fontSize="sm" color="gray.600">
                      {permsCount} permissions
                    </Text>
                  </HStack>
                );
              })}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
