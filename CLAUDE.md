# 靈修冒險遊戲 · 專案記憶文件
> 給 Claude Code、Claude AI Project 和共同開發者閱讀的專案說明
> 最後更新：2026-08-31（安全修正 2026.08.31 上線）

---

## 專案基本資訊

**專案名稱**：靈修冒險（Bible Devotional Game）
**部署網址（三站區分 · 正本，全 repo 其餘各處一律指向此處）**：
- **玩家正式站（GitHub Pages）**：`https://st00777.github.io/Bible-game/bible-game-v2.html` —— 玩家實際使用的唯一正式站，對應 `main` 分支
- 固定測試站（Firebase hosting:main）：`bible-game-bcb84.web.app` —— 測試用，**不是正式站**
- 臨時預覽（Firebase preview channel）：`bible-game-bcb84--dev-xxxxxx.web.app` —— dev 分支預覽用
- 🔴 **規則：發布後的玩家端終驗只對正式站進行。驗測試站等同未驗。**（James 2026-08-20 確認）終驗＝`bible-playtest` skill 自動 17 步＋`docs/playtest-checklist.md` 真機 8 步（2026-08-28 起）。
**GitHub Repo**：`github.com/st00777/Bible-game`
**目前版本**：`2026.08.31`（安全修正：曠野呼聲 create 規則綁 uid＋LINE 登入 state 必驗，純後台不彈公告，PR #71-#73；規則已部署。前版 日期版號制，2026-06-05 起；最後一個語意版號 v2.16 於 2026-06-14 上線。近期：8/28 PR ①、8/29 PR ② 焦點模式＋出席燈、8/30 PR ③a/③b 書卷與成就分頁＋稱號＋創世記 2·4·6·8·11 情境題配額回補；同日 #53 說明頁更新＋主畫面隱藏背景雲朵，併入 08.30 不彈公告；同日 #68/#69 創世記 25-36 內容上線、不進版）

**核心定位**：
針對大光教會成人查經班的每日靈修輔助遊戲。
不是取代靈修，而是輔助靈修——建議玩家先讀完當天經文再來玩。

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

## 檔案結構

```
Bible-game/
├── bible-game-v2.html             # 遊戲主體（機制、介面、邏輯）
├── content.js                     # 靈修內容（每週更新這個）；末尾 validateContent() 五張表自檢（npm run validate:content）
├── core.js                        # 零 DOM 依賴的純邏輯（chapterKey／進度／日曆／完成計分…），Node 可測；onclick 仍呼叫同名全域
├── shared/feedback-schema.js      # 曠野呼聲狀態機單一正本；npm run sync-shared 複製到 public/shared、admin/shared、functions/lib
├── public/                        # Firebase hosting:main 上傳目錄（deploy.sh 從根目錄同步，不要直接改）
├── test/                          # npm test（node --test）：內容自檢、core、feedback-schema、HTML 結構守門
├── CLAUDE.md                      # 本文件 — 專案記憶
├── design-principles.md           # 情緒／默想類功能設計紅線（我們不做什麼），與 CLAUDE.md 並列
├── LEARNING.md                    # 開發學習筆記（踩坑紀錄）
├── claude-code-agent-prompts.md   # 內容生成 prompts + 審查清單
├── content-tone-guide.md          # 敏感經文內容處理基調（內容視窗必讀）
├── README.md                      # GitHub 說明頁
├── docs/firestore-schema.md       # Firestore 完整 schema（CLAUDE.md 只留摘要）
├── docs/history/                  # 已上線規格／歷史快照／已完成清單歸檔（不隨每輪載入）
├── docs/metric-changelog.md       # 指標口徑變更紀錄（改埋點／改 UI 影響指標語意時追一筆）
├── .claude/agents/data-analyst.md # 數據分析 subagent（「更新遊戲數據」「看漏斗」交它跑，sonnet）
├── firebase.json                  # Firebase 設定（Functions/Firestore/Hosting）
├── firestore.rules                # Firestore 安全規則
├── functions/index.js             # Cloud Functions（lineLogin, aiReflection, autoCloseInactiveThreads）
├── scripts/_shared.js             # 共用：PROJECT 常數 + OAuth token + Cloud Logging 抓取
├── scripts/analyze-feedback.js    # Firestore 數據分析（npm run analyze）
├── scripts/check-ai-logs.js       # aiReflection 呼叫量／成功率（npm run logs）
├── scripts/check-line-logs.js     # lineLogin 成功率／失敗分布（npm run line-logs）
├── scripts/list-profiles.js       # 列玩家 profile/data（含 E1 分眾欄位）
├── scripts/verify-b1-events.js    # B1 事件流落地驗證（列 uid events + 9 事件覆蓋）
├── scripts/funnel.js              # B1 漏斗：週別選章→看題→確認→送默想→完成、掉人章節、閱讀來源、停留、儀式曝光（npm run funnel）
├── scripts/ga4-insights.js        # GA4 深度指標（npm run ga4，用 SA 金鑰打 Data API）
├── scripts/validate-content.js    # Node 端內容自檢（錯誤 exit 1）
├── scripts/sync-shared.js         # 共用檔正本→三個部署單元複本（--check 只比對）
└── package.json                   # npm scripts（test / validate:content / sync-shared …）
```

**重要原則**：
- 每次更新靈修內容只需修改 `content.js`
- `bible-game-v2.html` 只在機制或介面有改動時才動；純規則（不碰 DOM／state）請放 `core.js` 並補 `test/core.test.js`
- 改完 HTML／content／shared 跑 `npm test`（含 HTML 標籤平衡與 inline script 編譯檢查）
- 每次更新記得修改 `content.js` 裡的 `GAME_VERSION` 和 `VERSION_NOTES`

---

## 技術架構

