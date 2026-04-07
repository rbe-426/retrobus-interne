/**
 * HomeAnnouncement.jsx
 * 
 * Composant pour afficher les annonces d'accueil
 * Bandes de notification avec trois niveaux de gravité:
 * - info: Bleu (informations générales)
 * - warning: Orange (avertissements importants)
 * - critical: Rouge (informations critiques)
 */

import React, { useState } from 'react';
import {
  Box, HStack, VStack, Text, Button, CloseButton,
  useColorModeValue, Icon, Container, Flex
} from '@chakra-ui/react';
import { FiInfo, FiAlertTriangle, FiAlertCircle, FiX } from 'react-icons/fi';

/**
 * Gravité des annonces avec couleurs thémées
 */
const SEVERITY_LEVELS = {
  info: {
    bg: 'blue.50',
    bgDark: 'blue.900',
    border: 'blue.200',
    borderDark: 'blue.700',
    text: 'blue.800',
    textDark: 'blue.100',
    icon: FiInfo,
    iconColor: 'blue.500'
  },
  warning: {
    bg: 'orange.50',
    bgDark: 'orange.900',
    border: 'orange.200',
    borderDark: 'orange.700',
    text: 'orange.800',
    textDark: 'orange.100',
    icon: FiAlertTriangle,
    iconColor: 'orange.500'
  },
  critical: {
    bg: 'red.50',
    bgDark: 'red.900',
    border: 'red.200',
    borderDark: 'red.700',
    text: 'red.800',
    textDark: 'red.100',
    icon: FiAlertCircle,
    iconColor: 'red.500'
  }
};

/**
 * Composant pour afficher une bande d'annonce
 */
function AnnouncementBanner({ announcement, onClose }) {
  const severity = SEVERITY_LEVELS[announcement.severity] || SEVERITY_LEVELS.info;
  
  const bgColor = useColorModeValue(severity.bg, severity.bgDark);
  const borderColor = useColorModeValue(severity.border, severity.borderDark);
  const textColor = useColorModeValue(severity.text, severity.textDark);
  const SeverityIcon = severity.icon;

  return (
    <Box
      bg={bgColor}
      borderLeft="4px solid"
      borderColor={severity.iconColor}
      padding="16px"
      marginY="12px"
      borderRadius="md"
      boxShadow="sm"
      animation="slideDown 0.3s ease-out"
    >
      <Flex align="flex-start" gap="12px">
        {/* Icône */}
        <Icon
          as={SeverityIcon}
          fontSize="20px"
          color={severity.iconColor}
          marginTop="2px"
          flexShrink={0}
        />

        {/* Contenu */}
        <VStack align="flex-start" spacing="8px" flex="1">
          {announcement.title && (
            <Text
              fontWeight="bold"
              color={textColor}
              fontSize="md"
            >
              {announcement.title}
            </Text>
          )}
          
          {announcement.message && (
            <Text
              color={textColor}
              fontSize="sm"
              lineHeight="1.5"
            >
              {announcement.message}
            </Text>
          )}

          {/* Actions optionnelles */}
          {announcement.actions && announcement.actions.length > 0 && (
            <HStack spacing="8px" marginTop="4px">
              {announcement.actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant="outline"
                  colorScheme={announcement.severity === 'critical' ? 'red' : announcement.severity === 'warning' ? 'orange' : 'blue'}
                  onClick={() => {
                    if (action.onClick) action.onClick();
                    if (action.dismissAfter) onClose();
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </HStack>
          )}
        </VStack>

        {/* Bouton fermer */}
        {announcement.dismissible !== false && (
          <CloseButton
            onClick={onClose}
            size="lg"
            marginLeft="8px"
          />
        )}
      </Flex>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Box>
  );
}

/**
 * Hook pour gérer les annonces d'accueil
 */
export function useHomeAnnouncements() {
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const stored = localStorage.getItem('rbe:home-announcements');
      if (!stored) return [];
      const arr = JSON.parse(stored);
      if (!Array.isArray(arr)) return [];
      const now = Date.now();
      // Filtrer les annonces actives et non expirées
      return arr.filter(
        a => a && a.active && (!a.expiresAt || new Date(a.expiresAt).getTime() > now)
      );
    } catch (e) {
      console.warn('Erreur chargement annonces:', e);
      return [];
    }
  });

  const addAnnouncement = (announcement) => {
    const newAnnouncement = {
      id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      severity: announcement.severity || 'info', // info, warning, critical
      title: announcement.title,
      message: announcement.message,
      active: true,
      dismissible: announcement.dismissible !== false,
      expiresAt: announcement.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h par défaut
      actions: announcement.actions || [],
      createdAt: new Date().toISOString()
    };

    const updated = [...announcements, newAnnouncement];
    setAnnouncements(updated);
    
    // Sauvegarder en localStorage
    try {
      localStorage.setItem('rbe:home-announcements', JSON.stringify(updated));
    } catch (e) {
      console.warn('Erreur sauvegarde annonces:', e);
    }

    return newAnnouncement;
  };

  const removeAnnouncement = (id) => {
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    
    try {
      localStorage.setItem('rbe:home-announcements', JSON.stringify(updated));
    } catch (e) {
      console.warn('Erreur sauvegarde annonces:', e);
    }
  };

  const clearAll = () => {
    setAnnouncements([]);
    try {
      localStorage.removeItem('rbe:home-announcements');
    } catch (e) {
      console.warn('Erreur suppression annonces:', e);
    }
  };

  return {
    announcements,
    addAnnouncement,
    removeAnnouncement,
    clearAll
  };
}

/**
 * Composant pour afficher toutes les annonces
 */
export default function HomeAnnouncements({ announcements, onRemove }) {
  if (!announcements || announcements.length === 0) {
    return null;
  }

  return (
    <Container maxW="container.lg" paddingX={0}>
      <VStack spacing={0} align="stretch">
        {announcements.map((announcement) => (
          <AnnouncementBanner
            key={announcement.id}
            announcement={announcement}
            onClose={() => onRemove(announcement.id)}
          />
        ))}
      </VStack>
    </Container>
  );
}
