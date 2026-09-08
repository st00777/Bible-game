---
name: rive-rigging
description: 靈修冒險角色進 Rive 的完整知識庫與 SOP：方案授權、素材準備、編輯器綁骨／換裝／畫序、動畫與 State Machine、Data Binding、網頁 runtime 整合與效能。用於「進 Rive 綁骨」「做待機／舉手／走路動畫」「網頁接 .riv」「Rive 換裝怎麼做」「Rive 怎麼收費」。
---

# Rive 角色骨架 · 專案知識庫（2026-09-06 建立）

> 這是「先學到資深程度再動手」的成果（James 2026-09-06 要求）。四份深度筆記在 `references/`，本檔是索引＋本專案的契約與 SOP。**任何 Rive 問題先查這裡，不重新上網。** 標「未查到」的項目見第 7 節，進編輯器第一天實測補上。

## 0. 四份筆記怎麼分工

| 檔案 | 讀它解決什麼 |
|---|---|
| `references/ecosystem-and-pipeline.md` | 方案價格、匯出規則、退訂後檔案是否可用、素材解析度與格式、社群 CLI 深挖、Spine／Live2D 對比、給 James 的決策頁 |
| `references/editor-rigging.md` | 匯入零件、Bone 工具、Parent vs Mesh+Weights、IK／Translation 等約束、Solo 換裝、Draw Rule 畫序、踩坑、從空白到舉手的 22 步 SOP |
| `references/animation-statemachine.md` | 待機（呼吸／眨眼／斗篷）、姿勢過渡數值、Layers 分工、Data Binding、Events、Luau 要不要用、State Machine 建置 SOP 與驗收清單 |
| `references/web-runtime.md` | 套件選擇、載入方式、inputs 與 Data Binding 兩套 API、換裝兩種寫法、效能、Artifact CSP 限制、除錯工具、可直接貼的完整 HTML 範例 |

## 1. 決策級結論（已查證）

- **費用**：編輯器免費，**發佈 .riv 要 Cadet**（US$9/月年繳、US$17 月繳）。**發佈過的檔案退訂後永久可用**，runtime MIT 免費。策略：訂一個月密集產出，發佈完取消，要改再訂。商用（教會免費遊戲）無額外限制。
- **帳號**：要 James 本人登入 editor.rive.app；我用 Chrome 自動化操作同一個 session。檔案存雲端；Cadet 沒有 revision history，原始零件與 JSON 用 git 管。
- **社群 CLI `rive-rs-cli`**：低階格式有 bone／skin／mesh，但 **bone 沒有 rotation 欄位，骨骼動畫做不到**；只能用 node 當樞紐做單關節。不走這條。
- **Spine** 更專業但買斷 US$69／379、無內建狀態機；**Live2D** 定位不合；**Lottie** 無骨架。Rive 是我們的正解。
- **Runtime 換代中**：`stateMachineInputs()`、`onStateChange`、Events 在 2.42.0 都印 deprecation 警告，仍可用；**新檔案一律用 Data Binding（View Model 屬性）**。
- **換裝官方定調**：需骨骼綁定變形的部位用 **Solo＋Enum（Convert to Number 綁 Active）**；不需變形的整塊替換用 **Data Binding Image 屬性**。本專案：外袍三色＝Solo（要跟骨頭變形）；頭飾、手持、背景＝Image 屬性（剛體）。
- **畫序**：Draw Rule 目標只能是 Shape；不能內插只能 Hold key；沒有直接綁 input 的 API。做法＝把「前臂在外袍前」的 Hold key 打進舉手 timeline，State Machine 只切動畫。
- **IK**：constraint 掛在鏈末端骨頭，Bone Count=2；沒有 pole vector，只有 Invert Direction 開關。
- **手持物保持直立**：不要 parent 進手臂；用 **Translation Constraint** Copy X／Y=100%、Destination Space=World，Rotation 獨立。
- **Artifact 預覽**：只能用 `@rive-app/canvas-single`（WASM 內嵌）＋`buffer:`（base64）＋`enableRiveAssetCDN:false`；正式站用 `webgl2` 或 `canvas` 走 `src:`。手機多實例或多 blend mode 選 `canvas`。
- **效能**：分頁切背景 runtime 自動停；捲出畫面用 IntersectionObserver 接 `stopRendering()`；卸載必呼叫 `cleanup()`；夜間放慢用 Number 屬性綁 Speed，不降幀率。
- **素材**：進 Rive 一律 PNG（WebP 匯入支援未查證）；角色切件總高抓顯示尺寸 2.5–3×（約 500–700 px）；壓縮在編輯器 Assets 面板選 WebP；**母圖切件**維持，不分開生零件。

