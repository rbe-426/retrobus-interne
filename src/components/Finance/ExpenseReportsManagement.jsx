import React, { useEffect, useRef, useState } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Badge, useToast, Table, Thead, Tbody,
  Tr, Th, Td, Alert, AlertIcon, Select, Flex, SimpleGrid, Stat, StatLabel, StatNumber,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Textarea, useDisclosure, Icon, Link, Input
} from "@chakra-ui/react";
import { FiCheck, FiX, FiEye, FiDownload, FiExternalLink, FiUpload } from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";
import { useUserRoles } from "../../hooks/useUserRoles";
import { membersAPI } from "../../api/members";

const DEFAULT_EXPENSE_REPORT_TYPE = "NDF avec justificatif";

const EXPENSE_REPORT_TYPE_COLORS = {
  "NDF avec justificatif": "green",
  "Frais KM": "blue"
};

const LEGACY_EXPENSE_REPORT_TYPES = {
  "Note de frais avec justificatif": "NDF avec justificatif",
  "Frais de déplacement": "Frais KM"
};
const BANK_TRANSFER_URL = import.meta.env.VITE_BANK_TRANSFER_URL || "https://mabanque.bnpparibas/";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

/**
 * ExpenseReportsManagement - Gestion des notes de frais
 * Accessible UNIQUEMENT au Président, Vice-Président et Trésorier
 * Permet l'approbation et le paiement
 */
