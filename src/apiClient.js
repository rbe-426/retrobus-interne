/**
 * apiClient.js - CLIENT HTTP CENTRALISÉ
 * ✅ Utilise authService comme source unique pour le token
 * ✅ Gère les tokens CSRF automatiquement
 * ✅ Tous les appels API passent par ici
 */

import { tokenManager, withAuthHeader } from './api/authService.js';
import { getStoredCSRFToken, storeCSRFToken, fetchCSRFToken, updateCSRFTokenFromResponse } from './lib/csrfClient.js';
import logger from './utils/logger.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '5173'
);

// TOUJOURS utiliser VITE_API_URL (Railway en production, localhost en dev)
// Ne jamais utiliser de chemins relatifs car Vercel ne sert que le frontend
const API_BASE_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');

console.log('🔧 API Client Configuration:', { 
  isLocal, 
  API_BASE_URL,
  env: import.meta.env?.MODE 
});

// ============================================================================
// HELPERS
// ============================================================================

const parseResponse = async (response) => {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const text = await response.text().catch(() => '');
    throw new Error(`Non-JSON: ${response.status}: ${text?.slice(0, 200)}`);
  }
  return response.json();
};

const buildUrl = (path) => {
  const cleanPath = String(path || '').replace(/^\/+/, '/');
  return `${API_BASE_URL}${cleanPath}`;
};

const buildHeaders = async (customHeaders = {}, includeCSRF = false) => {
  const token = tokenManager.getToken();
  const headers = withAuthHeader({
    'Accept': 'application/json',
    ...customHeaders
  }, token);

  // Ajouter le token CSRF si demandé (pour mutations)
  if (includeCSRF) {
    let csrfToken = getStoredCSRFToken();
    
    // Si pas de token CSRF, essayer d'en récupérer un
    if (!csrfToken) {
      console.warn('⚠️ CSRF token manquant, récupération automatique...');
      try {
        csrfToken = await fetchCSRFToken(API_BASE_URL);
        console.log('✅ CSRF token récupéré automatiquement');
      } catch (error) {
        console.error('❌ Impossible de récupérer le token CSRF:', error);
      }
    }
    
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return headers;
};

const handleHttpError = (response) => {
  if (response.status === 401) {
    console.warn('🔒 Unauthorized - clearing auth');
    tokenManager.setToken(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (response.status === 403) throw new Error('Forbidden');
  if (response.status === 404) return { notFound: true };
  throw new Error(`HTTP ${response.status}`);
};

// ============================================================================
// API CLIENT
// ============================================================================

export const apiClient = {
  async get(path, options = {}) {
    let url = buildUrl(path);
    
    // Gérer les paramètres query
    if (options.params) {
      const searchParams = new URLSearchParams(options.params);
      url = `${url}?${searchParams.toString()}`;
    }
    
    const headers = await buildHeaders(options.headers);
    logger.api(`GET ${url}`);
    try {
      const response = await fetch(url, { method: 'GET', headers, credentials: 'include', ...options });
      if (!response.ok) return handleHttpError(response);
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ GET ${path}:`, error.message);
      throw error;
    }
  },

  async post(path, body, options = {}) {
    const url = buildUrl(path);
    const headers = await buildHeaders({ 'Content-Type': 'application/json', ...options.headers }, true);
    logger.api(`POST ${url}`, body);
    try {
      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include', ...options });
      if (!response.ok) return handleHttpError(response);
      updateCSRFTokenFromResponse(response);
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ POST ${path}:`, error.message);
      throw error;
    }
  },

  async patch(path, body, options = {}) {
    const url = buildUrl(path);
    const headers = await buildHeaders({ 'Content-Type': 'application/json', ...options.headers }, true);
    logger.api(`PATCH ${url}`, body);
    try {
      const response = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body), credentials: 'include', ...options });
      if (!response.ok) return handleHttpError(response);
      updateCSRFTokenFromResponse(response);
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ PATCH ${path}:`, error.message);
      throw error;
    }
  },

  async put(path, body, options = {}) {
    const url = buildUrl(path);
    const headers = await buildHeaders({ 'Content-Type': 'application/json', ...options.headers }, true);
    logger.api(`PUT ${url}`, body);
    try {
      const response = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body), credentials: 'include', ...options });
      if (!response.ok) return handleHttpError(response);
      updateCSRFTokenFromResponse(response);
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ PUT ${path}:`, error.message);
      throw error;
    }
  },

  async delete(path, options = {}) {
    const url = buildUrl(path);
    const headers = await buildHeaders(options.headers, true);
    logger.api(`DELETE ${url}`);
    try {
      const response = await fetch(url, { method: 'DELETE', headers, credentials: 'include', ...options });
      if (!response.ok) return handleHttpError(response);
      updateCSRFTokenFromResponse(response);
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ DELETE ${path}:`, error.message);
      throw error;
    }
  },

  async upload(path, formData, options = {}) {
    const url = buildUrl(path);
    const token = tokenManager.getToken();
    const headers = withAuthHeader({}, token);
    
    // Ajouter le token CSRF (récupération auto si absent)
    let csrfToken = getStoredCSRFToken();
    if (!csrfToken) {
      console.warn('⚠️ CSRF token manquant pour upload, récupération automatique...');
      try {
        csrfToken = await fetchCSRFToken(API_BASE_URL);
        console.log('✅ CSRF token récupéré automatiquement pour upload');
      } catch (error) {
        console.error('❌ Impossible de récupérer le token CSRF pour upload:', error);
      }
    }
    
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    
    logger.api(`UPLOAD ${url}`);
    try {
      const response = await fetch(url, { method: 'POST', headers, body: formData, credentials: 'include', ...options });
      if (!response.ok) return handleHttpError(response);
      updateCSRFTokenFromResponse(response);
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ UPLOAD ${path}:`, error.message);
      throw error;
    }
  }
};

// Legacy support
export const fetchJson = async (path, options = {}) => {
  const method = options.method?.toUpperCase() || 'GET';
  if (method === 'GET') return apiClient.get(path, options);
  if (method === 'POST') return apiClient.post(path, options.body, options);
  if (method === 'PATCH') return apiClient.patch(path, options.body, options);
  if (method === 'DELETE') return apiClient.delete(path, options);
  throw new Error(`Unsupported: ${method}`);
};

export { API_BASE_URL, tokenManager };
export default apiClient;