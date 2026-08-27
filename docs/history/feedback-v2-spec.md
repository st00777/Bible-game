# 曠野呼聲 v2 規格（已上線）
> 自 CLAUDE.md 搬出（2026-08-24）；歸檔用，不再隨每輪載入。

## 曠野呼聲 v2 規格（2026-05-01 已確認，待實作）

> **實作進度**（2026-05-24 更新，曠野呼聲 v2 已完整上線）：
> - Phase 1 ✅ 資料層完成（commit ffa9545）：firestore.rules / migration / 15 筆 v1 文件已補上 v2 欄位
> - Phase 2A ✅ wantReply 勾選表單完成
> - Phase 2B ✅ 我的留言列表完成
> - Phase 2C ✅ thread UI + 玩家追訊息完成（commit 1dea0fe）
> - Phase 2D ✅ 玩家端紅點 + 收到回覆 toast 完成（commit 0fd121f）
> - Phase 3A ✅ admin site 基礎建設完成（commit fbe4705）
> - Phase 3B ✅ admin 列表 + 篩選已上 production
> - Phase 3C ✅ admin 多輪回覆工具完成 + 上線（commit 307b9a1）
> - Phase 3D ✅ Cloud Function `autoCloseInactiveThreads` 已部署 production（2026-05-24，每天台灣 04:00 收 awaiting_player + lastMessageAt > 30 天，closedBy='system:auto_30d'）；手動標記已含於 Phase 3C
> - **FEATURE_FEEDBACK_V2 已於 2026-05-24（release `d3f832c`）翻 true，玩家入口已開放**；flag 機制最初為 v2.11 時導入（commit cdb9208），用來讓 v2 跟著 main 一起 release 但對玩家隱藏。詳見下方「Feature Flag 機制」段落。

### Firestore Schema

```
feedback/{docId}
  // 原有 v1 欄位
  mood, category, message, isAnonymous, uid, displayName, createdAt, chapter

  // v2 新增
  wantReply: boolean              // 玩家勾選「希望收到回覆」；isAnonymous=true 時強制 false
  status: 'new' | 'awaiting_admin' | 'awaiting_player' | 'closed'
  lastMessageAt: Timestamp        // 最後訊息時間，後台排序用
  unreadByPlayer: boolean         // 玩家有未讀（admin 寫訊息後設 true）
  unreadByAdmin: boolean          // admin 有未讀（玩家追訊息後設 true）
  messageCount: number            // 快取總訊息數，省 count query

feedback/{docId}/messages/{msgId}    // 多輪對話子集合
  role: 'player' | 'admin'
  text: string                     // ≤ 300 字
  createdAt: Timestamp
  authorUid: string
  authorType: 'human' | 'ai'       // 預留給 Claude Cowork 自動寫的回覆
```

**為什麼用子集合不用平面 array**：rules 可細粒度限制 role + 沒 1MB 上限 + collectionGroup query 對 AI 自動分析友善 + 沒 array race condition。詳見 `LEARNING.md` 對應段落（如有寫入）。

### 玩家端

- 曠野呼聲表單新增「希望收到團隊回覆」勾選
  - 匿名選項時自動鎖定 + 顯示「如希望收到回覆請具名」
- ⋯ 選單新增「我的留言」入口（**僅具名玩家可見**）
- 「我的留言」頁面：顯示留言記錄、status、多輪對話 thread
- 登入時若有 `unreadByPlayer=true` 的留言 → 顯示提示（紅點 + 一句話通知）
- 玩家點開該則 thread → 自動 set `unreadByPlayer=false`

### 管理後台（獨立網址）

- 部署：Firebase Hosting 多 site，production URL: `https://bible-game-admin.web.app`
- ✅ 2026-05-24 已部署 production、可登入、reply 已驗證 end-to-end；SCHEDULE 管理功能尚未實作
- 認證：Firebase Auth + Google 登入 + admin email 白名單（同 firestore.rules `isAdmin()`）
- 顯示所有留言（含匿名），可篩選 `wantReply` / `status`
- 支援多輪對話回覆（add 一則 `messages/{msgId}` doc, role='admin'）
- 開發者可手動標記「結束對話」→ status='closed'
- **設計給 Claude Cowork 可讀取**：`unreadByAdmin=true + status != 'closed'` 是 Cowork 自動處理的入口

