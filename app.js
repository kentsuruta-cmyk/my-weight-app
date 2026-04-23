// ===== データ管理（localStorageへの読み書き） =====

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
    if (idx >= 0) {
        records[idx] = record;
    } else {
        records.push(record);
    }
    records.sort((a, b) => a.date.localeCompare(b.date));
    saveRecords(records);
}

// ===== ユーティリティ =====

function getTodayString() {
    const d = new Date();
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
    ].join('-');
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['日','月','火','水','木','金','土'];
    return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

function getBMILabel(bmi) {
    if (bmi < 18.5) return '低体重';
    if (bmi < 25)   return '普通体重';
    if (bmi < 30)   return '肥満(1度)';
    return '肥満(2度以上)';
}

// ===== トースト通知 =====

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
}

// ===== ページ遷移 =====

const PAGE_TITLES = {
    'page-home':    '体重管理',
    'page-profile': 'プロフィール設定',
    'page-record':  '毎日の記録',
    'page-graph':   '体重の推移',
    'page-meal':    '食事プラン',
};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (navItem) navItem.classList.add('active');

    document.getElementById('page-title').textContent = PAGE_TITLES[pageId] || '体重管理';

    if (pageId === 'page-home')    renderHome();
    if (pageId === 'page-profile') renderProfile();
    if (pageId === 'page-record')  renderRecordForm();
    if (pageId === 'page-graph')   renderGraph();
    if (pageId === 'page-meal')    renderMeal();

    window.scrollTo(0, 0);
}

// ===== ホーム画面 =====

function renderHome() {
    const profile = getProfile();
    const records = getRecords();
    const today = getTodayString();
    const todayRecord = records.find(r => r.date === today);
    const latestRecord = records.length > 0 ? records[records.length - 1] : null;

    const currentWeight = todayRecord
        ? todayRecord.weight
        : (latestRecord ? latestRecord.weight : (profile ? profile.currentWeight : null));

    // 現在体重
    const weightEl = document.getElementById('home-weight');
    if (currentWeight) {
        weightEl.innerHTML = `${currentWeight} <span class="weight-unit">kg</span>`;
    } else {
        weightEl.innerHTML = `-- <span class="weight-unit">kg</span>`;
    }

    // BMI
    const bmiEl = document.getElementById('home-bmi');
    if (profile && profile.height && currentWeight) {
        const h = profile.height / 100;
        const bmi = (currentWeight / (h * h)).toFixed(1);
        bmiEl.textContent = `BMI: ${bmi}（${getBMILabel(parseFloat(bmi))}）`;
    } else {
        bmiEl.textContent = 'プロフィールを設定してください';
    }

    // 目標まであと何kg
    const remainEl = document.getElementById('home-remain');
    if (profile && profile.targetWeight && currentWeight) {
        const remain = (parseFloat(currentWeight) - parseFloat(profile.targetWeight)).toFixed(1);
        if (remain <= 0) {
            remainEl.textContent = '目標達成！おめでとうございます！';
        } else {
            remainEl.textContent = `目標まであと ${remain} kg`;
        }
    } else {
        remainEl.textContent = '';
    }

    // 今日の活動
    const active = todayRecord || {};
    document.getElementById('home-steps').textContent =
        active.steps != null ? Number(active.steps).toLocaleString() : '--';
    document.getElementById('home-run').innerHTML =
        active.distance != null
            ? `${active.distance}<span class="stat-unit"> km</span>`
            : '--';

    // 基礎代謝（ミフリン・セントジョール式）
    let bmrKcal = null;
    if (profile && profile.height && profile.age && currentWeight) {
        const base = 10 * parseFloat(currentWeight)
                   + 6.25 * parseFloat(profile.height)
                   - 5   * parseFloat(profile.age);
        bmrKcal = Math.round(profile.gender === 'female' ? base - 161 : base + 5);
    }

    const stepsKcal = active.steps    ? Math.round(active.steps / 1000 * 35) : null;
    const runKcal   = active.distance ? Math.round(active.distance * 60)      : null;
    const totalKcal = bmrKcal != null
        ? bmrKcal + (stepsKcal || 0) + (runKcal || 0)
        : null;

    document.getElementById('home-kcal-total').innerHTML =
        totalKcal != null ? `${totalKcal}<span class="stat-unit"> kcal</span>` : '--';
    document.getElementById('home-kcal-bmr').textContent =
        bmrKcal != null ? `🧬 基礎代謝: ${bmrKcal} kcal` : '🧬 基礎代謝: -- kcal';
    document.getElementById('home-kcal-steps').textContent =
        stepsKcal != null ? `👣 歩数: ${stepsKcal} kcal` : '👣 歩数: -- kcal';
    document.getElementById('home-kcal-run').textContent =
        runKcal != null ? `🏃 ランニング: ${runKcal} kcal` : '🏃 ランニング: -- kcal';

    // スマートウォッチの総消費カロリー
    const watchKcalEl = document.getElementById('home-kcal-watch');
    if (active.watchKcal) {
        watchKcalEl.textContent = `⌚ スマートウォッチ: ${active.watchKcal.toLocaleString()} kcal`;
        watchKcalEl.style.display = '';
    } else {
        watchKcalEl.style.display = 'none';
    }

    // 食事レベル
    const mealLabels = { normal: '🟢 食事: 普通', more: '🟡 食事: やや多め', heavy: '🔴 食事: 多め' };
    const mealEl = document.getElementById('home-meal-level');
    if (active.mealLevel) {
        mealEl.textContent = mealLabels[active.mealLevel];
        mealEl.style.display = '';
    } else {
        mealEl.style.display = 'none';
    }

    // プログレスバー
    if (profile && profile.currentWeight && profile.targetWeight && currentWeight) {
        const start   = parseFloat(profile.currentWeight);
        const target  = parseFloat(profile.targetWeight);
        const current = parseFloat(currentWeight);
        const total   = Math.abs(start - target);
        const done    = Math.abs(start - current);
        const pct     = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

        document.getElementById('progress-fill').style.width = `${pct}%`;
        document.getElementById('progress-left').textContent  = `開始: ${start} kg`;
        document.getElementById('progress-right').textContent = `目標: ${target} kg`;
    } else {
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-left').textContent  = '開始: -- kg';
        document.getElementById('progress-right').textContent = '目標: -- kg';
    }
}

