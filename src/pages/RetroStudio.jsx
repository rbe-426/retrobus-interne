import React from 'react';
import {
  Box,
  Button,
  HStack,
  SimpleGrid,
  Text,
  VStack
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiCalendar, FiVideo } from 'react-icons/fi';
import PageLayout from '../components/Layout/PageLayout';
import ModernCard from '../components/Layout/ModernCard';

export default function RetroStudio() {
  return (
    <PageLayout
      title="RetroStudio"
      subtitle="Espace de coordination audiovisuelle"
      headerVariant="card"
      bgGradient="linear(to-r, red.600, orange.500)"
      titleSize="lg"
      titleWeight="700"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/home' },
        { label: 'MyRBE', href: '/dashboard/myrbe' },
        { label: 'RetroStudio', href: '/myrbe/retrostudio' }
      ]}
    >
      <VStack spacing={6} align="stretch">
        <Box>
          <Text color="gray.600">
            Préparez les tournages et accédez aux outils de création audiovisuelle.
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <ModernCard
            title="Planifier un tournage"
            description="Créer et suivre les événements de tournage."
            icon={FiCalendar}
            color="red"
            as={RouterLink}
            to="/dashboard/events-management"
          />
          <ModernCard
            title="Ouvrir Lumistudio"
            description="Accéder à l'outil de création audiovisuelle."
            icon={FiVideo}
            color="orange"
            as={RouterLink}
            to="/myrbe/lumistudio"
          />
        </SimpleGrid>

        <HStack justify="flex-end">
          <Button as={RouterLink} to="/dashboard/myrbe" variant="outline">
            Retour à MyRBE
          </Button>
        </HStack>
      </VStack>
    </PageLayout>
  );
}