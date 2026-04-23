// ===== データ管理 =====

function getProfile() {
    return JSON.parse(localStorage.getItem('wapp_profile') || 'null');
}
function saveProfile(data) {
    localStorage.setItem('wapp_profile', JSON.stringify(data));
}
function getRecords() {
    return JSON.parse(localStorage.getItem('wapp_records') || '[]');
}
function saveRecords(records) {
    localStorage.setItem('wapp_records', JSON.stringify(records));
}
function addRecord(record) {
    const records = getRecords();
    const idx = records.findIndex(r => r.date === record.date);
    if (idx >= 0) records[idx] = record;
    else records.push(record);
    records.sort((a, b) => a.date.localeCompare(b.date));
    saveRecords(records);
}

// ===== ユーティリティ =====

function getTodayString() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
}
function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['日','月','火','水','木','金','土'];
    return `${d.getMonth()+1}月${d.getDate()}日（${days[d.getDay()]}）`;
}
function calcBMR(profile, weight) {
    if (!profile || !profile.height || !profile.age || !weight) return null;
    const base = 10 * parseFloat(weight) + 6.25 * parseFloat(profile.height) - 5 * parseFloat(profile.age);
    return Math.round(profile.gender === 'female' ? base - 161 : base + 5);
}

// ===== トースト =====

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
}

// ===== ページ遷移 =====

const PAGE_TITLES = {
    'page-record':  '記録',
    'page-meal':    '食事プラン',
    'page-history': '履歴',
    'page-profile': '設定',
};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (nav) nav.classList.add('active');
    document.getElementById('page-title').textContent = PAGE_TITLES[pageId] || '';
    if (pageId === 'page-record')  renderRecordForm();
    if (pageId === 'page-meal')    renderMeal();
    if (pageId === 'page-history') renderHistory();
    if (pageId === 'page-profile') renderProfile();
    window.scrollTo(0, 0);
}

// ===== 記録画面 =====

let selectedMealLevel = null;

function selectMealLevel(level, silent) {
    selectedMealLevel = level;
    document.querySelectorAll('.meal-level-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.level === level);
    });
    updateSummary();
}

function renderRecordForm() {
    const today = getTodayString();
    document.getElementById('record-date').value = today;
    const records = getRecords();
    const existing = records.find(r => r.date === today);
    const profile = getProfile();
    if (existing) {
        document.getElementById('record-weight').value     = existing.weight     || '';
        document.getElementById('record-steps').value      = existing.steps      || '';
        document.getElementById('record-distance').value   = existing.distance   || '';
        document.getElementById('record-watch-kcal').value = existing.watchKcal  || '';
        selectMealLevel(existing.mealLevel || null, true);
    } else {
        document.getElementById('record-weight').value     = profile ? (profile.currentWeight || '') : '';
        document.getElementById('record-steps').value      = '';
        document.getElementById('record-distance').value   = '';
        document.getElementById('record-watch-kcal').value = '';
        selectMealLevel(null, true);
    }
    updateSummary();
    renderRecentRecords();
}

function updateSummary() {
    const profile   = getProfile();
    const weight    = parseFloat(document.getElementById('record-weight').value) || null;
    const watchKcal = parseInt(document.getElementById('record-watch-kcal').value) || 0;
    const bmr       = calcBMR(profile, weight);
    const total     = bmr != null ? bmr + watchKcal : null;

    document.getElementById('sum-bmr').textContent   = bmr   != null ? `${bmr} kcal`         : '-- kcal';
    document.getElementById('sum-watch').textContent = watchKcal     ? `${watchKcal} kcal`   : '-- kcal';
    document.getElementById('sum-total').textContent = total  != null ? `${total} kcal`       : '-- kcal';
}

