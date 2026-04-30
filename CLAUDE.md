# 靈修冒險遊戲 · 專案記憶文件
> 給 Claude Code、Claude AI Project 和共同開發者閱讀的專案說明
> 最後更新：2026-04-28

---

## 專案基本資訊

**專案名稱**：靈修冒險（Bible Devotional Game）
**部署網址**：`st00777.github.io/Bible-game/bible-game-v2.html`
**GitHub Repo**：`github.com/st00777/Bible-game`
**目前版本**：v2.9（main 與 dev 同步，2026-04-27 上線；2026-04-28 加入 Gemini 503 retry hotfix）

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
├── LEARNING.md                    # 開發學習筆記（踩坑紀錄）
├── claude-code-agent-prompts.md   # 內容生成 prompts + 審查清單
├── README.md                      # GitHub 說明頁
├── firebase.json                  # Firebase 設定（Functions/Firestore/Hosting）
├── firestore.rules                # Firestore 安全規則
├── functions/index.js             # Cloud Functions（lineLogin, aiReflection）
├── scripts/analyze-feedback.js    # Firestore 數據分析（npm run analyze）
├── scripts/check-ai-logs.js       # aiReflection 呼叫量／成功率（npm run logs）
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
**追蹤**：Google Analytics GA4（`G-HZ3EGYB8BB`）
**數據分析**：
- `npm run analyze` ── Firestore 4 區塊報告（feedback / users / 靈修進度 / 成就）
- `npm run logs [天數]` ── aiReflection 呼叫量、AI 真實回應比、錯誤類型分布（預設過去 1 天）

兩個腳本都用 Firebase CLI refresh token 直接打 Cloud REST API，不需額外安裝 SDK。

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

feedback/{docId}                         ← 曠野呼聲回饋（頂層集合）
  mood:        '平靜/有動力/有點累/經文太難/其他'
  category:    '靈性感受/遊戲體驗/我的異象/其他'
  message:     '文字內容（最多300字）'
  isAnonymous: true/false
  uid:         '登入用戶的uid或null（訪客為null）'
  displayName: '登入用戶的名稱或null'
  createdAt:   Timestamp
  chapter:     '當天章節key或null'
```

**時段定義**：
- `morning`：05:00–11:59
- `afternoon`：12:00–17:59
- `evening`：18:00–21:59
- `night`：22:00–04:59（清晨統計用 05:00–08:59）

### 安全規則

每個玩家只能讀寫自己的資料：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /feedback/{docId} {
      allow write: if request.resource.data.keys().hasOnly([...])
                && request.resource.data.message.size() <= 300
                && request.resource.data.mood in ['平靜','有動力','有點累','經文太難','其他']
                && request.resource.data.category in ['靈性感受','遊戲體驗','我的異象','其他'];
      allow read: if request.auth != null;
    }
  }
}
```
完整規則見 `firestore.rules`。

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
- generationConfig：`maxOutputTokens: 1000, temperature: 0.7`
- **失敗處理**（2026-04-28 加入，2026-04-30 升級）：Gemini 回 503 過載時最多重試 2 次，每次等待 1-2 秒（1.5±0.5 jitter，避免群體同時重試撞牆）；其餘錯誤回傳 fallback 文字「謝謝你願意把心裡的話帶到神面前。祂看見了。」（玩家不會看到錯誤，只是少了個性化回應）
- 監控：`npm run logs` 看當天呼叫成功率，目標 90% 以上；若 fallback 持續 >10% 考慮升級到 2 次 retry 或加 Gemini Pro 備援

---