// ===== プロフィール画面 =====

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
        age:           document.getElementById('profile-age').value,
        gender:        document.getElementById('profile-gender').value,
        height,
        currentWeight,
        targetWeight,
        period:        parseInt(document.getElementById('profile-period').value) || 1,
    });

    showToast('プロフィールを保存しました ✓');
    showPage('page-home');
}

// ===== 記録画面 =====

function renderRecordForm() {
    const today = getTodayString();
    document.getElementById('record-date').value = today;

    const records  = getRecords();
    const existing = records.find(r => r.date === today);
    const profile  = getProfile();

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

    updateKcalPreview();
    renderRecentRecords();
}

// 選択中の食事レベル
let selectedMealLevel = null;

function selectMealLevel(level, silent) {
    selectedMealLevel = level;
    document.querySelectorAll('.meal-level-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.level === level);
    });
}

function updateKcalPreview() {
    const steps     = parseInt(document.getElementById('record-steps').value)    || 0;
    const dist      = parseFloat(document.getElementById('record-distance').value) || 0;
    const stepsKcal = Math.round(steps / 1000 * 35);
    const runKcal   = Math.round(dist * 60);
    const totalKcal = stepsKcal + runKcal;
    document.getElementById('kcal-steps').textContent = `${stepsKcal} kcal`;
    document.getElementById('kcal-run').textContent   = `${runKcal} kcal`;
    document.getElementById('kcal-total').textContent = `${totalKcal} kcal`;
}

function saveRecordForm() {
    const date      = document.getElementById('record-date').value;
    const weight    = parseFloat(document.getElementById('record-weight').value);
    const steps     = parseInt(document.getElementById('record-steps').value)     || 0;
    const distance  = parseFloat(document.getElementById('record-distance').value) || 0;
    const watchKcal = parseInt(document.getElementById('record-watch-kcal').value) || null;
    const mealLevel = selectedMealLevel;

    if (!date || !weight) {
        showToast('日付と体重は必ず入力してください');
        return;
    }

    addRecord({ date, weight, steps, distance, watchKcal, mealLevel });

    // プロフィールの現在体重を最新記録で更新
    const profile = getProfile();
    if (profile) {
        profile.currentWeight = weight;
        saveProfile(profile);
    }

    showToast('記録を保存しました ✓');
    renderRecentRecords();
    updateKcalPreview();
}

