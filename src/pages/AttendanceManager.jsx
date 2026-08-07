import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Stack,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  useDisclosure,
  useToast,
  Badge,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  FormControl,
  FormLabel,
  Textarea,
  Input,
  Select,
} from '@chakra-ui/react';
import PageLayout from '../components/Layout/PageLayout';
import { fetchJson } from '../apiClient';

const RESPONSE_OPTIONS = {
  confirmed: { label: 'Confirmer ma présence', color: 'green', icon: '✓' },
  declined: { label: 'Refuser', color: 'red', icon: '✗' },
  proposed_reschedule: { label: 'Proposer un report', color: 'orange', icon: '📅' },
};

export default function AttendanceManager() {
  const toast = useToast();
  const { isOpen: isResponseOpen, onOpen: onResponseOpen, onClose: onResponseClose } = useDisclosure();
  
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [responseType, setResponseType] = useState('confirmed');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      // Pour les prestataires/invités externes, on va chercher les événements
      // Ici on simule en attente du vrai endpoint
      const response = await fetchJson('/api/planning/my-invitations');
      
      if (Array.isArray(response)) {
        setInvitations(response);
      } else {
        setInvitations([]);
      }
    } catch (error) {
      console.error('Erreur chargement invitations:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les invitations',
        status: 'error',
        duration: 3,
      });
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResponse = (invitation) => {
    setSelectedInvitation(invitation);
    setResponseType('confirmed');
    setRescheduleDate('');
    setRescheduleReason('');
    onResponseOpen();
  };

  const handleSubmitResponse = async () => {
    if (!selectedInvitation) return;

    try {
      setSubmitting(true);

      const responseData = {
        participantId: selectedInvitation.participantId,
        status: responseType,
        rescheduleProposal: responseType === 'proposed_reschedule' ? rescheduleDate : null,
        rescheduleReason: responseType === 'proposed_reschedule' ? rescheduleReason : null,
      };

      const result = await fetchJson(
        `/api/planning/respond-invitation/${selectedInvitation.planningId}/${selectedInvitation.participantId}`,
        {
          method: 'POST',
          body: JSON.stringify(responseData),
        }
      );

      if (result.success) {
        toast({
          title: 'Succès',
          description: `Votre réponse a été enregistrée: ${RESPONSE_OPTIONS[responseType].label}`,
          status: 'success',
          duration: 3,
        });
        
        // Marquer comme répondu
        setInvitations(prev =>
          prev.map(inv =>
            inv.participantId === selectedInvitation.participantId
              ? { ...inv, status: responseType }
              : inv
          )
        );
        
        onResponseClose();
      } else {
        throw new Error(result.error || 'Erreur lors de la soumission');
      }
    } catch (error) {
      console.error('Erreur réponse:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de soumettre votre réponse',
        status: 'error',
        duration: 3,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'yellow',
      confirmed: 'green',
      declined: 'red',
      proposed_reschedule: 'orange',
    };
    return colors[status] || 'gray';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'En attente de réponse',
      confirmed: 'Confirmé',
      declined: 'Refusé',
      proposed_reschedule: 'Report proposé',
    };
    return labels[status] || status;
  };

  return (
    <PageLayout>
      <Container maxW="container.lg" py={8}>
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="lg" mb={2}>📅 Mes Invitations</Heading>
            <Text color="gray.600">
              Vous avez {invitations.length} invitation{invitations.length !== 1 ? 's' : ''}
            </Text>
          </Box>

          {loading ? (
            <Text>Chargement...</Text>
          ) : invitations.length === 0 ? (
            <Card>
              <CardBody>
                <Text textAlign="center" color="gray.500">
                  Vous n'avez pas d'invitations en attente
                </Text>
              </CardBody>
            </Card>
          ) : (
            <VStack spacing={4}>
              {invitations.map(invitation => (
                <Card key={invitation.participantId} w="full">
                  <CardBody>
                    <VStack align="start" spacing={3} w="full">
                      <Flex w="full" justify="space-between" align="start">
                        <VStack align="start" flex={1} spacing={2}>
                          <Heading size="md">{invitation.eventTitle}</Heading>
                          <Text fontSize="sm" color="gray.600">
                            {invitation.eventType ? `Type: ${invitation.eventType}` : ''}
                          </Text>
                          
                          <HStack spacing={4} fontSize="sm">
                            <Text>
                              📅 {new Date(invitation.eventDate).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </Text>
                            <Text>
                              🕐 {invitation.eventStartTime || 'Heure non définie'}
                            </Text>
                          </HStack>

                          {invitation.eventLocation && (
                            <Text fontSize="sm" color="gray.600">
                              📍 {invitation.eventLocation}
                            </Text>
                          )}

                          {invitation.eventDescription && (
                            <Text fontSize="sm" color="gray.600" noOfLines={2}>
                              {invitation.eventDescription}
                            </Text>
                          )}
                        </VStack>

                        <Badge
                          colorScheme={getStatusColor(invitation.status)}
                          ml={4}
                          textTransform="capitalize"
                        >
                          {getStatusLabel(invitation.status)}
                        </Badge>
                      </Flex>

                      {invitation.status === 'pending' && (
                        <HStack spacing={2} pt={2} borderTop="1px solid" borderColor="gray.200" w="full">
                          <Button
                            size="sm"
                            colorScheme="green"
                            onClick={() => {
                              setSelectedInvitation(invitation);
                              setResponseType('confirmed');
                              onResponseOpen();
                            }}
                          >
                            ✓ Confirmer
                          </Button>
                          <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={() => {
                              setSelectedInvitation(invitation);
                              setResponseType('declined');
                              onResponseOpen();
                            }}
                          >
                            ✗ Refuser
                          </Button>
                          <Button
                            size="sm"
                            colorScheme="orange"
                            variant="outline"
                            onClick={() => {
                              setSelectedInvitation(invitation);
                              setResponseType('proposed_reschedule');
                              onResponseOpen();
                            }}
                          >
                            📅 Reporter
                          </Button>
                        </HStack>
                      )}

                      {invitation.status === 'proposed_reschedule' && invitation.rescheduleProposal && (
                        <Box fontSize="sm" p={2} bg="orange.50" borderRadius="md" w="full">
                          <Text fontWeight="bold" color="orange.700">
                            Report proposé au: {new Date(invitation.rescheduleProposal).toLocaleDateString('fr-FR')}
                          </Text>
                          {invitation.rescheduleReason && (
                            <Text color="orange.700">{invitation.rescheduleReason}</Text>
                          )}
                        </Box>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}
        </VStack>

        {/* Modal de réponse */}
        <Modal isOpen={isResponseOpen} onClose={onResponseClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {selectedInvitation && `Répondre à: ${selectedInvitation.eventTitle}`}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                {responseType === 'proposed_reschedule' && (
                  <>
                    <FormControl isRequired>
                      <FormLabel>Date proposée</FormLabel>
                      <Input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Raison du report</FormLabel>
                      <Textarea
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        placeholder="Expliquez pourquoi vous proposez ce report..."
                        rows={4}
                      />
                    </FormControl>
                  </>
                )}

                {responseType === 'declined' && (
                  <FormControl>
                    <FormLabel>Motif du refus (optionnel)</FormLabel>
                    <Textarea
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Expliquez pourquoi vous refusez cette invitation..."
                      rows={4}
                    />
                  </FormControl>
                )}

                <HStack w="full" pt={4}>
                  <Button
                    flex={1}
                    colorScheme={
                      responseType === 'confirmed'
                        ? 'green'
                        : responseType === 'declined'
                        ? 'red'
                        : 'orange'
                    }
                    isLoading={submitting}
                    onClick={handleSubmitResponse}
                  >
                    {RESPONSE_OPTIONS[responseType].label}
                  </Button>
                  <Button
                    flex={1}
                    variant="outline"
                    onClick={onResponseClose}
                    isDisabled={submitting}
                  >
                    Annuler
                  </Button>
                </HStack>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Container>
    </PageLayout>
  );
}
