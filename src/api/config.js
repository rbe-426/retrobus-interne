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
      throw new Error('Réponse JSON invalide du serveur');
    }
  } else {
    // Si ce n'est pas du JSON, récupérer le texte pour débogage
    const text = await response.text();
    console.error('❌ Réponse non-JSON reçue:', text.substring(0, 200) + '...');
    
    if (text.includes('<!DOCTYPE')) {
      throw new Error('Le serveur a renvoyé une page HTML au lieu de JSON. Vérifiez l\'URL de l\'API.');
    } else {
      throw new Error(`Réponse inattendue du serveur (${response.status}): ${text.substring(0, 100)}`);
    }
  }
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
        
        // Essayer de récupérer le message d'erreur du serveur
        const errorData = await parseResponse(response);
        const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ Erreur GET ${url}:`, error.message);
      throw error;
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
        
        if (response.status === 403) {
          const errorData = await parseResponse(response);
          if (errorData?.code === 'CSRF_MISSING' || errorData?.code === 'CSRF_INVALID') {
            console.error('🔐 CSRF validation failed:', errorData.error);
            throw new Error('Erreur de sécurité CSRF - Veuillez vous reconnecter');
          }
        }
        
        // Essayer de récupérer le message d'erreur du serveur
        const errorData = await parseResponse(response);
        const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ Erreur POST ${url}:`, error.message);
      throw error;
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
        
        if (response.status === 403) {
          const errorData = await parseResponse(response);
          if (errorData?.code === 'CSRF_MISSING' || errorData?.code === 'CSRF_INVALID') {
            console.error('🔐 CSRF validation failed:', errorData.error);
            throw new Error('Erreur de sécurité CSRF - Veuillez vous reconnecter');
          }
        }

        const errorData = await parseResponse(response);
        const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ Erreur PUT ${url}:`, error.message);
      throw error;
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
        
        if (response.status === 403) {
          const errorData = await parseResponse(response);
          if (errorData?.code === 'CSRF_MISSING' || errorData?.code === 'CSRF_INVALID') {
            console.error('🔐 CSRF validation failed:', errorData.error);
            throw new Error('Erreur de sécurité CSRF - Veuillez vous reconnecter');
          }
        }
        
        const errorData = await parseResponse(response);
        const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ Erreur PATCH ${url}:`, error.message);
      throw error;
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
        
        if (response.status === 403) {
          const errorData = await parseResponse(response);
          if (errorData?.code === 'CSRF_MISSING' || errorData?.code === 'CSRF_INVALID') {
            console.error('🔐 CSRF validation failed:', errorData.error);
            throw new Error('Erreur de sécurité CSRF - Veuillez vous reconnecter');
          }
        }
        
        const errorData = await parseResponse(response);
        const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      // DELETE peut retourner du contenu ou être vide
      const contentLength = response.headers.get('content-length');
      if (contentLength === '0' || response.status === 204) {
        return { success: true };
      }
      
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ Erreur DELETE ${url}:`, error.message);
      throw error;
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
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers,
        body: formData,
        ...options,
      });
      
      console.log(`📡 Upload response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('🔒 Token expiré, redirection vers login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        
        if (response.status === 403) {
          const errorData = await parseResponse(response);
          if (errorData?.code === 'CSRF_MISSING' || errorData?.code === 'CSRF_INVALID') {
            console.error('🔐 CSRF validation failed:', errorData.error);
            throw new Error('Erreur de sécurité CSRF - Veuillez vous reconnecter');
          }
        }
        
        // Essayer de récupérer le message d'erreur du serveur
        const errorData = await parseResponse(response);
        const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ Erreur UPLOAD ${url}:`, error.message);
      throw error;
    }
  }
};

export { API_BASE_URL };

