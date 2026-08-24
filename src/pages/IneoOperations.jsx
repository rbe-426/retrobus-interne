import React, { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Flex, FormControl, FormLabel, Grid, Heading, HStack,
  Icon, Input, Select, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr,
  VStack, useToast
} from '@chakra-ui/react';
import {
  FiActivity, FiChevronDown, FiClock, FiEdit2, FiHash, FiMap, FiMapPin,
  FiPlus, FiRefreshCw, FiSmartphone, FiTrash2, FiTruck, FiUser, FiX
} from 'react-icons/fi';
import { Navigate } from 'react-router-dom';
import { apiClient } from '../api/config';
import { ineoAPI } from '../api/ineo';
import { useUser } from '../context/UserContext';
import IneoFreeTracking from './IneoFreeTracking';
import IneoVehicleProfiles from './IneoVehicleProfiles';
import IneoTransport from './IneoTransport';

const statusColor = { PLANNED: 'orange', ACTIVE: 'green', COMPLETED: 'gray', CANCELLED: 'red' };
const statusLabel = { PLANNED: 'Planifiee', ACTIVE: 'En service', COMPLETED: 'Terminee', CANCELLED: 'Annulee' };
const blankForm = { serviceName: '', serviceReference: '', courseReference: '', vehicleParc: '', driverIdentifier: '', driverName: '', scheduledDeparture: '', scheduledArrival: '' };
const formatDate = (value) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

function TreeItem({ active, icon, label, onClick }) {
  return <Button variant="unstyled" display="flex" alignItems="center" gap={2} w="full" h="28px" px={2} borderRadius="2px" textAlign="left" fontSize="sm" fontWeight={active ? '700' : '400'} bg={active ? '#cfe8ff' : 'transparent'} _hover={{ bg: active ? '#cfe8ff' : '#e8f1f8' }} onClick={onClick}><Icon as={icon} boxSize={4} color={active ? '#005a9e' : '#44525d'} /><Text noOfLines={1}>{label}</Text></Button>;
}

function SectionHeader({ title, detail }) {
  return <Box borderBottom="1px solid" borderColor="#b7c4cd" pb={3} mb={5}><Heading fontSize="20px" fontWeight="700" color="#17364d">{title}</Heading><Text color="#60727e" mt={1}>{detail}</Text></Box>;
}

