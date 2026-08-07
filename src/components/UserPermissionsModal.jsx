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

export default function UserPermissionsModal({ isOpen, onClose, user, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      
      if (response?.permissions && Array.isArray(response.permissions)) {
        setPermissions(response.permissions);
        
        // Extraire les cartes visibles
        const cardPerms = response.permissions.filter(p => 
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
    return perm?.actions?.includes(action) || false;
  };

  const togglePermission = async (resource, action) => {
    const currentValue = hasPermission(resource, action);
    
    try {
      if (currentValue) {
        // Retirer la permission
        await apiClient.delete(`/api/user-permissions/${user.id}`, {
          data: { resource, action }
        });
        
        setPermissions(prev => {
          return prev.map(p => {
            if (p.resource === resource) {
              return {
                ...p,
                actions: p.actions.filter(a => a !== action)
              };
            }
            return p;
          }).filter(p => p.actions.length > 0);
        });
      } else {
        // Ajouter la permission
        await apiClient.post(`/api/user-permissions/${user.id}`, {
          resource,
          action
        });
        
        setPermissions(prev => {
          const existing = prev.find(p => p.resource === resource);
          if (existing) {
            return prev.map(p => {
              if (p.resource === resource) {
                return {
                  ...p,
                  actions: [...(p.actions || []), action]
                };
              }
              return p;
            });
          } else {
            return [...prev, { resource, actions: [action] }];
          }
        });
      }
      
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

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <HStack spacing={3}>
            <Icon as={FiShield} boxSize={6} color="blue.500" />
            <VStack align="start" spacing={0}>
              <Text>Gérer les permissions</Text>
              <Text fontSize="sm" fontWeight="normal" color="gray.600">
                {user.firstName} {user.lastName} ({user.username || user.email})
              </Text>
            </VStack>
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
                <Tab><Icon as={FiLock} mr={2} /> Permissions par Ressource</Tab>
                <Tab><Icon as={FiEye} mr={2} /> Cartes MyRBE Visibles</Tab>
              </TabList>

              <TabPanels>
                {/* Onglet 1: Permissions par ressource */}
                <TabPanel>
                  <Alert status="info" mb={4} borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="bold">Types de permissions :</Text>
                      <HStack spacing={4} mt={2}>
                        <HStack><Icon as={FiUnlock} color="green.500" /><Text fontSize="sm">Accès : Peut voir la section</Text></HStack>
                        <HStack><Icon as={FiEye} color="blue.500" /><Text fontSize="sm">Lecture : Peut consulter les détails</Text></HStack>
                        <HStack><Icon as={FiEdit} color="orange.500" /><Text fontSize="sm">Écriture : Peut créer/modifier/supprimer</Text></HStack>
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
                              const hasAccess = hasPermission(resource.key, 'access');
                              const hasView = hasPermission(resource.key, 'view');
                              const hasEdit = hasPermission(resource.key, 'edit');

                              return (
                                <Box
                                  key={resource.key}
                                  p={3}
                                  borderRadius="md"
                                  border="1px"
                                  borderColor={borderColor}
                                  bg={hasAccess ? 'green.50' : 'gray.50'}
                                  _dark={{ bg: hasAccess ? 'green.900' : 'gray.700' }}
                                >
                                  <HStack justify="space-between" mb={2}>
                                    <VStack align="start" spacing={0} flex={1}>
                                      <Text fontWeight="bold">{resource.label}</Text>
                                      <Text fontSize="xs" color="gray.600">{resource.description}</Text>
                                    </VStack>
                                  </HStack>

                                  <HStack spacing={6}>
                                    <FormControl display="flex" alignItems="center">
                                      <Switch
                                        id={`${resource.key}-access`}
                                        isChecked={hasAccess}
                                        onChange={() => togglePermission(resource.key, 'access')}
                                        colorScheme="green"
                                        mr={2}
                                      />
                                      <FormLabel htmlFor={`${resource.key}-access`} mb={0} fontSize="sm">
                                        <HStack spacing={1}>
                                          <Icon as={FiUnlock} color="green.500" />
                                          <Text>Accès</Text>
                                        </HStack>
                                      </FormLabel>
                                    </FormControl>

                                    <FormControl display="flex" alignItems="center">
                                      <Switch
                                        id={`${resource.key}-view`}
                                        isChecked={hasView}
                                        onChange={() => togglePermission(resource.key, 'view')}
                                        colorScheme="blue"
                                        mr={2}
                                        isDisabled={!hasAccess}
                                      />
                                      <FormLabel htmlFor={`${resource.key}-view`} mb={0} fontSize="sm">
                                        <HStack spacing={1}>
                                          <Icon as={FiEye} color="blue.500" />
                                          <Text>Lecture</Text>
                                        </HStack>
                                      </FormLabel>
                                    </FormControl>

                                    <FormControl display="flex" alignItems="center">
                                      <Switch
                                        id={`${resource.key}-edit`}
                                        isChecked={hasEdit}
                                        onChange={() => togglePermission(resource.key, 'edit')}
                                        colorScheme="orange"
                                        mr={2}
                                        isDisabled={!hasAccess}
                                      />
                                      <FormLabel htmlFor={`${resource.key}-edit`} mb={0} fontSize="sm">
                                        <HStack spacing={1}>
                                          <Icon as={FiEdit} color="orange.500" />
                                          <Text>Écriture</Text>
                                        </HStack>
                                      </FormLabel>
                                    </FormControl>
                                  </HStack>
                                </Box>
                              );
                            })}
                          </VStack>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
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