function saveRecordForm() {
    const date      = document.getElementById('record-date').value;
    const weight    = parseFloat(document.getElementById('record-weight').value);
    const steps     = parseInt(document.getElementById('record-steps').value)      || 0;
    const distance  = parseFloat(document.getElementById('record-distance').value) || 0;
    const watchKcal = parseInt(document.getElementById('record-watch-kcal').value) || null;
    const mealLevel = selectedMealLevel;

    if (!date || !weight) {
        showToast('日付と体重は必ず入力してください');
        return;
    }

    const profile   = getProfile();
    const bmr       = calcBMR(profile, weight);
    const totalKcal = bmr != null ? bmr + (watchKcal || 0) : null;

    addRecord({ date, weight, steps, distance, watchKcal, mealLevel, totalKcal });

    if (profile) {
        profile.currentWeight = weight;
        saveProfile(profile);
    }

    showToast('記録を保存しました ✓');
    renderRecentRecords();
    updateSummary();
}

function renderRecentRecords() {
    const recent = [...getRecords()].reverse().slice(0, 10);
    const el = document.getElementById('recent-records');
    const mealLabels = { good: '🟢 Good', fair: '🟡 Fair', poor: '🔴 Poor' };

    if (recent.length === 0) {
        el.innerHTML = `<div class="no-data"><div class="no-data-icon">📝</div>まだ記録がありません</div>`;
        return;
    }

    el.innerHTML = recent.map(r => {
        const mealStr  = r.mealLevel ? mealLabels[r.mealLevel] : '';
        const totalStr = r.totalKcal ? `🔥 ${r.totalKcal.toLocaleString()} kcal` : '';
        return `
            <div class="record-item">
                <div>
                    <div class="record-date">${formatDate(r.date)}</div>
                    <div class="record-weight">${r.weight} kg</div>
                    ${mealStr ? `<div class="record-meal">${mealStr}</div>` : ''}
                </div>
                <div class="record-detail">
                    <div>👣 ${Number(r.steps||0).toLocaleString()} 歩</div>
                    <div>🏃 ${r.distance||0} km</div>
                    ${r.watchKcal ? `<div>⌚ ${r.watchKcal.toLocaleString()} kcal</div>` : ''}
                    ${totalStr ? `<div style="color:#c0392b;font-weight:700">${totalStr}</div>` : ''}
                </div>
            </div>`;
    }).join('');
}

// ===== 食事提案 =====

const MEAL_PLANS = [
    {
        name: 'プランA：バランス重視',
        meals: [
            { time: '🌅 朝食', items: [{ name: '納豆（1パック）＋おにぎり（1個）', kcal: 340 }, { name: 'カット野菜サラダ（小袋）', kcal: 30 }] },
            { time: '☀️ 昼食', items: [{ name: 'サラダチキン（1袋）', kcal: 110 }, { name: 'おにぎり（2個）', kcal: 360 }, { name: '袋サラダ', kcal: 40 }] },
            { time: '🌙 夕食', items: [{ name: '木綿豆腐（1丁・冷奴）', kcal: 160 }, { name: 'サラダチキン（1袋）', kcal: 110 }, { name: 'おにぎり（2個）', kcal: 360 }] },
            { time: '🍵 間食', items: [{ name: '豆乳（200ml）', kcal: 110 }, { name: 'バナナ（1本）', kcal: 86 }] },
        ],
    },
    {
        name: 'プランB：たんぱく質重視',
        meals: [
            { time: '🌅 朝食', items: [{ name: 'サラダチキン（1袋）', kcal: 110 }, { name: 'おにぎり（2個）', kcal: 360 }, { name: '納豆（1パック）', kcal: 100 }] },
            { time: '☀️ 昼食', items: [{ name: 'サラダチキン（1袋）', kcal: 110 }, { name: '絹ごし豆腐（1/2丁）', kcal: 80 }, { name: 'おにぎり（2個）', kcal: 360 }] },
            { time: '🌙 夕食', items: [{ name: 'サラダチキン（1袋）', kcal: 110 }, { name: '納豆（1パック）＋おにぎり（1個）', kcal: 280 }, { name: '豆腐サラダ', kcal: 120 }] },
            { time: '🍵 間食', items: [{ name: 'ゆで卵（1個）', kcal: 80 }, { name: 'チーズ（1個）', kcal: 70 }] },
        ],
    },
    {
        name: 'プランC：シンプル節約',
        meals: [
            { time: '🌅 朝食', items: [{ name: '納豆（2パック）', kcal: 200 }, { name: 'おにぎり（2個）', kcal: 360 }] },
            { time: '☀️ 昼食', items: [{ name: 'サラダチキン（1袋）', kcal: 110 }, { name: 'おにぎり（2個）', kcal: 360 }, { name: '袋サラダ', kcal: 40 }] },
            { time: '🌙 夕食', items: [{ name: '木綿豆腐（1丁・醤油がけ）', kcal: 160 }, { name: 'おにぎり（2個）', kcal: 360 }, { name: 'カット野菜サラダ', kcal: 40 }] },
            { time: '🍵 間食', items: [{ name: 'プレーンヨーグルト', kcal: 60 }, { name: 'みかん（1個）', kcal: 50 }] },
        ],
    },
];

