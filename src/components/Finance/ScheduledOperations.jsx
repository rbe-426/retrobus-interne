import React, { useState, useEffect, useCallback } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Badge, useToast, SimpleGrid, Stat, StatLabel, StatNumber,
  Table, Thead, Tbody, Tr, Th, Td, Alert, AlertIcon, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel, Input, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Select, useDisclosure, Spinner, Flex, Tooltip, Progress, Menu, MenuButton, MenuList, MenuItem, MenuDivider, IconButton
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

  // SemicircleGauge Component
  const SemicircleGauge = ({ percent, color = 'gray' }) => {
    const pct = typeof percent === 'number' ? Math.max(0, Math.min(1, percent)) : null;
    const r = 50; // radius
    const cx = 60, cy = 60; // center
    // Angles in radians for lower semicircle [PI .. 2*PI]
    const start = Math.PI; // leftmost (180°)
    const end = Math.PI + Math.PI * (pct ?? 0); // map 0->PI, 1->2PI (180° to 360°)
    // Start point (left)
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start); // use plus to keep arc on LOWER half
    // End point according to percent
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = pct > 0.5 ? 1 : 0; // large arc if > 50%
    const sweepFlag = 1; // draw lower arc (clockwise in screen coords)
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`;
    return (
      <svg viewBox="0 0 120 70" width="100%" height="70" role="img" aria-label={pct != null ? `${Math.round(pct * 100)}%` : 'N/A'}>
        {/* background arc (full lower semicircle) */}
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} stroke="#E2E8F0" strokeWidth="10" fill="none" />
        {/* foreground arc */}
        {pct != null && pct > 0 && (
          <path d={path} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" />
        )}
        {/* percent label */}
        <text x="60" y="65" textAnchor="middle" fontSize="10" fill="#4A5568">
          {pct != null ? `${Math.round(pct * 100)}%` : 'N/A'}
        </text>
      </svg>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    type: "SCHEDULED_PAYMENT",
    amount: "",
    description: "",
    frequency: "MONTHLY",
    nextDate: new Date().toISOString().split("T")[0],
    estimatedEndDate: "",
    totalAmount: ""
  });
  
  // State pour ajouter/voir les paiements
  const [selectedOperationId, setSelectedOperationId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentPeriod, setPaymentPeriod] = useState(new Date().toISOString().split("T")[0]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isPaymentOpen, onOpen: onPaymentOpen, onClose: onPaymentClose } = useDisclosure();
  const { isOpen: isDetailsOpen, onOpen: onDetailsOpen, onClose: onDetailsClose } = useDisclosure();
  const { isOpen: isPaymentsListOpen, onOpen: onPaymentsListOpen, onClose: onPaymentsListClose } = useDisclosure();
  const [selectedOperationForDetails, setSelectedOperationForDetails] = useState(null);

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
          estimatedEndDate: "",
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

  const handleLoadPayments = useCallback(async (operationId) => {
    setLoadingPayments(true);
    try {
      const response = await fetch(`${API_BASE}/api/finance/scheduled-operations/${operationId}/payments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
        setSelectedOperationId(operationId);
        onPaymentsListOpen();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les paiements",
        status: "error"
      });
    } finally {
      setLoadingPayments(false);
    }
  }, [toast, onPaymentsListOpen]);

  const handleAddPayment = useCallback(async () => {
    if (!selectedOperationId || !paymentAmount) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        status: "error"
      });
      return;
    }

    setIsAddingPayment(true);
    try {
      const response = await fetch(`${API_BASE}/api/finance/scheduled-operations/${selectedOperationId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          period: paymentPeriod
        })
      });

      if (!response.ok) throw new Error("Erreur lors de l'enregistrement du paiement");

      toast({
        title: "Paiement enregistré",
        status: "success",
        duration: 2000,
        isClosable: true
      });
      
      // Recharger les paiements et les données financières
      await handleLoadPayments(selectedOperationId);
      await loadFinanceData();
      
      setPaymentAmount("");
      setPaymentPeriod(new Date().toISOString().split("T")[0]);
      onPaymentClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer le paiement",
        status: "error"
      });
    } finally {
      setIsAddingPayment(false);
    }
  }, [selectedOperationId, paymentAmount, paymentPeriod, toast, loadFinanceData, handleLoadPayments, onPaymentClose]);

  const handleDeletePayment = useCallback(async (paymentId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce paiement ?")) return;

    try {
      const response = await fetch(`${API_BASE}/api/finance/scheduled-operations/${selectedOperationId}/payments/${paymentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");

      toast({
        title: "Paiement supprimé",
        status: "success",
        duration: 2000,
        isClosable: true
      });

      // Recharger les paiements et les données
      await handleLoadPayments(selectedOperationId);
      await loadFinanceData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le paiement",
        status: "error"
      });
    }
  }, [selectedOperationId, handleLoadPayments, loadFinanceData, toast]);

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

  const calculateDynamicNextDate = (operation) => {
    if (!operation || !operation.nextDate) return null;
    
    let current = new Date(operation.nextDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (!operation.frequency) {
      return current.toISOString().split("T")[0];
    }
    
    // Avancer la date tant qu'elle est dans le passé
    const frequencyMap = {
      'WEEKLY': 7,
      'MONTHLY': 30,  // Approximation
      'QUARTERLY': 90,
      'SEMI_ANNUAL': 180,
      'YEARLY': 365,
      'ONE_SHOT': null
    };
    
    const days = frequencyMap[operation.frequency];
    if (!days) return current.toISOString().split("T")[0];  // ONE_SHOT ou inconnu
    
    // Avancer jusqu'à ce que la date soit aujourd'hui ou demain
    while (current < now) {
      current.setDate(current.getDate() + days);
    }
    
    return current.toISOString().split("T")[0];
  };

  const calculateTheoreticalEnd = (operation) => {
    if (!operation) return null;

    // Cas 0: Si estimatedEndDate est défini par l'utilisateur, l'utiliser
    if (operation.estimatedEndDate) {
      return new Date(operation.estimatedEndDate);
    }

    // Cas 1: Si totalAmount est défini, calculer simplement
    if (Number.isFinite(operation.totalAmount) && operation.totalAmount > 0) {
      const remaining = operation.remainingTotalAmount ?? operation.totalAmount;
      const monthlyAmount = Math.abs(operation.amount || 0);

      if (monthlyAmount <= 0) return null;

      // Nombre de mois restants = montant restant / montant mensuel
      const monthsRemaining = remaining / monthlyAmount;

      const startDate = new Date(operation.nextDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + Math.ceil(monthsRemaining));

      return endDate;
    }

    return null;
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
            Paiements dûs de l'association
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
          {ops.map((op, idx) => {
            const hasTotal = Number.isFinite(op.totalAmount) && op.totalAmount > 0;
            const paid = hasTotal ? Math.max(op.totalAmount - (op.remainingTotalAmount || 0), 0) : null;
            const hasYearPlan = Number.isFinite(op.plannedCountYear) && op.plannedCountYear > 0;
            const yearPaidCount = hasYearPlan ? Math.max((op.plannedCountYear || 0) - (op.remainingCountYear || 0), 0) : null;
            const percentYear = hasYearPlan ? Math.max(0, Math.min(1, yearPaidCount / op.plannedCountYear)) : null;
            const percent = hasTotal ? Math.max(0, Math.min(1, paid / op.totalAmount)) : percentYear;
            const gaugeColor = percent == null ? '#A0AEC0' : percent >= 0.75 ? '#22863a' : percent >= 0.4 ? '#f59e0b' : '#dc2626';

            return (
              <Card key={op.id || idx}>
                <CardHeader>
                  <VStack align="start" spacing={1}>
                    <Heading size="sm" noOfLines={2}>
                      {op.description}
                    </Heading>
                    <HStack>
                      <Badge variant="outline">
                        {op.frequency === 'MONTHLY' ? 'Mensuel' : op.frequency || 'Récurrent'}
                      </Badge>
                      <Badge colorScheme="red">
                        {op.type === 'SCHEDULED_CREDIT' ? 'RECETTE' : 'DÉPENSE'}
                      </Badge>
                    </HStack>
                  </VStack>
                </CardHeader>
                <CardBody>
                  <HStack align="center" spacing={4}>
                    <Box minW="120px" w="120px">
                      <SemicircleGauge percent={percent} color={gaugeColor} />
                    </Box>
                    <VStack align="start" spacing={1} flex={1}>
                      <Text fontSize="sm" color="gray.600">Prochaine date</Text>
                      <Text fontWeight="medium">{op.nextDate ? formatDate(calculateDynamicNextDate(op)) : '—'}</Text>
                      <Text fontSize="sm" color="gray.600">Montant</Text>
                      <Text fontWeight="bold" color={op.type === 'SCHEDULED_CREDIT' ? 'green.600' : 'red.600'}>
                        {op.type === 'SCHEDULED_CREDIT' ? '+' : '-'} {formatCurrency(Math.abs(op.amount))}
                      </Text>
                      <HStack spacing={3} flexWrap="wrap">
                        {op.paymentsCount !== undefined && (
                          <Badge variant="subtle" colorScheme="blue">Payées: {op.paymentsCount}</Badge>
                        )}
                        {hasTotal && (
                          <Badge variant="subtle">Restant: {formatCurrency(op.remainingTotalAmount || 0)}</Badge>
                        )}
                        {!hasTotal && hasYearPlan && (
                          <Badge variant="subtle" colorScheme="purple">Payées cette année: {yearPaidCount}</Badge>
                        )}
                      </HStack>
                      {op.monthsRemainingTotal && (
                        <Text fontSize="sm" color="gray.600">Mensualités restantes: {op.monthsRemainingTotal}</Text>
                      )}
                      {calculateTheoreticalEnd(op) && (
                        <Text fontSize="sm" color="gray.600">Fin théorique: <Text as="span" fontWeight="bold" color="purple.600">{formatDate(calculateTheoreticalEnd(op))}</Text></Text>
                      )}
                      {op.estimatedEndDate && (
                        <Text fontSize="sm" color="gray.600">Fin estimée: {formatDate(op.estimatedEndDate)}</Text>
                      )}
                    </VStack>
                  </HStack>
                </CardBody>
                <CardBody pt={0}>
                  <HStack>
                    <Button 
                      size="sm" 
                      colorScheme="blue"
                      onClick={() => {
                        setSelectedOperationId(op.id);
                        onPaymentOpen();
                      }}
                    >
                      Ajouter un paiement
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleLoadPayments(op.id)}
                    >
                      Voir paiements
                    </Button>
                    <IconButton
                      aria-label="Supprimer"
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => {
                        if (confirm('Êtes-vous sûr?')) {
                          handleDelete(op.id);
                        }
                      }}
                    />
                  </HStack>
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
                <FormLabel>Fin théorique (optionnel)</FormLabel>
                <Input
                  type="date"
                  value={formData.estimatedEndDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimatedEndDate: e.target.value
                    })
                  }
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Si renseigné, le système calculera le nombre de paiements nécessaires. Sinon, utilisez le montant total.
                </Text>
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
                <Input 
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Date du paiement</FormLabel>
                <Input
                  type="date"
                  value={paymentPeriod}
                  onChange={(e) => setPaymentPeriod(e.target.value)}
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

      {/* Modal Détails opération programmée */}
      <Modal isOpen={isDetailsOpen} onClose={onDetailsClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Détails de l'opération programmée
          </ModalHeader>
          <ModalBody>
            {selectedOperationForDetails && (
              <VStack spacing={4} align="stretch">
                <Box p={3} bg="blue.50" borderRadius="md" borderLeft="4px" borderLeftColor="blue.500">
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    {selectedOperationForDetails.description}
                  </Text>
                  <SimpleGrid columns={2} spacing={3}>
                    <Box>
                      <Text fontSize="xs" color="gray.600">Type</Text>
                      <Badge colorScheme="blue" mt={1}>{selectedOperationForDetails.type}</Badge>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.600">Fréquence</Text>
                      <Text fontSize="sm" fontWeight="bold" mt={1}>
                        {selectedOperationForDetails.frequency}
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Box>

                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontSize="xs" color="gray.600" fontWeight="bold">Montant</Text>
                    <Text fontSize="lg" fontWeight="bold" color="red.600">
                      -{formatCurrency(selectedOperationForDetails.amount)}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.600" fontWeight="bold">Montant total</Text>
                    <Text fontSize="sm" mt={1}>
                      {selectedOperationForDetails.totalAmount ? formatCurrency(selectedOperationForDetails.totalAmount) : "—"}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.600" fontWeight="bold">Prochaine date</Text>
                    <Text fontSize="sm" mt={1}>
                      {selectedOperationForDetails.nextDate ? formatDate(calculateDynamicNextDate(selectedOperationForDetails)) : "—"}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.600" fontWeight="bold">Fin théorique</Text>
                    <Text fontSize="sm" mt={1}>
                      {calculateTheoreticalEnd(selectedOperationForDetails) 
                        ? formatDate(calculateTheoreticalEnd(selectedOperationForDetails))
                        : "—"}
                    </Text>
                  </Box>
                </SimpleGrid>

                {selectedOperationForDetails.remainingTotalAmount !== undefined && (
                  <Box p={3} bg="green.50" borderRadius="md">
                    <SimpleGrid columns={2} spacing={3}>
                      <Box>
                        <Text fontSize="xs" color="gray.600">Montant restant</Text>
                        <Text fontSize="sm" fontWeight="bold" color="green.600" mt={1}>
                          {formatCurrency(selectedOperationForDetails.remainingTotalAmount)}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.600">Payées</Text>
                        <Text fontSize="sm" fontWeight="bold" mt={1}>
                          {selectedOperationForDetails.paymentsCount ?? 0}
                        </Text>
                      </Box>
                    </SimpleGrid>
                  </Box>
                )}

                <Text fontSize="xs" color="gray.500">
                  Créée le {formatDate(new Date(selectedOperationForDetails.createdAt))}
                </Text>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDetailsClose}>
              Fermer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Voir les paiements */}
      <Modal isOpen={isPaymentsListOpen} onClose={onPaymentsListClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Historique des paiements
          </ModalHeader>
          <ModalBody>
            {loadingPayments ? (
              <Flex justify="center" p={8}>
                <Spinner />
              </Flex>
            ) : payments.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                Aucun paiement enregistré
              </Alert>
            ) : (
              <VStack spacing={3}>
                {payments.map((payment) => (
                  <Box key={payment.id} p={3} border="1px solid" borderColor="gray.200" borderRadius="md" w="100%">
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="sm">
                          {formatCurrency(payment.amount)}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          Période: {formatDate(payment.period)}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Payé le {formatDate(payment.paidAt)}
                        </Text>
                      </VStack>
                      <IconButton
                        aria-label="Supprimer"
                        icon={<FiTrash2 />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleDeletePayment(payment.id)}
                      />
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onPaymentsListClose}>
              Fermer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default FinanceScheduledOps;
