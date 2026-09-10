# P0 提示詞包（水粉小旅人示意頁用）

生成順序：1 定裝圖 → 2 斗篷 → 3 狐狸 → 4 地圖 → 5 裝備。第 1 張沒過關不要往下走。
每張新開一個 Gemini 對話、選「圖片」工具、比例照標示；同一張要微調才留在同一對話，用「keep everything identical, only fix: 〈一件事〉」。
每張至少生 2 次挑 1 張，存成 img/style-ref/〈名稱〉-v1.png，落選的也留著。
右下角 ✦ 浮水印：構圖已避開，示意頁裁掉右下即可。

---

## 1. 定裝三視圖　比例 16:9　附圖：traveler-anchor-v1.jpg

```
[STYLE]
Soft gouache and colored-pencil children's-book illustration, matte paper grain visible. Muted, low-saturation warm palette on a cream ground (#F7EEDC). Characters and foreground props have a thin, EVEN, hand-drawn outline in warm dark brown (#5A4632), about 2px at 1000px width - never black, never variable-width ink, never comic linework. Background hills, mountains and sky are soft washes with little or no outline at all. Flat gentle shading: one soft darker tone per colour. No cel-shade hard edges, no airbrush gradients, no rim light, no specular highlights. Single warm sun from the upper left, very soft; shadows faint and short. Face is minimal and calm: two small dark-brown oval eyes, NO nose, one short gentle smile line, two soft round pink cheek blushes. No eyelashes, no eye sparkle, no teeth, no thick eyebrows. Palette: lavender-purple #8E82AE (shadow #6F6489), cream robe #E8DCBE, leather tan #A67C52, dark brown #5A4632, sage green #A9BE8E / #8FA877, dusty mauve #B7A9BE, sand path #DCC9A8, lamp-flame gold #F2C46A. Proportions: gently stylised adult, about 6.5 head-heights. NOT chibi, NOT 3-head super-deformed. Quiet, unhurried, devotional mood. No text, no lettering, no logo, no UI.

[CONTENT]
Character model sheet. The SAME traveller from the reference image, shown three times in one row, left to right: front view, three-quarter view, back view. Identical standing pose in all three (arms relaxed at sides, feet together, no props, no lantern, no satchel), identical height, identical outfit: hooded lavender cloak over a cream inner robe, dark brown boots. Androgynous, calm, mid-20s. Layout: pure flat white background #FFFFFF, absolutely nothing else - no ground line, no cast shadow, no props, no scenery, no colour swatches. Even, shadowless studio light. Each figure is 78% of the canvas height; top of head at 13% from the top, soles at 91% from the top; all three feet on the same invisible baseline. Wide empty margins left, right and bottom.

[NEGATIVE]
text, lettering, watermark, logo, UI, speech bubble, anime big eyes, chibi 3-head proportions, thick black ink outline, cel shading, glossy 3D render, photorealism, heavy drop shadow, neon or saturated colours, crosshatching, sketchy double lines, dramatic perspective, extra limbs, extra characters, background scenery
```

檢查：三視是否同一人同一高度（拉水平線比頭頂與腳底）；頭身有沒有掉到 4-5 頭；底是否純白、腳下無灰影；臉有沒有長出鼻子或大眼；浮水印離人物夠遠。

---

## 2. 三件外袍斗篷　比例 16:9　附圖：第 1 張定裝圖＋traveler-anchor-v1.jpg（兩張都附）

