// A1 書卷詳情頁（Phase 1 創世記切片）程式面守門：
// ① 書櫃只有 BOOK_DETAIL_ENABLED 內的書背綁 onclick；② 封面／人物圖「有圖才輸出」；③ 翻頁動畫尊重 reduced-motion。
// 用假 DOM 跑 renderLibraryPage／renderBookDetail，不開瀏覽器。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'bible-game-v2.html'), 'utf8');

// 只抽書櫃＋詳情頁那段函式原始碼（從 renderLibraryPage 到「分享次數」註解前），避免載整頁
function slice(from, to) {
  const a = html.indexOf(from), b = html.indexOf(to, a);
  assert.ok(a > 0 && b > a, `找不到 ${from} ～ ${to}`);
  return html.slice(a, b);
}
const src = slice('function renderLibraryPage()', '// ── 分享次數');

function fakeDoc() {
  const els = {};
  const mk = id => (els[id] = els[id] || { id, innerHTML: '', textContent: '' });
  return { getElementById: id => mk(id), els };
}

function run({ BOOKS, BOOK_INTRO = {}, CHARACTERS = {}, BOOK_DETAIL_ENABLED, completed = {} }) {
  const document = fakeDoc();
  const ctx = vm.createContext({
    document, BOOKS, BOOK_INTRO, CHARACTERS,
    ...(BOOK_DETAIL_ENABLED !== undefined ? { BOOK_DETAIL_ENABLED } : {}),
    state: { completed },
    chapterKey: x => String(x),
    getBookProgress: b => ({ done: b.entries.filter(e => completed[String(e)]).length, total: b.entries.length, complete: false }),
    escapeHtmlMyMsg: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    __opened: false,
  });
  ctx.openOverlay = () => { ctx.__opened = true; };
  ctx.track = () => {};   // B1 埋點 stub（2026-08-30 openBookDetail 加 book_detail_open）
  vm.runInContext(src, ctx);
  return { ctx, document };
}

const GEN = { key: 'GEN', name: '創世記', emoji: '🌍', entries: ['GEN1', 'GEN2'] };
const ACT = { key: 'ACT', name: '使徒行傳', emoji: '🏛️', entries: [10, 11] };

test('書櫃：只有 BOOK_DETAIL_ENABLED 內的書背綁 onclick＋openable，其餘純展示', () => {
  const { ctx, document } = run({ BOOKS: [GEN, ACT], BOOK_DETAIL_ENABLED: ['GEN'] });
  vm.runInContext('renderLibraryPage()', ctx);
  const out = document.els['ach-library-page'].innerHTML;
  assert.match(out, /class="book-spine [a-z]+ openable" onclick="openBookDetail\('GEN'\)"/);
  assert.doesNotMatch(out, /openBookDetail\('ACT'\)/);
  assert.equal((out.match(/openable/g) || []).length, 1);
});

test('沒定義 BOOK_DETAIL_ENABLED ＝ 全關；openBookDetail 對未開放書卷不開 overlay', () => {
  const a = run({ BOOKS: [GEN, ACT] });
  vm.runInContext('renderLibraryPage()', a.ctx);
  assert.doesNotMatch(a.document.els['ach-library-page'].innerHTML, /openBookDetail/);
  const b = run({ BOOKS: [GEN, ACT], BOOK_DETAIL_ENABLED: ['GEN'] });
  vm.runInContext("openBookDetail('ACT')", b.ctx);
  assert.equal(b.ctx.__opened, false);
  vm.runInContext("openBookDetail('GEN')", b.ctx);
  assert.equal(b.ctx.__opened, true);
});

test('封面：沒 cover 不輸出圖位；圖片路徑→<img class="bd-cover">；emoji→bd-cover-emoji', () => {
  const none = run({ BOOKS: [GEN], BOOK_DETAIL_ENABLED: ['GEN'], BOOK_INTRO: { GEN: { author: 'x' } } });
  vm.runInContext("renderBookDetail('GEN')", none.ctx);
  assert.doesNotMatch(none.document.els['book-detail-body'].innerHTML, /bd-cover/);

  const img = run({ BOOKS: [GEN], BOOK_DETAIL_ENABLED: ['GEN'], BOOK_INTRO: { GEN: { cover: 'img/a1/gen.jpg' } } });
  vm.runInContext("renderBookDetail('GEN')", img.ctx);
  assert.match(img.document.els['book-detail-body'].innerHTML, /<img class="bd-cover" src="img\/a1\/gen\.jpg"/);

  const emo = run({ BOOKS: [GEN], BOOK_DETAIL_ENABLED: ['GEN'], BOOK_INTRO: { GEN: { cover: '🌍' } } });
  vm.runInContext("renderBookDetail('GEN')", emo.ctx);
  assert.match(emo.document.els['book-detail-body'].innerHTML, /class="bd-cover-emoji">🌍</);
});

test('人物頭像：period.image 有值才輸出圓形小頭像，沒值沒有 <img>', () => {
  const chars = {
    noah: { name: '挪亞', periods: { flood: { book: 'GEN', title: '洪水', desc: 'd', unlock: 'GEN1', image: 'img/a1/noah.png' } } },
    abe: { name: '亞伯拉罕', periods: { call: { book: 'GEN', title: '蒙召', desc: 'd', unlock: 'GEN2' } } },
  };
  const r = run({ BOOKS: [GEN], BOOK_DETAIL_ENABLED: ['GEN'], CHARACTERS: chars, completed: { GEN1: true } });
  vm.runInContext("renderBookDetail('GEN')", r.ctx);
  const out = r.document.els['book-detail-body'].innerHTML;
  assert.match(out, /<img class="bd-char-avatar" src="img\/a1\/noah\.png" alt="挪亞">/);
  assert.equal((out.match(/bd-char-avatar/g) || []).length, 1);
  assert.match(out, /亞伯拉罕/);
});

test('翻頁動畫 CSS：限 #book-detail-overlay、≤450ms、有 prefers-reduced-motion 退場', () => {
  assert.match(html, /#book-detail-overlay \.sheet\{[^}]*rotateY\(-14deg\)/);
  const m = html.match(/#book-detail-overlay \.sheet\{[^}]*transition:transform \.(\d+)s/);
  assert.ok(m && Number('0.' + m[1]) <= 0.45, '翻頁動畫超過 450ms');
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)\{\s*#book-detail-overlay \.sheet\{transform:none/);
});
