import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Heading, Spinner, Text, VStack } from '@chakra-ui/react';
import { apiClient } from '../api/config';

const FALLBACK_URL = 'https://www.retrobus-interne.fr/myrbe/lumistudio';

export default function LumistudioLaunch() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const launch = useMemo(() => async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/lumistudio/launch');
      const launchUrl = response?.launchUrl || FALLBACK_URL;
      window.location.assign(launchUrl);
    } catch (e) {
      setError(e?.message || 'Impossible de demarrer Lumistudio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    launch();
  }, [launch]);

  return (
    <Box p={8}>
      <VStack spacing={4} align="start">
        <Heading size="md">Lumistudio</Heading>
        {loading ? (
          <>
            <Spinner size="md" color="purple.500" />
            <Text>Connexion en cours...</Text>
          </>
        ) : (
          <>
            <Text color={error ? 'red.600' : 'gray.700'}>
              {error || 'Redirection vers Lumistudio.'}
            </Text>
            <Button colorScheme="purple" onClick={launch}>
              Reessayer
            </Button>
            <Button as="a" href={FALLBACK_URL} variant="outline">
              Ouvrir le lien direct
            </Button>
          </>
        )}
      </VStack>
    </Box>
  );
}
