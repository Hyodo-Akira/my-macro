// =====================================================================
// views/stats.js - Charts and aggregate stats
// Depends on: helpers, state, tdee, Chart.js
// =====================================================================

function renderStats() {
  const weightDates = Object.keys(state.weights).sort().slice(-90);
  const weightVals = weightDates.map(d => state.weights[d]);
  const weightMA = weightDates.map(d => weightAvg(7, d));
  renderChart('chart-weight', 'line', {
    labels: weightDates.map(d => d.slice(5)),
    datasets: [
      { label: '体重', data: weightVals, borderColor: '#4fc3f7', backgroundColor: 'rgba(79,195,247,.2)', pointRadius: 2 },
      { label: '7日平均', data: weightMA, borderColor: '#ffa726', borderDash: [5,5], pointRadius: 0 },
    ],
  });

  const days = [];
  for (let i = 13; i >= 0; i--) days.push(todayStr(-i));
  const kcalData = days.map(d => dayTotals(d).kcal);
  const tgt = calorieTarget() || 0;
  renderChart('chart-calorie', 'bar', {
    labels: days.map(d => d.slice(5)),
    datasets: [
      { label: '摂取', data: kcalData, backgroundColor: '#4fc3f7' },
      { label: '目標', data: days.map(() => tgt), type: 'line', borderColor: '#ffa726', borderDash: [4,4], pointRadius: 0 },
    ],
  });

  const t = dayTotals(currentDate);
  renderChart('chart-macro', 'doughnut', {
    labels: ['タンパク質 kcal', '脂質 kcal', '炭水化物 kcal'],
    datasets: [{
      data: [t.p * 4, t.f * 9, t.c * 4],
      backgroundColor: ['#ef5350', '#ffb74d', '#66bb6a'],
    }],
  });

  const tdee = computeAdaptiveTDEE();
  const w = latestWeight();
  const w7 = weightAvg(7);
  const w30 = weightAvg(30);
  const summary = document.getElementById('stats-summary');
  if (!summary) return;
  summary.innerHTML = `
    <div class="row between"><span>最新体重</span><strong>${w || '—'} kg</strong></div>
    <hr>
    <div class="row between"><span>7日平均体重</span><strong>${w7 ? round1(w7) : '—'} kg</strong></div>
    <hr>
    <div class="row between"><span>30日平均体重</span><strong>${w30 ? round1(w30) : '—'} kg</strong></div>
    <hr>
    <div class="row between"><span>適応型TDEE</span><strong>${tdee.tdee || '—'} kcal</strong></div>
    <hr>
    <div class="row between"><span>本日のカロリー目標</span><strong>${calorieTarget() || '—'} kcal</strong></div>
    <hr>
    <div class="row between"><span>登録食品数</span><strong>${state.foods.length}</strong></div>
    <hr>
    <div class="row between"><span>登録レシピ数</span><strong>${state.recipes.length}</strong></div>
  `;
}

function renderChart(id, type, data) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (charts[id]) charts[id].destroy();
  const ctx = canvas.getContext('2d');
  charts[id] = new Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#e6edf3', font: { size: 11 } } },
      },
      scales: type === 'doughnut' ? {} : {
        x: { ticks: { color: '#8b98a5', font: { size: 10 } }, grid: { color: '#2d3845' } },
        y: { ticks: { color: '#8b98a5', font: { size: 10 } }, grid: { color: '#2d3845' } },
      },
    },
  });
}
