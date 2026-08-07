import React, { createContext, useContext, useState, useCallback } from 'react';
import { useMediaQuery } from '@chakra-ui/react';

/**
 * Context pour gérer l'état de la sidebar globalement
 * Permet de contrôler l'ouverture/fermeture de la sidebar depuis n'importe quel composant
 */
const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  // Breakpoint ajusté pour tablettes : < 900px = mobile, >= 900px = desktop
  // Surface Pro (1368px logical) sera en mode desktop avec sidebar fixe
  const [isLessThan900] = useMediaQuery('(max-width: 899px)');
  const isMobile = isLessThan900 === true;
  
  // Sur desktop/tablette, la sidebar est toujours ouverte par défaut
  // Sur mobile, elle est fermée par défaut
  const [isOpen, setIsOpen] = useState(!isMobile);
  
  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  // Fermer automatiquement sur mobile après navigation
  const closeOnMobile = useCallback(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);
  
  const value = {
    isOpen,
    isMobile,
    toggle,
    open,
    close,
    closeOnMobile
  };
  
  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};
