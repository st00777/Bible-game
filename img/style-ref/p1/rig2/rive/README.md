# rive-mcp 骨架驗證（2026-09-07）
- `gen-rig-v4.mjs`：從 `parts-q/`（256 色量化 PNG）＋ `../parts.json` 產生 SceneSpec；跑法 `ARM_BBOX='{"x":274,"y":206,"w":85,"h":275}' node gen-rig-v4.mjs`，再 `node rmcp.mjs riv_create rig-v4.args.json out`。
- `rmcp.mjs`：不註冊 MCP、直接 spawn `~/bible-work/tools/rive-mcp/dist/index.js` 走 JSON-RPC 呼叫工具。
- `browser-run.mjs` / `fps-test.mjs`：用 playwright-core 在真 Chrome＋官方 runtime 驗（rive-mcp 自己的預覽渲染器**不畫網格綁骨**，看起來像沒動）。
- `rive-phone-test.tpl.html`：手機測試頁模板，`__B64__` 換成 .riv 的 base64。
- `traveler-v4.riv`：246 KB，SM 輸入 `lift`(trigger)、`cloak`(number 0紫 1麥 2藍 3無)。
