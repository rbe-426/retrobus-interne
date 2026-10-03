import React from 'react';
import {
  Badge,
  Box,
  Card,
  CardBody,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiActivity, FiCommand, FiCpu, FiServer } from 'react-icons/fi';
import PageLayout from '../components/Layout/PageLayout';

const phaseOneItems = [
  { icon: FiCpu, title: 'Connexion Discord', text: 'Le statut détaillé sera relié au panel via une API inter-services sécurisée.', color: 'orange.400' },
  { icon: FiCommand, title: 'Commandes', text: 'La commande principale /920 regroupe ping, about et anniversaire.', color: 'blue.400' },
  { icon: FiServer, title: 'Service autonome', text: 'Health check et redémarrage indépendant d’URBEX.', color: 'green.400' },
];

export default function Bot920Management() {
  return (
    <PageLayout
      title="920 Le Bot !"
      subtitle="Centre de suivi du bot communautaire Discord de RétroBus Essonne"
      bgGradient="linear(to-r, gray.900, trilogy.navy)"
      breadcrumbs={[
        { label: 'Accueil', href: '/accueil' },
        { label: 'MyRBE', href: '/accueil/myrbe' },
        { label: '920 Le Bot !', href: '/accueil/myrbe/920lebot' },
      ]}
    >
      <VStack align="stretch" spacing={6}>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <Card borderWidth="1px" borderColor="orange.200">
            <CardBody>
              <Flex justify="space-between" align="start">
                <Box>
                  <Text fontSize="sm" color="gray.500">État du bot</Text>
                  <Heading size="md" mt={1}>Supervision à relier</Heading>
                </Box>
                <Badge colorScheme="orange">Phase 1</Badge>
              </Flex>
              <Text fontSize="sm" color="gray.600" mt={3}>Le panel attend son endpoint URBEX sécurisé pour afficher le statut temps réel.</Text>
            </CardBody>
          </Card>

          <Card borderWidth="1px" borderColor="blue.200">
            <CardBody>
              <Flex justify="space-between" align="start">
                <Box>
                  <Text fontSize="sm" color="gray.500">Commandes Phase 1</Text>
                  <Heading size="md" mt={1}>1 principale</Heading>
                </Box>
                <Icon as={FiCommand} color="blue.500" boxSize={6} />
              </Flex>
              <Text fontSize="sm" color="gray.600" mt={3}>/920 regroupe les sous-commandes ping, about et anniversaire.</Text>
            </CardBody>
          </Card>

          <Card borderWidth="1px" borderColor="green.200">
            <CardBody>
              <Flex justify="space-between" align="start">
                <Box>
                  <Text fontSize="sm" color="gray.500">URBEX</Text>
                  <Heading size="md" mt={1}>Panel connecté</Heading>
                </Box>
                <Icon as={FiActivity} color="green.500" boxSize={6} />
              </Flex>
              <Text fontSize="sm" color="gray.600" mt={3}>Le suivi du bot est intégré à l’environnement interne RBE.</Text>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Box>
          <Heading size="md">Mise en service</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={4}>
            {phaseOneItems.map((item) => (
              <Card key={item.title} variant="outline">
                <CardBody>
                  <Icon as={item.icon} boxSize={6} color={item.color} />
                  <Heading size="sm" mt={4}>{item.title}</Heading>
                  <Text fontSize="sm" color="gray.600" mt={2} lineHeight="tall">{item.text}</Text>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>
      </VStack>
    </PageLayout>
  );
}