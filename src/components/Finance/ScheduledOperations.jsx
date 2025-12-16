import React, { useState, useEffect, useCallback } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Badge, useToast, SimpleGrid, Stat, StatLabel, StatNumber,
  Table, Thead, Tbody, Tr, Th, Td, Alert, AlertIcon, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel, Input, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Select, useDisclosure, Spinner, Flex, Tooltip, Progress, Menu, MenuButton, MenuList, MenuItem, MenuDivider
} from "@chakra-ui/react";
import { FiCheck, FiX, FiPlus, FiTrash2, FiClock, FiTrendingUp, FiMoreVertical } from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * ScheduledOperations - Opérations programmées avec progression visuelle
 * Affiche les échéanciers avec courbe de couleur indiquant la progression
 */
const FinanceScheduledOps = () => {
  const {
    scheduledOperations,
    addScheduledOperation,
    deleteScheduledOperation,
    toggleScheduledOperation,
    loading,
    loadFinanceData
  } = useFinanceData();

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    type: "SCHEDULED_PAYMENT",
    amount: "",
    description: "",
    frequency: "MONTHLY",
    nextDate: new Date().toISOString().split("T")[0],
    totalAmount: ""
  });
  
  // State pour ajouter un paiement supplémentaire
  const [selectedOperationId, setSelectedOperationId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isPaymentOpen, onOpen: onPaymentOpen, onClose: onPaymentClose } = useDisclosure();

  // Charger les données au montage du composant
  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const handleAdd = useCallback(async () => {
    if (!formData.amount || !formData.description) {
      toast({
        title: "Erreur",
        description: "Remplissez tous les champs",
        status: "error"
      });
      return;
    }

    setIsAdding(true);
    try {
      const result = await addScheduledOperation(formData);
      if (result) {
        setFormData({
          type: "SCHEDULED_PAYMENT",
          amount: "",
          description: "",
          frequency: "MONTHLY",
          nextDate: new Date().toISOString().split("T")[0],
          totalAmount: ""
        });
        onClose();
        toast({
          title: "Opération créée",
          status: "success",
          duration: 2000,
          isClosable: true
        });
        // Recharger les données après création
        await loadFinanceData();
      }
    } finally {
      setIsAdding(false);
    }
  }, [formData, addScheduledOperation, onClose, toast, loadFinanceData]);

  const handleDelete = useCallback(async (id) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette opération ?")) {
      try {
        await deleteScheduledOperation(id);
        toast({
          title: "Opération supprimée",
          status: "success",
          duration: 2000,
          isClosable: true
        });
        // Recharger les données après suppression
        await loadFinanceData();
      } catch (error) {
        toast({
          title: "Erreur",
          description: error.message || "Impossible de supprimer l'opération",
          status: "error"
        });
      }
    }
  }, [deleteScheduledOperation, toast, loadFinanceData]);

  const handleAddPayment = useCallback(async () => {
    if (!paymentAmount || !selectedOperationId) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un montant",
        status: "error"
      });
      return;
    }

    setIsAddingPayment(true);
    try {
      const operation = scheduledOperations.find(op => op.id === selectedOperationId);
      if (!operation) throw new Error("Opération introuvable");

      // Décrémenter remainingTotalAmount du montant payé
      const newRemaining = Math.max(
        (operation.remainingTotalAmount ?? operation.totalAmount) - parseFloat(paymentAmount),
        0
      );

      // Mettre à jour l'opération
      await fetch(`${API_BASE}/api/finance/scheduled-operations/${selectedOperationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          ...operation,
          remainingTotalAmount: newRemaining
        })
      });

      setPaymentAmount("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      onPaymentClose();
      
      toast({
        title: "Paiement enregistré",
        status: "success",
        duration: 2000,
        isClosable: true
      });
      
      // Recharger les données
      await loadFinanceData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer le paiement",
        status: "error"
      });
    } finally {
      setIsAddingPayment(false);
    }
  }, [paymentAmount, selectedOperationId, scheduledOperations, toast, loadFinanceData]);

  const handleToggle = async (id, currentStatus) => {
    try {
      await toggleScheduledOperation(id, currentStatus);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        status: "error"
      });
    }
  };

  // Fonction pour calculer la progression et la couleur
  const calculateProgressColor = (percent) => {
    if (percent === null) return "#A0AEC0"; // gray.400
    if (percent >= 0.75) return "#22863a"; // green
    if (percent >= 0.4) return "#f59e0b"; // orange
    return "#dc2626"; // red
  };

  const calculateProgressPercent = (operation) => {
    if (!operation) return null;

    // Si totalAmount est défini, calculer la progression basée sur le montant
    if (
      Number.isFinite(operation.totalAmount) &&
      operation.totalAmount > 0
    ) {
      // remainingTotalAmount = ce qui reste à payer
      // Au départ, remainingTotalAmount = totalAmount (rien n'a été payé)
      // Donc: progress = 0%
      // Après 1er paiement: remainingTotalAmount = totalAmount - amount
      // Donc: progress = amount / totalAmount
      const remaining = operation.remainingTotalAmount ?? operation.totalAmount;
      const paid = Math.max(operation.totalAmount - remaining, 0);
      return Math.min(1, paid / operation.totalAmount);
    }

    // Sinon, basé sur le nombre de paiements (plan annuel)
    if (
      Number.isFinite(operation.plannedCountYear) &&
      operation.plannedCountYear > 0
    ) {
      const remainingCount = operation.remainingCountYear ?? 0;
      const paidCount = Math.max(
        (operation.plannedCountYear || 0) - remainingCount,
        0
      );
      return Math.min(1, paidCount / operation.plannedCountYear);
    }

    return null;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("fr-FR");
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

  const ops = scheduledOperations || [];
  const activeOps = ops.filter(op => op.isActive !== false);
  const totalMonthlyImpact = activeOps.reduce((sum, op) => {
    const multiplier =
      op.frequency === "MONTHLY" ? 1 : op.frequency === "WEEKLY" ? 4.33 : 1;
    const impact = op.type === "SCHEDULED_CREDIT" ? op.amount : -op.amount;
    return sum + impact * multiplier;
  }, 0);

  return (
    <VStack align="stretch" spacing={6}>
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">Opérations programmées</Heading>
          <Text color="gray.500" fontSize="sm">
            Gestion des paiements récurrents et échéanciers
          </Text>
        </Box>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="blue"
          onClick={onOpen}
          isLoading={loading}
        >
          Nouvelle opération
        </Button>
      </HStack>

      {/* Statistiques */}
      {activeOps.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Opérations actives</StatLabel>
                <StatNumber>{activeOps.length}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Impact mensuel</StatLabel>
                <StatNumber
                  color={totalMonthlyImpact >= 0 ? "green.600" : "red.600"}
                >
                  {totalMonthlyImpact >= 0 ? "+" : ""}
                  {formatCurrency(totalMonthlyImpact)}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total en cours</StatLabel>
                <StatNumber>
                  {formatCurrency(
                    ops.reduce(
                      (sum, op) => sum + (op.remainingTotalAmount || 0),
                      0
                    )
                  )}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}

      {/* Cartes d'opérations avec progression */}
      {loading && ops.length === 0 ? (
        <Flex justify="center" p={8}>
          <Spinner size="lg" />
        </Flex>
      ) : ops.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          Aucune opération programmée
        </Alert>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {ops.map(op => {
            const percent = calculateProgressPercent(op);
            const progressColor = calculateProgressColor(percent);
            const hasTotal =
              Number.isFinite(op.totalAmount) && op.totalAmount > 0;
            const paid = hasTotal
              ? Math.max(op.totalAmount - (op.remainingTotalAmount || 0), 0)
              : null;
            const isCredit = op.type === "SCHEDULED_CREDIT";

            return (
              <Card
                key={op.id}
                borderLeft="4px solid"
                borderLeftColor={
                  isCredit ? "green.400" : "red.400"
                }
                opacity={op.isActive === false ? 0.6 : 1}
              >
                <CardHeader>
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                      <Heading size="sm" noOfLines={2}>
                        {op.description}
                      </Heading>
                      <HStack spacing={2}>
                        <Badge variant="outline">
                          {getFrequencyLabel(op.frequency)}
                        </Badge>
                        <Badge
                          colorScheme={isCredit ? "green" : "red"}
                          size="sm"
                        >
                          {isCredit ? "RECETTE" : "DÉPENSE"}
                        </Badge>
                      </HStack>
                    </VStack>
                    <Menu>
                      <MenuButton
                        as={Button}
                        size="sm"
                        variant="ghost"
                        icon={<FiMoreVertical />}
                      >
                        <FiMoreVertical />
                      </MenuButton>
                      <MenuList>
                        <MenuItem
                          icon={<FiPlus />}
                          onClick={() => {
                            setSelectedOperationId(op.id);
                            onPaymentOpen();
                          }}
                        >
                          Ajouter un paiement
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem
                          onClick={() => handleToggle(op.id, op.isActive !== false)}
                        >
                          {op.isActive !== false ? "Désactiver" : "Activer"}
                        </MenuItem>
                        <MenuItem
                          icon={<FiTrash2 />}
                          color="red.500"
                          onClick={() => handleDelete(op.id)}
                        >
                          Supprimer
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                </CardHeader>

                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    {/* Montant */}
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">
                        Montant
                      </Text>
                      <Text fontWeight="bold" fontSize="lg">
                        {isCredit ? "+" : "-"}
                        {formatCurrency(Math.abs(op.amount))}
                      </Text>
                    </HStack>

                    {/* Prochaine date */}
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">
                        Prochaine date
                      </Text>
                      <Text fontSize="sm" fontWeight="500">
                        {formatDate(op.nextDate)}
                      </Text>
                    </HStack>

                    {/* Progression visuelle */}
                    {percent !== null && (
                      <Box>
                        <HStack justify="space-between" mb={2}>
                          <Text fontSize="xs" color="gray.600">
                            Progression
                          </Text>
                          <Text fontSize="xs" fontWeight="bold">
                            {Math.round(percent * 100)}%
                          </Text>
                        </HStack>
                        <Progress
                          value={percent * 100}
                          size="sm"
                          colorScheme={
                            percent >= 0.75
                              ? "green"
                              : percent >= 0.4
                              ? "orange"
                              : "red"
                          }
                          borderRadius="full"
                        />
                      </Box>
                    )}

                    {/* Détails total/restant */}
                    {hasTotal && (
                      <VStack align="stretch" spacing={1} pt={2} borderTop="1px" borderTopColor="gray.200">
                        <HStack justify="space-between" fontSize="sm">
                          <Text color="gray.600">Montant total</Text>
                          <Text fontWeight="bold">
                            {formatCurrency(op.totalAmount)}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" fontSize="sm">
                          <Text color="gray.600">Payé</Text>
                          <Text color="green.600" fontWeight="bold">
                            {formatCurrency(paid)}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" fontSize="sm">
                          <Text color="gray.600">Restant</Text>
                          <Text color="red.600" fontWeight="bold">
                            {formatCurrency(op.remainingTotalAmount || 0)}
                          </Text>
                        </HStack>
                      </VStack>
                    )}

                    {/* Prévisions annuelles */}
                    {Number.isFinite(op.plannedCountYear) &&
                      op.plannedCountYear > 0 && (
                        <VStack
                          align="stretch"
                          spacing={1}
                          pt={2}
                          borderTop="1px"
                          borderTopColor="gray.200"
                        >
                          <HStack justify="space-between" fontSize="sm">
                            <Text color="gray.600">Prévues cette année</Text>
                            <Text fontWeight="bold">
                              {op.plannedCountYear || 0}
                            </Text>
                          </HStack>
                          <HStack justify="space-between" fontSize="sm">
                            <Text color="gray.600">Effectuées</Text>
                            <Text color="green.600" fontWeight="bold">
                              {Math.max(
                                (op.plannedCountYear || 0) -
                                  (op.remainingCountYear || 0),
                                0
                              )}
                            </Text>
                          </HStack>
                        </VStack>
                      )}

                    {/* Actions */}
                    <HStack spacing={2} pt={2}>
                      <Tooltip label="Détails" placement="top">
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="blue"
                          isDisabled
                        >
                          Détails
                        </Button>
                      </Tooltip>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {/* Modal Nouvelle Opération */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nouvelle Opération Programmée</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Type</FormLabel>
                <Select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option value="SCHEDULED_PAYMENT">Paiement programmé</option>
                  <option value="SCHEDULED_CREDIT">Crédit programmé</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Input
                  placeholder="Ex: Loyer du siège"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value
                    })
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Montant (€)</FormLabel>
                <NumberInput
                  value={formData.amount}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      amount: value
                    })
                  }
                  precision={2}
                  step={0.01}
                >
                  <NumberInputField placeholder="0.00" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Fréquence</FormLabel>
                <Select
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      frequency: e.target.value
                    })
                  }
                >
                  <option value="MONTHLY">Mensuel</option>
                  <option value="QUARTERLY">Trimestriel</option>
                  <option value="SEMI_ANNUAL">Semestriel</option>
                  <option value="YEARLY">Annuel</option>
                  <option value="WEEKLY">Hebdomadaire</option>
                  <option value="ONE_SHOT">Ponctuel</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Prochaine date</FormLabel>
                <Input
                  type="date"
                  value={formData.nextDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nextDate: e.target.value
                    })
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Montant total à amortir (optionnel)</FormLabel>
                <NumberInput
                  value={formData.totalAmount}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      totalAmount: value
                    })
                  }
                  precision={2}
                  step={0.01}
                >
                  <NumberInputField placeholder="0.00" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Permet de calculer la progression et les mensualités restantes
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleAdd}
              isLoading={isAdding}
            >
              Créer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Ajouter un paiement */}
      <Modal isOpen={isPaymentOpen} onClose={onPaymentClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Ajouter un paiement à l'échéancier
          </ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%" p={3} bg="blue.50" borderRadius="md" borderLeft="4px" borderLeftColor="blue.500">
                <Text fontSize="sm" fontWeight="bold">
                  {scheduledOperations?.find(op => op.id === selectedOperationId)?.description}
                </Text>
                <Text fontSize="xs" color="gray.600" mt={1}>
                  Montant de l'opération: {formatCurrency(scheduledOperations?.find(op => op.id === selectedOperationId)?.amount)}
                </Text>
              </Box>

              <FormControl isRequired>
                <FormLabel>Montant du paiement (€)</FormLabel>
                <NumberInput
                  value={paymentAmount}
                  onChange={(value) => setPaymentAmount(value)}
                  precision={2}
                  step={0.01}
                >
                  <NumberInputField placeholder="0.00" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Date du paiement</FormLabel>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPaymentClose}>
              Annuler
            </Button>
            <Button
              colorScheme="green"
              onClick={handleAddPayment}
              isLoading={isAddingPayment}
              isDisabled={!paymentAmount || paymentAmount <= 0}
            >
              Valider le paiement
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default FinanceScheduledOps;
