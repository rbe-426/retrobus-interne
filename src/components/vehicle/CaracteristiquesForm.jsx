import React, { useState } from 'react';
import {
  VStack, HStack, Input, IconButton, Button, FormLabel, 
  Table, Thead, Tbody, Tr, Th, Td, Box, Text, useToast,
  Card, CardBody
} from '@chakra-ui/react';
import { FiTrash2, FiPlus, FiArrowUp, FiArrowDown } from 'react-icons/fi';

/**
 * Formulaire d'édition des caractéristiques (générique)
 * Utilisé dans VehiculeEdit et VehiculeCreate
 * 
 * Props:
 *   - value: array of {label, value}
 *   - onChange: callback(newArray)
 *   - editable: boolean (default: true)
 */
export default function CaracteristiquesForm({ value = [], onChange, editable = true }) {
  const toast = useToast();
  const [focused, setFocused] = useState(null);

  // Ensure value is always an array
  const items = Array.isArray(value) ? value : [];

  const update = (i, key, val) => {
    if (!editable) return;
    const copy = [...items];
    if (!copy[i]) copy[i] = {};
    copy[i] = { ...copy[i], [key]: val };
    onChange(copy);
  };

  const add = () => {
    if (!editable) return;
    onChange([...(items || []), { label: '', value: '' }]);
  };

  const remove = (i) => {
    if (!editable) return;
    const copy = [...items];
    copy.splice(i, 1);
    onChange(copy);
    toast({
      status: 'info',
      title: 'Caractéristique supprimée',
      duration: 2000,
      isClosable: true
    });
  };

  const moveUp = (i) => {
    if (!editable || i === 0) return;
    const copy = [...items];
    [copy[i], copy[i - 1]] = [copy[i - 1], copy[i]];
    onChange(copy);
  };

  const moveDown = (i) => {
    if (!editable || i === items.length - 1) return;
    const copy = [...items];
    [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
    onChange(copy);
  };

  if (!editable && (!items || items.length === 0)) {
    return (
      <Text fontSize="sm" color="gray.500">
        Aucune caractéristique
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between" mb={2}>
        <FormLabel mb={0}>📋 Caractéristiques additionnelles</FormLabel>
        {editable && (
          <Button 
            size="sm" 
            leftIcon={<FiPlus />} 
            onClick={add}
            colorScheme="blue"
          >
            Ajouter
          </Button>
        )}
      </HStack>

      {items.length === 0 ? (
        <Text fontSize="sm" color="gray.500" py={4}>
          {editable ? 'Aucune caractéristique. Cliquez sur "Ajouter" pour en créer une.' : 'Aucune caractéristique'}
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table size="sm" variant="striped">
            <Thead>
              <Tr bg="gray.50">
                <Th w="40%">Label</Th>
                <Th w="40%">Valeur</Th>
                <Th w="20%" textAlign="center">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((c, i) => (
                <Tr 
                  key={i}
                  bg={focused === i ? 'blue.50' : 'transparent'}
                  onMouseEnter={() => setFocused(i)}
                  onMouseLeave={() => setFocused(null)}
                >
                  <Td>
                    <Input
                      placeholder="Ex: Moteur"
                      value={c.label || ''}
                      onChange={e => update(i, 'label', e.target.value)}
                      isDisabled={!editable}
                      size="sm"
                      borderColor={c.label ? 'blue.200' : 'gray.200'}
                    />
                  </Td>
                  <Td>
                    <Input
                      placeholder="Ex: Mercedes 300 ch"
                      value={c.value || ''}
                      onChange={e => update(i, 'value', e.target.value)}
                      isDisabled={!editable}
                      size="sm"
                      borderColor={c.value ? 'blue.200' : 'gray.200'}
                    />
                  </Td>
                  <Td>
                    {editable && (
                      <HStack justify="center" spacing={1}>
                        <IconButton
                          aria-label="Monter"
                          icon={<FiArrowUp />}
                          size="xs"
                          variant="ghost"
                          onClick={() => moveUp(i)}
                          isDisabled={i === 0}
                        />
                        <IconButton
                          aria-label="Descendre"
                          icon={<FiArrowDown />}
                          size="xs"
                          variant="ghost"
                          onClick={() => moveDown(i)}
                          isDisabled={i === items.length - 1}
                        />
                        <IconButton
                          aria-label="Supprimer"
                          icon={<FiTrash2 />}
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => remove(i)}
                        />
                      </HStack>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {editable && items.length > 0 && (
        <Text fontSize="xs" color="gray.500">
          💡 Conseil: Organisez vos caractéristiques de haut en bas (Moteur, Énergie, etc.)
        </Text>
      )}
    </VStack>
  );
}
