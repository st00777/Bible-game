# 坐姿骨架 v1（路 D 試做，2026-09-10）
- `gen-sit-v1.mjs` → `sit-v1.scene.json`／`sit-v1.args.json` → `node ../../p1/rig2/rive/rmcp.mjs riv_create sit-v1.args.json out` → `sit-v1.riv`（143 KB，6 張 PNG8；同日晚拿掉獨立手臂）。
- 結構：artboard `CharacterSit` 700×1050；root 在臀 (286,635)；`bone_torso`→`bone_neck`；五件全剛體掛骨（無網格）。**James 2026-09-10 回饋：獨立手臂疊在披風上像衣服破洞、手位置詭異** → 試做版手臂藏披風下；正式版拆法改為「前臂＋手烤進下身圖」，見 p3-prompt.md 重生版；眼皮 `img_sit_lid` 膚色圓角片 opacity 0。
- 動畫：`Breathe` 4 秒循環（上身 y −3px、旋轉 +0.8°、頭 −0.6°、披風後片 ±0.3°）；`Blink` 14 幀 opacity 0→1→0，SM 輸入 `blink`(trigger)，Open→Blink 過渡 **50ms（0ms 不會觸發）**。
- 驗證：`node browser-run.mjs sit-v1.riv shots`（rest／inhale／blink）、`node blink-burst.mjs sit-v1.riv shots-burst`（觸發後 40/100/160/260ms 連拍）。結果：呼吸有（rest vs inhale 均差 1.1%）、腰帶接縫不露白、眨眼 40ms 閉 160ms 開。
- 手機驗證頁：`sit-phone-test.tpl.html`（`__B64__` 換 .riv base64）→ Artifact https://claude.ai/code/artifact/cd87938d-26a6-4a64-aae0-a196decfec28
- 換正式素材：零件檔名不變、改 `gen-sit-v1.mjs` 的 `L` 座標表與 `J` 關節即可。
