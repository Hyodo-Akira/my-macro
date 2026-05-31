// =====================================================================
// app.js - View router + modal close + boot
// Loaded last; depends on every view module.
// =====================================================================

// ---------- View switcher (bottom nav) ----------
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  if (name === 'today') renderToday();
  if (name === 'weight') renderWeight();
  if (name === 'stats') renderStats();
  if (name === 'foods') { renderFoodDatabase(); renderRecipes(); }
  if (name === 'settings') loadSettingsForm();
  const titles = { today: '今日', weight: '体重 & TDEE', stats: '分析', foods: '食品 & レシピ', settings: '設定' };
  document.getElementById('header-title').textContent = 'MyMacro';
  document.getElementById('header-sub').textContent = titles[name] || '';
  window.scrollTo(0, 0);
}

// ---------- Modal close (used by every modal) ----------
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ---------- Boot ----------
renderToday();
