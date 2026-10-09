# Recraft.ai 知識庫（AI 原生向量生圖 → Rive）

> 2026-09-30 由四個子代理平行查證（官方 docs／pricing／blog 為主，第三方標明）後彙整。用途：評估並操作「Recraft 生 SVG → 拖進 Rive → CC 用 MCP 拆件綁骨」這條產線。**先查這裡，不重新上網。** 標「查無」的項目要實測補上。
> 相關：`mcp-build-playbook.md`（Rive MCP 施工）、`example-dissections.md` §3.5（向量畫法配方）、`ecosystem-and-pipeline.md`（Rive 方案）。

---

## 0. 一頁結論

- Recraft 是目前少數「原生產向量」的生圖模型：`*_vector` 模型直接輸出 SVG，不是像素圖再描邊。這是 9/16 美術歸零時缺的那座「PNG 畫感 ↔ 向量形狀」的橋。
- **正確接法**：Recraft 產 SVG → **直接拖進 Rive 編輯器**（官方支援 SVG 匯入）→ CC 用 Rive MCP 讀階層、改名、分組、設樞紐、補被遮住的零件。不要把 SVG 原始碼餵給 CC 重建。
- **省不掉的工**：AI 生的 SVG 是「看得到的部分」的平面圖，動畫要的被遮零件（袖子底下的上臂、頸巾後的脖子）圖裡沒有，拆件與補件仍要人做。Recraft 解「好看」，不解「能動」。
- **最大價值在換裝系統**：Custom Style 鎖風格後批量生帽子／衣服／手持物，一致性由模型保證，這件事 CC 手算座標做不到。
- **費用底線**：要 SVG 私有＋商用一定要付費；Basic US$12/月（1,000 credits）就夠試。**官方託管 MCP 扣的是訂閱 credits（與網頁同一池），Free 也能用（額度受限）**，不必另買 API units；只有直呼 REST API 才走預付 API units（US$1＝1,000 units，V4.1 Vector 一張 US$0.08）。（2026-09-30 官方 remote-server 文件查證，修正同日早版「API 另計」的籠統寫法）
- **CC 能自己跑的部分**：官方託管 MCP（`https://mcp.recraft.ai/mcp`，OAuth）或 REST API 直呼，兩者都能拿到 SVG 網址再下載到本機。網頁介面挑圖、付費、拖 SVG 進 Rive 要 James。

---

## 1. 方案與費用（官方 pricing 頁 2026-09-30 即時查證）

| 方案 | 月付 | 年繳折算 | Credits／月 | 備註 |
|---|---|---|---|---|
| Free | US$0 | — | 「Limited」 | 圖片**公開**、Recraft 擁有、**不可商用**；每日每風格 3 次生成、每次最多 2 張、只能用自家模型；升級後先前免費生的圖仍不私有、不可商用 |
| Basic | US$12 | US$10（年 US$120） | 1,000 | 私有＋商用；「Advanced tools」（自訂調色盤、Magic wand、Creative upscale、Artistic level、Extract prompt）從此檔開始 |
| Pro | US$20／40／80／160 | US$16／32／64／128 | 2k／4k／8k／16k | 線性 US$10 每 1,000 credits |
| Teams | US$22／席 | US$18／席（年 US$211） | 2,000／席起 | 官方頁無「Enterprise」字樣，只有 Contact sales |

- 價格不含 VAT。第三方文章寫的「Advanced 方案 US$27／4,000」在官方頁已不存在，視為舊資料。
- **每張圖耗 credits**（`docs/plans-and-billing/credits`）：V4.1 Flash 1、V4.1 2、V4.1 Pro 10、**V4.1 Vector 4**、**V4.1 Pro Vector 12**、V3／V2 raster 1、V3／V2 vector 2、Refine details 10。
- 換算：Basic 1,000 credits ≈ 250 張 V4.1 Vector 或 83 張 Pro Vector。
- 商用條款：付費方案生成圖歸使用者，私有、退訂後永久保留；不得拿生成圖訓練外部 AI；服務不可轉售。（`docs/trust-and-security/ownership`）
- 教育／非營利優惠：官方**查無**；第三方說 .edu 五折，未證實不採信。
- 免費版每日額度：pricing 頁寫「每日每風格 3 次」，另有來源寫「每日 50 張」，**互相矛盾**，以官方頁為準、實測補。

來源：https://www.recraft.ai/pricing ／ https://www.recraft.ai/docs/plans-and-billing/credits ／ https://www.recraft.ai/docs/trust-and-security/ownership

---

## 2. 模型與輸出

- 模型名（API `model` 參數）：`recraftv4_1`、`recraftv4_1_vector`、`recraftv4_1_pro`、`recraftv4_1_pro_vector`、`recraftv4_1_flash`、`recraftv4`、`recraftv4_vector`、`recraftv4_pro(_vector)`、`recraftv4_styles(_vector)`、`recraftv3(_vector)`、`recraftv2(_vector)`。**名稱含 `_vector` 才輸出 SVG。**
- V4.1 系列（2026-05-30 新聞稿）：V4.1 主力風格化、V4.1 Utility 可預測產品圖、V4.1 Vector 原生 SVG（官方定位 Logo／排版／向量藝術）。
- 官方對向量輸出的描述：smooth paths、organized layers、scalable geometry、discrete color regions。
- **技術規格查無**：路徑數量級、是否用漸層、clipPath／mask、文字處理方式，官方文件沒寫。第三方評測兩極：一說達手繪向量 80–90% 乾淨度、錨點多 20–30%；另一說（svggenie 2026，競品評測，打折看）「大量多餘錨點與冗餘圖層，清理常超過一小時」。**要自己實測一張才算數。**
- 回傳形式：`url`（CDN 連結，向量為 .svg）、`b64_json`、`multipart`。生成圖 CDN 約保存 **24 小時**，官方聲明可能變動，拿到要立刻下載。

來源：https://www.recraft.ai/docs/api-reference/endpoints ／ https://www.recraft.ai/ai-vector-generator ／ https://www.recraft.ai/press-releases/recraft-v4-1-utility-pro-becomes-the-highest-ranked-text-to-image-model-outside-google-and-openai

---

## 3. Recraft Studio（網頁介面）功能

