# 官方 Rive MCP 施工手冊（給 Claude Code 用）

> 目的：在 James 開著的 Rive Early Access 桌面版裡，讓 Claude Code 透過 `mcp__rive__*` 直接建角色、改形狀、拍圖自檢。
> 內容分三層：官方文件寫的（2026-09-26 查證）、本專案實測（2026-09-23 讀檔、2026-09-26 建角色）、給 CC 的指令範本。
> 讀檔類踩坑在 `example-dissections.md` 第 4 節，本檔只講「建與改」。

## 1. 官方文件寫了什麼（來源 https://rive.app/docs/editor/ai/mcp）

- 只有 Windows／macOS 桌面版有 MCP；**必須開著 Rive Early Access app** 才會有 server，端點固定 `http://127.0.0.1:9791/mcp`。
- 接 Claude Code：`claude mcp add --transport http rive http://127.0.0.1:9791/mcp`，再跑 `claude`。
- 官方只以六大類敘述功能，**沒有逐一列工具名**：檔案與畫板／查改階層／建形狀 layout component／動畫與狀態機／View Model 與 binding／Luau·WGSL 腳本。附註工具清單會持續擴充。
- 官方建議三步：先開檔並建好 Artboard → 下 prompt → 輸入「End Prompt」授權修改。**本專案 9/26 實測 CC 直接呼叫工具就能寫入，沒遇到授權關卡。**
- 官方頁**沒寫**：方案限制、登入、座標系統、屬性 key、undo、Revision History 互動、唯讀模式。方案限制是實測：免費版開不了 MCP，要 Cadet（9/22）。
- 2026-03 有官方 repo issue 抱怨 MCP 一度被停用（github.com/rive-app/rive-runtime/issues/87，無官方回覆）；目前 docs 仍列為可用，9/26 實測可用。
- Rive CLI 的 agent 頁（https://rive.app/docs/cli/agents.md）建議「分階段做：先 wireframe，再結構、內容、細節」；CLI 與桌面 MCP 是兩套機制。

## 2. 工具清單（2026-09-26 這個 session 實際載入的 45 個）

| 類別 | 工具 | 備註 |
|---|---|---|
| 檔案／畫板 | `session_info`、`list_artboards`、`open_file_editor`（getCurrentFile／listArtboards／getSelectedArtboard／focusArtboard／renameArtboard／arrangeArtboard／resizeArtboard／createArtboard／closeRevisionHistory／undo）、`upload_rev`、`export_file` | 沒有「開新檔」「切分頁」；`upload_rev` 只吃 .rev |
| 查詢 | `get_artboard_hierarchy`、`query_objects`、`find_objects`、`get_selection`、`select_objects`、`query_property_keys`、`query_property_values`、`grep` | `find_objects` 用名稱子字串找 id 最快 |
| 改物件 | `set_property_values`、`rename_objects`、`reparent_objects`、`reorder_objects`、`delete_objects`、`duplicate_objects` | key 一律整數 |
| 建圖形 | `path_editor`（createParametricShapes／createShapes／addVertices／addPaths／addPaints／setPaints／addGradientStops／removeGradientStops／addTrimPaths／combineShapes）、`group_editor`、`layout_editor`、`component_editor`、`text_editor`、`assets_tool`、`upload_asset`、`tag_editor`、`property_group_editor` | 幾何原型用 parametric，自由曲線用 createShapes |
| 動畫 | `animation_editor`、`create_listeners`、`mesh_rigging_tool`（generateMesh／bindBones／autoWeight／querySkin） | 權重只有 autoWeight、無手塗 |
| 資料 | `viewmodel_editor` | 新檔一律 Data Binding |
| 腳本 | `get_scripts`、`manage_scripts`、`script_diagnostics`、`recompile_all_scripts`、`run_tests`、`get_scripting_reference`、`read_console` | |
| 驗證 | `capture_artboard` | 回 PNG，CC 看得到 |

## 3. 建與改的實測規則（2026-09-26 建 Character 畫板）

**開工**
- 先 `session_info` 確認 `activeFileName` 是要施工的檔，不是範例檔；MCP 只動作用中分頁。新檔要 James 在桌面版 File → New 並停在該分頁。
- 新檔預設 `Artboard 1` 500×500、背景 Fill `#282828`；用 `open_file_editor` renameArtboard／resizeArtboard，背景用 `path_editor setPaints` 對 Fill id 改色。
- `capture_artboard` 的 `backgroundColor` 對有 Fill 的畫板無效，要改畫板 Fill。
- **CC 無法自己把 SVG 送進 Rive**：`upload_asset` 在沙盒讀不到本機路徑，curl 資料 URI 被 auto mode 擋（2026-10-09 實測）。素材一律請 James 拖檔，CC 只做匯入後的組裝。

