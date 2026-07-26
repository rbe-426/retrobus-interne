/**
 * HomeAnnouncement.jsx
 * 
 * Composant pour afficher les annonces d'accueil
 * Bandes de notification avec trois niveaux de gravité:
 * - info: Bleu (informations générales)
 * - warning: Orange (avertissements importants)
 * - critical: Rouge (informations critiques)
 */

import React, { useState, useEffect } from 'react';
import {
  Box, HStack, VStack, Text, Button, CloseButton,
  useColorModeValue, Icon, Container, Flex
} from '@chakra-ui/react';
import { FiInfo, FiAlertTriangle, FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';
import { homeAnnouncementsAPI } from '../api/homeAnnouncements';

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
  success: {
    bg: 'green.50',
    bgDark: 'green.900',
    border: 'green.200',
    borderDark: 'green.700',
    text: 'green.800',
    textDark: 'green.100',
    icon: FiCheckCircle,
    iconColor: 'green.500'
  },
  critical: {
    bg: 'linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%)',
    bgDark: 'linear-gradient(135deg, #63171b 0%, #3b0b0d 100%)',
    border: 'red.200',
    borderDark: 'red.700',
    text: 'red.800',
    textDark: 'red.100',
    icon: FiAlertCircle,
    iconColor: 'red.500',
    ringColor: 'rgba(229, 62, 62, 0.35)'
  }
};

/**
 * Composant pour afficher une bande d'annonce
 */
function AnnouncementBanner({ announcement, onClose }) {
  const severityKey = String(announcement?.severity || 'info').toLowerCase();
  const severity = SEVERITY_LEVELS[severityKey] || SEVERITY_LEVELS.info;
  const isCritical = severityKey === 'critical';
  
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
      boxShadow={isCritical ? '0 0 0 2px rgba(229, 62, 62, 0.18), 0 10px 24px rgba(229, 62, 62, 0.22)' : 'sm'}
      animation="slideDown 0.3s ease-out"
      position="relative"
      overflow="hidden"
    >
      {isCritical && (
        <Box
          position="absolute"
          top="0"
          right="0"
          px="10px"
          py="4px"
          bg="red.600"
          color="white"
          fontSize="10px"
          fontWeight="800"
          letterSpacing="0.6px"
          borderBottomLeftRadius="md"
        >
          ALERTE MAJEURE
        </Box>
      )}
      <Flex align="flex-start" gap="12px">
        {/* Icône */}
        <Icon
          as={SeverityIcon}
          fontSize="20px"
          color={severity.iconColor}
          marginTop="2px"
          flexShrink={0}
          sx={isCritical ? {
            filter: `drop-shadow(0 0 6px ${severity.ringColor})`,
            animation: 'criticalPulse 1.4s ease-in-out infinite'
          } : {}}
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
                  colorScheme={severityKey === 'critical' ? 'red' : severityKey === 'warning' ? 'orange' : severityKey === 'success' ? 'green' : 'blue'}
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

        @keyframes criticalPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.88;
          }
        }
      `}</style>
    </Box>
  );
}

/**
 * Hook pour gérer les annonces d'accueil (persistées côté serveur)
 */
export function useHomeAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les annonces au montage du composant
  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await homeAnnouncementsAPI.getAll();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Erreur chargement annonces:', err);
      setError(err.message);
      // Fallback: essayer de charger depuis localStorage en cas d'erreur
      try {
        const stored = localStorage.getItem('rbe:home-announcements');
        if (stored) {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr)) {
            const now = Date.now();
            const filtered = arr.filter(
              a => a && a.active && (!a.expiresAt || new Date(a.expiresAt).getTime() > now)
            );
            setAnnouncements(filtered);
          }
        }
      } catch (localErr) {
        console.warn('⚠️ Erreur fallback localStorage:', localErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const addAnnouncement = async (announcement) => {
    try {
      const created = await homeAnnouncementsAPI.create({
        severity: announcement.severity || 'INFO',
        title: announcement.title,
        message: announcement.message,
        dismissible: announcement.dismissible !== false,
        expiresAt: announcement.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        actions: announcement.actions || null
      });

      // Recharger la liste après création
      await loadAnnouncements();
      return created;
    } catch (err) {
      console.error('❌ Erreur création annonce:', err);
      throw err;
    }
  };

  const removeAnnouncement = async (id) => {
    try {
      await homeAnnouncementsAPI.delete(id);
      // Mise à jour optimiste de l'UI
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('❌ Erreur suppression annonce:', err);
      // Recharger en cas d'erreur
      await loadAnnouncements();
      throw err;
    }
  };

  const clearAll = async () => {
    try {
      // Supprimer toutes les annonces une par une
      const safeAnnouncements = Array.isArray(announcements) ? announcements : [];
      const deletePromises = safeAnnouncements.map(a => homeAnnouncementsAPI.delete(a.id));
      await Promise.all(deletePromises);
      setAnnouncements([]);
    } catch (err) {
      console.error('❌ Erreur suppression toutes annonces:', err);
      await loadAnnouncements();
      throw err;
    }
  };

  return {
    announcements,
    loading,
    error,
    addAnnouncement,
    removeAnnouncement,
    clearAll,
    refresh: loadAnnouncements
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