| 功能 | 能做什麼 | 對本專案的用途 |
|---|---|---|
| Vector Editor（2026-07 推出） | 雙擊圖形改錨點／切線、選取換色、Send to back／Bring to front 改層序；對 AI 生成或匯入的 SVG 都可用 | 拖進 Rive 前先在這裡把明顯歪掉的一兩個點修掉，比在 Rive 用 MCP 算座標快 |
| Custom Style | 上傳最多 10 張參考圖建立風格，儲存重用（V4 沒有具名 substyle，靠這個鎖風格） | 角色定案後，用定裝圖建一個 style，所有裝備都用它生 |
| Color／Brand Palette | hex、滴管、或從圖片萃取主色建調色盤，約束生成色 | 直接餵本專案色票（見 §7） |
| Image Set | 一組圖共用同一套從 brief 推導的調色盤，可 reroll、指定配色、錨定品牌色 | 一次生一整批同色系裝備 |
| Remove background | 輸出真 alpha PNG（raster）；V3 在 prompt 寫 transparent background 也可 | 對 SVG 沒意義，SVG 本身無背景，但要記得 prompt 寫純色背景避免多餘物件 |
| 匯出 | SVG、PNG、JPG、PDF、TIFF（300 DPI CMYK）、Lottie（格式清單來自第三方綜合，**各方案分級查無**） | 我們只用 SVG |

- **查無**：Vector Editor／Custom Style／Image Set 是否 Basic 以上才有；pricing 頁只確認「Advanced tools」從 Basic 起。

來源：https://www.recraft.ai/docs/recraft-studio/image-editing/vector-editor ／ https://www.recraft.ai/docs/recraft-studio/styles/custom-styles/how-to-create-a-custom-style ／ https://www.recraft.ai/docs/recraft-studio/color-palettes/how-to-create-a-color-palette ／ https://www.recraft.ai/blog/how-to-create-image-sets

---

## 4. 程式串接：CC 能不能自己跑

### 4.1 官方託管 MCP（首選）

- 本機版 `recraft-ai/mcp-recraft-server` 已於 **2026-07-13 封存**，官方改推託管端點 `https://mcp.recraft.ai/mcp`，Streamable HTTP，**OAuth 瀏覽器授權，免 API key**。
- Tools：`generate_image`、`create_style`、`vectorize_image`、`image_to_image`、`remove_background`、`replace_background`、`crisp_upscale`、`creative_upscale`、`get_user`。
- **計費（官方原句）**：「The MCP server consumes subscription credits from your Recraft plan — the same balance used by the Recraft Studio app.」Free 有少量 credits 可用，付費方案按月配額＋可加購。→ **CC 用 MCP 生圖不需要 API key、不需要買 API units**，James 只要有 Recraft 帳號（Free 即可試）。舊版 GitHub README 只寫「uses a different credits model」沒講清楚，以 docs 為準。
- Claude Code **網頁版**要在網路設定放行 `img.recraft.ai` 才能下載生成圖；終端機版無此限制。
- **查無**：MCP 能否直接把 SVG 寫進本機路徑；目前只確認回傳 URL／檔案本體，CC 要自己接一步下載。速率限制文件未寫。
- ⚠️ 依全域 token 規範：接 MCP 會讓提示快取失效，**在新工作階段開頭接**，不要在做到一半時接；用完的階段用 `/mcp` 關掉。

Claude Code 接法（OAuth 直連）：

```
claude mcp add --transport http recraft https://mcp.recraft.ai/mcp
```

不支援遠端 OAuth 的客戶端改走本機代理（專案 `.mcp.json`）：

```json
{
  "mcpServers": {
    "recraft": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.recraft.ai/mcp"]
    }
  }
}
```

### 4.2 REST API（最好自動化，要自己管金鑰與扣款）

- Base URL `https://external.api.recraft.ai/v1`，`Authorization: Bearer <RECRAFT_API_TOKEN>`；API key 在登入後個人資料頁按 Generate，**前提 API units 餘額 > 0**。
- **API 與網頁 credits 分開**：API 用預付「API Units」，US$1＝1,000 units，不退款、不過期。V4.1 Flash 7 units（US$0.007）、V4.1 Pro 210（US$0.21）、**V4.1 Vector 80（US$0.08）**、V4.1 Pro Vector 300（US$0.30）、vectorize 10（US$0.01）、Creative Upscale 250。最低儲值與免費試用額度**查無**。
- 端點（皆 POST，除 `GET /users/me` 查額度）：`/images/generations`（含 `/raster`、`/vector` 變體）、`/styles`、`/images/imageToImage`、`/images/inpaint`、`/images/outpaint`、`/images/replaceBackground`、`/images/generateBackground`、`/images/vectorize`、`/images/removeBackground`、`/images/crispUpscale`、`/images/creativeUpscale`、`/images/refineDetails`、`/images/eraseRegion`、`/images/variateImage`、`/prompts/enhance`。
- 參數：`prompt`、`model`、`n`（1–6）、`size`（WxH）、`style`／`style_id`／`style_match`（regular／precise／flexible）、`negative_prompt`（**只有 V2／V3**；V4 Pro 傳 `style`、`style_id`、`negative_prompt` 會直接 400）、`response_format`、`image_format`（webp 預設／png）、`controls.colors`、`controls.background_color`、`artistic_level`、`no_text`。
- 速率：每使用者每分鐘 100 張、每秒 5 請求。風格參考圖單檔 <10MB、總 ≤64MB、最多 10 張。
- 官方無 Python／Node SDK；可用 OpenAI 官方 Python 套件把 `base_url` 指過去，但官方警告「不是所有參數都支援」。Style／substyle 完整列舉要看 Swagger：https://www.recraft.ai/docs/api-reference/swagger

最小呼叫（拿 SVG 網址再下載）：

```
curl -s -X POST https://external.api.recraft.ai/v1/images/generations \
  -H "Authorization: Bearer $RECRAFT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"PROMPT_HERE","model":"recraftv4_1_vector","size":"1024x1024","n":1,"response_format":"url"}'
```

查額度：

```
curl -s https://external.api.recraft.ai/v1/users/me -H "Authorization: Bearer $RECRAFT_API_TOKEN"
```

來源：https://www.recraft.ai/docs/mcp-reference/remote-server ／ https://www.recraft.ai/docs/mcp-reference/tools ／ https://www.recraft.ai/blog/recraft-mcp ／ https://www.recraft.ai/docs/api-reference/getting-started ／ https://www.recraft.ai/docs/api-reference/pricing ／ https://www.recraft.ai/docs/api-reference/appendix

---

## 5. 提示詞格式

### 5.1 官方指南要點

