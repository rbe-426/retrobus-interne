import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, VStack, HStack, Button, Flex, useToast, Text, Spinner,
  useDisclosure, SimpleGrid, Card, CardBody, CardHeader,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, FormControl, FormLabel, Input, Select,
  Textarea, Switch, Badge, IconButton, Menu, MenuButton, MenuList,
  MenuItem, Alert, AlertIcon, Tabs, TabList, TabPanels, Tab, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, InputGroup, InputLeftElement,
  useColorModeValue, Container, Heading, Divider, Code, useClipboard,
  Tooltip, Progress, CheckboxGroup, Checkbox, Stat, StatLabel, StatNumber
} from "@chakra-ui/react";
import {
  FiUsers, FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiMail,
  FiKey, FiShield, FiActivity, FiRefreshCw, FiSettings, FiLock,
  FiUnlock, FiRotateCcw, FiLogIn, FiAlertCircle, FiUserPlus,
  FiArrowRight, FiCheck, FiX, FiCopy, FiClock, FiUserCheck
} from 'react-icons/fi';
import WorkspaceLayout from '../components/Layout/WorkspaceLayout';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const apiUrl = (p) => apiBase ? `${apiBase}${p}` : p;

// ============================================================================
// CONFIGURATIONS
// ============================================================================

const ACCOUNT_TYPES = {
  ADMIN: { label: 'Administrateur', color: 'red', description: 'Accès complet à l\'application' },
  DRIVER: { label: 'Conducteur', color: 'green', description: 'Peut conduire les véhicules' },
  MEMBER: { label: 'Adhérent', color: 'blue', description: 'Accès aux fonctions membres' },
  BUREAU: { label: 'Bureau', color: 'purple', description: 'Membre du bureau' }
};

const ACCOUNT_STATUS = {
  ACTIVE: { label: '✅ Accès activé', color: 'green', icon: FiCheck },
  PENDING: { label: '⏳ En attente', color: 'yellow', icon: FiClock },
  DISABLED: { label: '🚫 Accès désactivé', color: 'red', icon: FiX },
  PASSWORD_RESET: { label: '⚠️ MDP à changer', color: 'orange', icon: FiAlertCircle }
};

const PASSWORD_STATUS = {
  PERMANENT: { label: 'Permanent', color: 'green', icon: FiCheck },
  TEMPORARY: { label: 'Temporaire', color: 'orange', icon: FiAlertCircle },
  NEEDS_RESET: { label: 'À réinitialiser', color: 'red', icon: FiKey }
};

// ============================================================================
// COMPOSANTS
// ============================================================================

function AccountCard({ account, onEdit, onResetPassword, onToggleAccess, onLinkMember, onDelete }) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const accountType = ACCOUNT_TYPES[account.role] || ACCOUNT_TYPES.MEMBER;
  const accountStatus = ACCOUNT_STATUS[account.status] || ACCOUNT_STATUS.PENDING;
  const passwordStatus = PASSWORD_STATUS[account.passwordStatus] || PASSWORD_STATUS.TEMPORARY;

  const lastLoginDate = account.lastLoginAt 
    ? new Date(account.lastLoginAt).toLocaleDateString('fr-FR')
    : 'Jamais';

  return (
    <Card bg={cardBg} borderWidth={1} borderColor="gray.200" borderLeftWidth={4} borderLeftColor={accountType.color}>
      <CardHeader pb={2}>
        <Flex justify="space-between" align="start">
          <VStack align="start" spacing={1} flex={1}>
            <HStack>
              <Text fontWeight="bold" fontSize="md">
                {account.firstName} {account.lastName}
              </Text>
              <Badge colorScheme={accountType.color} size="sm">
                {accountType.label}
              </Badge>
              <Badge colorScheme={accountStatus.color} size="sm">
                {accountStatus.label}
              </Badge>
            </HStack>

            <Text fontSize="sm" color="gray.600">
              📧 {account.email}
            </Text>

            {account.linkedMemberId && (
              <HStack spacing={1}>
                <Badge colorScheme="teal" variant="subtle" size="sm">
                  🔗 Lié à member
                </Badge>
                {account.linkedMemberName && (
                  <Text fontSize="xs" color="gray.500">
                    ({account.linkedMemberName})
                  </Text>
                )}
              </HStack>
            )}

            <HStack spacing={2} fontSize="xs" color="gray.500">
              <Text>
                🔑 {passwordStatus.label}
              </Text>
              <Text>•</Text>
              <Text>
                Dernière connexion: {lastLoginDate}
              </Text>
            </HStack>
          </VStack>

          <Menu>
            <MenuButton as={IconButton} icon={<FiSettings />} variant="ghost" size="sm" />
            <MenuList>
              <MenuItem icon={<FiEdit />} onClick={() => onEdit(account)}>
                Modifier les infos
              </MenuItem>

              <MenuItem
                icon={account.status === 'ACTIVE' ? <FiLock /> : <FiUnlock />}
                onClick={() => onToggleAccess(account)}
                color={account.status === 'ACTIVE' ? 'orange.500' : 'green.500'}
              >
                {account.status === 'ACTIVE' ? 'Désactiver l\'accès' : 'Activer l\'accès'}
              </MenuItem>

              <MenuItem icon={<FiRotateCcw />} onClick={() => onResetPassword(account)}>
                Réinitialiser le MDP
              </MenuItem>

              {!account.linkedMemberId && (
                <MenuItem icon={<FiUserCheck />} onClick={() => onLinkMember(account)}>
                  Lier à un adhérent
                </MenuItem>
              )}

              {account.membershipStatus === 'CANCELLED' && (
                <MenuItem icon={<FiTrash2 />} onClick={() => onDelete(account)} color="red.600">
                  Supprimer le compte
                </MenuItem>
              )}
            </MenuList>
          </Menu>
        </Flex>
      </CardHeader>

      {account.mustChangePassword && (
        <CardBody pt={0}>
          <Alert status="warning" borderRadius="md" fontSize="sm">
            <AlertIcon />
            Cet utilisateur doit changer son mot de passe à la prochaine connexion
          </Alert>
        </CardBody>
      )}
    </Card>
  );
}

