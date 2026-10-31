import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, CardBody, CardHeader, Checkbox, FormControl, FormLabel, Grid, HStack, Heading,
  IconButton, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader,
  ModalOverlay, Radio, RadioGroup, Select, Switch, Text, Textarea, Tooltip, VStack, Badge, useDisclosure, useToast
} from '@chakra-ui/react';
import { FiBell, FiCalendar, FiChevronLeft, FiChevronRight, FiPlus, FiTrash2 } from 'react-icons/fi';
import { fetchWithCSRF } from '../lib/csrfClient.js';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const timeOf = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const atDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const recurrenceLabel = { DAILY: 'Tous les jours', WEEKLY: 'Chaque semaine', MONTHLY: 'Chaque mois', YEARLY: 'Chaque année' };
const occursOnDay = (event, day) => {
  const start = atDay(event.startAt);
  const target = atDay(day);
  const end = event.recurrenceEndAt ? atDay(event.recurrenceEndAt) : null;
  if (target < start || (end && target > end)) return false;
  const recurrence = event.recurrence || 'NONE';
  if (recurrence === 'NONE') return target.getTime() === start.getTime();
  const days = Math.round((target - start) / 86_400_000);
  if (recurrence === 'DAILY') return true;
  if (recurrence === 'WEEKLY') return days % 7 === 0;
  if (recurrence === 'MONTHLY') {
    const months = (target.getFullYear() - start.getFullYear()) * 12 + target.getMonth() - start.getMonth();
    return months >= 0 && target.getDate() === Math.min(start.getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
  }
  if (recurrence === 'YEARLY') {
    return target.getFullYear() >= start.getFullYear()
      && target.getMonth() === start.getMonth()
      && target.getDate() === Math.min(start.getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
  }
  return false;
};

const emptyForm = (date) => ({
  id: null, title: '', description: '', date, time: '', kind: 'EVENT', shared: false, recurrence: 'NONE', recurrenceEndDate: ''
});

export default function CalendarCard({ isMobile }) {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [events, setEvents] = useState([]);
  const [canShare, setCanShare] = useState(false);
  const [form, setForm] = useState(emptyForm(dayKey(new Date())));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [evRes, permRes] = await Promise.all([
        fetchWithCSRF('/api/calendar-events'),
        fetchWithCSRF('/api/calendar-events/permissions')
      ]);
      if (evRes.ok) setEvents(await evRes.json());
      if (permRes.ok) setCanShare(!!(await permRes.json()).canShare);
    } catch (e) {
      console.warn('Calendrier indisponible:', e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const eventsOn = useCallback((date) => events.filter((event) => occursOnDay(event, date)), [events]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }, [month]);

  const today = dayKey(new Date());
  const dueReminders = events.filter((event) =>
    event.kind === 'REMINDER' && !event.done
    && (event.recurrence && event.recurrence !== 'NONE' ? occursOnDay(event, today) : dayKey(event.startAt) <= today)
  );
  const dayEvents = eventsOn(selected);

  const openCreate = () => { setForm(emptyForm(selected)); onOpen(); };
  const openEdit = (e) => {
    setForm({
      id: e.id, title: e.title, description: e.description || '', date: dayKey(e.startAt),
      time: e.allDay ? '' : timeOf(e.startAt), kind: e.kind, shared: e.shared,
      recurrence: e.recurrence || 'NONE', recurrenceEndDate: e.recurrenceEndAt ? dayKey(e.recurrenceEndAt) : ''
    });
    onOpen();
  };
  const canEdit = (e) => (e.shared ? canShare : true);

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const startAt = new Date(`${form.date}T${form.time || '00:00'}:00`).toISOString();
      const res = await fetchWithCSRF(form.id ? `/api/calendar-events/${form.id}` : '/api/calendar-events', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, description: form.description, startAt, allDay: !form.time,
          kind: form.kind, shared: canShare && form.shared, recurrence: form.recurrence,
          recurrenceEndAt: form.recurrence !== 'NONE' && form.recurrenceEndDate
            ? new Date(`${form.recurrenceEndDate}T23:59:59`).toISOString()
            : null
        })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`);
      await load();
      onClose();
    } catch (err) {
      toast({ status: 'error', title: 'Enregistrement impossible', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e) => {
    const res = await fetchWithCSRF(`/api/calendar-events/${e.id}`, { method: 'DELETE' });
    if (res.ok) load(); else toast({ status: 'error', title: 'Suppression impossible' });
  };

  const toggleDone = async (e) => {
    const res = await fetchWithCSRF(`/api/calendar-events/${e.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: !e.done })
    });
    if (res.ok) load();
  };

  return (
    <Card shadow="lg">
      <CardHeader p={isMobile ? 4 : 5} pb={2}>
        <HStack justify="space-between">
          <HStack><FiCalendar /><Heading size={isMobile ? 'sm' : 'md'}>Calendrier</Heading></HStack>
          <Button size="xs" leftIcon={<FiPlus />} colorScheme="rbe" onClick={openCreate}>Ajouter</Button>
        </HStack>
      </CardHeader>
      <CardBody p={isMobile ? 4 : 5} pt={2}>
        {dueReminders.length > 0 && (
          <VStack align="stretch" spacing={1} mb={3} p={2} bg="orange.50" borderRadius="md" borderWidth="1px" borderColor="orange.200">
            {dueReminders.map((r) => (
              <HStack key={r.id}>
                {r.recurrence && r.recurrence !== 'NONE'
                  ? <Text fontSize="xs" color="orange.800"><FiBell style={{ display: 'inline' }} /> {r.title} · {recurrenceLabel[r.recurrence]}</Text>
                  : <Checkbox size="sm" onChange={() => toggleDone(r)}>
                    <Text fontSize="xs" color="orange.800"><FiBell style={{ display: 'inline' }} /> {r.title}</Text>
                  </Checkbox>}
              </HStack>
            ))}
          </VStack>
        )}

        <HStack justify="space-between" mb={2}>
          <IconButton size="xs" variant="ghost" aria-label="Mois précédent" icon={<FiChevronLeft />}
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
          <Text fontWeight="700" fontSize="sm">{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
          <IconButton size="xs" variant="ghost" aria-label="Mois suivant" icon={<FiChevronRight />}
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
        </HStack>

        <Grid templateColumns="repeat(7, 1fr)" gap={1} textAlign="center">
          {DAYS.map((d, i) => <Text key={i} fontSize="xs" color="gray.500" fontWeight="600">{d}</Text>)}
          {cells.map((d, i) => {
            if (!d) return <Box key={`e${i}`} />;
            const k = dayKey(d);
            const list = eventsOn(k);
            const hasShared = list.some((e) => e.shared);
            const hasPerso = list.some((e) => !e.shared);
            return (
              <Box
                key={k} as="button" onClick={() => setSelected(k)} py={1} borderRadius="md" fontSize="xs"
                bg={k === selected ? 'rbe.500' : 'transparent'}
                color={k === selected ? 'white' : undefined}
                borderWidth="1px" borderColor={k === today ? 'rbe.500' : 'transparent'}
                _hover={{ bg: k === selected ? 'rbe.600' : 'gray.100' }}
              >
                {d.getDate()}
                <HStack justify="center" spacing="2px" h="6px">
                  {hasShared && <Box w="5px" h="5px" borderRadius="full" bg={k === selected ? 'white' : 'blue.400'} />}
                  {hasPerso && <Box w="5px" h="5px" borderRadius="full" bg={k === selected ? 'white' : 'orange.400'} />}
                </HStack>
              </Box>
            );
          })}
        </Grid>

        <HStack spacing={3} mt={2} fontSize="xs" color="gray.500">
          <HStack spacing={1}><Box w="6px" h="6px" borderRadius="full" bg="blue.400" /><Text>Partagé</Text></HStack>
          <HStack spacing={1}><Box w="6px" h="6px" borderRadius="full" bg="orange.400" /><Text>Perso</Text></HStack>
        </HStack>

        <VStack align="stretch" spacing={2} mt={3}>
          <Text fontSize="xs" fontWeight="700" color="gray.600">
            {new Date(`${selected}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          {dayEvents.length === 0 && <Text fontSize="xs" color="gray.400">Rien de prévu.</Text>}
          {dayEvents.map((e) => (
            <HStack key={e.id} align="start" p={2} borderWidth="1px" borderRadius="md"
              borderLeftWidth="4px" borderLeftColor={e.shared ? 'blue.400' : 'orange.400'} opacity={e.done ? 0.5 : 1}>
              <Box flex="1" cursor={canEdit(e) ? 'pointer' : 'default'} onClick={() => canEdit(e) && openEdit(e)}>
                <HStack spacing={1} wrap="wrap">
                  {e.kind === 'REMINDER' && <FiBell size={12} />}
                  <Text fontSize="sm" fontWeight="600" textDecoration={e.done ? 'line-through' : 'none'}>{e.title}</Text>
                  {!e.allDay && <Badge fontSize="9px">{timeOf(e.startAt)}</Badge>}
                  {e.shared && <Badge colorScheme="blue" fontSize="9px">Tous</Badge>}
                  {e.recurrence && e.recurrence !== 'NONE' && <Badge colorScheme="purple" fontSize="9px">↻ {recurrenceLabel[e.recurrence]}</Badge>}
                </HStack>
                {e.description && <Text fontSize="xs" color="gray.600" whiteSpace="pre-line">{e.description}</Text>}
                {e.shared && e.ownerName && <Text fontSize="10px" color="gray.400">par {e.ownerName}</Text>}
              </Box>
              {canEdit(e) && (
                <Tooltip label="Supprimer">
                  <IconButton size="xs" variant="ghost" colorScheme="red" aria-label="Supprimer" icon={<FiTrash2 />} onClick={() => remove(e)} />
                </Tooltip>
              )}
            </HStack>
          ))}
        </VStack>
      </CardBody>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{form.id ? 'Modifier' : 'Ajouter'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <RadioGroup value={form.kind} onChange={(v) => setForm({ ...form, kind: v })}>
                <HStack spacing={4}><Radio value="EVENT">Événement</Radio><Radio value="REMINDER">Rappel</Radio></HStack>
              </RadioGroup>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </FormControl>
              <HStack>
                <FormControl>
                  <FormLabel>Date</FormLabel>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </FormControl>
                <FormControl>
                  <FormLabel>Heure (optionnel)</FormLabel>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </FormControl>
              </HStack>
              <FormControl>
                <FormLabel>Détails</FormLabel>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Récurrence</FormLabel>
                <Select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value, recurrenceEndDate: e.target.value === 'NONE' ? '' : form.recurrenceEndDate })}>
                  <option value="NONE">Aucune</option>
                  <option value="DAILY">Tous les jours</option>
                  <option value="WEEKLY">Chaque semaine</option>
                  <option value="MONTHLY">Chaque mois</option>
                  <option value="YEARLY">Chaque année</option>
                </Select>
              </FormControl>
              {form.recurrence !== 'NONE' && (
                <FormControl>
                  <FormLabel>Fin de récurrence (optionnel)</FormLabel>
                  <Input type="date" min={form.date} value={form.recurrenceEndDate} onChange={(e) => setForm({ ...form, recurrenceEndDate: e.target.value })} />
                </FormControl>
              )}
              {canShare && (
                <FormControl display="flex" alignItems="center">
                  <Switch isChecked={form.shared} onChange={(e) => setForm({ ...form, shared: e.target.checked })} mr={2} />
                  <FormLabel mb={0}>Visible par tous les membres</FormLabel>
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Annuler</Button>
            <Button colorScheme="rbe" onClick={save} isLoading={saving} isDisabled={!form.title.trim() || !form.date}>Enregistrer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}
