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

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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
    const db = await openAudioDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put(blobOrFile, storageKey);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Also update/populate the object URL cache
    if (objectUrlCache.has(storageKey)) {
      try {
        URL.revokeObjectURL(objectUrlCache.get(storageKey)!);
      } catch {}
    }
    const freshUrl = URL.createObjectURL(blobOrFile);
    objectUrlCache.set(storageKey, freshUrl);

    return storageKey;
  } catch (err) {
    console.error(`[focusAudioStorage] Failed to save audio blob for key "${storageKey}":`, err);
    throw err;
  }
}

/**
 * Retrieves the raw audio Blob from IndexedDB.
 */
export async function getLocalAudioBlob(storageKey: string): Promise<Blob | null> {
  try {
    const db = await openAudioDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(storageKey);

    return await new Promise<Blob | null>((resolve) => {
      request.onsuccess = () => resolve((request.result as Blob) || null);
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
  // If we already have a live object URL in memory, return it
  if (objectUrlCache.has(storageKey)) {
    return objectUrlCache.get(storageKey)!;
  }

  const blob = await getLocalAudioBlob(storageKey);
  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  objectUrlCache.set(storageKey, url);
  return url;
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

    const db = await openAudioDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(storageKey);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
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
    const db = await openAudioDB();
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
