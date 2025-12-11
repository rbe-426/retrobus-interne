import React, { useEffect } from "react";
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

import WorkspaceLayout from "../components/Layout/WorkspaceLayout";
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
import { useAuth } from "../hooks/useAuth"; // Hook pour récupérer l'utilisateur courant

/**
 * FinanceNew - Nouvelle page Finance avec sidebar navigation
 * Architecture modulaire pour meilleure organisation
 * Inclut: Notes de frais, Gestion des notes, Simulations, Échéanciers avec courbes
 */
const FinanceNew = () => {
  // Charger les données Finance une fois au mount
  const { loadFinanceData } = useFinanceData();
  const { currentUser } = useAuth(); // Récupérer l'utilisateur pour vérifier les droits

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // Vérifier si l'utilisateur a accès à la gestion des notes
  const hasExpenseReportsManagementAccess = currentUser?.roles?.some(role =>
    ["PRESIDENT", "VICE_PRESIDENT", "TRESORIER"].includes(role)
  );

  const sections = [
    {
      id: "dashboard",
      label: "Tableau de bord",
      icon: FiBarChart,
      render: () => <FinanceDashboard />
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: FiCreditCard,
      render: () => <FinanceTransactions />
    },
    {
      id: "scheduled",
      label: "Opérations programmées",
      icon: FiCalendar,
      render: () => <FinanceScheduledOps />
    },
    {
      id: "invoicing",
      label: "Facturation",
      icon: FiFileText,
      render: () => <FinanceInvoicing />
    },
    {
      id: "expense-reports",
      label: "Mes notes de frais",
      icon: FiShoppingCart,
      render: () => <ExpenseReports />
    },
    // Afficher la gestion des notes seulement aux responsables
    ...(hasExpenseReportsManagementAccess
      ? [
          {
            id: "expense-management",
            label: "Gestion des notes",
            icon: FiShoppingCart,
            render: () => (
              <ExpenseReportsManagement currentUser={currentUser} />
            )
          }
        ]
      : []),
    {
      id: "simulations",
      label: "Simulations",
      icon: FiActivity,
      render: () => <Simulations />
    },
    {
      id: "reports",
      label: "Rapports & KPI",
      icon: FiTrendingUp,
      render: () => <FinanceReports />
    },
    {
      id: "settings",
      label: "Paramètres",
      icon: FiSettings,
      render: () => <FinanceSettings />
    }
  ];

  return (
    <WorkspaceLayout
      title="Gestion financière"
      subtitle="Recettes, dépenses, devis, factures, notes de frais et simulations"
      sections={sections}
      defaultSectionId="dashboard"
      sidebarTitle="Finances"
      sidebarSubtitle="Pilotage budgétaire complet"
      sidebarTitleIcon={FiDollarSign}
      versionLabel="Finance v2 - Complet"
    />
  );
};

export default FinanceNew;
