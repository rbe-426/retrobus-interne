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
  FiShoppingCart
} from "react-icons/fi";
import {
  Box, VStack, HStack, Heading, Text, Button, Icon, Flex
} from "@chakra-ui/react";

import FinanceDashboard from "../components/Finance/Dashboard";
import FinanceTransactions from "../components/Finance/Transactions";
import FinanceScheduledOps from "../components/Finance/ScheduledOperations";
import FinanceQuotes from "../components/Finance/Quotes";
import FinanceInvoicing from "../components/Finance/Invoicing";
import FinanceReports from "../components/Finance/Reports";
import FinanceSettings from "../components/Finance/Settings";
import ExpenseReports from "../components/Finance/ExpenseReports";
import ExpenseReportsManagement from "../components/Finance/ExpenseReportsManagement";
import Simulations from "../components/Finance/Simulations";
import { useFinanceData } from "../hooks/useFinanceData";
import { useUser } from "../context/UserContext";

/**
 * FinanceNew - Nouvelle page Finance avec sidebar navigation
 * Architecture modulaire pour meilleure organisation
 * Inclut: Notes de frais, Gestion des notes, Simulations, Échéanciers avec courbes
 */
const FinanceNew = () => {
  // États de navigation
  const [activeMainSection, setActiveMainSection] = useState("dashboard");
  const [activeSubTab, setActiveSubTab] = useState("my-notes");

  // Charger les données Finance une fois au mount
  const { loadFinanceData } = useFinanceData();
  const { user, roles } = useUser(); // Récupérer l'utilisateur et ses rôles

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // Vérifier si l'utilisateur a accès à la gestion des notes
  const hasExpenseReportsManagementAccess = roles?.some(role =>
    ["ADMIN", "PRESIDENT", "VICE_PRESIDENT", "TRESORIER"].includes(role)
  );

  // Sections principales
  const sections = [
    { id: "dashboard", label: "Tableau de bord", icon: FiBarChart, description: "Vue d'ensemble" },
    { id: "transactions", label: "Transactions", icon: FiCreditCard, description: "Mouvements financiers" },
    { id: "scheduled", label: "Opérations programmées", icon: FiCalendar, description: "Paiements récurrents" },
    { id: "invoicing", label: "Facturation", icon: FiFileText, description: "Devis & Factures" },
    { id: "ndf", label: "Notes de frais", icon: FiShoppingCart, description: "Gestion NDF" },
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
      case "ndf":
        return activeSubTab === "my-notes" ? <ExpenseReports /> : <ExpenseReportsManagement currentUser={user} userRoles={roles} />;
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

  return (
    <HStack align="stretch" spacing={0} h="100vh" w="100%">
      {/* Sidebar */}
      <VStack
        align="stretch"
        spacing={0}
        w="280px"
        bg="gray.50"
        borderRight="1px"
        borderColor="gray.200"
        overflowY="auto"
      >
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
                    // Réinitialiser le sous-onglet quand on change de section
                    if (section.id !== "ndf") {
                      setActiveSubTab("");
                    }
                  }}
                >
                  <Flex direction="column" align="flex-start" w="full">
                    <Text>{section.label}</Text>
                    {section.description && (
                      <Text fontSize="xs" color="gray.500">{section.description}</Text>
                    )}
                  </Flex>
                </Button>

                {/* Sous-onglets pour Notes de Frais */}
                {isActive && section.id === "ndf" && (
                  <VStack align="stretch" spacing={0} pl={8} bg="blue.50">
                    {[
                      { id: "my-notes", label: "Mes notes de frais" },
                      ...(hasExpenseReportsManagementAccess ? [{ id: "management", label: "Gestion des notes" }] : [])
                    ].map((subTab) => (
                      <Button
                        key={subTab.id}
                        variant="ghost"
                        justifyContent="flex-start"
                        w="full"
                        bg={activeSubTab === subTab.id ? "blue.100" : "transparent"}
                        borderLeft="3px"
                        borderColor={activeSubTab === subTab.id ? "blue.600" : "transparent"}
                        borderRadius={0}
                        px={4}
                        py={4}
                        fontSize="sm"
                        fontWeight={activeSubTab === subTab.id ? "600" : "500"}
                        color={activeSubTab === subTab.id ? "blue.600" : "gray.600"}
                        _hover={{ bg: "blue.100" }}
                        onClick={() => setActiveSubTab(subTab.id)}
                      >
                        {subTab.label}
                      </Button>
                    ))}
                  </VStack>
                )}
              </Box>
            );
          })}
        </VStack>

        {/* Footer du sidebar */}
        <Box p={4} borderTop="1px" borderColor="gray.200" fontSize="xs" color="gray.500" textAlign="center" w="full">
          MyRBE Finance
        </Box>
      </VStack>

      {/* Contenu principal */}
      <VStack align="stretch" spacing={0} flex={1} overflowY="auto">
        {/* Header */}
        <Box p={6} borderBottom="1px" borderColor="gray.200" bg="white">
          <HStack justify="space-between">
            <Box>
              <Heading size="lg">
                {activeMainSection === "dashboard" && "Tableau de bord"}
                {activeMainSection === "transactions" && "Transactions"}
                {activeMainSection === "scheduled" && "Opérations programmées"}
                {activeMainSection === "invoicing" && "Facturation"}
                {activeMainSection === "ndf" && "Notes de frais"}
                {activeMainSection === "simulations" && "Simulations"}
                {activeMainSection === "reports" && "Rapports & KPI"}
                {activeMainSection === "settings" && "Paramètres"}
              </Heading>
              <Text fontSize="sm" color="gray.500">
                {activeMainSection === "dashboard" && "Vue d'ensemble de votre situation financière"}
                {activeMainSection === "transactions" && "Gérez vos recettes et dépenses"}
                {activeMainSection === "scheduled" && "Paiements et prélèvements récurrents"}
                {activeMainSection === "invoicing" && "Devis et factures"}
                {activeMainSection === "ndf" && "Gestion des notes de frais"}
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
    </HStack>
  );
};

export default FinanceNew;
