/**
 * MediaUploader.jsx
 * Composant d'upload de médias (images/vidéos) pour RétroActus
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Image,
  Text,
  Input,
  IconButton,
  useToast,
  Progress,
  SimpleGrid,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure
} from '@chakra-ui/react';
import { FiUpload, FiX, FiImage, FiVideo, FiTrash2 } from 'react-icons/fi';
import { apiClient } from '../api/config';

export default function MediaUploader({ media = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentCaption, setCurrentCaption] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const fileInputRef = useRef(null);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Type de fichier non supporté',
        description: 'Utilisez JPG, PNG, GIF, WEBP, MP4 ou WEBM',
        status: 'error',
        duration: 3000
      });
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'Taille maximum : 50 MB',
        status: 'error',
        duration: 3000
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('media', file);
      formData.append('caption', currentCaption);

      // Upload with progress tracking
      const response = await fetch(`${apiClient.baseURL}/retro-news/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Échec de l\'upload');
      }

      const data = await response.json();

      // Add to media list
      const newMedia = [...media, data.media];
      onChange(newMedia);

      toast({
        title: 'Upload réussi !',
        status: 'success',
        duration: 2000
      });

      setCurrentCaption('');
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erreur d\'upload',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index) => {
    const newMedia = media.filter((_, i) => i !== index);
    onChange(newMedia);
    toast({
      title: 'Média supprimé',
      status: 'info',
      duration: 2000
    });
  };

  const handleUpdateCaption = (index, caption) => {
    const newMedia = [...media];
    newMedia[index] = { ...newMedia[index], caption };
    onChange(newMedia);
  };

  const openUploadModal = () => {
    setCurrentCaption('');
    setEditingIndex(null);
    onOpen();
  };

  return (
    <Box>
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="sm">
            Médias ({media.length})
          </Text>
          <Button
            leftIcon={<FiUpload />}
            size="sm"
            colorScheme="blue"
            onClick={openUploadModal}
          >
            Ajouter un média
          </Button>
        </HStack>

        {media.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {media.map((item, index) => (
              <Box
                key={index}
                borderWidth="1px"
                borderRadius="md"
                overflow="hidden"
                position="relative"
                _hover={{ boxShadow: 'md' }}
                transition="all 0.2s"
              >
                {item.type === 'image' ? (
                  <Image
                    src={item.url}
                    alt={item.caption || `Media ${index + 1}`}
                    objectFit="cover"
                    h="150px"
                    w="100%"
                  />
                ) : (
                  <Box
                    bg="gray.800"
                    h="150px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <FiVideo size={40} color="white" />
                  </Box>
                )}

                <Box p={2}>
                  <Input
                    placeholder="Légende..."
                    size="sm"
                    value={item.caption || ''}
                    onChange={(e) => handleUpdateCaption(index, e.target.value)}
                  />
                </Box>

                <IconButton
                  icon={<FiTrash2 />}
                  position="absolute"
                  top={2}
                  right={2}
                  size="sm"
                  colorScheme="red"
                  onClick={() => handleRemove(index)}
                  aria-label="Supprimer"
                />
              </Box>
            ))}
          </SimpleGrid>
        )}
      </VStack>

      {/* Upload Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>📸 Ajouter un média</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Fichier (Image ou Vidéo)</FormLabel>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/webm"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Formats : JPG, PNG, GIF, WEBP, MP4, WEBM (max 50 MB)
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Légende (optionnel)</FormLabel>
                <Input
                  placeholder="Description du média..."
                  value={currentCaption}
                  onChange={(e) => setCurrentCaption(e.target.value)}
                  disabled={uploading}
                />
              </FormControl>

              {uploading && (
                <Progress
                  value={uploadProgress}
                  size="sm"
                  colorScheme="blue"
                  w="100%"
                />
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose} mr={3}>
              Annuler
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
