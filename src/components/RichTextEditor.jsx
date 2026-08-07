import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import {
  Box,
  HStack,
  VStack,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  useDisclosure,
  useToast,
  Select,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
} from '@chakra-ui/react';
import {
  FiBold,
  FiItalic,
  FiCode,
  FiType,
  FiList,
  FiLink2,
  FiImage as FiImageIcon,
  FiUnderline,
  FiRefreshCw,
  FiTrash2,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
} from 'react-icons/fi';

export default function RichTextEditor({ value, onChange, minHeight = '300px' }) {
  const toast = useToast();
  const { isOpen: isLinkOpen, onOpen: onLinkOpen, onClose: onLinkClose } = useDisclosure();
  const { isOpen: isImageOpen, onOpen: onImageOpen, onClose: onImageClose } = useDisclosure();
  const [linkUrl, setLinkUrl] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [selectedColor, setSelectedColor] = React.useState('#000000');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'paragraph-class',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'link-class',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'image-class',
          style: 'max-width: 100%; height: auto;',
        },
      }),
      Color,
      TextStyle,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: value || '<p>Commencez à taper...</p>',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const addLink = () => {
    if (!linkUrl) {
      toast({ status: 'error', title: 'URL requise' });
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setLinkUrl('');
    onLinkClose();
  };

  const addImage = () => {
    if (!imageUrl) {
      toast({ status: 'error', title: 'URL image requise' });
      return;
    }
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl('');
    onImageClose();
  };

  const handleColorChange = (color) => {
    editor.chain().focus().setColor(color).run();
    setSelectedColor(color);
  };

  return (
    <VStack align="stretch" spacing={2} w="100%">
      {/* Toolbar */}
      <Box
        borderWidth="1px"
        borderRadius="lg"
        p={2}
        bg="gray.50"
        display="flex"
        flexWrap="wrap"
        gap={1}
      >
        {/* Texte */}
        <Tooltip label="Gras" placement="top">
          <IconButton
            icon={<FiBold />}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            colorScheme={editor.isActive('bold') ? 'blue' : 'gray'}
            variant={editor.isActive('bold') ? 'solid' : 'ghost'}
          />
        </Tooltip>

        <Tooltip label="Italique" placement="top">
          <IconButton
            icon={<FiItalic />}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            colorScheme={editor.isActive('italic') ? 'blue' : 'gray'}
            variant={editor.isActive('italic') ? 'solid' : 'ghost'}
          />
        </Tooltip>

        <Tooltip label="Souligné" placement="top">
          <IconButton
            icon={<FiUnderline />}
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            colorScheme={editor.isActive('strike') ? 'blue' : 'gray'}
            variant={editor.isActive('strike') ? 'solid' : 'ghost'}
          />
        </Tooltip>

        <Tooltip label="Code" placement="top">
          <IconButton
            icon={<FiCode />}
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            colorScheme={editor.isActive('code') ? 'blue' : 'gray'}
            variant={editor.isActive('code') ? 'solid' : 'ghost'}
          />
        </Tooltip>

        <Divider orientation="vertical" h={6} />

        {/* Titres */}
        <Tooltip label="Titre 1" placement="top">
          <IconButton
            icon={<FiType />}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            colorScheme={editor.isActive('heading', { level: 1 }) ? 'blue' : 'gray'}
            variant={editor.isActive('heading', { level: 1 }) ? 'solid' : 'ghost'}
          />
        </Tooltip>

        <Tooltip label="Titre 2" placement="top">
          <IconButton
            icon={<FiType />}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            colorScheme={editor.isActive('heading', { level: 2 }) ? 'blue' : 'gray'}
            variant={editor.isActive('heading', { level: 2 }) ? 'solid' : 'ghost'}
          />
        </Tooltip>

        <Tooltip label="Titre 3" placement="top">
          <IconButton
            icon={<FiType />}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            colorScheme={editor.isActive('heading', { level: 3 }) ? 'blue' : 'gray'}
            variant={editor.isActive('heading', { level: 3 }) ? 'solid' : 'ghost'}
          />
        </Tooltip>

        <Divider orientation="vertical" h={6} />

        {/* Listes */}
        <Tooltip label="Liste à puces" placement="top">
          <IconButton
            icon={<FiList />}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            colorScheme={editor.isActive('bulletList') ? 'blue' : 'gray'}
            variant={editor.isActive('bulletList') ? 'solid' : 'ghost'}
          />
        </Tooltip>

        <Divider orientation="vertical" h={6} />

        {/* Alignement */}
        <Tooltip label="Aligner à gauche" placement="top">
          <IconButton
            icon={<FiAlignLeft />}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            colorScheme={editor.isActive({ textAlign: 'left' }) ? 'blue' : 'gray'}
            variant={editor.isActive({ textAlign: 'left' }) ? 'solid' : 'ghost'}
          />
        </Tooltip>

        <Tooltip label="Centrer" placement="top">
          <IconButton
            icon={<FiAlignCenter />}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            colorScheme={editor.isActive({ textAlign: 'center' }) ? 'blue' : 'gray'}
            variant={editor.isActive({ textAlign: 'center' }) ? 'solid' : 'ghost'}
          />
        </Tooltip>

        <Tooltip label="Aligner à droite" placement="top">
          <IconButton
            icon={<FiAlignRight />}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            colorScheme={editor.isActive({ textAlign: 'right' }) ? 'blue' : 'gray'}
            variant={editor.isActive({ textAlign: 'right' }) ? 'solid' : 'ghost'}
          />
        </Tooltip>

        <Divider orientation="vertical" h={6} />

        {/* Lien */}
        <Tooltip label="Ajouter un lien" placement="top">
          <IconButton
            icon={<FiLink2 />}
            size="sm"
            onClick={onLinkOpen}
            colorScheme={editor.isActive('link') ? 'blue' : 'gray'}
            variant={editor.isActive('link') ? 'solid' : 'ghost'}
          />
        </Tooltip>

        {/* Image */}
        <Tooltip label="Ajouter une image" placement="top">
          <IconButton
            icon={<FiImageIcon />}
            size="sm"
            onClick={onImageOpen}
          />
        </Tooltip>

        {/* Couleur */}
        <Popover placement="bottom">
          <PopoverTrigger>
            <IconButton
              icon={<FiType />}
              size="sm"
              _hover={{ bg: 'gray.200' }}
            />
          </PopoverTrigger>
          <PopoverContent w="auto">
            <PopoverArrow />
            <PopoverBody>
              <HStack spacing={2} flexWrap="wrap">
                {['#000000', '#b91c1c', '#1e40af', '#15803d', '#ea580c', '#7c3aed', '#ec4899'].map(
                  (color) => (
                    <Box
                      key={color}
                      w={6}
                      h={6}
                      bg={color}
                      borderRadius="md"
                      cursor="pointer"
                      onClick={() => handleColorChange(color)}
                      border={selectedColor === color ? '3px solid' : 'none'}
                      borderColor="blue.500"
                      _hover={{ opacity: 0.8 }}
                    />
                  )
                )}
              </HStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>

        <Divider orientation="vertical" h={6} />

        {/* Réinitialiser */}
        <Tooltip label="Effacer la mise en forme" placement="top">
          <IconButton
            icon={<FiRefreshCw />}
            size="sm"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          />
        </Tooltip>

        <Tooltip label="Tout supprimer" placement="top">
          <IconButton
            icon={<FiTrash2 />}
            size="sm"
            onClick={() => editor.chain().focus().clearContent().run()}
            colorScheme="red"
            variant="ghost"
          />
        </Tooltip>
      </Box>

      {/* Editor */}
      <Box
        borderWidth="1px"
        borderRadius="lg"
        p={4}
        minH={minHeight}
        bg="white"
        css={{
          '& .ProseMirror': {
            outline: 'none',
            minHeight: minHeight,
            fontSize: '16px',
            lineHeight: '1.6',
          },
          '& .ProseMirror h1': {
            fontSize: '32px',
            fontWeight: 'bold',
            marginTop: '16px',
            marginBottom: '8px',
          },
          '& .ProseMirror h2': {
            fontSize: '24px',
            fontWeight: 'bold',
            marginTop: '12px',
            marginBottom: '6px',
          },
          '& .ProseMirror h3': {
            fontSize: '20px',
            fontWeight: 'bold',
            marginTop: '10px',
            marginBottom: '4px',
          },
          '& .ProseMirror a': {
            color: '#1e40af',
            textDecoration: 'underline',
            cursor: 'pointer',
          },
          '& .ProseMirror code': {
            backgroundColor: '#f3f4f6',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
          },
          '& .ProseMirror pre': {
            backgroundColor: '#1f2937',
            color: '#f3f4f6',
            padding: '12px',
            borderRadius: '8px',
            overflow: 'auto',
          },
          '& .ProseMirror ul, & .ProseMirror ol': {
            marginLeft: '24px',
          },
          '& .ProseMirror li': {
            marginBottom: '4px',
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>

      {/* Modal Lien */}
      <Modal isOpen={isLinkOpen} onClose={onLinkClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ajouter un lien</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>URL</FormLabel>
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addLink()}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onLinkClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={addLink}>
              Ajouter
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal Image */}
      <Modal isOpen={isImageOpen} onClose={onImageClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ajouter une image</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>URL de l'image</FormLabel>
              <Input
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addImage()}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onImageClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={addImage}>
              Ajouter
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
