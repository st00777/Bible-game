---
name: bible-firestore-safety
description: 在 Bible-game 改 Firestore schema / 安全規則 / 玩家資料寫入流程前審查，避免破壞玩家資產（默想要存）、隱私邊界（默想是悄悄話）、過鬆規則。輸出檢查報告含安全 / 資料保存 / 隱私 / Schema 變更 / 部署流程五大區。
---

# Bible-game Firestore 安全 / 資料 / 隱私審查

對 Bible-game 即將進行的 Firestore 相關改動做完整審查。**這個 skill 不會直接改程式碼**，只負責檢查跟回報，是否要修由使用者決定。

---

## Step 0: 確認審查對象

**如果使用者啟動時帶了檔案路徑或描述**，直接審查指定範圍。

**如果沒有指定**，先問使用者：

「請告訴我這次的改動屬於哪一類（可複選）：
- (A) 改 `firestore.rules` 安全規則
- (B) 改 Firestore schema（新增 collection / 新增欄位）
- (C) 改玩家資料寫入流程（如 `saveChapterRecord`、`submitFeedback`）
- (D) 加新功能涉及玩家輸入或 Firestore 資料
- (E) 其他」

依使用者回答決定要審查哪個區塊。

---

## Step 1: 讀必要 reference

開始審查前讀以下檔案了解現況：

1. `~/Desktop/Bible-game/firestore.rules` — 當前安全規則
2. `~/Desktop/Bible-game/CLAUDE.md` 的「Firestore 資料結構」區塊 — 完整 schema
3. `~/Desktop/Bible-game/bible-game-v2.html` — 找 `db.collection('users')` / `submitFeedback` / `saveChapterRecord` 等寫入點

---

## 五大檢查區

### A. 安全規則（firestore.rules）

#### A1. Admin 機制
- [ ] `isAdmin()` helper 是否仍只允許 `st00777@hotmail.com` 一個 email？
- [ ] 新規則是否引入新 admin 路徑（要明確標記為刻意設計）

#### A2. 玩家資料隔離
- [ ] `users/{userId}/{document=**}` 仍只允許 `request.auth.uid == userId`
- [ ] 沒有規則允許玩家 A 讀玩家 B 的資料（除了 admin）

#### A3. Feedback（曠野呼聲）規則
- [ ] `feedback` write 仍有格式限制：
  - `hasOnly([...])` 欄位白名單
  - `message.size() <= 300`
  - `mood in moods()`
  - `category in categories()`
- [ ] `feedback` read 限制：玩家只能讀自己的（`uid == request.auth.uid`）或 admin
- [ ] 匿名留言（`uid=null`）玩家端永遠讀不到

#### A4. 過鬆規則檢查
- [ ] **沒有** `allow write: if true` / `allow read, write: if true` 這類無條件規則
- [ ] **沒有** 純 `request.auth != null` 就允許任意 collection 寫入（要加 uid 比對 + 欄位驗證）
- [ ] 新增 `match /xxx` 區塊一定要明確寫 read / write 條件

#### A5. helper functions
- [ ] `moods()` / `categories()` 內列表跟 `bible-game-v2.html` 的 button data-val 一致（同步原則，見 P6）
- [ ] 新增 helper 加上「**畫面 / 客戶端也維護同一份**」的註解提醒

---

### B. 玩家內容保存（Project user content value 原則）

**核心原則**（來自 memory `project_user_content_value`）：玩家輸入文字（默想、回饋、自訂角色名等）**預設要存 Firestore**，不能只存 localStorage。

#### B1. 新功能是否有玩家輸入
- [ ] 列出新功能涉及的所有「玩家輸入點」（textarea / input / 選項 / 按鈕點擊也算）
- [ ] 對每個輸入點確認：寫入 Firestore 了嗎？

#### B2. 寫入完整性
- [ ] 玩家寫的文字寫入 `users/{uid}/chapters/{key}` 主文件 + `reflections/{timestampId}` 子集合（**保留歷史**）
- [ ] 寫入時機：玩家「完成」動作時（不是邊打邊存，避免半成品）
- [ ] 失敗 fallback：寫入失敗時玩家輸入不應消失（保留 localStorage 作為 backup）

#### B3. 既有資料相容性
- [ ] 新欄位是否與既有玩家資料相容（沒有強制 required 導致舊玩家報錯）
- [ ] 新欄位讀取時要處理「可能未填」情況（`?? defaultValue`）

---

### C. 默想隱私邊界（Reflection privacy 原則）

**核心原則**（來自 memory `project_reflection_privacy`）：默想是「悄悄話」性質，**不加查看工具**；NLP / 情感分析等功能要先 UI 告知玩家。

