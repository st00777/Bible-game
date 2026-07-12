# 靈修冒險遊戲 · 專案記憶文件
> 給 Claude Code、Claude AI Project 和共同開發者閱讀的專案說明
> 最後更新：2026-06-05

---

## 專案基本資訊

**專案名稱**：靈修冒險（Bible Devotional Game）
**部署網址**：`st00777.github.io/Bible-game/bible-game-v2.html`
**GitHub Repo**：`github.com/st00777/Bible-game`
**目前版本**：v2.16（2026-06-14 上線；情緒2.0 心情選擇器、mood-aware AI 默想回應、新內容 COL/TH/TIM、合併日雙章選讀。前一版 v2.15（2026-05-28）：B1 事件流 timeline `users/{uid}/events` 雙寫 GA4+Firestore、E1 個人資料入口 ⋯選單分眾 5 欄位）

**核心定位**：
針對大光教會成人查經班的每日靈修輔助遊戲。
不是取代靈修，而是輔助靈修——建議玩家先讀完當天經文再來玩。

---

## 檔案結構

```
Bible-game/
├── bible-game-v2.html             # 遊戲主體（機制、介面、邏輯）
├── content.js                     # 靈修內容（每週更新這個）
├── CLAUDE.md                      # 本文件 — 專案記憶
├── design-principles.md           # 情緒／默想類功能設計紅線（我們不做什麼），與 CLAUDE.md 並列
├── LEARNING.md                    # 開發學習筆記（踩坑紀錄）
├── claude-code-agent-prompts.md   # 內容生成 prompts + 審查清單
├── README.md                      # GitHub 說明頁
├── firebase.json                  # Firebase 設定（Functions/Firestore/Hosting）
├── firestore.rules                # Firestore 安全規則
├── functions/index.js             # Cloud Functions（lineLogin, aiReflection, autoCloseInactiveThreads）
├── scripts/_shared.js             # 共用：PROJECT 常數 + OAuth token + Cloud Logging 抓取
├── scripts/analyze-feedback.js    # Firestore 數據分析（npm run analyze）
├── scripts/check-ai-logs.js       # aiReflection 呼叫量／成功率（npm run logs）
├── scripts/check-line-logs.js     # lineLogin 成功率／失敗分布（npm run line-logs）
├── scripts/list-profiles.js       # 列玩家 profile/data（含 E1 分眾欄位）
├── scripts/migrate-feedback-v2.js # 曠野呼聲 v1→v2 schema 一次性 migration
├── scripts/verify-b1-events.js    # B1 事件流落地驗證（列 uid events + 9 事件覆蓋）
├── scripts/ga4-insights.js        # GA4 深度指標（npm run ga4，用 SA 金鑰打 Data API）
└── package.json                   # npm scripts
```

**重要原則**：
- 每次更新靈修內容只需修改 `content.js`
- `bible-game-v2.html` 只在機制或介面有改動時才動
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
**追蹤**：Google Analytics GA4（measurement ID `G-HZ3EGYB8BB`；Data API 用的 property ID 是 `534159832`，純數字、在 GA4 屬性設定找）
**數據分析**：
- `npm run analyze` ── Firestore 6 區塊報告（feedback / users / 靈修進度 / 成就 / 章節品質 ①-④ / 裝備 ⑤ / 默想歷史 ⑥）
- `npm run logs [天數]` ── aiReflection 呼叫量、AI 真實回應比、錯誤類型分布（預設過去 1 天）
- `npm run line-logs [天數]` ── lineLogin 成功率、HTTP 失敗分布、錯誤類型、失敗時段（預設過去 1 天）
- `npm run ga4` ── GA4 深度指標：活躍規模 MAU(30天)/WAU(7天)/DAU(昨天)、9 核心事件觸發人數、週 cohort 留存（對齊 data-insights 口徑）

前三支用 Firebase CLI refresh token 直接打 Cloud REST API；`npm run ga4` 改用 service account 金鑰（`ga4-key.json`，屬性檢視者權限）+ 純 Node crypto 簽 JWT 換 token 打 GA4 Data API。四支都不需額外安裝 SDK。

> **GA4 SA 權限怎麼來的**（2026-06-01）：GA4 網頁「資源存取權管理」加 service account 會跳「與帳戶不符」加不進去（已知卡點）。改用管理員 OAuth + Admin API `createAccessBinding` 從程式端加成「檢視者」。`ga4-key.json`（SA 金鑰）與 `token.json`（OAuth 授權）都已 gitignore、絕不進 git。

---

## 後端架構

### Firestore 資料結構

