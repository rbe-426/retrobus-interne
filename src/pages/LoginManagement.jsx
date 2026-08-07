import React, { useState, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Card, CardBody,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Button, InputGroup,
  InputLeftElement, Input, Select, Alert, AlertIcon, Spinner,
  SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText,
  useColorModeValue, IconButton, Tooltip
} from '@chakra-ui/react';
import {
  FiActivity, FiSearch, FiRefreshCw, FiDownload, FiEye,
  FiShield, FiUsers, FiLogIn, FiLogOut, FiAlertCircle
} from 'react-icons/fi';

export default function LoginManagement() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: 'ALL',
    success: 'ALL',
    member: '',
    limit: 100
  });
  const [stats, setStats] = useState({});

  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    loadConnectionLogs();
    loadStats();
  }, [filter]);

  const loadConnectionLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter.type !== 'ALL') params.append('type', filter.type);
      if (filter.success !== 'ALL') params.append('success', filter.success);
      if (filter.member) params.append('member', filter.member);
      params.append('limit', filter.limit);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/connection-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Erreur chargement logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/connection-logs/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const getLogTypeInfo = (type) => {
    const types = {
      'LOGIN_ATTEMPT': { label: 'Tentative', color: 'blue', icon: FiLogIn },
      'LOGIN_SUCCESS': { label: 'Connexion', color: 'green', icon: FiLogIn },
      'LOGOUT': { label: 'Déconnexion', color: 'gray', icon: FiLogOut },
      'PASSWORD_RESET': { label: 'Reset MDP', color: 'orange', icon: FiRefreshCw },
      'ACCOUNT_ENABLED': { label: 'Activé', color: 'green', icon: FiShield },
      'ACCOUNT_DISABLED': { label: 'Désactivé', color: 'red', icon: FiShield }
    };
    return types[type] || { label: type, color: 'gray', icon: FiActivity };
  };

  const exportLogs = () => {
    const csvData = logs.map(log => ({
      Date: new Date(log.timestamp).toLocaleString('fr-FR'),
      Membre: log.member ? `${log.member.firstName} ${log.member.lastName}` : 'N/A',
      Type: getLogTypeInfo(log.type).label,
      Succès: log.success ? 'Oui' : 'Non',
      IP: log.ipAddress,
      Détails: log.details
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs-connexion-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Heading size="lg" display="flex" alignItems="center">
              <FiActivity style={{ marginRight: '12px' }} />
              Logs de Connexion MyRBE
            </Heading>
            <Text color="gray.600">
              Surveillance et audit des connexions au système interne
            </Text>
          </VStack>
          
          <HStack>
            <Button leftIcon={<FiDownload />} onClick={exportLogs} size="sm">
              Exporter CSV
            </Button>
            <Button leftIcon={<FiRefreshCw />} onClick={loadConnectionLogs} size="sm">
              Actualiser
            </Button>
          </HStack>
        </HStack>

        {/* Statistiques */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Connexions aujourd'hui</StatLabel>
                <StatNumber color="green.500">{stats.todayLogins || 0}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Échecs de connexion</StatLabel>
                <StatNumber color="red.500">{stats.failedLogins || 0}</StatNumber>
                <StatHelpText>24 dernières heures</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Comptes actifs</StatLabel>
                <StatNumber color="blue.500">{stats.activeAccounts || 0}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Dernière activité</StatLabel>
                <StatNumber color="purple.500" fontSize="md">
                  {stats.lastActivity ? new Date(stats.lastActivity).toLocaleTimeString('fr-FR') : 'N/A'}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Filtres */}
        <Card bg={cardBg}>
          <CardBody>
            <HStack spacing={4}>
              <InputGroup maxW="300px">
                <InputLeftElement>
                  <FiSearch />
                </InputLeftElement>
                <Input
                  placeholder="Rechercher un membre..."
                  value={filter.member}
                  onChange={(e) => setFilter(prev => ({ ...prev, member: e.target.value }))}
                />
              </InputGroup>
              
              <Select
                value={filter.type}
                onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
                maxW="200px"
              >
                <option value="ALL">Tous types</option>
                <option value="LOGIN_SUCCESS">Connexions</option>
                <option value="LOGIN_ATTEMPT">Tentatives</option>
                <option value="PASSWORD_RESET">Reset MDP</option>
                <option value="ACCOUNT_ENABLED">Activations</option>
              </Select>
              
              <Select
                value={filter.success}
                onChange={(e) => setFilter(prev => ({ ...prev, success: e.target.value }))}
                maxW="150px"
              >
                <option value="ALL">Tous statuts</option>
                <option value="true">Succès</option>
                <option value="false">Échecs</option>
              </Select>
            </HStack>
          </CardBody>
        </Card>

        {/* Table des logs */}
        <Card bg={cardBg}>
          <CardBody>
            {loading ? (
              <VStack spacing={4} py={8}>
                <Spinner size="lg" />
                <Text>Chargement des logs...</Text>
              </VStack>
            ) : logs.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                Aucun log trouvé avec ces critères
              </Alert>
            ) : (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Date/Heure</Th>
                    <Th>Membre</Th>
                    <Th>Type</Th>
                    <Th>Statut</Th>
                    <Th>IP</Th>
                    <Th>Détails</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {logs.map((log) => {
                    const typeInfo = getLogTypeInfo(log.type);
                    const Icon = typeInfo.icon;
                    
                    return (
                      <Tr key={log.id}>
                        <Td>{new Date(log.timestamp).toLocaleString('fr-FR')}</Td>
                        <Td>
                          {log.member ? (
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="medium">
                                {log.member.firstName} {log.member.lastName}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {log.member.matricule}
                              </Text>
                            </VStack>
                          ) : (
                            <Text fontSize="sm" color="gray.500">Inconnu</Text>
                          )}
                        </Td>
                        <Td>
                          <Badge colorScheme={typeInfo.color} size="sm">
                            <Icon style={{ marginRight: '4px' }} />
                            {typeInfo.label}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={log.success ? 'green' : 'red'} size="sm">
                            {log.success ? 'Succès' : 'Échec'}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="sm" fontFamily="mono">
                            {log.ipAddress}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="xs" maxW="200px" isTruncated>
                            {log.details}
                          </Text>
                        </Td>
                        <Td>
                          <Tooltip label="Voir détails">
                            <IconButton
                              icon={<FiEye />}
                              size="sm"
                              variant="ghost"
                              onClick={() => console.log('Détails:', log)}
                            />
                          </Tooltip>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}