# Firestore 資料結構（完整 schema）
> 自 CLAUDE.md 搬出（2026-08-24）；歸檔用，不再隨每輪載入。

### Firestore 資料結構

```
users/{userId}/                          ← 主文件（進度同步）
  completed:  { "ACT10": "2026-04-01" } // 已完成章節（章節key → 完成日期）
  streak:     3                          // 連續天數
  items:      [ { emoji, name, desc, slot, chapter }, ... ]
  hat / body / item / bg / title         // 目前穿戴裝備；title＝稱號名稱（第五部位，2026-08-29 PR ③b，'' 不掛）
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
  // 2026-08-30 加：focus_enter/exit{dwellSec,completed}、reward_view/close{hasBonus,newTitles,dwellSec}、title_unlocked{title,booksDone}、
  //   page_switch{page,from}、book_detail_open{book}、tutorial_open/close{source,noRepeat,dwellSec}、guide_expand{hasHard}；
  //   既有事件加 ai_response_received.withEquipment、chapter_select.merged/order、login.trigger、app_leave.lastStep（完整表見 docs/metric-changelog.md）

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
