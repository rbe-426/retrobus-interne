import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Divider,
  useColorModeValue,
  Icon,
  Container,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  List,
  ListItem,
  ListIcon,
  UnorderedList,
  Alert,
  AlertIcon,
  Spinner,
  Center,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Checkbox,
  IconButton,
  Select,
} from '@chakra-ui/react';
import { FiAward, FiCheckCircle, FiFileText, FiClock, FiDollarSign, FiUsers, FiRefreshCw, FiMail, FiUpload, FiTrash2 } from 'react-icons/fi';
import PageLayout from '../components/Layout/PageLayout';
import { subventionAPI } from '../api/subventionClient.js';

const EXPENSE_CATEGORIES = ['FUEL', 'MAINTENANCE', 'INSURANCE', 'MATERIAL', 'ADMINISTRATIVE', 'OTHER'];

export default function SubventionCampaign() {
  const cardBg = useColorModeValue('white', 'gray.800');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const alertBg = useColorModeValue('blue.50', 'blue.900');
  const contactCardBg = useColorModeValue('orange.50', 'orange.900');
  const toast = useToast();
  
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [userExpenses, setUserExpenses] = useState([]);
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  
  // Form states
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'OTHER',
    notes: ''
  });
  
  const [documentForm, setDocumentForm] = useState({
    documentType: '',
    file: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les campagnes depuis l'API
  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await subventionAPI.getAll();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement campagnes:', err);
      setError('Impossible de charger les campagnes');
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les campagnes de subvention',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCampaigns();
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(loadCampaigns, 300000);
    return () => clearInterval(interval);
  }, [loadCampaigns]);

  // Séparer les campagnes par statut
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE' && new Date(c.deadline) > new Date());
  const upcomingCampaigns = campaigns.filter(c => c.status === 'ACTIVE' && new Date(c.deadline) <= new Date());

  // Ouvrir le modal de détails
  const handleOpenDetail = async (campaign) => {
    setSelectedCampaign(campaign);
    // Charger les dépenses soumises par l'utilisateur
    try {
      const expenses = await subventionAPI.getExpenses(campaign.id);
      setUserExpenses(Array.isArray(expenses) ? expenses : []);
    } catch (error) {
      console.error('Erreur chargement dépenses:', error);
      setUserExpenses([]);
    }
    onDetailOpen();
  };

  // Soumettre une dépense
  const handleSubmitExpense = async () => {
    try {
      if (!expenseForm.description || !expenseForm.amount) {
        toast({ title: 'Erreur', description: 'Description et montant sont requis', status: 'error', duration: 3000, isClosable: true });
        return;
      }

      await subventionAPI.createExpense(selectedCampaign.id, {
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        notes: expenseForm.notes
      });

      toast({ title: 'Succès', description: 'Dépense soumise avec succès', status: 'success', duration: 3000, isClosable: true });
      
      // Recharger les dépenses
      const expenses = await subventionAPI.getExpenses(selectedCampaign.id);
      setUserExpenses(Array.isArray(expenses) ? expenses : []);
      
      // Réinitialiser le formulaire
      setExpenseForm({ description: '', amount: '', category: 'OTHER', notes: '' });
    } catch (error) {
      console.error('Erreur soumission dépense:', error);
      toast({ title: 'Erreur', description: 'Impossible de soumettre la dépense', status: 'error', duration: 3000, isClosable: true });
    }
  };

  // Supprimer une dépense
  const handleDeleteExpense = async (expenseId) => {
    try {
      await subventionAPI.deleteExpense(selectedCampaign.id, expenseId);
      toast({ title: 'Succès', description: 'Dépense supprimée', status: 'success', duration: 3000, isClosable: true });
      setUserExpenses(userExpenses.filter(e => e.id !== expenseId));
    } catch (error) {
      console.error('Erreur suppression dépense:', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer la dépense', status: 'error', duration: 3000, isClosable: true });
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="Campagne de Subvention"
        subtitle="Opportunités de financement pour RétroBus Essonne"
        headerVariant="card"
        bgGradient="linear(to-r, orange.400, orange.600)"
        titleSize="lg"
        titleWeight="700"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard/home" },
          { label: "MyRBE", href: "/dashboard/myrbe" },
          { label: "Campagne de Subvention", href: "/dashboard/subvention-campaign" }
        ]}
      >
        <Center h="400px">
          <VStack spacing={4}>
            <Spinner size="lg" color="orange.500" />
            <Text>Chargement des campagnes...</Text>
          </VStack>
        </Center>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Campagne de Subvention"
      subtitle="Opportunités de financement pour RétroBus Essonne"
      headerVariant="card"
      bgGradient="linear(to-r, orange.400, orange.600)"
      titleSize="lg"
      titleWeight="700"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/home" },
        { label: "MyRBE", href: "/dashboard/myrbe" },
        { label: "Campagne de Subvention", href: "/dashboard/subvention-campaign" }
      ]}
    >
      <VStack spacing={6} align="stretch">
        {/* Bouton Rafraîchir */}
        <HStack justify="flex-end">
          <Button
            leftIcon={<FiRefreshCw />}
            onClick={loadCampaigns}
            isLoading={loading}
            variant="outline"
            colorScheme="orange"
            size="sm"
          >
            Rafraîchir
          </Button>
        </HStack>

        {/* Alerte d'information */}
        <Alert
          status="info"
          variant="subtle"
          flexDirection="column"
          alignItems="flex-start"
          borderRadius="md"
          bg={alertBg}
        >
          <HStack mb={2}>
            <AlertIcon />
            <Heading size="md">Financements disponibles</Heading>
          </HStack>
          <Text fontSize="sm">
            Découvrez les opportunités de subvention adaptées à RétroBus Essonne. Contactez l'administration pour plus de détails sur chaque campagne.
          </Text>
        </Alert>

        {/* Section Campagnes actives */}
        {activeCampaigns.length > 0 ? (
          <Box>
            <Heading size="lg" mb={4}>Campagnes actives ({activeCampaigns.length})</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {activeCampaigns.map((campaign) => {
                const amountRange = campaign.minAmount && campaign.maxAmount 
                  ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.minAmount)} - ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.maxAmount)}`
                  : campaign.minAmount 
                  ? `À partir de ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.minAmount)}`
                  : 'Montant à confirmer';

                return (
                  <Card key={campaign.id} bg={cardBg} borderRadius="lg" boxShadow="md" _hover={{ boxShadow: 'lg' }} transition="all 0.3s">
                    <CardHeader pb={2}>
                      <HStack justify="space-between" mb={2}>
                        <Heading size="md" color="orange.600">{campaign.title}</Heading>
                        <Badge colorScheme="green" px={2} py={1}>Actif</Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">{campaign.organization}</Text>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                      <VStack align="start" spacing={3}>
                        <Box>
                          <Text fontWeight="600" color="orange.500">{amountRange}</Text>
                          {campaign.description && <Text fontSize="sm" color="gray.600">{campaign.description}</Text>}
                        </Box>
                        <HStack color="gray.600" fontSize="sm">
                          <Icon as={FiClock} />
                          <Text>Échéance : {new Date(campaign.deadline).toLocaleDateString('fr-FR')}</Text>
                        </HStack>
                        <HStack width="100%" spacing={2} mt={2}>
                          <Button colorScheme="orange" size="sm" width="100%" leftIcon={<FiUpload />} onClick={() => handleOpenDetail(campaign)}>
                            Soumettre dossier
                          </Button>
                          {campaign.websiteUrl && (
                            <Button colorScheme="orange" variant="outline" size="sm" leftIcon={<FiFileText />} as="a" href={campaign.websiteUrl} target="_blank">
                              Info
                            </Button>
                          )}
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                );
              })}
            </SimpleGrid>
          </Box>
        ) : (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Box>
              <Heading size="md">Aucune campagne active</Heading>
              <Text fontSize="sm" mt={2}>Les campagnes seront actualisées régulièrement.</Text>
            </Box>
          </Alert>
        )}

        {/* Section Onglets - Détails */}
        <Box>
          <Tabs variant="soft-rounded" colorScheme="orange">
            <TabList>
              <Tab>Processus</Tab>
              <Tab>Documents requis</Tab>
              <Tab>Critères de sélection</Tab>
              <Tab>FAQ</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  {[
                    { icon: FiFileText, title: "1. Préparation du dossier", description: "Rassemblez tous les documents nécessaires" },
                    { icon: FiUsers, title: "2. Validation interne", description: "Accord du bureau de l'association" },
                    { icon: FiCheckCircle, title: "3. Soumission", description: "Envoi du dossier auprès de l'organisme" },
                    { icon: FiClock, title: "4. Suivi", description: "Suivi du traitement de la demande" },
                  ].map((step, idx) => (
                    <Card key={idx} bg={cardBg} borderRadius="lg">
                      <CardBody>
                        <VStack spacing={3} align="center" textAlign="center">
                          <Icon as={step.icon} w={8} h={8} color="orange.500" />
                          <Heading size="sm">{step.title}</Heading>
                          <Text fontSize="sm" color="gray.600">{step.description}</Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </TabPanel>
              <TabPanel>
                <VStack align="start" spacing={3}>
                  <Heading size="sm">Pièces à joindre</Heading>
                  <List spacing={2}>
                    <ListItem display="flex" alignItems="start">
                      <ListIcon as={FiCheckCircle} color="green.500" mt={0.5} />
                      <Text>Statuts de l'association</Text>
                    </ListItem>
                    <ListItem display="flex" alignItems="start">
                      <ListIcon as={FiCheckCircle} color="green.500" mt={0.5} />
                      <Text>Procès-verbaux des assemblées récentes</Text>
                    </ListItem>
                    <ListItem display="flex" alignItems="start">
                      <ListIcon as={FiCheckCircle} color="green.500" mt={0.5} />
                      <Text>Comptes de résultat et bilans (2 derniers exercices)</Text>
                    </ListItem>
                    <ListItem display="flex" alignItems="start">
                      <ListIcon as={FiCheckCircle} color="green.500" mt={0.5} />
                      <Text>Dossier descriptif du projet</Text>
                    </ListItem>
                    <ListItem display="flex" alignItems="start">
                      <ListIcon as={FiCheckCircle} color="green.500" mt={0.5} />
                      <Text>Budget prévisionnel détaillé</Text>
                    </ListItem>
                    <ListItem display="flex" alignItems="start">
                      <ListIcon as={FiCheckCircle} color="green.500" mt={0.5} />
                      <Text>Justificatifs des quotes-parts pour l'apport personnel</Text>
                    </ListItem>
                  </List>
                </VStack>
              </TabPanel>
              <TabPanel>
                <VStack align="start" spacing={3}>
                  <Heading size="sm">Critères évalués</Heading>
                  <List spacing={2}>
                    <ListItem display="flex" alignItems="start">
                      <ListIcon as={FiCheckCircle} color="orange.500" mt={0.5} />
                      <Text>Inscription de l'association depuis au moins 2 ans</Text>
                    </ListItem>
                    <ListItem display="flex" alignItems="start">
                      <ListIcon as={FiCheckCircle} color="orange.500" mt={0.5} />
                      <Text>Viabilité financière démontrée</Text>
                    </ListItem>
                    <ListItem display="flex" alignItems="start">
                      <ListIcon as={FiCheckCircle} color="orange.500" mt={0.5} />
                      <Text>Impact social ou environnemental du projet</Text>
                    </ListItem>
                    <ListItem display="flex" alignItems="start">
                      <ListIcon as={FiCheckCircle} color="orange.500" mt={0.5} />
                      <Text>Partenariats et collaborations</Text>
                    </ListItem>
                    <ListItem display="flex" alignItems="start">
                      <ListIcon as={FiCheckCircle} color="orange.500" mt={0.5} />
                      <Text>Budget réaliste et bien justifié</Text>
                    </ListItem>
                  </List>
                </VStack>
              </TabPanel>
              <TabPanel>
                <VStack align="start" spacing={4}>
                  <Box>
                    <Heading size="sm" mb={2}>Quel est le montant maximum demandable ?</Heading>
                    <Text color="gray.600">Le montant varie selon les dispositifs, généralement entre 3,000 et 30,000 €. Consultez les conditions de chaque campagne.</Text>
                  </Box>
                  <Box>
                    <Heading size="sm" mb={2}>Combien de temps avant d'avoir une réponse ?</Heading>
                    <Text color="gray.600">Entre 2 et 6 mois selon le dispositif. Nous vous tiendrons informés de l'avancement du dossier.</Text>
                  </Box>
                  <Box>
                    <Heading size="sm" mb={2}>Peut-on cumuler plusieurs subventions ?</Heading>
                    <Text color="gray.600">Oui, généralement possible mais avec des conditions de cofinancement. Contactez l'administration pour vérifier la compatibilité.</Text>
                  </Box>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        {/* Section Contact */}
        <Card bg={contactCardBg} borderRadius="lg" borderWidth="2px" borderColor="orange.300">
          <CardBody>
            <VStack align="start" spacing={3}>
              <HStack>
                <Icon as={FiUsers} w={6} h={6} color="orange.600" />
                <Heading size="md" color="orange.600">Besoin d'aide ?</Heading>
              </HStack>
              <Text color="gray.700">
                L'équipe administrative est disponible pour répondre à vos questions sur les campagnes de subvention.
              </Text>
              <Button colorScheme="orange" leftIcon={<Icon as={FiFileText} />}>
                Contacter l'administration
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Section Campagnes à venir */}
        {upcomingCampaigns.length > 0 && (
          <Box>
            <Heading size="lg" mb={4}>Campagnes expirées ({upcomingCampaigns.length})</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {upcomingCampaigns.map((campaign) => (
                <Card key={campaign.id} bg={cardBg} borderRadius="lg" opacity={0.8}>
                  <CardHeader pb={2}>
                    <HStack justify="space-between" mb={2}>
                      <Heading size="md" color="gray.600">{campaign.title}</Heading>
                      <Badge colorScheme="gray" px={2} py={1}>Expirée</Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600">{campaign.organization}</Text>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <Box>
                        <Text fontWeight="600" color="gray.500">
                          {campaign.minAmount && campaign.maxAmount 
                            ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.minAmount)} - ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(campaign.maxAmount)}`
                            : 'Montant à confirmer'}
                        </Text>
                        {campaign.description && <Text fontSize="sm" color="gray.600">{campaign.description}</Text>}
                      </Box>
                      <HStack color="gray.600" fontSize="sm">
                        <Icon as={FiClock} />
                        <Text>Échéance était : {new Date(campaign.deadline).toLocaleDateString('fr-FR')}</Text>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Modal - Détails campagne et soumission dépenses */}
        {selectedCampaign && (
          <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>
                <VStack align="start" spacing={1}>
                  <Heading size="md">{selectedCampaign.title}</Heading>
                  <Text fontSize="sm" color="gray.600">{selectedCampaign.organization}</Text>
                </VStack>
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack spacing={4} align="stretch">
                  {/* Détails campagne */}
                  <Box p={3} bg={sectionBg} borderRadius="md">
                    <VStack align="start" spacing={2} fontSize="sm">
                      <Box>
                        <Text fontWeight="600">📋 Description</Text>
                        <Text>{selectedCampaign.description}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="600">💰 Montants</Text>
                        <Text>
                          {selectedCampaign.minAmount && selectedCampaign.maxAmount 
                            ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(selectedCampaign.minAmount)} - ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(selectedCampaign.maxAmount)}`
                            : 'À définir'}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontWeight="600">⏰ Échéance</Text>
                        <Text>{new Date(selectedCampaign.deadline).toLocaleDateString('fr-FR')}</Text>
                      </Box>
                      {selectedCampaign.requiredDocuments && Array.isArray(selectedCampaign.requiredDocuments) && selectedCampaign.requiredDocuments.length > 0 && (
                        <Box>
                          <Text fontWeight="600">📄 Documents requis</Text>
                          <UnorderedList fontSize="sm" ml={4}>
                            {selectedCampaign.requiredDocuments.map((doc, idx) => (
                              <ListItem key={idx}>{doc}</ListItem>
                            ))}
                          </UnorderedList>
                        </Box>
                      )}
                    </VStack>
                  </Box>

                  <Divider />

                  {/* Formulaire soumission dépense */}
                  <Box>
                    <Heading size="sm" mb={3}>Soumettre une dépense</Heading>
                    <VStack spacing={3}>
                      <FormControl isRequired>
                        <FormLabel>Description</FormLabel>
                        <Input
                          value={expenseForm.description}
                          onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                          placeholder="Ex: Carburant, maintenance, etc."
                        />
                      </FormControl>

                      <HStack spacing={3} width="100%">
                        <FormControl isRequired flex={1}>
                          <FormLabel>Montant (€)</FormLabel>
                          <Input
                            type="number"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            placeholder="0,00"
                            min={0}
                            step={0.01}
                          />
                        </FormControl>

                        <FormControl flex={1}>
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
                      </HStack>

                      <FormControl>
                        <FormLabel>Notes/Observations</FormLabel>
                        <Textarea
                          value={expenseForm.notes}
                          onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                          placeholder="Détails supplémentaires..."
                          size="sm"
                          rows={3}
                        />
                      </FormControl>

                      <Alert status="info" borderRadius="md" fontSize="sm">
                        <AlertIcon />
                        Les justificatifs (factures, reçus) doivent être téléchargés avec votre dépense
                      </Alert>

                      <Button colorScheme="orange" width="100%" onClick={handleSubmitExpense} leftIcon={<FiUpload />}>
                        Soumettre la dépense
                      </Button>
                    </VStack>
                  </Box>

                  {userExpenses.length > 0 && (
                    <>
                      <Divider />
                      <Box>
                        <Heading size="sm" mb={3}>Vos soumissions ({userExpenses.length})</Heading>
                        <VStack spacing={2} align="stretch">
                          {userExpenses.map(expense => (
                            <HStack key={expense.id} p={2} bg={sectionBg} borderRadius="md" justify="space-between" align="start">
                              <VStack align="start" spacing={1} flex={1}>
                                <Text fontWeight="500" fontSize="sm">{expense.description}</Text>
                                <HStack fontSize="xs" color="gray.600" spacing={2}>
                                  <Text>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(expense.amount)}</Text>
                                  <Text>•</Text>
                                  <Text>{expense.category}</Text>
                                  <Text>•</Text>
                                  <Badge size="sm" colorScheme={
                                    expense.status === 'APPROVED' ? 'green' :
                                    expense.status === 'REJECTED' ? 'red' : 'blue'
                                  }>
                                    {expense.status}
                                  </Badge>
                                </HStack>
                              </VStack>
                              {expense.status === 'SUBMITTED' && (
                                <IconButton
                                  icon={<FiTrash2 />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                />
                              )}
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    </>
                  )}
                </VStack>
              </ModalBody>

              <ModalFooter>
                <Button variant="ghost" onClick={onDetailClose}>Fermer</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      </VStack>
    </PageLayout>
  );
}
