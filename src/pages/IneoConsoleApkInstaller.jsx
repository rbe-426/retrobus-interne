import React, { useEffect, useState } from 'react';
import { Badge, Box, Button, HStack, Spinner, Text, VStack, useToast } from '@chakra-ui/react';
import { FiDownload, FiSmartphone } from 'react-icons/fi';
import { API_BASE_URL } from '../api/config';
import { ineoAPI } from '../api/ineo';

const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;

// Installation de la console mobile : l'APK est téléchargé avec la session, puis proposé au navigateur.
export default function IneoConsoleApkInstaller() {
  const toast = useToast();
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    ineoAPI.getConsoleApk()
      .then((data) => setRelease(data?.release || null))
      .catch((error) => toast({ status: 'error', title: 'Application indisponible', description: error.message, id: 'console-apk' }))
      .finally(() => setLoading(false));
  }, [toast]);

  const download = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/ineo/console-apk/${encodeURIComponent(release.id)}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `Téléchargement impossible (${response.status}).`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = release.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      toast({ status: 'error', title: 'Téléchargement impossible', description: error.message });
    } finally {
      setDownloading(false);
    }
  };

  return <VStack align="stretch" spacing={3}>
    <HStack spacing={3}>
      <FiSmartphone size={22} />
      <Text fontWeight="700">Console mobile</Text>
      {release && <Badge colorScheme="green">{release.version}</Badge>}
    </HStack>
    {loading && <Spinner size="sm" color="rbe.500" />}
    {!loading && !release && <Text fontSize="sm" color="gray.600">L’application n’est pas encore disponible.</Text>}
    {release && <>
      <Text fontSize="sm" color="gray.600">Application Android (10 ou plus), {formatSize(release.size)}. Elle ne s’active que sur un IMEI rattaché à un véhicule équipé d’un UC.</Text>
      <Button colorScheme="orange" size="lg" leftIcon={<FiDownload />} isLoading={downloading} onClick={download}>Télécharger l’APK</Button>
      <Box fontSize="xs" color="gray.500">Après le téléchargement, ouvrez le fichier et autorisez l’installation depuis cette source.</Box>
    </>}
  </VStack>;
}
