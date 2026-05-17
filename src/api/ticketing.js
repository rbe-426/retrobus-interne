import { apiClient } from './config.js';

const toQuery = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    sp.append(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
};

export const ticketingAPI = {
  // Statistiques globales de la billetterie
  getStats: () => apiClient.get('/api/ticketing/stats'),

  // Liste des types de tarifs
  getTicketTypes: () => apiClient.get('/api/ticketing/types'),

  // Créer un nouveau type de tarif
  createTicketType: (data) => apiClient.post('/api/ticketing/types', data),

  // Mettre à jour un type de tarif
  updateTicketType: (id, data) => apiClient.put(`/api/ticketing/types/${id}`, data),

  // Supprimer un type de tarif
  deleteTicketType: (id) => apiClient.delete(`/api/ticketing/types/${id}`),

  // Liste des ventes: { page, limit, startDate, endDate, ticketTypeId }
  getSales: (params = {}) => apiClient.get(`/api/ticketing/sales${toQuery(params)}`),

  // Créer une vente
  createSale: (data) => apiClient.post('/api/ticketing/sales', data),

  // Statistiques de fréquentation
  getAttendance: (params = {}) => apiClient.get(`/api/ticketing/attendance${toQuery(params)}`),

  // Réservations de groupe: { page, limit, status }
  getGroupReservations: (params = {}) => apiClient.get(`/api/ticketing/group-reservations${toQuery(params)}`),

  // Créer une réservation de groupe
  createGroupReservation: (data) => apiClient.post('/api/ticketing/group-reservations', data),

  // Mettre à jour une réservation de groupe
  updateGroupReservation: (id, data) => apiClient.put(`/api/ticketing/group-reservations/${id}`, data),

  // Statistiques hebdomadaires
  getWeeklyStats: () => apiClient.get('/api/ticketing/stats/weekly'),

  // Statistiques mensuelles
  getMonthlyStats: () => apiClient.get('/api/ticketing/stats/monthly'),

  // Réductions
  getDiscounts: () => apiClient.get('/api/ticketing/discounts'),
  getDiscount: (id) => apiClient.get(`/api/ticketing/discounts/${id}`),
  createDiscount: (data) => apiClient.post('/api/ticketing/discounts', data),
  updateDiscount: (id, data) => apiClient.put(`/api/ticketing/discounts/${id}`, data),
  deleteDiscount: (id) => apiClient.delete(`/api/ticketing/discounts/${id}`),
};

export default ticketingAPI;
