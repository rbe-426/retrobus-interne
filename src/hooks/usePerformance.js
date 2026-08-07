/**
 * Hook optimisé pour gérer les appels API avec cache et debouncing
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { cachedAPICall, debounce } from '../lib/performanceUtils';

/**
 * Hook pour charger des données avec cache automatique
 */
export function useCachedAPI(apiFunc, cacheKey, options = {}) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes par défaut
    dependencies = [],
    enabled = true,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await cachedAPICall(cacheKey, apiFunc, ttl);
      
      if (mountedRef.current) {
        setData(result);
        if (onSuccess) onSuccess(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        if (onError) onError(err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [apiFunc, cacheKey, ttl, enabled, onSuccess, onError]);

  useEffect(() => {
    fetchData();
    
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    // Invalider le cache avant de recharger
    const { apiCache } = require('../lib/performanceUtils');
    apiCache.delete(cacheKey);
    fetchData();
  }, [cacheKey, fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Hook pour debouncer une valeur
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook pour throttler une fonction
 */
export function useThrottle(callback, delay = 1000) {
  const lastRun = useRef(Date.now());

  return useCallback((...args) => {
    const now = Date.now();
    
    if (now - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = now;
    }
  }, [callback, delay]);
}

/**
 * Hook pour charger des données en batch
 */
export function useBatchLoader(items, loaderFunc, options = {}) {
  const {
    batchSize = 10,
    delay = 100,
    enabled = true
  } = options;

  const [loadedItems, setLoadedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !items || items.length === 0) return;

    let cancelled = false;
    setLoading(true);

    const loadBatches = async () => {
      const results = [];

      for (let i = 0; i < items.length; i += batchSize) {
        if (cancelled) break;

        const batch = items.slice(i, i + batchSize);
        
        try {
          const batchResults = await Promise.all(
            batch.map(item => loaderFunc(item))
          );
          
          results.push(...batchResults);
          
          if (!cancelled) {
            setLoadedItems([...results]);
          }

          // Pause entre les batches
          if (i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (err) {
          if (!cancelled) {
            setError(err);
          }
          break;
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    loadBatches();

    return () => {
      cancelled = true;
    };
  }, [items, loaderFunc, batchSize, delay, enabled]);

  return { loadedItems, loading, error };
}

/**
 * Hook pour précharger des ressources
 */
export function usePreload(resources, condition = true) {
  useEffect(() => {
    if (!condition) return;

    // Précharger les images
    const images = resources.filter(r => r.type === 'image');
    images.forEach(({ url }) => {
      const img = new Image();
      img.src = url;
    });

    // Précharger les données
    const data = resources.filter(r => r.type === 'data');
    data.forEach(({ loader }) => {
      if (typeof loader === 'function') {
        loader();
      }
    });
  }, [resources, condition]);
}

/**
 * Hook pour détecter les connexions lentes
 */
export function useConnectionSpeed() {
  const [connectionSpeed, setConnectionSpeed] = useState('unknown');

  useEffect(() => {
    if (!navigator.connection) {
      setConnectionSpeed('unknown');
      return;
    }

    const updateConnection = () => {
      const connection = navigator.connection;
      const effectiveType = connection.effectiveType;
      
      if (['slow-2g', '2g'].includes(effectiveType)) {
        setConnectionSpeed('slow');
      } else if (effectiveType === '3g') {
        setConnectionSpeed('medium');
      } else {
        setConnectionSpeed('fast');
      }
    };

    updateConnection();

    navigator.connection.addEventListener('change', updateConnection);

    return () => {
      navigator.connection.removeEventListener('change', updateConnection);
    };
  }, []);

  return connectionSpeed;
}
