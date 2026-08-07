import { useUser } from '../context/UserContext';
import {
  hasPermission,
  canAccess,
  canView,
  canEdit,
  getRolePermissions
} from '../lib/permissions';

/**
 * Hook pour utiliser les permissions dans les composants
 * Utilise le rôle de l'utilisateur actuellement connecté
 * ET prend en compte les permissions individuelles
 */
export function usePermissions() {
  const { roles, customPermissions } = useUser();
  const role = (roles && roles[0]) || 'MEMBER';

  return {
    role,
    hasPermission: (resource, permissionType = 'access') => 
      hasPermission(role, resource, permissionType, customPermissions),
    canAccess: (resource) => 
      canAccess(role, resource, customPermissions),
    canView: (resource) => 
      canView(role, resource, customPermissions),
    canEdit: (resource) => 
      canEdit(role, resource, customPermissions),
    permissions: getRolePermissions(role),
    customPermissions: customPermissions || {}
  };
}

/**
 * Hook pour afficher/masquer un composant en fonction des permissions
 */
export function usePermissionCheck(resource, permissionType = 'access') {
  const perms = usePermissions();
  return perms.hasPermission(resource, permissionType);
}

/**
 * Hook pour vérifier l'accès à plusieurs ressources
 */
export function useMultiPermissionCheck(resources) {
  const perms = usePermissions();
  return Object.fromEntries(
    resources.map(resource => [
      resource,
      perms.hasPermission(resource)
    ])
  );
}

export default usePermissions;
