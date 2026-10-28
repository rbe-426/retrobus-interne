/**
 * DevisWizard.jsx
 * Éditeur plein écran de DEVIS / FACTURE (création + édition) avec fil d'Ariane.
 *
 * Étapes :
 * 1. Document  : type, mode (template / import PDF), client, devis source (facture)
 * 2. Prépa tarifaire : profil véhicule + trajet (points d'arrêt, calcul distance) -> lignes
 * 3. Lignes & remises : catalogue d'articles, remises, TVA, acompte
 * 4. Modèle & validation : template balisé, notes, aperçu final
 *
 * Un aperçu en direct du template est affiché à droite dès l'étape 2.
 * Toutes les données d'édition sont sauvegardées dans `pricing` (JSON) pour
 * pouvoir rééditer le devis puis générer la facture à partir de celui-ci.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, VStack, HStack, Button, Heading, Text, Card, CardBody, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Stepper, Step, StepIndicator, StepStatus,
  StepIcon, StepNumber, StepTitle, StepDescription, StepSeparator, FormControl, FormLabel, Input,
  Textarea, SimpleGrid, Alert, AlertIcon, Badge, Divider, useColorModeValue, useToast, IconButton,
  RadioGroup, Radio, Stack, NumberInput, NumberInputField, Table, Thead, Tbody, Tr, Th, Td, Select,
  Checkbox, Switch, Grid, GridItem, Tooltip, Spinner
} from '@chakra-ui/react';
import {
  FiFileText, FiUpload, FiCheck, FiPlus, FiTrash2, FiChevronRight, FiChevronLeft, FiMapPin,
  FiTruck, FiPrinter, FiBook, FiSave, FiRefreshCw
} from 'react-icons/fi';
import { fetchWithCSRF } from '../../lib/csrfClient.js';
import { computeRoute } from '../../lib/routeCalc.js';
import {
  DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_ID, computeTotals, formatEUR, lineTotal, printHtml,
  renderTemplate, toPreviewDocument
} from '../../lib/quoteTemplate.js';
import RouteMap from './RouteMap.jsx';
import ArticleCatalogManager, { fetchArticles, saveArticle } from './ArticleCatalogManager.jsx';

const KM_RATE_DEFAULT = 1.2; // tarif de location au km, modifiable
const newId = () => `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().split('T')[0];
const toDay = (v) => (v ? String(v).slice(0, 10) : '');
const num = (v) => (Number.isNaN(Number(v)) ? 0 : Number(v));

const emptyPricing = () => ({
  vehicle: {
    vehicleId: null, label: '', startDate: '', endDate: '', days: 1,
    dailyRate: 0, includeDriver: false, driverDailyRate: 0
  },
  trip: {
    addresses: ['', ''], roundTrip: false, kmRate: KM_RATE_DEFAULT,
    points: [], geometry: [], distanceKm: null, durationMin: null, source: null
  },
  lines: [],
  discount: { mode: 'percent', value: 0 },
  taxRate: 0, // association loi 1901 : pas de TVA par défaut
  deposit: 0
});

const emptyForm = (type = 'QUOTE') => ({
  type, mode: 'template', number: '', title: '', description: '', date: today(), dueDate: '',
  clientName: '', clientCompany: '', clientAddress: '', clientContacts: '',
  notes: '', paymentTerms: '30', templateId: DEFAULT_TEMPLATE_ID,
  eventId: '', memberId: '', sourceQuoteId: null, sourceQuoteNumber: ''
});

const parsePricing = (raw) => {
  if (!raw) return null;
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const base = emptyPricing();
    return {
      ...base, ...p,
      vehicle: { ...base.vehicle, ...(p.vehicle || {}) },
      trip: { ...base.trip, ...(p.trip || {}) },
      discount: { ...base.discount, ...(p.discount || {}) },
      lines: Array.isArray(p.lines) ? p.lines : []
    };
  } catch {
    return null;
  }
};

const daysBetween = (start, end) => {
  if (!start || !end) return null;
  const diff = Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
  return diff > 0 ? diff : null;
};

/** Aperçu en direct : iframe sans scripts, le HTML du template n'est jamais injecté dans la page. */
function LivePreview({ html, height }) {
  return (
    <Box borderWidth="1px" borderRadius="md" bg="white" overflow="hidden">
      <iframe
        title="Aperçu du document"
        sandbox=""
        srcDoc={toPreviewDocument(html)}
        style={{ width: '100%', height, border: 0, background: '#fff' }}
      />
    </Box>
  );
}