```
users/{userId}/                          ← 主文件（進度同步）
  completed:  { "ACT10": "2026-04-01" } // 已完成章節（章節key → 完成日期）
  streak:     3                          // 連續天數
  items:      [ { emoji, name, desc, slot, chapter }, ... ]
  hat / body / item / bg                 // 目前穿戴裝備
  level / xp                             // 等級與經驗值
  name / gender / setup                  // 玩家設定
  updatedAt:  Timestamp

users/{userId}/profile/data              ← 玩家基本資料
  firstLoginAt: Timestamp                // 第一次登入時間（只寫一次）
  lastLoginAt:  Timestamp                // 每次登入更新
  loginMethod:  'google' | 'line'
  lineDisplayName: '...'             // LINE 顯示名稱（LINE 登入才有）
  linePictureUrl:  '...'             // LINE 頭像網址（LINE 登入才有）
  totalDays:    12                       // 累計靈修天數（非連續）
  // E1 分眾欄位（v2.15，⋯選單「個人資料」入口；每欄可留空、之後可改）
  ageGroup:      '...'                   // 年齡層
  churchKey:     '...'                   // 教會所屬
  district:      '...'                   // 牧區（W23 人工求助轉介會直接讀取，存乾淨字串）
  groupName:     '...'                   // 小組（同上，W23 轉介用）
  devotionHabit: '...'                   // 靈修習慣

users/{userId}/chapters/{chapterKey}     ← 每章完成記錄（如 ACT10, ROM1）
  date:           "2026-04-01"           // 完成日期
  completedAt:    Timestamp              // 完整完成時間戳記
  timeOfDay:      'morning'              // 時段（morning/afternoon/evening/night）
  choiceSelected: 'A'                    // 玩家選的選項
  hasReflection:  true                   // 是否填寫默想
  hasRead:        false                  // 是否點閱讀完整章節
  reflectionText: '...'                  // 玩家寫的默想文字（v2.9 新增）
  aiResponse:     '...'                  // Gemini 2.5 Flash 的 AI 回應（v2.9 新增）
  aiIsFallback:   false                  // AI 是否回 fallback（v2.9.x，2026-04-29 新增）
  mood:           '今天還不錯/想要一點力量/...'  // 情緒2.0 起點心情（v2.16 新增；玩家本人回顧用，null＝「先不說」時不寫此欄）
  // 注意：本文件用 .set() 寫入會覆蓋；保留最後一次默想用，歷史請查 reflections 子集合

users/{userId}/chapters/{chapterKey}/reflections/{timestampId}   ← 默想歷史（v2.9.x 新增）
  reflectionText: '...'                  // 該次寫的默想文字
  aiResponse:     '...'                  // 該次 AI 回應
  aiIsFallback:   false                  // AI 是否回 fallback（v2.9.x，2026-04-29 新增）
  completedAt:    Timestamp              // 此次寫入時間
  // doc id 用 Date.now() 字串，以時間排序；玩家每次完成靈修並寫默想都會新增一筆，不會覆蓋

users/{userId}/stats/data                ← 累計統計
  totalDays:       12                    // 累計完成天數
  reflectionCount: 8                     // 累計填寫默想次數
  readCount:       5                     // 累計點閱讀完整章節次數
  shareCount:      3                     // 累計分享次數
  makeupCount:     2                     // 累計補讀次數（日期已過才完成）
  morningCount:    4                     // 清晨靈修次數（05:00-08:59）
  nightCount:      1                     // 深夜靈修次數（22:00-04:59）

users/{userId}/achievements/data         ← 成就系統（已實作）
  unlockedAt: { 'first_step': '2026-04-25T...' }  // 成就key → 解鎖時間
  progress:   {}                         // 成就進度數值（成就key → number）

users/{userId}/events/{eventId}          ← B1 事件流 timeline（v2.15 已上線）
  type:       'chapter_select'           // 9 核心事件之一（見下「事件流設計方案」）
  ts:         Timestamp                  // serverTimestamp
  sessionId:  'uuid'                      // crypto.randomUUID；hidden>30min 換新
  chapter:    'ROM10'                    // optional，跟章節有關才填
  metadata:   { isFallback: false, choice: 'D', editDuration: 145 }  // optional，事件相依欄位
  // doc id 用 ${Date.now()}-${random4}；fire-and-forget、訪客（未登入）不寫
  // track() helper（bible-game-v2.html）雙寫 GA4 + 此子集合；驗證見 scripts/verify-b1-events.js

feedback/{docId}                         ← 曠野呼聲回饋（頂層集合）
  mood:        '平靜/有動力/有點累/經文太難/其他'
  category:    '靈性感受/遊戲體驗/我的異象/其他'
  message:     '文字內容（最多300字）'
  isAnonymous: true/false
  uid:         '登入用戶的uid或null（訪客為null）'
  displayName: '登入用戶的名稱或null'
  createdAt:   Timestamp
  chapter:     '當天章節key或null'
  // v2 多輪對話欄位（2026-05-05 Phase 1 加入）
  wantReply:      true/false              // 玩家勾選「希望收到回覆」；isAnonymous=true 時強制 false
  status:         'new' | 'awaiting_admin' | 'awaiting_player' | 'closed'
  lastMessageAt:  Timestamp               // 最後訊息時間，後台排序用
  unreadByPlayer: true/false              // 玩家有未讀
  unreadByAdmin:  true/false              // admin 有未讀
  messageCount:   number                  // 快取總訊息數

feedback/{docId}/messages/{msgId}        ← v2 多輪對話子集合（2026-05-05 加入）
  role:        'player' | 'admin'
  text:        '訊息內容（≤300 字）'
  createdAt:   Timestamp
  authorUid:   string
  authorType:  'human' | 'ai'             // 預留給 Claude Cowork 自動回覆
```

