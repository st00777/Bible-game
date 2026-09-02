// SYNC_FIELDS ⟷ docs/firestore-schema.md：users/{uid} 主文件欄位的防漂移契約（D23）
// 主文件實際寫入端有三處：saveToFirestore／flushToFirestore（SYNC_FIELDS + updatedAt）、
// applyFontSize（fontSize）。程式加欄位卻忘了同步 schema 文件時，這支測試會咬人。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const schemaMd = fs.readFileSync(path.join(ROOT, 'docs/firestore-schema.md'), 'utf8');

// SYNC_FIELDS 以外、也會寫進 users/{uid} 主文件的欄位（不走 SYNC_FIELDS 迴圈）
const NON_SYNC_FIELDS = ['updatedAt', 'fontSize'];

function syncFields() {
  const m = appJs.match(/const SYNC_FIELDS = \[([^\]]+)\]/);
  assert.ok(m, 'app.js 找不到 SYNC_FIELDS');
  return m[1].split(',').map(s => s.trim().replace(/^'|'$/g, ''));
}

function schemaFields() {
  const lines = schemaMd.split('\n');
  const start = lines.findIndex(l => l.startsWith('users/{userId}/ ') || /^users\/\{userId\}\/\s+←/.test(l));
  assert.ok(start >= 0, 'docs/firestore-schema.md 找不到 users/{userId} 主文件區塊');
  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('  ') || !line.trim()) break;   // 主文件區塊到下一個空行為止
    const body = line.split('//')[0].trim();
    if (!body) continue;
    const names = body.includes(':') ? [body.split(':')[0]] : body.split('/');
    names.forEach(n => { const v = n.trim(); if (v) out.push(v); });
  }
  return out;
}

test('SYNC_FIELDS 與 firestore-schema.md 主文件欄位一致（無漂移）', () => {
  const expected = [...syncFields(), ...NON_SYNC_FIELDS].sort();
  const documented = schemaFields().sort();
  assert.deepEqual(documented, expected);
});

test('主文件的雲端寫入端只用 SYNC_FIELDS 這一張表', () => {
  // set(data) 的 data 一律由 SYNC_FIELDS.forEach 組成；新增第三個寫入路徑時這裡會失衡。
  const forEachWrites = (appJs.match(/SYNC_FIELDS\.forEach\(f => \{ data\[f\] = state\[f\]; \}\)/g) || []).length;
  assert.equal(forEachWrites, 2, 'saveToFirestore／flushToFirestore 以外多了主文件寫入路徑，請同步 schema 與本測試');
});