- 兩種合法結構：**內容優先**（核心概念 → 背景 → 主體構圖 → 外觀細節 → 次要主體 → 光線 → 鏡頭 → 氛圍）或**風格優先**（風格 → 場景／主體 → 細節）。Blog 給的固定模板：`A <image style> of <main content>. <detailed description>. <description of the background>. <detailed style description>.`
- 無字數硬限制；3–6 字短提示會進「interpretive mode」由模型自己決定美感，長提示才有精確控制。
- 負面提示：V3／Studio 有欄位；**V4 API 傳 negative_prompt 會 400**。寫法只放名詞（`text, gradient`），不要寫否定句（`no text` 反而會生出 text）。
- 純色背景直接用文字描述顏色；hex 色票在 Studio 調色盤輸入，**prompt 內嵌 hex 的官方語法查無**（API 走 `controls.colors`）。V4 官方指南全篇只用描述性色名（deep muted green、warm off-white），沒有任何 hex 範例；把 hex 寫進 prompt 是社群作法，效果要實測。
- **向量／Logo 專用結構（V4 官方指南原句）**：Graphic type → Shape logic（geometry、symmetry、silhouette clarity）→ Color system（strict palette）→ Line discipline（consistent stroke、no texture）→ Layout structure → Constraints（no gradients、no shadows）。向量 prompt **不要**寫材質、紙紋、水彩、布料皺褶這類 raster 詞，那是 GPT Image 那套。
- 角色一致性官方只列四招：詳細描述特徵、全程同一 style／custom style、把前一張當 image reference、把角色圖附進 prompt 改姿勢。**未提 seed。**

### 5.2 風格名稱

| 版本 | 名稱 | 適合 |
|---|---|---|
| V2 `vector_illustration` substyle | cartoon、doodle_line_art、engraving、flat_2、kawaii、line_art、line_circuit、linocut、seamless | **flat_2**＝乾淨扁平色塊最好拆件；kawaii／cartoon＝圓潤角色 |
| V3 Vector 具名風格（扁平清單） | Vector art、Line art、Linocut、Color blobs、Engraving、Bold stroke、Chemistry、Colored stencil、Cosmics、Cutout、Depressive、Editorial、Emotional flat、Marker outline、Mosaic、Naivector、Roundish flat、Segmented Colors、Sharp contrast、Thin、Vector Photo、Vivid shapes、Seamless Vector | **Emotional flat／Roundish flat** 乾淨色塊角色；Cutout 剪紙分件感 |
| V4／V4.1 | 無具名 substyle，靠 Custom Style（參考圖） | — |

（substyle 清單來自搜尋摘要整合，未逐一原文核對，用前在 Studio 介面覆核。來源：https://www.recraft.ai/docs/api-reference/styles）

### 5.3 本專案提示詞範本（自行組合，**未實測**，第一次跑完要改）

角色定裝（正面、四肢分開、方便拆件）：

```
A flat vector illustration of a young traveller character, full-body front view, standing neutral pose, arms held slightly away from the torso, legs shoulder-width apart, hands open and not overlapping the body. Beige ankle-length robe with a thin leather belt, light purple neck cloth with one short hanging end, brown ankle boots, short brown hair with side-swept bangs, no facial features. Clean closed outlines, flat color fills, no gradients, no shadows, no texture, each limb clearly separated for rigging. Plain solid off-white background. Storybook children's illustration style, soft warm palette, 6-head proportion.
```

裝備單件（帽子／手持物／衣服，一格一件）：

```
A flat vector illustration of a single wide-brim straw hat, isolated game item icon, centered, no character wearing it, front three-quarter view. Clean closed vector outlines, flat color fills, no gradient, no shadow, no background texture, plain solid off-white background. Same storybook style and warm palette as the reference.
```

- 色票用 API `controls.colors` 或 Studio 調色盤餵：`#E8DCBE`（袍）`#CFC2A0`（袍影）`#8E82AE`（紫）`#6F6489`（紫影）`#F1D6BC`（膚）`#A67C52`（皮革）`#7F5C3A`（皮革深）`#6E4A33`（髮）`#5A4636`（輪廓）`#F6EFE4`（底）。
- T-pose／無五官／四肢分離這三項，**官方與社群都沒有 Recraft 專屬的實證技巧**，只能靠通用向量插畫慣例；第一輪實測就是在驗這個。

### 5.4 分節式範本（小居 ChatGPT 2026-09-30 提案，**未實測**，與 5.3 二選一 A/B 測）

依 §5.1 官方向量結構展開成標籤分節，把「這是動畫素材、關節處要分開」在生成階段就講清楚，而不是事後求 AI 拆件：

```
[ASSET TYPE] 2D vector character for Rive animation.
[CHARACTER] Young adult traveller. Gentle calm expression. About 6 heads tall. Short soft brown hair.
[SHAPE SYSTEM] Simple rounded geometric construction. Large clean shapes. Minimal anchor points. Clear silhouette. Animation-friendly joints.
[CLOTHING] Cream tunic. Muted lavender outer garment. Brown leather belt. Simple boots.
[COLOR SYSTEM] Lavender, cream, warm brown, leather brown.（hex 走調色盤／controls.colors，見 5.1）
[LINE SYSTEM] Consistent warm brown outline. Uniform stroke width. Rounded joins.
[SHADING] Maximum two color values per object. Flat vector shading.
[ANIMATION CONSTRAINTS] Arms visually separated from torso. Hands clearly separated from sleeves. Hair separated from head. No overlapping decorative elements around joints.
[LAYOUT] Full body. Front view. Centered. Neutral standing pose. Plain off-white background.
[AVOID] gradients, texture, watercolor, complex shadows, tiny details, text.
```

- 「Front 3/4 view」小居原版寫四分之三側面；本專案拆件與換裝要正面，改 Front view。
- 「No religious symbols」小居原版有這條；本專案是聖經遊戲，角色本體不放符號可以，但裝備／背景不適用，刪除。
- `[AVOID]` 依 §5.1 只放名詞，不寫 `No ...` 否定句。
- 是否配 V4 Styles（1–10 張參考圖鎖風格；官方建議一張高品質參考最穩）：Style 只控線條、色彩邏輯、質感、渲染風格，**不控主體與姿勢**（Style reference ≠ Character reference），顏色也不保證精準。角色定案後再用。

來源：https://www.recraft.ai/docs/prompt-engineering-guide/prompting-with-recraft-v4 ／ https://www.recraft.ai/blog/how-to-craft-prompts-for-accurate-ai-generated-images ／ https://www.recraft.ai/docs/recraft-studio/image-generation/working-with-text-and-prompts/negative-prompts ／ https://www.recraft.ai/docs/best-practices/character-consistency

