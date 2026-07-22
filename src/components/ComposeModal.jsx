/**
 * Modal de composition d'email optimisé avec éditeur WYSIWYG
 * Édition visuelle sans voir le code HTML - accessible à tous
 */

import React, { memo, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Button, FormControl, FormLabel, Input,
  VStack, HStack, IconButton, Card, CardBody, Text, Flex, useToast,
  Collapse, Badge, Tooltip,
  ButtonGroup, Divider, Box, useColorModeValue, useBreakpointValue, Image, Menu, MenuButton, MenuList, MenuItem,
  useDisclosure, Spinner, Alert, AlertIcon, Checkbox, Textarea
} from '@chakra-ui/react';
import { 
  FiSend, FiPaperclip, FiX, FiFileText, FiBold, FiItalic, FiUnderline,
  FiList, FiLink, FiImage, FiCode, FiEye, FiType, FiChevronDown, FiMaximize2, FiEdit, FiEdit2,
  FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiCpu, FiMinimize2, FiMinus
} from 'react-icons/fi';
import { fetchWithCSRF } from '../lib/csrfClient.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseRecipients = (value) => String(value || '')
  .split(/[;,\n\r]+/)
  .map((recipient) => recipient.trim())
  .filter(Boolean);

const hasMessageContent = (value) => String(value || '')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .trim().length > 0;

const normalizeContactSearch = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('fr-FR');