function renderRecentRecords() {
    const recent = [...getRecords()].reverse().slice(0, 10);
    const el = document.getElementById('recent-records');

    if (recent.length === 0) {
        el.innerHTML = `
            <div class="no-data">
                <div class="no-data-icon">📝</div>
                まだ記録がありません
            </div>`;
        return;
    }

    el.innerHTML = recent.map(r => {
        const stepsKcal = Math.round((r.steps || 0) / 1000 * 35);
        const runKcal   = Math.round((r.distance || 0) * 60);
        const totalKcal = stepsKcal + runKcal;
        const mealLabels = { normal: '🟢 普通', more: '🟡 やや多め', heavy: '🔴 多め' };
        const mealStr   = r.mealLevel ? mealLabels[r.mealLevel] : '';
        const watchStr  = r.watchKcal ? `⌚ ${r.watchKcal.toLocaleString()} kcal` : '';
        return `
            <div class="record-item">
                <div>
                    <div class="record-date">${formatDate(r.date)}</div>
                    <div class="record-weight">${r.weight} kg</div>
                    ${mealStr ? `<div class="record-meal">${mealStr}</div>` : ''}
                </div>
                <div class="record-detail">
                    <div>👣 ${Number(r.steps || 0).toLocaleString()} 歩（${stepsKcal} kcal）</div>
                    <div>🏃 ${r.distance || 0} km（${runKcal} kcal）</div>
                    ${watchStr ? `<div style="color:#764ba2;font-weight:600">${watchStr}</div>` : ''}
                    <div style="color:#667eea;font-weight:700">🔥 合計 ${totalKcal} kcal</div>
                </div>
            </div>`;
    }).join('');
}

// ===== グラフ画面 =====

let chartInstance = null;

function renderGraph() {
    const records = getRecords();
    const profile = getProfile();

    if (records.length === 0) {
        document.getElementById('graph-nodata').style.display    = 'block';
        document.getElementById('graph-container').style.display = 'none';
        document.getElementById('graph-stats').innerHTML = '';
        return;
    }

    document.getElementById('graph-nodata').style.display    = 'none';
    document.getElementById('graph-container').style.display = 'block';

    const labels  = records.map(r => {
        const d = new Date(r.date + 'T00:00:00');
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const weights = records.map(r => r.weight);

    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
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
            pointHoverRadius: 7,
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

    const ctx = document.getElementById('weightChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 }, padding: 16 },
                },
            },
            scales: {
                y: {
                    ticks: { callback: v => `${v}kg`, font: { size: 11 } },
                    grid:  { color: 'rgba(0,0,0,0.05)' },
                },
                x: {
                    ticks: { font: { size: 11 } },
                    grid:  { color: 'rgba(0,0,0,0.04)' },
                },
            },
        },
    });

    // 開始からの変化
    if (records.length >= 2) {
        const first = records[0].weight;
        const last  = records[records.length - 1].weight;
        const diff  = (last - first).toFixed(1);
        const sign  = diff > 0 ? '+' : '';
        const color = diff <= 0 ? '#43a047' : '#f44336';
        document.getElementById('graph-stats').innerHTML = `
            <div style="text-align:center;font-size:0.9rem;color:#777;margin-top:12px;">
                記録開始から
                <strong style="color:${color};font-size:1rem">${sign}${diff} kg</strong>
                の変化
            </div>`;
    } else {
        document.getElementById('graph-stats').innerHTML = '';
    }
}

// ===== 食事提案 =====

