// scripts/_shared.js
// 三個 admin 腳本（check-ai-logs / check-line-logs / analyze-feedback）共用的工具
// 包含：Firebase 專案常數、access token 取得、Cloud Logging 抓 log、錯誤明細列印

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

module.exports = { PROJECT, getAccessToken, fetchLogs, printErrorsByDay };
