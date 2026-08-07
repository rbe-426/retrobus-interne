/**
 * financeCalculations.js
 * Fonctions de calcul et utilitaires pour la gestion financière
 * Réutilisables dans tous les composants Finance
 */

/**
 * Calcule la progression d'une opération programmée
 * @param {Object} operation - Opération programmée
 * @returns {number|null} Pourcentage de progression (0-1) ou null si inconnu
 */
export const calculateOperationProgress = (operation) => {
  if (!operation) return null;

  // Si totalAmount est défini, calculer basé sur le montant
  if (
    Number.isFinite(operation.totalAmount) &&
    operation.totalAmount > 0
  ) {
    const paid = Math.max(
      operation.totalAmount - (operation.remainingTotalAmount || 0),
      0
    );
    return Math.min(1, paid / operation.totalAmount);
  }

  // Sinon, basé sur le nombre de paiements (plan annuel)
  if (
    Number.isFinite(operation.plannedCountYear) &&
    operation.plannedCountYear > 0
  ) {
    const paidCount = Math.max(
      (operation.plannedCountYear || 0) -
        (operation.remainingCountYear || 0),
      0
    );
    return Math.min(1, paidCount / operation.plannedCountYear);
  }

  return null;
};

/**
 * Retourne la couleur basée sur le pourcentage de progression
 * @param {number|null} percent - Pourcentage (0-1) ou null
 * @returns {string} Code couleur hex
 */
export const getProgressColor = (percent) => {
  if (percent === null) return "#A0AEC0"; // gray.400
  if (percent >= 0.75) return "#22863a"; // green (complet)
  if (percent >= 0.4) return "#f59e0b"; // orange (en cours)
  return "#dc2626"; // red (commence à peine)
};

/**
 * Retourne le schéma couleur Chakra basé sur la progression
 * @param {number|null} percent - Pourcentage (0-1) ou null
 * @returns {string} Chakra colorScheme
 */
export const getProgressColorScheme = (percent) => {
  if (percent === null) return "gray";
  if (percent >= 0.75) return "green";
  if (percent >= 0.4) return "orange";
  return "red";
};

/**
 * Calcule les statistiques d'un ensemble d'opérations programmées
 * @param {Array} operations - Liste des opérations
 * @returns {Object} Statistiques calculées
 */
export const calculateScheduledOperationStats = (operations = []) => {
  const activeOps = operations.filter(op => op.isActive !== false);

  // Impact mensuel total
  const monthlyImpact = activeOps.reduce((sum, op) => {
    const frequencyMultiplier = getFrequencyMultiplier(op.frequency);
    const impact =
      op.type === "SCHEDULED_CREDIT" ? op.amount : -op.amount;
    return sum + impact * frequencyMultiplier;
  }, 0);

  // Totaux en attente
  const totalPending = activeOps.reduce(
    (sum, op) => sum + (op.remainingTotalAmount || 0),
    0
  );

  return {
    activeCount: activeOps.length,
    monthlyImpact,
    totalPending,
    monthlyRecettes: activeOps
      .filter(op => op.type === "SCHEDULED_CREDIT")
      .reduce((sum, op) => sum + op.amount, 0),
    monthlyDepenses: activeOps
      .filter(op => op.type !== "SCHEDULED_CREDIT")
      .reduce((sum, op) => sum + op.amount, 0)
  };
};

/**
 * Convertit une fréquence en multiplicateur mensuel
 * @param {string} frequency - MONTHLY, QUARTERLY, YEARLY, etc.
 * @returns {number} Multiplicateur pour obtenir l'équivalent mensuel
 */
export const getFrequencyMultiplier = (frequency) => {
  const multipliers = {
    MONTHLY: 1,
    WEEKLY: 4.33,
    QUARTERLY: 1 / 3,
    SEMI_ANNUAL: 0.5,
    YEARLY: 1 / 12,
    ONE_SHOT: 0
  };
  return multipliers[frequency] || 1;
};

/**
 * Formate un montant en devise EUR
 * @param {number} amount - Montant à formater
 * @returns {string} Montant formaté "1 234,56 €"
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR"
  }).format(amount || 0);
};

/**
 * Formate une date au format français
 * @param {string|Date} dateStr - Date à formater
 * @returns {string} Date formatée "12/12/2025"
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("fr-FR");
};

/**
 * Retourne le label français d'une fréquence
 * @param {string} frequency - Clé de fréquence
 * @returns {string} Label français
 */
