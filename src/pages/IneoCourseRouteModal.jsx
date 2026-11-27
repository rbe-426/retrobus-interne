import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertIcon, Badge, Box, Button, Checkbox, FormControl, FormLabel, Grid, HStack, IconButton, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Select, Spinner, Text, Textarea, VStack, useToast } from '@chakra-ui/react';
import { FiAlertTriangle, FiInfo, FiMapPin, FiMinus, FiPlus, FiSave, FiSearch } from 'react-icons/fi';
import RouteMap from '../components/RouteMap';
import { ineoAPI } from '../api/ineo';
import 'leaflet/dist/leaflet.css';

const emptyStop = () => ({ label: '', scheduledTime: '', lat: null, lng: null });
const normalizeSearchText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const buildSearchQueries = (value) => {
  const normalized = normalizeSearchText(value);
  const variants = [value.trim(), `${value.trim()}, France`];
  if (normalized.includes('mcdo') || normalized.includes('mcdonald')) variants.push("McDonald's ${value.replace(/mcdo|mcdonalds?/i, '').trim()}, France");
  if (normalized.includes('evry')) variants.push(value.replace(/evry/ig, 'Évry-Courcouronnes'));
  return [...new Set(variants.filter(Boolean))];
};

const scorePlace = (place, query) => {
  const text = normalizeSearchText([place.display_name, place.name, place.type, place.class].filter(Boolean).join(' '));
  const words = normalizeSearchText(query).split(/\s+/).filter((word) => word.length > 1);
  return words.reduce((score, word) => score + (text.includes(word) ? 4 : 0), 0) + Number(place.importance || 0) * 10;
};

