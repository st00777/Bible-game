# 研究：圖片轉 3D AI 工具能做什麼、Claude Code 能掌握多少（2026-10-09）

> 起因：James 看到一份「2026 圖轉 3D 工具評比」，問這些工具能否解決正面拆件角色做不了走路、舉手不自然的問題。本文只採官方一手來源（官方文件、定價頁、API 文件、GitHub repo、LICENSE），第三方評比一律不採。每條標 [官方] 或 [未確認]。
> 調查方式：三個 subagent 分頭查（Meshy＋Tripo／TRELLIS.2＋Hunyuan3D／Rodin＋3D AI Studio），主會話整合；本機硬體由主會話實查。
> 相關：`docs/animation-map.md`（時刻表，無走路）、`.claude/skills/rive-rigging/`（Rive 知識庫）、ADR 0001。

## 一句話結論

六個工具裡，**只有 Meshy、Tripo、3D AI Studio 三家能從一張圖走到「綁好骨、套上動畫、匯出 FBX/GLB」**；其中 Meshy 與 Tripo 兩家 Claude Code 可從終端機全程自動（Meshy 官方 MCP、Tripo 官方 CLI）。但六家**沒有任何一家對「2D 日系插畫輸入能否保留風格」有官方說明或範例**，3D AI Studio 甚至明寫「平面插畫不建議直接餵」。開源兩家（TRELLIS.2、Hunyuan3D）沒有綁骨動畫、且這台 Mac（M2、8 GB）跑不動。**3D 工具解決的是「轉身／走路」的幾何問題，解決不了「像不像原本的角色」與「進不進得了 Rive」兩個問題。**

## 1. 六工具總覽

| | Meshy | Tripo | 3D AI Studio | Rodin (Hyper3D) | TRELLIS.2 | Hunyuan3D-2.1 |
|---|---|---|---|---|---|---|
| 類型 | SaaS | SaaS | SaaS 聚合（含 Meshy/Tripo/Rodin/Hunyuan/Trellis） | SaaS | 開源（Microsoft） | 開源（騰訊） |
| 最新版 | meshy-7.1（2026-09-18）[官方] | tripo-v3.1、P2 preview（2026-08）[官方] | Prism 3.1 [官方] | Gen-2.5 [官方]，日期未確認 | TRELLIS.2-4B（2025-12）[官方] | 2.1（2025-06）[官方] |
| 輸入 | 1 張或 1-4 張多視角 | 1 張或 2-4 張多視角 | 1 張或 1-8 張 | 1-5 張 | 1 張 | 1 張（2.0 有 mv 版） |
| 風格選項 | 無（art_style 已廢）[官方] | 無（只有 lego/voxel 後處理）[官方] | 文字提示可寫 anime；**平面插畫不建議**[官方] | 首頁稱 21 種含 Anime，API 無此參數 [未確認] | 無 | 無 |
| 自動綁骨 | 有，**API 僅人形** [官方] | 有，七種體型（含四足）[官方] | 有，雙足/四足/鳥/蛇 [官方] | **無** [官方] | **無** | **無** |
| 動畫庫 | 680 個＋Text to Motion 自訂 [官方] | 人形 90+（rig v1.0）；v2.5 每體型約 1-11 個 [官方] | 12 個 [官方] | 無 | 無 | 無 |
| 匯出 | fbx/obj/usdz/glb/stl/blend | gltf/usdz/fbx/obj/stl/3mf | glb/fbx/obj/stl/usdz | stl/fbx/obj/glb/gltf/usdz | glb | 未確認（常見 glb/obj） |
| 免費方案 | 100 點/月，**可商用需署名** [官方] | 200 點/月，**不可商用** [官方] | 註冊送點，金額未載 | 有，點數未載 | HF Space | HF Space |
| 付費起點 | Pro 1,000 點/月，月費未抓到 | Pro $20/月 3,000 點 [官方] | Basic $12/月（年繳）1,000 點 [官方] | Creator $30/月；**API 要 Business $120/月** [官方] | 免費 | 免費 |
| 授權 | 付費全歸用戶 [官方] | Pro 以上可商用 [官方] | 可商用，未分免費/付費 [官方] | 「視方案」[官方] | MIT（依賴 nvdiffrast 另有 NVIDIA 條款）[官方] | 騰訊 Community License：排除歐盟/英國/南韓、月活 >100 萬要申請、台灣可用 [官方] |
| API | REST＋OpenAPI＋**官方 MCP** [官方] | REST＋Python/JS SDK＋**官方 CLI `tripo-cli`**＋MCP [官方] | REST＋託管 MCP；**API 無綁骨** [官方] | REST＋託管 MCP；無綁骨 [官方] | 無（本機 GPU） | api_server.py（本機 GPU） |
| 資產保留 | 3 天 [官方] | 免費 1 天編輯歷史 [官方] | 24 小時後 410 [官方] | 未確認 | 本機 | 本機 |

## 2. Claude Code 能掌握到哪一步

「全程自動」定義：CC 從終端機完成「上傳圖 → 生成 3D → 綁骨 → 套動畫 → 下載 FBX/GLB」，中間不需要人碰網頁。

| 工具 | 上傳生成 | 綁骨 | 套動畫 | 下載 | 人工必做的一步 | 判定 |
|---|---|---|---|---|---|---|
| Meshy | ✅ REST / MCP（圖用 Data URI） | ✅ `POST /openapi/v1/rigging`（僅人形） | ✅ `POST /openapi/v1/animations`（1-10 個合一檔） | ✅ 簽名 URL | 付費方案才能建 API 金鑰（免費帳號不行）[官方] | **可全自動，但要先付費** |
| Tripo | ✅ `tripo make char.png` | ✅ `--then rig`（先 `rig-check` 免費預檢） | ✅ `tripo anim retarget --animation preset:walk` | ✅ `convert:fbx` | Console 建一次金鑰；動畫單價查不到 | **可全自動，CLI 為 agent 設計** |
| 3D AI Studio | ✅ REST（base64） | ❌ API 文件無綁骨 | ❌ | ✅ 24 小時內 | 開 2FA；綁骨動畫只能網頁手動 | 半自動 |
| Rodin | ✅ REST / MCP | ❌ 無綁骨功能 | ❌ | ✅ | API 要 Business 方案；MCP 首次瀏覽器授權 | 只到生成 |
| TRELLIS.2 | ⚠️ HF Space 可能可用 gradio_client（未實測） | ❌ | ❌ | ⚠️ | 本機需 NVIDIA 24 GB＋Linux [官方] | **本機不可行** |
| Hunyuan3D-2.1 | ⚠️ 同上 | ❌ | ❌ | ⚠️ | shape 10 GB＋texture 21 GB VRAM；README 寫支援 macOS 但三個 Mac issue 皆無官方回應 [官方] | **本機不可行** |

**本機硬體實查（2026-10-09）**：Apple M2、8 GB 統一記憶體、未裝 Blender、未裝 Docker。開源兩家的最低需求是 10-24 GB 專用 VRAM 且依賴 CUDA 套件（flash-attn、nvdiffrast），本機不可能；只剩 Hugging Face Space 或租雲端 GPU 兩條路，兩條都沒實測。

**CC 可以直接接的官方入口**（都不需要寫爬蟲）：
- Meshy MCP：`claude mcp add meshy --env MESHY_API_KEY=msy_... -- npx -y @meshy-ai/meshy-mcp-server`（工具含 image_to_3d、rig、animate、download、check_balance）[官方]
- Tripo CLI：`npm i -g tripo-cli`，`tripo make hero.png --then texture,rig,convert:fbx`，非 TTY 輸出單行 JSON、固定 exit code，內附 `tripo docs --llm` [官方]
- Rodin MCP：`claude mcp add --transport http hyper3d-rodin --scope user https://api.hyper3d.com/api/mcp` 後 `claude mcp login`（只有生成，無綁骨）[官方]
- 3D AI Studio MCP：帳號 Settings → AI Assistants，OAuth；連線 URL 未列 [未確認]

**CC 做不到的事**（不管用哪一家）：
- 判斷「轉出來像不像原角色」：這是 James 的眼睛才能判的，CC 只能把截圖排好。
- 自訂動作：只有 Meshy 的 Text to Motion 能用文字生新動作；其他家都是預設庫，要自訂就得進 Blender/Maya，而本機沒有 Blender。
- 把 3D 結果放進 Rive：Rive 不吃 GLB/FBX。唯一路徑是「3D 工具做完動畫 → Blender headless 渲染成 PNG 序列 → 當圖片進 Rive」。Blender 官方有 `-b` 背景模式與 `bpy.ops.import_scene.gltf`，可腳本化 [官方]；但渲染出來是序列圖，不是向量零件。

## 3. 對《靈修冒險》的判斷

### 3.1 3D 路線能解什麼、不能解什麼

