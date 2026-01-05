import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  useColorModeValue,
  Select,
} from '@chakra-ui/react';
import { FiEdit2, FiTrash2, FiPlus, FiFileText } from 'react-icons/fi';
import PageLayout from '../components/Layout/PageLayout';
import { subventionAPI } from '../api/subventionClient.js';

const EXPENSE_CATEGORIES = ['FUEL', 'MAINTENANCE', 'INSURANCE', 'MATERIAL', 'ADMINISTRATIVE', 'OTHER'];

export default function SubventionCampaignAdmin() {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const { isOpen: isCampaignOpen, onOpen: onCampaignOpen, onClose: onCampaignClose } = useDisclosure();
  const { isOpen: isExpenseOpen, onOpen: onExpenseOpen, onClose: onExpenseClose } = useDisclosure();

  // Form states
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    organization: '',
    description: '',
    minAmount: '',
    maxAmount: '',
    deadline: '',
    contactEmail: '',
    contactPhone: '',
    websiteUrl: '',
    notes: ''
  });

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'OTHER',
    notes: '',
    receipt: null
  });

  // Charger les campagnes
  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await subventionAPI.getAll();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement campagnes:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les campagnes', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Créer/modifier campagne
  const handleSaveCampaign = async () => {
    try {
      if (!campaignForm.title || !campaignForm.organization || !campaignForm.deadline) {
        toast({ title: 'Erreur', description: 'Titre, organisation et date limite sont requis', status: 'error', duration: 5000, isClosable: true });
        return;
      }

      if (campaignForm.id) {
        await subventionAPI.update(campaignForm.id, campaignForm);
        toast({ title: 'Succès', description: 'Campagne mise à jour', status: 'success', duration: 3000, isClosable: true });
      } else {
        await subventionAPI.create(campaignForm);
        toast({ title: 'Succès', description: 'Campagne créée', status: 'success', duration: 3000, isClosable: true });
      }

      loadCampaigns();
      onCampaignClose();
      setCampaignForm({
        title: '',
        organization: '',
        description: '',
        minAmount: '',
        maxAmount: '',
        deadline: '',
        contactEmail: '',
        contactPhone: '',
        websiteUrl: '',
        notes: ''
      });
    } catch (error) {
      console.error('Erreur sauvegarde campagne:', error);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder la campagne', status: 'error', duration: 5000, isClosable: true });
    }
  };

  // Ouvrir modal pour créer campagne
  const handleNewCampaign = () => {
    setCampaignForm({
      title: '',
      organization: '',
      description: '',
      minAmount: '',
      maxAmount: '',
      deadline: '',
      contactEmail: '',
      contactPhone: '',
      websiteUrl: '',
      notes: ''
    });
    onCampaignOpen();
  };

  // Sélectionner campagne pour voir dépenses
  const handleSelectCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setExpenses(campaign.SubventionExpense || []);
  };

  // Ajouter dépense
  const handleAddExpense = async () => {
    try {
      if (!expenseForm.description || !expenseForm.amount) {
        toast({ title: 'Erreur', description: 'Description et montant sont requis', status: 'error', duration: 5000, isClosable: true });
        return;
      }

      await subventionAPI.createExpense(selectedCampaign.id, {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount)
      });

      toast({ title: 'Succès', description: 'Dépense ajoutée', status: 'success', duration: 3000, isClosable: true });
      
      // Recharger campagne
      handleSelectCampaign(selectedCampaign);
      onExpenseClose();
      setExpenseForm({ description: '', amount: '', category: 'OTHER', notes: '', receipt: null });
    } catch (error) {
      console.error('Erreur ajout dépense:', error);
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter la dépense', status: 'error', duration: 5000, isClosable: true });
    }
  };

  // Supprimer dépense
  const handleDeleteExpense = async (expenseId) => {
    try {
      await subventionAPI.deleteExpense(selectedCampaign.id, expenseId);
      toast({ title: 'Succès', description: 'Dépense supprimée', status: 'success', duration: 3000, isClosable: true });
      setExpenses(expenses.filter(e => e.id !== expenseId));
    } catch (error) {
      console.error('Erreur suppression dépense:', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer la dépense', status: 'error', duration: 5000, isClosable: true });
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="Admin - Campagnes de Subvention"
        subtitle="Gestion des campagnes et dépenses"
        headerVariant="card"
        bgGradient="linear(to-r, orange.400, orange.600)"
        titleSize="lg"
        titleWeight="700"
      >
        <Center h="400px">
          <Spinner size="lg" color="orange.500" />
        </Center>
      </PageLayout>
    );
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expensesByStatus = {
    SUBMITTED: expenses.filter(e => e.status === 'SUBMITTED').length,
    APPROVED: expenses.filter(e => e.status === 'APPROVED').length,
    REJECTED: expenses.filter(e => e.status === 'REJECTED').length
  };

  return (
    <PageLayout
      title="Admin - Campagnes de Subvention"
      subtitle="Gestion des campagnes et dépenses"
      headerVariant="card"
      bgGradient="linear(to-r, orange.400, orange.600)"
      titleSize="lg"
      titleWeight="700"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/home" },
        { label: "Admin", href: "/dashboard/myrbe" },
        { label: "Campagnes", href: "/dashboard/admin/subventions" }
      ]}
    >
      <VStack spacing={6} align="stretch">
        {/* Liste des campagnes */}
        <Box>
          <HStack justify="space-between" mb={4}>
            <Heading size="lg">Campagnes</Heading>
            <Button colorScheme="orange" leftIcon={<FiPlus />} onClick={handleNewCampaign}>
              Nouvelle campagne
            </Button>
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {campaigns.map(campaign => (
              <Card
                key={campaign.id}
                bg={cardBg}
                borderRadius="lg"
                cursor="pointer"
                onClick={() => handleSelectCampaign(campaign)}
                borderWidth={selectedCampaign?.id === campaign.id ? "2px" : "1px"}
                borderColor={selectedCampaign?.id === campaign.id ? "orange.500" : "gray.200"}
              >
                <CardHeader>
                  <Heading size="md" color="orange.600">{campaign.title}</Heading>
                  <Text fontSize="sm" color="gray.600">{campaign.organization}</Text>
                </CardHeader>
                <CardBody>
                  <VStack align="start" spacing={2}>
                    <Text fontSize="sm">{campaign.description}</Text>
                    <Badge colorScheme={campaign.status === 'ACTIVE' ? 'green' : 'gray'}>
                      {campaign.status}
                    </Badge>
                    <Text fontSize="xs" color="gray.500">
                      Échéance: {new Date(campaign.deadline).toLocaleDateString('fr-FR')}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* Détails campagne sélectionnée */}
        {selectedCampaign && (
          <Box>
            <Card bg={useColorModeValue('blue.50', 'blue.900')} borderRadius="lg">
              <CardBody>
                <VStack align="start" spacing={4}>
                  <Heading size="md">{selectedCampaign.title}</Heading>
                  
                  {/* Résumé dépenses */}
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} width="100%">
                    <Box p={3} bg={cardBg} borderRadius="md" textAlign="center">
                      <Text fontSize="xs" color="gray.600">Total dépenses</Text>
                      <Text fontSize="lg" fontWeight="bold" color="orange.600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalExpenses)}
                      </Text>
                    </Box>
                    <Box p={3} bg={cardBg} borderRadius="md" textAlign="center">
                      <Text fontSize="xs" color="gray.600">Nombre</Text>
                      <Text fontSize="lg" fontWeight="bold">{expenses.length}</Text>
                    </Box>
                    <Box p={3} bg={cardBg} borderRadius="md" textAlign="center">
                      <Text fontSize="xs" color="gray.600">Soumises</Text>
                      <Text fontSize="lg" fontWeight="bold" color="blue.600">{expensesByStatus.SUBMITTED}</Text>
                    </Box>
                    <Box p={3} bg={cardBg} borderRadius="md" textAlign="center">
                      <Text fontSize="xs" color="gray.600">Approuvées</Text>
                      <Text fontSize="lg" fontWeight="bold" color="green.600">{expensesByStatus.APPROVED}</Text>
                    </Box>
                  </SimpleGrid>

                  {/* Tableau dépenses */}
                  <Box width="100%" overflowX="auto">
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Description</Th>
                          <Th>Montant</Th>
                          <Th>Catégorie</Th>
                          <Th>Statut</Th>
                          <Th>Date</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {expenses.map(expense => (
                          <Tr key={expense.id}>
                            <Td>{expense.description}</Td>
                            <Td fontWeight="bold">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(expense.amount)}
                            </Td>
                            <Td>{expense.category}</Td>
                            <Td>
                              <Badge colorScheme={
                                expense.status === 'APPROVED' ? 'green' :
                                expense.status === 'REJECTED' ? 'red' : 'blue'
                              }>
                                {expense.status}
                              </Badge>
                            </Td>
                            <Td fontSize="sm">{new Date(expense.date).toLocaleDateString('fr-FR')}</Td>
                            <Td>
                              <IconButton
                                icon={<FiTrash2 />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleDeleteExpense(expense.id)}
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>

                  <Button colorScheme="orange" leftIcon={<FiPlus />} onClick={onExpenseOpen} width="100%">
                    Ajouter une dépense
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </Box>
        )}
      </VStack>

      {/* Modal Campagne */}
      <Modal isOpen={isCampaignOpen} onClose={onCampaignClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{campaignForm.id ? 'Modifier' : 'Créer'} une campagne</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  placeholder="Ex: Aide Jeunesse 2026"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Organisation</FormLabel>
                <Input
                  value={campaignForm.organization}
                  onChange={(e) => setCampaignForm({ ...campaignForm, organization: e.target.value })}
                  placeholder="Ex: Conseil Départemental"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  placeholder="Description de la campagne..."
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4} width="100%">
                <FormControl>
                  <FormLabel>Montant min (€)</FormLabel>
                  <Input
                    type="number"
                    value={campaignForm.minAmount}
                    onChange={(e) => setCampaignForm({ ...campaignForm, minAmount: e.target.value })}
                    placeholder="0"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Montant max (€)</FormLabel>
                  <Input
                    type="number"
                    value={campaignForm.maxAmount}
                    onChange={(e) => setCampaignForm({ ...campaignForm, maxAmount: e.target.value })}
                    placeholder="0"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel>Date limite</FormLabel>
                <Input
                  type="date"
                  value={campaignForm.deadline}
                  onChange={(e) => setCampaignForm({ ...campaignForm, deadline: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Email de contact</FormLabel>
                <Input
                  type="email"
                  value={campaignForm.contactEmail}
                  onChange={(e) => setCampaignForm({ ...campaignForm, contactEmail: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Téléphone</FormLabel>
                <Input
                  value={campaignForm.contactPhone}
                  onChange={(e) => setCampaignForm({ ...campaignForm, contactPhone: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Site web</FormLabel>
                <Input
                  value={campaignForm.websiteUrl}
                  onChange={(e) => setCampaignForm({ ...campaignForm, websiteUrl: e.target.value })}
                  placeholder="https://..."
                />
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  value={campaignForm.notes}
                  onChange={(e) => setCampaignForm({ ...campaignForm, notes: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onCampaignClose}>Annuler</Button>
              <Button colorScheme="orange" onClick={handleSaveCampaign}>Sauvegarder</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Dépense */}
      <Modal isOpen={isExpenseOpen} onClose={onExpenseClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ajouter une dépense</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="Description de la dépense..."
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Montant (€)</FormLabel>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={0.01}
                  placeholder="0,00"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Catégorie</FormLabel>
                <Select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  placeholder="Notes supplémentaires..."
                />
              </FormControl>

              <Alert status="info">
                <AlertIcon />
                Les justificatifs doivent être téléchargés depuis la page principale
              </Alert>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onExpenseClose}>Annuler</Button>
              <Button colorScheme="orange" onClick={handleAddExpense}>Ajouter</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageLayout>
  );
}
