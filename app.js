// ══ 靈修冒險 app.js — 遊戲主邏輯（2026-09-01 D2 自 bible-game-v2.html 抽出）═══════
// 載入順序（皆 defer，依文件順序執行）：firebase SDK ×3 → content.js → 本檔。
// core.js 與 shared/feedback-schema.js 為小型同步 script，先於所有 defer 檔執行。
// 抽出目的：SDK 不再阻塞 HTML parser——冷載入時畫面可先完整渲染，不再「看得到點不動」。
// 正本在 repo 根目錄；deploy.sh sync_public 會同步到 public/。改完跑 npm test（含 app.js 語法守門）。
// ══ FIREBASE ═══════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyC2uJBxG8MvG1_zRF7_R35a1vMFgmnvonQ",
  authDomain: "bible-game-bcb84.firebaseapp.com",
  projectId: "bible-game-bcb84",
  storageBucket: "bible-game-bcb84.firebasestorage.app",
  messagingSenderId: "998309781226",
  appId: "1:998309781226:web:3393ab62963940ef720193"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
let currentUser = null;

// ══ B1 事件流 timeline（W22, users/{uid}/events 雙寫 GA4+Firestore）═══
// 設計方案 2026-04-28 通過、CLAUDE.md「事件流設計方案」章節。
// fire-and-forget；訪客（未登入）不寫；sessionId 用 crypto.randomUUID，
// 頁面 hidden 超過 30 分鐘再回來換新 sessionId。
let _sessionId = null;
let _lastHiddenAt = null;
function _newSessionId() { return crypto.randomUUID(); }
// B1 停留時長：chapter_select 起算的秒數，question_view / choice_confirm / submit_reflection / complete_devotional 各帶一份
let _chapterSelectAt = null;
function _elapsed(params) {
  if (_chapterSelectAt != null) params.elapsedSec = Math.round((Date.now() - _chapterSelectAt) / 1000);
  return params;
}
function writeEventToFirestore(name, params) {
  if (!currentUser) return; // 訪客不記
  if (!_sessionId) _sessionId = _newSessionId();
  const p = params || {};
  const doc = {
    type: name,
    ts: firebase.firestore.FieldValue.serverTimestamp(),
    sessionId: _sessionId,
  };
  if (p.chapter != null) doc.chapter = String(p.chapter);
  // metadata：除 chapter 外其餘欄位整包進去
  const meta = {};
  for (const k in p) { if (k !== 'chapter') meta[k] = p[k]; }
  if (Object.keys(meta).length) doc.metadata = meta;
  // doc id：${Date.now()}-${random4}，避免同毫秒衝突
  const docId = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  db.collection('users').doc(currentUser.uid).collection('events').doc(docId)
    .set(doc)
    .catch(e => console.warn('Event write error:', name, e));
}
// B1（2026-08-30）：離開時停在哪一步（中途離開點）。home＝沒在章內；其餘依本章旗標推
function _currentStep() {
  try {
    if (typeof selectedChapter === 'undefined' || selectedChapter == null) return 'home';
    if (document.getElementById('reward-overlay')?.classList.contains('show')) return 'reward';
    if (reflSubmitted) return 'reflection_done';
    if (choiceConfirmed) return 'reflection';
    if (sessionHasRead) return 'question';
    return 'read';
  } catch (e) { return 'unknown'; }
}
// visibilitychange：hidden 記時間；resume 時若 > 30 min 換新 sessionId
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    _lastHiddenAt = Date.now();
    // B1: app_leave（頁面切到背景／鎖屏／切 tab 都算離開）
    track('app_leave', { sessionId: _sessionId, lastStep: _currentStep() });
  } else if (document.visibilityState === 'visible' && _lastHiddenAt) {
    if (Date.now() - _lastHiddenAt > 30 * 60 * 1000) _sessionId = _newSessionId();
    _lastHiddenAt = null;
  }
});

// Fields to sync with Firestore
const SYNC_FIELDS = ['setup','name','gender','level','xp','streak','hat','body','item','bg','title','items','completed','rewardClaimed','rewardClaimedMigrated'];

let firestoreSaveTimer = null;
function saveToFirestore() {
  if (!currentUser) return;
  clearTimeout(firestoreSaveTimer);
  firestoreSaveTimer = setTimeout(() => {
    const data = {};
    SYNC_FIELDS.forEach(f => { data[f] = state[f]; });
    data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    db.collection('users').doc(currentUser.uid).set(data, { merge: true })
      .catch(e => console.warn('Firestore save error:', e));
  }, 1500);
}

// 領裝備漏領補救（A 小塊）：完成靈修這個關鍵節點專用的「即時寫雲端」。
// 先清掉待發的 debounce、再立即 set，避免完成後 1.5s 內關 app 導致資料沒送出。
// ★ 只給完成節點呼叫；原 saveToFirestore（debounce）完全不動，其他 saveState 照舊。
async function flushToFirestore() {
  if (!currentUser) return;
  clearTimeout(firestoreSaveTimer);
  const data = {};
  SYNC_FIELDS.forEach(f => { data[f] = state[f]; });
  data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  try {
    await db.collection('users').doc(currentUser.uid).set(data, { merge: true });
  } catch(e) { console.warn('Firestore flush error:', e); }
}

async function loadFromFirestore(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      SYNC_FIELDS.forEach(f => { if (data[f] !== undefined) state[f] = data[f]; });
      migrateRewardClaimed();   // 領裝備漏領補救：以背包為基準一次性遷移（載入後、render 前）
      localStorage.setItem('bible_state', JSON.stringify(state));
      // Sync font size from cloud (cloud wins)
      if (data.fontSize) {
        localStorage.setItem('fontSize', data.fontSize);
        applyFontSize(data.fontSize);
      }
      if (typeof renderAvatar === 'function') renderAvatar();
      if (typeof renderChapterGrid === 'function') renderChapterGrid();
      if (typeof renderCalendar === 'function') renderCalendar();
      showToast('☁️ 已從雲端載入進度');
    }
  } catch(e) {
    console.warn('Firestore load error:', e);
  }
}

function safeAvatarImg(url, fallbackEmoji) {
  if (url && /^https:\/\//.test(url)) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    return img;
  }
  return document.createTextNode(fallbackEmoji);
}

function updateAuthUI() {
  const btn = document.getElementById('auth-btn');
  const lineBtn = document.getElementById('line-btn');
  if (!btn) return;
  if (currentUser) {
    const isLine = currentUser.uid.startsWith('line:');
    if (isLine) {
      // LINE user logged in — show LINE button as active, hide Google button
      const name = (currentUser.displayName || '').split(' ')[0] || 'LINE用戶';
      const photo = currentUser.photoURL;
      btn.innerHTML = '🔑 登入';
      btn.classList.remove('logged-in');
      btn.title = 'Google 登入，同步靈修進度';
      btn.style.display = 'none';
      if (lineBtn) {
        lineBtn.textContent = '';
        lineBtn.appendChild(safeAvatarImg(photo, '💬'));
        const sp = document.createElement('span'); sp.className = 'auth-btn-name'; sp.textContent = name;
        lineBtn.appendChild(sp);
        lineBtn.classList.add('logged-in');
        lineBtn.title = `LINE 已登入：${currentUser.displayName || 'LINE用戶'}\n點擊登出`;
        lineBtn.style.display = '';
      }
    } else {
      // Google user logged in — show Google button as active, hide LINE button
      const name = (currentUser.displayName || '').split(' ')[0] || '玩家';
      const photo = currentUser.photoURL;
      btn.textContent = '';
      btn.appendChild(safeAvatarImg(photo, '👤'));
      const sp2 = document.createElement('span'); sp2.className = 'auth-btn-name'; sp2.textContent = name;
      btn.appendChild(sp2);
      btn.classList.add('logged-in');
      btn.title = `已登入：${currentUser.displayName || currentUser.email}\n點擊登出`;
      btn.style.display = '';
      if (lineBtn) lineBtn.style.display = 'none';
    }
  } else {
    btn.innerHTML = '🔑 登入';
    btn.classList.remove('logged-in');
    btn.title = 'Google 登入，同步靈修進度';
    btn.style.display = '';
    if (lineBtn) {
      lineBtn.innerHTML = 'LINE 登入';
      lineBtn.classList.remove('logged-in');
      lineBtn.style.display = '';
    }
  }
}

function handleAuthClick() {
  if (currentUser) {
    if (confirm(`登出 ${currentUser.displayName || currentUser.email}？\n（進度已同步，登出後將使用本機資料）`)) {
      auth.signOut();
    }
  } else {
    auth.signInWithPopup(googleProvider).then(() => {
      track('login', { method: 'google', trigger: 'header' });
    }).catch(e => {
      console.warn('Login error:', e);
      showToast('登入失敗，請再試一次');
    });
  }
}

// ── LINE Login ────────────────────────────────────────────
const LINE_CLIENT_ID = '2009801861';
const LINE_REDIRECT_URI = location.origin + location.pathname;
const LINE_FUNCTION_URL = 'https://linelogin-kvjdptgk7q-uc.a.run.app';
const AI_FUNCTION_URL = 'https://aireflection-kvjdptgk7q-uc.a.run.app';

function handleLineLoginClick() {
  if (currentUser && currentUser.uid.startsWith('line:')) {
    if (confirm(`登出 ${currentUser.displayName || 'LINE 使用者'}？\n（進度已同步，登出後將使用本機資料）`)) {
      auth.signOut();
    }
    return;
  }
  const stateArr = new Uint8Array(16);
  crypto.getRandomValues(stateArr);
  const state = Array.from(stateArr).map(b => b.toString(16).padStart(2, '0')).join('');
  // 用 localStorage（不是 sessionStorage）：LINE 內建瀏覽器可能在新分頁開回呼頁，sessionStorage 會遺失
  localStorage.setItem('line_state', JSON.stringify({ v: state, t: Date.now() }));
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_CLIENT_ID,
    redirect_uri: LINE_REDIRECT_URI,
    state,
    scope: 'profile',
  });
  location.href = `https://access.line.me/oauth2/v2.1/authorize?${params}`;
}

