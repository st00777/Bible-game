// hosting 白名單部署守門（issue #1 長期收尾）：
// 2026-08-16 金鑰外洩事件後，hosting 改成「只上傳 public/ 白名單目錄」，公開是明確動作、不是預設。
// 這支測試把那條底線寫死：firebase.json 不能退回 "public": "."，public/ 與 admin/ 只能放清單內的檔案。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// 允許公開的檔案（新增要公開的檔案＝在這裡加一行，審過才上）
const PUBLIC_ALLOW = ['index.html', 'bible-game-v2.html', 'content.js', 'core.js', 'shared/feedback-schema.js'];
// A1 圖片目錄：public/img/ 只允許圖片檔（封面／人物立繪），由 deploy.sh 從根目錄 img/ 同步
const PUBLIC_IMG_DIR = 'img/';
const IMG_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;
const ADMIN_ALLOW = ['index.html', 'list.html', 'detail.html', 'common.js', 'shared/feedback-schema.js'];

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.name.startsWith('.')) return [];
    return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

test('firebase.json：hosting 兩個 target 都指向白名單目錄，不是 repo 根', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase.json'), 'utf8'));
  const byTarget = Object.fromEntries(cfg.hosting.map(h => [h.target, h]));
  assert.equal(byTarget.main.public, 'public');
  assert.equal(byTarget.admin.public, 'admin');
  for (const h of cfg.hosting) assert.notEqual(h.public, '.', `${h.target} 退回整個 repo 根目錄上傳`);
});

test('public/ 只含白名單檔案（img/ 下只准圖片）', () => {
  const files = listFiles(path.join(ROOT, 'public'));
  const imgs = files.filter(f => f.startsWith(PUBLIC_IMG_DIR));
  const rest = files.filter(f => !f.startsWith(PUBLIC_IMG_DIR));
  assert.deepEqual(rest.sort(), [...PUBLIC_ALLOW].sort());
  for (const f of imgs) assert.match(f, IMG_EXT, `public/${f} 不是圖片檔，不該公開`);
});

test('admin/ 只含白名單檔案', () => {
  assert.deepEqual(listFiles(path.join(ROOT, 'admin')).sort(), [...ADMIN_ALLOW].sort());
});

test('.gitignore 仍排除服務帳號金鑰', () => {
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  for (const k of ['ga4-key.json', 'token.json']) assert.ok(gi.includes(k), `.gitignore 缺 ${k}`);
});
