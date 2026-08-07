import React, { useEffect, useState } from "react";
import {
  FiDollarSign,
  FiTrendingUp,
  FiBarChart,
  FiCalendar,
  FiCreditCard,
  FiSettings,
  FiFileText,
  FiActivity,
  FiShoppingCart,
  FiAlertCircle
} from "react-icons/fi";
import {
  Box, VStack, HStack, Heading, Text, Button, Icon, Flex
} from "@chakra-ui/react";

import SidebarLayout from "../components/SidebarLayout";
import { useSidebar } from "../context/SidebarContext";
import FinanceDashboard from "../components/Finance/Dashboard";
import FinanceTransactions from "../components/Finance/TransactionsImproved";
import FinanceScheduledOps from "../components/Finance/ScheduledOperations";
import FinanceQuotes from "../components/Finance/Quotes";
import FinanceInvoicing from "../components/Finance/Invoicing";
import FinanceReports from "../components/Finance/Reports";
import FinanceSettings from "../components/Finance/Settings";
import ExpenseReportsManagement from "../components/Finance/ExpenseReportsManagement";
import Simulations from "../components/Finance/Simulations";
import FinanceDebts from "../components/Finance/Debts";
import { useFinanceData } from "../hooks/useFinanceData";
import { useUser } from "../context/UserContext";

/**
 * FinanceNew - Nouvelle page Finance avec sidebar navigation
 * Architecture modulaire pour meilleure organisation
 * Inclut: gestion, suivi financier, validations NDF, simulations et échéanciers
 */
