# 靈修冒險遊戲 · 專案記憶文件
> 給 Claude Code 和共同開發者閱讀的專案說明。只放每次都會用到的規則；明細與歷史一律在 docs/。
> 最後更新：2026-09-04（瘦身：609 → 200 行以內，明細搬至 docs/backend.md、docs/content-format.md、docs/reading-schedule-2026.md）

---

## 專案基本資訊

**專案名稱**：靈修冒險（Bible Devotional Game）
**部署網址（三站區分 · 正本，全 repo 其餘各處一律指向此處）**：
- **玩家正式站（GitHub Pages）**：`https://st00777.github.io/Bible-game/bible-game-v2.html` —— 玩家實際使用的唯一正式站，對應 `main` 分支
- 固定測試站（Firebase hosting:main）：`bible-game-bcb84.web.app` —— 測試用，**不是正式站**
- 臨時預覽（Firebase preview channel）：`https://bible-game-bcb84--dev-01luz2yz.web.app/bible-game-v2.html` —— dev 分支預覽用，`bash deploy.sh channel dev` 部署（每次自動延長 30 天）
- 🔴 **規則：發布後的玩家端終驗只對正式站進行。驗測試站等同未驗。**（James 2026-08-20 確認）終驗＝`bible-playtest` skill 自動 17 步＋`docs/playtest-checklist.md` 真機 8 步（2026-08-28 起）。
**GitHub Repo**：`github.com/st00777/Bible-game`
**目前版本**：`2026.09.01`（品質整備：全專案檢視 A-D 批收官，issues #75-#78、PR #79-#95；不彈公告；遺留 #93 #94。日期版號制 2026-06-05 起，最後語意版號 v2.16。更早近況見 docs/history/）

**核心定位**：針對大光教會成人查經班的每日靈修輔助遊戲。不是取代靈修，而是輔助靈修——建議玩家先讀完當天經文再來玩。

---

## 經文來源查驗標準（正本）
> 全 repo 唯一完整敘述；content-tone-guide.md 第八節、LEARNING.md 教訓【七】、roles/ 派工模板與交接說明皆指向此處，不另存副本。（James 2026-08-20 確認）

- **唯一合法來源**：`https://rcuv.hkbs.org.hk/CUNP1/{書卷}/{章}/`。**不得使用任何其他來源，包含備援。**
- **查驗方式**：抓取後查頁面內嵌的站方版本識別區塊 **「CUNP1|新標點和合本(神)」**，確認存在才採用。
- **為何查 title 不足**（舊做法「查 title 為新標點和合本(神)」作廢）：
  1. hkbs 的 title 模板用「=」串接全書卷名清單與簡稱清單，會產生「啟示錄=創」這類看似錯亂的字串，容易誤判。
  2. 錯誤路徑的 title 前半段與正確路徑相同，靠 title 分不出來。
- **錯誤路徑三條**：`/CUNP/`、`/CUNPSS/`、`/CUNP_1/` —— 皆回 HTTP 200，但內容為和合本2010（和修版 RCUV），不是新標點和合本。**HTTP 200 不足以判斷來源正確**（靜默失敗：無 404、無錯誤訊息，看起來一切正常）。可辨識差異例：彼後 1:11 和修版作「永遠的國度」、新標點作「永遠的國」。
- **判準一句話：URL 只證明指令打對了，識別區塊才證明拿到的是那個版本。**

---

## 檔案結構（主要檔案）

```
bible-game-v2.html      遊戲主體（結構與樣式；主邏輯已抽至 app.js）
app.js                  遊戲主邏輯（2026-09-01 自 HTML 抽出；SDK 與本檔皆 defer）
content.js              靈修內容（每週更新這個）；末尾 validateContent() 五張表自檢
core.js                 零 DOM 依賴的純邏輯（chapterKey／進度／日曆／完成計分…），Node 可測
shared/feedback-schema.js  曠野呼聲狀態機單一正本；npm run sync-shared 複製到三個部署單元
public/                 Firebase hosting 上傳目錄（deploy.sh 從根目錄同步，不要直接改）
test/                   npm test（node --test）：內容自檢、core、feedback-schema、HTML 結構守門
functions/index.js      Cloud Functions（lineLogin, aiReflection, autoCloseInactiveThreads）
firestore.rules         Firestore 安全規則（正本）
scripts/                數據與檢查腳本（清單與用途見 docs/backend.md）
docs/                   backend.md／content-format.md／reading-schedule-2026.md／firestore-schema.md／adr／history
design-principles.md    情緒／默想類功能設計紅線（我們不做什麼）
content-tone-guide.md   敏感經文內容處理基調（內容工作必讀）
LEARNING.md             開發學習筆記（踩坑紀錄）
```