```
[STYLE]
Soft gouache and colored-pencil children's-book illustration, matte paper grain visible. Muted, low-saturation warm palette on a cream ground (#F7EEDC). Characters and foreground props have a thin, EVEN, hand-drawn outline in warm dark brown (#5A4632), about 2px at 1000px width - never black, never variable-width ink, never comic linework. Background hills, mountains and sky are soft washes with little or no outline at all. Flat gentle shading: one soft darker tone per colour. No cel-shade hard edges, no airbrush gradients, no rim light, no specular highlights. Single warm sun from the upper left, very soft; shadows faint and short. Face is minimal and calm: two small dark-brown oval eyes, NO nose, one short gentle smile line, two soft round pink cheek blushes. No eyelashes, no eye sparkle, no teeth, no thick eyebrows. Palette: lavender-purple #8E82AE (shadow #6F6489), cream robe #E8DCBE, leather tan #A67C52, dark brown #5A4632, sage green #A9BE8E / #8FA877, dusty mauve #B7A9BE, sand path #DCC9A8, lamp-flame gold #F2C46A. Proportions: gently stylised adult, about 6.5 head-heights. NOT chibi, NOT 3-head super-deformed. Quiet, unhurried, devotional mood. No text, no lettering, no logo, no UI.

[CONTENT]
Three variations of the SAME character from the attached model sheet, front view only, standing in the exact same pose, same height, same face, same cream inner robe and dark brown boots. Only the outer cloak differs, left to right: 1) Plain undyed wool cloak, warm oatmeal #DCCBA8, no trim, no pattern, simple hood - humble and warm. 2) Ornate ceremonial cloak, cool pale blue-lavender #A8AEC8, with a fine woven silver-grey border and a small clasp, slightly longer, layered collar - refined and cool. 3) Mid-point: muted lavender-purple #8E82AE cloak with one simple woven band at the hem. The cloak silhouette must read as unisex - it drapes and hides body shape; no waist emphasis, no chest emphasis, no skirt flare. Pure flat white background #FFFFFF, no ground line, no shadow, no scenery, even margins.

[NEGATIVE]
text, lettering, watermark, logo, UI, speech bubble, anime big eyes, chibi 3-head proportions, thick black ink outline, cel shading, glossy 3D render, photorealism, heavy drop shadow, neon or saturated colours, crosshatching, sketchy double lines, dramatic perspective, extra limbs, extra characters, background scenery
```

檢查：三人臉、身高、內袍、靴子是否完全一致（不一致就回頭修第 1 張）；華麗那件有沒有拉高飽和度；有沒有變成女性剪影；三件是否明顯落在「素樸暖 → 中間 → 華麗清冷」的軸上。

---

## 3. 旅伴狐狸　比例 1:1　附圖：traveler-anchor-v1.jpg

```
[STYLE]
Soft gouache and colored-pencil children's-book illustration, matte paper grain visible. Muted, low-saturation warm palette on a cream ground (#F7EEDC). Characters and foreground props have a thin, EVEN, hand-drawn outline in warm dark brown (#5A4632), about 2px at 1000px width - never black, never variable-width ink, never comic linework. Background hills, mountains and sky are soft washes with little or no outline at all. Flat gentle shading: one soft darker tone per colour. No cel-shade hard edges, no airbrush gradients, no rim light, no specular highlights. Single warm sun from the upper left, very soft; shadows faint and short. Palette: lavender-purple #8E82AE, cream #E8DCBE, leather tan #A67C52, dark brown #5A4632, sage green #A9BE8E / #8FA877, dusty mauve #B7A9BE, sand #DCC9A8, gold #F2C46A. Quiet, unhurried, devotional mood. No text, no lettering, no logo, no UI.

[CONTENT]
The small cream-coloured fox-like companion from the reference image, alone, sitting upright, tail curled around its front paws, three-quarter view, looking slightly up and to the left, calm and friendly, mouth closed. Cream fur #F6EEDC with warm shadow #E4D6BC, soft brown inner ears, small dark oval eyes, tiny dark nose. Thin warm-brown outline as in the style. Pure flat white background #FFFFFF, no ground line, no shadow, no scenery. The fox occupies about 62% of the canvas height, centred, generous margins on all four sides.

[NEGATIVE]
text, lettering, watermark, logo, UI, speech bubble, anime big eyes, thick black ink outline, cel shading, glossy 3D render, photorealism, heavy drop shadow, neon or saturated colours, crosshatching, sketchy double lines, dramatic perspective, extra characters, human figure, background scenery
```

檢查：是不是同一隻（耳形、尾巴白尖）；眼睛有沒有變成大眼可愛系；四邊留白夠不夠去背後縮放。

---

## 4. 旅程地圖底圖　比例 16:9　附圖：traveler-anchor-v1.jpg（只取色與筆觸）

