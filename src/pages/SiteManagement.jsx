import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Button, Card, CardBody, CardHeader,
  Heading, Input, Textarea, FormControl, FormLabel, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, useDisclosure, Badge, IconButton,
  Flex, Spacer, Alert, AlertIcon, Spinner, Center,
  Select, Switch, Table, Thead, Tbody, Tr, Th, Td, InputGroup,
  InputLeftElement, Menu, MenuButton, MenuList, MenuItem,
  useColorModeValue, Tooltip, Divider, SimpleGrid, Image as ChakraImage
} from '@chakra-ui/react';
import { 
  FiEdit, FiTrash2, FiPlus, FiUsers, FiSettings, FiGlobe, FiMail,
  FiShare, FiChevronLeft, FiChevronRight, FiArrowUpRight, FiSearch,
  FiRefreshCw, FiShield, FiLock, FiUnlock, FiActivity
} from 'react-icons/fi';
import { FaEdit, FaTrash, FaPlus, FaEye } from 'react-icons/fa';

import WorkspaceLayout from '../components/Layout/WorkspaceLayout';
import { apiClient } from '../api/config';
import { API_BASE_URL } from '../api/config';
import { displayNameFromUser, formatMemberLabel } from '../lib/names';
import { useUser } from '../context/UserContext';
import EmailTemplateManager from '../components/EmailTemplateManager';
import TemplateManagement from '../components/TemplateManagement';

/**
 * ============= Composant Access Management =============
 */
const AccessManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/api/admin/users');
      setUsers(Array.isArray(data) ? data : []);
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
          <Text fontWeight="bold">Gestion des accès</Text>
          <Text fontSize="sm">Consultez et gérez les utilisateurs du système</Text>
        </Box>
      </Alert>

      <Card variant="outline">
        <CardBody>
          <Table size="sm" variant="simple">
            <Thead>
              <Tr bg="gray.50">
                <Th>Utilisateur</Th>
                <Th>Email</Th>
                <Th>Rôle</Th>
                <Th>Créé</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user.id}>
                  <Td fontWeight="medium">{displayNameFromUser(user)}</Td>
                  <Td fontSize="sm">{user.email}</Td>
                  <Td>
                    <Badge colorScheme={user.role === 'admin' ? 'red' : 'blue'}>
                      {user.role}
                    </Badge>
                  </Td>
                  <Td fontSize="sm">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
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
    featured: false,
    published: false,
    showOnExternal: false,
  });
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    loadNews();
    // Afficher les infos de debug
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    setDebugInfo({
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      user: user ? JSON.parse(user) : null,
      apiUrl: apiClient.baseURL
    });
  }, []);

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
    setFormData({ title: '', content: '', featured: false, published: false, showOnExternal: false });
    onCreateOpen();
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      content: item.content,
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
      if (editingId) {
        await apiClient.put(`/api/retro-news/${editingId}`, formData);
        toast({ title: 'Succès', description: 'Actualité mise à jour', status: 'success' });
      } else {
        await apiClient.post('/api/retro-news', formData);
        toast({ title: 'Succès', description: 'Actualité créée', status: 'success' });
      }
      loadNews();
      onCreateClose();
    } catch (error) {
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

      {debugInfo && (
        <Card bg="gray.50" variant="outline">
          <CardBody>
            <VStack align="start" spacing={2} fontSize="sm">
              <Text fontWeight="bold">🔍 Informations Debug:</Text>
              <Text>Token présent: {debugInfo.hasToken ? '✅ Oui' : '❌ Non'}</Text>
              {debugInfo.hasToken && <Text>Token length: {debugInfo.tokenLength} chars</Text>}
              {debugInfo.user && (
                <>
                  <Text>Utilisateur: {debugInfo.user.username || debugInfo.user.email}</Text>
                  <Text>Rôle: {debugInfo.user.roles ? debugInfo.user.roles.join(', ') : 'N/A'}</Text>
                </>
              )}
              <Text>API URL: {debugInfo.apiUrl || 'Relative (proxy)'}</Text>
            </VStack>
          </CardBody>
        </Card>
      )}

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
          {news.map((item) => (
            <Card key={item.id} variant="outline" _hover={{ boxShadow: 'md' }} transition="all 0.2s">
              <CardHeader pb={3}>
                <VStack align="start" spacing={2}>
                  <Heading size="sm" noOfLines={2}>{item.title}</Heading>
                  <HStack spacing={2} flexWrap="wrap">
                    {item.published && <Badge colorScheme="green">Publié</Badge>}
                    {item.featured && <Badge colorScheme="purple">Vedette</Badge>}
                    {item.showOnExternal && <Badge colorScheme="blue">Externe</Badge>}
                  </HStack>
                </VStack>
              </CardHeader>
              <CardBody>
                <Text fontSize="sm" noOfLines={3} color="gray.600">
                  {item.content}
                </Text>
              </CardBody>
              <Divider />
              <CardBody>
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
          ))}
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
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input
                  placeholder="Titre de l'actualité..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Contenu</FormLabel>
                <Textarea
                  placeholder="Contenu..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                />
              </FormControl>

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
 * ============= Composant Settings =============
 */
const SiteSettings = () => {
  const [settings, setSettings] = useState({
    siteName: '',
    siteDescription: '',
    maintenanceMode: false,
  });

  return (
    <VStack spacing={6} align="stretch">
      <Alert status="info">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Paramètres du site</Text>
          <Text fontSize="sm">Configuration générale de RétroBus</Text>
        </Box>
      </Alert>

      <Card variant="outline">
        <CardHeader>
          <Heading size="md">Configuration générale</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Nom du site</FormLabel>
              <Input placeholder="RétroBus Essonne" value={settings.siteName} />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea placeholder="Description du site..." value={settings.siteDescription} />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb={0}>Mode maintenance</FormLabel>
              <Switch ml={2} isChecked={settings.maintenanceMode} />
            </FormControl>

            <Button colorScheme="blue" alignSelf="flex-start">
              Enregistrer les paramètres
            </Button>
          </VStack>
        </CardBody>
      </Card>
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

/**
 * ============= Page Principale SiteManagement =============
 */
const SiteManagement = () => {
  const { user } = useUser();

  const sections = [
    {
      id: 'access',
      label: '🔐 Accès utilisateurs',
      icon: FiShield,
      render: () => <AccessManagement />,
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
      id: 'documents',
      label: '📄 Documents',
      icon: FiActivity,
      render: () => <DocumentsManagement />,
    },
    {
      id: 'settings',
      label: '⚙️ Paramètres',
      icon: FiSettings,
      render: () => <SiteSettings />,
    },
  ];

  return (
    <WorkspaceLayout
      title="Gestion du Site Web"
      subtitle="Accès, actualités, templates et configuration"
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