**時段定義**：
- `morning`：05:00–11:59
- `afternoon`：12:00–17:59
- `evening`：18:00–21:59
- `night`：22:00–04:59（清晨統計用 05:00–08:59）

### 安全規則

每個玩家只能讀寫自己的資料；feedback 集合 read 限制 owner 或 admin（2026-05-01 修正）：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email in ['st00777@hotmail.com'];
    }
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /feedback/{docId} {
      allow write: if request.resource.data.keys().hasOnly([...])
                && request.resource.data.message.size() <= 300
                && ...;
      // 玩家只能讀自己的（uid 比對，匿名留言 uid=null 永遠讀不到）；admin 可讀所有
      allow read: if request.auth != null
                && (resource.data.uid == request.auth.uid || isAdmin());
    }
  }
}
```
完整規則見 `firestore.rules`。

**Admin 機制**：目前用 Google email 白名單（`st00777@hotmail.com`）。新增 admin 直接改 `isAdmin()` 函式 + 重新部署 `firebase deploy --only firestore:rules`。

**Read rule 修正歷史**（2026-05-01）：原本 `allow read: if request.auth != null` 太寬，任何登入玩家可讀所有人的 feedback ── 配合 v2 我的留言功能修正。

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
- **失敗處理**（2026-04-28 加入，2026-04-30 升級，2026-05-11 retry 升級）：Gemini 回 503 過載時最多重試 3 次，每次等待 1-2 秒（1.5±0.5 jitter，避免群體同時重試撞牆）；其餘錯誤回傳 fallback 文字「謝謝你願意把心裡的話帶到神面前。祂看見了。」（玩家不會看到錯誤，只是少了個性化回應）
- 監控：`npm run logs` 看當天呼叫成功率，目標 90% 以上；若 fallback 持續 >10% 考慮加 Gemini Pro 備援，或調整 generationConfig（譬如降 maxOutputTokens / temperature 讓回應更快、減少超時觸發）

**autoCloseInactiveThreads**（us-central1，2nd Gen）
- 功能：30 天無新訊息的曠野呼聲 thread 自動標記 `status='closed'`（每日排程掃描，cron `0 4 * * *` Asia/Taipei）
- 部署：2026-05-24（v2.14 上線時部署到 production）

---

**content.js 結構**：
```javascript
const GAME_VERSION = '2.16';        // 版本號
const VERSION_NOTES = [...];       // 更新摘要（顯示在彈窗）
const SCHEDULE = {...};            // 日期→章節對應表
const BIBLE_LINKS = {...};         // Bible.com 連結
const CHAPTERS = [...];            // 每日靈修內容陣列
```

---

## 讀經進度對應（大光教會2026）

教會從2026年元旦開始，依序讀新約，偶爾有一天兩章的情況。

**已建入的進度（4月）**：
```
4/01 徒10  4/02 徒11  4/03 徒12  4/04 徒13
4/05 徒14+15（取14）  4/06 徒16
4/07 徒17  4/08 徒18  4/09 徒19  4/10 徒20
4/11 徒21  4/12 徒22  4/13 徒23  4/14 徒24
4/15 徒25  4/16 徒26  4/17 徒27+28（取27）
4/18 羅1   4/19 羅2   4/20 羅3   4/21 羅4
4/22 羅5   4/23 羅6   4/24 羅7   4/25 羅8
4/26 羅9   4/27 羅10  4/28 羅11+12（取12）
4/29 羅13  4/30 羅14
```

**已建入的進度（5月）**：
```
5/01 羅15  5/02 羅16  5/03 林前1  5/04 林前2
5/05 林前3  5/06 林前4  5/07 林前5
5/08 林前6  5/09 林前7  5/10 林前8+9（取9）  5/11 林前10
5/12 林前11  5/13 林前12  5/14 林前13  5/15 林前14
5/16 林前15  5/17 林前16
```

**待建入的進度（5月下旬～7月）**：
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
- 創世記：GEN1 ~ GEN50（8-9 月排到 GEN36，其餘 10 月續）
  ※ 約翰書信用 JN 前綴，預留「約翰福音」未來用 JHN，避免撞號。

**合併章節（11 處）**：
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

**⚠️ 上線前提醒（8-9 月排程相關）**：
- **彼得後書補第 3 章**：BOOKS 的 PE2 需 `totalChapters` 2→3、entries 加 `'PE2_3'`。此結構改動須與彼後內容**同批上 dev**，不可單獨先上（避免玩家看到「🔜 內容更新中」的空章）。
- ⚠️ **創世記為本遊戲第一本「舊約」書卷**（在此之前全為新約）：書架分區、書卷排序、OT/NT 呈現方式需設計決策，**尚未定案**，先記為待辦。

**更新節奏**：每週一更新下下週內容，確保玩家永遠有一週緩衝。

**合併章節處理原則**（2026-05-11 v2.11 翻轉）：
- **雙章完整呈現**：合併日的兩章都要寫情境題、默想、裝備，缺一不可。
- **SCHEDULE 統一陣列格式**：`'YYYY-MM-DD': ['章節1', '章節2', ...]`，單章日 length=1、合併日 length>=2。
- **雙入口 UI 玩家自選**：日曆點該日進「合併日選擇頁」，玩家選要先讀哪一章。
- **任一章完成即算今日有靈修**：streak 計算只 +1（不論玩家當天完成幾章），避免合併日 streak 灌水。
- **兩章各自獨立獎勵**：完成每章都領基本 + 稀有裝備、各自寫默想。
- **書卷統計依實際章節數**：BOOKS.entries 完整列出所有章節（含合併日的兩章），廢除 merged 倍數機制；其他尚未補章節物件的書卷暫保留 mergedActive flag 過渡。

### Phase B 漸進釋出策略

合併日雙章機制按書卷漸進切換，每書卷獨立 Phase B-X，依「章節物件 + entries 都備齊」原則上線。**戰略意涵待 PM 視窗補。**

- **Phase A**（v2.11 已上線）：5/22 雙入口 UI 框架 + getBookProgress 雙模式分流 + SCHEDULE 陣列結構 + day-info-bar 合併日雙卡。
- **Phase B 各書卷切換進度**：
  - **B-林後** ✅ 完成（v2.11）：COR2_6 章節物件 + entries 補入 + `mergedActive: false`，13/13 完走判定。
  - **B-加拉太** ⏳ 6/03 死線：缺 GAL5 章節物件。entries 補入後切 `mergedActive: false`。
  - **B-羅馬** ⏳ 待做：缺 ROM11 章節物件（4/28 合併日另一章）。
  - **B-林前** ⏳ 待做：缺 COR1_8 章節物件（5/10 合併日另一章）。
  - **B-使徒** ⏳ 待做：缺 ACT15（4/05）+ ACT28（4/17）兩個章節物件。
- **Phase C 歷史補做**：6/04 起書卷尚未開工。COL（西1+2，6/14）、TIM1（提前2+3，6/26）、HEB（來1+2，7/08）三個合併日需先建立整書卷的章節物件與 SCHEDULE 排程，才能 Phase B 切換。

**三條指導原則**：
1. **章節物件與 entries 同 PR 上**：避免「entries 補了但 CHAPTERS 沒對應章節」造成日曆顯示為「🔜 內容更新中」。
2. **任何 Phase 切換都不能讓現有玩家的書卷進度回退**：library_1 / library_3 成就的 `unlockedAchievements` 跳過重算保護是首道防線；新邏輯算出 < total 不會抹掉已解鎖徽章，但書卷頁進度條會降級顯示，需要在 PR 中確認該書卷 entries 已補滿。
3. **切換前先在 dev 驗證書卷統計正確**：跑 dev preview channel，用測試帳號完成該書卷所有章節，確認書架顯示「N/N 完走」、library_1/library_3 觸發解鎖。

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
2. 四個選項涵蓋不同的信仰成熟度與誠實程度
3. 至少一個選項給「老實說我做不到」的人
4. 回應溫暖有洞見，像朋友同行，不說教
5. 每個回應最後留下「一個情緒有重量的小步」——真實的人會說出口的話，不是「想一想」，而是一句可以真實說出口的話，或一個有方向感的問題

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

**① 每日經文顯示方式**
- 現況：只顯示一節金句
- 討論中：是否改為顯示重點段落
- 核心問題：玩家是「讀完聖經再來玩」還是「用遊戲代替讀經」？
- 狀態：待James與開發者討論後決定

**② 先讀經文提醒** ✅ 已完成
- 已透過步驟式流程實作（v2.5 導讀系統 + v2.6 閱讀勳章 +15 XP）
- 步驟2「📖 閱讀完整章節」內含鼓勵文字、Bible.com 連結、閱讀時間、完成勳章
- 不需要額外彈窗，內嵌步驟比彈窗更自然、不打擾

---

## 數據觀察基準（2026-04-27 snapshot）

> 此區是當下狀態快照，非永久事實 ── 後續用 `npm run analyze` / `npm run logs` 重抓。
> ⚠️ **這是 4/27 的歷史快照，數字已過時**（截至 5 月底 Auth 端已破百、101 user）。最新數據以 `data-insights.md`（持續更新）為準，本段保留作時間錨點、不再回頭改數字。

**玩家規模**
- 註冊 46 人（Google 10 / LINE 36；LINE 佔 78%）
- 已建角色 42 人
- 持續活躍（建立日 ≠ 最後登入日）10 人
- v2.9 上線當日（4/27）新增 7 人，前一日（4/26）8 人

**靈修行為**
- 累計完成 128 天靈修
- 默想填寫率 **95%**（121/128）── 玩家寫默想意願極高，這是產品核心信號
- 完整閱讀章節率 55%（70/128）
- 時段分布：深夜 22:00-05:00 = 69 次（最熱），日間 42 次，清晨 17 次

**AI 服務指標（2026-04-28 retry 部署前）**
- 24 小時內 36 次呼叫，成功 27（75%）／ fallback 9（25%），全部都是 Gemini 503 過載
- 503 集中在玩家深夜活躍時段（22:00-23:00 二十分鐘 5 次）
- retry 部署後預期 90%+，待 24 小時後重抓 `npm run logs` 驗證

**章節完成榜（前 5）**
- ROM4 / ROM10 並列 14 人，ROM3 / ROM6 / ROM9 各 13 人
- 使徒行傳前段（ACT22-24）只有 5 人 ── 玩家後加入、補讀不完整

**玩家代表性回饋**
- 「這遊戲式的讀經非常棒，好期待未來持續開發新功能（最期待戰鬥…）」
- 「這種方式的靈修很有趣！會讓我想推薦給其他人」
- 「看到這個一點點進步，真的很用心」

---

## 資料缺漏盤點（2026-04-28 全面盤點）

> **「資料已有」**：Firestore 已紀錄，只缺分析腳本即可呈現
> **「需新增」**：需修改 client / function 才能開始紀錄
> 估時 = 單純實作工程量，不含設計討論與測試

### A 級 ── 影響當下產品決策

| 項目 | 現況 | 估時 | 依賴 |
|---|---|---|---|
| **AI 呼叫綁 uid** ── functions logs 加入玩家身份，bug 可重現 | ✅ 已完成（functions/index.js:148-176，client 傳 uid） | — | — |
| **客戶端錯誤事件追蹤** ── AI fallback、Firestore 寫入失敗、登入超時 | 需新增 | 2-3 小時（獨立做）／30 分鐘（搭事件流） | 建議搭事件流 |
| **放棄事件流失分析** ── 玩家停在哪步（讀經文／情境題／默想） | 需新增 | 1-2 小時（獨立）／可從事件流推導 | 建議搭事件流 |
| **AI 失敗後玩家後續行為** ── 拿 fallback 後是再送還是放棄 | 需新增 | 1 小時（獨立）／可從事件流推導 | 建議搭事件流 |
| **章節完成 vs 默想填寫關聯** ── 142 完成 - 134 默想 = 8 次缺寫，是哪些人？ | ✅ 已加入 `npm run analyze` 區塊 ①（2026-04-28） | — | — |
| **事件流 session timeline** | ✅ 已上線（W22 B1，v2.15，2026-05-28）：`users/{uid}/events` 雙寫 GA4+Firestore、9 核心事件、訪客不記；落地驗證通過（scripts/verify-b1-events.js） | — | 已是骨幹，下方 3 項可開始推導 |
| **默想歷史保留** | ✅ 已完成 (2026-04-28) | — | — |

### B 級 ── 中期有用

| 項目 | 現況 | 估時 |
|---|---|---|
| 章節停留時長（dwell time） | 需新增 | 1 小時（依賴事件流） |
| 選項猶豫軌跡（選 A 又改 C） | 需新增 | 1 小時 |
| 默想字數分布／編輯時長 | ✅ 字數分布 `npm run analyze` 區塊 ⑥（2026-05-01）；✅ 編輯時長 `editDuration` 2026-06-03（commit 25e1ef7）已加入 `reflection_submit` metadata（dev，未升版） | — |
| 重複登入計數（同日進遊戲幾次） | 需新增 | 15 分鐘（profile/data 加 sessionCount counter） |
| 完成靈修後逗留行為 | 需新增 | 1 小時（依賴事件流） |
| 裝備換裝行為時點 | 需新增 | 30 分鐘 |

### C 級 ── 長期累積

| 項目 | 現況 | 估時 |
|---|---|---|
| 頁面跳轉路徑 | 需新增 | 1-2 小時（依賴事件流） |
| 登入失敗／中斷（client 端取消授權、網路斷） | 🟡 server 端 lineLogin 已加入 `npm run line-logs`（2026-05-01）；client 端取消／網路斷仍看不到 | 30 分鐘（client） |
| 部署事件影響（哪天部署什麼導致什麼變化） | **資料已有**（git tag + GA4 timestamp） | 0 小時 |

### 內容品質維度

| 項目 | 現況 | 估時 |
|---|---|---|
| 情境題選項分布（哪個選項最多／最少人選） | ✅ 已加入 `npm run analyze` 區塊 ②（2026-04-28） | — |
| AI 回應停留時間 | 需新增 | 30 分鐘（dwell time 子項） |
| 章節參與深度（哪些 reflectionTitle 引發較多默想） | ✅ 已加入 `npm run analyze` 區塊 ③（2026-04-28） | — |
| AI 回應品質（fallback 集中章節） | ✅ 已加入 `npm run analyze` 區塊 ④（2026-04-28，盤點外加碼） | — |
| AI fallback 顯式標記（aiIsFallback 欄位，取代文字比對） | ✅ 已實作（2026-04-29）── aiReflection 回傳 isFallback；client 寫入 chapter doc 與 reflections 子集合；analyze 區塊 ④ 優先讀欄位、舊資料 fallback 到文字比對 | — |
| 裝備收集偏好 | ✅ 已加入 `npm run analyze` 區塊 ⑤（2026-04-28） | — |

### 管理面

| 項目 | 現況 | 估時 |
|---|---|---|
| API 成本累計（Gemini、Cloud Function 費用） | 已有（GCP billing） | 0 小時／1-2 小時做 in-game admin |
| A/B 測試基礎建設（Remote Config 分組） | 需新增 | 1 個工作天 |

### 推薦施工順序（最大 ROI 優先）

1. **AI 呼叫綁 uid**（30 分鐘）── 立即解鎖 bug 重現能力，呼應 Tian天湉那種具體回報
2. **「資料已有但缺分析」一次補完**（半天-1 天）── 章節 vs 默想關聯、選項分布、章節參與、裝備偏好。零 client 改動就有產出
3. **事件流 session timeline**（3-5 小時）── A 級資料骨幹，做了之後客戶端錯誤、放棄事件、AI 失敗行為、dwell time 都能在這個 collection 上推導
4. **客戶端錯誤事件**（30 分鐘 if 搭事件流）+ **放棄事件分析**（推導）+ **AI 失敗後行為**（推導）── 一次完成
5. **B 級散件**（共約 4-5 小時）── 重複登入、默想字數、選項猶豫、裝備換裝
6. **內容品質的 dwell time 補完**（30 分鐘）
7. **C 級散件**（2-3 小時）── 登入失敗、頁面跳轉
8. **A/B 測試基礎建設**（1 天）── 有實驗需求再做，無需提前

**全部做完估計 ≈ 3-4 個工作天**（純工程，不含設計、測試、文件）。

**最小可行投資**：步驟 1+2+3 ≈ **1.5-2 個工作天**，能解決 80% 的數據盲點。

### 事件流設計方案（2026-04-28 通過 → ✅ 已於 W22 B1 實作上線，v2.15）

> ✅ **此方案已實作落地**（2026-05-28，B1）：玩家數於 5 月底破百（Auth 端 101 user）觸發、按本方案上線。
> 下方為原始設計骨幹，保留作為實作依據與欄位規格參照。實際實作見 bible-game-v2.html 的 `track()` / `writeEventToFirestore()`。

**Collection 結構**：`users/{uid}/events/{eventId}`（重用既有 `users/{userId}/{document=**}` 安全規則，無需修改 firestore.rules）

**核心事件 9 種**（必紀錄，靈修主流程必經）：
```
app_open               進入遊戲
chapter_select         選了章節
read_verse_view        看到金句
question_view          看到情境題
choice_confirm         第二下確認選了某選項
reflection_submit      送出默想
ai_response_received   收到 AI 回應（含 isFallback 標記）
complete_devotional    領裝備
app_leave              離開（visibilitychange hidden）
```

**次要事件 7 種**（行為觀察用，可分批加）：
```
read_full_chapter_click / choice_first_tap / reflection_focus
equipment_change / diary_open / chapter_share / feedback_submit
```

**Document 結構**：
```js
{
  type: 'reflection_submit',
  ts: serverTimestamp(),
  sessionId: 'abc123',                   // 前端 uuid，同 session 共用
  chapter: 'ROM10',                      // optional，跟章節有關時填
  metadata: { textLength: 87, editDuration: 145, isFallback: false }
}
```
- doc id 用 `${Date.now()}-${random4}` 避免同毫秒衝突
- uid 不存進 document（已在 path）

**寫入策略**：
- fire-and-forget（不 await，不擋 UI）
- 失敗 `console.warn` 不影響玩家流程
- **訪客（未登入）不記錄** ── 保持簡單，未來要追訪客再設計 deviceId

**Session 識別**：`app_open` 時 `generateUUID()`，存記憶體；`visibilitychange` 進 hidden 超過 30 分鐘換新 sessionId

**資料保留**：先永久，一年後若 collection 過大再寫 cleanup function 砍 90 天前資料

**成本估算**：50 玩家規模 ~45,000 events/月 ≈ $0.10/月（免費額度內）

**實作步驟**（啟動後預估 3-5 小時）：
1. 寫 `track(type, metadata)` helper + sessionId 管理（30 min）
2. 9 個核心事件對應位置插入呼叫（2-3 hr）
3. 擴充 `npm run analyze` 加漏斗分析區塊（30 min）
4. 部署 + 自測（30 min）

---

## 近期待開發功能

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

**待開發**
- [ ] 時段成就統計 UI（資料已在收集）
- [ ] 介面美化（免費素材，可愛風，方向未定：像素vs插畫）
- 🔴 ~~靈修日記 v2：前後比對功能（「X 天前的你寫了這些」）~~ ── **2026-06-05 PM 閘門判定不做**（diary 回看率 0-10%、僅 3 位頂層 power user 回看，「回看=陪伴」假設玩家行為不支持；除非訊號改變）
- [ ] localStorage 暫存默想 ── Firestore 寫入失敗時的最後一道防線（v3.0 候選）
- [ ] 6月起加拉太書～提多書內容

**v3.0 候選短期（2026-04-28 盤點）**
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
- [~] 管理後台 ── ✅ admin web app 已部署（reply 回覆功能上線，2026-05-24，URL: `https://bible-game-admin.web.app`）；❌ SCHEDULE 管理仍未做
- [ ] Cloud Messaging 推播 ── 每日定時推「今日章節：羅 10」，遊戲內訂閱即可（可考慮取代或並行下方長期願景的「LINE 官方帳號每日推送」）
- [ ] 每月精華 PDF ── Cloud Function scheduled，月底把當月默想 + AI 回應整理寄給玩家，留存武器

