import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box, Heading, Text, SimpleGrid, Stat, StatLabel, StatNumber, Card, CardBody,
  Tabs, TabList, TabPanels, Tab, TabPanel, useToast, Spinner, HStack, VStack,
  Badge, Tag, TagLabel, TagLeftIcon, Button, Divider, Table, Thead, Tbody, Tr, Th, Td,
  Icon, Alert, AlertIcon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Slider, SliderTrack, SliderFilledTrack, SliderThumb, FormLabel,
  AlertTitle, AlertDescription, CloseButton
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { FiClock, FiAlertTriangle, FiTool, FiFileText, FiInfo, FiEdit, FiSliders, FiRefreshCw } from "react-icons/fi";
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
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusByParc, setStatusByParc] = useState({});
  const [usagesData, setUsagesData] = useState({});
  const [loadingUsages, setLoadingUsages] = useState(false);
  
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
    if (!vehicles || vehicles.length === 0) return null;
    return (
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4} mt={4}>
        {vehicles.map((v) => {
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
                  <HStack w="full" spacing={2}>
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
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          );
        })}
      </SimpleGrid>
    );
  }, [vehicles, navigate, statusByParc, criticalAlerts]);

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
