import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge, Box, Button, FormControl, FormLabel, Grid, HStack, Input, Select, Slider, SliderFilledTrack, SliderThumb, SliderTrack,
  Spinner, Switch, Text, Textarea, VStack, useToast,
} from '@chakra-ui/react';
import { FiCopy, FiPlus, FiSave, FiTrash2, FiUpload, FiX } from 'react-icons/fi';
import { ineoAPI } from '../api/ineo';
import IneoScreenPlan from '../components/IneoScreenPlan';
import {
  MAX_IMAGE_BYTES, RESOLUTIONS, SCREEN_PLACES, clampPosition, mediaUrl, newScreenForPlace, readFileAsBase64, screenHeightPct, withKey,
} from '../utils/ineoScreens';

const emptyDraft = { id: null, name: '', description: '', screens: [] };
const toDraft = (profile) => ({ id: profile.id, name: profile.name, description: profile.description || '', screens: (profile.screens || []).map(withKey) });
const resolutionValue = (screen) => {
  const index = RESOLUTIONS.findIndex((item) => item.widthPx === screen.widthPx && item.heightPx === screen.heightPx);
  return index >= 0 ? String(index) : 'custom';
};

function ImageField({ label, mediaId, uploading, onPick, onClear }) {
  const url = mediaUrl(mediaId);
  return <Box border="1px solid" borderColor="#c6d0d8" bg="white" p={3}>
    <Text fontSize="sm" fontWeight="700" mb={2}>{label}</Text>
    <Box h="90px" bg="#eef3f6" border="1px solid #d7e0e6" display="flex" alignItems="center" justifyContent="center" mb={2}>
      {url ? <Box as="img" src={url} alt={label} maxH="88px" maxW="full" objectFit="contain" /> : <Text fontSize="xs" color="gray.500">Aucune image</Text>}
    </Box>
    <HStack>
      <Button as="label" size="xs" leftIcon={<FiUpload />} isLoading={uploading} cursor="pointer" borderRadius="2px">
        Importer
        <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(event) => { onPick(event.target.files?.[0]); event.target.value = ''; }} />
      </Button>
      {mediaId && <Button size="xs" variant="ghost" leftIcon={<FiX />} onClick={onClear}>Retirer</Button>}
    </HStack>
  </Box>;
}

