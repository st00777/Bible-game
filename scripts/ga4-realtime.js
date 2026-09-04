// GA4 即時事件檢查（npm run ga4:rt）
// 用途：測玩第 16 步——瀏覽器工具抓不到 sendBeacon 送出的 g/collect（Issue #94），
//       改直接問 GA4 Data API 的即時報表：近 30 分鐘正式站有哪些事件進來。
// 授權方式與 ga4-insights.js 相同：ga4-key.json（SA 金鑰，gitignore）簽 JWT 換 token，不裝 SDK。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROPERTY_ID = '534159832';
const KEY_PATH = path.join(__dirname, '..', 'ga4-key.json');
const MINUTES = Number(process.argv[2]) || 30;   // 可帶參數：node scripts/ga4-realtime.js 10

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');

async function getToken() {
  if (!fs.existsSync(KEY_PATH)) throw new Error(`找不到 service account 金鑰：${KEY_PATH}（在 .gitignore 內，需本機才有）`);
  const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  });
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), key.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + sig }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('無法用 SA 金鑰換 token：' + JSON.stringify(data));
  return data.access_token;
}

(async () => {
  const token = await getToken();
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runRealtimeReport`, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      minuteRanges: [{ name: 'recent', startMinutesAgo: Math.min(MINUTES, 30) - 1, endMinutesAgo: 0 }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error('GA4 API 錯誤：' + JSON.stringify(data.error));
  const rows = data.rows || [];
  console.log(`GA4 即時事件（近 ${Math.min(MINUTES, 30)} 分鐘，正式站）`);
  if (!rows.length) { console.log('  （沒有任何事件）'); return; }
  rows.forEach(r => console.log('  ' + r.dimensionValues[0].value.padEnd(26) + r.metricValues[0].value));
  const names = new Set(rows.map(r => r.dimensionValues[0].value));
  const core = ['app_open', 'chapter_select', 'read_chapter', 'choice_confirm', 'complete_devotional'];
  const hit = core.filter(n => names.has(n));
  console.log(`\n核心流程事件命中 ${hit.length}/${core.length}：${hit.join(', ') || '無'}`);
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
