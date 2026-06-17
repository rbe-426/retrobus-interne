import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Button, Card, CardBody, CardHeader,
  Heading, Input, Textarea, FormControl, FormLabel, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, useDisclosure, Badge, IconButton,
  Flex, Spacer, Alert, AlertIcon, Spinner, Center,
  Select, Switch, Table, Thead, Tbody, Tr, Th, Td, InputGroup,
  InputLeftElement, Menu, MenuButton, MenuList, MenuItem,
  useColorModeValue, Tooltip, Divider, SimpleGrid, Image as ChakraImage,
  Container, Checkbox
} from '@chakra-ui/react';
import { 
  FiEdit, FiTrash2, FiPlus, FiUsers, FiSettings, FiGlobe, FiMail,
  FiShare, FiChevronLeft, FiChevronRight, FiArrowUpRight, FiSearch,
  FiRefreshCw, FiShield, FiLock, FiUnlock, FiActivity, FiEdit2,
  FiAlertCircle, FiBell, FiTrendingUp, FiMonitor
} from 'react-icons/fi';
import { FaEdit, FaTrash, FaPlus, FaEye } from 'react-icons/fa';

import WorkspaceLayout from '../components/Layout/WorkspaceLayout';
import { apiClient } from '../api/config';
import { API_BASE_URL } from '../api/config';
import { displayNameFromUser, formatMemberLabel } from '../lib/names';
import { useUser } from '../context/UserContext';
import { useUserRoles, ADMIN_ROLES } from '../hooks/useUserRoles';
import EmailTemplateManager from '../components/EmailTemplateManager';
import TemplateManagement from '../components/TemplateManagement';
import MemberProfilesManager from '../components/MemberProfilesManager';
import MarkdownEditor from '../components/MarkdownEditor';
import MediaUploader from '../components/MediaUploader';
import PollCreator from '../components/PollCreator';
import PollStats from '../components/PollStats';
import NotificationsManagement from '../components/NotificationsManagement';
import HomeAnnouncementsManagement from '../components/HomeAnnouncementsManagement';

// === RESOURCES & PERMISSIONS ===
const RESOURCE_CATEGORIES = {
  VEHICLES: {
    label: '🚗 Véhicules',
    permissions: {
      READ: 'Consulter',
      CREATE: 'Créer',
      EDIT: 'Modifier',
      DELETE: 'Supprimer',
    }
  },
  FINANCE: {
    label: '💰 Finances',
    permissions: {
      READ: 'Consulter',
      CREATE: 'Créer transactions',
      EDIT: 'Modifier',
      DELETE: 'Supprimer',
    }
  },
  EVENTS: {
    label: '📅 Événements',
    permissions: {
      READ: 'Consulter',
      CREATE: 'Créer',
      EDIT: 'Modifier',
      DELETE: 'Supprimer',
    }
  },
  STOCK: {
    label: '📦 Stock',
    permissions: {
      READ: 'Consulter',
      CREATE: 'Ajouter articles',
      EDIT: 'Modifier',
      DELETE: 'Supprimer',
    }
  },
  PLANNING: {
    label: '📊 Planning',
    permissions: {
      READ: 'Consulter',
      CREATE: 'Créer',
      EDIT: 'Modifier',
      DELETE: 'Supprimer',
    }
  },
  MEMBERS: {
    label: '👥 Membres',
    permissions: {
      READ: 'Consulter',
      CREATE: 'Ajouter',
      EDIT: 'Modifier',
      DELETE: 'Supprimer',
    }
  },
};

const getRoleColor = (role) => {
  const colors = {
    ADMIN: 'red',
    PRESIDENT: 'purple',
    VICE_PRESIDENT: 'indigo',
    TRESORIER: 'blue',
    SECRETAIRE_GENERAL: 'cyan',
    MEMBER: 'gray',
  };
  return colors[role] || 'gray';
};

const getRoleLabel = (role) => {
  const labels = {
    ADMIN: '🔴 Admin',
    PRESIDENT: '👑 Président',
    VICE_PRESIDENT: '👔 Vice-Président',
    TRESORIER: '💳 Trésorier',
    SECRETAIRE_GENERAL: '📋 Secrétaire Général',
    MEMBER: '👤 Membre',
  };
  return labels[role] || role;
};

/**
 * ============= Composant Access Management =============
 */
const AccessManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    matricule: '',
    role: 'USER',
    passwordOption: 'generate',
    password: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    role: 'USER'
  });
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isResetPasswordOpen, onOpen: onResetPasswordOpen, onClose: onResetPasswordClose } = useDisclosure();
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToReset, setUserToReset] = useState(null);
  const [alternativeEmail, setAlternativeEmail] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/api/admin/users');
      setUsers(Array.isArray(data) ? data : (data?.users || []));
    } catch (error) {
      console.error('Erreur chargement users:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(pwd);
    return pwd;
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.matricule) {
      toast({
        title: 'Erreur',
        description: 'L\'email et le matricule sont requis',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (formData.passwordOption === 'custom' && !formData.password) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un mot de passe',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setIsCreating(true);
      const pwd = formData.passwordOption === 'generate' ? generatedPassword : formData.password;
      
      const response = await apiClient.post('/api/admin/users', {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        matricule: formData.matricule,
        role: formData.role,
        password: pwd,
        mustChangePassword: true
      });
      
      toast({
        title: '✅ Utilisateur créé',
        description: `Un email avec les identifiants a été envoyé à ${formData.email}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        matricule: '',
        role: 'USER',
        passwordOption: 'generate',
        password: ''
      });
      setGeneratedPassword('');
      onClose();
      await loadUsers();
    } catch (error) {
      console.error('Erreur création user:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer l\'utilisateur',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenModal = () => {
    setGeneratedPassword(generatePassword());
    onOpen();
  };

  const handleOpenEditModal = (user) => {
    setEditingUserId(user.id);
    setEditFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || 'USER',
      hasInternalAccess: user.hasInternalAccess !== false,
      hasExternalAccess: user.hasExternalAccess !== false
    });
    onEditOpen();
  };

  const handleSaveEdit = async () => {
    if (!editFormData.firstName || !editFormData.lastName) {
      toast({
        title: 'Erreur',
        description: 'Le prénom et le nom sont requis',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setIsEditingUser(true);
      await apiClient.put(`/api/admin/users/${editingUserId}`, {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        role: editFormData.role,
        hasInternalAccess: editFormData.hasInternalAccess,
        hasExternalAccess: editFormData.hasExternalAccess
      });

      toast({
        title: 'Succès',
        description: 'Utilisateur modifié avec succès',
        status: 'success',
        duration: 3000,
      });

      setEditingUserId(null);
      setEditFormData({
        firstName: '',
        lastName: '',
        role: 'USER',
        hasInternalAccess: true,
        hasExternalAccess: true
      });
      onEditClose();
      await loadUsers();
    } catch (error) {
      console.error('Erreur modification user:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier l\'utilisateur',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsEditingUser(false);
    }
  };

  const handleOpenDeleteModal = (user) => {
    setUserToDelete(user);
    onDeleteOpen();
  };

  const handleOpenResetPassword = (user) => {
    setUserToReset(user);
    setAlternativeEmail('');
    onResetPasswordOpen();
  };

  const handleConfirmResetPassword = async () => {
    if (!userToReset) return;

    try {
      const targetEmail = alternativeEmail.trim() || userToReset.email;
      
      const response = await apiClient.post(`/api/admin/users/${userToReset.id}/reset-password`, {
        mustChangePassword: true,
        alternativeEmail: alternativeEmail.trim() || undefined
      });

      toast({
        title: '✅ Mot de passe réinitialisé',
        description: `Un email avec les nouveaux identifiants a été envoyé à ${targetEmail}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      setUserToReset(null);
      setAlternativeEmail('');
      onResetPasswordClose();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer le mot de passe temporaire',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleGenerateTemporaryPassword = async () => {
    if (!editingUserId) return;

    try {
      setIsEditingUser(true);
      const response = await apiClient.post(`/api/admin/users/${editingUserId}/reset-password`, {
        temporary: true
      });

      const tempPassword = response.data.tempPassword;
      
      toast({
        title: '✅ Mot de passe temporaire généré',
        description: `Mot de passe : ${tempPassword} (À communiquer de manière sécurisée)`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer le mot de passe',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsEditingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await apiClient.delete(`/api/admin/users/${userToDelete.id}`);

      toast({
        title: 'Succès',
        description: 'Utilisateur supprimé avec succès',
        status: 'success',
        duration: 3000,
      });

      setUserToDelete(null);
      onDeleteClose();
      await loadUsers();
    } catch (error) {
      console.error('Erreur suppression user:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer l\'utilisateur',
        status: 'error',
        duration: 3000,
      });
    }
  };

  if (loading) {
    return (
      <Center py={20}>
        <Spinner size="lg" color="var(--rbe-red)" />
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Alert status="info">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Gestion des accès utilisateurs</Text>
          <Text fontSize="sm">Créez et gérez les accès indépendamment des adhésions (partenaires, administrateurs, etc.)</Text>
        </Box>
      </Alert>

      <HStack justify="space-between">
        <Heading size="md">Utilisateurs</Heading>
        <Button colorScheme="blue" leftIcon={<FiPlus />} onClick={handleOpenModal}>
          Créer un accès
        </Button>
      </HStack>

      <Card variant="outline">
        <CardBody>
          {users.length === 0 ? (
            <Text color="gray.500" textAlign="center" py={8}>Aucun utilisateur créé</Text>
          ) : (
            <Table size="sm" variant="simple">
              <Thead>
                <Tr bg="gray.50">
                  <Th>Utilisateur</Th>
                  <Th>Email</Th>
                  <Th>Matricule</Th>
                  <Th>Rôle</Th>
                  <Th>Créé</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => (
                  <Tr key={user.id}>
                    <Td fontWeight="medium">{displayNameFromUser(user)}</Td>
                    <Td fontSize="sm">{user.email}</Td>
                    <Td fontSize="sm">{user.matricule || '-'}</Td>
                    <Td>
                      <Badge colorScheme={
                        user.role === 'ADMIN' ? 'red' : 
                        user.role === 'PARTENAIRE' ? 'orange' : 
                        'blue'
                      }>
                        {user.role}
                      </Badge>
                    </Td>
                    <Td fontSize="sm">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Tooltip label="Modifier"Open>
                          <IconButton
                            size="sm"
                            icon={<FiEdit />}
                            variant="ghost"
                            colorScheme="blue"
                            onClick={() => handleOpenEditModal(user)}
                          />
                        </Tooltip>
                        <Tooltip label="Renouveler mot de passe">
                          <IconButton
                            size="sm"
                            icon={<FiRefreshCw />}
                            variant="ghost"
                            colorScheme="orange"
                            onClick={() => handleOpenResetPassword(user)}
                          />
                        </Tooltip>
                        <Tooltip label="Supprimer">
                          <IconButton
                            size="sm"
                            icon={<FiTrash2 />}
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleOpenDeleteModal(user)}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Créer un nouvel accès utilisateur</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="utilisateur@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Matricule</FormLabel>
                <Input
                  placeholder="Ex: P001, A123, etc."
                  value={formData.matricule}
                  onChange={(e) => setFormData({...formData, matricule: e.target.value})}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Prénom</FormLabel>
                <Input
                  placeholder="Prénom"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Nom</FormLabel>
                <Input
                  placeholder="Nom"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Rôle</FormLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="USER">Utilisateur</option>
                  <option value="PARTENAIRE">Partenaire</option>
                  <option value="ADMIN">Administrateur</option>
                </Select>
              </FormControl>

              <Divider />

              <FormControl isRequired>
                <FormLabel>Mot de passe</FormLabel>
                <Select
                  value={formData.passwordOption}
                  onChange={(e) => {
                    setFormData({...formData, passwordOption: e.target.value});
                    if (e.target.value === 'generate') {
                      setGeneratedPassword(generatePassword());
                    }
                  }}
                >
                  <option value="generate">Générer un mot de passe</option>
                  <option value="custom">Entrer un mot de passe personnalisé</option>
                </Select>
              </FormControl>

              {formData.passwordOption === 'generate' ? (
                <Box w="100%" p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                  <Text fontSize="sm" color="blue.700" mb={2}>
                    <b>Mot de passe généré:</b>
                  </Text>
                  <HStack>
                    <Input 
                      value={generatedPassword} 
                      isReadOnly 
                      fontFamily="monospace"
                      bg="white"
                    />
                    <IconButton
                      icon={<FiRefreshCw />}
                      onClick={() => setGeneratedPassword(generatePassword())}
                      title="Regénérer"
                      size="sm"
                    />
                  </HStack>
                  <Alert status="info" mt={2} fontSize="xs">
                    <AlertIcon boxSize={3} />
                    <Text>
                      Un email avec ce mot de passe sera automatiquement envoyé à l'utilisateur. Il devra le changer à la première connexion.
                    </Text>
                  </Alert>
                </Box>
              ) : (
                <FormControl isRequired>
                  <Input
                    type="password"
                    placeholder="Entrez le mot de passe"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Annuler</Button>
            <Button colorScheme="blue" isLoading={isCreating} onClick={handleCreateUser}>
              Créer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal d'édition */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader pb={2}>Modifier l'utilisateur</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              {/* Section: Informations personnelles */}
              <Box>
                <Heading as="h4" size="sm" mb={3} color="blue.600" display="flex" alignItems="center" gap={2}>
                  <Box as="span" fontSize="lg">👤</Box> Informations personnelles
                </Heading>
                <VStack spacing={3} pl={4} borderLeft="2px" borderColor="blue.200">
                  <FormControl isRequired>
                    <FormLabel fontSize="sm" fontWeight="600">Prénom</FormLabel>
                    <Input
                      placeholder="Prénom"
                      value={editFormData.firstName}
                      onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                      size="sm"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel fontSize="sm" fontWeight="600">Nom</FormLabel>
                    <Input
                      placeholder="Nom"
                      value={editFormData.lastName}
                      onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                      size="sm"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel fontSize="sm" fontWeight="600">Rôle</FormLabel>
                    <Select
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                      size="sm"
                    >
                      <option value="USER">Utilisateur</option>
                      <option value="PARTENAIRE">Partenaire</option>
                      <option value="ADMIN">Administrateur</option>
                    </Select>
                  </FormControl>
                </VStack>
              </Box>

              {/* Section: Contrôle d'accès */}
              <Box>
                <Heading as="h4" size="sm" mb={3} color="purple.600" display="flex" alignItems="center" gap={2}>
                  <Box as="span" fontSize="lg">🔐</Box> Contrôle d'accès
                </Heading>
                <VStack spacing={3} pl={4} borderLeft="2px" borderColor="purple.200">
                  <Box p={3} bg="purple.50" borderRadius="md" w="full">
                    <HStack justify="space-between">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="600" fontSize="sm">Accès Intranet</Text>
                        <Text fontSize="xs" color="gray.600">Accès aux pages d'administration interne</Text>
                      </VStack>
                      <Switch
                        isChecked={editFormData.hasInternalAccess !== false}
                        onChange={(e) => setEditFormData({...editFormData, hasInternalAccess: e.target.checked})}
                        colorScheme="purple"
                      />
                    </HStack>
                  </Box>

                  <Box p={3} bg="orange.50" borderRadius="md" w="full">
                    <HStack justify="space-between">
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="600" fontSize="sm">Accès Site Public</Text>
                        <Text fontSize="xs" color="gray.600">Accès au site externe (MyRBE)</Text>
                      </VStack>
                      <Switch
                        isChecked={editFormData.hasExternalAccess !== false}
                        onChange={(e) => setEditFormData({...editFormData, hasExternalAccess: e.target.checked})}
                        colorScheme="orange"
                      />
                    </HStack>
                  </Box>
                </VStack>
              </Box>

              {/* Section: Mot de passe */}
              <Box>
                <Heading as="h4" size="sm" mb={3} color="teal.600" display="flex" alignItems="center" gap={2}>
                  <Box as="span" fontSize="lg">🔑</Box> Mot de passe
                </Heading>
                <VStack spacing={3} pl={4} borderLeft="2px" borderColor="teal.200">
                  <Box p={3} bg="teal.50" borderRadius="md" w="full">
                    <Text fontSize="sm" mb={2} color="gray.700">
                      Force l'utilisateur à changer son mot de passe à la prochaine connexion
                    </Text>
                    <Button
                      size="sm"
                      colorScheme="teal"
                      leftIcon={<Box as="span">🔄</Box>}
                      w="full"
                      onClick={handleGenerateTemporaryPassword}
                      isLoading={isEditingUser}
                    >
                      Générer un mot de passe temporaire
                    </Button>
                  </Box>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>Annuler</Button>
            <Button colorScheme="blue" isLoading={isEditingUser} onClick={handleSaveEdit}>
              Enregistrer les modifications
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirmer la suppression</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" borderRadius="md" mb={4}>
              <AlertIcon />
              Êtes-vous sûr de vouloir supprimer cet utilisateur ?
            </Alert>
            {userToDelete && (
              <VStack align="start" spacing={2}>
                <Text><b>Utilisateur:</b> {displayNameFromUser(userToDelete)}</Text>
                <Text><b>Email:</b> {userToDelete.email}</Text>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteClose}>Annuler</Button>
            <Button colorScheme="red" onClick={handleDeleteUser}>
              Supprimer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de réinitialisation de mot de passe */}
      <Modal isOpen={isResetPasswordOpen} onClose={onResetPasswordClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={2}>
              <Box as={FiRefreshCw} color="orange.500" />
              <Text>Réinitialiser le mot de passe</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {userToReset && (
                <Box p={3} bg="gray.50" borderRadius="md">
                  <VStack align="start" spacing={2}>
                    <Text fontSize="sm" color="gray.600">
                      <b>Utilisateur:</b> {displayNameFromUser(userToReset)}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      <b>Email enregistré:</b> {userToReset.email}
                    </Text>
                  </VStack>
                </Box>
              )}

              <FormControl>
                <FormLabel fontSize="sm">
                  <HStack spacing={2}>
                    <FiMail />
                    <Text>Email de destination (optionnel)</Text>
                  </HStack>
                </FormLabel>
                <Input
                  type="email"
                  placeholder={userToReset?.email || 'Email alternatif...'}
                  value={alternativeEmail}
                  onChange={(e) => setAlternativeEmail(e.target.value)}
                  size="sm"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Laissez vide pour envoyer à l'email enregistré
                </Text>
              </FormControl>

              <Alert status="info" borderRadius="md" fontSize="sm">
                <AlertIcon boxSize={4} />
                <Box>
                  <Text fontWeight="bold">Mot de passe temporaire</Text>
                  <Text fontSize="xs">
                    Un nouveau mot de passe sera généré et envoyé par email. L'utilisateur devra le changer à la première connexion.
                  </Text>
                </Box>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onResetPasswordClose}>
              Annuler
            </Button>
            <Button colorScheme="orange" onClick={handleConfirmResetPassword}>
              Réinitialiser
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

/**
 * ============= Composant News Management =============
 */
const NewsManagement = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const toast = useToast();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    media: [],
    polls: [],
    featured: false,
    published: false,
    showOnExternal: false,
  });

  useEffect(() => {
    loadNews();
  }, []);

  useEffect(() => {
    console.log('📊 FormData.polls changed:', formData.polls);
  }, [formData.polls]);

  const loadNews = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/api/retro-news');
      setNews(Array.isArray(data) ? data : data?.news || []);
    } catch (error) {
      console.error('Erreur chargement news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    const initialFormData = { 
      title: '', 
      content: '', 
      media: [], 
      polls: [], 
      featured: false, 
      published: false, 
      showOnExternal: false 
    };
    console.log('📝 Creating new news, initial formData:', initialFormData);
    setFormData(initialFormData);
    onCreateOpen();
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    
    // Parse JSON fields if they exist
    let media = [];
    let polls = [];
    
    try {
      if (item.media) {
        media = typeof item.media === 'string' ? JSON.parse(item.media) : item.media;
      }
    } catch (e) {
      console.error('Error parsing media:', e);
    }
    
    try {
      if (item.polls) {
        polls = typeof item.polls === 'string' ? JSON.parse(item.polls) : item.polls;
      }
    } catch (e) {
      console.error('Error parsing polls:', e);
    }
    
    setFormData({
      title: item.title,
      content: item.content || item.body || '',
      media: media || [],
      polls: polls || [],
      featured: item.featured || false,
      published: item.published || false,
      showOnExternal: item.showOnExternal || false,
    });
    onCreateOpen();
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast({
        title: 'Erreur',
        description: 'Le titre et le contenu sont requis',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const payload = { 
        title: formData.title,
        body: formData.content,
        content: formData.content, // Keep both for compatibility
        media: JSON.stringify(formData.media),
        polls: JSON.stringify(formData.polls),
        featured: formData.featured,
        published: formData.published,
        showOnExternal: formData.showOnExternal,
        status: formData.published ? 'published' : 'draft'
      };
      
      console.log('💾 Saving news with payload:', payload);
      console.log('📊 Polls being saved:', formData.polls);
      
      if (editingId) {
        await apiClient.put(`/api/retro-news/${editingId}`, payload);
        toast({ title: 'Succès', description: 'Actualité mise à jour', status: 'success' });
      } else {
        await apiClient.post('/api/retro-news', payload);
        toast({ title: 'Succès', description: 'Actualité créée', status: 'success' });
      }
      loadNews();
      onCreateClose();
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', status: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer?')) return;
    try {
      await apiClient.delete(`/api/retro-news/${id}`);
      toast({ title: 'Succès', description: 'Actualité supprimée', status: 'success' });
      loadNews();
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', status: 'error' });
    }
  };

  if (loading) {
    return (
      <Center py={20}>
        <Spinner size="lg" color="var(--rbe-red)" />
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="md">📰 Actualités RétroBus</Heading>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={handleCreate}>
          Nouvelle actualité
        </Button>
      </Flex>

      <Alert status="info">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">À propos des actualités</Text>
          <Text fontSize="sm">
            Les actualités créées ici seront disponibles dans la modale RétroActus et peuvent être partagées
          </Text>
        </Box>
      </Alert>

      {news.length === 0 ? (
        <Card>
          <CardBody>
            <Center py={10} flexDirection="column">
              <Text mb={4} color="gray.500">Aucune actualité pour le moment</Text>
              <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm" onClick={handleCreate}>
                Créer la première
              </Button>
            </Center>
          </CardBody>
        </Card>
      ) : (
        <SimpleGrid spacing={4} columns={{ base: 1, md: 2, lg: 3 }}>
          {news.map((item) => {
            // Parse media and polls counts
            let mediaCount = 0;
            let pollsCount = 0;
            
            try {
              if (item.media) {
                const mediaArray = typeof item.media === 'string' ? JSON.parse(item.media) : item.media;
                mediaCount = Array.isArray(mediaArray) ? mediaArray.length : 0;
              }
            } catch (e) {
              console.error('Error parsing media:', e);
            }
            
            try {
              if (item.polls) {
                const pollsArray = typeof item.polls === 'string' ? JSON.parse(item.polls) : item.polls;
                pollsCount = Array.isArray(pollsArray) ? pollsArray.length : 0;
              }
            } catch (e) {
              console.error('Error parsing polls:', e);
            }

            return (
              <Card key={item.id} variant="outline" _hover={{ boxShadow: 'md' }} transition="all 0.2s">
                <CardHeader pb={3}>
                  <VStack align="start" spacing={2}>
                    <Heading size="sm" noOfLines={2}>{item.title}</Heading>
                    <HStack spacing={2} flexWrap="wrap">
                      {item.published && <Badge colorScheme="green">Publié</Badge>}
                      {item.showOnExternal && <Badge colorScheme="blue">Externe</Badge>}
                      {mediaCount > 0 && (
                        <Badge colorScheme="cyan" fontSize="xs">
                          📸 {mediaCount} média{mediaCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {pollsCount > 0 && (
                        <Badge colorScheme="orange" fontSize="xs">
                          📊 {pollsCount} sondage{pollsCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                </CardHeader>
                <CardBody pt={2} pb={2}>
                  <VStack align="stretch" spacing={3}>
                    <Text fontSize="sm" noOfLines={3} color="gray.600">
                      {item.body || item.content || '(vide)'}
                    </Text>
                    
                    {/* Poll Stats */}
                    {pollsCount > 0 && (
                      <Box>
                        <PollStats newsId={item.id} polls={item.polls} />
                      </Box>
                    )}
                  </VStack>
                </CardBody>
                <Divider />
                <CardBody pt={2} pb={2}>
                  <HStack spacing={2} justify="flex-end">
                    <IconButton
                      icon={<FiEdit />}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(item)}
                      aria-label="Éditer"
                    />
                    <IconButton
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleDelete(item.id)}
                      aria-label="Supprimer"
                    />
                  </HStack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {/* Modal Création/Édition */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingId ? '✏️ Modifier une actualité' : '✨ Nouvelle actualité'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input
                  placeholder="Titre de l'actualité..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Contenu (Markdown supporté)</FormLabel>
                <MarkdownEditor
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="**Gras** *italique* `code` [lien](url) # Titre..."
                />
              </FormControl>

              <Divider />

              {/* Media Uploader */}
              <MediaUploader
                media={formData.media}
                onChange={(newMedia) => setFormData(prevData => ({ ...prevData, media: newMedia }))}
              />

              <Divider />

              {/* Poll Creator */}
              <PollCreator
                polls={formData.polls}
                onChange={(newPolls) => {
                  console.log('📊 Polls updated in parent:', newPolls);
                  setFormData(prevData => {
                    const updated = { ...prevData, polls: newPolls };
                    console.log('📊 Updated formData:', updated);
                    return updated;
                  });
                }}
              />

              <Divider />

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Vedette (affichage prioritaire)</FormLabel>
                <Switch
                  isChecked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  ml={2}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Publié</FormLabel>
                <Switch
                  isChecked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  ml={2}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Afficher sur le site externe</FormLabel>
                <Switch
                  isChecked={formData.showOnExternal}
                  onChange={(e) => setFormData({ ...formData, showOnExternal: e.target.checked })}
                  ml={2}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleSave}>
              {editingId ? 'Mettre à jour' : 'Créer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

/**
 * ============= Composant Permissions Management =============
 */
const PermissionsManagement = () => {
  const { user, roles, isAdmin } = useUser();
  const userRolesHook = useUserRoles();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  
  // Vérifier que l'utilisateur est admin - utiliser le hook centralisé
  const canManage = userRolesHook.hasAdminAccess();

  useEffect(() => {
    if (canManage) {
      loadUsers();
    }
  }, [canManage]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/users');
      if (Array.isArray(response)) {
        setUsers(response);
      } else {
        console.error('Format inattendu pour les utilisateurs');
        setUsers([]);
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
      const response = await apiClient.get(`/api/admin/users/${userId}/permissions`);
      if (Array.isArray(response)) {
        setUserPermissions(response);
      }
    } catch (error) {
      console.error('Erreur chargement permissions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les permissions',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    loadUserPermissions(user.id);
  };

  const handlePermissionToggle = async (resource, action, currentValue) => {
    if (!selectedUser || !canManage) return;

    try {
      const newValue = !currentValue;
      
      if (newValue) {
        // Ajouter permission
        await apiClient.post(`/api/admin/users/${selectedUser.id}/permissions`, {
          resource,
          actions: [action],
        });
      } else {
        // Supprimer permission
        await apiClient.delete(
          `/api/admin/users/${selectedUser.id}/permissions/${resource}/${action}`
        );
      }

      // Recharger
      await loadUserPermissions(selectedUser.id);
      toast({
        title: 'Succès',
        description: 'Permission mise à jour',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Erreur mise à jour permission:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la permission',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleMakeAdmin = async (isAdmin) => {
    if (!selectedUser || !canManage) return;

    try {
      const response = await apiClient.post(`/api/admin/users/${selectedUser.id}/make-admin`, {
        isAdmin,
      });
      
      // Mettre à jour l'utilisateur sélectionné
      setSelectedUser(response.user);
      
      toast({
        title: 'Succès',
        description: isAdmin ? 'Utilisateur promu admin' : 'Utilisateur rétrogradé',
        status: 'success',
        duration: 2000,
      });
      
      // Recharger la liste des utilisateurs
      await loadUsers();
    } catch (error) {
      console.error('Erreur modification admin:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le statut admin',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const hasPermission = (resource, action) => {
    if (!userPermissions[resource]) return false;
    return userPermissions[resource].includes && 
           userPermissions[resource].includes(action);
  };

  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManage) {
    return (
      <VStack spacing={6} align="stretch">
        <Alert status="error" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" height="auto" p={6}>
          <AlertIcon boxSize="40px" mr={0} mb={4} />
          <Heading size="md" mb={2}>Accès Refusé</Heading>
          <Text>Seuls les administrateurs peuvent gérer les permissions.</Text>
        </Alert>
      </VStack>
    );
  }

  if (loading) {
    return (
      <Center minH="80vh">
        <VStack>
          <Spinner size="xl" color="var(--rbe-red)" />
          <Text>Chargement...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Box>
        <HStack justify="space-between" mb={4}>
          <VStack align="start" spacing={1}>
            <Heading size="md" display="flex" alignItems="center" gap={2}>
              <FiShield /> Gestion des Permissions
            </Heading>
            <Text color="gray.600" fontSize="sm">
              Configurez les droits d'accès pour chaque utilisateur
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

      {/* Main Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} w="full">
        {/* Users List */}
        <Card bg={cardBg}>
          <CardHeader pb={3}>
            <Heading size="sm" mb={4}>👥 Utilisateurs</Heading>
            <Input
              placeholder="Rechercher..."
              size="sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardHeader>
          <CardBody pt={0}>
            <VStack spacing={2} maxH="600px" overflowY="auto" align="stretch">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <Button
                    key={u.id}
                    justifyContent="start"
                    variant={selectedUser?.id === u.id ? 'solid' : 'ghost'}
                    colorScheme="blue"
                    onClick={() => handleSelectUser(u)}
                    isFullWidth
                    textAlign="left"
                    p={3}
                    height="auto"
                    whiteSpace="normal"
                  >
                    <VStack align="start" spacing={0} width="100%">
                      <Text fontWeight="bold" fontSize="sm">
                        {u.firstName} {u.lastName}
                      </Text>
                      <HStack spacing={2}>
                        <Text fontSize="xs" color="gray.500">
                          {u.email}
                        </Text>
                        {u.role && (
                          <Badge colorScheme={getRoleColor(u.role)} fontSize="xs">
                            {getRoleLabel(u.role)}
                          </Badge>
                        )}
                      </HStack>
                    </VStack>
                  </Button>
                ))
              ) : (
                <Text textAlign="center" color="gray.500" py={8}>
                  Aucun utilisateur trouvé
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Permissions Grid */}
        <Box gridColumn={{ lg: '2 / 4' }}>
          {selectedUser ? (
            <Card bg={cardBg}>
              <CardHeader>
                <VStack align="start" spacing={2}>
                  <Heading size="sm">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </Heading>
                  {selectedUser.role && (
                    <Badge colorScheme={getRoleColor(selectedUser.role)} fontSize="sm">
                      {getRoleLabel(selectedUser.role)}
                    </Badge>
                  )}
                  <HStack spacing={2} pt={2}>
                    <Button
                      size="sm"
                      colorScheme={selectedUser.permissions?.includes('admin') ? 'red' : 'green'}
                      onClick={() => handleMakeAdmin(!selectedUser.permissions?.includes('admin'))}
                    >
                      {selectedUser.permissions?.includes('admin') ? 'Retirer Admin' : 'Faire Admin'}
                    </Button>
                  </HStack>
                </VStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={6} align="stretch">
                  {Object.entries(RESOURCE_CATEGORIES).map(([resource, category]) => (
                    <Box key={resource} p={4} borderWidth={1} borderRadius="md" borderColor="gray.200">
                      <Heading size="sm" mb={4}>
                        {category.label}
                      </Heading>
                      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                        {Object.entries(category.permissions).map(([action, label]) => (
                          <HStack key={`${resource}-${action}`} spacing={2}>
                            <Checkbox
                              isChecked={hasPermission(resource, action)}
                              onChange={() => handlePermissionToggle(resource, action, hasPermission(resource, action))}
                              colorScheme="blue"
                            />
                            <Text fontSize="sm">{label}</Text>
                          </HStack>
                        ))}
                      </SimpleGrid>
                    </Box>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          ) : (
            <Card bg={cardBg}>
              <CardBody>
                <Center p={10}>
                  <VStack>
                    <FiAlertCircle size={32} color="gray" />
                    <Text color="gray.500">
                      Sélectionnez un utilisateur pour gérer ses permissions
                    </Text>
                  </VStack>
                </Center>
              </CardBody>
            </Card>
          )}
        </Box>
      </SimpleGrid>

      {/* Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <Card>
          <CardBody textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="blue.500">
              {users.length}
            </Text>
            <Text fontSize="sm" color="gray.600">
              Utilisateurs
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardBody textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="red.500">
              {users.filter(u => u.role === 'ADMIN').length}
            </Text>
            <Text fontSize="sm" color="gray.600">
              Admins
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardBody textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="purple.500">
              {users.filter(u => ADMIN_ROLES.includes(u.role)).length}
            </Text>
            <Text fontSize="sm" color="gray.600">
              Administrateurs
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardBody textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="gray.500">
              {users.filter(u => u.role === 'MEMBER').length}
            </Text>
            <Text fontSize="sm" color="gray.600">
              Membres
            </Text>
          </CardBody>
        </Card>
      </SimpleGrid>
    </VStack>
  );
};

/**
 * ============= Composant Documents Management =============
 */
const DocumentsManagement = () => {
  return (
    <VStack spacing={6} align="stretch">
      <Alert status="info">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Gestion des modèles de documents</Text>
          <Text fontSize="sm">Templates pour emails, lettres, et autres documents</Text>
        </Box>
      </Alert>

      <TemplateManagement />
    </VStack>
  );
};

const SiteLogsManagement = () => {
  const userRolesHook = useUserRoles();
  const canReadLogs = userRolesHook.hasRole('ADMIN');
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byStatus: {}, topActions: [], lastEventAt: null });
  const [limit, setLimit] = useState(200);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    if (!canReadLogs) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (status) params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      const response = await apiClient.get(`/api/admin/site-logs?${params.toString()}`);
      setLogs(Array.isArray(response?.logs) ? response.logs : []);
      setSummary(response?.summary || { total: 0, byStatus: {}, topActions: [], lastEventAt: null });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger les logs',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [canReadLogs]);

  if (!canReadLogs) {
    return (
      <Alert status="error">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Accès réservé aux administrateurs</Text>
          <Text fontSize="sm">La consultation des journaux d'actions est strictement limitée au rôle ADMIN.</Text>
        </Box>
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Alert status="info">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Journal d'actions MyRBE</Text>
          <Text fontSize="sm">Suivi des actions sensibles (authentification, sécurité, opérations critiques).</Text>
        </Box>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Card><CardBody><Text fontSize="sm" color="gray.600">Total logs</Text><Heading size="md">{summary.total || 0}</Heading></CardBody></Card>
        <Card><CardBody><Text fontSize="sm" color="gray.600">Succès</Text><Heading size="md" color="green.500">{summary?.byStatus?.success || 0}</Heading></CardBody></Card>
        <Card><CardBody><Text fontSize="sm" color="gray.600">Échecs</Text><Heading size="md" color="red.500">{summary?.byStatus?.failed || 0}</Heading></CardBody></Card>
      </SimpleGrid>

      <Card variant="outline">
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3}>
            <FormControl>
              <FormLabel>Recherche</FormLabel>
              <Input placeholder="action, utilisateur, détail" value={search} onChange={(e) => setSearch(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Statut</FormLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Tous</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Limite</FormLabel>
              <Select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>&nbsp;</FormLabel>
              <Button leftIcon={<FiRefreshCw />} colorScheme="blue" onClick={loadLogs} isLoading={loading} w="full">
                Actualiser
              </Button>
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      <Card variant="outline">
        <CardHeader>
          <Heading size="sm">Top actions</Heading>
        </CardHeader>
        <CardBody>
          {Array.isArray(summary?.topActions) && summary.topActions.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
              {summary.topActions.map((entry) => (
                <Box key={entry.action} p={3} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="600" fontSize="sm">{entry.action}</Text>
                  <Badge mt={1} colorScheme="blue">{entry.count} occurrences</Badge>
                </Box>
              ))}
            </SimpleGrid>
          ) : (
            <Text color="gray.500">Aucune action enregistrée.</Text>
          )}
        </CardBody>
      </Card>

      <Card variant="outline">
        <CardHeader>
          <HStack justify="space-between">
            <Heading size="sm">Détail des logs</Heading>
            <Text fontSize="xs" color="gray.500">
              Dernier événement: {summary?.lastEventAt ? new Date(summary.lastEventAt).toLocaleString('fr-FR') : 'n/a'}
            </Text>
          </HStack>
        </CardHeader>
        <CardBody>
          {loading ? (
            <Center py={8}><Spinner /></Center>
          ) : logs.length === 0 ? (
            <Text color="gray.500">Aucun log trouvé pour ce filtre.</Text>
          ) : (
            <Table size="sm" variant="simple">
              <Thead>
                <Tr bg="gray.50">
                  <Th>Date</Th>
                  <Th>Statut</Th>
                  <Th>Action</Th>
                  <Th>Utilisateur</Th>
                  <Th>Détails</Th>
                </Tr>
              </Thead>
              <Tbody>
                {logs.map((entry, idx) => (
                  <Tr key={`${entry.timestamp}-${entry.action}-${idx}`}>
                    <Td fontSize="xs">{entry.timestamp ? new Date(entry.timestamp).toLocaleString('fr-FR') : '-'}</Td>
                    <Td>
                      <Badge colorScheme={String(entry.status).toLowerCase() === 'success' ? 'green' : 'red'}>
                        {entry.status || 'unknown'}
                      </Badge>
                    </Td>
                    <Td fontWeight="600" fontSize="xs">{entry.action || '-'}</Td>
                    <Td fontSize="xs">{entry.user || '-'}</Td>
                    <Td fontSize="xs" maxW="520px" whiteSpace="normal">{entry.details || '-'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </VStack>
  );
};

const TrafficContextManagement = () => {
  const userRolesHook = useUserRoles();
  const canReadTraffic = userRolesHook.hasRole('ADMIN');
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const loadTrafficContext = async () => {
    if (!canReadTraffic) return;

    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/site-traffic-context');
      setData(response);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger les données de trafic/contexte',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrafficContext();
  }, [canReadTraffic]);

  if (!canReadTraffic) {
    return (
      <Alert status="error">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Accès réservé aux administrateurs</Text>
          <Text fontSize="sm">La page Trafic et contexte est strictement limitée au rôle ADMIN.</Text>
        </Box>
      </Alert>
    );
  }

  const traffic = data?.trafficContext;
  const pagespeedMobile = data?.pagespeed?.mobile;
  const pagespeedDesktop = data?.pagespeed?.desktop;
  const serverContext = data?.serverContext;
  const monthlyVisitsSeries = Array.isArray(traffic?.monthlyVisits?.series) ? traffic.monthlyVisits.series : [];
  const daysInMonth = Number(traffic?.monthlyVisits?.daysInMonth || 31);

  const buildLinePath = (series, min, max, width = 1200, height = 220) => {
    if (!Array.isArray(series) || series.length === 0) return '';

    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 1;
    const stepX = series.length > 1 ? width / (series.length - 1) : width;

    return series
      .map((value, index) => {
        const normalized = (Number(value || 0) - safeMin) / (safeMax - safeMin);
        const y = height - normalized * height;
        const x = index * stepX;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${Math.max(0, Math.min(height, y)).toFixed(2)}`;
      })
      .join(' ');
  };

  const visitsSeries = monthlyVisitsSeries.map((point) => Number(point.visits || 0));
  const visitsMax = visitsSeries.length > 0 ? Math.max(...visitsSeries, 10) : 10;
  const visitsMin = visitsSeries.length > 0 ? Math.min(...visitsSeries, 0) : 0;
  const visitsPath = buildLinePath(visitsSeries, visitsMin, visitsMax);
  const lastDayVisits = visitsSeries.length > 0 ? visitsSeries[visitsSeries.length - 1] : 0;
  const monthLabel = traffic?.monthlyVisits?.month || '-';

  return (
    <VStack spacing={6} align="stretch">
      <Alert status="info">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Trafic et contexte du site externe</Text>
          <Text fontSize="sm">Vue consolidée: disponibilité, temps de réponse, ressources SEO, contexte serveur et score PageSpeed.</Text>
        </Box>
      </Alert>

      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={0}>
          <Heading size="sm">Cible: {data?.externalSite || '-'}</Heading>
          <Text fontSize="xs" color="gray.500">Dernière collecte: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('fr-FR') : 'n/a'}</Text>
        </VStack>
        <Button leftIcon={<FiRefreshCw />} colorScheme="blue" onClick={loadTrafficContext} isLoading={loading}>
          Recharger
        </Button>
      </HStack>

      <Card variant="outline" w="100%" minH="320px">
        <CardHeader pb={2}>
          <HStack justify="space-between" align="start" wrap="wrap">
            <Box>
              <Heading size="md">Courbe visites & interactions (site externe)</Heading>
              <Text fontSize="sm" color="gray.600">Visites journalières du mois (jour 1 à jour {daysInMonth})</Text>
            </Box>
            <VStack align="end" spacing={0}>
              <Text fontSize="xs" color="gray.500">Dernier point</Text>
              <Heading size="sm">{lastDayVisits}</Heading>
              <Text fontSize="xs" color="gray.500">Mois: {monthLabel}</Text>
            </VStack>
          </HStack>
        </CardHeader>
        <CardBody pt={2}>
          {visitsSeries.length < 2 ? (
            <Center h="220px"><Text color="gray.500">Collecte en cours... Rechargez pour enrichir la courbe.</Text></Center>
          ) : (
            <Box h="240px" w="100%" borderRadius="md" bg="gray.50" p={3}>
              <svg viewBox="0 0 1200 220" width="100%" height="100%" preserveAspectRatio="none" role="img" aria-label="Courbe visites interactions trafic externe">
                <defs>
                  <filter id="trilogyGreenHalo" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.4" result="blur" />
                  </filter>
                </defs>
                <line x1="0" y1="220" x2="1200" y2="220" stroke="#CBD5E0" strokeWidth="1" />
                <line x1="0" y1="0" x2="0" y2="220" stroke="#CBD5E0" strokeWidth="1" />
                <path d={visitsPath} fill="none" stroke="#2f9e44" strokeWidth="2" opacity="0.65" filter="url(#trilogyGreenHalo)" strokeLinecap="round" strokeLinejoin="round" />
                <path d={visitsPath} fill="none" stroke="#2f9e44" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Box>
          )}
          <HStack justify="space-between" mt={2} fontSize="xs" color="gray.500">
            <Text>Min: {visitsMin}</Text>
            <Text>Max: {visitsMax}</Text>
            <Text>Points: {daysInMonth}</Text>
          </HStack>
        </CardBody>
      </Card>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        <Card><CardBody><HStack><FiMonitor /><Text fontSize="sm">Uptime API</Text></HStack><Heading size="md">{serverContext?.uptimeSeconds || 0}s</Heading></CardBody></Card>
        <Card><CardBody><HStack><FiTrendingUp /><Text fontSize="sm">Latence moyenne</Text></HStack><Heading size="md">{traffic?.averageResponseTimeMs ?? '-'} ms</Heading></CardBody></Card>
        <Card><CardBody><Text fontSize="sm">PageSpeed Mobile</Text><Heading size="md">{pagespeedMobile?.score ?? '-'}</Heading></CardBody></Card>
        <Card><CardBody><Text fontSize="sm">PageSpeed Desktop</Text><Heading size="md">{pagespeedDesktop?.score ?? '-'}</Heading></CardBody></Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        <Card variant="outline">
          <CardHeader><Heading size="sm">Pages surveillées</Heading></CardHeader>
          <CardBody>
            {!traffic?.pages ? (
              <Text color="gray.500">Aucune donnée.</Text>
            ) : (
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr bg="gray.50">
                    <Th>URL</Th>
                    <Th>Statut</Th>
                    <Th>Temps</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {traffic.pages.map((probe) => (
                    <Tr key={probe.url}>
                      <Td fontSize="xs">{probe.url}</Td>
                      <Td>
                        <Badge colorScheme={probe.ok ? 'green' : 'red'}>
                          {probe.status || 'ERR'}
                        </Badge>
                      </Td>
                      <Td fontSize="xs">{probe.responseTimeMs ?? '-'} ms</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card variant="outline">
          <CardHeader><Heading size="sm">Ressources SEO/Contexte</Heading></CardHeader>
          <CardBody>
            {!traffic?.resources ? (
              <Text color="gray.500">Aucune donnée.</Text>
            ) : (
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr bg="gray.50">
                    <Th>Ressource</Th>
                    <Th>Statut</Th>
                    <Th>Temps</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {traffic.resources.map((probe) => (
                    <Tr key={probe.url}>
                      <Td fontSize="xs">{probe.url}</Td>
                      <Td>
                        <Badge colorScheme={probe.ok ? 'green' : 'red'}>
                          {probe.status || 'ERR'}
                        </Badge>
                      </Td>
                      <Td fontSize="xs">{probe.responseTimeMs ?? '-'} ms</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Card variant="outline">
          <CardHeader><Heading size="sm">Détail PageSpeed Mobile</Heading></CardHeader>
          <CardBody>
            {pagespeedMobile?.enabled === false ? (
              <Text color="orange.500">PageSpeed indisponible: configurez PAGESPEED_API_KEY côté serveur.</Text>
            ) : (
              <VStack align="start" spacing={1} fontSize="sm">
                <Text>Score: {pagespeedMobile?.score ?? '-'}</Text>
                <Text>LCP: {pagespeedMobile?.lcpMs ?? '-'} ms</Text>
                <Text>FCP: {pagespeedMobile?.fcpMs ?? '-'} ms</Text>
                <Text>CLS: {pagespeedMobile?.cls ?? '-'}</Text>
                <Text>TBT: {pagespeedMobile?.tbtMs ?? '-'} ms</Text>
                <Text>Speed Index: {pagespeedMobile?.speedIndexMs ?? '-'} ms</Text>
              </VStack>
            )}
          </CardBody>
        </Card>

        <Card variant="outline">
          <CardHeader><Heading size="sm">Détail PageSpeed Desktop</Heading></CardHeader>
          <CardBody>
            {pagespeedDesktop?.enabled === false ? (
              <Text color="orange.500">PageSpeed indisponible: configurez PAGESPEED_API_KEY côté serveur.</Text>
            ) : (
              <VStack align="start" spacing={1} fontSize="sm">
                <Text>Score: {pagespeedDesktop?.score ?? '-'}</Text>
                <Text>LCP: {pagespeedDesktop?.lcpMs ?? '-'} ms</Text>
                <Text>FCP: {pagespeedDesktop?.fcpMs ?? '-'} ms</Text>
                <Text>CLS: {pagespeedDesktop?.cls ?? '-'}</Text>
                <Text>TBT: {pagespeedDesktop?.tbtMs ?? '-'} ms</Text>
                <Text>Speed Index: {pagespeedDesktop?.speedIndexMs ?? '-'} ms</Text>
              </VStack>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>
    </VStack>
  );
};

/**
 * ============= Page Principale SiteManagement =============
 */
const SiteManagement = () => {
  const userRolesHook = useUserRoles();
  const isStrictAdmin = userRolesHook.hasRole('ADMIN');

  const sections = [
    {
      id: 'access',
      label: '🔐 Accès utilisateurs',
      icon: FiShield,
      render: () => <AccessManagement />,
    },
    {
      id: 'permissions',
      label: '🛡️ Permissions',
      icon: FiLock,
      render: () => <PermissionsManagement />,
    },
    {
      id: 'notifications',
      label: '🔔 Notifications',
      icon: FiBell,
      render: () => <NotificationsManagement />,
    },
    {
      id: 'announcements',
      label: '📢 Annonces d\'Accueil',
      icon: FiBell,
      render: () => <HomeAnnouncementsManagement />,
    },
    {
      id: 'news',
      label: '📰 Actualités',
      icon: FiGlobe,
      render: () => <NewsManagement />,
    },
    {
      id: 'emails',
      label: '📧 Modèles d\'email',
      icon: FiMail,
      render: () => <EmailTemplateManager />,
    },
    {
      id: 'member-profiles',
      label: '👥 Profils Adhérents',
      icon: FiUsers,
      render: () => <MemberProfilesManager />,
    },
    {
      id: 'documents',
      label: '📄 Documents',
      icon: FiActivity,
      render: () => <DocumentsManagement />,
    },
    ...(isStrictAdmin
      ? [
          {
            id: 'logs',
            label: '🧾 Logs',
            icon: FiActivity,
            render: () => <SiteLogsManagement />,
          },
          {
            id: 'traffic-context',
            label: '📈 Trafic et contexte',
            icon: FiTrendingUp,
            render: () => <TrafficContextManagement />,
          },
        ]
      : []),
  ];

  return (
    <WorkspaceLayout
      title="Gestion du Site Web"
      subtitle="Accès, permissions, actualités, templates et configuration"
      sections={sections}
      defaultSectionId="access"
      sidebarTitle="Site Web"
      sidebarSubtitle="Administration"
      sidebarTitleIcon={FiGlobe}
      versionLabel="Site Management v2"
    />
  );
};

export default SiteManagement;
