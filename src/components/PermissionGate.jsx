import React from 'react';
import { usePermissions } from '../lib/usePermissions';

/**
 * Composant wrapper pour afficher/masquer du contenu en fonction des permissions
 * 
 * Exemples d'utilisation:
 * <PermissionGate resource={RESOURCES.VEHICLE_EDIT}>
 *   <Button>Modifier</Button>
 * </PermissionGate>
 * 
 * <PermissionGate resource={RESOURCES.VEHICLE_DELETE} permissionType="edit">
 *   <Button>Supprimer</Button>
 * </PermissionGate>
 */
export function PermissionGate({ 
  resource, 
  permissionType = 'access',
  fallback = null,
  children 
}) {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(resource, permissionType)) {
    return fallback;
  }
  
  return children;
}

/**
 * Composant pour afficher du contenu selon plusieurs permissions (toutes nécessaires)
 */
export function AllPermissionsRequired({ 
  resources = [],
  permissionType = 'access',
  fallback = null,
  children 
}) {
  const { hasPermission } = usePermissions();
  
  const hasAll = resources.every(resource => 
    hasPermission(resource, permissionType)
  );
  
  if (!hasAll) {
    return fallback;
  }
  
  return children;
}

/**
 * Composant pour afficher du contenu selon plusieurs permissions (au moins une)
 */
export function AnyPermissionRequired({ 
  resources = [],
  permissionType = 'access',
  fallback = null,
  children 
}) {
  const { hasPermission } = usePermissions();
  
  const hasAny = resources.some(resource => 
    hasPermission(resource, permissionType)
  );
  
  if (!hasAny) {
    return fallback;
  }
  
  return children;
}

export default PermissionGate;
