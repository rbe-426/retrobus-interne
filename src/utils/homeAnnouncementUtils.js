/**
 * homeAnnouncementUtils.js
 * 
 * Utilitaires pour gérer les annonces d'accueil
 * Permet d'ajouter facilement des bandes de notification avec quatre niveaux de gravité
 */

const STORAGE_KEY = 'rbe:home-announcements';

/**
 * Récupérer toutes les annonces actives
 */
export function getHomeAnnouncements() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
}

/**
 * Ajouter une annonce
 * @param {Object} options - Configuration de l'annonce
 * @param {string} options.severity - 'info', 'warning', 'critical' ou 'success'
 * @param {string} options.title - Titre de l'annonce
 * @param {string} options.message - Message de l'annonce
 * @param {number} options.expiresAt - Timestamp expiration (optionnel, 24h par défaut)
 * @param {boolean} options.dismissible - Peut être fermée par l'utilisateur (true par défaut)
 * @param {Array} options.actions - Actions disponibles (optionnel)
 * @returns {Object} L'annonce créée
 */
export function addHomeAnnouncement(options = {}) {
  const {
    severity = 'info',
    title = '',
    message = '',
    expiresAt = null,
    dismissible = true,
    actions = []
  } = options;

  // Validation
  if (!['info', 'warning', 'critical', 'success'].includes(severity)) {
    console.warn('Gravité invalide:', severity, '- utilisation de "info"');
  }

  const announcement = {
    id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    severity: severity,
    title: title,
    message: message,
    active: true,
    dismissible: dismissible,
    expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    actions: actions || [],
    createdAt: new Date().toISOString()
  };

  try {
    const current = getHomeAnnouncements();
    const updated = [...current, announcement];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return announcement;
  } catch (e) {
    console.error('Erreur ajout annonce:', e);
    return null;
  }
}

/**
 * Supprimer une annonce
 */
export function removeHomeAnnouncement(id) {
  try {
    const current = getHomeAnnouncements();
    const updated = current.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.error('Erreur suppression annonce:', e);
    return false;
  }
}

/**
 * Supprimer toutes les annonces
 */
export function clearHomeAnnouncements() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('Erreur suppression annonces:', e);
    return false;
  }
}

/**
 * Exemples prêts à l'emploi
 */
export const AnnouncementPresets = {
  // Annonce d'information
  info: (title, message, expiresAt) =>
    addHomeAnnouncement({
      severity: 'info',
      title,
      message,
      expiresAt
    }),

  // Annonce d'avertissement
  warning: (title, message, expiresAt) =>
    addHomeAnnouncement({
      severity: 'warning',
      title,
      message,
      expiresAt
    }),

  // Annonce critique (très importante)
  critical: (title, message, expiresAt) =>
    addHomeAnnouncement({
      severity: 'critical',
      title,
      message,
      expiresAt
    }),

  success: (title, message, expiresAt) =>
    addHomeAnnouncement({
      severity: 'success',
      title,
      message,
      expiresAt
    }),

  // Exemples de test
  testInfo: () =>
    addHomeAnnouncement({
      severity: 'info',
      title: '✓ Information',
      message: 'Ceci est une annonce informationnelle. Elle disparaîtra automatiquement dans 24h.',
      dismissible: true
    }),

  testWarning: () =>
    addHomeAnnouncement({
      severity: 'warning',
      title: '⚠ Avertissement',
      message: 'Une action importante requiert votre attention. Veuillez vérifier les détails.',
      dismissible: true
    }),

  testCritical: () =>
    addHomeAnnouncement({
      severity: 'critical',
      title: '🚨 Information Critique',
      message: 'Une situation critique nécessite une action immédiate. Contactez l\'administrateur si le problème persiste.',
      dismissible: true
    })
};

/**
 * Exemples de cas d'usage réels
 */
export const RealWorldExamples = {
  // Maintenance annoncée
  maintenancePlanned: (dateStart, dateEnd) =>
    AnnouncementPresets.warning(
      '🔧 Maintenance prévue',
      `Maintenance système du ${dateStart} au ${dateEnd}. Le service peut être indisponible.`,
      new Date(new Date(dateEnd).getTime() + 60 * 60 * 1000).toISOString()
    ),

  // Problème active/bug
  activeIssue: (description) =>
    AnnouncementPresets.critical(
      '🚨 Problème détecté',
      description,
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    ),

  serviceRestored: (details) =>
    AnnouncementPresets.success(
      '✅ Service rétabli',
      details || 'Le service est de nouveau disponible. Merci pour votre patience.',
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    ),

  // Mise à jour importante
  importantUpdate: (details, expiresIn = 7) =>
    AnnouncementPresets.warning(
      '📢 Mise à jour importante',
      details,
      new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString()
    ),

  // Nouvelle fonctionnalité
  newFeature: (featureName, description) =>
    AnnouncementPresets.info(
      `✨ Nouvelle fonctionnalité: ${featureName}`,
      description,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    )
};
