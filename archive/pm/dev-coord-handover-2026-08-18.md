# 開發協調視窗 交接卡

**交接時間**：2026-08-18
**交接者**：開發協調視窗（本輪處理批次 9A / 9B / 9C / P0-P1 / GEN1-5 共五批發布）

> ⚠️ **接手第一件事**：本卡的 git 狀態是交接當下的快照，**必然會過時**。
> 動任何東西之前，先發一張唯讀查證工單向 CC 確認實際狀態。
> 本專案的鐵律是「git 是唯一真相，交接卡與記憶都會漂移」。

---

## 一、角色與邊界

| 我做 | 我不做 |
|---|---|
| Phase 切分、工程規劃 | 戰略決策（要不要做某功能）→ 🎯 PM |
| 撰寫 CC 工單（Goal / Constraints / AC / Effort） | 美術與視覺 brief → 🎨 美術協調 |
| 純實作層決策（資料結構、容錯、技術選型） | 生成靈修內容 → 📝 內容生產 |
| 高風險 git 把關（跨分支發布、機制碼、worktree 清潔） | 直接寫程式碼 → CC |
| 對 PM／內容／美術下來的指令做事實校對 | 替 James 執行 push |

**核心紀律**：所有 `git push` 由 James 手動執行。CC 只做本地操作。
本輪 CC 曾主動提議代為 push，已拒絕。這是不可協商的最後人工閘門——
本輪三次攔截（假完成、基準偏差、字元誤判）全都發生在 push 前。

---

## 二、git 現況（交接當下）

| 項目 | 值 |
|---|---|
| origin/main | `efe3cca`（GEN1-5 已上線，玩家端終驗九項全過） |
| 前一個回滾基準 | `fe6c30d` |
| origin/dev | `690ab70` |
| 共用工作樹 | `/Users/aitest/Desktop/Bible-game`，在 dev |
| 內容邊界 | 08/28（啟示錄全卷）+ 08/29–09/02（創世記 1-5） |

**worktree 狀態**

- `bible-game-gen1` — GEN1-5 發布用臨時 worktree，push 後應已清除（確認一下）
- `ga4-bugfix`（detached HEAD）— 殘留，待清
- `phase-3c-admin` — 殘留，待清
- `pm-ga4-card` — ⚠️ **數據視窗正在使用的活 worktree，git 清潔時絕對不能碰**

---

## 三、未完成事項

### 立即

1. **清除 `bible-game-gen1` worktree**（GEN1-5 玩家端終驗九項已全過，
   正式站 `const BOOKS` 恰 1 份，搬家安全落地）

### 待排期

| 優先 | 事項 | 說明 |
|---|---|---|
| 🟡 | issue #2：ACT / JAS / PE1 / PE2 缺書卷導讀 | 自檢常駐 4 條 warn，屬內容工作，內容視窗已知悉 |
| 🟢 | git 清潔 | `ga4-bugfix` + `phase-3c-admin` 兩個 worktree；cherry-pick 分歧已累計 10 批 |
| 🟢 | A1 書卷詳情頁（`6508899`） | 骨架無 feature flag，一上 main 玩家立刻看到 23 本「導讀內容待補」。上線時機由 PM 決 |
| 🟢 | 創世記後續批次 | GEN entries 已放滿 50，後續批次只需補 content.js 章節物件與 SCHEDULE，不必再動 BOOKS |

### 一筆待確認的小落差

不同輪次的 CC 回報中，main 的「章節 key 總數」與「BIBLE_LINKS 條數」數字對調過
（一份記 143/162，另一份記 162/143）。其中一份標籤寫反，不影響任何已完成的發布，
但若要拿這兩個數當基準，先確認哪個正確。

---

## 四、工單規則（本輪累積，務必沿用）

1. **Phase 0 必須同時記錄 `origin/main` 與本地 main，並確認相等。**
   `git worktree add ... main` 檢出的是本地分支，不是遠端。
   9B 就是因為只驗 origin/main 而撞上基準偏差（別的視窗有未推的 commit）。

