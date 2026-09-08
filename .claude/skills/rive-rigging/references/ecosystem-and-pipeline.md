# Rive 生態系與素材產線知識庫

> 目的：釐清 Rive 的方案／授權／匯出規則、AI 生圖角色進 Rive 的素材準備 SOP、以及不經編輯器產出 `.riv` 的替代路線（`rive-rs-cli`），供靈修冒險遊戲角色動畫決策使用。
> 查證日期除特別標註外，皆為 **2026-09-06**。
> 背景：一人團隊、手機網頁小遊戲、角色圖由 AI 生圖（ChatGPT／Gemini）再去背切件；決策者 James 願意付費但要先確認值得；Claude Code 可操作 Chrome 自動化 GUI，但 Rive 編輯器登入需 James 本人。

---

## 1. 方案與授權

Rive 於 **2025-10-20** 推出新訂價結構：編輯器對所有人保持免費（含 2D／3D 建立與動畫製作），**「匯出」改名為「發佈」（publish），發佈 `.riv` 檔案需要付費方案**。這是舊模式（免費可匯出、進階功能才收費）的反轉。

### 方案總覽（2026-09-06 查證，`rive.app/pricing`）

| 方案 | 價格 | 匯出／發佈 `.riv` | 席位上限 | Revision History | 協作檔案 | 其他 |
|---|---|---|---|---|---|---|
| **Free** | US$0 | ❌ 不可發佈 | 無限（但功能受限） | ❌ 無 | 3 個協作檔案 | 可完整使用編輯器學習／設計 |
| **Cadet** | US$9/月（年繳）／US$17/月（月繳） | ✅ 無限次發佈 | 最多 3 席 | ❌ 無（未在文件中確認有） | 無限 | 標籤、資料夾、新功能搶先體驗 |
| **Voyager** | US$32/席/月 | ✅ | 最多 25 席 | ✅ 無限 | 無限 | 資料庫與協作、CDN 資產託管、AI agent 額度 US$20/席/月 |
| **Enterprise** | US$120/席/月（年營收 US$10M+ 門檻，方案頁另有敘述） | ✅ | 無限 | ✅ 無限 | 無限 | SSO、SOC2 Type II、專屬 Slack 支援、AI agent 額度 US$40/席/月 |

> 對我們的判讀：一人團隊、單純角色動畫，**Cadet（US$9/月年繳）已足夠**——3 席遠超需求，也能無限發佈。Voyager 的「協作」「CDN 資產託管」「revision history」對單人專案價值有限，除非未來需要跟其他協作者共同編輯或需要正式版本回溯機制。

### 商用授權

- Rive 服務條款明確：**「你擁有你的 User Content，Rive 不主張任何擁有權」**（`help.rive.app/legal/terms-of-service`）。輸出的 `.riv` 與角色美術資產歸我們所有，教會免費小遊戲的非營利商用不受額外限制。
- 未查到「教會／非營利」專屬優惠或限制條款；一般商用（含免費 App／遊戲）沒有被排除在 Cadet 方案之外。
- 未查到方案頁面針對匯出檔案有浮水印的敘述；2025-10 訂價公告與 rivemasterclass 的說明都只強調「免費方案不能發佈」，沒有提到「免費也能發佈但有浮水印」這種折衷（即：免費方案是**完全不能發佈**，不是打浮水印限制）。

### 取消訂閱後的既有檔案

- 官方 2025-10 公告（`rive.app/blog/rive-s-new-9-mo-plan`）明確承諾：
  - **「已發佈的匯出永久有效，無需持續訂閱」**（exports keep working exactly as they do today — forever）。
  - Rive 檔案「不會 phone home、不依賴有效訂閱」。
  - 執行時（runtime）保持開源 MIT 授權。
- 結論：**付費期間發佈出來的 `.riv` 檔案，取消訂閱後仍可正常使用**（在自己的遊戲裡繼續載入播放不受影響）；但取消後若要**重新發佈**新版本或修改後再匯出，就需要恢復付費方案。這對我們的策略很關鍵：可以「訂閱一個月、密集產出所有角色動畫、發佈完畢後取消」，之後只在要更新動畫時才重新訂閱。

