import React, { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Card, CardBody, Drawer, DrawerBody, DrawerContent, DrawerOverlay, Flex, Heading, HStack,
  Icon, IconButton, Input, Text, Textarea, VStack, useDisclosure, useToast,
} from '@chakra-ui/react';
import { FiFolder, FiMenu, FiPlus, FiThumbsUp, FiTrash2, FiUser } from 'react-icons/fi';
import { apiClient } from '../api/config';
import { useUser } from '../context/UserContext';

const NAVIGATION_GROUPS = [
  { label: 'Projets', items: [
    { id: 'all', label: 'Projets posés', description: 'Discuter et voter', icon: FiFolder },
    { id: 'mine', label: 'Mes projets', description: 'Ceux que j’ai soumis', icon: FiUser },
  ] },
  { label: 'Participer', items: [
    { id: 'submit', label: 'Soumettre un projet', description: 'Proposer une idée', icon: FiPlus },
  ] },
];

export default function AppelsProjets() {
  const toast = useToast();
  const { prenom, nom, username } = useUser();
  const mobileNavigation = useDisclosure();
  const [activeSection, setActiveSection] = useState('all');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [canModerate, setCanModerate] = useState(false);
  const authorName = [prenom, nom].filter(Boolean).join(' ') || username || 'Membre';
  const activeItem = NAVIGATION_GROUPS.flatMap((group) => group.items).find((item) => item.id === activeSection);

  const fail = (title, error) => toast({ status: 'error', title, description: error?.message });
  const sortProjects = (list) => [...list].sort((a, b) => b.votes - a.votes || new Date(b.createdAt) - new Date(a.createdAt));

  useEffect(() => {
    let cancelled = false;
    apiClient.get('/association-projects')
      .then((data) => { if (!cancelled) { setProjects(data?.projects || []); setCanModerate(Boolean(data?.canModerate)); } })
      .catch((error) => { if (!cancelled) fail('Projets indisponibles', error); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      const data = await apiClient.post('/association-projects', { ...form, authorName });
      setProjects((current) => sortProjects([data.project, ...current]));
      setForm({ title: '', description: '' });
      toast({ status: 'success', title: 'Projet soumis' });
      setActiveSection('mine');
    } catch (error) { fail('Soumission impossible', error); }
    finally { setSaving(false); }
  };

  const vote = async (project) => {
    try {
      const data = await apiClient.post(`/association-projects/${project.id}/vote`, {});
      setProjects((current) => sortProjects(current.map((item) => item.id === project.id ? { ...item, votes: data.votes, hasVoted: data.hasVoted } : item)));
    } catch (error) { fail('Vote impossible', error); }
  };

  const remove = async (project) => {
    if (!window.confirm(`Supprimer « ${project.title} » ?`)) return;
    try {
      await apiClient.delete(`/association-projects/${project.id}`);
      setProjects((current) => current.filter((item) => item.id !== project.id));
    } catch (error) { fail('Suppression impossible', error); }
  };

  const selectSection = (sectionId) => { setActiveSection(sectionId); mobileNavigation.onClose(); };
  const visibleProjects = activeSection === 'mine' ? projects.filter((project) => project.isOwner) : projects;

  const navigation = <VStack align="stretch" spacing={0} h="full">
    <Box px={5} py={5} borderBottomWidth="1px" borderColor="whiteAlpha.300"><HStack spacing={3}><Flex w="36px" h="36px" align="center" justify="center" bg="rbe.500" color="white" borderRadius="md"><Icon as={FiThumbsUp} boxSize={5} /></Flex><Box minW={0}><Heading size="sm" color="white">Appels aux Projets</Heading><Text fontSize="xs" color="whiteAlpha.700">Projets associatifs</Text></Box></HStack></Box>
    <VStack align="stretch" spacing={5} px={3} py={5} flex={1} overflowY="auto">{NAVIGATION_GROUPS.map((group) => <Box key={group.label}><Text px={3} mb={2} fontSize="xs" fontWeight="700" letterSpacing="0.08em" color="whiteAlpha.600" textTransform="uppercase">{group.label}</Text><VStack align="stretch" spacing={1}>{group.items.map((item) => { const isActive = item.id === activeSection; return <Button key={item.id} variant="ghost" justifyContent="flex-start" minH="46px" px={3} color={isActive ? 'white' : 'whiteAlpha.800'} bg={isActive ? 'rbe.500' : 'transparent'} borderLeft="3px solid" borderLeftColor={isActive ? 'white' : 'transparent'} borderRadius="md" _hover={{ bg: isActive ? 'rbe.600' : 'whiteAlpha.200', color: 'white' }} onClick={() => selectSection(item.id)}><HStack spacing={3} w="full" minW={0}><Icon as={item.icon} boxSize={4} flexShrink={0} /><Box textAlign="left" minW={0}><Text fontSize="sm" fontWeight={isActive ? '700' : '600'} noOfLines={1}>{item.label}</Text><Text fontSize="xs" color={isActive ? 'whiteAlpha.800' : 'whiteAlpha.600'} noOfLines={1}>{item.description}</Text></Box></HStack></Button>; })}</VStack></Box>)}</VStack>
    <Box px={5} py={4} borderTopWidth="1px" borderColor="whiteAlpha.300"><Text fontSize="xs" color="whiteAlpha.600">RétroBus Essonne</Text></Box>
  </VStack>;

  const submitForm = <Card borderWidth="1px" bg="white" maxW="720px"><CardBody>
    <VStack align="stretch" spacing={3}>
      <Input placeholder="Titre du projet" maxLength={150} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
      <Textarea placeholder="Décrivez le projet : objectif, moyens, budget estimé…" rows={6} maxLength={4000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <Box><Button colorScheme="rbe" leftIcon={<FiPlus />} isLoading={saving} isDisabled={!form.title.trim() || !form.description.trim()} onClick={submit}>Soumettre</Button></Box>
    </VStack>
  </CardBody></Card>;

  const list = loading ? <Text color="gray.500">Chargement…</Text> : visibleProjects.length === 0 ? <Text color="gray.500">{activeSection === 'mine' ? 'Vous n’avez soumis aucun projet.' : 'Aucun projet posé pour le moment. Soyez le premier !'}</Text> : <VStack align="stretch" spacing={4}>{visibleProjects.map((project) => (
    <Card key={project.id} variant="outline" borderColor="gray.200" borderRadius="md" borderLeftWidth="4px" borderLeftColor="rbe.500" bg="white"><CardBody>
      <HStack align="flex-start" spacing={4}>
        <VStack spacing={1} minW="64px">
          <Button size="sm" variant={project.hasVoted ? 'solid' : 'outline'} colorScheme="rbe" leftIcon={<FiThumbsUp />} onClick={() => vote(project)} aria-label="Je suis d'accord">{project.votes}</Button>
          <Text fontSize="xs" color="gray.500">{project.hasVoted ? 'D’accord' : 'Pour'}</Text>
        </VStack>
        <VStack align="stretch" spacing={1} flex="1" minW={0}>
          <HStack><Text fontWeight="700">{project.title}</Text>{project.isOwner && <Badge colorScheme="green">Mon projet</Badge>}</HStack>
          <Text fontSize="sm" whiteSpace="pre-wrap">{project.description}</Text>
          <Text fontSize="xs" color="gray.500">Proposé par {project.authorName} le {new Date(project.createdAt).toLocaleDateString('fr-FR')}</Text>
        </VStack>
        {(project.isOwner || canModerate) && <IconButton size="sm" variant="ghost" colorScheme="red" icon={<FiTrash2 />} onClick={() => remove(project)} aria-label="Supprimer" />}
      </HStack>
    </CardBody></Card>
  ))}</VStack>;

  return <Flex minH="calc(100vh - 80px)" bg="gray.50" align="stretch">
    <Box display={{ base: 'none', lg: 'block' }} w="280px" flexShrink={0} bg="gray.900" position="sticky" top={0} h="calc(100vh - 80px)">{navigation}</Box>
    <Drawer isOpen={mobileNavigation.isOpen} placement="left" onClose={mobileNavigation.onClose} size="xs"><DrawerOverlay /><DrawerContent bg="gray.900"><DrawerBody p={0}>{navigation}</DrawerBody></DrawerContent></Drawer>
    <Box flex={1} minW={0}>
      <Flex minH="72px" px={{ base: 4, md: 6 }} bg="white" borderBottomWidth="1px" borderColor="gray.200" align="center" justify="space-between" gap={4}>
        <HStack minW={0} spacing={3}>
          <IconButton display={{ base: 'inline-flex', lg: 'none' }} icon={<FiMenu />} aria-label="Ouvrir la navigation" variant="outline" color="rbe.600" borderColor="rbe.300" onClick={mobileNavigation.onOpen} />
          <Box minW={0}><Text fontSize="xs" fontWeight="700" color="rbe.600" textTransform="uppercase">Appels aux Projets</Text><Heading size="md" noOfLines={1}>{activeItem?.label}</Heading></Box>
        </HStack>
        <Badge colorScheme="gray" variant="subtle" flexShrink={0}>{projects.length} projet{projects.length > 1 ? 's' : ''}</Badge>
      </Flex>
      <Box p={{ base: 4, md: 6 }} maxW="1440px">{activeSection === 'submit' ? submitForm : list}</Box>
    </Box>
  </Flex>;
}
