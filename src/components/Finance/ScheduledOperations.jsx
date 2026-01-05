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

  // SemicircleGauge Component
  const SemicircleGauge = ({ percent, color = 'gray' }) => {
    const pct = typeof percent === 'number' ? Math.max(0, Math.min(1, percent)) : null;
    const r = 50; // radius
    const cx = 60, cy = 60; // center
    // Angles in radians for upper semicircle [PI .. 0]
    const start = Math.PI; // leftmost
    const end = Math.PI * (1 - (pct ?? 0)); // map 0->PI, 1->0
    // Start point (left)
    const x1 = cx + r * Math.cos(start);
    const y1 = cy - r * Math.sin(start); // use minus to keep arc on upper half
    // End point according to percent
    const x2 = cx + r * Math.cos(end);
    const y2 = cy - r * Math.sin(end);
    const largeArc = 0; // always <= 180°
    const sweepFlag = 0; // draw upper arc (counter-clockwise in screen coords)
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`;
    return (
      <svg viewBox="0 0 120 70" width="100%" height="70" role="img" aria-label={pct != null ? `${Math.round(pct * 100)}%` : 'N/A'}>
        {/* background arc (full upper semicircle) */}
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 ${sweepFlag} ${cx + r} ${cy}`} stroke="#E2E8F0" strokeWidth="10" fill="none" />
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
  
  // State pour ajouter un paiement supplémentaire
  const [selectedOperationId, setSelectedOperationId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isPaymentOpen, onOpen: onPaymentOpen, onClose: onPaymentClose } = useDisclosure();
  const { isOpen: isDetailsOpen, onOpen: onDetailsOpen, onClose: onDetailsClose } = useDisclosure();
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

  const handleAddPayment = useCallback(async () => {
    // Récupérer paymentAmount depuis l'état plutôt que les dépendances
    if (!selectedOperationId) {
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

      // Calculer la prochaine date (ajouter 1 mois à la date actuelle de nextDate)
      const currentNextDate = new Date(operation.nextDate);
      const newNextDate = new Date(currentNextDate);
      newNextDate.setMonth(newNextDate.getMonth() + 1);

      const updatedOperation = {
        ...operation,
        remainingTotalAmount: newRemaining,
        nextDate: newNextDate.toISOString().split("T")[0]
      };

      // Mettre à jour l'opération sur le serveur
      const response = await fetch(`${API_BASE}/api/finance/scheduled-operations/${selectedOperationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(updatedOperation)
      });

      if (!response.ok) throw new Error("Erreur lors de la mise à jour");

      setPaymentAmount("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      onPaymentClose();
      
      toast({
        title: "Paiement enregistré",
        status: "success",
        duration: 2000,
        isClosable: true
      });
      
      // Recharger uniquement les opérations programmées pour plus de réactivité
      const schedRes = await fetch(`${API_BASE}/api/finance/scheduled-operations`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (schedRes.ok) {
        const data = await schedRes.json();
        // Les opérations vont être mises à jour dans le contexte global via loadFinanceData
        // Mais on force aussi un rechargement complet pour être sûr
        await loadFinanceData();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer le paiement",
        status: "error"
      });
    } finally {
      setIsAddingPayment(false);
    }
  }, [selectedOperationId, scheduledOperations, paymentAmount, toast, loadFinanceData]);

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

    // Cas 1: Si totalAmount est défini, calculer basé sur montant
    if (Number.isFinite(operation.totalAmount) && operation.totalAmount > 0) {
      const remaining = operation.remainingTotalAmount ?? operation.totalAmount;
      const monthlyAmount = operation.amount || 0;

      if (monthlyAmount <= 0) return null;

      const frequency = operation.frequency || "MONTHLY";
      
      // Convertir la fréquence en intervalle en mois
      const monthsPerPeriod = 
        frequency === "MONTHLY" ? 1 :
        frequency === "QUARTERLY" ? 3 :
        frequency === "SEMI_ANNUAL" ? 6 :
        frequency === "YEARLY" ? 12 :
        frequency === "WEEKLY" ? 0.25 : 1;

      // Nombre de périodes restantes (pas de mois)
      const periodsRemaining = Math.ceil(remaining / monthlyAmount);
      
      // Convertir en mois réels basé sur la fréquence
      const monthsRemaining = periodsRemaining * monthsPerPeriod;

      const startDate = new Date(operation.nextDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + Math.ceil(monthsRemaining));

      return endDate;
    }

    // Cas 2: Si plannedCountYear est défini, calculer basé sur nombre de paiements
    if (Number.isFinite(operation.plannedCountYear) && operation.plannedCountYear > 0) {
      const remainingCount = operation.remainingCountYear ?? 0;
      const startDate = new Date(operation.nextDate);
      const endDate = new Date(startDate);
      
      const frequency = operation.frequency || "MONTHLY";
      const monthsPerPeriod = 
        frequency === "MONTHLY" ? 1 :
        frequency === "QUARTERLY" ? 3 :
        frequency === "SEMI_ANNUAL" ? 6 :
        frequency === "YEARLY" ? 12 :
        frequency === "WEEKLY" ? 0.25 : 1;

      endDate.setMonth(endDate.getMonth() + Math.ceil(remainingCount * monthsPerPeriod));
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
                      <Text fontWeight="medium">{op.nextDate ? formatDate(op.nextDate) : '—'}</Text>
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
                      {op.estimatedEndDate && (
                        <Text fontSize="sm" color="gray.600">Fin estimée: {formatDate(op.estimatedEndDate)}</Text>
                      )}
                    </VStack>
                  </HStack>
                </CardBody>
                <CardBody pt={0}>
                  <HStack>
                    <Button size="sm" colorScheme="blue">Déclarer payé</Button>
                    <Button size="sm" variant="outline">Voir paiements</Button>
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
    </VStack>
  );
};

export default FinanceScheduledOps;