**重要原則**：
- 每次更新靈修內容只需修改 `content.js`；記得改 `GAME_VERSION` 和 `VERSION_NOTES`
- 機制邏輯在 `app.js`、結構樣式在 `bible-game-v2.html`；純規則（不碰 DOM／state）放 `core.js` 並補 `test/core.test.js`
- 改完 HTML／app.js／content／shared 跑 `npm test`（含 HTML 標籤平衡、inline script 與 app.js 編譯檢查）

---

## 技術架構（摘要，明細見 `docs/backend.md`）

- **前端**：HTML + CSS + JS，無建置步驟；**部署**：GitHub Pages（正式）＋ Firebase Hosting（測試／預覽）
- **後端**：Firebase 專案 `bible-game-bcb84`（Firestore + Auth + Cloud Functions Gen 2）；登入：Google、LINE（訪客模式可不登入）
- **AI 回應**：Gemini 2.5 Flash，經 Cloud Function `aiReflection` 代理；失敗回 fallback 文字，玩家看不到錯誤
- **Feature flag**：無現役 flag（`FEATURE_FEEDBACK_V2`、`BOOK_DETAIL_ENABLED` 已於 2026-09-01 退役）
- **追蹤**：GA4 `G-HZ3EGYB8BB`（Data API property ID `534159832`）
- **數據指令**：`npm run analyze`（Firestore 6 區塊）／`logs`（aiReflection）／`line-logs`（lineLogin）／`funnel`（B1 漏斗）／`ga4`（活躍規模與留存）；「更新遊戲數據」交 `data-analyst` subagent

## 後端要點（摘要，明細見 `docs/backend.md` 與 `docs/firestore-schema.md`）

- Firestore：`users/{uid}/**`（主文件、profile、chapters、reflections、stats、achievements、events）＋ `feedback/{id}`（含 messages 子集合）。`chapters/{key}` 用 `.set()` 會覆蓋，默想歷史查 `reflections` 子集合；`events` 訪客不寫。
- 安全規則：玩家只能讀寫自己的 `users/{uid}/**`；feedback read 限 owner 或 admin；admin＝Google email 白名單 `isAdmin()`（`st00777@hotmail.com`）。**改 schema／規則前先跑 `bible-firestore-safety` skill。**
- Cloud Functions（us-central1）：`lineLogin`、`aiReflection`、`autoCloseInactiveThreads`（30 天無訊息自動 closed）。Secret 在 Secret Manager。
- 每日自動備份 Firestore、保留 7 天；管理後台 `https://bible-game-admin.web.app`。

---

## 讀經進度（正本＝`docs/reading-schedule-2026.md`）

- 教會 2026 元旦起依序讀新約，8/29 起接創世記；全年表、19 處合併日、章節 key 命名規則都在正本文件。
- 🔴 **進度版本定案（James 2026-08-30）**：遊戲採 Gemini 網頁版（7/20 起比惠君 PDF 慢一天、12/31 收斂）。**不改、不對齊 PDF**；10-12 月已換算完畢，不需再向 James 索取進度。
- ※ 2026-09-04 止 content.js 已建到 10/13 GEN50（創世記完卷）；10/14 起出埃及記 EXO1-40 待建（10/14-11/19，合併日 10/23 出10+11、11/04 出23+24、11/16 出36+37）。
- **更新節奏**：每週一更新下下週內容，玩家永遠有一週緩衝。
- **合併日**：SCHEDULE 一律陣列格式 `'YYYY-MM-DD': ['A', 'B']`；兩章都要完整內容、各自獨立獎勵；任一章完成即算今日有靈修（streak 只 +1）。

---

## 遊戲機制與內容格式（正本＝`docs/content-format.md`）

- 核心流程：今日章節 → 一節金句 → 情境題 4 選 1（點兩下確認）→ 選做默想（AI 回應）→ 領裝備。
- 化身：暱稱＋性別；帽子／衣服／手持／背景四部位＋稱號（第五部位，綁累計完走卷數）；靈修 3 天解鎖衣櫃（中斷不歸零）。
- 開發者模式：連點右上角 🔥 三下，密碼 `acts2026dev`。
- 每章物件 schema、情境題六原則（含 2026-08-30 四格立場配額）、裝備 desc 原則（真實和合本原文、不跨章）、自檢三問，見正本文件與 `bible-content-generator` skill。
- 遊戲內只顯示一節金句，不做節選（James 2026-08-29 定案）。

---

## 待開發（已完成項與殺併留緣由見 `docs/history/completed-features-log.md`）

> 2026-08-24 殺併留、2026-08-27 六角色評估皆已拍板（ADR 0001）；PR ①②③a③b、說明頁更新已於 2026.08.28-08.30 上線；③c 已砍、③d 擱置。

- [ ] 等級階梯（只解周邊）＋「試煉」實驗（PR ③ 後）
- [ ] 時段成就統計 UI、介面美化 ──「併」入視覺成長主菜，不單獨做
- [ ] localStorage 暫存默想 ──「留」：Firestore 寫入失敗時的最後一道防線
- [ ] 推播提醒（Cloud Messaging／LINE 官方帳號二擇一）──「留・另議」
- 「緩」：每月精華 PDF、語音默想、季節活動；「冰箱」：小組功能、小組共讀、匿名群體鏡像、合作關卡
- ❌ 不做（2026-06-05 PM 閘門）：靈修日記 v2 前後比對、個人成長報告

