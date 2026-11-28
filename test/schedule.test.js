// 讀經進度檔守門（封版藍圖期 2：章日拆開，2026-11-21）：
// ① 抽檔前後 SCHEDULE 一字不改：每個日期的值與「型別」都要和抽檔前快照相同
//    （徒10–28 舊 key 是數字 10，不能變成字串 '10'，否則完成紀錄會分裂）
// ② 已排過的日期不可被刪、不可被改寫（日曆歷史格子靠它上色）；新增日期可以
// ③ SCHEDULE 只存在 schedule.js；content.js 不再宣告
// ④ 模擬瀏覽器載入順序（schedule.js → content.js → core.js 同一全域），內容表與進度都取得到、自檢零錯誤
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// 快照來源：origin/dev c84beaf 的 content.js SCHEDULE（抽檔前），JSON 保留數字／字串型別差異
const SNAPSHOT = JSON.parse(read('test/fixtures/schedule-snapshot-2026-11-21.json')).schedule;

// 依 bible-game-v2.html 的順序在同一個 vm context 跑（classic script 共用全域詞法範圍）
function loadLikeBrowser(files) {
  const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} } });
  ctx.window = ctx;   // content.js 看到 window 就把自檢結果掛到 window.CONTENT_VALIDATION
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  return ctx;
}
const browser = loadLikeBrowser(['schedule.js', 'content.js', 'core.js']);
const SCHEDULE = vm.runInContext('SCHEDULE', browser);

test('抽檔前後：快照裡每個日期的值與型別完全相同（徒10–28 仍是數字）', () => {
  const dates = Object.keys(SNAPSHOT);
  assert.equal(dates.length, 264, '快照日期數變了？快照檔不該被改');
  for (const d of dates) {
    assert.ok(d in SCHEDULE, `${d} 從進度檔消失了（已排過的日期不能刪）`);
    const now = Array.from(SCHEDULE[d]);
    assert.deepStrictEqual(now, SNAPSHOT[d], `${d} 的章節被改寫`);
    now.forEach((c, i) => assert.equal(typeof c, typeof SNAPSHOT[d][i], `${d} 第 ${i + 1} 章型別變了：${JSON.stringify(c)}`));
  }
});

test('數字 key 只有使徒行傳 10–28，且一個都沒變成字串', () => {
  const all = Object.values(SCHEDULE).flatMap(v => Array.from(v));
  const nums = all.filter(c => typeof c === 'number');
  assert.deepEqual(nums.sort((a, b) => a - b), Array.from({ length: 19 }, (_, i) => i + 10));
  assert.ok(!all.some(c => typeof c === 'string' && /^\d+$/.test(c)), '出現純數字字串 key（例 \'10\'）');
  for (const v of Object.values(SCHEDULE)) assert.ok(Array.isArray(v) && v.length >= 1, '每天一律陣列格式');
});

test('SCHEDULE 只宣告在 schedule.js，content.js 不再有', () => {
  assert.ok(/^globalThis\.SCHEDULE = \{/m.test(read('schedule.js')));
  assert.ok(!/^\s*(const|let|var)\s+SCHEDULE\b/m.test(read('content.js')), 'content.js 仍宣告 SCHEDULE');
});

test('bible-game-v2.html：schedule.js 以 defer 載入，且排在 content.js 之前、app.js 之前', () => {
  const html = read('bible-game-v2.html');
  const tags = [...html.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"([^>]*)>/g)].map(m => ({ src: m[2], defer: /\bdefer\b/.test(m[1] + m[3]) }));
  const idx = s => tags.findIndex(t => t.src === s);
  assert.ok(idx('schedule.js') >= 0, '沒載入 schedule.js');
  assert.ok(tags[idx('schedule.js')].defer && tags[idx('content.js')].defer, 'schedule.js／content.js 都要 defer');
  assert.ok(idx('schedule.js') < idx('content.js'), 'schedule.js 要在 content.js 之前（content.js 載完即跑自檢）');
  assert.ok(idx('content.js') < idx('app.js'));
});

test('部署：deploy.sh 會把 schedule.js 同步到 public/', () => {
  assert.match(read('deploy.sh'), /cp -f [^\n]*\bschedule\.js\b[^\n]* public\//);
});

test('模擬瀏覽器載入：內容表、進度、core 查詢都取得到，自檢零結構錯誤', () => {
  const r = vm.runInContext('window.CONTENT_VALIDATION', browser);
  assert.deepEqual(Array.from(r.errors), []);
  assert.ok(vm.runInContext('CHAPTERS.length > 0 && BOOKS.length > 0', browser));
  assert.deepEqual(Array.from(vm.runInContext("getScheduleChapters('2026-04-05')", browser)), [14, 15]);
  assert.equal(vm.runInContext("todayChapterFor('2026-04-05', {})", browser), 14);
  assert.equal(vm.runInContext("findScheduleDate(14)", browser), '2026-04-05');
  assert.equal(vm.runInContext("isMakeupChapterOn(10, '2026-11-21')", browser), true);
});

test('漏載 schedule.js：自檢回報結構錯誤，而不是整支丟例外', () => {
  const ctx = loadLikeBrowser(['content.js']);
  const r = vm.runInContext('window.CONTENT_VALIDATION', ctx);
  assert.ok(r.errors.some(m => m.includes('SCHEDULE') && m.includes('schedule.js')));
});

test('scripts/validate-content.js 的 loadContent 會帶上 schedule.js', () => {
  const { loadContent } = require('../scripts/validate-content.js');
  const { SCHEDULE: s, validateContent } = loadContent(path.join(ROOT, 'content.js'));
  assert.equal(Object.keys(s).length, Object.keys(SCHEDULE).length);
  assert.deepEqual(Array.from(validateContent().errors), []);
});

test('快取混搭：新 schedule.js 之後再跑舊版 content.js（含 const SCHEDULE）不會丟「已宣告」', () => {
  const ctx = vm.createContext({});
  vm.runInContext(read('schedule.js'), ctx);
  assert.doesNotThrow(() => vm.runInContext("const SCHEDULE = { '2026-01-01': ['X'] };", ctx));
});
