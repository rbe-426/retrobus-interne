import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box, Heading, Text, SimpleGrid, Stat, StatLabel, StatNumber, Card, CardBody,
  Tabs, TabList, TabPanels, Tab, TabPanel, useToast, Spinner, HStack, VStack,
  Badge, Tag, TagLabel, TagLeftIcon, Button, Divider, Table, Thead, Tbody, Tr, Th, Td,
  Icon, Alert, AlertIcon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Slider, SliderTrack, SliderFilledTrack, SliderThumb, FormLabel,
  AlertTitle, AlertDescription, CloseButton, Input
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { FiClock, FiAlertTriangle, FiTool, FiFileText, FiInfo, FiEdit, FiSliders, FiRefreshCw, FiPlus, FiTruck, FiArchive, FiArrowRight, FiSearch } from "react-icons/fi";
import WorkspaceLayout from "../components/Layout/WorkspaceLayout";
import { apiClient } from "../api/config";
import { vehicleAdminAPI } from "../api/vehicleAdmin";
import { cachedAPICall, batchAPICall, debounce } from "../lib/performanceUtils";
import CaracteristiquesEditor from '../components/vehicle/CaracteristiquesEditor.jsx';
import VehicleAdminStatus from '../components/vehicle/AdminStatus.jsx';
import { useNavigate } from "react-router-dom";
import { TriangleErrorIcon } from '../components/icons';

function EtatBadge({ etat }) {
  const colorMap = {
    disponible: "green",
    en_panne: "red",
    maintenance: "orange",
    Service: "green",
    Préservé: "blue",
    "A VENIR": "gray",
    Restauration: "orange",
  };
  return <Badge colorScheme={colorMap[etat] || "purple"}>{etat || "—"}</Badge>;
}