---

## 分支策略與工作流程（2026-08-23 重訂）

- **`main`＝正式版**（玩家正式站），只接受已在 dev 測過的變更；**`dev`＝測試版**，所有工作先進 dev。
```
1. 所有工作（內容批次、功能、重構、文件）一律：分支 → PR → dev
2. dev 預覽驗證：bash deploy.sh channel dev
3. 發布：dev → main 用 PR，main 永遠是 dev 的祖先；main 合完若多出 merge commit，立刻 git push origin main:dev 對齊
4. 禁止 cherry-pick 到 main、禁止直接在 main 改內容
```
- 緊急 hotfix 可直接修 main，但**同一天**把 main 合回 dev。每日靈修內容也走 dev→main PR，不直接進 main；每批內容發布就是一次 PR，不要累積。
- 分岔歷史與方案見 `docs/merge-plan-2026-08-23.md`。

---

## 開發規範

**版本號**（2026-06-05 日期版號制）：進正式版時 `GAME_VERSION` 設為當天日期，格式 `'2026.06.14'`；不分大小版次。

**每次進版必做**
1. `GAME_VERSION` 改為當天日期。
2. `bible-game-v2.html` changelog HTML 加新版本記錄。
3. 更新 `VERSION_NOTES` ── ★ **只列玩家可見項**；後台修不寫；每條都對應已實作功能。
4. `<title>` 不含版本字串，確認即可。

**彈公告判準**（與版號脫鉤）：玩家可感知 → `SUPPRESS_VERSION_POPUP = false`；純後台修 → `true`。同一天已發版再補小改：不另開版號，只在 changelog 該日條目補一行。

**程式碼風格**：繁體中文介面；CSS 變數統一用 `:root`；動畫統一 `popIn`；overlay 一律 `openOverlay()` / `closeOverlay()`。改埋點或影響指標語意時追一筆 `docs/metric-changelog.md`。

## 多步驟任務檢查點
每完成一個 Phase 或重要步驟，必須回報：已完成／已驗證／剩餘。

## 禁止隱性失敗
若有任何步驟跳過、不確定、或無法驗證，必須明確說明。不得回報「完成」而實際有遺漏。commit 前必須確認當前所在分支。

---

## 協作模式與戰略對焦（正本＝`docs/adr/0003-single-executor.md`、`docs/adr/0001-refocus-2026-08.md`）

- **Claude Code 單一執行者**（2026-08-28 起）：五個策略視窗全部退役，James 只拍板。策略與執行分會話（`/rename` 標名）。
- **重大決策前跑冷評估**：新功能／上正式版／殺併留，先叫 `pm-critic` subagent 反方，James 再拍板。被否決的提案寫進 ADR 0003「否決紀錄」。
- **上正式版、`firebase deploy`、改 schema 一律單獨明確確認**，不在策略聊天中順口帶過。
- **現階段目的＝「重新點燃」**：James 本人與週活躍核心（12-15 人）優先；流失玩家暫緩（召回牌只能打一次）。乏味診斷＝流程可預期＋內容同質＋進度失去意義，**不是孤獨**。
- **視覺成長三原則**：出席驅動（絕不評默想品質／字數）、雙層節奏、累計成就不因 streak 中斷歸零。
- **核心指標**：「本週有幾個人完成靈修」＋守門（其中幾人寫默想、平均字數、連續 4 週未出現的人名）；看月趨勢與人名清單。
- **內容產線＝CC 一條龍**（ADR 0002）：CC 生成＋CUNP1 逐句驗（`npm run verify:scripture`）→ dev 預覽＋PR → James 手機審稿。平常章 Sonnet 寫、雷區章與主編審查用高階模型。
- 視野到 2026 年底；未定案項見 ADR 0001「尚未定案」節，勿當已決。

---

## 開發團隊

- **James**（st00777）：專案發起人，靈修內容方向，小組需求收集
- **共同開發者**：遊戲設計發想，測試，新功能提案

## Agent skills

- **Issue tracker**：GitHub Issues（`gh` CLI），見 `docs/agents/issue-tracker.md`。
- **Triage labels**：`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`，見 `docs/agents/triage-labels.md`。
- **Domain docs**：根目錄 `CONTEXT.md` ＋ `docs/adr/`，見 `docs/agents/domain.md`。
- **Skills 指令速查**：mattpocock-skills 中文速查在 `docs/agents/skills-guide.md`。
- 專案 subagent：`pm-critic`（冷評估）、`content-editor`（內容終審）、`code-reviewer`（紅線審查）、`data-analyst`（數據）、`art-director`（視覺）。
