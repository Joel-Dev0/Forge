/**
 * Forge Focus Audio Storage
 * Persistent IndexedDB storage for local audio tracks (MP3, WAV, FLAC, OGG, M4A, etc.)
 * Ensures that imported local songs persist permanently across browser reloads and restarts,
 * exactly like web and Spotify streams.
 */

const DB_NAME = "forge_audio_storage_v1";
const DB_VERSION = 1;
const STORE_NAME = "audio_blobs";

// In-memory cache of generated object URLs to avoid recreating them and to allow revoking
const objectUrlCache = new Map<string, string>();

let dbPromise: Promise<IDBDatabase> | null = null;

function getAudioDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      dbPromise = null;
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Returns a slice-detached Blob from a File or Blob, guaranteeing
 * that Chromium will store the raw bytes directly in IndexedDB blob storage
 * independent of any ephemeral file input handles that expire on refresh.
 */
function toPersistentBlob(blobOrFile: Blob | File): Blob {
  if (blobOrFile instanceof File) {
    return blobOrFile.slice(0, blobOrFile.size, blobOrFile.type || "audio/mpeg");
  }
  return blobOrFile;
}

/**
 * Synchronously returns an active object URL if already cached in memory.
 */
export function getCachedAudioUrl(storageKey: string): string | null {
  return objectUrlCache.get(storageKey) || null;
}

/**
 * Saves a local audio file or blob into IndexedDB permanently.
 * Returns the storageKey (track ID).
 */
export async function saveLocalAudioBlob(
  storageKey: string,
  blobOrFile: Blob | File
): Promise<string> {
  try {
    const db = await getAudioDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const pureBlob = toPersistentBlob(blobOrFile);

    store.put(pureBlob, storageKey);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    if (objectUrlCache.has(storageKey)) {
      try {
        URL.revokeObjectURL(objectUrlCache.get(storageKey)!);
      } catch {}
    }
    const freshUrl = URL.createObjectURL(pureBlob);
    objectUrlCache.set(storageKey, freshUrl);

    return storageKey;
  } catch (err) {
    console.error(`[focusAudioStorage] Failed to save audio blob for key "${storageKey}":`, err);
    throw err;
  }
}

/**
 * Saves multiple local audio files into IndexedDB in a single readwrite transaction.
 * Far faster and more reliable than executing dozens of separate transactions.
 */
export async function saveMultipleAudioBlobs(
  items: Array<{ key: string; blobOrFile: Blob | File }>
): Promise<string[]> {
  try {
    const db = await getAudioDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const savedKeys: string[] = [];

    for (const item of items) {
      const pureBlob = toPersistentBlob(item.blobOrFile);
      store.put(pureBlob, item.key);
      savedKeys.push(item.key);

      if (objectUrlCache.has(item.key)) {
        try {
          URL.revokeObjectURL(objectUrlCache.get(item.key)!);
        } catch {}
      }
      const freshUrl = URL.createObjectURL(pureBlob);
      objectUrlCache.set(item.key, freshUrl);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    return savedKeys;
  } catch (err) {
    console.error("[focusAudioStorage] Batch save failed:", err);
    throw err;
  }
}

/**
 * Retrieves the raw audio Blob from IndexedDB.
 */
export async function getLocalAudioBlob(storageKey: string): Promise<Blob | null> {
  try {
    const db = await getAudioDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(storageKey);

    return await new Promise<Blob | null>((resolve) => {
      request.onsuccess = () => {
        const result = request.result;
        if (result && (result instanceof Blob || result instanceof File)) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn(`[focusAudioStorage] Error reading audio blob "${storageKey}":`, err);
    return null;
  }
}

/**
 * Returns a working URL for the stored audio blob.
 * Reuses active in-memory object URL or creates a fresh one from IndexedDB.
 */
export async function getLocalAudioUrl(storageKey: string): Promise<string | null> {
  if (objectUrlCache.has(storageKey)) {
    return objectUrlCache.get(storageKey)!;
  }

  const blob = await getLocalAudioBlob(storageKey);
  if (!blob || blob.size === 0) return null;

  try {
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(storageKey, url);
    return url;
  } catch (err) {
    console.warn(`[focusAudioStorage] Error creating object URL for "${storageKey}":`, err);
    return null;
  }
}

/**
 * Deletes an audio file from IndexedDB and cleans up object URLs.
 */
export async function deleteLocalAudioBlob(storageKey: string): Promise<void> {
  try {
    if (objectUrlCache.has(storageKey)) {
      try {
        URL.revokeObjectURL(objectUrlCache.get(storageKey)!);
      } catch {}
      objectUrlCache.delete(storageKey);
    }

    const db = await getAudioDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(storageKey);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[focusAudioStorage] Error deleting audio blob "${storageKey}":`, err);
  }
}

/**
 * Checks whether an audio track is stored in IndexedDB.
 */
export async function hasLocalAudioBlob(storageKey: string): Promise<boolean> {
  try {
    const db = await getAudioDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count(storageKey);

    return await new Promise<boolean>((resolve) => {
      countReq.onsuccess = () => resolve(countReq.result > 0);
      countReq.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Optionally cache an online direct audio stream/file (e.g., MP3 from web)
 * into IndexedDB for offline playback.
 */
export async function cacheOnlineAudioToLocal(
  storageKey: string,
  onlineUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(onlineUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching online audio`);
    const blob = await response.blob();
    return await saveLocalAudioBlob(storageKey, blob);
  } catch (err) {
    console.warn(`[focusAudioStorage] Could not cache online audio from ${onlineUrl}:`, err);
    return null;
  }
}
