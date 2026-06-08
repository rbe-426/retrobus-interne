import React from 'react';
import {
  VStack,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Button,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Alert,
  AlertIcon,
  Icon,
  Box,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import {
  FiGlobe,
  FiLayout,
  FiImage,
  FiShield,
  FiType,
  FiAlertTriangle,
  FiCheckCircle,
  FiUsers,
  FiTrendingUp,
  FiTarget,
} from 'react-icons/fi';
import SidebarLayout from '../components/SidebarLayout';
import { useSidebar } from '../context/SidebarContext';

export default function TrilogyRBEExterne() {
  const cardBg = useColorModeValue('white', 'gray.800');
  const { closeOnMobile } = useSidebar();

  const sidebarContent = (
    <VStack align="stretch" spacing={0} w="full" h="full">
      <Box p={6} borderBottom="1px" borderColor="gray.200">
        <HStack spacing={3}>
          <Icon as={FiLayout} color="rbe.500" boxSize={6} />
          <Box>
            <Heading size="md" color="gray.800">Trilogy RBE</Heading>
            <Text fontSize="sm" color="gray.500">Layouts & composants</Text>
          </Box>
        </HStack>
      </Box>

      <VStack align="stretch" spacing={0} px={3} py={4} flex={1}>
        <Button
          as={RouterLink}
          to="/dashboard/trilogy-rbe"
          variant="ghost"
          justifyContent="flex-start"
          w="full"
          borderLeft="3px"
          borderColor="transparent"
          borderRadius={0}
          px={4}
          py={6}
          fontSize="sm"
          fontWeight="500"
          _hover={{ bg: 'gray.100', borderLeftColor: 'blue.500' }}
          onClick={closeOnMobile}
        >
          Trilogy Interne
        </Button>

        <Button
          variant="ghost"
          justifyContent="flex-start"
          w="full"
          bg="blue.50"
          borderLeft="3px"
          borderColor="blue.500"
          borderRadius={0}
          px={4}
          py={6}
          fontSize="sm"
          fontWeight="600"
          color="blue.600"
        >
          Trilogy Externe
        </Button>
      </VStack>

      <Box p={4} borderTop="1px" borderColor="gray.200" fontSize="xs" color="gray.500" textAlign="center" w="full">
        MyRBE Trilogy
      </Box>
    </VStack>
  );

  return (
    <SidebarLayout sidebar={sidebarContent}>
      <VStack align="stretch" spacing={0} h="full" w="full">
        <Box p={6} borderBottom="1px" borderColor="gray.200" bg="white">
          <HStack justify="space-between">
            <Box>
              <Heading size="lg">Trilogy RBE - Externe</Heading>
              <Text fontSize="sm" color="gray.500">
                Référentiel UX/UI public: contenus, messages, logos et icônes
              </Text>
            </Box>
            <Button as={RouterLink} to="/dashboard/trilogy-rbe" variant="outline" colorScheme="blue" onClick={closeOnMobile}>
              Voir layout Interne
            </Button>
          </HStack>
        </Box>

        <Box flex={1} overflowY="auto" p={6} w="full">
          <VStack spacing={6} align="stretch">
            <Box>
              <Heading size="md" mb={4} color="black">Cap Trilogy Externe 2026</Heading>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                  <CardBody>
                    <HStack mb={2}><Icon as={FiGlobe} color="blue.500" /><Text fontWeight="bold">Lisibilité publique</Text></HStack>
                    <Text fontSize="sm" color="gray.600">Informer clairement sans vocabulaire technique interne.</Text>
                  </CardBody>
                </Card>
                <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                  <CardBody>
                    <HStack mb={2}><Icon as={FiTarget} color="green.500" /><Text fontWeight="bold">Conversion</Text></HStack>
                    <Text fontSize="sm" color="gray.600">Un parcours = un objectif: inscription, don, signature, contact.</Text>
                  </CardBody>
                </Card>
                <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                  <CardBody>
                    <HStack mb={2}><Icon as={FiShield} color="rbe.500" /><Text fontWeight="bold">Confiance</Text></HStack>
                    <Text fontSize="sm" color="gray.600">Affichage clair des statuts, sécurisation perçue, messages rassurants.</Text>
                  </CardBody>
                </Card>
                <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                  <CardBody>
                    <HStack mb={2}><Icon as={FiCheckCircle} color="orange.500" /><Text fontWeight="bold">Robustesse</Text></HStack>
                    <Text fontSize="sm" color="gray.600">Chaque étape gère succès, blocage, et récupération utilisateur.</Text>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </Box>

            <Divider />

            <Box>
              <Heading size="md" mb={4} color="black">Messages d'erreur - Réalité Externe</Heading>
              <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Text fontSize="sm" color="gray.600">
                      Les pages externes (inscription événement, newsletter, bulletin) utilisent useToast sans position explicite.
                      Le comportement observé est un empilement en bas d'écran, du bas vers le haut.
                    </Text>

                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      La Trilogy externe est maintenant alignée sur le comportement réel des messages affichés en production.
                    </Alert>

                    <Table size="sm" variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Type</Th>
                          <Th>Usage externe</Th>
                          <Th>Exemple</Th>
                          <Th>Durée</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        <Tr>
                          <Td><Badge colorScheme="green">success</Badge></Td>
                          <Td>Action finalisée</Td>
                          <Td>Inscription réussie</Td>
                          <Td>2000-3000ms</Td>
                        </Tr>
                        <Tr>
                          <Td><Badge colorScheme="blue">info</Badge></Td>
                          <Td>Contexte non bloquant</Td>
                          <Td>Déjà inscrit</Td>
                          <Td>3000ms</Td>
                        </Tr>
                        <Tr>
                          <Td><Badge colorScheme="orange">warning</Badge></Td>
                          <Td>Pré-requis absent</Td>
                          <Td>Signature manquante</Td>
                          <Td>3000-4000ms</Td>
                        </Tr>
                        <Tr>
                          <Td><Badge colorScheme="red">error</Badge></Td>
                          <Td>Erreur API/validation</Td>
                          <Td>Erreur d'inscription</Td>
                          <Td>4000-5000ms</Td>
                        </Tr>
                      </Tbody>
                    </Table>
                  </VStack>
                </CardBody>
              </Card>
            </Box>

            <Divider />

            <Box>
              <Heading size="md" mb={4} color="black">Règles Logos RBE (Externe)</Heading>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                  <CardHeader><HStack><Icon as={FiImage} color="rbe.500" /><Heading size="sm">Visibilité</Heading></HStack></CardHeader>
                  <CardBody pt={0}><Text fontSize="sm" color="gray.600">Toujours garantir contraste suffisant sur hero, bannière et footer.</Text></CardBody>
                </Card>
                <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                  <CardHeader><HStack><Icon as={FiAlertTriangle} color="orange.500" /><Heading size="sm">Interdits</Heading></HStack></CardHeader>
                  <CardBody pt={0}><Text fontSize="sm" color="gray.600">Pas de logo étiré, pas d'ombres agressives, pas de recolorisation arbitraire.</Text></CardBody>
                </Card>
                <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                  <CardHeader><HStack><Icon as={FiCheckCircle} color="green.500" /><Heading size="sm">Formats</Heading></HStack></CardHeader>
                  <CardBody pt={0}><Text fontSize="sm" color="gray.600">SVG prioritaire, PNG seulement en fallback, favicon dédié pour webapp.</Text></CardBody>
                </Card>
              </SimpleGrid>
            </Box>

            <Divider />

            <Box>
              <Heading size="md" mb={4} color="black">Système d'icônes Externe</Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                  <CardHeader><HStack><Icon as={FiType} color="blue.500" /><Heading size="sm">Règles de style</Heading></HStack></CardHeader>
                  <CardBody pt={0}>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="sm">Garder une seule famille d'icônes par écran (actuellement react-icons/fi).</Text>
                      <Text fontSize="sm">Taille conseillée: 18-20px inline, 24px en tête de bloc.</Text>
                      <Text fontSize="sm">Limiter les couleurs d'icônes à la palette de statut.</Text>
                    </VStack>
                  </CardBody>
                </Card>
                <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                  <CardHeader><HStack><Icon as={FiUsers} color="green.500" /><Heading size="sm">Mapping UX</Heading></HStack></CardHeader>
                  <CardBody pt={0}>
                    <Table size="sm">
                      <Thead><Tr><Th>Contexte</Th><Th>Repère</Th></Tr></Thead>
                      <Tbody>
                        <Tr><Td>Inscription</Td><Td>FiUsers</Td></Tr>
                        <Tr><Td>Confiance</Td><Td>FiShield</Td></Tr>
                        <Tr><Td>Performance</Td><Td>FiTrendingUp</Td></Tr>
                        <Tr><Td>Alerte</Td><Td>FiAlertTriangle</Td></Tr>
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </Box>

            <Divider />

            <Box>
              <Heading size="md" mb={4} color="black">Checklist QA Externe</Heading>
              <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                <CardBody>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                    <HStack><Badge colorScheme="green">1</Badge><Text fontSize="sm">Message d'erreur actionnable</Text></HStack>
                    <HStack><Badge colorScheme="green">2</Badge><Text fontSize="sm">Ordre toasts validé bas → haut</Text></HStack>
                    <HStack><Badge colorScheme="green">3</Badge><Text fontSize="sm">Logo lisible sur mobile</Text></HStack>
                    <HStack><Badge colorScheme="green">4</Badge><Text fontSize="sm">Iconographie homogène</Text></HStack>
                    <HStack><Badge colorScheme="green">5</Badge><Text fontSize="sm">CTA principal évident</Text></HStack>
                    <HStack><Badge colorScheme="green">6</Badge><Text fontSize="sm">États loading/vide/erreur présents</Text></HStack>
                  </SimpleGrid>
                </CardBody>
              </Card>
            </Box>
          </VStack>
        </Box>
      </VStack>
    </SidebarLayout>
  );
}