export default function IneoCourseRouteModal({ isOpen, onClose, initialRoute, profiles, vehicles, onSave }) {
  const toast = useToast();
  const searchTimeouts = useRef({});
  const [form, setForm] = useState({ courseReference: '', serviceReference: '', lineName: '', routeName: '', vehicleParc: '', scheduledDeparture: '', scheduledArrival: '', stops: [emptyStop()], notes: '' });
  const [suggestions, setSuggestions] = useState({});
  const [searching, setSearching] = useState({});
  const [referenceMatches, setReferenceMatches] = useState([]);
  const [searchingReferences, setSearchingReferences] = useState(false);
  const [estimatedDeparture, setEstimatedDeparture] = useState(null);
  const [estimatingDeparture, setEstimatingDeparture] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFreeTracking, setIsFreeTracking] = useState(false);
  const [generatingFreeCode, setGeneratingFreeCode] = useState(false);
  const [focusedStop, setFocusedStop] = useState(null);
  const [hoveredStop, setHoveredStop] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      courseReference: initialRoute?.courseReference || '',
      serviceReference: initialRoute?.serviceReference || '',
      lineName: initialRoute?.lineName || '',
      routeName: initialRoute?.routeName || '',
      vehicleParc: initialRoute?.vehicleParc || '',
      scheduledDeparture: initialRoute?.scheduledDeparture || '',
      scheduledArrival: initialRoute?.scheduledArrival || '',
      stops: initialRoute?.stops?.length ? initialRoute.stops.map((stop) => ({ ...emptyStop(), ...stop })) : [emptyStop()],
      notes: initialRoute?.notes || '',
    });
    setSuggestions({});
    setReferenceMatches([]);
    setEstimatedDeparture(null);
    setIsFreeTracking(initialRoute?.serviceReference === 'RBE-999-999');
    setFocusedStop(null);
    setHoveredStop(null);
    setRouteInfo(null);
  }, [initialRoute, isOpen]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateStop = (index, changes) => setForm((current) => ({ ...current, stops: current.stops.map((stop, stopIndex) => stopIndex === index ? { ...stop, ...changes } : stop) }));
  const selectedProfile = profiles.find((profile) => profile.vehicleParc === form.vehicleParc);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.parc === form.vehicleParc);
  const vehicleConstraints = selectedProfile ? {
    vehicleType: selectedProfile.vehicleType || selectedVehicle?.type || 'BUS',
    maxSpeedKmh: selectedProfile.maxSpeedKmh ?? null,
    lengthM: selectedProfile.lengthM ?? null,
    widthM: selectedProfile.widthM ?? null,
    heightM: selectedProfile.heightM ?? null,
  } : initialRoute?.vehicleConstraints || null;

  const searchReferences = async (value) => {
    if (value.trim().length < 2) {
      setReferenceMatches([]);
      return;
    }
    try {
      setSearchingReferences(true);
      const data = await ineoAPI.searchRouteReferences(value);
      setReferenceMatches(data?.matches || []);
    } catch {
      setReferenceMatches([]);
    } finally {
      setSearchingReferences(false);
    }
  };

  const mergeReference = (match) => {
    const route = match.route || {};
    setForm((current) => ({
      ...current,
      serviceReference: route.serviceReference || current.serviceReference,
      courseReference: match.source === 'route' ? route.courseReference || current.courseReference : current.courseReference,
      lineName: route.lineName || current.lineName,
      routeName: route.routeName || current.routeName,
      vehicleParc: route.vehicleParc || current.vehicleParc,
      scheduledDeparture: route.scheduledDeparture || current.scheduledDeparture,
      scheduledArrival: route.scheduledArrival || current.scheduledArrival,
      notes: route.notes || current.notes,
      stops: current.stops.some((stop) => stop.label) ? current.stops : (route.stops?.length ? route.stops.map((stop) => ({ ...emptyStop(), ...stop })) : current.stops),
    }));
    setReferenceMatches([]);
    toast({ status: 'success', title: 'Informations de référence fusionnées', description: match.source === 'mission' ? `Affectation ${match.assignment?.driverName || match.assignment?.driverIdentifier || 'conducteur'} conservée dans le service.` : 'Données de course et étapes reprises.' });
  };

  const searchAddress = (index, query) => {
    clearTimeout(searchTimeouts.current[index]);
    if (query.trim().length < 3) {
      setSuggestions((current) => ({ ...current, [index]: [] }));
      return;
    }
    searchTimeouts.current[index] = setTimeout(async () => {
      setSearching((current) => ({ ...current, [index]: true }));
      try {
        const places = [];
        for (const searchQuery of buildSearchQueries(query)) {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&countrycodes=fr&q=${encodeURIComponent(searchQuery)}`, { headers: { Accept: 'application/json', 'Accept-Language': 'fr' } });
          if (response.ok) places.push(...await response.json());
        }
        const ranked = [...new Map(places.map((place) => [`${place.lat},${place.lon}`, place])).values()]
          .map((place) => ({ ...place, score: scorePlace(place, query) }))
          .sort((left, right) => right.score - left.score)
          .slice(0, 5);
        setSuggestions((current) => ({ ...current, [index]: ranked }));
      } catch {
        setSuggestions((current) => ({ ...current, [index]: [] }));
      } finally {
        setSearching((current) => ({ ...current, [index]: false }));
      }
    }, 400);
  };

  const choosePlace = (index, place) => {
    updateStop(index, { label: place.display_name, lat: Number(place.lat), lng: Number(place.lon) });
    setSuggestions((current) => ({ ...current, [index]: [] }));
  };

  const addStop = () => setForm((current) => ({ ...current, stops: [...current.stops, emptyStop()] }));
  const removeStop = (index) => setForm((current) => ({ ...current, stops: current.stops.filter((_, stopIndex) => stopIndex !== index) }));
  const mapRoute = { waypoints: form.stops.map((stop, formIndex) => ({ ...stop, formIndex })).filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng)).map((stop, index) => ({ ...stop, order: index })) };
  const savedStops = mapRoute.waypoints.map(({ formIndex, ...stop }) => stop);
  const highlightedStop = hoveredStop ?? focusedStop;

  const applySuggestion = (suggestion) => {
    const action = suggestion.action;
    if (!action) return;
    const formIndexOf = (waypointIndex) => mapRoute.waypoints[waypointIndex]?.formIndex;
    if (action.type === 'snap') updateStop(formIndexOf(action.index), { lat: action.lat, lng: action.lng });
    if (action.type === 'remove') removeStop(formIndexOf(action.index));
    if (action.type === 'reorder') {
      setForm((current) => {
        const slots = current.stops.map((stop, index) => (Number.isFinite(stop.lat) && Number.isFinite(stop.lng) ? index : -1)).filter((index) => index >= 0);
        const next = [...current.stops];
        slots.forEach((slot, position) => { next[slot] = { ...current.stops[slots[action.order[position]]], scheduledTime: current.stops[slot].scheduledTime }; });
        return { ...current, stops: next };
      });
    }
    setHoveredStop(null);
  };
  const waypointKey = mapRoute.waypoints.map((stop) => `${stop.lat},${stop.lng}`).join('|');

  useEffect(() => {
    if (form.scheduledDeparture || !form.scheduledArrival || !vehicleConstraints?.maxSpeedKmh || !routeInfo || routeInfo.engine === 'straight' || !routeInfo.totalKm) {
      setEstimatedDeparture(null);
      return;
    }
    const routeMinutes = routeInfo.totalTimeS / 60;
    const vmaxMinutes = routeInfo.totalKm / Number(vehicleConstraints.maxSpeedKmh) * 60;
    const travelMinutes = Math.ceil(Math.max(routeMinutes, vmaxMinutes));
    const [hours, minutes] = form.scheduledArrival.split(':').map(Number);
    const departureMinutes = (hours * 60 + minutes - travelMinutes + 1440) % 1440;
    const departure = `${String(Math.floor(departureMinutes / 60)).padStart(2, '0')}:${String(departureMinutes % 60).padStart(2, '0')}`;
    setEstimatedDeparture({ departure, travelMinutes, distanceKm: routeInfo.totalKm, osrmMinutes: Math.round(routeMinutes), vmaxMinutes: Math.round(vmaxMinutes) });
  }, [form.scheduledArrival, form.scheduledDeparture, routeInfo, vehicleConstraints?.maxSpeedKmh]);
  const applyEstimatedDeparture = () => {
    if (estimatedDeparture) update('scheduledDeparture', estimatedDeparture.departure);
  };

  const toggleFreeTracking = async (checked) => {
    setIsFreeTracking(checked);
    if (!checked) return;
    setForm((current) => ({
      ...current,
      serviceReference: 'RBE-999-999',
      routeName: current.routeName || 'Traçage libre - sans trajet défini',
      lineName: '',
      scheduledDeparture: '',
      scheduledArrival: '',
      stops: [emptyStop()],
    }));
  };

  const save = async () => {
    if (!form.serviceReference.trim() || !form.courseReference.trim() || !form.routeName.trim()) {
      toast({ status: 'warning', title: 'Codes service, course et itinéraire requis' });
      return;
    }
    if (!isFreeTracking && !mapRoute.waypoints.length) {
      toast({ status: 'warning', title: 'Premier départ requis', description: 'Choisissez une adresse proposée pour géocoder le premier arrêt.' });
      return;
    }
    try {
      setSaving(true);
      await onSave({ ...form, isFreeTracking, scheduledDeparture: form.scheduledDeparture || estimatedDeparture?.departure || null, vehicleConstraints, serviceReference: form.serviceReference.trim().toUpperCase(), courseReference: form.courseReference.trim().toUpperCase(), stops: isFreeTracking ? [] : savedStops });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside"><ModalOverlay /><ModalContent maxW="1180px"><ModalHeader>Course, ligne et itinéraire</ModalHeader><ModalCloseButton /><ModalBody><VStack align="stretch" spacing={5}>
    <Checkbox isChecked={isFreeTracking} isDisabled={generatingFreeCode} onChange={(event) => toggleFreeTracking(event.target.checked)}>Code course libre</Checkbox>
    {isFreeTracking && <Alert status="info" borderRadius="2px"><AlertIcon /><Text fontSize="sm">Saisissez le code généré dans « Traçage libre ». Aucun trajet n’est défini; affectez ensuite le véhicule et le conducteur dans « Affectations du jour ».</Text></Alert>}
    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={4}><FormControl isRequired position="relative"><FormLabel>Code service</FormLabel><Input value={form.serviceReference} onChange={(event) => { update('serviceReference', event.target.value); searchReferences(event.target.value); }} placeholder="RBE-999-999" />{searchingReferences && <Spinner size="xs" position="absolute" right={3} top="38px" />}{referenceMatches.length > 0 && <Box position="absolute" zIndex={20} top="68px" w="full" maxH="190px" overflowY="auto" bg="white" border="1px solid" borderColor="gray.200" boxShadow="md">{referenceMatches.map((match) => <Button key={`${match.source}-${match.route.courseReference || match.route.serviceReference}`} variant="ghost" justifyContent="start" textAlign="left" whiteSpace="normal" h="auto" py={2} w="full" onClick={() => mergeReference(match)}><VStack align="start" spacing={0}><Text fontWeight="700">{match.route.serviceReference || 'Service non renseigné'} · {match.route.routeName}</Text><Text fontSize="xs">{match.route.courseReference ? `Course ${match.route.courseReference} · ` : ''}{match.source === 'mission' ? `Service affecté à ${match.assignment?.driverName || match.assignment?.driverIdentifier || 'conducteur'} · ` : 'Course configurée · '}{match.route.scheduledDeparture || '--:--'} → {match.route.scheduledArrival || '--:--'}</Text></VStack></Button>)}</Box>}</FormControl><FormControl isRequired><FormLabel>Code course</FormLabel><Input value={form.courseReference} onChange={(event) => update('courseReference', event.target.value)} placeholder="999-26726-920" /></FormControl><FormControl><FormLabel>Ligne</FormLabel><Input value={form.lineName} onChange={(event) => update('lineName', event.target.value)} placeholder="Ex. Ligne patrimoine" /></FormControl><FormControl isRequired><FormLabel>Nom de l’itinéraire</FormLabel><Input value={form.routeName} onChange={(event) => update('routeName', event.target.value)} placeholder="Ex. Gare - Musée" /></FormControl><FormControl><FormLabel>Véhicule et profil de circulation</FormLabel><Select value={form.vehicleParc} onChange={(event) => update('vehicleParc', event.target.value)} placeholder="Choisir un véhicule profilé">{profiles.map((profile) => <option key={profile.id} value={profile.vehicleParc}>{profile.vehicleParc} - {vehicles.find((vehicle) => vehicle.parc === profile.vehicleParc)?.immat || profile.vehicleType || 'Profil Inéo'}</option>)}</Select></FormControl><FormControl><FormLabel>Heure premier départ</FormLabel><Input type="time" value={form.scheduledDeparture} onChange={(event) => update('scheduledDeparture', event.target.value)} /></FormControl><FormControl><FormLabel>Heure dernière arrivée</FormLabel><Input type="time" value={form.scheduledArrival} onChange={(event) => update('scheduledArrival', event.target.value)} /></FormControl></Grid>
    {vehicleConstraints && <Alert status="info" borderRadius="2px"><AlertIcon /><VStack align="start" spacing={1}><Text fontSize="sm" fontWeight="700">Contraintes appliquées au dossier de course</Text><HStack flexWrap="wrap"><Badge colorScheme="blue">{vehicleConstraints.vehicleType || 'BUS'}</Badge>{vehicleConstraints.maxSpeedKmh != null && <Badge colorScheme="orange">Vmax {vehicleConstraints.maxSpeedKmh} km/h</Badge>}{vehicleConstraints.lengthM != null && <Badge>Long. {vehicleConstraints.lengthM} m</Badge>}{vehicleConstraints.widthM != null && <Badge>Larg. {vehicleConstraints.widthM} m</Badge>}{vehicleConstraints.heightM != null && <Badge>Haut. {vehicleConstraints.heightM} m</Badge>}</HStack></VStack></Alert>}
    {estimatedDeparture && <Alert status="success" borderRadius="2px"><AlertIcon /><HStack justify="space-between" w="full" flexWrap="wrap"><Text fontSize="sm">Départ estimé: <b>{estimatedDeparture.departure}</b> pour arriver à {form.scheduledArrival} ({estimatedDeparture.distanceKm.toFixed(1)} km, {estimatedDeparture.travelMinutes} min).</Text><Button size="xs" colorScheme="green" onClick={applyEstimatedDeparture}>Utiliser {estimatedDeparture.departure}</Button></HStack></Alert>}
    <Box border="1px solid" borderColor="gray.200" p={4}><HStack justify="space-between" mb={3}><Text fontWeight="700">Parcours</Text><Button leftIcon={<FiPlus />} size="sm" variant="outline" onClick={addStop}>Ajouter une étape</Button></HStack><VStack align="stretch" spacing={3}>{form.stops.map((stop, index) => <Box key={index} position="relative" onFocus={() => setFocusedStop(index)} onMouseEnter={() => setHoveredStop(index)} onMouseLeave={() => setHoveredStop(null)} borderLeft="4px solid" borderColor={highlightedStop === index ? 'orange.400' : 'transparent'} bg={highlightedStop === index ? 'orange.50' : 'transparent'} pl={2} transition="background 0.15s"><Grid templateColumns={{ base: '1fr', md: '100px 1fr 110px 34px' }} gap={3} alignItems="end"><FormControl><FormLabel>{index === 0 ? 'Premier départ' : `Étape ${index + 1}`}</FormLabel><Input type="time" value={stop.scheduledTime || ''} onChange={(event) => updateStop(index, { scheduledTime: event.target.value })} /></FormControl><FormControl isRequired={index === 0}><FormLabel>{index === 0 ? 'Lieu de départ' : 'Lieu / arrêt'}</FormLabel><Input value={stop.label} onChange={(event) => { updateStop(index, { label: event.target.value, lat: null, lng: null }); searchAddress(index, event.target.value); }} placeholder={index === 0 ? 'Ex. Gare d’Évry-Courcouronnes' : 'Ajouter un arrêt'} /></FormControl><HStack h="40px">{searching[index] && <Spinner size="sm" />} {Number.isFinite(stop.lat) && <Text fontSize="xs" color="green.600">Position trouvée</Text>}</HStack><IconButton aria-label="Retirer l’étape" icon={<FiMinus />} size="sm" colorScheme="red" variant="ghost" isDisabled={index === 0} onClick={() => removeStop(index)} /></Grid>{suggestions[index]?.length > 0 && <Box border="1px solid" borderColor="gray.200" bg="white" boxShadow="sm" mt={1} maxH="180px" overflowY="auto">{suggestions[index].map((place) => <Button key={`${place.place_id}-${place.lat}`} variant="ghost" justifyContent="start" whiteSpace="normal" textAlign="left" w="full" h="auto" py={2} px={3} fontSize="sm" onClick={() => choosePlace(index, place)}><FiSearch /><Text ml={2}>{place.display_name}</Text></Button>)}</Box>}</Box>)}</VStack></Box>
    <FormControl><FormLabel>Observations</FormLabel><Textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} /></FormControl>
    <Box><Text fontWeight="700" mb={2}>Carte de l’itinéraire</Text>{mapRoute.waypoints.length ? <RouteMap height="460px" analyze highlightedIndex={highlightedStop} onHighlight={setFocusedStop} onRouteComputed={setRouteInfo} route={{ ...mapRoute, maxLength: vehicleConstraints?.lengthM, maxWidth: vehicleConstraints?.widthM, maxHeight: vehicleConstraints?.heightM, maxSpeedKmh: vehicleConstraints?.maxSpeedKmh, vehicleType: vehicleConstraints?.vehicleType }} /> : <Box h="320px" border="1px solid" borderColor="gray.200" bg="gray.50" display="flex" alignItems="center" justifyContent="center" color="gray.500">Choisissez le premier départ pour afficher la carte.</Box>}<Text mt={2} fontSize="xs" color="gray.500">Fond OpenStreetMap, tracé calculé sur le réseau routier en profil bus (voies de transport urbain autorisées, sens interdits et restrictions respectés). Le profil véhicule est sauvegardé avec la course; les restrictions de gabarit doivent être contrôlées avant mise en exploitation.</Text>
    {routeInfo?.engine === 'straight' && <Alert status="error" borderRadius="2px" mt={3}><AlertIcon /><Text fontSize="sm">Le calcul routier est indisponible : le tracé affiché est un vol d’oiseau et n’est pas fiable. Réessayez dans un instant.</Text></Alert>}
    {routeInfo?.engine === 'car' && <Alert status="warning" borderRadius="2px" mt={3}><AlertIcon /><Text fontSize="sm">Le moteur de calcul bus est indisponible : tracé voiture de secours, sans garantie sur les voies bus, sens interdits ou interdictions poids lourds.</Text></Alert>}
    {routeInfo?.failedLegs?.length > 0 && <Alert status="error" borderRadius="2px" mt={3}><AlertIcon /><Text fontSize="sm">Étape(s) {routeInfo.failedLegs.map((leg) => ${leg + 1}→).join(', ')} impossible(s) en bus : tracé rouge en pointillés.</Text></Alert>}
    {routeInfo?.heavyConflicts?.length > 0 && <Alert status="warning" borderRadius="2px" mt={3}><AlertIcon /><Text fontSize="sm">{routeInfo.heavyConflicts.length} tronçon(s) en orange : empruntés par le bus mais écartés par un calcul poids lourd (voie réservée bus, limitation de tonnage ou de gabarit). Vérifiez-les avant mise en exploitation.</Text></Alert>}
    {routeInfo?.suggestions?.length > 0 && <Box mt={3} border="1px solid" borderColor="gray.200" p={3}><Text fontWeight="700" mb={2}>Contrôles et optimisations proposés</Text><VStack align="stretch" spacing={2}>{routeInfo.suggestions.map((suggestion) => { const formIndex = mapRoute.waypoints[suggestion.stopIndexes[0]]?.formIndex; return <HStack key={suggestion.id} align="start" justify="space-between" p={2} bg={suggestion.severity === 'error' ? 'red.50' : suggestion.severity === 'warning' ? 'orange.50' : 'blue.50'} onMouseEnter={() => formIndex != null && setHoveredStop(formIndex)} onMouseLeave={() => setHoveredStop(null)}><HStack align="start" spacing={2}>{suggestion.severity === 'info' ? <FiInfo style={{ marginTop: 3 }} /> : <FiAlertTriangle style={{ marginTop: 3 }} />}<Text fontSize="sm">{suggestion.message}</Text></HStack>{suggestion.action && <Button size="xs" flexShrink={0} colorScheme="blue" variant="outline" onClick={() => applySuggestion(suggestion)}>{suggestion.action.label}</Button>}</HStack>; })}</VStack></Box>}
    {routeInfo && routeInfo.engine === 'bus' && !routeInfo.suggestions?.length && !routeInfo.failedLegs?.length && <Text mt={2} fontSize="xs" color="green.600">Aucune anomalie détectée sur l’emplacement des arrêts.</Text>}
    </Box>
  </VStack></ModalBody><ModalFooter><Button variant="ghost" mr={3} onClick={onClose}>Annuler</Button><Button colorScheme="blue" leftIcon={<FiSave />} isLoading={saving} onClick={save}>Enregistrer la course</Button></ModalFooter></ModalContent></Modal>;
}