**v3.0 候選中期**
- [x] **事件流 session timeline** ✅ 已上線（W22 B1，v2.15，2026-05-28）── 玩家數破百觸發、按設計方案實作；解鎖客戶端錯誤、放棄事件、AI 失敗行為、dwell time 等分析的資料骨幹已就位（下一步：擴 `npm run analyze` 漏斗區塊 + 客戶端錯誤事件 30 分鐘加掛）
- [ ] 小組功能 ── `groups/{groupId}` 集合 + 邀請碼，「我們小組這週有 N 人靈修」（涵蓋下方「小組排行榜、朋友動態」）。**E1 已鋪底**：玩家 profile 的 groupName/district 欄位（v2.15）是小組功能的分眾資料前置
- [ ] 語音默想 ── Cloud Storage，對不擅打字的長者友善，可能解鎖目前完全沒在寫默想的族群
- [ ] 小組共讀模式 ── 兩人互相看默想，需具名授權（教會夫妻、同小組成員一起靈修場景）

**長期願景**
- [ ] 書卷完走儀式（Phase 3，專屬 overlay + 代表經文）
- [ ] 季節/節期活動（復活節、聖誕節限定）
- [ ] 小組排行榜、朋友動態（已被 v3.0 中期「小組功能」涵蓋）
- [ ] 合作關卡（需要即時系統）
- [ ] LINE 官方帳號每日推送靈修提醒（v3.0 短期 Cloud Messaging 為替代方案）
- 🔴 ~~個人成長報告（半年／一年，NLP 分析默想內容找重複主題）~~ ── **2026-06-05 PM 閘門判定不做**（同「靈修日記 v2」閘門：diary 回看訊號不支持，為 0-10% 回看率建 NLP 報告 = 建了沒人用陷阱；除非訊號改變）
- [ ] 匿名群體鏡像（「你的回應跟 X% 的玩家相同」，集合查詢產生共鳴）

