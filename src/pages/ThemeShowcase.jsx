import React from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Divider,
  useColorModeValue,
  Image,
  Icon,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FiAward, FiBarChart2, FiTrendingUp, FiUsers, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import logo from '../assets/retro_intranet_essonne.svg';
import headerBusImg from '../assets/header-bus.jpg';

export default function ThemeShowcase() {
  const bgColor = useColorModeValue('gray.900', 'gray.950');
  const cardBg = useColorModeValue('white', 'gray.800');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');

  return (
    <Box minH="100vh" bg={sectionBg}>
      {/* DEMO Header - Pas le vrai */}
      <Box 
        color="white" 
        h="120px"
        borderBottom="none"
        bg="gray.900"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={{ base: 3, md: 5 }}
        position="relative"
      >
        {/* Logo fixé à gauche */}
        <Image 
          src={logo} 
          alt="RétroBus Essonne" 
          h="110px" 
          w="auto" 
          flexShrink={0}
          mr={12}
        />
        
        {/* Contenu centré du header */}
        <HStack spacing={8} flex={1} justify="center">
          <Text fontSize="lg" cursor="pointer" _hover={{ color: 'rbe.500' }} transition="color 0.2s">Dashboard</Text>
          <Text fontSize="lg" cursor="pointer" _hover={{ color: 'rbe.500' }} transition="color 0.2s">MyRBE</Text>
          <Text fontSize="lg" cursor="pointer" _hover={{ color: 'rbe.500' }} transition="color 0.2s">Véhicules</Text>
          <Text fontSize="lg" cursor="pointer" _hover={{ color: 'rbe.500' }} transition="color 0.2s">Événements</Text>
        </HStack>
        
        {/* Infos utilisateur à droite */}
        <HStack spacing={4} flexShrink={0}>
          <Badge colorScheme="rbe" variant="solid" px={3} py={1}>Admin</Badge>
          <Text fontSize="sm">Jean Dupont</Text>
        </HStack>
      </Box>

      {/* Contenu principal */}
      <Container maxW="6xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Titre */}
          <Box>
            <Heading size="lg" mb={2} color="black">🎨 Test du Thème RBE</Heading>
            <Text color="gray.600">Démonstration de tous les éléments du thème unifié</Text>
          </Box>

          <Divider />

          {/* Section Couleurs */}
          <Box>
            <Heading size="md" mb={4} color="black">Palette de Couleurs</Heading>
            <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
              <Card bg="rbe.500" color="white">
                <CardBody>
                  <Text fontWeight="bold">RBE 500</Text>
                  <Text fontSize="sm">#d30c4c</Text>
                </CardBody>
              </Card>
              <Card bg="rbe.600" color="white">
                <CardBody>
                  <Text fontWeight="bold">RBE 600</Text>
                  <Text fontSize="sm">#c10744</Text>
                </CardBody>
              </Card>
              <Card bg="blue.500" color="white">
                <CardBody>
                  <Text fontWeight="bold">Blue 500</Text>
                  <Text fontSize="sm">#3b82f6</Text>
                </CardBody>
              </Card>
              <Card bg="green.500" color="white">
                <CardBody>
                  <Text fontWeight="bold">Green 500</Text>
                  <Text fontSize="sm">#10b981</Text>
                </CardBody>
              </Card>
              <Card bg="gray.900" color="white" border="1px solid" borderColor="gray.700">
                <CardBody>
                  <Text fontWeight="bold">Gray 900</Text>
                  <Text fontSize="sm">#0f172a</Text>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Section Boutons */}
          <Box>
            <Heading size="md" mb={4} color="black">Boutons</Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={3}>
                    <Button colorScheme="rbe" w="100%">
                      Primary RBE
                    </Button>
                    <Button variant="outline" colorScheme="rbe" w="100%">
                      Outline RBE
                    </Button>
                    <Button variant="ghost" colorScheme="rbe" w="100%">
                      Ghost RBE
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={3}>
                    <Button colorScheme="blue" w="100%">
                      Primary Blue
                    </Button>
                    <Button variant="outline" colorScheme="blue" w="100%">
                      Outline Blue
                    </Button>
                    <Button variant="ghost" colorScheme="blue" w="100%">
                      Ghost Blue
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={3}>
                    <Button colorScheme="green" w="100%">
                      Primary Green
                    </Button>
                    <Button variant="outline" colorScheme="green" w="100%">
                      Outline Green
                    </Button>
                    <Button variant="ghost" colorScheme="green" w="100%">
                      Ghost Green
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Section Cartes */}
          <Box>
            <Heading size="md" mb={4} color="black">Cartes Modernes</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              <Card bg={cardBg} _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }} transition="all 0.2s">
                <CardHeader>
                  <HStack>
                    <Icon as={FiBarChart2} color="gray.600" boxSize={6} />
                    <Heading size="sm" color="black">Statistiques</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    <Stat>
                      <StatLabel>Total Véhicules</StatLabel>
                      <StatNumber>24</StatNumber>
                    </Stat>
                    <Progress value={75} colorScheme="rbe" />
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg} _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }} transition="all 0.2s">
                <CardHeader>
                  <HStack>
                    <Icon as={FiUsers} color="gray.600" boxSize={6} />
                    <Heading size="sm" color="black">Membres Actifs</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    <Stat>
                      <StatLabel>Utilisateurs</StatLabel>
                      <StatNumber>156</StatNumber>
                    </Stat>
                    <Progress value={60} colorScheme="blue" />
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg} _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }} transition="all 0.2s">
                <CardHeader>
                  <HStack>
                    <Icon as={FiTrendingUp} color="gray.600" boxSize={6} />
                    <Heading size="sm" color="black">Croissance</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    <Stat>
                      <StatLabel>Tendance</StatLabel>
                      <StatNumber>+28%</StatNumber>
                    </Stat>
                    <Progress value={85} colorScheme="green" />
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Section Badges et Tags */}
          <Box>
            <Heading size="md" mb={4}>Badges et Statuts</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={3} align="start">
                    <Text fontWeight="bold">États de Succès</Text>
                    <HStack spacing={2}>
                      <Badge colorScheme="green">Actif</Badge>
                      <Badge colorScheme="green" variant="subtle">Confirmé</Badge>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={3} align="start">
                    <Text fontWeight="bold">États d'Alerte</Text>
                    <HStack spacing={2}>
                      <Badge colorScheme="orange">En attente</Badge>
                      <Badge colorScheme="red" variant="subtle">Urgent</Badge>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Section Alertes */}
          <Box>
            <Heading size="md" mb={4}>Alertes et Messages</Heading>
            <VStack spacing={3}>
              <Alert status="success" borderRadius="lg">
                <AlertIcon />
                <VStack align="start" spacing={0} ml={2}>
                  <Text fontWeight="bold">Succès</Text>
                  <Text fontSize="sm">L'action a été effectuée avec succès</Text>
                </VStack>
              </Alert>
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <VStack align="start" spacing={0} ml={2}>
                  <Text fontWeight="bold">Information</Text>
                  <Text fontSize="sm">Voici une information importante</Text>
                </VStack>
              </Alert>
              <Alert status="warning" borderRadius="lg">
                <AlertIcon />
                <VStack align="start" spacing={0} ml={2}>
                  <Text fontWeight="bold">Attention</Text>
                  <Text fontSize="sm">Veuillez prêter attention à ceci</Text>
                </VStack>
              </Alert>
              <Alert status="error" borderRadius="lg">
                <AlertIcon />
                <VStack align="start" spacing={0} ml={2}>
                  <Text fontWeight="bold">Erreur</Text>
                  <Text fontSize="sm">Une erreur s'est produite</Text>
                </VStack>
              </Alert>
            </VStack>
          </Box>

          <Divider />

          {/* Section Tableau */}
          <Box>
            <Heading size="md" mb={4}>Tableau de Données</Heading>
            <Card bg={cardBg} overflowX="auto">
              <CardBody>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Nom</Th>
                      <Th>Statut</Th>
                      <Th>Progression</Th>
                      <Th>Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td>RétroBus #1</Td>
                      <Td><Badge colorScheme="green">Actif</Badge></Td>
                      <Td><Progress value={80} size="sm" colorScheme="rbe" /></Td>
                      <Td><Button size="sm" variant="ghost" colorScheme="rbe">Voir</Button></Td>
                    </Tr>
                    <Tr>
                      <Td>RétroBus #2</Td>
                      <Td><Badge colorScheme="orange">Maintenance</Badge></Td>
                      <Td><Progress value={45} size="sm" colorScheme="orange" /></Td>
                      <Td><Button size="sm" variant="ghost" colorScheme="orange">Voir</Button></Td>
                    </Tr>
                    <Tr>
                      <Td>RétroBus #3</Td>
                      <Td><Badge colorScheme="red">Inactif</Badge></Td>
                      <Td><Progress value={20} size="sm" colorScheme="red" /></Td>
                      <Td><Button size="sm" variant="ghost" colorScheme="red">Voir</Button></Td>
                    </Tr>
                  </Tbody>
                </Table>
              </CardBody>
            </Card>
          </Box>

          <Divider />

          {/* Footer test */}
          <Box bg={bgColor} color="white" p={6} borderRadius="lg" textAlign="center">
            <Heading size="sm" mb={2}>Aperçu du Thème Complet</Heading>
            <Text fontSize="sm" opacity={0.8}>
              Ce thème unifié est appliqué à tous les éléments du site interne
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
