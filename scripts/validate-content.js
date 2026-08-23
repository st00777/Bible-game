#!/usr/bin/env node
// 內容一致性自檢（issue #2）— Node 端入口。
// 用法：npm run validate:content  或  node scripts/validate-content.js
// 用 vm 載入根目錄 content.js（正本；public/ 是 deploy.sh 同步出來的複本），
// 跑同一支 validateContent()：有結構錯誤就 exit 1（可接 CI／部署前檢查），只有待補則 exit 0。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadContent(file) {
  const src = fs.readFileSync(file, 'utf8');
  // 靜音 content.js 載入時自己印的 console（避免重複輸出），結果用回傳值拿
  const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} } });
  vm.runInContext(src, ctx, { filename: file });
  // content.js 的頂層 const 在 vm 的全域詞法範圍，再跑一段取出需要的東西
  return vm.runInContext('({ validateContent, BOOKS, CHAPTERS, SCHEDULE, BIBLE_LINKS, BOOK_INTRO })', ctx);
}

function main() {
  const file = process.argv[2] || path.join(__dirname, '..', 'content.js');
  const { validateContent } = loadContent(file);
  const { errors, warns } = validateContent();
  errors.forEach(m => console.error('✗ ' + m));
  warns.forEach(m => console.warn('· ' + m));
  console.log(`內容自檢：${errors.length} 條結構錯誤、${warns.length} 條待補（${path.relative(process.cwd(), file)}）`);
  process.exit(errors.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = { loadContent };