---

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

---

## 分支策略

**`main` 分支 — 正式版**
- 對外公開,部署在 `https://st00777.github.io/Bible-game/bible-game-v2.html`
- 每次 commit 會立即反映到玩家看到的版本
- 只接受「已在 dev 測過、確認沒問題」的變更

**`dev` 分支 — 測試版**
- 內部測試用,不對玩家公開網址
- 新功能、重構、實驗性改動都先進 dev
- 預覽網址方案見下一節

**工作流程**
```
1. 從 main 切出(或 rebase)dev:  git checkout dev && git rebase main
2. 在 dev 開發 + 推到遠端觀察預覽:git push origin dev
3. 確認 OK 後 fast-forward merge 回 main:
     git checkout main && git merge --ff-only dev && git push
4. 上線後若要繼續開發,dev 重新 rebase 到 main
```

**⚠️ 實際流程與理想脫節（2026-05-11 補註）**
- 上面是理想流程，但實際 dev 已長期累積（曠野呼聲 v2 Phase 1-3B 跨數週），與 main 分叉超過 15 個 commit，`--ff-only` 已不適用。
- 最近三次 main 合併（commit `3339fc4` 5/4 release、`2ab2514` v2.10 release、`3bd073d` v2.11 release）都改用 **non-ff merge commit**（`git merge dev --no-ff -m "..."`），讓 dev 的歷史完整保留、main 有清楚的「release commit」標記。
- **教訓**：dev 應該每完成一個 Phase 就回流 main（merge 或 rebase），長期 feature branch 是反模式——分叉越久，merge 風險越高、回滾範圍越大。
- **目前建議流程**：dev 完成一批可上線的工作 → 跑 dev preview channel 驗證 → main merge dev --no-ff（含 release notes 的 message）→ push → 部署 functions（若有改）。