export const getFrequencyLabel = (frequency) => {
  const labels = {
    MONTHLY: "Mensuel",
    QUARTERLY: "Trimestriel",
    YEARLY: "Annuel",
    SEMI_ANNUAL: "Semestriel",
    WEEKLY: "Hebdomadaire",
    ONE_SHOT: "Ponctuel"
  };
  return labels[frequency] || frequency;
};

/**
 * Calcule la simulation financière pour un scénario
 * @param {Object} scenario - Scénario avec revenu/dépense mensuels
 * @param {number} startingBalance - Solde initial
 * @param {number} monthsToProject - Nombre de mois à projeter
 * @returns {Object} Résultats de simulation
 */
export const runFinancialSimulation = (
  scenario,
  startingBalance = 0,
  monthsToProject = 12
) => {
  const monthlyNet =
    (scenario.totalMonthlyIncome || 0) -
    (scenario.totalMonthlyExpenses || 0);

  const projection = [];
  let currentBalance = startingBalance;

  for (let month = 1; month <= monthsToProject; month++) {
    const income = scenario.totalMonthlyIncome || 0;
    const expenses = scenario.totalMonthlyExpenses || 0;
    const net = income - expenses;
    const endBalance = currentBalance + net;

    projection.push({
      month,
      startBalance: currentBalance,
      income,
      expenses,
      net,
      endBalance
    });

    currentBalance = endBalance;
  }

  // Détecter si le solde devient négatif
  const breakEvenMonth = projection.find(p => p.endBalance < 0)?.month;

  return {
    startingBalance,
    finalBalance: currentBalance,
    monthlyNet,
    totalChange: currentBalance - startingBalance,
    projection,
    summary: {
      isPositive: monthlyNet >= 0,
      breakEvenMonth,
      projectionMonths: monthsToProject
    }
  };
};

/**
 * Validations pour les formulaires financiers
 */
export const FinanceValidations = {
  /**
   * Valide un montant
   */
  validateAmount: (amount) => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed)) return "Montant invalide";
    if (parsed < 0) return "Le montant doit être positif";
    return null;
  },

  /**
   * Valide une description
   */
  validateDescription: (description) => {
    if (!description || description.trim().length === 0) {
      return "La description est requise";
    }
    if (description.trim().length < 3) {
      return "La description doit contenir au moins 3 caractères";
    }
    return null;
  },

  /**
   * Valide une date
   */
  validateDate: (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Date invalide";
    return null;
  },

  /**
   * Valide un formulaire de transaction
   */
  validateTransaction: (transaction) => {
    const errors = {};
    if (!transaction.type) errors.type = "Type requis";
    if (this.validateAmount(transaction.amount))
      errors.amount = this.validateAmount(transaction.amount);
    if (this.validateDescription(transaction.description))
      errors.description = this.validateDescription(
        transaction.description
      );
    return Object.keys(errors).length > 0 ? errors : null;
  },

  /**
   * Valide un formulaire d'opération programmée
   */
  validateScheduledOperation: (operation) => {
    const errors = {};
    if (!operation.type) errors.type = "Type requis";
    if (this.validateAmount(operation.amount))
      errors.amount = this.validateAmount(operation.amount);
    if (this.validateDescription(operation.description))
      errors.description = this.validateDescription(
        operation.description
      );
    if (!operation.frequency) errors.frequency = "Fréquence requise";
    if (this.validateDate(operation.nextDate))
      errors.nextDate = this.validateDate(operation.nextDate);
    return Object.keys(errors).length > 0 ? errors : null;
  }
};

/**
 * Utilitaires pour les permissions/rôles
 */
export const FinancePermissions = {
  /**
   * Vérifie si l'utilisateur peut gérer les notes de frais
   */
  canManageExpenseReports: (userRoles = []) => {
    return userRoles.some(role =>
      ["PRESIDENT", "VICE_PRESIDENT", "TRESORIER"].includes(role)
    );
  },

  /**
   * Vérifie si l'utilisateur peut modifier le solde
   */
  canModifyBalance: (userRoles = []) => {
    return userRoles.some(role =>
      ["PRESIDENT", "TRESORIER"].includes(role)
    );
  },

  /**
   * Vérifie si l'utilisateur peut valider les transactions
   */
  canValidateTransactions: (userRoles = []) => {
    return userRoles.some(role =>
      ["PRESIDENT", "TRESORIER"].includes(role)
    );
  }
};

export default {
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
};
