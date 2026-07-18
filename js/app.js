/* app.js — controller. Owns app state, navigation, modals, toasts, and the
 * case lifecycle. Views call back into this via the global `App`. */
(function () {
  'use strict';

  const U = window.Util;

  const App = {
    view: 'dashboard',
    caseId: null,
    _viewParams: null,
    _case: null,

    /* ---- case state ----
     * The active case is cached as a single stable object. Views mutate that
     * object in place and call save() to persist it. Reading a fresh copy from
     * storage on every access would drop in-place mutations, so don't. */
    _load() { this._case = Store.readCase(this.caseId); return this._case; },
    current() {
      if (!this._case || this._case.id !== this.caseId) this._load();
      return this._case;
    },
    save() {
      if (this._case) Store.writeCase(this._case);
      this._refreshBadges();
    },

    /* ---- navigation ---- */
    go(view, params) { this.view = view; this._viewParams = params || null; this.render(); this._syncNav(); },
    render() {
      const factory = Views[this.view] || Views.dashboard;
      const v = factory(this._viewParams);
      this._viewParams = null;
      const titles = {
        dashboard: 'Dashboard', documents: 'Documents', deadlines: 'Deadlines',
        timeline: 'Case Timeline', evidence: 'Evidence Locker', search: 'Search',
      };
      document.getElementById('view-title').textContent = titles[this.view] || 'Dashboard';
      document.getElementById('view-subtitle').textContent = v.subtitle || '';
      const actionsHost = document.getElementById('topbar-actions');
      actionsHost.innerHTML = '';
      (v.actions || []).forEach((a) => {
        const b = document.createElement('button');
        b.className = 'btn ' + (a.kind === 'primary' ? 'btn-primary' : '');
        b.textContent = a.label;
        b.addEventListener('click', a.onClick);
        actionsHost.appendChild(b);
      });
      const root = document.getElementById('view-root');
      root.innerHTML = '';
      v.mount(root);
    },

    /* ---- modals ---- */
    modal(title, html, wire) {
      const host = document.getElementById('modal-host');
      document.getElementById('modal-title').textContent = title;
      const body = document.getElementById('modal-body');
      body.innerHTML = html;
      host.hidden = false;
      const close = () => { host.hidden = true; body.innerHTML = ''; };
      host.querySelectorAll('[data-close-modal]').forEach((x) => { x.onclick = close; });
      if (wire) wire(body, close);
      const firstInput = body.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    },

    /* ---- toast ---- */
    toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.hidden = false;
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => { t.hidden = true; }, 2600);
    },

    /* ---- nav sync ---- */
    _syncNav() {
      document.querySelectorAll('.nav-item').forEach((n) =>
        n.classList.toggle('is-active', n.dataset.view === this.view));
    },
    _refreshBadges() { /* reserved for future deadline count badges */ },
  };

  window.App = App;

  /* ================= case lifecycle ================= */

  function seedDemoCase(c) {
    const now = Date.now();
    const iso = (offsetDays) => new Date(now + offsetDays * 86400000).toISOString();
    c.court = 'Superior Court';
    c.caseNumber = 'DEMO-0001';
    c.deadlines = [
      { id: U.uid(), title: 'File response to Motion to Dismiss', dueDate: iso(5), rule: 'Local Rule · 14 days after service', docId: '', done: false, addedAt: iso(-2) },
      { id: U.uid(), title: 'Serve discovery requests', dueDate: iso(21), rule: '', docId: '', done: false, addedAt: iso(-2) },
      { id: U.uid(), title: 'Initial disclosures', dueDate: iso(-3), rule: '', docId: '', done: false, addedAt: iso(-10) },
    ];
    return c;
  }

  function createCase(name, seed) {
    const id = U.uid();
    let c = Store.emptyCase(id, name || 'Untitled case');
    if (seed) c = seedDemoCase(c);
    Store.writeCase(c);
    const idx = Store.readIndex();
    idx.cases.push({ id, name: c.name });
    idx.activeCaseId = id;
    Store.writeIndex(idx);
    return id;
  }

  function switchCase(id) {
    App.caseId = id;
    App._load();
    const idx = Store.readIndex();
    idx.activeCaseId = id;
    Store.writeIndex(idx);
    renderCaseSelect();
    App.go('dashboard');
  }

  function renderCaseSelect() {
    const idx = Store.readIndex();
    const sel = document.getElementById('case-select');
    sel.innerHTML = idx.cases.map((c) =>
      `<option value="${U.esc(c.id)}" ${c.id === App.caseId ? 'selected' : ''}>${U.esc(c.name)}</option>`).join('');
  }

  function promptNewCase() {
    App.modal('New case', `
      <label class="field"><span>Case name</span>
        <input id="nc-name" class="input" placeholder="e.g. Smith v. Acme Servicing" /></label>
      <label class="checkbox"><input type="checkbox" id="nc-seed" /> Add a few sample deadlines to explore</label>
      <div class="modal-actions"><button class="btn btn-primary" id="nc-go">Create case</button></div>`,
      (body, close) => {
        body.querySelector('#nc-go').addEventListener('click', () => {
          const name = body.querySelector('#nc-name').value.trim() || 'Untitled case';
          const seed = body.querySelector('#nc-seed').checked;
          const id = createCase(name, seed);
          close();
          switchCase(id);
          App.toast('Case created');
        });
      });
  }

  /* ================= export / import ================= */

  async function exportCase() {
    const c = App.current();
    if (!c) return;
    // Inline file blobs as base64 so the export is a single portable file.
    const files = {};
    const collect = async (key) => {
      if (!key || files[key]) return;
      const blob = await Store.getBlob(key);
      if (!blob) return;
      files[key] = { mime: blob.type, data: await blobToBase64(blob) };
    };
    for (const d of c.documents) await collect(d.blobKey);
    for (const e of c.evidence) await collect(e.blobKey);
    const payload = { version: 1, case: c, files };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (c.name || 'case').replace(/[^\w.-]+/g, '_') + '.casedeck.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    App.toast('Case exported');
  }

  async function importCase(file) {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload.case) throw new Error('Not a CaseDeck export');
      const c = payload.case;
      c.id = U.uid();                         // fresh id to avoid clobbering
      c.name = (c.name || 'Imported case') + ' (imported)';
      // Restore blobs under new keys.
      const remap = {};
      for (const [oldKey, rec] of Object.entries(payload.files || {})) {
        const newKey = U.uid();
        remap[oldKey] = newKey;
        await Store.putBlob(newKey, base64ToBlob(rec.data, rec.mime));
      }
      c.documents.forEach((d) => { if (remap[d.blobKey]) d.blobKey = remap[d.blobKey]; });
      c.evidence.forEach((e) => { if (remap[e.blobKey]) e.blobKey = remap[e.blobKey]; });
      Store.writeCase(c);
      const idx = Store.readIndex();
      idx.cases.push({ id: c.id, name: c.name });
      Store.writeIndex(idx);
      switchCase(c.id);
      App.toast('Case imported');
    } catch (e) {
      App.toast('Import failed: ' + e.message);
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(',')[1]);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }
  function base64ToBlob(b64, mime) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime || 'application/octet-stream' });
  }

  /* ================= boot ================= */

  function boot() {
    let idx = Store.readIndex();
    if (!idx.cases.length) {
      const id = createCase('My First Case', true);
      idx = Store.readIndex();
      App.caseId = id;
    } else {
      App.caseId = idx.activeCaseId || idx.cases[0].id;
    }
    renderCaseSelect();

    document.getElementById('case-select').addEventListener('change', (e) => switchCase(e.target.value));
    document.getElementById('new-case-btn').addEventListener('click', promptNewCase);
    document.getElementById('export-btn').addEventListener('click', exportCase);
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', (e) => {
      if (e.target.files[0]) importCase(e.target.files[0]);
      e.target.value = '';
    });
    document.querySelectorAll('.nav-item').forEach((n) =>
      n.addEventListener('click', () => App.go(n.dataset.view)));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.getElementById('modal-host').hidden = true;
    });

    App.go('dashboard');
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