function RecipientField({ value, onChange, placeholder, ariaLabel, contacts = [] }) {
  const [pendingRecipient, setPendingRecipient] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const recipients = useMemo(() => parseRecipients(value), [value]);
  const normalizedRecipients = useMemo(
    () => new Set(recipients.map((recipient) => recipient.toLocaleLowerCase('fr-FR'))),
    [recipients]
  );
  const candidate = pendingRecipient.trim();
  const canAddCandidate = EMAIL_PATTERN.test(candidate) && !normalizedRecipients.has(candidate.toLocaleLowerCase('fr-FR'));
  const matchingContacts = useMemo(() => {
    const query = normalizeContactSearch(candidate);
    if (!query) return [];

    const keywords = query.split(/\s+/).filter(Boolean);

    return contacts.filter((contact) => {
      if (normalizedRecipients.has(contact.email.toLocaleLowerCase('fr-FR'))) return false;
      const searchableContact = `${normalizeContactSearch(contact.name)} ${normalizeContactSearch(contact.email)}`;
      return keywords.every((keyword) => searchableContact.includes(keyword));
    }).slice(0, 6);
  }, [candidate, contacts, normalizedRecipients]);

  const emitRecipients = useCallback((nextRecipients) => {
    onChange({ target: { value: nextRecipients.join(', ') } });
  }, [onChange]);

  const addRecipient = useCallback((recipient = candidate) => {
    const nextRecipient = recipient.trim();
    if (!EMAIL_PATTERN.test(nextRecipient)) return;
    if (!normalizedRecipients.has(nextRecipient.toLocaleLowerCase('fr-FR'))) {
      emitRecipients([...recipients, nextRecipient]);
    }
    setPendingRecipient('');
  }, [candidate, emitRecipients, normalizedRecipients, recipients]);

  const removeRecipient = useCallback((recipientToRemove) => {
    emitRecipients(recipients.filter((recipient) => recipient !== recipientToRemove));
  }, [emitRecipients, recipients]);

  const handlePendingChange = useCallback((event) => {
    const nextValue = event.target.value;
    if (/[;,\n\r]/.test(nextValue)) {
      const uniqueRecipients = parseRecipients(nextValue).filter((recipient) =>
        EMAIL_PATTERN.test(recipient) && !normalizedRecipients.has(recipient.toLocaleLowerCase('fr-FR'))
      );
      if (uniqueRecipients.length > 0) emitRecipients([...recipients, ...uniqueRecipients]);
      setPendingRecipient('');
      return;
    }

    if (EMAIL_PATTERN.test(nextValue.trim())) {
      addRecipient(nextValue);
      return;
    }

    setPendingRecipient(nextValue);
  }, [addRecipient, emitRecipients, normalizedRecipients, recipients]);

  const addContact = useCallback((contact) => {
    addRecipient(contact.email);
  }, [addRecipient]);

  return (
    <Box flex={1} minW={0} position="relative">
      <Flex
        minH="34px"
        gap={1}
        align="center"
        flexWrap="wrap"
        px={2}
        py={1}
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
        bg="white"
        _focusWithin={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)' }}
      >
        {recipients.map((recipient) => (
          <Flex key={recipient} align="center" gap={1} px={2} py={0.5} bg="blue.100" color="blue.900" borderRadius="md" maxW="100%">
            <Text fontSize="xs" noOfLines={1}>{recipient}</Text>
            <IconButton
              icon={<FiX />}
              aria-label={`Retirer ${recipient}`}
              size="2xs"
              variant="ghost"
              minW="16px"
              h="16px"
              onClick={() => removeRecipient(recipient)}
            />
          </Flex>
        ))}
        <Input
          value={pendingRecipient}
          onChange={handlePendingChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            addRecipient();
          }}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === 'Tab') && candidate) {
              event.preventDefault();
              const exactContact = matchingContacts.find((contact) =>
                contact.name.toLocaleLowerCase('fr-FR') === candidate.toLocaleLowerCase('fr-FR') ||
                contact.email.toLocaleLowerCase('fr-FR') === candidate.toLocaleLowerCase('fr-FR')
              );
              if (exactContact) addContact(exactContact);
              else addRecipient();
            }
            if (event.key === 'Backspace' && !pendingRecipient && recipients.length > 0) {
              removeRecipient(recipients[recipients.length - 1]);
            }
          }}
          type="text"
          inputMode="email"
          placeholder={recipients.length === 0 ? placeholder : 'Ajouter une adresse'}
          aria-label={ariaLabel}
          autoComplete="off"
          variant="unstyled"
          minW="160px"
          flex="1"
          fontSize="sm"
        />
      </Flex>
      {isFocused && matchingContacts.length > 0 && (
        <Box
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          zIndex="dropdown"
          w="100%"
          bg="white"
          boxShadow="md"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
        >
          {matchingContacts.map((contact) => (
            <Button
              key={contact.id}
              w="100%"
              h="auto"
              minH="40px"
              justifyContent="flex-start"
              px={3}
              py={2}
              borderRadius={0}
              variant="ghost"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addContact(contact)}
            >
              <Text fontSize="sm" noOfLines={1}>{contact.name} - {contact.email}</Text>
            </Button>
          ))}
        </Box>
      )}
      {isFocused && matchingContacts.length === 0 && canAddCandidate && (
        <Button
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          zIndex="dropdown"
          w="100%"
          justifyContent="flex-start"
          size="sm"
          variant="outline"
          bg="white"
          boxShadow="md"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => addRecipient()}
        >
          Ajouter « {candidate} »
        </Button>
      )}
    </Box>
  );
}

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
  onOpenTemplateEditor,
  conversationContext,
  conversationMessages = [],
  contacts = []
}) => {
  const toast = useToast();
  const editorRef = useRef(null);
  const updateTimerRef = useRef(null);
  
  // États locaux pour fonctionnalités avancées
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isPopupMode, setIsPopupMode] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // États pour l'amélioration IA
  const { isOpen: isAiOpen, onOpen: onAiOpen, onClose: onAiClose } = useDisclosure();
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [improvedText, setImprovedText] = useState('');
  const [aiError, setAiError] = useState('');
  const [includeConversation, setIncludeConversation] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [additionalAiContext, setAdditionalAiContext] = useState('');
  
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const toolbarBg = useColorModeValue('gray.50', 'gray.700');
  const previewBg = useColorModeValue('white', 'gray.800');
  const isMobile = useBreakpointValue({ base: true, md: false }) || false;

  useEffect(() => {
    if (!isOpen) {
      setIsMinimized(false);
      setIsPopupMode(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (composeCc) setShowCc(true);
    if (composeBcc) setShowBcc(true);
  }, [composeBcc, composeCc]);

  // Synchroniser l'éditeur avec le brouillon chargé ou modifié.
  useEffect(() => {
    if (!editorRef.current || !isOpen) return;

    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    const nextBody = composeBody || '';
    if (editorRef.current.innerHTML !== nextBody) {
      editorRef.current.innerHTML = nextBody;
    }
  }, [composeBody, isOpen]);

  // Cleanup du timer au démontage
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Garder l'éditeur natif fluide, puis synchroniser React après une pause de saisie.
  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }

      updateTimerRef.current = setTimeout(() => {
        const html = editorRef.current.innerHTML;
        onComposeBodyChange({ target: { value: html } });
        updateTimerRef.current = null;
      }, 500);
    }
  }, [onComposeBodyChange]);

  const handleClose = useCallback(() => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    const html = editorRef.current?.innerHTML ?? composeBody;
    onComposeBodyChange({ target: { value: html } });
    onClose(html);
  }, [composeBody, onClose, onComposeBodyChange]);

  // Calculer la taille totale des pièces jointes
  const totalAttachmentSize = composeAttachments.reduce((sum, att) => sum + (att.size || 0), 0);
  const totalSizeMB = (totalAttachmentSize / (1024 * 1024)).toFixed(2);
  const totalSizeKB = (totalAttachmentSize / 1024).toFixed(0);
  const isLargeAttachment = totalAttachmentSize > 2 * 1024 * 1024;
  const textAttachments = useMemo(() => composeAttachments.filter((attachment) => {
    const filename = String(attachment.filename || '').toLowerCase();
    const contentType = String(attachment.contentType || '').toLowerCase();
    return contentType.startsWith('text/') ||
      contentType === 'application/json' ||
      /\.(txt|md|csv|json|xml|html?|log)$/i.test(filename);
  }), [composeAttachments]);

  const buildAiContext = useCallback(() => {
    const files = includeAttachments ? textAttachments.slice(0, 5).map((attachment) => {
      try {
        const binary = atob(String(attachment.content || ''));
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        return {
          name: String(attachment.filename || 'document'),
          content: new TextDecoder('utf-8').decode(bytes).slice(0, 12000)
        };
      } catch {
        return null;
      }
    }).filter(Boolean) : [];

    return {
      instructions: additionalAiContext.trim(),
      conversation: includeConversation ? conversationContext : undefined,
      conversationMessages: includeConversation ? conversationMessages : [],
      files
    };
  }, [additionalAiContext, conversationContext, conversationMessages, includeAttachments, includeConversation, textAttachments]);

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

  // Nouvelles fonctions d'édition avancées
  const setFontFamily = useCallback((font) => {
    execCommand('fontName', font);
  }, [execCommand]);

  const setFontSize = useCallback((size) => {
    execCommand('fontSize', size);
  }, [execCommand]);

  const setTextAlign = useCallback((align) => {
    execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`);
  }, [execCommand]);

  const setHighlightColor = useCallback((color) => {
    execCommand('backColor', color);
  }, [execCommand]);

  const insertImage = useCallback(() => {
    const url = prompt('URL de l\'image :');
    if (url) {
      const img = `<img src="${url}" style="max-width: 100%; height: auto; border-radius: 8px;" alt="Image" />`;
      execCommand('insertHTML', img);
    }
  }, [execCommand]);

  // Appliquer la police par défaut au chargement et à chaque ouverture.
  useEffect(() => {
    if (isOpen && editorRef.current && mailFont) {
      editorRef.current.style.fontFamily = mailFont;
    }
  }, [isOpen, mailFont]);

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

  // Amélioration du texte avec l'IA
  const handleAiImprove = useCallback(async () => {
    if (!editorRef.current) return;
    
    // Récupérer le texte sélectionné ou tout le contenu
    const selection = window.getSelection();
    let textToImprove = '';
    
    if (selection && selection.toString().trim()) {
      textToImprove = selection.toString();
    } else {
      // Récupérer le texte sans les balises HTML
      textToImprove = editorRef.current.innerText || editorRef.current.textContent;
    }
    
    if (!textToImprove.trim()) {
      toast({
        title: "Aucun texte à améliorer",
        description: "Écrivez du texte ou sélectionnez une portion à améliorer",
        status: "warning",
        duration: 3000
      });
      return;
    }
    
    setOriginalText(textToImprove);
    setImprovedText('');
    setAiError('');
    setIsAiProcessing(true);
    onAiOpen();
    
    try {
      const response = await fetchWithCSRF('/api/mail/improve-text', {
        method: 'POST',
        body: JSON.stringify({ text: textToImprove, context: buildAiContext() })
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de l'amélioration du texte");
      }
      
      const data = await response.json();
      setImprovedText(data.improvedText || data.text);
    } catch (error) {
      console.error('Erreur amélioration IA:', error);
      setAiError(error.message || 'Une erreur est survenue');
      toast({
        title: "Erreur",
        description: "Impossible d'améliorer le texte pour le moment",
        status: "error",
        duration: 4000
      });
    } finally {
      setIsAiProcessing(false);
    }
  }, [buildAiContext, toast, onAiOpen]);

  // Appliquer le texte amélioré
  const applyImprovedText = useCallback(() => {
    if (editorRef.current && improvedText) {
      // Convertir les retours à la ligne en <br>
      const htmlText = improvedText.replace(/\n/g, '<br>');
      
      // Vérifier s'il y avait une sélection
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        // Remplacer la sélection
        document.execCommand('insertHTML', false, htmlText);
      } else {
        // Remplacer tout le contenu
        editorRef.current.innerHTML = htmlText;
      }
      
      handleEditorInput();
      onAiClose();
      
      toast({
        title: "✨ Texte amélioré appliqué",
        status: "success",
        duration: 2000
      });
    }
  }, [improvedText, handleEditorInput, onAiClose, toast]);

  // Retravailler le texte (relancer l'amélioration)
  const reworkText = useCallback(async () => {
    if (!improvedText) return;
    
    setOriginalText(improvedText);
    setImprovedText('');
    setAiError('');
    setIsAiProcessing(true);
    
    try {
      const response = await fetchWithCSRF('/api/mail/improve-text', {
        method: 'POST',
        body: JSON.stringify({ text: improvedText, context: buildAiContext() })
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors du retraitement');
      }
      
      const data = await response.json();
      setImprovedText(data.improvedText || data.text);
    } catch (error) {
      console.error('Erreur retraitement IA:', error);
      setAiError(error.message || 'Une erreur est survenue');
    } finally {
      setIsAiProcessing(false);
    }
  }, [buildAiContext, improvedText]);

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
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    const currentBody = editorRef.current?.innerHTML ?? composeBody;
    onComposeBodyChange({ target: { value: currentBody } });
    const hasContent = composeSubject.trim() || hasMessageContent(currentBody) || composeAttachments.length > 0;

    if (!composeTo.trim() || !hasContent) {
      toast({
        title: "Champs requis",
        description: "Ajoutez un destinataire et un objet, un message ou une pièce jointe",
        status: "warning",
        duration: 3000
      });
      return;
    }
    onSendEmail(currentBody);
  }, [composeAttachments.length, composeBody, composeSubject, composeTo, onComposeBodyChange, onSendEmail, toast]);

  return (
    <>
    <Modal
      isOpen={isOpen && !isMinimized}
      onClose={handleClose}
      isCentered={isPopupMode}
      trapFocus={isPopupMode || isMobile}
      blockScrollOnMount={isPopupMode || isMobile}
      closeOnOverlayClick={false}
      scrollBehavior="inside"
    >
      <ModalOverlay bg={isPopupMode || isMobile ? 'blackAlpha.300' : 'transparent'} pointerEvents={isPopupMode || isMobile ? 'auto' : 'none'} />
      <ModalContent
        position={{ base: 'fixed', md: isPopupMode ? 'relative' : 'fixed' }}
        right={{ base: 0, md: isPopupMode ? 'auto' : 6 }}
        bottom={{ base: 0, md: isPopupMode ? 'auto' : 0 }}
        m={{ base: 0, md: isPopupMode ? 'auto' : 0 }}
        w={{ base: '100vw', md: isPopupMode ? 'min(760px, calc(100vw - 48px))' : 'min(620px, calc(100vw - 24px))' }}
        maxW="none"
        h={{ base: '100dvh', md: isPopupMode ? 'min(780px, calc(100dvh - 96px))' : 'min(720px, calc(100dvh - 24px))' }}
        maxH="100dvh"
        borderRadius={{ base: 0, md: isPopupMode ? 'md' : '8px 8px 0 0' }}
        boxShadow={{ base: 'none', md: '2xl' }}
      >
        <ModalHeader py={{ base: 3, md: 4 }} pr={{ base: 12, md: 14 }}>
          <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={3} direction={{ base: 'column', md: 'row' }}>
            <HStack spacing={2} wrap="wrap">
              <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="600">✉️ Nouveau message</Text>
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
            <HStack spacing={2} display={{ base: 'none', md: 'flex' }}>
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
              <Tooltip label={isPopupMode ? "Revenir à la fenêtre compacte" : "Ouvrir en popup"}>
                <IconButton
                  icon={isPopupMode ? <FiMinimize2 /> : <FiMaximize2 />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsPopupMode(!isPopupMode)}
                  aria-label="Basculer le mode popup"
                />
              </Tooltip>
              <Tooltip label="Réduire le brouillon">
                <IconButton
                  icon={<FiMinus />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsMinimized(true)}
                  aria-label="Réduire le brouillon"
                />
              </Tooltip>
              <Tooltip label="Fermer le brouillon">
                <IconButton
                  icon={<FiX />}
                  size="sm"
                  variant="ghost"
                  onClick={handleClose}
                  aria-label="Fermer le brouillon"
                />
              </Tooltip>
            </HStack>
          </Flex>
        </ModalHeader>
        <ModalBody overflowY="auto" px={{ base: 3, md: 6 }} py={{ base: 2, md: 4 }}>
          <VStack spacing={3} align="stretch">
            {/* Destinataires */}
            <VStack spacing={2} align="stretch">
              <FormControl>
                <Flex gap={2} align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
                  <FormLabel mb={0} minW={{ base: 'auto', md: '80px' }}>À :</FormLabel>
                  <RecipientField
                    value={composeTo}
                    onChange={onComposeToChange}
                    placeholder="destinataire@example.com"
                    ariaLabel="Destinataires"
                    contacts={contacts}
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
                      Cci
                    </Button>
                  </HStack>
                </Flex>
              </FormControl>

              <Collapse in={showCc}>
                <FormControl>
                  <Flex gap={2} align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
                    <FormLabel mb={0} minW={{ base: 'auto', md: '80px' }}>Cc :</FormLabel>
                    <RecipientField
                      value={composeCc}
                      onChange={onComposeCcChange}
                      placeholder="copie@example.com"
                      ariaLabel="Destinataires en copie"
                      contacts={contacts}
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
                  </Flex>
                </FormControl>
              </Collapse>

              <Collapse in={showBcc}>
                <FormControl>
                  <Flex gap={2} align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
                    <FormLabel mb={0} minW={{ base: 'auto', md: '80px' }}>Cci :</FormLabel>
                    <RecipientField
                      value={composeBcc}
                      onChange={onComposeBccChange}
                      placeholder="copie-cachee@example.com"
                      ariaLabel="Destinataires en copie cachée (Cci)"
                      contacts={contacts}
                    />
                    <IconButton
                      icon={<FiX />}
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setShowBcc(false);
                        onComposeBccChange({ target: { value: '' } });
                      }}
                      aria-label="Masquer Cci"
                    />
                  </Flex>
                </FormControl>
              </Collapse>

              <FormControl>
                <Flex gap={2} align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
                  <FormLabel mb={0} minW={{ base: 'auto', md: '80px' }}>Objet :</FormLabel>
                  <Input 
                    placeholder="Objet du message"
                    value={composeSubject}
                    onChange={onComposeSubjectChange}
                    autoComplete="off"
                    size="sm"
                    flex={1}
                    fontWeight="500"
                  />
                </Flex>
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
                <Flex gap={{ base: 1, md: 2 }} wrap="wrap" align="center">
                  {/* Police et taille */}
                  <Menu>
                    <Tooltip label="Police">
                      <MenuButton as={Button} size="sm" variant="outline" rightIcon={<FiChevronDown />} fontSize="xs">
                        {mailFont || 'Arial'}
                      </MenuButton>
                    </Tooltip>
                    <MenuList maxH="300px" overflowY="auto">
                      {['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Comic Sans MS', 'Trebuchet MS', 'Calibri', 'Roboto'].map(font => (
                        <MenuItem key={font} onClick={() => setFontFamily(font)} fontFamily={font}>
                          {font}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </Menu>

                  <Menu>
                    <Tooltip label="Taille">
                      <MenuButton as={Button} size="sm" variant="outline" rightIcon={<FiChevronDown />}>
                        A
                      </MenuButton>
                    </Tooltip>
                    <MenuList>
                      <MenuItem onClick={() => setFontSize('1')}>Très petit</MenuItem>
                      <MenuItem onClick={() => setFontSize('2')}>Petit</MenuItem>
                      <MenuItem onClick={() => setFontSize('3')}>Normal</MenuItem>
                      <MenuItem onClick={() => setFontSize('4')}>Grand</MenuItem>
                      <MenuItem onClick={() => setFontSize('5')}>Très grand</MenuItem>
                      <MenuItem onClick={() => setFontSize('6')}>Énorme</MenuItem>
                    </MenuList>
                  </Menu>

                  <Divider orientation="vertical" h="24px" />

                  {/* Formatage de base */}
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

                  {/* Alignement */}
                  <ButtonGroup size="sm" isAttached variant="outline">
                    <Tooltip label="Aligner à gauche">
                      <IconButton
                        icon={<FiAlignLeft />}
                        onClick={() => setTextAlign('left')}
                        aria-label="Gauche"
                      />
                    </Tooltip>
                    <Tooltip label="Centrer">
                      <IconButton
                        icon={<FiAlignCenter />}
                        onClick={() => setTextAlign('center')}
                        aria-label="Centre"
                      />
                    </Tooltip>
                    <Tooltip label="Aligner à droite">
                      <IconButton
                        icon={<FiAlignRight />}
                        onClick={() => setTextAlign('right')}
                        aria-label="Droite"
                      />
                    </Tooltip>
                    <Tooltip label="Justifier">
                      <IconButton
                        icon={<FiAlignJustify />}
                        onClick={() => setTextAlign('full')}
                        aria-label="Justifié"
                      />
                    </Tooltip>
                  </ButtonGroup>

                  <Divider orientation="vertical" h="24px" />

                  {/* Listes */}
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

                  {/* Insertion */}
                  <Tooltip label="Insérer un lien">
                    <IconButton
                      size="sm"
                      icon={<FiLink />}
                      onClick={insertLink}
                      variant="outline"
                      aria-label="Lien"
                    />
                  </Tooltip>

                  <Tooltip label="Insérer une image">
                    <IconButton
                      size="sm"
                      icon={<FiImage />}
                      onClick={insertImage}
                      variant="outline"
                      aria-label="Image"
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

                  {/* Titres */}
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

                  <Divider orientation="vertical" h="24px" />

                  {/* Couleurs */}
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
                      <MenuItem onClick={() => setTextColor('#666666')}>⚪ Gris</MenuItem>
                    </MenuList>
                  </Menu>

                  <Menu>
                    <Tooltip label="Surligner le texte">
                      <MenuButton as={Button} size="sm" variant="outline" rightIcon={<FiChevronDown />}>
                        ✨
                      </MenuButton>
                    </Tooltip>
                    <MenuList>
                      <MenuItem onClick={() => setHighlightColor('transparent')}>❌ Aucun</MenuItem>
                      <MenuItem onClick={() => setHighlightColor('#FFFF00')}>🟡 Jaune</MenuItem>
                      <MenuItem onClick={() => setHighlightColor('#00FF00')}>🟢 Vert</MenuItem>
                      <MenuItem onClick={() => setHighlightColor('#00FFFF')}>🔵 Cyan</MenuItem>
                      <MenuItem onClick={() => setHighlightColor('#FF00FF')}>🟣 Magenta</MenuItem>
                      <MenuItem onClick={() => setHighlightColor('#FFB6C1')}>🌸 Rose</MenuItem>
                      <MenuItem onClick={() => setHighlightColor('#FFA500')}>🟠 Orange</MenuItem>
                    </MenuList>
                  </Menu>

                  <Divider orientation="vertical" h="24px" />

                  {/* Signature */}
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

                  <Divider orientation="vertical" h="24px" />

                  {/* Amélioration IA */}
                  <Tooltip label="Améliorer le texte avec l'IA">
                    <Button
                      size="sm"
                      leftIcon={<FiCpu />}
                      onClick={handleAiImprove}
                      variant="outline"
                      colorScheme="blue"
                      isDisabled={!composeBody || composeBody.trim() === ''}
                    >
                      🤖 IA
                    </Button>
                  </Tooltip>

                  <Text fontSize="xs" color="gray.500" ml={{ base: 0, md: 'auto' }} w={{ base: '100%', md: 'auto' }}>
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
                minH={{ base: '38dvh', md: '300px' }}
                p={{ base: 3, md: 4 }}
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
              <HStack justify="space-between" mt={2} wrap="wrap">
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
                          <Flex gap={3} align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
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

        <ModalFooter borderTop="1px solid" borderColor={borderColor} px={{ base: 3, md: 6 }} py={{ base: 3, md: 4 }}>
          <Flex gap={3} w="100%" justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
            <Box display={{ base: 'none', md: 'block' }}>
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
            <HStack spacing={3} justify={{ base: 'stretch', md: 'flex-end' }}>
              <Button variant="ghost" onClick={handleClose} size={{ base: 'sm', md: 'md' }} isDisabled={isSending} flex={{ base: 1, md: 'initial' }}>
                Annuler
              </Button>
              <Button 
                colorScheme="rbe"
                leftIcon={<FiSend />}
                onClick={handleSend}
                isLoading={isSending}
                loadingText={isLargeAttachment ? "Transmission..." : "Envoi..."}
                size={{ base: 'sm', md: 'md' }}
                px={{ base: 4, md: 6 }}
                flex={{ base: 1, md: 'initial' }}
              >
                Envoyer
              </Button>
            </HStack>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {isOpen && isMinimized && (
      <Flex
        position="fixed"
        right={{ base: 0, md: 6 }}
        bottom={0}
        w={{ base: '100vw', md: 'min(360px, calc(100vw - 24px))' }}
        h="48px"
        px={3}
        align="center"
        justify="space-between"
        bg="#0f172a"
        color="white"
        borderRadius={{ base: 0, md: '8px 8px 0 0' }}
        boxShadow="2xl"
        zIndex="modal"
      >
        <Button
          variant="unstyled"
          display="flex"
          alignItems="center"
          gap={2}
          minW={0}
          flex={1}
          h="100%"
          onClick={() => setIsMinimized(false)}
          aria-label="Rouvrir le brouillon"
        >
          <FiEdit />
          <Text noOfLines={1} fontSize="sm" fontWeight="600">
            {composeSubject.trim() || 'Nouveau message'}
          </Text>
          {composeBody.trim() && <Badge colorScheme="blue">Brouillon</Badge>}
        </Button>
        <HStack spacing={1} ml={2}>
          <Tooltip label="Rouvrir le brouillon">
            <IconButton
              icon={<FiMaximize2 />}
              size="sm"
              variant="ghost"
              color="white"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => setIsMinimized(false)}
              aria-label="Rouvrir le brouillon"
            />
          </Tooltip>
          <Tooltip label="Fermer le brouillon">
            <IconButton
              icon={<FiX />}
              size="sm"
              variant="ghost"
              color="white"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={handleClose}
              aria-label="Fermer le brouillon"
            />
          </Tooltip>
        </HStack>
      </Flex>
    )}

    {/* Modal d'amélioration IA */}
    <Modal isOpen={isAiOpen} onClose={onAiClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <HStack spacing={2}>
            <FiCpu size={24} />
            <Text>🤖 Amélioration du texte par IA</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {aiError && (
              <Alert status="error">
                <AlertIcon />
                {aiError}
              </Alert>
            )}

            <Box border="1px solid" borderColor="blue.100" bg="blue.50" borderRadius="md" p={3}>
              <VStack align="stretch" spacing={3}>
                <Text fontSize="sm" fontWeight="600" color="blue.800">
                  Contexte transmis pour cette amélioration
                </Text>
                {conversationContext && (
                  <Checkbox
                    isChecked={includeConversation}
                    onChange={(event) => setIncludeConversation(event.target.checked)}
                    colorScheme="blue"
                    fontSize="sm"
                  >
                    Inclure le message ouvert et {conversationMessages.length} autre(s) message(s) du fil
                  </Checkbox>
                )}
                {textAttachments.length > 0 && (
                  <Checkbox
                    isChecked={includeAttachments}
                    onChange={(event) => setIncludeAttachments(event.target.checked)}
                    colorScheme="blue"
                    fontSize="sm"
                  >
                    Lire {textAttachments.length} pièce(s) jointe(s) textuelle(s)
                  </Checkbox>
                )}
                {!conversationContext && textAttachments.length === 0 && (
                  <Text fontSize="xs" color="blue.700">
                    Aucun message du fil ou fichier textuel n&apos;est disponible pour cette rédaction.
                  </Text>
                )}
                <FormControl>
                  <FormLabel fontSize="xs" mb={1}>Contexte ou consigne complémentaire</FormLabel>
                  <Textarea
                    value={additionalAiContext}
                    onChange={(event) => setAdditionalAiContext(event.target.value)}
                    placeholder="Ex. Ton formel, réponse à un adhérent, rappeler le rendez-vous de mardi."
                    size="sm"
                    resize="vertical"
                    maxLength={4000}
                    bg="white"
                  />
                </FormControl>
                <Text fontSize="xs" color="blue.700">
                  Seuls les fichiers texte, CSV, JSON, Markdown, XML, HTML et journal sont lus. Les images, PDF et documents Office restent exclus.
                </Text>
              </VStack>
            </Box>
            
            <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
              {/* Texte original */}
              <Box flex={1}>
                <VStack align="stretch" spacing={2}>
                  <HStack>
                    <Badge colorScheme="gray">Original</Badge>
                    <Text fontSize="sm" color="gray.500">
                      {originalText.length} caractères
                    </Text>
                  </HStack>
                  <Box
                    p={4}
                    bg="gray.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                    minH="200px"
                    maxH="400px"
                    overflowY="auto"
                    whiteSpace="pre-wrap"
                    fontSize="sm"
                  >
                    {originalText}
                  </Box>
                </VStack>
              </Box>

              {/* Flèche */}
              <Flex align="center" justify="center" display={{ base: 'none', md: 'flex' }}>
                <Text fontSize="2xl" color="blue.500">→</Text>
              </Flex>

              {/* Texte amélioré */}
              <Box flex={1}>
                <VStack align="stretch" spacing={2}>
                  <HStack>
                    <Badge colorScheme="blue">Amélioré</Badge>
                    {improvedText && (
                      <Text fontSize="sm" color="gray.500">
                        {improvedText.length} caractères
                      </Text>
                    )}
                  </HStack>
                  <Box
                    p={4}
                    bg="blue.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="blue.200"
                    minH="200px"
                    maxH="400px"
                    overflowY="auto"
                    whiteSpace="pre-wrap"
                    fontSize="sm"
                    position="relative"
                  >
                    {isAiProcessing ? (
                      <Flex align="center" justify="center" h="200px">
                        <VStack spacing={3}>
                          <Spinner size="lg" color="blue.500" />
                          <Text color="gray.500">Amélioration en cours...</Text>
                        </VStack>
                      </Flex>
                    ) : improvedText ? (
                      improvedText
                    ) : (
                      <Text color="gray.400">Le texte amélioré apparaîtra ici</Text>
                    )}
                  </Box>
                </VStack>
              </Box>
            </Flex>

            {/* Informations */}
            {improvedText && !isAiProcessing && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1} flex={1}>
                  <Text fontSize="sm" fontWeight="600">
                    💡 Que souhaitez-vous faire ?
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    • <strong>Conserver</strong> : Remplacer votre texte par la version améliorée<br />
                    • <strong>Retravailler</strong> : Améliorer encore ce texte<br />
                    • <strong>Annuler</strong> : Garder votre texte original
                  </Text>
                </VStack>
              </Alert>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3} w="100%" justify="space-between">
            <Button
              variant="ghost"
              onClick={onAiClose}
              size="md"
            >
              ❌ Annuler
            </Button>
            <HStack spacing={2}>
              <Button
                colorScheme="orange"
                onClick={reworkText}
                isDisabled={!improvedText || isAiProcessing}
                isLoading={isAiProcessing}
                leftIcon={<FiCpu />}
                size="md"
              >
                🔄 Retravailler
              </Button>
              <Button
                colorScheme="blue"
                onClick={applyImprovedText}
                isDisabled={!improvedText || isAiProcessing}
                leftIcon={<Text>✨</Text>}
                size="md"
              >
                ✅ Conserver
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </>
  );
});

ComposeModal.displayName = 'ComposeModal';

export default ComposeModal;
