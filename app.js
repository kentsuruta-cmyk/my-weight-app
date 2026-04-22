'use strict';

// ===== 定数 =====
const DEFAULT_PROFILE = {
    age: 45,
    gender: 'male',
    height: 170,
    currentWeight: 69,
    targetWeight: 66
};

const STEPS_KCAL_PER_1000 = 35;   // 1000歩あたり消費kcal
const RUN_KCAL_PER_KM = 60;        // 1kmランニングあたり消費kcal
const RECOMMENDED_KCAL = 2100;     // 推奨摂取カロリー

const STORAGE_PROFILE = 'weightapp_profile';
const STORAGE_RECORDS = 'weightapp_records';

// ===== 食事提案データ =====
const MEAL_PLAN = [
    {
        time: '朝食',
        kcal: 580,
        items: [
            { name: '納豆', note: '1パック (45g) — 約90kcal／タンパク質7g／腸活に◎' },
            { name: '温泉卵', note: '1個 — 約80kcal／タンパク質6g' },
            { name: '豆腐の味噌汁', note: '1杯 — 約50kcal／イソフラボン豊富' },
            { name: '玄米ご飯', note: '小盛り130g — 約215kcal／食物繊維が多い' },
            { name: '小松菜おひたし', note: '1小鉢 — 約25kcal／カルシウム・鉄分' },
        ]
    },
    {
        time: '昼食',
        kcal: 680,
        items: [
            { name: '鶏胸肉（塩麹焼き）', note: '100g — 約150kcal／タンパク質24g' },
            { name: '豆腐サラダ', note: '絹豆腐150g — 約90kcal／大豆タンパク' },
            { name: '雑穀ご飯', note: '普通盛り160g — 約265kcal' },
            { name: 'わかめとねぎのスープ', note: '1杯 — 約20kcal／ミネラル補給' },
            { name: 'ブロッコリー', note: '1/3株 — 約30kcal／ビタミンC・葉酸' },
        ]
    },
    {
        time: '夕食',
        kcal: 640,
        items: [
            { name: '鮭の塩焼き', note: '1切れ100g — 約140kcal／オメガ3脂肪酸' },
            { name: '豆腐ハンバーグ', note: '1個 — 約165kcal／植物性タンパク' },
            { name: 'ほうれん草のソテー', note: '1皿 — 約40kcal／鉄・マグネシウム' },
            { name: '玄米ご飯', note: '小盛り130g — 約215kcal' },
            { name: '根菜の煮物', note: '1小鉢 — 約80kcal／食物繊維' },
        ]
    },
    {
        time: 'おやつ・間食',
        kcal: 200,
        items: [
            { name: 'ギリシャヨーグルト', note: '1個100g — 約100kcal／タンパク質10g' },
            { name: 'ミックスナッツ', note: '20g — 約120kcal／良質な脂質・ビタミンE' },
        ]
    }
];

// ===== 状態 =====
let profile = {};
let records = [];

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    setTodayDate();
    renderAll();
});

// ===== データ管理 =====
function loadData() {
    try {
        const savedProfile = localStorage.getItem(STORAGE_PROFILE);
        profile = savedProfile ? JSON.parse(savedProfile) : { ...DEFAULT_PROFILE };

        const savedRecords = localStorage.getItem(STORAGE_RECORDS);
        records = savedRecords ? JSON.parse(savedRecords) : [];
    } catch (e) {
        profile = { ...DEFAULT_PROFILE };
        records = [];
    }
}

function persistProfile() {
    localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
}

function persistRecords() {
    localStorage.setItem(STORAGE_RECORDS, JSON.stringify(records));
}

// ===== イベント設定 =====
function setupEventListeners() {
    document.getElementById('save-profile-btn').addEventListener('click', onSaveProfile);
    document.getElementById('save-record-btn').addEventListener('click', onSaveRecord);

    ['record-weight', 'record-steps', 'record-run'].forEach(id => {
        document.getElementById(id).addEventListener('input', onRecordInputChange);
    });
}

function setTodayDate() {
    document.getElementById('record-date').value = localDateStr(new Date());
}