---

## 6. SVG → Rive 相容性與清理

- Rive 編輯器用拖放或 Assets 面板匯入 SVG（與 PNG／JPG／WebP／PSD／字型／音訊／Lottie 並列）。
- 支援：完整三次貝茲、多輪廓路徑、stroke、線性／放射漸層（**gradient transform 會被忽略**，各 runtime 支援度不一）。
- 不支援：**mask**（會被當 clip 處理，官方說某些情況「loses a lot of information」）。文字近期版本已支援，舊版忽略，官方仍建議先轉外框。
- 效能：官方建議數千點的複雜插畫先簡化再匯入，否則 tessellation 卡。
- **匯入後結構對應（group→Node？path→Shape？）查無官方逐項聲明**，用 `mcp__rive__get_artboard_hierarchy` 實測。
- 匯出建議（信心中等，未開到官方原句）：inline style 不要外部 CSS；來源工具保留圖層 ID／名稱。
- 清理工具鏈（Rive 匯入前，需要才用）：
  - `svgo`（npm）：`mergePaths`、清屬性、縮精度；**不做** stroke→fill。
  - `svg-outline-stroke`／`outline-stroke-cli`（npm）：stroke 轉填色外框，等同 Illustrator Outline Stroke。
  - `picosvg`（Python, googlefonts）：拆 `<g>`、把 clip-path／stroke 轉等效 path、算絕對座標；漸層只允許在 `<defs>`。
- **Recraft SVG → Rive 的第一手案例**：網路查無，我們自己的實測見 6.1。

來源：https://rive.app/docs/editor/fundamentals/importing-assets ／ https://feedback.rive.app/676 ／ https://rive.app/changelog/svg-export

### 6.1 第一次實測結果（2026-09-30，Free 帳號）

**計費實測**：MCP 直連、Free 帳號可用。`generate_image` 向量 1 張 2 credits；`image_to_image` 1 張 2；`vectorize_image` 1 次 **1**。Free 起始 60。

**生圖（文字→向量）**
- §5.3 範本出圖「太卡通」：元兇是 `Storybook children's`、`no facial features`（空白臉像人偶）、`each limb clearly separated`（出木偶關節）、粗細一致外框＋平塗。
- 改描述吉卜力特徵（不寫品牌名）後乾淨很多，但**向量模型會把眼睛簡化成豆豆眼**，文字很難救。

**定裝方向改由 GPT 探索（省 credits）**：GPT 對比例太敏感，7.5 頭身太大人、5 頭身＋圓臉大眼太小；用「同一人三個年紀並排 A/B/C」一次挑出。**年紀感關鍵在臉型比例（臉長、眼睛大小），不在身高。**

**GPT 圖轉 Recraft 向量三條路**
| 路 | 結果 |
|---|---|
| ① `vectorize_image` 直接描 | 臉眼完全保留；893 路徑、51 漸層、79 色，太碎 |
| ①' 先 posterize 壓 12/16/24 色再描 | James 否決（剪紙感） |
| ② `image_to_image` | **`recraftv4_1_vector` 完全忽略原圖**（strength 0.45 出無關人物）；**`recraftv3_vector`＋`vector_illustration`、strength 0.3 可用**：650 路徑、乾淨有虹膜，但臉變成熟、細節走樣，James 不滿意 |

**🔴 非正方形輸出的 SVG 會在 Rive 變形**：Recraft 輸出 `viewBox="0 0 2772 2772"`＋`preserveAspectRatio="none"`＋`width=776 height=2772`，瀏覽器擠回直長、**Rive 忽略 preserveAspectRatio → 橫向拉寬約 3.6 倍**。修法（每張非正方形圖下載後必做）：path 只有絕對 `M/L/C/z`，x 座標與漸層 `x1/x2` 乘 `寬/2772`、viewBox 改 `0 0 寬 高`、刪 `preserveAspectRatio`、c2pa `<metadata>`、全畫布底色 path。

**匯入 Rive 後的結構（回答 §9「圖層樹對應」）**：每個 path → 一個 `Shape`（名 Custom Shape）＋`PointsPath`＋`Fill`，全部平鋪在一個以檔名命名的 `Node` 下；實色與**線性漸層都保留**。描圖版 892 Shape、30 色。髮絲間的背景會被描成近白色殘塊（白暈），要刪但別刪到眼睛反光。

**結論**：整張畫描成向量＝「一張畫」不是「一組零件」——零件未分組、被遮部位不存在。只夠做**小動作**（呼吸、眨眼、頭擺、圍巾飄）；舉手／揮手／坐下要分件畫。

### 6.2 零件表路線（2026-10-04，目前唯一跑通的分件路）

**為什麼換路**：調查別人的做法，都是「先有零件、再綁骨」，兩條路：① 事後把整張圖拆層、補畫被遮部位（See-through 類工具）；② 生圖時就要一張「爆炸分解零件表」（每個零件分開擺、不重疊）。6.1 的整張描圖走不通，改試 ②。

**流程**
1. 生零件表：James 在 Recraft 網頁選 **GPT Image 2.5 模型**生女版零件表（這個模型很貴；Recraft 自家模型生的跟定裝差很多）。→ **之後改在 ChatGPT 內生**，省 Recraft 點數。
2. Recraft 只做 `vectorize_image` 轉 SVG（約 1 credit）。結果 `art/recraft/r3/f-parts.svg`（未進 git）。
3. CC 用程式依「連通區塊」自動切件：切出 13 塊、全部分離，966 路徑 0 遺漏 → `parts/01_head … 13_leg_R.svg`。
4. Rive（檔 Untitled 2621239，Artboard 1 改 620×1050）：13 件拖入、組回人形、排畫序；外層群組原點移到零件中心、內層歸零。

**這輪的問題（下一輪提示詞要改）**
| 問題 | 原因 | 下一輪寫法 |
|---|---|---|
| 長相偏日系，不是 g4 那個人 | 沒附參考圖 | 附 g4 定裝圖保長相 |
| 關節圓球外露、裙下有接頭球 | 提示詞寫了「接縫收圓頭」 | 接縫藏在衣服底下，不畫外露的球 |
| 軀幹和上臂袖子重複 | 軀幹件也畫了袖子 | 袖子只畫在上臂件 |
| 圍巾中間白塊 | 描圖把背景色當成色塊 | 切件後刪白塊（別刪到眼睛反光） |
| 旋轉樞紐還在零件中心 | 尚未處理 | 已在 r4 解決，做法見 §6.3 |

