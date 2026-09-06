/**
 * MarkdownEditor.jsx
 * Éditeur de texte avec support markdown
 * - Détecte la sélection de texte
 * - Affiche un menu markdown avec raccourcis
 * - Insère la syntaxe markdown
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Textarea,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  Button,
  HStack,
  VStack,
  Text,
  Divider,
  Tooltip,
  useColorModeValue
} from '@chakra-ui/react';
import {
  FiBold,
  FiItalic,
  FiMinus,
  FiLink,
  FiHash,
  FiCode,
  FiList,
  FiImage
} from 'react-icons/fi';

export default function MarkdownEditor({ value, onChange, media = [], placeholder = 'Entrez votre contenu en markdown...' }) {
  const textareaRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Détecter la sélection de texte
  const handleTextSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const hasSelection = start !== end;

    if (hasSelection) {
      // Calculer la position du menu
      const selectedText = textarea.value.substring(start, end);
      const rect = textarea.getBoundingClientRect();

      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
  });

  // Appliquer une syntaxe markdown
  const applyMarkdown = useCallback((before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    const newText = `${beforeText}${before}${selectedText}${after}${afterText}`;
    onChange({ target: { value: newText } });

    // Replacer le curseur
    setShowMenu(false);
    setTimeout(() => {
      textarea.focus();
      const newStart = start + before.length;
      textarea.setSelectionRange(newStart, newStart + selectedText.length);
    }, 0);
  });

  const markdownOptions = [
    {
      label: 'Gras',
      icon: FiBold,
      apply: () => applyMarkdown('**', '**'),
      tooltip: 'Ctrl+B'
    },
    {
      label: 'Italique',
      icon: FiItalic,
      apply: () => applyMarkdown('*', '*'),
      tooltip: 'Ctrl+I'
    },
    {
      label: 'Tiret',
      icon: FiMinus,
      apply: () => applyMarkdown('~~', '~~'),
      tooltip: 'Barrer le texte'
    },
    {
      label: 'Lien',
      icon: FiLink,
      apply: () => applyMarkdown('[', '](url)'),
      tooltip: 'Lien externe'
    },
    {
      label: 'Code',
      icon: FiCode,
      apply: () => applyMarkdown('`', '`'),
      tooltip: 'Code inline'
    }
  ];

  const headingOptions = [
    { level: 1, label: 'H1' },
    { level: 2, label: 'H2' },
    { level: 3, label: 'H3' }
  ];

  const listOptions = [
    { type: 'ul', label: 'Liste', symbol: '- ' },
    { type: 'ol', label: 'Numérotée', symbol: '1. ' }
  ];

  const insertMedia = useCallback((item) => {
    const textarea = textareaRef.current;
    if (!textarea || item.type !== 'image') return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const alt = item.caption || item.originalName || 'Image RétroBus Essonne';
    const imageMarkdown = `![${alt}](${item.url})`;
    const newText = `${textarea.value.substring(0, start)}${imageMarkdown}${textarea.value.substring(end)}`;

    onChange({ target: { value: newText } });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
    }, 0);
  }, [onChange]);

  return (
    <Box>
      {/* Info sur le markdown */}
      <Text fontSize="xs" color="gray.500" mb={2}>
        💡 Sélectionnez du texte pour activer le menu markdown
      </Text>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onSelect={handleTextSelection}
        onMouseUp={handleTextSelection}
        onKeyUp={handleTextSelection}
        placeholder={placeholder}
        minH="200px"
        fontFamily="monospace"
        fontSize="sm"
        border="1px"
        borderColor={borderColor}
        _focus={{
          outline: 'none',
          borderColor: 'rbe.500',
          boxShadow: '0 0 0 1px rbe.500'
        }}
      />

      {media.some((item) => item.type === 'image' && item.url) && (
        <Box mt={3} p={3} bg="gray.50" borderWidth="1px" borderColor={borderColor} borderRadius="md">
          <Text fontSize="xs" fontWeight="700" mb={2}>Placer une image dans l'article</Text>
          <HStack spacing={2} wrap="wrap">
            {media.filter((item) => item.type === 'image' && item.url).map((item, index) => (
              <Button
                key={`${item.url}-${index}`}
                size="xs"
                variant="outline"
                leftIcon={<FiImage />}
                onClick={() => insertMedia(item)}
              >
                {item.caption || `Image ${index + 1}`}
              </Button>
            ))}
          </HStack>
        </Box>
      )}

      {/* Menu contextuel markdown */}
      {showMenu && (
        <Box
          position="fixed"
          top={`${menuPosition.y}px`}
          left={`${menuPosition.x}px`}
          transform="translateX(-50%)"
          zIndex={1000}
          bg={bgColor}
          borderRadius="lg"
          boxShadow="0 4px 12px rgba(0,0,0,0.15)"
          border="1px"
          borderColor={borderColor}
          p={3}
          minW="400px"
          maxW="500px"
        >
          {/* Boutons principales */}
          <VStack align="stretch" spacing={2}>
            <HStack spacing={1}>
              {markdownOptions.map((opt) => (
                <Tooltip key={opt.label} label={opt.tooltip}>
                  <Button
                    size="sm"
                    leftIcon={<opt.icon />}
                    onClick={opt.apply}
                    variant="ghost"
                    fontSize="xs"
                  >
                    {opt.label}
                  </Button>
                </Tooltip>
              ))}
            </HStack>

            <Divider />

            {/* Headings */}
            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1}>Titres</Text>
              <HStack spacing={1}>
                {headingOptions.map((h) => (
                  <Button
                    key={h.level}
                    size="sm"
                    onClick={() => {
                      const textarea = textareaRef.current;
                      const start = textarea.selectionStart;
                      const beforeText = textarea.value.substring(0, start);
                      const lastNewline = beforeText.lastIndexOf('\n');
                      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
                      
                      const end = textarea.selectionEnd;
                      const selectedText = textarea.value.substring(start, end);
                      const afterText = textarea.value.substring(end);
                      
                      const prefix = '#'.repeat(h.level) + ' ';
                      const newText = `${textarea.value.substring(0, lineStart)}${prefix}${selectedText}${afterText}`;
                      onChange({ target: { value: newText } });
                      setShowMenu(false);
                    }}
                    variant="ghost"
                    fontSize="xs"
                  >
                    {h.label}
                  </Button>
                ))}
              </HStack>
            </Box>

            {/* Lists */}
            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1}>Listes</Text>
              <HStack spacing={1}>
                {listOptions.map((list) => (
                  <Button
                    key={list.type}
                    size="sm"
                    onClick={() => {
                      const textarea = textareaRef.current;
                      const start = textarea.selectionStart;
                      const selectedText = textarea.value.substring(start, textarea.selectionEnd);
                      applyMarkdown(list.symbol, '');
                    }}
                    variant="ghost"
                    fontSize="xs"
                  >
                    {list.label}
                  </Button>
                ))}
              </HStack>
            </Box>

            <Text fontSize="xs" color="gray.500" mt={2}>
              Markdown supporté: **gras** *italique* ~~barré~~ [lien](url) `code` # H1 - liste
            </Text>
          </VStack>
        </Box>
      )}
    </Box>
  );
}