// ===== ハンドラ =====
function onSaveProfile() {
    const age = parseInt(document.getElementById('age').value);
    const height = parseFloat(document.getElementById('height').value);
    const cw = parseFloat(document.getElementById('current-weight').value);
    const tw = parseFloat(document.getElementById('target-weight').value);

    if (!age || age < 10 || age > 100) { showToast('年齢を正しく入力してください', 'error'); return; }
    if (!height || height < 100 || height > 250) { showToast('身長を正しく入力してください', 'error'); return; }
    if (!cw || cw < 30 || cw > 200) { showToast('体重を正しく入力してください', 'error'); return; }
    if (!tw || tw < 30 || tw > 200) { showToast('目標体重を正しく入力してください', 'error'); return; }

    profile = {
        age,
        gender: document.getElementById('gender').value,
        height,
        currentWeight: cw,
        targetWeight: tw
    };

    persistProfile();
    renderAll();
    showToast('プロフィールを保存しました');
}

function onSaveRecord() {
    const date = document.getElementById('record-date').value;
    const weight = parseFloat(document.getElementById('record-weight').value);
    const steps = parseInt(document.getElementById('record-steps').value) || 0;
    const run = parseFloat(document.getElementById('record-run').value) || 0;

    if (!date) { showToast('日付を入力してください', 'error'); return; }
    if (!weight || weight < 30 || weight > 200) { showToast('正しい体重を入力してください（30〜200kg）', 'error'); return; }

    const idx = records.findIndex(r => r.date === date);
    const record = { date, weight, steps, run };

    if (idx >= 0) {
        records[idx] = record;
    } else {
        records.push(record);
        records.sort((a, b) => a.date.localeCompare(b.date));
    }

    // 最新記録で現在体重を更新
    const latest = records[records.length - 1];
    if (latest && latest.date >= date) {
        profile.currentWeight = latest.weight;
        document.getElementById('current-weight').value = latest.weight;
    }

    persistRecords();
    persistProfile();
    renderAll();
    showToast('記録を保存しました');
}

function onRecordInputChange() {
    updateSummary();
}

// ===== 計算 =====
function calcBMR(weight) {
    const w = weight || profile.currentWeight;
    if (profile.gender === 'male') {
        return Math.round(88.362 + (13.397 * w) + (4.799 * profile.height) - (5.677 * profile.age));
    }
    return Math.round(447.593 + (9.247 * w) + (3.098 * profile.height) - (4.330 * profile.age));
}

function calcStepsKcal(steps) {
    return Math.round((steps / 1000) * STEPS_KCAL_PER_1000);
}

function calcRunKcal(km) {
    return Math.round(km * RUN_KCAL_PER_KM);
}

// ===== 描画 =====
function renderAll() {
    renderProfile();
    updateSummary();
    renderMeals();
    renderHistory();
}

function renderProfile() {
    document.getElementById('age').value = profile.age;
    document.getElementById('gender').value = profile.gender;
    document.getElementById('height').value = profile.height;
    document.getElementById('current-weight').value = profile.currentWeight;
    document.getElementById('target-weight').value = profile.targetWeight;
}

function updateSummary() {
    const inputWeight = parseFloat(document.getElementById('record-weight').value);
    const steps = parseInt(document.getElementById('record-steps').value) || 0;
    const run = parseFloat(document.getElementById('record-run').value) || 0;
    const weight = inputWeight || profile.currentWeight;

    const bmr = calcBMR(weight);
    const stepsKcal = calcStepsKcal(steps);
    const runKcal = calcRunKcal(run);
    const total = bmr + stepsKcal + runKcal;
    const diff = parseFloat((weight - profile.targetWeight).toFixed(1));

    document.getElementById('bmr-value').textContent = `${bmr.toLocaleString()} kcal`;
    document.getElementById('steps-kcal').textContent = `${stepsKcal.toLocaleString()} kcal`;
    document.getElementById('run-kcal').textContent = `${runKcal.toLocaleString()} kcal`;
    document.getElementById('total-kcal').textContent = `${total.toLocaleString()} kcal`;
    document.getElementById('recommended-intake').textContent = `${RECOMMENDED_KCAL.toLocaleString()} kcal`;

    const goalEl = document.getElementById('goal-diff');
    if (diff <= 0) {
        goalEl.textContent = '目標達成！';
        goalEl.className = 'stat-value success';
    } else {
        goalEl.textContent = `あと ${diff} kg`;
        goalEl.className = diff <= 1 ? 'stat-value warning' : 'stat-value';
    }
}

