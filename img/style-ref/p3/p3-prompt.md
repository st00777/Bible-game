# p3 · 路 D 試做素材（坐姿三族＋收卷道具）提示詞（2026-09-09）

用途：`docs/animation-map.md` 待辦「路 D 試做坐姿與收卷」。生圖走 ChatGPT（免費額度），每張都附兩張參考圖：
`img/style-ref/traveler-anchor-chatgpt.jpg`（風格錨）＋ `img/style-ref/p2/originals/p2-2-bodygrid.jpg`（方格排版範例）。
畫布一律橫式 1536×1024（3:2）。產出存 `img/style-ref/p3/originals/`，檔名依序 `p3-1-sit-ref`、`p3-2-sit-cape`、`p3-3-props`、`p3-4-sit-tunic`、`p3-5-sit-robe`。

## 設計要點（為什麼這樣切）
- 路 D（rive-mcp）不能手修權重，肘彎 >15° 網格會塌。所以坐姿的手臂**整隻畫成一件**（肩到手，彎肘直接畫死在圖裡），骨架只做剛體掛接，呼吸靠上身／頭骨頭微位移。
- 坐姿 3/4 側面、面向左（營火在畫面左側，火不畫進角色圖）。帽子與手持坐下時不掛，改成固定行囊放旁邊（行囊在道具表）。
- 外袍三族各出一張方格，只出紫色；燕麥／藍色離線用 ImageMagick 改色相。
- 收卷動作＝手持物換成卷軸＋直臂旋轉＋卷軸飛進行囊，所以只需要卷軸、行囊道具，不需要新的手。
- 每格一件、格間至少一掌寬；大件填 70% 但寫明「小零件維持同比例不放大」（p2-2 的坑：眼、手會被放大 2–3 倍）。
- 臉：改為「小小一道鼻線」（James 2026-09-10：不需要無鼻設定；風格錨本來就有淡鼻線）。關節端畫成略超出的膠囊狀。

## 共用 STYLE 區塊（每張提示詞都以此開頭，與 p2 相同）
```
[STYLE]
Soft gouache and colored-pencil children's-book illustration, matte paper grain visible. Muted, low-saturation warm palette. Characters and props have a thin, EVEN, hand-drawn outline in warm dark brown (#5A4632), about 2px at 1000px width - never black, never variable-width ink, never comic linework. Flat gentle shading: one soft darker tone per colour. No cel-shade hard edges, no airbrush gradients, no rim light, no specular highlights. Face is minimal and calm: two small dark-brown oval eyes, a tiny short nose line (as in the reference), one short gentle smile line, two soft round pink cheek blushes. No eyelashes, no eye sparkle, no teeth, no thick eyebrows. Palette: lavender-purple #8E82AE (shadow #6F6489), cream robe #E8DCBE, leather tan #A67C52, dark brown #5A4632, sage green #A9BE8E. Proportions: gently stylised adult, about 6.5 head-heights. NOT chibi. No text, no lettering, no logo, no UI.
```

## 第 1 張 p3-1-sit-ref（坐姿三族全身參考，一張看三族）
```
[CONTENT]
Three seated poses of the SAME traveller from the reference images (short brown bob hair, calm face, dark brown boots), side by side on a pure flat white background #FFFFFF, all the same size and the same pose, evenly spaced, not touching. Landscape canvas.
Pose (identical for all three): sitting on a low flat grey-brown rock, seen in THREE-QUARTER SIDE VIEW facing the LEFT of the canvas, as if watching a campfire that is out of frame to the left. Back gently straight, knees bent, both feet flat on the ground, both hands resting calmly on the knees. Head tilted very slightly down, eyes looking toward the lower left (toward the fire), NOT toward the viewer. Quiet, restful, warm mood. No campfire, no fire glow, no props, no ground line.
Outfit differs only in the outer garment, all in lavender-purple #8E82AE over a cream tunic #E8DCBE with a dark brown leather belt:
1. LEFT figure: a sleeveless CAPE (cloak without sleeves) draped over the shoulders and falling behind the back; the arms show the cream tunic sleeves.
2. MIDDLE figure: a purple SHORT TUNIC that ends at the hips with elbow-length purple sleeves, worn over the cream tunic whose cream sleeves show from elbow to wrist.
3. RIGHT figure: a purple LONG ROBE with long sleeves that reaches the ankles.
Even, shadowless studio light. No cast shadow, no colour swatches, no labels, no arrows, no numbers.

[NEGATIVE]
text, lettering, labels, numbers, arrows, watermark, logo, UI, anime big eyes, chibi proportions, thick black ink outline, cel shading, glossy 3D render, photorealism, drop shadow, saturated colours, campfire, fire, background scenery, extra characters, front view, looking at camera
```