async function handleLineCallback() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (!code) return;

  // Clear URL params before doing anything
  history.replaceState({}, '', location.pathname);

  let savedState = null;
  try {
    const raw = JSON.parse(localStorage.getItem('line_state') || 'null');
    if (raw && raw.v && Date.now() - raw.t < 10 * 60 * 1000) savedState = raw.v;
  } catch (e) {}
  localStorage.removeItem('line_state');
  // state 必驗（2026-08-31 安全審查）：沒有本機發出的 state 就一律拒絕，防止別人把自己的 code 連結丟給玩家（login CSRF）
  if (!savedState || state !== savedState) {
    showToast('LINE 登入驗證失敗，請再試一次');
    return;
  }

  showToast('🔄 LINE 登入中...');
  try {
    const res = await fetch(LINE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: LINE_REDIRECT_URI }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Cloud Function ${res.status}: ${body}`);
    }
    const { customToken, displayName, pictureUrl } = await res.json();

    await auth.signInWithCustomToken(customToken);

    // Set display name and photo on the Firebase user
    const user = auth.currentUser;
    if (user && (displayName || pictureUrl)) {
      await user.updateProfile({ displayName: displayName || '', photoURL: pictureUrl || '' });
    }

    // updateProfile doesn't re-fire onAuthStateChanged, so refresh the UI manually
    // so the header button shows the LINE name/photo instead of the fallback.
    updateAuthUI();

    // Save LINE profile info to Firestore
    if (auth.currentUser) {
      await updateLineProfile(displayName, pictureUrl);
    }

    showToast('✅ LINE 登入成功');
    track('login', { method: 'line', trigger: 'welcome' });
  } catch (e) {
    console.error('LINE login error:', e);
    showToast('LINE 登入失敗，請再試一次');
  }
}

async function updateLineProfile(lineDisplayName, linePictureUrl) {
  if (!currentUser) return;
  const ref = db.collection('users').doc(currentUser.uid)
    .collection('profile').doc('data');
  try {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const doc = await ref.get();
    // D13：同 updateProfile——讀到的 doc 直接餵快取
    profileCache = doc.exists ? doc.data() : {};
    renderGroupChip();
    if (!doc.exists || !doc.data().firstLoginAt) {
      await ref.set({
        firstLoginAt: now,
        lastLoginAt: now,
        loginMethod: 'line',
        lineDisplayName: lineDisplayName || '',
        linePictureUrl: linePictureUrl || '',
        totalDays: Object.keys(state.completed || {}).length
      }, { merge: true });
    } else {
      await ref.update({
        lastLoginAt: now,
        loginMethod: 'line',
        lineDisplayName: lineDisplayName || '',
        linePictureUrl: linePictureUrl || '',
      });
    }
  } catch(e) { console.warn('LINE profile update error:', e); }
}

// ── 時段判斷 ──────────────────────────────────────────────
// 時段判定在 core.js timeOfDay；這裡只負責「現在幾點」
function getTimeOfDay() { return timeOfDay(new Date().getHours()); }

// ── 判斷是否補讀（章節排定日期 < 今天）：規則在 core.js isMakeupChapterOn ──
function isMakeupChapter(ch) { return isMakeupChapterOn(ch, todayStr()); }

// ── 玩家 profile（firstLoginAt 只寫一次）────────────────────
async function updateProfile() {
  if (!currentUser) return;
  const ref = db.collection('users').doc(currentUser.uid)
    .collection('profile').doc('data');
  try {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const doc = await ref.get();
    // D13：這次讀到的就是 profile/data，直接餵快取（原本 onAuthStateChanged 還會再讀一次）
    profileCache = doc.exists ? doc.data() : {};
    renderGroupChip();
    if (!doc.exists || !doc.data().firstLoginAt) {
      await ref.set({
        firstLoginAt: now,
        lastLoginAt: now,
        loginMethod: 'google',
        totalDays: Object.keys(state.completed || {}).length
      }, { merge: true });
    } else {
      await ref.update({ lastLoginAt: now });
    }
  } catch(e) { console.warn('Profile update error:', e); }
}

// ── E1：玩家分眾資料 (profile segmentation) ──────────────────
// 5 欄位：ageGroup / churchKey / district / groupName / devotionHabit
// district、groupName 為 W23 人工求助轉介會直接讀取的欄位，存乾淨字串、不做轉換
let profileCache = null;       // 主登入時讀進來，本機快取
let pendingProfileNudge = false; // completeDevotional 觸發、closeReward 後執行

async function loadProfileData() {
  if (!currentUser) { profileCache = null; renderGroupChip(); return; }
  try {
    const doc = await db.collection('users').doc(currentUser.uid)
      .collection('profile').doc('data').get();
    profileCache = doc.exists ? doc.data() : {};
    renderGroupChip();
  } catch(e) { console.warn('loadProfileData error:', e); }
}

async function saveProfileSegmentation(fields) {
  if (!currentUser) return false;
  try {
    const clean = {};
    // 只接受 5 個允許的分眾欄位、字串 trim、不轉換大小寫（保留玩家原樣輸入）
    const ALLOWED = ['ageGroup','churchKey','district','groupName','devotionHabit'];
    for (const k of ALLOWED) {
      if (k in fields) clean[k] = String(fields[k] || '').trim();
    }
    if (Object.keys(clean).length === 0) return false;
    clean.profileUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(currentUser.uid)
      .collection('profile').doc('data')
      .set(clean, { merge: true });
    profileCache = Object.assign({}, profileCache || {}, clean);
    renderGroupChip();
    return true;
  } catch(e) { console.warn('saveProfileSegmentation error:', e); return false; }
}

function openProfileSheet() {
  if (!currentUser) {
    showToast('請先登入才能儲存個人資料');
    return;
  }
  const p = profileCache || {};
  document.getElementById('profile-age').value = p.ageGroup || '';
  document.getElementById('profile-church').value = p.churchKey || '';
  document.getElementById('profile-district').value = p.district || '';
  document.getElementById('profile-group').value = p.groupName || '';
  document.getElementById('profile-habit').value = p.devotionHabit || '';
  openOverlay('profile-overlay');
}

async function saveProfileFromSheet() {
  const fields = {
    ageGroup: document.getElementById('profile-age').value,
    churchKey: document.getElementById('profile-church').value,
    district: document.getElementById('profile-district').value,
    groupName: document.getElementById('profile-group').value,
    devotionHabit: document.getElementById('profile-habit').value,
  };
  const ok = await saveProfileSegmentation(fields);
  closeOverlay('profile-overlay');
  if (ok) showToast('已儲存 ✨');
}

function renderGroupChip() {
  const chip = document.getElementById('av-group-chip');
  if (!chip) return;
  const name = (profileCache && profileCache.groupName) ? profileCache.groupName.trim() : '';
  if (name) {
    chip.textContent = '⛪ ' + name;
    chip.style.display = '';
  } else {
    chip.style.display = 'none';
  }
}

// ── E1：Nudge（throttled 領獎後輕量提示） ───────────────────────
const PROFILE_NUDGE_FIELDS = [
  { key: 'ageGroup', icon: '🎂', title: '想分享你的年齡層嗎？', desc: '只問一題、可以跳過。',
    type: 'select',
    options: [['under_jh','國中以下'],['high_school','高中職'],['college','大專 / 大學'],['young_25_35','社青（25-35）'],['middle_35_50','中年（35-50）'],['senior_50_65','熟齡（50-65）'],['elder_65_plus','樂齡（65 以上）']] },
  { key: 'churchKey', icon: '⛪', title: '想分享你屬於哪間教會嗎？', desc: '只問一題、可以跳過。',
    type: 'select',
    options: [['daguang','大光教會'],['other','其他教會'],['none','尚未屬會']] },
  { key: 'district', icon: '🤝', title: '你的牧區是？', desc: '只問一題、可以跳過。日後若想找牧者聊聊，團隊會用這個欄位人工牽線。',
    type: 'text', placeholder: '例如：成人查經牧區' },
  { key: 'groupName', icon: '👥', title: '你的小組叫什麼？', desc: '只問一題、可以跳過。填了主畫面會顯示你的小組標籤。',
    type: 'text', placeholder: '例如：週四查經班' },
  { key: 'devotionHabit', icon: '🌱', title: '想分享你的靈修習慣嗎？', desc: '只問一題、可以跳過。',
    type: 'select',
    options: [['stable','穩定每天'],['intermittent','斷續'],['beginner','新手摸索'],['starting','想開始']] },
];
let currentNudgeFieldKey = null;

function pickNextNudgeField() {
  if (!profileCache) return null;
  for (const f of PROFILE_NUDGE_FIELDS) {
    if (!profileCache[f.key]) return f;
  }
  return null;
}

function maybeShowProfileNudge() {
  if (!currentUser) return;
  if (!profileCache) return; // 還沒載入完
  if ((state.streak || 0) < 3) return; // 連續 3 天起才開始問
  // cool-down：跳過 3 次後休息 7 天
  const skipCount = parseInt(localStorage.getItem('profile_nudge_skip_count') || '0', 10);
  const lastSkip = localStorage.getItem('profile_nudge_last_skip') || '';
  if (skipCount >= 3 && lastSkip) {
    const daysSince = Math.floor((Date.now() - new Date(lastSkip).getTime()) / 86400000);
    if (daysSince < 7) return;
    localStorage.setItem('profile_nudge_skip_count', '0'); // 7 天到了重置
  }
  // 同一天只問一次
  const lastShown = localStorage.getItem('profile_nudge_last_shown') || '';
  const today = todayStr();
  if (lastShown === today) return;
  const field = pickNextNudgeField();
  if (!field) return; // 都填完了
  currentNudgeFieldKey = field.key;
  document.getElementById('profile-nudge-icon').textContent = field.icon;
  document.getElementById('profile-nudge-title').textContent = field.title;
  document.getElementById('profile-nudge-desc').textContent = field.desc;
  const body = document.getElementById('profile-nudge-body');
  body.innerHTML = '';
  if (field.type === 'select') {
    const sel = document.createElement('select');
    sel.className = 'profile-select';
    sel.id = 'profile-nudge-input';
    const blank = document.createElement('option');
    blank.value = ''; blank.textContent = '— 請選擇 —';
    sel.appendChild(blank);
    for (const [v, lbl] of field.options) {
      const o = document.createElement('option');
      o.value = v; o.textContent = lbl;
      sel.appendChild(o);
    }
    body.appendChild(sel);
  } else {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'profile-input';
    inp.id = 'profile-nudge-input';
    inp.maxLength = 30;
    inp.placeholder = field.placeholder || '';
    body.appendChild(inp);
  }
  localStorage.setItem('profile_nudge_last_shown', today);
  openOverlay('profile-nudge-overlay');
}

async function submitProfileNudge() {
  const inp = document.getElementById('profile-nudge-input');
  const val = inp ? inp.value.trim() : '';
  closeOverlay('profile-nudge-overlay');
  if (!val || !currentNudgeFieldKey) return;
  const ok = await saveProfileSegmentation({ [currentNudgeFieldKey]: val });
  if (ok) {
    localStorage.setItem('profile_nudge_skip_count', '0'); // 願意填、重置跳過計數
    showToast('已儲存 ✨');
  }
}

function skipProfileNudge() {
  const skipCount = parseInt(localStorage.getItem('profile_nudge_skip_count') || '0', 10);
  localStorage.setItem('profile_nudge_skip_count', String(skipCount + 1));
  localStorage.setItem('profile_nudge_last_skip', new Date().toISOString());
  closeOverlay('profile-nudge-overlay');
}

// ── 儲存單章完整記錄 + 更新統計 ──────────────────────────────
async function saveChapterRecord(ch, choiceSelected, hasReflection, hasRead, reflectionText) {
  const h = new Date().getHours();
  if (!currentUser) {
    // issue #32：訪客只累計本機統計供成就判定（欄位與雲端 stats/data 同名）
    const f = { totalDays: 1 };
    if (hasReflection) f.reflectionCount = 1;
    if (hasRead)       f.readCount       = 1;
    const _fl = statHourFlags(h);   // D14：時段口徑單一正本（core.js）
    if (_fl.morning) f.morningCount = 1;
    if (_fl.night)   f.nightCount   = 1;
    if (isMakeupChapter(ch)) f.makeupCount  = 1;
    bumpLocalStats(f);
    return;
  }
  const key = chapterKey(ch);
  const inc = firebase.firestore.FieldValue.increment;
  try {
    // 每章完整記錄
    const record = {
      date: todayStr(),
      completedAt: firebase.firestore.FieldValue.serverTimestamp(),
      timeOfDay: getTimeOfDay(),
      choiceSelected: choiceSelected || '',
      hasReflection: !!hasReflection,
      hasRead: !!hasRead,
    };
    if (reflectionText) record.reflectionText = reflectionText;
    if (sessionMood) record.mood = sessionMood;  // 情緒2.0：當天起點心情，玩家本人回顧用；null（先不說）不寫此欄（紅線7）
    if (lastAiResponse) {
      record.aiResponse = lastAiResponse;
      record.aiIsFallback = lastAiIsFallback;
    }
    // 2026-08-31 D1：chapters／stats／profile 三筆合成一個 batch（1 RTT），
    // 縮短手機弱網下「寫到一半被切到背景」掉統計的時窗。
    const userRef = db.collection('users').doc(currentUser.uid);
    const batch = db.batch();
    batch.set(userRef.collection('chapters').doc(key), record);
    // 默想歷史保留：reflections 子集合寫入已 relocate 到 submitReflection（AI fetch 之前、獨立於 AI 成敗），
    // 確保「沒領就離開」時玩家默想仍落地。此處（finalize 路徑）不再重複寫子集合，避免同篇雙筆（doc id=Date.now()）。
    // 累計統計
    const statsUpdates = { totalDays: inc(1) };
    if (hasReflection) statsUpdates.reflectionCount = inc(1);
    if (hasRead)       statsUpdates.readCount       = inc(1);
    const _fl2 = statHourFlags(h);   // D14：與訪客分支同一正本，口徑不再兩處各寫
    if (_fl2.morning) statsUpdates.morningCount = inc(1);
    if (_fl2.night)   statsUpdates.nightCount   = inc(1);
    if (isMakeupChapter(ch))    statsUpdates.makeupCount  = inc(1);
    batch.set(userRef.collection('stats').doc('data'), statsUpdates, { merge: true });
    // profile.totalDays 同步更新
    batch.set(userRef.collection('profile').doc('data'), { totalDays: inc(1) }, { merge: true });
    await batch.commit();
  } catch(e) { console.warn('Chapter record error:', e); }
}

// ── 成就文件初始化（空結構，供日後使用）────────────────────────
async function initAchievements() {
  if (!currentUser) return;
  try {
    const ref = db.collection('users').doc(currentUser.uid)
      .collection('achievements').doc('data');
    const doc = await ref.get();
    if (doc.exists && doc.data().unlockedAt) {
      // Merge cloud → local (cloud wins for timestamps)
      const cloud = doc.data().unlockedAt;
      Object.keys(cloud).forEach(k => { if (cloud[k]) unlockedAchievements[k] = cloud[k]; });
      localStorage.setItem('ach_unlocked', JSON.stringify(unlockedAchievements));
    } else {
      await ref.set({ unlockedAt: unlockedAchievements, progress: {} }, { merge: true });
    }
  } catch(e) { console.warn('Achievements init error:', e); }
  // Check for any newly achievable badges
  checkAchievements();
}

// ── 成就系統 ──────────────────────────────────────────────────

// 書卷表 BOOKS 已搬到 content.js（issue #2：內容資料集中管理＋自檢），
// 加新書卷請改 content.js，這裡不再放內容資料。

// 書卷進度算法在 core.js bookProgress（分母一律 entries）；這裡只把 state.completed 餵進去
function getBookProgress(book) { return bookProgress(book, state.completed); }
function booksCompleted() {
  return BOOKS.filter(b => getBookProgress(b).complete).length;
}
function itemCount() { return (state.items || []).length; }
function completedCount() { return Object.keys(state.completed || {}).length; }

// Stats cache (filled from Firestore for logged-in users)
let cachedStats = {};
// issue #32：訪客沒有 Firestore stats 路徑 → 讀經／默想／清晨／補讀類成就永遠解不開。
// 訪客改用 localStorage 累計同一組欄位（只在本機、不進雲端）；登入後以 Firestore 為準。
const LOCAL_STATS_KEY = 'local_stats';

// 本 app 擁有的 localStorage key 單一登錄表（D17）：新增 key 時加在這裡，
// doReset('all') 讀這張表整清——別再回去 doReset 裡手加（issue #75 A4 的教訓）。
const LS_KEYS = ['bible_state','avatar_state','tut_done','ach_unlocked','local_stats',
  'has_submitted_feedback','last_seen_version','line_state','login_choice_made',
  'nt_finale_seen','profile_nudge_last_shown','profile_nudge_last_skip',
  'profile_nudge_skip_count','commit_ask_enabled','commit_slot','fontSize'];
function loadLocalStats() { try { return JSON.parse(localStorage.getItem(LOCAL_STATS_KEY) || '{}'); } catch(e) { return {}; } }
function bumpLocalStats(fields) {
  const st = loadLocalStats();
  Object.keys(fields).forEach(k => { st[k] = (st[k] || 0) + fields[k]; });
  localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(st));
  cachedStats = st;
}
async function loadStats() {
  if (!currentUser) { cachedStats = loadLocalStats(); return; }
  try {
    const doc = await db.collection('users').doc(currentUser.uid).collection('stats').doc('data').get();
    if (doc.exists) cachedStats = doc.data();
  } catch(e) {}
}

// 累積靈修天數薄包裝（純邏輯在 core.js totalDevotionDays）
function devotionDays() { return totalDevotionDays(state.completed); }

const ACHIEVEMENTS = [
  // ── 恆心 ──
  {key:'first_step',name:'踏上旅程',desc:'完成第1次靈修',emoji:'👣',tier:'bronze',verse:'「你們要行道，不要單單聽道。」',verseRef:'—— 雅各書 1:22',
   check:()=>completedCount()>=1,progress:()=>`${Math.min(completedCount(),1)}/1`},
  {key:'streak_3',name:'三日起步',desc:'累積靈修3天',emoji:'🔥',tier:'bronze',verse:'「因為他的怒氣不過是轉眼之間，他的恩典乃是一生之久。」',verseRef:'—— 詩篇 30:5',
   check:()=>devotionDays()>=3,progress:()=>`${Math.min(devotionDays(),3)}/3`},
  {key:'total_10',name:'十日旅人',desc:'累計完成10天靈修',emoji:'🗺️',tier:'bronze',verse:'「你的話是我腳前的燈，是我路上的光。」',verseRef:'—— 詩篇 119:105',
   check:()=>completedCount()>=10,progress:()=>`${Math.min(completedCount(),10)}/10`},
  {key:'streak_7',name:'一週堅持',desc:'累積靈修7天',emoji:'🌟',tier:'silver',verse:'「你們要在所信的道上恆心，根基穩固，堅定不移。」',verseRef:'—— 歌羅西書 1:23',
   check:()=>devotionDays()>=7,progress:()=>`${Math.min(devotionDays(),7)}/7`},
  {key:'streak_14',name:'兩週同行',desc:'累積靈修14天',emoji:'🌈',tier:'silver',verse:'「我們行善不可喪志，若不灰心，到了時候就要收成。」',verseRef:'—— 加拉太書 6:9',
   check:()=>devotionDays()>=14,progress:()=>`${Math.min(devotionDays(),14)}/14`},
  {key:'total_30',name:'月行者',desc:'累計完成30天靈修',emoji:'⛰️',tier:'silver',verse:'「耶和華是我的牧者，我必不至缺乏。」',verseRef:'—— 詩篇 23:1',
   check:()=>completedCount()>=30,progress:()=>`${Math.min(completedCount(),30)}/30`},
  {key:'streak_30',name:'三十日挑戰',desc:'累積靈修30天',emoji:'💎',tier:'gold',verse:'「忍耐也當成功，使你們成全完備，毫無缺欠。」',verseRef:'—— 雅各書 1:4',
   check:()=>devotionDays()>=30,progress:()=>`${Math.min(devotionDays(),30)}/30`},
  {key:'total_100',name:'百日門徒',desc:'累計完成100天靈修',emoji:'👑',tier:'gold',verse:'「那美好的仗我已經打過了，當跑的路我已經跑盡了，所信的道我已經守住了。」',verseRef:'—— 提摩太後書 4:7',
   check:()=>completedCount()>=100,progress:()=>`${Math.min(completedCount(),100)}/100`},
  {key:'comeback',name:'重回羊圈',desc:'第1次補讀',emoji:'🐑',tier:'bronze',verse:'「一百隻羊裡失去一隻，豈不把這九十九隻撇在曠野，去找那失去的羊，直到找著呢？」',verseRef:'—— 路加福音 15:4',
   check:()=>(cachedStats.makeupCount||0)>=1},
  // ── 深度 ──
  {key:'first_read',name:'認真讀經',desc:'第1次點閱讀完整章節',emoji:'📖',tier:'bronze',verse:'「你們查考聖經，因你們以為內中有永生。」',verseRef:'—— 約翰福音 5:39',
   check:()=>(cachedStats.readCount||0)>=1},
  {key:'first_reflection',name:'初次默想',desc:'第1次填寫默想',emoji:'💭',tier:'bronze',verse:'「惟喜愛耶和華的律法，晝夜思想，這人便為有福。」',verseRef:'—— 詩篇 1:2',
   check:()=>(cachedStats.reflectionCount||0)>=1},
  {key:'read_10',name:'讀經達人',desc:'累計閱讀完整章節10次',emoji:'📚',tier:'silver',verse:'「聖經都是神所默示的，於教訓、督責、使人歸正、教導人學義都是有益的。」',verseRef:'—— 提摩太後書 3:16',
   check:()=>(cachedStats.readCount||0)>=10,progress:()=>`${Math.min(cachedStats.readCount||0,10)}/10`},
  {key:'reflect_10',name:'默想成習',desc:'累計填寫默想10次',emoji:'🙏',tier:'silver',verse:'「你要默想這些事，專心做這些事，使眾人看出你的長進來。」',verseRef:'—— 提摩太前書 4:15',
   check:()=>(cachedStats.reflectionCount||0)>=10,progress:()=>`${Math.min(cachedStats.reflectionCount||0,10)}/10`},
  {key:'read_30',name:'聖經行者',desc:'累計閱讀完整章節30次',emoji:'🏅',tier:'gold',verse:'「少年人用什麼潔淨他的行為呢？是要遵行你的話。」',verseRef:'—— 詩篇 119:9',
   check:()=>(cachedStats.readCount||0)>=30,progress:()=>`${Math.min(cachedStats.readCount||0,30)}/30`},
  {key:'reflect_30',name:'默想深耕',desc:'累計填寫默想30次',emoji:'🌾',tier:'gold',verse:'「耶和華啊，我仰望你；主啊，你是我的盼望。」',verseRef:'—— 詩篇 38:15',
   check:()=>(cachedStats.reflectionCount||0)>=30,progress:()=>`${Math.min(cachedStats.reflectionCount||0,30)}/30`},
  // ── 時段 ──
  {key:'early_bird',name:'晨間靈修',desc:'累計5次清晨靈修',emoji:'🌅',tier:'silver',verse:'「我趁天未亮呼求，我仰望了你的言語。」',verseRef:'—— 詩篇 119:147',
   check:()=>(cachedStats.morningCount||0)>=5,progress:()=>`${Math.min(cachedStats.morningCount||0,5)}/5`},
  {key:'night_owl',name:'夜間守望',desc:'累計5次深夜靈修',emoji:'🌙',tier:'silver',verse:'「我夜間的歌曲，我心裡也要默想。」',verseRef:'—— 詩篇 77:6',
   check:()=>(cachedStats.nightCount||0)>=5,progress:()=>`${Math.min(cachedStats.nightCount||0,5)}/5`},
  // ── 收集 ──
  {key:'full_outfit',name:'全副武裝',desc:'同時裝備帽衣手背4部位',emoji:'🛡️',tier:'bronze',verse:'「所以要站穩了，用真理當作帶子束腰。」',verseRef:'—— 以弗所書 6:14',
   check:()=>!!(state.hat&&state.body&&state.item&&state.bg)},
  {key:'wardrobe_20',name:'裝備收集家',desc:'收集20件裝備',emoji:'🎒',tier:'silver',verse:'「你開恩賜給他，超過他所求的。」',verseRef:'—— 詩篇 21:2',
   check:()=>itemCount()>=20,progress:()=>`${Math.min(itemCount(),20)}/20`},
  {key:'wardrobe_50',name:'聖經博物館',desc:'收集50件裝備',emoji:'🏛️',tier:'gold',verse:'「神的豐富何等深奧。」',verseRef:'—— 羅馬書 11:33',
   check:()=>itemCount()>=50,progress:()=>`${Math.min(itemCount(),50)}/50`},
  {key:'wardrobe_80',name:'全裝甲勇士',desc:'收集80件裝備',emoji:'⚔️',tier:'gold',verse:'「你們要穿戴神所賜的全副軍裝，就能抵擋魔鬼的詭計。」',verseRef:'—— 以弗所書 6:11',
   check:()=>itemCount()>=80,progress:()=>`${Math.min(itemCount(),80)}/80`},
  // ── 社群 ──
  // 2026-08-27 PR ①：分享類成就下架（retired）——不再新發、已得者保留紀錄與展示
  {key:'first_share',retired:true,name:'分享祝福',desc:'第1次分享給小組',emoji:'📤',tier:'bronze',verse:'「你們的光也當這樣照在人前，叫他們看見你們的好行為。」',verseRef:'—— 馬太福音 5:16'},   // retired：check 閉包已移除（renderBadges 對未解鎖 retired 一律過濾）
  {key:'share_10',retired:true,name:'福音使者',desc:'累計分享10次',emoji:'📢',tier:'silver',verse:'「報福音傳喜信的人，他們的腳蹤何等佳美。」',verseRef:'—— 羅馬書 10:15'},   // retired：check/progress 閉包已移除（同上）
  {key:'first_feedback',name:'曠野之聲',desc:'第1次填寫回饋',emoji:'🏜️',tier:'bronze',verse:'「在曠野有人聲喊著說：預備主的道，修直他的路。」',verseRef:'—— 馬可福音 1:3',
   check:()=>!!localStorage.getItem('has_submitted_feedback')},
  // ── 書架 ──
  {key:'library_1',name:'書架初亮',desc:'完走第1本書卷',emoji:'📕',tier:'silver',verse:'「都是照著山上指示你的樣式做。」',verseRef:'—— 出埃及記 25:40',
   check:()=>booksCompleted()>=1,progress:()=>`${Math.min(booksCompleted(),1)}/1`},
  {key:'library_3',name:'三卷行者',desc:'完走3本書卷',emoji:'📚',tier:'gold',verse:'「少年人哪，我曾寫信給你們，因為你們剛強，神的道常存在你們心裡。」',verseRef:'—— 約翰一書 2:14',
   check:()=>booksCompleted()>=3,progress:()=>`${Math.min(booksCompleted(),3)}/3`},
];

// Local unlocked state (merged with Firestore on login)
let unlockedAchievements = JSON.parse(localStorage.getItem('ach_unlocked') || '{}');

function saveUnlocked() {
  localStorage.setItem('ach_unlocked', JSON.stringify(unlockedAchievements));
  if (currentUser) {
    db.collection('users').doc(currentUser.uid)
      .collection('achievements').doc('data')
      .set({ unlockedAt: unlockedAchievements }, { merge: true }).catch(() => {});
  }
}

let achievementQueue = [];
let showingAchievement = false;

async function checkAchievements() {
  await loadStats();   // 訪客走 localStorage、登入走 Firestore（issue #32）
  const newlyUnlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (unlockedAchievements[a.key]) continue;
    if (a.retired) continue;   // 下架成就不再新發
    try {
      if (a.check()) {
        unlockedAchievements[a.key] = new Date().toISOString();
        newlyUnlocked.push(a);
      }
    } catch(e) {}
  }
  if (newlyUnlocked.length > 0) {
    saveUnlocked();
    achievementQueue.push(...newlyUnlocked);
    if (!showingAchievement) showNextAchievement();
  }
}

function renderAchievementCard(a, isReview) {
  const tierLabel = { bronze:'🥉 銅級', silver:'🥈 銀級', gold:'🥇 金級' }[a.tier];
  const reviewTag = isReview ? '<div style="font-size:11px;color:var(--text-soft);margin-bottom:8px;letter-spacing:0.1em;">✨ 回顧解鎖時刻</div>' : '';
  document.getElementById('ach-unlock-content').innerHTML = `
    ${reviewTag}
    <div class="ach-unlock-emoji">${a.emoji}</div>
    <div class="ach-unlock-tier">${tierLabel}</div>
    <div class="ach-unlock-name">${a.name}</div>
    <div class="ach-unlock-desc">${a.desc}</div>
    <div class="ach-unlock-verse">${a.verse}<div class="ach-unlock-verse-ref">${a.verseRef}</div></div>
  `;
  // 步驟 1（上面 innerHTML）：把卡片內容寫進 modal — 此時 DOM 已改但瀏覽器還沒算 layout
  // 步驟 2：讀 offsetHeight 強制瀏覽器立刻同步算 layout，讓 modal 在新內容高度下被 align-items:center 重新置中
  // 沒這一步的話，下一步 .show 觸發的 transform 動畫會在「modal 還是舊高度的舊置中位置」起跑，動畫途中又被重新置中 → 看起來像跳動 / 閃爍 / 看到底下圖層
  const overlay = document.getElementById('ach-unlock-overlay');
  const modal = overlay.querySelector('.modal');
  void modal.offsetHeight;
  // 步驟 3：內聯 openOverlay 的兩件事（加 .show + 鎖 body 滾動），避免透過 helper 引入額外副作用
  // 此刻 modal 已在正確置中位置，動畫從 scale(.85) translateY(20px) 平滑跑到 scale(1) translateY(0)
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function showNextAchievement() {
  if (achievementQueue.length === 0) { showingAchievement = false; return; }
  showingAchievement = true;
  const a = achievementQueue.shift();
  renderAchievementCard(a, false);
  track('achievement_unlocked', { key: a.key, tier: a.tier });
  if (typeof showConfetti === 'function') showConfetti();
  // When this overlay closes, show next
  const observer = new MutationObserver(() => {
    if (!document.getElementById('ach-unlock-overlay').classList.contains('show')) {
      observer.disconnect();
      setTimeout(showNextAchievement, 400);
    }
  });
  observer.observe(document.getElementById('ach-unlock-overlay'), { attributes: true, attributeFilter: ['class'] });
}

function reviewAchievement(key) {
  const a = ACHIEVEMENTS.find(x => x.key === key);
  if (!a || !unlockedAchievements[key]) return;
  // 追蹤：玩家主動回顧已解鎖徽章 — 用來驗證「儀式感」是否被使用
  track('achievement_review', { key: a.key, tier: a.tier });
  renderAchievementCard(a, true);
}

// ── Achievement page rendering ──

// PR ③a：成就 overlay 退役，唯一入口＝主頁「📚 書卷與成就」分頁（switchPage('books')）；
// 舊別名 openAchievements() 已無任何呼叫點，2026-08-31 D16 移除。
// 書卷頁頂：稱號從哪來、下一站在哪（唯一讓玩家看到「卷數→稱號」對應的位置）
function renderTitleBar() {
  const el = document.getElementById('title-bar');
  const n = booksCompleted();
  const next = nextTitle(n);
  const cur = state.title ? `🏷️ ${state.title}` : '🏷️ 還沒有稱號';
  const tail = next ? `再 ${next.books - n} 卷成為「${next.name}」` : '已走遍全書 📜';
  el.innerHTML = `<span class="tb-cur">${cur}</span><span class="tb-sub">已完走 ${n} 卷 · ${tail}</span>`;
}

function renderBadgesPage() {
  const el = document.getElementById('ach-badges-page');
  const tiers = ['bronze','silver','gold'];
  const tierNames = { bronze:'🥉 銅級成就', silver:'🥈 銀級成就', gold:'🥇 金級成就' };
  let html = '';
  for (const tier of tiers) {
    const items = ACHIEVEMENTS.filter(a => a.tier === tier && (!a.retired || unlockedAchievements[a.key]));
    html += `<div style="font-size:13px;font-weight:700;color:var(--text-soft);margin:12px 0 8px;">${tierNames[tier]}</div>`;
    html += '<div class="ach-grid">';
    for (const a of items) {
      const unlocked = !!unlockedAchievements[a.key];
      // Gold: show if any gold is unlocked OR all silver done; otherwise hide individual golds only if none unlocked
      const showHidden = tier === 'gold' && !unlocked;
      const cls = `${a.tier} ${unlocked ? 'unlocked' : (showHidden ? 'hidden' : '')}`.trim();
      const date = unlocked ? new Date(unlockedAchievements[a.key]) : null;
      const dateStr = date ? `${date.getMonth()+1}/${date.getDate()}` : '';
      let progressHtml = '';
      if (!unlocked && !showHidden && a.progress) {
        try { progressHtml = `<div class="ach-progress">${a.progress()}</div>`; } catch(e) {}
      }
      const clickAttr = unlocked ? ` onclick="reviewAchievement('${a.key}')" style="cursor:pointer;"` : '';
      html += `<div class="ach-card ${cls}" title="${a.desc}"${clickAttr}>
        <div class="ach-emoji">${showHidden ? '❓' : a.emoji}</div>
        <div class="ach-name">${showHidden ? '???' : a.name}</div>
        ${showHidden ? '' : `<div class="ach-desc">${a.desc}</div>`}
        ${unlocked ? `<div class="ach-date">${dateStr} ✅</div>` : progressHtml}
      </div>`;
    }
    html += '</div>';
  }
  // Summary
  const total = ACHIEVEMENTS.filter(a => !a.retired || unlockedAchievements[a.key]).length;
  const done = ACHIEVEMENTS.filter(a => unlockedAchievements[a.key]).length;
  html = `<div style="text-align:center;font-size:13px;color:var(--text-soft);margin-bottom:6px;">已解鎖 ${done} / ${total}</div>` + html;
  el.innerHTML = html;
}

function renderLibraryPage() {
  const el = document.getElementById('ach-library-page');
  let html = '<div class="bookshelf">';
  // 每排 6 卷、自動分組（未來 BOOKS 增減無需改邏輯）
  const PER_ROW = 6;
  for (let i = 0; i < BOOKS.length; i += PER_ROW) {
    const rowBooks = BOOKS.slice(i, i + PER_ROW);
    html += '<div class="shelf-row">';
    for (const book of rowBooks) {
      const prog = getBookProgress(book);
      const pct = Math.round(prog.done / prog.total * 100);
      const cls = prog.complete ? 'lit' : (prog.done > 0 ? 'progress' : 'locked');
      // 全書卷詳情頁恆開（BOOK_DETAIL_ENABLED 已退役，2026-09-01 D8）
      html += `<div class="book-spine ${cls}" onclick="openBookDetail('${book.key}')">
        ${prog.complete ? '<div class="spine-badge">🏅</div>' : ''}
        <div class="book-spine-emoji">${book.emoji}</div>
        <div class="book-spine-name">${book.name}</div>
        <div class="book-spine-pct">${prog.complete ? '完走' : (prog.done > 0 ? `${prog.done}/${prog.total}（${pct}%）` : '🔒')}</div>
        ${!prog.complete ? `<div class="book-spine-bar"><div class="book-spine-bar-fill" style="width:${pct}%"></div></div>` : ''}
      </div>`;
    }
    html += '</div>';
  }
  const done = BOOKS.filter(b => getBookProgress(b).complete).length;
  html += `<div class="shelf-summary">📖 已完走 ${done} / ${BOOKS.length} 卷</div>`;
  html += '</div>';
  el.innerHTML = html;
}

// ── A1 書卷詳情頁（純新增 view；只讀 state.completed，不寫狀態、不碰主流程）──
function openBookDetail(bookKey) {
  track('book_detail_open', { book: bookKey });
  renderBookDetail(bookKey);
  openOverlay('book-detail-overlay');
}
function renderBookDetail(bookKey) {
  const book = BOOKS.find(b => b.key === bookKey);
  if (!book) return;
  const titleEl = document.getElementById('bd-title');
  if (titleEl) titleEl.textContent = `${book.emoji} ${book.name}`;
  const esc = escapeHtmlMyMsg;   // 2026-08-31 加固（issue #76 B4）：移除 identity fallback——core.js 沒載入時寧可 fail-loud，不能退成不轉義
  let html = '';

  // ① 導讀區（讀 BOOK_INTRO[key]）
  //    設計意圖（PM 2026-08-21 拍板）：欄位沒內容就「不存在」——空欄不輸出該列、
  //    5 欄全空不輸出整個區塊。不是把佔位字樣藏起來，也不要為了讓它顯示而填假值：
  //    作者/時間/地點等欄位部分書卷在神學上本無定論（HEB、JAS、PE2…），
  //    聖經沒下結論的地方我們不替它下結論；空著比給玩家一個「本該有東西」的空位好。
  //    下方 ③ 人物冊採同一條原則，兩處註解請一起維護。
  const intro = (typeof BOOK_INTRO !== 'undefined' && BOOK_INTRO[bookKey]) || null;
  // ⓪ 封面（BOOK_INTRO[key].cover 選填：圖片路徑或 emoji）——「有圖才顯示」，沒值整塊不輸出。
  //    與下方 ①③ 的「無內容即無區塊」同一條原則；人物頭像（period.image）亦同，三處註解一起維護。
  const isImgPath = v => /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(String(v).trim());
  const cover = intro && intro.cover && String(intro.cover).trim();
  if (cover) {
    html += isImgPath(cover)
      ? `<img class="bd-cover" src="${esc(cover)}" alt="${esc(book.name)} 封面">`
      : `<div class="bd-cover-emoji">${esc(cover)}</div>`;
  }
  //    2026-08-29 加三個「幫讀者的欄位」：summary（這卷在講什麼）／structure（怎麼分段，陣列）／tips（會卡的地方，陣列）。
  //    作者／時間／地點若經文沒說，寫明「經文沒有明確記載」（James 2026-08-29：留空不好，沒定義就說沒定義）。
  const fillArr = v => Array.isArray(v) ? v.filter(x => x && String(x).trim()) : [];
  const fillStr = v => (v && String(v).trim()) ? String(v) : '';
  const summary = intro ? fillStr(intro.summary) : '';
  const listRows = intro ? [['怎麼分段', fillArr(intro.structure)], ['讀的時候會卡的地方', fillArr(intro.tips)]].filter(([, a]) => a.length) : [];
  const metaRows = intro ? [['作者', intro.author], ['時間', intro.time], ['地點', intro.place], ['主題', intro.theme], ['給誰', intro.audience]].filter(([, v]) => fillStr(v)) : [];
  if (summary || listRows.length || metaRows.length) {
    html += '<div class="bd-section"><div class="bd-section-title">📜 書卷導讀</div>';
    // 美術審查（2026-08-29）：敘事段落（summary／清單）與速查表（作者…給誰）分層，中間一條分節線
    if (summary) html += `<div class="bd-intro-summary">${esc(summary)}</div>`;
    for (const [label, arr] of listRows) {
      html += `<div class="bd-intro-lbl">${label}</div>${arr.map(v => `<div class="bd-intro-item">${esc(v)}</div>`).join('')}`;
    }
    if (metaRows.length) {
      html += '<div class="bd-intro-meta">';
      for (const [label, val] of metaRows) html += `<div class="bd-intro-row"><span class="bd-label">${label}</span>${esc(val)}</div>`;
      html += '</div>';
    }
    html += '</div>';
  }

  // ② 章節清單 + 進度（getBookProgress + state.completed 逐章標完成；不揭露默想內容）
  const prog = getBookProgress(book);
  html += '<div class="bd-section"><div class="bd-section-title">📑 章節進度</div>';
  html += `<div class="bd-progress-text">已完成 ${prog.done} / ${prog.total} 章</div>`;
  html += '<div class="bd-chapter-grid">';
  book.entries.forEach((ch, i) => {
    const done = !!state.completed[chapterKey(ch)];
    html += `<div class="bd-chapter ${done ? 'done' : ''}">${done ? '✓' : (i + 1)}</div>`;
  });
  html += '</div></div>';

  // ②-b 這卷的裝備（PR ③a 2026-08-29）：逐章列 baseItem／bonusItem，已入袋顯示、未入袋灰色剪影。
  //    只讀 state.items，不寫狀態；測試假 DOM 沒有 getChapter／CHAPTERS 時整段不輸出（無內容即無區塊）。
  if (typeof getChapter === 'function' && Array.isArray(state.items)) {
    const owned = new Set(state.items.map(i => i.emoji + '|' + (i.name || '')));  // emoji 會撞（🌿 初始外衣 vs 橄欖葉子），連名稱一起比
    const gender = state.gender || 'n';
    const cells = [];
    book.entries.forEach(ch => {
      const data = getChapter(ch);
      if (!data) return;
      for (const raw of [data.baseItem, data.bonusItem]) {
        const it = resolveItem(raw, gender);
        if (!it || !it.emoji) continue;
        const has = owned.has(it.emoji + '|' + (it.name || ''));
        cells.push(`<div class="bd-item ${has ? 'owned' : 'silhouette'}" title="${has ? esc(it.name) : '？'}"><span class="bd-item-emoji">${it.emoji}</span><span class="bd-item-name">${has ? esc(it.name) : '？？？'}</span></div>`);
      }
    });
    if (cells.length) {
      const got = cells.filter(c => c.includes('owned')).length;
      html += `<div class="bd-section"><div class="bd-section-title">🎒 這卷的裝備</div><div class="bd-progress-text">已收集 ${got} / ${cells.length} 件</div><div class="bd-item-grid">${cells.join('')}</div></div>`;
    }
  }

  // ③ 人物冊（遍歷 CHARACTERS，逐 period 判斷 book===key 與解鎖；只介紹、不含默想輸入）
  //    設計意圖（PM 2026-08-21 拍板，與上方 ① 導讀區同一條原則）：無內容即無區塊——
  //    人物沒名字→整個人物卡不輸出；時期沒標題→該時期列不輸出；介紹為空→介紹那行不輸出；
  //    篩完沒有任何時期→人物卡不輸出；沒有任何人物→整個人物冊區塊不輸出。
  //    不是把佔位字樣藏起來，也不要為了讓它顯示而填假值。兩處註解請一起維護，勿各自漂移。
  const filled = v => !!(v && String(v).trim());
  const chars = (typeof CHARACTERS !== 'undefined') ? CHARACTERS : {};
  const entries = [];
  for (const cid in chars) {
    const c = chars[cid];
    if (!c || !c.periods || !filled(c.name)) continue;
    const ps = [];
    for (const pid in c.periods) {
      const p = c.periods[pid];
      if (p && p.book === bookKey && filled(p.title)) ps.push(p);
    }
    if (ps.length) entries.push({ c, ps });
  }
  if (entries.length) {
    html += '<div class="bd-section"><div class="bd-section-title">👥 人物冊</div>';
    for (const { c, ps } of entries) {
      html += `<div class="bd-char"><div class="bd-char-name">${esc(c.name)}</div>`;
      for (const p of ps) {
        const unlocked = !!(p.unlock && state.completed[chapterKey(p.unlock)]);
        const tag = unlocked ? '<span class="bd-lock-tag on">已解鎖</span>' : '<span class="bd-lock-tag off">未解鎖</span>';
        // period.image 選填（人物立繪／頭像）：有圖才輸出圓形小頭像，沒圖就沒有圖位（同上「有圖才顯示」）
        const avatar = (p.image && String(p.image).trim()) ? `<img class="bd-char-avatar" src="${esc(p.image)}" alt="${esc(c.name)}">` : '';
        html += `<div class="bd-period ${unlocked ? '' : 'locked'}">${avatar}<span class="bd-period-title">${esc(p.title)}</span>${tag}`;
        if (unlocked) {
          if (filled(p.desc)) html += `<div>${esc(p.desc)}</div>`;
        } else {
          html += '<div>走到這卷的進度即可解鎖這段認識。</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }

  document.getElementById('book-detail-body').innerHTML = html;
}

// ── 分享次數 +1 ──────────────────────────────────────────────
async function incrementShareCount() {
  if (!currentUser) return;
  try {
    await db.collection('users').doc(currentUser.uid)
      .collection('stats').doc('data')
      .set({ shareCount: firebase.firestore.FieldValue.increment(1) }, { merge: true });
  } catch(e) { console.warn('Share count error:', e); }
}

let _appOpenFired = false;
auth.onAuthStateChanged(async user => {
  currentUser = user;
  updateAuthUI();
  if (!user || typeof state === 'undefined') return;
  // B1: app_open — 登入用戶首次解算後 fire 一次（訪客 user=null 已被上一行 return 擋掉）
  if (!_appOpenFired) {
    _appOpenFired = true;
    track('app_open', {});
  }

  if (state.setup) {
    // Already set up locally — sync in-place, stay on current screen
    loadFromFirestore(user.uid);
  } else {
    // Logged in from welcome flow — check cloud for existing progress
    try {
      const doc = await db.collection('users').doc(user.uid).get();
      if (doc.exists && doc.data().setup) {
        const data = doc.data();
        SYNC_FIELDS.forEach(f => { if (data[f] !== undefined) state[f] = data[f]; });
        migrateRewardClaimed();   // 領裝備漏領補救：以背包為基準一次性遷移（載入後、render 前）
        localStorage.setItem('bible_state', JSON.stringify(state));
        showMainAppScreen();
        showToast('☁️ 已從雲端載入進度');
      } else {
        // No cloud progress yet — advance to character setup
        showSetupScreen();
      }
    } catch(e) {
      console.warn('Post-auth Firestore load error:', e);
      showSetupScreen();
    }
  }
  // Only call updateProfile for Google users; LINE profile is handled by updateLineProfile
  // D13：updateProfile 內會順手餵 profileCache（省一次讀）；LINE 返站（無 callback）才走 loadProfileData
  if (!user.uid.startsWith('line:')) updateProfile();
  else loadProfileData();   // E1：分眾資料快取（LINE 首登由 updateLineProfile 餵）
  initAchievements();
  // Phase 2D：登入後檢查曠野呼聲新回覆，有就亮紅點 + 同 session 彈一次 Toast
  checkUnreadFeedback({ toast: true });
});

// Handle LINE OAuth callback on page load
window.addEventListener('load', () => { handleLineCallback(); });

// ══ STATE ══════════════════════════════════════════════════

function loadState() {
  const s = _loadStateRaw();
  if (s.title === undefined) s.title = '';   // PR ③b 補欄位：舊存檔沒有 title，undefined 送 Firestore set 會丟錯
  return s;
}
function _loadStateRaw() {
  return JSON.parse(localStorage.getItem('bible_state') || JSON.stringify({
    setup: false,
    name: '旅途中的信徒',
    gender: 'n',
    level: 1,
    xp: 10,
    streak: 0,
    hat: '',
    body: '🧑',
    item: '',
    bg: '🌿',
    title: '',       // 稱號（第五個裝備部位，PR ③b）：目前掛的稱號名稱，'' = 不掛
    items: [],
    completed: {},   // { "ACT10": "YYYY-MM-DD", ... }
    rewardClaimed: {},           // 領裝備漏領補救：哪些章已放過領取動畫 { "ROM10": true }
    rewardClaimedMigrated: false // 一次性遷移旗標
  }));
}

function saveState() {
  localStorage.setItem('bible_state', JSON.stringify(state));
  saveToFirestore();
}

// 領裝備漏領補救：以背包為基準的一次性遷移。
// 既有玩家的 completed 章節若背包已有該章裝備 → 視為歷史已領（rewardClaimed=true）；
// 背包查無 → 留空，讓補發鈕之後出現。★ 只初始化 rewardClaimed + 旗標，絕不改 completed 的值。
function migrateRewardClaimed() {
  if (state.rewardClaimedMigrated) return;   // 只跑一次
  if (!state.rewardClaimed) state.rewardClaimed = {};
  Object.keys(state.completed || {}).forEach(key => {
    const owned = (state.items || []).some(i => chapterKey(i.chapter) === key);
    if (owned) state.rewardClaimed[key] = true;
  });
  state.rewardClaimedMigrated = true;
  saveState();
}

let state = loadState();
if (!state.rewardClaimed) state.rewardClaimed = {};  // 既有 localStorage 無此欄時補上，確保讀取安全

// Migrate old avatar_state if exists
const oldState = localStorage.getItem('avatar_state');
if (oldState && !state.setup) {
  try {
    const old = JSON.parse(oldState);
    if (old.name && old.name !== '旅途中的信徒') state.name = old.name;
    state.level = old.level || 1;
    state.xp = old.xp || 10;
    state.streak = old.streak || 0;
    state.hat = old.hat || '';
    state.body = old.body || '🧑';
    state.item = old.item || '';
    if (Array.isArray(old.items)) state.items = old.items.filter(i => typeof i === 'object');
    if (old.lastDone) state.completed['migrated'] = old.lastDone;
    saveState();
  } catch(e) {}
}

// ══ UTILS ══════════════════════════════════════════════════

function todayStr() { return dateStr(new Date()); }   // 格式化在 core.js dateStr

// chapterKey / getChapter（章節查表唯一入口，issue #3）已搬到 core.js，這裡直接用全域。

function isChapterDone(ch) { return isChapterDoneIn(ch, state.completed); }

// ══ GENDER ITEMS ════════════════════════════════════════
const GENDER_ITEMS = {
  m: [
    { emoji:'🧥', name:'先知的斗篷', desc:'「你受的膏油勝過同伴」——使命的外袍', slot:'body' },
    { emoji:'⚔️', name:'屬靈的寶劍', desc:'「聖靈的寶劍，就是神的道」', slot:'hand' }
  ],
  f: [
    { emoji:'👘', name:'服事的外袍', desc:'「才德的婦人，她的價值遠勝珍珠」', slot:'body' },
    { emoji:'🕯️', name:'代禱的燈台', desc:'「她點上燈，打掃房屋，細心尋找」', slot:'hand' }
  ],
  n: [
    { emoji:'🌿', name:'旅人的外衣', desc:'「我們在世上是客旅、是寄居的」', slot:'body' }
  ]
};

function giveGenderItems(gender) {
  const items = GENDER_ITEMS[gender] || GENDER_ITEMS['n'];
  const seen = new Set(state.items.map(i=>i.emoji));
  items.forEach(item => {
    if (!seen.has(item.emoji)) {
      state.items.push({...item, chapter:'starter'});
      seen.add(item.emoji);
    }
  });
}

// ══ SETUP ══════════════════════════════════════════════════

let selectedGender = 'n';

function selectGender(g) {
  selectedGender = g;
  ['m','f','n'].forEach(x => document.getElementById('gender-'+x).classList.toggle('sel', x===g));
}

function finishSetup() {
  const name = document.getElementById('setup-name').value.trim();
  if (!name) { document.getElementById('setup-name').focus(); return; }
  state.name = name;
  state.gender = selectedGender;
  state.body = selectedGender === 'f' ? '👩' : selectedGender === 'm' ? '🧔' : '🧑';
  state.setup = true;
  // Give gender-specific starter items
  giveGenderItems(selectedGender);
  saveState();
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  initApp();
  if (!localStorage.getItem('tut_done')) openTutorial('setup');
}

// ── Screen routing ────────────────────────────────────────
function showWelcomeScreen() {
  document.getElementById('welcome-screen').style.display = 'flex';
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'none';
}
function showSetupScreen() {
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('setup-screen').style.display = 'flex';
  document.getElementById('main-app').style.display = 'none';
  selectGender('n');
}
function showMainAppScreen() {
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  giveGenderItems(state.gender || 'n');
  saveState();
  initApp();
}

// ── Welcome screen button handlers ────────────────────────
function chooseLineLogin() {
  localStorage.setItem('login_choice_made', '1');
  handleLineLoginClick();
}
function chooseGoogleLogin() {
  localStorage.setItem('login_choice_made', '1');
  auth.signInWithPopup(googleProvider).then(() => {
    track('login', { method: 'google', trigger: 'welcome' });
  }).catch(e => {
    console.warn('Google login error:', e);
    showToast('登入失敗，請再試一次');
    localStorage.removeItem('login_choice_made');
  });
}
function chooseGuestMode() {
  localStorage.setItem('login_choice_made', '1');
  track('login', { method: 'guest', trigger: 'welcome' });
  showSetupScreen();
}

// ══ SCHEDULE (loaded from content.js) ═══════════════════

// SCHEDULE 統一陣列：合併日 length>=2、單章日 length==1
// helper：拿某日的章節陣列，找不到回空陣列（避免 null/undefined check）
// getScheduleChapters / findScheduleDate 已搬到 core.js（讀 SCHEDULE 的純查詢）。
// 預設章節挑選與今日章節的規則也在 core.js（pickDefaultChapterFrom / todayChapterFor），
// 這裡只把「今天」和 state.completed 餵進去。
function pickDefaultChapter(chapters) { return pickDefaultChapterFrom(chapters, state.completed); }
function getTodayChapter() { return todayChapterFor(todayStr(), state.completed); }

// ══ INIT ══════════════════════════════════════════════════

let selectedChapter = null;
let pendingChoice = null;
let choiceConfirmed = false;
let reflSubmitted = false;
let _reflEditStart = null;  // 默想編輯起點 timestamp（refl-text 首次 focus/input 記；換章節重置；submit 取整數秒 editDuration）
let reflTimer = null;
let sessionChoice = null;    // 本章玩家選的選項（A/B/C/D）
let sessionMood = null;          // 情緒2.0：本次靈修起點心情（先不說=null，不留痕）；selectChapter 重置區清空
let _pendingChapterPick = null;  // 心情選擇器待載入章節（攔 confirmDaySelection/selectMergedDayChapter）
let _pendingMood = null;         // 心情選擇器暫存值；proceedToChapter 在 selectChapter 後才寫入 sessionMood
let sessionHasRead = false;  // 本章是否點閱讀完整章節

function initApp() {
  renderAvatar();
  // Init calendar to today
  calYear  = calToday.getFullYear();
  calMonth = calToday.getMonth();
  calWeek  = calWeekOfMonth(calYear, calMonth, calToday.getDate());
  const ds = calDateStr(calYear, calMonth, calToday.getDate());
  calSelectedDate = ds;
  renderCalendar();
  updateDayInfoBar(ds, calToday.getDate());
  renderCalEntry();
  renderAttendance();
  // Auto-load today's chapter content below
  const todayCh = getTodayChapter();
  if (todayCh) selectChapter(todayCh);
}

// ── PR ② 焦點模式／日曆收合／出席燈／完成短畫面（2026-08-29）──
let _calOpen = false;
function toggleCalendar(force) {
  _calOpen = force !== undefined ? !!force : !_calOpen;
  document.getElementById('cal-card').classList.toggle('collapsed', !_calOpen);
  document.body.classList.toggle('cal-open', _calOpen);
  renderCalEntry();
  if (_calOpen) setTimeout(() => document.getElementById('cal-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
}
function renderCalEntry() {
  const main = document.getElementById('cal-entry-main'), sub = document.getElementById('cal-entry-sub');
  if (!main) return;
  if (_calOpen) { main.textContent = '收起日曆'; sub.textContent = ''; return; }
  const todayCh = getTodayChapter();
  const done = todayCh && isChapterDone(todayCh);
  main.textContent = done ? '今天完成了・補讀或看其他日期' : '補讀或看其他日期';
  sub.textContent = `${calToday.getMonth() + 1}/${calToday.getDate()} 今日：${todayCh ? chapterFull(todayCh) : '—'}`;
}
// 焦點模式：玩家按「開始靈修」載入章節後進入；隱藏 avatar／XP／日曆／頁籤，只留經文→情境→默想
// B1（2026-08-30）：焦點模式進出；exit 帶停留秒數與是否在本次焦點內完成（showReward 會把 _focusRewarded 設 true）
let _focusEnterAt = null, _focusRewarded = false;
function enterFocusMode(ch) {
  _focusEnterAt = Date.now(); _focusRewarded = false;
  track('focus_enter', { chapter: ch });
  document.body.classList.add('focus-mode');
  document.getElementById('focus-bar-ch').textContent = `📖 ${chapterFull(ch)}`;
  window.scrollTo({ top: 0 });
}
function exitFocusMode(opts) {
  if (!document.body.classList.contains('focus-mode')) return;
  track('focus_exit', { chapter: selectedChapter, dwellSec: _focusEnterAt ? Math.round((Date.now() - _focusEnterAt) / 1000) : 0, completed: _focusRewarded });
  _focusEnterAt = null;
  const noScroll = !!(opts && opts.noScroll);   // 合併日：closeReward 自己會捲到 day-info-bar，避免兩段捲動疊加
  document.body.classList.remove('focus-mode');
  refreshHome();
  if (!noScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}
// 主畫面整頁刷新（avatar／日曆／今日卡／日曆入口／出席燈）。
// issue #31：今日章在 initApp 就自動載入首頁下方，玩家不按「開始靈修」也能做完 → 不在焦點模式，
// 刷新不能只綁在 exitFocusMode 裡，closeReward 要無條件呼叫這支。
function refreshHome() {
  renderAvatar();
  renderCalendar();
  if (calSelectedDate) updateDayInfoBar(calSelectedDate, parseInt(calSelectedDate.split('-')[2], 10));
  renderCalEntry();
  renderAttendance();
}
// 🔥 出席燈：今天完成任一章才亮；只管亮暗、不帶催促文案（ADR 0001 出席驅動）
function renderAttendance() {
  const pill = document.getElementById('streak-pill');
  if (!pill) return;
  const today = todayStr();
  const lit = Object.values(state.completed || {}).some(d => d === today);
  pill.classList.toggle('lit', lit);
  pill.title = lit ? '今天完成靈修了・累積靈修天數' : '累積靈修天數';
}
// 出席燈＋書卷收集併入領獎畫面（James 2026-08-29：兩個動畫合一，不再有短畫面）。進度條開啟後從上一格滑到新格。
function renderRewardAttendance() {
  document.getElementById('rw-fire-sub').textContent = `累積靈修 ${devotionDays()} 天`;
  const book = bookOfChapter(selectedChapter);   // 2026-08-31 D4：統一走 core.js 反查
  const p = book ? getBookProgress(book) : null;
  const el = document.getElementById('rw-book');
  if (!p) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `📖 ${book.name} 收集 ${p.done}/${p.total}<div class="rw-bar"><i id="rw-bar-fill" style="width:${Math.round(Math.max(0, p.done - 1) / p.total * 100)}%"></i></div>`;
  setTimeout(() => { const f = document.getElementById('rw-bar-fill'); if (f) f.style.width = `${Math.round(p.done / p.total * 100)}%`; }, 900);
  renderAttendance();
}

function renderAvatar() {
  document.getElementById('av-hat').textContent  = state.hat;
  document.getElementById('av-body').textContent = state.body;
  document.getElementById('av-item').textContent = state.item;
  // bg shown as subtle background in avatar wrap
  const wrap = document.getElementById('av-wrap');
  if (state.bg && state.bg !== '🌿') {
    wrap.style.background = `linear-gradient(135deg, var(--sky), var(--sky-deep))`;
    let bgEl = document.getElementById('av-bg');
    if (!bgEl) {
      bgEl = document.createElement('span');
      bgEl.id = 'av-bg';
      bgEl.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:48px;opacity:0.18;border-radius:17px;overflow:hidden;pointer-events:none;';
      wrap.appendChild(bgEl);
    }
    bgEl.textContent = state.bg;
  } else {
    const bgEl = document.getElementById('av-bg');
    if (bgEl) bgEl.textContent = '';
  }
  ensureTitleItems();   // 稱號補發（幂等）：已完走卷數對應的稱號若不在背包就補入袋
  const nameEl = document.getElementById('av-name');
  nameEl.textContent = state.name;
  if (state.title) { const chip = document.createElement('span'); chip.className = 'av-title'; chip.textContent = state.title; nameEl.appendChild(chip); }
  document.getElementById('av-level').textContent = `Lv.${state.level}`;   // PR ③b：等級只留數字，稱號改綁完走卷數、掛在名字旁
  document.getElementById('streak-num').textContent = devotionDays();   // 2026-08-27：🔥 改顯示累積靈修天數（中斷不歸零）
  const pct = Math.min((state.xp/100)*100,100);
  document.getElementById('xp-fill').style.width = pct+'%';
  document.getElementById('xp-lbl').textContent = `${state.xp} / 100 XP`;

  // Wardrobe unlock
  const days = Math.max(devotionDays(), state.streak || 0);   // 累積 3 天解鎖；舊 streak 已達者不倒退
  const unlocked = days >= 3;
  document.getElementById('wardrobe-btn').classList.toggle('show', unlocked);
  const hint = document.getElementById('unlock-hint');
  if (unlocked) { hint.classList.add('hidden'); }
  else {
    hint.classList.remove('hidden');
    const rem = 3 - days;
    document.getElementById('unlock-sub').innerHTML = `再完成 <strong>${rem} 天</strong>靈修解鎖衣櫃 👗`;
    const dots = document.getElementById('unlock-dots');
    dots.innerHTML = '';
    for (let i=0;i<3;i++) {
      const d = document.createElement('div');
      d.className = 'ul-dot'+(i<days?' on':'');
      dots.appendChild(d);
    }
  }
}

// 稱號梯（TITLE_LADDER／titlesForBooks／titlesUnlockedBetween／nextTitle）在 core.js。
// 補發：依目前完走卷數把應得稱號補進背包（以 slot+name 判重）；背包原本沒稱號且 state.title 空 → 自動掛最高那個。
function ensureTitleItems() {
  if (!Array.isArray(state.items)) return;
  const should = titlesForBooks(booksCompleted());
  const has = new Set(state.items.filter(i => i && i.slot === 'title').map(i => i.name));
  const missing = should.filter(t => !has.has(t.name));
  if (!missing.length) return;
  missing.forEach(t => state.items.push(t));
  if (!state.title) state.title = should[should.length - 1].name;
  saveState();
}

// ══ CHAPTER GRID ══════════════════════════════════════════

// ══ READING GUIDE ═════════════════════════════════════════

let guideStepOpen = false;
let readStepOpen = false;
let chapterReadDone = false;

function toggleGuideStep() {
  guideStepOpen = !guideStepOpen;
  // B1（2026-08-30）：導讀展開率；hasHard＝這章有無「難處」區塊（8/29 起的 guide.hard）
  if (guideStepOpen) { const g = getChapter(selectedChapter); track('guide_expand', { chapter: selectedChapter, hasHard: !!(g && Array.isArray(g.guide?.hard) && g.guide.hard.length) }); }
  document.getElementById('guide-content').classList.toggle('open', guideStepOpen);
  document.getElementById('step1-arrow').classList.toggle('open', guideStepOpen);
}

function toggleReadStep() {
  readStepOpen = !readStepOpen;
  document.getElementById('read-content').classList.toggle('open', readStepOpen);
  document.getElementById('step2-arrow').classList.toggle('open', readStepOpen);
}

// source：'bible_com'（點外連）／'already'（已在別處讀過，不驗證）。統計口徑＝「閱讀勳章領取率」（2026-08-27）。
function markAsRead(source) {
  if (chapterReadDone) return;
  sessionHasRead = true;
  track('read_chapter', { chapter: selectedChapter, source: source || 'bible_com' });
  // Give bonus XP（2026-08-31 D3：改走 core.applyXp，升級公式單一正本）
  const _xpUp = applyXp(state.xp, state.level, 15);
  state.xp = _xpUp.xp; state.level = _xpUp.level;
  saveState();
  renderAvatar();
  chapterReadDone = true;
  // Update UI
  document.getElementById('step2-badge').classList.add('done');
  document.getElementById('step2-sub').textContent = '已完成閱讀 · 閱讀勳章獲得！';
  document.getElementById('step2-done').style.display = 'flex';
  // 2026-08-31 修（issue #75 A1）：原本查不存在的 id 'read-full-btn'（實際 id 是 bible-link），按鈕從未被隱藏
  const _fullBtn = document.querySelector('.read-full-btn');
  if (_fullBtn) _fullBtn.style.display = 'none';
  const alreadyBtn = document.getElementById('read-already-btn'); if (alreadyBtn) alreadyBtn.style.display = 'none';
  document.getElementById('read-done-row').style.display = 'flex';
}

function renderGuide(data) {
  // Reset state
  guideStepOpen = false;
  readStepOpen = false;
  chapterReadDone = false;
  document.getElementById('guide-content').classList.remove('open');
  document.getElementById('read-content').classList.remove('open');
  document.getElementById('step1-arrow').classList.remove('open');
  document.getElementById('step2-arrow').classList.remove('open');
  document.getElementById('step2-badge').classList.remove('done');
  document.getElementById('step2-done').style.display = 'none';
  document.getElementById('read-done-row').style.display = 'none';
  const readFullBtn = document.querySelector('.read-full-btn');
  if (readFullBtn) readFullBtn.style.display = 'flex';
  const alreadyBtn0 = document.getElementById('read-already-btn');
  if (alreadyBtn0) alreadyBtn0.style.display = '';

  const steps = document.getElementById('reading-steps');

  if (!data.guide) {
    // No guide yet — show simple link only
    steps.innerHTML = `<div class="step-divider-line"></div>
      <a id="bible-link" href="${BIBLE_LINKS[data.chapter]||'#'}" target="_blank" class="read-full-btn" style="margin-top:4px;">
        📖 閱讀完整章節
        <span class="read-time-tag">${data.readTime ? `約${data.readTime}分鐘 →` : '前往閱讀 →'}</span>
      </a>`;
    return;
  }

  // Update read time
  document.getElementById('read-time-tag').textContent = `約${data.readTime || 5}分鐘 →`;
  document.getElementById('step2-sub').textContent = `前往 Bible.com 閱讀 · 約${data.readTime || 5}分鐘`;
  document.getElementById('step1-sub').textContent = `章節大綱，幫助理解脈絡 · 約2分鐘`;

  // 難章幫助（2026-08-29 James 拍板）：guide.hard 選填＝這章讀者具體會卡的 1-3 點；沒填就沒有區塊。
  // 不預設「這章很難」的立場，只給幫助；同一原則的另一半是下方導向書卷背景的入口。
  const hardList = Array.isArray(data.guide.hard) ? data.guide.hard.filter(h => h && String(h).trim()) : [];
  // 美術審查（2026-08-29）：hard 併進 focus 同一個紫框容器，不另開白盒（避免白—紫—白三明治）
  const hardHtml = hardList.length
    ? `<div class="guide-hard-lbl">讀的時候可能卡住的地方</div>${hardList.map(h => `<div class="guide-hard-row">${h}</div>`).join('')}`
    : '';
  // 書卷背景入口（全卷恆開，BOOK_DETAIL_ENABLED 已退役）
  const guideBook = bookOfChapter(data.chapter);   // 2026-08-31 D4：統一走 core.js 反查
  const bookLinkHtml = guideBook
    ? `<div class="guide-book-link" onclick="openBookDetail('${guideBook.key}')">📚 這章讀起來吃力？先認識《${guideBook.name}》 →</div>`
    : '';

  // Build guide inner
  const outline = data.guide.outline.map(o =>
    `<div class="guide-ol-row"><span class="guide-ol-nodes">${o.nodes}</span><span>${o.text}</span></div>`
  ).join('');

  document.getElementById('guide-inner').innerHTML = `
    <div class="guide-intro-text">${data.guide.intro}</div>
    <div class="guide-outline-box">
      <div class="guide-outline-lbl">本章重點</div>
      ${outline}
    </div>
    <div class="guide-focus-box">💡 ${data.guide.focus}${hardHtml}</div>
    ${bookLinkHtml}`;

  // Auto open step 1
  setTimeout(() => {
    guideStepOpen = true;
    document.getElementById('guide-content').classList.add('open');
    document.getElementById('step1-arrow').classList.add('open');
  }, 300);
}

const calToday = new Date();
let calYear  = calToday.getFullYear();
let calMonth = calToday.getMonth();
let calWeek  = 0;
let calSelectedDate = null;

// calDateStr / calWeekOfMonth / calWeeksInMonth（日曆算術）與 chapterLabel / chapterFull（章節顯示名）
// 已搬到 core.js；calIsToday 依賴頁面的 calToday，留在這裡。
function calIsToday(y, m, d) {
  return y===calToday.getFullYear() && m===calToday.getMonth() && d===calToday.getDate();
}

function renderCalendar() {
  renderCalHeader();
  renderCalWeekTabs();
  renderCalGrid();
}

function renderCalHeader() {
  document.getElementById('cal-month-title').textContent = `${calYear}年 ${calMonth+1}月 ▾`;
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const ws = calWeek * 7 - firstDay + 1;
  const we = ws + 6;
  const cs = Math.max(1, ws), ce = Math.min(daysInMonth, we);
  document.getElementById('cal-week-sub').textContent = `第${calWeek+1}週 · ${calMonth+1}/${cs} - ${calMonth+1}/${ce}`;
}

function renderCalWeekTabs() {
  const tabs = document.getElementById('cal-week-tabs');
  const total = calWeeksInMonth(calYear, calMonth);
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  tabs.innerHTML = '';
  for (let w = 0; w < total; w++) {
    const ws = w*7 - firstDay + 1;
    const we = ws + 6;
    const cs = Math.max(1,ws), ce = Math.min(daysInMonth,we);
    const btn = document.createElement('button');
    btn.className = 'week-tab' + (w===calWeek?' active':'');
    btn.textContent = `${calMonth+1}/${cs}-${ce}`;
    btn.onclick = () => { calWeek = w; renderCalendar(); };
    tabs.appendChild(btn);
  }
}

function renderCalGrid() {
  const grid = document.getElementById('cal-grid');
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const weekStart = calWeek * 7;
  grid.innerHTML = '';
  for (let pos = weekStart; pos <= weekStart+6; pos++) {
    const d = pos - firstDay + 1;
    const cell = document.createElement('div');
    if (d < 1 || d > daysInMonth) {
      cell.className = 'cal-day empty';
    } else {
      const ds = calDateStr(calYear, calMonth, d);
      const chapters = getScheduleChapters(ds);
      const availChapters = chapters.filter(c => getChapter(c));
      const hasContent = availChapters.length > 0;
      const doneCount = availChapters.filter(c => isChapterDone(c)).length;
      const allDone = hasContent && doneCount === availChapters.length;
      const partialDone = hasContent && doneCount > 0 && doneCount < availChapters.length;
      const todayFlag = calIsToday(calYear, calMonth, d);
      const sel = calSelectedDate === ds;
      let cls = 'cal-day';
      if (sel) cls += ' cal-selected';
      else if (allDone) cls += ' cal-done';
      else if (partialDone) cls += ' cal-partial';
      else if (todayFlag) cls += ' cal-today';
      cell.className = cls;
      cell.onclick = () => calSelectDay(ds, d);
      let inner = todayFlag && !sel ? '<div class="today-tag">今日</div>' : '';
      // 合併日格右上角徽章：未完成 N/M、完成則隱藏（既有 cal-done 已表達完成）
      if (availChapters.length >= 2 && !allDone) {
        inner += `<div class="cal-partial-badge">${doneCount}/${availChapters.length}</div>`;
      }
      inner += `<div class="cal-day-num">${d}</div>`;
      if (chapters.length > 0 && hasContent) {
        // 合併日統一顯示「合併日」三字（取代「林後 5+1」避免擠壓截斷）；單章日顯示完整縮寫
        const lbl = availChapters.length >= 2 ? '合併日' : chapterLabel(availChapters[0]);
        inner += `<div class="cal-day-ch${lbl.length > 3 ? ' long' : ''}">${lbl}</div>`;
      } else if (chapters.length > 0 && !hasContent) {
        inner += `<div class="cal-day-ch" style="color:var(--text-soft);opacity:.5;">🔜</div>`;
      }
      inner += '<div class="cal-dot"></div>';
      cell.innerHTML = inner;
    }
    grid.appendChild(cell);
  }
}

function calSelectDay(ds, d) {
  calSelectedDate = ds;
  renderCalGrid();
  updateDayInfoBar(ds, d);
}

// 單章模式：恢復 day-info-bar 既有單章 DOM 結構
const SINGLE_DAY_BAR_HTML = `
  <div class="day-info-icon" id="day-info-icon">📖</div>
  <div style="flex:1;">
    <div class="day-info-date" id="day-info-date"></div>
    <div class="day-info-chapter" id="day-info-chapter"></div>
    <div class="day-info-status" id="day-info-status"></div>
  </div>
  <button class="day-info-btn" id="day-info-btn" onclick="confirmDaySelection()">開始靈修</button>
`;

function updateDayInfoBar(ds, d) {
  const bar = document.getElementById('day-info-bar');
  const chapters = getScheduleChapters(ds);
  const availChapters = chapters.filter(c => getChapter(c));
  const todayFlag = calIsToday(calYear, calMonth, d);
  const isFuture = new Date(calYear, calMonth, d) > new Date(calToday.getFullYear(), calToday.getMonth(), calToday.getDate());
  const weekdays = ['日','一','二','三','四','五','六'];
  const wd = new Date(calYear, calMonth, d).getDay();
  const dateLabel = todayFlag ? `今天 · ${calMonth+1}月${d}日（${weekdays[wd]}）` : `${calMonth+1}月${d}日（${weekdays[wd]}）`;

  // ── 合併日模式：兩章可玩家自選 ──
  if (availChapters.length >= 2) {
    bar.classList.add('merged');
    const cardsHtml = availChapters.map(c => {
      const data = getChapter(c);
      const done = isChapterDone(c);
      return `
        <div class="merged-day-card ${done ? 'done' : ''}" onclick="selectMergedDayChapter('${c}')">
          <div class="merged-day-card-emoji">${data.sceneEmoji}</div>
          <div class="merged-day-card-name">${chapterFull(c)}</div>
          <div class="merged-day-card-status">${done ? '✅ 已完成' : (isFuture ? '📖 提前' : '未完成')}</div>
        </div>`;
    }).join('');
    bar.innerHTML = `
      <div class="merged-day-header">
        <div class="day-info-date">${dateLabel}</div>
        <div class="merged-day-hint">📖 合併日 · 任一章開始都可以</div>
      </div>
      <div class="merged-day-cards">${cardsHtml}</div>
    `;
    return;
  }

  // ── 單章模式：恢復原始 DOM 結構（若 bar 之前是合併模式則重建）──
  if (bar.classList.contains('merged')) {
    bar.classList.remove('merged');
    bar.innerHTML = SINGLE_DAY_BAR_HTML;
  }
  const ch = availChapters[0] || chapters[0];
  const chapterData = ch ? getChapter(ch) : null;
  const hasContent = !!chapterData;
  const done = hasContent ? isChapterDone(ch) : false;

  document.getElementById('day-info-date').textContent = dateLabel;
  const btn = document.getElementById('day-info-btn');
  const statusEl = document.getElementById('day-info-status');

  if (chapters.length === 0) {
    // 無讀經進度的日子（例如週日休息）
    document.getElementById('day-info-icon').textContent = '—';
    document.getElementById('day-info-chapter').textContent = '本日無讀經進度';
    statusEl.textContent = '';
    statusEl.className = 'day-info-status';
    btn.textContent = '開始靈修';
    btn.disabled = true;
  } else if (!hasContent) {
    // 有讀經進度但遊戲內容尚未更新
    document.getElementById('day-info-icon').textContent = '🔜';
    document.getElementById('day-info-chapter').textContent = chapterFull(ch);
    statusEl.textContent = '⏳ 遊戲內容準備中，敬請期待';
    statusEl.className = 'day-info-status';
    statusEl.style.color = 'var(--text-soft)';
    btn.textContent = '內容更新中';
    btn.disabled = true;
  } else if (done) {
    document.getElementById('day-info-icon').textContent = '📖';
    document.getElementById('day-info-chapter').textContent = chapterFull(ch);
    statusEl.textContent = '✅ 已完成靈修';
    statusEl.className = 'day-info-status done';
    statusEl.style.color = '';
    btn.textContent = '重新閱讀';
    btn.disabled = false;
  } else if (isFuture) {
    document.getElementById('day-info-icon').textContent = '📖';
    document.getElementById('day-info-chapter').textContent = chapterFull(ch);
    statusEl.textContent = '📖 提前靈修';
    statusEl.className = 'day-info-status preview';
    statusEl.style.color = '';
    btn.textContent = '提前靈修';
    btn.disabled = false;
  } else if (todayFlag) {
    document.getElementById('day-info-icon').textContent = '📖';
    document.getElementById('day-info-chapter').textContent = chapterFull(ch);
    statusEl.textContent = '今日讀經・尚未完成';
    statusEl.className = 'day-info-status todo';
    statusEl.style.color = '';
    btn.textContent = '開始靈修';
    btn.disabled = false;
  } else {
    document.getElementById('day-info-icon').textContent = '📖';
    document.getElementById('day-info-chapter').textContent = chapterFull(ch);
    statusEl.textContent = '📚 補讀・尚未完成';
    statusEl.className = 'day-info-status todo';
    statusEl.style.color = '';
    btn.textContent = '補讀';
    btn.disabled = false;
  }
}

// 合併日：玩家從雙卡選一章 → 載入該章 + 滾動到 verse-card
function selectMergedDayChapter(ch) {
  // 情緒2.0：合併日點雙卡也是玩家主動動作 → 先彈心情選擇器
  _pendingChapterPick = ch;
  openOverlay('mood-overlay');
}

// 情緒2.0：心情選擇器回呼 —— 選心情 / 先不說 → 載入章節
function proceedToChapter() {
  const pick = _pendingChapterPick;
  _pendingChapterPick = null;
  if (!pick) return;
  selectChapter(pick);          // 注意：selectChapter 重置區會把 sessionMood 歸 null…
  sessionMood = _pendingMood;   // …故必須在 selectChapter 之後才賦值本次心情
  _pendingMood = null;
  enterFocusMode(pick);         // PR ②：主動開始靈修 → 焦點模式
  setTimeout(() => {
    document.querySelector('.verse-card').scrollIntoView({behavior:'smooth', block:'start'});
  }, 200);
}
function pickMood(mood) {
  _pendingMood = mood;
  closeOverlay('mood-overlay');
  proceedToChapter();
}
function skipMood() {            // 先不說：不存 mood、不留痕（紅線7）
  _pendingMood = null;
  closeOverlay('mood-overlay');
  proceedToChapter();
}

function confirmDaySelection() {
  if (!calSelectedDate) return;
  const chapters = getScheduleChapters(calSelectedDate);
  const availChapters = chapters.filter(c => getChapter(c));
  if (availChapters.length === 0) return;
  // 單章日：直接載入；合併日：載入預設章（第一個未完成 / 第一可用）
  // 合併日玩家通常從雙卡點，這條 fallback 給「日曆框被點 → confirmDaySelection 間接觸發」場景
  const pick = pickDefaultChapter(availChapters);
  if (!pick) return;
  // 情緒2.0：玩家主動「開始靈修」→ 先彈心情選擇器，選了或先不說才載入章節（紅線2 只在主動動作觸發）
  _pendingChapterPick = pick;
  openOverlay('mood-overlay');
}

function calChangeMonth(dir) {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  calWeek = 0;
  calSelectedDate = null;
  renderCalendar();
}

function calGoToday() {
  calYear = calToday.getFullYear();
  calMonth = calToday.getMonth();
  calWeek = calWeekOfMonth(calYear, calMonth, calToday.getDate());
  const ds = calDateStr(calYear, calMonth, calToday.getDate());
  calSelectedDate = ds;
  renderCalendar();
  updateDayInfoBar(ds, calToday.getDate());
}

function openMonthPicker() {
  document.getElementById('picker-year-title').textContent = `${calYear}年`;
  const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  document.getElementById('month-grid-picker').innerHTML = months.map((m,i) =>
    `<div class="month-item${i===calMonth?' active':''}" onclick="calSelectMonth(${i})">${m}</div>`
  ).join('');
  openOverlay('month-picker-overlay');   // 2026-09-01 D10：走 helper 取得 body 捲動鎖（原直接 classList 無鎖）
}

function calSelectMonth(m) {
  calMonth = m; calWeek = 0; calSelectedDate = null;
  closeMonthPicker();
  renderCalendar();
}

function closeMonthPicker() {
  closeOverlay('month-picker-overlay');   // 2026-09-01 D10：對稱走 helper
}

// ══ CHAPTER GRID (kept for wardrobe/reset refresh) ═══════
function renderChapterGrid() { renderCalendar(); }

// 換章節時要歸零的「本章 session 狀態」集中在這一處（issue #6）：
// 以前散在 selectChapter 開頭逐個手動清，漏一個就跨章節污染（sessionMood 踩過）。
// 新增 session 變數時請在這裡加一行，不要回去 selectChapter 裡塞。
function resetSessionState() {
  pendingChoice = null;
  choiceConfirmed = false;
  reflSubmitted = false;
  sessionChoice = null;
  sessionHasRead = false;
  sessionMood = null;  // 情緒2.0：跨章不留痕——任何 selectChapter 呼叫都清掉；mood-picked 路徑在 proceedToChapter 於此之後重設
  _reflEditStart = null;  // 換章節清掉上一章的編輯起點，避免帶舊時間
  document.getElementById('refl-text').value = '';
  document.getElementById('ai-resp').classList.remove('show');
  document.getElementById('choice-feedback').style.display = 'none';
}

function selectChapter(ch) {
  resetSessionState();

  // v2.12 hotfix: 寬鬆比對容忍數字/字串 chapter key 混用（使徒行傳用數字、其他書卷用字串）。長期規格統一後可移除。
  const data = getChapter(ch);
  if (!data) return;
  // v2.12 hotfix 策略 A: 用 data.chapter 而非外部傳入的 ch，從源頭正規化型別。
  // 解決使徒行傳合併日 onclick HTML 屬性字串化導致下游 19 處 selectedChapter 污染、
  // 以及 selectChapter 函式體內 chapterFull(ch) 等用區域參數 ch 的位置污染。
  ch = data.chapter;
  selectedChapter = ch;
  // B1: chapter_select（同時記起點，後續階段帶 elapsedSec 算各段停留）
  _chapterSelectAt = Date.now();
  // B1（2026-08-30）：合併日帶 merged／order（order＝今天該日已完成幾章＋1，看玩家先讀哪章）
  const _sdSel = findScheduleDate(ch); const _dayChs = _sdSel ? getScheduleChapters(_sdSel) : [];
  const _selP = { chapter: ch };
  if (_dayChs.length >= 2) { _selP.merged = true; _selP.order = _dayChs.filter(c => isChapterDone(c)).length + 1; }   // 2026-08-31 修：改走 chapterKey 正規化（原 String(c) 對使徒行傳數字 key 永遠 miss，order 恆為 1）
  track('chapter_select', _selP);

  // Update badge
  document.getElementById('book-badge').textContent = `📖 ${chapterFull(ch)}`;

  // Verse
  document.getElementById('verse-lbl-text').textContent = `✨ 今日經文`;
  document.getElementById('verse-text').textContent = data.verse;
  document.getElementById('verse-ref').textContent = data.verseRef;

  // Render reading guide (sets bible-link href inside)
  renderGuide(data);
  // Update bible-link href (may be re-created by renderGuide for no-guide case)
  const bibleLink = document.getElementById('bible-link');
  if (bibleLink) bibleLink.href = BIBLE_LINKS[ch] || `https://www.bible.com/zh-TW/bible/46/ACT.${ch}.CUNP`;

  // Scene & question
  document.getElementById('scene-emoji').textContent = data.sceneEmoji;
  document.getElementById('scene-text').textContent = data.scene;
  document.getElementById('scenario-q').textContent = data.q;
  // B1: question_view — 玩家看到情境題（selectChapter 一次性 render，等同 chapter_select 後立即看到題）
  track('question_view', _elapsed({ chapter: ch }));

  // Choices
  const container = document.getElementById('choices-container');
  container.innerHTML = data.choices.map(c =>
    `<button class="choice-btn" id="choice-${c.k}" onclick="selectChoice(this,'${c.k}')">
      <span class="ch-letter">${c.k}</span><span>${c.text}</span>
    </button>`
  ).join('');

  // Reflection
  document.getElementById('refl-title').textContent = data.reflectionTitle;
  document.getElementById('refl-q').innerHTML = data.reflection.replace(/\n/g,'<br>');

  // Done state
  const done = isChapterDone(ch);
  const doneBanner = document.getElementById('done-banner');
  const completeBtn = document.getElementById('complete-btn');
  if (done) {
    doneBanner.classList.add('show');
    document.getElementById('done-banner-sub').textContent = `已於 ${state.completed[chapterKey(ch)]} 完成，可重新閱讀內容。`;
    completeBtn.textContent = '✅ 已完成此章靈修';
    completeBtn.disabled = true;
    completeBtn.classList.add('done');
  } else {
    doneBanner.classList.remove('show');
    completeBtn.textContent = '✨ 完成今日靈修，領取裝備！';
    completeBtn.disabled = true;
    completeBtn.classList.remove('done');
  }
  renderRewardRecovery(ch);   // 領裝備漏領補救：已完成但未領 → 補發鈕 + 安撫文案
}

