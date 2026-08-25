import React, { useEffect, useRef, useState } from 'react';
import { Badge, Box, Button, Container, FormControl, FormLabel, Grid, Heading, HStack, Icon, Input, Select, Stat, StatLabel, StatNumber, Text, VStack, useToast } from '@chakra-ui/react';
import { FiActivity, FiCheckCircle, FiMapPin, FiPlay, FiSmartphone, FiStopCircle } from 'react-icons/fi';
import { CircleMarker, MapContainer, Polyline, TileLayer } from 'react-leaflet';
import { ineoAPI } from '../api/ineo';
import { apiClient } from '../api/config';
import { useUser } from '../context/UserContext';
import 'leaflet/dist/leaflet.css';

const isIneoManager = ({ matricule, user }) => [matricule, user?.username, user?.email]
  .filter(Boolean)
  .map((identity) => String(identity).trim().toLowerCase())
  .some((identity) => identity === 'w.belaidi' || identity === 'belaidiw91@gmail.com');

const formatDistance = (meters = 0) => meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
const formatSpeed = (speed) => speed == null ? '--' : `${Math.round(speed)} km/h`;

function FreeTrackingMap({ session, points = [] }) {
  const trace = points.filter((point) => point.latitude != null && point.longitude != null).map((point) => [point.latitude, point.longitude]);
  const latest = trace.at(-1) || (session?.lastLatitude != null ? [session.lastLatitude, session.lastLongitude] : null);
  if (!latest) return <Box h="340px" bg="gray.100" display="flex" alignItems="center" justifyContent="center" color="gray.500">En attente de la première position GPS.</Box>;
  return <Box h="340px" overflow="hidden" border="1px solid" borderColor="#c6d0d8"><MapContainer center={latest} zoom={15} style={{ height: '100%', width: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />{trace.length > 1 && <Polyline positions={trace} pathOptions={{ color: '#d7194b', weight: 5 }} />}{latest && <CircleMarker center={latest} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#005a9e', fillOpacity: 1 }} />}</MapContainer></Box>;
}

export default function IneoFreeTracking() {
  const toast = useToast();
  const userContext = useUser();
  const manager = isIneoManager(userContext);
  const [trackers, setTrackers] = useState([]);
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedTrackerId, setSelectedTrackerId] = useState('');
  const [selectedDriverIdentifier, setSelectedDriverIdentifier] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [createdSession, setCreatedSession] = useState(null);
  const [courseCode, setCourseCode] = useState('');
  const [session, setSession] = useState(null);
  const [tracker, setTracker] = useState(null);
  const [loading, setLoading] = useState(manager);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [tracePoints, setTracePoints] = useState([]);
  const watchId = useRef(null);
  const lastSentAt = useRef(0);

  useEffect(() => {
    if (!manager) return;
    const loadOperations = async () => {
      try {
        const [trackerData, memberData, sessionData] = await Promise.all([ineoAPI.listVehicleTrackers(), apiClient.get('/members?limit=500'), ineoAPI.listFreeTrackingSessions()]);
        setTrackers(trackerData?.trackers || []);
        setMembers(memberData?.members || memberData || []);
        setSessions(sessionData?.sessions || []);
      } catch (error) {
        toast({ status: 'error', title: 'Traçage libre indisponible', description: error.message });
      } finally {
        setLoading(false);
      }
    };
    loadOperations();
    const intervalId = window.setInterval(loadOperations, 10000);
    return () => window.clearInterval(intervalId);
  }, [manager, toast]);

  const stopWatch = () => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
  };

  useEffect(() => stopWatch, []);

  const sendPosition = async (position, activeSession) => {
    const now = Date.now();
    if (now - lastSentAt.current < 10000) return;
    lastSentAt.current = now;
    try {
      const data = await ineoAPI.reportFreeTrackingPosition(activeSession.id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speedKmh: position.coords.speed == null ? null : Math.max(0, position.coords.speed * 3.6),
        accuracy: position.coords.accuracy,
        recordedAt: new Date(position.timestamp).toISOString(),
      });
      setSession(data.session);
      setTracePoints((current) => [...current, data.position]);
    } catch (error) {
      console.warn('Inéo traçage libre:', error.message);
    }
  };

  const startWatch = (activeSession) => {
    if (!navigator.geolocation) {
      toast({ status: 'error', title: 'Géolocalisation indisponible', description: 'Ce terminal ne peut pas effectuer de traçage libre.' });
      return;
    }
    lastSentAt.current = 0;
    watchId.current = navigator.geolocation.watchPosition(
      (position) => sendPosition(position, activeSession),
      () => {
        stopWatch();
        toast({ status: 'error', title: 'Position GPS indisponible', description: 'Autorisez la localisation sur ce terminal pour poursuivre le traçage.' });
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  };

  const createSession = async () => {
    toast({ status: 'info', title: 'Création déplacée', description: 'Générez le code course libre dans « Trajets et codes course », puis affectez-le dans « Affectations du jour ».' });
  };

  const startSession = async () => {
    const normalizedCode = courseCode.trim().toUpperCase();
    if (!normalizedCode) {
      toast({ status: 'warning', title: 'Saisissez le code course' });
      return;
    }
    try {
      setStarting(true);
      const data = await ineoAPI.startFreeTrackingSession(normalizedCode);
      setSession(data.session);
      setTracker(data.tracker);
      startWatch(data.session);
      toast({ status: 'success', title: 'Traçage libre actif', description: `${data.tracker?.vehicleParc || 'Le véhicule'} est maintenant suivi.` });
    } catch (error) {
      toast({ status: 'error', title: 'Activation impossible', description: error.message });
    } finally {
      setStarting(false);
    }
  };

  const completeSession = async () => {
    if (!session) return;
    try {
      setStopping(true);
      stopWatch();
      const data = await ineoAPI.completeFreeTrackingSession(session.id);
      setSession(data.session);
      toast({ status: 'success', title: 'Traçage libre terminé', description: `${formatDistance(data.session.distanceMeters)} enregistrés.` });
    } catch (error) {
      toast({ status: 'error', title: 'Clôture impossible', description: error.message });
    } finally {
      setStopping(false);
    }
  };

  const selectedManagedSession = sessions.find((item) => item.id === selectedSessionId) || sessions.find((item) => item.status === 'ACTIVE') || createdSession;

  if (manager) return <Container maxW="6xl" py={8}><VStack align="stretch" spacing={5}>
    <Box borderBottom="1px solid" borderColor="gray.200" pb={4}><HStack><Icon as={FiActivity} color="#005a9e" boxSize={6} /><Box><Heading size="md">Traçage libre</Heading><Text color="gray.600">Créez une course sans trajet, affectez son véhicule et son conducteur, puis suivez sa trace en temps réel.</Text></Box></HStack></Box>
    <Box border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={5}><Grid templateColumns={{ base: '1fr', md: '1fr 1fr auto' }} gap={4} alignItems="end"><FormControl isRequired><FormLabel>Véhicule / IMEI</FormLabel><Select bg="white" value={selectedTrackerId} onChange={(event) => setSelectedTrackerId(event.target.value)} placeholder={loading ? 'Chargement...' : 'Choisir un appareil'} isDisabled={loading}>{trackers.map((item) => <option key={item.id} value={item.id}>{item.vehicleParc} - {item.deviceLabel || item.imei}</option>)}</Select></FormControl><FormControl isRequired><FormLabel>Conducteur</FormLabel><Select bg="white" value={selectedDriverIdentifier} onChange={(event) => setSelectedDriverIdentifier(event.target.value)} placeholder="Choisir un conducteur">{members.map((member) => { const identifier = String(member.matricule || member.email || '').toLowerCase(); return identifier ? <option key={member.id || identifier} value={identifier}>{member.firstName} {member.lastName}</option> : null; })}</Select></FormControl><Button colorScheme="blue" leftIcon={<FiPlay />} isLoading={starting} onClick={createSession}>Créer et affecter</Button></Grid></Box>
    {createdSession && <Box border="1px solid" borderColor="#8bc7a1" bg="#f0fff4" p={5}><Text fontSize="sm" color="gray.600">Codes à saisir par le conducteur connecté sur le terminal IMEI affecté</Text><Heading mt={1} fontFamily="monospace">{createdSession.serviceReference} · {createdSession.courseCode}</Heading><Text mt={3} fontSize="sm"><b>Véhicule :</b> {createdSession.tracker.vehicleParc} · <b>Conducteur :</b> {createdSession.driverName || createdSession.driverIdentifier}</Text></Box>}
    <Grid templateColumns={{ base: '1fr', lg: '300px minmax(0, 1fr)' }} gap={5}><Box border="1px solid" borderColor="#c6d0d8" overflowY="auto" maxH="340px"><Text px={4} py={3} fontWeight="700" bg="#e9eff3">Traçages récents</Text>{sessions.map((item) => <Button key={item.id} w="full" h="auto" py={3} px={4} borderRadius="0" justifyContent="start" textAlign="left" variant="ghost" bg={selectedManagedSession?.id === item.id ? '#e8f1f8' : 'white'} onClick={() => setSelectedSessionId(item.id)}><VStack align="start" spacing={0}><HStack><Badge colorScheme={item.status === 'ACTIVE' ? 'green' : item.status === 'PENDING' ? 'orange' : 'gray'}>{item.status}</Badge><Text fontFamily="monospace" fontSize="xs">{item.courseCode}</Text></HStack><Text fontSize="sm">{item.vehicleParc} · {item.driverName || item.driverIdentifier}</Text></VStack></Button>)}</Box>{selectedManagedSession && <VStack align="stretch" spacing={3}><HStack justify="space-between"><Box><Text fontWeight="700">{selectedManagedSession.vehicleParc} · {selectedManagedSession.driverName || selectedManagedSession.driverIdentifier}</Text><Text fontFamily="monospace" fontSize="sm" color="gray.600">{selectedManagedSession.serviceReference} · {selectedManagedSession.courseCode}</Text></Box><HStack><Stat><StatLabel>Vitesse</StatLabel><StatNumber fontSize="lg">{formatSpeed(selectedManagedSession.lastSpeedKmh)}</StatNumber></Stat><Stat><StatLabel>Distance</StatLabel><StatNumber fontSize="lg">{formatDistance(selectedManagedSession.distanceMeters)}</StatNumber></Stat></HStack></HStack><FreeTrackingMap session={selectedManagedSession} points={selectedManagedSession.positions || []} /></VStack>}</Grid>
  </VStack></Container>;

  const active = session?.status === 'ACTIVE';
  return <Box minH="100vh" bg="#0d1720" color="white" py={{ base: 5, md: 10 }}><Container maxW="md"><VStack align="stretch" spacing={5}>{!active ? <><Box><Text fontSize="xs" fontWeight="700" color="#9db7c8">INÉO RÉTROBUS · URBEX</Text><Heading mt={1}>Traçage libre</Heading><Text mt={2} color="#c7d5df">Saisissez le code course affecté par le poste Inéo pour démarrer le suivi du véhicule.</Text></Box><Box bg="white" color="#18232c" p={5}><FormControl isRequired><FormLabel>Code course</FormLabel><Input value={courseCode} onChange={(event) => setCourseCode(event.target.value.toUpperCase())} placeholder="999-26237-001" fontFamily="monospace" autoCapitalize="characters" /></FormControl><Button mt={5} w="full" colorScheme="orange" size="lg" leftIcon={<FiPlay />} isLoading={starting} onClick={startSession}>Démarrer le traçage</Button></Box></> : <><Box><HStack justify="space-between"><Box><Text fontSize="xs" fontWeight="700" color="#9db7c8">INÉO RÉTROBUS · TRAÇAGE LIBRE</Text><Heading mt={1}>{tracker?.vehicleParc || session.vehicleParc}</Heading></Box><Badge colorScheme="green">ACTIF</Badge></HStack><Text mt={2} color="#c7d5df">{session.serviceReference} · {session.courseCode}</Text></Box><Box bg="#15232e" p={5}><HStack justify="space-between"><Stat><StatLabel color="#9db7c8">Distance</StatLabel><StatNumber>{formatDistance(session.distanceMeters)}</StatNumber></Stat><Stat><StatLabel color="#9db7c8">Vitesse</StatLabel><StatNumber>{formatSpeed(session.lastSpeedKmh)}</StatNumber></Stat><Stat><StatLabel color="#9db7c8">Max.</StatLabel><StatNumber>{formatSpeed(session.maxSpeedKmh)}</StatNumber></Stat></HStack><HStack mt={5} color="#c7d5df"><Icon as={FiMapPin} /><Text>{session.lastRecordedAt ? 'Position GPS enregistrée' : 'Recherche de position GPS...'}</Text></HStack></Box><FreeTrackingMap session={session} points={tracePoints} /><Button colorScheme="red" size="lg" leftIcon={<FiStopCircle />} isLoading={stopping} onClick={completeSession}>Terminer le suivi de passage</Button></>}</VStack></Container></Box>;
}