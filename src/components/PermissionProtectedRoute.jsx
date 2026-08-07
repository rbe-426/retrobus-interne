import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { canAccess, RESOURCES } from '../lib/permissions';
import { Box, Text, VStack } from '@chakra-ui/react';

/**
 * PermissionProtectedRoute - Protège une route basée sur les permissions granulaires
 * @param {Object} props
 * @param {React.ReactNode} props.children - Composant à rendre
 * @param {string} props.resource - Ressource requise (ex: RESOURCES.RETROPLANNING)
 * @param {string} props.permissionType - Type de permission ('access', 'view', 'edit') - défaut: 'access'
 * @param {string} props.fallbackRoute - Route vers laquelle rediriger si non autorisé - défaut: '/dashboard/home'
 * @param {boolean} props.showError - Afficher une page d'erreur au lieu de rediriger - défaut: false
 */
export default function PermissionProtectedRoute({
  children,
  resource = null,
  permissionType = 'access',
  fallbackRoute = '/dashboard/home',
  showError = false
}) {
  const { isAuthenticated, user } = useUser();

  // Pas authentifié
  if (!isAuthenticated) {
    console.warn('❌ PermissionProtectedRoute: Not authenticated');
    return <Navigate to="/login" replace />;
  }

  // Pas de user (shouldn't happen but just in case)
  if (!user) {
    console.warn('❌ PermissionProtectedRoute: No user data');
    return <Navigate to="/login" replace />;
  }

  // Si pas de ressource requise, laisser passer
  if (!resource) {
    return children;
  }

  // Vérifier les permissions
  const userRole = user.role || user.roles?.[0] || 'MEMBER';
  const hasAccess = canAccess(userRole, resource);

  if (!hasAccess) {
    console.warn(`❌ PermissionProtectedRoute: User role "${userRole}" denied access to resource "${resource}"`);

    if (showError) {
      return (
        <Box p={8} textAlign="center" minH="100vh" display="flex" alignItems="center" justifyContent="center">
          <VStack spacing={4}>
            <Text fontSize="2xl" fontWeight="bold">
              🔒 Accès Refusé
            </Text>
            <Text fontSize="md" color="gray.600">
              Vous n'avez pas les permissions nécessaires pour accéder à cette ressource.
            </Text>
            <Text fontSize="sm" color="gray.400">
              Votre rôle: <strong>{userRole}</strong>
            </Text>
          </VStack>
        </Box>
      );
    }

    return <Navigate to={fallbackRoute} replace />;
  }

  console.log(`✅ PermissionProtectedRoute: Access granted to "${resource}" for role "${userRole}"`);
  return children;
}