// ══ CHOICE SELECTION ══════════════════════════════════════

function selectChoice(btn, choice) {
  if (choiceConfirmed) return;
  // v2.12 hotfix: 同 selectChapter 的型別寬鬆化處理
  const data = getChapter(selectedChapter);
  if (!data) return;

  if (pendingChoice !== choice) {
    // First tap: preview
    document.querySelectorAll('.choice-btn').forEach(b => {
      b.classList.remove('selected','previewing');
      const hint = b.querySelector('.confirm-hint');
      if (hint) hint.remove();
    });
    pendingChoice = choice;
    btn.classList.add('previewing');
    const hint = document.createElement('div');
    hint.className = 'confirm-hint';
    hint.textContent = '👆 再點一次確認';
    hint.style.cssText = 'font-size:12px;color:var(--green-dark);font-weight:700;margin-top:6px;padding:4px 8px;background:rgba(76,175,80,.1);border-radius:8px;display:inline-block;';
    btn.appendChild(hint);
    return;
  }

  // Second tap: confirm
  choiceConfirmed = true;
  sessionChoice = choice;
  pendingChoice = null;
  // B1: choice_confirm
  track('choice_confirm', _elapsed({ chapter: selectedChapter, choice }));
  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = true;
    b.classList.remove('previewing');
    const hint = b.querySelector('.confirm-hint');
    if (hint) hint.remove();
    b.style.opacity = b === btn ? '1' : '0.45';
  });
  btn.classList.add('selected');

  const fb = document.getElementById('choice-feedback');
  fb.textContent = data.responses[choice];
  fb.style.display = 'block';
  fb.style.animation = 'popIn .4s ease';

  if (!isChapterDone(selectedChapter)) {
    document.getElementById('complete-btn').disabled = false;
  }

  setTimeout(() => {
    document.querySelector('.refl-card').scrollIntoView({behavior:'smooth',block:'nearest'});
  }, 600);
}

