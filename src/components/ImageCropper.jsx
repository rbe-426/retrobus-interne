/**
 * Composant d'upload et crop d'image
 * Permet de sélectionner, recadrer et redimensionner une image
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Button, VStack, HStack, Text, Box, Image, Slider,
  SliderTrack, SliderFilledTrack, SliderThumb, FormLabel, useToast,
  Input, Flex, Badge, IconButton, Tooltip
} from '@chakra-ui/react';
import { FiUpload, FiRotateCw, FiZoomIn, FiZoomOut, FiMove } from 'react-icons/fi';

export default function ImageCropper({
  isOpen,
  onClose,
  onImageCropped,
  title = "Recadrer l'image",
  aspectRatio = 1, // 1 = carré, 16/9 = paysage, etc.
  maxWidth = 400,
  maxHeight = 400,
  outputFormat = 'jpeg', // 'jpeg' ou 'png'
  quality = 0.9
}) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageElement, setImageElement] = useState(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Charger l'image sélectionnée
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier que c'est bien une image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image",
        status: "error",
        duration: 3000
      });
      return;
    }

    // Limiter la taille à 5 MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 5 MB",
        status: "warning",
        duration: 3000
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        setImageElement(img);
        setSelectedImage(event.target.result);
        setScale(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }, [toast]);

  // Gérer le drag pour repositionner l'image
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Appliquer le crop et retourner l'image finale
  const handleApplyCrop = useCallback(() => {
    if (!imageElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Définir la taille du canvas de sortie
    const outputWidth = Math.min(imageElement.width * scale, maxWidth);
    const outputHeight = Math.min(imageElement.height * scale, maxHeight);

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Sauvegarder le contexte
    ctx.save();

    // Centrer et appliquer les transformations
    ctx.translate(outputWidth / 2, outputHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // Dessiner l'image avec le positionnement
    ctx.drawImage(
      imageElement,
      -imageElement.width / 2 + position.x / scale,
      -imageElement.height / 2 + position.y / scale
    );

    // Restaurer le contexte
    ctx.restore();

    // Convertir en base64
    const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
    const base64Image = canvas.toDataURL(mimeType, quality);

    // Calculer la taille
    const sizeInBytes = Math.round((base64Image.length * 3) / 4);
    const sizeInKB = (sizeInBytes / 1024).toFixed(1);

    console.log(`🖼️ Image générée: ${outputWidth}x${outputHeight}, ${sizeInKB} KB`);

    onImageCropped(base64Image);
    handleClose();

    toast({
      title: "Image enregistrée",
      description: `${outputWidth}x${outputHeight} - ${sizeInKB} KB`,
      status: "success",
      duration: 2000
    });
  }, [imageElement, scale, rotation, position, maxWidth, maxHeight, outputFormat, quality, onImageCropped, toast]);

  // Fermer et réinitialiser
  const handleClose = useCallback(() => {
    setSelectedImage(null);
    setImageElement(null);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {!selectedImage ? (
              <Box
                border="2px dashed"
                borderColor="gray.300"
                borderRadius="md"
                p={10}
                textAlign="center"
                cursor="pointer"
                _hover={{ borderColor: 'blue.500', bg: 'blue.50' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <VStack spacing={3}>
                  <FiUpload size={48} color="gray" />
                  <Text fontSize="lg" fontWeight="500">
                    Cliquez pour sélectionner une image
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    PNG, JPG, GIF - Max 5 MB
                  </Text>
                </VStack>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  display="none"
                />
              </Box>
            ) : (
              <VStack spacing={4} align="stretch">
                {/* Prévisualisation */}
                <Box
                  position="relative"
                  border="2px solid"
                  borderColor="gray.300"
                  borderRadius="md"
                  overflow="hidden"
                  bg="gray.100"
                  h="400px"
                  cursor={isDragging ? 'grabbing' : 'grab'}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <Flex h="100%" align="center" justify="center">
                    <Box
                      as="img"
                      src={selectedImage}
                      alt="Preview"
                      transform={`scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`}
                      transformOrigin="center"
                      maxW="100%"
                      maxH="100%"
                      transition="transform 0.1s"
                      userSelect="none"
                      pointerEvents="none"
                    />
                  </Flex>
                  
                  {/* Canvas caché pour le crop */}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </Box>

                {/* Contrôles */}
                <VStack spacing={3} align="stretch" bg="gray.50" p={4} borderRadius="md">
                  {/* Zoom */}
                  <Box>
                    <Flex justify="space-between" mb={2}>
                      <FormLabel mb={0} fontSize="sm">Zoom</FormLabel>
                      <HStack spacing={2}>
                        <IconButton
                          icon={<FiZoomOut />}
                          size="xs"
                          onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                          aria-label="Zoom -"
                        />
                        <Badge>{Math.round(scale * 100)}%</Badge>
                        <IconButton
                          icon={<FiZoomIn />}
                          size="xs"
                          onClick={() => setScale(Math.min(3, scale + 0.1))}
                          aria-label="Zoom +"
                        />
                      </HStack>
                    </Flex>
                    <Slider
                      value={scale}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onChange={setScale}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                  </Box>

                  {/* Rotation */}
                  <Box>
                    <Flex justify="space-between" mb={2}>
                      <FormLabel mb={0} fontSize="sm">Rotation</FormLabel>
                      <HStack spacing={2}>
                        <IconButton
                          icon={<FiRotateCw />}
                          size="xs"
                          onClick={() => setRotation((rotation + 90) % 360)}
                          aria-label="Rotation 90°"
                        />
                        <Badge>{rotation}°</Badge>
                      </HStack>
                    </Flex>
                    <Slider
                      value={rotation}
                      min={0}
                      max={360}
                      step={1}
                      onChange={setRotation}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                  </Box>

                  <Flex gap={2}>
                    <Tooltip label="Glissez l'image pour la repositionner">
                      <Button
                        leftIcon={<FiMove />}
                        size="sm"
                        variant="outline"
                        flex={1}
                      >
                        Déplacer (glisser-déposer)
                      </Button>
                    </Tooltip>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setScale(1);
                        setRotation(0);
                        setPosition({ x: 0, y: 0 });
                      }}
                    >
                      Réinitialiser
                    </Button>
                  </Flex>
                </VStack>

                {/* Bouton changer d'image */}
                <Button
                  leftIcon={<FiUpload />}
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Changer d'image
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  display="none"
                />
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose}>
              Annuler
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleApplyCrop}
              isDisabled={!selectedImage}
            >
              Enregistrer
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
