/**
 * AdminTemplates.jsx
 * Admin page for managing email templates
 */

import React, { useContext } from 'react';
import { Box, Container, Heading, Text, Alert, AlertIcon, AlertTitle, AlertDescription, VStack } from '@chakra-ui/react';
import { useUser } from '../context/UserContext';
import EmailTemplateManager from '../components/EmailTemplateManager';

export default function AdminTemplates() {
  const { user, token, isAdmin } = useUser();

  // Check if user is admin
  if (!isAdmin) {
    return (
      <Box p={6}>
        <Container maxW="container.md">
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <AlertTitle>Accès refusé</AlertTitle>
              <AlertDescription>
                Vous devez être administrateur pour accéder à cette page.
              </AlertDescription>
            </VStack>
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh" py={6}>
      <Container maxW="container.xl">
        <VStack align="start" spacing={4} mb={6}>
          <Heading size="lg">
            Administration &gt; Email Templates
          </Heading>
          <Text color="gray.600">
            Create and manage templates for automated RétroBus Mail notifications
          </Text>
        </VStack>

        <EmailTemplateManager token={token} />
      </Container>
    </Box>
  );
}
