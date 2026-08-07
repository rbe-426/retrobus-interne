import React, { useState, useEffect, useCallback } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Badge, Table, Thead, Tbody, Tr, Th, Td,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, FormControl, FormLabel, Input, Select,
  NumberInput, NumberInputField, Textarea, useToast, Icon, Flex,
  Progress, Stat, StatLabel, StatNumber, StatGroup, Spinner,
  Tooltip, IconButton, Collapse, Alert, AlertIcon
} from "@chakra-ui/react";
import {
  FiPlus, FiEdit2, FiTrash2, FiAlertCircle, FiChevronDown,
  FiChevronUp, FiLink, FiCheckCircle, FiClock, FiXCircle, FiInfo
} from "react-icons/fi";
import { fetchWithCSRF } from "../../lib/csrfClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TYPE_LABELS = { DETTE: "Dette", CRÉANCE: "Créance" };
const DEBTOR_TYPE_LABELS = { MEMBER: "Membre", ASSOCIATION: "Association", OTHER: "Autre" };
const STATUS_CONFIG = {
  EN_COURS: { label: "En cours", color: "orange", icon: FiClock },
  PAYÉE: { label: "Réglée", color: "green", icon: FiCheckCircle },
  ANNULÉE: { label: "Annulée", color: "gray", icon: FiXCircle }
};

const EMPTY_FORM = {
  type: "DETTE",
  debtNature: "DETTE_NORMALE",
  description: "",
  amount: "",
  debtorType: "OTHER",
  debtorName: "",
  dueDate: "",
  notes: "",
  status: "EN_COURS"
};

/**
 * Composant de gestion des dettes et créances
 * Suivi intelligent des remboursements via liaison avec transactions
 */
