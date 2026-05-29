#!/usr/bin/env node
// Bible-game 玩家分眾資料（E1）具名清單
// 用法: npm run profiles
// 需要 Firebase CLI 已登入 (firebase login)
//
// 為什麼跟 analyze 分開：
//   analyze 的區塊 ⑦ 只印「彙總分布」（年齡層幾人、教會幾人），不攤名字 ── 符合最小揭露。
//   這支腳本是「具名」清單，列出每位填了 E1 的玩家 + 填了什麼，給 W23 人工轉介流程用
//   （district 牧區 / groupName 小組 兩欄玩家填寫時就知道是給團隊牽線用，本來就是具名）。
//   要查名字才跑這支，不混進每日報告。

const { PROJECT, getAccessToken } = require('./_shared');

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// ── Firestore REST helpers（與 analyze-feedback.js 同一套寫法）──
function parseFirestoreValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.nullValue !== undefined) return null;
  if (v.mapValue) {
    const obj = {};
    for (const [k, mv] of Object.entries(v.mapValue.fields || {})) obj[k] = parseFirestoreValue(mv);
    return obj;
  }
  if (v.arrayValue) return (v.arrayValue.values || []).map(parseFirestoreValue);
  return null;
}
function parseDoc(doc) {
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields || {})) obj[k] = parseFirestoreValue(v);
  return obj;
}
async function fetchCollection(token, collection) {
  const docs = [];
  let pageToken = '';
  while (true) {
    const url = `${FIRESTORE_BASE}/${collection}?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    if (body.documents) docs.push(...body.documents);
    if (body.nextPageToken) { pageToken = body.nextPageToken; } else break;
  }
  return docs;
}
async function fetchSubDoc(token, userId, subcol, docId) {
  const url = `${FIRESTORE_BASE}/users/${userId}/${subcol}/${docId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (body.fields) return parseDoc(body);
  return null;
}

// ── E1 欄位值域中文標籤（對應 bible-game-v2.html PROFILE_NUDGE_FIELDS）──
const AGE_LABELS = {
  under_jh: '國中以下', high_school: '高中職', college: '大專 / 大學',
  young_25_35: '社青 25-35', middle_35_50: '中年 35-50',
  senior_50_65: '熟齡 50-65', elder_65_plus: '樂齡 65+',
};
const CHURCH_LABELS = { daguang: '大光教會', other: '其他教會', none: '尚未屬會' };
const HABIT_LABELS = { stable: '穩定每天', intermittent: '斷續', beginner: '新手摸索', starting: '想開始' };
const SEG_FIELDS = ['ageGroup', 'churchKey', 'district', 'groupName', 'devotionHabit'];

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d)) return '—';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function main() {
  console.log('正在取得 Firebase 憑證...');
  const token = await getAccessToken();

  console.log('正在讀取玩家與 profile/data...\n');
  const userDocs = await fetchCollection(token, 'users');
  const players = userDocs
    .map(d => ({ uid: d.name.split('/').pop(), ...parseDoc(d) }))
    .filter(p => p.setup);

  // 批次拉每位玩家的 profile/data
  const rows = [];
  const batchSize = 10;
  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize);
    const profs = await Promise.all(batch.map(p => fetchSubDoc(token, p.uid, 'profile', 'data')));
    profs.forEach((prof, idx) => {
      if (!prof) return;
      const filled = SEG_FIELDS.filter(f => prof[f] && String(prof[f]).trim());
      if (filled.length === 0) return;
      rows.push({ name: batch[idx].name || '(無暱稱)', prof, filledCount: filled.length });
    });
  }

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   👤  E1 玩家分眾資料具名清單（人工轉介用） ║');
  console.log('╚══════════════════════════════════════════╝\n');

  if (rows.length === 0) {
    console.log('（尚無玩家填寫任何 E1 分眾欄位）\n');
    return;
  }

  // 填越多欄的排前面（轉介價值越高）
  rows.sort((a, b) => b.filledCount - a.filledCount);

  console.log(`填了 E1 分眾資料的玩家：共 ${rows.length}/${players.length} 位\n`);
  rows.forEach(r => {
    const p = r.prof;
    const parts = [];
    if (p.ageGroup)      parts.push(`年齡:${AGE_LABELS[p.ageGroup] || p.ageGroup}`);
    if (p.churchKey)     parts.push(`教會:${CHURCH_LABELS[p.churchKey] || p.churchKey}`);
    if (p.devotionHabit) parts.push(`習慣:${HABIT_LABELS[p.devotionHabit] || p.devotionHabit}`);
    if (p.district)      parts.push(`牧區:${p.district}`);
    if (p.groupName)     parts.push(`小組:${p.groupName}`);
    console.log(`  ${r.name}　(${r.filledCount}/5 欄，更新 ${fmtDate(p.profileUpdatedAt)})`);
    console.log(`     ${parts.join('　')}`);
  });

  // 轉介重點：有填牧區或小組的（團隊可主動牽線）
  const referable = rows.filter(r => (r.prof.district && r.prof.district.trim()) || (r.prof.groupName && r.prof.groupName.trim()));
  console.log(`\n── 可人工轉介（有填牧區或小組）: ${referable.length} 位 ──`);
  if (referable.length === 0) {
    console.log('  （目前無人填寫牧區／小組 ── 靠領獎後 nudge 持續累積）');
  } else {
    referable.forEach(r => {
      const tags = [];
      if (r.prof.district) tags.push(`牧區 ${r.prof.district}`);
      if (r.prof.groupName) tags.push(`小組 ${r.prof.groupName}`);
      console.log(`  ${r.name}：${tags.join('，')}`);
    });
  }
  console.log('');
}

main().catch(e => {
  console.error('❌ 錯誤:', e.message);
  process.exit(1);
});