**前端**：HTML + CSS + JavaScript（單一 HTML 檔案 + content.js）
**部署**：GitHub Pages（HTTPS，免費）
**後端**：Firebase（Firestore Database + Authentication + Cloud Functions Gen 2）
**登入方式**：Google 登入、LINE 登入（未登入可繼續使用訪客模式）
**資料同步**：登入後進度自動同步 Firestore；未登入使用 localStorage
**Firebase 專案**：`bible-game-bcb84`
**AI 回應**：Google AI Studio（Gemini 2.5 Flash），透過 Cloud Function `aiReflection` 代理呼叫
**Feature flag**：`FEATURE_FEEDBACK_V2 = true`（content.js，2026-05-24 起開放曠野呼聲 v2 入口）；規格與 flag 機制見 `docs/history/feedback-v2-spec.md`
**追蹤**：Google Analytics GA4（measurement ID `G-HZ3EGYB8BB`；Data API 用的 property ID 是 `534159832`，純數字、在 GA4 屬性設定找）
**數據分析**：
- `npm run analyze` ── Firestore 6 區塊報告（feedback / users / 靈修進度 / 成就 / 章節品質 ①-④ / 裝備 ⑤ / 默想歷史 ⑥）
- `npm run logs [天數]` ── aiReflection 呼叫量、AI 真實回應比、錯誤類型分布（預設過去 1 天）
- `npm run line-logs [天數]` ── lineLogin 成功率、HTTP 失敗分布、錯誤類型、失敗時段（預設過去 1 天）
- `npm run funnel [週數]` ── B1 事件流漏斗（人／人×章兩種口徑）、掉人最多章節、閱讀勳章來源 bible_com vs already（口徑漂移守門）、各段停留中位數（elapsedSec，2026-08-28 起）、終點儀式 finale_view/close
- `npm run ga4` ── GA4 深度指標：活躍規模 MAU(30天)/WAU(7天)/DAU(昨天)、9 核心事件觸發人數、週 cohort 留存（對齊 data-insights 口徑）

前三支用 Firebase CLI refresh token 直接打 Cloud REST API；`npm run ga4` 改用 service account 金鑰（`ga4-key.json`，屬性檢視者權限）+ 純 Node crypto 簽 JWT 換 token 打 GA4 Data API。四支都不需額外安裝 SDK。

> **GA4 SA 權限怎麼來的**（2026-06-01）：GA4 網頁「資源存取權管理」加 service account 會跳「與帳戶不符」加不進去（已知卡點）。改用管理員 OAuth + Admin API `createAccessBinding` 從程式端加成「檢視者」。`ga4-key.json`（SA 金鑰）與 `token.json`（OAuth 授權）都已 gitignore、絕不進 git。

---

## 後端架構

### Firestore 資料結構

> 完整欄位明細見 `docs/firestore-schema.md`。改 schema 前先跑 `bible-firestore-safety` skill。

```
users/{uid}                                   主文件：completed / streak / items / 裝備 / level / xp / name / gender / setup
users/{uid}/profile/data                      登入資訊 + E1 分眾 5 欄位（ageGroup/churchKey/district/groupName/devotionHabit）
users/{uid}/chapters/{chapterKey}             每章完成記錄（date/timeOfDay/choiceSelected/reflectionText/aiResponse/aiIsFallback/mood）
users/{uid}/chapters/{chapterKey}/reflections/{ts}   默想歷史（每次寫默想新增一筆）
users/{uid}/stats/data                        累計統計（totalDays/reflectionCount/readCount/…）
users/{uid}/achievements/data                 成就 unlockedAt / progress
users/{uid}/events/{eventId}                  B1 事件流（9 核心事件、sessionId；訪客不寫）
feedback/{docId}                              曠野呼聲（v1 欄位 + v2 wantReply/status/unread*/messageCount）
feedback/{docId}/messages/{msgId}             多輪對話（role player|admin，≤300 字）
```

關鍵注意：`chapters/{key}` 用 `.set()` 會覆蓋，只保留最後一次默想，歷史請查 `reflections` 子集合；`events` 為 fire-and-forget、訪客不寫。
時段定義：morning 05:00–11:59 / afternoon 12:00–17:59 / evening 18:00–21:59 / night 22:00–04:59（清晨統計用 05:00–08:59）。

### 安全規則

- 每個玩家只能讀寫自己的 `users/{uid}/**`。
- `feedback` 集合：write 受 hasOnly／300 字等 schema 檢查；read 限 owner（uid 比對，匿名留言永遠讀不到）或 admin（2026-05-01 修正，原本任何登入玩家可讀所有人）。
- `feedback/{id}/messages` 子集合：append-only，role／authorUid 一致性檢查。
- **Admin 機制**：`isAdmin()` 用 Google email 白名單（`st00777@hotmail.com`）。新增 admin 直接改函式 + `firebase deploy --only firestore:rules`。
- 完整規則見 `firestore.rules`（正本，不在此重抄）。

### 授權網域

Firebase Authentication 已授權：`st00777.github.io`、`bible-game-bcb84--dev-01luz2yz.web.app`

### 自動備份

- 每日自動備份 Firestore（2026-04-17 起）
- 保留 7 天，超過自動清除
- 排程 ID：`7611676d-7c03-4bd3-bd63-b9e4fc8387af`
- 查看備份：`firebase firestore:backups:list --location asia-east1`
- 還原指令：`firebase firestore:databases:restore --backup <backup-name>`

### Cloud Functions

