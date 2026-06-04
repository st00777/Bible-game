#!/usr/bin/env node
// W22 B1 事件流 timeline 落地驗證腳本
// 用法：
//   node scripts/verify-b1-events.js                # 沒給 uid → 列最近 1 小時有 events 寫入的 uid + 筆數
//   node scripts/verify-b1-events.js <uid>         # 給 uid → 列該 uid 最近 20 筆 events 詳情 + 9 事件統計
//
// 認證沿用 _shared.js（從 ~/.config/configstore/firebase-tools.json 取 OAuth refresh token）

const { PROJECT, getAccessToken } = require('./_shared');

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// 9 個核心事件名（依 GA4 既有命名統一）
const CORE_EVENTS = [
  'app_open',
  'chapter_select',
  'question_view',
  'choice_confirm',
  'read_chapter',          // = read_verse_view（GA4 既有名）
  'submit_reflection',     // = reflection_submit（GA4 既有名）
  'ai_response_received',
  'complete_devotional',
  'app_leave',
];
const NO_CHAPTER_EVENTS = ['app_open', 'app_leave'];

// ── Firestore REST value parser（同 analyze-feedback.js 樣式）──
function parseValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.nullValue !== undefined) return null;
  if (v.mapValue) {
    const obj = {};
    for (const [k, mv] of Object.entries(v.mapValue.fields || {})) obj[k] = parseValue(mv);
    return obj;
  }
  if (v.arrayValue) return (v.arrayValue.values || []).map(parseValue);
  return null;
}

function parseDoc(doc) {
  const fields = doc.fields || {};
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = parseValue(v);
  // doc.name = projects/.../documents/users/{uid}/events/{docId}
  out._path = doc.name;
  out._docId = doc.name.split('/').pop();
  const m = doc.name.match(/\/users\/([^/]+)\/events\//);
  out._uid = m ? m[1] : null;
  return out;
}

// ── Firestore runQuery 對單一 user 子集合（最近 N 筆） ─────
async function listUserEvents(token, uid, limit = 20) {
  const url = `${FIRESTORE_BASE}/users/${uid}:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'events' }],
      orderBy: [{ field: { fieldPath: 'ts' }, direction: 'DESCENDING' }],
      limit,
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`listUserEvents HTTP ${res.status}: ${await res.text()}`);
  }
  const arr = await res.json();
  return arr.filter(r => r.document).map(r => parseDoc(r.document));
}

// ── 列所有 users（用於 mode A：逐個 user 撈 events 子集合）──
async function listAllUsers(token) {
  const users = [];
  let nextPageToken = '';
  while (true) {
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchGet?maxResults=500${nextPageToken ? '&nextPageToken=' + nextPageToken : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    if (body.users) users.push(...body.users);
    if (body.nextPageToken) { nextPageToken = body.nextPageToken; } else break;
  }
  return users;
}

// ── 對單一 user 撈最近 1h events ──
async function countRecentEventsForUid(token, uid, sinceIso) {
  const url = `${FIRESTORE_BASE}/users/${uid}:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'events' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'ts' },
          op: 'GREATER_THAN_OR_EQUAL',
          value: { timestampValue: sinceIso },
        },
      },
      orderBy: [{ field: { fieldPath: 'ts' }, direction: 'DESCENDING' }],
      limit: 100,
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { count: 0, types: new Set(), latest: null };
  const arr = await res.json();
  const docs = arr.filter(r => r.document).map(r => parseDoc(r.document));
  const types = new Set(docs.map(d => d.type));
  return {
    count: docs.length,
    types,
    latest: docs[0]?.ts || null,
  };
}

// ── Mode A：列最近 1h 有 events 寫入的 uid ──
async function modeListRecent(token) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  console.log(`\n🔍 掃描最近 1 小時內（${oneHourAgo} 起）有 events 寫入的 uid ...`);
  console.log(`(透過 Auth API 列所有 user、逐個查 events 子集合，預期耗時依玩家數而定)\n`);

  const users = await listAllUsers(token);
  console.log(`Auth 端共 ${users.length} 個 user。掃描中 ...\n`);

  const hits = [];
  for (const u of users) {
    const { count, types, latest } = await countRecentEventsForUid(token, u.localId, oneHourAgo);
    if (count > 0) hits.push({ uid: u.localId, email: u.email || '(無 email)', count, types, latest });
  }
  hits.sort((a, b) => (b.latest || '').localeCompare(a.latest || ''));

  if (hits.length === 0) {
    console.log('❌ 最近 1 小時內無 user 寫入 events。');
    console.log('   可能原因：B1 未上線、玩家還沒跑流程、或寫入有 silent failure。');
    return;
  }

  console.log(`✅ 共 ${hits.length} 個 user 在最近 1h 內有 events 寫入：\n`);
  for (const h of hits) {
    console.log(`  uid: ${h.uid}`);
    console.log(`    email: ${h.email}`);
    console.log(`    最新 ts: ${h.latest}`);
    console.log(`    筆數: ${h.count}`);
    console.log(`    出現的 type: ${[...h.types].sort().join(', ')}`);
    console.log();
  }
  console.log('👉 認出你那筆 uid 後，再執行：\n   node scripts/verify-b1-events.js <uid>');
}