**結論**：GPT 生零件表（在 ChatGPT 內做）→ Recraft 只轉向量（約 1 點）→ CC 切件 → Rive 組裝。Recraft 從「生圖工具」變成「轉向量工具」，點數用量大降。

**點數實況**：2026-10-09 用 `get_user` 查為 **11 credits**，與 10/4 收工時相同——10/4 的理解是「Free 每日補 30 點、不累積」，但 5 天沒增加。可能是補點要登入網頁才領、或根本沒有每日補點，待 James 在網頁確認；**規劃時先當作沒有補點**。轉向量 1 次 1 點，剩 11 點夠轉約 10 次。

### 6.3 r4 女版：零件表重生＋Rive 組裝實錄（2026-10-04 生、2026-10-09 組）

**6.2 那輪的問題已在同天下午到深夜重生解決**（當時沒落檔，10/9 才補）。

**素材鏈（全部在 repo 外，`art/` 由 .git/info/exclude 排除）**
1. ChatGPT 生零件表：g5 → g6 → **g6b**（`art/gpt-ref/g6b-parts-f.png`）。附 g4 定裝圖保長相、接縫藏衣服下不畫外露球、袖子只畫在上臂件；`g6b-compare.png`＝定裝 vs 兩版組回對照。
2. Recraft 只做 `vectorize_image` → `art/recraft/r4/g6b-vec.svg`（977 路徑）。
3. CC 依連通區塊切 **11 件**到 `art/recraft/r4/parts/`：01_head、02_scarf_wrap、03_scarf_tail、04_torso、05_upperarm_L、06_forearm_L、07_upperarm_R、08_forearm_R、09_belt、10_leg_L、11_leg_R（另 00_full 整張）。比 r3 少 2 件：圍巾拆成圈＋尾、無外露關節球。

**Rive 檔**：新檔「Bible-game｜r4 女版角色組裝測試」fileId **2641139**，Artboard 1 **800×1400**，由 James 拖 11 個 SVG 建立。舊檔 Untitled 2621239 現在是空的、r3 零件不見，原因未查（r3 SVG 仍在 `art/recraft/r3/parts`）。

**🔴 CC 自己上傳 SVG 走不通**：`upload_asset` 在 Rive 沙盒讀不到本機路徑；改 curl 資料 URI 又被 auto mode 擋。**要 James 拖檔**，或 CC 切到一般權限模式再試。

**匯入後的結構與組裝公式**
- 每個 SVG 匯入成「外層 Node → 內層 Node → N 個 Shape」。內層 Node 自帶**零件在零件表上的中心座標**，所以組回人形**只改外層位置**。
- 外層位置＝`(dx − 695, dy + 30)`，其中 (dx, dy) 是零件表上各件相對軀幹的位移（軀幹為 0,0）：

| 零件 | dx | dy |
|---|---|---|
| leg_R | 174 | −34 |
| leg_L | −198 | −34 |
| torso | 0 | 0 |
| belt | −600 | −100 |
| upperarm／forearm R | 172 | −25 |
| upperarm／forearm L | −172 | −25 |
| head | 228 | 50 |
| scarf_tail | −610 | 223 |
| scarf_wrap | −265 | 162 |

- 位移是**估算＋本機疊圖預覽**一次到位；`magick` subimage-search 樣板比對對這種零件表無效，別再試。
- 畫序（後→前）：腿、軀幹、前臂、腰帶、上臂、頭、圍巾尾、圍巾圈。

**樞紐移到關節**（外層 Node 原點改到畫板座標、內層 Node 反向補償，外觀不變）

| 零件 | 關節 | 畫板座標 |
|---|---|---|
| 頭 | 頸 | 404, 371 |
| 圍巾圈 | 頸 | 404, 407 |
| 圍巾尾 | 頂端 | 335, 403 |
| 軀幹 | 腰 | 404, 617 |
| 腰帶 | — | 386, 603 |
| 上臂 R／L | 肩 | 327, 445／493, 445 |
| 前臂 R／L | 肘 | 290, 625／533, 625 |
| 腿 R／L | 腿頂 | 323, 910／477, 910 |

關節點是從縮圖估的；**10/9 晚已轉動驗證並重設，最終值見 §6.4**（上表只留作第一版紀錄）。

**清白塊**：頭部刪 8 個近白 Shape（#ffffff×2、#efeef0×6）。**🔴 Rive 匯入 SVG 後，Shape 子層順序與 SVG path 順序相反**（第 i 條 path＝倒數第 i 個 Shape）；刪之前用 `query_objects` depth 1 看 Fill 顏色驗證，別照 SVG 順序對號。

**10/9 下午收工時未做**：①父子階層 ②轉關節驗樞紐 ③頭頂淡亮線 ④骨架。①②③已於同日晚完成（§6.4），只剩④。

### 6.4 r4 比例校正＋父子階層＋眼睛高光（2026-10-09 晚）

**起因**：James 看圖指出手臂長度、腰帶比例、站姿不對，眼睛高光不見。

**量法（可複用）**：把定裝 `00_full.svg` 渲染成 PNG、縮到與畫板人物同高（本例 93%），半透明疊在 `capture_artboard` 的輸出上，再加 100 單位格線，直接讀每個部位差多少，一次改外層 Node 的 x／y／sx／sy／r。零件表各件是 GPT 分開畫的，**比例彼此不一致**（腰帶畫大、前臂畫長、頭畫大），組回時每件都要獨立縮放，不能只擺位置。

**最終外層 Node 值（畫板座標，縮放 %，角度 °）**

| 零件 | id | x, y | sx, sy | r | 備註 |
|---|---|---|---|---|---|
| 軀幹 04_torso | 0-34 | 404, 595 | 108 | 0 | 放大上移，肩線到 404、裙襬留在 ~955 |
| 上臂 R／L | 0-31／0-33 | 322, 405／486, 405 | 108 | 0 | 連袖子跟軀幹同比例 |
| 前臂 R／L | 0-30／0-32 | 286, 569／525, 569 | **85, 80** | 0 | 72% 時與上臂斷開，改上移 30 塞進上臂圓弧下、橫向放寬 |
| 腰帶 09_belt | 0-29 | 384, 588 | **80, 65** | 0 | 非等比：扣環小包縮、帶身仍橫跨腰 |
| 圍巾圈 02 | 0-36 | 403, 357 | 75 | 0 | 下巴下方，不蓋下巴 |
| 圍巾尾 03 | 0-35 | 332, 352 | 77 | 0 | |
| 頭 01_head | 0-37 | 404, 371 | 93 | 0 | 疊圖顯示偏大 8% |
| 腿 R／L | 0-27／0-28 | 343, 910／457, 910 | 100 | **+3／−3** | 腿頂內收 15＋外轉 3°＝微八字站姿 |

