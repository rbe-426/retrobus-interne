import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Heading, VStack, HStack, Button, Text, Input, Select,
  FormControl, FormLabel, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter, useToast, useDisclosure,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Card, CardHeader, CardBody,
  Spinner, Center, SimpleGrid, Alert, AlertIcon, Menu, MenuButton,
  MenuList, MenuItem, IconButton, Divider, Tabs, TabList, TabPanels,
  Tab, TabPanel
} from '@chakra-ui/react';
import {
  FiPlus, FiEdit, FiTrash2, FiKey, FiUser, FiMail, FiLock,
  FiMoreVertical, FiDownload, FiSearch, FiFilter
} from 'react-icons/fi';
import { apiClient } from '../api/config.js';

const ROLES = {
  VOLUNTEER: { label: 'Bénévole', color: 'green' },
  MEMBER: { label: 'Membre', color: 'blue' },
  STAFF: { label: 'Staff', color: 'purple' },
  PARTNER: { label: 'Partenaire', color: 'orange' },
  ADMIN: { label: 'Admin', color: 'red' }
};

const ACCESS_TYPES = {
  INTERNAL: 'Interne',
  EXTERNAL: 'Externe',
  BOTH: 'Les deux'
};

export default function UsersAccess() {
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [editingAccess, setEditingAccess] = useState(null);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [formData, setFormData] = useState({
    matricule: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'MEMBER',
    hasInternalAccess: true,
    hasExternalAccess: false,
    notes: ''
  });

  // Charger les accès utilisateur
  const loadAccesses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/users/accesses');
      const data = Array.isArray(response) ? response : (response?.accesses || []);
      setAccesses(data);
    } catch (error) {
      console.error('Erreur chargement accès:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les accès utilisateur',
        status: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAccesses();
  }, [loadAccesses]);

  const resetForm = () => {
    setFormData({
      matricule: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'MEMBER',
      hasInternalAccess: true,
      hasExternalAccess: false,
      notes: ''
    });
    setEditingAccess(null);
  };

  const handleCreate = () => {
    resetForm();
    onOpen();
  };

  const handleEdit = (access) => {
    setEditingAccess(access);
    setFormData({
      matricule: access.matricule || '',
      email: access.email || '',
      firstName: access.firstName || '',
      lastName: access.lastName || '',
      role: access.role || 'MEMBER',
      hasInternalAccess: access.hasInternalAccess || false,
      hasExternalAccess: access.hasExternalAccess || false,
      notes: access.notes || ''
    });
    onOpen();
  };

  const handleSubmit = async () => {
    if (!formData.matricule.trim() || !formData.email.trim()) {
      toast({
        title: 'Erreur',
        description: 'Matricule et email sont requis',
        status: 'error'
      });
      return;
    }

    try {
      if (editingAccess) {
        // Mettre à jour
        await apiClient.put(`/api/users/accesses/${editingAccess.id}`, formData);
        toast({ title: 'Accès modifié', status: 'success' });
      } else {
        // Créer
        await apiClient.post('/api/users/accesses', formData);
        toast({ title: 'Accès créé', status: 'success' });
      }
      await loadAccesses();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Erreur sauvegarde accès:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error'
      });
    }
  };

  const handleDelete = async (accessId) => {
    if (!window.confirm('Êtes-vous sûr de supprimer cet accès ?')) return;

    try {
      await apiClient.delete(`/api/users/accesses/${accessId}`);
      toast({ title: 'Accès supprimé', status: 'success' });
      await loadAccesses();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error'
      });
    }
  };

  const handleExport = () => {
    const csv = [
      ['Matricule', 'Email', 'Prénom', 'Nom', 'Rôle', 'Interne', 'Externe', 'Notes'],
      ...accesses.map(a => [
        a.matricule,
        a.email,
        a.firstName,
        a.lastName,
        a.role,
        a.hasInternalAccess ? 'Oui' : 'Non',
        a.hasExternalAccess ? 'Oui' : 'Non',
        a.notes || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accesses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredAccesses = accesses.filter(a => {
    const matchesQuery = !searchQuery || 
      a.matricule?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = !selectedRole || a.role === selectedRole;
    
    return matchesQuery && matchesRole;
  });

  if (loading) {
    return (
      <Center py={20}>
        <VStack>
          <Spinner size="lg" />
          <Text>Chargement des accès...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* En-tête */}
        <Box>
          <Heading mb={2}>Gestion des Accès Utilisateur</Heading>
          <Text color="gray.600">
            Créez et gérez les accès indépendamment des adhésions (idéal pour les partenaires)
          </Text>
        </Box>

        {/* Barre d'outils */}
        <HStack spacing={4} justify="space-between">
          <HStack spacing={3} flex={1}>
            <Input
              placeholder="Rechercher par matricule, email ou nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<FiSearch />}
            />
            <Select
              placeholder="Filtrer par rôle"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              maxW="200px"
            >
              {Object.entries(ROLES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </Select>
          </HStack>
          <HStack spacing={2}>
            <Button
              leftIcon={<FiDownload />}
              variant="outline"
              onClick={handleExport}
            >
              Exporter
            </Button>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              onClick={handleCreate}
            >
              Nouvel accès
            </Button>
          </HStack>
        </HStack>

        {/* Statistiques */}
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <VStack spacing={2}>
                <Text fontSize="sm" color="gray.600">Total accès</Text>
                <Heading>{accesses.length}</Heading>
              </VStack>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <VStack spacing={2}>
                <Text fontSize="sm" color="gray.600">Accès internes</Text>
                <Heading>{accesses.filter(a => a.hasInternalAccess).length}</Heading>
              </VStack>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <VStack spacing={2}>
                <Text fontSize="sm" color="gray.600">Accès externes</Text>
                <Heading>{accesses.filter(a => a.hasExternalAccess).length}</Heading>
              </VStack>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <VStack spacing={2}>
                <Text fontSize="sm" color="gray.600">Partenaires</Text>
                <Heading>{accesses.filter(a => a.role === 'PARTNER').length}</Heading>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Tableau des accès */}
        <Card>
          <CardHeader>
            <Heading size="md">Liste des accès</Heading>
          </CardHeader>
          <CardBody>
            {filteredAccesses.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Aucun accès</Text>
                  <Text fontSize="sm">Commencez par créer un nouvel accès utilisateur</Text>
                </Box>
              </Alert>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr bg="gray.50">
                      <Th>Matricule</Th>
                      <Th>Nom complet</Th>
                      <Th>Email</Th>
                      <Th>Rôle</Th>
                      <Th>Accès</Th>
                      <Th w="40px">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredAccesses.map(access => (
                      <Tr key={access.id}>
                        <Td fontWeight="bold" color="blue.600">{access.matricule}</Td>
                        <Td>{access.firstName} {access.lastName}</Td>
                        <Td fontSize="sm">{access.email}</Td>
                        <Td>
                          <Badge colorScheme={ROLES[access.role]?.color || 'gray'}>
                            {ROLES[access.role]?.label || access.role}
                          </Badge>
                        </Td>
                        <Td>
                          <HStack spacing={1}>
                            {access.hasInternalAccess && (
                              <Badge size="sm" colorScheme="green">Interne</Badge>
                            )}
                            {access.hasExternalAccess && (
                              <Badge size="sm" colorScheme="purple">Externe</Badge>
                            )}
                          </HStack>
                        </Td>
                        <Td>
                          <Menu>
                            <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" />
                            <MenuList>
                              <MenuItem icon={<FiEdit />} onClick={() => handleEdit(access)}>
                                Modifier
                              </MenuItem>
                              <MenuItem icon={<FiTrash2 />} onClick={() => handleDelete(access.id)} color="red.500">
                                Supprimer
                              </MenuItem>
                            </MenuList>
                          </Menu>
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

      {/* Modal création/édition */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingAccess ? 'Modifier l\'accès' : 'Créer un nouvel accès'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Matricule</FormLabel>
                <Input
                  value={formData.matricule}
                  onChange={(e) => setFormData(p => ({ ...p, matricule: e.target.value }))}
                  placeholder="exemple: j.dupont"
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4} w="100%">
                <FormControl isRequired>
                  <FormLabel>Prénom</FormLabel>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Nom</FormLabel>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Rôle</FormLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                >
                  {Object.entries(ROLES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </Select>
              </FormControl>

              <Divider />

              <FormControl>
                <FormLabel display="flex" alignItems="center" mb={3}>
                  <FiKey mr={2} /> Accès interne (site admin)
                </FormLabel>
                <input
                  type="checkbox"
                  checked={formData.hasInternalAccess}
                  onChange={(e) => setFormData(p => ({ ...p, hasInternalAccess: e.target.checked }))}
                />
                <Text fontSize="xs" color="gray.600" mt={1}>
                  Permet d'accéder à l'interface d'administration
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel display="flex" alignItems="center" mb={3}>
                  <FiGlobe mr={2} /> Accès externe (site public)
                </FormLabel>
                <input
                  type="checkbox"
                  checked={formData.hasExternalAccess}
                  onChange={(e) => setFormData(p => ({ ...p, hasExternalAccess: e.target.checked }))}
                />
                <Text fontSize="xs" color="gray.600" mt={1}>
                  Permet d'accéder au site public avec identifiants
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Input
                  as="textarea"
                  placeholder="Partenaire, projet spécial, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button colorScheme="blue" onClick={handleSubmit}>
                {editingAccess ? 'Modifier' : 'Créer'}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
