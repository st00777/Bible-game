# Rive 的三種 AI 入口：內建 Agent、官方 MCP、CLI（2026-09-15 查證）

> 目的：回答「Rive 的 AI 功能怎麼下指令、格式如何」，並記下官方 MCP（外部 AI 直接操作桌面編輯器）這條 2026-04-30 之後才出現的新路，供路 D 是否重啟的決策使用。
> 查證來源全列在文末；沒有實測，標「未實測」的項目進編輯器第一天補。

## 1. 三種入口一表看懂

| 入口 | 在哪裡用 | 誰在操作 | 能動什麼 | 費用 |
|---|---|---|---|---|
| **內建 Agent 面板** | 編輯器左側欄「Agent panel」 | James 打字 | 官方文件說「code, design, and animate」：Luau 腳本、responsive layout、data model、動畫；但實際教學案例全部只做腳本，設計元素都是先手工做好 | 免費版可用（額度每小時回充）；Voyager US$20／Enterprise US$40 每席每月額度，月底歸零、加購不過期 |
| **官方 Rive MCP** | 桌面版編輯器（Mac／Windows）開著時，本機 `http://127.0.0.1:9791/mcp` | Claude Code／Cursor 等外部 AI | 檔案與畫板、階層查詢與屬性修改、建形狀／路徑／layout／component、線性動畫與 keyframe、狀態機（states／transitions／conditions）、View Model 與 binding、Luau／WGSL 腳本含編譯與 console | 文件未寫費用；需 Rive Early Access 桌面版 |
| **Rive CLI** | 終端機，不進編輯器 | Claude Code 等 | 用文字格式 RML 寫專案＋Luau＋shader，`--verify`／`--screenshot` 讓 AI 自驗 | 文件未寫費用 |

另有 **Ask mode**（2026-04-30 起）：只問問題不動檔案，比 Agent mode 省額度。

## 2. 內建 Agent 的指令格式

沒有特殊語法，白話英文即可。官方教學與 Rive Masterclass 案例歸納出的規則：

1. **先手工做好設計，再叫它寫腳本**：artboard、骨頭、mesh、動畫、狀態機、View Model 屬性都先建好；腳本要控制的屬性先在 View Model 建出來，腳本 input 再在側欄綁上去。
2. **一次一步**：每個提示只加一個行為，視覺上測過再加下一層；不要一次要整個系統。
3. **條列需求、換行分隔、給數字與範圍**：例如「Duration: 4 seconds」「Clamp minimum to 0.1」「maximum rotation of ±15 degrees」。
4. **叫名字不描述**：既有 input、artboard、變數直接用名稱（反引號包起來）；變數名用 camelCase，agent 會把空格轉 camelCase。
5. **要調的值都做成 input**，不寫死。
6. **明講不要動什麼**：「Keep all other behavior unchanged」「Do not modify any other logic」。
7. **修 bug 不要叫它整段重寫**：貼最小失敗片段＋確切症狀。
8. **產出永遠自己看過**：官方 FAQ 明說會寫錯，會嘗試自我修正但不保證。
9. 產出的腳本出現在 Assets 面板；回覆含變更摘要、新腳本、說明、可調整建議。工具列有 New Chat／Toggle Chats／Close Chat（保留歷史）。

### 官方與教學的原句範例（可直接改用）

```
Create a script that draws a rounded rectangle. Width, height, color, and corner radius should be inputs. When the inputs change, the drawing should update.
```

```
Create a new script. It should have an input called "leaf" that is of type Artboard.
```

```
Each leaf should rotate as it falls based on a turn speed value.
```

```
All of the leaves are rotating clockwise. Negative speed values should rotate counterclockwise.
```

```
Modify the existing SnowParticles script to spawn multiple flakes based on `particlesCount`.
Requirements:
- Create `particlesCount` instances of the Flake artboard.
- Each particle uses the existing looping falling animation.
- Randomize X position across screen width.
- Randomize time offset so particles are staggered and not synchronized.
- Loop: when a particle exits the bottom, reset it to the top (outside) and randomize its X position.
```

```
Use `speedFactor` as a multiplier for the falling animation timing.
Rules: `speedFactor = 1` = normal speed. `speedFactor = 2` = 2x faster. `speedFactor = 0.5` = half speed. Clamp minimum to 0.1.
Apply this uniformly to all particles. Do not modify any other behavior.
```

