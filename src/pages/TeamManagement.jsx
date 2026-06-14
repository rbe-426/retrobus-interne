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
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
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
  useColorModeValue
} from '@chakra-ui/react';
import {
  FiEdit2,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiPlus,
  FiSave,
  FiX
} from 'react-icons/fi';
import SidebarLayout from '../components/SidebarLayout';
import { useUser } from '../context/UserContext';

// Couleurs disponibles pour les badges
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

export default function TeamManagement() {
  const { user, isAdmin } = useUser();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [teamMembers, setTeamMembers] = useState([]);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    roleColor: 'red',
    image: '',
    catchphrase: '',
    expertise: [], // Array de {label, color}
    joinDate: '',
    memberType: ''
  });

  // Charger les membres depuis localStorage (temporaire, sera remplacé par API)
  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = () => {
    try {
      const stored = localStorage.getItem('rbe:team-members');
      if (stored) {
        setTeamMembers(JSON.parse(stored));
      } else {
        // Données initiales par défaut
        const defaultMembers = [
          {
            id: 1,
            name: "Waiyl Belaidi",
            role: "Président de l'association",
            roleColor: "red",
            joinDate: "Mars 2025",
            memberType: "Membre fondateur",
            catchphrase: "RBE c'est surtout une famille de mordus d'automobile",
            image: "https://via.placeholder.com/150?text=WB",
            expertise: [
              { label: "SAEIV", color: "blue" },
              { label: "Médias", color: "blue" },
              { label: "Technique", color: "blue" }
            ]
          },
          {
            id: 2,
            name: "Méthusan Ravichandran",
            role: "Vice-Président",
            roleColor: "orange",
            joinDate: "Mars 2025",
            memberType: "Membre fondateur",
            catchphrase: "RBE c'est surtout une famille de mordus d'automobile",
            image: "https://via.placeholder.com/150?text=MR",
            expertise: [
              { label: "Médias", color: "purple" },
              { label: "Formations", color: "purple" }
            ]
          },
          {
            id: 3,
            name: "Nour Bayoudh",
            role: "Responsable Administration",
            roleColor: "green",
            joinDate: "2026",
            memberType: "Membre",
            catchphrase: "Une bonne organisation est la clé de nos succès",
            image: "https://via.placeholder.com/150?text=NB",
            expertise: [
              { label: "Admin", color: "teal" },
              { label: "Organisation", color: "teal" },
              { label: "Gestion", color: "teal" }
            ]
          },
          {
            id: 4,
            name: "Jarina Amolotpavanathan",
            role: "Service Juridique",
            roleColor: "purple",
            joinDate: "2026",
            memberType: "Membre",
            catchphrase: "Encadrer juridiquement nos actions pour protéger l'association",
            image: "https://via.placeholder.com/150?text=JA",
            expertise: [
              { label: "Droit", color: "pink" },
              { label: "Conformité", color: "pink" },
              { label: "Contrats", color: "pink" }
            ]
          },
          {
            id: 5,
            name: "Jaffer Camaroudine",
            role: "Conseil d'Administration",
            roleColor: "blue",
            joinDate: "Mars 2025",
            memberType: "Membre fondateur",
            catchphrase: "Préserver les véhicules que je voyais rouler quand j'étais enfant",
            image: "/assets/team/jaffer-camaroudine.jpg",
            expertise: [
              { label: "Conduite", color: "cyan" },
              { label: "Formations", color: "cyan" },
              { label: "Itinéraires", color: "cyan" }
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
        description: 'Impossible de charger les membres de l\'équipe',
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

  const handleOpenEdit = (member = null) => {
    if (member) {
      setEditingMember(member);
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
    } else {
      setEditingMember(null);
      setFormData({
        name: '',
        role: '',
        roleColor: 'red',
        image: '',
        catchphrase: '',
        expertise: [],
        joinDate: '',
        memberType: ''
      });
    }
    onOpen();
  };

  const handleSave = () => {
    if (!formData.name || !formData.role) {
      toast({
        title: 'Champs requis',
        description: 'Le nom et le rôle sont obligatoires',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    if (editingMember) {
      // Mise à jour
      const updated = teamMembers.map(m =>
        m.id === editingMember.id ? { ...m, ...formData } : m
      );
      saveTeamMembers(updated);
      toast({
        title: 'Membre mis à jour',
        status: 'success',
        duration: 2000
      });
    } else {
      // Ajout
      const newMember = {
        id: Date.now(),
        ...formData
      };
      saveTeamMembers([...teamMembers, newMember]);
      toast({
        title: 'Membre ajouté',
        status: 'success',
        duration: 2000
      });
    }
    onClose();
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
      expertise: [...formData.expertise, { label: '', color: 'blue' }]
    });
  };

  const handleUpdateExpertise = (index, field, value) => {
    const updated = [...formData.expertise];
    updated[index][field] = value;
    setFormData({ ...formData, expertise: updated });
  };

  const handleRemoveExpertise = (index) => {
    const updated = formData.expertise.filter((_, i) => i !== index);
    setFormData({ ...formData, expertise: updated });
  };

  if (!user || !isAdmin) {
    return (
      <SidebarLayout>
        <Container maxW="container.md" py={8}>
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Accès refusé</AlertTitle>
            <AlertDescription>
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </AlertDescription>
          </Alert>
        </Container>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" flexWrap="wrap">
            <VStack align="start" spacing={1}>
              <Heading size="xl" color="rbe.500">Gestion de l'équipe</Heading>
              <Text color="gray.600">
                Gérez les membres affichés sur le dashboard et la page publique
              </Text>
            </VStack>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="rbe"
              onClick={() => handleOpenEdit()}
            >
              Ajouter un membre
            </Button>
          </HStack>

          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Synchronisation automatique</AlertTitle>
              <AlertDescription>
                Les modifications apportées ici seront automatiquement reflétées sur la page publique /team
              </AlertDescription>
            </Box>
          </Alert>

          {/* Liste des membres */}
          {loading ? (
            <Text>Chargement...</Text>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {teamMembers.map((member, index) => (
                <Card
                  key={member.id}
                  bg={cardBg}
                  border="1px solid"
                  borderColor={borderColor}
                  shadow="sm"
                >
                  <CardBody>
                    <HStack spacing={4} align="start">
                      <Avatar
                        size="lg"
                        name={member.name}
                        src={member.image}
                        bg={`${member.roleColor}.500`}
                      />
                      <VStack align="start" flex={1} spacing={2}>
                        <VStack align="start" spacing={0}>
                          <Heading size="sm">{member.name}</Heading>
                          <Badge colorScheme={member.roleColor} fontSize="xs">
                            {member.role}
                          </Badge>
                        </VStack>
                        <HStack spacing={1} flexWrap="wrap">
                          {member.expertise?.map((exp, i) => (
                            <Tag key={i} size="sm" colorScheme={exp.color}>
                              <TagLabel>{exp.label}</TagLabel>
                            </Tag>
                          ))}
                        </HStack>
                        <Text fontSize="xs" color="gray.600" fontStyle="italic" noOfLines={2}>
                          "{member.catchphrase}"
                        </Text>
                      </VStack>
                      <VStack spacing={2}>
                        <HStack spacing={1}>
                          <IconButton
                            icon={<FiChevronUp />}
                            size="sm"
                            aria-label="Monter"
                            onClick={() => handleMoveUp(index)}
                            isDisabled={index === 0}
                          />
                          <IconButton
                            icon={<FiChevronDown />}
                            size="sm"
                            aria-label="Descendre"
                            onClick={() => handleMoveDown(index)}
                            isDisabled={index === teamMembers.length - 1}
                          />
                        </HStack>
                        <HStack spacing={1}>
                          <IconButton
                            icon={<FiEdit2 />}
                            size="sm"
                            colorScheme="blue"
                            aria-label="Éditer"
                            onClick={() => handleOpenEdit(member)}
                          />
                          <IconButton
                            icon={<FiTrash2 />}
                            size="sm"
                            colorScheme="red"
                            aria-label="Supprimer"
                            onClick={() => handleDelete(member.id)}
                          />
                        </HStack>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </VStack>
      </Container>

      {/* Modal d'édition/ajout */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingMember ? 'Modifier un membre' : 'Ajouter un membre'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nom complet</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Waiyl Belaidi"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Rôle</FormLabel>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="Ex: Président de l'association"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Couleur du badge</FormLabel>
                <Select
                  value={formData.roleColor}
                  onChange={(e) => setFormData({ ...formData, roleColor: e.target.value })}
                >
                  {BADGE_COLORS.map(color => (
                    <option key={color.value} value={color.value}>{color.label}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>URL de la photo</FormLabel>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://... ou /assets/team/..."
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Laissez vide pour utiliser l'avatar avec initiales
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Citation</FormLabel>
                <Textarea
                  value={formData.catchphrase}
                  onChange={(e) => setFormData({ ...formData, catchphrase: e.target.value })}
                  placeholder="Une phrase qui représente le membre..."
                  rows={2}
                />
              </FormControl>

              <Divider />

              <FormControl>
                <FormLabel>Domaines d'expertise</FormLabel>
                <VStack spacing={2} align="stretch">
                  {formData.expertise.map((exp, index) => (
                    <HStack key={index} spacing={2}>
                      <Input
                        value={exp.label}
                        onChange={(e) => handleUpdateExpertise(index, 'label', e.target.value)}
                        placeholder="Ex: Médias"
                        size="sm"
                      />
                      <Select
                        value={exp.color}
                        onChange={(e) => handleUpdateExpertise(index, 'color', e.target.value)}
                        size="sm"
                        w="150px"
                      >
                        {TAG_COLORS.map(color => (
                          <option key={color.value} value={color.value}>{color.label}</option>
                        ))}
                      </Select>
                      <IconButton
                        icon={<FiX />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleRemoveExpertise(index)}
                        aria-label="Supprimer"
                      />
                    </HStack>
                  ))}
                  <Button
                    leftIcon={<FiPlus />}
                    size="sm"
                    variant="outline"
                    onClick={handleAddExpertise}
                  >
                    Ajouter une expertise
                  </Button>
                </VStack>
              </FormControl>

              <Divider />

              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl>
                  <FormLabel>Date d'arrivée</FormLabel>
                  <Input
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    placeholder="Ex: Mars 2025"
                    size="sm"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Type de membre</FormLabel>
                  <Input
                    value={formData.memberType}
                    onChange={(e) => setFormData({ ...formData, memberType: e.target.value })}
                    placeholder="Ex: Membre fondateur"
                    size="sm"
                  />
                </FormControl>
              </SimpleGrid>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} leftIcon={<FiX />}>
              Annuler
            </Button>
            <Button colorScheme="rbe" onClick={handleSave} leftIcon={<FiSave />}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SidebarLayout>
  );
}