（以上是建階層前的畫板座標；建階層後 Rive 自動換算成相對父層的 local 值，外觀不變。）

**接縫通則**：兩件接不上時，用「後層件上移塞進前層件」補，不要硬把兩件切齊；上臂圓弧蓋住前臂頂端就是自然手肘摺痕。

**眼睛高光**：6.3 清近白塊時把兩個 `#ffffff` 一起刪了，那就是高光。補法＝`path_editor createParametricShapes` 兩個 ellipse 10×7 白色，掛在頭內層 Node `0-4882`，局部座標 (−34.5, −51.8)／(39.5, −51.8)（虹膜左上角，照定裝圖）。坑：**createParametricShapes 的 parentId 被忽略**，會掉在畫板層，要再 `reparent_objects`（position start）並重設 x／y。

**父子階層（B1）**：torso(0-34) 子層前→後＝scarf_wrap(0-36，內含 scarf_tail 0-35)→head(0-37)→belt(0-29)→upperarm_L(0-33，內含 forearm_L 0-32)→upperarm_R(0-31，內含 forearm_R 0-30)→torso 內層 Node。腿 0-27／0-28 留畫板層。前臂放在上臂的 `end`（上臂圖形之後）才會被上臂蓋住。**這次 `reparent_objects` 保留世界座標、自動換算 local**（與 playbook 9/26 紀錄相反），搬完一律 query 驗。

**轉動驗證（B2）**：上臂 20°、前臂 30°、頭 8°、腿 15° 各轉一次拍圖，樞紐皆合理，已歸零（腿回 ±3）。肩膀轉 20° 時軀幹的無袖肩線會露出一點，可接受。

**頭頂淡亮線（B3）**：是 SVG path 69／127 的 `#c9b5b0`（去背邊緣殘色），對應 shape 0-4911／0-5648 已刪。找法：在 SVG 用 python 列出目標區域所有 path 的顏色與範圍 → 換算到 Rive shape 索引（**倒序，且要扣掉之前已刪的數量**）→ `query_objects` depth 2 看 Fill 顏色核對才刪。

**B4 骨架：James 選 B（加 Bone＋mesh），同晚完成第一階段（§6.5）。**

### 6.5 骨架＋剛體掛骨＋圍巾尾 mesh（2026-10-09 晚）

**🔴 官方 Rive MCP 沒有建骨頭的工具**（`mesh_rigging_tool` 只有 generateMesh／bindBones／autoWeight／querySkin；`component_editor` 是巢狀畫板）。做法＝James 在編輯器按 B 畫骨鏈（位置大概即可、不用命名），CC 再用 MCP 校數值、命名、掛零件、綁定。

**James 畫法（可複用的口述指令）**：主鏈骨盆→腰→肩線中→下巴；選「肩線中」關節分支：左肩→肘→腕、右肩→肘→腕、圍巾頂→中→底；選「腰」關節（root 尖端）分支：髖→膝→踝 ×2。腿只能從腰部關節出發（root 尖端），腰→髖那一小段就當骨盆骨，結構正確。

**骨頭屬性 key**：RootBone x 90、y 91（不是 13／14）；所有骨 length 89、rotation 15（相對父骨，root 相對世界，正＝順時針）。子骨從父骨尖端起、不能偏移，所以肩膀要用鎖骨段接。

**最終 18 根（id／名稱／rotation／length；root 在 (404,707)）**

| id | 名稱 | r | len | 尖端（畫板） |
|---|---|---|---|---|
| 0-6975 | root | −90 | 107 | 腰 404,600 |
| 0-6976 | torso | 0 | 195 | 肩線 404,405 |
| 0-6977 | neck | 0 | 65 | 下巴 404,340 |
| 0-6986／0-6989 | clav_R／clav_L | −90／90 | 82 | 肩 322,405／486,405 |
| 0-6987／0-6990 | uarm_R／uarm_L | −79.3／79.3 | 183.2 | 肘 288,585／520,585 |
| 0-6988／0-6991 | farm_R／farm_L | 1.1／−1.1 | 209.5 | 腕 245,790／563,790 |
| 0-6992 | scarf_anchor | −72.6 | 67 | 圍巾頂 340,385 |
| 0-6993 | scarf1 | −109.2 | 95 | 343,480 |
| 0-6994 | scarf2 | −0.5 | 100 | 347,580 |
| 0-6995／0-6998 | pelvis_R／pelvis_L | −154／154 | 100 | 髖 360,690／448,690 |
| 0-6996／0-6999 | thigh_R／thigh_L | −21.4／22.9 | 311／310.5 | 膝 335,1000／465,1000 |
| 0-6997／0-7000 | shin_R／shin_L | −2.1／0.6 | 270 | 踝 323,1270／477,1270 |

（_R＝畫面左邊那隻，跟零件命名一致。）

**剛體掛骨**（`reparent_objects` position start，世界座標自動保留）：04_torso→torso、01_head→neck、02_scarf_wrap＋09_belt→torso、07_upperarm_R→uarm_R、08_forearm_R→farm_R（L 同）、11_leg_R→thigh_R、10_leg_L→thigh_L。圍巾尾 Node 留在 scarf_wrap 下（Skin 綁骨不看父層）。

**🔴 掛骨後畫序改跟骨頭階層走**，手臂會跑到軀幹後面。修法＝在 torso 骨底下用 `reorder_objects sendToFront` 由後往前依序：04_torso、scarf_anchor、clav_R、clav_L、09_belt、neck、02_scarf_wrap。uarm 骨底下「上臂 Node 在前、farm 骨在後」前臂自然被上臂蓋住。root 底下 torso 骨在 pelvis 前面，腿在裙後。

**圍巾尾 mesh**：22 個 Shape 各一條 PointsPath（id 由 `query_objects` depth 1 取），每條 `bindBones` 綁 [scarf_anchor, scarf1, scarf2]（綁定時自動加權），再一次 `autoWeight` 傳全部 22 個 targetIds 合算（blend 0.5、smooth）。測試 scarf1 +20°、scarf2 +25° 圍巾尾整體彎曲、無撕裂；uarm_R 轉 25° 整隻手臂含前臂跟著走。全部已歸零。

