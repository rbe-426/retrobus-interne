/**
 * homeAnnouncements.js
 * API client pour les annonces d'accueil persistées côté serveur
 */

import { apiClient } from './config';

export const homeAnnouncementsAPI = {
  /**
   * Récupérer toutes les annonces actives
   */
  getAll: async () => {
    const response = await apiClient.get('/home-announcements');
    return response.data;
  },

  /**
   * Créer une nouvelle annonce
   * @param {Object} announcement - Données de l'annonce
   * @param {string} announcement.severity - Niveau de gravité: INFO, WARNING, CRITICAL
   * @param {string} announcement.title - Titre optionnel
   * @param {string} announcement.message - Message de l'annonce (requis)
   * @param {boolean} announcement.dismissible - Si l'annonce peut être fermée (défaut: true)
   * @param {string} announcement.expiresAt - Date d'expiration ISO (défaut: 24h)
   * @param {Array} announcement.actions - Actions optionnelles
   */
  create: async (announcement) => {
    const response = await apiClient.post('/home-announcements', announcement);
    return response.data;
  },

  /**
   * Supprimer une annonce
   * @param {string} id - ID de l'annonce
   */
  delete: async (id) => {
    const response = await apiClient.delete(`/home-announcements/${id}`);
    return response.data;
  },

  /**
   * Mettre à jour une annonce
   * @param {string} id - ID de l'annonce
   * @param {Object} updates - Champs à mettre à jour
   */
  update: async (id, updates) => {
    const response = await apiClient.patch(`/home-announcements/${id}`, updates);
    return response.data;
  }
};