**什麼變更可以直接進 main(跳過 dev)**
- 只改 `content.js` 的每日靈修內容(低風險、無程式邏輯)
- 緊急 hotfix(修好後回頭把 dev rebase 對齊)

---

## 預覽網址方案(dev 分支)

GitHub Pages 免費版只能部署一個分支(= main)。dev 分支要有獨立預覽網址,以下**由易到難**:

**① Firebase Hosting Preview Channels(推薦)**
- 已經在用 Firebase,不必再申請新服務
- 指令:`firebase hosting:channel:deploy dev --expires 30d`
- 每次 deploy 拿到類似 `https://bible-game-bcb84--dev-xxxxxx.web.app` 的臨時網址
- 預設 7 天過期,可加 `--expires` 延長,最長 30 天
- 成本:Blaze 方案免費額度內不收費
- **注意事項**:
  - 需在 `firebase.json` 加 Hosting 設定
  - LINE Callback URL 要在 LINE Console 加入 dev 網址(支援多個)
  - Firebase Auth 授權網域也要加入新網域

**② Netlify / Cloudflare Pages(獨立服務,免費)**
- 綁 GitHub repo,指定 dev 分支自動部署
- 拿到固定網址 `<project>-dev.netlify.app` / `.pages.dev`
- 優點:每次 push 自動部署,不用手動指令
- 缺點:多一個服務要管,LINE / Firebase Auth 授權網域一樣要加

