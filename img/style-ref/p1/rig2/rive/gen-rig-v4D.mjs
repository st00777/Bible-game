// 骨架 v1 場景產生器：把 img/style-ref/p1/rig2 的零件組成 rive-mcp 的 SceneSpec
// 母圖座標 460x768 = artboard 座標；root 在骨盆 (230,340)
import { readFileSync, writeFileSync } from "node:fs";
const PARTS = "/private/tmp/claude-501/-Users-aitest-bible-work-Bible-game/9e741e36-d5a6-48b9-93d7-94ef9d4d89d8/scratchpad/rive/parts2/q";
const meta = JSON.parse(readFileSync("/Users/aitest/bible-work/Bible-game/img/style-ref/p1/rig2/parts.json", "utf8"));
const ARM = JSON.parse(process.env.ARM_BBOX || "null"); // {x,y,w,h}
const PARTS2 = "/private/tmp/claude-501/-Users-aitest-bible-work-Bible-game/9e741e36-d5a6-48b9-93d7-94ef9d4d89d8/scratchpad/rive/parts2";

// ---- 關節（母圖座標，來自 SKILL.md 契約）----
const J = {
  hips: [230, 340], neck: [230, 205],
  shL: [172, 222], elL: [142, 320], haL: [125, 470],
  shR: [288, 222], elR: [318, 320], haR: [335, 470],
};
const deg = (r) => (r * 180) / Math.PI, rad = (d) => (d * Math.PI) / 180;
const ang = (a, b) => deg(Math.atan2(b[1] - a[1], b[0] - a[0]));
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// 2D 剛體變換：{x,y,rot}，local→world
const compose = (p, c) => ({
  x: p.x + c.x * Math.cos(rad(p.rot)) - c.y * Math.sin(rad(p.rot)),
  y: p.y + c.x * Math.sin(rad(p.rot)) + c.y * Math.cos(rad(p.rot)),
  rot: p.rot + c.rot,
});
const toLocal = (frame, wx, wy) => {
  const dx = wx - frame.x, dy = wy - frame.y, c = Math.cos(rad(-frame.rot)), s = Math.sin(rad(-frame.rot));
  return { x: dx * c - dy * s, y: dx * s + dy * c };
};

// ---- 骨架 ----
const root = { x: J.hips[0], y: J.hips[1], rot: 0 };
const world = { root };
const groups = [{ id: "root", x: root.x, y: root.y }];
const bones = [];
function rootBone(id, parentGroup, from, to) {
  const pf = world[parentGroup];
  const l = toLocal(pf, from[0], from[1]);
  const rot = ang(from, to) - pf.rot;
  bones.push({ id, parent: parentGroup, x: l.x, y: l.y, rotation: rot, length: dist(from, to) });
  world[id] = { x: from[0], y: from[1], rot: ang(from, to) };
  world[id + "#tip"] = { x: to[0], y: to[1], rot: ang(from, to) };
}
function childBone(id, parentBone, to) {
  const tip = world[parentBone + "#tip"];
  const from = [tip.x, tip.y];
  const rot = ang(from, to) - tip.rot;
  bones.push({ id, parent: parentBone, rotation: rot, length: dist(from, to) });
  world[id] = { x: from[0], y: from[1], rot: ang(from, to) };
  world[id + "#tip"] = { x: to[0], y: to[1], rot: ang(from, to) };
}
function groupUnder(id, parentId, wx, wy) {
  const pf = world[parentId];
  const l = toLocal(pf, wx, wy);
  groups.push({ id, x: l.x, y: l.y, parent: parentId });
  world[id] = { x: wx, y: wy, rot: pf.rot };
}

rootBone("bone_torso", "root", J.hips, J.neck);
childBone("bone_neck", "bone_torso", [J.neck[0], J.neck[1] - 60]);
childBone("bone_clav_L", "bone_torso", J.shL);
childBone("bone_uarm_L", "bone_clav_L", J.elL);
childBone("bone_farm_L", "bone_uarm_L", J.haL);
rootBone("bone_uarm_R", "root", J.shR, J.elR); // 實驗 B：右臂獨立 RootBone 鏈
childBone("bone_farm_R", "bone_uarm_R", J.haR);
const boneRot = (id) => bones.find((b) => b.id === id).rotation;

