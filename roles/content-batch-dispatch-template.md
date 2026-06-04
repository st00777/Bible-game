# 內容生產 · 批次 Dispatch 模板

> 用途：套用此模板產出 Agent View dispatch prompt。
> 維護：📝 內容生產（模板本體）+ 💻 開發協調（版控歸位）
> 更新：2026-05-30（三層重構）

## 設計（PM 2026-05-30 拍板：消除「文件對不上」）

**三層結構：**
1. **引用層** — 審查清單與角色紀律指向單一真實來源，不複製細目
2. **技術紀律層** — 派工專屬技術細節（SCHEDULE 格式 / bible.com 代碼 / worktree 守衛）寫在下方模板本體
3. **填空骨架層** — 每批要填的 🔧 機械欄位 + 🧠 判斷欄位

**引用層 — 兩份權威檔（subagent 第一步須 view）：**
- 審查清單 A-F 完整細目 → `claude-code-agent-prompts.md`（專案根，與 content.js 同層）
- 角色必守紀律 → `roles/content-creator.md`
> ⚠️ 改審查清單只改前者、改角色紀律只改後者；本模板不複製其細目，故不對不上。
> 方案 B：模板保留 A-F 標題層提醒（下方），完整細目以權威檔為準（subagent 隔離環境讀不到時，標題層為最低標準）。

**A-F 審查標題層**（細目見 claude-code-agent-prompts.md）：
- A 格式完整性 · B 和合本逐字 · C 情境題品質 · D 裝備設計 · E 人話自檢 · F guide 導讀

**填空骨架層 — 兩類欄位：**
- 🔧 機械欄位（查表算日期即得，未來進度 script 可自動填）：書卷名/代碼/章節清單/日期/插入位置/合併日標記/版本號/commit message
- 🧠 判斷欄位（永遠留人填，模板存在的意義）：THEME_HINT / SCENARIO_FOCUS / RELATIONAL_DIMENSION / CAUTION
> 🚩 紅線：判斷欄位永遠由內容生產視窗填，不可由 script 或 subagent 自動產生。

## 模板本體（複製以下到 Agent View，填入 {{ }} 與 ▓ ▓ 欄位）
═══════════════════════════════════════════════════════════

