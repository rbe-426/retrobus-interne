import { useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Badge, Box, Button, Card, CardBody, Drawer, DrawerBody,
  DrawerCloseButton, DrawerContent, DrawerFooter, DrawerHeader, DrawerOverlay,
  FormControl, FormLabel, HStack, Heading, Input, Select, Spinner, Table,
  TableContainer, Tbody, Td, Text, Textarea, Th, Thead, Tr, VStack, useDisclosure,
} from '@chakra-ui/react';
import { apiClient } from '../apiClient.js';

const STATUS_LABELS = { OPEN: 'À traiter', IN_PROGRESS: 'En cours', RESOLVED: 'Résolu', REJECTED: 'Refusé' };
const TYPE_LABELS = { SUGGESTION: 'Suggestion', INCIDENT: 'Incident' };
const PAGE_SIZE = 25;

function formatDate(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : '—';
}

function messageFor(error, fallback) {
  return error?.message || error?.response?.data?.error || fallback;
}

export default function Bot920FeedbackCenter() {
  const [guilds, setGuilds] = useState([]);
  const [guildId, setGuildId] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [draftStatus, setDraftStatus] = useState('OPEN');
  const [draftNote, setDraftNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const detail = useDisclosure();

  const loadGuilds = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await apiClient.get('/api/admin/bot920/guilds');
      const available = Array.isArray(payload?.guilds) ? payload.guilds : [];
      setGuilds(available);
      setGuildId((current) => current || available[0]?.id || '');
    } catch (requestError) {
      setError(messageFor(requestError, 'Impossible de charger les serveurs Discord.'));
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    if (!guildId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (type) params.set('type', type);
      if (status) params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      const payload = await apiClient.get(`/api/admin/bot920/guilds/${guildId}/feedback?${params}`);
      setItems(Array.isArray(payload?.items) ? payload.items : []);
      setTotal(Number(payload?.total) || 0);
    } catch (requestError) {
      setItems([]);
      setTotal(0);
      setError(messageFor(requestError, 'Impossible de charger les #JeRemonte.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadGuilds(); }, []);
  useEffect(() => { void loadItems(); }, [guildId, page, type, status]);

  const openDetail = (item) => {
    setSelected(item);
    setDraftStatus(item.status);
    setDraftNote(item.adminNote || '');
    detail.onOpen();
  };

  const saveDetail = async () => {
    if (!selected || !guildId) return;
    setSaving(true);
    setError('');
    try {
      const payload = await apiClient.patch(`/api/admin/bot920/guilds/${guildId}/feedback/${selected.id}`, {
        status: draftStatus,
        adminNote: draftNote,
      });
      setSelected(payload?.item || selected);
      detail.onClose();
      await loadItems();
    } catch (requestError) {
      setError(messageFor(requestError, 'Impossible d’enregistrer le suivi.'));
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <VStack align="stretch" spacing={6} maxW="1440px">
    <Box>
      <Badge colorScheme="cyan" variant="subtle" mb={2}>Suggestions et incidents reçus sur Discord</Badge>
      <Heading size="lg">#JeRemonte</Heading>
      <Text color="gray.600" mt={1}>Centralise les suggestions et dysfonctionnements transmis avec /920 jeremonte.</Text>
    </Box>

    <Card variant="outline" borderRadius="md"><CardBody>
      <VStack align="stretch" spacing={4}>
        <HStack align={{ base: 'stretch', md: 'end' }} direction={{ base: 'column', md: 'row' }} spacing={4}>
          <FormControl maxW={{ base: 'none', md: '360px' }}>
            <FormLabel fontSize="sm">Serveur Discord</FormLabel>
            <Select value={guildId} onChange={(event) => { setGuildId(event.target.value); setPage(1); }} isDisabled={loading && !guilds.length}>
              {guilds.map((guild) => <option key={guild.id} value={guild.id}>{guild.name}</option>)}
            </Select>
          </FormControl>
          <FormControl maxW={{ base: 'none', md: '220px' }}>
            <FormLabel fontSize="sm">Type</FormLabel>
            <Select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
              <option value="">Tous</option><option value="SUGGESTION">Suggestions</option><option value="INCIDENT">Incidents</option>
            </Select>
          </FormControl>
          <FormControl maxW={{ base: 'none', md: '220px' }}>
            <FormLabel fontSize="sm">Statut</FormLabel>
            <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">Tous</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </FormControl>
          <FormControl flex={1}>
            <FormLabel fontSize="sm">Recherche</FormLabel>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setPage(1); void loadItems(); } }} placeholder="Titre, description ou auteur" />
          </FormControl>
          <Button variant="outline" colorScheme="rbe" onClick={() => { setPage(1); void loadItems(); }} isLoading={loading}>Actualiser</Button>
        </HStack>
        {error && <Alert status="error" borderRadius="md"><AlertIcon />{error}</Alert>}
      </VStack>
    </CardBody></Card>

    <Card variant="outline" borderRadius="md"><CardBody p={0}>
      {loading ? <HStack justify="center" py={10}><Spinner color="rbe.500" /><Text fontSize="sm">Chargement des remontées…</Text></HStack>
        : !items.length ? <Box py={12} px={5} textAlign="center"><Heading size="sm">Aucune remontée</Heading><Text mt={2} color="gray.600" fontSize="sm">Les nouvelles suggestions et incidents apparaîtront ici.</Text></Box>
          : <TableContainer><Table size="sm"><Thead><Tr><Th>Type</Th><Th>Titre</Th><Th>Auteur</Th><Th>Reçue le</Th><Th>Statut</Th><Th /></Tr></Thead><Tbody>
            {items.map((item) => <Tr key={item.id} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => openDetail(item)}>
              <Td><Badge colorScheme={item.type === 'INCIDENT' ? 'red' : 'blue'}>{TYPE_LABELS[item.type] || item.type}</Badge></Td>
              <Td fontWeight="600" maxW="420px" whiteSpace="normal">{item.title}</Td>
              <Td>{item.authorName}</Td>
              <Td whiteSpace="nowrap">{formatDate(item.createdAt)}</Td>
              <Td><Badge colorScheme={item.status === 'RESOLVED' ? 'green' : item.status === 'IN_PROGRESS' ? 'orange' : item.status === 'REJECTED' ? 'gray' : 'yellow'}>{STATUS_LABELS[item.status] || item.status}</Badge></Td>
              <Td><Button size="xs" variant="outline" onClick={(event) => { event.stopPropagation(); openDetail(item); }}>Détail</Button></Td>
            </Tr>)}
          </Tbody></Table></TableContainer>}
      <HStack justify="space-between" px={4} py={3} borderTopWidth="1px" borderColor="gray.100">
        <Text fontSize="sm" color="gray.600">{total} remontée{total > 1 ? 's' : ''}</Text>
        <HStack><Button size="sm" variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))} isDisabled={page <= 1 || loading}>Précédent</Button><Text fontSize="sm">{page} / {totalPages}</Text><Button size="sm" variant="outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} isDisabled={page >= totalPages || loading}>Suivant</Button></HStack>
      </HStack>
    </CardBody></Card>

    <Drawer isOpen={detail.isOpen} placement="right" onClose={detail.onClose} size={{ base: 'full', md: 'md' }}>
      <DrawerOverlay /><DrawerContent><DrawerCloseButton /><DrawerHeader borderBottomWidth="1px">Détail #JeRemonte</DrawerHeader>
        <DrawerBody py={5}>
          {selected && <VStack align="stretch" spacing={4}>
            <HStack><Badge colorScheme={selected.type === 'INCIDENT' ? 'red' : 'blue'}>{TYPE_LABELS[selected.type] || selected.type}</Badge><Text fontSize="sm" color="gray.500">{formatDate(selected.createdAt)}</Text></HStack>
            <Heading size="md">{selected.title}</Heading>
            <Text fontSize="sm" color="gray.600">Par {selected.authorName}</Text>
            <Text whiteSpace="pre-wrap">{selected.description}</Text>
            <FormControl><FormLabel>Statut</FormLabel><Select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></FormControl>
            <FormControl><FormLabel>Note de suivi interne</FormLabel><Textarea value={draftNote} onChange={(event) => setDraftNote(event.target.value)} maxLength={1_000} rows={5} placeholder="Note visible uniquement dans URBEX" /></FormControl>
            {selected.adminNote && <Text fontSize="xs" color="gray.500">Dernière note enregistrée : {selected.adminNote}</Text>}
          </VStack>}
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px"><Button variant="outline" mr={3} onClick={detail.onClose}>Fermer</Button><Button colorScheme="rbe" onClick={saveDetail} isLoading={saving}>Enregistrer le suivi</Button></DrawerFooter>
      </DrawerContent>
    </Drawer>
  </VStack>;
}
