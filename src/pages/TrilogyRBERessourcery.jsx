import React from 'react';
import {
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  Heading,
  Text,
  Card,
  CardBody,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiArchive, FiBook, FiFolder, FiLayout } from 'react-icons/fi';
import SidebarLayout from '../components/SidebarLayout';
import { useSidebar } from '../context/SidebarContext';

export default function TrilogyRBERessourcery() {
  const cardBg = useColorModeValue('white', 'gray.800');
  const { closeOnMobile } = useSidebar();

  const sidebarContent = (
    <VStack align="stretch" spacing={0} w="full" h="full">
      <Box p={6} borderBottom="1px" borderColor="gray.200">
        <HStack spacing={3}>
          <Icon as={FiLayout} color="rbe.500" boxSize={6} />
          <Box>
            <Heading size="md" color="gray.800">Trilogy RBE</Heading>
            <Text fontSize="sm" color="gray.500">Layouts & composants</Text>
          </Box>
        </HStack>
      </Box>

      <VStack align="stretch" spacing={0} px={3} py={4} flex={1}>
        <Button
          as={RouterLink}
          to="/dashboard/trilogy-rbe"
          variant="ghost"
          justifyContent="flex-start"
          w="full"
          borderLeft="3px"
          borderColor="transparent"
          borderRadius={0}
          px={4}
          py={6}
          fontSize="sm"
          fontWeight="500"
          _hover={{ bg: 'gray.100', borderLeftColor: 'blue.500' }}
          onClick={closeOnMobile}
        >
          Trilogy Interne
        </Button>

        <Button
          as={RouterLink}
          to="/dashboard/trilogy-rbe/externe"
          variant="ghost"
          justifyContent="flex-start"
          w="full"
          borderLeft="3px"
          borderColor="transparent"
          borderRadius={0}
          px={4}
          py={6}
          fontSize="sm"
          fontWeight="500"
          _hover={{ bg: 'gray.100', borderLeftColor: 'blue.500' }}
          onClick={closeOnMobile}
        >
          Trilogy Externe
        </Button>

        <Button
          variant="ghost"
          justifyContent="flex-start"
          w="full"
          bg="blue.50"
          borderLeft="3px"
          borderColor="blue.500"
          borderRadius={0}
          px={4}
          py={6}
          fontSize="sm"
          fontWeight="600"
          color="blue.600"
        >
          Trilogy Ressourcery
        </Button>
      </VStack>

      <Box p={4} borderTop="1px" borderColor="gray.200" fontSize="xs" color="gray.500" textAlign="center" w="full">
        MyRBE Trilogy
      </Box>
    </VStack>
  );

  return (
    <SidebarLayout sidebar={sidebarContent}>
      <VStack align="stretch" spacing={0} h="full" w="full">
        <Box p={6} borderBottom="1px" borderColor="gray.200" bg="white">
          <Heading size="lg">Trilogy Ressourcery</Heading>
          <Text fontSize="sm" color="gray.500">
            Espace de ressources Trilogy: supports, assets, références et éléments à centraliser.
          </Text>
        </Box>

        <Box flex={1} overflowY="auto" p={6} w="full">
          <VStack spacing={6} align="stretch">
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                <CardBody>
                  <HStack mb={2}>
                    <Icon as={FiFolder} color="blue.500" />
                    <Text fontWeight="bold">Assets</Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">Logos, images, icônes et variantes à référencer.</Text>
                </CardBody>
              </Card>
              <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                <CardBody>
                  <HStack mb={2}>
                    <Icon as={FiBook} color="green.500" />
                    <Text fontWeight="bold">Guides</Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">Règles éditoriales, typographies, usages et notes de référence.</Text>
                </CardBody>
              </Card>
              <Card bg={cardBg} borderWidth="1px" borderColor="gray.200">
                <CardBody>
                  <HStack mb={2}>
                    <Icon as={FiArchive} color="rbe.500" />
                    <Text fontWeight="bold">Archives</Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">Anciennes versions, inspirations et ressources historiques.</Text>
                </CardBody>
              </Card>
            </SimpleGrid>
          </VStack>
        </Box>
      </VStack>
    </SidebarLayout>
  );
}