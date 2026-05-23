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

### Modal 點擊回顧閃爍（2026-05-04）

**症狀**：點已解鎖徽章開回顧 modal，手機版閃 + 短暫透出底下成就頁；電腦版正常。日記回顧結構幾乎相同但完全不閃 ── 金線索對照組。

**走過的歪路（記錄避免重蹈）**
- ❌ 拿掉 `.ach-unlock-emoji` 的 bounce 動畫：以為是 animation 干擾 transform，無效
- ❌ `requestAnimationFrame` 延後 `openOverlay`：方向是 layout 但對 mobile GPU 合成沒幫到
- ❌ 第一次試 `.modal` 加 `will-change` 看似無效：實為驗證在電腦版（本來就不閃）+ emoji 動畫干擾觀察 → 誤以為無效而撤回

**真因**：跟 5/1 `.sheet` 破圖**完全同一個機制**。`.modal` 用 transform 動畫進場（`scale(.85) translateY(20px) → scale(1) translateY(0)`），手機 GPU 在動畫觸發瞬間才建合成 layer，第一幀未就緒 → 閃爍 + 透出底下圖層。

**解法（多管齊下）**
1. `.modal` 加 `will-change: transform`（同 `.sheet` 解法，最關鍵）
2. `renderAchievementCard` 內聯 `void modal.offsetHeight` 強制 layout + 內聯 `.show` class（避免 helper 函式潛藏副作用，讓動畫從正確置中位置起跑）
3. 部署到 Firebase Hosting dev channel 用**手機**驗證（不能只在電腦版測）

**結果**：第二次以後完全不閃；首次點擊閃爍率 100% → 約 50%（殘留可能跟不同徽章內容長度造成的首次 paint 差異有關，可接受）。

**✅ 學到的**
- 看到「手機閃 / 電腦正常」這個模式，第一個假設就是 GPU layer 未預建（同 `.sheet`）
- 任何用 transform 動畫進場的彈出元素（`.sheet`、`.modal`、未來的 popover）預設加 `will-change: transform`
- 對照組差異是診斷金線索，但要警惕「對照組其實也有問題只是強度低」的陷阱
- 驗證環境必須跟症狀環境一致：手機 bug 不能用電腦版驗證；驗證前要清快取或開無痕

**⚠️ 往後注意**
- dev 改動要 `firebase hosting:channel:deploy dev` 才會更新測試版（push GitHub 不夠 → 參見 memory `project_dev_preview_deploy.md`）
- 撤回某個修法前先確定它真的無效，不要被環境差異或其他干擾因素誤導
- 「完美修好」很貴；「明顯改善 + 殘留場景可接受」即可收工，避免邊際遞減

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

## 2026-05-17 v2.12 合併日 hotfix 連環 — 「半殘修復魔咒」與四層收網架構

### 事件摘要
v2.12 內容補做（4 章歷史合併日整合）上線後，實機驗證連續揭露 4 層 bug，一晚內連修 4 輪 hotfix 才完整收網。根本包袱：**使徒行傳 chapter key 是數字、其他書卷是字串**——試作品階段教會讀經進度已在徒14，章節 key 只用數字；後續書卷改字串縮寫，型別不一致成歷史債。v2.11 拍合併日時只測 5/22 林後（字串型），漏網的型別問題在 v2.12 補做使徒行傳合併日時集體爆發。

### 四層收網架構

| 層級 | 修復內容 | commit |
|------|---------|--------|
| #1 觸發層 | SCHEDULE 4 條改雙章陣列（4/05、4/17、4/28、5/10）讓雙卡 UI 觸發 | `9117a06` |
| #2 讀取層 | 5 處 `.chapter ===` 嚴格比對改 `String()` 寬鬆比對 | `4ac62cd` |
| #3 源頭層 | selectChapter 內用 `data.chapter` 反向正規化 selectedChapter，從源頭解決 19 處下游污染 | `b934943` |
| #4 渲染層 | closeReward 移除 `if (allDone) return` 早返，讓最後一章完成後雙卡也即時刷新 | `8a8c031` |

### 關鍵學習

#### 1. 邏輯走查 ≠ 實機驗證
**✅ 學到的**
- 四輪 hotfix 每次審查 git diff 全綠、模擬走查多情境也全綠，但每次上線後實機驗證都揪出新症狀。
- 邏輯走查涵蓋「設計如預期」，揪不出「設計沒涵蓋的情境」。玩家實機驗證是收網的黃金標準。

#### 2. 「半殘修復魔咒」要主動防範
**✅ 學到的**
- 每修一層、更深一層浮上來，常發生在跨檔案、跨函式的污染鏈：
  - #2 只修 selectChapter 不修 selectChoice/submitReflection/completeDevotional → 「能看不能玩」
  - #3 漏修 selectChapter 內 `ch` 區域參數 → 「資料對了但 UI 標籤錯」

