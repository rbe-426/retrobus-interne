import React, { useState } from 'react';
import { Box, Button, Heading, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { FiActivity, FiExternalLink, FiSettings, FiTruck } from 'react-icons/fi';
import WorkspaceLayout from '../components/Layout/WorkspaceLayout';
import IneoDriver from './IneoDriver';
import { apiClient } from '../api/config';
import { ineoAPI } from '../api/ineo';
import { writeIneoLaunchCache } from '../utils/ineoLaunchCache';

const isIneoManager = ({ matricule, user }) => {
  const identity = String(matricule || user?.email || '').trim().toLowerCase();
  return identity === 'w.belaidi' || identity === 'belaidiw91@gmail.com';
};

const LAUNCH_STEPS = [
  { label: 'Connexion au serveur Inéo...', run: async () => { await apiClient.get('/health'); } },
  { label: 'Chargement des mains-d’œuvre...', run: async (cache) => { const [memberData, profileData] = await Promise.all([apiClient.get('/members?limit=500'), ineoAPI.listDriverProfiles()]); cache.members = memberData?.members || memberData || []; cache.driverProfiles = profileData?.profiles || []; } },
  { label: 'Chargement des circuits et des IMEI...', run: async (cache) => { const [routeData, trackerData, vehicleProfileData] = await Promise.all([ineoAPI.listRoutes(), ineoAPI.listVehicleTrackers(), ineoAPI.listVehicleProfiles()]); cache.routes = routeData?.routes || []; cache.trackers = trackerData?.trackers || []; cache.vehicleProfiles = vehicleProfileData?.profiles || []; } },
  { label: 'Chargement des services et véhicules...', run: async (cache) => { const [missionData, vehicleData] = await Promise.all([ineoAPI.listMissions(), apiClient.get('/vehicles')]); cache.missions = missionData?.missions || []; cache.vehicles = vehicleData?.vehicles || vehicleData || []; } },
];

const IneoManagementLauncher = () => {
  const [launching, setLaunching] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [error, setError] = useState('');

  const launch = async () => {
    setLaunching(true);
    setError('');
    const cache = {};
    try {
      for (let index = 0; index < LAUNCH_STEPS.length; index += 1) {
        setStepIndex(index);
        await LAUNCH_STEPS[index].run(cache);
      }
      writeIneoLaunchCache(cache);
      setStepIndex(LAUNCH_STEPS.length);
      const operationsWindow = window.open(
        '/dashboard/ineo-retrobus',
        'ineo-retrobus-operations',
        'popup=yes,width=1500,height=960,left=80,top=40,resizable=yes,scrollbars=yes'
      );
      if (!operationsWindow) throw new Error('[RBE-POPUP-001] La fenetre Inéo a ete bloquee par le navigateur. Autorisez les popups puis relancez la commande.');
      operationsWindow?.focus();
    } catch (launchError) {
      setError(launchError.message || '[RBE-INEO-000] Erreur inconnue lors du chargement Inéo.');
    } finally {
      setLaunching(false);
      setStepIndex(-1);
    }
  };

  return (
    <Box minH={{ base: 'auto', md: 'calc(100vh - 220px)' }} display="flex" alignItems="center" justifyContent="center" py={{ base: 4, md: 10 }}>
      <VStack maxW="md" spacing={5} textAlign="center" bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={{ base: 6, md: 9 }} boxShadow="sm">
        <Icon as={FiSettings} boxSize={10} color="rbe.600" />
        <VStack spacing={2}>
          <Heading size="md">Gestion des services</Heading>
          <Text color="gray.600" fontSize="sm">Ouvrez le poste Inéo dédié pour créer les affectations, suivre les véhicules actifs, les horaires et les dernières positions GPS.</Text>
        </VStack>
        <Button colorScheme="rbe" size="lg" leftIcon={<FiExternalLink />} isLoading={launching} loadingText="Ouvrir Inéo RétroBus" onClick={launch}>
          Ouvrir Inéo RétroBus
        </Button>
        {launching && stepIndex >= 0 && (
          <HStack spacing={3} color="gray.600" fontSize="sm">
            <Spinner size="sm" color="rbe.500" />
            <Text>{LAUNCH_STEPS[stepIndex]?.label || 'Ouverture de l’application RétroNéo...'}</Text>
          </HStack>
        )}
        {error && <VStack align="stretch" spacing={1} w="full" bg="red.50" borderLeft="3px solid" borderColor="red.500" px={3} py={2} textAlign="left"><Text color="red.700" fontWeight="700" fontSize="sm">Problème serveur - impossible d'executer la commande...</Text><Text color="red.700" fontSize="xs">{error}</Text></VStack>}
      </VStack>
    </Box>
  );
};

export default function IneoHome() {
  const userContext = useUser();
  const manager = isIneoManager(userContext);

  if (!manager) {
    return <Navigate to="/myrbe/ineo-retrobus/service" replace />;
  }

  const sections = [
    {
      id: 'management',
      label: 'Gestion Inéo',
      description: 'Missions et supervision',
      icon: FiSettings,
      render: () => <IneoManagementLauncher />,
    },
    {
      id: 'service',
      label: 'Votre Service',
      description: 'Cockpit conducteur',
      icon: FiTruck,
      render: () => <Navigate to="/myrbe/ineo-retrobus/service" replace />,
    },
  ];

  return <WorkspaceLayout
    title="Inéo RétroBus"
    subtitle="Pilotage des missions, véhicules et services"
    sections={sections}
    defaultSectionId="management"
    sidebarTitle="Inéo RétroBus"
    sidebarSubtitle="Centre d'exploitation"
    sidebarTitleIcon={FiActivity}
    versionLabel="MyRBE Inéo"
    sidebarFooter="RétroBus Essonne · Inéo"
  />;
}