## 第 2 張 p3-2-sit-cape（坐姿零件方格・披風族）
附圖改為：風格錨 ＋ `originals/p3-1-sit-ref.png`（第 1 張成品，姿勢與服裝以它為準）＋ p2-2 方格圖。
```
[CONTENT]
A 2D character PARTS SHEET of the SAME seated traveller from the reference images - use the LEFT figure of the seated reference (cape version) as the exact pose and outfit - designed for skeleton rigging in Rive. Pure flat white background #FFFFFF. Landscape canvas.
The character is SEATED on a low flat rock in THREE-QUARTER SIDE VIEW facing the LEFT, wearing a cream tunic #E8DCBE with a dark brown leather belt and a sleeveless lavender-purple CAPE #8E82AE draped over the shoulders, dark brown boots. Every part below is drawn in that same three-quarter side view, at the same relative scale, as pieces of that one seated figure.
LAYOUT RULE (most important): arrange every part on an invisible uniform GRID of equal cells, 4 columns x 2 rows across the whole canvas. Exactly ONE part per cell, centred in its cell, with wide empty white margin all around it; the gap between any two neighbouring parts must be at least the width of a hand. No part may extend into a neighbouring cell. No part touches or overlaps another. Draw the large parts big (about 70% of the cell), but keep ALL parts at the same relative scale to each other - small parts (eyes) stay small, do NOT enlarge them to fill the cell.
Row 1: (1) head with face, three-quarter view facing left, eyes looking toward the lower left, but NO hair; (2) the hair alone, short brown bob, three-quarter view, as one piece; (3) the pair of open eyes alone; (4) the pair of closed eyes alone (two gentle curved lines).
Row 2: (5) the seated UPPER BODY from neck to belt: cream tunic torso with the purple cape draped over the shoulders, WITHOUT arms and WITHOUT head; (6) the NEAR arm (the left arm, closest to the viewer) as ONE single piece from shoulder to hand, bent at the elbow so the hand rests on the knee, in cream sleeve, with the elbow bend already drawn in; (7) the seated LOWER BODY as one piece: the tunic skirt over bent knees, both lower legs and both boots, feet flat, seen from the same angle, WITHOUT the rock; (8) the back part of the cape that hangs behind the body, as one flat piece.
Every joint end (neck, shoulder, hip) drawn as a rounded, slightly over-extended capsule end so parts overlap without gaps when assembled. Even, shadowless studio light. No rock, no campfire, no ground line, no shadows, no colour swatches, no labels, no numbers, no arrows, no grid lines, no reference figure.

[NEGATIVE]
text, lettering, labels, numbers, arrows, watermark, logo, UI, anime big eyes, chibi proportions, thick black ink outline, cel shading, glossy 3D render, photorealism, drop shadow, saturated colours, overlapping parts, parts touching, background scenery, extra characters, front view, full figure
```

## 第 2 張結果（2026-09-10，GPT 免費額度用罄）
- 背景跑成深色帶光暈（非純白）。rembg（isnet-general-use）救回六件大零件、邊緣乾淨；眼睛兩格（深色描深底）被吃掉，頭上已有眼睛、眨眼改膚色眼皮片。切件在 `cut2/`（連通區塊外框切，格子切會切到隔壁）。
- 疊回參考圖（`work/compare-v2.png`）：①頭比身體大約 1.4 倍，組裝時頭＋髮縮 72% 可對上；②下身零件膝蓋沒往前伸、大腿不夠長，手放不到膝蓋；③零件拆法全部正確。
- **裁定：這批可做路 D 呼吸試做，不可當正式素材。** 正式版待明日額度重生，提示詞改三處（見下）。

