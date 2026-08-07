/**
 * ResponsiveTable.jsx
 * Composant de tableau qui s'adapte automatiquement au mobile
 * Affiche un tableau sur desktop, des cartes sur mobile
 */

import React from 'react';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, VStack, HStack, Badge,
  Divider, Text
} from '@chakra-ui/react';

export default function ResponsiveTable({ 
  columns, // [{key: 'name', label: 'Nom', render: (value, row) => <Text>{value}</Text>}]
  data,
  renderRowActions, // (row) => <HStack>...</HStack>
  size = "sm",
  variant = "simple",
  striped = true
}) {
  if (!data || data.length === 0) {
    return <Text color="gray.500">Aucune donnée</Text>;
  }

  return (
    <>
      {/* Desktop Table */}
      <Box display={{ base: 'none', lg: 'block' }} overflowX="auto">
        <Table variant={variant} size={size} colorScheme={striped ? "gray" : undefined}>
          <Thead>
            <Tr bg="gray.50">
              {columns.map((col) => (
                <Th key={col.key} fontSize={{ base: 'xs', md: 'sm' }}>
                  {col.label}
                </Th>
              ))}
              {renderRowActions && <Th fontSize={{ base: 'xs', md: 'sm' }}>Actions</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {data.map((row, idx) => (
              <Tr key={row.id || idx}>
                {columns.map((col) => (
                  <Td key={`${row.id || idx}-${col.key}`} fontSize={{ base: 'xs', md: 'sm' }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </Td>
                ))}
                {renderRowActions && (
                  <Td>{renderRowActions(row)}</Td>
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Mobile Cards */}
      <VStack spacing={3} display={{ base: 'flex', lg: 'none' }}>
        {data.map((row, idx) => (
          <Box 
            key={row.id || idx} 
            p={4} 
            borderRadius="lg" 
            borderWidth="1px" 
            borderColor="gray.200" 
            w="100%"
          >
            <VStack align="start" spacing={2} w="100%">
              {/* Première ligne spéciale */}
              {columns[0] && (
                <HStack justify="space-between" w="100%">
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">
                      {columns[0].label}
                    </Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {columns[0].render ? columns[0].render(row[columns[0].key], row) : row[columns[0].key]}
                    </Text>
                  </Box>
                  {renderRowActions && renderRowActions(row)}
                </HStack>
              )}

              <Divider />

              {/* Autres colonnes */}
              <VStack align="start" w="100%" spacing={2}>
                {columns.slice(1).map((col) => (
                  <Box key={col.key} w="100%">
                    <Text fontSize="xs" color="gray.600" fontWeight="500">
                      {col.label}
                    </Text>
                    <Text fontSize="sm">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </VStack>
          </Box>
        ))}
      </VStack>
    </>
  );
}