**③ 本機預覽(最陽春)**
- `python3 -m http.server 8080` 在 `localhost:8080` 測
- 只有自己看得到,無法手機測試
- Firebase Auth 需把 `localhost` 加入授權網域

**建議**:短期用 ① Firebase Hosting Preview Channels,長期如果想要 push 就自動預覽,改 ② Cloudflare Pages。

**目前使用中的 dev 預覽網址**：
`https://bible-game-bcb84--dev-01luz2yz.web.app/bible-game-v2.html`
有效期至 2026-05-19（每次 channel deploy 自動延長）

---

## 開發規範

**版本號規則**（2026-06-05 James 拍板改制為日期版號）
- 進正式版時，`GAME_VERSION` 設為「當天日期」，格式 `'2026.06.14'`（年.月.日、月日補零、無 `v` 前綴）。
- 不再分大小版次、不再判斷「內容更新還是機制更新」。版號 = 玩家那天拿到一次更新的標記，如此而已。
- 舊規則（內容更新 +0.1 / 機制更新 +1 整套大小版次）作廢。

**過渡註記**
- `v2.16` 為最後一個語意版號；`v2.16`（含）以前的 changelog 舊條目原樣保留、不追溯換算成日期。
- 日期制從下一版（v2.16 之後第一個正式版）起生效。

