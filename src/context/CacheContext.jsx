/**
 * Context de cache pour optimiser les performances
 * Évite de recharger les mêmes données trop fréquemment
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

const CacheContext = createContext();

// Durée de validité du cache par défaut (5 minutes)
const DEFAULT_TTL = 5 * 60 * 1000;

export function CacheProvider({ children }) {
  const [cache, setCache] = useState({});

  /**
   * Récupérer une valeur du cache
   * @param {string} key - Clé du cache
   * @returns {any|null} - Valeur en cache ou null si expirée/inexistante
   */
  const get = useCallback((key) => {
    const item = cache[key];
    if (!item) return null;
    
    const now = Date.now();
    if (now > item.expiresAt) {
      // Cache expiré, le supprimer
      setCache(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return null;
    }
    
    console.log(`📦 Cache HIT: ${key}`);
    return item.data;
  }, [cache]);

  /**
   * Définir une valeur dans le cache
   * @param {string} key - Clé du cache
   * @param {any} data - Données à mettre en cache
   * @param {number} ttl - Durée de validité en ms (défaut: 5 min)
   */
  const set = useCallback((key, data, ttl = DEFAULT_TTL) => {
    const now = Date.now();
    console.log(`💾 Cache SET: ${key} (TTL: ${ttl / 1000}s)`);
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        expiresAt: now + ttl,
        createdAt: now
      }
    }));
  }, []);

  /**
   * Invalider une clé du cache
   * @param {string} key - Clé à invalider
   */
  const invalidate = useCallback((key) => {
    console.log(`🗑️ Cache INVALIDATE: ${key}`);
    setCache(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  /**
   * Vider tout le cache
   */
  const clear = useCallback(() => {
    console.log('🗑️ Cache CLEAR ALL');
    setCache({});
  }, []);

  /**
   * Fetch avec cache automatique
   * @param {string} key - Clé du cache
   * @param {Function} fetcher - Fonction async qui retourne les données
   * @param {number} ttl - Durée de validité en ms
   * @returns {Promise<any>} - Données (depuis cache ou fetcher)
   */
  const fetchWithCache = useCallback(async (key, fetcher, ttl = DEFAULT_TTL) => {
    // Vérifier le cache d'abord
    const cached = get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Sinon, fetcher et mettre en cache
    console.log(`🔄 Cache MISS: ${key} - Fetching...`);
    const data = await fetcher();
    set(key, data, ttl);
    return data;
  }, [get, set]);

  return (
    <CacheContext.Provider value={{ get, set, invalidate, clear, fetchWithCache }}>
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache doit être utilisé dans un CacheProvider');
  }
  return context;
}