function renderMeals() {
    const container = document.getElementById('meal-suggestions');
    container.innerHTML = MEAL_PLAN.map(meal => `
        <div class="meal-card">
            <div class="meal-header">
                <span class="meal-time">${meal.time}</span>
                <span class="meal-kcal">${meal.kcal} kcal</span>
            </div>
            <ul class="meal-items">
                ${meal.items.map(item => `
                    <li>
                        <span class="food-name">${item.name}</span>
                        <span class="food-note">${item.note}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');
}

function renderHistory() {
    renderChart();
    renderList();
}

// ===== グラフ描画 =====
function renderChart() {
    const canvas = document.getElementById('weight-chart');
    const container = document.getElementById('chart-container');
    const ctx = canvas.getContext('2d');

    const data = records.slice(-30);

    if (data.length < 2) {
        canvas.style.display = 'none';
        return;
    }

    canvas.style.display = 'block';

    const dpr = window.devicePixelRatio || 1;
    const cssW = container.clientWidth || 320;
    const cssH = 200;

    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { top: 20, right: 24, bottom: 36, left: 50 };
    const cw = cssW - pad.left - pad.right;
    const ch = cssH - pad.top - pad.bottom;

    const weights = data.map(r => r.weight);
    const minW = Math.min(...weights, profile.targetWeight) - 0.5;
    const maxW = Math.max(...weights) + 0.5;
    const range = maxW - minW || 1;

    const toX = i => pad.left + cw * i / Math.max(data.length - 1, 1);
    const toY = w => pad.top + ch * (maxW - w) / range;

    // 背景
    ctx.fillStyle = '#f8fafd';
    ctx.roundRect(0, 0, cssW, cssH, 8);
    ctx.fill();

    // グリッド
    ctx.strokeStyle = '#e4e9f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + ch * i / 4;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(cssW - pad.right, y);
        ctx.stroke();

        const val = maxW - range * i / 4;
        ctx.fillStyle = '#9aa5b4';
        ctx.font = `${11 * Math.min(1, cssW / 300)}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(val.toFixed(1), pad.left - 6, y + 4);
    }

    // 目標ライン
    if (profile.targetWeight >= minW && profile.targetWeight <= maxW) {
        const ty = toY(profile.targetWeight);
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(pad.left, ty);
        ctx.lineTo(cssW - pad.right, ty);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff6b6b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`目標 ${profile.targetWeight}kg`, cssW - pad.right, ty - 4);
    }

    // エリア塗り
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0].weight));
    data.forEach((r, i) => ctx.lineTo(toX(i), toY(r.weight)));
    ctx.lineTo(toX(data.length - 1), pad.top + ch);
    ctx.lineTo(toX(0), pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = 'rgba(74,144,226,0.12)';
    ctx.fill();

    // 折れ線
    ctx.beginPath();
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    data.forEach((r, i) => {
        if (i === 0) ctx.moveTo(toX(i), toY(r.weight));
        else ctx.lineTo(toX(i), toY(r.weight));
    });
    ctx.stroke();

    // 点
    data.forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(toX(i), toY(r.weight), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#4a90e2';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // X軸ラベル
    const step = Math.max(1, Math.ceil(data.length / 6));
    ctx.fillStyle = '#9aa5b4';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    data.forEach((r, i) => {
        if (i % step === 0 || i === data.length - 1) {
            const d = new Date(r.date);
            ctx.fillText(`${d.getMonth() + 1}/${d.getDate()}`, toX(i), cssH - pad.bottom + 16);
        }
    });
}

// ===== 履歴リスト =====
function renderList() {
    const container = document.getElementById('weight-list');

    if (records.length === 0) {
        container.innerHTML = `
            <p class="empty-msg">まだ記録がありません。<br>「今日の記録」から最初の体重を入力しましょう。</p>
        `;
        return;
    }

    const recent = [...records].reverse().slice(0, 14);

    container.innerHTML = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>日付</th>
                    <th>体重</th>
                    <th>歩数</th>
                    <th>走行</th>
                    <th>消費</th>
                </tr>
            </thead>
            <tbody>
                ${recent.map(r => {
                    const total = calcBMR(r.weight) + calcStepsKcal(r.steps) + calcRunKcal(r.run);
                    const d = new Date(r.date);
                    return `
                        <tr>
                            <td>${d.getMonth() + 1}/${d.getDate()}</td>
                            <td class="weight-cell">${r.weight} kg</td>
                            <td>${r.steps ? r.steps.toLocaleString() : '—'}</td>
                            <td>${r.run ? r.run + ' km' : '—'}</td>
                            <td>${total.toLocaleString()}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// ===== ユーティリティ =====
function localDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function showToast(message, type = 'success') {
    // 既存のトーストを削除
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast${type === 'error' ? ' toast-error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2600);
}

// リサイズ時にグラフ再描画
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (records.length >= 2) renderChart();
    }, 150);
});
