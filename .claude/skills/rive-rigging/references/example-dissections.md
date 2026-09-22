# Marketplace 高手範例拆解（官方 MCP 實讀）

> 用途：照 James 2026-09-22 決定「CC 透過學高手作品主做 Rive 動畫」，把 Marketplace 上跟本專案四需求（待機、換裝、PNG 綁骨、場景）最接近的範例，用官方 Rive MCP 逐層讀出來，寫成可以照抄的作法。
> 方法：範例 Remix 進 Bible-game 團隊「個人文件」→ James 在 Rive Early Access 桌面版雙擊開檔 → Claude Code 用 `mcp__rive__*` 讀階層、屬性、關鍵幀、骨架、資產。**每一條都是實讀，不是猜的**；沒讀到的地方明寫「未讀」。
> 三個範例都是 JcToon 作品、CC BY 4.0。建立日期：2026-09-23。

---

## 目錄

1. [Raster Graphics Example（PNG 零件剛體木偶＋向量臉）](#1-raster-graphics-example)
2. [Avatar Creator（換裝／Data Binding）](#2-avatar-creator)
3. [Joystick example（雙軸混合／待機視線）](#3-joystick-example)
4. [MCP 讀檔踩坑](#4-mcp-讀檔踩坑)

---

## 1. Raster Graphics Example

- 檔案：`https://editor.rive.app/file/raster-graphics-example/2602804`（Remix 副本，fileId 2602804，在 Bible-game 個人文件）。
- 內容：一個穿飛行帽的角色張嘴大笑、自由落體，背景雲往上飄。
- 規模：1 個畫板 500×500、1 條線性動畫、**沒有狀態機、沒有 View Model、沒有 Data Bind、沒有腳本**。純 timeline 範例，換裝與狀態機要看第 2 節。

### 1.1 資產：8 張 PNG，一律高解析縮小放

| 資產 | 像素 | 放進畫板後的縮放 |
|---|---|---|
| Head.png | 447×391 | 35.48% |
| Body.png | 343×253 | 35.48% |
| Arm_front.png | 269×81 | 35.48% |
| Arm_back.png | 247×71 | 35.48% |
| Leg_front.png | 208×296 | 35.48% |
| Leg_back.png | 239×334 | 35.48% |
| Belt.png | 124×253 | 35.48% |
| Bagpack.png | 180×159 | 35.48% |

- 八張圖 `sx`＝`sy`＝35.48%，全部同一個縮放值，原點 (50%, 50%)。意思是素材以約 2.8 倍畫，進編輯器一起縮小；手機 2x／3x 螢幕仍清晰。**這跟我們素材規格的方向一致：零件各自出圖、進 Rive 統一縮。**
- `fit`＝resize（預設）、sampler filter 預設，沒有特別設定。

### 1.2 階層：PNG 全部「剛體掛 Node」，沒有 mesh、沒有骨頭

```
Artboard (500×500, 底色 #d6f3f6)
├─ Color_filter        全畫板白色矩形，blend=screen，opacity 17.75%
├─ Color Filter        全畫板線性漸層（#ffe4f9→#16085e），blend=overlay，opacity 100%
├─ Cloud_front         向量雲（radial 填色＋半透明白描邊）
├─ Character (Node, scale 113.8%, 位置 244.8/254.8)
│  └─ Character (Node, scale 53.7%, y 34.7)
│     ├─ Ctrl_neck (Node)
│     │  └─ Ctrl_head (Node)
│     │     ├─ Group → Eyebrow_front（向量描邊路徑）
│     │     ├─ Group → Eyebrow_back
│     │     ├─ Hair（向量填色）
│     │     ├─ Eyes (Node) → Eye_right / Eye_left
│     │     ├─ Mouth (Node)
│     │     └─ Head.png (Image，無子物件)
│     ├─ Ctrl_arm_front (Node) → Arm_front.png
│     ├─ Body (Node) → Belt.png（帶 Draw Rule）、Body.png
│     ├─ Ctrl_bagpack (Node) → Bagpack.png、Root Bone→Bone 1、Custom Shape（背帶）
│     ├─ Ctrl_leg_front (Node) → Leg_front.png
│     ├─ Ctrl_leg_back (Node) → Leg_back.png
│     └─ Ctrl_arm_back (Node) → Arm_back.png
├─ Cloud_back_1
└─ Cloud_back_2
```

- **八張 Image 物件底下都是空的**：沒有 Mesh、沒有 Skin、沒有 Weight。每張圖只是掛在自己的 `Ctrl_*` Node 底下，動畫關鍵幀全部打在 Node 的 x／y／r／sx／sy，**不打在 Image 上**。
- 這正是 SKILL.md 第 8 節 2026-09-10 坐姿試做的作法（六件剛體零件）。高手範例證實：**點陣角色不彎關節時，不需要 mesh，剛體 Node 就夠**。
- 兩層 Character Node：外層管整體位置與大小（113.8%），內層管動畫（scale 53–55% 微縮放、y 33–34.4 微上下）。**整體擺位跟動畫分兩層，動畫層永遠不用管「放在畫板哪裡」。**
- Node 的 `style`（枢軸圖示）有 group／target／square／triangle 等選項，只是編輯器顯示用。

### 1.3 畫序：階層順序＋一條 Draw Rule

- 階層裡越上面畫在越前面：Ctrl_neck（頭）最上、Ctrl_arm_back 最下，所以頭壓身體、前臂壓身體、後臂被身體壓住。
- 唯一一條 Draw Rule 在 **Belt.png** 上：`DrawTarget.drawableid`＝Arm_front.png、`placementvalue`＝before（0）。皮帶在 Body Node 裡、前臂在另一個 Node，靠 Draw Rule 把皮帶釘到「前臂之前」。**跨 Node 調畫序就用 Draw Rule，不要搬階層。**

### 1.4 臉：PNG 頭＋向量五官

- 眉毛：兩條向量描邊路徑（`#3f2a38`），各包一層 Group 當控制柄，動畫只動 Group 的 y（±3）。
- 頭髮：向量填色 `#3f0100`，兩條路徑。
- **眼睛＝裁切眨眼**：每隻眼是一個 Node（Eye_right／Eye_left），裡面三樣：
  1. `Blink_right`／`Blink_left` Node，裡面一個 Rectangle Shape；
  2. 眼珠 Shape（Ellipse `#3f2a38`）帶一個 **ClippingShape，sourceid 指向上面那個 Rectangle**；
  3. 眼白／高光 Shape（Ellipse `#f1997d`）。
  眨眼＝把 Blink 的矩形往下移或壓扁，眼珠被裁掉。本動畫沒 key 眨眼（Blink 節點 x／y 近 0、opacity 100）。這比 9/10 試做用 opacity 換眼皮片多一個好處：眼珠被「蓋住」的邊緣跟著矩形走，不用另畫眼皮。
- **嘴＝四根 Root Bone 拉一條 4 點路徑**：
  - `Ctrl_mouth_up`／`left`／`right`／`down` 四個 Node，各包一根 RootBone；
  - `Mouth` Shape 的路徑 4 個頂點，Skin 綁 4 根骨，**一頂點一骨、權重 1.0**（`querySkin`：vertexCount 4、boneCount 4、每骨 weightedVertexCount 1）；
  - `Lips` 描邊路徑也綁同一組骨（Skin 在路徑底下）；
  - 牙齒／牙影 Shape 直接掛在 mouth_up 的 RootBone 底下，跟上唇走。
  - 動畫只動四個 Ctrl Node：left／right 的 sy 142–214%、down 的 y 23–27。**不用 mesh、不用手塗權重，四點四骨就能做張嘴。**

### 1.5 背包帶：唯一一段真骨鏈

- `Custom Shape` 5 頂點向量路徑，Skin 綁 `Root Bone`（r −90°）→ `Bone 1`（length 11.1）兩根骨。
- 權重是自動的：Root 影響 4 點（平均 0.75）、Bone 1 影響 3 點（平均 0.67），中段兩骨混合。
- 動畫：Root r −102°…−76°、Bone 1 r −37°…29°，每 5 幀一鍵 → 背帶在風裡甩。
- 給我們的對照：**只有「會飄的軟物」才用骨鏈＋自動權重；硬零件一律剛體。** 自動權重在這種 5 點小路徑上夠用，不需手塗。

### 1.6 動畫：60 fps、工作區 30–150、每 5 幀一個 cubic 關鍵幀

- `Animation 1`：fps 60、duration 240 幀（4 秒）、loop、**工作區 30–150**（實際只循環 2 秒）。
- 829 個關鍵幀、36 條軌，**每條軌 25–27 鍵、頻率每 5 幀一鍵、幾乎全 cubic**。這不是「兩個 pose 中間補間」，是手打的持續抖動（自由落體的風阻感）。
- 幅度全部很小，這是「活著但不搶戲」的數值範圍，可直接拿來當我們待機的參考：

| 軌 | 範圍 |
|---|---|
| Ctrl_head sx／sy | 99.1–100.8% ／ 98.5–99.8% |
| Ctrl_neck r ／ y | 0.8–2.3° ／ −43.2…−40.8 |
| Ctrl_arm_front r | −11.2…−5.1° |
| Ctrl_arm_back r | 6.6–10.4° |
| Ctrl_leg_front r／sx／sy | −5.8…−3.1° ／ 98–102% ／ 98–103% |
| Ctrl_leg_back r／y | −2.1…−0.2° ／ −32…−23 |
| Ctrl_bagpack sx／sy | 97–110% ／ 99–119% |
| Character（內層）sx／sy／y | 53.0–53.9% ／ 54.1–55.0% ／ 33.0–34.4 |
| 眉毛 Group y | ±3 |

- 雲：三朵各兩鍵 linear，y 從約 −30 掃到 570–680（往下掃＝人在往下掉）；Cloud_front 在 0 與 45 幀之間 hold。**場景動、人微動，掉落感就出來了。**
- 沒有任何 Image 物件被 key（opacity 也沒）；沒有 Blink 軌。

### 1.7 全畫面色彩濾鏡

- 兩個全畫板矩形疊在最上面：白色 screen 17.75% 提亮、粉→深藍線性漸層 overlay 100% 統一色調。
- 給我們：天光轉場（`docs/animation-map.md` 待拍板項）可以用同樣兩層矩形，key 漸層顏色或 opacity，不用重畫背景。

### 1.8 對本專案的結論（可直接照抄）

1. **PNG 零件剛體掛 Node，動 Node 不動 Image**：頭、身、四肢、裙、靴各一個 `Ctrl_*` Node；素材統一一個縮放值。
2. **臉走「PNG 頭＋向量五官」**：眨眼用 ClippingShape 矩形裁眼珠；嘴用 4 點路徑綁 4 根 RootBone。臉的動畫全靠向量，PNG 頭不動。
3. **軟物（斗篷、頭巾垂片）才用骨鏈**，兩三根骨＋自動權重即可；硬零件不綁。
4. **待機幅度**：旋轉 ≤ 5°、縮放 ±2%、位移 ≤ 3 px（在 500 畫板、內層 54% 縮放下），每 5 幀一鍵 cubic 或用兩三個 pose 補間皆可。
5. **兩層 Character Node**：外層擺位、內層動畫。
6. **跨 Node 畫序用 Draw Rule**。
7. **場景層＋色彩濾鏡層**獨立於角色，天光／掉落感在這兩層做。

---

## 2. Avatar Creator

未讀。需 James 在桌面版開檔後用 MCP 讀。網頁版預先看到的 inputs：`numBodySize`／`numBackground`／`numBodyFaceHair`／`numBodyHair`／`numBodyEyes`／`numBodyColor`（Number）＋ `changes`（Trigger）。待補：換裝是 Solo 還是 Nested Artboard、Data Binding 怎麼接、狀態機層怎麼分。

---

## 3. Joystick example

- 檔案：`https://editor.rive.app/file/joystick-example/2602821`（Remix 副本，fileId 2602821）。
- 內容：全向量的橘頭巾角色，頭轉左右上下、眼珠跟著看、定時眨眼。**沒有 PNG、沒有 View Model、沒有 Data Bind、狀態機沒有 input／listener**。
- 規模：1 個畫板 500×500；6 條線性動畫；1 個狀態機 `State Machine 1`、1 層 `Animation`，只有 Entry → `Animation` 一條無條件轉場。
- 這檔教的是一件事：**用 Joystick 物件把「臉的多個零件」收成兩個軸，之後只 key 搖桿不 key 零件。**

### 3.1 三個 Joystick 物件（掛在畫板根層）

| Joystick | x 軸驅動 | y 軸驅動 | 畫布位置 | 備註 |
|---|---|---|---|---|
| `Head` | `Head_H` | `Head_V` | (126.7, 392.6) | 頭轉向 |
| `Look` | `Eyes_H` | `Eyes_V` | (236.3, 392.6) | 眼珠 |
| `Blink` | `Blink` | （無） | (360.5, 392.6) | 單軸，預設 x＝−100（睜眼） |

- Joystick 的值域固定 **−100…100**；x_id／y_id 各指一條 1 秒（60 幀）oneShot 動畫，**搖桿在 −100 就是那條動畫第 0 幀、100 就是最後一幀**，中間線性取樣。
- 三個都是 width／height 100、origin 50/50、`handlesourceid` 無（沒接外部把手）、`joystickorder` 0／1／2（面板顯示順序）。
- 屬性 key：x 299、y 300、x_id 301、y_id 302、posx／posy 303／304、width／height 305／306、originx／y 307／308、joystickflags 312、handlesourceid 313、joystickorder 314。

### 3.2 被驅動的五條 1 秒動畫各 key 了什麼

| 動畫 | key 的物件 | 幀 0 → 幀 60 |
|---|---|---|
| `Head_H` | `face` Node | x −19.4 → 20.2；**sx 90.8% → 100%（幀 28）→ 90.8%** |
| `Head_V` | `face` Node | y 41.8 → 65.3 |
| `Eyes_H` | `Ctrl_pupil_left`／`right` Node | x −8.45 → 5.36 |
| `Eyes_V` | 同上 | y −8.29 → 8.09 |
| `Blink`（8 幀＝0.13 s、loop） | 四根眼皮 RootBone、`Close_eyes` Node | 上下眼皮 y 從張開值 → 4.25（幀 5 相遇）；`Close_eyes` opacity 0 → 100（hold，幀 5 才出現） |

- **假 3D 轉頭＝整個 `face` Node 左右平移 ±20 ＋ 轉到邊緣時橫向壓到 91%**。五官全在 `face` 底下，一個 Node 帶走。
- **視差**：`Ctrl_hair` 有 TranslationConstraint 指向 `face`、strength **−100%**（頭髮反向移，看起來留在後腦）；`Ears` 同樣指向 `face`、strength **−30%**。都是 copy x＋y、factor 1、local space。這就是「臉往左、頭髮耳朵往右一點」的立體感來源。
- **眨眼＝兩套眼**：`Open_eyes`（眼白橢圓被 `Eyelibs` 4 點路徑裁切，路徑 Skin 綁上／下眼皮兩根 RootBone；瞳孔在 `Ctrl_pupil_*` Node 下）＋ `Close_eyes`（閉眼弧線描邊，平常 opacity 0）。眨眼時眼皮骨往中間合、閉眼線 hold 跳出來。**8 幀走完，不做慢速閉眼。**
- 眼睛的 ClippingShape 用法同第 1 節：裁切源是可被骨頭變形的路徑，不是固定矩形。

### 3.3 主時間軸 `Animation`（10 秒、600 幀、loop）只 key 搖桿

- key 的物件只有三個 Joystick 的 x／y，加上兩根手臂 RootBone 在幀 0 各一個 r（擺姿勢用）。
- `Head`：x 0 →(幀 81) −100 → 保持到 260 →(290) 100 → 保持到 416 →(463) 0；y 在 −36…36 之間慢慢飄。全部 cubic。
- `Look`：跟 `Head` 走差不多的路線但**時間點錯開幾幀**（幀 54 才到 −100、159 又微回到 −93、180 再微調）。眼珠比頭慢半拍、還會小抖，這是「活的」關鍵。
- `Blink`：x −100 →(12 幀) 100 →(14 幀) −100，10 秒內出現 5 次（幀 37、269、315、404、534），間隔 0.5–4 秒不等；y 在眨眼頂點也推到 100。**眨眼節奏不等距，偶爾連兩下（269 與 315）。**
- 狀態機沒有輸入，只是讓這條 10 秒 loop 一直播。

### 3.4 對本專案的結論

1. **待機「偶爾看鏡頭／看左右」用 Joystick 做**：先把頭轉、眼珠、眨眼各做成一條 1 秒 oneShot 動畫，綁到 Joystick 的 x／y，之後每一版待機只 key 搖桿。換裝、換臉不用重打關鍵幀。
2. 我們的頭是 PNG，五官若照第 1 節做成向量疊在 PNG 上，「`face` Node 平移 ±20＋sx 91%」的假 3D 轉頭可以直接套；PNG 頭本身不動。頭髮／帽子做 −100% 的 TranslationConstraint 就有視差。
3. **眨眼 8 幀、不等距、偶爾連兩下**；閉眼線用 opacity hold 而不是淡入。
4. 眼珠比頭慢幾幀＋微抖，比同步移動更像活的。
5. 這檔沒示範 runtime 控制（沒 input、沒 Data Bind）。要讓網頁指標驅動搖桿，得另外接 Listener 或 View Model，本檔不能當範本；待第 2 節 Avatar Creator 看 Data Binding 怎麼接。

---

## 4. MCP 讀檔踩坑（2026-09-23 實測）

- **MCP 只看得到編輯器已開的分頁**：首頁狀態 `session_info` 回 `openTabs: []`，`list_artboards` 回 `No file context available`。要 James 在桌面版雙擊開檔，MCP 沒有開檔指令。
- 讀檔順序：`session_info` → `list_artboards` → `get_artboard_hierarchy(depth 3)` → `query_objects(某節點, depth 6)` → `assets_tool listAssets` → `animation_editor listLinearAnimations／listStateMachines／queryStateMachine` → `viewmodel_editor listViewModels／listDataBinds` → `capture_artboard` 看圖。
- **`queryKeyFrames` 一次回全部關鍵幀**，829 鍵就 17 萬字元，會被截成檔案。用 python 依 (objectId, propertyName) 分組摘要：鍵數、幀範圍、值域、插值型態。
- `query_property_values` 要先 `query_property_keys` 拿整數 key；常用：x 13、y 14、r 15、sx 16、sy 17、opacity 18、childOrder 6、blendModeValue 23（enum index：14 screen、15 overlay）、Image originx／y 380／381、fit 974；動畫 fps 56、duration 57、loop 59（1＝loop）、workstart／workend 60／61；DrawTarget drawableid 119、placementvalue 120（0 before、1 after）；ClippingShape sourceid 92；Bone length 89。縮放與 opacity 回百分比、角度回度。
- `get_scripts` 列出的 `config/*`、`theme/*` 是編輯器自己的 Luau 設定檔，**不是檔案裡的腳本**；檔案沒腳本時就只會看到這些。
- `mesh_rigging_tool querySkin` 對向量路徑也能用（回每根骨影響幾個頂點、平均權重），拿來驗證「一頂點一骨」這種設計很方便。
- `capture_artboard` 預設 512，看構圖夠用；要看五官細節再開 768–1024。
