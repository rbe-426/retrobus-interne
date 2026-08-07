import React, { useEffect, useState } from 'react';
import { Box, Button, FormControl, FormLabel, Grid, HStack, Input, Select, Spinner, Text, Textarea, VStack, useToast } from '@chakra-ui/react';
import { FiDownload, FiPlus, FiSave } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';

const vehicleTypes = ['BUS STANDARD', 'BUS ARTICULE', 'BUS BI ARTICULE', 'BUS GABARIT REDUIT', 'VOITURES', 'DIVERS'];
const emptyProfile = { vehicleParc: '', vehicleType: '', maxSpeedKmh: '', lengthM: '', widthM: '', heightM: '', options: '' };

export default function IneoVehicleProfiles({ vehicles }) {
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await ineoAPI.listVehicleProfiles();
      setProfiles(data?.profiles || []);
    } catch (error) {
      toast({ status: 'error', title: 'Profils Inéo indisponibles', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfiles(); }, []);
  const update = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const selectedVehicle = vehicles.find((vehicle) => vehicle.parc === profile.vehicleParc);

  const retrieveRbeInfo = () => {
    if (!selectedVehicle) {
      toast({ status: 'warning', title: 'Choisissez un véhicule RBE' });
      return;
    }
    const existingProfile = profiles.find((item) => item.vehicleParc === selectedVehicle.parc);
    setProfile({
      vehicleParc: selectedVehicle.parc,
      vehicleType: existingProfile?.vehicleType || '',
      maxSpeedKmh: existingProfile?.maxSpeedKmh ?? '',
      lengthM: existingProfile?.lengthM ?? '',
      widthM: existingProfile?.widthM ?? '',
      heightM: existingProfile?.heightM ?? '',
      options: existingProfile?.options || '',
    });
    toast({ status: 'info', title: 'Informations RBE récupérées' });
  };

  const save = async (event) => {
    event.preventDefault();
    if (!profile.vehicleParc) {
      toast({ status: 'warning', title: 'Choisissez un véhicule RBE' });
      return;
    }
    try {
      setSaving(true);
      await ineoAPI.saveVehicleProfile(profile.vehicleParc, profile);
      toast({ status: 'success', title: 'Profil véhicule enregistré' });
      await loadProfiles();
    } catch (error) {
      toast({ status: 'error', title: 'Enregistrement impossible', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return <VStack align="stretch" spacing={5}>
    <HStack justify="space-between" align="start" flexWrap="wrap">
      <Box><Text fontSize="20px" fontWeight="700" color="#17364d">Profils véhicules</Text><Text color="#60727e">Données opérationnelles Inéo liées aux véhicules RBE.</Text></Box>
      <Button leftIcon={<FiPlus />} colorScheme="blue" borderRadius="2px" onClick={() => setProfile(emptyProfile)}>Ajouter profil véhicule</Button>
    </HStack>
    <Box as="form" onSubmit={save} border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={5}>
      <HStack mb={4} align="end" flexWrap="wrap">
        <FormControl maxW="420px" isRequired><FormLabel>Véhicule RBE</FormLabel><Select bg="white" value={profile.vehicleParc} onChange={(event) => update('vehicleParc', event.target.value)} placeholder="Choisir un véhicule">{vehicles.map((vehicle) => <option key={vehicle.parc} value={vehicle.parc}>{vehicle.parc} - {vehicle.immat || vehicle.modele}</option>)}</Select></FormControl>
        <Button leftIcon={<FiDownload />} onClick={retrieveRbeInfo} borderRadius="2px">Récupérer des infos depuis les véhicules RBE</Button>
      </HStack>
      {selectedVehicle && <Box mb={5} px={3} py={2} bg="#e9eff3" borderLeft="3px solid" borderColor="#005a9e" fontSize="sm"><Text><b>N° :</b> {selectedVehicle.parc} &nbsp; <b>Immat :</b> {selectedVehicle.immat || '-'} &nbsp; <b>Marque :</b> {selectedVehicle.marque || '-'} &nbsp; <b>Modèle :</b> {selectedVehicle.modele || '-'} &nbsp; <b>Énergie :</b> {selectedVehicle.energie || '-'}</Text></Box>}
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }} gap={4}>
        <FormControl><FormLabel>Type</FormLabel><Select bg="white" value={profile.vehicleType} onChange={(event) => update('vehicleType', event.target.value)} placeholder="Choisir un type">{vehicleTypes.map((type) => <option key={type} value={type}>{type}</option>)}</Select></FormControl>
        <FormControl><FormLabel>Vitesse maximale (km/h)</FormLabel><Input bg="white" type="number" min="0" value={profile.maxSpeedKmh} onChange={(event) => update('maxSpeedKmh', event.target.value)} /></FormControl>
        <FormControl><FormLabel>Longueur (m)</FormLabel><Input bg="white" type="number" step="0.01" min="0" value={profile.lengthM} onChange={(event) => update('lengthM', event.target.value)} /></FormControl>
        <FormControl><FormLabel>Largeur (m)</FormLabel><Input bg="white" type="number" step="0.01" min="0" value={profile.widthM} onChange={(event) => update('widthM', event.target.value)} /></FormControl>
        <FormControl><FormLabel>Hauteur (m)</FormLabel><Input bg="white" type="number" step="0.01" min="0" value={profile.heightM} onChange={(event) => update('heightM', event.target.value)} /></FormControl>
        <FormControl gridColumn={{ base: 'auto', md: 'span 2', xl: 'span 3' }}><FormLabel>Options</FormLabel><Textarea bg="white" value={profile.options} onChange={(event) => update('options', event.target.value)} placeholder="Ex. girouette, rampe PMR, climatisation, sono..." /></FormControl>
      </Grid>
      <HStack justify="flex-end" mt={5}><Button type="submit" isLoading={saving} leftIcon={<FiSave />} colorScheme="blue" borderRadius="2px">Enregistrer le profil</Button></HStack>
    </Box>
    <Box border="1px solid" borderColor="#c6d0d8" p={4}><Text fontWeight="700" mb={2}>Profils enregistrés</Text>{loading ? <Spinner color="#005a9e" /> : profiles.length ? profiles.map((item) => <Text key={item.id} fontSize="sm">{item.vehicleParc} - {item.vehicleType || 'Type non renseigné'} - {item.maxSpeedKmh == null ? 'Vitesse non renseignée' : `${item.maxSpeedKmh} km/h`}</Text>) : <Text fontSize="sm" color="gray.500">Aucun profil véhicule Inéo.</Text>}</Box>
  </VStack>;
}
