
export const authAPI =
  namedAuth ?? apiAll?.auth ?? apiAll ?? {};

export const ensureSession =
  (typeof namedEnsure === 'function' && namedEnsure) ||
  (authAPI && typeof authAPI.ensureSession === 'function' && authAPI.ensureSession.bind(authAPI)) ||
  (async () => true); // fallback safe

export default { authAPI, ensureSession };