// 外袍 Solo：上片跟 torso、下片跟 root，各自一個 solo 群組，三色子群組
groupUnder("soloU", "bone_torso", J.neck[0], J.neck[1]);
groupUnder("soloL", "root", J.hips[0], J.hips[1]);
groups.find((g) => g.id === "soloU").solo = true;
groups.find((g) => g.id === "soloL").solo = true;
for (const c of ["purple", "oat", "blue", "none"]) {
  groupUnder(`cloakU_${c}`, "soloU", J.neck[0], J.neck[1]);
  groupUnder(`cloakL_${c}`, "soloL", J.hips[0], J.hips[1]);
}
groups.find((g) => g.id === "soloU").active = "cloakU_purple";
groups.find((g) => g.id === "soloL").active = "cloakL_purple";

// ---- 圖片：每件掛到骨頭／群組，位置換算成該座標系 ----
const images = [];
function img(name, parent, z) {
  const m = meta[name];
  const cx = m.x + m.w / 2, cy = m.y + m.h / 2;
  const pf = world[parent];
  const l = toLocal(pf, cx, cy);
  images.push({ id: `img_${name.replace("-", "_")}`, pngPath: `${PARTS}/${name}.png`, x: l.x, y: l.y, rotation: -pf.rot, parent, z });
}
// 畫序（契約）：靴 → 裙 → 外袍下片 → 上身 → 上臂 → 前臂 → 外袍上片 → 帽兜後片 → 頭
img("bootL", "root", 10); img("bootR", "root", 11);
img("skirt", "root", 20);
for (const c of ["purple", "oat", "blue"]) img(`cloakL-${c}`, `cloakL_${c}`, 30);
img("torso", "bone_torso", 40);
img("uarmL", "bone_uarm_L", 50);
img("farmL", "bone_farm_L", 60);
// 右臂：Solo 兩份同一張網格圖，z 一份在外袍上片之下、一份之上；Lift 內切 soloActive 模擬 Draw Rule
groupUnder("armSolo", "root", J.hips[0], J.hips[1]);
groups.find((g) => g.id === "armSolo").solo = true;
groupUnder("armBack", "armSolo", J.hips[0], J.hips[1]);
groupUnder("armFront", "armSolo", J.hips[0], J.hips[1]);
groups.find((g) => g.id === "armSolo").active = "armBack";
{
  const l = toLocal(world.root, ARM.x + ARM.w / 2, ARM.y + ARM.h / 2);
  for (const [gid, z] of [["armBack", 61], ["armFront", 85]])
    images.push({ id: `img_armR_${gid}`, pngPath: `${PARTS2}/q/armR.png`, x: l.x, y: l.y, parent: gid, z,
      mesh: { columns: 4, rows: 14, bones: ["bone_uarm_R", "bone_farm_R"] } });
}
for (const c of ["purple", "oat", "blue"]) { img(`cloakU-${c}`, `cloakU_${c}`, 70); img(`hoodback-${c}`, `cloakU_${c}`, 80); }
img("head", "bone_neck", 90);

