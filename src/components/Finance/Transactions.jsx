import React, { useState, useEffect } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Input, Select, Table, Thead, Tbody,
  Tr, Th, Td, Badge, useDisclosure, Icon, Flex, InputGroup,
  InputLeftElement, useToast, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Alert, AlertIcon, IconButton, Tooltip, Spinner
} from "@chakra-ui/react";
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiAlertTriangle, FiUpload, FiLink, FiX } from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";
import { TRANSACTION_CATEGORIES, getCategoryLabel } from "../../utils/financeBusinessRules";
import BankStatementImport from "./BankStatementImport";

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
    date: new Date().toISOString().split("T")[0]
  });
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isBankImportOpen, onOpen: onBankImportOpen, onClose: onBankImportClose } = useDisclosure();

  const categories = ["Tous", ...Object.keys(TRANSACTION_CATEGORIES)];
  const pageCount = Math.max(1, Math.ceil(transactionsTotal / pageSize));

  // Charger les documents disponibles au montage
  useEffect(() => {
    loadAvailableDocuments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, searchTerm, dateFrom, dateTo, amountMin, amountMax, pageSize]);

  useEffect(() => {
    loadTransactions();
  }, [currentPage, pageSize, filterCategory, searchTerm, dateFrom, dateTo, amountMin, amountMax]);

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

  const handleLinkDocument = async (transactionId, documentId, documentType, documentNumber) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/finance/transactions/${transactionId}/link`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            linkedDocumentId: documentId,
            linkedDocumentType: documentType,
            linkedDocumentNumber: documentNumber
          })
        }
      );

      if (response.ok) {
        toast({
          title: "Document lié",
          description: `Transaction liée au ${documentType} ${documentNumber}`,
          status: "success",
          duration: 3000
        });
        await loadTransactions();
      } else {
        throw new Error("Erreur liaison");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de lier le document",
        status: "error",
        duration: 3000
      });
    }
  };

  const handleUnlinkDocument = async (transactionId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/finance/transactions/${transactionId}/link`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
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

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      // La validation est faite dans addTransaction via les regles metier
      const result = await addTransaction(formData, allocations);
      if (result) {
        setFormData({
          type: "CREDIT",
          amount: "",
          description: "",
          category: "ADHESION",
          date: new Date().toISOString().split("T")[0]
        });
        setAllocations([]);
        onClose();
        await loadTransactions();
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Confirmer la suppression ? Cette action est irreversible.")) {
      await deleteTransaction(id);
      await loadTransactions();
    }
  };

  return (
    <VStack align="stretch" spacing={6}>
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">Transactions</Heading>
          <Text color="gray.500" fontSize="sm">
            Historique des mouvements financiers
          </Text>
        </Box>
        <HStack>
          <Button leftIcon={<FiUpload />} colorScheme="teal" variant="outline" onClick={onBankImportOpen} isLoading={loading}>
            Importer relevé
          </Button>
          <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onOpen} isLoading={loading}>
            Nouvelle transaction
          </Button>
        </HStack>
      </HStack>

      {/* Filtres */}
      <Card>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4} align="stretch">
              <InputGroup flex={2}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Mots-clés, libellé, catégorie, montant ou date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
              <Select
                w="220px"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
            </HStack>
            <HStack spacing={4} align="stretch" flexWrap="wrap">
              <FormControl maxW="180px">
                <FormLabel mb={1} fontSize="sm">Date début</FormLabel>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </FormControl>
              <FormControl maxW="180px">
                <FormLabel mb={1} fontSize="sm">Date fin</FormLabel>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </FormControl>
              <FormControl maxW="160px">
                <FormLabel mb={1} fontSize="sm">Montant min</FormLabel>
                <Input type="number" step="0.01" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="0.00" />
              </FormControl>
              <FormControl maxW="160px">
                <FormLabel mb={1} fontSize="sm">Montant max</FormLabel>
                <Input type="number" step="0.01" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="9999.99" />
              </FormControl>
              <Button
                alignSelf="end"
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("Tous");
                  setDateFrom("");
                  setDateTo("");
                  setAmountMin("");
                  setAmountMax("");
                }}
              >
                Réinitialiser
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Tableau des transactions */}
      <Card overflowX="auto">
        <CardBody p={0}>
          {transactionsLoading ? (
            <Flex justify="center" align="center" py={10}>
              <Spinner color="blue.500" />
            </Flex>
          ) : (
          <>
          <Table variant="simple">
            <Thead>
              <Tr bg="gray.50">
                <Th>Date</Th>
                <Th>Description</Th>
                <Th>Catégorie</Th>
                <Th isNumeric>Montant</Th>
                <Th>Document lié</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {transactions.length > 0 ? (
                transactions.map(t => (
                  <Tr key={t.id} _hover={{ bg: "gray.50" }}>
                    <Td>{new Date(t.date).toLocaleDateString()}</Td>
                    <Td fontWeight="500">{t.description}</Td>
                    <Td>{t.category}</Td>
                    <Td isNumeric fontWeight="600" color={t.type === "CREDIT" ? "green.500" : "red.500"}>
                      {t.type === "CREDIT" ? "+" : "-"}{Math.abs(t.amount).toFixed(2)} €
                    </Td>
                    <Td>{t.linkedDocumentId ? (
                        <HStack spacing={2}>
                          <Badge colorScheme="blue" fontSize="xs">
                            {t.linkedDocumentType} {t.linkedDocumentNumber}
                          </Badge>
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
                          size="sm"
                          placeholder="Lier à un document..."
                          onChange={(e) => {
                            if (e.target.value) {
                              const doc = availableDocuments.find(d => d.id === e.target.value);
                              if (doc) {
                                handleLinkDocument(t.id, doc.id, doc.displayType, doc.number);
                              }
                            }
                          }}
                        >
                          {availableDocuments.map(doc => (
                            <option key={doc.id} value={doc.id}>
                              {doc.displayType} {doc.number} - {doc.title} ({doc.amount}€)
                            </option>
                          ))}
                        </Select>
                      )}
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Icon as={FiTrash2} />
                      </Button>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={6} textAlign="center" py={8} color="gray.500">
                    Aucune transaction trouvée
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          <Flex justify="space-between" align="center" px={4} py={3} borderTop="1px solid" borderColor="gray.100" wrap="wrap" gap={3}>
            <Text fontSize="sm" color="gray.600">
              {transactionsTotal} transaction(s) au total
            </Text>
            <HStack spacing={3}>
              <Button size="sm" variant="outline" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} isDisabled={currentPage === 1}>
                Précédent
              </Button>
              <HStack spacing={2}>
                <Text fontSize="sm">Page</Text>
                <Select size="sm" w="90px" value={String(currentPage)} onChange={(e) => setCurrentPage(Number(e.target.value))}>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                    <option key={page} value={page}>{page}</option>
                  ))}
                </Select>
                <Text fontSize="sm">/ {pageCount}</Text>
              </HStack>
              <Select size="sm" w="110px" value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>{size} / page</option>
                ))}
              </Select>
              <Button size="sm" variant="outline" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} isDisabled={currentPage >= pageCount}>
                Suivant
              </Button>
            </HStack>
          </Flex>
          </>
          )}
        </CardBody>
      </Card>

      {/* Modal Nouvelle Transaction */}
      <Modal isOpen={isOpen} onClose={onClose}>
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
    </VStack>
  );
};

export default FinanceTransactions;
