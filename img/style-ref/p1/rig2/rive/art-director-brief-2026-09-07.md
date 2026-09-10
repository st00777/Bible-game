# art-director 評估：Rive 前提下的角色／裝備／動畫設計（2026-09-07）
> 待 James 拍板三題；拍板後正式版寫進 ADR 或 rive-rigging SKILL.md 第 2 節契約。

## 結論
1. 「四部位＋稱號」語意層合理可留；底層裝備切件規則跟不上骨架動畫，A、B 兩個回饋都是「裝備契約沒對齊骨架」的症狀。
2. 最該改：「衣服」槽重新定義成「整組皮膚（含手臂）」，不能再是一件斗篷疊在共用手臂圖上。
3. 路線：路 D 先收斂直臂動畫集一版給 James 看；同時現在就問要不要訂 Cadet（彎肘動作已被路 D 證偽）。

## 裁定
- A 側傾：次要動作原則對，實作錯。業界做局部（舉手側肩線抬 <1°＋對側髖反向），放獨立 torso 骨，不塞進舉手 timeline。先拿掉。
- B 露袖：錯，契約缺袖子層。正解：①每色外袍整組含手臂皮膚一起換；②外袍改無袖披風。

## 業界對照
- Rive Solo 換裝 https://rive.app/docs/editor/manipulating-shapes/solos
- Rive Data Binding Enum https://rive.app/docs/editor/data-binding/enums
- Rive Runtime Asset Swapping https://rive.app/docs/game-runtimes/unity/runtime-asset-swapping
- Rive Bones／Meshes https://rive.app/docs/editor/manipulating-shapes/bones 、https://rive.app/docs/editor/manipulating-shapes/meshes
- Spine Skins http://esotericsoftware.com/spine-skins（本輪未重新查證連結）
共同結論：要嘛整組換皮含手臂，要嘛部位設計成不需跟色；沒有「只換軀幹、手臂共用」。

## 調整方案
- 骨架分件維持契約；手肘第一批不真彎（路 D 自動權重 >15° 塌）。
- 衣服槽＝hoodback+upper+lower＋手臂皮膚。整組換色每色多 2–4 張（左右鏡射省半），3 色 9→15–21 張，成本 +30–50%；無袖披風 0 張新增。頭飾／手持／背景剛體換圖不變；稱號純 UI。
- 動畫集：Idle、Lift（拿掉側傾）、Bow＝直臂可做；Celebrate 雙手直舉可做、拍手合十要編輯器；Walk、Sit 必須編輯器（坐姿另缺分層素材）。
- 舊裝備 424 件進舊物袋：純陳列、不轉譯、不清空；UI／資料結構另定機制。
- 男女：同一套骨架＋兩組皮膚，關節座標共用，新增 genderSkin Enum；不要換頭換體型。
- 生產順序：①解 B（選方向出圖）②拿掉 A，出 Idle+Lift+Bow 直臂天花板版 ③James 看完決定訂不訂 Cadet ④女生皮膚等方向定了再做。
- 三原則檢核：出席驅動✅ 雙層節奏✅（日常無袖輕量款＋里程碑長袖重款）累計不歸零✅。

## 反對意見
成本（每色 +2–4 張、男女雙套）、風格一致性（換裝矩陣拼裝感）、審稿瓶頸（James 一人）。最小可行：一種性別、麥色基礎款、拿掉側傾、無袖披風、Idle+Lift+Bow。

## 給 James 的三題（附建議）
1. 外袍長袖整組換色 vs 無袖披風？建議：日常輕量款先無袖驗整體，長袍留給里程碑稀有裝備。
2. 現在訂 Cadet 還是先做完直臂集？建議：現在訂，天花板已證實。
3. 男女雙線 vs 先一種性別跑完？建議：先一種。
