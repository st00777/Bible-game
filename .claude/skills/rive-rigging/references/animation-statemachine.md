# Rive 動畫與 State Machine 深度技術研究

> 研究目的：讓讀者達到「資深使用者」程度，聚焦在本專案（靈修冒險手機網頁小遊戲角色）需要的能力——待機（呼吸／眨眼／斗篷微晃）、舉手、鞠躬、走路循環、姿勢平滑過渡、換裝由 JS 控制、夜間放慢節奏、未來的「完成今日靈修」慶祝動畫觸發。
> 研究時間：2026-09（Rive 2025 年新推出的 Data Binding／Scripting 機制均已納入）。
> 查證方式：Rive 官方文件（`rive.app/docs`）優先，輔以官方部落格、`rive101.com`、`learnrive.com`、社群文章與討論。凡文件未明確提及者，一律標記「未查到」，不臆測。

---

## 概觀

Rive 的角色動畫由三層機制組成，理解這三層的分工是「資深使用者」與「只會拖時間軸」的分水嶺：

1. **Animate Mode（時間軸層）**：畫關鍵影格、做單一動作的時間軸動畫（idle、raise-hand、bow、walk 各自是一條或多條 timeline）。
2. **State Machine（邏輯層）**：用 Graph／States／Transitions／Layers／Inputs 把多個 timeline 串成「會依情境切換」的活體動畫，並處理姿勢之間的平滑過渡與多層動作疊加（呼吸＋眨眼＋斗篷同時跑不打架）。
3. **Data Binding（資料層，2025 年起新機制）**：用 View Model／Property／Binding 把「圖片（換裝）、數字（速度、夜間放慢）、enum（姿勢選擇）」跟場景元素或 State Machine 條件綁在一起，讓網頁 JS 端只要改資料值，動畫自動反應——這是取代舊式「State Machine Events」對外通訊的新標準做法。

此外 2025 年 Rive 新增了 **Scripting（Luau 語言）**，可以在編輯器內寫程式碼直接操控場景、資料、繪圖，但這是「進階／小眾」功能，本文件第 6 節會說明它對本專案是否必要。

---

## 1. 待機動畫做法

### 1.1 呼吸動畫：scale 還是 bone 位移？

官方文件在 Animate Mode 部分並未針對「呼吸動畫該用哪種屬性」給出明文建議（未查到官方明確定論）。但綜合搜尋到的角色綁定實務文章（`withloveapp.substack.com` 的 Procedural Animation 案例、`dev.to` 的 Engineering Interactive Mascots 文章），業界慣例是：

- 呼吸動畫多半用 **軀幹的縮放（scale，尤其是 Scale Y）或輕微的骨骼位移（胸腔/肩膀 bone 的小幅上下旋轉或位移）**，兩者都可行，差異在於：
  - **Scale**：實作最快，一個群組的 Scale Y 上下 2-4% 就有呼吸感，但對「已經用骨骼綁定」的角色，若呼吸的部位又疊在骨骼動畫路徑上，容易跟骨骼旋轉打架，產生輕微變形。
  - **Bone 位移／旋轉**：與角色既有骨架架構一致（本專案骨架已在 Rive 編輯器綁好），呼吸動畫應優先用「胸腔／肩膀 bone 的極小幅旋轉或垂直位移」而非額外疊加 Scale，這樣呼吸動作會自然帶動衣服、斗篷等已掛在骨骼上的美術資源一起動，不需要額外對每個部位分別做 Scale。
- 結論（給本專案的建議）：**用骨骼位移／旋轉做呼吸**，因為角色已是骨架綁定；只有沒有骨架、單純向量圖形時才用 Scale 做呼吸的簡便替代法。

### 1.2 眨眼三種做法比較

三種做法官方與社群都有提到，整理如下：

| 做法 | 說明 | 效能／檔案大小 | 優缺點 |
|---|---|---|---|
| **Solo 換圖層（圖層切換）** | 準備「睜眼」「閉眼」兩張（或多張）美術圖層，用 Solo 元件切換哪一層 active | 檔案較大（多一組美術圖層），但運算最省（純顯示切換，無形變計算） | 美術品質最穩定、不會變形；缺點是換裝時要多準備一組眼睛美術，且 Solo 切換是離散的（沒有中間漸變幀，除非搭配時間軸做透明度交叉淡出） |
| **眼皮圖層縮放（Scale Y）** | 眼睛（或眼皮）群組做 Scale Y 100%→0%→100% 的關鍵影格動畫，這是 Rive Masterclass 教學（rivemasterclass.com）介紹的「3 個關鍵影格做眨眼」的做法 | 檔案最小、做法最快，不需額外美術資源 | 最快上手，但眼睛是複雜向量圖形時，Scale Y 壓扁到 0 可能造成筆畫比例走樣（扁平化變形），該教學建議搭配 Cubic Ease In-Out 讓開合更自然 |
| **Mesh 變形** | 用 Mesh（網格）綁定眼皮頂點做真正的「閉合」變形，而非整體縮放 | 檔案與運算成本居中偏高（mesh 頂點越多成本越高） | 視覺最自然、不會有 Scale 造成的比例失真，遮罩／mesh 做法能避免幾何扭曲，也更適合搭配複雜向量設計與互動系統；但需要多花時間綁 mesh 與頂點動畫 |

**效能與檔案大小排序（省到耗，依查到的資料推論）**：Solo 換圖層在「運算」上最省（本質是顯示/隱藏），但檔案略大；Scale Y 做法檔案最小、實作最快，是最多教學文章推薦的「新手／輕量角色」首選；Mesh 變形視覺最好但成本最高。**本專案角色是「安靜、不誇張」的靈修角色，眨眼幅度小，建議先用 Scale Y（或搭配一個簡單 mask/mesh 只避免明顯扁平化），不需要到 Solo 換圖或完整 mesh 的複雜度。**

來源對「Solo 換圖層」與「Mesh 變形」孰優孰劣沒有給出精確的效能數字或檔案大小百分比對比，這部分屬於「未查到」精確量化數據，以上是質性比較。

### 1.3 隨機眨眼間隔的做法

Rive 官方文件本身沒有「隨機眨眼」專章，但綜合 State Machine 的 Transition 機制與社群實務文章（withloveapp 的 Procedural Animation 案例），有兩種可行做法：

**做法 A：State Machine + Number Input + 隨機邏輯（推薦）**
- 建立一個 `blinkTimer`（Number）或 `blinkTrigger`（Trigger）Input。
- 在網頁 JS 端，用 `setTimeout`／`setInterval` 產生一個隨機區間（例如 2-6 秒之間隨機取值），每次到時間就呼叫 `fire('blinkTrigger')` 觸發一次眨眼 Transition。這是最直覺、最好控制「隨機但不會太密集或太稀疏」節奏的做法，也最貼近本專案「JS 控制換裝／節奏」的既有架構（夜間放慢同樣由 JS 端控制數值）。
- 或者完全在 Rive 內部：用 Transition 的 **Randomize Exit**（官方文件 `transitions.md` 提到的功能）讓某個 Any State 或 Idle 狀態以「權重」隨機選擇要不要進入眨眼分支，達到不需要 JS 介入的隨機感，但權重是固定機率、不是「隨機間隔秒數」，比較適合「有時候眨、有時候不眨」而非精準控制秒數區間。
- withloveapp 文章描述的「Considered Randomness（有意圖的隨機）」做法：眨眼不是純亂數，而是「混合了隨機觸發＋情境判斷（context）」——例如角色視線改變、姿勢切換、大動作發生時才觸發眨眼，讓隨機顯得有理由而非機械化重複。這對本專案是很好的設計參考：例如「舉手／鞠躬動作開始或結束時」順便觸發一次眨眼，比單純固定隨機區間更自然。

**做法 B：很長的 timeline loop 避免規律感**
- 做一條很長（例如 20-40 秒）的待機 timeline，裡面手動在不規則的時間點放好幾次眨眼關鍵影格，讓 loop 起來不容易被玩家察覺規律性。
- 優點：不需要額外的 State Machine 邏輯或 JS 計時器，最簡單。
- 缺點：檔案較大（更多關鍵影格）、且本質上仍是「固定循環」，如果玩家長時間停留在同一畫面，規律性還是會被抓到（相較於 A 做法的真隨機）。

