/**
 * DevisWizard.jsx
 * Modal plein écran avec parcours guidé pour créer un DEVIS ou une FACTURE
 * Inspiré du parcours d'accueil du musée avec fil d'Ariane (Stepper)
 * 
 * Parcours:
 * 1. Type de document (Devis ou Facture)
 * 2. Mode de création (Génération ou Import)
 * 3. Saisie/Import selon le choix
 * 4. Vérification et finalisation
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  StepSeparator,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  SimpleGrid,
  Alert,
  AlertIcon,
  Badge,
  Divider,
  useColorModeValue,
  useToast,
  IconButton,
  RadioGroup,
  Radio,
  Stack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Progress
} from '@chakra-ui/react';
import {
  FiFileText,
  FiFile,
  FiUpload,
  FiEdit3,
  FiCheck,
  FiPlus,
  FiTrash2,
  FiChevronRight,
  FiChevronLeft
} from 'react-icons/fi';

export default function DevisWizard({ isOpen, onClose, onSave }) {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgSection = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // === ÉTAT DU PARCOURS ===
  const [currentStep, setCurrentStep] = useState(0); // 0-3
  const [documentType, setDocumentType] = useState(''); // 'QUOTE' ou 'INVOICE'
  const [creationMode, setCreationMode] = useState(''); // 'generate' ou 'import'
  
  // === IMPORT ===
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // === GÉNÉRATION ===
  const [formData, setFormData] = useState({
    number: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    clientName: '',
    clientAddress: '',
    clientCompany: '',
    clientEmail: '',
    clientPhone: '',
    notes: ''
  });

  const [lines, setLines] = useState([]);
  const [totals, setTotals] = useState({
    subtotal: 0,
    taxRate: 0, // Association loi 1901 exonérée
    taxAmount: 0,
    total: 0
  });

  const [saving, setSaving] = useState(false);

  // === DÉFINITION DES ÉTAPES ===
  const getSteps = () => [
    { 
      title: 'Type', 
      description: documentType ? (documentType === 'QUOTE' ? 'Devis' : 'Facture') : 'Document'
    },
    { 
      title: 'Mode', 
      description: creationMode ? (creationMode === 'generate' ? 'Génération' : 'Import') : 'Création'
    },
    { 
      title: 'Saisie',
      description: creationMode === 'import' ? 'Upload' : 'Formulaire'
    },
    { 
      title: 'Validation', 
      description: 'Aperçu'
    }
  ];

  // === VALIDATION DES ÉTAPES ===
  const isStep0Valid = documentType !== '';
  const isStep1Valid = creationMode !== '';
  const isStep2Valid = () => {
    if (creationMode === 'import') {
      return uploadedFile !== null;
    }
    return formData.title.trim() && formData.clientName.trim() && lines.length > 0;
  };
  const isStep3Valid = true;

  const canProceed = () => {
    switch (currentStep) {
      case 0: return isStep0Valid;
      case 1: return isStep1Valid;
      case 2: return isStep2Valid();
      case 3: return isStep3Valid;
      default: return false;
    }
  };

  // === GESTION DES LIGNES ===
  const addLine = () => {
    setLines([...lines, {
      id: Date.now(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }]);
  };

  const updateLine = (id, field, value) => {
    const updatedLines = lines.map(line => {
      if (line.id === id) {
        const newLine = { ...line, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? parseFloat(value) || 0 : line.quantity;
          const price = field === 'unitPrice' ? parseFloat(value) || 0 : line.unitPrice;
          newLine.total = qty * price;
        }
        return newLine;
      }
      return line;
    });
    setLines(updatedLines);
    calculateTotals(updatedLines);
  };

  const removeLine = (id) => {
    const filtered = lines.filter(line => line.id !== id);
    setLines(filtered);
    calculateTotals(filtered);
  };

  const calculateTotals = useCallback((linesList) => {
    const subtotal = linesList.reduce((sum, line) => sum + (line.total || 0), 0);
    const taxAmount = subtotal * (totals.taxRate / 100);
    const total = subtotal + taxAmount;
    
    setTotals({
      ...totals,
      subtotal,
      taxAmount,
      total
    });
  }, [totals.taxRate]);

  // === IMPORT & EXTRACTION ===
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setIsExtracting(true);

    // Simulation extraction données du PDF (à remplacer par vrai parsing)
    setTimeout(() => {
      const prefix = documentType === 'QUOTE' ? 'DEV' : 'FACT';
      const mockExtracted = {
        number: `${prefix}-${Date.now()}`,
        title: `Document importé - ${file.name.replace('.pdf', '')}`,
        date: new Date().toISOString().split('T')[0],
        clientName: 'Client extrait du PDF',
        clientCompany: 'Société extraite',
        lines: [
          { id: 1, description: 'Article 1 (extrait)', quantity: 1, unitPrice: 100, total: 100 }
        ]
      };
      
      setExtractedData(mockExtracted);
      setFormData(prev => ({
        ...prev,
        number: mockExtracted.number,
        title: mockExtracted.title,
        date: mockExtracted.date,
        clientName: mockExtracted.clientName,
        clientCompany: mockExtracted.clientCompany
      }));
      setLines(mockExtracted.lines);
      calculateTotals(mockExtracted.lines);
      
      setIsExtracting(false);
      toast({
        title: 'Extraction réussie',
        description: 'Les données ont été extraites du document',
        status: 'success',
        duration: 3000
      });
    }, 2000);
  };

  // === SAUVEGARDE ===
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.clientName.trim()) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir tous les champs obligatoires',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    if (creationMode === 'generate' && lines.length === 0) {
      toast({
        title: 'Lignes requises',
        description: 'Ajoutez au moins une ligne au document',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    setSaving(true);
    try {
      // Générer numéro auto si vide
      let docNumber = formData.number;
      if (!docNumber || !docNumber.trim()) {
        const prefix = documentType === 'QUOTE' ? 'DEV' : 'FACT';
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        docNumber = `${prefix}-${year}${month}${day}-${Math.floor(Math.random() * 1000)}`;
      }

      const documentData = {
        type: documentType,
        mode: creationMode,
        number: docNumber,
        ...formData,
        lines,
        totals,
        uploadedFile: creationMode === 'import' ? uploadedFile : null,
        extractedData: creationMode === 'import' ? extractedData : null
      };

      await onSave(documentData);

      toast({
        title: `${documentType === 'QUOTE' ? 'Devis' : 'Facture'} créé(e)`,
        description: `Le document ${docNumber} a été enregistré avec succès`,
        status: 'success',
        duration: 3000
      });

      handleReset();
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder le document',
        status: 'error',
        duration: 4000
      });
    } finally {
      setSaving(false);
    }
  };

  // === RÉINITIALISATION ===
  const handleReset = () => {
    setCurrentStep(0);
    setDocumentType('');
    setCreationMode('');
    setUploadedFile(null);
    setExtractedData(null);
    setFormData({
      number: '',
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      clientName: '',
      clientAddress: '',
      clientCompany: '',
      clientEmail: '',
      clientPhone: '',
      notes: ''
    });
    setLines([]);
    setTotals({
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 0
    });
  };

  // === NAVIGATION ===
  const handleNext = () => {
    if (canProceed() && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    if (formData.title || lines.length > 0 || uploadedFile) {
      if (window.confirm('Êtes-vous sûr de vouloir fermer ? Les données non sauvegardées seront perdues.')) {
        handleReset();
        onClose();
      }
    } else {
      handleReset();
      onClose();
    }
  };

  // ========== RENDU DES ÉTAPES ==========

  // ÉTAPE 0: Type de document
  const renderStep0 = () => (
    <VStack spacing={6} align="stretch" py={8}>
      <Box textAlign="center">
        <Heading size="lg" mb={2}>Quel type de document souhaitez-vous créer ?</Heading>
        <Text color="gray.600">Choisissez entre un devis ou une facture</Text>
      </Box>

      <RadioGroup value={documentType} onChange={setDocumentType}>
        <Stack spacing={4}>
          <Card
            cursor="pointer"
            onClick={() => setDocumentType('QUOTE')}
            bg={documentType === 'QUOTE' ? 'rbe.50' : cardBg}
            borderColor={documentType === 'QUOTE' ? 'rbe.500' : borderColor}
            borderWidth="3px"
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            <CardBody>
              <HStack spacing={4} align="center">
                <Radio value="QUOTE" size="lg" colorScheme="rbe" />
                <Box flex={1}>
                  <HStack mb={2}>
                    <FiFileText size={24} />
                    <Heading size="md">Devis</Heading>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    Proposition commerciale avec prix estimatifs pour un client potentiel
                  </Text>
                </Box>
              </HStack>
            </CardBody>
          </Card>

          <Card
            cursor="pointer"
            onClick={() => setDocumentType('INVOICE')}
            bg={documentType === 'INVOICE' ? 'rbe.50' : cardBg}
            borderColor={documentType === 'INVOICE' ? 'rbe.500' : borderColor}
            borderWidth="3px"
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            <CardBody>
              <HStack spacing={4} align="center">
                <Radio value="INVOICE" size="lg" colorScheme="rbe" />
                <Box flex={1}>
                  <HStack mb={2}>
                    <FiFile size={24} />
                    <Heading size="md">Facture</Heading>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    Document officiel de paiement pour une prestation effectuée
                  </Text>
                </Box>
              </HStack>
            </CardBody>
          </Card>
        </Stack>
      </RadioGroup>

      {documentType && (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          <Text>
            Type sélectionné: <strong>{documentType === 'QUOTE' ? 'Devis' : 'Facture'}</strong>
          </Text>
        </Alert>
      )}
    </VStack>
  );

  // ÉTAPE 1: Mode de création
  const renderStep1 = () => (
    <VStack spacing={6} align="stretch" py={8}>
      <Box textAlign="center">
        <Heading size="lg" mb={2}>Comment voulez-vous créer ce {documentType === 'QUOTE' ? 'devis' : 'cette facture'} ?</Heading>
        <Text color="gray.600">Génération automatique ou import d'un document existant</Text>
      </Box>

      <RadioGroup value={creationMode} onChange={setCreationMode}>
        <Stack spacing={4}>
          <Card
            cursor="pointer"
            onClick={() => setCreationMode('generate')}
            bg={creationMode === 'generate' ? 'rbe.50' : cardBg}
            borderColor={creationMode === 'generate' ? 'rbe.500' : borderColor}
            borderWidth="3px"
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            <CardBody>
              <HStack spacing={4} align="center">
                <Radio value="generate" size="lg" colorScheme="rbe" />
                <Box flex={1}>
                  <HStack mb={2}>
                    <FiEdit3 size={24} />
                    <Heading size="md">Générer un nouveau document</Heading>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    Remplissez le formulaire, nous générons automatiquement le PDF selon nos modèles
                  </Text>
                </Box>
              </HStack>
            </CardBody>
          </Card>

          <Card
            cursor="pointer"
            onClick={() => setCreationMode('import')}
            bg={creationMode === 'import' ? 'rbe.50' : cardBg}
            borderColor={creationMode === 'import' ? 'rbe.500' : borderColor}
            borderWidth="3px"
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            <CardBody>
              <HStack spacing={4} align="center">
                <Radio value="import" size="lg" colorScheme="rbe" />
                <Box flex={1}>
                  <HStack mb={2}>
                    <FiUpload size={24} />
                    <Heading size="md">Importer un document existant</Heading>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    Vous avez déjà un PDF ou Word? Importez-le directement pour extraction automatique
                  </Text>
                </Box>
              </HStack>
            </CardBody>
          </Card>
        </Stack>
      </RadioGroup>

      {creationMode && (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          <Text>
            Mode sélectionné: <strong>{creationMode === 'generate' ? 'Génération automatique' : 'Import de document'}</strong>
          </Text>
        </Alert>
      )}
    </VStack>
  );

  // ÉTAPE 2: Saisie ou Import
  const renderStep2 = () => {
    if (creationMode === 'import') {
      return (
        <VStack spacing={6} align="stretch" py={4}>
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text>Importez votre document PDF ou Word et nous extrairons automatiquement les informations</Text>
          </Alert>

          <FormControl isRequired>
            <FormLabel fontSize="lg" fontWeight="bold">Fichier à importer</FormLabel>
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              pt={1}
              size="lg"
            />
          </FormControl>

          {isExtracting && (
            <Card bg={bgSection}>
              <CardBody>
                <VStack spacing={3}>
                  <Text fontWeight="bold">Extraction en cours...</Text>
                  <Progress size="sm" isIndeterminate colorScheme="rbe" w="100%" />
                  <Text fontSize="sm" color="gray.600">
                    Lecture du document et extraction des données (numéro, client, montants, etc.)
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          )}

          {uploadedFile && !isExtracting && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1} flex={1}>
                <Text fontWeight="bold">✓ Fichier importé avec succès</Text>
                <Text fontSize="sm">
                  {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} Ko)
                </Text>
              </VStack>
            </Alert>
          )}

          {extractedData && (
            <Card bg={cardBg} borderWidth="2px" borderColor="green.200">
              <CardHeader>
                <Heading size="sm">📋 Données extraites</Heading>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} fontSize="sm">
                  <Box>
                    <Text fontWeight="bold" color="gray.600">Numéro:</Text>
                    <Text>{extractedData.number}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="gray.600">Titre:</Text>
                    <Text>{extractedData.title}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="gray.600">Client:</Text>
                    <Text>{extractedData.clientName}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="gray.600">Date:</Text>
                    <Text>{extractedData.date}</Text>
                  </Box>
                </SimpleGrid>
              </CardBody>
            </Card>
          )}
        </VStack>
      );
    }

    // Mode Génération: Formulaire complet
    return (
      <VStack spacing={6} align="stretch" py={4}>
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text>Remplissez les informations du {documentType === 'QUOTE' ? 'devis' : 'de la facture'}</Text>
        </Alert>

        {/* Informations générales */}
        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">Informations générales</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Numéro (auto si vide)</FormLabel>
                  <Input
                    placeholder="DEV-260527-001"
                    value={formData.number}
                    onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Titre/Objet</FormLabel>
                  <Input
                    placeholder="Ex: Installation système audio"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Date</FormLabel>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Date de validité</FormLabel>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Description générale du document"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Informations client */}
        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">Client / Destinataire</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nom du client</FormLabel>
                  <Input
                    placeholder="Jean Dupont"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Société</FormLabel>
                  <Input
                    placeholder="SARL Dupont"
                    value={formData.clientCompany}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientCompany: e.target.value }))}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    placeholder="contact@example.com"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Téléphone</FormLabel>
                  <Input
                    placeholder="01 23 45 67 89"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Adresse complète</FormLabel>
                <Textarea
                  placeholder="123 Rue de la République, 91000 Évry"
                  rows={2}
                  value={formData.clientAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientAddress: e.target.value }))}
                />
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Lignes d'articles */}
        <Card bg={cardBg}>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="sm">Lignes d'articles / Services</Heading>
              <Button colorScheme="rbe" size="sm" leftIcon={<FiPlus />} onClick={addLine}>
                Ajouter une ligne
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            {lines.length === 0 ? (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Text>Aucune ligne ajoutée. Cliquez sur "Ajouter une ligne" pour commencer.</Text>
              </Alert>
            ) : (
              <Box overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr bg={bgSection}>
                      <Th>Description</Th>
                      <Th isNumeric>Qté</Th>
                      <Th isNumeric>Prix unitaire (€)</Th>
                      <Th isNumeric>Total (€)</Th>
                      <Th w="50px"></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {lines.map((line) => (
                      <Tr key={line.id}>
                        <Td>
                          <Input
                            size="sm"
                            placeholder="Description de l'article"
                            value={line.description}
                            onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                          />
                        </Td>
                        <Td isNumeric>
                          <NumberInput
                            size="sm"
                            min={0}
                            step={1}
                            value={line.quantity}
                            onChange={(val) => updateLine(line.id, 'quantity', val)}
                            maxW="100px"
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </Td>
                        <Td isNumeric>
                          <NumberInput
                            size="sm"
                            min={0}
                            step={0.01}
                            value={line.unitPrice}
                            onChange={(val) => updateLine(line.id, 'unitPrice', val)}
                            maxW="120px"
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </Td>
                        <Td isNumeric fontWeight="bold">
                          {line.total.toFixed(2)} €
                        </Td>
                        <Td>
                          <IconButton
                            icon={<FiTrash2 />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => removeLine(line.id)}
                            aria-label="Supprimer"
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>

        {/* Totaux */}
        {lines.length > 0 && (
          <Card bg={bgSection} borderWidth="2px" borderColor="rbe.200">
            <CardBody>
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between" fontSize="lg">
                  <Text>Total HT:</Text>
                  <Text fontWeight="bold">{totals.subtotal.toFixed(2)} €</Text>
                </HStack>

                <Alert status="info" borderRadius="md" fontSize="sm">
                  <AlertIcon />
                  <Text>Association loi 1901 - TVA exonérée (Article 239B CGI)</Text>
                </Alert>

                <Divider />

                <HStack justify="space-between" fontSize="xl">
                  <Text fontWeight="bold">Total TTC:</Text>
                  <Text fontWeight="bold" color="rbe.500">{totals.total.toFixed(2)} €</Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    );
  };

  // ÉTAPE 3: Vérification
  const renderStep3 = () => (
    <VStack spacing={6} align="stretch" py={4}>
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text>Vérifiez les informations avant de créer le document</Text>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">📄 Document</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2} fontSize="sm">
              <HStack>
                <Text fontWeight="bold" color="gray.600">Type:</Text>
                <Badge colorScheme="rbe">{documentType === 'QUOTE' ? 'Devis' : 'Facture'}</Badge>
              </HStack>
              <HStack>
                <Text fontWeight="bold" color="gray.600">Mode:</Text>
                <Badge>{creationMode === 'generate' ? 'Génération' : 'Import'}</Badge>
              </HStack>
              <HStack>
                <Text fontWeight="bold" color="gray.600">Numéro:</Text>
                <Text>{formData.number || '(auto)'}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="bold" color="gray.600">Titre:</Text>
                <Text>{formData.title}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="bold" color="gray.600">Date:</Text>
                <Text>{formData.date}</Text>
              </HStack>
              {formData.dueDate && (
                <HStack>
                  <Text fontWeight="bold" color="gray.600">Validité:</Text>
                  <Text>{formData.dueDate}</Text>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">👤 Client</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2} fontSize="sm">
              <Text fontWeight="bold">{formData.clientName}</Text>
              {formData.clientCompany && <Text color="gray.600">{formData.clientCompany}</Text>}
              {formData.clientEmail && <Text color="gray.600">{formData.clientEmail}</Text>}
              {formData.clientPhone && <Text color="gray.600">{formData.clientPhone}</Text>}
              {formData.clientAddress && (
                <Text color="gray.600" fontSize="xs">{formData.clientAddress}</Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {creationMode === 'generate' && lines.length > 0 && (
        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">💰 Montants</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text>Nombre de lignes:</Text>
                <Badge>{lines.length}</Badge>
              </HStack>
              <HStack justify="space-between">
                <Text>Total HT:</Text>
                <Text fontWeight="bold">{totals.subtotal.toFixed(2)} €</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>TVA ({totals.taxRate}%):</Text>
                <Text fontWeight="bold">{totals.taxAmount.toFixed(2)} €</Text>
              </HStack>
              <Divider />
              <HStack justify="space-between" fontSize="lg">
                <Text fontWeight="bold">Total TTC:</Text>
                <Text fontWeight="bold" color="rbe.500">{totals.total.toFixed(2)} €</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      )}

      {creationMode === 'import' && uploadedFile && (
        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">📎 Fichier importé</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2}>
              <Text fontWeight="bold">{uploadedFile.name}</Text>
              <Text fontSize="sm" color="gray.600">
                Taille: {(uploadedFile.size / 1024).toFixed(2)} Ko
              </Text>
            </VStack>
          </CardBody>
        </Card>
      )}

      <Alert status="success" borderRadius="md">
        <AlertIcon />
        <Text>
          Tout est prêt! Cliquez sur "Créer le {documentType === 'QUOTE' ? 'devis' : 'la facture'}" pour finaliser.
        </Text>
      </Alert>
    </VStack>
  );

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3];

  // ========== RENDU PRINCIPAL ==========
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      size="full"
      scrollBehavior="inside"
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(10px)" />
      <ModalContent>
        <ModalHeader borderBottom="1px" borderColor={borderColor}>
          <HStack spacing={3}>
            <FiFileText size={24} />
            <Box>
              <Heading size="md">
                Nouveau {documentType === 'QUOTE' ? 'Devis' : documentType === 'INVOICE' ? 'Facture' : 'Document'}
              </Heading>
              <Text fontSize="sm" fontWeight="normal" color="gray.600">
                Parcours guidé en 4 étapes
              </Text>
            </Box>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody py={6}>
          <VStack spacing={8} align="stretch" maxW="1200px" mx="auto">
            {/* Stepper / Fil d'Ariane */}
            <Box>
              <Stepper index={currentStep} colorScheme="rbe" size="lg">
                {getSteps().map((step, index) => (
                  <Step key={index}>
                    <StepIndicator>
                      <StepStatus
                        complete={<FiCheck />}
                        incomplete={<StepNumber />}
                        active={<StepNumber />}
                      />
                    </StepIndicator>

                    <Box flexShrink={0}>
                      <StepTitle>{step.title}</StepTitle>
                      <StepDescription>{step.description}</StepDescription>
                    </Box>

                    <StepSeparator />
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Contenu de l'étape courante */}
            <Box minH="400px">
              {stepRenderers[currentStep]()}
            </Box>
          </VStack>
        </ModalBody>

        {/* Navigation */}
        <Box 
          borderTop="1px" 
          borderColor={borderColor} 
          p={4} 
          bg={bgSection}
          position="sticky"
          bottom={0}
        >
          <HStack justify="space-between" maxW="1200px" mx="auto">
            <Button
              leftIcon={<FiChevronLeft />}
              onClick={handlePrevious}
              isDisabled={currentStep === 0}
              variant="outline"
              size="lg"
            >
              Précédent
            </Button>

            <Badge colorScheme="gray" fontSize="md" p={2}>
              Étape {currentStep + 1} / 4
            </Badge>

            {currentStep === 3 ? (
              <Button
                rightIcon={<FiCheck />}
                colorScheme="rbe"
                onClick={handleSave}
                isLoading={saving}
                size="lg"
              >
                Créer le {documentType === 'QUOTE' ? 'devis' : 'la facture'}
              </Button>
            ) : (
              <Button
                rightIcon={<FiChevronRight />}
                colorScheme="rbe"
                onClick={handleNext}
                isDisabled={!canProceed()}
                size="lg"
              >
                Suivant
              </Button>
            )}
          </HStack>
        </Box>
      </ModalContent>
    </Modal>
  );
}
