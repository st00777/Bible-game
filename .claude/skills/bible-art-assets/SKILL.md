---
name: bible-art-assets
description: 靈修冒險美術素材產線：用 Chrome 操作 Gemini 生圖（附風格錨）、原尺寸下載、rembg 去背、ImageMagick 切件與裁浮水印、轉 webp、分層命名。用於「處理這批素材」「生 X 的圖」「去背切件」「做示意頁素材」。
---

# 靈修冒險 · 美術素材產線（2026-09-06 建立）

## 前提
- 風格錨：`img/style-ref/traveler-anchor-chatgpt.jpg`（水粉小旅人）。定裝三視圖：`img/style-ref/p0/originals/p0-1-modelsheet.jpg`。
- 提示詞模板：`img/style-ref/p0-prompt-pack.md`（STYLE 段逐字沿用，只換 CONTENT）。
- 工具（James 2026-09-06 已裝）：`magick`（ImageMagick 7）、`~/.local/bin/rembg`（已 inject onnxruntime，模型 isnet-general-use 在 `~/.rembg/models/`）、`cwebp`。
- Chrome 下載位置已改為 `~/bible-work/downloads`，Bash 讀得到。

## 一、生圖（Gemini 網頁版，Nano Banana 2）
> 2026-09-06 補：Chrome 視窗 1405×840（桌面版佈局）時座標如下；舊的 (98,1224) 系列是手機直式佈局。
> 桌面版流程：navigate → 點「+」(561,420)，第一下常沒反應再點一次 → `find`「file input under 上傳檔案」→ `file_upload` 餵圖 → Escape → 點「+」(560,449 或 560,501) → `find`「建立圖像 menu item」**用 ref 點**（座標點常失敗、還會把已打的字清掉）→ 點「顯示比例」(836,762) → 選項 1:1 (588,582)／16:9 (593,717) → 點輸入框 (800,661) `type` → 送出鈕 (1116,708) → 等 35-40 秒 → scroll down 10 → hover (836,300-440) → 下載鈕在圖片右上 (1141, 圖頂+30)。
> 同一對話追加「Make the same sheet again, EXACTLY the same canvas/scale/baseline…只換 X」可保持對齊，分層素材靠這招。
1. `navigate` 到 `https://gemini.google.com/app`，等 4 秒。
2. 點「+」（座標 98,1224；剛載入第一下常沒反應，再點一次）→ `find`「圖片 menuitemcheckbox」→ 用 ref 點。
3. 再點「+」→ `find`「檔案 file button」→ `file_upload` 餵參考圖（可多檔：錨圖＋定裝圖）。檔案要在 scratchpad 或 uploads 目錄，repo 路徑會被拒。
4. 比例：點 (480,1235) 開選單，**用座標**點選項（16:9 約 y=1259-1272、1:1 約 y=911），先截圖確認再點；ref 點常無效。
5. 點輸入框 (400,1072)，`type` 提示詞，按送出鈕 (822,1147)（Enter 有時不送）。
6. 等 30-45 秒，`scroll` 下、`hover` 到 (460,1250) 避開懸浮鈕，截圖確認。
7. `browser_batch` 單批控制在 40 秒內，否則逾時。

## 二、取原圖
- 在對話頁 hover 圖片 → 點右上「下載原尺寸圖片」（**座標點**，ref 點只會 hover）。落到 `~/bible-work/downloads/Gemini_Generated_Image_*.jpeg`，16:9 為 1376×768、3:4 為 896×1200。
- 立刻改名搬到 `img/style-ref/<批次>/originals/`，命名 `<批>-<序>-<內容>.jpg`。
- 備援：`computer.zoom` 圈圖＋`save_to_disk`（約 930px 寬，只夠示意）。

## 三、去背與切件
```
~/.local/bin/rembg i -m isnet-general-use in.jpg out.png
magick out.png -crop 33%x100%+0+0 +repage -trim +repage front.png
magick sheet.png -crop 3x1@ +repage -trim +repage part-%d.png
magick in.png -gravity SouthEast -chop 8%x8% out.png
cwebp -q 90 -alpha_q 90 in.png -o out.webp
```
- rembg 需要 `dangerouslyDisableSandbox`（模型下載與 onnxruntime）。
- rembg 會把細瘦物件（葉冠、細環）整個當背景吃掉；這類改用白鍵 `magick x.jpg -fuzz 7% -transparent white`。
- 去背後算 bbox 用 `-alpha extract -threshold 3% -format %@`，直接對 RGBA 用 `%@` 會被透明像素的殘色騙。
- **分層對齊**（2026-09-06 建立）：同一張 sheet 切三等分，各自算 bbox 中心 x，貼到 460×768 透明畫布並把中心對到 x=230、y 不動；疊起來就是同一個人。帽兜放下的外袍要再下移 36px、草帽上移 25px、葉冠上移 45px（手動微調值，正式資產改在定裝圖標錨點）。範例在 `img/style-ref/p1/`（originals／work／cut／p1-mockup.tpl.html／build.mjs）。
- 白底簡單物件可用白鍵去背（sharp 腳本在 `img/style-ref/p0/cut.mjs`），毛邊、狐狸尾巴用 rembg。
- Gemini 右下角 ✦ 浮水印：構圖時右下留空，示意用直接 chop 右下 8%；正式資產重生。
- 規格：切件透明 PNG → webp，單件 ≤ 60KB；封面 1600×900 webp ≤ 150KB；示意頁圖片 data URI **只嵌一次**（用 JS map 填 src），否則宿主端畫不完。