// ---- 動畫 ----
const K = (frames) => frames.map(([frame, value, easing]) => (easing ? { frame, value, easing } : { frame, value }));
const idle = {
  name: "Idle", fps: 60, duration: 240, loop: "loop",
  tracks: [
    { target: "root", property: "y", keyframes: K([[0, root.y], [120, root.y - 3, "ease-in-out"], [240, root.y, "ease-in-out"]]) },
    { target: "bone_torso", property: "rotation", keyframes: K([[0, bones[0].rotation], [120, bones[0].rotation - 1.2, "ease-in-out"], [240, bones[0].rotation, "ease-in-out"]]) },
    { target: "bone_neck", property: "rotation", keyframes: K([[0, 0], [60, 1.5, "ease-in-out"], [180, -1.5, "ease-in-out"], [240, 0, "ease-in-out"]]) },
    { target: "bone_uarm_L", property: "rotation", keyframes: K([[0, boneRot("bone_uarm_L")], [120, boneRot("bone_uarm_L") + 2, "ease-in-out"], [240, boneRot("bone_uarm_L"), "ease-in-out"]]) },
    { target: "bone_uarm_R", property: "rotation", keyframes: K([[0, boneRot("bone_uarm_R")], [120, boneRot("bone_uarm_R") - 2, "ease-in-out"], [240, boneRot("bone_uarm_R"), "ease-in-out"]]) },
  ],
};
// 舉右手：上臂從垂下轉到斜上（約 -150°），前臂再往上折
const uR = boneRot("bone_uarm_R");
const fR = bones.find((b) => b.id === "bone_farm_R").rotation;
const lift = {
  name: "Lift", fps: 60, duration: 100, loop: "oneShot",
  tracks: [
    { target: "bone_uarm_R", property: "rotation", keyframes: K([[0, uR], [22, uR - 118, "ease-out-back"], [70, uR - 118, "hold"], [100, uR, "ease-in-out"]]) },
    { target: "bone_farm_R", property: "rotation", keyframes: K([[0, fR], [22, fR - 6, "ease-out"], [70, fR - 6, "hold"], [100, fR, "ease-in-out"]]) },
    { target: "bone_torso", property: "rotation", keyframes: K([[0, bones[0].rotation], [22, bones[0].rotation + 3, "ease-out"], [70, bones[0].rotation + 3, "hold"], [100, bones[0].rotation, "ease-in-out"]]) },
    { target: "armSolo", property: "soloActive", keyframes: [{ frame: 0, ref: "armBack", easing: "hold" }, { frame: 8, ref: "armFront", easing: "hold" }, { frame: 92, ref: "armBack", easing: "hold" }] },
  ],
};
const cloakAnim = (c) => ({
  name: `Cloak${c[0].toUpperCase()}${c.slice(1)}`, fps: 60, duration: 2, loop: "loop",
  tracks: [
    { target: "soloU", property: "soloActive", keyframes: [{ frame: 0, ref: `cloakU_${c}`, easing: "hold" }] },
    { target: "soloL", property: "soloActive", keyframes: [{ frame: 0, ref: `cloakL_${c}`, easing: "hold" }] },
  ],
});

const scene = {
  artboard: { name: "Traveler", width: 460, height: 768 },
  backgroundColor: "#00000000",
  groups, bones, images,
  animations: [idle, lift, cloakAnim("purple"), cloakAnim("oat"), cloakAnim("blue"), cloakAnim("none")],
  stateMachine: {
    name: "SM",
    inputs: [{ name: "lift", type: "trigger" }, { name: "cloak", type: "number", initial: 0 }],
    layers: [
      { name: "Body", states: [{ name: "Idle", animation: "Idle" }, { name: "Lift", animation: "Lift" }],
        transitions: [
          { from: "entry", to: "Idle" },
          { from: "Idle", to: "Lift", condition: { input: "lift" }, durationMs: 120 },
          { from: "Lift", to: "Idle", exitTimeMs: 1600, durationMs: 200 },
        ] },
      { name: "Cloak", states: [{ name: "P", animation: "CloakPurple" }, { name: "O", animation: "CloakOat" }, { name: "B", animation: "CloakBlue" }, { name: "N", animation: "CloakNone" }],
        transitions: [
          { from: "entry", to: "P" },
          { from: "P", to: "O", condition: { input: "cloak", op: "==", value: 1 } }, { from: "P", to: "B", condition: { input: "cloak", op: "==", value: 2 } },
          { from: "O", to: "P", condition: { input: "cloak", op: "==", value: 0 } }, { from: "O", to: "B", condition: { input: "cloak", op: "==", value: 2 } },
          { from: "B", to: "P", condition: { input: "cloak", op: "==", value: 0 } }, { from: "B", to: "O", condition: { input: "cloak", op: "==", value: 1 } },
          { from: "P", to: "N", condition: { input: "cloak", op: "==", value: 3 } }, { from: "O", to: "N", condition: { input: "cloak", op: "==", value: 3 } }, { from: "B", to: "N", condition: { input: "cloak", op: "==", value: 3 } },
          { from: "N", to: "P", condition: { input: "cloak", op: "==", value: 0 } }, { from: "N", to: "O", condition: { input: "cloak", op: "==", value: 1 } }, { from: "N", to: "B", condition: { input: "cloak", op: "==", value: 2 } },
        ] },
    ],
  },
};
const out = process.argv[2] ?? "rig-v4D.scene.json";
writeFileSync(out, JSON.stringify(scene, null, 1));
writeFileSync("rig-v4D.args.json", JSON.stringify({ scene, outPath: `${process.cwd()}/traveler-v4D.riv`, previewTime: 0 }));
console.log("bones:", bones.map((b) => `${b.id}(${b.rotation.toFixed(1)}°,${b.length.toFixed(0)})`).join(" "));
console.log("images:", images.length, "groups:", groups.length, "->", out);
