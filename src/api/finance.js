import { apiClient } from './config.js';
import { API_BASE_URL } from './config.js'; // ADD THIS IMPORT

const MOCK = import.meta.env.VITE_FINANCE_MOCK === 'true';

const is404 = (err) => {
  const msg = err?.message || '';
  return /status:\s*404/i.test(msg);
};

const delay = (ms = 250) => new Promise(res => setTimeout(res, ms));

let mockStore = {
  bankBalance: 0,
  transactions: [],   // { id, type, amount, description, category, date, eventId? }
  scheduled: [],      // { id, type, description, amount, dueDate, category, recurring, notes, eventId? }
  // ADD: expense reports storage
  expenseReports: [], // { id, date, description, amount, category, eventId?, fileName, fileUrl, status: 'OPEN'|'CLOSED'|'REIMBURSED', createdBy, closedAt?, reimbursedAt? }
  categories: [
    { id: 'adhesions', name: 'Adhésions', type: 'recette' },
    { id: 'evenements', name: 'Événements', type: 'recette' },
    { id: 'carburant', name: 'Carburant', type: 'depense' },
    { id: 'maintenance', name: 'Maintenance', type: 'depense' },
    { id: 'assurance', name: 'Assurance', type: 'depense' },
    { id: 'materiel', name: 'Matériel', type: 'depense' },
    { id: 'frais_admin', name: 'Frais administratifs', type: 'depense' },
    { id: 'autres', name: 'Autres', type: 'both' }
  ]
};

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`);

export const financeAPI = {
  // Statistiques globales
  getStats: async () => {
    if (MOCK) {
      await delay();
      const revenue = mockStore.transactions.filter(t => t.type === 'recette').reduce((s, t) => s + (t.amount || 0), 0);
      const expenses = mockStore.transactions.filter(t => t.type === 'depense').reduce((s, t) => s + (t.amount || 0), 0);
      return {
        monthlyRevenue: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(revenue),
        monthlyExpenses: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(expenses),
        currentBalance: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(mockStore.bankBalance),
        membershipRevenue: '0,00 €',
        activeMembers: 0,
        revenueGrowth: 0
      };
    }
    try {
      const response = await apiClient.get('/finance/stats');
      return response.data;
    } catch (error) {
      if (is404(error)) {
        console.warn('Finance API: stats endpoint missing (404) – using defaults');
        return {
          monthlyRevenue: '0,00 €',
          monthlyExpenses: '0,00 €',
          currentBalance: '0,00 €',
          membershipRevenue: '0,00 €',
          activeMembers: 0,
          revenueGrowth: 0,
        };
      }
      throw error;
    }
  },

  // Solde
  getBankBalance: async () => {
    if (MOCK) {
      await delay();
      return { balance: mockStore.bankBalance };
    }
    try {
      const response = await apiClient.get('/finance/bank-balance');
      return response.data;
    } catch (error) {
      if (is404(error)) {
        console.warn('Finance API: bank-balance endpoint missing (404) – using balance: 0');
        return { balance: 0 };
      }
      throw error;
    }
  },

  setBankBalance: async (balance) => {
    if (MOCK) {
      await delay();
      mockStore.bankBalance = Number(balance || 0);
      return {
        balance: mockStore.bankBalance,
        formatted: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(mockStore.bankBalance)
      };
    }
    try {
      const response = await apiClient.post('/finance/bank-balance', { balance });
      return response.data;
    } catch (error) {
      if (is404(error)) {
        console.warn('Finance API: set bank-balance missing – simulating');
        return {
          balance,
          formatted: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(balance || 0))
        };
      }
      throw error;
    }
  },

  // Opérations programmées (liables à eventId)
  getScheduledExpenses: async (filters = {}) => {
    const { eventId } = filters;
    if (MOCK) {
      await delay();
      const items = eventId ? mockStore.scheduled.filter(op => op.eventId === eventId) : mockStore.scheduled;
      return { operations: items };
    }
    try {
      const qs = new URLSearchParams();
      if (eventId) qs.append('eventId', eventId);
      const response = await apiClient.get(`/finance/scheduled-expenses?${qs}`);
      return response.data;
    } catch (error) {
      if (is404(error)) {
        console.warn('Finance API: scheduled-expenses endpoint missing (404) – using empty list');
        return { operations: [] };
      }
      throw error;
    }
  },

  createScheduledExpense: async (expenseData) => {
    if (MOCK) {
      await delay();
      const created = { id: uid(), ...expenseData };
      mockStore.scheduled.push(created);
      return created;
    }
    try {
      const response = await apiClient.post('/finance/scheduled-expenses', expenseData);
      return response.data;
    } catch (error) {
      if (is404(error)) {
        console.warn('Finance API: create scheduled-expense missing (404) – simulating');
        return { id: uid(), ...expenseData };
      }
      throw error;
    }
  },

  updateScheduledExpense: async (id, data) => {
    if (MOCK) {
      await delay();
      mockStore.scheduled = mockStore.scheduled.map(op => op.id === id ? { ...op, ...data } : op);
      return mockStore.scheduled.find(op => op.id === id);
    }
    const response = await apiClient.put(`/finance/scheduled-expenses/${id}`, data);
    return response.data;
  },

  deleteScheduledExpense: async (id) => {
    if (MOCK) {
      await delay();
      mockStore.scheduled = mockStore.scheduled.filter(op => op.id !== id);
      return { ok: true };
    }
    const response = await apiClient.delete(`/finance/scheduled-expenses/${id}`);
    return response.data;
  },

  executeScheduledExpense: async (id) => {
    if (MOCK) {
      await delay();
      const op = mockStore.scheduled.find(x => x.id === id);
      if (!op) return { ok: false };
      const tx = {
        id: uid(),
        type: op.type,
        amount: op.amount,
        description: op.description,
        category: op.category,
        date: new Date().toISOString().split('T')[0],
        eventId: op.eventId || null
      };
      mockStore.transactions.unshift(tx);
      if (!op.recurring || op.recurring === 'none') {
        mockStore.scheduled = mockStore.scheduled.filter(x => x.id !== id);
      }
      return { ok: true, transaction: tx };
    }
    const response = await apiClient.post(`/finance/scheduled-expenses/${id}/execute`);
    return response.data;
  },

  // Transactions (support eventId)
  getTransactions: async (filters = {}) => {
    if (MOCK) {
      await delay();
      const page = Number(filters.page || 1);
      const limit = Number(filters.limit || 20);
      const eventId = filters.eventId || null;
      let list = mockStore.transactions;
      if (eventId) list = list.filter(tx => tx.eventId === eventId);
      const start = (page - 1) * limit;
      const slice = list.slice(start, start + limit);
      return { transactions: slice, total: list.length };
    }
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      const response = await apiClient.get(`/finance/transactions?${params}`);
      return response.data;
    } catch (error) {
      if (is404(error)) {
        console.warn('Finance API: transactions endpoint missing (404) – using empty list');
        return { transactions: [], total: 0 };
      }
      throw error;
    }
  },

  createTransaction: async (transactionData) => {
    if (MOCK) {
      await delay();
      const created = { id: uid(), ...transactionData };
      mockStore.transactions.unshift(created);
      mockStore.bankBalance += (transactionData.type === 'recette' ? 1 : -1) * (Number(transactionData.amount || 0));
      return created;
    }
    try {
      const response = await apiClient.post('/finance/transactions', transactionData);
      return response.data;
    } catch (error) {
      if (is404(error)) {
        console.warn('Finance API: create transaction missing – simulating');
        return { id: uid(), ...transactionData };
      }
      throw error;
    }
  },

  updateTransaction: async (id, data) => {
    if (MOCK) {
      await delay();
      mockStore.transactions = mockStore.transactions.map(tx => tx.id === id ? { ...tx, ...data } : tx);
      return mockStore.transactions.find(tx => tx.id === id);
    }
    const response = await apiClient.put(`/finance/transactions/${id}`, data);
    return response.data;
  },

  deleteTransaction: async (id) => {
    if (MOCK) {
      await delay();
      mockStore.transactions = mockStore.transactions.filter(tx => tx.id !== id);
      return { ok: true };
    }
    const response = await apiClient.delete(`/finance/transactions/${id}`);
    return response.data;
  },

  // Adhésions
  syncMemberships: async () => {
    if (MOCK) {
      await delay(600);
      return { synchronized: 0, ok: true };
    }
    try {
      const response = await apiClient.post('/finance/sync/memberships');
      return response.data;
    } catch (error) {
      if (is404(error)) {
        console.warn('Finance API: sync memberships missing – simulating');
        return { synchronized: 0, ok: true };
      }
      throw error;
    }
  },

  // Catégories
  getCategories: async () => {
    if (MOCK) {
      await delay();
      return { categories: mockStore.categories };
    }
    try {
      const response = await apiClient.get('/finance/categories');
      return response.data;
    } catch (error) {
      return { categories: mockStore.categories };
    }
  },

  // Breakdown par catégorie
  getCategoryBreakdown: async (period = 'month', eventId) => {
    if (MOCK) {
      await delay();
      // simple stub; prod endpoint peut supporter eventId en query
      return { period, breakdown: [], total: 0 };
    }
    const params = eventId ? { params: { period, eventId } } : { params: { period } };
    try {
      const response = await apiClient.get('/finance/category-breakdown', params);
      return response.data;
    } catch (error) {
      if (is404(error)) return { period, breakdown: [], total: 0 };
      throw error;
    }
  },

  // Export
  exportData: async (format = 'csv', filters = {}) => {
    if (MOCK) {
      await delay();
      const csvContent = 'Date,Type,Description,Montant\n2024-01-15,Recette,Adhésion Test,60.00\n';
      return new Blob([csvContent], { type: 'text/csv' });
    }
    try {
      const response = await apiClient.get('/finance/export', { 
        params: { format, ...filters },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      const csvContent = 'Date,Type,Description,Montant\n2024-01-15,Recette,Adhésion Test,60.00\n';
      return new Blob([csvContent], { type: 'text/csv' });
    }
  },

  // Résumé finances pour un événement
  getEventFinanceSummary: async (eventId) => {
    const { transactions } = await financeAPI.getTransactions({ eventId, page: 1, limit: 1000 });
    const revenue = transactions.filter(t => t.type === 'recette').reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = transactions.filter(t => t.type === 'depense').reduce((s, t) => s + (t.amount || 0), 0);
    const profit = revenue - expenses;
    return { revenue, expenses, profit, count: transactions.length };
  },

  // NOTES DE FRAIS (Expense Reports)
  getExpenseReports: async (filters = {}) => {
    const { eventId } = filters;
    if (MOCK) {
      await delay();
      const list = eventId ? mockStore.expenseReports.filter(er => er.eventId === eventId) : mockStore.expenseReports;
      return { reports: list };
    }
    try {
      const qs = new URLSearchParams();
      if (eventId) qs.append('eventId', eventId);
      const res = await apiClient.get(`/finance/expense-reports?${qs}`);
      // normalise si jamais l’API renvoie un autre nom
      if (Array.isArray(res?.reports)) return res;
      if (Array.isArray(res?.expenseReports)) return { reports: res.expenseReports };
      if (Array.isArray(res?.items)) return { reports: res.items };
      return { reports: [] };
    } catch (error) {
      if (is404(error)) return { reports: [] };
      throw error;
    }
  },

  createExpenseReport: async (payload) => {
    // payload: { date, description, amount, category, eventId?, file: File, createdBy? }
    if (MOCK) {
      await delay();
      const { file, ...rest } = payload || {};
      const id = uid();
      const fileName = file?.name || 'justif.pdf';
      let fileUrl = '';
      try {
        // Create a blob URL to preview in mock
        fileUrl = file ? URL.createObjectURL(file) : '';
      } catch (_) {
        fileUrl = '';
      }
      const created = {
        id,
        status: 'OPEN',
        fileName,
        fileUrl,
        ...rest
      };
      mockStore.expenseReports.unshift(created);
      return created;
    }

    // Real API: multipart upload
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('date', payload.date);
    fd.append('description', payload.description);
    fd.append('amount', String(payload.amount ?? 0));
    if (payload.category) fd.append('category', payload.category);
    if (payload.eventId) fd.append('eventId', payload.eventId);
    if (payload.createdBy) fd.append('createdBy', payload.createdBy);
    if (!payload.file) throw new Error('Le justificatif PDF est obligatoire');
    fd.append('file', payload.file);

    const res = await fetch(`${API_BASE_URL}/finance/expense-reports`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd
    });
    if (!res.ok) {
      if (res.status === 404) {
        console.warn('Finance API: create expense-report missing (404) – simulating locally');
        return {
          id: uid(),
          status: 'OPEN',
          fileName: payload.file?.name || 'justif.pdf',
          fileUrl: '',
          ...payload
        };
      }
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  },

  updateExpenseReport: async (id, data) => {
    if (MOCK) {
      await delay();
      mockStore.expenseReports = mockStore.expenseReports.map(er => er.id === id ? { ...er, ...data } : er);
      return mockStore.expenseReports.find(er => er.id === id);
    }
    const response = await apiClient.put(`/finance/expense-reports/${id}`, data);
    return response.data;
  },

  closeExpenseReport: async (id) => {
    if (MOCK) {
      await delay();
      mockStore.expenseReports = mockStore.expenseReports.map(er => er.id === id ? { ...er, status: 'CLOSED', closedAt: new Date().toISOString() } : er);
      return mockStore.expenseReports.find(er => er.id === id);
    }
    const response = await apiClient.post(`/finance/expense-reports/${id}/close`, {});
    return response.data;
  },

  reimburseExpenseReport: async (id) => {
    if (MOCK) {
      await delay();
      mockStore.expenseReports = mockStore.expenseReports.map(er => er.id === id ? { ...er, status: 'REIMBURSED', reimbursedAt: new Date().toISOString() } : er);
      return mockStore.expenseReports.find(er => er.id === id);
    }
    const response = await apiClient.post(`/finance/expense-reports/${id}/reimburse`, {});
    return response.data;
  },

  deleteExpenseReport: async (id) => {
    if (MOCK) {
      await delay();
      mockStore.expenseReports = mockStore.expenseReports.filter(er => er.id !== id);
      return { ok: true };
    }
    const response = await apiClient.delete(`/finance/expense-reports/${id}`);
    return response.data;
  },

  // Notes de frais
  getExpenseReports: async () => {
    if (MOCK) {
      await delay();
      return { reports: mockStore.expenseReports };
    }
    try {
      const res = await apiClient.get('/finance/expense-reports');
      return res;
    } catch (error) {
      if (is404(error)) {
        console.warn('Finance API: expense-reports missing (404) – empty list');
        return { reports: [] };
      }
      throw error;
    }
  },

  // getExpenseReports (forme stable)
  getExpenseReports: async (filters = {}) => {
    const { eventId } = filters;
    if (MOCK) {
      await delay();
      const list = eventId ? mockStore.expenseReports.filter(er => er.eventId === eventId) : mockStore.expenseReports;
      return { reports: list };
    }
    try {
      const qs = new URLSearchParams();
      if (eventId) qs.append('eventId', eventId);
      const res = await apiClient.get(`/finance/expense-reports?${qs}`);
      // normalise si jamais l’API renvoie un autre nom
      if (Array.isArray(res?.reports)) return res;
      if (Array.isArray(res?.expenseReports)) return { reports: res.expenseReports };
      if (Array.isArray(res?.items)) return { reports: res.items };
      return { reports: [] };
    } catch (error) {
      if (is404(error)) return { reports: [] };
      throw error;
    }
  },

  // createExpenseReport: gère planned=true sans fichier
  createExpenseReport: async ({ date, description, amount, pdfFile, planned = false, status = 'open' }) => {
    if (!planned) {
      if (!pdfFile) throw new Error('Le justificatif PDF est obligatoire');
      if (pdfFile.type !== 'application/pdf') throw new Error('Le justificatif doit être un fichier PDF');
    }

    if (MOCK) {
      await delay();
      const created = {
        id: uid(),
        date: date || new Date().toISOString().split('T')[0],
        description: description || '',
        amount: Number(amount || 0),
        fileName: pdfFile ? pdfFile.name : undefined,
        fileUrl: pdfFile ? `mock://pdf/${Date.now()}_${encodeURIComponent(pdfFile.name)}` : '',
        status,
        planned: !!planned,
        createdBy: 'admin'
      };
      mockStore.expenseReports.unshift(created);
      return { report: created };
    }

    try {
      if (pdfFile) {
        const fd = new FormData();
        fd.append('date', date || new Date().toISOString().split('T')[0]);
        fd.append('description', description || '');
        fd.append('amount', String(amount || 0));
        fd.append('status', status);
        fd.append('planned', String(!!planned));
        fd.append('file', pdfFile);
        const res = await apiClient.postForm('/finance/expense-reports', fd);
        return res;
      } else {
        const res = await apiClient.post('/finance/expense-reports', {
          date: date || new Date().toISOString().split('T')[0],
          description: description || '',
          amount: Number(amount || 0),
          status,
          planned: true
        });
        return res;
      }
    } catch (error) {
      if (is404(error)) {
        const created = {
          id: uid(),
          date: date || new Date().toISOString().split('T')[0],
          description: description || '',
          amount: Number(amount || 0),
          fileName: pdfFile ? pdfFile.name : undefined,
          fileUrl: pdfFile ? '' : '',
          status,
          planned: !!planned,
          createdBy: 'admin'
        };
        mockStore.expenseReports.unshift(created);
        return { report: created };
      }
      throw error;
    }
  },

  updateExpenseReportStatus: async (id, status) => {
    const allowed = ['open', 'closed', 'reimbursed'];
    if (!allowed.includes(status)) throw new Error('Statut invalide');
    if (MOCK) {
      await delay();
      mockStore.expenseReports = mockStore.expenseReports.map(r => r.id === id ? { ...r, status } : r);
      const report = mockStore.expenseReports.find(r => r.id === id);
      return { report };
    }
    try {
      const res = await apiClient.post(`/finance/expense-reports/${id}/status`, { status });
      return res;
    } catch (error) {
      if (is404(error)) {
        mockStore.expenseReports = mockStore.expenseReports.map(r => r.id === id ? { ...r, status } : r);
        const report = mockStore.expenseReports.find(r => r.id === id);
        return { report };
      }
      throw error;
    }
  },

  deleteExpenseReport: async (id) => {
    if (MOCK) {
      await delay();
      mockStore.expenseReports = mockStore.expenseReports.filter(r => r.id !== id);
      return { ok: true };
    }
    try {
      const res = await apiClient.delete(`/finance/expense-reports/${id}`);
      return res;
    } catch (error) {
      if (is404(error)) return { ok: true };
      throw error;
    }
  },
};