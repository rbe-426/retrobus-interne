import React, { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Flex, FormControl, FormLabel, Grid, Heading, HStack,
  Icon, Input, Select, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr,
  VStack, useToast
} from '@chakra-ui/react';
import {
  FiChevronDown, FiClock, FiMap, FiMapPin, FiPlus, FiRefreshCw, FiTruck,
  FiUser
} from 'react-icons/fi';
import { Navigate } from 'react-router-dom';
import { apiClient } from '../api/config';
import { ineoAPI } from '../api/ineo';
import { useUser } from '../context/UserContext';
import IneoVehicleProfiles from './IneoVehicleProfiles';
import IneoTransport from './IneoTransport';

const statusColor = { PLANNED: 'orange', ACTIVE: 'green', COMPLETED: 'gray', CANCELLED: 'red' };
const statusLabel = { PLANNED: 'Planifiee', ACTIVE: 'En service', COMPLETED: 'Terminee', CANCELLED: 'Annulee' };
const blankForm = { serviceName: '', serviceReference: '', vehicleParc: '', driverIdentifier: '', driverName: '', scheduledDeparture: '', scheduledArrival: '' };
const formatDate = (value) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

function TreeItem({ active, icon, label, onClick }) {
  return <Button variant="unstyled" display="flex" alignItems="center" gap={2} w="full" h="28px" px={2} borderRadius="2px" textAlign="left" fontSize="sm" fontWeight={active ? '700' : '400'} bg={active ? '#cfe8ff' : 'transparent'} _hover={{ bg: active ? '#cfe8ff' : '#e8f1f8' }} onClick={onClick}><Icon as={icon} boxSize={4} color={active ? '#005a9e' : '#44525d'} /><Text noOfLines={1}>{label}</Text></Button>;
}

function SectionHeader({ title, detail }) {
  return <Box borderBottom="1px solid" borderColor="#b7c4cd" pb={3} mb={5}><Heading fontSize="20px" fontWeight="700" color="#17364d">{title}</Heading><Text color="#60727e" mt={1}>{detail}</Text></Box>;
}

