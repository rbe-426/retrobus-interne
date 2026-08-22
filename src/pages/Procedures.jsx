import React from 'react';
import {
  Badge,
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  List,
  ListItem,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiBook, FiCheckCircle, FiFileText, FiTool, FiUsers } from 'react-icons/fi';
import PageLayout from '../components/Layout/PageLayout';

const procedures = [
  {
    title: 'Procédures véhicules',
    icon: FiUsers,
    color: 'blue',
    steps: [
      'Consulter la fiche du véhicule avant chaque sortie ou intervention.',
      'Contrôler les éléments de sécurité, les niveaux et les documents de bord.',
      'Tracer l’utilisation, l’anomalie ou l’intervention réalisée.',
    ],
  },
  {
    title: 'Procédures commerciales',
    icon: FiFileText,
    color: 'teal',
    steps: [
      'Qualifier le besoin et préparer la proposition ou le devis.',
      'Valider les tarifs, conditions et disponibilités avant confirmation.',
      'Archiver les échanges et assurer le suivi jusqu’à la clôture.',
    ],
  },
  {
    title: 'Procédures TOURNAGE & SAFE',
    icon: FiTool,
    color: 'orange',
    steps: [
      'Définir le périmètre, les véhicules et les responsables du tournage.',
      'Vérifier les autorisations, assurances et contraintes du lieu.',
      'Faire le briefing SAFE avant le début puis consigner les incidents.',
    ],
  },
  {
    title: 'Procédures Sécurité',
    color: 'purple',
    steps: [
      'Identifier le risque, sécuriser la zone et alerter le responsable.',
      'Appliquer les consignes d’évacuation, de premiers secours ou d’incendie.',
      'Déclarer l’événement et suivre les mesures correctives.',
    ],
  },
];

export default function Procedures() {
  return (
    <PageLayout
      title="Procédures"
      subtitle="Référentiel opérationnel RétroBus Essonne"
      headerVariant="card"
      bgGradient="linear(to-r, purple.600, purple.800)"
      titleSize="lg"
    >
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="md" mb={2}>Référentiels par activité</Heading>
          <Text color="gray.600">Choisissez la catégorie correspondant à votre opération.</Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {procedures.map((procedure) => (
            <Card key={procedure.title} borderWidth="1px" borderColor="gray.200" borderTopWidth="4px" borderTopColor={`${procedure.color}.500`}>
              <CardHeader pb={2}>
                <HStack>
                  <Box color={`${procedure.color}.500`}><procedure.icon size={22} /></Box>
                  <Heading size="sm">{procedure.title}</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={2}>
                <List spacing={3}>
                  {procedure.steps.map((step, index) => (
                    <ListItem key={step} display="flex" alignItems="flex-start" gap={3}>
                      <Badge colorScheme={procedure.color} borderRadius="full" minW="24px" textAlign="center">{index + 1}</Badge>
                      <Text fontSize="sm" color="gray.700">{step}</Text>
                    </ListItem>
                  ))}
                </List>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>

        <HStack color="gray.600" fontSize="sm">
          <FiCheckCircle />
          <Text>Les procédures détaillées et leurs mises à jour sont centralisées ici.</Text>
        </HStack>
      </VStack>
    </PageLayout>
  );
}
