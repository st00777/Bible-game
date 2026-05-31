// scripts/ga4-insights.js
// npm run ga4 ── 用 GA4 Data API 拉「中更新」3 個深度指標（對齊 data-insights 口徑）：
//   ① 活躍規模：MAU(30天) / WAU(7天) / DAU(昨天)
//   ② 9 個核心事件「觸發人數」（B1 事件流雙寫到 GA4 的同一批事件）
//   ③ 週 cohort 留存（W0~W5，依 firstSessionDate 分週）
//
// 認證：用 service account 金鑰 ga4-key.json（最小權限：屬性檢視者 + analytics.readonly scope）。
//   ── 跟 analyze/logs 三腳本不同：那三支用 Firebase CLI refresh token 打 Cloud REST API；
//      本腳本用 SA 金鑰、純 Node crypto 簽 JWT 換 token，一樣不裝 SDK。
// 不更動 _shared.js / analyze / logs，獨立成檔。

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROPERTY_ID = '534159832';                 // GA4 屬性 ID（數字；非 measurement ID G-HZ3EGYB8BB）
const KEY_PATH = path.join(__dirname, '..', 'ga4-key.json');
const DATA_API = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;

// B1 事件流的 9 個核心事件（與 bible-game-v2.html track() 雙寫的事件名一致）
const CORE_EVENTS = [
  'app_open', 'chapter_select', 'read_verse_view', 'question_view',
  'choice_confirm', 'reflection_submit', 'ai_response_received',
  'complete_devotional', 'app_leave',
];

// ── 用 SA 金鑰簽 JWT、換短效 access token（純 crypto，不裝 SDK）──
function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken() {
  if (!fs.existsSync(KEY_PATH)) {
    throw new Error(`找不到 service account 金鑰：${KEY_PATH}（這個檔在 .gitignore 內，需本機才有）`);
  }
  const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = b64url(signer.sign(key.private_key));
  const jwt = `${signingInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('無法用 SA 金鑰換 token：' + JSON.stringify(data));
  return data.access_token;
}

// ── 打一次 runReport ──
async function runReport(token, body) {
  const res = await fetch(DATA_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Data API ${res.status}: ${txt.slice(0, 400)}`);
  }
  return res.json();
}

// 取單一 activeUsers 數值（給某個日期區間）
async function activeUsers(token, startDate, endDate) {
  const r = await runReport(token, {
    metrics: [{ name: 'activeUsers' }],
    dateRanges: [{ startDate, endDate }],
  });
  return Number(r.rows?.[0]?.metricValues?.[0]?.value || 0);
}

// ── 日期工具：以 Sun–Sat 為一週，對齊 data-insights 的 cohort 切法 ──
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 產生最近 numWeeks 個「完整週」(週日~週六) 的 cohort 定義，最舊的排前面
function weeklyCohorts(numWeeks) {
  const today = new Date();
  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() - today.getDay());   // 本週日（本週起點）
  const lastSat = new Date(thisSunday);
  lastSat.setDate(thisSunday.getDate() - 1);              // 上一個完整週的週六
  const cohorts = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const wSat = new Date(lastSat);
    wSat.setDate(lastSat.getDate() - 7 * i);
    const wSun = new Date(wSat);
    wSun.setDate(wSat.getDate() - 6);
    cohorts.push({
      name: ymd(wSun),
      dimension: 'firstSessionDate',
      dateRange: { startDate: ymd(wSun), endDate: ymd(wSat) },
    });
  }
  return cohorts;
}

async function main() {
  console.log('📊 GA4 深度指標（property ' + PROPERTY_ID + '）\n');
  const token = await getAccessToken();

  // ① 活躍規模 ────────────────────────────────────────
  const [mau, wau, dau] = await Promise.all([
    activeUsers(token, '30daysAgo', 'today'),
    activeUsers(token, '7daysAgo', 'today'),
    activeUsers(token, 'yesterday', 'yesterday'),
  ]);
  console.log('① 活躍規模');
  console.log(`   MAU (近30天) : ${mau}`);
  console.log(`   WAU (近7天)  : ${wau}`);
  console.log(`   DAU (昨天)   : ${dau}`);
  console.log();

  // ② 核心事件觸發人數 ─────────────────────────────────
  const evReport = await runReport(token, {
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'activeUsers' }, { name: 'eventCount' }],
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensionFilter: {
      filter: { fieldName: 'eventName', inListFilter: { values: CORE_EVENTS } },
    },
  });
  const evMap = {};
  for (const row of evReport.rows || []) {
    evMap[row.dimensionValues[0].value] = {
      users: Number(row.metricValues[0].value),
      count: Number(row.metricValues[1].value),
    };
  }
  console.log('② 核心事件觸發人數（近30天，依 B1 事件流 9 事件）');
  console.log('   事件名                觸發人數    事件次數');
  for (const ev of CORE_EVENTS) {
    const e = evMap[ev] || { users: 0, count: 0 };
    console.log(`   ${ev.padEnd(22)}${String(e.users).padStart(6)}    ${String(e.count).padStart(8)}`);
  }
  console.log();

  // ③ 週 cohort 留存 ───────────────────────────────────
  const cohorts = weeklyCohorts(6);
  const cohortReport = await runReport(token, {
    dimensions: [{ name: 'cohort' }, { name: 'cohortNthWeek' }],
    metrics: [{ name: 'cohortActiveUsers' }],
    cohortSpec: {
      cohorts,
      cohortsRange: { granularity: 'WEEKLY', startOffset: 0, endOffset: 5 },
    },
  });
  // 整理成 { cohortName: { week: activeUsers } }
  const grid = {};
  for (const row of cohortReport.rows || []) {
    const cName = row.dimensionValues[0].value;             // cohort 名（GA4 回 cohort_0...）
    const wk = Number(row.dimensionValues[1].value);        // 0001 -> 數字
    const v = Number(row.metricValues[0].value);
    (grid[cName] ||= {})[wk] = v;
  }
  console.log('③ 週 cohort 留存（以 firstSessionDate 分週，週日~週六）');
  console.log('   首訪週起日     W0    W1    W2    W3    W4    W5   (W0=當週新客；後續為留存人數/留存率)');
  // GA4 回的 cohort 名 = 我們傳入 cohort 的 name 欄位（這裡是各週起日字串）
  cohorts.forEach((c) => {
    const g = grid[c.name] || {};
    const base = g[0] || 0;
    const cells = [];
    for (let w = 0; w <= 5; w++) {
      if (g[w] === undefined) { cells.push('   -   '); continue; }
      if (w === 0) { cells.push(String(g[0]).padStart(4) + '   '); continue; }
      const pct = base ? Math.round((g[w] / base) * 100) : 0;
      cells.push(`${String(g[w]).padStart(2)}/${String(pct).padStart(2)}%`);
    }
    console.log(`   ${c.name}  ${cells.join(' ')}`);
  });
  console.log('\n   ※ 對照 5/29 快照：MAU 203 / WAU 52 / DAU 16；早期 cohort（4/19-25 週）W4 留存約 50%');
}

main().catch((err) => {
  console.error('\n❌ 失敗：', err.message);
  process.exit(1);
});
