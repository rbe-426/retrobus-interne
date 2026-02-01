import React, { useEffect, useState } from 'react';
import {
  Box, VStack, HStack, Button, Flex, useToast, Text, Spinner,
  useDisclosure, SimpleGrid, Card, CardBody, CardHeader,
  FormControl, FormLabel, Input, Select,
  Textarea, Switch, Badge, Alert, AlertIcon, Divider,
  Container, Heading, Center, InputGroup, InputLeftElement,
  Tabs, TabList, Tab, TabPanel, TabPanels
} from "@chakra-ui/react";
import { 
  FiUsers, FiSearch, FiEdit, FiSave, FiX, FiCalendar,
  FiCreditCard, FiUser, FiKey, FiPhone, FiMail
} from 'react-icons/fi';
import WorkspaceLayout from '../components/Layout/WorkspaceLayout';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const apiUrl = (path) => API_BASE_URL ? `${API_BASE_URL}${path}` : path;

const MEMBERSHIP_TYPES = {
  STANDARD: 'Adhésion Standard',
  FAMILY: 'Adhésion Famille',
  STUDENT: 'Adhésion Étudiant',
  HONORARY: 'Membre d\'Honneur',
  BIENFAITEUR: 'Bienfaiteur'
};

const MEMBERSHIP_STATUS = {
  PENDING: 'En attente',
  ACTIVE: 'Actif',
  EXPIRED: 'Expiré',
  SUSPENDED: 'Suspendu',
  CANCELLED: 'Annulé'
};

const PAYMENT_METHODS = {
  CASH: 'Espèces',
  CHECK: 'Chèque',
  BANK_TRANSFER: 'Virement',
  CARD: 'Carte bancaire',
  PAYPAL: 'PayPal',
  HELLOASSO: 'HelloAsso'
};

