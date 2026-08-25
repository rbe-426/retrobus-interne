import React, { useMemo, useState } from 'react';
import { Badge, Box, Button, FormControl, FormLabel, Grid, HStack, Select, Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useToast } from '@chakra-ui/react';
import { FiEdit2, FiSave } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';

const blankProfile = {
  hasCategoryDLicense: false,
  hasDriverCard: false,
  hasValidFimo: false,
  hasTachographCard: false,
};

const formatHours = (hours) => `${Number(hours || 0).toFixed(1)} h`;
const yesNo = (value) => value ? 'Oui' : 'Non';

export default function IneoDriverProfiles({ members, profiles, onSaved }) {
  const toast = useToast();
  const [selectedIdentifier, setSelectedIdentifier] = useState('');
  const [form, setForm] = useState(blankProfile);
  const [saving, setSaving] = useState(false);
  const profileByIdentifier = useMemo(() => new Map(profiles.map((profile) => [profile.driverIdentifier, profile])), [profiles]);

  const selectDriver = (identifier) => {
    const profile = profileByIdentifier.get(identifier);
    setSelectedIdentifier(identifier);
    setForm(profile ? {
      hasCategoryDLicense: profile.hasCategoryDLicense,
      hasDriverCard: profile.hasDriverCard,
      hasValidFimo: profile.hasValidFimo,
      hasTachographCard: profile.hasTachographCard,
    } : blankProfile);
  };

  const save = async () => {
    if (!selectedIdentifier) return;
    try {
      setSaving(true);
      await ineoAPI.saveDriverProfile(selectedIdentifier, form);
      await onSaved();
      toast({ status: 'success', title: 'Profil conducteur enregistré' });
    } catch (error) {
      toast({ status: 'error', title: 'Enregistrement impossible', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return <VStack align="stretch" spacing={5}>
    <Box borderBottom="1px solid" borderColor="#b7c4cd" pb={3}>
      <Text fontSize="20px" fontWeight="700" color="#17364d">Profils conducteurs</Text>
      <Text color="#60727e">Données strictement opérationnelles Inéo, indépendantes de l’adhésion.</Text>
    </Box>
    <Box border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={5}>
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
        <FormControl>
          <FormLabel>Conducteur</FormLabel>
          <Select bg="white" value={selectedIdentifier} onChange={(event) => selectDriver(event.target.value)} placeholder="Choisir un conducteur">
            {members.map((member) => {
              const identifier = String(member.matricule || member.email || '').toLowerCase();
              return identifier ? <option key={member.id || identifier} value={identifier}>{member.firstName} {member.lastName} - {identifier}</option> : null;
            })}
          </Select>
        </FormControl>
        {selectedIdentifier && <HStack align="end" justify="flex-end"><Button leftIcon={<FiSave />} colorScheme="blue" borderRadius="2px" isLoading={saving} onClick={save}>Enregistrer le profil</Button></HStack>}
      </Grid>
      {selectedIdentifier && <Grid mt={5} templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
        <FormControl><FormLabel>Détenteur permis D</FormLabel><Select bg="white" value={String(form.hasCategoryDLicense)} onChange={(event) => setForm((current) => ({ ...current, hasCategoryDLicense: event.target.value === 'true' }))}><option value="true">Oui</option><option value="false">Non</option></Select></FormControl>
        <FormControl><FormLabel>Carte conducteur</FormLabel><Select bg="white" value={String(form.hasDriverCard)} onChange={(event) => setForm((current) => ({ ...current, hasDriverCard: event.target.value === 'true' }))}><option value="true">Oui</option><option value="false">Non</option></Select></FormControl>
        <FormControl><FormLabel>FIMO valide</FormLabel><Select bg="white" value={String(form.hasValidFimo)} onChange={(event) => setForm((current) => ({ ...current, hasValidFimo: event.target.value === 'true' }))}><option value="true">Oui</option><option value="false">Non</option></Select></FormControl>
        <FormControl><FormLabel>Carte chronotachygraphe</FormLabel><Select bg="white" value={String(form.hasTachographCard)} onChange={(event) => setForm((current) => ({ ...current, hasTachographCard: event.target.value === 'true' }))}><option value="true">Oui</option><option value="false">Non</option></Select></FormControl>
      </Grid>}
    </Box>
    <Box overflowX="auto" border="1px solid" borderColor="#c6d0d8"><Table size="sm"><Thead bg="#e9eff3"><Tr><Th>Conducteur</Th><Th>Permis D</Th><Th>Carte</Th><Th>FIMO</Th><Th>Chronotachygraphe</Th><Th>Heures théoriques</Th><Th>Heures réelles</Th><Th /></Tr></Thead><Tbody>{members.map((member) => {
      const identifier = String(member.matricule || member.email || '').toLowerCase();
      const profile = profileByIdentifier.get(identifier);
      return <Tr key={member.id || identifier} bg={!profile?.hasCategoryDLicense || !profile?.hasDriverCard ? 'gray.100' : undefined}><Td fontWeight="600">{member.firstName} {member.lastName}</Td><Td><Badge colorScheme={profile?.hasCategoryDLicense ? 'green' : 'gray'}>{yesNo(profile?.hasCategoryDLicense)}</Badge></Td><Td><Badge colorScheme={profile?.hasDriverCard ? 'green' : 'gray'}>{yesNo(profile?.hasDriverCard)}</Badge></Td><Td><Badge colorScheme={profile?.hasValidFimo ? 'green' : 'orange'}>{yesNo(profile?.hasValidFimo)}</Badge></Td><Td>{yesNo(profile?.hasTachographCard)}</Td><Td>{formatHours(profile?.theoreticalDrivingHours)}</Td><Td>{formatHours(profile?.actualDrivingHours)}</Td><Td><Button size="xs" leftIcon={<FiEdit2 />} onClick={() => selectDriver(identifier)}>Éditer</Button></Td></Tr>;
    })}</Tbody></Table></Box>
  </VStack>;
}