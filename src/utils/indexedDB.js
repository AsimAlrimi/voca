/**
 * Low-level IndexedDB access for Voca. React-free.
 *
 * Rules (see docs/PHASE_1_IMPLEMENTATION_PLAN.md §2.5):
 * - Never await network or unrelated async work inside a transaction.
 *   Prepare data first, then open the transaction and issue requests synchronously.
 * - Promises resolve on transaction `complete`, and reject on `error` / `abort`.
 */

const DB_NAME = "voca-db";
const DB_VERSION = 2;

export const STORES = {
  books: "books",
  readingProgress: "readingProgress",
  vocabulary: "vocabulary",
  practiceStats: "practiceStats",
};

let dbPromise = null;

function upgrade(db, oldVersion, tx) {
  // v1: books
  if (!db.objectStoreNames.contains(STORES.books)) {
    db.createObjectStore(STORES.books, { keyPath: "id" });
  }

  // v2: reading progress, vocabulary, practice stats (additive; books are untouched)
  if (oldVersion < 2) {
    if (!db.objectStoreNames.contains(STORES.readingProgress)) {
      db.createObjectStore(STORES.readingProgress, { keyPath: "bookId" });
    }
    if (!db.objectStoreNames.contains(STORES.vocabulary)) {
      const vocab = db.createObjectStore(STORES.vocabulary, { keyPath: "id" });
      vocab.createIndex("wordKey", "wordKey", { unique: true });
      vocab.createIndex("createdAt", "createdAt");
    } else {
      const vocab = tx.objectStore(STORES.vocabulary);
      if (!vocab.indexNames.contains("wordKey")) {
        vocab.createIndex("wordKey", "wordKey", { unique: true });
      }
    }
    if (!db.objectStoreNames.contains(STORES.practiceStats)) {
      db.createObjectStore(STORES.practiceStats, { keyPath: "wordId" });
    }
  }
}

export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new StorageError("unavailable", "Local storage is not available in this browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      upgrade(request.result, event.oldVersion, request.transaction);
    };

    request.onsuccess = () => {
      const db = request.result;
      // A newer version of the app (another tab) wants to upgrade: let it.
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
      reject(toStorageError(request.error));
    };

    request.onblocked = () => {
      dbPromise = null;
      reject(
        new StorageError(
          "blocked",
          "Voca is open in another tab with an older version. Close other Voca tabs and reload."
        )
      );
    };
  });

  return dbPromise;
}

/** Error with a stable `code` the UI can map to a message. */
export class StorageError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.cause = cause;
  }
}

export function toStorageError(error) {
  if (error instanceof StorageError) return error;
  const name = error?.name;
  if (name === "QuotaExceededError") {
    return new StorageError(
      "quota",
      "There isn't enough storage space on this device. Delete some books or free up space and try again.",
      error
    );
  }
  if (name === "ConstraintError") {
    return new StorageError("constraint", "This item already exists.", error);
  }
  return new StorageError("unknown", error?.message || "A storage error occurred.", error);
}

/**
 * Run `callback(stores, tx)` inside one transaction over `storeNames`.
 * The callback must only issue IndexedDB requests (synchronously or from request callbacks).
 * Whatever the callback assigns to `tx.result` (via the returned setter) is resolved after commit.
 *
 * Resolves after the transaction completes; rejects (and nothing is written) on error/abort.
 */
export async function runTransaction(storeNames, mode, callback) {
  const db = await openDB();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];

  return new Promise((resolve, reject) => {
    let result;
    let settled = false;
    const tx = db.transaction(names, mode);

    const stores = Object.fromEntries(names.map((name) => [name, tx.objectStore(name)]));
    const setResult = (value) => {
      result = value;
    };

    tx.oncomplete = () => {
      settled = true;
      resolve(result);
    };
    tx.onerror = () => {
      // Let onabort handle rejection (error events bubble then abort follows).
    };
    tx.onabort = () => {
      if (settled) return;
      settled = true;
      reject(toStorageError(tx.error));
    };

    try {
      callback(stores, setResult, tx);
    } catch (error) {
      settled = true;
      try {
        tx.abort();
      } catch {
        // Transaction may already be finished; the original error is what matters.
      }
      reject(toStorageError(error));
    }
  });
}

export function getAll(storeName) {
  return runTransaction(storeName, "readonly", (stores, setResult) => {
    const request = stores[storeName].getAll();
    request.onsuccess = () => setResult(request.result);
  });
}

export function getByKey(storeName, key) {
  return runTransaction(storeName, "readonly", (stores, setResult) => {
    const request = stores[storeName].get(key);
    request.onsuccess = () => setResult(request.result ?? null);
  });
}

export function getByIndex(storeName, indexName, value) {
  return runTransaction(storeName, "readonly", (stores, setResult) => {
    const request = stores[storeName].index(indexName).get(value);
    request.onsuccess = () => setResult(request.result ?? null);
  });
}

export function put(storeName, value) {
  return runTransaction(storeName, "readwrite", (stores) => {
    stores[storeName].put(value);
  });
}

export function add(storeName, value) {
  return runTransaction(storeName, "readwrite", (stores) => {
    stores[storeName].add(value);
  });
}

export function remove(storeName, key) {
  return runTransaction(storeName, "readwrite", (stores) => {
    stores[storeName].delete(key);
  });
}

/** Ask the browser not to evict our data. A request, not a guarantee. */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch (error) {
    console.warn("Persistent storage request failed", error);
    return false;
  }
}

export async function getStorageEstimate() {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage, quota } = await navigator.storage.estimate();
    return { usage: usage ?? 0, quota: quota ?? 0 };
  } catch (error) {
    console.warn("Storage estimate failed", error);
    return null;
  }
}
