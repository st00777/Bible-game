# 資料缺漏盤點（2026-04-28 全面盤點）
> 自 CLAUDE.md 搬出（2026-08-24）；歸檔用，不再隨每輪載入。

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
