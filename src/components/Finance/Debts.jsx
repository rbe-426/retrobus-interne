import React, { useState } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Badge, Table, Thead, Tbody, Tr, Th, Td,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, FormControl, FormLabel, Input, Select,
  NumberInput, NumberInputField, Textarea, useToast, Icon, Flex
} from "@chakra-ui/react";
import { FiPlus, FiEdit2, FiTrash2, FiAlertCircle } from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";

/**
 * Composant de gestion des dettes
 * Permet de suivre les dettes envers les fournisseurs et créanciers
 */
const FinanceDebts = () => {
  const { loading } = useFinanceData();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // États locaux (à intégrer avec useFinanceData plus tard)
  const [debts, setDebts] = useState([]);
  const [formData, setFormData] = useState({
    creditorName: "",
    description: "",
    amount: "",
    dueDate: "",
    status: "PENDING"
  });

  const handleAdd = () => {
    const newDebt = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString()
    };
    setDebts([...debts, newDebt]);
    setFormData({
      creditorName: "",
      description: "",
      amount: "",
      dueDate: "",
      status: "PENDING"
    });
    onClose();
    toast({
      title: "Dette ajoutée",
      status: "success",
      duration: 3000
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Confirmer la suppression ?")) {
      setDebts(debts.filter(d => d.id !== id));
      toast({
        title: "Dette supprimée",
        status: "success",
        duration: 3000
      });
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: "orange",
      PAID: "green",
      OVERDUE: "red"
    };
    const labels = {
      PENDING: "En attente",
      PAID: "Payée",
      OVERDUE: "En retard"
    };
    return (
      <Badge colorScheme={colors[status] || "gray"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const totalDue = debts
    .filter(d => d.status !== "PAID")
    .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

  return (
    <VStack align="stretch" spacing={6}>
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">Dettes & Créanciers</Heading>
          <Text color="gray.500" fontSize="sm">
            Suivi des dettes et échéances à payer
          </Text>
        </Box>
        <Button leftIcon={<FiPlus />} colorScheme="red" onClick={onOpen} isLoading={loading}>
          Nouvelle dette
        </Button>
      </HStack>

      {/* Résumé */}
      <Card bg="red.50" borderColor="red.200" borderWidth={1}>
        <CardBody>
          <HStack>
            <Icon as={FiAlertCircle} color="red.500" boxSize={6} />
            <Box>
              <Text fontWeight="bold" fontSize="xl" color="red.700">
                {totalDue.toFixed(2)} €
              </Text>
              <Text fontSize="sm" color="red.600">
                Total des dettes en attente
              </Text>
            </Box>
          </HStack>
        </CardBody>
      </Card>

      {/* Liste des dettes */}
      <Card>
        <CardHeader>
          <Heading size="md">Liste des dettes</Heading>
        </CardHeader>
        <CardBody>
          {debts.length === 0 ? (
            <Text color="gray.500" textAlign="center" py={8}>
              Aucune dette enregistrée
            </Text>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Créancier</Th>
                  <Th>Description</Th>
                  <Th isNumeric>Montant</Th>
                  <Th>Échéance</Th>
                  <Th>Statut</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {debts.map((debt) => (
                  <Tr key={debt.id}>
                    <Td fontWeight="medium">{debt.creditorName}</Td>
                    <Td>{debt.description}</Td>
                    <Td isNumeric fontWeight="bold" color="red.600">
                      {parseFloat(debt.amount).toFixed(2)} €
                    </Td>
                    <Td>{new Date(debt.dueDate).toLocaleDateString('fr-FR')}</Td>
                    <Td>{getStatusBadge(debt.status)}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button size="sm" leftIcon={<FiEdit2 />} variant="ghost">
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          leftIcon={<FiTrash2 />}
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDelete(debt.id)}
                        >
                          Supprimer
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Modal Ajout Dette */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nouvelle Dette</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Créancier</FormLabel>
                <Input
                  placeholder="Nom du fournisseur ou créancier"
                  value={formData.creditorName}
                  onChange={(e) => setFormData({ ...formData, creditorName: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Détails de la dette"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Montant (€)</FormLabel>
                <NumberInput
                  value={formData.amount}
                  onChange={(value) => setFormData({ ...formData, amount: value })}
                  min={0}
                  precision={2}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Date d'échéance</FormLabel>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Statut</FormLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="PENDING">En attente</option>
                  <option value="PAID">Payée</option>
                  <option value="OVERDUE">En retard</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="red" onClick={handleAdd}>
              Ajouter
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default FinanceDebts;
