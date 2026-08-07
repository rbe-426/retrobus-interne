/**
 * Éditeur WYSIWYG simple pour templates HTML
 * Édition directe du visuel sans voir le code - accessible à tous
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
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

  // Injecter le HTML dans l'éditeur après le montage
  useEffect(() => {
    if (editorRef.current && templateHtml) {
      editorRef.current.innerHTML = templateHtml;
    }
  }, [templateHtml, isOpen]);

  // Commandes d'édition
  const execCommand = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  // Formatage
  const formatBold = useCallback(() => execCommand('bold'), [execCommand]);
  const formatItalic = useCallback(() => execCommand('italic'), [execCommand]);
  const formatUnderline = useCallback(() => execCommand('underline'), [execCommand]);
  
  const setFontSize = useCallback((size) => {
    execCommand('fontSize', size);
  }, [execCommand]);

  const setTextColor = useCallback((color) => {
    execCommand('foreColor', color);
  }, [execCommand]);

  const setBackgroundColor = useCallback((color) => {
    execCommand('hiliteColor', color);
  }, [execCommand]);

  // Gérer la touche Entrée pour insérer des <br> au lieu de créer des blocs
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  }, []);

  // Sauvegarder
  const handleSave = useCallback(() => {
    if (!editorRef.current) return;
    
    const editedHtml = editorRef.current.innerHTML;
    onSave(editedHtml);
    
    toast({
      title: "Template personnalisé",
      description: "Vos modifications ont été enregistrées",
      status: "success",
      duration: 3000
    });
    
    onClose();
  }, [onSave, onClose, toast]);

  // Réinitialiser
  const handleReset = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = originalHtml;
    }
    toast({
      title: "Réinitialisé",
      description: "Le template original a été restauré",
      status: "info",
      duration: 2000
    });
  }, [originalHtml, toast]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalOverlay />
      <ModalContent maxH="100vh">
        <ModalHeader>
          <HStack spacing={3}>
            <Text>✏️ Éditeur Visuel - Cliquez pour modifier</Text>
            <Badge colorScheme="green" fontSize="sm">
              WYSIWYG
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {/* Barre d'outils */}
          <Box 
            p={3} 
            bg={toolbarBg} 
            borderRadius="md" 
            border="1px solid"
            borderColor={borderColor}
            mb={4}
            position="sticky"
            top={0}
            zIndex={10}
          >
            <HStack spacing={3} wrap="wrap">
              <ButtonGroup size="sm" isAttached variant="outline">
                <Tooltip label="Gras (Ctrl+B)">
                  <IconButton
                    icon={<FiBold />}
                    onClick={formatBold}
                    aria-label="Gras"
                  />
                </Tooltip>
                <Tooltip label="Italique (Ctrl+I)">
                  <IconButton
                    icon={<FiItalic />}
                    onClick={formatItalic}
                    aria-label="Italique"
                  />
                </Tooltip>
                <Tooltip label="Souligné (Ctrl+U)">
                  <IconButton
                    icon={<FiUnderline />}
                    onClick={formatUnderline}
                    aria-label="Souligné"
                  />
                </Tooltip>
              </ButtonGroup>

              <Menu>
                <Tooltip label="Taille du texte">
                  <MenuButton as={Button} size="sm" variant="outline" rightIcon={<FiChevronDown />}>
                    <HStack spacing={1}>
                      <FiType />
                      <Text fontSize="xs">Taille</Text>
                    </HStack>
                  </MenuButton>
                </Tooltip>
                <MenuList>
                  <MenuItem onClick={() => setFontSize(1)}>Très petit</MenuItem>
                  <MenuItem onClick={() => setFontSize(2)}>Petit</MenuItem>
                  <MenuItem onClick={() => setFontSize(3)}>Normal</MenuItem>
                  <MenuItem onClick={() => setFontSize(4)}>Grand</MenuItem>
                  <MenuItem onClick={() => setFontSize(5)}>Très grand</MenuItem>
                  <MenuItem onClick={() => setFontSize(7)}>Énorme</MenuItem>
                </MenuList>
              </Menu>

              <Menu>
                <Tooltip label="Couleur du texte">
                  <MenuButton as={Button} size="sm" variant="outline" rightIcon={<FiChevronDown />}>
                    🎨 Couleur
                  </MenuButton>
                </Tooltip>
                <MenuList>
                  <MenuItem onClick={() => setTextColor('#000000')}>⚫ Noir</MenuItem>
                  <MenuItem onClick={() => setTextColor('#FF0000')}>🔴 Rouge</MenuItem>
                  <MenuItem onClick={() => setTextColor('#0000FF')}>🔵 Bleu</MenuItem>
                  <MenuItem onClick={() => setTextColor('#00AA00')}>🟢 Vert</MenuItem>
                  <MenuItem onClick={() => setTextColor('#FF8800')}>🟠 Orange</MenuItem>
                  <MenuItem onClick={() => setTextColor('#AA00AA')}>🟣 Violet</MenuItem>
                  <MenuItem onClick={() => setTextColor('#FFFFFF')}>⚪ Blanc</MenuItem>
                </MenuList>
              </Menu>

              <Menu>
                <Tooltip label="Surlignage">
                  <MenuButton as={Button} size="sm" variant="outline" rightIcon={<FiChevronDown />}>
                    🖍️ Surligner
                  </MenuButton>
                </Tooltip>
                <MenuList>
                  <MenuItem onClick={() => setBackgroundColor('#FFFF00')}>💛 Jaune</MenuItem>
                  <MenuItem onClick={() => setBackgroundColor('#00FF00')}>💚 Vert</MenuItem>
                  <MenuItem onClick={() => setBackgroundColor('#00FFFF')}>💙 Cyan</MenuItem>
                  <MenuItem onClick={() => setBackgroundColor('#FFC0CB')}>💗 Rose</MenuItem>
                  <MenuItem onClick={() => setBackgroundColor('#FFFFFF')}>⚪ Retirer</MenuItem>
                </MenuList>
              </Menu>

              <Button
                size="sm"
                leftIcon={<FiRefreshCw />}
                variant="outline"
                onClick={handleReset}
                colorScheme="orange"
              >
                Réinitialiser
              </Button>
            </HStack>
          </Box>

          {/* Zone d'édition WYSIWYG */}
          <Box
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: templateHtml }}
            onKeyDown={handleKeyDown}
            p={6}
            bg="white"
            border="2px solid"
            borderColor="blue.300"
            borderRadius="lg"
            minH="60vh"
            maxH="70vh"
            overflowY="auto"
            outline="none"
            whiteSpace="pre-wrap"
            textTransform="none"
            sx={{
              '&:focus': {
                borderColor: 'blue.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
              },
              '& *': {
                textTransform: 'none'
              }
            }}
          />

          <Text fontSize="xs" color="gray.500" mt={2}>
            💡 <strong>Astuce :</strong> Sélectionnez du texte puis utilisez les boutons de la barre d'outils pour le formater. Cliquez directement dans le texte pour le modifier.
          </Text>
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor={borderColor}>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              colorScheme="blue"
              leftIcon={<FiSave />}
              onClick={handleSave}
            >
              Enregistrer et utiliser
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
