/**
 * NotificationCenter.jsx
 * 
 * Composant de gestion des notifications internes
 * - Affiche un badge avec le nombre de notifications actives
 * - Popup pour voir les notifications du système
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Bell, X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { notificationsAPI } from '../api/notifications';
import './NotificationCenter.css';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Récupérer les notifications actives
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationsAPI.getInbox();
      
      if (Array.isArray(data)) {
        // Filtrer les notifications actives
        const activeNotifications = data.filter(n => n.active !== false);
        setNotifications(activeNotifications);
        // Compter les notifications importants (priorité high)
        const importantCount = activeNotifications.filter(n => n.priority === 'high').length;
        setUnreadCount(importantCount > 0 ? importantCount : activeNotifications.length);
      }
    } catch (error) {
      console.error('❌ Erreur récupération notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialisation et polling
  useEffect(() => {
    fetchNotifications();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Supprimer une notification
  const handleDeleteNotification = async (notifId, e) => {
    e.stopPropagation(); // Empêcher la fermeture du popup
    try {
      await notificationsAPI.delete(notifId);
      // Rafraîchir la liste
      await fetchNotifications();
    } catch (error) {
      console.error('❌ Erreur suppression notification:', error);
    }
  };

  // Icône en fonction du type de notification
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertTriangle size={16} style={{ color: '#f56565' }} />;
      case 'success':
        return <CheckCircle size={16} style={{ color: '#48bb78' }} />;
      case 'warning':
        return <AlertTriangle size={16} style={{ color: '#ed8936' }} />;
      default:
        return <Info size={16} style={{ color: '#4299e1' }} />;
    }
  };

  // Badge de priorité
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#f56565';
      case 'normal':
        return '#ed8936';
      case 'low':
        return '#4299e1';
      default:
        return '#718096';
    }
  };

  return (
    <div className="notification-center">
      {/* Bouton cloche */}
      <button
        className="bell-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        style={{ position: 'relative' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span 
            className="badge" 
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: '#f56565',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popup de notifications */}
      {isOpen && (
        <div 
          className="notification-popup"
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            marginTop: '10px',
            width: '350px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '500px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* En-tête */}
          <div 
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              Notifications {notifications.length > 0 && `(${notifications.length})`}
            </h3>
            <button 
              className="close-button" 
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Contenu */}
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 0'
            }}
          >
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#a0aec0' }}>
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#a0aec0' }}>
                <Bell size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>Aucune notification</p>
              </div>
            ) : (
              <div>
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #edf2f7',
                      borderLeft: `4px solid ${getPriorityColor(notif.priority)}`,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ marginTop: '2px', flexShrink: 0 }}>
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 'bold',
                          fontSize: '13px',
                          marginBottom: '4px',
                          color: '#2d3748'
                        }}>
                          {notif.title}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#718096',
                          lineHeight: '1.4',
                          marginBottom: '4px'
                        }}>
                          {notif.message}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#a0aec0'
                        }}>
                          {formatTime(new Date(notif.createdAt))}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNotification(notif.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: '#a0aec0',
                          flexShrink: 0,
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#f56565'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#a0aec0'}
                        title="Supprimer la notification"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Formate un timestamp relatif
 */
function formatTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}j`;

  return date.toLocaleDateString('fr-FR');
}