```
Add a depth effect using the existing boolean input `useParallax`.
Behavior: `useParallax = true` — larger particles move faster, smaller particles move slower. Keep the effect subtle.
`useParallax = false` — all particles move the same speed.
Do not modify any other logic.
```

### 本專案套用範本（未實測）

```
Create a new script called Blink.
Inputs: `eyesOpen` (Image), `eyesClosed` (Image), `minInterval` (Number, seconds), `maxInterval` (Number, seconds), `blinkDuration` (Number, seconds).
Behavior:
- Pick a random wait between `minInterval` and `maxInterval`.
- After the wait, hide `eyesOpen` and show `eyesClosed` for `blinkDuration`, then swap back.
- Repeat forever.
Do not touch any other node.
```

註：animation-statemachine.md 第 5 節已結論「本專案不需要 Scripting」，隨機眨眼用狀態機 trigger＋網頁 JS 計時器即可；上面範本只是格式示範，用不用另議。

## 3. 官方 MCP：讓 Claude Code 直接操作編輯器

- **前提**：Rive **桌面版**（Early Access，Mac／Windows）安裝並開著，且 James 本人登入；網頁版 editor.rive.app 不提供。
- **接 Claude Code**（一行）：

```
claude mcp add --transport http rive http://127.0.0.1:9791/mcp
```

- **接 Cursor**：Settings → Tools & MCPs → Add Custom MCP，貼 `{"mcpServers":{"rive":{"url":"http://127.0.0.1:9791/mcp"}}}`。
- **能動的範圍**（官方列表）：建檔／畫板（新增、改名、改尺寸、排列）；查階層、選物件、改屬性、改名、複製、排序、換父層、刪除；建 shape／path／layout／component instance／component list／asset 元素；改線性動畫、狀態機、states、transitions、conditions、keyframes、interpolation；建 View Model、屬性、instance、binding；管 Luau／WGSL 腳本、改原始碼、跑 diagnostics、重編譯、測試、搜碼、讀 console。
- **對本專案的意義**：這條路跟 SKILL.md 第 8 節的社群 rive-mcp 不同。社群版不經編輯器、雙骨權重無法手修；官方 MCP 是在真編輯器裡操作，理論上權重、IK、Draw Rule、Data Binding 都拿得到，且產物就是編輯器檔案、可續編。**但發佈 .riv 仍要 Cadet**（第 7 節 9/12 實測）。
- **未實測**：MCP 工具是否能編輯 mesh 權重（官方列表沒明寫 weights）；免費版是否能開 MCP；Chrome 自動化那套「點欄位 → cmd+a → 打字」的坑在 MCP 下應該不存在，待驗。
- **與 2026-09-10 決定的關係**：James 當時決定動畫段自己進編輯器做、CC 暫停路 D。官方 MCP 讓 CC 可以在 James 登入的桌面編輯器裡直接動手，等於路 D 的硬限制有機會解掉。是否重啟由 James 拍板，未定案前本節只當知識。

## 4. Rive CLI（不進編輯器的第三條路）

- `rive create myproject` 建專案（含給 AI 的指示檔）；`rive myproject` 開預覽視窗即時重載；`rive <dir> --verify` 驗證；`rive <dir> --screenshot` 截圖；`rive inspect`、`rive docs`、`rive schema` 給 AI 查型別與屬性。
- 寫的是 RML 文字標記＋Luau＋shader，AI 不用碰編輯器就能編譯、截圖自驗。
- 對本專案：適合向量 UI／參數化動畫，點陣角色骨架仍要編輯器；與第 4 節 rive-rs-cli 結論相同。**未實測**，未查 RML 是否支援 bone／skin。

## 5. 本節來源

- https://rive.app/docs/editor/ai-agent/ai-agent
- https://rive.app/blog/scripting-with-the-ai-coding-agent
- https://rive.app/blog/free-rive-ai-agent （2026-04-30）
- https://rive.app/blog/rive-ai-coding-agent-faq
- https://rive.app/docs/editor/ai/mcp
- https://rive.app/docs/cli/agents
- https://www.rivemasterclass.com/blog/build-dynamic-particles-system-scripting-ai-agent-rive
- 文件索引：https://rive.app/docs/llms.txt