#### C1. 內容讀取權限
- [ ] 沒有新增「admin 主動讀玩家默想內容」的 UI 或腳本
- [ ] `npm run analyze` 等 admin tool 只看「字數 / 統計 / 是否填寫」，不直接印出默想內容
  （**例外**：「曠野呼聲」是玩家明確選擇要說給開發團隊，可印；「默想」是玩家對神說的話，不可印）

#### C2. NLP / 情感分析類功能
- [ ] 如果新功能要分析默想內容（例如情緒分類、關鍵字提取、向量檢索）：
  - [ ] **UI 上明確告知玩家**「你的默想會被 AI 分析」
  - [ ] 給玩家選擇 opt-out 的選項
  - [ ] 分析結果不公開展示（不能讓其他玩家看到）

#### C3. 默想歷史保留
- [ ] `reflections` 子集合用 `Date.now()` 作為 doc id，**累積保存不覆蓋**
- [ ] 即使玩家重寫同一章，舊的默想要保留（不能 update + replace）

---

### D. Schema 變更影響

#### D1. 新增欄位
- [ ] 客戶端讀取時處理「可能未填」（既有玩家沒這個欄位）
- [ ] 預設值是否合理（`undefined` vs `null` vs `[]` vs `0`）
- [ ] 是否需要 migration 腳本（一次性把既有玩家補齊預設值）

#### D2. 新增 collection
- [ ] `firestore.rules` 必須加對應的 `match /xxx` 規則（**新 collection 沒寫規則 = 預設拒絕，玩家會收到 permission-denied**）
- [ ] 寫入路徑跟讀取路徑都明確
- [ ] CLAUDE.md 的 Firestore 資料結構區塊同步更新

#### D3. 修改既有欄位
- [ ] 不破壞舊資料的讀取（type 不變、key 不改名）
- [ ] 改名要分兩階段：先寫新名 + 讀兩個（兼容期）→ 觀察一段時間 → 拿掉舊名

---

### E. 部署流程

#### E1. firestore.rules 部署
- [ ] **沒有 dev preview** — 部署直接影響所有線上玩家
- [ ] 指令：`firebase deploy --only firestore:rules`
- [ ] **不要** 跑 `firebase deploy`（無 --only） — 會把 functions 也部署
- [ ] 部署前的編譯檢查會擋語法錯誤，但**不會擋邏輯錯誤**

#### E2. 部署後驗證
- [ ] 立即送一筆 feedback / 完成一次靈修確認新規則仍允許正常流程
- [ ] 萬一規則寫錯：在 Firebase Console「Firestore → 規則」頁手動 rollback 到上一版

#### E3. 客戶端 + 規則同步部署
- [ ] 如果客戶端也有改動（例如新增寫入流程），先部署客戶端到 dev preview
  確認流程能跑 → 再部署 rules（避免規則先改但客戶端沒跟上）

---

## 輸出格式

審查完成後輸出：

```
═══════════════════════════════
🔒 Bible-game Firestore 安全審查報告
═══════════════════════════════

審查範圍：[A/B/C/D/E 哪幾區]
讀過的檔案：[列出]

─── A. 安全規則 ───
✅ / ⚠️ / 🔴 [每項結果]

─── B. 玩家內容保存 ───
✅ / ⚠️ / 🔴 [...]

─── C. 默想隱私邊界 ───
✅ / ⚠️ / 🔴 [...]

─── D. Schema 變更影響 ───
✅ / ⚠️ / 🔴 [...]

─── E. 部署流程 ───
✅ / ⚠️ / 🔴 [...]

═══════════════════════════════
總結：
- 🔴 需修正 N 處（列出位置 + 建議）
- ⚠️ 需注意 N 處（列出原因）
- ✅ 通過 N 處
═══════════════════════════════
```

**注意**：標記原則：
- 🔴 = 違反核心原則（必須修，否則玩家資料 / 隱私 / 安全會被破壞）
- ⚠️ = 需要使用者明確決策（例如「這個 NLP 功能要不要 opt-out？」）
- ✅ = 通過

---

## 補充

**這個 skill 跑完不直接修程式碼** — 只回報。使用者看完報告再決定要修哪些。

**如果使用者要求 skill 順手修**：
- 🔴 級可以直接幫忙修（明顯違反原則）
- ⚠️ 級**一定要先問使用者**（牽涉產品決策）

**跟其他 skill / memory 的關係**：
- `/security-review` 是泛用安全 review，這個 skill 是 Bible-game 特定（玩家資產 / 默想隱私）
- 兩個 skill 互補：先跑 `/security-review` 看泛用問題，再跑 `bible-firestore-safety` 看專案特定原則