| 問題 | 3D 工具能否解 | 說明 |
|---|---|---|
| 正面拆件角色走路時腳左右擺很怪 | **能** | 3D 模型可轉到側面或 3/4 視角渲染，走路是標準預設動畫（三家都有 walk） |
| 舉手動作不自然 | **不是 3D 的功勞** | 舉手不自然是因為我只 key 了兩根骨頭、沒彎手肘、沒配套肩頭軀幹。這在 Rive 裡就能修。3D 預設動畫的 wave/celebration 也只是別人 key 好的，一樣要調 |
| 角色要像日系手繪定裝 | **不能保證，且有負面訊號** | 六家都沒有官方說明或範例；3D AI Studio 明寫平面插畫不建議直接餵、要先轉成「3D render 風格」的圖 |
| 換裝（帽子／衣服／手持四部位＋稱號） | **變難** | 現在 Rive 用 Solo＋enum Data Binding 換零件，runtime 已實證（§6.8）。3D 路線要每套裝備重生 3D、重綁骨、重渲染序列圖，或在 Blender 做換裝再渲染，工作量乘上裝備數 |
| 深夜版放慢、nightFactor 綁速度 | 序列圖做不到 | 序列圖的速度只能整段快慢，Rive 的狀態機與 Data Binding 全部要重做 |
| 檔案大小 | 變大 | 現在 .riv 167 KB 含四個動作；序列圖每個動作每套裝備都是一組 PNG |

### 3.2 與現有決策的對照

- **時刻表（animation-map.md）12 個時刻沒有走路**。#2「出發」寫明「舉燈不轉身、畫面推進」，#8 試穿寫明「不涉軀幹轉向」。正面拆件的限制在 9/8 決策樹就已避開。
- **9/6 James 拍板不換引擎**；**9/16 美術歸零後定裝走日系 2D 手繪**。3D 工具最強的是寫實細節，正好是不要的那端。
- **Rive 第一版已走通**：待機、換裝、舉手、試穿四件事 10/9 全在 Rive 2641139 驗證通過（§6.8-6.10）。

### 3.3 建議

1. **現在不切 3D 路線。** 走路不在時刻表，舉手在 Rive 內修（彎手肘＋肩頭軀幹配套＋預備過衝）。
2. **若日後真要走路**，先考慮「另畫一族 3/4 側面零件」（與坐姿同做法，animation-map #4 已是這條路），再考慮 3D。
3. **若要實測 3D 當備案**，只做一次最小實驗、純建知識庫：
   - 用 Meshy 免費 100 點（可商用需署名，資產 3 天內下載）跑兩輪：定裝圖 → image-to-3d（含貼圖 30 點）→ rigging（5 點）→ 1 個 walk 動作（3 點）＝38 點/輪。
   - Tripo 免費 200 點但**不可商用**，只能看品質不能拿；先跑 `rig-check`（0 點）看 riggable。
   - 驗收只看一題：轉出來的 3D 轉到 3/4 視角截圖，James 認不認得這是定裝的那個角色。不認得就結案。
   - 兩家免費帳號都建不了 API 金鑰（Meshy 明寫；Tripo 未確認），第一次實驗要人在網頁點，CC 只能寫 SOP 與整理結果。

## 4. 各工具細節（濃縮，完整原始報告見附錄）

### 4.1 Meshy（docs.meshy.ai）
- 端點：`POST /openapi/v1/image-to-3d`（jpg/png，URL 或 base64）、`multi-image-to-3d`（1-4 張）、`/rigging`、`/animations`、`GET /balance`、SSE 串流、Webhook。OpenAPI 規格與 `llms-full.txt` 皆公開 [官方]
- 模型：meshy-7.1 為 latest；`pose_mode: a-pose / t-pose` 可指定生成姿勢（利於綁骨）；`smart-topology`＋`target_polycount` 做低模 [官方]
- 綁骨限制（API 文件自列）：只對標準人形可靠；要有貼圖；面數 ≤30 萬；`model_url` 只收 glb 且臉朝 +Z；422＝姿勢估計失敗 [官方]。網頁文件寫也支援四足，**兩處不一致，以 API 人形為準**
- 動畫：公開清單實抓 680 個（WalkAndRun／BodyMovements／DailyActions／Fighting／Dancing）；`action_ids` 最多 10 個合成單檔、一 clip 一動作，適合接狀態機；Text to Motion 文字生動作（prime 10 點／swift 3 點）[官方]
- 點數（API）：圖轉 3D 純網格 20、含 2K/4K 貼圖 30、8K 35；綁骨 5；動畫 3/個；Remesh 5 [官方]。網頁版點數表寫法不同（綁骨 0、Meshy 7 圖轉 25），**兩處不一致**
- 授權：免費 CC BY 4.0（可商用需署名）；付費全歸用戶 [官方]
- 金鑰：付費方案才能建；免費只能用 Playground 內建測試金鑰（僅圖轉 3D）[官方]
- 限速：Pro 20 req/s、queue 10 [官方]；資產非 Enterprise 只留 3 天 [官方]
- 月費數字：定價頁卡片未抓到 [未確認]；方案命名 Pro/Studio/Enterprise 與 Pro/Premium/Ultra 並存

### 4.2 Tripo（developers.tripo3d.ai）
- 端點：`POST /v3/files`（上傳取 token）→ `/v3/generation/image-to-model`（PNG/JPEG/WebP ≤20 MB）、`multiview-to-model`、`/v3/animations/rig-check`（免費）→ `/rig` → `/retarget`、`/v3/models/convert`、`GET /v3/account/balance`、Webhook（HMAC）[官方]；各文件頁加 `.md` 取純文字
- 模型：H 系列 `tripo-v3.1`（預設）、P 系列低模 `tripo-p1`（GA）／`tripo-p2`（preview，quad）；貼圖 v3.5 [官方]
- 綁骨：七種體型（biped/quadruped/hexapod/octopod/avian/serpentine/aquatic），骨骼命名可選 `tripo` 或 `mixamo`；rig v1.0 僅人形但動畫庫 90+，rig v2.5 全體型但預設動作少（biped 11 個：idle/walk/run/jump 等）[官方]。**小羊可走四足綁骨**
- 自訂動作：無上傳或文字生動作入口 [官方文件未見]
- 價格（網頁）：免費 200 點/月、公開、非商用、1 並行；Pro $20/月 3,000 點、私有可商用；Max $90/月；加購 $10＝1,000 點。單項：HD 生成 15（貼圖 +10）、Auto Rig 20 [官方]。**API 單價只在範例回應出現（圖轉 100、rig 30），與網頁量級不同，正式價表要登入 platform.tripo3d.ai** [未確認]
- 工具：`pip install tripo3d`、JS/Go/Rust/Java SDK；`tripo-cli` 0.5.2（npm，device-flow 登入或 `TRIPO_API_KEY`，內附 SKILL.md）；`tripo mcp` 內建 [官方]
- 坑：`export_orientation` 只影響該次生成，後續綁骨轉檔不繼承，方向錯仍回 success [官方]；`generate_parts` 不能同時開貼圖；credits 是小數 [官方]

### 4.3 3D AI Studio（3daistudio.com）
- 聚合 20+ 模型（Prism 自家、Meshy、Tripo、Rodin、Hunyuan、Hitem3D、Trellis、Seed3D）[官方]
- **官方明寫平面插畫不建議直接餵，建議先用 Image Studio 轉成 stylized 3D render 風格再轉 3D** [官方 prompt-tips 頁]。對本專案是直接負面訊號
- 綁骨：Prism 支援雙足/四足/鳥/蛇（Mixamo 骨架規格）20 點；Meshy 引擎僅人形 15 點；需 T/A-pose、有貼圖、單一網格；動畫 12 個預設各 15 點 [官方]。**API 文件無綁骨與動畫區塊** [官方]
- 價格：Basic $12/月 1,000 點、Studio $23/月 3,500 點（年繳折算）；點數包 2,000 點 $34 永不過期；圖轉 3D 各頁寫 20～60 點不一致 [官方]
- API：Bearer＋**強制 2FA**，預設 3 req/min；結果 24 小時後 410；API 點數是否與訂閱共用錢包 [未確認]
- 授權：生成物可商用，未分免費/付費；第三方引擎各有授權頁 [官方]

### 4.4 Rodin（hyper3d.ai）
- Gen-2.5 五檔品質；1-5 張圖（第一張決定材質）[官方]
- **無綁骨、無動畫** [官方 API 與 MCP 文件]；部落格有「AI animation tool」行銷文但無產品名與價格 [未確認]
- 首頁稱 21 種風格含 Anime，API 文件無風格參數 [未確認]
- 價格：Creator $30/月、Business $120/月（完整 API）、直購每點 $1.5；API 單價兩頁不一致（0.5 點 vs 1 點），以回應 `consumed` 為準 [官方]
- MCP 為託管服務 `https://api.hyper3d.com/api/mcp`，非 GitHub 專案；傳本機圖片方式 [未確認]
- 條款第 5 節允許 Deemos 用 prompt 與輸出改善服務 [官方]

### 4.5 TRELLIS.2（Microsoft，開源）
- 技術：直接生成 3D（O-Voxel 稀疏體素＋Sparse VAE＋DiT），**不是先生多視角** [官方 README]
- 輸出 GLB＋PBR（4096 貼圖），面數可控；GLB 預設不透明 [官方]
- 硬體：NVIDIA ≥24 GB、只在 Linux 測過、依賴 flash-attn/nvdiffrast/CuMesh；MPS issue #74 開著無官方回應 [官方]
- 授權 MIT；nvdiffrast/nvdiffrec 為 NVIDIA 自訂條款（未逐條讀）[官方／未確認]
- HF Space 存在；gradio_client 遠端呼叫可能可行 [未確認]

