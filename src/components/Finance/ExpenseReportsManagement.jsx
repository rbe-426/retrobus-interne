import React, { useState } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Badge, useToast, Table, Thead, Tbody,
  Tr, Th, Td, Alert, AlertIcon, Select, Flex, SimpleGrid, Stat, StatLabel, StatNumber
} from "@chakra-ui/react";
import { FiCheck, FiX, FiEye } from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";

/**
 * ExpenseReportsManagement - Gestion des notes de frais
 * Accessible UNIQUEMENT au Président, Vice-Président et Trésorier
 * Permet l'approbation et le paiement
 */
const ExpenseReportsManagement = ({ currentUser }) => {
  const {
    expenseReports,
    updateExpenseReportStatus,
    loading
  } = useFinanceData();

  const [filterStatus, setFilterStatus] = useState("PENDING");
  const toast = useToast();

  // Vérifier les droits d'accès
  const hasAccess = currentUser?.roles?.some(role =>
    ["PRESIDENT", "VICE_PRESIDENT", "TRESORIER"].includes(role)
  );

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
      await updateExpenseReportStatus(reportId, newStatus);
      toast({
        title: "Statut mis à jour",
        description: `La note est maintenant "${newStatus === "PAID" ? "Payée" : newStatus === "APPROVED" ? "Approuvée" : "Rejetée"}"`,
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { colorScheme: "yellow", label: "En attente" },
      APPROVED: { colorScheme: "blue", label: "Approuvée" },
      PAID: { colorScheme: "green", label: "Payée" },
      REJECTED: { colorScheme: "red", label: "Rejetée" }
    };
    const config = statusConfig[status] || statusConfig.PENDING;
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

  // Filtrer par statut
  const filteredReports = filterStatus === "ALL"
    ? expenseReports
    : expenseReports.filter(r => r.status === filterStatus);

  // Statistiques
  const stats = {
    pending: expenseReports.filter(r => r.status === "PENDING").length,
    pendingAmount: expenseReports
      .filter(r => r.status === "PENDING")
      .reduce((sum, r) => sum + (r.amount || 0), 0),
    approved: expenseReports.filter(r => r.status === "APPROVED").length,
    approvedAmount: expenseReports
      .filter(r => r.status === "APPROVED")
      .reduce((sum, r) => sum + (r.amount || 0), 0),
    paid: expenseReports.filter(r => r.status === "PAID").length,
    paidAmount: expenseReports
      .filter(r => r.status === "PAID")
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
                  <Th>Collaborateur</Th>
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
                          {report.userName || "Utilisateur"}
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
                      <HStack spacing={2}>
                        {report.status === "PENDING" && (
                          <>
                            <Button
                              size="xs"
                              leftIcon={<FiCheck />}
                              colorScheme="blue"
                              variant="outline"
                              onClick={() => handleStatusChange(report.id, "APPROVED")}
                              isLoading={loading}
                            >
                              Approuver
                            </Button>
                            <Button
                              size="xs"
                              leftIcon={<FiX />}
                              colorScheme="red"
                              variant="outline"
                              onClick={() => handleStatusChange(report.id, "REJECTED")}
                              isLoading={loading}
                            >
                              Rejeter
                            </Button>
                          </>
                        )}

                        {report.status === "APPROVED" && (
                          <Button
                            size="xs"
                            leftIcon={<FiCheck />}
                            colorScheme="green"
                            onClick={() => handleStatusChange(report.id, "PAID")}
                            isLoading={loading}
                          >
                            Marquer payée
                          </Button>
                        )}

                        {report.attachment && (
                          <Button
                            size="xs"
                            leftIcon={<FiEye />}
                            variant="ghost"
                            colorScheme="blue"
                            as="a"
                            href={report.attachment}
                            target="_blank"
                          >
                            Voir PJ
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
    </VStack>
  );
};

export default ExpenseReportsManagement;