**每次進版必做動作**
1. `GAME_VERSION` 改為當天日期（格式 `'2026.06.14'`）。
2. 在 `bible-game-v2.html` 的 changelog HTML 加入新版本記錄（版號用日期）。
3. 更新 `VERSION_NOTES`（給玩家看的）── ★ **只列玩家可見項**（新功能／新內容）；後台修（如 CORS 修復／GA4 命名對齊／計時埋點等玩家看不到的）**不寫進去**。每條措辭都要對應到實際已實作功能，不列未實作項目。
4. `<title>`：已去版號、不再含版本字串，確認即可（不需改）。

**彈公告判準**（與版號脫鉤、獨立判斷）
- 玩家可感知的變化（新功能／新內容）→ `SUPPRESS_VERSION_POPUP = false`（彈公告）。
- 純後台修（CORS／GA4 命名／埋點／工具腳本等玩家看不到的）→ `SUPPRESS_VERSION_POPUP = true`（不彈）。

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

## 多視窗協作模式

本專案採「5 個策略視窗 + Claude Code 執行者」架構。5 個策略視窗：

- 🎯 PM 總指揮
- 💻 開發協調
- 🎨 美術協調
- 📊 數據分析
- 📝 內容生產

各視窗的完整職責細目、決策層級分工（策略性 vs 執行性決策）、落地實例與模糊地帶處理，**詳見 `roles/README.md`（唯一真實來源）**。

---

## ⚠️ 待 PM 視窗補完的戰略段落

以下三項是 2026-05-11 v2.11 收網時識別出的策略性段落，開發協調視窗已寫完「機制怎麼運作」的部分，**戰略性的「為什麼這樣做、設計理由、決策背景」需 PM 視窗補完**。未來 PM 視窗看到本段可直接接手。

1. **「合併日雙章原則」設計理由**（留給 PM 視窗補）
   - 為什麼從 v2.10 之前的「合併日取一章」翻轉成 v2.11 的「雙章完整呈現」？
   - 「神的話不應被工具刪減」這句拍板敘事的脈絡是什麼？
   - 機制描述已寫在「合併章節處理原則」段落，缺戰略層的 why。

2. **v2 上線改「按完整度」不按日期的決策背景**（留給 PM 視窗補）
   - 為什麼放棄原本「5/X 上線」的日期承諾、改成「Phase 2D + 3B + 3C + 3D 全完才上線」？
   - FEATURE_FEEDBACK_V2 flag 是執行層手段，背後的戰略判斷（玩家期望管理 / 教會分發節奏 / team 端容量）需要 PM 視窗描述。

3. **Phase B 漸進釋出的戰略意涵**（留給 PM 視窗補）
   - 為什麼選漸進釋出（每書卷獨立 Phase B-X）而非一次到位（補完所有缺章 + 整批切換）？
   - 「林後先切」的優先級判斷是什麼（內容密度 / 玩家流量 / 章節物件成熟度）？
   - 機制描述已寫在「Phase B 漸進釋出策略」段落，缺戰略層的 why。

---

## 開發團隊

- **James**（st00777）：專案發起人，靈修內容方向，小組需求收集
- **共同開發者**：遊戲設計發想，測試，新功能提案

**使用工具**：Claude（對話討論）、Claude Code（程式修改）、GitHub Pages（部署）