**座標與樞紐**
- `createShapes` 的 x／y 是形狀原點＝旋轉樞紐，path 指令相對原點。**把原點放在關節**（肩、肘、腕）就不用再校 pivot。
- `createParametricShapes` 的 x／y 是中心、樞紐在中心；要關節樞紐就用 freeform，或外包群組當樞紐。
- `createParametricShapes` 的 `parentId` **時靈時不靈**（2026-10-09 兩次實測：高光一次被忽略掉在畫板層、眼皮一次生效）；建完一律 `find_objects name=… parentId=目標` 驗一次，沒進去就 `reparent_objects` 搬進目標 Node 再重設 x／y。
- **mesh 綁骨鐵律**（2026-10-09 辮子實錄，recraft.md §6.7）：骨頭數值定好才 bindBones；綁完改骨頭＝變形不是重綁；要重綁得 `delete_objects` 刪路徑底下的 Skin 再綁。自動權重會看骨頭是否在形狀內，骨頭要穿過要跟著動的髮塊／布塊。大量查頂點用 HTTP 端點 `127.0.0.1:9791/mcp` 批次落檔，不進對話。
- 群組樞紐做法：`group_editor` 建空群組（給 parentId）→ **x／y 參數實測沒生效，會掉在 (0,0)**，建完立刻 `set_property_values` 補 x(13)／y(14) → `reparent_objects` 把零件搬進去 → 零件 local x／y／r 歸零。
- `reparent_objects` 兩種行為都遇過：9/26 保留 local 值、10/9 保留世界座標並自動換算 local（可能版本差異）。搬完一律 `query_property_values` 驗，再決定要不要重設。
- `reparent_objects` 用 `position: "end"` 逐件搬進群組時，畫序會**整段反過來**（先搬的跑到最前面，頭髮會蓋住臉）；搬完在群組內照原順序再跑一次 `sendToFront` 鏈。
- `group_editor` 用 objectIds 包既有物件時，若含空 Node（無 stage item）整個呼叫失敗；改「建空群組＋reparent」。

- **換裝 Solo 鐵律**（2026-10-09，recraft.md §6.8）：MCP 建不了 Solo，要 James 右鍵 Wrap in Solo；Solo 子物件順序必須＝enum 值順序（convertToNumber 給的是 index）；`capture_artboard` 不套 Data Binding，驗換裝一定匯 .riv 進 runtime；`group_editor` 的 x／y 是世界座標，掛在縮放過的父層下建完要把 local 歸零。

**屬性**
- `set_property_values` 的 key 必須是整數，先 `query_property_keys`。常用：x 13、y 14、r 15（度）、sx 16、sy 17（百分比）、opacity 18。
- 縮放用百分比（93＝93%），角度用度；正角度在螢幕上是順時針。
- `set_property_values` 的參數名是 `propertyValues`（不是 `values`）；`query_property_keys` 的參數名是 `objectIds`。頂點座標 key：x 24、y 25（`query_property_values` 可直接讀路徑頂點）。
- `get_artboard_hierarchy` 的 `maxDepth` 實測無效，一律回整棵樹；`find_objects` 給 `name`／`namePattern` 與 `grep` 都不會篩到剛建的 shape，要拿新 id 還是讀整棵樹。
- `capture_artboard` 給 200×300 也回 341×512，尺寸參數只是上限；手機尺寸檢查要自己縮圖或請審查者假想。

**改形狀**
- 沒有「改路徑」指令。改形：`path_editor addPaths` 加新路徑 → `delete_objects` 刪舊路徑 id。參數形狀的 Rectangle／Ellipse 路徑也能刪掉換 PointsPath，shape id、名稱、paint 都不變，動畫 key 不受影響。
- `createShapes` 回傳沒有 id，要 `find_objects` 或 `get_artboard_hierarchy` 拿。
- 一個 shape 可放多條 path 共用同一組 paint（頭髮主體＋側髮片）。

**畫序**
- 建立順序＝畫序，後建在上；`get_artboard_hierarchy` 列表是前到後。
- 一次 `reorder_objects` 多筆 `sendToFront` 依序執行可重排整段。
- 藏接縫：上臂要蓋在前臂上 → 前臂放在肘群組、上臂 shape 排在該群組前面。
- **匯入 SVG 後 Shape 子層順序與 SVG path 順序相反**（第 i 條 path＝倒數第 i 個 Shape）。要刪特定 path（例如近白殘塊）先 `query_objects` depth 1 看 Fill 顏色對號，別照 SVG 順序數（2026-10-09，recraft.md §6.3）。
- 匯入的 SVG 結構＝外層 Node → 內層 Node（自帶原圖座標）→ Shape；組裝只改外層位置，移樞紐＝外層原點改到關節、內層反向補償。

**平行呼叫**
- 同一回合的多個工具呼叫順序不保證；有依賴的（建 → 拿 id → 搬 → 設值 → 拍圖）分回合。

## 4. 自我檢查迴圈（每輪必跑）

