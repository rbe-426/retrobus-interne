import React, { useState, useEffect } from 'react';
import {
  VStack, HStack, Button, Input, Table, Thead, Tbody, Tr, Th, Td,
  IconButton, useToast, FormControl, FormLabel, NumberInput,
  NumberInputField, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, useDisclosure, Box, Text, Divider, Badge, Heading
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiEdit3, FiSave } from 'react-icons/fi';
import { fetchJson } from '../apiClient';

export default function DevisLinesManager({ devisId, onTotalChange }) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const toast = useToast();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  
  const [newLine, setNewLine] = useState({
    quantity: 1,
    description: '',
    unitPrice: 0
  });

  // Charger les lignes au changement de devisId
  useEffect(() => {
    if (devisId) {
      loadLines();
    }
  }, [devisId]);

  // Calculer et notifier le total
  useEffect(() => {
    const total = lines.reduce((sum, line) => sum + (line.totalPrice || 0), 0);
    if (onTotalChange) {
      onTotalChange(total);
    }
  }, [lines, onTotalChange]);

  const loadLines = async () => {
    if (!devisId) return;
    try {
      setLoading(true);
      const data = await fetchJson(`/api/devis-lines/${devisId}`);
      setLines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Erreur chargement lignes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les lignes',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const addLine = async () => {
    if (!newLine.description || newLine.unitPrice <= 0) {
      toast({
        title: 'Validation',
        description: 'Description et prix unitaire requis',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    try {
      const lineData = {
        devisId,
        quantity: parseFloat(newLine.quantity) || 1,
        description: newLine.description,
        unitPrice: parseFloat(newLine.unitPrice) || 0,
        order: lines.length
      };

      const created = await fetchJson('/api/devis-lines', {
        method: 'POST',
        body: JSON.stringify(lineData)
      });

      setLines([...lines, created]);
      setNewLine({ quantity: 1, description: '', unitPrice: 0 });
      onAddClose();

      toast({
        title: 'Succès',
        description: 'Ligne ajoutée',
        status: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('❌ Erreur ajout ligne:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    }
  };

  const updateLine = async (lineId) => {
    if (!editingData[lineId]?.description || editingData[lineId]?.unitPrice <= 0) {
      toast({
        title: 'Validation',
        description: 'Description et prix unitaire requis',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    try {
      const updated = await fetchJson(`/api/devis-lines/${lineId}`, {
        method: 'PUT',
        body: JSON.stringify({
          quantity: parseFloat(editingData[lineId].quantity) || 1,
          description: editingData[lineId].description,
          unitPrice: parseFloat(editingData[lineId].unitPrice) || 0
        })
      });

      setLines(lines.map(l => l.id === lineId ? updated : l));
      setEditingId(null);

      toast({
        title: 'Succès',
        description: 'Ligne mise à jour',
        status: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    }
  };

  const deleteLine = async (lineId) => {
    try {
      await fetchJson(`/api/devis-lines/${lineId}`, { method: 'DELETE' });
      setLines(lines.filter(l => l.id !== lineId));

      toast({
        title: 'Succès',
        description: 'Ligne supprimée',
        status: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleEditStart = (line) => {
    setEditingId(line.id);
    setEditingData(prev => ({
      ...prev,
      [line.id]: {
        quantity: line.quantity,
        description: line.description,
        unitPrice: line.unitPrice
      }
    }));
  };

  const handleEditChange = (lineId, field, value) => {
    setEditingData(prev => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        [field]: value
      }
    }));
  };

  const total = lines.reduce((sum, line) => sum + (line.totalPrice || 0), 0);

  return (
    <VStack spacing={4} width="100%" align="stretch">
      <HStack justify="space-between">
        <Heading size="md">Lignes du Devis</Heading>
        <HStack>
          <Badge>{lines.length} ligne(s)</Badge>
          <Button
            size="sm"
            colorScheme="green"
            leftIcon={<FiPlus />}
            onClick={onAddOpen}
            isDisabled={!devisId}
          >
            Ajouter une ligne
          </Button>
        </HStack>
      </HStack>

      {lines.length === 0 ? (
        <Text color="gray.500" textAlign="center" py={6}>
          Aucune ligne pour le moment. Ajoutez-en une!
        </Text>
      ) : (
        <Box overflowX="auto" width="100%">
          <Table size="sm" variant="striped">
            <Thead>
              <Tr>
                <Th>Description</Th>
                <Th isNumeric>Quantité</Th>
                <Th isNumeric>P.U. €</Th>
                <Th isNumeric>Total €</Th>
                <Th textAlign="center">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {lines.map(line => (
                <Tr key={line.id}>
                  <Td>
                    {editingId === line.id ? (
                      <Input
                        size="sm"
                        value={editingData[line.id]?.description || ''}
                        onChange={(e) =>
                          handleEditChange(line.id, 'description', e.target.value)
                        }
                      />
                    ) : (
                      line.description
                    )}
                  </Td>
                  <Td isNumeric>
                    {editingId === line.id ? (
                      <NumberInput
                        size="sm"
                        min={0.01}
                        value={editingData[line.id]?.quantity || 1}
                        onChange={(val) =>
                          handleEditChange(line.id, 'quantity', parseFloat(val))
                        }
                      >
                        <NumberInputField />
                      </NumberInput>
                    ) : (
                      line.quantity
                    )}
                  </Td>
                  <Td isNumeric>
                    {editingId === line.id ? (
                      <NumberInput
                        size="sm"
                        min={0}
                        value={editingData[line.id]?.unitPrice || 0}
                        onChange={(val) =>
                          handleEditChange(line.id, 'unitPrice', parseFloat(val))
                        }
                      >
                        <NumberInputField />
                      </NumberInput>
                    ) : (
                      line.unitPrice.toFixed(2)
                    )}
                  </Td>
                  <Td isNumeric fontWeight="bold">
                    {(line.totalPrice || 0).toFixed(2)}
                  </Td>
                  <Td textAlign="center">
                    <HStack justify="center" spacing={1}>
                      {editingId === line.id ? (
                        <IconButton
                          size="sm"
                          icon={<FiSave />}
                          colorScheme="green"
                          onClick={() => updateLine(line.id)}
                          aria-label="Enregistrer"
                        />
                      ) : (
                        <IconButton
                          size="sm"
                          icon={<FiEdit3 />}
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => handleEditStart(line)}
                          aria-label="Éditer"
                        />
                      )}
                      <IconButton
                        size="sm"
                        icon={<FiTrash2 />}
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => deleteLine(line.id)}
                        aria-label="Supprimer"
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Divider />

      <HStack width="100%" justify="flex-end" fontWeight="bold" fontSize="lg">
        <Text>Total:</Text>
        <Text color="green.600">{total.toFixed(2)} €</Text>
      </HStack>

      {/* Modal Ajouter une ligne */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ajouter une ligne</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  placeholder="Description de la prestation"
                  value={newLine.description}
                  onChange={(e) =>
                    setNewLine({ ...newLine, description: e.target.value })
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Quantité</FormLabel>
                <NumberInput
                  min={0.01}
                  value={newLine.quantity}
                  onChange={(val) =>
                    setNewLine({ ...newLine, quantity: parseFloat(val) || 1 })
                  }
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Prix unitaire (€)</FormLabel>
                <NumberInput
                  min={0}
                  step={0.01}
                  value={newLine.unitPrice}
                  onChange={(val) =>
                    setNewLine({ ...newLine, unitPrice: parseFloat(val) || 0 })
                  }
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              {newLine.quantity > 0 && newLine.unitPrice > 0 && (
                <Box
                  p={3}
                  bg="green.50"
                  borderRadius="md"
                  width="100%"
                  textAlign="center"
                >
                  <Text fontSize="sm" color="gray.600">
                    Total: {(newLine.quantity * newLine.unitPrice).toFixed(2)} €
                  </Text>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddClose}>
              Annuler
            </Button>
            <Button colorScheme="green" onClick={addLine} isLoading={loading}>
              Ajouter
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
