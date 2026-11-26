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
  ILLISIBLE: 'Amendement illisible / incompréhensible',
  AUTRE: 'Autre motif',
  VOTE: 'Rejeté par le vote'
};

export const agAPI = {
  publicDocuments: () => apiClient.get('/api/ag/public/documents'),
  status: () => apiClient.get('/api/ag/status'),
  join: (code) => apiClient.post('/api/ag/join', { code }),
  getSession: () => apiClient.get('/api/ag/session'),
  createSession: (data) => apiClient.post('/api/ag/session', data),
  updateSession: (data) => apiClient.patch('/api/ag/session', data),
  listDocuments: () => apiClient.get('/api/ag/documents'),
  importDocument: (data) => apiClient.post('/api/ag/documents', data),
  deleteDocument: (id) => apiClient.delete(`/api/ag/documents/${encodeURIComponent(id)}`),
  submitAmendment: (data) => apiClient.post('/api/ag/amendments', data),
  myAmendments: () => apiClient.get('/api/ag/amendments/mine'),
  publishedAmendments: () => apiClient.get('/api/ag/amendments/published'),
  listAmendments: () => apiClient.get('/api/ag/amendments'),
  rejectAmendment: (id, data) => apiClient.post(`/api/ag/amendments/${encodeURIComponent(id)}/reject`, data),
  publishAmendment: (id, published = true) => apiClient.post(`/api/ag/amendments/${encodeURIComponent(id)}/publish`, { published }),
  publishAllAmendments: () => apiClient.post('/api/ag/amendments/publish-all', {}),
  amendmentToVote: (id) => apiClient.post(`/api/ag/amendments/${encodeURIComponent(id)}/to-vote`, {}),
  listPolls: () => apiClient.get('/api/ag/polls'),
  createPoll: (title) => apiClient.post('/api/ag/polls', { title }),
  openPoll: (id) => apiClient.post(`/api/ag/polls/${encodeURIComponent(id)}/open`, {}),
  closePoll: (id) => apiClient.post(`/api/ag/polls/${encodeURIComponent(id)}/close`, {}),
  deletePoll: (id) => apiClient.delete(`/api/ag/polls/${encodeURIComponent(id)}`),
  openPolls: () => apiClient.get('/api/ag/polls/open'),
  vote: (id, choice) => apiClient.post(`/api/ag/polls/${encodeURIComponent(id)}/vote`, { choice })
};
