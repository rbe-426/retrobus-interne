/**
 * eventModeConfig.js
 * 
 * Utilitaire pour gérer le mode événement temporaire
 * Permet de définir une disposition différente avec dates de début/fin
 */

const EVENT_MODE_KEY = 'rbe:event-mode';

/**
 * Structure de configuration du mode événement
 * {
 *   active: boolean,
 *   startDate: ISO string,
 *   endDate: ISO string,
 *   event: {
 *     name: string,
 *     description: string,
 *     location: string,
 *     type: 'EXPO' | 'BOURSE' | 'RALLY' | 'MEETING' | 'CUSTOM',
 *     bannerImage: string (URL),
 *     color: string (hex color),
 *     logo: string (URL)
 *   },
 *   layout: {
 *     showStats: boolean,
 *     showAnnouncements: boolean,
 *     showQuickActions: boolean,
 *     customSections: []
 *   },
 *   registration: {
 *     enabled: boolean,
 *     requireAuth: boolean,
 *     fields: [],
 *     confirmationMessage: string,
 *     maxParticipants: number,
 *     currentParticipants: number
 *   },
 *   createdAt: ISO string,
 *   updatedAt: ISO string
 * }
 */

/**
 * Récupérer la configuration du mode événement
 */
export function getEventModeConfig() {
  try {
    const raw = localStorage.getItem(EVENT_MODE_KEY);
    if (!raw) return null;
    
    const config = JSON.parse(raw);
    
    // Validation basique
    if (!config || typeof config !== 'object') return null;
    
    return config;
  } catch (error) {
    console.error('❌ Erreur chargement config mode événement:', error);
    return null;
  }
}

/**
 * Vérifier si le mode événement est actuellement actif
 */
export function isEventModeActive() {
  const config = getEventModeConfig();
  
  if (!config || !config.active) return false;
  
  const now = new Date();
  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);
  
  // Vérifier que les dates sont valides
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.warn('⚠️ Dates invalides dans config mode événement');
    return false;
  }
  
  // Vérifier que nous sommes dans la période
  const isInPeriod = now >= startDate && now <= endDate;
  
  if (!isInPeriod) {
    console.log('📅 Mode événement inactif (hors période)', {
      now: now.toISOString(),
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });
  }
  
  return isInPeriod;
}

/**
 * Sauvegarder la configuration du mode événement
 */
export function saveEventModeConfig(config) {
  try {
    const configWithTimestamp = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(EVENT_MODE_KEY, JSON.stringify(configWithTimestamp));
    
    console.log('✅ Configuration mode événement sauvegardée:', configWithTimestamp);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde config mode événement:', error);
    return false;
  }
}

/**
 * Supprimer la configuration du mode événement
 */
export function clearEventModeConfig() {
  try {
    localStorage.removeItem(EVENT_MODE_KEY);
    console.log('🗑️ Configuration mode événement supprimée');
    return true;
  } catch (error) {
    console.error('❌ Erreur suppression config mode événement:', error);
    return false;
  }
}

/**
 * Créer une configuration par défaut
 */
export function createDefaultEventConfig(overrides = {}) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return {
    active: false,
    startDate: tomorrow.toISOString(),
    endDate: nextWeek.toISOString(),
    event: {
      name: 'Événement RétroBus Essonne',
      description: 'Venez découvrir nos véhicules historiques',
      location: 'À définir',
      type: 'EXPO',
      bannerImage: '',
      color: '#FF6B35',
      logo: ''
    },
    layout: {
      showStats: true,
      showAnnouncements: true,
      showQuickActions: true,
      customSections: []
    },
    registration: {
      enabled: true,
      requireAuth: false,
      fields: [
        { name: 'fullName', label: 'Nom complet', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Téléphone', type: 'tel', required: false },
        { name: 'participants', label: 'Nombre de participants', type: 'number', required: true, min: 1, max: 10 }
      ],
      confirmationMessage: 'Merci pour votre inscription ! Vous recevrez un email de confirmation.',
      maxParticipants: null, // null = illimité
      currentParticipants: 0
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides
  };
}

/**
 * Types d'événements prédéfinis
 */
export const EVENT_TYPES = {
  EXPO: {
    label: 'Exposition',
    color: '#FF6B35',
    icon: '🚌',
    description: 'Exposition de véhicules historiques'
  },
  BOURSE: {
    label: 'Bourse d\'échange',
    color: '#4ECDC4',
    icon: '🔄',
    description: 'Bourse d\'échange de pièces et accessoires'
  },
  RALLY: {
    label: 'Rallye',
    color: '#95E1D3',
    icon: '🏁',
    description: 'Rallye de véhicules anciens'
  },
  MEETING: {
    label: 'Rassemblement',
    color: '#F38181',
    icon: '🤝',
    description: 'Rassemblement de passionnés'
  },
  CUSTOM: {
    label: 'Personnalisé',
    color: '#AA96DA',
    icon: '⭐',
    description: 'Événement personnalisé'
  }
};

/**
 * Hook React pour utiliser le mode événement
 */
export function useEventMode() {
  const [config, setConfig] = React.useState(null);
  const [isActive, setIsActive] = React.useState(false);
  
  React.useEffect(() => {
    const loadConfig = () => {
      const cfg = getEventModeConfig();
      const active = isEventModeActive();
      
      setConfig(cfg);
      setIsActive(active);
      
      console.log('🎪 Mode événement:', active ? 'ACTIF' : 'INACTIF', cfg);
    };
    
    loadConfig();
    
    // Vérifier toutes les minutes si le mode doit s'activer/désactiver
    const interval = setInterval(loadConfig, 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const updateConfig = (newConfig) => {
    const success = saveEventModeConfig(newConfig);
    if (success) {
      setConfig(newConfig);
      setIsActive(isEventModeActive());
    }
    return success;
  };
  
  const clearConfig = () => {
    const success = clearEventModeConfig();
    if (success) {
      setConfig(null);
      setIsActive(false);
    }
    return success;
  };
  
  return {
    config,
    isActive,
    updateConfig,
    clearConfig
  };
}

// Import React pour le hook
import React from 'react';
