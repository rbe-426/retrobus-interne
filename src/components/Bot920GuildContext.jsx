import { useEffect, useState } from 'react';
import { Alert, AlertIcon, Badge, Box, Card, CardBody, FormControl, FormLabel, HStack, Select, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { apiClient } from '../apiClient.js';

function syncLabel(value) {
  if (!value) return 'Jamais synchronisé';
  return new Date(value).toLocaleString('fr-FR');
}

export default function Bot920GuildContext() {
  const [guilds, setGuilds] = useState([]);
  const [guildId, setGuildId] = useState('');
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get('/api/admin/bot920/guilds')
      .then((payload) => {
        if (!active) return;
        const availableGuilds = Array.isArray(payload?.guilds) ? payload.guilds : [];
        setGuilds(availableGuilds);
        setGuildId((current) => current || availableGuilds[0]?.id || '');
      })
      .catch((requestError) => {
        if (active) setError(requestError?.message || 'La liste des serveurs Discord est indisponible.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!guildId) return;
    let active = true;
    setContextLoading(true);
    setError('');
    apiClient.get(`/api/admin/bot920/guilds/${guildId}/context`)
      .then((payload) => { if (active) setContext(payload?.guild || null); })
      .catch((requestError) => { if (active) setError(requestError?.message || 'Le contexte Discord est indisponible.'); })
      .finally(() => { if (active) setContextLoading(false); });
    return () => { active = false; };
  }, [guildId]);

  return <Card variant="outline" borderRadius="md">
    <CardBody>
      <VStack align="stretch" spacing={4}>
        <Box>
          <HeadingPlaceholder />
          <Text fontSize="sm" color="gray.600" mt={1}>Les listes de salons et rôles sont synchronisées par le bot. Aucun identifiant Discord ne doit être saisi manuellement.</Text>
        </Box>
        {loading ? <HStack py={3}><Spinner size="sm" color="rbe.500" /><Text fontSize="sm">Chargement des serveurs Discord…</Text></HStack> : guilds.length === 0 ? <Alert status="warning" borderRadius="md"><AlertIcon />Aucun serveur synchronisé. Vérifiez que 920 Le Bot ! est connecté, puis attendez sa synchronisation.</Alert> : <FormControl maxW="lg"><FormLabel fontSize="sm">Serveur Discord administré</FormLabel><Select value={guildId} onChange={(event) => setGuildId(event.target.value)}>{guilds.map((guild) => <option key={guild.id} value={guild.id}>{guild.name} ({guild.memberCount} membres)</option>)}</Select></FormControl>}
        {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}
        {contextLoading && <HStack py={2}><Spinner size="sm" color="rbe.500" /><Text fontSize="sm">Synchronisation du contexte…</Text></HStack>}
        {context && !contextLoading && <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
          <ContextMetric label="Salons disponibles" value={context.channels.length} detail="Sélecteurs Discord" />
          <ContextMetric label="Rôles disponibles" value={context.roles.length} detail="Hiérarchie synchronisée" />
          <ContextMetric label="Dernière synchronisation" value={syncLabel(context.lastSyncedAt)} detail={context.settings ? `Configuration v${context.settings.version}` : 'Aucune configuration publiée'} />
        </SimpleGrid>}
      </VStack>
    </CardBody>
  </Card>;
}

function HeadingPlaceholder() {
  return <Text fontWeight="700">Contexte Discord</Text>;
}

function ContextMetric({ label, value, detail }) {
  return <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}><Text fontSize="xs" color="gray.500">{label}</Text><Text fontWeight="700" mt={1} noOfLines={1}>{value}</Text><Badge mt={2} colorScheme="gray" fontSize="xs">{detail}</Badge></Box>;
}