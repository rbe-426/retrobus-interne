import React from 'react';
import { Box, Container, VStack, HStack, Heading, Text, Button, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';

/**
 * ErrorBoundary Component
 * Capture les erreurs React et affiche un message lisible au lieu de crasher l'app
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Mise à jour de l'état pour dire au render de montrer l'UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log l'erreur dans la console avec détails complets
    console.error('🚨 ErrorBoundary caught error:', error, errorInfo);
    
    // Sauvegarde de l'erreur dans localStorage pour debugging (max 5 erreurs)
    try {
      const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
      errorLog.unshift({
        timestamp: new Date().toISOString(),
        message: error?.toString(),
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
      });
      // Garder seulement les 5 dernières erreurs
      localStorage.setItem('errorLog', JSON.stringify(errorLog.slice(0, 5)));
    } catch (e) {
      // Si localStorage plein/indisponible, silencieux fail
    }

    // Mise à jour de l'état avec les détails
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;
      
      return (
        <Container centerContent minH="100vh" display="flex" alignItems="center" justifyContent="center">
          <VStack spacing={6} align="center" maxW="600px">
            <Alert status="error" variant="subtle" colorScheme="red" borderRadius="lg" py={8}>
              <VStack align="flex-start" w="full">
                <HStack>
                  <AlertIcon />
                  <AlertTitle fontSize="lg" fontWeight="bold">
                    Oups! Une erreur s'est produite
                  </AlertTitle>
                </HStack>
                <AlertDescription fontSize="sm" color="gray.700">
                  L'application a rencontré une erreur inattendue. Ne t'inquiète pas, 
                  nous avons enregistré le problème et tu peux réessayer.
                </AlertDescription>
              </VStack>
            </Alert>

            {/* Détails techniques (uniquement en développement) */}
            {isDevelopment && this.state.error && (
              <Box w="full" bg="gray.100" borderRadius="lg" p={4} overflowX="auto">
                <Heading size="sm" mb={2} fontFamily="monospace">
                  Détails techniques:
                </Heading>
                <Text fontSize="xs" fontFamily="monospace" whiteSpace="pre-wrap" color="red.700">
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text fontSize="xs" fontFamily="monospace" whiteSpace="pre-wrap" color="gray.600" mt={2}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </Box>
            )}

            {/* Actions */}
            <VStack spacing={3} w="full">
              <Button 
                colorScheme="blue" 
                w="full" 
                onClick={this.resetError}
                size="lg"
              >
                Réessayer
              </Button>
              <Button 
                colorScheme="gray" 
                variant="outline"
                w="full" 
                onClick={() => window.location.href = '/'}
                size="lg"
              >
                Retourner à l'accueil
              </Button>
            </VStack>

            {/* Note si plusieurs erreurs */}
            {this.state.errorCount > 2 && (
              <Text fontSize="xs" color="orange.600" textAlign="center">
                ⚠️ Plusieurs erreurs détectées. Si le problème persiste, 
                contacte le support avec le code de l'heure actuelle: {new Date().toLocaleTimeString()}
              </Text>
            )}
          </VStack>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
