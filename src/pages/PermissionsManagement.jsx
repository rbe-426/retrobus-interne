import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  VStack,
  Button,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Checkbox,
  Card,
  CardBody,
  SimpleGrid,
  Text,
  Spinner,
  Center,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Heading,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiLock,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiShield,
  FiRefreshCw,
} from 'react-icons/fi';
import { api } from '../api';
import WorkspaceLayout from '../components/Layout/WorkspaceLayout';

const PERMISSIONS = {
  VEHICLES: {
    READ: 'Lire les véhicules',
    CREATE: 'Créer des véhicules',
    EDIT: 'Modifier les véhicules',
    DELETE: 'Supprimer les véhicules',
  },
  FINANCE: {
    READ: 'Lire les finances',
    CREATE: 'Créer des transactions',
    EDIT: 'Modifier les transactions',
    DELETE: 'Supprimer les transactions',
  },
  EVENTS: {
    READ: 'Lire les événements',
    CREATE: 'Créer des événements',
    EDIT: 'Modifier les événements',
    DELETE: 'Supprimer les événements',
  },
  STOCK: {
    READ: 'Lire le stock',
    CREATE: 'Créer des articles',
    EDIT: 'Modifier le stock',
    DELETE: 'Supprimer des articles',
  },
  PLANNING: {
    READ: 'Lire le planning',
    CREATE: 'Créer des plannings',
    EDIT: 'Modifier le planning',
    DELETE: 'Supprimer le planning',
  },
  MEMBERS: {
    READ: 'Lire les membres',
    CREATE: 'Ajouter des membres',
    EDIT: 'Modifier les membres',
    DELETE: 'Supprimer les membres',
  },
};

