import React, { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Icon,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  Select,
  Switch,
  useToast,
  SimpleGrid,
  IconButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Divider,
  Badge,
  Image,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from "@chakra-ui/react";
import {
  FiEye,
  FiSave,
  FiPlus,
  FiTrash,
  FiMove,
  FiType,
  FiImage,
  FiLayout,
  FiGrid,
  FiSquare,
  FiAlignCenter,
  FiShoppingBag,
  FiStar,
  FiChevronUp,
  FiChevronDown
} from "react-icons/fi";
import retromerchService from "../../lib/retromerchService";

/**
 * Bibliothèque de blocs disponibles
 */
const BLOCK_TYPES = {
  HERO: {
    id: "HERO",
    name: "Hero / Bannière",
    icon: FiLayout,
    description: "Grande section d'en-tête avec titre et image",
    defaultData: {
      title: "Titre principal",
      subtitle: "Sous-titre descriptif",
      backgroundImage: "",
      backgroundColor: "#f7fafc",
      textColor: "#000000",
      height: "500px",
      textAlign: "center"
    }
  },
  TEXT: {
    id: "TEXT",
    name: "Bloc de texte",
    icon: FiType,
    description: "Paragraphe de texte riche",
    defaultData: {
      title: "Titre de section",
      content: "Votre contenu ici...",
      backgroundColor: "#ffffff",
      textColor: "#2d3748",
      fontSize: "16px",
      textAlign: "left",
      padding: "40px"
    }
  },
  IMAGE: {
    id: "IMAGE",
    name: "Image",
    icon: FiImage,
    description: "Image unique avec légende",
    defaultData: {
      imageUrl: "https://via.placeholder.com/800x400",
      caption: "",
      alt: "Image",
      maxWidth: "100%",
      alignment: "center"
    }
  },
  TWO_COLUMNS: {
    id: "TWO_COLUMNS",
    name: "2 Colonnes",
    icon: FiGrid,
    description: "Texte et image côte à côte",
    defaultData: {
      leftContent: "Texte de gauche",
      rightContent: "Texte de droite",
      leftImage: "",
      rightImage: "",
      backgroundColor: "#ffffff",
      padding: "60px"
    }
  },
  CTA: {
    id: "CTA",
    name: "Call-to-Action",
    icon: FiStar,
    description: "Bouton d'action proéminent",
    defaultData: {
      title: "Prêt à commander ?",
      description: "Découvrez nos produits exclusifs",
      buttonText: "Voir la boutique",
      buttonLink: "#products",
      backgroundColor: "#e53e3e",
      textColor: "#ffffff",
      buttonColor: "#2d3748"
    }
  },
  PRODUCTS_GRID: {
    id: "PRODUCTS_GRID",
    name: "Grille de produits",
    icon: FiShoppingBag,
    description: "Affiche les produits en grille",
    defaultData: {
      title: "Nos produits",
      columns: 3,
      showAllProducts: true,
      selectedProductIds: [],
      backgroundColor: "#f7fafc"
    }
  },
  SPACER: {
    id: "SPACER",
    name: "Espacement",
    icon: FiSquare,
    description: "Espace vide pour aérer",
    defaultData: {
      height: "60px",
      backgroundColor: "transparent"
    }
  }
};

/**
 * Composant PageBuilder - Éditeur visuel complet type Wix
 */
const PageBuilder = () => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Structure de la page = liste ordonnée de blocs
  const [pageBlocks, setPageBlocks] = useState([]);
  
  // Bloc en cours d'édition
  const [editingBlockIndex, setEditingBlockIndex] = useState(null);
  
  // Thème global
  const [globalTheme, setGlobalTheme] = useState({
    primaryColor: "#e53e3e",
    secondaryColor: "#2d3748",
    fontFamily: "Inter, sans-serif",
    containerMaxWidth: "1200px"
  });

  useEffect(() => {
    loadPageStructure();
  }, []);

  const loadPageStructure = async () => {
    setIsLoading(true);
    try {
      const config = await retromerchService.getSiteConfig();
      
      if (config.page_structure) {
        setPageBlocks(config.page_structure);
      }
      
      if (config.theme) {
        setGlobalTheme(config.theme);
      }
      
      toast({
        title: "Page chargée",
        status: "success",
        duration: 2000
      });
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePageStructure = async () => {
    setIsSaving(true);
    try {
      await retromerchService.updateSiteConfig("page_structure", pageBlocks);
      await retromerchService.updateSiteConfig("theme", globalTheme);
      
      toast({
        title: "✅ Page sauvegardée",
        description: "Les modifications sont visibles sur le site externe",
        status: "success",
        duration: 3000
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message,
        status: "error",
        duration: 4000
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addBlock = (blockType) => {
    const newBlock = {
      id: `block_${Date.now()}`,
      type: blockType,
      data: { ...BLOCK_TYPES[blockType].defaultData }
    };
    
    setPageBlocks([...pageBlocks, newBlock]);
    setEditingBlockIndex(pageBlocks.length);
    
    toast({
      title: `Bloc "${BLOCK_TYPES[blockType].name}" ajouté`,
      status: "success",
      duration: 2000
    });
  };

  const removeBlock = (index) => {
    if (confirm("Supprimer ce bloc ?")) {
      setPageBlocks(pageBlocks.filter((_, i) => i !== index));
      setEditingBlockIndex(null);
      toast({
        title: "Bloc supprimé",
        status: "info",
        duration: 2000
      });
    }
  };

  const moveBlock = (index, direction) => {
    const newBlocks = [...pageBlocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setPageBlocks(newBlocks);
  };

  const updateBlockData = (index, newData) => {
    const newBlocks = [...pageBlocks];
    newBlocks[index].data = { ...newBlocks[index].data, ...newData };
    setPageBlocks(newBlocks);
  };

  const openPreview = () => {
    window.open("http://localhost:3000/retromerch", "_blank");
  };

  if (isLoading) {
    return (
      <VStack justify="center" py={12}>
        <Spinner size="lg" color="red.500" />
        <Text color="gray.600">Chargement du builder...</Text>
      </VStack>
    );
  }

  return (
    <HStack align="stretch" spacing={0} h="calc(100vh - 200px)" w="100%">
      {/* PALETTE DE BLOCS - Gauche */}
      <VStack
        w="280px"
        bg="gray.50"
        borderRight="1px"
        borderColor="gray.200"
        align="stretch"
        spacing={0}
        overflowY="auto"
      >
        <Box p={4} borderBottom="1px" borderColor="gray.200" bg="white">
          <Heading size="sm" mb={1}>Composants</Heading>
          <Text fontSize="xs" color="gray.600">Glissez pour ajouter</Text>
        </Box>

        <VStack align="stretch" spacing={2} p={3}>
          {Object.values(BLOCK_TYPES).map((blockType) => {
            const BlockIcon = blockType.icon;
            return (
              <Box
                key={blockType.id}
                p={3}
                bg="white"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.200"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ borderColor: "red.500", shadow: "sm" }}
                onClick={() => addBlock(blockType.id)}
              >
                <HStack spacing={3}>
                  <Icon as={BlockIcon} boxSize={5} color="red.500" />
                  <Box flex={1}>
                    <Text fontSize="sm" fontWeight="600">{blockType.name}</Text>
                    <Text fontSize="xs" color="gray.600" noOfLines={1}>
                      {blockType.description}
                    </Text>
                  </Box>
                </HStack>
              </Box>
            );
          })}
        </VStack>
      </VStack>

      {/* CANVAS - Centre */}
      <VStack flex={1} align="stretch" spacing={0} bg="gray.100" overflowY="auto">
        {/* Header */}
        <HStack justify="space-between" p={4} bg="white" borderBottom="1px" borderColor="gray.200">
          <Box>
            <Heading size="md">Page Builder</Heading>
            <Text fontSize="sm" color="gray.600">{pageBlocks.length} blocs</Text>
          </Box>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={FiEye} />}
              variant="outline"
              onClick={openPreview}
              size="sm"
            >
              Prévisualiser
            </Button>
            <Button
              leftIcon={<Icon as={FiSave} />}
              colorScheme="red"
              isLoading={isSaving}
              onClick={savePageStructure}
              size="sm"
            >
              Sauvegarder
            </Button>
          </HStack>
        </HStack>

        {/* Canvas avec blocs */}
        <VStack align="stretch" spacing={0} p={6} flex={1}>
          {pageBlocks.length === 0 ? (
            <Box
              p={12}
              textAlign="center"
              bg="white"
              borderRadius="lg"
              borderWidth="2px"
              borderStyle="dashed"
              borderColor="gray.300"
            >
              <Icon as={FiLayout} boxSize={12} color="gray.400" mb={4} />
              <Heading size="md" color="gray.600" mb={2}>
                Page vide
              </Heading>
              <Text color="gray.500" mb={4}>
                Ajoutez des blocs depuis la palette de gauche
              </Text>
              <Button
                leftIcon={<Icon as={FiPlus} />}
                colorScheme="red"
                variant="outline"
                onClick={() => addBlock("HERO")}
              >
                Commencer avec un Hero
              </Button>
            </Box>
          ) : (
            pageBlocks.map((block, index) => (
              <Box
                key={block.id}
                mb={3}
                borderRadius="md"
                borderWidth="2px"
                borderColor={editingBlockIndex === index ? "red.500" : "gray.200"}
                bg="white"
                overflow="hidden"
                transition="all 0.2s"
                _hover={{ borderColor: "red.300" }}
              >
                {/* Barre d'outils du bloc */}
                <HStack
                  justify="space-between"
                  p={2}
                  bg={editingBlockIndex === index ? "red.50" : "gray.50"}
                  borderBottom="1px"
                  borderColor="gray.200"
                >
                  <HStack spacing={2}>
                    <Icon as={BLOCK_TYPES[block.type].icon} color="red.500" />
                    <Text fontSize="sm" fontWeight="600">
                      {BLOCK_TYPES[block.type].name}
                    </Text>
                    <Badge size="sm" colorScheme="gray">{index + 1}</Badge>
                  </HStack>
                  
                  <HStack spacing={1}>
                    <IconButton
                      icon={<FiChevronUp />}
                      size="xs"
                      variant="ghost"
                      onClick={() => moveBlock(index, "up")}
                      isDisabled={index === 0}
                    />
                    <IconButton
                      icon={<FiChevronDown />}
                      size="xs"
                      variant="ghost"
                      onClick={() => moveBlock(index, "down")}
                      isDisabled={index === pageBlocks.length - 1}
                    />
                    <Button
                      size="xs"
                      variant={editingBlockIndex === index ? "solid" : "ghost"}
                      colorScheme="red"
                      onClick={() => setEditingBlockIndex(editingBlockIndex === index ? null : index)}
                    >
                      {editingBlockIndex === index ? "Fermer" : "Éditer"}
                    </Button>
                    <IconButton
                      icon={<FiTrash />}
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => removeBlock(index)}
                    />
                  </HStack>
                </HStack>

                {/* Preview du bloc */}
                <Box p={4} minH="100px" bg="white">
                  <BlockPreview block={block} theme={globalTheme} />
                </Box>
              </Box>
            ))
          )}
        </VStack>
      </VStack>

      {/* ÉDITEUR - Droite */}
      {editingBlockIndex !== null && pageBlocks[editingBlockIndex] && (
        <VStack
          w="320px"
          bg="white"
          borderLeft="1px"
          borderColor="gray.200"
          align="stretch"
          spacing={0}
          overflowY="auto"
        >
          <Box p={4} borderBottom="1px" borderColor="gray.200">
            <Heading size="sm">Propriétés du bloc</Heading>
            <Text fontSize="xs" color="gray.600">
              {BLOCK_TYPES[pageBlocks[editingBlockIndex].type].name}
            </Text>
          </Box>

          <Box p={4}>
            <BlockEditor
              block={pageBlocks[editingBlockIndex]}
              onChange={(newData) => updateBlockData(editingBlockIndex, newData)}
            />
          </Box>
        </VStack>
      )}
    </HStack>
  );
};

/**
 * Preview d'un bloc dans le canvas
 */
const BlockPreview = ({ block, theme }) => {
  const { type, data } = block;

  switch (type) {
    case "HERO":
      return (
        <Box
          bg={data.backgroundColor}
          color={data.textColor}
          backgroundImage={data.backgroundImage ? `url(${data.backgroundImage})` : 'none'}
          backgroundSize="cover"
          backgroundPosition="center"
          p={8}
          textAlign={data.textAlign}
          minH={data.height}
          display="flex"
          flexDirection="column"
          justifyContent="center"
        >
          <Heading size="xl" mb={2}>{data.title}</Heading>
          <Text fontSize="lg">{data.subtitle}</Text>
        </Box>
      );

    case "TEXT":
      return (
        <Box bg={data.backgroundColor} color={data.textColor} p={data.padding} textAlign={data.textAlign}>
          <Heading size="md" mb={3}>{data.title}</Heading>
          <Text fontSize={data.fontSize}>{data.content}</Text>
        </Box>
      );

    case "IMAGE":
      return (
        <VStack spacing={2} align={data.alignment}>
          <Image src={data.imageUrl} alt={data.alt} maxW={data.maxWidth} borderRadius="md" />
          {data.caption && <Text fontSize="sm" color="gray.600">{data.caption}</Text>}
        </VStack>
      );

    case "TWO_COLUMNS":
      return (
        <SimpleGrid columns={2} spacing={6} bg={data.backgroundColor} p={data.padding}>
          <Box>
            {data.leftImage && <Image src={data.leftImage} mb={3} borderRadius="md" />}
            <Text>{data.leftContent}</Text>
          </Box>
          <Box>
            {data.rightImage && <Image src={data.rightImage} mb={3} borderRadius="md" />}
            <Text>{data.rightContent}</Text>
          </Box>
        </SimpleGrid>
      );

    case "CTA":
      return (
        <Box bg={data.backgroundColor} color={data.textColor} p={8} textAlign="center">
          <Heading size="lg" mb={2}>{data.title}</Heading>
          <Text mb={4}>{data.description}</Text>
          <Button bg={data.buttonColor} color="white" size="lg">
            {data.buttonText}
          </Button>
        </Box>
      );

    case "PRODUCTS_GRID":
      return (
        <Box bg={data.backgroundColor} p={6}>
          <Heading size="md" mb={4} textAlign="center">{data.title}</Heading>
          <SimpleGrid columns={data.columns} spacing={4}>
            {[1, 2, 3].map((i) => (
              <Box key={i} bg="white" p={4} borderRadius="md" borderWidth="1px">
                <Box bg="gray.200" h="150px" mb={2} borderRadius="md" />
                <Text fontWeight="600">Produit {i}</Text>
                <Text fontSize="sm" color="gray.600">19.99€</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      );

    case "SPACER":
      return (
        <Box bg={data.backgroundColor} h={data.height} position="relative">
          <Text
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            fontSize="xs"
            color="gray.400"
          >
            Espacement {data.height}
          </Text>
        </Box>
      );

    default:
      return <Text color="gray.500">Type de bloc inconnu</Text>;
  }
};

/**
 * Éditeur de propriétés pour un bloc
 */
const BlockEditor = ({ block, onChange }) => {
  const { type, data } = block;

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  // Éditeur selon le type de bloc
  switch (type) {
    case "HERO":
      return (
        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">Titre</FormLabel>
            <Input
              value={data.title}
              onChange={(e) => handleChange("title", e.target.value)}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Sous-titre</FormLabel>
            <Input
              value={data.subtitle}
              onChange={(e) => handleChange("subtitle", e.target.value)}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Image de fond (URL)</FormLabel>
            <Input
              value={data.backgroundImage}
              onChange={(e) => handleChange("backgroundImage", e.target.value)}
              placeholder="https://..."
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Couleur de fond</FormLabel>
            <HStack>
              <Input
                type="color"
                value={data.backgroundColor}
                onChange={(e) => handleChange("backgroundColor", e.target.value)}
                w="60px"
                size="sm"
              />
              <Input
                value={data.backgroundColor}
                onChange={(e) => handleChange("backgroundColor", e.target.value)}
                size="sm"
              />
            </HStack>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Couleur du texte</FormLabel>
            <HStack>
              <Input
                type="color"
                value={data.textColor}
                onChange={(e) => handleChange("textColor", e.target.value)}
                w="60px"
                size="sm"
              />
              <Input
                value={data.textColor}
                onChange={(e) => handleChange("textColor", e.target.value)}
                size="sm"
              />
            </HStack>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Hauteur</FormLabel>
            <Input
              value={data.height}
              onChange={(e) => handleChange("height", e.target.value)}
              placeholder="500px"
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Alignement du texte</FormLabel>
            <Select
              value={data.textAlign}
              onChange={(e) => handleChange("textAlign", e.target.value)}
              size="sm"
            >
              <option value="left">Gauche</option>
              <option value="center">Centre</option>
              <option value="right">Droite</option>
            </Select>
          </FormControl>
        </VStack>
      );

    case "TEXT":
      return (
        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">Titre</FormLabel>
            <Input
              value={data.title}
              onChange={(e) => handleChange("title", e.target.value)}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Contenu</FormLabel>
            <Textarea
              value={data.content}
              onChange={(e) => handleChange("content", e.target.value)}
              rows={6}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Couleur de fond</FormLabel>
            <HStack>
              <Input
                type="color"
                value={data.backgroundColor}
                onChange={(e) => handleChange("backgroundColor", e.target.value)}
                w="60px"
                size="sm"
              />
              <Input
                value={data.backgroundColor}
                onChange={(e) => handleChange("backgroundColor", e.target.value)}
                size="sm"
              />
            </HStack>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Taille du texte</FormLabel>
            <Input
              value={data.fontSize}
              onChange={(e) => handleChange("fontSize", e.target.value)}
              placeholder="16px"
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Alignement</FormLabel>
            <Select
              value={data.textAlign}
              onChange={(e) => handleChange("textAlign", e.target.value)}
              size="sm"
            >
              <option value="left">Gauche</option>
              <option value="center">Centre</option>
              <option value="right">Droite</option>
            </Select>
          </FormControl>
        </VStack>
      );

    case "IMAGE":
      return (
        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">URL de l'image</FormLabel>
            <Input
              value={data.imageUrl}
              onChange={(e) => handleChange("imageUrl", e.target.value)}
              placeholder="https://..."
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Légende</FormLabel>
            <Input
              value={data.caption}
              onChange={(e) => handleChange("caption", e.target.value)}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Largeur max</FormLabel>
            <Input
              value={data.maxWidth}
              onChange={(e) => handleChange("maxWidth", e.target.value)}
              placeholder="100%"
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Alignement</FormLabel>
            <Select
              value={data.alignment}
              onChange={(e) => handleChange("alignment", e.target.value)}
              size="sm"
            >
              <option value="flex-start">Gauche</option>
              <option value="center">Centre</option>
              <option value="flex-end">Droite</option>
            </Select>
          </FormControl>
        </VStack>
      );

    case "CTA":
      return (
        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">Titre</FormLabel>
            <Input
              value={data.title}
              onChange={(e) => handleChange("title", e.target.value)}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Description</FormLabel>
            <Textarea
              value={data.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Texte du bouton</FormLabel>
            <Input
              value={data.buttonText}
              onChange={(e) => handleChange("buttonText", e.target.value)}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Lien du bouton</FormLabel>
            <Input
              value={data.buttonLink}
              onChange={(e) => handleChange("buttonLink", e.target.value)}
              placeholder="#products"
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Couleur de fond</FormLabel>
            <HStack>
              <Input
                type="color"
                value={data.backgroundColor}
                onChange={(e) => handleChange("backgroundColor", e.target.value)}
                w="60px"
                size="sm"
              />
              <Input value={data.backgroundColor} size="sm" isReadOnly />
            </HStack>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Couleur du bouton</FormLabel>
            <HStack>
              <Input
                type="color"
                value={data.buttonColor}
                onChange={(e) => handleChange("buttonColor", e.target.value)}
                w="60px"
                size="sm"
              />
              <Input value={data.buttonColor} size="sm" isReadOnly />
            </HStack>
          </FormControl>
        </VStack>
      );

    case "SPACER":
      return (
        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">Hauteur</FormLabel>
            <Input
              value={data.height}
              onChange={(e) => handleChange("height", e.target.value)}
              placeholder="60px"
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Couleur de fond</FormLabel>
            <HStack>
              <Input
                type="color"
                value={data.backgroundColor}
                onChange={(e) => handleChange("backgroundColor", e.target.value)}
                w="60px"
                size="sm"
              />
              <Input value={data.backgroundColor} size="sm" isReadOnly />
            </HStack>
          </FormControl>
        </VStack>
      );

    case "PRODUCTS_GRID":
      return (
        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">Titre de la section</FormLabel>
            <Input
              value={data.title}
              onChange={(e) => handleChange("title", e.target.value)}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Nombre de colonnes</FormLabel>
            <Select
              value={data.columns}
              onChange={(e) => handleChange("columns", parseInt(e.target.value))}
              size="sm"
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </Select>
          </FormControl>

          <FormControl display="flex" alignItems="center">
            <FormLabel fontSize="sm" mb="0">Afficher tous les produits</FormLabel>
            <Switch
              isChecked={data.showAllProducts}
              onChange={(e) => handleChange("showAllProducts", e.target.checked)}
              colorScheme="red"
            />
          </FormControl>
        </VStack>
      );

    case "TWO_COLUMNS":
      return (
        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">Contenu gauche</FormLabel>
            <Textarea
              value={data.leftContent}
              onChange={(e) => handleChange("leftContent", e.target.value)}
              rows={4}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Image gauche (URL)</FormLabel>
            <Input
              value={data.leftImage}
              onChange={(e) => handleChange("leftImage", e.target.value)}
              placeholder="https://..."
              size="sm"
            />
          </FormControl>

          <Divider />

          <FormControl>
            <FormLabel fontSize="sm">Contenu droite</FormLabel>
            <Textarea
              value={data.rightContent}
              onChange={(e) => handleChange("rightContent", e.target.value)}
              rows={4}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Image droite (URL)</FormLabel>
            <Input
              value={data.rightImage}
              onChange={(e) => handleChange("rightImage", e.target.value)}
              placeholder="https://..."
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Couleur de fond</FormLabel>
            <HStack>
              <Input
                type="color"
                value={data.backgroundColor}
                onChange={(e) => handleChange("backgroundColor", e.target.value)}
                w="60px"
                size="sm"
              />
              <Input value={data.backgroundColor} size="sm" isReadOnly />
            </HStack>
          </FormControl>
        </VStack>
      );

    default:
      return <Text fontSize="sm" color="gray.500">Aucune propriété éditable</Text>;
  }
};

export default PageBuilder;