1. 開工前把提示詞拆成驗收單：能量化的寫數字（頭寬÷肩寬、披肩最寬≤肩線＋6 px、V 領內只見膚色），不能量化的寫成可判是非的一句話。
2. 畫完拍兩張：`capture_artboard` longEdge 720 看細節、200 看手機。
3. 開 fork 子代理當找碴審查者：只給驗收單與兩張圖，指令「逐條 pass／fail，至少列五個缺點，不准說沒問題」；不告訴它作者意圖。**每一輪都要開新的 fork**：fork 的上下文在分出那一刻固定，用 SendMessage 續問同一個審查者，它看不到新拍的圖（2026-09-26 實證）。把上一輪缺點清單貼給新審查者當追蹤基準。
   另外：Rive 把子形狀畫在父形狀後面，陰影層要做成同層兄弟再排序，不能塞在父 shape 底下（同日實證）。
4. 只修 fail 項，重拍，重審；最多三輪。三輪不過就把剩餘問題連圖交 James，不硬交。
5. 幾何自檢用數字：從路徑資料算頭高、身高、肩寬、腰寬對比例表；`get_artboard_hierarchy` 核對名稱與樞紐座標未被動到。
6. 交付附驗收單結果與兩張圖，寫「哪幾條過、哪幾條沒過、為什麼」。

## 5. 給 CC 的指令範本（James 貼用）

```
用 Rive MCP 在目前作用中的檔案施工。開工前先 session_info 確認檔名是 <檔名>，不是就停下問我。
目標：<一句話，例如「把 Character 畫板的披肩改成 V 領、帽兜只留頭後一弧」>
不動：<圖層名稱、樞紐位置、配色、動畫…>
分階段：<第 1 步…第 2 步…>，每步拍圖自檢後才進下一步。
驗收：<可判是非的條目，例如「200 px 高仍分得出頭、披風、四肢」「V 領內只看到膚色」>
做完跑第 4 節自檢迴圈，把驗收單結果與 720／200 兩張圖給我，然後停下等我看。
```

## 6. 官方文件缺口（查過、沒有）

- 逐一工具名與參數 schema、座標系統、屬性 key 表、undo 行為、Revision History 鎖定、唯讀模式、編輯器內開關 MCP 的設定位置、MCP 專屬 changelog。community.rive.app 三篇（公告、Claude Desktop 設定、疑難排解）是 JS 渲染，抓不到正文。

## 7. 從高手範例學到、2026-09-26 建角色時沒做到的（給 CC 自己）

對照 `example-dissections.md` 三檔：

- **整體擺位與動畫分兩層**（Raster 1.2 兩層 Character Node）。今天只有一層根群組；要補外層管位置縮放、內層管動畫。
- **每個會動的零件掛自己的 Ctrl Node**（Raster：Ctrl_neck→Ctrl_head、Ctrl_arm_front…；Joystick：Ctrl_hair、Ctrl_pupil）。今天只有手臂做了群組樞紐，頭、頸、頭髮、披風都是裸 shape 直接掛根；之後轉頭、視差、披風擺動沒有把手可 key。
- **跨 Node 畫序用 Draw Rule，不搬階層**（Raster 1.3 皮帶釘在前臂之前）。今天為了藏肘縫把前臂巢在上臂群組下，短期可用；「舉手時前臂到披肩之前」要用 Draw Rule。
- **一個控制點帶多個零件**（Avatar Creator 2.3 Ctrl_Size＋TranslationConstraint）。體型／性別皮膚差異可以這樣做，不必兩套形狀。
- **頭髮視差 −100%、耳朵 −30%**（Joystick 3.2）：頭髮要是獨立 Node 才接得上。
- **臉的零件在同一個 face Node 底下，假 3D 轉頭只動 Node**（Joystick 3.2）：下一階段畫五官時先建 `face` Node 再放零件。
- **待機幅度表**：旋轉 ≤5°、縮放 ±2%、位移 ≤3 px；眨眼 8 幀、不等距、偶爾連兩下。
- **最大的缺口：三檔拆解只讀了骨架與關鍵幀，幾乎沒讀「形狀怎麼畫」**：每個零件幾條 path、有沒有描邊、描邊寬、陰影是不是另一個 shape、漸層用在哪。只留下兩粒麵包屑（雲＝radial 填色＋半透明白描邊；按鈕＝一個 shape 兩個 Fill）。今天全部零件一律 3 px 深棕描邊＋單色填充，看起來像佔位圖，根源在這裡。**已補：`example-dissections.md` 3.5「向量畫法配方」（2026-09-26 實讀）。結論一句：大塊只有 Fill、無全域輪廓；細節用同色相深一階的線，round cap，2–8 px。**
- **審圖標準要先數字化再看圖**：範例拆解裡幅度都有數字，我的驗收卻只有「有沒有壞」；第 4 節迴圈就是補這個。
