// Configuration de base pour les API
// Si VITE_API_URL est absent, on utilise des URLs relatives (proxy Vite en dev)
const API_BASE_URL = (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, '');

// Import CSRF client utilities
import { getStoredCSRFToken } from '../lib/csrfClient.js';
import logger from '../utils/logger.js';

// Headers par défaut
const getDefaultHeaders = (options = {}) => ({
  'Content-Type': 'application/json',
  ...options.headers,
});

// Headers avec authentification JWT
const getAuthHeaders = (token, options = {}) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  ...options.headers,
});

// Headers pour les mutations (POST, PUT, PATCH, DELETE) - ajoute le token CSRF
const getMutationHeaders = (token, options = {}) => {
  const headers = getAuthHeaders(token, options);
  
  // Ajouter le token CSRF s'il existe
  const csrfToken = getStoredCSRFToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
    logger.debug('CSRF token injected in headers');
  } else {
    console.warn('⚠️  No CSRF token available for mutation - server may reject it');
  }
  
  return headers;
};

// Fonction pour parser la réponse de manière sécurisée
const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur parsing JSON:', error);
      throw new Error('[RBE-API-JSON-001] Réponse JSON invalide du serveur. Signification: la réponse API est corrompue ou tronquée.');
    }
  } else {
    // Si ce n'est pas du JSON, récupérer le texte pour débogage
    const text = await response.text();
    console.error('❌ Réponse non-JSON reçue:', text.substring(0, 200) + '...');
    
    if (text.includes('<!DOCTYPE')) {
      throw new Error('[RBE-API-HTML-001] Réponse HTML au lieu de JSON. Signification: route API invalide ou rewrite/proxy incorrect.');
    } else {
      throw new Error(`[RBE-API-RAW-001] Réponse inattendue du serveur (${response.status}). Signification: format de réponse non géré.`);
    }
  }
};

// Mappage Trilogy des erreurs API vers des codes explicites utilisables dans les popups
const buildTrilogyErrorMessage = ({ status, errorData, method, url }) => {
  const serverCode = String(errorData?.code || '').toUpperCase();
  const serverMessage = errorData?.error || errorData?.details || errorData?.message || '';

  if (serverCode === 'CSRF_MISSING') {
    return '[RBE-SEC-403-CSRF-MISSING] Jeton CSRF manquant. Signification: la session de securite n\'est pas initialisee. Action: se reconnecter.';
  }
  if (serverCode === 'CSRF_INVALID') {
    return '[RBE-SEC-403-CSRF-INVALID] Jeton CSRF invalide. Signification: le token est expire ou incoherent. Action: se reconnecter.';
  }

  switch (status) {
    case 400:
      return `[RBE-REQ-400] Requete invalide (${method} ${url}). Signification: donnees manquantes ou mal formees. Detail: ${serverMessage || 'Aucun detail serveur.'}`;
    case 401:
      return '[RBE-AUTH-401] Authentification invalide ou expiree. Signification: token absent/expire.';
    case 403:
      return `[RBE-AUTH-403] Acces refuse (${method} ${url}). Signification: permissions insuffisantes ou regle de securite. Detail: ${serverMessage || 'Aucun detail serveur.'}`;
    case 404:
      return `[RBE-API-404] Ressource introuvable (${method} ${url}). Signification: endpoint ou identifiant absent. Detail: ${serverMessage || 'Aucun detail serveur.'}`;
    case 409:
      return `[RBE-DATA-409] Conflit de donnees (${method} ${url}). Signification: doublon ou contrainte metier. Detail: ${serverMessage || 'Aucun detail serveur.'}`;
    case 422:
      return `[RBE-VAL-422] Validation echouee (${method} ${url}). Signification: donnees invalides selon les regles metier. Detail: ${serverMessage || 'Aucun detail serveur.'}`;
    case 429:
      return '[RBE-RATE-429] Trop de requetes. Signification: limite anti-abus active. Action: patienter puis reessayer.';
    default:
      if (status >= 500) {
        return `[RBE-SRV-${status}] Erreur interne serveur (${method} ${url}). Signification: incident backend. Detail: ${serverMessage || 'Aucun detail serveur.'}`;
      }
      return `[RBE-API-${status || '000'}] Erreur API (${method} ${url}). Detail: ${serverMessage || 'Aucun detail serveur.'}`;
  }
};

const normalizeCaughtError = (error, method, url) => {
  const message = String(error?.message || 'Erreur inconnue');
  if (message.startsWith('[RBE-')) return error;

  if (error?.name === 'AbortError') {
    return new Error('[RBE-NET-408] Delai depasse. Signification: la requete a depasse le timeout configure.');
  }

  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(message)) {
    return new Error(`[RBE-NET-000] Incident reseau (${method} ${url}). Signification: API inaccessible, CORS, DNS ou connexion interrompue.`);
  }

  return new Error(`[RBE-CLI-000] Erreur client (${method} ${url}). Detail: ${message}`);
};

