# Skills 指令速查表（mattpocock-skills 外掛）

給所有視窗（PM／開發／使用者）共用的參考。使用方式：直接輸入 `/指令名`，或用白話描述需求（例如「拷問我這個想法」「幫我抓這個 bug」），Claude 會對應到正確的 skill。不確定用哪個時可用 `/ask-matt` 導航。

## ✅ 檢查 code 類

| 指令 | 用途 | 適用時機 |
|------|------|----------|
| `code-review` | 審查「從某個點以來的變更」，雙軸檢查：是否守 repo 規範＋是否符合原始需求/工單 | 功能做完、merge 前 |
| `diagnosing-bugs` | 系統化抓蟲流程 | 東西壞了/報錯/變慢但不知道為什麼 |
| `tdd` | 先寫測試再寫程式（紅-綠-重構） | 想邊做邊驗證的新功能或修 bug |
| `codebase-design` | 模組介面設計的共用詞彙與方法 | 設計新模組、決定切分邊界 |
| `improve-codebase-architecture` | 檢查並改善程式結構的可維護性 | 覺得程式越來越難改的時候 |

> 另外 Claude Code 內建也有：`/code-review`（抓正確性 bug）、`/security-review`（安全檢查）、`/simplify`（簡化整理）。內建版專注抓 bug 與資安；這包的 code-review 多了「對照規範與需求」的角度。

## 📋 工單與規劃類

本 repo 已設定工單記在 **GitHub Issues**（見 `issue-tracker.md`），標籤用預設五個（見 `triage-labels.md`）。

| 指令 | 用途 |
|------|------|
| `to-tickets` | 把討論內容整理成一張張 GitHub 工單 |
| `triage` | 幫工單分類貼標籤（待分類/缺資訊/可交給AI/需要人做/不做） |
| `to-spec` | 把工單展開成完整規格 |
| `implement` | 照工單/規格動手實作 |
| `wayfinder` | 大功能拆成地圖＋子工單，逐步推進 |

## 💭 想法測試類

| 指令 | 用途 |
|------|------|
| `grilling` / `grill-me` | 拷問模式：不留情面地質疑你的計畫/決策，動手前逼出弱點 |
| `grill-with-docs` | 拷問前先讀專案文件，問得更到位 |
| `prototype` | 快速做丟棄式原型，驗證設計順不順 |
| `research` | 派背景專員查資料/讀文件，寫成報告存進 repo |
| `domain-modeling` | 整理專案術語表（CONTEXT.md）與重大決策紀錄（ADR） |

## 🔧 其他

| 指令 | 用途 |
|------|------|
| `wizard` | 生成一步步帶人操作的互動教學（適合只有本人能做的事，如後台開權限） |
| `resolving-merge-conflicts` | 處理 git 合併衝突 |
| `teach` | 教學解釋 |
| `wait-what` | 剛剛發生什麼？請 Claude 白話重述 |
| `handoff` | 產生交接文件 |
| `writing-for-agents` | 寫給 AI 讀的文件（skills、CLAUDE.md）的寫法指南 |
| `ask-matt` | 不確定該用哪個 skill 時的導航員 |

## 本專案最常用建議

- 出怪問題 → `diagnosing-bugs`
- 大改動上線前 → `code-review`（或內建 `/security-review` 查安全）
- 新功能猶豫要不要做 → `grilling`
- 討論完要留工單 → `to-tickets`
