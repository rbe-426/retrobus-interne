/**
 * Hook pour récupérer le nombre d'emails non lus
 */
import { useState, useEffect } from 'react';
import { fetchWithCSRF } from '../lib/csrfClient';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const useUnreadMailCount = (refreshInterval = 60000) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/mail/unread-count`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Erreur récupération count emails non lus:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Rafraîchir périodiquement
    const interval = setInterval(fetchUnreadCount, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { unreadCount, loading, refresh: fetchUnreadCount };
};
