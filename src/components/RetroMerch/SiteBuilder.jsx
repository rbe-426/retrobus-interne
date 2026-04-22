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
  Switch,
  Select,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Image,
  SimpleGrid,
  Badge,
  Spinner
} from "@chakra-ui/react";
import { FiEye, FiSave, FiPlus, FiTrash, FiImage, FiType, FiLayout } from "react-icons/fi";
import retromerchService from "../../lib/retromerchService";

/**
 * Composant SiteBuilder - Éditeur visuel type Wix pour RetroMerch
 * Permet de modifier la page externe de manière modulaire
 */
const SiteBuilder = () => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({});
  const [previewMode, setPreviewMode] = useState(false);

  // Sections modifiables
  const [heroSection, setHeroSection] = useState({
    title: "RétroMerch",
    subtitle: "La boutique officielle RétroBus Essonne",
    backgroundImage: "",
    backgroundColor: "#f7fafc",
    textColor: "#000000"
  });

  const [aboutSection, setAboutSection] = useState({
    enabled: true,
    title: "À propos",
    description: "Découvrez nos produits exclusifs pour passionnés de bus rétro.",
    image: ""
  });

  const [featuredProducts, setFeaturedProducts] = useState({
    enabled: true,
    title: "Produits phares",
    productIds: []
  });

  const [theme, setTheme] = useState({
    primaryColor: "#e53e3e",
    secondaryColor: "#2d3748",
    fontFamily: "Inter, sans-serif"
  });

  // Charger la configuration au montage
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const fullConfig = await retromerchService.getSiteConfig();
      
      // Charger chaque section depuis la config
      if (fullConfig.hero_section) setHeroSection(fullConfig.hero_section);
      if (fullConfig.about_section) setAboutSection(fullConfig.about_section);
      if (fullConfig.featured_products) setFeaturedProducts(fullConfig.featured_products);
      if (fullConfig.theme) setTheme(fullConfig.theme);
      
      setConfig(fullConfig);
      
      toast({
        title: "Configuration chargée",
        status: "success",
        duration: 2000
      });
    } catch (error) {
      console.error("Erreur chargement config:", error);
      // Si pas de config, utiliser les valeurs par défaut
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      // Sauvegarder chaque section séparément
      await retromerchService.updateSiteConfig("hero_section", heroSection);
      await retromerchService.updateSiteConfig("about_section", aboutSection);
      await retromerchService.updateSiteConfig("featured_products", featuredProducts);
      await retromerchService.updateSiteConfig("theme", theme);
      
      toast({
        title: "✅ Configuration sauvegardée",
        description: "Les modifications seront visibles sur le site externe",
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

  const openPreview = () => {
    window.open("https://www.retrobus-essonne.fr/retromerch", "_blank");
  };

  if (isLoading) {
    return (
      <VStack justify="center" py={12}>
        <Spinner size="lg" color="red.500" />
        <Text color="gray.600">Chargement de l'éditeur...</Text>
      </VStack>
    );
  }

  return (
    <Box>
      {/* Header avec actions */}
      <HStack justify="space-between" mb={6} p={4} bg="white" borderRadius="lg" shadow="sm">
        <Box>
          <Heading size="md">Éditeur de site RetroMerch</Heading>
          <Text fontSize="sm" color="gray.600">
            Configurez votre vitrine commerciale en ligne
          </Text>
        </Box>
        <HStack spacing={3}>
          <Button
            leftIcon={<Icon as={FiEye} />}
            variant="outline"
            onClick={openPreview}
          >
            Prévisualiser
          </Button>
          <Button
            leftIcon={<Icon as={FiSave} />}
            colorScheme="red"
            isLoading={isSaving}
            onClick={saveConfig}
          >
            Sauvegarder
          </Button>
        </HStack>
      </HStack>

      {/* Éditeur par sections */}
      <Tabs colorScheme="red" variant="enclosed">
        <TabList>
          <Tab><Icon as={FiLayout} mr={2} /> Hero</Tab>
          <Tab><Icon as={FiType} mr={2} /> À propos</Tab>
          <Tab><Icon as={FiImage} mr={2} /> Produits phares</Tab>
          <Tab>🎨 Thème</Tab>
        </TabList>

        <TabPanels>
          {/* HERO SECTION */}
          <TabPanel>
            <VStack align="stretch" spacing={4} bg="white" p={6} borderRadius="lg">
              <Heading size="sm">Section Hero (Bannière principale)</Heading>
              
              <FormControl>
                <FormLabel>Titre principal</FormLabel>
                <Input
                  value={heroSection.title}
                  onChange={(e) => setHeroSection({ ...heroSection, title: e.target.value })}
                  placeholder="RétroMerch"
                  size="lg"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Sous-titre</FormLabel>
                <Input
                  value={heroSection.subtitle}
                  onChange={(e) => setHeroSection({ ...heroSection, subtitle: e.target.value })}
                  placeholder="La boutique officielle..."
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <FormLabel>Couleur de fond</FormLabel>
                  <HStack>
                    <Input
                      type="color"
                      value={heroSection.backgroundColor}
                      onChange={(e) => setHeroSection({ ...heroSection, backgroundColor: e.target.value })}
                      w="60px"
                    />
                    <Input
                      value={heroSection.backgroundColor}
                      onChange={(e) => setHeroSection({ ...heroSection, backgroundColor: e.target.value })}
                      placeholder="#f7fafc"
                    />
                  </HStack>
                </FormControl>

                <FormControl>
                  <FormLabel>Couleur du texte</FormLabel>
                  <HStack>
                    <Input
                      type="color"
                      value={heroSection.textColor}
                      onChange={(e) => setHeroSection({ ...heroSection, textColor: e.target.value })}
                      w="60px"
                    />
                    <Input
                      value={heroSection.textColor}
                      onChange={(e) => setHeroSection({ ...heroSection, textColor: e.target.value })}
                      placeholder="#000000"
                    />
                  </HStack>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Image de fond (URL)</FormLabel>
                <Input
                  value={heroSection.backgroundImage}
                  onChange={(e) => setHeroSection({ ...heroSection, backgroundImage: e.target.value })}
                  placeholder="https://..."
                />
                {heroSection.backgroundImage && (
                  <Image src={heroSection.backgroundImage} mt={2} maxH="150px" borderRadius="md" />
                )}
              </FormControl>

              {/* Prévisualisation */}
              <Box
                mt={4}
                p={8}
                borderRadius="lg"
                textAlign="center"
                bg={heroSection.backgroundColor}
                color={heroSection.textColor}
                backgroundImage={heroSection.backgroundImage ? `url(${heroSection.backgroundImage})` : 'none'}
                backgroundSize="cover"
                backgroundPosition="center"
              >
                <Heading size="2xl" mb={2}>{heroSection.title}</Heading>
                <Text fontSize="xl">{heroSection.subtitle}</Text>
              </Box>
            </VStack>
          </TabPanel>

          {/* ABOUT SECTION */}
          <TabPanel>
            <VStack align="stretch" spacing={4} bg="white" p={6} borderRadius="lg">
              <HStack justify="space-between">
                <Heading size="sm">Section À propos</Heading>
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel mb="0">Activer</FormLabel>
                  <Switch
                    isChecked={aboutSection.enabled}
                    onChange={(e) => setAboutSection({ ...aboutSection, enabled: e.target.checked })}
                    colorScheme="red"
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Titre de la section</FormLabel>
                <Input
                  value={aboutSection.title}
                  onChange={(e) => setAboutSection({ ...aboutSection, title: e.target.value })}
                  placeholder="À propos"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={aboutSection.description}
                  onChange={(e) => setAboutSection({ ...aboutSection, description: e.target.value })}
                  placeholder="Découvrez nos produits..."
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Image illustrative (URL)</FormLabel>
                <Input
                  value={aboutSection.image}
                  onChange={(e) => setAboutSection({ ...aboutSection, image: e.target.value })}
                  placeholder="https://..."
                />
                {aboutSection.image && (
                  <Image src={aboutSection.image} mt={2} maxH="200px" borderRadius="md" />
                )}
              </FormControl>

              {/* Prévisualisation */}
              {aboutSection.enabled && (
                <Box mt={4} p={6} bg="gray.50" borderRadius="lg">
                  <Heading size="lg" mb={3}>{aboutSection.title}</Heading>
                  <Text>{aboutSection.description}</Text>
                </Box>
              )}
            </VStack>
          </TabPanel>

          {/* FEATURED PRODUCTS */}
          <TabPanel>
            <VStack align="stretch" spacing={4} bg="white" p={6} borderRadius="lg">
              <HStack justify="space-between">
                <Heading size="sm">Produits phares</Heading>
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel mb="0">Activer</FormLabel>
                  <Switch
                    isChecked={featuredProducts.enabled}
                    onChange={(e) => setFeaturedProducts({ ...featuredProducts, enabled: e.target.checked })}
                    colorScheme="red"
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Titre de la section</FormLabel>
                <Input
                  value={featuredProducts.title}
                  onChange={(e) => setFeaturedProducts({ ...featuredProducts, title: e.target.value })}
                  placeholder="Produits phares"
                />
              </FormControl>

              <Box>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Les produits marqués comme "phares" dans le catalogue apparaîtront automatiquement ici.
                </Text>
                <Badge colorScheme="blue">Fonctionnalité à développer dans Catalogue</Badge>
              </Box>
            </VStack>
          </TabPanel>

          {/* THEME */}
          <TabPanel>
            <VStack align="stretch" spacing={4} bg="white" p={6} borderRadius="lg">
              <Heading size="sm">Thème global</Heading>

              <FormControl>
                <FormLabel>Couleur primaire (boutons, accents)</FormLabel>
                <HStack>
                  <Input
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    w="60px"
                  />
                  <Input
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    placeholder="#e53e3e"
                  />
                </HStack>
              </FormControl>

              <FormControl>
                <FormLabel>Couleur secondaire</FormLabel>
                <HStack>
                  <Input
                    type="color"
                    value={theme.secondaryColor}
                    onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                    w="60px"
                  />
                  <Input
                    value={theme.secondaryColor}
                    onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                    placeholder="#2d3748"
                  />
                </HStack>
              </FormControl>

              <FormControl>
                <FormLabel>Police de caractères</FormLabel>
                <Select
                  value={theme.fontFamily}
                  onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value })}
                >
                  <option value="Inter, sans-serif">Inter (par défaut)</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                  <option value="Montserrat, sans-serif">Montserrat</option>
                  <option value="Open Sans, sans-serif">Open Sans</option>
                  <option value="Georgia, serif">Georgia</option>
                </Select>
              </FormControl>

              {/* Prévisualisation du thème */}
              <Box mt={4} p={6} bg="gray.50" borderRadius="lg" fontFamily={theme.fontFamily}>
                <Heading size="md" mb={3} color={theme.primaryColor}>
                  Aperçu du thème
                </Heading>
                <Text mb={3}>
                  Voici un exemple de texte avec la police sélectionnée.
                </Text>
                <HStack spacing={3}>
                  <Button bg={theme.primaryColor} color="white" size="sm">
                    Bouton primaire
                  </Button>
                  <Button bg={theme.secondaryColor} color="white" size="sm">
                    Bouton secondaire
                  </Button>
                </HStack>
              </Box>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default SiteBuilder;
