import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  FiAlertCircle,
  FiRefreshCw
} from "react-icons/fi";
import {
  Box, VStack, HStack, Heading, Text, Button, Icon, Flex
} from "@chakra-ui/react";

import SidebarLayout from "../components/SidebarLayout";
import { useSidebar } from "../context/SidebarContext";
import FinanceDashboard from "../components/Finance/Dashboard";
import FinanceTransactions from "../components/Finance/TransactionsImproved";
import FinanceScheduledOps from "../components/Finance/ScheduledOperations";
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
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Récupérer le contexte sidebar pour fermer automatiquement sur mobile après clic
  const { closeOnMobile } = useSidebar();

  // Charger les données Finance une fois au mount
  const { loadFinanceData, loading } = useFinanceData();
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
    { id: "dashboard", label: "Tableau de bord", icon: FiBarChart, description: "Situation financière et indicateurs clés" },
    { id: "transactions", label: "Transactions", icon: FiCreditCard, description: "Recettes, dépenses et rapprochement" },
    { id: "scheduled", label: "Opérations programmées", icon: FiCalendar, description: "Paiements récurrents et échéanciers" },
    { id: "invoicing", label: "Devis & Factures", icon: FiFileText, description: "Documents commerciaux et encaissements" },
    { id: "debts", label: "Dettes", icon: FiAlertCircle, description: "Créances, dettes et échéances" },
    { id: "ndf", label: "Notes de frais", icon: FiShoppingCart, description: "Validation et remboursement" },
    { id: "simulations", label: "Simulations", icon: FiActivity, description: "Prévisions de trésorerie" },
    { id: "reports", label: "Rapports & KPI", icon: FiTrendingUp, description: "Analyse des opérations enregistrées" },
    { id: "settings", label: "Paramètres", icon: FiSettings, description: "Solde de référence et audit" }
  ];

  useEffect(() => {
    const requestedSection = searchParams.get("section");
    if (sections.some((section) => section.id === requestedSection)) {
      setActiveMainSection(requestedSection);
    }
  }, [searchParams]);

  const selectSection = (sectionId) => {
    setActiveMainSection(sectionId);
    setSearchParams(sectionId === "dashboard" ? {} : { section: sectionId });
    closeOnMobile();
  };

  const activeSection = sections.find((section) => section.id === activeMainSection) || sections[0];

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
                py={3}
                fontSize="sm"
                fontWeight={isActive ? "600" : "500"}
                color={isActive ? "blue.500" : "inherit"}
                _hover={{ bg: "gray.100", borderLeftColor: "blue.500" }}
                onClick={() => selectSection(section.id)}
              >
                <Text>{section.label}</Text>
              </Button>
            </Box>
          );
        })}
      </VStack>

      {/* Footer du sidebar */}
      <Box p={4} borderTop="1px" borderColor="gray.200" fontSize="xs" color="gray.500" textAlign="center" w="full">
        Gestion financière
      </Box>
    </VStack>
  );

  return (
    <SidebarLayout sidebar={sidebarContent}>
      <VStack align="stretch" spacing={0} h="full" w="full">
        {/* Header */}
        <Box p={6} borderBottom="1px" borderColor="gray.200" bg="white">
          <HStack justify="space-between" align="center" wrap="wrap" gap={3}>
            <Box>
              <Heading size="lg">{activeSection.label}</Heading>
              <Text fontSize="sm" color="gray.500">
                {activeSection.description}
              </Text>
            </Box>
            <Button leftIcon={<FiRefreshCw />} variant="outline" size="sm" onClick={loadFinanceData} isLoading={loading}>
              Actualiser
            </Button>
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