## 第 2 張重生版修正（2026-09-10 晚，James 看過試做後改拆法；下次用這版）
James 回饋：手臂位置詭異、整隻袖子疊在披風上像衣服破洞。原因＝上身圖已把披風畫在肩上，手臂再疊上去必衝突；下身沒有往前伸的膝蓋可放手。
**新拆法（坐姿不動手臂，所以手臂烤進下身）**：
- 第 (5) 格 上身：從脖子到腰帶，披風披在肩上、**上臂藏在披風底下**，無頭。
- 第 (6) 格 下身：**大腿水平往前伸到膝蓋、小腿垂直到靴、裙襬蓋在大腿膝蓋上，並且把靠觀者這側的前臂與手一起畫進去，手放在膝蓋上，前臂從披風邊緣下方伸出**（米色袖）。無石座。
- 第 (7) 格 披風後片。第 (8) 格 石座（原本 4 格眼睛保留：1 頭無髮、2 髮、3 睜眼、4 閉眼）。
- 不再有獨立手臂格。短衣族第 (6) 格前臂為米色袖、長袍族為紫袖；上臂（肘長紫袖）都在第 (5) 格。
其他修正照舊：開頭加「The whole canvas is PLAIN FLAT WHITE PAPER #FFFFFF from edge to edge - NO dark background, NO vignette, NO glow or halo around parts, NO spotlight.」；比例句改「Draw the head at exactly the same scale as the torso, as if the parts were cut from the seated reference figure; the head must NOT be enlarged.」；NEGATIVE 加 dark background, black background, vignette, glow, halo, spotlight, enlarged head, separate arm.

完整 CONTENT（披風族）：
```
[CONTENT]
A 2D character PARTS SHEET of the SAME seated traveller from the reference images - use the LEFT figure of the seated reference (cape version) as the exact pose and outfit - designed for skeleton rigging in Rive. The whole canvas is PLAIN FLAT WHITE PAPER #FFFFFF from edge to edge - NO dark background, NO vignette, NO glow or halo around parts, NO spotlight. Landscape canvas.
The character is SEATED on a low flat rock in THREE-QUARTER SIDE VIEW facing the LEFT, wearing a cream tunic #E8DCBE with a dark brown leather belt and a sleeveless lavender-purple CAPE #8E82AE draped over the shoulders, dark brown boots. Every part below is drawn in that same three-quarter side view, as pieces cut from that one seated figure.
LAYOUT RULE (most important): arrange every part on an invisible uniform GRID of equal cells, 4 columns x 2 rows across the whole canvas. Exactly ONE part per cell, centred in its cell, with wide empty white margin all around it; the gap between any two neighbouring parts must be at least the width of a hand. No part may extend into a neighbouring cell. No part touches or overlaps another. Draw every part at exactly the same scale as it appears on the seated reference figure - the head must NOT be enlarged, and small parts (eyes) stay small.
Row 1: (1) head with face, three-quarter view facing left, eyes looking toward the lower left, but NO hair; (2) the hair alone, short brown bob, three-quarter view, as one piece; (3) the pair of open eyes alone; (4) the pair of closed eyes alone (two gentle curved lines).
Row 2: (5) the seated UPPER BODY from neck to belt: cream tunic torso with the purple cape draped over both shoulders so that the upper arms are hidden under the cape, WITHOUT head, WITHOUT any visible arm; (6) the seated LOWER BODY as one piece: thighs horizontal and extending forward to the knees, lower legs going down to both boots, feet flat, the tunic skirt draped over the thighs and knees, AND the near forearm in its cream sleeve with the hand resting on the knee, the forearm emerging from below the cape's edge - all as one piece, WITHOUT the rock; (7) the back part of the cape that hangs behind the body, as one flat piece; (8) the low flat grey-brown rock seat alone.
Every joint end (neck, waist) drawn as a rounded, slightly over-extended capsule end so parts overlap without gaps when assembled. Even, shadowless studio light. No campfire, no ground line, no shadows, no colour swatches, no labels, no numbers, no arrows, no grid lines, no reference figure.

[NEGATIVE]
text, lettering, labels, numbers, arrows, watermark, logo, UI, anime big eyes, chibi proportions, thick black ink outline, cel shading, glossy 3D render, photorealism, drop shadow, saturated colours, overlapping parts, parts touching, background scenery, extra characters, front view, full figure, dark background, black background, vignette, glow, halo, spotlight, enlarged head, separate arm
```

