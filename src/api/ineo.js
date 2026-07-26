import { apiClient } from './config.js';

export const ineoAPI = {
  listMissions: () => apiClient.get('/ineo/missions'),
  createMission: (data) => apiClient.post('/ineo/missions', data),
  listVehicleProfiles: () => apiClient.get('/ineo/vehicle-profiles'),
  saveVehicleProfile: (parc, data) => apiClient.put(`/ineo/vehicle-profiles/${encodeURIComponent(parc)}`, data),
  listVehicleTrackers: () => apiClient.get('/ineo/vehicle-trackers'),
  saveVehicleTracker: (parc, data) => apiClient.put(`/ineo/vehicle-trackers/${encodeURIComponent(parc)}`, data),
  reportVehicleTrackerPosition: (imei, position) => apiClient.post(`/ineo/vehicle-trackers/${encodeURIComponent(imei)}/position`, position),
  listRoutes: () => apiClient.get('/ineo/routes'),
  searchRouteReferences: (query) => apiClient.get(`/ineo/routes/search?q=${encodeURIComponent(query)}`),
  findRouteByReference: (courseReference) => apiClient.get(`/ineo/routes/reference/${encodeURIComponent(courseReference)}`),
  createRoute: (data) => apiClient.post('/ineo/routes', data),
  saveRouteByReference: (courseReference, data) => apiClient.put(`/ineo/routes/reference/${encodeURIComponent(courseReference)}`, data),
  getCurrentDriverMission: () => apiClient.get('/ineo/driver/current'),
  startMission: (id) => apiClient.post(`/ineo/missions/${id}/start`, {}),
  sendPosition: (id, position) => apiClient.post(`/ineo/missions/${id}/position`, position),
  completeMission: (id) => apiClient.post(`/ineo/missions/${id}/complete`, {}),
};