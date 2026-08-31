// scripts/weekly-trend.js
// 按「週」（週日~週六）分桶輸出關鍵指標，給 data-insights.md「週別趨勢表」每期累積一列用。
// 用法：npm run weekly        （預設最近 6 週）
//       npm run weekly 10     （最近 10 週）
// 資料源：Firebase Auth（註冊）+ Firestore users/{uid}/chapters（完成/默想/閱讀/嚴格活躍）+ users/{uid}/events（B1，5/24 起）
// 重用 _shared.js 的 Firebase CLI refresh token，不需額外 SDK。輸出為 markdown 表格，可直接貼進 data-insights。

// Firestore value 解析／週鍵（週日起算）皆用 _shared.js 正本（口徑守門）
const { getAccessToken, parseDoc: parse, fetchCollection: fetchCol, fetchAllUsers: allUsers, weekKey, weekLabel } = require('./_shared.js');

const WEEKS = Math.max(2, parseInt(process.argv[2], 10) || 6);

(async () => {
  console.log('正在取得憑證並讀取 Firestore（章節 + 事件子集合，較慢請稍候）...');
  const token = await getAccessToken();
  const users = await allUsers(token);
  const uids = users.map(u => u.localId);

  const reg = {}, comp = {}, refl = {}, read = {}, active = {}, ev = {}, evActive = {};
  users.forEach(u => {
    const ms = Number(u.createdAt); if (!ms) return;
    const wk = weekKey(new Date(ms).toISOString().slice(0, 10));
    reg[wk] = (reg[wk] || 0) + 1;
  });

  const BATCH = 12;
  for (let i = 0; i < uids.length; i += BATCH) {
    await Promise.all(uids.slice(i, i + BATCH).map(async uid => {
      const chs = await fetchCol(token, `users/${uid}/chapters`).catch(() => []);
      chs.forEach(c => {
        const x = parse(c); if (!x.date) return;
        const wk = weekKey(x.date);
        comp[wk] = (comp[wk] || 0) + 1;
        if (x.hasReflection) refl[wk] = (refl[wk] || 0) + 1;
        if (x.hasRead) read[wk] = (read[wk] || 0) + 1;
        (active[wk] = active[wk] || new Set()).add(uid);
      });
      const evs = await fetchCol(token, `users/${uid}/events`).catch(() => []);
      evs.forEach(e => {
        const x = parse(e); if (!x.ts) return;
        const wk = weekKey(x.ts.slice(0, 10));
        (ev[wk] = ev[wk] || {}); ev[wk][x.type] = (ev[wk][x.type] || 0) + 1;
        (evActive[wk] = evActive[wk] || new Set()).add(uid);
      });
    }));
  }

  const weeks = [...new Set([...Object.keys(comp), ...Object.keys(reg), ...Object.keys(ev)])].sort().slice(-WEEKS);
  const p = (n, d) => d ? Math.round(n / d * 100) : 0;

  console.log(`\n## 週別趨勢表（最近 ${WEEKS} 週，週日~週六）\n`);
  console.log('| 週別 | 新註冊 | 章節完成 | 默想率 | 閱讀勳章領取率 | 活躍玩家¹ | 有事件玩家² |');
  console.log('|---|---|---|---|---|---|---|');
  weeks.forEach(w => {
    const c = comp[w] || 0;
    const a = active[w] ? active[w].size : 0, ea = evActive[w] ? evActive[w].size : 0;
    console.log(`| ${weekLabel(w)} | ${reg[w] || 0} | ${c} | ${p(refl[w] || 0, c)}% | ${p(read[w] || 0, c)}% | ${a} | ${ea || '—'} |`);
  });
  console.log('\n¹ Firestore 嚴格活躍（該週有完成章節的 unique 玩家）　² B1 事件流（5/24 起，之前無）');

  console.log('\n## 事件流核心動作（僅 5/24 後有資料）\n');
  console.log('| 週別 | app_open | 選章 | 確認選項 | 送默想 | 完成 | 分享 |');
  console.log('|---|---|---|---|---|---|---|');
  weeks.forEach(w => {
    const e = ev[w]; if (!e) return;
    const g = t => e[t] || 0;
    console.log(`| ${weekLabel(w)} | ${g('app_open')} | ${g('chapter_select')} | ${g('choice_confirm')} | ${g('submit_reflection')} | ${g('complete_devotional')} | ${g('share')} |`);
  });
  console.log('\n（最後一週若未滿 7 天為進行中，樣本不足不做趨勢比較）');
})().catch(e => { console.error(e); process.exit(1); });
