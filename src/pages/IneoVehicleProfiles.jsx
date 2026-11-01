import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge, Box, Button, FormControl, FormHelperText, FormLabel, Grid, HStack, Input, Select, Spinner, Table, Tbody, Td, Text,
  Textarea, Th, Thead, Tr, VStack, useToast,
} from '@chakra-ui/react';
import { FiSave } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';

const vehicleTypes = ['BUS STANDARD', 'BUS ARTICULE', 'BUS BI ARTICULE', 'BUS GABARIT REDUIT', 'VOITURES', 'DIVERS'];
const emptyForm = { vehicleParc: '', vehicleType: '', maxSpeedKmh: '', lengthM: '', widthM: '', heightM: '', options: '', imei: '', deviceLabel: '', ucSerial: '' };
const formatDate = (value) => (value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-');
const normalizeSerial = (value) => String(value || '').replace(/\s+/g, '').toUpperCase();

const toForm = (parc, profile) => ({
  vehicleParc: parc,
  vehicleType: profile?.vehicleType || '',
  maxSpeedKmh: profile?.maxSpeedKmh ?? '',
  lengthM: profile?.lengthM ?? '',
  widthM: profile?.widthM ?? '',
  heightM: profile?.heightM ?? '',
  options: profile?.options || '',
  imei: profile?.imei || '',
  deviceLabel: profile?.deviceLabel || '',
  ucSerial: profile?.ucSerial || '',
});

export default function IneoVehicleProfiles({ vehicles, missions = [] }) {
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [profileData, deviceData] = await Promise.all([
        ineoAPI.listVehicleProfiles(),
        ineoAPI.listUcDevices().catch(() => ({ devices: [] })),
      ]);
      setProfiles(profileData?.profiles || []);
      setDevices(deviceData?.devices || []);
    } catch (error) {
      toast({ status: 'error', title: 'Profils Inéo indisponibles', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const profileByParc = useMemo(() => new Map(profiles.map((profile) => [profile.vehicleParc, profile])), [profiles]);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.parc === form.vehicleParc);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const selectVehicle = (parc) => setForm(parc ? toForm(parc, profileByParc.get(parc)) : emptyForm);

  // Les UC déjà rattachés à un autre véhicule ne sont pas proposés.
  const availableDevices = devices.filter((device) => !device.vehicleParc || device.vehicleParc === form.vehicleParc);
  const serialIsDetected = devices.some((device) => device.serial === normalizeSerial(form.ucSerial));

  const save = async (event) => {
    event.preventDefault();
    if (!form.vehicleParc) {
      toast({ status: 'warning', title: 'Choisissez un véhicule' });
      return;
    }
    const imei = form.imei.replace(/\s+/g, '');
    if (imei && !/^\d{14,17}$/.test(imei)) {
      toast({ status: 'warning', title: 'IMEI invalide', description: '14 à 17 chiffres attendus.' });
      return;
    }
    try {
      setSaving(true);
      await ineoAPI.saveVehicleProfile(form.vehicleParc, { ...form, ucSerial: normalizeSerial(form.ucSerial) });
      const previousImei = profileByParc.get(form.vehicleParc)?.imei || '';
      const previousLabel = profileByParc.get(form.vehicleParc)?.deviceLabel || '';
      if (imei && (imei !== previousImei || form.deviceLabel.trim() !== previousLabel)) await ineoAPI.saveVehicleTracker(form.vehicleParc, { imei, deviceLabel: form.deviceLabel });
      toast({ status: 'success', title: `Profil ${form.vehicleParc} enregistré` });
      await load();
    } catch (error) {
      toast({ status: 'error', title: 'Enregistrement impossible', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return <VStack align="stretch" spacing={5}>
    <Box>
      <Text fontSize="20px" fontWeight="700" color="#17364d">Profils véhicules</Text>
      <Text color="#60727e">Un profil regroupe les caractéristiques d’un véhicule, son boîtier GPS (IMEI) et son ordinateur embarqué (UC). Choisissez un véhicule dans la liste pour le modifier.</Text>
    </Box>

    <Box overflowX="auto" border="1px solid" borderColor="#c6d0d8">
      <Table size="sm">
        <Thead bg="#e9eff3"><Tr><Th>Véhicule</Th><Th>Modèle</Th><Th>Type</Th><Th>IMEI</Th><Th>N° de série UC</Th><Th isNumeric>Services affectés</Th></Tr></Thead>
        <Tbody>
          {loading && <Tr><Td colSpan={6}><Spinner size="sm" color="#005a9e" /></Td></Tr>}
          {!loading && vehicles.map((vehicle) => {
            const profile = profileByParc.get(vehicle.parc);
            const activeServices = missions.filter((mission) => mission.vehicleParc === vehicle.parc && mission.status !== 'COMPLETED' && mission.status !== 'CANCELLED').length;
            return <Tr key={vehicle.parc} cursor="pointer" bg={form.vehicleParc === vehicle.parc ? '#e1edf7' : undefined} _hover={{ bg: '#f0f5f9' }} onClick={() => selectVehicle(vehicle.parc)}>
              <Td fontWeight="600">{vehicle.parc} <Text as="span" fontWeight="400" color="#60727e">{vehicle.immat || ''}</Text></Td>
              <Td>{vehicle.modele || '-'}</Td>
              <Td>{profile?.vehicleType || <Text as="span" color="gray.400">-</Text>}</Td>
              <Td>{profile?.imei || <Text as="span" color="gray.400">-</Text>}</Td>
              <Td>{profile?.ucSerial ? <Badge colorScheme="green">{profile.ucSerial}</Badge> : <Text as="span" color="gray.400">-</Text>}</Td>
              <Td isNumeric>{activeServices}</Td>
            </Tr>;
          })}
        </Tbody>
      </Table>
    </Box>

    <Box as="form" onSubmit={save} border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={5}>
      <FormControl maxW="420px" mb={4} isRequired>
        <FormLabel>Véhicule</FormLabel>
        <Select bg="white" value={form.vehicleParc} onChange={(event) => selectVehicle(event.target.value)} placeholder="Choisir un véhicule">
          {vehicles.map((vehicle) => <option key={vehicle.parc} value={vehicle.parc}>{vehicle.parc} - {vehicle.immat || vehicle.modele}</option>)}
        </Select>
      </FormControl>
      {selectedVehicle && <Box mb={5} px={3} py={2} bg="#e9eff3" borderLeft="3px solid" borderColor="#005a9e" fontSize="sm"><Text><b>Immat :</b> {selectedVehicle.immat || '-'} &nbsp; <b>Marque :</b> {selectedVehicle.marque || '-'} &nbsp; <b>Modèle :</b> {selectedVehicle.modele || '-'} &nbsp; <b>Énergie :</b> {selectedVehicle.energie || '-'}</Text></Box>}

      <Text fontWeight="700" mb={2}>Matériel embarqué</Text>
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mb={5}>
        <FormControl><FormLabel>Numéro IMEI (boîtier GPS)</FormLabel><Input bg="white" inputMode="numeric" value={form.imei} onChange={(event) => update('imei', event.target.value.replace(/\D/g, ''))} placeholder="14 à 17 chiffres" /></FormControl>
        <FormControl><FormLabel>Nom de l’appareil</FormLabel><Input bg="white" value={form.deviceLabel} onChange={(event) => update('deviceLabel', event.target.value)} placeholder="Ex. Urbex VH 920" /></FormControl>
        <FormControl>
          <FormLabel>Numéro de série UC (ordinateur embarqué)</FormLabel>
          <Input bg="white" value={form.ucSerial} onChange={(event) => update('ucSerial', event.target.value)} placeholder="Extrait automatiquement par le logiciel Inéo RétroBus" />
          <FormHelperText>{form.ucSerial && !serialIsDetected ? 'Ce numéro n’a pas encore été vu par un UC.' : 'Le logiciel envoie le numéro de série (SN) de l’ordinateur au premier démarrage.'}</FormHelperText>
        </FormControl>
        {availableDevices.length > 0 && <FormControl>
          <FormLabel>UC détectés</FormLabel>
          <Select bg="white" value="" onChange={(event) => event.target.value && update('ucSerial', event.target.value)} placeholder="Rattacher un UC détecté à ce véhicule">
            {availableDevices.map((device) => <option key={device.id} value={device.serial}>{device.serial}{device.hostname ? ` - ${device.hostname}` : ''} (vu le {formatDate(device.lastSeenAt)})</option>)}
          </Select>
        </FormControl>}
      </Grid>

      <Text fontWeight="700" mb={2}>Caractéristiques</Text>
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }} gap={4}>
        <FormControl><FormLabel>Type</FormLabel><Select bg="white" value={form.vehicleType} onChange={(event) => update('vehicleType', event.target.value)} placeholder="Choisir un type">{vehicleTypes.map((type) => <option key={type} value={type}>{type}</option>)}</Select></FormControl>
        <FormControl><FormLabel>Vitesse maximale (km/h)</FormLabel><Input bg="white" type="number" min="0" value={form.maxSpeedKmh} onChange={(event) => update('maxSpeedKmh', event.target.value)} /></FormControl>
        <FormControl><FormLabel>Longueur (m)</FormLabel><Input bg="white" type="number" step="0.01" min="0" value={form.lengthM} onChange={(event) => update('lengthM', event.target.value)} /></FormControl>
        <FormControl><FormLabel>Largeur (m)</FormLabel><Input bg="white" type="number" step="0.01" min="0" value={form.widthM} onChange={(event) => update('widthM', event.target.value)} /></FormControl>
        <FormControl><FormLabel>Hauteur (m)</FormLabel><Input bg="white" type="number" step="0.01" min="0" value={form.heightM} onChange={(event) => update('heightM', event.target.value)} /></FormControl>
        <FormControl gridColumn={{ base: 'auto', md: 'span 2', xl: 'span 3' }}><FormLabel>Options</FormLabel><Textarea bg="white" value={form.options} onChange={(event) => update('options', event.target.value)} placeholder="Ex. girouette, rampe PMR, climatisation, sono..." /></FormControl>
      </Grid>
      <HStack justify="flex-end" mt={5}><Button type="submit" isLoading={saving} isDisabled={!form.vehicleParc} leftIcon={<FiSave />} colorScheme="blue" borderRadius="2px">Enregistrer le profil</Button></HStack>
    </Box>

    {devices.length > 0 && <Box border="1px solid" borderColor="#c6d0d8" p={4}>
      <Text fontWeight="700" mb={2}>UC détectés</Text>
      {devices.map((device) => <Text key={device.id} fontSize="sm">{device.serial}{device.hostname ? ` (${device.hostname})` : ''} - {device.vehicleParc ? `véhicule ${device.vehicleParc}` : 'non rattaché'} - vu le {formatDate(device.lastSeenAt)}{device.appVersion ? ` - version ${device.appVersion}` : ''}</Text>)}
    </Box>}
  </VStack>;
}
