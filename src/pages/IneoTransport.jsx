import React, { useEffect, useState } from 'react';
import { Box, Button, Collapse, FormControl, FormLabel, Grid, HStack, IconButton, Input, Select, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useToast } from '@chakra-ui/react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { FiChevronDown, FiChevronRight, FiEdit2, FiMapPin, FiPlus, FiRefreshCw, FiSave, FiSearch, FiSmartphone } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';
import IneoCourseRouteModal from './IneoCourseRouteModal';
import 'leaflet/dist/leaflet.css';

const blankTracker = { vehicleParc: '', imei: '', deviceLabel: '' };
const formatDate = (value) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'Aucune position';
const routeStart = (route) => route.stops?.[0]?.label || '-';
const routeEnd = (route) => route.stops?.at(-1)?.label || '-';

function SubTab({ active, children, onClick }) {
  return <Button onClick={onClick} borderRadius="2px" size="sm" variant={active ? 'solid' : 'outline'} colorScheme={active ? 'blue' : 'gray'}>{children}</Button>;
}

function FitVehiclePositions({ trackers, focusedTrackerId }) {
  const map = useMap();
  useEffect(() => {
    const focusedTracker = trackers.find((tracker) => tracker.id === focusedTrackerId);
    if (focusedTracker) {
      map.setView([focusedTracker.lastLatitude, focusedTracker.lastLongitude], 16);
      return;
    }
    if (trackers.length === 1) map.setView([trackers[0].lastLatitude, trackers[0].lastLongitude], 14);
  }, [focusedTrackerId, map, trackers]);
  return null;
}

