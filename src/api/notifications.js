import { apiClient } from './config';

/**
 * Notifications API
 * Gère les opérations CRUD sur les notifications du système
 */

export const notificationsAPI = {
  /**
   * Récupère toutes les notifications actives
   */
  getAll: async () => {
    try {
      const response = await apiClient.get('/api/notifications');
      return Array.isArray(response) ? response : response?.data || [];
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
      throw error;
    }
  },

  /**
   * Récupère une notification par ID
   */
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/api/notifications/${id}`);
      return response?.data || response;
    } catch (error) {
      console.error('Erreur récupération notification:', error);
      throw error;
    }
  },

  /**
   * Crée une nouvelle notification
   */
  create: async (notificationData) => {
    try {
      const response = await apiClient.post('/api/notifications', notificationData);
      return response?.data || response;
    } catch (error) {
      console.error('Erreur création notification:', error);
      throw error;
    }
  },

  /**
   * Met à jour une notification
   */
  update: async (id, notificationData) => {
    try {
      const response = await apiClient.put(`/api/notifications/${id}`, notificationData);
      return response?.data || response;
    } catch (error) {
      console.error('Erreur mise à jour notification:', error);
      throw error;
    }
  },

  /**
   * Supprime une notification
   */
  delete: async (id) => {
    try {
      await apiClient.delete(`/api/notifications/${id}`);
      return true;
    } catch (error) {
      console.error('Erreur suppression notification:', error);
      throw error;
    }
  },

  /**
   * Marque une notification comme lue par l'utilisateur actuel
   */
  markAsRead: async (id) => {
    try {
      const response = await apiClient.put(`/api/notifications/${id}/read`);
      return response?.data || response;
    } catch (error) {
      console.error('Erreur marquage lecture notification:', error);
      throw error;
    }
  },

  /**
   * Récupère les notifications non lues pour l'utilisateur
   */
  getUnread: async () => {
    try {
      const response = await apiClient.get('/api/notifications/unread');
      return Array.isArray(response) ? response : response?.data || [];
    } catch (error) {
      console.error('Erreur récupération notifications non lues:', error);
      throw error;
    }
  },

  /**
   * Active/Désactive une notification
   */
  toggleActive: async (id, active) => {
    try {
      const response = await apiClient.put(`/api/notifications/${id}`, { active });
      return response?.data || response;
    } catch (error) {
      console.error('Erreur changement statut notification:', error);
      throw error;
    }
  }
};
