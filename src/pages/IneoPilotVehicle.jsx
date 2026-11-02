import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge, Box, Button, FormControl, FormHelperText, FormLabel, Grid, HStack, Input, Select, Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useToast,
} from '@chakra-ui/react';
import { FiBell, FiDownload, FiImage, FiRefreshCw, FiSave } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';
import IneoScreenPlan from '../components/IneoScreenPlan';

const formatDate = (value) => (value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }) : '-');
const normalizeSerial = (value) => String(value || '').replace(/\s+/g, '').toUpperCase();
const COMMANDS = [
  { type: 'CHECK_UPDATE', label: 'Vérifier / installer la mise à jour', icon: FiDownload, hint: 'Le PC pilote cherche une version publiée et l’installe (autorisation administrateur requise sur le poste).' },
  { type: 'RELOAD', label: 'Recharger le profil et les écrans', icon: FiRefreshCw, hint: 'Force la resynchronisation du profil écran et des images.' },
  { type: 'TEST_SOUND', label: 'Jouer une annonce de test', icon: FiBell, hint: 'Joue la première annonce configurée (ou un son système).' },
  { type: 'TEST_SCREEN', label: 'Afficher une image de test', icon: FiImage, hint: 'Affiche une mire de couleur sur chaque écran simulé pendant 60 secondes.' },
];
const commandLabel = (type) => COMMANDS.find((command) => command.type === type)?.label || type;
const statusBadge = { PENDING: ['orange', 'En attente'], DELIVERED: ['blue', 'Envoyée'], DONE: ['green', 'Exécutée'], FAILED: ['red', 'Échec'] };

