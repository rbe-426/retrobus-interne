/**
 * CSRF Token Management Service (Frontend)
 * 
 * Gère:
 * - Récupération du token CSRF initial au login
 * - Stockage en localStorage
 * - Envoi automatique dans les headers
 * - Refresh du token après chaque réponse
 */

import logger from '../utils/logger';

const CSRF_TOKEN_KEY = 'X-CSRF-Token';
const CSRF_EXPIRY_KEY = 'CSRF-Token-Expiry';

/**
 * Obtenir un token CSRF du serveur
 * Appelé après login
 */
export const fetchCSRFToken = async (baseURL = '') => {
  try {
    const response = await fetch(`${baseURL}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }

    const data = await response.json();
    const token = data.csrfToken;

    if (!token) {
      throw new Error('No CSRF token in response');
    }

    // Stocker le token en localStorage
    storeCSRFToken(token);
    logger.csrf('Token fetched and stored');

    return token;
  } catch (error) {
    console.error('❌ Error fetching CSRF token:', error);
    // Continue sans token - le serveur refusera les mutations
    throw error;
  }
};

/**
 * Stocker le token CSRF en localStorage
 */
export const storeCSRFToken = (token) => {
  try {
    localStorage.setItem(CSRF_TOKEN_KEY, token);
    // Stocker aussi l'expiration (24h = 86400000ms)
    const expiry = Date.now() + (24 * 60 * 60 * 1000);
    localStorage.setItem(CSRF_EXPIRY_KEY, expiry.toString());
  } catch (error) {
    console.warn('⚠️  Could not store CSRF token in localStorage:', error);
  }
};

/**
 * Récupérer le token CSRF stocké
 */
export const getStoredCSRFToken = () => {
  try {
    const token = localStorage.getItem(CSRF_TOKEN_KEY);
    const expiry = localStorage.getItem(CSRF_EXPIRY_KEY);

    // Vérifier l'expiration
    if (expiry && Date.now() > parseInt(expiry)) {
      console.warn('⚠️  CSRF token expired in localStorage');
      localStorage.removeItem(CSRF_TOKEN_KEY);
      localStorage.removeItem(CSRF_EXPIRY_KEY);
      return null;
    }

    return token;
  } catch (error) {
    console.warn('⚠️  Could not retrieve CSRF token:', error);
    return null;
  }
};

/**
 * Mettre à jour le token CSRF depuis le header X-CSRF-Token de la réponse
 * Appelé après chaque mutation réussie
 */
export const updateCSRFTokenFromResponse = (response) => {
  try {
    const newToken = response.headers.get('X-CSRF-Token');
    if (newToken) {
      storeCSRFToken(newToken);
      logger.csrf('Token updated from response');
      return newToken;
    } else {
      logger.debug('No new CSRF token in response headers');
    }
  } catch (error) {
    console.warn('⚠️  Could not update CSRF token from response:', error);
  }
  return null;
};

/**
 * Nettoyer le token CSRF (logout)
 */
export const clearCSRFToken = () => {
  try {
    localStorage.removeItem(CSRF_TOKEN_KEY);
    localStorage.removeItem(CSRF_EXPIRY_KEY);
    logger.csrf('Token cleared');
  } catch (error) {
    console.warn('⚠️  Could not clear CSRF token:', error);
  }
};

/**
 * Vérifier si un token CSRF valide est disponible
 */
export const hasValidCSRFToken = () => {
  return getStoredCSRFToken() !== null;
};

/**
 * Décorateur/wrapper pour fetch avec CSRF injection automatique
 * Exemple: fetchWithCSRF('/api/vehicles', { method: 'POST', body: {...} })
 */
export const fetchWithCSRF = async (url, options = {}) => {
  // Extraire le baseURL depuis l'URL fournie ou utiliser la variable d'environnement
  const RAW_API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const API_BASE = (() => {
    if (!RAW_API_BASE) return '';
    if (typeof window === 'undefined') return RAW_API_BASE;

    try {
      const target = new URL(RAW_API_BASE, window.location.origin);
      // En production, privilégier le same-origin pour éviter les erreurs CORS/CSRF
      // liées aux cookies de session quand l'app appelle un autre domaine.
      if (import.meta.env.PROD && target.origin !== window.location.origin) {
        console.warn(`⚠️  VITE_API_URL cross-origin detecte en prod (${target.origin}). Fallback sur same-origin.`);
        return '';
      }
      return RAW_API_BASE;
    } catch {
      return RAW_API_BASE;
    }
  })();
  let baseURL = '';
  let finalURL = url;
  
  // Si l'URL est relative, utiliser API_BASE et construire l'URL complète
  if (!url.startsWith('http')) {
    baseURL = API_BASE;
    // Construire l'URL complète en combinant baseURL et path
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    finalURL = `${baseURL}${cleanPath}`;
  } else {
    // Si URL absolue, extraire le baseURL
    try {
      const urlObj = new URL(url);
      baseURL = `${urlObj.protocol}//${urlObj.host}`;
      finalURL = url;
    } catch (_) {
      baseURL = API_BASE;
      finalURL = url;
    }
  }

  logger.debug(`fetchWithCSRF: ${url} → ${finalURL}`);

  // Obtenir le token stocké
  let csrfToken = getStoredCSRFToken();

  // Si c'est une mutation (POST, PUT, DELETE) et qu'on a pas de token, fetch d'abord
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET');
  
  if (isMutation && !csrfToken) {
    console.warn('⚠️  No CSRF token available for mutation. Fetching new one...');
    try {
      csrfToken = await fetchCSRFToken(baseURL);
      logger.csrf('Fresh token obtained');
    } catch (error) {
      console.error('❌ Could not fetch CSRF token for mutation:', error);
      throw error;
    }
  }

  // Construire les headers
  // Important: ne PAS forcer Content-Type pour FormData (le navigateur ajoute la boundary multipart)
  const isFormDataBody = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const headers = {
    ...options.headers,
    ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
  };

  // Ajouter le token d'authentification Bearer si disponible
  const authToken = localStorage.getItem('token');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Ajouter le token CSRF si mutation
  if (isMutation && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
    logger.debug(`CSRF token added for ${options.method} ${finalURL}`);
  } else if (isMutation && !csrfToken) {
    console.error('❌ No CSRF token available for mutation!');
  }

  // Faire la requête
  try {
    const response = await fetch(finalURL, {
      ...options,
      credentials: 'include',
      headers,
    });

    // Si on reçoit une 403 avec erreur CSRF, le backend a probablement redémarré
    // Fetch un nouveau token et retry UNE fois
    if (response.status === 403 && isMutation) {
      const errorData = await response.clone().json().catch(() => ({}));
      if (errorData.code === 'CSRF_INVALID' || errorData.code === 'CSRF_MISSING') {
        console.warn('⚠️  CSRF token rejected by server. Fetching fresh token and retrying...');
        
        // Fetch un nouveau token
        try {
          const newToken = await fetchCSRFToken(baseURL);
          headers['X-CSRF-Token'] = newToken;
          logger.csrf('Retrying with fresh token');
          
          // Retry la requête avec le nouveau token
          const retryResponse = await fetch(finalURL, {
            ...options,
            credentials: 'include',
            headers,
          });
          
          // Mettre à jour le token si nouveau reçu
          const newTokenFromRetry = updateCSRFTokenFromResponse(retryResponse);
          if (newTokenFromRetry) {
            logger.csrf('Token refreshed from retry');
          }
          
          return retryResponse;
        } catch (retryError) {
          console.error('❌ Failed to retry with fresh CSRF token:', retryError);
          return response; // Retourner la réponse originale 403
        }
      }
    }

    // IMPORTANT: Mettre à jour le token si nouveau reçu (backend envoie un nouveau après chaque mutation)
    const newToken = updateCSRFTokenFromResponse(response);
    if (newToken && isMutation) {
      logger.csrf('Token refreshed from response');
    }

    return response;
  } catch (error) {
    console.error('❌ Fetch with CSRF failed:', error);
    throw error;
  }
};