**lineLogin**（us-central1，2nd Gen）
- 功能：LINE OAuth 2.0 授權碼換 Firebase 自訂 Token
- URL：`https://linelogin-kvjdptgk7q-uc.a.run.app`
- CORS：允許 `https://st00777.github.io`（正式版）和 `https://bible-game-bcb84--dev-01luz2yz.web.app`（測試版）
- Channel ID：`2009801861`（公開，可硬編碼）
- Channel Secret：存放於 Firebase Secret Manager（`LINE_CHANNEL_SECRET`）
- Firebase UID 格式：`line:{lineUserId}`（與 Google 帳號 UID 空間隔離）
- 流程：接收 `code` + `redirect_uri` → 換 access token → 取 LINE profile → 建立 custom token → 回傳 token + 姓名 + 頭像

**aiReflection**（us-central1，2nd Gen）
- 功能：AI 靈修默想回應
- URL：`https://aireflection-kvjdptgk7q-uc.a.run.app`
- CORS：允許 prod + dev
- 模型：Gemini 2.5 Flash (`gemini-2.5-flash`)
- API Key：存放於 Firebase Secret Manager（`GOOGLE_AI_API_KEY`）
- 流程：接收 `chapter` + `reflectionTitle` + `playerText` → 呼叫 Gemini → 回傳 `{ aiResponse }`
- generationConfig：`maxOutputTokens: 1500, temperature: 0.9`（2026-05-01 從 1000/0.7 升級，避免回應被截斷）
- **失敗處理**：Gemini 回 503 最多重試 3 次（1.5±0.5 秒 jitter）；其餘錯誤回 fallback 文字「謝謝你願意把心裡的話帶到神面前。祂看見了。」（玩家不會看到錯誤）
- 監控：`npm run logs` 看當天呼叫成功率，目標 90% 以上；若 fallback 持續 >10% 考慮加 Gemini Pro 備援，或調整 generationConfig（譬如降 maxOutputTokens / temperature 讓回應更快、減少超時觸發）

**autoCloseInactiveThreads**（us-central1，2nd Gen）
- 功能：30 天無新訊息的曠野呼聲 thread 自動標記 `status='closed'`（每日排程掃描，cron `0 4 * * *` Asia/Taipei）
- 部署：2026-05-24（v2.14 上線時部署到 production）

---

**content.js 結構**：
```javascript
const GAME_VERSION = '2026.08.27'; // 版本號（日期制）
const VERSION_NOTES = [...];       // 更新摘要（顯示在彈窗）
const SCHEDULE = {...};            // 日期→章節對應表
const BIBLE_LINKS = {...};         // Bible.com 連結
const CHAPTERS = [...];            // 每日靈修內容陣列
```

---

## 讀經進度對應（大光教會2026）

教會從2026年元旦開始，依序讀新約，偶爾有一天兩章的情況。

> 4 月、5 月已建入的進度見 `docs/history/reading-schedule-2026.md`（SCHEDULE 已在 content.js）。

> 🔴 **進度版本定案（James 2026-08-30）**：教會有兩份進度——惠君的 PDF（7/20 雅1+2 合併）與 Gemini 網頁版（12/31 民18+19 合併）。**遊戲採網頁版**：從 7/20 起比 PDF 慢一天，12/31 收斂回一致。牧師已回應「按自己習慣即可」，**不改、不對齊 PDF**。PDF 原檔 39 頁已完整比對（第 29-39 頁＝9/26～12/31），下表 10-12 月即依此換算（PDF 日期＋1 天），之後不需再向 James 索取進度。

**全年進度（5月下旬～12月）**（※ 2026-08-30 止 content.js 已建到 9/30 GEN36；10/1 起待建）：
```
5/18 林後1   5/19 林後2   5/20 林後3   5/21 林後4
5/22 林後5+6（合併日，雙章呈現）  5/23 林後7   5/24 林後8   5/25 林後9
5/26 林後10  5/27 林後11  5/28 林後12  5/29 林後13
5/30 加1    5/31 加2
6/01 加3    6/02 加4    6/03 加5+6（合併）
6/04 弗1    6/05 弗2    6/06 弗3    6/07 弗4    6/08 弗5    6/09 弗6
6/10 腓1    6/11 腓2    6/12 腓3    6/13 腓4
6/14 西1+2（合併）  6/15 西3    6/16 西4
6/17 帖前1  6/18 帖前2  6/19 帖前3  6/20 帖前4  6/21 帖前5
6/22 帖後1  6/23 帖後2  6/24 帖後3
6/25 提前1  6/26 提前2+3（合併）  6/27 提前4  6/28 提前5  6/29 提前6
6/30 提後1  7/01 提後2  7/02 提後3  7/03 提後4
7/04 多1    7/05 多2    7/06 多3    7/07 門1
7/08 來1+2（合併）  7/09 來3   7/10 來4   7/11 來5   7/12 來6
7/13 來7    7/14 來8    7/15 來9    7/16 來10  7/17 來11  7/18 來12  7/19 來13
7/20 雅1    7/21 雅2    7/22 雅3    7/23 雅4    7/24 雅5
7/25 彼前1  7/26 彼前2  7/27 彼前3  7/28 彼前4  7/29 彼前5
7/30 彼後1  7/31 彼後2  8/01 彼後3
8/02 約一1+2（合併）  8/03 約一3  8/04 約一4  8/05 約一5
8/06 約二1  8/07 約三1  8/08 猶1
8/09 啟1  8/10 啟2  8/11 啟3  8/12 啟4  8/13 啟5+6（合併）  8/14 啟7
8/15 啟8  8/16 啟9  8/17 啟10  8/18 啟11  8/19 啟12  8/20 啟13  8/21 啟14
8/22 啟15  8/23 啟16  8/24 啟17  8/25 啟18+19（合併）  8/26 啟20  8/27 啟21  8/28 啟22
8/29 創1  8/30 創2  8/31 創3
9/01 創4  9/02 創5  9/03 創6  9/04 創7  9/05 創8  9/06 創9+10（合併）
9/07 創11  9/08 創12  9/09 創13  9/10 創14  9/11 創15  9/12 創16  9/13 創17
9/14 創18  9/15 創19  9/16 創20  9/17 創21  9/18 創22+23（合併）
9/19 創24  9/20 創25  9/21 創26  9/22 創27  9/23 創28
9/24 創29  9/25 創30  9/26 創31  9/27 創32  9/28 創33  9/29 創34  9/30 創35+36（合併）
10/01 創37  10/02 創38  10/03 創39  10/04 創40  10/05 創41  10/06 創42  10/07 創43
10/08 創44  10/09 創45  10/10 創46  10/11 創47+48（合併）  10/12 創49  10/13 創50
10/14 出1   10/15 出2   10/16 出3   10/17 出4   10/18 出5   10/19 出6   10/20 出7
10/21 出8   10/22 出9   10/23 出10+11（合併）  10/24 出12  10/25 出13  10/26 出14
10/27 出15  10/28 出16  10/29 出17  10/30 出18  10/31 出19
11/01 出20  11/02 出21  11/03 出22  11/04 出23+24（合併）  11/05 出25  11/06 出26
11/07 出27  11/08 出28  11/09 出29  11/10 出30  11/11 出31  11/12 出32  11/13 出33
11/14 出34  11/15 出35  11/16 出36+37（合併）  11/17 出38  11/18 出39  11/19 出40
11/20 利1   11/21 利2   11/22 利3   11/23 利4   11/24 利5   11/25 利6   11/26 利7
11/27 利8+9（合併）  11/28 利10  11/29 利11  11/30 利12
12/01 利13  12/02 利14  12/03 利15  12/04 利16  12/05 利17  12/06 利18  12/07 利19
12/08 利20  12/09 利21+22（合併）  12/10 利23  12/11 利24  12/12 利25  12/13 利26  12/14 利27
12/15 民1   12/16 民2   12/17 民3   12/18 民4   12/19 民5   12/20 民6   12/21 民7+8（合併）
12/22 民9   12/23 民10  12/24 民11  12/25 民12  12/26 民13  12/27 民14  12/28 民15
12/29 民16  12/30 民17  12/31 民18+19（合併，與 PDF 在此收斂）
```

