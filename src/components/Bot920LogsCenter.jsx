import { useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Badge, Box, Button, Card, CardBody, FormControl, FormLabel,
  HStack, Heading, Select, Spinner, Switch, Table, TableContainer, Tbody, Td,
  Text, Th, Thead, Tr, VStack,
} from '@chakra-ui/react';
import { apiClient } from '../apiClient.js';

const EVENT_LABELS = { kick: 'Expulsion', mute: 'Timeout', unmute: 'Fin de timeout', ban: 'Bannissement', tempban: 'Bannissement temporaire', unban: 'Débannissement' };

function requestError(error, fallback) {
  return error?.message || error?.response?.data?.error || fallback;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : 'Non renseignée';
}

export default function Bot920LogsCenter() {
  const [guilds, setGuilds] = useState([]);
  const [guildId, setGuildId] = useState('');
  const [channels, setChannels] = useState([]);
  const [rule, setRule] = useState(null);
  const [events, setEvents] = useState([]);
  const [draft, setDraft] = useState({ type: 'MODERATION', enabled: true, channelId: '' });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState('');

  const loadGuilds = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await apiClient.get('/api/admin/bot920/guilds');
      const availableGuilds = Array.isArray(payload?.guilds) ? payload.guilds : [];
      setGuilds(availableGuilds);
      setGuildId((current) => current || availableGuilds[0]?.id || '');
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'La liste des serveurs Discord est indisponible.'));
    } finally {
      setLoading(false);
    }
  };

  const loadGuildLogging = async () => {
    if (!guildId) return;
    setLoading(true);
    setError('');
    try {
      const [contextPayload, loggingPayload] = await Promise.all([
        apiClient.get(`/api/admin/bot920/guilds/${guildId}/context`),
        apiClient.get(`/api/admin/bot920/guilds/${guildId}/logging`),
      ]);
      const nextRule = Array.isArray(loggingPayload?.rules) ? loggingPayload.rules.find((entry) => entry.type === 'MODERATION') || null : null;
      setChannels((contextPayload?.guild?.channels || []).filter((channel) => ['TEXT', 'ANNOUNCEMENT'].includes(channel.type)));
      setRule(nextRule);
      setDraft(nextRule ? { type: nextRule.type, enabled: nextRule.enabled, channelId: nextRule.channelId } : { type: 'MODERATION', enabled: true, channelId: '' });
    } catch (requestFailure) {
      setChannels([]);
      setRule(null);
      setError(requestError(requestFailure, 'La configuration des journaux est indisponible.'));
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!guildId) return;
    setLoadingEvents(true);
    try {
      const payload = await apiClient.get(`/api/admin/bot920/guilds/${guildId}/logging/events`);
      setEvents(Array.isArray(payload?.events) ? payload.events : []);
    } catch (requestFailure) {
      setEvents([]);
      setError(requestError(requestFailure, 'Les événements de modération sont indisponibles.'));
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => { void loadGuilds(); }, []);
  useEffect(() => { void loadGuildLogging(); void loadEvents(); }, [guildId]);

  const saveRule = async () => {
    if (!guildId) return;
    setSaving(true);
    setError('');
    try {
      const payload = rule?.id
        ? await apiClient.put(`/api/admin/bot920/guilds/${guildId}/logging/rules/${rule.id}`, draft)
        : await apiClient.post(`/api/admin/bot920/guilds/${guildId}/logging/rules`, draft);
      setRule(payload.rule);
      setDraft({ type: payload.rule.type, enabled: payload.rule.enabled, channelId: payload.rule.channelId });
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'La règle de journaux n’a pas pu être enregistrée.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async () => {
    if (!rule?.id) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.delete(`/api/admin/bot920/guilds/${guildId}/logging/rules/${rule.id}`);
      setRule(null);
      setDraft({ type: 'MODERATION', enabled: true, channelId: '' });
      setPreview(null);
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'La règle de journaux n’a pas pu être supprimée.'));
    } finally {
      setSaving(false);
    }
  };

  const loadPreview = async () => {
    if (!guildId) return;
    setSaving(true);
    setError('');
    try {
      const payload = await apiClient.post(`/api/admin/bot920/guilds/${guildId}/logging/preview`, { eventType: 'ban', targetTag: 'MembreDiscord', moderatorTag: 'ModerateurDiscord', reason: 'Motif de démonstration' });
      setPreview(payload.preview || null);
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'L’aperçu n’a pas pu être généré.'));
    } finally {
      setSaving(false);
    }
  };

  return <VStack align="stretch" spacing={6} maxW="1440px">
    <Box><Badge colorScheme="rbe" variant="subtle" mb={2}>Configuration par serveur</Badge><Heading size="lg">Journaux de modération</Heading><Text color="gray.600" mt={1}>Les actions de modération réussies par 920 Le Bot ! sont enregistrées et peuvent être publiées dans un salon Discord synchronisé.</Text></Box>
    <Card variant="outline" borderRadius="md"><CardBody>
      {loading && !guilds.length ? <HStack py={3}><Spinner size="sm" color="rbe.500" /><Text fontSize="sm">Chargement des serveurs Discord...</Text></HStack> : guilds.length === 0 ? <Alert status="warning" borderRadius="md"><AlertIcon />Aucun serveur Discord synchronisé.</Alert> : <HStack align="end" justify="space-between" direction={{ base: 'column', md: 'row' }} gap={4}><FormControl maxW="lg"><FormLabel fontSize="sm">Serveur Discord</FormLabel><Select value={guildId} onChange={(event) => setGuildId(event.target.value)}>{guilds.map((guild) => <option key={guild.id} value={guild.id}>{guild.name} ({guild.memberCount} membres)</option>)}</Select></FormControl><Button variant="outline" colorScheme="rbe" onClick={() => { void loadGuildLogging(); void loadEvents(); }} isLoading={loading || loadingEvents}>Actualiser</Button></HStack>}
      {error && <Alert status="error" borderRadius="md" mt={4}><AlertIcon />{error}</Alert>}
    </CardBody></Card>
    {guildId && <><Card variant="outline" borderRadius="md"><CardBody><VStack align="stretch" spacing={4}><Box><Heading size="sm">Règle de modération</Heading><Text fontSize="sm" color="gray.600" mt={1}>Cette première verticale couvre uniquement les opérations de modération réellement exécutées.</Text></Box><FormControl display="flex" alignItems="center" justifyContent="space-between"><FormLabel mb={0}>Publier dans le salon configuré</FormLabel><Switch isChecked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} /></FormControl><FormControl><FormLabel fontSize="sm">Salon textuel synchronisé</FormLabel><Select placeholder="Choisir un salon" value={draft.channelId} onChange={(event) => setDraft((current) => ({ ...current, channelId: event.target.value }))}>{channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}</Select></FormControl><HStack justify="flex-end" wrap="wrap"><Button variant="outline" onClick={loadPreview} isLoading={saving}>Aperçu</Button>{rule && <Button colorScheme="red" variant="ghost" onClick={deleteRule} isLoading={saving}>Supprimer</Button>}<Button colorScheme="rbe" onClick={saveRule} isLoading={saving}>{rule ? 'Enregistrer la règle' : 'Créer la règle'}</Button></HStack>{preview && <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4} bg="gray.50"><Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase">Aperçu local</Text><Text mt={2}>{preview.content}</Text><Text mt={2} fontSize="xs" color="gray.600">Cet aperçu ne publie aucun message Discord.</Text></Box>}</VStack></CardBody></Card>
    <Card variant="outline" borderRadius="md"><CardBody p={0}>{loadingEvents ? <HStack justify="center" py={10}><Spinner color="rbe.500" /><Text fontSize="sm">Chargement des événements...</Text></HStack> : events.length === 0 ? <Box py={10} px={5} textAlign="center"><Heading size="sm">Aucun événement de modération</Heading><Text color="gray.600" fontSize="sm" mt={2}>Les prochaines actions Discord réussies apparaîtront ici.</Text></Box> : <TableContainer><Table size="sm"><Thead><Tr><Th>Membre</Th><Th>Action</Th><Th>Modérateur</Th><Th>Motif</Th><Th>Date</Th></Tr></Thead><Tbody>{events.map((event) => <Tr key={event.id}><Td fontWeight="600">{event.targetTag}</Td><Td><Badge colorScheme="rbe">{EVENT_LABELS[event.eventType] || event.eventType}</Badge></Td><Td>{event.moderatorTag}</Td><Td maxW="360px" whiteSpace="normal">{event.reason}</Td><Td whiteSpace="nowrap">{formatDate(event.createdAt)}</Td></Tr>)}</Tbody></Table></TableContainer>}</CardBody></Card></>}
  </VStack>;
}