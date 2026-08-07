import { Box, Text, VStack, Heading, Badge, Code, Divider } from "@chakra-ui/react";
import { useUser } from "../context/UserContext";
import { useVehiclePermissions } from "../hooks/useVehiclePermissions";

/**
 * Composant de protection pour restreindre la création de véhicules
 * Utilise le système de permissions granulaire basé sur les rôles
 * 
 * ✅ Rôles autorisés: ADMIN, PRESIDENT, VICE_PRESIDENT, VOLUNTEER
 * ❌ Rôles refusés: DRIVER, MEMBER, PRESTATAIRE, etc.
 */
export default function RequireCreator({ children }) {
  const { matricule, user } = useUser();
  const { canCreateVehicle, getAccessDeniedMessage, currentRole, rawRole, debugInfo } = useVehiclePermissions();

  // Si l'utilisateur peut créer, afficher le contenu
  if (canCreateVehicle()) {
    return children;
  }

  // Sinon, afficher le message d'erreur avec infos de debug
  const debug = debugInfo?.();

  return (
    <Box p={8} maxW="700px" mx="auto" mt={8}>
      <VStack spacing={4} align="stretch" textAlign="center">
        <Heading size="lg" color="red.600">🔒 Accès refusé</Heading>
        
        <Box bg="red.50" p={4} borderRadius="md" borderLeft="4px" borderColor="red.500">
          <Text fontWeight="bold" mb={2} whiteSpace="pre-wrap">
            {getAccessDeniedMessage('create')}
          </Text>
        </Box>

        {/* Infos actuelles */}
        <Box bg="blue.50" p={4} borderRadius="md" borderLeft="4px" borderColor="blue.500">
          <Text fontWeight="bold" mb={2} fontSize="sm">
            ℹ️ Informations actuelles:
          </Text>
          <VStack align="start" spacing={1} fontSize="sm">
            <Text>
              <strong>Matricule:</strong> <Code>{matricule || 'N/A'}</Code>
            </Text>
            <Text>
              <strong>Rôle brut:</strong> <Code>{rawRole || 'N/A'}</Code>
            </Text>
            <Text>
              <strong>Rôle normalisé:</strong> <Badge colorScheme="purple">{currentRole || 'INCONNU'}</Badge>
            </Text>
            <Text>
              <strong>Peut créer:</strong> <Badge colorScheme="red">Non</Badge>
            </Text>
          </VStack>
        </Box>

        {/* Info déboggage */}
        {debug && (
          <Box bg="gray.100" p={3} borderRadius="md" textAlign="left" fontSize="xs" fontFamily="monospace" overflowX="auto">
            <Text fontWeight="bold" mb={1}>Debug info:</Text>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {JSON.stringify(debug, null, 2)}
            </pre>
          </Box>
        )}

        <Divider />

        <Text fontSize="xs" color="gray.600" p={3} bg="gray.50" borderRadius="md">
          Si vous pensez que c'est une erreur, contactez un administrateur avec le lien "Support" en bas de page.
        </Text>
      </VStack>
    </Box>
  );
}
