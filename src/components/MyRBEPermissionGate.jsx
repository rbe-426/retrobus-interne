import React from 'react';
import { Box, Button, Center, Icon, Text, VStack } from '@chakra-ui/react';
import { FiLock } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { MYRBE_CARDS } from '../config/myrbeCards';

const getCardForPath = (pathname) => MYRBE_CARDS.find((card) => (
  pathname === card.to || pathname.startsWith(`${card.to}/`)
));

export default function MyRBEPermissionGate({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUser();
  const { permissions, loading } = useUserPermissions(user?.id);

  if (!isAuthenticated || loading) return children;

  const card = getCardForPath(location.pathname);
  if (!card) return children;

  const cardActions = permissions.find((permission) => permission.resource === card.permissionKey)?.actions || [];
  const resourceActions = card.resource
    ? permissions.find((permission) => permission.resource === card.resource)?.actions || []
    : [];
  const isBlocked = [...cardActions, ...resourceActions].some((action) => (
    ['DENY', 'HIDE', 'LOCK'].includes(action)
  ));

  if (!isBlocked) return children;

  return (
    <Center minH="60vh" px={4}>
      <VStack spacing={4} textAlign="center" maxW="md">
        <Icon as={FiLock} boxSize={12} color="red.500" />
        <Box>
          <Text fontSize="2xl" fontWeight="bold">Accès verrouillé</Text>
          <Text color="gray.600" mt={2}>
            Cette page n'est pas accessible avec les permissions attribuées à ce compte.
          </Text>
        </Box>
        <Button onClick={() => navigate('/accueil/myrbe', { replace: true })}>
          Retour à MyRBE
        </Button>
      </VStack>
    </Center>
  );
}