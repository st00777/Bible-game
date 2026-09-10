# p2 · Rive rig sheet 提示詞（2026-09-07，James 提供範本改寫）

附圖：traveler-anchor-chatgpt.jpg ＋ p0/originals/p0-1-modelsheet.jpg；比例 16:9；Gemini 對話「Gouache Character Rig Sheet Generation」

```
[STYLE]
Soft gouache and colored-pencil children's-book illustration, matte paper grain visible. Muted, low-saturation warm palette. Characters and props have a thin, EVEN, hand-drawn outline in warm dark brown (#5A4632), about 2px at 1000px width - never black, never variable-width ink, never comic linework. Flat gentle shading: one soft darker tone per colour. No cel-shade hard edges, no airbrush gradients, no rim light, no specular highlights. Face is minimal and calm: two small dark-brown oval eyes, NO nose, one short gentle smile line, two soft round pink cheek blushes. No eyelashes, no eye sparkle, no teeth, no thick eyebrows. Palette: lavender-purple #8E82AE (shadow #6F6489), cream robe #E8DCBE, leather tan #A67C52, dark brown #5A4632, sage green #A9BE8E. Proportions: gently stylised adult, about 6.5 head-heights. NOT chibi. No text, no lettering, no logo, no UI.

[CONTENT]
A 2D character RIG SHEET of the SAME traveller from the reference images (short brown bob hair, calm face, cream long tunic with a dark brown leather belt, dark brown boots), designed for skeleton rigging in Rive. Pure flat white background #FFFFFF, nothing else.
Layout: an exploded parts sheet. On the LEFT third, the full figure standing in a clean front-facing A-POSE (arms straight, held out at about 40 degrees from the body, palms facing the viewer, feet slightly apart) for reference. On the RIGHT two thirds, every body part laid out separately in a neat grid, each part fully isolated with generous white space - the parts must NOT overlap or touch each other.
Parts, all drawn front-facing at the same scale as the reference figure:
- Head with face only (no hair). Hair in two separate pieces: front hair and back hair. Eye set: open eyes, closed eyes. Mouth: gentle smile.
- Torso: the tunic body from neck to hips WITHOUT arms and WITHOUT the skirt. Belt included.
- Lower tunic / skirt from belt to hem, separate.
- Left and right UPPER arms (shoulder to elbow, cream sleeve), left and right LOWER arms (elbow to wrist, cream sleeve), separate. Hands separate: open hand, closed fist, hand holding a small wooden staff grip.
- Left and right upper legs (thigh, hidden under tunic so drawn as plain cream), left and right lower legs, left and right boots, separate.
- Cloak set in lavender-purple #8E82AE, separate from the body: hood (back piece), cloak shoulder piece, cloak lower piece, and cloak SLEEVES (upper and lower, left and right) so the cloak can dress the arms.
Every joint end (shoulders, elbows, wrists, hips, knees, ankles, neck) is drawn as a rounded, slightly over-extended capsule end so parts can overlap and rotate without gaps when rigged.
Even, shadowless studio light. No ground line, no cast shadow, no colour swatches, no labels, no arrows.

[NEGATIVE]
text, lettering, labels, numbers, arrows, watermark, logo, UI, anime big eyes, chibi proportions, thick black ink outline, cel shading, glossy 3D render, photorealism, drop shadow, saturated colours, overlapping parts, parts touching, background scenery, extra characters
```

第 1 張結果：originals/p2-1-rigsheet.jpg。

## 第 2 張：身體零件方格版（2026-09-08，同對話續生）
```
Make a NEW rig sheet of the SAME traveller, same gouache style, same outfit, same face. This time show BODY PARTS ONLY (no cloak, no cloak pieces). Pure flat white background #FFFFFF. LAYOUT RULE (most important): arrange every part on an invisible uniform GRID of equal square cells, 6 columns x 3 rows across the whole 16:9 canvas. Exactly ONE part per cell, centred in its cell, with wide empty white margin all around it; the gap between any two neighbouring parts must be at least the width of a hand. No part may extend into a neighbouring cell. No part touches or overlaps another. Draw every part LARGE - each part should fill about 70% of its cell. Parts, all front-facing, all at the same relative scale to each other: row 1: head with face but NO hair; front hair (fringe) alone; back hair alone; eyes open pair; eyes closed pair; mouth gentle smile. Row 2: torso (tunic body from neck to hips, no arms, no skirt, belt included); skirt (lower tunic from belt to hem); left upper arm; left lower arm; right upper arm; right lower arm. Row 3: open hand; closed fist; hand holding a wooden staff grip; left leg (thigh and calf as one plain cream piece); right leg; pair of boots side by side. Every joint end (neck, shoulders, elbows, wrists, hips, ankles) drawn as a rounded, slightly over-extended capsule end. No reference figure this time. No text, no labels, no numbers, no arrows, no grid lines, no ground line, no shadows, no colour swatches, no watermark.
```
結果：originals/p2-2-bodygrid.jpg，6×3 格一格一件；Gemini 仍畫了格線（反而方便切）。切件在 cut2/。
