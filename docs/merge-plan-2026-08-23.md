# main ⇄ dev 分岔合併方案（2026-08-23，純讀研究）

> 對應 Issue #9。本文只查證不動分支；所有數字以 `git fetch origin` 後的 `origin/main = fa9683e`、`origin/dev = 44f13a3`、`refactor-issues-20260823 = 10f33dc`（PR #12）為準。
> 試合併在臨時 worktree `.claude/worktrees/merge-probe` 完成並已 `git merge --abort` + `git worktree remove --force` 清掉。

## 0. 結論先講

| 問題 | 答案 |
|---|---|
| 分岔多大？ | 表面 dev +98 / main +46，**實際 main 的 46 個 commit 全部是從 dev cherry-pick 過去的副本**（`git cherry`：36 個 patch 完全等價、10 個有上下文差異）。main 沒有任何 dev 沒有的東西。 |
| 程式碼真衝突？ | 兩個方向試合併結果一樣：只衝突 **2 個檔、7 個區塊**（content.js 2、content-tone-guide.md 5），全部是「main 是舊版、dev 是同一段的新版」，一律取 dev 即可；bible-game-v2.html / CLAUDE.md / design-principles.md 自動合併且結果與 dev 完全相同。**取 dev 側後合併樹 == origin/dev（逐位元相同）。** |
| 玩家內容一致？ | 一致。兩邊 `GAME_VERSION='2026.06.11'`、`SUPPRESS_VERSION_POPUP=true`、`FEATURE_FEEDBACK_V2=true`；SCHEDULE 都到 **2026-09-06（GEN9+GEN10）**，章節內容逐字相同。誰都不比誰新。 |
| 真正的門檻 | 不是 git，是**產品決策**：dev 多了 A1「書卷詳情頁」（書架點書 → 導讀＋人物冊 overlay，無 feature flag）、getChapter／computeCompletion 重構、AI fallback 單一正本、hosting 白名單。PM 交接卡規定 A1 上線＝機制變更要升版彈公告、且 BOOK_INTRO 要補到近半（目前 24 卷缺 18）。**dev → main 之前要先決定 A1 是「加 flag 關起來」還是「升版公開」。** |
| 建議 | **方案 C（兩段式）**：① 現在就做 main → dev 反向同步（樹不變、零玩家影響，消滅 46 個影子 commit）；② 接著 PR #12 併 dev；③ A1 加 flag（或 PM 拍板升版）後，一次 dev → main `--no-ff` release，之後 main 與 dev 同 HEAD，回到「dev 累積 → main 發布」正軌。 |
| 時機 | **現在是好窗口**：內容邊界 09-06，下一批 GEN11+（09-07 起）尚未開工；主工作樹的未 commit 變更只是 `public/` 同步副本＋兩份文件，沒有內容批在半路。 |

---

## 1. 兩邊 commit 分類

分岔點 `7f07c4b`（release 2026.06.11）。

| 類別 | dev 獨有（98） | main 獨有（46） | 說明 |
|---|---|---|---|
| 內容批次 | 20 | 19 | TIM2→TIT/PHM→HEB→JAS→PE1/PE2→JN/JUD→REV 9A/9B/9C→GEN1-5→GEN6-10、BOOK_INTRO 五本。main 的 19 個＝dev 同名 cherry-pick；dev 另多 `06db654`（public/ 同步）。 |
| 審查修正 | 19 | 19 | 批次8 JN1_5 回補、9A/9B/9C 審查、P0/P1 hkbs 逐字 A/B/C、歷史修正 C-1～C-3、GEN6-10 A–F 兩輪。**兩邊一對一**。 |
| 功能／工程 | 21 | 4 | dev：領裝備治本 `c1d6c0b`/`f469a3d`、A1 Phase0 `32dc321`＋Phase1 `6508899`、validateContent `cf2a836`、getChapter `0dd3ea3`、computeCompletion `4f5165d`、三態 `690ab70`、hosting 白名單 `8c3d31d`/`5706fc6`、deploy.sh `c7272e6`、AI fallback `cdc6464`、BOOK_INTRO 自檢 `cc5cddf`、人物冊 `852e2d0`、release reverse merge `0301ad9`。main 只拿到 validateContent、ACT totalChapters、三態、A1 Phase0 四個。 |
| 文件 | 38 | 4 | sprint-log、data-insights、CLAUDE.md 收斂 `7bb9f12`、LEARNING、tone-guide、docs/agents、archive 歸檔 `157dc4d`/`44f13a3`、讀經排程 `d29798f`。main 只拿 tone-guide×2、design-principles×2。 |