// ══ REFLECTION ══════════════════════════════════════════
// AI response only triggers on complete, not auto-submit while typing

let lastAiResponse = '';
let lastAiIsFallback = false;

async function submitReflection() {
  const text = document.getElementById('refl-text').value.trim();
  if (!text || reflSubmitted) return;
  reflSubmitted = true;
  // 默想編輯時長（整數秒）：有抓到起點才帶 editDuration，沒抓到乾淨省略（不送 0/NaN）。
  // 🔴 design-principles 紅線1：只記秒數、永遠不記默想內容、不做情感分析。
  const _reflParams = { chapter: selectedChapter };
  if (_reflEditStart != null) _reflParams.editDuration = Math.round((Date.now() - _reflEditStart) / 1000);
  track('submit_reflection', _elapsed(_reflParams));
  _reflEditStart = null;  // 送出後即重置，不僅依賴 reflSubmitted／換章節，避免起點殘留

  // 默想落地脫鉤（治本）：在 AI fetch 之前就直寫 reflections 子集合，獨立於 AI 成敗。
  // 此處只存玩家文字（aiResponse 此刻尚未產生，留給 finalize 寫進 chapter doc）；存檔失敗報錯、不 silent。
  // ★不寫 chapter doc（chapter doc 留給 finalize）→ 沒領就離開時：默想已保命，但不會誤進日記/誤判完成。
  // ★存檔失敗 → return false：呼叫端不生「領取」綠鈕、讓玩家重送，鎖死「章 completed ⟹ 非空默想已落地」。
  if (currentUser) {
    try {
      await db.collection('users').doc(currentUser.uid)
        .collection('chapters').doc(chapterKey(selectedChapter))
        .collection('reflections').doc(String(Date.now()))
        .set({
          reflectionText: text,
          submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch(e) {
      console.warn('Reflection save error:', e);
      showToast('⚠️ 默想沒存成功，請再按一次「完成」重送');
      reflSubmitted = false;   // 允許重送
      return false;            // 不進入可完成路徑
    }
  }

  const aiDiv = document.getElementById('ai-resp');
  const aiText = document.getElementById('ai-resp-text');
  aiDiv.classList.add('show');
  aiText.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';

  // v2.12 hotfix: 同 selectChapter 的型別寬鬆化處理
  const data = getChapter(selectedChapter);
  // fallback 文案單一正本在 content.js（AI_FALLBACK_TEXT），這裡不再放字串（issue #7）
  const fallback = AI_FALLBACK_TEXT;
  try {
    const res = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapter: chapterFull(selectedChapter),
        reflectionTitle: data?.reflectionTitle || '',
        playerText: text,
        uid: currentUser?.uid || null,
        mood: sessionMood || null,  // 情緒2.0：當次起點心情餵 AI（冷框架承接）；先不說=null，後端走無 mood 邏輯
        equipment: equippedVerses(state),  // AI 看裝備（2026-08-27 PR ①）：只送身上四件的 desc 經文，不送名稱／emoji；後端「至多引一句、不合則不提」
      }),
    });
    const d = await res.json();
    lastAiResponse = d.aiResponse || fallback;
    lastAiIsFallback = d.isFallback === true || !d.aiResponse;
    aiText.textContent = lastAiResponse;
    // B1: ai_response_received（API 回應收到，含 server 端 fallback 旗標）
    track('ai_response_received', { chapter: selectedChapter, isFallback: lastAiIsFallback, withEquipment: equippedVerses(state).length > 0 });
  } catch(e) {
    lastAiResponse = fallback;
    lastAiIsFallback = true;
    aiText.textContent = fallback;
    // B1: ai_response_received（網路失敗也算 received、以 fallback 文案呈現）
    track('ai_response_received', { chapter: selectedChapter, isFallback: true, withEquipment: equippedVerses(state).length > 0 });
  }
  return true;   // 默想已落地（或訪客無需雲端存）→ 允許進入可完成路徑
}

