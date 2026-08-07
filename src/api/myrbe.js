import { apiClient } from './config.js';

// API pour MyRBE
export const myRBEAPI = {
  // Récupérer les actions MyRBE
  getActions: async (parc) => {
    return apiClient.get(`/api/myrbe/actions/${parc}`);
  },
  
  // Créer une nouvelle action
  createAction: async (actionData) => {
    return apiClient.post('/api/myrbe/actions', actionData);
  },
  
  // Mettre à jour une action
  updateAction: async (id, actionData) => {
    return apiClient.put(`/api/myrbe/actions/${id}`, actionData);
  },
  
  // Supprimer une action
  deleteAction: async (id) => {
    return apiClient.delete(`/api/myrbe/actions/${id}`);
  },
  
  // Récupérer les rapports
  getReports: async () => {
    return apiClient.get('/api/myrbe/reports');
  },
  
  // Générer un rapport
  generateReport: async (reportData) => {
    return apiClient.post('/api/myrbe/reports/generate', reportData);
  }
};