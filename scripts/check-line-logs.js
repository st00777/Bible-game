#!/usr/bin/env node
// 抓 lineLogin Cloud Function 的呼叫量、成功率與錯誤紀錄
// 用法: npm run line-logs [天數]   例如 npm run line-logs 7 看過去 7 天

const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT = 'bible-game-bcb84';
const SERVICE = 'linelogin';
const days = Number(process.argv[2]) || 1;

async function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
  if (!fs.existsSync(configPath)) throw new Error('請先 firebase login');
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

function classifyLineError(textPayload) {
  if (!textPayload) return '其他';
  if (/LINE token error/i.test(textPayload)) return 'LINE token 換取失敗';
  if (/LINE profile fetch error/i.test(textPayload)) return 'LINE profile 取得失敗';
  if (/lineLogin function error/i.test(textPayload)) return '伺服器內部錯誤';
  if (/invalid_redirect_uri/i.test(textPayload)) return 'Redirect URI 無效';
  if (/Missing code/i.test(textPayload)) return '缺少參數';
  return '其他';
}

async function main() {
  const token = await getAccessToken();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const reqFilter = `logName="projects/${PROJECT}/logs/run.googleapis.com%2Frequests"
    AND resource.labels.service_name="${SERVICE}"
    AND timestamp>="${since}"`;
  const errFilter = `resource.type="cloud_run_revision"
    AND resource.labels.service_name="${SERVICE}"
    AND timestamp>="${since}"
    AND severity>=ERROR`;

  const [requests, errors] = await Promise.all([
    fetchLogs(token, reqFilter),
    fetchLogs(token, errFilter),
  ]);

  // HTTP 統計
  const total = requests.length;
  let http2xx = 0, http4xx = 0, http5xx = 0;
  const failedTimes = [];
  for (const r of requests) {
    const s = r.httpRequest?.status || 0;
    if (s >= 200 && s < 400) http2xx++;
    else if (s >= 400 && s < 500) { http4xx++; failedTimes.push(r.timestamp); }
    else if (s >= 500) { http5xx++; failedTimes.push(r.timestamp); }
  }

  const successRate = total > 0 ? (http2xx / total * 100).toFixed(1) : '—';

  console.log(`\n📊 過去 ${days} 天 lineLogin 統計（自 ${since.slice(0,16).replace('T',' ')} UTC 起）\n`);
  console.log(`  總呼叫次數     ${total}`);
  console.log(`  HTTP 2xx 成功  ${http2xx} ${total > 0 ? `(${successRate}%)` : ''}`);
  console.log(`  HTTP 4xx 失敗  ${http4xx}`);
  console.log(`  HTTP 5xx 失敗  ${http5xx}`);

  // 錯誤類型分布
  const errorTypes = {};
  for (const e of errors) {
    const k = classifyLineError(e.textPayload);
    errorTypes[k] = (errorTypes[k] || 0) + 1;
  }

  if (Object.keys(errorTypes).length > 0) {
    console.log('\n  錯誤類型分布:');
    for (const [k, v] of Object.entries(errorTypes).sort((a,b) => b[1]-a[1])) {
      console.log(`    ${k.padEnd(20, '　')} ${v}`);
    }
  }

  // 失敗時段分布（台灣時間）
  if (failedTimes.length > 0) {
    const byHour = {};
    for (const ts of failedTimes) {
      const taipei = (new Date(ts).getUTCHours() + 8) % 24;
      byHour[taipei] = (byHour[taipei] || 0) + 1;
    }
    console.log('\n  失敗時段分布（台灣時間）:');
    for (let h = 0; h < 24; h++) {
      if (byHour[h]) console.log(`    ${String(h).padStart(2,'0')}:00  ${'█'.repeat(byHour[h])} ${byHour[h]}`);
    }
  }

  if (errors.length === 0 && http4xx === 0 && http5xx === 0) {
    console.log('\n  ✨ 無 LINE 登入失敗紀錄');
    return;
  }

  // 錯誤明細
  if (errors.length > 0) {
    console.log('\n📋 錯誤明細\n');
    const byDay = {};
    for (const e of errors) {
      const day = e.timestamp.slice(0, 10);
      (byDay[day] ||= []).push(e);
    }
    for (const day of Object.keys(byDay).sort().reverse()) {
      console.log(`── ${day} (${byDay[day].length} 筆) ──`);
      for (const e of byDay[day].slice(0, 20)) {
        const time = e.timestamp.slice(11, 19);
        const msg = (e.textPayload || JSON.stringify(e.jsonPayload || {})).replace(/\s+/g, ' ').slice(0, 160);
        console.log(`  ${time}  ${msg}`);
      }
      if (byDay[day].length > 20) console.log(`  ... 還有 ${byDay[day].length - 20} 筆`);
      console.log();
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