**本專案建議**：採做法 A（State Machine Trigger + JS 隨機亂數觸發），原因是：(1) 本專案本來就用 JS 控制夜間放慢、換裝，架構上一致；(2) 未來要做「完成今日靈修」慶祝動畫也需要 JS 觸發 Trigger 的能力，做法 A 是同一套機制的延伸；(3) 檔案更小、更容易調整節奏（改一行 JS 的隨機區間即可，不必回編輯器重新做 timeline）。

### 1.4 多個微動作疊加不打架的做法

這是本專案待機動畫（呼吸＋眨眼＋斗篷微晃同時進行）的核心技術問題，官方文件與社群文章的答案一致：

- **用 State Machine 的多個 Layers**，每個 layer 各自負責一組獨立部位/動作：例如 Layer 1＝身體呼吸、Layer 2＝眼睛眨眼、Layer 3＝斗篷physics-like 微晃。只要三個 layer 控制的是**不同物件的不同屬性**，它們會同時播放、互不影響。
- **官方明文警告（`rive101.com` 6.4 課、`layers.md`）：「強烈建議永遠不要在並行運行的 layer 中對同一個屬性做動畫」**。Rive 的多 layer 衝突解決機制是「最右邊（在 Layers 面板中順序最後）的 layer 完全覆蓋左邊的結果」，不是「疊加平均」——所以如果呼吸與斗篷晃動都想動同一根骨骼的同一個旋轉值，右邊的 layer 會整個蓋掉左邊，不會有 A+B 混合的效果。
- 如果**真的需要多個動畫疊加同一個屬性**（例如臉部同時要表現「微笑」和「說話嘴型」两個來源都影響嘴巴），這時才要用 **Additive Blend State**（不是 Layer 疊加，是同一個 State 內部的「Blend by Property」機制）：Additive Blend 有「Blend by Value（基準姿勢）」與「Blend by Property（用 Number Input 控制混合權重的姿勢）」兩種 timeline，多個 Property Blend 疊加在基準姿勢上，是真正的「相加式混合」而非覆蓋。DEV Community 的吉祥物文章也印證：「因為 layer 是相加式運作，角色可以同時 Walk 和 Smile」——但這句話特指同一個 State Machine 內、透過 Additive Blend State 設計出來的疊加效果，一般的多 Layer 各管各的屬性時是「覆蓋」而非「相加」，兩者不要混淆。

**給本專案的具體做法**：呼吸（控制軀幹骨骼）、眨眼（控制眼皮/眼睛群組）、斗篷微晃（控制斗篷骨骼鏈）三者操作的是**完全不同的骨骼/物件**，所以直接用「三個獨立 Layer 各自跑一條 timeline」即可，不需要用到 Additive Blend——Additive Blend 是留給「舉手」動作要跟「呼吸」同時作用在**同一根手臂/軀幹骨骼**時才需要的進階技巧（見下一節）。

### 本節來源
- https://rive.app/docs/editor/animate-mode/animate-mode-overview.md
- https://rive.app/docs/editor/state-machine/states.md
- https://rive.app/docs/editor/state-machine/layers.md
- https://rive.app/docs/editor/state-machine/transitions.md
- https://rive101.com/en/lesson/6-4/
- https://www.rivemasterclass.com/blog/rive-blink-animation-how-to-make-any-character-feel-alive-with-3-keyframes
- https://withloveapp.substack.com/p/procedural-animation-in-rive-how
- https://dev.to/uianimation/engineering-interactive-mascots-with-rives-state-machine-and-runtime-architecture-4e2h

---

## 2. 姿勢切換（站姿 → 舉手 → 鞠躬）

### 2.1 離散姿勢轉換：一個 timeline 一個 pose + transition，還是 1D Blend？

答案取決於「兩個姿勢之間需不需要中間過渡的連續感」：

- **站姿→舉手、站姿→鞠躬這種「離散、有明確起訖動作」的姿勢切換，官方建議用「一個 State 一個 timeline + Transition（含 duration）」**，這是 State Machine 最基本、最常見的用法（`states.md` 中 Single Animation State 的說明）。舉手、鞠躬本身應該各自是一條「有頭有尾」的完整 timeline（例如舉手 timeline 從「手放下」動畫到「手舉起」，鞠躬同理），透過 Transition 從 Idle State 連過去、播完（或到 Exit Time）再連回 Idle。
- **1D Blend State 適合的場景是「同一組動作沿著一個連續數值軸變化」**，例如速度 0→50→100 對應 Idle→Walk→Run 這種「量變」的連續姿勢，而不是「舉手」「鞠躬」這種質變的獨立動作。用 1D Blend 硬做「舉手⇄鞠躬」在概念上不對，因為兩者不是同一條軸上的程度差異。
- **結論**：站姿→舉手→鞠躬三個離散姿勢，用**三個獨立的 Animation State（各自一條 timeline）+ Transition** 串接，這是官方文件明確支持的標準模式；1D Blend 留給「走路速度」這種連續量變的情境（見 2.3）。

### 2.2 Transition Duration 與 Exit Time 怎麼設定才平滑

官方 `transitions.md` 給出的機制（**沒有給出具體建議秒數/百分比範圍**，這部分數值需要靠經驗調整，官方只說明機制本身）：

- **Duration（轉換持續時間）**：預設值是 0（代表「立即切換」、沒有淡入淡出）。要讓兩個姿勢之間平滑過渡，必須手動設一個 >0 的秒數，讓 Rive 在這段時間內對兩個 timeline 的姿勢做插值混合（cross-fade）。
- **Exit Time（退出時間）**：預設「未啟用」。啟用後可用「時間值」或「百分比」設定「這個 State 至少要播放多少比例／多久之後，才允許轉換發生」。例如設 100% 代表「舉手動畫要完整播完才能離開」，避免玩家瞬間又觸發別的動作導致舉手動畫播到一半被打斷、看起來很突兀。
- **兩者搭配的平滑原則（依機制推論，非官方給定的絕對數值）**：
  - 若動作本身有明確起訖（例如舉手一定要舉到底再放下才好看），**Exit Time 設高（例如 80-100%）**，確保動作播完才轉走。
  - 兩個姿勢之間的 **Duration 建議是「短但非 0」**（常見經驗值在 0.1-0.3 秒之間，屬於一般 UI/角色動畫的過渡感受範圍——**這個具體秒數是一般動畫實務經驗，非 Rive 官方文件明文規定的數字，官方文件對此未給出建議區間，需標記為未查到官方定論**），太長會讓角色反應變遲鈍、不像「有精神」在動，太短（接近 0）則會像硬切。
  - 另外 `transitions.md` 提到 **Interpolation** 選項（Transition 本身也可以選 Linear 或 Cubic），預設 Linear；若希望姿勢過渡「先慢後快」或「先快後慢」更自然，可以把 Transition 插值也改成 Cubic。
  - **Pause Source When Exiting**（轉換開始時暫停正在離開的那個 timeline）與 **Allow Exit During Transition**（允許轉換還沒播完就再被打斑）這兩個開關，是避免「舉手轉鞠躬轉回舉手」這種快速連續觸發造成畫面錯亂/穿模的關鍵保險開關，建議舉手、鞠躬這類「重要儀式感動作」預設關閉 Allow Exit During Transition，強迫動作播完再接受下一個指令，行為更可預期。

### 2.3 走路循環跟待機動畫怎麼混合

這正是 **1D Blend State** 的標準應用場景，社群文章（DEV Community 吉祥物文章）給出具體範例：

- 建立一個 Number Input（例如 `speed`），做一個 **1D Blend State**，把 Idle timeline 放在 Input=0 的位置、Walk timeline 放在 Input=50 或 100 的位置。
- 當 JS 端把 `speed` 從 0 往上調時，Rive 會在 Idle 和 Walk 之間做**連續插值混合**，不是生硬切換，這樣「速度為 0 時自動變回 idle、速度增加時無縫過渡成走路」是 1D Blend 的原生行為，不需要額外寫 Transition 條件判斷「speed==0 就跳回 idle」。
- 2025 年的編輯器更新（Rive Changelog 提到）：**Blend 1D 現在預設是 Linear 混合**，並新增了 "Capture Base State" 選項——關閉這個選項可以改回舊版的 additive 混合行為。這是版本差異，若使用的是較新版編輯器，1D Blend 預設行為與早期教學文章描述的可能略有出入，建議實際操作時留意這個開關。
- 如果本專案的走路是「原地走路循環」（手機小遊戲常見做法，不真的位移場景），只需要一個 Boolean（`isWalking`）配合一般 Transition 也可以，不一定要上 1D Blend；**1D Blend 的價值在於「有速度快慢的連續變化」時**，如果只有「走／不走」兩態，用 Boolean + 一般 Transition（Idle ⇄ Walk）更簡單直接，也是本專案 SOP（第 8 節）建議的做法，因為手機小遊戲的走路動畫多半只有「原地踏步循環」單一速度，沒有必要引入 1D Blend 的額外複雜度。

