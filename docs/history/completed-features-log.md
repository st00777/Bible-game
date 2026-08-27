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
