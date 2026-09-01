// admin/common.js ── admin 三頁（index / list / detail）共用碼（issue #78 批次 D9）
// 一般 script（非 module），載入順序：Firebase compat SDK → shared/feedback-schema.js（需要的頁）→ common.js → 各頁 inline script。
// 注意：這裡只放三頁重複的部分；firestore 的 db 由需要的頁自己建（index.html 不載 firestore-compat SDK）。

// ── Firebase init（同主站 firebaseConfig）───────────────
const firebaseConfig = {
  apiKey: "AIzaSyC2uJBxG8MvG1_zRF7_R35a1vMFgmnvonQ",
  authDomain: "bible-game-bcb84.firebaseapp.com",
  projectId: "bible-game-bcb84",
  storageBucket: "bible-game-bcb84.firebasestorage.app",
  messagingSenderId: "998309781226",
  appId: "1:998309781226:web:3393ab62963940ef720193"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ── 白名單（跟 firestore.rules 的 isAdmin() 同步）───────
// 注意：前端寫死的白名單只是 UX 第一道防線，真正的安全靠 firestore.rules
const ADMIN_EMAILS = ['st00777@hotmail.com'];

// ── Admin gate（onAuthStateChanged email 白名單守衛）────
// opts:
//   onAuthorized(user, email)  必填：白名單通過後各頁自己接手（載資料／切畫面）
//   onSignedOut()              選填：未登入時的處理；預設導回 index.html（list / detail 守衛頁用預設）
//   onDenied(user, email)      選填：已登入但不在白名單；預設 console.warn + 導回 index.html
//   denyLogLabel               選填：預設 onDenied 的 console.warn 標籤（各頁保留原本訊息）
function initAdminGate(opts) {
  const o = opts || {};
  auth.onAuthStateChanged(user => {
    if (!user) {
      if (o.onSignedOut) o.onSignedOut();
      else window.location.replace('./index.html');
      return;
    }
    const email = (user.email || '').toLowerCase();
    if (ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) {
      o.onAuthorized(user, email);
    } else if (o.onDenied) {
      o.onDenied(user, email);
    } else {
      console.warn(o.denyLogLabel || 'Unauthorized admin access:', email);
      window.location.replace('./index.html');
    }
  });
}

// ── HTML escape（同 Phase 2B escapeHtmlMyMsg 風格）─────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── 時間格式化 ──────────────────────────────────────────
function formatDateTime(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── mood / category emoji 對照（同玩家端曠野呼聲選項）──
const moodEmoji = { '平靜':'😇','有動力':'🔥','有點累':'😴','經文太難':'🤔','其他':'✏️' };
const catEmoji = { '靈性感受':'🙏','遊戲體驗':'🎮','我的異象':'💡','其他':'✏️' };

// ── Status badge（admin 視角 4 色）──────────────────────
function renderAdminBadge(status) {
  // new 藍 / awaiting_admin 橘 / awaiting_player 綠 / closed 灰
  if (status === 'new') {
    return '<span class="fb-badge fb-badge-new">🆕 新留言</span>';
  }
  if (status === 'awaiting_admin') {
    return '<span class="fb-badge fb-badge-wait">🕊️ 等待回覆</span>';
  }
  if (status === 'awaiting_player') {
    return '<span class="fb-badge fb-badge-replied">💬 已回覆</span>';
  }
  return '<span class="fb-badge fb-badge-closed">✓ 已結束</span>';
}
