#!/usr/bin/env node
// 抓 lineLogin Cloud Function 的呼叫量、成功率與錯誤紀錄
// 用法: npm run line-logs [天數]   例如 npm run line-logs 7 看過去 7 天

const { PROJECT, getAccessToken, fetchLogs, printErrorsByDay } = require('./_shared');

const SERVICE = 'linelogin';
const days = Number(process.argv[2]) || 1;

// 把 textPayload 對應成中文錯誤類型，方便看 LINE OAuth 哪段壞掉
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

  // HTTP 統計（同時收集失敗時間，用來畫失敗時段分布）
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

  // 失敗時段分布（台灣時間 = UTC+8）
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

  // 印每日錯誤明細（共用工具，預設每日前 20 筆）
  if (errors.length > 0) {
    printErrorsByDay(errors);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
