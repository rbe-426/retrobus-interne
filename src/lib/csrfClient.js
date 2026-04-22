/**
 * CSRF Token Management Service (Frontend)
 * 
 * Gère:
 * - Récupération du token CSRF initial au login
 * - Stockage en localStorage
 * - Envoi automatique dans les headers
 * - Refresh du token après chaque réponse
 */

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
    console.log('✅ CSRF token fetched and stored');

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
      console.log('✅ CSRF token updated from response');
      return newToken;
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
    console.log('✅ CSRF token cleared');
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
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  let baseURL = '';
  
  // Si l'URL est relative, utiliser API_BASE
  if (!url.startsWith('http')) {
    baseURL = API_BASE;
  } else {
    // Si URL absolue, extraire le baseURL
    try {
      const urlObj = new URL(url);
      baseURL = `${urlObj.protocol}//${urlObj.host}`;
    } catch (_) {
      baseURL = API_BASE;
    }
  }

  // Obtenir le token stocké
  let csrfToken = getStoredCSRFToken();

  // Si c'est une mutation (POST, PUT, DELETE) et qu'on a pas de token, fetch d'abord
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET');
  
  if (isMutation && !csrfToken) {
    console.warn('⚠️  No CSRF token available for mutation. Fetching new one...');
    try {
      csrfToken = await fetchCSRFToken(baseURL);
      console.log('✅ Fresh CSRF token obtained:', csrfToken ? 'present' : 'missing');
    } catch (error) {
      console.error('❌ Could not fetch CSRF token for mutation:', error);
      throw error;
    }
  }

  // Construire les headers
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };

  // Ajouter le token d'authentification Bearer si disponible
  const authToken = localStorage.getItem('token');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Ajouter le token CSRF si mutation
  if (isMutation && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
    console.log('🔐 CSRF token added to headers for', options.method, url);
  } else if (isMutation && !csrfToken) {
    console.error('❌ No CSRF token available for mutation!');
  }

  // Faire la requête
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });

    // Mettre à jour le token si nouveau reçu
    updateCSRFTokenFromResponse(response);

    return response;
  } catch (error) {
    console.error('❌ Fetch with CSRF failed:', error);
    throw error;
  }
};
