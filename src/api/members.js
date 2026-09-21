import { fetchWithCSRF } from '../lib/csrfClient';
import { tokenManager } from './authService';

const BASE = (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, '');
const tokenHeader = () => {
  const t = tokenManager.getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const ensureJson = async (resp) => {
  const ct = (resp.headers.get('content-type') || '').toLowerCase();
  if (!(ct.includes('application/json') || ct.includes('+json'))) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Réponse non-JSON (${resp.status}) ${text?.slice(0, 200) || ''}`);
  }
};

const fetchWithTimeout = (url, init = {}, ms = 8000) => {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  return fetch(url, { ...init, signal: ac.signal }).finally(() => clearTimeout(id));
};

const toUrl = (path) => {
  const p = String(path || '').replace(/^\/+|\/+$/g, '');
  return BASE ? `${BASE}/${p}` : `/${p}`;
};

const MEMBERS_ENDPOINTS = ['api/members'];

async function tryEndpoints(method, body, extraHeaders) {
  let lastErr = null;
  for (const ep of MEMBERS_ENDPOINTS) {
    try {
      const url = toUrl(ep);
      const resp = await fetchWithTimeout(url, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': body instanceof FormData ? undefined : 'application/json',
          ...tokenHeader(),
          ...(extraHeaders || {}),
        },
        body: body == null
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      });
      if (!resp.ok) { lastErr = new Error(`HTTP ${resp.status}`); continue; }
      await ensureJson(resp);
      // Renvoie l’objet JSON natif
      return await resp.json();
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr || new Error('Aucun endpoint membre valide');
}

// Version avec protection CSRF pour les opérations mutantes (POST, PUT, PATCH, DELETE)
async function tryEndpointsWithCSRF(method, body, extraHeaders) {
  let lastErr = null;
  for (const ep of MEMBERS_ENDPOINTS) {
    try {
      const url = toUrl(ep);
      const resp = await fetchWithCSRF(url, {
        method,
        headers: {
          Accept: 'application/json',
          ...(extraHeaders || {}),
        },
        body: body == null
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      });
      if (!resp.ok) { 
        const errData = await resp.json().catch(() => ({}));
        const errorMsg = errData?.details || errData?.error || `HTTP ${resp.status}`;
        lastErr = new Error(errorMsg);
        lastErr.status = resp.status;
        lastErr.field = errData?.field;
        // Si c'est un conflit (409), on lance immédiatement l'erreur
        if (resp.status === 409) throw lastErr;
        continue; 
      }
      await ensureJson(resp);
      return await resp.json();
    } catch (e) {
      if (e?.status === 409) throw e;
      lastErr = e;
      continue;
    }
  }
  throw lastErr || new Error('Aucun endpoint membre valide');
}

export const membersAPI = {
  // Renvoie { members: [...] } pour s’adapter au code existant
  async getAll() {
    if (!tokenManager.getToken()) return { members: [] };
    try {
      const data = await tryEndpoints('GET');
      if (Array.isArray(data)) return { members: data };
      if (Array.isArray(data?.members)) return data;
      if (Array.isArray(data?.data)) return { members: data.data };
      // Normalisation minimale
      return { members: [] };
    } catch {
      return { members: [] };
    }
  },

  // Ping rapide pour le “mode dégradé”
  async testConnectivity() {
    const candidates = [
      toUrl('api/health'),
      toUrl('health'),
      toUrl(MEMBERS_ENDPOINTS[0])
    ];
    for (const u of candidates) {
      try {
        const r = await fetchWithTimeout(u, { method: 'GET', headers: { ...tokenHeader() } }, 3000);
        if (r.ok) return true;
      } catch {}
    }
    return false;
  },

  async create(member) {
    const res = await tryEndpointsWithCSRF('POST', member);
    return res?.member || res?.data || res;
  },

  async update(id, member) {
    let lastError = null;
    for (const endpoint of MEMBERS_ENDPOINTS) {
      try {
        const response = await fetchWithCSRF(toUrl(`${endpoint}/${encodeURIComponent(id)}`), {
          method: 'PUT',
          body: JSON.stringify(member)
        });
        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          return data?.member || data?.data || data;
        }

        const error = new Error(data?.details || data?.error || `HTTP ${response.status}`);
        error.status = response.status;
        if (response.status !== 404) throw error;
        lastError = error;
      } catch (error) {
        lastError = error;
        if (error?.status && error.status !== 404) throw error;
      }
    }

    throw lastError || new Error('Membre introuvable');
  },

  async delete(id) {
    const payload = { id };
    try {
      const out = await tryEndpointsWithCSRF('DELETE', payload);
      return out?.ok === true ? out : { ok: true };
    } catch (e) {
      // Certaines APIs n'acceptent pas de body en DELETE → fallback querystring
      for (const ep of MEMBERS_ENDPOINTS) {
        try {
          const url = toUrl(`${ep}/${encodeURIComponent(id)}`);
          const r = await fetchWithCSRF(url, { method: 'DELETE' });
          if (r.ok) return { ok: true };
        } catch {}
      }
      throw e;
    }
  },
};