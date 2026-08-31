// scripts/core-metric.js
// 核心指標（2026-08-24 拍板，取代「北極星」一詞；2026-08-27 改雙層）：
//   主句   ──「本週有幾個人完成靈修」（任一章即算，人數＋人名清單）
//   守門 0 ──「其中幾人寫默想」（雙層第二層）
//   守門 1 ── 默想平均字數不掉（只算長度，絕不輸出默想內容——默想是悄悄話）
//   守門 2 ── 連續 4 週未出現的人名（之前 8 週有靈修、最近 4 週消失 = 新流失警示）
//   標記   ── 曾完成 100+ 章者在人名旁標 ⭐100+（只標示不召回，召回牌只打一次）
// 看月趨勢＋人名清單。研究依據：docs/research-north-star-metric.md
// 用法：npm run core
// 資料源：Firebase Auth（displayName）+ Firestore users/{uid}/chapters（date / hasReflection / reflectionText）

// Firestore value 解析／週鍵（週日起算）皆用 _shared.js 正本（口徑守門）
const { getAccessToken, parseDoc: parse, fetchCollection: fetchCol, fetchAllUsers: allUsers, weekKey, weekLabel } = require('./_shared.js');

function addWeeks(w, n) {
  const d = new Date(w + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

(async () => {
  console.log('正在取得憑證並讀取 Firestore（逐玩家章節，較慢請稍候）...');
  const token = await getAccessToken();
  const users = await allUsers(token);
  const name = {}; users.forEach(u => { name[u.localId] = u.displayName || `（未命名 ${u.localId.slice(0, 6)}）`; });
  const uids = users.map(u => u.localId);

  // wkCore[週]=完成＋默想的玩家、wkAny[週]=有完成的玩家、wkLen[週]=默想字數統計
  const wkCore = {}, wkAny = {}, wkLen = {}, lastSeen = {}, chapterTotal = {};

  const BATCH = 12;
  for (let i = 0; i < uids.length; i += BATCH) {
    await Promise.all(uids.slice(i, i + BATCH).map(async uid => {
      const chs = await fetchCol(token, `users/${uid}/chapters`).catch(() => []);
      chs.forEach(c => {
        const x = parse(c); if (!x.date) return;
        const wk = weekKey(x.date);
        (wkAny[wk] = wkAny[wk] || new Set()).add(uid);
        chapterTotal[uid] = (chapterTotal[uid] || 0) + 1;
        if (!lastSeen[uid] || x.date > lastSeen[uid]) lastSeen[uid] = x.date;
        if (x.hasReflection) {
          (wkCore[wk] = wkCore[wk] || new Set()).add(uid);
          const len = (x.reflectionText || '').replace(/\s/g, '').length;
          if (len > 0) { const b = (wkLen[wk] = wkLen[wk] || { sum: 0, n: 0 }); b.sum += len; b.n += 1; }
        }
      });
    }));
  }

  const thisWeek = weekKey(new Date().toISOString().slice(0, 10));
  const weeks = [...new Set([...Object.keys(wkAny)])].sort();

  const tag = u => `${name[u]}${(chapterTotal[u] || 0) >= 100 ? ' ⭐100+' : ''}`;

  // ── 核心句（雙層）──
  const anyNow = wkAny[thisWeek] || new Set();
  const coreNow = wkCore[thisWeek] || new Set();
  console.log(`\n# 核心指標（產出於 ${new Date().toISOString().slice(0, 10)}）\n`);
  console.log(`## 主句：本週（${weekLabel(thisWeek)}，進行中）有 **${anyNow.size} 人**完成靈修（任一章即算）`);
  console.log(`## 守門：其中 **${coreNow.size} 人**寫下默想\n`);
  if (anyNow.size) console.log([...anyNow].map(u => `- ${tag(u)}${coreNow.has(u) ? '　✍️ 有默想' : ''}`).sort().join('\n'));
  const hundred = uids.filter(u => (chapterTotal[u] || 0) >= 100).sort((a, b) => chapterTotal[b] - chapterTotal[a]);
  console.log(`\n（⭐100+ 標記＝曾完成 100 章以上，共 ${hundred.length} 人：${hundred.map(u => `${name[u]} ${chapterTotal[u]}`).join('、') || '無'}；只標示不召回）`);

  // ── 週別明細（最近 8 週）──
  const recent8 = weeks.filter(w => w <= thisWeek).slice(-8);
  console.log(`\n## 週別明細（最近 8 週）\n`);
  console.log('| 週別 | 完成靈修人數¹（主句） | 其中寫默想² | 默想平均字數（守門1） |');
  console.log('|---|---|---|---|');
  recent8.forEach(w => {
    const c = wkCore[w] ? wkCore[w].size : 0;
    const a = wkAny[w] ? wkAny[w].size : 0;
    const L = wkLen[w]; const avg = L && L.n ? Math.round(L.sum / L.n) : '—';
    console.log(`| ${weekLabel(w)}${w === thisWeek ? '（進行中）' : ''} | ${a} | ${c} | ${avg} |`);
  });
  console.log('\n¹ 完成任一章的 unique 玩家（含沒寫默想）　² 其中有寫默想的 unique 玩家');

  // ── 月趨勢 ──
  const moCore = {}, moAny = {}, moLen = {};
  weeks.forEach(w => {
    const mo = w.slice(0, 7);
    (moCore[mo] = moCore[mo] || new Set());
    (moAny[mo] = moAny[mo] || new Set());
    if (wkAny[w]) wkAny[w].forEach(u => moAny[mo].add(u));
    if (wkCore[w]) wkCore[w].forEach(u => moCore[mo].add(u));
    if (wkLen[w]) { const b = (moLen[mo] = moLen[mo] || { sum: 0, n: 0 }); b.sum += wkLen[w].sum; b.n += wkLen[w].n; }
  });
  const months = Object.keys(moCore).sort().slice(-6);
  console.log(`\n## 月趨勢（最近 6 個月）\n`);
  console.log('| 月份 | 完成靈修人數（該月≥1章） | 其中寫默想 | 默想平均字數 |');
  console.log('|---|---|---|---|');
  months.forEach(mo => {
    const L = moLen[mo]; const avg = L && L.n ? Math.round(L.sum / L.n) : '—';
    console.log(`| ${mo} | ${moAny[mo].size} | ${moCore[mo].size} | ${avg} |`);
  });

  // ── 守門 2：連續 4 週未出現 ──
  // 口徑：最近 4 週（含本週）完全沒完成章節，但再往前 8 週內曾有靈修 → 新流失警示
  const w4 = addWeeks(thisWeek, -3);
  const w12 = addWeeks(thisWeek, -11);
  const recentActive = new Set(), priorActive = new Set();
  weeks.forEach(w => {
    if (w >= w4 && wkAny[w]) wkAny[w].forEach(u => recentActive.add(u));
    else if (w >= w12 && w < w4 && wkAny[w]) wkAny[w].forEach(u => priorActive.add(u));
  });
  const gone = [...priorActive].filter(u => !recentActive.has(u))
    .sort((a, b) => (lastSeen[b] || '').localeCompare(lastSeen[a] || ''));
  console.log(`\n## 守門 2：連續 4 週未出現（之前 8 週內有靈修）── ${gone.length} 人\n`);
  if (gone.length) {
    console.log('| 玩家 | 最後靈修日 | 累計完成章數 |');
    console.log('|---|---|---|');
    gone.forEach(u => console.log(`| ${tag(u)} | ${lastSeen[u]} | ${chapterTotal[u] || 0} |`));
  } else {
    console.log('（無——最近活躍的人都還在）');
  }
  console.log('\n（守門 2 只列「新消失」的人；更早流失的 ~100 人依 2026-08 對焦不在此清單）');
})().catch(e => { console.error(e); process.exit(1); });