### 本節來源
- https://rive.app/docs/editor/state-machine/states.md
- https://rive.app/docs/editor/state-machine/transitions.md
- https://dev.to/uianimation/engineering-interactive-mascots-with-rives-state-machine-and-runtime-architecture-4e2h
- Rive Changelog（1D Blend 預設 Linear / Capture Base State）：https://rive.app/changelog

---

## 3. State Machine 結構設計

### 3.1 多層 Layers 各自該管什麼職責

官方 `layers.md` 對「該怎麼分工」沒有給範例（只講機制：一個 layer 一次只能播一個 state，多個 layer 可同時跑，衝突時右邊蓋左邊）。實務上（DEV Community 吉祥物架構文章）常見的分層慣例：

| Layer | 職責 | 控制的物件/屬性 |
|---|---|---|
| Body / Pose Layer | 身體姿勢（idle / walk / raise-hand / bow） | 軀幹、四肢骨骼 |
| Face Layer | 表情、眨眼 | 眼睛、眉毛、嘴巴 |
| Accessory / Cloak Layer | 斗篷、頭髮等次要物理感動作 | 斗篷骨骼鏈、飾品 |
| Environment / Time-of-day Layer | 夜間放慢、環境相關的速度調整 | 通常不直接控制美術物件，而是控制一個「全域速度」Number，讓其他 layer 的 timeline speed 依此縮放（見 4.3） |

這個分層完全對應本專案需求：身體姿勢一層＝走路/舉手/鞠躬/idle 姿勢；臉部表情一層＝眨眼；環境層可以是「不畫東西、純粹放一個 Number Input 給其他機制引用」的邏輯層。**這個分層表是依據社群實務文章整理，不是 Rive 官方文件的明文規定**，官方文件本身只講機制未給出「該怎麼分」的建議，這點需誠實標註。

### 3.2 Input 型別使用時機

官方 `states.md`／`transitions.md` 與社群文章一致的定義：

- **Boolean**：代表「持續性的狀態」，例如 `isWalking`（走路中／沒在走）、`isNight`（是否夜間）。特徵是值會一直保持，直到再次被改變。
- **Number**：代表「連續數值」，用於 1D Blend 的軸、或速度、進度這類「有程度差異」的資料，例如 `speed`（走路速度）、`nightFactor`（夜間放慢係數）。
- **Trigger**：代表「一次性、瞬間發生的事件」，例如 `blinkTrigger`（眨一次眼）、`celebrateTrigger`（觸發完成靈修的慶祝動畫）。Trigger 觸發後會自動重置，不需要手動歸零，適合「動作型」而非「狀態型」的行為。

### 3.3 命名慣例

DEV Community 文章提到的慣例（**這是該篇作者的專案規範，非 Rive 官方強制規則**，但是業界通用且合理的建議）：
- **Input（駝峰式 camelCase）**：`isWalking`、`blinkTrigger`、`speed`、`isNight`
- **State（帕斯卡式 PascalCase）**：`Idle`、`RaiseHand`、`Bow`、`Walk`
- 文章強調：嚴格的命名規則 + 一份「Input 對應行為」的文件，是設計端（Rive 編輯器）與開發端（JS 呼叫）之間不出錯的關鍵，因為 JS 端呼叫 `.fire('blinkTrigger')` 這類字串必須跟編輯器裡的 Input 名稱完全一致，打錯字不會報錯，只會靜默失敗（動畫不動但也不報錯）。

### 3.4 Any State 的用途

官方部落格〈A beginner's guide to the Rive State Machine〉與 `states.md` 都提到：

- **Any State** 是一個特殊節點，可以從它拉出 Transition 到任何其他 State，且**這個 Transition 可以在「State Machine目前不管處在哪個 State」的情況下被觸發**——也就是不需要先「回到某個特定 State」才能轉換。
- 官方部落格給的例子：使用者點擊按鈕，吉祥物應該立刻轉場到「Success」動畫，不管它原本是在 Idling、Walking 還是 Blinking，這種「打斷、插隊」的行為（interrupt pattern）就是 Any State 存在的意義。
- **給本專案的應用**：未來「完成今日靈修」的慶祝動畫，最適合用 **Any State → Celebrate（Trigger 驅動）** 的模式：不管角色當下在 idle、走路還是其他姿勢，JS 端呼叫 `celebrateTrigger` 都能立刻插隊播放慶祝動畫，不需要先判斷「現在在哪個狀態」。

### 3.5 如何避免動畫互相打架／狀態卡住

綜合官方文件與 GitHub issue 討論（`rive-app/rive-flutter` #110、#342 等真實回報過的踩坑），常見原因與對策：

- **同一屬性被多個並行 Layer 同時動畫化** → 依 3.1 的原則，一個屬性只讓一個 layer 負責，若真的要疊加改用 Additive Blend 而非兩個一般 Layer。
- **Exit Time 沒設、Duration=0，導致狀態機瞬間來回跳動（thrash）** → 至少給關鍵的儀式性動作（舉手、鞠躬）設 Exit Time，避免播到一半就被打斷又切別的狀態。
- **Trigger 沒有被消費就疊加觸發**：連續呼叫同一個 Trigger 兩次，如果 State Machine 還沒來得及處理第一次，可能造成卡在 Transition 中間或動作跳過；建議 JS 端呼叫 Trigger 前，先用 Boolean（例如 `isBusy`）判斷角色是否正在播放重要動作，忙碌中就不重複觸發。
- **忘記在 State Machine 初始化完成（onLoad／state machine instance 建立）之後才去 set/fire input**：GitHub issue 中多次出現的踩坑是在 State Machine 尚未真正 instantiate 前就呼叫 setInput，導致輸入被忽略。JS 端要確保 Rive 的 `load`／`ready` 回呼觸發後才開始操作 inputs。
- **多層同時 Trigger，只有最後一層生效**：`rive-app/rive-flutter` issue #342 回報過「多 Layer 的 State Machine，只有最後一個 layer 的動畫會觸發，其餘 layer 不會動」，這是已知的 runtime 實作問題（依平台版本可能有差異），若遇到「明明編輯器裡設好多層，但實際 App 裡只有一層動」的情況，應優先懷疑是 runtime SDK 版本問題，而不是 State Machine 設計錯誤，建議更新到最新版 runtime 函式庫。

### 本節來源
- https://rive.app/docs/editor/state-machine/state-machine.md
- https://rive.app/docs/editor/state-machine/states.md
- https://rive.app/docs/editor/state-machine/layers.md
- https://rive.app/docs/editor/state-machine/transitions.md
- https://rive.app/blog/how-state-machines-work-in-rive
- https://dev.to/uianimation/engineering-interactive-mascots-with-rives-state-machine-and-runtime-architecture-4e2h
- https://github.com/rive-app/rive-flutter/issues/110
- https://github.com/rive-app/rive-flutter/issues/342

---

## 4. Data Binding

### 4.1 View Model 是什麼概念

官方 `data-binding/overview.md`、`view-models.md` 的定義：

- **View Model** 是「定義資料結構的藍圖」，本身不儲存實際數值，只描述有哪些 Property（欄位）與各自的型別（Number、String、Boolean、Color、Enum、Image、Font、Artboard、List、巢狀 View Model）。
- **View Model Instance** 才是「真正存值的容器」——一個 View Model 可以建立多個 Instance，各自持有不同數值，但共用同一套結構。這概念類似程式語言裡「class（藍圖）」與「object/instance（實例）」的關係。
- 核心價值（`getting-started-with-data-binding` 部落格文章、`overview.md` 都強調）：**資料結構跟場景階層解耦**。舊做法（沒有 data binding 之前）資料邏輯必須緊貼場景結構，移動、重新命名圖層就要跟著改 runtime 程式碼；新做法讓設計師可以自由重組畫面、調整圖層順序，只要 Binding（連接關係）不變，開發端的程式碼完全不用動，這對「設計與開發平行作業」是決定性的改善。