const FinanceDebts = () => {
  const toast = useToast();
  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [expandedDebt, setExpandedDebt] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const loadDebts = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("⚠️ Pas de token d'authentification, chargement des dettes annulé");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/finance/debts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          toast({ title: "Session expirée", description: "Veuillez vous reconnecter", status: "warning", duration: 4000 });
        } else {
          throw new Error("Erreur chargement");
        }
        return;
      }
      const data = await res.json();
      setDebts(data.debts || []);
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de charger les dettes", status: "error", duration: 4000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadDebts(); }, [loadDebts]);

  const openAdd = () => {
    setEditingDebt(null);
    setFormData(EMPTY_FORM);
    onFormOpen();
  };

  const openEdit = (debt) => {
    setEditingDebt(debt);
    setFormData({
      type: debt.type,
      debtNature: debt.debtNature || "DETTE_NORMALE",
      description: debt.description,
      amount: String(debt.amount),
      debtorType: debt.debtorType,
      debtorName: debt.debtorName,
      dueDate: debt.dueDate ? debt.dueDate.substring(0, 10) : "",
      notes: debt.notes || "",
      status: debt.status
    });
    onFormOpen();
  };

  const handleSave = async () => {
    if (!formData.description || !formData.amount || !formData.debtorName) {
      toast({ title: "Champs requis", description: "Description, montant et nom requis", status: "warning", duration: 3000 });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, amount: parseFloat(formData.amount) };
      console.log("📤 Envoi dette:", payload);
      
      let res;
      if (editingDebt) {
        res = await fetchWithCSRF(`${API_BASE}/api/finance/debts/${editingDebt.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetchWithCSRF(`${API_BASE}/api/finance/debts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        console.error("❌ Erreur backend:", res.status, errorData);
        throw new Error(errorData.error || `Erreur ${res.status}`);
      }
      
      toast({ title: editingDebt ? "Dette mise à jour" : "Dette ajoutée", status: "success", duration: 3000 });
      onFormClose();
      await loadDebts();
    } catch (e) {
      console.error("❌ Erreur sauvegarde dette:", e);
      toast({ 
        title: "Erreur", 
        description: e.message || "Impossible de sauvegarder", 
        status: "error", 
        duration: 4000 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (debt) => {
    if (!window.confirm(`Supprimer "${debt.description}" ? Cette action est irréversible.`)) return;
    try {
      const res = await fetchWithCSRF(`${API_BASE}/api/finance/debts/${debt.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
      toast({ title: "Dette supprimée", status: "success", duration: 3000 });
      await loadDebts();
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de supprimer", status: "error", duration: 4000 });
    }
  };

  const handleStatusChange = async (debt, newStatus) => {
    try {
      const res = await fetchWithCSRF(`${API_BASE}/api/finance/debts/${debt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error();
      await loadDebts();
    } catch (e) {
      toast({ title: "Erreur mise à jour statut", status: "error", duration: 3000 });
    }
  };

  const filtered = debts.filter(d => {
    if (filterType !== "ALL" && d.type !== filterType) return false;
    if (filterStatus !== "ALL" && d.status !== filterStatus) return false;
    return true;
  });

  const totalDettes = debts.filter(d => d.type === "DETTE" && d.status !== "ANNULÉE").reduce((s, d) => s + d.amount, 0);
  const totalCreances = debts.filter(d => d.type === "CRÉANCE" && d.status !== "ANNULÉE").reduce((s, d) => s + d.amount, 0);
  const totalRestantDettes = debts.filter(d => d.type === "DETTE" && d.status !== "ANNULÉE").reduce((s, d) => s + (d.remainingAmount ?? d.amount), 0);
  const totalRestantCreances = debts.filter(d => d.type === "CRÉANCE" && d.status !== "ANNULÉE").reduce((s, d) => s + (d.remainingAmount ?? d.amount), 0);

  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.EN_COURS;
    return (
      <Badge colorScheme={cfg.color} display="inline-flex" alignItems="center" gap={1}>
        <Icon as={cfg.icon} boxSize={3} />
        {cfg.label}
      </Badge>
    );
  };

  return (
    <VStack align="stretch" spacing={6}>
      {/* Header */}
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Heading size="lg">Dettes & Créances</Heading>
          <Text color="gray.500" fontSize="sm">
            Suivi des remboursements et des sommes dues
          </Text>
        </Box>
        <Button leftIcon={<FiPlus />} colorScheme="purple" onClick={openAdd}>
          Nouveau
        </Button>
      </HStack>

      {/* Statistiques */}
      <StatGroup>
        <Card flex={1}>
          <CardBody>
            <Stat>
              <StatLabel color="red.600">Dettes — Restant dû</StatLabel>
              <StatNumber color="red.700" fontSize="2xl">{totalRestantDettes.toFixed(2)} €</StatNumber>
              <Text fontSize="xs" color="gray.500">sur {totalDettes.toFixed(2)} € au total</Text>
            </Stat>
          </CardBody>
        </Card>
        <Card flex={1}>
          <CardBody>
            <Stat>
              <StatLabel color="green.600">Créances — Restant à recevoir</StatLabel>
              <StatNumber color="green.700" fontSize="2xl">{totalRestantCreances.toFixed(2)} €</StatNumber>
              <Text fontSize="xs" color="gray.500">sur {totalCreances.toFixed(2)} € au total</Text>
            </Stat>
          </CardBody>
        </Card>
        <Card flex={1}>
          <CardBody>
            <Stat>
              <StatLabel color="blue.600">Balance nette</StatLabel>
              <StatNumber color={(totalRestantCreances - totalRestantDettes) >= 0 ? "green.700" : "red.700"} fontSize="2xl">
                {(totalRestantCreances - totalRestantDettes) >= 0 ? "+" : ""}
                {(totalRestantCreances - totalRestantDettes).toFixed(2)} €
              </StatNumber>
              <Text fontSize="xs" color="gray.500">créances − dettes</Text>
            </Stat>
          </CardBody>
        </Card>
      </StatGroup>

      {/* Filtres */}
      <HStack spacing={3} flexWrap="wrap">
        <Select w="160px" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="ALL">Tous types</option>
          <option value="DETTE">Dettes</option>
          <option value="CRÉANCE">Créances</option>
        </Select>
        <Select w="160px" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="ALL">Tous statuts</option>
          <option value="EN_COURS">En cours</option>
          <option value="PAYÉE">Réglées</option>
          <option value="ANNULÉE">Annulées</option>
        </Select>
        <Text fontSize="sm" color="gray.500">{filtered.length} élément(s)</Text>
      </HStack>

      {/* Liste */}
      <Card>
        <CardBody p={0}>
          {loading ? (
            <Flex justify="center" py={10}><Spinner color="purple.500" /></Flex>
          ) : filtered.length === 0 ? (
            <Text color="gray.500" textAlign="center" py={10}>
              Aucune dette/créance trouvée
            </Text>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr bg="gray.50">
                  <Th>Type</Th>
                  <Th>Description / Tiers</Th>
                  <Th isNumeric>Total</Th>
                  <Th isNumeric>Réglé</Th>
                  <Th isNumeric>Restant</Th>
                  <Th w="160px">Progression</Th>
                  <Th>Échéance</Th>
                  <Th>Statut</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((debt) => {
                  const isExpanded = expandedDebt === debt.id;
                  const paidAmt = debt.paidAmount || 0;
                  const remaining = debt.remainingAmount ?? Math.max(0, debt.amount - paidAmt);
                  const progress = debt.progressPercent ?? (debt.amount > 0 ? Math.min(100, Math.round((paidAmt / debt.amount) * 100)) : 0);
                  const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date() && debt.status === "EN_COURS";
                  return (
                    <React.Fragment key={debt.id}>
                      <Tr _hover={{ bg: "gray.50" }} opacity={debt.status === "ANNULÉE" ? 0.6 : 1}>
                        <Td>
                          <Badge colorScheme={debt.type === "DETTE" ? "red" : "green"} variant="subtle">
                            {TYPE_LABELS[debt.type] || debt.type}
                          </Badge>
                        </Td>
                        <Td>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="600" fontSize="sm">{debt.description}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {DEBTOR_TYPE_LABELS[debt.debtorType] || debt.debtorType}: <b>{debt.debtorName}</b>
                            </Text>
                          </VStack>
                        </Td>
                        <Td isNumeric fontWeight="bold" color={debt.type === "DETTE" ? "red.600" : "green.600"}>
                          {debt.amount.toFixed(2)} €
                        </Td>
                        <Td isNumeric color="gray.600">{paidAmt.toFixed(2)} €</Td>
                        <Td isNumeric fontWeight="bold" color={remaining > 0 ? (debt.type === "DETTE" ? "red.500" : "green.500") : "gray.400"}>
                          {remaining.toFixed(2)} €
                        </Td>
                        <Td>
                          <VStack spacing={1}>
                            <Progress
                              value={progress}
                              size="sm"
                              w="full"
                              colorScheme={progress >= 100 ? "green" : debt.type === "DETTE" ? "orange" : "blue"}
                              borderRadius="full"
                            />
                            <Text fontSize="xs" color="gray.500">{progress}%</Text>
                          </VStack>
                        </Td>
                        <Td>
                          {debt.dueDate ? (
                            <Text fontSize="sm" color={isOverdue ? "red.500" : "gray.700"} fontWeight={isOverdue ? "bold" : "normal"}>
                              {isOverdue && "⚠️ "}
                              {new Date(debt.dueDate).toLocaleDateString("fr-FR")}
                            </Text>
                          ) : (
                            <Text fontSize="sm" color="gray.400">—</Text>
                          )}
                        </Td>
                        <Td>
                          <Select
                            size="xs"
                            value={debt.status}
                            onChange={(e) => handleStatusChange(debt, e.target.value)}
                            w="110px"
                            isDisabled={debt.status === "ANNULÉE"}
                          >
                            <option value="EN_COURS">En cours</option>
                            <option value="PAYÉE">Réglée</option>
                            <option value="ANNULÉE">Annulée</option>
                          </Select>
                        </Td>
                        <Td>
                          <HStack spacing={1}>
                            <Tooltip label={isExpanded ? "Masquer transactions" : "Voir transactions"}>
                              <IconButton
                                size="xs"
                                icon={isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                variant="ghost"
                                colorScheme="blue"
                                onClick={() => setExpandedDebt(isExpanded ? null : debt.id)}
                                aria-label="Transactions"
                              />
                            </Tooltip>
                            <Tooltip label="Modifier">
                              <IconButton
                                size="xs"
                                icon={<FiEdit2 />}
                                variant="ghost"
                                onClick={() => openEdit(debt)}
                              />
                            </Tooltip>
                            <Tooltip label="Supprimer">
                              <IconButton
                                size="xs"
                                icon={<FiTrash2 />}
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleDelete(debt)}
                              />
                            </Tooltip>
                          </HStack>
                        </Td>
                      </Tr>
                      {/* Détails transactions liées */}
                      {isExpanded && (
                        <Tr>
                          <Td colSpan={9} bg="blue.50" px={6} py={3}>
                            <VStack align="stretch" spacing={2}>
                              <HStack>
                                <Icon as={FiLink} color="blue.500" />
                                <Text fontWeight="600" fontSize="sm" color="blue.700">
                                  Transactions liées ({(debt.linkedTransactions || []).length})
                                </Text>
                              </HStack>
                              {debt.notes && (
                                <Text fontSize="xs" color="gray.600" fontStyle="italic">
                                  📝 {debt.notes}
                                </Text>
                              )}
                              {(debt.linkedTransactions || []).length === 0 ? (
                                <Text fontSize="sm" color="gray.500" py={2}>
                                  Aucune transaction liée. Créez des transactions depuis l'onglet Transactions et liez-les à cette dette.
                                </Text>
                              ) : (
                                <Table size="sm" variant="simple" bg="white" borderRadius="md">
                                  <Thead>
                                    <Tr>
                                      <Th>Date</Th>
                                      <Th>Description</Th>
                                      <Th>Type</Th>
                                      <Th isNumeric>Montant</Th>
                                    </Tr>
                                  </Thead>
                                  <Tbody>
                                    {debt.linkedTransactions.map((tx) => (
                                      <Tr key={tx.id}>
                                        <Td fontSize="xs">{new Date(tx.date).toLocaleDateString("fr-FR")}</Td>
                                        <Td fontSize="xs">{tx.description || "—"}</Td>
                                        <Td>
                                          <Badge colorScheme={tx.type === "CREDIT" ? "green" : "red"} fontSize="xs">
                                            {tx.type === "CREDIT" ? "Crédit" : "Débit"}
                                          </Badge>
                                        </Td>
                                        <Td isNumeric fontSize="xs" fontWeight="bold" color={tx.type === "CREDIT" ? "green.600" : "red.600"}>
                                          {tx.type === "CREDIT" ? "+" : "-"}{Number(tx.amount).toFixed(2)} €
                                        </Td>
                                      </Tr>
                                    ))}
                                  </Tbody>
                                </Table>
                              )}
                            </VStack>
                          </Td>
                        </Tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Alerte échéances dépassées */}
      {debts.some(d => d.dueDate && new Date(d.dueDate) < new Date() && d.status === "EN_COURS") && (
        <Card bg="red.50" borderColor="red.200" borderWidth={1}>
          <CardBody>
            <HStack>
              <Icon as={FiAlertCircle} color="red.500" boxSize={5} />
              <Text fontSize="sm" color="red.700">
                <b>Attention :</b> certaines dettes/créances ont dépassé leur échéance sans être réglées.
              </Text>
            </HStack>
          </CardBody>
        </Card>
      )}

      {/* Modal ajout/édition */}
      <Modal isOpen={isFormOpen} onClose={onFormClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingDebt ? "Modifier" : "Nouvelle dette / créance"}</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <HStack w="full" spacing={4}>
                <FormControl isRequired flex={1}>
                  <FormLabel>Type</FormLabel>
                  <Select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                    <option value="DETTE">Dette (nous devons)</option>
                    <option value="CRÉANCE">Créance (on nous doit)</option>
                  </Select>
                </FormControl>
                <FormControl isRequired flex={1}>
                  <FormLabel>Nature</FormLabel>
                  <Select value={formData.debtNature || "DETTE_NORMALE"} onChange={(e) => setFormData({ ...formData, debtNature: e.target.value })}>
                    <option value="DETTE_NORMALE">Normale</option>
                    <option value="TROP_PERCU">Trop-perçu</option>
                  </Select>
                </FormControl>
              </HStack>
              
              {formData.debtNature === 'TROP_PERCU' && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Text fontSize="sm">
                    <b>Trop-perçu :</b> argent {formData.type === 'DETTE' ? 'reçu' : 'versé'} en trop. 
                    Les transactions {formData.type === 'DETTE' ? 'CREDIT (+)' : 'DEBIT (-)'} créent la dette, 
                    les {formData.type === 'DETTE' ? 'DEBIT (-)' : 'CREDIT (+)'} la remboursent.
                  </Text>
                </Alert>
              )}

              <HStack w="full" spacing={4}>
                <FormControl isRequired flex={1}>
                  <FormLabel>Montant (€)</FormLabel>
                  <NumberInput
                    value={formData.amount}
                    onChange={(v) => setFormData({ ...formData, amount: v })}
                    min={0}
                    precision={2}
                  >
                    <NumberInputField placeholder="0.00" />
                  </NumberInput>
                </FormControl>
              </HStack>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Input
                  placeholder="Objet de la dette ou créance"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </FormControl>

              <HStack w="full" spacing={4}>
                <FormControl flex={1}>
                  <FormLabel>Type de tiers</FormLabel>
                  <Select value={formData.debtorType} onChange={(e) => setFormData({ ...formData, debtorType: e.target.value })}>
                    <option value="MEMBER">Membre</option>
                    <option value="ASSOCIATION">Association</option>
                    <option value="OTHER">Autre (fournisseur...)</option>
                  </Select>
                </FormControl>
                <FormControl isRequired flex={1}>
                  <FormLabel>Nom du tiers</FormLabel>
                  <Input
                    placeholder={formData.type === "DETTE" ? "Créancier" : "Débiteur"}
                    value={formData.debtorName}
                    onChange={(e) => setFormData({ ...formData, debtorName: e.target.value })}
                  />
                </FormControl>
              </HStack>

              <HStack w="full" spacing={4}>
                <FormControl flex={1}>
                  <FormLabel>Date d'échéance</FormLabel>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </FormControl>
                <FormControl flex={1}>
                  <FormLabel>Statut</FormLabel>
                  <Select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="EN_COURS">En cours</option>
                    <option value="PAYÉE">Réglée</option>
                    <option value="ANNULÉE">Annulée</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  placeholder="Informations complémentaires..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </FormControl>

              <Box w="full" bg="blue.50" borderRadius="md" p={3}>
                <HStack>
                  <Icon as={FiInfo} color="blue.500" />
                  <Text fontSize="xs" color="blue.700">
                    Pour enregistrer un remboursement, créez une transaction depuis l'onglet <b>Transactions</b> et liez-la à cette dette. Le montant réglé sera mis à jour automatiquement.
                  </Text>
                </HStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onFormClose}>Annuler</Button>
            <Button colorScheme="purple" onClick={handleSave} isLoading={saving}>
              {editingDebt ? "Enregistrer" : "Créer"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default FinanceDebts;
