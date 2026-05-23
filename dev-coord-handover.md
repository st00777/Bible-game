# 💻 開發協調交班備忘錄

> 交班日期：2026-05-23（W21 第六天，週六）
> 交班視窗：開發協調第 1 任視窗（2026-05-18 啟用 → 2026-05-23 封存）
> 為何交班：跨 6 天 + 已 compaction 一次 + 剩餘工作含高風險上 main（接近紅燈）
> 接手方式：新開發協調視窗 view 此文件 + roles/development-coordinator.md + claude-prompting-guide.md

---

## 📚 第一部分：給新開發協調的快速進入指南

### 你是誰？
你是靈修冒險專案的「💻 開發協調 - 功能與 Bug」視窗。
James（葉真旭）是這個專案的唯一決策者，你負責把他的意圖轉成 Claude Code 能執行的工單。

### 你的核心職責
1. Phase 切分與工程規劃
2. 撰寫 Claude Code dispatch prompt（純意圖、非逐行 sed）
3. Bug Ticket 管理
4. 純實作層設計決策（資料結構、容錯規則、技術選型）
5. 跨 session 衝突攔截（race condition）
6. 對 PM / 內容 / 美術下來的執行指令做「事實校對」再照辦

### 你不做的事
- 戰略決策（要不要做某功能、方向對不對）→ 🎯 PM
- 美術 / 視覺 brief → 🎨 美術協調
- 生成靈修內容 → 📝 內容生產
- 寫程式碼本身 → Claude Code（你只寫工單）

### 必讀檔案順序
1. `roles/development-coordinator.md` ← 角色定位
2. `dev-coord-handover.md`（本文件）← 完整脈絡
3. `claude-prompting-guide.md` ← Claude Code 工單格式（Goal/Constraints/AC）
4. `CLAUDE.md` ← 專案核心記憶（架構、Firestore schema、登入流程）
5. `design-system.md` ← 視覺規範（D1 是玩家可見 UI、必讀）

---

## 🎯 第二部分：最緊急的待辦（接手就做）

### 🔴 Track 1.4 Phase D1 — 多 provider 登入 UI（W21 唯一剩餘工程）

**背景**：Firebase Auth 多 provider 帳號分離。Google uid 與 line:{lineUserId} 是兩個獨立 user、進度不同步。James 自己受影響（葉真旭 Google / 溯流光 LINE）。5/11 PM 拍板「方案 D 兩階段」之 D1。

**D1 範圍**（只做 UI 緩解、不碰底層 auth 分離，那是 D2）：
1. 登入頁：多 provider 提示（讓玩家知道 Google / LINE 是兩個獨立進度）
2. 設定頁：顯示當前登入身份（讓玩家看得懂自己用哪個身份）

**James 已拍板的三個設計變數**（2026-05-23）：
- 變數 1（登入頁提示強度）：**輕量**（登入頁一行小字、不打斷登入流程）
- 變數 2（設定頁身份顯示）：**B = provider + 暱稱**（例「用 LINE 登入（溯流光）」，暱稱友善、不暴露真實身份）
- 變數 3（切換登入引導）：**B = 不加**（D2 進度遷移還沒做、現在引導切換會讓玩家更亂）

**起點**：dev HEAD = `0a3e094`（PHP1-4）

**PM 要求的執行流程**：先偵察既有登入頁 + 設定頁結構 → 回報實作計畫 → James 看過計畫再進實作（避免半殘修復魔咒 + UI 走鐘）。

**Constraints 重點**（寫進工單）：
- 起點 dev HEAD 0a3e094、commit 前 git branch 確認在 dev
- 只做 UI 緩解、不碰底層 auth 分離邏輯
- 不順手重構既有登入流程
- design-system.md 色票 / 療癒系定調要遵守
- 玩家隱私：顯示身份不暴露完整 uid / email、用友善暱稱

**接手第一步**：出 Phase D1 偵察工單（偵察既有登入頁 + 設定頁結構），派進 Agent View。

---

### 🔴 Track 1.5 — 整批 dev → main + flag 開啟（D1 完成後做）

**這是 W21 風險最高的動作**，等 D1 完成 + preview 驗證通過後執行。

**動作清單**：
1. dev → main merge（所有 W21 commit 一起上）
2. 改 `FEATURE_FEEDBACK_V2 = false → true`（content.js:9，開啟曠野呼聲 v2 玩家入口）
3. GAME_VERSION 是否升 + VERSION_NOTES + changelog（這次是「機制變更」等級、要彈版本公告）
4. 部署 production hosting（main target）
5. 教會公告（曠野呼聲 v2 正式上線）

**⚠️ 破壞性動作紀律**：
- 嚴禁裸 `firebase deploy`，要用 `--only hosting:main`（注意：`firebase deploy` 用 `--only hosting:main`、`channel:deploy` 用 `--only main`，兩者語法不同）
- 上 main 前確認在對的分支
- 這是玩家可見的正式上線、要 James 明確拍板每一步

