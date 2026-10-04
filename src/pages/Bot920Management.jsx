import React, { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Card, CardBody, Divider, Drawer, DrawerBody,
  DrawerContent, DrawerOverlay, Flex, Heading, HStack, Icon, IconButton,
  SimpleGrid, Spinner, Text, VStack, useDisclosure,
} from '@chakra-ui/react';
import {
  FiActivity, FiBarChart2, FiBookOpen, FiCommand, FiCpu, FiFileText, FiGift,
  FiHome, FiLink, FiMenu, FiMessageCircle, FiSettings, FiShield, FiSmile, FiUserPlus,
} from 'react-icons/fi';
import Bot920ConfigurationPanel from '../components/Bot920ConfigurationPanel.jsx';
import Bot920GuildContext from '../components/Bot920GuildContext.jsx';
import Bot920ModerationCenter from '../components/Bot920ModerationCenter.jsx';
import { apiClient } from '../apiClient.js';

const NAVIGATION_GROUPS = [
  { label: 'Pilotage', items: [
    { id: 'overview', label: 'Vue d’ensemble', description: 'État et points d’attention', icon: FiHome },
    { id: 'general', label: 'Général', description: 'Identité et comportement', icon: FiSettings },
    { id: 'moderation', label: 'Modération', description: 'Sanctions et historique', icon: FiShield },
    { id: 'statistics', label: 'Statistiques', description: 'Activité et tendances', icon: FiBarChart2 },
  ] },
  { label: 'Interactions', items: [
    { id: 'commands', label: 'Commandes', description: 'Commandes /920', icon: FiCommand },
    { id: 'messages', label: 'Messages', description: 'Réponses et contenus', icon: FiMessageCircle },
    { id: 'welcome', label: 'Bienvenue', description: 'Arrivée des membres', icon: FiUserPlus },
    { id: 'fun', label: 'Fun', description: 'Contenus communautaires', icon: FiSmile },
  ] },
  { label: 'Plugins', items: [
    { id: 'plugins', label: 'Plugins', description: 'Modules communautaires et automatisations', icon: FiActivity },
  ] },
  { label: 'Publication', items: [
    { id: 'social-links', label: 'Liens sociaux', description: 'Liens RBE publics', icon: FiLink },
    { id: 'logs', label: 'Journaux', description: 'Historique opérationnel', icon: FiBookOpen },
  ] },
];

const SECTION_COPY = {
  general: ['Général', 'Les réglages de l’identité et du comportement du bot seront regroupés ici.'],
  commands: ['Commandes', 'Le catalogue des commandes /920 sera administré depuis ce module.'],
  messages: ['Messages', 'Les messages, réponses et modèles de contenu seront centralisés ici.'],
  'social-links': ['Liens sociaux', 'Les liens utilisés par les réponses publiques et les embeds seront gérés ici.'],
  welcome: ['Bienvenue', 'Les règles d’accueil et le message de bienvenue seront configurés ici.'],
  logs: ['Journaux', 'Les journaux opérationnels seront disponibles après le raccordement de leur source.'],
  fun: ['Fun', 'Les commandes communautaires et leurs contenus seront organisés dans ce module.'],
  plugins: ['Plugins', 'Modules Discord inspirés des fonctionnalités de MEE6.'],
  statistics: ['Statistiques', 'Les statistiques apparaîtront ici lorsque la collecte sera raccordée.'],
};

function StatusMetric({ label, icon, value, detail, loading, error, connected }) {
  return <Card variant="outline" borderColor="gray.200" borderRadius="md"><CardBody>
    <HStack justify="space-between" align="start"><Box><Text fontSize="sm" color="gray.500">{label}</Text>{loading ? <Spinner mt={2} size="sm" color="rbe.500" /> : <Text mt={2} fontWeight="700" color={error ? 'red.600' : connected ? 'green.600' : 'gray.700'}>{error ? 'Indisponible' : value}</Text>}</Box><Icon as={icon} color={error ? 'red.400' : connected ? 'green.500' : 'gray.400'} boxSize={5} /></HStack>
    <Text fontSize="xs" color={error ? 'red.600' : 'gray.500'} mt={3}>{loading ? 'Connexion au relais sécurisé…' : detail}</Text>
  </CardBody></Card>;
}

