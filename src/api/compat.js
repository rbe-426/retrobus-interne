import apiAll, { authAPI as namedAuth, ensureSession as namedEnsure } from './index.js';

// Normalise authAPI
export const authAPI = namedAuth ?? apiAll?.auth ?? apiAll;

// Normalise ensureSession: toujours une fonction
export const ensureSession =
  (typeof namedEnsure === 'function' && namedEnsure) ||
  (authAPI && typeof authAPI.ensureSession === 'function' && authAPI.ensureSession.bind(authAPI)) ||
  (async () => true); // fallback soft, ne bloque pas /dashboard

export default { authAPI, ensureSession }