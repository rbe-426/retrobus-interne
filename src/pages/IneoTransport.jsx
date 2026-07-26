import React, { useEffect, useState } from 'react';
import { Box, Button, FormControl, FormLabel, Grid, HStack, Input, Select, Spinner, Table, Tbody, Td, Text, Textarea, Th, Thead, Tr, VStack, useToast } from '@chakra-ui/react';
import { FiMapPin, FiPlus, FiRefreshCw, FiSave, FiSmartphone } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';

const blankTracker = { vehicleParc: '', imei: '', deviceLabel: '' };
const blankRoute = { courseReference: '', lineName: '', routeName: '', origin: '', destination: '', notes: '' };
const formatDate = (value) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'Aucune position';

function SubTab({ active, children, onClick }) {
  return <Button onClick={onClick} borderRadius="2px" size="sm" variant={active ? 'solid' : 'outline'} colorScheme={active ? 'blue' : 'gray'}>{children}</Button>;
}

export default function IneoTransport({ vehicles }) {
  const toast = useToast();
  const [tab, setTab] = useState('positions');
  const [trackers, setTrackers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trackerForm, setTrackerForm] = useState(blankTracker);
  const [routeForm, setRouteForm] = useState(blankRoute);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const saveRoute = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await ineoAPI.createRoute(routeForm);
      setRouteForm(blankRoute);
      await load();
      toast({ status: 'success', title: 'Itinéraire enregistré' });
    } catch (error) {
      toast({ status: 'error', title: 'Création impossible', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return <VStack align="stretch" spacing={4}>
    <Box borderBottom="1px solid" borderColor="#b7c4cd" pb={3}>
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box><Text fontSize="20px" fontWeight="700" color="#17364d">Carte de transport</Text><Text color="#60727e">Suivi des appareils Urbex et référentiel de courses.</Text></Box>
        <Button size="sm" borderRadius="2px" leftIcon={<FiRefreshCw />} isLoading={loading} onClick={load}>Actualiser</Button>
      </HStack>
    </Box>
    <HStack spacing={2} borderBottom="1px solid" borderColor="#c6d0d8" pb={3}><SubTab active={tab === 'positions'} onClick={() => setTab('positions')}>Position VH</SubTab><SubTab active={tab === 'routes'} onClick={() => setTab('routes')}>Itinéraires et lignes</SubTab></HStack>

    {tab === 'positions' ? <>
      <Box as="form" onSubmit={saveTracker} border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={4}>
        <Text fontWeight="700" mb={3}>Rattacher un appareil Urbex</Text>
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr auto' }} gap={3} alignItems="end">
          <FormControl isRequired><FormLabel>Véhicule</FormLabel><Select bg="white" value={trackerForm.vehicleParc} onChange={(event) => setTrackerForm((current) => ({ ...current, vehicleParc: event.target.value }))} placeholder="Choisir un véhicule">{vehicles.map((vehicle) => <option key={vehicle.parc} value={vehicle.parc}>{vehicle.parc} - {vehicle.immat || vehicle.modele}</option>)}</Select></FormControl>
          <FormControl isRequired><FormLabel>IMEI</FormLabel><Input bg="white" inputMode="numeric" value={trackerForm.imei} onChange={(event) => setTrackerForm((current) => ({ ...current, imei: event.target.value.replace(/\D/g, '') }))} placeholder="15 chiffres" /></FormControl>
          <FormControl><FormLabel>Nom de l’appareil</FormLabel><Input bg="white" value={trackerForm.deviceLabel} onChange={(event) => setTrackerForm((current) => ({ ...current, deviceLabel: event.target.value }))} placeholder="Ex. Urbex VH 920" /></FormControl>
          <Button type="submit" isLoading={saving} leftIcon={<FiSave />} colorScheme="blue" borderRadius="2px">Rattacher</Button>
        </Grid>
      </Box>
      <Box border="1px solid" borderColor="#c6d0d8" overflowX="auto"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Véhicule</Th><Th>Appareil</Th><Th>IMEI</Th><Th>Dernière position</Th><Th>Vitesse</Th><Th>Carte</Th></Tr></Thead><Tbody>{loading ? <Tr><Td colSpan={6}><HStack justify="center" py={5}><Spinner color="#005a9e" /></HStack></Td></Tr> : trackers.length ? trackers.map((tracker) => <Tr key={tracker.id}><Td fontWeight="700">{tracker.vehicleParc}</Td><Td><HStack><FiSmartphone /> <Text>{tracker.deviceLabel || 'Urbex'}</Text></HStack></Td><Td fontFamily="monospace">{tracker.imei}</Td><Td>{formatDate(tracker.lastPositionAt)}</Td><Td>{tracker.lastSpeedKmh == null ? '-' : `${Math.round(tracker.lastSpeedKmh)} km/h`}</Td><Td>{tracker.lastLatitude == null ? '-' : <Button as="a" href={`https://www.openstreetmap.org/?mlat=${tracker.lastLatitude}&mlon=${tracker.lastLongitude}#map=16/${tracker.lastLatitude}/${tracker.lastLongitude}`} target="_blank" rel="noreferrer" size="xs" variant="link" color="#005a9e" leftIcon={<FiMapPin />}>Voir</Button>}</Td></Tr>) : <Tr><Td colSpan={6} color="gray.500">Aucun appareil Urbex rattaché.</Td></Tr>}</Tbody></Table></Box>
      <Text fontSize="xs" color="#60727e">La position est actualisée quand le terminal Urbex transmet son GPS à l’API avec l’IMEI rattaché et une mission active autorisée.</Text>
    </> : <>
      <Box as="form" onSubmit={saveRoute} border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={4}>
        <Text fontWeight="700" mb={3}>Créer une ligne ou rattacher une référence de course</Text>
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={3}>
          <FormControl isRequired><FormLabel>Référence course</FormLabel><Input bg="white" value={routeForm.courseReference} onChange={(event) => setRouteForm((current) => ({ ...current, courseReference: event.target.value }))} placeholder="RBE-991-4826" /></FormControl>
          <FormControl><FormLabel>Ligne</FormLabel><Input bg="white" value={routeForm.lineName} onChange={(event) => setRouteForm((current) => ({ ...current, lineName: event.target.value }))} placeholder="Ex. Ligne patrimoine" /></FormControl>
          <FormControl isRequired><FormLabel>Nom de l’itinéraire</FormLabel><Input bg="white" value={routeForm.routeName} onChange={(event) => setRouteForm((current) => ({ ...current, routeName: event.target.value }))} placeholder="Ex. Gare - Musée" /></FormControl>
          <FormControl><FormLabel>Origine</FormLabel><Input bg="white" value={routeForm.origin} onChange={(event) => setRouteForm((current) => ({ ...current, origin: event.target.value }))} /></FormControl>
          <FormControl><FormLabel>Destination</FormLabel><Input bg="white" value={routeForm.destination} onChange={(event) => setRouteForm((current) => ({ ...current, destination: event.target.value }))} /></FormControl>
          <FormControl gridColumn={{ base: 'auto', md: 'span 3' }}><FormLabel>Observations</FormLabel><Textarea bg="white" value={routeForm.notes} onChange={(event) => setRouteForm((current) => ({ ...current, notes: event.target.value }))} /></FormControl>
        </Grid>
        <HStack justify="flex-end" mt={4}><Button type="submit" isLoading={saving} colorScheme="blue" borderRadius="2px" leftIcon={<FiPlus />}>Enregistrer</Button></HStack>
      </Box>
      <Box border="1px solid" borderColor="#c6d0d8" overflowX="auto"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Référence course</Th><Th>Ligne</Th><Th>Itinéraire</Th><Th>Origine</Th><Th>Destination</Th></Tr></Thead><Tbody>{loading ? <Tr><Td colSpan={5}><HStack justify="center" py={5}><Spinner color="#005a9e" /></HStack></Td></Tr> : routes.length ? routes.map((route) => <Tr key={route.id}><Td fontWeight="700">{route.courseReference}</Td><Td>{route.lineName || '-'}</Td><Td>{route.routeName}</Td><Td>{route.origin || '-'}</Td><Td>{route.destination || '-'}</Td></Tr>) : <Tr><Td colSpan={5} color="gray.500">Aucun itinéraire enregistré.</Td></Tr>}</Tbody></Table></Box>
    </>}
  </VStack>;
}