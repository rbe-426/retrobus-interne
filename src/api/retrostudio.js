import { apiClient } from './config';

export const retroStudioApi = {
  createRequest: (request) => apiClient.post('/api/retrostudio/requests', request),
  getPendingValidations: () => apiClient.get('/api/retrostudio/requests/pending-validation'),
  validateRequest: (id, decision, comment = '') => apiClient.put(`/api/retrostudio/requests/${id}/validation`, { decision, comment })
};