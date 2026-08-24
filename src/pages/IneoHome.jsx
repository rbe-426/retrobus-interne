import React from 'react';
import { Box, Button, Heading, Icon, Text, VStack } from '@chakra-ui/react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { FiActivity, FiExternalLink, FiMapPin, FiSettings, FiTruck } from 'react-icons/fi';
import WorkspaceLayout from '../components/Layout/WorkspaceLayout';
import IneoDriver from './IneoDriver';

const isIneoManager = ({ matricule, user }) => {
  const identity = String(matricule || user?.email || '').trim().toLowerCase();
  return identity === 'w.belaidi' || identity === 'belaidiw91@gmail.com';
};

const openIneoOperations = () => {
  const operationsWindow = window.open(
    '/dashboard/ineo-retrobus',
    'ineo-retrobus-operations',
    'popup=yes,width=1500,height=960,left=80,top=40,resizable=yes,scrollbars=yes'
  );
  operationsWindow?.focus();
};

const openFreeTracking = () => {
  const trackingWindow = window.open(
    '/myrbe/ineo-retrobus/tracage-libre',
    'ineo-free-tracking',
    'popup=yes,width=680,height=820,left=140,top=70,resizable=yes,scrollbars=yes'
  );
  trackingWindow?.focus();
};

const IneoManagementLauncher = () => (
  <Box minH={{ base: 'auto', md: 'calc(100vh - 220px)' }} display="flex" alignItems="center" justifyContent="center" py={{ base: 4, md: 10 }}>
    <VStack maxW="md" spacing={5} textAlign="center" bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={{ base: 6, md: 9 }} boxShadow="sm">
      <Icon as={FiSettings} boxSize={10} color="rbe.600" />
      <VStack spacing={2}>
        <Heading size="md">Gestion des services</Heading>
        <Text color="gray.600" fontSize="sm">Ouvrez le poste Inéo dédié pour créer les affectations, suivre les véhicules actifs, les horaires et les dernières positions GPS.</Text>
      </VStack>
      <Button colorScheme="rbe" size="lg" leftIcon={<FiExternalLink />} onClick={openIneoOperations}>
        Ouvrir Inéo RétroBus
      </Button>
      <Button colorScheme="orange" size="lg" leftIcon={<FiMapPin />} onClick={openFreeTracking}>
        Traçage libre
      </Button>
    </VStack>
  </Box>
);

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
      render: () => <IneoDriver embedded />,
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