**第二階段候選**：頭髮辮子、裙襬 mesh；手肘 IK；肩膀轉大角度時軀幹無袖肩線會露出，可考慮把袖子頂端多畫一點或加 clip。

### 6.6 第一支待機動畫 idle（2026-10-09 晚，全程 MCP）

**成品**：檔 2641139 線性動畫 `idle`（id 0-6，由預設 Timeline 1 改名；fps 60、864 幀＝14.4 秒、loop），預設狀態機 Entry→idle 已自動接好，`simulateStateMachine` 200 幀確認進入 idle。14.4 秒＝呼吸 3.6 秒×4 與圍巾 4.8 秒×3 的最小公倍，所以頭尾無縫；眨眼時間點不等距塞在同一條軌。

**眼皮（眨眼要先有眼皮）**：零件表的頭是整張臉，沒有眼皮可 key。做法＝在 head 內層 Node（0-4882）前端各建一個膚色橢圓 `eyelid_L`／`eyelid_R`（42×30，fill #f9d3ae＝從截圖取眼旁膚色），Shape 原點放在上睫毛線正下方（head 局部 (−31.5,−54.2)／(44.3,−54.2)），橢圓 Path 的 y 設 +15 讓它掛在原點下方，**key Shape 的 sy：0＝張眼、100＝閉眼**，眼皮就是從睫毛線往下蓋，閉到底時睫毛線留在上緣剛好變成閉眼弧線（截圖驗過，效果自然）。眼睛位置用 `capture_artboard longEdge 1536` 截圖量，再除 scaleFactor 1.0973 換算畫板座標、再換 head 局部座標（head 外 Node (404,371) 93%、內 Node (−5.6,−78.2)）。

**三條軌的 key**（cubic 0.42/0/0.58/1 除非另註）：
- 呼吸＝torso 骨（0-6976）**length** 195→205→195，每 216 幀一循環、吸氣頂點在第 96 幀（吸 1.6／吐 2.0）。拉骨長而不是搬 root，腳不會浮；頭肩與手臂整體上升 10 px，軀幹圖不動，頸縫被圍巾蓋住看不到。**James 手機試播回饋：+4 px 看不出來、圍巾與眨眼夠明顯** → 改 +10 並加上臂骨同步微開：uarm_R r −79.3→−77.3、uarm_L 79.3→77.3（同幀位，2° 手臂外張；方向驗證法＝兩邊各轉 3° 截圖看手離身體遠近）。幅度經驗：1400 高畫板上 4 px（0.3%）在手機 220 px 高時不可見，10 px 加手臂角度才看得到。**回饋 3：下半身圖層全不動、看起來分開** → 裙身也要呼吸：04_torso Node（0-34，掛在 torso 骨下、local r 90 把軸轉回世界向）key **x 5→12**（骨頭朝上，所以 Node 的 x 就是世界向上）＋ **sy 108→109.6**（中心樞紐：領口再上 3.5、裙襬下 5.5 與 x 抵銷≈不動，裙襬貼著腿）；09_belt（0-29）x 12→19 跟著腰上升。截圖驗過褲頭仍被裙襬蓋住。**通則：掛在被拉長骨頭根部的零件要另外 key 位移／縮放補上，不然胸口升、裙子不動就是分層感。**

**回饋 4（與動畫無關）：兩腿貼太近。** 把 00_full.svg 縮到 93%（畫板尺）與截圖並排量，腿比定裝圖粗約 20%、膝蓋間沒縫。修法＝10_leg_L／11_leg_R Node **sx 100→82**（掛在 thigh 骨下、local r≈−90 軸已轉回世界向，sx 就是橫向），並各外移 5 px（骨頭朝下時 Node 的 y 是橫向：leg_R y −0.5→+5、leg_L y 2.75→−3，正負方向用截圖驗）。§6.4 數值表的腿那列以此為準。
- 圍巾＝scarf1（0-6993）r −109.2→−106.2→−109.2 每 288 幀；scarf2（0-6994）r −0.5→(40 幀 −1.5)→(180 幀 +3.0)→−0.5，比 scarf1 慢半拍形成波。
- 眨眼＝兩眼皮 sy：第 t 幀 0（linear）→t+4 100（hold）→t+5 100（cubic）→t+10 0（hold），t＝132、336、354（連兩下）、588、774；0 與 864 幀各補 hold 0。

**MCP 動畫坑**：`modifyKeyFrames` 70 個 key 一次送沒問題；動畫 duration／loop 要用 `set_property_values` 寫 key 57／59（createLinearAnimations 的 duration 單位不明，沒用）；`createParametricShapes` 這次 **parentId 有生效**（2026-10-09 兩次實測一次忽略一次生效），建完一律 `find_objects parentId=目標` 驗一次。

**待 James 審**：三格截圖（靜止／閉眼／吸氣頂）已傳；動態要在編輯器按播放看。幅度若太小可把 length 199 改 201、圍巾 ±3° 改 ±5°。

**🔴 James 播放後第一個回饋：圍巾不跟身體起伏，像懸空**。原因＝02_scarf_wrap 掛在 torso 骨，骨頭根在腰、拉長的是尖端，所以掛在根部的零件（軀幹、腰帶、圍巾）都不動，只有掛在尖端子骨（neck、clav、scarf_anchor）的頭、手臂、圍巾尾會升。修法＝`reparent_objects` 把 02_scarf_wrap 搬到 neck 骨（position start，排在 01_head 前面保持畫序），世界座標自動保留，截圖驗過圍巾隨頭肩升。**通則：用骨長當呼吸時，所有「該跟著胸口升」的零件要掛在尖端那側的子骨，不能掛在被拉長的骨本身。**

**匯出 .riv 走 MCP（2026-10-09 實證）**：`export_file format=riv` 直接寫目錄會被 macOS 沙盒擋（Operation not permitted），錯誤訊息附的 curl＋python 配方（對 `http://127.0.0.1:9791/mcp` 呼叫 export_file 帶 `inline_base64:true`，base64 直接落檔不進對話）可用，159 KB 一次成功。Cadet 訂閱下匯出無阻。試播頁＝`@rive-app/canvas-single@2.42.0`＋base64 `buffer`＋`stateMachines:"State Machine 1"`＋`enableRiveAssetCDN:false`，Artifact https://claude.ai/artifact/AiFd2dA6kf5BNddrNoh6fv（四種高度 140／220／320／480 切換＋fps）。Chrome 自動化分頁驗過會載入會動；自動化分頁 rAF 被降速，fps 數字要看手機實機。畫板底色已改透明（2026-10-09）：Artboard 直屬的 Fill（id 0-3，#ff282828）用 `path_editor setPaints` 改 `#00282828`；找它用 `find_objects type=fill parentId=畫板` 後過濾 parentId（回傳會含全部子孫 495 筆，要落檔再 python 篩）。試播頁舞台改暖色底看角色疊在遊戲底色上的樣子。

