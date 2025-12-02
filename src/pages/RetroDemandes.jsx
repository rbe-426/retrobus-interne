/**
 * Page RÃ©troDemandes unifiÃ©e
 * - Onglet "RÃ©troDemande" : pour TOUS (clients/partenaires/adhÃ©rents)
 * - Onglet "RÃ©capitulatif" : pour ADHÃ‰RENTS avec rÃ´le PRÃ‰SIDENT, VICE-PRÃ‰SIDENT ou TRÃ‰SORIER
 * - Style cohÃ©rent avec Finance
 * - OptimisÃ©e pour mobile
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardHeader,
  CardBody,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Flex,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  IconButton,
  Divider,
  Grid,
  useBreakpointValue,
  SimpleGrid
} from "@chakra-ui/react";
import {
  DeleteIcon,
  EditIcon,
  ViewIcon
} from "@chakra-ui/icons";
import {
  FiPlus,
  FiDownload,
  FiFileText,
  FiUpload,
  FiFile,
  FiX
} from "react-icons/fi";
import WorkspaceLayout from "../components/Layout/WorkspaceLayout";
import { apiClient } from "../api/config";
import { useUser } from "../context/UserContext";

const RetroDemandes = () => {
  const toast = useToast();
  const { user } = useUser();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  const { isOpen: isLinkDevisOpen, onOpen: onLinkDevisOpen, onClose: onLinkDevisClose } = useDisclosure();
  const { isOpen: isLinkFactureOpen, onOpen: onLinkFactureOpen, onClose: onLinkFactureClose } = useDisclosure();
  
  const [requests, setRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [devis, setDevis] = useState([]);
  const [factures, setFactures] = useState([]);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "GENERAL",
    priority: "NORMAL"
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // VÃ©rifier si l'utilisateur peut accÃ©der Ã  l'onglet RÃ©capitulatif
  const canViewRecap = useCallback(() => {
    if (!user) return false;
    const roles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
    const hasAdminRole = roles.some(r => 
      r === "ADMIN" || r === "PRESIDENT" || r === "VICE_PRESIDENT" || r === "TRESORIER" || r === "SECRETAIRE_GENERAL"
    );
    return hasAdminRole;
  }, [user]);

  // Charger les demandes de l'utilisateur
  const loadMyRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/api/retro-requests");
      if (response.requests) {
        setRequests(response.requests);
      }
    } catch (error) {
      console.error("Erreur chargement mes demandes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos demandes",
        status: "error",
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Charger toutes les demandes (pour rÃ©capitulatif)
  const loadAllRequests = useCallback(async () => {
    if (!canViewRecap()) return;
    try {
      setLoading(true);
      const response = await apiClient.get("/api/retro-requests/admin/all");
      if (response.requests) {
        setAllRequests(response.requests);
      }
    } catch (error) {
      console.error("Erreur chargement toutes les demandes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger toutes les demandes",
        status: "error",
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  }, [canViewRecap, toast]);

  useEffect(() => {
    loadMyRequests();
    if (canViewRecap()) {
      loadAllRequests();
    }
  }, [loadMyRequests, loadAllRequests, canViewRecap]);

  // CrÃ©er une nouvelle demande
  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast({
        title: "Erreur",
        description: "Le titre et la description sont obligatoires",
        status: "warning"
      });
      return;
    }

    try {
      setLoading(true);
      let requestId;
      
      if (editingId) {
        await apiClient.put(`/api/retro-requests/${editingId}`, formData);
        requestId = editingId;
        toast({
          title: "SuccÃ¨s",
          description: "Demande modifiÃ©e",
          status: "success"
        });
      } else {
        const response = await apiClient.post("/api/retro-requests", formData);
        requestId = response.request.id;
        toast({
          title: "SuccÃ¨s",
          description: "Demande crÃ©Ã©e",
          status: "success"
        });
      }
      
      // Upload files if any
      if (uploadedFiles.length > 0 && requestId) {
        for (const file of uploadedFiles) {
          if (file.file) { // Only upload new files (not already uploaded)
            const event = { target: { files: [file.file] } };
            await handleFileUpload(event, requestId);
          }
        }
      }
      
      setFormData({ title: "", description: "", category: "GENERAL", priority: "NORMAL" });
      setUploadedFiles([]);
      setEditingId(null);
      onClose();
      await loadMyRequests();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la demande",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({ title: "", description: "", category: "GENERAL", priority: "NORMAL" });
    setUploadedFiles([]);
    onOpen();
  };

  const handleEdit = (request) => {
    setEditingId(request.id);
    setFormData({
      title: request.title,
      description: request.description,
      category: request.category,
      priority: request.priority
    });
    onOpen();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ÃŠtes-vous sÃ»r de vouloir supprimer cette demande ?")) return;
    
    try {
      setLoading(true);
      await apiClient.delete(`/api/retro-requests/${id}`);
      toast({
        title: "SuccÃ¨s",
        description: "Demande supprimÃ©e",
        status: "success"
      });
      await loadMyRequests();
    } catch (error) {
      console.error("Erreur suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la demande",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedRequest) return;
    
    try {
      setLoading(true);
      await apiClient.post(`/api/retro-requests/${selectedRequest.id}/status`, {
        status: newStatus,
        reason: "Changement de statut"
      });
      toast({
        title: "SuccÃ¨s",
        description: "Statut modifiÃ©",
        status: "success"
      });
      // Mettre Ã  jour selectedRequest avec le nouveau statut
      setSelectedRequest({
        ...selectedRequest,
        status: newStatus
      });
      await loadMyRequests();
    } catch (error) {
      console.error("Erreur changement statut:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    onPreviewOpen();
  };

  const handleFileUpload = async (event, requestId) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/retro-requests/${requestId}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        setUploadedFiles([...uploadedFiles, data.file]);
        toast({
          title: "SuccÃ¨s",
          description: `${file.name} uploadÃ©`,
          status: "success"
        });
      }

      // Recharger la demande
      if (requestId) {
        const req = await apiClient.get(`/api/retro-requests/${requestId}`);
        setSelectedRequest(req.request);
      }
    } catch (error) {
      console.error("Erreur upload:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader le fichier",
        status: "error"
      });
    }
  };

  const handleDeleteFile = async (requestId, fileId) => {
    if (!window.confirm("ÃŠtes-vous sÃ»r de vouloir supprimer ce fichier ?")) return;

    try {
      setLoading(true);
      await apiClient.delete(`/api/retro-requests/${requestId}/files/${fileId}`);
      toast({
        title: "SuccÃ¨s",
        description: "Fichier supprimÃ©",
        status: "success"
      });
      
      // Mettre Ã  jour la liste des fichiers
      if (selectedRequest) {
        const updatedRequest = {
          ...selectedRequest,
          retro_request_file: selectedRequest.retro_request_file.filter(f => f.id !== fileId)
        };
        setSelectedRequest(updatedRequest);
      }
      setUploadedFiles(uploadedFiles.filter(f => f.id !== fileId));
    } catch (error) {
      console.error("Erreur suppression fichier:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fichier",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { label: "â³ En attente", color: "orange" },
      ASSIGNED: { label: "ðŸ‘¤ AssignÃ©e", color: "blue" },
      IN_PROGRESS: { label: "ðŸ”„ En cours", color: "blue" },
      COMPLETED: { label: "âœ… ComplÃ©tÃ©e", color: "green" },
      CLOSED: { label: "ðŸ”’ FermÃ©e", color: "gray" },
      REJECTED: { label: "âŒ RejetÃ©e", color: "red" }
    };
    const s = statusMap[status] || { label: status, color: "gray" };
    return <Badge colorScheme={s.color}>{s.label}</Badge>;
  };

  const categoryLabel = (cat) => {
    const cats = {
      GENERAL: "GÃ©nÃ©ral",
      REPAIR: "RÃ©paration",
      MAINTENANCE: "Maintenance",
      SERVICE: "Service",
      CUSTOM: "PersonnalisÃ©"
    };
    return cats[cat] || cat;
  };

  const isMobile = useBreakpointValue({ base: true, md: false });
  const tableSize = isMobile ? "sm" : "md";

  const renderMyRequestsSection = () => (
    <VStack align="stretch" spacing={6}>
      <Card>
        <CardHeader pb={0}>
          <VStack align="flex-start" spacing={1}>
            <Heading size="md">Mes demandes</Heading>
            <Text color="gray.600">Suivez, modifiez ou crÃ©ez vos RÃ©troDemandes.</Text>
          </VStack>
        </CardHeader>
        <CardBody>
          {loading && requests.length === 0 ? (
            <Flex justify="center" py={10}>
              <Spinner />
            </Flex>
          ) : requests.length === 0 ? (
            <Box textAlign="center" py={10} color="gray.500">
              <Text mb={4}>Aucune demande pour le moment</Text>
              <Button
                colorScheme="blue"
                size="sm"
                leftIcon={<FiPlus />}
                onClick={handleNew}
              >
                CrÃ©er une demande
              </Button>
            </Box>
          ) : isMobile ? (
            <SimpleGrid spacing={4} columns={1}>
              {requests.map((req) => (
                <Card key={req.id} variant="outline">
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <HStack justify="space-between" width="100%">
                        <Heading size="sm">{req.title}</Heading>
                        {getStatusBadge(req.status)}
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        {req.description}
                      </Text>
                      <HStack spacing={2} fontSize="xs" color="gray.500">
                        <Badge>{categoryLabel(req.category)}</Badge>
                        <Text>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </Text>
                      </HStack>
                      <HStack spacing={2} width="100%" pt={2}>
                        <IconButton
                          icon={<ViewIcon />}
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(req)}
                          title="Voir dÃ©tails"
                        />
                        {req.status === "PENDING" && (
                          <>
                            <IconButton
                              icon={<EditIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={() => handleEdit(req)}
                              title="Ã‰diter"
                            />
                            <IconButton
                              icon={<DeleteIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDelete(req.id)}
                              title="Supprimer"
                            />
                          </>
                        )}
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <Box overflowX="auto">
              <Table size={tableSize} variant="striped">
                <Thead>
                  <Tr>
                    <Th>Titre</Th>
                    <Th>CatÃ©gorie</Th>
                    <Th>PrioritÃ©</Th>
                    <Th>Statut</Th>
                    <Th>Date</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {requests.map((req) => (
                    <Tr key={req.id}>
                      <Td fontWeight="medium">{req.title}</Td>
                      <Td fontSize="sm">{categoryLabel(req.category)}</Td>
                      <Td>
                        <Badge
                          colorScheme={
                            req.priority === "URGENT"
                              ? "red"
                              : req.priority === "HIGH"
                              ? "orange"
                              : req.priority === "NORMAL"
                              ? "blue"
                              : "gray"
                          }
                        >
                          {req.priority}
                        </Badge>
                      </Td>
                      <Td>{getStatusBadge(req.status)}</Td>
                      <Td fontSize="sm">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <IconButton
                            icon={<ViewIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(req)}
                            title="Voir dÃ©tails"
                          />
                          {req.status === "PENDING" && (
                            <>
                              <IconButton
                                icon={<EditIcon />}
                                size="sm"
                                variant="ghost"
                                colorScheme="blue"
                                onClick={() => handleEdit(req)}
                                title="Ã‰diter"
                              />
                              <IconButton
                                icon={<DeleteIcon />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleDelete(req.id)}
                                title="Supprimer"
                              />
                            </>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>
    </VStack>
  );

  const renderRecapSection = () => (
    <VStack align="stretch" spacing={6}>
      <Card>
        <CardHeader pb={0}>
          <VStack align="flex-start" spacing={1}>
            <Heading size="md">RÃ©capitulatif global</Heading>
            <Text color="gray.600">Vue consolidÃ©e pour le bureau.</Text>
          </VStack>
        </CardHeader>
        <CardBody>
          {loading && allRequests.length === 0 ? (
            <Flex justify="center" py={10}>
              <Spinner />
            </Flex>
          ) : allRequests.length === 0 ? (
            <Box textAlign="center" py={10} color="gray.500">
              <Text>Aucune demande</Text>
            </Box>
          ) : isMobile ? (
            <SimpleGrid spacing={4} columns={1}>
              {allRequests.map((req) => (
                <Card key={req.id} variant="outline">
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <HStack justify="space-between" width="100%">
                        <Heading size="sm">{req.title}</Heading>
                        {getStatusBadge(req.status)}
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        {req.userName || "Utilisateur"}
                      </Text>
                      <HStack spacing={2} fontSize="xs" color="gray.500">
                        <Badge>{categoryLabel(req.category)}</Badge>
                        <Text>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </Text>
                      </HStack>
                      <HStack pt={2} width="100%">
                        <IconButton
                          icon={<ViewIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="blue"
                          onClick={() => handleViewDetails(req)}
                          title="Voir dÃ©tails et suivi"
                        />
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <Box overflowX="auto">
              <Table size={tableSize} variant="striped">
                <Thead>
                  <Tr>
                    <Th>Titre</Th>
                    <Th>Utilisateur</Th>
                    <Th>CatÃ©gorie</Th>
                    <Th>PrioritÃ©</Th>
                    <Th>Statut</Th>
                    <Th>Date</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {allRequests.map((req) => (
                    <Tr key={req.id}>
                      <Td fontWeight="medium">{req.title}</Td>
                      <Td fontSize="sm">{req.userName || "Utilisateur"}</Td>
                      <Td fontSize="sm">{categoryLabel(req.category)}</Td>
                      <Td>
                        <Badge
                          colorScheme={
                            req.priority === "URGENT"
                              ? "red"
                              : req.priority === "HIGH"
                              ? "orange"
                              : req.priority === "NORMAL"
                              ? "blue"
                              : "gray"
                          }
                        >
                          {req.priority}
                        </Badge>
                      </Td>
                      <Td>{getStatusBadge(req.status)}</Td>
                      <Td fontSize="sm">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </Td>
                      <Td>
                        <IconButton
                          icon={<ViewIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="blue"
                          onClick={() => handleViewDetails(req)}
                          title="Voir dÃ©tails et suivi"
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>
    </VStack>
  );

  const sections = [
    {
      id: "my-requests",
      label: "Mes demandes",
      icon: FiFileText,
      description: "CrÃ©ation & suivi",
      render: renderMyRequestsSection
    }
  ];

  if (canViewRecap()) {
    sections.push({
      id: "recap",
      label: "RÃ©capitulatif",
      icon: FiDownload,
      description: "Vue bureau",
      render: renderRecapSection
    });
  }

  const headerActions = [
    <Button
      key="new"
      leftIcon={<FiPlus />}
      colorScheme="blue"
      onClick={handleNew}
      size={isMobile ? "sm" : "md"}
    >
      Nouvelle demande
    </Button>
  ];

  return (
    <>
      <WorkspaceLayout
        title="RÃ©troDemandes"
        subtitle="Gestion de vos demandes et suivi global"
        sections={sections}
        defaultSectionId="my-requests"
        sidebarTitle="RÃ©troDemandes"
        sidebarSubtitle="Support & demandes"
        sidebarTitleIcon={FiFileText}
        versionLabel="RÃ©troDemandes v2"
        headerActions={headerActions}
      />

      <Modal isOpen={isOpen} onClose={onClose} size={isMobile ? "full" : "2xl"}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingId ? "Modifier la demande" : "Nouvelle demande"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} as="form" onSubmit={handleSubmit}>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input
                  placeholder="Titre de la demande"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="DÃ©tails de votre demande"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
              </FormControl>

              <Grid templateColumns="1fr 1fr" gap={4} width="100%">
                <FormControl>
                  <FormLabel>CatÃ©gorie</FormLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <option value="GENERAL">GÃ©nÃ©ral</option>
                    <option value="REPAIR">RÃ©paration</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="SERVICE">Service</option>
                    <option value="CUSTOM">PersonnalisÃ©</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>PrioritÃ©</FormLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                  >
                    <option value="LOW">Basse</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Ã‰levÃ©e</option>
                    <option value="URGENT">Urgent</option>
                  </Select>
                </FormControl>
              </Grid>

              <Divider />
              
              <Box width="100%" borderWidth="1px" borderRadius="md" p={4} borderColor="gray.200" bg="gray.50">
                <VStack align="stretch" spacing={3}>
                  <HStack>
                    <FiUpload />
                    <FormLabel mb={0} fontWeight="bold">PiÃ¨ces jointes</FormLabel>
                  </HStack>
                  
                  <Input
                    type="file"
                    multiple
                    accept="*"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        const newFiles = Array.from(files).map(file => ({
                          id: Math.random().toString(36).substr(2, 9),
                          fileName: file.name,
                          fileSize: file.size,
                          mimeType: file.type,
                          file: file
                        }));
                        setUploadedFiles([...uploadedFiles, ...newFiles]);
                      }
                    }}
                    placeholder="SÃ©lectionner des fichiers"
                  />

                  {uploadedFiles.length > 0 && (
                    <VStack align="stretch" spacing={2} mt={3}>
                      <Text fontSize="sm" fontWeight="bold">
                        Fichiers sÃ©lectionnÃ©s ({uploadedFiles.length}):
                      </Text>
                      {uploadedFiles.map((file) => (
                        <HStack key={file.id} justify="space-between" p={2} bg="white" borderRadius="md" borderWidth="1px">
                          <HStack spacing={2} flex="1" minWidth="0">
                            <FiFile fontSize="18px" />
                            <VStack align="start" spacing={0} flex="1" minWidth="0">
                              <Text fontSize="sm" fontWeight="500" noOfLines={1}>
                                {file.fileName}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {(file.fileSize / 1024).toFixed(2)} KB
                              </Text>
                            </VStack>
                          </HStack>
                          <IconButton
                            icon={<FiX />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => setUploadedFiles(uploadedFiles.filter(f => f.id !== file.id))}
                            aria-label="Supprimer"
                          />
                        </HStack>
                      ))}
                    </VStack>
                  )}
                </VStack>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSubmit}
                isLoading={loading}
              >
                {editingId ? "Modifier" : "CrÃ©er"}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="4xl">
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader>DÃ©tails et suivi de la demande</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            {selectedRequest && (
              <VStack spacing={6} align="start" width="100%">
                <Box>
                  <Text fontWeight="bold">Titre:</Text>
                  <Text>{selectedRequest.title}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Description:</Text>
                  <Text whiteSpace="pre-wrap" fontSize="sm">
                    {selectedRequest.description}
                  </Text>
                </Box>
                <Divider />
                <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} width="100%">
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">
                      Utilisateur:
                    </Text>
                    <Text>{selectedRequest.userName || "Utilisateur"}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {selectedRequest.userEmail}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">
                      CatÃ©gorie:
                    </Text>
                    <Text>{categoryLabel(selectedRequest.category)}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">
                      PrioritÃ©:
                    </Text>
                    <Text>{selectedRequest.priority}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">
                      Date:
                    </Text>
                    <Text>
                      {new Date(selectedRequest.createdAt).toLocaleDateString()}
                    </Text>
                  </Box>
                </SimpleGrid>
                <Divider />
                <Box width="100%">
                  <Text fontWeight="bold" fontSize="sm" mb={2}>
                    Statut:
                  </Text>
                  <HStack spacing={2} width="100%">
                    {getStatusBadge(selectedRequest.status)}
                    <Select
                      size="sm"
                      width="200px"
                      value={selectedRequest.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      isDisabled={loading}
                    >
                      <option value="PENDING">â³ En attente</option>
                      <option value="ASSIGNED">ðŸ‘¤ AssignÃ©e</option>
                      <option value="IN_PROGRESS">ðŸ”„ En cours</option>
                      <option value="COMPLETED">âœ… ComplÃ©tÃ©e</option>
                      <option value="CLOSED">ðŸ”’ FermÃ©e</option>
                      <option value="REJECTED">âŒ RejetÃ©e</option>
                    </Select>
                  </HStack>
                </Box>

                {selectedRequest.retro_request_file && selectedRequest.retro_request_file.length > 0 && (
                  <>
                    <Divider />
                    <Box width="100%">
                      <Text fontWeight="bold" fontSize="sm" mb={3}>
                        ðŸ“Ž PiÃ¨ces jointes ({selectedRequest.retro_request_file.length})
                      </Text>
                      <VStack align="stretch" spacing={2}>
                        {selectedRequest.retro_request_file.map((file) => (
                          <HStack key={file.id} justify="space-between" p={3} bg="gray.50" borderRadius="md" borderWidth="1px">
                            <HStack spacing={3} flex="1" minWidth="0">
                              <FiFile fontSize="20px" color="blue.500" />
                              <VStack align="start" spacing={0} flex="1" minWidth="0">
                                <Text fontSize="sm" fontWeight="500" noOfLines={2}>
                                  {file.fileName}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {(file.fileSize / 1024).toFixed(2)} KB â€¢ {new Date(file.uploadedAt).toLocaleDateString()}
                                </Text>
                              </VStack>
                            </HStack>
                            <HStack spacing={2}>
                              <IconButton
                                icon={<FiDownload />}
                                size="sm"
                                variant="ghost"
                                colorScheme="blue"
                                as="a"
                                href={file.filePath}
                                download
                                aria-label="TÃ©lÃ©charger"
                              />
                              <IconButton
                                icon={<FiX />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleDeleteFile(selectedRequest.id, file.id)}
                                aria-label="Supprimer"
                                isLoading={loading}
                              />
                            </HStack>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  </>
                )}

                <Divider />

                <Box width="100%">
                  <Heading size="sm" mb={4}>ðŸ“‹ Suivi de la demande</Heading>
                  <VStack align="stretch" spacing={3}>
                    <HStack align="flex-start" spacing={4}>
                      <Box width="40px" height="40px" borderRadius="full" bg="blue.100" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                        <Text fontSize="sm" fontWeight="bold">âœ…</Text>
                      </Box>
                      <VStack align="start" spacing={1} flex="1">
                        <Text fontWeight="bold" fontSize="sm">Demande crÃ©Ã©e</Text>
                        <Text fontSize="xs" color="gray.500">
                          Par {selectedRequest.userName} â€¢ {new Date(selectedRequest.createdAt).toLocaleString()}
                        </Text>
                        <Text fontSize="xs">CatÃ©gorie: {categoryLabel(selectedRequest.category)}</Text>
                      </VStack>
                    </HStack>

                    <HStack align="flex-start" spacing={4}>
                      <Box 
                        width="40px" 
                        height="40px" 
                        borderRadius="full" 
                        bg={
                          selectedRequest.status === 'COMPLETED' || selectedRequest.status === 'CLOSED' ? 'green.100' :
                          selectedRequest.status === 'REJECTED' ? 'red.100' :
                          selectedRequest.status === 'IN_PROGRESS' ? 'orange.100' :
                          'blue.100'
                        }
                        display="flex" 
                        alignItems="center" 
                        justifyContent="center"
                        flexShrink={0}
                      >
                        <Text fontSize="sm">
                          {selectedRequest.status === 'COMPLETED' || selectedRequest.status === 'CLOSED' ? 'ðŸŽ‰' :
                           selectedRequest.status === 'REJECTED' ? 'âŒ' :
                           selectedRequest.status === 'IN_PROGRESS' ? 'â³' :
                           selectedRequest.status === 'ASSIGNED' ? 'ðŸ‘¤' :
                           'â°'}
                        </Text>
                      </Box>
                      <VStack align="start" spacing={2} flex="1">
                        <HStack width="100%">
                          <Text fontWeight="bold" fontSize="sm">
                            Statut actuel: {selectedRequest.status}
                          </Text>
                          {!selectedRequest.closedAt && (
                            <Select
                              size="sm"
                              width="150px"
                              value={selectedRequest.status}
                              onChange={(e) => handleStatusChange(e.target.value)}
                              isDisabled={loading}
                            >
                              <option value="PENDING">â³ En attente</option>
                              <option value="ASSIGNED">ðŸ‘¤ AssignÃ©e</option>
                              <option value="IN_PROGRESS">ðŸ”„ En cours</option>
                              <option value="COMPLETED">âœ… ComplÃ©tÃ©e</option>
                              <option value="CLOSED">ðŸ”’ FermÃ©e</option>
                              <option value="REJECTED">âŒ RejetÃ©e</option>
                            </Select>
                          )}
                        </HStack>
                        <Text fontSize="xs" color="gray.500">
                          Mise Ã  jour: {new Date(selectedRequest.updatedAt).toLocaleString()}
                        </Text>
                      </VStack>
                    </HStack>

                    {(selectedRequest.estimatedCost || selectedRequest.actualCost) && (
                      <HStack align="flex-start" spacing={4}>
                        <Box width="40px" height="40px" borderRadius="full" bg="yellow.100" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                          <Text fontSize="sm">ðŸ’°</Text>
                        </Box>
                        <VStack align="start" spacing={1} flex="1">
                          <Text fontWeight="bold" fontSize="sm">CoÃ»ts</Text>
                          {selectedRequest.estimatedCost && (
                            <Text fontSize="xs">EstimÃ©: {selectedRequest.estimatedCost}â‚¬</Text>
                          )}
                          {selectedRequest.actualCost && (
                            <Text fontSize="xs">RÃ©el: {selectedRequest.actualCost}â‚¬</Text>
                          )}
                        </VStack>
                      </HStack>

export default RetroDemandes;
