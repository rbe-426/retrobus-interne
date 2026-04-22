import React, { useRef, useState } from 'react';
import {
  Box, Button, Checkbox, HStack, Heading, Modal, ModalBody, ModalCloseButton,
  ModalContent, ModalFooter, ModalHeader, ModalOverlay, Select, Spinner,
  Table, Tbody, Td, Text, Th, Thead, Tr, VStack, Badge, Alert, AlertIcon,
  Input, useToast, Progress, Tag, TagLabel, Tooltip, IconButton
} from '@chakra-ui/react';
import { FiUpload, FiCheckSquare, FiSquare, FiInfo } from 'react-icons/fi';
import { updateCSRFTokenFromResponse, fetchCSRFToken } from '../../lib/csrfClient';

const API_BASE = (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, '');

const CATEGORY_LABELS = {
  ADHESION: 'Adhésion', CARBURANT: 'Carburant', ASSURANCE: 'Assurance',
  MAINTENANCE: 'Maintenance', LOYER: 'Loyer', SUBVENTION: 'Subvention',
  EVENEMENT: 'Événement', FOURNITURES: 'Fournitures', COMMUNICATION: 'Communication',
  TRANSPORT: 'Transport', RESTAURATION: 'Restauration', MERCHANDISING: 'Merchandising',
  AUTRE: 'Autre',
};

