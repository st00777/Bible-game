#!/usr/bin/env node
// 和合本逐節自動比對（產製期工具，不進遊戲 runtime）
//
// 把 content.js 裡三處經文引文（verse／baseItem.desc／bonusItem.desc）
// 逐節對回 bible-api.com 的和合本（cuv，神版、舊字形），輸出四類報告：
//   ✔ 一致          文字與標點都對得上
//   ⚠ 標點差異      文字一致、只有標點不同（不算錯，單獨列出）
//   ❓ 疑似版本差異  舊版對不上，但回查正本 CUNP1 逐字一致（新標點和合本改字：
//                   麼→嗎、作→做、那裡→哪裡、流便→呂便…），不判錯
//   ✖ 文字差異      兩個來源都對不上、或出處（verseRef）標錯 → exit 1
//
// 正本仍是 hkbs CUNP1（npm run verify:scripture）；本腳本是第二道自動比對。
// 只有對不上舊版的引文才會回查 CUNP1（也有快取），一致就標「疑似版本差異」，
// 交人判斷，不自動改 content.js。加 --no-cunp1 可關掉回查，改用字形對照表判斷。
//
// 用法：
//   npm run verify:cuv -- GEN 25-36        書卷代碼＋章範圍
//   npm run verify:cuv -- GEN 25           單章
//   npm run verify:cuv -- GEN25 COR1_5 12  直接給 content.js 章節 key（使徒行傳用數字）
//   加 --quiet 只列非一致項；加 --refresh 忽略快取重抓；加 --no-cunp1 不回查正本
//
// 快取：.cache/bible-api/cuv/{BOOK}/{chapter}.json、.cache/hkbs-cunp1/{BOOK}/{chapter}.txt
//      （.cache/ 已加 .gitignore），同一章不重打 API。
//
// 比對規則：
//   1. 兩邊先套專案正規化：裏→裡、着→著（舊字形，不算差異）；去掉〔原文作…〕譯註。
//   2. 引文是節選，頭尾的標點不比；中間的標點才比。內外引號層級（『』vs「」）不算差異。
//   3. 代名詞「他／她／它」一律不改，照原文比。

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.cache', 'bible-api', 'cuv');
const CUNP1_CACHE_DIR = path.join(ROOT, '.cache', 'hkbs-cunp1');
const API = 'https://bible-api.com/data/cuv';
const CUNP1 = 'https://rcuv.hkbs.org.hk/CUNP1';

// content.js 章節 key 前綴 → bible-api 書卷代碼（新書卷上線時在此補一行）
const BOOK_CODES = {
  GEN: 'GEN', EXO: 'EXO', ACT: 'ACT', ROM: 'ROM',
  COR1: '1CO', COR2: '2CO', GAL: 'GAL', EPH: 'EPH', PHP: 'PHP', COL: 'COL',
  TH1: '1TH', TH2: '2TH', TIM1: '1TI', TIM2: '2TI', TIT: 'TIT', PHM: 'PHM',
  HEB: 'HEB', JAS: 'JAS', PE1: '1PE', PE2: '2PE',
  JN1: '1JN', JN2: '2JN', JN3: '3JN', JUD: 'JUD', REV: 'REV',
};
// 帶底線的 key（COR1_5）
const UNDERSCORE_PREFIXES = new Set(['COR1', 'COR2', 'TH1', 'TH2', 'TIM1', 'TIM2', 'PE1', 'PE2', 'JN1', 'JN2', 'JN3']);

// 已知新舊版對照（只在 --no-cunp1 時使用：差異全落在這裡 → 疑似版本差異）。
// 注意：甚麼／什麼不在表內——經文引用規定用「甚麼」，寫成「什麼」是真的錯。
const VARIANT_PAIRS = [
  ['麼', '嗎'], ['作', '做'], ['那', '哪'], ['呂', '流'],            // 新標點和合本改字（2026-09-06 創 25-36 基準實測）
  ['纔', '才'], ['徧', '遍'], ['牀', '床'], ['唸', '念'], ['佔', '占'], ['週', '周'],
  ['於', '于'], ['儘', '盡'], ['蹟', '跡'], ['慾', '欲'], ['讚', '贊'], ['讎', '仇'],
  ['喫', '吃'], ['羣', '群'], ['卻', '却'], ['妳', '你'], ['祢', '你'], ['祂', '他'],
];
const VARIANT_SET = new Set(VARIANT_PAIRS.flatMap(([a, b]) => [a + b, b + a]));

