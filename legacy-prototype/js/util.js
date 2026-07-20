/* util.js — small helpers shared across views. */
(function () {
  'use strict';

  const uid = () =>
    'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Minimal HTML escaping for anything user-provided that we drop into markup.
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtBytes(n) {
    if (!n && n !== 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  // Days from today (negative = past). Uses date-only comparison.
  function daysUntil(iso) {
    if (!iso) return null;
    const due = new Date(iso);
    if (isNaN(due)) return null;
    const today = new Date();
    const a = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
    const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((a - b) / 86400000);
  }

  function relDeadline(iso) {
    const d = daysUntil(iso);
    if (d === null) return { label: '—', tone: 'muted' };
    if (d < 0) return { label: `${Math.abs(d)}d overdue`, tone: 'danger' };
    if (d === 0) return { label: 'Due today', tone: 'danger' };
    if (d <= 7) return { label: `in ${d}d`, tone: 'warn' };
    return { label: `in ${d}d`, tone: 'ok' };
  }

  // SHA-256 of a File/Blob via Web Crypto — the chain-of-custody fingerprint.
  async function sha256(blob) {
    const buf = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Guess a legal document category from the filename. Heuristic, user-editable.
  const DOC_TYPES = ['Pleading', 'Motion', 'Exhibit', 'Correspondence', 'Discovery', 'Order', 'Other'];
  function guessType(name) {
    const n = (name || '').toLowerCase();
    if (/(complaint|answer|petition|counterclaim|pleading)/.test(n)) return 'Pleading';
    if (/(motion|brief|memo|opposition|reply|response)/.test(n)) return 'Motion';
    if (/(exhibit|exh[_-]?[a-z0-9])/.test(n)) return 'Exhibit';
    if (/(letter|email|corresp|notice)/.test(n)) return 'Correspondence';
    if (/(interrog|discovery|request|rfp|rfa|deposition|subpoena)/.test(n)) return 'Discovery';
    if (/(order|ruling|judgment|decree)/.test(n)) return 'Order';
    return 'Other';
  }

  const DOC_STATUS = ['Draft', 'Filed', 'Served', 'Pending Response'];

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  window.Util = {
    uid, esc, fmtBytes, fmtDate, fmtDateTime, daysUntil, relDeadline,
    sha256, guessType, DOC_TYPES, DOC_STATUS, debounce,
  };
})();