代表性對照（同訊息不同 SHA）：`690ab70`(dev 08-17 23:59) → `efe3cca`(main，committer 08-18 23:56)；`631618f` → `80cecc2`；`d403381` → `3089ffa`；`afddc6a` → `fa9683e`。

## 2. 為什麼內容會「直接進 main」——其實沒有

查 committer date 可證：**46 個 main 獨有 commit 的 author date 全部等於 dev 原 commit，committer date 則是批次發布日**（06-19、06-23、07-06、07-12、07-27、08-01、08-02、08-18、08-20 各一批）。也就是：內容一律先在 dev 落檔，再由「開發協調」視窗 cherry-pick 到 main 發布。沒有「先 main 後 dev」的例子；`690ab70` 的情況是「dev 本機已 commit 但**未 push**、先被 cherry-pick 上 main」（`archive/pm/pm-handover-2026-08-18.md` §一：「690ab70 在 8/18 前停在本地 dev 未推，後經 cherry-pick 進 main」）。

工作流出處：
- `archive/pm/pm-handover-2026-08-18.md` §三①「本專案發布走 cherry-pick，產生的是同訊息、不同 SHA 的副本」；要點段「發布模式：isolated worktree + cherry-pick，**不用 dev→main merge**」、「內容批不進版；機制變更才升版彈公告」。
- `archive/pm/dev-coord-handover-2026-08-18.md` §六「發布流程：…CC 執行（Phase 0 唯讀查證 → Phase 1 cherry-pick → 驗收）… James 手動 push → 玩家端終驗」；§四 10「共用工作樹上的跨分支發布一律走 isolated worktree」；§三「cherry-pick 分歧已累計 10 批」。
- `archive/pm/content-window-handover.md` 分工表：「跨分支發布、cherry-pick → 開發協調」。
- `CLAUDE.md` 分支段落仍寫理想流程 `git merge --ff-only dev`，並有 2026-05-11 補註「實際已改 non-ff merge」——與現行 cherry-pick 做法脫節，合併後應改寫。
- `LEARNING.md` L440-460（v2.14/v2.15 對齊事件）：上次分岔的解法是「main merge 進 dev、在 worktree 解衝突＋preview 驗證、全綠再上 main；先 `git tag` 錨點；flag 值人工 grep 不信 auto-merge；每次 release 反向 merge 回 dev」。本次方案沿用。
- `docs/2026年8-9月讀經排程與本輪決策.md` §三-3：「main 的 CLAUDE.md 落後 dev 106 行…待整份 dev→main 一次對齊」——早已列為待辦。

為何 cherry-pick 成慣例：主工作樹三視窗共用、不能 checkout main；A1 骨架無 flag 不能整包上 main；於是只挑內容 commit 搬。代價就是今天的 46 個影子 commit。

## 3. 程式碼差異量化

`git diff --stat`（自 7f07c4b 起）：

| 檔案 | dev 側變動 | main 側變動 | main ↔ dev 直接差 | 兩邊都改？ |
|---|---|---|---|---|
| content.js | +2928 | +2892 | **66 行**（AI_FALLBACK_TEXT、CHARACTERS 多時期、validateContent 4)/5) 改嚴） | ✔ |
| bible-game-v2.html | ±310 | ±61 | **249 行**（A1 overlay＋getChapter＋computeCompletion＋導讀區） | ✔ |
| functions/index.js | 3 | 0 | 3 | — |
| deploy.sh | 38 | 0 | 38 | — |
| firebase.json | 12 | 0 | 12 | — |
| firestore.rules | 0 | 0 | 0 | — |
| public/bible-game-v2.html、public/content.js | 新增（dev only） | — | +11048 | — |

