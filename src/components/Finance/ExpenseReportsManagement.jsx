import React, { useState } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Badge, useToast, Table, Thead, Tbody,
  Tr, Th, Td, Alert, AlertIcon, Select, Flex, SimpleGrid, Stat, StatLabel, StatNumber,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Textarea, useDisclosure, Icon
} from "@chakra-ui/react";
import { FiCheck, FiX, FiEye, FiDownload } from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";
import { useUserRoles } from "../../hooks/useUserRoles";

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
    loadFinanceData,
    loading
  } = useFinanceData();

  const userRolesHook = useUserRoles();

  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

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
        'paid': 'Payée',
        'approved': 'Acceptée',
        'open': 'Reçue',
        'closed': 'Refusée'
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

  const handleRejectConfirm = async () => {
    if (!selectedReport) return;
    
    try {
      // Update status to closed (which maps to REJECTED)
      await updateExpenseReportStatus(selectedReport.id, "closed");
      
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
      PENDING: { colorScheme: "yellow", label: "En attente" },
      APPROVED: { colorScheme: "blue", label: "Approuvée" },
      PAID: { colorScheme: "green", label: "Payée" },
      REJECTED: { colorScheme: "red", label: "Rejetée" }
    };
    const config = statusConfig[normalizedStatus] || statusConfig.PENDING;
    return <Badge colorScheme={config.colorScheme}>{config.label}</Badge>;
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
                  <Th>Membre dépositaire</Th>
                  <Th>Description</Th>
                  <Th isNumeric>Montant</Th>
                  <Th>Statut</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredReports.map(report => (
                  <Tr key={report.id}>
                    <Td>{formatDate(report.date || report.createdAt)}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="sm">
                          {report.createdBy || report.userName || "Utilisateur"}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {report.userEmail || "N/A"}
                        </Text>
                      </VStack>
                    </Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="sm">
                          {report.description}
                        </Text>
                        {report.notes && (
                          <Text fontSize="xs" color="gray.500">
                            {report.notes}
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
                              Acceptée
                            </Button>
                            <Button
                              size="xs"
                              leftIcon={<FiX />}
                              colorScheme="red"
                              variant="outline"
                              onClick={() => handleRejectClick(report)}
                              isLoading={loading}
                            >
                              Refusée
                            </Button>
                            {normalizeStatus(report.status) !== "REJECTED" && (
                              <Button
                                size="xs"
                                leftIcon={<FiCheck />}
                                colorScheme="blue"
                                variant="outline"
                                onClick={() => handleStatusChange(report.id, "open")}
                                isLoading={loading}
                              >
                                Reçue
                              </Button>
                            )}
                          </>
                        )}

                        {normalizeStatus(report.status) === "APPROVED" && (
                          <Button
                            size="xs"
                            leftIcon={<FiCheck />}
                            colorScheme="green"
                            onClick={() => handleStatusChange(report.id, "paid")}
                            isLoading={loading}
                          >
                            Marquer payée
                          </Button>
                        )}

                        {report.fileUrl && (
                          <Button
                            size="xs"
                            leftIcon={<FiEye />}
                            variant="ghost"
                            colorScheme="blue"
                            as="a"
                            href={report.fileUrl}
                            target="_blank"
                            title="Voir la pièce jointe"
                          >
                            PJ
                          </Button>
                        )}
                        {report.attachment && (
                          <Button
                            size="xs"
                            leftIcon={<FiDownload />}
                            variant="ghost"
                            colorScheme="blue"
                            as="a"
                            href={report.attachment}
                            target="_blank"
                            title="Télécharger"
                          >
                            DL
                          </Button>
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                ))}
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
