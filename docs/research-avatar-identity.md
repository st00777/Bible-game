# 研究：角色定位＝分身還是旅伴（2026-09-08）

## 一句話結論
業界證據支持「分身＋旅伴混合」優於純分身：分身給玩家「這是我」的認同投資，旅伴給玩家「牠需要我」的照顧義務，兩種驅動力疊加、且不互斥；James 自己不投入分身，不代表分身派設計錯，較可能是本作分身目前只有換裝、缺乏「牠在等我」的照顧回饋迴圈。

## 1. 兩大流派實例

| 產品 | 流派 | 角色在畫面上做什麼 | 對應玩家什麼動作 | 來源 |
|---|---|---|---|---|
| Habitica | 分身 avatar | 角色隨裝備/等級動態改變外觀，站在畫面中央 | 完成待辦→經驗值→角色升級、換裝 | [Habitica Wiki](https://habitica.fandom.com/wiki/Avatar) |
| Zombies, Run! | 分身（第一人稱敘事，Runner 5 不可見） | 玩家「就是」沉默主角，靠語音劇情推進 | 玩家實際跑步→劇情解鎖、任務完成 | [Wikipedia](https://en.wikipedia.org/wiki/Zombies,_Run!)、[UCL 用戶訪談論文](https://discovery.ucl.ac.uk/id/eprint/10139156/3/Potts_ZR_users_interviews_paper_Games%20for%20Health_Last%20version_NF.pdf) |
| 動物森友會 | 分身（第三人稱，另有村民 NPC） | 玩家角色可自訂外觀，於島上活動 | 玩家操作走路、釣魚、蓋建設 | [Animal Crossing Wiki](https://animalcrossing.fandom.com/wiki/Player) |
| Finch | 旅伴 companion（小鳥） | 鳥隨玩家完成任務成長、換裝、去「旅行」，不歸零、只是耐心等待 | 玩家設定意圖／寫日記／完成自我照顧任務 | [Medium UX Teardown](https://medium.com/@deepthi.aipm/ux-teardown-finch-self-care-app-18122357fae7)、[Paste](https://www.pastemagazine.com/tech/finch/finch-app-mental-health-virtual-pet-self-care) |
| Duolingo (Duo) | 旅伴（吉祥物，非分身） | 貓頭鷹角色在通知裡表達情緒（難過、生氣） | 玩家完成/未完成當日課程 | [Duolingo guilt notification 分析](https://opinionsandconditions.substack.com/p/duolingo-owl-dark-patterns-digital-guilt) |
| Forest | 旅伴（樹） | 專注時樹長大，切出去樹就枯死 | 玩家是否忍住不滑手機 | [Medium：Forest 如何用愧疚感留存](https://medium.com/@jashsak/how-forest-weaponized-guilt-to-hook-40-million-productivity-seekers-2a9ec6903021) |
| Pokémon Sleep | 混合（玩家是訓練師分身身分＋Snorlax／同伴寶可夢是旅伴） | Snorlax 依睡眠分數變強壯，吸引更多寶可夢聚集 | 玩家實際睡眠被追蹤 | [Pokémon 官方說明](https://corporate.pokemon.co.jp/en/topics/detail/t-9/) |
| Tamagotchi | 旅伴（原型） | 虛擬生物需要餵食/清潔，會生病或「死亡」 | 玩家實體按鍵照顧 | [Tamagotchi effect – Wikipedia](https://en.wikipedia.org/wiki/Tamagotchi_effect) |

## 2. 心理學依據
- **分身（avatar）**：Proteus effect 研究顯示，玩家會依化身特質調整自我行為與自我認同（self-similarity／wishful identification／embodied presence 是三個中介機制）；VRChat 調查中 88.9% 玩家對化身有身分認同感。來源：[Predicting proteus effect (2024, longitudinal)](https://www.tandfonline.com/doi/full/10.1080/0144929X.2024.2363974)、[Proteus effect avatar profiles (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11362772/)。客製化本身（不只是化身像不像自己）就能顯著提升「主觀認同」與投入感，但對客觀表現無顯著影響——即客製化主要作用在心理層面而非能力。來源：[Frontiers in Psychology 2021](https://www.frontiersin.org/articles/10.3389/fpsyg.2021.770139/full)。
- **旅伴（companion）**：Tamagotchi effect 指出照顧動機比自律動機更持久，因為它啟動的是「社會依附」神經迴路而非單靠「執行功能」意志力；創造者本人明言設計初衷就是要玩家「因照顧而產生愛」。來源：[Digital Trends](https://www.digitaltrends.com/cool-tech/how-tamagotchi-shaped-tech/)、[Tamagotchi effect – Wikipedia](https://en.wikipedia.org/wiki/Tamagotchi_effect)。Self-Determination Theory 的「關係性 relatedness」需求也支持 NPC／旅伴角色能提升內在動機與投入，UPEQ（Ubisoft 驗證量表）已把「對 NPC 的關係感」列為量測項目之一。來源：[Frontiers 2025 SDT 遊戲化設計研究](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1536513/full)。
- **兩者對比／疊加**：業界分析明確區分兩種驅動——分身觸發「這是我（ownership／自我表達）」，旅伴觸發「牠需要我（nurturing／道德義務）」；旅伴的長期留存效果被認為優於排行榜等競爭機制，因為它提供「合作與舒緩」而非比較疲勞。來源：[yukaichou.com 寵物旅伴設計](https://yukaichou.com/advanced-gamification/the-pet-companion-design-in-gamification/)。一份長者健康行為介入的準實驗研究顯示，純提醒組步數在第 4 週回落到基線以下，而「提醒＋分身社交」組維持顯著進步（+58.4%）——但此研究比較的是「有無分身」而非「分身 vs 旅伴」。來源：[Frontiers in Digital Health 2026](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2026.1757054/full)。

## 3. 各派風險
- **旅伴派**：Duolingo 的「Duo 生病/難過」推播與圖示改版曾引發社群強烈反彈（「引發恐慌發作」的用戶留言），事後被證實是刻意的「愧疚行銷」策略。來源：[Outlook India](https://www.outlookindia.com/international/us/duolingos-new-sick-app-icon-why-users-are-concerned-and-how-to-change-it-explained)、[Duolingo guilt notification 分析](https://opinionsandconditions.substack.com/p/duolingo-owl-dark-patterns-digital-guilt)。Forest 的「樹會死」機制被明確歸類為利用「損失厭惡＋愧疚感」而非正向獎勵運作。來源：[Medium](https://medium.com/@jashsak/how-forest-weaponized-guilt-to-hook-40-million-productivity-seekers-2a9ec6903021)。Tamagotchi 歷史上有兒童因寵物「死亡」而真實哭泣的紀錄，設計者提醒「只會懲罰疏於照顧」的寵物機制最終會被玩家怨恨。來源：[Tamagotchi effect – Wikipedia](https://en.wikipedia.org/wiki/Tamagotchi_effect)、[yukaichou.com](https://yukaichou.com/advanced-gamification/the-pet-companion-design-in-gamification/)。
- **分身派**：本身查證資料較零散，未查到針對「玩家不投入分身、換裝無感」的專門研究文獻；業界文章多從反面推論——客製化投入時間才是黏著的來源（見上），隱含推論是「若玩家沒有投入客製化的動機（如本專案 James 的情況），分身就難以建立認同」。

## 4. 折衷做法案例
- **Pokémon Sleep**：玩家仍是「訓練師」身分（隱性分身），但畫面主角是 Snorlax／同伴寶可夢（旅伴），玩家照顧的對象與玩家身分是分開的兩層。來源：[Pokémon 官方](https://corporate.pokemon.co.jp/en/topics/detail/t-9/)。
- **動物森友會**：玩家操作自訂分身（第三人稱、可換裝），島上另有村民 NPC 提供陪伴互動（拜訪、送禮、對話），分身與旅伴角色並存但功能不同。來源：[Animal Crossing Wiki](https://animalcrossing.fandom.com/wiki/Player)。
- 未查到 Finch 本身「分身＋旅伴雙角色」的官方設計說明；Finch 目前仍是純旅伴（無獨立可換裝玩家分身），此點以官方資料為準，本研究未找到反例。

## 5. 給本專案的建議
1. **維持分身、加一層「旅伴式回饋語氣」，不必新增第二個角色**：現有換裝角色改用第三人稱陪伴語氣呈現進度（例如角色「在等你」而非「你完成了」），成本最低、不影響現有換裝／裝備系統，符合 Rive 已在做的路線。理由：Zombies Run 證明「分身＋第三人稱敘事陪伴」不需要玩家投入外觀客製化也能建立代入感（來源同上）。
2. **絕對避免旅伴派的「死亡/難過」機制**：不論最終選哪派，Duolingo 與 Forest 的負評案例、Tamagotchi 兒童真實哭泣的紀錄，都直接牴觸專案「不能責備玩家中斷」的紅線；若日後真的加寵物旅伴，只能做「等待」不能做「懲罰/衰弱」。
3. **不必為了「James 沒把角色當分身」就轉投旅伴派**：客製化研究顯示分身認同來自「投入的客製化時間」，若換裝系統目前互動成本低（例如很少解鎖新裝備、缺乏儀式感呈現），根因可能是「客製化投入不足」而非「分身派本身錯誤」；建議先強化解鎖／穿上新裝那一刻的儀式感（呼應使用者一貫的儀式感優先設計價值觀），再評估是否需要旅伴。

## 未查到
- 沒有查到針對「靈修/宗教型每日習慣 app」比較分身 vs 旅伴留存效果的直接研究。
- 沒有查到嚴謹對照實驗（RCT）直接比較「同一 app 內分身版 vs 旅伴版」對每日習慣持續率的效果差異；現有最接近的是長者步數介入研究（比較「有無分身社交」而非「分身 vs 旅伴」）。
- 沒有查到 Stardew Valley 官方對「玩家分身 vs NPC」設計理念的一手訪談（僅類比動物森友會模式推論，未列入表格作實例佐證）。
- 沒有查到 Finch 官方對「為何選旅伴而非分身」的設計訪談原文（僅有二手媒體報導）。

## 來源清單
- https://habitica.fandom.com/wiki/Avatar
- https://habitica.fandom.com/wiki/Avatar_Customizations
- https://en.wikipedia.org/wiki/Zombies,_Run!
- https://discovery.ucl.ac.uk/id/eprint/10139156/3/Potts_ZR_users_interviews_paper_Games%20for%20Health_Last%20version_NF.pdf
- https://animalcrossing.fandom.com/wiki/Player
- https://medium.com/@deepthi.aipm/ux-teardown-finch-self-care-app-18122357fae7
- https://www.pastemagazine.com/tech/finch/finch-app-mental-health-virtual-pet-self-care
- https://opinionsandconditions.substack.com/p/duolingo-owl-dark-patterns-digital-guilt
- https://www.outlookindia.com/international/us/duolingos-new-sick-app-icon-why-users-are-concerned-and-how-to-change-it-explained
- https://medium.com/@jashsak/how-forest-weaponized-guilt-to-hook-40-million-productivity-seekers-2a9ec6903021
- https://corporate.pokemon.co.jp/en/topics/detail/t-9/
- https://en.wikipedia.org/wiki/Tamagotchi_effect
- https://www.digitaltrends.com/cool-tech/how-tamagotchi-shaped-tech/
- https://www.tandfonline.com/doi/full/10.1080/0144929X.2024.2363974
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11362772/
- https://www.frontiersin.org/articles/10.3389/fpsyg.2021.770139/full
- https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1536513/full
- https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2026.1757054/full
- https://yukaichou.com/advanced-gamification/the-pet-companion-design-in-gamification/
- https://yukaichou.com/advanced-gamification/the-avatar-gamification-design-technique/