兩邊都改到的檔案（5 個，= main 改過的全部）：`bible-game-v2.html`、`content.js`、`CLAUDE.md`、`content-tone-guide.md`、`design-principles.md`（最後一個兩邊已相同）。
逐行集合比對：main 有而 dev 沒有的行＝html 43 行、content.js 14 行、CLAUDE.md 21 行、tone-guide 2 行——**全是被 dev 後續重構／改寫掉的舊行**（`CHAPTERS.find`、舊 CHARACTERS 結構、舊版號規則、「待辦」→「已完成」）。

## 4. 試合併量化

| 方向 | 自動合併 | 衝突檔 | 區塊數 | 取 dev 側後 |
|---|---|---|---|---|
| dev ← main（在 dev 上 merge main） | bible-game-v2.html、CLAUDE.md | content.js、content-tone-guide.md（add/add） | 2 ＋ 5 ＝ 7 | 樹 == origin/dev |
| main ← dev（在 main 上 merge dev） | 同上 | 同上 | 2 ＋ 5 ＝ 7 | 樹 == origin/dev |

content.js 兩個衝突區塊的性質（兩塊全看）：
1. L507-556 `CHARACTERS`：main＝Phase 0 平面結構（`book/intro/unlock`），dev＝Phase 1 多時期 `periods{}`。同一段、dev 是後續演進。
2. L6594-6623 `validateContent()` 第 4)/5) 條：main＝只看 key 存在，dev＝去空白非空判定＋逐欄 BOOK_INTRO。同一段、dev 是後續演進。
→ **沒有任何「同一章節兩邊不同版本」的內容衝突**；章節物件、SCHEDULE、BIBLE_LINKS 全自動合併且相同。
content-tone-guide.md 5 塊：main 是 07-27/08-01 cherry-pick 的舊版，dev 之後補了 9A 補記、JN1_5「待辦→已完成」、創世記基調、異體字慣例等。取 dev 無損。

## 5. 版號／flag／SCHEDULE

| 項目 | main | dev |
|---|---|---|
| `GAME_VERSION` | 2026.06.11 | 2026.06.11 |
| `SUPPRESS_VERSION_POPUP` | true | true |
| `FEATURE_FEEDBACK_V2` | true | true |
| SCHEDULE 最後一天 | 2026-09-06 `['GEN9','GEN10']`（142 天） | 同 |
| validateContent（node 跑） | 0 錯誤／4 條待補 | 0 錯誤／18 條待補（同一現實，自檢變嚴） |
| 書架點書 | 無 onclick | `openBookDetail()` → 導讀＋人物冊 overlay（A1） |

內容無新舊之分；**dev 的差別全是機制**。

## 6. 合併方案