---

## 🧱 第三部分：W21 完整收網狀態（已完成、不用回頭）

### dev HEAD 完整 commit 鏈
```
d15c76b  BOOKS 修復（補 13 卷新書 entry + GAL5，含 PHP entry）
26e3f4c  EPH3-6 內容（內容生產）
0fd121f  Phase 2D 玩家端紅點 + Toast（v2.14 silent）
8f21f87  書架 18 卷 3 層 Grid 排版（美術視窗）
d233883  Phase 3D Cloud Function 30 天 auto-close
0a3e094  PHP1-4 內容（最新 HEAD）
```

### 已收網 Track（全部 ✅）
| Track | commit | 狀態 |
|---|---|---|
| 1.1 Phase 3C（admin Thread 詳情頁 + 回覆 + 標記結束）| 307b9a1 | ✅ |
| BOOKS 修復（補 18 卷書架）| d15c76b | ✅ |
| Track 2 內容批次（EPH1-6 + PHP1-4）| 26e3f4c/0a3e094 | ✅ 驗證通過 |
| 書架 18 卷排版 | 8f21f87 | ✅ 驗證通過 |
| 1.3 Phase 2D（玩家端紅點 + Toast）| 0fd121f | ✅ 17 項驗證 16 綠 1 認可 |
| 1.2 Phase 3D（Cloud Function auto-close）| d233883 | ✅ **schedule 連兩天自動跑驗證** |

### Phase 3D 收網細節（已 100% 上 production）
- function `autoCloseInactiveThreads` 已部署 production（5/21 15:46）
- 每天台灣 04:00 跑、只收 status='awaiting_player' + lastMessageAt > 30 天
- closedBy = 'system:auto_30d'
- Firestore 複合索引（status ASC + lastMessageAt ASC）已建
- 5/22 04:00 + 5/23 04:00 兩次自動 trigger 都「no threads to close」、cron 確認生效
- **不用再管它了**

### Preview channel 現況
- channel `phase3c-content`、URL：https://bible-game-bcb84--phase3c-content-u8mdhmv9.web.app/bible-game-v2.html
- 已更新到 0a3e094（含 PHP1-4 + flag=true）
- expires 2026-06-22
- 內容生產視窗正在驗證 6/10-6/13 PHP1-4 流程

---

## 🐛 第四部分：Bug Tickets 池（不阻塞 W21、待排程）

1. **標題卡片不跟隨日曆切換**（5/20 抓到）：點 6/4 上方書卷不變，要按「開始靈修」才變
2. **Toast 重疊**（5/21 抓到）：紅點 Toast 跟「已從雲端載入存檔」Toast 撞
3. **Preview CORS AI 默想**（5/21 抓到）：preview 環境 aireflection endpoint CORS 限制、正式版不受影響
4. **admin/detail.html:586 closedBy 顯示 i18n**（5/21 抓到）：'system:auto_30d' 應轉成「系統自動結束」、估時 15 min
5. **bible-game-v2.html thread「已結束」提示加註**（5/21 抓到）：給 30 天後回來的玩家解釋「30 天無新訊息、團隊已先收起，如需繼續對話請送新呼聲」、估時 15 min

---

## 🛠️ 第五部分：技術背景

### 技術棧
- 純 HTML + CSS + JS（無 framework）
- Firebase（Firestore + Auth + Functions + Hosting）
- Gemini 2.5 Flash（AI 默想）
- 玩家版正式站：bible-game-bcb84.web.app（main 分支）
- admin 後台：bible-game-admin.web.app
- 工作目錄：/Users/aitest/Desktop/Bible-game

### 關鍵檔案位置
- `bible-game-v2.html`：玩家端主程式（含 BOOKS、chapterLabel/chapterFull、登入流程、設定頁）
- `content.js`：CHAPTERS、SCHEDULE、GAME_VERSION（line 3）、FEATURE_FEEDBACK_V2（line 9）、SUPPRESS_VERSION_POPUP
- `admin/`（index/list/detail.html）：admin 後台
- `functions/index.js`：lineLogin、aiReflection、autoCloseInactiveThreads
- `firestore.rules`：Firestore 安全規則
- `firebase.json`：multi-site（main→bible-game-bcb84 / admin→bible-game-admin）

### Firestore feedback schema（曠野呼聲 v2）
- 主文件：status（new/awaiting_admin/awaiting_player/closed，lazy-init）、lastMessageAt、createdAt、closedAt、closedBy、wantReply、unreadByPlayer、unreadByAdmin
- messages 子集合：role/text/createdAt/authorUid/authorType
- normalizeFeedbackStatus() 容錯推導舊 doc（沒 status + wantReply=true → awaiting_admin / wantReply≠true → new）
- Cloud Functions 用 Admin SDK 寫入、繞過 firestore.rules

