import { apiClient } from './config.js';

/**
 * API client pour gérer les devis et factures
 */
export const financialDocumentsAPI = {
  // ========== Opérations CRUD ==========
  
  // Récupérer tous les documents
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.eventId) params.append('eventId', filters.eventId);
    
    const queryString = params.toString();
    return apiClient.get(`/api/finance/documents${queryString ? '?' + queryString : ''}`);
  },
  
  // Récupérer un document spécifique
  getById: (id) => apiClient.get(`/api/finance/documents/${id}`),
  
  // Créer un nouveau document
  create: (data) => apiClient.post('/api/finance/documents', data),
  
  // Modifier un document
  update: (id, data) => apiClient.put(`/api/finance/documents/${id}`, data),
  
  // Supprimer un document (seulement si DRAFT)
  delete: (id) => apiClient.delete(`/api/finance/documents/${id}`),
  
  // ========== Gestion des statuts ==========
  
  // Changer le statut d'un document
  updateStatus: (id, status) => 
    apiClient.patch(`/api/finance/documents/${id}/status`, { status }),
  
  // ========== Opérations spéciales ==========
  
  // Rééditer un devis vers un nouveau
  reissueQuote: (id, { newNumber, newTitle } = {}) =>
    apiClient.post(`/api/finance/documents/${id}/reissue`, { newNumber, newTitle }),
  
  // ========== Statistiques ==========
  
  // Obtenir les statistiques
  getStats: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    
    const queryString = params.toString();
    return apiClient.get(`/api/finance/documents/stats/summary${queryString ? '?' + queryString : ''}`);
  },
  
  // ========== Helpers ==========
  
  // Formater un statut pour l'affichage
  getStatusLabel: (status, type = 'QUOTE') => {
    if (type === 'QUOTE') {
      const labels = {
        DRAFT: 'Brouillon',
        SENT: 'Envoyé',
        ACCEPTED: 'Accepté',
        REFUSED: 'Refusé',
        REEDITED: 'Réédité vers un nouveau'
      };
      return labels[status] || status;
    }
    
    if (type === 'INVOICE') {
      const labels = {
        DRAFT: 'Brouillon',
        SENT: 'Envoyé',
        ACCEPTED: 'Accepté',
        PENDING_PAYMENT: 'En attente de paiement',
        PAID: 'Payé',
        DEPOSIT_PAID: 'Accompte payé'
      };
      return labels[status] || status;
    }
    
    return status;
  },
  
  // Obtenir la couleur du statut
  getStatusColor: (status, type = 'QUOTE') => {
    if (type === 'QUOTE') {
      const colors = {
        DRAFT: 'gray',
        SENT: 'blue',
        ACCEPTED: 'green',
        REFUSED: 'red',
        REEDITED: 'orange'
      };
      return colors[status] || 'gray';
    }
    
    if (type === 'INVOICE') {
      const colors = {
        DRAFT: 'gray',
        SENT: 'blue',
        ACCEPTED: 'cyan',
        PENDING_PAYMENT: 'orange',
        PAID: 'green',
        DEPOSIT_PAID: 'yellow'
      };
      return colors[status] || 'gray';
    }
    
    return 'gray';
  },
  
  // Obtenir les statuts valides pour un type
  getValidStatuses: (type = 'QUOTE') => {
    if (type === 'QUOTE') {
      return ['DRAFT', 'SENT', 'ACCEPTED', 'REFUSED', 'REEDITED'];
    }
    if (type === 'INVOICE') {
      return ['DRAFT', 'SENT', 'ACCEPTED', 'PENDING_PAYMENT', 'PAID', 'DEPOSIT_PAID'];
    }
    return [];
  }
};