| | A：以 main 為底，dev 合進 main，再 dev=main | B：以 dev 為底，main 合進 dev，再 main=dev | **C（建議）：先 main→dev 同步，再（條件成熟時）dev→main 發布** |
|---|---|---|---|
| 方向／順序 | ① worktree checkout main；`merge --no-ff origin/dev`（取 dev 解 7 塊）；② push main；③ dev ff 到 main；④ PR #12 再併 dev | ① 在 dev 上 `merge --no-ff origin/main`（取 dev 解 7 塊）；② PR #12 併 dev；③ main `merge --ff-only dev`；push | ① dev 上 `merge --no-ff origin/main`（樹不變）→ push dev；② PR #12 併 dev；③ A1 加 feature flag（或 PM 拍板升版＋公告）；④ worktree 上 main `merge --no-ff origin/dev`（此時零衝突）→ preview 驗 → James push main；⑤ dev `merge --ff-only main` |
| 衝突量 | 7 塊，全取 dev | 7 塊，全取 dev | ① 7 塊全取 dev；④ **0 塊**（main 已是 dev 祖先） |
| 玩家版影響 | **立即**：A1 書卷詳情頁、重構、deploy 變更一次全上；與「機制變更要升版公告」規則衝突，且 A1 未過 PM 前提 | 同 A（main=dev 那步等於 A） | ① **零**（main 不動）；④ 由 PM 決定時機，且可附升版／公告，或靠 flag 讓玩家看不出差別 |
| PR #12 | 只能在 ④ 之後、等於再做一次 A | ② 之後隨 main=dev 一起上 | ② 先進 dev，與 A1 一起在 ④ 發布；若想先上也可在 ④ 前單獨發 |
| 回滾 | `git tag pre-merge-main-20260823 origin/main` → `git push -f origin pre-merge-main-20260823:main`（GitHub Pages 幾分鐘內回舊版） | 同左 | ① 不用回（沒動 main）；④ 同左，且 main 只多一個 merge commit，`git revert -m 1` 也可 |
| 風險 | 高（玩家版跳一大步、違反 PM 規則） | 高（同 A） | 低；唯一成本是 A1 flag 一小段改動或一次 PM 決策 |

**建議 C，理由**：(1) 真正的阻塞是 A1 無 flag，不是 git；先把「歷史對齊」和「玩家版發布」拆開，前者今天就能做、零風險。(2) 做完 ① 之後 `git log dev..main` 為 0，再也不必用 grep 對帳「上了沒」，PM 交接卡列的頭號陷阱直接消失。(3) ④ 走 `--no-ff` merge 而非 cherry-pick，沿用 LEARNING 教訓「每次 release 反向 merge 回 dev」，之後 main 永遠是 dev 的祖先。(4) 若之後 GEN11+ 內容批要先上而 A1 還沒定，cherry-pick 仍可當臨時手段，但 ① 已做的話 cherry-pick 不再製造新分岔（只要事後 main 再 merge 回 dev）。

**PR #12 注意**：它新增 `core.js`、`shared/feedback-schema.js` 並讓 `bible-game-v2.html` 多載入兩支 script，屬機制變更；其 `npm test`（5 個測試檔）與 `validate:content` 正好可當 ④ 的驗收工具。它的 base 是 `157dc4d`（44f13a3 之前），所以 diff 看起來「刪 archive/pm 三卡、加 data-insights.md」——那是基準差，GitHub 已標 MERGEABLE，併進 dev 後不會真的還原 44f13a3 的搬移（仍建議併完 `git show --stat` 確認）。

**A1 flag 建議形狀**（一行級改動，dev 上做）：`content.js` 加 `const FEATURE_BOOK_DETAIL = false;`，`bible-game-v2.html` 書架 spine 的 `onclick` 改成 flag 為 true 才掛。之後 PM 何時拍板、只翻 flag＋升版。

**時機**：
- SCHEDULE 到 09-06；GEN11+ 09-07 起，依前兩批節奏（08-17、08-20 各一批）下一批大約 08-底～09-初才會動工。今天 08-23 主工作樹只有 `public/` 同步副本（與根目錄檔相同）＋兩份未追蹤文件（`Genesis-tone-guide.md`、`CLAUDE-token-optimization.md`），**沒有內容批進行中** → 適合立刻做 ①②。
- ④ 的死線：最晚與 GEN11+ 批次同時發布前完成（否則 GEN11+ 又得 cherry-pick）。

## 7. 執行步驟草稿＋驗收

所有 git 在 isolated worktree 做，主工作樹不碰。指令區不放 `#` 註解。

