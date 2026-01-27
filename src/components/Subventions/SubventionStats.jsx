import {
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  CardBody,
  Heading,
  Text,
  Icon,
  Skeleton,
  Alert,
  AlertIcon,
  useColorModeValue
} from '@chakra-ui/react';
import {
  FiAward,
  FiCheckCircle,
  FiDollarSign,
  FiClock,
  FiTrendingUp,
  FiBarChart2,
  FiActivity,
  FiZap
} from 'react-icons/fi';
import KpiCard from './KpiCard';

/**
 * SubventionStats - Affiche les statistiques complètes des campagnes
 */
export default function SubventionStats({ stats, loading = false }) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');

  if (loading) {
    return (
      <VStack spacing={6} align="stretch">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height="150px" borderRadius="lg" />
          ))}
        </SimpleGrid>
      </VStack>
    );
  }

  if (!stats) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <Heading size="sm">Erreur</Heading>
          <Text fontSize="sm">Impossible de charger les statistiques</Text>
        </Box>
      </Alert>
    );
  }

  const { campaigns = {}, expenses = {}, kpis = {} } = stats;

  return (
    <VStack spacing={6} align="stretch">
      {/* Statistiques principales - Campagnes */}
      <Box>
        <Heading size="md" mb={4}>
          📊 Campagnes
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <KpiCard
            title="Total campagnes"
            value={campaigns.total || 0}
            subtitle="Campagnes existantes"
            icon={FiAward}
            colorScheme="blue"
          />

          <KpiCard
            title="Actives"
            value={campaigns.active || 0}
            subtitle={campaigns.active > 0 ? 'En cours' : 'Aucune'}
            icon={FiCheckCircle}
            colorScheme="green"
          />

          <KpiCard
            title="Budget total"
            value={new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(campaigns.totalBudget || 0)}
            subtitle="Capacité max"
            icon={FiDollarSign}
            colorScheme="green"
          />

          <KpiCard
            title="Expirées"
            value={campaigns.expired || 0}
            subtitle="Fermées"
            icon={FiClock}
            colorScheme="gray"
          />
        </SimpleGrid>
      </Box>

      {/* Statistiques principales - Dépenses */}
      <Box>
        <Heading size="md" mb={4}>
          💼 Dépenses soumises
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <KpiCard
            title="Montant total"
            value={new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(expenses.total || 0)}
            subtitle={`${expenses.count || 0} dépenses`}
            icon={FiDollarSign}
            colorScheme="orange"
          />

          <KpiCard
            title="Approuvées"
            value={new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(expenses.approved || 0)}
            subtitle={`${expenses.approvedCount || 0} dépenses`}
            icon={FiCheckCircle}
            colorScheme="green"
          />

          <KpiCard
            title="En attente"
            value={new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(expenses.pending || 0)}
            subtitle={`${expenses.pendingCount || 0} dépenses`}
            icon={FiActivity}
            colorScheme="yellow"
          />

          <KpiCard
            title="Rejetées"
            value={new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(expenses.rejected || 0)}
            subtitle={`${expenses.rejectedCount || 0} dépenses`}
            icon={FiZap}
            colorScheme="red"
          />
        </SimpleGrid>
      </Box>

      {/* KPIs avancés */}
      <Box>
        <Heading size="md" mb={4}>
          📈 Indicateurs clés
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <KpiCard
            title="Utilisation du budget"
            value={`${kpis.budgetUtilization}%`}
            subtitle="Dépenses vs Budget total"
            icon={FiBarChart2}
            colorScheme="cyan"
            trend={
              kpis.budgetUtilization > 75
                ? { value: 5, isPositive: false }
                : { value: 2, isPositive: true }
            }
          />

          <KpiCard
            title="Taux d'approbation"
            value={`${kpis.expenseApprovalRate}%`}
            subtitle="Dépenses acceptées"
            icon={FiCheckCircle}
            colorScheme="green"
            trend={
              kpis.expenseApprovalRate > 80
                ? { value: 10, isPositive: true }
                : { value: 5, isPositive: false }
            }
          />

          <KpiCard
            title="Montant moyen"
            value={new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(kpis.averageExpenseAmount || 0)}
            subtitle="Par dépense"
            icon={FiDollarSign}
            colorScheme="orange"
          />
        </SimpleGrid>
      </Box>

      {/* Détail par catégorie */}
      {expenses.byCategory && Object.keys(expenses.byCategory).length > 0 && (
        <Box>
          <Heading size="md" mb={4}>
            📂 Dépenses par catégorie
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {Object.entries(expenses.byCategory).map(([category, data]) => (
              <Card key={category} bg={cardBg} borderRadius="lg">
                <CardBody>
                  <VStack align="start" spacing={3}>
                    <Heading size="sm">{category}</Heading>

                    <SimpleGrid columns={2} width="100%" spacing={2}>
                      <Box>
                        <Text fontSize="xs" color="gray.600">
                          Total
                        </Text>
                        <Heading size="sm">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            maximumFractionDigits: 0
                          }).format(data.total || 0)}
                        </Heading>
                      </Box>

                      <Box>
                        <Text fontSize="xs" color="gray.600">
                          Nombre
                        </Text>
                        <Heading size="sm">{data.count}</Heading>
                      </Box>

                      <Box>
                        <Text fontSize="xs" color="green.600">
                          Approuvées
                        </Text>
                        <Heading size="sm" color="green.600">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            maximumFractionDigits: 0
                          }).format(data.approved || 0)}
                        </Heading>
                      </Box>

                      <Box>
                        <Text fontSize="xs" color="yellow.600">
                          En attente
                        </Text>
                        <Heading size="sm" color="yellow.600">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            maximumFractionDigits: 0
                          }).format(data.pending || 0)}
                        </Heading>
                      </Box>
                    </SimpleGrid>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </VStack>
  );
}
