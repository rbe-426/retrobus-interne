/**
 * Service RetroMerch - Client API pour la boutique
 * Fournit des fonctions pour interagir avec les endpoints RétroMerch
 */

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/retromerch`
  : 'http://localhost:4000/api/retromerch';

/**
 * Helper pour les requêtes authentifiées
 */
const makeRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('authToken');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token && options.requireAuth !== false) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return await response.json();
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
      body: JSON.stringify(productData)
    });
  },

  /**
   * Mettre à jour un produit
   */
  updateProduct: async (id, productData) => {
    return makeRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
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
      body: JSON.stringify(categoryData)
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
      body: JSON.stringify(orderData),
      requireAuth: false
    });
  },

  /**
   * Mettre à jour une commande
   */
  updateOrder: async (id, orderData) => {
    return makeRequest(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData)
    });
  },

  /**
   * Mettre à jour le statut d'une commande
   */
  updateOrderStatus: async (id, status) => {
    return makeRequest(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
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
  }
};

export default retromerchService;