**章節 key 命名規則**：
- 哥林多後書：COR2_1 ~ COR2_13
- 加拉太書：GAL1 ~ GAL6
- 以弗所書：EPH1 ~ EPH6
- 腓立比書：PHP1 ~ PHP4
- 歌羅西書：COL1 ~ COL4
- 帖撒羅尼迦前書：TH1_1 ~ TH1_5
- 帖撒羅尼迦後書：TH2_1 ~ TH2_3
- 提摩太前書：TIM1_1 ~ TIM1_6
- 提摩太後書：TIM2_1 ~ TIM2_4
- 提多書：TIT1 ~ TIT3
- 腓利門書：PHM1
- 希伯來書：HEB1 ~ HEB13
- 雅各書：JAS1 ~ JAS5
- 彼得前書：PE1_1 ~ PE1_5
- 彼得後書：PE2_1 ~ PE2_3
- 約翰一書：JN1_1 ~ JN1_5
- 約翰二書：JN2_1
- 約翰三書：JN3_1
- 猶大書：JUD1
- 啟示錄：REV1 ~ REV22
- 創世記：GEN1 ~ GEN50（8-9 月排到 GEN36，10/1-10/13 GEN37-50）
- 出埃及記：EXO1 ~ EXO40（10/14-11/19）
- 利未記：LEV1 ~ LEV27（11/20-12/14）
- 民數記：NUM1 ~ NUM19（12/15-12/31；2027 續 NUM20+ 視教會計畫）
  ※ 約翰書信用 JN 前綴，預留「約翰福音」未來用 JHN，避免撞號。

**合併章節（全年 19 處）**：
- 5/22 林後5+6 → 雙章呈現（v2.11 已上線，COR2_6 章節物件已備齊）
- 6/03 加5+6 → 雙章呈現（死線前 GAL5 章節物件待補）
- 6/14 西1+2 → 雙章呈現（COL1 / COL2 章節物件未補，整書卷尚未開始）
- 6/26 提前2+3 → 雙章呈現（TIM1_2 / TIM1_3 章節物件未補，整書卷尚未開始）
- 7/08 來1+2 → 雙章呈現（HEB1 / HEB2 章節物件未補，整書卷尚未開始）
- 8/02 約一1+2 → 雙章呈現
- 8/13 啟5+6 → 雙章呈現
- 8/25 啟18+19 → 雙章呈現
- 9/06 創9+10 → 雙章呈現
- 9/18 創22+23 → 雙章呈現
- 9/30 創35+36 → 雙章呈現
- 10/11 創47+48、10/23 出10+11、11/04 出23+24、11/16 出36+37、11/27 利8+9、12/09 利21+22、12/21 民7+8、12/31 民18+19 → 雙章呈現（10-12 月共 8 處，2026-08-30 依 PDF 換算）

**更新節奏**：每週一更新下下週內容，確保玩家永遠有一週緩衝。

**合併章節處理原則**（2026-05-11 v2.11 翻轉）：
- **雙章完整呈現**：合併日的兩章都要寫情境題、默想、裝備，缺一不可。
- **SCHEDULE 統一陣列格式**：`'YYYY-MM-DD': ['章節1', '章節2', ...]`，單章日 length=1、合併日 length>=2。
- **雙入口 UI 玩家自選**：日曆點該日進「合併日選擇頁」，玩家選要先讀哪一章。
- **任一章完成即算今日有靈修**：streak 計算只 +1（不論玩家當天完成幾章），避免合併日 streak 灌水。
- **兩章各自獨立獎勵**：完成每章都領基本 + 稀有裝備、各自寫默想。
- **書卷統計依實際章節數**：BOOKS.entries 完整列出所有章節（含合併日的兩章），廢除 merged 倍數機制；其他尚未補章節物件的書卷暫保留 mergedActive flag 過渡。

