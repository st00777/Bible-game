# 靈修冒險 · 數據快照流程手冊

> 給 James、Claude AI Project、Claude Code 共同遵循的數據更新流程
> 對應分析文件：`data-insights.md`
> 對應遊戲版本：v2.14

---

## 為什麼有這份文件

每次更新數據都重複討論「拉哪些檔」「哪些指標看」，痛點都是流程沒固定。
這份 playbook 解掉三件事：

1. **GA4 報表 → 檔案 → 指標** 對照清楚
2. **三種更新規模**（小 / 中 / 整套）有明確 checklist
3. **關鍵 KPI 看板**固定，每次都對齊，不會漏看

---

## 0. 三種更新規模

| 規模 | 適用時機 | 動作 | 預估時間 |
|---|---|---|---|
| 🟢 **小更新** | 每天 / 一般日 | 只跑 npm 三腳本，看數字趨勢 | 5 分鐘 |
| 🟡 **中更新** | 2-3 天累積 / 重大事件後（擴散波 / 新功能上線後） | npm 三腳本 + 拉 2 個 GA4 CSV，更新 data-insights.md | 30 分鐘 |
| 🔴 **整套更新** | 每月 / 重大改版 / 季回顧 | npm 三腳本 + 拉 6 個 GA4 CSV，data-insights.md 大改寫 | 1-2 小時 |

**判斷規則**：
- 小更新 → 中更新：發現 DAU 大幅波動、累計 +10 註冊以上、Firebase 跟 GA4 落差變大
- 中更新 → 整套：超過 7 天沒大更新、改版上線、季結

---

## 1. 小更新流程（npm 三腳本）

### 指令

```bash
# 三個都是讀 Firestore + Cloud Function logs，不寫任何資料
npm run analyze     # Firestore：feedback / users / 章節品質 ①-④ / 裝備 ⑤ / 默想 ⑥
npm run logs        # AI Reflection：呼叫量、真實回應率、503 錯誤明細
npm run line-logs   # LINE 登入：成功率、失敗時段
```

### ⚠️ 注意

- `npm run logs` 跟 `npm run line-logs` 都打 Cloud Logging API（共用 60 req/min quota），**不要並行跑**，間隔 30 秒以上
- `npm run analyze` 用 Firestore API，可跟 logs 並行，但**輸出超過 200 行**會被某些終端機 buffer 截斷。建議：
  ```bash
  npm run analyze > /tmp/analyze-MMDD.txt 2>&1
  ```
  跑完讀檔，避免截斷

### 出處要記下的數字

每次跑完，至少記住這 5 個數字（用來決定要不要升級到中更新）：

| 指標 | 來源 | 為什麼重要 |
|---|---|---|
| 已建角色玩家數 | analyze 區塊「已建立角色的玩家」 | 跟 GA4 對照看漏斗 |
| 累計靈修天數 | analyze 區塊「累計靈修天數」 | 黏度核心 |
| 默想填寫率 | analyze 區塊「默想填寫率」 | 95% 是基準線，掉到 90% 以下要看 |
| 過去 24h AI fallback 率 | logs 區塊「AI fallback」 | 正常 < 10%，超過要查 retry / Pro 備援 |
| 過去 24h LINE 登入成功率 | line-logs 區塊「HTTP 2xx 成功」 | 100% 是常態，掉就是 LINE Console / Channel Secret 問題 |

---

## 2. 中更新流程（小更新 + GA4 兩個 CSV）

### Step 2.1 — 先跑小更新流程

照上面跑完三腳本，記下 Firestore 數字。

### Step 2.2 — 拉 GA4 兩個必要檔案

