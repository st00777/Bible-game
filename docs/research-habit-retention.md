# 研究報告：習慣養成 App 的留存機制、「上癮模式」與「數位排毒」——靈修冒險該學什麼、改什麼、不碰什麼

> 調查日期：2026-08-25。針對四個問題：**Q1 業界怎麼讓人維持習慣？**、**Q2 「上癮模式」（Hook Model）的定義、根源與批評**、**Q3 數位排毒／Calm Technology／Digital Wellbeing 對習慣類 App 的意涵**、**Q4 對照本專案（ADR 0001「重新點燃」、視覺成長三原則、design-principles.md 九條紅線）該套用什麼**。
> 來源標註慣例：〔一手〕＝官方 blog／官方說明中心／SEC 文件／原始論文／作者本人；〔二手〕＝訪談整理、社群 wiki、評論文章。凡本次抓取被擋（403）僅靠搜尋摘要者，標「未開啟」。
> 前置閱讀：`docs/adr/0001-refocus-2026-08.md`、`docs/research-progression-visuals.md`、`design-principles.md`、CLAUDE.md「戰略對焦」段。

---

## 〇、先講結論（給趕時間的人）

1. 業界留存機制的共同骨架是「**低門檻每日出席 → 連續計數 → 里程碑慶祝 → 寬恕機制**」；而**寬恕（streak freeze／repair）比懲罰更能留人**，Duolingo 自己的 A/B 數據就是證據。
2. 本專案現況：`state.streak` **只會加、從不歸零**（`bible-game-v2.html` 第 3286 行 `state.streak += r.streakInc`，全檔無日期比對的 reset 邏輯）。所以「🔥 連續 N 天」其實是**累計完成天數**——這意外地就是最寬恕的做法，但名稱與語意不符，玩家看到的「連續」是假的。
3. Hook Model 四階段本專案已經天然具備三個（外部觸發＝教會進度、行動＝讀一章、投入＝寫默想），**唯一沒有的是「變動獎賞」**——而這正是 Skinner 變動比率增強、老虎機、Harris「口袋裡的老虎機」批評的核心。**不要補上它。**
4. 數位排毒／Calm Tech 對本專案的實際意涵不是「不做提醒」，而是「**提醒要在周邊、要由玩家自訂時間、預設關閉**」；證據顯示固定情境線索（implementation intention）比推播更有效且更便宜。
5. 建議排序（詳見第五節）：① 把「連續」改名成誠實的累計語意＋補一個真的、可修復的連續計數；② 書卷完走儀式當里程碑層（已「升」）；③ 「明天什麼時候讀？」的自訂提醒（實作意圖），預設關；④ 每日微變化走 Forest 式「過程本身可視化」；⑤ 明文禁止變動獎賞與排行榜，寫進 design-principles.md。

---

## 一、業界怎麼讓人維持習慣（Q1）

