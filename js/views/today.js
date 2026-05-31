// =====================================================================
// views/today.js - Today view (calorie/macro summary, meal log)
//                  + Entry add modal (food/recipe picker)
// Depends on: helpers, state, tdee
// =====================================================================

// ---------- Entry modal state ----------
let entryTab = 'foods';       // 'foods' or 'recipes'
let entrySelected = null;     // { type: 'food'|'recipe', id }

// ---------- Today view rendering ----------
function changeDay(delta) {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + delta);
  currentDate = d.toISOString().slice(0, 10);
  renderToday();
}

function renderToday() {
  document.getElementById('today-date').textContent = fmtDate(currentDate);
  const t = dayTotals(currentDate);
  const tgt = macroTargets();
  document.getElementById('cal-consumed').textContent = t.kcal;
  document.getElementById('cal-target').textContent = tgt.kcal;
  document.getElementById('cal-remaining').textContent = Math.max(0, tgt.kcal - t.kcal);
  document.getElementById('cal-bar').style.width = clamp(t.kcal / tgt.kcal * 100, 0, 100) + '%';
  document.getElementById('p-val').textContent = t.p;
  document.getElementById('f-val').textContent = t.f;
  document.getElementById('c-val').textContent = t.c;
  document.getElementById('p-tgt').textContent = tgt.p;
  document.getElementById('f-tgt').textContent = tgt.f;
  document.getElementById('c-tgt').textContent = tgt.c;
  document.getElementById('p-bar').style.width = clamp(t.p / tgt.p * 100, 0, 100) + '%';
  document.getElementById('f-bar').style.width = clamp(t.f / tgt.f * 100, 0, 100) + '%';
  document.getElementById('c-bar').style.width = clamp(t.c / tgt.c * 100, 0, 100) + '%';

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
          <div style="text-align:right;">
            <div class="kcal">${Math.round(n.kcal)} kcal</div>
            <button class="small ghost" onclick="deleteEntry('${currentDate}', ${idx})">削除</button>
          </div>
        </div>`;
      });
    }
    html += '</div>';
    container.innerHTML += html;
  });
}

// ---------- Entry modal (searchable food/recipe picker) ----------
function openEntryModal(meal) {
  document.getElementById('entry-meal').value = meal || 'breakfast';
  document.getElementById('entry-search').value = '';
  entrySelected = null;
  entryTab = 'foods';
  switchEntryTab('foods');
  document.getElementById('entry-amount-block').style.display = 'none';
  document.getElementById('entry-save-btn').disabled = true;
  document.getElementById('modal-add-entry').classList.add('active');
}

function openEntryFromFood(foodId) {
  switchView('today');
  openEntryModal('breakfast');
  selectEntryItem('food', foodId);
}

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
      return `<div class="picker-item ${sel ? 'selected' : ''}" onclick="selectEntryItem('food', '${f.id}')">
        ${thumb}
        <div class="body">
          <div class="name">${escapeHtml(f.name)}</div>
          <div class="meta">${f.serving}g / ${Math.round(f.kcal)}kcal</div>
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
    document.getElementById('entry-amount-label').innerHTML = `分量 (g) <span id="entry-serving-hint" class="info-text">(基準: ${f.serving}g)</span>`;
    document.getElementById('entry-amount').value = f.serving;  // auto-fill serving size
  } else {
    const r = findRecipe(id);
    document.getElementById('entry-amount-label').innerHTML = `分量 (人前) <span id="entry-serving-hint" class="info-text">(全${r.servings}人前)</span>`;
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

function saveEntry() {
  if (!entrySelected) return;
  const amt = parseFloat(document.getElementById('entry-amount').value);
  const meal = document.getElementById('entry-meal').value;
  if (!amt || amt <= 0) { alert('分量を入力してください'); return; }
  if (!state.entries[currentDate]) state.entries[currentDate] = [];
  if (entrySelected.type === 'food') {
    state.entries[currentDate].push({ type: 'food', foodId: entrySelected.id, amount: amt, meal });
  } else {
    state.entries[currentDate].push({ type: 'recipe', recipeId: entrySelected.id, servings: amt, meal });
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
