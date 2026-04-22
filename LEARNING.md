# 🎓 靈修冒險開發學習紀錄

## 一、前端開發

### CSS 與排版
**✅ 學到的**
- `position: fixed` 在有 `transform`、`opacity` 動畫的父元素下會失效，因為這些屬性會建立新的 stacking context
- 解法：把浮動元素（如選單）移到 `body` 底部，或改用 JavaScript 動態計算位置
- iOS Safari 的 `100vh` 包含網址列高度，導致內容被遮住
- 解法：使用 `env(safe-area-inset-top)` 或加足夠的 `padding-top`
- `z-index` 只在同一個 stacking context 內有效，跨 context 無法比較

**⚠️ 往後注意**
- 任何 `position: fixed` 的元素，都要確認祖先有沒有 `transform` 或 `opacity` 動畫
- 每次新增 overlay 或浮動元素，都要在 iOS 和 Android 各測一次
- flex 佈局的 `flex-grow: 1` 在只有一個元素時會撐滿整行，需要用 `flex-basis` 控制

---

### JavaScript 安全
**✅ 學到的**
- `innerHTML` 插入用戶提供的資料（如 photoURL）會造成 XSS 漏洞
- 解法：改用 `document.createElement()` + `.src` 屬性
- `Math.random()` 不是密碼學安全的亂數，不適合用在 OAuth state
- 解法：改用 `crypto.getRandomValues()`

**⚠️ 往後注意**
- 任何來自外部的資料（用戶輸入、API 回傳）都不能直接放進 `innerHTML`
- 涉及安全的亂數一律用 `crypto.getRandomValues()`

---

## 二、Firebase 與後端

### Cloud Functions
**✅ 學到的**
- Gen 2 Cloud Functions 預設不允許公開呼叫，需要手動設定 `invoker: 'public'`
- `createCustomToken()` 需要 `iam.serviceAccountTokenCreator` 權限，Gen 2 不會自動給
- CORS 設定要明確列出允許的網域，不能用萬用字元
- Cloud Function 的錯誤訊息不應該直接回傳給前端，debug 資訊留在 server log

**⚠️ 往後注意**
- 每次新增 Cloud Function，記得確認：
  1. invoker 是否設為 public
  2. CORS 白名單有沒有包含測試版網址
  3. IAM 權限是否正確

---

### Firebase Auth
**✅ 學到的**
- 新增網域（正式版、測試版）都要在 Firebase Auth 的「授權網域」加入
- LINE 登入在 LINE 內建瀏覽器裡，Google 登入會失敗（403: disallowed_useragent）
- LINE Login Channel 狀態是 "Developing" 時，只有 Tester 角色的人才能測試

**⚠️ 往後注意**
- 每次新增測試環境，要同時更新：
  1. Firebase Auth 授權網域
  2. LINE Console Callback URL
  3. Cloud Function CORS 白名單

---

### Firestore 安全規則
**✅ 學到的**
- 開放匿名寫入要加欄位驗證（白名單、字數限制）
- `allow write: if true` 非常危險，一定要加條件
- 部署規則會覆蓋 Console 裡的設定，要小心
- 誤刪的 Firestore 資料無法復原，要提前設定自動備份

**⚠️ 往後注意**
- 每個新集合都要明確寫安全規則
- 開放寫入的集合至少要驗證欄位格式和大小
- 備份設定：每日自動備份，保留 7 天（已設定）

---

## 三、跨平台差異

### iOS vs Android
**✅ 學到的**
- iOS Safari 的 `100vh` 計算方式不同，會被網址列遮住
- iOS 的 LINE 內建瀏覽器和 Android 行為可能不同
- 不同手機螢幕尺寸會影響 overlay 的顯示

**⚠️ 往後注意**
- 新功能上線前，至少要在以下環境各測一次：
  - iOS Safari（外部瀏覽器）
  - iOS LINE 內建瀏覽器
  - Android Chrome（外部瀏覽器）
  - Android LINE 內建瀏覽器
  - 電腦瀏覽器（Chrome/Safari）

---

## 四、開發流程

### Git 分支管理
**✅ 學到的**
- main 是正式版，dev 是測試版，新功能先在 dev 開發測試
- `git merge --ff-only` 確保只有乾淨的 fast-forward 才能合併
- Firebase Hosting Preview Channels 可以給 dev 分支獨立的測試網址

**⚠️ 往後注意**
- 新功能一律先在 dev 開發，確認沒問題再 merge 到 main
- 測試版網址有效期 30 天，到期前要記得更新

---

### 上線前安全檢查清單
每次上線新功能前，確認：
□ 有沒有把 Secret 或 API Key 放在前端？
□ 有沒有用 innerHTML 插入外部資料？
□ 新的 Cloud Function 有沒有正確設定 CORS 和 invoker？
□ 新的 Firestore 集合有沒有安全規則？
□ 有沒有在 iOS 和 Android 都測試過？
□ 有沒有在 LINE 內建瀏覽器測試過？

