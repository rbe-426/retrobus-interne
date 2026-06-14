import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  Avatar,
  Badge,
  Tag,
  TagLabel,
  IconButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  SimpleGrid,
  Divider,
  useColorModeValue,
  Flex,
  Spacer
} from '@chakra-ui/react';
import {
  FiEdit2,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiPlus,
  FiSave,
  FiX,
  FiCheck
} from 'react-icons/fi';
import SidebarLayout from '../components/SidebarLayout';
import { useUser } from '../context/UserContext';

// Couleurs disponibles pour les badges (Trilogy)
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
  { value: 'gray', label: 'Gris' }
];

const TAG_COLORS = [
  { value: 'blue', label: 'Bleu' },
  { value: 'purple', label: 'Violet' },
  { value: 'teal', label: 'Turquoise' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'pink', label: 'Rose' },
  { value: 'orange', label: 'Orange' },
  { value: 'green', label: 'Vert' }
];

export default function TeamRBE() {
  const { user, isAdmin } = useUser();
  const toast = useToast();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const bgGradient = useColorModeValue(
    'linear(to-b, rbe.50, white)',
    'linear(to-b, gray.900, gray.800)'
  );

  // Charger les membres depuis localStorage
  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = () => {
    try {
      const stored = localStorage.getItem('rbe:team-members');
      if (stored) {
        setTeamMembers(JSON.parse(stored));
      } else {
        const defaultMembers = [
          {
            id: 1,
            name: \"Waiyl Belaidi\",
            role: \"Président de l'association\",
            roleColor: \"red\",
            joinDate: \"Mars 2025\",
            memberType: \"Membre fondateur\",
            catchphrase: \"RBE c'est surtout une famille de mordus d'automobile\",
            image: \"https://via.placeholder.com/150?text=WB\",
            expertise: [
              { label: \"SAEIV\", color: \"blue\" },
              { label: \"Médias\", color: \"blue\" },
              { label: \"Technique\", color: \"blue\" }
            ]
          },
          {
            id: 2,
            name: \"Méthusan Ravichandran\",
            role: \"Vice-Président\",
            roleColor: \"orange\",
            joinDate: \"Mars 2025\",
            memberType: \"Membre fondateur\",
            catchphrase: \"RBE c'est surtout une famille de mordus d'automobile\",
            image: \"https://via.placeholder.com/150?text=MR\",
            expertise: [
              { label: \"Médias\", color: \"purple\" },
              { label: \"Formations\", color: \"purple\" }
            ]
          },
          {
            id: 3,
            name: \"Nour Bayoudh\",
            role: \"Responsable Administration\",
            roleColor: \"green\",
            joinDate: \"2026\",
            memberType: \"Membre\",
            catchphrase: \"Une bonne organisation est la clé de nos succès\",
            image: \"https://via.placeholder.com/150?text=NB\",
            expertise: [
              { label: \"Admin\", color: \"teal\" },
              { label: \"Organisation\", color: \"teal\" },
              { label: \"Gestion\", color: \"teal\" }
            ]
          },
          {
            id: 4,
            name: \"Jarina Amolotpavanathan\",
            role: \"Service Juridique\",
            roleColor: \"purple\",
            joinDate: \"2026\",
            memberType: \"Membre\",
            catchphrase: \"Encadrer juridiquement nos actions pour protéger l'association\",
            image: \"https://via.placeholder.com/150?text=JA\",
            expertise: [
              { label: \"Droit\", color: \"pink\" },
              { label: \"Conformité\", color: \"pink\" },
              { label: \"Contrats\", color: \"pink\" }
            ]
          },
          {
            id: 5,
            name: \"Jaffer Camaroudine\",
            role: \"Conseil d'Administration\",
            roleColor: \"blue\",
            joinDate: \"Mars 2025\",
            memberType: \"Membre fondateur\",
            catchphrase: \"Préserver les véhicules que je voyais rouler quand j'étais enfant\",
            image: \"/assets/team/jaffer-camaroudine.jpg\",
            expertise: [
              { label: \"Conduite\", color: \"cyan\" },
              { label: \"Formations\", color: \"cyan\" },
              { label: \"Itinéraires\", color: \"cyan\" }
            ]
          }
        ];
        setTeamMembers(defaultMembers);
        localStorage.setItem('rbe:team-members', JSON.stringify(defaultMembers));
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement équipe:', error);
      toast({
        title: 'Erreur de chargement',
        description: 'Impossible de charger les membres de l'\''équipe',
        status: 'error',
        duration: 3000
      });
      setLoading(false);
    }
  };

  const saveTeamMembers = (members) => {
    localStorage.setItem('rbe:team-members', JSON.stringify(members));
    setTeamMembers(members);
  };

  const toggleEditMode = () => {
    if (editMode) {
      setEditMode(false);
      setEditingId(null);
      setFormData({});
    } else {
      setEditMode(true);
    }
  };

  const handleStartEdit = (member) => {
    setEditingId(member.id);
    setFormData({
      name: member.name,
      role: member.role,
      roleColor: member.roleColor || 'red',
      image: member.image,
      catchphrase: member.catchphrase,
      expertise: member.expertise || [],
      joinDate: member.joinDate || '',
      memberType: member.memberType || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleSaveEdit = (memberId) => {
    const updated = teamMembers.map(m =>
      m.id === memberId ? { ...m, ...formData } : m
    );
    saveTeamMembers(updated);
    setEditingId(null);
    setFormData({});
    toast({
      title: 'Membre mis à jour',
      status: 'success',
      duration: 2000
    });
  };

  const handleAddNew = () => {
    const newMember = {
      id: Date.now(),
      name: 'Nouveau membre',
      role: 'Rôle',
      roleColor: 'blue',
      image: '',
      catchphrase: 'Citation...',
      expertise: [],
      joinDate: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      memberType: 'Membre'
    };
    const updated = [...teamMembers, newMember];
    saveTeamMembers(updated);
    setEditingId(newMember.id);
    setFormData({
      name: newMember.name,
      role: newMember.role,
      roleColor: newMember.roleColor,
      image: newMember.image,
      catchphrase: newMember.catchphrase,
      expertise: newMember.expertise,
      joinDate: newMember.joinDate,
      memberType: newMember.memberType
    });
    toast({
      title: 'Nouveau membre ajouté',
      description: 'Cliquez sur Enregistrer pour valider',
      status: 'info',
      duration: 2000
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      const filtered = teamMembers.filter(m => m.id !== id);
      saveTeamMembers(filtered);
      toast({
        title: 'Membre supprimé',
        status: 'info',
        duration: 2000
      });
    }
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newMembers = [...teamMembers];
    [newMembers[index - 1], newMembers[index]] = [newMembers[index], newMembers[index - 1]];
    saveTeamMembers(newMembers);
  };

  const handleMoveDown = (index) => {
    if (index === teamMembers.length - 1) return;
    const newMembers = [...teamMembers];
    [newMembers[index], newMembers[index + 1]] = [newMembers[index + 1], newMembers[index]];
    saveTeamMembers(newMembers);
  };

  const handleAddExpertise = () => {
    setFormData({
      ...formData,
      expertise: [...(formData.expertise || []), { label: '', color: 'blue' }]
    });
  };

  const handleUpdateExpertise = (index, field, value) => {
    const updated = [...(formData.expertise || [])];
    updated[index][field] = value;
    setFormData({ ...formData, expertise: updated });
  };

  const handleRemoveExpertise = (index) => {
    const updated = (formData.expertise || []).filter((_, i) => i !== index);
    setFormData({ ...formData, expertise: updated });
  };

  return (
    <SidebarLayout>
      <Box bgGradient={bgGradient} minH=\"100vh\" py={8}>
        <Container maxW=\"container.xl\">
          <VStack spacing={8} align=\"stretch\">
            <Flex align=\"center\" flexWrap=\"wrap\" gap={4}>
              <VStack align=\"start\" spacing={1} flex={1}>
                <Heading size=\"xl\" color=\"rbe.500\">
                  Team RBE 🚌 ❤️
                </Heading>
                <Text color=\"gray.600\" fontSize=\"lg\">
                  Les passionnés qui font vivre l'association au quotidien
                </Text>
              </VStack>
              <Spacer />
              {isAdmin && (
                <HStack spacing={3}>
                  {editMode && (
                    <Button
                      leftIcon={<FiPlus />}
                      colorScheme=\"green\"
                      size=\"md\"
                      onClick={handleAddNew}
                    >
                      Ajouter un membre
                    </Button>
                  )}
                  <Button
                    leftIcon={editMode ? <FiCheck /> : <FiEdit2 />}
                    colorScheme={editMode ? 'green' : 'rbe'}
                    size=\"md\"
                    onClick={toggleEditMode}
                  >
                    {editMode ? 'Terminer' : 'Modifier l'\''équipe'}
                  </Button>
                </HStack>
              )}
            </Flex>

            {editMode && (
              <Alert status=\"info\" borderRadius=\"md\">
                <AlertIcon />
                <Box>
                  <AlertTitle>Mode édition activé</AlertTitle>
                  <AlertDescription>
                    Cliquez sur une carte pour modifier les informations. Utilisez les boutons ↑ ↓ pour réorganiser l'ordre.
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {loading ? (
              <Text textAlign=\"center\" color=\"gray.500\">Chargement...</Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {teamMembers.map((member, index) => {
                  const isEditing = editingId === member.id;
                  
                  return (
                    <Card
                      key={member.id}
                      bg={cardBg}
                      border=\"2px solid\"
                      borderColor={isEditing ? 'rbe.500' : borderColor}
                      shadow={isEditing ? 'xl' : 'sm'}
                      _hover={editMode ? { 
                        borderColor: 'rbe.300', 
                        shadow: 'md', 
                        transform: 'translateY(-2px)', 
                        transition: 'all 0.2s' 
                      } : {
                        shadow: 'md',
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s'
                      }}
                      position=\"relative\"
                    >
                      <CardBody>
                        <VStack spacing={4} align=\"stretch\">
                          {editMode && !isEditing && (
                            <HStack justify=\"space-between\">
                              <HStack spacing={1}>
                                <IconButton
                                  icon={<FiChevronUp />}
                                  size=\"sm\"
                                  aria-label=\"Monter\"
                                  onClick={() => handleMoveUp(index)}
                                  isDisabled={index === 0}
                                  colorScheme=\"gray\"
                                  variant=\"ghost\"
                                />
                                <IconButton
                                  icon={<FiChevronDown />}
                                  size=\"sm\"
                                  aria-label=\"Descendre\"
                                  onClick={() => handleMoveDown(index)}
                                  isDisabled={index === teamMembers.length - 1}
                                  colorScheme=\"gray\"
                                  variant=\"ghost\"
                                />
                              </HStack>
                              <HStack spacing={1}>
                                <IconButton
                                  icon={<FiEdit2 />}
                                  size=\"sm\"
                                  colorScheme=\"blue\"
                                  aria-label=\"Éditer\"
                                  onClick={() => handleStartEdit(member)}
                                />
                                <IconButton
                                  icon={<FiTrash2 />}
                                  size=\"sm\"
                                  colorScheme=\"red\"
                                  aria-label=\"Supprimer\"
                                  onClick={() => handleDelete(member.id)}
                                />
                              </HStack>
                            </HStack>
                          )}

                          {isEditing ? (
                            <VStack spacing={3} align=\"stretch\">
                              <FormControl size=\"sm\">
                                <FormLabel fontSize=\"xs\">Nom</FormLabel>
                                <Input
                                  size=\"sm\"
                                  value={formData.name || ''}
                                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                              </FormControl>

                              <FormControl size=\"sm\">
                                <FormLabel fontSize=\"xs\">Rôle</FormLabel>
                                <Input
                                  size=\"sm\"
                                  value={formData.role || ''}
                                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                />
                              </FormControl>

                              <FormControl size=\"sm\">
                                <FormLabel fontSize=\"xs\">Couleur badge</FormLabel>
                                <Select
                                  size=\"sm\"
                                  value={formData.roleColor || 'blue'}
                                  onChange={(e) => setFormData({ ...formData, roleColor: e.target.value })}
                                >
                                  {BADGE_COLORS.map(color => (
                                    <option key={color.value} value={color.value}>{color.label}</option>
                                  ))}
                                </Select>
                              </FormControl>

                              <FormControl size=\"sm\">
                                <FormLabel fontSize=\"xs\">URL photo</FormLabel>
                                <Input
                                  size=\"sm\"
                                  value={formData.image || ''}
                                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                  placeholder=\"https://...\"
                                />
                              </FormControl>

                              <FormControl size=\"sm\">
                                <FormLabel fontSize=\"xs\">Citation</FormLabel>
                                <Textarea
                                  size=\"sm\"
                                  value={formData.catchphrase || ''}
                                  onChange={(e) => setFormData({ ...formData, catchphrase: e.target.value })}
                                  rows={2}
                                />
                              </FormControl>

                              <Divider />

                              <FormControl size=\"sm\">
                                <FormLabel fontSize=\"xs\">Expertises</FormLabel>
                                <VStack spacing={2} align=\"stretch\">
                                  {(formData.expertise || []).map((exp, idx) => (
                                    <HStack key={idx} spacing={2}>
                                      <Input
                                        size=\"xs\"
                                        value={exp.label}
                                        onChange={(e) => handleUpdateExpertise(idx, 'label', e.target.value)}
                                        placeholder=\"Label\"
                                      />
                                      <Select
                                        size=\"xs\"
                                        value={exp.color}
                                        onChange={(e) => handleUpdateExpertise(idx, 'color', e.target.value)}
                                        w=\"100px\"
                                      >
                                        {TAG_COLORS.map(color => (
                                          <option key={color.value} value={color.value}>{color.label}</option>
                                        ))}
                                      </Select>
                                      <IconButton
                                        icon={<FiX />}
                                        size=\"xs\"
                                        colorScheme=\"red\"
                                        onClick={() => handleRemoveExpertise(idx)}
                                        aria-label=\"Supprimer\"
                                      />
                                    </HStack>
                                  ))}
                                  <Button
                                    leftIcon={<FiPlus />}
                                    size=\"xs\"
                                    variant=\"outline\"
                                    onClick={handleAddExpertise}
                                  >
                                    Ajouter expertise
                                  </Button>
                                </VStack>
                              </FormControl>

                              <HStack spacing={2} pt={2}>
                                <Button
                                  leftIcon={<FiSave />}
                                  colorScheme=\"green\"
                                  size=\"sm\"
                                  flex={1}
                                  onClick={() => handleSaveEdit(member.id)}
                                >
                                  Enregistrer
                                </Button>
                                <Button
                                  leftIcon={<FiX />}
                                  variant=\"ghost\"
                                  size=\"sm\"
                                  onClick={handleCancelEdit}
                                >
                                  Annuler
                                </Button>
                              </HStack>
                            </VStack>
                          ) : (
                            <VStack spacing={4} align=\"center\">
                              <Avatar
                                size=\"xl\"
                                name={member.name}
                                src={member.image}
                                bg={${member.roleColor || 'rbe'}.500}
                              />
                              <VStack spacing={1} textAlign=\"center\" w=\"full\">
                                <Heading size=\"md\">{member.name}</Heading>
                                <Badge 
                                  colorScheme={member.roleColor || 'red'} 
                                  fontSize=\"sm\" 
                                  px={3} 
                                  py={1} 
                                  borderRadius=\"full\"
                                >
                                  {member.role}
                                </Badge>
                                {member.expertise && member.expertise.length > 0 && (
                                  <HStack spacing={2} flexWrap=\"wrap\" justify=\"center\" mt={2} pt={2}>
                                    {member.expertise.map((exp, idx) => (
                                      <Tag key={idx} size=\"sm\" colorScheme={exp.color || 'blue'}>
                                        <TagLabel>{exp.label}</TagLabel>
                                      </Tag>
                                    ))}
                                  </HStack>
                                )}
                              </VStack>
                              {member.catchphrase && (
                                <Text fontSize=\"sm\" color=\"gray.600\" fontStyle=\"italic\" textAlign=\"center\">
                                  \"{member.catchphrase}\"
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