function MissionTable({ loading, missions, members = [], onChangeDriver, onEdit, onRemove, compact = false }) {
  if (loading) return <Flex justify="center" py={14}><Spinner color="#005a9e" /></Flex>;
  if (!missions.length) return <Box px={4} py={8} color="gray.500">Aucun service n'est enregistre.</Box>;

  return <Box overflowX="auto" border="1px solid" borderColor="#c6d0d8"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Etat</Th><Th>Service</Th><Th>Code service</Th><Th>Code course</Th><Th>Vehicule</Th>{!compact && <><Th>Conducteur</Th><Th>Depart prevu</Th><Th>Arrivee prevue</Th><Th>Actions</Th></>}{compact && <Th>Position</Th>}</Tr></Thead><Tbody>{missions.map((mission) => {
      const latitude = mission.lastLatitude ?? mission.latestPosition?.latitude;
      const longitude = mission.lastLongitude ?? mission.latestPosition?.longitude;
      const editable = mission.status === 'PLANNED' || mission.status === 'ACTIVE';
      return <Tr key={mission.id} _hover={{ bg: '#f3f8fb' }}><Td><Badge colorScheme={statusColor[mission.status]} borderRadius="2px">{statusLabel[mission.status]}</Badge></Td><Td fontWeight="600">{mission.serviceName}</Td><Td fontFamily="monospace">{mission.serviceReference || '-'}</Td><Td fontFamily="monospace">{mission.courseReference || '-'}</Td><Td>{mission.vehicle?.parc || mission.vehicleParc}</Td>{!compact && <><Td>{mission.status === 'PLANNED' ? <Select size="sm" minW="180px" value={mission.driverIdentifier || ''} onChange={(event) => onChangeDriver?.(mission, event.target.value)}>{members.map((member) => { const identifier = member.matricule || member.email; return identifier ? <option key={member.id || identifier} value={identifier}>{member.firstName} {member.lastName} - {identifier}</option> : null; })}</Select> : mission.driverName || mission.driverIdentifier}</Td><Td whiteSpace="nowrap">{formatDate(mission.scheduledDeparture)}</Td><Td whiteSpace="nowrap">{formatDate(mission.scheduledArrival)}</Td><Td><HStack spacing={1}>{editable && <Button size="xs" leftIcon={<FiEdit2 />} onClick={() => onEdit?.(mission)}>Modifier</Button>}{editable && <Button size="xs" colorScheme={mission.status === 'ACTIVE' ? 'orange' : 'red'} variant="outline" leftIcon={<FiTrash2 />} onClick={() => onRemove?.(mission)}>{mission.status === 'ACTIVE' ? 'Annuler' : 'Supprimer'}</Button>}</HStack></Td></>}{compact && <Td>{latitude == null ? '-' : <Button as="a" size="xs" variant="link" color="#005a9e" leftIcon={<FiMapPin />} href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`} target="_blank" rel="noreferrer">Voir</Button>}</Td>}</Tr>;
  })}</Tbody></Table></Box>;
}

const isIneoOperator = ({ matricule, user }) => {
  const identities = [matricule, user?.username, user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
  return identities.includes('w.belaidi') || identities.includes('belaidiw91@gmail.com');
};

export default function IneoOperations() {
  const userContext = useUser();
  if (!isIneoOperator(userContext)) return <Navigate to="/dashboard/home" replace />;
  return <IneoOperationsWorkstation />;
}

function IneoOperationsWorkstation() {
  const toast = useToast();
  const [missions, setMissions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState('planning');
  const [form, setForm] = useState(blankForm);
  const [editingMission, setEditingMission] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [missionData, vehicleData, memberData] = await Promise.all([ineoAPI.listMissions(), apiClient.get('/vehicles'), apiClient.get('/members?limit=500')]);
      setMissions(missionData?.missions || []);
      setVehicles(vehicleData?.vehicles || vehicleData || []);
      setMembers(memberData?.members || memberData || []);
    } catch (error) {
      toast({ status: 'error', title: 'Ineo indisponible', description: error.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const selectDriver = (identifier) => {
    const member = members.find((item) => (item.matricule || item.email) === identifier);
    setForm((current) => ({ ...current, driverIdentifier: identifier, driverName: member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : '' }));
  };
  const toLocalDateTime = (value) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  const resetForm = () => {
    setForm(blankForm);
    setEditingMission(null);
  };
  const editMission = (mission) => {
    setEditingMission(mission);
    setForm({
      serviceName: mission.serviceName || '', serviceReference: mission.serviceReference || '', courseReference: mission.courseReference || '',
      vehicleParc: mission.vehicleParc || '', driverIdentifier: mission.driverIdentifier || '', driverName: mission.driverName || '',
      scheduledDeparture: toLocalDateTime(mission.scheduledDeparture), scheduledArrival: toLocalDateTime(mission.scheduledArrival),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const create = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, scheduledDeparture: form.scheduledDeparture ? new Date(form.scheduledDeparture).toISOString() : null, scheduledArrival: form.scheduledArrival ? new Date(form.scheduledArrival).toISOString() : null };
      if (editingMission) await ineoAPI.updateMission(editingMission.id, payload);
      else await ineoAPI.createMission(payload);
      resetForm();
      toast({ status: 'success', title: editingMission ? 'Service modifié' : 'Service créé et affecté' });
      load();
    } catch (error) { toast({ status: 'error', title: 'Affectation impossible', description: error.message }); } finally { setSaving(false); }
  };

  const changeMissionDriver = async (mission, driverIdentifier) => {
    const member = members.find((item) => (item.matricule || item.email) === driverIdentifier);
    if (!member) return;
    try {
      const driverName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
      const data = await ineoAPI.updateMissionDriver(mission.id, { driverIdentifier, driverName });
      setMissions((current) => current.map((item) => item.id === data.mission.id ? data.mission : item));
      toast({ status: 'success', title: 'Conducteur modifié', description: driverName || driverIdentifier });
    } catch (error) {
      toast({ status: 'error', title: 'Modification impossible', description: error.message });
    }
  };

  const removeMission = async (mission) => {
    const message = mission.status === 'ACTIVE'
      ? `Annuler le service « ${mission.serviceName} » ? Les positions déjà enregistrées seront conservées.`
      : `Supprimer définitivement le service « ${mission.serviceName} » ?`;
    if (!window.confirm(message)) return;
    try {
      setSaving(true);
      await ineoAPI.removeMission(mission.id);
      if (editingMission?.id === mission.id) resetForm();
      toast({ status: 'success', title: mission.status === 'ACTIVE' ? 'Service annulé' : 'Service supprimé' });
      load();
    } catch (error) {
      toast({ status: 'error', title: 'Opération impossible', description: error.message });
    } finally { setSaving(false); }
  };

  const assignment = <Box as="form" onSubmit={create} border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={5}><HStack justify="space-between" mb={4} flexWrap="wrap"><Box><Heading fontSize="16px">{editingMission ? 'Modifier le service' : 'Nouveau service et affectation'}</Heading><Text fontSize="sm" color="#60727e">{editingMission?.status === 'ACTIVE' ? 'Le changement est appliqué au service en cours.' : 'Configurez la course puis affectez le véhicule et le conducteur.'}</Text></Box>{editingMission && <Button size="sm" variant="ghost" leftIcon={<FiX />} onClick={resetForm}>Annuler la modification</Button>}</HStack><Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}><FormControl isRequired><FormLabel>Libellé du service</FormLabel><Input bg="white" value={form.serviceName} onChange={(event) => update('serviceName', event.target.value)} placeholder="Ex. Navette patrimoine" /></FormControl><FormControl isRequired><FormLabel>Code service</FormLabel><Input bg="white" value={form.serviceReference} onChange={(event) => update('serviceReference', event.target.value.toUpperCase())} placeholder="RBE-999-999" pattern="RBE-\d{3}-\d{3}" /></FormControl><FormControl isRequired><FormLabel>Code course</FormLabel><Input bg="white" value={form.courseReference} onChange={(event) => update('courseReference', event.target.value.toUpperCase())} placeholder="999-26726-920" pattern="\d{3}-\d{5}-\d{3,4}" /></FormControl><FormControl isRequired><FormLabel>Véhicule</FormLabel><Select bg="white" value={form.vehicleParc} onChange={(event) => update('vehicleParc', event.target.value)} placeholder="Choisir un véhicule">{vehicles.map((vehicle) => <option key={vehicle.parc} value={vehicle.parc}>{vehicle.parc} - {vehicle.immat || vehicle.modele}</option>)}</Select></FormControl><FormControl isRequired><FormLabel>Conducteur</FormLabel><Select bg="white" value={form.driverIdentifier} onChange={(event) => selectDriver(event.target.value)} placeholder="Choisir un conducteur">{members.map((member) => { const identifier = member.matricule || member.email; return identifier && <option key={member.id || identifier} value={identifier}>{member.firstName} {member.lastName} - {identifier}</option>; })}</Select></FormControl><FormControl><FormLabel>Départ prévu</FormLabel><Input bg="white" type="datetime-local" value={form.scheduledDeparture} onChange={(event) => update('scheduledDeparture', event.target.value)} /></FormControl><FormControl><FormLabel>Arrivée prévue</FormLabel><Input bg="white" type="datetime-local" value={form.scheduledArrival} onChange={(event) => update('scheduledArrival', event.target.value)} /></FormControl></Grid><Text mt={4} fontSize="sm" color="#60727e">Formats requis : <b>Code service</b> `RBE-999-999` · <b>Code course</b> `999-26726-920`. Les deux références doivent être liées dans le référentiel.</Text><HStack justify="flex-end" mt={5}><Button type="submit" isLoading={saving} colorScheme="blue" borderRadius="2px" leftIcon={editingMission ? <FiEdit2 /> : <FiPlus />}>{editingMission ? 'Enregistrer les modifications' : 'Créer le service'}</Button></HStack></Box>;
  const planning = <VStack align="stretch" spacing={5}><SectionHeader title="Services et affectations" detail={`${missions.length} service${missions.length > 1 ? 's' : ''} enregistré${missions.length > 1 ? 's' : ''}. Créez, modifiez, réattribuez ou retirez un service depuis cette vue.`} />{assignment}<Box><Text fontWeight="700" mb={3}>Services enregistrés</Text><MissionTable missions={missions} members={members} loading={loading} onChangeDriver={changeMissionDriver} onEdit={editMission} onRemove={removeMission} /></Box></VStack>;
  const content = section === 'planning' ? planning : section === 'map' ? <><SectionHeader title="Carte de transport" detail="Suivi des vehicules actuellement en exploitation" /><Box border="1px solid" borderColor="#c6d0d8" bg="#f4f7f8" p={4} mb={4} fontSize="sm">Les positions recues depuis les terminaux conducteur sont listees ci-dessous. Le lien Voir ouvre la position dans la carte.</Box><MissionTable missions={missions.filter((mission) => mission.status === 'ACTIVE' || mission.lastLatitude != null || mission.latestPosition)} loading={loading} compact /></> : section === 'vehicles' ? <><SectionHeader title="Parc materiel" detail={`${vehicles.length} vehicule${vehicles.length > 1 ? 's' : ''} disponible${vehicles.length > 1 ? 's' : ''}`} /><Box overflowX="auto" border="1px solid" borderColor="#c6d0d8"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Parc</Th><Th>Immatriculation</Th><Th>Modele</Th><Th>Services affectes</Th></Tr></Thead><Tbody>{vehicles.map((vehicle) => <Tr key={vehicle.parc}><Td fontWeight="600">{vehicle.parc}</Td><Td>{vehicle.immat || '-'}</Td><Td>{vehicle.modele || '-'}</Td><Td>{missions.filter((mission) => mission.vehicleParc === vehicle.parc && mission.status !== 'COMPLETED').length}</Td></Tr>)}</Tbody></Table></Box></> : <><SectionHeader title="Conducteurs" detail={`${members.length} membre${members.length > 1 ? 's' : ''} charge${members.length > 1 ? 's' : ''}`} /><Box overflowX="auto" border="1px solid" borderColor="#c6d0d8"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Nom</Th><Th>Identifiant</Th><Th>Service actif</Th></Tr></Thead><Tbody>{members.map((member) => { const identifier = member.matricule || member.email; const currentMission = missions.find((mission) => mission.driverIdentifier === identifier && mission.status === 'ACTIVE'); return <Tr key={member.id || identifier}><Td fontWeight="600">{member.firstName} {member.lastName}</Td><Td>{identifier || '-'}</Td><Td>{currentMission ? currentMission.serviceName : '-'}</Td></Tr>; })}</Tbody></Table></Box></>;

  const activeContent = section === 'vehicle-profiles'
    ? <IneoVehicleProfiles vehicles={vehicles} />
    : section === 'live-tracking'
      ? <IneoTransport key="live-tracking" vehicles={vehicles} initialTab="positions" showTabSelector={false} />
      : section === 'references'
        ? <IneoTransport key="references" vehicles={vehicles} initialTab="routes" showTabSelector={false} />
        : section === 'free-tracking'
          ? <IneoFreeTracking />
          : content;

  return <Box minH="100vh" w="100vw" bg="white" color="#18232c" fontFamily="Tahoma, 'Segoe UI', sans-serif" fontSize="14px"><Flex minH="54px" px={3} align="center" bg="#005a9e" color="white" borderBottom="3px solid #d7194b"><Box as="img" src="/Logo RBE.png" alt="RetroBus Essonne" h="34px" maxW="104px" objectFit="contain" objectPosition="left center" mr={3} /><Box flex="1"><Heading fontSize="17px" fontWeight="700">Ineo RetroBus</Heading><Text fontSize="11px" opacity="0.88">Poste de régulation et d'exploitation</Text></Box><Button size="sm" borderRadius="2px" variant="outline" color="white" borderColor="whiteAlpha.700" leftIcon={<FiRefreshCw />} isLoading={loading} onClick={load} _hover={{ bg: 'whiteAlpha.200' }}>Actualiser</Button></Flex><Flex minH="calc(100vh - 54px)" direction={{ base: 'column', md: 'row' }}><Box w={{ base: 'full', md: '270px' }} flexShrink={0} bg="#f3f6f8" borderRight={{ md: '1px solid #b8c4cc' }} borderBottom={{ base: '1px solid #b8c4cc', md: 0 }} p={2}><Text px={2} py={1} color="#4c5d69" fontSize="xs" fontWeight="700" textTransform="uppercase">Arborescence d'exploitation</Text><VStack align="stretch" spacing={0} mt={1}><TreeItem icon={FiChevronDown} label="Exploitation" /><Box pl={4} borderLeft="1px solid" borderColor="#a9b8c3" ml={3}><TreeItem active={section === 'planning'} icon={FiClock} label="Services et affectations" onClick={() => setSection('planning')} /><TreeItem active={section === 'live-tracking'} icon={FiMap} label="Suivi temps réel" onClick={() => setSection('live-tracking')} /><TreeItem active={section === 'free-tracking'} icon={FiActivity} label="Traçage libre" onClick={() => setSection('free-tracking')} /></Box><TreeItem icon={FiChevronDown} label="Référentiel" /><Box pl={4} borderLeft="1px solid" borderColor="#a9b8c3" ml={3}><TreeItem active={section === 'references'} icon={FiHash} label="Codes service & code course" onClick={() => setSection('references')} /></Box><TreeItem icon={FiChevronDown} label="Ressources" /><Box pl={4} borderLeft="1px solid" borderColor="#a9b8c3" ml={3}><TreeItem active={section === 'vehicle-profiles'} icon={FiTruck} label="Profils véhicules" onClick={() => setSection('vehicle-profiles')} /><TreeItem active={section === 'drivers'} icon={FiUser} label="Conducteurs" onClick={() => setSection('drivers')} /><TreeItem active={section === 'live-tracking'} icon={FiSmartphone} label="Appareils Urbex" onClick={() => setSection('live-tracking')} /></Box></VStack><Box mt={6} px={2} pt={3} borderTop="1px solid" borderColor="#ccd6dd"><Text fontSize="xs" color="#61727e">RBE - Inéo local</Text><Text fontSize="xs" color="#61727e">Connexion opérationnelle</Text></Box></Box><Box flex="1" minW={0} p={{ base: 4, md: 6 }} bg="white">{activeContent}</Box></Flex></Box>;
}