**content.js 結構**：
```javascript
const GAME_VERSION = '2.9';        // 版本號
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
5/22 林後5+6（合併）  5/23 林後7   5/24 林後8   5/25 林後9
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
7/30 彼後1  7/31 彼後2
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
- 彼得後書：PE2_1 ~ PE2_2

**合併章節（6 處）**：
- 5/22 林後5+6 → 取更豐富的一章
- 6/03 加5+6 → 取更豐富的一章
- 6/14 西1+2 → 取更豐富的一章
- 6/26 提前2+3 → 取更豐富的一章
- 7/08 來1+2 → 取更豐富的一章

**更新節奏**：每週一更新下下週內容，確保玩家永遠有一週緩衝。

**合併章節處理原則**：兩章合一天時，挑戲劇性或靈修素材更豐富的那章設計情境題。

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
| **事件流 session timeline** | 📋 設計方案 2026-04-28 通過（見章節末尾「事件流設計方案」），啟動條件：玩家數破百 | 3-5 小時實作 | A 級資料骨幹，做了之後上方 3 項都能推導 |
| **默想歷史保留** | ✅ 已完成 (2026-04-28) | — | — |

### B 級 ── 中期有用

| 項目 | 現況 | 估時 |
|---|---|---|
| 章節停留時長（dwell time） | 需新增 | 1 小時（依賴事件流） |
| 選項猶豫軌跡（選 A 又改 C） | 需新增 | 1 小時 |
| 默想字數分布／編輯時長 | 需新增 | 30 分鐘 |
| 重複登入計數（同日進遊戲幾次） | 需新增 | 15 分鐘（profile/data 加 sessionCount counter） |
| 完成靈修後逗留行為 | 需新增 | 1 小時（依賴事件流） |
| 裝備換裝行為時點 | 需新增 | 30 分鐘 |

### C 級 ── 長期累積

| 項目 | 現況 | 估時 |
|---|---|---|
| 頁面跳轉路徑 | 需新增 | 1-2 小時（依賴事件流） |
| 登入失敗／中斷（client 端取消授權、網路斷） | 需新增 | 1 小時 |
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

### 事件流設計方案（2026-04-28 通過，啟動條件：玩家數破百）

> 啟動 v3.0 中期實作前，這份方案是已通過的設計骨幹，可直接進開發。
> **目前玩家 49 人**，到達 100 人時觸發實作。

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

**待開發**
- [ ] 時段成就統計 UI（資料已在收集）
- [ ] 介面美化（免費素材，可愛風，方向未定：像素vs插畫）
- [ ] 靈修日記 v2：前後比對功能（「X 天前的你寫了這些」）
- [ ] localStorage 暫存默想 ── Firestore 寫入失敗時的最後一道防線（v3.0 候選）
- [ ] 6月起加拉太書～提多書內容

**v3.0 候選短期（2026-04-28 盤點）**
- [ ] 曠野呼聲雙向回覆 ── 待團隊討論，傾向 B+C 方案：具名玩家走個人 reply，匿名玩家通過「📣 開發者回應」公告區去識別後集體回應
- [ ] 管理後台 ── Firebase Hosting 部署 admin web app：dashboard + feedback reply + SCHEDULE 管理（取代手動開 Firebase Console）
- [ ] Cloud Messaging 推播 ── 每日定時推「今日章節：羅 10」，遊戲內訂閱即可（可考慮取代或並行下方長期願景的「LINE 官方帳號每日推送」）
- [ ] 每月精華 PDF ── Cloud Function scheduled，月底把當月默想 + AI 回應整理寄給玩家，留存武器

**v3.0 候選中期**
- [ ] **事件流 session timeline** ── 設計方案已就緒（見「資料缺漏盤點」末尾），啟動條件：玩家數破百（目前 49）；做了之後解鎖客戶端錯誤、放棄事件、AI 失敗行為、dwell time 等多項 A/B 級分析
- [ ] 小組功能 ── `groups/{groupId}` 集合 + 邀請碼，「我們小組這週有 N 人靈修」（涵蓋下方「小組排行榜、朋友動態」）
- [ ] 語音默想 ── Cloud Storage，對不擅打字的長者友善，可能解鎖目前完全沒在寫默想的族群
- [ ] 小組共讀模式 ── 兩人互相看默想，需具名授權（教會夫妻、同小組成員一起靈修場景）

**長期願景**
- [ ] 書卷完走儀式（Phase 3，專屬 overlay + 代表經文）
- [ ] 季節/節期活動（復活節、聖誕節限定）
- [ ] 小組排行榜、朋友動態（已被 v3.0 中期「小組功能」涵蓋）
- [ ] 合作關卡（需要即時系統）
- [ ] LINE 官方帳號每日推送靈修提醒（v3.0 短期 Cloud Messaging 為替代方案）
- [ ] 個人成長報告（半年／一年，NLP 分析默想內容找重複主題）
- [ ] 匿名群體鏡像（「你的回應跟 X% 的玩家相同」，集合查詢產生共鳴）

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

**版本號規則**
- 內容更新（新章節）：小版號 +0.1（如 2.2 → 2.3）
- 機制更新（新功能）：中版號 +1（如 2.x → 3.0）

**每次更新必做**
1. 修改 `GAME_VERSION`
2. 更新 `VERSION_NOTES`（小版本 3 條內，重大版本如 v2.9 可到 10 條，給玩家看的）── **每條措辭都要對應到實際已實作功能**，不能列入未實作項目
3. 在 `bible-game-v2.html` 的 changelog HTML 加入新版本記錄
4. 更新 `<title>` 標籤（例：`v2.9 · 使徒行傳・羅馬書・哥林多前後書`）

**程式碼風格**
- 繁體中文介面
- CSS 變數統一使用 `:root` 定義的顏色
- 動畫統一用 `popIn` keyframe
- 所有 overlay 用 `openOverlay()` / `closeOverlay()` 控制

---

## 開發團隊

- **James**（st00777）：專案發起人，靈修內容方向，小組需求收集
- **共同開發者**：遊戲設計發想，測試，新功能提案

**使用工具**：Claude（對話討論）、Claude Code（程式修改）、GitHub Pages（部署）