---

### 除錯方法
**按照問題地圖的五步紀律：**
① 把故障分對類（F1-F7）
② 先加 log，不要猜
③ 排除相似但不同的問題
④ 選正確的第一個修復方向
⑤ 不要臨場亂猜

**七大故障家族快速對照：**
| 家族 | 關鍵症狀 | 第一步 |
|------|---------|--------|
| F1 資料來源 | 資料不準、載入錯誤 | 查資料庫連線和讀取邏輯 |
| F2 語義理解 | 邏輯判斷錯誤 | 查條件判斷和對應邏輯 |
| F3 狀態連續 | 狀態丟失、跨步不一致 | 查狀態傳遞和同步 |
| F4 執行層 | 工具呼叫失敗、流程卡死 | 查 API 呼叫和錯誤日誌 |
| F5 可觀測性 | 看不到哪裡壞、無 log | 先加 console.error 和 firebase functions:log |
| F6 邊界定義 | 越權、介面不符 | 查 Firebase 安全規則和授權設定 |
| F7 格式結構 | 格式錯誤、資料結構壞掉 | 查資料格式和 schema |

**常用除錯指令：**
```bash
# 查看 Cloud Function 日誌
firebase functions:log --only lineLogin

# 查看備份清單
firebase firestore:backups:list --location asia-east1

# 部署測試版
firebase hosting:channel:deploy dev --expires 30d
```

---

## 五、值得記住的設計原則

### 遊戲設計
- 成就和獎勵要有「恩典機制」，不能讓玩家因為斷一天就全部歸零
- 補讀叫「重回羊圈」，比「補讀」更有溫度
- 裝備要跟聖經內容有關聯，不是純粹的裝飾
- 引號內的文字必須是和合本原文，不能改寫，敬語用「他」不用「祂」

### UX 設計
- 流程要有明確的「步驟感」，讓玩家知道現在在哪裡、下一步做什麼
- 按鈕太多時要收進選單，但選單要有圖示＋文字說明
- 錯誤訊息要讓玩家知道「發生了什麼」和「怎麼解決」
- 玩家看不懂為什麼功能不能用，比功能不能用更糟糕

### 靈修設計原則
- 情境題沒有對錯，選最有共鳴的
- 四個選項要涵蓋不同的信仰成熟度
- 至少一個選項要給「老實說我做不到」的人
- 回應溫暖有洞見，像朋友同行，不說教

---

## 2026-04-23

### 內容生成
- 完成 5/05-5/11 靈修內容（哥林多前書3-7章、9-10章）
- 性別差異裝備決策：林前7章核心是「呼召與身分」而非性別角色，不做性別差異
- 裝備設計原則補充：
  - 截斷經文等同引用錯誤，整節太長要換節而非截半
  - 兩個裝備不能拆同一節經文
  - 標點符號必須完全正確（逗號、句號、分號）

### 功能開發
- 字體大小三階段切換（小14px/中16px/大19px）
  - 影響範圍：主畫面（化身、日曆、靈修卡）+ 靈修內容（經文、選項、默想）
  - 存 localStorage + Firestore 雲端同步
- Google Analytics GA4 接入（G-HZ3EGYB8BB）
  - 9個自訂事件：login、complete_devotional、submit_reflection、
    share、read_chapter、change_font_size、submit_feedback、
    read_reminder_shown、read_reminder_action
- 成就系統（28個徽章）
  - 6個維度：恆心、深度、時段、收集、社群、書架
  - 銅/銀/金三級，金級未解鎖顯示「❓ ???」
  - 解鎖儀式：全屏overlay + 撒花 + 專屬經文卡片
- 書卷進度頁面（成就overlay內的分頁）
  - 木紋書櫃風格
  - 進度顯示格式：X/總章數（百分比）
  - 合併章節計算：徒14+15算2章、羅11+12算2章、林前8+9算2章

### 架構決策
- content.js 不拆分：100章以內不構成效能問題，保持單檔更新簡單
- content.js 加 defer：首畫面渲染不被阻塞
- 先讀經文提醒：已透過現有導讀+閱讀勳章實作，不需重複

### 數據分析
- npm run analyze 腳本建立，讀取 Firestore + Firebase Auth
- 玩家現況：27人（LINE 74%、Google 26%），持續活躍5人
- 04/20單日新增13人（推測群組宣傳），但多數為一次性流失

### 待討論
- LINE 官方帳號每日推送靈修提醒（玩家留存問題）
- 書卷頁面名稱（目前暫用「書卷」）
- v2.9 正式上線（等開發團隊確認測試版）

---

> 最後更新：2026年4月
> 有新的學習心得請持續更新這份文件