export default function DevisWizard({
  isOpen, onClose, onSave, editingDocument = null, initialType = 'QUOTE', sourceQuote = null, documents = []
}) {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm());
  const [pricing, setPricing] = useState(emptyPricing());
  const [uploadedFile, setUploadedFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState([]);
  const [templates, setTemplates] = useState([DEFAULT_TEMPLATE]);
  const [articles, setArticles] = useState([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  const isEdit = !!editingDocument?.id;
  const isInvoice = form.type === 'INVOICE';
  const isImport = form.mode === 'import';
  const docLabel = isInvoice ? 'Facture' : 'Devis';

  const quotes = useMemo(() => documents.filter(d => d.type === 'QUOTE'), [documents]);

  // === INITIALISATION À L'OUVERTURE ===
  const applySourceQuote = useCallback((quote) => {
    const stored = parsePricing(quote.pricingData);
    const base = stored || {
      ...emptyPricing(),
      lines: [{
        id: newId(), type: 'ARTICLE', description: quote.title || 'Prestation', quantity: 1, unit: 'forfait',
        unitPrice: num(quote.amountExcludingTax || quote.amount), discountPct: 0
      }]
    };
    setPricing({ ...base, lines: base.lines.map(l => ({ ...l, id: newId() })) });
    setForm(f => ({
      ...f,
      title: quote.title || f.title,
      description: quote.description || '',
      clientName: quote.destinataireName || '',
      clientCompany: quote.destinataireSociete || '',
      clientAddress: quote.destinataireAdresse || '',
      clientContacts: quote.destinataireContacts || '',
      notes: quote.notes || '',
      eventId: quote.eventId || '',
      memberId: quote.memberId || '',
      templateId: quote.templateId || f.templateId,
      sourceQuoteId: quote.id,
      sourceQuoteNumber: quote.number || ''
    }));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setUploadedFile(null);
    setRouteError('');

    if (editingDocument) {
      const d = editingDocument;
      const stored = parsePricing(d.pricingData);
      setForm({
        ...emptyForm(d.type), mode: d.documentUrl && !d.pricingData ? 'import' : 'template',
        number: d.number || '', title: d.title || '', description: d.description || '',
        date: toDay(d.date) || today(), dueDate: toDay(d.dueDate),
        clientName: d.destinataireName || '', clientCompany: d.destinataireSociete || '',
        clientAddress: d.destinataireAdresse || '', clientContacts: d.destinataireContacts || '',
        notes: d.notes || '', paymentTerms: d.paymentTerms || '30',
        templateId: d.templateId || DEFAULT_TEMPLATE_ID, eventId: d.eventId || '', memberId: d.memberId || ''
      });
      setPricing(stored || {
        ...emptyPricing(),
        taxRate: num(d.taxRate),
        lines: [{
          id: newId(), type: 'ARTICLE', description: d.title || 'Prestation', quantity: 1, unit: 'forfait',
          unitPrice: num(d.amountExcludingTax || d.amount), discountPct: 0
        }]
      });
      return;
    }

    setForm(emptyForm(sourceQuote ? 'INVOICE' : initialType));
    setPricing(emptyPricing());
    if (sourceQuote) applySourceQuote(sourceQuote);
  }, [isOpen, editingDocument, sourceQuote, initialType, applySourceQuote]);

  // === DONNÉES DE RÉFÉRENCE (véhicules, templates, articles) ===
  const loadArticles = useCallback(async () => {
    try { setArticles((await fetchArticles()).filter(a => a.isActive)); } catch { setArticles([]); }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadArticles();
    (async () => {
      try {
        const res = await fetchWithCSRF('/api/vehicles');
        const data = res.ok ? await res.json() : [];
        setVehicles(Array.isArray(data) ? data : []);
      } catch { setVehicles([]); }
      try {
        const res = await fetchWithCSRF('/api/quote-templates');
        const data = res.ok ? await res.json() : [];
        setTemplates([DEFAULT_TEMPLATE, ...(Array.isArray(data) ? data.filter(t => t.isActive !== false) : [])]);
      } catch { setTemplates([DEFAULT_TEMPLATE]); }
    })();
  }, [isOpen, loadArticles]);

  // === CALCULS & APERÇU ===
  const totals = useMemo(() => computeTotals(pricing), [pricing]);
  const template = templates.find(t => t.id === form.templateId) || DEFAULT_TEMPLATE;

  const docForRender = useMemo(() => ({ ...form, pricing }), [form, pricing]);
  const html = useMemo(() => renderTemplate(template, docForRender), [template, docForRender]);

  const setF = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setVehicle = (patch) => setPricing(p => ({ ...p, vehicle: { ...p.vehicle, ...patch } }));
  const setTrip = (patch) => setPricing(p => ({ ...p, trip: { ...p.trip, ...patch } }));

  // === PRÉPA TARIFAIRE : véhicule ===
  const handleVehicleChange = (e) => {
    const v = vehicles.find(x => String(x.id) === e.target.value);
    setVehicle({
      vehicleId: v ? v.id : null,
      label: v ? [v.parc, [v.marque, v.modele].filter(Boolean).join(' '), v.immat].filter(Boolean).join(' – ') : ''
    });
  };

  const handleDates = (field, value) => {
    const next = { ...pricing.vehicle, [field]: value };
    const d = daysBetween(next.startDate, next.endDate);
    setVehicle({ [field]: value, ...(d ? { days: d } : {}) });
  };

  // === PRÉPA TARIFAIRE : trajet ===
  const updateAddress = (i, value) =>
    setTrip({ addresses: pricing.trip.addresses.map((a, idx) => (idx === i ? value : a)) });
  const addStop = () => {
    const a = [...pricing.trip.addresses];
    a.splice(a.length - 1, 0, ''); // insère un arrêt avant l'arrivée
    setTrip({ addresses: a });
  };
  const removeStop = (i) => setTrip({ addresses: pricing.trip.addresses.filter((_, idx) => idx !== i) });

  const handleComputeRoute = async () => {
    setRouteLoading(true);
    setRouteError('');
    try {
      const r = await computeRoute(pricing.trip.addresses, { roundTrip: pricing.trip.roundTrip });
      setTrip({
        points: r.points, geometry: r.geometry, distanceKm: r.distanceKm,
        durationMin: r.durationMin, source: r.source,
        addresses: pricing.trip.addresses.map((a, i) => (a.trim() && r.points[i] ? r.points[i].label : a))
      });
      if (r.warning) setRouteError(r.warning);
    } catch (e) {
      setRouteError(e.message);
    } finally {
      setRouteLoading(false);
    }
  };

  // === GÉNÉRATION DES LIGNES DEPUIS LA PRÉPA ===
  const generateLinesFromPrep = () => {
    const { vehicle, trip } = pricing;
    const generated = [];
    const days = Math.max(1, num(vehicle.days));
    if (vehicle.label && num(vehicle.dailyRate) > 0) {
      generated.push({
        id: newId(), source: 'prep', type: 'ARTICLE', description: `Location ${vehicle.label}`,
        quantity: days, unit: days > 1 ? 'jours' : 'jour', unitPrice: num(vehicle.dailyRate), discountPct: 0
      });
    }
    if (vehicle.includeDriver && num(vehicle.driverDailyRate) > 0) {
      generated.push({
        id: newId(), source: 'prep', type: 'ARTICLE', description: 'Mise à disposition du conducteur',
        quantity: days, unit: days > 1 ? 'jours' : 'jour', unitPrice: num(vehicle.driverDailyRate), discountPct: 0
      });
    }
    if (trip.distanceKm && num(trip.kmRate) > 0) {
      generated.push({
        id: newId(), source: 'prep', type: 'ARTICLE',
        description: `Kilométrage${trip.roundTrip ? ' (aller-retour)' : ''}`,
        quantity: Math.round(trip.distanceKm * 10) / 10, unit: 'km', unitPrice: num(trip.kmRate), discountPct: 0
      });
    }
    if (!generated.length) {
      toast({ status: 'warning', title: 'Rien à générer', description: 'Renseignez le véhicule, le tarif journalier ou calculez un trajet.' });
      return;
    }
    setPricing(p => ({ ...p, lines: [...p.lines.filter(l => l.source !== 'prep'), ...generated] }));
    toast({ status: 'success', title: `${generated.length} ligne(s) générée(s)`, duration: 2500 });
  };

  // === LIGNES ===
  const addLine = (partial = {}) => setPricing(p => ({
    ...p,
    lines: [...p.lines, {
      id: newId(), type: 'ARTICLE', description: '', quantity: 1, unit: 'unité', unitPrice: 0, discountPct: 0, ...partial
    }]
  }));
  const updateLine = (id, patch) =>
    setPricing(p => ({ ...p, lines: p.lines.map(l => (l.id === id ? { ...l, ...patch } : l)) }));
  const removeLine = (id) => setPricing(p => ({ ...p, lines: p.lines.filter(l => l.id !== id) }));

  const addArticleLine = (articleId) => {
    const a = articles.find(x => x.id === articleId);
    if (!a) return;
    addLine({ description: a.description ? `${a.name} – ${a.description}` : a.name, unit: a.unit || 'unité', unitPrice: a.unitPrice, articleId: a.id });
  };

  const saveLineToCatalog = async (line) => {
    if (!line.description.trim()) return;
    try {
      await saveArticle({ name: line.description.trim(), unit: line.unit, unitPrice: num(line.unitPrice) });
      await loadArticles();
      toast({ status: 'success', title: 'Ajouté au catalogue', duration: 2000 });
    } catch (e) {
      toast({ status: 'error', title: 'Erreur catalogue', description: e.message });
    }
  };

  // === VALIDATION ===
  const stepValid = (s) => {
    if (s === 0) return !!form.title.trim() && !!form.clientName.trim() && (!isImport || !!uploadedFile || isEdit);
    if (s === 2) return isImport || pricing.lines.length > 0;
    return true;
  };
  const stepHint = (s) => {
    if (s === 0) return 'Titre et nom du client requis' + (isImport ? ' (+ PDF)' : '');
    if (s === 2) return 'Ajoutez au moins une ligne';
    return '';
  };

  const steps = [
    { title: 'Document', description: docLabel },
    { title: 'Prépa tarifaire', description: 'Véhicule & trajet' },
    { title: 'Lignes', description: 'Articles & remises' },
    { title: 'Validation', description: 'Modèle & aperçu' }
  ];
  const visibleSteps = isImport ? [steps[0], steps[2], steps[3]] : steps;
  // en mode import l'étape « Prépa tarifaire » est sautée
  const stepIndexInVisible = isImport && step > 1 ? step - 1 : step;

  const goNext = () => {
    if (!stepValid(step)) { toast({ status: 'warning', title: stepHint(step) }); return; }
    setStep(s => (isImport && s === 0 ? 2 : Math.min(3, s + 1)));
  };
  const goPrev = () => setStep(s => (isImport && s === 2 ? 0 : Math.max(0, s - 1)));

  // === SAUVEGARDE ===
  const handleSave = async () => {
    if (!stepValid(0) || !stepValid(2)) {
      toast({ status: 'warning', title: 'Document incomplet', description: stepHint(!stepValid(0) ? 0 : 2) });
      return;
    }
    setSaving(true);
    try {
      let docNumber = form.number.trim();
      if (!docNumber) {
        const d = new Date();
        const stamp = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        docNumber = `${isInvoice ? 'FACT' : 'DEV'}-${stamp}-${Math.floor(Math.random() * 9000 + 1000)}`;
      }
      const finalDoc = { ...form, number: docNumber, pricing };
      await onSave({
        id: editingDocument?.id || null,
        ...finalDoc,
        totals: { subtotal: totals.netHT, taxRate: totals.taxRate, taxAmount: totals.taxAmount, total: totals.total },
        pricing,
        htmlContent: isImport ? null : renderTemplate(template, finalDoc),
        uploadedFile: isImport ? uploadedFile : null
      });
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({ status: 'error', title: 'Erreur de sauvegarde', description: error.message || 'Réessayez' });
    } finally {
      setSaving(false);
    }
  };

  // === RENDU DES ÉTAPES ===
  const renderStepDocument = () => (
    <VStack spacing={5} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel>Type de document</FormLabel>
          <RadioGroup
            value={form.type}
            onChange={(v) => !isEdit && setForm(f => ({ ...f, type: v }))}
            isDisabled={isEdit}
          >
            <Stack direction="row"><Radio value="QUOTE">Devis</Radio><Radio value="INVOICE">Facture</Radio></Stack>
          </RadioGroup>
        </FormControl>
        <FormControl>
          <FormLabel>Mode</FormLabel>
          <RadioGroup value={form.mode} onChange={(v) => setForm(f => ({ ...f, mode: v }))}>
            <Stack direction="row"><Radio value="template">Modèle (recommandé)</Radio><Radio value="import">Import d'un PDF</Radio></Stack>
          </RadioGroup>
        </FormControl>
      </SimpleGrid>

      {isInvoice && !isEdit && (
        <FormControl>
          <FormLabel>Générer depuis un devis</FormLabel>
          <Select
            placeholder="— Facture libre —"
            value={form.sourceQuoteId || ''}
            onChange={(e) => {
              const q = quotes.find(x => x.id === e.target.value);
              if (q) applySourceQuote(q);
              else setForm(f => ({ ...f, sourceQuoteId: null, sourceQuoteNumber: '' }));
            }}
          >
            {quotes.map(q => <option key={q.id} value={q.id}>{q.number} – {q.title} ({formatEUR(q.amount)})</option>)}
          </Select>
          {form.sourceQuoteId && (
            <Text fontSize="xs" color="gray.500" mt={1}>
              Lignes, remises, véhicule et trajet du devis {form.sourceQuoteNumber} repris. Vous pouvez les ajuster.
            </Text>
          )}
        </FormControl>
      )}

      {isImport && (
        <FormControl>
          <FormLabel>PDF du document</FormLabel>
          <Button as="label" leftIcon={<FiUpload />} cursor="pointer" variant="outline">
            {uploadedFile ? uploadedFile.name : (isEdit && editingDocument?.documentUrl ? 'Remplacer le PDF' : 'Choisir un PDF')}
            <input type="file" accept="application/pdf" hidden onChange={(e) => setUploadedFile(e.target.files?.[0] || null)} />
          </Button>
        </FormControl>
      )}

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <FormControl><FormLabel>Numéro</FormLabel><Input placeholder="Auto si vide" value={form.number} onChange={setF('number')} /></FormControl>
        <FormControl><FormLabel>Date</FormLabel><Input type="date" value={form.date} onChange={setF('date')} /></FormControl>
        <FormControl><FormLabel>{isInvoice ? 'Échéance' : 'Valable jusqu\'au'}</FormLabel><Input type="date" value={form.dueDate} onChange={setF('dueDate')} /></FormControl>
      </SimpleGrid>

      <FormControl isRequired><FormLabel>Objet</FormLabel><Input placeholder="Ex : Tournage clip – location bus de collection" value={form.title} onChange={setF('title')} /></FormControl>

      <Divider />
      <Heading size="sm">Client</Heading>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl isRequired><FormLabel>Nom</FormLabel><Input value={form.clientName} onChange={setF('clientName')} /></FormControl>
        <FormControl><FormLabel>Société</FormLabel><Input value={form.clientCompany} onChange={setF('clientCompany')} /></FormControl>
        <FormControl><FormLabel>Adresse</FormLabel><Textarea rows={2} value={form.clientAddress} onChange={setF('clientAddress')} /></FormControl>
        <FormControl><FormLabel>Contacts (email, téléphone)</FormLabel><Textarea rows={2} value={form.clientContacts} onChange={setF('clientContacts')} /></FormControl>
      </SimpleGrid>
    </VStack>
  );

  const { vehicle, trip } = pricing;

  const renderStepPrep = () => (
    <VStack spacing={5} align="stretch">
      <Card variant="outline" bg={cardBg}>
        <CardBody>
          <HStack mb={3}><FiTruck /><Heading size="sm">Profil véhicule</Heading></HStack>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl gridColumn={{ md: 'span 2' }}>
              <FormLabel>Véhicule</FormLabel>
              <Select placeholder="Sélectionner un véhicule du parc" value={vehicle.vehicleId ?? ''} onChange={handleVehicleChange}>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.parc} – {[v.marque, v.modele].filter(Boolean).join(' ')}{v.immat ? ` (${v.immat})` : ''}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl><FormLabel>Début de la prestation</FormLabel><Input type="date" value={vehicle.startDate} onChange={(e) => handleDates('startDate', e.target.value)} /></FormControl>
            <FormControl><FormLabel>Fin de la prestation</FormLabel><Input type="date" value={vehicle.endDate} onChange={(e) => handleDates('endDate', e.target.value)} /></FormControl>
            <FormControl>
              <FormLabel>Nombre de jours</FormLabel>
              <NumberInput min={1} value={vehicle.days} onChange={(_, v) => setVehicle({ days: Number.isNaN(v) ? 1 : v })}><NumberInputField /></NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Tarif journalier (€)</FormLabel>
              <NumberInput min={0} value={vehicle.dailyRate} onChange={(_, v) => setVehicle({ dailyRate: Number.isNaN(v) ? 0 : v })}><NumberInputField /></NumberInput>
            </FormControl>
            <FormControl display="flex" alignItems="center">
              <Switch id="with-driver" isChecked={vehicle.includeDriver} onChange={(e) => setVehicle({ includeDriver: e.target.checked })} mr={2} />
              <FormLabel htmlFor="with-driver" mb={0}>Avec conducteur</FormLabel>
            </FormControl>
            {vehicle.includeDriver && (
              <FormControl>
                <FormLabel>Conducteur / jour (€)</FormLabel>
                <NumberInput min={0} value={vehicle.driverDailyRate} onChange={(_, v) => setVehicle({ driverDailyRate: Number.isNaN(v) ? 0 : v })}><NumberInputField /></NumberInput>
              </FormControl>
            )}
          </SimpleGrid>
        </CardBody>
      </Card>

      <Card variant="outline" bg={cardBg}>
        <CardBody>
          <HStack mb={3}><FiMapPin /><Heading size="sm">Trajet & points d'arrêt</Heading></HStack>
          <VStack align="stretch" spacing={2}>
            {trip.addresses.map((addr, i) => {
              const last = i === trip.addresses.length - 1;
              const label = i === 0 ? 'Départ' : last ? 'Arrivée' : `Arrêt ${i}`;
              return (
                <HStack key={i}>
                  <Badge w="70px" textAlign="center" colorScheme={i === 0 ? 'green' : last ? 'red' : 'blue'}>{label}</Badge>
                  <Input size="sm" placeholder="Adresse" value={addr} onChange={(e) => updateAddress(i, e.target.value)} />
                  {trip.addresses.length > 2 && !(i === 0 || last) && (
                    <IconButton size="sm" variant="ghost" colorScheme="red" icon={<FiTrash2 />} aria-label="Retirer l'arrêt" onClick={() => removeStop(i)} />
                  )}
                </HStack>
              );
            })}
            <HStack wrap="wrap" spacing={4} pt={1}>
              <Button size="sm" leftIcon={<FiPlus />} variant="outline" onClick={addStop}>Ajouter un arrêt</Button>
              <Checkbox isChecked={trip.roundTrip} onChange={(e) => setTrip({ roundTrip: e.target.checked })}>Retour au point de départ</Checkbox>
              <HStack>
                <Text fontSize="sm">Tarif au km (€)</Text>
                <NumberInput size="sm" w="90px" min={0} step={0.1} value={trip.kmRate} onChange={(_, v) => setTrip({ kmRate: Number.isNaN(v) ? 0 : v })}><NumberInputField /></NumberInput>
              </HStack>
              <Button size="sm" colorScheme="blue" leftIcon={routeLoading ? <Spinner size="xs" /> : <FiRefreshCw />} onClick={handleComputeRoute} isDisabled={routeLoading}>
                Calculer le trajet
              </Button>
            </HStack>
            {routeError && <Alert status="warning" py={1} fontSize="sm"><AlertIcon />{routeError}</Alert>}
            {trip.distanceKm != null && (
              <Alert status="success" py={2} fontSize="sm">
                <AlertIcon />
                {trip.distanceKm.toFixed(1)} km{trip.durationMin ? ` · ${Math.round(trip.durationMin)} min` : ''} ({trip.source}) →
                {' '}{formatEUR(trip.distanceKm * num(trip.kmRate))} de kilométrage
              </Alert>
            )}
            <RouteMap route={trip} height="260px" />
          </VStack>
        </CardBody>
      </Card>

      <HStack justify="flex-end">
        <Button colorScheme="green" leftIcon={<FiCheck />} onClick={generateLinesFromPrep}>Générer / mettre à jour les lignes</Button>
      </HStack>
    </VStack>
  );

  const renderStepLines = () => (
    <VStack spacing={4} align="stretch">
      <HStack wrap="wrap" spacing={3}>
        <Select
          size="sm" maxW="320px" placeholder="Ajouter un article du catalogue…" value=""
          onChange={(e) => addArticleLine(e.target.value)}
        >
          {articles.map(a => <option key={a.id} value={a.id}>{a.category ? `[${a.category}] ` : ''}{a.name} – {formatEUR(a.unitPrice)}/{a.unit}</option>)}
        </Select>
        <Button size="sm" leftIcon={<FiPlus />} onClick={() => addLine()}>Ligne libre</Button>
        <Button size="sm" variant="outline" leftIcon={<FiBook />} onClick={() => setCatalogOpen(true)}>Catalogue</Button>
      </HStack>

      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr><Th>Désignation</Th><Th w="90px">Qté</Th><Th w="90px">Unité</Th><Th w="110px">P.U. (€)</Th><Th w="90px">Remise %</Th><Th isNumeric w="110px">Total</Th><Th w="80px" /></Tr>
          </Thead>
          <Tbody>
            {pricing.lines.map(l => (
              <Tr key={l.id}>
                <Td><Input size="sm" value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} /></Td>
                <Td><NumberInput size="sm" min={0} value={l.quantity} onChange={(_, v) => updateLine(l.id, { quantity: Number.isNaN(v) ? 0 : v })}><NumberInputField px={2} /></NumberInput></Td>
                <Td><Input size="sm" value={l.unit || ''} onChange={(e) => updateLine(l.id, { unit: e.target.value })} /></Td>
                <Td><NumberInput size="sm" min={0} value={l.unitPrice} onChange={(_, v) => updateLine(l.id, { unitPrice: Number.isNaN(v) ? 0 : v })}><NumberInputField px={2} /></NumberInput></Td>
                <Td><NumberInput size="sm" min={0} max={100} value={l.discountPct || 0} onChange={(_, v) => updateLine(l.id, { discountPct: Number.isNaN(v) ? 0 : v })}><NumberInputField px={2} /></NumberInput></Td>
                <Td isNumeric fontWeight="semibold">{formatEUR(lineTotal(l))}</Td>
                <Td>
                  <HStack spacing={0}>
                    <Tooltip label="Enregistrer dans le catalogue"><IconButton size="xs" variant="ghost" icon={<FiSave />} aria-label="Enregistrer dans le catalogue" onClick={() => saveLineToCatalog(l)} /></Tooltip>
                    <IconButton size="xs" variant="ghost" colorScheme="red" icon={<FiTrash2 />} aria-label="Supprimer la ligne" onClick={() => removeLine(l.id)} />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {pricing.lines.length === 0 && <Text color="gray.500" py={4} textAlign="center">Aucune ligne. Ajoutez un article ou générez-les depuis la prépa tarifaire.</Text>}
      </Box>

      <Divider />
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <FormControl>
          <FormLabel>Remise globale</FormLabel>
          <HStack>
            <Select size="sm" w="110px" value={pricing.discount.mode} onChange={(e) => setPricing(p => ({ ...p, discount: { ...p.discount, mode: e.target.value } }))}>
              <option value="percent">%</option><option value="amount">€</option>
            </Select>
            <NumberInput size="sm" min={0} value={pricing.discount.value} onChange={(_, v) => setPricing(p => ({ ...p, discount: { ...p.discount, value: Number.isNaN(v) ? 0 : v } }))}><NumberInputField /></NumberInput>
          </HStack>
        </FormControl>
        <FormControl>
          <FormLabel>TVA (%)</FormLabel>
          <NumberInput size="sm" min={0} value={pricing.taxRate} onChange={(_, v) => setPricing(p => ({ ...p, taxRate: Number.isNaN(v) ? 0 : v }))}><NumberInputField /></NumberInput>
          <Text fontSize="xs" color="gray.500">0 % : association non assujettie</Text>
        </FormControl>
        <FormControl>
          <FormLabel>{isInvoice ? 'Acompte déjà versé (€)' : 'Acompte demandé (€)'}</FormLabel>
          <NumberInput size="sm" min={0} value={pricing.deposit} onChange={(_, v) => setPricing(p => ({ ...p, deposit: Number.isNaN(v) ? 0 : v }))}><NumberInputField /></NumberInput>
        </FormControl>
      </SimpleGrid>

      <Box alignSelf="flex-end" minW="280px">
        <HStack justify="space-between"><Text>Total brut</Text><Text>{formatEUR(totals.subtotal)}</Text></HStack>
        {totals.discountAmount > 0 && <HStack justify="space-between"><Text>Remise</Text><Text color="red.500">- {formatEUR(totals.discountAmount)}</Text></HStack>}
        <HStack justify="space-between"><Text>Total HT</Text><Text>{formatEUR(totals.netHT)}</Text></HStack>
        {totals.taxRate > 0 && <HStack justify="space-between"><Text>TVA</Text><Text>{formatEUR(totals.taxAmount)}</Text></HStack>}
        <HStack justify="space-between"><Text fontWeight="bold">Total</Text><Text fontWeight="bold">{formatEUR(totals.total)}</Text></HStack>
        {totals.deposit > 0 && <HStack justify="space-between"><Text>Reste à payer</Text><Text fontWeight="bold">{formatEUR(totals.remaining)}</Text></HStack>}
      </Box>
    </VStack>
  );

  const renderStepValidation = () => (
    <VStack spacing={4} align="stretch">
      {!isImport && (
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <FormControl>
            <FormLabel>Modèle de document</FormLabel>
            <Select value={form.templateId} onChange={setF('templateId')}>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' (défaut)' : ''}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Délai de paiement (jours)</FormLabel>
            <Input value={form.paymentTerms} onChange={setF('paymentTerms')} />
          </FormControl>
          <FormControl>
            <FormLabel>Description interne</FormLabel>
            <Input value={form.description} onChange={setF('description')} />
          </FormControl>
        </SimpleGrid>
      )}
      <FormControl>
        <FormLabel>Notes / mentions (apparaissent sur le document)</FormLabel>
        <Textarea rows={3} value={form.notes} onChange={setF('notes')} />
      </FormControl>
      {isImport ? (
        <Alert status="info"><AlertIcon />Le PDF « {uploadedFile?.name || 'existant'} » sera attaché. Total saisi : {formatEUR(totals.total)}.</Alert>
      ) : (
        <>
          <HStack justify="space-between">
            <Heading size="sm">Aperçu final</Heading>
            <Button size="sm" leftIcon={<FiPrinter />} variant="outline" onClick={() => printHtml(html)}>Imprimer / PDF</Button>
          </HStack>
          <LivePreview html={html} height="62vh" />
        </>
      )}
    </VStack>
  );

  const showSidePreview = !isImport && (step === 1 || step === 2);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="full" scrollBehavior="inside" closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader borderBottomWidth="1px" borderColor={borderColor}>
            <HStack><FiFileText /><Text>{isEdit ? `Modifier ${docLabel.toLowerCase()} ${editingDocument.number || ''}` : `Nouveau ${docLabel.toLowerCase()}`}</Text></HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={4}>
            <Stepper index={stepIndexInVisible} size="sm" colorScheme="blue" mb={5} gap={0}>
              {visibleSteps.map((s, i) => (
                <Step key={s.title}>
                  <StepIndicator><StepStatus complete={<StepIcon />} incomplete={<StepNumber />} active={<StepNumber />} /></StepIndicator>
                  <Box flexShrink={0}><StepTitle>{s.title}</StepTitle><StepDescription>{s.description}</StepDescription></Box>
                  {i < visibleSteps.length - 1 && <StepSeparator />}
                </Step>
              ))}
            </Stepper>

            <Grid templateColumns={{ base: '1fr', xl: showSidePreview ? 'minmax(0, 1.1fr) minmax(0, 1fr)' : '1fr' }} gap={6}>
              <GridItem minW={0}>
                {step === 0 && renderStepDocument()}
                {step === 1 && renderStepPrep()}
                {step === 2 && renderStepLines()}
                {step === 3 && renderStepValidation()}
              </GridItem>
              {showSidePreview && (
                <GridItem minW={0} display={{ base: 'none', xl: 'block' }}>
                  <Box position="sticky" top={0}>
                    <HStack justify="space-between" mb={2}>
                      <Heading size="sm">Aperçu en direct</Heading>
                      <Badge>{template.name}</Badge>
                    </HStack>
                    <LivePreview html={html} height="75vh" />
                  </Box>
                </GridItem>
              )}
            </Grid>
          </ModalBody>
          <ModalFooter borderTopWidth="1px" borderColor={borderColor} justifyContent="space-between">
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <HStack>
              <Text fontWeight="bold" mr={4}>Total : {formatEUR(totals.total)}</Text>
              <Button leftIcon={<FiChevronLeft />} onClick={goPrev} isDisabled={step === 0}>Précédent</Button>
              {step < 3 ? (
                <Button colorScheme="blue" rightIcon={<FiChevronRight />} onClick={goNext}>Suivant</Button>
              ) : (
                <Button colorScheme="green" leftIcon={<FiCheck />} onClick={handleSave} isLoading={saving}>
                  {isEdit ? 'Enregistrer les modifications' : `Créer le ${docLabel.toLowerCase()}`}
                </Button>
              )}
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <ArticleCatalogManager isOpen={catalogOpen} onClose={() => setCatalogOpen(false)} onChanged={loadArticles} />
    </>
  );
}
