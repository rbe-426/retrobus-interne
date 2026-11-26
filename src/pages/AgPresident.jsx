import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Alert, AlertIcon, Badge, Box, Button, Checkbox, Container, Divider, FormControl, FormLabel, Heading, HStack, Input,
  Select, Stack, Switch, Tab, TabList, TabPanel, TabPanels, Tabs, Text, Textarea, useToast, Wrap
} from '@chakra-ui/react';
import { agAPI, AMENDMENT_REASON_LABELS, REJECTION_KIND_LABELS } from '../api/ag.js';
import AgLayout from '../components/AgLayout.jsx';
import AgDocumentView from '../components/AgDocumentView.jsx';
import { AG_DOCUMENT_ACCEPT, detectTitle, extractDocumentText, splitArticles } from '../utils/agDocumentText.js';
import { FiClock, FiEdit3, FiFileText, FiThumbsUp } from 'react-icons/fi';

const SECTIONS = [{ label: 'Assemblée générale', items: [
  { id: 'session', label: 'Session', description: 'Mode AG, QR code, exclusions', icon: FiClock },
  { id: 'documents', label: 'Documents', description: 'Textes à amender', icon: FiFileText },
  { id: 'amendments', label: 'Amendements', description: 'Instruction et rejets', icon: FiEdit3 },
  { id: 'polls', label: 'Scrutins', description: 'Votes et résultats', icon: FiThumbsUp },
] }];

const STATUS_LABELS = {
  SUBMITTED: ['Déposé', 'blue'],
  VOTE: ['Soumis au vote', 'purple'],
  ADOPTED: ['Adopté', 'green'],
  REJECTED: ['Rejeté', 'red'],
  NOT_ADOPTED: ['Non adopté', 'red']
};

