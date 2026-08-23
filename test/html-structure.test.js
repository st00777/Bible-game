// HTML 結構守門：每次改 HTML 後必做的兩件事自動化
//   ① inline <script> 逐段語法檢查（等同 node --check）
//   ② 主要標籤開合平衡（結尾標籤被吃掉＝全白＋零錯誤＋單請求的那種 bug）
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const PAGES = ['bible-game-v2.html', 'admin/index.html', 'admin/list.html', 'admin/detail.html'];

function inlineScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/.test(m[1])) continue;                     // 外部檔不在此檢
    if (/type\s*=\s*["'](?!text\/javascript|module)/i.test(m[1])) continue; // JSON-LD 等非 JS
    out.push({ code: m[2], line: html.slice(0, m.index).split('\n').length });
  }
  return out;
}

function tagBalance(html, tag) {
  const open = (html.match(new RegExp(`<${tag}\\b[^>]*(?<!/)>`, 'gi')) || []).length;
  const close = (html.match(new RegExp(`</${tag}\\s*>`, 'gi')) || []).length;
  return { open, close };
}

for (const page of PAGES) {
  test(`${page}：inline script 可編譯`, () => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const scripts = inlineScripts(html);
    assert.ok(scripts.length > 0, '找不到 inline script');
    for (const s of scripts) {
      assert.doesNotThrow(() => new vm.Script(s.code, { filename: `${page}:${s.line}` }), `第 ${s.line} 行起的 <script> 有語法錯誤`);
    }
  });
  test(`${page}：div / script / body / html 標籤開合平衡`, () => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    for (const tag of ['div', 'script', 'body', 'html', 'head']) {
      const { open, close } = tagBalance(html, tag);
      assert.equal(open, close, `<${tag}> 開 ${open} 個、關 ${close} 個`);
    }
  });
}
