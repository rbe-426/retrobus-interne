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
  Card,
  CardBody,
  Container,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Spacer,
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
import SidebarLayout from '../components/SidebarLayout';
import { useUser } from '../context/UserContext';

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
    joinDate: 'Mars 2025',
    memberType: 'Membre fondateur',
    catchphrase: "RBE c'est surtout une famille de mordus d'automobile",
    image: 'https://via.placeholder.com/150?text=WB',
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
    joinDate: 'Mars 2025',
    memberType: 'Membre fondateur',
    catchphrase: "RBE c'est surtout une famille de mordus d'automobile",
    image: 'https://via.placeholder.com/150?text=MR',
    expertise: [
      { label: 'Medias', color: 'purple' },
      { label: 'Formations', color: 'purple' },
    ],
  },
  {
    id: 3,
    name: 'Nour Bayoudh',
    role: 'Responsable Administration',
    roleColor: 'green',
    joinDate: '2026',
    memberType: 'Membre',
    catchphrase: 'Une bonne organisation est la cle de nos succes',
    image: 'https://via.placeholder.com/150?text=NB',
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
    joinDate: '2026',
    memberType: 'Membre',
    catchphrase: "Encadrer juridiquement nos actions pour proteger l'association",
    image: 'https://via.placeholder.com/150?text=JA',
    expertise: [
      { label: 'Droit', color: 'pink' },
      { label: 'Conformite', color: 'pink' },
      { label: 'Contrats', color: 'pink' },
    ],
  },
  {
    id: 5,
    name: 'Jaffer Camaroudine',
    role: "Conseil d'Administration",
    roleColor: 'blue',
    joinDate: 'Mars 2025',
    memberType: 'Membre fondateur',
    catchphrase: "Preserver les vehicules que je voyais rouler quand j'etais enfant",
    image: '/assets/team/jaffer-camaroudine.jpg',
    expertise: [
      { label: 'Conduite', color: 'cyan' },
      { label: 'Formations', color: 'cyan' },
      { label: 'Itineraires', color: 'cyan' },
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

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const bgGradient = useColorModeValue('linear(to-b, rbe.50, white)', 'linear(to-b, gray.900, gray.800)');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rbe:team-members');
      if (stored) {
        setTeamMembers(JSON.parse(stored));
      } else {
        setTeamMembers(DEFAULT_MEMBERS);
        localStorage.setItem('rbe:team-members', JSON.stringify(DEFAULT_MEMBERS));
      }
    } catch (error) {
      console.error('Erreur chargement equipe:', error);
      setTeamMembers(DEFAULT_MEMBERS);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTeamMembers = (members) => {
    localStorage.setItem('rbe:team-members', JSON.stringify(members));
    setTeamMembers(members);
  };

  const handleStartEdit = (member) => {
    setEditingId(member.id);
    setFormData({ ...member, expertise: member.expertise || [] });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleSaveEdit = (memberId) => {
    const updated = teamMembers.map((m) => (m.id === memberId ? { ...m, ...formData } : m));
    saveTeamMembers(updated);
    setEditingId(null);
    setFormData({});
    toast({ title: 'Membre mis a jour', status: 'success', duration: 2000 });
  };

  const handleAddNew = () => {
    const newMember = {
      id: Date.now(),
      name: 'Nouveau membre',
      role: 'Role',
      roleColor: 'blue',
      image: '',
      catchphrase: 'Citation...',
      expertise: [],
      joinDate: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      memberType: 'Membre',
    };
    saveTeamMembers([...teamMembers, newMember]);
    handleStartEdit(newMember);
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer ce membre ?')) {
      saveTeamMembers(teamMembers.filter((m) => m.id !== id));
    }
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const next = [...teamMembers];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    saveTeamMembers(next);
  };

  const handleMoveDown = (index) => {
    if (index === teamMembers.length - 1) return;
    const next = [...teamMembers];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    saveTeamMembers(next);
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

  return (
    <SidebarLayout>
      <Box bgGradient={bgGradient} minH="100vh" py={8}>
        <Container maxW="container.xl">
          <VStack spacing={8} align="stretch">
            <Flex align="center" flexWrap="wrap" gap={4}>
              <VStack align="start" spacing={1} flex={1}>
                <Heading size="xl" color="rbe.500">Team RBE</Heading>
                <Text color="gray.600" fontSize="lg">Les passionnes qui font vivre l'association</Text>
              </VStack>
              <Spacer />
              {isAdmin && (
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
              )}
            </Flex>

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
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {teamMembers.map((member, index) => {
                  const isEditing = editingId === member.id;

                  return (
                    <Card
                      key={member.id}
                      bg={cardBg}
                      border="2px solid"
                      borderColor={isEditing ? 'rbe.500' : borderColor}
                      shadow={isEditing ? 'xl' : 'sm'}
                      _hover={{ shadow: 'md', transform: 'translateY(-2px)', transition: 'all 0.2s' }}
                    >
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          {editMode && !isEditing && (
                            <HStack justify="space-between">
                              <HStack spacing={1}>
                                <IconButton
                                  icon={<FiChevronUp />}
                                  size="sm"
                                  aria-label="Monter"
                                  onClick={() => handleMoveUp(index)}
                                  isDisabled={index === 0}
                                  colorScheme="gray"
                                  variant="ghost"
                                />
                                <IconButton
                                  icon={<FiChevronDown />}
                                  size="sm"
                                  aria-label="Descendre"
                                  onClick={() => handleMoveDown(index)}
                                  isDisabled={index === teamMembers.length - 1}
                                  colorScheme="gray"
                                  variant="ghost"
                                />
                              </HStack>
                              <HStack spacing={1}>
                                <IconButton
                                  icon={<FiEdit2 />}
                                  size="sm"
                                  colorScheme="blue"
                                  aria-label="Editer"
                                  onClick={() => handleStartEdit(member)}
                                />
                                <IconButton
                                  icon={<FiTrash2 />}
                                  size="sm"
                                  colorScheme="red"
                                  aria-label="Supprimer"
                                  onClick={() => handleDelete(member.id)}
                                />
                              </HStack>
                            </HStack>
                          )}

                          {isEditing ? (
                            <VStack spacing={3} align="stretch">
                              <FormControl>
                                <FormLabel fontSize="xs">Nom</FormLabel>
                                <Input size="sm" value={formData.name || ''} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
                              </FormControl>
                              <FormControl>
                                <FormLabel fontSize="xs">Role</FormLabel>
                                <Input size="sm" value={formData.role || ''} onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))} />
                              </FormControl>
                              <FormControl>
                                <FormLabel fontSize="xs">Couleur badge</FormLabel>
                                <Select size="sm" value={formData.roleColor || 'blue'} onChange={(e) => setFormData((p) => ({ ...p, roleColor: e.target.value }))}>
                                  {BADGE_COLORS.map((color) => (
                                    <option key={color.value} value={color.value}>{color.label}</option>
                                  ))}
                                </Select>
                              </FormControl>
                              <FormControl>
                                <FormLabel fontSize="xs">URL photo</FormLabel>
                                <Input size="sm" value={formData.image || ''} onChange={(e) => setFormData((p) => ({ ...p, image: e.target.value }))} />
                              </FormControl>
                              <FormControl>
                                <FormLabel fontSize="xs">Citation</FormLabel>
                                <Textarea size="sm" rows={2} value={formData.catchphrase || ''} onChange={(e) => setFormData((p) => ({ ...p, catchphrase: e.target.value }))} />
                              </FormControl>

                              <Divider />

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
                                <Button leftIcon={<FiSave />} colorScheme="green" size="sm" flex={1} onClick={() => handleSaveEdit(member.id)}>
                                  Enregistrer
                                </Button>
                                <Button leftIcon={<FiX />} variant="ghost" size="sm" onClick={handleCancelEdit}>
                                  Annuler
                                </Button>
                              </HStack>
                            </VStack>
                          ) : (
                            <VStack spacing={4} align="center">
                              <Avatar size="xl" name={member.name} src={member.image} bg={`${member.roleColor || 'rbe'}.500`} />
                              <VStack spacing={1} textAlign="center" w="full">
                                <Heading size="md">{member.name}</Heading>
                                <Badge colorScheme={member.roleColor || 'red'} fontSize="sm" px={3} py={1} borderRadius="full">
                                  {member.role}
                                </Badge>
                                {member.expertise?.length > 0 && (
                                  <HStack spacing={2} flexWrap="wrap" justify="center" mt={2} pt={2}>
                                    {member.expertise.map((exp, idx) => (
                                      <Tag key={idx} size="sm" colorScheme={exp.color || 'blue'}>
                                        <TagLabel>{exp.label}</TagLabel>
                                      </Tag>
                                    ))}
                                  </HStack>
                                )}
                              </VStack>
                              {member.catchphrase && (
                                <Text fontSize="sm" color="gray.600" fontStyle="italic" textAlign="center">
                                  "{member.catchphrase}"
                                </Text>
                              )}
                            </VStack>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>
                  );
                })}
              </SimpleGrid>
            )}
          </VStack>
        </Container>
      </Box>
    </SidebarLayout>
  );
}
