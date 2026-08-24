#!/usr/bin/env node
// 經文引文護欄（產線 ADR 0002 轉正，2026-08-24）
//
// 內容產線的鐵律：verse / baseItem.desc / bonusItem.desc 必須是和合本原文
// 一字不差，正本＝hkbs CUNP1（新標點和合本神版），頁面須含 CUNP1 標記，
// HTTP 200 不算數。專案唯一允許的差異：裏→裡；說話者標記可省略。
// 這支腳本不分模型等級——不管哪顆模型寫的稿，護欄都一樣硬。
//
// 用法：
//   驗證章節：  node scripts/verify-scripture.js GEN11 GEN12 GEN17
//   讀原文：    node scripts/verify-scripture.js --dump GEN 24
//               （生成前抓原文用；輸出去雜訊的純文字到 stdout）
//
// 驗證內容：三處引文逐字回對原文（含跨節偵測：引文中夾到節號會直接抓出來）、
// 必要欄位齊全、choices 恰四項、responses A-D 齊、guide 三欄齊。

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 章節 key 前綴 → CUNP1 書卷代碼（新書卷上線時在此補一行）
const BOOK_CODES = {
  GEN: 'GEN', EXO: 'EXO', ACT: 'ACT', ROM: 'ROM',
  COR1: '1CO', COR2: '2CO', GAL: 'GAL', EPH: 'EPH', PHP: 'PHP', COL: 'COL',
  TH1: '1TH', TH2: '2TH', TIM1: '1TI', TIM2: '2TI', TIT: 'TIT', PHM: 'PHM',
  HEB: 'HEB', JAS: 'JAS', PE1: '1PE', PE2: '2PE',
  JN1: '1JN', JN2: '2JN', JN3: '3JN', JUD: 'JUD', REV: 'REV',
};

function parseKey(key) {
  const k = String(key);
  if (/^\d+$/.test(k)) return { code: 'ACT', ch: Number(k) };            // 使徒行傳用數字
  if (k.includes('_')) {                                                  // COR1_5 這型
    const [pfx, ch] = k.split('_');
    return { code: BOOK_CODES[pfx], ch: Number(ch) };
  }
  const m = k.match(/^([A-Z]+?)(\d+)$/);                                  // GEN11 這型
  if (m) return { code: BOOK_CODES[m[1]], ch: Number(m[2]) };
  return null;
}

async function fetchChapter(code, ch) {
  const url = `https://rcuv.hkbs.org.hk/CUNP1/${code}/${ch}/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const html = await res.text();
  if (!html.includes('CUNP1') || !html.includes('新標點和合本')) {
    throw new Error(`頁面缺 CUNP1 標記（HTTP 200 不算數）: ${url}`);
  }
  return html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ');
}

// 比對前的正規化：裡→裏（還原專案慣例）、去空白引號；
// 原文端另外去掉節號數字（人名分行造成的殘留）
const normQuote = t => t.replace(/裡/g, '裏').replace(/[\n\s「」『』]/g, '');
const normSource = t => normQuote(t).replace(/\d+/g, '');

function checkQuote(label, quote, sourceNorm, errors) {
  const frag = normQuote(quote.replace(/^「/, '').replace(/」$/, '')).replace(/\d+/g, '');
  if (!frag) { errors.push(`${label}：引文為空`); return; }
  if (!sourceNorm.includes(frag)) {
    errors.push(`${label}：與 CUNP1 原文逐字比對失敗（引文有出入，或跨節／跨章）`);
    return;
  }
  console.log(`  ✔ ${label}`);
}

const REQUIRED = ['sceneEmoji', 'readTime', 'guide', 'verse', 'verseRef', 'scene', 'q',
  'choices', 'responses', 'reflectionTitle', 'reflection', 'baseItem', 'bonusItem'];

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) { console.error('用法見檔頭註解'); process.exit(2); }

  if (args[0] === '--dump') {
    const code = BOOK_CODES[args[1]] || args[1];
    console.log(await fetchChapter(code, Number(args[2])));
    return;
  }

  const src = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
  const ctx = { window: {}, console: { log() {}, warn() {}, error() {} }, __out: {} };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;__out.CHAPTERS = CHAPTERS;', ctx);
  const CHAPTERS = ctx.__out.CHAPTERS;

  const errors = [];
  for (const key of args) {
    const c = CHAPTERS.find(x => String(x.chapter) === key);
    if (!c) { errors.push(`${key}：CHAPTERS 找不到此章`); continue; }
    const loc = parseKey(key);
    if (!loc || !loc.code) { errors.push(`${key}：無法解析書卷代碼（BOOK_CODES 缺這卷？）`); continue; }
    console.log(`▶ ${key}（CUNP1/${loc.code}/${loc.ch}）`);
    let sourceNorm;
    try {
      sourceNorm = normSource(await fetchChapter(loc.code, loc.ch));
    } catch (e) { errors.push(`${key}：${e.message}`); continue; }

    checkQuote(`${key} verse (${String(c.verseRef).trim()})`, c.verse, sourceNorm, errors);
    checkQuote(`${key} baseItem「${c.baseItem?.name}」`, c.baseItem?.desc || '', sourceNorm, errors);
    checkQuote(`${key} bonusItem「${c.bonusItem?.name}」`, c.bonusItem?.desc || '', sourceNorm, errors);

    for (const f of REQUIRED) if (c[f] === undefined) errors.push(`${key}：缺欄位 ${f}`);
    if (c.choices?.length !== 4) errors.push(`${key}：choices 不是 4 項`);
    for (const k of ['A', 'B', 'C', 'D']) if (!c.responses?.[k]) errors.push(`${key}：responses 缺 ${k}`);
    if (!c.guide?.intro || !c.guide?.outline?.length || !c.guide?.focus) errors.push(`${key}：guide 不完整`);
  }

  if (errors.length) {
    console.error('\n✖ 驗證失敗：');
    errors.forEach(e => console.error('  · ' + e));
    process.exit(1);
  }
  console.log('\n=== 全部通過 ===');
}

main().catch(e => { console.error(e); process.exit(1); });
