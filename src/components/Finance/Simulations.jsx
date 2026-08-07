import React, { useState, useEffect } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Badge, useToast, Icon, Grid, Stat,
  StatLabel, StatNumber, StatHelpText, StatArrow, Alert, AlertIcon,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, Textarea, NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Select, useDisclosure, Spinner, Flex, Table, Thead, Tbody, Tr, Th, Td,
  SimpleGrid, Progress, Tooltip
} from "@chakra-ui/react";
import {
  FiPlus, FiTrash2, FiPlay, FiDownload, FiEdit2, FiTrendingUp, FiActivity
} from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";

/**
 * Simulations - Scénarios de simulation financière
 * Permet de créer et analyser différents scénarios de trésorerie
 */
const Simulations = () => {
  const {
    simulationData,
    createSimulationScenario,
    loadScenarioDetails,
    addIncomeItem,
    addExpenseItem,
    removeIncomeItem,
    removeExpenseItem,
    runSimulation,
    deleteScenario,
    downloadScenarioPdf,
    loading,
    loadFinanceData
  } = useFinanceData();

  const [isCreating, setIsCreating] = useState(false);
  const [editingScenario, setEditingScenario] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const toast = useToast();

  // Charger les scénarios au montage
  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onClose: onCreateClose
  } = useDisclosure();

  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose
  } = useDisclosure();

  const {
    isOpen: isResultsOpen,
    onOpen: onResultsOpen,
    onClose: onResultsClose
  } = useDisclosure();

  const [newScenario, setNewScenario] = useState({
    name: "",
    description: "",
    projectionMonths: 12
  });

  const [newIncomeItem, setNewIncomeItem] = useState({
    description: "",
    amount: "",
    category: "ADHESION",
    frequency: "MONTHLY"
  });

  const [newExpenseItem, setNewExpenseItem] = useState({
    description: "",
    amount: "",
    category: "MAINTENANCE",
    frequency: "MONTHLY"
  });

  const handleCreateScenario = async () => {
    if (!newScenario.name || !newScenario.description) {
      toast({
        title: "Erreur",
        description: "Nom et description sont requis",
        status: "warning"
      });
      return;
    }

    setIsCreating(true);
    try {
      const result = await createSimulationScenario(newScenario);
      if (result) {
        setNewScenario({
          name: "",
          description: "",
          projectionMonths: 12
        });
        onCreateClose();
        toast({
          title: "Scénario créé",
          description: "Vous pouvez maintenant ajouter des recettes et dépenses",
          status: "success"
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditScenario = async (scenario) => {
    try {
      const details = await loadScenarioDetails(scenario.id);
      setEditingScenario(details);
      onEditOpen();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails du scénario",
        status: "error"
      });
    }
  };

  const handleAddIncome = async () => {
    if (!newIncomeItem.description || !newIncomeItem.amount) {
      toast({
        title: "Champs requis",
        description: "Description et montant sont obligatoires",
        status: "warning"
      });
      return;
    }

    try {
      await addIncomeItem(editingScenario.id, {
        ...newIncomeItem,
        amount: parseFloat(newIncomeItem.amount)
      });

      setNewIncomeItem({
        description: "",
        amount: "",
        category: "ADHESION",
        frequency: "MONTHLY"
      });

      // Recharger les détails du scénario
      const updated = await loadScenarioDetails(editingScenario.id);
      setEditingScenario(updated);

      toast({
        title: "Recette ajoutée",
        status: "success",
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la recette",
        status: "error"
      });
    }
  };

  const handleAddExpense = async () => {
    if (!newExpenseItem.description || !newExpenseItem.amount) {
      toast({
        title: "Champs requis",
        description: "Description et montant sont obligatoires",
        status: "warning"
      });
      return;
    }

    try {
      await addExpenseItem(editingScenario.id, {
        ...newExpenseItem,
        amount: parseFloat(newExpenseItem.amount)
      });

      setNewExpenseItem({
        description: "",
        amount: "",
        category: "MAINTENANCE",
        frequency: "MONTHLY"
      });

      const updated = await loadScenarioDetails(editingScenario.id);
      setEditingScenario(updated);

      toast({
        title: "Dépense ajoutée",
        status: "success",
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la dépense",
        status: "error"
      });
    }
  };

  const handleRunSimulation = async (scenarioId) => {
    try {
      const results = await runSimulation(scenarioId, {
        startingBalance: 0,
        projectionMonths: 12
      });
      setSimulationResults(results);
      onResultsOpen();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'exécuter la simulation",
        status: "error"
      });
    }
  };

  const handleDeleteScenario = async (scenarioId) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce scénario ?")) {
      try {
        await deleteScenario(scenarioId);
        toast({
          title: "Scénario supprimé",
          status: "success",
          duration: 2000
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le scénario",
          status: "error"
        });
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"
    }).format(amount || 0);
  };

  const getFrequencyLabel = (frequency) => {
    const labels = {
      MONTHLY: "Mensuel",
      QUARTERLY: "Trimestriel",
      YEARLY: "Annuel",
      SEMI_ANNUAL: "Semestriel",
      WEEKLY: "Hebdomadaire",
      ONE_SHOT: "Ponctuel"
    };
    return labels[frequency] || frequency;
  };

  const scenarios = simulationData?.scenarios || [];

  return (
    <VStack align="stretch" spacing={6}>
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">Simulations financières</Heading>
          <Text color="gray.500" fontSize="sm">
            Créez et analysez différents scénarios de trésorerie
          </Text>
        </Box>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="teal"
          onClick={onCreateOpen}
          isLoading={loading}
        >
          Nouveau scénario
        </Button>
      </HStack>

      {/* Scénarios */}
      {loading && scenarios.length === 0 ? (
        <Flex justify="center" p={8}>
          <Spinner size="lg" />
        </Flex>
      ) : scenarios.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Aucun scénario créé</Text>
            <Text fontSize="sm">
              Créez un scénario pour commencer à simuler votre trésorerie
            </Text>
          </Box>
        </Alert>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {scenarios.map(scenario => {
            const monthlyNet =
              (scenario.totalMonthlyIncome || 0) -
              (scenario.totalMonthlyExpenses || 0);
            const isComplete = scenario.itemsCount > 0;

            return (
              <Card
                key={scenario.id}
                borderTop="4px solid"
                borderTopColor={
                  monthlyNet >= 0 ? "green.400" : "red.400"
                }
              >
                <CardHeader>
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                      <Heading size="md">{scenario.name}</Heading>
                      <Text fontSize="sm" color="gray.500" noOfLines={2}>
                        {scenario.description}
                      </Text>
                    </VStack>
                    <Badge
                      colorScheme={isComplete ? "green" : "orange"}
                    >
                      {isComplete ? "Complet" : "Brouillon"}
                    </Badge>
                  </HStack>
                </CardHeader>

                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    {/* Statistiques */}
                    <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                      <Stat>
                        <StatLabel fontSize="xs">Revenus/mois</StatLabel>
                        <StatNumber color="green.600" fontSize="lg">
                          {formatCurrency(scenario.totalMonthlyIncome)}
                        </StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel fontSize="xs">Dépenses/mois</StatLabel>
                        <StatNumber color="red.600" fontSize="lg">
                          {formatCurrency(scenario.totalMonthlyExpenses)}
                        </StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel fontSize="xs">Résultat/mois</StatLabel>
                        <StatNumber
                          color={monthlyNet >= 0 ? "green.600" : "red.600"}
                          fontSize="lg"
                        >
                          {formatCurrency(monthlyNet)}
                        </StatNumber>
                      </Stat>
                    </Grid>

                    {/* Éléments */}
                    <HStack fontSize="sm" color="gray.600">
                      <Text>
                        {(scenario.incomeItems?.length || 0)} recette(s)
                      </Text>
                      <Text>•</Text>
                      <Text>
                        {(scenario.expenseItems?.length || 0)} dépense(s)
                      </Text>
                    </HStack>

                    {/* Actions */}
                    <HStack spacing={2} pt={2}>
                      <Button
                        size="sm"
                        leftIcon={<FiEdit2 />}
                        variant="outline"
                        onClick={() => handleEditScenario(scenario)}
                      >
                        Éditer
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<FiPlay />}
                        colorScheme="teal"
                        isDisabled={!isComplete}
                        onClick={() => handleRunSimulation(scenario.id)}
                        isLoading={loading}
                      >
                        Simuler
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<FiDownload />}
                        variant="ghost"
                        isDisabled={!isComplete}
                        onClick={() =>
                          downloadScenarioPdf(scenario.id, scenario.name)
                        }
                      >
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={<FiTrash2 />}
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleDeleteScenario(scenario.id)}
                      >
                        Supprimer
                      </Button>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {/* Modal Création */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Créer un scénario de simulation</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nom du scénario</FormLabel>
                <Input
                  placeholder="Ex: Scénario optimiste 2025"
                  value={newScenario.name}
                  onChange={(e) =>
                    setNewScenario(prev => ({
                      ...prev,
                      name: e.target.value
                    }))
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Décrivez les hypothèses de ce scénario..."
                  value={newScenario.description}
                  onChange={(e) =>
                    setNewScenario(prev => ({
                      ...prev,
                      description: e.target.value
                    }))
                  }
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Période de projection (mois)</FormLabel>
                <NumberInput
                  value={newScenario.projectionMonths}
                  onChange={(value) =>
                    setNewScenario(prev => ({
                      ...prev,
                      projectionMonths: parseInt(value) || 12
                    }))
                  }
                  min={1}
                  max={60}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Annuler
            </Button>
            <Button
              colorScheme="teal"
              onClick={handleCreateScenario}
              isLoading={isCreating}
              leftIcon={<FiActivity />}
            >
              Créer le scénario
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Édition (recettes/dépenses) */}
      {editingScenario && (
        <Modal isOpen={isEditOpen} onClose={onEditClose} size="6xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Text>Édition: {editingScenario.name}</Text>
                <Badge colorScheme="blue">Étape 2: Éléments</Badge>
              </HStack>
            </ModalHeader>

            <ModalBody>
              <Grid templateColumns="1fr 1fr" gap={6}>
                {/* Recettes */}
                <VStack align="stretch" spacing={4}>
                  <Card>
                    <CardHeader>
                      <Heading size="sm" color="green.600">
                        💰 Recettes ({editingScenario.incomeItems?.length || 0})
                      </Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={3}>
                        {/* Ajout recette */}
                        <HStack width="100%">
                          <Input
                            size="sm"
                            placeholder="Description"
                            value={newIncomeItem.description}
                            onChange={(e) =>
                              setNewIncomeItem(prev => ({
                                ...prev,
                                description: e.target.value
                              }))
                            }
                          />
                          <NumberInput
                            size="sm"
                            width="100px"
                            value={newIncomeItem.amount}
                            onChange={(v) =>
                              setNewIncomeItem(prev => ({
                                ...prev,
                                amount: v
                              }))
                            }
                          >
                            <NumberInputField placeholder="Montant" />
                          </NumberInput>
                          <Select
                            size="sm"
                            width="120px"
                            value={newIncomeItem.frequency}
                            onChange={(e) =>
                              setNewIncomeItem(prev => ({
                                ...prev,
                                frequency: e.target.value
                              }))
                            }
                          >
                            <option value="MONTHLY">Mensuel</option>
                            <option value="QUARTERLY">Trimestriel</option>
                            <option value="YEARLY">Annuel</option>
                            <option value="ONE_SHOT">Ponctuel</option>
                          </Select>
                          <Button
                            size="sm"
                            colorScheme="green"
                            onClick={handleAddIncome}
                          >
                            +
                          </Button>
                        </HStack>

                        {/* Liste recettes */}
                        <VStack width="100%" spacing={2}>
                          {(editingScenario.incomeItems || []).map(item => (
                            <HStack
                              key={item.id}
                              width="100%"
                              justify="space-between"
                              p={2}
                              bg="green.50"
                              borderRadius="md"
                            >
                              <VStack align="start" spacing={0} flex={1}>
                                <Text fontSize="sm" fontWeight="bold">
                                  {item.description}
                                </Text>
                                <Text fontSize="xs" color="gray.600">
                                  {formatCurrency(item.amount)} -{" "}
                                  {getFrequencyLabel(item.frequency)}
                                </Text>
                              </VStack>
                              <Button
                                size="xs"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => removeIncomeItem(item.id, editingScenario.id)}
                              >
                                ✕
                              </Button>
                            </HStack>
                          ))}
                        </VStack>

                        <Box
                          width="100%"
                          p={2}
                          bg="green.100"
                          borderRadius="md"
                        >
                          <Text fontSize="sm" fontWeight="bold" color="green.700">
                            Total mensuel:{" "}
                            {formatCurrency(editingScenario.totalMonthlyIncome)}
                          </Text>
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>

                {/* Dépenses */}
                <VStack align="stretch" spacing={4}>
                  <Card>
                    <CardHeader>
                      <Heading size="sm" color="red.600">
                        💸 Dépenses ({editingScenario.expenseItems?.length || 0})
                      </Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={3}>
                        {/* Ajout dépense */}
                        <HStack width="100%">
                          <Input
                            size="sm"
                            placeholder="Description"
                            value={newExpenseItem.description}
                            onChange={(e) =>
                              setNewExpenseItem(prev => ({
                                ...prev,
                                description: e.target.value
                              }))
                            }
                          />
                          <NumberInput
                            size="sm"
                            width="100px"
                            value={newExpenseItem.amount}
                            onChange={(v) =>
                              setNewExpenseItem(prev => ({
                                ...prev,
                                amount: v
                              }))
                            }
                          >
                            <NumberInputField placeholder="Montant" />
                          </NumberInput>
                          <Select
                            size="sm"
                            width="120px"
                            value={newExpenseItem.frequency}
                            onChange={(e) =>
                              setNewExpenseItem(prev => ({
                                ...prev,
                                frequency: e.target.value
                              }))
                            }
                          >
                            <option value="MONTHLY">Mensuel</option>
                            <option value="QUARTERLY">Trimestriel</option>
                            <option value="YEARLY">Annuel</option>
                            <option value="ONE_SHOT">Ponctuel</option>
                          </Select>
                          <Button
                            size="sm"
                            colorScheme="red"
                            onClick={handleAddExpense}
                          >
                            +
                          </Button>
                        </HStack>

                        {/* Liste dépenses */}
                        <VStack width="100%" spacing={2}>
                          {(editingScenario.expenseItems || []).map(item => (
                            <HStack
                              key={item.id}
                              width="100%"
                              justify="space-between"
                              p={2}
                              bg="red.50"
                              borderRadius="md"
                            >
                              <VStack align="start" spacing={0} flex={1}>
                                <Text fontSize="sm" fontWeight="bold">
                                  {item.description}
                                </Text>
                                <Text fontSize="xs" color="gray.600">
                                  {formatCurrency(item.amount)} -{" "}
                                  {getFrequencyLabel(item.frequency)}
                                </Text>
                              </VStack>
                              <Button
                                size="xs"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => removeExpenseItem(item.id, editingScenario.id)}
                              >
                                ✕
                              </Button>
                            </HStack>
                          ))}
                        </VStack>

                        <Box
                          width="100%"
                          p={2}
                          bg="red.100"
                          borderRadius="md"
                        >
                          <Text fontSize="sm" fontWeight="bold" color="red.700">
                            Total mensuel:{" "}
                            {formatCurrency(
                              editingScenario.totalMonthlyExpenses
                            )}
                          </Text>
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
              </Grid>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onEditClose}>
                Fermer
              </Button>
              <Button
                colorScheme="teal"
                leftIcon={<FiPlay />}
                onClick={() => {
                  handleRunSimulation(editingScenario.id);
                  onEditClose();
                }}
                isLoading={loading}
                isDisabled={!editingScenario || !((editingScenario.incomeItems?.length || 0) + (editingScenario.expenseItems?.length || 0))}
              >
                Exécuter la simulation
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Modal Résultats */}
      {simulationResults && (
        <Modal isOpen={isResultsOpen} onClose={onResultsClose} size="6xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <HStack>
                <Text>Résultats: {simulationResults.scenarioName}</Text>
                <Badge
                  colorScheme={
                    simulationResults.summary?.isPositive
                      ? "green"
                      : "red"
                  }
                >
                  {simulationResults.summary?.isPositive
                    ? "Positif"
                    : "Déficitaire"}
                </Badge>
              </HStack>
            </ModalHeader>

            <ModalBody>
              <VStack spacing={6}>
                {/* Résumé */}
                <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel>Solde initial</StatLabel>
                        <StatNumber>
                          {formatCurrency(simulationResults.startingBalance)}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel>Solde final</StatLabel>
                        <StatNumber
                          color={
                            simulationResults.finalBalance >= 0
                              ? "green.600"
                              : "red.600"
                          }
                        >
                          {formatCurrency(simulationResults.finalBalance)}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel>Évolution totale</StatLabel>
                        <StatNumber
                          color={
                            simulationResults.totalChange >= 0
                              ? "green.600"
                              : "red.600"
                          }
                        >
                          <StatArrow
                            type={
                              simulationResults.totalChange >= 0
                                ? "increase"
                                : "decrease"
                            }
                          />
                          {formatCurrency(
                            Math.abs(simulationResults.totalChange)
                          )}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel>Résultat/mois</StatLabel>
                        <StatNumber
                          color={
                            simulationResults.monthlyNet >= 0
                              ? "green.600"
                              : "red.600"
                          }
                        >
                          {formatCurrency(simulationResults.monthlyNet)}
                        </StatNumber>
                      </Stat>
                    </CardBody>
                  </Card>
                </SimpleGrid>

                {/* Projection mensuelle */}
                <Card width="100%">
                  <CardHeader>
                    <Heading size="sm">Évolution mensuelle</Heading>
                  </CardHeader>
                  <CardBody p={0}>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr bg="gray.50">
                          <Th>Mois</Th>
                          <Th isNumeric>Solde début</Th>
                          <Th isNumeric>Recettes</Th>
                          <Th isNumeric>Dépenses</Th>
                          <Th isNumeric>Résultat</Th>
                          <Th isNumeric>Solde fin</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {simulationResults.projection
                          .slice(0, 12)
                          .map(month => (
                            <Tr key={month.month}>
                              <Td>Mois {month.month}</Td>
                              <Td isNumeric>
                                {formatCurrency(month.startBalance)}
                              </Td>
                              <Td isNumeric color="green.600">
                                +{formatCurrency(month.income)}
                              </Td>
                              <Td isNumeric color="red.600">
                                -{formatCurrency(month.expenses)}
                              </Td>
                              <Td
                                isNumeric
                                color={
                                  month.net >= 0 ? "green.600" : "red.600"
                                }
                              >
                                {month.net >= 0 ? "+" : ""}
                                {formatCurrency(month.net)}
                              </Td>
                              <Td
                                isNumeric
                                fontWeight="bold"
                                color={
                                  month.endBalance >= 0
                                    ? "green.600"
                                    : "red.600"
                                }
                              >
                                {formatCurrency(month.endBalance)}
                              </Td>
                            </Tr>
                          ))}
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button onClick={onResultsClose}>Fermer</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </VStack>
  );
};

export default Simulations;
