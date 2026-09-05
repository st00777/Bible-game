// 內容一致性自檢測試（issue #2）：
// ① 真實 content.js 必須零「結構錯誤」（待補 warns 允許，那是內容窗的事）
// ② 用小型假資料逐條驗證六項不變量真的抓得到破損
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadContent } = require('../scripts/validate-content.js');

const ROOT = path.join(__dirname, '..');
const contentSrc = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');

// 把 validateContent 函式原始碼單獨抽出來（從宣告到 isDevHost 之前）
function validatorSource() {
  const start = contentSrc.indexOf('function validateContent()');
  const end = contentSrc.indexOf('function isDevHost');
  assert.ok(start > 0 && end > start, '找不到 validateContent 函式');
  return contentSrc.slice(start, end);
}

// 用假資料跑驗證器：tables 是要覆蓋的五張表
function runWith(tables) {
  const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} } });
  const base = { SCHEDULE: {}, BIBLE_LINKS: {}, BOOK_INTRO: {}, CHAPTERS: [], BOOKS: [], CHARACTERS: {}, ...tables };
  for (const k of Object.keys(base)) ctx[k] = base[k];
  vm.runInContext(validatorSource(), ctx);
  return vm.runInContext('validateContent()', ctx);
}

const okIntro = { author: 'a', time: 't', place: 'p', theme: 'th', audience: 'au' };
// 完整形狀的假章節（2026-08-31 檢查 8 之後，「健康」章節必須齊 shape 契約全欄位）
const fullChapter = ch => ({
  chapter: ch, verse: 'v', verseRef: 'r', scene: 's', q: 'q',
  reflectionTitle: 't', reflection: 'rf',
  choices: [{ k: 'A', text: 'a' }, { k: 'B', text: 'b' }, { k: 'C', text: 'c' }, { k: 'D', text: 'd' }],
  responses: { A: 'ra', B: 'rb', C: 'rc', D: 'rd' },
  baseItem: { emoji: '📖', name: 'n', slot: 'hand' },
  bonusItem: { default: { emoji: '🌿', name: 'n2', slot: 'bg' }, m: { emoji: '⚔️', name: 'n3', slot: 'bg' } },
});
const healthy = {
  CHAPTERS: [fullChapter(1), fullChapter('GEN1')],
  BOOKS: [
    { key: 'ACT', name: '使徒行傳', entries: [1], totalChapters: 1 },
    { key: 'GEN', name: '創世記', entries: ['GEN1'], totalChapters: 1 }
  ],
  SCHEDULE: { '2026-01-01': [1], '2026-01-02': ['GEN1'] },
  BIBLE_LINKS: { '1': 'https://x/1', 'GEN1': 'https://x/g1' },
  BOOK_INTRO: { ACT: okIntro, GEN: okIntro }
};

test('真實 content.js：零結構錯誤（待補可有）', () => {
  const { validateContent } = loadContent(path.join(ROOT, 'content.js'));
  const { errors, warns } = validateContent();
  assert.equal(errors.length, 0, '結構錯誤：\n' + errors.join('\n'));
  assert.ok(Array.isArray(warns));
});

test('健康假資料：零錯誤零待補', () => {
  const r = runWith(healthy);
  assert.equal(r.errors.length, 0);
  assert.equal(r.warns.length, 0);
});

test('檢查 8：缺 responses.D／choices 三格／slot 不合法 → error', () => {
  const broken = fullChapter('GEN1');
  delete broken.responses.D;
  broken.choices = broken.choices.slice(0, 3);
  broken.baseItem = { emoji: '📖', name: 'n', slot: 'foot' };
  const r = runWith({ ...healthy, CHAPTERS: [fullChapter(1), broken] });
  assert.ok(r.errors.some(m => m.includes('responses 缺 D')));
  assert.ok(r.errors.some(m => m.includes('choices 不是 4 格')));
  assert.ok(r.errors.some(m => m.includes('slot 不合法')));
});