function SessionPanel({ data, reload }) {
  const toast = useToast();
  const { session, attendees } = data;
  const joinUrl = `${window.location.origin}/ag/rejoindre?code=${session.joinCode}`;
  const excluded = Array.isArray(session.excludedUserIds) ? session.excludedUserIds : [];

  const update = async (patch, success) => {
    try {
      await agAPI.updateSession(patch);
      if (success) toast({ status: 'success', title: success });
      reload();
    } catch (error) {
      toast({ status: 'error', title: 'Action impossible', description: error.message });
    }
  };

  const toggleExcluded = (userId) => update({
    excludedUserIds: excluded.includes(userId) ? excluded.filter((id) => id !== userId) : [...excluded, userId]
  });

  return (
    <Stack spacing={5}>
      <Box borderWidth="1px" borderRadius="lg" p={4} bg={session.modeActive ? 'orange.50' : 'white'}>
        <HStack justify="space-between" wrap="wrap" spacing={4}>
          <Box>
            <Heading size="md">{session.title}</Heading>
            {session.meetingDate && <Text color="gray.600">{new Date(session.meetingDate).toLocaleDateString('fr-FR')}</Text>}
          </Box>
          <FormControl display="flex" alignItems="center" w="auto">
            <FormLabel htmlFor="ag-mode" mb={0} fontWeight="bold">Mode AG</FormLabel>
            <Switch
              id="ag-mode"
              size="lg"
              colorScheme="orange"
              isChecked={session.modeActive}
              onChange={(event) => update({ modeActive: event.target.checked }, event.target.checked ? 'Mode AG activé : URBEX suspendu pour les autres utilisateurs' : 'Mode AG désactivé')}
            />
          </FormControl>
        </HStack>
        {session.modeActive && <Alert status="warning" mt={3}><AlertIcon />L'accès à URBEX est suspendu pour tous les utilisateurs sauf vous.</Alert>}
      </Box>

      <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
        <HStack spacing={6} align="start" wrap="wrap">
          <Box bg="white" p={2} borderWidth="1px"><QRCodeSVG value={joinUrl} size={180} /></Box>
          <Stack spacing={2}>
            <Text fontWeight="bold">QR code d'entrée de la session</Text>
            <Text fontSize="sm" color="gray.600">Valable pour toute la session : un seul scan par adhérent.</Text>
            <Text fontSize="xl" fontFamily="mono">{session.joinCode}</Text>
            <Text fontSize="xs" color="gray.500" wordBreak="break-all">{joinUrl}</Text>
            <Button size="sm" alignSelf="flex-start" variant="outline" onClick={() => update({ rotateCode: true }, 'Nouveau code généré')}>Régénérer le code</Button>
          </Stack>
        </HStack>
      </Box>

      <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
        <Heading size="sm" mb={2}>Présents ({attendees.length})</Heading>
        <Text fontSize="xs" color="gray.500" mb={2}>Cochez « Exclu » pour retirer le droit de vote / de dépôt (ex. non-renouvellement au 31/12/2026).</Text>
        <Stack spacing={1}>
          {!attendees.length && <Text color="gray.500">Personne n'a encore rejoint la session.</Text>}
          {attendees.map((attendee) => (
            <HStack key={attendee.id} justify="space-between">
              <Text>{attendee.name}</Text>
              <Checkbox isChecked={excluded.includes(attendee.userId)} onChange={() => toggleExcluded(attendee.userId)}>Exclu</Checkbox>
            </HStack>
          ))}
        </Stack>
        <Divider my={3} />
        <FormControl>
          <FormLabel fontSize="sm">Exclure un compte avant l'AG (e-mail)</FormLabel>
          <HStack>
            <Input size="sm" id="ag-exclude-input" placeholder="adresse e-mail" />
            <Button size="sm" onClick={() => {
              const input = document.getElementById('ag-exclude-input');
              const value = String(input.value || '').trim().toLowerCase();
              if (value && !excluded.includes(value)) update({ excludedUserIds: [...excluded, value] });
              input.value = '';
            }}>Ajouter</Button>
          </HStack>
        </FormControl>
        {excluded.length > 0 && (
          <Wrap mt={2}>
            {excluded.map((id) => <Badge key={id} colorScheme="red" cursor="pointer" onClick={() => toggleExcluded(id)}>{id} ✕</Badge>)}
          </Wrap>
        )}
      </Box>

      <Button colorScheme="red" variant="outline" alignSelf="flex-start" onClick={() => {
        if (window.confirm('Clôturer définitivement la session ? Le Mode AG sera désactivé.')) update({ close: true }, 'Session clôturée');
      }}>Clôturer la session</Button>
    </Stack>
  );
}

function DocumentsPanel() {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [articles, setArticles] = useState([]);

  const detect = (source) => setArticles(splitArticles(source));
  const updateArticle = (index, patch) => setArticles((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const removeArticle = (index) => setArticles((list) => list.filter((_, i) => i !== index));
  const mergeWithPrevious = (index) => setArticles((list) => list.flatMap((item, i) => {
    if (i === index) return [];
    if (i === index - 1) return [{ ...item, body: [item.body, list[index].label, list[index].body].filter(Boolean).join('\n') }];
    return [item];
  }));
  const addArticle = () => setArticles((list) => [...list, { label: `Article ${list.length + 1}`, body: '' }]);
  const load = useCallback(async () => {
    try {
      const data = await agAPI.listDocuments();
      setDocuments(data?.documents || []);
    } catch { /* état conservé */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const readFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const extracted = await extractDocumentText(file);
      const detected = detectTitle(extracted, file.name);
      const [firstLine, ...rest] = extracted.split('\n');
      const body = firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim() === detected ? rest.join('\n').trim() : extracted;
      setText(body);
      detect(body);
      setTitle(detected);
    } catch (error) {
      toast({ status: 'error', title: 'Lecture du fichier impossible', description: error.message });
    }
    event.target.value = '';
  };

  const importDocument = async () => {
    try {
      const result = await agAPI.importDocument({ title, articles });
      toast({ status: 'success', title: `Document importé (${result.document.articles.length} articles)` });
      setTitle('');
      setText('');
      setArticles([]);
      load();
    } catch (error) {
      toast({ status: 'error', title: 'Import impossible', description: error.message });
    }
  };

  return (
    <Stack spacing={4}>
      <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
        <Stack spacing={3}>
          <Heading size="sm">Importer un document</Heading>
          <Text fontSize="sm" color="gray.600">Formats acceptés : Word (.docx), PDF, ODT, RTF, HTML, TXT, Markdown… Le titre et les articles (lignes « Article N … ») sont détectés automatiquement.</Text>
          <Input type="file" accept={AG_DOCUMENT_ACCEPT} p={1} onChange={readFile} />
          <Input placeholder="Titre détecté (ex. Règlement intérieur)" value={title} onChange={(event) => setTitle(event.target.value)} />
          {articles.length > 0 && <Text fontSize="sm" color="green.700">{articles.length} zone(s) de texte détectée(s) — une par article, chacune aura son bouton d'amendement.</Text>}
          <Textarea rows={5} placeholder="Ou collez le texte ici" value={text} onChange={(event) => setText(event.target.value)} />
          <Button size="sm" variant="outline" alignSelf="flex-start" isDisabled={!text.trim()} onClick={() => detect(text)}>Détecter les articles</Button>
          {articles.map((article, index) => (
            <Box key={index} borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
              <HStack mb={2}>
                <Input bg="white" fontWeight="bold" value={article.label} onChange={(event) => updateArticle(index, { label: event.target.value })} />
                {index > 0 && <Button size="sm" variant="outline" flexShrink={0} onClick={() => mergeWithPrevious(index)}>Fusionner avec le précédent</Button>}
                <Button size="sm" colorScheme="red" variant="ghost" flexShrink={0} onClick={() => removeArticle(index)}>Retirer</Button>
              </HStack>
              <Textarea bg="white" rows={4} value={article.body} onChange={(event) => updateArticle(index, { body: event.target.value })} />
            </Box>
          ))}
          {articles.length > 0 && <Button size="sm" variant="outline" alignSelf="flex-start" onClick={addArticle}>Ajouter un article</Button>}
          <Button colorScheme="blue" alignSelf="flex-start" isDisabled={!title.trim() || !articles.length} onClick={importDocument}>Importer</Button>
        </Stack>
      </Box>
      {documents.map((document) => (
        <Box key={document.id}>
          <HStack justify="flex-end" mb={2}>
            <Button size="sm" colorScheme="red" variant="ghost" onClick={async () => {
              if (!window.confirm('Supprimer ce document et ses amendements ?')) return;
              await agAPI.deleteDocument(document.id);
              load();
            }}>Supprimer « {document.title} »</Button>
          </HStack>
          <AgDocumentView document={document} actionProps={{ isDisabled: true }} />
        </Box>
      ))}
    </Stack>
  );
}

function AmendmentsPanel({ onChanged }) {
  const toast = useToast();
  const [amendments, setAmendments] = useState([]);
  const [rejecting, setRejecting] = useState(null);
  const [kind, setKind] = useState('LEGAL');
  const [note, setNote] = useState('');
  const [publishNow, setPublishNow] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await agAPI.listAmendments();
      setAmendments(data?.amendments || []);
    } catch { /* état conservé */ }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const run = async (action, success) => {
    try {
      await action();
      toast({ status: 'success', title: success });
      setRejecting(null);
      setNote('');
      load();
      onChanged?.();
    } catch (error) {
      toast({ status: 'error', title: 'Action impossible', description: error.message });
    }
  };

  // Grouper par document, puis trier par date descendante et auteur
  const grouped = {};
  amendments.forEach((a) => {
    if (!grouped[a.documentTitle]) grouped[a.documentTitle] = [];
    grouped[a.documentTitle].push(a);
  });
  Object.values(grouped).forEach((list) => {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || (a.authorName || '').localeCompare(b.authorName || ''));
  });

  return (
    <Stack spacing={6}>
      {!amendments.length && <Text color="gray.500">Aucun amendement déposé.</Text>}
      {amendments.some((a) => ['ADOPTED', 'REJECTED', 'NOT_ADOPTED'].includes(a.status) && !a.published) && (
        <Button alignSelf="flex-start" size="sm" colorScheme="green" onClick={() => run(() => agAPI.publishAllAmendments(), 'Brouillons publiés')}>Tout publier (effet de séance)</Button>
      )}
      {Object.entries(grouped).map(([docTitle, items]) => (
        <Box key={docTitle}>
          <Heading size="sm" mb={3}>{docTitle}</Heading>
          <Stack spacing={3}>
            {items.map((amendment) => {
              const [label, color] = STATUS_LABELS[amendment.status] || [amendment.status, 'gray'];
              return (
                <Box key={amendment.id} borderWidth="1px" borderRadius="md" p={3} bg="white">
                  <HStack justify="space-between" wrap="wrap" mb={1}>
                    <Text fontWeight="bold">{amendment.articleLabel}</Text>
                    <HStack>
                      <Badge colorScheme={color}>{label}</Badge>
                      {['ADOPTED', 'REJECTED', 'NOT_ADOPTED'].includes(amendment.status) && (
                        <Badge colorScheme={amendment.published ? 'green' : 'orange'}>{amendment.published ? 'Publié' : 'Brouillon'}</Badge>
                      )}
                    </HStack>
                  </HStack>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    {amendment.authorName && <strong>{amendment.authorName}</strong>} · {new Date(amendment.createdAt).toLocaleString('fr-FR')} · {AMENDMENT_REASON_LABELS[amendment.reason] || amendment.reason}
                  </Text>
                  <Text mt={2} whiteSpace="pre-wrap" fontSize="sm">{amendment.proposedText}</Text>
                  {amendment.justification && <Text mt={1} fontSize="sm" fontStyle="italic" color="gray.700">{amendment.justification}</Text>}
                  {amendment.rejectionKind && (
                    <Text mt={1} fontSize="sm" color="red.700">
                      {REJECTION_KIND_LABELS[amendment.rejectionKind]}{amendment.rejectionNote ? ` : ${amendment.rejectionNote}` : ''}
                    </Text>
                  )}
                  {amendment.vote && <Text mt={1} fontSize="sm">Vote : {amendment.vote.pour} pour · {amendment.vote.contre} contre</Text>}
                  {['ADOPTED', 'REJECTED', 'NOT_ADOPTED'].includes(amendment.status) && (
                    <Button mt={2} size="xs" colorScheme={amendment.published ? 'gray' : 'green'} onClick={() => run(() => agAPI.publishAmendment(amendment.id, !amendment.published), amendment.published ? 'Décision dépubliée' : 'Décision publiée')}>
                      {amendment.published ? 'Dépublier' : 'Publier'}
                    </Button>
                  )}
                  {amendment.status === 'SUBMITTED' && (
                    rejecting === amendment.id ? (
                      <Stack mt={3} spacing={2}>
                        <Select size="sm" value={kind} onChange={(event) => setKind(event.target.value)}>
                          <option value="LEGAL">Motif légal</option>
                          <option value="STATUTAIRE">Motif statutaire</option>
                          <option value="ILLISIBLE">Amendement illisible / incompréhensible</option>
                          <option value="AUTRE">Autre motif</option>
                        </Select>
                        <Input size="sm" placeholder="Précision (optionnel)" value={note} onChange={(event) => setNote(event.target.value)} />
                        <Checkbox size="sm" isChecked={publishNow} onChange={(event) => setPublishNow(event.target.checked)}>Publier immédiatement (sinon brouillon)</Checkbox>
                        <HStack>
                          <Button size="sm" colorScheme="red" onClick={() => run(() => agAPI.rejectAmendment(amendment.id, { kind, note, publish: publishNow }), 'Amendement rejeté')}>Confirmer le rejet</Button>
                          <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>Annuler</Button>
                        </HStack>
                      </Stack>
                    ) : (
                      <HStack mt={3}>
                        <Button size="sm" colorScheme="purple" onClick={() => run(() => agAPI.amendmentToVote(amendment.id), 'Scrutin créé (onglet Scrutins)')}>Passer en vote</Button>
                        <Button size="sm" colorScheme="red" variant="outline" onClick={() => setRejecting(amendment.id)}>Rejeter</Button>
                      </HStack>
                    )
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function PollsPanel({ refreshKey }) {
  const toast = useToast();
  const [data, setData] = useState({ polls: [], attendees: 0 });
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    try {
      const next = await agAPI.listPolls();
      if (next) setData(next);
    } catch { /* état conservé */ }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load, refreshKey]);

  const run = async (action) => {
    try {
      await action();
      load();
    } catch (error) {
      toast({ status: 'error', title: 'Action impossible', description: error.message });
    }
  };

  return (
    <Stack spacing={4}>
      <HStack>
        <Input placeholder="Nouveau scrutin (ex. Approbation du rapport moral)" value={title} onChange={(event) => setTitle(event.target.value)} />
        <Button colorScheme="blue" isDisabled={!title.trim()} onClick={() => run(async () => { await agAPI.createPoll(title); setTitle(''); })}>Créer</Button>
      </HStack>
      {!data.polls.length && <Text color="gray.500">Aucun scrutin.</Text>}
      {data.polls.map((poll) => {
        const closed = poll.status === 'CLOSED';
        const adopted = poll.verdict === 'ADOPTED';
        return (
          <Box key={poll.id} borderWidth="2px" borderRadius="lg" p={4} bg={closed ? (adopted ? 'green.50' : 'red.50') : 'white'} borderColor={closed ? (adopted ? 'green.300' : 'red.300') : 'gray.200'}>
            <HStack justify="space-between" wrap="wrap">
              <Text fontWeight="bold">{poll.title}</Text>
              <Badge colorScheme={poll.status === 'OPEN' ? 'green' : closed ? 'gray' : 'blue'}>
                {poll.status === 'OPEN' ? 'Ouvert' : closed ? 'Clos' : 'Non ouvert'}
              </Badge>
            </HStack>
            {poll.status !== 'DRAFT' && (
              <Text mt={2} fontSize="lg">
                <strong>{poll.pour}</strong> pour · <strong>{poll.contre}</strong> contre · {poll.total}/{data.attendees} présents ont voté
              </Text>
            )}
            {closed && <Heading size="md" mt={2} color={adopted ? 'green.700' : 'red.700'}>{adopted ? 'ADOPTÉ' : 'NON ADOPTÉ'}</Heading>}
            {closed && (
              <Stack mt={2} fontSize="sm" spacing={1}>
                <Text><strong>Pour :</strong> {poll.voters.POUR.join(', ') || '—'}</Text>
                <Text><strong>Contre :</strong> {poll.voters.CONTRE.join(', ') || '—'}</Text>
              </Stack>
            )}
            <HStack mt={3}>
              {poll.status === 'DRAFT' && <Button size="sm" colorScheme="green" onClick={() => run(() => agAPI.openPoll(poll.id))}>Mettre à disposition</Button>}
              {poll.status === 'DRAFT' && <Button size="sm" variant="ghost" colorScheme="red" onClick={() => run(() => agAPI.deletePoll(poll.id))}>Supprimer</Button>}
              {poll.status === 'OPEN' && <Button size="sm" colorScheme="orange" onClick={() => run(() => agAPI.closePoll(poll.id))}>Clôturer le scrutin</Button>}
            </HStack>
          </Box>
        );
      })}
    </Stack>
  );
}

function CreateSession({ reload }) {
  const toast = useToast();
  const [title, setTitle] = useState('Assemblée générale');
  const [meetingDate, setMeetingDate] = useState('2027-01-10');

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
      <Stack spacing={3}>
        <Heading size="sm">Créer la session d'assemblée générale</Heading>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        <Input type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} />
        <Button colorScheme="blue" alignSelf="flex-start" isDisabled={!title.trim()} onClick={async () => {
          try {
            await agAPI.createSession({ title, meetingDate });
            reload();
          } catch (error) {
            toast({ status: 'error', title: 'Création impossible', description: error.message });
          }
        }}>Créer</Button>
      </Stack>
    </Box>
  );
}

export default function AgPresident() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [section, setSection] = useState('session');

  const reload = useCallback(async () => {
    try {
      setData(await agAPI.getSession());
      setError('');
    } catch (err) {
      setError(err.message || 'Chargement impossible');
    }
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 8000);
    return () => clearInterval(timer);
  }, [reload]);

  return (
    <AgLayout subtitle="Espace président de séance" groups={SECTIONS} active={section} onSelect={setSection} badge={data?.session?.modeActive ? 'Mode AG actif' : undefined}>
      {error && <Alert status="error" mb={4}><AlertIcon />{error}</Alert>}
      {data && !data.session && <CreateSession reload={reload} />}
      {data?.session && (
        <Box maxW="4xl">
          {section === 'session' && <SessionPanel data={data} reload={reload} />}
          {section === 'documents' && <DocumentsPanel />}
          {section === 'amendments' && <AmendmentsPanel onChanged={() => setRefreshKey((key) => key + 1)} />}
          {section === 'polls' && <PollsPanel refreshKey={refreshKey} />}
        </Box>
      )}
    </AgLayout>
  );
}
