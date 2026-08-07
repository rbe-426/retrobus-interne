import React, { useState } from 'react';
import {
  Box, VStack, HStack, Button, Card, CardBody, CardHeader, Heading, 
  Text, Input, Select, Code, useToast, Alert, AlertIcon, Spinner,
  SimpleGrid, Badge, Textarea, Divider, FormControl, FormLabel
} from '@chakra-ui/react';
import { FiRefreshCw, FiCopy, FiCheckCircle } from 'react-icons/fi';
import { apiClient } from '../api/config';

export default function ApiDiagnostics() {
  const toast = useToast();
  const [tests, setTests] = useState({
    token: { status: null, data: null, error: null, time: null },
    health: { status: null, data: null, error: null, time: null },
    vehicles: { status: null, data: null, error: null, time: null },
    siteUsers: { status: null, data: null, error: null, time: null },
    members: { status: null, data: null, error: null, time: null },
    siteConfig: { status: null, data: null, error: null, time: null }
  });
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem('rbe_api_origin') || import.meta.env.VITE_API_URL || ''
  );
  const [customPath, setCustomPath] = useState('/api/site-users');
  const [authHeader, setAuthHeader] = useState('');

  // Récupérer le token dès le chargement
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthHeader(`Bearer ${token.substring(0, 30)}...`);
    } else {
      setAuthHeader('❌ Pas de token trouvé');
    }
  }, []);

  const runTest = async (testName, endpoint) => {
    const startTime = performance.now();
    try {
      const response = await apiClient.get(endpoint);
      const endTime = performance.now();
      setTests(prev => ({
        ...prev,
        [testName]: {
          status: 'success',
          data: response,
          error: null,
          time: (endTime - startTime).toFixed(2)
        }
      }));
      toast({
        title: `✅ ${testName}`,
        description: `Succès en ${((endTime - startTime).toFixed(2))}ms`,
        status: 'success',
        duration: 3000
      });
    } catch (error) {
      const endTime = performance.now();
      setTests(prev => ({
        ...prev,
        [testName]: {
          status: 'error',
          data: null,
          error: {
            message: error?.message,
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            headers: error?.response?.headers
          },
          time: (endTime - startTime).toFixed(2)
        }
      }));
      toast({
        title: `❌ ${testName}`,
        description: `${error?.response?.status || error?.message}`,
        status: 'error',
        duration: 4000
      });
    }
  };

  const runAllTests = async () => {
    await runTest('token', '/api/auth/me');
    await runTest('vehicles', '/vehicles');
    await runTest('siteUsers', '/api/site-users');
    await runTest('members', '/api/members');
    await runTest('siteConfig', '/api/site-config');
  };

  const runCustomTest = async () => {
    if (!customPath.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un chemin',
        status: 'error',
        duration: 2000
      });
      return;
    }
    await runTest('custom', customPath.trim());
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié',
      description: 'Le contenu a été copié',
      status: 'success',
      duration: 1000
    });
  };

  const TestResult = ({ name, test }) => (
    <Card>
      <CardHeader display="flex" justifyContent="space-between" alignItems="center">
        <Heading size="sm">{name}</Heading>
        {test.status === 'success' && (
          <Badge colorScheme="green">✅ OK</Badge>
        )}
        {test.status === 'error' && (
          <Badge colorScheme="red">❌ ERREUR</Badge>
        )}
        {test.status === null && (
          <Badge colorScheme="gray">⏳ Non testé</Badge>
        )}
      </CardHeader>
      <CardBody>
        {test.status === null && (
          <Text color="gray.500">Cliquez sur "Tester tous" ou testez individuellement</Text>
        )}
        
        {test.status === 'success' && (
          <VStack align="start" spacing={2}>
            <HStack>
              <Text fontSize="sm" color="green.600">✅ Succès</Text>
              <Text fontSize="xs" color="gray.500">({test.time}ms)</Text>
            </HStack>
            <Code p={3} borderRadius="md" maxH="200px" overflowY="auto" fontSize="xs" w="full">
              {JSON.stringify(test.data, null, 2)}
            </Code>
            <Button size="xs" leftIcon={<FiCopy />} onClick={() => copyToClipboard(JSON.stringify(test.data, null, 2))}>
              Copier
            </Button>
          </VStack>
        )}

        {test.status === 'error' && (
          <VStack align="start" spacing={2}>
            <HStack>
              <Text fontSize="sm" color="red.600">❌ Erreur</Text>
              <Text fontSize="xs" color="gray.500">({test.time}ms)</Text>
            </HStack>
            <Box bg="red.50" p={2} borderRadius="md" w="full">
              <Text fontSize="sm" color="red.700" fontWeight="bold">
                {test.error.status} - {test.error.statusText}
              </Text>
              <Text fontSize="sm" color="red.600">{test.error.message}</Text>
              {test.error.headers && (
                <Code fontSize="xs" p={2} mt={2} w="full" overflowX="auto">
                  Content-Type: {test.error.headers['content-type']}
                </Code>
              )}
            </Box>
          </VStack>
        )}
      </CardBody>
    </Card>
  );

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg">🔧 Diagnostique API</Heading>
          <Text color="gray.600">Vérifiez les connexions aux différents endpoints API</Text>
        </Box>

        <Alert status="info">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" fontWeight="bold">Configuration actuelle</Text>
            <Text fontSize="xs">
              API URL: <Code>{apiUrl || 'par défaut'}</Code>
            </Text>
            <Text fontSize="xs">
              Token: <Code>{authHeader}</Code>
            </Text>
            <Text fontSize="xs" color="gray.600">
              Pour vérifier votre authentification, consultez la console (F12) et cherchez des erreurs 401 ou 403.
            </Text>
          </VStack>
        </Alert>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Card bg="blue.50">
            <CardBody>
              <VStack align="stretch" spacing={3}>
                <Heading size="sm">🧪 Tests Automatiques</Heading>
                <Button 
                  colorScheme="blue" 
                  onClick={runAllTests}
                  leftIcon={<FiRefreshCw />}
                  size="sm"
                >
                  Tester tous les endpoints
                </Button>
              </VStack>
            </CardBody>
          </Card>

          <Card bg="purple.50">
            <CardBody>
              <VStack align="stretch" spacing={3}>
                <Heading size="sm">🔍 Test Personnalisé</Heading>
                <Input
                  size="sm"
                  placeholder="/api/chemin-personnalise"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                />
                <Button 
                  colorScheme="purple" 
                  onClick={runCustomTest}
                  size="sm"
                >
                  Tester ce chemin
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Box>
          <Heading size="md" mb={4}>📊 Résultats des Tests</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <TestResult name="🔐 Token / Authentification" test={tests.token} />
            <TestResult name="🚗 Véhicules" test={tests.vehicles} />
            <TestResult name="👥 Site Users (Accès)" test={tests.siteUsers} />
            <TestResult name="👫 Membres" test={tests.members} />
            <TestResult name="⚙️ Configuration Site" test={tests.siteConfig} />
          </SimpleGrid>
        </Box>

        <Card bg="amber.50">
          <CardHeader>
            <Heading size="sm">💡 Conseils</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2} fontSize="sm">
              <Text>• Si <strong>Site Users</strong> échoue, vérifiez que le token est valide</Text>
              <Text>• Si l'endpoint retourne HTML (erreur 404), vérifiez l'URL de l'API</Text>
              <Text>• Utilisez "Test Personnalisé" pour tester d'autres endpoints</Text>
              <Text>• Vérifiez la console du navigateur (F12) pour plus de détails</Text>
              <Text>• Assurez-vous que le backend est en cours d'exécution</Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
