# Claude Code 與 Claude Design 對話指南
> 整理日期：2026-05-01
> 適用對象：靈修冒險專案的 Claude AI 助理
> 用途：跨對話視窗共享的下指令最佳實踐

---

## 🛠️ 第一部分：Claude Code 指令撰寫

### 核心原則

#### 1. 指令格式：Goal / Constraints / Acceptance criteria

不要逐行寫程式碼指令，而是用結構化格式描述意圖：

```
【Goal】
（要達成什麼目標）

【Constraints】
（不能動什麼、必須遵守什麼）

【任務說明】
（具體實作方向，不需要寫完整代碼）

【Acceptance Criteria】
（如何驗證任務完成）

【Effort】
xhigh / high / medium / low

【完成後動作】
（git commands、部署指令等）
```

#### 2. Effort 等級選擇

- **預設 `xhigh`**（不要用 max，max 會 overthinking）
- **簡單任務降到 `low` / `medium`** 省 token
- **`max` 只留給單次 session 最難的任務**

#### 3. 權限管理

- **不要用** `--dangerously-skip-permissions`
- **改用** `/fewer-permission-prompts` 或 Auto Mode（Max 方案）

#### 4. 長任務操作

- 用 `/focus` 只看結果
- 回來用 `Recaps` 看摘要
- 批次問題減少來回次數，省 token

#### 5. Subagent 使用

- 不要每次都叫 subagent，讓 Claude 自己判斷
- 只有「跨多檔案並行」或「完全獨立任務」才明確呼叫

#### 6. 驗收條件（槓桿效果最高）

指令裡加 Acceptance Criteria 讓 Claude 自行驗證，可接 Stop Hook 跑 `npm test`。

#### 7. 字面遵從性強

Opus 4.7 對指令的字面遵守度很高，所以：
- CLAUDE.md 要寫清楚偏好和預設值
- 指令要明確、不模糊
- 「不要動 X」要明確列出來

#### 8. 阻塞點處理

指令最後加一句：「**遇阻塞點先停下來確認再執行**」
讓 Claude Code 在發現衝突時主動詢問，而不是默默做出偏離原意的決定。

---

### 範例：完整的 Claude Code 指令

```
【Goal】
在 dev 分支實作 emoji 容器視覺一致性方案，
讓 87 個章節裝備與 28 個成就徽章視覺風格統一。

【Constraints】
- 只動 bible-game-v2.html（CSS 區塊 line 17-421 內）
- 不要動 content.js、Cloud Functions、firestore.rules、任何 .md 文件
- 必須使用既有 :root CSS 變數（--sand、--sand-dark、--shadow 等)
- 不破壞既有的 popIn 動畫與互動狀態
- 維持 iOS Safari 相容性

【任務說明】
為衣櫃裝備（.equip-item）和成就卡片（.ach-card）
新增三段稀有度的容器邊框與背景：
- 銅級（bronze）：暖棕色系，呼應 sand 色票
- 銀級（silver）：清淡藍灰色系
- 金級（gold）：金色漸層 + conic-gradient 光暈

並為 .equip-emoji / .ach-emoji 加入統一染色濾鏡
（sepia + saturate 微調，融入療癒紙張感主調)。

金級成就的 emoji 不套用 sepia 濾鏡，保持原始亮度。
未解鎖成就維持既有灰階樣式。

【Acceptance Criteria】
1. 開 dev 預覽 URL 在 iPhone Safari 測試：
   - 衣櫃所有裝備卡片有暖色相框
   - 成就頁銅 / 銀 / 金三色清楚可區分
   - 金級成就 conic-gradient 光暈正常旋轉
   - 未解鎖灰階成就顯示正常
2. CSS 修改不超過 80 行
3. 沒有破壞既有任何頁面
4. main 分支 bible-game-v2.html 沒有任何變動

【Effort】xhigh

【完成後動作】
git add bible-game-v2.html
git commit -m "實驗：emoji 容器視覺一致性 (dev only)"
git push origin dev
firebase hosting:channel:deploy dev --expires 30d

回報新預覽 URL，並列出所有修改的 CSS class 名稱。
遇阻塞點先停下來確認再執行。
```

---

## 🎨 第二部分：Claude Design 對話技巧

### 核心原則

#### 1. 先餵 context 再下 prompt（最關鍵）

大多數人跳過這一步，但這正是決定輸出是「通用感」還是「像你產品」的分水嶺。

**第一個 prompt 之前先附上：**
- 現有設計截圖
- 競品參考
- 視覺靈感
- 要 match 的簡報或文件
- code repository（Claude 會讀你的 component / token / styling 模式）

**對靈修冒險的應用：**
跟 Claude Design 對話前，**先把 design-system.md 和 bible-game-v2.html 上傳或貼進去**。

#### 2. 用 inline comment 而不是重新打字

Claude Design 最強的功能是**直接點選元件用 inline comment 修改**。
不要動不動重新生成整個畫面，那會浪費一次 prompt 額度。

#### 3. 如果 inline comment 失靈，把文字貼進 chat

官方承認 inline comment 偶爾會在 Claude 讀到之前消失。
遇到這狀況就把 comment 內容貼進 chat。

#### 4. 大專案連結 subdirectory

