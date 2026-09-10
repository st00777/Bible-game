# 研究報告：玩家「膩了」怎麼辦——無聊心理學、享樂適應與業界「外框不變、內容輪換」的做法

> 調查日期：2026-09-11。前兩份研究（`research-habit-retention.md`、`research-progression-visuals.md`）回答的是「怎麼讓人每天回來」；本篇回答的是 ADR 0001 診斷出來、但待辦清單沒有對準的問題：**人已經在回來，但覺得膩**（乏味＝流程可預期＋內容同質＋進度失去意義）。四個問題：**Q1 無聊在心理學上是什麼、從哪來？**、**Q2 哪些理論說「變化」有效、哪些理論警告「獎勵」有害？**、**Q3 業界（含教會自己）怎麼在固定習慣裡做內容輪換？**、**Q4 對照本專案該優先做什麼？**
> 來源標註慣例同前兩份：〔一手〕＝原始論文（附 DOI 或作者／期刊頁）、官方 blog、官方說明中心；〔二手〕＝評論、整理文、社群 wiki。本次未抓到一手的以〔二手〕標明，不冒充。
> 前置閱讀：`docs/adr/0001-refocus-2026-08.md`、`design-principles.md`、`data-insights.md` 9/9 摘要、CLAUDE.md「協作模式與戰略對焦」段。

---

## 〇、先講結論（給趕時間的人）

1. **無聊只有兩種來源**：注意力不對頻（太簡單或太難）與缺乏意義（Westgate & Wilson 2018 MAC 模型）。本專案三個乏味診斷剛好各歸一邊：「流程可預期」「內容同質」是注意力面，「進度失去意義」是意義面。**要兩種藥**，任何單一機制都治不全。
2. **對抗適應最有效的是「變化」，不是「更多」**（Sheldon & Lyubomirsky 2012 HAP 模型，481 人三個月縱貫研究）。這直接支持「容器輪換」優先於「堆更多獎勵」。
3. **可預期的實物獎勵會侵蝕內在動機**（Deci, Koestner & Ryan 1999，128 篇統合分析），資訊性回饋才不會。這是給 ADR 0006 獎勵雙軌的警訊：獎勵表排得越清楚，越接近「為裝備而來」。James 的出席驅動原則方向正確。
4. **習慣靠「情境提示＋固定儀式」，跟內容本身無關**（Wood & Neal 2007；Lally et al. 2010）。所以正確做法是**外框不動、內容輪換**，這也是 Duolingo、Wordle、Calm、教會禮儀年共同的結構。
5. **進度要有梯度與地標**：目標梯度（Kivetz et al. 2006）、小面積假說（Koo & Fishbach 2012）、新起點效應（Dai, Milkman & Riis 2014）三者合起來解釋：六成活躍玩家完走卷數為 0 是因為「卷」離得太遠、中間沒有節點；8/23 新約換創世記那週是近 8 週最強週，符合新起點效應（相關非因果，見第四節）。
6. **建議排序**（詳見第五節）：① 出埃及記下一批直接做「視角與默想題型輪換」（零工程）；② 出 14 過紅海做第一個「節點章」（純內容＋一個標記）；③ 加 `type` 欄位機制，11/04 合併日試「回顧章」；④ 「兩難章」「輕日」看前三項數據再決定；⑤ 把「不做變動獎賞、獎勵只做資訊性回饋」寫進 design-principles。

---

## 一、無聊是什麼、從哪來（Q1）

