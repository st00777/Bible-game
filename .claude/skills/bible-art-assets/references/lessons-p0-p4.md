# p0–p4 舊素材批的教訓（純文字保留版）
> 2026-09-21 依 `docs/art-asset-plan-2026-09-16.md` 第六節刪除 `img/style-ref/`（p0–p4、三張 traveler-* 錨圖、p0-prompt-pack.md，約 66 MB）。
> 圖檔與腳本在 git 歷史 `559553d` 之前仍可找回（`git show 559553d:img/style-ref/p4/p4-prompt.md`）。這裡只留下次還會用到的文字：James 的原始 STYLE 提示詞，與三條已否決的切件路線。
> 2026-09-16 James 決定美術歸零：角色定位、畫風、構圖全部重來。下面第 1 節的提示詞是「上一輪」的風格錨，新一輪要不要沿用由 James 決定，不當前提。

---

## 1. 上一輪風格錨原始提示詞（James 2026-09-05/06 在 ChatGPT 寫的）

> 舊 p0-prompt-pack 是 Gemini 版，把臉寫成豆豆眼＋無鼻，已作廢。

```
[STYLE - keep verbatim every time]
Warm gouache storybook illustration. Opaque, slightly textured paint with visible brush grain. Every shape outlined with a uniform 2px warm dark-brown line (#5A4636). Soft golden hour light from upper-left at 30 degrees. Muted warm palette: sand, cream, moss green, dusty purple, terracotta. Low contrast, gentle shadows, no harsh black. Character proportion is 4.5 heads tall - a small adult, NOT a chibi. Face is simple and calm: small eyes, no exaggerated features, gentle expression. Three-quarter front view, eye-level camera. Ghibli-adjacent warmth, Spiritfarer-adjacent tenderness, Sky-adjacent silhouette clarity.

[CONTENT]
A lone traveler stands on a winding dirt path at the edge of a quiet hillside at dawn. The traveler wears a long hooded cloak in dusty purple with a simple sand-colored inner robe, holds a small brass oil lamp that glows faintly, and carries a worn leather satchel. A small round companion creature - a cream-colored fox-like animal - sits at the traveler's feet, looking in the same direction. Behind them, the path recedes over gentle hills toward distant soft mountains, with a few small campfire markers along the way. Warm sky, scattered soft clouds. The mood is calm, hopeful, and quietly adventurous - the start of a long journey, not a battle. Vertical composition suited to a 420px-wide phone screen.

[NEGATIVE]
No text, no letters, no logos, no UI elements. No weapons, no swords, no armor. No chibi or 2-head proportions. No anime big sparkling eyes. No neon or saturated primary colors. No photorealism, no 3D render, no plastic shine. No religious iconography (no crosses, halos, angels). No gender-coded styling (no skirts/heels, no muscular armor). No busy background clutter. No harsh black outlines or heavy cel-shading.
```

觀察：提示詞寫 4.5 頭身，ChatGPT 實際畫出約 5.5–6 頭身；臉只寫「小眼睛、不誇張、溫和」，ChatGPT 自己畫出眼白＋虹膜＋小鼻。→ 數字與極簡描述影響有限，**同一對話續生**才是保住臉與比例的關鍵。

---

## 2. 三條已否決的切件路線（2026-09-12，不要再提）

### 2a. 方格零件法（p2 標準：6×3 方格一格一件）
- 一格一件生出來的是「木偶零件」：頭髮尺寸與身體不搭、裙長只到小腿、袖子是獨立布袋、關節圓頭外露；每件各畫各的，風格與比例互飄。
- James 看提示詞就說「光看就覺得拼起來一定醜」，實拼十分鐘證實。方格只留給小配件（閉眼、嘴、握燈／握杖的手）。

### 2b. 從定裝照直接切（分層底片）
- 原理：可見層從定裝圖切，被遮層從「同圖拿掉外袍」的底片切。
- **James 否決**：第一版（p1）就是這樣切出來的，醜。切在重疊邊界上、零件邊緣不像。

### 2c. 同位分層（A 法：請 ChatGPT 只畫外袍、其他留白）
- A-1（同對話只畫外袍）：位置與尺寸偏差小（肩線約 2–3%），**但形狀是重畫的**：前襟開一道縫（定裝圖是閉合的）、袖型與長度不同、帽兜形狀不同。
- A-2（在定裝圖上用「編輯」要求保留像素只擦掉其他）：結果與 A-1 幾乎相同，仍是重畫。
- 結論：**ChatGPT 不會保留原像素，同位分層不可行。**

### 2d. 當時剩下的 B 法（未拍板，美術歸零後一併重議）
- 整張換姿勢不綁骨：站／舉燈／低頭各一張完整圖＋閉眼一張，Rive 只做淡入淡出＋眨眼＋呼吸（p3 坐姿試做已驗證機械面可行）。
- James 自己試的中文提示詞方向：只畫外袍（領口開口露脖子）、脫掉外袍、只畫頭、B 法三姿勢。ChatGPT 對「保留原圖、只改一件事」的指令一律重畫，見 2c。

---

## 3. 路 D（rive-mcp）工具鏈的位置
- 產生器與 .riv 原在 `img/style-ref/p1/rig2/rive/`（骨架 v4／v4D）與 `img/style-ref/p3/rive/`（坐姿 sit-v1），已隨目錄刪除；需要時 `git show 559553d:img/style-ref/p3/rive/gen-sit-v1.mjs`。
- 工具本體 `~/bible-work/tools/rive-mcp` 在 repo 外，未動。
- 結論仍在 `.claude/skills/rive-rigging/SKILL.md` 第 8 節（直臂可做、彎關節權重塌陷要編輯器）。
