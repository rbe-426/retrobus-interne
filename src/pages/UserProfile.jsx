import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Avatar,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Divider,
  Button,
  SimpleGrid,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PageLayout from '../components/Layout/PageLayout';
import UserPermissionsDisplay from '../components/UserPermissionsDisplay';

export default function UserProfile() {
  const { user, roles } = useUser();
  const bgCard = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  if (!user) {
    return (
      <PageLayout
        title="Mon Profil"
        subtitle="Vos informations personnelles et permissions"
        bgGradient="linear(to-r, blue.500, purple.600)"
      >
        <Text>Chargement...</Text>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Mon Profil"
      subtitle="Vos informations personnelles et permissions"
      headerVariant="card"
      bgGradient="linear(to-r, blue.500, purple.600)"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard/home" },
        { label: "Mon Profil", href: "/dashboard/profile" }
      ]}
    >
      <VStack spacing={8} align="stretch">
        {/* Informations personnelles */}
        <Card bg={bgCard} borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <Heading size="md">👤 Informations Personnelles</Heading>
          </CardHeader>
          <Divider />
          <CardBody>
            <HStack spacing={6} align="flex-start">
              <Avatar
                size="xl"
                name={`${user.firstName} ${user.lastName}`}
                src={user.avatar}
              />
              
              <VStack align="start" spacing={3} flex={1}>
                <Box>
                  <Text fontSize="sm" color="gray.600">Nom complet</Text>
                  <Heading size="md">
                    {user.firstName} {user.lastName}
                  </Heading>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600">Email</Text>
                  <Text fontWeight="medium">{user.email}</Text>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600">Rôle(s)</Text>
                  <HStack spacing={2} mt={1}>
                    {roles && roles.length > 0 ? (
                      roles.map(role => (
                        <Badge key={role} colorScheme="blue">
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <Badge colorScheme="gray">MEMBER</Badge>
                    )}
                  </HStack>
                </Box>

                {user.hasInternalAccess && (
                  <Box>
                    <Badge colorScheme="green">✓ Accès interne activé</Badge>
                  </Box>
                )}
              </VStack>
            </HStack>
          </CardBody>
        </Card>

        {/* Onglets: Permissions et Paramètres */}
        <Tabs colorScheme="blue" variant="enclosed">
          <TabList>
            <Tab>🔐 Mes Permissions</Tab>
            <Tab>⚙️ Paramètres</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <UserPermissionsDisplay />
            </TabPanel>

            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Card>
                  <CardHeader>
                    <Heading size="md">🔑 Paramètres de Sécurité</Heading>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Box pb={4} borderBottom="1px solid" borderColor={borderColor}>
                        <HStack justify="space-between" mb={2}>
                          <Box>
                            <Text fontWeight="bold">Mot de passe</Text>
                            <Text fontSize="sm" color="gray.600">Dernière modification: Il y a 3 mois</Text>
                          </Box>
                          <Button size="sm" colorScheme="blue" variant="outline">
                            Modifier
                          </Button>
                        </HStack>
                      </Box>

                      <Box pb={4} borderBottom="1px solid" borderColor={borderColor}>
                        <HStack justify="space-between">
                          <Box>
                            <Text fontWeight="bold">Authentification à deux facteurs</Text>
                            <Text fontSize="sm" color="gray.600">Non activée</Text>
                          </Box>
                          <Button size="sm" colorScheme="green" variant="outline">
                            Activer
                          </Button>
                        </HStack>
                      </Box>

                      <Box pb={4} borderBottom="1px solid" borderColor={borderColor}>
                        <HStack justify="space-between">
                          <Box>
                            <Text fontWeight="bold">Sessions actives</Text>
                            <Text fontSize="sm" color="gray.600">1 session active</Text>
                          </Box>
                          <Button size="sm" colorScheme="red" variant="outline">
                            Gérer
                          </Button>
                        </HStack>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading size="md">🔔 Notifications</Heading>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <Text fontSize="sm" color="gray.600">
                      Les paramètres de notification seront bientôt disponibles.
                    </Text>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <Heading size="md">🚀 Actions Rapides</Heading>
          </CardHeader>
          <Divider />
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Button as={RouterLink} to="/dashboard/myrbe" colorScheme="blue">
                ← Retour à MyRBE
              </Button>
              <Button colorScheme="red" variant="outline">
                Se déconnecter
              </Button>
            </SimpleGrid>
          </CardBody>
        </Card>
      </VStack>
    </PageLayout>
  );
}