const FinanceNew = () => {
  // États de navigation
  const [activeMainSection, setActiveMainSection] = useState("dashboard");
  
  // Récupérer le contexte sidebar pour fermer automatiquement sur mobile après clic
  const { closeOnMobile } = useSidebar();

  // Charger les données Finance une fois au mount
  const { loadFinanceData } = useFinanceData();
  const { user, roles } = useUser(); // Récupérer l'utilisateur et ses rôles

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // ⏱️ Auto-refresh every 30 seconds to keep data fresh (replace manual reloads on section change)
  useEffect(() => {
    const interval = setInterval(() => {
      loadFinanceData();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [loadFinanceData]);

  // Sections principales
  const sections = [
    { id: "dashboard", label: "Tableau de bord", icon: FiBarChart, description: "Vue d'ensemble" },
    { id: "transactions", label: "Transactions", icon: FiCreditCard, description: "Mouvements financiers" },
    { id: "scheduled", label: "Opérations programmées", icon: FiCalendar, description: "Paiements récurrents" },
    { id: "invoicing", label: "Devis & Factures", icon: FiFileText, description: "Gestion documents" },
    { id: "debts", label: "Dettes", icon: FiAlertCircle, description: "Créanciers & échéances" },
    { id: "ndf", label: "Suivi NDF", icon: FiShoppingCart, description: "Validation & remboursements" },
    { id: "simulations", label: "Simulations", icon: FiActivity, description: "Projections" },
    { id: "reports", label: "Rapports & KPI", icon: FiTrendingUp, description: "Analyses" },
    { id: "settings", label: "Paramètres", icon: FiSettings, description: "Configuration" }
  ];

  // Rendu du contenu selon la section active
  const renderMainContent = () => {
    switch (activeMainSection) {
      case "dashboard":
        return <FinanceDashboard />;
      case "transactions":
        return <FinanceTransactions />;
      case "scheduled":
        return <FinanceScheduledOps />;
      case "invoicing":
        return <FinanceInvoicing />;
      case "debts":
        return <FinanceDebts />;
      case "ndf":
        return <ExpenseReportsManagement currentUser={user} userRoles={roles} />;
      case "simulations":
        return <Simulations />;
      case "reports":
        return <FinanceReports />;
      case "settings":
        return <FinanceSettings />;
      default:
        return <FinanceDashboard />;
    }
  };

  // Sidebar content
  const sidebarContent = (
    <VStack align="stretch" spacing={0} w="full" h="full">
      {/* Header du sidebar */}
      <Box p={6} borderBottom="1px" borderColor="gray.200">
        <HStack spacing={3} mb={3}>
          <Icon as={FiDollarSign} color="blue.500" boxSize={6} />
          <Box>
            <Heading size="md" color="gray.800">Finances</Heading>
            <Text fontSize="sm" color="gray.500">Pilotage budgétaire</Text>
          </Box>
        </HStack>
        <Text fontSize="xs" color="gray.500">Finance v2</Text>
      </Box>

      {/* Navigation principale */}
      <VStack align="stretch" spacing={0} px={3} py={4} flex={1}>
        {sections.map((section) => {
          const isActive = section.id === activeMainSection;
          const SectionIcon = section.icon;
          return (
            <Box key={section.id}>
              <Button
                leftIcon={<Icon as={SectionIcon} />}
                variant="ghost"
                justifyContent="flex-start"
                w="full"
                bg={isActive ? "blue.50" : "transparent"}
                borderLeft="3px"
                borderColor={isActive ? "blue.500" : "transparent"}
                borderRadius={0}
                px={4}
                py={6}
                fontSize="sm"
                fontWeight={isActive ? "600" : "500"}
                color={isActive ? "blue.500" : "inherit"}
                _hover={{ bg: "gray.100", borderLeftColor: "blue.500" }}
                onClick={() => {
                  setActiveMainSection(section.id);
                  // Fermer la sidebar sur mobile après sélection
                  closeOnMobile();
                }}
              >
                <Flex direction="column" align="flex-start" w="full">
                  <Text>{section.label}</Text>
                  {section.description && (
                    <Text fontSize="xs" color="gray.500">{section.description}</Text>
                  )}
                </Flex>
              </Button>
            </Box>
          );
        })}
      </VStack>

      {/* Footer du sidebar */}
      <Box p={4} borderTop="1px" borderColor="gray.200" fontSize="xs" color="gray.500" textAlign="center" w="full">
        MyRBE Finance
      </Box>
    </VStack>
  );

  return (
    <SidebarLayout sidebar={sidebarContent}>
      <VStack align="stretch" spacing={0} h="full" w="full">
        {/* Header */}
        <Box p={6} borderBottom="1px" borderColor="gray.200" bg="white">
          <HStack justify="space-between">
            <Box>
              <Heading size="lg">
                {activeMainSection === "dashboard" && "Tableau de bord"}
                {activeMainSection === "transactions" && "Transactions"}
                {activeMainSection === "scheduled" && "Opérations programmées"}
                {activeMainSection === "invoicing" && "Devis & Factures"}
                {activeMainSection === "debts" && "Dettes"}
                {activeMainSection === "ndf" && "Suivi NDF"}
                {activeMainSection === "simulations" && "Simulations"}
                {activeMainSection === "reports" && "Rapports & KPI"}
                {activeMainSection === "settings" && "Paramètres"}
              </Heading>
              <Text fontSize="sm" color="gray.500">
                {activeMainSection === "dashboard" && "Vue d'ensemble de votre situation financière"}
                {activeMainSection === "transactions" && "Gérez vos recettes et dépenses"}
                {activeMainSection === "scheduled" && "Paiements et prélèvements récurrents"}
                {activeMainSection === "invoicing" && "Gestion des devis et factures"}
                {activeMainSection === "debts" && "Suivi des créanciers et échéances"}
                {activeMainSection === "ndf" && "Validation, suivi et remboursement des notes de frais"}
                {activeMainSection === "simulations" && "Simulations financières"}
                {activeMainSection === "reports" && "Rapports et indicateurs clés"}
                {activeMainSection === "settings" && "Configuration de votre espace Finance"}
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* Contenu */}
        <Box flex={1} overflowY="auto" p={6} w="full">
          {renderMainContent()}
        </Box>
      </VStack>
    </SidebarLayout>
  );
};

export default FinanceNew;
