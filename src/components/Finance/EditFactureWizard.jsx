/**
 * EditFactureWizard.jsx
 * Wizard 4 étapes pour ÉDITER une FACTURE existante
 * Édition: Infos → Lignes & Montants → Paiement → Vérification
 */

import React, { useState, useCallback, useEffect } from 'react';
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
  SimpleGrid,
  Alert,
  AlertIcon,
  Divider,
  useColorModeValue,
  useToast,
  IconButton,
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
} from '@chakra-ui/react';
import { FiChevronRight, FiChevronLeft, FiPlus, FiTrash2 } from 'react-icons/fi';

const WIZARD_STEPS = [
  { title: 'Infos Facture', description: 'Détails de la facture' },
  { title: 'Lignes & Montants', description: 'Articles et prix' },
  { title: 'Paiement', description: 'Conditions de paiement' },
  { title: 'Vérification', description: 'Aperçu final' }
];

export default function EditFactureWizard({ editingDocument, onSave = () => {}, onClose = () => {} }) {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgSection = useColorModeValue('gray.50', 'gray.900');

  const [currentStep, setCurrentStep] = useState(0);
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
    notes: '',
    paymentTerms: '30',
    paymentMethod: 'virement',
    devisReference: ''
  });

  const [lines, setLines] = useState([]);
  const [addingLineType, setAddingLineType] = useState(null);
  const [totals, setTotals] = useState({
    amountExcludingTax: 0,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 0
  });

  const [saving, setSaving] = useState(false);

  // Charger les données du document au démarrage
  useEffect(() => {
    if (editingDocument) {
      setFormData({
        number: editingDocument.number || '',
        title: editingDocument.title || '',
        description: editingDocument.description || '',
        date: (editingDocument.date || new Date().toISOString()).slice(0, 10),
        dueDate: editingDocument.dueDate ? editingDocument.dueDate.slice(0, 10) : '',
        destinataireName: editingDocument.destinataireName || '',
        destinataireAdresse: editingDocument.destinataireAdresse || '',
        destinataireSociete: editingDocument.destinataireSociete || '',
        destinataireContacts: editingDocument.destinataireContacts || '',
        notes: editingDocument.notes || '',
        paymentTerms: editingDocument.paymentTerms || '30',
        paymentMethod: editingDocument.paymentMethod || 'virement',
        devisReference: editingDocument.devisReference || ''
      });

      // Charger les lignes du document
      loadLines();

      // Charger les montants
      setTotals({
        amountExcludingTax: editingDocument.amountExcludingTax || 0,
        taxRate: editingDocument.taxRate || 0,
        taxAmount: editingDocument.taxAmount || 0,
        totalAmount: editingDocument.amount || 0
      });
    }
  }, [editingDocument]);

  const loadLines = async () => {
    if (!editingDocument?.id) return;
    try {
      const response = await fetch(
        (import.meta.env.VITE_API_URL || "http://localhost:4000") + `/api/facture-lines/${editingDocument.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );
      if (response.ok) {
        const loadedLines = await response.json();
        if (Array.isArray(loadedLines)) {
          setLines(loadedLines.map(line => ({
            id: line.id || Date.now() + Math.random(),
            type: line.type || 'ARTICLE',
            description: line.description || '',
            quantity: line.quantity || (line.type && line.type !== 'ARTICLE' ? undefined : 1),
            unitPrice: line.unitPrice || (line.type && line.type !== 'ARTICLE' ? undefined : 0),
            total: line.total || line.totalPrice || (line.quantity || 1) * (line.unitPrice || 0),
            amount: line.amount || (line.type && line.type !== 'ARTICLE' ? 0 : undefined)
          })));
        }
      }
    } catch (e) {
      console.warn('⚠️ Impossible de charger les lignes:', e.message);
    }
  };

  const isStep1Complete = formData.number.trim() && formData.title.trim() && formData.date;
  const isStep2Complete = true;
  const isStep3Complete = true;
  const isStep4Complete = true;
  const stepsComplete = [isStep1Complete, isStep2Complete, isStep3Complete, isStep4Complete];

  const addLine = () => {
    setLines([...lines, {
      id: Date.now(),
      type: 'ARTICLE',
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      amount: 0
    }]);
  };

  const addLineOfType = (type) => {
    setLines([...lines, {
      id: Date.now(),
      type: type,
      description: '',
      quantity: type === 'ARTICLE' ? 1 : undefined,
      unitPrice: type === 'ARTICLE' ? 0 : undefined,
      total: 0,
      amount: type !== 'ARTICLE' ? 0 : undefined
    }]);
    setAddingLineType(null);
  };

  const updateLine = (id, field, value) => {
    const updatedLines = lines.map(line => {
      if (line.id === id) {
        let processedValue = value;
        if ((field === 'quantity' || field === 'unitPrice' || field === 'amount') && value !== '') {
          processedValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
        }
        const updated = { ...line, [field]: processedValue };
        
        if (line.type === 'ARTICLE' && (field === 'quantity' || field === 'unitPrice')) {
          updated.total = (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        if (line.type !== 'ARTICLE' && field === 'amount') {
          updated.total = -Math.abs(processedValue);
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
    const articleLines = linesList.filter(l => l.type === 'ARTICLE');
    const articleAmount = articleLines.reduce((sum, line) => sum + (line.total || 0), 0);
    
    const adjustmentLines = linesList.filter(l => l.type !== 'ARTICLE');
    const adjustmentAmount = adjustmentLines.reduce((sum, line) => sum + (line.total || 0), 0);
    
    const amountExcludingTax = Math.max(0, articleAmount + adjustmentAmount);
    
    setTotals({
      amountExcludingTax,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: amountExcludingTax
    });
  }, []);

  const handleSave = async () => {
    if (!isStep1Complete) {
      toast({ status: 'error', title: 'Complétez les infos de la facture', duration: 2000 });
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        id: editingDocument.id,
        ...formData,
        lines,
        totals
      };

      await onSave(dataToSave);

      toast({
        status: 'success',
        title: 'Facture modifiée avec succès! 🎉',
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

  const renderStep1 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text>Modifiez les informations de la facture</Text>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl isRequired>
          <FormLabel>Numéro de facture</FormLabel>
          <Input
            placeholder="FAC-2026-001"
            value={formData.number}
            onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Titre</FormLabel>
          <Input
            placeholder="Titre de la facture"
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
          <FormLabel>Date d'échéance</FormLabel>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
          />
        </FormControl>
      </SimpleGrid>

      <Divider />

      <Heading size="sm">Destinataire</Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel>Raison sociale</FormLabel>
          <Input
            value={formData.destinataireSociete}
            onChange={(e) => setFormData(prev => ({ ...prev, destinataireSociete: e.target.value }))}
            placeholder="Nom de l'entreprise/association"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Interlocuteur</FormLabel>
          <Input
            value={formData.destinataireName}
            onChange={(e) => setFormData(prev => ({ ...prev, destinataireName: e.target.value }))}
            placeholder="Nom du contact"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Adresse</FormLabel>
          <Input
            value={formData.destinataireAdresse}
            onChange={(e) => setFormData(prev => ({ ...prev, destinataireAdresse: e.target.value }))}
            placeholder="Adresse complète"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Contacts</FormLabel>
          <Input
            value={formData.destinataireContacts}
            onChange={(e) => setFormData(prev => ({ ...prev, destinataireContacts: e.target.value }))}
            placeholder="Tél./Email"
          />
        </FormControl>
      </SimpleGrid>

      <FormControl>
        <FormLabel>Référence devis</FormLabel>
        <Input
          value={formData.devisReference}
          onChange={(e) => setFormData(prev => ({ ...prev, devisReference: e.target.value }))}
          placeholder="Numéro du devis initial"
        />
      </FormControl>

      <FormControl>
        <FormLabel>Notes/Conditions spéciales</FormLabel>
        <Textarea
          placeholder="Notes de la facture"
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </FormControl>
    </VStack>
  );

  const renderStep2 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text>Modifiez les articles/services de la facture + ajoutez réductions/remises/acomptes</Text>
      </Alert>

      <HStack spacing={2} flexWrap="wrap">
        <Button colorScheme="rbe" leftIcon={<FiPlus />} onClick={() => addLineOfType('ARTICLE')} size="sm">
          Article
        </Button>
        <Button colorScheme="orange" leftIcon={<FiPlus />} onClick={() => addLineOfType('REDUCTION')} size="sm">
          Réduction
        </Button>
        <Button colorScheme="yellow" leftIcon={<FiPlus />} onClick={() => addLineOfType('REMISE')} size="sm">
          Remise
        </Button>
        <Button colorScheme="blue" leftIcon={<FiPlus />} onClick={() => addLineOfType('ACOMPTE_A_VERSER')} size="sm">
          Acompte à verser
        </Button>
        <Button colorScheme="green" leftIcon={<FiPlus />} onClick={() => addLineOfType('ACOMPTE_VERSE')} size="sm">
          Acompte versé
        </Button>
      </HStack>

      {lines.length > 0 && (
        <Box overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr bg={bgSection}>
                <Th>Type</Th>
                <Th>Description</Th>
                <Th isNumeric>Qt</Th>
                <Th isNumeric>P.U.</Th>
                <Th isNumeric>Montant</Th>
                <Th isNumeric>Total</Th>
                <Th>Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {lines.map((line) => (
                <Tr key={line.id} opacity={line.type !== 'ARTICLE' ? 0.9 : 1} bg={line.type !== 'ARTICLE' ? 'orange.50' : undefined}>
                  <Td fontSize="xs" fontWeight="bold">
                    {line.type === 'ARTICLE' && '📦 Article'}
                    {line.type === 'REDUCTION' && '↓ Réduction'}
                    {line.type === 'REMISE' && '💰 Remise'}
                    {line.type === 'ACOMPTE_A_VERSER' && '⏳ À verser'}
                    {line.type === 'ACOMPTE_VERSE' && '✅ Versé'}
                  </Td>
                  <Td>
                    <Input
                      size="sm"
                      placeholder={line.type === 'ARTICLE' ? 'Description article' : 'Description'}
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                      border="none"
                    />
                  </Td>
                  <Td isNumeric>
                    {line.type === 'ARTICLE' && (
                      <NumberInput
                        size="sm"
                        min={0}
                        step={1}
                        value={line.quantity || ''}
                        onChange={(val) => updateLine(line.id, 'quantity', val)}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    )}
                  </Td>
                  <Td isNumeric>
                    {line.type === 'ARTICLE' && (
                      <NumberInput
                        size="sm"
                        min={0}
                        step={0.01}
                        value={line.unitPrice || ''}
                        onChange={(val) => updateLine(line.id, 'unitPrice', val)}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    )}
                  </Td>
                  <Td isNumeric>
                    {line.type !== 'ARTICLE' && (
                      <NumberInput
                        size="sm"
                        min={0}
                        step={0.01}
                        value={line.amount || ''}
                        onChange={(val) => updateLine(line.id, 'amount', val)}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    )}
                  </Td>
                  <Td isNumeric fontWeight="bold" color={line.total < 0 ? 'red.500' : 'inherit'}>
                    {line.total.toFixed(2)}€
                  </Td>
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

            <Alert status="warning" borderRadius="md" fontSize="sm">
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

  const renderStep3 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text>Conditions de paiement de la facture</Text>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel>Mode de paiement</FormLabel>
          <Input
            value={formData.paymentMethod}
            onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
            placeholder="ex: Virement, Espèces, Chèque"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Délai de paiement (jours)</FormLabel>
          <Input
            value={formData.paymentTerms}
            onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
            placeholder="30"
          />
        </FormControl>
      </SimpleGrid>

      <Card bg={bgSection}>
        <CardBody>
          <VStack spacing={3} align="stretch">
            <Heading size="sm">Résumé financier</Heading>
            <HStack justify="space-between">
              <Text>Montant HT:</Text>
              <Text fontWeight="bold">{totals.amountExcludingTax.toFixed(2)}€</Text>
            </HStack>
            <HStack justify="space-between">
              <Text>TVA ({totals.taxRate}%):</Text>
              <Text fontWeight="bold">{totals.taxAmount.toFixed(2)}€</Text>
            </HStack>
            <Divider />
            <HStack justify="space-between">
              <Text fontSize="lg" fontWeight="bold">Total TTC:</Text>
              <Text fontSize="lg" fontWeight="bold" color="rbe.500">{totals.totalAmount.toFixed(2)}€</Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );

  const renderStep4 = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text>Vérification avant modification</Text>
      </Alert>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm">Facture</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={2} fontSize="sm">
              <HStack><Text fontWeight="bold">Numéro:</Text><Text>{formData.number}</Text></HStack>
              <HStack><Text fontWeight="bold">Titre:</Text><Text>{formData.title}</Text></HStack>
              <HStack><Text fontWeight="bold">Date:</Text><Text>{formData.date}</Text></HStack>
              {formData.dueDate && <HStack><Text fontWeight="bold">Échéance:</Text><Text>{formData.dueDate}</Text></HStack>}
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

      <Card bg={cardBg}>
        <CardHeader>
          <Heading size="sm">Montants</Heading>
        </CardHeader>
        <CardBody>
          <VStack align="start" spacing={2} fontSize="sm">
            <HStack><Text>Montant HT:</Text><Text fontWeight="bold">{totals.amountExcludingTax.toFixed(2)}€</Text></HStack>
            <HStack><Text>TVA ({totals.taxRate}%):</Text><Text fontWeight="bold">{totals.taxAmount.toFixed(2)}€</Text></HStack>
            <HStack><Text>Total TTC:</Text><Text fontWeight="bold" color="rbe.500" fontSize="lg">{totals.totalAmount.toFixed(2)}€</Text></HStack>
            <Divider />
            <HStack><Text>Mode paiement:</Text><Text fontWeight="bold">{formData.paymentMethod}</Text></HStack>
            <HStack><Text>Délai:</Text><Text fontWeight="bold">{formData.paymentTerms} jours</Text></HStack>
            <Text fontSize="xs">{lines.length} ligne(s)</Text>
          </VStack>
        </CardBody>
      </Card>
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

        {/* Boutons navigation */}
        <HStack spacing={3} justify="space-between">
          <Button
            variant="outline"
            leftIcon={<FiChevronLeft />}
            onClick={handlePrev}
            isDisabled={currentStep === 0}
          >
            Précédent
          </Button>

          {currentStep === WIZARD_STEPS.length - 1 ? (
            <Button
              colorScheme="green"
              rightIcon={<FiChevronRight />}
              onClick={handleSave}
              isLoading={saving}
            >
              Enregistrer les modifications
            </Button>
          ) : (
            <Button
              colorScheme="rbe"
              rightIcon={<FiChevronRight />}
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