### 4.2 用 image property 做換裝，跟傳統 solo／asset swap 比較

官方 `property-types.md` 明確列出 **Image** 是一種 View Model Property 型別，用途是「參照圖像資產，動態改變顯示內容」，且**只影響單一 Instance，不是全域資產替換**。跟舊式做法比較：

| 做法 | 機制 | 優缺點 |
|---|---|---|
| **Solo 換圖層（傳統做法）** | 在場景裡預先擺好所有可能的裝扮圖層，用 Solo 元件切換哪一層顯示 | 所有裝扮素材都要內嵌在同一個 .riv 檔案裡，檔案會隨裝扮數量線性變大；換裝邏輯綁死在場景階層，要新增一款帽子就要進編輯器改場景 |
| **Asset Swap（Rive 另一舊機制）** | Runtime 端直接替換某個具名圖片資源的位元組資料 | 需要程式碼端管理資源 ID 對應關係，較底層、較看 runtime SDK 支援程度 |
| **Image Property（Data Binding，新做法，2025 起）** | 換裝資產透過 View Model 的 Image Property 綁定到場景中的圖片元素，JS 端只要把該 Instance 的 Image Property 換成新的圖片資料，畫面自動更新 | 資料與場景結構解耦（跟 4.1 的核心價值一致）；換裝邏輯不需要進 Rive 編輯器改場景，直接在 JS 端操作 View Model Instance；且是「單一 Instance 影響」，代表同一個角色骨架可以有多個獨立換裝的 Instance 同時存在而不互相干擾（例如未來若要同時顯示多個不同裝扮的小型預覽圖，理論上更容易做）。 |

**給本專案的建議**：本專案「帽子／衣服／手持物／背景」四個部位換裝，是 Data Binding 最典型的應用場景——每個部位對應一個 View Model 裡的 **Image Property**，JS 端管理一份「部位 → 圖片資源」的對照表，玩家選擇裝扮時只需要更新對應 Property 的值，不需要碰 Solo 或場景結構，這比舊式 Solo 換圖層更適合「裝扮清單會持續擴充」的營運模式（本專案未來會不斷加新裝扮）。

### 4.3 number property 做速度控制／夜間放慢

官方 `controlling-data.md` 提到「你的應用程式也可以在 runtime 更新資料」，並列出典型應用「更新分數、改變頭像、觸發 UI 狀態」，但**沒有針對「用 number property 控制動畫播放速度」給出具體操作範例**（未查到官方明確的 SOP）。不過結合以下兩點可以確立可行性：

1. `states.md` 提到 Animation State 本身有 **Speed** 欄位（正值往前放、負值倒放，可自訂快慢），這是編輯器裡的靜態設定值。
2. 社群討論串（Rive Community：「Control PlayBack Speed via Databinding」）標題直接證實**可以透過 Data Binding 的 Number Property 去綁定/控制 Animation 的播放速度**，讓「速度」變成一個可以在 runtime 隨時調整的資料，而不是編輯器裡固定寫死的數字。
3. 另一個更底層但更可控的做法（`low-level-api-usage` 文件）：在網頁 JS 端自己控制 render loop 的「advance」時間量，例如「原本每個影格前進 16ms，夜間時只前進 8ms」，等於直接讓整個 state machine／animation 的時間感知變慢，這不需要動用任何 Number Property，是純 runtime 端的做法，但需要改用 Low-level API（`@rive-app/canvas-advanced` 等），比一般的高階 API（`@rive-app/canvas` 等）複雜。

**給本專案的建議**：優先採「Number Property 綁定 Speed」（做法 2）而非改寫底層 render loop（做法 3），因為本專案目前的 JS 架構應該是用一般高階 API，改用 Low-level API 是不小的架構調整，成本不成比例；用一個 `nightFactor`（Number，例如白天=1.0、夜間=0.5）的 View Model Property，綁定到每個 Animation State 的 Speed（或者更簡單：綁定到一個全域的 State Machine Number Input，再由各個姿勢的 timeline speed 統一乘上這個係數），是更貼合 Data Binding 設計初衷、也更好維護的做法。此處 Rive 官方文件沒有給出「Number Property 綁定 State Speed」的逐步官方 SOP 頁面，只能確認機制上可行（見 Rive Community 討論串標題與 `states.md` 的 Speed 欄位），**實際操作步驟需要在編輯器內以「右鍵 Speed 欄位 → Data Bind」的通用綁定手勢（見 4.4／`binding-data.md`）去試作驗證，本文件標記這部分具體步驟為「未查到官方逐步教學，僅查到機制存在的佐證」**。

### 4.4 enum property 做姿勢選擇

官方 `enums.md`：

- Enum Property 讓使用者「從預先定義的選項集合中選擇一個值」，適合「模式、狀態、變體」這種只能是有限選項之一的資料。
- 建立方式：Data 面板點 `+` → Enum → 在右側邊欄用 `+` 新增選項（例如 `Idle`、`RaiseHand`、`Bow`、`Walk`）。
- 綁定方式：Enum 可綁定到「使用相同選項集的編輯器屬性」，系統會自動套用「Enum 轉數字」的轉換器（Converter）。文件特別舉了一個實例：**用自訂 Enum 控制 Solo 的 Active 狀態**（建立跟 Solo 選項名稱與順序一致的 Enum，綁定到 Solo 的 Active 屬性並套用「轉換為數字」的 Converter）。
- **跟 State Machine 姿勢切換的關係**：Enum Property 本質上更適合「控制美術資源的顯示切換（像 Solo）」，如果要驅動 **State Machine 的姿勢 Transition**，做法是把這個 Enum 的值當作 Transition 的 **Condition**（`transitions.md` 提過 Condition 的來源值可以是「視圖模型屬性」），例如「當 `poseEnum == RaiseHand` 就從 Idle 轉到 RaiseHand State」。這樣 JS 端只需要改一個 Enum 的值，State Machine 就會依 Condition 自動切換姿勢，不需要另外操作多個 Boolean/Trigger。

### 4.5 Runtime（rive.js 等）概念上如何連接

（依任務說明，實作細節屬於另一份文件，這裡只做概念性交代）

- Runtime SDK（`@rive-app/canvas`、`@rive-app/webgl2` 等 Web 版本）在 Rive 檔案載入完成（`onLoad`／`load` 事件之後）會暴露出該 Artboard 綁定的 View Model Instance，讓 JS 端可以讀取／寫入其 Property 值（Number、Boolean、Enum、Trigger、Image 等）。
- 官方文件把「概念層」與「Runtime 實作層」分開放置：`data-binding/controlling-data.md` 只描述概念，具體 API 呼叫方式在另一份 Runtime 專屬文件（`/docs/runtimes/data-binding`），本次研究依任務要求不深入這份 API 細節文件，僅在此標註其存在，供未來寫實作文件時查閱：`https://rive.app/docs/runtimes/data-binding`（本次僅確認連結存在於官方文件交叉引用中，未逐頁查證其完整內容）。

### 本節來源
- https://rive.app/docs/editor/data-binding/overview.md
- https://rive.app/docs/editor/data-binding/view-models.md
- https://rive.app/docs/editor/data-binding/property-types.md
- https://rive.app/docs/editor/data-binding/binding-data.md
- https://rive.app/docs/editor/data-binding/controlling-data.md
- https://rive.app/docs/editor/data-binding/enums.md
- https://rive.app/blog/getting-started-with-data-binding
- https://community.rive.app/c/support/control-playback-speed-via-databinding
- https://rive.app/docs/editor/state-machine/states.md（Speed 欄位）
- https://help.rive.app/runtimes/overview/web-js/low-level-api-usage

---

## 5. Events

### 5.1 Animation Events 與 State Machine Events 的差異

官方 `events/overview.md` 對這兩者的差異**沒有給出直接對照說明**（原文只列出三種事件「類型」：Open URL Event、Audio Event、一般的 General Event，後者已標示「已棄用」），但同一頁列出了**事件可以被哪些機制觸發**：

