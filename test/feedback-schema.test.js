// 曠野呼聲狀態機單一正本（issue #5）測試：
// ① 三份複本與正本位元組相同（防漂移）
// ② 狀態機／normalize／寫入產生器行為
// ③ firestore.rules 文字契約：玩家可改欄位、強制 status 與 schema 逐字對齊
// ④ 三端頁面／functions 都改走共用檔，沒有殘留的本地複本
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const schema = require('../shared/feedback-schema.js');
const { sync, SHARED_FILES } = require('../scripts/sync-shared.js');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('共用檔複本與正本一致（跑 npm run sync-shared 可修）', () => {
  assert.deepEqual(sync({ check: true }), []);
  // 正本清單至少含 feedback-schema，三個部署單元各一份
  const fb = SHARED_FILES.find(f => f.src === 'shared/feedback-schema.js');
  assert.ok(fb && fb.copies.length === 3);
});

test('狀態機：closed 是終態，其餘轉移照表', () => {
  const { canTransition, FEEDBACK_STATUSES, FEEDBACK_TRANSITIONS } = schema;
  assert.deepEqual(FEEDBACK_STATUSES, ['new', 'awaiting_admin', 'awaiting_player', 'closed']);
  assert.ok(canTransition('new', 'awaiting_player'));
  assert.ok(canTransition('awaiting_admin', 'awaiting_player'));
  assert.ok(canTransition('awaiting_player', 'awaiting_admin'));
  assert.ok(canTransition('awaiting_player', 'closed'));
  assert.equal(canTransition('closed', 'awaiting_admin'), false);
  assert.deepEqual(FEEDBACK_TRANSITIONS.closed, []);
  assert.equal(canTransition('nope', 'closed'), false);
});

test('normalize：v1 殘留／migrate／v2 三種 doc 形態', () => {
  const { normalizeFeedbackStatus, normalizeUnread, normalizeMessageCount, normalizeLastMessageAt } = schema;
  assert.equal(normalizeFeedbackStatus({ status: 'awaiting_player' }), 'awaiting_player');
  assert.equal(normalizeFeedbackStatus({ wantReply: true }), 'awaiting_admin');
  assert.equal(normalizeFeedbackStatus({ wantReply: false }), 'closed');
  assert.equal(normalizeFeedbackStatus({}), 'closed');
  assert.equal(normalizeUnread({ unreadByPlayer: true }, 'player'), true);
  assert.equal(normalizeUnread({ unreadByPlayer: 'yes' }, 'player'), false);
  assert.equal(normalizeUnread({}, 'admin'), false);
  assert.equal(normalizeMessageCount({ messageCount: 3 }), 3);
  assert.equal(normalizeMessageCount({ messageCount: '3' }), 0);
  assert.equal(normalizeLastMessageAt({ createdAt: 'c' }), 'c');
  assert.equal(normalizeLastMessageAt({ lastMessageAt: 'l', createdAt: 'c' }), 'l');
  assert.equal(normalizeLastMessageAt({}), null);
});

test('寫入產生器：欄位集合 ＝ 事件表 fields、status 值照轉移', () => {
  const ts = 'SERVER_TS';
  const increment = n => ({ inc: n });
  const keys = o => Object.keys(o).sort();
  const { FEEDBACK_EVENTS: E } = schema;

  const pr = schema.playerReplyUpdate({ serverTimestamp: ts, increment });
  assert.deepEqual(keys(pr), [...E.player_reply.fields].sort());
  assert.equal(pr.status, 'awaiting_admin');
  assert.equal(pr.unreadByAdmin, true);
  assert.deepEqual(pr.messageCount, { inc: 1 });
  assert.equal(pr.lastMessageAt, ts);

  assert.deepEqual(keys(schema.playerMarkReadUpdate()), E.player_mark_read.fields);
  assert.equal(schema.playerMarkReadUpdate().unreadByPlayer, false);

  const ar = schema.adminReplyUpdate({ serverTimestamp: ts, increment });
  assert.deepEqual(keys(ar), [...E.admin_reply.fields].sort());
  assert.equal(ar.status, 'awaiting_player');
  assert.equal(ar.unreadByPlayer, true);
  assert.equal(ar.unreadByAdmin, false);

  const ac = schema.adminCloseUpdate({ serverTimestamp: ts, closedBy: 'a@b' });
  assert.deepEqual(keys(ac), [...E.admin_close.fields].sort());
  assert.equal(ac.closedBy, 'a@b');

  const au = schema.autoCloseUpdate({ serverTimestamp: ts });
  assert.deepEqual(keys(au), [...E.auto_close_30d.fields].sort());
  assert.equal(au.closedBy, 'system:auto_30d');
  assert.deepEqual(E.auto_close_30d.from, ['awaiting_player']);
});

test('firestore.rules 契約：玩家兩條路徑 hasOnly 欄位與強制 status 逐字對齊 schema', () => {
  const rules = read('firestore.rules').replace(/\s+/g, '');
  const hasOnly = fields => `hasOnly([${fields.map(f => `'${f}'`).join(',')}])`;
  assert.ok(rules.includes(hasOnly(schema.PLAYER_UPDATE_PATHS.markRead)), '規則缺路徑 A hasOnly：' + hasOnly(schema.PLAYER_UPDATE_PATHS.markRead));
  assert.ok(rules.includes(hasOnly(schema.PLAYER_UPDATE_PATHS.appendMessage)), '規則缺路徑 B hasOnly：' + hasOnly(schema.PLAYER_UPDATE_PATHS.appendMessage));
  assert.ok(rules.includes(`request.resource.data.status=='${schema.FEEDBACK_EVENTS.player_reply.to}'`), '規則強制的 status 與 player_reply.to 不同');
  assert.ok(rules.includes('shared/feedback-schema.js'), '規則檔缺對照註解');
});

test('三端都走共用檔：沒有殘留本地 normalize 複本、頁面有載入 script', () => {
  const html = ['bible-game-v2.html', 'admin/list.html', 'admin/detail.html'];
  for (const f of html) {
    const s = read(f);
    assert.ok(!/function normalizeFeedbackStatus\s*\(/.test(s), `${f} 仍有本地 normalizeFeedbackStatus`);
    assert.ok(!/function normalizeUnread\s*\(/.test(s), `${f} 仍有本地 normalizeUnread`);
    assert.ok(s.includes('<script src="shared/feedback-schema.js"></script>'), `${f} 沒載入 shared/feedback-schema.js`);
  }
  const fn = read('functions/index.js');
  assert.ok(fn.includes("require('./lib/feedback-schema')"));
  assert.ok(!fn.includes("closedBy: 'system:auto_30d'"), 'functions 仍手寫 closedBy 字串');
});
