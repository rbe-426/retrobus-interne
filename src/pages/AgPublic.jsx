import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertIcon, Box, Button, Card, CardBody, Divider, Grid, Heading, SimpleGrid, Spinner, Stack, Text, Badge, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, useDisclosure, FormControl, FormLabel, Textarea, Select, useToast } from '@chakra-ui/react';
import { agAPI, AMENDMENT_REASON_LABELS } from '../api/ag.js';
import { useUser } from '../context/UserContext';
import AgLayout from '../components/AgLayout.jsx';
import AgDocumentView from '../components/AgDocumentView.jsx';
import AmendmentButton from '../components/AmendmentButton.jsx';

const SECTIONS = [
  { label: 'Amendements', items: [
    { id: 'my-amendments', label: 'Mes amendements', description: 'Vos amendements en cours', icon: null },
    { id: 'documents', label: 'Documents', description: 'Documents soumis aux amendements', icon: null },
  ] }
];

export default function AgPublic() {
  const { isAuthenticated } = useUser();
  const toast = useToast();
  const modal = useDisclosure();
  
  const [data, setData] = useState(null);
  const [myAmendments, setMyAmendments] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('documents');
  
  const [currentAmendment, setCurrentAmendment] = useState(null);
  const [amendmentForm, setAmendmentForm] = useState({ reason: '', body: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await agAPI.publicDocuments();
        setData(result || { documents: [] });
      } catch (err) {
        setError(err.message || 'Chargement impossible');
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const result = await agAPI.myAmendments();
        setMyAmendments(result?.amendments || []);
      } catch (err) {
        console.error('Erreur chargement amendements:', err);
      }
    };
    load();
  }, [isAuthenticated]);

  const session = data?.session;
  const badge = session?.title
    ? `${session.title}${session.meetingDate ? ` — ${new Date(session.meetingDate).toLocaleDateString('fr-FR')}` : ''}`
    : undefined;

  const handleAmendmentClick = (documentId, articleId, article, document) => {
    setCurrentAmendment({ documentId, articleId, article, document });
    setAmendmentForm({ reason: '', body: '' });
    modal.onOpen();
  };

  const handleSubmitAmendment = async () => {
    if (!amendmentForm.reason || !amendmentForm.body.trim()) {
      toast({ title: 'Formulaire incomplet', status: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await agAPI.submitAmendment({
        documentId: currentAmendment.documentId,
        articleId: currentAmendment.articleId,
        reason: amendmentForm.reason,
        proposedText: amendmentForm.body.trim(),
      });
      toast({ title: 'Amendement déposé', status: 'success' });
      modal.onClose();
      
      const result = await agAPI.myAmendments();
      setMyAmendments(result?.amendments || []);
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, status: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      IN_REVIEW: { color: 'blue', label: 'En instruction' },
      SUBMITTED: { color: 'blue', label: 'Soumis' },
      VOTE: { color: 'orange', label: 'En vote' },
      ADOPTED: { color: 'green', label: 'Adopté' },
      REJECTED: { color: 'red', label: 'Rejeté' },
      NOT_ADOPTED: { color: 'gray', label: 'Non adopté' },
    };
    const s = statusMap[status] || { color: 'gray', label: status };
    return <Badge colorScheme={s.color}>{s.label}</Badge>;
  };

  return (
    <AgLayout subtitle="Amendements" groups={isAuthenticated ? SECTIONS : SECTIONS.map((g) => ({ ...g, items: g.items.filter((i) => i.id === 'documents') }))} active={activeTab} onSelect={setActiveTab} badge={badge}>
      <Stack spacing={8}>
        {/* Mes amendements */}
        {activeTab === 'my-amendments' && isAuthenticated && (
          <>
            <Box textAlign="center">
              <Heading size="lg" mb={2}>Mes amendements</Heading>
              <Text color="gray.600">Suivi de vos amendements déposés</Text>
            </Box>

            {!myAmendments && <Spinner />}
            {myAmendments && myAmendments.length === 0 && (
              <Text color="gray.500" textAlign="center">Aucun amendement pour le moment.</Text>
            )}
            {myAmendments && myAmendments.length > 0 && (
              <Stack spacing={3}>
                {myAmendments.map((amendment) => (
                  <Card key={amendment.id} bg="white" borderLeftWidth="4px" borderLeftColor={
                    amendment.status === 'ADOPTED' ? 'green.500' : 
                    amendment.status === 'REJECTED' ? 'red.500' : 'blue.500'
                  }>
                    <CardBody>
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="start" gap={4}>
                          <Box flex={1}>
                            <Heading size="sm" mb={1}>                            {amendment.documentTitle} — {amendment.articleLabel}</Heading>
                                                        <Text fontSize="sm" color="gray.600">{AMENDMENT_REASON_LABELS[amendment.reason] || amendment.reason}</Text>
                          </Box>
                          {getStatusBadge(amendment.status)}
                        </Box>
                        {amendment.proposedText && (
                          <Text fontSize="sm" bg="gray.50" p={2} borderRadius="md" whiteSpace="pre-wrap">
                            {amendment.proposedText}
                          </Text>
                        )}
                        {amendment.rejectionNote && (
                          <Alert status="error" size="sm">
                            <AlertIcon />
                            <Box>
                              <Text fontSize="sm"><strong>Motif de rejet:</strong> {amendment.rejectionKind}</Text>
                              {amendment.rejectionNote && <Text fontSize="xs" mt={1}>{amendment.rejectionNote}</Text>}
                            </Box>
                          </Alert>
                        )}
                      </Stack>
                    </CardBody>
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}

        {/* Documents */}
        {activeTab === 'documents' && (
          <>
            <Box textAlign="center">
              <Heading size="lg" mb={2}>Documents soumis aux amendements</Heading>
              <Text color="gray.600">Sélectionnez un document pour consulter ses articles et déposer vos amendements.</Text>
            </Box>

            {error && <Alert status="error"><AlertIcon />{error}</Alert>}
            {!data && !error && <Spinner />}
            {data && !data.documents.length && <Text color="gray.500" textAlign="center">Aucun texte à amender pour le moment.</Text>}

            {data?.documents.length > 0 && (
              <Stack spacing={6}>
                {data.documents.map((document) => (
                  <Box key={document.id}>
                    <Box 
                      as="button" 
                      onClick={() => setSelected(selected === document.id ? null : document.id)}
                      w="full"
                      textAlign="left"
                      _hover={{ cursor: 'pointer' }}
                    >
                      <Card bg="white" cursor="pointer" _hover={{ shadow: 'lg' }} transition="all 0.2s">
                        <CardBody>
                          <Heading size="md" mb={2}>{document.title}</Heading>
                          <Text fontSize="sm" color="gray.600">{document.articles.length} article(s)</Text>
                        </CardBody>
                      </Card>
                    </Box>

                    {selected === document.id && (
                      <Stack spacing={3} mt={4} pl={4} borderLeftWidth="2px" borderLeftColor="blue.500">
                        {document.articles.map((article) => (
                          <Box 
                            key={article.id} 
                            borderWidth="1px" 
                            borderRadius="md" 
                            p={4} 
                            bg="gray.50"
                            display="flex"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            gap={4}
                          >
                            <Box flex={1}>
                              <Text fontWeight="bold" textTransform="uppercase" mb={2} fontSize="sm" color="blue.700">
                                # {article.label}
                              </Text>
                              {article.body && (
                                <Text fontSize="sm" whiteSpace="pre-wrap" color="gray.700">
                                  {article.body}
                                </Text>
                              )}
                            </Box>
                            
                            {isAuthenticated && (
                              <AmendmentButton
                                onClick={() => handleAmendmentClick(document.id, article.id, article, document)}
                              />
                            )}
                            {!isAuthenticated && (
                              <Button 
                                size="sm" 
                                as={RouterLink} 
                                to="/login"
                                flexShrink={0}
                              >
                                Se connecter
                              </Button>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </>
        )}
      </Stack>

      {/* Modal de dépôt d'amendement */}
      <Modal isOpen={modal.isOpen} onClose={modal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Déposer un amendement
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {currentAmendment && (
              <Stack spacing={4}>
                <Box bg="blue.50" p={3} borderRadius="md">
                  <Text fontSize="sm" color="gray.600">
                    <strong>{currentAmendment.document?.title}</strong><br />
                    Article {currentAmendment.article?.label}
                  </Text>
                </Box>

                <FormControl isRequired>
                  <FormLabel>Motif de l'amendement</FormLabel>
                  <Select 
                    value={amendmentForm.reason}
                    onChange={(e) => setAmendmentForm({...amendmentForm, reason: e.target.value})}
                    isDisabled={submitting}
                  >
                    <option value="">Sélectionnez un motif</option>
                    {Object.entries(AMENDMENT_REASON_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Texte de l'amendement</FormLabel>
                  <Textarea
                    value={amendmentForm.body}
                    onChange={(e) => setAmendmentForm({...amendmentForm, body: e.target.value})}
                    placeholder="Décrivez votre amendement..."
                    isDisabled={submitting}
                    rows={6}
                  />
                </FormControl>

                <Stack direction="row" spacing={3} justify="flex-end">
                  <Button variant="outline" onClick={modal.onClose} isDisabled={submitting}>
                    Annuler
                  </Button>
                  <Button 
                    colorScheme="blue" 
                    onClick={handleSubmitAmendment}
                    isLoading={submitting}
                  >
                    Déposer l'amendement
                  </Button>
                </Stack>
              </Stack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </AgLayout>
  );
}

