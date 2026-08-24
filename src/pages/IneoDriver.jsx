import React, { useEffect, useRef, useState } from 'react';
import { Badge, Box, Button, Center, Container, Divider, FormControl, FormLabel, Grid, Heading, HStack, Icon, Input, Spinner, Text, VStack, useToast } from '@chakra-ui/react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { FiActivity, FiCheckCircle, FiClock, FiMapPin, FiNavigation, FiPlay, FiTruck } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import L from 'leaflet';
import { ineoAPI } from '../api/ineo';
import 'leaflet/dist/leaflet.css';

const formatTime = (value) => value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
const stopIcon = L.divIcon({ className: '', html: '<div style="width:14px;height:14px;border:3px solid #005a9e;background:#fff;border-radius:50%"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
const toRadians = (value) => value * Math.PI / 180;
const metersBetween = (origin, destination) => {
  const earthRadius = 6371000;
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const latitudeOrigin = toRadians(origin.lat);
  const latitudeDestination = toRadians(destination.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeOrigin) * Math.cos(latitudeDestination) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};
const routeProgress = (mission, route) => {
  const stops = (Array.isArray(route?.stops) ? route.stops : []).filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
  if (!stops.length || mission.lastLatitude == null || mission.lastLongitude == null) return { stops, progress: 0, segmentIndex: 0, deviationMeters: null };
  const position = { lat: mission.lastLatitude, lng: mission.lastLongitude };
  if (stops.length === 1) return { stops, progress: 0, segmentIndex: 0, deviationMeters: metersBetween(position, stops[0]) };
  const referenceLatitude = toRadians(position.lat);
  const scaleX = 111320 * Math.cos(referenceLatitude);
  const scaleY = 110540;
  let closest = { distance: Infinity, segmentIndex: 0, ratio: 0 };
  stops.slice(0, -1).forEach((start, segmentIndex) => {
    const end = stops[segmentIndex + 1];
    const endX = (end.lng - start.lng) * scaleX;
    const endY = (end.lat - start.lat) * scaleY;
    const pointX = (position.lng - start.lng) * scaleX;
    const pointY = (position.lat - start.lat) * scaleY;
    const denominator = endX ** 2 + endY ** 2;
    const ratio = denominator ? Math.max(0, Math.min(1, (pointX * endX + pointY * endY) / denominator)) : 0;
    const distance = Math.hypot(pointX - endX * ratio, pointY - endY * ratio);
    if (distance < closest.distance) closest = { distance, segmentIndex, ratio };
  });
  return { stops, progress: ((closest.segmentIndex + closest.ratio) / (stops.length - 1)) * 100, segmentIndex: closest.segmentIndex, deviationMeters: closest.distance };
};
const scheduleCode = (mission, now = new Date()) => {
  if (!mission?.scheduledArrival) return '0';
  const deltaMinutes = Math.round((now.getTime() - new Date(mission.scheduledArrival).getTime()) / 60000);
  if (deltaMinutes >= -2 && deltaMinutes <= 5) return '0';
  return `${deltaMinutes < 0 ? 'A' : 'R'}${Math.abs(deltaMinutes)}`;
};

function MobileRouteProgress({ mission, route, clock, onShowGps }) {
  const { stops, progress, segmentIndex, deviationMeters } = routeProgress(mission, route);
  const offRoute = deviationMeters != null && deviationMeters > 120;
  const statusCode = scheduleCode(mission, clock);
  return <Box minH="100dvh" px={{ base: 4, md: 8 }} py={{ base: 4, md: 6 }} position="relative" overflow="hidden" bg="#121618" sx={{ backgroundImage: 'linear-gradient(27deg, rgba(255,255,255,0.025) 25%, transparent 25%), linear-gradient(207deg, rgba(255,255,255,0.02) 25%, transparent 25%), linear-gradient(90deg, rgba(0,0,0,0.28), rgba(255,255,255,0.02))', backgroundSize: '8px 8px, 8px 8px, auto' }}><HStack justify="space-between" align="start"><Box><Text fontSize="xs" color="#aeb7bb" fontWeight="700">INÉO · EN LIGNE</Text><Heading size="sm" mt={1} noOfLines={1}>{mission.serviceName}</Heading><Text mt={1} color="#c5cccf" fontSize="sm" noOfLines={1}>{route?.routeName || mission.serviceReference} · {mission.courseReference}</Text></Box><HStack spacing={4} align="start"><Box textAlign="right"><Text fontFamily="monospace" fontSize="24px" fontWeight="700">{clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text><Text color={statusCode === '0' ? '#38d39f' : statusCode.startsWith('R') ? '#ff718a' : '#78d9ff'} fontFamily="monospace" fontSize="18px" fontWeight="700">{statusCode}</Text></Box><Button size="sm" variant="outline" borderColor="#60727e" color="#f2f5f5" leftIcon={<FiMapPin />} onClick={onShowGps}>GPS</Button></HStack></HStack><Box mt={{ base: 8, md: 12 }} mb={6} position="relative" minH={{ base: '360px', md: '520px' }} maxW="560px" mx="auto">{stops.length > 1 ? <><Box position="absolute" top="7%" bottom="7%" left="36px" w="5px" bg="#d7194b" borderRadius="full" /><Box position="absolute" top="7%" left="36px" w="5px" h={`${Math.max(0, Math.min(86, progress * 0.86))}%`} bg="#54d9aa" borderRadius="full" transition="height 700ms ease" />{stops.map((stop, index) => { const top = 7 + (index / (stops.length - 1)) * 86; const affected = offRoute && index === segmentIndex + 1; return <Box key={`${stop.order}-${stop.lat}`} position="absolute" top={`${top}%`} left="0" right="0" transform="translateY(-50%)" minH="28px"><Box position="absolute" top="50%" left="27px" transform="translateY(-50%)" w="18px" h="18px" borderRadius="full" bg={affected ? '#ffd84e' : '#182125'} border="3px solid" borderColor={affected ? '#ffd84e' : '#f2f5f5'} boxShadow={affected ? '0 0 16px #ffd84e' : 'none'} /><Text pl="62px" pr={4} color={affected ? '#ffd84e' : '#e7ecee'} fontSize={{ base: 'sm', md: 'md' }} fontWeight={affected ? '700' : '500'} noOfLines={2}>{stop.label}</Text></Box>; })}<Box position="absolute" top={`${7 + Math.max(0, Math.min(86, progress * 0.86))}%`} left={offRoute ? '52px' : '24px'} transform="translateY(-50%)" transition="top 700ms ease, left 300ms ease"><Box w="24px" h="24px" borderRadius="full" bg="#36d59d" border="3px solid white" boxShadow="0 0 0 5px rgba(54,213,157,0.22), 0 0 18px #36d59d" /><Icon as={FiNavigation} position="absolute" top="4px" left="4px" color="#0d1720" boxSize={3.5} /></Box></> : <Text color="#aeb7bb" textAlign="center">Itinéraire sans arrêts géocodés</Text>}</Box>{offRoute ? <Box border="1px solid" borderColor="#ffd84e" bg="#342c0c" px={4} py={3} maxW="560px" mx="auto" boxShadow="0 12px 28px rgba(0,0,0,0.35)"><Text color="#ffe88b" fontSize="sm" fontWeight="700">Écart d’itinéraire détecté</Text><Text color="#e9edf0" fontSize="xs">Retour attendu entre {stops[segmentIndex]?.label || 'l’arrêt précédent'} et {stops[segmentIndex + 1]?.label || 'l’arrêt suivant'} · {Math.round(deviationMeters)} m</Text></Box> : <HStack justify="center" color="#9cadb4" fontSize="sm"><Icon as={FiMapPin} color="#36d59d" /><Text>{mission.lastPositionAt ? `Position reçue à ${formatTime(mission.lastPositionAt)}` : 'Recherche de position GPS'}</Text></HStack>}</Box>;
}

function TrilogyRouteLine({ mission, route, clock, onShowGps }) {
  const { stops, progress, segmentIndex, deviationMeters } = routeProgress(mission, route);
  const hasRecentGps = mission.lastPositionAt && Date.now() - new Date(mission.lastPositionAt).getTime() < 90000;
  const offRoute = hasRecentGps && progress > 1 && deviationMeters != null && deviationMeters > 250;
  const statusCode = scheduleCode(mission, clock);
  const markerProgress = Math.max(0, Math.min(86, progress * 0.86));
  const segmentHeight = stops.length > 1 ? 86 / (stops.length - 1) : 0;

  return <Box minH="100dvh" px={{ base: 4, md: 8 }} py={{ base: 4, md: 6 }} bg="gray.900" overflow="hidden">
    <HStack justify="space-between" align="start">
      <Box>
        <Text fontSize="xs" color="gray.400" fontWeight="700">INÉO · EN LIGNE</Text>
        <Heading size="sm" mt={1} noOfLines={1}>{mission.serviceName}</Heading>
        <Text mt={1} color="gray.300" fontSize="sm" noOfLines={1}>{route?.routeName || mission.serviceReference} · {mission.courseReference}</Text>
      </Box>
      <HStack spacing={4} align="start">
        <Box textAlign="right">
          <Text fontFamily="monospace" fontSize="24px" fontWeight="700">{clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
          <Text color={statusCode.startsWith('R') ? '#ff718a' : '#63d39f'} fontFamily="monospace" fontSize="18px" fontWeight="700">{statusCode}</Text>
        </Box>
        <Button size="sm" variant="outline" borderColor="gray.600" color="white" leftIcon={<FiMapPin />} onClick={onShowGps}>GPS</Button>
      </HStack>
    </HStack>
    <Box position="relative" h="420px" maxW="600px" mx="auto" mt={{ base: 8, md: 12 }}>
      {stops.length > 1 ? <>
        <Box position="absolute" top="7%" bottom="7%" left="34%" w="7px" bg="rbe.500" borderRadius="full" />
        {offRoute && <Box position="absolute" top={`${93 - (segmentIndex + 1) * segmentHeight}%`} left="34%" w="7px" h={`${segmentHeight}%`} bg="#ffd84e" borderRadius="full" />}
        {stops.map((stop, index) => {
          const top = 93 - (index / (stops.length - 1)) * 86;
          const affected = offRoute && index === segmentIndex + 1;
          return <Box key={`${stop.order}-${stop.lat}`} position="absolute" top={`${top}%`} left="34%" right="0" transform="translateY(-50%)" minH="32px">
            <Box position="absolute" top="50%" left="-7px" transform="translateY(-50%)" w="21px" h="21px" borderRadius="full" bg="gray.900" border="4px solid" borderColor={affected ? '#ffd84e' : 'white'} boxShadow={affected ? '0 0 14px #ffd84e' : 'none'} />
            <Text ml="31px" pr={3} color={affected ? '#ffe88b' : 'white'} fontSize={{ base: 'sm', md: 'md' }} fontWeight="700" noOfLines={2}>{stop.label}</Text>
          </Box>;
        })}
        <Box position="absolute" top={`${93 - markerProgress}%`} left={offRoute ? 'calc(34% + 28px)' : 'calc(34% - 13px)'} transform="translateY(-50%)" transition="top 700ms ease, left 300ms ease">
          <Icon as={FiNavigation} color="#9ae9ff" boxSize={9} transform="rotate(-45deg)" filter="drop-shadow(0 0 7px rgba(154,233,255,.8))" />
        </Box>
      </> : <Text mt={16} color="gray.400" textAlign="center">Itinéraire sans arrêts géocodés</Text>}
    </Box>
    {offRoute ? <Box borderLeft="4px solid" borderColor="#ffd84e" bg="rgba(214,158,46,.18)" px={4} py={3} maxW="560px" mx="auto"><Text color="#ffe88b" fontSize="sm" fontWeight="700">Écart d’itinéraire détecté</Text><Text color="gray.100" fontSize="xs">Retour attendu entre {stops[segmentIndex]?.label || 'l’arrêt précédent'} et {stops[segmentIndex + 1]?.label || 'l’arrêt suivant'} · {Math.round(deviationMeters)} m</Text></Box> : <HStack justify="center" color="gray.400" fontSize="sm"><Icon as={FiMapPin} color="#54d9aa" /><Text>{mission.lastPositionAt ? `Position reçue à ${formatTime(mission.lastPositionAt)}` : 'Recherche de position GPS'}</Text></HStack>}
  </Box>;
}

function LegacyTrilogyRouteLine({ mission, route, clock, onShowGps }) {
  const { stops, progress, segmentIndex, deviationMeters } = routeProgress(mission, route);
  const offRoute = deviationMeters != null && deviationMeters > 120;
  const statusCode = scheduleCode(mission, clock);
  const railHeight = 420;
  const lineProgress = Math.max(0, Math.min(86, progress * 0.86));
  const routeLineColor = 'rbe.500';
  const segmentHeight = stops.length > 1 ? 86 / (stops.length - 1) : 0;

  return <Box minH="100dvh" px={{ base: 4, md: 8 }} py={{ base: 4, md: 6 }} bg="gray.900" overflow="hidden"><HStack justify="space-between" align="start"><Box><Text fontSize="xs" color="gray.400" fontWeight="700">INÉO · EN LIGNE</Text><Heading size="sm" mt={1} noOfLines={1}>{mission.serviceName}</Heading><Text mt={1} color="gray.300" fontSize="sm" noOfLines={1}>{route?.routeName || mission.serviceReference} · {mission.courseReference}</Text></Box><HStack spacing={4} align="start"><Box textAlign="right"><Text fontFamily="monospace" fontSize="24px" fontWeight="700">{clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text><Text color={statusCode.startsWith('R') ? '#ff718a' : '#63d39f'} fontFamily="monospace" fontSize="18px" fontWeight="700">{statusCode}</Text></Box><Button size="sm" variant="outline" borderColor="gray.600" color="white" leftIcon={<FiMapPin />} onClick={onShowGps}>GPS</Button></HStack></HStack><Box position="relative" h={`${railHeight}px`} maxW="600px" mx="auto" mt={{ base: 8, md: 12 }}>{stops.length > 1 ? <><Box position="absolute" top="7%" bottom="7%" left="34%" w="7px" bg="rbe.500" borderRadius="full" /><Box position="absolute" top="7%" left="34%" w="7px" h={`${lineProgress}%`} bg="#54d9aa" borderRadius="full" transition="height 700ms ease" />{offRoute && <Box position="absolute" top={`${7 + segmentIndex * segmentHeight}%`} left="34%" w="7px" h={`${segmentHeight}%`} bg="#ffd84e" borderRadius="full" />}{stops.map((stop, index) => { const top = 7 + (index / (stops.length - 1)) * 86; const affected = offRoute && index === segmentIndex + 1; return <Box key={`${stop.order}-${stop.lat}`} position="absolute" top={`${top}%`} left="34%" right="0" transform="translateY(-50%)" minH="32px"><Box position="absolute" top="50%" left="-7px" transform="translateY(-50%)" w="21px" h="21px" borderRadius="full" bg="gray.900" border="4px solid" borderColor={affected ? '#ffd84e' : 'white'} boxShadow={affected ? '0 0 14px #ffd84e' : 'none'} /><Text ml="31px" pr={3} color={affected ? '#ffe88b' : 'white'} fontSize={{ base: 'sm', md: 'md' }} fontWeight="700" noOfLines={2}>{stop.label}</Text></Box>; })}<Box position="absolute" top={`${7 + lineProgress}%`} left={offRoute ? 'calc(34% + 28px)' : 'calc(34% - 13px)'} transform="translateY(-50%)" transition="top 700ms ease, left 300ms ease"><Icon as={FiNavigation} color="#9ae9ff" boxSize={9} transform="rotate(-45deg)" filter="drop-shadow(0 0 7px rgba(154,233,255,.8))" /></Box></> : <Text mt={16} color="gray.400" textAlign="center">Itinéraire sans arrêts géocodés</Text>}</Box>{offRoute ? <Box borderLeft="4px solid" borderColor="#ffd84e" bg="rgba(214,158,46,.18)" px={4} py={3} maxW="560px" mx="auto"><Text color="#ffe88b" fontSize="sm" fontWeight="700">Écart d’itinéraire détecté</Text><Text color="gray.100" fontSize="xs">Retour attendu entre {stops[segmentIndex]?.label || 'l’arrêt précédent'} et {stops[segmentIndex + 1]?.label || 'l’arrêt suivant'} · {Math.round(deviationMeters)} m</Text></Box> : <HStack justify="center" color="gray.400" fontSize="sm"><Icon as={FiMapPin} color="#54d9aa" /><Text>{mission.lastPositionAt ? `Position reçue à ${formatTime(mission.lastPositionAt)}` : 'Recherche de position GPS'}</Text></HStack>}</Box>;
}

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
  const [clock, setClock] = useState(() => new Date());
  const [activeView, setActiveView] = useState('service');
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
    const stopWatchingPosition = () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
    const startWatchingPosition = () => {
      stopWatchingPosition();
      watchId.current = navigator.geolocation.watchPosition(sendPosition, () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
    };
    const resumePositionDetection = () => {
      if (document.visibilityState === 'visible') startWatchingPosition();
    };
    startWatchingPosition();
    document.addEventListener('visibilitychange', resumePositionDetection);
    window.addEventListener('focus', resumePositionDetection);
    window.addEventListener('pageshow', resumePositionDetection);
    return () => {
      document.removeEventListener('visibilitychange', resumePositionDetection);
      window.removeEventListener('focus', resumePositionDetection);
      window.removeEventListener('pageshow', resumePositionDetection);
      stopWatchingPosition();
    };
  }, [mission?.id, mission?.status]);

  useEffect(() => {
    if (mission?.status !== 'ACTIVE') return undefined;
    const intervalId = window.setInterval(() => setClock(new Date()), 15000);
    return () => window.clearInterval(intervalId);
  }, [mission?.status]);

  useEffect(() => {
    if (mission?.status !== 'ACTIVE' || !navigator.wakeLock?.request) return undefined;
    let wakeLock = null;
    let disposed = false;
    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch (error) {
        console.warn('Inéo Wake Lock:', error.message);
      }
    };
    const restoreWakeLock = () => {
      if (!disposed && document.visibilityState === 'visible') requestWakeLock();
    };
    requestWakeLock();
    document.addEventListener('visibilitychange', restoreWakeLock);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', restoreWakeLock);
      wakeLock?.release().catch(() => {});
    };
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
  const statusCode = scheduleCode(mission, clock);
  const isLate = statusCode.startsWith('R');
  if (active) return <Box minH="100dvh" h="100dvh" overflow="hidden" bg="gray.900" color="white"><Grid h="full" templateColumns={{ base: 'minmax(0, 1fr) 280px', md: 'minmax(0, 1fr) 330px' }}><Box minW="0" minH="0" overflow="hidden">{activeView === 'service' ? <LegacyTrilogyRouteLine mission={mission} route={route} clock={clock} onShowGps={() => setActiveView('gps')} /> : <Box h="full" display="grid" gridTemplateRows="auto minmax(0, 1fr)"><HStack px={{ base: 4, md: 6 }} py={3} bg="gray.800" justify="space-between"><Button size="sm" variant="outline" borderColor="gray.600" color="white" leftIcon={<FiNavigation />} onClick={() => setActiveView('service')}>Service</Button><Text fontWeight="700">GPS</Text><Text fontFamily="monospace">{clock.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text></HStack><Box minH="0"><DriverMap mission={mission} route={route} /></Box></Box>}</Box><VStack align="stretch" spacing={0} bg="gray.800" p={5} justify="space-between" overflowY="auto"><Box><Text fontSize="xs" fontWeight="700" color="#9db7c8">INÉO · SERVICE EN COURS</Text><Heading size="md" mt={1}>{mission.serviceName}</Heading><Text mt={1} color="#c7d5df">{mission.serviceReference || 'Code service non renseigné'} · {route?.courseReference || 'Code course non renseigné'}</Text><Divider my={5} borderColor="#3c5464" /><HStack><Icon as={FiTruck} color="#66b7e8" /><Text>{vehicle.immat || mission.vehicleParc} · {vehicle.modele || 'Véhicule affecté'}</Text></HStack><HStack mt={4}><Icon as={FiActivity} color="#66b7e8" /><Text>{mission.lastSpeedKmh == null ? 'Vitesse en attente' : `${Math.round(mission.lastSpeedKmh)} km/h`}</Text></HStack><HStack mt={4}><Icon as={FiMapPin} color="#66b7e8" /><Text>{mission.lastPositionAt ? `GPS reçu à ${formatTime(mission.lastPositionAt)}` : 'Recherche GPS en cours'}</Text></HStack><Divider my={5} borderColor="#3c5464" /><HStack align="center" spacing={4}><Box w="12px" h="116px" borderRadius="full" bg={isLate ? '#d7194b' : '#22a06b'} position="relative"><Icon as={FiNavigation} position="absolute" color="white" left="-6px" top="50%" transform="translateY(-50%)" boxSize={6} /></Box><Text color={isLate ? '#ff718a' : '#63d39f'} fontFamily="monospace" fontSize="30px" fontWeight="700">{statusCode}</Text></HStack></Box><Button mt={6} w="full" minH="52px" colorScheme="red" leftIcon={<FiCheckCircle />} isLoading={submitting} onClick={complete}>Terminer le service</Button></VStack></Grid></Box>;

  return <Box bg="gray.100" minH="100vh" py={8}><Container maxW="md"><VStack align="stretch" spacing={4}><Box bg="rbe.800" color="white" p={5} borderLeft="4px solid" borderColor="rbe.500"><Text fontWeight="bold" fontSize="xs" color="whiteAlpha.700">INÉO RÉTROBUS · CONDUCTEUR</Text><Heading mt={1} size="md">Bonjour, {driverName}</Heading><HStack mt={4} justify="space-between"><Text fontSize="sm">{mission.serviceName}</Text><Badge colorScheme="orange">À PRENDRE</Badge></HStack></Box><Box bg="white" p={5} boxShadow="sm"><HStack align="start" spacing={3}><Icon as={FiTruck} color="rbe.600" boxSize={6} /><VStack align="start" spacing={1}><Text fontSize="xs" color="gray.500" fontWeight="bold">SERVICE LE PLUS PROCHE</Text><Heading size="sm">{vehicle.modele || `Parc ${mission.vehicleParc}`}</Heading><Text fontSize="sm" color="gray.600">Départ prévu {formatTime(mission.scheduledDeparture)} · arrivée {formatTime(mission.scheduledArrival)}</Text></VStack></HStack><Divider my={5} /><VStack align="stretch" spacing={4}><FormControl isRequired><FormLabel>Code service</FormLabel><HStack><Box bg="gray.100" px={3} py={2} border="1px solid" borderColor="gray.200" fontWeight="700">RBE-</Box><Input value={serviceSuffix} onChange={(event) => setServiceSuffix(event.target.value.toUpperCase())} placeholder="999-999" inputMode="numeric" autoCapitalize="characters" /></HStack></FormControl><FormControl isRequired><FormLabel>Code course</FormLabel><Input value={courseReference} onChange={(event) => setCourseReference(event.target.value.toUpperCase())} placeholder="999-26726-920" inputMode="numeric" autoCapitalize="characters" /></FormControl></VStack></Box><Button colorScheme="orange" size="lg" leftIcon={<FiPlay />} isLoading={submitting} onClick={start}>Valider la prise de service</Button><Button as={RouterLink} to="/myrbe/ineo-retrobus/tracage-libre" variant="outline" colorScheme="orange" leftIcon={<FiActivity />}>Traçage libre</Button></VStack></Container></Box>;
}
