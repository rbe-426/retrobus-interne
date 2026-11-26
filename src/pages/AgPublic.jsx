import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertIcon, Box, Button, Container, Heading, HStack, Spinner, Stack, Text } from '@chakra-ui/react';
import { agAPI } from '../api/ag.js';
import { useUser } from '../context/UserContext';

export default function AgPublic() {
  const { isAuthenticated } = useUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    agAPI.publicDocuments()
      .then((result) => setData(result || { documents: [] }))
      .catch((err) => setError(err.message || 'Chargement impossible'));
  }, []);

  const amendTo = isAuthenticated ? '/accueil/myrbe/ag' : '/login';

  return (
    <Container maxW="4xl" py={8}>
      <Heading size="lg" mb={1}>Amendements</Heading>
      {data?.session?.title && (
        <Text color="gray.600" mb={4}>
          {data.session.title}{data.session.meetingDate ? ` — ${new Date(data.session.meetingDate).toLocaleDateString('fr-FR')}` : ''}
        </Text>
      )}
      <Text mb={6}>Textes soumis à amendement. Connectez-vous à votre compte URBEX pour déposer un amendement sur un article.</Text>
      {error && <Alert status="error" mb={4}><AlertIcon />{error}</Alert>}
      {!data && !error && <Spinner />}
      {data && !data.documents.length && <Text color="gray.500">Aucun texte à amender pour le moment.</Text>}
      <Stack spacing={8}>
        {data?.documents.map((document) => (
          <Box key={document.id}>
            <Heading size="md" mb={3}>{document.title}</Heading>
            <Stack spacing={3}>
              {document.articles.map((article) => (
                <Box key={article.id} borderWidth="1px" borderRadius="md" p={3} bg="white">
                  <HStack justify="space-between" align="start">
                    <Text fontWeight="bold">{article.label}</Text>
                    <Button as={RouterLink} to={amendTo} size="sm" variant="outline" colorScheme="blue" flexShrink={0}>
                      {isAuthenticated ? 'Soumettre un amendement' : 'Se connecter pour amender'}
                    </Button>
                  </HStack>
                  {article.body && <Text mt={2} whiteSpace="pre-wrap" fontSize="sm">{article.body}</Text>}
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Container>
  );
}