// ══ COMPLETE ══════════════════════════════════════════════

// resolveItem（依性別解析裝備）已搬到 core.js。

async function completeDevotional() {
  if (isChapterDone(selectedChapter)) return;

  const reflText = document.getElementById('refl-text').value.trim();

  if (!reflText) {
    const goBack = await showConfirm('⭐','要先填寫默想嗎？','填寫默想可以獲得默想裝備 ⭐\n要回去填，還是直接完成？','回去填默想','直接完成');
    if (goBack) return;
  }

  const btn = document.getElementById('complete-btn');
  btn.disabled = true;
  btn.textContent = '✨ 正在整理今日收穫…';

  if (reflText && !reflSubmitted) {
    const ok = await submitReflection();
    if (ok === false) {
      // 存檔失敗 → 不進入可完成路徑（不生綠鈕），讓玩家重送
      btn.disabled = false;
      btn.textContent = '✨ 完成今日靈修，領取裝備！';
      return;
    }
  }

  // 治本：完成（入袋/標completed/動畫）延後到「領取那一刻」才發生。
  if (reflSubmitted) {
    // 有默想 → 玩家先讀 AI，點下方綠鈕才 finalizeCompletion（= 完成 + 領取同時發生，不再有中間狀態）
    btn.textContent = '';
    const aiDiv = document.getElementById('ai-resp');
    // 領取引導提示：插在綠鈕「正上方」（AI回應 → 提示 → 綠鈕），輕量文字、無底色邊框
    const claimHint = document.createElement('p');
    claimHint.className = 'refl-claim-hint';
    claimHint.textContent = '願這段話與你同行，記得往下領取裝備 ↓';
    aiDiv.appendChild(claimHint);
    const claimBtn = document.createElement('button');
    claimBtn.className = 'green-btn';
    claimBtn.style.marginTop = '12px';
    claimBtn.textContent = '✅ 完成靈修，領取裝備';
    claimBtn.onclick = async () => { claimBtn.remove(); claimHint.remove(); await finalizeCompletion(); };
    aiDiv.appendChild(claimBtn);
  } else {
    // 沒默想 → 當下完成 + 動畫（行為等同現況）
    await finalizeCompletion();
  }
}

// 完成計分的純函式 computeCompletion（issue #4 抽出、issue #6 搬到 core.js）：只讀參數、不碰 DOM / Firestore / 全域狀態。
// 回傳「要套用的變更」，由下面 finalizeCompletion 負責套用與 I/O；調 xp 公式、改 streak 規則直接對 test/core.test.js 寫測試。

// 領裝備治本：完成那塊統一在此。由「綠鈕（有默想）」或「completeDevotional 當下（沒默想）」呼叫。
// 完成 = 領取那一刻；沒領 = 沒完成、下次可重做（不會留下「入袋了但沒領」的中間狀態）。
async function finalizeCompletion() {
  if (isChapterDone(selectedChapter)) return;   // 🔴 護欄1：防綠鈕連點 / 重入 → 重複入袋 + 重複 streak++

  const reflText = document.getElementById('refl-text').value.trim();
  const hasBonus = reflText.length > 0;
  const data = getChapter(selectedChapter);

  // 計分交給純函式 computeCompletion，這裡只負責套用結果與 I/O（issue #4）
  const myScheduleDate = findScheduleDate(selectedChapter);
  const today = todayStr();
  const r = computeCompletion({
    data, chapter: selectedChapter, hasBonus,
    gender: state.gender || 'n',
    xp: state.xp, level: state.level,
    completed: state.completed,
    dayChapters: myScheduleDate ? getScheduleChapters(myScheduleDate) : [],
    today,
  });

  // 套用：入袋（PR ③b 砍自動換裝——新裝備只入背包，領獎畫面可「試穿」）→ xp/等級 → streak → completed → 稱號
  const booksBefore = booksCompleted();
  state.items.push(r.newItem);
  if (r.bonusItem) state.items.push(r.bonusItem);
  state.xp = r.xp;
  state.level = r.level;
  state.streak += r.streakInc;
  state.completed[r.completedKey] = today;
  // 稱號（第五部位）：完走卷數跨過里程碑就入袋，並自動掛上最新那個
  const newTitles = titlesUnlockedBetween(booksBefore, booksCompleted())
    .filter(t => !state.items.some(i => i && i.slot === 'title' && i.name === t.name));
  newTitles.forEach(t => state.items.push(t));
  if (newTitles.length) state.title = newTitles[newTitles.length - 1].name;
  const newItem = r.newItem, bonusItem = r.bonusItem, isMergedDayAllDone = r.isMergedDayAllDone;
  // f469a3d：完成即記已領（completed 必伴隨 rewardClaimed）。2026-08-31 D1：提前到 flush 前，
  // 與 completed 同一次寫入落地，省掉原本尾端第二次 saveState 的整份 user-doc debounce 寫入。
  if (!state.rewardClaimed) state.rewardClaimed = {};
  state.rewardClaimed[chapterKey(selectedChapter)] = true;
  saveState();
  await flushToFirestore();  // 完成節點即時寫雲端：完成後 1.5s 內關 app 也不掉（其他 saveState 仍走 debounce）
  const reflText2 = document.getElementById('refl-text').value.trim();
  saveChapterRecord(selectedChapter, sessionChoice, hasBonus, sessionHasRead, reflText2);

  renderAvatar();
  renderChapterGrid();
  track('complete_devotional', _elapsed({ chapter: selectedChapter }));

  // 合併日完成第二章 toast：在 reward overlay open 後 1.8s 觸發，等 confetti 收尾再出現
  const afterReward = () => {
    if (isMergedDayAllDone) {
      setTimeout(() => showToast('兩章都讀完了，今天教會的進度走完了 ✨'), 1800);
    }
    pendingProfileNudge = true; // E1：玩家關掉領獎 modal 後觸發 nudge
  };
  showReward(newItem, bonusItem, hasBonus, newTitles);   // 出席燈＋書卷收集＋稱號在 showReward 內一併呈現
  afterReward();
  setTimeout(() => checkAchievements(), 1500);

  const btn = document.getElementById('complete-btn');
  btn.textContent = '✅ 已完成此章靈修';
  btn.classList.add('done');
  document.getElementById('done-banner').classList.add('show');
  document.getElementById('done-banner-sub').textContent = `已於 ${todayStr()} 完成，可重新閱讀內容。`;
}

// ══ REWARD ══════════════════════════════════════════════

// 領裝備漏領補救（B 核心 + C 文案）：在已完成章節的 Done 區塊，依「已領/未領 × 背包有無」決定顯示。
// ★ 此函式只控制「補發入口的顯示」與「安撫文案」，不發放任何裝備、不動完成判定。
function renderRewardRecovery(ch) {
  const key = chapterKey(ch);
  const completeBtn = document.getElementById('complete-btn');
  let box = document.getElementById('reward-recovery');
  if (!box) {
    box = document.createElement('div');
    box.id = 'reward-recovery';
    box.style.cssText = 'margin:10px 0 0;text-align:center;';
    completeBtn.parentNode.insertBefore(box, completeBtn);
  }
  box.innerHTML = '';
  if (!isChapterDone(ch)) { box.style.display = 'none'; return; }   // 未完成章不顯示
  box.style.display = 'block';
  const claimed = !!(state.rewardClaimed && state.rewardClaimed[key]);
  const owned = (state.items || []).some(i => chapterKey(i.chapter) === key);
  if (claimed) {
    // C：已領 → 安撫文案（背包有才宣稱已收入背包）
    box.innerHTML = owned
      ? '<div style="font-size:12px;color:var(--green-dark);font-weight:700;">本章裝備已收入背包 ✅</div>'
      : '<div style="font-size:12px;color:var(--text-soft);">本章已完成</div>';
    return;
  }
  // 未領 → B：補發鈕（純展示動畫）+ C：依背包有無給文案
  const note = owned ? '裝備已在背包，可補看領取動畫' : '可補看領取動畫';
  box.innerHTML = `<button class="green-btn" onclick="replayReward()">✅ 領取裝備</button>
    <div style="font-size:12px;color:var(--text-soft);margin-top:6px;">${note}</div>`;
}

