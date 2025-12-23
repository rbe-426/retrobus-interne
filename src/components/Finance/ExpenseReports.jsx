import React, { useState } from "react";
import {
  Box, VStack, HStack, Card, CardHeader, CardBody,
  Heading, Text, Button, Badge, useToast, Table, Thead, Tbody,
  Tr, Th, Td, Alert, AlertIcon, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel, Input,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Textarea, useDisclosure, Spinner, Flex
} from "@chakra-ui/react";
import { FiPlus, FiTrash2, FiDownload } from "react-icons/fi";
import { useFinanceData } from "../../hooks/useFinanceData";

/**
 * ExpenseReports - Notes de frais
 * Accessible à TOUS les utilisateurs pour déposer des notes
 */
const ExpenseReports = () => {
  const {
    expenseReports,
    createExpenseReport,
    deleteExpenseReport,
    loading
  } = useFinanceData();

  console.log('💰 ExpenseReports Component - expenseReports:', expenseReports);
  console.log('💰 Length:', expenseReports?.length);
  
  const myReports = expenseReports.filter(r => r.isOwn || !r.userId); // Mes notes
  console.log('💰 myReports after filter:', myReports);

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    attachment: null
  });

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAmountChange = (value) => {
    setFormData(prev => ({
      ...prev,
      amount: value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      attachment: e.target.files?.[0] || null
    }));
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.amount) {
      toast({
        title: "Champs requis",
        description: "Description et montant sont obligatoires",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      const result = await createExpenseReport({
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        notes: formData.notes,
        attachment: formData.attachment
      });

      if (result) {
        toast({
          title: "Note de frais déposée",
          description: "Votre note a été enregistrée et est en attente de validation",
          status: "success",
          duration: 3000,
          isClosable: true
        });

        setFormData({
          description: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          notes: "",
          attachment: null
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la note de frais",
        status: "error",
        duration: 4000,
        isClosable: true
      });
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      try {
        await deleteExpenseReport(id);
        toast({
          title: "Supprimée",
          description: "La note de frais a été supprimée",
          status: "success",
          duration: 2000,
          isClosable: true
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer la note",
          status: "error"
        });
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { colorScheme: "yellow", label: "En attente" },
      APPROVED: { colorScheme: "blue", label: "Approuvée" },
      PAID: { colorScheme: "green", label: "Payée" },
      REJECTED: { colorScheme: "red", label: "Rejetée" }
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return <Badge colorScheme={config.colorScheme}>{config.label}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  const myReports = expenseReports.filter(r => r.isOwn || !r.userId); // Mes notes
  const totalAmount = myReports.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <VStack align="stretch" spacing={6}>
      {/* Header */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">Mes notes de frais</Heading>
          <Text color="gray.500" fontSize="sm">
            Déposez vos notes de frais en attente de validation
          </Text>
        </Box>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="green"
          onClick={onOpen}
          isLoading={loading}
        >
          Nouvelle note
        </Button>
      </HStack>

      {/* Statistiques personnelles */}
      {myReports.length > 0 && (
        <Card>
          <CardBody>
            <HStack spacing={8}>
              <Box>
                <Text fontSize="sm" color="gray.500">Total déposé</Text>
                <Heading size="md" color="green.600">
                  {formatCurrency(totalAmount)}
                </Heading>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500">Notes en attente</Text>
                <Heading size="md" color="yellow.600">
                  {myReports.filter(r => r.status === "PENDING").length}
                </Heading>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500">Notes payées</Text>
                <Heading size="md" color="green.600">
                  {formatCurrency(
                    myReports
                      .filter(r => r.status === "PAID")
                      .reduce((sum, r) => sum + (r.amount || 0), 0)
                  )}
                </Heading>
              </Box>
            </HStack>
          </CardBody>
        </Card>
      )}

      {/* Liste des notes */}
      {loading ? (
        <Flex justify="center" p={8}>
          <Spinner size="lg" />
        </Flex>
      ) : myReports.length === 0 ? (
        <Alert status="info">
          <AlertIcon />
          Aucune note de frais déposée pour le moment
        </Alert>
      ) : (
        <Card>
          <CardBody p={0}>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th isNumeric>Montant</Th>
                  <Th>Statut</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {myReports.map(report => (
                  <Tr key={report.id}>
                    <Td>{formatDate(report.date || report.createdAt)}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="sm">
                          {report.description}
                        </Text>
                        {report.notes && (
                          <Text fontSize="xs" color="gray.500">
                            {report.notes}
                          </Text>
                        )}
                      </VStack>
                    </Td>
                    <Td isNumeric fontWeight="bold">
                      {formatCurrency(report.amount)}
                    </Td>
                    <Td>{getStatusBadge(report.status)}</Td>
                    <Td>
                      {report.status === "PENDING" && (
                        <Button
                          size="xs"
                          leftIcon={<FiTrash2 />}
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDelete(report.id)}
                        >
                          Supprimer
                        </Button>
                      )}
                      {report.attachment && (
                        <Button
                          size="xs"
                          leftIcon={<FiDownload />}
                          variant="ghost"
                          colorScheme="blue"
                          as="a"
                          href={report.attachment}
                          target="_blank"
                        >
                          Pièce
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* Modal de création */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nouvelle note de frais</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Ex: Achat fournitures bureau"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Montant (€)</FormLabel>
                <NumberInput
                  value={formData.amount}
                  onChange={handleAmountChange}
                  precision={2}
                  step={0.01}
                >
                  <NumberInputField placeholder="0.00" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Notes supplémentaires</FormLabel>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Détails additionnels..."
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Pièce justificative (facture, reçu...)</FormLabel>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  size="sm"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Formats acceptés: PDF, JPG, PNG
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button
              colorScheme="green"
              onClick={handleSubmit}
              isLoading={loading}
            >
              Déposer la note
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default ExpenseReports;