## 2. 本專案契約（寫進 app.js 前凍結，改名＝斷連結）

**零件（PNG，從母圖切，貼輪廓，關節處彼此重疊）**
`img_head`、`img_torso`、`img_uarm_L/R`、`img_farm_L/R`（含手）、`img_skirt`、`img_boot_L/R`；外袍每色三片 `img_cloak_<色>_hoodback/upper/lower`（色：purple／oat／blue）；頭飾 `img_hat_straw`、`img_head_wreath`；手持 `img_item_lamp`、`img_item_crook`；眼皮 `img_lid_L/R`（膚色片，Scale Y 眨眼）。

**骨架（root 在骨盆）**：`bone_hips` → `bone_torso` → `bone_neck`（頭）；`bone_torso` → `bone_uarm_L` → `bone_farm_L`（右側同）；`bone_hips` → `bone_waist`（裙、外袍下片）；`bone_hips` → `bone_leg_L/R`（靴）。關節座標（母圖 460×768）：neck (230,205)、肩 (172,222)/(288,222)、肘 (142,320)/(318,320)、手 (125,470)/(335,470)、waist (230,330)、hips (230,340)、腿 (188,650)/(272,650)——見 `img/style-ref/p1/rig2/parts.json` 與 `cut.py`。
**綁法**：頭、靴、手持＝Parent 剛體；上臂、前臂、外袍上下片、裙＝Mesh＋Weights（關節頂點兩骨共享約 50/50，非關節 100%，肘部加密頂點）。
**畫序（下→上）**：靴 → 裙 → 外袍下片 → 上身 → 上臂 → 前臂 → 外袍上片 → 帽兜後片 → 頭 → 眼皮 → 頭飾 → 手持。舉手 timeline 內用 Draw Rule Hold key 把前臂切到外袍上片之上。

**View Model `CharacterVM`**（Data Binding，camelCase）：
| 屬性 | 型別 | 用途 |
|---|---|---|
| `liftTrigger` / `bowTrigger` / `celebrateTrigger` / `blinkTrigger` | Trigger | 舉手／低頭／完成儀式／眨眼（JS 隨機 2–6 秒觸發） |
| `isWalking` | Boolean | 原地走路循環 |
| `nightFactor` | Number | 1.0 白天、0.5 夜間，綁各 State 的 Speed |
| `cloakColor` | Enum（None/Purple/Oat/Blue） | Convert to Number 綁 `solo_cloak` 的 Active |
| `hatImage` / `heldItemImage` | Image | 頭飾、手持換圖 |

**State（PascalCase）與 Layers**：`Body`：Entry→Idle⇄Walk（isWalking）、Idle→Lift／Bow（Trigger，Exit Time 100%、關 Allow Exit During Transition、Duration 0.15–0.3 s、Cubic）、Any State→Celebrate；`Face`：FaceIdle→Blink（Trigger）。同一屬性只給一個 Layer 動；呼吸走骨頭不走 Scale。

