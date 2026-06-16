import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, VStack, HStack, Button, Flex, useToast, Text, Spinner,
  useDisclosure, SimpleGrid, Card, CardBody, CardHeader,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, FormControl, FormLabel, Input, Select,
  Textarea, Switch, Badge, IconButton, Menu, MenuButton, MenuList,
  MenuItem, Alert, AlertIcon, Tabs, TabList, TabPanels, Tab, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, InputGroup, InputLeftElement,
  useColorModeValue, Progress, Tooltip, ButtonGroup, Divider,
  Stat, StatLabel, StatNumber, StatHelpText, CheckboxGroup, Checkbox,
  Container, Heading, Icon, Center
} from "@chakra-ui/react";
import { 
  FiUsers, FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiMail,
  FiUserPlus, FiUserCheck, FiUserX, FiClock, FiTrendingUp,
  FiFilter, FiDownload, FiKey, FiShield, FiActivity, FiRefreshCw,
  FiSettings, FiLock, FiUnlock, FiRotateCcw, FiLogIn, FiLogOut, FiBarChart
} from 'react-icons/fi';
import { membersAPI } from '../api/members.js';
import CreateMember from '../components/CreateMember';
import WorkspaceLayout from '../components/Layout/WorkspaceLayout';
import { fetchWithCSRF } from '../lib/csrfClient';

// API base builder with relative fallback
const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const apiUrl = (p) => apiBase ? `${apiBase}${p}` : p;

// === CONFIGURATIONS ===
const MEMBERSHIP_STATUS = {
  PENDING: { label: 'En attente', color: 'yellow', icon: FiClock },
  ACTIVE: { label: 'Actif', color: 'green', icon: FiUserCheck },
  EXPIRED: { label: 'Expiré', color: 'red', icon: FiUserX },
  SUSPENDED: { label: 'Suspendu', color: 'orange', icon: FiLock },
  CANCELLED: { label: 'Annulé', color: 'gray', icon: FiUserX }
};

const MEMBER_ROLES = {
  MEMBER: { label: 'Adhérent', color: 'blue', permissions: ['VIEW_PROFILE'] },
  DRIVER: { label: 'Conducteur', color: 'green', permissions: ['VIEW_PROFILE', 'DRIVE_VEHICLES'] },
  MODERATOR: { label: 'Modérateur', color: 'purple', permissions: ['VIEW_PROFILE', 'MODERATE_CONTENT'] },
  ADMIN: { label: 'Administrateur', color: 'red', permissions: ['FULL_ACCESS'] }
};