function renderMeal() {
    const container = document.getElementById('meal-plans');
    container.innerHTML = MEAL_PLANS.map(plan => {
        const total   = plan.meals.reduce((sum, m) => sum + m.items.reduce((s, i) => s + i.kcal, 0), 0);
        const diff    = total - 2100;
        const diffStr = diff === 0 ? 'ちょうど' : (diff > 0 ? `+${diff}` : `${diff}`);
        const diffColor = Math.abs(diff) <= 50 ? '#43a047' : '#f57c00';
        return `
            <div class="card">
                <h2>🍱 ${plan.name}</h2>
                ${plan.meals.map(meal => `
                    <div class="meal-time-block">
                        <h3>${meal.time}</h3>
                        ${meal.items.map(item => `
                            <div class="meal-item">
                                <span class="meal-name">${item.name}</span>
                                <span class="meal-kcal">${item.kcal} kcal</span>
                            </div>`).join('')}
                    </div>`).join('')}
                <div class="total-kcal">
                    1日合計: <strong>${total} kcal</strong>
                    &nbsp;<span style="color:${diffColor};font-size:0.82rem">（目標比 ${diffStr} kcal）</span>
                </div>
            </div>`;
    }).join('');
}

// ===== 履歴画面 =====

let kcalChartInstance   = null;
let weightChartInstance = null;

