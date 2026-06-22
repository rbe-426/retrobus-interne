import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { normalizeRole as normRole } from '../lib/roles';
import ForcePasswordChange from '../components/ForcePasswordChange';
import { tokenManager, StorageManager, validateSession } from '../api/authService.js';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import logger from '../utils/logger';

const UserContext = createContext(null);

const configuredSessionTimeout = Number.parseInt(import.meta?.env?.VITE_SESSION_TIMEOUT_MINUTES || '60', 10);
const SESSION_TIMEOUT_MINUTES = Number.isFinite(configuredSessionTimeout) && configuredSessionTimeout > 0
  ? configuredSessionTimeout
  : 60;

export function UserProvider({ children }) {
  // Hydrate depuis authService qui lui-même lit depuis localStorage
  const [token, setToken] = useState(() => {
    tokenManager.hydrate();
    return tokenManager.getToken() || '';
  });
  
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const isAuthenticated = !!token;

  // Member profile (self)
  const [member, setMember] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState(null);
  const [memberApiBase, setMemberApiBase] = useState(null);
  const [memberDataReady, setMemberDataReady] = useState(false); // Indique que les données sont complètes
  const lastMemberFetchRef = useRef(0);

  // Individual permissions
  const [customPermissions, setCustomPermissions] = useState(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // ✅ Synchroniser le state local avec authService
  useEffect(() => {
    const unsub = tokenManager.subscribe((newToken) => {
      setToken(newToken || '');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  // ✅ Wrapper pour setToken qui met aussi à jour authService
  const updateToken = (newToken) => {
    tokenManager.setToken(newToken);
    setToken(newToken || '');
  };

  const logout = () => {
    tokenManager.setToken(null);
    setToken('');
    setUser(null);
    setMember(null);
    setMemberError(null);
    setMemberApiBase(null);
    setMemberDataReady(false);
    localStorage.removeItem('user');
    StorageManager.clearAppCache();
  };

  // ✅ Valider la session via authService
  const ensureSession = async () => {
    if (!token) {
      setUser(null);
      setSessionChecked(true);
      return false;
    }

    const isValid = await validateSession(token);
    setSessionChecked(true);

    if (!isValid) {
      logout();
      return false;
    }

    return true;
  };

  const apiCandidates = () => {
    const base = (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, '');
    const arr = [];
    if (base) arr.push(base);
    arr.push(''); // same-origin
    return arr;
  };

  const refreshMember = async (force = false) => {
    if (!token) { 
      logger.debug('refreshMember: no token');
      setMember(null); 
      setMemberError('no-token'); 
      setMemberDataReady(true);
      return null; 
    }
    logger.debug('refreshMember: token found, calling API...');
    // simple throttle to avoid spamming
    const now = Date.now();
    if (!force && (now - lastMemberFetchRef.current < 500)) {
      logger.debug('refreshMember: throttled, skip');
      return member;
    }
    lastMemberFetchRef.current = now;

    setMemberLoading(true);
    setMemberError(null);
    try {
      const candidates = apiCandidates();
      logger.debug('API candidates:', candidates);
      let ok = false;
      let lastStatus = null;
      let data = null;
      for (const base of candidates) {
        try {
          const url = `${base}/api/members/me`;
          logger.debug('Attempt:', url);
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          lastStatus = res.status;
          logger.debug(`Response status: ${res.status}`);
          if (res.ok) {
            data = await res.json();
            logger.debug('Raw data received');
            // L'API retourne {member: {...}}, extraire le contenu
            const memberData = data.member || data;
            logger.debug('Member data extracted');
            setMember(memberData);
            setMemberApiBase(base || null);
            setMemberDataReady(true); // Marquer comme complètes
            ok = true;
            break;
          }
        } catch (e) {
          lastStatus = 'network';
          logger.error('Network error:', e.message);
          continue;
        }
      }
      if (!ok) {
        logger.warn('No endpoint succeeded. lastStatus:', lastStatus);
        setMember(null);
        setMemberError(lastStatus);
        setMemberDataReady(true); // Marquer comme "traité" même en cas d'erreur
        return null;
      }
      return data;  // ✅ Retourner `data` au lieu de `member` (qui n'est pas encore mis à jour)
    } finally {
      setMemberLoading(false);
    }
  };

  // Load individual user permissions from backend
  const refreshPermissions = async () => {
    if (!user?.id || !token) {
      setCustomPermissions(null);
      return null;
    }

    setPermissionsLoading(true);
    try {
      const candidates = apiCandidates();
      for (const base of candidates) {
        try {
          const res = await fetch(`${base}/api/admin/users/${user.id}/permissions`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            // New API returns { permissions: [...] } array format
            const perms = (data.permissions && Array.isArray(data.permissions) && data.permissions.length > 0) 
              ? data.permissions 
              : null;
            setCustomPermissions(perms);
            return perms;
          }
        } catch (e) {
          continue;
        }
      }
      setCustomPermissions(null);
      return null;
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Revalidation au chargement
  useEffect(() => {
    // On ne bloque pas le démarrage si pas de token
    ensureSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revalidation quand le token change
  useEffect(() => {
    if (token) {
      console.log('🔑 Token trouvé, appel ensureSession...');
      ensureSession().then((ok) => {
        if (ok) {
          console.log('✅ Session valide, appel refreshMember...');
          refreshMember();
          refreshPermissions();
          // Also refresh user info from /api/me to get the role
          const apiCandidates = () => {
            const base = (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, '');
            const arr = [];
            if (base) arr.push(base);
            arr.push(''); // same-origin
            return arr;
          };
          const candidates = apiCandidates();
          for (const base of candidates) {
            fetch(`${base}/api/me`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then(res => res.ok ? res.json() : null)
              .then(data => {
                if (data?.user) {
                  setUser(prev => ({ ...prev, ...data.user }));
                }
              })
              .catch(() => null);
          }
        }
      });
    } else {
      setSessionChecked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Revalidation: à chaque regain de focus et périodiquement
  useEffect(() => {
    const onFocus = () => ensureSession();
    window.addEventListener('focus', onFocus);
    const id = setInterval(() => ensureSession(), 5 * 60 * 1000); // toutes les 5 min
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ✅ Gérer la déconnexion par inactivité et fermeture d'onglet (seulement si authentifié)
  useSessionTimeout(logout, { inactivityMinutes: SESSION_TIMEOUT_MINUTES, enabled: isAuthenticated });

  const username = user?.username || '';
  const prenom = user?.prenom || user?.firstName || '';
  const nom = user?.nom || user?.lastName || '';
  // Backend returns 'role' as a string; normalize to 'roles' array for internal consistency
  // If old API returns 'roles' array, use it; otherwise convert 'role' string to array
  const rolesArray = user?.roles || (user?.role ? [user.role] : []);
  const roles = rolesArray.map(r => normRole(r)); // normRole handles case normalization
  const isAdmin = roles.includes('ADMIN') || roles.includes('PRESIDENT') || roles.includes('VICE_PRESIDENT') || roles.includes('TRESORIER') || roles.includes('SECRETAIRE_GENERAL');
  const isVolunteer = roles.includes('VOLUNTEER');
  const isDriver = roles.includes('DRIVER');
  const isMember = roles.includes('MEMBER');
  const matricule = user?.username || user?.email || user?.id || '';

  const value = useMemo(
    () => ({
      token,
      setToken: updateToken,
      user,
      setUser,
      isAuthenticated,
      username,
      prenom,
      nom,
      roles,
      isAdmin,
  isVolunteer,
  isDriver,
  isMember,
      matricule,
      logout,
      // NEW: exposer le statut de session et l’action
      sessionChecked,
      ensureSession,
      // Member self profile
      member,
      memberLoading,
      memberError,
      memberApiBase,
      memberDataReady,
      refreshMember,
      // Individual permissions
      customPermissions,
      permissionsLoading,
      refreshPermissions,
    }),
    [token, user, isAuthenticated, username, prenom, nom, roles, isAdmin, isVolunteer, isDriver, isMember, matricule, sessionChecked, member, memberLoading, memberError, memberApiBase, memberDataReady, customPermissions, permissionsLoading]
  );

  return (
    <UserContext.Provider value={value}>
      {children}
      <ForcePasswordChange
        isOpen={mustChangePassword}
        onPasswordChanged={() => {
          setMustChangePassword(false);
          if (token) ensureSession();
        }}
      />
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    console.error('❌ useUser() called outside UserProvider - returning safe default');
    // Retourner un objet par défaut pour éviter les crashes
    return {
      token: null,
      setToken: () => {},
      user: null,
      setUser: () => {},
      isAuthenticated: false,
      username: '',
      prenom: '',
      nom: '',
      roles: [],
      isAdmin: false,
      isVolunteer: false,
      isDriver: false,
      isMember: false,
      matricule: '',
      logout: () => {},
      sessionChecked: false,
      ensureSession: async () => false,
      member: null,
      memberLoading: false,
      memberError: null,
      memberApiBase: null,
      memberDataReady: false,
      refreshMember: async () => null,
      customPermissions: null,
      permissionsLoading: false,
      refreshPermissions: async () => null,
    };
  }
  return ctx;
}