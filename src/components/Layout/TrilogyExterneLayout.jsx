import React from 'react';
import { Box, Container, VStack, Heading, Text, Badge, useColorModeValue } from '@chakra-ui/react';

const TrilogyExterneLayout = ({ title, subtitle, children }) => {
  const sectionBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <Box minH="100vh" bg={sectionBg} py={{ base: 4, md: 10 }}>
      <Container maxW={{ base: 'container.sm', md: 'container.xl' }} px={{ base: 3, md: 4 }}>
        <VStack spacing={4} mb={{ base: 6, md: 10 }} textAlign="center">
          <Badge colorScheme="red" fontSize="sm" px={3} py={1} borderRadius="full">
            Trilogy RBE Externe
          </Badge>
          <Heading size={{ base: 'lg', md: '2xl' }} color="black">
            {title}
          </Heading>
          {subtitle && (
            <Text fontSize={{ base: 'sm', md: 'lg' }} color="gray.600" maxW="2xl">
              {subtitle}
            </Text>
          )}
        </VStack>

        <Box
          bg={cardBg}
          borderWidth="1px"
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          borderRadius="xl"
          boxShadow="md"
          p={{ base: 4, md: 8 }}
        >
          {children}
        </Box>
      </Container>
    </Box>
  );
};

export default TrilogyExterneLayout;
