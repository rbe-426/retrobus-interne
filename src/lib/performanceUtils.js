/**
 * Utilitaires de performance pour optimiser les rendus et les appels API
 */

/**
 * Debounce une fonction - réduit les appels répétés
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle une fonction - limite la fréquence d'exécution
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Cache simple en mémoire avec TTL
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttl = 5 * 60 * 1000) { // 5 minutes par défaut
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    this.cache.delete(key);
  }
}

export const apiCache = new MemoryCache();

/**
 * Wrapper pour les appels API avec cache automatique
 */
export async function cachedAPICall(cacheKey, apiFunc, ttl = 5 * 60 * 1000) {
  // Vérifier le cache
  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey);
  }

  // Appeler l'API
  const result = await apiFunc();
  
  // Mettre en cache
  apiCache.set(cacheKey, result, ttl);
  
  return result;
}

/**
 * Batch des appels API en parallèle avec limite de concurrence
 */
export async function batchAPICall(apiCalls, maxConcurrent = 5) {
  const results = [];
  const executing = [];

  for (const apiCall of apiCalls) {
    const promise = apiCall().then(result => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });

    results.push(promise);
    executing.push(promise);

    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
    }
  }

  return Promise.allSettled(results);
}

/**
 * Hook personnalisé pour lazy loading d'images
 */
export function lazyLoadImage(src, placeholder = '') {
  if (typeof window === 'undefined') return src;

  const img = new Image();
  img.src = src;

  if (img.complete) {
    return src;
  }

  return placeholder;
}

/**
 * Précharge une liste d'images
 */
export function preloadImages(urls) {
  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}

/**
 * Détecte si l'utilisateur a une connexion lente
 */
export function isSlowConnection() {
  if (!navigator.connection) return false;
  
  const connection = navigator.connection;
  const slowTypes = ['slow-2g', '2g', '3g'];
  
  return slowTypes.includes(connection.effectiveType) || 
         (connection.downlink && connection.downlink < 1);
}

/**
 * Optimise le chargement en fonction de la connexion
 */
export function getOptimalLoadingStrategy() {
  if (isSlowConnection()) {
    return {
      imageQuality: 'low',
      lazyLoadThreshold: 500,
      maxConcurrentRequests: 2,
      cacheTime: 10 * 60 * 1000 // 10 minutes
    };
  }
  
  return {
    imageQuality: 'high',
    lazyLoadThreshold: 1000,
    maxConcurrentRequests: 6,
    cacheTime: 5 * 60 * 1000 // 5 minutes
  };
}
