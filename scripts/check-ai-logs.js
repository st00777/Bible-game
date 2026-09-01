#!/usr/bin/env node
// 抓 aiReflection Cloud Function 的呼叫量、成功率與錯誤紀錄
// 用法: npm run logs [天數]   例如 npm run logs 2 看過去 2 天
// 共同骨架（token／filter／抓 log／HTTP 統計／標題）在 _shared.js runLogReport，
// 本檔只留 aiReflection 專屬的統計與輸出。

const { runLogReport, printErrorTypes, printErrorsByDay } = require('./_shared');

const days = Number(process.argv[2]) || 1;

// 把 textPayload 對應成中文錯誤類型，方便看分布
function classifyError(textPayload) {
  if (!textPayload) return '其他';
  if (/\b503\b/.test(textPayload) && /demand|UNAVAILABLE/i.test(textPayload)) return '503 過載';
  if (/\b429\b/.test(textPayload)) return '429 限流';
  if (/\b401\b|\b403\b/.test(textPayload)) return '認證錯誤';
  if (/timeout|timed out/i.test(textPayload)) return 'timeout';
  return '其他錯誤';
}

runLogReport({
  service: 'aireflection',
  label: 'aiReflection',
  days,
  // console.error / warn（callGoogleAI 在 AI API 失敗時 log）
  errFilterExtra: '(severity>=ERROR OR textPayload:"error" OR textPayload:"retry" OR textPayload:"truncated")',
  report({ errors, total, http2xx, http4xx, http5xx }) {
    // AI API 失敗（function 內部呼叫 Google AI 失敗，玩家拿到 fallback 文字）
    const aiErrors = errors.filter(e => {
      const t = e.textPayload || '';
      return /error:/i.test(t) && !/retry/i.test(t);
    });
    const retries = errors.filter(e => /retry/i.test(e.textPayload || '') && !/truncated/.test(e.textPayload || '')).length;
    // 回應被截斷（MAX_TOKENS）：一次＝濃縮重試成功；twice＝兩次都截、玩家拿 fallback（2026-08-29 起）
    const truncOnce = errors.filter(e => /truncated \(MAX_TOKENS\)/.test(e.textPayload || '')).length;
    const truncTwice = errors.filter(e => /truncated twice/.test(e.textPayload || '')).length;

    // 成功率：玩家拿到真實 AI 回應 = HTTP 2xx - AI fallback
    const aiSuccess = Math.max(0, http2xx - aiErrors.length - truncTwice);
    const successRate = total > 0 ? (aiSuccess / total * 100).toFixed(1) : '—';

    console.log(`  總呼叫次數     ${total}`);
    console.log(`  HTTP 2xx       ${http2xx}`);
    console.log(`  HTTP 4xx       ${http4xx}`);
    console.log(`  HTTP 5xx       ${http5xx}`);
    console.log(`  AI 真實回應    ${aiSuccess} ${total > 0 ? `(${successRate}%)` : ''}`);
    console.log(`  AI fallback    ${aiErrors.length}  ${aiErrors.length > 0 && total > 0 ? `(${(aiErrors.length / total * 100).toFixed(1)}%)` : ''}`);
    if (retries > 0) console.log(`  retry 觸發     ${retries}`);
    if (truncOnce > 0) console.log(`  回應截斷→濃縮重試 ${truncOnce}（其中兩次都截、退 fallback：${truncTwice}）`);

    printErrorTypes(aiErrors, classifyError, 12);

    if (aiErrors.length === 0) {
      console.log('\n  ✨ 無 AI 失敗紀錄');
      return;
    }

    // 印每日錯誤明細（共用工具，預設每日前 20 筆）
    printErrorsByDay(aiErrors);
  },
}).catch(e => { console.error(e); process.exit(1); });