**⚠️ 往後注意**
- 偵察階段主動全檔 grep 同類比對、列出所有候選點再決定範圍。每輪 hotfix 都主動延伸盤點，是避免半殘上線的關鍵。

#### 3. 源頭正規化 > 下游散彈寬鬆比對
**✅ 學到的**
- #2 用 `String()===String()` 寬鬆比對修 5 處讀取點，但 selectedChapter 變數本身仍被字串污染、下游 19 處受害。
- #3 改在源頭（selectChapter 內 `ch = data.chapter`）反向正規化，一處修連帶解決 19 處。
- **兩者互補不可跳級**：先有 #2 讓 `CHAPTERS.find(...)` 能找到 data，#3 才能用 `data.chapter` 反向正規化。直接跳 #3 而不做 #2，data 仍找不到。

#### 4. `if (xxx) return;` 是技術債高發地
**✅ 學到的**
- #4 根因是 closeReward 內 `if (allDone) return;` 把「不需引導玩家看下一章」誤等同「不需刷新」。

**⚠️ 往後注意**
- 寫早返時自問：「return 後跳過的所有後續動作，跟 return 條件真的是 1:1 對應嗎？」若不是，該拆條件或重組順序。

#### 5. 「先查後改」拆兩階段救了一輪
**✅ 學到的**
- #3 的工單拆「階段 1 純查 + 階段 2 改寫」，並埋「依階段 1 結論調整改寫」的伏筆。
- 階段 1 揭露策略 A 原描述漏修症狀 1（`chapterFull(ch)` 用區域參數），因伏筆而停下來告知決策者、沒盲動。指令若寫死「只改 selectedChapter」並嚴格照辦，就會半殘上線。

**⚠️ 往後注意**
- 複雜重構工單常含未知，指令裡明示「依階段 N 結論調整」，給執行者判斷與喊停的空間。

### 附帶成果
- 「completeDevotional 存裝備時 chapter 型別不一致」原列 PM 第 2 層議題，#3 源頭正規化後自動解決，可從議題清單移除。

### 仍待長期處理（PM 第 2 層議題）
今天用「寬鬆比對 + 源頭正規化」修玩家體驗，但底層型別不一致仍存在。長期方案：使徒行傳 chapter key 從數字改字串（搭配 ACT1-13 補完內容）。這是「規格統一」工程，需 PM 視窗排優先級。

---

## 2026-05-17 分支管理紀律 — Claude Code 誤 commit 落 main

### 事件記錄
v2.12 四層 hotfix 連續作業期間，Claude Code 有一次把 `fix(content): correct SCHEDULE arrays...` 誤 commit 到 **main** 分支（errant commit `369b6f7`，落在一個 `Merge branch 'dev'` 之後）。

**已自行修復、無內容遺失**：
- 把該變更 cherry-pick 回 dev（commit `9117a06`，內容完整保留在它該在的分支）
- `git reset` 把 main 退回 `origin/main`（`2449ee7`），抹掉誤落的 `369b6f7`
- 結果：main 恢復乾淨、dev 拿到正確的 hotfix、無任何內容遺失

**⚠️ 流程透明度問題**：當下沒有打斷流程、也沒有即時回報這個失誤，是事後在寫 LEARNING.md 的 commit 時才順帶揭露。修得掉是技術問題，沒即時說是信任問題——往後「修得掉、但代表流程有破口」的事件應即時回報，不要默默修掉（呼應 memory `feedback_disclose_mistakes`）。

### 啟示
**✅ 學到的**
- 分支切換不是「永久狀態」。連續任務之間，前一個 step 可能為了 merge / 驗證切到 main，做完沒切回 dev；下一個 step 一開工就 commit，便直接誤落 main。
- v2.12 hotfix 是「改 dev → 切 main merge → 切回 dev 再改」的高頻來回節奏，正是誤落分支的高發場景——來回切越多次，「忘了切回去」的機率越高。
- 與本日 v2.12 那節的 `if (xxx) return` 教訓同源：都是「假設某個前置狀態還成立」卻沒驗證就動作。分支假設跟早返假設一樣，要主動 check、不要默認。

### 預防措施
**⚠️ 往後注意**
- 往後 Claude Code 工單模板的 **Constraints 段必須強制加上這條**：
  > 「commit 前先 `git branch` 確認當前分支」
- 這是強制檢查、不是建議：每次 commit 前一定先看一眼當前分支，特別是工單橫跨多個 step、中間有切過 main 的時候。
- 工單若有「切 main merge / 驗證」這類 step，收尾時明確切回 dev，不要把分支狀態留給下一個 step 去猜。

---

> 最後更新：2026-05-17
> 有新的學習心得請持續更新這份文件
