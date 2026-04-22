import React, { useState, useEffect } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Input, Select, Table, Thead, Tbody,
  Tr, Th, Td, Badge, useDisclosure, Icon, Flex, InputGroup,
  InputLeftElement, useToast, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Alert, AlertIcon, IconButton, Tooltip, Spinner,
  Checkbox, Stack, Divider, Tag
} from "@chakra-ui/react";
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiAlertTriangle, FiUpload, FiLink, FiX, FiCheck } from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";
import { TRANSACTION_CATEGORIES, getCategoryLabel } from "../../utils/financeBusinessRules";
import BankStatementImport from "./BankStatementImport";
import { fetchWithCSRF } from "../../lib/csrfClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const FinanceTransactions = () => {
  const {
    addTransaction,
    deleteTransaction,
    loading
  } = useFinanceData();
  
  const [transactions, setTransactions] = useState([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState([]);

  // Sélection multiple
  const [selectedTxIds, setSelectedTxIds] = useState(new Set());
  const [linkFilter, setLinkFilter] = useState("Tous"); // "Tous" | "Liées" | "Non liées"

  const [filterCategory, setFilterCategory] = useState("Tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isAdding, setIsAdding] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [formData, setFormData] = useState({
    type: "CREDIT",
    amount: "",
    description: "",
    category: "ADHESION",
    date: new Date().toISOString().split("T")[0],
    linkedDebtId: null
  });
  
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isBulkLinkOpen, 
    onOpen: onBulkLinkOpen, 
    onClose: onBulkLinkClose 
  } = useDisclosure();
  
  const [bulkLinkDebtId, setBulkLinkDebtId] = useState("");

  // ... (gardez toutes les fonctions existantes loadTransactions, loadAvailableDocuments, etc.)

  const toggleSelectTransaction = (txId) => {
    setSelectedTxIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(txId)) {
        newSet.delete(txId);
      } else {
        newSet.add(txId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTxIds.size === filteredTransactions.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const clearSelection = () => {
    setSelectedTxIds(new Set());
  };

  const handleBulkLink = async () => {
    if (!bulkLinkDebtId || selectedTxIds.size === 0) {
      toast({
        title: "Erreur",
        description: "Sélectionnez un document et au moins une transaction",
        status: "warning",
        duration: 3000
      });
      return;
    }

    try {
      const selectedDoc = availableDocuments.find(d => d.id === bulkLinkDebtId);
      let successCount = 0;
      let errorCount = 0;

      for (const txId of selectedTxIds) {
        try {
          const response = await fetchWithCSRF(
            `${API_BASE}/api/finance/transactions/${txId}/link`,
            {
              method: "POST",
              body: JSON.stringify({
                linkedDocumentId: selectedDoc.id,
                linkedDocumentType: selectedDoc.displayType,
                linkedDocumentNumber: selectedDoc.number
              })
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      await loadTransactions();
      clearSelection();
      setBulkLinkDebtId("");
      onBulkLinkClose();

      toast({
        title: "Liaison terminée",
        description: `${successCount} transaction(s) liée(s), ${errorCount} erreur(s)`,
        status: successCount > 0 ? "success" : "error",
        duration: 4000
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la liaison groupée",
        status: "error",
        duration: 3000
      });
    }
  };

  const handleBulkUnlink = async () => {
    if (selectedTxIds.size === 0) return;

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const txId of selectedTxIds) {
        try {
          const response = await fetchWithCSRF(
            `${API_BASE}/api/finance/transactions/${txId}/link`,
            {
              method: "DELETE"
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      await loadTransactions();
      clearSelection();

      toast({
        title: "Déliaison terminée",
        description: `${successCount} transaction(s) déliée(s), ${errorCount} erreur(s)`,
        status: successCount > 0 ? "success" : "error",
        duration: 4000
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la déliaison groupée",
        status: "error",
        duration: 3000
      });
    }
  };

  // Filtrer selon le statut de liaison
  const filteredTransactions = transactions.filter(t => {
    const matchesLink = 
      linkFilter === "Tous" ? true :
      linkFilter === "Liées" ? t.linkedDocumentId :
      !t.linkedDocumentId;

    const matchesCategory = filterCategory === "Tous" || t.category === filterCategory;
    const matchesSearch = !searchTerm || 
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDateFrom = !dateFrom || new Date(t.date) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(t.date) <= new Date(dateTo);
    const matchesAmountMin = !amountMin || Math.abs(t.amount) >= parseFloat(amountMin);
    const matchesAmountMax = !amountMax || Math.abs(t.amount) <= parseFloat(amountMax);

    return matchesLink && matchesCategory && matchesSearch && 
           matchesDateFrom && matchesDateTo && matchesAmountMin && matchesAmountMax;
  });

  const selectedTransactions = filteredTransactions.filter(t => selectedTxIds.has(t.id));

  return (
    <Box>
      <Card>
        <CardHeader>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Heading size="md">Transactions Financières</Heading>
            <HStack>
              <Button
                leftIcon={<FiUpload />}
                variant="outline"
                size="sm"
              >
                Importer
              </Button>
              <Button
                leftIcon={<FiPlus />}
                colorScheme="blue"
                onClick={onOpen}
                size="sm"
              >
                Nouvelle Transaction
              </Button>
            </HStack>
          </Flex>
        </CardHeader>

        <CardBody>
          <VStack spacing={4} align="stretch">
            {/* Barre d'actions en masse */}
            {selectedTxIds.size > 0 && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Flex flex={1} justify="space-between" align="center">
                  <Text fontWeight="600">
                    {selectedTxIds.size} transaction(s) sélectionnée(s)
                  </Text>
                  <HStack>
                    <Button
                      size="sm"
                      leftIcon={<FiLink />}
                      colorScheme="blue"
                      onClick={onBulkLinkOpen}
                    >
                      Lier à une dette/créance
                    </Button>
                    <Button
                      size="sm"
                      leftIcon={<FiX />}
                      variant="outline"
                      onClick={handleBulkUnlink}
                    >
                      Délier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearSelection}
                    >
                      Annuler sélection
                    </Button>
                  </HStack>
                </Flex>
              </Alert>
            )}

            {/* Filtres */}
            <HStack spacing={3} wrap="wrap">
              <Select
                value={linkFilter}
                onChange={(e) => setLinkFilter(e.target.value)}
                maxW="200px"
                size="sm"
              >
                <option value="Tous">Toutes</option>
                <option value="Liées">Liées uniquement</option>
                <option value="Non liées">Non liées uniquement</option>
              </Select>

              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                maxW="200px"
                size="sm"
              >
                <option value="Tous">Toutes catégories</option>
                {Object.entries(TRANSACTION_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>

              <InputGroup maxW="300px" size="sm">
                <InputLeftElement><Icon as={FiSearch} /></InputLeftElement>
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </HStack>

            {/* Table */}
            {transactionsLoading ? (
              <Flex justify="center" py={8}>
                <Spinner />
              </Flex>
            ) : (
              <Box overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th width="40px">
                        <Checkbox
                          isChecked={selectedTxIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                          isIndeterminate={selectedTxIds.size > 0 && selectedTxIds.size < filteredTransactions.length}
                          onChange={toggleSelectAll}
                        />
                      </Th>
                      <Th>Date</Th>
                      <Th>Description</Th>
                      <Th>Catégorie</Th>
                      <Th>Type</Th>
                      <Th isNumeric>Montant</Th>
                      <Th>Document lié</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredTransactions.map((t) => (
                      <Tr
                        key={t.id}
                        bg={selectedTxIds.has(t.id) ? "blue.50" : "transparent"}
                        _hover={{ bg: selectedTxIds.has(t.id) ? "blue.100" : "gray.50" }}
                      >
                        <Td>
                          <Checkbox
                            isChecked={selectedTxIds.has(t.id)}
                            onChange={() => toggleSelectTransaction(t.id)}
                          />
                        </Td>
                        <Td fontSize="sm">
                          {new Date(t.date).toLocaleDateString("fr-FR")}
                        </Td>
                        <Td fontSize="sm" maxW="300px" isTruncated>
                          {t.description || "—"}
                        </Td>
                        <Td fontSize="sm">
                          {getCategoryLabel(t.category)}
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={t.type === "CREDIT" ? "green" : "red"}
                            fontSize="xs"
                          >
                            {t.type === "CREDIT" ? "Crédit" : "Débit"}
                          </Badge>
                        </Td>
                        <Td isNumeric fontWeight="600" fontSize="sm">
                          <Text color={t.type === "CREDIT" ? "green.600" : "red.600"}>
                            {t.type === "CREDIT" ? "+" : ""}{t.amount?.toFixed(2)} €
                          </Text>
                        </Td>
                        <Td fontSize="sm">
                          {t.linkedDocumentType && t.linkedDocumentNumber ? (
                            <Tag size="sm" colorScheme="blue" variant="subtle">
                              {t.linkedDocumentType} {t.linkedDocumentNumber}
                            </Tag>
                          ) : (
                            <Text color="gray.400" fontSize="xs">Non lié</Text>
                          )}
                        </Td>
                        <Td>
                          <HStack spacing={1}>
                            <Tooltip label="Supprimer">
                              <IconButton
                                size="xs"
                                icon={<FiTrash2 />}
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => deleteTransaction(t.id)}
                              />
                            </Tooltip>
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>

                {filteredTransactions.length === 0 && (
                  <Box textAlign="center" py={8}>
                    <Text color="gray.500">Aucune transaction trouvée</Text>
                  </Box>
                )}
              </Box>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Modal de liaison groupée */}
      <Modal isOpen={isBulkLinkOpen} onClose={onBulkLinkClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Lier {selectedTxIds.size} transaction(s) à une dette/créance</ModalHeader>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Document à lier</FormLabel>
                <Select
                  placeholder="Sélectionner une dette ou créance..."
                  value={bulkLinkDebtId}
                  onChange={(e) => setBulkLinkDebtId(e.target.value)}
                >
                  {availableDocuments
                    .filter(d => d.displayType === "DETTE" || d.displayType === "CRÉANCE")
                    .map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.displayType} - {doc.title} ({doc.amount}€, reste: {doc.remainingAmount}€)
                      </option>
                    ))}
                </Select>
              </FormControl>

              <Divider />

              <Box>
                <Text fontWeight="600" mb={2}>Transactions sélectionnées :</Text>
                <VStack align="stretch" spacing={1} maxH="200px" overflowY="auto">
                  {selectedTransactions.map(tx => (
                    <HStack key={tx.id} fontSize="sm" p={2} bg="gray.50" borderRadius="md">
                      <Badge colorScheme={tx.type === "CREDIT" ? "green" : "red"}>
                        {tx.type}
                      </Badge>
                      <Text flex={1} isTruncated>{tx.description}</Text>
                      <Text fontWeight="600">{tx.amount?.toFixed(2)} €</Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onBulkLinkClose} mr={3}>
              Annuler
            </Button>
            <Button
              colorScheme="blue"
              leftIcon={<FiCheck />}
              onClick={handleBulkLink}
              isDisabled={!bulkLinkDebtId}
            >
              Lier toutes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Gardez les autres modals existants (création de transaction, etc.) */}
    </Box>
  );
};

export default FinanceTransactions;
