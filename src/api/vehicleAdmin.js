import { apiClient } from './config.js';

export const vehicleAdminAPI = {
  // CARTES GRISES
  getCarteGrise: async (parc) => {
    return apiClient.get(`/vehicles/${parc}/cg`);
  },

  addCarteGrise: async (parc, type, documentPath, notes) => {
    return apiClient.post(`/vehicles/${parc}/cg`, {
      type, // 'old' | 'new'
      documentPath,
      notes
    });
  },

  markOldCGBarred: async (parc) => {
    return apiClient.put(`/vehicles/${parc}/cg/mark-old-barred`, {});
  },

  // ASSURANCE
  getAssurance: async (parc) => {
    return apiClient.get(`/vehicles/${parc}/assurance`);
  },

  updateAssurance: async (parc, data) => {
    return apiClient.post(`/vehicles/${parc}/assurance`, data);
  },

  // CONTRÔLE TECHNIQUE
  getControleTechnique: async (parc) => {
    return apiClient.get(`/vehicles/${parc}/ct`);
  },

  addControleTechnique: async (parc, data) => {
    return apiClient.post(`/vehicles/${parc}/ct`, data);
  },

  // CERTIFICAT TEMPORAIRE
  getCertificatTemporaire: async (parc) => {
    return apiClient.get(`/vehicles/${parc}/certificat-temporaire`);
  },

  updateCertificatTemporaire: async (parc, data) => {
    return apiClient.post(`/vehicles/${parc}/certificat-temporaire`, data);
  },

  // CERTIFICAT DE CESSION
  getCertificatCession: async (parc) => {
    return apiClient.get(`/vehicles/${parc}/certificat-cession`);
  },

  addCertificatCession: async (parc, certificatPath, notes) => {
    return apiClient.post(`/vehicles/${parc}/certificat-cession`, {
      certificatPath,
      notes
    });
  },

  // ÉCHÉANCIER
  getEchancier: async (parc) => {
    return apiClient.get(`/vehicles/${parc}/echancier`);
  },

  getAllEchancier: async () => {
    return apiClient.get(`/api/echancier`);
  },

  addEchancierItem: async (parc, data) => {
    return apiClient.post(`/vehicles/${parc}/echancier`, data);
  },

  updateEchancierItem: async (parc, id, data) => {
    return apiClient.put(`/vehicles/${parc}/echancier/${id}`, data);
  },

  deleteEchancierItem: async (parc, id) => {
    return apiClient.delete(`/vehicles/${parc}/echancier/${id}`);
  }
};
