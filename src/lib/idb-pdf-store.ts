/**
 * IndexedDB Large-File (100MB+) PDF Storage Helper
 * Database: noor_ebooks_idb_v1
 * Store: pdf_blobs
 *
 * Stores and retrieves raw Blob / File objects without base64 bloat
 * or localStorage quota limits. Handles multi-hundred megabyte PDFs smoothly.
 */

const DB_NAME = 'noor_ebooks_idb_v1';
const STORE_NAME = 'pdf_blobs';
const DB_VERSION = 1;

export interface StoredPdfRecord {
  key: string;
  blob: Blob;
  name: string;
  size: number;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

/**
 * Save raw PDF file or blob into IndexedDB
 */
export async function savePdfBlob(
  key: string,
  fileOrBlob: Blob | File,
  fileName?: string
): Promise<void> {
  const db = await getDb();
  const name = fileName || (fileOrBlob instanceof File ? fileOrBlob.name : key);
  const size = fileOrBlob.size;

  const record: StoredPdfRecord = {
    key,
    blob: fileOrBlob,
    name,
    size,
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieve raw Blob from IndexedDB
 */
export async function getPdfBlob(key: string): Promise<Blob | null> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          const result = req.result as StoredPdfRecord | undefined;
          resolve(result ? result.blob : null);
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn(`[idb-pdf-store] Error retrieving PDF blob for ${key}:`, err);
    return null;
  }
}

/**
 * Retrieve Blob URL (object URL) for viewing inside PDF readers
 */
export async function getPdfBlobUrl(key: string): Promise<string | null> {
  const blob = await getPdfBlob(key);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/**
 * Check if a PDF is present in IndexedDB
 */
export async function hasPdfBlob(key: string): Promise<boolean> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.count(IDBKeyRange.only(key));

        req.onsuccess = () => resolve(req.result > 0);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch {
    return false;
  }
}

/**
 * Get PDF record metadata (name, size, updatedAt) without reading the entire blob
 */
export async function getPdfMetadata(
  key: string
): Promise<{ name: string; size: number; updatedAt: number } | null> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          const result = req.result as StoredPdfRecord | undefined;
          if (result) {
            resolve({
              name: result.name,
              size: result.size,
              updatedAt: result.updatedAt,
            });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Delete PDF blob from IndexedDB
 */
export async function deletePdfBlob(key: string): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn(`[idb-pdf-store] Failed to delete PDF blob for ${key}:`, err);
  }
}

/**
 * List all keys stored in IndexedDB
 */
export async function getAllStoredPdfKeys(): Promise<string[]> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAllKeys();

        req.onsuccess = () => resolve((req.result as string[]) || []);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  } catch {
    return [];
  }
}