```
【任務】批次生產 {{章節數}} 章靈修內容並整合進 content.js

你是這次批次（{{書卷中文名}}{{合併日標記}}）的 parent agent，負責 spawn
{{章節數}} 個 subagent 平行生成 {{章節數}} 章內容（{{章節清單}}），收齊後
統一寫進 content.js + 更新 SCHEDULE 與 BIBLE_LINKS。

═══ PHASE 1：分支確認 ═══
git branch --show-current → 必須 dev（不自動切分支，等開發協調指示）

═══ PHASE 2：平行 spawn {{章節數}} 個 subagent（Task tool，平行不序列）═══

每個 subagent 跑完整雙角色迭代（生成專員 ↔ 審查員 ↔ 通過為止），
輸出完整章節 JS 物件。每個用以下 SUBAGENT_PROMPT，替換 ▓ 處。

─── SUBAGENT_PROMPT（每章一份）───

你是靈修冒險專案的內容生成專員兼審查員，採雙角色迭代直到通過。

【第一步 · 必做】view 兩份權威檔取得完整標準：
- claude-code-agent-prompts.md（A-F 審查清單完整細目 + 生成流程）
- roles/content-creator.md（內容生產者必守紀律）
（若隔離環境讀不到，以下標題層為最低標準，並回報 parent 讀不到）

【本次任務】
- 書卷：{{書卷中文名}} · 第 ▓章節號▓ 章 · key：▓章節key▓ · 排程：▓排程日期▓
- THEME_HINT：▓THEME_HINT▓              ← 🧠 判斷欄位
- SCENARIO_FOCUS：▓SCENARIO_FOCUS▓      ← 🧠 判斷欄位
- RELATIONAL_DIMENSION：▓RELATIONAL_DIMENSION▓  ← 🧠 判斷欄位
- CAUTION：▓CAUTION▓                    ← 🧠 判斷欄位

【必守紀律 · 摘要】（完整見 roles/content-creator.md）
1. 經文和合本逐字（含標點），用「，」「。」「；」新標點和合本風格
2. 引號內不改寫、不自加括號、不切句拼接
3. baseItem.desc 與 bonusItem.desc 不引用同一節
4. verse / base.desc / bonus.desc 三處都在本章範圍內、不跨章
5. choices 涵蓋不同信仰成熟度；至少一個給「老實說做不到」的人
6. 每個 response 結尾留「情緒有重量的小步」（可說出口的話 / 有方向感的問題，非「想一想」）
7. responses 溫暖、像朋友同行、不說教
8. guide.outline 用 ✦ 標情境題聚焦段；guide.focus 明確指出聚焦經文
9. 全形空格「 神」移除

【格式範本】
{
  chapter:'▓章節key▓', sceneEmoji:'...', readTime:...,
  guide:{ intro:'...', outline:[{nodes:'N-M節',text:'...'},{nodes:'N-M節',text:'... ✦'}], focus:'今日情境題聚焦在 N-M節——...' },
  verse:'「...」', verseRef:'—— {{書卷中文名}} ▓章節號▓:N',
  scene:'...', q:'...',
  choices:[{k:'A',text:'...'},{k:'B',text:'...'},{k:'C',text:'...'},{k:'D',text:'...'}],
  responses:{ A:'...', B:'...', C:'...', D:'...' },
  reflectionTitle:'...', reflection:'...\n\n...',
  baseItem:{ emoji:'...', name:'...', desc:'「...」', slot:'...' },
  bonusItem:{ emoji:'...', name:'...', desc:'「...」', slot:'...' }
}
（slot：hat 標誌/身份/祝福 · body 外袍/身分 · hand 手持物件 · bg 場景意象）

【執行流程】
Step 1 生成專員：WebFetch 抓和合本
  主來源 https://hakkaac.org/Bible/Bible/CUT/CUT_{{書卷英文檔名}}.html
  備援 https://wd.bible/verse/{{bible_com代碼小寫}}.▓章節號▓.1.cunps
  （hakkaac 神版傳統用「、」「．」，轉新標點「，」「。」「；」）
  讀整章 → 找 verse / base.desc / bonus.desc 三節（不重複、不跨章）
Step 2 審查員：跑 A-F 完整清單（細目見 claude-code-agent-prompts.md）
Step 3 迴圈：任何 ❌ → 修問題處；全 ✅ → Step 4
Step 4 輸出：✅ 審查通過 · 迭代 N 輪 / 章節 key / [完整 JS 物件] /
  審查摘要（迭代輪數 / 修改項目 / 三處出處 / 關係向度 / 雷區避過）

【重要】只生成與審查，不動檔案、不跑 git。物件以純文字輸出給 parent 收齊。

─── END SUBAGENT_PROMPT ───

═══ PHASE 2 · 各 subagent 的 ▓ 替換值 ═══

🧠 每章 THEME_HINT / SCENARIO_FOCUS / RELATIONAL_DIMENSION / CAUTION
   由內容生產視窗填（判斷欄位，不可自動產生）

▓▓▓ {{章節key}} ▓▓▓
- 章節號：{{章節號}} · 排程：{{排程日期}}{{合併日標記}}
- THEME_HINT：{{填：本章核心主題與張力}}
- SCENARIO_FOCUS：{{填：聚焦哪段、避開哪段、往哪個切角}}
- RELATIONAL_DIMENSION：{{填：個人/與他人/與神 — 跨章勿重複}}
- CAUTION：{{填：⚠️ 雷區，或「無特殊雷區」}}
（其餘 subagent 比照，每章一組）

═══ PHASE 3：收齊後 parent agent 統一執行 ═══
3.1 抽查覆審：主題多元（用 RELATIONAL_DIMENSION 檢查不重複）/ WebFetch
    逐字核對各章 verse + 2 desc / base≠bonus / 全形神 / 無自加括號切句 /
    特別檢查 CAUTION 雷區章節是否落實 / 不過關回報 James 不硬塞
3.2 寫進 content.js：插入位置 {{插入位置}}（聖經順序），用 Edit 不走 sed
3.3 更新 SCHEDULE：{{各日期陣列格式，合併日 ['A','B']}}
3.4 更新 BIBLE_LINKS：{{各章，無空格格式，注意 bible_com 代碼}}，位置 {{插入位置}}
3.5 不進版：GAME_VERSION 維持 {{當前版本號}}
3.6 機械檢查：node --check / 各章結構完整 / SCHEDULE 陣列 / BIBLE_LINKS 格式 / 未動 bible-game-v2.html
3.7 Commit + Push：git branch 確認 dev → git add content.js →
    git diff --cached --stat → git commit -m "{{commit_message}}" → git push origin dev

═══ PHASE 4：完成回報（給 James 簡短版）═══
✅ 批次完成 / Commit hash / 推送結果 / 各章狀態（章節（日期）：迭代 N 輪 ·
關係向度 · verse/base/bonus 出處）/ SCHEDULE 確認 / BIBLE_LINKS 確認 /
不進版確認 / 機械檢查 / 未動 bible-game-v2.html / CAUTION 雷區避過項目

═══ 重要原則 ═══
1.平行不序列 2.不自動切分支 3.不進版 4.不動 bible-game-v2.html
5.content.js 唯一動的檔 6.任何阻塞先停下回報 7.回報簡短
8.合併日 SCHEDULE 必須陣列化 9.CAUTION 雷區章節必須落實避雷
```

═══════════════════════════════════════════════════════════
## 使用流程（每批次）
═══════════════════════════════════════════════════════════

1. 📝 內容生產：填 🔧 機械欄位 + 🧠 判斷欄位 → 產出完整 dispatch prompt
2. James：貼進 Agent View
3. Claude Code：parent + subagent 跑（subagent 第一步 view 兩份權威檔）
4. 回報 → 📝 內容生產做最終把關 → 過 / patch

> 未來「進度盤點 script」（PM 排序第 2）做好後，🔧 機械欄位可自動填，
> 🧠 判斷欄位繼續留人 — 即「半自動甜蜜點」，分兩步到位。
