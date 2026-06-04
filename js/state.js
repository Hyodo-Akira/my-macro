// =====================================================================
// state.js - Application state, localStorage persistence
// Depends on: helpers.js (todayStr)
// =====================================================================

const STORAGE_KEY = 'mymacro_v1';

function defaultState() {
  return {
    settings: {
      sex: 'male',
      age: 30,
      height: 170,
      activity: 1.55,
      goal: 'maintain',
      targetWeight: null,
      targetDate: null,
      macroMode: 'auto',
      manualP: 120, manualF: 60, manualC: 250,
      // v2: calorie display mode ('remaining' = 残りカウントダウン, 'consumed' = 摂取カウントアップ)
      calorieDisplay: 'remaining',
      // v3: user-defined extra units (string[]) appended to the default unit set
      customUnits: [],
      // v3: favorited food ids (string[])
      favoriteFoodIds: [],
    },
    weights: {},
    entries: {},
    foods: [
      { id: '_default_1', name: '鶏むね肉(皮なし・生)', serving: 100, unit: 'g', kcal: 105, p: 23.3, f: 1.9, c: 0 },
      { id: '_default_2', name: '白米(炊いた)',         serving: 150, unit: 'g', kcal: 234, p: 3.8,  f: 0.5, c: 55.7 },
      { id: '_default_3', name: '玄米(炊いた)',         serving: 150, unit: 'g', kcal: 248, p: 4.2,  f: 1.5, c: 53.4 },
      { id: '_default_4', name: '鶏卵(L)',              serving: 1,   unit: '個', kcal: 91,  p: 7.4,  f: 6.2, c: 0.2 },
      { id: '_default_5', name: 'プロテイン(ホエイ・1スクープ)', serving: 30, unit: 'g', kcal: 116, p: 24, f: 1.5, c: 2 },
      { id: '_default_6', name: 'ブロッコリー(茹で)',   serving: 100, unit: 'g', kcal: 33,  p: 3.5,  f: 0.4, c: 5.2 },
      { id: '_default_7', name: 'バナナ(中)',           serving: 1,   unit: '本', kcal: 86,  p: 1.1,  f: 0.2, c: 22.5 },
      { id: '_default_8', name: 'オートミール(乾)',     serving: 40,  unit: 'g', kcal: 152, p: 5.5,  f: 2.3, c: 27.6 },
    ],
    recipes: [],
    tdee: null,
    tdeeMethod: 'estimate',
    tdeeHistory: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const def = defaultState();
    const merged = {
      ...def, ...parsed,
      settings: { ...def.settings, ...(parsed.settings || {}) },
      foods: parsed.foods && parsed.foods.length ? parsed.foods : def.foods,
      recipes: parsed.recipes || [],
    };
    // Backwards-compat: foods saved before v2 don't have `unit` — default to 'g'
    merged.foods = merged.foods.map(f => ({ unit: 'g', ...f }));
    return merged;
  } catch (e) {
    console.error('loadState error', e);
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    alert('保存に失敗しました。ストレージが上限の可能性があります。古い画像を削除するか、データをエクスポートしてください。');
  }
}

// ---------- Lookups ----------
function findFood(id) { return state.foods.find(f => f.id === id); }
function findRecipe(id) { return state.recipes.find(r => r.id === id); }

// Helper: get a food's display unit (always returns a string)
function foodUnit(f) { return (f && f.unit) || 'g'; }

// ---------- Units (v3) ----------
const DEFAULT_UNITS = ['g', '個', '本', '枚', '杯', 'ml', '切れ', '袋'];

// All units = default + user-added custom units (deduplicated, preserves order)
function getAllUnits() {
  const custom = (state.settings.customUnits || []).filter(u => u && !DEFAULT_UNITS.includes(u));
  return [...DEFAULT_UNITS, ...custom];
}

function addCustomUnit(u) {
  u = (u || '').trim();
  if (!u) return false;
  if (DEFAULT_UNITS.includes(u)) return false;          // already standard
  if ((state.settings.customUnits || []).includes(u)) return false;  // already custom
  state.settings.customUnits = [...(state.settings.customUnits || []), u];
  saveState();
  return true;
}

function removeCustomUnit(u) {
  state.settings.customUnits = (state.settings.customUnits || []).filter(x => x !== u);
  saveState();
}

// ---------- Favorites (v3) ----------
function isFavoriteFood(id) {
  return (state.settings.favoriteFoodIds || []).includes(id);
}

function toggleFoodFavorite(id) {
  const list = state.settings.favoriteFoodIds || [];
  if (list.includes(id)) {
    state.settings.favoriteFoodIds = list.filter(x => x !== id);
  } else {
    state.settings.favoriteFoodIds = [...list, id];
  }
  saveState();
}

// ---------- Recent foods (v3) ----------
// Returns food ids eaten within the last `days` days, ordered by recency
// (most-recent first), deduplicated. Optionally limit to `max` items.
function getRecentFoodIds(days = 14, max = 5) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const dates = Object.keys(state.entries)
    .filter(d => new Date(d) >= cutoff)
    .sort()
    .reverse();
  const seen = new Set();
  const result = [];
  for (const d of dates) {
    for (const e of state.entries[d] || []) {
      if (e.type !== 'food' || !e.foodId) continue;
      if (seen.has(e.foodId)) continue;
      if (!findFood(e.foodId)) continue;  // food was deleted
      seen.add(e.foodId);
      result.push(e.foodId);
      if (result.length >= max) return result;
    }
  }
  return result;
}

// ---------- Initialize globals ----------
let state = loadState();
let currentDate = todayStr();
let charts = {};
