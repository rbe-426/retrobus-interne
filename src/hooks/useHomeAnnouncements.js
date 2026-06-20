import { useState, useEffect } from 'react';
import { homeAnnouncementsAPI } from '../api/homeAnnouncements';

export function useHomeAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await homeAnnouncementsAPI.getAll();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Erreur chargement annonces:', err);
      setError(err.message);
      try {
        const stored = localStorage.getItem('rbe:home-announcements');
        if (stored) {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr)) {
            const now = Date.now();
            const filtered = arr.filter(
              (a) => a && a.active && (!a.expiresAt || new Date(a.expiresAt).getTime() > now)
            );
            setAnnouncements(filtered);
          }
        }
      } catch (localErr) {
        console.warn('⚠️ Erreur fallback localStorage:', localErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const addAnnouncement = async (announcement) => {
    try {
      const created = await homeAnnouncementsAPI.create({
        severity: announcement.severity || 'INFO',
        title: announcement.title,
        message: announcement.message,
        dismissible: announcement.dismissible !== false,
        expiresAt: announcement.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        actions: announcement.actions || null
      });

      await loadAnnouncements();
      return created;
    } catch (err) {
      console.error('❌ Erreur création annonce:', err);
      throw err;
    }
  };

  const removeAnnouncement = async (id) => {
    try {
      await homeAnnouncementsAPI.delete(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('❌ Erreur suppression annonce:', err);
      await loadAnnouncements();
      throw err;
    }
  };

  const clearAll = async () => {
    try {
      const safeAnnouncements = Array.isArray(announcements) ? announcements : [];
      const deletePromises = safeAnnouncements.map((a) => homeAnnouncementsAPI.delete(a.id));
      await Promise.all(deletePromises);
      setAnnouncements([]);
    } catch (err) {
      console.error('❌ Erreur suppression toutes annonces:', err);
      await loadAnnouncements();
      throw err;
    }
  };

  return {
    announcements,
    loading,
    error,
    addAnnouncement,
    removeAnnouncement,
    clearAll,
    refresh: loadAnnouncements
  };
}