- **Timeline**：在動畫播放到特定時刻時觸發（這通常被理解為「Animation Event」，因為它綁定在一條 timeline 的播放進度上）。
- **State（狀態開始／結束時）**、**Transition（轉換開始／結束時）**、**Listener（監聽器觸發時）**：這三種是綁在 **State Machine 的邏輯節點**上，通常被理解為「State Machine Event」，因為它們依附於狀態機的運作而非單一時間軸的播放進度。

換句話說，兩者的本質差異是**掛載點不同**：Animation Event 掛在「一條 timeline 的某個時間點」，只要那條 timeline 被播放到那一刻就會觸發，不管是不是透過 State Machine 播放的；State Machine Event 掛在「狀態機的狀態或轉換節點」上，只有透過 State Machine 邏輯流程走到那個節點才會觸發。**這個區分是根據 `events/overview.md` 列出的四種觸發來源反推整理，官方文件本身沒有用「Animation Event vs State Machine Event」這組詞明確對照定義，這點需要誠實標註為「推論整理，非官方原文的直接分類用語」。**

另外要注意：`general-events.md` 明確指出「**General Event 已被棄用，官方建議新專案改用 Data Binding**」來取代事件通訊的角色。

### 5.2 網頁端概念上如何接收這些事件

依 `events/general-events.md` 與社群搜尋到的 rive.js 用法（npm 套件說明）：

- Rive 的 JS Runtime 提供類似 DOM `addEventListener` 的 API：呼叫 `riveInstance.on(EventType, callback)` 訂閱事件。
- 常見訂閱的事件類型包括 `'load'`（檔案載入完成）、`'loop'`（動畫循環一次）、以及 **Rive Event（在編輯器裡用 Events 工具建立的自訂事件）**——當這類事件被觸發時，callback 收到的物件裡有 `event.data`，內含事件名稱（字串）與任何自訂 Number／Boolean／String 屬性的當前值。
- 概念上的接收流程：Rive 檔案載入 → 建立 State Machine 實例 → 呼叫 `.on('riveEvent', callback)` 或對應的 EventType 常數 → 當編輯器裡設計的事件（例如「舉手動作結束時」的 State 事件）觸發時，JS 端 callback 被呼叫，可以在裡面接著做「播放音效」「更新 UI」等網頁邏輯。
- **給本專案的應用**：如果未來想讓「完成今日靈修的慶祝動畫」在動畫播完的瞬間通知網頁端（例如順便跳出一個「恭喜」的 UI 或加分特效），可以在慶祝動畫的 State 上設一個「結束時觸發」的 Event，網頁端訂閱後接收，這樣角色動畫與網頁 UI 的時間點可以精準同步，而不是網頁端自己用 `setTimeout` 猜測動畫播完的時間。

### 本節來源
- https://rive.app/docs/editor/events/overview.md
- https://rive.app/docs/editor/events/general-events.md
- npm `rive-js` 套件說明（`.on()` API）：https://www.npmjs.com/package/rive-js

---

## 6. Scripting（Luau）

### 6.1 目前能做到什麼程度

官方 `scripting/getting-started.md` 與部落格〈Why Scripting runs on Luau〉、〈Scripting is live in Rive〉列出的能力範圍：

- 繪圖與視覺效果：自訂圖形繪製、路徑效果（例如文字沿路徑排列、波浪效果）、影像渲染與變換。
- 完整互動邏輯／小遊戲：官方展示過用 Scripting 做出完整的蛇（Snake）遊戲、老虎機、Plinko 等，證明 Scripting 有能力處理「遊戲規則層級」的邏輯，不只是裝飾性效果。
- 佈局系統：砌體（masonry）佈局、響應式佈局。
- 資料操作：直接用程式碼操作 Data Binding 的 List（新增、刪除、編輯、交換項目）。
- 自訂 Converter（資料轉換器）：用程式碼定義資料綁定時的數值轉換邏輯。
- 多點觸控：可以追蹤多根手指的輸入。
- 單元測試：Rive 甚至提供了 Debug Panel 與 Unit Testing 的腳本協定，可以對顏色轉換等工具函式寫測試。

技術基礎：Scripting 使用 **Luau**（Roblox 開源的 Lua 方言），保留 Lua 的輕量與簡單語法，額外加入漸進式型別系統（gradual typing）與型別檢查器，Rive 編輯器會依內建引擎 API 自動產生型別定義，讓寫程式碼時有自動完成與驗證。

### 6.2 免費版是否能用

- 搜尋結果（`rive.app/blog/rive-s-new-9-mo-plan`、第三方定價分析文章）顯示：**Rive 編輯器本身、字型、音訊、Runtime 都是免費的，可以免費探索、設計、做動畫**；但要「匯出 .riv 檔案」用於正式產品/遊戲，需要付費方案（最低階 **Cadet，US$9/月，年繳）**，才能解鎖無限匯出與進階功能。
- **這句話沒有明確指出「Scripting／Luau 本身是否被鎖在付費方案後面、還是免費版也能寫但不能匯出」**——查到的資訊只確認「匯出」是付費方案的門檻，但「Scripting 功能開關」是否額外綁定更高階方案（例如是否 Cadet 就夠、還是要 Voyager 才能用 Scripting）**未查到明確定論**，只查到官方另有針對「AI Coding Agent（協助寫 Luau 的 AI 助手）」的每月 AI credit 額度依方案分級（Cadet $5／Voyager $16／Enterprise $40 額度），但這是「AI 輔助寫 Scripting」的加值功能配額，不等同「Scripting 本身」的方案門檻。**結論：Scripting 語言本身能否在免費版試用、還是連編輯都要付費方案，此細節未查到明確答案，需要實際登入編輯器確認，或直接詢問 Rive 官方支援。**

### 6.3 對本專案是否用得上

依任務描述的兩個候選用途逐一評估：

- **隨機眨眼間隔**：不需要 Scripting。State Machine 的 Trigger + 網頁 JS 端的隨機計時器（`setTimeout` 隨機區間）已經足以達成，且這是本專案現有架構（JS 控制換裝、節奏）的自然延伸，不需要額外學習 Luau 語言或承擔可能的付費門檻風險。
- **依時間放慢速度（夜間節奏）**：同樣不需要 Scripting。第 4.3 節已確認可以用 Number Property（Data Binding）或編輯器內建的 State Speed 欄位達成，網頁 JS 端本來就知道現在是不是夜間（依裝置時間或遊戲內的日夜設定），直接把這個資訊寫進 View Model 的 Number Property 即可。
- **結論（給本專案的建議）**：**Scripting／Luau 對本專案目前描述的需求（待機、姿勢切換、走路、換裝、夜間放慢、儀式觸發）都不是必要的**，State Machine + Data Binding + 前端 JS 三者組合已經完整覆蓋。Scripting 比較適合「Rive 檔案本身要內含遊戲規則／複雜運算邏輯，不依賴外部程式碼」的場景（例如官方展示的貪食蛇、老虎機），本專案的遊戲邏輯本來就在 `app.js`／`content.js` 這些外部 JS 檔案中承載，沒有必要把邏輯搬進 Rive 內部的 Luau 腳本，維持現有「Rive 只管動畫呈現、JS 管遊戲邏輯」的分工更簡單、更容易維護與除錯。

### 本節來源
- https://rive.app/docs/scripting/getting-started.md
- https://rive.app/blog/why-scripting-runs-on-luau
- https://rive.app/blog/scripting-is-live-in-rive
- https://rive.app/blog/rive-s-new-9-mo-plan
- https://rive.app/blog/rive-ai-coding-agent-faq

---

## 7. 資深技巧與常見踩坑

### 7.1 關鍵影格太多導致檔案變大

官方 `best-practices` 文件建議：

- 善用**骨骼與約束（constraints）**去讓「少數幾根骨骼的關鍵影格」帶動大量美術部件一起動，而不是替每個部件都個別打關鍵影格——這是骨架綁定角色（本專案的做法）先天的優勢，應該充分利用。
- 用 **Graph Editor（曲線編輯器）** 簡化關鍵影格曲線：把過於密集、瑣碎的關鍵影格數據做平滑化/減少，同時維持動作觀感。
- 定期刪除沒用到的關鍵影格與沒用到的 Artboard——未使用的 Artboard 仍會被編進最終匯出檔並在載入時解析，是常被忽略的隱形檔案膨脹來源。
- 待機動畫優先用「一次性（one-shot）」動畫而非讓一條 timeline 無限拉長，沒有主動動畫在播放時 Runtime 會自動暫停，降低 CPU。
- 檔案膨脹的最大來源往往不是關鍵影格本身，而是**圖片、音訊、字型等資產**：大尺寸點陣圖（例如用 8192×7022 的圖去顯示 100×100 的區域）、未壓縮的圖片格式，都比關鍵影格數量更容易造成檔案暴增，官方建議圖片一律壓縮並優先用 **WebP** 格式。

