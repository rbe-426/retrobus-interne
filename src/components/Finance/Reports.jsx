import React, { useState } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Badge, Select, useToast,
  SimpleGrid, Stat, StatLabel, StatNumber, Table,
  Thead, Tbody, Tr, Th, Td, useDisclosure, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter
} from "@chakra-ui/react";
import { FiDownload, FiPlus } from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";

const FinanceReports = () => {
  const {
    transactions,
    reportYear,
    setReportYear,
    reportData,
    setReportData
  } = useFinanceData();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const yearTransactions = (transactions || []).filter((transaction) => (
    new Date(transaction.date).getFullYear() === reportYear
  ));

  // Calculer les rapports par catégorie pour l'année sélectionnée
  const calculateCategoryReport = () => {
    const categories = {};
    yearTransactions.forEach(t => {
      if (!categories[t.category]) {
        categories[t.category] = { credits: 0, debits: 0 };
      }
      if (t.type === "CREDIT") {
        categories[t.category].credits += t.amount || 0;
      } else {
        categories[t.category].debits += t.amount || 0;
      }
    });
    return categories;
  };

  // Calculer les rapports mensuels
  const calculateMonthlyReport = () => {
    const months = Array(12).fill(null).map((_, i) => ({
      month: new Date(reportYear, i, 1).toLocaleDateString('fr-FR', { month: 'long' }),
      credits: 0,
      debits: 0,
      balance: 0
    }));

    yearTransactions.forEach(t => {
      const tDate = new Date(t.date);
      if (tDate.getFullYear() === reportYear) {
        const monthIndex = tDate.getMonth();
        if (t.type === "CREDIT") {
          months[monthIndex].credits += t.amount || 0;
        } else {
          months[monthIndex].debits += t.amount || 0;
        }
      }
    });

    months.forEach((m, i) => {
      m.balance = m.credits - m.debits;
    });

    return months;
  };

  const categoryReport = calculateCategoryReport();
  const monthlyReport = calculateMonthlyReport();

  const handleDownloadReport = () => {
    const formatAmount = (amount) => Number(amount || 0).toFixed(2).replace('.', ',');
    const csvRows = [
      ['Rapport financier', reportYear],
      [],
      ['Par catégorie'],
      ['Catégorie', 'Crédits EUR', 'Débits EUR', 'Bilan EUR'],
      ...Object.entries(categoryReport).map(([category, data]) => [
        category || 'Non catégorisé',
        formatAmount(data.credits),
        formatAmount(data.debits),
        formatAmount(data.credits - data.debits)
      ]),
      [],
      ['Par mois'],
      ['Mois', 'Crédits EUR', 'Débits EUR', 'Bilan EUR'],
      ...monthlyReport.map((month) => [
        month.month,
        formatAmount(month.credits),
        formatAmount(month.debits),
        formatAmount(month.balance)
      ])
    ];
    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-financier-${reportYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Rapport généré",
      description: `Rapport ${reportYear} téléchargé au format CSV`,
      status: "success",
      duration: 3000
    });
  };

  return (
    <VStack align="stretch" spacing={6}>
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">Rapports Financiers</Heading>
          <Text color="gray.500" fontSize="sm">
            Rapports d'analyse et exports
          </Text>
        </Box>
        <HStack>
          <Select w="150px" value={reportYear} onChange={(e) => setReportYear(parseInt(e.target.value))}>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
          <Button leftIcon={<FiDownload />} colorScheme="blue" onClick={handleDownloadReport}>
            Télécharger
          </Button>
        </HStack>
      </HStack>

      {/* Statistiques annuelles */}
      <Card>
        <CardHeader>
          <Heading size="md">Résumé {reportYear}</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={[1, 2, 4]} spacing={4}>
            <Box>
              <Stat>
                <StatLabel>Total crédits</StatLabel>
                <StatNumber color="green.500">
                  +{Object.values(categoryReport).reduce((sum, cat) => sum + cat.credits, 0).toFixed(2)} €
                </StatNumber>
              </Stat>
            </Box>
            <Box>
              <Stat>
                <StatLabel>Total débits</StatLabel>
                <StatNumber color="red.500">
                  -{Object.values(categoryReport).reduce((sum, cat) => sum + cat.debits, 0).toFixed(2)} €
                </StatNumber>
              </Stat>
            </Box>
            <Box>
              <Stat>
                <StatLabel>Transactions</StatLabel>
                <StatNumber>{yearTransactions.length}</StatNumber>
              </Stat>
            </Box>
            <Box>
              <Stat>
                <StatLabel>Catégories</StatLabel>
                <StatNumber>{Object.keys(categoryReport).length}</StatNumber>
              </Stat>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Rapport par catégorie */}
      <Card>
        <CardHeader>
          <Heading size="md">Par catégorie</Heading>
        </CardHeader>
        <CardBody overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr bg="gray.50">
                <Th>Catégorie</Th>
                <Th isNumeric>Crédits</Th>
                <Th isNumeric>Débits</Th>
                <Th isNumeric>Bilan</Th>
              </Tr>
            </Thead>
            <Tbody>
              {Object.entries(categoryReport).map(([category, data]) => (
                <Tr key={category} _hover={{ bg: "gray.50" }}>
                  <Td fontWeight="500">{category}</Td>
                  <Td isNumeric color="green.500">+{data.credits.toFixed(2)} €</Td>
                  <Td isNumeric color="red.500">-{data.debits.toFixed(2)} €</Td>
                  <Td isNumeric fontWeight="600">
                    <Text color={(data.credits - data.debits) >= 0 ? "green.500" : "red.500"}>
                      {(data.credits - data.debits) >= 0 ? "+" : ""}{(data.credits - data.debits).toFixed(2)} €
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      {/* Rapport mensuel */}
      <Card>
        <CardHeader>
          <Heading size="md">Évolution mensuelle {reportYear}</Heading>
        </CardHeader>
        <CardBody overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr bg="gray.50">
                <Th>Mois</Th>
                <Th isNumeric>Crédits</Th>
                <Th isNumeric>Débits</Th>
                <Th isNumeric>Balance</Th>
              </Tr>
            </Thead>
            <Tbody>
              {monthlyReport.map((month, idx) => (
                <Tr key={idx} _hover={{ bg: "gray.50" }}>
                  <Td fontWeight="500">{month.month}</Td>
                  <Td isNumeric color="green.500">+{month.credits.toFixed(2)} €</Td>
                  <Td isNumeric color="red.500">-{month.debits.toFixed(2)} €</Td>
                  <Td isNumeric fontWeight="600">
                    <Text color={month.balance >= 0 ? "green.500" : "red.500"}>
                      {month.balance >= 0 ? "+" : ""}{month.balance.toFixed(2)} €
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default FinanceReports;
