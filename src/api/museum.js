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

export const museumAPI = {
  workspace: {
    list: (section) => apiClient.get(`/api/museum/workspace/${encodeURIComponent(section)}`),
    create: (section, data) => apiClient.post(`/api/museum/workspace/${encodeURIComponent(section)}`, { data }),
    update: (section, id, data) => apiClient.patch(`/api/museum/workspace/${encodeURIComponent(section)}/${encodeURIComponent(id)}`, { data }),
    remove: (section, id) => apiClient.delete(`/api/museum/workspace/${encodeURIComponent(section)}/${encodeURIComponent(id)}`),
  },

  // Statistiques globales du musée
  getStats: () => apiClient.get('/api/museum/stats'),

  // Liste des modules disponibles
  getModules: () => apiClient.get('/api/museum/modules'),

  // Informations d'un module spécifique
  getModule: (moduleId) => apiClient.get(`/api/museum/modules/${moduleId}`),

  // Collections
  collections: {
    getAll: (params = {}) => apiClient.get(`/api/museum/collections${toQuery(params)}`),
    getById: (id) => apiClient.get(`/api/museum/collections/${id}`),
    create: (data) => apiClient.post('/api/museum/collections', data),
    update: (id, data) => apiClient.put(`/api/museum/collections/${id}`, data),
    delete: (id) => apiClient.delete(`/api/museum/collections/${id}`),
    getStats: () => apiClient.get('/api/museum/collections/stats'),
  },

  // Expositions
  exhibitions: {
    getAll: (params = {}) => apiClient.get(`/api/museum/exhibitions${toQuery(params)}`),
    getById: (id) => apiClient.get(`/api/museum/exhibitions/${id}`),
    create: (data) => apiClient.post('/api/museum/exhibitions', data),
    update: (id, data) => apiClient.put(`/api/museum/exhibitions/${id}`, data),
    delete: (id) => apiClient.delete(`/api/museum/exhibitions/${id}`),
    getStats: () => apiClient.get('/api/museum/exhibitions/stats'),
  },

  // Conservation
  conservation: {
    getAll: (params = {}) => apiClient.get(`/api/museum/conservation${toQuery(params)}`),
    getById: (id) => apiClient.get(`/api/museum/conservation/${id}`),
    create: (data) => apiClient.post('/api/museum/conservation', data),
    update: (id, data) => apiClient.put(`/api/museum/conservation/${id}`, data),
    getStats: () => apiClient.get('/api/museum/conservation/stats'),
  },

  // Prêts et emprunts
  loans: {
    getAll: (params = {}) => apiClient.get(`/api/museum/loans${toQuery(params)}`),
    getById: (id) => apiClient.get(`/api/museum/loans/${id}`),
    create: (data) => apiClient.post('/api/museum/loans', data),
    update: (id, data) => apiClient.put(`/api/museum/loans/${id}`, data),
    getStats: () => apiClient.get('/api/museum/loans/stats'),
  },

  // Médiation culturelle
  mediation: {
    getAll: (params = {}) => apiClient.get(`/api/museum/mediation${toQuery(params)}`),
    getById: (id) => apiClient.get(`/api/museum/mediation/${id}`),
    create: (data) => apiClient.post('/api/museum/mediation', data),
    update: (id, data) => apiClient.put(`/api/museum/mediation/${id}`, data),
    getStats: () => apiClient.get('/api/museum/mediation/stats'),
  },

  // Documentation
  documentation: {
    getAll: (params = {}) => apiClient.get(`/api/museum/documentation${toQuery(params)}`),
    getById: (id) => apiClient.get(`/api/museum/documentation/${id}`),
    create: (data) => apiClient.post('/api/museum/documentation', data),
    update: (id, data) => apiClient.put(`/api/museum/documentation/${id}`, data),
    getStats: () => apiClient.get('/api/museum/documentation/stats'),
  },

  // Mécénat
  sponsorship: {
    getAll: (params = {}) => apiClient.get(`/api/museum/sponsorship${toQuery(params)}`),
    getById: (id) => apiClient.get(`/api/museum/sponsorship/${id}`),
    create: (data) => apiClient.post('/api/museum/sponsorship', data),
    update: (id, data) => apiClient.put(`/api/museum/sponsorship/${id}`, data),
    getStats: () => apiClient.get('/api/museum/sponsorship/stats'),
  },

  // Événements
  events: {
    getAll: (params = {}) => apiClient.get(`/api/museum/events${toQuery(params)}`),
    getById: (id) => apiClient.get(`/api/museum/events/${id}`),
    create: (data) => apiClient.post('/api/museum/events', data),
    update: (id, data) => apiClient.put(`/api/museum/events/${id}`, data),
    getStats: () => apiClient.get('/api/museum/events/stats'),
  },
};

export default museumAPI;