export default function PermissionsManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Charger les utilisateurs
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/users');
      if (response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId) => {
    try {
      setPermissionsLoading(true);
      const response = await api.get(`/api/admin/users/${userId}/permissions`);
      if (response.data?.permissions) {
        // Aplatir les permissions (permanent + temporary + expired)
        const allPermissions = [
          ...(response.data.permissions.permanent || []),
          ...(response.data.permissions.temporary || []),
          ...(response.data.permissions.expired || [])
        ];
        setUserPermissions(allPermissions);
      }
    } catch (error) {
      console.error('Erreur chargement permissions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les permissions',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    await loadUserPermissions(user.id);
    onOpen();
  };

  const handlePermissionChange = async (resource, action, granted) => {
    try {
      if (granted) {
        // Ajouter permission
        await api.post(`/api/admin/users/${selectedUser.id}/permissions`, {
          resource,
          actions: [action],  // ✅ Envoyer comme array
        });
      } else {
        // Trouver la permission et la supprimer
        const perm = userPermissions.find(
          (p) => p.resource === resource
        );
        if (perm) {
          await api.delete(
            `/api/admin/users/${selectedUser.id}/permissions/${perm.id}`
          );
        }
      }

      // Recharger les permissions
      await loadUserPermissions(selectedUser.id);
      toast({
        title: 'Succès',
        description: 'Permissions mises à jour',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Erreur mise à jour permission:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les permissions',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const hasPermission = (resource, action) => {
    return userPermissions.some(
      (p) => p.resource === resource
    );
  };

  const getRoleColor = (role) => {
    const colors = {
      ADMIN: 'red',
      PRESIDENT: 'purple',
      MANAGER: 'blue',
      OPERATOR: 'green',
      MEMBER: 'gray',
    };
    return colors[role] || 'gray';
  };

  return (
    <WorkspaceLayout
      sections={[
        {
          title: 'Utilisateurs',
          icon: FiUsers,
          href: '#utilisateurs',
        },
        {
          title: 'Permissions',
          icon: FiLock,
          href: '#permissions',
        },
      ]}
    >
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <HStack justify="space-between" mb={4}>
            <VStack align="start" spacing={1}>
              <Heading size="lg" display="flex" alignItems="center" gap={2}>
                <FiShield /> Gestion des Autorisations
              </Heading>
              <Text color="gray.600" fontSize="sm">
                Gérez les permissions d'accès par utilisateur
              </Text>
            </VStack>
            <Button
              leftIcon={<FiRefreshCw />}
              onClick={loadUsers}
              isLoading={loading}
              colorScheme="blue"
              variant="outline"
            >
              Actualiser
            </Button>
          </HStack>
        </Box>

        {/* Contenu principal */}
        {loading ? (
          <Center p={20}>
            <Spinner size="lg" />
          </Center>
        ) : (
          <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6} w="full">
            {/* Liste des utilisateurs */}
            <Box gridColumn={{ lg: '1 / 2' }}>
              <Card>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Utilisateurs</Heading>
                    <Input
                      placeholder="Rechercher..."
                      size="sm"
                    />
                    <VStack spacing={2} maxH="600px" overflowY="auto" align="stretch">
                      {users && users.length > 0 ? (
                        users.map((user) => (
                          <Button
                            key={user.id}
                            justifyContent="start"
                            variant={selectedUser?.id === user.id ? 'solid' : 'ghost'}
                            colorScheme="blue"
                            onClick={() => handleSelectUser(user)}
                            isFullWidth
                            textAlign="left"
                            p={3}
                            height="auto"
                            whiteSpace="normal"
                          >
                            <VStack align="start" spacing={0} width="100%">
                              <HStack justify="space-between" width="100%">
                                <Text fontWeight="bold" fontSize="sm">
                                  {user.firstName} {user.lastName}
                                </Text>
                                {user.role && (
                                  <Badge colorScheme={getRoleColor(user.role)} fontSize="xs">
                                    {user.role}
                                  </Badge>
                                )}
                              </HStack>
                              <Text fontSize="xs" color="gray.500">
                                {user.email}
                              </Text>
                            </VStack>
                          </Button>
                        ))
                      ) : (
                        <Text textAlign="center" color="gray.500">
                          Aucun utilisateur
                        </Text>
                      )}
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>
            </Box>

            {/* Permissions */}
            <Box gridColumn={{ lg: '2 / 4' }}>
              {selectedUser ? (
                <Card>
                  <CardBody>
                    <VStack spacing={6} align="stretch">
                      <HStack justify="space-between">
                        <VStack align="start" spacing={1}>
                          <Heading size="md">
                            {selectedUser.firstName} {selectedUser.lastName}
                          </Heading>
                          <Badge colorScheme={getRoleColor(selectedUser.role)}>
                            {selectedUser.role}
                          </Badge>
                        </VStack>
                      </HStack>

                      {permissionsLoading ? (
                        <Center p={10}>
                          <Spinner />
                        </Center>
                      ) : (
                        <Tabs>
                          <TabList>
                            {Object.keys(PERMISSIONS).map((resource) => (
                              <Tab key={resource}>{resource}</Tab>
                            ))}
                          </TabList>
                          <TabPanels>
                            {Object.keys(PERMISSIONS).map((resource) => (
                              <TabPanel key={resource}>
                                <VStack spacing={4} align="stretch">
                                  {Object.entries(PERMISSIONS[resource]).map(
                                    ([action, label]) => (
                                      <HStack
                                        key={`${resource}-${action}`}
                                        justify="space-between"
                                        p={3}
                                        bg="gray.50"
                                        borderRadius="md"
                                      >
                                        <Text fontSize="sm">{label}</Text>
                                        <Checkbox
                                          isChecked={hasPermission(resource, action)}
                                          onChange={(e) =>
                                            handlePermissionChange(
                                              resource,
                                              action,
                                              e.target.checked
                                            )
                                          }
                                          colorScheme="blue"
                                        />
                                      </HStack>
                                    )
                                  )}
                                </VStack>
                              </TabPanel>
                            ))}
                          </TabPanels>
                        </Tabs>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <Card>
                  <CardBody>
                    <Center p={10}>
                      <Text color="gray.500">
                        Sélectionnez un utilisateur pour voir ses permissions
                      </Text>
                    </Center>
                  </CardBody>
                </Card>
              )}
            </Box>
          </SimpleGrid>
        )}

        {/* Stats */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card>
            <CardBody textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                {users ? users.length : 0}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Utilisateurs
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                {users ? users.filter((u) => u.role === 'ADMIN').length : 0}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Administrateurs
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="green.500">
                {users ? users.filter((u) => u.role === 'MANAGER').length : 0}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Gestionnaires
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody textAlign="center">
              <Text fontSize="2xl" fontWeight="bold" color="gray.500">
                {users ? users.filter((u) => u.role === 'MEMBER').length : 0}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Membres
              </Text>
            </CardBody>
          </Card>
        </SimpleGrid>
      </VStack>
    </WorkspaceLayout>
  );
}
