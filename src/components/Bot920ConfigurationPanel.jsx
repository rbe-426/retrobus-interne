import { useEffect, useState } from 'react';
import {
  Box, Button, Card, CardBody, Checkbox, FormControl, FormLabel, Heading,
  Input, SimpleGrid, Spinner, Switch, Text, Textarea, VStack, useToast,
} from '@chakra-ui/react';
import { apiClient } from '../apiClient.js';

const COMMANDS = ['ping', 'about', 'anniversaire', 'phrase', 'bus', 'panne', 'destin', 'controle', 'diagnostic', 'tirage'];

const DEFAULT_CONFIGURATION = {
  general: { name: '920 Le Bot !', description: 'Le bot communautaire officiel de RétroBus Essonne.' },
  commands: { enabled: Object.fromEntries(COMMANDS.map((command) => [command, true])) },
  messages: { aboutStatus: 'Socle technique en cours de déploiement' },
  socialLinks: { website: '', instagram: '', discord: '' },
  welcome: { enabled: false, message: 'Bienvenue sur le serveur RétroBus Essonne !' },
  logs: { enabled: true },
  fun: { enabled: true },
};

const SECTION_COPY = {
  general: ['Général', 'Identité affichée par le bot.'],
  commands: ['Commandes', 'Activez ou désactivez les sous-commandes /920.'],
  messages: ['Messages', 'Contenu affiché par les réponses du bot.'],
  'social-links': ['Liens sociaux', 'Liens affichés dans la commande /920 about.'],
  welcome: ['Bienvenue', 'Réglages prêts pour le module d’accueil Discord.'],
  logs: ['Journaux', 'Activez les journaux opérationnels du bot.'],
  fun: ['Fun', 'Activez les commandes communautaires.'],
};

function Field({ label, children }) {
  return <FormControl><FormLabel fontSize="sm">{label}</FormLabel>{children}</FormControl>;
}

export default function Bot920ConfigurationPanel({ sectionId }) {
  const [configuration, setConfiguration] = useState(DEFAULT_CONFIGURATION);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const [title, description] = SECTION_COPY[sectionId];

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient.get('/api/admin/bot920/config')
      .then((payload) => {
        if (active && payload?.configuration) setConfiguration(payload.configuration);
      })
      .catch(() => {
        if (active) toast({ title: 'Chargement impossible', description: 'La configuration du bot n’a pas pu être récupérée.', status: 'error', duration: 5000, isClosable: true });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sectionId, toast]);

  const update = (path, value) => {
    setConfiguration((current) => {
      const next = structuredClone(current);
      const keys = path.split('.');
      let target = next;
      keys.slice(0, -1).forEach((key) => { target = target[key]; });
      target[keys.at(-1)] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = await apiClient.put('/api/admin/bot920/config', { configuration });
      setConfiguration(payload.configuration);
      toast({ title: 'Configuration enregistrée', status: 'success', duration: 3500, isClosable: true });
    } catch {
      toast({ title: 'Enregistrement impossible', description: 'La configuration n’a pas été modifiée.', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const content = () => {
    if (sectionId === 'general') return <VStack align="stretch" spacing={4}>
      <Field label="Nom du bot"><Input value={configuration.general.name} onChange={(event) => update('general.name', event.target.value)} /></Field>
      <Field label="Description"><Textarea value={configuration.general.description} onChange={(event) => update('general.description', event.target.value)} /></Field>
    </VStack>;
    if (sectionId === 'commands') return <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>{COMMANDS.map((command) => <Checkbox key={command} isChecked={configuration.commands.enabled[command] !== false} onChange={(event) => update(`commands.enabled.${command}`, event.target.checked)}>/{`920 ${command}`}</Checkbox>)}</SimpleGrid>;
    if (sectionId === 'messages') return <Field label="Statut affiché dans /920 about"><Textarea value={configuration.messages.aboutStatus} onChange={(event) => update('messages.aboutStatus', event.target.value)} /></Field>;
    if (sectionId === 'social-links') return <VStack align="stretch" spacing={4}>
      <Field label="Site web"><Input type="url" value={configuration.socialLinks.website} onChange={(event) => update('socialLinks.website', event.target.value)} /></Field>
      <Field label="Instagram"><Input type="url" value={configuration.socialLinks.instagram} onChange={(event) => update('socialLinks.instagram', event.target.value)} /></Field>
      <Field label="Discord"><Input type="url" value={configuration.socialLinks.discord} onChange={(event) => update('socialLinks.discord', event.target.value)} /></Field>
    </VStack>;
    if (sectionId === 'welcome') return <VStack align="stretch" spacing={4}>
      <FormControl display="flex" alignItems="center" gap={3}><Switch isChecked={configuration.welcome.enabled} onChange={(event) => update('welcome.enabled', event.target.checked)} /><FormLabel mb={0}>Activer le message d’accueil</FormLabel></FormControl>
      <Field label="Message d’accueil"><Textarea value={configuration.welcome.message} onChange={(event) => update('welcome.message', event.target.value)} /></Field>
    </VStack>;
    if (sectionId === 'logs') return <FormControl display="flex" alignItems="center" gap={3}><Switch isChecked={configuration.logs.enabled} onChange={(event) => update('logs.enabled', event.target.checked)} /><FormLabel mb={0}>Activer les journaux du bot</FormLabel></FormControl>;
    return <FormControl display="flex" alignItems="center" gap={3}><Switch isChecked={configuration.fun.enabled} onChange={(event) => update('fun.enabled', event.target.checked)} /><FormLabel mb={0}>Activer les commandes Fun</FormLabel></FormControl>;
  };

  return <VStack align="stretch" spacing={6} maxW="4xl"><Box><Heading size="lg">{title}</Heading><Text color="gray.600" mt={1}>{description}</Text></Box><Card variant="outline" borderRadius="md"><CardBody>{loading ? <Box py={8} textAlign="center"><Spinner color="rbe.500" /></Box> : <VStack align="stretch" spacing={6}>{content()}<Button alignSelf="flex-end" colorScheme="rbe" onClick={save} isLoading={saving}>Enregistrer</Button></VStack>}</CardBody></Card></VStack>;
}