### 4.6 Hunyuan3D-2.1（騰訊，開源）
- 技術：Shape（flow-matching DiT 直接生幾何）→ Paint（多視角 PBR 貼圖）兩階段 [官方]
- VRAM：shape 10 GB＋texture 21 GB；有 `--low_vram_mode`；README 寫支援 macOS 但安裝是 cu124，Mac issue #1/#32/#193 皆無官方回應 [官方]
- 授權：Tencent Hunyuan 3D 2.1 Community License，排除歐盟/英國/南韓，月活 >100 萬要申請，輸出不得訓練其他 AI，準據法香港；台灣教會用途在領域內且遠低於門檻（條文摘要，非法律意見）[官方]
- 後續：Omni（骨架姿勢條件控制，不是綁骨）、Part、Buffalo1.0（2026-08，只有論文無權重）[官方]；2.5/3.0 權重是否開源 [未確認]
- repo 內有 api_server.py、Dockerfile、2.0 有 Blender addon，皆本機 GPU 自架用 [官方]

### 4.7 Blender headless（若走「3D 渲染成序列圖」）
- `blender -b file.blend -P script.py -a -o //out_####.png -E ...`：背景模式、Python 腳本、渲染動畫 [官方 Blender 手冊]
- `bpy.ops.import_scene.gltf(filepath=...)` 匯入 GLB [官方]
- 自動權重用 bone heat，手冊自述「結果常不理想」；**沒有對任意網格自動放骨頭的官方功能**，骨頭位置要腳本指定或用上面三家的綁骨結果 [官方]
- 本機未裝 Blender；裝得起（免費），但 8 GB 記憶體渲染高貼圖會吃緊 [本機實查]

## 5. 未確認清單（要登入、付費或實測才知道）

1. 六家對日系平面插畫的實際還原度：零官方證據，只能實測。
2. Meshy 各方案月費、API 點數是否與網頁點數分池；綁骨網頁 0 點 vs API 5 點哪個對。
3. Tripo API 正式價表（登入 Console 才看得到）、retarget 動畫單價、免費帳號能否建 API 金鑰。
4. 3D AI Studio API 能否綁骨、免費註冊點數金額、MCP 連線 URL。
5. Rodin 免費點數、免費能否商用、MCP 傳本機圖片的方法、「AI animation tool」是否存在。
6. TRELLIS.2 與 Hunyuan3D 的 HF Space 免費額度、能否下載 GLB、gradio_client 是否可呼叫。
7. nvdiffrast/nvdiffrec（NVIDIA 條款）、Hunyuan 依賴套件授權是否影響商用。
8. Hunyuan 2.5/3.0 是否有開源權重。

## 6. 原評比文件的修正對照

James 拿到的評比文件裡幾條與官方不符或待確認，此處一併結案：

| 評比說法 | 本次查證 |
|---|---|
| AI 先產多視角再重建 3D | 只是一種路線。TRELLIS.2 直接生體素；Hunyuan 先生幾何再多視角生貼圖；Tripo 有獨立的 image-to-multiview 端點 |
| Meshy 綁骨「各來源不一致」 | 官方 API 文件明確：有，僅人形；網頁文件寫含四足，不一致在官方自己 |
| Meshy 第 7 代 | 已到 7.1（2026-09-18）；meshy-5 於 2026-10-10 退役 |
| Hunyuan3D 完全免費自由商用 | 否：地區排除、月活門檻、下游傳遞條款 |
| TRELLIS 2 是 MIT | 是，但依賴 nvdiffrast 等 NVIDIA 條款另計 |
| Tripo 免費 200 點 | 官方定價頁確認 200 點/月，但**不可商用** |
| 3D AI Studio $19 起 | 官方首頁年繳折算 Basic $12/月；$19 未見 |
| Rodin 細節最接近真實 | 無官方量化資料，不採 |
| 「先在 3D 工具做完動畫再渲染成 2D 素材給 Rive」 | 技術上可行（Blender headless），但會失去 Rive 零件換裝、Data Binding、nightFactor，等於放棄現有架構 |

## 7. 決定（待 James 拍板）

- [ ] 3D 路線：不採納／只做一次 Meshy 最小實驗／其他
- [ ] 走路需求：不加（維持時刻表）／加，另畫 3/4 側面零件族
- [ ] 舉手動畫：在 Rive 內重做（彎手肘＋肩頭軀幹配套），姿勢選「課堂舉手」或「歡呼握拳」

拍板後寫進 ADR 0001「尚未定案」或 ADR 0003「否決紀錄」。

---

## 附錄 A：Meshy 與 Tripo 原始調查報告

來源縮寫：
- MD = Meshy API 文件 https://docs.meshy.ai （llms-full.txt、/api/pricing、/api/rigging、/api/animation、/api/changelog、/api/ai）
- MP = https://www.meshy.ai/pricing
- TD = Tripo 開發者文件 https://developers.tripo3d.ai/en/docs/{頁名}（加 .md 可取純文字）
- TP = https://www.tripo3d.ai/pricing（curl 403，用 Chrome 讀到）
- TG = 官方 GitHub 組織 VAST-AI-Research（tripo-python-sdk、tripo-mcp）、vast-enterprise/Tripo-API-CLI（npm tripo-cli 0.5.2，內含官方 skill 文件）

標註：[官方]＝來自上述官方來源；[未確認]＝查不到官方來源。

---

### 一、Meshy

#### 1. 輸入與最新模型
- 單張圖：`POST /openapi/v1/image-to-3d`，支援 jpg/jpeg/png，可給公開 URL 或 base64 Data URI [官方] https://docs.meshy.ai/api/image-to-3d
- 多視角：`POST /openapi/v1/multi-image-to-3d`，1 到 4 張同物體圖 [官方] 同站 changelog
- 文字：`POST /openapi/v2/text-to-3d` [官方]
- 最新模型：Meshy 7.1（`meshy-7.1`，`latest` 即指它），2026-09-18 加入 API；meshy-7 於 2026-08-13 加入；另有 meshy-6、meshy-6-lite、Smart Topology 用的 meshy-t2 [官方] https://docs.meshy.ai/api/changelog
- Meshy 7 已列為 deprecated 但仍可用；meshy-5 將於 2026-10-10 退役 [官方]

#### 2. 風格保留
- 3D 生成端沒有「卡通／動漫／低模」風格選項。舊的 `art_style` 參數對 Meshy 6 以後已被忽略（只有 realistic、sculpture，且已 deprecated）[官方] 同上 changelog
- 低模：`model_type: smart-topology` + `ai_model: meshy-t2` + `target_polycount`（100–15000），輸出三角面；舊 `lowpoly` 於 2026-10-30 退役 [官方]
- `cartoon` 只出現在 Multi-Color Print（3D 列印上色）的 style 參數，與角色生成無關 [官方]
- 對「2D 日系插畫輸入」：文件無專門說明或範例（只有一張奇幻角色插畫當 Image to 3D 教學輸入圖）[未確認]
- 可用 `pose_mode: a-pose / t-pose` 要求生成姿勢（對後續綁骨有用）[官方]
- 有 Image to Image API（nano-banana、GPT Image 系列），可先用 AI 把插畫改成較適合轉 3D 的圖 [官方]

#### 3. 綁骨
- 功能名：Auto-Rigging（API `POST /openapi/v1/rigging`；網頁叫 Rigging / Animate）[官方] https://docs.meshy.ai/api/rigging
- 角色類型：API 文件明說目前只對標準人形（雙足）可靠；不適用無貼圖網格、非人形、肢體不清楚的人形。網頁版導覽文件則寫支援 humanoid 與 quadruped 並自動偵測 [官方，兩處說法不一致，API 以人形為準]
- 輸入要求（API）：必須有貼圖；用 `input_task_id` 時面數 ≤30 萬；用 `model_url` 只收 glb，且角色臉要朝 +Z；可給 `height_meters`（預設 1.7）；失敗模式 422＝姿勢估計失敗 [官方]
- 網頁建議 T-pose 或 A-pose；疑難排解表提到「姿勢非標準會造成骨位偏移」「比例異常會嚴重變形」，先 Remesh 再綁骨 [官方]
- 「雙腿不能黏」：沒有這句明文 [未確認]；最接近的是「肢體要清楚」
- 點數：API 綁骨 5 點／次 [官方] https://docs.meshy.ai/api/pricing ；網頁版點數表寫綁骨 0、動畫 0（「最新金額見 meshy.ai」）[官方，但與 API 不同，且該頁可能過時]
- 失敗任務退點（consumed_credits 回 0）[官方]