> **Phase B 漸進釋出策略**（各書卷合併日切換進度、三條指導原則）見 `docs/history/merged-chapter-phase-b.md`。

---

## 遊戲機制說明

### 核心流程
1. 打開遊戲 → 自動跳到今日讀經章節
2. 日曆選章（可補讀過去、可提前靈修）
3. 閱讀今日經文（一節金句）
4. 回應今日情境題（4選1，點兩下確認防誤觸）
5. 選做默想（AI 個人化回應）
6. 完成靈修，領取裝備

### 化身系統
- 暱稱＋性別（弟兄/姐妹/不設定）
- 四個裝備部位：帽子、衣服、手持、背景
- 連續3天解鎖衣櫃換裝
- XP＋等級系統

### 性別專屬初始裝備
```
弟兄：🧥先知的斗篷（衣服）、⚔️屬靈的寶劍（手持）
姐妹：👘服事的外袍（衣服）、🕯️代禱的燈台（手持）
不設定：🌿旅人的外衣（衣服）
```

### 裝備分類原則（直覺化）
- **帽子**：象徵性的標誌、身份、祝福（如音符飄在頭上、橄欖枝）
- **衣服**：角色外袍、囚衣、身分象徵
- **手持**：實際拿在手上的物件（鑰匙、書信、盾牌）
- **背景**：場景意象、地圖、海浪、火焰

### 開發者模式
- 觸發：連點右上角🔥天數按鈕 3下
- 密碼：`acts2026dev`
- 功能：解鎖所有裝備、連續天數設為3天

---

## 每日靈修內容格式

新增章節時，每個物件的格式如下：

```javascript
{
  chapter: 'ROM1',          // 章節 key（使徒行傳用數字，羅馬書用 'ROM1' 等）
  readTime: 4,              // 閱讀完整章節的預估分鐘數（v2.5 導讀系統用）
  guide: {                  // 導讀（v2.5 起必備；2026-08-24 補進本文件，程式碼 172 章早已都有）
    intro: '...',           //   章節導言（2-3 句，背景與轉折點）
    outline: [              //   分段大綱
      { nodes:'1-8節', text:'...' },
    ],
    focus: '...',           //   閱讀聚焦提示
    hard: ['...', '...']    //   選填（2026-08-29）：這章讀者具體會卡的 1-3 點與怎麼讀過去；沒難處就不填，不預設「這章很難」
  },
  sceneEmoji: '✉️',         // 場景 emoji
  verse: '「...」',          // 今日金句（一節）
  verseRef: '—— 書卷 章:節', // 出處
  scene: '...',             // 場景描述（2-4句，描述當天故事背景）
  q: '...',                 // 情境問題（開放性，與玩家生命連結）
  choices: [
    { k:'A', text:'...' },
    { k:'B', text:'...' },
    { k:'C', text:'...' },
    { k:'D', text:'...' }
  ],
  responses: {
    A: '...',  // 對A選項的回應（溫暖、有洞見，不說教）
    B: '...',
    C: '...',
    D: '...'
  },
  reflectionTitle: '...',   // 默想主題標題（2-4字）
  reflection: '...',        // 默想引導（兩段，第一段背景，第二段個人問題）
  baseItem: {               // 完成靈修獲得的基本裝備
    emoji: '✉️',
    name: '羅馬的書信',
    desc: '「...」',        // 引用相關經文
    slot: 'hand'           // 'hat' / 'body' / 'hand' / 'bg'
  },
  bonusItem: {              // 填寫默想後獲得的稀有裝備
    emoji: '🌍',
    name: '萬國的地圖',
    desc: '「...」',
    slot: 'bg'
  }
}
```

**情境題設計原則（v2升級版）**：
1. 沒有對錯，選最有共鳴的
2. 四個選項涵蓋不同的信仰成熟度與誠實程度——四格必須是**不同立場**，不是同一種軟弱的四種強度；至少橫跨兩條軸線（現況／情緒／理性／行動）
3. 至少一個選項給「老實說我做不到」的人
4. 回應溫暖有洞見，像朋友同行，不說教——不說教≠不能有重量：挑戰落在經文的觀察上（「經文沒有寫⋯」），不落在玩家人格上（「你其實在逃避」）
5. 每個回應最後留下「一個情緒有重量的小步」——真實的人會說出口的話，不是「想一想」，而是一句可以真實說出口的話，或一個有方向感的問題
6. **四格立場配額（軟性，2026-08-30 起）**：軟弱－掙扎－受傷光譜至多兩格；至少一格給「我已經在做了／這對我不難」或「這章我沒特別感覺」。緣由：GEN1-24 審計 73% 選項落在軟弱光譜、六章四格同軸，玩家反映「四個都不像我」。已上線章不追溯重寫（`choiceSelected` 只存字母、日記用當前文字渲染），最多換最弱一格。「我不同意經文」格不開（雷區章等於請玩家審判經文）。

**裝備設計原則**：
- desc 欄位必須引用真實的和合本原文，一字不差
- 如果找不到合適的原文，用該章節的金句，不能自己創造句子
- 裝備名稱和 desc 必須來自同一個神學層次，不能跨層混用
- **verse / baseItem.desc / bonusItem.desc 引用的經文必須在本章範圍內，不可跨章引用**

**生成內容自檢問題**：
1. 「這句話，現實生活中真的有人會這樣講嗎？」
   ✅ 會說 → 保留
   ❌ 不會說 → 改寫成「人話」