export default function BankStatementImport({ isOpen, onClose, onImported }) {
  const toast = useToast();
  const fileRef = useRef();

  const [step, setStep] = useState('upload'); // 'upload' | 'review' | 'importing'
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null); // { bank, period, transactions }
  const [rows, setRows] = useState([]); // transactions avec selected + category editables
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedFiles, setParsedFiles] = useState([]); // Liste des fichiers parsés

  const reset = () => {
    setStep('upload');
    setResult(null);
    setRows([]);
    setParsing(false);
    setImporting(false);
    setProgress(0);
    setParsedFiles([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => { reset(); onClose(); };

  // ─── Étape 1 : Upload + parsing (multiple PDFs) ──────────────────────────────────────────
  const handleFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Vérifier que tous les fichiers sont des PDFs
    const invalidFiles = files.filter(f => !f.name.endsWith('.pdf') && f.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      toast({ status: 'error', title: 'Fichier(s) invalide(s)', description: 'Sélectionnez uniquement des fichiers PDF.' });
      return;
    }

    setParsing(true);
    setStep('upload');
    
    const allTransactions = [];
    const fileResults = [];
    let transactionIdCounter = 0;

    try {
      // Récupérer un nouveau token CSRF
      await fetchCSRFToken(API_BASE);
      
      // Parser chaque PDF
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(Math.round((i / files.length) * 100));
        
        try {
          const formData = new FormData();
          formData.append('pdf', file);

          const res = await fetch(`${API_BASE}/api/finance/import-bank-statement`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'X-CSRF-Token': localStorage.getItem('X-CSRF-Token') || '',
            },
            body: formData,
          });

          updateCSRFTokenFromResponse(res);

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || `HTTP ${res.status}`);
          }

          const data = await res.json();
          
          // Ajouter les transactions avec des IDs uniques
          const transactionsWithIds = data.transactions.map(t => ({
            ...t,
            _id: transactionIdCounter++,
            _source: file.name,
            _bank: data.bank,
            selected: true
          }));
          
          allTransactions.push(...transactionsWithIds);
          fileResults.push({
            fileName: file.name,
            bank: data.bank,
            period: data.period,
            count: data.transactions.length
          });
        } catch (err) {
          toast({ 
            status: 'warning', 
            title: `Erreur ${file.name}`, 
            description: err.message,
            duration: 5000
          });
        }
      }

      setProgress(100);
      
      // Déduplication finale côté frontend pour sécurité
      const deduplicatedTransactions = [];
      const seenKeys = new Set();
      
      for (const tx of allTransactions) {
        const key = `${tx.date}|${tx.amount.toFixed(2)}|${tx.type}|${tx.description.substring(0, 40).toUpperCase()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          deduplicatedTransactions.push(tx);
        }
      }
      
      const duplicatesRemoved = allTransactions.length - deduplicatedTransactions.length;
      
      setParsedFiles(fileResults);
      setRows(deduplicatedTransactions);
      setStep('review');
      
      toast({
        status: 'success',
        title: `${files.length} relevé(s) analysé(s)`,
        description: `${deduplicatedTransactions.length} transaction(s) détectée(s)${duplicatesRemoved > 0 ? ` (${duplicatesRemoved} doublon(s) éliminé(s))` : ''}`,
        duration: 4000
      });
    } catch (err) {
      toast({ status: 'error', title: 'Erreur de lecture', description: err.message });
    } finally {
      setParsing(false);
      setProgress(0);
    }
  };

  // ─── Étape 2 : Sélection / édition ───────────────────────────────────────
  const toggleRow = (id) => setRows(r => r.map(row => row._id === id ? { ...row, selected: !row.selected } : row));
  const toggleAll = () => {
    const allSelected = rows.every(r => r.selected);
    setRows(r => r.map(row => ({ ...row, selected: !allSelected })));
  };
  const updateRow = (id, field, value) => setRows(r => r.map(row => row._id === id ? { ...row, [field]: value } : row));

  const selectedRows = rows.filter(r => r.selected);

  // ─── Étape 3 : Import en base ─────────────────────────────────────────────
  const handleImport = async () => {
    if (selectedRows.length === 0) {
      toast({ status: 'warning', title: 'Aucune transaction sélectionnée' });
      return;
    }
    setImporting(true);
    setProgress(0);
    let ok = 0;
    let errors = 0;

    // Récupérer un nouveau token CSRF avant de commencer l'import
    try {
      await fetchCSRFToken(API_BASE);
    } catch (err) {
      console.error('Erreur récupération token CSRF:', err);
    }

    for (let i = 0; i < selectedRows.length; i++) {
      const t = selectedRows[i];
      try {
        const res = await fetch(`${API_BASE}/api/finance/transactions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
            'X-CSRF-Token': localStorage.getItem('X-CSRF-Token') || '',
          },
          body: JSON.stringify({
            type: t.type,
            amount: t.amount,
            description: t.description,
            category: t.category,
            date: t.date,
          }),
        });
        
        // Mettre à jour le token CSRF depuis la réponse pour la prochaine requête
        updateCSRFTokenFromResponse(res);
        
        if (res.ok) ok++; else errors++;
      } catch {
        errors++;
      }
      setProgress(Math.round(((i + 1) / selectedRows.length) * 100));
    }

    setImporting(false);
    toast({
      status: errors === 0 ? 'success' : 'warning',
      title: `Import terminé`,
      description: `${ok} transaction(s) importée(s)${errors > 0 ? `, ${errors} erreur(s)` : ''}.`,
      duration: 5000,
    });
    if (onImported) onImported();
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="5xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <FiUpload />
            <Text>Import relevé bancaire PDF</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {/* ── Étape 1 : Upload ── */}
          {step === 'upload' && (
            <VStack spacing={6} py={6} align="center">
              <Box
                border="2px dashed"
                borderColor="blue.300"
                borderRadius="xl"
                p={10}
                textAlign="center"
                w="100%"
                cursor="pointer"
                onClick={() => fileRef.current?.click()}
                _hover={{ borderColor: 'blue.500', bg: 'blue.50' }}
                transition="all 0.2s"
              >
                {parsing ? (
                  <VStack spacing={3}>
                    <Spinner size="xl" color="blue.500" />
                    <Text color="blue.600">Analyse des PDFs en cours…</Text>
                    {progress > 0 && (
                      <Box w="80%">
                        <Progress value={progress} colorScheme="blue" size="sm" borderRadius="md" />
                        <Text fontSize="xs" color="gray.500" mt={1}>{progress}%</Text>
                      </Box>
                    )}
                  </VStack>
                ) : (
                  <VStack spacing={3}>
                    <Text fontSize="3xl">📄</Text>
                    <Heading size="md" color="blue.600">Glissez ou cliquez pour sélectionner</Heading>
                    <Text color="gray.500">Relevés bancaires au format PDF (sélection multiple possible)</Text>
                    <Button colorScheme="blue" variant="outline" size="sm">Choisir un ou plusieurs fichiers</Button>
                  </VStack>
                )}
              </Box>

              <input ref={fileRef} type="file" accept=".pdf,application/pdf" multiple style={{ display: 'none' }} onChange={handleFile} />

              <Alert status="info" borderRadius="md" maxW="500px">
                <AlertIcon />
                <Box fontSize="sm">
                  <Text fontWeight="bold">Banques compatibles</Text>
                  <Text>Crédit Agricole, LCL, BNP Paribas, Société Générale, CIC, Caisse d'Épargne, La Banque Postale, Boursorama…</Text>
                </Box>
              </Alert>
            </VStack>
          )}

          {/* ── Étape 2 : Révision ── */}
          {step === 'review' && (
            <VStack spacing={4} align="stretch">
              {/* Résumé */}
              <HStack spacing={4} bg="blue.50" borderRadius="md" p={3} flexWrap="wrap">
                <Tag colorScheme="blue"><TagLabel>📁 {parsedFiles.length} relevé(s)</TagLabel></Tag>
                {parsedFiles.map((f, idx) => (
                  <Tag key={idx} colorScheme="purple" size="sm">
                    <TagLabel>{f.fileName} ({f.count} trans.)</TagLabel>
                  </Tag>
                ))}
                <Tag colorScheme="green"><TagLabel>✅ {rows.filter(r=>r.selected).length} / {rows.length} sélectionnées</TagLabel></Tag>
              </HStack>

              {rows.length === 0 && (
                <Alert status="warning">
                  <AlertIcon />
                  Aucune transaction détectée. Le format de ce relevé n'est peut-être pas encore supporté.
                </Alert>
              )}

              {rows.length > 0 && (
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th w="40px">
                          <Tooltip label="Tout sélectionner / désélectionner">
                            <IconButton
                              size="xs"
                              variant="ghost"
                              icon={rows.every(r=>r.selected) ? <FiCheckSquare /> : <FiSquare />}
                              onClick={toggleAll}
                              aria-label="Toggle all"
                            />
                          </Tooltip>
                        </Th>
                        <Th>Date</Th>
                        <Th>Description</Th>
                        <Th>Type</Th>
                        <Th isNumeric>Montant (€)</Th>
                        <Th>Catégorie</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {rows.map(row => (
                        <Tr
                          key={row._id}
                          opacity={row.selected ? 1 : 0.4}
                          _hover={{ bg: 'gray.50' }}
                          bg={row.selected ? 'white' : 'gray.50'}
                        >
                          <Td>
                            <Checkbox
                              isChecked={row.selected}
                              onChange={() => toggleRow(row._id)}
                              colorScheme="blue"
                            />
                          </Td>
                          <Td>
                            <Input
                              size="xs"
                              type="date"
                              value={row.date}
                              onChange={e => updateRow(row._id, 'date', e.target.value)}
                              w="130px"
                            />
                          </Td>
                          <Td maxW="400px">
                            <Input
                              size="xs"
                              value={row.description}
                              onChange={e => updateRow(row._id, 'description', e.target.value)}
                              title={row.description}
                            />
                          </Td>
                          <Td>
                            <Select
                              size="xs"
                              value={row.type}
                              onChange={e => updateRow(row._id, 'type', e.target.value)}
                              w="140px"
                            >
                              <option value="CREDIT">Rentrée d'argent</option>
                              <option value="DEBIT">Dépense</option>
                            </Select>
                          </Td>
                          <Td isNumeric>
                            <Input
                              size="xs"
                              type="number"
                              step="0.01"
                              value={row.amount}
                              onChange={e => updateRow(row._id, 'amount', parseFloat(e.target.value))}
                              w="90px"
                              textAlign="right"
                            />
                          </Td>
                          <Td>
                            <Select
                              size="xs"
                              value={row.category}
                              onChange={e => updateRow(row._id, 'category', e.target.value)}
                              w="150px"
                            >
                              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </Select>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </VStack>
          )}

          {/* ── Étape 3 : Importing ── */}
          {importing && (
            <VStack spacing={4} py={8}>
              <Spinner size="xl" color="blue.500" />
              <Text>Import en cours… {progress}%</Text>
              <Progress value={progress} w="100%" colorScheme="blue" borderRadius="md" />
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          <HStack justify="space-between" w="100%">
            <Button variant="ghost" onClick={handleClose}>Annuler</Button>
            {step === 'review' && rows.length > 0 && !importing && (
              <HStack>
                <Button variant="outline" size="sm" onClick={reset}>
                  Changer de fichier
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleImport}
                  isDisabled={selectedRows.length === 0}
                  leftIcon={<FiUpload />}
                >
                  Importer {selectedRows.length} transaction{selectedRows.length > 1 ? 's' : ''}
                </Button>
              </HStack>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