function renderHistory() {
    const records = getRecords();
    const profile = getProfile();

    if (records.length === 0) {
        document.getElementById('kcal-nodata').style.display         = 'block';
        document.getElementById('kcal-chart-container').style.display = 'none';
        document.getElementById('weight-nodata').style.display         = 'block';
        document.getElementById('weight-chart-container').style.display = 'none';
        return;
    }

    document.getElementById('kcal-nodata').style.display         = 'none';
    document.getElementById('kcal-chart-container').style.display = 'block';
    document.getElementById('weight-nodata').style.display         = 'none';
    document.getElementById('weight-chart-container').style.display = 'block';

    const labels     = records.map(r => { const d = new Date(r.date+'T00:00:00'); return `${d.getMonth()+1}/${d.getDate()}`; });
    const totalKcals = records.map(r => r.totalKcal || null);
    const weights    = records.map(r => r.weight);

    // 消費カロリーグラフ
    if (kcalChartInstance) { kcalChartInstance.destroy(); kcalChartInstance = null; }
    const ctx1 = document.getElementById('kcalChart').getContext('2d');
    kcalChartInstance = new Chart(ctx1, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: '総消費カロリー',
                    data: totalKcals,
                    borderColor: '#c0392b',
                    backgroundColor: 'rgba(192,57,43,0.1)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#c0392b',
                    pointRadius: 5,
                    fill: true,
                    tension: 0.4,
                    spanGaps: true,
                },
                {
                    label: '食事目標 2100kcal',
                    data: new Array(labels.length).fill(2100),
                    borderColor: '#f39c12',
                    borderDash: [6, 4],
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } },
            scales: {
                y: { ticks: { callback: v => `${v}kcal`, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
            },
        },
    });

    // 体重グラフ
    if (weightChartInstance) { weightChartInstance.destroy(); weightChartInstance = null; }

    if (profile && profile.currentWeight && profile.targetWeight && records.length > 0) {
        const start   = parseFloat(profile.currentWeight);
        const target  = parseFloat(profile.targetWeight);
        const current = parseFloat(records[records.length-1].weight);
        const total   = Math.abs(start - target);
        const done    = Math.abs(start - current);
        const pct     = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        document.getElementById('history-progress').style.width = `${pct}%`;
        document.getElementById('history-start').textContent  = `開始: ${start} kg`;
        document.getElementById('history-target').textContent = `目標: ${target} kg`;
    }

    const datasets = [
        {
            label: '体重 (kg)',
            data: weights,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102,126,234,0.1)',
            borderWidth: 2.5,
            pointBackgroundColor: '#667eea',
            pointRadius: 5,
            fill: true,
            tension: 0.4,
        },
    ];
    if (profile && profile.targetWeight) {
        datasets.push({
            label: '目標体重',
            data: new Array(labels.length).fill(parseFloat(profile.targetWeight)),
            borderColor: '#ff6b6b',
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
        });
    }

    const ctx2 = document.getElementById('weightChart').getContext('2d');
    weightChartInstance = new Chart(ctx2, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } },
            scales: {
                y: { ticks: { callback: v => `${v}kg`, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
            },
        },
    });

    if (records.length >= 2) {
        const first = records[0].weight;
        const last  = records[records.length-1].weight;
        const diff  = (last - first).toFixed(1);
        const sign  = diff > 0 ? '+' : '';
        const color = diff <= 0 ? '#43a047' : '#f44336';
        document.getElementById('weight-stats').innerHTML = `
            <div style="text-align:center;font-size:0.9rem;color:#777;margin-top:12px;">
                記録開始から <strong style="color:${color};font-size:1rem">${sign}${diff} kg</strong> の変化
            </div>`;
    } else {
        document.getElementById('weight-stats').innerHTML = '';
    }
}

// ===== 設定画面 =====

function renderProfile() {
    const p = getProfile();
    if (!p) return;
    document.getElementById('profile-age').value    = p.age    || '';
    document.getElementById('profile-gender').value = p.gender || '';
    document.getElementById('profile-height').value = p.height || '';
    document.getElementById('profile-weight').value = p.currentWeight || '';
    document.getElementById('profile-target').value = p.targetWeight  || '';
    document.getElementById('profile-period').value = p.period || '1';
}

function saveProfileForm() {
    const height        = parseFloat(document.getElementById('profile-height').value);
    const currentWeight = parseFloat(document.getElementById('profile-weight').value);
    const targetWeight  = parseFloat(document.getElementById('profile-target').value);
    if (!height || !currentWeight || !targetWeight) {
        showToast('身長・体重・目標体重を入力してください');
        return;
    }
    saveProfile({
        age:    document.getElementById('profile-age').value,
        gender: document.getElementById('profile-gender').value,
        height, currentWeight, targetWeight,
        period: parseInt(document.getElementById('profile-period').value) || 1,
    });
    showToast('設定を保存しました ✓');
    showPage('page-record');
}

// ===== 初期化 =====

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => showPage(item.dataset.page));
    });
    ['record-weight', 'record-watch-kcal'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateSummary);
    });
    if (!getProfile()) {
        showPage('page-profile');
    } else {
        showPage('page-record');
    }
});
