import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge, Box, Button, FormControl, FormHelperText, FormLabel, Grid, HStack, Input, Spinner, Switch, Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useToast,
} from '@chakra-ui/react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';

const formatDate = (value) => (value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'Jamais');
const EMPTY_FORM = { serial: '', name: '', notes: '' };

export default function IneoMaintenancePcs() {
  const toast = useToast();
  const [pcs, setPcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const data = await ineoAPI.listMaintenancePcs();
      setPcs(data?.pcs || []);
    } catch (error) {
      toast({ status: 'error', title: 'Ordinateurs de maintenance indisponibles', description: error.message, id: 'maintenance-pcs' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const add = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await ineoAPI.createMaintenancePc(form);
      toast({ status: 'success', title: 'Ordinateur de maintenance enregistré' });
      setForm(EMPTY_FORM);
      await load();
    } catch (error) {
      toast({ status: 'error', title: 'Enregistrement impossible', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (pc) => {
    try {
      await ineoAPI.updateMaintenancePc(pc.id, { active: !pc.active });
      await load();
    } catch (error) {
      toast({ status: 'error', title: 'Modification impossible', description: error.message });
    }
  };

  const remove = async (pc) => {
    if (!window.confirm(`Retirer ${pc.name} (${pc.serial}) ? Ce PC ne pourra plus se connecter aux serveurs.`)) return;
    try {
      await ineoAPI.deleteMaintenancePc(pc.id);
      toast({ status: 'success', title: 'Ordinateur retiré' });
      await load();
    } catch (error) {
      toast({ status: 'error', title: 'Suppression impossible', description: error.message });
    }
  };

  return <VStack align="stretch" spacing={5}>
    <Box>
      <Text fontSize="20px" fontWeight="700" color="#17364d">Ordinateurs Maintenance</Text>
      <Text color="#60727e">Seuls les PC dont le numéro de série est enregistré ici peuvent se connecter aux serveurs avec l’outil Maintenance. Un PC non renseigné affiche une erreur pendant l’écran de chargement.</Text>
    </Box>

    <Box as="form" onSubmit={add} border="1px solid" borderColor="#c6d0d8" p={5}>
      <Text fontWeight="700" mb={3}>Ajouter un PC de maintenance</Text>
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={4}>
        <FormControl isRequired>
          <FormLabel>Numéro de série (SN)</FormLabel>
          <Input bg="white" value={form.serial} maxLength={64} onChange={(event) => setForm((current) => ({ ...current, serial: event.target.value }))} placeholder="Ex. PF2ABC12" />
          <FormHelperText>Affiché sur l’écran d’erreur de l’outil Maintenance.</FormHelperText>
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Technicien / poste</FormLabel>
          <Input bg="white" value={form.name} maxLength={80} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex. Portable atelier 1" />
        </FormControl>
        <FormControl>
          <FormLabel>Notes (facultatif)</FormLabel>
          <Input bg="white" value={form.notes} maxLength={300} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </FormControl>
      </Grid>
      <HStack mt={4} justify="flex-end">
        <Button type="submit" colorScheme="blue" borderRadius="2px" leftIcon={<FiPlus />} isLoading={saving} isDisabled={!form.serial.trim() || !form.name.trim()}>Enregistrer</Button>
      </HStack>
    </Box>

    <Box border="1px solid" borderColor="#c6d0d8" overflowX="auto">
      <Table size="sm">
        <Thead bg="#e9eff3"><Tr><Th>Poste</Th><Th>N° de série</Th><Th>Dernière connexion</Th><Th>Version</Th><Th>Autorisé</Th><Th></Th></Tr></Thead>
        <Tbody>
          {loading && <Tr><Td colSpan={6}><Spinner size="sm" color="#005a9e" /></Td></Tr>}
          {!loading && pcs.length === 0 && <Tr><Td colSpan={6} color="gray.500">Aucun PC de maintenance enregistré.</Td></Tr>}
          {pcs.map((pc) => <Tr key={pc.id}>
            <Td fontWeight="600">{pc.name}{pc.notes && <Text fontSize="xs" fontWeight="400" color="#60727e">{pc.notes}</Text>}</Td>
            <Td fontFamily="monospace">{pc.serial}</Td>
            <Td whiteSpace="nowrap">{formatDate(pc.lastSeenAt)}{pc.hostname && <Text fontSize="xs" color="#60727e">{pc.hostname}</Text>}</Td>
            <Td>{pc.appVersion ? <Badge>{pc.appVersion}</Badge> : '-'}</Td>
            <Td><Switch isChecked={pc.active} onChange={() => toggle(pc)} aria-label={`Autoriser ${pc.name}`} /></Td>
            <Td textAlign="right"><Button size="xs" variant="ghost" colorScheme="red" leftIcon={<FiTrash2 />} onClick={() => remove(pc)}>Retirer</Button></Td>
          </Tr>)}
        </Tbody>
      </Table>
    </Box>
  </VStack>;
}
