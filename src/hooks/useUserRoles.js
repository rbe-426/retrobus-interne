/**
 * Hook centralisé pour accéder aux rôles de l'utilisateur
 * Standardise l'accès aux rôles dans toute l'application
 * 
 * Usage:
 * const { roles, hasRole, isAdmin, hasAdminAccess } = useUserRoles();
 */

import { useUser } from '../context/UserContext';
import { normalizeRole } from '../lib/roles';

// Rôles qui ont accès à l'administration
export const ADMIN_ROLES = ['ADMIN', 'PRESIDENT', 'VICE_PRESIDENT', 'TRESORIER', 'SECRETAIRE_GENERAL'];

// Rôles qui ont accès à la gestion des finances
export const FINANCE_ADMIN_ROLES = ['ADMIN', 'PRESIDENT', 'VICE_PRESIDENT', 'TRESORIER'];

// Rôles qui peuvent créer des véhicules
export const VEHICLE_CREATOR_ROLES = ['ADMIN', 'PRESIDENT', 'VICE_PRESIDENT', 'VOLUNTEER'];

export function useUserRoles() {
  const { user, roles: contextRoles, isAdmin: contextIsAdmin } = useUser();

  // Récupérer un array de rôles normalisés
  // Priorité: contextRoles (du contexte) > user.roles > user.role > []
  const getRoles = () => {
    let rolesArray = [];
    
    if (contextRoles && Array.isArray(contextRoles) && contextRoles.length > 0) {
      rolesArray = contextRoles;
    } else if (user?.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      rolesArray = user.roles;
    } else if (user?.role) {
      rolesArray = [user.role];
    }

    return rolesArray.map(r => normalizeRole(r));
  };

  const roles = getRoles();

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   * @param {string|string[]} roleOrRoles - Le/les rôle(s) à vérifier
   * @returns {boolean}
   */
  const hasRole = (roleOrRoles) => {
    const rolesToCheck = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    return rolesToCheck.some(r => roles.includes(normalizeRole(r)));
  };

  /**
   * Vérifie si l'utilisateur a accès à l'administration
   * @returns {boolean}
   */
  const hasAdminAccess = () => {
    return hasRole(ADMIN_ROLES);
  };

  /**
   * Vérifie si l'utilisateur peut gérer les finances
   * @returns {boolean}
   */
  const hasFinanceAccess = () => {
    return hasRole(FINANCE_ADMIN_ROLES);
  };

  /**
   * Vérifie si l'utilisateur peut créer des véhicules
   * @returns {boolean}
   */
  const canCreateVehicle = () => {
    return hasRole(VEHICLE_CREATOR_ROLES);
  };

  /**
   * Retourne true si c'est un admin
   * @returns {boolean}
   */
  const isAdmin = () => {
    return contextIsAdmin || hasRole('ADMIN');
  };

  return {
    roles,
    hasRole,
    hasAdminAccess,
    hasFinanceAccess,
    canCreateVehicle,
    isAdmin,
    // Pour compatibilité
    user
  };
}
