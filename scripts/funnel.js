// scripts/funnel.js
// 靈修主流程漏斗（B1 事件流）：按週看 選章 → 看題 → 確認選項 → 送默想 → 完成 各段掉多少人，
// 加上：掉最多的章節、閱讀來源（bible_com vs already）、閱讀率兩條線（外連／自述已讀，8/29 起）、devotionHabit 交叉、終點儀式曝光、各段停留中位數、events vs chapters 口徑守門。
// 用法：npm run funnel [週數，預設 6]
// 資料源：users/{uid}/events（5/24 起，訪客不記）。重用 _shared.js 的 Firebase CLI token。
const { getAccessToken, FIRESTORE_BASE: FB, parseDoc: parse, fetchCollection: fetchCol, fetchAllUsers, weekKey, weekLabel } = require('./_shared.js');
const WEEKS = Number(process.argv[2]) || 6;
const STAGES = ['chapter_select', 'question_view', 'choice_confirm', 'submit_reflection', 'complete_devotional'];
const STAGE_LABEL = { chapter_select: '選章', question_view: '看題', choice_confirm: '確認', submit_reflection: '送默想', complete_devotional: '完成' };

async function allUids(token) { return (await fetchAllUsers(token)).map(u => u.localId); }
// 台北時間日期（事件 ts 是 UTC）
function tpeDate(ts) { return new Date(new Date(ts).getTime() + 8 * 3600e3).toISOString().slice(0, 10); }
function median(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
const pct = (n, d) => d ? Math.round(n / d * 100) + '%' : '—';

(async () => {
  console.log('正在讀取所有玩家事件子集合（較慢請稍候）...');
  const token = await getAccessToken();
  const uids = await allUids(token);
  const all = []; // {uid, type, ts, date, wk, chapter, meta}
  const BATCH = 12;
  for (let i = 0; i < uids.length; i += BATCH) {
    await Promise.all(uids.slice(i, i + BATCH).map(async uid => {
      const evs = await fetchCol(token, `users/${uid}/events`).catch(() => []);
      evs.forEach(e => { const x = parse(e); if (!x.ts || !x.type) return; const date = tpeDate(x.ts); all.push({ uid, type: x.type, ts: x.ts, date, wk: weekKey(date), chapter: x.chapter, meta: x.metadata || {} }); });
    }));
  }
  const weeks = [...new Set(all.map(e => e.wk))].sort().slice(-WEEKS);
  const inWin = all.filter(e => weeks.includes(e.wk));

  // ── 1. 週別漏斗（人）：該週在該階段至少有一次事件的 unique 玩家 ──
  console.log(`\n## 週別漏斗 · 人數（最近 ${WEEKS} 週，週日~週六）\n`);
  console.log('| 週別 | ' + STAGES.map(s => STAGE_LABEL[s]).join(' | ') + ' | 選章→完成 |');
  console.log('|---|' + STAGES.map(() => '---').join('|') + '|---|');
  for (const wk of weeks) {
    const c = STAGES.map(s => new Set(inWin.filter(e => e.wk === wk && e.type === s).map(e => e.uid)).size);
    console.log(`| ${weekLabel(wk)} | ${c.join(' | ')} | ${pct(c[4], c[0])} |`);
  }
  // ── 2. 週別漏斗（人×章）：以 uid+chapter 去重，看每個「開了的章」走到哪 ──
  console.log(`\n## 週別漏斗 · 人×章（同一玩家同一章只算一次）\n`);
  console.log('| 週別 | ' + STAGES.map(s => STAGE_LABEL[s]).join(' | ') + ' | 看題→確認 | 確認→送默想 | 確認→完成 |');
  console.log('|---|' + STAGES.map(() => '---').join('|') + '|---|---|---|');
  for (const wk of weeks) {
    const c = STAGES.map(s => new Set(inWin.filter(e => e.wk === wk && e.type === s && e.chapter).map(e => e.uid + '|' + e.chapter)).size);
    console.log(`| ${weekLabel(wk)} | ${c.join(' | ')} | ${pct(c[2], c[1])} | ${pct(c[3], c[2])} | ${pct(c[4], c[2])} |`);
  }
  console.log('※ 「看題→確認」低 = 看了情境題沒選（乏味／猶豫）；「確認→完成」低 = 選了卻沒領裝備（流程斷或關頁）。');

  // ── 3. 掉最多的章節（看題但沒完成，全窗口） ──
  const byCh = {};
  inWin.filter(e => e.chapter).forEach(e => { const k = e.chapter; byCh[k] = byCh[k] || { view: new Set(), done: new Set() }; if (e.type === 'question_view') byCh[k].view.add(e.uid); if (e.type === 'complete_devotional') byCh[k].done.add(e.uid); });
  const drops = Object.entries(byCh).map(([ch, v]) => ({ ch, view: v.view.size, done: v.done.size, drop: [...v.view].filter(u => !v.done.has(u)).length })).filter(x => x.view >= 3).sort((a, b) => b.drop - a.drop || a.done / a.view - b.done / b.view).slice(0, 8);
  console.log(`\n## 掉人最多的章節（窗口內，看題 ≥3 人）\n\n| 章節 | 看題 | 完成 | 看了沒完成 |\n|---|---|---|---|`);
  drops.forEach(x => console.log(`| ${x.ch} | ${x.view} | ${x.done} | ${x.drop} |`));

  // ── 4. 閱讀勳章來源（口徑追蹤：already 按鈕 8/23 上線） ──
  console.log(`\n## 閱讀勳章來源（read_chapter.source）\n\n| 週別 | bible_com | already | 其他 | already 佔比 |\n|---|---|---|---|---|`);
  for (const wk of weeks) {
    const r = inWin.filter(e => e.wk === wk && e.type === 'read_chapter');
    const a = r.filter(e => e.meta.source === 'already').length, b = r.filter(e => !e.meta.source || e.meta.source === 'bible_com').length, o = r.length - a - b;
    console.log(`| ${weekLabel(wk)} | ${b} | ${a} | ${o} | ${pct(a, r.length)} |`);
  }
  console.log('※ 閱讀率若下滑但 already 佔比上升，代表指標語意變了（領勳章 ≠ 有讀），不是玩家少讀。');

  // ── 4b. 閱讀率拆兩條線（2026-08-29 起）：分母＝該週完成靈修的人；外連＝有 bible_com 的人、自述＝有 already 的人 ──
  // 兩條線各自可比，不再混成一個「閱讀勳章率」；already 上升不代表少讀，只是自述取代外連。
  const doneBy = {}, srcBy = {};
  for (const wk of weeks) {
    doneBy[wk] = new Set(inWin.filter(e => e.wk === wk && e.type === 'complete_devotional').map(e => e.uid));
    srcBy[wk] = { bible_com: new Set(), already: new Set() };
    inWin.filter(e => e.wk === wk && e.type === 'read_chapter').forEach(e => {
      const k = (!e.meta.source || e.meta.source === 'bible_com') ? 'bible_com' : e.meta.source === 'already' ? 'already' : null;
      if (k && doneBy[wk].has(e.uid)) srcBy[wk][k].add(e.uid);
    });
  }
  console.log(`\n## 閱讀率兩條線（分母＝該週完成靈修人數）\n\n| 週別 | 完成人 | 外連 bible_com | 自述已讀 already | 任一 |\n|---|---|---|---|---|`);
  for (const wk of weeks) {
    const d = doneBy[wk].size, b = srcBy[wk].bible_com.size, a = srcBy[wk].already.size, u = new Set([...srcBy[wk].bible_com, ...srcBy[wk].already]).size;
    console.log(`| ${weekLabel(wk)} | ${d} | ${b}（${pct(b, d)}） | ${a}（${pct(a, d)}） | ${u}（${pct(u, d)}） |`);
  }

  // ── 4c. devotionHabit 交叉（profile/data，E1 分眾；只拉窗口內有完成的人）──
  const HABIT = { stable: '穩定每天', intermittent: '斷續', beginner: '新手摸索', starting: '想開始' };
  const doneUids = [...new Set(weeks.flatMap(wk => [...doneBy[wk]]))];
  const habit = {};
  for (let i = 0; i < doneUids.length; i += BATCH) {
    await Promise.all(doneUids.slice(i, i + BATCH).map(async uid => {
      const r = await fetch(`${FB}/users/${uid}/profile/data`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({}));
      habit[uid] = r.fields ? (parse(r).devotionHabit || '') : '';
    }));
  }
  console.log(`\n## 靈修習慣 × 閱讀來源（窗口 ${WEEKS} 週合計，人×週）\n\n| 自述習慣 | 人 | 完成人×週 | 外連 | 自述已讀 |\n|---|---|---|---|---|`);
  for (const h of [...Object.keys(HABIT), '']) {
    const us = doneUids.filter(u => (habit[u] || '') === h); if (!us.length) continue;
    let pw = 0, bw = 0, aw = 0;
    for (const wk of weeks) us.forEach(u => { if (doneBy[wk].has(u)) { pw++; if (srcBy[wk].bible_com.has(u)) bw++; if (srcBy[wk].already.has(u)) aw++; } });
    console.log(`| ${HABIT[h] || '未填'} | ${us.length} | ${pw} | ${bw}（${pct(bw, pw)}） | ${aw}（${pct(aw, pw)}） |`);
  }

  // ── 5. 各段停留（elapsedSec 自 chapter_select 起算，僅新版事件有） ──
  const el = {}; STAGES.slice(1).forEach(s => el[s] = inWin.filter(e => e.type === s && e.meta.elapsedSec != null).map(e => e.meta.elapsedSec));
  const has = Object.values(el).some(a => a.length);
  console.log(`\n## 各段停留中位數（自選章起算，秒；${has ? '' : '尚無資料——elapsedSec 埋點上線後才有'}）\n`);
  if (has) { console.log('| 階段 | 樣本 | 中位秒 |\n|---|---|---|'); STAGES.slice(1).forEach(s => console.log(`| ${STAGE_LABEL[s]} | ${el[s].length} | ${median(el[s]) ?? '—'} |`)); }

  // ── 6. 終點儀式 ──
  const fv = all.filter(e => e.type === 'finale_view'), fc = all.filter(e => e.type === 'finale_close');
  console.log(`\n## 終點儀式（finale_view / finale_close）\n`);
  if (!fv.length) console.log('尚無 finale_view 事件（埋點上線前上線的儀式看不到曝光）。');
  else console.log(`曝光 ${fv.length} 人次（${new Set(fv.map(e => e.uid)).size} 人），有個人段 ${fv.filter(e => e.meta.hasPersonal).length}；關閉 ${fc.length}，停留中位 ${median(fc.map(e => e.meta.dwellSec).filter(x => x != null)) ?? '—'} 秒。`);

  // ── 6b. 新功能觸及（2026-08-30 埋點；PR ①②③ 與說明頁 #53）──
  console.log(`\n## 新功能觸及（2026-08-30 起才有埋點）\n`);
  const cnt = t => { const es = inWin.filter(e => e.type === t); return `${es.length} 次／${new Set(es.map(e => e.uid)).size} 人`; };
  const dwell = t => { const a = inWin.filter(e => e.type === t).map(e => e.meta.dwellSec).filter(x => x != null); return a.length ? `中位停留 ${median(a)} 秒` : '—'; };
  const fx = inWin.filter(e => e.type === 'focus_exit');
  console.log(`- 焦點模式：進入 ${cnt('focus_enter')}；退出 ${fx.length} 次，其中在焦點內完成 ${fx.filter(e => e.meta.completed).length}，${dwell('focus_exit')}`);
  console.log(`- 領獎畫面（原完成短畫面已併入）：${cnt('reward_view')}，${dwell('reward_close')}；稱號解鎖 ${cnt('title_unlocked')}`);
  const ps = inWin.filter(e => e.type === 'page_switch' && e.meta.page === 'books');
  console.log(`- 📚 書卷與成就分頁：切入 ${ps.length} 次／${new Set(ps.map(e => e.uid)).size} 人；書卷詳情頁開啟 ${cnt('book_detail_open')}`);
  const to = inWin.filter(e => e.type === 'tutorial_open'), tc = inWin.filter(e => e.type === 'tutorial_close');
  const src = {}; to.forEach(e => { src[e.meta.source] = (src[e.meta.source] || 0) + 1; });
  console.log(`- 說明頁：開啟 ${to.length} 次／${new Set(to.map(e => e.uid)).size} 人（來源 ${JSON.stringify(src)}）；關閉 ${tc.length}，勾不再顯示 ${tc.filter(e => e.meta.noRepeat).length}，${dwell('tutorial_close')}`);
  const ai = inWin.filter(e => e.type === 'ai_response_received' && e.meta.withEquipment != null);
  console.log(`- AI 看裝備：有裝備上下文 ${ai.filter(e => e.meta.withEquipment).length}／${ai.length} 次`);
  const ge = inWin.filter(e => e.type === 'guide_expand');
  console.log(`- 導讀展開：${ge.length} 次／${new Set(ge.map(e => e.uid)).size} 人（其中有難處區塊 ${ge.filter(e => e.meta.hasHard).length}）`);
  const ms = inWin.filter(e => e.type === 'chapter_select' && e.meta.merged);
  console.log(`- 合併日選章：${ms.length} 次（先讀第 1 章 ${ms.filter(e => e.meta.order === 1).length}、第 2 章 ${ms.filter(e => e.meta.order === 2).length}）`);
  const lv = inWin.filter(e => e.type === 'app_leave' && e.meta.lastStep); const ls = {}; lv.forEach(e => { ls[e.meta.lastStep] = (ls[e.meta.lastStep] || 0) + 1; });
  console.log(`- 中途離開點（app_leave.lastStep）：${JSON.stringify(ls)}`);
  const lg = inWin.filter(e => e.type === 'login' && e.meta.trigger); const lt = {}; lg.forEach(e => { lt[e.meta.trigger] = (lt[e.meta.trigger] || 0) + 1; });
  console.log(`- 登入入口（login.trigger）：${JSON.stringify(lt)}`);

  // ── 7. 其他次要事件週計數 ──
  const SEC = ['read_chapter', 'share', 'diary_open', 'equipment_change', 'submit_feedback', 'achievement_review'];
  console.log(`\n## 次要事件週計數\n\n| 週別 | ${SEC.join(' | ')} |\n|---|${SEC.map(() => '---').join('|')}|`);
  for (const wk of weeks) console.log(`| ${weekLabel(wk)} | ${SEC.map(s => inWin.filter(e => e.wk === wk && e.type === s).length).join(' | ')} |`);

  // ── 8. 口徑守門：最近一週 events 的「完成」名單 vs chapters 集合（npm run core 的口徑）──
  // 2026-08-29 data-analyst 發現觸發儀式的人不在核心句名單裡，兩邊口徑要對得上才能一起讀。
  const lastWk = weeks[weeks.length - 1];
  const evSet = doneBy[lastWk] || new Set();
  const chSet = new Set();
  for (let i = 0; i < uids.length; i += BATCH) {
    await Promise.all(uids.slice(i, i + BATCH).map(async uid => {
      const chs = await fetchCol(token, `users/${uid}/chapters`).catch(() => []);
      if (chs.some(c => { const x = parse(c); return x.date && weekKey(x.date) === lastWk; })) chSet.add(uid);
    }));
  }
  const onlyEv = [...evSet].filter(u => !chSet.has(u)), onlyCh = [...chSet].filter(u => !evSet.has(u));
  console.log(`
## 口徑守門（${weekLabel(lastWk)}）：events 完成 ${evSet.size} 人 vs chapters 完成 ${chSet.size} 人
`);
  console.log(`只在 events：${onlyEv.length}${onlyEv.length ? '（' + onlyEv.map(u => u.slice(0, 8)).join(', ') + '）' : ''}；只在 chapters：${onlyCh.length}${onlyCh.length ? '（' + onlyCh.map(u => u.slice(0, 8)).join(', ') + '）' : ''}`);
  if (onlyEv.length || onlyCh.length) console.log('※ 不一致原因候選：chapters.date 是玩家裝置日期、events.ts 是伺服器 UTC 轉台北；補讀舊章節 chapters.date 記的是「章節日」而非完成日；訪客期完成後登入。');
})().catch(e => { console.error(e); process.exit(1); });
