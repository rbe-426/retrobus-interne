// Brouillons RétroMail : IndexedDB (plusieurs centaines de Mo, pièces jointes comprises)
// avec repli sur localStorage quand IndexedDB n'est pas disponible.
const DB_NAME = 'retromail';
const STORE = 'kv';
const KEY = 'drafts';
const LEGACY_KEY = 'mail_drafts';

const openDb = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('IndexedDB indisponible'));
    return;
  }
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const run = async (mode, action) => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request?.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
};

const readLegacy = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export async function loadDrafts() {
  let stored = [];
  try {
    stored = (await run('readonly', (store) => store.get(KEY))) || [];
  } catch {
    stored = [];
  }

  const legacy = readLegacy();
  if (legacy.length === 0) return stored;

  const knownIds = new Set(stored.map((draft) => draft.id));
  return [...stored, ...legacy.filter((draft) => !knownIds.has(draft.id))]
    .sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
}

export async function saveDrafts(drafts) {
  try {
    await run('readwrite', (store) => store.put(drafts, KEY));
    localStorage.removeItem(LEGACY_KEY);
  } catch (error) {
    // Repli : sans pièces jointes pour tenir dans le quota localStorage.
    localStorage.setItem(LEGACY_KEY, JSON.stringify(drafts.map((draft) => ({ ...draft, attachments: [] }))));
    throw error;
  }
}
