// =====================================================================
// views/today.js - Today tab + entry modal (add & edit)
// Depends on: helpers, state, tdee
// =====================================================================

// ---------- Module state ----------
let entryTab = 'foods';
let entrySelected = null;
let entryEditing = null;  // { date, idx } when editing an existing log entry

// ---------- Date navigation ----------
function changeDay(delta) {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + delta);
  currentDate = d.toISOString().slice(0, 10);
  renderToday();
}

// ---------- Render today ----------
function renderToday() {
  document.getElementById('today-date').textContent = fmtDate(currentDate);
  const t = dayTotals(currentDate);
  const tgt = macroTargets();

  // Calorie display - count-down (remaining) or count-up (consumed)
  const mode = state.settings.calorieDisplay || 'remaining';
  const calOver = t.kcal > tgt.kcal;
  const bigNumEl = document.getElementById('cal-remaining');
  const bigLabelEl = document.getElementById('cal-remaining-label');
  if (bigNumEl) {
    if (mode === 'consumed') {
      bigNumEl.textContent = t.kcal;
      if (bigLabelEl) bigLabelEl.textContent = '摂取 kcal';
    } else {
      const diff = tgt.kcal - t.kcal;
      bigNumEl.textContent = diff;  // negative when over
      if (bigLabelEl) bigLabelEl.textContent = calOver ? 'オーバー kcal' : '残り kcal';
    }
    bigNumEl.classList.toggle('over-target', calOver);
  }

  const calConsumedEl = document.getElementById('cal-consumed');
  if (calConsumedEl) calConsumedEl.textContent = t.kcal;
  const calTargetEl = document.getElementById('cal-target');
  if (calTargetEl) calTargetEl.textContent = tgt.kcal;
  const calBar = document.getElementById('cal-bar');
  if (calBar) {
    calBar.style.width = clamp(t.kcal / tgt.kcal * 100, 0, 100) + '%';
    calBar.classList.toggle('over-target', calOver);
  }

  // Macros with over indication
  ['p', 'f', 'c'].forEach(macro => {
    const cur = t[macro];
    const target = tgt[macro];
    const over = cur > target;
    const valEl = document.getElementById(macro + '-val');
    const tgtEl = document.getElementById(macro + '-tgt');
    const bar = document.getElementById(macro + '-bar');
    if (valEl) valEl.textContent = cur;
    if (tgtEl) tgtEl.textContent = target;
    if (bar) {
      bar.style.width = clamp(cur / target * 100, 0, 100) + '%';
      bar.classList.toggle('over-target', over);
    }
    // Apply over-target class to the val container (parent of span#X-val), if structure matches
    if (valEl && valEl.parentElement) {
      valEl.parentElement.classList.toggle('over-target', over);
    }
  });

  // Meal sections
  const meals = ['breakfast', 'lunch', 'dinner', 'snack'];
  const labels = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' };
  const container = document.getElementById('meals-container');
  container.innerHTML = '';
  const entries = state.entries[currentDate] || [];
  meals.forEach(m => {
    const mealEntries = entries
      .map((e, idx) => ({ e, idx }))
      .filter(x => x.e.meal === m);
    let html = `<div class="meal-section"><div class="meal-title"><span>${labels[m]}</span>
      <button class="ghost meal-add" onclick="openEntryModal('${m}')">＋</button></div>`;
    if (!mealEntries.length) {
      html += '<div class="empty" style="padding:8px;">記録なし</div>';
    } else {
      mealEntries.forEach(({ e, idx }) => {
        const n = entryNutrition(e);
        const d = entryDisplay(e);
        const thumb = d.image
          ? `<img src="${d.image}" class="thumb-sm">`
          : `<div class="thumb-sm thumb-placeholder">${e.type === 'recipe' ? '📖' : '🍽'}</div>`;
        html += `<div class="food-item">
          ${thumb}
          <div style="flex:1;min-width:0;">
            <div class="name">${escapeHtml(d.name)}${e.type === 'recipe' ? ' <span class="badge calc">レシピ</span>' : ''}</div>
            <div class="meta">${d.amount} ・ P${round1(n.p)} F${round1(n.f)} C${round1(n.c)}</div>
          </div>
          <div style="text-align:right;display:flex;flex-direction:column;gap:2px;align-items:flex-end;">
            <div class="kcal">${Math.round(n.kcal)} kcal</div>
            <div style="display:flex;gap:4px;">
              <button class="small secondary" onclick="openEntryEdit('${currentDate}', ${idx})">編集</button>
              <button class="small ghost" onclick="deleteEntry('${currentDate}', ${idx})">削除</button>
            </div>
          </div>
        </div>`;
      });
    }
    html += '</div>';
    container.innerHTML += html;
  });
}

