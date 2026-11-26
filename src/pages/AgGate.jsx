import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertIcon, Badge, Box, Button, Center, Heading, HStack, Input, Stack, Text, VStack } from '@chakra-ui/react';
import { agAPI, AMENDMENT_REASON_LABELS } from '../api/ag.js';
import useAgStatus from '../hooks/useAgStatus.js';

function VotePage({ onBack, onChanged }) {
  const [polls, setPolls] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    try {
      const data = await agAPI.openPolls();
      setPolls(data?.polls || []);
    } catch { /* prochaine itération */ }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, []);

  const vote = async (poll, choice) => {
    setBusyId(poll.id);
    setError('');
    try {
      const result = await agAPI.vote(poll.id, choice);
      setPolls((current) => current.map((item) => (item.id === poll.id ? { ...item, myChoice: result?.choice || choice } : item)));
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Le vote n\'a pas pu être enregistré, réessayez.');
    } finally {
      setBusyId('');
    }
  };

  const pending = polls.filter((poll) => !poll.myChoice);
  const done = polls.filter((poll) => poll.myChoice);

  return (
    <VStack align="stretch" spacing={4} maxW="640px" mx="auto" p={4}>
      <HStack justify="space-between">
        <Heading size="md">À vos votes !</Heading>
        <Button size="sm" variant="ghost" onClick={onBack}>Retour</Button>
      </HStack>
      {error && <Alert status="error"><AlertIcon />{error}</Alert>}
      {!polls.length && <Text color="gray.500">Aucun scrutin ouvert pour le moment.</Text>}
      {[...pending, ...done].map((poll) => (
        <Box key={poll.id} borderWidth="1px" borderRadius="lg" p={4} bg="white">
          <Stack spacing={2}>
            <Heading size="sm">{poll.title}</Heading>
            {poll.amendment && (
              <Box fontSize="sm" color="gray.700">
                <Badge mr={2}>{AMENDMENT_REASON_LABELS[poll.amendment.reason] || poll.amendment.reason}</Badge>
                <Text mt={2} whiteSpace="pre-wrap">{poll.amendment.proposedText}</Text>
                {poll.amendment.justification && <Text mt={1} fontStyle="italic">{poll.amendment.justification}</Text>}
              </Box>
            )}
            {poll.myChoice ? (
              <Badge colorScheme="green" alignSelf="flex-start" p={1}>Vote enregistré : {poll.myChoice === 'POUR' ? 'Pour' : 'Contre'}</Badge>
            ) : (
              <HStack spacing={3}>
                <Button colorScheme="green" flex={1} isLoading={busyId === poll.id} onClick={() => vote(poll, 'POUR')}>Pour</Button>
                <Button colorScheme="red" flex={1} isLoading={busyId === poll.id} onClick={() => vote(poll, 'CONTRE')}>Contre</Button>
              </HStack>
            )}
          </Stack>
        </Box>
      ))}
    </VStack>
  );
}

export function AgJoinPage() {
  const { status, refresh } = useAgStatus(true);
  return <AgGate status={status} refresh={refresh} />;
}

export default function AgGate({ status, refresh }) {
  const [params] = useSearchParams();
  const [code, setCode] = useState((params.get('code') || '').toUpperCase());
  const [error, setError] = useState('');
  const [voting, setVoting] = useState(false);
  const autoTried = useRef(false);

  const join = async (value) => {
    setError('');
    try {
      await agAPI.join(value);
      await refresh?.();
    } catch (err) {
      setError(err.message || 'Code de session invalide.');
    }
  };

  useEffect(() => {
    const fromUrl = (params.get('code') || '').trim();
    if (fromUrl && status && !status.joined && !autoTried.current) {
      autoTried.current = true;
      join(fromUrl);
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status?.joined && voting) {
    return <VotePage onBack={() => setVoting(false)} onChanged={refresh} />;
  }

  return (
    <Center minH="100vh" bg="gray.50" p={6}>
      <VStack spacing={5} textAlign="center" maxW="480px">
        <Heading size="lg">
          {status?.modeActive ? 'Mode AG Activé, l\'accès à l\'URBEX est suspendu' : 'Assemblée générale'}
        </Heading>
        {status?.session?.title && <Text color="gray.600">{status.session.title}</Text>}

        {status?.excluded && (
          <Alert status="warning"><AlertIcon />Vous ne disposez pas du droit de vote pour cette assemblée.</Alert>
        )}

        {!status?.joined && !status?.excluded && (
          <VStack spacing={3} w="100%">
            <Text>Scannez le QR code de la session ou saisissez son code pour rejoindre l'assemblée.</Text>
            <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Code de session" textAlign="center" textTransform="uppercase" />
            <Button colorScheme="blue" w="100%" isDisabled={!code.trim()} onClick={() => join(code.trim())}>Rejoindre</Button>
          </VStack>
        )}

        {status?.joined && !status.excluded && (
          status.openPolls > 0 ? (
            <Button colorScheme="green" size="lg" w="100%" onClick={() => setVoting(true)}>
              À vos votes !{status.pendingPolls > 0 ? ` (${status.pendingPolls})` : ''}
            </Button>
          ) : (
            <Text color="gray.600">Vous êtes connecté à la session. En attente de l'ouverture d'un scrutin…</Text>
          )
        )}

        {error && <Alert status="error"><AlertIcon />{error}</Alert>}
      </VStack>
    </Center>
  );
}
