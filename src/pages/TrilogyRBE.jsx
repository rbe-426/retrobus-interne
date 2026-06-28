import React from 'react';
import {
  Box,
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
import { Link as RouterLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiTrendingUp,
  FiUsers,
  FiCheckCircle,
  FiLayout,
  FiImage,
  FiShield,
  FiTarget,
  FiType,
  FiLayers,
  FiAlertTriangle,
  FiXCircle,
} from 'react-icons/fi';
import SidebarLayout from '../components/SidebarLayout';
import { useSidebar } from '../context/SidebarContext';
import { TriangleErrorIcon } from '../components/icons';

const trilogyColorGroups = [
  {
    title: 'Couleurs institutionnelles',
    colors: [
      { name: 'Framboise RétroBus', hex: '#d30c4c', textColor: 'white' },
      { name: 'Framboise foncée RBE', hex: '#c10744', textColor: 'white' },
      { name: 'Bleu 500 RBE', hex: '#3b82f6', textColor: 'white' },
      { name: 'Vert 500 RBE', hex: '#10b981', textColor: 'white' },
      { name: 'Gray 900 RBE', hex: '#0f172a', textColor: 'white' },
      { name: 'RBE Accent', hex: '#e40045', textColor: 'white' },
      { name: 'RBE Profond', hex: '#9f063a', textColor: 'white' },
      { name: 'Texte Externe', hex: '#222222', textColor: 'white' },
      { name: 'Surface', hex: '#ffffff', textColor: 'gray.900' },
    ],
  },
  {
    title: 'Couleurs fonctionnelles utiles',
    colors: [
      { name: 'Blue Action', hex: '#3182ce', textColor: 'white' },
      { name: 'Green Succès', hex: '#38a169', textColor: 'white' },
      { name: 'Red Danger', hex: '#e53e3e', textColor: 'white' },
      { name: 'Orange Attention', hex: '#dd6b20', textColor: 'white' },
      { name: 'Purple Archive', hex: '#805ad5', textColor: 'white' },
      { name: 'Teal Parc', hex: '#319795', textColor: 'white' },
      { name: 'Cyan Info', hex: '#00b5d8', textColor: 'white' },
      { name: 'Yellow Alerte', hex: '#d69e2e', textColor: 'white' },
    ],
  },
  {
    title: 'Neutres de structure',
    colors: [
      { name: 'Gray 50', hex: '#f8fafc', textColor: 'gray.900' },
      { name: 'Gray 100', hex: '#f1f5f9', textColor: 'gray.900' },
      { name: 'Gray 200', hex: '#e2e8f0', textColor: 'gray.900' },
      { name: 'Gray 300', hex: '#cbd5e1', textColor: 'gray.900' },
      { name: 'Gray 500', hex: '#64748b', textColor: 'white' },
      { name: 'Gray 600', hex: '#475569', textColor: 'white' },
      { name: 'Gray 700', hex: '#334155', textColor: 'white' },
      { name: 'Gray 800', hex: '#1e293b', textColor: 'white' },
    ],
  },
  {
    title: 'Pastels des couleurs primaires',
    colors: [
      { name: 'Framboise RétroBus Pastel', hex: '#fef1f5', textColor: 'gray.900' },
      { name: 'RBE Accent Pastel', hex: '#ffd9e6', textColor: 'gray.900' },
      { name: 'Blue Action Pastel', hex: '#bee3f8', textColor: 'gray.900' },
      { name: 'Green Succès Pastel', hex: '#c6f6d5', textColor: 'gray.900' },
      { name: 'Red Danger Pastel', hex: '#fed7d7', textColor: 'gray.900' },
      { name: 'Orange Attention Pastel', hex: '#feebc8', textColor: 'gray.900' },
      { name: 'Gray Texte Pastel', hex: '#e2e8f0', textColor: 'gray.900' },
    ],
  },
];

const trilogyColorAlliances = [
  {
    name: 'Alliance Framboise RBE',
    description: 'Complementaire adoucie: framboise, bleu confiance, vert vivant, encre profonde.',
    colors: [
      { name: 'Framboise RétroBus', hex: '#d30c4c' },
      { name: 'Bleu pacifique', hex: '#2f80ed' },
      { name: 'Sauge vive', hex: '#22a06b' },
      { name: 'Encre nuit', hex: '#111827' },
    ],
  },
  {
    name: 'Alliance Framboise foncée',
    description: 'Analogue chaud: base profonde, rose sourd, cuivre doux, bleu noir pour stabiliser.',
    colors: [
      { name: 'Framboise foncée RBE', hex: '#c10744' },
      { name: 'Rose ancien', hex: '#a83a5f' },
      { name: 'Cuivre doux', hex: '#c56a3a' },
      { name: 'Bleu noir', hex: '#172033' },
    ],
  },
  {
    name: 'Alliance Bleu 500 RBE',
    description: 'Triade lisible: bleu action, framboise, ambre lumineux, gris encre.',
    colors: [
      { name: 'Bleu 500 RBE', hex: '#3b82f6' },
      { name: 'Framboise vive', hex: '#d30c4c' },
      { name: 'Ambre signal', hex: '#f2a900' },
      { name: 'Ardoise', hex: '#1f2937' },
    ],
  },
  {
    name: 'Alliance Vert 500 RBE',
    description: 'Nature technique: vert principal, framboise accent, bleu calme, graphite.',
    colors: [
      { name: 'Vert 500 RBE', hex: '#10b981' },
      { name: 'Framboise accent', hex: '#d30c4c' },
      { name: 'Bleu horizon', hex: '#2563eb' },
      { name: 'Graphite', hex: '#263238' },
    ],
  },
  {
    name: 'Alliance Gray 900 RBE',
    description: 'Neutre premium: encre, framboise, bleu froid, blanc casse pour respirer.',
    colors: [
      { name: 'Gray 900 RBE', hex: '#0f172a' },
      { name: 'Framboise RétroBus', hex: '#d30c4c' },
      { name: 'Bleu acier', hex: '#4f8cff' },
      { name: 'Blanc casse', hex: '#f8fafc' },
    ],
  },
  {
    name: 'Alliance RBE Accent',
    description: 'Contraste evenementiel: accent vif, marine, menthe, champagne discret.',
    colors: [
      { name: 'RBE Accent', hex: '#e40045' },
      { name: 'Marine', hex: '#0b1f3a' },
      { name: 'Menthe', hex: '#2dd4bf' },
      { name: 'Champagne', hex: '#f6e7c1' },
    ],
  },
  {
    name: 'Alliance RBE Profond',
    description: 'Institutionnelle dense: profond, bleu patrimoine, vert bronze, ivoire.',
    colors: [
      { name: 'RBE Profond', hex: '#9f063a' },
      { name: 'Bleu patrimoine', hex: '#1d4ed8' },
      { name: 'Vert bronze', hex: '#5f7f4f' },
      { name: 'Ivoire', hex: '#fff7ed' },
    ],
  },
];

function TrilogyColorCard({ color }) {
  return (
    <Card bg={color.hex} color={color.textColor} border="1px solid" borderColor="blackAlpha.200">
      <CardBody>
        <Text fontWeight="bold">{color.name}</Text>
        <Text fontSize="sm">{color.hex}</Text>
      </CardBody>
    </Card>
  );
}

function TrilogyAllianceCard({ alliance }) {
  return (
    <Card bg={alliance.colors[0].hex} color="white" overflow="hidden" border="1px solid" borderColor="blackAlpha.200">
      <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" minH="118px">
        {alliance.colors.map((color) => (
          <Box key={`${alliance.name}-${color.hex}`} bg={color.hex} title={`${color.name} ${color.hex}`} />
        ))}
      </Box>
      <CardBody bg="white" color="gray.900" borderTop="1px solid" borderColor="blackAlpha.200">
        <Text fontWeight="bold">{alliance.name}</Text>
        <Text fontSize="xs" color="gray.600" mt={1}>{alliance.description}</Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={1} mt={3}>
          {alliance.colors.map((color) => (
            <Text key={`${alliance.name}-label-${color.hex}`} fontSize="xs" color="gray.700">
              {color.name} · {color.hex}
            </Text>
          ))}
        </SimpleGrid>
      </CardBody>
    </Card>
  );
}

export default function TrilogyRBE() {
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
          Trilogy Interne
        </Button>

        <Button
          as={RouterLink}
          to="/dashboard/trilogy-rbe/externe"
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
              <Heading size="lg">Trilogy RBE - Interne</Heading>
              <Text fontSize="sm" color="gray.500">
                Démonstration des composants avec le layout Finance
              </Text>
            </Box>
            <Button as={RouterLink} to="/dashboard/trilogy-rbe/externe" variant="outline" colorScheme="blue" onClick={closeOnMobile}>
              Voir layout Externe
            </Button>
          </HStack>
        </Box>

        <Box flex={1} overflowY="auto" p={6} w="full">
          <VStack spacing={6} align="stretch">
        {/* Section Cap stratégique */}
        <Box>
          <Heading size="md" mb={4} color="black">Cap Trilogy Interne 2026</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
              <CardBody>
                <HStack mb={2}>
                  <Icon as={FiShield} color="rbe.500" boxSize={5} />
                  <Text fontWeight="bold">Cohérence</Text>
                </HStack>
                <Text fontSize="sm" color="gray.600">Une seule logique visuelle entre dashboard, modules finance, et écrans opérationnels.</Text>
              </CardBody>
            </Card>
            <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
              <CardBody>
                <HStack mb={2}>
                  <Icon as={FiTarget} color="blue.500" boxSize={5} />
                  <Text fontWeight="bold">Lisibilité</Text>
                </HStack>
                <Text fontSize="sm" color="gray.600">Chaque écran doit guider l'action principale en moins de 3 secondes de scan visuel.</Text>
              </CardBody>
            </Card>
            <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
              <CardBody>
                <HStack mb={2}>
                  <Icon as={FiLayers} color="green.500" boxSize={5} />
                  <Text fontWeight="bold">Scalabilité</Text>
                </HStack>
                <Text fontSize="sm" color="gray.600">Les règles doivent fonctionner pour les futures pages sans réinventer les composants.</Text>
              </CardBody>
            </Card>
            <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
              <CardBody>
                <HStack mb={2}>
                  <Icon as={FiCheckCircle} color="orange.500" boxSize={5} />
                  <Text fontWeight="bold">Contrôle qualité</Text>
                </HStack>
                <Text fontSize="sm" color="gray.600">Chaque PR UI doit vérifier contrastes, états vides, mobile, erreurs et icônes.</Text>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        <Divider />

        {/* Section Règles de design interne */}
        <Box>
          <Heading size="md" mb={4} color="black">Règles de Design Interne</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
              <CardHeader>
                <HStack>
                  <Icon as={FiType} color="rbe.500" boxSize={5} />
                  <Heading size="sm">Typographie & hiérarchie</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm">Titre page: Heading lg, unique, orienté action.</Text>
                  <Text fontSize="sm">Titre section: Heading md, jamais plus de 6 mots.</Text>
                  <Text fontSize="sm">Texte d'aide: gray.500/gray.600, max 2 lignes.</Text>
                  <Text fontSize="sm">Aucun bloc de texte sans respiration (espacement vertical obligatoire).</Text>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
              <CardHeader>
                <HStack>
                  <Icon as={FiShield} color="blue.500" boxSize={5} />
                  <Heading size="sm">Comportements UI</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm">Un seul CTA primaire visible par zone fonctionnelle.</Text>
                  <Text fontSize="sm">Les actions destructives doivent rester en rouge et demander confirmation.</Text>
                  <Text fontSize="sm">Tout composant long doit gérer: loading, vide, erreur.</Text>
                  <Text fontSize="sm">Sur mobile, les boutons d'actions passent en pleine largeur.</Text>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        <Divider />

        {/* Section Logos */}
        <Box>
          <Heading size="md" mb={4} color="black">Règles Logos RBE (Interne)</Heading>
          <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
            <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
              <CardHeader>
                <HStack>
                  <Icon as={FiImage} color="rbe.500" boxSize={5} />
                  <Heading size="sm">Usage autorisé</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="start" spacing={2}>
                  <Badge colorScheme="green">OK</Badge>
                  <Text fontSize="sm">Logo principal sur fonds clairs ou neutres.</Text>
                  <Text fontSize="sm">Version monochrome uniquement pour signatures discrètes.</Text>
                  <Text fontSize="sm">Zone de protection: minimum 8px autour du logo.</Text>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
              <CardHeader>
                <HStack>
                  <Icon as={FiXCircle} color="red.500" boxSize={5} />
                  <Heading size="sm">Interdits visuels</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="start" spacing={2}>
                  <Badge colorScheme="red">KO</Badge>
                  <Text fontSize="sm">Ne pas étirer ou compresser le ratio du logo.</Text>
                  <Text fontSize="sm">Ne pas appliquer d'ombre portée forte ou effet 3D.</Text>
                  <Text fontSize="sm">Ne pas changer les couleurs institutionnelles.</Text>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
              <CardHeader>
                <HStack>
                  <Icon as={FiAlertTriangle} color="orange.500" boxSize={5} />
                  <Heading size="sm">Implémentation</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="start" spacing={2}>
                  <Badge colorScheme="orange">A vérifier</Badge>
                  <Text fontSize="sm">Desktop header: hauteur cible 36-44px.</Text>
                  <Text fontSize="sm">Mobile header: hauteur cible 28-32px.</Text>
                  <Text fontSize="sm">Fichier source préféré: SVG optimisé.</Text>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        <Divider />

        {/* Section Icônes */}
        <Box>
          <Heading size="md" mb={4} color="black">Système d'Icônes - Démarrage</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
              <CardHeader>
                <Heading size="sm">Set principal & taille</Heading>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="start" spacing={3}>
                  <Text fontSize="sm">Bibliothèque par défaut: react-icons/fi (traits cohérents, lecture nette).</Text>
                  <Text fontSize="sm">Taille recommandée: 18-20px en ligne, 24px pour en-têtes.</Text>
                  <Text fontSize="sm">Épaisseur: garder des pictos lineaires, éviter le mélange filled/outline.</Text>
                  <HStack spacing={3} pt={1}>
                    <Icon as={FiBarChart2} boxSize={5} color="blue.500" />
                    <Icon as={FiUsers} boxSize={5} color="green.500" />
                    <Icon as={FiTrendingUp} boxSize={5} color="orange.500" />
                    <Icon as={FiShield} boxSize={5} color="rbe.500" />
                    <Icon as={FiImage} boxSize={5} color="purple.500" />
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
              <CardHeader>
                <Heading size="sm">Mapping métier recommandé</Heading>
              </CardHeader>
              <CardBody pt={0}>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Contexte</Th>
                      <Th>Icône</Th>
                      <Th>Couleur</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td>Performance</Td>
                      <Td>FiTrendingUp</Td>
                      <Td>green.500</Td>
                    </Tr>
                    <Tr>
                      <Td>Alertes</Td>
                      <Td>FiAlertTriangle</Td>
                      <Td>orange.500</Td>
                    </Tr>
                    <Tr>
                      <Td>Sécurité</Td>
                      <Td>FiShield</Td>
                      <Td>blue.600</Td>
                    </Tr>
                    <Tr>
                      <Td>Médias/Logo</Td>
                      <Td>FiImage</Td>
                      <Td>rbe.500</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>

        <Divider />

        {/* Section Checklist opérationnelle */}
        <Box>
          <Heading size="md" mb={4} color="black">Checklist avant livraison UI</Heading>
          <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                <HStack><Badge colorScheme="green">1</Badge><Text fontSize="sm">Contraste texte/fond valide</Text></HStack>
                <HStack><Badge colorScheme="green">2</Badge><Text fontSize="sm">États loading/vide/erreur présents</Text></HStack>
                <HStack><Badge colorScheme="green">3</Badge><Text fontSize="sm">CTA primaire unique par écran</Text></HStack>
                <HStack><Badge colorScheme="green">4</Badge><Text fontSize="sm">Logo non déformé et marge respectée</Text></HStack>
                <HStack><Badge colorScheme="green">5</Badge><Text fontSize="sm">Icônes cohérentes (même famille)</Text></HStack>
                <HStack><Badge colorScheme="green">6</Badge><Text fontSize="sm">Comportement mobile validé</Text></HStack>
              </SimpleGrid>
            </CardBody>
          </Card>
        </Box>

        <Divider />

        {/* Section Couleurs */}
        <Box>
          <Heading size="md" mb={4} color="black">Palette de Couleurs</Heading>
          <VStack align="stretch" spacing={5}>
            {trilogyColorGroups.map((group) => (
              <Box key={group.title}>
                <Text fontSize="sm" fontWeight="700" color="gray.700" mb={3} textTransform="uppercase" letterSpacing="0.5px">
                  {group.title}
                </Text>
                <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
                  {group.colors.map((color) => (
                    <TrilogyColorCard key={`${group.title}-${color.name}`} color={color} />
                  ))}
                </SimpleGrid>
              </Box>
            ))}
            <Box>
              <Text fontSize="sm" fontWeight="700" color="gray.700" mb={3} textTransform="uppercase" letterSpacing="0.5px">
                Alliances colorimétriques
              </Text>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                {trilogyColorAlliances.map((alliance) => (
                  <TrilogyAllianceCard key={alliance.name} alliance={alliance} />
                ))}
              </SimpleGrid>
            </Box>
          </VStack>
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
          <Heading size="md" mb={4}>Alertes et Messages (Comportement réel)</Heading>
          <VStack spacing={3}>
            <Alert status="success" borderRadius="lg">
              <AlertIcon />
              <VStack align="start" spacing={0} ml={2}>
                <Text fontWeight="bold">Succès</Text>
                <Text fontSize="sm">Message court et actionnable. Durée usuelle: 2000-3000ms.</Text>
              </VStack>
            </Alert>
            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <VStack align="start" spacing={0} ml={2}>
                <Text fontWeight="bold">Information</Text>
                <Text fontSize="sm">État non bloquant. Durée usuelle: 2000-4000ms.</Text>
              </VStack>
            </Alert>
            <Alert status="warning" borderRadius="lg">
              <AlertIcon />
              <VStack align="start" spacing={0} ml={2}>
                <Text fontWeight="bold">Attention</Text>
                <Text fontSize="sm">Pré-condition manquante. Durée usuelle: 3000-7000ms.</Text>
              </VStack>
            </Alert>
            <Alert status="error" borderRadius="lg">
              <TriangleErrorIcon color="red.500" boxSize={5} />
              <VStack align="start" spacing={0} ml={2}>
                <Text fontWeight="bold">Erreur</Text>
                <Text fontSize="sm">Bloquant ou échec d'action. Durée usuelle: 5000-7000ms.</Text>
              </VStack>
            </Alert>
          </VStack>

          <Card mt={4} bg={cardBg} borderWidth="1px" borderColor="gray.200">
            <CardBody>
              <VStack align="stretch" spacing={3}>
                <Heading size="sm">Référence d'implémentation Interne</Heading>
                <Text fontSize="sm" color="gray.600">
                  Les toasts internes utilisent majoritairement useToast sans position explicite.
                  Le comportement observé est un empilement en bas de l'écran, du bas vers le haut.
                </Text>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Type</Th>
                      <Th>Titre type</Th>
                      <Th>Description</Th>
                      <Th>Durée cible</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td><Badge colorScheme="success">success</Badge></Td>
                      <Td>Action confirmée</Td>
                      <Td>Bref, sans jargon</Td>
                      <Td>2000-3000ms</Td>
                    </Tr>
                    <Tr>
                      <Td><Badge colorScheme="blue">info</Badge></Td>
                      <Td>Information</Td>
                      <Td>Contexte complémentaire</Td>
                      <Td>2000-4000ms</Td>
                    </Tr>
                    <Tr>
                      <Td><Badge colorScheme="orange">warning</Badge></Td>
                      <Td>Pré-requis manquant</Td>
                      <Td>Indiquer comment corriger</Td>
                      <Td>3000-7000ms</Td>
                    </Tr>
                    <Tr>
                      <Td><Badge colorScheme="red">error</Badge></Td>
                      <Td>Erreur</Td>
                      <Td>Cause + action attendue</Td>
                      <Td>5000-7000ms</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </VStack>
            </CardBody>
          </Card>
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

        {/* Footer */}
        <Box bg="gray.900" color="white" p={6} borderRadius="lg" textAlign="center">
          <Heading size="sm" mb={2}>Aperçu du Thème Complet</Heading>
          <Text fontSize="sm" opacity={0.8}>
            Ce thème unifié est appliqué à tous les éléments du site interne
          </Text>
        </Box>
          </VStack>
        </Box>
      </VStack>
    </SidebarLayout>
  );
}