2. 「這個 desc 是真實的和合本經文嗎？」
   ✅ 是 → 保留
   ❌ 不是 → 查原文修正
3. 「裝備名稱和 desc 在同一個神學層次嗎？」
   ✅ 是 → 保留
   ❌ 不是 → 重新對齊

---

## 待決議事項

**① 每日經文顯示方式** ✅ 已定案（James 2026-08-29 確認）
- 遊戲內只顯示一節金句，**不做重點段落／節選**：鼓勵完整讀經，神的話不刪減、不篩選。
- 定位不變：玩家「讀完聖經再來玩」，遊戲輔助靈修、不取代讀經。降門檻只降操作摩擦，不降「讀整章、真反思」的要求。

**② 先讀經文提醒** ✅ 已完成 ── 以步驟式導讀（v2.5）+ 閱讀勳章 +15 XP（v2.6）內嵌實作，不另彈窗。

---

## 數據觀察基準

> 2026-04-27 歷史快照已過時，原文見 `docs/history/data-snapshot-2026-04-27.md`；最新數據以 `data-insights.md` 為準。

---

## 資料缺漏盤點

> 2026-04-28 全面盤點（A/B/C 級、內容品質、施工順序、事件流設計方案）已多數落地；原文見 `docs/history/data-gap-audit-2026-04-28.md`。最新數據以 `data-insights.md` 與 `npm run analyze` / `npm run ga4` 為準。

---

## 近期待開發功能

> **2026-08-24 殺併留定案**（ADR 0001 附錄建議表，James 拍板「照建議」）——以下未完成項一律以此為準：
> - **升**：書卷完走儀式（新約終點儀式即原型，「里程碑大變身」的具體形式）
> - **併**：時段成就統計 UI、介面美化 → 併入視覺成長主菜一起設計，不單獨做
> - **留**：localStorage 暫存默想（玩家內容是核心資產，資料保全底線）
> - **留（另議）**：推播提醒（Cloud Messaging／LINE 官方帳號二擇一，另開議題）
> - **緩**：每月精華 PDF、語音默想、季節/節期活動
> - **冰箱**：小組功能、小組共讀、匿名群體鏡像、合作關卡（診斷非孤獨，社交向暫不解題）
>
> **2026-08-27 六角色評估拍板**（正本＝ADR 0001「2026-08-27 六角色評估拍板」節）：主菜＝三個 PR 依序——① 文案批＋自我約定＋AI 看裝備（本週）→ ② 焦點模式（8/28 儀式反應後）→ ③ 書卷詳情頁第二期（卷徽章／入袋試穿／稱號綁完走卷數／旅程故事）；之後等級階梯與「試煉」實驗。「乏味不是孤獨」降回待驗證；核心句改「本週幾人完成靈修」＋守門「其中幾人寫默想」。

> 已完成功能完整紀錄（v2.6～v2.16，含曠野呼聲 v2 各 Phase、B1 事件流、E1 個人資料）見 `docs/history/completed-features-log.md`。

**待開發**
- [x] **PR ①** 文案批＋自我約定＋AI 看裝備 ── 2026.08.28 上線
- [x] **PR ②** 焦點模式＋完成短畫面＋🔥出席燈 ── 2026.08.29 上線（PR #40；儀式曝光僅 2-3 人未等數據，James 8/29 拍板直接做）
- [x] 遊戲說明頁（tut-overlay）更新（issue #53，方案 B：六步驟訂正文案＋「更多功能」兩層、成就入口改分頁）── 2026-08-30 上正式站（PR #59/#60→dev、#61→main；併入 2026.08.30、不彈公告）。方案 C「精簡＋就地提示」經 pm-critic 否決（ADR 0003 否決紀錄）。順手：主畫面隱藏背景雲朵 `body.in-app .cloud`。
- [x] **PR ③** 書卷詳情頁第二期：③a 分頁「📖 今日靈修｜📚 書卷與成就」＋卷徽章＋裝備剪影（PR #48）、③b 稱號＝第五裝備部位、綁累計完走卷數 9 級（PR #49）── 2026.08.30 上線（James 8/30 拍板與創世記選項回補整段上，PR #55）。
  - ℹ️ 成就 overlay 已隨 ③a 退役：成就／書架／徽章唯一入口＝主頁「📚 書卷與成就」分頁，`openAchievements()` 僅為 `switchPage('books')` 別名；說明頁與文件不得再寫「成就視窗／點徽章」舊入口。
  - ❌ ③c「每卷專屬稱號／每卷真稀有」── **2026-08-29 James 拍板砍**：與 ③b 累計階梯重複，玩家完走一卷會拿兩個稱號、語意打架；用現有機制即可。每卷的專屬感交給 ③d。
  - ⏸ ③d 書卷完走儀式＋AI 旅程故事 ── **2026-08-30 James 擱置**：pm-critic 冷評估（年底前觸發者可能 <5 人、只看一次×AI fallback、choiceSelected 送 AI 隱私未定）＋靜態最小版模擬看過後「沒有很喜歡」。PR ③ 到 ③b 為止；BOOK_DETAIL_ENABLED 退役另議。
- [ ] 等級階梯（只解周邊）＋「試煉」實驗（PR ③ 後）
- [ ] 時段成就統計 UI（資料已在收集）──「併」：併入視覺成長主菜（2026-08-24）
- [ ] 介面美化（免費素材，可愛風，方向未定：像素vs插畫）──「併」：併入視覺成長主菜（2026-08-24）
- 🔴 ~~靈修日記 v2：前後比對功能（「X 天前的你寫了這些」）~~ ── **2026-06-05 PM 閘門判定不做**（diary 回看率 0-10%、僅 3 位頂層 power user 回看，「回看=陪伴」假設玩家行為不支持；除非訊號改變）
- [ ] localStorage 暫存默想 ── Firestore 寫入失敗時的最後一道防線（v3.0 候選）