// 領裝備漏領補救（B 核心）：補放領取動畫。★ 純展示——不 push 裝備、不加 xp、不動 completed/streak。
// 用全域 selectedChapter（與 completeDevotional 一致），避免 ACT 數字 key 經 inline 字串化後型別走樣。
function replayReward() {
  const ch = selectedChapter;
  const key = chapterKey(ch);
  if (!isChapterDone(ch)) return;                                  // 安全：只對已完成章
  if (state.rewardClaimed && state.rewardClaimed[key]) return;     // 已領就不再放
  const data = getChapter(ch);
  if (!data) return;
  const gender = state.gender || 'n';
  // hasBonus 由背包件數推：該章在 state.items 的件數（2=有稀有 / 1=無 / 0=資料已不在 → 僅基本展示）
  const ownedForCh = (state.items || []).filter(i => chapterKey(i.chapter) === key).length;
  const hasBonus = ownedForCh >= 2;
  const baseI = {...resolveItem(data.baseItem, gender), chapter: ch};
  const bonusI = hasBonus ? {...resolveItem(data.bonusItem, gender), chapter: ch} : null;
  showReward(baseI, bonusI, hasBonus);                             // 純展示動畫
  if (!state.rewardClaimed) state.rewardClaimed = {};
  state.rewardClaimed[key] = true;
  saveState();
  renderRewardRecovery(ch);                                        // 刷新：補發鈕 → 「已收入背包 ✅」
}

let lastRewardItems = [];   // 領獎畫面「試穿」用：本次新入袋的裝備
let _rewardOpenAt = null;
function showReward(item, bonus, hasBonus, newTitles) {
  newTitles = newTitles || [];
  // B1（2026-08-30）：完成短畫面曝光；稱號解鎖各記一筆（PR ③b）
  _rewardOpenAt = Date.now(); _focusRewarded = true;
  track('reward_view', { chapter: selectedChapter, hasBonus: !!bonus, newTitles: newTitles.length });
  newTitles.forEach(t => track('title_unlocked', { chapter: selectedChapter, title: t.name, booksDone: t.books != null ? t.books : undefined }));
  // 預覽：不再自動換裝（PR ③b），小人先照目前裝扮畫，再把新裝備疊上去當「試穿預覽」
  const prev = { hat: state.hat, body: state.body, hand: state.item, bg: state.bg };
  lastRewardItems = [item, bonus].filter(Boolean);
  lastRewardItems.forEach(i => { if (i.slot in prev) prev[i.slot] = i.emoji; });
  document.getElementById('r-hat').textContent = prev.hat;
  document.getElementById('r-body').textContent = prev.body;
  document.getElementById('r-item').textContent = prev.hand;
  const titleEl = document.getElementById('r-title');
  titleEl.style.display = newTitles.length ? '' : 'none';
  if (newTitles.length) {
    const t = newTitles[newTitles.length - 1];
    titleEl.innerHTML = `<div class="r-title-lbl">🏷️ 獲得稱號</div><div class="r-title-name">${t.emoji} ${t.name}</div><div class="r-title-desc">${t.desc}</div><div class="r-title-sub">已掛在名字旁，衣櫃可換</div>`;
  }

  const reveal = document.getElementById('item-reveal');
  if (bonus) {
    reveal.innerHTML = `<div class="item-row">
      <div class="item-box base"><div class="item-box-lbl">✨ 基本裝備</div><span class="item-box-emoji">${item.emoji}</span><div class="item-box-name">${item.name}</div></div>
      <div class="item-box bonus"><div class="item-box-lbl">⭐ 默想裝備</div><span class="item-box-emoji" style="animation:bounce .6s ease infinite alternate;">${bonus.emoji}</span><div class="item-box-name">${bonus.name}</div></div>
    </div><div style="font-size:11px;color:var(--text-soft);text-align:center;font-style:italic;">${bonus.desc}</div>`;
  } else {
    reveal.innerHTML = `<div style="text-align:center;padding:14px 0;">
      <div style="font-size:10px;font-weight:700;color:var(--green-dark);letter-spacing:.1em;margin-bottom:8px;">✨ 今日裝備</div>
      <div style="font-size:36px;margin-bottom:6px;">${item.emoji}</div>
      <div style="font-size:13px;font-weight:700;">${item.name}</div>
      <div style="font-size:11px;color:var(--text-soft);margin-top:4px;">${item.desc}</div>
      <div style="margin-top:10px;padding:8px 12px;background:rgba(156,123,181,.1);border-radius:8px;font-size:12px;color:var(--purple);">💡 填寫默想可獲得默想裝備 ⭐</div>
    </div>`;
  }
  reveal.innerHTML += '<button type="button" class="sky-btn r-tryon" onclick="tryOnReward()">👗 試穿新裝備</button><div class="r-tryon-sub">新裝備已收進背包，沒換裝也留著</div>';

  document.getElementById('share-text').innerHTML =
    `📖 ${chapterFull(selectedChapter)} 完成<br>今日裝備：${item.emoji} ${item.name}${bonus?`<br>默想裝備：${bonus.emoji} ${bonus.name}`:''}`;   // 2026-08-27：去天數行，只留章節＋當日裝備

  renderCommitBox();   // 自我約定（可關閉；只存 localStorage）
  renderRewardAttendance();
  launchConfetti();
  setTimeout(() => openOverlay('reward-overlay'), 300);
}

function closeReward() {
  track('reward_close', { chapter: selectedChapter, dwellSec: _rewardOpenAt ? Math.round((Date.now() - _rewardOpenAt) / 1000) : 0 });
  _rewardOpenAt = null;
  closeOverlay('reward-overlay');
  const _sd = findScheduleDate(selectedChapter);
  if (document.body.classList.contains('focus-mode')) {
    exitFocusMode({ noScroll: !!(_sd && getScheduleChapters(_sd).length >= 2) });   // PR ②：領完裝備回主畫面並刷新
  } else {
    refreshHome();   // issue #31：非焦點模式（首頁自動載入的今日章直接做完）也要刷新今日卡／日曆
  }
  // E1：領獎收尾後觸發輕量分眾提示（throttled，內部會自動跳過不該問的場景）
  if (pendingProfileNudge) {
    pendingProfileNudge = false;
    setTimeout(() => maybeShowProfileNudge(), 600);
  }
  // 合併日完成單章後：刷新日曆 + day-info-bar（讓剛完成的卡片變綠 ✅），並滾回 day-info-bar
  const myScheduleDate = findScheduleDate(selectedChapter);
  if (!myScheduleDate) return;
  const sameDayChapters = getScheduleChapters(myScheduleDate);
  if (sameDayChapters.length < 2) return;
  // 完成合併日任一章後刷新雙卡狀態：第一章完成時引導玩家看第二章；最後一章完成時讓兩卡都顯示已完成
  // v2.12 hotfix: 移除 allDone early return，讓最後一章完成後雙卡也即時刷新（之前完成第二章後雙卡停在「未完成」舊 DOM，需重整才正確）
  if (calSelectedDate === myScheduleDate) {
    const d = parseInt(myScheduleDate.split('-')[2], 10);
    renderCalGrid();
    updateDayInfoBar(myScheduleDate, d);
    setTimeout(() => {
      const bar = document.getElementById('day-info-bar');
      if (bar) bar.scrollIntoView({behavior:'smooth', block:'start'});
    }, 250);
  }
}

// ══ 自我約定「明天大概什麼時候？」（2026-08-27 PR ①）═══════════════
// 定位＝推播的前置實驗：只存 localStorage、不推播、不寫雲端、可在 ⋯ 選單關閉；預設會問。
// 第一次：完成頁問一次（五個時段＋不設定＋以後不用問我）；之後：「明天還是『睡前』嗎？」一鍵確認。
const COMMIT_SLOTS = [
  { k:'breakfast', label:'☕ 早餐後' }, { k:'commute', label:'🚌 通勤' }, { k:'lunch', label:'🍱 午休' },
  { k:'bed', label:'🌙 睡前' }, { k:'none', label:'🤷 不設定' },
];
const COMMIT_LS_ENABLED = 'commit_ask_enabled';   // '0' = 關閉；其餘（含未設）= 開
const COMMIT_LS_SLOT = 'commit_slot';             // 上次選的時段 key（'none' 也存，代表問過）
function commitAskEnabled() { try { return localStorage.getItem(COMMIT_LS_ENABLED) !== '0'; } catch(e) { return true; } }
function setCommitAskEnabled(on) { try { localStorage.setItem(COMMIT_LS_ENABLED, on ? '1' : '0'); } catch(e) {} renderCommitMenuLabel(); }
function commitSlotLabel(k) { const s = COMMIT_SLOTS.find(x => x.k === k); return s ? s.label.replace(/^\S+\s/, '') : ''; }
function renderCommitMenuLabel() {
  const b = document.getElementById('more-menu-commit');
  if (b) b.textContent = commitAskEnabled() ? '⏰ 明天約定：問我' : '⏰ 明天約定：不問';
}
function toggleCommitAsk() {
  const next = !commitAskEnabled();
  setCommitAskEnabled(next);
  track('commit_toggle', { enabled: next });
  showToast(next ? '⏰ 完成靈修後會問你明天大概什麼時候' : '⏰ 好，不再問明天的約定');
}
function renderCommitBox() {
  const box = document.getElementById('commit-box');
  if (!box) return;
  if (!commitAskEnabled()) { box.style.display = 'none'; box.innerHTML = ''; return; }
  let prev = ''; try { prev = localStorage.getItem(COMMIT_LS_SLOT) || ''; } catch(e) {}
  box.style.display = '';
  if (prev && prev !== 'none') {
    box.innerHTML = `<div class="commit-q">明天還是「${commitSlotLabel(prev)}」嗎？</div>
      <div class="commit-opts">
        <button type="button" class="commit-opt on" onclick="pickCommit('${prev}', 'confirm')">👍 是</button>
        <button type="button" class="commit-opt" onclick="renderCommitOptions()">換一個</button>
      </div>`;
  } else {
    renderCommitOptions();
  }
}
function renderCommitOptions() {
  const box = document.getElementById('commit-box');
  box.innerHTML = `<div class="commit-q">明天大概什麼時候？<small>只是跟自己約一下，不會提醒你</small></div>
    <div class="commit-opts">${COMMIT_SLOTS.map(s => `<button type="button" class="commit-opt" onclick="pickCommit('${s.k}', 'pick')">${s.label}</button>`).join('')}
      <button type="button" class="commit-opt mute" onclick="pickCommit('off', 'off')">以後不用問我</button>
    </div>`;
}
function pickCommit(k, mode) {
  const box = document.getElementById('commit-box');
  if (k === 'off') {
    setCommitAskEnabled(false);
    track('commit_time', { slot: 'off', mode });
    box.innerHTML = `<div class="commit-q">好，不再問了。想改回來在 ⋯ 選單「明天約定」。</div>`;
    return;
  }
  try { localStorage.setItem(COMMIT_LS_SLOT, k); } catch(e) {}
  track('commit_time', { slot: k, mode });
  box.innerHTML = `<div class="commit-q">${k === 'none' ? '好，明天見 🙂' : `好，明天「${commitSlotLabel(k)}」見 🙂`}</div>`;
}

// ══ COPY SHARE ══════════════════════════════════════════

function copyShare() {
  incrementShareCount();
  track('share', { chapter: selectedChapter });
  const text = document.getElementById('share-text').innerText;
  const btn = document.querySelector('#reward-overlay .green-btn');
  const ok = () => { btn.textContent='✅ 已複製！貼到Line群組吧'; setTimeout(()=>btn.textContent='📋 複製分享給小組',2500); };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(ok).catch(()=>fallbackCopy(text,btn));
  } else { fallbackCopy(text,btn); }
}

function fallbackCopy(text, btn) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px;';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { const ok = document.execCommand('copy'); btn.textContent = ok?'✅ 已複製！貼到Line群組吧':'⚠️ 請長按文字手動複製'; }
  catch(e) { btn.textContent='⚠️ 請長按文字手動複製'; }
  document.body.removeChild(ta);
  setTimeout(()=>btn.textContent='📋 複製分享給小組',2500);
}

// ══ WARDROBE ══════════════════════════════════════════

let wardSel = { hat:'', body:'🧑', hand:'', bg:'🌿', title:'' };
let wardSlot = 'hat';


function openWardrobe(preset) {
  wardSel = { hat:state.hat||'', body:state.body||'🧑', hand:state.item||'', bg:state.bg||'🌿', title:state.title||'' };
  if (preset) Object.assign(wardSel, preset);
  updateWardPreview();
  const first = (preset && Object.keys(preset)[0]) || 'hat';
  wardSlot = first;
  document.querySelectorAll('.slot-tab').forEach(t=>t.classList.toggle('active', t.dataset.slot === first));
  renderEquipGrid(first);
  openOverlay('ward-overlay');
}
// 領獎畫面「試穿」：關領獎、開衣櫃，把本次新裝備預先套上（要不要留下由玩家按儲存決定）
function tryOnReward() {
  const preset = {};
  lastRewardItems.forEach(i => { preset[i.slot] = i.emoji; });
  // 領獎畫面不關：衣櫃疊在上面開（z-index 拉高），關衣櫃就回到領獎畫面，分享／複製都還在（James 2026-08-29 真機回報）
  document.getElementById('ward-overlay').classList.add('stack-top');
  openWardrobe(preset);
}