// ---------- 章節 key 解析 ----------
function parseKey(key) {
  const k = String(key);
  if (/^\d+$/.test(k)) return { prefix: 'ACT', code: 'ACT', ch: Number(k) };
  if (k.includes('_')) {
    const [pfx, ch] = k.split('_');
    return { prefix: pfx, code: BOOK_CODES[pfx], ch: Number(ch) };
  }
  const m = k.match(/^([A-Z]+?)(\d+)$/);
  if (m) return { prefix: m[1], code: BOOK_CODES[m[1]], ch: Number(m[2]) };
  return null;
}
function buildKey(prefix, ch) {
  if (prefix === 'ACT') return String(ch);
  if (UNDERSCORE_PREFIXES.has(prefix)) return `${prefix}_${ch}`;
  return `${prefix}${ch}`;
}
const CHAPTER_KEY = /^[A-Z]+\d+(_\d+)?$/;   // GEN25 / COR1_5 這型的 content.js key
// 把 CLI 參數展開成章節 key 清單：「GEN 25-36」「GEN 25」「GEN25 GEN26」都吃
function expandArgs(args) {
  const keys = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const nxt = args[i + 1];
    const apiToPrefix = Object.fromEntries(Object.entries(BOOK_CODES).map(([p, c]) => [c, p]));
    const prefix = BOOK_CODES[a] ? a : apiToPrefix[a];
    if (!prefix && /^[A-Z0-9]{2,4}$/.test(a) && !/^\d+$/.test(a) && !CHAPTER_KEY.test(a)) {
      console.error(`✖ 不認得書卷代碼 ${a}（BOOK_CODES 缺這卷？可用：${Object.keys(BOOK_CODES).join(' ')}）`);
      process.exit(2);
    }
    if (prefix && nxt && /^\d+(-\d+)?$/.test(nxt)) {
      const [lo, hi] = nxt.split('-').map(Number);
      for (let c = lo; c <= (hi ?? lo); c++) keys.push(buildKey(prefix, c));
      i++;
    } else {
      keys.push(a);
    }
  }
  return keys;
}

