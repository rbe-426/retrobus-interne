/**
 * Hook pour vérifier les permissions de gestion des véhicules
 * Centralise la logique d'autorisation pour les opérations sur les véhicules
 * 
 * ✅ Gère les variations de casse et format des rôles
 * ✅ Fallback robuste si le rôle n'existe pas
 */

import { useUser } from '../context/UserContext';
import { RESOURCES, ROLE_PERMISSIONS, PERMISSION_TYPES } from '../lib/permissions';

/**
 * Normalise un rôle pour correspondre aux clés de ROLE_PERMISSIONS
 * @param {string} role - Le rôle à normaliser
 * @returns {string} Le rôle normalisé
 */
function normalizeRoleKey(role) {
  if (!role) return null;
  
  const normalized = String(role).trim().toUpperCase();
  
  // Si la clé existe directement, la retourner
  if (ROLE_PERMISSIONS[normalized]) {
    return normalized;
  }
  
  // Sinon, chercher une correspondance
  const roleMap = {
    'ADMINISTRATEUR': 'ADMIN',
    'ADMINISTRATEURS': 'ADMIN',
  };
  
  if (roleMap[normalized]) {
    return roleMap[normalized];
  }
  
  return normalized;
}

/**
 * Vérifie si un rôle a une permission spécifique
 * @param {string} role - Le rôle à vérifier
 * @param {string} resource - La ressource (ex: RESOURCES.VEHICLE_CREATE)
 * @returns {boolean}
 */
function hasPermission(role, resource) {
  const normalizedRole = normalizeRoleKey(role);
  const roleConfig = ROLE_PERMISSIONS[normalizedRole];
  
  if (!roleConfig) {
    console.warn(`⚠️ Rôle inconnu: "${role}" (normalisé: "${normalizedRole}")`);
    return false;
  }
  
  const permissions = roleConfig.permissions[resource] || [];
  return permissions.includes(PERMISSION_TYPES.EDIT) || permissions.includes('edit');
}

export function useVehiclePermissions() {
  const { matricule, roles = [] } = useUser();

  // Récupérer le premier rôle (rôle principal)
  const rawRole = roles?.[0] || null;
  const userRole = normalizeRoleKey(rawRole);

  /**
   * Vérifie si l'utilisateur peut créer un véhicule
   * @returns {boolean}
   */
  const canCreateVehicle = () => {
    if (!userRole || !matricule) {
      return false;
    }
    return hasPermission(userRole, RESOURCES.VEHICLE_CREATE);
  };

  /**
   * Vérifie si l'utilisateur peut voir les véhicules
   * @returns {boolean}
   */
  const canViewVehicles = () => {
    if (!userRole || !matricule) {
      return false;
    }
    
    const roleConfig = ROLE_PERMISSIONS[userRole];
    if (!roleConfig) return false;

    const permissions = roleConfig.permissions[RESOURCES.VEHICLES] || [];
    return permissions.includes(PERMISSION_TYPES.VIEW) || 
           permissions.includes('view') ||
           permissions.includes(PERMISSION_TYPES.EDIT) ||
           permissions.includes('edit');
  };

  /**
   * Vérifie si l'utilisateur peut éditer un véhicule
   * @returns {boolean}
   */
  const canEditVehicle = () => {
    if (!userRole || !matricule) {
      return false;
    }
    return hasPermission(userRole, RESOURCES.VEHICLE_EDIT);
  };

  /**
   * Vérifie si l'utilisateur peut supprimer un véhicule
   * @returns {boolean}
   */
  const canDeleteVehicle = () => {
    if (!userRole || !matricule) {
      return false;
    }
    return hasPermission(userRole, RESOURCES.VEHICLE_DELETE);
  };

  /**
   * Obtient un message d'erreur explicite si l'accès est refusé
   * @param {'create'|'view'|'edit'|'delete'} action
   * @returns {string}
   */
  const getAccessDeniedMessage = (action = 'create') => {
    const displayRole = rawRole || 'inconnu';
    // Récupérer dynamiquement les rôles qui ont la permission VEHICLE_CREATE
    const rolesWithCreatePerm = Object.entries(ROLE_PERMISSIONS)
      .filter(([_, config]) => {
        const perms = config.permissions[RESOURCES.VEHICLE_CREATE] || [];
        return perms.includes(PERMISSION_TYPES.EDIT) || perms.includes('edit');
      })
      .map(([_, config]) => config.label);
    
    const messages = {
      create: `Vous n'êtes pas autorisé à ajouter des véhicules.\n\nRôle actuel: ${displayRole}\nRôles autorisés: ${rolesWithCreatePerm.join(', ')}`,
      view: `Vous n'êtes pas autorisé à consulter les véhicules. Rôle: ${displayRole}`,
      edit: `Vous n'êtes pas autorisé à modifier les véhicules. Rôle: ${displayRole}`,
      delete: `Vous n'êtes pas autorisé à supprimer les véhicules. Rôle: ${displayRole}`
    };
    return messages[action] || messages.create;
  };

  /**
   * Debug: Retourne les infos actuelles pour dépannage
   */
  const debugInfo = () => ({
    rawRole,
    normalizedRole: userRole,
    matricule,
    canCreate: canCreateVehicle(),
    roleConfig: ROLE_PERMISSIONS[userRole]
  });

  return {
    canCreateVehicle,
    canViewVehicles,
    canEditVehicle,
    canDeleteVehicle,
    getAccessDeniedMessage,
    currentRole: userRole,
    currentMatricule: matricule,
    rawRole,
    debugInfo
  };
}