const ExpenseReportsManagement = ({ currentUser, userRoles }) => {
  const {
    expenseReports,
    updateExpenseReport,
    updateExpenseReportStatus,
    uploadExpenseReportTransferProof,
    loadFinanceData,
    loading
  } = useFinanceData();

  const userRolesHook = useUserRoles();

  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [members, setMembers] = useState([]);
  const [proofUploadReportId, setProofUploadReportId] = useState(null);
  const proofInputRef = useRef(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    let active = true;

    membersAPI.getAll()
      .then((result) => {
        if (active) setMembers(result?.members || []);
      })
      .catch(() => {
        if (active) setMembers([]);
      });

    return () => {
      active = false;
    };
  }, []);

  // Vérifier les droits d'accès - utiliser le nouveau hook qui centralise tout
  const hasAccess = userRolesHook.hasFinanceAccess();

  if (!hasAccess) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <Heading size="sm">Accès refusé</Heading>
          <Text fontSize="sm">
            Vous n'avez pas les permissions nécessaires pour gérer les notes de frais
          </Text>
        </Box>
      </Alert>
    );
  }

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      await updateExpenseReport(reportId, { status: newStatus });
      
      // Recharger les données pour refléter le changement
      await loadFinanceData();
      
      const statusLabels = {
        'paid': '✅ Payée',
        'approved': '⏳ En cours de traitement',
        'open': '✉️ Envoyée',
        'closed': '❌ NDF refusée'
      };
      
      toast({
        title: "Statut mis à jour",
        description: `La note est maintenant "${statusLabels[newStatus] || newStatus}"`,
        status: "success",
        duration: 2000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut",
        status: "error"
      });
    }
  };

  const handleRejectClick = (report) => {
    setSelectedReport(report);
    setRejectionReason("");
    onOpen();
  };

  const handleOpenBank = () => {
    window.open(BANK_TRANSFER_URL, "_blank", "noopener,noreferrer");
  };

  const handleProofSelection = async (event) => {
    const file = event.target.files?.[0];
    const reportId = proofUploadReportId;
    event.target.value = "";
    setProofUploadReportId(null);
    if (!file || !reportId) return;

    const acceptedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!acceptedTypes.includes(file.type)) {
      toast({ title: "Format invalide", description: "La preuve doit être un PDF, JPG ou PNG.", status: "error" });
      return;
    }
    const updated = await uploadExpenseReportTransferProof(reportId, file);
    if (updated) {
      toast({ title: "Virement validé", description: "La preuve est stockée de manière sécurisée.", status: "success" });
    }
  };

  const handleViewTransferProof = async (report) => {
    try {
      const response = await fetch(`${API_BASE}/api/finance/expense-reports/${report.id}/transfer-proof`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Impossible de consulter la preuve de virement");
      }
      const url = URL.createObjectURL(await response.blob());
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast({ title: "Erreur", description: error.message, status: "error" });
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedReport) return;
    
    try {
      // Update status to closed (which maps to REJECTED) with reason
      await updateExpenseReportStatus(selectedReport.id, "closed", rejectionReason);
      
      // Recharger les données pour refléter le changement
      await loadFinanceData();
      
      // Send RétroMail to the creator
      if (selectedReport.userId) {
        await fetch("/api/retromail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: selectedReport.userId,
            subject: `Votre note de frais a été refusée`,
            body: `Votre note de frais "${selectedReport.description}" (${selectedReport.amount}€) a été refusée.\n\nMotif du refus: ${rejectionReason || "Non spécifié"}`,
            type: "expense_rejection"
          })
        }).catch(e => console.log("RétroMail non disponible:", e));
      }
      
      toast({
        title: "Note refusée",
        description: `La note a été refusée et un message a été envoyé au membre dépositaire`,
        status: "success",
        duration: 3000,
        isClosable: true
      });
      
      onClose();
      setSelectedReport(null);
      setRejectionReason("");
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de refuser la note",
        status: "error"
      });
    }
  };

  const getStatusBadge = (status) => {
    // Mapper les statuts de la BD aux statuts de l'app
    const statusMap = {
      'open': 'PENDING',
      'PENDING': 'PENDING',
      'approved': 'APPROVED',
      'APPROVED': 'APPROVED',
      'paid': 'PAID',
      'PAID': 'PAID',
      'closed': 'REJECTED',
      'REJECTED': 'REJECTED',
    };
    
    const normalizedStatus = statusMap[status] || 'PENDING';
    
    const statusConfig = {
      PENDING: { colorScheme: "yellow", label: "✉️ Envoyée" },
      APPROVED: { colorScheme: "blue", label: "⏳ En attente de preuve de virement" },
      PAID: { colorScheme: "green", label: "✅ Payée" },
      REJECTED: { colorScheme: "red", label: "❌ NDF refusée" }
    };
    const config = statusConfig[normalizedStatus] || statusConfig.PENDING;
    return <Badge colorScheme={config.colorScheme}>{config.label}</Badge>;
  };

  const getTypeBadge = (type) => {
    const label = LEGACY_EXPENSE_REPORT_TYPES[type] || type || DEFAULT_EXPENSE_REPORT_TYPE;
    return <Badge colorScheme={EXPENSE_REPORT_TYPE_COLORS[label] || "gray"}>{label}</Badge>;
  };

  const getAttachmentUrl = (report) => report.fileUrl || report.attachmentUrl || report.attachment;

  const getAttachmentLabel = (report) => report.fileName || report.attachmentFileName || "Voir la pièce jointe";

  const getDepositor = (report) => {
    const identifiers = [report.userId, report.createdBy]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
    const member = members.find((candidate) => {
      const candidateIdentifiers = [candidate.id, candidate.email, candidate.matricule]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());
      return candidateIdentifiers.some((identifier) => identifiers.includes(identifier));
    });

    if (!member) {
      return {
        name: report.createdBy || report.userId || "Utilisateur",
        role: "Profil adhérent introuvable",
        matricule: "-"
      };
    }

    const roleLabels = {
      PRESIDENT: "Président",
      VICE_PRESIDENT: "Vice-président",
      TRESORIER: "Trésorier",
      SECRETAIRE_GENERAL: "Secrétaire général",
      MEMBER: "Membre",
      USER: "Membre"
    };
    const role = String(member.role || "MEMBER").toUpperCase();
    const isPresident = String(member.matricule || "").toLowerCase() === "w.belaidi" ||
      String(member.email || "").toLowerCase() === "belaidiw91@gmail.com";
    return {
      name: `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email,
      role: isPresident ? "Président" : roleLabels[role] || "Membre",
      matricule: member.matricule || "-"
    };
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

  const formatTravelDescription = (addresses, roundTrip, intermediateRoundTrips = []) => {
    if (addresses.length === 0) return "";
    
    // Aller simple avec 2 adresses
    if (addresses.length === 2 && !roundTrip && !intermediateRoundTrips.some(Boolean)) {
      return `📍 ${addresses[0]} ➡️ 📍 ${addresses[1]}`;
    }
    
    // Aller-retour simple avec 2 adresses
    if (addresses.length === 2 && roundTrip) {
      return `📍 ${addresses[0]} ↔️ 📍 ${addresses[1]}`;
    }
    
    // Trajet multiple
    const parts = [];
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      
      if (i === 0) {
        parts.push(`📍 ${address}`);
      } else {
        const hasIntermediateRT = i >= 2 && intermediateRoundTrips[i];
        const arrow = hasIntermediateRT ? " ↔️ 📍 " : " ➡️ 📍 ";
        parts.push(`${arrow}${address}`);
      }
    }
    
    if (roundTrip) {
      parts.push(` ↔️ 📍 ${addresses[0]}`);
    }
    
    return parts.join("");
  };

  const parseAndFormatOldTravelNotes = (notes) => {
    if (!notes || typeof notes !== 'string') return notes;
    
    if (!notes.includes('Départ:') && !notes.includes('Distance parcourue:')) {
      return notes;
    }
    
    const addresses = [];
    const addressLines = notes.split('\n').filter(line => 
      line.includes('Départ:') || line.includes('Étape')
    );
    
    addressLines.forEach(line => {
      const match = line.match(/(?:Départ|Étape \d+):\s*([^(]+?)(?:\s*\(A\/R.*\))?$/);
      if (match) {
        addresses.push(match[1].trim());
      }
    });
    
    const hasRoundTrip = notes.includes('Aller-retour complet: Oui');
    const intermediateRoundTrips = addressLines.map(line => 
      line.includes('(A/R avec précédente)') || line.includes('(A/R précédente)')
    );
    
    if (addresses.length > 0) {
      const travelDesc = formatTravelDescription(addresses, hasRoundTrip, intermediateRoundTrips);
      
      const distanceMatch = notes.match(/Distance parcourue:\s*([\d.]+)\s*km/);
      const montantMatch = notes.match(/Montant calculé:\s*([\d.]+)\s*km\s*×\s*[\d,]+\s*€\s*\/\s*km\s*=\s*([\d,]+)\s*€/);
      
      const parts = [travelDesc];
      if (distanceMatch) {
        parts.push(`Distance: ${distanceMatch[1]} km`);
      }
      if (montantMatch) {
        parts.push(`Montant: ${montantMatch[2]} €`);
      }
      
      return parts.join(' • ');
    }
    
    return notes;
  };

  // Helper pour normaliser le statut
  const normalizeStatus = (status) => {
    const map = {
      'open': 'PENDING',
      'approved': 'APPROVED',
      'paid': 'PAID',
      'closed': 'REJECTED',
    };
    return map[status?.toLowerCase()] || status;
  };

  // Filtrer par statut
  const filteredReports = (() => {
    const normalized = filterStatus === "ALL" ? "ALL" : normalizeStatus(filterStatus);
    if (normalized === "ALL") {
      return expenseReports;
    }
    return expenseReports.filter(r => normalizeStatus(r.status) === normalized);
  })();

  // Statistiques
  const stats = {
    pending: expenseReports.filter(r => normalizeStatus(r.status) === "PENDING").length,
    pendingAmount: expenseReports
      .filter(r => normalizeStatus(r.status) === "PENDING")
      .reduce((sum, r) => sum + (r.amount || 0), 0),
    approved: expenseReports.filter(r => normalizeStatus(r.status) === "APPROVED").length,
    approvedAmount: expenseReports
      .filter(r => normalizeStatus(r.status) === "APPROVED")
      .reduce((sum, r) => sum + (r.amount || 0), 0),
    paid: expenseReports.filter(r => normalizeStatus(r.status) === "PAID").length,
    paidAmount: expenseReports
      .filter(r => normalizeStatus(r.status) === "PAID")
      .reduce((sum, r) => sum + (r.amount || 0), 0)
  };

  return (
    <VStack align="stretch" spacing={6}>
      <Input
        ref={proofInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        display="none"
        onChange={handleProofSelection}
      />
      {/* Header */}
      <Box>
        <Heading size="lg">Gestion des notes de frais</Heading>
        <Text color="gray.500" fontSize="sm">
          Approuvez et réglez les notes de frais des collaborateurs
        </Text>
      </Box>

      {/* Statistiques */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Card borderLeft="4px solid" borderLeftColor="yellow.400">
          <CardBody>
            <Stat>
              <StatLabel>En attente d'approbation</StatLabel>
              <StatNumber color="yellow.600">{stats.pending}</StatNumber>
              <Text fontSize="sm" color="gray.500">
                {formatCurrency(stats.pendingAmount)}
              </Text>
            </Stat>
          </CardBody>
        </Card>

        <Card borderLeft="4px solid" borderLeftColor="blue.400">
          <CardBody>
            <Stat>
              <StatLabel>Approuvées (en attente de paiement)</StatLabel>
              <StatNumber color="blue.600">{stats.approved}</StatNumber>
              <Text fontSize="sm" color="gray.500">
                {formatCurrency(stats.approvedAmount)}
              </Text>
            </Stat>
          </CardBody>
        </Card>

        <Card borderLeft="4px solid" borderLeftColor="green.400">
          <CardBody>
            <Stat>
              <StatLabel>Payées (ce mois)</StatLabel>
              <StatNumber color="green.600">{stats.paid}</StatNumber>
              <Text fontSize="sm" color="gray.500">
                {formatCurrency(stats.paidAmount)}
              </Text>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Filtres */}
      <HStack>
        <Text fontWeight="bold" fontSize="sm">Filtrer par statut:</Text>
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          maxW="250px"
        >
          <option value="ALL">Toutes les notes</option>
          <option value="PENDING">En attente d'approbation</option>
          <option value="APPROVED">Approuvées (à payer)</option>
          <option value="PAID">Payées</option>
          <option value="REJECTED">Rejetées</option>
        </Select>
      </HStack>

      {/* Tableau des notes */}
      {filteredReports.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          Aucune note de frais avec ce statut
        </Alert>
      ) : (
        <Card>
          <CardBody p={0}>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr bg="gray.50">
                  <Th>Date</Th>
                  <Th>Membre depositaire</Th>
                  <Th>Type</Th>
                  <Th>Description</Th>
                  <Th isNumeric>Montant</Th>
                  <Th>Statut</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredReports.map(report => {
                  const depositor = getDepositor(report);
                  return (
                    <Tr key={report.id}>
                    <Td>{formatDate(report.date || report.createdAt)}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="sm">
                          {depositor.name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {depositor.role}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {depositor.matricule}
                        </Text>
                      </VStack>
                    </Td>
                    <Td>{getTypeBadge(report.type)}</Td>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="bold" fontSize="sm">
                          {report.description}
                        </Text>
                        {report.notes && (
                          <Text fontSize="xs" color="gray.500">
                            Remarques: {parseAndFormatOldTravelNotes(report.notes)}
                          </Text>
                        )}
                        {report.statusNotes && (
                          <Text fontSize="xs" color="red.600">
                            Motif: {report.statusNotes}
                          </Text>
                        )}
                        {getAttachmentUrl(report) && (
                          <HStack spacing={2} mt={1}>
                            <Icon as={FiDownload} boxSize={3} color="blue.500" />
                            <Link
                              href={getAttachmentUrl(report)}
                              target="_blank"
                              rel="noopener noreferrer"
                              color="blue.500"
                              fontSize="xs"
                              fontWeight="500"
                            >
                              {getAttachmentLabel(report)}
                            </Link>
                          </HStack>
                        )}
                        {!getAttachmentUrl(report) && (
                          <Text fontSize="xs" color="orange.600">
                            ⚠️ Pas de pièce jointe
                          </Text>
                        )}
                      </VStack>
                    </Td>
                    <Td isNumeric fontWeight="bold">
                      {formatCurrency(report.amount)}
                    </Td>
                    <Td>{getStatusBadge(report.status)}</Td>
                    <Td>
                      <HStack spacing={2} wrap="wrap">
                        {normalizeStatus(report.status) === "PENDING" && (
                          <>
                            <Button
                              size="xs"
                              leftIcon={<FiCheck />}
                              colorScheme="green"
                              variant="outline"
                              onClick={() => handleStatusChange(report.id, "approved")}
                              isLoading={loading}
                            >
                              En cours de traitement
                            </Button>
                            <Button
                              size="xs"
                              leftIcon={<FiX />}
                              colorScheme="red"
                              variant="outline"
                              onClick={() => handleRejectClick(report)}
                              isLoading={loading}
                            >
                              Refuser
                            </Button>
                          </>
                        )}

                        {normalizeStatus(report.status) === "APPROVED" && (
                          <>
                            <Button
                              size="xs"
                              leftIcon={<FiExternalLink />}
                              colorScheme="blue"
                              variant="outline"
                              onClick={handleOpenBank}
                            >
                              Ouvrir la banque
                            </Button>
                            <Button
                              size="xs"
                              leftIcon={<FiUpload />}
                              colorScheme="green"
                              onClick={() => {
                                setProofUploadReportId(report.id);
                                proofInputRef.current?.click();
                              }}
                              isLoading={loading}
                            >
                              Déposer la preuve et valider
                            </Button>
                          </>
                        )}

                        {report.transferProofFileName && (
                          <Button
                            size="xs"
                            leftIcon={<FiDownload />}
                            variant="ghost"
                            colorScheme="green"
                            onClick={() => handleViewTransferProof(report)}
                            title={`Voir la preuve : ${report.transferProofFileName}`}
                          >
                            Preuve
                          </Button>
                        )}

                        {getAttachmentUrl(report) && (
                          <Button
                            size="xs"
                            leftIcon={<FiEye />}
                            variant="ghost"
                            colorScheme="blue"
                            as="a"
                            href={getAttachmentUrl(report)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Voir la pièce jointe"
                          >
                            PJ
                          </Button>
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* Modal de refus avec motif */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Refuser la note de frais</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {selectedReport && (
                <>
                  <Box bg="gray.50" p={4} borderRadius="md" w="full">
                    <Text fontSize="sm" fontWeight="bold" mb={2}>Note à refuser:</Text>
                    <Text fontSize="sm"><strong>Membre:</strong> {selectedReport.createdBy || selectedReport.userName}</Text>
                    <Text fontSize="sm"><strong>Type:</strong> {selectedReport.type || DEFAULT_EXPENSE_REPORT_TYPE}</Text>
                    <Text fontSize="sm"><strong>Description:</strong> {selectedReport.description}</Text>
                    <Text fontSize="sm"><strong>Montant:</strong> {formatCurrency(selectedReport.amount)}</Text>
                  </Box>
                  
                  <FormControl isRequired>
                    <FormLabel>Motif du refus</FormLabel>
                    <Textarea
                      placeholder="Expliquez pourquoi cette note est refusée..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                    />
                  </FormControl>
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button
              colorScheme="red"
              onClick={handleRejectConfirm}
              isDisabled={!rejectionReason.trim()}
              isLoading={loading}
            >
              Refuser et notifier
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default ExpenseReportsManagement;