## 四、命名
`trav-front / trav-34 / trav-back`、`cloak-<色>`、`hat-*`、`hand-*`、`companion-*`、`item-*`、`map-*`、`scene-*`。同一角色所有部位共用定裝姿勢與錨點。

## 五之前、骨架零件（2026-09-06 建立；**v2 正本＝母圖切件，範例 `img/style-ref/p1/rig2/`**；v1 分開生零件的做法已作廢，比例會飄）
- **母圖切件（正本）**：以定裝正面全身去背圖（460×768）為母圖，`rig2/cut.py` 用「彼此重疊」的多邊形切九塊（頭、上身、上臂×2、前臂×2、裙、靴×2），畫序決定重疊區誰蓋誰；外袍用同畫布對齊好的整件外袍切帽兜後片／上片／下片。切完 `magick compare -metric AE -fuzz 2%` 疊回母圖比對，差異 <0.1% 才算過（v2 為 0.03%）。
- 關節（母圖座標）：neck (230,205)、肩 (172,222)/(288,222)、肘 (142,320)/(318,320)、手 (125,470)/(335,470)、waist (230,330)、hips (230,340)、腿 (188,650)/(272,650)。零件位移＝bbox 左上−關節座標，由 `rig2/parts.json` 自動算，頁面不手填。
- 畫序：靴→裙→外袍下→上身→上臂→前臂→外袍上→帽兜後片→頭→頭飾→手持；手抬起（肩＋肘角 >22°）時前臂與手持物改畫到外袍前面。
- 手持物一筆資料：`{img,h,grip:[x比例,y比例],rot,upright,glow,name}`；upright 抵銷手部世界旋轉讓物件保持直立。P0 裝備圖切件混有鄰件碎片，用 connected-components 只留最大區塊。
- 舊 v1 紀錄（保留參考）：
- 在同一個 Gemini 對話追加「RIG PARTS breakdown」：身體七塊（頭＋頸樁／上身無手臂／左右手臂含手／裙擺／左右靴含腿樁），外袍上下兩片。每片要「多畫一點重疊藏在關節下」。
- 檢查項：裙擺底下不能多畫靴子；外袍上片必須「STRICT FRONT VIEW、左右對稱、肩線約 1.4 倍上身寬、開襟」，否則會變成 3/4 角度的小披肩（James 2026-09-06 抓到的錯）。
- 切件不用手量：rembg 後 `magick x.png -alpha extract -threshold 3% -define connected-components:verbose=true -define connected-components:area-threshold=1500 -connected-components 8 null:` 直接列每塊 bbox，再各自 crop（pad 6）。
- 關節座標（640×900 畫布，hips 在 (320,440)）：neck (0,-280)、肩 L (-128,-262)／R (61,-262)、waist (0,-30)、腿 L (-93,283)／R (53,283)、手 R 在肩下 (0,330)。畫序：靴→裙→外袍下→手臂→上身→外袍上→頭→頭飾→手持。
- 骨架頁 `rig-mockup.tpl.html` ＋ `build-rig.mjs`；搬進 Rive 編輯器時零件與關節照此。

## 五、示意頁
- 本機預覽：`python3 -m http.server 8765` 後開 `http://127.0.0.1:8765/...`（file:// 會被 Chrome 工具擋；http.server 沒帶 charset 所以中文會亂碼，只看排版）。
- `cqh` 在 `container-type:inline-size` 下無效，高度一律用 `cqw`。
- 待機動畫：呼吸 scaleY 1.012／3.6s、斗篷 rotate ±.35°／5.2s、眨眼用膚色橢圓蓋眼睛（座標從 base 圖量）、火光 radial-gradient + mix-blend screen。

## 六、交付
- 切件放 `img/style-ref/<批次>/cut/`，原圖放 `originals/`，不進 `public/`、不 commit，等 James 拍板。
- 交付時 `SendUserFile` 傳圖，回報張數、尺寸、哪張需重生。

## 五之二、分件 rig sheet 方格法（2026-09-08 建立，正本提示詞 `img/style-ref/p2/p2-prompt.md`）
- 提示詞關鍵句：「invisible uniform GRID of equal square cells, 6 columns x 3 rows; exactly ONE part per cell, centred, wide white margin; gap ≥ a hand's width; no part extends into a neighbouring cell」＋逐格點名零件。Gemini 會順手畫格線，反而好切。
- 切法：按格等分、每格內縮 10px、白鍵 fuzz 6%、trim；`cut2/parts.json` 記格位與連通區塊數。18 格零碎片（對比第一張自由排版 30 件有 7 件帶碎片）。
- 坑：寫「填滿格子 70%」小零件（手、眼、嘴）會被放大 2–3 倍；要寫「all parts at the same scale, small parts stay small」。要「單段手臂」它會給整隻手臂拆三截，可直接用。
- 一張只放一類（身體／斗篷／配件），零件才夠大。