2. **每批完成後跑玩家端終驗**（正式站 HTTP 200 + cache-buster 驗關鍵標記）。
   git 層全綠不等於玩家拿到了。9B 起列為標準驗收。

3. **經文引用區的字元以 hkbs 原文為準，不套用專案的 U+2014 規範。**
   批次 8 的 `434bf92` 把 U+2500 改成 U+2014，用的是我們的文案規範而非原文，
   正解是 U+FF0D。錯誤從 PE2_1 傳到 JUD1，兩批後才修正。

4. **擴大驗收範圍時必須同步改判準。**
   9C 我把「新增段落 U+2014 = 0」擴成「全檔」卻沒改判準，
   把合法的成對破折號與註解區 U+2500 全掃了進來。判準跟著範圍走。

5. **AC 必含「基準後 commit 數恰為 N」。** 這是排除清單最直接的守門，多一筆立即停。

6. **單檔約束本身就是禁帶 commit 的安全網。**
   例如 A1 骨架在 html 側，只要驗到「html diff 為 0」，A1 就不可能混入。

7. **修改批與新增批的驗收邏輯不同。**
   修改批（如 P0/P1）驗的是「只有該改的改了」：增刪行數平衡、
   hunk 區塊收斂、總數對帳（章節 key／SCHEDULE／BIBLE_LINKS）。
   「新章節 key 存在」這種檢查在修改批毫無意義。

8. **dev 變動頻繁，commit hash 一律現查，不沿用工單裡的舊 hash。**
   內容視窗與創世記 session 持續在推。

9. **給 James 的終端指令不放 `#` 註解。**
   zsh 互動模式預設不啟用 `interactive_comments`，`#` 會被當參數傳給 git，
   讓安全檢查空轉。說明寫在指令區塊外面。

10. **共用工作樹上的跨分支發布，一律走 isolated worktree。**
    在共用樹 checkout main 會把其他 session 一起拖離 dev。
    這是賽跑條件，靠「先查有沒有人在跑」不可靠。

---

## 五、已知機制陷阱

**① 提前靈修（`isFuture` 分支）**
內容一上 main，玩家當天就能讀，不必等排程日。
任何「等排程日再修」的規劃都不成立。9A 若沒查到這條，
玩家會有 12 天看到假完走與成就倒退。

**② entries 必須一次放滿**（design-principles.md v1.2，2026-07-27 拍板）
`getBookProgress()` 在 `mergedActive: false` 路徑取 `entries.length` 為分母，
`totalChapters` 是死欄位。分批上線的書卷若 entries 只放已完成章數，
玩家讀完就觸發「完走 ✨」與 library 成就，下一批補入時退回。
啟示錄踩過，已修；創世記從一開始就放滿 50。

**③ 玩家背包是快照制**
`state.items.push({...resolveItem(...), chapter})` — 收集當下把整個物件
（emoji／名稱／描述）存進玩家資料，不回頭引用 content.js。
所以改裝備名不會讓舊裝備失效，但會產生「絕版品」：
老玩家背包裡留著舊名稱，新玩家拿到新的。P0/P1 產生了 7 件。

**④ `validateContent()` 的三條檢查各有職責**（content.js 約 6371-6425）
- 檢查 1）entries 有但 CHAPTERS 無 → 依 v1.2 通則完全不報
- 檢查 2）CHAPTERS 有但不屬任何 BOOKS.entries（孤兒）→ error
- 檢查 3）SCHEDULE 排了但 CHAPTERS 無 → **error**（PM 2026-08-17 裁定維持，不降 warn）

  理由：檢查 3 目前 0 命中不是噪音；「排程日到了卻沒內容」是玩家可見的破損。
  改動已寫成通則、無書卷 key 硬編碼、註解註明 v1.2 依據。

**⑤ BOOKS 已搬到 content.js**（`cf2a836`）
html 側的 7 個使用點全在函式內、呼叫時求值；content.js 以 `defer` 載入
且先於 inline script。若之後要動載入順序，這是必查項——
html 若出現頂層引用 BOOKS 的程式碼，會 `ReferenceError` 整個掛掉。