#### 4. 動畫
- 預設動畫庫：API 公開清單端點回傳 total=680（我 2026-10-09 實抓 https://api.meshy.ai/web/public/animations/resources）；網頁文件寫「500+」[官方]
- 分類：WalkAndRun、BodyMovements、DailyActions、Fighting、Dancing；`GET /openapi/v1/animations/library` 免費、需 API key [官方]
- 套用：`POST /openapi/v1/animations`，`rig_task_id` + `action_id`，或 `action_ids`（最多 10 個合成單一檔，一個 clip 一個動作，適合接遊戲狀態機）[官方]
- 自訂動作：有 Text to Motion API（文字生動作 clip，prime 10 點／swift 3 點），產出再用 `motion_task_id` 套到綁好的雙足角色；官方網頁文件則說完全自訂的動作請匯出 FBX 去 Blender/Maya [官方]
- 匯出動畫：glb、fbx；`post_process` 可轉 fps（24/25/30/60）、fbx2usdz、extract_armature [官方]
- 綁骨完成就附帶基本走路／跑步動畫檔（fbx/glb）[官方]
- 價格：每個動作 3 點，一次最多 10 個 [官方]

#### 5. 匯出格式
- 圖轉 3D 下載：fbx、obj、usdz、glb、stl、blend（網頁）[官方 MP]；API model_urls：glb/fbx/obj/usdz（視情況不一定全有）[官方]
- 綁骨後：rigged_character_fbx_url / glb_url；動畫：animation_glb_url / animation_fbx_url [官方]
- 免費方案下載限制：定價頁與文件都沒有寫 [未確認]
- 資產保留：非 Enterprise 只保留 3 天，要自己下載存檔 [官方]