---

## 7. 現成 skill／MCP／GitHub 專案盤點（2026-09-30）

| 類別 | 名稱 | 狀態 | 判斷 |
|---|---|---|---|
| 官方 MCP | `recraft-ai/mcp-recraft-server` | 60★ MIT，**2026-07-13 封存** | 不裝，用託管端點 |
| 官方 | `recraft-ai/ComfyUI-RecraftAI` | 現役 | 不適用（無 ComfyUI） |
| 社群 MCP | `muhammetali/recraft-mcp-server`（28 tools）、`BartWaardenburg/recraft-mcp-server`（16 tools，10★，有 Docker／Smithery） | 最後 commit 查無 | 託管版夠用就不碰 |
| 社群 | `PierrunoYT/fal-recraft-v3-mcp-server` | 走 fal.ai 轉接 | 不用 |
| 社群 SDK | `runapi-ai/recraft-sdk` 多語言 | 非官方，只做去背／放大 | 不用 |
| Claude skill | `MohamedAbdallah-14/prompt-to-asset`（skills.lc 收錄，7 次安裝） | raster→SVG 三路徑（Recraft／vtracer／potrace）＋SVGO＋路徑數自檢 | 唯一直接命中「Recraft＋SVG 後處理」的 skill；裝法 `npx skills-lc-cli add MohamedAbdallah-14/prompt-to-asset`，裝前先讀原始碼 |
| Claude skill | anthropics/skills、mattpocock/skills | — | **無** Recraft／SVG skill |
| SVG→Rive | `phquand2000/image2rive` | 0★、1 commit、只有 CLAUDE.md | 空殼，不用 |
| 對照組 | `diffusionstudio/lottie`（5.5k★ MIT，`npx skills add diffusionstudio/lottie`） | 成熟，專為 coding agent 設計 | 產 Lottie 不產 .riv，本專案走 Rive，只當參考 |
| MCP 目錄 | Smithery、Glama、mcp.so、官方 servers 清單都有收錄 Recraft | — | 都指向已封存 repo 或託管端點 |

- 結論：**沒有「一鍵 Recraft→Rive」**。可行拼裝＝Recraft（或託管 MCP）→（需要才）outline-stroke＋svgo → 拖進 Rive → CC 用 Rive MCP 拆件綁骨。

---

## 8. 給本專案的執行 SOP（第一次實測）

1. James：註冊 Recraft，先用 Free 生 1–2 張看風格（免費圖公開，**不要**拿來當正式素材）。決定要走就訂 Basic（US$12）；要 CC 自動跑再另買 API units（US$5–10 夠試）。
2. James：Studio 切 Vector 模式，用 §5.3 定裝提示詞生 4 張，挑 1 張，匯出 SVG。
3. James：Rive 檔開新畫板 `Character_R1`，把 SVG 拖進去，停在該分頁。
4. CC：`get_artboard_hierarchy` 讀結構，回報：路徑數、有無漸層／mask、零件能否拆、被遮零件缺多少、預估拆件時間。把結果回寫本檔 §6。
5. 可用 → 用定裝圖建 Custom Style → 用 §5.3 裝備範本批量生裝備 → 每件同流程。
6. CC 自動生（**Free 帳號就能接，不用買 API units**，見 §4.1）：新工作階段開頭 `claude mcp add --transport http recraft https://mcp.recraft.ai/mcp`，瀏覽器 OAuth 授權一次；生完的 SVG 網址 24 小時失效，CC 立刻 `curl -o` 存到 `art/recraft/`（目錄待建，先不進 git 直到選定）。⚠️ 接 MCP 會讓快取失效，只在新階段開頭做。步驟 2 可改由 CC 走 MCP 生，James 只負責看圖挑圖。

---

## 9. 查無／待實測清單

- V4 具名 substyle（不存在，靠 Custom Style）；style／substyle 完整列舉要看 Swagger
- 免費版每日額度（3／風格／日 vs 50／日 矛盾）——2026-10-09 實測：MCP 查到的點數 5 天未補（見 6.2），每日補點至少不適用於這個池
- API 最低儲值、免費試用額度、輸出檔大小上限
- MCP 能否直接寫本機檔；MCP 速率限制
- Vector Editor／Custom Style／Image Set 的方案門檻
- 各方案匯出格式分級表
- SVG 技術規格：路徑數、漸層、mask、文字
- ~~Rive 匯入後的圖層樹對應~~ 已實測，見 6.1（整張）與 6.3（分件：外層 Node → 內層 Node → Shape，順序與 path 相反）
- prompt 內嵌 hex 的語法（官方 V4 指南只用色名，hex 進 prompt 純屬社群作法）
- 5.3 vs 5.4 兩種 prompt 結構哪個拆件更乾淨（A/B）
- T-pose／無五官／四肢分離的 Recraft 專屬技巧
- Recraft SVG → Rive 第一手案例（我們自己做）

---

## 10. CC 對這個工具的掌握度自評（2026-09-30，未實測前）

| 面向 | 掌握度 | 依據 |
|---|---|---|
| 串接（MCP／REST／下載／查額度） | 8／10 | 標準 REST＋Streamable HTTP，端點與參數已列齊，缺的只是帳號與一次授權 |
| 提示詞 | 5／10 | 官方指南讀完，但 V4 無具名風格、負面提示行為分版本、拆件三技巧無實證，要跑 2–3 輪才會準 |
| SVG 清理 → Rive 拆件 | 5／10 | 工具鏈找齊、Rive 匯入限制清楚，但匯入後結構未實測，補件仍是手工 |
| 網頁介面（挑圖、Vector Editor、付費） | 0／10 | 要 James 動手；CC 可用 Chrome 自動化輔助但不該碰付費 |
| **整體** | **6／10** | 預期第一輪實測後到 7，三輪後到 8；剩下的 2 成是「審美判斷」，永遠要 James 挑圖 |