// ---------- Entry modal: open for new entry ----------
function openEntryModal(meal) {
  entryEditing = null;  // we're adding, not editing
  const titleEl = document.getElementById('entry-modal-title');
  if (titleEl) titleEl.textContent = '食事に追加';
  const saveBtn = document.getElementById('entry-save-btn');
  if (saveBtn) {
    saveBtn.textContent = '追加';
    saveBtn.disabled = true;
  }
  document.getElementById('entry-meal').value = meal || 'breakfast';
  document.getElementById('entry-search').value = '';
  entrySelected = null;
  entryTab = 'foods';
  switchEntryTab('foods');
  document.getElementById('entry-amount-block').style.display = 'none';
  document.getElementById('modal-add-entry').classList.add('active');
}

// ---------- Entry modal: open for editing an existing log entry ----------
function openEntryEdit(date, idx) {
  const entry = (state.entries[date] || [])[idx];
  if (!entry) return;
  // Start by opening as a fresh modal (this clears entryEditing)
  openEntryModal(entry.meal);
  // Then mark as editing and pre-fill
  entryEditing = { date, idx };
  const titleEl = document.getElementById('entry-modal-title');
  if (titleEl) titleEl.textContent = '食事を編集';
  const saveBtn = document.getElementById('entry-save-btn');
  if (saveBtn) saveBtn.textContent = '保存';
  entryTab = entry.type === 'recipe' ? 'recipes' : 'foods';
  switchEntryTab(entryTab);
  if (entry.type === 'recipe') {
    selectEntryItem('recipe', entry.recipeId);
    document.getElementById('entry-amount').value = entry.servings;
  } else {
    selectEntryItem('food', entry.foodId);
    document.getElementById('entry-amount').value = entry.amount;
  }
  document.getElementById('entry-meal').value = entry.meal;
  updateEntryPreview();
}

// Open the modal from the food DB list and pre-select the food
function openEntryFromFood(foodId) {
  switchView('today');
  openEntryModal('breakfast');
  selectEntryItem('food', foodId);
}

// ---------- Entry tab switcher ----------
function switchEntryTab(name) {
  entryTab = name;
  document.getElementById('entry-tab-foods').classList.toggle('active', name === 'foods');
  document.getElementById('entry-tab-recipes').classList.toggle('active', name === 'recipes');
  document.getElementById('entry-search').value = '';
  entrySelected = null;
  document.getElementById('entry-amount-block').style.display = 'none';
  document.getElementById('entry-save-btn').disabled = true;
  renderEntryPicker();
}

