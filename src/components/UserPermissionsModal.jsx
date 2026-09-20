import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Button, VStack, HStack, Text, Box, Heading, Badge, Switch, SimpleGrid,
  useToast, Spinner, Center, Divider, Accordion, AccordionItem, AccordionButton,
  AccordionPanel, AccordionIcon, Alert, AlertIcon, Tabs, TabList, TabPanels,
  Tab, TabPanel, FormControl, FormLabel, Checkbox, CheckboxGroup, Stack,
  useColorModeValue, Icon, Tooltip
} from '@chakra-ui/react';
import { FiShield, FiEye, FiEdit, FiLock, FiUnlock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { apiClient } from '../api/config';

// Structure des ressources organisées par catégorie
const RESOURCE_CATEGORIES = {
  'Gestion du Site': {
    icon: '🌐',
    resources: [
      { key: 'SITE_MANAGEMENT', label: 'Gestion du Site', description: 'Administration générale du site' },
      { key: 'SITE_USERS', label: 'Utilisateurs', description: 'Gestion des comptes utilisateurs' },
      { key: 'SITE_CONFIG', label: 'Configuration', description: 'Paramètres du site' },
      { key: 'SITE_CONTENT', label: 'Contenu', description: 'Actualités, médias, sondages' }
    ]
  },
  'RétroBus (Véhicules)': {
    icon: '🚌',
    resources: [
      { key: 'VEHICLES', label: 'Parc Véhicules', description: 'Accès au parc de véhicules' },
      { key: 'VEHICLE_VIEW', label: 'Voir véhicules', description: 'Consulter les détails' },
      { key: 'VEHICLE_CREATE', label: 'Créer véhicule', description: 'Ajouter de nouveaux véhicules' },
      { key: 'VEHICLE_EDIT', label: 'Modifier véhicule', description: 'Éditer les véhicules existants' },
      { key: 'VEHICLE_DELETE', label: 'Supprimer véhicule', description: 'Supprimer des véhicules' }
    ]
  },
  'Événements': {
    icon: '📅',
    resources: [
      { key: 'EVENTS', label: 'Gestion Événements', description: 'Accès à la gestion des événements' },
      { key: 'EVENT_VIEW', label: 'Voir événements', description: 'Consulter les événements' },
      { key: 'EVENT_CREATE', label: 'Créer événement', description: 'Créer de nouveaux événements' },
      { key: 'EVENT_EDIT', label: 'Modifier événement', description: 'Éditer les événements' },
      { key: 'EVENT_DELETE', label: 'Supprimer événement', description: 'Supprimer des événements' }
    ]
  },
  'Finance': {
    icon: '💰',
    resources: [
      { key: 'FINANCE', label: 'Gestion Financière', description: 'Accès aux finances' },
      { key: 'FINANCE_VIEW', label: 'Voir finances', description: 'Consulter les opérations' },
      { key: 'FINANCE_EDIT', label: 'Modifier finances', description: 'Créer/modifier des opérations' }
    ]
  },
  'Membres & Adhésions': {
    icon: '👥',
    resources: [
      { key: 'MEMBERS', label: 'Gestion Membres', description: 'Accès à la gestion des membres' },
      { key: 'MEMBER_VIEW', label: 'Voir membres', description: 'Consulter les fiches membres' },
      { key: 'MEMBER_EDIT', label: 'Modifier membre', description: 'Éditer les membres' },
      { key: 'MEMBER_DELETE', label: 'Supprimer membre', description: 'Supprimer des membres' },
      { key: 'ADHESION_MANAGEMENT', label: 'Gestion Adhésions', description: 'Gérer les adhésions' }
    ]
  },
  'Stocks & Inventaire': {
    icon: '📦',
    resources: [
      { key: 'STOCK', label: 'Gestion Stocks', description: 'Accès aux stocks' },
      { key: 'STOCK_VIEW', label: 'Voir stocks', description: 'Consulter l\'inventaire' },
      { key: 'STOCK_EDIT', label: 'Modifier stocks', description: 'Gérer les stocks' }
    ]
  },
  'Communications': {
    icon: '📧',
    resources: [
      { key: 'NEWSLETTER', label: 'Newsletter', description: 'Gérer la newsletter' },
      { key: 'RETROMAIL', label: 'RétroMail', description: 'Messagerie interne' }
    ]
  },
  'Planning & Support': {
    icon: '🗓️',
    resources: [
      { key: 'RETROPLANNING', label: 'RétroPlanning', description: 'Planning partagé' },
      { key: 'RETROSUPPORT', label: 'RétroSupport', description: 'Support technique' },
      { key: 'RETRODEMANDES', label: 'RétroDemandes', description: 'Gestion des demandes' }
    ]
  },
  'RétroMerch (Boutique)': {
    icon: '🛍️',
    resources: [
      { key: 'RETROMERCH', label: 'RétroMerch', description: 'Boutique en ligne' },
      { key: 'RETROMERCH_VIEW', label: 'Voir produits', description: 'Consulter le catalogue' },
      { key: 'RETROMERCH_PRODUCTS', label: 'Gérer produits', description: 'Créer/modifier produits' },
      { key: 'RETROMERCH_ORDERS', label: 'Gérer commandes', description: 'Suivi des commandes' },
      { key: 'RETROMERCH_EDIT', label: 'Administration', description: 'Configuration boutique' }
    ]
  },
  'Administration': {
    icon: '⚙️',
    resources: [
      { key: 'PERMISSIONS_MANAGEMENT', label: 'Gestion Permissions', description: 'Gérer les permissions' },
      { key: 'ADMIN_PANEL', label: 'Panel Admin', description: 'Panneau d\'administration' },
      { key: 'ADMIN_LOGS', label: 'Logs Système', description: 'Consulter les journaux' },
      { key: 'ADMIN_SETTINGS', label: 'Paramètres', description: 'Configuration avancée' }
    ]
  }
};

// Cartes MyRBE disponibles
const MYRBE_CARDS = [
  { key: 'VEHICLES', label: 'RétroBus', icon: '🚌' },
  { key: 'EVENTS', label: 'Gestion des Événements', icon: '📅' },
  { key: 'MEMBERS', label: 'Gestion RH', icon: '👥' },
  { key: 'FINANCE', label: 'Gestion Financière', icon: '💰' },
  { key: 'STOCK', label: 'Gestion des Stocks', icon: '📦' },
  { key: 'RETROMERCH', label: 'RétroMerch', icon: '🛍️' },
  { key: 'NEWSLETTER', label: 'Gestion Newsletter', icon: '📧' },
  { key: 'SITE_MANAGEMENT', label: 'Gestion du Site', icon: '🌐' },
  { key: 'RETROSUPPORT', label: 'RétroSupport', icon: '🆘' },
  { key: 'RETRODEMANDES', label: 'RétroDemandes', icon: '📝' },
  { key: 'RETROPLANNING', label: 'Planning partagés', icon: '🗓️' },
  { key: 'RETROMAIL', label: 'RétroMail', icon: '📨' }
];

const PERMISSION_ACTIONS = [
  { key: 'READ', label: 'Consulter', color: 'blue' },
  { key: 'CREATE', label: 'Créer', color: 'green' },
  { key: 'UPDATE', label: 'Modifier', color: 'orange' },
  { key: 'DELETE', label: 'Supprimer', color: 'red' },
  { key: 'EXPORT', label: 'Exporter', color: 'purple' },
  { key: 'APPROVE', label: 'Valider', color: 'teal' },
  { key: 'MANAGE', label: 'Administrer', color: 'pink' }
];

const SENSITIVE_FUNCTIONS = [
  { resource: 'MEMBERS', action: 'APPROVE', label: 'Valider une adhésion', description: 'Active ou refuse les dossiers d’adhésion.' },
  { resource: 'MEMBERS', action: 'EXPORT', label: 'Exporter les adhérents', description: 'Télécharge les listes et données RH.' },
  { resource: 'FINANCE', action: 'APPROVE', label: 'Valider les opérations financières', description: 'Valide les opérations et paiements.' },
  { resource: 'FINANCE', action: 'EXPORT', label: 'Exporter les finances', description: 'Télécharge les exports financiers.' },
  { resource: 'SITE_USERS', action: 'MANAGE', label: 'Gérer les comptes', description: 'Crée, modifie, désactive et rattache les accès.' },
  { resource: 'PERMISSIONS_MANAGEMENT', action: 'MANAGE', label: 'Gérer les permissions', description: 'Modifie les rôles et droits des autres utilisateurs.' },
  { resource: 'RETROMAIL', action: 'MANAGE', label: 'Administrer RétroMail', description: 'Accède à l’administration de la messagerie.' },
  { resource: 'VEHICLES', action: 'APPROVE', label: 'Valider les interventions véhicules', description: 'Valide les opérations sensibles du parc.' }
];

const normalizePermissions = (rawPermissions) => {
  if (Array.isArray(rawPermissions)) {
    return rawPermissions.map((permission) => ({
      ...permission,
      actions: Array.isArray(permission.actions)
        ? permission.actions.map((action) => String(action).toUpperCase())
        : []
    }));
  }

  if (rawPermissions && typeof rawPermissions === 'object') {
    return Object.entries(rawPermissions).map(([resource, actions]) => ({
      resource,
      actions: Array.isArray(actions)
        ? actions.map((action) => String(action).toUpperCase())
        : []
    }));
  }

  return [];
};

export default function UserPermissionsModal({ isOpen, onClose, user, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingResource, setUpdatingResource] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [visibleCards, setVisibleCards] = useState([]);
  const toast = useToast();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    if (isOpen && user) {
      loadPermissions();
    }
  }, [isOpen, user]);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      // Charger les permissions via l'API
      const response = await apiClient.get(`/api/user-permissions/${user.id}`);
      
      if (response?.permissions) {
        const normalizedPermissions = normalizePermissions(response.permissions);
        setPermissions(normalizedPermissions);
        
        // Extraire les cartes visibles
        const cardPerms = normalizedPermissions.filter(p => 
          p.actions && p.actions.includes('GRANT')
        ).map(p => p.resource);
        setVisibleCards(cardPerms);
      } else {
        setPermissions([]);
        setVisibleCards([]);
      }
    } catch (error) {
      console.error('Erreur chargement permissions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les permissions',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (resource, action) => {
    const perm = permissions.find(p => p.resource === resource);
    return perm?.actions?.includes(String(action).toUpperCase()) || false;
  };

  const togglePermission = async (resource, action) => {
    const normalizedAction = String(action).toUpperCase();
    const currentValue = hasPermission(resource, normalizedAction);
    const currentActions = permissions.find((permission) => permission.resource === resource)?.actions || [];
    const nextActions = normalizedAction === 'READ' && currentValue
      ? []
      : currentValue
        ? currentActions.filter((permissionAction) => permissionAction !== normalizedAction)
        : [...new Set([...currentActions, normalizedAction])];
    
    try {
      await apiClient.put(`/api/user-permissions/${user.id}`, {
        resource,
        actions: nextActions
      });
      
      setPermissions((previous) => {
        const existing = previous.find((permission) => permission.resource === resource);
        const remaining = previous.filter((permission) => permission.resource !== resource);

        return nextActions.length > 0
          ? [...remaining, { ...existing, resource, actions: nextActions }]
          : remaining;
      });
      
      toast({
        title: 'Permission mise à jour',
        status: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('Erreur modification permission:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la permission',
        status: 'error',
        duration: 3000
      });
    }
  };

  const toggleCardVisibility = (cardKey) => {
    setVisibleCards(prev => {
      if (prev.includes(cardKey)) {
        return prev.filter(k => k !== cardKey);
      } else {
        return [...prev, cardKey];
      }
    });
  };

  const handleSaveCards = async () => {
    setSaving(true);
    try {
      // Sauvegarder les cartes visibles
      await apiClient.post(`/api/user-permissions/${user.id}/cards`, {
        visibleCards
      });
      
      toast({
        title: 'Cartes MyRBE mises à jour',
        status: 'success',
        duration: 2000
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erreur sauvegarde cartes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les cartes visibles',
        status: 'error',
        duration: 3000
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAllResourcePermissions = async (resource) => {
    const allActions = PERMISSION_ACTIONS.map((permissionAction) => permissionAction.key);
    const hasAllActions = allActions.every((action) => hasPermission(resource, action));

    setUpdatingResource(resource);
    try {
      await apiClient.put(`/api/user-permissions/${user.id}`, {
        resource,
        actions: hasAllActions ? [] : allActions
      });

      setPermissions((previous) => {
        const existing = previous.find((permission) => permission.resource === resource);
        const existingActions = existing?.actions || [];
        const nextActions = hasAllActions
          ? existingActions.filter((action) => !allActions.includes(action))
          : [...new Set([...existingActions, ...allActions])];
        const remaining = previous.filter((permission) => permission.resource !== resource);

        return nextActions.length > 0
          ? [...remaining, { ...existing, resource, actions: nextActions }]
          : remaining;
      });

      toast({
        title: hasAllActions ? 'Droits retirés' : 'Droits attribués',
        description: hasAllActions
          ? 'Les actions de cette ressource ont été retirées.'
          : 'Toutes les actions de cette ressource ont été attribuées.',
        status: 'success',
        duration: 2500
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erreur modification des droits de la ressource:', error);
      await loadPermissions();
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier tous les droits de cette ressource',
        status: 'error',
        duration: 3000
      });
    } finally {
      setUpdatingResource(null);
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <HStack spacing={3} justify="space-between" pr={10}>
            <HStack spacing={3}>
              <Icon as={FiShield} boxSize={6} color="blue.500" />
              <VStack align="start" spacing={0}>
                <Text>Gérer les permissions</Text>
                <Text fontSize="sm" fontWeight="normal" color="gray.600">
                  {user.firstName} {user.lastName} ({user.username || user.email})
                </Text>
              </VStack>
            </HStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {loading ? (
            <Center py={10}>
              <VStack>
                <Spinner size="xl" color="blue.500" />
                <Text>Chargement des permissions...</Text>
              </VStack>
            </Center>
          ) : (
            <Tabs colorScheme="blue" variant="enclosed">
              <TabList>
                <Tab><Icon as={FiLock} mr={2} /> Pages et données</Tab>
                <Tab><Icon as={FiShield} mr={2} /> Actions sensibles</Tab>
                <Tab><Icon as={FiEye} mr={2} /> Cartes MyRBE Visibles</Tab>
              </TabList>

              <TabPanels>
                {/* Onglet 1: Permissions par ressource */}
                <TabPanel>
                  <Alert status="info" mb={4} borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="bold">Droits appliqués à chaque écran :</Text>
                      <HStack spacing={4} mt={2}>
                        <HStack><Icon as={FiEye} color="blue.500" /><Text fontSize="sm">Consulter : ouvrir et lire</Text></HStack>
                        <HStack><Icon as={FiEdit} color="orange.500" /><Text fontSize="sm">Modifier : changer les données</Text></HStack>
                        <HStack><Icon as={FiLock} color="red.500" /><Text fontSize="sm">Supprimer : action irréversible</Text></HStack>
                      </HStack>
                    </Box>
                  </Alert>

                  <Accordion allowMultiple>
                    {Object.entries(RESOURCE_CATEGORIES).map(([categoryName, category]) => (
                      <AccordionItem key={categoryName} border="1px" borderColor={borderColor} borderRadius="md" mb={3}>
                        <AccordionButton _hover={{ bg: hoverBg }}>
                          <HStack flex={1} textAlign="left" spacing={3}>
                            <Text fontSize="2xl">{category.icon}</Text>
                            <Text fontWeight="bold">{categoryName}</Text>
                            <Badge colorScheme="blue">{category.resources.length} ressources</Badge>
                          </HStack>
                          <AccordionIcon />
                        </AccordionButton>

                        <AccordionPanel pb={4} bg={cardBg}>
                          <VStack align="stretch" spacing={3}>
                            {category.resources.map(resource => {
                              const hasRead = hasPermission(resource.key, 'READ');
                              const hasAllActions = PERMISSION_ACTIONS.every((permissionAction) => (
                                hasPermission(resource.key, permissionAction.key)
                              ));

                              return (
                                <Box
                                  key={resource.key}
                                  p={3}
                                  borderRadius="md"
                                  border="1px"
                                  borderColor={borderColor}
                                  bg={hasRead ? 'green.50' : 'gray.50'}
                                  _dark={{ bg: hasRead ? 'green.900' : 'gray.700' }}
                                >
                                  <HStack justify="space-between" mb={2}>
                                    <VStack align="start" spacing={0} flex={1}>
                                      <Text fontWeight="bold">{resource.label}</Text>
                                      <Text fontSize="xs" color="gray.600">{resource.description}</Text>
                                    </VStack>
                                    <Button
                                      size="xs"
                                      colorScheme={hasAllActions ? 'red' : 'blue'}
                                      variant={hasAllActions ? 'outline' : 'solid'}
                                      leftIcon={<Icon as={hasAllActions ? FiLock : FiUnlock} />}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        toggleAllResourcePermissions(resource.key);
                                      }}
                                      isLoading={updatingResource === resource.key}
                                      loadingText="Mise à jour..."
                                    >
                                      {hasAllActions ? 'Tout désattribuer' : 'Tout attribuer'}
                                    </Button>
                                  </HStack>

                                  <SimpleGrid columns={{ base: 2, md: 4, lg: 7 }} spacing={2}>
                                    {PERMISSION_ACTIONS.map((permissionAction) => {
                                      const isDependentAction = permissionAction.key !== 'READ';
                                      const isDisabled = isDependentAction && !hasRead;

                                      return (
                                      <FormControl
                                        key={`${resource.key}-${permissionAction.key}`}
                                        display="flex"
                                        alignItems="center"
                                        opacity={isDisabled ? 0.4 : 1}
                                      >
                                        <Switch
                                          id={`${resource.key}-${permissionAction.key}`}
                                          isChecked={hasPermission(resource.key, permissionAction.key)}
                                          isDisabled={isDisabled}
                                          onClick={(event) => event.stopPropagation()}
                                          onChange={(event) => {
                                            event.stopPropagation();
                                            togglePermission(resource.key, permissionAction.key);
                                          }}
                                          colorScheme={permissionAction.color}
                                          mr={2}
                                        />
                                        <FormLabel htmlFor={`${resource.key}-${permissionAction.key}`} mb={0} fontSize="xs">
                                          {permissionAction.label}
                                        </FormLabel>
                                      </FormControl>
                                      );
                                    })}
                                  </SimpleGrid>
                                </Box>
                              );
                            })}
                          </VStack>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabPanel>

                <TabPanel>
                  <Alert status="warning" mb={4} borderRadius="md">
                    <AlertIcon />
                    <Text>Ces droits donnent accès à des opérations sensibles. Ils sont séparés de la simple consultation des pages.</Text>
                  </Alert>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    {SENSITIVE_FUNCTIONS.map((operation) => {
                      const granted = hasPermission(operation.resource, operation.action);
                      return (
                        <Box key={`${operation.resource}-${operation.action}`} p={4} borderWidth="1px" borderRadius="md" bg={granted ? 'orange.50' : cardBg}>
                          <HStack justify="space-between" align="start">
                            <Box pr={3}>
                              <Text fontWeight="600">{operation.label}</Text>
                              <Text fontSize="xs" color="gray.600" mt={1}>{operation.description}</Text>
                            </Box>
                            <Switch
                              isChecked={granted}
                              onChange={() => togglePermission(operation.resource, operation.action)}
                              colorScheme="orange"
                              aria-label={operation.label}
                            />
                          </HStack>
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                </TabPanel>

                {/* Onglet 2: Cartes MyRBE */}
                <TabPanel>
                  <Alert status="info" mb={4} borderRadius="md">
                    <AlertIcon />
                    <Text>
                      <strong>Cartes MyRBE :</strong> Sélectionnez les cartes qui seront visibles sur le dashboard MyRBE de cet utilisateur.
                    </Text>
                  </Alert>

                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                    {MYRBE_CARDS.map(card => {
                      const isVisible = visibleCards.includes(card.key);
                      
                      return (
                        <Box
                          key={card.key}
                          p={4}
                          borderRadius="lg"
                          border="2px"
                          borderColor={isVisible ? 'green.500' : borderColor}
                          bg={isVisible ? 'green.50' : cardBg}
                          _dark={{ bg: isVisible ? 'green.900' : 'gray.700' }}
                          cursor="pointer"
                          onClick={() => toggleCardVisibility(card.key)}
                          _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
                          transition="all 0.2s"
                        >
                          <VStack spacing={2}>
                            <HStack justify="space-between" w="full">
                              <Text fontSize="2xl">{card.icon}</Text>
                              <Icon
                                as={isVisible ? FiCheckCircle : FiXCircle}
                                color={isVisible ? 'green.500' : 'gray.400'}
                                boxSize={5}
                              />
                            </HStack>
                            <Text fontWeight="bold" fontSize="sm" textAlign="center">
                              {card.label}
                            </Text>
                          </VStack>
                        </Box>
                      );
                    })}
                  </SimpleGrid>

                  <Box mt={6} p={4} bg="blue.50" _dark={{ bg: 'blue.900' }} borderRadius="md">
                    <HStack spacing={2} mb={2}>
                      <Icon as={FiCheckCircle} color="green.500" />
                      <Text fontWeight="bold">Cartes sélectionnées : {visibleCards.length}/{MYRBE_CARDS.length}</Text>
                    </HStack>
                    <Button
                      colorScheme="blue"
                      onClick={handleSaveCards}
                      isLoading={saving}
                      loadingText="Sauvegarde..."
                      w="full"
                    >
                      Enregistrer les cartes visibles
                    </Button>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