#### 6. 價格
- 免費：每月 100 點（每月 1 日 00:00 UTC 重置），免信用卡 [官方 MP]
- Pro：每月 1,000 點，含 API 存取、10 個並行任務、快 60% [官方 MP]
- Pro / Studio / Enterprise 的月費數字：頁面卡片在我的抓取中未顯示 [未確認]。只知首月月繳 5 折、年繳 8 折；網頁方案圖提到 Pro、Premium、Ultra 三階，API 限速表也有 Premium(30 queue)、Ultra(100 queue)，與 Studio 並存，命名不一致
- 單次扣點（API，meshy-7.1/meshy-6）：圖轉 3D 只出網格 20；加 2K/4K 貼圖 30；8K 35；Ultra 幾何 +5；meshy-6-lite 網格 5、含 2K 貼圖 15；meshy-t2 網格 5、含 2K 貼圖 15 [官方 https://docs.meshy.ai/api/pricing]
- 綁骨 5 點；動畫 3 點／動作；Remesh 5；Convert 1；Resize 1 [官方]
- 一條完整流水（含貼圖圖轉 3D 30 + 綁骨 5 + 1 個動作 3）＝38 點（算術，非官方標價）。免費 100 點約可跑 2 輪
- 網頁版點數表（另頁）寫 Image to 3D 在 Meshy 7 為 25、Meshy 6 為 20，與 API 表不同 [官方，兩處不一致]

#### 7. 授權
- 免費方案：CC BY 4.0，可商用但要署名（建議在商業頁面註明用了 Meshy）[官方 MP]
- 付費方案：用戶擁有全部產出，可完全散布與販售；前提是輸入素材不侵權 [官方 MP]
- 注意：免費方案若輸入是自己的原創插畫，署名義務與「公開」的細節 [未確認]

#### 8. API 與自動化（重點）
- 公開 REST API：基底 `https://api.meshy.ai/openapi/`；文件 https://docs.meshy.ai ；OpenAPI 規格 https://docs.meshy.ai/openapi.yaml ；agent 用全文 https://docs.meshy.ai/llms-full.txt [官方]
- 認證：`Authorization: Bearer msy_...`，金鑰在 https://www.meshy.ai/developers/keys 建立，每把可設每月點數上限；建立／管理金鑰需付費方案，免費帳號只能在 Playground 用內建測試金鑰（僅 Image to 3D）[官方]
- 主要 endpoint：
  - 圖轉 3D：`POST /openapi/v1/image-to-3d`；查詢 `GET /openapi/v1/image-to-3d/:id`
  - 綁骨：`POST /openapi/v1/rigging`（`input_task_id` 或 `model_url`）
  - 動畫：`POST /openapi/v1/animations`
  - 下載：任務物件裡的簽名 URL（`model_urls.*`、`result.rigged_character_fbx_url`、`animation_fbx_url`）直接 GET
  - 其他：Remesh、Retexture、餘額 `GET /openapi/v1/balance`、SSE 串流 `/:id/stream`、Webhook（每帳號最多 5 個）[官方]
- 計費：API 是預付點數制，點數從 https://www.meshy.ai/settings/subscription 購買 [官方]；與網頁方案點數是否分池：Playground 文件說用「你方案的點數」，其餘 [未確認]
- 限速：Pro 20 req/s、queue 10；Studio queue 20；Enterprise 100 req/s [官方]
- 官方 MCP server：有，npm `@meshy-ai/meshy-mcp-server`，開源 https://github.com/meshy-dev/meshy-mcp-server ；安裝：`claude mcp add meshy --env MESHY_API_KEY=msy_... -- npx -y @meshy-ai/meshy-mcp-server`。工具含 meshy_image_to_3d、meshy_rig、meshy_animate、meshy_download_model、meshy_check_balance 等 [官方 https://docs.meshy.ai/api/ai]
- 另有官方 skill 包 `meshy-dev/meshy-3d-agent`；官方 SDK/CLI：文件未提及 [未確認]（只有 REST 範例與 MCP）
- Claude Code 能否終端機全程自動（上傳圖→生成→綁骨→套動畫→下載 FBX/GLB）：
  - 可以，條件是已有付費方案與 API 金鑰。流程：image_to_3d（有貼圖）→ 輪詢／SSE → rigging(input_task_id) → animations(rig_task_id, action_id) → 取 URL 下載。圖片用 Data URI 免另外上傳
  - 做不到或有風險：(a) 免費帳號無法建金鑰，全程只能手動網頁；(b) API 綁骨只認人形，非人形（如小羊）要走網頁或別家；(c) 綁骨成敗取決於模型姿勢，422 失敗需重生；(d) 資產只留 3 天，要立刻下載；(e) 沒有帶你自己骨架／自己動作檔上傳的端點（自訂動作只能 Text to Motion）

#### 9. 已知限制（官方自列）
- 自動綁骨不適用：無貼圖、非人形、肢體不清楚、面數 >30 萬（先 Remesh）[官方 rigging 頁]
- 複雜自訂骨架（表情、尾巴物理）不支援，需匯出到 DCC [官方 webapp rigging 頁]
- 姿勢偏離 T/A pose 會骨位偏移；比例怪會嚴重變形 [官方]
- DELETE 對 IN_PROGRESS 任務回 409 且點數不退；失敗任務退點 [官方 changelog]
- 資產 3 天過期；舊 shared test-mode 金鑰已停用 [官方]

---

### 二、Tripo

#### 1. 輸入與最新模型
- 單張圖：`POST /v3/generation/image-to-model`，PNG/JPEG/WebP，≤20 MB [官方 TD generation-image-to-model/standard]
- 多視角：`POST /v3/generation/multiview-to-model`（至少 front＋另一視角，最多 front/back/left/right 四張）；文字：`text-to-model`；另有 image-to-multiview（一張圖補四視角）[官方 TD introduction；CLI 文件]
- 最新：H 系列 `tripo-v3.1`（線上值 `v3.1-20260211`，預設）；P 系列低模 `tripo-p1`（P1-20260311，GA）、`tripo-p2`（P2-20260801，2026-08 Preview，多了 quad）[官方 TD models-and-versions、changelog；日期取自 tripo-cli 官方 skill 文件]
- v3.1 的確切「發布日」官方文件沒有寫，只能從版本字串推為 2026-02-11 [未確認]
- 貼圖模型另有 v3.5-20260815（2026-09 changelog）[官方]

#### 2. 風格保留
- 生成端沒有卡通／動漫選項。後處理 `stylize` 只有 lego / voxel / voronoi / minecraft [官方 SDK 文件 TG；CLI]
- 低模：P1/P2（面數 48–20000／P2 至 50000）、`smart_low_poly`（500–20000 面，限 v3.x）[官方]
- `texture_alignment`：`original_image`（貼圖貼近原圖）或 `geometry`；`enable_image_autofix`；`delight`（去掉參考圖烘焙光影，v3.5 貼圖預設開）[官方]
- 對 2D 日系插畫輸入：沒有官方說明或範例 [未確認]

#### 3. 綁骨
- 功能名：Auto Rig（`POST /v3/animations/rig`）＋事前 Rig Check（`/v3/animations/rig-check`，免費，回 riggable 與建議 rig_type）[官方 TD animations-rig / rig-check]
- 角色類型：biped、quadruped、hexapod、octopod、avian、serpentine、aquatic 七種；規格 `tripo` 或 `mixamo` 骨骼命名；輸出 glb 或 fbx [官方]
- 版本：`v1.0-20240301`（僅人形，90+ 動畫預設，API 預設值）；`v2.5-20260210`（所有體型，預設動作較少）[官方]
- 輸入要求：rig-check 只收 GLB，≤150 MB；rig 可收 GLB/GLTF/FBX/OBJ/STL，≤150 MB [官方]。「雙腿不能黏」：無明文 [未確認]，靠 rig-check 預檢
- 點數：網頁定價頁 Auto Rig 20 點 [官方 TP]；API 文件範例回應 credits_consumed 30.00 [官方，僅範例，是否為實價 未確認]；rig-check 0 點
- 網頁與 API 是否各自計點：API 在 platform.tripo3d.ai 獨立主控台建金鑰與餘額；是否與網站訂閱點數分池，文件未明說 [未確認]

#### 4. 動畫
- 預設動畫庫：rig v1.0＝人形 90+ 個；rig v2.5＝biped 11 個（idle/walk/run/dive/climb/jump/slash/shoot/hurt/fall/turn）＋各體型各 1 個行走類 [官方 TD animations-retarget]
- 自訂動作：只有預設 preset，沒有上傳／文字生動作的端點 [官方文件未見；未確認有無其他入口]
- 套用：`POST /v3/animations/retarget`，input＝rig 任務 id；`animations` 可一次多個（CLI 文件寫 ≤5，按個計費）；`animate_in_place`、`bake_animation`、`export_with_geometry` [官方]
- 匯出：glb、fbx [官方]
- 點數：retarget 單價 [未確認]（官方定價頁表沒有列動畫）

#### 5. 匯出格式
- 轉檔 `/v3/models/convert`：GLTF、USDZ、FBX、OBJ、STL、3MF；選項含 `with_animation`、`fbx_preset`（blender/3dsmax/mixamo）、貼圖格式與大小 [官方 TD models-convert、SDK 文件]
- 免費方案：200 點／月，匯出表格寫「15（H2.5 only）」，模型為公開、非商用、保留 1 天編輯歷史、1 個並行任務 [官方 TP]；這個 15 的單位（次數？）文字未解釋，需當作不確定

#### 6. 價格（網頁 https://www.tripo3d.ai/pricing）
- 免費：$0，200 點／月（約 13 個模型）[官方]
- Pro：$20／月（年繳；月繳同顯示 $20，頁面稱年繳折 50%），3,000 點／月，10 並行，私有、可商用 [官方]
- Max：$90／月，25,000 點／月，100 並行，8K 貼圖不限 [官方]
- Team：每席 $55（年繳）／$110（月繳），90,000 點／月 [官方]
- 加購點數：$10＝1,000 點；$100＝10,000＋2,000；另有 $500、$1000 檔 [官方]
- 網頁單項扣點：HD Generate 15（加 Ultra +15、貼圖 +10、HD 貼圖 +10、Quad +5、分件 +30）；Smart Mesh 35；Segmentation 5；Retopology 5；Texture Gen 10；Auto Rig 20 [官方 TP]
- API 單價：官方文件只在範例出現（image-to-model 範例 100 點；P2 無貼圖 100／貼圖 110–130；rig 範例 30；image-to-splat 固定 30；smartsegment 55／85）。API 與網頁數字量級不同（網頁 HD 15 vs API 範例約 100），API 官方價表 [未確認，需到 https://platform.tripo3d.ai 登入看]
- 一條「圖→綁骨」網頁流水約 15（+貼圖 10）＋20＝約 35–45 點（算術）；動畫點數 [未確認]

#### 7. 授權
- 免費：公開模型、非商用 [官方 TP]
- Pro 以上：私有、可商用 [官方 TP]
- API 產出的授權條款文件未見 [未確認]

#### 8. API 與自動化（重點）
- 公開 REST API：基底 `https://openapi.tripo3d.ai/v3`（中國站 .com）；文件 https://developers.tripo3d.ai/en/docs/introduction ；索引 https://developers.tripo3d.ai/llms.txt ；各頁加 `.md` 取純文字 [官方]
- 認證：`Authorization: Bearer tsk_...`，金鑰在 Tripo Console（platform.tripo3d.ai → API Keys）建立 [官方 TD authentication]。免費帳號能否建 API 金鑰、是否有 API 免費額度：[未確認]（CLI 文件稱註冊送免費點）
- 主要 endpoint：
  - 上傳：`POST /v3/files`（取 file_token），另有 upload-credentials
  - 圖轉 3D：`POST /v3/generation/image-to-model`
  - 綁骨：`POST /v3/animations/rig-check` → `POST /v3/animations/rig`
  - 動畫：`POST /v3/animations/retarget`
  - 轉檔／下載：`POST /v3/models/convert`；結果在 `GET /v3/tasks/{task_id}` 的 output URL；餘額 `GET /v3/account/balance`；Webhook 有（HMAC-SHA256 簽章）[官方]
  - 任務失敗或取消凍結點數退回 [官方 billing]
- 限速：以 API key 計；並行以帳號計，H 系列 10、P 系列 5、動畫（rig／retarget）10、轉檔 5、圖像生成 1 [官方 rate-limits]
- 官方 SDK／CLI：
  - Python `pip install tripo3d`（含 rig_model、retarget_animation、check_riggable）、JS、Go、Rust、Java SDK（GitHub VAST-AI-Research）[官方]
  - 官方 CLI `tripo-cli`（npm，0.5.2，repo vast-enterprise/Tripo-API-CLI）：`tripo make hero.png --then texture,rig,convert:fbx`，非 TTY 自動輸出單行 JSON、固定 exit code，專為 AI agent 設計，內附 `tripo docs --llm` 與 SKILL.md；device-flow 登入或 `TRIPO_API_KEY` [官方]
  - 官方 MCP：`tripo mcp`（CLI 內建，README 稱可接 Cursor／Claude Desktop）；另有 VAST-AI-Research/tripo-mcp，但 alpha、依賴 Blender 外掛，不適合純終端機 [官方]
  - 文件另有 Codex Plugin、ComfyUI 節點頁 [官方]
- Claude Code 能否終端機全程自動：
  - 可以。`tripo make char.png --then rig,convert:fbx` 或 `tripo anim rig` + `tripo anim retarget --animation preset:walk --out-format fbx`；或直接用 REST／Python SDK
  - 做不到或有風險：(a) 需先在 Console 建金鑰（人工一次）；(b) 沒有自訂動作上傳，只有 preset；人形最完整動作庫要用 rig v1.0 並指定；(c) retarget 只吃 rig 任務 id；(d) 動畫單價與 API 價表查不到；(e) 日系插畫風格轉出的 3D 是否保持，要實測

#### 9. 已知限制（官方自列）
- `generate_parts` 不能同時開貼圖；`quad=true` 強制 FBX；P1 不支援 quad／smart_low_poly／generate_parts／geometry_quality [官方 CLI 文件整理、changelog]
- `export_orientation` 只影響該次生成，後續貼圖／綁骨／轉檔不繼承，會出錯方向但仍回 success [官方 CLI 文件]
- `smart_low_poly` 適合簡單輸入，複雜模型偶爾失敗 [官方 TD]
- `fast` 貼圖品質只能配 v3.5 貼圖 [官方 changelog]
- 圖像生成並行只有 1；chat_image_1 將於 2026-10-23、chat_image_1.5 於 2026-12-01 退役 [官方]
- credits 為小數（最多兩位），要用浮點解析 [官方 changelog]

---

### 三、直接對比（給決策用）
- 全自動、對 Claude Code 最順：兩家都可。Meshy 有官方 MCP＋明確的 OpenAPI／llms-full；Tripo 有官方 CLI（agent 導向設計）＋多語 SDK。
- 動畫庫：Meshy 680 個、含 Text to Motion 自訂；Tripo 人形 90+、其他體型每型約 1 個。
- 綁骨範圍：Meshy API 僅人形；Tripo 七種體型（含四足，可用於小羊）。
- 便宜程度（官方標價）：Meshy 完整流水約 38 點，免費 100 點可試；Tripo 免費 200 點，網頁價約 35–45 點，但 API 價未確認。
- 免費層可商用：Meshy 免費可商用（署名）；Tripo 免費不可商用。
- 兩家都沒有官方「動漫風保留」說明；都需實測。

## 附錄 B：TRELLIS.2 與 Hunyuan3D 原始調查報告

來源只用官方 GitHub／HF／LICENSE／arXiv／Blender 手冊。[官方]＝官方檔案直接載明；[未確認]＝查不到官方說法；[社群]＝非官方使用者回報（只當線索）。

### 一、TRELLIS.2（Microsoft）

#### 1. 最新版本、日期、權重
- 最新＝TRELLIS.2-4B（4B 參數）。repo 建立 2025-11-26；HF 模型庫建立 2025-12-01、最後更新 2025-12-27；repo 最後 push 2026-07-10。[官方] https://github.com/microsoft/TRELLIS.2 ／ https://huggingface.co/api/models/microsoft/TRELLIS.2-4B
- 權重：https://huggingface.co/microsoft/TRELLIS.2-4B（解析度 512³–1536³）。[官方]
- 論文 arXiv:2512.14692（HF tag 載明）。[官方]
- 未見比 TRELLIS.2 更新的後續 repo。[未確認]（只確認 README 與 repo 列表，未窮舉微軟全部 repo）

#### 2. 技術路線
- 直接生成 3D：用「field-free 稀疏體素」O-Voxel 表示，Sparse 3D VAE（16× 下採樣）編成緊湊 latent，再用 vanilla DiT 生成；不是先生多視角再重建。[官方] https://github.com/microsoft/TRELLIS.2

#### 3. 輸入
- 單張圖 image-to-3D；另有「給定現成 3D 形狀、生 PBR 貼圖」的 pipeline（example_texturing.py）。[官方] 同上 README
- 多圖輸入：README 未載明支援；issue #10、#27、#77、#103 有人詢問／實驗（#103 標題「multi-image inputs is worse」）。[社群] https://github.com/microsoft/TRELLIS.2/issues/103
- 文字輸入：README 未提。[未確認]
- 2D 動漫風：README 無官方範例或說明。[未確認]

#### 4. 輸出
- GLB（to_glb），PBR：Base Color／Roughness／Metallic／Opacity；範例貼圖 4096。[官方] README
- GLB 預設 OPAQUE 模式，透明度要在 3D 軟體手動接 alpha。[官方]
- 面數：範例 decimation_target=1000000，simplify 上限 16777216（nvdiffrast 限制）；有參數可控，無預設面數說明。[官方]
- 能處理開放面、非流形、內部封閉結構（衣物、葉片）。[官方]

#### 5. 綁骨與動畫
- 沒有。README 與 roadmap 完全未提綁骨／動畫，也未推薦下游工具。[官方：README 無此功能]

#### 6. 硬體需求（Mac 重點）
- 官方：「An NVIDIA GPU with at least 24GB of memory is necessary」；只在 Linux 測過；CUDA Toolkit 建議 12.4，預設 PyTorch 2.6.0＋CUDA 12.4；驗證過 A100、H100。[官方] README
- H100 速度：512³ 約 3s、1024³ 約 17s、1536³ 約 60s。[官方]
- 依賴 flash-attn、nvdiffrast、nvdiffrec、CuMesh、FlexGEMM（皆 CUDA）。[官方] README 安裝節
- Apple Silicon／MPS／CPU：README 無官方支援。issue #74「Explore non-CUDA backends (MPS / AMD / Intel)」仍 OPEN，留言者全為一般使用者（authorAssociation 皆 NONE），無微軟官方回應；有人求 MLX、有人自行移植 ROCm。[官方 issue 狀態／無官方回應] https://github.com/microsoft/TRELLIS.2/issues/74
- 結論：Mac 本機跑＝官方不支援。

#### 7. 授權
- MIT License，Copyright (c) Microsoft Corporation：可商用、修改、散布、再授權，需保留版權聲明；無地區限制、無月活門檻、無衍生物要求。[官方] https://github.com/microsoft/TRELLIS.2/blob/main/LICENSE
- 依賴另有授權：nvdiffrast、nvdiffrec（NVlabs，GitHub 標示 "Other"，為 NVIDIA 自訂授權，條款本次未逐條讀）。[官方 README 指出各自授權；條款內容未確認] https://github.com/NVlabs/nvdiffrast/blob/main/LICENSE.txt
- 注意：O-Voxel／CuMesh／FlexGEMM 等子套件授權本次未查。[未確認]

#### 8. 線上 demo
- HF Space：https://huggingface.co/spaces/microsoft/TRELLIS.2（Gradio，執行中，ZeroGPU/A10G 硬體）。[官方]
- 免費額度：Space 本身免登入額度規則 README 未載；ZeroGPU 一般有每日配額。[未確認]
- 能否下載結果：README 說 demo 輸出 GLB；Space 介面下載按鈕本次未實測。[未確認]

#### 9. API／Docker／終端機呼叫
- 官方無 API、無 Docker（README 只有 conda setup.sh）。[官方]
- 可能的遠端路線：HF Space 是 Gradio，理論上可用 gradio_client 從終端機呼叫（Gradio 通用機制，非 TRELLIS 官方文件）。[未確認：此 Space 的 API 端點未實測]

---

### 二、Hunyuan3D（騰訊）

#### 1. 最新版本、日期、權重
- 開源權重的最新「圖生 3D 主線」＝Hunyuan3D-2.1：2025-06-13 發布，技術報告 2025-06-19（arXiv 2506.15442）。含 Shape-v2-1（3.3B）與 Paint-v2-1（2B）。[官方] https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1
- 權重：https://huggingface.co/tencent/Hunyuan3D-2.1（shape 子資料夾 hunyuan3d-dit-v2-1、paint 子資料夾 hunyuan3d-paintpbr-v2-1；Real-ESRGAN 另下載）。[官方]
- 2.1 之後 org 內的新 repo（非 2.1 後繼的圖生 3D）：[官方] https://github.com/Tencent-Hunyuan
  - Hunyuan3D-Omni（2025-09，繼承 2.1 結構，加骨架姿勢／bbox／點雲／體素控制，10GB VRAM）
  - Hunyuan3D-Part（2025-09／12 更新，部件相關）
  - Hunyuan3D-Buffalo1.0（2026-08-05，arXiv 2608.02711，統一多模態 3D 生成／理解／編輯）、WorldClaw（2026-08，3D 開放世界）：README 只有論文與專案頁，無權重／安裝說明、無 LICENSE。
- Hunyuan 2.5 只有技術報告（arXiv 2506.16504，見 Hunyuan3D-2 README）；2.5／3.0 權重是否開源：[未確認]。

#### 2. 技術路線
- 兩階段：Shape（流匹配 DiT 在 latent 上生成，轉為無貼圖網格）→ Paint（多視角 PBR 紋理合成，範例 max_num_view=6、resolution=512，貼到網格）。即「先直接生成幾何，再多視角生貼圖」；幾何本身不是靠多視角重建。[官方 README 描述兩階段；DiT/多視角細節來自 README 與參數，未讀論文全文] https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1 ／ https://arxiv.org/abs/2506.15442

#### 3. 輸入
- 單張圖（HF tag 同時含 text-to-3d，但 2.1 README 僅示範圖片輸入）。[官方]
- 多視角：2.0 系列有 Hunyuan3D-2mv（多視角 DiT）；2.1 README 未列。[官方 2.0 README] https://github.com/Tencent-Hunyuan/Hunyuan3D-2
- 2D 動漫風：2.1 README 無相關範例或說明。[未確認]

#### 4. 輸出
- 無貼圖網格＋PBR 貼圖網格；具體檔案格式 README 範例未逐一確認，Gradio／API 流程常見 GLB／OBJ。[格式：未確認；PBR：官方]
- 面數可控：README 擷取內容未見明確參數。[未確認]

#### 5. 綁骨與動畫
- 2.1 本身沒有綁骨或動畫功能。[官方：README 未提]
- 2.0 README 有一句「讓使用者操作甚至 animate 其網格」的宣傳語，但未提供綁骨功能。[官方，措辭模糊]
- Hunyuan3D-Omni 的「Pose Control」是以骨架姿勢條件生成人形，不是對輸出自動綁骨。[官方] https://github.com/Tencent-Hunyuan/Hunyuan3D-Omni
- 官方推薦的下游綁骨工具：未見。[未確認]

#### 6. 硬體需求（Mac 重點）
- VRAM：shape 約 10GB、texture 約 21GB、兩者合計約 29GB；有 --low_vram_mode。[官方] 2.1 README
- 2.0 版：shape 6GB、合計 16GB。[官方] 2.0 README
- README 寫「supports Macos, Windows, Linux」，但安裝指令是 PyTorch 2.5.1+cu124，只在此環境測試；無 MPS 說明。[官方]
- Mac issue：#32「How does Hunyuan3D-2.1 support MacOS?」、#1「Support Apple Silicon」、#193「mac 依赖报错」皆 OPEN；#32 有人問 README 的 macOS 是否筆誤，並有社群 fork（zettai-seigi/Hunyuan3D-2.1）自行改 Mac，留言者皆非官方。[官方 issue 狀態／無官方回應；fork 屬社群] https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/issues/32
- 結論：README 宣稱支援 macOS，但實際無官方 MPS 路徑，貼圖階段尤其吃 CUDA；需視為不保證。

#### 7. 授權
- LICENSE 全名：Tencent Hunyuan 3D 2.1 Community License Agreement（2025-06-13）。GitHub API 判為 NOASSERTION，HF tag 為 license:other。[官方] https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE
- 地區：全球，但不含歐盟、英國、南韓（明文「DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA」，領域外使用視為無授權）。[官方]
- 商用：免費；產品／服務月活 >1,000,000（發布時點前一曆月）須向 Tencent 申請授權，Tencent 可自行決定是否給（hunyuan3d@tencent.com）。[官方]
- 衍生／散布：修改檔需標註；散布須附授權與 Notice 檔；下游協議須傳遞使用限制；產品需揭露實際提供者並聲明與騰訊無關；輸出不得用來改進其他 AI 模型（Tencent 自家模型或其衍生除外）。[官方]
- Outputs：Tencent 聲明不主張輸出的權利。[官方]
- 其他：違反可終止；訴訟 Tencent 則授權終止；準據法與管轄＝香港。Acceptable Use Policy 禁軍事等用途。[官方]
- 依賴套件另有授權：本次未逐一查。[未確認]
- 本專案（台灣教會）：台灣屬領域內，月活遠低於 100 萬；以上為條文摘要，非法律意見。

#### 8. 線上 demo
- HF Space：https://huggingface.co/spaces/tencent/Hunyuan3D-2.1（執行中，zero-a10g）；官方網站 https://3d.hunyuan.tencent.com 。[官方]
- 免費額度與下載：官網額度規則、Space 下載功能本次未實測。[未確認]

#### 9. API／Docker／終端機
- repo 內有 api_server.py（FastAPI）、API_DOCUMENTATION.md（POST 帶 base64 圖片，參數 texture、seed 等）、docker/Dockerfile（README 自述「tested on Windows 10」）。這些都是本機 GPU 自架用。[官方] https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1
- 2.0 另有 Blender addon（需先啟動 API server）。[官方 2.0 README]
- 騰訊雲／官網付費 API：本次未查。[未確認]
- HF Space（Gradio）理論上可 gradio_client 呼叫，未實測。[未確認]

---

### 三、補查：GLB 進 Blender 自動綁骨並渲染 2D 序列圖
- Blender 官方有 headless 模式：「-b, --background：Run in background (often used for UI-less rendering)」；另有 -P/--python、-a/--render-anim、-f/--render-frame、-o/--render-output、-E/--engine 等參數。[官方] https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html
- Python API 可匯入 glTF：`bpy.ops.import_scene.gltf(filepath=..., filter_glob='*.glb;*.gltf', ...)`。[官方] https://docs.blender.org/api/current/bpy.ops.import_scene.html
- 另有 Blender 當 Python 模組（bpy）用的官方頁。[官方] https://docs.blender.org/api/current/info_advanced_blender_as_bpy.html
- 可建骨架（Armature Operators）與自動權重：手冊「With Automatic Weights」會用「bone heat」演算法依距離算權重，但手冊自己說結果常不理想。[官方] https://docs.blender.org/manual/en/latest/animation/armatures/skinning/parenting.html
- 重要限制：Blender 官方沒有「對任意網格全自動放骨頭」的功能；骨頭位置仍須腳本指定（人形 Rigify metarig 也要對位）。Rigify 手冊頁本次 404，未讀到。[官方：未見此功能；Rigify 細節未確認]
- 所以「自動綁骨＋渲染序列圖」只有渲染、匯入、自動權重是官方可 headless 腳本化；骨頭放置要自己寫座標邏輯或用第三方工具。

---

### 四、與使用者機器（Mac）相關的總結
- TRELLIS.2：MIT 授權最乾淨，但官方要求 NVIDIA 24GB＋Linux，Mac 無路徑；實務只能用 HF Space 或租雲端 GPU。
- Hunyuan3D-2.1：README 寫支援 macOS 但缺 MPS 實據；授權有地區與月活條款（台灣可用）。
- 兩者都沒有綁骨／動畫；皆不針對 2D 動漫風輸入提供官方說明。

### 最不確定的三件事
1. 兩個 HF Space 的免費額度與「能否下載 GLB」沒有實測，gradio_client 從終端機呼叫是否可行未驗證。
2. Hunyuan 2.1 的輸出格式與面數可控性（README 擷取內容未明載），以及 Hunyuan 2.5／3.0 是否另有開源權重。
3. nvdiffrast／nvdiffrec 等依賴授權條款（NVIDIA 自訂）是否影響商用，只確認名稱、未讀條款。

## 附錄 C：Rodin 與 3D AI Studio 原始調查報告

來源皆為官方頁面，經 WebFetch 摘要取得（摘要工具可能漏細節）。

### 一、Rodin（Hyper3D，Deemos）

### 1. 輸入與模型版本
- 圖片轉 3D：Gen-2.5 API 可傳 1~5 張 images（第一張決定材質），prompt 選填；文字轉 3D 只傳 prompt [官方] https://docs.hyper3d.ai/en/api-specification/rodin-gen2-5
- Gen-2 為單張圖或文字；Gen-1/1.5 支援多圖 concat／fuse [官方] https://docs.hyper3d.ai/en/get-started/features
- 最新模型：Gen-2.5（Extreme-Low、Low、Medium、High、Extreme-High 五檔）[官方] 同上
- 發布日期：[未確認]（官方頁面查無日期）
- 首頁另說可單張、可選多視角、草圖 [官方] https://hyper3d.ai/

### 2. 風格保留
- 官網首頁稱有 21 種風格，含 Anime、Low Poly、Voxel、Stylized [官方] https://hyper3d.ai/
- 另有 Smart Low-Poly（Creator 以上）[官方] https://hyper3d.ai/pricing
- API 文件頁沒有列出風格參數（Gen-2.5 頁只有 tier／mesh_mode／quality／texture_mode 等）[官方] https://docs.hyper3d.ai/en/api-specification/rodin-gen2-5 。風格選項是否能透過 API 使用：[未確認]
- 對 2D 日系插畫輸入的專屬說明或範例：[未確認]（首頁僅寫可輸入 illustrations、sketches）

### 3. 綁骨
- Gen-2.5 API 與 MCP 文件均無綁骨功能：沒有 [官方] https://docs.hyper3d.ai/en/api-specification/rodin-gen2-5 、https://hyper3d.ai/features/mcp
- Hyper3D 部落格稱有「AI animation tool」可自動綁骨雙足角色，但無產品名、價格、API 說明 [官方，但屬行銷文章] https://hyper3d.ai/blog/3d-rigging 。是否為可用正式功能：[未確認]
- 動畫用途頁只稱輸出「rigging-ready」網格（乾淨拓樸），不等於綁骨 [官方，經搜尋摘要] https://hyper3d.ai/use-cases/animation

### 4. 動畫
- 預設動畫庫、自訂動畫：沒有（未見任何官方文件；上述 animation tool 細節 [未確認]）

### 5. 匯出格式
- 網頁：STL、FBX、OBJ、GLB、GLTF、USDZ [官方] https://hyper3d.ai/
- API／MCP：GLB/GLTF、OBJ、FBX、USDZ、STL，視所選生成路徑而定 [官方] https://hyper3d.ai/features/mcp
- 免費方案下載限制：定價頁寫免費方案含「export from legacy models」；付費才有 unlimited export，故免費新模型匯出可能受限 [官方，字面推論] https://hyper3d.ai/pricing 。確切限制 [未確認]

### 6. 價格
- Free：$0；每月點數 [未確認]（頁面未載）；含確認前免費生成、舊模型匯出、基本圖轉 3D、10 個私人資產 [官方] https://hyper3d.ai/pricing
- Creator：$30/月（年繳 $24/月）；約 60 個模型（估計）；含多圖轉 3D、Smart Low-Poly、無限匯出
- Business：$120/月（年繳 $96/月）；約 416 個模型（估計）；含完整 API 存取、API 速率 120 RPM（前三級）或 240 RPM
- 直購點數：每點 $1.5 [官方] 同上
- 一次圖轉 3D 扣幾點：網頁 [未確認]。API 的 Gen-2.5：基本 0.5 點，Extreme-High 加 0.5，texture_mode=extreme-high 加 2.0，可疊加 [官方] https://docs.hyper3d.ai/en/api-specification/rodin-gen2-5 ；另一頁寫 Gen-2.5 起價 1 點，HighPack 加 1 點 [官方] https://hyper3d.ai/features/api 。兩頁數字不一致，以實際回應的 `consumed` 欄位為準

### 7. 授權
- 條款：Rodin 輸出「不會限制你的使用」，但受協議、法律、第三方條款約束；匯出可私用或商用「視訂閱方案而定」；不保證輸出可享著作權 [官方] https://hyper3d.ai/legal/terms
- ChatAvatar 預設是個人娛樂 CC 授權，商用需購買 License（與 Rodin 是不同產品）
- 免費方案能否商用：[未確認]（條款未明列）；付費方案商用：定價頁寫 Creator 有 unlimited export and use [官方] https://hyper3d.ai/pricing
- 注意：條款第 5 節允許 Deemos 為改善服務使用 prompt 與輸出，與「私人輸出不使用」並存未調和 [官方]

### 8. API 與自動化
- 公開 REST API，Base URL `https://api.hyper3d.com/api/v2`，Bearer 金鑰，在 API dashboard 建立 [官方] https://docs.hyper3d.ai/ 、https://docs.hyper3d.ai/en/get-started/quick-start
- 主要 endpoint：
  - `POST /rodin`（multipart，images 欄位重複最多 5 張，加 tier、mesh_mode、quality）
  - `POST /status`（JSON，subscription_key；首次等 5 秒以上、退避輪詢、遵守 Retry-After）
  - `POST /download`（JSON，task_uuid）
  - 另有查餘額 endpoint（路徑 [未確認]）
- 文件：https://docs.hyper3d.ai/ （舊網址 developer.hyper3d.ai 已 301 轉址）
- API 需 Business 方案（完整 API 存取）[官方] https://hyper3d.ai/pricing ；但 features/api 頁寫有 7 天免費試用，額度 [未確認]。API 點數是否與網頁點數分開：[未確認]（官方 api 頁明說未講）；MCP 則是授權時選 billing workspace 扣該工作區額度
- 官方 MCP：託管服務，不是 GitHub 專案。名稱 hyper3d-rodin，URL `https://api.hyper3d.com/api/mcp`，Claude Code 安裝：`claude mcp add --transport http hyper3d-rodin --scope user https://api.hyper3d.com/api/mcp`，再 `claude mcp login hyper3d-rodin`（瀏覽器授權、選 billing workspace）[官方] https://hyper3d.ai/features/mcp
  - 功能：文字或圖片生成、查任務進度、回傳下載連結；模式 Gen-2.5-Medium 與 Gen-2.5-Extreme-Low；個別 tool 名稱 [未確認]；不含綁骨
  - 圖片轉 3D 在 MCP 是否支援以及如何傳圖：頁面寫「圖片（where supported）」，[未確認]
- GitHub `DeemosTech/rodin-mcp-server`（Python，2025-10-19 建立）：搜尋結果顯示存在，但我直接抓取 github.com/siliconsociety/... 為 404（那是猜的路徑，無關）；DeemosTech 該 repo 未能直接驗證維護狀態 [未確認]。官方 MCP 頁沒有指向它，建議視為舊版／非主要路線
- 官方 SDK／CLI：沒有（只有 REST 範例與 Blender、Unity、Unreal、Godot、Maya 等外掛）[官方] https://hyper3d.ai/features/api
- Claude Code 全自動鏈：上傳圖 → 生成 → 下載：可行（curl 或 Python 呼叫 REST，或用官方 MCP）。綁骨：做不到（Rodin 無綁骨 API）。卡點：API 需 Business 方案 $120/月；MCP 首次授權需人在瀏覽器登入一次；MCP 傳本機圖片的方式 [未確認]，用 REST multipart 較確定

### 9. 已知限制（官方文件）
- 帳號有並行任務上限，超過回 `API_PARALLELISM_LIMIT_REACHED` [官方] https://docs.hyper3d.ai/en/get-started/features
- 未傳 tier 會退回 Regular（Gen-1/1.5 資產），須明確指定 tier [官方] Gen-2.5 規格頁
- 錯誤碼：400 欄位／檔案無效、401 認證、429 限流
- 其他數值限制（檔案大小、下載連結有效期）：[未確認]

---

### 二、3D AI Studio（3daistudio.com）

### 1. 輸入與模型版本
- 輸入：文字、單張圖（JPG／PNG／WebP）、多圖（Studio 方案以上）、草圖 [官方] https://3daistudio.com/ 、https://docs.3daistudio.com/3d-generation/image-to-3d
- 聚合 20+ 模型：自家 Prism（預設 Prism 3.1）、Meshy、Tripo、Rodin、Hunyuan3D、Hitem3D、Trellis、Seed3D；單圖模型 12 個，多視角用 1~8 張（付費）[官方] 同上
- 最新模型版本與發布日期：Prism 3.1 為預設；發布日期 [未確認]（變更記錄 https://3daistudio.com/Updates 未抓取）

### 2. 風格保留
- 文字轉 3D 提示可指定 low-poly、cartoon、stylized、anime（官方舉 chibi anime 範例）[官方] https://docs.3daistudio.com/3d-generation/prompt-tips
- 無獨立「風格下拉選項」的說明；2D 插畫輸入：官方明說「flat illustration 風格不建議」，建議先轉成 "3D render style / stylized 3D" 的圖再轉 3D（可用 Image Studio 做風格轉換）[官方] 同上。這對日系平面插畫是負面訊號
- 圖片建議：背景乾淨、光線均勻、主體佔滿、略 3/4 視角 [官方] image-to-3d 頁

### 3. 綁骨
- 有：「AI Rigging & Animation」，Prism 支援雙足、四足、鳥類、蛇形，Meshy 僅人形；20 點（Prism）／15 點（Meshy）；預檢免費；輸入 GLB／FBX，輸出 GLB／FBX 含骨架與蒙皮；Prism 骨架遵循 Mixamo 規格 [官方] https://docs.3daistudio.com/processing/rigging
- 最佳效果：T-pose 或 A-pose、有貼圖、單一網格
- 是否能透過 API 綁骨：[未確認]（官方文件明說未涵蓋；API 文件目錄無 rigging 區塊，只有 3D Generation／Texturing／Remeshing／Segmentation／Images／Tools／Flows）[官方] https://3daistudio.com/Platform/API/Documentation

### 4. 動畫
- 預設 12 種：Idle、Walk、Run、Jump、Dance、Wave、Salute、Boxing、Sword Slash、Sitting、Yoga、Celebration；每個 15 點；自動重定向到角色比例 [官方] 同上 rigging 頁
- 自訂動畫：站內沒有，需匯出 FBX 到 Blender／Maya／引擎自己做 [官方]
- 匯出：GLB 或 FBX

### 5. 匯出格式
- GLB、FBX、OBJ、STL（僅幾何）、USDZ；定價頁另列 PLY；FAQ 另列 BLEND、3MF、Collada [官方] https://3daistudio.com/Pricing 、https://docs.3daistudio.com/faq 。清單各頁不完全一致
- 格式轉換 1 點 [官方] FAQ
- 免費下載限制：[未確認]（Studio 方案標明 Unlimited Model Downloads，其他方案未載）

### 6. 價格（網頁訂閱）
- 免費：註冊送點數、免信用卡，金額 [未確認]（官方只說足夠測試數次）
- 訂閱（首頁，年繳折算月價）：Basic $12/月 1,000 點；Studio $23/月 3,500 點；Pro $139/月 18,000 點（3 席）[官方] https://3daistudio.com/ 。定價頁的價格文字摘要被截壞，月繳價格 [未確認]
- 一次性點數包（永不過期）：2,000 點 $34；5,000 點 $69；35,000 點 $399 [官方] https://3daistudio.com/Pricing
- 圖轉 3D 扣點：定價頁寫 20 點；首頁寫 25~35；docs 寫 20~60（視模型，Trellis 2 15 點、Tripo P2 Game Ready 70 點）；範例 Prism 3.1 為 35 點。各頁不一致，以生成前畫面顯示為準 [官方]
- 其他：Rigging 20、Animation 15、Refine 5；Texture／Remesh／LOD 免費 [官方] Pricing 頁

### 7. 授權
- 生成物歸你、可商用（遊戲、App、電商、廣告、實體印製），保留完整權利；模型預設私有 [官方] https://3daistudio.com/Platform/API/Documentation/faq 、https://3daistudio.com/Pricing（寫「所有生成模型皆可商用」，未區分免費與付費）
- 注意：Meshy、Tripo 等第三方引擎各有授權 [官方，列於 https://3daistudio.com/licenses，未抓取細節]

### 8. API 與自動化
- 公開 REST API，Base URL `https://api.3daistudio.com`，Bearer 金鑰，須啟用雙因素驗證（2FA），JSON [官方] https://3daistudio.com/Platform/API/Documentation/getting-started
- 預設速率 3 次/分鐘，超過回 429，可在 dashboard 申請調高
- 文件：https://3daistudio.com/Platform/API/Documentation/overview
- endpoint 範例：`POST /v1/3d-models/tripo/image-to-3d/p2/`（也有 text-to-3d、multiview-to-3d）、`POST /v1/3d-models/tencent/generate/rapid/`；狀態 `GET /v1/generation-request/{task_id}/status/`，FINISHED 後 results 內含下載網址；另有餘額 endpoint [官方]
- 圖片傳入：image（base64 data URI）或 image_url，二擇一；多視角 2~4 張（Tripo P2）[官方] 對應 tripo-p2 頁
- 結果 24 小時內可下載，之後回 410 Gone；上傳輸入與結果最遲 24 小時內永久刪除 [官方] API FAQ
- 計費：API 與網頁用同一套點數系統 [官方] https://docs.3daistudio.com/api-reference ；但 API FAQ 寫「無訂閱，只買點數、有效 365 天」，是否與訂閱點數共用錢包：[未確認]。失敗自動退點。API 定價頁寫「dedicated API access 洽 support」，API 是否需特定方案：[未確認]
- 官方 MCP：有，由廠商託管，在帳號 Settings 的 AI Assistants 加入，OAuth 登入、不需金鑰；功能：文字／圖轉 3D、圖片生成編輯、格式轉換、專案與資料庫搜尋、費用估算與餘額；大筆花費需確認；不確認綁骨 [官方] https://3daistudio.com/MCP 。連線 URL 頁面未列（[未確認]）；Claude Code 是否支援此 OAuth 流程 [未確認]
- 官方 SDK／CLI：頁面未提及（[未確認]，視為沒有）
- Claude Code 全自動鏈：上傳（base64）→ 生成 → 輪詢 → 下載：可行（REST）。綁骨與動畫：網頁有、API 文件無，Claude Code 做不到（除非私下聯絡廠商或另有未列出 endpoint）。其他卡點：需開 2FA、預設 3 req/min、結果 24 小時內必須取走

### 9. 已知限制（官方文件）
- 單圖模型會猜測看不到的背面，複雜物件建議多視角；多視角需付費；Seed3D 1.0 為 beta 且限付費 [官方] image-to-3d 頁
- 無無限免費層，僅註冊點數 [官方]
- 綁骨：需 T/A-pose、單一網格；雜亂拓樸需先 Remesh；檔案大小或面數上限未載 [官方] rigging 頁
- API 結果 24 小時過期；預設 3 req/min [官方]
