import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Spinner,
  Text,
  useColorModeValue,
  useToast,
  VStack
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiArchive, FiBook, FiCalendar, FiCheckCircle, FiChevronRight, FiClipboard, FiClock, FiFolder, FiRefreshCw, FiSend, FiVideo, FiXCircle } from 'react-icons/fi';
import SidebarLayout from '../components/SidebarLayout';
import { useSidebar } from '../context/SidebarContext';
import { useUser } from '../context/UserContext';
import { retroStudioApi } from '../api/retrostudio';

const initialRequest = {
  contactDate: new Date().toISOString().split('T')[0],
  contactName: '',
  contactRole: '',
  productionCompany: '',
  audiovisualProject: '',
  shootDate: ''
};

const parseLocalDate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function RetroStudio() {
  const toast = useToast();
  const { closeOnMobile } = useSidebar();
  const { user } = useUser();
  const [request, setRequest] = useState(initialRequest);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [activeSection, setActiveSection] = useState('request');
  const [savingRequest, setSavingRequest] = useState(false);
  const [ongoingRequests, setOngoingRequests] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headingColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const isGaelle = String(user?.email || '').trim().toLowerCase() === 'g.champenois@retrobus-essonne.fr';

  const loadOngoingRequests = async () => {
    try {
      setLoadingOngoing(true);
      const requests = await retroStudioApi.getOngoingRequests();
      setOngoingRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      toast({ title: 'Chargement impossible', description: error.message, status: 'error', duration: 4000, isClosable: true });
    } finally {
      setLoadingOngoing(false);
    }
  };

  const loadPendingRequests = async () => {
    if (!isGaelle) return;
    try {
      setLoadingPending(true);
      const requests = await retroStudioApi.getPendingValidations();
      setPendingRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      toast({ title: 'Chargement impossible', description: error.message, status: 'error', duration: 4000, isClosable: true });
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    loadPendingRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGaelle]);

  useEffect(() => {
    loadOngoingRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistRequest = async (saveAsDraft) => {
    try {
      setSavingRequest(true);
      const requestPayload = { ...request, saveAsDraft };
      const createdRequest = editingRequestId
        ? await retroStudioApi.updateRequest(editingRequestId, requestPayload)
        : await retroStudioApi.createRequest(requestPayload);
      const requiresValidation = createdRequest?.validationRequired;
      toast({
        title: saveAsDraft ? 'Brouillon enregistré' : requiresValidation ? 'Validation présidentielle requise' : 'Premier jalon enregistré',
        description: saveAsDraft
          ? 'Le dossier peut être repris à tout moment depuis les demandes en cours.'
          : requiresValidation
          ? 'Gaëlle Champenois a reçu une notification dans son espace RétroBus.'
          : 'Le dossier de mise à disposition est prêt à être complété.',
        status: saveAsDraft ? 'info' : requiresValidation ? 'warning' : 'success',
        duration: 5000,
        isClosable: true
      });
      setRequest(initialRequest);
      setEditingRequestId(null);
      loadOngoingRequests();
      if (isGaelle) loadPendingRequests();
    } catch (error) {
      toast({ title: 'Enregistrement impossible', description: error.message, status: 'error', duration: 5000, isClosable: true });
    } finally {
      setSavingRequest(false);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    await persistRequest(false);
  };

  const resumeDraft = (draft) => {
    setRequest({
      contactDate: draft.contactDate ? draft.contactDate.slice(0, 10) : '',
      contactName: draft.contactName || '',
      contactRole: draft.contactRole || '',
      productionCompany: draft.productionCompany || '',
      audiovisualProject: draft.audiovisualProject || '',
      shootDate: draft.shootDate ? draft.shootDate.slice(0, 10) : ''
    });
    setEditingRequestId(draft.id);
    setActiveSection('request');
  };

  const validateRequest = async (requestId, decision) => {
    try {
      setProcessingRequestId(requestId);
      await retroStudioApi.validateRequest(requestId, decision);
      setPendingRequests((requests) => requests.filter((item) => item.id !== requestId));
      loadOngoingRequests();
      toast({
        title: decision === 'APPROVED' ? 'Dossier validé' : 'Dossier refusé',
        status: decision === 'APPROVED' ? 'success' : 'warning',
        duration: 4000,
        isClosable: true
      });
    } catch (error) {
      toast({ title: 'Décision impossible', description: error.message, status: 'error', duration: 5000, isClosable: true });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const contactDate = parseLocalDate(request.contactDate);
  const shootDate = parseLocalDate(request.shootDate);
  const daysUntilShoot = contactDate && shootDate
    ? Math.round((shootDate - contactDate) / (1000 * 60 * 60 * 24))
    : null;

  const sections = [
    { id: 'request', label: 'Saisie de demande', description: 'Nouveau besoin', icon: FiClipboard },
    { id: 'ongoing', label: 'Demandes en cours', description: 'Suivi des dossiers', icon: FiClock },
    { id: 'resources', label: 'RetroStudio Ressourcery', description: 'Médias et références', icon: FiFolder },
    { id: 'procedure', label: 'Procédure associée', description: 'Circuit de production', icon: FiBook }
  ];

  const sidebarContent = (
    <VStack align="stretch" spacing={0} w="full" h="full">
      <Box p={6} borderBottom="1px" borderColor={borderColor}>
        <HStack spacing={3} mb={3}>
          <Icon as={FiVideo} color="red.500" boxSize={6} />
          <Box>
            <Text fontSize="md" fontWeight="700" color={headingColor}>RetroStudio</Text>
            <Text fontSize="sm" color={mutedColor}>Coordination audiovisuelle</Text>
          </Box>
        </HStack>
        <Text fontSize="xs" color={mutedColor}>MyRBE Workspace</Text>
      </Box>

      <VStack align="stretch" spacing={1} px={3} py={4} flex={1}>
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <Button
              key={section.id}
              leftIcon={<Icon as={section.icon} />}
              variant="ghost"
              justifyContent="flex-start"
              w="full"
              bg={isActive ? 'red.50' : 'transparent'}
              borderLeft="3px"
              borderColor={isActive ? 'red.500' : 'transparent'}
              borderRadius={0}
              px={4}
              py={6}
              fontSize="sm"
              fontWeight={isActive ? '600' : '500'}
              color={isActive ? 'red.600' : 'inherit'}
              _hover={{ bg: 'gray.100', borderLeftColor: 'red.500' }}
              onClick={() => {
                setActiveSection(section.id);
                closeOnMobile();
              }}
            >
              <Box textAlign="left">
                <Text>{section.label}</Text>
                <Text fontSize="xs" color="gray.500">{section.description}</Text>
              </Box>
            </Button>
          );
        })}
      </VStack>

      <Box p={4} borderTop="1px" borderColor={borderColor} fontSize="xs" color={mutedColor} textAlign="center">
        MyRBE RetroStudio
      </Box>
    </VStack>
  );

  const renderContent = () => {
    if (activeSection === 'request') {
      return (
        <VStack as="form" spacing={5} align="stretch" onSubmit={submitRequest}>
          <Breadcrumb separator={<FiChevronRight color="gray.500" />} fontSize="sm">
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink fontWeight="600" color="red.600">Prise de contact</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink color="gray.500">Qualification</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink color="gray.500">Validation</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink color="gray.500">Préparation du bus</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          <Box>
            <Text fontWeight="600">{editingRequestId ? 'Reprise du brouillon' : 'Premier fil Ariane : prise de contact'}</Text>
            <Text color="gray.600" fontSize="sm">
              Enregistrez la demande reçue pour la mise à disposition d'un bus auprès d'une production audiovisuelle, ou conservez-la en brouillon dès la première information.
            </Text>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel>Date de prise de contact</FormLabel>
              <Input type="date" value={request.contactDate} onChange={(event) => setRequest({ ...request, contactDate: event.target.value })} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Date de tournage</FormLabel>
              <Input type="date" value={request.shootDate} onChange={(event) => setRequest({ ...request, shootDate: event.target.value })} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Nom et prénom du contact</FormLabel>
              <Input placeholder="Ex. Camille Martin" value={request.contactName} onChange={(event) => setRequest({ ...request, contactName: event.target.value })} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Rôle du contact</FormLabel>
              <Input placeholder="Ex. Régisseur général" value={request.contactRole} onChange={(event) => setRequest({ ...request, contactRole: event.target.value })} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Boîte de production</FormLabel>
              <Input placeholder="Ex. Studio 91 Productions" value={request.productionCompany} onChange={(event) => setRequest({ ...request, productionCompany: event.target.value })} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Projet audiovisuel</FormLabel>
              <Input placeholder="Ex. Série documentaire Ligne 91" value={request.audiovisualProject} onChange={(event) => setRequest({ ...request, audiovisualProject: event.target.value })} />
            </FormControl>
          </SimpleGrid>

          {daysUntilShoot !== null && (
            <Box
              borderWidth="1px"
              borderColor={daysUntilShoot <= 15 ? 'red.300' : 'green.300'}
              bg={daysUntilShoot <= 15 ? 'red.50' : 'green.50'}
              p={4}
              borderRadius="md"
            >
              <HStack align="start" spacing={3}>
                <Icon as={daysUntilShoot <= 15 ? FiXCircle : FiCheckCircle} boxSize={5} color={daysUntilShoot <= 15 ? 'red.500' : 'green.500'} mt={1} />
                <Box>
                  <Text fontWeight="600">Délai avant tournage : {daysUntilShoot} jour{Math.abs(daysUntilShoot) > 1 ? 's' : ''}</Text>
                  <Text color={daysUntilShoot <= 15 ? 'red.700' : 'green.700'}>
                    {daysUntilShoot <= 15
                      ? `C'est tendu... ce tournage se déroulera à pile ou moins de 15 jours de la deadline (${daysUntilShoot} jours). Informer les Présidents pour la marche à suivre.`
                      : `C'est ok, on a le temps de se préparer (${daysUntilShoot} jours).`}
                  </Text>
                </Box>
              </HStack>
            </Box>
          )}

          <HStack justify="flex-end">
            <Button type="button" variant="outline" leftIcon={<FiArchive />} onClick={() => persistRequest(true)} isLoading={savingRequest}>
              Enregistrer le brouillon
            </Button>
            <Button type="submit" colorScheme="red" leftIcon={<FiSend />} isLoading={savingRequest} loadingText="Enregistrement">
              Enregistrer la prise de contact
            </Button>
          </HStack>
        </VStack>
      );
    }

    if (activeSection === 'ongoing') {
      return (
        <VStack spacing={5} align="stretch">
          <HStack justify="space-between" align="start" spacing={4} wrap="wrap">
            <Box>
              <Text fontWeight="600">Demandes en cours</Text>
              <Text color="gray.600" fontSize="sm">Suivi de tous les dossiers RetroStudio non clôturés.</Text>
            </Box>
            <Button data-no-full-width size="sm" variant="outline" leftIcon={<FiRefreshCw />} onClick={loadOngoingRequests} isLoading={loadingOngoing}>
              Actualiser
            </Button>
          </HStack>
          <OngoingRequestsPanel requests={ongoingRequests} loading={loadingOngoing} onResume={resumeDraft} />
          {isGaelle && (
            <ValidationPanel
              requests={pendingRequests}
              loading={loadingPending}
              processingRequestId={processingRequestId}
              onRefresh={loadPendingRequests}
              onDecision={validateRequest}
            />
          )}
        </VStack>
      );
    }

    if (activeSection === 'resources') {
      return (
        <VStack spacing={5} align="stretch">
          <Text color="gray.600">Ressources de référence pour préparer, produire et archiver les contenus RetroStudio.</Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            <ResourceCard bg={cardBg} icon={FiFolder} title="Médias" description="Photos, vidéos, rushes et éléments graphiques à organiser." color="red.500" />
            <ResourceCard bg={cardBg} icon={FiBook} title="Guides" description="Chartes, formats, droits à l'image et règles de diffusion." color="orange.500" />
            <ResourceCard bg={cardBg} icon={FiArchive} title="Archives" description="Productions finalisées et contenus de référence de l'association." color="gray.600" />
          </SimpleGrid>
          <HStack justify="flex-end">
            <Button as={RouterLink} to="/myrbe/lumistudio" colorScheme="orange" leftIcon={<FiVideo />}>Ouvrir Lumistudio</Button>
          </HStack>
        </VStack>
      );
    }

    return (
      <VStack spacing={5} align="stretch">
        <HStack justify="space-between" align="start">
          <Box>
            <Text fontWeight="semibold">Circuit de production</Text>
            <Text color="gray.600" fontSize="sm">Référence à suivre pour toute demande audiovisuelle.</Text>
          </Box>
          <Badge colorScheme="red">RetroStudio</Badge>
        </HStack>
        <Accordion allowToggle defaultIndex={[0]}>
          <ProcedureStep title="1. Déposer la demande">Renseignez le besoin, la date souhaitée et le résultat attendu dans la section de saisie.</ProcedureStep>
          <ProcedureStep title="2. Valider le périmètre">Confirmez la disponibilité, les droits à l'image, le lieu et les intervenants avant la production.</ProcedureStep>
          <ProcedureStep title="3. Planifier et produire">Créez l'événement de tournage, réalisez la captation puis centralisez les médias dans RetroStudio.</ProcedureStep>
          <ProcedureStep title="4. Diffuser et archiver">Faites valider le livrable, choisissez le canal de diffusion et archivez la version finale avec ses sources.</ProcedureStep>
        </Accordion>
        <HStack justify="flex-end">
          <Button as={RouterLink} to="/dashboard/events-management" variant="outline" leftIcon={<FiCalendar />}>Accéder au planning</Button>
        </HStack>
      </VStack>
    );
  };

  const activeMetadata = sections.find((section) => section.id === activeSection);

  return (
    <SidebarLayout sidebar={sidebarContent}>
      <VStack align="stretch" spacing={0} h="full" w="full">
        <Box p={{ base: 4, md: 6 }} borderBottom="1px" borderColor={borderColor} bg={cardBg}>
          <HStack justify="space-between" align="start" spacing={4} wrap="wrap">
            <Box>
              <Text fontSize="xs" fontWeight="600" color="red.500">MYRBE / RETROSTUDIO</Text>
              <Text fontSize="xl" fontWeight="700" color={headingColor}>{activeMetadata.label}</Text>
              <Text color={mutedColor}>{activeMetadata.description}</Text>
            </Box>
            <Button as={RouterLink} to="/dashboard/myrbe" variant="outline" size="sm">Retour à MyRBE</Button>
          </HStack>
        </Box>
        <Box flex={1} overflowY="auto" p={{ base: 4, md: 6 }}>
          {renderContent()}
        </Box>
      </VStack>
    </SidebarLayout>
  );
}

function ResourceCard({ bg, icon, title, description, color }) {
  return (
    <Card bg={bg} borderWidth="1px" _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }} transition="all 0.2s">
      <CardBody>
        <HStack align="start" spacing={3}>
          <Icon as={icon} boxSize={5} color={color} mt={1} />
          <Box>
            <Text fontWeight="semibold">{title}</Text>
            <Text fontSize="sm" color="gray.600">{description}</Text>
          </Box>
        </HStack>
      </CardBody>
    </Card>
  );
}