function MissionTable({ loading, missions, members = [], onChangeDriver, compact = false }) {
  if (loading) return <Flex justify="center" py={14}><Spinner color="#005a9e" /></Flex>;
  if (!missions.length) return <Box px={4} py={8} color="gray.500">Aucun service n'est enregistre.</Box>;

  return <Box overflowX="auto" border="1px solid" borderColor="#c6d0d8"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Etat</Th><Th>Service</Th><Th>Reference</Th><Th>Vehicule</Th>{!compact && <><Th>Conducteur</Th><Th>Depart prevu</Th><Th>Arrivee prevue</Th></>}{compact && <Th>Position</Th>}</Tr></Thead><Tbody>{missions.map((mission) => {
      const latitude = mission.lastLatitude ?? mission.latestPosition?.latitude;
      const longitude = mission.lastLongitude ?? mission.latestPosition?.longitude;
      return <Tr key={mission.id} _hover={{ bg: '#f3f8fb' }}><Td><Badge colorScheme={statusColor[mission.status]} borderRadius="2px">{statusLabel[mission.status]}</Badge></Td><Td fontWeight="600">{mission.serviceName}</Td><Td>{mission.serviceReference || '-'}</Td><Td>{mission.vehicle?.parc || mission.vehicleParc}</Td>{!compact && <><Td>{mission.status === 'PLANNED' ? <Select size="sm" minW="180px" value={mission.driverIdentifier || ''} onChange={(event) => onChangeDriver?.(mission, event.target.value)}>{members.map((member) => { const identifier = member.matricule || member.email; return identifier ? <option key={member.id || identifier} value={identifier}>{member.firstName} {member.lastName} - {identifier}</option> : null; })}</Select> : mission.driverName || mission.driverIdentifier}</Td><Td whiteSpace="nowrap">{formatDate(mission.scheduledDeparture)}</Td><Td whiteSpace="nowrap">{formatDate(mission.scheduledArrival)}</Td></>}{compact && <Td>{latitude == null ? '-' : <Button as="a" size="xs" variant="link" color="#005a9e" leftIcon={<FiMapPin />} href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`} target="_blank" rel="noreferrer">Voir</Button>}</Td>}</Tr>;
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
  const create = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await ineoAPI.createMission({ ...form, scheduledDeparture: form.scheduledDeparture ? new Date(form.scheduledDeparture).toISOString() : null, scheduledArrival: form.scheduledArrival ? new Date(form.scheduledArrival).toISOString() : null });
      setForm(blankForm);
      toast({ status: 'success', title: 'Mission affectee' });
      setSection('planning');
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

  const assignment = <><SectionHeader title="Nouvelle affectation" detail="Affecter un vehicule et un conducteur a un service" /><Box as="form" onSubmit={create} maxW="820px" border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={5}><Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}><FormControl isRequired><FormLabel>Libelle du service</FormLabel><Input bg="white" value={form.serviceName} onChange={(event) => update('serviceName', event.target.value)} placeholder="Ex. Navette patrimoine" /></FormControl><FormControl><FormLabel>Reference</FormLabel><Input bg="white" value={form.serviceReference} onChange={(event) => update('serviceReference', event.target.value)} placeholder="Ex. JEP-2026-01" /></FormControl><FormControl isRequired><FormLabel>Vehicule</FormLabel><Select bg="white" value={form.vehicleParc} onChange={(event) => update('vehicleParc', event.target.value)} placeholder="Choisir un vehicule">{vehicles.map((vehicle) => <option key={vehicle.parc} value={vehicle.parc}>{vehicle.parc} - {vehicle.immat || vehicle.modele}</option>)}</Select></FormControl><FormControl isRequired><FormLabel>Conducteur</FormLabel><Select bg="white" value={form.driverIdentifier} onChange={(event) => selectDriver(event.target.value)} placeholder="Choisir un conducteur">{members.map((member) => { const identifier = member.matricule || member.email; return identifier && <option key={member.id || identifier} value={identifier}>{member.firstName} {member.lastName} - {identifier}</option>; })}</Select></FormControl><FormControl><FormLabel>Depart prevu</FormLabel><Input bg="white" type="datetime-local" value={form.scheduledDeparture} onChange={(event) => update('scheduledDeparture', event.target.value)} /></FormControl><FormControl><FormLabel>Arrivee prevue</FormLabel><Input bg="white" type="datetime-local" value={form.scheduledArrival} onChange={(event) => update('scheduledArrival', event.target.value)} /></FormControl></Grid><HStack justify="flex-end" mt={5}><Button type="submit" isLoading={saving} colorScheme="blue" borderRadius="2px" leftIcon={<FiPlus />}>Creer l'affectation</Button></HStack></Box></>;
  const planning = <><SectionHeader title="Planning des services" detail={`${missions.length} service${missions.length > 1 ? 's' : ''} enregistre${missions.length > 1 ? 's' : ''}`} /><MissionTable missions={missions} members={members} loading={loading} onChangeDriver={changeMissionDriver} /></>;
  const content = section === 'planning' ? planning : section === 'assignment' ? assignment : section === 'map' ? <><SectionHeader title="Carte de transport" detail="Suivi des vehicules actuellement en exploitation" /><Box border="1px solid" borderColor="#c6d0d8" bg="#f4f7f8" p={4} mb={4} fontSize="sm">Les positions recues depuis les terminaux conducteur sont listees ci-dessous. Le lien Voir ouvre la position dans la carte.</Box><MissionTable missions={missions.filter((mission) => mission.status === 'ACTIVE' || mission.lastLatitude != null || mission.latestPosition)} loading={loading} compact /></> : section === 'vehicles' ? <><SectionHeader title="Parc materiel" detail={`${vehicles.length} vehicule${vehicles.length > 1 ? 's' : ''} disponible${vehicles.length > 1 ? 's' : ''}`} /><Box overflowX="auto" border="1px solid" borderColor="#c6d0d8"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Parc</Th><Th>Immatriculation</Th><Th>Modele</Th><Th>Services affectes</Th></Tr></Thead><Tbody>{vehicles.map((vehicle) => <Tr key={vehicle.parc}><Td fontWeight="600">{vehicle.parc}</Td><Td>{vehicle.immat || '-'}</Td><Td>{vehicle.modele || '-'}</Td><Td>{missions.filter((mission) => mission.vehicleParc === vehicle.parc && mission.status !== 'COMPLETED').length}</Td></Tr>)}</Tbody></Table></Box></> : <><SectionHeader title="Conducteurs" detail={`${members.length} membre${members.length > 1 ? 's' : ''} charge${members.length > 1 ? 's' : ''}`} /><Box overflowX="auto" border="1px solid" borderColor="#c6d0d8"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Nom</Th><Th>Identifiant</Th><Th>Service actif</Th></Tr></Thead><Tbody>{members.map((member) => { const identifier = member.matricule || member.email; const currentMission = missions.find((mission) => mission.driverIdentifier === identifier && mission.status === 'ACTIVE'); return <Tr key={member.id || identifier}><Td fontWeight="600">{member.firstName} {member.lastName}</Td><Td>{identifier || '-'}</Td><Td>{currentMission ? currentMission.serviceName : '-'}</Td></Tr>; })}</Tbody></Table></Box></>;

  const activeContent = section === 'vehicles' ? <IneoVehicleProfiles vehicles={vehicles} /> : section === 'map' ? <IneoTransport vehicles={vehicles} /> : content;

  return <Box minH="100vh" w="100vw" bg="white" color="#18232c" fontFamily="Tahoma, 'Segoe UI', sans-serif" fontSize="14px"><Flex minH="54px" px={3} align="center" bg="#005a9e" color="white" borderBottom="3px solid #d7194b"><Box as="img" src="/Logo RBE.png" alt="RetroBus Essonne" h="34px" maxW="104px" objectFit="contain" objectPosition="left center" mr={3} /><Box flex="1"><Heading fontSize="17px" fontWeight="700">Ineo RetroBus</Heading><Text fontSize="11px" opacity="0.88">Poste de regulation et d'exploitation</Text></Box><Button size="sm" borderRadius="2px" variant="outline" color="white" borderColor="whiteAlpha.700" leftIcon={<FiRefreshCw />} isLoading={loading} onClick={load} _hover={{ bg: 'whiteAlpha.200' }}>Actualiser</Button></Flex><Flex minH="calc(100vh - 54px)" direction={{ base: 'column', md: 'row' }}><Box w={{ base: 'full', md: '250px' }} flexShrink={0} bg="#f3f6f8" borderRight={{ md: '1px solid #b8c4cc' }} borderBottom={{ base: '1px solid #b8c4cc', md: 0 }} p={2}><Text px={2} py={1} color="#4c5d69" fontSize="xs" fontWeight="700" textTransform="uppercase">Arborescence d'exploitation</Text><VStack align="stretch" spacing={0} mt={1}><TreeItem icon={FiChevronDown} label="Exploitation" /><Box pl={4} borderLeft="1px solid" borderColor="#a9b8c3" ml={3}><TreeItem active={section === 'planning'} icon={FiClock} label="Planning des services" onClick={() => setSection('planning')} /><TreeItem active={section === 'assignment'} icon={FiPlus} label="Affectations" onClick={() => setSection('assignment')} /><TreeItem active={section === 'map'} icon={FiMap} label="Carte de transport" onClick={() => setSection('map')} /></Box><TreeItem icon={FiChevronDown} label="Ressources" /><Box pl={4} borderLeft="1px solid" borderColor="#a9b8c3" ml={3}><TreeItem active={section === 'vehicles'} icon={FiTruck} label="Parc vehicules" onClick={() => setSection('vehicles')} /><TreeItem active={section === 'drivers'} icon={FiUser} label="Conducteurs" onClick={() => setSection('drivers')} /></Box></VStack><Box mt={6} px={2} pt={3} borderTop="1px solid" borderColor="#ccd6dd"><Text fontSize="xs" color="#61727e">RBE - Ineo local</Text><Text fontSize="xs" color="#61727e">Connexion operationnelle</Text></Box></Box><Box flex="1" minW={0} p={{ base: 4, md: 6 }} bg="white">{activeContent}</Box></Flex></Box>;
}