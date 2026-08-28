// scripts/funnel.js
// 靈修主流程漏斗（B1 事件流）：按週看 選章 → 看題 → 確認選項 → 送默想 → 完成 各段掉多少人，
// 加上：掉最多的章節、閱讀勳章來源（bible_com vs already，8/23 已讀按鈕改版後口徑追蹤）、終點儀式曝光、各段停留中位數。
// 用法：npm run funnel [週數，預設 6]
// 資料源：users/{uid}/events（5/24 起，訪客不記）。重用 _shared.js 的 Firebase CLI token。
const { PROJECT, getAccessToken } = require('./_shared.js');
const FB = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const WEEKS = Number(process.argv[2]) || 6;
const STAGES = ['chapter_select', 'question_view', 'choice_confirm', 'submit_reflection', 'complete_devotional'];
const STAGE_LABEL = { chapter_select: '選章', question_view: '看題', choice_confirm: '確認', submit_reflection: '送默想', complete_devotional: '完成' };

function pv(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.mapValue) { const o = {}; for (const [k, m] of Object.entries(v.mapValue.fields || {})) o[k] = pv(m); return o; }
  if (v.arrayValue) return (v.arrayValue.values || []).map(pv);
  return null;
}
function parse(d) { const o = {}; for (const [k, v] of Object.entries(d.fields || {})) o[k] = pv(v); return o; }
async function fetchCol(token, col) {
  const docs = []; let pt = '';
  while (true) {
    const res = await fetch(`${FB}/${col}?pageSize=300${pt ? '&pageToken=' + pt : ''}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    if (body.documents) docs.push(...body.documents);
    if (body.nextPageToken) pt = body.nextPageToken; else break;
  }
  return docs;
}
async function allUids(token) {
  const uids = []; let pt = '';
  while (true) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchGet?maxResults=500${pt ? '&nextPageToken=' + pt : ''}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    if (body.users) uids.push(...body.users.map(u => u.localId));
    if (body.nextPageToken) pt = body.nextPageToken; else break;
  }
  return uids;
}
// 台北時間日期（事件 ts 是 UTC）
function tpeDate(ts) { return new Date(new Date(ts).getTime() + 8 * 3600e3).toISOString().slice(0, 10); }
function weekKey(dateStr) { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); }
function weekLabel(w) { const e = new Date(w + 'T00:00:00Z'); e.setUTCDate(e.getUTCDate() + 6); return `${w.slice(5)}~${e.toISOString().slice(5, 10)}`; }
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

  // ── 7. 其他次要事件週計數 ──
  const SEC = ['read_chapter', 'share', 'diary_open', 'equipment_change', 'submit_feedback', 'achievement_review'];
  console.log(`\n## 次要事件週計數\n\n| 週別 | ${SEC.join(' | ')} |\n|---|${SEC.map(() => '---').join('|')}|`);
  for (const wk of weeks) console.log(`| ${weekLabel(wk)} | ${SEC.map(s => inWin.filter(e => e.wk === wk && e.type === s).length).join(' | ')} |`);
})().catch(e => { console.error(e); process.exit(1); });
