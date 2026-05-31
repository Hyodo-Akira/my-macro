// =====================================================================
// views/recipes.js - My Recipes tab + Recipe modal + Ingredient picker
// Depends on: helpers, state, image-utils, tdee
// =====================================================================

// ---------- Recipe modal state ----------
let recipeEditingId = null;
let recipeDraft = null;         // { ingredients: [...] }
let pendingIngredient = null;   // foodId being added
let recipeImageData = null;

// ---------- Recipe list ----------
function renderRecipes() {
  const q = (document.getElementById('recipe-search').value || '').toLowerCase();
  const list = state.recipes.filter(r => !q || r.name.toLowerCase().includes(q));
  const el = document.getElementById('recipe-list');
  if (!list.length) {
    el.innerHTML = '<div class="empty">レシピを作成してみましょう</div>';
    return;
  }
  el.innerHTML = list.map(r => {
    const per = recipePerServing(r);
    const thumb = r.image
      ? `<img src="${r.image}" class="thumb">`
      : `<div class="thumb thumb-placeholder">📖</div>`;
    return `
    <div class="food-list-item">
      ${thumb}
      <div class="body">
        <div class="name">${escapeHtml(r.name)}</div>
        <div class="meta">1人前: ${Math.round(per.kcal)}kcal / P${round1(per.p)} F${round1(per.f)} C${round1(per.c)}</div>
        <div class="meta">${(r.ingredients || []).length}食材・全${r.servings}人前</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <button class="small secondary" onclick="openRecipeModal('${r.id}')">編集</button>
        <button class="small ghost" onclick="deleteRecipe('${r.id}')">×</button>
      </div>
    </div>`;
  }).join('');
}

// ---------- Recipe image ----------
function showRecipeImagePreview(dataURL) {
  recipeImageData = dataURL;
  const area = document.getElementById('recipe-image-area');
  if (dataURL) {
    area.innerHTML = `<img src="${dataURL}"><div class="remove" onclick="event.stopPropagation();showRecipeImagePreview(null)">×</div>`;
  } else {
    area.innerHTML = `<div id="recipe-image-placeholder">📷 タップして画像を選択</div>`;
  }
}

async function onRecipeImageSelected(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const dataURL = await compressImage(file);
  showRecipeImagePreview(dataURL);
  ev.target.value = '';
}

// ---------- Recipe modal ----------
function openRecipeModal(id = null) {
  recipeEditingId = id;
  if (id) {
    const r = findRecipe(id);
    if (!r) return;
    document.getElementById('recipe-modal-title').textContent = 'レシピを編集';
    document.getElementById('recipe-name').value = r.name;
    document.getElementById('recipe-servings').value = r.servings;
    showRecipeImagePreview(r.image || null);
    recipeDraft = JSON.parse(JSON.stringify({ ingredients: r.ingredients || [] }));
  } else {
    document.getElementById('recipe-modal-title').textContent = 'レシピを作成';
    document.getElementById('recipe-name').value = '';
    document.getElementById('recipe-servings').value = 1;
    showRecipeImagePreview(null);
    recipeDraft = { ingredients: [] };
  }
  renderRecipeIngredients();
  document.getElementById('modal-recipe').classList.add('active');
}

function renderRecipeIngredients() {
  const el = document.getElementById('recipe-ingredients');
  if (!recipeDraft.ingredients.length) {
    el.innerHTML = '<div class="empty" style="padding:12px;">食材を追加してください</div>';
  } else {
    el.innerHTML = recipeDraft.ingredients.map((ing, idx) => {
      const f = findFood(ing.foodId);
      const name = f ? f.name : '(不明)';
      return `<div class="ingredient-row">
        <div class="name">${escapeHtml(name)}</div>
        <input type="number" step="any" value="${ing.amount}" onchange="updateIngredientAmount(${idx}, this.value)" inputmode="decimal">
        <span style="font-size:11px;color:var(--text-dim);">g</span>
        <button class="small ghost" onclick="removeIngredient(${idx})">×</button>
      </div>`;
    }).join('');
  }
  updateRecipeSummary();
}

function updateIngredientAmount(idx, val) {
  const v = parseFloat(val);
  if (v > 0) recipeDraft.ingredients[idx].amount = v;
  updateRecipeSummary();
}

