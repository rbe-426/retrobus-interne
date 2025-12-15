import { apiClient } from './config.js';

// API pour les événements
export const eventsAPI = {
  // Récupérer tous les événements
  getAll: async () => {
    return apiClient.get('/events');
  },
  
  // Récupérer un événement par ID
  getById: async (id) => {
    return apiClient.get(`/events/${id}`);
  },
  
  // Créer un nouvel événement
  create: async (eventData) => {
    return apiClient.post('/events', eventData);
  },
  
  // Mettre à jour un événement
  update: async (id, eventData) => {
    return apiClient.put(`/events/${id}`, eventData);
  },
  
  // Supprimer un événement
  delete: async (id) => {
    return apiClient.delete(`/events/${id}`);
  },
  
  // Publier/dépublier un événement
  publish: async (id, status) => {
    return apiClient.put(`/events/${id}`, { status });
  },

  // PARTICIPANTS
  getParticipants: async (eventId) => {
    return apiClient.get(`/events/${eventId}/participants`);
  },

  addParticipant: async (eventId, participantData) => {
    return apiClient.post(`/events/${eventId}/participants`, participantData);
  },

  updateParticipant: async (eventId, participantId, participantData) => {
    return apiClient.put(`/events/${eventId}/participants/${participantId}`, participantData);
  },

  deleteParticipant: async (eventId, participantId) => {
    return apiClient.delete(`/events/${eventId}/participants/${participantId}`);
  },

  // ROUTES/TRAJETS
  getRoutes: async (eventId) => {
    return apiClient.get(`/events/${eventId}/routes`);
  },

  addRoute: async (eventId, routeData) => {
    return apiClient.post(`/events/${eventId}/routes`, routeData);
  },

  updateRoute: async (eventId, routeId, routeData) => {
    return apiClient.put(`/events/${eventId}/routes/${routeId}`, routeData);
  },

  deleteRoute: async (eventId, routeId) => {
    return apiClient.delete(`/events/${eventId}/routes/${routeId}`);
  },

  // GPS TRACKING
  getGPSTracking: async () => {
    return apiClient.get('/gps/tracking');
  },

  updateGPSLocation: async (vehicleId, locationData) => {
    return apiClient.put(`/gps/tracking/${vehicleId}`, locationData);
  },

  // PLANIFICATIONS
  getPlanifications: async () => {
    return apiClient.get('/planifications');
  },

  addPlanification: async (planData) => {
    return apiClient.post('/planifications', planData);
  },

  updatePlanification: async (planId, planData) => {
    return apiClient.put(`/planifications/${planId}`, planData);
  },

  deletePlanification: async (planId) => {
    return apiClient.delete(`/planifications/${planId}`);
  },

  // TRANSACTIONS LIÉES À L'ÉVÉNEMENT
  getTransactions: async (eventId) => {
    return apiClient.get(`/events/${eventId}/transactions`);
  },

  linkTransaction: async (eventId, transactionId) => {
    return apiClient.post(`/events/${eventId}/transactions/${transactionId}`);
  },

  unlinkTransaction: async (eventId, transactionId) => {
    return apiClient.delete(`/events/${eventId}/transactions/${transactionId}`);
  }
};