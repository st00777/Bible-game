---
name: bible-playtest
description: 靈修冒險固定測玩清單。用 Chrome（手機視窗）對 dev 預覽站或正式站走一遍主流程並回報 pass/fail。用於「跑測玩」「發布前測一下」「對正式站終驗」。搭配 docs/playtest-checklist.md 的真機清單（LINE 登入等瀏覽器做不到的由 James 手機做）。
---

# 靈修冒險 · 自動測玩

## 何時跑
- dev→main PR 開之前：對 dev 預覽站跑。
- 合進 main 之後：對**正式站**再跑一次（規則：驗測試站等同未驗）。
- 改了 bible-game-v2.html 流程／overlay／登入相關程式之後。

## 站點
- 正式站：`https://st00777.github.io/Bible-game/bible-game-v2.html`
- dev 預覽：`https://bible-game-bcb84--dev-01luz2yz.web.app/bible-game-v2.html`（先 `bash deploy.sh channel dev` 確保是最新 dev）
- 加 `?nt=preview` 可強制看新約終點儀式（不寫 localStorage、不記事件）。

## 執行方式
1. **用 subagent 跑**（截圖很吃 token，主對話只收結果表）。subagent 先 ToolSearch 一次載入 `mcp__claude-in-chrome__tabs_context_mcp, tabs_create_mcp, navigate, computer, read_page, find, read_console_messages, read_network_requests, javascript_tool, resize_window, tabs_close_mcp`。
2. 開新分頁，`resize_window` 到 390×844（手機視窗；已知有時不生效，截圖確認實際寬度並在回報註明）。
3. **先確認是訪客**：開站後用 `javascript_tool` 查 `firebase.auth().currentUser`。若已登入（Chrome 可能帶著 James 的帳號），**不要用真帳號測**——先 `firebase.auth().signOut()` 並清 localStorage 再開始；測完一律清 localStorage，避免訪客進度污染 James 下次登入。只動該站 origin 的本機資料，雲端資料不得寫入。
   以**訪客模式**走（Google／LINE 彈窗自動化做不到；訪客不寫 B1 事件，事件檢查改看 GA `collect` 請求）。
3b. 在步驟 7 之前先呼叫一次 `read_network_requests` 啟動追蹤，否則抓不到 aireflection 請求。讀 `GAME_VERSION` 用 `GAME_VERSION.split('.').join('|')`（純數字版號會被工具誤遮）。選單項目用座標點，先截圖確認選單已開。
4. 每步：做動作 → 截圖 → `read_console_messages` 只抓 `pattern: "error|Error|Uncaught|Event write error"`。
5. 截圖存 scratchpad，不貼進回報。

## 清單（依序，全部要走）
| # | 步驟 | 通過標準 |
|---|---|---|
| 1 | 開站 | 無 console error；版本公告若彈出可關閉；`GAME_VERSION` 與 content.js 一致（`javascript_tool` 讀 `GAME_VERSION`） |
| 2 | 初次設定：暱稱＋性別 | 化身出現、性別初始裝備正確（弟兄🧥⚔️／姐妹👘🕯️） |
| 3 | 今日章節 | 自動落在今天 SCHEDULE 的章；標題／金句／出處顯示 |
| 4 | 導讀 | intro／outline／focus 有內容，「前往閱讀」連結指向 Bible.com；展開步驟 ②「閱讀完整章節」後可見「我已經讀過這章了」按鈕 |
| 5 | 已讀 | 點「已經讀過」→ +15 XP toast、按鈕變已領 |
| 6 | 情境題 | 四個選項；點一下不確認、第二下才確認；回應文字出現 |
| 7 | 默想 | 輸入 ≥10 字（無獨立送出鈕，隨「完成今日靈修」送出）→ 等待 → AI 回應或 fallback 文字（記錄是哪一種） |
| 8 | 完成領裝備 | 基本＋稀有裝備 overlay；XP／等級變化；關 overlay 後**主畫面今日卡與日曆立即**標記完成（不需再點日曆） |
| 9 | 日曆補讀 | 開日曆，點過去一天 → 章節載入；點未來一天 → 可提前靈修 |
| 10 | 合併日 | 點一個合併日（如 9/06 創9+10）→ 出現雙入口選擇頁 |
| 11 | 衣櫃 | 未達 3 天：鎖定卡「再完成 N 天」正確；已解鎖：換裝→存檔 toast（訪客新帳號只能測前者） |
| 12 | 成就 | 成就頁開得起；寫了默想後「初次默想」成就解鎖。日記需登入 → 訪客標「未測（真機 M3 覆蓋）」 |
| 13 | 曠野呼聲 | 開得起表單，不送出 |
| 14 | 字級 | 切大／小字級，版面不破 |
| 15 | 儀式（8/28–9/06 期間） | `?nt=preview` 開得起、關得掉 |
| 16 | 網路 | `gtag/js` 回 200、`aireflection…run.app` 回 200；GA4 事件不靠瀏覽器工具（sendBeacon 抓不到，#94），測完由主對話跑 `npm run ga4:rt` 看近 30 分鐘正式站有 app_open／chapter_select／read_chapter／choice_confirm／complete_devotional 進來（dev 預覽站不送 GA4，此步只對正式站有效） |
| 17 | 重新整理 | 進度保留（localStorage） |

## 回報格式（≤25 行）
```
站點：… / 版本：… / 時間：…
| # | 步驟 | 結果 | 備註 |
（17 列，結果 ✅／❌／⚠️）
console error：N 筆（列前 3）
AI 回應：真實／fallback
結論：可發布 ／ 阻擋項：…
```
❌ 一律附重現步驟；⚠️ 為可發布但要記 issue。跑不到的步驟寫「未測」，不得省略。

## 之後由 James 做（docs/playtest-checklist.md）
LINE 登入、真機讀一章到領裝備、Google 登入後進度同步。做完才算終驗。
