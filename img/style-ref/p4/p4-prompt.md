# p4 · 定裝圖重生（2026-09-12）

## 0. 風格錨原始提示詞（James 2026-09-05/06 在 ChatGPT 生 `traveler-anchor-chatgpt.jpg` 用的，正本）
> 以後所有正式素材的 STYLE 段從這裡改，不再沿用 p0-prompt-pack（那套是 Gemini 版，把臉寫成豆豆眼＋無鼻）。

```
[STYLE - keep verbatim every time]
Warm gouache storybook illustration. Opaque, slightly textured paint with visible brush grain. Every shape outlined with a uniform 2px warm dark-brown line (#5A4636). Soft golden hour light from upper-left at 30 degrees. Muted warm palette: sand, cream, moss green, dusty purple, terracotta. Low contrast, gentle shadows, no harsh black. Character proportion is 4.5 heads tall - a small adult, NOT a chibi. Face is simple and calm: small eyes, no exaggerated features, gentle expression. Three-quarter front view, eye-level camera. Ghibli-adjacent warmth, Spiritfarer-adjacent tenderness, Sky-adjacent silhouette clarity.

[CONTENT]
A lone traveler stands on a winding dirt path at the edge of a quiet hillside at dawn. The traveler wears a long hooded cloak in dusty purple with a simple sand-colored inner robe, holds a small brass oil lamp that glows faintly, and carries a worn leather satchel. A small round companion creature - a cream-colored fox-like animal - sits at the traveler's feet, looking in the same direction. Behind them, the path recedes over gentle hills toward distant soft mountains, with a few small campfire markers along the way. Warm sky, scattered soft clouds. The mood is calm, hopeful, and quietly adventurous - the start of a long journey, not a battle. Vertical composition suited to a 420px-wide phone screen.

[NEGATIVE]
No text, no letters, no logos, no UI elements. No weapons, no swords, no armor. No chibi or 2-head proportions. No anime big sparkling eyes. No neon or saturated primary colors. No photorealism, no 3D render, no plastic shine. No religious iconography (no crosses, halos, angels). No gender-coded styling (no skirts/heels, no muscular armor). No busy background clutter. No harsh black outlines or heavy cel-shading.
```

觀察：提示詞寫 4.5 頭身，ChatGPT 實際畫出約 5.5–6 頭身；臉只寫「小眼睛、不誇張、溫和」，ChatGPT 自己畫出眼白＋虹膜＋小鼻。→ 數字與極簡描述影響有限，**同一對話續生**才是保住臉與比例的關鍵。

## 1. 今天兩次失敗（`originals/p4-1-anchor-try1/2.png`）
- try1：沿用 p0 STYLE（平塗、無紙紋、無鼻豆豆眼）→ 畫風退回 Gemini 感。
- try2：紙紋回來了，但仍是豆豆眼、頭大身短。原因＝我仍寫「small dark eyes」且新開對話只靠附圖模仿。

## 2. 定裝正面 A 字站姿（在生錨圖的同一個 ChatGPT 對話續生；附錨圖）
STYLE 段照原文，只動兩處（標 ★）：視角改正面（綁骨必要）、臉補一句「跟前一張同一張臉」。

```
[STYLE - keep verbatim every time]
Warm gouache storybook illustration. Opaque, slightly textured paint with visible brush grain. Every shape outlined with a uniform 2px warm dark-brown line (#5A4636). Soft, even light, very gentle shadows. Muted warm palette: sand, cream, moss green, dusty purple, terracotta. Low contrast, gentle shadows, no harsh black. Character proportion exactly as the traveler in the previous image - a slim small adult, NOT a chibi. Face is simple and calm: the SAME face as the traveler in the previous image - same eyes with visible whites and dark iris, same small nose, same soft eyebrows, gentle closed-mouth smile. ★ STRICT FRONT VIEW, eye-level camera, perfectly symmetrical. Ghibli-adjacent warmth, Spiritfarer-adjacent tenderness, Sky-adjacent silhouette clarity.

[CONTENT]
Character model sheet of the SAME traveler from the previous image, ONE figure only, for animation rigging. Standing in a clean A-pose: body squarely facing the camera, head level, eyes looking straight at the viewer, both arms straight and held out about 40 degrees from the body, palms facing the viewer, feet slightly apart. Same outfit as before: long hooded cloak in dusty purple worn with the hood DOWN behind the shoulders, cloak open at the front with the two front panels hanging straight and meeting at the centre; simple sand-colored inner robe; worn leather satchel strap across the chest; simple leather boots. No lamp, no fox, no props on the ground. Pure flat white background, absolutely nothing else: no ground, no path, no sky, no cast shadow. The figure fills about 85% of the canvas height, centred. Vertical canvas.

[NEGATIVE]
No text, no letters, no logos, no UI elements. No weapons, no swords, no armor. No chibi or 2-head proportions, no big head. No anime big sparkling eyes, no dot eyes, no missing nose. No neon or saturated primary colors. No photorealism, no 3D render, no plastic shine. No religious iconography. No gender-coded styling (no skirts/heels, no muscular armor). No background, no scenery. No harsh black outlines or heavy cel-shading. No three-quarter view, no turned body, no tilted head.
```