// === COMPOSANTS MODERNES ===
function MemberCard({ member, onEdit, onLinkAccess, onTerminate, onDeleteMember, onActivateAdhesion, onBulletinActions }) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const statusConfig = MEMBERSHIP_STATUS[member.membershipStatus] || MEMBERSHIP_STATUS.PENDING;
  const roleConfig = MEMBER_ROLES[member.role] || MEMBER_ROLES.MEMBER;

  return (
    <Card bg={cardBg} borderWidth={1} borderColor="gray.200">
      <CardHeader pb={2}>
        <Flex justify="space-between" align="start">
          <VStack align="start" spacing={1}>
            <HStack>
              <Text fontWeight="bold" fontSize="md">
                {member.firstName} {member.lastName}
              </Text>
              <Badge colorScheme={statusConfig.color} size="sm">
                {statusConfig.label}
              </Badge>
              <Badge colorScheme={roleConfig.color} variant="outline" size="sm">
                {roleConfig.label}
              </Badge>
            </HStack>
            
            <Text fontSize="sm" color="gray.600">{member.email}</Text>
            
            {member.matricule && (
              <HStack spacing={2}>
                <Badge colorScheme="blue" variant="subtle">
                  🔑 {member.matricule}
                </Badge>
                {member.status === 'active' ? (
                  <Badge colorScheme="green" size="sm">✅ Accès activé</Badge>
                ) : (
                  <Badge colorScheme="gray" size="sm">❌ Accès désactivé</Badge>
                )}
              </HStack>
            )}
          </VStack>

          <VStack spacing={1}>
            {member.membershipStatus === 'PENDING' && (
              <Button
                size="xs"
                colorScheme="blue"
                leftIcon={<FiUserCheck />}
                onClick={() => onActivateAdhesion(member)}
                variant="solid"
              >
                Activer
              </Button>
            )}
            <Menu>
              <MenuButton as={IconButton} icon={<FiSettings />} variant="ghost" size="sm" />
              <MenuList>
                <MenuItem icon={<FiEdit />} onClick={() => onEdit(member)}>
                  Modifier
                </MenuItem>
                <MenuItem icon={<FiUserX />} onClick={() => onTerminate(member)} color="red.500">
                  Terminer l'adhésion
                </MenuItem>
                <MenuItem icon={<FiKey />} onClick={() => onLinkAccess(member)}>
                  Associer à un accès existant
                </MenuItem>
                <MenuItem icon={<FiMail />} onClick={() => onBulletinActions(member)}>
                  Gestion bulletin
                </MenuItem>
                {member.membershipStatus === 'CANCELLED' && (
                  <MenuItem icon={<FiTrash2 />} onClick={() => onDeleteMember(member)} color="red.600">
                    Effacer l'adhérent
                  </MenuItem>
                )}
              </MenuList>
            </Menu>
          </VStack>
        </Flex>
      </CardHeader>

      <CardBody pt={0}>
        <VStack align="start" spacing={2}>
          {member.phone && (
            <Text fontSize="sm">📞 {member.phone}</Text>
          )}
          
          {member.lastLoginAt && (
            <Text fontSize="xs" color="gray.500">
              Dernière connexion: {new Date(member.lastLoginAt).toLocaleDateString('fr-FR')}
            </Text>
          )}
          
          {member.mustChangePassword && (
            <Badge colorScheme="orange" size="sm">
              ⚠️ Doit changer le mot de passe
            </Badge>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}

// === MODAL LOGS DE CONNEXION ===
function ConnectionLogsModal({ isOpen, onClose, member }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && member) {
      loadConnectionLogs();
    }
  }, [isOpen, member]);

  const loadConnectionLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/members/${member.id}/connection-logs`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Erreur chargement logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          📊 Logs de connexion - {member?.firstName} {member?.lastName}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {loading ? (
            <VStack spacing={4}>
              <Spinner size="lg" />
              <Text>Chargement des logs...</Text>
            </VStack>
          ) : logs.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              Aucune connexion enregistrée pour ce membre
            </Alert>
          ) : (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>IP</Th>
                  <Th>Statut</Th>
                </Tr>
              </Thead>
              <Tbody>
                {logs.map((log, index) => (
                  <Tr key={index}>
                    <Td>{new Date(log.timestamp).toLocaleString('fr-FR')}</Td>
                    <Td>
                      <Badge colorScheme={log.type === 'LOGIN' ? 'green' : 'red'}>
                        {log.type === 'LOGIN' ? 'Connexion' : 'Déconnexion'}
                      </Badge>
                    </Td>
                    <Td>{log.ipAddress}</Td>
                    <Td>
                      <Badge colorScheme={log.success ? 'green' : 'red'}>
                        {log.success ? 'Succès' : 'Échec'}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </ModalBody>
        
        <ModalFooter>
          <Button onClick={onClose}>Fermer</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// === COMPOSANT PRINCIPAL ===
export default function MembersManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showOnlyWithLogin, setShowOnlyWithLogin] = useState(false);
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [stats, setStats] = useState({});
  const [bulletinStats, setBulletinStats] = useState({ active: 0, pending: 0, in_progress: 0, completed: 0 });
  const [recentCompletions, setRecentCompletions] = useState([]);
  const [loadingBulletinStats, setLoadingBulletinStats] = useState(false);
  
  const { 
    isOpen: isCreateOpen, 
    onOpen: onCreateOpen, 
    onClose: onCreateClose 
  } = useDisclosure();
  
  const { 
    isOpen: isLogsOpen, 
    onOpen: onLogsOpen, 
    onClose: onLogsClose 
  } = useDisclosure();

  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose
  } = useDisclosure();

  const {
    isOpen: isTerminateOpen,
    onOpen: onTerminateOpen,
    onClose: onTerminateClose
  } = useDisclosure();

  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');

  const renderLoadingState = () => (
    <Center py={20}>
      <VStack spacing={4}>
        <Spinner size="xl" color="purple.500" />
        <Text color="gray.500">Chargement des membres...</Text>
      </VStack>
    </Center>
  );

  const [editData, setEditData] = useState(null);
  const [terminateMember, setTerminateMember] = useState(null);
  const [terminateForm, setTerminateForm] = useState({ reason: '', notes: '', pv: null, resignation: null });
  const {
    isOpen: isLinkOpen,
    onOpen: onLinkOpen,
    onClose: onLinkClose
  } = useDisclosure();
  const {
    isOpen: isBulletinOpen,
    onOpen: onBulletinOpen,
    onClose: onBulletinClose
  } = useDisclosure();
  const [linkForm, setLinkForm] = useState({ username: '', email: '' });
  const [bulletinMember, setBulletinMember] = useState(null);
  const [renewFlowState, setRenewFlowState] = useState({
    email: '',
    phone: '',
    sendEmail: true,
    sendSMS: false,
    generatedLink: ''
  });
  const [resendState, setResendState] = useState({ recipientEmail: '' });
  const [bulletinBusy, setBulletinBusy] = useState(false);

  // === CHARGEMENT DES DONNÉES ===
  useEffect(() => {
    loadMembers();
    loadBulletinStats();
    
    // Rafraîchir les stats de bulletin toutes les 30 secondes
    const interval = setInterval(() => {
      loadBulletinStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await membersAPI.getAll();
      setMembers(data.members || []);
      calculateStats(data.members || []);
    } catch (error) {
      console.error('Erreur chargement membres:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les membres",
        status: "error",
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (membersList) => {
    const total = membersList.length;
    const withLogin = membersList.filter(m => m.loginEnabled).length;
    const active = membersList.filter(m => m.membershipStatus === 'ACTIVE').length;
    const lastMonth = membersList.filter(m => {
      if (!m.lastLoginAt) return false;
      const lastLogin = new Date(m.lastLoginAt);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return lastLogin > monthAgo;
    }).length;

    setStats({
      total,
      withLogin,
      active,
      recentlyActive: lastMonth
    });
  };

  const loadBulletinStats = async () => {
    try {
      setLoadingBulletinStats(true);
      
      // Charger les statistiques
      const statsRes = await fetchWithCSRF(apiUrl('/api/bulletin-stats/stats'));
      const statsData = await statsRes.json().catch(() => ({ stats: {} }));
      
      if (statsData.success) {
        setBulletinStats(statsData.stats);
      }
      
      // Charger les complétions récentes (dernières 24h)
      const completionsRes = await fetchWithCSRF(apiUrl('/api/bulletin-stats/recent-completions'));
      const completionsData = await completionsRes.json().catch(() => ({ completions: [] }));
      
      if (completionsData.success) {
        // Vérifier s'il y a de nouveaux bulletins signés
        const newCompletions = completionsData.completions.filter(c => {
          return !recentCompletions.find(rc => rc.token === c.token);
        });
        
        // Afficher une notification pour chaque nouveau bulletin signé
        newCompletions.forEach(completion => {
          toast({
            title: '✅ Bulletin signé et complété',
            description: `Le Bulletin de l'adhérent(e) ${completion.memberName} est signé et complété.`,
            status: 'success',
            duration: 10000,
            isClosable: true,
            position: 'top-right'
          });
        });
        
        setRecentCompletions(completionsData.completions);
      }
    } catch (error) {
      console.error('Erreur chargement stats bulletins:', error);
    } finally {
      setLoadingBulletinStats(false);
    }
  };

  // === FILTRAGE ===
  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.matricule?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || member.membershipStatus === statusFilter;
    const matchesRole = roleFilter === 'ALL' || member.role === roleFilter;
    const matchesLogin = !showOnlyWithLogin || member.loginEnabled;

    return matchesSearch && matchesStatus && matchesRole && matchesLogin;
  });

  // === ACTIONS ===
  const handleToggleLogin = async (member) => {
    try {
      const action = member.loginEnabled ? 'disable' : 'enable';
      
      const response = await fetchWithCSRF(apiUrl(`/api/members/${member.id}/toggle-login`), {
        method: 'POST',
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la modification');
      }

      const data = await response.json();
      
      // Mettre à jour l'état local
      setMembers(prev => prev.map(m => 
        m.id === member.id 
          ? { ...m, loginEnabled: !m.loginEnabled, temporaryPassword: data.temporaryPassword }
          : m
      ));

      if (data.temporaryPassword) {
        toast({
          title: "Accès activé",
          description: `Mot de passe temporaire: ${data.temporaryPassword}`,
          status: "success",
          duration: 10000,
          isClosable: true
        });
      } else {
        toast({
          title: action === 'enable' ? "Accès activé" : "Accès désactivé",
          description: `L'accès MyRBE a été ${action === 'enable' ? 'activé' : 'désactivé'}`,
          status: "success",
          duration: 3000
        });
      }
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 5000
      });
    }
  };

  const handleResetPassword = async (member) => {
    if (!window.confirm('Réinitialiser le mot de passe de ce membre ?')) {
      return;
    }

    try {
      const response = await fetchWithCSRF(apiUrl(`/api/members/${member.id}/reset-password`), {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la réinitialisation');
      }

      const data = await response.json();
      
      toast({
        title: "Mot de passe réinitialisé",
        description: `Nouveau mot de passe temporaire: ${data.temporaryPassword}`,
        status: "success",
        duration: 10000,
        isClosable: true
      });
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 5000
      });
    }
  };

  // Logs de connexion ont été retirés de la gestion des adhésions

  const handleEdit = (member) => {
    setSelectedMember(member);
    setEditData({ ...member });
    onEditOpen();

    // Charger les détails complets (incluant signature/historique) pour la vue d'édition
    fetch(apiUrl(`/api/members/${member.id}`), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(async (resp) => {
        if (!resp.ok) return null;
        return resp.json();
      })
      .then((details) => {
        if (details) {
          setEditData((prev) => ({ ...prev, ...details }));
        }
      })
      .catch(() => {});
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('fr-FR');
  };

  const formatSignatureChannel = (channel) => {
    const c = String(channel || '').toLowerCase();
    if (!c) return 'Non précisé';
    if (c.includes('sms')) return 'SMS';
    if (c.includes('email')) return 'Email';
    if (c.includes('paper') || c.includes('papier')) return 'Papier';
    if (c.includes('web') || c.includes('digital') || c.includes('dematerial')) return 'Dématérialisé';
    return channel;
  };

  const saveEdit = async () => {
    try {
      if (!selectedMember) return;
      const allowed = ['firstName','lastName','email','phone','address','city','postalCode','membershipType','membershipStatus','paymentAmount','paymentMethod','newsletter','notes'];
      const payload = {};
      for (const k of allowed) if (k in editData) payload[k] = editData[k];
      const resp = await fetchWithCSRF(apiUrl(`/api/members/${selectedMember.id}`), {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await resp.json().catch(()=> ({}));
      if (!resp.ok) throw new Error(data?.error || 'Échec de la mise à jour');
      const updated = data.member || data;
      setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, ...updated } : m));
      toast({ title: 'Membre mis à jour', status: 'success' });
      onEditClose();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, status: 'error' });
    }
  };

  const handleTerminate = (member) => {
    setTerminateMember(member);
    setTerminateForm({ reason: '', notes: '', pv: null, resignation: null });
    onTerminateOpen();
  };

  const confirmTerminate = async () => {
    try {
      if (!terminateMember) return;
      if (!terminateForm.reason) { toast({ title: 'Motif requis', status: 'error' }); return; }
      if (terminateForm.reason === 'EXCLUSION' && !terminateForm.pv) { toast({ title: 'PV obligatoire', status: 'error' }); return; }
      if (terminateForm.reason === 'DEMISSION' && (!terminateForm.pv || !terminateForm.resignation)) { toast({ title: 'PV et lettre obligatoires', status: 'error' }); return; }
      const fd = new FormData();
      fd.append('reason', terminateForm.reason);
      if (terminateForm.notes) fd.append('notes', terminateForm.notes);
      if (terminateForm.pv) fd.append('pv', terminateForm.pv);
      if (terminateForm.resignation) fd.append('resignation', terminateForm.resignation);
      const resp = await fetchWithCSRF(apiUrl(`/api/members/${terminateMember.id}/terminate`), {
        method: 'POST',
        body: fd
      });
      const data = await resp.json().catch(()=> ({}));
      if (!resp.ok) throw new Error(data?.error || 'Échec de la résiliation');
      toast({ title: "Adhésion terminée", status: 'success' });
      await loadMembers();
      onTerminateClose();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, status: 'error' });
    }
  };

  const handleDeleteMember = async (member) => {
    try {
      if (member.membershipStatus !== 'CANCELLED') {
        toast({ title: "Résiliez d'abord l'adhésion", status: 'warning' });
        return;
      }
      if (!window.confirm(`Effacer définitivement ${member.firstName} ${member.lastName} ?`)) return;
      const resp = await fetchWithCSRF(apiUrl(`/api/members/${member.id}`), {
        method: 'DELETE'
      });
      if (!resp.ok && resp.status !== 204) {
        const data = await resp.json().catch(()=> ({}));
        throw new Error(data?.error || 'Suppression impossible');
      }
      toast({ title: "Adhérent effacé", status: 'success' });
      setMembers(prev => prev.filter(m => m.id !== member.id));
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, status: 'error' });
    }
  };

  const handleActivateAdhesion = async (member) => {
    try {
      const resp = await fetchWithCSRF(apiUrl(`/api/members/${member.id}`), {
        method: 'PUT',
        body: JSON.stringify({ membershipStatus: 'ACTIVE' })
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || 'Activation impossible');
      }
      const updated = await resp.json();
      setMembers(prev => prev.map(m => m.id === member.id ? updated : m));
      toast({
        title: "Adhésion activée",
        description: `${member.firstName} ${member.lastName} est maintenant actif`,
        status: 'success'
      });
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e.message,
        status: 'error'
      });
    }
  };

  const handleMemberCreated = (newMember) => {
    setMembers(prev => [newMember, ...prev]);
    calculateStats([newMember, ...members]);
    onCreateClose();
  };

  const handleLinkAccess = (member) => {
    setSelectedMember(member);
    setLinkForm({ username: '', email: '' });
    onLinkOpen();
  };

  const handleBulletinActions = (member) => {
    setBulletinMember(member);
    setRenewFlowState({
      email: member.email || '',
      phone: member.phone || '',
      sendEmail: true,
      sendSMS: false,
      generatedLink: ''
    });
    setResendState({ recipientEmail: member.email || '' });
    onBulletinOpen();
  };

  const handleRenewAdhesion = async () => {
    try {
      if (!bulletinMember) return;
      if (renewFlowState.sendEmail && !renewFlowState.email.trim()) {
        toast({ title: 'Email requis', description: 'Renseignez un email pour envoyer le parcours.', status: 'warning' });
        return;
      }

      setBulletinBusy(true);
      const response = await fetchWithCSRF(apiUrl('/api/bulletin-flow/create'), {
        method: 'POST',
        body: JSON.stringify({
          memberData: {
            id: bulletinMember.id,
            firstName: bulletinMember.firstName,
            lastName: bulletinMember.lastName,
            email: bulletinMember.email,
            phone: bulletinMember.phone,
            birthDate: bulletinMember.birthDate,
            address: bulletinMember.address,
            city: bulletinMember.city,
            postalCode: bulletinMember.postalCode,
            membershipType: bulletinMember.membershipType,
            paymentAmount: bulletinMember.paymentAmount,
            paymentMethod: bulletinMember.paymentMethod
          },
          sendEmail: renewFlowState.sendEmail,
          sendSMS: renewFlowState.sendSMS,
          email: renewFlowState.email,
          phone: renewFlowState.phone
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Impossible de lancer le renouvellement');
      }

      setRenewFlowState((prev) => ({ ...prev, generatedLink: data.link || '' }));
      toast({
        title: 'Parcours de renouvellement lancé',
        description: data.emailSent ? 'Lien envoyé à l’adhérent.' : 'Parcours créé. Copiez le lien si nécessaire.',
        status: 'success'
      });
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, status: 'error' });
    } finally {
      setBulletinBusy(false);
    }
  };

  const handleResendSignedBulletin = async () => {
    try {
      if (!bulletinMember) return;
      if (!resendState.recipientEmail.trim()) {
        toast({ title: 'Email requis', description: 'Renseignez un destinataire.', status: 'warning' });
        return;
      }

      setBulletinBusy(true);
      const response = await fetchWithCSRF(apiUrl('/api/bulletin-flow/member/resend-signed'), {
        method: 'POST',
        body: JSON.stringify({
          memberId: bulletinMember.id,
          email: bulletinMember.email,
          recipientEmail: resendState.recipientEmail
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data?.details || data?.error || 'Renvoi du bulletin signé impossible');
      }

      toast({
        title: 'Bulletin signé renvoyé',
        description: `Envoyé à ${data.sentTo}`,
        status: 'success',
        duration: 3000
      });
      
      // Fermer automatiquement la modale après 2 secondes
      setTimeout(() => {
        onBulletinClose();
        setResendState({ recipientEmail: '' });
      }, 2000);
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, status: 'error' });
    } finally {
      setBulletinBusy(false);
    }
  };

  const confirmLinkAccess = async () => {
    try {
      if (!selectedMember) return;
      if (!linkForm.username && !linkForm.email) {
        toast({ title: 'Renseignez matricule ou email', status: 'warning' });
        return;
      }
      const resp = await fetchWithCSRF(apiUrl(`/api/members/${selectedMember.id}/link-access`), {
        method: 'POST',
        body: JSON.stringify({ username: linkForm.username || undefined, email: linkForm.email || undefined })
      });
      const data = await resp.json().catch(()=> ({}));
      if (!resp.ok) throw new Error(data?.error || 'Échec de l’association');
      toast({ title: 'Accès associé', status: 'success' });
      await loadMembers();
      onLinkClose();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, status: 'error' });
    }
  };

  const renderDashboard = () => {
    if (loading) {
      return renderLoadingState();
    }

    const safeStats = {
      total: stats.total || 0,
      withLogin: stats.withLogin || 0,
      active: stats.active || 0,
      recentlyActive: stats.recentlyActive || 0
    };

    return (
      <VStack spacing={6} align="stretch">
        <Text color="gray.600">
          Suivi global des adhésions et des connexions MyRBE.
        </Text>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Total membres</StatLabel>
                <StatNumber color="blue.500">{safeStats.total}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Avec accès MyRBE</StatLabel>
                <StatNumber color="green.500">{safeStats.withLogin}</StatNumber>
                <StatHelpText>
                  {safeStats.total > 0 ? Math.round((safeStats.withLogin / safeStats.total) * 100) : 0}%
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Adhésions actives</StatLabel>
                <StatNumber color="purple.500">{safeStats.active}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Connexions récentes</StatLabel>
                <StatNumber color="orange.500">{safeStats.recentlyActive}</StatNumber>
                <StatHelpText>30 derniers jours</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Section statistiques bulletins */}
        <Box>
          <HStack mb={4} justify="space-between">
            <Heading size="md">📝 Bulletins d'adhésion</Heading>
            {loadingBulletinStats && <Spinner size="sm" color="purple.500" />}
          </HStack>
          
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Card bg={cardBg} borderWidth={2} borderColor="orange.300">
              <CardBody>
                <Stat>
                  <StatLabel>En cours d'édition</StatLabel>
                  <StatNumber color="orange.500" fontSize="3xl">
                    {bulletinStats.active || 0}
                  </StatNumber>
                  <StatHelpText>
                    {bulletinStats.pending || 0} non commencés, {bulletinStats.in_progress || 0} en cours
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>✅ Complétés</StatLabel>
                  <StatNumber color="green.500">{bulletinStats.completed || 0}</StatNumber>
                  <StatHelpText>Signés et validés</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>⏱️ En attente</StatLabel>
                  <StatNumber color="yellow.600">{bulletinStats.pending || 0}</StatNumber>
                  <StatHelpText>Pas encore commencés</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>🚀 En progression</StatLabel>
                  <StatNumber color="blue.500">{bulletinStats.in_progress || 0}</StatNumber>
                  <StatHelpText>Étapes en cours</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Liste des bulletins récemment complétés */}
          {recentCompletions.length > 0 && (
            <Box mt={4}>
              <Heading size="sm" mb={2} color="gray.600">
                Derniers bulletins signés (24h)
              </Heading>
              <VStack spacing={2} align="stretch">
                {recentCompletions.slice(0, 5).map((completion, idx) => (
                  <Card key={idx} size="sm" bg="green.50">
                    <CardBody>
                      <HStack justify="space-between">
                        <HStack>
                          <Text fontWeight="bold">✅ {completion.memberName}</Text>
                          <Badge colorScheme="green" size="sm">Signé</Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          {new Date(completion.signedAt).toLocaleString('fr-FR')}
                          {completion.duration && ` (${completion.duration}min)`}
                        </Text>
                      </HStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </Box>
          )}
        </Box>
      </VStack>
    );
  };

  const renderMembersTab = () => {
    if (loading) {
      return renderLoadingState();
    }

    return (
      <VStack spacing={6} align="stretch">
        <Card bg={cardBg}>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack w="full" spacing={4} align={{ base: 'stretch', md: 'center' }} flexWrap="wrap">
                <InputGroup flex={2}>
                  <InputLeftElement>
                    <FiSearch />
                  </InputLeftElement>
                  <Input
                    placeholder="Rechercher par nom, email ou matricule..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>

                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  maxW="200px"
                >
                  <option value="ALL">Tous statuts</option>
                  {Object.entries(MEMBERSHIP_STATUS).map(([key, status]) => (
                    <option key={key} value={key}>{status.label}</option>
                  ))}
                </Select>

                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  maxW="200px"
                >
                  <option value="ALL">Tous rôles</option>
                  {Object.entries(MEMBER_ROLES).map(([key, role]) => (
                    <option key={key} value={key}>{role.label}</option>
                  ))}
                </Select>
              </HStack>

              <HStack spacing={4} justify="space-between" flexWrap="wrap">
                <Checkbox
                  isChecked={showOnlyWithLogin}
                  onChange={(e) => setShowOnlyWithLogin(e.target.checked)}
                >
                  Afficher seulement les membres avec accès MyRBE
                </Checkbox>

                <Button leftIcon={<FiRefreshCw />} size="sm" onClick={loadMembers}>
                  Actualiser
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Text fontSize="sm" color="gray.600">
          {filteredMembers.length} membre(s) affiché(s)
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filteredMembers.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              onEdit={handleEdit}
              onLinkAccess={handleLinkAccess}
              onTerminate={handleTerminate}
              onDeleteMember={handleDeleteMember}
              onActivateAdhesion={handleActivateAdhesion}
              onBulletinActions={handleBulletinActions}
            />
          ))}
        </SimpleGrid>

        {filteredMembers.length === 0 && (
          <Alert status="info">
            <AlertIcon />
            Aucun membre ne correspond aux critères de recherche
          </Alert>
        )}
      </VStack>
    );
  };

  const renderLayoutTab = () => (
    <Box>
      <Heading size="md" mb={4}>⚙️ Configuration de l'affichage</Heading>
      <Text mb={4} color="gray.600">Configurez les champs visibles dans la page personnelle /adhesion de chaque adhérent</Text>
      
      <VStack spacing={6} align="stretch">
        {/* Section: Onglet 1 - Informations personnelles */}
        <Card>
          <CardHeader bg="blue.50">
            <Heading size="sm">👤 Onglet 1: Informations personnelles</Heading>
          </CardHeader>
          <CardBody>
            <Text fontSize="sm" color="gray.600" mb={4}>Champs affichés dans l'onglet "Informations personnelles"</Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <CheckboxGroup defaultValue={['firstName', 'lastName', 'email', 'phone', 'address', 'birthDate']}>
                <Checkbox value="firstName">Prénom</Checkbox>
                <Checkbox value="lastName">Nom</Checkbox>
                <Checkbox value="email">Email</Checkbox>
                <Checkbox value="phone">Téléphone</Checkbox>
                <Checkbox value="address">Adresse</Checkbox>
                <Checkbox value="city">Ville</Checkbox>
                <Checkbox value="postalCode">Code postal</Checkbox>
                <Checkbox value="birthDate">Date de naissance</Checkbox>
              </CheckboxGroup>
            </SimpleGrid>
            <Button mt={4} size="sm" colorScheme="blue">Enregistrer</Button>
          </CardBody>
        </Card>

        {/* Section: Onglet 2 - Informations d'adhésion */}
        <Card>
          <CardHeader bg="green.50">
            <Heading size="sm">📋 Onglet 2: Informations d'adhésion</Heading>
          </CardHeader>
          <CardBody>
            <Text fontSize="sm" color="gray.600" mb={4}>Champs affichés dans l'onglet "Informations Adhérent"</Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <CheckboxGroup defaultValue={['membershipType', 'membershipStatus', 'paymentAmount', 'paymentMethod', 'matricule', 'memberNumber', 'birthDate', 'address']}>
                <Checkbox value="membershipType">Type d'adhésion</Checkbox>
                <Checkbox value="membershipStatus">Statut</Checkbox>
                <Checkbox value="membershipDates">Dates d'adhésion</Checkbox>
                <Checkbox value="paymentAmount">Montant cotisation</Checkbox>
                <Checkbox value="paymentMethod">Mode de paiement</Checkbox>
                <Checkbox value="matricule">Matricule</Checkbox>
                <Checkbox value="memberNumber">N° adhérent</Checkbox>
                <Checkbox value="birthDate">Date de naissance</Checkbox>
                <Checkbox value="address">Adresse complète</Checkbox>
                <Checkbox value="notes">Notes admin</Checkbox>
              </CheckboxGroup>
            </SimpleGrid>
            <Button mt={4} size="sm" colorScheme="blue">Enregistrer</Button>
          </CardBody>
        </Card>

        {/* Section: Onglet 3 - Documents */}
        <Card>
          <CardHeader bg="purple.50">
            <Heading size="sm">📄 Onglet 3: Documents d'adhésion</Heading>
          </CardHeader>
          <CardBody>
            <Text fontSize="sm" color="gray.600" mb={4}>Les documents d'adhésion sont gérés dans le panel "Adhérents" lors de l'édition</Text>
            <Alert status="info"><AlertIcon />Vous pouvez uploader des bulletins d'adhésion pour chaque membre</Alert>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );

  const renderSettingsTab = () => (
    <Box>
      <Heading size="md" mb={4}>⚙️ Paramètres</Heading>
      {renderExistingContent('settings')}
    </Box>
  );

  const renderExistingContent = (section) => {
    // Pour l'instant, on retourne juste un placeholder
    return (
      <Card bg={cardBg}>
        <CardBody>
          <Text color="gray.500">Contenu de {section} à implémenter</Text>
        </CardBody>
      </Card>
    );
  };

  const workspaceSections = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: FiBarChart,
      description: 'Vue synthétique',
      render: renderDashboard
    },
    {
      id: 'adhesions',
      label: 'Adhésions',
      icon: FiUsers,
      description: 'Création et recherche',
      render: renderMembersTab
    },
    {
      id: 'layout',
      label: 'Configuration',
      icon: FiSettings,
      description: 'Champs affichables',
      render: renderLayoutTab
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: FiShield,
      description: 'Options avancées',
      render: renderSettingsTab
    }
  ];

  const headerActions = [
    <Button key="create" leftIcon={<FiPlus />} colorScheme="blue" onClick={onCreateOpen}>
      Ajout RH
    </Button>
  ];

  return (
    <>
      <WorkspaceLayout
        title="Gestion RH"
        subtitle="Gérer les adhérents, stagiaires, cotisations et documents"
        sections={workspaceSections}
        defaultSectionId="dashboard"
        sidebarTitle="Gestion RH"
        sidebarSubtitle="Espace MyRBE"
        sidebarTitleIcon={FiUsers}
        versionLabel="RH v2.1"
        headerActions={headerActions}
      />

      <CreateMember
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        onMemberCreated={handleMemberCreated}
      />

      <Modal isOpen={isLinkOpen} onClose={onLinkClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Associer à un accès existant</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info"><AlertIcon />La création d’accès se fait dans "Gestion des accès". Ici, vous pouvez lier un accès existant (fusion).</Alert>
              <FormControl>
                <FormLabel>Matricule (username)</FormLabel>
                <Input value={linkForm.username} onChange={(e)=>setLinkForm(p=>({...p, username: e.target.value}))} placeholder="ex: jd2025" />
              </FormControl>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input type="email" value={linkForm.email} onChange={(e)=>setLinkForm(p=>({...p, email: e.target.value}))} placeholder="utilisateur@domaine.fr" />
              </FormControl>
              <Text fontSize="sm" color="gray.600">Renseignez au moins l’un des deux champs.</Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onLinkClose}>Annuler</Button>
            <Button colorScheme="blue" onClick={confirmLinkAccess}>Associer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={onEditClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Modifier le membre</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {editData && (
              <VStack align="stretch" spacing={4}>
                {/* Section Identité */}
                <Box>
                  <Heading size="sm" mb={3} color="gray.600">👤 Identité</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl>
                      <FormLabel>Prénom</FormLabel>
                      <Input value={editData.firstName || ''} onChange={(e)=>setEditData(p=>({...p, firstName: e.target.value}))} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Nom</FormLabel>
                      <Input value={editData.lastName || ''} onChange={(e)=>setEditData(p=>({...p, lastName: e.target.value}))} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Date de naissance</FormLabel>
                      <Input type="date" value={editData.birthDate ? editData.birthDate.split('T')[0] : ''} onChange={(e)=>setEditData(p=>({...p, birthDate: e.target.value ? new Date(e.target.value).toISOString() : null}))} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Matricule</FormLabel>
                      <Input value={editData.matricule || ''} onChange={(e)=>setEditData(p=>({...p, matricule: e.target.value}))} />
                    </FormControl>
                  </SimpleGrid>
                </Box>

                <Divider />

                {/* Section Contact */}
                <Box>
                  <Heading size="sm" mb={3} color="gray.600">📞 Coordonnées</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl>
                      <FormLabel>Email</FormLabel>
                      <Input type="email" value={editData.email || ''} onChange={(e)=>setEditData(p=>({...p, email: e.target.value}))} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Téléphone</FormLabel>
                      <Input value={editData.phone || ''} onChange={(e)=>setEditData(p=>({...p, phone: e.target.value}))} />
                    </FormControl>
                  </SimpleGrid>
                </Box>

                <Divider />

                {/* Section Adresse */}
                <Box>
                  <Heading size="sm" mb={3} color="gray.600">🏠 Adresse</Heading>
                  <VStack spacing={3} align="stretch">
                    <FormControl>
                      <FormLabel>Adresse</FormLabel>
                      <Input value={editData.address || ''} onChange={(e)=>setEditData(p=>({...p, address: e.target.value}))} />
                    </FormControl>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Code postal</FormLabel>
                        <Input value={editData.postalCode || ''} onChange={(e)=>setEditData(p=>({...p, postalCode: e.target.value}))} />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Ville</FormLabel>
                        <Input value={editData.city || ''} onChange={(e)=>setEditData(p=>({...p, city: e.target.value}))} />
                      </FormControl>
                    </SimpleGrid>
                  </VStack>
                </Box>

                <Divider />

                {/* Section Adhésion */}
                <Box>
                  <Heading size="sm" mb={3} color="gray.600">📋 Adhésion</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl>
                      <FormLabel>Statut</FormLabel>
                      <Select value={editData.membershipStatus || 'ACTIVE'} onChange={(e)=>setEditData(p=>({...p, membershipStatus: e.target.value}))}>
                        <option value="PENDING">En attente</option>
                        <option value="ACTIVE">Actif</option>
                        <option value="EXPIRED">Expiré</option>
                        <option value="SUSPENDED">Suspendu</option>
                        <option value="CANCELLED">Annulé</option>
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Type d'adhésion</FormLabel>
                      <Select value={editData.membershipType || 'STANDARD'} onChange={(e)=>setEditData(p=>({...p, membershipType: e.target.value}))}>
                        <option value="STANDARD">Standard</option>
                        <option value="FAMILY">Famille</option>
                        <option value="STUDENT">Étudiant</option>
                        <option value="HONORARY">Honneur</option>
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Montant payé (€)</FormLabel>
                      <Input type="number" step="0.01" value={editData.paymentAmount || ''} onChange={(e)=>setEditData(p=>({...p, paymentAmount: e.target.value ? parseFloat(e.target.value) : null}))} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Méthode de paiement</FormLabel>
                      <Select value={editData.paymentMethod || ''} onChange={(e)=>setEditData(p=>({...p, paymentMethod: e.target.value}))}>
                        <option value="">Non définie</option>
                        <option value="CASH">Espèces</option>
                        <option value="CHECK">Chèque</option>
                        <option value="BANK_TRANSFER">Virement bancaire</option>
                        <option value="CARD">Carte bancaire</option>
                        <option value="HELLOASSO">HelloAsso</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                </Box>

                <Divider />

                {/* Section Signature dématérialisée */}
                <Box>
                  <Heading size="sm" mb={3} color="gray.600">✍️ Bulletin dématérialisé signé</Heading>
                  {editData.latestSignature ? (
                    <VStack align="stretch" spacing={3}>
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Date de signature</Text>
                          <Text fontWeight="600">{formatDateTime(editData.latestSignature.signedAt || editData.latestSignature.createdAt)}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Canal</Text>
                          <Badge colorScheme="blue">{formatSignatureChannel(editData.latestSignature.channel)}</Badge>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Référence</Text>
                          <Text fontWeight="600" noOfLines={1}>{editData.latestSignature.token || '-'}</Text>
                        </Box>
                      </SimpleGrid>

                      {editData.latestSignature.signatureDataUrl && (
                        <Box borderWidth="1px" borderRadius="md" p={3} bg="white" maxW="420px">
                          <Box
                            as="img"
                            src={editData.latestSignature.signatureDataUrl}
                            alt="Signature adhérent"
                            maxH="120px"
                            objectFit="contain"
                            w="100%"
                          />
                        </Box>
                      )}

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Permis déclarés</Text>
                          <Text fontWeight="600">
                            {editData.latestSignature.memberSnapshot?.hasDrivingLicenses
                              ? ((editData.latestSignature.memberSnapshot?.drivingLicenses || []).length > 0
                                ? editData.latestSignature.memberSnapshot.drivingLicenses.join(', ')
                                : 'Oui (non détaillé)')
                              : 'Non'}
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Numéro de permis</Text>
                          <Text fontWeight="600">{editData.latestSignature.memberSnapshot?.drivingLicenseNumber || '-'}</Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Engagements réglementaires</Text>
                          <Text fontWeight="600">
                            {editData.latestSignature.memberSnapshot?.acceptedStatuts && editData.latestSignature.memberSnapshot?.acceptedReglementInterieur && editData.latestSignature.memberSnapshot?.acceptedCsar
                              ? 'Statuts + Règlement + CSAR acceptés'
                              : 'Non renseigné'}
                          </Text>
                        </Box>
                      </SimpleGrid>
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color="gray.500">Aucune signature dématérialisée enregistrée.</Text>
                  )}
                </Box>

                <Divider />

                {/* Section Rôles et Permissions */}
                <Box>
                  <Heading size="sm" mb={3} color="gray.600">🛡️ Rôles et Permissions</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl>
                      <FormLabel>Rôle principal</FormLabel>
                      <Select value={editData.role || 'MEMBER'} onChange={(e)=>setEditData(p=>({...p, role: e.target.value}))}>
                        <option value="MEMBER">Adhérent</option>
                        <option value="DRIVER">Conducteur</option>
                        <option value="MODERATOR">Modérateur</option>
                        <option value="ADMIN">Administrateur</option>
                      </Select>
                    </FormControl>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel htmlFor="loginEnabled" mb="0">Accès site activé</FormLabel>
                      <Switch
                        id="loginEnabled"
                        isChecked={editData.loginEnabled || false}
                        onChange={(e) => setEditData(prev => ({ ...prev, loginEnabled: e.target.checked }))}
                        ml={4}
                      />
                    </FormControl>
                  </SimpleGrid>
                  <Alert status="info" mt={4}>
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="bold">Permissions selon le rôle:</Text>
                      <Text fontSize="xs">Adhérent: Voir profil | Conducteur: Voir profil + Conduire | Modérateur: Modération | Admin: Accès complet</Text>
                    </VStack>
                  </Alert>
                </Box>

                <Divider />

                {/* Section Notes */}
                <Box>
                  <FormControl>
                    <FormLabel>Notes internes</FormLabel>
                    <Textarea placeholder="Informations supplémentaires utiles..." value={editData.notes || ''} onChange={(e)=>setEditData(p=>({...p, notes: e.target.value}))} />
                  </FormControl>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>Annuler</Button>
            <Button colorScheme="blue" onClick={saveEdit}>Enregistrer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isTerminateOpen} onClose={onTerminateClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Terminer l'adhésion</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="warning"><AlertIcon />Cette action met fin à l'adhésion. L'accès site associé sera désactivé.</Alert>
              <FormControl isRequired>
                <FormLabel>Motif</FormLabel>
                <Select value={terminateForm.reason} onChange={(e)=>setTerminateForm(p=>({...p, reason:e.target.value}))}>
                  <option value="">Choisir un motif...</option>
                  <option value="FIN">Fin d'adhésion</option>
                  <option value="NON_RECONDUITE">Non reconduite</option>
                  <option value="EXCLUSION">Exclusion votée (joindre le PV)</option>
                  <option value="DEMISSION">Démission (joindre PV et lettre de démission)</option>
                  <option value="INFORMATIQUE">INFORMATIQUE</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Notes (optionnel)</FormLabel>
                <Textarea value={terminateForm.notes} onChange={(e)=>setTerminateForm(p=>({...p, notes:e.target.value}))} />
              </FormControl>
              {(terminateForm.reason === 'EXCLUSION' || terminateForm.reason === 'DEMISSION') && (
                <FormControl isRequired>
                  <FormLabel>Procès-verbal (PDF/Image)</FormLabel>
                  <Input type="file" accept="application/pdf,image/*" onChange={(e)=>setTerminateForm(p=>({...p, pv: e.target.files?.[0]||null}))} />
                </FormControl>
              )}
              {terminateForm.reason === 'DEMISSION' && (
                <FormControl isRequired>
                  <FormLabel>Lettre de démission (PDF/Image)</FormLabel>
                  <Input type="file" accept="application/pdf,image/*" onChange={(e)=>setTerminateForm(p=>({...p, resignation: e.target.files?.[0]||null}))} />
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onTerminateClose}>Annuler</Button>
            <Button colorScheme="red" onClick={confirmTerminate}>Confirmer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isBulletinOpen} onClose={onBulletinClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Gestion bulletin - {bulletinMember ? `${bulletinMember.firstName} ${bulletinMember.lastName}` : ''}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs colorScheme="blue" variant="enclosed">
              <TabList>
                <Tab>Renouveler l'adhésion</Tab>
                <Tab>Renvoyer le bulletin signé</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0} pt={4}>
                  <VStack spacing={4} align="stretch">
                    <Alert status="info"><AlertIcon />Lance le même parcours adhérent (lien de saisie/signature).</Alert>
                    <FormControl>
                      <FormLabel>Email destinataire</FormLabel>
                      <Input
                        type="email"
                        value={renewFlowState.email}
                        onChange={(e) => setRenewFlowState((p) => ({ ...p, email: e.target.value }))}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Téléphone (SMS)</FormLabel>
                      <Input
                        value={renewFlowState.phone}
                        onChange={(e) => setRenewFlowState((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </FormControl>
                    <HStack>
                      <Switch
                        isChecked={renewFlowState.sendEmail}
                        onChange={(e) => setRenewFlowState((p) => ({ ...p, sendEmail: e.target.checked }))}
                      />
                      <Text fontSize="sm">Envoyer par email</Text>
                      <Switch
                        isChecked={renewFlowState.sendSMS}
                        onChange={(e) => setRenewFlowState((p) => ({ ...p, sendSMS: e.target.checked }))}
                      />
                      <Text fontSize="sm">Envoyer par SMS</Text>
                    </HStack>
                    <Button colorScheme="blue" onClick={handleRenewAdhesion} isLoading={bulletinBusy}>
                      Lancer le parcours de renouvellement
                    </Button>
                    {renewFlowState.generatedLink && (
                      <Box p={3} borderWidth={1} borderRadius="md" bg="gray.50">
                        <Text fontSize="xs" color="gray.700">Lien généré:</Text>
                        <Text fontSize="xs" wordBreak="break-all">{renewFlowState.generatedLink}</Text>
                      </Box>
                    )}
                  </VStack>
                </TabPanel>

                <TabPanel px={0} pt={4}>
                  <VStack spacing={4} align="stretch">
                    <Alert status="info"><AlertIcon />Renvoie automatiquement le dernier bulletin signé trouvé pour cet adhérent.</Alert>
                    <FormControl>
                      <FormLabel>Email destinataire</FormLabel>
                      <Input
                        type="email"
                        value={resendState.recipientEmail}
                        onChange={(e) => setResendState({ recipientEmail: e.target.value })}
                      />
                    </FormControl>
                    <Button colorScheme="green" onClick={handleResendSignedBulletin} isLoading={bulletinBusy}>
                      Renvoyer le bulletin signé
                    </Button>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onBulletinClose}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}