如果連結整個 monorepo 造成卡頓或瀏覽器問題，改連結特定子資料夾。

#### 5. 分階段 prompt，不要一次塞太多

照官方建議的 prompt chaining：
- 第一個 prompt 生第一版
- 看完用 inline comment 改
- 第二個 prompt 推進到下一階段

#### 6. 配額獨立計算

Claude Design 的 weekly allowance 獨立於 Chat 和 Claude Code 計費，每 7 天重置。
跟 Claude AI 聊天不會吃掉 Claude Design 的額度。

#### 7. Handoff to Claude Code 是隱藏絕招

Coding agent 不是逆向工程截圖，它拿到的是有結構化 metadata 的設計。
Claude Design 完成後直接 handoff 給 Claude Code，比截圖再請 Claude Code 重做精準得多。

---

### Claude Design Prompt 結構

```
【Context】
（餵它你的設計系統 / 既有畫面截圖 / 風格參考）

【Goal】
（具體的視覺產出，例如「設計成就解鎖時的慶祝動畫畫面」）

【Visual Constraints】
（從 design-system.md 抓相關規則：色票、圓角、字型、陰影等）

【Tone & Mood】
（療癒、神聖、輕量、可愛但不幼稚——直接抄遊戲關鍵字）

【References】
（既有的 .ach-card、.equip-item 風格，要保持一致）

【Output Format】
（純 CSS + emoji，不能用 SVG / 圖檔，要配合 Apple Emoji）

【Iteration Plan】
（先給第一版 → 用 inline comment 微調 → 滿意後 handoff to Claude Code）
```

---

### 中文支援注意事項

Claude Design 對繁體中文支援良好（底層是 Opus 4.7），
但要在 prompt 裡明確指定字型 fallback：

```
【中文字型重要說明】
請使用支援繁體中文的字型，例如：
font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
若使用 SVG，請確認 <text> 元素使用上述字型。
若中文無法正常顯示，請改用英文備用。
```

---

### 範例：完整的 Claude Design Brief

```
【Context】
我正在開發「靈修冒險」基督信仰手機遊戲。
已上傳檔案：design-system.md、bible-game-v2.html、CLAUDE.md
請先閱讀這三份檔案，了解既有視覺系統與技術約束。

【Goal】
設計主頁的角色卡視覺升級版本。
目前角色卡使用 .avatar-card class（line 124），
顯示玩家裝扮（hat / body / hand / bg）+ 等級 + XP 進度條。

【Visual Constraints】
- 主色：紫色 #9C7BB5、綠色 CTA #6BCB77
- 背景：天空藍漸層 #C8E6FA → 米白
- 圓角：24px（卡片）、14px（內元素）
- 字體：圓潤系統字（蘋方 / 思源黑體）
- 陰影：暖棕 0 4px 20px var(--shadow)
- 必須相容 Apple Emoji 渲染

【Tone & Mood】
療癒、神聖、現代、輕量
不要老氣、不要誇張、不要幼稚
參考：Headspace、Calm、YouVersion 聖經 App

【References】
保持跟既有 .ach-card.gold.unlocked 的金光感呼應
保持跟主頁天空藍漸層協調

【Output Format】
HTML + CSS（不要 SVG，因為要套到既有 emoji 渲染系統）
所有 emoji 容器留空，由 JavaScript 動態填入

【Iteration Plan】
先給三個方向的初稿：
1. 紙張感升級版（保留現有結構，只升級材質）
2. 卡片重組版（重新規劃元素位置與比例）
3. 動態裝飾版（加上微動畫、光暈、粒子）

我會選一個用 inline comment 微調，
滿意後 handoff to Claude Code 整合到 bible-game-v2.html。
```

---

## 🔄 三方協作流程（James / Claude Design / Claude Code）

每個美術升級任務都會走這個流程：

**Step 1｜James 提需求**
例：「我想讓主頁的角色卡更有質感」

**Step 2｜Claude AI 做的事**
- 確認目前程式結構
- 寫一份完整的 Claude Design brief（用上面的格式）
- 餵 context（design-system.md + 截圖 + 既有檔案）

**Step 3｜James 拿 brief 去 Claude Design 做設計**
- 貼進 prompt
- 用 inline comment 微調
- 滿意後 export 或 handoff bundle

**Step 4｜Claude AI 寫整合指令**
- 把 Claude Design 的輸出轉成 Claude Code 能執行的任務
- 用 Goal / Constraints / Acceptance criteria 格式
- 指定動哪些 line、不要動哪些

**Step 5｜James 拿指令去 Claude Code 執行**
- 在 dev 分支實作
- 部署到 Firebase Hosting Preview

**Step 6｜James 手機實機測試 + 團隊回饋**
- 不滿意 → 回到 Step 2 修改
- 滿意 → 累積到下一波 main 進版

---

## ⚠️ 重要紀律

1. **所有實驗在 dev 分支**，main 不能直接動
2. **累積多個改動一起進 main**，不要一個一個推
3. **手機實機測試**比截圖討論精準
4. **遇阻塞點先停下來確認**，不要默默做出偏離原意的決定
5. **dev 分支的 git add 用精準路徑**（不要 git add -A，避免誤加工作檔）

---

*文件結束。把這份貼進新對話的第一則訊息，新的 Claude AI 就會直接遵守這套規則。*