檢查：臉是不是錨圖同一人（眼白、鼻子、眉）；頭身是否與錨圖一致（頭頂到腳底除以頭高 ≥ 5.5）；兩肩兩腳是否對稱；前襟中間無縫；底純白無影。過關 → 下一張 6×3 零件方格（規格見 `p2/p2-prompt.md` 第 2 張，STYLE 換成本檔第 0 節）。

## 3. 結果（2026-09-12 下午）
- `originals/p4-1-anchor-try3-male.png`：男版，臉／比例／前襟都對，但黑底光暈 → 待重生白底。
- `originals/p4-2-anchor-female.png`：**女版定裝正本**（白底、臉同一家人、約 6 頭身；5 頭身指令只被部分採納，James 接受）。ChatGPT Plus 免費月（10/12 前取消）。

## 4. 男版白底重生（同對話）
```
Now redraw the MALE traveler from two images ago (the one on the dark background) so that he matches this female version exactly in style, proportions, pose, outfit and framing: same A-pose, same cloak with hood down, same satchel strap, same boots, same 85% figure height, and the SAME pure flat white background (#FFFFFF) with no glow, no vignette, no shadow. Keep his face and short wavy hair, but make the hair warm brown like hers, not green.
```

## 5. 零件方格（女版，同對話，附 p4-2-anchor-female.png）— 規格沿用 p2 第 2 張
```
Make a RIG SHEET of the SAME female traveler from the previous image, same gouache style, same face, same outfit colours, designed for skeleton animation in Rive. Pure flat white background (#FFFFFF). LAYOUT RULE (most important): arrange every part on an invisible uniform GRID of equal square cells, 6 columns x 3 rows across a 16:9 canvas. Exactly ONE part per cell, centred, with wide white margin all around; the gap between neighbouring parts must be at least one hand-width. No part touches, overlaps, or extends into a neighbouring cell. Draw every part LARGE, filling about 70% of its cell. All parts front-facing, same relative scale to each other.
Row 1: head with face and NO hair; front hair (fringe) alone; back hair alone; pair of open eyes; pair of closed eyes; mouth gentle smile.
Row 2: inner robe torso (neck to hips, no arms, no skirt); inner robe skirt (hips to hem); left upper arm in robe sleeve (shoulder to elbow); left lower arm in robe sleeve (elbow to wrist); right upper arm; right lower arm.
Row 3: open hand; hand holding a small brass oil lamp; hand holding a wooden staff; left boot; right boot; leather satchel with strap.
Every joint end (neck, shoulders, elbows, wrists, hips, ankles) is drawn as a rounded, slightly over-extended capsule end so parts overlap when rigged. No cloak on this sheet. No reference figure. No text, no labels, no numbers, no arrows, no grid lines, no ground line, no shadows, no colour swatches.
```
第二張方格（外袍）：帽兜後片、外袍肩片、外袍下片、外袍袖上／下×左右，同規格；之後三色各一張。

