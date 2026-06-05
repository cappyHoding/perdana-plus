const DB_NAME = 'perdana-undian';
const STORE = 'kv';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      // Migrate from localStorage on first read
      const lsData = localStorage.getItem(name);
      if (lsData) {
        const db = await openDB();
        await new Promise<void>((res, rej) => {
          const tx = db.transaction(STORE, 'readwrite');
          const r = tx.objectStore(STORE).put(lsData, name);
          r.onsuccess = () => res();
          r.onerror = () => rej(r.error);
        });
        localStorage.removeItem(name);
        return lsData;
      }
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readonly');
        const r = tx.objectStore(STORE).get(name);
        r.onsuccess = () => resolve(r.result ?? null);
        r.onerror = () => resolve(null);
      });
    } catch {
      return localStorage.getItem(name);
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const r = tx.objectStore(STORE).put(value, name);
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      });
    } catch {
      localStorage.setItem(name, value);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(name);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      localStorage.removeItem(name);
    }
  },
};
