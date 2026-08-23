// core.js 純邏輯測試（issue #6）
// core.js 讀的內容表（BOOKS / CHAPTERS / SCHEDULE）是 content.js 的全域，測試用小型假表掛到 globalThis。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

globalThis.BOOKS = [
  { key: 'ACT', name: '使徒行傳', shortName: '徒', entries: [1, 2, 3], totalChapters: 3 },
  { key: 'ROM', name: '羅馬書', shortName: '羅', prefix: 'ROM', entries: ['ROM1', 'ROM2'], totalChapters: 2, mergedActive: false },
  { key: 'COR1', name: '哥林多前書', shortName: '林前', prefix: 'COR1_', entries: ['COR1_1', 'COR1_2'], totalChapters: 3, merged: { COR1_1: 2 } },
];
globalThis.CHAPTERS = [
  { chapter: 1, verse: 'v1', baseItem: { emoji: '🧥', name: 'a', slot: 'body' }, bonusItem: { default: { emoji: '🌿', name: 'n' }, m: { emoji: '⚔️', name: 'm' } } },
  { chapter: 2 },
  { chapter: 'ROM1' }, { chapter: 'ROM2' }, { chapter: 'COR1_1' },
];
globalThis.SCHEDULE = {
  '2026-01-01': [1],
  '2026-01-02': [2, 3],        // 3 沒內容
  '2026-01-05': ['ROM1', 'ROM2'],
  '2026-02-01': ['COR1_1'],
};

const core = require('../core.js');

test('chapterKey / getChapter 三種形態都查得到', () => {
  assert.equal(core.chapterKey(10), 'ACT10');
  assert.equal(core.chapterKey('ROM3'), 'ROM3');
  core.resetChapterIndex();
  assert.equal(core.getChapter(1).verse, 'v1');
  assert.equal(core.getChapter('1').verse, 'v1');
  assert.equal(core.getChapter('ACT1').verse, 'v1');
  assert.equal(core.getChapter('ROM2').chapter, 'ROM2');
  assert.equal(core.getChapter(99), null);
});

