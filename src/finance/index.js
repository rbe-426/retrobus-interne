/**
 * Finance Index
 * Point d'entrée centralisé pour tous les composants et utilitaires Finance
 * Facilite les imports: import { ExpenseReports, formatCurrency } from '@/finance'
 */

// Composants
export { default as FinanceDashboard } from '../components/Finance/Dashboard';
export { default as FinanceTransactions } from '../components/Finance/Transactions';
export { default as FinanceScheduledOps } from '../components/Finance/ScheduledOperations';
export { default as FinanceQuotes } from '../components/Finance/Quotes';
export { default as FinanceInvoicing } from '../components/Finance/Invoicing';
export { default as FinanceReports } from '../components/Finance/Reports';
export { default as FinanceSettings } from '../components/Finance/Settings';
export { default as ExpenseReports } from '../components/Finance/ExpenseReports';
export { default as ExpenseReportsManagement } from '../components/Finance/ExpenseReportsManagement';
export { default as Simulations } from '../components/Finance/Simulations';

// Hook
export { useFinanceData } from '../hooks/useFinanceData';

// Utilitaires
export {
  calculateOperationProgress,
  getProgressColor,
  getProgressColorScheme,
  calculateScheduledOperationStats,
  getFrequencyMultiplier,
  formatCurrency,
  formatDate,
  getFrequencyLabel,
  runFinancialSimulation,
  FinanceValidations,
  FinancePermissions
} from '../utils/financeCalculations';