**v3.0 候選短期（2026-04-28 盤點）**
- [~] 管理後台 ── ✅ admin web app 已部署（reply 回覆功能上線，2026-05-24，URL: `https://bible-game-admin.web.app`）；❌ SCHEDULE 管理仍未做
- [ ] Cloud Messaging 推播 ── 每日定時推「今日章節：羅 10」，遊戲內訂閱即可（可考慮取代或並行下方長期願景的「LINE 官方帳號每日推送」）──「留・另議」（2026-08-24）：管道二擇一另開議題
- [ ] 每月精華 PDF ── Cloud Function scheduled，月底把當月默想 + AI 回應整理寄給玩家，留存武器──「緩」（2026-08-24）

**v3.0 候選中期**
- [ ] 🧊 小組功能（「冰箱」2026-08-24）── `groups/{groupId}` 集合 + 邀請碼，「我們小組這週有 N 人靈修」（涵蓋下方「小組排行榜、朋友動態」）。**E1 已鋪底**：玩家 profile 的 groupName/district 欄位（v2.15）是小組功能的分眾資料前置
- [ ] 語音默想（「緩」2026-08-24）── Cloud Storage，對不擅打字的長者友善，可能解鎖目前完全沒在寫默想的族群
- [ ] 🧊 小組共讀模式（「冰箱」2026-08-24）── 兩人互相看默想，需具名授權（教會夫妻、同小組成員一起靈修場景）

**長期願景**
- [ ] ⬆️ 書卷完走儀式（「升」2026-08-24，從長期願景升為近期）── 專屬 overlay + 代表經文，新約終點儀式（PR #17）即原型
- [ ] 季節/節期活動（「緩」2026-08-24）（復活節、聖誕節限定）
- [ ] 小組排行榜、朋友動態（已被 v3.0 中期「小組功能」涵蓋）
- [ ] 🧊 合作關卡（「冰箱」2026-08-24）（需要即時系統）
- [ ] LINE 官方帳號每日推送靈修提醒（v3.0 短期 Cloud Messaging 為替代方案）
- 🔴 ~~個人成長報告（半年／一年，NLP 分析默想內容找重複主題）~~ ── **2026-06-05 PM 閘門判定不做**（同「靈修日記 v2」閘門：diary 回看訊號不支持，為 0-10% 回看率建 NLP 報告 = 建了沒人用陷阱；除非訊號改變）
- [ ] 🧊 匿名群體鏡像（「冰箱」2026-08-24）（「你的回應跟 X% 的玩家相同」，集合查詢產生共鳴）

---

## 分支策略

**`main` 分支 — 正式版**
- 對外公開；正式站網址、三站區分與終驗規則見本文件開頭「部署網址」正本
- 每次 commit 會立即反映到玩家看到的版本
- 只接受「已在 dev 測過、確認沒問題」的變更

**`dev` 分支 — 測試版**
- 內部測試用,不對玩家公開網址
- 新功能、重構、實驗性改動都先進 dev
- 預覽網址方案見下一節

**工作流程（2026-08-23 重訂，取代舊的 `--ff-only`／cherry-pick 流程）**
```
1. 所有工作（內容批次、功能、重構、文件）一律先進 dev：分支 → PR → dev
2. dev 預覽驗證：bash deploy.sh channel dev（Firebase preview）
3. 發布：dev → main 用 PR（GitHub 按鈕），main 永遠是 dev 的祖先；
   main 合完若多出 merge commit，立刻 git push origin main:dev 把 dev 對齊（或 PR 用 Rebase and merge）
4. 禁止再 cherry-pick 到 main、禁止直接在 main 改內容——任何只進 main 的 commit 都會讓兩邊再度分岔
```
- 2026-08-23 已把 2026-06-10（`7f07c4b`）以來 main 上 46 個 cherry-pick 影子 commit 反向合進 dev（`9162f65`，樹與 dev 相同、玩家零影響）；分岔研究與方案見 `docs/merge-plan-2026-08-23.md`。
- 每批內容發布（如 GEN11+）就是一次 dev→main PR；不要累積。A1 書卷詳情頁由 `BOOK_DETAIL_ENABLED` flag 控制逐卷開放，不用 feature branch 卡住。

**什麼變更可以緊急跳過 dev**
- 只有緊急 hotfix：修 main 後**同一天**把 main 合回 dev（`git merge origin/main` 進 dev），不得留著。
- 每日靈修內容**不再**直接進 main（2026-08-23 起走 dev→main PR，理由見上）。

---

## 預覽網址方案(dev 分支)

> 選型比較（Firebase preview channel／Cloudflare Pages／本機）見 `docs/history/preview-channel-options.md`；已拍板用 Firebase Hosting Preview Channels。

部署指令：`bash deploy.sh channel dev`（等同 `firebase hosting:channel:deploy dev --expires 30d`）。

**目前使用中的 dev 預覽網址**：
`https://bible-game-bcb84--dev-01luz2yz.web.app/bible-game-v2.html`
每次 channel deploy 自動延長 30 天（到期就再跑一次 deploy）

---

## 開發規範

**版本號規則**（2026-06-05 James 拍板改制為日期版號）
- 進正式版時，`GAME_VERSION` 設為「當天日期」，格式 `'2026.06.14'`（年.月.日、月日補零、無 `v` 前綴）。
- 不再分大小版次、不再判斷「內容更新還是機制更新」。版號 = 玩家那天拿到一次更新的標記，如此而已。
- 舊規則（內容更新 +0.1 / 機制更新 +1 整套大小版次）作廢。

