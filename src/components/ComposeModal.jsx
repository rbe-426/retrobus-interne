/**
 * Modal de composition d'email optimisé avec éditeur WYSIWYG
 * Édition visuelle sans voir le code HTML - accessible à tous
 */

import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Button, FormControl, FormLabel, Input,
  VStack, HStack, IconButton, Card, CardBody, Text, Flex, useToast,
  Collapse, Badge, Tooltip,
  ButtonGroup, Divider, Box, useColorModeValue, Image, Menu, MenuButton, MenuList, MenuItem
} from '@chakra-ui/react';
import { 
  FiSend, FiPaperclip, FiX, FiFileText, FiBold, FiItalic, FiUnderline,
  FiList, FiLink, FiImage, FiCode, FiEye, FiType, FiChevronDown, FiMaximize2, FiEdit2
} from 'react-icons/fi';

const ComposeModal = memo(({
  isOpen,
  onClose,
  composeTo,
  composeCc,
  composeBcc,
  composeSubject,
  composeBody,
  onComposeToChange,
  onComposeCcChange,
  onComposeBccChange,
  onComposeSubjectChange,
  onComposeBodyChange,
  composeAttachments,
  onFileUpload,
  onRemoveAttachment,
  onSendEmail,
  isSending,
  mailFont,
  signature,
  signatureImage,
  isNoReplyAccount,
  onOpenTemplates,
  onOpenTemplateEditor
}) => {
  const toast = useToast();
  const editorRef = useRef(null);
  const updateTimerRef = useRef(null);
  
  // États locaux pour fonctionnalités avancées
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const toolbarBg = useColorModeValue('gray.50', 'gray.700');
  const previewBg = useColorModeValue('white', 'gray.800');

  // Synchroniser l'éditeur avec composeBody au chargement
  useEffect(() => {
    if (editorRef.current && composeBody && isOpen) {
      // Ne mettre à jour que si le contenu est différent pour éviter les boucles
      if (editorRef.current.innerHTML !== composeBody) {
        editorRef.current.innerHTML = composeBody || '';
      }
    }
  }, [isOpen]);

  // Cleanup du timer au démontage
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Mettre à jour le state parent avec debounce pour éviter les lags
  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      // Annuler le timer précédent
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      
      // Mettre à jour après 150ms d'inactivité
      updateTimerRef.current = setTimeout(() => {
        const html = editorRef.current.innerHTML;
        onComposeBodyChange({ target: { value: html } });
      }, 150);
    }
  }, [onComposeBodyChange]);

  // Calculer la taille totale des pièces jointes
  const totalAttachmentSize = composeAttachments.reduce((sum, att) => sum + (att.size || 0), 0);
  const totalSizeMB = (totalAttachmentSize / (1024 * 1024)).toFixed(2);
  const totalSizeKB = (totalAttachmentSize / 1024).toFixed(0);
  const isLargeAttachment = totalAttachmentSize > 2 * 1024 * 1024;

  // Commandes d'édition WYSIWYG
  const execCommand = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  // Formatage
  const formatBold = useCallback(() => execCommand('bold'), [execCommand]);
  const formatItalic = useCallback(() => execCommand('italic'), [execCommand]);
  const formatUnderline = useCallback(() => execCommand('underline'), [execCommand]);
  const formatCode = useCallback(() => {
    execCommand('formatBlock', 'pre');
  }, [execCommand]);
  
  const insertList = useCallback((type) => {
    if (type === 'ul') {
      execCommand('insertUnorderedList');
    } else {
      execCommand('insertOrderedList');
    }
  }, [execCommand]);
  
  const insertLink = useCallback(() => {
    const url = prompt('URL du lien :');
    if (url) execCommand('createLink', url);
  }, [execCommand]);
  
  const insertHeading = useCallback((level) => {
    execCommand('formatBlock', `h${level}`);
  }, [execCommand]);
  
  const setTextColor = useCallback((color) => {
    execCommand('foreColor', color);
  }, [execCommand]);

  // Gérer la touche Entrée pour des sauts de ligne simples
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Insérer un <br> pour créer un saut de ligne
      const br = document.createElement('br');
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      
      range.deleteContents();
      range.insertNode(br);
      
      // Positionner le curseur après le <br>
      range.setStartAfter(br);
      range.setEndAfter(br);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleEditorInput(); // Mettre à jour le state
    }
  }, [handleEditorInput]);

  // Insérer la signature
  const insertSignature = useCallback(() => {
    if (!signature && !signatureImage) {
      toast({
        title: "Aucune signature",
        description: "Configurez votre signature dans les paramètres",
        status: "info",
        duration: 3000
      });
      return;
    }

    if (!editorRef.current) return;

    // Construire la signature HTML sans encadré
    let signatureHtml = '<br><br>';
    
    if (signature) {
      // Convertir les sauts de ligne en <br>
      const signatureLines = signature.split('\n').join('<br>');
      signatureHtml += signatureLines;
    }
    
    if (signatureImage) {
      if (signature) signatureHtml += '<br>';
      signatureHtml += `<img src="${signatureImage}" alt="Signature" style="max-width: 400px; height: auto;" />`;
    }

    // Insérer à la position du curseur
    document.execCommand('insertHTML', false, signatureHtml);
    handleEditorInput();

    toast({
      title: "Signature insérée",
      status: "success",
      duration: 2000
    });
  }, [signature, signatureImage, handleEditorInput, toast]);

  const charCount = composeBody?.length || 0;
  
  // Détecter le type de contenu
  const isFullHtml = composeBody?.trim().startsWith('<!DOCTYPE') || 
                     composeBody?.trim().startsWith('<html') ||
                     composeBody?.includes('</html>');
  
  // Détecter du vrai HTML formaté (pas juste des <br> de sauts de ligne)
  // On ignore les <br> car ils sont générés automatiquement par l'éditeur
  const hasRealFormatting = /<(div|p|table|h[1-6]|ul|ol|li|span|strong|b|em|i|u|a|img)[>\s]/i.test(composeBody || '');
  
  const contentType = isFullHtml ? 'template' : (hasRealFormatting ? 'html' : 'text');

  // Handler pour le bouton d'envoi
  const handleSend = useCallback(() => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs",
        status: "warning",
        duration: 3000
      });
      return;
    }
    onSendEmail();
  }, [composeTo, composeSubject, composeBody, onSendEmail, toast]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={isFullscreen ? 'full' : '4xl'}>
      <ModalOverlay />
      <ModalContent maxH={isFullscreen ? '100vh' : '90vh'}>
        <ModalHeader>
          <Flex justify="space-between" align="center">
            <HStack spacing={3}>
              <Text fontSize="lg" fontWeight="600">✉️ Nouveau message</Text>
              {isNoReplyAccount && (
                <Badge colorScheme="purple" fontSize="xs">NoReply</Badge>
              )}
              {contentType === 'template' && (
                <Tooltip label="Template HTML complet détecté - Sera envoyé tel quel">
                  <Badge colorScheme="green" fontSize="xs">📄 Template HTML</Badge>
                </Tooltip>
              )}
              {contentType === 'html' && (
                <Tooltip label="Contenu HTML formaté - Conservera le formatage">
                  <Badge colorScheme="blue" fontSize="xs">🎨 HTML</Badge>
                </Tooltip>
              )}
              {contentType === 'text' && composeBody && (
                <Tooltip label="Texte brut - Sera converti en HTML à l'envoi">
                  <Badge colorScheme="gray" fontSize="xs">📝 Texte</Badge>
                </Tooltip>
              )}
            </HStack>
            <HStack spacing={2}>
              {contentType === 'template' && onOpenTemplateEditor && (
                <Button
                  size="sm"
                  leftIcon={<FiEdit2 />}
                  colorScheme="green"
                  variant="outline"
                  onClick={onOpenTemplateEditor}
                >
                  Personnaliser
                </Button>
              )}
              {isNoReplyAccount && (
                <Button
                  size="sm"
                  leftIcon={<FiFileText />}
                  colorScheme="purple"
                  variant="outline"
                  onClick={onOpenTemplates}
                >
                  Templates
                </Button>
              )}
              <Tooltip label={isFullscreen ? "Mode normal" : "Plein écran"}>
                <IconButton
                  icon={<FiMaximize2 />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  aria-label="Basculer plein écran"
                />
              </Tooltip>
            </HStack>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          <VStack spacing={3} align="stretch">
            {/* Destinataires */}
            <VStack spacing={2} align="stretch">
              <FormControl>
                <HStack>
                  <FormLabel mb={0} minW="80px">À :</FormLabel>
                  <Input 
                    type="email"
                    placeholder="destinataire@example.com"
                    value={composeTo}
                    onChange={onComposeToChange}
                    autoComplete="off"
                    size="sm"
                    flex={1}
                  />
                  <HStack spacing={1}>
                    <Button
                      size="xs"
                      variant="link"
                      colorScheme="blue"
                      onClick={() => setShowCc(!showCc)}
                    >
                      Cc
                    </Button>
                    <Button
                      size="xs"
                      variant="link"
                      colorScheme="blue"
                      onClick={() => setShowBcc(!showBcc)}
                    >
                      Bcc
                    </Button>
                  </HStack>
                </HStack>
              </FormControl>

              <Collapse in={showCc}>
                <FormControl>
                  <HStack>
                    <FormLabel mb={0} minW="80px">Cc :</FormLabel>
                    <Input 
                      type="email"
                      placeholder="copie@example.com"
                      value={composeCc}
                      onChange={onComposeCcChange}
                      autoComplete="off"
                      size="sm"
                      flex={1}
                    />
                    <IconButton
                      icon={<FiX />}
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setShowCc(false);
                        onComposeCcChange({ target: { value: '' } });
                      }}
                      aria-label="Masquer Cc"
                    />
                  </HStack>
                </FormControl>
              </Collapse>

              <Collapse in={showBcc}>
                <FormControl>
                  <HStack>
                    <FormLabel mb={0} minW="80px">Bcc :</FormLabel>
                    <Input 
                      type="email"
                      placeholder="copie-cachee@example.com"
                      value={composeBcc}
                      onChange={onComposeBccChange}
                      autoComplete="off"
                      size="sm"
                      flex={1}
                    />
                    <IconButton
                      icon={<FiX />}
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setShowBcc(false);
                        onComposeBccChange({ target: { value: '' } });
                      }}
                      aria-label="Masquer Bcc"
                    />
                  </HStack>
                </FormControl>
              </Collapse>

              <FormControl>
                <HStack>
                  <FormLabel mb={0} minW="80px">Objet :</FormLabel>
                  <Input 
                    placeholder="Objet du message"
                    value={composeSubject}
                    onChange={onComposeSubjectChange}
                    autoComplete="off"
                    size="sm"
                    flex={1}
                    fontWeight="500"
                  />
                </HStack>
              </FormControl>
            </VStack>

            <Divider />

            {/* Barre d'outils de formatage */}
            {contentType === 'template' ? (
              <Box 
                p={3} 
                bg="green.50" 
                borderRadius="md" 
                border="1px solid"
                borderColor="green.300"
              >
                <Flex justify="space-between" align="center">
                  <HStack spacing={2}>
                    <Text fontSize="sm" fontWeight="600" color="green.800">
                      📄 Template HTML complet détecté
                    </Text>
                    <Text fontSize="sm" color="green.700">
                      - Cliquez sur "Personnaliser" pour modifier texte, images et liens
                    </Text>
                  </HStack>
                  {onOpenTemplateEditor && (
                    <Button
                      size="sm"
                      colorScheme="green"
                      leftIcon={<FiEdit2 />}
                      onClick={onOpenTemplateEditor}
                    >
                      Personnaliser
                    </Button>
                  )}
                </Flex>
              </Box>
            ) : (
              <Box 
                p={2} 
                bg={toolbarBg} 
                borderRadius="md" 
                border="1px solid"
                borderColor={borderColor}
              >
                <Flex gap={2} wrap="wrap" align="center">
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

                  <Divider orientation="vertical" h="24px" />

                <ButtonGroup size="sm" isAttached variant="outline">
                  <Tooltip label="Liste à puces">
                    <IconButton
                      icon={<FiList />}
                      onClick={() => insertList('ul')}
                      aria-label="Liste à puces"
                    />
                  </Tooltip>
                  <Tooltip label="Liste numérotée">
                    <IconButton
                      icon={<FiType />}
                      onClick={() => insertList('ol')}
                      aria-label="Liste numérotée"
                    />
                  </Tooltip>
                </ButtonGroup>

                <Divider orientation="vertical" h="24px" />

                <Tooltip label="Insérer un lien">
                  <IconButton
                    size="sm"
                    icon={<FiLink />}
                    onClick={insertLink}
                    variant="outline"
                    aria-label="Lien"
                  />
                </Tooltip>

                <Tooltip label="Code">
                  <IconButton
                    size="sm"
                    icon={<FiCode />}
                    onClick={formatCode}
                    variant="outline"
                    aria-label="Code"
                  />
                </Tooltip>

                <Menu>
                  <Tooltip label="Titre">
                    <MenuButton as={Button} size="sm" variant="outline" rightIcon={<FiChevronDown />}>
                      H
                    </MenuButton>
                  </Tooltip>
                  <MenuList>
                    <MenuItem onClick={() => insertHeading(1)}>Titre 1</MenuItem>
                    <MenuItem onClick={() => insertHeading(2)}>Titre 2</MenuItem>
                    <MenuItem onClick={() => insertHeading(3)}>Titre 3</MenuItem>
                  </MenuList>
                </Menu>

                <Menu>
                  <Tooltip label="Couleur du texte">
                    <MenuButton as={Button} size="sm" variant="outline" rightIcon={<FiChevronDown />}>
                      🎨
                    </MenuButton>
                  </Tooltip>
                  <MenuList>
                    <MenuItem onClick={() => setTextColor('#000000')}>⚫ Noir</MenuItem>
                    <MenuItem onClick={() => setTextColor('#FF0000')}>🔴 Rouge</MenuItem>
                    <MenuItem onClick={() => setTextColor('#0000FF')}>🔵 Bleu</MenuItem>
                    <MenuItem onClick={() => setTextColor('#00AA00')}>🟢 Vert</MenuItem>
                    <MenuItem onClick={() => setTextColor('#FF8800')}>🟠 Orange</MenuItem>
                    <MenuItem onClick={() => setTextColor('#AA00AA')}>🟣 Violet</MenuItem>
                  </MenuList>
                </Menu>

                <Divider orientation="vertical" h="24px" />

                <Tooltip label="Insérer ma signature">
                  <Button
                    size="sm"
                    leftIcon={<Text fontSize="md">✍️</Text>}
                    onClick={insertSignature}
                    variant="outline"
                    colorScheme="purple"
                    isDisabled={!signature && !signatureImage}
                  >
                    Signature
                  </Button>
                </Tooltip>

                <Text fontSize="xs" color="gray.500" ml="auto">
                  {charCount} caractères
                </Text>
              </Flex>
            </Box>
            )}

            {/* Zone d'édition WYSIWYG */}
            <FormControl flex={1}>
              <Box
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                onKeyDown={handleKeyDown}
                placeholder="Composez votre message... Utilisez les boutons ci-dessus pour formater le texte."
                minH="300px"
                p={4}
                bg={previewBg}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="md"
                overflowY="auto"
                fontFamily={mailFont}
                fontSize="md"
                css={{
                  whiteSpace: 'normal',
                  textTransform: 'none !important',
                  '& *': { textTransform: 'none !important' }
                }}
                _focus={{
                  borderColor: 'blue.400',
                  boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)',
                  outline: 'none'
                }}
                _empty={{
                  _before: {
                    content: 'attr(placeholder)',
                    color: 'gray.400'
                  }
                }}
                sx={{
                  '& h1, & h2, & h3': { marginBottom: '0.5em', fontWeight: 'bold', textTransform: 'none !important' },
                  '& h1': { fontSize: '2em' },
                  '& h2': { fontSize: '1.5em' },
                  '& h3': { fontSize: '1.2em' },
                  '& p': { marginBottom: '0', textTransform: 'none !important' },
                  '& ul, & ol': { marginLeft: '1.5em', marginBottom: '0.5em' },
                  '& code': { 
                    bg: 'gray.100', 
                    px: 1, 
                    py: 0.5, 
                    borderRadius: 'sm',
                    fontFamily: 'monospace'
                  },
                  '& a': { color: 'blue.500', textDecoration: 'underline' },
                  '& br': { display: 'block', content: '""', marginTop: '0' },
                  '& div, & span': { textTransform: 'none !important' }
                }}
              />
              <HStack justify="space-between" mt={2}>
                <Text fontSize="xs" color="gray.500">
                  Police : {mailFont} • {signature && '✅ Signature'} {signatureImage && '📸'}
                </Text>
              </HStack>
            </FormControl>

            {/* Pièces jointes */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="600">
                <HStack spacing={2} justify="space-between" w="100%">
                  <HStack spacing={2}>
                    <FiPaperclip />
                    <Text>Pièces jointes</Text>
                    {composeAttachments.length > 0 && (
                      <Badge colorScheme="blue">{composeAttachments.length}</Badge>
                    )}
                  </HStack>
                  {composeAttachments.length > 0 && (
                    <HStack spacing={2}>
                      <Badge colorScheme={isLargeAttachment ? "orange" : "green"} fontSize="xs">
                        {totalAttachmentSize > 1024 * 1024 ? `${totalSizeMB} MB` : `${totalSizeKB} KB`}
                      </Badge>
                      {isLargeAttachment && (
                        <Tooltip label="Fichiers volumineux - L'envoi peut prendre quelques secondes">
                          <Badge colorScheme="orange" fontSize="xs">⚠️ Volumineux</Badge>
                        </Tooltip>
                      )}
                    </HStack>
                  )}
                </HStack>
              </FormLabel>
              <Input 
                type="file"
                multiple
                onChange={onFileUpload}
                accept="*/*"
                size="sm"
                pt={1}
              />
              {composeAttachments.length > 0 && (
                <VStack align="stretch" spacing={2} mt={3}>
                  {composeAttachments.map((att, idx) => {
                    const isImage = att.contentType?.startsWith('image/');
                    return (
                      <Card key={idx} size="sm" variant="outline">
                        <CardBody>
                          <Flex gap={3} align="center">
                            {isImage && att.content && (
                              <Image
                                src={`data:${att.contentType};base64,${att.content}`}
                                alt={att.filename}
                                maxH="60px"
                                maxW="60px"
                                objectFit="cover"
                                borderRadius="md"
                              />
                            )}
                            <VStack align="start" spacing={0} flex={1}>
                              <Text fontSize="sm" fontWeight="500" noOfLines={1}>{att.filename}</Text>
                              <HStack spacing={2}>
                                <Badge fontSize="xs" colorScheme="gray">
                                  {att.size > 1024 * 1024 
                                    ? `${(att.size / 1024 / 1024).toFixed(2)} MB`
                                    : `${(att.size / 1024).toFixed(1)} KB`
                                  }
                                </Badge>
                                {att.contentType && (
                                  <Text fontSize="xs" color="gray.500">
                                    {att.contentType.split('/')[1]?.toUpperCase()}
                                  </Text>
                                )}
                              </HStack>
                            </VStack>
                            <IconButton
                              icon={<FiX />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => onRemoveAttachment(idx)}
                              aria-label="Retirer"
                            />
                          </Flex>
                        </CardBody>
                      </Card>
                    );
                  })}
                </VStack>
              )}
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor={borderColor}>
          <HStack spacing={3} w="100%" justify="space-between">
            <Box>
              {isLargeAttachment ? (
                <HStack spacing={2}>
                  <Text fontSize="xs" color="orange.600" fontWeight="600">
                    ⚠️ Fichiers volumineux ({totalSizeMB} MB)
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    - L'envoi peut prendre 10-30 secondes
                  </Text>
                </HStack>
              ) : composeAttachments.length > 0 ? (
                <Text fontSize="xs" color="green.600" fontWeight="500">
                  ✅ {composeAttachments.length} fichier(s) - {totalSizeKB} KB - Envoi rapide
                </Text>
              ) : contentType === 'template' ? (
                <Text fontSize="xs" color="green.600" fontWeight="500">
                  📄 Template HTML détecté - Sera envoyé avec styles et structure complets
                </Text>
              ) : contentType === 'html' ? (
                <Text fontSize="xs" color="blue.600" fontWeight="500">
                  🎨 Contenu HTML - Le formatage sera préservé à l'envoi
                </Text>
              ) : (
                <Text fontSize="xs" color="gray.500">
                  💡 Astuce : Ctrl+B (gras), Ctrl+I (italique), Ctrl+U (souligné)
                </Text>
              )}
            </Box>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onClose} size="md" isDisabled={isSending}>
                Annuler
              </Button>
              <Button 
                colorScheme="rbe"
                leftIcon={<FiSend />}
                onClick={handleSend}
                isLoading={isSending}
                loadingText={isLargeAttachment ? "Transmission..." : "Envoi..."}
                size="md"
                px={6}
              >
                Envoyer
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});

ComposeModal.displayName = 'ComposeModal';

export default ComposeModal;