**步驟 ①（main → dev，零玩家影響）**
```
cd /Users/aitest/bible-work/Bible-game
git fetch origin
git tag pre-merge-dev-20260823 origin/dev
git worktree add --detach .claude/worktrees/sync-main-into-dev origin/dev
cd .claude/worktrees/sync-main-into-dev
git merge --no-ff origin/main
git checkout --ours content.js content-tone-guide.md
git add content.js content-tone-guide.md
git diff --cached origin/dev --stat
git commit -m "merge: origin/main 反向併回 dev（46 個 cherry-pick 影子 commit 收口，樹與 dev 相同；#9）"
git push origin HEAD:dev
cd /Users/aitest/bible-work/Bible-game
git worktree remove --force .claude/worktrees/sync-main-into-dev
```
驗收：`git diff --cached origin/dev --stat` 必須**空白**；push 後 `git rev-list --count origin/dev..origin/main` 必須為 0；主工作樹 `git pull --ff-only`（由持有 WIP 的視窗自己做）。

**步驟 ②** PR #12 在 GitHub 併入 dev（squash 或 merge 皆可）。驗收：在 dev 最新 commit 的 worktree 跑 `npm test` 全綠、`npm run validate:content` exit 0、`git show --stat HEAD` 確認 archive/pm 三卡仍在、data-insights.md 未回來。

**步驟 ③** A1 flag（或 PM 拍板升版：改 `GAME_VERSION`、`VERSION_NOTES`、changelog、`SUPPRESS_VERSION_POPUP=false`）。驗收：`grep -n "FEATURE_BOOK_DETAIL\|GAME_VERSION\|SUPPRESS_VERSION_POPUP" content.js` 把值貼出來人工確認。

**步驟 ④（dev → main 發布）**
```
cd /Users/aitest/bible-work/Bible-game
git fetch origin
git tag pre-release-main-20260823 origin/main
git worktree add --detach .claude/worktrees/release origin/main
cd .claude/worktrees/release
git merge --no-ff origin/dev -m "release: dev 併入 main（A1 flag 關閉／重構／hosting 白名單／PR #12；#9）"
git diff origin/dev --stat
bash deploy.sh channel merge-probe 3d
```
驗收：`git diff origin/dev --stat` 空白；preview channel 開 `bible-game-v2.html?v=$(date +%s)` 跑一次靈修→領裝備、書架點書（flag 關＝無反應／開＝overlay）、曠野呼聲送出；`npm test` 全綠；`node scripts/validate-content.js` exit 0；firestore.rules 若有改先 `firebase deploy --only firestore:rules`；functions 若有改 `bash deploy.sh functions`（deploy.sh 會比對 AI_FALLBACK_TEXT）。全綠後 James 在 release worktree `git push origin HEAD:main`。

**步驟 ⑤** 正式站終驗＋收尾
```
curl -s -o /dev/null -w "%{http_code}\n" "https://st00777.github.io/Bible-game/bible-game-v2.html?v=$(date +%s)"
curl -s "https://st00777.github.io/Bible-game/content.js?v=$(date +%s)" | grep -c "GEN10"
curl -s "https://st00777.github.io/Bible-game/content.js?v=$(date +%s)" | grep -n "GAME_VERSION\|SUPPRESS_VERSION_POPUP\|FEATURE_BOOK_DETAIL"
curl -s -o /dev/null -w "%{http_code}\n" "https://st00777.github.io/Bible-game/core.js?v=$(date +%s)"
cd /Users/aitest/bible-work/Bible-game
git worktree add --detach .claude/worktrees/ff-dev origin/dev
git -C .claude/worktrees/ff-dev merge --ff-only origin/main
git -C .claude/worktrees/ff-dev push origin HEAD:dev
git worktree remove --force .claude/worktrees/ff-dev
git worktree remove --force .claude/worktrees/release
```
驗收：HTTP 200、GEN10 ≥ 1、flag 值與預期相同、`core.js` 200（PR #12 已併時）；最後 `git rev-parse origin/main origin/dev` 兩個 hash 相同；`CLAUDE.md` 分支流程段改寫為「dev 累積 → `--no-ff` merge 上 main → main ff 回 dev」、刪掉「cherry-pick 不用 merge」的說法。

回滾任一步：`git push -f origin pre-release-main-20260823:main`（GitHub Pages 重新建置約 1-3 分鐘）；dev 同理用 `pre-merge-dev-20260823`。
