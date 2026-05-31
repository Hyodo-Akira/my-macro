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
    },
    weights: {},
    entries: {},
    foods: [
      { id: '_default_1', name: '鶏むね肉(皮なし・生)', serving: 100, kcal: 105, p: 23.3, f: 1.9, c: 0 },
      { id: '_default_2', name: '白米(炊いた)', serving: 150, kcal: 234, p: 3.8, f: 0.5, c: 55.7 },
      { id: '_default_3', name: '玄米(炊いた)', serving: 150, kcal: 248, p: 4.2, f: 1.5, c: 53.4 },
      { id: '_default_4', name: '鶏卵(L)', serving: 60, kcal: 91, p: 7.4, f: 6.2, c: 0.2 },
      { id: '_default_5', name: 'プロテイン(ホエイ・1スクープ)', serving: 30, kcal: 116, p: 24, f: 1.5, c: 2 },
      { id: '_default_6', name: 'ブロッコリー(茹で)', serving: 100, kcal: 33, p: 3.5, f: 0.4, c: 5.2 },
      { id: '_default_7', name: 'バナナ(中)', serving: 100, kcal: 86, p: 1.1, f: 0.2, c: 22.5 },
      { id: '_default_8', name: 'オートミール(乾)', serving: 40, kcal: 152, p: 5.5, f: 2.3, c: 27.6 },
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
    return {
      ...def, ...parsed,
      settings: { ...def.settings, ...(parsed.settings || {}) },
      foods: parsed.foods && parsed.foods.length ? parsed.foods : def.foods,
      recipes: parsed.recipes || [],
    };
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

// ---------- Initialize globals ----------
let state = loadState();
let currentDate = todayStr();
let charts = {};
