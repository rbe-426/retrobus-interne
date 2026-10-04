import { useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Badge, Box, Button, Card, CardBody, Checkbox, Divider, FormControl,
  FormLabel, HStack, Heading, Input, Select, SimpleGrid, Spinner, Switch, Table, TableContainer,
  Tbody, Td, Text, Th, Thead, Tr, VStack,
} from '@chakra-ui/react';
import { apiClient } from '../apiClient.js';

const RULES = [
  { type: 'ANTI_SPAM', label: 'Anti-spam', description: 'Détecte les envois rapides de messages.', threshold: 6, windowSeconds: 10 },
  { type: 'LINK', label: 'Liens', description: 'Contrôle les liens publiés dans les salons.', threshold: null, windowSeconds: null },
  { type: 'WORD', label: 'Filtre de mots', description: 'Applique les actions choisies aux expressions filtrées.', threshold: null, windowSeconds: null },
];

const EMPTY_RULE = (definition) => ({
  type: definition.type, name: definition.label, enabled: false, severity: 'MEDIUM', action: 'TIMEOUT',
  threshold: definition.threshold, windowSeconds: definition.windowSeconds, timeoutMinutes: 10,
  alertChannelId: '', deleteMessage: true, notifyUser: false, exceptions: [],
});

const EMPTY_WORD = { phrase: '', matchType: 'PARTIAL', severity: 'MEDIUM', action: 'TIMEOUT', enabled: true };

function ruleForType(rules, definition) {
  return rules.find((rule) => rule.type === definition.type) || EMPTY_RULE(definition);
}

function errorMessage(error, fallback) {
  return error?.message || error?.response?.data?.error || fallback;
}

