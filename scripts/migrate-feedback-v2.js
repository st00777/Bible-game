#!/usr/bin/env node
// scripts/migrate-feedback-v2.js
// 把 v1 feedback 文件補上 v2 對話追蹤欄位（status='closed'）
//
// 用法：
//   npm run migrate:feedback-v2          ── dry-run（預設，只列印要改的文件不寫入）
//   npm run migrate:feedback-v2:apply    ── 實際寫入
//
// 行為：idempotent — 已有 status 欄位的文件直接跳過，重複跑也不會重複寫
// 需要 Firebase CLI 已登入 (firebase login)

const { PROJECT, getAccessToken } = require('./_shared');

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const APPLY = process.argv.includes('--apply');

// ── Firestore REST helpers ───────────────────────────────

async function fetchCollection(token, collection) {
  const docs = [];
  let pageToken = '';
  while (true) {
    const url = `${FIRESTORE_BASE}/${collection}?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(`讀取 ${collection} 失敗 HTTP ${res.status}: ${await res.text()}`);
    }
    const body = await res.json();
    if (body.documents) docs.push(...body.documents);
    if (body.nextPageToken) { pageToken = body.nextPageToken; } else break;
  }
  return docs;
}

// PATCH 單筆文件，updateMask 限定只動指定欄位（不影響 v1 既有欄位）
async function patchFeedbackV2(token, docId, lastMessageAtRaw) {
  const fields = ['status','wantReply','lastMessageAt','unreadByPlayer','unreadByAdmin','messageCount'];
  const updateMask = fields.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${FIRESTORE_BASE}/feedback/${encodeURIComponent(docId)}?${updateMask}`;
  const body = {
    fields: {
      status: { stringValue: 'closed' },
      wantReply: { booleanValue: false },
      lastMessageAt: lastMessageAtRaw,
      unreadByPlayer: { booleanValue: false },
      unreadByAdmin: { booleanValue: false },
      messageCount: { integerValue: '0' },
    },
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  console.log('正在取得 Firebase 憑證...');
  const token = await getAccessToken();

  console.log('正在讀取 feedback collection...\n');
  const docs = await fetchCollection(token, 'feedback');

  const total = docs.length;
  let alreadyV2 = 0;
  const toMigrate = [];
  for (const doc of docs) {
    const docId = doc.name.split('/').pop();
    const fields = doc.fields || {};
    if ('status' in fields) {
      alreadyV2++;
      continue;
    }
    toMigrate.push({ docId, createdAt: fields.createdAt });
  }

  const mode = APPLY ? '[APPLY  寫入]' : '[DRY-RUN 不寫入]';
  console.log('╔══════════════════════════════════════════════════╗');
  console.log(`║  Feedback v2 Migration  ${mode.padEnd(24)} ║`);
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log(`總文件數:     ${total}`);
  console.log(`已 v2 跳過:   ${alreadyV2}`);
  console.log(`本次要遷移:   ${toMigrate.length}\n`);

  if (toMigrate.length === 0) {
    console.log('✅ 沒有需要遷移的文件\n');
    return;
  }

  console.log('── 待遷移文件清單 ──');
  toMigrate.forEach(({ docId, createdAt }) => {
    const ts = createdAt?.timestampValue || '(no createdAt — 將用當下時間 fallback)';
    console.log(`  ${docId}  createdAt=${ts}`);
  });
  console.log('');
  console.log('── 預定寫入欄位（每筆都一樣，updateMask 不影響 v1 欄位）──');
  console.log(`  status:         "closed"`);
  console.log(`  wantReply:      false`);
  console.log(`  lastMessageAt:  <該文件的 createdAt>（缺值用當下時間）`);
  console.log(`  unreadByPlayer: false`);
  console.log(`  unreadByAdmin:  false`);
  console.log(`  messageCount:   0\n`);

  if (!APPLY) {
    console.log('💡 dry-run 完成。要實際寫入請執行：npm run migrate:feedback-v2:apply\n');
    return;
  }

  console.log('── 開始寫入（依序處理，單筆失敗不中斷）──');
  let succeeded = 0;
  const failed = [];
  for (const { docId, createdAt } of toMigrate) {
    try {
      const lastMessageAtRaw = createdAt && createdAt.timestampValue
        ? { timestampValue: createdAt.timestampValue }
        : { timestampValue: new Date().toISOString() };
      await patchFeedbackV2(token, docId, lastMessageAtRaw);
      console.log(`  ✅ ${docId}`);
      succeeded++;
    } catch (e) {
      console.log(`  ❌ ${docId}  ${e.message}`);
      failed.push({ docId, error: e.message });
    }
  }

  console.log('\n── 結果 ──');
  console.log(`成功寫入:     ${succeeded}`);
  console.log(`失敗:         ${failed.length}`);
  if (failed.length > 0) {
    console.log('\n失敗清單：');
    failed.forEach(({ docId, error }) => {
      console.log(`  ${docId}  ${error}`);
    });
    process.exit(1);
  }
  console.log('');
}

main().catch(e => {
  console.error('❌ 錯誤:', e.message);
  process.exit(1);
});