**過渡註記**：`v2.16` 為最後一個語意版號，舊 changelog 條目原樣保留；日期制自其後第一個正式版起生效。

**每次進版必做動作**
1. `GAME_VERSION` 改為當天日期（格式 `'2026.06.14'`）。
2. 在 `bible-game-v2.html` 的 changelog HTML 加入新版本記錄（版號用日期）。
3. 更新 `VERSION_NOTES`（給玩家看的）── ★ **只列玩家可見項**（新功能／新內容）；後台修（如 CORS 修復／GA4 命名對齊／計時埋點等玩家看不到的）**不寫進去**。每條措辭都要對應到實際已實作功能，不列未實作項目。
4. `<title>`：已去版號、不再含版本字串，確認即可（不需改）。

**彈公告判準**（與版號脫鉤、獨立判斷）
- 玩家可感知的變化（新功能／新內容）→ `SUPPRESS_VERSION_POPUP = false`（彈公告）。
- 純後台修（CORS／GA4 命名／埋點／工具腳本等玩家看不到的）→ `SUPPRESS_VERSION_POPUP = true`（不彈）。
- 同一天已發過版、再補一批「不彈公告」的小改（2026-08-30 說明頁案例）：**不另開版號**，`GAME_VERSION` 與 VERSION_NOTES 維持當日既有版本（已看過公告的人不會再被彈），只在 changelog 該日條目下補一行。

**程式碼風格**
- 繁體中文介面
- CSS 變數統一使用 `:root` 定義的顏色
- 動畫統一用 `popIn` keyframe
- 所有 overlay 用 `openOverlay()` / `closeOverlay()` 控制

## 多步驟任務檢查點
每完成一個 Phase 或重要步驟，必須回報：
- 已完成：（列出做了什麼）
- 已驗證：（如何確認正確）
- 剩餘：（還有什麼沒做）

## 禁止隱性失敗
若有任何步驟跳過、不確定、或無法驗證，必須明確說明。
不得回報「完成」而實際有遺漏。
commit 前必須確認當前所在分支。

---

## 協作模式（2026-08-28 起：Claude Code 單一執行者，正本＝docs/adr/0003-single-executor.md）

- 原「5 個策略視窗＋CC 執行者」架構**全部退役**（內容生產 2026-08-24、其餘四個 2026-08-28）。James 只做拍板；策略推理、ADR、開 PR、部署都在 CC。
- **策略與執行分會話**（`/rename` 標名），不混在同一對話。
- **重大決策前跑冷評估**：新功能／上正式版／殺併留，先開不帶當前上下文的 subagent 扮 PM 反方，輸出反對意見後 James 再拍板。
- **上正式版、`firebase deploy`、改 schema 一律單獨明確確認**，不在策略聊天中順口帶過。
- 被否決的提案寫進 ADR 0003「否決紀錄」；James 的顧慮與判斷寫進 memory。
- 交接卡已歸檔 `docs/history/*-handover-2026-08.md`；`roles/*.md` 留作未來 subagent 定義材料。**已改寫**：數據分析 → `.claude/agents/data-analyst.md`（2026-08-28，指標對齊 ADR 0001、兼口徑守門）；其餘尚未。claude.ai 知識庫同步停做。

---

## 戰略對焦（2026-08-24 拍板，正本＝docs/adr/0001-refocus-2026-08.md）

- **現階段目的＝「重新點燃」**：James 本人與週活躍核心（12-15 人）優先；流失玩家暫緩（召回牌只能打一次）。
- **乏味診斷**：流程可預期＋內容同質＋進度失去意義。**不是孤獨** → 社交類功能冰箱。
- **視覺成長三原則**：出席驅動（絕不評默想品質／字數）、雙層節奏（每日微變＋里程碑大變身）、累計成就不因 streak 中斷歸零。研究依據：`docs/research-progression-visuals.md`。
- **書架**：創世記接在新約後面（走到哪讀到哪），不做新舊約分區；教會進度綁定不變。
- **視野**：到 2026 年底；2027 視教會下一年計畫再定。
- **核心指標（「北極星」一詞退役）**：白話核心句「**本週有幾個人完成靈修**」（2026-08-27 改雙層）＋守門（其中幾人寫默想＋平均字數不掉、連續 4 週未出現的人名、曾 100+ 章者標記）；看月趨勢與人名清單，不當成長曲線讀。依據：`docs/research-north-star-metric.md`。
- **內容產線＝CC 一條龍**（2026-08-24 拍板，正本＝docs/adr/0002-content-pipeline.md）：CC 生成＋CUNP1 逐句驗經文（`npm run verify:scripture`）→寫入＋dev 預覽＋PR；James 每週喊「出下週內容」後手機審稿；內容生產視窗退役（留檔不刪）。**模型分級**：平常章 Sonnet 寫、雷區章與主編審查用高階模型、腳本護欄不分模型。
- 主菜已於 2026-08-27 定案（ADR 0001）；未定案（畢業休眠模式、多視窗其餘收斂）詳見 ADR 0001「尚未定案」節，勿當已決；待辦殺併留已於 2026-08-24 拍板（見「近期待開發功能」定案區塊）。
- 歷史 why 補寫（v2.11 三項：合併日雙章、v2 按完整度上線、Phase B 漸進釋出）：掛起、優先度低；機制描述已在各對應段落，緣由若需要看 git log 與 ADR。

---

## 開發團隊

- **James**（st00777）：專案發起人，靈修內容方向，小組需求收集
- **共同開發者**：遊戲設計發想，測試，新功能提案

**使用工具**：Claude（對話討論）、Claude Code（程式修改）、GitHub Pages（部署）

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Skills 指令速查

mattpocock-skills 各指令的用途與分類（中文），所有視窗共用。見 `docs/agents/skills-guide.md`。
