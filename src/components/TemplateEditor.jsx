/**
 * Éditeur WYSIWYG simple pour templates HTML
 * Édition directe du visuel sans voir le code - accessible à tous
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Button, HStack, Text, Box, useToast, Badge,
  IconButton, Tooltip, ButtonGroup, Menu, MenuButton, MenuList, MenuItem,
  useColorModeValue
} from '@chakra-ui/react';
import { 
  FiSave, FiRefreshCw, FiBold, FiItalic, FiUnderline, FiType, FiChevronDown
} from 'react-icons/fi';

export default function TemplateEditor({
  isOpen,
  onClose,
  templateHtml,
  onSave
}) {
  const toast = useToast();
  const editorRef = useRef(null);
  const [originalHtml] = useState(templateHtml);
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const toolbarBg = useColorModeValue('gray.50', 'gray.700');

  // Extraire les champs éditables du HTML
  useEffect(() => {
    if (!templateHtml) return;

    const fields = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(templateHtml, 'text/html');

    // Extraire les textes dans les balises communes
    const textSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'span', 'td', 'div',
      'a'
    ];

    let fieldId = 0;
    textSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((el, idx) => {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 500) {
          // Générer un identifiant unique pour ce texte
          const id = `text_${selector}_${idx}_${fieldId++}`;
          fields.push({
            id,
            type: 'text',
            label: `${selector.toUpperCase()} - ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
            value: text,
            originalValue: text,
            selector,
            index: idx
          });
        }
      });
    });

    // Extraire les images
    const images = doc.querySelectorAll('img');
    images.forEach((img, idx) => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      if (src) {
        fields.push({
          id: `img_${idx}`,
          type: 'image',
          label: `Image ${idx + 1} - ${alt || 'Sans titre'}`,
          value: src,
          originalValue: src,
          alt,
          index: idx
        });
      }
    });

    // Extraire les liens
    const links = doc.querySelectorAll('a[href]');
    links.forEach((link, idx) => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent?.trim() || '';
      if (href && href.startsWith('http')) {
        fields.push({
          id: `link_${idx}`,
          type: 'link',
          label: `Lien ${idx + 1} - ${text.substring(0, 30) || 'Sans texte'}`,
          value: href,
          originalValue: href,
          text,
          index: idx
        });
      }
    });

    setEditableFields(fields);
    setEditedHtml(templateHtml);
  }, [templateHtml]);

  // Mettre à jour un champ
  const updateField = useCallback((fieldId, newValue) => {
    setEditableFields(prev => 
      prev.map(field => 
        field.id === fieldId ? { ...field, value: newValue } : field
      )
    );
  }, []);

  // Appliquer les modifications au HTML
  const applyChanges = useCallback(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(editedHtml, 'text/html');

    editableFields.forEach(field => {
      if (field.value === field.originalValue) return; // Pas de changement

      try {
        if (field.type === 'text') {
          const elements = doc.querySelectorAll(field.selector);
          const targetEl = elements[field.index];
          if (targetEl && targetEl.textContent?.trim() === field.originalValue) {
            targetEl.textContent = field.value;
          }
        } else if (field.type === 'image') {
          const images = doc.querySelectorAll('img');
          const targetImg = images[field.index];
          if (targetImg) {
            targetImg.setAttribute('src', field.value);
          }
        } else if (field.type === 'link') {
          const links = doc.querySelectorAll('a[href]');
          const targetLink = links[field.index];
          if (targetLink && targetLink.getAttribute('href') === field.originalValue) {
            targetLink.setAttribute('href', field.value);
          }
        }
      } catch (error) {
        console.error(`Erreur mise à jour champ ${field.id}:`, error);
      }
    });

    // Récupérer le HTML modifié
    const serializer = new XMLSerializer();
    const modifiedHtml = serializer.serializeToString(doc);
    setEditedHtml(modifiedHtml);

    return modifiedHtml;
  }, [editedHtml, editableFields]);

  // Sauvegarder et fermer
  const handleSave = useCallback(() => {
    const finalHtml = applyChanges();
    
    // Compter les modifications
    const modifiedCount = editableFields.filter(f => f.value !== f.originalValue).length;
    
    onSave(finalHtml);
    
    toast({
      title: "Template personnalisé",
      description: `${modifiedCount} modification(s) appliquée(s)`,
      status: "success",
      duration: 3000
    });
    
    onClose();
  }, [applyChanges, editableFields, onSave, onClose, toast]);

  // Réinitialiser
  const handleReset = useCallback(() => {
    setEditableFields(prev => 
      prev.map(field => ({ ...field, value: field.originalValue }))
    );
    setEditedHtml(templateHtml);
    toast({
      title: "Modifications annulées",
      status: "info",
      duration: 2000
    });
  }, [templateHtml, toast]);

  // Grouper les champs par type
  const textFields = editableFields.filter(f => f.type === 'text');
  const imageFields = editableFields.filter(f => f.type === 'image');
  const linkFields = editableFields.filter(f => f.type === 'link');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxH="95vh">
        <ModalHeader>
          <HStack spacing={3}>
            <Text>🎨 Personnaliser le template</Text>
            <Badge colorScheme="purple" fontSize="sm">
              {editableFields.filter(f => f.value !== f.originalValue).length} modification(s)
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody overflowY="auto">
          <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed">
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <FiEdit2 />
                  <Text>Éditer ({textFields.length + imageFields.length + linkFields.length})</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FiEye />
                  <Text>Aperçu</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Panel d'édition */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  {/* Textes */}
                  {textFields.length > 0 && (
                    <Box>
                      <HStack spacing={2} mb={3}>
                        <FiType />
                        <Heading size="sm">Textes ({textFields.length})</Heading>
                      </HStack>
                      <Accordion allowMultiple>
                        {textFields.map((field, idx) => (
                          <AccordionItem key={field.id} border="1px solid" borderColor="gray.200" borderRadius="md" mb={2}>
                            <AccordionButton>
                              <Box flex="1" textAlign="left">
                                <HStack spacing={2}>
                                  <Badge colorScheme="blue" fontSize="xs">{field.selector.toUpperCase()}</Badge>
                                  <Text fontSize="sm" noOfLines={1}>
                                    {field.value.substring(0, 60)}...
                                  </Text>
                                  {field.value !== field.originalValue && (
                                    <Badge colorScheme="green" fontSize="xs">Modifié</Badge>
                                  )}
                                </HStack>
                              </Box>
                              <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel pb={4}>
                              <FormControl>
                                {field.value.length < 100 ? (
                                  <Input
                                    value={field.value}
                                    onChange={(e) => updateField(field.id, e.target.value)}
                                    size="sm"
                                  />
                                ) : (
                                  <Textarea
                                    value={field.value}
                                    onChange={(e) => updateField(field.id, e.target.value)}
                                    rows={3}
                                    size="sm"
                                  />
                                )}
                              </FormControl>
                            </AccordionPanel>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </Box>
                  )}

                  {/* Images */}
                  {imageFields.length > 0 && (
                    <Box>
                      <HStack spacing={2} mb={3}>
                        <FiImage />
                        <Heading size="sm">Images ({imageFields.length})</Heading>
                      </HStack>
                      <VStack spacing={3} align="stretch">
                        {imageFields.map((field) => (
                          <Box key={field.id} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                            <VStack spacing={2} align="stretch">
                              <HStack justify="space-between">
                                <Text fontSize="sm" fontWeight="600">{field.label}</Text>
                                {field.value !== field.originalValue && (
                                  <Badge colorScheme="green" fontSize="xs">Modifié</Badge>
                                )}
                              </HStack>
                              {field.value && field.value.startsWith('http') && (
                                <Image src={field.value} alt={field.alt} maxH="150px" objectFit="contain" />
                              )}
                              <FormControl>
                                <FormLabel fontSize="xs">URL de l'image</FormLabel>
                                <Input
                                  value={field.value}
                                  onChange={(e) => updateField(field.id, e.target.value)}
                                  placeholder="https://..."
                                  size="sm"
                                />
                              </FormControl>
                            </VStack>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {/* Liens */}
                  {linkFields.length > 0 && (
                    <Box>
                      <HStack spacing={2} mb={3}>
                        <FiLink />
                        <Heading size="sm">Liens ({linkFields.length})</Heading>
                      </HStack>
                      <VStack spacing={3} align="stretch">
                        {linkFields.map((field) => (
                          <Box key={field.id} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                            <VStack spacing={2} align="stretch">
                              <HStack justify="space-between">
                                <Text fontSize="sm" fontWeight="600">{field.label}</Text>
                                {field.value !== field.originalValue && (
                                  <Badge colorScheme="green" fontSize="xs">Modifié</Badge>
                                )}
                              </HStack>
                              <FormControl>
                                <FormLabel fontSize="xs">URL du lien</FormLabel>
                                <Input
                                  value={field.value}
                                  onChange={(e) => updateField(field.id, e.target.value)}
                                  placeholder="https://..."
                                  size="sm"
                                />
                              </FormControl>
                              <Text fontSize="xs" color="gray.500">
                                Texte du lien : "{field.text}"
                              </Text>
                            </VStack>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {editableFields.length === 0 && (
                    <Box p={6} textAlign="center" bg="gray.50" borderRadius="md">
                      <Text color="gray.500">
                        Aucun champ éditable détecté dans ce template
                      </Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>

              {/* Panel d'aperçu */}
              <TabPanel>
                <Box
                  p={4}
                  bg="white"
                  border="2px solid"
                  borderColor="gray.300"
                  borderRadius="lg"
                  maxH="70vh"
                  overflowY="auto"
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: editedHtml }}
                    style={{ width: '100%' }}
                  />
                </Box>
                <Text fontSize="xs" color="gray.500" mt={2}>
                  💡 Cliquez sur l'onglet "Éditer" pour modifier le contenu
                </Text>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor="gray.200">
          <HStack spacing={3} w="100%" justify="space-between">
            <Button
              leftIcon={<FiRefreshCw />}
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              Réinitialiser
            </Button>
            <HStack spacing={2}>
              <Button variant="ghost" onClick={onClose}>
                Annuler
              </Button>
              <Button
                colorScheme="purple"
                leftIcon={<FiSave />}
                onClick={handleSave}
              >
                Enregistrer et utiliser
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