function Overview() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await apiClient.get('/api/admin/bot920/status'));
    } catch {
      setStatus(null);
      setError('Le relais MyRBE ne peut pas joindre le bot pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadStatus(); }, []);

  const bot = status?.bot;
  const connected = bot?.discord === 'connected';
  const unavailable = error || (!loading && !status?.available);

  return <VStack align="stretch" spacing={6}>
    <Flex justify="space-between" align={{ base: 'start', sm: 'center' }} gap={3} direction={{ base: 'column', sm: 'row' }}><Box><Badge colorScheme={connected ? 'green' : 'rbe'} variant="subtle" mb={2}>{connected ? 'Discord connecté' : 'Administration Discord'}</Badge><Heading size="lg">920 Le Bot !</Heading><Text color="gray.600" mt={1}>Centre de pilotage du bot communautaire RétroBus Essonne.</Text></Box><Button size="sm" variant="outline" colorScheme="rbe" onClick={loadStatus} isLoading={loading}>Actualiser</Button></Flex>
    <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
      <StatusMetric label="Connexion Discord" icon={FiCpu} loading={loading} error={unavailable} connected={connected} value={connected ? 'Connecté' : 'En veille'} detail={unavailable || 'État remonté par le bot.'} />
      <StatusMetric label="Latence" icon={FiActivity} loading={loading} error={unavailable} value={bot?.latencyMs == null ? 'Non mesurée' : `${bot.latencyMs} ms`} detail={unavailable || 'Latence Discord signalée par le bot.'} />
      <StatusMetric label="Serveurs connectés" icon={FiMessageCircle} loading={loading} error={unavailable} value={bot?.guildCount ?? 0} detail={unavailable || 'Serveurs Discord actuellement en cache.'} />
      <StatusMetric label="Commandes exécutables" icon={FiCommand} loading={loading} error={unavailable} value={bot?.commandCount ?? 0} detail={unavailable || 'Commandes enregistrées au démarrage du bot.'} />
    </SimpleGrid>
    <Bot920GuildContext />
    <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
      <Card variant="outline" borderRadius="md"><CardBody><HStack spacing={3} mb={4}><Icon as={FiSettings} color="rbe.500" boxSize={5} /><Heading size="sm">Configuration disponible</Heading></HStack><VStack align="stretch" spacing={3} divider={<Divider />}><Box><Text fontWeight="600">Navigation par modules</Text><Text fontSize="sm" color="gray.600">Chaque domaine du bot dispose désormais de son espace d’administration.</Text></Box><Box><Text fontWeight="600">Structure prête pour l’exploitation</Text><Text fontSize="sm" color="gray.600">Les écrans suivants prépareront les raccordements API sans modifier le runtime du bot.</Text></Box></VStack></CardBody></Card>
      <Card variant="outline" borderRadius="md"><CardBody><HStack spacing={3} mb={4}><Icon as={FiGift} color="rbe.500" boxSize={5} /><Heading size="sm">À raccorder</Heading></HStack><Text fontSize="sm" color="gray.600">La disponibilité, la latence, les journaux et les statistiques ne sont pas encore reliés à une source de données dans MyRBE. Ils restent volontairement non renseignés.</Text></CardBody></Card>
    </SimpleGrid>
  </VStack>;
}

function PendingModule({ sectionId }) {
  if (sectionId !== 'statistics') return <Bot920ConfigurationPanel sectionId={sectionId} />;
  const [title, description] = SECTION_COPY[sectionId];
  return <VStack align="stretch" spacing={6} maxW="4xl"><Box><Heading size="lg">{title}</Heading><Text color="gray.600" mt={1}>{description}</Text></Box><Card variant="outline" borderRadius="md"><CardBody py={{ base: 10, md: 14 }}><VStack spacing={3} textAlign="center"><Icon as={FiFileText} boxSize={8} color="rbe.500" /><Heading size="sm">Module en préparation</Heading><Text maxW="md" fontSize="sm" color="gray.600">L’architecture de navigation est en place. Cette section n’enregistre pas encore de configuration et ne simule aucune donnée opérationnelle.</Text></VStack></CardBody></Card></VStack>;
}

export default function Bot920Management() {
  const [activeSection, setActiveSection] = useState('overview');
  const mobileNavigation = useDisclosure();
  const activeItem = NAVIGATION_GROUPS.flatMap((group) => group.items).find((item) => item.id === activeSection);
  const selectSection = (sectionId) => { setActiveSection(sectionId); mobileNavigation.onClose(); };
  const navigation = <VStack align="stretch" spacing={0} h="full">
    <Box px={5} py={5} borderBottomWidth="1px" borderColor="whiteAlpha.300"><HStack spacing={3}><Flex w="36px" h="36px" align="center" justify="center" bg="rbe.500" color="white" borderRadius="md"><Icon as={FiCpu} boxSize={5} /></Flex><Box minW={0}><Heading size="sm" color="white">920 Le Bot !</Heading><Text fontSize="xs" color="whiteAlpha.700">Administration URBEX</Text></Box></HStack></Box>
    <VStack align="stretch" spacing={5} px={3} py={5} flex={1} overflowY="auto">{NAVIGATION_GROUPS.map((group) => <Box key={group.label}><Text px={3} mb={2} fontSize="xs" fontWeight="700" letterSpacing="0.08em" color="whiteAlpha.600" textTransform="uppercase">{group.label}</Text><VStack align="stretch" spacing={1}>{group.items.map((item) => { const isActive = item.id === activeSection; return <Button key={item.id} variant="ghost" justifyContent="flex-start" minH="46px" px={3} color={isActive ? 'white' : 'whiteAlpha.800'} bg={isActive ? 'rbe.500' : 'transparent'} borderLeft="3px solid" borderLeftColor={isActive ? 'white' : 'transparent'} borderRadius="md" _hover={{ bg: isActive ? 'rbe.600' : 'whiteAlpha.200', color: 'white' }} onClick={() => selectSection(item.id)}><HStack spacing={3} w="full" minW={0}><Icon as={item.icon} boxSize={4} flexShrink={0} /><Box textAlign="left" minW={0}><Text fontSize="sm" fontWeight={isActive ? '700' : '600'} noOfLines={1}>{item.label}</Text><Text fontSize="xs" color={isActive ? 'whiteAlpha.800' : 'whiteAlpha.600'} noOfLines={1}>{item.description}</Text></Box></HStack></Button>; })}</VStack></Box>)}</VStack>
    <Box px={5} py={4} borderTopWidth="1px" borderColor="whiteAlpha.300"><Text fontSize="xs" color="whiteAlpha.600">RétroBus Essonne</Text></Box>
  </VStack>;

  return <Flex minH="calc(100vh - 80px)" bg="gray.50" align="stretch">
    <Box display={{ base: 'none', lg: 'block' }} w="280px" flexShrink={0} bg="gray.900" position="sticky" top={0} h="calc(100vh - 80px)">{navigation}</Box>
    <Drawer isOpen={mobileNavigation.isOpen} placement="left" onClose={mobileNavigation.onClose} size="xs"><DrawerOverlay /><DrawerContent bg="gray.900"><DrawerBody p={0}>{navigation}</DrawerBody></DrawerContent></Drawer>
    <Box flex={1} minW={0}><Flex minH="72px" px={{ base: 4, md: 6 }} bg="white" borderBottomWidth="1px" borderColor="gray.200" align="center" justify="space-between" gap={4}><HStack minW={0} spacing={3}><IconButton display={{ base: 'inline-flex', lg: 'none' }} icon={<FiMenu />} aria-label="Ouvrir la navigation du bot" variant="outline" color="rbe.600" borderColor="rbe.300" onClick={mobileNavigation.onOpen} /><Box minW={0}><Text fontSize="xs" fontWeight="700" color="rbe.600" textTransform="uppercase">920 Le Bot !</Text><Heading size="md" noOfLines={1}>{activeItem?.label}</Heading></Box></HStack><Badge colorScheme="gray" variant="subtle" flexShrink={0}>Données live non connectées</Badge></Flex><Box p={{ base: 4, md: 6 }} maxW="1440px">{activeSection === 'overview' ? <Overview /> : activeSection === 'moderation' ? <Bot920ModerationCenter /> : <PendingModule sectionId={activeSection} />}</Box></Box>
  </Flex>;
}