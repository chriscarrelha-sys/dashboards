/* views.js — one render function per screen.
 *
 * Each view returns { subtitle, actions, mount(root) }.
 *  - subtitle: string under the page title
 *  - actions: array of {label, kind, onClick} rendered as topbar buttons
 *  - mount(root): paints into the view container and wires events
 *
 * Views read the active case via App.current() and mutate through App.save().
 */
(function () {
  'use strict';

  const U = window.Util;
  const el = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  /* ============================ DASHBOARD ============================ */
  function dashboard() {
    return {
      subtitle: 'Everything about your case at a glance.',
      actions: [
        { label: '+ Add document', kind: 'primary', onClick: () => App.go('documents', { add: true }) },
      ],
      mount(root) {
        const c = App.current();
        const upcoming = c.deadlines
          .filter((d) => !d.done)
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        const overdue = upcoming.filter((d) => U.daysUntil(d.dueDate) < 0);
        const next = upcoming.slice(0, 5);

        const byType = {};
        c.documents.forEach((d) => { byType[d.type] = (byType[d.type] || 0) + 1; });

        root.innerHTML = `
          <div class="stat-grid">
            ${statCard('🗂️', c.documents.length, 'Documents')}
            ${statCard('⏰', upcoming.length, 'Open deadlines', overdue.length ? `${overdue.length} overdue` : '', overdue.length ? 'danger' : '')}
            ${statCard('🔒', c.evidence.length, 'Evidence items')}
            ${statCard('📅', next[0] ? U.relDeadline(next[0].dueDate).label : '—', 'Next deadline', next[0] ? U.esc(next[0].title) : 'none set')}
          </div>

          <div class="cols-2">
            <div class="panel">
              <div class="panel-head"><h3>Upcoming deadlines</h3>
                <button class="btn btn-ghost btn-sm" data-goto="deadlines">View all</button></div>
              <div class="panel-body" id="dash-deadlines"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>Document breakdown</h3>
                <button class="btn btn-ghost btn-sm" data-goto="documents">Open</button></div>
              <div class="panel-body" id="dash-docs"></div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><h3>Recent activity</h3></div>
            <div class="panel-body" id="dash-activity"></div>
          </div>
        `;

        const dl = root.querySelector('#dash-deadlines');
        if (!next.length) {
          dl.innerHTML = emptyHint('No deadlines yet. Add one from the Deadlines tab.');
        } else {
          dl.innerHTML = next.map((d) => {
            const r = U.relDeadline(d.dueDate);
            return `<div class="row">
              <div><strong>${U.esc(d.title)}</strong><div class="muted sm">${U.fmtDate(d.dueDate)}</div></div>
              <span class="pill pill-${r.tone}">${r.label}</span></div>`;
          }).join('');
        }

        const dd = root.querySelector('#dash-docs');
        const types = U.DOC_TYPES.filter((t) => byType[t]);
        dd.innerHTML = types.length
          ? types.map((t) => {
              const pct = Math.round((byType[t] / c.documents.length) * 100);
              return `<div class="bar-row"><span class="bar-label">${t}</span>
                <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
                <span class="bar-num">${byType[t]}</span></div>`;
            }).join('')
          : emptyHint('No documents uploaded yet.');

        const acts = [
          ...c.documents.map((d) => ({ at: d.addedAt, txt: `Added document “${d.name}”`, icon: '🗂️' })),
          ...c.evidence.map((e) => ({ at: e.addedAt, txt: `Logged evidence “${e.name}”`, icon: '🔒' })),
          ...c.deadlines.map((d) => ({ at: d.addedAt, txt: `Set deadline “${d.title}”`, icon: '⏰' })),
        ].filter((a) => a.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
        root.querySelector('#dash-activity').innerHTML = acts.length
          ? acts.map((a) => `<div class="row"><div>${a.icon} ${U.esc(a.txt)}</div>
              <span class="muted sm">${U.fmtDateTime(a.at)}</span></div>`).join('')
          : emptyHint('Activity will show up here as you add documents, deadlines, and evidence.');

        root.querySelectorAll('[data-goto]').forEach((b) =>
          b.addEventListener('click', () => App.go(b.dataset.goto)));
      },
    };
  }

  function statCard(icon, value, label, sub = '', tone = '') {
    return `<div class="stat-card">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${U.esc(value)}</div>
      <div class="stat-label">${U.esc(label)}</div>
      ${sub ? `<div class="stat-sub ${tone}">${U.esc(sub)}</div>` : ''}
    </div>`;
  }

  /* ============================ DOCUMENTS ============================ */
  function documents(params) {
    return {
      subtitle: 'Upload, categorize, and track the status of every filing.',
      actions: [{ label: '+ Add document', kind: 'primary', onClick: openUpload }],
      mount(root) {
        const c = App.current();
        root.innerHTML = `
          <div class="filterbar">
            <input id="doc-filter" class="input" placeholder="Filter by name, tag, or note…" />
            <select id="doc-type-filter" class="input">
              <option value="">All types</option>
              ${U.DOC_TYPES.map((t) => `<option>${t}</option>`).join('')}
            </select>
            <select id="doc-status-filter" class="input">
              <option value="">All statuses</option>
              ${U.DOC_STATUS.map((s) => `<option>${s}</option>`).join('')}
            </select>
          </div>
          <div id="dropzone" class="dropzone">
            <strong>Drag files here</strong> or <button class="link" id="pick-file">browse</button>
            <input id="doc-file" type="file" multiple hidden />
            <div class="muted sm">PDF, images, or documents. Photos of paper filings work too.</div>
          </div>
          <div id="doc-list" class="card-grid"></div>`;

        const list = root.querySelector('#doc-list');
        const filterEl = root.querySelector('#doc-filter');
        const typeEl = root.querySelector('#doc-type-filter');
        const statusEl = root.querySelector('#doc-status-filter');

        function paint() {
          const q = filterEl.value.toLowerCase().trim();
          const ft = typeEl.value, fs = statusEl.value;
          const rows = App.current().documents
            .filter((d) => !ft || d.type === ft)
            .filter((d) => !fs || d.status === fs)
            .filter((d) => !q || [d.name, d.type, d.status, d.notes].join(' ').toLowerCase().includes(q))
            .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
          if (!rows.length) {
            list.innerHTML = emptyHint(App.current().documents.length
              ? 'No documents match your filters.'
              : 'No documents yet. Drag a file above to get started.');
            return;
          }
          list.innerHTML = rows.map(docCard).join('');
          list.querySelectorAll('[data-doc]').forEach((card) => {
            const id = card.dataset.doc;
            card.querySelector('[data-act="open"]').addEventListener('click', () => openDoc(id));
            card.querySelector('[data-act="edit"]').addEventListener('click', () => editDoc(id));
            card.querySelector('[data-act="del"]').addEventListener('click', () => delDoc(id));
          });
        }

        function docCard(d) {
          return `<div class="card" data-doc="${d.id}">
            <div class="card-top">
              <span class="type-badge type-${d.type.replace(/\s+/g, '')}">${U.esc(d.type)}</span>
              <span class="status-tag status-${d.status.replace(/\s+/g, '')}">${U.esc(d.status)}</span>
            </div>
            <div class="card-title">${U.esc(d.name)}</div>
            <div class="muted sm">${U.fmtDate(d.docDate || d.addedAt)} · ${U.fmtBytes(d.size)}</div>
            ${d.notes ? `<div class="card-note">${U.esc(d.notes)}</div>` : ''}
            <div class="card-actions">
              <button class="btn btn-sm" data-act="open">Open</button>
              <button class="btn btn-sm btn-ghost" data-act="edit">Edit</button>
              <button class="btn btn-sm btn-ghost danger" data-act="del">Delete</button>
            </div>
          </div>`;
        }

        filterEl.addEventListener('input', U.debounce(paint, 120));
        typeEl.addEventListener('change', paint);
        statusEl.addEventListener('change', paint);
        root.querySelector('#pick-file').addEventListener('click', () => root.querySelector('#doc-file').click());
        root.querySelector('#doc-file').addEventListener('change', (e) => handleFiles(e.target.files, paint));

        const dz = root.querySelector('#dropzone');
        ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
        ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
        dz.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files, paint));

        paint();
        if (params && params.add) openUpload();
      },
    };
  }

  async function handleFiles(fileList, done) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    for (const f of files) {
      const hash = await U.sha256(f);
      const blobKey = U.uid();
      await Store.putBlob(blobKey, f);
      App.current().documents.push({
        id: U.uid(), name: f.name, type: U.guessType(f.name), status: 'Draft',
        notes: '', hash, size: f.size, mime: f.type, blobKey,
        addedAt: new Date().toISOString(), docDate: '',
      });
    }
    App.save();
    App.toast(`${files.length} document${files.length > 1 ? 's' : ''} added`);
    if (done) done();
  }

  function openUpload() {
    App.modal('Add document', `
      <p class="muted">Choose one or more files. They are hashed and stored locally in your browser.</p>
      <input id="m-file" type="file" multiple class="input" />
      <div class="modal-actions"><button class="btn btn-primary" id="m-go">Add</button></div>`,
      (body, close) => {
        body.querySelector('#m-go').addEventListener('click', async () => {
          const files = body.querySelector('#m-file').files;
          if (!files.length) { App.toast('Pick a file first'); return; }
          await handleFiles(files);
          close();
          if (App.view === 'documents') App.render();
        });
      });
  }

  function editDoc(id) {
    const d = App.current().documents.find((x) => x.id === id);
    if (!d) return;
    App.modal('Edit document', `
      <label class="field"><span>Name</span><input id="e-name" class="input" value="${U.esc(d.name)}" /></label>
      <div class="grid-2">
        <label class="field"><span>Type</span><select id="e-type" class="input">
          ${U.DOC_TYPES.map((t) => `<option ${t === d.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>Status</span><select id="e-status" class="input">
          ${U.DOC_STATUS.map((s) => `<option ${s === d.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      </div>
      <label class="field"><span>Document date (for timeline)</span>
        <input id="e-date" type="date" class="input" value="${d.docDate ? d.docDate.slice(0, 10) : ''}" /></label>
      <label class="field"><span>Notes</span><textarea id="e-notes" class="input" rows="3">${U.esc(d.notes)}</textarea></label>
      <div class="hash-line">SHA-256: <code>${U.esc(d.hash || '—')}</code></div>
      <div class="modal-actions"><button class="btn btn-primary" id="e-save">Save</button></div>`,
      (body, close) => {
        body.querySelector('#e-save').addEventListener('click', () => {
          d.name = body.querySelector('#e-name').value.trim() || d.name;
          d.type = body.querySelector('#e-type').value;
          d.status = body.querySelector('#e-status').value;
          const dt = body.querySelector('#e-date').value;
          d.docDate = dt ? new Date(dt).toISOString() : '';
          d.notes = body.querySelector('#e-notes').value;
          App.save(); close(); App.render(); App.toast('Saved');
        });
      });
  }

  async function delDoc(id) {
    const c = App.current();
    const d = c.documents.find((x) => x.id === id);
    if (!d) return;
    if (!confirm(`Delete “${d.name}”? This cannot be undone.`)) return;
    if (d.blobKey) await Store.deleteBlob(d.blobKey);
    c.documents = c.documents.filter((x) => x.id !== id);
    c.deadlines.forEach((dl) => { if (dl.docId === id) dl.docId = ''; });
    App.save(); App.render(); App.toast('Document deleted');
  }

  async function openDoc(id) {
    const d = App.current().documents.find((x) => x.id === id) ||
              App.current().evidence.find((x) => x.id === id);
    if (!d) return;
    const blob = await Store.getBlob(d.blobKey);
    if (!blob) { App.toast('File data not found'); return; }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* ============================ DEADLINES ============================ */
  function deadlines() {
    return {
      subtitle: 'Track due dates and let the rule calculator do the math.',
      actions: [{ label: '+ Add deadline', kind: 'primary', onClick: () => addDeadline() }],
      mount(root) {
        root.innerHTML = `<div id="dl-list" class="list"></div>`;
        paintDeadlines(root.querySelector('#dl-list'));
      },
    };
  }

  function paintDeadlines(list) {
    const c = App.current();
    const rows = c.deadlines.slice().sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    if (!rows.length) { list.innerHTML = emptyHint('No deadlines yet. Add your first due date.'); return; }
    list.innerHTML = rows.map((d) => {
      const r = U.relDeadline(d.dueDate);
      const doc = c.documents.find((x) => x.id === d.docId);
      return `<div class="list-row ${d.done ? 'done' : ''}" data-dl="${d.id}">
        <input type="checkbox" ${d.done ? 'checked' : ''} data-act="toggle" aria-label="Mark done" />
        <div class="list-main">
          <div class="list-title">${U.esc(d.title)}</div>
          <div class="muted sm">${U.fmtDate(d.dueDate)}${d.rule ? ' · ' + U.esc(d.rule) : ''}${doc ? ' · 🗂️ ' + U.esc(doc.name) : ''}</div>
        </div>
        ${d.done ? '<span class="pill pill-muted">done</span>' : `<span class="pill pill-${r.tone}">${r.label}</span>`}
        <button class="icon-btn" data-act="edit" title="Edit">✎</button>
        <button class="icon-btn" data-act="del" title="Delete">✕</button>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-dl]').forEach((row) => {
      const id = row.dataset.dl;
      row.querySelector('[data-act="toggle"]').addEventListener('change', (e) => {
        const dl = App.current().deadlines.find((x) => x.id === id);
        dl.done = e.target.checked; App.save(); paintDeadlines(list);
      });
      row.querySelector('[data-act="edit"]').addEventListener('click', () => addDeadline(id));
      row.querySelector('[data-act="del"]').addEventListener('click', () => {
        const c2 = App.current();
        c2.deadlines = c2.deadlines.filter((x) => x.id !== id);
        App.save(); paintDeadlines(list); App.toast('Deadline removed');
      });
    });
  }

  function addDeadline(id) {
    const c = App.current();
    const d = id ? c.deadlines.find((x) => x.id === id) : null;
    App.modal(d ? 'Edit deadline' : 'Add deadline', `
      <label class="field"><span>Title</span>
        <input id="d-title" class="input" placeholder="e.g. File response to motion" value="${d ? U.esc(d.title) : ''}" /></label>
      <label class="field"><span>Due date</span>
        <input id="d-date" type="date" class="input" value="${d && d.dueDate ? d.dueDate.slice(0, 10) : ''}" /></label>

      <div class="calc">
        <div class="calc-head">⚡ Deadline calculator</div>
        <div class="grid-3">
          <label class="field"><span>From date</span><input id="c-from" type="date" class="input" /></label>
          <label class="field"><span>+ Days</span><input id="c-days" type="number" class="input" placeholder="30" /></label>
          <label class="field"><span>Count</span><select id="c-mode" class="input">
            <option value="cal">Calendar days</option><option value="biz">Business days</option></select></label>
        </div>
        <button class="btn btn-sm" id="c-apply" type="button">Compute → set due date</button>
        <div class="muted sm" id="c-out"></div>
      </div>

      <label class="field"><span>Rule / basis (optional)</span>
        <input id="d-rule" class="input" placeholder="e.g. FRCP 12 · 21 days after service" value="${d ? U.esc(d.rule) : ''}" /></label>
      <label class="field"><span>Link to document (optional)</span>
        <select id="d-doc" class="input"><option value="">— none —</option>
          ${c.documents.map((x) => `<option value="${x.id}" ${d && d.docId === x.id ? 'selected' : ''}>${U.esc(x.name)}</option>`).join('')}
        </select></label>
      <div class="modal-actions"><button class="btn btn-primary" id="d-save">${d ? 'Save' : 'Add deadline'}</button></div>`,
      (body, close) => {
        body.querySelector('#c-apply').addEventListener('click', () => {
          const from = body.querySelector('#c-from').value;
          const days = parseInt(body.querySelector('#c-days').value, 10);
          if (!from || isNaN(days)) { body.querySelector('#c-out').textContent = 'Enter a from-date and number of days.'; return; }
          const result = body.querySelector('#c-mode').value === 'biz'
            ? addBusinessDays(from, days) : addCalendarDays(from, days);
          body.querySelector('#d-date').value = result;
          body.querySelector('#c-out').textContent = `Due date set to ${U.fmtDate(result)}.`;
        });
        body.querySelector('#d-save').addEventListener('click', () => {
          const title = body.querySelector('#d-title').value.trim();
          const date = body.querySelector('#d-date').value;
          if (!title || !date) { App.toast('Title and due date are required'); return; }
          const payload = {
            title, dueDate: new Date(date).toISOString(),
            rule: body.querySelector('#d-rule').value.trim(),
            docId: body.querySelector('#d-doc').value,
          };
          if (d) { Object.assign(d, payload); }
          else { c.deadlines.push({ id: U.uid(), done: false, addedAt: new Date().toISOString(), ...payload }); }
          App.save(); close(); App.render(); App.toast('Deadline saved');
        });
      });
  }

  function addCalendarDays(fromStr, days) {
    const d = new Date(fromStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function addBusinessDays(fromStr, days) {
    const d = new Date(fromStr + 'T00:00:00');
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6) added++;
    }
    return d.toISOString().slice(0, 10);
  }

  /* ============================ TIMELINE ============================ */
  function timeline() {
    return {
      subtitle: 'Every filing, deadline, and exhibit in chronological order.',
      actions: [],
      mount(root) {
        const c = App.current();
        const items = [
          ...c.documents.map((d) => ({ at: d.docDate || d.addedAt, kind: 'doc', icon: '🗂️',
            title: d.name, meta: `${d.type} · ${d.status}`, id: d.id })),
          ...c.deadlines.map((d) => ({ at: d.dueDate, kind: 'deadline', icon: d.done ? '✅' : '⏰',
            title: d.title, meta: d.done ? 'Completed' : U.relDeadline(d.dueDate).label })),
          ...c.evidence.map((e) => ({ at: e.addedAt, kind: 'evidence', icon: '🔒',
            title: e.name, meta: `Evidence · ${e.source || 'source not set'}`, id: e.id })),
        ].filter((x) => x.at).sort((a, b) => new Date(a.at) - new Date(b.at));

        if (!items.length) { root.innerHTML = emptyHint('Your timeline builds itself as you add documents, deadlines, and evidence.'); return; }

        root.innerHTML = `<ol class="timeline">${items.map((it) => `
          <li class="tl-item tl-${it.kind}">
            <span class="tl-dot">${it.icon}</span>
            <div class="tl-body">
              <div class="tl-date">${U.fmtDate(it.at)}</div>
              <div class="tl-title">${U.esc(it.title)}</div>
              <div class="muted sm">${U.esc(it.meta)}</div>
            </div>
          </li>`).join('')}</ol>`;
      },
    };
  }

  /* ============================ EVIDENCE LOCKER ============================ */
  function evidence() {
    return {
      subtitle: 'Authenticity tracking with file hashes and a chain-of-custody log.',
      actions: [{ label: '+ Log evidence', kind: 'primary', onClick: openEvidenceUpload }],
      mount(root) {
        root.innerHTML = `<div id="ev-list" class="list"></div>`;
        paintEvidence(root.querySelector('#ev-list'));
      },
    };
  }

  function paintEvidence(list) {
    const c = App.current();
    if (!c.evidence.length) { list.innerHTML = emptyHint('No evidence logged. Add an item to start a chain of custody.'); return; }
    list.innerHTML = c.evidence.slice().sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)).map((e) => `
      <div class="ev-card" data-ev="${e.id}">
        <div class="ev-head">
          <div><div class="list-title">🔒 ${U.esc(e.name)}</div>
            <div class="muted sm">Source: ${U.esc(e.source || 'not set')} · ${U.fmtBytes(e.size)} · logged ${U.fmtDate(e.addedAt)}</div></div>
          <div class="ev-actions">
            <button class="btn btn-sm" data-act="open">Open</button>
            <button class="btn btn-sm btn-ghost" data-act="custody">+ Custody entry</button>
            <button class="icon-btn" data-act="del" title="Delete">✕</button>
          </div>
        </div>
        <div class="hash-line">SHA-256: <code>${U.esc(e.hash)}</code></div>
        <div class="custody">
          <div class="custody-head">Chain of custody</div>
          ${(e.custody || []).map((x) => `<div class="custody-row">
            <span class="muted sm">${U.fmtDateTime(x.at)}</span>
            <span><strong>${U.esc(x.action)}</strong>${x.note ? ' — ' + U.esc(x.note) : ''}</span></div>`).join('')}
        </div>
      </div>`).join('');
    list.querySelectorAll('[data-ev]').forEach((card) => {
      const id = card.dataset.ev;
      card.querySelector('[data-act="open"]').addEventListener('click', () => openDoc(id));
      card.querySelector('[data-act="custody"]').addEventListener('click', () => addCustody(id));
      card.querySelector('[data-act="del"]').addEventListener('click', async () => {
        const e = c.evidence.find((x) => x.id === id);
        if (!confirm(`Delete evidence “${e.name}”?`)) return;
        if (e.blobKey) await Store.deleteBlob(e.blobKey);
        c.evidence = c.evidence.filter((x) => x.id !== id);
        App.save(); paintEvidence(list); App.toast('Evidence deleted');
      });
    });
  }

  function openEvidenceUpload() {
    App.modal('Log evidence', `
      <label class="field"><span>File</span><input id="ev-file" type="file" class="input" /></label>
      <label class="field"><span>Source / where it came from</span>
        <input id="ev-source" class="input" placeholder="e.g. Produced by opposing counsel, 5/3/2026" /></label>
      <label class="field"><span>Note (optional)</span>
        <input id="ev-note" class="input" placeholder="What this shows / why it matters" /></label>
      <div class="modal-actions"><button class="btn btn-primary" id="ev-go">Log it</button></div>`,
      (body, close) => {
        body.querySelector('#ev-go').addEventListener('click', async () => {
          const file = body.querySelector('#ev-file').files[0];
          if (!file) { App.toast('Pick a file'); return; }
          const hash = await U.sha256(file);
          const blobKey = U.uid();
          await Store.putBlob(blobKey, file);
          const now = new Date().toISOString();
          App.current().evidence.push({
            id: U.uid(), name: file.name, source: body.querySelector('#ev-source').value.trim(),
            hash, size: file.size, mime: file.type, blobKey, addedAt: now,
            custody: [{ at: now, action: 'Logged into evidence locker', note: body.querySelector('#ev-note').value.trim() }],
          });
          App.save(); close(); App.render(); App.toast('Evidence logged with SHA-256 fingerprint');
        });
      });
  }

  function addCustody(id) {
    const e = App.current().evidence.find((x) => x.id === id);
    App.modal('Add custody entry', `
      <label class="field"><span>Action</span>
        <input id="cu-action" class="input" placeholder="e.g. Attached to Motion to Compel" /></label>
      <label class="field"><span>Note (optional)</span><input id="cu-note" class="input" /></label>
      <div class="modal-actions"><button class="btn btn-primary" id="cu-go">Add entry</button></div>`,
      (body, close) => {
        body.querySelector('#cu-go').addEventListener('click', () => {
          const action = body.querySelector('#cu-action').value.trim();
          if (!action) { App.toast('Describe the action'); return; }
          e.custody = e.custody || [];
          e.custody.push({ at: new Date().toISOString(), action, note: body.querySelector('#cu-note').value.trim() });
          App.save(); close(); App.render(); App.toast('Custody entry added');
        });
      });
  }

  /* ============================ RESOURCES ============================ */
  const RES_CATEGORIES = ['Court Portal', 'Docket / Case Lookup', 'Legal Research', 'Statutes / Rules', 'Opposing Party', 'Government / Agency', 'Other'];

  // A few starter links useful to most Georgia pro se litigants.
  const STARTER_LINKS = [
    { title: 'CourtListener (free case law & dockets)', url: 'https://www.courtlistener.com/', category: 'Legal Research' },
    { title: 'PeachCourt / eFileGA (GA e-filing)', url: 'https://peachcourt.com/', category: 'Court Portal' },
    { title: 'Georgia Code (LexisNexis official)', url: 'https://law.justia.com/codes/georgia/', category: 'Statutes / Rules' },
    { title: 'Uniform Superior Court Rules', url: 'https://georgiacourts.gov/rules/', category: 'Statutes / Rules' },
    { title: 'GA Secretary of State — business search', url: 'https://ecorp.sos.ga.gov/BusinessSearch', category: 'Opposing Party' },
  ];

  function resources() {
    return {
      subtitle: 'Save the sites you use for this case — and prep them for AI in one click.',
      actions: [{ label: '+ Add link', kind: 'primary', onClick: () => addResource() }],
      mount(root) {
        const c = App.current();
        root.innerHTML = `
          <div class="filterbar">
            <input id="res-filter" class="input" placeholder="Filter links…" />
            <select id="res-cat-filter" class="input">
              <option value="">All categories</option>
              ${RES_CATEGORIES.map((t) => `<option>${t}</option>`).join('')}
            </select>
            ${c.resources.length ? '' : '<button class="btn btn-sm" id="res-seed">Add starter links</button>'}
          </div>
          <div class="ai-note">
            🤖 <strong>Using these with AI:</strong> click <em>Copy for AI</em> on any link to put its address and your
            notes on the clipboard, ready to paste into Claude or another assistant. Live auto-fetching of a page's
            contents needs a connector or backend — see the notes in the repo. Paste anything the AI gives back into
            the link's <em>AI summary</em> so it travels with your case.
          </div>
          <div id="res-list" class="list"></div>`;

        const list = root.querySelector('#res-list');
        const filterEl = root.querySelector('#res-filter');
        const catEl = root.querySelector('#res-cat-filter');

        function paint() {
          const q = filterEl.value.toLowerCase().trim();
          const fc = catEl.value;
          const rows = App.current().resources
            .filter((r) => !fc || r.category === fc)
            .filter((r) => !q || [r.title, r.url, r.category, r.notes, r.aiSummary].join(' ').toLowerCase().includes(q))
            .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
          if (!rows.length) {
            list.innerHTML = emptyHint(App.current().resources.length
              ? 'No links match your filters.'
              : 'No links yet. Add one, or use the starter links above.');
            return;
          }
          list.innerHTML = rows.map(resCard).join('');
          list.querySelectorAll('[data-res]').forEach((card) => {
            const id = card.dataset.res;
            card.querySelector('[data-act="copy"]').addEventListener('click', () => copyForAI(id));
            card.querySelector('[data-act="edit"]').addEventListener('click', () => addResource(id));
            card.querySelector('[data-act="del"]').addEventListener('click', () => {
              const c2 = App.current();
              c2.resources = c2.resources.filter((x) => x.id !== id);
              App.save(); paint(); App.toast('Link removed');
            });
          });
        }

        function resCard(r) {
          let host = r.url;
          try { host = new URL(r.url).hostname.replace(/^www\./, ''); } catch (e) { /* keep raw */ }
          return `<div class="res-card" data-res="${r.id}">
            <div class="res-head">
              <div class="res-main">
                <a class="res-title" href="${U.esc(r.url)}" target="_blank" rel="noopener noreferrer">${U.esc(r.title || host)}</a>
                <div class="muted sm">${U.esc(host)} · ${U.esc(r.category)}</div>
              </div>
              <div class="res-actions">
                <button class="btn btn-sm" data-act="copy" title="Copy address + notes for pasting into an AI">Copy for AI</button>
                <button class="icon-btn" data-act="edit" title="Edit">✎</button>
                <button class="icon-btn" data-act="del" title="Delete">✕</button>
              </div>
            </div>
            ${r.notes ? `<div class="card-note">${U.esc(r.notes)}</div>` : ''}
            ${r.aiSummary ? `<div class="ai-summary"><span class="ai-summary-tag">AI summary</span>${U.esc(r.aiSummary)}</div>` : ''}
          </div>`;
        }

        filterEl.addEventListener('input', U.debounce(paint, 120));
        catEl.addEventListener('change', paint);
        const seedBtn = root.querySelector('#res-seed');
        if (seedBtn) seedBtn.addEventListener('click', () => {
          const now = new Date().toISOString();
          STARTER_LINKS.forEach((l) => App.current().resources.push({ id: U.uid(), notes: '', aiSummary: '', addedAt: now, ...l }));
          App.save(); App.render(); App.toast('Starter links added');
        });
        paint();
      },
    };
  }

  function addResource(id) {
    const c = App.current();
    const r = id ? c.resources.find((x) => x.id === id) : null;
    App.modal(r ? 'Edit link' : 'Add link', `
      <label class="field"><span>Title</span>
        <input id="r-title" class="input" placeholder="e.g. Forsyth County case search" value="${r ? U.esc(r.title) : ''}" /></label>
      <label class="field"><span>URL</span>
        <input id="r-url" class="input" placeholder="https://…" value="${r ? U.esc(r.url) : ''}" /></label>
      <label class="field"><span>Category</span>
        <select id="r-cat" class="input">${RES_CATEGORIES.map((t) => `<option ${r && r.category === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="field"><span>Why it matters / notes</span>
        <textarea id="r-notes" class="input" rows="2">${r ? U.esc(r.notes) : ''}</textarea></label>
      <label class="field"><span>AI summary (paste what an assistant tells you)</span>
        <textarea id="r-ai" class="input" rows="3">${r ? U.esc(r.aiSummary) : ''}</textarea></label>
      <div class="modal-actions"><button class="btn btn-primary" id="r-save">${r ? 'Save' : 'Add link'}</button></div>`,
      (body, close) => {
        body.querySelector('#r-save').addEventListener('click', () => {
          let url = body.querySelector('#r-url').value.trim();
          if (!url) { App.toast('A URL is required'); return; }
          if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
          const payload = {
            title: body.querySelector('#r-title').value.trim(),
            url, category: body.querySelector('#r-cat').value,
            notes: body.querySelector('#r-notes').value.trim(),
            aiSummary: body.querySelector('#r-ai').value.trim(),
          };
          if (r) { Object.assign(r, payload); }
          else { c.resources.push({ id: U.uid(), addedAt: new Date().toISOString(), ...payload }); }
          App.save(); close(); App.render(); App.toast('Link saved');
        });
      });
  }

  async function copyForAI(id) {
    const c = App.current();
    const r = c.resources.find((x) => x.id === id);
    if (!r) return;
    const block =
      `Case: ${c.name}${c.caseNumber ? ' (' + c.caseNumber + ')' : ''}\n` +
      `Resource: ${r.title || r.url}\n` +
      `URL: ${r.url}\n` +
      `Category: ${r.category}\n` +
      (r.notes ? `My notes: ${r.notes}\n` : '') +
      `\nPlease review this page and summarize what's relevant to my case, ` +
      `pull out any key links, dates, or deadlines, and flag anything I should act on.`;
    try {
      await navigator.clipboard.writeText(block);
      App.toast('Copied — paste into your AI assistant');
    } catch (e) {
      App.modal('Copy for AI', `<p class="muted">Select and copy the text below:</p>
        <textarea class="input" rows="10" readonly>${U.esc(block)}</textarea>`);
    }
  }

  /* ============================ SEARCH ============================ */
  function search() {
    return {
      subtitle: 'Ask in plain language across your whole case file.',
      actions: [],
      mount(root) {
        root.innerHTML = `
          <div class="search-hero">
            <input id="q" class="input input-lg" placeholder="e.g. every email where they admitted the balance was wrong" autofocus />
            <div class="muted sm">Searches document names, notes, types, statuses, deadlines, and evidence sources.</div>
          </div>
          <div id="results"></div>`;
        const q = root.querySelector('#q');
        const out = root.querySelector('#results');
        const run = () => { out.innerHTML = renderResults(q.value); wireResults(out); };
        q.addEventListener('input', U.debounce(run, 150));
      },
    };
  }

  // Lightweight ranked keyword search — stands in for the RAG layer, no network needed.
  function renderResults(query) {
    const terms = (query || '').toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    if (!terms.length) return emptyHint('Type a question or keywords above.');
    const c = App.current();
    const corpus = [
      ...c.documents.map((d) => ({ kind: 'Document', icon: '🗂️', id: d.id, openable: true,
        title: d.name, text: [d.name, d.type, d.status, d.notes].join(' '), meta: `${d.type} · ${d.status}` })),
      ...c.deadlines.map((d) => ({ kind: 'Deadline', icon: '⏰', title: d.title,
        text: [d.title, d.rule].join(' '), meta: U.fmtDate(d.dueDate) })),
      ...c.evidence.map((e) => ({ kind: 'Evidence', icon: '🔒', id: e.id, openable: true, title: e.name,
        text: [e.name, e.source, (e.custody || []).map((x) => x.action + ' ' + x.note).join(' ')].join(' '),
        meta: e.source || 'evidence' })),
      ...c.resources.map((r) => ({ kind: 'Resource', icon: '🔗', href: r.url, title: r.title || r.url,
        text: [r.title, r.url, r.category, r.notes, r.aiSummary].join(' '), meta: r.category })),
    ];
    const scored = corpus.map((item) => {
      const hay = item.text.toLowerCase();
      let score = 0;
      terms.forEach((t) => { if (hay.includes(t)) score += (item.title.toLowerCase().includes(t) ? 2 : 1); });
      return { item, score };
    }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

    if (!scored.length) return emptyHint('No matches. Try fewer or different words.');
    return `<div class="muted sm result-count">${scored.length} match${scored.length > 1 ? 'es' : ''}</div>
      <div class="list">${scored.map(({ item }) => `
        <div class="list-row" ${item.openable ? `data-open="${item.id}"` : ''}>
          <span class="tl-dot sm">${item.icon}</span>
          <div class="list-main"><div class="list-title">${highlight(item.title, terms)}</div>
            <div class="muted sm">${item.kind} · ${U.esc(item.meta)}</div></div>
          ${item.openable ? '<button class="btn btn-sm">Open</button>' : ''}
          ${item.href ? `<a class="btn btn-sm" href="${U.esc(item.href)}" target="_blank" rel="noopener noreferrer">Open ↗</a>` : ''}
        </div>`).join('')}</div>`;
  }

  function wireResults(out) {
    out.querySelectorAll('[data-open]').forEach((row) =>
      row.addEventListener('click', () => openDoc(row.dataset.open)));
  }

  function highlight(text, terms) {
    let safe = U.esc(text);
    terms.forEach((t) => {
      const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      safe = safe.replace(re, '<mark>$1</mark>');
    });
    return safe;
  }

  /* ============================ shared bits ============================ */
  function emptyHint(msg) { return `<div class="empty">${U.esc(msg)}</div>`; }

  window.Views = { dashboard, documents, deadlines, timeline, evidence, resources, search };
})();