test('同一章出現在兩本書 → error', () => {
  const r = runWith({ ...healthy,
    BOOKS: [...healthy.BOOKS, { key: 'X', name: 'X', entries: [1], totalChapters: 1 }],
    BOOK_INTRO: { ...healthy.BOOK_INTRO, X: okIntro } });
  assert.ok(r.errors.some(m => m.includes('重複出現')));
});

test('CHAPTERS 有章節不屬於任何書卷 → error', () => {
  const r = runWith({ ...healthy,
    CHAPTERS: [...healthy.CHAPTERS, { chapter: 'ORPHAN' }],
    BIBLE_LINKS: { ...healthy.BIBLE_LINKS, ORPHAN: 'u' } });
  assert.ok(r.errors.some(m => m.includes('不屬於任何 BOOKS')));
});

test('SCHEDULE 排了沒內容的章 → error', () => {
  const r = runWith({ ...healthy, SCHEDULE: { ...healthy.SCHEDULE, '2026-01-03': ['GEN2'] } });
  assert.ok(r.errors.some(m => m.includes('SCHEDULE') && m.includes('GEN2')));
});

test('章節經文連結空白 → error', () => {
  const r = runWith({ ...healthy, BIBLE_LINKS: { ...healthy.BIBLE_LINKS, GEN1: '   ' } });
  assert.ok(r.errors.some(m => m.includes('BIBLE_LINKS') && m.includes('GEN1')));
});

test('書卷導讀缺筆／缺欄 → warn（不是 error）', () => {
  const r = runWith({ ...healthy, BOOK_INTRO: { ACT: okIntro, GEN: { ...okIntro, place: '' } } });
  assert.equal(r.errors.length, 0);
  assert.ok(r.warns.some(m => m.includes('導讀缺 1 欄')));
  const r2 = runWith({ ...healthy, BOOK_INTRO: { ACT: okIntro } });
  assert.ok(r2.warns.some(m => m.includes('無此筆')));
});

test('totalChapters 與 entries 數不符 → warn', () => {
  const r = runWith({ ...healthy, BOOKS: [{ ...healthy.BOOKS[0], totalChapters: 28 }, healthy.BOOKS[1]] });
  assert.ok(r.warns.some(m => m.includes('totalChapters=28')));
});

// BOOK_DETAIL_ENABLED 已退役（2026-09-01 D8）——相關檢查與測試移除。

// 人物冊檢查 9)（2026-09-05）
const okChar = { name: '亞當', periods: { beginning: { book: 'GEN', title: 't', desc: 'd', unlock: 'GEN1' } } };
test('人物冊時期 book／unlock 合法 → 無錯', () => {
  const r = runWith({ ...healthy, CHARACTERS: { adam: okChar } });
  assert.ok(!r.errors.some(m => m.startsWith('CHARACTERS')));
});
test('人物冊 unlock 不在任何書卷 entries → error', () => {
  const bad = { name: 'x', periods: { p: { book: 'GEN', title: 't', desc: 'd', unlock: 'GEN99' } } };
  const r = runWith({ ...healthy, CHARACTERS: { x: bad } });
  assert.ok(r.errors.some(m => m.includes('unlock「GEN99」')));
});
test('人物冊 book 不是 BOOKS key → error', () => {
  const bad = { name: 'x', periods: { p: { book: 'ZZZ', title: 't', desc: 'd', unlock: 'GEN1' } } };
  const r = runWith({ ...healthy, CHARACTERS: { x: bad } });
  assert.ok(r.errors.some(m => m.includes('book「ZZZ」')));
});
test('人物冊 desc 含 // 出處 → warn', () => {
  const bad = { name: 'x', periods: { p: { book: 'ROM', title: 't', desc: 'd // 創 1:1', unlock: 'GEN1' } } };
  const r = runWith({ ...healthy, CHARACTERS: { x: bad } });
  assert.ok(r.warns.some(m => m.includes('desc 含「//」')));
});