**來源**：
- [Rive Pricing](https://rive.app/pricing)（2026-09-06）
- [Rive's new $9/mo plan](https://rive.app/blog/rive-s-new-9-mo-plan)（2026-09-06）
- [New pricing](https://rive.app/blog/new-pricing)（2026-09-06，2023 年舊公告，僅作歷史對照）
- [Rivemasterclass: export now requires paid plan](https://www.rivemasterclass.com/updates/export-now-requires-paid-plan)（2026-09-06）
- [Terms of Service](https://help.rive.app/legal/terms-of-service)（2026-09-06）
- [Pricing docs](https://rive.app/docs/account-admin/pricing)（2026-09-06）

---

## 2. 帳號與協作

- **多人共用一帳號登入**：未查到官方明確允許或禁止「一個帳號多裝置／多人共用」的條款文字（`help.rive.app/getting-started/faq-1` 重導向後回傳 404，無法直接查證 FAQ 原文）。以「席位（seat）」計費的商業模式通常隱含「一席位對應一個使用者」，但對一人團隊而言不構成問題——James 一人登入即可，Claude Code 透過 Chrome 自動化操作也是同一個已登入 session，不涉及多帳號問題。
- **檔案存放**：編輯畫面的即時編輯狀態存在瀏覽器本機儲存，斷線可續編；恢復連線後才與 Rive 的線上 revision manager 同步。也就是說**檔案本體仍以雲端為主**，本機只是離線緩衝，不是「本機檔案」模式（不像 Figma 有純本機檔案選項）。Enterprise 方案另有「檔案存自己 S3」的選項，但即時編輯仍在 Rive 基礎設施上進行。
- **Revision History**：官方文件（`rive.app/docs/editor/fundamentals/revision-history`）說明其運作方式（自動存檔、多人同時編輯時追蹤所有變更、可手動建立具名版本、還原採非破壞性複製），但**文件本身未寫明這功能屬於哪個付費層級**；價格頁對照表顯示 Free／Cadet 無 revision history，Voyager／Enterprise 才有「無限 revision history」。對單人小專案影響不大，用 Git 管理原始素材 JSON／PNG 已可達到版本控管效果。
- **匯出檔案的版本相容性（編輯器版本 vs runtime 版本）**：
  - `.riv` 格式採「主版本＋次版本」雙層機制。**主版本不向後相容**：目前主版本是 7，執行時（runtime）只認得單一主版本；runtime 7.x 讀到主版本 6 的檔案會直接報錯拒讀，反之亦然。
  - 次版本內相容：舊 runtime 可以讀新次版本檔案，新功能會被當作「no-op」忽略，不會當機，但也用不到新功能。
  - 若專案使用的 runtime 版本較舊，編輯器匯出時提供「相容舊版 runtime」的匯出選項，可匯出對應舊主版本格式的 `.riv`。
  - 對我們的意義：只要遊戲端 `<script>` 引入的 `@rive-app/canvas`／`@rive-app/webgl2` 版本與編輯器發佈時使用的主版本一致（目前都對應主版本 7），就不會有相容性問題；長期維護只需留意升級 runtime 套件版本時是否跨主版本。

**來源**：
- [FAQ 重導向頁（404，無法完整查證）](https://rive.app/docs/getting-started/faq-1)（2026-09-06）
- [Revision History docs](https://rive.app/docs/editor/fundamentals/revision-history)（2026-09-06）
- [.riv File Format docs](https://rive.app/docs/runtimes/advanced-topic/format)（2026-09-06）
- [Exporting for older runtimes（搜尋摘要）](https://help.rive.app/editor/exporting)（2026-09-06）
- [New Enterprise feature: file storage](https://rive.app/blog/new-enterprise-feature-gives-control-over-rive-file-storage)（2026-09-06）

---

## 3. 素材準備 SOP：AI 生圖 → 去背 → 切件 → 進 Rive

> 本節綜合 Rive 社群普遍建議與現有 `bible-art-assets` skill（Gemini 生圖＋rembg 去背＋ImageMagick 切件流程）的既有作法。

### 解析度建議

- Rive 是**向量優先**的工具，內建形狀（矩形／橢圓／路徑）在任何縮放下都不會糊；但**點陣圖片資產（角色 PNG 切件）在編輯器裡不會自動變成向量**，會維持點陣特性，放大會糊。
- 手機遊戲常見做法：以「目標顯示尺寸 × 2（給 Retina/高 DPI 螢幕）」作為匯入解析度的下限，再留一點餘裕給互動時的放大特效（例如角色講話時輕微放大）。
- 具體到我們的化身角色：若遊戲內角色顯示高度約在 150–250 CSS px 之間，建議**匯入切件的角色整體高度抓 500–700 px**（即約 2.5–3x 顯示尺寸），單一部位（帽子、手持物）依比例更小，但單邊不要低於 150 px，避免邊緣鋸齒感。過大沒有加分，只會拖累檔案大小與載入速度。

### PNG vs WebP

- Rive 編輯器匯入的圖片資產目前廣為使用的格式是 **PNG（含透明度）**；WebP 支援度在社群討論中不如 PNG 穩定可靠，建議素材準備階段統一先出 PNG 去背檔進 Rive，若要在遊戲最終產物中壓縮體積，交給 Rive 編輯器內建的圖片壓縮設定去處理（見下）。
- 未查到 Rive 編輯器原生支援直接匯入 WebP 的官方文件佐證，建議維持現有 `bible-art-assets` skill 的「PNG 去背 → 之後另外轉 webp 給網頁其他用途」分流做法，**進 Rive 的素材一律用 PNG**。

### PSD 分層匯入

- Rive 編輯器支援從 Figma／PSD 等分層來源匯入，但社群普遍建議：**分層匯入比較適合「向量圖形＋插畫」流程**（Figma 向量圖層直接對應 Rive 的向量物件）；對於 AI 生圖產生的**點陣圖角色**，分層 PSD 匯入的價值有限，因為每個圖層進來後仍是獨立點陣圖片資產，Rive 不會幫你把點陣內容轉成可變形的向量骨架。
- 對我們的情境（AI 生圖 + 去背切件），**沒有必要走 PSD 分層匯入這條路**；直接把切好的單一部位 PNG（頭、身體、帽子、衣服、手持物等）逐一拖進編輯器、手動組織階層即可，跟現行 `bible-art-assets` 的切件產出流程完全對得上。

### 編輯器內壓縮設定

- 未在本輪查證中找到 Rive 編輯器「圖片壓縮設定」的獨立官方文件頁面（**未查到**具體壓縮率選項、格式轉換規則的完整說明）。可確認的間接證據：Rive 官方部落格在對比 Lottie 案例時提到「Rive 原生檔案遠小於匯入的 Lottie 檔案」（16KB vs 267KB），暗示 Rive 對向量內容的編碼效率高，但這是向量圖形案例，不直接代表點陣圖片資產的壓縮行為。
- **建議**：素材準備階段就把 PNG 裁到剛好的實際使用尺寸（不留多餘透明邊界）、去背乾淨、必要時用 ImageMagick 做初步的調色深度／去雜訊處理，把「進 Rive 之前的檔案就已經是最終品質」當作原則，不要依賴編輯器內的壓縮來補救素材品質或體積問題。

### 命名慣例

- 沿用 `bible-art-assets` skill 現有的分層命名慣例（角色/部位/狀態），並在其上加一條 Rive 專屬建議：Rive 匯入後的物件命名（node name）會直接對應到動畫綁定與 state machine 的參照名稱，**建議命名時就用最終要在 Rive 裡用的語意名稱**（例如 `head_default`、`hat_slot`、`arm_l_upper` 而非 `img_gen_003`），減少之後在編輯器裡重新命名、綁定關係跑掉的風險。

### 「母圖切件」vs「分開生零件」

- Rive 社群對角色骨架動畫的普遍建議是：**角色各部位（頭、軀幹、上臂、下臂、手、腿）分開作為獨立的可變形節點**，才能個別綁到骨架（bone）或約束（constraint）上獨立旋轉／位移。
- 兩種產出路徑的取捨：
  - **母圖切件**（先生一張完整角色全身圖，再去背後用 ImageMagick／人工切出各部位）：優點是風格與比例一致性最好（同一次生圖、同一光影／同一調色），這正是我們現有管線的做法；缺點是切件邊界處理不當容易在關節處露出破綻（例如手臂與軀幹交界處的陰影不連續）。
  - **分開生零件**（分別對每個部位下 prompt 生圖）：優點是每個部位可以生成得更乾淨、無需切割破壞邊界；缺點是**風格與光影很難跨多次生圖保持一致**，這正是本專案先前已經踩過的坑（見專案記憶：「人物冊頭像暫緩」— 跨批風格無法一致故不做）。
- **建議**：延續現行「母圖切件」路線，這與我們既有的風格錨定流程（Gemini 附風格錨圖生圖）相容；只在關節交界處加強去背與局部修邊（可用 ImageMagick 做羽化/feather），降低組裝後的違和感。不建議切換到「分開生零件」，因為我們已知風格一致性是本專案的痛點與否決過的方向。

**來源**：
- Rive 官方部落格 Lottie 對比案例（[Rive vs Lottie](https://rive.app/blog/rive-as-a-lottie-alternative)，2026-09-06）
- 專案內部記憶：`project_character_portraits_deferred.md`（人物冊頭像暫緩，跨批風格無法一致）
- 現有 `bible-art-assets` skill 既定流程（Gemini 生圖＋風格錨＋rembg 去背＋ImageMagick 切件＋webp 轉檔）
- 圖片格式與 PSD 匯入建議部分：綜合 Rive 社群一般實務認知，**未查到**單一官方頁面完整敘述壓縮設定與 WebP 支援度，屬本輪查證的缺口（見第 7 節）。

---

## 4. `rive-rs-cli` 深挖

倉庫：[George-RD/rive-rs-cli](https://github.com/George-RD/rive-rs-cli)，MIT 授權。查證日期 2026-09-06（`git clone` 本機檢視原始碼與文件）。

### 專案體質

- GitHub 統計：**5 stars、0 forks、8 個 open issues**，建立於 2026-02-17，**最後一次 push 就在今天 2026-09-06**——確實是「5 星個人專案」，但**非常活躍地在開發中**（幾乎每天有進度），不是丟著沒維護的玩具專案。
- 作者是單一開發者（George RD），專案內含大量自建的 CI、parity（與官方 runtime 比對）、fuzz 測試、Playwright 視覺回歸測試，工程嚴謹度高於一般個人專案，但**風險仍是「單一維護者、無官方背書、Issue 待修復清單仍長」**。

### 安裝

- **有預編譯二進位**：GitHub Releases 提供 macOS（Intel／Apple Silicon）、Linux glibc x64、Windows x64 的壓縮檔，下載解壓後放進 `PATH` 即可，不需要自己編譯。
- 也可用 Cargo 從原始碼建置（`cargo build --release`）。

### 兩層 JSON 輸入格式

`rive-cli` 明確區分兩種 JSON 輸入層級，且**不會自動判斷用哪一種**，要用不同子命令：

1. **`generate`（低階 / 原始 SceneSpec）**：直接對應 `.riv` 底層物件圖，`type`／`children` 的巢狀 JSON 結構（例：`{"type": "shape", "children": [...]}`），控制力最強、也最貼近官方檔案格式，但需要理解 Rive 內部物件模型。
2. **`authoring compile`（高階 / AuthoringSpec v0）**：AI 友善的語意化格式，分 `font_assets`／`image_assets`／`components`／`visual`／`motion`／`behavior` 四張圖＋資產表，會編譯（lower）成上面的 SceneSpec，並回傳 source map。

### 高階格式（AuthoringSpec v0）支援什麼

根據 `docs/authoring-spec-v0.md` 逐字確認，v0 的「visual 編譯器切片」**明確列出**支援：橢圓、矩形、三角形、多邊形、星形、純文字、靜態圖片（image node）、群組（group）、元件實例（component instance）、決定性排列 pattern（grid／radial／mirror／distribute／along-path）、群組內的 transform-anchor 約束、字型與圖片語意資產、以及 `raw_scene_object` 逃生艙。

`motion`（時間軸／關鍵影格）與 `behavior`（狀態機）也有支援，但**明確標示為刻意漸進、範圍受限**：
- **motion**：具名 pose 與軌道、每軌可設定 `continuity`（逐格 vs 穿越型緩動）與逐格 `waypoint`，以及 `raw_animations` 逃生艙。
- **behavior（state machine）**：bool 型 view model、bool／number／trigger 三種輸入、具名事件、監聽器、具名狀態（可播放單一動作或至少兩軌混合）、平行 region、以及 binding／boolean／comparison／trigger 四種轉場條件，加上 `raw_state_machines` 逃生艙。

**AuthoringSpec v0 完全沒有骨架（bone／root_bone／skin／tendon／weight）與網格（mesh）的高階語意支援**——文件正文列舉的物件類型清單裡沒有出現任何骨架或網格詞彙，只能透過 `raw_scene_object` 逃生艙插入原始 SceneSpec 片段來間接使用。

### 低階格式（原始 SceneSpec）確實支援骨架與網格

實際檢視原始碼與測試 fixture（`tests/fixtures/bones.json`、`tests/fixtures/mesh.json`、`src/objects/bones.rs`）確認：

- **骨架物件已完整建模**：`root_bone`（骨架根，帶 x/y/length）、`bone`（子骨頭，帶 length，透過 `parent_id` 串接階層）、`skin`（綁定矩陣 xx/yx/xy/yy/tx/ty）、`tendon`（連接 skin 與特定 bone）、`weight` / `cubic_weight`（頂點的骨骼影響權重，含平滑立方權重）都有對應的 Rust struct、`type_key`、屬性序列化，且有專屬單元測試與 `test_generate_bones` / `test_validate_bones` / `test_inspect_bones` 端對端測試。
- **網格（mesh）與圖片扭曲已建模**：`mesh`、`contour_mesh_vertex`（含 UV）、`mesh_vertex`、`forced_edge` 都有對應物件，`docs/parity.md` 記錄了 mesh 曾經有一個真實 bug（`triangleIndexBytes` 欄位缺漏導致 runtime `InvalidObject`）已被修復並有回歸測試防護。

### 關鍵限制：目前無法設定／關鍵影格化 Bone 的旋轉

這是本輪查證最重要的具體發現，直接回答「圖片掛在骨頭上旋轉」的可行性：

- 檢視 `src/builder/spec.rs` 的 `ObjectSpec::Bone` 定義：**只有 `name`、`length`、`children` 三個欄位**，完全沒有 `rotation`（也沒有 x/y/scale）。`RootBone` 多了 `x`、`y`，但一樣**沒有 `rotation`**。
- `CHANGELOG.md`「Unreleased」段落明確列出目前有靜態變換支援的物件類型：*「`node`、`shape`、`ellipse`、`rectangle`、`triangle`、`polygon`、`star` 接受 `x`、`y`、`rotation`、`scale_x`、`scale_y`」*——這份清單**沒有列出 `bone`**。
- 結論：**目前的 `rive-cli` 可以用 JSON 建出骨架的階層結構（root_bone → bone → bone…）、可以設定骨頭長度，但無法透過 JSON 設定或關鍵影格化骨頭的旋轉角度**。也就是說，「用骨架擺姿勢／做骨骼動畫」這個核心用途，在目前版本的 `rive-cli` 是**做不到的**，這是一個實質的功能缺口（可能是尚未實作、也可能是待補的 issue，倉庫的 8 個 open issues 中沒有明確對應到這一點，屬推測）。

### 「圖片掛在骨頭上並旋轉」最小 JSON 可行性判斷

嚴格按照題目要求（圖片節點掛在 bone 上、旋轉這個 bone）：

- **無法完全做到**——因為 `bone` 物件不支援設定/關鍵影格化 `rotation`，即使能把 `image` 節點的 JSON 結構放進 `bone` 的 `children` 陣列（`valid_parents_for` 對 `image` 與 `bone` 都落在通用的 `_ => &["any"]` 規則，程式碼層面沒有明確擋掉這個父子關係），旋轉這個 bone 本身仍然辦不到，所以整個「靠骨頭旋轉帶動圖片」的效果目前做不出來。
- **可行的替代寫法（不算嚴格符合題目、但能達到同樣視覺效果）**：不用 `bone`，改用一般的 `node`（已確認支援 `x`／`y`／`rotation`／`scale_x`／`scale_y` 且可關鍵影格化）當作旋轉樞紐（pivot），把 `image` 節點放進這個 `node` 的 `children`，然後對 `node` 的 `rotation` 屬性做 keyframe 動畫。效果等同於「單一關節的 FK 旋轉」，只是物件類型是 `node` 不是語意上的 `bone`。最小 JSON 骨架大致如下（示意，非逐欄位驗證過的可執行範例）：

```json
{
  "scene_format_version": 1,
  "artboard": {
    "name": "ArmDemo",
    "width": 300, "height": 300,
    "children": [
      { "type": "image_asset", "name": "ArmImg", "asset_id": 0 },
      {
        "type": "node",
        "name": "ArmPivot",
        "x": 150, "y": 150,
        "children": [
          { "type": "image", "name": "ArmImage", "asset_id": 0, "x": 0, "y": 0 }
        ]
      }
    ],
    "animations": [
      {
        "name": "Swing",
        "keyed_objects": [
          {
            "object": "ArmPivot",
            "keyed_properties": [
              {
                "property": "rotation",
                "keyframes": [
                  { "frame": 0, "value": -0.3 },
                  { "frame": 30, "value": 0.3 }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

  （欄位命名以 `rive-cli schema` / `rive-cli describe node` 實際輸出為準，上面只是示意結構，未逐一跑過 CLI 驗證。）

- 若堅持要用真正的骨架（例如未來要做多關節的角色骨骼動畫、或要用到 mesh 網格變形），目前只能：(a) 等作者補上 Bone 的 rotation 支援，或 (b) 自己 fork 專案在 `src/objects/bones.rs` / `src/builder/spec.rs` / `src/builder/objects.rs` 補上 `rotation` 欄位並補齊編碼邏輯（工程量不算小，涉及理解 Rive 二進位格式與屬性 key 對應）。

### 用官方 runtime 驗證輸出的方法

`rive-cli` 內建三層驗證機制，且都是這個工具本身工程嚴謹度較高的地方：

1. **`rive-cli validate FILE`**：用自帶的 binary reader/parser 檢查檔案結構是否合法。
2. **`rive-cli render FILE`**：不透過 Node/Playwright，而是**直接用 Rust 透過 CDP 驅動 headless Chromium**，載入官方的 `@rive-app/canvas` runtime（倉庫內嵌 `assets/rive.js` + `assets/rive.wasm`，目前釘選版本 2.39.1）實際播放並輸出 PNG 影格，還會印出 ASCII 覆蓋率預覽、主色占比、內容邊界，可以在完全不看畫面的情況下用文字判斷渲染是否正確。
3. **`rive-cli compare REFERENCE CANDIDATE`**：把自製檔案與官方原廠 `.riv`（例如從 `rive-app/rive-runtime` repo 抓下來的官方範例）都渲染出來，逐物件型別計數比對＋逐幀像素差異百分比，可設 `--max-pixel-diff` 當作 CI gate。`docs/parity.md` 記錄了作者已經拿官方 `button.riv`（像素差 0.0000%）、`coffee_loader.riv`（像素差 0.2833%）做過這種比對並找出、修掉了好幾個編碼錯誤（例如 ToC 打包對齊錯誤、`stroke.transformAffectsStroke` 預設值錯誤等）。

**已知限制與風險（綜合 `docs/parity.md`「Fixture Runtime Gaps」與已修 bug 清單）**：
- `scripting`（Rive 的腳本系統）與部分 `transition_comparators` 相關物件類型，目前用這個 CLI 產生的檔案**會被官方 runtime 拒絕載入**，原因未根治，作者列為未解問題。
- 雙向 bool 轉場（A↔B 互相依賴同一個 bool 輸入的轉場）有已知的視覺行為異常（runtime 會在到達 B 後幾幀又跳回 A）。
- `Bone` 無法設定旋轉（上一節已詳述），`stroke.thickness` 無法關鍵影格化，部分 `Artboard`／`LayoutComponentStyle` 進階屬性尚未開放。
- 整體定位：這是一個**還在快速迭代、工程方法紮實但功能覆蓋不全的個人專案**，拿它做「靜態向量圖形＋簡單位移/縮放/旋轉動畫＋基本狀態機」是可信的（有官方 runtime 比對佐證），但拿它做「角色骨骼動畫」這個我們真正想要的用途，目前**功能缺一角（bone rotation），做不到**。

**來源**：本機 clone `https://github.com/George-RD/rive-rs-cli`（commit 對應 2026-09-06 抓取當下的 HEAD）逐檔案查證：`README.md`、`docs/authoring-spec-v0.md`、`docs/authoring-cli.md`、`docs/parity.md`、`docs/install.md`、`docs/format-spec.md`、`CHANGELOG.md`、`LICENSE`、`src/objects/bones.rs`、`src/builder/spec.rs`、`src/builder/objects.rs`、`src/discovery/mod.rs`、`tests/fixtures/bones.json`、`tests/fixtures/mesh.json`、`tests/e2e.rs`；GitHub API `repos/George-RD/rive-rs-cli`（2026-09-06）。

---

## 5. 其他替代方案對比

| 工具 | 授權／費用 | Web runtime | 骨骼／換裝能力 | 對我們的適配度 |
|---|---|---|---|---|
| **Rive** | 編輯器免費；發佈 `.riv` 需 Cadet US$9/月起（年繳）；runtime MIT 開源 | `@rive-app/canvas`／`webgl2`，官方一直維護，效能佳 | 有 Bones＋Mesh 骨骼變形系統，也有現代化的 Constraints／State Machine（互動邏輯內建在檔案裡，不用另外寫大量 JS） | **目前最適合**：一次性小額訂閱即可，向量+互動狀態機一次到位，是唯一同時滿足「向量矢量化、互動邏輯內建、runtime 免費」三條件的工具 |
| **Spine** | Essential US$69（買斷，基礎功能）／Professional US$379（買斷，含 Mesh 網格變形＋IK）／Enterprise 年費（年營收 US$500k+ 門檻）；`spine-ts` runtime 開源但**需持有效 Spine Editor 授權才能合法使用匯出的骨架資料** | `spine-ts`，遊戲業界（尤其手遊）最成熟的 2D 骨骼動畫 runtime | 業界標準骨骼動畫＋换装（skins/slots）系統，換裝是原生一等公民功能，比 Rive 的骨架系統更成熟、社群範例最多 | 換裝需求（帽子/衣服/背景四部位）若走純骨骼路線其實很適合 Spine，但**買斷制對「先小額試水」不友善**（一次要付 69 或 379 美元，不像 Rive 可以先訂一個月試用再取消），且沒有 Rive 那種「狀態機直接內建在檔案」的互動編排能力，仍需自己寫較多 JS 邏輯 |
| **Live2D Cubism** | Cubism SDK 對個人／年營收低於約 US$67,000（¥10,000,000）的小型創作者**免費**；Web SDK 需另外同意授權條款下載，Core 引擎不開源（不在 GitHub 公開） | 有官方 Web SDK，但主要生態在直播/VTuber 領域 | 專精 2D 立繪的「偽 3D」變形（呼吸、轉頭、眨眼等自然表情動畫），**不是通用骨骼動畫工具**，不擅長四肢大幅度動作或換裝系統 | 定位錯位：Live2D 是為「立繪講話動起來」設計，不適合我們「化身冒險走動、換裝」的遊戲需求 |
| **DragonBones** | 完全免費、開源（源自 Egret 引擎生態） | 有官方 `DragonBonesJS` TypeScript/JS runtime | 骨骼動畫＋换装（skins）功能與 Spine 概念相近，且完全免費 | 免費是最大優勢，但**官方維護活躍度明顯低於 Rive/Spine**（社群曾多次在 issue 追問「是否已停止維護」），編輯器（DragonBones Pro）本身也已多年未有大更新，文件與教學資源偏少、以中文社群為主。若完全不想花錢、能接受工具老舊風險，是可考慮的免費選項 |
| **Lottie / dotLottie** | 免費開源 | `lottie-web`／`dotlottie-web`，生態極成熟 | **沒有原生骨骼系統**，本質是「烘焙好的關鍵影格時間軸」，通常從 After Effects 匯出，互動性要另外用程式碼客製；dotLottie 近期加了簡易 state machine，但不是為骨骼變形設計 | 不適合角色骨骼動畫：同樣效果做出來，Lottie 檔案明顯比 Rive 原生骨架檔案肥大很多（官方案例：267KB vs 16KB），且沒有「一個檔案內建互動邏輯」的優勢 |

### 為何 Rive 對我們最合適

1. **成本結構最友善小型/一次性專案**：US$9/月可先訂一個月密集產出、發佈完就取消，且訂閱期間發佈的檔案永久可用——不像 Spine 要先掏 69–379 美元買斷才能開始。
2. **向量優先＋狀態機內建**：我們的角色本體是點陣 PNG（AI 生圖切件），但帽子/衣服等換裝疊加、UI 互動反饋這類需求，Rive 的向量圖形＋內建 State Machine 可以省下大量前端 JS 邏輯——這是 Spine/DragonBones/Lottie 都沒有的整合優勢。
3. **Runtime 開源、免費、獨立於編輯器訂閱**：即使停止付費 Rive 訂閱，遊戲網頁載入 `.riv` 檔案的 runtime（`@rive-app/canvas`）本身不需要另外付費或有 license key 檢查。
4. **對「骨骼動畫」這個特定需求，Spine 理論上更專業**，但代價是買斷制的先期成本較高、沒有 Rive 的狀態機整合優勢；如果未來角色動作複雜度大幅提升到「需要精細骨骼與換裝系統」的程度，值得重新評估 Spine Professional（US$379 一次性）。

**來源**：
- [Spine 授權比較（本輪 WebFetch 查證 `esotericsoftware.com/spine-purchase`）](https://esotericsoftware.com/spine-purchase)（2026-09-06）
- [Live2D Cubism SLP 授權頁](https://www.live2d.com/en/business/slp/)（2026-09-06）
- [Live2D Cubism SDK 授權頁](https://www.live2d.com/en/sdk/license/)（2026-09-06）
- [DragonBones 各 runtime repo 更新紀錄搜尋摘要](https://github.com/DragonBones/DragonBonesJS)（2026-09-06）
- [Rive vs Lottie](https://rive.app/blog/rive-as-a-lottie-alternative)（2026-09-06）
- [Why importing Lotties isn't the Rive workflow](https://rive.app/blog/why-importing-lotties-isn-t-the-workflow-rive-was-built-for)（2026-09-06）

---

## 6. 給 James 的一頁決策

### 選項 A：付 Rive Cadet，走編輯器（推薦）

- **成本**：US$9/月（年繳，等於一次付約 US$108/年，但可隨時取消，且已發佈的 `.riv` 取消後仍可用）。
- **誰做什麼**：
  - James：登入 Rive 帳號、訂閱 Cadet、必要時人工微調角色骨架擺放（Claude Code 可用 Chrome 自動化操作滑鼠/鍵盤，但複雜的骨架拖拉擺位建議 James 本人手動較快、較準）。
  - Claude Code：素材產線（AI 生圖→去背→切件，已有 `bible-art-assets` skill）、必要時透過 Chrome 自動化把切件圖片上傳進 Rive 專案、協助命名與階層規劃、匯出後的整合測試（`bible-playtest` skill）。
- **預估工時**：以「一組角色（帽子/衣服/手持/背景四部位替換的基本動畫，例如待機呼吸、走路、揮手）」估，若骨架與換裝結構第一次搭建，抓 **4–8 小時**（含摸索編輯器操作、State Machine 設定）；後續每新增一組角色變體（例如不同性別/服裝主題）若沿用同一骨架，抓 **1–2 小時**。
- **風險**：學習曲線（James 之前沒用過 Rive 編輯器）、複雜互動邏輯（State Machine）需要一定摸索期。
- **可達品質**：業界成熟工具，向量+點陣混合、狀態機驅動的互動動畫效果最好，長期擴充彈性最高。

### 選項 B：`rive-rs-cli`（不經編輯器，JSON→`.riv`）

- **成本**：US$0（MIT 授權免費使用）。
- **誰做什麼**：Claude Code 撰寫/生成 JSON 場景描述（AuthoringSpec 或 raw SceneSpec）、跑 CLI 編譯與驗證，全程免人工操作編輯器 GUI。
- **預估工時**：抓 CLI 安裝與摸索 **1–2 小時**；但**目前無法做出「骨頭旋轉」效果**（見第 4 節限制），如果我們接受的最終效果是「單一樞紐旋轉的簡單動作」（例如手臂用一個 pivot node 旋轉、而非多關節骨架），用這條路線做**簡單動畫**大概 **2–4 小時**可以出第一個能動的角色部位；若堅持要多關節骨架擺姿勢，這條路線**現在做不到**，除非我們自己補程式碼（額外工程量難以估計，屬於改別人專案原始碼的範疇，不建議在教會小遊戲時程內投入）。
- **風險**：單一維護者的 5-star 個人專案、部分功能（scripting、雙向 bool 轉場）有已知的官方 runtime 相容性問題；**Bone 旋轉功能缺失是硬傷**，且沒有官方支援管道，出問題只能自己讀原始碼排查或等作者回應 issue。
- **可達品質**：適合「產生大量結構規律、可參數化的簡單向量動畫」（例如載入動畫、按鈕回饋、進度條），**不適合**我們真正想要的「AI 生圖角色的骨骼動畫」這個用途，除非只做單樞紐旋轉這種簡化版效果。

### 選項 C：自製 SVG 骨架（純網頁技術路線，不用 Rive 生態）

- **成本**：US$0（用現有 HTML/CSS/JS 技術棧）。
- **做法**：角色各部位仍是 AI 生圖去背切件的 PNG/SVG，用 CSS `transform-origin` + CSS animation／`requestAnimationFrame` 手刻每個部位的旋轉支點，模擬簡易 FK 骨架（例如上臂繞肩膀轉、下臂繞手肘轉）。
- **預估工時**：第一組角色的骨架支點抓取與 CSS/JS 動畫調校，抓 **6–10 小時**（比 Rive 編輯器更花時間，因為所有動畫曲線、狀態切換都要自己刻，沒有可視化編輯器輔助）；後續每新增角色變體，若共用同一套骨架邏輯，抓 **2–3 小時**。
- **風險**：換裝系統（帽子/衣服/背景替換）與動畫的耦合度會隨部位增加而變複雜，日後維護成本高；沒有可視化除錯工具，調整動作全靠肉眼試錯；長期擴充性最差。
- **可達品質**：能做到基本堪用的效果，但視覺細緻度（緩動曲線、多層次混合動畫、狀態機式的互動反饋）明顯不如 Rive，且工時投入其實不比付費方案便宜。

### 推薦與理由

**推薦選項 A（付 Rive Cadet）**。理由：

1. **US$9/月是這個決策裡最小的財務風險**，可以先訂一個月做出第一組角色動畫看效果，不滿意隨時取消，且已發佈的 `.riv` 不會因取消而失效——這正好對應「James 願意付費但要先確認值得」的顧慮，用最低成本就能拿到具體成果來判斷。
2. **工程時間投入最划算**：選項 B 現在做不到我們要的骨骼旋轉效果，選項 C 的自製路線工時反而比付費方案更長、長期維護成本更高。付 9 美元換來的是「有可視化編輯器、有現成骨架系統、有內建狀態機、有官方 runtime 支援」的完整工具鏈，用一人團隊的時間成本來看非常划算。
3. **不綁死**：Rive runtime 開源免費，就算之後不續訂 Cadet，已經做好的動畫檔案還是能用；如果之後動畫需求升級到很複雜的骨骼變形，屆時再評估要不要加碼買 Spine Professional，現階段不需要現在就決定。

---

## 7. 未查到 / 需要進一步查證的點

- Rive `help.rive.app/getting-started/faq-1` 的 FAQ 原文（多人共用帳號、席位定義、免費方案匯出限制細節）：頁面重導向後回傳 404，未能取得原文逐字內容。
- Rive Cadet 方案是否有 Revision History：`rive.app/docs/editor/fundamentals/revision-history` 文件本身沒有寫明適用方案層級；本文件表格中的「Cadet 無 Revision History」是依 pricing 對照表間接推論，未見官方逐字確認。
- Rive 編輯器內「圖片壓縮設定」的官方文件頁面：未查到專門說明壓縮率選項、對檔案大小影響的頁面。
- Rive 編輯器是否原生支援匯入 WebP 格式圖片：未查到官方逐字確認，本文件建議統一先用 PNG 進 Rive 是保守做法。
- Rive 免費方案「匯出」是否真的是完全阻擋（而非允許匯出但打浮水印）：多份來源（部落格、rivemasterclass）都只說「免費方案不能發佈」，沒有出現「浮水印」字樣，判斷是完全阻擋，但沒有看到官方逐字寫「無浮水印機制」這種反向確認。
- Spine Essential 版本是否包含基本换装（skins）功能，還是換裝也是 Professional 才有：WebFetch 摘要對此有一句模糊的「兩版都支援 skins」但未附逐字原文佐證，建議之後如果真的要買 Spine 時直接到官網逐字核對授權比較表。
- `rive-rs-cli` 的 8 個 open GitHub issues 具體內容未逐一查閱（只確認了總數與倉庫活躍度），若要評估「Bone 旋轉何時會補上」，需要另外去 issue tracker 逐條確認有沒有相關的 feature request 或作者回覆時程。