## 第 3 張 p3-3-props（道具：卷軸、行囊、營火、石座）
```
[CONTENT]
A PROPS SHEET in the same illustration style as the reference character, for a 2D game. Pure flat white background #FFFFFF. Landscape canvas. No characters.
LAYOUT RULE (most important): arrange every prop on an invisible uniform GRID of equal cells, 4 columns x 2 rows. Exactly ONE prop per cell, centred, wide white margin around it, gap between neighbours at least a hand's width, nothing touching or overlapping, large props filling about 70% of the cell, but all props at the same relative scale to each other (the scroll must be small enough to fit inside the pack).
Row 1: (1) a rolled-up parchment scroll with small wooden end rods, tied with a thin leather cord, seen from the side, slightly angled; (2) the same scroll half unrolled, blank parchment, no writing; (3) a worn leather travel pack (a soft satchel-style bag in leather tan #A67C52 with a flap and a strap), CLOSED, standing upright on the ground, front three-quarter view; (4) the same travel pack OPEN, flap lifted, with three rolled scrolls standing inside and poking out of the top.
Row 2: (5) a small campfire: a few crossed logs with a warm flame, flame shape A (tall, leaning slightly left), colours muted orange and soft yellow within the same low-saturation palette; (6) the same campfire with flame shape B (shorter, leaning slightly right); (7) the same crossed logs with NO flame, just a faint warm ember glow; (8) a low flat grey-brown rock suitable as a seat, seen from three-quarter front.
Thin even warm-brown outline, flat gentle shading, matte gouache texture. No ground line, no cast shadow, no colour swatches, no labels, no numbers, no arrows, no grid lines.

[NEGATIVE]
text, lettering, labels, numbers, arrows, watermark, logo, UI, characters, hands, thick black ink outline, cel shading, glossy 3D render, photorealism, drop shadow, saturated colours, overlapping parts, parts touching, background scenery, sparks, smoke
```

## 第 1 張結果（2026-09-10）
- 不附參考圖：頭身掉到約 4.5、風格偏扁平，存 `work/p3-1-noref.png` 當反例。
- 附風格錨：6.5 頭身、水粉質感對上，採用，存 `originals/p3-1-sit-ref.png`。短衣族 GPT 畫成「肘長紫袖＋露出米色前臂袖」，比長袖更好認、站姿前臂可與披風族共用，採用並回寫第 1、4 張提示詞。

## 第 4 張 p3-4-sit-tunic（坐姿零件方格・短衣族）
把第 2 張提示詞裡的服裝句換成下面這句，其餘一字不改；第 (6) 格的手臂改為「upper arm in the purple elbow-length sleeve, forearm in the cream sleeve」，第 (8) 格改為「the lower hem of the purple short tunic that hangs over the belt at the hip, as one flat piece」：
```
wearing a cream tunic #E8DCBE with a dark brown leather belt, and over it a lavender-purple SHORT TUNIC #8E82AE with elbow-length sleeves that ends at the hips, the cream sleeves showing from elbow to wrist, dark brown boots
```

## 第 5 張 p3-5-sit-robe（坐姿零件方格・長袍族）
同上，服裝句換成：
```
wearing a lavender-purple LONG ROBE #8E82AE with long sleeves reaching the ankles, with a dark brown leather belt, dark brown boots
```
第 (6) 格手臂「in the purple robe sleeve」；第 (7) 格下身改為「the seated lower body as one piece: the long purple robe skirt over bent knees, with only the boot tips showing, WITHOUT the rock」；第 (8) 格改為「the back part of the robe that spreads behind the body on the ground, as one flat piece」。

## 每張收圖檢查（不合格立刻重生，不往下切）
1. 一格一件、互不接觸、沒跑出格；沒有多畫參考人或多餘物件。
2. 方向：坐姿全部面向左、3/4 側面；不是正面、不是看鏡頭。
3. 手臂是完整一件（肩到手），肘彎畫在圖裡；上身格沒有手臂、沒有頭。
4. 臉：無鼻、兩點眼、一道笑線、腮紅；髮型是短棕鮑伯。
5. 線稿暖棕、粗細均勻；顏色低飽和；紫色接近 #8E82AE。
6. 道具表的兩個火焰形狀要明顯不同（做閃爍用）；行囊開／關兩張大小一致。
