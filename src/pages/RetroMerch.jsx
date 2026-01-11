import React, { useState, useEffect } from "react";
import {
  FiPackage,
  FiShoppingCart,
  FiGrid,
  FiBarChart,
  FiSettings,
  FiPlus,
  FiEdit,
  FiTrash,
  FiX
} from "react-icons/fi";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Icon,
  Flex,
  Image,
  Tag,
  Input,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  SimpleGrid,
  Select,
  Textarea,
  useToast,
  Spinner
} from "@chakra-ui/react";
import retromerchService from "../lib/retromerchService";

const RetroMerch = () => {
  const toast = useToast();
  
  // États de navigation
  const [activeMainSection, setActiveMainSection] = useState("catalogue");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // État des produits et catégories depuis l'API
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // État du formulaire produit
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: 0,
    image: "",
    stock: 0
  });

  // Charger les données au montage
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const result = await retromerchService.getProducts();
      setProducts(Array.isArray(result) ? result : []);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        status: "error",
        duration: 3
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await retromerchService.getCategories();
      setCategories(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("Erreur lors du chargement des catégories");
    }
  };

  // Sections principales
  const sections = [
    { id: "catalogue", label: "Catalogue", icon: FiPackage, description: "Produits disponibles" },
    { id: "commandes", label: "Commandes", icon: FiShoppingCart, description: "Gestion des commandes" },
    { id: "layout", label: "Mise-en-page", icon: FiGrid, description: "Organisation de la boutique" },
    { id: "stats", label: "Statistiques", icon: FiBarChart, description: "Analyse des ventes" },
    { id: "settings", label: "Paramètres", icon: FiSettings, description: "Configuration" }
  ];

  // Fonctions de gestion des produits
  const openModal = (product = null) => {
    if (product) {
      setFormData(product);
      setEditingProduct(product.id);
    } else {
      setFormData({ name: "", category: "", price: 0, image: "", stock: 0 });
      setEditingProduct(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: "", category: "", price: 0, image: "", stock: 0 });
    setEditingProduct(null);
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      toast({
        title: "Erreur",
        description: "Le nom et le prix sont requis",
        status: "warning"
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingProduct) {
        // Mettre à jour
        await retromerchService.updateProduct(editingProduct, formData);
        toast({
          title: "Succès",
          description: "Produit mis à jour",
          status: "success"
        });
      } else {
        // Créer
        await retromerchService.createProduct(formData);
        toast({
          title: "Succès",
          description: "Produit créé",
          status: "success"
        });
      }
      loadProducts();
      closeModal();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce produit?")) {
      return;
    }

    try {
      await retromerchService.deleteProduct(id);
      toast({
        title: "Succès",
        description: "Produit supprimé",
        status: "success"
      });
      loadProducts();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error"
      });
    }
  };

  const handleAddCategory = async (categoryName) => {
    if (!categoryName || categories.find((c) => c.name === categoryName)) {
      return;
    }

    try {
      await retromerchService.createCategory({ name: categoryName });
      loadCategories();
      toast({
        title: "Succès",
        description: "Catégorie ajoutée",
        status: "success"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error"
      });
    }
  };

  // Composants de contenu pour chaque section
  const CatalogueContent = () => (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Box>
          <Heading size="sm">Gestion du catalogue</Heading>
          <Text fontSize="sm" color="gray.600">{products.length} produits</Text>
        </Box>
        <Button
          leftIcon={<Icon as={FiPlus} />}
          colorScheme="red"
          size="sm"
          isLoading={isSaving}
          onClick={() => openModal()}
        >
          Ajouter un produit
        </Button>
      </HStack>

      {isLoading ? (
        <VStack justify="center" py={12}>
          <Spinner size="lg" color="red.500" />
          <Text color="gray.600">Chargement des produits...</Text>
        </VStack>
      ) : products.length === 0 ? (
        <Box p={6} bg="gray.100" borderRadius="lg" textAlign="center">
          <Text color="gray.600">Aucun produit pour le moment</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {products.map((product) => (
            <Box
              key={product.id}
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              bg="white"
              _hover={{ shadow: "md" }}
              transition="shadow 0.2s"
            >
              <Image
                src={product.image}
                alt={product.name}
                w="full"
                h="200px"
                objectFit="cover"
                fallbackSrc="https://via.placeholder.com/200?text=Produit"
              />
              <Box p={4}>
                <HStack justify="space-between" mb={2}>
                  <Heading size="sm">{product.name}</Heading>
                  <Tag size="sm" colorScheme="red">
                    {product.category?.name || "Sans catégorie"}
                  </Tag>
                </HStack>
                <Text fontSize="lg" fontWeight="bold" color="red.500" mb={2}>
                  {product.price}€
                </Text>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Stock: {product.stock}
                </Text>
                <HStack justify="flex-end" spacing={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Icon as={FiEdit} />}
                    onClick={() => openModal(product)}
                  >
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    leftIcon={<Icon as={FiTrash} />}
                    onClick={() => deleteProduct(product.id)}
                  >
                    Supprimer
                  </Button>
                </HStack>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );

  const CommandesContent = () => (
    <Box>
      <Heading size="sm" mb={4}>Commandes</Heading>
      <Box p={6} bg="gray.100" borderRadius="lg" textAlign="center">
        <Text color="gray.600">Module en développement - Bientôt disponible</Text>
      </Box>
    </Box>
  );

  const LayoutContent = () => (
    <Box>
      <Heading size="sm" mb={4}>Mise-en-page de la boutique</Heading>
      <Box p={6} bg="gray.100" borderRadius="lg" textAlign="center">
        <Text color="gray.600">Constructeur de layout - Bientôt disponible</Text>
      </Box>
    </Box>
  );

  const StatsContent = () => (
    <Box>
      <Heading size="sm" mb={4}>Statistiques de ventes</Heading>
      <Box p={6} bg="gray.100" borderRadius="lg" textAlign="center">
        <Text color="gray.600">Dashboard analytique - Bientôt disponible</Text>
      </Box>
    </Box>
  );

  const SettingsContent = () => {
    const [newCategoryName, setNewCategoryName] = useState("");

    return (
      <Box>
        <Heading size="sm" mb={4}>Paramètres</Heading>
        <VStack align="stretch" spacing={4}>
          <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
            <Heading size="sm" mb={3}>Catégories de produits</Heading>
            <VStack align="stretch" spacing={2} mb={4}>
              {categories.map((cat) => (
                <HStack key={cat.id} justify="space-between" p={2} bg="gray.50" borderRadius="md">
                  <Text>{cat.name}</Text>
                  <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => {
                      // À implémenter: DELETE category
                      toast({
                        title: "Info",
                        description: "Suppression de catégorie à implémenter",
                        status: "info"
                      });
                    }}
                  >
                    <Icon as={FiX} />
                  </Button>
                </HStack>
              ))}
            </VStack>
            <HStack spacing={2}>
              <Input
                placeholder="Nouvelle catégorie"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddCategory(newCategoryName);
                    setNewCategoryName("");
                  }
                }}
              />
              <Button
                colorScheme="red"
                onClick={() => {
                  handleAddCategory(newCategoryName);
                  setNewCategoryName("");
                }}
              >
                Ajouter
              </Button>
            </HStack>
          </Box>
        </VStack>
      </Box>
    );
  };

  // Rendu du contenu selon la section active
  const renderMainContent = () => {
    switch (activeMainSection) {
      case "catalogue":
        return <CatalogueContent />;
      case "commandes":
        return <CommandesContent />;
      case "layout":
        return <LayoutContent />;
      case "stats":
        return <StatsContent />;
      case "settings":
        return <SettingsContent />;
      default:
        return <CatalogueContent />;
    }
  };

  return (
    <HStack align="stretch" spacing={0} h="100vh" w="100%">
      {/* Sidebar */}
      <VStack
        align="stretch"
        spacing={0}
        w="280px"
        bg="gray.50"
        borderRight="1px"
        borderColor="gray.200"
        overflowY="auto"
      >
        {/* Header du sidebar */}
        <Box p={6} borderBottom="1px" borderColor="gray.200">
          <HStack spacing={3} mb={3}>
            <Icon as={FiPackage} color="red.500" boxSize={6} />
            <Box>
              <Heading size="md" color="gray.800">RetroMerch</Heading>
              <Text fontSize="sm" color="gray.500">Boutique</Text>
            </Box>
          </HStack>
          <Text fontSize="xs" color="gray.500">Gestion RBE</Text>
        </Box>

        {/* Navigation principale */}
        <VStack align="stretch" spacing={0} px={3} py={4} flex={1}>
          {sections.map((section) => {
            const isActive = section.id === activeMainSection;
            const SectionIcon = section.icon;
            return (
              <Button
                key={section.id}
                leftIcon={<Icon as={SectionIcon} />}
                variant="ghost"
                justifyContent="flex-start"
                w="full"
                bg={isActive ? "red.50" : "transparent"}
                borderLeft="3px"
                borderColor={isActive ? "red.500" : "transparent"}
                borderRadius={0}
                px={4}
                py={6}
                fontSize="sm"
                fontWeight={isActive ? "600" : "500"}
                color={isActive ? "red.500" : "inherit"}
                _hover={{ bg: "gray.100", borderLeftColor: "red.500" }}
                onClick={() => setActiveMainSection(section.id)}
              >
                <Flex direction="column" align="flex-start" w="full">
                  <Text>{section.label}</Text>
                  {section.description && (
                    <Text fontSize="xs" color="gray.500">{section.description}</Text>
                  )}
                </Flex>
              </Button>
            );
          })}
        </VStack>

        {/* Footer du sidebar */}
        <Box
          p={4}
          borderTop="1px"
          borderColor="gray.200"
          fontSize="xs"
          color="gray.500"
          textAlign="center"
          w="full"
        >
          MyRBE RetroMerch
        </Box>
      </VStack>

      {/* Contenu principal */}
      <VStack align="stretch" spacing={0} flex={1} overflowY="auto">
        {/* Header */}
        <Box p={6} borderBottom="1px" borderColor="gray.200" bg="white">
          <HStack justify="space-between">
            <Box>
              <Heading size="lg">
                {activeMainSection === "catalogue" && "Catalogue"}
                {activeMainSection === "commandes" && "Commandes"}
                {activeMainSection === "layout" && "Mise-en-page"}
                {activeMainSection === "stats" && "Statistiques"}
                {activeMainSection === "settings" && "Paramètres"}
              </Heading>
              <Text fontSize="sm" color="gray.500">
                {activeMainSection === "catalogue" && "Gérez votre catalogue de produits"}
                {activeMainSection === "commandes" && "Suivi des commandes clients"}
                {activeMainSection === "layout" && "Organisez votre boutique"}
                {activeMainSection === "stats" && "Analyses des ventes"}
                {activeMainSection === "settings" && "Configuration de RetroMerch"}
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* Contenu */}
        <Box flex={1} overflowY="auto" p={6} w="full">
          {renderMainContent()}
        </Box>
      </VStack>

      {/* Modal Produit */}
      <Modal isOpen={isModalOpen} onClose={closeModal} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingProduct ? "Modifier le produit" : "Ajouter un produit"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Nom du produit</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: T-shirt RetroRB"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Catégorie</FormLabel>
                <Select
                  value={formData.categoryId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value || null })
                  }
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Prix (€)</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value) || 0
                    })
                  }
                  placeholder="0"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Stock</FormLabel>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: parseInt(e.target.value) || 0
                    })
                  }
                  placeholder="0"
                />
              </FormControl>
              <FormControl>
                <FormLabel>URL de l'image</FormLabel>
                <Input
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  placeholder="https://..."
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description du produit"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeModal}>
              Annuler
            </Button>
            <Button
              colorScheme="red"
              onClick={handleSaveProduct}
              isLoading={isSaving}
            >
              {editingProduct ? "Mettre à jour" : "Créer"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </HStack>
  );
};

export default RetroMerch;
