import { fetchWithCSRF } from './csrfClient.js';

export const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

// Carnet partagé (base de données) : copie en mémoire pour des recherches synchrones
let book = [];
let loadPromise = null;

const toEntry = (row) => ({
  id: row.id, name: row.name, address: row.address,
  lat: Number.isFinite(row.lat) ? row.lat : undefined,
  lng: Number.isFinite(row.lng) ? row.lng : undefined
});

export const loadAddressBook = () => book;

export const refreshAddressBook = async () => {
  try {
    const res = await fetchWithCSRF('/api/finance/addresses');
    if (res.ok) book = (await res.json()).map(toEntry);
  } catch {
    // carnet indisponible : on garde la copie précédente
  }
  return book;
};

export const ensureAddressBook = () => {
  if (!loadPromise) loadPromise = refreshAddressBook();
  return loadPromise;
};

export const saveAddress = async ({ name, address, lat, lng }) => {
  const res = await fetchWithCSRF('/api/finance/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, address, lat, lng })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error([err.error, err.details].filter(Boolean).join(' : ') || "Enregistrement de l'adresse impossible");
  }
  return refreshAddressBook();
};

export const removeAddress = async (id) => {
  const res = await fetchWithCSRF(`/api/finance/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error("Suppression de l'adresse impossible");
  return refreshAddressBook();
};

export const searchAddressBook = (query, limit = 5) => {
  const q = normalizeText(query);
  if (!q) return book.slice(0, limit);
  return book.filter(e => normalizeText(`${e.name} ${e.address}`).includes(q)).slice(0, limit);
};

export const findBookEntry = (text) => {
  const q = normalizeText(text);
  if (!q) return null;
  return book.find(e => normalizeText(e.name) === q || normalizeText(e.address) === q) || null;
};
