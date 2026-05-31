// =====================================================================
// views/weight.js - Weight tracking view + Adaptive TDEE display
// Depends on: helpers, state, tdee
// =====================================================================

function renderWeight() {
  document.getElementById('weight-date').value = todayStr();
  const cur = weightAvg(7);
  document.getElementById('weight-current').textContent = cur ? round1(cur) : '—';
  const t = computeAdaptiveTDEE();
  document.getElementById('tdee-display').textContent = t.tdee || '—';
  const badge = document.getElementById('tdee-badge');
  badge.textContent = t.method === 'calculated' ? '実測' : '推定';
  badge.className = 'badge ' + (t.method === 'calculated' ? 'calc' : 'est');
  const info = document.getElementById('tdee-info');
  if (t.method === 'calculated') {
    info.textContent = `${t.samples}個のデータ窓から算出されました。体重と食事を記録し続けることで、あなた専用の代謝量が継続的に更新されます。`;
  } else if (t.tdee) {
    info.textContent = `Mifflin-St Jeor式 + 活動係数(×${state.settings.activity}) による推定値です。7日以上の体重・食事記録が蓄積されると、実測ベースに切り替わります。`;
  } else {
    info.textContent = '体重と食事の記録を始めましょう。';
  }

  const dates = Object.keys(state.weights).sort().reverse().slice(0, 30);
  const hist = document.getElementById('weight-history');
  if (!dates.length) {
    hist.innerHTML = '<div class="empty">記録なし</div>';
  } else {
    hist.innerHTML = dates.map(d => {
      const v = state.weights[d];
      return `<div class="food-item">
        <div style="flex:1"><div class="name">${fmtDate(d)}</div></div>
        <div style="text-align:right;">
          <div class="kcal">${v} kg</div>
          <button class="small ghost" onclick="deleteWeight('${d}')">削除</button>
        </div>
      </div>`;
    }).join('');
  }
}

function addWeight() {
  const d = document.getElementById('weight-date').value;
  const v = parseFloat(document.getElementById('weight-input').value);
  if (!d || !v || v < 20 || v > 300) { alert('日付と体重(20-300kg)を入力してください'); return; }
  state.weights[d] = v;
  saveState();
  document.getElementById('weight-input').value = '';
  renderWeight();
}

function deleteWeight(d) {
  if (!confirm(`${fmtDate(d)}の記録を削除しますか？`)) return;
  delete state.weights[d];
  saveState();
  renderWeight();
}