test('日期／日曆算術', () => {
  assert.equal(core.dateStr(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(core.calDateStr(2026, 0, 5), '2026-01-05');
  // 2026-01-01 是週四：1 日在第 0 週、4 日（週日）第 1 週；一月跨 5 週
  assert.equal(core.calWeekOfMonth(2026, 0, 1), 0);
  assert.equal(core.calWeekOfMonth(2026, 0, 4), 1);
  assert.equal(core.calWeeksInMonth(2026, 0), 5);
  assert.equal(core.calWeeksInMonth(2026, 1), 4);   // 2026-02：28 天、1 日週日 → 4 週
  assert.equal(core.formatThreadTime(new Date(2026, 7, 23, 9, 5)), '2026/08/23 09:05');
});

test('timeOfDay 四段', () => {
  assert.equal(core.timeOfDay(5), 'morning');
  assert.equal(core.timeOfDay(11), 'morning');
  assert.equal(core.timeOfDay(12), 'afternoon');
  assert.equal(core.timeOfDay(18), 'evening');
  assert.equal(core.timeOfDay(22), 'night');
  assert.equal(core.timeOfDay(3), 'night');
});

test('chapterLabel / chapterFull', () => {
  assert.equal(core.chapterLabel(10), '徒10');
  assert.equal(core.chapterLabel('COR1_2'), '林前2');
  assert.equal(core.chapterLabel('ZZZ9'), 'ZZZ9');
  assert.equal(core.chapterFull(3), '使徒行傳 第3章');
  assert.equal(core.chapterFull('ROM1'), '羅馬書 第1章');
});

test('排程查詢與補讀判定', () => {
  assert.deepEqual(core.getScheduleChapters('2026-01-02'), [2, 3]);
  assert.deepEqual(core.getScheduleChapters('2030-01-01'), []);
  assert.equal(core.findScheduleDate('ROM2'), '2026-01-05');
  assert.equal(core.findScheduleDate('NOPE'), null);
  assert.equal(core.isMakeupChapterOn(1, '2026-01-02'), true);
  assert.equal(core.isMakeupChapterOn(1, '2026-01-01'), false);
  assert.equal(core.isMakeupChapterOn('UNSCHEDULED', '2026-12-31'), false);
});

test('bookProgress：mergedActive:false 用 entries 當分母；預設走 merged 倍數 vs totalChapters', () => {
  const completed = { ACT1: '2026-01-01', ROM1: '2026-01-05', COR1_1: '2026-02-01' };
  assert.deepEqual(core.bookProgress(globalThis.BOOKS[0], completed), { done: 1, total: 3, complete: false });
  assert.deepEqual(core.bookProgress(globalThis.BOOKS[1], completed), { done: 1, total: 2, complete: false });
  assert.deepEqual(core.bookProgress(globalThis.BOOKS[2], completed), { done: 2, total: 3, complete: false });  // COR1_1 算 2 章
  assert.equal(core.isChapterDoneIn('ROM1', completed), true);
  assert.equal(core.isChapterDoneIn(2, completed), false);
  assert.equal(core.isChapterDoneIn(2, undefined), false);
});

test('pickDefaultChapterFrom：先挑第一個未完成且有內容；全完成回第一個有內容；沒內容回 null', () => {
  assert.equal(core.pickDefaultChapterFrom([2, 3], {}), 2);
  assert.equal(core.pickDefaultChapterFrom([2, 3], { ACT2: 'x' }), 2);     // 3 沒內容 → 重讀模式回 2
  assert.equal(core.pickDefaultChapterFrom([3], {}), null);
  assert.equal(core.pickDefaultChapterFrom([], {}), null);
  assert.equal(core.pickDefaultChapterFrom(['ROM1', 'ROM2'], { ROM1: 'x' }), 'ROM2');
});

test('todayChapterFor：今天有就今天；沒有退回最近過去日；再沒有回第一章', () => {
  assert.equal(core.todayChapterFor('2026-01-05', {}), 'ROM1');
  assert.equal(core.todayChapterFor('2026-01-20', {}), 'ROM1');                 // 最近過去日 01-05
  assert.equal(core.todayChapterFor('2026-01-20', { ROM1: 'x' }), 'ROM2');
  assert.equal(core.todayChapterFor('2025-12-01', {}), 1);                      // 沒有任何過去日 → CHAPTERS[0]
});

test('levelTitle 封頂', () => {
  assert.equal(core.levelTitle(1), '初出發的旅人');
  assert.equal(core.levelTitle(6), '使徒的足跡');
  assert.equal(core.levelTitle(99), '使徒的足跡');
});

test('resolveItem 依性別、無 default 原樣回', () => {
  assert.equal(core.resolveItem(null, 'm'), null);
  assert.deepEqual(core.resolveItem({ emoji: '🧥' }, 'f'), { emoji: '🧥' });
  const it = { default: { emoji: 'd' }, m: { emoji: 'm' } };
  assert.deepEqual(core.resolveItem(it, 'm'), { emoji: 'm' });
  assert.deepEqual(core.resolveItem(it, 'f'), { emoji: 'd' });
});

test('computeCompletion：xp／升級／streak／合併日', () => {
  const data = globalThis.CHAPTERS[0];
  const base = { data, chapter: 1, gender: 'm', xp: 10, level: 1, completed: {}, dayChapters: [1], today: '2026-01-01' };
  let r = core.computeCompletion({ ...base, hasBonus: false });
  assert.equal(r.xp, 30); assert.equal(r.level, 1); assert.equal(r.streakInc, 1);
  assert.equal(r.completedKey, 'ACT1'); assert.equal(r.bonusItem, null); assert.equal(r.isMergedDayAllDone, false);
  assert.deepEqual(r.newItem, { emoji: '🧥', name: 'a', slot: 'body', chapter: 1 });
  // 有默想 +35，90+35 封頂 → 升級回 10
  r = core.computeCompletion({ ...base, hasBonus: true, xp: 90 });
  assert.equal(r.xp, 10); assert.equal(r.level, 2);
  assert.deepEqual(r.bonusItem, { emoji: '⚔️', name: 'm', chapter: 1 });
  // 合併日：同日另一章今天已完成 → streak 不加、合併日全完成
  r = core.computeCompletion({ ...base, hasBonus: false, dayChapters: [1, 2], completed: { ACT2: '2026-01-01' } });
  assert.equal(r.streakInc, 0); assert.equal(r.isMergedDayAllDone, true);
  // 同日另一章是「以前」完成的 → streak 照加
  r = core.computeCompletion({ ...base, hasBonus: false, dayChapters: [1, 2], completed: { ACT2: '2025-12-31' } });
  assert.equal(r.streakInc, 1); assert.equal(r.isMergedDayAllDone, true);
});

test('escapeHtmlMyMsg', () => {
  assert.equal(core.escapeHtmlMyMsg(`<a href="x">&'</a>`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('HTML 不再自己定義已搬走的函式，但仍有載入 core.js', () => {
  const html = fs.readFileSync(path.join(ROOT, 'bible-game-v2.html'), 'utf8');
  assert.ok(html.includes('<script src="core.js"></script>'));
  for (const fn of Object.keys(core)) {
    if (fn === 'resetChapterIndex') continue;
    assert.ok(!new RegExp(`^function ${fn}\\s*\\(`, 'm').test(html), `bible-game-v2.html 仍定義 ${fn}`);
  }
  // 薄包裝還在（名字是 onclick／其他函式的公開介面，不能消失）
  for (const wrapper of ['todayStr', 'getTimeOfDay', 'isMakeupChapter', 'getBookProgress', 'isChapterDone', 'pickDefaultChapter', 'getTodayChapter', 'calIsToday', 'resetSessionState']) {
    assert.ok(new RegExp(`^function ${wrapper}\\s*\\(`, 'm').test(html), `bible-game-v2.html 缺薄包裝 ${wrapper}`);
  }
});
