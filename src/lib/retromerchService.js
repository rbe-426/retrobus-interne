/**
 * Service RetroMerch - Client API pour la boutique
 * Fournit des fonctions pour interagir avec les endpoints RétroMerch
 */

import { fetchWithCSRF } from './csrfClient';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/retromerch`
  : 'http://localhost:8080/api/retromerch';

/**
 * Helper pour les requêtes authentifiées avec CSRF
 */
const makeRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  
  // Pour les requêtes GET publiques, pas besoin de CSRF
  if (options.method === undefined || options.method === 'GET') {
    if (options.requireAuth === false) {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `API Error: ${response.status}`);
      }
      
      return await response.json();
    }
  }

  // Pour toutes les autres requêtes (mutations), utiliser fetchWithCSRF
  try {
    const response = await fetchWithCSRF(url, {
      method: options.method || 'GET',
      ...(options.body && { 
        body: typeof options.body === 'string' 
          ? options.body 
          : JSON.stringify(options.body) 
      }),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    return response;
  } catch (error) {
    console.error('❌ API Error:', error.message);
    throw error;
  }
};

// ============================================================================
// PRODUITS
// ============================================================================

export const retromerchService = {
  // ========== PRODUITS ==========
  /**
   * Récupérer tous les produits
   */
  getProducts: async () => {
    return makeRequest('/products', { requireAuth: false });
  },

  /**
   * Récupérer un produit par ID
   */
  getProduct: async (id) => {
    return makeRequest(`/products/${id}`, { requireAuth: false });
  },

  /**
   * Créer un nouveau produit
   */
  createProduct: async (productData) => {
    return makeRequest('/products', {
      method: 'POST',
      body: productData
    });
  },

  /**
   * Mettre à jour un produit
   */
  updateProduct: async (id, productData) => {
    return makeRequest(`/products/${id}`, {
      method: 'PUT',
      body: productData
    });
  },

  /**
   * Supprimer un produit
   */
  deleteProduct: async (id) => {
    return makeRequest(`/products/${id}`, {
      method: 'DELETE'
    });
  },

  // ========== CATÉGORIES ==========
  /**
   * Récupérer toutes les catégories
   */
  getCategories: async () => {
    return makeRequest('/categories', { requireAuth: false });
  },

  /**
   * Créer une nouvelle catégorie
   */
  createCategory: async (categoryData) => {
    return makeRequest('/categories', {
      method: 'POST',
      body: categoryData
    });
  },

  // ========== COMMANDES ==========
  /**
   * Récupérer toutes les commandes
   */
  getOrders: async () => {
    return makeRequest('/orders');
  },

  /**
   * Récupérer une commande par ID
   */
  getOrder: async (id) => {
    return makeRequest(`/orders/${id}`, { requireAuth: false });
  },

  /**
   * Créer une nouvelle commande
   */
  createOrder: async (orderData) => {
    return makeRequest('/orders', {
      method: 'POST',
      body: orderData,
      requireAuth: false
    });
  },

  /**
   * Mettre à jour une commande
   */
  updateOrder: async (id, orderData) => {
    return makeRequest(`/orders/${id}`, {
      method: 'PUT',
      body: orderData
    });
  },

  /**
   * Mettre à jour le statut d'une commande
   */
  updateOrderStatus: async (id, status) => {
    return makeRequest(`/orders/${id}/status`, {
      method: 'PUT',
      body: { status }
    });
  },

  /**
   * Supprimer une commande
   */
  deleteOrder: async (id) => {
    return makeRequest(`/orders/${id}`, {
      method: 'DELETE'
    });
  },

  // ========== STATISTIQUES ==========
  /**
   * Récupérer les statistiques
   */
  getStats: async () => {
    return makeRequest('/stats', { requireAuth: false });
  },

  // ========== CONFIGURATION DU SITE ==========
  /**
   * Récupérer toute la configuration du site
   */
  getSiteConfig: async () => {
    return makeRequest('/site-config', { requireAuth: false });
  },

  /**
   * Récupérer une config spécifique par clé
   */
  getSiteConfigByKey: async (key) => {
    return makeRequest(`/site-config/${key}`, { requireAuth: false });
  },

  /**
   * Créer ou mettre à jour une config
   */
  updateSiteConfig: async (key, value, isActive = true) => {
    return makeRequest(`/site-config/${key}`, {
      method: 'PUT',
      body: { value, isActive }
    });
  },

  /**
   * Supprimer une config
   */
  deleteSiteConfig: async (key) => {
    return makeRequest(`/site-config/${key}`, {
      method: 'DELETE'
    });
  }
};

export default retromerchService;
