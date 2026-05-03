import React, { useState, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Button, VStack, HStack, Box, Heading, Text, Badge,
  useDisclosure, Icon, Divider, SimpleGrid,
  Input, Textarea, FormControl, FormLabel, NumberInput, NumberInputField,
  Table, Thead, Tbody, Tr, Th, Td, IconButton, Tooltip, useToast, Spinner, Center, Tabs, TabList, TabPanels, Tab, TabPanel
} from '@chakra-ui/react';
import { FiMapPin, FiActivity, FiPlus, FiTrash2, FiMap } from 'react-icons/fi';
import RouteMap from './RouteMap';
import { apiClient } from '../api/config.js';
import '../leaflet-custom.css';

/**
 * RetroGPS - Priorité: TRAÇAGE D'ITINÉRAIRES
 * Créez et tracez les tournées avec prise en compte des gabarits des bus
 */
export default function RetroGPS() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('routes');
  const [selectedRoute, setSelectedRoute] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    waypoints: [],
    difficulty: 'NORMAL',
    season: 'SUMMER',
    maxLength: null,
    maxHeight: null,
    maxWeight: null
  });
  
  const [newWaypoint, setNewWaypoint] = useState({ name: '', lat: '', lng: '', stopTime: 0 });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (isOpen) fetchRoutes();
  }, [isOpen]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/routes`);
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setRoutes(data);
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWaypoint = () => {
    if (!newWaypoint.name || !newWaypoint.lat || !newWaypoint.lng) {
      toast({ title: 'Erreur', description: 'Remplissez tous les champs', status: 'error' });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      waypoints: [...prev.waypoints, {
        ...newWaypoint,
        lat: parseFloat(newWaypoint.lat),
        lng: parseFloat(newWaypoint.lng),
        stopTime: parseInt(newWaypoint.stopTime || 0),
        order: prev.waypoints.length
      }]
    }));
    
    setNewWaypoint({ name: '', lat: '', lng: '', stopTime: 0 });
  };

  const handleRemoveWaypoint = (index) => {
    setFormData(prev => ({
      ...prev,
      waypoints: prev.waypoints.filter((_, i) => i !== index)
    }));
  };

  const handleCreateRoute = async () => {
    if (!formData.name || formData.waypoints.length < 2) {
      toast({ title: 'Erreur', description: 'Nom + 2+ waypoints requis', status: 'error' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Erreur création');
      
      toast({ title: 'Succès', description: 'Itinéraire créé!', status: 'success' });
      setFormData({ name: '', description: '', waypoints: [], difficulty: 'NORMAL', season: 'SUMMER', maxLength: null, maxHeight: null, maxWeight: null });
      setTab('routes');
      fetchRoutes();
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, status: 'error' });
    }
  };

  const handleDeleteRoute = async (routeId) => {
    if (!window.confirm('Confirmer suppression?')) return;
    
    trawait apiClient.delete(`/routes/${routeId}`routes/${routeId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur');
      toast({ title: 'Supprimée', status: 'success' });
      fetchRoutes();
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, status: 'error' });
    }
  };

  const getStats = (route) => {
    const distance = route.totalDistance || 0;
    const time = route.estimatedTime || 0;
    const hours = Math.floor(time / 60);
    const mins = time % 60;
    return { distance, time: `${hours}h${mins}m` };
  };

  return (
    <>
      <Button onClick={onOpen} leftIcon={<FiMapPin />} colorScheme="purple" size="md" w="100%">
        🗺️ RétroGPS - Traçage d'itinéraires
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="5xl">
        <ModalOverlay />
        <ModalContent maxH="90vh" display="flex" flexDirection="column">
          <ModalHeader>
            <HStack spacing={3}>
              <Icon as={FiMapPin} color="purple.500" boxSize={6} />
              <Box>
                <Heading size="lg">RétroGPS - Gestion des itinéraires</Heading>
                <Text fontSize="sm" color="gray.500">Créez et tracez les tournées</Text>
              </Box>
            </HStack>
          </ModalHeader>

          <ModalCloseButton />

          <ModalBody overflow="auto" flex={1} pb={4}>
            <VStack spacing={6} align="stretch">
              {/* Onglets */}
              <HStack spacing={0} borderBottom="2px solid" borderColor="gray.200">
                <Button
                  variant={tab === 'routes' ? 'solid' : 'ghost'}
                  colorScheme={tab === 'routes' ? 'purple' : 'gray'}
                  onClick={() => setTab('routes')}
                  leftIcon={<FiMapPin />}
                >
                  Itinéraires ({routes.length})
                </Button>
                <Button
                  variant={tab === 'create' ? 'solid' : 'ghost'}
                  colorScheme={tab === 'create' ? 'green' : 'gray'}
                  onClick={() => setTab('create')}
                  leftIcon={<FiPlus />}
                >
                  Créer
                </Button>
              </HStack>

              {/* Liste routes */}
              {tab === 'routes' && (
                <VStack spacing={4} align="stretch">
                  {loading ? (
                    <Center p={8}><Spinner /></Center>
                  ) : routes.length === 0 ? (
                    <Center p={8} bg="gray.50" borderRadius="md">
                      <Text color="gray.500">Aucun itinéraire créé</Text>
                    </Center>
                  ) : (
                    <Table size="sm">
                      <Thead>
                        <Tr bg="gray.100">
                          <Th>Nom</Th>
                          <Th>Distance</Th>
                          <Th>Temps</Th>
                          <Th>Points</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {routes.map(route => {
                          const stats = getStats(route);
                          return (
                            <Tr key={route.id} _hover={{ bg: 'gray.50' }}>
                              <Td fontWeight="bold">{route.name}</Td>
                              <Td>{stats.distance} km</Td>
                              <Td>{stats.time}</Td>
                              <Td textAlign="center">{route.waypoints?.length || 0}</Td>
                              <Td>
                                <HStack spacing={1}>
                                  <Tooltip label="Détails">
                                    <IconButton
                                      icon={<FiActivity />}
                                      size="sm"
                                      colorScheme="blue"
                                      variant="ghost"
                                      onClick={() => setSelectedRoute(route)}
                                    />
                                  </Tooltip>
                                  <Tooltip label="Supprimer">
                                    <IconButton
                                      icon={<FiTrash2 />}
                                      size="sm"
                                      colorScheme="red"
                                      variant="ghost"
                                      onClick={() => handleDeleteRoute(route.id)}
                                    />
                                  </Tooltip>
                                </HStack>
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  )}
                </VStack>
              )}

              {/* Création */}
              {tab === 'create' && (
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>Nom de l'itinéraire</FormLabel>
                    <Input
                      placeholder="ex: Tournée Essonne Sud"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Textarea
                      placeholder="Détails du parcours..."
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </FormControl>

                  {/* Restrictions */}
                  <SimpleGrid columns={3} gap={3}>
                    <FormControl>
                      <FormLabel fontSize="sm">Longueur max (m)</FormLabel>
                      <NumberInput value={formData.maxLength || ''} onChange={v => setFormData(prev => ({ ...prev, maxLength: v ? parseFloat(v) : null }))}>
                        <NumberInputField placeholder="12.5" />
                      </NumberInput>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Hauteur max (m)</FormLabel>
                      <NumberInput value={formData.maxHeight || ''} onChange={v => setFormData(prev => ({ ...prev, maxHeight: v ? parseFloat(v) : null }))}>
                        <NumberInputField placeholder="3.8" />
                      </NumberInput>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Poids max (t)</FormLabel>
                      <NumberInput value={formData.maxWeight || ''} onChange={v => setFormData(prev => ({ ...prev, maxWeight: v ? parseFloat(v) : null }))}>
                        <NumberInputField placeholder="13" />
                      </NumberInput>
                    </FormControl>
                  </SimpleGrid>

                  <Divider />

                  {/* Waypoints */}
                  <Heading size="sm">📍 Points de passage</Heading>
                  
                  <HStack spacing={2} align="flex-end">
                    <FormControl>
                      <FormLabel fontSize="sm">Nom</FormLabel>
                      <Input placeholder="ex: Départ" value={newWaypoint.name} onChange={e => setNewWaypoint(p => ({ ...p, name: e.target.value }))} size="sm" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Lat</FormLabel>
                      <Input placeholder="48.8566" value={newWaypoint.lat} onChange={e => setNewWaypoint(p => ({ ...p, lat: e.target.value }))} size="sm" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Lng</FormLabel>
                      <Input placeholder="2.3522" value={newWaypoint.lng} onChange={e => setNewWaypoint(p => ({ ...p, lng: e.target.value }))} size="sm" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Arrêt (min)</FormLabel>
                      <NumberInput value={newWaypoint.stopTime} onChange={v => setNewWaypoint(p => ({ ...p, stopTime: v }))} size="sm">
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>
                    <Button onClick={handleAddWaypoint} colorScheme="green" size="sm" leftIcon={<FiPlus />}>Ajouter</Button>
                  </HStack>

                  {/* Liste waypoints */}
                  {formData.waypoints.length > 0 && (
                    <Box p={3} bg="gray.50" borderRadius="md" maxH="200px" overflow="auto">
                      <Text fontWeight="bold" mb={2}>Waypoints ({formData.waypoints.length}):</Text>
                      {formData.waypoints.map((wp, i) => (
                        <HStack key={i} p={2} bg="white" borderRadius="md" mb={1} justify="space-between">
                          <Text fontSize="sm">{i+1}. <strong>{wp.name}</strong> - {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)} (+{wp.stopTime}min)</Text>
                          <Button size="xs" colorScheme="red" variant="ghost" onClick={() => handleRemoveWaypoint(i)}>✕</Button>
                        </HStack>
                      ))}
                    </Box>
                  )}

                  <Button colorScheme="purple" size="lg" w="100%" onClick={handleCreateRoute} isDisabled={!formData.name || formData.waypoints.length < 2}>
                    ✅ Créer l'itinéraire
                  </Button>
                </VStack>
              )}

              {/* Détails avec carte */}
              {selectedRoute && (
                <VStack spacing={4} align="stretch">
                  <Box p={4} bg="blue.50" borderRadius="lg" borderLeft="4px solid" borderColor="blue.500">
                    <HStack justify="space-between" mb={3}>
                      <Heading size="md">{selectedRoute.name}</Heading>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedRoute(null)}>✕</Button>
                    </HStack>
                    <VStack align="start" spacing={2} fontSize="sm">
                      <Text><strong>Description:</strong> {selectedRoute.description || 'N/A'}</Text>
                      <Text><strong>Points:</strong> {selectedRoute.waypoints?.length || 0}</Text>
                      <Text><strong>Distance:</strong> {getStats(selectedRoute).distance} km</Text>
                      <Text><strong>Temps:</strong> {getStats(selectedRoute).time}</Text>
                      {selectedRoute.maxLength && <Badge>L max: {selectedRoute.maxLength}m</Badge>}
                      {selectedRoute.maxHeight && <Badge>H max: {selectedRoute.maxHeight}m</Badge>}
                      {selectedRoute.maxWeight && <Badge>P max: {selectedRoute.maxWeight}t</Badge>}
                    </VStack>
                  </Box>

                  {/* Carte interactive */}
                  <Box>
                    <HStack spacing={2} mb={3}>
                      <Icon as={FiMap} color="purple.500" />
                      <Heading size="sm">Visualisation de l'itinéraire</Heading>
                    </HStack>
                    <RouteMap route={selectedRoute} />
                  </Box>

                  <Button colorScheme="gray" size="sm" w="100%" onClick={() => setSelectedRoute(null)}>Fermer la vue détails</Button>
                </VStack>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="gray" variant="outline" onClick={onClose}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
