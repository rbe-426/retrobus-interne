/**
 * Composant Facturation (Devis & Factures) - REFACTORISÉ
 * Gestion unifiée des documents commerciaux avec wizard guidé
 */

import React, { useState, useEffect } from "react";
import {
  Box, VStack, HStack, Card, CardBody,
  Heading, Text, Button, Badge, Icon, SimpleGrid, useToast,
  Table, Thead, Tbody, Tr, Th, Td,
  Stat, StatLabel, StatNumber, StatHelpText,
  Menu, MenuButton, MenuList, MenuItem,
  useColorModeValue
} from "@chakra-ui/react";
import { 
  FiPlus, FiTrash2,
  FiMoreHorizontal, FiTrendingUp, FiFileText, FiDollarSign 
} from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";
import DevisWizard from "./DevisWizard";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const FinanceInvoicing = () => {
  const {
    documents,
    addDocument,
    deleteDocument,
    updateDocumentStatus,
    loading,
    loadFinanceData
  } = useFinanceData();

  const [documentFilter, setDocumentFilter] = useState('ALL'); // 'ALL', 'QUOTE', 'INVOICE'
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const bgSection = useColorModeValue('gray.50', 'gray.900');

  // Charger les données au montage
  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // Séparer les devis et factures
  const quotes = documents.filter(d => d.type === 'QUOTE');
  const invoices = documents.filter(d => d.type === 'INVOICE');

  // Documents filtrés selon le filtre actif
  const filteredDocuments = documentFilter === 'ALL' 
    ? documents 
    : documentFilter === 'QUOTE' 
      ? quotes 
      : invoices;

  // Calculer les statistiques
  const stats = {
    totalQuotes: quotes.length,
    totalInvoices: invoices.length,
    acceptedQuotes: quotes.filter(q => q.status === 'ACCEPTED').length,
    paidInvoices: invoices.filter(i => i.status === 'PAID').length,
    totalRevenue: invoices
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0)
  };

  // Statuts et couleurs
  const statusLabels = {
    DRAFT: 'Brouillon',
    SENT: 'Envoyé',
    ACCEPTED: 'Accepté',
    REJECTED: 'Refusé',
    REEDITED: 'Réédité',
    PENDING_PAYMENT: 'En attente',
    DEPOSIT_PAID: 'Accompte',
    PAID: 'Payé'
  };

  const statusColors = {
    DRAFT: 'gray',
    SENT: 'blue',
    ACCEPTED: 'green',
    REJECTED: 'red',
    REEDITED: 'orange',
    PENDING_PAYMENT: 'yellow',
    DEPOSIT_PAID: 'purple',
    PAID: 'green'
  };

  // Handler pour sauvegarder un nouveau document depuis le wizard
  const handleSaveDocument = async (documentData) => {
    try {
      console.log('💾 Saving document:', documentData);
      
      // Préparer les données pour l'API
      const payload = {
        type: documentData.type, // 'QUOTE' ou 'INVOICE'
        number: documentData.number,
        title: documentData.title,
        description: documentData.description,
        date: documentData.date,
        dueDate: documentData.dueDate,
        destinataireName: documentData.clientName,
        destinataireAdresse: documentData.clientAddress,
        destinataireSociete: documentData.clientCompany,
        destinataireContacts: `${documentData.clientEmail || ''} ${documentData.clientPhone || ''}`.trim(),
        notes: documentData.notes || '',
        status: 'DRAFT',
        amount: documentData.totals?.total || 0,
        amountExcludingTax: documentData.totals?.subtotal || 0,
        taxRate: documentData.totals?.taxRate || 0,
        taxAmount: documentData.totals?.taxAmount || 0
      };

      // Si import PDF, convertir en DataURL
      if (documentData.mode === 'import' && documentData.uploadedFile) {
        console.log('📄 PDF import:', documentData.uploadedFile.name);
        try {
          const reader = new FileReader();
          await new Promise((resolve, reject) => {
            reader.onload = () => {
              payload.documentUrl = reader.result;
              payload.documentName = documentData.uploadedFile.name;
              console.log('✅ PDF converti en Data URI');
              resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(documentData.uploadedFile);
          });
        } catch (e) {
          console.warn('⚠️ Impossible de convertir le PDF:', e.message);
        }
      }

      // Appeler l'API addDocument
      const result = await addDocument(payload);
      console.log('✅ Document créé:', result);

      // Si mode génération, sauvegarder les lignes
      if (documentData.mode === 'generate' && documentData.lines?.length > 0) {
        try {
          const isInvoice = documentData.type === 'INVOICE';
          const lineEndpoint = isInvoice ? 'facture-lines' : 'devis-lines';
          const idKey = isInvoice ? 'factureId' : 'devisId';
          
          const linesPayload = documentData.lines.map((line) => ({
            [idKey]: result.id,
            type: line.type || 'ARTICLE',
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            totalPrice: line.total || (line.quantity * line.unitPrice)
          }));
          
          console.log(`📤 Création de ${linesPayload.length} lignes`);

          for (let i = 0; i < linesPayload.length; i++) {
            const response = await fetch(
              `${API_BASE}/api/${lineEndpoint}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify(linesPayload[i])
              }
            );
            
            if (!response.ok) throw new Error(`Ligne ${i + 1} non créée`);
            console.log(`✅ Ligne ${i + 1}/${linesPayload.length} créée`);
          }
        } catch (e) {
          console.warn('⚠️ Impossible de sauvegarder les lignes:', e.message);
        }
      }

      // Recharger les données
      await loadFinanceData();

      // Fermer le wizard
      setIsWizardOpen(false);

      toast({
        title: 'Succès! 🎉',
        description: `${documentData.type === 'QUOTE' ? 'Devis' : 'Facture'} créé avec succès`,
        status: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('❌ Erreur lors de la creation:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le document',
        status: 'error',
        duration: 2000
      });
    }
  };

  // Handler pour supprimer un document
  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
    
    try {
      await deleteDocument(id);
      toast({
        title: 'Document supprimé',
        status: 'success',
        duration: 2000
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error',
        duration: 2000
      });
    }
  };

  // Handler pour changer le statut
  const handleChangeStatus = async (id, newStatus) => {
    try {
      await updateDocumentStatus(id, newStatus);
      toast({
        title: 'Statut mis à jour',
        status: 'success',
        duration: 2000
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error',
        duration: 2000
      });
    }
  };

  return (
    <VStack align="stretch" spacing={6}>
      {/* Header avec bouton unique */}
      <HStack justify="space-between" wrap="wrap" spacing={4}>
        <Box>
          <Heading size={{ base: "md", md: "lg" }}>📄 Devis & Facturation</Heading>
          <Text color="gray.500" fontSize={{ base: "xs", md: "sm" }}>
            Gestion unifiée avec parcours guidé
          </Text>
        </Box>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="rbe"
          onClick={() => setIsWizardOpen(true)}
          isLoading={loading}
          size={{ base: "sm", md: "md" }}
        >
          Nouveau document
        </Button>
      </HStack>

      {/* Section Statistiques */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4}>
        <Card bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">Total Devis</StatLabel>
              <StatNumber color="blue.500">{stats.totalQuotes}</StatNumber>
              <StatHelpText>
                <Icon as={FiFileText} mr={1} />
                Documents
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">Total Factures</StatLabel>
              <StatNumber color="purple.500">{stats.totalInvoices}</StatNumber>
              <StatHelpText>
                <Icon as={FiDollarSign} mr={1} />
                Documents
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">Devis Acceptés</StatLabel>
              <StatNumber color="green.500">{stats.acceptedQuotes}</StatNumber>
              <StatHelpText>
                sur {stats.totalQuotes} devis
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">Factures Payées</StatLabel>
              <StatNumber color="green.500">{stats.paidInvoices}</StatNumber>
              <StatHelpText>
                sur {stats.totalInvoices} factures
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">Revenus Encaissés</StatLabel>
              <StatNumber color="green.600" fontSize="lg">
                {stats.totalRevenue.toFixed(2)} €
              </StatNumber>
              <StatHelpText>
                <Icon as={FiTrendingUp} mr={1} />
                Total payé
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Section Filtres */}
      <Card bg={bgSection}>
        <CardBody>
          <HStack spacing={3} wrap="wrap">
            <Button
              size="sm"
              colorScheme={documentFilter === 'ALL' ? 'blue' : 'gray'}
              variant={documentFilter === 'ALL' ? 'solid' : 'outline'}
              onClick={() => setDocumentFilter('ALL')}
            >
              Tous ({documents.length})
            </Button>
            <Button
              size="sm"
              colorScheme={documentFilter === 'QUOTE' ? 'blue' : 'gray'}
              variant={documentFilter === 'QUOTE' ? 'solid' : 'outline'}
              onClick={() => setDocumentFilter('QUOTE')}
              leftIcon={<Icon as={FiFileText} />}
            >
              Devis ({stats.totalQuotes})
            </Button>
            <Button
              size="sm"
              colorScheme={documentFilter === 'INVOICE' ? 'purple' : 'gray'}
              variant={documentFilter === 'INVOICE' ? 'solid' : 'outline'}
              onClick={() => setDocumentFilter('INVOICE')}
              leftIcon={<Icon as={FiDollarSign} />}
            >
              Factures ({stats.totalInvoices})
            </Button>
          </HStack>
        </CardBody>
      </Card>

      {/* Tableau des documents */}
      <Card>
        <CardBody>
          {filteredDocuments.length === 0 ? (
            <Box textAlign="center" py={12}>
              <Text color="gray.500">
                Aucun document. Créez-en un pour commencer.
              </Text>
            </Box>
          ) : (
            <Box overflowX="auto">
              <Table size={{ base: "sm", md: "md" }} variant="simple">
                <Thead>
                  <Tr bg="gray.50">
                    <Th>Type</Th>
                    <Th>N°</Th>
                    <Th>Titre</Th>
                    <Th display={{ base: "none", md: "table-cell" }}>Date</Th>
                    <Th isNumeric>Montant</Th>
                    <Th>Statut</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredDocuments.map((doc) => (
                    <Tr key={doc.id}>
                      <Td>
                        <Badge 
                          colorScheme={doc.type === 'QUOTE' ? 'blue' : 'purple'}
                          fontSize="xs"
                        >
                          {doc.type === 'QUOTE' ? '📄 Devis' : '💰 Facture'}
                        </Badge>
                      </Td>
                      <Td fontWeight="bold" fontSize={{ base: "xs", md: "sm" }}>
                        {doc.number}
                      </Td>
                      <Td fontSize={{ base: "xs", md: "sm" }}>
                        {doc.title}
                      </Td>
                      <Td display={{ base: "none", md: "table-cell" }} fontSize="sm">
                        {new Date(doc.date).toLocaleDateString('fr-FR')}
                      </Td>
                      <Td isNumeric fontWeight="bold" fontSize={{ base: "xs", md: "sm" }}>
                        {parseFloat(doc.amount || 0).toFixed(2)} €
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={statusColors[doc.status]} 
                          fontSize="xs"
                        >
                          {statusLabels[doc.status]}
                        </Badge>
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={Button}
                            size="sm"
                            variant="ghost"
                            rightIcon={<FiMoreHorizontal />}
                          >
                            Actions
                          </MenuButton>
                          <MenuList>
                            <MenuItem 
                              icon={<FiTrash2 />} 
                              color="red.500"
                              onClick={() => handleDelete(doc.id)}
                            >
                              Supprimer
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>

      {/* Wizard unifié */}
      <DevisWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSave={handleSaveDocument}
      />
    </VStack>
  );
};

export default FinanceInvoicing;
