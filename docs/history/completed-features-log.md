# 已完成功能紀錄
> 自 CLAUDE.md 搬出（2026-08-24）；歸檔用，不再隨每輪載入。

**已完成**
- [x] Firebase 雲端存檔＋Google 登入（v2.6）
- [x] LINE 登入（v2.7）
- [x] 歡迎登入畫面（先選登入方式再建角色，v2.7）
- [x] 頂部按鈕整理（收進 ⋯ 選單，v2.7）
- [x] 曠野呼聲回饋系統（遊戲內填寫，存 Firestore，v2.7）
- [x] 先讀經文提醒（透過步驟式導讀 + 閱讀勳章實作，v2.5-2.6）
- [x] Google Analytics GA4 追蹤（G-HZ3EGYB8BB，9 個自訂事件，v2.8）
- [x] 安全性強化（photoURL XSS、redirect_uri 白名單、CORS、OAuth crypto state，v2.8）
- [x] iOS Safari 全面相容性修復（v2.8）
- [x] 三階段字體大小切換（小14px/中16px/大19px，v2.9）
- [x] 成就系統（28 個徽章，6 維度，銅/銀/金三級，解鎖儀式，v2.9）
- [x] 書卷進度書架（木紋書櫃風格，進度條 + 章數，v2.9）
- [x] 靈修日記（默想文字存檔 + 回顧 + 搜尋 + 詳情頁，v2.9）
- [x] AI 靈修回應（Cloud Function + Gemini 2.5 Flash，v2.9）
- [x] 裝備支援性別差異（resolveItem，v2.9）
- [x] 5月靈修內容（羅馬書15-16 + 哥林多前書全卷 + 哥林多後書全卷，到5/29）
- [x] AI 503 retry 機制 + 成功率監控腳本 `npm run logs`（v2.9 hotfix，2026-04-28）
- [x] 默想歷史保留（chapters/{key}/reflections sub-collection，v2.9.x，2026-04-28）── 玩家同章節改寫不再覆蓋舊默想
- [x] AI fallback 顯式標記（aiReflection 回傳 isFallback；chapter / reflections doc 寫入 aiIsFallback；analyze 區塊 ④ 優先讀欄位、文字比對僅用於舊資料）（v2.9.x，2026-04-29）
- [x] 成就解鎖回顧（點已解鎖徽章可重看儀式，v2.10）
- [x] 加拉太書內容備齊（5/30-6/3 排程，v2.10）
- [x] AI 503 retry 升級（從 1 次升 2 次 + jitter，輸出 token 上限提升防截斷，v2.10）
- [x] 銀級成就色票對比加強（拋光鏡面銀，v2.10）
- [x] 手機版 sheet 動畫破圖修復（will-change: transform，2026-05-01，v2.10）
- [x] 手機版成就回顧 modal 閃爍修復（同 sheet 機制，2026-05-04，v2.10）
- [x] 手機版日曆最後一欄擠壓 / 4 字章節縮寫顯示修復（v2.10）
- [x] 合併日雙章機制（5/22 林後 5+6 雙入口 UI、任一章完成即算今日有靈修、書架 merged 機制廢除，v2.11，commit 091aa5c）
- [x] 4/17 使徒行傳完走計算 hotfix（merged map 補 ACT27，v2.11，commit 5a003a4）
- [x] FEATURE_FEEDBACK_V2 feature flag 機制（隱藏曠野呼聲 v2 入口，v2.11，commit cdb9208）
- [x] AI retry 升級 2→3 次（降低 fallback 率，v2.11，2026-05-11 部署）
- [x] 「合併日」日曆標籤 hotfix（v2.11，commit 5f49518）
- [x] 曠野呼聲 v2 多輪對話完整上線 + 內容 GAL/EPH/PHP + 書架擴充 18 卷 + D1 登入頁存檔提示（v2.14，2026-05-24，詳見下方 v3.0 候選短期）
- [x] **B1 事件流 timeline**（v2.15，2026-05-28）── `track()` 雙寫 GA4+Firestore `users/{uid}/events`、9 核心事件、訪客不記、sessionId 30min 過期；落地驗證 scripts/verify-b1-events.js
- [x] **E1 個人資料入口**（v2.15，2026-05-28）── ⋯選單分眾 5 欄位（ageGroup/churchKey/district/groupName/devotionHabit），每欄可留空可改；district/groupName 為 W23 人工求助轉介預留欄位
- [x] **`npm run ga4` 深度指標腳本**（2026-06-01，commit 8f975a4）── SA 金鑰打 GA4 Data API 拉 MAU/WAU/DAU + 9 核心事件觸發人數 + 週 cohort 留存（對齊 data-insights 口徑）；SA 權限經管理員 OAuth + Admin API `createAccessBinding` 加成檢視者，繞過 GA4 網頁加 SA 卡點。詳見「技術架構 > 數據分析」
- [x] **默想編輯時長 editDuration + 日記回看事件驗證**（2026-06-03，commit 25e1ef7，已隨 v2.16 上線（c4306f7））── `reflection_submit` 的 metadata 加 `editDuration`；diary_open 回看事件（深度追蹤 #1）落地驗證，餵北極星指標
- [x] **情緒 2.0 心情選擇器 + mood 存儲**（2026-06-04，commit f1c8b41，已隨 v2.16 上線（c4306f7））── 默想前選當次心情，存進事件／默想資料
- [x] **AI 默想回覆參考當次心情 mood**（2026-06-05，commit 2b8511a + 55ff83b prompt 收緊，已隨 v2.16 上線（c4306f7））── `aiReflection` 帶入 mood 個人化回應；設計紅線見 `design-principles.md`

