#!/usr/bin/env node
// Bible-game 資料分析腳本
// 用法: npm run analyze
// 需要 Firebase CLI 已登入 (firebase login)

const fs = require('fs');
const os = require('os');
const path = require('path');

// ── Auth: 從 Firebase CLI 取得 access token ──────────────

async function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('找不到 Firebase CLI 設定，請先執行 firebase login');
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const refreshToken = config.tokens?.refresh_token;
  if (!refreshToken) throw new Error('Firebase CLI 沒有 refresh token，請重新 firebase login');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('無法取得 access token: ' + JSON.stringify(data));
  return data.access_token;
}

// ── Firestore REST helpers ───────────────────────────────

const PROJECT = 'bible-game-bcb84';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

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

function parseFirestoreValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.nullValue !== undefined) return null;
  return null;
}

function parseDoc(doc) {
  const fields = doc.fields || {};
  const obj = {};
  for (const [k, v] of Object.entries(fields)) {
    obj[k] = parseFirestoreValue(v);
  }
  return obj;
}

// ── Firebase Auth REST ───────────────────────────────────

async function fetchAllUsers(token) {
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

// ── Formatting helpers ───────────────────────────────────

function pct(n, total) {
  return total === 0 ? '0%' : Math.round(n / total * 100) + '%';
}

function bar(n, max) {
  const width = max === 0 ? 0 : Math.round(n / max * 20);
  return '█'.repeat(width);
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function dateOnly(isoStr) {
  if (!isoStr) return '—';
  // Firebase Auth returns epoch millis as string; Firestore returns ISO
  const d = /^\d{10,}$/.test(isoStr) ? new Date(Number(isoStr)) : new Date(isoStr);
  if (isNaN(d)) return isoStr;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Analysis ─────────────────────────────────────────────

function analyzeFeedback(rawDocs) {
  const docs = rawDocs.map(parseDoc);
  const testDocs = docs.filter(d => d.message && /測試|test/i.test(d.message));
  const realDocs = docs.filter(d => !d.message || !/測試|test/i.test(d.message));

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       🏜️  曠野呼聲回饋分析              ║');
  console.log('╚══════════════════════════════════════════╝\n');

  console.log(`總回饋筆數: ${docs.length} 筆（真實 ${realDocs.length} + 測試 ${testDocs.length}）\n`);

  // Mood
  const moodOrder = ['平靜', '有動力', '有點累', '經文太難', '其他'];
  const moodEmoji = { '平靜': '😇', '有動力': '🔥', '有點累': '😴', '經文太難': '🤔', '其他': '✏️' };
  const moodCount = {};
  realDocs.forEach(d => { moodCount[d.mood] = (moodCount[d.mood] || 0) + 1; });
  const maxMood = Math.max(...Object.values(moodCount), 1);

  console.log('── 心情分布（排除測試）──');
  moodOrder.forEach(m => {
    const c = moodCount[m] || 0;
    console.log(`  ${moodEmoji[m]} ${m.padEnd(5)} ${bar(c, maxMood).padEnd(20)} ${c} 筆 (${pct(c, realDocs.length)})`);
  });

  // Category
  const catOrder = ['靈性感受', '遊戲體驗', '我的異象', '其他'];
  const catEmoji = { '靈性感受': '🙏', '遊戲體驗': '🎮', '我的異象': '💡', '其他': '✏️' };
  const catCount = {};
  realDocs.forEach(d => { catCount[d.category] = (catCount[d.category] || 0) + 1; });
  const maxCat = Math.max(...Object.values(catCount), 1);

  console.log('\n── 分類分布（排除測試）──');
  catOrder.forEach(c => {
    const n = catCount[c] || 0;
    console.log(`  ${catEmoji[c]} ${c.padEnd(5)} ${bar(n, maxCat).padEnd(20)} ${n} 筆 (${pct(n, realDocs.length)})`);
  });

  // Anon
  const anon = realDocs.filter(d => d.isAnonymous).length;
  console.log('\n── 匿名 vs 具名（排除測試）──');
  console.log(`  🫥 匿名  ${bar(anon, realDocs.length).padEnd(20)} ${anon} 筆 (${pct(anon, realDocs.length)})`);
  console.log(`  🆔 具名  ${bar(realDocs.length - anon, realDocs.length).padEnd(20)} ${realDocs.length - anon} 筆 (${pct(realDocs.length - anon, realDocs.length)})`);

  // Per day
  const dayCount = {};
  docs.forEach(d => { const day = dateOnly(d.createdAt); dayCount[day] = (dayCount[day] || 0) + 1; });
  console.log('\n── 每日回饋數（含測試）──');
  Object.entries(dayCount).sort().forEach(([day, n]) => {
    console.log(`  ${day}  ${'█'.repeat(n)} ${n} 筆`);
  });

  // Messages
  const hasMsg = docs.filter(d => d.message && d.message.length > 0).length;
  console.log(`\n── 文字留言率: ${hasMsg}/${docs.length} (${pct(hasMsg, docs.length)}) ──`);

  console.log('\n── 真實留言 ──');
  if (realDocs.length === 0) {
    console.log('  （無）');
  } else {
    realDocs.filter(d => d.message).forEach(d => {
      const name = d.isAnonymous ? '匿名' : (d.displayName || '具名');
      console.log(`  ${formatDate(d.createdAt)}  ${moodEmoji[d.mood] || '?'}  [${name}]  ${d.message}`);
    });
  }

  if (testDocs.length > 0) {
    console.log('\n── 測試留言（自動過濾）──');
    testDocs.forEach(d => {
      const name = d.isAnonymous ? '匿名' : (d.displayName || '具名');
      console.log(`  ${formatDate(d.createdAt)}  ${moodEmoji[d.mood] || '?'}  [${name}]  ${d.message}`);
    });
  }
}

function analyzeUsers(users) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       👥  玩家登入資訊分析              ║');
  console.log('╚══════════════════════════════════════════╝\n');

  console.log(`總註冊人數: ${users.length}\n`);

  // Login method
  const google = users.filter(u => !u.localId?.startsWith('line:'));
  const line = users.filter(u => u.localId?.startsWith('line:'));

  console.log('── 登入方式分布 ──');
  console.log(`  🔑 Google  ${bar(google.length, users.length).padEnd(20)} ${google.length} 人 (${pct(google.length, users.length)})`);
  console.log(`  💬 LINE    ${bar(line.length, users.length).padEnd(20)} ${line.length} 人 (${pct(line.length, users.length)})`);

  // Per day signups
  const dayCount = {};
  users.forEach(u => {
    const day = dateOnly(u.createdAt);
    dayCount[day] = (dayCount[day] || 0) + 1;
  });
  console.log('\n── 每日新增玩家 ──');
  Object.entries(dayCount).sort().forEach(([day, n]) => {
    console.log(`  ${day}  ${'█'.repeat(n)} ${n} 人`);
  });

  // Active users (created != last login)
  const active = users.filter(u => {
    if (!u.createdAt || !u.lastLoginAt) return false;
    return dateOnly(u.createdAt) !== dateOnly(u.lastLoginAt);
  });

  console.log(`\n── 持續活躍玩家（建立日 ≠ 最後登入日）: ${active.length} 人 ──`);
  if (active.length === 0) {
    console.log('  （無）');
  } else {
    active.forEach(u => {
      const method = u.localId?.startsWith('line:') ? '💬LINE' : '🔑Google';
      const name = u.displayName || u.email || u.localId;
      console.log(`  ${method}  ${name}`);
      console.log(`       建立: ${dateOnly(u.createdAt)}  最後登入: ${dateOnly(u.lastLoginAt)}`);
    });
  }

  // Full user list
  console.log('\n── 所有玩家 ──');
  users.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).forEach(u => {
    const method = u.localId?.startsWith('line:') ? '💬' : '🔑';
    const name = u.displayName || u.email || u.localId?.slice(0, 20);
    console.log(`  ${method} ${dateOnly(u.createdAt)}  ${name}`);
  });
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  console.log('正在取得 Firebase 憑證...');
  const token = await getAccessToken();

  console.log('正在讀取 Firestore feedback 集合...');
  const feedbackDocs = await fetchCollection(token, 'feedback');
  analyzeFeedback(feedbackDocs);

  console.log('\n正在讀取 Firebase Authentication 用戶...');
  const users = await fetchAllUsers(token);
  analyzeUsers(users);

  console.log('\n✅ 分析完成\n');
}

main().catch(e => {
  console.error('❌ 錯誤:', e.message);
  process.exit(1);
});