### 結束對話規則

- 開發者主動按「標記結束」→ `status: 'closed'`
- **30 天無新訊息自動 closed**（Cloud Function scheduled 每日掃描）
- Cowork 自動處理時跳過 closed thread

### 工程量估算

| 項目 | 工時 |
|---|---|
| 玩家端 wantReply + 「我的留言」入口 + thread UI + 未讀提示 | 4-5 小時 |
| Admin 後台（獨立 Hosting site + 列表 + 篩選 + 多輪回覆 + 標記結束）| 5-7 小時 |
| Firestore rules（messages 子集合 role 強制、isAdmin 寫權限、wantReply 衝突檢查）| 2 小時 |
| Cloud Function 30 天自動 closed | 1 小時 |
| E2E 測試 | 2 小時 |
| **小計** | **約 2 個工作天** |

### 安全要點

- ✅ Read rule 已修正（2026-05-01 部署，feedback 限 owner/admin）
- ✅ Phase 1 已實作（2026-05-05，commit ffa9545）：messages 子集合 rule（role/authorUid 一致性檢查、append-only）
- ✅ Phase 1 已實作（2026-05-05，commit ffa9545）：create rule 加 isAnonymous=true && wantReply=true 衝突檢查 + hasOnly 加 wantReply 欄位
- ✅ Phase 1 已實作：feedback update rule（玩家只能改 unreadByPlayer:true→false / admin 可改全部）
- ✅ Phase 1 已實作：feedback delete rule（限 admin）

### Feature Flag 機制（FEATURE_FEEDBACK_V2）

`content.js` 第 9 行：`const FEATURE_FEEDBACK_V2 = true;`（2026-05-24 release `d3f832c` 翻開；首次導入：commit `cdb9208`，2026-05-11）

**用途**：控制曠野呼聲 v2 玩家端入口的可見性 — wantReply 勾選表單、⋯ 選單「我的留言」入口、my-msgs 頁面、thread UI、未來 Phase 2D 的紅點與 toast 都受此 flag 控制。後端資料層（firestore.rules 的 v2 規則、admin 後台、Cloud Function）**不受 flag 影響、持續運作**。

**目前值**：`true`（曠野呼聲 v2 已上線）。

**實作方式**：
- v2 玩家端 HTML 元素都標 `data-v2-only="..."` attribute。
- `applyFeatureFlags()` 在 `DOMContentLoaded` 階段執行：若 flag = false 就 `document.querySelectorAll('[data-v2-only]').forEach(el => el.remove())`，DOM 樹真實移除節點（不是 CSS `display:none`）。
- JS 函式（`openMyMessages`、`submitFeedback` 的 wantReply 驗證 / 寫入）也用 `if (FEATURE_FEEDBACK_V2)` gate，防護從 console 或殘留路徑進入。
- flag = false 時：玩家送出 v1 留言寫入 `wantReply: false`（固定值，符合 firestore.rules 的 boolean schema）。

**開啟歷程**：
- 2026-05-11：導入 flag（`false`），隱藏 v2 入口，先讓合併日機制 v2.11 上線
- 2026-05-11 ~ 2026-05-24：Phase 2D / 3B / 3C / 3D 陸續完成（preview 環境開 flag 驗證，不在 production 上對特定使用者開）
- 2026-05-24：四 Phase 全數完成、端到端驗證通過 → flag 翻 `true`、整批 release v2.14 上線（commit `d3f832c`）

**為什麼用 flag**：避免「dev 長期累積、與 main 分叉 15 commit」教訓重演（詳見「分支策略」補註）。Flag 讓 v2 在 dev 持續整合、跟著 main 一起 release（v2.11 含 Phase 1-3A 程式碼但玩家看不到），降低 long-lived feature branch 風險。
