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
  return await apiClient.get(TEAM_API_BASE, { params });
};

/**
 * Récupère un membre par ID
 */
export const getTeamMemberById = async (id) => {
  return await apiClient.get(`${TEAM_API_BASE}/${id}`);
};

/**
 * Crée un nouveau membre
 */
export const createTeamMember = async (memberData) => {
  return await apiClient.post(TEAM_API_BASE, memberData);
};

/**
 * Met à jour un membre
 */
export const updateTeamMember = async (id, memberData) => {
  return await apiClient.put(`${TEAM_API_BASE}/${id}`, memberData);
};

/**
 * Supprime (désactive) un membre
 */
export const deleteTeamMember = async (id) => {
  return await apiClient.delete(`${TEAM_API_BASE}/${id}`);
};

/**
 * Réordonne les membres
 * @param {Array} members - Array of {id, order}
 */
export const reorderTeamMembers = async (members) => {
  return await apiClient.post(`${TEAM_API_BASE}/reorder`, { members });
};

export default {
  getAllTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  reorderTeamMembers
};
