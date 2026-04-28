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
  if (v.mapValue) {
    const obj = {};
    for (const [k, mv] of Object.entries(v.mapValue.fields || {})) {
      obj[k] = parseFirestoreValue(mv);
    }
    return obj;
  }
  if (v.arrayValue) {
    return (v.arrayValue.values || []).map(parseFirestoreValue);
  }
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

// ── Firestore subcollection fetch ────────────────────────

async function fetchSubDoc(token, userId, subcol, docId) {
  const url = `${FIRESTORE_BASE}/users/${userId}/${subcol}/${docId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (body.fields) return parseDoc(body);
  return null;
}

// ── Player progress analysis ────────────────────────────

async function analyzeProgress(token, users) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       📊  靈修進度分析                   ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Fetch all user main docs
  const userDocs = await fetchCollection(token, 'users');
  const players = userDocs.map(d => {
    const data = parseDoc(d);
    const uid = d.name.split('/').pop();
    return { uid, ...data };
  }).filter(p => p.setup);

  console.log(`已建立角色的玩家: ${players.length} 人\n`);

  // Streak distribution
  console.log('── 連續天數分布 ──');
  const streaks = players.map(p => p.streak || 0).sort((a,b) => b-a);
  const streakBuckets = { '0天': 0, '1-2天': 0, '3-6天': 0, '7-13天': 0, '14-29天': 0, '30天+': 0 };
  streaks.forEach(s => {
    if (s === 0) streakBuckets['0天']++;
    else if (s <= 2) streakBuckets['1-2天']++;
    else if (s <= 6) streakBuckets['3-6天']++;
    else if (s <= 13) streakBuckets['7-13天']++;
    else if (s <= 29) streakBuckets['14-29天']++;
    else streakBuckets['30天+']++;
  });
  const maxBucket = Math.max(...Object.values(streakBuckets), 1);
  Object.entries(streakBuckets).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(7)} ${bar(v, maxBucket).padEnd(20)} ${v} 人`);
  });

  // Level distribution
  console.log('\n── 等級分布 ──');
  const levels = {};
  players.forEach(p => { const lv = p.level || 1; levels[lv] = (levels[lv] || 0) + 1; });
  const maxLv = Math.max(...Object.values(levels), 1);
  Object.entries(levels).sort((a,b) => Number(a[0]) - Number(b[0])).forEach(([lv, n]) => {
    console.log(`  Lv.${lv.padEnd(3)} ${bar(n, maxLv).padEnd(20)} ${n} 人`);
  });

  // Chapter completion ranking
  console.log('\n── 章節完成排行（最多人完成的章節）──');
  const chapterCount = {};
  players.forEach(p => {
    if (p.completed && typeof p.completed === 'object') {
      Object.keys(p.completed).forEach(ch => { chapterCount[ch] = (chapterCount[ch] || 0) + 1; });
    }
  });
  const sortedChapters = Object.entries(chapterCount).sort((a,b) => b[1] - a[1]);
  const maxCh = sortedChapters.length > 0 ? sortedChapters[0][1] : 1;
  sortedChapters.slice(0, 15).forEach(([ch, n]) => {
    console.log(`  ${ch.padEnd(10)} ${bar(n, maxCh).padEnd(20)} ${n} 人`);
  });
  if (sortedChapters.length > 15) console.log(`  ...（共 ${sortedChapters.length} 章有人完成）`);

  // Equipment count
  console.log('\n── 裝備收集排行（前10名）──');
  const itemRank = players.map(p => ({
    name: p.name || '?',
    count: Array.isArray(p.items) ? p.items.length : 0,
    level: p.level || 1,
    streak: p.streak || 0,
  })).sort((a,b) => b.count - a.count);
  itemRank.slice(0, 10).forEach((p, i) => {
    console.log(`  ${String(i+1).padStart(2)}. ${p.name.padEnd(12)} ${p.count} 件  Lv.${p.level}  🔥${p.streak}天`);
  });

  // Fetch stats for each user
  console.log('\n── 靈修行為統計 ──');
  let totalReflections = 0, totalReads = 0, totalShares = 0, totalMakeups = 0;
  let totalMornings = 0, totalNights = 0, totalDaysAll = 0;
  let statsCount = 0;

  for (const p of players) {
    const stats = await fetchSubDoc(token, p.uid, 'stats', 'data');
    if (stats) {
      statsCount++;
      totalReflections += stats.reflectionCount || 0;
      totalReads += stats.readCount || 0;
      totalShares += stats.shareCount || 0;
      totalMakeups += stats.makeupCount || 0;
      totalMornings += stats.morningCount || 0;
      totalNights += stats.nightCount || 0;
      totalDaysAll += stats.totalDays || 0;
    }
  }

  if (statsCount > 0 && totalDaysAll > 0) {
    console.log(`  已登入玩家數據: ${statsCount} 人`);
    console.log(`  累計靈修天數:   ${totalDaysAll}`);
    console.log(`  默想填寫率:     ${totalReflections}/${totalDaysAll} (${pct(totalReflections, totalDaysAll)})`);
    console.log(`  完整閱讀率:     ${totalReads}/${totalDaysAll} (${pct(totalReads, totalDaysAll)})`);
    console.log(`  分享次數:       ${totalShares}`);
    console.log(`  補讀次數:       ${totalMakeups}`);
    console.log(`\n── 靈修時段分布 ──`);
    const timeTotal = totalMornings + totalNights;
    const otherTime = totalDaysAll - timeTotal;
    console.log(`  🌅 清晨(05-09)  ${bar(totalMornings, totalDaysAll).padEnd(20)} ${totalMornings} 次`);
    console.log(`  ☀️ 日間(09-22)  ${bar(otherTime, totalDaysAll).padEnd(20)} ${otherTime} 次`);
    console.log(`  🌙 深夜(22-05)  ${bar(totalNights, totalDaysAll).padEnd(20)} ${totalNights} 次`);
  }

  // Achievement stats
  console.log('\n── 成就解鎖統計 ──');
  const achCount = {};
  let achPlayersChecked = 0;
  for (const p of players) {
    const ach = await fetchSubDoc(token, p.uid, 'achievements', 'data');
    if (ach && ach.unlockedAt && typeof ach.unlockedAt === 'object') {
      achPlayersChecked++;
      Object.keys(ach.unlockedAt).forEach(key => {
        if (ach.unlockedAt[key]) achCount[key] = (achCount[key] || 0) + 1;
      });
    }
  }
  if (Object.keys(achCount).length > 0) {
    const sortedAch = Object.entries(achCount).sort((a,b) => b[1] - a[1]);
    const maxAch = sortedAch[0][1];
    sortedAch.forEach(([key, n]) => {
      console.log(`  ${key.padEnd(18)} ${bar(n, maxAch).padEnd(20)} ${n}/${achPlayersChecked} 人`);
    });
  } else {
    console.log('  （尚無成就解鎖紀錄）');
  }

  // ── 拉所有玩家的 chapters 子集合，給後續內容品質分析用 ──
  console.log('\n正在讀取每章記錄（給內容分析用）...');
  const allChapters = [];
  for (const p of players) {
    const docs = await fetchCollection(token, `users/${p.uid}/chapters`);
    docs.forEach(d => {
      const data = parseDoc(d);
      const key = d.name.split('/').pop();
      allChapters.push({ uid: p.uid, name: p.name, key, ...data });
    });
  }

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       📚  內容品質與行為深度分析         ║');
  console.log('╚══════════════════════════════════════════╝');

  // ── 1. 章節完成 vs 默想填寫缺口 ──────────────────────
  console.log('\n── ① 章節完成 vs 默想填寫缺口 ──');
  const totalChapters = allChapters.length;
  const withReflection = allChapters.filter(c => c.hasReflection).length;
  const noReflection = totalChapters - withReflection;
  console.log(`  總完成章節數:    ${totalChapters}`);
  console.log(`  寫了默想的:      ${withReflection} (${pct(withReflection, totalChapters)})`);
  console.log(`  沒寫默想的:      ${noReflection} (${pct(noReflection, totalChapters)})`);
  if (noReflection > 0) {
    const noReflByCh = {};
    allChapters.filter(c => !c.hasReflection).forEach(c => {
      noReflByCh[c.key] = (noReflByCh[c.key] || 0) + 1;
    });
    const sorted = Object.entries(noReflByCh).sort((a,b) => b[1]-a[1]).slice(0, 5);
    console.log(`  沒寫默想的章節分布（前 5）：`);
    sorted.forEach(([k, n]) => console.log(`    ${k.padEnd(10)} ${n} 次`));
  }

  // ── 2. 情境題選項分布 ──────────────────────────────
  console.log('\n── ② 情境題選項分布（≥3 人，前 12 章）──');
  const choiceStats = {};
  allChapters.forEach(c => {
    if (!['A','B','C','D'].includes(c.choiceSelected)) return;
    choiceStats[c.key] = choiceStats[c.key] || { A:0, B:0, C:0, D:0, total:0 };
    choiceStats[c.key][c.choiceSelected]++;
    choiceStats[c.key].total++;
  });
  const sortedChoice = Object.entries(choiceStats)
    .filter(([k, s]) => s.total >= 3)
    .sort((a, b) => b[1].total - a[1].total).slice(0, 12);
  sortedChoice.forEach(([k, s]) => {
    const dist = ['A','B','C','D'].map(opt => `${opt}:${String(s[opt]).padStart(2)}`).join('  ');
    console.log(`  ${k.padEnd(10)} 共 ${String(s.total).padStart(2)} 人  ${dist}`);
  });

  // ── 3. 章節參與深度（默想填寫率排行）──────────────────
  console.log('\n── ③ 章節參與深度（默想填寫率，至少 3 人完成才列入）──');
  const participation = {};
  allChapters.forEach(c => {
    participation[c.key] = participation[c.key] || { completed: 0, withReflection: 0 };
    participation[c.key].completed++;
    if (c.hasReflection) participation[c.key].withReflection++;
  });
  const sortedPart = Object.entries(participation)
    .filter(([k, s]) => s.completed >= 3)
    .sort((a, b) => (b[1].withReflection / b[1].completed) - (a[1].withReflection / a[1].completed))
    .slice(0, 12);
  sortedPart.forEach(([k, s]) => {
    const rate = Math.round(s.withReflection / s.completed * 100);
    console.log(`  ${k.padEnd(10)} ${s.withReflection}/${s.completed}  (${rate}%)`);
  });

  // ── 4. AI 回應品質：fallback 集中在哪些章節 ──────────
  const FALLBACK_TEXT = '謝謝你願意把心裡的話帶到神面前。祂看見了。';
  console.log('\n── ④ AI 回應品質（fallback 集中章節）──');
  const withAi = allChapters.filter(c => c.aiResponse);
  if (withAi.length === 0) {
    console.log('  （尚無 AI 回應紀錄）');
  } else {
    const fallbackByCh = {};
    let totalFallback = 0;
    withAi.forEach(c => {
      if (c.aiResponse === FALLBACK_TEXT) {
        fallbackByCh[c.key] = (fallbackByCh[c.key] || 0) + 1;
        totalFallback++;
      }
    });
    console.log(`  AI 回應紀錄總數:  ${withAi.length}`);
    console.log(`  收到 fallback:    ${totalFallback} (${pct(totalFallback, withAi.length)})`);
    if (totalFallback > 0) {
      const sortedFb = Object.entries(fallbackByCh).sort((a,b) => b[1]-a[1]).slice(0, 8);
      console.log(`  fallback 章節分布（前 8）：`);
      sortedFb.forEach(([k, n]) => console.log(`    ${k.padEnd(10)} ${n} 次`));
    } else {
      console.log(`  ✨ 沒有任何 fallback 紀錄`);
    }
    console.log(`  注意：本指標僅看 chapters/{key}.aiResponse 最後一次寫入，無法看歷史改寫`);
  }

  // ── 5. 裝備收集偏好（前 15 件） ──────────────────────
  console.log('\n── ⑤ 裝備收集偏好（前 15 件最多人擁有）──');
  const itemCount = {};
  players.forEach(p => {
    if (!Array.isArray(p.items)) return;
    p.items.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const id = `${item.emoji || ''} ${item.name || ''}`.trim();
      if (id) itemCount[id] = (itemCount[id] || 0) + 1;
    });
  });
  const sortedItems = Object.entries(itemCount).sort((a,b) => b[1]-a[1]).slice(0, 15);
  if (sortedItems.length === 0) {
    console.log('  （尚無裝備資料）');
  } else {
    const maxItem = sortedItems[0][1];
    sortedItems.forEach(([id, n]) => {
      console.log(`  ${id.padEnd(20)} ${bar(n, maxItem).padEnd(15)} ${n} 人`);
    });
  }
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

  console.log('\n正在讀取玩家進度與統計...');
  await analyzeProgress(token, users);

  console.log('\n✅ 分析完成\n');
}

main().catch(e => {
  console.error('❌ 錯誤:', e.message);
  process.exit(1);
});