**⑥ 部署與 push 是兩件事**
`git push` 只更新 repo。Firebase preview 要另跑 `bash deploy.sh channel dev 30d`。
正式站走 GitHub Pages，`firebase deploy` 完全不碰它。
preview 網址必須帶檔名 `/bible-game-v2.html`（根目錄無 index.html）。
開之前 `Cmd + Shift + R` 硬重整（有 service worker）。

---

## 六、標準流程

### 發布流程

```
PM／內容視窗交付清單
  → 開發協調事實校對（現查 hash、驗證前提、補加碼驗收條件）
  → CC 執行（Phase 0 唯讀查證 → Phase 1 cherry-pick → 驗收）
  → 需要時部署 preview，James 實機驗證
  → James 手動 push
  → CC 玩家端終驗（唯讀）
  → 清除臨時 worktree
  → 開發協調擬 PM 回報
```

### 工單格式（強制）

```
【Goal】
【Constraints】
【任務說明】Phase 0 前置查證 / Phase 1 執行
【Acceptance Criteria】逐條、附指令佐證、不接受「應該有」
【Effort】low / medium / high / xhigh
【完成後動作】
遇阻塞點先停下來確認再執行。
```

**新視窗在寫任何 CC 指令前，先讀 `claude-prompting-guide.md`。**
常見失敗模式是退回 sed 式逐行指令。

### 常用指令

```bash
# 建立臨時 worktree
git worktree add ../bible-game-XXX main

# James push
git -C /Users/aitest/Desktop/bible-game-XXX push origin main

# 清理
cd /Users/aitest/Desktop/Bible-game
git worktree remove /Users/aitest/Desktop/bible-game-XXX
git worktree list

# preview 部署（在對應 worktree 內）
bash deploy.sh channel <名稱> 30d
```

**避免 `git status` 與 `git fetch`**（device_bash 會殘留 `.git/index.lock`），
改用 `ls-remote` / `log` / `show` / `diff` / `ls-files` 等唯讀指令。

---

## 七、與 James 協作要點

- 繁體中文。**簡體字或日文漢字是錯誤**，送出前自檢
  （本輪我多次誤植「錨」字，若不確定就改用「回滾基準」等替代詞）
- 結論先給，再講理由
- 選項用表格對比；決策用按鈕式提問
- 「好」「照你建議」就是放行
- 問是非題，不要開放式問題
- 大量內容（100 行以上）走檔案上傳，不要終端貼上（中間傳輸會截斷）
- **每次都要確認實際日期**，不要沿用對話或交接卡裡的日期
- 錯誤要明確認錯並歸因，主動揭露，不要靜默修正
- 不要替他做產品層決策（功能取捨、版本公告內容、玩家溝通）

---

## 八、本輪成果摘要

| 批次 | 內容 | 死線 vs 實際 |
|---|---|---|
| 9A | 啟 1-7 + 書架分母修正 | 8/03 → 提前 2 天 |
| 9B | 啟 8-16 + tone-guide 文件批 | 8/10 → 提前 9 天 |
| 9C | 啟 17-22 + 三處歷史修正 | 8/23 → 提前 21 天 |
| P0/P1 | 九章 26 欄位經文修正 | 8/22 → 提前 20 天 |
| GEN1-5 | 創世記首批 + BOOKS 搬家 + 自檢修正 | 8/28 → 提前 10 天 |

啟示錄 22 章全卷完成（66 節逐字核對零錯誤）。
內容邊界由 08/01 推進至 09/02。

**最有價值的不是速度，是三次攔截**：
9A 的假完成（查證挖出提前靈修路徑）、
9B 的基準偏差（AC 的 commit 數守門擋下）、
9C 的字元規範誤判（我的判準錯，CC 停下來問）。

驗收條件的價值不在於「全過」，而在於它會擋下該擋的東西。
寫 AC 時要想的是「這條在什麼情況下會響」，而不是「這條會不會過」。
