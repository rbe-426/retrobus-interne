// Shared session cache so the Inéo operations popup can open already loaded.
const CACHE_KEY = 'ineo:ops:cache:v1';
const CACHE_TTL_MS = 2 * 60 * 1000;

export const readIneoLaunchCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.cachedAt || Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch { return null; }
};

export const writeIneoLaunchCache = (data) => {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() })); } catch { /* Storage can be unavailable in private mode. */ }
};
