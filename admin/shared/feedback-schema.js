// ══ 曠野呼聲（feedback）狀態機與容錯讀取 — 單一正本（issue #5）═══════════
//
// ⚠️ 這個檔案是「正本」，請只改這裡。三個部署單元互相看不到彼此的目錄，
//    所以 `node scripts/sync-shared.js` 會把它原封不動複製到：
//      public/shared/feedback-schema.js   ← 玩家頁 bible-game-v2.html（Firebase hosting:main 與 GitHub Pages 都從這相對路徑載）
//      admin/shared/feedback-schema.js    ← 後台 list.html / detail.html（hosting:admin）
//      functions/lib/feedback-schema.js   ← Cloud Functions autoCloseInactiveThreads
//    test/feedback-schema.test.js 會斷言各複本與正本位元組相同，漂移就紅燈。
//
// firestore.rules 無法 import JS；規則檔裡「玩家可改哪些欄位」「status 必須是什麼」
// 是逐字對齊這裡的 PLAYER_UPDATE_PATHS／FEEDBACK_EVENTS。改任一邊都要改另一邊，
// test/feedback-schema.test.js 會讀 rules 文字做最低限度的契約檢查。
//
// 狀態機（主文件 feedback/{docId}.status）：
//   new ──admin 回覆──▶ awaiting_player ──玩家追訊息──▶ awaiting_admin ──admin 回覆──▶ awaiting_player …
//   任一狀態 ──admin 結束／系統 30 天自動關閉（只收 awaiting_player）──▶ closed（終態，不再回頭）
//   舊資料沒有 status 欄位：wantReply=true 視為 awaiting_admin、其餘視為 closed（normalizeFeedbackStatus）。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();   // Node（functions / 測試）
  else Object.assign(root, factory());                                            // 瀏覽器：掛成全域函式，舊呼叫點不用改
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 四個狀態；順序也是後台篩選鈕的順序
  const FEEDBACK_STATUSES = ['new', 'awaiting_admin', 'awaiting_player', 'closed'];

  // 狀態轉移表：哪個狀態允許走到哪些狀態（closed 是終態）
  const FEEDBACK_TRANSITIONS = {
    new:             ['awaiting_player', 'closed'],
    awaiting_admin:  ['awaiting_player', 'closed'],
    awaiting_player: ['awaiting_admin', 'closed'],
    closed:          [],
  };

  // 事件表：誰做了什麼 → status 變成什麼、會動主文件哪些欄位
  //   fields 必須與 firestore.rules 的 hasOnly([...]) 逐字對齊（玩家側），admin 側 rules 不限欄位但也列出來當文件
  const FEEDBACK_EVENTS = {
    // 玩家在「我的留言」追訊息（rules 路徑 B）
    player_reply:    { by: 'player', to: 'awaiting_admin',  fields: ['lastMessageAt', 'unreadByAdmin', 'messageCount', 'status'] },
    // 玩家打開對話 → 標記已讀（rules 路徑 A，不改 status）
    player_mark_read:{ by: 'player', to: null,              fields: ['unreadByPlayer'] },
    // 後台回覆玩家
    admin_reply:     { by: 'admin',  to: 'awaiting_player', fields: ['status', 'unreadByPlayer', 'unreadByAdmin', 'lastMessageAt', 'messageCount'] },
    // 後台按「結束對話」
    admin_close:     { by: 'admin',  to: 'closed',          fields: ['status', 'closedAt', 'closedBy'] },
    // 排程：awaiting_player 超過 30 天沒動靜 → 系統自動關閉（closedBy 固定字串）
    auto_close_30d:  { by: 'system', to: 'closed',          from: ['awaiting_player'], fields: ['status', 'closedAt', 'closedBy'], closedBy: 'system:auto_30d' },
  };

  // 玩家端兩條互斥寫入路徑（↔ firestore.rules feedback update 的兩組 hasOnly）
  const PLAYER_UPDATE_PATHS = {
    markRead:      FEEDBACK_EVENTS.player_mark_read.fields,
    appendMessage: FEEDBACK_EVENTS.player_reply.fields,
  };

  function canTransition(from, to) {
    return Array.isArray(FEEDBACK_TRANSITIONS[from]) && FEEDBACK_TRANSITIONS[from].includes(to);
  }

  // ── 容錯讀取 helper（v1 殘留 / Phase 1 migrate 過 / Phase 2A 之後三種 doc 形態一份邏輯）──
  // 設計選擇：client 不主動寫對話追蹤欄位（status / lastMessageAt / unread* / messageCount），
  // admin 後台或玩家追訊息時才寫；缺欄位在讀取時用以下 helper 推導預設值。
  function normalizeFeedbackStatus(d) {
    if (d.status) return d.status;
    if (d.wantReply === true) return 'awaiting_admin'; // 想要回覆但還沒回 → 等待中
    return 'closed';                                    // wantReply=false 或 v1 殘留沒這欄位 → 視為已結束
  }
  function normalizeUnread(d, side) {
    // side: 'player' | 'admin'，缺欄位都當 false（沒訊息就沒未讀）
    const key = side === 'player' ? 'unreadByPlayer' : 'unreadByAdmin';
    return d[key] === true;
  }
  function normalizeMessageCount(d) {
    return typeof d.messageCount === 'number' ? d.messageCount : 0;
  }
  function normalizeLastMessageAt(d) {
    // 缺欄位用 createdAt（兩者都是 Firestore Timestamp）
    return d.lastMessageAt || d.createdAt || null;
  }

  // ── 寫入物件產生器：三端寫主文件時用這幾支，欄位組合就不會各自漂移 ──
  // 參數都是呼叫端的 Firestore 工具（serverTimestamp 值、increment 函式），這個檔案本身不碰 Firebase。
  function playerReplyUpdate({ serverTimestamp, increment }) {
    return { lastMessageAt: serverTimestamp, unreadByAdmin: true, messageCount: increment(1), status: FEEDBACK_EVENTS.player_reply.to };
  }
  function playerMarkReadUpdate() {
    return { unreadByPlayer: false };
  }
  function adminReplyUpdate({ serverTimestamp, increment }) {
    return { status: FEEDBACK_EVENTS.admin_reply.to, unreadByPlayer: true, unreadByAdmin: false, lastMessageAt: serverTimestamp, messageCount: increment(1) };
  }
  function adminCloseUpdate({ serverTimestamp, closedBy }) {
    return { status: 'closed', closedAt: serverTimestamp, closedBy };
  }
  function autoCloseUpdate({ serverTimestamp }) {
    return { status: 'closed', closedAt: serverTimestamp, closedBy: FEEDBACK_EVENTS.auto_close_30d.closedBy };
  }

  return {
    FEEDBACK_STATUSES, FEEDBACK_TRANSITIONS, FEEDBACK_EVENTS, PLAYER_UPDATE_PATHS, canTransition,
    normalizeFeedbackStatus, normalizeUnread, normalizeMessageCount, normalizeLastMessageAt,
    playerReplyUpdate, playerMarkReadUpdate, adminReplyUpdate, adminCloseUpdate, autoCloseUpdate,
  };
});
