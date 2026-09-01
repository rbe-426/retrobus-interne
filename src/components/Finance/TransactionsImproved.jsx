import React, { useState, useEffect } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Input, Select, Table, Thead, Tbody,
  Tr, Th, Td, Badge, useDisclosure, Icon, Flex, InputGroup,
  InputLeftElement, useToast, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Alert, AlertIcon, IconButton, Tooltip, Spinner,
  Checkbox, Stack, Divider, Tag, SimpleGrid, Textarea
} from "@chakra-ui/react";
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiAlertTriangle, FiUpload, FiLink, FiX, FiCheck, FiChevronDown, FiChevronUp, FiChevronLeft, FiChevronRight, FiSave } from "react-icons/fi";
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
  const [pendingLinks, setPendingLinks] = useState({});
  const [savingPendingLinks, setSavingPendingLinks] = useState(false);

  // Sélection multiple
  const [selectedTxIds, setSelectedTxIds] = useState(new Set());
  const [linkFilter, setLinkFilter] = useState("Tous"); // "Tous" | "Liées" | "Non liées"
  
  // Expansion et édition des détails
  const [expandedTxId, setExpandedTxId] = useState(null);
  const [editingTxId, setEditingTxId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    description: "",
    category: ""
  });

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
  const { 
    isOpen: isBankImportOpen, 
    onOpen: onBankImportOpen, 
    onClose: onBankImportClose 
  } = useDisclosure();
  const [bulkLinkDebtId, setBulkLinkDebtId] = useState("");

  // Charger les documents disponibles au montage
  useEffect(() => {
    loadAvailableDocuments();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [currentPage, pageSize, filterCategory, searchTerm, dateFrom, dateTo, amountMin, amountMax, linkFilter]);

  const loadTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize)
      });

      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (filterCategory !== "Tous") params.set("category", filterCategory);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (amountMin !== "") params.set("amountMin", amountMin);
      if (amountMax !== "") params.set("amountMax", amountMax);

      const response = await fetch(`${API_BASE}/api/finance/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      if (!response.ok) {
        throw new Error("Erreur chargement transactions");
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      setTransactionsTotal(data.total || 0);
    } catch (error) {
      console.error("Erreur chargement transactions:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les transactions",
        status: "error",
        duration: 4000
      });
    } finally {
      setTransactionsLoading(false);
    }
  };

  const loadAvailableDocuments = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/finance/available-documents`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Erreur chargement documents:", error);
    }
  };

  const queueLinkDocument = (transactionId, documentId) => {
    const document = availableDocuments.find((item) => item.id === documentId);
    setPendingLinks((links) => {
      const nextLinks = { ...links };
      if (document) {
        nextLinks[transactionId] = {
          linkedDocumentId: document.id,
          linkedDocumentType: document.displayType,
          linkedDocumentNumber: document.number
        };
      } else {
        delete nextLinks[transactionId];
      }
      return nextLinks;
    });
  };

  const savePendingLinks = async () => {
    const links = Object.entries(pendingLinks);
    if (links.length === 0) return;

    setSavingPendingLinks(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [transactionId, link] of links) {
      try {
        const response = await fetchWithCSRF(
          `${API_BASE}/api/finance/transactions/${transactionId}/link`,
          { method: "POST", body: JSON.stringify(link) }
        );
        if (response.ok) successCount++; else errorCount++;
      } catch {
        errorCount++;
      }
    }

    setSavingPendingLinks(false);
    if (successCount > 0) {
      setPendingLinks({});
      await loadTransactions();
    }
    toast({
      title: "Liaisons enregistrées",
      description: `${successCount} liaison(s) enregistrée(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ""}`,
      status: errorCount === 0 ? "success" : "warning",
      duration: 4000
    });
  };

  const handleUnlinkDocument = async (transactionId) => {
    try {
      const response = await fetchWithCSRF(
        `${API_BASE}/api/finance/transactions/${transactionId}/link`,
        {
          method: "DELETE"
        }
      );

      if (response.ok) {
        toast({
          title: "Document délié",
          status: "success",
          duration: 3000
        });
        await loadTransactions();
      } else {
        throw new Error("Erreur déliaison");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de délier le document",
        status: "error",
        duration: 3000
      });
    }
  };

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

  const handleBulkLink = () => {
    if (!bulkLinkDebtId || selectedTxIds.size === 0) {
      toast({
        title: "Erreur",
        description: "Sélectionnez un document et au moins une transaction",
        status: "warning",
        duration: 3000
      });
      return;
    }

    const selectedDocument = availableDocuments.find((document) => document.id === bulkLinkDebtId);
    if (!selectedDocument) {
      toast({
        title: "Erreur",
        description: "Document introuvable",
        status: "error",
        duration: 3000
      });
      return;
    }

    setPendingLinks((links) => {
      const nextLinks = { ...links };
      selectedTxIds.forEach((transactionId) => {
        nextLinks[transactionId] = {
          linkedDocumentId: selectedDocument.id,
          linkedDocumentType: selectedDocument.displayType,
          linkedDocumentNumber: selectedDocument.number
        };
      });
      return nextLinks;
    });
    clearSelection();
    setBulkLinkDebtId("");
    onBulkLinkClose();
    toast({
      title: "Liaisons préparées",
      description: "Utilisez « Enregistrer les liaisons » pour confirmer.",
      status: "info",
      duration: 3000
    });
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

  // Gestion de l'expansion des détails
  const toggleExpandTransaction = (txId) => {
    if (expandedTxId === txId) {
      setExpandedTxId(null);
      setEditingTxId(null); // Fermer l'édition aussi
    } else {
      setExpandedTxId(txId);
    }
  };

  // Gestion de l'édition
  const startEditingTransaction = (tx) => {
    setEditingTxId(tx.id);
    setEditFormData({
      description: tx.description || "",
      category: tx.category || "AUTRE"
    });
  };

  const cancelEditingTransaction = () => {
    setEditingTxId(null);
    setEditFormData({ description: "", category: "" });
  };

  const saveTransactionEdits = async (txId) => {
    try {
      const response = await fetchWithCSRF(
        `${API_BASE}/api/finance/transactions/${txId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: editFormData.description,
            category: editFormData.category
          })
        }
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde");
      }

      await loadTransactions();
      setEditingTxId(null);
      
      toast({
        title: "Transaction modifiée",
        status: "success",
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la transaction",
        status: "error",
        duration: 3000
      });
    }
  };

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      const result = await addTransaction(formData, allocations);
      if (result) {
        setFormData({
          type: "CREDIT",
          amount: "",
          description: "",
          category: "ADHESION",
          date: new Date().toISOString().split("T")[0],
          linkedDebtId: null
        });
        setAllocations([]);
        onClose();
        await loadTransactions();
      }
    } finally {
      setIsAdding(false);
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
  const totalPages = Math.max(1, Math.ceil(transactionsTotal / pageSize));

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
                onClick={onBankImportOpen}
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

            {Object.keys(pendingLinks).length > 0 && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Flex flex={1} justify="space-between" align="center" wrap="wrap" gap={3}>
                  <Text fontWeight="600">
                    {Object.keys(pendingLinks).length} liaison{Object.keys(pendingLinks).length > 1 ? "s" : ""} en attente
                  </Text>
                  <HStack>
                    <Button
                      size="sm"
                      leftIcon={<FiSave />}
                      colorScheme="blue"
                      onClick={savePendingLinks}
                      isLoading={savingPendingLinks}
                      loadingText="Enregistrement"
                    >
                      Enregistrer les liaisons
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPendingLinks({})} isDisabled={savingPendingLinks}>
                      Annuler
                    </Button>
                  </HStack>
                </Flex>
              </Alert>
            )}

            {/* Filtres */}
            <HStack spacing={3} wrap="wrap">
              <Select
                value={linkFilter}
                onChange={(e) => { setLinkFilter(e.target.value); setCurrentPage(1); }}
                maxW="200px"
                size="sm"
              >
                <option value="Tous">Toutes</option>
                <option value="Liées">Liées uniquement</option>
                <option value="Non liées">Non liées uniquement</option>
              </Select>

              <Select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
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
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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
                      <React.Fragment key={t.id}>
                      <Tr
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
                            <HStack spacing={1}>
                              <Tag size="sm" colorScheme="blue" variant="subtle">
                                {t.linkedDocumentType} {t.linkedDocumentNumber}
                              </Tag>
                              <Tooltip label="Délier">
                                <IconButton
                                  size="xs"
                                  icon={<FiX />}
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => handleUnlinkDocument(t.id)}
                                />
                              </Tooltip>
                            </HStack>
                          ) : (
                            <Select
                              size="xs"
                              placeholder="Lier..."
                              fontSize="xs"
                              value={pendingLinks[t.id]?.linkedDocumentId || ""}
                              onChange={(e) => queueLinkDocument(t.id, e.target.value)}
                            >
                              {availableDocuments.map(doc => (
                                <option key={doc.id} value={doc.id}>
                                  {doc.displayType} {doc.number} - {doc.title}
                                </option>
                              ))}
                            </Select>
                          )}
                        </Td>
                        <Td>
                          <HStack spacing={1}>
                            <Tooltip label={expandedTxId === t.id ? "Masquer détails" : "Voir détails"}>
                              <IconButton
                                size="xs"
                                icon={expandedTxId === t.id ? <FiChevronUp /> : <FiChevronDown />}
                                variant="ghost"
                                colorScheme="blue"
                                onClick={() => toggleExpandTransaction(t.id)}
                              />
                            </Tooltip>
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
                      {/* Ligne de détails développée */}
                      {expandedTxId === t.id && (
                        <Tr>
                          <Td colSpan={8} bg="gray.50" px={6} py={4}>
                            <VStack align="stretch" spacing={4}>
                              {/* En-tête */}
                              <HStack justify="space-between">
                                <Heading size="sm">Détails de la transaction</Heading>
                                {editingTxId !== t.id ? (
                                  <Button
                                    size="sm"
                                    leftIcon={<FiEdit2 />}
                                    colorScheme="blue"
                                    variant="outline"
                                    onClick={() => startEditingTransaction(t)}
                                  >
                                    Modifier
                                  </Button>
                                ) : (
                                  <HStack>
                                    <Button
                                      size="sm"
                                      leftIcon={<FiSave />}
                                      colorScheme="green"
                                      onClick={() => saveTransactionEdits(t.id)}
                                    >
                                      Enregistrer
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditingTransaction}
                                    >
                                      Annuler
                                    </Button>
                                  </HStack>
                                )}
                              </HStack>

                              {/* Grille des informations */}
                              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                {/* Date de transaction */}
                                <FormControl>
                                  <FormLabel fontSize="sm" fontWeight="600">Date de transaction</FormLabel>
                                  <Input
                                    value={new Date(t.date).toLocaleDateString("fr-FR", {
                                      day: "2-digit",
                                      month: "long",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                    isReadOnly
                                    bg="white"
                                    size="sm"
                                  />
                                </FormControl>

                                {/* Banque (à implémenter dans le schéma si nécessaire) */}
                                <FormControl>
                                  <FormLabel fontSize="sm" fontWeight="600">Banque</FormLabel>
                                  <Input
                                    value="BNP Paribas" // TODO: À récupérer depuis la BDD
                                    isReadOnly
                                    bg="white"
                                    size="sm"
                                  />
                                </FormControl>

                                {/* Montant */}
                                <FormControl>
                                  <FormLabel fontSize="sm" fontWeight="600">Montant</FormLabel>
                                  <Input
                                    value={`${t.type === "CREDIT" ? "+" : "-"}${t.amount?.toFixed(2)} €`}
                                    isReadOnly
                                    bg="white"
                                    size="sm"
                                    color={t.type === "CREDIT" ? "green.600" : "red.600"}
                                    fontWeight="600"
                                  />
                                </FormControl>

                                {/* Catégorie (éditable) */}
                                <FormControl>
                                  <FormLabel fontSize="sm" fontWeight="600">Catégorie</FormLabel>
                                  {editingTxId === t.id ? (
                                    <Select
                                      value={editFormData.category}
                                      onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                                      size="sm"
                                      bg="white"
                                    >
                                      {Object.entries(TRANSACTION_CATEGORIES).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                      ))}
                                    </Select>
                                  ) : (
                                    <Input
                                      value={getCategoryLabel(t.category)}
                                      isReadOnly
                                      bg="white"
                                      size="sm"
                                    />
                                  )}
                                </FormControl>
                              </SimpleGrid>

                              {/* Description complète (éditable) */}
                              <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600">Description / Motif</FormLabel>
                                {editingTxId === t.id ? (
                                  <Textarea
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                                    size="sm"
                                    bg="white"
                                    rows={3}
                                  />
                                ) : (
                                  <Textarea
                                    value={t.description || "—"}
                                    isReadOnly
                                    bg="white"
                                    size="sm"
                                    rows={3}
                                  />
                                )}
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                  Texte complet de la transaction tel qu'il apparaît sur le relevé bancaire
                                </Text>
                              </FormControl>

                              {/* Document lié */}
                              <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600">Document lié</FormLabel>
                                {t.linkedDocumentType && t.linkedDocumentNumber ? (
                                  <HStack>
                                    <Tag size="md" colorScheme="blue">
                                      {t.linkedDocumentType} {t.linkedDocumentNumber}
                                    </Tag>
                                    <Tooltip label="Délier le document">
                                      <IconButton
                                        size="xs"
                                        icon={<FiX />}
                                        variant="ghost"
                                        colorScheme="red"
                                        onClick={() => handleUnlinkDocument(t.id)}
                                      />
                                    </Tooltip>
                                  </HStack>
                                ) : (
                                  <Select
                                    size="sm"
                                    placeholder="Lier à un document..."
                                    value={pendingLinks[t.id]?.linkedDocumentId || ""}
                                    onChange={(e) => queueLinkDocument(t.id, e.target.value)}
                                  >
                                    {availableDocuments.map(doc => (
                                      <option key={doc.id} value={doc.id}>
                                        {doc.displayType} {doc.number} - {doc.title} ({doc.amount}€)
                                      </option>
                                    ))}
                                  </Select>
                                )}
                              </FormControl>

                              {/* Métadonnées */}
                              <HStack spacing={4} fontSize="xs" color="gray.600">
                                <Text>ID: {t.id.substring(0, 8)}...</Text>
                                <Text>Créée le: {new Date(t.createdAt).toLocaleDateString("fr-FR")}</Text>
                              </HStack>
                            </VStack>
                          </Td>
                        </Tr>
                      )}
                    </React.Fragment>
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

            {transactionsTotal > 0 && (
              <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                <Text fontSize="sm" color="gray.600">
                  {transactionsTotal} opération{transactionsTotal > 1 ? "s" : ""} - page {currentPage} sur {totalPages}
                </Text>
                <HStack>
                  <Select
                    aria-label="Opérations par page"
                    size="sm"
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    w="120px"
                  >
                    <option value={20}>20 par page</option>
                    <option value={50}>50 par page</option>
                    <option value={100}>100 par page</option>
                  </Select>
                  <Tooltip label="Page précédente">
                    <IconButton
                      aria-label="Page précédente"
                      icon={<FiChevronLeft />}
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      isDisabled={currentPage === 1}
                    />
                  </Tooltip>
                  <Tooltip label="Page suivante">
                    <IconButton
                      aria-label="Page suivante"
                      icon={<FiChevronRight />}
                      size="sm"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      isDisabled={currentPage === totalPages}
                    />
                  </Tooltip>
                </HStack>
              </Flex>
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

      {/* Modal Nouvelle Transaction */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nouvelle Transaction</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="CREDIT">Crédit (Entrée)</option>
                  <option value="DEBIT">Débit (Sortie)</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Montant (€)</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Catégorie</FormLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {Object.entries(TRANSACTION_CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Lier à une dette/créance (optionnel)</FormLabel>
                <Select
                  placeholder="Aucune"
                  value={formData.linkedDebtId || ""}
                  onChange={(e) => setFormData({ ...formData, linkedDebtId: e.target.value || null })}
                >
                  {availableDocuments.filter(d => d.displayType === "DETTE" || d.displayType === "CRÉANCE").map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.displayType} — {doc.title} ({doc.amount}€)
                      {doc.remainingAmount !== undefined && ` — Reste: ${doc.remainingAmount.toFixed(2)}€`}
                    </option>
                  ))}
                </Select>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  En liant cette transaction à une dette, le montant contribuera automatiquement à sa résorption.
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleAdd} isLoading={isAdding}>
              Créer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Import Relevé Bancaire */}
      <BankStatementImport
        isOpen={isBankImportOpen}
        onClose={onBankImportClose}
        onImported={async () => {
          onBankImportClose();
          await loadTransactions();
          toast({
            title: "Relevé importé",
            description: "Les transactions ont été ajoutées avec succès",
            status: "success",
            duration: 3000
          });
        }}
      />
    </Box>
  );
};

export default FinanceTransactions;