**2026-09-08 定案對契約的修訂（依 `docs/animation-map.md`，進編輯器時凍結）**
- 新增 artboard：`Lamb`（小羊：Idle 低頭吃草／抬頭、`lookUpTrigger`、`approachTrigger`）、`CharacterSit`（3/4 側面坐姿，只掛 `img_sit_<族>_<色>` 三族預產色版＋固定行囊 `img_sit_pack`，不掛頭飾／手持）。
- `cloakColor` Enum 改為 `cloakStyle`（None/Cape/Tunic/Robe）＋ `cloakColor`（Purple/Oat/Blue）；Cape 無袖，Tunic／Robe 各自帶 `img_sleeve_<族>_<色>_L/R`（不共用手臂皮膚）。
- 新增 Trigger：`tryOnTrigger`（試穿小動作）、`scrollTrigger`（完走收卷入背包）；`celebrateTrigger` 拆成 `liftTrigger`（白天舉手）與 `lampTrigger`（深夜抬燈），由 JS 依 22:00–04:59 口徑擇一。 兩者肘角一律 <10°（路 D 肘彎 >15° 網格塌）；`lampTrigger` 幅度小於 `liftTrigger`、Speed 綁 `nightFactor`、燈光暈強度降低。`tryOnTrigger` 只動手腕／手持物，不轉軀幹。`CharacterSit` 必掛呼吸微位移，不可全靜態。
- `isWalking` 保留欄位但第一版不做走路；出發＝`lampTrigger` 不轉身，無背面零件。
- 性別：`genderSkin` Enum（A/B），同骨架同關節座標；「不指定」映射待數據。

## 3. 進編輯器的 SOP（濃縮版，細節看 references）

1. **素材**：`cut.py` 從母圖切件（貼輪廓多邊形），每件 PNG 剛好裁邊、命名即最終名。
2. **Artboard**：建 460×768（或依顯示區），匯入 PNG，依部位分 Group。
3. **骨架**：`B` 從骨盆畫鏈，`Y` Freeze 校 pivot 到關節，命名照第 2 節。
4. **綁定**：剛體零件拖進骨頭；柔性零件 Enter→Mesh（Auto Trace 起手，`P` 補頂點，`V` 編網格）→ Bind Bones（`+`）→ Auto Weights → `W` 手修關節權重；旋轉骨頭實測。
5. **IK**：前臂骨加 IK，Bone Count 2，Target group，Invert Direction 校方向。
6. **換裝**：外袍三色包 Solo；建 Enum，Export Names，Enum→Solo.Active（Convert to Number）。頭飾、手持建 Image 屬性。手持物用 Translation Constraint 綁手。
7. **動畫**：Idle（呼吸＋斗篷，3–6 s loop）、Blink（Scale Y，0.15–0.25 s）、Lift、Bow、Walk（首尾對齊，Graph Editor 看切線）、Celebrate 佔位；預設插值 Cubic；舉手內打 Draw Rule Hold key。
8. **State Machine**：依第 2 節建 Layers／States／Transitions；每個 Input 在編輯器內先手動觸發驗過。
9. **Data Binding**：建 `CharacterVM`，Speed 右鍵 Data Bind 到 `nightFactor`（先在一個 State 試）。
10. **發佈**：Assets 面板圖片壓縮設 WebP；刪未用 artboard；Publish（需 Cadet）。用 Rive Analyzer 看評級。
11. **接網頁**：正式站 `webgl2`／`canvas`＋`src:`；示意用 `canvas-single`＋`buffer:`；`onLoad` 後才碰 `viewModelInstance`；`resizeDrawingSurfaceToCanvas()`；卸載 `cleanup()`。範例在 `references/web-runtime.md` 第 8 節。

## 4. 進 Rive 前先修的三個瑕疵（James 2026-09-06 指出）

1. 前臂切件帶到腰：`cut.py` 的前臂多邊形改沿袖子輪廓（可先用 alpha 邊緣找袖子外緣，再手加內側點），疊回母圖差異仍要 <0.1%。
2. 外袍角度：母圖外袍要「STRICT FRONT VIEW、左右對稱、開襟」，正式用 ChatGPT 重生，Gemini 只做預覽；不合就重生，不沿用。
3. 淺藍外袍前襟中空：重生時明寫「front panels meet at the centre, no gap, robe visible only at the neckline」。

## 5. 驗收清單（每次進版）