// ============================================================================
// MODAL : CRÉER/MODIFIER COMPTE
// ============================================================================

function EditAccountModal({ isOpen, onClose, account, onSave }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'MEMBER',
    hasInternalAccess: true,
    hasExternalAccess: false,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (account) {
      setFormData({
        firstName: account.firstName || '',
        lastName: account.lastName || '',
        email: account.email || '',
        role: account.role || 'MEMBER',
        hasInternalAccess: account.hasInternalAccess !== false,
        hasExternalAccess: account.hasExternalAccess || false,
        notes: account.notes || ''
      });
    }
  }, [account, isOpen]);

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs requis',
        status: 'error',
        duration: 3000
      });
      return;
    }

    setLoading(true);
    try {
      const method = account ? 'PUT' : 'POST';
      const url = account
        ? apiUrl(`/api/admin/users/${account.id}`)
        : apiUrl(`/api/admin/users`);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: 'Succès',
          description: account ? 'Compte modifié' : 'Compte créé',
          status: 'success',
          duration: 3000
        });
        onClose();
        onSave();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {account ? 'Modifier le compte' : 'Créer un nouveau compte'}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Prénom</FormLabel>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Jean"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Nom</FormLabel>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Dupont"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jean@example.com"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Type de compte</FormLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                {Object.entries(ACCOUNT_TYPES).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label} - {config.description}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Accès</FormLabel>
              <VStack align="start" spacing={2}>
                <HStack>
                  <Checkbox
                    isChecked={formData.hasInternalAccess}
                    onChange={(e) => setFormData({ ...formData, hasInternalAccess: e.target.checked })}
                  />
                  <Text fontSize="sm">Accès interne (Intranet)</Text>
                </HStack>
                <HStack>
                  <Checkbox
                    isChecked={formData.hasExternalAccess}
                    onChange={(e) => setFormData({ ...formData, hasExternalAccess: e.target.checked })}
                  />
                  <Text fontSize="sm">Accès externe (Site public)</Text>
                </HStack>
              </VStack>
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes optionnelles..."
                size="sm"
                rows={3}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={loading}>
              Sauvegarder
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ============================================================================
// MODAL : RÉINITIALISER MDP
// ============================================================================

