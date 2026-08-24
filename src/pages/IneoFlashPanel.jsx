import React, { useEffect, useState } from 'react';
import {
  Badge, Box, Button, FormControl, FormLabel, HStack, Icon, Input, Select, Spinner,
  Switch, Table, Tbody, Td, Text, Textarea, Th, Thead, Tr, VStack, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Tab, TabList, TabPanel, TabPanels, Tabs,
} from '@chakra-ui/react';
import { FiBell, FiEdit2, FiMapPin, FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';

const MODE_LABEL = {
  IMMEDIATE: 'Diffusion immédiate',
  AT_TIME: 'À une heure précise',
  AT_LOCATION: 'À un lieu donné',
  ON_SERVICE_START: 'À la prise de service',
};

const blankForm = { message: '', scheduleMode: 'IMMEDIATE', scheduledAt: '', locationLabel: '', locationLat: null, locationLng: null, radiusMeters: 200, active: true };
const formatDate = (value) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

function ScheduleDetail({ flash }) {
  if (flash.scheduleMode === 'AT_TIME') return <Text fontSize="sm" color="#60727e">{formatDate(flash.scheduledAt)}</Text>;
  if (flash.scheduleMode === 'AT_LOCATION') return <Text fontSize="sm" color="#60727e">{flash.locationLabel || `${flash.locationLat?.toFixed(4)}, ${flash.locationLng?.toFixed(4)}`} · {flash.radiusMeters || 200} m</Text>;
  if (flash.scheduleMode === 'ON_SERVICE_START') return <Text fontSize="sm" color="#60727e">Dès l’ouverture du service conducteur</Text>;
  return <Text fontSize="sm" color="#60727e">Dès l’enregistrement</Text>;
}

export default function IneoFlashPanel() {
  const toast = useToast();
  const [flashes, setFlashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFlash, setEditingFlash] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [statsFlashId, setStatsFlashId] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await ineoAPI.listFlashes();
      setFlashes(data?.flashes || []);
    } catch (error) {
      toast({ status: 'error', title: 'Flashs Inéo indisponibles', description: error.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingFlash(null); setForm(blankForm); setLocationQuery(''); setLocationResults([]); setModalOpen(true); };
  const openEdit = (flash) => {
    setEditingFlash(flash);
    setForm({
      message: flash.message,
      scheduleMode: flash.scheduleMode,
      scheduledAt: flash.scheduledAt ? new Date(new Date(flash.scheduledAt).getTime() - new Date(flash.scheduledAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
      locationLabel: flash.locationLabel || '',
      locationLat: flash.locationLat ?? null,
      locationLng: flash.locationLng ?? null,
      radiusMeters: flash.radiusMeters || 200,
      active: flash.active,
    });
    setLocationQuery(flash.locationLabel || '');
    setLocationResults([]);
    setModalOpen(true);
  };

  const searchLocation = async () => {
    if (locationQuery.trim().length < 3) return;
    try {
      setSearchingLocation(true);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&countrycodes=fr&q=${encodeURIComponent(locationQuery)}`, { headers: { Accept: 'application/json', 'Accept-Language': 'fr' } });
      const results = response.ok ? await response.json() : [];
      setLocationResults(results);
    } catch { setLocationResults([]); } finally { setSearchingLocation(false); }
  };

  const pickLocation = (result) => {
    setForm((current) => ({ ...current, locationLabel: result.display_name, locationLat: Number(result.lat), locationLng: Number(result.lon) }));
    setLocationQuery(result.display_name);
    setLocationResults([]);
  };

  const save = async () => {
    if (!form.message.trim()) { toast({ status: 'warning', title: 'Le message est requis' }); return; }
    if (form.scheduleMode === 'AT_TIME' && !form.scheduledAt) { toast({ status: 'warning', title: 'Choisissez une heure de diffusion' }); return; }
    if (form.scheduleMode === 'AT_LOCATION' && form.locationLat == null) { toast({ status: 'warning', title: 'Choisissez un lieu dans les suggestions' }); return; }
    try {
      setSaving(true);
      const payload = { ...form, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null };
      if (editingFlash) await ineoAPI.updateFlash(editingFlash.id, payload);
      else await ineoAPI.createFlash(payload);
      setModalOpen(false);
      toast({ status: 'success', title: editingFlash ? 'Flash modifié' : 'Flash créé et prêt à diffuser' });
      load();
    } catch (error) {
      toast({ status: 'error', title: 'Enregistrement impossible', description: error.message });
    } finally { setSaving(false); }
  };

  const toggleActive = async (flash) => {
    try {
      await ineoAPI.updateFlash(flash.id, { active: !flash.active });
      load();
    } catch (error) { toast({ status: 'error', title: 'Modification impossible', description: error.message }); }
  };

  const removeFlash = async (flash) => {
    if (!window.confirm(`Supprimer le flash « ${flash.message.slice(0, 40)}... » ?`)) return;
    try {
      await ineoAPI.removeFlash(flash.id);
      toast({ status: 'success', title: 'Flash supprimé' });
      load();
    } catch (error) { toast({ status: 'error', title: 'Suppression impossible', description: error.message }); }
  };

  const statsFlash = flashes.find((flash) => flash.id === statsFlashId) || null;

  return <VStack align="stretch" spacing={5}>
    <Box borderBottom="1px solid" borderColor="#b7c4cd" pb={3}><HStack justify="space-between" flexWrap="wrap" gap={3}><Box><Text fontSize="20px" fontWeight="700" color="#17364d">Flash conducteurs</Text><Text color="#60727e">Éditez un message et diffusez-le sur le poste de conduite : immédiatement, à une heure, à un lieu, ou à la prise de service.</Text></Box><HStack><Button size="sm" borderRadius="2px" leftIcon={<FiRefreshCw />} isLoading={loading} onClick={load}>Actualiser</Button><Button size="sm" borderRadius="2px" colorScheme="blue" leftIcon={<FiPlus />} onClick={openCreate}>Nouveau flash</Button></HStack></HStack></Box>

    <Tabs colorScheme="blue" variant="enclosed">
      <TabList><Tab>Messages</Tab><Tab>Statistiques de validation</Tab></TabList>
      <TabPanels>
        <TabPanel px={0} pt={5}>
          <Box overflowX="auto" border="1px solid" borderColor="#c6d0d8"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Message</Th><Th>Diffusion</Th><Th>Détail</Th><Th>Statut</Th><Th>Validations</Th><Th></Th></Tr></Thead><Tbody>
            {loading ? <Tr><Td colSpan={6}><HStack justify="center" py={5}><Spinner color="#005a9e" /></HStack></Td></Tr> : flashes.length ? flashes.map((flash) => <Tr key={flash.id}><Td maxW="320px" whiteSpace="normal">{flash.message}</Td><Td><Badge colorScheme="blue">{MODE_LABEL[flash.scheduleMode]}</Badge></Td><Td><ScheduleDetail flash={flash} /></Td><Td><Badge colorScheme={flash.active ? 'green' : 'gray'}>{flash.active ? 'Actif' : 'Suspendu'}</Badge></Td><Td>{flash.acknowledgements?.length || 0}</Td><Td><HStack spacing={1}><Button size="xs" onClick={() => toggleActive(flash)}>{flash.active ? 'Suspendre' : 'Réactiver'}</Button><Button size="xs" leftIcon={<FiEdit2 />} onClick={() => openEdit(flash)}>Modifier</Button><Button size="xs" colorScheme="red" variant="ghost" leftIcon={<FiTrash2 />} onClick={() => removeFlash(flash)}>Supprimer</Button></HStack></Td></Tr>) : <Tr><Td colSpan={6} color="gray.500">Aucun flash conducteur enregistré.</Td></Tr>}
          </Tbody></Table></Box>
        </TabPanel>
        <TabPanel px={0} pt={5}>
          <VStack align="stretch" spacing={4}>
            <FormControl maxW="480px"><FormLabel>Flash à consulter</FormLabel><Select bg="white" value={statsFlashId} onChange={(event) => setStatsFlashId(event.target.value)} placeholder="Choisir un flash">{flashes.map((flash) => <option key={flash.id} value={flash.id}>{flash.message.slice(0, 60)} · {flash.acknowledgements?.length || 0} validation(s)</option>)}</Select></FormControl>
            <Box overflowX="auto" border="1px solid" borderColor="#c6d0d8"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Conducteur</Th><Th>Identifiant</Th><Th>Validé le</Th></Tr></Thead><Tbody>
              {!statsFlash ? <Tr><Td colSpan={3} color="gray.500">Choisissez un flash pour voir le détail des conducteurs l’ayant pris en connaissance.</Td></Tr> : statsFlash.acknowledgements?.length ? statsFlash.acknowledgements.map((ack) => <Tr key={ack.id}><Td fontWeight="600">{ack.driverName || '-'}</Td><Td fontFamily="monospace">{ack.driverIdentifier}</Td><Td>{formatDate(ack.acknowledgedAt)}</Td></Tr>) : <Tr><Td colSpan={3} color="gray.500">Aucune validation pour ce flash pour le moment.</Td></Tr>}
            </Tbody></Table></Box>
          </VStack>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="lg"><ModalOverlay /><ModalContent><ModalHeader><HStack><Icon as={FiBell} /><Text>{editingFlash ? 'Modifier le flash' : 'Nouveau flash conducteur'}</Text></HStack></ModalHeader><ModalCloseButton /><ModalBody><VStack align="stretch" spacing={4}>
      <FormControl isRequired><FormLabel>Message</FormLabel><Textarea rows={4} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Message affiché en plein écran au conducteur..." /></FormControl>
      <FormControl isRequired><FormLabel>Diffuser</FormLabel><Select value={form.scheduleMode} onChange={(event) => setForm((current) => ({ ...current, scheduleMode: event.target.value }))}>{Object.entries(MODE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></FormControl>
      {form.scheduleMode === 'AT_TIME' && <FormControl isRequired><FormLabel>Heure de diffusion</FormLabel><Input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))} /></FormControl>}
      {form.scheduleMode === 'AT_LOCATION' && <VStack align="stretch" spacing={3}>
        <FormControl isRequired><FormLabel>Lieu</FormLabel><HStack><Input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Ex. Dépôt Lescure, Corbeil-Essonnes" onKeyDown={(event) => event.key === 'Enter' && searchLocation()} /><Button isLoading={searchingLocation} leftIcon={<FiMapPin />} onClick={searchLocation}>Chercher</Button></HStack></FormControl>
        {locationResults.length > 0 && <Box border="1px solid" borderColor="gray.200" bg="white" maxH="180px" overflowY="auto">{locationResults.map((result) => <Button key={result.place_id} variant="ghost" justifyContent="start" whiteSpace="normal" textAlign="left" w="full" h="auto" py={2} px={3} fontSize="sm" onClick={() => pickLocation(result)}>{result.display_name}</Button>)}</Box>}
        {form.locationLat != null && <Text fontSize="sm" color="green.600">Position retenue : {form.locationLabel}</Text>}
        <FormControl><FormLabel>Rayon de déclenchement (mètres)</FormLabel><Input type="number" min="50" value={form.radiusMeters} onChange={(event) => setForm((current) => ({ ...current, radiusMeters: Number(event.target.value) || 200 }))} /></FormControl>
      </VStack>}
      <FormControl><FormLabel>Statut</FormLabel><HStack><Switch isChecked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /><Text>{form.active ? 'Actif' : 'Suspendu'}</Text></HStack></FormControl>
    </VStack></ModalBody><ModalFooter><Button variant="ghost" mr={3} onClick={() => setModalOpen(false)}>Annuler</Button><Button colorScheme="blue" isLoading={saving} onClick={save}>{editingFlash ? 'Enregistrer' : 'Créer le flash'}</Button></ModalFooter></ModalContent></Modal>
  </VStack>;
}
