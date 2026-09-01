#!/usr/bin/env node
// 抓 lineLogin Cloud Function 的呼叫量、成功率與錯誤紀錄
// 用法: npm run line-logs [天數]   例如 npm run line-logs 7 看過去 7 天
// 共同骨架（token／filter／抓 log／HTTP 統計／標題）在 _shared.js runLogReport，
// 本檔只留 lineLogin 專屬的統計與輸出（含失敗時段分布）。

const { runLogReport, printErrorTypes, printErrorsByDay } = require('./_shared');

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

runLogReport({
  service: 'linelogin',
  label: 'lineLogin',
  days,
  errFilterExtra: 'severity>=ERROR',
  report({ errors, total, http2xx, http4xx, http5xx, failedTimes }) {
    const successRate = total > 0 ? (http2xx / total * 100).toFixed(1) : '—';

    console.log(`  總呼叫次數     ${total}`);
    console.log(`  HTTP 2xx 成功  ${http2xx} ${total > 0 ? `(${successRate}%)` : ''}`);
    console.log(`  HTTP 4xx 失敗  ${http4xx}`);
    console.log(`  HTTP 5xx 失敗  ${http5xx}`);

    printErrorTypes(errors, classifyLineError, 20);

    // 失敗時段分布（台灣時間 = UTC+8）
    if (failedTimes.length > 0) {
      const byHour = {};
      for (const ts of failedTimes) {
        const taipei = (new Date(ts).getUTCHours() + 8) % 24;
        byHour[taipei] = (byHour[taipei] || 0) + 1;
      }
      console.log('\n  失敗時段分布（台灣時間）:');
      for (let h = 0; h < 24; h++) {
        if (byHour[h]) console.log(`    ${String(h).padStart(2, '0')}:00  ${'█'.repeat(byHour[h])} ${byHour[h]}`);
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
  },
}).catch(e => { console.error(e); process.exit(1); });