- [ ] 每個 Input／屬性名稱與 `app.js` 逐字一致（靜默失敗最難抓）。
- [ ] 快速連按舉手／低頭不穿模、不卡中間姿勢。
- [ ] Idle／Walk 循環無跳格。
- [ ] 換三色外袍時骨骼變形一致；換頭飾、手持圖片尺寸與佔位圖同比例。
- [ ] 手機（低階機）實測幀率；`enableFPSCounter()`。
- [ ] `.riv` 大小與 Analyzer 評級記錄到 `docs/`。

## 6. 命令與工具速查

```
jsdelivr：https://cdn.jsdelivr.net/npm/@rive-app/canvas-single@2.42.0/rive.js
列出檔案內容：r.contents（onLoad 後）
除錯：r.enableFPSCounter()、enablePerfMarks:true、Rive Playground、Rive Analyzer
```

## 7. 未查到、第一天進編輯器要實測

- Cadet 有無 revision history；免費版是否完全不能發佈（非浮水印）。
- 編輯器能否直接匯入 WebP；圖片壓縮面板實際選項。
- Number 屬性右鍵 Data Bind 到 State Speed 的實際操作。
- Transition Duration／Exit Time 官方沒給建議值，用 0.15–0.3 s 起手再調。
- Draw Rule 是否能被 Data Binding 直接綁（目前只知 Hold key）。
- Luau Scripting 在 Cadet 是否可用（本專案不需要）。
- Pivot 抖動、mesh 邊緣鋸齒的官方說法；community 討論串需用瀏覽器開才讀得到內文。
- `canvas-lite` 有無內嵌 WASM 單檔版。

## 8. 路 D：rive-mcp 不經編輯器產 .riv（2026-09-07 實測，James 同意後做）

- **工具**：`~/bible-work/tools/rive-mcp`（GitHub ODU33104/rive-mcp，commit 36d55f9，從原始碼 build；授權免費含商用、產出自由、**禁改碼禁 fork**）。不註冊成 MCP（32 個工具定義太肥），用 `img/style-ref/p1/rig2/rive/rmcp.mjs` 走 JSON-RPC 直接呼叫。
- **已驗證可用**：骨頭鏈（RootBone→Bone，child 從 parent 尖端起、無法偏移→用鎖骨段接肩膀）、圖片掛骨頭、網格自動權重綁兩骨（最近兩骨、4 次方衰減，**無法手修權重**）、Solo＋`soloActive` hold key 換袍與模擬 Draw Rule、多層狀態機（trigger／number）、官方 runtime 2.42 在 Chrome 播放 60 fps（CPU 降速 6× 仍 60）。
- **限制**：無 Data Binding／View Model（只能狀態機 inputs，runtime 印 deprecation）；無 IK pole；**群組不能夾在兩段骨頭之間**（writer 先出全部骨頭再出掛在骨頭下的群組）；圖片只吃 PNG（先用 `magick -colors 255 PNG8:` 量化，858 KB→246 KB，視覺差 0.13%）；**rive-mcp 自己的預覽渲染器不畫 Skin**，網格綁骨要用 `browser-run.mjs` 在真 Chrome 看；.riv 不能匯回 Rive 編輯器。
- **產物**：`img/style-ref/p1/rig2/rive/`（產生器、.riv、量化零件、手機測試頁模板、README）；手機驗證頁 Artifact `https://claude.ai/code/artifact/45b55b79-6f2f-4b2e-94d7-3604f8aa97fb`。
- **下一步判準**：James 手機三條（≥30 fps、舉手不穿模、換袍不重綁）過了，再決定：正式版留在路 D（接受無 Data Binding、權重不可手修），或訂 Cadet 進編輯器重做（檔案不互通，要重綁）。
- **2026-09-07 晚 實測坑（James 手機看到手臂細成一條）**：不是素材，是 rive-mcp 的自動權重（距離最近兩骨、4 次方衰減）在手肘相對彎 38° 時整段袖子塌成緞帶；同一張圖只綁一骨、或剛體掛骨、或手肘只彎 6° 都正常。**結論：rive-mcp 的雙骨網格只能做「近乎直臂」的動作，任何真正彎關節的動作都要手修權重＝要 Rive 編輯器。** 現行手機驗證頁已改用 v4D（高舉、手肘不彎）。
