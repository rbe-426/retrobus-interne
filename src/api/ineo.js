import { apiClient } from './config.js';

export const ineoAPI = {
  listMissions: () => apiClient.get('/ineo/missions'),
  createMission: (data) => apiClient.post('/ineo/missions', data),
  getCurrentDriverMission: () => apiClient.get('/ineo/driver/current'),
  startMission: (id) => apiClient.post(`/ineo/missions/${id}/start`, {}),
  sendPosition: (id, position) => apiClient.post(`/ineo/missions/${id}/position`, position),
  completeMission: (id) => apiClient.post(`/ineo/missions/${id}/complete`, {}),
};