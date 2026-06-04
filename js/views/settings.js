// =====================================================================
// views/settings.js - Settings form + JSON import/export + reset
// Depends on: helpers, state
// =====================================================================

function loadSettingsForm() {
  const s = state.settings;
  const setVal = (elId, v) => { const e = document.getElementById(elId); if (e) e.value = v; };
  setVal('set-sex', s.sex);
  setVal('set-age', s.age);
  setVal('set-height', s.height);
  setVal('set-activity', s.activity);
  setVal('set-goal', s.goal);
  setVal('set-target-weight', s.targetWeight || '');
  setVal('set-target-date', s.targetDate || '');
  setVal('set-macro-mode', s.macroMode);
  setVal('set-p', s.manualP);
  setVal('set-f', s.manualF);
  setVal('set-c', s.manualC);
  // v2 display option
  setVal('set-cal-display', s.calorieDisplay || 'remaining');
  updateMacroUI();
  renderCustomUnitsList();
}

// ---------- Custom units management (v3) ----------
function renderCustomUnitsList() {
  const el = document.getElementById('custom-units-list');
  if (!el) return;
  const custom = state.settings.customUnits || [];
  if (!custom.length) {
    el.innerHTML = '<div class="info-text">追加した単位はまだありません</div>';
    return;
  }
  // Pass index (safe primitive) to remove handler; lookup the unit at click time.
  el.innerHTML = custom.map((u, i) => `
    <div class="unit-chip">
      <span>${escapeHtml(u)}</span>
      <button class="small ghost" onclick="onRemoveCustomUnit(${i})">×</button>
    </div>
  `).join('');
}

function onAddCustomUnit() {
  const input = document.getElementById('custom-unit-input');
  if (!input) return;
  const u = (input.value || '').trim();
  if (!u) return;
  if (u.length > 6) { alert('単位は6文字以内で入力してください'); return; }
  const ok = addCustomUnit(u);
  if (!ok) { alert('すでに登録済みの単位です'); return; }
  input.value = '';
  renderCustomUnitsList();
}

function onRemoveCustomUnit(idx) {
  const u = (state.settings.customUnits || [])[idx];
  if (!u) return;
  if (!confirm(`単位「${u}」を削除しますか？(既に使用中の食品はそのまま残ります)`)) return;
  removeCustomUnit(u);
  renderCustomUnitsList();
}

function updateMacroUI() {
  const m = document.getElementById('set-macro-mode').value;
  document.getElementById('macro-manual').style.display = m === 'manual' ? 'grid' : 'none';
}

// Placeholder kept so the HTML's inline handlers don't break.
function updateGoalUI() { /* no-op */ }

function saveSettings() {
  const s = state.settings;
  const getStr = (id, def='') => { const e = document.getElementById(id); return e ? e.value : def; };
  const getNum = (id, def) => { const e = document.getElementById(id); return e ? (+e.value || def) : def; };
  s.sex = getStr('set-sex', s.sex);
  s.age = getNum('set-age', 30);
  s.height = getNum('set-height', 170);
  s.activity = getNum('set-activity', s.activity);
  s.goal = getStr('set-goal', s.goal);
  s.targetWeight = +getStr('set-target-weight') || null;
  s.targetDate = getStr('set-target-date') || null;
  s.macroMode = getStr('set-macro-mode', s.macroMode);
  s.manualP = getNum('set-p', 0);
  s.manualF = getNum('set-f', 0);
  s.manualC = getNum('set-c', 0);
  s.calorieDisplay = getStr('set-cal-display', 'remaining') || 'remaining';
  saveState();
  alert('設定を保存しました');
  // re-render today so display mode change takes effect immediately
  if (typeof renderToday === 'function') renderToday();
}

// ---------- Export ----------
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mymacro_export_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Import ----------
function importData(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm('既存のデータが上書きされます。続行しますか？')) return;
      state = data;
      // Ensure new fields exist
      if (!state.recipes) state.recipes = [];
      if (!state.settings.calorieDisplay) state.settings.calorieDisplay = 'remaining';
      state.foods = state.foods.map(f => ({ unit: 'g', ...f }));
      saveState();
      alert('インポートしました');
      location.reload();
    } catch (err) {
      alert('インポートに失敗しました: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ---------- Reset ----------
function resetAll() {
  if (!confirm('本当に全てのデータをリセットしますか？(取り消せません)')) return;
  if (!confirm('もう一度確認します。本当によろしいですか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  location.reload();
}
