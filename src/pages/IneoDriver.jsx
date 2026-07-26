import React, { useEffect, useRef, useState } from 'react';
import { Badge, Box, Button, Center, Container, Divider, Heading, HStack, Icon, Spinner, Text, VStack, useToast } from '@chakra-ui/react';
import { FiActivity, FiCheckCircle, FiClock, FiMapPin, FiNavigation, FiPlay, FiTruck } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';

const formatTime = (value) => value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

export default function IneoDriver() {
  const toast = useToast();
  const [mission, setMission] = useState(null);
  const [driverName, setDriverName] = useState('Conducteur');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const watchId = useRef(null);
  const lastSentAt = useRef(0);

  const loadMission = async () => {
    try {
      setLoading(true);
      const data = await ineoAPI.getCurrentDriverMission();
      setMission(data?.mission || null);
      setDriverName(data?.driverName || 'Conducteur');
    } catch (error) {
      toast({ status: 'error', title: 'Mission inaccessible', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const sendPosition = async (position) => {
    if (!mission?.id) return;
    const now = Date.now();
    if (now - lastSentAt.current < 20000) return;
    lastSentAt.current = now;
    try {
      const updated = await ineoAPI.sendPosition(mission.id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speedKmh: position.coords.speed == null ? null : Math.max(0, position.coords.speed * 3.6),
        accuracy: position.coords.accuracy,
        recordedAt: new Date(position.timestamp).toISOString(),
      });
      setMission((current) => current ? { ...current, ...updated.mission } : current);
    } catch (error) {
      console.warn('Inéo GPS:', error.message);
    }
  };

  useEffect(() => {
    loadMission();
    return () => { if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current); };
  }, []);

  useEffect(() => {
    if (mission?.status !== 'ACTIVE' || !navigator.geolocation) return undefined;
    watchId.current = navigator.geolocation.watchPosition(sendPosition, () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); watchId.current = null; };
  }, [mission?.id, mission?.status]);

  const start = async () => {
    try {
      setSubmitting(true);
      const data = await ineoAPI.startMission(mission.id);
      setMission(data.mission);
      toast({ status: 'success', title: 'Service démarré', description: 'La position est maintenant transmise pendant la mission.' });
    } catch (error) { toast({ status: 'error', title: 'Démarrage impossible', description: error.message }); }
    finally { setSubmitting(false); }
  };

  const complete = async () => {
    try {
      setSubmitting(true);
      const data = await ineoAPI.completeMission(mission.id);
      setMission(data.mission);
      toast({ status: 'success', title: 'Service terminé' });
    } catch (error) { toast({ status: 'error', title: 'Fin de service impossible', description: error.message }); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Center minH="70vh"><Spinner size="lg" color="rbe.500" /></Center>;

  if (!mission) return <Container maxW="md" py={8}><Box bg="white" borderLeft="4px solid" borderColor="rbe.500" p={5} borderRadius="md" boxShadow="sm"><HStack align="start"><Icon as={FiClock} boxSize={6} color="rbe.600" /><VStack align="start" spacing={1}><Heading size="sm">Aucun service affecté</Heading><Text fontSize="sm" color="gray.600">Votre prochaine mission apparaîtra ici dès son affectation par la régulation.</Text></VStack></HStack></Box></Container>;

  const active = mission.status === 'ACTIVE';
  const vehicle = mission.vehicle || {};
  return <Box bg="gray.100" minH="100vh" pb={8}><Container maxW="md" py={4}><VStack align="stretch" spacing={4}>
    <Box bg="rbe.800" color="white" borderRadius="md" p={5} borderLeft="4px solid" borderColor="rbe.500"><Text fontWeight="bold" fontSize="xs" color="whiteAlpha.700" letterSpacing="0.08em">INÉO RÉTROBUS · CONDUCTEUR</Text><Heading mt={1} size="md">Bonjour, {driverName}</Heading><HStack mt={4} justify="space-between"><Text fontSize="sm">{mission.serviceName}</Text><Badge colorScheme={active ? 'green' : 'orange'}>{active ? 'EN SERVICE' : 'À PRENDRE'}</Badge></HStack></Box>
    <Box bg="white" borderRadius="md" p={5} boxShadow="sm"><HStack align="start" spacing={3}><Icon as={FiTruck} color="rbe.600" boxSize={6}/><VStack align="start" spacing={1} flex={1}><Text fontSize="xs" color="gray.500" fontWeight="bold">VÉHICULE AFFECTÉ</Text><Heading size="sm">{vehicle.modele || `Parc ${mission.vehicleParc}`}</Heading><Text fontSize="sm" color="gray.600">{vehicle.immat || mission.vehicleParc} · {vehicle.type || 'Type non renseigné'}</Text></VStack></HStack><Divider my={4}/><HStack justify="space-between"><VStack align="start" spacing={0}><Text fontSize="xs" color="gray.500">Départ prévu</Text><Text fontWeight="bold">{formatTime(mission.scheduledDeparture)}</Text></VStack><VStack align="end" spacing={0}><Text fontSize="xs" color="gray.500">Arrivée prévue</Text><Text fontWeight="bold">{formatTime(mission.scheduledArrival)}</Text></VStack></HStack></Box>
    <Box bg={active ? 'green.50' : 'orange.50'} borderRadius="md" p={4} borderLeft="4px solid" borderColor={active ? 'green.500' : 'orange.500'}><HStack><Icon as={active ? FiNavigation : FiClock} color={active ? 'green.600' : 'orange.600'} /><Text fontSize="sm" fontWeight="bold">{active ? 'Suivi GPS actif pendant cette mission' : 'Le suivi GPS commencera au départ du service'}</Text></HStack>{active && <HStack mt={3} fontSize="sm" color="gray.700"><Icon as={FiActivity}/><Text>{mission.lastSpeedKmh == null ? 'Vitesse en attente' : `${Math.round(mission.lastSpeedKmh)} km/h`}</Text><Icon as={FiMapPin} ml={3}/><Text>{mission.lastPositionAt ? `Position à ${formatTime(mission.lastPositionAt)}` : 'Position en attente'}</Text></HStack>}</Box>
    {active ? <Button colorScheme="green" size="lg" leftIcon={<FiCheckCircle/>} isLoading={submitting} onClick={complete}>Terminer le service</Button> : <Button colorScheme="orange" size="lg" leftIcon={<FiPlay/>} isLoading={submitting} onClick={start}>Prendre le service</Button>}
  </VStack></Container></Box>;
}