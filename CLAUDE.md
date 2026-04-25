# 靈修冒險遊戲 · 專案記憶文件
> 給 Claude Code 和共同開發者閱讀的專案說明
> 最後更新：2026年4月

---

## 專案基本資訊

**專案名稱**：靈修冒險（Bible Devotional Game）
**部署網址**：`st00777.github.io/Bible-game/bible-game-v2.html`
**GitHub Repo**：`github.com/st00777/Bible-game`
**目前版本**：v2.7

**核心定位**：
針對大光教會成人查經班的每日靈修輔助遊戲。
不是取代靈修，而是輔助靈修——建議玩家先讀完當天經文再來玩。

---

## 檔案結構

```
Bible-game/
├── bible-game-v2.html   # 遊戲主體（機制、介面、邏輯）
├── content.js           # 靈修內容（每週更新這個）
├── CLAUDE.md            # 本文件
└── README.md            # GitHub 說明頁
```

**重要原則**：
- 每次更新靈修內容只需修改 `content.js`
- `bible-game-v2.html` 只在機制或介面有改動時才動
- 每次更新記得修改 `content.js` 裡的 `GAME_VERSION` 和 `VERSION_NOTES`

---

## 技術架構

**前端**：HTML + CSS + JavaScript（單一 HTML 檔案 + content.js）
**部署**：GitHub Pages（HTTPS，免費）
**後端**：Firebase（Firestore Database + Authentication）
**登入方式**：Google 登入、LINE 登入（未登入可繼續使用訪客模式）
**資料同步**：登入後進度自動同步 Firestore；未登入使用 localStorage
**Firebase 專案**：`bible-game-bcb84`
**AI 回應**：Anthropic API（`claude-sonnet-4-20250514`），只在 HTTPS 環境下有效

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

users/{userId}/stats/data                ← 累計統計
  totalDays:       12                    // 累計完成天數
  reflectionCount: 8                     // 累計填寫默想次數
  readCount:       5                     // 累計點閱讀完整章節次數
  shareCount:      3                     // 累計分享次數
  makeupCount:     2                     // 累計補讀次數（日期已過才完成）
  morningCount:    4                     // 清晨靈修次數（05:00-08:59）
  nightCount:      1                     // 深夜靈修次數（22:00-04:59）

users/{userId}/achievements/data         ← 成就預備（結構已建立，待實作）
  unlockedAt: {}                         // 解鎖成就時間戳記（成就key → Timestamp）
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

---

**content.js 結構**：
```javascript
const GAME_VERSION = '2.7';        // 版本號
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

## 近期待開發功能

**優先（後端已就緒，可直接開始）**
- [ ] 成就系統（連續7/14/30天、書卷完成徽章）← 後端已就緒，可開始實作
- [ ] 靈修日記（每天默想自動存檔，可回顧）← 後端已就緒，可開始實作
- [ ] 默想 AI 個人化回應 ← 需要在後端安全存放 API Key（目前直接呼叫有暴露風險）
- [ ] 時段成就統計（晨間/午間/晚間靈修）← 現在可以收集玩家靈修時段資料
- [ ] 先讀經文提醒（輕量彈窗＋閱讀勳章）

**中期**
- [ ] 介面美化（免費素材，可愛風，方向未定：像素vs插畫）
- [x] Firebase 雲端存檔＋Google 登入（已完成，v2.6）
- [x] LINE 登入（已完成，v2.7）
- [x] 歡迎登入畫面（先選登入方式再建角色，v2.7）
- [x] 頂部按鈕整理（收進 ⋯ 選單，v2.7）
- [x] 曠野呼聲回饋系統（遊戲內填寫，存 Firestore，v2.7）
- [ ] 5月起羅馬書後續書卷內容

**長期願景**
- [ ] 書卷完成里程碑
- [ ] 季節/節期活動（復活節、聖誕節限定）
- [ ] 小組排行榜、朋友動態
- [ ] 合作關卡（需要即時系統）

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
2. 更新 `VERSION_NOTES`（3條以內，給玩家看的）
3. 在 changelog HTML 加入新版本記錄
4. 更新 `<title>` 標籤

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