### 7.2 Interpolation 該怎麼選

依官方 `interpolation-easing.md` 整理的選擇原則：

- **Linear（線性）**：預設值，等速變化，適合「機械感、勻速」的動作，一般角色動作很少單獨只用 Linear（會顯得生硬），但適合某些 UI 元件的位移。
- **Cubic（三次方，含可拖動控制點）**：預設曲線是「開始/結束慢、中間快」，是最常見、最自然的動畫過渡感受，**本專案的呼吸、舉手、鞠躬這類「有機、生物感」的動作應該優先用 Cubic**，並依動作性質調整控制點（例如舉手起始可以做得快一點、結尾放慢做出「穩穩舉起」的質感）。
- **Hold（保持）**：完全不做過渡，值瞬間切換到下一個關鍵影格。適合需要「瞬間變化」的場合，例如繪製順序（Z-order）這種本質上無法內插的屬性，或者刻意做出「頓格」的表現效果，但一般肢體動作不建議用（會顯得卡頓）。
- **Elastic（彈性）**：超調後回彈才穩定，適合誇張的彈跳/震動效果，**跟本專案「安靜、不催促、不浮誇」的待機動畫風格不合，應避免用在 idle/呼吸等安靜動作上**，若真的需要一點點生氣感，可以考慮只在「舉手」動作結束的瞬間用很輕微的 Elastic 做一點點回彈，但要控制振幅很小。
- **Cubic Value（進階貝茲控制，圖表編輯器）**：功能上等同 After Effects 的貝茲曲線編輯，容許超調（overshoot），適合需要「預期動作（anticipation）」的細膩表演，本專案若想讓「鞠躬」動作有一點點「先微微後仰蓄力再彎腰」的細節，可以用這個工具做。

**設定預設插值的小技巧**（`keys.md`）：選取關鍵影格後在檢查器點「Set as default」，或取消選取所有物件後在檢查器直接設定「新關鍵影格的預設插值」，可以避免每次都手動改，對於整個角色統一走「安靜、Cubic」的風格特別有用。

### 7.3 Pivot 點設定不當造成的抖動

`learnrive.com` 的 Rigging 入門教學提到：

- Pivot（樞紐點，也叫 origin/anchor）預設在骨骼根部，若沒有依動作需求調整，旋轉會繞著錯的中心點轉，視覺上就會像「抖動」或「跑位」。
- 調整方法：用 **Transform Tools 的 Freeze（快捷鍵 Y）** 移動 pivot 位置而不影響現有美術/骨骼的相對關係。
- 實務案例：眼睛群組的 pivot 應該設在「眼睛中心」，這樣做開合眼（不管是 Scale 或旋轉做法）才不會歪掉。
- **本文件對「pivot 造成抖動」的具體排查步驟查到的資訊有限**——`learnrive.com` 這篇教學本身沒有涵蓋「抖動問題」的除錯章節，這部分「未查到官方或社群給出的系統化抖動排查 SOP」，只查到 pivot 概念與調整方法本身，讀者遇到實際抖動問題時建議：先確認父子骨骼的 pivot 是否對齊到視覺上合理的旋轉中心，再確認同一物件是否被多個 layer 同時動畫化（見 3.5 的衝突問題，這也是很常見的「偽裝成抖動」的真正原因）。

### 7.4 循環動畫的首尾接縫問題

社群資料（`learnrive.com` Animating Guide、一般動畫實務）給出的原則：

- 循環動畫的**最後一幀，理論位置/旋轉/縮放狀態應該等於第一幀**，否則循環時會有一個明顯的「跳格」瞬間。
- 常見手法：把第 0 幀的關鍵影格數值複製貼到「循環總長度」那一幀作為終點基準，然後匯出時只播放 0 到「總長度前一幀」，避免最後重複的那一幀造成肉眼可見的「停頓感」。
- Rive 預設 60fps，這是接縫問題排查時的基本前提——若動作在其他影格率下製作再匯進 Rive，要注意時間點是否被重新取樣，可能製造出新的接縫誤差。
- 排查建議：**不要只憑肉眼看 Viewport 播放**，官方/社群都建議打開 **Graph Editor（曲線編輯模式）** 直接檢查曲線在循環頭尾兩端的「數值」與「切線方向（tangent）」是否吻合——光看數值一樣還不夠，切線方向不同的話循環瞬間速度感仍會有一個明顯的「頓挫」。

### 7.5 Blend 造成穿模／肢體錯位

依 3.5 節與 `layers.md`／`rive101.com` 6.4 課的機制原理：

- 最常見原因是**兩個 Layer 同時操作同一根骨骼的同一個屬性**，因為 Rive 的多 layer 衝突規則是「最右邊的 layer 完全覆蓋」，不是「取中間值」，如果兩個姿勢對同一根骨骼給的角度差異很大，切換瞬間（尤其 Duration 設太短或 Exit Time 沒設好）就會出現「肢體瞬間跳到另一個角度」的錯位感，看起來像穿模。
- 對策：(1) 依 3.1／3.5 原則，同一屬性只給一個 layer 負責；(2) 需要疊加時改用 Additive Blend 的「Blend by Property」機制而非兩個一般 Layer 硬疊；(3) 加長 Transition Duration，讓兩個姿勢的骨骼角度差異有時間平滑過渡，而不是瞬間切換。
- Additive Blend 本身如果「基準姿勢（Blend by Value）」跟「疊加姿勢（Blend by Property）」的骨骼初始角度差異過大，也可能疊加出超出正常人體活動範圍的怪異角度（相當於兩個獨立姿勢直接相加），設計 Additive Blend 時建議疊加的幅度盡量小（例如只做「肩膀微聳」這種小範圍疊加姿勢），不要疊加兩個本身就是完整大動作的姿勢。

### 7.6 State Machine 不觸發的常見原因排查（彙整 3.5 節，實務除錯清單）

1. Input 名稱字串打錯（大小寫、拼字），JS 端與編輯器不一致，且**不會報錯**，只會靜默無效——逐字核對是第一步。
2. 忘記等待 Rive 檔案／State Machine 真正 `load`／instantiate 完成才呼叫 setInput/fire，太早呼叫會被忽略。
3. Trigger 被連續觸發、上一次的 Transition 還沒播完就疊加下一次，可能卡在中間狀態；用一個「忙碌中」的 Boolean 做節流。
4. 多 Layer 架構下，只有其中一個 layer 有反應——優先檢查 runtime SDK 版本（曾有已知 issue），其次檢查是否每個 layer 都各自需要單獨 setInput（部分平台/版本的多 layer 行為與預期不同）。
5. Transition 沒有設 Condition，導致「一進入該 State 就立刻無條件轉走」，看起來像「這個姿勢完全播不出來」，其實是被下一個 Transition 瞬間帶走了——檢查是否誤留了空 Condition 的 Transition。
6. Data Binding 情境下：忘記把 Artboard 連結到對應的 View Model Instance（`getting-started-with-data-binding` 文章點名的「最常見初學者錯誤」），導致綁定看起來設定好了卻沒有生效。

### 7.7 命名與圖層整理的組織紀律建議

- Input：camelCase（`isWalking`、`blinkTrigger`、`nightFactor`）；State：PascalCase（`Idle`、`RaiseHand`、`Bow`、`Walk`、`Celebrate`）——與 3.3 節一致，全專案統一格式。
- 骨骼命名要有意義（`learnrive.com`：「幫骨骼取名字，之後做動畫會輕鬆很多」），尤其本專案角色部位多（帽子/衣服/手持物/背景四個可換部位＋斗篷＋眼睛等），命名混亂會讓日後「新增裝扮」或「交接給其他開發者」的成本大增。
- 維護一份「Input／Enum 選項／Event 名稱」對照表（文件形式即可，不需要額外系統），這是 DEV Community 文章與資料綁定文章都不約而同強調的紀律——因為 JS 字串與 Rive 編輯器內部命名是兩個獨立系統，唯一的橋樑是「人為維護的對照文件」，這份文件本身可以視為本研究成果的延伸物，建議整理進本專案 `docs/` 底下的角色動畫技術文件。