> ✅ 上面三項（editDuration／情緒2.0／mood-aware AI）已隨 v2.16 release（c4306f7）上線、部署玩家端（GitHub Pages 正式版已 v2.16）；`GAME_VERSION` / `VERSION_NOTES` / changelog 均已同步。

**v3.0 候選短期 · 已完成明細**
- [x] **曠野呼聲 v2 多輪對話** ✅ 已完整上線（2026-05-24, v2.14；4 個 Phase 全數完成、flag 翻 true、後端 + 玩家入口同步上線）
  - Phase 1 ✅ 完成（commit ffa9545）── 資料層（rules + messages 子集合 + 15 筆 v1 文件 migrate）
  - Phase 2A ✅ 完成 ── wantReply 勾選表單
  - Phase 2B ✅ 完成 ── 我的留言列表
  - Phase 2C ✅ 完成（commit 1dea0fe）── thread UI + 玩家追訊息
  - Phase 2D ✅ 完成（commit 0fd121f）── 玩家端紅點提示 + 收到回覆 toast
  - Phase 3A ✅ 完成（commit fbe4705）── admin site 基礎建設（獨立 hosting + 認證）
  - Phase 3B ✅ 已上 production ── admin 列表 + 篩選
  - Phase 3C ✅ 完成 + 上線（commit 307b9a1）── admin 多輪回覆工具
  - Phase 3D ✅ 已部署 production（2026-05-24，functions/index.js `autoCloseInactiveThreads`：每天台灣 04:00 把 awaiting_player + lastMessageAt > 30 天的 thread 標記 closed，closedBy='system:auto_30d'）；手動標記功能已含於 Phase 3C
  - **FEATURE_FEEDBACK_V2 已於 2026-05-24（release `d3f832c`）翻 true，玩家入口已開放**；flag 機制最初為 v2.11 時導入（commit cdb9208），用來讓 v2 程式跟著 main 一起 release 但對玩家隱藏，直到 Phase 2D + 3B + 3C + 3D 全部完成、實機驗證通過再翻開

**v3.0 候選中期 · 已完成明細**
- [x] **事件流 session timeline** ✅ 已上線（W22 B1，v2.15，2026-05-28）── 玩家數破百觸發、按設計方案實作；解鎖客戶端錯誤、放棄事件、AI 失敗行為、dwell time 等分析的資料骨幹已就位（下一步：擴 `npm run analyze` 漏斗區塊 + 客戶端錯誤事件 30 分鐘加掛）

---

## 2026-08-24 ～ 2026-09-01 已完成／已決（2026-09-04 自 CLAUDE.md「近期待開發功能」搬入）

**2026-08-24 殺併留定案**（ADR 0001 附錄建議表，James 拍板「照建議」）：
- **升**：書卷完走儀式（新約終點儀式即原型，「里程碑大變身」的具體形式）
- **併**：時段成就統計 UI、介面美化 → 併入視覺成長主菜一起設計，不單獨做
- **留**：localStorage 暫存默想（玩家內容是核心資產，資料保全底線）
- **留（另議）**：推播提醒（Cloud Messaging／LINE 官方帳號二擇一，另開議題）
- **緩**：每月精華 PDF、語音默想、季節/節期活動
- **冰箱**：小組功能、小組共讀、匿名群體鏡像、合作關卡（診斷非孤獨，社交向暫不解題）

