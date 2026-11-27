import { DEFAULT_ADDRESSES } from '../config/addressBook.js';

const STORAGE_KEY = 'urbex.addressBook.v1';

export const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const readCustom = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Carnet = adresses pré-définies (config) + adresses enregistrées sur ce navigateur. */
export const loadAddressBook = () => [
  ...DEFAULT_ADDRESSES.map(entry => ({ ...entry, builtin: true })),
  ...readCustom().map(entry => ({ ...entry, builtin: false }))
];

export const saveAddress = ({ name, address, lat, lng }) => {
  const cleanName = String(name || '').trim();
  const cleanAddress = String(address || '').trim();
  if (!cleanName || !cleanAddress) return loadAddressBook();
  const entry = { name: cleanName, address: cleanAddress };
  if (Number.isFinite(lat) && Number.isFinite(lng)) Object.assign(entry, { lat, lng });
  const next = [...readCustom().filter(e => normalizeText(e.name) !== normalizeText(cleanName)), entry];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return loadAddressBook();
};

export const removeAddress = (name) => {
  const next = readCustom().filter(e => normalizeText(e.name) !== normalizeText(name));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return loadAddressBook();
};

export const searchAddressBook = (query, limit = 5) => {
  const q = normalizeText(query);
  const book = loadAddressBook();
  if (!q) return book.slice(0, limit);
  return book
    .filter(e => normalizeText(`${e.name} ${e.address}`).includes(q))
    .slice(0, limit);
};

export const findBookEntry = (text) => {
  const q = normalizeText(text);
  if (!q) return null;
  return loadAddressBook().find(e => normalizeText(e.name) === q || normalizeText(e.address) === q) || null;
};
