import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, AlertDescription, AlertIcon, AlertTitle, Badge, Box, Button, Card,
  CardBody, CardHeader, Divider, FormControl, FormLabel, HStack, Heading,
  Select, SimpleGrid, Spinner, Stat, StatLabel, StatNumber, Text, VStack,
  useToast
} from '@chakra-ui/react';
import { FiKey, FiMail, FiRefreshCw, FiUser } from 'react-icons/fi';
import { fetchWithCSRF } from '../lib/csrfClient';

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Aucune';

export default function RetromailAdministration() {
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [mailboxInfo, setMailboxInfo] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingMailbox, setLoadingMailbox] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const response = await fetchWithCSRF('/api/mail/admin/members');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Impossible de charger les adhérents.');
      setMembers(data.members || []);
    } catch (error) {
      toast({ title: 'Chargement impossible', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadMailboxInfo = async (memberId) => {
    if (!memberId) {
      setMailboxInfo(null);
      return;
    }

    try {
      setLoadingMailbox(true);
      setMailboxInfo(null);
      const response = await fetchWithCSRF(`/api/mail/admin/members/${memberId}/mailbox`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Impossible de consulter la boîte RétroMail.');
      setMailboxInfo(data);
    } catch (error) {
      toast({ title: 'Boîte indisponible', description: error.message, status: 'warning', duration: 5000 });
    } finally {
      setLoadingMailbox(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleMemberChange = (event) => {
    const memberId = event.target.value;
    setSelectedMemberId(memberId);
    loadMailboxInfo(memberId);
  };

  const handleResetPassword = async () => {
    if (!selectedMember || !mailboxInfo?.mailbox?.exists) return;
    const confirmation = window.confirm(
      `Réinitialiser le mot de passe de ${mailboxInfo.mailbox.email} ? Un mot de passe provisoire sera envoyé à ${selectedMember.email}.`
    );
    if (!confirmation) return;

    try {
      setResettingPassword(true);
      const response = await fetchWithCSRF(`/api/mail/admin/members/${selectedMember.id}/reset-password`, {
        method: 'POST'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Réinitialisation impossible.');

      toast({
        title: 'Parcours de réinitialisation lancé',
        description: `Le mot de passe provisoire a été envoyé à ${data.recipientEmail}.`,
        status: 'success',
        duration: 6000
      });
      await loadMailboxInfo(selectedMember.id);
      await loadMembers();
    } catch (error) {
      toast({ title: 'Réinitialisation impossible', description: error.message, status: 'error', duration: 6000 });
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="lg">Administration RétroMail</Heading>
        <Text color="gray.600" mt={1}>Gérez les boîtes des adhérents et leurs réinitialisations de mot de passe.</Text>
      </Box>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Réinitialisation sécurisée</AlertTitle>
          <AlertDescription>
            Un mot de passe provisoire est généré côté serveur et envoyé uniquement à l’adresse personnelle de l’adhérent. À sa connexion RétroMail, il devra définir son propre mot de passe.
          </AlertDescription>
        </Box>
      </Alert>

      <Card>
        <CardBody>
          <FormControl isDisabled={loadingMembers}>
            <FormLabel>Adhérent</FormLabel>
            <HStack align="start">
              <Select
                placeholder={loadingMembers ? 'Chargement des adhérents...' : 'Sélectionnez un adhérent'}
                value={selectedMemberId}
                onChange={handleMemberChange}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id} disabled={!member.hasValidMailboxIdentifier}>
                    {member.lastName} {member.firstName} - {member.mailbox || 'Matricule non compatible'}
                  </option>
                ))}
              </Select>
              <Button aria-label="Actualiser les adhérents" variant="outline" leftIcon={<FiRefreshCw />} onClick={loadMembers}>
                Actualiser
              </Button>
            </HStack>
          </FormControl>
        </CardBody>
      </Card>

      {loadingMailbox && <Spinner alignSelf="center" color="rbe.500" />}

      {selectedMember && !loadingMailbox && mailboxInfo && (
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <HStack>
                <FiMail />
                <Heading size="md">Boîte RétroMail</Heading>
              </HStack>
              <Badge colorScheme={mailboxInfo.mailbox.passwordResetRequired ? 'orange' : 'green'}>
                {mailboxInfo.mailbox.passwordResetRequired ? 'Mot de passe à définir' : 'Active'}
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}>
              <Stat>
                <StatLabel><HStack><FiUser /><Text>Adhérent</Text></HStack></StatLabel>
                <StatNumber fontSize="lg">{selectedMember.firstName} {selectedMember.lastName}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Adresse RétroMail</StatLabel>
                <StatNumber fontSize="lg">{mailboxInfo.mailbox.email}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Adresse personnelle destinataire</StatLabel>
                <StatNumber fontSize="lg">{selectedMember.email}</StatNumber>
              </Stat>
            </SimpleGrid>
            <Divider my={5} />
            <Text fontSize="sm" color="gray.600" mb={4}>
              Dernière réinitialisation : {formatDate(mailboxInfo.mailbox.passwordResetAt)}
            </Text>
            <Button
              colorScheme="rbe"
              leftIcon={<FiKey />}
              onClick={handleResetPassword}
              isLoading={resettingPassword}
              loadingText="Génération et envoi..."
            >
              Lancer la réinitialisation du mot de passe
            </Button>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}