import React, { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, Button, FormControl, FormLabel, Input,
  Select, VStack, SimpleGrid, Textarea, Card, CardHeader, CardBody,
  Heading, useToast, HStack, Switch, Box, Text, Badge, Icon,
  Stepper, Step, StepIndicator, StepStatus, StepIcon, StepNumber,
  StepTitle, StepDescription, StepSeparator, Progress, Alert, AlertIcon,
  RadioGroup, Radio, Stack, Checkbox, useSteps, Divider, useColorModeValue
} from '@chakra-ui/react';
import { FiUser, FiMapPin, FiKey, FiFileText, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { membersAPI } from '../api/members.js';
import { fetchWithCSRF } from '../lib/csrfClient';

const MEMBERSHIP_TYPES = {
  STANDARD: 'Adhésion Standard',
  FAMILY: 'Adhésion Famille',
  STUDENT: 'Adhésion Étudiant',
  HONORARY: 'Membre d\'Honneur',
  BIENFAITEUR: 'Bienfaiteur',
  STAGIAIRE: 'Stagiaire'
};

const MEMBERSHIP_STATUS = {
  PENDING: 'En attente',
  ACTIVE: 'Actif',
  EXPIRED: 'Expiré',
  SUSPENDED: 'Suspendu',
  CANCELLED: 'Annulé'
};

const PAYMENT_METHODS = {
  CASH: 'Espèces',
  CHECK: 'Chèque',
  BANK_TRANSFER: 'Virement',
  CARD: 'Carte bancaire',
  PAYPAL: 'PayPal',
  HELLOASSO: 'HelloAsso'
};

const DIGITAL_FLOW_DRAFT_KEY = 'create_member_pending_flow_v1';

export default function CreateMember({ isOpen, onClose, onMemberCreated }) {
  // Thème Trilogy RBE
  const cardBg = useColorModeValue('white', 'gray.800');
  
  const steps = [
    { title: 'Type', description: 'Profil RH', icon: FiUser },
    { title: 'Identité', description: 'Infos perso', icon: FiUser },
    { title: 'Adresse', description: 'Coordonnées', icon: FiMapPin },
    { title: 'Identifiants', description: 'Matricule', icon: FiKey },
    { title: 'Adhésion', description: 'Cotisation', icon: FiFileText },
    { title: 'Bulletin', description: 'Signature', icon: FiFileText },
    { title: 'Validation', description: 'Récapitulatif', icon: FiCheck }
  ];

  const { activeStep, setActiveStep } = useSteps({
    index: 0,
    count: steps.length
  });

  const [onboardingMode, setOnboardingMode] = useState('import'); // 'import' | 'create'
  const [profileType, setProfileType] = useState('adherent'); // 'adherent' ou 'stagiaire'
  const [formData, setFormData] = useState({
    // Informations personnelles
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    
    // Adresse
    address: '',
    city: '',
    postalCode: '',
    
    // Identifiants adhérent
    matricule: '',
    memberNumber: '',
    
    // Adhésion
    membershipType: 'STANDARD',
    membershipStatus: 'ACTIVE',
    membershipStartDate: new Date().toISOString().split('T')[0],
    membershipEndDate: '',
    
    // Paiement
    paymentAmount: '',
    paymentMethod: 'CASH',
    isExempted: false,
    exemptionReason: '',
    
    // Stage (pour stagiaires)
    internshipStartDate: '',
    internshipEndDate: '',
    internshipType: '',
    supervisor: '',
    
    // Documents
    convention: null,
    exemptionDocument: null,
    
    // Bulletin d'adhésion
    bulletinFile: null,
    signatureMethod: 'paper', // 'paper', 'electronic', 'digital_flow'
    eSignatureProvider: '',
    eSignatureStatus: 'none',
    
    // Parcours numérique
    sendDigitalFlow: true,
    digitalFlowEmail: '',
    digitalFlowPhone: '',
    templateFile: null,
    templateId: '',
    
    // Divers
    notes: '',
    newsletter: true
  });

  const [loading, setLoading] = useState(false);
  const [digitalFlowToken, setDigitalFlowToken] = useState('');
  const [digitalFlowLink, setDigitalFlowLink] = useState('');
  const [digitalFlowStatus, setDigitalFlowStatus] = useState('idle'); // idle | pending | in_progress | signed
  const [digitalFlowSignedAt, setDigitalFlowSignedAt] = useState('');
  const toast = useToast();

  const reset = () => {
    setOnboardingMode('import');
    setProfileType('adherent');
    setActiveStep(0);
    setDigitalFlowToken('');
    setDigitalFlowLink('');
    setDigitalFlowStatus('idle');
    setDigitalFlowSignedAt('');
    setFormData({
      firstName: '', lastName: '', email: '', phone: '', birthDate: '',
      address: '', city: '', postalCode: '',
      matricule: '', memberNumber: '',
      membershipType: 'STANDARD', membershipStatus: 'ACTIVE', 
      membershipStartDate: new Date().toISOString().split('T')[0], membershipEndDate: '',
      paymentAmount: '', paymentMethod: 'CASH', 
      isExempted: false, exemptionReason: '',
      internshipStartDate: '', internshipEndDate: '', internshipType: '', supervisor: '',
      convention: null, exemptionDocument: null,
      bulletinFile: null, signatureMethod: 'paper', eSignatureProvider: '', eSignatureStatus: 'none',
      sendDigitalFlow: true, digitalFlowEmail: '', digitalFlowPhone: '', templateFile: null, templateId: '',
      notes: '', newsletter: true
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(DIGITAL_FLOW_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.token) {
        setOnboardingMode('create');
        setDigitalFlowToken(parsed.token);
        setDigitalFlowLink(parsed.link || '');
        setDigitalFlowStatus(parsed.status || 'pending');
        if (parsed.formData && typeof parsed.formData === 'object') {
          setFormData((prev) => ({ ...prev, ...parsed.formData, signatureMethod: 'digital_flow', sendDigitalFlow: true }));
        }
      }
    } catch {
      // ignore invalid persisted draft
    }
  }, [isOpen]);

  useEffect(() => {
    if (onboardingMode !== 'create') return;
    if (!digitalFlowToken && !formData.firstName && !formData.lastName && !formData.email && !formData.phone) return;

    localStorage.setItem(DIGITAL_FLOW_DRAFT_KEY, JSON.stringify({
      token: digitalFlowToken,
      link: digitalFlowLink,
      status: digitalFlowStatus,
      updatedAt: Date.now(),
      formData: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        birthDate: formData.birthDate,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        digitalFlowEmail: formData.digitalFlowEmail,
        digitalFlowPhone: formData.digitalFlowPhone,
        membershipType: formData.membershipType,
        membershipStatus: formData.membershipStatus,
        membershipStartDate: formData.membershipStartDate,
        membershipEndDate: formData.membershipEndDate,
        paymentAmount: formData.paymentAmount,
        paymentMethod: formData.paymentMethod,
        isExempted: formData.isExempted,
        exemptionReason: formData.exemptionReason,
        notes: formData.notes,
        newsletter: formData.newsletter,
        signatureMethod: 'digital_flow',
        sendDigitalFlow: true
      }
    }));
  }, [onboardingMode, digitalFlowToken, digitalFlowLink, digitalFlowStatus, formData]);

  useEffect(() => {
    if (!isOpen || !digitalFlowToken || onboardingMode !== 'create') return;

    let isCancelled = false;

    const pollFlowStatus = async () => {
      try {
        const response = await fetchWithCSRF(`/api/bulletin-flow/${digitalFlowToken}`);
        if (!response.ok) return;

        const data = await response.json();
        if (isCancelled) return;

        const nextStatus = data?.status || 'pending';
        setDigitalFlowStatus(nextStatus);
        if (data?.signedAt) {
          setDigitalFlowSignedAt(data.signedAt);
        }

        if (data?.memberData && typeof data.memberData === 'object') {
          setFormData((prev) => ({
            ...prev,
            ...data.memberData,
            signatureMethod: 'digital_flow',
            sendDigitalFlow: true
          }));
        }

        localStorage.setItem(DIGITAL_FLOW_DRAFT_KEY, JSON.stringify({
          token: digitalFlowToken,
          link: digitalFlowLink,
          status: nextStatus,
          updatedAt: Date.now()
        }));
      } catch (err) {
        console.error('❌ Erreur polling bulletin-flow:', err);
      }
    };

    pollFlowStatus();
    const interval = setInterval(pollFlowStatus, 5000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [digitalFlowToken, digitalFlowLink, isOpen, onboardingMode]);

  const launchDigitalFlow = async () => {
    const email = (formData.digitalFlowEmail || formData.email || '').trim();
    const phone = (formData.digitalFlowPhone || formData.phone || '').trim();

    try {
      setLoading(true);

      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast({
          title: 'Identite incomplete',
          description: 'Le prenom et le nom sont obligatoires pour envoyer le parcours.',
          status: 'warning',
          duration: 4000
        });
        return false;
      }

      if (!email) {
        toast({
          title: 'Email requis',
          description: 'Le lien doit aussi etre envoye par mail. Veuillez renseigner une adresse email.',
          status: 'warning',
          duration: 4000
        });
        return false;
      }

      const response = await fetchWithCSRF(`/api/bulletin-flow/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            birthDate: formData.birthDate,
            address: formData.address,
            city: formData.city,
            postalCode: formData.postalCode
          },
          sendEmail: !!email,
          sendSMS: !!phone,
          email,
          phone
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        if (response.status === 401) {
          throw new Error('Session expirée. Reconnectez-vous puis réessayez.');
        }
        if (response.status === 403 && (data?.code === 'CSRF_INVALID' || data?.code === 'CSRF_MISSING')) {
          throw new Error('Token CSRF invalide. Rechargez la page et réessayez.');
        }
        throw new Error(data?.error || 'Envoi du parcours impossible');
      }

      setDigitalFlowToken(data.token);
      setDigitalFlowLink(data.link || '');
      setDigitalFlowStatus('pending');

      localStorage.setItem(DIGITAL_FLOW_DRAFT_KEY, JSON.stringify({
        token: data.token,
        link: data.link || '',
        status: 'pending',
        updatedAt: Date.now()
      }));

      const channels = [];
      if (data.emailSent) channels.push('email');
      if (data.smsSent) channels.push('SMS');

      if (channels.length > 0 && (!data.emailRequested || data.emailSent)) {
        toast({
          title: 'Parcours envoye',
          description: `Lien envoye par ${channels.join(' et ')}`,
          status: 'success',
          duration: 5000
        });
      } else if (data.emailRequested && !data.emailSent && data.smsSent) {
        toast({
          title: 'Envoi partiel',
          description: `SMS envoye, mais echec email: ${data.emailError || 'session noreply absente'}`,
          status: 'warning',
          duration: 7000
        });
      } else {
        toast({
          title: 'Parcours cree mais non envoye',
          description: data.emailError || 'Aucun canal d\'envoi actif (email/SMS). Le lien est disponible dans la fiche en attente.',
          status: 'warning',
          duration: 7000
        });
      }

      return true;
    } catch (error) {
      toast({
        title: 'Envoi du lien impossible',
        description: error?.message || 'Une erreur est survenue lors de l\'envoi du lien.',
        status: 'error',
        duration: 7000
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step) => {
    switch(step) {
      case 0: // Type de profil
        return true;
      case 1: // Identité
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
          toast({ title: 'Champs requis', description: 'Prénom et nom sont obligatoires', status: 'error', duration: 3000 });
          return false;
        }

        if (onboardingMode === 'create') {
          const hasEmail = (formData.digitalFlowEmail || formData.email || '').trim();
          if (!hasEmail) {
            toast({ title: 'Email requis', description: 'Renseignez un email pour envoyer le parcours', status: 'warning', duration: 4000 });
            return false;
          }
        } else if (!formData.email.trim()) {
          toast({ title: 'Champs requis', description: 'L\'email est obligatoire en mode import', status: 'error', duration: 3000 });
          return false;
        }
        return true;
      case 2: // Adresse (optionnelle)
        return true;
      case 3: // Identifiants (optionnels)
        return true;
      case 4: // Adhésion/Stage
        if (profileType === 'stagiaire') {
          if (!formData.internshipStartDate || !formData.internshipEndDate) {
            toast({ title: 'Dates requises', description: 'Les dates de stage sont obligatoires', status: 'warning', duration: 3000 });
            return false;
          }
        }
        return true;
      case 5: // Bulletin d'adhésion
        // Les stagiaires n'ont pas de bulletin
        if (profileType === 'stagiaire') return true;

        if (onboardingMode === 'create') {
          return true;
        }
        
        // Si bulletin papier, vérifier l'upload
        if (formData.signatureMethod === 'paper' && !formData.bulletinFile) {
          toast({ 
            title: 'Bulletin requis', 
            description: 'Veuillez uploader le bulletin d\'adhésion signé ou choisir un autre mode de signature', 
            status: 'warning', 
            duration: 4000 
          });
          return false;
        }
        
        // Si parcours numérique activé, vérifier email ou phone
        if (formData.signatureMethod === 'digital_flow' && formData.sendDigitalFlow) {
          const hasEmail = (formData.digitalFlowEmail || formData.email || '').trim();
          const hasPhone = (formData.digitalFlowPhone || formData.phone || '').trim();
          
          if (!hasEmail && !hasPhone) {
            toast({ 
              title: 'Contact requis', 
              description: 'Veuillez saisir un email ou un numéro de téléphone pour le parcours numérique', 
              status: 'warning', 
              duration: 4000 
            });
            return false;
          }
        }
        
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    try {
      setLoading(true);

      if (onboardingMode === 'create') {
        if (!digitalFlowToken) {
          await launchDigitalFlow();
          setLoading(false);
          return;
        }

        if (digitalFlowStatus !== 'signed') {
          toast({
            title: 'En attente de signature',
            description: 'Le lien a ete envoye. Finalisez la creation apres reception de la signature.',
            status: 'info',
            duration: 4000
          });
          setLoading(false);
          return;
        }
      }

      const payload = {
        ...formData,
        membershipType: profileType === 'stagiaire' ? 'STAGIAIRE' : formData.membershipType,
        signatureMethod: onboardingMode === 'create' ? 'digital_flow' : formData.signatureMethod,
        sendDigitalFlow: onboardingMode === 'create' ? true : formData.sendDigitalFlow
      };

      const created = await membersAPI.create(payload);

      if (onboardingMode === 'create') {
        localStorage.removeItem(DIGITAL_FLOW_DRAFT_KEY);
      }

      toast({ title: onboardingMode === 'create' ? 'Adherent cree apres signature' : 'Adhérent créé', status: 'success', duration: 3000 });
      onMemberCreated?.(created);
      reset();
      onClose();
    } catch (e) {
      // Gestion des erreurs spécifiques
      if (e.status === 409 || e.message?.includes('existe déjà')) {
        const fieldName = e.field === 'email' ? 'email' : 
                         e.field === 'memberNumber' ? 'numéro adhérent' :
                         e.field === 'matricule' ? 'matricule' : 'donnée';
        toast({ 
          title: 'Adhérent déjà existant', 
          description: `Un adhérent avec ce ${fieldName} existe déjà. Utilisez un autre ${fieldName} ou modifiez l'adhérent existant.`,
          status: 'warning', 
          duration: 7000 
        });
      } else {
        toast({ 
          title: 'Erreur', 
          description: e.message || 'Impossible de créer l\'adhérent', 
          status: 'error', 
          duration: 5000 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { reset(); onClose(); };

  // Rendu des étapes
  const renderStepContent = () => {
    switch(activeStep) {
      case 0: // Type de profil
        return (
          <VStack spacing={6} align="stretch">
            <Text fontSize="lg" fontWeight="bold">Quel parcours souhaitez-vous lancer ?</Text>

            <RadioGroup value={onboardingMode} onChange={setOnboardingMode}>
              <Stack spacing={4}>
                <Card
                  cursor="pointer"
                  borderWidth={2}
                  borderColor={onboardingMode === 'import' ? 'blue.500' : 'gray.200'}
                  onClick={() => setOnboardingMode('import')}
                  _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                  transition="all 0.2s"
                  bg={cardBg}
                >
                  <CardBody>
                    <HStack>
                      <Radio value="import" />
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Icon as={FiFileText} color="blue.600" boxSize={6} />
                          <Text fontWeight="bold" color="black">Importer un adherent</Text>
                          <Badge colorScheme="blue">Interne</Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          Vous saisissez les infos connues puis importez le bulletin deja signe.
                        </Text>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>

                <Card
                  cursor="pointer"
                  borderWidth={2}
                  borderColor={onboardingMode === 'create' ? 'rbe.500' : 'gray.200'}
                  onClick={() => {
                    setOnboardingMode('create');
                    setFormData((prev) => ({ ...prev, signatureMethod: 'digital_flow', sendDigitalFlow: true }));
                  }}
                  _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                  transition="all 0.2s"
                  bg={cardBg}
                >
                  <CardBody>
                    <HStack>
                      <Radio value="create" />
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Icon as={FiUser} color="rbe.600" boxSize={6} />
                          <Text fontWeight="bold" color="black">Creer un nouvel adherent</Text>
                          <Badge colorScheme="rbe">SMS / Email</Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          Envoi d'un lien securise, saisie a distance, signature sur mobile, puis finalisation interne.
                        </Text>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
              </Stack>
            </RadioGroup>

            <Divider />
            <Text fontSize="md" fontWeight="bold">Type de profil RH</Text>
            <RadioGroup value={profileType} onChange={setProfileType}>
              <Stack spacing={4}>
                <Card 
                  cursor="pointer" 
                  borderWidth={2} 
                  borderColor={profileType === 'adherent' ? 'rbe.500' : 'gray.200'}
                  onClick={() => setProfileType('adherent')}
                  _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                  transition="all 0.2s"
                  bg={cardBg}
                >
                  <CardBody>
                    <HStack>
                      <Radio value="adherent" />
                      <VStack align="start" spacing={1}>
                        <HStack>
                        <Icon as={FiUser} color="gray.600" boxSize={6} />
                        <Text fontWeight="bold" color="black">Adhérent</Text>
                        <Badge colorScheme="rbe">Standard</Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          Membre avec cotisation, bulletin d'adhésion et droits d'accès complets
                        </Text>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
                <Card 
                  cursor="pointer" 
                  borderWidth={2} 
                  borderColor={profileType === 'stagiaire' ? 'orange.500' : 'gray.200'}
                  onClick={() => setProfileType('stagiaire')}
                  _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                  transition="all 0.2s"
                  bg={cardBg}
                >
                  <CardBody>
                    <HStack>
                      <Radio value="stagiaire" />
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Icon as={FiFileText} />
                          <Text fontWeight="bold">Stagiaire</Text>
                          <Badge colorScheme="orange">Formation</Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          Personne en formation, sans cotisation, avec convention de stage obligatoire
                        </Text>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
              </Stack>
            </RadioGroup>
          </VStack>
        );

      case 1: // Identité
        return (
          <VStack spacing={4} align="stretch">
            <Heading size="sm">Informations personnelles</Heading>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Prénom</FormLabel>
                <Input value={formData.firstName} onChange={(e)=>setFormData(p=>({...p, firstName: e.target.value}))} placeholder="Prénom" />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Nom</FormLabel>
                <Input value={formData.lastName} onChange={(e)=>setFormData(p=>({...p, lastName: e.target.value}))} placeholder="Nom" />
              </FormControl>
            </SimpleGrid>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input type="email" value={formData.email} onChange={(e)=>setFormData(p=>({...p, email: e.target.value}))} placeholder="email@exemple.com" />
            </FormControl>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl>
                <FormLabel>Téléphone</FormLabel>
                <Input value={formData.phone} onChange={(e)=>setFormData(p=>({...p, phone: e.target.value}))} placeholder="06 12 34 56 78" />
              </FormControl>
              <FormControl>
                <FormLabel>Date de naissance</FormLabel>
                <Input type="date" value={formData.birthDate} onChange={(e)=>setFormData(p=>({...p, birthDate: e.target.value}))} />
              </FormControl>
            </SimpleGrid>
          </VStack>
        );

      case 2: // Adresse
        return (
          <VStack spacing={4} align="stretch">
            <Heading size="sm">Adresse postale</Heading>
            <FormControl>
              <FormLabel>Adresse</FormLabel>
              <Input value={formData.address} onChange={(e)=>setFormData(p=>({...p, address: e.target.value}))} placeholder="N° et nom de rue" />
            </FormControl>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl>
                <FormLabel>Code postal</FormLabel>
                <Input value={formData.postalCode} onChange={(e)=>setFormData(p=>({...p, postalCode: e.target.value}))} placeholder="91000" />
              </FormControl>
              <FormControl>
                <FormLabel>Ville</FormLabel>
                <Input value={formData.city} onChange={(e)=>setFormData(p=>({...p, city: e.target.value}))} placeholder="Ville" />
              </FormControl>
            </SimpleGrid>
          </VStack>
        );

      case 3: // Identifiants
        return (
          <VStack spacing={4} align="stretch">
            <Heading size="sm">Identifiants RH</Heading>
            <Alert status="info" variant="left-accent">
              <AlertIcon />
              <Text fontSize="sm">Ces identifiants sont optionnels et peuvent être générés automatiquement</Text>
            </Alert>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl>
                <FormLabel>Matricule</FormLabel>
                <Input 
                  value={formData.matricule} 
                  onChange={(e)=>setFormData(p=>({...p, matricule: e.target.value}))}
                  placeholder="Ex: MAT2026-001"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Numéro {profileType === 'stagiaire' ? 'de stagiaire' : 'd\'adhérent'}</FormLabel>
                <Input 
                  value={formData.memberNumber} 
                  onChange={(e)=>setFormData(p=>({...p, memberNumber: e.target.value}))}
                  placeholder={profileType === 'stagiaire' ? 'Ex: STG2026-001' : 'Ex: ADH2026-001'}
                />
              </FormControl>
            </SimpleGrid>
          </VStack>
        );

      case 4: // Adhésion ou Stage
        if (profileType === 'stagiaire') {
          return (
            <VStack spacing={4} align="stretch">
              <HStack>
                <Icon as={FiFileText} color="orange.500" boxSize={5} />
                <Heading size="sm">Informations de stage</Heading>
              </HStack>
              <Alert status="warning" variant="left-accent">
                <AlertIcon />
                <Text fontSize="sm">Un stagiaire n'a pas de cotisation ni de bulletin d'adhésion. Une convention de stage est obligatoire.</Text>
              </Alert>
              <SimpleGrid columns={2} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Date de début</FormLabel>
                  <Input 
                    type="date" 
                    value={formData.internshipStartDate} 
                    onChange={(e)=>setFormData(p=>({...p, internshipStartDate: e.target.value}))} 
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Date de fin</FormLabel>
                  <Input 
                    type="date" 
                    value={formData.internshipEndDate} 
                    onChange={(e)=>setFormData(p=>({...p, internshipEndDate: e.target.value}))}
                  />
                </FormControl>
              </SimpleGrid>
              <FormControl>
                <FormLabel>Type de stage</FormLabel>
                <Select 
                  value={formData.internshipType} 
                  onChange={(e)=>setFormData(p=>({...p, internshipType: e.target.value}))}
                  placeholder="Sélectionner un type"
                >
                  <option value="observation">Stage d'observation</option>
                  <option value="application">Stage d'application</option>
                  <option value="formation">Formation professionnelle</option>
                  <option value="immersion">Immersion professionnelle</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Tuteur / Responsable</FormLabel>
                <Input 
                  value={formData.supervisor} 
                  onChange={(e)=>setFormData(p=>({...p, supervisor: e.target.value}))}
                  placeholder="Nom du responsable de stage"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Convention de stage</FormLabel>
                <Input 
                  type="file" 
                  accept=".pdf,.doc,.docx"
                  onChange={(e)=>setFormData(p=>({...p, convention: e.target.files[0]}))}
                  pt={1}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {formData.convention ? `📄 ${formData.convention.name}` : 'Format accepté : PDF, DOC, DOCX'}
                </Text>
              </FormControl>
            </VStack>
          );
        } else {
          return (
            <VStack spacing={4} align="stretch">
              <HStack>
                <Icon as={FiFileText} color="blue.500" boxSize={5} />
                <Heading size="sm">Adhésion et cotisation</Heading>
              </HStack>
              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <FormLabel>Type d'adhésion</FormLabel>
                  <Select value={formData.membershipType} onChange={(e)=>setFormData(p=>({...p, membershipType: e.target.value}))}>
                    {Object.entries(MEMBERSHIP_TYPES).filter(([k]) => k !== 'STAGIAIRE').map(([k,v]) => (<option key={k} value={k}>{v}</option>))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Statut</FormLabel>
                  <Select value={formData.membershipStatus} onChange={(e)=>setFormData(p=>({...p, membershipStatus: e.target.value}))}>
                    {Object.entries(MEMBERSHIP_STATUS).map(([k,v]) => (<option key={k} value={k}>{v}</option>))}
                  </Select>
                </FormControl>
              </SimpleGrid>
              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <FormLabel>Début d'adhésion</FormLabel>
                  <Input 
                    type="date" 
                    value={formData.membershipStartDate} 
                    onChange={(e)=>setFormData(p=>({...p, membershipStartDate: e.target.value}))} 
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Fin d'adhésion</FormLabel>
                  <Input 
                    type="date" 
                    value={formData.membershipEndDate} 
                    onChange={(e)=>setFormData(p=>({...p, membershipEndDate: e.target.value}))}
                    placeholder="Optionnel"
                  />
                </FormControl>
              </SimpleGrid>
              
              <Box borderWidth={1} borderRadius="md" p={4} bg="gray.50">
                <VStack spacing={4} align="stretch">
                  <FormControl display="flex" alignItems="center">
                    <Checkbox 
                      isChecked={formData.isExempted}
                      onChange={(e)=>setFormData(p=>({...p, isExempted: e.target.checked, paymentAmount: e.target.checked ? '0' : p.paymentAmount}))}
                    >
                      Exonération de cotisation
                    </Checkbox>
                  </FormControl>
                  
                  {!formData.isExempted ? (
                    <SimpleGrid columns={2} spacing={4}>
                      <FormControl>
                        <FormLabel>Montant cotisation (€)</FormLabel>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={formData.paymentAmount} 
                          onChange={(e)=>setFormData(p=>({...p, paymentAmount: e.target.value}))} 
                          placeholder="Ex: 50.00"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Mode de paiement</FormLabel>
                        <Select value={formData.paymentMethod} onChange={(e)=>setFormData(p=>({...p, paymentMethod: e.target.value}))}>
                          {Object.entries(PAYMENT_METHODS).map(([k,v]) => (<option key={k} value={k}>{v}</option>))}
                        </Select>
                      </FormControl>
                    </SimpleGrid>
                  ) : (
                    <>
                      <Alert status="info" variant="left-accent">
                        <AlertIcon />
                        <Text fontSize="sm">Cette personne est exonérée de cotisation</Text>
                      </Alert>
                      <FormControl isRequired>
                        <FormLabel>Motif d'exonération</FormLabel>
                        <Textarea 
                          value={formData.exemptionReason} 
                          onChange={(e)=>setFormData(p=>({...p, exemptionReason: e.target.value}))} 
                          placeholder="Précisez le motif de l'exonération (décision CA, situation particulière, etc.)"
                          rows={3}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Document justificatif (optionnel)</FormLabel>
                        <Input 
                          type="file" 
                          accept=".pdf,.doc,.docx,.jpg,.png"
                          onChange={(e)=>setFormData(p=>({...p, exemptionDocument: e.target.files[0]}))}
                          pt={1}
                        />
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          {formData.exemptionDocument ? `📄 ${formData.exemptionDocument.name}` : 'PV de CA, justificatif, etc.'}
                        </Text>
                      </FormControl>
                    </>
                  )}
                </VStack>
              </Box>
            </VStack>
          );
        }

      case 5: // Bulletin d'adhésion et parcours numérique
        // Les stagiaires n'ont pas de bulletin d'adhésion
        if (profileType === 'stagiaire') {
          // Passer directement à l'étape validation
          return (
            <VStack spacing={4} align="stretch">
              <Alert status="info" variant="left-accent">
                <AlertIcon />
                <Text fontSize="sm">Les stagiaires n'ont pas de bulletin d'adhésion. Passez à l'étape suivante.</Text>
              </Alert>
            </VStack>
          );
        }

        if (onboardingMode === 'create') {
          return (
            <VStack spacing={6} align="stretch">
              <HStack>
                <Icon as={FiFileText} color="rbe.500" boxSize={6} />
                <Heading size="sm" color="black">Parcours nouvel adherent par lien securise</Heading>
              </HStack>

              <Alert status="info" variant="left-accent">
                <AlertIcon />
                <Text fontSize="sm">
                  En mode creation, le lien est envoye a l'adherent. Cette page reste ouverte en attente des infos et de la signature.
                </Text>
              </Alert>

              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <FormLabel>Email destinataire</FormLabel>
                  <Input
                    type="email"
                    value={formData.digitalFlowEmail || formData.email}
                    onChange={(e)=>setFormData(p=>({...p, digitalFlowEmail: e.target.value}))}
                    placeholder={formData.email || 'email@exemple.com'}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>N° de telephone (SMS)</FormLabel>
                  <Input
                    type="tel"
                    value={formData.digitalFlowPhone || formData.phone}
                    onChange={(e)=>setFormData(p=>({...p, digitalFlowPhone: e.target.value}))}
                    placeholder={formData.phone || '06 12 34 56 78'}
                  />
                </FormControl>
              </SimpleGrid>

              <Card bg={cardBg} borderColor="rbe.200" borderWidth={1}>
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="bold" color="black">Etat du parcours</Text>
                      <Badge colorScheme={digitalFlowStatus === 'signed' ? 'green' : 'orange'}>
                        {digitalFlowStatus === 'signed' ? 'Signe' : digitalFlowStatus === 'in_progress' ? 'En cours' : digitalFlowStatus === 'pending' ? 'Envoye' : 'Non envoye'}
                      </Badge>
                    </HStack>

                    {digitalFlowLink && (
                      <Text fontSize="xs" color="gray.600">
                        Lien: {digitalFlowLink}
                      </Text>
                    )}

                    {digitalFlowSignedAt && (
                      <Text fontSize="xs" color="green.700">
                        Signature recue le {new Date(digitalFlowSignedAt).toLocaleString('fr-FR')}
                      </Text>
                    )}

                    <Button colorScheme="rbe" onClick={launchDigitalFlow} isLoading={loading} loadingText="Envoi en cours">
                      {digitalFlowToken ? 'Renvoyer le lien' : 'Envoyer le lien maintenant'}
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </VStack>
          );
        }

        return (
          <VStack spacing={6} align="stretch">
            <HStack>
              <Icon as={FiFileText} color="rbe.500" boxSize={6} />
              <Heading size="sm" color="black">Bulletin d'adhésion et signature</Heading>
            </HStack>

            {/* Méthode de signature */}
            <Card>
              <CardHeader><Heading size="xs">Mode de signature</Heading></CardHeader>
              <CardBody>
                <RadioGroup value={formData.signatureMethod} onChange={(val)=>setFormData(p=>({...p, signatureMethod: val}))}>
                  <Stack spacing={3}>
                    <Card 
                      cursor="pointer" 
                      borderWidth={2} 
                      borderColor={formData.signatureMethod === 'paper' ? 'rbe.500' : 'gray.200'}
                      onClick={() => setFormData(p=>({...p, signatureMethod: 'paper'}))}
                      _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                      transition="all 0.2s"
                      bg={cardBg}
                    >
                      <CardBody>
                        <HStack>
                          <Radio value="paper" />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold">📄 Bulletin papier signé</Text>
                            <Text fontSize="sm" color="gray.600">Scanner et uploader le bulletin déjà signé</Text>
                          </VStack>
                        </HStack>
                      </CardBody>
                    </Card>

                    <Card 
                      cursor="pointer" 
                      borderWidth={2} 
                      borderColor={formData.signatureMethod === 'electronic' ? 'rbe.500' : 'gray.200'}
                      onClick={() => setFormData(p=>({...p, signatureMethod: 'electronic'}))}
                      _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                      transition="all 0.2s"
                      bg={cardBg}
                    >
                      <CardBody>
                        <HStack>
                          <Radio value="electronic" />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold">✍️ Signature électronique immédiate</Text>
                            <Text fontSize="sm" color="gray.600">Via DocuSign, HelloSign ou autre (à configurer)</Text>
                          </VStack>
                        </HStack>
                      </CardBody>
                    </Card>

                    <Card 
                      cursor="pointer" 
                      borderWidth={2} 
                      borderColor={formData.signatureMethod === 'digital_flow' ? 'rbe.500' : 'gray.200'}
                      onClick={() => setFormData(p=>({...p, signatureMethod: 'digital_flow'}))}
                      _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                      transition="all 0.2s"
                      bg={cardBg}
                    >
                      <CardBody>
                        <HStack>
                          <Radio value="digital_flow" />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold">� Parcours numérique interactif</Text>
                            <Text fontSize="sm" color="gray.600">Lien sécurisé par SMS/email avec stepper et signature en ligne</Text>
                          </VStack>
                        </HStack>
                      </CardBody>
                    </Card>
                  </Stack>
                </RadioGroup>
              </CardBody>
            </Card>

            {/* Upload bulletin papier */}
            {formData.signatureMethod === 'paper' && (
              <Card>
                <CardHeader><Heading size="xs">Upload du bulletin signé</Heading></CardHeader>
                <CardBody>
                  <FormControl>
                    <FormLabel>Fichier PDF ou image</FormLabel>
                    <Input 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e)=>setFormData(p=>({...p, bulletinFile: e.target.files[0]}))}
                      pt={1}
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {formData.bulletinFile ? `📄 ${formData.bulletinFile.name}` : 'Format accepté : PDF, JPG, PNG'}
                    </Text>
                  </FormControl>
                </CardBody>
              </Card>
            )}

            {/* Signature électronique */}
            {formData.signatureMethod === 'electronic' && (
              <Card>
                <CardHeader><Heading size="xs">Configuration signature électronique</Heading></CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Alert status="info" variant="left-accent">
                      <AlertIcon />
                      <VStack align="start" spacing={1}>
                        <Text fontSize="sm" fontWeight="bold">À configurer ensemble</Text>
                        <Text fontSize="xs">Intégration avec DocuSign, HelloSign, ou signature Canvas HTML5</Text>
                      </VStack>
                    </Alert>
                    <FormControl>
                      <FormLabel>Fournisseur de signature</FormLabel>
                      <Select 
                        value={formData.eSignatureProvider} 
                        onChange={(e)=>setFormData(p=>({...p, eSignatureProvider: e.target.value}))}
                        placeholder="Sélectionner un fournisseur"
                      >
                        <option value="docusign">DocuSign</option>
                        <option value="hellosign">HelloSign (Dropbox Sign)</option>
                        <option value="adobe_sign">Adobe Sign</option>
                        <option value="yousign">YouSign</option>
                        <option value="canvas">Signature Canvas (intégrée)</option>
                      </Select>
                    </FormControl>
                  </VStack>
                </CardBody>
              </Card>
            )}

            {/* Parcours numérique */}
            {formData.signatureMethod === 'digital_flow' && (
              <Card>
                <CardHeader><Heading size="xs">Parcours numérique interactif</Heading></CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Alert status="success" variant="left-accent">
                      <AlertIcon />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="bold">🚀 Parcours sécurisé avec stepper</Text>
                        <Text fontSize="xs">
                          L'adhérent reçoit un lien privé (email/SMS) pour un parcours guidé en 5 étapes avec signature en ligne
                        </Text>
                      </VStack>
                    </Alert>

                    <FormControl display="flex" alignItems="center">
                      <Checkbox 
                        isChecked={formData.sendDigitalFlow}
                        onChange={(e)=>setFormData(p=>({...p, sendDigitalFlow: e.target.checked}))}
                      >
                        Activer l'envoi automatique du lien
                      </Checkbox>
                    </FormControl>

                    {formData.sendDigitalFlow && (
                      <>
                        <SimpleGrid columns={2} spacing={4}>
                          <FormControl>
                            <FormLabel>Email destinataire</FormLabel>
                            <Input 
                              type="email"
                              value={formData.digitalFlowEmail || formData.email} 
                              onChange={(e)=>setFormData(p=>({...p, digitalFlowEmail: e.target.value}))}
                              placeholder={formData.email || "email@exemple.com"}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel>N° de téléphone (SMS)</FormLabel>
                            <Input 
                              type="tel"
                              value={formData.digitalFlowPhone || formData.phone} 
                              onChange={(e)=>setFormData(p=>({...p, digitalFlowPhone: e.target.value}))}
                              placeholder={formData.phone || "06 12 34 56 78"}
                            />
                          </FormControl>
                        </SimpleGrid>

                        <Card bg={cardBg} borderColor="rbe.200" borderWidth={1} _hover={{ shadow: 'md' }} transition="all 0.2s">
                          <CardBody>
                            <VStack align="start" spacing={2}>
                              <Text fontSize="sm" fontWeight="bold" color="black">📋 Le parcours en 5 étapes :</Text>
                              <Text fontSize="xs" color="gray.700">1️⃣ Bienvenue et présentation</Text>
                              <Text fontSize="xs" color="gray.700">2️⃣ Vérification des informations pré-remplies</Text>
                              <Text fontSize="xs" color="gray.700">3️⃣ Compléments d'information (optionnel)</Text>
                              <Text fontSize="xs" color="gray.700">4️⃣ Signature électronique (Canvas)</Text>
                              <Text fontSize="xs" color="gray.700">5️⃣ Confirmation et téléchargement du bulletin signé</Text>
                              <Divider my={2} />
                              <Text fontSize="xs" color="rbe.600" fontWeight="bold">
                                🔒 Lien sécurisé valide 7 jours
                              </Text>
                            </VStack>
                          </CardBody>
                        </Card>
                      </>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            )}
          </VStack>
        );

      case 6: // Validation et notes
        return (
          <VStack spacing={6} align="stretch">
            <HStack>
              <Icon as={FiCheck} color="green.500" boxSize={6} />
              <Heading size="sm" color="black">Récapitulatif et validation</Heading>
            </HStack>
            
            <Card bg={profileType === 'stagiaire' ? 'orange.50' : 'blue.50'}>
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Type de profil :</Text>
                    <Badge colorScheme={profileType === 'stagiaire' ? 'orange' : 'blue'} fontSize="md">
                      {profileType === 'stagiaire' ? '🎓 Stagiaire' : '👤 Adhérent'}
                    </Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Nom complet :</Text>
                    <Text>{formData.firstName} {formData.lastName}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Email :</Text>
                    <Text>{formData.email || '—'}</Text>
                  </HStack>
                  {profileType === 'stagiaire' ? (
                    <>
                      <HStack justify="space-between">
                        <Text fontWeight="bold">Période :</Text>
                        <Text>
                          {formData.internshipStartDate ? new Date(formData.internshipStartDate).toLocaleDateString('fr-FR') : '—'} 
                          {' → '}
                          {formData.internshipEndDate ? new Date(formData.internshipEndDate).toLocaleDateString('fr-FR') : '—'}
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontWeight="bold">Convention :</Text>
                        <Text>{formData.convention ? `✅ ${formData.convention.name}` : '⚠️ Non fournie'}</Text>
                      </HStack>
                    </>
                  ) : (
                    <>
                      <HStack justify="space-between">
                        <Text fontWeight="bold">Type d'adhésion :</Text>
                        <Text>{MEMBERSHIP_TYPES[formData.membershipType]}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontWeight="bold">Cotisation :</Text>
                        <Text fontWeight="bold" color={formData.isExempted ? 'orange.600' : 'green.600'}>
                          {formData.isExempted ? '⚠️ EXONÉRÉ' : `${formData.paymentAmount || '0'}€`}
                        </Text>
                      </HStack>
                      {formData.isExempted && (
                        <Alert status="warning" variant="left-accent" size="sm">
                          <AlertIcon />
                          <VStack align="start" spacing={0}>
                            <Text fontSize="xs" fontWeight="bold">Motif d'exonération :</Text>
                            <Text fontSize="xs">{formData.exemptionReason || 'Non précisé'}</Text>
                          </VStack>
                        </Alert>
                      )}
                    </>
                  )}
                </VStack>
              </CardBody>
            </Card>

            {onboardingMode === 'create' && (
              <Alert status={digitalFlowStatus === 'signed' ? 'success' : 'warning'} variant="left-accent">
                <AlertIcon />
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" fontWeight="bold">
                    {digitalFlowStatus === 'signed'
                      ? 'Signature recue, vous pouvez finaliser la creation.'
                      : 'Creation en attente de la saisie et de la signature via le lien envoye.'}
                  </Text>
                  {digitalFlowSignedAt && (
                    <Text fontSize="xs">Signe le {new Date(digitalFlowSignedAt).toLocaleString('fr-FR')}</Text>
                  )}
                </VStack>
              </Alert>
            )}

            <FormControl>
              <FormLabel>Notes administratives</FormLabel>
              <Textarea 
                value={formData.notes} 
                onChange={(e)=>setFormData(p=>({...p, notes: e.target.value}))} 
                placeholder="Ajoutez des notes internes si nécessaire..."
                rows={4}
              />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <Switch 
                id="newsletter"
                isChecked={formData.newsletter}
                onChange={(e)=>setFormData(p=>({...p, newsletter: e.target.checked}))}
              />
              <FormLabel htmlFor="newsletter" mb="0" ml={3}>
                Inscription à la newsletter
              </FormLabel>
            </FormControl>
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <VStack align="stretch" spacing={2}>
            <HStack>
              <Icon as={FiUser} boxSize={5} color="blue.500" />
              <Text>Ajout RH</Text>
              {activeStep > 0 && (
                <Badge colorScheme={profileType === 'stagiaire' ? 'orange' : 'blue'}>
                  {profileType === 'stagiaire' ? 'Stagiaire' : 'Adhérent'}
                </Badge>
              )}
              <Badge colorScheme={onboardingMode === 'create' ? 'rbe' : 'gray'}>
                {onboardingMode === 'create' ? 'Creation via lien' : 'Import interne'}
              </Badge>
            </HStack>
            <Progress value={(activeStep / (steps.length - 1)) * 100} size="sm" colorScheme="blue" />
          </VStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Stepper / Parcours Ariane */}
            <Stepper index={activeStep} size="sm" colorScheme="blue">
              {steps.map((step, index) => (
                <Step key={index}>
                  <StepIndicator>
                    <StepStatus
                      complete={<StepIcon />}
                      incomplete={<StepNumber />}
                      active={<StepNumber />}
                    />
                  </StepIndicator>
                  <Box flexShrink="0">
                    <StepTitle>{step.title}</StepTitle>
                    <StepDescription>{step.description}</StepDescription>
                  </Box>
                  <StepSeparator />
                </Step>
              ))}
            </Stepper>

            {/* Contenu de l'étape */}
            <Box minH="350px">
              {renderStepContent()}
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} width="100%" justify="space-between">
            <Button variant="ghost" onClick={handleClose}>Annuler</Button>
            <HStack>
              {activeStep > 0 && (
                <Button onClick={handleBack}>Précédent</Button>
              )}
              {activeStep < steps.length - 1 ? (
                <Button colorScheme="blue" onClick={handleNext}>Suivant</Button>
              ) : (
                <Button 
                  colorScheme="green" 
                  onClick={handleSubmit} 
                  isLoading={loading} 
                  loadingText="Création..."
                  isDisabled={onboardingMode === 'create' && !!digitalFlowToken && digitalFlowStatus !== 'signed'}
                  leftIcon={<Icon as={FiCheck} />}
                >
                  {onboardingMode === 'create' && !digitalFlowToken
                    ? 'Envoyer le parcours'
                    : `Créer ${profileType === 'stagiaire' ? 'le stagiaire' : 'l\'adhérent'}`}
                </Button>
              )}
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