function switchSlot(slot, el) {
  wardSlot = slot;
  document.querySelectorAll('.slot-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  renderEquipGrid(slot);
}

function renderEquipGrid(slot) {
  const grid = document.getElementById('equip-grid');
  const collected = (state.items||[]).filter(i=>i&&i.slot===slot);
  // Fix 1: none option uses empty string, not ✖️
  const noneVal  = slot==='body'?'🧑':slot==='bg'?'🌿':'';
  const noneName = slot==='body'?'素白旅人':slot==='bg'?'清晨草地':slot==='hat'?'不戴帽子':slot==='title'?'不掛稱號':'空手';
  const seen = new Set();
  // Fix 2: always show none + all collected items for this slot
  const items = [{id:'none', emoji:noneVal, name:noneName, slot}];
  // 稱號以名稱判重／比對（emoji 可能重複），其他部位以 emoji
  const keyOf = i => slot==='title' ? i.name : i.emoji;
  collected.forEach(i=>{ if(!seen.has(keyOf(i))){seen.add(keyOf(i));items.push(i);} });

  // Show "no items" only if truly no collected items (none option always shows)
  const curVal = slot==='hand' ? wardSel.hand : wardSel[slot];
  grid.innerHTML = items.map(item=>{
    const e = item.id==='none' ? noneVal : keyOf(item);
    const isEq = curVal === e;
    const displayEmoji = item.id==='none' ? (noneVal || '✕') : item.emoji;
    return `<div class="equip-item${isEq?' equipped':''}" onclick="equipItem('${slot}','${e.replace(/'/g, "\\'")}')">
      <div class="equip-emoji">${displayEmoji}</div>
      <div class="equip-name">${item.name}</div>
      ${isEq?'<div class="equip-check">✓</div>':''}
    </div>`;
  }).join('');

  if (collected.length === 0) {
    grid.innerHTML += `<div style="grid-column:2/-1;display:flex;align-items:center;padding:8px 4px;font-size:12px;color:var(--text-soft);">${slot==='title' ? '走完一卷書就有第一個稱號 🔒' : '完成靈修來收集裝備 🔒'}</div>`;
  }
}

function equipItem(slot, emoji) {
  if (slot==='hand') wardSel.hand = emoji;
  else wardSel[slot] = emoji;
  updateWardPreview();
  renderEquipGrid(slot);
}

function updateWardPreview() {
  document.getElementById('wp-hat').textContent  = wardSel.hat;
  document.getElementById('wp-body').textContent = wardSel.body;
  document.getElementById('wp-item').textContent = wardSel.hand;
  document.getElementById('wp-bg').textContent   = wardSel.bg;
  const wt = document.getElementById('wp-title');
  wt.textContent = wardSel.title ? `${state.name} · ${wardSel.title}` : state.name;
}

function saveWardrobe() {
  state.hat  = wardSel.hat;
  state.body = wardSel.body;
  state.item = wardSel.hand;
  state.bg   = wardSel.bg;
  state.title = wardSel.title || '';
  saveState();
  renderAvatar();
  track('equipment_change', { hat: state.hat || '', body: state.body || '', hand: state.item || '', bg: state.bg || '', title: state.title || '' });
  closeOverlay('ward-overlay');
  showToast('✅ 裝扮已儲存！');
  // 從領獎畫面試穿而來：領獎畫面還開著，小人同步成剛儲存的裝扮
  if (document.getElementById('reward-overlay').classList.contains('show')) {
    document.getElementById('r-hat').textContent = state.hat;
    document.getElementById('r-body').textContent = state.body;
    document.getElementById('r-item').textContent = state.item;
  }
}

// ══ DEV MODE ════════════════════════════════════════════

let devClickCount = 0;
let devClickTimer = null;

function devModeClick() {
  devClickCount++;
  clearTimeout(devClickTimer);
  devClickTimer = setTimeout(() => { devClickCount = 0; }, 2000);
  if (devClickCount >= 3) {
    devClickCount = 0;
    openDevMode();
  }
}

function openDevMode() {
  // Custom password modal instead of prompt() which is blocked on mobile
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(61,43,31,.8);z-index:500;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(4px);';
  overlay.innerHTML = `
    <div style="background:#FFFDF8;border-radius:20px;padding:28px 22px;max-width:320px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(61,43,31,.3);">
      <div style="font-size:32px;margin-bottom:10px;">🛠️</div>
      <div style="font-size:18px;font-weight:900;color:#3D2B1F;margin-bottom:6px;">開發者模式</div>
      <div style="font-size:13px;color:#7A6050;margin-bottom:18px;">請輸入密碼以解鎖所有裝備</div>
      <input id="dev-pwd-input" type="password" placeholder="輸入密碼"
        style="width:100%;background:#E8F4FD;border:2px solid #B8D9F0;border-radius:11px;padding:12px 14px;font-size:15px;font-family:'Noto Sans TC',sans-serif;color:#3D2B1F;margin-bottom:14px;outline:none;text-align:center;letter-spacing:2px;">
      <button id="dev-pwd-ok"
        style="width:100%;background:linear-gradient(135deg,#7BC67E,#4CAF50);border:none;border-radius:13px;padding:13px;color:white;font-family:'Noto Sans TC',sans-serif;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px;">確認</button>
      <button id="dev-pwd-cancel"
        style="width:100%;background:#E8F4FD;border:2px solid #B8D9F0;border-radius:13px;padding:11px;color:#7A6050;font-family:'Noto Sans TC',sans-serif;font-size:14px;cursor:pointer;">取消</button>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#dev-pwd-input');
  setTimeout(() => input.focus(), 100);

  const confirm = () => {
    if (input.value === 'acts2026dev') {
      overlay.remove();
      unlockAllItems();
    } else {
      input.style.borderColor = '#FF8A65';
      input.value = '';
      input.placeholder = '密碼錯誤，請再試';
      setTimeout(() => input.style.borderColor = '#B8D9F0', 1500);
    }
  };

  overlay.querySelector('#dev-pwd-ok').onclick = confirm;
  overlay.querySelector('#dev-pwd-cancel').onclick = () => overlay.remove();
  input.addEventListener('keydown', e => { if (e.key==='Enter') confirm(); });
}

function unlockAllItems() {
  const allItems = [];
  const g = state.gender || 'n';
  CHAPTERS.forEach(ch => {
    allItems.push({...resolveItem(ch.baseItem, g), chapter: ch.chapter});
    allItems.push({...resolveItem(ch.bonusItem, g), chapter: ch.chapter});
  });
  allItems.push({emoji:'🩱', name:'腓立比的囚衣', desc:'「保羅和西拉在監獄裡讚美神」', slot:'body', chapter:16});
  // All gender items
  Object.values(GENDER_ITEMS).flat().forEach(i => allItems.push({...i, chapter:'starter'}));

  const seen = new Set(state.items.map(i=>i.emoji));
  allItems.forEach(i => { if (!seen.has(i.emoji)) { seen.add(i.emoji); state.items.push(i); } });

  if (state.streak < 3) state.streak = 3;
  saveState();
  renderAvatar();
  renderChapterGrid();
  showToast('🛠️ 開發者模式：所有裝備已解鎖');
}

// ══ RESET ══════════════════════════════════════════════

function doReset(type) {
  closeOverlay('reset-overlay');
  if (type==='all') {
    // issue #75 A4：全清 app 擁有的 key（單一登錄表 LS_KEYS，D17）
    LS_KEYS.forEach(k => localStorage.removeItem(k));
    location.reload();
  } else {
    // Keep name & gender, reset progress
    const name = state.name, gender = state.gender, body = state.body;
    state = JSON.parse(JSON.stringify({
      setup:true, name, gender, body,
      level:1, xp:10, streak:0,
      hat:'', item:'', bg:'🌿', title:'',
      items:[], completed:{}
    }));
    saveState();
    renderAvatar();
    renderChapterGrid();
    selectChapter(CHAPTERS[0].chapter);
    showToast('✅ 進度已重置');
  }
}

// ══ OVERLAY HELPERS ══════════════════════════════════════

function openOverlay(id) {
  document.getElementById(id).classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeOverlay(id) {
  const el = document.getElementById(id);
  el.classList.remove('show');
  el.classList.remove('stack-top');
  // month-picker 用自己的 CSS class（非 .overlay），解鎖檢查一併涵蓋（D10）
  if (!document.querySelector('.overlay.show, .month-picker-overlay.show')) {
    document.body.style.overflow = '';
  }
}

// B1（2026-08-30）：說明頁曝光／關閉；source：first（首次自動）／version（公告後）／setup（建角色後）／menu（手動）
let _tutOpenAt = null;
function openTutorial(source) {
  _tutOpenAt = Date.now();
  track('tutorial_open', { source: source || 'unknown' });
  openOverlay('tut-overlay');
}
function closeTut() {
  const noRepeat = document.getElementById('tut-no-repeat').checked;
  track('tutorial_close', { noRepeat, dwellSec: _tutOpenAt ? Math.round((Date.now() - _tutOpenAt) / 1000) : 0 });
  _tutOpenAt = null;
  if (noRepeat) localStorage.setItem('tut_done','1');
  closeOverlay('tut-overlay');
  startupPromptDone('tutorial');   // D22：僅隊列開出的教學會推進；menu 手動開關因 id 不符為 no-op（審查 ⑤）
}

// ── Font size ─────────────────────────────────────────────
function applyFontSize(size) {
  document.documentElement.classList.remove('fs-sm', 'fs-md', 'fs-lg');
  document.documentElement.classList.add('fs-' + size);
  document.querySelectorAll('.fs-pick-btn').forEach(btn => {
    btn.classList.toggle('sel', btn.classList.contains('fs-pick-' + size));
  });
}

function setFontSize(size) {
  applyFontSize(size);
  track('change_font_size', { size });
  localStorage.setItem('fontSize', size);
  if (currentUser) {
    db.collection('users').doc(currentUser.uid).set({ fontSize: size }, { merge: true }).catch(() => {});
  }
}

function openFontSizePicker() {
  const current = localStorage.getItem('fontSize') || 'md';
  applyFontSize(current);
  openOverlay('fontsize-overlay');
}

// Apply saved font size on load
(function() {
  const saved = localStorage.getItem('fontSize');
  if (saved) applyFontSize(saved);
})();

// ── Topbar ⋯ menu ─────────────────────────────────────────
function toggleMoreMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('more-menu');
  if (menu.classList.contains('show')) {
    menu.classList.remove('show');
    return;
  }
  // 「我的留言」只給已登入玩家看（含只送過匿名的，因為他們有 uid）
  renderCommitMenuLabel();
  const myMsgsBtn = document.getElementById('more-menu-my-msgs');
  if (myMsgsBtn) myMsgsBtn.style.display = currentUser ? 'block' : 'none';
  // Anchor the menu's top-right to just below the button's bottom-right,
  // so it tracks the centered game layout on desktop instead of pinning to
  // the viewport edge.
  const rect = document.getElementById('more-menu-btn').getBoundingClientRect();
  menu.style.top = (rect.bottom + 6) + 'px';
  menu.style.right = (window.innerWidth - rect.right) + 'px';
  menu.style.left = 'auto';
  menu.classList.add('show');
}
function closeMoreMenu() {
  document.getElementById('more-menu').classList.remove('show');
}
document.addEventListener('click', () => {
  const m = document.getElementById('more-menu');
  if (m) m.classList.remove('show');
});

// ── Feedback (曠野呼聲) ───────────────────────────────────
// v2 wantReply：玩家是否希望團隊回覆；匿名身份時 UI 鎖成「不用回覆」
let feedbackState = { mood: null, identity: null, category: null, wantReply: null };
const FEEDBACK_VERSES = [
  { t: '「你們要將一切的憂慮卸給神，因為他顧念你們。」', r: '—— 彼得前書 5:7' },
  { t: '「我靠著那加給我力量的，凡事都能做。」', r: '—— 腓立比書 4:13' },
  { t: '「你的話是我腳前的燈，是我路上的光。」', r: '—— 詩篇 119:105' },
  { t: '「我的恩典夠你用的，因為我的能力是在人的軟弱上顯得完全。」', r: '—— 哥林多後書 12:9' },
];

function openFeedback() {
  resetFeedbackForm();
  openOverlay('feedback-overlay');
}

function resetFeedbackForm() {
  feedbackState = { mood: null, identity: null, category: null, wantReply: null };
  document.querySelectorAll('#feedback-overlay .fb-opt.sel').forEach(el => el.classList.remove('sel'));
  // 清掉 wantReply 區塊的鎖定狀態與提示
  document.querySelectorAll('#fb-want-reply .fb-opt-locked').forEach(el => el.classList.remove('fb-opt-locked'));
  const wrHint = document.getElementById('fb-want-reply-hint');
  if (wrHint) wrHint.style.display = 'none';
  document.getElementById('fb-message').value = '';
  updateFbCount();
  document.getElementById('fb-form').style.display = 'block';
  document.getElementById('fb-thanks').style.display = 'none';
}

function selectFbOption(groupId, field, btn) {
  document.querySelectorAll('#' + groupId + ' .fb-opt').forEach(x => x.classList.remove('sel'));
  btn.classList.add('sel');
  feedbackState[field] = btn.dataset.val;
  // 切換身份時連動 wantReply 鎖定狀態（匿名 → 鎖；具名 → 解鎖，保留之前的選擇）
  if (field === 'identity') {
    applyAnonLockOnWantReply(btn.dataset.val === 'anon');
  }
}

// 匿名時：把 wantReply 兩顆按鈕灰掉、自動選「不用回覆」、顯示提示
// 具名時：解鎖兩顆按鈕、隱藏提示（不清掉 feedbackState.wantReply，讓玩家切回具名仍記得之前的選擇）
function applyAnonLockOnWantReply(isAnon) {
  const wrEls = document.querySelectorAll('#fb-want-reply .fb-opt');
  const hint = document.getElementById('fb-want-reply-hint');
  if (isAnon) {
    feedbackState.wantReply = 'no';
    wrEls.forEach(el => {
      el.classList.add('fb-opt-locked');
      el.classList.toggle('sel', el.dataset.val === 'no');
    });
    if (hint) hint.style.display = 'block';
  } else {
    wrEls.forEach(el => el.classList.remove('fb-opt-locked'));
    if (hint) hint.style.display = 'none';
  }
}

function updateFbCount() {
  const v = document.getElementById('fb-message').value;
  document.getElementById('fb-count').textContent = `${v.length} / 300`;
}

async function submitFeedback() {
  if (!feedbackState.mood) { showToast('請先選今天的感覺'); return; }
  if (!feedbackState.identity) { showToast('請選擇身份'); return; }
  if (!feedbackState.wantReply) { showToast('請選是否希望收到回覆'); return; }
  if (!feedbackState.category) { showToast('請選擇分類'); return; }

  // Guest wanting named comment → prompt to login
  if (feedbackState.identity === 'named' && !currentUser) {
    openOverlay('feedback-login-prompt');
    return;
  }

  const isAnonymous = feedbackState.identity === 'anon';
  const doc = {
    mood: feedbackState.mood,
    category: feedbackState.category,
    message: document.getElementById('fb-message').value.trim(),
    isAnonymous,
    uid: (!isAnonymous && currentUser) ? currentUser.uid : null,
    displayName: (!isAnonymous && currentUser) ? (currentUser.displayName || null) : null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    chapter: selectedChapter || null,
    // v2 多輪對話：玩家是否希望團隊回覆（匿名強制 false）
    // 對話追蹤欄位（status / lastMessageAt / unreadByPlayer / unreadByAdmin / messageCount）
    // 採 lazy-init：admin 後台回覆或玩家追訊息時才寫；讀取時用 ?? 預設值容錯
    wantReply: feedbackState.wantReply === 'yes',
  };

  try {
    await db.collection('feedback').add(doc);
    track('submit_feedback', { mood: feedbackState.mood, category: feedbackState.category });
    localStorage.setItem('has_submitted_feedback', '1');
    showFeedbackThanks();
    setTimeout(() => checkAchievements(), 1000);
  } catch (e) {
    console.error('Feedback submit error:', e);
    showToast('送出失敗，請再試一次');
  }
}

function showFeedbackThanks() {
  document.getElementById('fb-form').style.display = 'none';
  document.getElementById('fb-thanks').style.display = 'block';
  const v = FEEDBACK_VERSES[Math.floor(Math.random() * FEEDBACK_VERSES.length)];
  document.getElementById('fb-verse').innerHTML =
    `<div>${v.t}</div><div style="font-size:12px;color:var(--text-soft);margin-top:6px;text-align:right;font-family:'Noto Sans TC',sans-serif;">${v.r}</div>`;
}

function goToLoginFromFeedback() {
  closeOverlay('feedback-login-prompt');
  closeOverlay('feedback-overlay');
  handleLineLoginClick();
}

function switchToAnonFeedback() {
  feedbackState.identity = 'anon';
  document.querySelectorAll('#fb-ident .fb-opt').forEach(el => {
    el.classList.toggle('sel', el.dataset.val === 'anon');
  });
  // 同步鎖 wantReply 區塊（與直接點「匿名」走一樣的路徑）
  applyAnonLockOnWantReply(true);
  closeOverlay('feedback-login-prompt');
}

// ── Diary (靈修日記) ──────────────────────────────────────

let diaryData = [];

async function openDiary() {
  if (!currentUser) {
    showToast('登入後可保存和回顧靈修日記');
    return;
  }
  // 追蹤：玩家主動打開日記 — 跟 achievement_review 同樣是儀式感類動作
  track('diary_open');
  document.getElementById('diary-search').value = '';
  document.getElementById('diary-list').innerHTML = '<div class="diary-empty"><span class="dot"></span><span class="dot"></span><span class="dot"></span> 載入中</div>';
  openOverlay('diary-overlay');

  try {
    const snapshot = await db.collection('users').doc(currentUser.uid)
      .collection('chapters').orderBy('completedAt', 'desc').get();
    diaryData = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.reflectionText || d.hasReflection) {
        diaryData.push({ key: doc.id, ...d });
      }
    });
    renderDiaryList(diaryData);
  } catch(e) {
    console.warn('Diary load error:', e);
    document.getElementById('diary-list').innerHTML = '<div class="diary-empty">載入失敗，請重試</div>';
  }
}

function renderDiaryList(entries) {
  const el = document.getElementById('diary-list');
  if (entries.length === 0) {
    el.innerHTML = '<div class="diary-empty">📖 還沒有靈修日記<br><br>完成靈修並填寫默想後，<br>你的文字會保存在這裡。</div>';
    return;
  }

  // Group by book
  const groups = {};
  entries.forEach(e => {
    // 2026-08-31 修（issue #75 A2）：改用 BOOKS 反查（core.js bookOfChapter），
    // 原寫死前綴鏈只到加拉太書，弗以後的日記全被歸「其他」
    const _bk = bookOfChapter(e.key);
    const bookName = _bk ? _bk.name : '其他';
    if (!groups[bookName]) groups[bookName] = [];
    groups[bookName].push(e);
  });

  let html = `<div style="font-size:12px;color:var(--text-soft);margin-bottom:10px;">共 ${entries.length} 篇</div>`;
  for (const [book, items] of Object.entries(groups)) {
    html += `<div class="diary-book-group"><div class="diary-book-title">${book}</div>`;
    items.forEach(e => {
      const ch = getChapter(e.key);
      const title = ch?.reflectionTitle || '';
      const chLabel = chapterFull(ch?.chapter || e.key);
      const preview = e.reflectionText ? escapeHtmlMyMsg(e.reflectionText.slice(0, 60)) + (e.reflectionText.length > 60 ? '...' : '') : '（有填寫默想，但文字未保存）';   // 2026-08-31 加固（issue #76 B6）
      const date = e.date || '';
      html += `<div class="diary-card" onclick="showDiaryDetail('${escapeHtmlMyMsg(e.key)}')">
        <div class="diary-card-header"><span class="diary-card-chapter">${chLabel}</span><span class="diary-card-date">${date}</span></div>
        ${title ? `<div class="diary-card-title">💭 ${title}</div>` : ''}
        <div class="diary-card-preview">${preview}</div>
      </div>`;
    });
    html += '</div>';
  }
  el.innerHTML = html;
}

function filterDiary() {
  const q = document.getElementById('diary-search').value.trim().toLowerCase();
  if (!q) { renderDiaryList(diaryData); return; }
  const filtered = diaryData.filter(e => {
    const ch = getChapter(e.key);
    const chLabel = chapterFull(ch?.chapter || e.key).toLowerCase();
    const text = (e.reflectionText || '').toLowerCase();
    const title = (ch?.reflectionTitle || '').toLowerCase();
    return chLabel.includes(q) || text.includes(q) || title.includes(q);
  });
  renderDiaryList(filtered);
}

function showDiaryDetail(key) {
  const entry = diaryData.find(e => e.key === key);
  if (!entry) return;
  // 追蹤：玩家點某筆日記看詳情（含當天 AI 回應）— 比 diary_open 更深一層的回顧行為
  track('diary_detail', { chapter: key });
  const ch = getChapter(key);
  const chLabel = chapterFull(ch?.chapter || key);
  const title = ch?.reflectionTitle || '';
  const prompt = ch?.reflection || '';
  const choiceText = ch && entry.choiceSelected ? ch.choices?.find(c => c.k === entry.choiceSelected)?.text || '' : '';
  const responseText = ch && entry.choiceSelected ? ch.responses?.[entry.choiceSelected] || '' : '';
  const timeLabel = { morning:'🌅 清晨', afternoon:'☀️ 下午', evening:'🌆 傍晚', night:'🌙 深夜' }[entry.timeOfDay] || '';

  let html = `<div style="text-align:center;margin-bottom:14px;">
    <div style="font-size:18px;font-weight:900;">${chLabel}</div>
    <div style="font-size:12px;color:var(--text-soft);margin-top:4px;">${entry.date || ''} ${timeLabel}</div>
  </div>`;

  if (choiceText) {
    html += `<div class="diary-detail-section">
      <div class="diary-detail-label">🎭 你的選擇</div>
      <div class="diary-detail-choice">${entry.choiceSelected}. ${choiceText}</div>
    </div>`;
  }
  if (responseText) {
    html += `<div class="diary-detail-section">
      <div class="diary-detail-label">💬 情境回應</div>
      <div class="diary-detail-ai">${responseText}</div>
    </div>`;
  }
  if (title) {
    html += `<div class="diary-detail-section">
      <div class="diary-detail-label">💭 默想主題：${title}</div>
      <div style="font-size:12px;color:var(--text-soft);line-height:1.7;margin-bottom:8px;">${prompt.replace(/\\n/g, '<br>')}</div>
    </div>`;
  }
  if (entry.reflectionText) {
    html += `<div class="diary-detail-section">
      <div class="diary-detail-label">✍️ 你的默想</div>
      <div class="diary-detail-text">${escapeHtmlMyMsg(entry.reflectionText).replace(/\n/g, '<br>')}</div>
    </div>`;
  }
  const aiText = entry.aiResponse || entry.aiResponseGemma || entry.aiResponseGemini || '';
  if (aiText) {
    html += `<div class="diary-detail-section">
      <div class="diary-detail-label">✨ 靈修回應</div>
      <div class="diary-detail-ai">${escapeHtmlMyMsg(aiText)}</div>
    </div>`;
  }

  document.getElementById('diary-detail-content').innerHTML = html;
  openOverlay('diary-detail-overlay');
}

// ── My Messages (曠野呼聲 v2 多輪對話) ────────────────────
// 狀態機、容錯讀取（normalizeFeedbackStatus / normalizeUnread / normalizeMessageCount / normalizeLastMessageAt）
// 與寫入物件產生器（playerReplyUpdate / playerMarkReadUpdate）都在 shared/feedback-schema.js（issue #5），
// 由頁面載入 shared/feedback-schema.js 掛成全域；這裡不再放複本。

let myMessagesData = [];

async function openMyMessages() {
  if (!currentUser) {
    showToast('登入後可查看自己的留言');
    return;
  }
  document.getElementById('my-msgs-list').innerHTML = '<div class="diary-empty"><span class="dot"></span><span class="dot"></span><span class="dot"></span> 載入中</div>';
  openOverlay('my-msgs-overlay');

  try {
    const snapshot = await db.collection('feedback')
      .where('uid', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .get();
    myMessagesData = [];
    snapshot.forEach(doc => {
      myMessagesData.push({ id: doc.id, ...doc.data() });
    });
    renderMyMessagesList(myMessagesData);
  } catch (e) {
    console.warn('My messages load error:', e);
    // Firestore 對 where + orderBy 複合查詢需要先建索引；缺索引會帶建立連結到 e.message
    if (String(e.message || '').includes('requires an index')) {
      document.getElementById('my-msgs-list').innerHTML = '<div class="diary-empty">⚠️ 需建立 Firestore 索引<br><br>請聯絡管理員（看 console 取得建立連結）</div>';
      console.error('Firestore index needed:', e.message);
    } else {
      document.getElementById('my-msgs-list').innerHTML = '<div class="diary-empty">載入失敗，請重試</div>';
    }
  }
}

function renderMyMessagesList(entries) {
  const el = document.getElementById('my-msgs-list');
  if (entries.length === 0) {
    el.innerHTML = '<div class="diary-empty">📭 還沒有留言<br><br>下次想跟團隊說點什麼，<br>記得在曠野呼聲選「具名」就會收進這裡。</div>';
    return;
  }

  const moodEmoji = { '平靜':'😇','有動力':'🔥','有點累':'😴','經文太難':'🤔','其他':'✏️' };
  const catEmoji = { '靈性感受':'🙏','遊戲體驗':'🎮','我的異象':'💡','其他':'✏️' };

  let html = `<div style="font-size:12px;color:var(--text-soft);margin-bottom:10px;">共 ${entries.length} 則</div>`;
  entries.forEach(d => {
    const status = normalizeFeedbackStatus(d);
    const badge = renderMyMsgBadge(status);
    const unread = normalizeUnread(d, 'player');
    const unreadDot = unread ? '<span class="unread-dot" style="margin-right:6px;vertical-align:middle;" title="新回覆"></span>' : '';
    // createdAt 可能是 Firestore Timestamp（已 round-trip）也可能還是 serverTimestamp sentinel（剛 add 還沒 sync）
    const ts = d.createdAt && typeof d.createdAt.toDate === 'function' ? d.createdAt.toDate() : null;
    const date = ts ? `${ts.getFullYear()}/${String(ts.getMonth()+1).padStart(2,'0')}/${String(ts.getDate()).padStart(2,'0')}` : '—';
    const mood = d.mood ? `${moodEmoji[d.mood] || ''} ${d.mood}` : '';
    const cat = d.category ? `${catEmoji[d.category] || ''} ${d.category}` : '';
    const msg = (d.message || '').trim();
    const preview = msg
      ? `<div class="my-msg-preview">${escapeHtmlMyMsg(msg.slice(0, 40))}${msg.length > 40 ? '…' : ''}</div>`
      : '<div class="my-msg-preview-empty">（沒有文字內容）</div>';
    html += `<div class="my-msg-card" onclick="openMyMessageThread('${escapeHtmlMyMsg(d.id)}')">
      <div class="my-msg-row">
        <span class="my-msg-date">${date}</span>
        <span style="display:inline-flex;align-items:center;">${unreadDot}${badge}</span>
      </div>
      <div class="my-msg-meta"><span>${mood}</span><span>${cat}</span></div>
      ${preview}
    </div>`;
  });
  el.innerHTML = html;
}

function renderMyMsgBadge(status) {
  // 玩家友善文案：內部狀態 → 顯示文字 + 顏色（療癒紙張感主調）
  if (status === 'awaiting_admin' || status === 'new') {
    return '<span class="my-msg-badge my-msg-badge-wait">🕊️ 等待回覆</span>';
  }
  if (status === 'awaiting_player') {
    return '<span class="my-msg-badge my-msg-badge-replied">💬 已回覆</span>';
  }
  return '<span class="my-msg-badge my-msg-badge-closed">✓ 已結束</span>';
}

// 玩家留言內容預覽用，避免 < & 之類字元打壞 HTML
// escapeHtmlMyMsg 已搬到 core.js。

// ── My Message Thread (Phase 2C 多輪對話 thread view) ────
// rules Path B（commit b2abc6a）允許玩家寫一筆 messages doc + 同步 update parent 4 欄位
// 用 batch write 確保原子性。closed 對話 client 端 UI readonly（rules 寬鬆 client 嚴格）
let currentThreadDocId = null;
let currentThreadData = null;     // parent feedback doc 快照
let currentThreadMessages = [];   // messages 子集合按 createdAt 升序
let isThreadSending = false;

async function openMyMessageThread(docId) {
  if (!currentUser) {
    showToast('登入後可查看對話');
    return;
  }
  currentThreadDocId = docId;
  isThreadSending = false;

  // 先開 overlay 顯示載入中
  document.getElementById('thread-body').innerHTML = '<div class="diary-empty"><span class="dot"></span><span class="dot"></span><span class="dot"></span> 載入中</div>';
  document.getElementById('thread-text').value = '';
  document.getElementById('thread-count').textContent = '0 / 300';
  document.getElementById('thread-closed-hint').style.display = 'none';
  document.getElementById('thread-send-btn').disabled = true;
  openOverlay('my-msg-thread-overlay');

  try {
    const feedbackRef = db.collection('feedback').doc(docId);
    const [parentSnap, messagesSnap] = await Promise.all([
      feedbackRef.get(),
      feedbackRef.collection('messages').orderBy('createdAt', 'asc').get(),
    ]);
    if (!parentSnap.exists) {
      document.getElementById('thread-body').innerHTML = '<div class="diary-empty">⚠️ 留言不存在或已被刪除</div>';
      return;
    }
    currentThreadData = { id: docId, ...parentSnap.data() };
    currentThreadMessages = [];
    messagesSnap.forEach(d => currentThreadMessages.push({ id: d.id, ...d.data() }));
    renderThreadView();

    // Fire-and-forget 標記已讀（容錯後 unreadByPlayer=true 才寫，避免無謂 update）
    if (normalizeUnread(currentThreadData, 'player')) {
      feedbackRef.update(playerMarkReadUpdate())
        .catch(e => console.warn('Mark as read failed:', e));
    }
  } catch (e) {
    console.warn('Thread load error:', e);
    if (String(e.message || '').includes('requires an index')) {
      document.getElementById('thread-body').innerHTML = '<div class="diary-empty">⚠️ 需建立 Firestore 索引<br><br>請聯絡管理員（看 console 取得建立連結）</div>';
      console.error('Firestore index needed:', e.message);
    } else {
      document.getElementById('thread-body').innerHTML = '<div class="diary-empty">載入失敗，請重試<br><br><button class="sky-btn" onclick="retryOpenThread()" style="width:auto;margin:10px 0 0;padding:6px 14px;font-size:13px;">重試</button></div>';
    }
  }
}

function retryOpenThread() {
  if (currentThreadDocId) openMyMessageThread(currentThreadDocId);
}

function renderThreadView() {
  const d = currentThreadData;
  const status = normalizeFeedbackStatus(d);

  // Badge
  document.getElementById('thread-badge').innerHTML = renderMyMsgBadge(status);

  const moodEmoji = { '平靜':'😇','有動力':'🔥','有點累':'😴','經文太難':'🤔','其他':'✏️' };
  const catEmoji = { '靈性感受':'🙏','遊戲體驗':'🎮','我的異象':'💡','其他':'✏️' };

  const ts = d.createdAt && typeof d.createdAt.toDate === 'function' ? d.createdAt.toDate() : null;
  const dateStr = ts ? formatThreadTime(ts) : '—';
  const mood = d.mood ? `${moodEmoji[d.mood] || ''} ${d.mood}` : '';
  const cat = d.category ? `${catEmoji[d.category] || ''} ${d.category}` : '';

  // 原始留言（特殊樣式，非泡泡）
  let html = `<div class="thread-origin">
    <div class="thread-origin-meta"><span>${mood}</span><span>${cat}</span><span class="thread-time">${dateStr}</span></div>
    <div class="thread-origin-text">${d.message ? escapeHtmlMyMsg(d.message) : '<span class="thread-origin-text-empty">（沒有文字內容）</span>'}</div>
  </div>`;

  // messages 子集合泡泡
  currentThreadMessages.forEach(m => {
    const mTs = m.createdAt && typeof m.createdAt.toDate === 'function' ? m.createdAt.toDate() : null;
    const mTime = mTs ? formatThreadTime(mTs) : '—';
    const isPlayer = m.role === 'player';
    const isAi = m.authorType === 'ai';
    const bubbleClass = isPlayer ? 'thread-bubble-player' : 'thread-bubble-admin';
    const aiPrefix = (!isPlayer && isAi) ? '<span class="thread-ai-icon">🤖</span>' : '';
    html += `<div class="thread-msg ${isPlayer ? 'thread-msg-right' : 'thread-msg-left'}">
      <div class="thread-bubble ${bubbleClass}">${aiPrefix}${escapeHtmlMyMsg(m.text || '')}</div>
      <div class="thread-time">${mTime}</div>
    </div>`;
  });

  document.getElementById('thread-body').innerHTML = html;

  // 自動滾到底（最新訊息在底部）
  const body = document.getElementById('thread-body');
  body.scrollTop = body.scrollHeight;

  // 設定輸入區狀態（closed → readonly + 提示）
  if (status === 'closed') {
    setThreadInputClosed(true, '這個對話已結束。如有新事項，請另外送一筆曠野呼聲。');
  } else {
    setThreadInputClosed(false, '');
  }
}

function setThreadInputClosed(closed, hint) {
  const ta = document.getElementById('thread-text');
  const btn = document.getElementById('thread-send-btn');
  const hintEl = document.getElementById('thread-closed-hint');
  if (closed) {
    ta.readOnly = true;
    ta.placeholder = '對話已結束';
    btn.disabled = true;
    hintEl.textContent = hint;
    hintEl.style.display = 'block';
  } else {
    ta.readOnly = false;
    ta.placeholder = '輸入訊息...';
    hintEl.style.display = 'none';
    btn.disabled = ta.value.trim().length === 0 || isThreadSending;
  }
}

function updateThreadCount() {
  const v = document.getElementById('thread-text').value;
  document.getElementById('thread-count').textContent = `${v.length} / 300`;
  // closed 永遠 disabled，不被 textarea 內容影響
  const status = currentThreadData ? normalizeFeedbackStatus(currentThreadData) : null;
  if (status !== 'closed') {
    document.getElementById('thread-send-btn').disabled = v.trim().length === 0 || isThreadSending;
  }
}

// formatThreadTime 已搬到 core.js。

async function sendThreadMessage() {
  if (isThreadSending) return;
  if (!currentUser || !currentThreadDocId) return;

  const ta = document.getElementById('thread-text');
  const text = ta.value.trim();
  if (text.length === 0) return;

  // closed safety check（雙重防護，雖然 button 已 disabled）
  const status = currentThreadData ? normalizeFeedbackStatus(currentThreadData) : null;
  if (status === 'closed') {
    showToast('對話已結束，無法追訊息');
    return;
  }

  isThreadSending = true;
  ta.disabled = true;
  document.getElementById('thread-send-btn').disabled = true;

  try {
    // Batch write：messages 子集合 add + parent 4 欄位 update（原子性，符合 rules Path B）
    const feedbackRef = db.collection('feedback').doc(currentThreadDocId);
    const msgRef = feedbackRef.collection('messages').doc();
    const ts = firebase.firestore.FieldValue.serverTimestamp();

    const batch = db.batch();
    batch.set(msgRef, {
      role: 'player',
      text,
      createdAt: ts,
      authorUid: currentUser.uid,
      authorType: 'human',
    });
    // 欄位組合來自 shared/feedback-schema.js（與 firestore.rules 路徑 B hasOnly 對齊）
    batch.update(feedbackRef, playerReplyUpdate({
      serverTimestamp: ts,
      increment: firebase.firestore.FieldValue.increment,
    }));
    await batch.commit();

    // 2026-09-01 D12：本地 append 取代整串重讀（原本每送一則要 1+N 個 doc 讀，隨 thread 變長線性成長）。
    // admin/detail.html appendAdminBubble 已用同模式。createdAt 先用用戶端 Timestamp.now() 呈現
    //（renderThreadView 有 toDate 防呆；下次開 thread 自然拿到 server 真值），parent 欄位照 schema 轉移。
    // lastMessageAt 刻意不在本地轉移（無 UI 讀它；下次全量讀取自然補回真值）——若之後要拿它排序，先改這裡。
    currentThreadData.status = 'awaiting_admin';
    currentThreadData.unreadByAdmin = true;
    currentThreadData.messageCount = (currentThreadData.messageCount || 0) + 1;
    currentThreadMessages.push({
      id: msgRef.id, role: 'player', text,
      createdAt: firebase.firestore.Timestamp.now(),
      authorUid: currentUser.uid, authorType: 'human',
    });

    // 清空 textarea + 重新渲染（自動滾到底）
    ta.value = '';
    document.getElementById('thread-count').textContent = '0 / 300';
    isThreadSending = false;
    ta.disabled = false;
    renderThreadView();
  } catch (e) {
    console.warn('Send message error:', e);
    showToast('送出失敗，請稍後再試');
    isThreadSending = false;
    ta.disabled = false;
    // 保留 textarea 內容（玩家文字不丟失），button disabled 依文字內容
    document.getElementById('thread-send-btn').disabled = ta.value.trim().length === 0;
  }
}

function closeMyMsgThread() {
  closeOverlay('my-msg-thread-overlay');
  currentThreadDocId = null;
  currentThreadData = null;
  currentThreadMessages = [];
  // 返回 list 時 refresh：剛才追訊息過的卡片狀態（badge / 預覽 / 紅點）會更新
  if (currentUser) {
    refreshMyMessagesList();
    // 同步 refresh 頂層紅點（剛才開啟 thread 時已 unreadByPlayer=false，這時應移除）
    checkUnreadFeedback({ toast: false });
  }
}

async function refreshMyMessagesList() {
  // 跟 openMyMessages 同 query，但不開 overlay 不顯示載入動畫（避免閃爍）
  try {
    const snapshot = await db.collection('feedback')
      .where('uid', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .get();
    myMessagesData = [];
    snapshot.forEach(doc => myMessagesData.push({ id: doc.id, ...doc.data() }));
    renderMyMessagesList(myMessagesData);
  } catch (e) {
    console.warn('My messages refresh error:', e);
  }
}

// ── Phase 2D 玩家端紅點 + Toast（曠野呼聲 v2 新回覆通知）─────
// 共用一個 limit(1) query 驅動三處紅點（⋯ 按鈕 / menu item / 列表卡片）+ Toast
// 列表卡片紅點走 renderMyMessagesList，這裡只負責頂層兩處 + Toast 邏輯
const UNREAD_TOAST_SESSION_KEY = 'feedback_unread_toast_shown';

function setUnreadDots(visible) {
  const ids = ['more-btn-dot', 'my-msgs-menu-dot'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? 'inline-block' : 'none';
  });
}

async function checkUnreadFeedback({ toast = false } = {}) {
  if (!currentUser) {
    setUnreadDots(false);
    return;
  }
  try {
    const snap = await db.collection('feedback')
      .where('uid', '==', currentUser.uid)
      .where('unreadByPlayer', '==', true)
      .limit(1)
      .get();
    const hasUnread = !snap.empty;
    setUnreadDots(hasUnread);

    // Toast 同 session 只彈一次（sessionStorage tab 關掉自動清）
    if (toast && hasUnread && !sessionStorage.getItem(UNREAD_TOAST_SESSION_KEY)) {
      showToast('💌 你有新的回覆，到「我的留言」看看');
      sessionStorage.setItem(UNREAD_TOAST_SESSION_KEY, '1');
    }
  } catch (e) {
    console.warn('checkUnreadFeedback error:', e);
    // 首次跑可能缺索引（uid + unreadByPlayer 複合 query），錯誤訊息會帶 console 建立連結
    if (String(e.message || '').includes('requires an index')) {
      console.error('Firestore index needed (uid + unreadByPlayer):', e.message);
    }
  }
}

// 包一層：關閉「我的留言」列表 overlay 後 refresh 頂層紅點
function closeMyMessagesList() {
  closeOverlay('my-msgs-overlay');
  if (currentUser) {
    checkUnreadFeedback({ toast: false });
  }
}

function showConfirm(icon, title, msg, okLabel, cancelLabel) {
  return new Promise(resolve => {
    document.getElementById('cp-icon').textContent = icon;
    document.getElementById('cp-title').textContent = title;
    document.getElementById('cp-msg').textContent = msg;
    document.getElementById('cp-ok').textContent = okLabel;
    document.getElementById('cp-cancel').textContent = cancelLabel;
    document.getElementById('cp-ok').onclick = () => { closeOverlay('confirm-overlay'); resolve(true); };
    document.getElementById('cp-cancel').onclick = () => { closeOverlay('confirm-overlay'); resolve(false); };
    openOverlay('confirm-overlay');
  });
}

// ══ TOAST ════════════════════════════════════════════════

function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText='position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#4CAF50;color:white;padding:10px 22px;border-radius:20px;font-size:14px;font-weight:700;z-index:999;box-shadow:0 4px 14px rgba(76,175,80,.4);animation:popIn .3s ease;white-space:nowrap;';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2000);
}

// ══ CONFETTI ════════════════════════════════════════════

function launchConfetti() {
  const colors=['#7BC67E','#FFD54F','#FF8A65','#9C7BB5','#64B5F6'];
  for(let i=0;i<28;i++) setTimeout(()=>{
    const el=document.createElement('div');
    el.style.cssText=`position:fixed;width:10px;height:10px;border-radius:2px;left:${Math.random()*100}vw;top:-10px;background:${colors[Math.floor(Math.random()*colors.length)]};transform:rotate(${Math.random()*360}deg);animation:confetti-fall ${2+Math.random()}s ease-in forwards;pointer-events:none;z-index:200;`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),3500);
  }, i*60);
}

// ══ PAGE SWITCH ═════════════════════════════════════════

let _currentPage = 'devotion';
function switchPage(name) {
  if (name !== _currentPage) track('page_switch', { page: name, from: _currentPage });
  _currentPage = name;
  // books／devotion 有分頁鈕；changelog 沒有（入口：更多選單／版本彈窗），切到它時兩顆分頁都不亮
  if (name === 'books') { renderTitleBar(); renderLibraryPage(); renderBadgesPage(); }
  ['devotion','books','changelog'].forEach(p=>{
    document.getElementById('page-'+p).classList.toggle('show',p===name);
    const tab = document.getElementById('tab-'+p);
    if (tab) tab.classList.toggle('active',p===name);
  });
  window.scrollTo(0,0);
}

// ══ BOOT ════════════════════════════════════════════════
// 包進 DOMContentLoaded：content.js 帶 defer（首畫面不被阻塞），
// 但 inline script 是同步立即執行；BOOT 走 state.setup=true 路徑會經 initApp →
// renderCalGrid 用 SCHEDULE，cold load 時 SCHEDULE 還沒 ready 就會 race。
// DOMContentLoaded 在所有 defer scripts 執行完才 fire，保證 SCHEDULE 已定義。


document.addEventListener('DOMContentLoaded', () => {
  // 默想編輯計時：refl-text 首次 focus 或 input 記起點（取第一個、起點 null 才記）。
  // 純後台分析、玩家畫面零變化（design-principles 紅線4：不回灌任何「你想了 X 分鐘」顯示）。
  const _reflEl = document.getElementById('refl-text');
  if (_reflEl) {
    const _markReflStart = () => { if (_reflEditStart == null) _reflEditStart = Date.now(); };
    _reflEl.addEventListener('focus', _markReflStart);
    _reflEl.addEventListener('input', _markReflStart);
  }
  if (state.setup) {
    showMainAppScreen();
    // D22（2026-09-01）：開機一次性彈窗改隊列制——儀式→公告→教學。
    // 公告規則不變：suppress 版不彈、也「不」動 lastSeen（issue #75 A5；lastSeen 只在 closeVersionNotice 更新）。
    const _suppress = typeof SUPPRESS_VERSION_POPUP !== 'undefined' && SUPPRESS_VERSION_POPUP;
    _startupQueue = [
      { id: 'finale', when: () => !!new URLSearchParams(location.search).get('nt') || ntFinalePending(),
        show: () => maybeShowNtFinale(), delay: 0 },   // 期間／預覽／已看過／等其他 overlay 的判定都在 maybeShowNtFinale 內
      { id: 'version', when: () => shouldShowVersionNotice(localStorage.getItem('last_seen_version'), GAME_VERSION, _suppress),
        show: () => { _versionNoticeShown = true; showVersionNotice(); }, delay: 600 },
      { id: 'tutorial', when: () => !localStorage.getItem('tut_done'),
        show: () => openTutorial(_versionNoticeShown ? 'version' : 'first'), delay: 500 },
    ];
    startupPromptNext();
  } else if (localStorage.getItem('login_choice_made') === '1' || new URLSearchParams(location.search).get('code')) {
    // Returning from LINE redirect OR previously chose login/guest — show setup
    // (post-auth onAuthStateChanged may still advance to main app if cloud has setup)
    showSetupScreen();
  } else {
    showWelcomeScreen();
  }
});

function showVersionNotice() {
  document.getElementById('ver-num').textContent = `v${GAME_VERSION}`;
  const notesEl = document.getElementById('ver-notes');
  notesEl.innerHTML = (VERSION_NOTES || []).map(n =>
    `<div style="font-size:13px;line-height:1.7;padding:4px 0;border-bottom:1px solid rgba(61,43,31,.07);display:flex;gap:8px;"><span>${n}</span></div>`
  ).join('');
  openOverlay('version-overlay');
}

function closeVersionNotice() {
  localStorage.setItem('last_seen_version', GAME_VERSION);
  closeOverlay('version-overlay');
  startupPromptDone('version', 300);   // D22：隊列開出的公告關閉→教學接手（source='version'，口徑同舊行為）
}

// ══ 新約之旅・終點（2026-08-28 一次性儀式）════════════════
// 只讀既有資料（state.completed / state.streak / cachedStats），不新增欄位、不多打 API。
// 預覽：?nt=preview（群體版）、?nt=preview2（含個人段；未達門檻時用示意數字），預覽不寫已看記錄。
const NT_FINALE_START = '2026-08-28';
const NT_FINALE_END = '2026-09-06';
const NT_FINALE_THRESHOLD = 21; // 完成 21 章以上才顯示個人段（依 2026-08-24 分布：約 16 人）

function ntFinalePersonal() {
  const completed = state.completed || {};
  const n = Object.keys(completed).length;
  const dates = [...new Set(Object.values(completed).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  const best = Math.max(bestStreak(completed), state.streak || 0);   // 2026-08-31 D3：run 計算移入 core.js（可測）
  const first = dates[0] ? `${parseInt(dates[0].slice(5, 7))} 月 ${parseInt(dates[0].slice(8, 10))} 日` : null;
  return { n, best, first, refl: cachedStats.reflectionCount || 0 };
}

function showNtFinale(personal) {
  const el = document.getElementById('nt-finale-personal');
  if (personal) {
    el.style.display = '';
    el.innerHTML = `<div style="background:rgba(255,255,255,.78);border-radius:13px;padding:14px;margin-bottom:12px;border:1.5px solid var(--sand-dark);">
      <div style="font-size:13px;font-weight:700;color:var(--warm);margin-bottom:8px;">—— 你的足跡 ——</div>
      <div style="font-size:15px;padding:3px 0;">你完成了 <b>${personal.n}</b> 章${personal.refl ? `・寫下 <b>${personal.refl}</b> 篇默想` : ''}</div>
      <div style="font-size:15px;padding:3px 0;">最長連續 <b>${personal.best}</b> 天</div>
      ${personal.first ? `<div style="font-size:15px;padding:3px 0;">你的旅程始於 ${personal.first}</div>` : ''}
      ${personal.mock ? '<div style="font-size:11px;color:var(--text-soft);margin-top:4px;">（預覽示意數字）</div>' : ''}
    </div>`;
  } else {
    el.style.display = 'none';
  }
  openOverlay('nt-finale-overlay');
  // B1：儀式曝光（預覽模式不記）；personal 帶章數、mock 不記
  if (!new URLSearchParams(location.search).get('nt')) {
    _finaleOpenAt = Date.now();
    track('finale_view', { hasPersonal: !!(personal && !personal.mock), chapters: personal && !personal.mock ? personal.n : 0 });
  }
}

let _finaleOpenAt = null;
// ── 開機一次性彈窗隊列（2026-09-01 D22）──────────────────────
// 固定順序：終點儀式 → 版本公告 → 說明頁教學；一次只彈一個，各 prompt 的 close handler
// 呼叫 startupPromptNext() 讓下一個接手。新增一次性彈窗＝在 boot 的 _startupQueue 加一項，
// 不要再加 flag 手動接力（原 _versionNoticePending 機制已退役）。
let _startupQueue = [];
let _versionNoticeShown = false;   // 教學埋點 source 判定：跟在公告後='version'、否則='first'（口徑不變）
let _activeStartupPrompt = null;   // 目前由隊列開出、顯示中的 prompt id；防手動開關（如 menu 開教學）誤推隊列（審查 ⑤）
function startupPromptNext(delayMs) {
  _activeStartupPrompt = null;
  const p = _startupQueue.shift();
  if (!p) return;
  if (p.when()) {
    setTimeout(() => { _activeStartupPrompt = p.id; p.show(); }, delayMs != null ? delayMs : p.delay);
  } else {
    startupPromptNext(delayMs);   // 條件不成立就同步跳下一個
  }
}
// close handler 專用：帶自己的 id——不是隊列開出的那次（例如玩家從 menu 手動開教學）就 no-op
function startupPromptDone(id, delayMs) {
  if (_activeStartupPrompt !== id) return;
  startupPromptNext(delayMs);
}
// 儀式是否會在本次開啟時彈出（未看過、在期間內、非預覽）
function ntFinalePending() {
  if (new URLSearchParams(location.search).get('nt')) return false;
  if (localStorage.getItem('nt_finale_seen')) return false;
  const today = todayStr();
  return today >= NT_FINALE_START && today <= NT_FINALE_END;
}
function closeNtFinale() {
  const p = new URLSearchParams(location.search).get('nt');
  if (p !== 'preview' && p !== 'preview2') localStorage.setItem('nt_finale_seen', '1');
  if (_finaleOpenAt != null) {
    track('finale_close', { dwellSec: Math.round((Date.now() - _finaleOpenAt) / 1000) });
    _finaleOpenAt = null;
  }
  closeOverlay('nt-finale-overlay');
  startupPromptDone('finale', 400);   // D22：隊列開出的儀式關閉→下一個（公告→教學）接手；手動路徑 no-op
}

function maybeShowNtFinale() {
  const p = new URLSearchParams(location.search).get('nt');
  if (p === 'preview' || p === 'preview2') {
    let personal = null;
    if (p === 'preview2') {
      personal = ntFinalePersonal();
      if (personal.n < NT_FINALE_THRESHOLD) personal = { n: 108, best: 105, first: '3 月 14 日', refl: 96, mock: true };
    }
    setTimeout(() => showNtFinale(personal), 800);
    return;
  }
  if (localStorage.getItem('nt_finale_seen')) return;
  const today = todayStr();
  if (today < NT_FINALE_START || today > NT_FINALE_END) return;
  let tries = 0;
  const wait = () => {
    if (document.querySelector('.overlay.show')) {
      if (++tries < 40) { setTimeout(wait, 1500); } else { startupPromptDone('finale'); }   // 60 秒等不到就放棄儀式、讓公告/教學接手（審查 ⑥）
      return;
    }
    const personal = ntFinalePersonal();
    showNtFinale(personal.n >= NT_FINALE_THRESHOLD ? personal : null);
  };
  setTimeout(wait, 700);
}

// ── iOS keyboard: scroll input into view ──────────────────
document.querySelectorAll('textarea, input[type="text"], input[type="password"]').forEach(el => {
  el.addEventListener('focus', () => {
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  });
});
