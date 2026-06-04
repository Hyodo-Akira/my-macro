// =====================================================================
// views/foods.js - Food DB tab + Food add/edit modal + Barcode lookup
// Depends on: helpers, state, image-utils, tdee (for renderRecipes hook)
// =====================================================================

// ---------- Module state ----------
let foodEditingId = null;
let foodImageData = null;

// ---------- Sub-tab switcher (食品 ↔ マイレシピ) ----------
function switchFoodTab(name) {
  document.getElementById('tab-foods').classList.toggle('active', name === 'foods');
  document.getElementById('tab-recipes').classList.toggle('active', name === 'recipes');
  document.getElementById('subview-foods').style.display   = name === 'foods'   ? 'block' : 'none';
  document.getElementById('subview-recipes').style.display = name === 'recipes' ? 'block' : 'none';
  if (name === 'foods')   renderFoodDatabase();
  if (name === 'recipes') renderRecipes();
}

// ---------- Food DB list ----------
function renderFoodDatabase() {
  const q = (document.getElementById('food-search').value || '').toLowerCase();
  let list = state.foods.filter(f => !q || f.name.toLowerCase().includes(q) || (f.barcode || '').includes(q));
  // Sort: favorites first, then keep original order for the rest
  list = list.slice().sort((a, b) => {
    const af = isFavoriteFood(a.id) ? 1 : 0;
    const bf = isFavoriteFood(b.id) ? 1 : 0;
    return bf - af;
  });
  const el = document.getElementById('food-database');
  if (!list.length) {
    el.innerHTML = '<div class="empty">該当なし</div>';
    return;
  }
  el.innerHTML = list.map(f => {
    const thumb = f.image
      ? `<img src="${f.image}" class="thumb">`
      : `<div class="thumb thumb-placeholder">🍽</div>`;
    const u = foodUnit(f);
    const fav = isFavoriteFood(f.id);
    return `
    <div class="food-list-item">
      ${thumb}
      <div class="body">
        <div class="name">
          <button class="star-btn ${fav ? 'on' : ''}" onclick="onToggleFoodFavorite(event,'${f.id}')" title="お気に入り">${fav ? '⭐' : '☆'}</button>
          ${escapeHtml(f.name)}
        </div>
        <div class="meta">${f.serving}${u} あたり: ${Math.round(f.kcal)}kcal / P${f.p} F${f.f} C${f.c}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <button class="small" onclick="openEntryFromFood('${f.id}')">追加</button>
        <button class="small secondary" onclick="openFoodModal('${f.id}')">編集</button>
      </div>
    </div>`;
  }).join('');
}

// Toggle a food's favorite state from any list (food DB or picker).
function onToggleFoodFavorite(ev, id) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  toggleFoodFavorite(id);
  const viewFoods = document.getElementById('view-foods');
  if (viewFoods && viewFoods.classList.contains('active')) renderFoodDatabase();
  const modalEntry = document.getElementById('modal-add-entry');
  if (modalEntry && modalEntry.classList.contains('active') && typeof renderEntryPicker === 'function') {
    renderEntryPicker();
  }
}

// Populate the food-unit <select> with default + custom units.
// Call this before opening the food modal so the latest custom units appear.
function populateFoodUnitSelect(selected) {
  const sel = document.getElementById('food-unit');
  if (!sel) return;
  const units = getAllUnits();
  sel.innerHTML = units.map(u => {
    const label = u === 'g' ? 'g（グラム）' : u;
    return `<option value="${escapeHtml(u)}">${escapeHtml(label)}</option>`;
  }).join('');
  if (selected && units.includes(selected)) sel.value = selected;
}

// ---------- Food modal (add/edit) ----------
function openFoodModal(id = null) {
  foodEditingId = id;
  const title = document.getElementById('food-modal-title');
  const setVal = (elId, v) => { const e = document.getElementById(elId); if (e) e.value = v; };
  if (id) {
    const f = findFood(id);
    if (!f) return;
    if (title) title.textContent = '食品を編集';
    setVal('food-name', f.name);
    // Populate unit select FIRST so the saved unit (incl. custom) is selectable
    populateFoodUnitSelect(foodUnit(f));
    setVal('food-serving', f.serving);
    setVal('food-kcal', f.kcal);
    setVal('food-p', f.p);
    setVal('food-f', f.f);
    setVal('food-c', f.c);
    setVal('food-barcode', f.barcode || '');
    showFoodImagePreview(f.image || null);
  } else {
    if (title) title.textContent = '食品を登録';
    ['food-name','food-kcal','food-p','food-f','food-c','food-barcode'].forEach(k => setVal(k, ''));
    populateFoodUnitSelect('g');
    setVal('food-serving', '100');
    showFoodImagePreview(null);
  }
  updateFoodUnitLabel();
  document.getElementById('modal-add-food').classList.add('active');
}