### MAC 模型（Meaning and Attentional Components）
- **定義**：無聊來自兩個獨立成分：(a) 注意力成分＝認知需求與可用心智資源不匹配；(b) 意義成分＝活動與所重視的目標不匹配，或根本沒有被重視的目標。兩者各自獨立就能產生無聊，且注意力面又分「刺激不足」與「刺激過載」兩型。〔一手：Westgate & Wilson (2018), *Psychological Review*, 125(5), 689–713, [doi:10.1037/rev0000097](https://psycnet.apa.org/doiLanding?doi=10.1037%2Frev0000097)；[作者自存 PDF](https://www.erinwestgate.com/uploads/7/6/4/1/7641726/westgatewilson.psychreview.2018.pdf)〕
- **對本專案**：玩了 250 天以上的核心玩家，四選一的認知需求早已低於他們的能力＝刺激不足型；「進度失去意義」＝意義成分。兩條線要分開處理。

### 心流的無聊象限
- **定義**：挑戰低於能力時進入無聊象限；挑戰略高於能力時才有心流。〔一手：Csikszentmihalyi, M. (1990). *Flow: The Psychology of Optimal Experience*. Harper & Row.（專書，無線上一手）〕
- **對本專案**：不是要把靈修變難，而是偶爾換一種「需要不同能力」的容器（例如寫一句禱告 vs 選一個立場），讓熟手重新需要動腦。

### 享樂適應與 HAP 模型
- **定義**：任何正向改變帶來的幸福感會被兩條路侵蝕：由下而上（正向情緒遞減）與由上而下（期望上調）。兩個可以延緩侵蝕的調節因子：**持續的感恩／欣賞**，與**持續的變化**。481 名學生、三波、三個月的縱貫研究支持模型。〔一手：Sheldon & Lyubomirsky (2012). The challenge of staying happier: Testing the Hedonic Adaptation Prevention model. *PSPB*, 38(5), 670–680, [doi:10.1177/0146167212436400](https://journals.sagepub.com/doi/abs/10.1177/0146167212436400)；[作者自存 PDF](https://sonjalyubomirsky.com/wp-content/uploads/2024/03/SBL2012.pdf)〕
- **對本專案**：「持續的變化」＝容器輪換；「持續的欣賞」＝回顧章（把本週讀過的重新拿出來看一次）。兩個調節因子剛好對應本文兩個主要建議。

---

## 二、哪些理論說變化有效、哪些警告獎勵有害（Q2）

### 支持「外框不動、內容輪換」

| 理論 | 核心發現 | 對本專案 | 來源 |
|---|---|---|---|
| 習慣的情境提示論 | 習慣是「情境特徵 → 反應」的慢速聯結，一旦形成就不經目標中介；內容變化不影響習慣，只要提示與儀式穩定 | 每日開場、金句、領獎畫面這個外框不要動；中間的題型可以換 | 〔一手：Wood & Neal (2007). *Psychological Review*, 114(4), 843–863, [作者自存 PDF](https://dornsife.usc.edu/wendy-wood/wp-content/uploads/sites/183/2023/10/wood.neal_.2007psychrev_a_new_look_at_habits_and_the_interface_between_habits_and_goals.pdf)〕 |
| 真實世界習慣形成 | 96 人 12 週，自動化中位 66 天（範圍 18–254）；**漏一天不影響形成**；關鍵是「同一提示下重複」 | 核心玩家早已過自動化期，現在的問題不是習慣而是內容；漏一天不罰的設計有實證 | 〔一手：Lally et al. (2010). *EJSP*, 40(6), 998–1009, [doi:10.1002/ejsp.674](https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674)〕 |
| 交錯練習（interleaving） | 題型混排比同型集中練習，一週後測驗表現「大幅」較佳（兩個實驗） | 同一週內混排不同題型容器，比整批同型更利於記住經文 | 〔一手：Rohrer & Taylor (2007). *Instructional Science*, 35, 481–498, [作者 PDF](http://uweb.cas.usf.edu/~drohrer/pdfs/Rohrer&Taylor2007IS.pdf)〕 |
| 峰終定律 | 回顧性評價由最高點與結尾主導，時長被忽略 | 每次靈修的結尾（領獎／節點儀式）值得投資；一段時間（一卷）的結尾也是 | 〔一手：Fredrickson & Kahneman (1993). *JPSP*, 65(1), 45–55；Kahneman et al. (1993). *Psychological Science*, 4(6), 401–405, [doi:10.1111/j.1467-9280.1993.tb00589.x](https://journals.sagepub.com/doi/10.1111/j.1467-9280.1993.tb00589.x)〕 |
| 儀式心理學 | 儀式有三個調節功能：情緒、表現目標狀態、社會連結；固定形式本身就產生意義感 | James「儀式感優先」有實證基礎；固定的開場與結尾是資產不是包袱 | 〔一手：Hobson, Schroeder, Risen, Xygalatas & Inzlicht (2018). *PSPR*, 22(3), 260–284, [doi:10.1177/1088868317734944](https://journals.sagepub.com/doi/abs/10.1177/1088868317734944)〕 |

### 支持「進度要有梯度與地標」

| 理論 | 核心發現 | 對本專案 | 來源 |
|---|---|---|---|
| 目標梯度 | 咖啡集點卡：越接近免費那杯買越勤；網站評分也是越近門檻越積極 | 27 卷可完走、六成活躍玩家為 0＝目標太遠沒有梯度；卷內節點章補中間的「近了」感 | 〔一手：Kivetz, Urminsky & Zheng (2006). *JMR*, 43(1), 39–58, [doi:10.1509/jmkr.43.1.39](https://journals.sagepub.com/doi/abs/10.1509/jmkr.43.1.39)；[作者 PDF](https://home.uchicago.edu/ourminsky/Goal-Gradient_Illusionary_Goal_Progress.pdf)〕 |
| 小面積假說 | 人盯著「已完成」與「剩餘」中較小那塊時動力最高：起步時看已完成、接近時看剩餘 | 書卷詳情頁前半顯示「已讀 N 章」、後半顯示「還剩 N 章」；不評默想、只算出席，不踩紅線 | 〔一手：Koo & Fishbach (2012). *Journal of Consumer Research*, 39(3), 493–509, [Semantic Scholar](https://www.semanticscholar.org/paper/846c9878f068c05b7ca62d7a9aa7907158c2266c)〕※ 本次修正：刊於 JCR 非 JPSP |
| 新起點效應 | 週初、月初、年初、學期初、生日後，Google 搜尋 diet、健身房到訪、目標承諾都上升（三個檔案研究） | 新卷開始、卷內大事件（過紅海、十誡、會幕立起）都是可用的時間地標；8/23 新約→創世記那週 63 章為近 8 週最高，方向一致 | 〔一手：Dai, Milkman & Riis (2014). *Management Science*, 60(10), 2563–2582, [doi:10.1287/mnsc.2014.1901](https://pubsonline.informs.org/doi/10.1287/mnsc.2014.1901)；[Wharton PDF](https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf)〕 |

### 警告「獎勵會反噬」
- **統合分析**：128 個實驗。參與即給、完成即給、表現即給的實物獎勵都顯著削弱自由選擇下的內在動機（d = −0.40／−0.36／−0.28）；所有「預期中的實物獎勵」皆然。**口頭與資訊性回饋**在支持勝任感（而非控制）時反而正向。〔一手：Deci, Koestner & Ryan (1999). *Psychological Bulletin*, 125(6), 627–668, [doi:10.1037/0033-2909.125.6.627](https://doi.org/10.1037/0033-2909.125.6.627)；[全文 PDF](https://home.ubalt.edu/tmitch/642/articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf)〕
- **對本專案**：現行「完成給基本裝備、寫默想給稀有裝備」已經是 completion-contingent 獎勵，且統計上默想率 84–93% 沒壞，代表對這群人侵蝕不明顯（可能因為裝備價值低、且他們本來就有內在動機）。但 ADR 0006 若把穿戴款式排成明確的天數階梯，就是把獎勵從「順便」升格為「主項」，理論上風險上升。`research-progression-visuals.md` 第一節已討論過視覺獎勵污染問題，本篇補的是：**變化本身不會有這個副作用**，因此順位應在獎勵之前。
- **變動獎賞不補**：`research-habit-retention.md` 結論 3 已明文；本篇的「變化」是**內容形式的變化**，不是**獎勵時機或大小的隨機化**，兩者不要混。

---

## 三、業界怎麼在固定習慣裡做內容輪換（Q3）

| 案例 | 固定的外框 | 輪換的內容 | 節奏層 | 來源 |
|---|---|---|---|---|
| **教會禮儀年＋三年經課表（RCL）** | 每主日同一崇拜結構、每次四段讀經（舊約／詩篇／書信／福音） | 三年一循環、依教會年季節（將臨、大齋、復活）切換主題 | 週＋季＋年 | 〔一手：[Vanderbilt Divinity Library RCL](https://lectionary.library.vanderbilt.edu/)、[FAQ](https://lectionary.library.vanderbilt.edu/faq/)〕 |
| **M'Cheyne 讀經計畫** | 每天四段：兩段舊約＋一段新約＋一段詩篇或福音 | 刻意穿插體裁，避免連續數週卡在同一卷；一年舊約一遍、新約與詩篇兩遍 | 日 | 〔一手：[YouVersion 計畫頁](https://www.bible.com/reading-plans/24-mcheyne-one-year-reading-plan)〕 |
| **Duolingo** | 每天一課、streak、路徑 | 一課內混多種題型（聽說讀寫）；路徑分小單元、單元末有 checkpoint | 日＋單元 | 〔一手：[官方 blog：how Duolingo teaches English](https://blog.duolingo.com/how-duolingo-teaches-english/)、[ways to practice](https://blog.duolingo.com/ways-to-practice-in-duolingo)〕〔二手：[duoplanet 單元與 checkpoint 說明](https://duoplanet.com/duolingo-units-and-checkpoints/)〕 |
| **Hallow** | 每日一集、同一播放器 | 將臨期 Pray25（12/1 起每天解鎖一集、25 天）、大齋期 Pray40（聖灰日到復活節），每年換主題 | 季（限時系列） | 〔一手：[Pray25 FAQ](https://help.hallow.com/en/articles/10167169-hallow-advent-pray25-faq-s)、[Pray40 FAQ](https://help.hallow.com/en/articles/10697582-hallow-lent-pray40-faqs)、[Pray40 頁](https://hallow.com/pray40/)〕 |
| **Calm Dailies** | 每天同一長度、同一入口 | 每天不同主題的 Daily Calm／Daily Move | 日 | 〔一手：[Calm 支援中心](https://support.calm.com/hc/en-us/articles/115005140414-What-are-the-Calm-Dailies-Daily-Meditations-Movement)（前篇已引）〕 |
| **手遊 live-ops** | 核心迴圈不變 | 日常任務／週活動／賽季三層節奏，限時內容 | 日＋週＋季 | 〔二手：[Game Developer：core loop](https://www.gamedeveloper.com/business/why-the-core-gameplay-loop-is-critical-for-game-design)、[Apptica：LiveOps 機制](https://medium.com/@Apptica/liveops-best-practices-mechanics-f31615dcda85)〕 |

**橫向整理**：六個案例全部是「外框固定、內容輪換」，沒有一個靠增加獎勵解決膩。信仰產品（RCL、M'Cheyne、Hallow）與世俗產品（Duolingo、Calm、live-ops）的差別只在節奏層：信仰產品天然有「季」這一層（教會年），世俗產品要自己造賽季。**本專案現況只有日迴圈**：週層（合併日、主日）與卷層（開卷、大事件、完走）都還是空的，而讀經進度本身已經是全教會共用的季節骨架，不必另造。

---

## 四、對照本專案（Q4）

### 數字對得上什麼、對不上什麼
- **對得上**：8/23 週（新約結束、創世記開始）63 章為近 8 週最高，前後週 39／55，方向符合新起點效應。**但只有一個事件、無對照組，是相關不是因果**；出埃及記開卷（8/29 後第二個地標）若再出現高點才算第二筆證據。
- **對得上**：六成近 4 週活躍者完走為 0（data-insights 9/9 查證③），與目標梯度「目標太遠沒有加速」一致。
- **對不上／不確定**：默想均字 17 字是否因「膩」而低，無法從數據分辨（隱私紅線 1 不讀內容）。只能用容器實驗後的**字數形狀變化**當間接證據。
- **不能做的**：任何依默想內容分流、依心情推內容、或顯示「你已 N 天沒變化」的機制，分別踩紅線 1、2、4。

### 三層節奏對應表

| 節奏層 | 現況 | 理論依據 | 最小做法 | 工程量 |
|---|---|---|---|---|
| 日 | 250 天同一容器 | HAP 變化、MAC 注意力、交錯練習 | 情境題視角輪換、選項種類輪換、默想引導題型輪換 | 零（content.js） |
| 週 | 空 | HAP 欣賞、峰終 | 合併日或主日「回顧章」：一題「本週哪一幕最貼近你」，選項＝本週各章場景 | 小（`type` 欄位＋一個模式） |
| 卷 | 只有完走稱號 | 目標梯度、小面積、新起點、峰終 | 「節點章」：出 14 過紅海、出 20 十誡、出 40 會幕；scene 拉長、guide 帶「你從第 1 章走到這裡」、領獎畫面加標記 | 零到小 |

---

## 五、建議排序（最多 5 條，具體可派工）

1. **EXO13-24 批做日層輪換（10/5 開工那批）**：`bible-content-generator` 派工單加一行「本批 12 章中，至少 3 章情境題換視角（人物第一人稱／旁觀小人物／多年後回看）、至少 3 章默想引導改一句式（寫一句禱告／寫一句給人物的話／一個詞形容今天讀到的神）」。零工程，終審照 A-F 清單。驗：該批上線後 4 週，比對輪換章 vs 一般章的默想率與均字（`npm run funnel` 現有口徑，章 key 分組即可）。
2. **出 14 做第一個節點章**：內容側 scene 拉長至 5-6 句、guide.intro 開頭一句回望；程式側只在領獎畫面加一個節點標記（同 popIn）。不加獎勵、不加數值。驗：出 14 當日完成人數 vs 前後三日平均。
3. **`type` 欄位機制＋回顧章**：content 物件加 `type: 'review'`，app.js 依 type 換一個模式（無 baseItem／bonusItem 差異，仍算今日靈修）；11/04 出 23+24 合併日試第一次。先過 `bible-firestore-safety`（`chapters/{key}` 寫入結構不變即可）。驗：該日完成率與選章到確認率。
4. **兩難章與輕日暫緩**：等 1-3 的數據（至少 4 週）再決定。兩難章需要立場配額規則的例外條款，先不動 content-format。
5. **design-principles 補一條「已確認的設計決策」**：獎勵只做資訊性回饋、不做變動獎賞、不把獎勵排成可預期的階梯主項；引本篇第二節與 `research-habit-retention.md` 結論 3。ADR 0006 數值定案時對照。

**不建議**：為了「變化」引入 AI 即時生成的情境（試煉）。它繞過 CUNP1 逐句查驗，變化的代價是內容品質不可控；本篇的所有建議都是**人寫、可終審**的變化。

---

## 六、參考清單

**一手：原始論文**
- Westgate & Wilson (2018). Boring thoughts and bored minds: The MAC model. *Psychological Review*, 125(5), 689–713. https://psycnet.apa.org/doiLanding?doi=10.1037%2Frev0000097 ；PDF https://www.erinwestgate.com/uploads/7/6/4/1/7641726/westgatewilson.psychreview.2018.pdf
- Sheldon & Lyubomirsky (2012). The challenge of staying happier: Testing the HAP model. *PSPB*, 38(5), 670–680. https://journals.sagepub.com/doi/abs/10.1177/0146167212436400 ；PDF https://sonjalyubomirsky.com/wp-content/uploads/2024/03/SBL2012.pdf
- Deci, Koestner & Ryan (1999). Meta-analytic review of extrinsic rewards on intrinsic motivation. *Psychological Bulletin*, 125(6), 627–668. https://doi.org/10.1037/0033-2909.125.6.627
- Kivetz, Urminsky & Zheng (2006). The goal-gradient hypothesis resurrected. *JMR*, 43(1), 39–58. https://journals.sagepub.com/doi/abs/10.1509/jmkr.43.1.39
- Koo & Fishbach (2012). The small-area hypothesis. *Journal of Consumer Research*, 39(3), 493–509. https://www.semanticscholar.org/paper/846c9878f068c05b7ca62d7a9aa7907158c2266c
- Dai, Milkman & Riis (2014). The fresh start effect. *Management Science*, 60(10), 2563–2582. https://pubsonline.informs.org/doi/10.1287/mnsc.2014.1901
- Lally, van Jaarsveld, Potts & Wardle (2010). How are habits formed. *EJSP*, 40(6), 998–1009. https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674
- Wood & Neal (2007). A new look at habits and the habit–goal interface. *Psychological Review*, 114(4), 843–863. https://dornsife.usc.edu/wendy-wood/wp-content/uploads/sites/183/2023/10/wood.neal_.2007psychrev_a_new_look_at_habits_and_the_interface_between_habits_and_goals.pdf
- Rohrer & Taylor (2007). The shuffling of mathematics problems improves learning. *Instructional Science*, 35, 481–498. http://uweb.cas.usf.edu/~drohrer/pdfs/Rohrer&Taylor2007IS.pdf
- Fredrickson & Kahneman (1993). Duration neglect in retrospective evaluations of affective episodes. *JPSP*, 65(1), 45–55；Kahneman, Fredrickson, Schreiber & Redelmeier (1993). When more pain is preferred to less. *Psychological Science*, 4(6), 401–405. https://journals.sagepub.com/doi/10.1111/j.1467-9280.1993.tb00589.x
- Hobson, Schroeder, Risen, Xygalatas & Inzlicht (2018). The psychology of rituals. *PSPR*, 22(3), 260–284. https://journals.sagepub.com/doi/abs/10.1177/1088868317734944
- Csikszentmihalyi (1990). *Flow*. Harper & Row.（專書）
- Brickman & Campbell (1971). Hedonic relativism and planning the good society. In Appley (Ed.), *Adaptation-level theory*. Academic Press.（專書章節，享樂適應原始出處）

**一手：產品與教會官方**
- Vanderbilt Divinity Library, Revised Common Lectionary https://lectionary.library.vanderbilt.edu/ ；FAQ https://lectionary.library.vanderbilt.edu/faq/
- YouVersion, M'Cheyne One Year Reading Plan https://www.bible.com/reading-plans/24-mcheyne-one-year-reading-plan
- Duolingo blog：How Duolingo teaches English https://blog.duolingo.com/how-duolingo-teaches-english/ ；Ways to practice https://blog.duolingo.com/ways-to-practice-in-duolingo
- Hallow：Pray25 FAQ https://help.hallow.com/en/articles/10167169-hallow-advent-pray25-faq-s ；Pray40 FAQ https://help.hallow.com/en/articles/10697582-hallow-lent-pray40-faqs ；Pray40 https://hallow.com/pray40/
- Calm Dailies https://support.calm.com/hc/en-us/articles/115005140414-What-are-the-Calm-Dailies-Daily-Meditations-Movement

**二手**
- duoplanet：Duolingo units & checkpoints https://duoplanet.com/duolingo-units-and-checkpoints/
- Game Developer：core gameplay loop https://www.gamedeveloper.com/business/why-the-core-gameplay-loop-is-critical-for-game-design
- Apptica：LiveOps best practices https://medium.com/@Apptica/liveops-best-practices-mechanics-f31615dcda85

**本專案內部**
- `docs/adr/0001-refocus-2026-08.md`（乏味診斷、第四梯查證數字）
- `data-insights.md` 9/9 摘要（換裝 9 人、完走 0 佔 60%、8/23 週 63 章）
- `design-principles.md` 九條紅線
- `docs/research-habit-retention.md`、`docs/research-progression-visuals.md`