```
[STYLE]
Soft gouache and colored-pencil children's-book illustration, matte paper grain visible. Muted, low-saturation warm palette on a cream ground (#F7EEDC). Foreground props have a thin, EVEN, hand-drawn outline in warm dark brown (#5A4632) - never black. Background hills, mountains and sky are soft washes with little or no outline at all. Flat gentle shading: one soft darker tone per colour. No cel-shade hard edges, no airbrush gradients, no rim light. Single warm sun from the upper left, very soft; shadows faint and short. Palette: sage green #A9BE8E / #8FA877, dusty mauve #B7A9BE, sand path #DCC9A8, cream sky #F3E6CE, dark brown #5A4632, lamp-flame gold #F2C46A. Quiet, unhurried, devotional mood. No text, no lettering, no logo, no UI.

[CONTENT]
A hand-painted journey map, horizontal, no characters and no animals anywhere. A soft sand-coloured winding path #DCC9A8 travels from the lower-left to the upper-right across rolling sage-green hills #A9BE8E / #8FA877, past dusty mauve mountains #B7A9BE on the horizon and a warm cream sky #F3E6CE with a few soft clouds. Along the path there are 5 to 6 small campsite markers - tiny stone rings with a small warm campfire, evenly spaced, each with clear empty space around it. The upper-left third of the sky is kept soft and empty. The lower-right corner is plain grass with nothing important in it. Overall calm, low contrast, unhurried. No text, no icons, no banners, no compass rose, no fantasy castles.

[NEGATIVE]
text, lettering, watermark, logo, UI, icons, compass rose, banner, castle, people, animals, characters, thick black ink outline, cel shading, glossy 3D render, photorealism, neon or saturated colours, dramatic perspective, isometric view, busy detail
```

檢查：5-6 個營地是否清楚可數；天空與草地留得下疊字（手機遮一半還讀得出）；右下角沒放重要東西；沒跑出人物或動物。

---

## 5. 創世記三件裝備　比例 16:9　附圖：traveler-anchor-v1.jpg（不要附人物定裝圖）

```
[STYLE]
Soft gouache and colored-pencil children's-book illustration, matte paper grain visible. Muted, low-saturation warm palette. Objects have a thin, EVEN, hand-drawn outline in warm dark brown (#5A4632), about 2px at 1000px width - never black, never variable-width ink. Flat gentle shading: one soft darker tone per colour. No cel-shade hard edges, no airbrush gradients, no rim light, no specular highlights. Single warm sun from the upper left, very soft. Palette: terracotta #C89A6E, pale wood #C9AE86, leather tan #A67C52, warm brown #A67C52, dark brown #5A4632, lamp-flame gold #F2C46A. Quiet, unhurried, devotional mood. No text, no lettering, no logo, no UI.

[CONTENT]
Three separate hand-painted objects in one row on a pure flat white background #FFFFFF, left to right, evenly spaced, all lit by the same soft warm light from the upper left, all drawn at the same scale relationship and the same outline weight: 1) A small ancient clay oil lamp, terracotta #C89A6E, with a tiny warm gold flame #F2C46A. 2) A wooden shepherd's crook, leaning slightly, worn pale wood #C9AE86 with a leather-wrapped grip. 3) A small wooden model ark, simple rounded hull, warm brown #A67C52, with a low roof. Each object occupies about 55% of the canvas height. No ground line, no cast shadow, no pedestal, no scenery, no character, no hands. Generous empty margins.

[NEGATIVE]
text, lettering, watermark, logo, UI, hands, table, pedestal, character, people, animals, thick black ink outline, cel shading, glossy 3D render, photorealism, heavy drop shadow, neon or saturated colours, crosshatching, dramatic perspective, background scenery
```

檢查：三件描邊粗細一致；光都從左上；沒出現手或桌面；單獨裁一件縮到 64px 還認得出。

---

## 去背與裁切（生完交給我之前不用做，我來處理）

- 去背首選 macOS 內建：Finder 右鍵 → 快速動作 → 移除背景；或預覽程式的即時 Alpha。批次時我用 Node 的 sharp 寫腳本。
- 關鍵是生圖時就要到純白底，底色偏米去背會咬掉描邊。
- 浮水印只裁右下，不塗抹。示意頁可接受，正式資產再重生。

## 示意頁四個畫面（我來組）

| 畫面 | 用到的圖 |
|---|---|
| A 開場營火 | 地圖左下段當底＋定裝圖正面＋狐狸 |
| B 讀經 | 定裝圖 3/4 側＋油燈＋地圖天空段當底 |
| C 寫默想 | 定裝圖背面視圖，背對玩家 |
| D 完成前進 | 地圖全幅＋角色從第 2 營地移到第 3 營地＋狐狸；只呈現有沒有完成，不呈現品質差異 |
