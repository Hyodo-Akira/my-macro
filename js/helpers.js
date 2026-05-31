// =====================================================================
// helpers.js - Date/string utilities + closeModal
// No dependencies
// =====================================================================

function todayStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function fmtDate(s) {
  const d = new Date(s + 'T00:00:00');
  return `${d.getMonth()+1}/${d.getDate()} (${'日月火水木金土'[d.getDay()]})`;
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function round1(n) { return Math.round(n * 10) / 10; }
function uid(prefix='f') { return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------- Modal ----------
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}
