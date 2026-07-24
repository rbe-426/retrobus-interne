import { apiClient } from './config';

export const retroStudioApi = {
  createRequest: (request) => apiClient.post('/api/retrostudio/requests', request),
  updateRequest: (id, request) => apiClient.put(`/api/retrostudio/requests/${id}`, request),
  getOngoingRequests: () => apiClient.get('/api/retrostudio/requests'),
  getPendingValidations: () => apiClient.get('/api/retrostudio/requests/pending-validation'),
  validateRequest: (id, decision, comment = '') => apiClient.put(`/api/retrostudio/requests/${id}/validation`, { decision, comment })
};