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
  const { user, roles, customPermissions } = useUser();
  const role = (roles && roles[0]) || 'MEMBER';
  const isConfiguredPresident = [user?.matricule, user?.username, user?.email, user?.id]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase())
    .some((identity) => identity === 'w.belaidi' || identity === 'belaidiw91@gmail.com');

  return {
    role,
    hasPermission: (resource, permissionType = 'access') => 
      isConfiguredPresident || hasPermission(role, resource, permissionType, customPermissions),
    canAccess: (resource) => 
      isConfiguredPresident || canAccess(role, resource, customPermissions),
    canView: (resource) => 
      isConfiguredPresident || canView(role, resource, customPermissions),
    canEdit: (resource) => 
      isConfiguredPresident || canEdit(role, resource, customPermissions),
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