// ---------- 來源抓取（含快取） ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastFetchAt = 0;
async function fetchChapter(code, ch, refresh) {
  const file = path.join(CACHE_DIR, code, `${ch}.json`);
  if (!refresh && fs.existsSync(file)) {
    return { verses: JSON.parse(fs.readFileSync(file, 'utf8')).verses, cached: true };
  }
  const wait = 400 - (Date.now() - lastFetchAt);           // 對外 API 客氣一點
  if (wait > 0) await sleep(wait);
  const url = `${API}/${code}/${ch}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  lastFetchAt = Date.now();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const data = await res.json();
  if (data?.translation?.identifier !== 'cuv' || !Array.isArray(data.verses) || !data.verses.length) {
    throw new Error(`回應不是 cuv 章節資料: ${url}`);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ fetchedAt: new Date().toISOString(), url, verses: data.verses }, null, 0));
  return { verses: data.verses, cached: false };
}

// 正本 CUNP1（與 scripts/verify-scripture.js 同一套判準：頁面要有 CUNP1 標記，HTTP 200 不算數）
async function fetchCunp1(code, ch, refresh) {
  const file = path.join(CUNP1_CACHE_DIR, code, `${ch}.txt`);
  if (!refresh && fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const wait = 400 - (Date.now() - lastFetchAt);
  if (wait > 0) await sleep(wait);
  const url = `${CUNP1}/${code}/${ch}/`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  lastFetchAt = Date.now();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const html = await res.text();
  if (!html.includes('CUNP1') || !html.includes('新標點和合本')) throw new Error(`頁面缺 CUNP1 標記（HTTP 200 不算數）: ${url}`);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return text;
}

// ---------- 正規化與比對 ----------
const PUNCT = /[\s「」『』“”‘’,.;:!?()，。；：、！？（）—－…‧·—～~\-"']/g;
const PUNCT_ONE = new RegExp(PUNCT.source);                        // 單字元判斷用（非 global，避免 lastIndex 狀態）
const isPunct = ch => PUNCT_ONE.test(ch);
const norm = t => String(t || '')
  .replace(/裏/g, '裡').replace(/着/g, '著')
  .replace(/〔[^〕]*〕/g, '');                                  // 譯註
const core = t => norm(t).replace(PUNCT, '').replace(/\d+/g, '');
// 引號層級統一：『』→「」；比標點時用
const punctSeq = t => (t.match(/[「」『』，。；：、！？（）—…]/g) || []).map(p => p.replace('『', '「').replace('』', '」')).join('');

// 內容引文去外層引號、去頭尾標點（節選不比邊界標點）
function stripQuote(q) {
  let s = norm(q).trim();
  s = s.replace(/^「/, '').replace(/」$/, '');
  return s.replace(/^[\s「」『』，。；：、！？（）—…]+/, '').replace(/[\s「」『』，。；：、！？（）—…]+$/, '');
}

// 把整章拼成 core 字串，並記下每個 core 字元來自第幾節、原文第幾個位置
function buildChapterIndex(verses) {
  const chars = [];          // core 字元
  const at = [];             // 每個 core 字元 → { v, i }（節號、該節正規化後文字的位置）
  const texts = {};          // 節號 → 正規化後原文（含標點）
  for (const vs of verses) {
    const t = norm(vs.text);
    texts[vs.verse] = t;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (isPunct(ch) || /\d/.test(ch)) continue;
      chars.push(ch);
      at.push({ v: vs.verse, i });
    }
  }
  return { core: chars.join(''), at, texts };
}

// 取來源在 [start, end] core 範圍對應的原文片段（含中間標點；跨節以空字串相接）
function sourceSpan(idx, start, end) {
  const a = idx.at[start], b = idx.at[end];
  if (a.v === b.v) return idx.texts[a.v].slice(a.i, b.i + 1);
  let s = idx.texts[a.v].slice(a.i);
  for (let v = a.v + 1; v < b.v; v++) s += idx.texts[v] || '';
  return s + idx.texts[b.v].slice(0, b.i + 1);
}

// 字元級 LCS diff，回傳差異片段清單 [{ a: 內容片段, b: 來源片段 }]
function diffSegments(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const segs = [];
  let i = 0, j = 0, ca = '', cb = '';
  const flush = () => { if (ca || cb) segs.push({ a: ca, b: cb }); ca = cb = ''; };
  while (i < n && j < m) {
    if (a[i] === b[j]) { flush(); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ca += a[i++];
    else cb += b[j++];
  }
  ca += a.slice(i); cb += b.slice(j); flush();
  return segs;
}
// 把差異用 [ ] 標出來的可讀版
function markedDiff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, oa = '', ob = '', da = '', db = '';
  const flush = () => { if (da || db) { oa += `[${da}]`; ob += `[${db}]`; } da = db = ''; };
  while (i < n && j < m) {
    if (a[i] === b[j]) { flush(); oa += a[i]; ob += b[j]; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) da += a[i++];
    else db += b[j++];
  }
  da += a.slice(i); db += b.slice(j); flush();
  return { a: oa, b: ob };
}

// 找最像的節（或相鄰兩節）當對照對象：用 LCS 長度／內容長度
function bestCandidate(idx, quoteCore, hintVerse) {
  const nums = Object.keys(idx.texts).map(Number).sort((x, y) => x - y);
  const cands = [];
  if (hintVerse && idx.texts[hintVerse]) cands.push([hintVerse]);
  for (const v of nums) { cands.push([v]); if (idx.texts[v + 1]) cands.push([v, v + 1]); }
  let best = null;
  for (const span of cands) {
    const text = span.map(v => idx.texts[v]).join('');
    const c = core(text);
    const n = quoteCore.length, m = c.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i][j] = quoteCore[i] === c[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const score = dp[0][0] / Math.max(n, 1) - (span.length - 1) * 0.02;   // 兩節略罰，避免無謂跨節
    if (!best || score > best.score) best = { span, text, score };
  }
  return best;
}

const refLabel = (a, b) => (a === b ? `${a}` : `${a}-${b}`);

// 主比對：回傳 { kind, verses, detail[] }
function compareQuote(quote, idx, chapterNo, hintVerse) {
  const q = stripQuote(quote);
  const qc = core(q);
  if (!qc) return { kind: 'text', verses: '', detail: ['引文為空'] };

  const pos = idx.core.indexOf(qc);
  if (pos >= 0) {
    const start = pos, end = pos + qc.length - 1;
    const vA = idx.at[start].v, vB = idx.at[end].v;
    const src = sourceSpan(idx, start, end);
    const ps = punctSeq(q), pt = punctSeq(src);
    const verses = refLabel(vA, vB);
    if (ps === pt) return { kind: 'ok', verses, detail: [] };
    return { kind: 'punct', verses, detail: [`內容：${q}`, `來源：${src}`] };
  }

  // 找不到完整片段 → 對最像的節做 diff
  const cand = bestCandidate(idx, qc, hintVerse);
  const cc = core(cand.text);
  const segs = diffSegments(qc, cc);
  const onlyVariants = segs.length > 0 && segs.every(s => s.a.length === 1 && s.b.length === 1 && VARIANT_SET.has(s.a + s.b));
  const md = markedDiff(qc, cc);
  const verses = refLabel(cand.span[0], cand.span[cand.span.length - 1]);
  const detail = [`內容：${md.a}`, `來源：${md.b}`];
  const diffText = segs.map(s => `${s.a || '∅'}↔${s.b || '∅'}`).join('、');
  if (cand.score < 0.5) detail.push(`（與本章最像的 ${chapterNo}:${verses} 也只有 ${(cand.score * 100).toFixed(0)}% 相似，可能引錯章或跨章）`);
  return { kind: 'text', verses, detail, diffText, onlyVariants, qc };
}

// 舊版對不上時的仲裁：回查正本 CUNP1；一致 → 疑似版本差異，否則維持文字差異
async function arbitrate(r, loc, useCunp1, refresh) {
  if (r.kind !== 'text' || !r.qc) return r;
  if (!useCunp1) {
    if (r.onlyVariants) { r.kind = 'variant'; r.detail.push(`差異字：${r.diffText}（皆在新舊版對照表內；未回查 CUNP1）`); }
    return r;
  }
  try {
    const cunp = core(await fetchCunp1(loc.code, loc.ch, refresh));
    if (cunp.includes(r.qc)) {
      r.kind = 'variant';
      r.detail.push(`差異字：${r.diffText}；正本 CUNP1 逐字一致 → 新標點和合本 vs 舊和合本的版本差異`);
    } else {
      r.detail.push(`差異字：${r.diffText}；正本 CUNP1 也對不上`);
    }
  } catch (e) {
    r.detail.push(`（回查 CUNP1 失敗：${e.message}）`);
  }
  return r;
}

// verseRef「—— 創世記 25:34」→ { ch, v }
function parseVerseRef(ref) {
  const m = String(ref || '').match(/(\d+)\s*[:：]\s*(\d+)(?:\s*[-–~]\s*(\d+))?/);
  return m ? { ch: Number(m[1]), v: Number(m[2]), v2: m[3] ? Number(m[3]) : Number(m[2]) } : null;
}

// ---------- 主程式 ----------
const ICON = { ok: '✔', punct: '⚠', variant: '❓', text: '✖' };
const LABEL = { ok: '一致', punct: '標點差異', variant: '疑似版本差異', text: '文字差異' };

async function main() {
  const raw = process.argv.slice(2);
  const quiet = raw.includes('--quiet');
  const refresh = raw.includes('--refresh');
  const useCunp1 = !raw.includes('--no-cunp1');
  const args = raw.filter(a => !a.startsWith('--'));
  if (!args.length) { console.error('用法見檔頭註解，例：npm run verify:cuv -- GEN 25-36'); process.exit(2); }
  const keys = expandArgs(args);

  const src = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
  const ctx = { window: {}, console: { log() {}, warn() {}, error() {} }, __out: {} };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;__out.CHAPTERS = CHAPTERS;', ctx);
  const CHAPTERS = ctx.__out.CHAPTERS;

  const counts = { ok: 0, punct: 0, variant: 0, text: 0 };
  const problems = [];   // 非一致項彙整（結尾再列一次）
  let fetchErrors = 0;

  for (const key of keys) {
    const c = CHAPTERS.find(x => String(x.chapter) === key);
    const loc = parseKey(key);
    if (!c) { console.error(`✖ ${key}：CHAPTERS 找不到此章`); fetchErrors++; continue; }
    if (!loc?.code) { console.error(`✖ ${key}：無法解析書卷代碼（BOOK_CODES 缺這卷？）`); fetchErrors++; continue; }

    let verses, cached;
    try { ({ verses, cached } = await fetchChapter(loc.code, loc.ch, refresh)); }
    catch (e) { console.error(`✖ ${key}：${e.message}`); fetchErrors++; continue; }
    const idx = buildChapterIndex(verses);
    const lines = [];

    const ref = parseVerseRef(c.verseRef);
    const fields = [
      { label: `verse（${String(c.verseRef).replace(/^[—\s]+/, '')}）`, text: c.verse, hint: ref?.v, ref },
      { label: `baseItem「${c.baseItem?.name}」`, text: c.baseItem?.desc, hint: null },
      { label: `bonusItem「${c.bonusItem?.name}」`, text: c.bonusItem?.desc, hint: null },
    ];
    for (const f of fields) {
      const r = await arbitrate(compareQuote(f.text, idx, loc.ch, f.hint), loc, useCunp1, refresh);
      // verseRef 出處核對：章或節對不上 → 升級為文字差異
      if (f.ref && r.kind !== 'text') {
        const [a, b] = r.verses.split('-').map(Number);
        const lo = a, hi = b || a;
        const refOk = f.ref.ch === loc.ch && f.ref.v >= lo && f.ref.v <= hi;
        if (!refOk) {
          r.kind = 'text';
          r.detail.unshift(`verseRef 標 ${f.ref.ch}:${f.ref.v}，但引文實際落在 ${loc.ch}:${r.verses}`);
        }
      }
      counts[r.kind]++;
      const head = `  ${ICON[r.kind]} ${f.label} ${loc.ch}:${r.verses} ${LABEL[r.kind]}`;
      if (r.kind !== 'ok' || !quiet) lines.push(head, ...r.detail.map(d => '      ' + d));
      if (r.kind !== 'ok') problems.push({ key, kind: r.kind, label: f.label, verses: `${loc.ch}:${r.verses}`, detail: r.detail });
    }
    if (!quiet || lines.length) {
      console.log(`▶ ${key}（cuv/${loc.code}/${loc.ch}${cached ? '，快取' : ''}）`);
      lines.forEach(l => console.log(l));
    }
  }

  console.log('\n=== 統計 ===');
  console.log(`  一致 ${counts.ok}　標點差異 ${counts.punct}　疑似版本差異 ${counts.variant}　文字差異 ${counts.text}${fetchErrors ? `　抓取／解析失敗 ${fetchErrors}` : ''}`);
  const variants = problems.filter(p => p.kind === 'variant');
  if (variants.length) {
    console.log('\n❓ 疑似版本差異（正本 CUNP1 一致，不需改）：');
    for (const p of variants) console.log(`  · ${p.key} ${p.label} ${p.verses}　${p.detail.find(d => d.startsWith('差異字')) || ''}`);
  }
  const texts = problems.filter(p => p.kind === 'text');
  if (texts.length) {
    console.log('\n✖ 文字差異明細（不自動改 content.js，請人工判斷）：');
    for (const p of texts) { console.log(`  · ${p.key} ${p.label} ${p.verses}`); p.detail.forEach(d => console.log('      ' + d)); }
  }
  if (texts.length || fetchErrors) process.exit(1);
  console.log(texts.length ? '' : '=== 無文字差異 ===');
}

main().catch(e => { console.error(e); process.exit(1); });
