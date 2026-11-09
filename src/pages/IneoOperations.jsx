import React from 'react';
import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import IneoDesktopInstaller from './IneoDesktopInstaller';

const isIneoOperator = ({ matricule, user }) => {
  const identities = [matricule, user?.username, user?.email]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
  return identities.includes('w.belaidi') || identities.includes('belaidiw91@gmail.com');
};

export default function IneoOperations() {
  const userContext = useUser();
  if (!isIneoOperator(userContext)) return <Navigate to="/dashboard/home" replace />;

  return (
    <VStack align="stretch" spacing={8}>
      <Box>
        <Heading fontSize="22px" color="#17364d">Inéo RétroBus Planification</Heading>
        <Text color="#60727e" mt={1}>
          La gestion des opérations (services, itinéraires, conducteurs, flashs, suivi, pilotage, profils d'écran)
          est désormais assurée par l'application de bureau. Téléchargez-la ci-dessous et connectez-vous avec votre compte URBEX.
        </Text>
      </Box>
      <IneoDesktopInstaller product="PLANNING" />
      <IneoDesktopInstaller />
      <IneoDesktopInstaller product="MAINTENANCE" />
      <IneoDesktopInstaller product="CONSOLE" />
    </VStack>
  );
}
