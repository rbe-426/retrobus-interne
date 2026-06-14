import React, { useEffect, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Tag,
  TagLabel,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiPlus,
  FiSave,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import PageLayout from '../components/Layout/PageLayout';
import { useUser } from '../context/UserContext';
import * as teamService from '../services/teamService';

const BADGE_COLORS = [
  { value: 'red', label: 'Rouge' },
  { value: 'orange', label: 'Orange' },
  { value: 'yellow', label: 'Jaune' },
  { value: 'green', label: 'Vert' },
  { value: 'teal', label: 'Turquoise' },
  { value: 'blue', label: 'Bleu' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'purple', label: 'Violet' },
  { value: 'pink', label: 'Rose' },
  { value: 'gray', label: 'Gris' },
];

const TAG_COLORS = [
  { value: 'blue', label: 'Bleu' },
  { value: 'purple', label: 'Violet' },
  { value: 'teal', label: 'Turquoise' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'pink', label: 'Rose' },
  { value: 'orange', label: 'Orange' },
  { value: 'green', label: 'Vert' },
];

const DEFAULT_MEMBERS = [
  {
    id: 1,
    name: 'Waiyl Belaidi',
    role: "President de l'association",
    roleColor: 'red',
    hierarchy: 1, // Présidence
    joinDate: 'Mars 2025',
    memberType: 'Membre fondateur',
    catchphrase: "RBE c'est surtout une famille de mordus d'automobile",
    image: 'https://via.placeholder.com/150?text=WB',
    email: 'w.belaidi@retrobus-essonne.fr',
    phone: '+33 6 XX XX XX XX',
    expertise: [
      { label: 'SAEIV', color: 'blue' },
      { label: 'Medias', color: 'blue' },
      { label: 'Technique', color: 'blue' },
    ],
  },
  {
    id: 2,
    name: 'Methusan Ravichandran',
    role: 'Vice-President',
    roleColor: 'orange',
    hierarchy: 1, // Présidence
    joinDate: 'Mars 2025',
    memberType: 'Membre fondateur',
    catchphrase: "RBE c'est surtout une famille de mordus d'automobile",
    image: 'https://via.placeholder.com/150?text=MR',
    email: 'm.ravichandran@retrobus-essonne.fr',
    phone: '+33 6 XX XX XX XX',
    expertise: [
      { label: 'Medias', color: 'purple' },
      { label: 'Formations', color: 'purple' },
    ],
  },
  {
    id: 5,
    name: 'Jaffer Camaroudine',
    role: "Conseil d'Administration",
    roleColor: 'blue',
    hierarchy: 2, // Conseil
    joinDate: 'Mars 2025',
    memberType: 'Membre fondateur',
    catchphrase: "Preserver les vehicules que je voyais rouler quand j'etais enfant",
    image: '/assets/team/jaffer-camaroudine.jpg',
    email: 'j.camaroudine@retrobus-essonne.fr',
    phone: '+33 6 XX XX XX XX',
    expertise: [
      { label: 'Conduite', color: 'cyan' },
      { label: 'Formations', color: 'cyan' },
      { label: 'Itineraires', color: 'cyan' },
    ],
  },
  {
    id: 3,
    name: 'Nour Bayoudh',
    role: 'Responsable Administration',
    roleColor: 'green',
    hierarchy: 3, // Services
    joinDate: '2026',
    memberType: 'Membre',
    catchphrase: 'Une bonne organisation est la cle de nos succes',
    image: 'https://via.placeholder.com/150?text=NB',
    email: 'n.bayoudh@retrobus-essonne.fr',
    phone: '+33 6 XX XX XX XX',
    expertise: [
      { label: 'Admin', color: 'teal' },
      { label: 'Organisation', color: 'teal' },
      { label: 'Gestion', color: 'teal' },
    ],
  },
  {
    id: 4,
    name: 'Jarina Amolotpavanathan',
    role: 'Service Juridique',
    roleColor: 'purple',
    hierarchy: 3, // Services
    joinDate: '2026',
    memberType: 'Membre',
    catchphrase: "Encadrer juridiquement nos actions pour proteger l'association",
    image: 'https://via.placeholder.com/150?text=JA',
    email: 'j.amolotpavanathan@retrobus-essonne.fr',
    phone: '+33 6 XX XX XX XX',
    expertise: [
      { label: 'Droit', color: 'pink' },
      { label: 'Conformite', color: 'pink' },
      { label: 'Contrats', color: 'pink' },
    ],
  },
];

export default function TeamRBE() {
  const { isAdmin } = useUser();
  const toast = useToast();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const members = await teamService.getAllTeamMembers(false); // false = mode interne (avec contacts)
      setTeamMembers(members);
    } catch (error) {
      console.error('Erreur chargement équipe:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'équipe',
        status: 'error',
        duration: 3000
      });
      setTeamMembers(DEFAULT_MEMBERS);
    } finally {
      setLoading(false);
    }
  };



  const handleStartEdit = (member) => {
    setEditingId(member.id);
    setFormData({ ...member, expertise: member.expertise || [] });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleSaveEdit = async (memberId) => {
    try {
      await teamService.updateTeamMember(memberId, formData);
      await loadTeamMembers();
      setEditingId(null);
      setFormData({});
      toast({ title: 'Membre mis à jour', status: 'success', duration: 2000 });
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({ title: 'Erreur', description: error.message, status: 'error', duration: 3000 });
    }
  };

  const handleAddNew = async () => {
    try {
      const newMember = {
        name: 'Nouveau membre',
        role: 'Role',
        roleColor: 'blue',
        hierarchy: 4,
        joinDate: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        memberType: 'Membre',
        catchphrase: 'Citation...',
        image: '',
        email: '',
        phone: '',
        expertise: []
      };
      const created = await teamService.createTeamMember(newMember);
      await loadTeamMembers();
      handleStartEdit(created);
      toast({ title: 'Membre créé', status: 'success', duration: 2000 });
    } catch (error) {
      console.error('Erreur création:', error);
      toast({ title: 'Erreur', description: error.message, status: 'error', duration: 3000 });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce membre ?')) {
      try {
        await teamService.deleteTeamMember(id);
        await loadTeamMembers();
        toast({ title: 'Membre supprimé', status: 'success', duration: 2000 });
      } catch (error) {
        console.error('Erreur suppression:', error);
        toast({ title: 'Erreur', description: error.message, status: 'error', duration: 3000 });
      }
    }
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;
    try {
      const reordered = teamMembers.map((m, idx) => ({
        id: m.id,
        order: idx === index ? index - 1 : idx === index - 1 ? index : m.order
      }));
      await teamService.reorderTeamMembers(reordered);
      await loadTeamMembers();
    } catch (error) {
      console.error('Erreur réordonnancement:', error);
      toast({ title: 'Erreur', description: error.message, status: 'error' });
    }
  };

  const handleMoveDown = async (index) => {
    if (index === teamMembers.length - 1) return;
    try {
      const reordered = teamMembers.map((m, idx) => ({
        id: m.id,
        order: idx === index ? index + 1 : idx === index + 1 ? index : m.order
      }));
      await teamService.reorderTeamMembers(reordered);
      await loadTeamMembers();
    } catch (error) {
      console.error('Erreur réordonnancement:', error);
      toast({ title: 'Erreur', description: error.message, status: 'error' });
    }
  };

  const handleAddExpertise = () => {
    setFormData((prev) => ({ ...prev, expertise: [...(prev.expertise || []), { label: '', color: 'blue' }] }));
  };

  const handleUpdateExpertise = (index, field, value) => {
    const updated = [...(formData.expertise || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, expertise: updated }));
  };

  const handleRemoveExpertise = (index) => {
    setFormData((prev) => ({ ...prev, expertise: (prev.expertise || []).filter((_, i) => i !== index) }));
  };

  // Grouper les membres par hiérarchie
  const groupedMembers = React.useMemo(() => {
    const groups = {
      1: { title: 'Présidence', members: [], color: 'red' },
      2: { title: 'Conseil d\'Administration', members: [], color: 'blue' },
      3: { title: 'Services & Responsables', members: [], color: 'green' },
      4: { title: 'Membres', members: [], color: 'gray' },
    };

    teamMembers.forEach(member => {
      const hierarchy = member.hierarchy || 4;
      if (groups[hierarchy]) {
        groups[hierarchy].members.push(member);
      }
    });

    return Object.values(groups).filter(g => g.members.length > 0);
  }, [teamMembers]);

  // Header Actions pour Admin
  const headerActions = isAdmin && (
    <HStack spacing={3}>
      {editMode && (
        <Button leftIcon={<FiPlus />} colorScheme="green" size="md" onClick={handleAddNew}>
          Ajouter un membre
        </Button>
      )}
      <Button
        leftIcon={editMode ? <FiCheck /> : <FiEdit2 />}
        colorScheme={editMode ? 'green' : 'rbe'}
        size="md"
        onClick={() => {
          if (editMode) {
            setEditingId(null);
            setFormData({});
          }
          setEditMode((v) => !v);
        }}
      >
        {editMode ? 'Terminer' : "Modifier l'equipe"}
      </Button>
    </HStack>
  );

  return (
    <PageLayout
      title="Team RBE"
      subtitle="Les passionnés qui font vivre l'association"
      headerVariant="card"
      bgGradient="linear(to-r, rbe.600, rbe.800)"
      titleSize="lg"
      titleWeight="700"
      headerActions={headerActions}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/home" },
        { label: "Team RBE", href: "/dashboard/team-rbe" }
      ]}
    >
      <VStack spacing={8} align="stretch">
        {editMode && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Mode edition active</AlertTitle>
              <AlertDescription>Cliquez sur une carte pour modifier les informations.</AlertDescription>
            </Box>
          </Alert>
        )}

        {loading ? (
          <Text textAlign="center" color="gray.500">Chargement...</Text>
        ) : (
          <VStack spacing={8} align="stretch">
            {/* Liste hiérarchique par groupe */}
            {groupedMembers.map((group, groupIndex) => (
              <Box key={groupIndex}>
                <HStack mb={4} spacing={3}>
                  <Badge colorScheme={group.color} fontSize="md" px={4} py={2} borderRadius="md">
                    {group.title}
                  </Badge>
                  <Divider />
                </HStack>

                <Table variant="simple" size="md">
                  <Thead>
                    <Tr bg={useColorModeValue('gray.50', 'gray.700')}>
                      <Th width="25%">Nom</Th>
                      <Th width="25%">Fonction</Th>
                      <Th width="20%">Contact</Th>
                      <Th width="20%">Expertises</Th>
                      {editMode && <Th width="10%">Actions</Th>}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {group.members.map((member, memberIndex) => {
                      const globalIndex = teamMembers.findIndex(m => m.id === member.id);
                      const isEditing = editingId === member.id;

                      if (isEditing) {
                        return (
                          <Tr key={member.id} bg={useColorModeValue('blue.50', 'blue.900')}>
                            <Td colSpan={editMode ? 5 : 4}>
                              <VStack spacing={3} align="stretch" p={4}>
                                <HStack spacing={4}>
                                  <FormControl flex={1}>
                                    <FormLabel fontSize="xs">Nom</FormLabel>
                                    <Input size="sm" value={formData.name || ''} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
                                  </FormControl>
                                  <FormControl flex={1}>
                                    <FormLabel fontSize="xs">Fonction</FormLabel>
                                    <Input size="sm" value={formData.role || ''} onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))} />
                                  </FormControl>
                                  <FormControl w="150px">
                                    <FormLabel fontSize="xs">Hiérarchie</FormLabel>
                                    <Select size="sm" value={formData.hierarchy || 4} onChange={(e) => setFormData((p) => ({ ...p, hierarchy: parseInt(e.target.value) }))}>
                                      <option value={1}>Présidence</option>
                                      <option value={2}>Conseil</option>
                                      <option value={3}>Services</option>
                                      <option value={4}>Membres</option>
                                    </Select>
                                  </FormControl>
                                </HStack>

                                <HStack spacing={4}>
                                  <FormControl flex={1}>
                                    <FormLabel fontSize="xs">Email</FormLabel>
                                    <Input size="sm" type="email" value={formData.email || ''} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
                                  </FormControl>
                                  <FormControl flex={1}>
                                    <FormLabel fontSize="xs">Téléphone</FormLabel>
                                    <Input size="sm" type="tel" value={formData.phone || ''} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
                                  </FormControl>
                                </HStack>

                                <FormControl>
                                  <FormLabel fontSize="xs">Citation</FormLabel>
                                  <Textarea size="sm" rows={2} value={formData.catchphrase || ''} onChange={(e) => setFormData((p) => ({ ...p, catchphrase: e.target.value }))} />
                                </FormControl>

                                <FormControl>
                                  <FormLabel fontSize="xs">Expertises</FormLabel>
                                  <VStack spacing={2} align="stretch">
                                    {(formData.expertise || []).map((exp, idx) => (
                                      <HStack key={idx} spacing={2}>
                                        <Input size="xs" value={exp.label} onChange={(e) => handleUpdateExpertise(idx, 'label', e.target.value)} placeholder="Label" />
                                        <Select size="xs" value={exp.color} onChange={(e) => handleUpdateExpertise(idx, 'color', e.target.value)} w="110px">
                                          {TAG_COLORS.map((color) => (
                                            <option key={color.value} value={color.value}>{color.label}</option>
                                          ))}
                                        </Select>
                                        <IconButton icon={<FiX />} size="xs" colorScheme="red" onClick={() => handleRemoveExpertise(idx)} aria-label="Retirer" />
                                      </HStack>
                                    ))}
                                    <Button leftIcon={<FiPlus />} size="xs" variant="outline" onClick={handleAddExpertise}>
                                      Ajouter expertise
                                    </Button>
                                  </VStack>
                                </FormControl>

                                <HStack spacing={2} pt={2}>
                                  <Button leftIcon={<FiSave />} colorScheme="green" size="sm" onClick={() => handleSaveEdit(member.id)}>
                                    Enregistrer
                                  </Button>
                                  <Button leftIcon={<FiX />} variant="ghost" size="sm" onClick={handleCancelEdit}>
                                    Annuler
                                  </Button>
                                </HStack>
                              </VStack>
                            </Td>
                          </Tr>
                        );
                      }

                      return (
                        <Tr key={member.id} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}>
                          <Td>
                            <HStack spacing={3}>
                              <Avatar size="sm" name={member.name} src={member.image} />
                              <Box>
                                <Text fontWeight="600">{member.name}</Text>
                                <Text fontSize="xs" color="gray.500">{member.memberType}</Text>
                              </Box>
                            </HStack>
                          </Td>
                          <Td>
                            <Badge colorScheme={member.roleColor || 'gray'} fontSize="xs">
                              {member.role}
                            </Badge>
                          </Td>
                          <Td>
                            <VStack align="start" spacing={1}>
                              {member.email && (
                                <Text fontSize="xs" color="blue.600" fontWeight="500">
                                  {member.email}
                                </Text>
                              )}
                              {member.phone && (
                                <Text fontSize="xs" color="gray.600">
                                  {member.phone}
                                </Text>
                              )}
                            </VStack>
                          </Td>
                          <Td>
                            <HStack spacing={1} flexWrap="wrap">
                              {member.expertise?.map((exp, idx) => (
                                <Tag key={idx} size="sm" colorScheme={exp.color || 'blue'}>
                                  <TagLabel>{exp.label}</TagLabel>
                                </Tag>
                              ))}
                            </HStack>
                          </Td>
                          {editMode && (
                            <Td>
                              <HStack spacing={1}>
                                <IconButton
                                  icon={<FiEdit2 />}
                                  size="xs"
                                  colorScheme="blue"
                                  aria-label="Editer"
                                  onClick={() => handleStartEdit(member)}
                                />
                                <IconButton
                                  icon={<FiChevronUp />}
                                  size="xs"
                                  aria-label="Monter"
                                  onClick={() => handleMoveUp(globalIndex)}
                                  isDisabled={globalIndex === 0}
                                  variant="ghost"
                                />
                                <IconButton
                                  icon={<FiChevronDown />}
                                  size="xs"
                                  aria-label="Descendre"
                                  onClick={() => handleMoveDown(globalIndex)}
                                  isDisabled={globalIndex === teamMembers.length - 1}
                                  variant="ghost"
                                />
                                <IconButton
                                  icon={<FiTrash2 />}
                                  size="xs"
                                  colorScheme="red"
                                  aria-label="Supprimer"
                                  onClick={() => handleDelete(member.id)}
                                />
                              </HStack>
                            </Td>
                          )}
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    </PageLayout>
  );
}
