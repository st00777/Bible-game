// scripts/_shared.js
// scripts/ 下所有 admin 腳本共用的工具（ga4-insights 除外：SA JWT 流程獨立）
// 包含：Firebase 專案常數、access token 取得、Cloud Logging 抓 log＋log 報告 runner、
//       Firestore REST（value 解碼／翻頁抓集合）、Auth 列帳號、週鍵（口徑守門）、錯誤明細列印

const fs = require('fs');
const os = require('os');
const path = require('path');

// Firebase 專案 ID（三個腳本都用同一個專案）
const PROJECT = 'bible-game-bcb84';

// ── Auth：從 Firebase CLI 設定檔取 access token ─────────────
// 從本機 ~/.config/configstore/firebase-tools.json 讀取 firebase login 後留下的 refresh token，
// 換成短效的 OAuth access token，給 Cloud Logging / Firestore REST API 用。
async function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('找不到 Firebase CLI 設定，請先執行 firebase login');
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const refreshToken = config.tokens?.refresh_token;
  if (!refreshToken) throw new Error('Firebase CLI 沒有 refresh token，請重新 firebase login');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('無法取得 access token: ' + JSON.stringify(data));
  return data.access_token;
}

// ── Cloud Logging：抓 entries（自動翻頁，最多 5000 筆）─────
// filter 是 Cloud Logging 的查詢字串（例如指定 service_name、時間範圍、severity）
async function fetchLogs(token, filter) {
  const all = [];
  let pageToken;
  do {
    const res = await fetch('https://logging.googleapis.com/v2/entries:list', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceNames: [`projects/${PROJECT}`],
        filter,
        orderBy: 'timestamp desc',
        pageSize: 1000,
        pageToken,
      }),
    });
    if (!res.ok) {
      console.error('Logging API error:', res.status, await res.text());
      process.exit(1);
    }
    const data = await res.json();
    if (data.entries) all.push(...data.entries);
    pageToken = data.nextPageToken;
  } while (pageToken && all.length < 5000);
  return all;
}

// ── 印錯誤明細：把錯誤依日期分組，每日印前 limitPerDay 筆 ──
// errors: Cloud Logging 的 entry 陣列；limitPerDay 預設 20，超過會印「... 還有 N 筆」
function printErrorsByDay(errors, limitPerDay = 20) {
  const byDay = {};
  for (const e of errors) {
    const day = e.timestamp.slice(0, 10);
    (byDay[day] ||= []).push(e);
  }
  console.log('\n📋 錯誤明細\n');
  for (const day of Object.keys(byDay).sort().reverse()) {
    console.log(`── ${day} (${byDay[day].length} 筆) ──`);
    for (const e of byDay[day].slice(0, limitPerDay)) {
      const time = e.timestamp.slice(11, 19);
      const msg = (e.textPayload || JSON.stringify(e.jsonPayload || {})).replace(/\s+/g, ' ').slice(0, 160);
      console.log(`  ${time}  ${msg}`);
    }
    if (byDay[day].length > limitPerDay) console.log(`  ... 還有 ${byDay[day].length - limitPerDay} 筆`);
    console.log();
  }
}

// ── Cloud Run function log 報告 runner ──────────────────────
// check-ai-logs / check-line-logs 共用骨架：取 token → 組 request/error filter →
// 抓兩批 log → 統計 HTTP 2xx/4xx/5xx（4xx/5xx 收集 timestamp 給時段分布用）→ 印標題 →
// 把 context 交給各腳本的 report() 印服務專屬的統計。
// errFilterExtra：接在共同條件後的錯誤 log 篩選子句（各服務不同，原樣保留）。
async function runLogReport({ service, label, days, errFilterExtra, report }) {
  const token = await getAccessToken();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  // Cloud Run access log（每個 HTTP 請求一筆，含 httpRequest.status）
  const reqFilter = `logName="projects/${PROJECT}/logs/run.googleapis.com%2Frequests"
    AND resource.labels.service_name="${service}"
    AND timestamp>="${since}"`;
  const errFilter = `resource.type="cloud_run_revision"
    AND resource.labels.service_name="${service}"
    AND timestamp>="${since}"
    AND ${errFilterExtra}`;

  const [requests, errors] = await Promise.all([
    fetchLogs(token, reqFilter),
    fetchLogs(token, errFilter),
  ]);

  const total = requests.length;
  let http2xx = 0, http4xx = 0, http5xx = 0;
  const failedTimes = [];
  for (const r of requests) {
    const s = r.httpRequest?.status || 0;
    if (s >= 200 && s < 400) http2xx++;
    else if (s >= 400 && s < 500) { http4xx++; failedTimes.push(r.timestamp); }
    else if (s >= 500) { http5xx++; failedTimes.push(r.timestamp); }
  }

  console.log(`\n📊 過去 ${days} 天 ${label} 統計（自 ${since.slice(0, 16).replace('T', ' ')} UTC 起）\n`);
  await report({ requests, errors, total, http2xx, http4xx, http5xx, failedTimes, days, since });
}