// Update the unit suffix shown next to "1基準分の量" when the unit dropdown changes
function updateFoodUnitLabel() {
  const sel = document.getElementById('food-unit');
  const u = (sel && sel.value) || 'g';
  const lbl = document.getElementById('food-serving-label');
  if (lbl) lbl.textContent = `1基準分の量 (${u})`;
}

// ---------- Image upload ----------
function showFoodImagePreview(dataURL) {
  foodImageData = dataURL;
  const area = document.getElementById('food-image-area');
  if (dataURL) {
    area.innerHTML = `<img src="${dataURL}"><div class="remove" onclick="event.stopPropagation();showFoodImagePreview(null)">×</div>`;
  } else {
    area.innerHTML = `<div id="food-image-placeholder">📷 タップして画像を選択</div>`;
  }
}

async function onFoodImageSelected(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const dataURL = await compressImage(file);
  showFoodImagePreview(dataURL);
  ev.target.value = '';
}

// ---------- Save / delete ----------
function saveFood() {
  const name = document.getElementById('food-name').value.trim();
  if (!name) { alert('食品名を入力してください'); return; }
  const unitEl = document.getElementById('food-unit');
  const data = {
    name,
    unit: (unitEl && unitEl.value) || 'g',
    serving: parseFloat(document.getElementById('food-serving').value) || 100,
    kcal: parseFloat(document.getElementById('food-kcal').value) || 0,
    p:    parseFloat(document.getElementById('food-p').value)    || 0,
    f:    parseFloat(document.getElementById('food-f').value)    || 0,
    c:    parseFloat(document.getElementById('food-c').value)    || 0,
    barcode: document.getElementById('food-barcode').value.trim() || null,
    image: foodImageData,
  };
  if (foodEditingId) {
    const idx = state.foods.findIndex(f => f.id === foodEditingId);
    if (idx >= 0) state.foods[idx] = { ...state.foods[idx], ...data };
  } else {
    state.foods.push({ id: uid('f'), ...data });
  }
  saveState();
  closeModal('modal-add-food');
  renderFoodDatabase();
}

function deleteFood(id) {
  if (!confirm('この食品を削除しますか？')) return;
  state.foods = state.foods.filter(f => f.id !== id);
  saveState();
  renderFoodDatabase();
}

// ---------- Barcode lookup (Open Food Facts) ----------
function openBarcodeModal() {
  document.getElementById('barcode-input').value = '';
  document.getElementById('barcode-result').innerHTML = '';
  document.getElementById('modal-barcode').classList.add('active');
}

async function lookupBarcode() {
  const code = document.getElementById('barcode-input').value.trim();
  if (!code) return;
  const result = document.getElementById('barcode-result');
  result.innerHTML = '<div class="info-text">検索中...</div>';
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      result.innerHTML = '<div class="info-text">商品が見つかりませんでした。手動で登録してください。</div>';
      return;
    }
    const p = data.product;
    const n = p.nutriments || {};
    const name = p.product_name_ja || p.product_name || p.generic_name || '不明';
    const kcal100 = n['energy-kcal_100g'] || (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);
    const prot = n.proteins_100g || 0;
    const fat = n.fat_100g || 0;
    const carb = n.carbohydrates_100g || 0;
    result.innerHTML = `<div class="food-list-item" style="margin-top:8px;">
      <div class="body">
        <div class="name">${escapeHtml(name)}</div>
        <div class="meta">100gあたり: ${Math.round(kcal100)}kcal / P${round1(prot)} F${round1(fat)} C${round1(carb)}</div>
        <button class="small" style="margin-top:6px;" onclick='saveBarcodeFood(${JSON.stringify({name, kcal100, prot, fat, carb, code})})'>食品DBに追加</button>
      </div>
    </div>`;
  } catch (e) {
    result.innerHTML = '<div class="info-text">通信エラーが発生しました</div>';
  }
}

function saveBarcodeFood(d) {
  state.foods.push({
    id: uid('f'),
    name: d.name,
    unit: 'g',
    serving: 100,
    kcal: round1(d.kcal100),
    p: round1(d.prot),
    f: round1(d.fat),
    c: round1(d.carb),
    barcode: d.code,
  });
  saveState();
  closeModal('modal-barcode');
  alert('食品DBに追加しました');
  if (document.getElementById('view-foods').classList.contains('active')) renderFoodDatabase();
}
