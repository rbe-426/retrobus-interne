import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Textarea,
  VStack,
  useToast,
  Alert,
  AlertIcon,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  Checkbox,
  Stack,
  Text,
  IconButton,
  Spinner
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';

/**
 * PermissionEditor - Modal pour éditer les permissions individuelles d'un utilisateur
 * Intègre avec API /api/user-permissions
 */
export default function PermissionEditor({ isOpen, onClose, user, onPermissionUpdated }) {
  const toast = useToast();
  
  // États
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState([]);
  
  // États pour ajouter une permission
  const [newPermission, setNewPermission] = useState({
    resource: '',
    actions: [],
    reason: ''
  });

  const RESOURCES = [
    { value: 'VEHICLES', label: '🚗 Véhicules' },
    { value: 'EVENTS', label: '🎉 Événements' },
    { value: 'FINANCE', label: '💰 Finance' },
    { value: 'MEMBERS', label: '👥 Adhérents' },
    { value: 'STOCK', label: '📦 Stock' },
    { value: 'SITE_MANAGEMENT', label: '🌐 Gestion du Site' },
    { value: 'NEWSLETTER', label: '📧 Newsletter' },
    { value: 'PLANNING', label: '📅 Planning' }
  ];

  const ACTIONS = [
    { value: 'READ', label: 'Lecture' },
    { value: 'CREATE', label: 'Créer' },
    { value: 'EDIT', label: 'Modifier' },
    { value: 'DELETE', label: 'Supprimer' }
  ];

  // Charger les permissions de l'utilisateur
  useEffect(() => {
    if (isOpen && user) {
      loadPermissions();
    }
  }, [isOpen, user]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user-permissions/${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setPermissions(data.permissions || []);
      } else {
        toast({
          title: 'Erreur',
          description: data.error || 'Impossible de charger les permissions',
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

  const handleAddPermission = async () => {
    if (!newPermission.resource || newPermission.actions.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Sélectionnez une ressource et au moins une action',
        status: 'error',
        duration: 2000
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/user-permissions/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: newPermission.resource,
          actions: newPermission.actions,
          reason: newPermission.reason || 'Ajout de permission'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Succès',
          description: 'Permission ajoutée',
          status: 'success',
          duration: 2000
        });
        
        // Réinitialiser le formulaire
        setNewPermission({
          resource: '',
          actions: [],
          reason: ''
        });
        
        // Recharger les permissions
        await loadPermissions();
        
        // Notifier le parent
        if (onPermissionUpdated) {
          onPermissionUpdated();
        }
      } else {
        toast({
          title: 'Erreur',
          description: data.error || 'Impossible d\'ajouter la permission',
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
      setSaving(false);
    }
  };

  const handleDeletePermission = async (permissionId, resource) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/user-permissions/${user.id}/${resource}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Succès',
          description: 'Permission supprimée',
          status: 'success',
          duration: 2000
        });
        
        // Recharger les permissions
        await loadPermissions();
        
        // Notifier le parent
        if (onPermissionUpdated) {
          onPermissionUpdated();
        }
      } else {
        toast({
          title: 'Erreur',
          description: data.error || 'Impossible de supprimer la permission',
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
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Permissions de {user?.firstName} {user?.lastName}
        </ModalHeader>
        <ModalCloseButton isDisabled={loading || saving} />
        
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Rôle actuel */}
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold" fontSize="sm">
                  Rôle: <Badge ml={2} colorScheme="purple">{user?.role}</Badge>
                </Text>
                <Text fontSize="xs" color="gray.600" mt={1}>
                  {user?.email}
                </Text>
              </Box>
            </Alert>

            {loading ? (
              <Box textAlign="center" py={6}>
                <Spinner />
              </Box>
            ) : (
              <>
                {/* Permissions existantes */}
                <Box>
                  <FormLabel fontWeight="bold">Permissions actuelles</FormLabel>
                  {permissions.length === 0 ? (
                    <Alert status="warning" borderRadius="md" fontSize="sm">
                      <AlertIcon />
                      Aucune permission spécifique attribuée
                    </Alert>
                  ) : (
                    <Table size="sm" variant="striped">
                      <Thead bg="gray.100">
                        <Tr>
                          <Th>Ressource</Th>
                          <Th>Actions</Th>
                          <Th>Raison</Th>
                          <Th width="50px">Action</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {permissions.map((perm) => (
                          <Tr key={perm.id}>
                            <Td fontWeight="medium">
                              {RESOURCES.find(r => r.value === perm.resource)?.label || perm.resource}
                            </Td>
                            <Td>
                              <HStack spacing={1}>
                                {(perm.actions || []).map((action) => (
                                  <Badge key={action} colorScheme="blue" fontSize="xs">
                                    {ACTIONS.find(a => a.value === action)?.label || action}
                                  </Badge>
                                ))}
                              </HStack>
                            </Td>
                            <Td fontSize="sm" color="gray.600">
                              {perm.reason || '-'}
                            </Td>
                            <Td>
                              <IconButton
                                icon={<DeleteIcon />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                isLoading={saving}
                                onClick={() => handleDeletePermission(perm.id, perm.resource)}
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </Box>

                <Divider />

                {/* Ajouter une permission */}
                <Box>
                  <FormLabel fontWeight="bold">Ajouter une permission</FormLabel>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="sm">Ressource</FormLabel>
                      <Select
                        placeholder="Sélectionner une ressource"
                        value={newPermission.resource}
                        onChange={(e) => setNewPermission({
                          ...newPermission,
                          resource: e.target.value
                        })}
                        isDisabled={saving}
                      >
                        {RESOURCES.map((res) => (
                          <option key={res.value} value={res.value}>
                            {res.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Actions</FormLabel>
                      <Stack spacing={2}>
                        {ACTIONS.map((action) => (
                          <Checkbox
                            key={action.value}
                            isChecked={newPermission.actions.includes(action.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewPermission({
                                  ...newPermission,
                                  actions: [...newPermission.actions, action.value]
                                });
                              } else {
                                setNewPermission({
                                  ...newPermission,
                                  actions: newPermission.actions.filter(a => a !== action.value)
                                });
                              }
                            }}
                            isDisabled={saving}
                          >
                            {action.label}
                          </Checkbox>
                        ))}
                      </Stack>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Raison (optionnelle)</FormLabel>
                      <Textarea
                        placeholder="Justification de cette permission..."
                        value={newPermission.reason}
                        onChange={(e) => setNewPermission({
                          ...newPermission,
                          reason: e.target.value
                        })}
                        isDisabled={saving}
                        size="sm"
                        rows={3}
                      />
                    </FormControl>
                  </VStack>
                </Box>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button
              variant="ghost"
              onClick={onClose}
              isDisabled={loading || saving}
            >
              Fermer
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleAddPermission}
              isLoading={saving}
              isDisabled={!newPermission.resource || newPermission.actions.length === 0}
            >
              Ajouter Permission
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