function removeIngredient(idx) {
  recipeDraft.ingredients.splice(idx, 1);
  renderRecipeIngredients();
}

function updateRecipeSummary() {
  const servings = parseFloat(document.getElementById('recipe-servings').value) || 1;
  const fake = { ingredients: recipeDraft.ingredients, servings };
  const total = recipeNutrition(fake);
  const per = recipePerServing(fake);
  const el = document.getElementById('recipe-summary');
  if (!recipeDraft.ingredients.length) {
    el.textContent = '食材を追加してください';
    return;
  }
  el.innerHTML = `
    <strong>全量:</strong> ${Math.round(total.kcal)}kcal / P${round1(total.p)} F${round1(total.f)} C${round1(total.c)}<br>
    <strong>1人前:</strong> ${Math.round(per.kcal)}kcal / P${round1(per.p)} F${round1(per.f)} C${round1(per.c)}
  `;
}

function saveRecipe() {
  const name = document.getElementById('recipe-name').value.trim();
  const servings = parseFloat(document.getElementById('recipe-servings').value) || 1;
  if (!name) { alert('レシピ名を入力してください'); return; }
  if (!recipeDraft.ingredients.length) { alert('食材を1つ以上追加してください'); return; }
  const data = {
    name,
    servings,
    image: recipeImageData,
    ingredients: recipeDraft.ingredients,
  };
  if (recipeEditingId) {
    const idx = state.recipes.findIndex(r => r.id === recipeEditingId);
    if (idx >= 0) state.recipes[idx] = { ...state.recipes[idx], ...data };
  } else {
    state.recipes.push({ id: uid('r'), ...data });
  }
  saveState();
  closeModal('modal-recipe');
  renderRecipes();
}

function deleteRecipe(id) {
  if (!confirm('このレシピを削除しますか？')) return;
  state.recipes = state.recipes.filter(r => r.id !== id);
  saveState();
  renderRecipes();
}

// recipe-servings change should update the summary live
document.addEventListener('input', function(ev) {
  if (ev.target && ev.target.id === 'recipe-servings') updateRecipeSummary();
});

// ---------- Ingredient picker (used inside Recipe modal) ----------
function openIngredientPicker() {
  pendingIngredient = null;
  document.getElementById('ingredient-search').value = '';
  document.getElementById('ingredient-amount-block').style.display = 'none';
  document.getElementById('ingredient-add-btn').disabled = true;
  renderIngredientPicker();
  document.getElementById('modal-ingredient-picker').classList.add('active');
}

function renderIngredientPicker() {
  const q = (document.getElementById('ingredient-search').value || '').toLowerCase();
  const list = document.getElementById('ingredient-picker-list');
  const items = state.foods.filter(f => !q || f.name.toLowerCase().includes(q));
  if (!items.length) { list.innerHTML = '<div class="empty">該当なし</div>'; return; }
  list.innerHTML = items.map(f => {
    const sel = pendingIngredient === f.id;
    const thumb = f.image
      ? `<img src="${f.image}" class="thumb-sm">`
      : `<div class="thumb-sm thumb-placeholder">🍽</div>`;
    return `<div class="picker-item ${sel ? 'selected' : ''}" onclick="selectIngredient('${f.id}')">
      ${thumb}
      <div class="body">
        <div class="name">${escapeHtml(f.name)}</div>
        <div class="meta">${f.serving}g / ${Math.round(f.kcal)}kcal</div>
      </div>
    </div>`;
  }).join('');
}

function selectIngredient(id) {
  pendingIngredient = id;
  const f = findFood(id);
  document.getElementById('ingredient-amount-block').style.display = 'block';
  document.getElementById('ingredient-serving-hint').textContent = `(基準: ${f.serving}g)`;
  document.getElementById('ingredient-amount').value = f.serving;
  document.getElementById('ingredient-add-btn').disabled = false;
  renderIngredientPicker();
}

function addIngredientToRecipe() {
  if (!pendingIngredient) return;
  const amount = parseFloat(document.getElementById('ingredient-amount').value);
  if (!amount || amount <= 0) { alert('分量を入力してください'); return; }
  recipeDraft.ingredients.push({ foodId: pendingIngredient, amount });
  closeModal('modal-ingredient-picker');
  renderRecipeIngredients();
}