export default function AdhesionManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const token = localStorage.getItem('token');

  // Charger la liste des membres
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const candidates = [apiUrl('/api/members'), '/api/members'];
      let response = null;
      for (const url of candidates) {
        try {
          const r = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (r.ok) { response = r; break; }
        } catch {}
      }
      if (!response) throw new Error('Impossible de charger les adhérents');
      const data = await response.json();
      setMembers(Array.isArray(data) ? data : data.members || []);
    } catch (err) {
      toast({ status: 'error', title: 'Erreur', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setEditData({ ...member });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const candidates = [apiUrl(`/api/members/${selectedMember.id}`), `/api/members/${selectedMember.id}`];
      let response = null;
      for (const url of candidates) {
        try {
          const r = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(editData)
          });
          if (r.ok) { response = r; break; }
        } catch {}
      }
      if (!response) throw new Error('Impossible de sauvegarder');
      await response.json();
      toast({ status: 'success', title: 'Succès', description: 'Adhésion mise à jour' });
      setSelectedMember(null);
      fetchMembers();
    } catch (err) {
      toast({ status: 'error', title: 'Erreur', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = members.filter(m => 
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderContent = () => {
    if (loading) return <Center p={8}><Spinner /></Center>;

    if (!selectedMember) {
      return (
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="md" mb={4}>Sélectionner un adhérent</Heading>
            <InputGroup mb={4}>
              <InputLeftElement pointerEvents="none"><FiSearch color="gray.300" /></InputLeftElement>
              <Input
                placeholder="Rechercher par nom, email ou matricule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {filteredMembers.map(member => (
              <Card key={member.id} cursor="pointer" onClick={() => handleSelectMember(member)} _hover={{ boxShadow: 'lg' }}>
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <HStack width="100%" justify="space-between">
                      <Box>
                        <Text fontWeight="bold">{member.firstName} {member.lastName}</Text>
                        <Text fontSize="sm" color="gray.600">{member.email}</Text>
                      </Box>
                      <Badge>{member.membershipStatus || 'PENDING'}</Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      Matricule: <Text as="span" fontWeight="bold">{member.matricule}</Text>
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      N° adhérent: <Text as="span" fontWeight="bold">{member.memberNumber}</Text>
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          {filteredMembers.length === 0 && (
            <Alert status="info"><AlertIcon />Aucun adhérent trouvé</Alert>
          )}
        </VStack>
      );
    }

    return (
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Box>
            <Heading size="lg">{selectedMember.firstName} {selectedMember.lastName}</Heading>
            <Text color="gray.600">{selectedMember.email}</Text>
          </Box>
          <Button variant="outline" onClick={() => setSelectedMember(null)}>
            ← Retour
          </Button>
        </HStack>

        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Identité & Contact</Tab>
            <Tab>Adhésion</Tab>
            <Tab>Paiement</Tab>
            <Tab>Autres</Tab>
          </TabList>

          <TabPanels>
            {/* Tab 1: Identité & Contact */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Prénom</FormLabel>
                  <Input
                    value={editData.firstName || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Nom</FormLabel>
                  <Input
                    value={editData.lastName || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={editData.email || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Téléphone</FormLabel>
                  <Input
                    value={editData.phone || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Date de naissance</FormLabel>
                  <Input
                    type="date"
                    value={editData.birthDate ? editData.birthDate.split('T')[0] : ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, birthDate: e.target.value }))}
                  />
                </FormControl>
              </SimpleGrid>

              <Divider my={6} />

              <Heading size="sm" mb={4}>Adresse</Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Adresse</FormLabel>
                  <Input
                    value={editData.address || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Code postal</FormLabel>
                  <Input
                    value={editData.postalCode || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, postalCode: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Ville</FormLabel>
                  <Input
                    value={editData.city || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </FormControl>
              </SimpleGrid>
            </TabPanel>

            {/* Tab 2: Adhésion */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Statut</FormLabel>
                  <Select
                    value={editData.membershipStatus || 'ACTIVE'}
                    onChange={(e) => setEditData(prev => ({ ...prev, membershipStatus: e.target.value }))}
                  >
                    {Object.entries(MEMBERSHIP_STATUS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Type d'adhésion</FormLabel>
                  <Select
                    value={editData.membershipType || 'STANDARD'}
                    onChange={(e) => setEditData(prev => ({ ...prev, membershipType: e.target.value }))}
                  >
                    {Object.entries(MEMBERSHIP_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Matricule (username)</FormLabel>
                  <Input
                    value={editData.matricule || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, matricule: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Numéro d'adhérent</FormLabel>
                  <Input
                    value={editData.memberNumber || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, memberNumber: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Début d'adhésion</FormLabel>
                  <Input
                    type="date"
                    value={editData.membershipStartDate ? editData.membershipStartDate.split('T')[0] : ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, membershipStartDate: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Fin d'adhésion</FormLabel>
                  <Input
                    type="date"
                    value={editData.membershipEndDate ? editData.membershipEndDate.split('T')[0] : ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, membershipEndDate: e.target.value }))}
                  />
                </FormControl>
              </SimpleGrid>
            </TabPanel>

            {/* Tab 3: Paiement */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Montant cotisation (€)</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.paymentAmount || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, paymentAmount: parseFloat(e.target.value) || null }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Mode de paiement</FormLabel>
                  <Select
                    value={editData.paymentMethod || 'CASH'}
                    onChange={(e) => setEditData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>
            </TabPanel>

            {/* Tab 4: Autres */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="newsletter" mb="0">Newsletter</FormLabel>
                  <Switch
                    id="newsletter"
                    isChecked={editData.newsletter || false}
                    onChange={(e) => setEditData(prev => ({ ...prev, newsletter: e.target.checked }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Notes internes</FormLabel>
                  <Textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes pour l'admin..."
                  />
                </FormControl>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <HStack justify="flex-end" spacing={4}>
          <Button variant="outline" onClick={() => setSelectedMember(null)}>
            Annuler
          </Button>
          <Button colorScheme="blue" leftIcon={<FiSave />} onClick={handleSave} isLoading={saving}>
            Enregistrer
          </Button>
        </HStack>
      </VStack>
    );
  };

  const sections = [
    {
      id: 'adhesions',
      label: 'Gestion des Adhésions',
      icon: FiUsers,
      description: 'Éditer les infos d\'adhésion',
      render: renderContent
    }
  ];

  return (
    <WorkspaceLayout
      title="Édition des Adhésions"
      subtitle="Modifiez toutes les informations d'adhésion de vos membres"
      sections={sections}
      defaultSectionId="adhesions"
      sidebarTitle="Adhésions"
      sidebarSubtitle="Espace MyRBE"
      sidebarTitleIcon={FiUsers}
      versionLabel="Gestion v2"
    />
  );
}
