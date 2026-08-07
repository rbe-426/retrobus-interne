import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Heading, Card, CardBody, CardHeader, Button,
  Table, Thead, Tbody, Tr, Th, Td, Checkbox, Badge, useToast,
  Spinner, Center, Grid, GridItem, Text, Alert, AlertIcon, Divider,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, useDisclosure, FormControl, FormLabel, Select,
  Input, SimpleGrid, Icon, TabPanel
} from '@chakra-ui/react';
import { FiEdit, FiRotateCcw, FiSave, FiX } from 'react-icons/fi';
import { apiClient } from '../api/config';
import { useUser } from '../context/UserContext';

export default function MemberPermissionsManager() {
  const toast = useToast();
  const { user: currentUser, refreshPermissions: refreshCurrentUserPermissions } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [userPermissions, setUserPermissions] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { isOpen, onOpen, onClose } = useDisclosure();

  // Charger les utilisateurs et les permissions disponibles
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les permissions disponibles
      const permRes = await apiClient.get('/api/member-permissions/available');
      setAvailablePermissions(permRes);

      // Charger les utilisateurs du site
      const usersRes = await apiClient.get('/api/site-users');
      setUsers(Array.isArray(usersRes) ? usersRes : usersRes.users || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const openUserPermissions = async (user) => {
    try {
      setSelectedUser(user);
      const permsRes = await apiClient.get(`/api/member-permissions/${user.id}`);
      
      // 🔥 CLEANUP: Filter out any old/invalid permission keys
      const loadedPerms = permsRes.customPermissions || {};
      const validPerms = {};
      
      for (const [key, value] of Object.entries(loadedPerms)) {
        // Only keep permissions that exist in availablePermissions
        if (availablePermissions[key]) {
          validPerms[key] = value;
        } else {
          console.warn(`⚠️  Filtered out invalid permission key: ${key}`);
        }
      }
      
      setUserPermissions(validPerms);
      onOpen();
    } catch (error) {
      console.error('Erreur chargement permissions utilisateur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les permissions',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handlePermissionToggle = (permissionKey) => {
    setUserPermissions(prev => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }));
  };

  const savePermissions = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      
      // 🔥 CLEANUP: Filter out any invalid permission keys before saving
      const validPerms = {};
      for (const [key, value] of Object.entries(userPermissions)) {
        if (availablePermissions[key]) {
          validPerms[key] = value;
        } else {
          console.warn(`⚠️  Skipping invalid permission key: ${key}`);
        }
      }
      
      await apiClient.put(`/api/member-permissions/${selectedUser.id}`, {
        permissions: validPerms
      });

      toast({
        title: 'Succès',
        description: 'Les permissions ont été mises à jour',
        status: 'success',
        duration: 3000
      });

      // If we're updating the current user's permissions, refresh them
      if (currentUser?.id === selectedUser.id) {
        await refreshCurrentUserPermissions();
      }

      loadData();
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde permissions:', error);
      const errorMsg = error?.response?.data?.message || error?.response?.data?.error || 'Erreur lors de la sauvegarde';
      const invalidPerms = error?.response?.data?.invalid;
      
      toast({
        title: 'Erreur',
        description: errorMsg + (invalidPerms ? `\n\nPermissions invalides: ${invalidPerms.join(', ')}` : ''),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      
      // Log invalid permissions for debugging
      if (invalidPerms) {
        console.error('❌ Backend rejected invalid permission keys:', invalidPerms);
      }
    } finally {
      setSaving(false);
    }
  };

  const resetPermissions = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      await apiClient.post(`/api/member-permissions/${selectedUser.id}/reset`);

      toast({
        title: 'Succès',
        description: 'Les permissions ont été réinitialisées aux permissions du rôle',
        status: 'success',
        duration: 3000
      });

      // If we're resetting the current user's permissions, refresh them
      if (currentUser?.id === selectedUser.id) {
        await refreshCurrentUserPermissions();
      }

      loadData();
      onClose();
    } catch (error) {
      console.error('Erreur réinitialisation permissions:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la réinitialisation',
        status: 'error',
        duration: 3000
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouper les permissions par catégorie
  const permissionsByCategory = {
    'Véhicules': Object.entries(availablePermissions).filter(
      ([key]) => key.startsWith('vehicles:')
    ),
    'Événements': Object.entries(availablePermissions).filter(
      ([key]) => key.startsWith('events:')
    ),
    'Finances': Object.entries(availablePermissions).filter(
      ([key]) => key.startsWith('finance:')
    ),
    'Membres': Object.entries(availablePermissions).filter(
      ([key]) => key.startsWith('members:')
    ),
    'Stocks': Object.entries(availablePermissions).filter(
      ([key]) => key.startsWith('stock:')
    ),
    'Communications': Object.entries(availablePermissions).filter(
      ([key]) => key.startsWith('newsletter:') || key.startsWith('retromail:')
    ),
    'RétroPlanning': Object.entries(availablePermissions).filter(
      ([key]) => key.startsWith('retroplanning:')
    ),
    'RétroSupport': Object.entries(availablePermissions).filter(
      ([key]) => key.startsWith('retrosupport:')
    ),
    'MyRBE': Object.entries(availablePermissions).filter(
      ([key]) => key.startsWith('myrbe:')
    ),
    'Administration': Object.entries(availablePermissions).filter(
      ([key]) => key.startsWith('admin:')
    )
  };

  if (loading) {
    return (
      <Center py={8}>
        <VStack>
          <Spinner size="lg" />
          <Text>Chargement des données...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg" mb={2}>👤 Permissions par Membre</Heading>
        <Text color="gray.600">
          Gérez les permissions individuelles de chaque utilisateur du site
        </Text>
      </Box>

      <Alert status="info">
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text fontSize="sm" fontWeight="bold">Comment ça marche?</Text>
          <Text fontSize="xs">
            • Les permissions de base dépendent du rôle de l'utilisateur
          </Text>
          <Text fontSize="xs">
            • Vous pouvez ajouter/retirer des permissions individuelles
          </Text>
          <Text fontSize="xs">
            • Cliquez sur "Réinitialiser" pour revenir aux permissions du rôle
          </Text>
        </VStack>
      </Alert>

      {/* Barre de recherche */}
      <Input
        placeholder="Rechercher un utilisateur..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        size="sm"
      />

      {/* Tableau des utilisateurs */}
      <Card>
        <CardHeader>
          <Heading size="sm">Utilisateurs</Heading>
        </CardHeader>
        <CardBody overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Nom</Th>
                <Th>Email</Th>
                <Th>Rôle</Th>
                <Th>Permissions personnalisées</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredUsers.map(user => {
                const hasCustomPerms = Object.keys(userPermissions).length > 0;
                return (
                  <Tr key={user.id}>
                    <Td>
                      <Text fontWeight="medium" fontSize="sm">
                        {user.firstName} {user.lastName}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {user.username}
                      </Text>
                    </Td>
                    <Td fontSize="sm">{user.email}</Td>
                    <Td>
                      <Badge size="sm">{user.role}</Badge>
                    </Td>
                    <Td>
                      {hasCustomPerms && (
                        <Badge colorScheme="blue" size="sm">
                          Personnalisées
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        leftIcon={<FiEdit />}
                        onClick={() => openUserPermissions(user)}
                        colorScheme="blue"
                        variant="outline"
                      >
                        Gérer
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>

          {filteredUsers.length === 0 && (
            <Text color="gray.500" textAlign="center" py={4}>
              Aucun utilisateur trouvé
            </Text>
          )}
        </CardBody>
      </Card>

      {/* Modal de gestion des permissions */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Permissions de {selectedUser?.firstName} {selectedUser?.lastName}
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Alert status="info" fontSize="sm">
                <AlertIcon />
                Rôle actuel: <strong>{selectedUser?.role}</strong>
              </Alert>

              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                perms.length > 0 && (
                  <Box key={category}>
                    <Heading size="sm" mb={3}>📁 {category}</Heading>
                    <Grid templateColumns="repeat(2, 1fr)" gap={3} pl={4}>
                      {perms.map(([key, label]) => (
                        <HStack key={key} spacing={2}>
                          <Checkbox
                            isChecked={!!userPermissions[key]}
                            onChange={() => handlePermissionToggle(key)}
                          />
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm">{label}</Text>
                            <Text fontSize="xs" color="gray.500">{key}</Text>
                          </VStack>
                        </HStack>
                      ))}
                    </Grid>
                    <Divider my={3} />
                  </Box>
                )
              ))}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button
                variant="outline"
                onClick={resetPermissions}
                isLoading={saving}
                leftIcon={<FiRotateCcw />}
              >
                Réinitialiser
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Annuler
              </Button>
              <Button
                colorScheme="green"
                onClick={savePermissions}
                isLoading={saving}
                leftIcon={<FiSave />}
              >
                Sauvegarder
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