## 6. 方格圖實拼結果（2026-09-12 14:40）
- `originals/p4-3-female-bodygrid.png` → `cut/`（18 件，連通區塊外框切）→ `work/assembled-v1.png`、`work/compare-v1.png`（左定裝、右粗拼）。
- **結論：James 直覺對。** 一格一件生出來的是「木偶零件」：頭髮尺寸與身體不搭、裙長只到小腿、袖子是獨立布袋、關節圓頭外露；每件各畫各的，風格與比例互飄。方格法只留給小配件（閉眼、嘴、握燈／握杖的手）。
- `originals/p4-4-anchor-male-white.png`（＋`-alt`）：男版白底定裝正本，與女版同比例同風格。

## 7. 改走「分層底片」法（下一步，同一 ChatGPT 對話，手機可貼）
原理：可見的層（頭髮＋臉、外袍上下片、袖、側背包、靴）直接從定裝圖切，保證長得跟核可的圖一模一樣；被外袍遮住的層（內袍身體、內袍袖、腰帶）從「同一張圖拿掉外袍」的底片切，所以每件底下都有真的畫好的內容，不會再切在重疊邊界上。

底片 B（女版）：
```
Keep everything identical to the previous image of the FEMALE traveler - same pose, same face, same hair, same proportions, same framing, same pure white background - and change only ONE thing: remove the purple cloak and the satchel completely, so she stands in just the sand-colored inner robe (with its own long sleeves and the thin belt) and her boots. Nothing else changes.
```
底片 B（男版）：把 FEMALE 改 MALE、she 改 he，其餘相同。

之後由 CC 切件：A 圖切 head+hair（一件剛體）、cloak hoodback／upper／lower、cloak sleeve L/R、satchel、boots；B 圖切 torso、skirt、sleeve L/R（內袍）、hand L/R。小配件用 `cut/eyes-closed.png`、`cut/mouth.png`、`cut/hand-lamp.png`、`cut/hand-staff.png`。

## 8. 2026-09-12 15:05 James 否決「從定裝照切」（第一版就是這樣切出來醜）。改測 A 法「同位分層」
- A-1（同對話請 ChatGPT 只畫外袍、其他留白）：`work/cloak-only-shot.png`、`work/compare-cloak.png`。位置與尺寸偏差小（肩線約 2–3%），**但形狀是重畫的**：前襟開一道縫（定裝圖是閉合的）、袖型與長度不同、帽兜形狀不同。
- A-2（在定裝圖上用「編輯」要求保留像素只擦掉其他）：結果與 A-1 幾乎相同，仍是重畫。**ChatGPT 不會保留原像素，同位分層不可行。**
- 結論：A 法死。剩 B 法＝整張換姿勢不綁骨（站／舉燈／低頭各一張完整圖＋閉眼一張，Rive 只做淡入淡出＋眨眼＋呼吸，p3 坐姿已驗證）。等 James 拍板再生。

## 9. James 自己試（2026-09-12 15:10 起）· 中文提示詞（同對話、附女版定裝圖）
James 判斷：外袍中間裂開沒關係，截白邊後會顯出底服；只有脖子會被蓋住 → 外袍段加「領口開口露出脖子」。
1. 只畫外袍：以這張女旅人定裝圖為底，輸出同一張畫布、同樣大小、同樣構圖、同樣純白背景，但只畫她的紫色帽兜外袍（帽兜、肩膀、袍身、兩隻袖子），位置和大小跟原圖完全一樣，就像裡面的人隱形了。帽兜領口保持開口，露出脖子的位置。其他東西（頭、頭髮、臉、內袍、手、靴子、側背包）全部移除，換成純白。不要移動、縮放或重新設計外袍，形狀、皺褶、位置都要跟原圖一致。
2. 脫掉外袍：以這張女旅人定裝圖為底，保持同樣的姿勢、臉、頭髮、比例、構圖和純白背景，只改一件事：把紫色外袍和側背包完全拿掉，讓她只穿沙色內袍（有自己的長袖和細腰帶）和靴子站著。其他都不變。
3. 只畫頭：以這張女旅人定裝圖為底，輸出同一張畫布、同樣構圖、純白背景，只保留她的頭、臉、頭髮和脖子，位置和大小跟原圖完全一樣。肩膀以下全部移除換成純白。不要重新設計臉和髮型。
4. B 法姿勢：舉燈（右手舉小銅油燈到肩高、左手垂下、身不轉頭不歪）；低頭（雙手胸前交握、頭微低、閉眼）；閉眼版（跟站姿定裝完全一樣只閉眼）。
