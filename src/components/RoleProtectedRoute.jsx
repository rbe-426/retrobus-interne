import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Box, Text, VStack, Center, Icon } from '@chakra-ui/react';
import { FiLock } from 'react-icons/fi';

/**
 * RoleProtectedRoute - Protège une route basée sur le rôle utilisateur
 * @param {Object} props
 * @param {React.ReactNode} props.children - Composant à rendre
 * @param {string[]} props.allowedRoles - Rôles autorisés (ex: ['ADMIN', 'MANAGER'])
 * @param {string[]} props.deniedRoles - Rôles refusés (ex: ['CLIENT', 'GUEST']) 
 * @param {string} props.fallbackRoute - Route vers laquelle rediriger - défaut: '/dashboard/home'
 * @param {boolean} props.showError - Afficher une page d'erreur - défaut: true
 */
export default function RoleProtectedRoute({
  children,
  allowedRoles = null,
  deniedRoles = null,
  fallbackRoute = '/dashboard/home',
  showError = true
}) {
  const { isAuthenticated, roles } = useUser();
  const location = window.location;

  // Pas authentifié - sauvegarder l'URL pour redirection après login
  if (!isAuthenticated) {
    const returnUrl = location.pathname + location.search;
    return <Navigate to="/login" state={{ from: returnUrl }} replace />;
  }

  // Récupérer le premier rôle ou MEMBER par défaut
  const userRole = roles?.[0] || 'MEMBER';

  // Vérifier si le rôle est dans la liste des rôles refusés
  if (deniedRoles && deniedRoles.includes(userRole)) {
    console.warn(`❌ RoleProtectedRoute: Role "${userRole}" is denied access`);

    if (showError) {
      return (
        <Center minH="60vh" px={4}>
          <VStack spacing={4} textAlign="center">
            <Icon as={FiLock} boxSize={12} color="red.500" />
            <Box>
              <Text fontSize="2xl" fontWeight="bold" mb={2}>
                Accès Refusé
              </Text>
              <Text color="gray.600" mb={4}>
                Cette section n'est pas disponible pour votre rôle.
              </Text>
              <Text fontSize="sm" color="gray.500">
                Rôle: <strong>{userRole}</strong>
              </Text>
            </Box>
          </VStack>
        </Center>
      );
    }

    return <Navigate to={fallbackRoute} replace />;
  }

  // Vérifier si le rôle est dans la liste des rôles autorisés
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.warn(`❌ RoleProtectedRoute: Role "${userRole}" not in allowed roles`);

    if (showError) {
      return (
        <Center minH="60vh" px={4}>
          <VStack spacing={4} textAlign="center">
            <Icon as={FiLock} boxSize={12} color="red.500" />
            <Box>
              <Text fontSize="2xl" fontWeight="bold" mb={2}>
                Accès Refusé
              </Text>
              <Text color="gray.600" mb={4}>
                Cette section n'est pas disponible pour votre rôle.
              </Text>
              <Text fontSize="sm" color="gray.500">
                Rôles autorisés: <strong>{allowedRoles.join(', ')}</strong>
              </Text>
            </Box>
          </VStack>
        </Center>
      );
    }

    return <Navigate to={fallbackRoute} replace />;
  }

  return children;
}
