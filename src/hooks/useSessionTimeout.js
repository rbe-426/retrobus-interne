import { useEffect, useRef } from 'react';

/**
 * Hook pour gérer la déconnexion automatique selon deux critères :
 * 1. Inactivité : après N minutes sans activité utilisateur
 * 2. Fermeture d'onglet : lors de la fermeture du navigateur
 * 
 * @param {Function} onLogout - Fonction à appeler pour déconnecter
 * @param {Object} options
 * @param {number} [options.inactivityMinutes=15] - Délai d'inactivité (défaut: 15 min)
 * @param {boolean} [options.enabled=true] - Activer/désactiver le hook
 * @param {boolean} [options.enableBeforeUnloadWarning=false] - Afficher un avertissement avant fermeture (désactivé par défaut pour éviter les interférences)
 */
export function useSessionTimeout(onLogout, { inactivityMinutes = 15, enabled = true, enableBeforeUnloadWarning = false } = {}) {
  const inactivityTimeoutRef = useRef(null);
  const inactivityMs = inactivityMinutes * 60 * 1000;

  // ========== GESTION DE L'INACTIVITÉ ==========
  const resetInactivityTimer = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    inactivityTimeoutRef.current = setTimeout(() => {
      console.warn(`⏰ Inactivité détectée (${inactivityMinutes} min). Déconnexion...`);
      onLogout();
    }, inactivityMs);
  };

  // Événements d'activité utilisateur
  useEffect(() => {
    if (!enabled) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      console.log('📌 Activité détectée. Réinitialisation du timer d\'inactivité.');
      resetInactivityTimer();
    };

    // Initialiser le timer au montage du composant
    resetInactivityTimer();

    // Attacher les listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [inactivityMs, onLogout, enabled]);

  // ========== GESTION DE LA FERMETURE D'ONGLET/FENÊTRE ==========
  useEffect(() => {
    if (!enabled || !enableBeforeUnloadWarning) return;

    const handleBeforeUnload = (e) => {
      // Essayer de nettoyer la session (best-effort, peut ne pas s'exécuter)
      console.log('🚪 Fermeture d\'onglet détectée. Nettoyage de session...');
      onLogout();
      
      // Afficher un message de confirmation (optionnel)
      e.preventDefault();
      e.returnValue = '';
    };

    // L'événement 'beforeunload' s'exécute avant la fermeture
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [onLogout, enabled, enableBeforeUnloadWarning]);
}
