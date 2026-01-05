import { apiClient } from './config.js';

export const subventionAPI = {
  /**
   * Récupérer toutes les campagnes
   */
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.organization) params.append('organization', filters.organization);
      
      const url = `/api/subventions${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data || response;
    } catch (error) {
      console.error('Erreur getAll:', error);
      throw error;
    }
  },

  /**
   * Récupérer une campagne spécifique
   */
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/api/subventions/${id}`);
      return response.data || response;
    } catch (error) {
      console.error(`Erreur getById(${id}):`, error);
      throw error;
    }
  },

  /**
   * Récupérer les campagnes actives uniquement
   */
  getActive: async () => {
    try {
      const response = await apiClient.get('/api/subventions/filter/active');
      return response.data || response;
    } catch (error) {
      console.error('Erreur getActive:', error);
      throw error;
    }
  },

  /**
   * Créer une nouvelle campagne (ADMIN only)
   */
  create: async (data) => {
    try {
      const response = await apiClient.post('/api/subventions', data);
      return response.data || response;
    } catch (error) {
      console.error('Erreur create:', error);
      throw error;
    }
  },

  /**
   * Mettre à jour une campagne (ADMIN only)
   */
  update: async (id, data) => {
    try {
      const response = await apiClient.put(`/api/subventions/${id}`, data);
      return response.data || response;
    } catch (error) {
      console.error(`Erreur update(${id}):`, error);
      throw error;
    }
  },

  /**
   * Supprimer une campagne (ADMIN only)
   */
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/api/subventions/${id}`);
      return response.data || response;
    } catch (error) {
      console.error(`Erreur delete(${id}):`, error);
      throw error;
    }
  },

  // ============================================
  // EXPENSES METHODS
  // ============================================

  /**
   * Récupérer les dépenses d'une campagne
   */
  getExpenses: async (campaignId, filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      
      const url = `/api/subventions/${campaignId}/expenses${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data || response;
    } catch (error) {
      console.error(`Erreur getExpenses(${campaignId}):`, error);
      throw error;
    }
  },

  /**
   * Récupérer une dépense spécifique
   */
  getExpense: async (campaignId, expenseId) => {
    try {
      const response = await apiClient.get(`/api/subventions/${campaignId}/expenses/${expenseId}`);
      return response.data || response;
    } catch (error) {
      console.error(`Erreur getExpense(${campaignId}, ${expenseId}):`, error);
      throw error;
    }
  },

  /**
   * Récupérer le résumé des dépenses d'une campagne
   */
  getExpensesSummary: async (campaignId) => {
    try {
      const response = await apiClient.get(`/api/subventions/${campaignId}/expenses-summary`);
      return response.data || response;
    } catch (error) {
      console.error(`Erreur getExpensesSummary(${campaignId}):`, error);
      throw error;
    }
  },

  /**
   * Créer une dépense
   */
  createExpense: async (campaignId, data) => {
    try {
      const response = await apiClient.post(`/api/subventions/${campaignId}/expenses`, data);
      return response.data || response;
    } catch (error) {
      console.error(`Erreur createExpense(${campaignId}):`, error);
      throw error;
    }
  },

  /**
   * Mettre à jour une dépense
   */
  updateExpense: async (campaignId, expenseId, data) => {
    try {
      const response = await apiClient.put(`/api/subventions/${campaignId}/expenses/${expenseId}`, data);
      return response.data || response;
    } catch (error) {
      console.error(`Erreur updateExpense(${campaignId}, ${expenseId}):`, error);
      throw error;
    }
  },

  /**
   * Supprimer une dépense
   */
  deleteExpense: async (campaignId, expenseId) => {
    try {
      const response = await apiClient.delete(`/api/subventions/${campaignId}/expenses/${expenseId}`);
      return response.data || response;
    } catch (error) {
      console.error(`Erreur deleteExpense(${campaignId}, ${expenseId}):`, error);
      throw error;
    }
  }
};

export default subventionAPI;