**2026-08-27 六角色評估拍板**（正本＝ADR 0001「2026-08-27 六角色評估拍板」節）：主菜＝三個 PR 依序——① 文案批＋自我約定＋AI 看裝備 → ② 焦點模式 → ③ 書卷詳情頁第二期；之後等級階梯與「試煉」實驗。「乏味不是孤獨」降回待驗證；核心句改「本週幾人完成靈修」＋守門「其中幾人寫默想」。

**已上線**
- [x] **PR ①** 文案批＋自我約定＋AI 看裝備 ── 2026.08.28 上線
- [x] **PR ②** 焦點模式＋完成短畫面＋🔥出席燈 ── 2026.08.29 上線（PR #40；儀式曝光僅 2-3 人未等數據，James 8/29 拍板直接做；完成短畫面已於 8/29 併入領獎畫面，James 拍板）
- [x] 遊戲說明頁（tut-overlay）更新（issue #53，方案 B：六步驟訂正文案＋「更多功能」兩層、成就入口改分頁）── 2026-08-30 上正式站（PR #59/#60→dev、#61→main；併入 2026.08.30、不彈公告）。方案 C「精簡＋就地提示」經 pm-critic 否決（ADR 0003 否決紀錄）。順手：主畫面隱藏背景雲朵 `body.in-app .cloud`。
- [x] **PR ③** 書卷詳情頁第二期：③a 分頁「📖 今日靈修｜📚 書卷與成就」＋卷徽章＋裝備剪影（PR #48）、③b 稱號＝第五裝備部位、綁累計完走卷數 9 級（PR #49）── 2026.08.30 上線（James 8/30 拍板與創世記選項回補整段上，PR #55）。
  - ℹ️ 成就 overlay 已隨 ③a 退役：成就／書架／徽章唯一入口＝主頁「📚 書卷與成就」分頁，`openAchievements()` 僅為 `switchPage('books')` 別名；說明頁與文件不得再寫「成就視窗／點徽章」舊入口。
  - ❌ ③c「每卷專屬稱號／每卷真稀有」── **2026-08-29 James 拍板砍**：與 ③b 累計階梯重複，玩家完走一卷會拿兩個稱號、語意打架；用現有機制即可。每卷的專屬感交給 ③d。
  - ⏸ ③d 書卷完走儀式＋AI 旅程故事 ── **2026-08-30 James 擱置**：pm-critic 冷評估（年底前觸發者可能 <5 人、只看一次×AI fallback、choiceSelected 送 AI 隱私未定）＋靜態最小版模擬看過後「沒有很喜歡」。PR ③ 到 ③b 為止；BOOK_DETAIL_ENABLED 已於 2026-09-01 退役。
- [x] 管理後台 admin web app 已部署（reply 回覆功能上線，2026-05-24，URL: `https://bible-game-admin.web.app`）；SCHEDULE 管理仍未做。

**PM 閘門判定不做（2026-06-05）**
- 靈修日記 v2：前後比對功能（「X 天前的你寫了這些」）── diary 回看率 0-10%、僅 3 位頂層 power user 回看，「回看=陪伴」假設玩家行為不支持；除非訊號改變。
- 個人成長報告（半年／一年，NLP 分析默想內容找重複主題）── 同上閘門：為 0-10% 回看率建 NLP 報告 = 建了沒人用陷阱；除非訊號改變。

**已定案的待決議事項**
- ① 每日經文顯示方式 ✅（James 2026-08-29）：只顯示一節金句，不做重點段落／節選（詳見 `docs/content-format.md`）。
- ② 先讀經文提醒 ✅：以步驟式導讀（v2.5）+ 閱讀勳章 +15 XP（v2.6）內嵌實作，不另彈窗。

**歷史盤點指標**
- 2026-04-27 數據快照見 `docs/history/data-snapshot-2026-04-27.md`；最新數據以 `data-insights.md` 為準。
- 2026-04-28 資料缺漏盤點見 `docs/history/data-gap-audit-2026-04-28.md`，已多數落地。