export default function IneoPilotVehicle() {
  const toast = useToast();
  const [pilot, setPilot] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState({ name: 'Véhicule pilote', ucSerial: '', screenProfileId: '' });
  const [formLoaded, setFormLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await ineoAPI.getPilot();
      setPilot(data?.pilot || null);
      return data?.pilot || null;
    } catch (error) {
      toast({ status: 'error', title: 'Véhicule pilote indisponible', description: error.message, id: 'pilot-load' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh().then((loaded) => {
      if (loaded) setForm({ name: loaded.name, ucSerial: loaded.ucSerial || '', screenProfileId: loaded.screenProfileId || '' });
      setFormLoaded(true);
    });
    ineoAPI.listScreenProfiles().then((data) => setProfiles(data?.profiles || [])).catch(() => {});
    ineoAPI.listUcDevices().then((data) => setDevices(data?.devices || [])).catch(() => {});
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const availableDevices = devices.filter((device) => !device.vehicleParc);
  const device = pilot?.device;
  const recentTest = useMemo(() => (pilot?.commands || []).some((command) => command.type === 'TEST_SCREEN' && command.status === 'DONE' && command.completedAt && Date.now() - new Date(command.completedAt).getTime() < 60_000), [pilot]);

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const data = await ineoAPI.savePilot({ ...form, ucSerial: normalizeSerial(form.ucSerial) });
      setPilot(data?.pilot || null);
      toast({ status: 'success', title: 'Véhicule pilote enregistré' });
    } catch (error) {
      toast({ status: 'error', title: 'Enregistrement impossible', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const send = async (type) => {
    try {
      setSending(type);
      await ineoAPI.sendPilotCommand(type);
      toast({ status: 'info', title: 'Commande envoyée', description: 'Le PC pilote l’exécutera à sa prochaine synchronisation (environ 15 secondes).' });
      await refresh();
    } catch (error) {
      toast({ status: 'error', title: 'Commande impossible', description: error.message });
    } finally {
      setSending('');
    }
  };

  const planScreens = (pilot?.screenProfile?.screens || []).map((screen) => ({ ...screen, key: screen.id }));

  return <VStack align="stretch" spacing={5}>
    <Box>
      <Text fontSize="20px" fontWeight="700" color="#17364d">Véhicule pilote</Text>
      <Text color="#60727e">Borne de test propre à Inéo RétroBus (hors parc RBE) : un PC identifié par son numéro de série permet de tester le logiciel, les annonces et les écrans, et de le maintenir à distance.</Text>
    </Box>

    <Box as="form" onSubmit={save} border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={5}>
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={4}>
        <FormControl isRequired><FormLabel>Nom</FormLabel><Input bg="white" value={form.name} maxLength={80} onChange={(event) => update('name', event.target.value)} /></FormControl>
        <FormControl>
          <FormLabel>N° de série du PC pilote</FormLabel>
          <Input bg="white" value={form.ucSerial} onChange={(event) => update('ucSerial', event.target.value)} placeholder="Extrait par le logiciel Inéo RétroBus" />
          {availableDevices.length > 0 && <Select mt={2} size="sm" bg="white" value="" onChange={(event) => event.target.value && update('ucSerial', event.target.value)} placeholder="Choisir parmi les UC détectés">
            {availableDevices.map((item) => <option key={item.id} value={item.serial}>{item.serial}{item.hostname ? ` - ${item.hostname}` : ''}</option>)}
          </Select>}
          <FormHelperText>Doit être différent des UC rattachés aux véhicules du parc.</FormHelperText>
        </FormControl>
        <FormControl>
          <FormLabel>Profil écran à tester</FormLabel>
          <Select bg="white" value={form.screenProfileId} onChange={(event) => update('screenProfileId', event.target.value)} placeholder="Aucun">
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </Select>
        </FormControl>
      </Grid>
      <HStack justify="flex-end" mt={4}><Button type="submit" isLoading={saving} isDisabled={!formLoaded} leftIcon={<FiSave />} colorScheme="blue" borderRadius="2px">Enregistrer</Button></HStack>
    </Box>

    {!loading && !pilot && <Box border="1px dashed" borderColor="#b7c4cd" p={6} textAlign="center" color="gray.500">Aucun véhicule pilote : renseignez le numéro de série du PC ci-dessus puis enregistrez.</Box>}

    {pilot && <>
      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
        <Box border="1px solid" borderColor="#c6d0d8" p={4}>
          <HStack justify="space-between" mb={3}>
            <Text fontWeight="700">État du PC pilote</Text>
            {!pilot.ucSerial ? <Badge colorScheme="gray">Non configuré</Badge> : !device ? <Badge colorScheme="orange">Jamais connecté</Badge> : device.online ? <Badge colorScheme="green">En ligne</Badge> : <Badge colorScheme="red">Hors ligne</Badge>}
          </HStack>
          {device ? <Grid templateColumns="auto 1fr" columnGap={4} rowGap={1} fontSize="sm">
            <Text color="#60727e">N° de série</Text><Text fontFamily="monospace">{device.serial}</Text>
            <Text color="#60727e">Poste</Text><Text>{device.hostname || '-'}</Text>
            <Text color="#60727e">Version du logiciel</Text><Text>{device.appVersion || '-'}</Text>
            <Text color="#60727e">Dernière connexion</Text><Text>{formatDate(device.lastSeenAt)}</Text>
            <Text color="#60727e">Réseau du PC</Text><Text>{device.networkOnline ? 'Connecté' : 'Connexion perdue'}</Text>
            <Text color="#60727e">Profil écran</Text>
            <Text>{pilot.screenProfile ? <>{pilot.screenProfile.name} {device.revisionApplied ? <Badge colorScheme="green">à jour</Badge> : <Badge colorScheme="blue">synchronisation en attente</Badge>}</> : 'Aucun'}</Text>
          </Grid> : <Text fontSize="sm" color="gray.500">Installez le logiciel Inéo RétroBus sur le PC pilote : il apparaîtra ici dès sa première synchronisation.</Text>}
        </Box>

        <Box border="1px solid" borderColor="#c6d0d8" p={4}>
          <Text fontWeight="700" mb={3}>Actions à distance</Text>
          <VStack align="stretch" spacing={2}>
            {COMMANDS.map((command) => <Button key={command.type} justifyContent="flex-start" leftIcon={<command.icon />} variant="outline" borderRadius="2px" isLoading={sending === command.type} isDisabled={!pilot.ucSerial} onClick={() => send(command.type)} title={command.hint}>{command.label}</Button>)}
          </VStack>
          <Text fontSize="xs" color="#60727e" mt={3}>Les commandes sont exécutées par le logiciel du PC pilote à sa prochaine synchronisation (toutes les 15 s) et expirent après 10 minutes.</Text>
        </Box>
      </Grid>

      <Box border="1px solid" borderColor="#c6d0d8" p={4}>
        <HStack justify="space-between" mb={3} flexWrap="wrap">
          <Text fontWeight="700">Aperçu en temps réel des écrans du PC pilote</Text>
          {device && <Badge colorScheme={device.networkOnline ? 'green' : 'orange'}>{device.networkOnline ? 'Affiche le média connecté' : 'Affiche l’image de perte de connexion'}</Badge>}
        </HStack>
        {planScreens.length ? <IneoScreenPlan screens={planScreens} online={device ? device.networkOnline : true} testMode={recentTest} /> : <Text fontSize="sm" color="gray.500">Choisissez un profil écran contenant au moins un écran.</Text>}
      </Box>

      <Box border="1px solid" borderColor="#c6d0d8" overflowX="auto">
        <Table size="sm">
          <Thead bg="#e9eff3"><Tr><Th>Date</Th><Th>Commande</Th><Th>État</Th><Th>Résultat</Th></Tr></Thead>
          <Tbody>
            {pilot.commands.length === 0 && <Tr><Td colSpan={4} color="gray.500">Aucune commande envoyée.</Td></Tr>}
            {pilot.commands.map((command) => { const [color, label] = statusBadge[command.status] || ['gray', command.status]; return <Tr key={command.id}>
              <Td whiteSpace="nowrap">{formatDate(command.createdAt)}</Td><Td>{commandLabel(command.type)}</Td><Td><Badge colorScheme={color}>{label}</Badge></Td><Td>{command.result || '-'}</Td>
            </Tr>; })}
          </Tbody>
        </Table>
      </Box>
    </>}
  </VStack>;
}