export default function Bot920AutoModCenter() {
  const [guilds, setGuilds] = useState([]);
  const [guildId, setGuildId] = useState('');
  const [context, setContext] = useState(null);
  const [rules, setRules] = useState([]);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRule, setSavingRule] = useState('');
  const [savingWord, setSavingWord] = useState(false);
  const [error, setError] = useState('');
  const [wordDraft, setWordDraft] = useState(EMPTY_WORD);
  const [memberException, setMemberException] = useState({});

  const loadGuilds = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await apiClient.get('/api/admin/bot920/guilds');
      const availableGuilds = Array.isArray(payload?.guilds) ? payload.guilds : [];
      setGuilds(availableGuilds);
      setGuildId((current) => current || availableGuilds[0]?.id || '');
    } catch (requestError) {
      setError(errorMessage(requestError, 'La liste des serveurs Discord est indisponible.'));
    } finally {
      setLoading(false);
    }
  };

  const loadAutoMod = async () => {
    if (!guildId) return;
    setLoading(true);
    setError('');
    try {
      const [autoModPayload, contextPayload] = await Promise.all([
        apiClient.get(`/api/admin/bot920/guilds/${guildId}/automod`),
        apiClient.get(`/api/admin/bot920/guilds/${guildId}/context`),
      ]);
      setRules(Array.isArray(autoModPayload?.rules) ? autoModPayload.rules : []);
      setWords(Array.isArray(autoModPayload?.words) ? autoModPayload.words : []);
      setContext(contextPayload?.guild || null);
    } catch (requestError) {
      setRules([]);
      setWords([]);
      setContext(null);
      setError(errorMessage(requestError, 'La configuration AutoMod est indisponible.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadGuilds(); }, []);
  useEffect(() => { void loadAutoMod(); }, [guildId]);

  const updateRule = (definition, field, value) => {
    setRules((current) => {
      const previous = ruleForType(current, definition);
      const next = { ...previous, [field]: value };
      return [...current.filter((rule) => rule.type !== definition.type), next];
    });
  };

  const saveRule = async (definition) => {
    const rule = ruleForType(rules, definition);
    setSavingRule(definition.type);
    setError('');
    try {
      const payload = rule.id
        ? await apiClient.put(`/api/admin/bot920/guilds/${guildId}/automod/rules/${rule.id}`, rule)
        : await apiClient.post(`/api/admin/bot920/guilds/${guildId}/automod/rules`, rule);
      setRules((current) => [...current.filter((item) => item.type !== definition.type), payload.rule]);
    } catch (requestError) {
      setError(errorMessage(requestError, 'La règle AutoMod n’a pas pu être enregistrée.'));
    } finally {
      setSavingRule('');
    }
  };

  const addException = (definition, entityType, entityId) => {
    if (!entityId) return;
    const rule = ruleForType(rules, definition);
    if (rule.exceptions.some((entry) => entry.entityType === entityType && entry.entityId === entityId)) return;
    updateRule(definition, 'exceptions', [...rule.exceptions, { entityType, entityId }]);
    if (entityType === 'MEMBER') setMemberException((current) => ({ ...current, [definition.type]: '' }));
  };

  const removeException = (definition, exception) => {
    const rule = ruleForType(rules, definition);
    updateRule(definition, 'exceptions', rule.exceptions.filter((entry) => !(entry.entityType === exception.entityType && entry.entityId === exception.entityId)));
  };

  const saveWord = async () => {
    setSavingWord(true);
    setError('');
    try {
      const payload = wordDraft.id
        ? await apiClient.put(`/api/admin/bot920/guilds/${guildId}/automod/words/${wordDraft.id}`, wordDraft)
        : await apiClient.post(`/api/admin/bot920/guilds/${guildId}/automod/words`, wordDraft);
      setWords((current) => [...current.filter((word) => word.id !== payload.word.id), payload.word].sort((left, right) => left.phrase.localeCompare(right.phrase, 'fr')));
      setWordDraft(EMPTY_WORD);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Le mot filtré n’a pas pu être enregistré.'));
    } finally {
      setSavingWord(false);
    }
  };

  const deleteWord = async (word) => {
    setSavingWord(true);
    setError('');
    try {
      await apiClient.delete(`/api/admin/bot920/guilds/${guildId}/automod/words/${word.id}`);
      setWords((current) => current.filter((entry) => entry.id !== word.id));
      if (wordDraft.id === word.id) setWordDraft(EMPTY_WORD);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Le mot filtré n’a pas pu être supprimé.'));
    } finally {
      setSavingWord(false);
    }
  };

  const toggleWord = async (word, enabled) => {
    setSavingWord(true);
    setError('');
    try {
      const payload = await apiClient.put(`/api/admin/bot920/guilds/${guildId}/automod/words/${word.id}`, { ...word, enabled });
      setWords((current) => current.map((entry) => entry.id === word.id ? payload.word : entry));
    } catch (requestError) {
      setError(errorMessage(requestError, 'L’état du mot filtré n’a pas pu être modifié.'));
    } finally {
      setSavingWord(false);
    }
  };

  const optionLabel = (items, id) => items.find((item) => item.id === id)?.name || id;
  const channels = Array.isArray(context?.channels) ? context.channels.filter((channel) => /TEXT|ANNOUNCEMENT|FORUM/.test(channel.type)) : [];
  const roles = Array.isArray(context?.roles) ? context.roles.filter((role) => !role.managed) : [];

  return <VStack align="stretch" spacing={6} maxW="1440px">
    <Box><Badge colorScheme="rbe" variant="subtle" mb={2}>Configuration publiée par serveur</Badge><Heading size="lg">AutoMod</Heading><Text color="gray.600" mt={1}>Les actions Discord sont exécutées uniquement par 920 Le Bot ! après sa prochaine actualisation.</Text></Box>
    <Card variant="outline" borderRadius="md"><CardBody>
      {loading && !guilds.length ? <HStack py={3}><Spinner size="sm" color="rbe.500" /><Text fontSize="sm">Chargement des serveurs Discord...</Text></HStack> : guilds.length === 0 ? <Alert status="warning" borderRadius="md"><AlertIcon />Aucun serveur Discord synchronisé.</Alert> : <HStack align="end" justify="space-between" direction={{ base: 'column', md: 'row' }}><FormControl maxW="lg"><FormLabel fontSize="sm">Serveur Discord</FormLabel><Select value={guildId} onChange={(event) => setGuildId(event.target.value)}>{guilds.map((guild) => <option key={guild.id} value={guild.id}>{guild.name} ({guild.memberCount} membres)</option>)}</Select></FormControl><Button variant="outline" colorScheme="rbe" onClick={loadAutoMod} isLoading={loading}>Actualiser</Button></HStack>}
      {error && <Alert status="error" borderRadius="md" mt={4}><AlertIcon />{error}</Alert>}
    </CardBody></Card>
    {guildId && (loading ? <HStack justify="center" py={8}><Spinner color="rbe.500" /><Text>Chargement des règles...</Text></HStack> : <VStack align="stretch" spacing={5}>{RULES.map((definition) => {
      const rule = ruleForType(rules, definition);
      return <Card key={definition.type} variant="outline" borderRadius="md"><CardBody><VStack align="stretch" spacing={4}>
        <HStack justify="space-between"><Box><Heading size="sm">{definition.label}</Heading><Text fontSize="sm" color="gray.600" mt={1}>{definition.description}</Text></Box><Switch isChecked={rule.enabled} onChange={(event) => updateRule(definition, 'enabled', event.target.checked)} aria-label={`Activer ${definition.label}`} /></HStack>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
          {definition.type === 'ANTI_SPAM' && <><FormControl><FormLabel fontSize="sm">Seuil de messages</FormLabel><Input type="number" min={2} max={100} value={rule.threshold ?? ''} onChange={(event) => updateRule(definition, 'threshold', Number(event.target.value))} /></FormControl><FormControl><FormLabel fontSize="sm">Fenêtre (secondes)</FormLabel><Input type="number" min={2} max={3600} value={rule.windowSeconds ?? ''} onChange={(event) => updateRule(definition, 'windowSeconds', Number(event.target.value))} /></FormControl></>}
          <FormControl><FormLabel fontSize="sm">Action</FormLabel><Select value={rule.action} onChange={(event) => updateRule(definition, 'action', event.target.value)}><option value="DELETE">Supprimer</option><option value="TIMEOUT">Timeout</option><option value="ALERT">Alerter</option></Select></FormControl>
          <FormControl><FormLabel fontSize="sm">Timeout (minutes)</FormLabel><Input type="number" min={1} max={40320} value={rule.timeoutMinutes ?? ''} isDisabled={rule.action !== 'TIMEOUT'} onChange={(event) => updateRule(definition, 'timeoutMinutes', Number(event.target.value))} /></FormControl>
          <FormControl><FormLabel fontSize="sm">Canal d’alerte</FormLabel><Select value={rule.alertChannelId || ''} onChange={(event) => updateRule(definition, 'alertChannelId', event.target.value)}><option value="">Aucun</option>{channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}</Select></FormControl>
          <FormControl><FormLabel fontSize="sm">Sévérité</FormLabel><Select value={rule.severity} onChange={(event) => updateRule(definition, 'severity', event.target.value)}>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => <option key={value} value={value}>{value}</option>)}</Select></FormControl>
        </SimpleGrid>
        <HStack spacing={6} wrap="wrap"><Checkbox isChecked={rule.deleteMessage} onChange={(event) => updateRule(definition, 'deleteMessage', event.target.checked)}>Supprimer le message</Checkbox><Checkbox isChecked={rule.notifyUser} onChange={(event) => updateRule(definition, 'notifyUser', event.target.checked)}>Notifier le membre</Checkbox></HStack>
        <Divider /><Box><Text fontWeight="600" fontSize="sm" mb={3}>Exceptions</Text><SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}><Select placeholder="Exclure un rôle" onChange={(event) => { addException(definition, 'ROLE', event.target.value); event.target.value = ''; }}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</Select><Select placeholder="Exclure un salon" onChange={(event) => { addException(definition, 'CHANNEL', event.target.value); event.target.value = ''; }}>{channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}</Select><HStack><Input inputMode="numeric" maxLength={20} placeholder="ID membre Discord" value={memberException[definition.type] || ''} onChange={(event) => setMemberException((current) => ({ ...current, [definition.type]: event.target.value }))} /><Button onClick={() => addException(definition, 'MEMBER', memberException[definition.type])}>Ajouter</Button></HStack></SimpleGrid><HStack mt={3} spacing={2} wrap="wrap">{rule.exceptions.length === 0 ? <Text fontSize="sm" color="gray.600">Aucune exception.</Text> : rule.exceptions.map((exception) => <Button key={`${exception.entityType}-${exception.entityId}`} size="xs" variant="outline" onClick={() => removeException(definition, exception)}>{exception.entityType === 'ROLE' ? optionLabel(roles, exception.entityId) : exception.entityType === 'CHANNEL' ? `#${optionLabel(channels, exception.entityId)}` : exception.entityId} x</Button>)}</HStack></Box>
        <Button alignSelf="flex-end" colorScheme="rbe" onClick={() => saveRule(definition)} isLoading={savingRule === definition.type}>{rule.id ? 'Enregistrer la règle' : 'Créer la règle'}</Button>
      </VStack></CardBody></Card>;
    })}
    <Card variant="outline" borderRadius="md"><CardBody><VStack align="stretch" spacing={4}><Box><Heading size="sm">Mots et expressions filtrés</Heading><Text fontSize="sm" color="gray.600" mt={1}>Le filtre de mots doit être activé et enregistré pour que cette liste soit appliquée.</Text></Box><SimpleGrid columns={{ base: 1, md: 5 }} spacing={3}><Input placeholder="Mot ou expression" value={wordDraft.phrase} onChange={(event) => setWordDraft((current) => ({ ...current, phrase: event.target.value }))} /><Select value={wordDraft.matchType} onChange={(event) => setWordDraft((current) => ({ ...current, matchType: event.target.value }))}><option value="PARTIAL">Correspondance partielle</option><option value="EXACT">Message exact</option></Select><Select value={wordDraft.severity} onChange={(event) => setWordDraft((current) => ({ ...current, severity: event.target.value }))}>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => <option key={value} value={value}>{value}</option>)}</Select><Select value={wordDraft.action} onChange={(event) => setWordDraft((current) => ({ ...current, action: event.target.value }))}><option value="DELETE">Supprimer</option><option value="TIMEOUT">Timeout</option><option value="ALERT">Alerter</option></Select><Button colorScheme="rbe" onClick={saveWord} isLoading={savingWord}>{wordDraft.id ? 'Enregistrer' : 'Ajouter'}</Button></SimpleGrid><TableContainer><Table size="sm"><Thead><Tr><Th>Expression</Th><Th>Correspondance</Th><Th>Action</Th><Th>État</Th><Th /></Tr></Thead><Tbody>{words.length === 0 ? <Tr><Td colSpan={5}><Text color="gray.600">Aucun mot filtré.</Text></Td></Tr> : words.map((word) => <Tr key={word.id}><Td>{word.phrase}</Td><Td>{word.matchType}</Td><Td>{word.action}</Td><Td><Switch size="sm" isChecked={word.enabled} onChange={(event) => void toggleWord(word, event.target.checked)} /></Td><Td><HStack justify="end"><Button size="xs" onClick={() => setWordDraft(word)}>Modifier</Button><Button size="xs" colorScheme="red" variant="ghost" onClick={() => deleteWord(word)} isLoading={savingWord}>Supprimer</Button></HStack></Td></Tr>)}</Tbody></Table></TableContainer></VStack></CardBody></Card>
  </VStack>)}</VStack>;
}