// ── Mode B：給 uid → 詳情 + 9 事件統計 ──
async function modeUidDetail(token, uid) {
  console.log(`\n🔍 撈 uid=${uid} 最近 20 筆 events ...\n`);
  const docs = await listUserEvents(token, uid, 20);
  if (docs.length === 0) {
    console.log(`❌ uid=${uid} 沒有 events 子集合，或子集合為空。`);
    return;
  }

  // 詳情
  console.log(`📋 最近 ${docs.length} 筆（ts desc）：\n`);
  for (const d of docs) {
    const ts = d.ts || '(no ts)';
    const sid = d.sessionId ? d.sessionId.slice(0, 8) + '…' : '(no sessionId)';
    const ch = d.chapter ? `ch=${d.chapter}` : '(no chapter)';
    const meta = d.metadata ? JSON.stringify(d.metadata) : '';
    console.log(`  ${ts}  ${d.type.padEnd(22)} sid=${sid}  ${ch}  ${meta}`);
  }

  // 9 事件統計
  console.log('\n📊 9 核心事件覆蓋狀況：\n');
  const seen = new Set(docs.map(d => d.type));
  const missing = [];
  for (const ev of CORE_EVENTS) {
    const ok = seen.has(ev) ? '✅' : '❌';
    console.log(`  ${ok}  ${ev}`);
    if (!seen.has(ev)) missing.push(ev);
  }
  if (missing.length === 0) {
    console.log('\n🎉 9 個核心事件全部到齊');
  } else {
    console.log(`\n⚠️  缺 ${missing.length} 個事件：${missing.join(', ')}`);
  }

  // chapter 可選驗證
  console.log('\n📊 不帶 chapter 的事件（app_open / app_leave）：\n');
  for (const ev of NO_CHAPTER_EVENTS) {
    const samples = docs.filter(d => d.type === ev);
    if (samples.length === 0) {
      console.log(`  ⚠️  ${ev}: 本批 20 筆內沒有樣本`);
      continue;
    }
    const hasChapter = samples.some(d => d.chapter != null);
    console.log(`  ${hasChapter ? '⚠️ ' : '✅'} ${ev}: ${samples.length} 筆樣本、chapter 欄位 ${hasChapter ? '存在（不符預期）' : '正確留空'}`);
  }

  // sessionId 一致性
  console.log('\n📊 sessionId 一致性：\n');
  const sessionGroups = {};
  for (const d of docs) {
    const sid = d.sessionId || '(missing)';
    (sessionGroups[sid] ||= []).push(d.type);
  }
  const sids = Object.keys(sessionGroups);
  console.log(`  本批 20 筆共出現 ${sids.length} 個 sessionId`);
  for (const sid of sids) {
    const evs = sessionGroups[sid];
    console.log(`    ${sid.slice(0, 8)}…  ${evs.length} 筆: ${evs.join(' → ')}`);
  }
  if (sids.length === 1) {
    console.log('  ✅ 全部來自同一個 session（剛跑完的單次流程）');
  } else if (sids.includes('(missing)')) {
    console.log('  ❌ 有 events 缺 sessionId 欄位（B1 機制 bug）');
  } else {
    console.log(`  ℹ️  跨 ${sids.length} 個 session（可能含早於本次的歷史事件、或 30min 過期換新）`);
  }

  // document 結構必要欄位完整性
  console.log('\n📊 document 結構完整性（type/ts/sessionId 必有）：\n');
  let structOk = 0, structFail = 0;
  for (const d of docs) {
    if (d.type && d.ts && d.sessionId) structOk++;
    else { structFail++; console.log(`  ❌ 缺欄位 ${d._docId}: type=${d.type} ts=${d.ts} sid=${d.sessionId}`); }
  }
  console.log(`  ✅ ${structOk}/${docs.length} 筆結構完整、❌ ${structFail} 筆缺欄位`);
}

// ── main ───────────────────────────────────────────────────
async function main() {
  const uid = process.argv[2];
  const token = await getAccessToken();
  if (!uid) {
    await modeListRecent(token);
  } else {
    await modeUidDetail(token, uid);
  }
}

main().catch(e => {
  console.error('腳本失敗：', e.message);
  process.exit(1);
});
