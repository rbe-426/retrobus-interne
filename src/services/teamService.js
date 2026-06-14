/**
 * Team API Service
 * Gère les appels API pour la gestion de l'équipe
 */

import apiClient from '../apiClient';

const TEAM_API_BASE = '/team';

/**
 * Récupère tous les membres de l'équipe
 * @param {boolean} publicMode - true pour masquer les contacts (externe), false pour tout afficher (interne)
 */
export const getAllTeamMembers = async (publicMode = false) => {
  const params = publicMode ? { public: 'true' } : {};
  const response = await apiClient.get(TEAM_API_BASE, { params });
  return response.data;
};

/**
 * Récupère un membre par ID
 */
export const getTeamMemberById = async (id) => {
  const response = await apiClient.get(`${TEAM_API_BASE}/${id}`);
  return response.data;
};

/**
 * Crée un nouveau membre
 */
export const createTeamMember = async (memberData) => {
  const response = await apiClient.post(TEAM_API_BASE, memberData);
  return response.data;
};

/**
 * Met à jour un membre
 */
export const updateTeamMember = async (id, memberData) => {
  const response = await apiClient.put(`${TEAM_API_BASE}/${id}`, memberData);
  return response.data;
};

/**
 * Supprime (désactive) un membre
 */
export const deleteTeamMember = async (id) => {
  const response = await apiClient.delete(`${TEAM_API_BASE}/${id}`);
  return response.data;
};

/**
 * Réordonne les membres
 * @param {Array} members - Array of {id, order}
 */
export const reorderTeamMembers = async (members) => {
  const response = await apiClient.post(`${TEAM_API_BASE}/reorder`, { members });
  return response.data;
};

export default {
  getAllTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  reorderTeamMembers
};
