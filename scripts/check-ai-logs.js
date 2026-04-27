#!/usr/bin/env node
// 抓 aiReflection Cloud Function 的呼叫量、成功率與錯誤紀錄
// 用法: npm run logs [天數]   例如 npm run logs 2 看過去 2 天

const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT = 'bible-game-bcb84';
const SERVICE = 'aireflection';
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

function classifyError(textPayload) {
  if (!textPayload) return '其他';
  if (/\b503\b/.test(textPayload) && /demand|UNAVAILABLE/i.test(textPayload)) return '503 過載';
  if (/\b429\b/.test(textPayload)) return '429 限流';
  if (/\b401\b|\b403\b/.test(textPayload)) return '認證錯誤';
  if (/timeout|timed out/i.test(textPayload)) return 'timeout';
  return '其他錯誤';
}

async function main() {
  const token = await getAccessToken();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  // 1. Cloud Run access log（每個 HTTP 請求一筆，含 httpRequest.status）
  const reqFilter = `logName="projects/${PROJECT}/logs/run.googleapis.com%2Frequests"
    AND resource.labels.service_name="${SERVICE}"
    AND timestamp>="${since}"`;
  // 2. console.error / warn（callGoogleAI 在 AI API 失敗時 log）
  const errFilter = `resource.type="cloud_run_revision"
    AND resource.labels.service_name="${SERVICE}"
    AND timestamp>="${since}"
    AND (severity>=ERROR OR textPayload:"error" OR textPayload:"retry")`;

  const [requests, errors] = await Promise.all([
    fetchLogs(token, reqFilter),
    fetchLogs(token, errFilter),
  ]);

  // 統計 HTTP 結果
  const total = requests.length;
  let http2xx = 0, http4xx = 0, http5xx = 0;
  for (const r of requests) {
    const s = r.httpRequest?.status || 0;
    if (s >= 200 && s < 400) http2xx++;
    else if (s >= 400 && s < 500) http4xx++;
    else if (s >= 500) http5xx++;
  }

  // AI API 失敗（function 內部呼叫 Google AI 失敗，玩家拿到 fallback 文字）
  const aiErrors = errors.filter(e => {
    const t = e.textPayload || '';
    return /error:/i.test(t) && !/retry/i.test(t);
  });
  const retries = errors.filter(e => /retry/i.test(e.textPayload || '')).length;

  // 錯誤類型分布
  const errorTypes = {};
  for (const e of aiErrors) {
    const k = classifyError(e.textPayload);
    errorTypes[k] = (errorTypes[k] || 0) + 1;
  }

  // 成功率：玩家拿到真實 AI 回應 = HTTP 2xx - AI fallback
  const aiSuccess = Math.max(0, http2xx - aiErrors.length);
  const successRate = total > 0 ? (aiSuccess / total * 100).toFixed(1) : '—';

  console.log(`\n📊 過去 ${days} 天 aiReflection 統計（自 ${since.slice(0,16).replace('T',' ')} UTC 起）\n`);
  console.log(`  總呼叫次數     ${total}`);
  console.log(`  HTTP 2xx       ${http2xx}`);
  console.log(`  HTTP 4xx       ${http4xx}`);
  console.log(`  HTTP 5xx       ${http5xx}`);
  console.log(`  AI 真實回應    ${aiSuccess} ${total > 0 ? `(${successRate}%)` : ''}`);
  console.log(`  AI fallback    ${aiErrors.length}  ${aiErrors.length > 0 && total > 0 ? `(${(aiErrors.length/total*100).toFixed(1)}%)` : ''}`);
  if (retries > 0) console.log(`  retry 觸發     ${retries}`);

  if (Object.keys(errorTypes).length > 0) {
    console.log('\n  錯誤類型分布:');
    for (const [k, v] of Object.entries(errorTypes).sort((a,b) => b[1]-a[1])) {
      console.log(`    ${k.padEnd(12, '　')} ${v}`);
    }
  }

  if (aiErrors.length === 0) {
    console.log('\n  ✨ 無 AI 失敗紀錄');
    return;
  }

  // 依日期分組 errors
  const byDay = {};
  for (const e of aiErrors) {
    const day = e.timestamp.slice(0, 10);
    (byDay[day] ||= []).push(e);
  }

  console.log('\n📋 錯誤明細\n');
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

main().catch(e => { console.error(e); process.exit(1); });
