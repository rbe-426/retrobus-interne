import { apiClient } from './config.js';

// API pour la gestion des accès utilisateur
export const usersAccessAPI = {
  // Récupérer tous les accès
  getAll: async () => {
    return apiClient.get('/users/accesses');
  },

  // Récupérer un accès spécifique
  getById: async (id) => {
    return apiClient.get(`/users/accesses/${id}`);
  },

  // Créer un nouvel accès
  create: async (data) => {
    return apiClient.post('/users/accesses', data);
  },

  // Mettre à jour un accès
  update: async (id, data) => {
    return apiClient.put(`/users/accesses/${id}`, data);
  },

  // Supprimer un accès
  delete: async (id) => {
    return apiClient.delete(`/users/accesses/${id}`);
  },

  // Activer/désactiver un accès
  toggle: async (id) => {
    return apiClient.patch(`/users/accesses/${id}/toggle`);
  },

  // Réinitialiser le mot de passe
  resetPassword: async (id) => {
    return apiClient.post(`/users/accesses/${id}/reset-password`);
  }
};