### 1. Duolingo——最多公開數據的教科書案例
- **Streak 定義**：S-1（2021）：「A streak represents the number of days in a row that a learner has used Duolingo… Each day a learner gains XP, their streak gets one day longer.」〔一手：[S-1](https://www.sec.gov/Archives/edgar/data/1562088/000162828021013065/duolingos-1.htm)〕；10-K FY2025 改為「the number of days in a row a lesson is completed」〔一手：[10-K](https://www.sec.gov/Archives/edgar/data/1562088/000162828026012494/duol-20251231.htm)〕。
- **關鍵轉折＝降門檻**：官方 blog〈Improving the streak〉：把 streak 與每日目標脫鉤，「completing just a single lesson each day」即可延續 → Day-14 留存 +3.3%、DAU +1%、新用戶 7 日 streak +19%；一年後過半每日學習者有 ≥7 天 streak（原約 1/3）。設計理由原句：「lowering the barriers to building a consistent daily habit is more important… than how much you learn each day」。〔一手：[blog](https://blog.duolingo.com/improving-the-streak/)〕
- **Streak Freeze（寬恕）**：S-1 定義「maintains a learner's streak even if they miss a day」；免費版可存 2 個〔一手：[官方 blog](https://blog.duolingo.com/how-to-keep-your-streak-on-vacation/)〕；一個 freeze 只擋一天〔一手：[Duolingo 官方 X](https://x.com/duolingo/status/1302688693262508033)〕；價格 200 gems、Streak Society 可裝 5 個〔二手：[Fandom wiki](https://duolingo.fandom.com/wiki/Shop/Streak_freeze)；官方 help center 條目 [What is a streak?](https://support.duolingo.com/hc/en-us/articles/204980880-What-is-a-streak-) 本次 403 未開啟〕。
- **寬恕有數據**：〈The Duolingo Streak Uses Habit Research〉：freeze 上限加倍 → DAU +0.38%；新用戶看到 streak 動畫 → 7 日活躍 +1.7%；達 7 日 streak 者完成課程機率 3.6 倍。〔一手：[blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)〕〈How streaks keep learners committed〉：Weekend Amulet 一週後回訪 +4%、Streak Wager Day-7 留存 +14%；同文指出「learners who binge… were much more likely to abandon the app」。〔一手：[blog](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)〕
- **里程碑動畫**：一週／一月／100 天／一年做大慶祝；吉祥物改鳳凰意象（火焰隱喻非跨文化通用）；「more people are keeping their streaks alive」。〔一手：[blog](https://blog.duolingo.com/streak-milestone-design-animation/)〕
- **Leagues／排行榜**：S-1：每週 30 人一組、Bronze→Diamond 十級、前 10 名晉級；上線後「increased the overall average time spent learning… by almost 20%」。〔一手：S-1 同上；[官方 blog](https://blog.duolingo.com/duolingo-leagues-leaderboards/)〕前 CPO Jorge Mazal：排行榜學習時間 +17%、高投入者 3 倍；推播量「could not increase… without strong justification and CEO approval」。〔二手：[Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)〕
- **推播文案**：「These reminders don't seem to be working. We'll stop sending them for now.」——**找不到官方一手出處**，最早公開紀錄是 2018 年截圖〔二手：[@shitduosays](https://x.com/shitduosays/status/953673707276382209)〕。官方自嘲頁「Duolingo Push」（Encouraging／Disappointed／Passive-Aggressive Duo）〔一手：[push.duolingo.com](https://www.push.duolingo.com/)〕。推播文案選擇用 bandit 演算法＋「遺忘曲線」式間隔避免疲乏（KDD 2020）〔一手：[blog](https://blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/)〕；同意率文案 A/B：德語「notifications are proven to foster learning success」+8%，西語複製失敗〔一手：[blog](https://blog.duolingo.com/copy-testing-experiments/)〕。
- **規模**：Q4 FY2024 股東信：「Over 10 million of our users now maintain streaks of one year or longer, and one-third of our DAUs have a Friend Streak.」〔一手：[股東信](https://www.sec.gov/Archives/edgar/data/1562088/000156208825000039/q4fy24duolingo12-31x24shar.htm)〕；Friend Streak 有共享 streak 者完成當日課程機率 +22%〔一手：[blog](https://blog.duolingo.com/friend-streak/)〕。
- **漏一天**：歸零，除非 freeze 自動用掉或付費 Repair。官方立場：寬恕機制明確提升留存。

### 2. Habitica——懲罰型 RPG
- 官方 FAQ：「Missing Dailies causes you to lose HP」；Party（≤30 人）是「hold yourself accountable」的主要手段；Boss Quest 中隊友漏做會讓全隊受傷；寬恕＝「Pause Damage」（舊名 Rest in the Inn），但參與 Quest 時仍受隊友連累。〔一手：[FAQ 原始檔](https://raw.githubusercontent.com/HabitRPG/habitica/develop/website/common/locales/en/faq.json)、[網站 FAQ](https://habitica.com/static/faq)〕HP 歸零掉一級、失金幣與一件裝備〔二手：[Death Mechanics wiki](https://habitica.fandom.com/wiki/Death_Mechanics)，本次 403〕。
- **漏一天**：懲罰型，且社交連帶（連累隊友）——這正是 design-principles 紅線 9 要避免的群體壓力。

### 3. Forest——懲罰綁「單次行為」，不綁「每天」
- 官網：「every minute of concentration grows a tree」，中途離開「the tree dies」；Plant Together「If anyone gives up, the whole forest falls」；已資助超過 200 萬棵真樹（Trees for the Future）。〔一手：[forestapp.cc](https://www.forestapp.cc/)〕
- 官方 X：不開權限「your tree will not die」——懲罰是使用者自己選擇開啟的。〔一手：[@forestapp_cc](https://x.com/forestapp_cc/status/1255331240045162498)〕
- **漏一天**：無日 streak 懲罰；沒有找到官方設計理由聲明。

### 4. YouVersion Bible App——同屬信仰產品，選最寬鬆的出席型
- 兩種 streak：**App Open Streak**「no matter what action you have taken」與 Guided Scripture Streak（完成 Daily Refresh）；漏一天「reset to 0」；官方理由：「a consistent daily rhythm of seeking intimacy with God has the power to transform lives」。〔一手：[Streak (Android)](https://help.youversion.com/l/en/article/oyriuwt1fn-streak-android)〕無 freeze，但有「Streak Restoration Form」人工申訴。〔一手：[Streak FAQ (iOS)](https://help.youversion.com/l/en/article/wbxo56yjs1-streak-faq-ios)〕
- Badges：完成計畫、分享、劃線、節期挑戰；多數可累計至 1,000，**與 streak 分開、中斷不歸零**。〔一手：[Badges](https://help.youversion.com/l/en/article/l735e1eqju-i-os-badges)〕
- Plans with Friends：看得到彼此進度＋私密討論；官方稱有一位好友即顯著提高投入。〔一手：[2017 公告](https://blog.youversion.com/2017/11/youversion-bible-app-announcing-plans-with-friends-2017/)、[top hacks](https://youversion.com/news/youversion-shares-its-top-hacks-for-more-consistent-bible-engagement)〕Verse of the Day 推播可自選時間。〔一手：[VOTD 通知](https://help.youversion.com/l/en/article/98w128r3jg-votd-notification-android)〕

### 5. Finch——「溫柔」路線的代表
- 〈Our Approach〉：「We use streaks, gentle reminders, and mini-goals… Self-care isn't about big, dramatic changes」。〔一手：[help.finchcare.com](https://help.finchcare.com/hc/en-us/articles/37935669335309-Our-Approach-to-Self-Care)〕
- Streak＝開 app 即算；漏一天可用 Rainbow Stones 修復；每 3 次冒險送一個 Repair Saver（最多存 2）；Pause Mode 期間 streak 凍結、功能隱藏「to help you focus on rest」。〔一手：[Understanding Streaks](https://help.finchcare.com/hc/en-us/articles/37780736136205-Understanding-Streaks)、[Pause Mode](https://help.finchcare.com/hc/en-us/articles/37936144770701-Pause-Mode)〕
- 注意：「Finch does not punish」這句**只見第三方評論**〔二手：[Engadget](https://www.engadget.com/apps/this-self-care-virtual-pet-is-helping-me-get-my-act-together-160027169.html)〕，官方確實有 streak，只是門檻極低＋免費修復。

### 6. Headspace／Calm——「鼓勵而非評判」的官方措辭
- Headspace run streak：24 小時內完成一次冥想 +1；可向客服申請還原。〔一手：[run streak](https://help.headspace.com/hc/en-us/articles/215730567-How-does-the-run-streak-feature-work)、[reset 處理](https://help.headspace.com/hc/en-us/articles/360033672654-My-run-streak-reset-What-can-I-do)〕Andy Puddicombe：「The run streak is a form of encouragement rather than judgment… We all miss days, and that's okay… The benefit of meditation does not come from a number on the screen」。〔一手：[headspace.com](https://www.headspace.com/articles/building-a-meditation-practice)〕
- Calm：Daily Calm 等每日 10 分鐘節目「to help you build a consistent mindfulness habit」〔一手：[Calm Dailies](https://support.calm.com/hc/en-us/articles/115005140414-What-are-the-Calm-Dailies-Daily-Meditations-Movement)〕；斷掉可自助補登過去日期，streak 自動重算〔一手：[Correct a Broken Streak](https://support.calm.com/hc/en-us/articles/360008704893-How-to-Correct-a-Broken-Streak)〕。

### 橫向整理：漏一天怎麼辦
| 產品 | 漏一天 | 寬恕機制 | 官方理由 |
|---|---|---|---|
| Duolingo | 歸零 | Freeze×2 免費、付費 Repair | 有 A/B 數據：寬恕→留存↑ |
| Habitica | 扣 HP、連累隊友 | Pause Damage | 無 |
| Forest | 無（懲罰在單次專注） | 不開權限＝不死 | 無 |
| YouVersion | 歸零 | 人工申訴表單 | 「daily rhythm… transform lives」 |
| Finch | 可修 | 免費 Repair、Pause Mode | 「gentle… small steps」 |
| Headspace | 歸零 | 客服還原 | 「encouragement rather than judgment」 |
| Calm | 歸零 | 自助補登 | 無 |
| **靈修冒險（現況）** | **不歸零（從未實作 reset）** | 不需要 | 無（未曾明文） |

**共同骨架**：低門檻出席 → 連續計數 → 里程碑慶祝 → 寬恕機制。學術對照：Silverman & Barasch (2023, *JCR*) 七項實驗——被凸顯的 streak 提高後續參與、中斷降低之，**可修復時負面效應減弱**。〔一手：[JCR](https://academic.oup.com/jcr/article-abstract/49/6/1095/6623414)〕Lally et al. (2010)：習慣自動化中位數 66 天，**漏一天不實質影響習慣形成**。〔一手：[EJSP](https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674)〕

---

## 二、「上癮模式」：Hook Model、Skinner 根源與批評（Q2）

### Hook Model（Nir Eyal, *Hooked*, 2014）
四階段，Eyal 自述〔一手：[How to Manufacture Desire](https://www.nirandfar.com/how-to-manufacture-desire/)、[Hooked 總覽](https://www.nirandfar.com/hooked/)〕：
1. **Trigger**「the spark plug in the Hooked Model」——external（通知、圖示）與 internal（情緒聯想，多次循環後形成）。
2. **Action**——沿 Fogg 模型「two pulleys of human behavior – motivation and ability」。
3. **Variable Reward**「one of the most powerful tools that companies use to hook users」；tribe／hunt／self 三型出自書中第 4 章（本次未在作者網頁逐字驗證）。
4. **Investment**——使用者投入「time, data, effort, social capital or money」，為下一次 hook 預載。

**Manipulation Matrix**（Eyal 自己的倫理篩：會不會自己用？有沒有實質改善生活？）：Facilitator／Peddler／Entertainer／Dealer；「Creating a product that the designer does not believe improves the user's life and which the maker would not use is exploitation.」〔一手：[The Art of Manipulation](https://www.nirandfar.com/the-art-of-manipulation/)〕本專案依此屬 Facilitator（James 自己每天玩、相信有益）——但 Eyal 的篩子只問「動機」，不問「手段」，這是批評者的主攻點。

### Skinner 根源
- Ferster & Skinner (1957) *Schedules of Reinforcement*（原書無公開全文）：變動比率（variable ratio）產生最高且最抗消退的反應率，教科書以老虎機為例：「she never knows when the next reinforcement is coming」。〔二手：[Lumen Learning](https://courses.lumenlearning.com/waymaker-psychology/chapter/reading-reinforcement-schedules/)〕
- Schüll《Addiction by Design》(2012)：機台賭博「has less to do with the competitive thrill of winning than with the pull of 'the machine zone'」，整套設計為「maximum 'time on device'」。〔一手：[Princeton UP](https://press.princeton.edu/books/paperback/9780691278285/addiction-by-design)、[作者官網](https://www.natashadowschull.org/addiction-by-design/)〕
- Habitica 的隨機掉寶、遊戲的 loot box、社群動態牆的「下拉更新」都是變動比率的應用。**本專案的裝備是固定掉落（完成→基本裝備，寫默想→稀有裝備），不是變動獎賞**——這是一條已經守住、但沒有明文的界線。

### 批評
- **Eyal 自己的轉向**：《Indistractable》(2019) 主張「tech is not addictive」，過度使用是分心／自主感缺失問題，「believing such nonsense is dangerous」。〔一手：[You're Not Addicted](https://www.nirandfar.com/technology-addiction-or-not/)、[影片頁](https://www.nirandfar.com/technology-addiction-video/)〕批評：NYT Bowles〈Addicted to Screens? That's Really a You Problem〉(2019-10-06)〔[NYT](https://www.nytimes.com/2019/10/06/technology/phone-screen-addiction-tech-nir-eyal.html)，本次未開啟〕；Axbom：「Book 2 is written to help people get un-hooked… Meanwhile, the key selling point for book 1 has been to help companies create habit-forming products」〔二手：[axbom.com](https://axbom.com/nir-eyal-habit-danger/)〕。
- **Tristan Harris**：2013 Google 內部簡報〈A Call to Minimize Distraction & Respect Users' Attention〉〔二手：[CNBC](https://www.cnbc.com/2018/05/10/google-employee-tristan-harris-internal-2013-presentation-warnings.html)、[Scribd 副本](https://de.scribd.com/document/378841682/A-Call-to-Minimize-Distraction-Respect-Users-Attention-by-Tristan-Harris)〕；2016〈How Technology is Hijacking Your Mind〉〔一手：[Medium](https://medium.com/thrive-global/how-technology-hijacks-peoples-minds-from-a-magician-and-google-s-design-ethicist-56d62ef5edf3)（本次 403；[UW 課程鏡像 PDF](https://courses.cs.washington.edu/courses/cse481p/23sp/readings/W3S1/how-technology-hijacks-peoples-minds-TristanHarris.pdf)）〕；TED 2017〔一手：[TED](https://www.ted.com/talks/tristan_harris_how_a_handful_of_tech_companies_control_billions_of_minds_every_day)〕。
- **Center for Humane Technology**（2018，Harris／Raskin／Fernando）〔一手：[Who we are](https://www.humanetech.com/who-we-are)〕；**Ledger of Harms** 彙整同儕審查研究成七大類（下一代、理解世界、注意力與認知、身心健康、社交關係、政治、系統性壓迫）〔一手：[ledger.humanetech.com](https://ledger.humanetech.com/)〕。
- **Adam Alter《Irresistible》(2017)**：行為成癮的六成分——目標、回饋、進度、升級、懸念、社交互動；核心在「無停止線索（stopping cues）」：「Tech companies have learned to short-circuit our own personal 'off' switches」。〔一手：[JCR 訪談](https://consumerresearcher.com/adam-alter-irresistable)、[TED 2017](https://www.ted.com/talks/adam_alter_why_our_screens_make_us_less_happy)；六成分目次〔二手：[圖書館 TOC](https://search.schlowlibrary.org/Record/397609/TOC)〕〕
- **Streak 的損失趨避根源**：Kahneman & Tversky (1979) 前景理論——損失比等額收益更痛。〔一手：[Econometrica](https://www.econometricsociety.org/publications/econometrica/1979/03/01/prospect-theory-analysis-decision-under-risk)〕Streak 正是把「不做」包裝成「失去」。

**對本專案的翻譯**：Alter 六成分中本專案已有目標（今日章節）、回饋（AI 回應）、進度（書架）、社交互動（曠野呼聲）；**沒有升級難度、沒有懸念、沒有變動獎賞、有天然停止線索（一天一章，讀完就結束）**。這不是缺陷，是靈修工具該有的形狀。

---

## 三、數位排毒、Calm Technology、Digital Wellbeing（Q3）

| 概念 | 定義與來源 | 對習慣類 App 的意涵 | 批評 |
|---|---|---|---|
| **Calm Technology**（Weiser & Brown, PARC 1995/96） | 「Designs that encalm and inform meet two human needs not usually met together」；技術應在注意力**周邊**、需要時才進中心、然後退回。〔一手：[Designing Calm Technology](https://calmtech.com/papers/designing-calm-technology)、[The Coming Age](https://calmtech.com/papers/coming-age-calm-technology)〕 | 每日「你還沒靈修」推播正是它反對的中心搶奪；相容做法＝打開 app 一眼看到狀態、通知 opt-in 且預設關 | 為 IoT／環境運算設計，對「本身就需要專注」的活動（讀經）只能部分適用 |
| **Amber Case 八原則**（2015） | 「technology should require the smallest possible amount of attention」「the right amount of technology is the minimum needed」；「Getting a loud buzz for every email… quickly makes every buzz meaningless.」〔一手：[O'Reilly](https://www.oreilly.com/content/principles-calm-technology-we-are-not-bad-at-technology-technology-is-bad-at-us/)、[caseorganic.com](https://www.caseorganic.com/post/principles-of-calm-technology)〕Calm Tech Institute 認證要求非關鍵通知**預設關閉**〔一手：[calmtech.institute](https://www.calmtech.institute/calm-tech-principles)；二手：[IEEE Spectrum](https://spectrum.ieee.org/calm-tech)〕 | 提醒數量與音量的上限標準 | 認證是商業產品，標準由單一組織制定 |
| **Time Well Spent → CHT**（2013–2018） | Harris 的運動；Zuckerberg 2018-01-11 宣布 FB 目標改為「time well spent」／「meaningful social interactions」〔一手：[Zuckerberg 貼文](https://www.facebook.com/zuck/posts/10104413015393571)〕 | 「衡量有意義的互動而非時間」——與本專案核心句（本週幾人完成靈修並寫默想）同構 | 被收編：「What began as a social movement has become a marketing strategy」〔二手：[Quartz](https://qz.com/1347231/technologys-time-well-spent-movement-has-lost-its-meaning)〕。考驗＝你的指標允不允許 engagement 下降 |
| **Digital Wellbeing / Screen Time**（Google/Apple 2018） | Android：app timer、Bedtime／Focus mode〔一手：[Android Help](https://support.google.com/android/answer/9346420?hl=en)、[Google blog](https://www.blog.google/outreach-initiatives/digital-wellbeing/find-your-balance-new-digital-wellbeing-tools/)〕；Apple iOS 12：App Limits、Downtime、通知分組〔一手：[Apple Newsroom 2018-06-04](https://www.apple.com/newsroom/2018/06/ios-12-introduces-new-features-to-reduce-interruptions-and-manage-screen-time/)〕 | 玩家可在 OS 層整批靜音你的推播；依賴推播的留存策略會**靜默失效**。這些工具只管「量」，對 5 分鐘短 session 的 app 中性 | 廠商一邊出儀表板、一邊維持 engagement 預設 |
| **Digital detox** | Oxford 2013 收錄：「a period of time during which a person refrains from using electronic devices…」〔一手：[OALD](https://www.oxfordlearnersdictionaries.com/definition/english/digital-detox)〕；Radtke et al. (2022) 系統性回顧 21 篇：多數結果互相矛盾，僅憂鬱症狀一致改善〔一手：[Mobile Media & Communication](https://journals.sagepub.com/doi/10.1177/20501579211028647)〕 | 玩家的「排毒週」在後台看起來就是流失；累計成就絕不能因此歸零（ADR 0001 原則 3 已守住） | 效果證據薄弱 |

**通知的真實證據（比直覺複雜）**：
- Pielot & Rello (2017) 24 小時無推播：較專注但焦慮、社交連結感降。〔一手：[arXiv](https://arxiv.org/abs/1612.02314)〕
- Dekker et al. (2024) 預註冊 RCT N=205，關一週通知：對查看頻率、螢幕時間、失控感**無效**，FoMO 反升。〔一手：[Media Psychology](https://www.tandfonline.com/doi/full/10.1080/15213269.2024.2334025)〕
- JMIR 2024 系統性回顧：「prompts and cues」對習慣形成無顯著效果，且提醒可能造成依賴、妨礙自動化。〔一手：[PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11161714/)〕
- 反之，**固定情境線索**（Wood & Neal 2007；Gardner, Lally & Wardle 2012）與 **implementation intentions**（Gollwitzer 1999，if-then 計畫使實行率倍增）證據充分。〔一手：[Wood & Neal](https://dornsife.usc.edu/wendy-wood/wp-content/uploads/sites/183/2023/10/wood.neal_.2007psychrev_a_new_look_at_habits_and_the_interface_between_habits_and_goals.pdf)、[BJGP](https://bjgp.org/content/62/605/664)、[Gollwitzer](https://www.prospectivepsych.org/sites/default/files/pictures/Gollwitzer_Implementation-intentions-1999.pdf)〕

**信仰 App 的專屬張力（皆二手／評論）**：RELEVANT：「Your spiritual growth isn't measured by consecutive days in an app—it's measured by actual transformation.」〔[RELEVANT](https://relevantmagazine.com/faith/your-bible-app-streak-is-impressive-but-are-you-actually-learning-anything/)〕；America Magazine：演算法不能取代屬靈指導〔[America](https://www.americamagazine.org/faith/2021/11/24/hallow-prayer-app-241910/)〕；Doxa 一句話講完兩派：「Critics—usually people who already read their Bible daily—call it gamification, while people whose habit was built on it call it the first time they ever read the Bible for thirty days in a row」〔[Doxa](https://doxa.app/blog/prayer-app-comparison)〕。未找到 Christianity Today／Plough／TGC 的專文，視為缺口而非不存在。

---

## 四、對照本專案：三張表（Q4）

**立場前提**（ADR 0001）：目的＝重新點燃核心 12-15 人；視覺成長三原則＝出席驅動／雙層節奏／累計不歸零；乏味診斷＝流程可預期＋內容同質＋進度失去意義，**不是孤獨**；design-principles 紅線 2（系統不主動介入）、紅線 4（不訓練自我監控）、紅線 5（夜間更輕）、紅線 9（不列預設分享）。

**根本張力一句話**：業界留存機制的引擎是**損失趨避＋變動獎賞**（Kahneman & Tversky；Skinner），而屬靈操練的前提是**自由與真誠**——被操控出來的出席不是靈修。Headspace 那句「The benefit of meditation does not come from a number on the screen」對本專案同樣成立。因此篩選標準不是「有沒有效」，而是「**它靠什麼起作用**」：靠降低摩擦、靠肯定、靠記錄→可用；靠恐懼失去、靠隨機刺激、靠比較→不用。

### 表 A：可直接套用
| 機制 | 業界對應 | 為何相容 |
|---|---|---|
| 最低門檻出席（完成一章即算） | Duolingo「a single lesson」〔[一手](https://blog.duolingo.com/improving-the-streak/)〕；YouVersion App Open Streak〔[一手](https://help.youversion.com/l/en/article/oyriuwt1fn-streak-android)〕 | 已是現況；與「出席驅動、不評默想品質」完全一致 |
| 累計成就永不歸零 | YouVersion Badges 與 streak 分離〔[一手](https://help.youversion.com/l/en/article/l735e1eqju-i-os-badges)〕；Silverman & Barasch「可修復則負面減弱」〔[一手](https://academic.oup.com/jcr/article-abstract/49/6/1095/6623414)〕 | ADR 0001 原則 3；現況 `streak` 從不歸零已是最極端版本 |
| 里程碑大慶祝（7／30／100 天、書卷完走） | Duolingo 里程碑動畫〔[一手](https://blog.duolingo.com/streak-milestone-design-animation/)〕 | 已「升」為書卷完走儀式；靠肯定而非恐懼 |
| 「鼓勵而非評判」的計數文案 | Headspace〔[一手](https://www.headspace.com/articles/building-a-meditation-practice)〕、Finch〔[一手](https://help.finchcare.com/hc/en-us/articles/37935669335309-Our-Approach-to-Self-Care)〕 | 紅線 3 冷框架 |
| 天然停止線索（一天一章） | Alter「stopping cues」〔[一手](https://consumerresearcher.com/adam-alter-irresistable)〕 | 已具備；不要加「再讀一章？」誘導 |

### 表 B：改造後套用
| 機制 | 業界對應 | 改造方式與理由 |
|---|---|---|
| 連續計數（streak） | Duolingo／YouVersion | **現況是假連續**（只加不減）。改為：主顯示「累計 N 天」誠實命名；連續計數另算、可自然修復（補讀當日即續，本專案已允許補讀過去章節）——不做付費／道具式 freeze，因為那把「寬恕」商品化 |
| 提醒 | Duolingo 推播、YouVersion VOTD 自選時間〔[一手](https://help.youversion.com/l/en/article/98w128r3jg-votd-notification-android)〕 | 改為 **implementation intention**：完成後問一句「明天什麼時候讀？」由玩家自訂時間，預設關，22:00–05:00 不發（紅線 5）；不用被動攻擊文案（紅線 3）；證據：Gollwitzer 1999、JMIR 2024 顯示系統推播效果弱 |
| 每日微變化 | Forest 樹隨 session 長〔[一手](https://www.forestapp.cc/)〕；Finch 能量→冒險 | 綁「過程」而非「獎品」：讀經步驟推進時場景／化身有可見變化，不是完成後掉寶 |
| Friend Streak／Plans with Friends | Duolingo〔[一手](https://blog.duolingo.com/friend-streak/)〕、YouVersion〔[一手](https://blog.youversion.com/2017/11/youversion-bible-app-announcing-plans-with-friends-2017/)〕 | **暫不做**（診斷非孤獨、冰箱）；若日後解凍，只能是具名雙方同意的「同行」，不可有 nudge、不可預設分享（紅線 9） |
| Pause Mode | Finch〔[一手](https://help.finchcare.com/hc/en-us/articles/37936144770701-Pause-Mode)〕 | 本專案不需要（不歸零就不需暫停），但可借它的**語言**：「休息也是節奏的一部分」給缺席 4 週者的回歸畫面用（守門 2 的人名清單） |

### 表 C：不該套用
| 機制 | 業界對應 | 為何拒絕 |
|---|---|---|
| 變動獎賞／隨機掉寶 | Hook Model 第 3 階段〔[一手](https://www.nirandfar.com/how-to-manufacture-desire/)〕、Habitica Drops、Skinner 變動比率 | 這是老虎機引擎（Schüll）；靈修的「獎賞」是神的話，不是機率 |
| 排行榜／聯賽 | Duolingo Leagues +20% 時間〔[一手](https://www.sec.gov/Archives/edgar/data/1562088/000162828021013065/duolingos-1.htm)〕 | 紅線 9；教會場景的屬靈表現壓力；乏味診斷非孤獨 |
| 懲罰型 streak／連累隊友 | Habitica HP、Boss Quest〔[一手](https://habitica.com/static/faq)〕 | 損失趨避驅動；Lally 2010 證明漏一天無害，懲罰只是製造焦慮 |
| 付費 freeze／repair | Duolingo Shop〔[一手](https://blog.duolingo.com/how-to-keep-your-streak-on-vacation/)〕 | 把恩典賣錢 |
| 被動攻擊／愧疚推播 | 「These reminders don't seem to be working」〔二手〕、Duolingo Push〔[一手](https://www.push.duolingo.com/)〕 | 紅線 2、3；Calm Tech「minimum attention」 |
| 以 time-on-app／開啟數為指標 | Schüll「time on device」；TWS 收編教訓 | 核心句已定為「完成靈修並寫默想」；不倒退 |
| 升級難度、懸念、無限捲動 | Alter 六成分 | 一天一章的停止線索是資產 |

---

## 五、建議排序（最多 5 條，具體可派工）

1. **把「🔥 連續」改成誠實語意，並補一個真的連續計數**（小改，先做）。現況 `state.streak` 從未歸零（`bible-game-v2.html` L3286，無 reset），UI 卻寫「連續 N 天」。做法：主標籤改「累計 N 天」（永不歸零，符合 ADR 原則 3）；`core.js` 新增純函式從 `completed` 日期算真實 best/current run（`ntFinalePersonal()` L4463 已有雛形），補測試；成就 `streak_3/7/14/30` 改綁真實連續、達成後永久保留。依據：Silverman & Barasch 2023、YouVersion 雙軌。
2. **書卷完走儀式＝里程碑層**（已「升」，本報告只加約束）：形式參考 Duolingo 里程碑「當 power-up 對待」，內容用該卷代表經文；**不**加倒數、**不**做「差 N 章就完走」催促。依據：Duolingo milestone blog、Headspace「encouragement rather than judgment」。
3. **「明天什麼時候讀？」自訂提醒，預設關**（推播議題的具體提案，供「留・另議」使用）：完成畫面加一個可跳過的時段選擇，寫入本機；提醒文案冷框架、夜間不發、連續 3 次未回應自動停止並告知（不是被動攻擊，是尊重）。優先於任何系統決定的推播時間。依據：Gollwitzer 1999；Dekker 2024／JMIR 2024 顯示系統推播效果弱；Calm Tech 認證「非關鍵通知預設關」。
4. **每日微變化綁「讀經過程」而非「完成獎品」**（視覺成長主菜的設計約束）：導讀步驟每推進一步，場景／化身有一格可見變化（Forest 模式），完成時不再多掉一個東西。避免把裝備掉落擴張成隨機系統。依據：Forest；Deci 1999「非預期獎勵不削弱、表現綁定削弱」（見 progression-visuals 第一節）。
5. **把「不做什麼」寫進 design-principles.md 第十條**：不做變動獎賞、不做排行榜、不做懲罰型 streak、不賣寬恕、不用愧疚推播、不以開啟數／停留時間為指標。一句話版本：「**我們只用降低摩擦、肯定與記錄來留人；不用恐懼、機率與比較。**」依據：Hook Model／Skinner／Schüll／CHT／Alter 整體。

**不建議做（本輪明確否決）**：Friend Streak／Plans with Friends（冰箱維持）、任何 freeze 道具、Duolingo 式推播文案實驗。

---

## 六、參考清單

**一手：產品官方**
- Duolingo S-1 (2021) https://www.sec.gov/Archives/edgar/data/1562088/000162828021013065/duolingos-1.htm
- Duolingo 10-K FY2025 https://www.sec.gov/Archives/edgar/data/1562088/000162828026012494/duol-20251231.htm
- Duolingo Q4 2021 股東信 https://www.sec.gov/Archives/edgar/data/1562088/000156208822000033/duolingo_q4-2021xshareho.htm ；Q4 FY2024 https://www.sec.gov/Archives/edgar/data/1562088/000156208825000039/q4fy24duolingo12-31x24shar.htm
- Duolingo blog：Improving the streak https://blog.duolingo.com/improving-the-streak/ ；Streak uses habit research https://blog.duolingo.com/how-duolingo-streak-builds-habit/ ；Streaks keep learners committed https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/ ；Milestone animation https://blog.duolingo.com/streak-milestone-design-animation/ ；Leagues https://blog.duolingo.com/duolingo-leagues-leaderboards/ ；Vacation freeze https://blog.duolingo.com/how-to-keep-your-streak-on-vacation/ ；Friend Streak https://blog.duolingo.com/friend-streak/ ；Notification bandit https://blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/ ；Copy testing https://blog.duolingo.com/copy-testing-experiments/ ；Duolingo Push https://www.push.duolingo.com/
- Habitica FAQ https://habitica.com/static/faq （原始檔 https://raw.githubusercontent.com/HabitRPG/habitica/develop/website/common/locales/en/faq.json ）
- Forest https://www.forestapp.cc/ ；官方 X https://x.com/forestapp_cc/status/1255331240045162498
- YouVersion help：Streak https://help.youversion.com/l/en/article/oyriuwt1fn-streak-android ；Streak FAQ https://help.youversion.com/l/en/article/wbxo56yjs1-streak-faq-ios ；Badges https://help.youversion.com/l/en/article/l735e1eqju-i-os-badges ；Plans with Friends https://blog.youversion.com/2017/11/youversion-bible-app-announcing-plans-with-friends-2017/ ；VOTD https://help.youversion.com/l/en/article/98w128r3jg-votd-notification-android
- Finch help：Approach https://help.finchcare.com/hc/en-us/articles/37935669335309-Our-Approach-to-Self-Care ；Streaks https://help.finchcare.com/hc/en-us/articles/37780736136205-Understanding-Streaks ；Pause Mode https://help.finchcare.com/hc/en-us/articles/37936144770701-Pause-Mode
- Headspace：Run streak https://help.headspace.com/hc/en-us/articles/215730567-How-does-the-run-streak-feature-work ；Building a practice https://www.headspace.com/articles/building-a-meditation-practice
- Calm：Dailies https://support.calm.com/hc/en-us/articles/115005140414-What-are-the-Calm-Dailies-Daily-Meditations-Movement ；Broken streak https://support.calm.com/hc/en-us/articles/360008704893-How-to-Correct-a-Broken-Streak

**一手：Hook Model 與批評**
- Eyal：How to Manufacture Desire https://www.nirandfar.com/how-to-manufacture-desire/ ；Hooked https://www.nirandfar.com/hooked/ ；Manipulation Matrix https://www.nirandfar.com/the-art-of-manipulation/ ；Not addicted https://www.nirandfar.com/technology-addiction-or-not/ ；Indistractable https://www.nirandfar.com/indistractable/
- Schüll, Addiction by Design https://press.princeton.edu/books/paperback/9780691278285/addiction-by-design
- Harris TED 2017 https://www.ted.com/talks/tristan_harris_how_a_handful_of_tech_companies_control_billions_of_minds_every_day ；CHT https://www.humanetech.com/who-we-are ；Ledger of Harms https://ledger.humanetech.com/
- Alter 訪談 https://consumerresearcher.com/adam-alter-irresistable ；TED https://www.ted.com/talks/adam_alter_why_our_screens_make_us_less_happy
- Kahneman & Tversky 1979 https://www.econometricsociety.org/publications/econometrica/1979/03/01/prospect-theory-analysis-decision-under-risk
- Silverman & Barasch 2023, JCR https://academic.oup.com/jcr/article-abstract/49/6/1095/6623414

**一手：Calm Tech／Wellbeing／習慣科學**
- Weiser & Brown 1995/96 https://calmtech.com/papers/designing-calm-technology ；https://calmtech.com/papers/coming-age-calm-technology
- Amber Case https://www.oreilly.com/content/principles-calm-technology-we-are-not-bad-at-technology-technology-is-bad-at-us/ ；Calm Tech Institute https://www.calmtech.institute/calm-tech-principles
- Zuckerberg 2018-01-11 https://www.facebook.com/zuck/posts/10104413015393571
- Google Digital Wellbeing https://support.google.com/android/answer/9346420?hl=en ；Apple Screen Time https://www.apple.com/newsroom/2018/06/ios-12-introduces-new-features-to-reduce-interruptions-and-manage-screen-time/
- Radtke et al. 2022 https://journals.sagepub.com/doi/10.1177/20501579211028647
- Pielot & Rello 2017 https://arxiv.org/abs/1612.02314 ；Dekker et al. 2024 https://www.tandfonline.com/doi/full/10.1080/15213269.2024.2334025 ；JMIR 2024 https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11161714/
- Lally et al. 2010 https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674 ；Gardner et al. 2012 https://bjgp.org/content/62/605/664 ；Gollwitzer 1999 https://www.prospectivepsych.org/sites/default/files/pictures/Gollwitzer_Implementation-intentions-1999.pdf

**二手**
- Lenny's Newsletter（Mazal） https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth
- Duolingo Fandom：Streak freeze https://duolingo.fandom.com/wiki/Shop/Streak_freeze
- @shitduosays 2018 https://x.com/shitduosays/status/953673707276382209
- Lumen Learning 增強時程 https://courses.lumenlearning.com/waymaker-psychology/chapter/reading-reinforcement-schedules/
- Axbom on Eyal https://axbom.com/nir-eyal-habit-danger/ ；NYT Bowles 2019 https://www.nytimes.com/2019/10/06/technology/phone-screen-addiction-tech-nir-eyal.html
- CNBC on Harris 2013 deck https://www.cnbc.com/2018/05/10/google-employee-tristan-harris-internal-2013-presentation-warnings.html ；Quartz TWS https://qz.com/1347231/technologys-time-well-spent-movement-has-lost-its-meaning ；IEEE Spectrum Calm Tech https://spectrum.ieee.org/calm-tech
- RELEVANT https://relevantmagazine.com/faith/your-bible-app-streak-is-impressive-but-are-you-actually-learning-anything/ ；America https://www.americamagazine.org/faith/2021/11/24/hallow-prayer-app-241910/ ；Doxa https://doxa.app/blog/prayer-app-comparison ；Engadget on Finch https://www.engadget.com/apps/this-self-care-virtual-pet-is-helping-me-get-my-act-together-160027169.html

**未能驗證／注意**：Duolingo support.duolingo.com 全站 403；「These reminders don't seem to be working」無官方出處；Hook Model tribe/hunt/self 與 Alter 六成分原文措辭未逐字核對；Ferster & Skinner 1957 無公開全文。
