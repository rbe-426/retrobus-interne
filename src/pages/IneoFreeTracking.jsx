import React, { useEffect, useRef, useState } from 'react';
import { Badge, Box, Button, Container, FormControl, FormLabel, Heading, HStack, Icon, Input, Select, Stat, StatLabel, StatNumber, Text, VStack, useToast } from '@chakra-ui/react';
import { FiActivity, FiCheckCircle, FiMapPin, FiPlay, FiSmartphone, FiStopCircle } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';
import { useUser } from '../context/UserContext';

const isIneoManager = ({ matricule, user }) => [matricule, user?.username, user?.email]
  .filter(Boolean)
  .map((identity) => String(identity).trim().toLowerCase())
  .some((identity) => identity === 'w.belaidi' || identity === 'belaidiw91@gmail.com');

const formatDistance = (meters = 0) => meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
const formatSpeed = (speed) => speed == null ? '--' : `${Math.round(speed)} km/h`;

export default function IneoFreeTracking() {
  const toast = useToast();
  const userContext = useUser();
  const manager = isIneoManager(userContext);
  const [trackers, setTrackers] = useState([]);
  const [selectedTrackerId, setSelectedTrackerId] = useState('');
  const [createdSession, setCreatedSession] = useState(null);
  const [courseCode, setCourseCode] = useState('');
  const [session, setSession] = useState(null);
  const [tracker, setTracker] = useState(null);
  const [loading, setLoading] = useState(manager);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const watchId = useRef(null);
  const lastSentAt = useRef(0);

  useEffect(() => {
    if (!manager) return;
    const loadTrackers = async () => {
      try {
        const data = await ineoAPI.listVehicleTrackers();
        setTrackers(data?.trackers || []);
      } catch (error) {
        toast({ status: 'error', title: 'Appareils Urbex indisponibles', description: error.message });
      } finally {
        setLoading(false);
      }
    };
    loadTrackers();
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
    if (!selectedTrackerId) {
      toast({ status: 'warning', title: 'Choisissez un appareil Urbex' });
      return;
    }
    try {
      setStarting(true);
      const data = await ineoAPI.createFreeTrackingSession(selectedTrackerId);
      setCreatedSession({ ...data.session, tracker: data.tracker });
      toast({ status: 'success', title: 'Code course généré' });
    } catch (error) {
      toast({ status: 'error', title: 'Création impossible', description: error.message });
    } finally {
      setStarting(false);
    }
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

  if (manager) return <Container maxW="xl" py={8}><VStack align="stretch" spacing={5}><Box borderBottom="1px solid" borderColor="gray.200" pb={4}><HStack><Icon as={FiActivity} color="#005a9e" boxSize={6} /><Box><Heading size="md">Traçage libre Urbex</Heading><Text color="gray.600">Générez un code course pour un véhicule et transmettez-le au conducteur.</Text></Box></HStack></Box><Box border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={5}><VStack align="stretch" spacing={4}><FormControl isRequired><FormLabel>Appareil Urbex</FormLabel><Select bg="white" value={selectedTrackerId} onChange={(event) => setSelectedTrackerId(event.target.value)} placeholder={loading ? 'Chargement...' : 'Choisir un appareil'} isDisabled={loading}>{trackers.map((item) => <option key={item.id} value={item.id}>{item.vehicleParc} - {item.deviceLabel || item.imei}</option>)}</Select></FormControl><Button alignSelf="flex-end" colorScheme="blue" leftIcon={<FiPlay />} isLoading={starting} onClick={createSession}>Générer le code course</Button></VStack></Box>{createdSession && <Box border="1px solid" borderColor="#8bc7a1" bg="#f0fff4" p={5}><Text fontSize="sm" color="gray.600">Code à saisir par le conducteur</Text><Heading mt={1} fontFamily="monospace" letterSpacing="1px">{createdSession.courseCode}</Heading><Text mt={3} fontSize="sm"><b>Véhicule :</b> {createdSession.tracker.vehicleParc} · <b>IMEI :</b> {createdSession.tracker.imei}</Text></Box>}</VStack></Container>;

  const active = session?.status === 'ACTIVE';
  return <Box minH="100vh" bg="#0d1720" color="white" py={{ base: 5, md: 10 }}><Container maxW="md"><VStack align="stretch" spacing={5}>{!active ? <><Box><Text fontSize="xs" fontWeight="700" color="#9db7c8">INÉO RÉTROBUS · URBEX</Text><Heading mt={1}>Traçage libre</Heading><Text mt={2} color="#c7d5df">Saisissez le code course généré par le poste Inéo pour démarrer le suivi de passage du véhicule.</Text></Box><Box bg="white" color="#18232c" p={5}><FormControl isRequired><FormLabel>Code course</FormLabel><Input value={courseCode} onChange={(event) => setCourseCode(event.target.value.toUpperCase())} placeholder="URBEX-20260824-ABC123" fontFamily="monospace" autoCapitalize="characters" /></FormControl><Button mt={5} w="full" colorScheme="orange" size="lg" leftIcon={<FiPlay />} isLoading={starting} onClick={startSession}>Activer le suivi de passage</Button></Box></> : <><Box><HStack justify="space-between"><Box><Text fontSize="xs" fontWeight="700" color="#9db7c8">INÉO RÉTROBUS · TRAÇAGE LIBRE</Text><Heading mt={1}>{tracker?.vehicleParc || session.vehicleParc}</Heading></Box><Badge colorScheme="green">ACTIF</Badge></HStack><Text mt={2} color="#c7d5df">{session.courseCode}</Text></Box><Box bg="#15232e" p={5}><HStack justify="space-between"><Stat><StatLabel color="#9db7c8">Distance</StatLabel><StatNumber>{formatDistance(session.distanceMeters)}</StatNumber></Stat><Stat><StatLabel color="#9db7c8">Vitesse</StatLabel><StatNumber>{formatSpeed(session.lastSpeedKmh)}</StatNumber></Stat><Stat><StatLabel color="#9db7c8">Max.</StatLabel><StatNumber>{formatSpeed(session.maxSpeedKmh)}</StatNumber></Stat></HStack><HStack mt={5} color="#c7d5df"><Icon as={FiMapPin} /><Text>{session.lastRecordedAt ? 'Position GPS enregistrée' : 'Recherche de position GPS...'}</Text></HStack></Box><Button colorScheme="red" size="lg" leftIcon={<FiStopCircle />} isLoading={stopping} onClick={completeSession}>Terminer le suivi de passage</Button></>}</VStack></Container></Box>;
}