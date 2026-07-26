import React, { useEffect, useState } from 'react';
import { Box, Button, FormControl, FormLabel, Grid, HStack, Input, Select, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useToast } from '@chakra-ui/react';
import { FiEdit2, FiMapPin, FiPlus, FiRefreshCw, FiSave, FiSearch, FiSmartphone } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';
import IneoCourseRouteModal from './IneoCourseRouteModal';

const blankTracker = { vehicleParc: '', imei: '', deviceLabel: '' };
const formatDate = (value) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'Aucune position';
const routeStart = (route) => route.stops?.[0]?.label || '-';
const routeEnd = (route) => route.stops?.at(-1)?.label || '-';

function SubTab({ active, children, onClick }) {
  return <Button onClick={onClick} borderRadius="2px" size="sm" variant={active ? 'solid' : 'outline'} colorScheme={active ? 'blue' : 'gray'}>{children}</Button>;
}

export default function IneoTransport({ vehicles }) {
  const toast = useToast();
  const [tab, setTab] = useState('positions');
  const [trackers, setTrackers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trackerForm, setTrackerForm] = useState(blankTracker);
  const [courseReference, setCourseReference] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchingCourse, setSearchingCourse] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [trackerData, routeData] = await Promise.all([ineoAPI.listVehicleTrackers(), ineoAPI.listRoutes()]);
      setTrackers(trackerData?.trackers || []);
      setRoutes(routeData?.routes || []);
    } catch (error) {
      toast({ status: 'error', title: 'Carte Inéo indisponible', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
      toast({ status: 'success', title: 'Course retrouvée', description: `${data.route.lineName || 'Ligne non renseignée'} · ${data.route.scheduledDeparture || '--:--'} → ${data.route.scheduledArrival || '--:--'}` });
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
      <Box border="1px solid" borderColor="#c6d0d8" overflowX="auto"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Véhicule</Th><Th>Appareil</Th><Th>IMEI</Th><Th>Dernière position</Th><Th>Vitesse</Th><Th>Carte</Th></Tr></Thead><Tbody>{loading ? <Tr><Td colSpan={6}><HStack justify="center" py={5}><Spinner color="#005a9e" /></HStack></Td></Tr> : trackers.length ? trackers.map((tracker) => <Tr key={tracker.id}><Td fontWeight="700">{tracker.vehicleParc}</Td><Td><HStack><FiSmartphone /><Text>{tracker.deviceLabel || 'Urbex'}</Text></HStack></Td><Td fontFamily="monospace">{tracker.imei}</Td><Td>{formatDate(tracker.lastPositionAt)}</Td><Td>{tracker.lastSpeedKmh == null ? '-' : `${Math.round(tracker.lastSpeedKmh)} km/h`}</Td><Td>{tracker.lastLatitude == null ? '-' : <Button as="a" href={`https://www.openstreetmap.org/?mlat=${tracker.lastLatitude}&mlon=${tracker.lastLongitude}#map=16/${tracker.lastLatitude}/${tracker.lastLongitude}`} target="_blank" rel="noreferrer" size="xs" variant="link" color="#005a9e" leftIcon={<FiMapPin />}>Voir</Button>}</Td></Tr>) : <Tr><Td colSpan={6} color="gray.500">Aucun appareil Urbex rattaché.</Td></Tr>}</Tbody></Table></Box>
    </> : <>
      <Box border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={4}><HStack align="end" flexWrap="wrap" gap={3}><FormControl maxW="360px"><FormLabel>Référence course</FormLabel><Input bg="white" value={courseReference} onChange={(event) => setCourseReference(event.target.value)} placeholder="RBE-991-4826" onKeyDown={(event) => event.key === 'Enter' && lookupCourse()} /></FormControl><Button leftIcon={<FiSearch />} isLoading={searchingCourse} colorScheme="blue" borderRadius="2px" onClick={lookupCourse}>Rechercher</Button><Button leftIcon={<FiPlus />} borderRadius="2px" variant="outline" onClick={() => openCourse()}>Nouvelle course</Button></HStack><Text mt={3} fontSize="sm" color="#60727e">La recherche recharge automatiquement la ligne, les heures et les étapes déjà enregistrées pour cette référence.</Text></Box>
      <Box border="1px solid" borderColor="#c6d0d8" overflowX="auto"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Référence</Th><Th>Ligne</Th><Th>Horaires</Th><Th>Itinéraire</Th><Th>Premier départ</Th><Th>Dernière étape</Th><Th></Th></Tr></Thead><Tbody>{loading ? <Tr><Td colSpan={7}><HStack justify="center" py={5}><Spinner color="#005a9e" /></HStack></Td></Tr> : routes.length ? routes.map((route) => <Tr key={route.id}><Td fontWeight="700">{route.courseReference}</Td><Td>{route.lineName || '-'}</Td><Td>{route.scheduledDeparture || '--:--'} → {route.scheduledArrival || '--:--'}</Td><Td>{route.routeName}</Td><Td maxW="230px" noOfLines={1}>{routeStart(route)}</Td><Td maxW="230px" noOfLines={1}>{routeEnd(route)}</Td><Td><Button size="xs" leftIcon={<FiEdit2 />} borderRadius="2px" onClick={() => openCourse(route)}>Modifier</Button></Td></Tr>) : <Tr><Td colSpan={7} color="gray.500">Aucune course enregistrée.</Td></Tr>}</Tbody></Table></Box>
    </>}
    <IneoCourseRouteModal isOpen={courseModalOpen} onClose={() => setCourseModalOpen(false)} initialRoute={selectedRoute} onSave={saveCourse} />
  </VStack>;
}