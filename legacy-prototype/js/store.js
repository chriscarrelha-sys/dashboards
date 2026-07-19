/* store.js — persistence layer.
 *
 * Case metadata (documents, deadlines, evidence, notes) lives in localStorage
 * as a single JSON blob keyed by case id. Raw file bytes live in IndexedDB so
 * we never bloat localStorage and can hold real PDFs/images.
 *
 * Everything is local-first: nothing is ever sent over the network.
 */
(function () {
  'use strict';

  const LS_INDEX = 'casedeck.index';      // { activeCaseId, cases: [{id, name}] }
  const LS_CASE = (id) => `casedeck.case.${id}`;
  const DB_NAME = 'casedeck-files';
  const DB_STORE = 'blobs';

  /* ---------- IndexedDB (file blobs) ---------- */

  let _dbPromise = null;
  function openDB() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return _dbPromise;
  }

  async function putBlob(key, blob) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(blob, key);
      tx.oncomplete = () => resolve(key);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getBlob(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteBlob(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /* ---------- Case index ---------- */

  function readIndex() {
    try {
      const raw = localStorage.getItem(LS_INDEX);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to default */ }
    return { activeCaseId: null, cases: [] };
  }

  function writeIndex(idx) {
    localStorage.setItem(LS_INDEX, JSON.stringify(idx));
  }

  /* ---------- Case documents ---------- */

  function emptyCase(id, name) {
    return {
      id,
      name,
      court: '',
      caseNumber: '',
      createdAt: new Date().toISOString(),
      documents: [],   // {id, name, type, status, notes, hash, size, mime, blobKey, addedAt, docDate}
      deadlines: [],   // {id, title, dueDate, rule, docId, done, addedAt}
      evidence: [],    // {id, name, source, hash, size, mime, blobKey, addedAt, custody:[{at, action, note}]}
      resources: [],   // {id, title, url, category, notes, aiSummary, addedAt}
    };
  }

  // Backfill any keys added in later versions so older saved cases stay valid.
  function normalizeCase(c) {
    if (!c) return c;
    if (!Array.isArray(c.documents)) c.documents = [];
    if (!Array.isArray(c.deadlines)) c.deadlines = [];
    if (!Array.isArray(c.evidence)) c.evidence = [];
    if (!Array.isArray(c.resources)) c.resources = [];
    return c;
  }

  function readCase(id) {
    try {
      const raw = localStorage.getItem(LS_CASE(id));
      if (raw) return normalizeCase(JSON.parse(raw));
    } catch (e) { /* fall through */ }
    return null;
  }

  function writeCase(c) {
    localStorage.setItem(LS_CASE(c.id), JSON.stringify(c));
  }

  window.Store = {
    openDB, putBlob, getBlob, deleteBlob,
    readIndex, writeIndex,
    emptyCase, readCase, writeCase,
    LS_CASE,
  };
})();
