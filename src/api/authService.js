/**
 * authService.js - Service d'authentification CENTRALISÉ
 * ✅ SOURCE UNIQUE DE VÉRITÉ pour l'auth dans toute l'appli
 * 
 * Tout token/user passe par ici
 * Tout appel API auth passe par ici
 * Tous les composants utilisent useUser() du context
 */

import { USERS } from './auth.js';

// ============================================================================
// CONFIGURATION CENTRALISÉE
// ============================================================================

const AUTH_CONFIG = {
  API_BASE: (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, ''),
  LOCAL_DEV_TOKEN_PREFIX: 'local-dev-token-',
  TOKEN_KEY: 'token',
  USER_KEY: 'user',
  CACHE_EXPIRY: 5 * 60 * 1000, // 5 minutes
  REQUEST_TIMEOUT_MS: 10000,
};

async function fetchWithTimeout(url, options = {}, timeoutMs = AUTH_CONFIG.REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  if (!token) return true;
  if (String(token).startsWith(AUTH_CONFIG.LOCAL_DEV_TOKEN_PREFIX)) return false;

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}

// ============================================================================
// GESTION TOKEN - SOURCE UNIQUE
// ============================================================================

class TokenManager {
  constructor() {
    this.token = null;
    this.listeners = [];
  }

  /**
   * Récupère le token COURANT (jamais directement de localStorage!)
   * Doit toujours passer par setToken() qui notifie les listeners
   */
  getToken() {
    if (this.token && isTokenExpired(this.token)) {
      this.setToken(null);
      return null;
    }
    return this.token;
  }

  /**
   * Définit le token ET l'enregistre
   */
  setToken(newToken) {
    this.token = newToken || null;
    if (newToken) {
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
      localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    }
    this.notifyListeners();
  }

  /**
   * Hydrate depuis localStorage au démarrage
   */
  hydrate() {
    const stored = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    this.token = stored || null;

    if (this.token && isTokenExpired(this.token)) {
      this.token = null;
      localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
      localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    }

    this.notifyListeners();
  }

  /**
   * Listeners pour les changements de token
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.token));
  }
}

export const tokenManager = new TokenManager();

// ============================================================================
// AUTH FUNCTIONS - CENTRALISÉES
// ============================================================================

/**
 * Connexion utilisateur - essaie API puis fallback local
 */
export async function login(username, password) {
  if (!username?.trim() || !password?.trim()) {
    throw new Error('Username et password requis');
  }

  // 1️⃣ Essayer l'API distante si configurée
  if (AUTH_CONFIG.API_BASE) {
    try {
      const response = await fetch(`${AUTH_CONFIG.API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        // Valider format réponse API
        if (data.token && data.user) {
          return data;
        }
      }
    } catch (e) {
      console.warn('⚠️ API distante unavailable, essai fallback local:', e.message);
    }
  }

  // 2️⃣ Fallback local (dev mode)
  return loginLocal(username, password);
}

/**
 * Login local (développement)
 */
function loginLocal(username, password) {
  const key = String(username || '').toLowerCase();
  const found = USERS[key];

  if (!found || found.password !== password) {
    throw new Error('Identifiants invalides');
  }

  return {
    token: `${AUTH_CONFIG.LOCAL_DEV_TOKEN_PREFIX}${key}`,
    user: {
      username: key,
      firstName: found.prenom,
      lastName: found.nom,
      email: found.email || `${key}@retrobus.fr`,
      roles: found.roles || ['MEMBER']
    }
  };
}

/**
 * Connexion membre (matricule/email + password)
 */
export async function memberLogin(identifier, password) {
  if (!identifier?.trim() || !password?.trim()) {
    throw new Error('Identifiant et password requis');
  }

  // 1️⃣ Essayer l'API distante si configurée
  if (AUTH_CONFIG.API_BASE) {
    try {
      const response = await fetch(`${AUTH_CONFIG.API_BASE}/auth/member-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token && data.user) {
          return data;
        }
      }
    } catch (e) {
      console.warn('⚠️ API distante unavailable, essai fallback local:', e.message);
    }
  }

  // 2️⃣ Fallback local
  return loginLocal(identifier, password);
}

/**
 * Valide la session auprès du serveur
 */
export async function validateSession(token) {
  if (!token) return false;

  // Dev tokens: toujours valides
  if (String(token).startsWith(AUTH_CONFIG.LOCAL_DEV_TOKEN_PREFIX)) {
    return true;
  }

  if (isTokenExpired(token)) {
    return false;
  }

  // JWT: vérifier auprès du serveur
  if (!AUTH_CONFIG.API_BASE) {
    return true; // Pas d'API => faire confiance au token
  }

  try {
    const res = await fetchWithTimeout(`${AUTH_CONFIG.API_BASE}/api/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    // Vérifier si utilisateur est désactivé
    if (data.disabled || data.active === false || data.status === 'DISABLED') {
      return false;
    }

    return true;
  } catch (e) {
    console.warn('❌ Session validation failed:', e.message);
    return false;
  }
}

// ============================================================================
// HELPERS - STATELESS
// ============================================================================

/**
 * Extrait le rôle principal d'un user
 */
export function getPrimaryRole(user) {
  if (!user) return 'GUEST';
  const roles = user.roles || [];
  return roles[0] || 'MEMBER';
}

/**
 * Extrait les rôles d'un user
 */
export function getRoles(user) {
  if (!user) return [];
  return user.roles || [];
}

/**
 * Construit le header Authorization
 */
export function getAuthHeader(token) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Ajoute les headers auth à un objet d'headers
 */
export function withAuthHeader(headers = {}, token) {
  if (!token) return headers;
  return {
    ...headers,
    ...getAuthHeader(token)
  };
}

// ============================================================================
// CACHE LOCAL - PERMISSIONS & DATA
// ============================================================================

/**
 * Cache storage helper
 */
export const StorageManager = {
  /**
   * Clé unique par user
   */
  makeKey(prefix, userId) {
    return `${prefix}_${userId}`;
  },

  /**
   * Récupère une valeur du cache si elle est fraîche
   */
  getIfFresh(key, expiryMs = AUTH_CONFIG.CACHE_EXPIRY) {
    try {
      const data = localStorage.getItem(key);
      const timestamp = localStorage.getItem(`${key}:ts`);

      if (!data || !timestamp) return null;

      const age = Date.now() - parseInt(timestamp);
      if (age > expiryMs) {
        this.remove(key);
        return null;
      }

      return JSON.parse(data);
    } catch (e) {
      console.warn(`❌ getIfFresh(${key}) error:`, e.message);
      return null;
    }
  },

  /**
   * Enregistre une valeur en cache
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(`${key}:ts`, Date.now().toString());
    } catch (e) {
      console.warn(`❌ StorageManager.set(${key}) error:`, e.message);
    }
  },

  /**
   * Supprime une clé
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}:ts`);
    } catch (e) {
      console.warn(`❌ StorageManager.remove(${key}) error:`, e.message);
    }
  },

  /**
   * Vide tout le cache app
   */
  clearAppCache() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Garder: token, user. Supprimer: tout ce qui est cache
      if (!['token', 'user'].includes(key) && !key.includes('pointage')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
};

export default {
  AUTH_CONFIG,
  tokenManager,
  login,
  memberLogin,
  validateSession,
  getPrimaryRole,
  getRoles,
  getAuthHeader,
  withAuthHeader,
  StorageManager
};
