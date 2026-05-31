// =====================================================================
// views/settings.js - Settings form + JSON import/export + reset
// Depends on: helpers, state
// =====================================================================

function loadSettingsForm() {
  const s = state.settings;
  document.getElementById('set-sex').value = s.sex;
  document.getElementById('set-age').value = s.age;
  document.getElementById('set-height').value = s.height;
  document.getElementById('set-activity').value = s.activity;
  document.getElementById('set-goal').value = s.goal;
  document.getElementById('set-target-weight').value = s.targetWeight || '';
  document.getElementById('set-target-date').value = s.targetDate || '';
  document.getElementById('set-macro-mode').value = s.macroMode;
  document.getElementById('set-p').value = s.manualP;
  document.getElementById('set-f').value = s.manualF;
  document.getElementById('set-c').value = s.manualC;
  // v2 display option
  document.getElementById('set-cal-display').value = s.calorieDisplay || 'remaining';
  updateMacroUI();
}

function updateMacroUI() {
  const m = document.getElementById('set-macro-mode').value;
  document.getElementById('macro-manual').style.display = m === 'manual' ? 'grid' : 'none';
}

// Placeholder kept so the HTML's inline handlers don't break.
function updateGoalUI() { /* no-op */ }

function saveSettings() {
  const s = state.settings;
  s.sex = document.getElementById('set-sex').value;
  s.age = +document.getElementById('set-age').value || 30;
  s.height = +document.getElementById('set-height').value || 170;
  s.activity = +document.getElementById('set-activity').value;
  s.goal = document.getElementById('set-goal').value;
  s.targetWeight = +document.getElementById('set-target-weight').value || null;
  s.targetDate = document.getElementById('set-target-date').value || null;
  s.macroMode = document.getElementById('set-macro-mode').value;
  s.manualP = +document.getElementById('set-p').value || 0;
  s.manualF = +document.getElementById('set-f').value || 0;
  s.manualC = +document.getElementById('set-c').value || 0;
  s.calorieDisplay = document.getElementById('set-cal-display').value || 'remaining';
  saveState();
  alert('設定を保存しました');
  // re-render today so display mode change takes effect immediately
  renderToday();
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
