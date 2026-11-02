import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge, Box, Button, FormControl, FormHelperText, FormLabel, Grid, HStack, Input, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useToast,
} from '@chakra-ui/react';
import { FiCheck, FiCopy, FiDownload, FiTrash2, FiUpload } from 'react-icons/fi';
import { API_BASE_URL } from '../api/config';
import { ineoAPI } from '../api/ineo';
import { readFileAsBase64 } from '../utils/ineoScreens';

const MAX_INSTALLER_MB = 60;
const formatDate = (value) => (value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-');
const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
const sameHash = (left, right) => left && right && left.toLowerCase() === right.toLowerCase();

// Le téléchargement exige une session : on récupère le fichier avec le jeton, puis on le propose au navigateur.
async function fetchInstaller(release) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/ineo/desktop-releases/${encodeURIComponent(release.id)}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Téléchargement impossible (${response.status}).`);
  }
  return response.blob();
}

const sha256Of = async (blob) => {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export default function IneoDesktopInstaller() {
  const toast = useToast();
  const [releases, setReleases] = useState([]);
  const [latestId, setLatestId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ version: '', notes: '', file: null });

  const load = useCallback(async () => {
    try {
      const data = await ineoAPI.listDesktopReleases();
      setReleases(data?.releases || []);
      setLatestId(data?.latestId || null);
    } catch (error) {
      toast({ status: 'error', title: 'Installateurs indisponibles', description: error.message, id: 'desktop-releases' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const download = async (release) => {
    try {
      setDownloading(release.id);
      const blob = await fetchInstaller(release);
      const actual = await sha256Of(blob);
      // Une empreinte différente signale un fichier corrompu : on ne le remet pas à l'utilisateur.
      if (actual && !sameHash(actual, release.sha256)) throw new Error('Le fichier téléchargé est corrompu (empreinte SHA-256 différente). Réessayez.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = release.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast({ status: 'success', title: `Installateur ${release.version} téléchargé`, description: 'Lancez-le sur le PC du bus : Windows demandera l’autorisation administrateur.' });
    } catch (error) {
      toast({ status: 'error', title: 'Téléchargement impossible', description: error.message });
    } finally {
      setDownloading('');
    }
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!form.file) {
      toast({ status: 'warning', title: 'Choisissez le fichier .exe' });
      return;
    }
    if (form.file.size > MAX_INSTALLER_MB * 1024 * 1024) {
      toast({ status: 'warning', title: 'Fichier trop lourd', description: `Maximum ${MAX_INSTALLER_MB} Mo.` });
      return;
    }
    try {
      setUploading(true);
      await ineoAPI.uploadDesktopRelease({ version: form.version.trim(), notes: form.notes, dataBase64: await readFileAsBase64(form.file) });
      toast({ status: 'success', title: `Version ${form.version.trim()} enregistrée` });
      setForm({ version: '', notes: '', file: null });
      await load();
    } catch (error) {
      toast({ status: 'error', title: 'Import impossible', description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (release) => {
    if (!window.confirm(`Supprimer l’installateur ${release.version} ? Les postes déjà installés ne sont pas affectés.`)) return;
    try {
      await ineoAPI.deleteDesktopRelease(release.id);
      toast({ status: 'success', title: 'Installateur supprimé' });
      await load();
    } catch (error) {
      toast({ status: 'error', title: 'Suppression impossible', description: error.message });
    }
  };

  const copyHash = async (release) => {
    try {
      await navigator.clipboard.writeText(release.sha256);
      toast({ status: 'info', title: 'Empreinte SHA-256 copiée', description: 'À renseigner dans INEO_RBE_DESKTOP_INSTALLER_SHA256 pour la mise à jour automatique.' });
    } catch {
      toast({ status: 'warning', title: 'Copie impossible', description: release.sha256 });
    }
  };

  const latest = releases.find((release) => release.id === latestId);

  return <VStack align="stretch" spacing={5}>
    <Box>
      <Text fontSize="20px" fontWeight="700" color="#17364d">Logiciel UC — installateur</Text>
      <Text color="#60727e">Installateur du logiciel Inéo RétroBus à poser sur l’ordinateur embarqué (UC) d’un bus. Compatible Windows 7 SP1 à Windows 11.</Text>
    </Box>

    <Box border="1px solid" borderColor="#c6d0d8" bg="#f8fafb" p={5}>
      {loading && <Spinner color="#005a9e" />}
      {!loading && !latest && <Text color="gray.600">Aucun installateur n’est encore disponible. Importez le fichier généré par <b>build-installer.ps1</b> ci-dessous.</Text>}
      {latest && <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
        <Box>
          <HStack mb={1}><Text fontSize="18px" fontWeight="700">Inéo RétroBus {latest.version}</Text><Badge colorScheme="green">Dernière version</Badge></HStack>
          <Text fontSize="sm" color="#60727e">{formatSize(latest.size)} · mise en ligne le {formatDate(latest.createdAt)}{latest.notes ? ` · ${latest.notes}` : ''}</Text>
        </Box>
        <Button size="lg" colorScheme="blue" borderRadius="2px" leftIcon={<FiDownload />} isLoading={downloading === latest.id} onClick={() => download(latest)}>Télécharger l’installateur</Button>
      </HStack>}
      <Box mt={4} fontSize="sm" color="#44525d">
        <Text fontWeight="700" mb={1}>Installation sur l’UC</Text>
        <Text>1. Copiez le fichier sur le PC du bus (clé USB) et lancez-le. 2. Acceptez l’autorisation administrateur. 3. Le logiciel démarre avec Windows et apparaît dans « UC détectés » ; rattachez-le ensuite à son véhicule dans « Profils véhicules ».</Text>
      </Box>
    </Box>

    <Box as="form" onSubmit={upload} border="1px solid" borderColor="#c6d0d8" p={5}>
      <Text fontWeight="700" mb={3}>Mettre en ligne une nouvelle version</Text>
      <Grid templateColumns={{ base: '1fr', md: '1fr 2fr' }} gap={4}>
        <FormControl isRequired>
          <FormLabel>Numéro de version</FormLabel>
          <Input bg="white" value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} placeholder="1.0.2" pattern="\d+\.\d+\.\d+" />
          <FormHelperText>Celui affiché par le script de compilation.</FormHelperText>
        </FormControl>
        <FormControl>
          <FormLabel>Notes (facultatif)</FormLabel>
          <Input bg="white" value={form.notes} maxLength={500} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Ex. Simulateur d’écrans et véhicule pilote" />
        </FormControl>
      </Grid>
      <HStack mt={4} justify="space-between" flexWrap="wrap">
        <HStack>
          <Button as="label" size="sm" leftIcon={<FiUpload />} cursor="pointer" borderRadius="2px">
            Choisir l’installateur (.exe)
            <input type="file" accept=".exe,application/vnd.microsoft.portable-executable,application/x-msdownload" hidden onChange={(event) => { setForm((current) => ({ ...current, file: event.target.files?.[0] || null })); event.target.value = ''; }} />
          </Button>
          <Text fontSize="sm" color="#60727e">{form.file ? `${form.file.name} (${formatSize(form.file.size)})` : 'Aucun fichier choisi'}</Text>
        </HStack>
        <Button type="submit" colorScheme="blue" borderRadius="2px" leftIcon={<FiCheck />} isLoading={uploading} isDisabled={!form.file || !form.version.trim()}>Mettre en ligne</Button>
      </HStack>
    </Box>

    <Box border="1px solid" borderColor="#c6d0d8" overflowX="auto">
      <Table size="sm">
        <Thead bg="#e9eff3"><Tr><Th>Version</Th><Th>Taille</Th><Th>Date</Th><Th>Empreinte SHA-256</Th><Th></Th></Tr></Thead>
        <Tbody>
          {!loading && releases.length === 0 && <Tr><Td colSpan={5} color="gray.500">Aucune version.</Td></Tr>}
          {releases.map((release) => <Tr key={release.id}>
            <Td fontWeight="600">{release.version}{release.id === latestId && <Badge ml={2} colorScheme="green">dernière</Badge>}</Td>
            <Td whiteSpace="nowrap">{formatSize(release.size)}</Td>
            <Td whiteSpace="nowrap">{formatDate(release.createdAt)}</Td>
            <Td fontFamily="monospace" fontSize="xs">{release.sha256.slice(0, 16)}…</Td>
            <Td><HStack spacing={1} justify="flex-end">
              <Button size="xs" leftIcon={<FiDownload />} isLoading={downloading === release.id} onClick={() => download(release)}>Télécharger</Button>
              <Button size="xs" variant="ghost" leftIcon={<FiCopy />} onClick={() => copyHash(release)} title="Copier l’empreinte SHA-256">SHA-256</Button>
              <Button size="xs" variant="ghost" colorScheme="red" leftIcon={<FiTrash2 />} onClick={() => remove(release)}>Supprimer</Button>
            </HStack></Td>
          </Tr>)}
        </Tbody>
      </Table>
    </Box>
  </VStack>;
}
