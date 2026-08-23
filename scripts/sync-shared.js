#!/usr/bin/env node
// 共用純邏輯檔同步（issue #5 / #6）
// 正本在 repo 根目錄 shared/，三個部署單元（玩家 public/、後台 admin/、functions/）互相看不到，
// 所以用這支腳本把正本「原封不動」複製過去；test/shared-sync.test.js 會檢查複本沒漂移。
// 用法：npm run sync-shared   或   node scripts/sync-shared.js [--check]
//   --check：只比對不寫入，任何複本不一致就 exit 1（deploy.sh 與測試用）
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// 正本 → 複本清單。新增共用檔就在這裡加一列。
const SHARED_FILES = [
  {
    src: 'shared/feedback-schema.js',
    copies: ['public/shared/feedback-schema.js', 'admin/shared/feedback-schema.js', 'functions/lib/feedback-schema.js'],
  },
];

function sync({ check = false } = {}) {
  const drift = [];
  for (const f of SHARED_FILES) {
    const srcPath = path.join(ROOT, f.src);
    const content = fs.readFileSync(srcPath);
    for (const c of f.copies) {
      const dst = path.join(ROOT, c);
      const same = fs.existsSync(dst) && fs.readFileSync(dst).equals(content);
      if (same) continue;
      drift.push(c);
      if (!check) {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.writeFileSync(dst, content);
      }
    }
  }
  return drift;
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  const drift = sync({ check });
  if (check) {
    if (drift.length) {
      console.error('✖ 共用檔複本與正本不一致（請跑 npm run sync-shared）：\n  ' + drift.join('\n  '));
      process.exit(1);
    }
    console.log('✓ 共用檔複本皆與正本一致');
  } else {
    console.log(drift.length ? '▶ 已同步：\n  ' + drift.join('\n  ') : '▶ 共用檔皆已是最新');
  }
}

module.exports = { SHARED_FILES, sync };
