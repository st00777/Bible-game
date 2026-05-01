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

### Sheet 動畫破圖（2026-05-01）
**症狀**：手機版開啟任何 .overlay sheet（成就 / 日記 / 衣櫃 / 教學）時，畫面上方瞬間破圖閃爍後恢復；iOS、Android 都有；電腦版正常。曠野呼聲卻**不破圖**。

**走過的歪路（記錄避免重蹈）**
- ❌ 改 `min-height: -webkit-fill-available` → `100dvh`：以為是 iOS viewport 跳動，無效
- ❌ 對 `.cloud` 跟 `.overlay` 加 `will-change`：方向錯（真正動 transform 的不是這兩個）
- ❌ 想動 `body.overflow:hidden` 邏輯 / 弱化 backdrop-filter：根本不是元凶

**真因**：`.sheet` 用 `transform: translateY(100%) → 0` 動畫進場。瀏覽器在動畫**觸發瞬間才建立 GPU 合成 layer**，第一幀 layer 還沒就緒就開始繪製 → 破圖閃。

**為什麼曠野呼聲不破**：它的 sheet 用「預設 sheet（內容自然撐高）」，layer 結構單純。而成就 / 日記用 `display:flex + height:90vh + 內部 child overflow-scroll` 創額外子 layer，合成順序差更明顯。其實兩者都應該會閃，只是視覺差異程度不同。

**解法**：對 `.sheet` 加 `will-change: transform`，提示瀏覽器**在 idle 時就預建 GPU layer**，動畫觸發時 layer 已就緒（commit `5fcf449` / `3eb6e83`）。

**✅ 學到的**
- 「畫面上方破圖」不一定是 viewport / fixed 元素位置問題，可能是 GPU layer 合成時序
- 診斷時先找「**反例**」（哪個沒問題）能快速定位差異點
- `will-change` 是**最後保底的 GPU hint**，但要用在「真正會動畫的元素」上才有效

**⚠️ 往後注意**
- `will-change` 不要濫用（會吃 GPU memory）。只加在已知會動畫且看到效能問題的元素
- 新增 sheet/modal 動畫時，預設先評估「要不要加 will-change」── 預防破圖
- 診斷渲染問題時，先列出所有相關元素的 z-index、position、transform、opacity，才能找到 layer 結構差異

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

## 2026-04-25

### AI 靈修回應
**✅ 學到的**
- Gemma 4 31B 透過 Google AI Studio API 呼叫是免費的，但會輸出 chain-of-thought 推理過程（英文的思考+草稿），需要後處理過濾
- 解法：在 Cloud Function 裡用正則過濾非中文內容，只保留最後的中文回應
- Gemini 2.5 Flash 不會輸出推理過程，回應直接乾淨，但免費額度較低（1,500 RPD vs Gemma 幾乎無限）
- 同一把 Google AI API key 可以同時呼叫 Gemma 和 Gemini 不同模型
- maxOutputTokens 設太低（300-500）會導致回應被截斷在句子中間，建議設 1000

**⚠️ 往後注意**
- 選模型時不只看品質，也要看免費額度——擴展到更多用戶時額度會是瓶頸
- Gemma 系列的 chain-of-thought 行為可能在不同版本間改變，後處理邏輯需要維護
- API Key 一律存 Secret Manager，不進程式碼（跟 LINE Secret 同樣做法）

### Cloud Function 設計
**✅ 學到的**
- 雙模型 A/B 測試可以用 `Promise.all` 平行呼叫，不增加回應時間
- 在 dev 環境顯示兩個回應供比較，正式版只顯示一個——用 `location.hostname` 判斷
- Cloud Function 的 `invoker: 'public'` 要記得設（Gen 2 預設不允許公開呼叫，之前 LINE 登入踩過同樣的坑）

**⚠️ 往後注意**
- 新的 Cloud Function 部署後要等容器冷啟動完成才能測試（可能需要 15-30 秒）
- `console.error` 的日誌在 `firebase functions:log` 裡可能有延遲（Gen 2 已知問題）

### 靈修日記設計
**✅ 學到的**
- 資料設計原則：不重複存儲已有的資料。`choiceText`、`reflectionPrompt` 不需要存 Firestore，顯示時從 `content.js` 的 CHAPTERS 即時查即可
- 只需新增一個 Firestore 欄位（`reflectionText`），其他資訊都能從已有的 `choiceSelected` + content.js 組出來
- UX 重點：AI 回應出來後不能立刻被裝備視窗蓋住——改為手動觸發（加一個「完成靈修，領取裝備」按鈕）

### 內容生成與審查
**✅ 學到的**
- 批次生成內容（一次 12 章）時用 sub-agent 平行查經文，主流程同時寫內容，效率大幅提升
- 審查流程中發現的新規則：**經文引用不可跨章**（baseItem.desc 必須跟 chapter key 在同一章）
- 哥林多後書 5+6 合併日選第 5 章（5:17「新造的人」比第 6 章更有靈修價值）
- 全部 59 章經文已透過 Bible.com CUNP 逐字驗證，發現 8 處經文錯誤 + 14 個 responses 缺「小步」

### 數據分析擴充
- `npm run analyze` 從原本 2 個區塊擴充到 4 個區塊
- 新增：連續天數分布、等級分布、章節完成排行、裝備收集排行、靈修行為統計（默想率 95%！）、時段分布（深夜 57%）、成就解鎖統計
- 關鍵發現：深夜靈修佔 57%，代表大部分玩家在晚上 22 點後使用遊戲
- 關鍵發現：默想填寫率 95%，代表遊戲機制設計成功（稀有裝備是好的激勵）

### 待追蹤
- Gemma 4 偶爾 fallback 到預設回應（API 不穩定，需進一步排查）
- Gemini vs Gemma 品質比較（等 A/B 測試數據累積後決定正式版用哪個）
- 靈修日記 v2：前後比對功能（「X 天前的你寫了這些」）

---

> 最後更新：2026年4月
> 有新的學習心得請持續更新這份文件
