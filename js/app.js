// =====================================================================
// app.js - View switcher + boot
// Depends on: ALL other modules
// Loads last; all functions referenced here must already be defined.
// =====================================================================

function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const viewEl = document.getElementById('view-' + name);
  if (viewEl) viewEl.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'today')    renderToday();
  if (name === 'weight')   renderWeight();
  if (name === 'stats')    renderStats();
  if (name === 'foods')    { renderFoodDatabase(); renderRecipes(); }
  if (name === 'settings') loadSettingsForm();
  const titles = {today:'今日', weight:'体重 & TDEE', stats:'分析', foods:'食品 & レシピ', settings:'設定'};
  const hTitle = document.getElementById('header-title');
  const hSub = document.getElementById('header-sub');
  if (hTitle) hTitle.textContent = 'MyMacro';
  if (hSub) hSub.textContent = titles[name] || '';
  window.scrollTo(0, 0);
}

// ---------- Boot ----------
// Render today on initial load. Wrap in try/catch so a single bad entry
// doesn't leave the page blank.
try {
  renderToday();
} catch (e) {
  console.error('Initial renderToday failed:', e);
}