function ProcedureStep({ title, children }) {
  return (
    <AccordionItem>
      <AccordionButton py={4}>
        <Box flex="1" textAlign="left" fontWeight="semibold">{title}</Box>
        <AccordionIcon />
      </AccordionButton>
      <AccordionPanel pb={4} color="gray.600">{children}</AccordionPanel>
    </AccordionItem>
  );
}

function ValidationPanel({ requests, loading, processingRequestId, onRefresh, onDecision }) {
  return (
    <Box borderWidth="1px" borderColor="orange.300" bg="orange.50" p={4} borderRadius="md">
      <HStack justify="space-between" align="start" mb={4} wrap="wrap">
        <Box>
          <Text fontWeight="700">Validations présidentielles</Text>
          <Text fontSize="sm" color="orange.800">Les dossiers à délai court attendent votre décision.</Text>
        </Box>
        <Button data-no-full-width size="sm" variant="outline" colorScheme="orange" leftIcon={<FiRefreshCw />} onClick={onRefresh} isLoading={loading}>
          Actualiser
        </Button>
      </HStack>

      {loading ? (
        <HStack justify="center" py={4}><Spinner size="sm" /><Text fontSize="sm">Chargement des dossiers...</Text></HStack>
      ) : requests.length === 0 ? (
        <Text fontSize="sm" color="gray.600">Aucun dossier RetroStudio en attente de validation.</Text>
      ) : (
        <VStack align="stretch" spacing={3}>
          {requests.map((request) => (
            <Box key={request.id} bg="white" borderWidth="1px" borderColor="orange.200" p={4} borderRadius="md">
              <HStack justify="space-between" align="start" spacing={3} wrap="wrap">
                <Box>
                  <Text fontWeight="600">{request.audiovisualProject}</Text>
                  <Text fontSize="sm" color="gray.600">{request.productionCompany} - {request.contactName}, {request.contactRole}</Text>
                  <Text fontSize="sm" color="gray.600">Tournage : {new Date(request.shootDate).toLocaleDateString('fr-FR')} ({request.leadTimeDays} jours)</Text>
                </Box>
                <HStack>
                  <Button data-no-full-width size="sm" colorScheme="green" onClick={() => onDecision(request.id, 'APPROVED')} isLoading={processingRequestId === request.id}>
                    Valider
                  </Button>
                  <Button data-no-full-width size="sm" colorScheme="red" variant="outline" onClick={() => onDecision(request.id, 'REJECTED')} isLoading={processingRequestId === request.id}>
                    Refuser
                  </Button>
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}

function OngoingRequestsPanel({ requests, loading, onResume }) {
  if (loading) {
    return <HStack justify="center" py={8}><Spinner size="sm" /><Text fontSize="sm">Chargement des demandes...</Text></HStack>;
  }

  if (requests.length === 0) {
    return <Text fontSize="sm" color="gray.600">Aucune demande RetroStudio en cours.</Text>;
  }

  return (
    <VStack align="stretch" spacing={3}>
      {requests.map((request) => {
        const status = getRequestStatus(request.status);
        return (
          <Box key={request.id} bg="white" borderWidth="1px" borderColor={status.borderColor} p={4} borderRadius="md">
            <HStack justify="space-between" align="start" spacing={3} wrap="wrap">
              <Box>
                <HStack mb={1} wrap="wrap">
                  <Text fontWeight="600">{request.audiovisualProject}</Text>
                  <Badge colorScheme={status.colorScheme}>{status.label}</Badge>
                </HStack>
                <Text fontSize="sm" color="gray.600">{request.productionCompany} - {request.contactName}, {request.contactRole}</Text>
                <Text fontSize="sm" color="gray.600">Tournage : {new Date(request.shootDate).toLocaleDateString('fr-FR')} ({request.leadTimeDays} jours)</Text>
              </Box>
              {request.validationRequired && (
                <Text fontSize="sm" fontWeight="600" color={request.status === 'PENDING_VALIDATION' ? 'orange.700' : 'green.700'}>
                  {request.status === 'PENDING_VALIDATION' ? 'Validation présidentielle requise' : 'Validation présidentielle obtenue'}
                </Text>
              )}
              {request.status === 'DRAFT' && (
                <Button data-no-full-width size="sm" colorScheme="blue" variant="outline" onClick={() => onResume(request)}>
                  Reprendre
                </Button>
              )}
            </HStack>
          </Box>
        );
      })}
    </VStack>
  );
}

function getRequestStatus(status) {
  if (status === 'DRAFT') {
    return { label: 'Brouillon', colorScheme: 'gray', borderColor: 'gray.300' };
  }
  if (status === 'PENDING_VALIDATION') {
    return { label: 'En attente de validation', colorScheme: 'orange', borderColor: 'orange.300' };
  }
  if (status === 'APPROVED') {
    return { label: 'Validée', colorScheme: 'green', borderColor: 'green.200' };
  }
  return { label: 'Enregistrée', colorScheme: 'blue', borderColor: 'gray.200' };
}