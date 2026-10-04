import { useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Badge, Box, Button, Card, CardBody, FormControl, FormLabel,
  HStack, Heading, Input, Select, Spinner, Table, TableContainer, Tbody, Td,
  Text, Th, Thead, Tr, VStack,
} from '@chakra-ui/react';
import { apiClient } from '../apiClient.js';

const ACTION_LABELS = {
  kick: 'Expulsion',
  mute: 'Exclusion temporaire',
  unmute: 'Fin d’exclusion',
  ban: 'Bannissement',
  tempban: 'Bannissement temporaire',
  unban: 'Débannissement',
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : 'Non renseignée';
}

function formatDuration(value) {
  if (!value) return 'Sans durée';
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

function actionColor(action) {
  if (action === 'ban' || action === 'tempban') return 'red';
  if (action === 'kick') return 'orange';
  if (action === 'mute') return 'yellow';
  return 'green';
}

export default function Bot920ModerationCenter() {
  const [guilds, setGuilds] = useState([]);
  const [guildId, setGuildId] = useState('');
  const [cases, setCases] = useState([]);
  const [loadingGuilds, setLoadingGuilds] = useState(true);
  const [loadingCases, setLoadingCases] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');

  const loadGuilds = async () => {
    setLoadingGuilds(true);
    setError('');
    try {
      const payload = await apiClient.get('/api/admin/bot920/guilds');
      const availableGuilds = Array.isArray(payload?.guilds) ? payload.guilds : [];
      setGuilds(availableGuilds);
      setGuildId((current) => current || availableGuilds[0]?.id || '');
    } catch (requestError) {
      setError(requestError?.message || 'La liste des serveurs Discord est indisponible.');
    } finally {
      setLoadingGuilds(false);
    }
  };

  const loadCases = async () => {
    if (!guildId) return;
    setLoadingCases(true);
    setError('');
    try {
      const payload = await apiClient.get(`/api/admin/bot920/guilds/${guildId}/moderation-cases`);
      setCases(Array.isArray(payload?.cases) ? payload.cases : []);
    } catch (requestError) {
      setCases([]);
      setError(requestError?.message || 'L’historique de modération est indisponible.');
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => { void loadGuilds(); }, []);
  useEffect(() => { void loadCases(); }, [guildId]);

  const normalizedQuery = query.trim().toLocaleLowerCase('fr-FR');
  const visibleCases = cases.filter((moderationCase) => {
    const matchesAction = !action || moderationCase.action === action;
    const haystack = [moderationCase.targetTag, moderationCase.moderatorTag, moderationCase.reason].join(' ').toLocaleLowerCase('fr-FR');
    return matchesAction && (!normalizedQuery || haystack.includes(normalizedQuery));
  });

  return <VStack align="stretch" spacing={6} maxW="1440px">
    <Box>
      <Badge colorScheme="rbe" variant="subtle" mb={2}>Données Discord enregistrées</Badge>
      <Heading size="lg">Modération</Heading>
      <Text color="gray.600" mt={1}>Historique des sanctions exécutées par 920 Le Bot ! sur le serveur sélectionné.</Text>
    </Box>
    <Card variant="outline" borderRadius="md"><CardBody>
      {loadingGuilds ? <HStack py={3}><Spinner size="sm" color="rbe.500" /><Text fontSize="sm">Chargement des serveurs Discord…</Text></HStack> : guilds.length === 0 ? <Alert status="warning" borderRadius="md"><AlertIcon />Aucun serveur synchronisé. Attendez la prochaine synchronisation de 920 Le Bot !.</Alert> : <VStack align="stretch" spacing={4}>
        <HStack justify="space-between" align={{ base: 'stretch', md: 'end' }} direction={{ base: 'column', md: 'row' }} gap={4}>
          <FormControl maxW="lg"><FormLabel fontSize="sm">Serveur Discord</FormLabel><Select value={guildId} onChange={(event) => setGuildId(event.target.value)}>{guilds.map((guild) => <option key={guild.id} value={guild.id}>{guild.name} ({guild.memberCount} membres)</option>)}</Select></FormControl>
          <Button variant="outline" colorScheme="rbe" onClick={loadCases} isLoading={loadingCases}>Actualiser</Button>
        </HStack>
        <HStack align={{ base: 'stretch', md: 'end' }} direction={{ base: 'column', md: 'row' }} gap={4}>
          <FormControl flex={1}><FormLabel fontSize="sm">Rechercher</FormLabel><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Membre, modérateur ou motif" /></FormControl>
          <FormControl maxW={{ base: 'none', md: '280px' }}><FormLabel fontSize="sm">Type de sanction</FormLabel><Select value={action} onChange={(event) => setAction(event.target.value)}><option value="">Tous les types</option>{Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></FormControl>
        </HStack>
      </VStack>}
      {error && <Alert status="error" borderRadius="md" mt={4}><AlertIcon />{error}</Alert>}
    </CardBody></Card>
    <Card variant="outline" borderRadius="md"><CardBody p={0}>
      {loadingCases ? <HStack justify="center" py={10}><Spinner color="rbe.500" /><Text fontSize="sm">Chargement de l’historique…</Text></HStack> : visibleCases.length === 0 ? <Box py={10} px={5} textAlign="center"><Heading size="sm">Aucune sanction à afficher</Heading><Text color="gray.600" fontSize="sm" mt={2}>{cases.length ? 'Aucun dossier ne correspond aux filtres actuels.' : 'Les prochaines sanctions exécutées par le bot apparaîtront ici.'}</Text></Box> : <TableContainer><Table size="sm"><Thead><Tr><Th>Membre</Th><Th>Type</Th><Th>Motif</Th><Th>Modérateur</Th><Th>Date</Th><Th>Durée</Th><Th>Statut</Th></Tr></Thead><Tbody>{visibleCases.map((moderationCase) => <Tr key={moderationCase.id}><Td fontWeight="600">{moderationCase.targetTag}</Td><Td><Badge colorScheme={actionColor(moderationCase.action)}>{ACTION_LABELS[moderationCase.action] || moderationCase.action}</Badge></Td><Td maxW="360px" whiteSpace="normal">{moderationCase.reason}</Td><Td>{moderationCase.moderatorTag}</Td><Td whiteSpace="nowrap">{formatDate(moderationCase.createdAt)}</Td><Td whiteSpace="nowrap">{formatDuration(moderationCase.durationMinutes)}</Td><Td><Badge colorScheme={moderationCase.status === 'RESOLVED' ? 'green' : 'gray'}>{moderationCase.status === 'RESOLVED' ? 'Résolu' : 'Actif'}</Badge></Td></Tr>)}</Tbody></Table></TableContainer>}
    </CardBody></Card>
  </VStack>;
}