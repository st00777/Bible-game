// 曠野呼聲 mood/category enum：firestore.rules 與畫面按鈕的防漂移契約（D23）
// rules 的 moods()/categories() 註解說「畫面也維護同一份」——這裡讓它變成會咬人的測試。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'bible-game-v2.html'), 'utf8');

function rulesList(name) {
  const m = rules.match(new RegExp(`function ${name}\\(\\) \\{ return \\[([^\\]]+)\\]`));
  assert.ok(m, `firestore.rules 找不到 ${name}()`);
  return m[1].split(',').map(s => s.trim().replace(/^'|'$/g, ''));
}
function htmlVals(group) {
  const re = new RegExp(`data-val="([^"]+)"[^>]*selectFbOption\\('${group}'`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  assert.ok(out.length > 0, `HTML 找不到 ${group} 按鈕`);
  return out;
}

test('mood/category：rules enum 與畫面按鈕逐字逐序一致', () => {
  assert.deepEqual(htmlVals('fb-mood'), rulesList('moods'));
  assert.deepEqual(htmlVals('fb-category'), rulesList('categories'));
});