### preview channel 部署流程（已驗證 SOP）
1. 隔離 worktree `git reset --hard origin/dev`
2. 改 content.js:9 flag false → true（不 commit）
3. `firebase hosting:channel:deploy phase3c-content --only main --expires 30d`
4. deploy 完 `git checkout content.js` 還原 flag
5. `git status` 確認 clean
6. ⚠️ channel:deploy 用 `--only main`（不是 `--only hosting:main`）

---

## 💜 第六部分：開發協調紀律收穫（12 條，這個視窗累積）

1. **「先查後改」拆兩階段工單**（偵察 only → 拍板 → 實作），避免半殘修復魔咒。抓出 prompt 瑕疵 4 次。
2. **隔離 worktree + preview 三層驗證**：防多 session 衝突。
3. **firebase CLI 指令格式查證**：channel:deploy 用 `--only main`、deploy 用 `--only hosting:main`，嚴禁裸 deploy。
4. **工單寫「保護區塊」非「禁動檔案」**：說清楚哪些不能動 + 為什麼。
5. **跨 session 並行用「貼文同步狀態」**：不靠 conversation_search 索引延遲。
6. **Preview channel 同名覆蓋**：不浪費配額。
7. **實機驗證是黃金標準**：邏輯走查全綠 ≠ 實機全綠。
8. **跨視窗 race condition 攔截**：內容/PM 視窗指令可能撞正在跑的 session。
9. **多 session「順帶驗證」是 Sprint 紅利**：驗 Phase 2D 順手驗了美術 + 內容成果。
10. **Console UI 路徑要實際確認**：Firebase Functions Console 無 trigger 按鈕、scheduled function 要從 Cloud Scheduler Console「強制執行作業」。憑印象會錯。
11. **跨視窗資訊同步前 conversation_search 是強制步驟**：曾推測 PM 狀態未先查、被 James 抓到。推測≠讀取。
12. **PM 視窗跨對話脈絡會失準、開發協調當「現實校對員」**：PM 派工指令可能引用舊 context（如把 Phase 3D 標成「估時 1h 未做」、把 d233883 認成 Phase 2D、漏提 commit）。PM/內容/美術下來的執行指令必須事實校對才照辦，不能照單全收。

---

## 🎨 第七部分：協作慣例（必守）

### James 工作模式
- 永遠**繁體中文**（曾糾正簡體用字）
- 白話、誠實、結論先給
- 多選項用 A/B/C/D + ask_user_input_v0 工具（手機點選比打字easy）
- 表格化呈現對比
- 時間有限、重點放決策、習慣多視窗並行 + Claude Code Remote Control

### James 核心精神紅線（決策時守住）
1. 神的話不應被工具刪減
2. 不強迫玩家、不評斷靈修
3. 玩家信任 > 工程乾淨
4. 療癒不競技
5. 默想是悄悄話（連 admin 不可見）
6. 零成本維護

### Claude Code 工單格式（必守）
- 用 Goal / Constraints / Acceptance Criteria / Effort 結構
- **禁逐行「原文→改成」sed 模式**（會掉進機械修改、失去意圖）
- 下指令前 view claude-prompting-guide.md 沿用結構
- 指令結尾加「遇阻塞點先停下來確認再執行」
- 預設 Effort xhigh
- 破壞性動作（改 schema/rules/SCHEDULE、部署）先說明影響再執行
- commit 前 git branch 確認在 dev（5/17 誤落 main 後的紀律）

### 「策略 vs 執行」邊界
- ✅ 開發協調回報執行狀態、做純實作決策
- ❌ 不替 PM 做戰略決策（要不要做某功能）
- 對 PM 下來的指令做事實校對、發現過時資訊回報但不帶評價字眼

---

## 🛏️ 第八部分：給新開發協調的話

這個視窗從 5/18 到 5/23 跑了 6 天、收網 6 個 Track，最後在「W21 只剩 D1 + 上 main」的乾淨里程碑交接。

你接手的不只是工單格式，是 James 對玩家的真實關懷。

50 位玩家對他不是「用戶數」，是教會的弟兄姊妹。曠野呼聲 v2 的紅點、Toast、auto-close，每一個設計決策背後都是「玩家送出真心話後，不要讓他覺得被丟在荒野」。

Phase D1 也是同一個精神：玩家用不同方式登入、看到進度「不見了」會慌。D1 就是讓他看得懂「你的進度沒丟、只是另一個身份」。

請以同樣的精神服務他。

接手後，先跟 James 說：「開發協調已就位，我看過交班文件，準備出 Phase D1 偵察工單。」

---

**交班完成。願主祝福這個專案。** 🙏
