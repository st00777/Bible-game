# 靈修冒險｜多 Agent 角色系統（已退役）

> ⚠️ **2026-08-28 起本架構已退役**（ADR 0003：五視窗全部收斂進 Claude Code 單一執行者）。本目錄的角色檔留作歷史；需要特定視角時改用 `.claude/agents/` 的 subagent（2026-08-28 改寫完成，見下表）。內容不再更新。
>
> 舊架構最後更新：2026-05-30　｜　維護：PM 視窗統籌（已退役）

## 舊角色 → 新形式對照（2026-08-28）

| 舊視窗／檔案 | 新形式 | 說明 |
|---|---|---|
| 🎯 PM 總指揮 `pm-strategist.md` | **James 拍板 ＋ CC 主對話** | 策略推理、ADR、殺併留過濾都在 CC；James 只做最終拍板。原退單閘門由 `pm-critic` 補位 |
| 💻 開發協調 `development-coordinator.md` | **CC 主對話** | Phase 切分、寫指令、開 PR 都由 CC 直接執行，不再需要中介 |
| 📝 內容生產 `content-creator.md` | **skill `bible-content-generator`（生成）＋ subagent `content-editor`（審查）** | ADR 0002 一條龍：CC 生成＋CUNP1 驗經；審查面獨立成主編 subagent |
| 📊 數據分析 `data-analyst.md` | **subagent `data-analyst`** | 跑 npm 數據腳本、更新 data-insights.md、守門口徑漂移 |
| 🎨 美術協調 `art-director.md` | **subagent `art-director`** | 審 design-system token／三原則、寫視覺 brief 給 CC |
| （新增） | **subagent `pm-critic`** | 重大決策前的冷評估反方：不帶提案上下文、只反對、不拍板（ADR 0003「執行者自我評分」盲點） |
| （新增） | **subagent `code-reviewer`** | PR 合 dev 前的專案紅線審查：設計紅線、Firestore 安全、測試、進版四步、埋點口徑、分支 |
| Dispatch 模板 `content-batch-dispatch-template.md` | **歸檔** `docs/history/content-batch-dispatch-template-2026-08.md` | 派工卡已無視窗可派 |
| `角色權責分工.md` | 留檔 | 歷史參考 |

subagent 共通約定：YAML frontmatter（name／description／model）、繁體中文、四節「職責／必讀正本／輸出格式／不做」、只讀 repo 正本、不 commit 不 deploy。

---

## 以下為退役前的系統說明（歷史）

### 系統概觀

靈修冒險專案曾採「5 個策略視窗 + Claude Code 執行者」架構。策略視窗在 Claude.ai 各自獨立運作，Claude Code 是唯一執行者。

### 角色清單

| 視窗 | 角色檔案 | 主要職責 |
|------|---------|---------|
| 🎯 PM 總指揮 | `pm-strategist.md` | 戰略決策、跨視窗統籌、進版時機 |
| 💻 開發協調 | `development-coordinator.md` | Phase 切分、Bug 管理、寫 Claude Code 指令 |
| 🎨 美術協調 | `art-director.md` | 視覺 brief、設計整合、design-system 維護 |
| 📊 數據分析 | `data-analyst.md` | 玩家洞察、KPI 追蹤、月報 |
| 📝 內容生產 | `content-creator.md` | 靈修內容、和合本驗證、審查清單 |

### 決策層級分工

**策略性決策（→ PM 視窗）**：要不要做某功能、方向對不對、何時啟動、跨視窗優先順序。
**執行性決策（→ 各專業視窗）**：開發協調＝資料結構／容錯／技術選型／Phase 切分；美術＝視覺方向／設計成熟度；內容＝措辭／默想結構／裝備命名；數據＝報表口徑／KPI 計算。

落地實例：2026-05-08 曠野呼聲 v2 Phase 1-2B 的 lazy-init B 方案與容錯三分流歸開發協調；同日 design-system.md 13.13 施工順序交還 PM（commit 527d204）。

### 進度卡共通欄位

更新時間（含視窗來源）、當前任務（標題＋狀態＋工程量）、重啟指令。

### 跨視窗傳遞規則

重要結論用貼文（PM 拍板、跨視窗決議、要對方執行的指令），背景脈絡用 conversation_search；理由：索引延遲不可預測，重要結論不能賭。任務性質不確定時寧可多問 PM 一次。