### 本節來源
- https://rive.app/docs/getting-started/best-practices
- https://rive.app/docs/editor/animate-mode/interpolation-easing.md
- https://rive.app/docs/editor/animate-mode/keys.md
- https://www.learnrive.com/creating-animations/intro-to-rigging
- https://www.learnrive.com/creating-animations/animating-guide
- https://rive101.com/en/lesson/6-4/
- https://rive.app/blog/getting-started-with-data-binding
- https://github.com/rive-app/rive-flutter/issues/110
- https://github.com/rive-app/rive-flutter/issues/342

---

## 8. 一步步 SOP：建立 idle + blink + raise-hand + bow + walk 的完整 State Machine

> 這份清單綜合第 1-7 節的研究結果整理而成，是「照做」導向的操作指南，適合不熟 Rive 的協作者依序執行。角色骨架已經綁好（依任務背景），以下從「已有骨架與美術部件」的階段開始。

### Step 0：準備動畫素材（Animate Mode）

1. 為以下每個「離散姿勢」各做一條獨立的 timeline（依 2.1 的結論，離散姿勢用一個 timeline 一個 pose）：
   - `Idle`：呼吸（軀幹骨骼極小幅旋轉/位移，2-4% 幅度）＋斗篷微晃（斗篷骨骼鏈小幅擺動），做成 Loop，長度建議 3-6 秒一個循環（安靜、不催促的節奏，太短會顯得緊張）。
   - `RaiseHand`：從放下到舉起，做成 One-Shot（不循環），長度建議 0.6-1.2 秒（依角色體型調整，寧可稍慢也不要顯得倉促）。
   - `Bow`：從站直到鞠躬再回正，做成 One-Shot，長度建議 1.0-1.8 秒（鞠躬要有「蓄力」與「停頓」的儀式感，可用 7.2 節提到的 Cubic Value 做一點點預期動作）。
   - `Walk`：原地踏步循環（手機小遊戲常見做法），做成 Loop，注意 7.4 節的首尾接縫檢查。
   - `Blink`：眼睛（或眼皮群組）Scale Y 100%→0%→100%，做成 One-Shot，長度建議 0.15-0.25 秒（眨眼要快，太慢會像「昏倒」而不是眨眼），插值用 Cubic Ease In-Out（依 1.2 節結論，先用 Scale Y 做法，若後續發現視覺失真再考慮 mesh）。
   - `Celebrate`（為未來「完成今日靈修」預留）：可以先做一個簡單版本（例如舉雙手＋一個小跳或發光特效），One-Shot，長度依設計而定。
2. 每條 timeline 命名清楚（跟第 3.3／7.7 節的 PascalCase 慣例一致），並統一將預設插值設為 Cubic（依 7.2 節，符合「安靜不浮誇」風格；`Blink` 例外可以維持 Cubic 但曲線更陡）。

### Step 1：規劃 Layers（依 3.1 節分工原則）

建立三個（或依需要四個）Layer：

| Layer 名稱 | 職責 | 掛載的 State |
|---|---|---|
| `Body` | 主要姿勢邏輯 | Entry → Idle ⇄ RaiseHand ⇄ Bow ⇄ Walk，以及 Any State → Celebrate |
| `Face` | 眨眼 | Entry → (Blink 用 Any State 觸發的一次性 State，播完自動回到一個空的 Idle-Face 佔位 State) |
| `Environment`（可選，若採用 4.3 的「速度係數」做法） | 不畫任何東西，純粹提供 `nightFactor` 這個 Number 給其他機制引用/綁定 | 通常不需要 State，只需要 State Machine 層級的 Input，不一定要獨立成一個 Layer——**若採用 Data Binding 的 Number Property 做法（4.3 節建議），這個「係數」直接放在 View Model 裡即可，不需要額外的 Layer**，此列僅供「若選擇用純 State Machine Input 而非 Data Binding」時的備案 |

### Step 2：建立 Inputs（依 3.2／3.3 節命名慣例）

| Input 名稱 | 型別 | 用途 |
|---|---|---|
| `isWalking` | Boolean | 控制 `Body` Layer 在 `Idle` 與 `Walk` 之間切換 |
| `raiseHandTrigger` | Trigger | 觸發舉手動作 |
| `bowTrigger` | Trigger | 觸發鞠躬動作 |
| `blinkTrigger` | Trigger | 觸發一次眨眼（由 JS 端隨機計時器呼叫，見 1.3 節做法 A） |
| `celebrateTrigger` | Trigger | 觸發完成今日靈修的慶祝動畫（未來擴充，先建好備用） |
| `isBusy`（可選） | Boolean | 給 JS 端／內部 Condition 判斷「重要動作播放中，避免疊加觸發」（依 3.5／7.6 節的節流建議） |

若採 Data Binding 做法（4.3 節建議），額外在 View Model 建立：
- `nightFactor`（Number，例如 1.0＝白天正常速度、0.5＝夜間放慢一半）
- 四個換裝用的 `Image` Property：`hatImage`、`clothesImage`、`heldItemImage`、`backgroundImage`

### Step 3：搭建 `Body` Layer 的 Graph（依 2.1／2.2／3.4 節）

1. `Entry` → `Idle`（無條件，State Machine 一開始就進 Idle）。
2. `Idle` → `RaiseHand`：Condition＝`raiseHandTrigger`；Duration 建議 **0.15-0.25 秒**、Interpolation 選 Cubic；`RaiseHand` 這個 State 本身設 **Exit Time＝100%**（強迫完整播完，依 2.2 節原則，避免舉手動作被打斷）；勾選關閉 `Allow Exit During Transition`（避免連續觸發造成穿模，依 7.5 節）。
3. `RaiseHand` → `Idle`：無 Condition（Exit Time 100% 播完後自動接回），Duration 建議 **0.15-0.2 秒**。
4. `Idle` → `Bow`：Condition＝`bowTrigger`；Duration **0.2-0.3 秒**；`Bow` 設 Exit Time＝100%，同樣關閉 Allow Exit During Transition。
5. `Bow` → `Idle`：無 Condition，Exit Time 播完後自動接回，Duration **0.2-0.25 秒**。
6. `Idle` ⇄ `Walk`：兩條 Transition，Condition 分別是 `isWalking == true`（進 Walk）與 `isWalking == false`（回 Idle），Duration 建議 **0.2-0.3 秒**讓走路啟動/停下有一點點緩衝感，不需要 Exit Time（因為 Walk 本身是 Loop，沒有「播完」的概念，靠 Boolean 直接切換即可，依 2.3 節「只有走/不走兩態不需要 1D Blend」的結論）。
7. **Any State → Celebrate**：Condition＝`celebrateTrigger`，Duration 建議短一點（**0.1-0.2 秒**，讓「插隊」的反應夠快），Exit Time 依 Celebrate 動畫長度設 100%（播完整段慶祝動畫）。`Celebrate` → `Idle`：無 Condition，播完自動接回。

### Step 4：搭建 `Face` Layer 的 Graph（依 1.3／1.4 節）

1. `Entry` → 一個空的佔位 State（例如 `FaceIdle`，可以是完全靜止、不含任何關鍵影格的極短 timeline）。
2. `FaceIdle` → `Blink`：Condition＝`blinkTrigger`，Duration 可設 0（眨眼是快速動作，不太需要額外淡入淡出，反而 Scale Y 本身的 Cubic 插值已經負責平滑度），不設 Exit Time（讓 Blink 這個 One-Shot 自然播完自動接回也可以，或明確設 Exit Time＝100%）。
3. `Blink` → `FaceIdle`：無 Condition，自動接回。
4. **JS 端邏輯**：用 `setTimeout` 產生 2-6 秒隨機區間（依 1.3 節建議），每次到時間呼叫 `.fire('blinkTrigger')`，觸發完再重新排下一次隨機區間，如此循環，達成「隨機但不會太密集或太稀疏」的自然眨眼節奏。若想更精緻，可依 1.3 節「Considered Randomness」的概念，在 `raiseHandTrigger`／`bowTrigger` 觸發的同時也順手觸發一次 `blinkTrigger`，讓眨眼跟動作情境掛勾，看起來更「有生命」而非機械隨機。

### Step 5：夜間放慢（依 4.3 節）

