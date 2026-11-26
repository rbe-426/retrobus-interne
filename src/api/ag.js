import { apiClient } from './config.js';

export const AMENDMENT_REASON_LABELS = {
  OPPOSITION_COMPLETE: 'Opposition complète',
  OPPOSITION_PARTIELLE: 'Opposition partielle',
  MODIFICATION_COMPLETE: 'Modification complète',
  MODIFICATION_PARTIELLE: 'Modification partielle',
  PRECISION: 'Précision / clarification',
  AJOUT: 'Ajout',
  MISE_EN_CONFORMITE: 'Mise en conformité',
  REPORT_PERIODE_TRANSITOIRE: 'Report / période transitoire'
};

export const REJECTION_KIND_LABELS = {
  LEGAL: 'Motif légal',
  STATUTAIRE: 'Motif statutaire',
  AUTRE: 'Autre motif',
  VOTE: 'Rejeté par le vote'
};

export const agAPI = {
  publicDocuments: () => apiClient.get('/ag/public/documents'),
  status: () => apiClient.get('/ag/status'),
  join: (code) => apiClient.post('/ag/join', { code }),
  getSession: () => apiClient.get('/ag/session'),
  createSession: (data) => apiClient.post('/ag/session', data),
  updateSession: (data) => apiClient.patch('/ag/session', data),
  listDocuments: () => apiClient.get('/ag/documents'),
  importDocument: (data) => apiClient.post('/ag/documents', data),
  deleteDocument: (id) => apiClient.delete(`/ag/documents/${encodeURIComponent(id)}`),
  submitAmendment: (data) => apiClient.post('/ag/amendments', data),
  myAmendments: () => apiClient.get('/ag/amendments/mine'),
  publishedAmendments: () => apiClient.get('/ag/amendments/published'),
  listAmendments: () => apiClient.get('/ag/amendments'),
  rejectAmendment: (id, data) => apiClient.post(`/ag/amendments/${encodeURIComponent(id)}/reject`, data),
  amendmentToVote: (id) => apiClient.post(`/ag/amendments/${encodeURIComponent(id)}/to-vote`, {}),
  listPolls: () => apiClient.get('/ag/polls'),
  createPoll: (title) => apiClient.post('/ag/polls', { title }),
  openPoll: (id) => apiClient.post(`/ag/polls/${encodeURIComponent(id)}/open`, {}),
  closePoll: (id) => apiClient.post(`/ag/polls/${encodeURIComponent(id)}/close`, {}),
  deletePoll: (id) => apiClient.delete(`/ag/polls/${encodeURIComponent(id)}`),
  openPolls: () => apiClient.get('/ag/polls/open'),
  vote: (id, choice) => apiClient.post(`/ag/polls/${encodeURIComponent(id)}/vote`, { choice })
};
