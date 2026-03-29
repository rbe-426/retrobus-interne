/**
 * ResponsiveForm.jsx
 * Conteneur de formulaire adapté au mobile
 * Gère automatiquement les breakpoints et l'espacement
 */

import React from 'react';
import { VStack, Box } from '@chakra-ui/react';

export default function ResponsiveForm({ 
  children,
  spacing = { base: 3, md: 4 },
  px = { base: 3, md: 6 },
  py = { base: 4, md: 6 }
}) {
  return (
    <VStack 
      spacing={spacing} 
      align="stretch" 
      w="100%"
      px={px}
      py={py}
    >
      {children}
    </VStack>
  );
}

export function ResponsiveFormRow({ 
  children, 
  columns = { base: 1, md: 2 },
  spacing = { base: 3, md: 4 }
}) {
  return (
    <Box 
      display="grid" 
      gridTemplateColumns={columns}
      gap={spacing}
      w="100%"
    >
      {children}
    </Box>
  );
}

export function ResponsiveContainer({ 
  children, 
  maxW = {base: "100%", md: "6xl"},
  px = { base: 3, md: 4, lg: 8 },
  py = { base: 4, md: 8 }
}) {
  return (
    <Box 
      maxW={maxW} 
      mx="auto" 
      px={px} 
      py={py}
      w="100%"
    >
      {children}
    </Box>
  );
}
