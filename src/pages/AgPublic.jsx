import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertIcon, Box, Button, Card, CardBody, Divider, Grid, Heading, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, SimpleGrid, Spinner, Stack, Text, useDisclosure } from '@chakra-ui/react';
import { agAPI } from '../api/ag.js';
import { useUser } from '../context/UserContext';
import AgLayout from '../components/AgLayout.jsx';
import AgDocumentView from '../components/AgDocumentView.jsx';

const SECTIONS = [{ label: 'Assemblée générale', items: [
  { id: 'documents', label: 'Amendements', description: 'Textes à amender', icon: null },
] }];

export default function AgPublic() {
  const { isAuthenticated } = useUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const modal = useDisclosure();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    agAPI.publicDocuments()
      .then((result) => setData(result || { documents: [] }))
      .catch((err) => setError(err.message || 'Chargement impossible'));
  }, []);

  const session = data?.session;
  const badge = session?.title
    ? `${session.title}${session.meetingDate ? ` — ${new Date(session.meetingDate).toLocaleDateString('fr-FR')}` : ''}`
    : undefined;

  const openDocument = (document) => {
    setSelected(document);
    modal.onOpen();
  };

  return (
    <AgLayout subtitle="Amendements publics" groups={SECTIONS} active="documents" onSelect={() => {}} badge={badge}>
      <Stack spacing={8}>
        <Box textAlign="center">
          <Heading size="lg" mb={2}>Documents soumis aux amendements</Heading>
          <Text color="gray.600">Sélectionnez un document pour consulter ses articles et déposer vos amendements.</Text>
        </Box>

        {error && <Alert status="error"><AlertIcon />{error}</Alert>}
        {!data && !error && <Spinner />}
        {data && !data.documents.length && <Text color="gray.500" textAlign="center">Aucun texte à amender pour le moment.</Text>}

        {data?.documents.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {data.documents.map((document) => (
              <Card key={document.id} bg="white" cursor="pointer" _hover={{ shadow: 'lg' }} onClick={() => openDocument(document)}>
                <CardBody>
                  <Heading size="md" mb={2}>{document.title}</Heading>
                  <Text fontSize="sm" color="gray.600" mb={3}>{document.articles.length} article(s)</Text>
                  <Button size="sm" colorScheme="rbe" w="full">Consulter et amender</Button>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      <Modal isOpen={modal.isOpen} onClose={modal.onClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selected?.title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selected && (
              <Stack spacing={4}>
                {selected.articles.map((article) => (
                  <Box key={article.id} borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                    <Text fontWeight="bold" textTransform="uppercase" mb={2}># {article.label}</Text>
                    {article.body && <Text fontSize="sm" whiteSpace="pre-wrap" color="gray.700" mb={3}>{article.body}</Text>}
                    {isAuthenticated && (
                      <Button size="sm" colorScheme="blue" as={RouterLink} to="/accueil/myrbe/ag">
                        Soumettre un amendement
                      </Button>
                    )}
                    {!isAuthenticated && (
                      <Button size="sm" as={RouterLink} to="/login">
                        Se connecter pour amender
                      </Button>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </AgLayout>
  );
}

