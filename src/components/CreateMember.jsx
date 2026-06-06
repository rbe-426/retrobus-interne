import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton,
  ModalBody, ModalFooter, Button, FormControl, FormLabel, Input,
  Select, VStack, SimpleGrid, Textarea, Card, CardHeader, CardBody,
  Heading, useToast, HStack, Switch, Box, Text, Badge, Icon,
  Stepper, Step, StepIndicator, StepStatus, StepIcon, StepNumber,
  StepTitle, StepDescription, StepSeparator, Progress, Alert, AlertIcon,
  RadioGroup, Radio, Stack, Checkbox, useSteps
} from '@chakra-ui/react';
import { FiUser, FiMapPin, FiKey, FiFileText, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { membersAPI } from '../api/members.js';

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

export default function CreateMember({ isOpen, onClose, onMemberCreated }) {
  const steps = [
    { title: 'Type', description: 'Profil RH', icon: FiUser },
    { title: 'Identité', description: 'Infos perso', icon: FiUser },
    { title: 'Adresse', description: 'Coordonnées', icon: FiMapPin },
    { title: 'Identifiants', description: 'Matricule', icon: FiKey },
    { title: 'Adhésion', description: 'Cotisation', icon: FiFileText },
    { title: 'Validation', description: 'Récapitulatif', icon: FiCheck }
  ];

  const { activeStep, setActiveStep } = useSteps({
    index: 0,
    count: steps.length
  });

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
    
    // Divers
    notes: '',
    newsletter: true
  });

  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const reset = () => {
    setProfileType('adherent');
    setActiveStep(0);
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
      notes: '', newsletter: true
    });
  };

  const validateStep = (step) => {
    switch(step) {
      case 0: // Type de profil
        return true;
      case 1: // Identité
        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
          toast({ title: 'Champs requis', description: 'Prénom, nom et email sont obligatoires', status: 'error', duration: 3000 });
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
      const payload = { 
        ...formData,
        membershipType: profileType === 'stagiaire' ? 'STAGIAIRE' : formData.membershipType
      };
      const created = await membersAPI.create(payload);
      toast({ title: 'Adhérent créé', status: 'success', duration: 3000 });
      onMemberCreated?.(created);
      reset();
      onClose();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, status: 'error', duration: 5000 });
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
            <Text fontSize="lg" fontWeight="bold">Quel type de profil souhaitez-vous créer ?</Text>
            <RadioGroup value={profileType} onChange={setProfileType}>
              <Stack spacing={4}>
                <Card 
                  cursor="pointer" 
                  borderWidth={2} 
                  borderColor={profileType === 'adherent' ? 'blue.500' : 'gray.200'}
                  onClick={() => setProfileType('adherent')}
                >
                  <CardBody>
                    <HStack>
                      <Radio value="adherent" />
                      <VStack align="start" spacing={1}>
                        <HStack>
                          <Icon as={FiUser} />
                          <Text fontWeight="bold">Adhérent</Text>
                          <Badge colorScheme="blue">Standard</Badge>
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

      case 5: // Validation et notes
        return (
          <VStack spacing={6} align="stretch">
            <HStack>
              <Icon as={FiCheck} color="green.500" boxSize={5} />
              <Heading size="sm">Récapitulatif et validation</Heading>
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
                  leftIcon={<Icon as={FiCheck} />}
                >
                  Créer {profileType === 'stagiaire' ? 'le stagiaire' : 'l\'adhérent'}
                </Button>
              )}
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
