import React from "react";
import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import ExpenseReports from "../components/Finance/ExpenseReports";

const NDF = () => {
  return (
    <Box bg="gray.50" minH="calc(100vh - 80px)" p={{ base: 4, md: 8 }}>
      <VStack align="stretch" spacing={6} maxW="1200px" mx="auto">
        <Box>
          <Heading size="lg">NDF</Heading>
          <Text color="gray.500" fontSize="sm">
            Saisie et suivi de vos notes de frais
          </Text>
        </Box>

        <ExpenseReports />
      </VStack>
    </Box>
  );
};

export default NDF;