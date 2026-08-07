import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Box, Container, Text, Button, VStack, Center } from '@chakra-ui/react';

/**
 * Protège une route pour que les prestataires n'y aient accès que s'ils sont autorisés
 * Les prestataires ne peuvent accéder qu'à /dashboard/retroplanning et /dashboard/support
 */
export default function PrestataireLimitedRoute({ children, allowedPath }) {
  const { user, isAuthenticated } = useUser();

  // Non authentifié → login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.role || 'MEMBER';

  // Si c'est un prestataire, vérifier qu'il accède à une route autorisée
  if (userRole === 'PRESTATAIRE') {
    const currentPath = window.location.pathname;
    const allowedPaths = ['/dashboard/retroplanning', '/planning/my-invitations', '/dashboard/support'];
    
    const isAllowed = allowedPaths.some(path => currentPath === path || currentPath.startsWith(path + '/'));

    if (!isAllowed) {
      return (
        <Container centerContent py={20}>
          <VStack spacing={4} textAlign="center">
            <Box fontSize="4xl">🔒</Box>
            <Text fontSize="xl" fontWeight="bold">Accès refusé</Text>
            <Text color="gray.600">
              En tant que prestataire, vous avez accès uniquement à:
            </Text>
            <VStack spacing={2} fontSize="sm">
              <Text>✓ 📅 RétroPlanning</Text>
              <Text>✓ 🆘 RétroSupport</Text>
            </VStack>
            <Button 
              colorScheme="red" 
              mt={4}
              onClick={() => window.location.href = '/dashboard/retroplanning'}
            >
              Aller au RétroPlanning
            </Button>
          </VStack>
        </Container>
      );
    }
  }

  // Utilisateur authentifié avec accès autorisé
  return children;
}
