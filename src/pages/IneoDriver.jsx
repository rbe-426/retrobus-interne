import React, { useEffect, useRef, useState } from 'react';
import { Badge, Box, Button, Center, Container, Divider, FormControl, FormLabel, Grid, Heading, HStack, Icon, Input, Spinner, Text, VStack, useToast } from '@chakra-ui/react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { FiActivity, FiCheckCircle, FiClock, FiMapPin, FiNavigation, FiPlay, FiTruck } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import L from 'leaflet';
import { ineoAPI } from '../api/ineo';
import 'leaflet/dist/leaflet.css';

const formatTime = (value) => value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
const delayMinutes = (mission) => mission?.scheduledArrival ? Math.max(0, Math.floor((Date.now() - new Date(mission.scheduledArrival).getTime()) / 60000)) : 0;
const stopIcon = L.divIcon({ className: '', html: '<div style="width:14px;height:14px;border:3px solid #005a9e;background:#fff;border-radius:50%"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });

function DriverMap({ mission, route }) {
  const latitude = mission.lastLatitude ?? route?.stops?.[0]?.lat ?? 48.632;
  const longitude = mission.lastLongitude ?? route?.stops?.[0]?.lng ?? 2.447;
  const stops = Array.isArray(route?.stops) ? route.stops : [];
  return <MapContainer center={[latitude, longitude]} zoom={mission.lastLatitude == null ? 12 : 16} style={{ height: '100%', width: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />{stops.map((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng) ? <Marker key={`${stop.order}-${stop.lat}`} position={[stop.lat, stop.lng]} icon={stopIcon}><Popup>{stop.label}</Popup></Marker> : null)}{mission.lastLatitude != null && <CircleMarker center={[mission.lastLatitude, mission.lastLongitude]} radius={12} pathOptions={{ color: '#fff', weight: 3, fillColor: '#d7194b', fillOpacity: 1 }}><Popup>Votre position<br />{formatTime(mission.lastPositionAt)}</Popup></CircleMarker>}</MapContainer>;
}

export default function IneoDriver() {
  const toast = useToast();
  const [mission, setMission] = useState(null);
  const [route, setRoute] = useState(null);
  const [driverName, setDriverName] = useState('Conducteur');
  const [serviceSuffix, setServiceSuffix] = useState('');
  const [courseReference, setCourseReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const watchId = useRef(null);
  const lastSentAt = useRef(0);

  const loadMission = async () => {
    try {
      setLoading(true);
      const data = await ineoAPI.getCurrentDriverMission();
      setMission(data?.mission || null);
      setRoute(data?.route || null);
      setDriverName(data?.driverName || 'Conducteur');
      setServiceSuffix(String(data?.mission?.serviceReference || '').replace(/^RBE-/i, ''));
      setCourseReference(String(data?.mission?.courseReference || ''));
    } catch (error) {
      toast({ status: 'error', title: 'Mission inaccessible', description: error.message });
    } finally { setLoading(false); }
  };

  const sendPosition = async (position) => {
    if (!mission?.id) return;
    const now = Date.now();
    if (now - lastSentAt.current < 20000) return;
    lastSentAt.current = now;
    try {
      const updated = await ineoAPI.sendPosition(mission.id, {
        latitude: position.coords.latitude, longitude: position.coords.longitude,
        speedKmh: position.coords.speed == null ? null : Math.max(0, position.coords.speed * 3.6),
        accuracy: position.coords.accuracy, recordedAt: new Date(position.timestamp).toISOString(),
      });
      setMission((current) => current ? { ...current, ...updated.mission } : current);
    } catch (error) { console.warn('Inéo GPS:', error.message); }
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
    const serviceReference = `RBE-${serviceSuffix.trim().toUpperCase()}`;
    if (!serviceSuffix.trim() || !courseReference.trim()) {
      toast({ status: 'warning', title: 'Code service et code course requis' });
      return;
    }
    if (!/^\d{3}-\d{3}$/.test(serviceSuffix.trim()) || !/^\d{3}-\d{5}-\d{3,4}$/.test(courseReference.trim())) {
      toast({ status: 'warning', title: 'Format de code invalide', description: 'Service: RBE-XXX-XXX · Course: XXX-XXXX-XXX' });
      return;
    }
    try {
      setSubmitting(true);
      const data = await ineoAPI.startMission(mission.id, { serviceReference, courseReference: courseReference.trim().toUpperCase() });
      setMission(data.mission);
      setRoute(data.route || route);
      try { await document.documentElement.requestFullscreen?.(); await screen.orientation?.lock?.('landscape'); } catch { /* Browser permissions can prevent fullscreen or orientation. */ }
      toast({ status: 'success', title: 'Service démarré', description: 'Le GPS est maintenant actif.' });
    } catch (error) { toast({ status: 'error', title: 'Prise de service impossible', description: error.message }); }
    finally { setSubmitting(false); }
  };

  const complete = async () => {
    try {
      setSubmitting(true);
      const data = await ineoAPI.completeMission(mission.id);
      setMission(data.mission);
      if (document.fullscreenElement) await document.exitFullscreen?.();
      toast({ status: 'success', title: 'Service terminé' });
    } catch (error) { toast({ status: 'error', title: 'Fin de service impossible', description: error.message }); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Center minH="70vh"><Spinner size="lg" color="rbe.500" /></Center>;
  if (!mission) return <Container maxW="md" py={8}><VStack align="stretch" spacing={4}><Box bg="white" borderLeft="4px solid" borderColor="rbe.500" p={5}><HStack align="start"><Icon as={FiClock} boxSize={6} color="rbe.600" /><VStack align="start" spacing={1}><Heading size="sm">Aucun service à prendre</Heading><Text fontSize="sm" color="gray.600">Votre prochain service apparaîtra ici dès son affectation.</Text></VStack></HStack></Box><Button as={RouterLink} to="/myrbe/ineo-retrobus/tracage-libre" variant="outline" colorScheme="orange" leftIcon={<FiActivity />}>Traçage libre</Button></VStack></Container>;

  const active = mission.status === 'ACTIVE';
  const vehicle = mission.vehicle || {};
  const late = delayMinutes(mission);
  if (active) return <Box h="100vh" overflow="hidden" bg="#0d1720" color="white"><Grid h="full" templateColumns={{ base: '1fr', md: 'minmax(0, 1fr) 330px' }}><Box minH={{ base: '56vh', md: '100vh' }}><DriverMap mission={mission} route={route} /></Box><VStack align="stretch" spacing={0} bg="#15232e" p={5} justify="space-between"><Box><Text fontSize="xs" fontWeight="700" color="#9db7c8">INÉO · SERVICE EN COURS</Text><Heading size="md" mt={1}>{mission.serviceName}</Heading><Text mt={1} color="#c7d5df">{mission.serviceReference || 'Code service non renseigné'} · {route?.courseReference || 'Code course non renseigné'}</Text><Divider my={5} borderColor="#3c5464" /><HStack><Icon as={FiTruck} color="#66b7e8" /><Text>{vehicle.immat || mission.vehicleParc} · {vehicle.modele || 'Véhicule affecté'}</Text></HStack><HStack mt={4}><Icon as={FiActivity} color="#66b7e8" /><Text>{mission.lastSpeedKmh == null ? 'Vitesse en attente' : `${Math.round(mission.lastSpeedKmh)} km/h`}</Text></HStack><HStack mt={4}><Icon as={FiMapPin} color="#66b7e8" /><Text>{mission.lastPositionAt ? `GPS reçu à ${formatTime(mission.lastPositionAt)}` : 'Recherche GPS en cours'}</Text></HStack></Box><Box><HStack spacing={4} align="stretch"><Box w="12px" borderRadius="full" bg={late ? '#d7194b' : '#22a06b'} position="relative" minH="170px"><Icon as={FiNavigation} position="absolute" color="white" left="-6px" top="50%" transform="translateY(-50%)" boxSize={6} /></Box><VStack align="start" justify="center" spacing={1}><Text fontSize="xs" color="#9db7c8">PONCTUALITÉ</Text><Heading color={late ? '#ff6688' : '#63d39f'} size="lg">{late ? `+${late} min` : 'À l’heure'}</Heading><Text fontSize="sm">Arrivée prévue {formatTime(mission.scheduledArrival)}</Text></VStack></HStack><Button mt={6} w="full" colorScheme="red" leftIcon={<FiCheckCircle />} isLoading={submitting} onClick={complete}>Terminer le service</Button></Box></VStack></Grid></Box>;

  return <Box bg="gray.100" minH="100vh" py={8}><Container maxW="md"><VStack align="stretch" spacing={4}><Box bg="rbe.800" color="white" p={5} borderLeft="4px solid" borderColor="rbe.500"><Text fontWeight="bold" fontSize="xs" color="whiteAlpha.700">INÉO RÉTROBUS · CONDUCTEUR</Text><Heading mt={1} size="md">Bonjour, {driverName}</Heading><HStack mt={4} justify="space-between"><Text fontSize="sm">{mission.serviceName}</Text><Badge colorScheme="orange">À PRENDRE</Badge></HStack></Box><Box bg="white" p={5} boxShadow="sm"><HStack align="start" spacing={3}><Icon as={FiTruck} color="rbe.600" boxSize={6} /><VStack align="start" spacing={1}><Text fontSize="xs" color="gray.500" fontWeight="bold">SERVICE LE PLUS PROCHE</Text><Heading size="sm">{vehicle.modele || `Parc ${mission.vehicleParc}`}</Heading><Text fontSize="sm" color="gray.600">Départ prévu {formatTime(mission.scheduledDeparture)} · arrivée {formatTime(mission.scheduledArrival)}</Text></VStack></HStack><Divider my={5} /><VStack align="stretch" spacing={4}><FormControl isRequired><FormLabel>Code service</FormLabel><HStack><Box bg="gray.100" px={3} py={2} border="1px solid" borderColor="gray.200" fontWeight="700">RBE-</Box><Input value={serviceSuffix} onChange={(event) => setServiceSuffix(event.target.value.toUpperCase())} placeholder="999-999" inputMode="numeric" autoCapitalize="characters" /></HStack></FormControl><FormControl isRequired><FormLabel>Code course</FormLabel><Input value={courseReference} onChange={(event) => setCourseReference(event.target.value.toUpperCase())} placeholder="999-26726-920" inputMode="numeric" autoCapitalize="characters" /></FormControl></VStack></Box><Button colorScheme="orange" size="lg" leftIcon={<FiPlay />} isLoading={submitting} onClick={start}>Valider la prise de service</Button><Button as={RouterLink} to="/myrbe/ineo-retrobus/tracage-libre" variant="outline" colorScheme="orange" leftIcon={<FiActivity />}>Traçage libre</Button></VStack></Container></Box>;
}
