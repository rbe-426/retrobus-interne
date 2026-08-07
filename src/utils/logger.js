/**
 * Logger Service - Désactive les logs en production
 * 
 * Remplace console.log avec une version qui ne log qu'en développement
 * pour améliorer drastiquement les performances en production
 */

const isDev = import.meta.env.DEV;

// Mode silencieux complet en production
const noop = () => {};

export const logger = {
  log: isDev ? console.log.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
  warn: console.warn.bind(console), // Toujours afficher les warnings
  error: console.error.bind(console), // Toujours afficher les erreurs
  debug: isDev ? console.debug.bind(console) : noop,
  
  // Logger spécialisés pour différents domaines
  api: isDev ? (...args) => console.log('📡', ...args) : noop,
  csrf: isDev ? (...args) => console.log('🔐', ...args) : noop,
  cache: isDev ? (...args) => console.log('💾', ...args) : noop,
  route: isDev ? (...args) => console.log('🛣️', ...args) : noop,
  auth: isDev ? (...args) => console.log('🔑', ...args) : noop,
};

export default logger;
