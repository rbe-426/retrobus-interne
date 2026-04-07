import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Button, Card, CardBody, CardHeader,
  Heading, Input, Textarea, FormControl, FormLabel, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, useDisclosure, Badge, IconButton,
  Flex, Spacer, Alert, AlertIcon, Spinner, Center, Switch,
  Table, Thead, Tbody, Tr, Th, Td, useColorModeValue,
  Tooltip, Divider, Container, Select
} from '@chakra-ui/react';
import {
  FiEdit, FiTrash2, FiPlus, FiBell, FiCheckCircle,
  FiClock, FiX
} from 'react-icons/fi';
import { notificationsAPI } from '../api/notifications';

/**
 * Composant de gestion des notifications pour l'onglet Admin
 * Permet de créer, modifier, et supprimer les notifications
 * qui s'affichent via la cloche dans la navbar
 */
const NotificationsManagement = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const bgCard = useColorModeValue('white', 'gray.800');
  const bgHover = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textSubtle = useColorModeValue('gray.600', 'gray.400');

  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info', // info, warning, success, error
    priority: 'normal', // low, normal, high
    active: true,
    expiresAt: '',
    targetedTo: 'all' // all, admins, members
  });

  // Charger les notifications
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsAPI.getAll();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les notifications',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      title: '',
      message: '',
      type: 'info',
      priority: 'normal',
      active: true,
      expiresAt: '',
      targetedTo: 'all'
    });
    onOpen();
  };

  const startEdit = (notification) => {
    setEditing(notification);
    setForm({
      title: notification.title || '',
      message: notification.message || '',
      type: notification.type || 'info',
      priority: notification.priority || 'normal',
      active: Boolean(notification.active),
      expiresAt: notification.expiresAt || '',
      targetedTo: notification.targetedTo || 'all'
    });
    onOpen();
  };

  const doSave = async () => {
    const trimmedTitle = (form.title || '').trim();
    const trimmedMessage = (form.message || '').trim();

    if (!trimmedTitle || !trimmedMessage) {
      toast({
        status: 'warning',
        title: 'Validation',
        description: 'Le titre et le message sont requis',
      });
      return;
    }

    try {
      const notificationData = {
        title: trimmedTitle,
        message: trimmedMessage,
        type: form.type,
        priority: form.priority,
        active: Boolean(form.active),
        expiresAt: form.expiresAt || null,
        targetedTo: form.targetedTo
      };

      if (editing) {
        // Mettre à jour
        await notificationsAPI.update(editing.id, notificationData);
        setNotifications(prev =>
          prev.map(n => n.id === editing.id ? { ...n, ...notificationData } : n)
        );
        toast({
          status: 'success',
          title: 'Succès',
          description: 'Notification modifiée',
        });
      } else {
        // Créer
        const newNotif = await notificationsAPI.create(notificationData);
        setNotifications(prev => [newNotif, ...prev]);
        toast({
          status: 'success',
          title: 'Succès',
          description: 'Notification créée',
        });
      }

      setEditing(null);
      setForm({
        title: '',
        message: '',
        type: 'info',
        priority: 'normal',
        active: true,
        expiresAt: '',
        targetedTo: 'all'
      });
      onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: `Impossible de sauvegarder: ${error.message}`,
      });
    }
  };

  const doDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) return;

    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast({
        status: 'success',
        title: 'Succès',
        description: 'Notification supprimée',
      });
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: `Impossible de supprimer: ${error.message}`,
      });
    }
  };

  const toggleActive = async (id) => {
    try {
      const notification = notifications.find(n => n.id === id);
      if (!notification) return;

      await notificationsAPI.toggleActive(id, !notification.active);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, active: !n.active } : n)
      );
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: `Impossible de modifier: ${error.message}`,
      });
    }
  };

  const getTypeBadgeColor = (type) => {
    const colors = {
      info: 'blue',
      warning: 'orange',
      success: 'green',
      error: 'red'
    };
    return colors[type] || 'gray';
  };

  const getPriorityBadgeColor = (priority) => {
    const colors = {
      low: 'gray',
      normal: 'blue',
      high: 'red'
    };
    return colors[priority] || 'gray';
  };

  const getTypeLabel = (type) => {
    const labels = {
      info: 'Information',
      warning: 'Attention',
      success: 'Succès',
      error: 'Erreur'
    };
    return labels[type] || type;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      low: 'Basse',
      normal: 'Normale',
      high: 'Haute'
    };
    return labels[priority] || priority;
  };

  return (
    <VStack align="stretch" spacing={6} w="100%">
      {/* En-tête avec bouton d'ajout */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg" display="flex" alignItems="center" gap={2}>
            <FiBell /> Notifications
          </Heading>
          <Text color={textSubtle} fontSize="sm" mt={1}>
            Gérez les notifications qui s'affichent dans la cloche de la navbar
          </Text>
        </Box>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="blue"
          onClick={openNew}
        >
          Nouvelle notification
        </Button>
      </HStack>

      <Divider />

      {/* État chargement */}
      {loading ? (
        <Center py={10}>
          <Spinner />
        </Center>
      ) : notifications.length === 0 ? (
        <Alert
          status="info"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="200px"
          borderRadius="md"
        >
          <AlertIcon boxSize="40px" mr={0} />
          <Text mt={4} fontWeight="bold">
            Aucune notification
          </Text>
          <Text fontSize="sm" color={textSubtle}>
            Créez votre première notification pour la partager avec vos utilisateurs
          </Text>
        </Alert>
      ) : (
        /* Tableau des notifications */
        <Box overflowX="auto" borderRadius="md" border="1px" borderColor={borderColor}>
          <Table variant="simple" size="sm">
            <Thead bg={useColorModeValue('gray.100', 'gray.700')}>
              <Tr>
                <Th>Titre</Th>
                <Th>Type</Th>
                <Th>Priorité</Th>
                <Th>Destinataires</Th>
                <Th>Statut</Th>
                <Th>Expire</Th>
                <Th textAlign="center">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {notifications.map((notif) => (
                <Tr key={notif.id} _hover={{ bg: bgHover }}>
                  <Td>
                    <VStack align="flex-start" spacing={0}>
                      <Text fontWeight="500">{notif.title}</Text>
                      <Text fontSize="xs" color={textSubtle} noOfLines={1}>
                        {notif.message}
                      </Text>
                    </VStack>
                  </Td>
                  <Td>
                    <Badge colorScheme={getTypeBadgeColor(notif.type)}>
                      {getTypeLabel(notif.type)}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={getPriorityBadgeColor(notif.priority)}>
                      {getPriorityLabel(notif.priority)}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant="outline" fontSize="xs">
                      {notif.targetedTo === 'all' ? 'Tous' :
                       notif.targetedTo === 'admins' ? 'Admins' :
                       'Adhérents'}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <Tooltip label={notif.active ? 'Désactiver' : 'Activer'}>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          icon={notif.active ? <FiCheckCircle /> : <FiX />}
                          colorScheme={notif.active ? 'green' : 'gray'}
                          onClick={() => toggleActive(notif.id)}
                        />
                      </Tooltip>
                      <Text fontSize="xs" color={textSubtle}>
                        {notif.active ? 'Actif' : 'Inactif'}
                      </Text>
                    </HStack>
                  </Td>
                  <Td>
                    {notif.expiresAt ? (
                      <Tooltip label={new Date(notif.expiresAt).toLocaleString('fr-FR')}>
                        <HStack spacing={1}>
                          <FiClock size={14} />
                          <Text fontSize="xs">
                            {new Date(notif.expiresAt).toLocaleDateString('fr-FR')}
                          </Text>
                        </HStack>
                      </Tooltip>
                    ) : (
                      <Text fontSize="xs" color={textSubtle}>Sans limite</Text>
                    )}
                  </Td>
                  <Td>
                    <HStack justify="center" spacing={0}>
                      <Tooltip label="Éditer">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          icon={<FiEdit />}
                          colorScheme="blue"
                          onClick={() => startEdit(notif)}
                        />
                      </Tooltip>
                      <Tooltip label="Supprimer">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          icon={<FiTrash2 />}
                          colorScheme="red"
                          onClick={() => doDelete(notif.id)}
                        />
                      </Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* Modal d'édition/création */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editing ? 'Modifier la notification' : 'Créer une notification'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input
                  placeholder="Ex: Maintenance prévue"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Message</FormLabel>
                <Textarea
                  placeholder="Décrivez le contenu de la notification..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                />
              </FormControl>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="info">Information</option>
                    <option value="warning">Attention</option>
                    <option value="success">Succès</option>
                    <option value="error">Erreur</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Priorité</FormLabel>
                  <Select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="low">Basse</option>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Destinataires</FormLabel>
                <Select
                  value={form.targetedTo}
                  onChange={(e) => setForm({ ...form, targetedTo: e.target.value })}
                >
                  <option value="all">Tous les utilisateurs</option>
                  <option value="admins">Administrateurs</option>
                  <option value="members">Adhérents</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Expire le (optionnel)</FormLabel>
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center" gap={3}>
                <FormLabel m={0}>Actif</FormLabel>
                <Switch
                  isChecked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  colorScheme="green"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={doSave}>
              {editing ? 'Modifier' : 'Créer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default NotificationsManagement;
