# 經文互動試驗規格（排序／配對題型）

- 日期：2026-10-11
- 狀態：草案，待小居反方（Codex）＋ James 拍板；拍板後才動 app.js／content.js
- 定案出處：James 2026-10-11 拍板（本文件即紀錄；對話在 CC 會話，repo 內無其他正本）。相關：ADR 0001（重新點燃、乏味診斷）、ADR 0005（四格立場配額）、`docs/content-format.md` §「章節類型 type」、`docs/research-content-variety.md`、`docs/research-bible-games.md`（PR #173）、`design-principles.md` 紅線 2／4／7。

## 一、要解決什麼

ADR 0001 的乏味診斷：流程可預期＋內容同質＋進度失去意義。情境題四格立場已輪換過（ADR 0005）、一句式／回顧章／節點章也上線了（content-format.md 第 65-86 行），但每一章「看場景→選一格→看回饋」的動作本身沒變過。

這次只動一格：**用「經文互動」取代情境題那一格**，其他全部不動。目標是「讓玩家多注意到經文裡的一件事」，不是「逼人讀過」、不是測驗（小居 10/11 修正，James 接受）。

## 二、不做什麼（邊界）

- 不併第二款遊戲、不做關卡、不計時、不計分、不記對錯、不排名（紅線 4、9）。
- 默想不動、AI 回應不動、獎勵數值與領取流程不動、streak 規則不動。
- 不加每日任務、不做知識問答（James 2026-10-03 錨點）。
- 對玩家不出現「測驗」「關卡」「答對」字樣；對團隊包裝為 type 機制的第三、四種。
- 已上線且排程已過的章不回頭改（沒人會再看到）。

## 三、玩家流程（取代情境題那一格）

```
今日章節 → 導讀 → 金句 → 【經文互動】 → 默想（選做）→ 完成領裝備
                                  ├ 排序：把 4-6 幕按經文順序排好
                                  └ 配對：把 2-4 組線索連起來
                 隨時可：看經文（既有 bible-link）／看提示（一則）／先跳過
```

1. 區塊標題不叫「今日情境」，叫 **「📜 經文裡的一幕」**（排序）或 **「🔗 經文裡的線索」**（配對）。
2. **排序**：卡片以固定亂序呈現（同一章所有玩家看到同一個亂序，用章節 key 當種子，方便測玩與訪談對話）。玩家依序點卡片，點到的卡片移到「我的順序」列；再點一次放回。全部放完出現「這樣排」鈕。
3. **配對**：左欄線索、右欄線索各一列；點左再點右成一組，點已配好的組可拆開。全部配完出現「這樣連」鈕。
4. 按下後顯示**經文對照**：每一幕旁邊附節數（例「14:13」），玩家自己對。不打勾、不打叉、不算幾個對。接著顯示 `doneText`（一段像朋友說話的回饋，寫法同情境題回應第 4、5 條：落在經文的觀察上，最後留一個小步）。
5. **「先跳過」**永遠可按（紅線 7）：顯示 `skipText`（不責備、一句話帶過），一樣進入可完成狀態。
6. **「看提示」**一則，按了就展開，不扣任何東西。
7. 完成互動或跳過後，「完成今日靈修」鈕解鎖，行為與現在二次確認情境題後完全相同。
8. 已完成的章重看：直接顯示經文對照＋ doneText／skipText，不再讓玩家操作（同現在情境題 done 狀態）。

手機操作只用「點」，不做拖曳（iOS 捲動鎖與拖曳衝突，見 `docs/playtest-checklist.md` 2026-09-19 教訓）。

## 四、內容格式（content.js）

**建議用獨立欄位 `interact`，不佔用 `type`。** 原因：EXO14 已經是 `type:'node'`（content.js 第 9393 行），節點章與互動題應能並存；`type` 維持「章的節奏身分」（節點／回顧），`interact` 是「情境題那一格長什麼樣」。對團隊仍可稱「第三、四種 type」。→ 開放問題 1。

```javascript
// 排序題：items 依「經文正確順序」寫；程式端負責亂序。3-6 幕，每幕 ≤ 22 字，ref 必填（本章節數）。
interact: {
  kind: 'order',
  prompt: '那一夜海邊發生了這幾件事，你記得的順序是？',
  items: [
    { id: 'a', text: '照吩咐轉回，安營在海邊', ref: '14:2' },
    { id: 'b', text: '法老帶六百輛車追上來',   ref: '14:7-9' },
    { id: 'c', text: '百姓哀求，說「難道在埃及沒有墳地」', ref: '14:10-12' },
    { id: 'd', text: '摩西說站住，神說往前走', ref: '14:13-15' },
    { id: 'e', text: '伸杖，東風吹了一夜，走乾地', ref: '14:21-22' },
    { id: 'f', text: '海水復原，埃及全軍沒有剩下', ref: '14:27-28' }
  ],
  hint: '摩西還沒伸杖以前，百姓已經先開口說話了。',
  doneText: '……（朋友口吻，落在經文觀察上，最後留一個小步）',
  skipText: '沒關係，這一幕今天先放著。海邊那一夜的順序，哪天想起來再看一次就好。'
},

// 配對題：2-4 組，左右各 ≤ 16 字；pairs 的順序無意義，程式端兩欄各自亂序。
interact: {
  kind: 'match',
  prompt: '這幾句話，各是誰對誰說的？',
  pairs: [
    { l: '「難道在埃及沒有墳地」', r: '百姓對摩西', ref: '14:11' },
    { l: '「只管站住」',           r: '摩西對百姓', ref: '14:13' },
    { l: '「你吩咐以色列人往前走」', r: '神對摩西', ref: '14:15' }
  ],
  hint: '……', doneText: '……', skipText: '……'
}
```