const MEAL_PLANS = [
    {
        name: 'プランA：バランス重視',
        meals: [
            {
                time: '🌅 朝食',
                items: [
                    { name: '納豆（1パック）＋おにぎり（1個）', kcal: 340 },
                    { name: 'カット野菜サラダ（小袋）', kcal: 30 },
                ],
            },
            {
                time: '☀️ 昼食',
                items: [
                    { name: 'サラダチキン（1袋）', kcal: 110 },
                    { name: 'おにぎり（2個）', kcal: 360 },
                    { name: '袋サラダ', kcal: 40 },
                ],
            },
            {
                time: '🌙 夕食',
                items: [
                    { name: '木綿豆腐（1丁・冷奴）', kcal: 160 },
                    { name: 'サラダチキン（1袋）', kcal: 110 },
                    { name: 'おにぎり（2個）', kcal: 360 },
                ],
            },
            {
                time: '🍵 間食',
                items: [
                    { name: '豆乳（200ml）', kcal: 110 },
                    { name: 'バナナ（1本）', kcal: 86 },
                ],
            },
        ],
    },
    {
        name: 'プランB：たんぱく質重視',
        meals: [
            {
                time: '🌅 朝食',
                items: [
                    { name: 'サラダチキン（1袋）', kcal: 110 },
                    { name: 'おにぎり（2個）', kcal: 360 },
                    { name: '納豆（1パック）', kcal: 100 },
                ],
            },
            {
                time: '☀️ 昼食',
                items: [
                    { name: 'サラダチキン（1袋）', kcal: 110 },
                    { name: '絹ごし豆腐（1/2丁）', kcal: 80 },
                    { name: 'おにぎり（2個）', kcal: 360 },
                ],
            },
            {
                time: '🌙 夕食',
                items: [
                    { name: 'サラダチキン（1袋）', kcal: 110 },
                    { name: '納豆（1パック）＋おにぎり（1個）', kcal: 280 },
                    { name: '豆腐サラダ（絹ごし豆腐＋袋サラダ）', kcal: 120 },
                ],
            },
            {
                time: '🍵 間食',
                items: [
                    { name: 'ゆで卵（1個）', kcal: 80 },
                    { name: 'チーズ（1個）', kcal: 70 },
                ],
            },
        ],
    },
    {
        name: 'プランC：シンプル節約',
        meals: [
            {
                time: '🌅 朝食',
                items: [
                    { name: '納豆（2パック）', kcal: 200 },
                    { name: 'おにぎり（2個）', kcal: 360 },
                ],
            },
            {
                time: '☀️ 昼食',
                items: [
                    { name: 'サラダチキン（1袋）', kcal: 110 },
                    { name: 'おにぎり（2個）', kcal: 360 },
                    { name: '袋サラダ', kcal: 40 },
                ],
            },
            {
                time: '🌙 夕食',
                items: [
                    { name: '木綿豆腐（1丁・醤油がけ）', kcal: 160 },
                    { name: 'おにぎり（2個）', kcal: 360 },
                    { name: 'カット野菜サラダ', kcal: 40 },
                ],
            },
            {
                time: '🍵 間食',
                items: [
                    { name: 'プレーンヨーグルト', kcal: 60 },
                    { name: 'みかん（1個）', kcal: 50 },
                ],
            },
        ],
    },
];

function renderMeal() {
    const container = document.getElementById('meal-plans');
    container.innerHTML = MEAL_PLANS.map(plan => {
        const total = plan.meals.reduce(
            (sum, m) => sum + m.items.reduce((s, i) => s + i.kcal, 0),
            0
        );
        const diff  = total - 2100;
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
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
                <div class="total-kcal">
                    1日合計: <strong>${total} kcal</strong>
                    &nbsp;
                    <span style="color:${diffColor};font-size:0.82rem">（目標比 ${diffStr} kcal）</span>
                </div>
            </div>`;
    }).join('');
}

// ===== 初期化 =====

document.addEventListener('DOMContentLoaded', () => {
    // ナビゲーション
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => showPage(item.dataset.page));
    });

    // 歩数・距離入力 → カロリー即時更新
    document.getElementById('record-steps').addEventListener('input', updateKcalPreview);
    document.getElementById('record-distance').addEventListener('input', updateKcalPreview);
    document.getElementById('record-watch-kcal').addEventListener('input', updateKcalPreview);

    // プロフィール未設定ならプロフィール画面から開始
    if (!getProfile()) {
        showPage('page-profile');
    } else {
        showPage('page-home');
    }
});
