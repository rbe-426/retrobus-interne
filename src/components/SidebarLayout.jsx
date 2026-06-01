import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  IconButton,
  useColorModeValue,
  Portal
} from '@chakra-ui/react';
import { FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import { useSidebar } from '../context/SidebarContext';

/**
 * SidebarLayout - Composant réutilisable pour les pages avec sidebar
 * 
 * Sur Desktop : Sidebar fixe à gauche, toujours visible
 * Sur Mobile : Sidebar en Drawer (overlay), avec bouton hamburger
 * 
 * @param {React.ReactNode} sidebar - Contenu de la sidebar
 * @param {React.ReactNode} children - Contenu principal de la page
 * @param {string} sidebarWidth - Largeur de la sidebar (défaut: 280px)
 * @param {boolean} showToggleButton - Afficher le bouton hamburger (défaut: true)
 */
export default function SidebarLayout({ 
  sidebar, 
  children, 
  sidebarWidth = '280px',
  showToggleButton = true 
}) {
  const { isOpen, isMobile, toggle, close } = useSidebar();
  
  const sidebarBg = useColorModeValue('gray.50', 'gray.900');
  const sidebarBorderColor = useColorModeValue('gray.200', 'gray.700');
  const contentBg = useColorModeValue('white', 'gray.800');
  
  // Sur mobile : Drawer overlay
  if (isMobile) {
    return (
      <Box position="relative" w="100%" h="calc(100vh - 60px)">
        {/* Bouton chevron flottant */}
        {showToggleButton && (
          <IconButton
            icon={<FiChevronRight />}
            onClick={toggle}
            position="fixed"
            bottom={4}
            right={4}
            size="md"
            bg="white"
            color="blue.500"
            borderRadius="full"
            border="2px solid"
            borderColor="blue.500"
            boxShadow="md"
            zIndex={999}
            aria-label="Ouvrir le menu"
            _hover={{ 
              bg: "blue.50", 
              borderColor: "blue.600",
              color: "blue.600",
              boxShadow: "lg" 
            }}
            _active={{ 
              bg: "blue.100",
              borderColor: "blue.700",
              color: "blue.700"
            }}
          />
        )}
        
        {/* Contenu principal */}
        <Box 
          w="100%" 
          h="100%" 
          overflowY="auto"
          bg={contentBg}
          p={4}
        >
          {children}
        </Box>
        
        {/* Sidebar en Drawer */}
        <Drawer
          isOpen={isOpen}
          placement="left"
          onClose={close}
          size="full"
        >
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <Box h="100%" overflowY="auto">
              {sidebar}
            </Box>
          </DrawerContent>
        </Drawer>
      </Box>
    );
  }
  
  // Sur desktop : Layout classique avec sidebar fixe
  return (
    <HStack align="stretch" spacing={0} h="calc(100vh - 80px)" w="100%">
      {/* Bouton toggle desktop sur le bord de la sidebar */}
      {showToggleButton && (
        <IconButton
          icon={isOpen ? <FiChevronLeft /> : <FiChevronRight />}
          onClick={toggle}
          position="fixed"
          top="120px"
          left={isOpen ? sidebarWidth : "0px"}
          transform="translateX(-50%)"
          size="sm"
          bg="white"
          color="blue.500"
          borderRadius="full"
          border="2px solid"
          borderColor="blue.500"
          boxShadow="md"
          zIndex={1000}
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          transition="left 0.3s ease, transform 0.3s ease"
          _hover={{ 
            bg: "blue.50", 
            borderColor: "blue.600",
            color: "blue.600",
            boxShadow: "lg" 
          }}
          _active={{ 
            bg: "blue.100",
            borderColor: "blue.700",
            color: "blue.700"
          }}
        />
      )}
      
      {/* Sidebar */}
      <Box
        w={isOpen ? sidebarWidth : "0px"}
        h="100%"
        bg={sidebarBg}
        borderRight="1px"
        borderColor={sidebarBorderColor}
        overflowY="auto"
        overflowX="hidden"
        transition="width 0.3s ease"
        position="relative"
      >
        {isOpen && sidebar}
      </Box>
      
      {/* Contenu principal */}
      <Box 
        flex={1} 
        h="100%" 
        overflowY="auto"
        bg={contentBg}
        transition="margin-left 0.3s ease"
      >
        {children}
      </Box>
    </HStack>
  );
}
