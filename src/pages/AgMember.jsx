import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Badge, Box, Button, Container, FormControl, FormLabel, Heading, HStack, Modal, ModalBody,
  ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Select, Stack, Tab, TabList, TabPanel,
  TabPanels, Tabs, Text, Textarea, useDisclosure, useToast
} from '@chakra-ui/react';
import { agAPI, AMENDMENT_REASON_LABELS, REJECTION_KIND_LABELS } from '../api/ag.js';
import { FiCheckCircle, FiEdit3, FiFileText } from 'react-icons/fi';
import AgLayout from '../components/AgLayout.jsx';
import AgDocumentView from '../components/AgDocumentView.jsx';

const MEMBER_SECTIONS = [{ label: 'Assemblée générale', items: [
  { id: 'documents', label: 'Documents', description: 'Textes à amender', icon: FiFileText },
  { id: 'mine', label: 'Mes amendements', description: 'Suivi de vos dépôts', icon: FiEdit3 },
  { id: 'published', label: 'Amendements clos', description: 'Résultats publiés', icon: FiCheckCircle },
] }];

export function AmendmentResult({ amendment }) {
  const adopted = amendment.status === 'ADOPTED';
  const color = adopted ? 'green' : 'red';
  return (
    <Box borderWidth="1px" borderColor={`${color}.300`} bg={`${color}.50`} borderRadius="md" p={4}>
      <HStack justify="space-between" mb={1} wrap="wrap">
        <Text fontWeight="bold">{amendment.documentTitle} — {amendment.articleLabel}</Text>
        <Badge colorScheme={color}>{adopted ? 'Adopté' : 'Rejeté'}</Badge>
      </HStack>
      <Text fontSize="sm" color="gray.600">
        {AMENDMENT_REASON_LABELS[amendment.reason] || amendment.reason}
        {amendment.authorName ? ` · déposé par ${amendment.authorName}` : ''}
      </Text>
      <Text mt={2} whiteSpace="pre-wrap">{amendment.proposedText}</Text>
      {amendment.vote && (
        <Text mt={2} fontSize="sm" fontWeight="semibold">
          Résultat du vote : {amendment.vote.pour} pour · {amendment.vote.contre} contre ({amendment.vote.total} votants)
        </Text>
      )}
      {!adopted && amendment.rejectionKind && amendment.rejectionKind !== 'VOTE' && (
        <Text mt={1} fontSize="sm" color="red.700">
          {REJECTION_KIND_LABELS[amendment.rejectionKind]}{amendment.rejectionNote ? ` : ${amendment.rejectionNote}` : ''}
        </Text>
      )}
    </Box>
  );
}

function AmendmentModal({ target, onClose, onSent }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [proposedText, setProposedText] = useState('');
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await agAPI.submitAmendment({ articleId: target.article.id, reason, proposedText, justification });
      toast({ status: 'success', title: 'Amendement déposé' });
      onSent();
      onClose();
    } catch (error) {
      toast({ status: 'error', title: 'Dépôt impossible', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Soumettre un amendement</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={3}>
            <Text fontSize="sm"><strong>{target.document.title}</strong> — {target.article.label}</Text>
            <FormControl isRequired>
              <FormLabel>Motif</FormLabel>
              <Select placeholder="Choisir un motif" value={reason} onChange={(event) => setReason(event.target.value)}>
                {Object.entries(AMENDMENT_REASON_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Texte proposé</FormLabel>
              <Textarea rows={6} value={proposedText} onChange={(event) => setProposedText(event.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Justification</FormLabel>
              <Textarea rows={3} value={justification} onChange={(event) => setJustification(event.target.value)} />
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button colorScheme="blue" isLoading={saving} isDisabled={!reason || !proposedText.trim()} onClick={submit}>Déposer</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function AgMember() {
  const modal = useDisclosure();
  const [documents, setDocuments] = useState([]);
  const [mine, setMine] = useState([]);
  const [published, setPublished] = useState([]);
  const [target, setTarget] = useState(null);
  const [section, setSection] = useState('documents');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [docs, own, pub] = await Promise.all([agAPI.listDocuments(), agAPI.myAmendments(), agAPI.publishedAmendments()]);
      setDocuments(docs?.documents || []);
      setMine(own?.amendments || []);
      setPublished(pub?.amendments || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Chargement impossible');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAmendment = (document, article) => {
    setTarget({ document, article });
    modal.onOpen();
  };

  return (
    <AgLayout subtitle="Documents et amendements" groups={MEMBER_SECTIONS} active={section} onSelect={setSection}>
      {error && <Alert status="error" mb={4}><AlertIcon />{error}</Alert>}
      <Box maxW="4xl">
        {section === 'documents' && (
          <Stack spacing={8}>
            {!documents.length && <Text color="gray.500">Aucun document disponible.</Text>}
            {documents.map((document) => <AgDocumentView key={document.id} document={document} onAmend={openAmendment} />)}
          </Stack>
        )}
        {section === 'mine' && (
          <Stack spacing={3}>
            {!mine.length && <Text color="gray.500">Vous n'avez déposé aucun amendement.</Text>}
            {mine.map((amendment) => (
              amendment.status === 'IN_REVIEW' ? (
                <Box key={amendment.id} borderWidth="1px" borderRadius="md" p={3} bg="white">
                  <HStack justify="space-between">
                    <Text fontWeight="bold">{amendment.documentTitle} — {amendment.articleLabel}</Text>
                    <Badge colorScheme="orange">En instruction</Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">{AMENDMENT_REASON_LABELS[amendment.reason] || amendment.reason}</Text>
                </Box>
              ) : <AmendmentResult key={amendment.id} amendment={amendment} />
            ))}
          </Stack>
        )}
        {section === 'published' && (
          <Stack spacing={3}>
            {!published.length && <Text color="gray.500">Aucun amendement clos pour le moment.</Text>}
            {published.map((amendment) => <AmendmentResult key={amendment.id} amendment={amendment} />)}
          </Stack>
        )}
      </Box>
      {modal.isOpen && target && <AmendmentModal target={target} onClose={modal.onClose} onSent={load} />}
    </AgLayout>
  );
}