function VehiclePositionMap({ trackers, cities, focusedTrackerId }) {
  const locatedTrackers = trackers.filter((tracker) => tracker.lastLatitude != null && tracker.lastLongitude != null);
  const initialCenter = locatedTrackers.length ? [locatedTrackers[0].lastLatitude, locatedTrackers[0].lastLongitude] : [48.632, 2.447];
  return <Box border="1px solid" borderColor="#c6d0d8" h={{ base: '320px', md: '440px' }} overflow="hidden" position="relative"><MapContainer center={initialCenter} zoom={locatedTrackers.length ? 12 : 11} style={{ height: '100%', width: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />{locatedTrackers.length > 0 && <FitVehiclePositions trackers={locatedTrackers} focusedTrackerId={focusedTrackerId} />}{locatedTrackers.map((tracker) => <CircleMarker key={tracker.id} center={[tracker.lastLatitude, tracker.lastLongitude]} radius={10} pathOptions={{ color: '#005a9e', fillColor: '#d7194b', fillOpacity: 0.9 }}><Popup><strong>{tracker.vehicleParc}</strong><br />{cities[tracker.id] || 'Localisation GPS'}<br />{tracker.lastLatitude.toFixed(5)}, {tracker.lastLongitude.toFixed(5)}<br />{formatDate(tracker.lastPositionAt)}</Popup></CircleMarker>)}</MapContainer>{!locatedTrackers.length && <Box position="absolute" zIndex={400} bottom={3} left={3} bg="white" border="1px solid" borderColor="#c6d0d8" px={3} py={2} fontSize="sm" color="#60727e">En attente d'une position GPS véhicule.</Box>}</Box>;
}

export default function IneoTransport({ vehicles }) {
  const toast = useToast();
  const [tab, setTab] = useState('positions');
  const [trackers, setTrackers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [trackerForm, setTrackerForm] = useState(blankTracker);
  const [courseReference, setCourseReference] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchingCourse, setSearchingCourse] = useState(false);
  const [openTrackerId, setOpenTrackerId] = useState(null);
  const [focusedTrackerId, setFocusedTrackerId] = useState(null);
  const [cities, setCities] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      const [trackerData, routeData, profileData] = await Promise.all([ineoAPI.listVehicleTrackers(), ineoAPI.listRoutes(), ineoAPI.listVehicleProfiles()]);
      setTrackers(trackerData?.trackers || []);
      setRoutes(routeData?.routes || []);
      setProfiles(profileData?.profiles || []);
    } catch (error) {
      toast({ status: 'error', title: 'Carte Inéo indisponible', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const controller = new AbortController();
    const locateTrackers = async () => {
      const locatedTrackers = trackers.filter((tracker) => tracker.lastLatitude != null && tracker.lastLongitude != null && !cities[tracker.id]);
      const results = await Promise.all(locatedTrackers.map(async (tracker) => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${tracker.lastLatitude}&lon=${tracker.lastLongitude}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
          if (!response.ok) return null;
          const data = await response.json();
          const address = data.address || {};
          return [tracker.id, address.city || address.town || address.village || address.municipality || address.county || 'Localisation GPS'];
        } catch {
          return null;
        }
      }));
      const resolvedCities = Object.fromEntries(results.filter(Boolean));
      if (Object.keys(resolvedCities).length) setCities((current) => ({ ...current, ...resolvedCities }));
    };
    locateTrackers();
    return () => controller.abort();
  }, [trackers]);

  const saveTracker = async (event) => {
    event.preventDefault();
    if (!trackerForm.vehicleParc || !trackerForm.imei) {
      toast({ status: 'warning', title: 'Véhicule et IMEI requis' });
      return;
    }
    try {
      setSaving(true);
      await ineoAPI.saveVehicleTracker(trackerForm.vehicleParc, trackerForm);
      setTrackerForm(blankTracker);
      await load();
      toast({ status: 'success', title: 'Appareil Urbex rattaché au véhicule' });
    } catch (error) {
      toast({ status: 'error', title: 'Rattachement IMEI impossible', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const lookupCourse = async () => {
    const reference = courseReference.trim().toUpperCase();
    if (!reference) {
      toast({ status: 'warning', title: 'Saisissez une référence de course' });
      return;
    }
    try {
      setSearchingCourse(true);
      const data = await ineoAPI.findRouteByReference(reference);
      setSelectedRoute(data.route);
      setCourseModalOpen(true);
      toast({ status: 'success', title: 'Course retrouvée', description: `${data.source === 'mission' ? 'Service Inéo prérempli' : data.route.lineName || 'Ligne non renseignée'} · ${data.route.scheduledDeparture || '--:--'} → ${data.route.scheduledArrival || '--:--'}` });
    } catch (error) {
      if (error.message.includes('[RBE-API-404]')) {
        setSelectedRoute({ courseReference: reference });
        setCourseModalOpen(true);
        toast({ status: 'info', title: 'Nouvelle référence', description: 'La course n’existe pas encore: complétez ses informations.' });
        return;
      }
      toast({ status: 'error', title: 'Recherche impossible', description: error.message });
    } finally {
      setSearchingCourse(false);
    }
  };

  const saveCourse = async (route) => {
    try {
      const data = await ineoAPI.saveRouteByReference(route.courseReference, route);
      setSelectedRoute(data.route);
      setCourseReference(data.route.courseReference);
      setRoutes((current) => [data.route, ...current.filter((item) => item.courseReference !== data.route.courseReference)]);
      toast({ status: 'success', title: 'Course enregistrée', description: `${data.route.stops?.length || 0} étape(s) sauvegardée(s).` });
    } catch (error) {
      toast({ status: 'error', title: 'Enregistrement impossible', description: error.message });
      throw error;
    }
  };

  const openCourse = (route = { courseReference: '' }) => {
    setSelectedRoute(route);
    setCourseModalOpen(true);
  };

  return <VStack align="stretch" spacing={4}>
    <Box borderBottom="1px solid" borderColor="#b7c4cd" pb={3}><HStack justify="space-between" flexWrap="wrap" gap={3}><Box><Text fontSize="20px" fontWeight="700" color="#17364d">Carte de transport</Text><Text color="#60727e">Suivi des appareils Urbex, courses, lignes et itinéraires.</Text></Box><Button size="sm" borderRadius="2px" leftIcon={<FiRefreshCw />} isLoading={loading} onClick={load}>Actualiser</Button></HStack></Box>
    <HStack spacing={2} borderBottom="1px solid" borderColor="#c6d0d8" pb={3}><SubTab active={tab === 'positions'} onClick={() => setTab('positions')}>Position VH</SubTab><SubTab active={tab === 'routes'} onClick={() => setTab('routes')}>Itinéraires et lignes</SubTab></HStack>

    {tab === 'positions' ? <>
      <Box as="form" onSubmit={saveTracker} border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={4}><Text fontWeight="700" mb={3}>Rattacher un appareil Urbex</Text><Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr auto' }} gap={3} alignItems="end"><FormControl isRequired><FormLabel>Véhicule</FormLabel><Select bg="white" value={trackerForm.vehicleParc} onChange={(event) => setTrackerForm((current) => ({ ...current, vehicleParc: event.target.value }))} placeholder="Choisir un véhicule">{vehicles.map((vehicle) => <option key={vehicle.parc} value={vehicle.parc}>{vehicle.parc} - {vehicle.immat || vehicle.modele}</option>)}</Select></FormControl><FormControl isRequired><FormLabel>IMEI</FormLabel><Input bg="white" inputMode="numeric" value={trackerForm.imei} onChange={(event) => setTrackerForm((current) => ({ ...current, imei: event.target.value.replace(/\D/g, '') }))} placeholder="15 chiffres" /></FormControl><FormControl><FormLabel>Nom de l’appareil</FormLabel><Input bg="white" value={trackerForm.deviceLabel} onChange={(event) => setTrackerForm((current) => ({ ...current, deviceLabel: event.target.value }))} placeholder="Ex. Urbex VH 920" /></FormControl><Button type="submit" isLoading={saving} leftIcon={<FiSave />} colorScheme="blue" borderRadius="2px">Rattacher</Button></Grid></Box>
      <Box border="1px solid" borderColor="#c6d0d8" overflowX="auto"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th w="40px"></Th><Th>Véhicule</Th><Th>Appareil</Th><Th>Position</Th><Th>Vitesse</Th><Th>Dernière mise à jour</Th></Tr></Thead><Tbody>{loading ? <Tr><Td colSpan={6}><HStack justify="center" py={5}><Spinner color="#005a9e" /></HStack></Td></Tr> : trackers.length ? trackers.map((tracker) => <React.Fragment key={tracker.id}><Tr _hover={{ bg: '#f3f8fb' }}><Td><IconButton aria-label="Afficher les détails de l'appareil" icon={openTrackerId === tracker.id ? <FiChevronDown /> : <FiChevronRight />} size="xs" variant="ghost" onClick={() => setOpenTrackerId((current) => current === tracker.id ? null : tracker.id)} /></Td><Td fontWeight="700">{tracker.vehicleParc}</Td><Td><HStack><FiSmartphone /><Text>{tracker.deviceLabel || 'Urbex'}</Text></HStack></Td><Td>{tracker.lastLatitude == null ? <Text color="gray.500">Position : aucune</Text> : <Button size="xs" variant="link" color="#005a9e" leftIcon={<FiMapPin />} onClick={() => { setFocusedTrackerId(tracker.id); setOpenTrackerId(tracker.id); }}>Position : {cities[tracker.id] || 'localisation GPS'}</Button>}</Td><Td>{tracker.lastSpeedKmh == null ? '-' : `${Math.round(tracker.lastSpeedKmh)} km/h`}</Td><Td>{formatDate(tracker.lastPositionAt)}</Td></Tr><Tr><Td colSpan={6} p={0} border={0}><Collapse in={openTrackerId === tracker.id} animateOpacity><Box bg="#f8fafb" px={5} py={4} borderTop="1px solid" borderColor="#d7e0e6"><Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={3} fontSize="sm"><Box><Text color="#60727e">IMEI</Text><Text fontFamily="monospace">{tracker.imei}</Text></Box><Box><Text color="#60727e">Ville</Text><Text>{cities[tracker.id] || (tracker.lastLatitude == null ? 'Aucune position' : 'Recherche en cours...')}</Text></Box><Box><Text color="#60727e">Coordonnées</Text><Text>{tracker.lastLatitude == null ? '-' : `${tracker.lastLatitude.toFixed(5)}, ${tracker.lastLongitude.toFixed(5)}`}</Text></Box><Box><Text color="#60727e">Précision</Text><Text>{tracker.lastAccuracy == null ? '-' : `${Math.round(tracker.lastAccuracy)} m`}</Text></Box></Grid>{tracker.lastLatitude != null && <Button as="a" mt={3} href={`https://www.openstreetmap.org/?mlat=${tracker.lastLatitude}&mlon=${tracker.lastLongitude}#map=16/${tracker.lastLatitude}/${tracker.lastLongitude}`} target="_blank" rel="noreferrer" size="sm" variant="outline" colorScheme="blue" leftIcon={<FiMapPin />}>Ouvrir dans OpenStreetMap</Button>}</Box></Collapse></Td></Tr></React.Fragment>) : <Tr><Td colSpan={6} color="gray.500">Aucun appareil Urbex rattaché.</Td></Tr>}</Tbody></Table></Box>
      <VehiclePositionMap trackers={trackers} cities={cities} focusedTrackerId={focusedTrackerId} />
    </> : <>
      <Box border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={4}><HStack align="end" flexWrap="wrap" gap={3}><FormControl maxW="360px"><FormLabel>Référence course</FormLabel><Input bg="white" value={courseReference} onChange={(event) => setCourseReference(event.target.value)} placeholder="RBE-991-4826" onKeyDown={(event) => event.key === 'Enter' && lookupCourse()} /></FormControl><Button leftIcon={<FiSearch />} isLoading={searchingCourse} colorScheme="blue" borderRadius="2px" onClick={lookupCourse}>Rechercher</Button><Button leftIcon={<FiPlus />} borderRadius="2px" variant="outline" onClick={() => openCourse()}>Nouvelle course</Button></HStack><Text mt={3} fontSize="sm" color="#60727e">La recherche recharge automatiquement la ligne, les heures et les étapes déjà enregistrées pour cette référence.</Text></Box>
      <Box border="1px solid" borderColor="#c6d0d8" overflowX="auto"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Référence</Th><Th>Ligne</Th><Th>Horaires</Th><Th>Itinéraire</Th><Th>Premier départ</Th><Th>Dernière étape</Th><Th></Th></Tr></Thead><Tbody>{loading ? <Tr><Td colSpan={7}><HStack justify="center" py={5}><Spinner color="#005a9e" /></HStack></Td></Tr> : routes.length ? routes.map((route) => <Tr key={route.id}><Td fontWeight="700">{route.courseReference}</Td><Td>{route.lineName || '-'}</Td><Td>{route.scheduledDeparture || '--:--'} → {route.scheduledArrival || '--:--'}</Td><Td>{route.routeName}</Td><Td maxW="230px" noOfLines={1}>{routeStart(route)}</Td><Td maxW="230px" noOfLines={1}>{routeEnd(route)}</Td><Td><Button size="xs" leftIcon={<FiEdit2 />} borderRadius="2px" onClick={() => openCourse(route)}>Modifier</Button></Td></Tr>) : <Tr><Td colSpan={7} color="gray.500">Aucune course enregistrée.</Td></Tr>}</Tbody></Table></Box>
    </>}
    <IneoCourseRouteModal isOpen={courseModalOpen} onClose={() => setCourseModalOpen(false)} initialRoute={selectedRoute} profiles={profiles} vehicles={vehicles} onSave={saveCourse} />
  </VStack>;
}