export default function IneoScreenProfiles() {
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [draft, setDraft] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [previewOnline, setPreviewOnline] = useState(true);
  const [pilot, setPilot] = useState(null);

  const loadProfiles = useCallback(async (keepId) => {
    try {
      const data = await ineoAPI.listScreenProfiles();
      const list = data?.profiles || [];
      setProfiles(list);
      return list.find((profile) => profile.id === keepId) || null;
    } catch (error) {
      toast({ status: 'error', title: 'Profils écrans indisponibles', description: error.message });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadProfiles(null); }, [loadProfiles]);

  // État de synchronisation avec le PC pilote (rafraîchi régulièrement).
  useEffect(() => {
    let active = true;
    const refresh = () => ineoAPI.getPilot().then((data) => { if (active) setPilot(data?.pilot || null); }).catch(() => {});
    refresh();
    const timer = setInterval(refresh, 6000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const confirmDiscard = () => !dirty || window.confirm('Des modifications ne sont pas enregistrées. Les abandonner ?');
  const openProfile = (profile) => {
    if (!confirmDiscard()) return;
    const next = toDraft(profile);
    setDraft(next);
    setSelectedKey(next.screens[0]?.key || null);
    setDirty(false);
  };
  const newProfile = () => {
    if (!confirmDiscard()) return;
    setDraft({ ...emptyDraft });
    setSelectedKey(null);
    setDirty(false);
  };

  const patchDraft = (patch) => { setDraft((current) => ({ ...current, ...patch })); setDirty(true); };
  const patchScreen = (key, patch) => {
    setDraft((current) => ({ ...current, screens: current.screens.map((screen) => {
      if (screen.key !== key) return screen;
      const merged = { ...screen, ...patch };
      return { ...merged, ...clampPosition(merged, merged.x, merged.y) };
    }) }));
    setDirty(true);
  };

  const selected = useMemo(() => draft?.screens.find((screen) => screen.key === selectedKey) || null, [draft, selectedKey]);

  const addScreen = (placeValue) => {
    if (!placeValue) return;
    const screen = newScreenForPlace(placeValue, draft.screens.filter((item) => item.place === placeValue).length);
    setDraft((current) => ({ ...current, screens: [...current.screens, screen] }));
    setSelectedKey(screen.key);
    setDirty(true);
  };
  const duplicateScreen = () => {
    if (!selected) return;
    const copy = withKey({ ...selected, id: undefined, key: undefined, name: `${selected.name} (copie)`, ...clampPosition(selected, selected.x + 3, selected.y + 6) });
    setDraft((current) => ({ ...current, screens: [...current.screens, copy] }));
    setSelectedKey(copy.key);
    setDirty(true);
  };
  const removeScreen = () => {
    if (!selected) return;
    const remaining = draft.screens.filter((screen) => screen.key !== selected.key);
    setDraft((current) => ({ ...current, screens: remaining }));
    setSelectedKey(remaining[0]?.key || null);
    setDirty(true);
  };

  const applyPlace = (placeValue) => {
    const place = SCREEN_PLACES.find((item) => item.value === placeValue);
    if (place) patchScreen(selected.key, { place: place.value, x: place.x, y: place.y, widthPct: place.widthPct, widthPx: place.widthPx, heightPx: place.heightPx });
  };

  const uploadImage = async (field, file) => {
    if (!file || !selected) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ status: 'warning', title: 'Image trop lourde', description: `Maximum ${MAX_IMAGE_BYTES / 1024 / 1024} Mo.` });
      return;
    }
    try {
      setUploading(field);
      const result = await ineoAPI.uploadMedia({ fileName: file.name, dataBase64: await readFileAsBase64(file) });
      patchScreen(selected.key, { [field]: result.media.id });
    } catch (error) {
      toast({ status: 'error', title: 'Import impossible', description: error.message });
    } finally {
      setUploading('');
    }
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast({ status: 'warning', title: 'Donnez un nom au profil' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: draft.name,
        description: draft.description,
        screens: draft.screens.map((screen) => { const item = { ...screen }; delete item.key; return item; }),
      };
      const result = draft.id ? await ineoAPI.saveScreenProfile(draft.id, payload) : await ineoAPI.createScreenProfile(payload);
      const saved = toDraft(result.profile);
      await loadProfiles(saved.id);
      setDraft(saved);
      setSelectedKey((current) => saved.screens.find((screen) => screen.name === selected?.name)?.key || saved.screens[0]?.key || current);
      setDirty(false);
      toast({ status: 'success', title: 'Profil écran enregistré', description: pilot?.screenProfileId === saved.id ? 'Le PC pilote le récupérera dans quelques secondes.' : undefined });
    } catch (error) {
      toast({ status: 'error', title: 'Enregistrement impossible', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const removeProfile = async () => {
    if (!draft.id || !window.confirm(`Supprimer le profil « ${draft.name} » ? Les véhicules qui l'utilisent n'auront plus de profil écran.`)) return;
    try {
      await ineoAPI.deleteScreenProfile(draft.id);
      toast({ status: 'success', title: 'Profil supprimé' });
      setDraft(null);
      setDirty(false);
      await loadProfiles(null);
    } catch (error) {
      toast({ status: 'error', title: 'Suppression impossible', description: error.message });
    }
  };

  const syncBadge = () => {
    if (!draft?.id || pilot?.screenProfileId !== draft.id) return null;
    if (dirty) return <Badge colorScheme="orange">Modifications non enregistrées</Badge>;
    if (!pilot.device?.online) return <Badge colorScheme="gray">PC pilote hors ligne</Badge>;
    return pilot.device.revisionApplied ? <Badge colorScheme="green">Synchronisé avec le PC pilote</Badge> : <Badge colorScheme="blue">Synchronisation en cours…</Badge>;
  };

  return <VStack align="stretch" spacing={5}>
    <HStack justify="space-between" align="start" flexWrap="wrap">
      <Box>
        <Text fontSize="20px" fontWeight="700" color="#17364d">Profils écrans</Text>
        <Text color="#60727e">Placez les écrans d’un véhicule (emplacement, puis position et taille) et choisissez leurs images. Un profil se rattache à un véhicule dans « Profils véhicules ».</Text>
      </Box>
      <Button leftIcon={<FiPlus />} colorScheme="blue" borderRadius="2px" onClick={newProfile}>Nouveau profil écran</Button>
    </HStack>

    <HStack flexWrap="wrap" spacing={2}>
      {loading && <Spinner size="sm" color="#005a9e" />}
      {!loading && !profiles.length && <Text fontSize="sm" color="gray.500">Aucun profil écran. Créez-en un pour commencer.</Text>}
      {profiles.map((profile) => <Button key={profile.id} size="sm" borderRadius="2px" variant={draft?.id === profile.id ? 'solid' : 'outline'} colorScheme="blue" onClick={() => openProfile(profile)}>
        {profile.name} <Badge ml={2}>{profile.screens.length}</Badge>
      </Button>)}
    </HStack>

    {draft && <Box border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={5}>
      <Grid templateColumns={{ base: '1fr', md: '1fr 2fr' }} gap={4} mb={4}>
        <FormControl isRequired><FormLabel>Nom du profil</FormLabel><Input bg="white" value={draft.name} maxLength={80} onChange={(event) => patchDraft({ name: event.target.value })} placeholder="Ex. 920 - configuration complète" /></FormControl>
        <FormControl><FormLabel>Description</FormLabel><Input bg="white" value={draft.description} maxLength={300} onChange={(event) => patchDraft({ description: event.target.value })} /></FormControl>
      </Grid>
      {draft.id && profiles.find((profile) => profile.id === draft.id)?.usedBy?.length > 0 && <Text fontSize="sm" color="#60727e" mb={3}>Utilisé par : {profiles.find((profile) => profile.id === draft.id).usedBy.join(', ')}</Text>}

      <Grid templateColumns={{ base: '1fr', xl: '3fr 2fr' }} gap={5}>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between" flexWrap="wrap">
            <Select size="sm" maxW="260px" bg="white" value="" onChange={(event) => addScreen(event.target.value)} placeholder="Ajouter un écran à un emplacement…">
              {SCREEN_PLACES.map((place) => <option key={place.value} value={place.value}>{place.label}</option>)}
            </Select>
            <HStack><Text fontSize="sm">Hors connexion</Text><Switch isChecked={previewOnline} onChange={(event) => setPreviewOnline(event.target.checked)} /><Text fontSize="sm">Connecté</Text></HStack>
          </HStack>
          <IneoScreenPlan screens={draft.screens} selectedKey={selectedKey} onSelect={setSelectedKey} onMove={(key, position) => patchScreen(key, position)} online={previewOnline} />
          <Text fontSize="xs" color="#60727e">Glissez un écran pour le placer. L’aperçu montre les images « {previewOnline ? 'si connecté' : 'perte de connexion'} ».</Text>
          {syncBadge() && <HStack>{syncBadge()}</HStack>}
        </VStack>

        <Box>
          {!selected && <Box border="1px dashed" borderColor="#b7c4cd" p={6} textAlign="center" color="gray.500">Sélectionnez ou ajoutez un écran pour le configurer.</Box>}
          {selected && <VStack align="stretch" spacing={3}>
            <Text fontWeight="700">Écran « {selected.name} »</Text>
            <Grid templateColumns="1fr 1fr" gap={3}>
              <FormControl><FormLabel>Nom</FormLabel><Input size="sm" bg="white" value={selected.name} maxLength={80} onChange={(event) => patchScreen(selected.key, { name: event.target.value })} /></FormControl>
              <FormControl><FormLabel>Emplacement</FormLabel><Select size="sm" bg="white" value={selected.place} onChange={(event) => applyPlace(event.target.value)}>{SCREEN_PLACES.map((place) => <option key={place.value} value={place.value}>{place.label}</option>)}</Select></FormControl>
              <FormControl><FormLabel>Position horizontale (%)</FormLabel><Input size="sm" bg="white" type="number" step="0.5" value={selected.x} onChange={(event) => patchScreen(selected.key, { x: Number(event.target.value) })} /></FormControl>
              <FormControl><FormLabel>Position verticale (%)</FormLabel><Input size="sm" bg="white" type="number" step="0.5" value={selected.y} onChange={(event) => patchScreen(selected.key, { y: Number(event.target.value) })} /></FormControl>
            </Grid>
            <FormControl>
              <FormLabel>Taille sur le plan : {selected.widthPct} % de la longueur ({Math.round(screenHeightPct(selected) * 10) / 10} % de la largeur)</FormLabel>
              <Slider min={3} max={60} step={0.5} value={selected.widthPct} onChange={(value) => patchScreen(selected.key, { widthPct: value })}><SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb /></Slider>
            </FormControl>
            <Grid templateColumns="2fr 1fr 1fr" gap={3}>
              <FormControl><FormLabel>Résolution</FormLabel>
                <Select size="sm" bg="white" value={resolutionValue(selected)} onChange={(event) => { const resolution = RESOLUTIONS[Number(event.target.value)]; if (resolution) patchScreen(selected.key, { widthPx: resolution.widthPx, heightPx: resolution.heightPx }); }}>
                  {RESOLUTIONS.map((resolution, index) => <option key={resolution.label} value={index}>{resolution.label}</option>)}
                  <option value="custom">Personnalisée</option>
                </Select>
              </FormControl>
              <FormControl><FormLabel>Largeur (px)</FormLabel><Input size="sm" bg="white" type="number" min="64" max="7680" value={selected.widthPx} onChange={(event) => patchScreen(selected.key, { widthPx: Number(event.target.value) || 64 })} /></FormControl>
              <FormControl><FormLabel>Hauteur (px)</FormLabel><Input size="sm" bg="white" type="number" min="64" max="4320" value={selected.heightPx} onChange={(event) => patchScreen(selected.key, { heightPx: Number(event.target.value) || 64 })} /></FormControl>
            </Grid>
            <Grid templateColumns="1fr 1fr" gap={3}>
              <ImageField label="Image perte de connexion" mediaId={selected.offlineMediaId} uploading={uploading === 'offlineMediaId'} onPick={(file) => uploadImage('offlineMediaId', file)} onClear={() => patchScreen(selected.key, { offlineMediaId: null })} />
              <ImageField label="Média / image si connecté" mediaId={selected.onlineMediaId} uploading={uploading === 'onlineMediaId'} onPick={(file) => uploadImage('onlineMediaId', file)} onClear={() => patchScreen(selected.key, { onlineMediaId: null })} />
            </Grid>
            <HStack><Button size="sm" leftIcon={<FiCopy />} borderRadius="2px" onClick={duplicateScreen}>Dupliquer</Button><Button size="sm" colorScheme="red" variant="outline" leftIcon={<FiTrash2 />} borderRadius="2px" onClick={removeScreen}>Retirer cet écran</Button></HStack>
          </VStack>}
        </Box>
      </Grid>

      <HStack justify="space-between" mt={5}>
        <Box>{draft.id && <Button size="sm" colorScheme="red" variant="ghost" leftIcon={<FiTrash2 />} onClick={removeProfile}>Supprimer le profil</Button>}</Box>
        <HStack>{dirty && <Text fontSize="sm" color="orange.600">Modifications non enregistrées</Text>}<Button isLoading={saving} isDisabled={!dirty && Boolean(draft.id)} leftIcon={<FiSave />} colorScheme="blue" borderRadius="2px" onClick={save}>Enregistrer le profil</Button></HStack>
      </HStack>
    </Box>}
  </VStack>;
}