規則：

- 有 `interact` 的章，`q`／`choices`／`responses` 可省略；`validateContent()` 對這類章不查四格配額，改查：`kind` 只能 order／match；order 3-6 幕、match 2-4 組；每項 `ref` 必填且落在本章；`prompt`／`hint`／`doneText`／`skipText` 必填非空；`id` 不重複。
- 一章只能有一個 `interact`。`interact` 與 `type:'review'` 不並存（回顧章的四格本身就是機制）；與 `type:'node'` 可並存。
- 文字一律和合本用詞，引號內是經文原句時逐句過 `npm run verify:scripture`。

## 五、程式面（app.js／core.js／HTML）

- `core.js`：新增純函式 `interactKind(data)`（缺欄回 `'none'`）、`seededShuffle(list, key)`、`interactSummary(data, record)`（給日記用）。補 `test/core.test.js`。
- `app.js` `selectChapter`：`interactKind !== 'none'` 時隱藏 `choices-container`，渲染互動區；`selectChoice` 不變。新增 `interactDone()`／`interactSkip()`／`interactHint()`，結尾與二次確認相同：解鎖 `complete-btn`、捲到回饋。
- HTML：情境題卡內加一個 `<div id="interact-container" hidden>`，樣式沿用 `.choice-btn` 的尺寸與 `popIn`，不開新色。
- 日記（`app.js` 第 2880 行附近）：有 `interact` 紀錄的章顯示「📜 經文裡的一幕：已完成／先跳過」，不顯示玩家排的順序。

## 六、Firestore（動 schema 前先跑 `bible-firestore-safety`）

`users/{uid}/chapters/{key}` 多一個欄位，其餘不變：

```
interact: { kind: 'order'|'match', result: 'done'|'skip', hintUsed: true|false }
```

- 不存玩家排的順序或配對內容：不需要、也避免日後有人拿來算「答對率」（紅線 4）。
- `choiceSelected` 在這類章為空字串，既有讀取都已容錯（`||''`）。
- 訪客模式照舊只寫 localStorage。

## 七、埋點（追 `docs/metric-changelog.md`）

- 新增 `interact_view`、`interact_done`、`interact_skip`、`interact_hint`，參數同 `question_view` 的 `_elapsed({chapter})`。
- 為了 B1 漏斗（`npm run funnel`：question_view → choice_confirm → …）不斷線：這類章**仍發 `question_view`**，`interact_done`／`interact_skip` 在漏斗腳本裡視同 `choice_confirm`。metric-changelog 記一筆口徑說明。

## 八、試驗設計

**原型**：EXO14（排序題，上面的六幕）。排程 2026-10-26（content.js 第 239 行），在 dev 預覽給 James 手機看，不上正式站。

**第一週**：原型過了之後，從排程在上線日之後的敘事章挑 5-7 章（候選：EXO15 海邊之歌與瑪拉、EXO16 嗎哪、EXO17 磐石與亞瑪力、EXO18 葉忒羅、EXO19 西奈山、EXO24 立約；配對題至少 1 章）。改已上線章前照 content-format.md 第 86 行先查 Firestore 有沒有人提前完成。

**驗四件事（怎麼量）**：

| 要驗 | 怎麼量 | 不用什麼 |
|---|---|---|
| 有沒有幫人注意經文 | James 在 ChatGPT 視窗做試玩訪談（3-5 人）；小居審每題「讓玩家注意到經文裡的哪一件事」 | 不分析默想內容（紅線 1） |
| 仍在十分鐘內 | 既有 `_elapsed`：question_view → complete 的秒數，對照同週一般章 | |
| 不擠壓默想 | 默想率、`editDuration`、均字，對照同週一般章 | |
| 每章製作成本 | 每章記生成＋校對＋審稿分鐘數，寫進批次工單 | |

判斷門檻先不訂數字：目前週活躍 6-10 人，一週樣本判不出好壞（10/9 週報同一結論）；看方向＋訪談，兩週後由 James 拍板續做、縮小或停。

## 九、製作流程

沿用 `bible-content-generator` skill 的生成＋審查迴圈，多一段「互動題」：生成專員出 items／pairs＋三段文字 → 審查員查節數與用詞 → `verify:scripture` → 小居審「注意到哪件事」（`docs/agents/external-advisor.md` 時機 3）→ James 手機審。

## 十、開放問題（請反方先打）

1. `interact` 獨立欄位 vs 直接當 `type` 第三、四種：獨立欄位能與節點章並存、不改 `chapterType()`；代價是「type 機制」的說法與實作不一致。CC 建議獨立欄位。
2. 排序題「經文對照」要不要輕標差異（例：順序不同的幕用淡色）？CC 建議第一版不標，只附節數讓玩家自己對，看訪談再說。
3. 一週 5-7 章全部換，還是隔章換（一般章／互動章交錯）？CC 建議交錯，才有同週對照組。
4. 跳過的玩家要不要在日記看到「先跳過」三個字？CC 建議看得到但不帶任何標記色。

## 十一、反方意見（Codex／小居，跑完補）

（待補）

## 十二、James 拍板紀錄

（待補）
