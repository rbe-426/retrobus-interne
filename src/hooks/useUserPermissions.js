import { useState, useEffect } from 'react';
import { fetchJson } from '../apiClient';

/**
 * Hook pour charger les permissions individuelles d'un utilisateur
 * Optimisé pour la performance avec cache en mémoire
 */
const permissionsCache = new Map();

export function useUserPermissions(userId) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    // Vérifier le cache d'abord
    const cached = permissionsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < 60000) { // Cache 1 minute
      setPermissions(cached.data);
      return;
    }

    const loadPermissions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const url = `/api/user-permissions/${userId}`;
        const data = await fetchJson(url);

        if (data.success) {
          // Parser les actions si elles sont en JSON string
          const parsed = (data.permissions || []).map(p => ({
            ...p,
            actions: Array.isArray(p.actions) 
              ? p.actions 
              : JSON.parse(p.actions || '[]')
          }));
          
          // Mettre en cache
          permissionsCache.set(userId, {
            data: parsed,
            timestamp: Date.now()
          });
          
          setPermissions(parsed);
        } else {
          setError(data.error || 'Failed to load permissions');
        }
      } catch (err) {
        console.error('❌ Error loading permissions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [userId]);

  const hasPermission = (resource, action) => {
    const perm = permissions.find(p => p.resource === resource);
    if (!perm) return false;

    // Vérifier l'expiration
    if (perm.expiresAt && new Date(perm.expiresAt) < new Date()) {
      return false;
    }

    return perm.actions.includes(action);
  };

  const hasResourceAccess = (resource) => {
    return permissions.some(p => p.resource === resource);
  };

  const getResourceActions = (resource) => {
    const perm = permissions.find(p => p.resource === resource);
    if (!perm || (perm.expiresAt && new Date(perm.expiresAt) < new Date())) {
      return [];
    }
    return perm.actions;
  };

  return {
    permissions,
    loading,
    error,
    hasPermission,
    hasResourceAccess,
    getResourceActions
  };
}
