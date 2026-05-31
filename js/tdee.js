// =====================================================================
// tdee.js - Nutrition math + adaptive TDEE algorithm
// Depends on: helpers.js, state.js
// =====================================================================

// ---------- Recipe nutrition ----------
function recipeNutrition(recipe) {
  let kcal = 0, p = 0, f = 0, c = 0;
  for (const ing of recipe.ingredients || []) {
    const food = findFood(ing.foodId);
    if (!food) continue;
    const factor = ing.amount / food.serving;
    kcal += food.kcal * factor;
    p += food.p * factor;
    f += food.f * factor;
    c += food.c * factor;
  }
  return { kcal, p, f, c };
}

function recipePerServing(recipe) {
  const n = recipeNutrition(recipe);
  const s = recipe.servings || 1;
  return { kcal: n.kcal / s, p: n.p / s, f: n.f / s, c: n.c / s };
}

// ---------- Mifflin-St Jeor BMR ----------
function bmrMSJ(weight, height, age, sex) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

// ---------- Weight helpers ----------
function latestWeight() {
  const keys = Object.keys(state.weights).sort();
  if (!keys.length) return null;
  return state.weights[keys[keys.length - 1]];
}

function weightAvg(days = 7, endDate = currentDate) {
  const end = new Date(endDate);
  const vals = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    if (state.weights[k] != null) vals.push(state.weights[k]);
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ---------- Per-entry nutrition (food or recipe) ----------
function entryNutrition(entry) {
  if (entry.type === 'recipe') {
    const rec = findRecipe(entry.recipeId);
    if (!rec) return { kcal: 0, p: 0, f: 0, c: 0 };
    const per = recipePerServing(rec);
    const s = entry.servings || 1;
    return { kcal: per.kcal * s, p: per.p * s, f: per.f * s, c: per.c * s };
  } else {
    const food = findFood(entry.foodId);
    if (!food) return { kcal: 0, p: 0, f: 0, c: 0 };
    const factor = entry.amount / food.serving;
    return { kcal: food.kcal * factor, p: food.p * factor, f: food.f * factor, c: food.c * factor };
  }
}

// ---------- Display label for an entry (unit-aware) ----------
function entryDisplay(entry) {
  if (entry.type === 'recipe') {
    const rec = findRecipe(entry.recipeId);
    if (!rec) return { name: '(削除済みレシピ)', amount: '', image: null };
    return { name: rec.name, amount: `${entry.servings || 1}人前`, image: rec.image };
  } else {
    const food = findFood(entry.foodId);
    if (!food) return { name: '(削除済み食品)', amount: '', image: null };
    const unit = foodUnit(food);
    return { name: food.name, amount: `${entry.amount}${unit}`, image: food.image };
  }
}

function dayTotals(date) {
  const arr = state.entries[date] || [];
  let kcal = 0, p = 0, f = 0, c = 0;
  for (const e of arr) {
    const n = entryNutrition(e);
    kcal += n.kcal; p += n.p; f += n.f; c += n.c;
  }
  return { kcal: Math.round(kcal), p: round1(p), f: round1(f), c: round1(c) };
}

// ---------- Adaptive TDEE ----------
function computeAdaptiveTDEE() {
  const dates = Object.keys(state.weights).sort();
  if (dates.length < 2) {
    const w = latestWeight();
    if (!w) return { tdee: null, method: 'none' };
    const bmr = bmrMSJ(w, state.settings.height, state.settings.age, state.settings.sex);
    return { tdee: Math.round(bmr * state.settings.activity), method: 'estimate' };
  }

  const series = [];
  for (const d of dates) {
    const a = weightAvg(7, d);
    if (a != null) series.push({ date: d, avg: a });
  }

  const samples = [];
  const minWindow = 7;
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const dA = new Date(series[i].date);
      const dB = new Date(series[j].date);
      const days = (dB - dA) / 86400000;
      if (days < minWindow) continue;
      const intake = avgIntakeBetween(series[i].date, series[j].date);
      if (intake == null) continue;
      const deltaWeight = series[j].avg - series[i].avg;
      const implied = intake + (deltaWeight * 7700 / days);
      if (implied < 800 || implied > 6000) continue;
      const ageDays = (new Date() - dB) / 86400000;
      const w = Math.exp(-ageDays / 30);
      samples.push({ implied, w, days });
    }
  }

  if (samples.length < 1) {
    const w = latestWeight();
    if (!w) return { tdee: null, method: 'none' };
    const bmr = bmrMSJ(w, state.settings.height, state.settings.age, state.settings.sex);
    return { tdee: Math.round(bmr * state.settings.activity), method: 'estimate' };
  }

  const numer = samples.reduce((acc, s) => acc + s.implied * s.w, 0);
  const denom = samples.reduce((acc, s) => acc + s.w, 0);
  const tdee = numer / denom;
  return { tdee: Math.round(tdee), method: 'calculated', samples: samples.length };
}

function avgIntakeBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const vals = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = d.toISOString().slice(0, 10);
    if (state.entries[k] && state.entries[k].length) {
      vals.push(dayTotals(k).kcal);
    }
  }
  if (vals.length < 3) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ---------- Calorie & Macro targets ----------
function calorieTarget() {
  const t = computeAdaptiveTDEE();
  if (!t.tdee) return null;
  let target = t.tdee;
  const s = state.settings;
  if (s.goal === 'maintain') return target;
  if (s.targetWeight && s.targetDate) {
    const w = latestWeight();
    if (w) {
      const daysLeft = Math.max(7, (new Date(s.targetDate) - new Date()) / 86400000);
      const deltaKg = s.targetWeight - w;
      const dailyDelta = (deltaKg * 7700) / daysLeft;
      target = t.tdee + dailyDelta;
      const bmr = bmrMSJ(w, s.height, s.age, s.sex);
      target = clamp(target, bmr * 1.0, t.tdee + 1200);
    }
  } else {
    if (s.goal === 'cut') target = t.tdee - 400;
    if (s.goal === 'bulk') target = t.tdee + 300;
  }
  return Math.round(target);
}

function macroTargets() {
  const kcal = calorieTarget() || 2000;
  const s = state.settings;
  if (s.macroMode === 'manual') {
    return { p: +s.manualP || 0, f: +s.manualF || 0, c: +s.manualC || 0, kcal };
  }
  const w = latestWeight() || 70;
  const p = Math.round(w * 2);
  const fKcal = kcal * 0.25;
  const f = Math.round(fKcal / 9);
  const remainingKcal = kcal - p * 4 - f * 9;
  const c = Math.max(0, Math.round(remainingKcal / 4));
  return { p, f, c, kcal };
}