// 錯誤類型分布：classify(textPayload) → 中文類型，計數後由多到少列印。
// pad：類型欄位補全形空白的寬度（ai 版 12、line 版 20，維持原輸出）。
function printErrorTypes(errors, classify, pad = 12) {
  const errorTypes = {};
  for (const e of errors) {
    const k = classify(e.textPayload);
    errorTypes[k] = (errorTypes[k] || 0) + 1;
  }
  if (Object.keys(errorTypes).length === 0) return;
  console.log('\n  錯誤類型分布:');
  for (const [k, v] of Object.entries(errorTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(pad, '　')} ${v}`);
  }
}

// ── Firestore REST ──────────────────────────────────────────
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// Firestore value → JS 值。口徑（2026-09-01 收斂六份複本，取最完整版）：
//   - integerValue 轉 Number（Firestore 回字串）
//   - timestampValue 保留 ISO 字串（不轉 Date，各腳本自行處理時區）
//   - nullValue 明確回 null（舊有三份複本靠 fallthrough 回 null，語意相同）
//   - mapValue / arrayValue 遞迴解碼
function parseFirestoreValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.nullValue !== undefined) return null;
  if (v.mapValue) {
    const obj = {};
    for (const [k, mv] of Object.entries(v.mapValue.fields || {})) obj[k] = parseFirestoreValue(mv);
    return obj;
  }
  if (v.arrayValue) return (v.arrayValue.values || []).map(parseFirestoreValue);
  return null;
}

// document → 純物件（不含 _id / _path 等附加欄位，需要的腳本自行加）
function parseDoc(doc) {
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields || {})) obj[k] = parseFirestoreValue(v);
  return obj;
}

// 翻頁抓整個集合（pageSize=300，自動跟 nextPageToken）
async function fetchCollection(token, collection) {
  const docs = [];
  let pageToken = '';
  while (true) {
    const url = `${FIRESTORE_BASE}/${collection}?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    if (body.documents) docs.push(...body.documents);
    if (body.nextPageToken) { pageToken = body.nextPageToken; } else break;
  }
  return docs;
}

// ── Firebase Auth REST：列所有帳號（identitytoolkit batchGet，翻頁）──
async function fetchAllUsers(token) {
  const users = [];
  let nextPageToken = '';
  while (true) {
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchGet?maxResults=500${nextPageToken ? '&nextPageToken=' + nextPageToken : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    if (body.users) users.push(...body.users);
    if (body.nextPageToken) { nextPageToken = body.nextPageToken; } else break;
  }
  return users;
}

// ── 週鍵（🔴 口徑守門項：週起點＝週日 UTC，一字不改）──────
// weekKey('YYYY-MM-DD') → 該週週日的 YYYY-MM-DD（data-insights 週別趨勢表同口徑）
function weekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}
// weekLabel('YYYY-MM-DD') → 'MM-DD~MM-DD'（週日~週六）
function weekLabel(w) {
  const e = new Date(w + 'T00:00:00Z'); e.setUTCDate(e.getUTCDate() + 6);
  return `${w.slice(5)}~${e.toISOString().slice(5, 10)}`;
}

module.exports = {
  PROJECT, getAccessToken, fetchLogs, printErrorsByDay,
  runLogReport, printErrorTypes,
  FIRESTORE_BASE, parseFirestoreValue, parseDoc, fetchCollection, fetchAllUsers,
  weekKey, weekLabel,
};