到 [analytics.google.com](https://analytics.google.com)，登入後切到屬性 **`G-HZ3EGYB8BB`**（Bible-game GA4）。

**檔案 A — `Firebase_總覽.csv`**
- 路徑：左側選單 → 「報表」→「Firebase 總覽」→ 右上角「分享/匯出」→「下載 CSV」
- 涵蓋：DAU/WAU/MAU 趨勢、cohort 留存、事件清單、地理、平均參與時間

**檔案 B — `事件_事件名稱.csv`**
- 路徑：「報表」→「參與」→「事件」→「事件名稱」→ 右上角「分享/匯出」→「下載 CSV」
- 涵蓋：每事件的次數 + **觸發人數**（這個 Firebase_總覽 沒有）

兩個檔案放專案根目錄 `/Users/aitest/Desktop/bible-game/`，**不要 commit**（`.gitignore` 已排除 `*.csv` / `*.xlsx`）。

### Step 2.3 — 跟 Claude Code 說「GA4 更新了，讀一下」

Claude Code 會：
1. 自動偵測根目錄的 2 個 CSV 檔（中更新；整套更新才是 6 個）
2. 讀檔解析（GA4「第 N 天」自動換算成日期，見 §4）
3. 整合 Firestore + GA4 數字寫進 `data-insights.md`
4. commit + push 到 dev

---

## 3. 整套更新流程（中更新 + 全部 6 個 CSV）

中更新涵蓋 90% 的決策需求。整套適合每月回顧或大改版。

### 額外要拉的 4 個檔案

| 檔名 | 路徑 | 涵蓋 |
|---|---|---|
| `「查看使用者參與度和留存率」總覽報表.csv` | 「報表」→「參與」→「總覽」 | cohort Day 1 / Day 7 留存細節 |
| `報表數據匯報.csv` | 「報表」→「快照」 → 匯出 | 跨指標總覽（規模、留存、行為一次到位） |
| `「瞭解網站和/或應用程式流量」總覽報表.csv` | 「報表」→「使用者」→「人口統計資料」 | 城市、語言、DAU/MAU 比例 |
| `技術詳情_瀏覽器.csv` | 「報表」→「技術」→「總覽」 | 瀏覽器分布（看 LINE 內建瀏覽器佔比）|

---

## 4. GA4 CSV「第 N 天」→ 日期換算

GA4 匯出的 CSV 用「第 N 天」(0013, 0023 ...) 不是日期，每次都要換算。

### 規則

每個 CSV 開頭有 `# 開始日期：YYYYMMDD` 與 `# 結束日期：YYYYMMDD`。

**第 N 天 = 開始日期 + N**

例（5/8 匯出）：
- 開始 20260410（4/10）
- `0013` = 4/10 + 13 = **4/23**
- `0023` = 4/10 + 23 = **5/3**
- `0027` = 4/10 + 27 = **5/7**

GA4 預設區間 28 天，所以 N 通常是 0000 ~ 0027。

cohort 編號（cohort 0, 1, 2...）的編法**也是同樣規則**（cohort 0 = 開始日，cohort 13 = 開始日 + 13）。

---

## 5. 關鍵 KPI 看板

每次更新都要看的 8 個指標：

### 規模類（4 個）

1. **GA4 MAU / WAU / 今日 DAU**（CSV「第 N 天,30 天,7 天,1 天」表）
2. **Firebase 註冊總數**（GA4 沒這個，看 Firebase Console / `npm run analyze` 的「總註冊人數」）
3. **已建角色玩家數**（`npm run analyze`）
4. **持續活躍玩家數**（`npm run analyze`，建立日 ≠ 最後登入日）

### 漏斗（1 個）

5. **GA4 → Firebase 漏斗轉化率**：`Firebase 註冊 / GA4 MAU` × 100%
   - 60%+ 健康（熟人推薦特徵）
   - 40-60% 一般
   - < 40% 預警（可能訪客流失嚴重）

### 健康訊號（3 個）

6. **AI 真實回應率（過去 24h）**（`npm run logs`）
   - ≥ 90% 健康，< 90% 要查 retry / Pro 備援
7. **LINE 登入成功率（過去 24h）**（`npm run line-logs`）
   - 100% 是常態
8. **默想填寫率**（`npm run analyze`）
   - 95% 基準線

### 補充指標（看狀況加）

- 5/3 那波 / 5/7 那波 cohort 的 Day 1 / Day 7 留存（驗證「擴散節點 vs 留存目標」假設）
- 100% 默想率章節清單（內容黏度）
- AI fallback 集中章節（內容品質警訊）
- 真實留言新增筆數（玩家情感參與）

---

## 6. data-insights.md 更新規範

### 不刪歷史

每次更新**只新增**，不刪舊段落。歷史是時間序列觀察的基礎，下個月回看才能對比。

### 標準段落結構

```markdown
## 📌 摘要：本期重點

**規模**（GA4 截至 X/Y + Firestore 截至 X/Y）：MAU N、註冊 N、已建角色 N、累計靈修 N
**健康訊號**：
- 🟢 / 🟡 / ⚠️ 標記
- 一句結論 + 數字 + 比較

---

（下面詳細指標分節，照既有結構）
```

### 標題日期

文件最頂端：
```markdown
> **最後更新：YYYY-MM-DD**
> 資料涵蓋期間：YYYY-MM-DD ~ YYYY-MM-DD（GA4）+ Firestore 全歷史至 YYYY-MM-DD
```

每次更新就改這兩行。

### Commit message 規範

```
docs: data-insights.md MM/DD 更新（含 GA4 X/Y 視角）

- 摘要：MAU/WAU/DAU 數字
- 重大事件：…
- 新洞察：…
```

---

## 7. 新事件上線後的流程

v2.10 加了 `achievement_review` GA4 事件，但這次更新才注意到「只 2 人用過 11 次」── 因為 KPI 看板沒納入新事件。

**新事件上線時的標準步驟**：

1. 在 GA4 dashboard 確認新事件名稱已在「事件」報表出現（通常 24 小時內）
2. 在這份 playbook §5「補充指標」加一條 watchlist
3. 第一次中更新時，把該事件 28 天累計寫進 data-insights.md「行為事件分析」段
4. 累積 4 週後評估：用率太低 → 標記「冷功能」並討論刪/改/補引導

**目前 watchlist**（依事件用率排序，2026-05-08）：

| 事件 | 28 天累計 | 觸發人數 | 狀態 |
|---|---|---|---|
| achievement_review | 11 | 2 | ⚠️ 新功能用率低，4 週後評估 |
| diary_open | 4 | 4 | ⚠️ 入口太深？ |
| submit_feedback | 9 | 5 | ⚠️ 真實留言斷流 |
| change_font_size | 13 | 7 | OK，長者友善基本盤 |

---

## 8. 引用慣例（給 Claude AI Project）

當 Claude AI Project 引用 data-insights.md 數據時：

- **永遠帶日期**：「截至 5/8 GA4 MAU 173」不要寫「MAU 173」
- **永遠帶來源**：GA4 / Firestore / Cloud Function logs
- **歷史觀察用「截至 X/Y 看到」**：避免把 5/4 的數據誤當當下狀態
- **超過 7 天沒更新時**：先說「資料可能過期」再用

---

## 變更紀錄

| 日期 | 改動 | Commit |
|---|---|---|
| 2026-05-08 | 初版建立 | (本次 commit) |