1. 建立一個 View Model（例如叫 `CharacterVM`），加入 `nightFactor`（Number）Property，Instance 綁定到本角色的 Artboard。
2. 在編輯器裡，逐一對 `Idle`、`RaiseHand`、`Bow`、`Walk`、`Blink` 這幾個 Animation State 的 **Speed** 欄位右鍵選擇「Data Bind」，綁定到 `nightFactor`（此步驟依 4.3 節標註為「機制上可行、但沒有查到官方逐步教學」，建議先在一個 State 上小範圍試作，確認綁定後 Speed 確實隨 `nightFactor` 數值變化，再套用到其餘 State）。
3. JS 端依「現在是不是夜間」的判斷（本專案應該已有日夜判斷邏輯，或用裝置時間），把 `nightFactor` 的值設為 `1.0`（白天）或 `0.5`（夜間，可依實測手感調整，這個係數沒有官方建議值，需自行試出「放慢但不會顯得卡頓」的平衡點）。

### Step 6：換裝（依 4.2 節）

1. 在 `CharacterVM` 加入四個 Image Property：`hatImage`、`clothesImage`、`heldItemImage`、`backgroundImage`。
2. 場景裡對應的帽子、衣服、手持物、背景圖片元素，逐一右鍵「Data Bind」綁定到對應的 Image Property。
3. JS 端維護一份「裝扮 ID → 圖片資源」的對照表，玩家換裝時，把對應 Property 的值換成新圖片的資料即可，不需要碰 Rive 場景結構或編輯器（依 4.2 節「資料與場景解耦」的核心價值）。

### Step 7：驗收檢查清單（綜合 7.6 節排查重點）

- [ ] 逐一在編輯器內手動觸發每個 Input，確認每個 Transition 都有按預期發生（先在編輯器內驗證，再接 JS）。
- [ ] 確認 `Idle`、`Walk` 這類 Loop 動畫的首尾銜接沒有跳格（依 7.4 節，用 Graph Editor 檢查曲線頭尾）。
- [ ] 確認 `RaiseHand`、`Bow`、`Celebrate` 這些設了 Exit Time 100% 的動作，快速連續觸發時不會出現穿模或卡在中間姿勢（依 7.5／3.5 節）。
- [ ] 核對 JS 端呼叫的字串（Input 名稱、Property 名稱）跟編輯器裡完全一致，大小寫、拼字逐字比對（依 3.3／7.6 節，這是最容易出錯又最難被發現的一類問題）。
- [ ] 確認 JS 端在 Rive 檔案／State Machine 真正 load 完成之後才開始呼叫任何 setInput／fire／Property 賦值（依 3.5／7.6 節）。
- [ ] 檔案匯出前跑一次 7.1 節的檔案優化檢查：刪除未使用 Artboard、壓縮圖片資產、檢查關鍵影格數量是否可用骨骼/約束精簡。

---

## 總結／給本專案的建議

1. **架構分工**：Rive 只負責「動畫呈現＋姿勢邏輯（State Machine）」，遊戲規則與資料邏輯留在既有的 `app.js`／`content.js`，**不需要引入 Scripting／Luau**——目前描述的所有需求（隨機眨眼、夜間放慢、換裝、儀式觸發）用 State Machine + Data Binding + 前端 JS 三者組合即可完整覆蓋，維持現有分工比較簡單、也比較好除錯。
2. **待機動畫**：呼吸走骨骼位移／旋轉（利用既有骨架），眨眼先用 Scale Y（成本最低），隨機間隔交給 JS 端計時器＋Trigger，多個微動作用**不同 Layer**分工（呼吸/眨眼/斗篷各自獨立骨骼與物件），不要用 Additive Blend——那是留給「同一根骨骼要疊加多個姿勢」的更進階情境。
3. **姿勢切換**：站姿/舉手/鞠躬用「一個 timeline 一個 pose ＋ Transition」，走路用 Boolean 直接切換（不需要 1D Blend，因為本專案走路只有單一速度的原地循環），關鍵動作記得設 Exit Time 100% ＋關閉 Allow Exit During Transition，避免被打斷造成穿模。
4. **換裝與夜間放慢**：優先用 2025 年後的 **Data Binding（Image Property 做換裝、Number Property 做夜間速度係數）**取代傳統 Solo 換圖，這跟本專案「換裝清單會持續擴充」「JS 端已經在管理裝扮邏輯」的現況最契合，且是 Rive 官方目前主推的新標準做法（舊版 State Machine Event 通訊機制已被官方明確標示棄用）。
5. **慶祝動畫的預留設計**：用 **Any State → Celebrate（Trigger 驅動）** 的模式先把架構搭好（即使動畫內容之後才做），未來只要 JS 端呼叫 `celebrateTrigger`，不論角色當下在哪個狀態都能立刻插隊播放，並可搭配 State 的「結束時觸發 Event」讓網頁 UI 精準對上動畫完成的瞬間。
6. **本研究誠實標註的知識缺口**（供之後查證或實測補齊，不建議直接假設）：
   - 官方文件沒有給「Transition Duration／Exit Time 的建議數值範圍」，本文件第 8 節 SOP 的秒數是綜合一般動畫實務經驗與可查到的線索推算，**不是 Rive 官方明文建議值**，實作時仍需依角色實際手感微調。
   - 「Number Property 綁定 Animation State 的 Speed 做夜間放慢」只查到機制可行的佐證（社群討論串標題、Speed 欄位存在），沒有查到官方逐步教學頁面，建議先小範圍試作驗證再全面套用。
   - Scripting（Luau）是否綁定在特定付費方案之下（例如免費版能不能寫，只是不能匯出），沒有查到明確定論。
   - Pivot 點造成抖動的系統化排查 SOP，沒有查到官方或社群給出完整故障排除流程，本文件只能提供概念性建議。

---

## 完整來源清單（去重彙整）

**官方文件**
- https://rive.app/docs/editor/animate-mode/animate-mode-overview.md
- https://rive.app/docs/editor/animate-mode/timeline.md
- https://rive.app/docs/editor/animate-mode/keys.md
- https://rive.app/docs/editor/animate-mode/interpolation-easing.md
- https://rive.app/docs/editor/state-machine/state-machine.md
- https://rive.app/docs/editor/state-machine/states.md
- https://rive.app/docs/editor/state-machine/transitions.md
- https://rive.app/docs/editor/state-machine/layers.md
- https://rive.app/docs/editor/state-machine/listeners.md
- https://rive.app/docs/editor/events/overview.md
- https://rive.app/docs/editor/events/general-events.md
- https://rive.app/docs/editor/data-binding/overview.md
- https://rive.app/docs/editor/data-binding/view-models.md
- https://rive.app/docs/editor/data-binding/property-types.md
- https://rive.app/docs/editor/data-binding/binding-data.md
- https://rive.app/docs/editor/data-binding/controlling-data.md
- https://rive.app/docs/editor/data-binding/enums.md
- https://rive.app/docs/scripting/getting-started.md
- https://rive.app/docs/getting-started/best-practices
- https://rive.app/docs/runtimes/state-machines
- https://help.rive.app/runtimes/overview/web-js/low-level-api-usage

**官方部落格**
- https://rive.app/blog/how-state-machines-work-in-rive
- https://rive.app/blog/getting-started-with-data-binding
- https://rive.app/blog/why-scripting-runs-on-luau
- https://rive.app/blog/scripting-is-live-in-rive
- https://rive.app/blog/rive-s-new-9-mo-plan
- https://rive.app/blog/rive-ai-coding-agent-faq
- https://rive.app/changelog

**教學與社群**
- https://rive101.com/en/lesson/6-4/
- https://www.learnrive.com/creating-animations/intro-to-rigging
- https://www.learnrive.com/creating-animations/animating-guide
- https://www.rivemasterclass.com/blog/rive-blink-animation-how-to-make-any-character-feel-alive-with-3-keyframes
- https://withloveapp.substack.com/p/procedural-animation-in-rive-how
- https://dev.to/uianimation/engineering-interactive-mascots-with-rives-state-machine-and-runtime-architecture-4e2h
- https://community.rive.app/c/support/control-playback-speed-via-databinding
- https://www.npmjs.com/package/rive-js

**其他佐證（GitHub issue，用於踩坑清單）**
- https://github.com/rive-app/rive-flutter/issues/110
- https://github.com/rive-app/rive-flutter/issues/342
