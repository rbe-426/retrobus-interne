import React, { useState, useEffect } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Input, Switch, FormControl,
  FormLabel, useToast, Alert, AlertIcon, Divider,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Textarea
} from "@chakra-ui/react";
import { FiSave, FiLock } from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";

const FinanceSettings = () => {
  const {
    balance,
    updateBalance,
    isBalanceLocked,
    setIsBalanceLocked,
    loading
  } = useFinanceData();

  const [newBalance, setNewBalance] = useState(balance);
  const [balanceReason, setBalanceReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const toast = useToast();

  // Charger l'historique d'audit depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem("financeAuditLog");
    if (stored) {
      try {
        setAuditLog(JSON.parse(stored));
      } catch (e) {
        console.warn("Erreur lecture audit log");
      }
    }
  }, []);

  // Garder newBalance synchronisé avec balance
  useEffect(() => {
    setNewBalance(balance);
  }, [balance]);

  const handleSaveBalance = async () => {
    if (newBalance === balance && !balanceReason) {
      toast({
        title: "Aucune modification",
        status: "info"
      });
      return;
    }

    if (isBalanceLocked) {
      toast({
        title: "Erreur",
        description: "Le solde est verrouillé",
        status: "error"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Appel API pour mettre à jour le solde
      const success = await updateBalance(parseFloat(newBalance), balanceReason);
      
      if (success) {
        // Ajouter à l'historique d'audit local
        const newEntry = {
          id: Date.now(),
          timestamp: new Date().toLocaleString('fr-FR'),
          user: localStorage.getItem('userName') || "Utilisateur",
          action: "Modification solde",
          oldValue: balance.toFixed(2),
          newValue: newBalance,
          reason: balanceReason || "Mise à jour manuelle"
        };
        
        const updated = [newEntry, ...auditLog];
        setAuditLog(updated);
        localStorage.setItem("financeAuditLog", JSON.stringify(updated));
        
        setBalanceReason("");
        toast({
          title: "Succès",
          description: "Solde mis à jour",
          status: "success"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error"
      });
      setNewBalance(balance);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleLock = () => {
    setIsBalanceLocked(!isBalanceLocked);
    toast({
      title: isBalanceLocked ? "Déverrouillé" : "Verrouillé",
      description: `Le solde est ${!isBalanceLocked ? "maintenant " : ""}verrouillé`,
      status: "success"
    });
  };

  return (
    <VStack align="stretch" spacing={6}>
      {/* Header */}
      <Box>
        <Heading size="lg">Paramètres Finances</Heading>
        <Text color="gray.500" fontSize="sm">
          Configuration et gestion du solde
        </Text>
      </Box>

      {/* Gestion du solde */}
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Heading size="md">Gestion du Solde</Heading>
            <Button
              leftIcon={<FiLock />}
              size="sm"
              variant={isBalanceLocked ? "solid" : "outline"}
              colorScheme={isBalanceLocked ? "red" : "gray"}
              onClick={handleToggleLock}
            >
              {isBalanceLocked ? "Verrouillé" : "Déverrouillé"}
            </Button>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack align="stretch" spacing={4}>
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <Text fontSize="sm">
                  Le solde est <strong>{isBalanceLocked ? "verrouillé" : "déverrouillé"}</strong>. 
                  Les modifications {isBalanceLocked ? "ne " : ""}seront enregistrées dans l'historique d'audit.
                </Text>
              </Box>
            </Alert>

            <FormControl>
              <FormLabel>Solde actuel</FormLabel>
              <Input
                type="number"
                step="0.01"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                isDisabled={isBalanceLocked}
                fontSize="lg"
                fontWeight="bold"
                color="blue.500"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Raison de la modification (optionnel)</FormLabel>
              <Textarea
                placeholder="Ex: Correction suite audit, Synchronisation manuelle..."
                isDisabled={isBalanceLocked}
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
              />
            </FormControl>

            <Button
              leftIcon={<FiSave />}
              colorScheme="blue"
              onClick={handleSaveBalance}
              isLoading={isSaving || loading}
              isDisabled={isBalanceLocked}
              w="100%"
            >
              Enregistrer le solde
            </Button>
          </VStack>
        </CardBody>
      </Card>

      <Divider />

      {/* Historique d'audit */}
      <Card>
        <CardHeader>
          <Heading size="md">Historique d'Audit du Solde</Heading>
        </CardHeader>
        <CardBody overflowX="auto">
          {auditLog.length > 0 ? (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr bg="gray.50">
                  <Th>Date/Heure</Th>
                  <Th>Utilisateur</Th>
                  <Th>Action</Th>
                  <Th>Ancien solde</Th>
                  <Th>Nouveau solde</Th>
                  <Th>Raison</Th>
                </Tr>
              </Thead>
              <Tbody>
                {auditLog.map(entry => (
                  <Tr key={entry.id} _hover={{ bg: "gray.50" }}>
                    <Td fontSize="xs">{entry.timestamp}</Td>
                    <Td fontWeight="500">{entry.user}</Td>
                    <Td>
                      <Badge colorScheme="blue">{entry.action}</Badge>
                    </Td>
                    <Td isNumeric fontSize="sm">{entry.oldValue} €</Td>
                    <Td isNumeric fontSize="sm" fontWeight="600">{entry.newValue} €</Td>
                    <Td fontSize="sm" color="gray.600">{entry.reason}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Text color="gray.500" textAlign="center" py={8}>
              Aucune modification du solde enregistrée
            </Text>
          )}
        </CardBody>
      </Card>

      <Divider />

      {/* Infos système */}
      <Card>
        <CardHeader>
          <Heading size="md">Informations Système</Heading>
        </CardHeader>
        <CardBody>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between" p={2} borderRadius="md" bg="gray.50">
              <Text fontWeight="500">Version API</Text>
              <Badge colorScheme="blue">v2.0</Badge>
            </HStack>
            <HStack justify="space-between" p={2} borderRadius="md" bg="gray.50">
              <Text fontWeight="500">Dernière synchronisation</Text>
              <Text fontSize="sm" color="gray.600">
                {new Date().toLocaleString('fr-FR')}
              </Text>
            </HStack>
            <HStack justify="space-between" p={2} borderRadius="md" bg="gray.50">
              <Text fontWeight="500">État du système</Text>
              <Badge colorScheme="green">En ligne</Badge>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default FinanceSettings;
