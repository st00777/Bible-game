// 坐姿骨架 v1（路 D 試做）：六件剛體零件＋眼皮片；呼吸循環＋眨眼觸發
// artboard 700x1050 = work/reassembled-v2.png 的座標
import { writeFileSync } from "node:fs";
const P = `${process.cwd()}/parts-q`;
// 零件左上角與尺寸（疊圖 v2）
const L = {
  sit_cape_back: { x: 250, y: 330, w: 267, h: 472 },
  sit_lower:     { x: 80,  y: 560, w: 352, h: 432 },
  sit_torso_cape:{ x: 140, y: 330, w: 293, h: 345 },
  sit_arm_near:  { x: 10,  y: 400, w: 244, h: 281 },
  sit_head:      { x: 190, y: 170, w: 137, h: 191 },
  sit_hair:      { x: 160, y: 140, w: 212, h: 188 },
  sit_lid:       { x: 195, y: 256, w: 72,  h: 30 },
};
const J = { hips: [286, 635], neck: [290, 345], headTop: [290, 285] };
const deg = (r) => (r * 180) / Math.PI, rad = (d) => (d * Math.PI) / 180;
const ang = (a, b) => deg(Math.atan2(b[1] - a[1], b[0] - a[0]));
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const toLocal = (f, wx, wy) => { const dx = wx - f.x, dy = wy - f.y, c = Math.cos(rad(-f.rot)), s = Math.sin(rad(-f.rot)); return { x: dx * c - dy * s, y: dx * s + dy * c }; };
const world = { root: { x: J.hips[0], y: J.hips[1], rot: 0 } };
const groups = [{ id: "root", x: J.hips[0], y: J.hips[1] }];
const bones = [];
function rootBone(id, parent, from, to) { const pf = world[parent]; const l = toLocal(pf, from[0], from[1]); bones.push({ id, parent, x: l.x, y: l.y, rotation: ang(from, to) - pf.rot, length: dist(from, to) }); world[id] = { x: from[0], y: from[1], rot: ang(from, to) }; world[id + "#tip"] = { x: to[0], y: to[1], rot: ang(from, to) }; }
function childBone(id, parent, to) { const t = world[parent + "#tip"]; const from = [t.x, t.y]; bones.push({ id, parent, rotation: ang(from, to) - t.rot, length: dist(from, to) }); world[id] = { x: from[0], y: from[1], rot: ang(from, to) }; world[id + "#tip"] = { x: to[0], y: to[1], rot: ang(from, to) }; }
rootBone("bone_torso", "root", J.hips, J.neck);
childBone("bone_neck", "bone_torso", J.headTop);
const images = [];
function img(name, parent, z, extra = {}) { const m = L[name]; const pf = world[parent]; const l = toLocal(pf, m.x + m.w / 2, m.y + m.h / 2); images.push({ id: `img_${name}`, pngPath: `${P}/${name}.png`, x: l.x, y: l.y, rotation: -pf.rot, parent, z, ...extra }); }
// 畫序：披風後片 → 下身 → 上身 → 手臂 → 頭 → 眼皮 → 髮
img("sit_cape_back", "bone_torso", 10);
img("sit_lower", "root", 20);
img("sit_torso_cape", "bone_torso", 30);
img("sit_arm_near", "bone_torso", 40);
img("sit_head", "bone_neck", 50);
img("sit_lid", "bone_neck", 60, { opacity: 0 });
img("sit_hair", "bone_neck", 70);
const K = (fr) => fr.map(([frame, value, easing]) => (easing ? { frame, value, easing } : { frame, value }));
const tR = bones[0].rotation, nR = bones[1].rotation;
const torsoL = { x: bones[0].x, y: bones[0].y };
// 呼吸 4 秒：上身上抬 3px、微後仰 0.8°、頭微點 0.6°、披風後片慢晃
const breathe = { name: "Breathe", fps: 60, duration: 240, loop: "loop", tracks: [
  { target: "bone_torso", property: "y", keyframes: K([[0, torsoL.y], [110, torsoL.y - 3, "ease-in-out"], [240, torsoL.y, "ease-in-out"]]) },
  { target: "bone_torso", property: "rotation", keyframes: K([[0, tR], [110, tR + 0.8, "ease-in-out"], [240, tR, "ease-in-out"]]) },
  { target: "bone_neck", property: "rotation", keyframes: K([[0, nR], [110, nR - 0.6, "ease-in-out"], [240, nR, "ease-in-out"]]) },
  { target: "img_sit_cape_back", property: "rotation", keyframes: K([[0, -tR - 0.3], [120, -tR + 0.3, "ease-in-out"], [240, -tR - 0.3, "ease-in-out"]]) },
] };
const lidOpen = { name: "LidOpen", fps: 60, duration: 2, loop: "loop", tracks: [{ target: "img_sit_lid", property: "opacity", keyframes: K([[0, 1]]) }] };
const blink = { name: "Blink", fps: 60, duration: 14, loop: "oneShot", tracks: [{ target: "img_sit_lid", property: "opacity", keyframes: K([[0, 0], [4, 1, "ease-out"], [8, 1, "hold"], [13, 0, "ease-in"]]) }] };
const scene = {
  artboard: { name: "CharacterSit", width: 700, height: 1050 }, backgroundColor: "#00000000",
  groups, bones, images, animations: [breathe, lidOpen, blink],
  stateMachine: { name: "SM", inputs: [{ name: "blink", type: "trigger" }], layers: [
    { name: "Body", states: [{ name: "Breathe", animation: "Breathe" }], transitions: [{ from: "entry", to: "Breathe" }] },
    { name: "Face", states: [{ name: "Open", animation: "LidOpen" }, { name: "Blink", animation: "Blink" }], transitions: [
      { from: "entry", to: "Open" }, { from: "Open", to: "Blink", condition: { input: "blink" }, durationMs: 0 }, { from: "Blink", to: "Open", exitTimeMs: 230, durationMs: 0 } ] },
  ] },
};
writeFileSync("sit-lidtest.scene.json", JSON.stringify(scene, null, 1));
writeFileSync("sit-lidtest.args.json", JSON.stringify({ scene, outPath: `${process.cwd()}/sit-lidtest.riv`, previewTime: 0 }));
console.log("bones:", bones.map((b) => `${b.id}(${b.rotation.toFixed(1)}°,${b.length.toFixed(0)})`).join(" "), "images:", images.length);
