import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardBody, CardHeader, Heading, Text, Button,
  Input, Select, VStack, HStack, Badge, useToast, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Textarea, Flex,
  Icon, SimpleGrid, Alert, AlertIcon, Container, Stat, StatLabel, StatNumber, StatHelpText,
  IconButton, Menu, MenuButton, MenuList, MenuItem, MenuDivider, useColorModeValue, Spinner,
  Divider, Tabs, TabList, TabPanels, Tab, TabPanel, Avatar, Tag, TagLabel
} from '@chakra-ui/react';
import {
  FiUsers, FiCalendar, FiFileText, FiSettings, FiDownload,
  FiEdit3, FiTrash2, FiMoreHorizontal, FiCheck, FiX, FiRefreshCw,
  FiMessageSquare, FiFlag, FiPlus, FiBell, FiMail, FiGlobe, FiSend, FiActivity
} from 'react-icons/fi';
import { useUser } from '../context/UserContext';

// ---------- AdminStats (memoized) ----------
const AdminStats = React.memo(function AdminStats({ data, loading }) {
  const cardBg = useColorModeValue('white', 'gray.800');

  if (loading) {
    return (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel color="gray.600">Chargement...</StatLabel>
                <StatNumber>
                  <Spinner size="sm" />
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">Membres actifs</StatLabel>
            <StatNumber color="blue.500">
              <HStack>
                <Icon as={FiUsers} />
                <Text>{data?.activeMembers ?? 0}</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>Sur {data?.totalMembers ?? 0} inscrits</StatHelpText>
          </Stat>
        </CardBody>
      </Card>

      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">Événements planifiés</StatLabel>
            <StatNumber color="green.500">
              <HStack>
                <Icon as={FiCalendar} />
                <Text>{data?.upcomingEvents ?? 0}</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>Ce mois-ci</StatHelpText>
          </Stat>
        </CardBody>
      </Card>

      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">Documents en attente</StatLabel>
            <StatNumber color="orange.500">
              <HStack>
                <Icon as={FiFileText} />
                <Text>{data?.pendingDocuments ?? 0}</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>À traiter</StatHelpText>
          </Stat>
        </CardBody>
      </Card>

      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">RétroReports actifs</StatLabel>
            <StatNumber color="purple.500">
              <HStack>
                <Icon as={FiFlag} />
                <Text>{data?.activeReports ?? 0}</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>En cours</StatHelpText>
          </Stat>
        </CardBody>
      </Card>
    </SimpleGrid>
  );
});

// ---------- RetroReportCard (presentational) ----------
function RetroReportCard({ report, onUpdate, onComment, onStatusChange, onDelete }) {
  const cardBg = useColorModeValue('white', 'gray.800');

  const priorityColors = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    critical: 'red'
  };

  const statusColors = {
    open: 'blue',
    in_progress: 'orange',
    resolved: 'green',
    closed: 'gray'
  };

  const priorityLabel = useMemo(() => {
    switch (report.priority) {
      case 'low': return '🟢 Faible';
      case 'medium': return '🟡 Moyen';
      case 'high': return '🟠 Élevé';
      default: return '🔴 Critique';
    }
  }, [report.priority]);

  const statusLabel = useMemo(() => {
    switch (report.status) {
      case 'open': return 'Ouvert';
      case 'in_progress': return 'En cours';
      case 'resolved': return 'Résolu';
      default: return 'Fermé';
    }
  }, [report.status]);

  const createdAt = report.createdAt ? new Date(report.createdAt) : null;

  return (
    <Card bg={cardBg} borderLeftWidth={4} borderLeftColor={`${priorityColors[report.priority]}.500`}>
      <CardHeader pb={3}>
        <Flex justify="space-between" align="start">
          <VStack align="start" spacing={2}>
            <HStack>
              <Badge colorScheme={priorityColors[report.priority]} variant="solid" size="sm">
                {priorityLabel}
              </Badge>
              <Badge colorScheme={statusColors[report.status]} variant="subtle">
                {statusLabel}
              </Badge>
            </HStack>

            <Heading size="sm">{report.title}</Heading>

            <Text fontSize="xs" color="gray.500">
              Créé par {report.createdBy} {createdAt ? `le ${createdAt.toLocaleDateString('fr-FR')}` : ''}
            </Text>
          </VStack>

          <Menu>
            <MenuButton as={IconButton} icon={<FiMoreHorizontal />} variant="ghost" size="sm" />
            <MenuList zIndex={10} position="relative">
              <MenuItem icon={<FiEdit3 />} onClick={() => onUpdate(report)}>Modifier</MenuItem>
              <MenuItem icon={<FiMessageSquare />} onClick={() => onComment(report)}>Commenter</MenuItem>

              {report.status === 'open' && (
                <MenuItem icon={<FiActivity />} onClick={() => onStatusChange(report.id, 'in_progress')}>Marquer en cours</MenuItem>
              )}

              {(report.status === 'open' || report.status === 'in_progress') && (
                <MenuItem icon={<FiCheck />} onClick={() => onStatusChange(report.id, 'resolved')}>Marquer comme résolu</MenuItem>
              )}

              {report.status === 'resolved' && (
                <MenuItem icon={<FiX />} onClick={() => onStatusChange(report.id, 'closed')}>Fermer définitivement</MenuItem>
              )}

              {report.status === 'closed' && (
                <MenuItem icon={<FiRefreshCw />} onClick={() => onStatusChange(report.id, 'open')}>Rouvrir</MenuItem>
              )}

              <MenuDivider />
              <MenuItem icon={<FiTrash2 />} onClick={() => onDelete(report.id)} color="red.500">Supprimer</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </CardHeader>

      <CardBody pt={0}>
        <VStack align="start" spacing={3}>
          <Text fontSize="sm">{report.description}</Text>

          {report.category && (
            <Tag size="sm" variant="subtle">
              <TagLabel>{report.category}</TagLabel>
            </Tag>
          )}

          {report.assignedTo && (
            <HStack>
              <Avatar size="xs" name={report.assignedTo} />
              <Text fontSize="xs">Assigné à {report.assignedTo}</Text>
            </HStack>
          )}

          {report.comments && report.comments.length > 0 && (
            <VStack align="start" spacing={2} w="full">
              <Divider />
              <HStack>
                <Icon as={FiMessageSquare} />
                <Text fontSize="xs" fontWeight="bold">{report.comments.length} commentaire(s)</Text>
              </HStack>

              <Box bg="gray.50" p={2} borderRadius="md" w="full">
                <Text fontSize="xs">{report.comments[report.comments.length - 1].message}</Text>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Par {report.comments[report.comments.length - 1].author} - {new Date(report.comments[report.comments.length - 1].createdAt).toLocaleDateString('fr-FR')}
                </Text>
              </Box>
            </VStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}

// ---------- AdminGeneral (main) ----------
export default function AdminGeneral() {
  const { user } = useUser();
  const toast = useToast();

  const {
    isOpen: isReportOpen, onOpen: onReportOpen, onClose: onReportClose
  } = useDisclosure();
  const {
    isOpen: isCommentOpen, onOpen: onCommentOpen, onClose: onCommentClose
  } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();

  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retroReports, setRetroReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const [reportFormData, setReportFormData] = useState({ title: '', description: '', category: '', priority: 'medium', type: 'bug' });
  const [editFormData, setEditFormData] = useState({ title: '', description: '', category: '', priority: 'medium', type: 'bug' });
  const [commentFormData, setCommentFormData] = useState({ message: '', status: '' });
  const [reportScreenshots, setReportScreenshots] = useState([]); // File[]

  const cardBg = useColorModeValue('white', 'gray.800');
  const gradientBg = useColorModeValue('linear(to-r, green.500, blue.600)', 'linear(to-r, green.600, blue.700)');

  // Load initial data (simulate) - only once
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 600));
      if (!mounted) return;

      setAdminData({ activeMembers: 45, totalMembers: 52, upcomingEvents: 3, pendingDocuments: 7, activeReports: 0 });
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Recompute admin stats when retroReports changes
  useEffect(() => {
    setAdminData(prev => {
      if (!prev) return prev; // attend l'init avant de recalculer
      return {
        ...prev,
        activeReports: retroReports.filter(r => r.status === 'open' || r.status === 'in_progress').length
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retroReports]);

  // Charger les retro reports à l'ouverture
  const fetchReports = async () => {
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(`${base}/api/retro-reports`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      setRetroReports(data.reports || []);
    } catch (e) {
      console.error('Erreur chargement rétroreports:', e);
    }
  };

  useEffect(() => {
    // Charger les retro reports à l'ouverture
    fetchReports();
  }, []);

  const handleReportSubmit = async () => {
    if (!reportFormData.title || !reportFormData.description) {
      toast({ title: 'Erreur', description: "Veuillez remplir le titre et la description", status: 'error', duration: 3000, isClosable: true });
      return;
    }
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const fd = new FormData();
      fd.append('title', reportFormData.title);
      fd.append('description', reportFormData.description);
      fd.append('category', reportFormData.category || '');
      fd.append('priority', reportFormData.priority || 'medium');
      fd.append('type', reportFormData.type || 'bug');
      if (reportScreenshots && reportScreenshots.length > 0) {
        reportScreenshots.forEach(f => fd.append('screenshots', f, f.name));
      }

      const res = await fetch(`${base}/api/retro-reports`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: fd
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({error:'create failed'}));
        throw new Error(err.error || 'create failed');
      }
      const data = await res.json();
      setRetroReports(prev => [data.report, ...prev]);
      setReportFormData({ title: '', description: '', category: '', priority: 'medium', type: 'bug' });
      setReportScreenshots([]);
      onReportClose();
      toast({ title: 'Succès', description: 'RétroReport créé avec succès', status: 'success', duration: 3000, isClosable: true });
    } catch (e) {
      toast({ title: 'Erreur', description: e.message || "Impossible de créer le RétroReport", status: 'error', duration: 3000 });
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentFormData.message) {
      toast({
        title: 'Erreur',
        description: 'Veuillez écrire un commentaire',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const payload = {
        message: commentFormData.message,
        author: user?.name || 'Administrateur',
        // On inclut le statut si l'utilisateur en a choisi un
        status: commentFormData.status || undefined
      };

      // Tentative 1: endpoint dédié aux commentaires
      const res = await fetch(`${base}/api/retro-reports/${selectedReport.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        // Fallback: certains back-ends préfèrent PATCH sur le ticket complet
        const resAlt = await fetch(`${base}/api/retro-reports/${selectedReport.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            appendComment: { message: payload.message, author: payload.author },
            // si un statut est fourni on le met à jour aussi
            status: payload.status
          })
        });
        if (!resAlt.ok) throw new Error('Impossible de persister le commentaire');
      }

      // Re-sync depuis le serveur pour être sûr que ça persiste après refresh
      await fetchReports();

      setCommentFormData({ message: '', status: '' });
      onCommentClose();
      toast({
        title: 'Succès',
        description: 'Commentaire ajouté avec succès',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Erreur',
        description: "Impossible d'ajouter le commentaire",
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      // Tentative 1: endpoint dédié au statut
      let res = await fetch(`${base}/api/retro-reports/${reportId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        // Fallback: PATCH sur le ticket
        res = await fetch(`${base}/api/retro-reports/${reportId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error('status failed');
      }

      // Recharger la liste depuis le serveur
      await fetchReports();

      const labels = { open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé' };
      toast({
        title: 'Statut mis à jour',
        description: `RétroReport marqué comme ${labels[newStatus]?.toLowerCase() || newStatus}`,
        status: 'success',
        duration: 3000
      });
    } catch (e) {
      toast({
        title: 'Erreur',
        description: 'Impossible de changer le statut',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce RétroReport ?')) return;
    try {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ title: 'Erreur', description: 'Token non trouvé', status: 'error', duration: 3000 });
        return;
      }
      const url = `${base}/api/retro-reports/${reportId}`;
      console.log('🗑️ Suppression ticket:', url);
      const res = await fetch(url, { 
        method: 'DELETE', 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      });
      console.log('Delete response status:', res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error('Delete error:', errText);
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      const result = await res.json();
      console.log('Delete result:', result);
      setRetroReports(prev => prev.filter(r => r.id !== reportId));
      toast({ title: 'RétroReport supprimé', description: 'Le ticket a été supprimé avec succès', status: 'success', duration: 3000 });
    } catch (e) {
      console.error('❌ Erreur suppression:', e);
      toast({ title: 'Erreur', description: `Suppression impossible: ${e.message}`, status: 'error', duration: 5000 });
    }
  };

  const handleEditReport = (report) => {
    setSelectedReport(report);
    setEditFormData({ title: report.title, description: report.description, category: report.category || '', priority: report.priority || 'medium', type: report.type || 'bug' });
    onEditOpen();
  };

  const handleEditSubmit = async () => {
    if (!selectedReport?.id || !editFormData.title || !editFormData.description) {
      toast({ title: 'Erreur', description: 'Titre et description requis', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(`${base}/api/retro-reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json','Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          category: editFormData.category || '',
          priority: editFormData.priority || 'medium',
          type: editFormData.type || 'bug'
        })
      });
      if (!res.ok) throw new Error('update failed');
      const data = await res.json();
      setRetroReports(prev => prev.map(r => r.id === data.report.id ? data.report : r));
      onEditClose();
      toast({ title: 'Succès', description: 'RétroReport mis à jour', status: 'success', duration: 3000 });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Mise à jour impossible', status: 'error', duration: 3000 });
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Spinner size="xl" color="green.500" />
          <Text>Chargement des données administratives...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8} fontFamily="Montserrat, sans-serif">
      <Box bgGradient={gradientBg} color="white" p={8} borderRadius="xl" mb={8} textAlign="center">
        <Heading size="xl" mb={4}>⚙️ Gestion Administrative</Heading>
        <Text fontSize="lg" opacity={0.9}>Administration générale, RétroReports et gestion du changelog • MyRBE</Text>
      </Box>

      <AdminStats data={adminData} loading={false} />

      {/* Bloc Gestion du site web déplacé vers la page "Gestion du site" (onglet Configuration) */}

      {/* Modal pour commenter un RétroReport */}
      <Modal isOpen={isCommentOpen} onClose={onCommentClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>💬 Commenter le RétroReport #{selectedReport?.id}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Commentaire</FormLabel>
                <Textarea 
                  value={commentFormData.message} 
                  onChange={(e) => setCommentFormData(prev => ({ ...prev, message: e.target.value }))} 
                  placeholder="Ajoutez une mise à jour, une solution ou un commentaire..." 
                  rows={4} 
                />
              </FormControl>

              <FormControl>
                <FormLabel>Changer le statut (optionnel)</FormLabel>
                <Select 
                  value={commentFormData.status} 
                  onChange={(e) => setCommentFormData(prev => ({ ...prev, status: e.target.value }))} 
                  placeholder="Garder le statut actuel"
                >
                  <option value="open">Ouvert</option>
                  <option value="in_progress">En cours</option>
                  <option value="resolved">Résolu</option>
                  <option value="closed">Fermé</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCommentClose}>Annuler</Button>
            <Button colorScheme="blue" onClick={handleCommentSubmit} leftIcon={<FiSend />}>
              Ajouter le commentaire
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal pour modifier un RétroReport */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>✏️ Modifier le RétroReport #{selectedReport?.id}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input 
                  value={editFormData.title} 
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))} 
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea 
                  value={editFormData.description} 
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))} 
                  rows={4} 
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Type</FormLabel>
                  <Select 
                    value={editFormData.type} 
                    onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="bug">🐛 Bug</option>
                    <option value="feature">✨ Demande d'amélioration</option>
                    <option value="performance">⚡ Performance</option>
                    <option value="security">🔒 Sécurité</option>
                    <option value="other">📋 Autre</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Priorité</FormLabel>
                  <Select 
                    value={editFormData.priority} 
                    onChange={(e) => setEditFormData(prev => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="critical">🔴 Critique</option>
                    <option value="high">🟠 Élevé</option>
                    <option value="medium">🟡 Moyen</option>
                    <option value="low">🟢 Faible</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Catégorie</FormLabel>
                <Input 
                  value={editFormData.category} 
                  onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))} 
                  placeholder="Ex: Technique, Interface, Base de données..." 
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>Annuler</Button>
            <Button colorScheme="green" onClick={handleEditSubmit} leftIcon={<FiCheck />}>
              Sauvegarder
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