// ---------- Picker (searchable list of foods or recipes) ----------
function renderEntryPicker() {
  const q = (document.getElementById('entry-search').value || '').toLowerCase();
  const list = document.getElementById('entry-picker');
  let items;
  if (entryTab === 'foods') {
    items = state.foods.filter(f => !q || f.name.toLowerCase().includes(q));
    if (!items.length) { list.innerHTML = '<div class="empty">該当なし</div>'; return; }
    list.innerHTML = items.map(f => {
      const thumb = f.image
        ? `<img src="${f.image}" class="thumb-sm">`
        : `<div class="thumb-sm thumb-placeholder">🍽</div>`;
      const sel = entrySelected && entrySelected.type === 'food' && entrySelected.id === f.id;
      const u = foodUnit(f);
      return `<div class="picker-item ${sel ? 'selected' : ''}" onclick="selectEntryItem('food', '${f.id}')">
        ${thumb}
        <div class="body">
          <div class="name">${escapeHtml(f.name)}</div>
          <div class="meta">${f.serving}${u} / ${Math.round(f.kcal)}kcal</div>
        </div>
      </div>`;
    }).join('');
  } else {
    items = state.recipes.filter(r => !q || r.name.toLowerCase().includes(q));
    if (!items.length) { list.innerHTML = '<div class="empty">レシピがありません。<br>「食品」タブの右の「マイレシピ」タブから作成できます。</div>'; return; }
    list.innerHTML = items.map(r => {
      const per = recipePerServing(r);
      const thumb = r.image
        ? `<img src="${r.image}" class="thumb-sm">`
        : `<div class="thumb-sm thumb-placeholder">📖</div>`;
      const sel = entrySelected && entrySelected.type === 'recipe' && entrySelected.id === r.id;
      return `<div class="picker-item ${sel ? 'selected' : ''}" onclick="selectEntryItem('recipe', '${r.id}')">
        ${thumb}
        <div class="body">
          <div class="name">${escapeHtml(r.name)}</div>
          <div class="meta">1人前: ${Math.round(per.kcal)}kcal (全${r.servings}人前)</div>
        </div>
      </div>`;
    }).join('');
  }
}

function selectEntryItem(type, id) {
  entrySelected = { type, id };
  renderEntryPicker();
  const block = document.getElementById('entry-amount-block');
  block.style.display = 'block';
  if (type === 'food') {
    const f = findFood(id);
    const u = foodUnit(f);
    document.getElementById('entry-amount-label').innerHTML =
      `分量 (${u}) <span id="entry-serving-hint" class="info-text">(基準: ${f.serving}${u})</span>`;
    document.getElementById('entry-amount').value = f.serving;
  } else {
    const r = findRecipe(id);
    document.getElementById('entry-amount-label').innerHTML =
      `分量 (人前) <span id="entry-serving-hint" class="info-text">(全${r.servings}人前)</span>`;
    document.getElementById('entry-amount').value = 1;
  }
  document.getElementById('entry-save-btn').disabled = false;
  updateEntryPreview();
}

function updateEntryPreview() {
  if (!entrySelected) return;
  const amt = parseFloat(document.getElementById('entry-amount').value) || 0;
  let n;
  if (entrySelected.type === 'food') {
    n = entryNutrition({ type: 'food', foodId: entrySelected.id, amount: amt });
  } else {
    n = entryNutrition({ type: 'recipe', recipeId: entrySelected.id, servings: amt });
  }
  document.getElementById('entry-preview').innerHTML =
    `合計: <strong>${Math.round(n.kcal)} kcal</strong> ・ P${round1(n.p)} F${round1(n.f)} C${round1(n.c)}`;
}

// ---------- Save entry (handles both add and edit) ----------
function saveEntry() {
  if (!entrySelected) return;
  const amt = parseFloat(document.getElementById('entry-amount').value);
  const meal = document.getElementById('entry-meal').value;
  if (!amt || amt <= 0) { alert('分量を入力してください'); return; }

  const newEntry = entrySelected.type === 'food'
    ? { type: 'food',   foodId:   entrySelected.id, amount:   amt, meal }
    : { type: 'recipe', recipeId: entrySelected.id, servings: amt, meal };

  if (entryEditing) {
    // Update existing
    const arr = state.entries[entryEditing.date];
    if (arr && arr[entryEditing.idx]) {
      arr[entryEditing.idx] = newEntry;
    }
    entryEditing = null;
  } else {
    // Add new
    if (!state.entries[currentDate]) state.entries[currentDate] = [];
    state.entries[currentDate].push(newEntry);
  }
  saveState();
  closeModal('modal-add-entry');
  renderToday();
}

function deleteEntry(date, idx) {
  state.entries[date].splice(idx, 1);
  saveState();
  renderToday();
}