function ResetPasswordModal({ isOpen, onClose, account, onSuccess }) {
  const [tempPassword, setTempPassword] = useState('');
  const [passwordType, setPasswordType] = useState('TEMPORARY');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { value: copied, onCopy } = useClipboard(tempPassword);

  const handleReset = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/admin/users/${account.id}/reset-password`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          passwordType // 'TEMPORARY' ou 'PERMANENT_RESET'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTempPassword(data.temporaryPassword || '');
        toast({
          title: 'Succès',
          description: 'Mot de passe réinitialisé',
          status: 'success',
          duration: 3000
        });
        onSuccess();
      } else {
        throw new Error('Erreur lors de la réinitialisation');
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Réinitialiser le mot de passe</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4}>
            <Alert status="info">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">Réinitialiser pour {account?.firstName} {account?.lastName}</Text>
                <Text fontSize="sm">Une réinitialisation génère un nouveau mot de passe temporaire</Text>
              </Box>
            </Alert>

            <FormControl>
              <FormLabel>Type de mot de passe</FormLabel>
              <Select
                value={passwordType}
                onChange={(e) => setPasswordType(e.target.value)}
              >
                <option value="TEMPORARY">
                  Temporaire (forcera changement à la prochaine connexion)
                </option>
                <option value="PERMANENT_RESET">
                  Permanent (l'utilisateur peut se connecter directement)
                </option>
              </Select>
            </FormControl>

            {tempPassword && (
              <Box
                bg="gray.50"
                p={4}
                borderRadius="md"
                borderLeft="4px solid"
                borderLeftColor="green.500"
                width="full"
              >
                <Text fontSize="sm" fontWeight="bold" mb={2}>
                  Nouveau mot de passe généré:
                </Text>
                <HStack>
                  <Code colorScheme="green" p={2} borderRadius="md" flex={1}>
                    {tempPassword}
                  </Code>
                  <Tooltip label={copied ? 'Copié !' : 'Copier'}>
                    <IconButton
                      icon={<FiCopy />}
                      onClick={onCopy}
                      size="sm"
                      variant="ghost"
                    />
                  </Tooltip>
                </HStack>
                <Text fontSize="xs" color="gray.600" mt={2}>
                  ⚠️ Communiquez ce mot de passe à l'utilisateur de manière sécurisée
                </Text>
              </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Fermer
            </Button>
            {!tempPassword && (
              <Button colorScheme="red" onClick={handleReset} isLoading={loading}>
                Générer un nouveau MDP
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ============================================================================
// MODAL : LIER À UN ADHÉRENT
// ============================================================================

function LinkMemberModal({ isOpen, onClose, account, onSuccess }) {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  const loadMembers = useCallback(async () => {
    setSearching(true);
    try {
      const response = await fetch(apiUrl(`/api/members?search=${searchQuery}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(Array.isArray(data) ? data : data.members || []);
      }
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen && searchQuery) {
      loadMembers();
    }
  }, [isOpen, searchQuery, loadMembers]);

  const handleLink = async () => {
    if (!selectedMember) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un adhérent',
        status: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/admin/users/${account.id}/link-member`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ memberId: selectedMember.id })
      });

      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Adhérent lié au compte',
          status: 'success'
        });
        onClose();
        onSuccess();
      } else {
        throw new Error('Erreur lors de la liaison');
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Lier à un adhérent existant</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4}>
            <Alert status="info">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">Fusionner les systèmes</Text>
                <Text fontSize="sm">
                  Cela permettra à l'adhérent {account?.firstName} {account?.lastName} d'utiliser ce login
                </Text>
              </Box>
            </Alert>

            <FormControl>
              <FormLabel>Rechercher un adhérent</FormLabel>
              <Input
                placeholder="Nom, email ou matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </FormControl>

            {searching && (
              <Center py={8}>
                <Spinner />
              </Center>
            )}

            {members.length > 0 && (
              <Box width="full" maxH="300px" overflowY="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th></Th>
                      <Th>Nom</Th>
                      <Th>Email</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {members.map((member) => (
                      <Tr
                        key={member.id}
                        bg={selectedMember?.id === member.id ? 'blue.50' : undefined}
                        cursor="pointer"
                        onClick={() => setSelectedMember(member)}
                      >
                        <Td>
                          <Checkbox
                            isChecked={selectedMember?.id === member.id}
                            onChange={() => setSelectedMember(member)}
                          />
                        </Td>
                        <Td>{member.firstName} {member.lastName}</Td>
                        <Td fontSize="sm">{member.email}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}

            {searchQuery && members.length === 0 && !searching && (
              <Text color="gray.500" textAlign="center">
                Aucun adhérent trouvé
              </Text>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleLink} isLoading={loading}>
              Lier cet adhérent
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================

export default function AccountsManagement() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, needsPassword: 0 });
  const toast = useToast();

  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose
  } = useDisclosure();

  const {
    isOpen: isResetOpen,
    onOpen: onResetOpen,
    onClose: onResetClose
  } = useDisclosure();

  const {
    isOpen: isLinkOpen,
    onOpen: onLinkOpen,
    onClose: onLinkClose
  } = useDisclosure();

  const cardBg = useColorModeValue('white', 'gray.800');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/api/admin/users'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const accountsList = Array.isArray(data) ? data : (data.users || []);
        setAccounts(accountsList);

        // Calculer les stats
        setStats({
          total: accountsList.length,
          active: accountsList.filter(a => a.status === 'ACTIVE').length,
          inactive: accountsList.filter(a => a.status === 'DISABLED').length,
          needsPassword: accountsList.filter(a => a.mustChangePassword || a.isPasswordTemporary).length
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les comptes',
        status: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleCreateNew = () => {
    setSelectedAccount(null);
    onEditOpen();
  };

  const handleEdit = (account) => {
    setSelectedAccount(account);
    onEditOpen();
  };

  const handleResetPassword = (account) => {
    setSelectedAccount(account);
    onResetOpen();
  };

  const handleLinkMember = (account) => {
    setSelectedAccount(account);
    onLinkOpen();
  };

  const handleToggleAccess = async (account) => {
    try {
      const newStatus = account.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      const response = await fetch(apiUrl(`/api/admin/users/${account.id}/toggle-access`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast({
          title: 'Succès',
          description: `Accès ${newStatus === 'ACTIVE' ? 'activé' : 'désactivé'}`,
          status: 'success'
        });
        loadAccounts();
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la modification',
        status: 'error'
      });
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchSearch = 
      acc.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchRole = filterRole === 'ALL' || acc.role === filterRole;
    const matchStatus = filterStatus === 'ALL' || acc.status === filterStatus;

    return matchSearch && matchRole && matchStatus;
  });

  return (
    <WorkspaceLayout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          {/* HEADER */}
          <VStack align="start" spacing={4}>
            <HStack justify="space-between" width="full">
              <VStack align="start" spacing={1}>
                <Heading size="lg" display="flex" alignItems="center">
                  <FiShield style={{ marginRight: '12px' }} />
                  Gestion des Accès Utilisateurs
                </Heading>
                <Text color="gray.600">
                  Créez, gérez et liez les comptes administratifs et d'accès
                </Text>
              </VStack>
              <Button
                leftIcon={<FiPlus />}
                colorScheme="blue"
                onClick={handleCreateNew}
                size="lg"
              >
                Créer un nouveau compte
              </Button>
            </HStack>

            <Divider />
          </VStack>

          {/* STATISTIQUES */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Stat bg={cardBg} p={4} borderRadius="lg">
              <StatLabel>Comptes totaux</StatLabel>
              <StatNumber>{stats.total}</StatNumber>
            </Stat>
            <Stat bg={cardBg} p={4} borderRadius="lg">
              <StatLabel>Actifs</StatLabel>
              <StatNumber color="green.500">{stats.active}</StatNumber>
            </Stat>
            <Stat bg={cardBg} p={4} borderRadius="lg">
              <StatLabel>Inactifs</StatLabel>
              <StatNumber color="red.500">{stats.inactive}</StatNumber>
            </Stat>
            <Stat bg={cardBg} p={4} borderRadius="lg">
              <StatLabel>MDP à changer</StatLabel>
              <StatNumber color="orange.500">{stats.needsPassword}</StatNumber>
            </Stat>
          </SimpleGrid>

          {/* FILTRES */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4}>
                <Text fontWeight="bold" fontSize="sm">Filtres</Text>
                <HStack spacing={4} width="full">
                  <InputGroup flex={1}>
                    <InputLeftElement pointerEvents="none">
                      <FiSearch color="gray.300" />
                    </InputLeftElement>
                    <Input
                      placeholder="Rechercher par nom ou email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </InputGroup>

                  <Select
                    width="200px"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <option value="ALL">Tous les rôles</option>
                    {Object.entries(ACCOUNT_TYPES).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </Select>

                  <Select
                    width="200px"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="ALL">Tous les statuts</option>
                    {Object.entries(ACCOUNT_STATUS).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </Select>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* LISTE DES COMPTES */}
          {loading ? (
            <Center py={12}>
              <Spinner size="lg" />
            </Center>
          ) : filteredAccounts.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {filteredAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={handleEdit}
                  onResetPassword={handleResetPassword}
                  onToggleAccess={handleToggleAccess}
                  onLinkMember={handleLinkMember}
                  onDelete={() => {
                    // À implémenter si nécessaire
                  }}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Center py={12}>
              <VStack spacing={4}>
                <FiUsers size={48} color="gray" />
                <Text color="gray.500">Aucun compte ne correspond à vos critères</Text>
              </VStack>
            </Center>
          )}
        </VStack>
      </Container>

      {/* MODALES */}
      <EditAccountModal
        isOpen={isEditOpen}
        onClose={onEditClose}
        account={selectedAccount}
        onSave={loadAccounts}
      />

      <ResetPasswordModal
        isOpen={isResetOpen}
        onClose={onResetClose}
        account={selectedAccount}
        onSuccess={loadAccounts}
      />

      <LinkMemberModal
        isOpen={isLinkOpen}
        onClose={onLinkClose}
        account={selectedAccount}
        onSuccess={loadAccounts}
      />
    </WorkspaceLayout>
  );
}