// Animation clignotante pour l'icône uniquement (Trilogy)
const blinkIconAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
`;

// Composant d'alerte critique Trilogy avec icône clignotante
function CriticalAlert({ vehicle, issues, onDismiss, colorScheme = "red" }) {
  if (!vehicle || !issues || issues.length === 0) return null;

  const iconColor = colorScheme === "red" ? "red.500" : "orange.500";
  const bgColor = colorScheme === "red" ? "red.50" : "orange.50";
  const borderColor = colorScheme === "red" ? "red.300" : "orange.300";

  return (
    <Alert
      variant="left-accent"
      borderRadius="md"
      mb={2}
      bg={bgColor}
      borderColor={borderColor}
      borderWidth="1px"
      position="relative"
    >
      {/* Icône triangulaire rouge remplie clignotante (Trilogy) */}
      <TriangleErrorIcon
        boxSize={6} 
        color={iconColor}
        sx={{ animation: `${blinkIconAnimation} 2s ease-in-out infinite` }}
        mr={3}
        flexShrink={0}
      />
      
      <Box flex="1">
        <AlertTitle fontSize="md" fontWeight="bold">
          {vehicle}
        </AlertTitle>
        <AlertDescription fontSize="sm" mt={1}>
          <VStack align="start" spacing={0.5}>
            {issues.map((issue, idx) => (
              <Text key={idx} fontSize="sm">• {issue}</Text>
            ))}
          </VStack>
        </AlertDescription>
      </Box>
      
      {onDismiss && (
        <CloseButton
          position="absolute"
          right={2}
          top={2}
          size="sm"
          onClick={onDismiss}
        />
      )}
    </Alert>
  );
}

// Component: MaintenanceTab - Complete maintenance tracking interface
function MaintenanceTab({ vehicles, apiClient }) {
  const toast = useToast();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Modal for new maintenance
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    type: 'other',
    description: '',
    cost: '',
    mileage: '',
    performedBy: '',
    location: '',
    status: 'completed',
    notes: ''
  });
  
  // Modal for service schedule
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    serviceType: 'oil_change',
    description: '',
    frequency: 'yearly',
    priority: 'medium',
    notes: ''
  });

  const loadMaintenanceData = async (parc) => {
    try {
      setLoading(true);
      const [maintenanceData, scheduleData, summaryData] = await Promise.all([
        apiClient.get(`/vehicles/${encodeURIComponent(parc)}/maintenance`).catch(() => []),
        apiClient.get(`/vehicles/${encodeURIComponent(parc)}/service-schedule`).catch(() => []),
        apiClient.get(`/vehicles/${encodeURIComponent(parc)}/maintenance-summary`).catch(() => null)
      ]);

      setMaintenance(Array.isArray(maintenanceData) ? maintenanceData : []);
      setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
      setSummary(summaryData);
    } catch (e) {
      console.error('Error loading maintenance data:', e);
      // Ne pas afficher de toast d'erreur si les endpoints n'existent pas encore
      setMaintenance([]);
      setSchedule([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (v) => {
    const parc = v.parc || v.id || v.slug;
    setSelectedVehicle(parc);
    loadMaintenanceData(parc);
  };

  const handleAddMaintenance = async () => {
    if (!selectedVehicle || !maintenanceForm.type || !maintenanceForm.description) {
      toast({ status: 'warning', title: 'Formulaire incomplet' });
      return;
    }

    try {
      const response = await apiClient.post(
        `/vehicles/${encodeURIComponent(selectedVehicle)}/maintenance`,
        maintenanceForm
      );
      setMaintenance([response, ...maintenance]);
      setMaintenanceForm({ type: 'other', description: '', cost: '', mileage: '', performedBy: '', location: '', status: 'completed', notes: '' });
      setShowAddMaintenance(false);
      toast({ status: 'success', title: 'Entretien ajouté' });
      await loadMaintenanceData(selectedVehicle);
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: e.message });
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedVehicle || !scheduleForm.serviceType) {
      toast({ status: 'warning', title: 'Formulaire incomplet' });
      return;
    }

    try {
      const response = await apiClient.post(
        `/vehicles/${encodeURIComponent(selectedVehicle)}/service-schedule`,
        scheduleForm
      );
      setSchedule([response, ...schedule]);
      setScheduleForm({ serviceType: 'oil_change', description: '', frequency: 'yearly', priority: 'medium', notes: '' });
      setShowAddSchedule(false);
      toast({ status: 'success', title: 'Tâche programmée' });
      await loadMaintenanceData(selectedVehicle);
    } catch (e) {
      toast({ status: 'error', title: 'Erreur', description: e.message });
    }
  };

  const maintenanceTypes = {
    oil_change: { label: 'Vidange', color: 'blue' },
    tire_change: { label: 'Changement pneus', color: 'purple' },
    brake_service: { label: 'Service freins', color: 'red' },
    inspection: { label: 'Inspection', color: 'green' },
    repair: { label: 'Réparation', color: 'orange' },
    washing: { label: 'Lavage', color: 'cyan' },
    other: { label: 'Autre', color: 'gray' }
  };

  const statusColors = {
    completed: 'green',
    in_progress: 'yellow',
    pending: 'orange',
    cancelled: 'gray'
  };

  if (!selectedVehicle) {
    return (
      <VStack align="start" spacing={4} py={2}>
        <Alert status="info">
          <AlertIcon />
          <VStack align="start">
            <Text fontWeight="600">Sélectionnez un véhicule</Text>
            <Text fontSize="sm">Choisissez un véhicule ci-dessous pour voir son historique d'entretien et son planning.</Text>
          </VStack>
        </Alert>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={3} w="full">
          {vehicles && vehicles.map(v => {
            const parc = v.parc || v.id || v.slug;
            return (
              <Card key={parc} variant="outline" cursor="pointer" _hover={{ shadow: 'md' }} onClick={() => handleVehicleSelect(v)}>
                <CardBody>
                  <Heading size="sm">{parc}</Heading>
                  <Text fontSize="sm" color="gray.600">{v.marque} {v.modele}</Text>
                  <Button mt={2} size="sm" colorScheme="blue" w="full">Consulter</Button>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      </VStack>
    );
  }

  return (
    <VStack align="start" spacing={4} w="full">
      {/* Header */}
      <HStack justify="space-between" w="full">
        <HStack>
          <FiTool />
          <Heading size="sm">Entretien - {selectedVehicle}</Heading>
        </HStack>
        <Button size="sm" variant="outline" onClick={() => setSelectedVehicle(null)}>
          ← Retour
        </Button>
      </HStack>

      {loading ? (
        <HStack spacing={3}>
          <Spinner size="sm" />
          <Text>Chargement...</Text>
        </HStack>
      ) : (
        <>
          {/* Summary Stats */}
          {summary && (
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} w="full">
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel fontSize="xs">Coût total</StatLabel>
                    <StatNumber fontSize="lg">{summary.totalCost.toFixed(2)}€</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel fontSize="xs">Entretiens</StatLabel>
                    <StatNumber fontSize="lg">{summary.maintenanceCount}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel fontSize="xs">Tâches en retard</StatLabel>
                    <StatNumber fontSize="lg" color="red.500">{summary.overdueTasks}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel fontSize="xs">En attente</StatLabel>
                    <StatNumber fontSize="lg" color="orange.500">{summary.pendingTasks}</StatNumber>
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>
          )}

          {/* Tabs within vehicle */}
          <Tabs w="full" colorScheme="blue">
            <TabList>
              <Tab>Historique ({maintenance.length})</Tab>
              <Tab>Planning ({schedule.length})</Tab>
            </TabList>

            <TabPanels>
              {/* Maintenance History */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Heading size="sm">Historique d'entretien</Heading>
                    <Button size="sm" colorScheme="green" onClick={() => setShowAddMaintenance(true)}>
                      + Ajouter
                    </Button>
                  </HStack>

                  {maintenance.length === 0 ? (
                    <Alert status="info">
                      <AlertIcon />
                      Aucun entretien enregistré
                    </Alert>
                  ) : (
                    <VStack align="stretch" spacing={2} maxH="500px" overflowY="auto">
                      {maintenance.map(m => (
                        <Card key={m.id} variant="outline" size="sm">
                          <CardBody py={2}>
                            <HStack justify="space-between" mb={1}>
                              <HStack spacing={2}>
                                <Badge colorScheme={maintenanceTypes[m.type]?.color || 'gray'}>
                                  {maintenanceTypes[m.type]?.label || m.type}
                                </Badge>
                                <Text fontSize="sm" fontWeight="600">
                                  {new Date(m.date).toLocaleDateString('fr-FR')}
                                </Text>
                              </HStack>
                              <Badge colorScheme={statusColors[m.status] || 'gray'}>
                                {m.status}
                              </Badge>
                            </HStack>
                            <Text fontSize="sm" color="gray.700">{m.description}</Text>
                            <HStack spacing={4} mt={2} fontSize="xs" color="gray.600">
                              {m.cost > 0 && <Text>💰 {m.cost.toFixed(2)}€</Text>}
                              {m.mileage && <Text>🚗 {m.mileage} km</Text>}
                              {m.performedBy && <Text>👤 {m.performedBy}</Text>}
                              {m.nextDueDate && <Text>📅 Prochainement: {new Date(m.nextDueDate).toLocaleDateString('fr-FR')}</Text>}
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  )}
                </VStack>

                {/* Add Maintenance Modal */}
                <Modal isOpen={showAddMaintenance} onClose={() => setShowAddMaintenance(false)}>
                  <ModalOverlay />
                  <ModalContent>
                    <ModalHeader>Ajouter un entretien</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                      <VStack spacing={3}>
                        <Box w="full">
                          <FormLabel>Type</FormLabel>
                          <select
                            value={maintenanceForm.type}
                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          >
                            {Object.entries(maintenanceTypes).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </Box>
                        <Box w="full">
                          <FormLabel>Description *</FormLabel>
                          <textarea
                            value={maintenanceForm.description}
                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                            placeholder="Détails de l'intervention..."
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }}
                          />
                        </Box>
                        <Box w="full">
                          <FormLabel>Coût (€)</FormLabel>
                          <input
                            type="number"
                            value={maintenanceForm.cost}
                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          />
                        </Box>
                        <Box w="full">
                          <FormLabel>Kilométrage</FormLabel>
                          <input
                            type="number"
                            value={maintenanceForm.mileage}
                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, mileage: e.target.value })}
                            placeholder="12345"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          />
                        </Box>
                        <Box w="full">
                          <FormLabel>Effectué par</FormLabel>
                          <input
                            type="text"
                            value={maintenanceForm.performedBy}
                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performedBy: e.target.value })}
                            placeholder="Nom du mécanicien/atelier"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          />
                        </Box>
                        <Box w="full">
                          <FormLabel>Lieu</FormLabel>
                          <input
                            type="text"
                            value={maintenanceForm.location}
                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, location: e.target.value })}
                            placeholder="Garage, atelier..."
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          />
                        </Box>
                        <Box w="full">
                          <FormLabel>Statut</FormLabel>
                          <select
                            value={maintenanceForm.status}
                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          >
                            <option value="completed">Complété</option>
                            <option value="in_progress">En cours</option>
                            <option value="pending">En attente</option>
                            <option value="cancelled">Annulé</option>
                          </select>
                        </Box>
                      </VStack>
                    </ModalBody>
                    <ModalFooter>
                      <Button mr={3} onClick={() => setShowAddMaintenance(false)} variant="ghost">Annuler</Button>
                      <Button colorScheme="green" onClick={handleAddMaintenance}>Ajouter</Button>
                    </ModalFooter>
                  </ModalContent>
                </Modal>
              </TabPanel>

              {/* Service Schedule */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Heading size="sm">Planning de maintenance</Heading>
                    <Button size="sm" colorScheme="blue" onClick={() => setShowAddSchedule(true)}>
                      + Programmer
                    </Button>
                  </HStack>

                  {schedule.length === 0 ? (
                    <Alert status="info">
                      <AlertIcon />
                      Aucune tâche programmée
                    </Alert>
                  ) : (
                    <VStack align="stretch" spacing={2} maxH="500px" overflowY="auto">
                      {schedule.map(s => (
                        <Card key={s.id} variant="outline" size="sm" borderLeftWidth="4px" borderLeftColor={s.status === 'overdue' ? 'red.500' : s.status === 'pending' ? 'orange.500' : 'green.500'}>
                          <CardBody py={2}>
                            <HStack justify="space-between" mb={1}>
                              <HStack spacing={2}>
                                <Badge colorScheme={s.priority === 'critical' ? 'red' : s.priority === 'high' ? 'orange' : 'blue'}>
                                  {s.priority}
                                </Badge>
                                <Text fontSize="sm" fontWeight="600">{s.serviceType}</Text>
                              </HStack>
                              <Badge colorScheme={s.status === 'completed' ? 'green' : s.status === 'overdue' ? 'red' : s.status === 'pending' ? 'yellow' : 'gray'}>
                                {s.status}
                              </Badge>
                            </HStack>
                            {s.description && <Text fontSize="sm" color="gray.700">{s.description}</Text>}
                            <HStack spacing={4} mt={2} fontSize="xs" color="gray.600">
                              {s.plannedDate && <Text>📅 {new Date(s.plannedDate).toLocaleDateString('fr-FR')}</Text>}
                              <Text>🔄 {s.frequency}</Text>
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  )}
                </VStack>

                {/* Add Schedule Modal */}
                <Modal isOpen={showAddSchedule} onClose={() => setShowAddSchedule(false)}>
                  <ModalOverlay />
                  <ModalContent>
                    <ModalHeader>Programmer une maintenance</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                      <VStack spacing={3}>
                        <Box w="full">
                          <FormLabel>Type de service *</FormLabel>
                          <select
                            value={scheduleForm.serviceType}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, serviceType: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          >
                            <option value="oil_change">Vidange</option>
                            <option value="tire_inspection">Inspection pneus</option>
                            <option value="brake_check">Vérification freins</option>
                            <option value="full_inspection">Inspection complète</option>
                            <option value="other">Autre</option>
                          </select>
                        </Box>
                        <Box w="full">
                          <FormLabel>Description</FormLabel>
                          <input
                            type="text"
                            value={scheduleForm.description}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                            placeholder="Détails..."
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          />
                        </Box>
                        <Box w="full">
                          <FormLabel>Fréquence</FormLabel>
                          <select
                            value={scheduleForm.frequency}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          >
                            <option value="weekly">Hebdomadaire</option>
                            <option value="monthly">Mensuelle</option>
                            <option value="quarterly">Trimestrielle</option>
                            <option value="yearly">Annuelle</option>
                            <option value="as_needed">À la demande</option>
                          </select>
                        </Box>
                        <Box w="full">
                          <FormLabel>Priorité</FormLabel>
                          <select
                            value={scheduleForm.priority}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, priority: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          >
                            <option value="low">Basse</option>
                            <option value="medium">Moyenne</option>
                            <option value="high">Haute</option>
                            <option value="critical">Critique</option>
                          </select>
                        </Box>
                      </VStack>
                    </ModalBody>
                    <ModalFooter>
                      <Button mr={3} onClick={() => setShowAddSchedule(false)} variant="ghost">Annuler</Button>
                      <Button colorScheme="blue" onClick={handleAddSchedule}>Programmer</Button>
                    </ModalFooter>
                  </ModalContent>
                </Modal>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </>
      )}
    </VStack>
  );
}

export default function RetroBus() {
  const toast = useToast();
  const navigate = useNavigate();
  const [isLaunchingLumistudio, setIsLaunchingLumistudio] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusByParc, setStatusByParc] = useState({});
  const [usagesData, setUsagesData] = useState({});
  const [loadingUsages, setLoadingUsages] = useState(false);
  const [processParcOpen, setProcessParcOpen] = useState(false);
  const [processParcStep, setProcessParcStep] = useState('choice');
  const [processParcTcInfosUrl, setProcessParcTcInfosUrl] = useState('');
  const [processParcTcInfosLoading, setProcessParcTcInfosLoading] = useState(false);
  const [processParcTcInfosResult, setProcessParcTcInfosResult] = useState(null);
  const [processParcProjectSource, setProcessParcProjectSource] = useState('');
  const [processParcInternalProjectName, setProcessParcInternalProjectName] = useState('');
  const [processParcInternalFleetNumber, setProcessParcInternalFleetNumber] = useState('');
  const [processParcProjects, setProcessParcProjects] = useState([]);
  const [processParcCreatedProject, setProcessParcCreatedProject] = useState(null);
  const [processParcOpenedProject, setProcessParcOpenedProject] = useState(null);
  const [processParcProjectDetailStep, setProcessParcProjectDetailStep] = useState('recap');
  const [processParcReminderOpen, setProcessParcReminderOpen] = useState(false);
  const [processParcReminderForm, setProcessParcReminderForm] = useState({
    rank: '',
    date: '',
    contact: '',
    identity: '',
    documents: [],
    mailCaptures: []
  });
  
  // Modal édition technique
  const [editTechOpen, setEditTechOpen] = useState(false);
  const [editTechVehicle, setEditTechVehicle] = useState(null);
  const [editTechCaracs, setEditTechCaracs] = useState([]);
  const [editTechGasoil, setEditTechGasoil] = useState(0);
  const [editTechSaving, setEditTechSaving] = useState(false);

  // Alertes critiques - Une alerte par véhicule avec tous ses problèmes
  const [criticalAlerts, setCriticalAlerts] = useState({
    vehicleAlerts: [], // [{parc, ctIssues: [], docIssues: []}]
    dismissed: []
  });

  const reloadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      
      // Utiliser le cache pour éviter les requêtes répétées
      const cacheKey = 'vehicles-list';
      const list = await cachedAPICall(
        cacheKey, 
        () => apiClient.get('/vehicles'),
        2 * 60 * 1000 // Cache 2 minutes
      );
      
      const vehicles = Array.isArray(list) ? list : (list?.vehicles || []);
      const validVehicles = vehicles.filter(v => v.parc || v.id || v.slug);
      console.log(`✅ Loaded ${validVehicles.length} valid vehicles`);
      setVehicles(validVehicles);
    } catch (e) {
      console.error('❌ Error loading vehicles:', e);
      toast({
        status: 'error',
        title: "Chargement des véhicules",
        description: e.message || 'Impossible de charger la liste'
      });
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const identifyTcInfosVehicle = useCallback(async () => {
    try {
      setProcessParcTcInfosLoading(true);
      setProcessParcTcInfosResult(null);
      const result = await apiClient.post('/api/process-parc/tc-infos/identify', { url: processParcTcInfosUrl.trim() });
      setProcessParcTcInfosResult(result);
      setProcessParcProjectSource('tc-infos');
      const vehicle = result?.vehicle || {};
      setProcessParcInternalProjectName([vehicle.manufacturer, vehicle.model, vehicle.fleetNumber ? `n°${vehicle.fleetNumber}` : ''].filter(Boolean).join(' '));
      setProcessParcInternalFleetNumber(vehicle.fleetNumber || '');
      toast({ status: 'success', title: 'Véhicule identifié', description: `${result.detectedFields || 0} champs récupérés.` });
    } catch (error) {
      toast({ status: 'error', title: 'Lecture TC Infos impossible', description: error.message });
    } finally {
      setProcessParcTcInfosLoading(false);
    }
  }, [processParcTcInfosUrl, toast]);

  const processParcCanGoNext = processParcStep === 'project-start' && (
    processParcProjectSource === 'manual' || Boolean(processParcTcInfosResult?.vehicle)
  );

  const processParcCanCreateProject = processParcStep === 'project-review'
    && processParcInternalProjectName.trim()
    && processParcInternalFleetNumber.trim()
    && !processParcCreatedProject;

  const loadProcessParcProjects = useCallback(async () => {
    try {
      const projects = await apiClient.get('/api/process-parc/projects');
      setProcessParcProjects(Array.isArray(projects) ? projects : []);
    } catch (error) {
      console.error('Erreur chargement Process PARC:', error);
      toast({ status: 'error', title: 'Process PARC', description: 'Impossible de charger les projets serveur.' });
    }
  }, [toast]);

  useEffect(() => {
    loadProcessParcProjects();
  }, [loadProcessParcProjects]);

  const createProcessParcProject = async () => {
    const draftProject = {
      id: `parc-${Date.now()}`,
      name: processParcInternalProjectName.trim(),
      internalFleetNumber: processParcInternalFleetNumber.trim(),
      source: processParcProjectSource || 'manual',
      tcInfos: processParcTcInfosResult,
      documents: [],
      mailCaptures: [],
      reminders: [],
      repatriementReports: [],
      createdAt: new Date().toISOString(),
      status: 'pre_project'
    };

    try {
      const project = await apiClient.post('/api/process-parc/projects', draftProject);
      setProcessParcProjects((prev) => [project, ...prev.filter((item) => item.id !== project.id)]);
      setProcessParcCreatedProject(project);
      toast({ status: 'success', title: 'Projet de préservation créé', description: project.name });
    } catch (error) {
      toast({ status: 'error', title: 'Création Process PARC impossible', description: error.message });
    }
  };

  const openProcessParcProject = (project) => {
    setProcessParcOpenedProject(project);
    setProcessParcOpen(true);
    setProcessParcStep('project-detail');
    setProcessParcProjectDetailStep('recap');
  };

  const openProcessParcConsultation = (project) => {
    setProcessParcCreatedProject(project);
    setProcessParcInternalProjectName(project.name);
    setProcessParcInternalFleetNumber(project.internalFleetNumber);
    setProcessParcProjectSource(project.source);
    setProcessParcTcInfosResult(project.tcInfos || null);
    openProcessParcProject(project);
  };

  const updateProcessParcProject = (updatedProject) => {
    setProcessParcOpenedProject(updatedProject);
    setProcessParcCreatedProject((prev) => prev?.id === updatedProject.id ? updatedProject : prev);
    setProcessParcProjects((prev) => prev.map((project) => project.id === updatedProject.id ? updatedProject : project));
    apiClient.put(`/api/process-parc/projects/${encodeURIComponent(updatedProject.id)}`, updatedProject).catch((error) => {
      toast({ status: 'error', title: 'Sauvegarde Process PARC impossible', description: error.message });
    });
  };

  useEffect(() => {
    const handleRapatriementStorage = (event) => {
      if (!event.key || !event.newValue) return;

      try {
        if (event.key.startsWith('process-parc-project:')) {
          const project = JSON.parse(event.newValue);
          if (!project?.id) return;
          setProcessParcProjects((prev) => [project, ...prev.filter((item) => item.id !== project.id)]);
          setProcessParcOpenedProject((prev) => prev?.id === project.id ? project : prev);
          setProcessParcCreatedProject((prev) => prev?.id === project.id ? project : prev);
          toast({ status: 'success', title: 'Process PARC sauvegardé', description: project.name });
          return;
        }

        if (!event.key.startsWith('process-parc-rapatriement:')) return;
        const report = JSON.parse(event.newValue);
        if (!report?.projectId) return;

        setProcessParcProjects((prev) => prev.map((project) => {
          if (project.id !== report.projectId) return project;
          const reports = project.repatriementReports || [];
          const nextReports = reports.some((item) => item.id === report.id) ? reports : [report, ...reports];
          return {
            ...project,
            repatriementReports: nextReports,
            status: report.moveToOverview ? 'overview' : project.status,
            movedToOverviewAt: report.moveToOverview ? (report.closedAt || report.submittedAt) : project.movedToOverviewAt
          };
        }));

        setProcessParcOpenedProject((prev) => {
          if (!prev || prev.id !== report.projectId) return prev;
          const reports = prev.repatriementReports || [];
          const nextReports = reports.some((item) => item.id === report.id) ? reports : [report, ...reports];
          return {
            ...prev,
            repatriementReports: nextReports,
            status: report.moveToOverview ? 'overview' : prev.status,
            movedToOverviewAt: report.moveToOverview ? (report.closedAt || report.submittedAt) : prev.movedToOverviewAt
          };
        });

        setProcessParcCreatedProject((prev) => {
          if (!prev || prev.id !== report.projectId) return prev;
          const reports = prev.repatriementReports || [];
          const nextReports = reports.some((item) => item.id === report.id) ? reports : [report, ...reports];
          return {
            ...prev,
            repatriementReports: nextReports,
            status: report.moveToOverview ? 'overview' : prev.status,
            movedToOverviewAt: report.moveToOverview ? (report.closedAt || report.submittedAt) : prev.movedToOverviewAt
          };
        });

        toast({ status: 'success', title: 'Relevé de rapatriement reçu', description: report.projectName });
      } catch (error) {
        console.error('Erreur lecture relevé rapatriement:', error);
      }
    };

    window.addEventListener('storage', handleRapatriementStorage);
    return () => window.removeEventListener('storage', handleRapatriementStorage);
  }, [toast]);

  const addProcessParcFiles = (type, files) => {
    if (!processParcOpenedProject || !files?.length) return;

    const field = type === 'mail' ? 'mailCaptures' : 'documents';
    const additions = Array.from(files).map((file) => ({
      id: `${field}-${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      addedAt: new Date().toISOString()
    }));

    const updatedProject = {
      ...processParcOpenedProject,
      [field]: [...(processParcOpenedProject[field] || []), ...additions]
    };

    updateProcessParcProject(updatedProject);
    toast({
      status: 'success',
      title: type === 'mail' ? 'Capture(s) de mail ajoutée(s)' : 'Document(s) ajouté(s)',
      description: `${additions.length} fichier(s)`
    });
  };

  const openProcessParcRepatriementTab = () => {
    if (!processParcOpenedProject) return;

    const escapeHtml = (value = '') => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const projectName = escapeHtml(processParcOpenedProject.name);
    const parc = escapeHtml(processParcOpenedProject.internalFleetNumber);
    const projectIdPayload = JSON.stringify(processParcOpenedProject.id);
    const projectNamePayload = JSON.stringify(processParcOpenedProject.name);
    const parcPayload = JSON.stringify(processParcOpenedProject.internalFleetNumber);
    const child = window.open('', '_blank');
    if (!child) {
      toast({ status: 'warning', title: 'Nouvel onglet bloqué', description: 'Autorisez les popups pour ouvrir le process mobile.' });
      return;
    }
    child.opener = null;

    child.document.write(`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Rapatriement - ${projectName}</title>
          <style>
            :root { color-scheme: light; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; --rbe:#d30c4c; --rbe-dark:#9f0938; --ink:#111827; --muted:#667085; --line:#e4e7ec; --soft:#fff5f7; }
            body { margin: 0; background: linear-gradient(180deg, #fff 0%, #f7f8fb 38%, #f2f4f7 100%); color: var(--ink); }
            header { background: linear-gradient(135deg, var(--rbe) 0%, var(--rbe-dark) 100%); color: white; padding: 24px 18px; border-bottom: 4px solid #111827; }
            main { max-width: 760px; margin: 0 auto; padding: 16px; }
            h1 { margin: 0; font-size: 24px; line-height: 1.2; letter-spacing: 0; }
            h2 { margin: 0 0 12px; font-size: 18px; letter-spacing: 0; }
            p { margin: 6px 0 0; color: rgba(255,255,255,.9); }
            section { background: white; border: 1px solid var(--line); border-left: 4px solid var(--rbe); border-radius: 8px; padding: 16px; margin-bottom: 14px; box-shadow: 0 8px 22px rgba(17, 24, 39, .06); }
            label { display: block; font-weight: 700; margin-bottom: 8px; color: #1f2937; }
            input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #cfd4dc; border-radius: 8px; padding: 12px; font: inherit; background: white; min-height: 44px; }
            input:focus, textarea:focus { outline: 3px solid rgba(211, 12, 76, .18); border-color: var(--rbe); }
            input[type="file"] { background: #fafafa; border-style: dashed; }
            input[type="checkbox"] { width: auto; min-height: auto; transform: scale(1.25); margin-right: 8px; accent-color: var(--rbe); }
            .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
            .check { display: flex; align-items: center; min-height: 44px; font-weight: 700; }
            .hint { color: var(--muted); font-size: 13px; margin-top: 6px; }
            .error { color: #b42318; font-weight: 700; }
            .badge { display: inline-block; background: var(--soft); color: var(--rbe-dark); border: 1px solid rgba(211, 12, 76, .22); border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 800; margin: 0 0 12px; }
            button { width: 100%; border: 0; border-radius: 8px; padding: 14px 16px; background: var(--rbe); color: white; font-weight: 800; font-size: 16px; box-shadow: 0 10px 18px rgba(211, 12, 76, .22); }
            button.secondary { margin-top: 10px; background: #111827; box-shadow: none; }
            button.ghost { margin-top: 10px; background: white; color: var(--rbe); border: 1px solid rgba(211, 12, 76, .35); box-shadow: none; }
            button:active { transform: translateY(1px); }
            @media (min-width: 720px) { .grid.two { grid-template-columns: 1fr 1fr; } }
          </style>
        </head>
        <body>
          <header>
            <h1>Process de Rapatriement</h1>
            <p>${projectName}${parc ? ` - Parc ${parc}` : ''}</p>
          </header>
          <main>
            <section>
              <h2>Rendez-vous / rapatriement</h2>
              <div class="grid two">
                <div><label>Date de rdv / rapatriement</label><input id="rapatriementDate" type="date" /></div>
                <div><label>Heure</label><input id="rapatriementTime" type="time" /></div>
              </div>
            </section>

            <section>
              <h2>Photos du véhicule</h2>
              <div class="badge">4 angles requis</div>
              <div class="grid">
                <div><label>Angle avant</label><input id="photoFront" type="file" accept="image/*" capture="environment" /></div>
                <div><label>Angle arrière</label><input id="photoRear" type="file" accept="image/*" capture="environment" /></div>
                <div><label>Côté gauche</label><input id="photoLeft" type="file" accept="image/*" capture="environment" /></div>
                <div><label>Côté droit</label><input id="photoRight" type="file" accept="image/*" capture="environment" /></div>
              </div>
              <div id="extraVehiclePhotos" class="grid"></div>
              <button id="addVehiclePhoto" class="ghost" type="button">Ajouter d'autres photos</button>
            </section>

            <section>
              <h2>Photos intérieurs</h2>
              <label>Intérieur du véhicule - 1 photo minimum</label>
              <input id="interiorPhotos" type="file" accept="image/*" capture="environment" multiple />
              <div id="extraInteriorPhotos" class="grid"></div>
              <button id="addInteriorPhoto" class="ghost" type="button">Ajouter d'autres photos</button>
              <div class="hint">1 photo minimum.</div>
            </section>

            <section>
              <h2>Documents légaux signés</h2>
              <label>Justificatif de cession</label>
              <input id="legalDocuments" type="file" accept="image/*,.pdf" capture="environment" multiple />
            </section>

            <section>
              <h2>Niveaux et fluides</h2>
              <div class="grid">
                <div><label>Niveau huile à photographier</label><input id="oilPhoto" type="file" accept="image/*" capture="environment" /><label class="check"><input id="oilOk" type="checkbox" /> OK</label></div>
                <div><label>Niveau LDR et autres fluides</label><input id="coolantPhoto" type="file" accept="image/*" capture="environment" /><label class="check"><input id="coolantOk" type="checkbox" /> OK</label></div>
                <div><label>Niveau gasoil</label><input id="fuelLevel" type="number" min="0" max="100" step="1" placeholder="Pourcentage ou estimation" /></div>
              </div>
            </section>

            <section>
              <h2>Anomalies à signaler</h2>
              <textarea id="anomalies" rows="5" placeholder="Décrire les anomalies constatées..."></textarea>
            </section>

            <section>
              <button id="submitRepatriement" type="button">Valider le relevé de rapatriement</button>
              <button id="closeRepatriement" class="secondary" type="button">Fermer</button>
              <div id="submitHint" class="hint">Le relevé sera renvoyé au dossier Process PARC.</div>
            </section>
          </main>
          <script>
            const projectId = ${projectIdPayload};
            const projectName = ${projectNamePayload};
            const internalFleetNumber = ${parcPayload};
            const getValue = (id) => document.getElementById(id)?.value || '';
            const getChecked = (id) => Boolean(document.getElementById(id)?.checked);
            const fileMeta = (id) => Array.from(document.getElementById(id)?.files || []).map((file) => ({
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream'
            }));
            const fileMetaFromSelector = (selector) => Array.from(document.querySelectorAll(selector)).flatMap((input) =>
              Array.from(input.files || []).map((file) => ({
                name: file.name,
                size: file.size,
                type: file.type || 'application/octet-stream'
              }))
            );
            const setHint = (message, isError = false) => {
              const hint = document.getElementById('submitHint');
              if (!hint) return;
              hint.textContent = message;
              hint.className = isError ? 'hint error' : 'hint';
            };
            const addPhotoInput = (containerId, className, label) => {
              const container = document.getElementById(containerId);
              if (!container) return;
              const index = container.querySelectorAll('input').length + 1;
              const wrapper = document.createElement('div');
              wrapper.innerHTML = '<label>' + label + ' ' + index + '</label><input class="' + className + '" type="file" accept="image/*" capture="environment" multiple />';
              container.appendChild(wrapper);
            };
            document.getElementById('addVehiclePhoto')?.addEventListener('click', () => addPhotoInput('extraVehiclePhotos', 'vehicleExtraPhoto', 'Photo véhicule complémentaire'));
            document.getElementById('addInteriorPhoto')?.addEventListener('click', () => addPhotoInput('extraInteriorPhotos', 'interiorExtraPhoto', 'Photo intérieure complémentaire'));

            const buildReport = (moveToOverview = false) => {
              const vehiclePhotos = {
                front: fileMeta('photoFront'),
                rear: fileMeta('photoRear'),
                left: fileMeta('photoLeft'),
                right: fileMeta('photoRight'),
                extra: fileMetaFromSelector('.vehicleExtraPhoto')
              };
              const interiorPhotos = [...fileMeta('interiorPhotos'), ...fileMetaFromSelector('.interiorExtraPhoto')];

              if (!interiorPhotos.length) {
                setHint('Ajoutez au moins 1 photo intérieure avant de valider.', true);
                return null;
              }

              const requiredVehiclePhotos = ['front', 'rear', 'left', 'right'].filter((key) => vehiclePhotos[key].length > 0).length;
              if (requiredVehiclePhotos < 4) {
                setHint('Ajoutez les 4 angles du véhicule avant de valider.', true);
                return null;
              }

              return {
                id: 'rapatriement-' + Date.now(),
                projectId,
                projectName,
                internalFleetNumber,
                submittedAt: new Date().toISOString(),
                closedAt: moveToOverview ? new Date().toISOString() : null,
                moveToOverview,
                appointmentDate: getValue('rapatriementDate'),
                appointmentTime: getValue('rapatriementTime'),
                vehiclePhotos,
                interiorPhotos,
                legalDocuments: fileMeta('legalDocuments'),
                oil: { photos: fileMeta('oilPhoto'), ok: getChecked('oilOk') },
                coolant: { photos: fileMeta('coolantPhoto'), ok: getChecked('coolantOk') },
                fuelLevel: getValue('fuelLevel'),
                anomalies: getValue('anomalies')
              };
            };

            const saveReport = async (moveToOverview = false) => {
              const report = buildReport(moveToOverview);
              if (!report) return false;

              try {
                const token = localStorage.getItem('token');
                const csrfToken = localStorage.getItem('X-CSRF-Token');
                const response = await fetch('/api/process-parc/projects/' + encodeURIComponent(projectId) + '/repatriement-reports', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: 'Bearer ' + token } : {}),
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                  },
                  body: JSON.stringify(report)
                });

                if (!response.ok) throw new Error('Serveur ' + response.status);
                const project = await response.json();
                localStorage.setItem('process-parc-project:' + projectId, JSON.stringify(project));
                localStorage.setItem('process-parc-rapatriement:' + projectId, JSON.stringify(report));
                setHint(moveToOverview ? 'Relevé sauvegardé serveur. Véhicule déplacé dans Vue d\'ensemble.' : 'Relevé sauvegardé serveur dans le dossier Process PARC.');
                document.getElementById('submitRepatriement').textContent = 'Relevé sauvegardé';
                return true;
              } catch (error) {
                localStorage.setItem('process-parc-rapatriement:' + projectId, JSON.stringify(report));
                setHint('Serveur indisponible: relevé conservé localement, à resynchroniser depuis RétroBus.', true);
                return false;
              }
            };

            document.getElementById('submitRepatriement')?.addEventListener('click', async () => {
              await saveReport(false);
            });

            document.getElementById('closeRepatriement')?.addEventListener('click', async () => {
              if (!await saveReport(true)) return;
              window.close();
              setTimeout(() => setHint('Relevé conservé. Vous pouvez fermer cet onglet.'), 250);
            });
          </script>
        </body>
      </html>`);
    child.document.close();
  };

  const addProcessParcReminder = () => {
    if (!processParcOpenedProject) return;

    const reminder = {
      id: `relance-${Date.now()}`,
      rank: processParcReminderForm.rank.trim(),
      date: processParcReminderForm.date,
      contact: processParcReminderForm.contact.trim(),
      identity: processParcReminderForm.identity.trim(),
      documents: processParcReminderForm.documents,
      mailCaptures: processParcReminderForm.mailCaptures
    };

    const updatedProject = {
      ...processParcOpenedProject,
      reminders: [...(processParcOpenedProject.reminders || []), reminder]
    };

    updateProcessParcProject(updatedProject);
    setProcessParcReminderForm({ rank: '', date: '', contact: '', identity: '', documents: [], mailCaptures: [] });
    setProcessParcReminderOpen(false);
    toast({ status: 'success', title: 'Relance ajoutée', description: `${reminder.rank} - ${reminder.identity}` });
  };

  const resetProcessParcModal = () => {
    setProcessParcOpen(false);
    setProcessParcStep('choice');
    setProcessParcTcInfosUrl('');
    setProcessParcTcInfosResult(null);
    setProcessParcProjectSource('');
    setProcessParcInternalProjectName('');
    setProcessParcInternalFleetNumber('');
    setProcessParcCreatedProject(null);
    setProcessParcOpenedProject(null);
    setProcessParcProjectDetailStep('recap');
    setProcessParcReminderOpen(false);
    setProcessParcReminderForm({ rank: '', date: '', contact: '', identity: '', documents: [], mailCaptures: [] });
  };

  // Charger les alertes critiques (CT périmés, documents manquants) - OPTIMISÉ
  // Une alerte par véhicule avec tous ses problèmes regroupés
  const loadCriticalAlerts = useCallback(async (vehicleList) => {
    if (!vehicleList || vehicleList.length === 0) return;

    const vehicleAlerts = [];

    try {
      // Limiter à 10 véhicules en parallèle pour ne pas surcharger
      const vehicleCalls = vehicleList.map((v) => async () => {
        const parc = v.parc || v.id || v.slug;
        if (!parc) return null;

        const ctIssues = [];
        const docIssues = [];

        try {
          // Charger les données admin en parallèle avec cache
          const cacheKey = `admin-${parc}`;
          const adminData = await cachedAPICall(
            cacheKey,
            () => Promise.all([
              vehicleAdminAPI.getCarteGrise(parc).catch(() => null),
              vehicleAdminAPI.getAssurance(parc).catch(() => null),
              vehicleAdminAPI.getControleTechnique(parc).catch(() => null)
            ]),
            3 * 60 * 1000 // Cache 3 minutes
          );

          const [cgRes, assRes, ctRes] = adminData;

          // Vérifier CT périmé
          if (ctRes?.latestCT) {
            const now = new Date();
            let ctExpired = false;
            let expirationDate = null;

            // 1. Vérifier si nextCtDate existe et est dépassé
            if (ctRes.latestCT.nextCtDate) {
              expirationDate = new Date(ctRes.latestCT.nextCtDate);
              ctExpired = now > expirationDate;
              
              console.log(`🔍 ${parc} - nextCtDate: ${expirationDate.toLocaleDateString('fr-FR')}, expired: ${ctExpired}`);
            } else {
              // 2. Sinon, calculer 2 ans après le dernier CT (réglementation française)
              const ctDate = new Date(ctRes.latestCT.ctDate);
              expirationDate = new Date(ctDate);
              expirationDate.setFullYear(expirationDate.getFullYear() + 2);
              ctExpired = now > expirationDate;
              
              console.log(`🔍 ${parc} - ctDate: ${ctDate.toLocaleDateString('fr-FR')}, expiration calculée: ${expirationDate.toLocaleDateString('fr-FR')}, expired: ${ctExpired}`);
            }

            // Ajouter l'alerte si périmé
            if (ctExpired) {
              ctIssues.push(`Contrôle Technique périmé depuis le ${expirationDate.toLocaleDateString('fr-FR')}`);
            } else if (ctRes.latestCT.ctStatus === 'failed') {
              ctIssues.push(`Contrôle Technique non conforme`);
            }
          } else {
            ctIssues.push(`Aucun Contrôle Technique enregistré`);
          }

          // Vérifier documents manquants
          if (!cgRes?.newCGPath) {
            docIssues.push('Carte Grise absente');
          }
          if (!assRes?.isActive) {
            docIssues.push('Assurance non active ou manquante');
          }

          // Ajouter l'alerte seulement si problèmes détectés
          if (ctIssues.length > 0 || docIssues.length > 0) {
            vehicleAlerts.push({ parc, ctIssues, docIssues });
          }

        } catch (e) {
          console.warn(`⚠️ Error checking alerts for ${parc}:`, e.message);
        }
        
        return null;
      });

      // Exécuter en batch avec limite de 10 requêtes simultanées
      await batchAPICall(vehicleCalls, 10);

      setCriticalAlerts({
        vehicleAlerts,
        dismissed: []
      });

    } catch (error) {
      console.error('❌ Error loading critical alerts:', error);
    }
  }, []);

  useEffect(() => {
    reloadVehicles();
  }, [reloadVehicles]);

  // Charger les alertes critiques après le chargement des véhicules
  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      loadCriticalAlerts(vehicles);
    }
  }, [vehicles, loadCriticalAlerts]);

  // Charger l'état de pointage (actif) pour chaque véhicule - OPTIMISÉ
  useEffect(() => {
    if (!vehicles || vehicles.length === 0) return;
    let cancelled = false;
    
    const loadStatuses = async () => {
      const slice = vehicles.slice(0, 24);
      const validVehicles = slice.filter(v => v.parc || v.id || v.slug);
      
      try {
        // Batch les appels avec limite de concurrence
        const statusCalls = validVehicles.map((v) => async () => {
          const parc = v.parc || v.id || v.slug;
          try {
            // Utiliser le cache pour les usages
            const cacheKey = `usages-${parc}`;
            const usages = await cachedAPICall(
              cacheKey,
              () => apiClient.get(`/vehicles/${encodeURIComponent(parc)}/usages`),
              1 * 60 * 1000 // Cache 1 minute pour les pointages
            );
            
            if (cancelled) return;
            
            const active = Array.isArray(usages) ? usages.find(u => !u.endedAt) : null;
            setStatusByParc(prev => ({
              ...prev,
              [parc]: active ? { active: true, startedAt: active.startedAt, conducteur: active.conducteur } : { active: false }
            }));
          } catch (e) {
            if (cancelled) return;
            console.warn(`⚠️ Error loading status for ${parc}:`, e.message);
            setStatusByParc(prev => ({ ...prev, [parc]: { active: false } }));
          }
        });
        
        // Limiter à 8 requêtes simultanées pour ne pas saturer
        await batchAPICall(statusCalls, 8);
      } catch (error) {
        console.error('❌ Error in loadStatuses:', error);
      }
    };
    
    if (!cancelled) {
      loadStatuses();
    }
    
    return () => { cancelled = true; };
  }, [vehicles]);

  // Charger l'historique des usages pour tous les véhicules - OPTIMISÉ
  const loadAllUsages = useCallback(async () => {
    if (!vehicles || vehicles.length === 0) return;
    setLoadingUsages(true);
    try {
      const usagesMap = {};
      const validVehicles = vehicles.filter(v => v.parc || v.id || v.slug);
      
      // Batch les appels avec limite de concurrence
      const usageCalls = validVehicles.map((v) => async () => {
        const parc = v.parc || v.id || v.slug;
        try {
          const cacheKey = `usages-history-${parc}`;
          const usages = await cachedAPICall(
            cacheKey,
            () => apiClient.get(`/vehicles/${encodeURIComponent(parc)}/usages`),
            5 * 60 * 1000 // Cache 5 minutes pour l'historique
          );
          usagesMap[parc] = Array.isArray(usages) ? usages : [];
        } catch (e) {
          console.warn(`⚠️ Error loading usages for ${parc}:`, e.message);
          usagesMap[parc] = [];
        }
      });
      
      // Limiter à 10 requêtes simultanées
      await batchAPICall(usageCalls, 10);
      
      setUsagesData(usagesMap);
    } catch (error) {
      console.error('❌ Erreur chargement usages global:', error);
      toast({ status: 'error', title: 'Erreur', description: 'Impossible de charger l\'historique' });
    } finally {
      setLoadingUsages(false);
    }
  }, [vehicles, toast]);

  const vehicleCards = useMemo(() => {
    const overviewProcessParcProjects = processParcProjects.filter((project) => project.status === 'overview');
    if ((!vehicles || vehicles.length === 0) && overviewProcessParcProjects.length === 0) return null;
    return (
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4} mt={4}>
        {(vehicles || []).map((v) => {
          const parc = v.parc || v.id || v.slug;
          if (!parc) {
            console.warn('⚠️ Vehicle without parc/id/slug:', v);
            return null;
          }
          const status = statusByParc[parc] || { active: false };
          
          // Parser les caractéristiques depuis l'API
          let caracteristiques = [];
          try {
            if (v.caracteristiques) {
              caracteristiques = typeof v.caracteristiques === 'string' 
                ? JSON.parse(v.caracteristiques) 
                : v.caracteristiques;
            }
          } catch (e) {
            console.warn(`Erreur parsing caracteristiques for ${parc}:`, e);
          }

          // Extraire infos techniques clés depuis caracteristiques
          const findCarac = (labels) => {
            if (!Array.isArray(caracteristiques)) return null;
            for (const label of labels) {
              const found = caracteristiques.find(c => 
                c.label && c.label.toLowerCase().includes(label.toLowerCase())
              );
              if (found?.value) return found.value;
            }
            return null;
          };

          // Fallback: si pas dans caracteristiques, utiliser les champs directs du véhicule
          const constructeur = findCarac(['Constructeur']) || v.marque;
          const moteur = findCarac(['Moteur', 'Motorisation']);
          const energie = findCarac(['Énergie', 'Energie', 'Carburant']) || v.energie;
          const placesAssises = findCarac(['Places assises', 'Places']);
          const modeleInfo = findCarac(['Modèle']) || v.modele;
          const immatInfo = findCarac(['Immatriculation', 'Immat']) || v.immat;

          // Construire un objet d'infos techniques même si pas de caracteristiques formelles
          const infos = [];
          if (constructeur) infos.push({ label: 'Constructeur', value: constructeur });
          if (modeleInfo) infos.push({ label: 'Modèle', value: modeleInfo });
          if (energie) infos.push({ label: 'Énergie', value: energie });
          if (moteur) infos.push({ label: 'Moteur', value: moteur });
          if (placesAssises) infos.push({ label: 'Places', value: placesAssises });
          if (immatInfo) infos.push({ label: 'Immatriculation', value: immatInfo });
          
          const hasInfosTech = infos.length > 0 || (Array.isArray(caracteristiques) && caracteristiques.length > 0);
          const totalInfos = Math.max(infos.length, caracteristiques.length || 0);
          
          // Calcul gasoil (priorité: champ fuel > caracteristiques)
          let gasoil = 0;
          try {
            if (v.fuel !== undefined && v.fuel !== null) {
              gasoil = Number(v.fuel) || 0;
            } else {
              const gasoilCarac = findCarac(['Niveau gasoil', 'Gasoil', 'Carburant']);
              if (gasoilCarac) gasoil = Number(gasoilCarac) || 0;
            }
          } catch (e) {
            console.warn('Erreur parsing fuel:', e);
          }

          // Couleur jauge gasoil
          const fuelColor = gasoil > 50 ? 'green' : gasoil > 25 ? 'orange' : 'red';
          const fuelIcon = gasoil > 50 ? '🟢' : gasoil > 25 ? '🟡' : '🔴';

          // Trouver les alertes pour ce véhicule
          const vehicleAlert = criticalAlerts.vehicleAlerts?.find(alert => alert.parc === parc);
          const hasAlerts = vehicleAlert && (vehicleAlert.ctIssues.length > 0 || vehicleAlert.docIssues.length > 0);
          const processParcProject = processParcProjects.find((project) => project.internalFleetNumber === parc);

          return (
            <Card 
              key={parc} 
              variant="outline" 
              _hover={{ shadow: 'md' }}
              borderColor={hasAlerts ? 'red.300' : 'gray.200'}
              borderWidth={hasAlerts ? '2px' : '1px'}
            >
              <CardBody>
                <VStack align="start" spacing={3}>
                  {/* En-tête */}
                  <HStack justify="space-between" w="full">
                    <VStack align="start" spacing={0}>
                      <Heading size="md">{parc}</Heading>
                      <Text fontSize="xs" color="gray.600" noOfLines={1}>
                        {[v.marque, v.modele].filter(Boolean).join(' ') || v.titre || 'Véhicule'}
                      </Text>
                    </VStack>
                    <EtatBadge etat={v.etat || v.statut} />
                  </HStack>

                  {/* Alertes critiques intégrées */}
                  {hasAlerts && !criticalAlerts.dismissed.includes(parc) && (
                    <Alert p={2} borderRadius="md" fontSize="xs" bg="red.50" borderColor="red.300" borderWidth="1px">
                      <TriangleErrorIcon boxSize={4} color="red.500" mr={2} flexShrink={0} />
                      <VStack align="start" spacing={0} flex={1}>
                        {vehicleAlert.ctIssues.map((issue, idx) => (
                          <Text key={idx}>• {issue}</Text>
                        ))}
                        {vehicleAlert.docIssues.map((issue, idx) => (
                          <Text key={idx}>• {issue}</Text>
                        ))}
                      </VStack>
                    </Alert>
                  )}

                  {/* Infos techniques clés - avec fallback sur champs de base */}
                  {hasInfosTech ? (
                    <Box w="full" bg="blue.50" p={2} borderRadius="md">
                      <VStack align="start" spacing={1} fontSize="xs">
                        {infos.slice(0, 4).map((info, idx) => (
                          <HStack key={idx} spacing={1}>
                            <Text fontWeight="600">{info.label}:</Text>
                            <Text noOfLines={1}>{info.value}</Text>
                          </HStack>
                        ))}
                        {totalInfos > 0 && (
                          <Text fontSize="xs" color="blue.700" fontWeight="500">
                            {totalInfos} info(s) disponible(s)
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  ) : (
                    <Box w="full" bg="orange.50" p={2} borderRadius="md">
                      <HStack>
                        <Icon as={FiInfo} color="orange.500" />
                        <Text fontSize="xs" color="orange.700">
                          Infos techniques à compléter
                        </Text>
                      </HStack>
                    </Box>
                  )}

                  {/* Jauge gasoil visuelle */}
                  <Box w="full">
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="xs" fontWeight="600" color="gray.600">Carburant</Text>
                      <Text fontSize="xs" fontWeight="bold" color={`${fuelColor}.600`}>
                        {fuelIcon} {gasoil}%
                      </Text>
                    </HStack>
                    <Box w="full" h="6px" bg="gray.200" borderRadius="full" overflow="hidden">
                      <Box 
                        h="full" 
                        w={`${gasoil}%`} 
                        bg={`${fuelColor}.400`}
                        transition="all 0.3s"
                      />
                    </Box>
                  </Box>

                  {/* Statut pointage */}
                  {status.active ? (
                    <Tag colorScheme="purple" size="sm" w="full" justifyContent="center">
                      <TagLeftIcon as={FiClock} />
                      <TagLabel>Pointage en cours</TagLabel>
                    </Tag>
                  ) : (v.etat === 'en_panne' || v.statut === 'en_panne') ? (
                    <Tag colorScheme="red" size="sm" w="full" justifyContent="center">
                      <TagLeftIcon as={FiAlertTriangle} />
                      <TagLabel>En panne</TagLabel>
                    </Tag>
                  ) : null}

                  {/* Actions */}
                  <Divider />
                  <HStack w="full" spacing={2} wrap="wrap">
                    <Button 
                      size="sm" 
                      leftIcon={<FiTool />}
                      onClick={() => navigate(`/dashboard/vehicules/${encodeURIComponent(parc)}`)}
                      flex={1}
                      colorScheme="blue"
                      variant="outline"
                    >
                      Gérer
                    </Button>
                    <Button 
                      size="sm" 
                      leftIcon={<FiSliders />}
                      variant="ghost"
                      onClick={() => {
                        setEditTechVehicle(v);
                        setEditTechCaracs(caracteristiques);
                        setEditTechGasoil(gasoil);
                        setEditTechOpen(true);
                      }}
                    >
                      Modifier
                    </Button>
                    {processParcProject && (
                      <Button
                        size="sm"
                        leftIcon={<FiFileText />}
                        colorScheme="rbe"
                        onClick={() => openProcessParcConsultation(processParcProject)}
                      >
                        Consultation PARC
                      </Button>
                    )}
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          );
        })}
        {overviewProcessParcProjects.map((project) => {
          const latestReport = (project.repatriementReports || [])[0];
          const fuelLevel = latestReport?.fuelLevel || 0;

          return (
            <Card
              key={project.id}
              variant="outline"
              _hover={{ shadow: 'md' }}
              borderColor="rbe.300"
              borderWidth="2px"
            >
              <CardBody>
                <VStack align="start" spacing={3}>
                  <HStack justify="space-between" w="full">
                    <VStack align="start" spacing={0}>
                      <Heading size="md">{project.internalFleetNumber}</Heading>
                      <Text fontSize="xs" color="gray.600" noOfLines={1}>{project.name}</Text>
                    </VStack>
                    <Badge colorScheme="rbe">Process PARC</Badge>
                  </HStack>

                  <Box w="full" bg="rbe.50" p={2} borderRadius="md">
                    <VStack align="start" spacing={1} fontSize="xs">
                      <HStack spacing={1}>
                        <Text fontWeight="600">Statut:</Text>
                        <Text>Rapatriement clôturé</Text>
                      </HStack>
                      <HStack spacing={1}>
                        <Text fontWeight="600">Relevés:</Text>
                        <Text>{(project.repatriementReports || []).length}</Text>
                      </HStack>
                      {project.movedToOverviewAt && (
                        <HStack spacing={1}>
                          <Text fontWeight="600">Intégré le:</Text>
                          <Text>{new Date(project.movedToOverviewAt).toLocaleDateString('fr-FR')}</Text>
                        </HStack>
                      )}
                    </VStack>
                  </Box>

                  <Box w="full">
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="xs" fontWeight="600" color="gray.600">Carburant</Text>
                      <Text fontSize="xs" fontWeight="bold" color="blue.600">{fuelLevel || '-'}%</Text>
                    </HStack>
                    <Box w="full" h="6px" bg="gray.200" borderRadius="full" overflow="hidden">
                      <Box h="full" w={`${Number(fuelLevel) || 0}%`} bg="blue.400" transition="all 0.3s" />
                    </Box>
                  </Box>

                  <Divider />
                  <HStack w="full" spacing={2} wrap="wrap">
                    <Button size="sm" leftIcon={<FiTool />} flex={1} colorScheme="blue" variant="outline" onClick={() => openProcessParcConsultation(project)}>
                      Gérer
                    </Button>
                    <Button size="sm" leftIcon={<FiSliders />} variant="ghost" onClick={() => openProcessParcConsultation(project)}>
                      Modifier
                    </Button>
                    <Button size="sm" leftIcon={<FiFileText />} colorScheme="rbe" onClick={() => openProcessParcConsultation(project)}>
                      Consultation PARC
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          );
        })}
      </SimpleGrid>
    );
  }, [vehicles, processParcProjects, navigate, statusByParc, criticalAlerts]);

  // Render functions for workspace sections
  const renderVehiclesSection = () => (
    <VStack align="stretch" spacing={4}>
      {loading ? (
        <HStack spacing={3} pt={4}>
          <Spinner />
          <Text>Chargement des véhicules…</Text>
        </HStack>
      ) : (
        <>
          {/* Résumé des alertes globales */}
          {criticalAlerts.vehicleAlerts && criticalAlerts.vehicleAlerts.length > 0 && (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={0}>
                <Text fontWeight="600">
                  ⚠️ {criticalAlerts.vehicleAlerts.length} véhicule(s) nécessite(nt) une attention
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Les alertes sont affichées sur chaque carte concernée ci-dessous
                </Text>
              </VStack>
            </Alert>
          )}

          {vehicleCards || <Text mt={2}>Aucun véhicule pour le moment.</Text>}
        </>
      )}
    </VStack>
  );

  const renderHistorySection = () => (
    <VStack align="start" spacing={4} py={2}>
      <HStack justify="space-between" w="full">
        <HStack>
          <FiFileText />
          <Heading size="sm">Historique des usages</Heading>
        </HStack>
        <Button size="sm" onClick={loadAllUsages} isLoading={loadingUsages} colorScheme="blue">
          Charger l'historique
        </Button>
      </HStack>

      {loadingUsages ? (
        <HStack spacing={3}>
          <Spinner size="sm" />
          <Text>Chargement de l'historique...</Text>
        </HStack>
      ) : Object.keys(usagesData).length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          Cliquez sur "Charger" pour afficher l'historique des usages
        </Alert>
      ) : (
        <VStack align="stretch" w="full" spacing={4}>
          {vehicles.map((v) => {
            const parc = v.parc || v.id || v.slug;
            const usages = usagesData[parc] || [];
            const completedUsages = usages.filter(u => u.endedAt);

            if (completedUsages.length === 0) return null;

            return (
              <Card key={parc} variant="outline">
                <CardBody>
                  <Heading size="sm" mb={3}>{parc} - {completedUsages.length} usage(s)</Heading>
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Début</Th>
                        <Th>Fin</Th>
                        <Th>Conducteur</Th>
                        <Th>Note</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {completedUsages.slice(0, 5).map((usage) => (
                        <Tr key={usage.id}>
                          <Td>{new Date(usage.startedAt).toLocaleDateString('fr-FR')}</Td>
                          <Td>{usage.endedAt ? new Date(usage.endedAt).toLocaleDateString('fr-FR') : '-'}</Td>
                          <Td>{usage.conducteur || '-'}</Td>
                          <Td fontSize="sm" color="gray.600">{usage.note || '-'}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {completedUsages.length > 5 && (
                    <Text mt={2} fontSize="sm" color="gray.500">
                      ... et {completedUsages.length - 5} autres usage(s)
                    </Text>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </VStack>
      )}
    </VStack>
  );

  const renderMaintenanceSection = () => (
    <MaintenanceTab vehicles={vehicles} apiClient={apiClient} />
  );

  const renderProcessParcSection = () => (
    <VStack align="stretch" spacing={4} py={2}>
      <HStack justify="space-between" align="center" wrap="wrap" gap={3}>
        <HStack>
          <FiFileText />
          <Heading size="sm">Process PARC</Heading>
        </HStack>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="blue"
          size="sm"
          onClick={() => setProcessParcOpen(true)}
        >
          Ajouter un véhicule
        </Button>
      </HStack>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text fontWeight="600">Processus d'Ajout d'un véhicule pRéservé et Collectionné</Text>
          <Text fontSize="sm">
            Cet onglet accueillera le processus dédié aux véhicules en attente de préservation, séparé du parc officiel.
          </Text>
        </VStack>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        <Card variant="outline">
          <CardBody>
            <Stat>
              <StatLabel>Dossiers en cours</StatLabel>
              <StatNumber>{processParcProjects.length}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card variant="outline">
          <CardBody>
            <Stat>
              <StatLabel>À compléter</StatLabel>
              <StatNumber>0</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card variant="outline">
          <CardBody>
            <Stat>
              <StatLabel>Prêts à intégrer</StatLabel>
              <StatNumber>0</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card variant="outline">
        <CardBody>
          <VStack align="start" spacing={2}>
            <Heading size="sm">Workflow à définir</Heading>
            <Text fontSize="sm" color="gray.600">
              Les véhicules créés ici resteront invisibles de la page Véhicules jusqu'à la validation complète du process PARC.
            </Text>
            <Text fontSize="sm" color="gray.600">
              En attente des étapes métier, champs obligatoires et conditions d'intégration au parc.
            </Text>
          </VStack>
        </CardBody>
      </Card>

      {processParcProjects.length > 0 && (
        <Card variant="outline">
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <Heading size="sm">Projets de préservation</Heading>
              {processParcProjects.map((project) => (
                <HStack key={project.id} justify="space-between" wrap="wrap" gap={3} borderWidth="1px" borderRadius="md" p={3}>
                  <Box>
                    <Text fontWeight="700" color="black">{project.name}</Text>
                    <Text fontSize="sm" color="gray.600">Parc interne: {project.internalFleetNumber}</Text>
                  </Box>
                  <Button size="sm" colorScheme="rbe" onClick={() => {
                    openProcessParcConsultation(project);
                  }}>
                    Ouvrir le projet
                  </Button>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );

  const renderAdministrativeSection = () => (
    <VStack align="stretch" spacing={4} py={2}>
      <HStack>
        <FiAlertTriangle />
        <Heading size="sm">Situation administrative</Heading>
      </HStack>
      
      {vehicles.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          Aucun véhicule enregistré
        </Alert>
      ) : (
        <>
          <Alert status="info">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontWeight="600">Gestion administrative</Text>
              <Text fontSize="sm">
                Cliquez sur les badges pour gérer les Cartes Grises, Assurances, Contrôles Techniques, Certificats et Échéancier.
              </Text>
            </VStack>
          </Alert>
          
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={3} w="full">
            {vehicles.map((v) => {
              const parc = v.parc || v.id || v.slug;
              return (
                <Card key={parc} variant="outline" _hover={{ shadow: 'md' }} p={3}>
                  <VStack align="start" spacing={2} w="full">
                    <HStack w="full" justify="space-between">
                      <VStack align="start" spacing={0}>
                        <Heading size="sm">{parc}</Heading>
                        <Text fontSize="xs" color="gray.600">{v.marque} {v.modele}</Text>
                      </VStack>
                    </HStack>
                    <VehicleAdminStatus parc={parc} />
                  </VStack>
                </Card>
              );
            })}
          </SimpleGrid>

          <VStack align="start" w="full" pt={4} borderTop="1px solid" borderTopColor="gray.200">
            <HStack>
              <FiFileText />
              <Heading size="sm">Échéancier global</Heading>
            </HStack>
            <Button 
              colorScheme="blue" 
              size="sm"
              onClick={() => navigate('/echancier')}
            >
              Voir l'échéancier complet
            </Button>
          </VStack>
        </>
      )}
    </VStack>
  );

  const renderCheckinsSection = () => (
    <VStack align="start" spacing={4} py={2}>
      <HStack>
        <FiClock />
        <Heading size="sm">Pointages actifs</Heading>
      </HStack>

      {vehicles.filter(v => {
        const parc = v.parc || v.id || v.slug;
        return statusByParc[parc]?.active;
      }).length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          Aucun pointage en cours actuellement
        </Alert>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} w="full">
          {vehicles.map((v) => {
            const parc = v.parc || v.id || v.slug;
            const status = statusByParc[parc];

            if (!status?.active) return null;

            const duration = status.startedAt
              ? Math.floor((Date.now() - new Date(status.startedAt).getTime()) / (1000 * 60))
              : 0;

            return (
              <Card key={parc} variant="outline" borderColor="purple.300">
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <Heading size="sm">{parc}</Heading>
                    <HStack>
                      <Icon as={FiClock} color="purple.500" />
                      <Text fontSize="sm">
                        En cours depuis {duration} min
                      </Text>
                    </HStack>
                    {status.conducteur && (
                      <Text fontSize="sm" color="gray.600">
                        Conducteur: {status.conducteur}
                      </Text>
                    )}
                    <Button 
                      size="sm" 
                      colorScheme="purple"
                      onClick={() => navigate(`/mobile/v/${encodeURIComponent(parc)}`)}
                    >
                      Voir le pointage
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </VStack>
  );

  const renderLumistudioSection = () => (
    <VStack align="start" spacing={4} py={2}>
      <Button
        onClick={async () => {
          try {
            setIsLaunchingLumistudio(true);
            const response = await apiClient.get('/lumistudio/launch');
            const launchUrl = response?.launchUrl || 'https://www.retrobus-interne.fr/myrbe/lumistudio';
            window.location.assign(launchUrl);
          } catch (error) {
            toast({
              status: 'warning',
              title: 'Lumistudio indisponible',
              description: 'Redirection vers le lien de secours.'
            });
            window.location.assign('https://www.retrobus-interne.fr/myrbe/lumistudio');
          } finally {
            setIsLaunchingLumistudio(false);
          }
        }}
        colorScheme="purple"
        isLoading={isLaunchingLumistudio}
        loadingText="Ouverture..."
      >
        Utiliser lumistudio
      </Button>
    </VStack>
  );

  const sections = [
    {
      id: 'vehicles',
      label: 'Vue d\'ensemble',
      icon: FiTool,
      description: "Parc & Alertes",
      render: renderVehiclesSection
    },
    {
      id: 'history',
      label: 'Historique',
      icon: FiFileText,
      description: 'Usages récents',
      render: renderHistorySection
    },
    {
      id: 'maintenance',
      label: 'Entretien',
      icon: FiTool,
      description: 'Planification & suivi',
      render: renderMaintenanceSection
    },
    {
      id: 'process-parc',
      label: 'Process PARC',
      icon: FiFileText,
      description: 'Préservation & intégration',
      render: renderProcessParcSection
    },
    {
      id: 'administrative',
      label: 'Administratif',
      icon: FiAlertTriangle,
      description: 'Documents & obligations',
      render: renderAdministrativeSection
    },
    {
      id: 'checkins',
      label: 'Pointages',
      icon: FiClock,
      description: 'Sessions actives',
      render: renderCheckinsSection
    },
    {
      id: 'lumistudio',
      label: 'Lumistudio',
      icon: FiSliders,
      description: 'Atelier visuel',
      render: renderLumistudioSection
    }
  ];

  const headerActions = [
    <Button
      key="refresh"
      leftIcon={<FiRefreshCw />}
      variant="outline"
      size="sm"
      onClick={() => {
        // Nettoyer le cache avant d'actualiser
        const { apiCache } = require('../lib/performanceUtils');
        apiCache.clear();
        
        reloadVehicles();
        setCriticalAlerts({ vehicleAlerts: [], dismissed: [] });
      }}
      isLoading={loading}
    >
      Actualiser
    </Button>,
    <Button
      key="manage"
      leftIcon={<FiEdit />}
      colorScheme="blue"
      size="sm"
      onClick={() => navigate('/dashboard/vehicules')}
    >
      Gestion complète
    </Button>
  ];

  return (
    <>
      <WorkspaceLayout
        title="RétroBus"
        subtitle="Suivi d'entretien, d'usages et de disponibilité du parc."
        sections={sections}
        defaultSectionId="vehicles"
        sidebarTitle="RétroBus"
        sidebarSubtitle="Parc & maintenance"
        sidebarTitleIcon={FiTool}
        versionLabel="RétroBus v3"
        headerActions={headerActions}
      />

      <Modal
        isOpen={processParcOpen}
        onClose={resetProcessParcModal}
        size="full"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack align="stretch" spacing={2}>
              <HStack>
                <Icon as={FiArchive} boxSize={5} color="rbe.500" />
                <Text>Process PARC</Text>
                <Badge colorScheme="rbe">Préservation</Badge>
              </HStack>
              <Text fontSize="sm" color="gray.600" fontWeight="400">
                Processus d'Ajout d'un véhicule pRéservé et Collectionné
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={6} py={4} maxW="1100px" mx="auto">
              {processParcStep === 'project-detail' && processParcOpenedProject ? (
              <VStack align="stretch" spacing={5}>
                <Box
                  bg="linear-gradient(135deg, #d30c4c 0%, #c10744 100%)"
                  color="white"
                  borderRadius="xl"
                  p={{ base: 5, md: 8 }}
                >
                  <VStack align="start" spacing={3}>
                    <HStack spacing={3}>
                      <Icon as={FiArchive} boxSize={8} />
                      <Box>
                        <Heading size="lg">{processParcOpenedProject.name}</Heading>
                        <Text opacity={0.92}>Projet de préservation PARC</Text>
                      </Box>
                    </HStack>
                  </VStack>
                </Box>

                <HStack spacing={2} wrap="wrap">
                  {[
                    { id: 'recap', label: 'Récap Projets' },
                    { id: 'documents', label: 'Documents et Mails' },
                    { id: 'repatriement', label: 'Process de Rapatriement' }
                  ].map((step, index) => {
                    const order = ['recap', 'documents', 'repatriement'];
                    const activeIndex = order.indexOf(processParcProjectDetailStep);
                    const isActive = step.id === processParcProjectDetailStep;
                    const isDone = index < activeIndex;

                    return (
                      <HStack key={step.id} spacing={2}>
                        <Badge
                          colorScheme={isActive ? 'rbe' : isDone ? 'green' : 'gray'}
                          variant={isActive ? 'solid' : 'subtle'}
                          px={3}
                          py={1}
                          borderRadius="full"
                        >
                          {index + 1}. {step.label}
                        </Badge>
                        {index < 2 && <Text color="gray.400">/</Text>}
                      </HStack>
                    );
                  })}
                </HStack>

                {processParcProjectDetailStep === 'recap' ? (
                <Card variant="outline">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <HStack justify="space-between" wrap="wrap" gap={3}>
                        <Box>
                          <Heading size="md">Récap Projets</Heading>
                          <Text fontSize="sm" color="gray.600">Synthèse du projet avant les documents, mails et rapatriement.</Text>
                        </Box>
                        <Badge colorScheme="green">Créé</Badge>
                      </HStack>

                      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                        <Box bg="gray.50" borderRadius="md" p={3}>
                          <Text fontSize="xs" color="gray.500">Nom du projet interne</Text>
                          <Text fontWeight="700" color="black">{processParcOpenedProject.name}</Text>
                        </Box>
                        <Box bg="gray.50" borderRadius="md" p={3}>
                          <Text fontSize="xs" color="gray.500">Numéro de parc interne</Text>
                          <Text fontWeight="700" color="black">{processParcOpenedProject.internalFleetNumber}</Text>
                        </Box>
                      </SimpleGrid>

                      {processParcOpenedProject.tcInfos?.vehicle && (
                        <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                          {[
                            ['Constructeur', processParcOpenedProject.tcInfos.vehicle.manufacturer],
                            ['Modèle', processParcOpenedProject.tcInfos.vehicle.model],
                            ['Immatriculation', processParcOpenedProject.tcInfos.vehicle.registration],
                            ['Mise en circulation', processParcOpenedProject.tcInfos.vehicle.firstRegistration],
                            ['N° série', processParcOpenedProject.tcInfos.vehicle.vin],
                            ['Statut TC Infos', processParcOpenedProject.tcInfos.vehicle.status]
                          ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
                            <Box key={label} bg="white" borderWidth="1px" borderRadius="md" p={3}>
                              <Text fontSize="xs" color="gray.500">{label}</Text>
                              <Text fontSize="sm" fontWeight="600" color="black">{value}</Text>
                            </Box>
                          ))}
                        </SimpleGrid>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
                ) : processParcProjectDetailStep === 'documents' ? (
                <VStack align="stretch" spacing={5}>
                  <Card variant="outline">
                    <CardBody>
                      <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between" align="start" wrap="wrap" gap={3}>
                          <Box>
                            <Heading size="md">Documents primaires</Heading>
                            <Text fontSize="sm" color="gray.600">Base documentaire nécessaire pour la suite du projet.</Text>
                          </Box>
                          <Badge colorScheme="rbe">{(processParcOpenedProject.documents || []).length} document(s)</Badge>
                        </HStack>
                        <Box>
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                            onChange={(event) => {
                              addProcessParcFiles('document', event.target.files);
                              event.target.value = '';
                            }}
                          />
                        </Box>
                        {(processParcOpenedProject.documents || []).length === 0 ? (
                          <Alert status="info" borderRadius="md">
                            <AlertIcon />
                            Aucun document joint.
                          </Alert>
                        ) : (
                          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                            {(processParcOpenedProject.documents || []).map((file) => (
                              <Box key={file.id} borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                                <Text fontWeight="600" color="black">{file.name}</Text>
                                <Text fontSize="sm" color="gray.600">{Math.max(1, Math.round(file.size / 1024))} Ko</Text>
                              </Box>
                            ))}
                          </SimpleGrid>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card variant="outline">
                    <CardBody>
                      <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between" align="start" wrap="wrap" gap={3}>
                          <Box>
                            <Heading size="md">Captures de mail</Heading>
                            <Text fontSize="sm" color="gray.600">Captures ou éléments utiles à joindre au dossier.</Text>
                          </Box>
                          <Badge colorScheme="blue">{(processParcOpenedProject.mailCaptures || []).length} capture(s)</Badge>
                        </HStack>
                        <Box>
                          <Input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            onChange={(event) => {
                              addProcessParcFiles('mail', event.target.files);
                              event.target.value = '';
                            }}
                          />
                        </Box>
                        {(processParcOpenedProject.mailCaptures || []).length === 0 ? (
                          <Box borderWidth="1px" borderStyle="dashed" borderRadius="md" p={4} textAlign="center" color="gray.600">
                            Aucune capture de mail jointe.
                          </Box>
                        ) : (
                          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                            {(processParcOpenedProject.mailCaptures || []).map((file) => (
                              <Box key={file.id} borderWidth="1px" borderRadius="md" p={3} bg="blue.50">
                                <Text fontWeight="600" color="black">{file.name}</Text>
                                <Text fontSize="sm" color="gray.600">{Math.max(1, Math.round(file.size / 1024))} Ko</Text>
                              </Box>
                            ))}
                          </SimpleGrid>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card variant="outline">
                    <CardBody>
                      <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between" align="start" wrap="wrap" gap={3}>
                          <Box>
                            <Heading size="md">Relances</Heading>
                            <Text fontSize="sm" color="gray.600">Nombre de relances: {(processParcOpenedProject.reminders || []).length}</Text>
                          </Box>
                          <Button size="sm" colorScheme="rbe" leftIcon={<FiPlus />} onClick={() => setProcessParcReminderOpen(true)}>
                            Ajouter une relance
                          </Button>
                        </HStack>

                        {(processParcOpenedProject.reminders || []).length === 0 ? (
                          <Alert status="info" borderRadius="md">
                            <AlertIcon />
                            Aucune relance enregistrée.
                          </Alert>
                        ) : (
                          <Table size="sm" variant="simple">
                            <Thead>
                              <Tr>
                                <Th>Relance</Th>
                                <Th>Date</Th>
                                <Th>Numéro ou mail relancé</Th>
                                <Th>Identité relancée</Th>
                                <Th>Pièces</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {(processParcOpenedProject.reminders || []).map((reminder) => (
                                <Tr key={reminder.id}>
                                  <Td>{reminder.rank}</Td>
                                  <Td>{reminder.date ? new Date(reminder.date).toLocaleDateString('fr-FR') : '-'}</Td>
                                  <Td>{reminder.contact}</Td>
                                  <Td>{reminder.identity}</Td>
                                  <Td>
                                    <VStack align="start" spacing={1}>
                                      <Badge colorScheme="rbe">{(reminder.documents || []).length} doc.</Badge>
                                      <Badge colorScheme="blue">{(reminder.mailCaptures || []).length} mail</Badge>
                                    </VStack>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
                ) : (
                <Card variant="outline">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <HStack justify="space-between" align="start" wrap="wrap" gap={3}>
                        <Box>
                          <Heading size="md">Process de Rapatriement</Heading>
                          <Text color="gray.600" fontSize="sm">Parcours terrain mobile, ouvert dans un nouvel onglet.</Text>
                        </Box>
                        <Badge colorScheme="rbe">{(processParcOpenedProject.repatriementReports || []).length} relevé(s)</Badge>
                      </HStack>

                      <Button colorScheme="rbe" rightIcon={<FiArrowRight />} onClick={openProcessParcRepatriementTab}>
                        Ouvrir le process mobile
                      </Button>

                      {(processParcOpenedProject.repatriementReports || []).length > 0 && (
                        <VStack align="stretch" spacing={3}>
                          {(processParcOpenedProject.repatriementReports || []).map((report) => (
                            <Card key={report.id} variant="outline">
                              <CardBody>
                                <VStack align="stretch" spacing={3}>
                                  <HStack justify="space-between" align="start" wrap="wrap" gap={3}>
                                    <Box>
                                      <Text fontWeight="700" color="black">Relevé du {report.submittedAt ? new Date(report.submittedAt).toLocaleString('fr-FR') : '-'}</Text>
                                      <Text fontSize="sm" color="gray.600">RDV: {report.appointmentDate || '-'} à {report.appointmentTime || '-'}</Text>
                                    </Box>
                                    <Badge colorScheme="green">Reçu</Badge>
                                  </HStack>
                                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                                    <Box bg="gray.50" borderRadius="md" p={3}>
                                      <Text fontSize="xs" color="gray.500">Photos véhicule</Text>
                                      <Text fontWeight="600" color="black">
                                        {Object.values(report.vehiclePhotos || {}).reduce((total, files) => total + (files?.length || 0), 0)} / 4
                                      </Text>
                                    </Box>
                                    <Box bg="gray.50" borderRadius="md" p={3}>
                                      <Text fontSize="xs" color="gray.500">Photos intérieurs</Text>
                                      <Text fontWeight="600" color="black">{(report.interiorPhotos || []).length}</Text>
                                    </Box>
                                    <Box bg="gray.50" borderRadius="md" p={3}>
                                      <Text fontSize="xs" color="gray.500">Documents légaux</Text>
                                      <Text fontWeight="600" color="black">{(report.legalDocuments || []).length}</Text>
                                    </Box>
                                    <Box bg="gray.50" borderRadius="md" p={3}>
                                      <Text fontSize="xs" color="gray.500">Huile</Text>
                                      <Text fontWeight="600" color="black">{report.oil?.ok ? 'OK' : 'À vérifier'}</Text>
                                    </Box>
                                    <Box bg="gray.50" borderRadius="md" p={3}>
                                      <Text fontSize="xs" color="gray.500">LDR / fluides</Text>
                                      <Text fontWeight="600" color="black">{report.coolant?.ok ? 'OK' : 'À vérifier'}</Text>
                                    </Box>
                                    <Box bg="gray.50" borderRadius="md" p={3}>
                                      <Text fontSize="xs" color="gray.500">Niveau gasoil</Text>
                                      <Text fontWeight="600" color="black">{report.fuelLevel || '-'}</Text>
                                    </Box>
                                  </SimpleGrid>
                                  {report.anomalies && (
                                    <Box bg="orange.50" borderRadius="md" p={3}>
                                      <Text fontSize="xs" color="gray.500">Anomalies signalées</Text>
                                      <Text fontSize="sm" color="black">{report.anomalies}</Text>
                                    </Box>
                                  )}
                                </VStack>
                              </CardBody>
                            </Card>
                          ))}
                        </VStack>
                      )}

                      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                        {[
                          'Date de rdv / rapatriement',
                          'Heure',
                          'Photos du véhicule - 4 angles',
                          'Photos intérieurs - 1 minimum',
                          'Documents légaux signés - justificatif de cession',
                          'Niveau huile à photographier + case OK',
                          'Niveau LDR et autres fluides + case OK',
                          'Niveau gasoil',
                          'Anomalies à signaler'
                        ].map((item) => (
                          <Box key={item} bg="gray.50" borderRadius="md" p={3}>
                            <Text fontSize="sm" fontWeight="600" color="black">{item}</Text>
                          </Box>
                        ))}
                      </SimpleGrid>
                    </VStack>
                  </CardBody>
                </Card>
                )}
              </VStack>
              ) : (
              <>
              <Box
                bg="linear-gradient(135deg, #d30c4c 0%, #c10744 100%)"
                color="white"
                borderRadius="xl"
                p={{ base: 5, md: 8 }}
              >
                <VStack align="start" spacing={3}>
                  <HStack spacing={3}>
                    <Icon as={FiTruck} boxSize={8} />
                    <Heading size="lg">Nouveau dossier PARC</Heading>
                  </HStack>
                  <Text opacity={0.92}>
                    Dossier séparé du parc officiel jusqu'à validation complète.
                  </Text>
                </VStack>
              </Box>

              <HStack spacing={2} wrap="wrap">
                {[
                  { id: 'choice', label: 'Parcours' },
                  { id: 'project-start', label: 'Infos véhicule' },
                  { id: 'project-review', label: 'Pré-fiche projet' }
                ].map((step, index) => {
                  const stepOrder = ['choice', 'project-start', 'project-review'];
                  const activeIndex = stepOrder.indexOf(processParcStep);
                  const isActive = step.id === processParcStep;
                  const isDone = index < activeIndex;

                  return (
                    <HStack key={step.id} spacing={2}>
                      <Badge
                        colorScheme={isActive ? 'rbe' : isDone ? 'green' : 'gray'}
                        variant={isActive ? 'solid' : 'subtle'}
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        {index + 1}. {step.label}
                      </Badge>
                      {index < 2 && <Text color="gray.400">/</Text>}
                    </HStack>
                  );
                })}
              </HStack>

              {processParcStep === 'choice' ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Card
                  cursor="pointer"
                  borderWidth={2}
                  borderColor="rbe.500"
                  _hover={{ transform: 'translateY(-3px)', shadow: 'xl' }}
                  transition="all 0.2s"
                  onClick={() => setProcessParcStep('project-start')}
                >
                <CardBody>
                  <VStack align="start" spacing={4} h="full">
                    <HStack justify="space-between" w="full" align="start">
                      <Icon as={FiArchive} boxSize={9} color="rbe.500" />
                      <Badge colorScheme="rbe">Projet principal</Badge>
                    </HStack>
                    <Box>
                      <Heading size="md" color="black" mb={2}>Démarrer un projet de préservation</Heading>
                      <Text fontSize="sm" color="gray.600">
                        Ouvrir un projet en amont, avant décision d'intégration ou rattachement à un véhicule.
                      </Text>
                    </Box>
                    <Button mt="auto" w="full" colorScheme="rbe" rightIcon={<FiArrowRight />}>
                      Démarrer un projet
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

                <Card
                  cursor="pointer"
                  borderWidth={2}
                  borderColor="gray.200"
                  _hover={{ transform: 'translateY(-3px)', shadow: 'xl', borderColor: 'blue.400' }}
                  transition="all 0.2s"
                  onClick={() => toast({ status: 'info', title: 'Ajout véhicule PARC', description: 'Parcours à brancher.' })}
                >
                  <CardBody>
                    <VStack align="start" spacing={4} h="full">
                      <HStack justify="space-between" w="full" align="start">
                        <Icon as={FiTruck} boxSize={9} color="blue.500" />
                        <Badge colorScheme="blue">Intégration avancée</Badge>
                      </HStack>
                      <Box>
                        <Heading size="md" color="black" mb={2}>Ajouter un véhicule à préserver/intégrer dans le parc</Heading>
                        <Text fontSize="sm" color="gray.600">
                          Utilisable quand le véhicule est intégré ou proche de l'intégration.
                        </Text>
                      </Box>
                      <Button mt="auto" w="full" colorScheme="blue" variant="outline" rightIcon={<FiArrowRight />}>
                        Ajouter un véhicule
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>
              ) : processParcStep === 'project-start' ? (
              <VStack align="stretch" spacing={5}>
                <Box>
                  <Heading size="lg" color="black">Ajouter un Projet</Heading>
                  <Text color="gray.600" mt={1}>Les infos du véhicule.</Text>
                </Box>

                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Card
                    cursor="pointer"
                    borderWidth={2}
                    borderColor={processParcProjectSource === 'manual' ? 'rbe.500' : 'gray.200'}
                    _hover={{ transform: 'translateY(-3px)', shadow: 'xl' }}
                    transition="all 0.2s"
                    onClick={() => setProcessParcProjectSource('manual')}
                  >
                    <CardBody>
                      <VStack align="start" spacing={4} h="full">
                        <HStack justify="space-between" w="full" align="start">
                          <Icon as={FiEdit} boxSize={9} color="rbe.500" />
                          <Badge colorScheme="rbe">Manuel</Badge>
                        </HStack>
                        <Box>
                          <Heading size="md" color="black" mb={2}>Saisie manuelle</Heading>
                          <Text fontSize="sm" color="gray.600">
                            Renseigner directement les informations connues du véhicule.
                          </Text>
                        </Box>
                        <Button mt="auto" w="full" colorScheme="rbe" rightIcon={<FiArrowRight />}>
                          Saisir les infos
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card
                    borderWidth={2}
                    borderColor={processParcProjectSource === 'tc-infos' ? 'blue.400' : 'gray.200'}
                    _hover={{ transform: 'translateY(-3px)', shadow: 'xl', borderColor: 'blue.400' }}
                    transition="all 0.2s"
                  >
                    <CardBody>
                      <VStack align="start" spacing={4} h="full">
                        <HStack justify="space-between" w="full" align="start">
                          <Icon as={FiSearch} boxSize={9} color="blue.500" />
                          <Badge colorScheme="blue">TC Infos</Badge>
                        </HStack>
                        <Box>
                          <Heading size="md" color="black" mb={2}>Matchmaking TC Infos</Heading>
                          <Text fontSize="sm" color="gray.600">
                            Insérer directement le lien du véhicule projet TC Infos.
                          </Text>
                        </Box>
                        <Box w="full" mt="auto">
                          <FormLabel fontSize="sm">Lien du véhicule projet</FormLabel>
                          <Input
                            type="url"
                            value={processParcTcInfosUrl}
                            onChange={(event) => {
                              setProcessParcTcInfosUrl(event.target.value);
                              setProcessParcTcInfosResult(null);
                              if (processParcProjectSource === 'tc-infos') setProcessParcProjectSource('');
                            }}
                            placeholder="https://..."
                          />
                        </Box>
                        <Button
                          w="full"
                          colorScheme="blue"
                          variant="outline"
                          rightIcon={<FiArrowRight />}
                          isDisabled={!processParcTcInfosUrl.trim()}
                          isLoading={processParcTcInfosLoading}
                          loadingText="Lecture..."
                          onClick={identifyTcInfosVehicle}
                        >
                          Utiliser ce lien
                        </Button>

                        {processParcTcInfosResult?.vehicle && (
                          <Box w="full" borderWidth="1px" borderRadius="md" borderColor="blue.100" bg="blue.50" p={3}>
                            <VStack align="stretch" spacing={3}>
                              <HStack justify="space-between" align="start">
                                <Box>
                                  <Text fontWeight="700" color="black">{processParcTcInfosResult.title || 'Véhicule TC Infos'}</Text>
                                  <Text fontSize="xs" color="gray.600">ID TC Infos: {processParcTcInfosResult.tcInfosId}</Text>
                                </Box>
                                <Badge colorScheme="green">{processParcTcInfosResult.detectedFields} champs</Badge>
                              </HStack>
                              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2}>
                                {[
                                  ['Numéro', processParcTcInfosResult.vehicle.fleetNumber],
                                  ['Constructeur', processParcTcInfosResult.vehicle.manufacturer],
                                  ['Modèle', processParcTcInfosResult.vehicle.model],
                                  ['Immatriculation', processParcTcInfosResult.vehicle.registration],
                                  ['Mise en circulation', processParcTcInfosResult.vehicle.firstRegistration],
                                  ['N° série', processParcTcInfosResult.vehicle.vin],
                                  ['Énergie', processParcTcInfosResult.vehicle.energy],
                                  ['Statut', processParcTcInfosResult.vehicle.status]
                                ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
                                  <Box key={label} bg="white" borderRadius="md" p={2}>
                                    <Text fontSize="xs" color="gray.500">{label}</Text>
                                    <Text fontSize="sm" fontWeight="600" color="black">{value}</Text>
                                  </Box>
                                ))}
                              </SimpleGrid>
                            </VStack>
                          </Box>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </VStack>
              ) : (
              <VStack align="stretch" spacing={5}>
                <Box>
                  <Heading size="lg" color="black">Récap' pré-projet</Heading>
                  <Text color="gray.600" mt={1}>Résumé des informations saisies via TC Infos avec suggestions de modifications.</Text>
                </Box>

                {processParcCreatedProject && (
                  <Alert status="success" borderRadius="md">
                    <AlertIcon />
                    <HStack justify="space-between" w="full" wrap="wrap" gap={3}>
                      <Box>
                        <Text fontWeight="700">Projet de préservation créé</Text>
                        <Text fontSize="sm">{processParcCreatedProject.name}</Text>
                      </Box>
                      <Button
                        size="sm"
                        colorScheme="green"
                        variant="outline"
                        onClick={() => openProcessParcProject(processParcCreatedProject)}
                      >
                        Ouvrir le projet
                      </Button>
                    </HStack>
                  </Alert>
                )}

                <Card variant="outline">
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <HStack justify="space-between" align="start" wrap="wrap" gap={3}>
                        <Box>
                          <Heading size="md">Info interne</Heading>
                          <Text fontSize="sm" color="gray.600">À ajuster avant création du dossier PARC.</Text>
                        </Box>
                        <Badge colorScheme={processParcProjectSource === 'tc-infos' ? 'blue' : 'rbe'}>
                          {processParcProjectSource === 'tc-infos' ? 'TC Infos' : 'Manuel'}
                        </Badge>
                      </HStack>

                      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                        <Box>
                          <FormLabel>1 : Nom du projet interne</FormLabel>
                          <Input
                            value={processParcInternalProjectName}
                            onChange={(event) => setProcessParcInternalProjectName(event.target.value)}
                            placeholder="Ex. Préservation Heuliez GX 317 R5"
                          />
                        </Box>
                        <Box>
                          <FormLabel>2 : Numéro de parc interne</FormLabel>
                          <Input
                            value={processParcInternalFleetNumber}
                            onChange={(event) => setProcessParcInternalFleetNumber(event.target.value)}
                            placeholder="Ex. R5"
                          />
                        </Box>
                      </SimpleGrid>
                    </VStack>
                  </CardBody>
                </Card>

                {processParcTcInfosResult?.vehicle && (
                  <Card variant="outline">
                    <CardBody>
                      <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between" align="start" wrap="wrap" gap={3}>
                          <Box>
                            <Heading size="md">Informations TC Infos</Heading>
                            <Text fontSize="sm" color="gray.600">{processParcTcInfosResult.title}</Text>
                          </Box>
                          <Badge colorScheme="green">{processParcTcInfosResult.detectedFields} champs détectés</Badge>
                        </HStack>

                        <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                          {[
                            ['Numéro TC Infos', processParcTcInfosResult.vehicle.fleetNumber],
                            ['Constructeur', processParcTcInfosResult.vehicle.manufacturer],
                            ['Modèle', processParcTcInfosResult.vehicle.model],
                            ['Immatriculation', processParcTcInfosResult.vehicle.registration],
                            ['Mise en circulation', processParcTcInfosResult.vehicle.firstRegistration],
                            ['N° série', processParcTcInfosResult.vehicle.vin],
                            ['Énergie', processParcTcInfosResult.vehicle.energy],
                            ['Norme Euro', processParcTcInfosResult.vehicle.euroNorm],
                            ['Statut', processParcTcInfosResult.vehicle.status],
                            ['Moteur', processParcTcInfosResult.vehicle.engine],
                            ['Boîte', processParcTcInfosResult.vehicle.gearbox],
                            ['Portes', processParcTcInfosResult.vehicle.doors]
                          ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
                            <Box key={label} bg="gray.50" borderRadius="md" p={3}>
                              <Text fontSize="xs" color="gray.500">{label}</Text>
                              <Text fontSize="sm" fontWeight="600" color="black">{value}</Text>
                            </Box>
                          ))}
                        </SimpleGrid>
                      </VStack>
                    </CardBody>
                  </Card>
                )}
              </VStack>
              )}
              </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack w="full" justify="space-between">
              {processParcStep !== 'choice' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (processParcStep === 'project-detail') {
                      if (processParcProjectDetailStep === 'documents') {
                        setProcessParcProjectDetailStep('recap');
                        return;
                      }
                      if (processParcProjectDetailStep === 'repatriement') {
                        setProcessParcProjectDetailStep('documents');
                        return;
                      }
                      setProcessParcStep('choice');
                      setProcessParcOpenedProject(null);
                      return;
                    }
                    setProcessParcStep(processParcStep === 'project-review' ? 'project-start' : 'choice');
                  }}
                >
                  Retour
                </Button>
              ) : <Box />}
              <HStack>
                {processParcCanGoNext && (
                  <Button
                    colorScheme="rbe"
                    rightIcon={<FiArrowRight />}
                    onClick={() => setProcessParcStep('project-review')}
                  >
                    Étape suivante
                  </Button>
                )}
                {processParcCanCreateProject && (
                  <Button colorScheme="green" onClick={createProcessParcProject}>
                    Créer le projet de préservation
                  </Button>
                )}
                {processParcStep === 'project-detail' && processParcProjectDetailStep === 'recap' && (
                  <Button colorScheme="rbe" rightIcon={<FiArrowRight />} onClick={() => setProcessParcProjectDetailStep('documents')}>
                    Suivant
                  </Button>
                )}
                {processParcStep === 'project-detail' && processParcProjectDetailStep === 'documents' && (
                  <Button colorScheme="rbe" rightIcon={<FiArrowRight />} onClick={() => setProcessParcProjectDetailStep('repatriement')}>
                    Suivant
                  </Button>
                )}
                <Button variant="ghost" onClick={resetProcessParcModal}>Fermer</Button>
              </HStack>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={processParcReminderOpen} onClose={() => setProcessParcReminderOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ajouter une relance</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <FormLabel>Nombre de relance</FormLabel>
                <Input
                  value={processParcReminderForm.rank}
                  onChange={(event) => setProcessParcReminderForm((prev) => ({ ...prev, rank: event.target.value }))}
                  placeholder="Ex. 1ère relance, seconde relance"
                />
              </Box>
              <Box>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={processParcReminderForm.date}
                  onChange={(event) => setProcessParcReminderForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              </Box>
              <Box>
                <FormLabel>Numéro ou mail relancé</FormLabel>
                <Input
                  value={processParcReminderForm.contact}
                  onChange={(event) => setProcessParcReminderForm((prev) => ({ ...prev, contact: event.target.value }))}
                  placeholder="Téléphone ou adresse mail"
                />
              </Box>
              <Box>
                <FormLabel>Identité relancée</FormLabel>
                <Input
                  value={processParcReminderForm.identity}
                  onChange={(event) => setProcessParcReminderForm((prev) => ({ ...prev, identity: event.target.value }))}
                  placeholder="Nom, organisme ou contact"
                />
              </Box>
              <Box>
                <FormLabel>Documents à joindre</FormLabel>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => {
                    const additions = Array.from(event.target.files || []).map((file) => ({
                      id: `relance-doc-${Date.now()}-${file.name}`,
                      name: file.name,
                      size: file.size,
                      type: file.type || 'application/octet-stream'
                    }));
                    setProcessParcReminderForm((prev) => ({ ...prev, documents: [...prev.documents, ...additions] }));
                    event.target.value = '';
                  }}
                />
                {processParcReminderForm.documents.length > 0 && (
                  <VStack align="stretch" spacing={1} mt={2}>
                    {processParcReminderForm.documents.map((file) => (
                      <Text key={file.id} fontSize="sm" color="gray.600">{file.name}</Text>
                    ))}
                  </VStack>
                )}
              </Box>
              <Box>
                <FormLabel>Captures de mail</FormLabel>
                <Input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(event) => {
                    const additions = Array.from(event.target.files || []).map((file) => ({
                      id: `relance-mail-${Date.now()}-${file.name}`,
                      name: file.name,
                      size: file.size,
                      type: file.type || 'application/octet-stream'
                    }));
                    setProcessParcReminderForm((prev) => ({ ...prev, mailCaptures: [...prev.mailCaptures, ...additions] }));
                    event.target.value = '';
                  }}
                />
                {processParcReminderForm.mailCaptures.length > 0 && (
                  <VStack align="stretch" spacing={1} mt={2}>
                    {processParcReminderForm.mailCaptures.map((file) => (
                      <Text key={file.id} fontSize="sm" color="gray.600">{file.name}</Text>
                    ))}
                  </VStack>
                )}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setProcessParcReminderOpen(false)}>Annuler</Button>
            <Button
              colorScheme="rbe"
              onClick={addProcessParcReminder}
              isDisabled={!processParcReminderForm.rank.trim() || !processParcReminderForm.date || !processParcReminderForm.contact.trim() || !processParcReminderForm.identity.trim()}
            >
              Ajouter la relance
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal édition technique véhicule */}
      <Modal isOpen={editTechOpen} onClose={() => setEditTechOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Informations techniques : {editTechVehicle?.parc}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormLabel>Niveau actuel du gasoil (%)</FormLabel>
              <Box>
                <Box position="relative" h="60px" mb={6}>
                  <Box position="absolute" top="20px" left="0" right="0" h="2px" bg="gray.300" />
                  {[0, 50, 100].map((val) => (
                    <Box
                      key={val}
                      position="absolute"
                      left={`${val}%`}
                      top="12px"
                      transform="translateX(-50%)"
                      textAlign="center"
                    >
                      <Box w="3px" h="16px" bg="gray.800" mx="auto" mb={1} />
                      <Text fontSize="xs" fontWeight="bold">{val}%</Text>
                    </Box>
                  ))}
                  {Array.from({ length: 99 }).map((_, i) => {
                    const val = i + 1;
                    const isBig = val === 50;
                    if (isBig) return null;
                    return (
                      <Box
                        key={`small-${val}`}
                        position="absolute"
                        left={`${val}%`}
                        top="16px"
                        transform="translateX(-50%)"
                        w="1px"
                        h="8px"
                        bg="gray.400"
                      />
                    );
                  })}
                  <Box
                    position="absolute"
                    left={`${editTechGasoil}%`}
                    top="0"
                    transform="translateX(-50%)"
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">{editTechGasoil}%</Text>
                    <Box w="2px" h="20px" bg="blue.600" mt={1} />
                  </Box>
                </Box>

                <Slider value={editTechGasoil} onChange={setEditTechGasoil} min={0} max={100} step={1}>
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </Box>

              <Divider />
              <CaracteristiquesEditor value={editTechCaracs} onChange={setEditTechCaracs} />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setEditTechOpen(false)}>Annuler</Button>
            <Button
              colorScheme="blue"
              isLoading={editTechSaving}
              onClick={async () => {
                try {
                  setEditTechSaving(true);
                  const nextCaracs = Array.isArray(editTechCaracs) ? [...editTechCaracs] : [];
                  
                  // ✅ Envoyer le fuel comme champ séparé (nouveau model)
                  await apiClient.put(`/vehicles/${encodeURIComponent(editTechVehicle.parc)}`, {
                    fuel: Number(editTechGasoil),  // Nouveau champ fuel
                    caracteristiques: nextCaracs    // Autres caractéristiques
                  });

                  setVehicles(prev => prev.map(v => {
                    const parcKey = v.parc || v.id || v.slug;
                    if (parcKey === editTechVehicle.parc) {
                      return { ...v, fuel: Number(editTechGasoil), caracteristiques: nextCaracs };
                    }
                    return v;
                  }));

                  toast({ status: 'success', title: 'Carburant et caractéristiques mis à jour' });
                  setEditTechSaving(false);
                  setEditTechOpen(false);
                } catch (e) {
                  toast({ status: 'error', title: 'Erreur lors de la mise à jour', description: e.message });
                  setEditTechSaving(false);
                }
              }}
            >
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
