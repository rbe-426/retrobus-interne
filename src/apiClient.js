/**
 * apiClient.js - CLIENT HTTP CENTRALISÉ
 * ✅ Utilise authService comme source unique pour le token
 * ✅ Tous les appels API passent par ici
 */

import { tokenManager, withAuthHeader } from './api/authService.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '5173'
);

// In production, use relative paths (Vercel rewrites /api/* to backend)
// In dev, use VITE_API_URL for local backend
const API_BASE_URL = (
  isLocal
    ? (import.meta.env?.VITE_API_URL || '')
    : '' // Empty = relative paths, Vercel handles rewrites
).replace(/\/$/, '');

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

const buildHeaders = (customHeaders = {}) => {
  const token = tokenManager.getToken();
  return withAuthHeader({
    'Accept': 'application/json',
    ...customHeaders
  }, token);
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
    const url = buildUrl(path);
    const headers = buildHeaders(options.headers);
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
    const headers = buildHeaders({ 'Content-Type': 'application/json', ...options.headers });
    logger.api(`POST ${url}`, body);
    try {
      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include', ...options });
      if (!response.ok) return handleHttpError(response);
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ POST ${path}:`, error.message);
      throw error;
    }
  },

  async patch(path, body, options = {}) {
    const url = buildUrl(path);
    const headers = buildHeaders({ 'Content-Type': 'application/json', ...options.headers });
    logger.api(`PATCH ${url}`, body);
    try {
      const response = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body), credentials: 'include', ...options });
      if (!response.ok) return handleHttpError(response);
      return await parseResponse(response);
    } catch (error) {
      console.error(`❌ PATCH ${path}:`, error.message);
      throw error;
    }
  },

  async delete(path, options = {}) {
    const url = buildUrl(path);
    const headers = buildHeaders(options.headers);
    logger.api(`DELETE ${url}`);
    try {
      const response = await fetch(url, { method: 'DELETE', headers, credentials: 'include', ...options });
      if (!response.ok) return handleHttpError(response);
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
    logger.api(`UPLOAD ${url}`);
    try {
      const response = await fetch(url, { method: 'POST', headers, body: formData, credentials: 'include', ...options });
      if (!response.ok) return handleHttpError(response);
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