// Instance API client avec support JWT et gestion d'erreur améliorée
export const apiClient = {
  baseURL: API_BASE_URL,
  
  get: async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = token 
      ? getAuthHeaders(token, options)
      : getDefaultHeaders(options);

    logger.api(`GET ${API_BASE_URL}${url}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'GET',
        headers,
        ...options,
      });
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('🔒 Token expiré, redirection vers login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }

        const errorData = await parseResponse(response).catch(() => ({}));
        throw new Error(buildTrilogyErrorMessage({ status: response.status, errorData, method: 'GET', url }));
      }
      
      return await parseResponse(response);
    } catch (error) {
      const normalizedError = normalizeCaughtError(error, 'GET', url);
      console.error(`❌ Erreur GET ${url}:`, normalizedError.message);
      throw normalizedError;
    }
  },
  
  post: async (url, data, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = token 
      ? getMutationHeaders(token, options)
      : getDefaultHeaders(options);

    logger.api(`POST ${API_BASE_URL}${url}`, data);
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        ...options,
      });
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('🔒 Token expiré, redirection vers login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        
        const errorData = await parseResponse(response).catch(() => ({}));
        throw new Error(buildTrilogyErrorMessage({ status: response.status, errorData, method: 'POST', url }));
      }
      
      return await parseResponse(response);
    } catch (error) {
      const normalizedError = normalizeCaughtError(error, 'POST', url);
      console.error(`❌ Erreur POST ${url}:`, normalizedError.message);
      throw normalizedError;
    }
  },
  
  put: async (url, data, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = token 
      ? getMutationHeaders(token, options)
      : getDefaultHeaders(options);

    logger.api(`PUT ${API_BASE_URL}${url}`, data);
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        ...options,
      });
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('🔒 Token expiré, redirection vers login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        
        const errorData = await parseResponse(response).catch(() => ({}));
        throw new Error(buildTrilogyErrorMessage({ status: response.status, errorData, method: 'PUT', url }));
      }
      
      return await parseResponse(response);
    } catch (error) {
      const normalizedError = normalizeCaughtError(error, 'PUT', url);
      console.error(`❌ Erreur PUT ${url}:`, normalizedError.message);
      throw normalizedError;
    }
  },

  patch: async (url, data, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = token 
      ? getMutationHeaders(token, options)
      : getDefaultHeaders(options);

    logger.api(`PATCH ${API_BASE_URL}${url}`, data);
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
        ...options,
      });
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('🔒 Token expiré, redirection vers login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        
        const errorData = await parseResponse(response).catch(() => ({}));
        throw new Error(buildTrilogyErrorMessage({ status: response.status, errorData, method: 'PATCH', url }));
      }
      
      return await parseResponse(response);
    } catch (error) {
      const normalizedError = normalizeCaughtError(error, 'PATCH', url);
      console.error(`❌ Erreur PATCH ${url}:`, normalizedError.message);
      throw normalizedError;
    }
  },

  delete: async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = token 
      ? getMutationHeaders(token, options)
      : getDefaultHeaders(options);

    logger.api(`DELETE ${API_BASE_URL}${url}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'DELETE',
        headers,
        ...options,
      });
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('🔒 Token expiré, redirection vers login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        
        const errorData = await parseResponse(response).catch(() => ({}));
        throw new Error(buildTrilogyErrorMessage({ status: response.status, errorData, method: 'DELETE', url }));
      }
      
      // DELETE peut retourner du contenu ou être vide
      const contentLength = response.headers.get('content-length');
      if (contentLength === '0' || response.status === 204) {
        return { success: true };
      }
      
      return await parseResponse(response);
    } catch (error) {
      const normalizedError = normalizeCaughtError(error, 'DELETE', url);
      console.error(`❌ Erreur DELETE ${url}:`, normalizedError.message);
      throw normalizedError;
    }
  },

  /**
   * Upload multipart/form-data (fichiers)
   * @param {string} url - L'URL relative (ex: /team/:id/upload-avatar)
   * @param {FormData} formData - FormData contenant les fichiers
   * @param {object} options - Options supplémentaires
   */
  upload: async (url, formData, options = {}) => {
    const token = localStorage.getItem('token');
    
    // Pour les uploads multipart, ne pas définir Content-Type (navigateur le fait automatiquement avec boundary)
    const headers = {
      'Authorization': token ? `Bearer ${token}` : undefined,
      ...options.headers,
    };

    // Ajouter le token CSRF pour sécurité
    const csrfToken = getStoredCSRFToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
      logger.debug('CSRF token injected in upload headers');
    } else {
      console.warn('⚠️  No CSRF token available for upload - server may reject it');
    }

    // Retirer les clés undefined
    Object.keys(headers).forEach(key => {
      if (headers[key] === undefined) delete headers[key];
    });

    logger.api(`UPLOAD ${API_BASE_URL}${url}`);
    
    try {
      // Créer un AbortController pour gérer le timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, 60000); // Timeout de 60 secondes pour les uploads

      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
        ...options,
      });
      
      clearTimeout(timeout);
      console.log(`📡 Upload response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('🔒 Token expiré, redirection vers login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        
        const errorData = await parseResponse(response).catch(() => ({}));
        throw new Error(buildTrilogyErrorMessage({ status: response.status, errorData, method: 'UPLOAD', url }));
      }
      
      return await parseResponse(response);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ Upload timeout après 60 secondes');
        throw new Error('[RBE-UPL-408] Upload timeout. Signification: fichier trop volumineux ou connexion trop lente.');
      }
      const normalizedError = normalizeCaughtError(error, 'UPLOAD', url);
      console.error(`❌ Erreur UPLOAD ${url}:`, normalizedError.message);
      throw normalizedError;
    }
  }
};

export { API_BASE_URL };

