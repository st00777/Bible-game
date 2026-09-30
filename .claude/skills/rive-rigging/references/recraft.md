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
- 免費版每日額度（3／風格／日 vs 50／日 矛盾）
- API 最低儲值、免費試用額度、輸出檔大小上限
- MCP 能否直接寫本機檔；MCP 速率限制
- Vector Editor／Custom Style／Image Set 的方案門檻
- 各方案匯出格式分級表
- SVG 技術規格：路徑數、漸層、mask、文字
- Rive 匯入後的圖層樹對應
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
