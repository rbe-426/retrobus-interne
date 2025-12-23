/**
 * Utilitaires pour les notes de frais
 */

export const validateExpenseReport = (report) => {
  const errors = [];

  if (!report.description || report.description.trim() === '') {
    errors.push('Description manquante');
  }

  if (!report.amount || isNaN(parseFloat(report.amount))) {
    errors.push('Montant invalide');
  } else if (parseFloat(report.amount) <= 0) {
    errors.push('Le montant doit être positif');
  }

  if (!report.date) {
    errors.push('Date manquante');
  } else {
    const dateObj = new Date(report.date);
    if (isNaN(dateObj.getTime())) {
      errors.push('Date invalide');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const formatExpenseReport = (report) => {
  if (!report) return null;

  return {
    ...report,
    amount: parseFloat(report.amount) || 0,
    date: report.date || new Date().toISOString().split('T')[0],
    createdAt: report.createdAt || report.date,
    status: report.status || 'open'
  };
};

export const groupExpenseReportsByMonth = (reports) => {
  const grouped = {};

  reports.forEach(report => {
    const date = new Date(report.date || report.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(report);
  });

  return grouped;
};

export const calculateExpenseStats = (reports) => {
  const stats = {
    total: 0,
    count: reports.length,
    byStatus: {}
  };

  reports.forEach(report => {
    stats.total += parseFloat(report.amount) || 0;
    const status = report.status || 'open';
    if (!stats.byStatus[status]) {
      stats.byStatus[status] = { count: 0, total: 0 };
    }
    stats.byStatus[status].count += 1;
    stats.byStatus[status].total += parseFloat(report.amount) || 0;
  });

  return stats;
};
