/**
 * DevisWizard.jsx
 * Wizard 4 étapes pour créer un DEVIS
 * Choix entre: Génération auto (formulaire) ou Import PDF
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
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
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
  Checkbox,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon
} from '@chakra-ui/react';
import {
  FiChevronRight,
  FiChevronLeft,
  FiCheck,
  FiPlus,
  FiTrash2,
  FiUpload
} from 'react-icons/fi';

const WIZARD_STEPS = [
  { title: 'Type & Source', description: 'Génération ou Import' },
  { title: 'Infos Devis', description: 'Détails du devis' },
  { title: 'Lignes & Montants', description: 'Articles et prix' },
  { title: 'Vérification', description: 'Aperçu final' }
];

export default function DevisWizard({ onSave = () => {}, onClose = () => {} }) {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgSection = useColorModeValue('gray.50', 'gray.900');

  const [currentStep, setCurrentStep] = useState(0);
  const [creationMode, setCreationMode] = useState('generate'); // 'generate' ou 'import'
  const [pdfFile, setPdfFile] = useState(null);
  
  const [formData, setFormData] = useState({
    number: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    destinataireName: '',
    destinataireAdresse: '',
    destinataireSociete: '',
    destinataireContacts: '',
    notes: ''
  });

  const [lines, setLines] = useState([]);
  const [totals, setTotals] = useState({
    amountExcludingTax: 0,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 0
  });

  const [saving, setSaving] = useState(false);

  // ===== VALIDATION =====
  const isStep1Complete = creationMode; // Choix fait
  const isStep2Complete = formData.number.trim() && formData.title.trim() && formData.date;
  const isStep3Complete = lines.length > 0 || creationMode === 'import';
  const isStep4Complete = true; // Toujours reviewable

  const stepsComplete = [isStep1Complete, isStep2Complete, isStep3Complete, isStep4Complete];

  // ===== GESTION LIGNES =====
  const addLine = () => {
    setLines([...lines, {
      id: Date.now(),
      type: 'ARTICLE',
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }]);
  };

  const updateLine = (id, field, value) => {
    const updatedLines = lines.map(line => {
      if (line.id === id) {
        let processedValue = value;
        // Gérer les valeurs numériques vides ou invalides
        if (field === 'quantity' || field === 'unitPrice') {
          processedValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
        }
        const updated = { ...line, [field]: processedValue };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
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
    const amountExcludingTax = linesList.reduce((sum, line) => sum + (line.total || 0), 0);
    const taxRate = totals.taxRate;
    const taxAmount = amountExcludingTax * (taxRate / 100);
    const totalAmount = amountExcludingTax + taxAmount;
    
    setTotals({
      amountExcludingTax,
      taxRate,
      taxAmount,
      totalAmount
    });
  }, [totals.taxRate]);

  // ===== HANDLERS =====
  const handleSave = async () => {
    // Auto-generate number if not provided
    let number = formData.number;
    if (!number || !number.trim()) {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear().toString().slice(-2);
      const day = new Date().getDate();
      number = `DEV-${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}-${Math.floor(Math.random() * 1000)}`;
    }

    if (!number || !formData.title.trim() || !formData.date) {
      toast({ status: 'error', title: 'Complétez les infos du devis', duration: 2000 });
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        type: 'QUOTE',
        mode: creationMode,
        ...formData,
        number: number,
        lines: creationMode === 'generate' ? lines : [],
        totals: creationMode === 'generate' ? totals : {},
        pdfFile: creationMode === 'import' ? pdfFile : null
      };

      await onSave(dataToSave);
      
      toast({
        status: 'success',
        title: 'Devis créé avec succès! 🎉',
        duration: 2000
      });

      onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: 'Erreur',
        description: error.message,
        duration: 2000
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ===== STEP RENDERS =====
  const renderStep1 = () => (
    <VStack spacing={6} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text>Choisissez comment créer votre devis</Text>
      </Alert>

      <RadioGroup value={creationMode} onChange={setCreationMode}>
        <Stack spacing={4}>
          {/* Option 1: Génération */}
          <Card
            cursor="pointer"
            onClick={() => setCreationMode('generate')}
            bg={creationMode === 'generate' ? 'rbe.50' : cardBg}
            borderColor={creationMode === 'generate' ? 'rbe.500' : 'gray.200'}
            borderWidth="2px"
            _hover={{ shadow: 'md' }}
            transition="all 0.2s"
          >
            <CardBody>
              <HStack spacing={4} align="start">
                <Radio value="generate" size="lg" mt={2} />
                <VStack align="start" spacing={2} flex={1}>
                  <Heading size="sm">📝 Génération + Formulaire</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Remplissez les infos et les lignes, le PDF sera généré automatiquement
                  </Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>

          {/* Option 2: Import PDF */}
          <Card
            cursor="pointer"
            onClick={() => setCreationMode('import')}
            bg={creationMode === 'import' ? 'rbe.50' : cardBg}
            borderColor={creationMode === 'import' ? 'rbe.500' : 'gray.200'}
            borderWidth="2px"
            _hover={{ shadow: 'md' }}
            transition="all 0.2s"
          >
            <CardBody>
              <HStack spacing={4} align="start">
                <Radio value="import" size="lg" mt={2} />
                <VStack align="start" spacing={2} flex={1}>
                  <Heading size="sm">📄 Import PDF</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Vous avez déjà un PDF? Importez-le directement
                  </Text>
                </VStack>
              </HStack>
            </CardBody>
          </Card>
        </Stack>
      </RadioGroup>

      {creationMode && (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          Mode sélectionné: <strong>{creationMode === 'generate' ? 'Génération + Formulaire' : 'Import PDF'}</strong>
        </Alert>
      )}
    </VStack>
  );

  const renderStep2 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text>Renseignez les informations du devis</Text>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl isRequired>
          <FormLabel>Numéro de devis</FormLabel>
          <Input
            placeholder="DEV-2026-001"
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
          <FormLabel>Date du devis</FormLabel>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Date limite de validité</FormLabel>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
          />
        </FormControl>
      </SimpleGrid>

      <Divider />

      <Heading size="sm">Client/Destinataire</Heading>

      <FormControl isRequired>
        <FormLabel>Nom / Raison sociale</FormLabel>
        <Input
          placeholder="Ex: SARL Dupont"
          value={formData.destinataireSociete}
          onChange={(e) => setFormData(prev => ({ ...prev, destinataireSociete: e.target.value }))}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Nom de la personne</FormLabel>
        <Input
          placeholder="Ex: Jean Dupont"
          value={formData.destinataireName}
          onChange={(e) => setFormData(prev => ({ ...prev, destinataireName: e.target.value }))}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Adresse</FormLabel>
        <Textarea
          placeholder="Adresse complète"
          rows={3}
          value={formData.destinataireAdresse}
          onChange={(e) => setFormData(prev => ({ ...prev, destinataireAdresse: e.target.value }))}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Contacts (téléphone, email)</FormLabel>
        <Input
          placeholder="Tel: 01.23.45.67.89 / Email: contact@example.com"
          value={formData.destinataireContacts}
          onChange={(e) => setFormData(prev => ({ ...prev, destinataireContacts: e.target.value }))}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Description/Notes</FormLabel>
        <Textarea
          placeholder="Description générale du devis"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </FormControl>
    </VStack>
  );

  const renderStep3 = () => {
    // Mode IMPORT: Upload PDF + Montant optionnel
    if (creationMode === 'import') {
      return (
        <VStack spacing={4} align="stretch">
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text>Importez votre PDF de devis + montant (optionnel)</Text>
          </Alert>

          <FormControl isRequired>
            <FormLabel>Fichier PDF</FormLabel>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              pt={1}
            />
          </FormControl>

          {pdfFile && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <HStack w="100%" justify="space-between">
                <Text>✓ Fichier: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)}MB)</Text>
                <Button size="xs" colorScheme="blue" onClick={() => {
                  const url = URL.createObjectURL(pdfFile);
                  window.open(url, '_blank');
                }}>
                  👁️ Aperçu
                </Button>
              </HStack>
            </Alert>
          )}

          <Divider />

          <Heading size="sm">Informations financières (optionnel)</Heading>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Montant HT</FormLabel>
              <NumberInput
                min={0}
                step={0.01}
                value={totals.amountExcludingTax}
                onChange={(val) => {
                  const rate = totals.taxRate;
                  const taxAmount = parseFloat(val) * (rate / 100);
                  setTotals({
                    amountExcludingTax: parseFloat(val),
                    taxRate: rate,
                    taxAmount,
                    totalAmount: parseFloat(val) + taxAmount
                  });
                }}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>TVA (%)</FormLabel>
              <NumberInput
                isDisabled
                value={totals.taxRate}
              >
                <NumberInputField />
              </NumberInput>
              <Text fontSize="xs" color="gray.500" mt={2}>Association loi 1901 - Exonérée TVA (Article 239B CGI)</Text>
            </FormControl>
          </SimpleGrid>

          <Card bg={bgSection}>
            <CardBody>
              <VStack spacing={2} align="end">
                <HStack w="100%" justify="space-between">
                  <Text>Montant HT:</Text>
                  <Text fontWeight="bold">{totals.amountExcludingTax.toFixed(2)}€</Text>
                </HStack>
                <HStack w="100%" justify="space-between">
                  <Text>TVA:</Text>
                  <Text fontWeight="bold">{totals.taxAmount.toFixed(2)}€</Text>
                </HStack>
                <HStack w="100%" justify="space-between">
                  <Text fontSize="lg" fontWeight="bold">Total TTC:</Text>
                  <Text fontSize="lg" fontWeight="bold" color="rbe.500">{totals.totalAmount.toFixed(2)}€</Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      );
    }

    // Mode GÉNÉRATION: Tableau lignes
    return (
      <VStack spacing={4} align="stretch">
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text>Ajoutez les articles/services du devis</Text>
        </Alert>

        <Button colorScheme="rbe" leftIcon={<FiPlus />} onClick={addLine} size="sm">
          Ajouter une ligne
        </Button>

        {lines.length > 0 && (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr bg={bgSection}>
                  <Th>Description</Th>
                  <Th isNumeric>Quantité</Th>
                  <Th isNumeric>Prix unitaire</Th>
                  <Th isNumeric>Total</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {lines.map((line) => (
                  <Tr key={line.id}>
                    <Td>
                      <Input
                        size="sm"
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        border="none"
                      />
                    </Td>
                    <Td isNumeric>
                      <NumberInput
                        size="sm"
                        min={0}
                        step={1}
                        value={line.quantity}
                        onChange={(val) => updateLine(line.id, 'quantity', val)}
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
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </Td>
                    <Td isNumeric fontWeight="bold">{line.total.toFixed(2)}€</Td>
                    <Td>
                      <IconButton
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => removeLine(line.id)}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        <Divider />

        <Card bg={bgSection}>
          <CardBody>
            <VStack spacing={3} align="end">
              <HStack w="100%" justify="space-between">
                <Text>Montant HT:</Text>
                <Text fontWeight="bold">{totals.amountExcludingTax.toFixed(2)}€</Text>
              </HStack>

              <Alert status="warning" borderRadius="md" fontSize="sm" mb={2}>
                <AlertIcon />
                Association loi 1901 - TVA exonérée (Article 239B CGI)
              </Alert>
              <HStack w="100%" justify="space-between">
                <Text>TVA ({totals.taxRate}%):</Text>
                <Text fontWeight="bold">{totals.taxAmount.toFixed(2)}€</Text>
              </HStack>

              <Divider />

              <HStack w="100%" justify="space-between">
                <Text fontSize="lg" fontWeight="bold">Total TTC:</Text>
                <Text fontSize="lg" fontWeight="bold" color="rbe.500">{totals.totalAmount.toFixed(2)}€</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    );
  };

  const renderStep4 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text>Vérification avant création</Text>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">Devis</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2} fontSize="sm">
              <HStack><Text fontWeight="bold">Numéro:</Text><Text>{formData.number}</Text></HStack>
              <HStack><Text fontWeight="bold">Titre:</Text><Text>{formData.title}</Text></HStack>
              <HStack><Text fontWeight="bold">Date:</Text><Text>{formData.date}</Text></HStack>
              {formData.dueDate && <HStack><Text fontWeight="bold">Validité:</Text><Text>{formData.dueDate}</Text></HStack>}
            </VStack>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">Client</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={1} fontSize="sm">
              <Text fontWeight="bold">{formData.destinataireSociete}</Text>
              {formData.destinataireName && <Text>{formData.destinataireName}</Text>}
              <Text fontSize="xs" color="gray.600">{formData.destinataireAdresse}</Text>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {creationMode === 'generate' && (
        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">Montants</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2} fontSize="sm">
              <HStack><Text>Montant HT:</Text><Text fontWeight="bold">{totals.amountExcludingTax.toFixed(2)}€</Text></HStack>
              <HStack><Text>TVA ({totals.taxRate}%):</Text><Text fontWeight="bold">{totals.taxAmount.toFixed(2)}€</Text></HStack>
              <HStack><Text>Total TTC:</Text><Text fontWeight="bold" color="rbe.500" fontSize="lg">{totals.totalAmount.toFixed(2)}€</Text></HStack>
              <Text fontSize="xs">{lines.length} ligne(s)</Text>
            </VStack>
          </CardBody>
        </Card>
      )}

      {creationMode === 'import' && pdfFile && (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          <Text>PDF: <strong>{pdfFile.name}</strong></Text>
        </Alert>
      )}
    </VStack>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <Box w="100%">
      <VStack spacing={6} align="stretch">
        {/* Stepper */}
        <Box>
          <Stepper index={currentStep} colorScheme="rbe">
            {WIZARD_STEPS.map((step, index) => (
              <Step key={index}>
                <StepIndicator>
                  <StepStatus
                    complete={<StepIcon />}
                    incomplete={<StepNumber />}
                    active={<StepNumber />}
                  />
                </StepIndicator>
                <Box flexShrink={0}>
                  <StepTitle>{step.title}</StepTitle>
                  <StepDescription>{step.description}</StepDescription>
                </Box>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Contenu */}
        <Card bg={cardBg}>
          <CardBody>
            {stepRenderers[currentStep]()}
          </CardBody>
        </Card>

        {/* Navigation */}
        <HStack justify="space-between">
          <Button
            leftIcon={<FiChevronLeft />}
            onClick={handlePrev}
            isDisabled={currentStep === 0}
            variant="outline"
          >
            Précédent
          </Button>

          <Badge colorScheme="gray">
            Étape {currentStep + 1} / {WIZARD_STEPS.length}
          </Badge>

          {currentStep === WIZARD_STEPS.length - 1 ? (
            <Button
              rightIcon={<FiCheck />}
              colorScheme="rbe"
              onClick={handleSave}
              isLoading={saving}
            >
              Créer le devis
            </Button>
          ) : (
            <Button
              rightIcon={<FiChevronRight />}
              colorScheme="rbe"
              onClick={handleNext}
              isDisabled={!stepsComplete[currentStep]}
            >
              Suivant
            </Button>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}
