# Rive 編輯器 2D 角色骨架動畫技術知識庫

> 用途：靈修冒險（Bible-game）角色零件（頭、上身、上臂、前臂、裙、靴、外袍前後片、帽兜後片）匯入 Rive 編輯器綁骨架、換裝、待機動畫、動作動畫的實作參考。
> 研究方式：多個獨立研究批次以 WebSearch／WebFetch 實際抓取 Rive 官方文件（rive.app/docs、help.rive.app、GitHub `rive-app/help-center` 原始 Markdown）、Rive 官方 blog、rive101.com、learnrive.com、community.rive.app 討論串。所有內容附來源 URL；查不到的地方一律明寫「未查到」，不編造。
> 建立日期：2026-09-06。目標讀者：已熟悉遊戲開發、但沒用過 Rive 編輯器的工程師。

---

## 目錄

1. [匯入零件](#1-匯入零件)
2. [骨架基礎](#2-骨架基礎)
3. [綁定圖片到骨頭](#3-綁定圖片到骨頭)
4. [約束（Constraints）](#4-約束constraints)
5. [換裝系統](#5-換裝系統)
6. [畫序（Draw Order）](#6-畫序draw-order)
7. [資深技巧與常見踩坑](#7-資深技巧與常見踩坑)
8. [一步步 SOP](#8-一步步-sop)

---

## 1. 匯入零件

### 1.1 支援格式與匯入方式

- 點陣圖格式：**JPEG、PNG、WebP**。另支援 **PSD**（Photoshop 分層檔）、**SVG**（會轉成可編輯的 Rive 向量物件，不是點陣圖）、字型 TTF/OTF、音訊 MP3/WAV/FLAC；付費 Enterprise 方案另支援 `.lottie`。
- 匯入路徑兩種：
  - **拖放**：直接把檔案拖進編輯器視窗。格式不在支援清單內時，編輯器會跳提示問是否要當「custom blob asset」匯入。
  - **Assets 面板**：打開 Assets 面板 → 點 **+** 按鈕 → 選 Upload 瀏覽匯入。

### 1.2 PSD 圖層匯入行為

- 把整份 PSD **拖到 artboard 上**：Rive 會建立一個 **Group**，把所有圖層都塞進這個 Group 裡——圖層結構會被攤平成「一個 Group 裝多個獨立圖層」，**不會**自動變成多層巢狀的 Rive Group 階層，也**不會**自動變成多個 Artboard。
- 也可以只把 PSD 裡**個別圖層**單獨拉到 artboard 上，不整包匯入。
- **PSD 裡設為隱藏（invisible）的圖層不會被匯入**。
- **踩坑**：日後在 Photoshop 把圖層改名再重新匯入，Rive 會當成「新圖層」處理，可能打斷既有的資源參照（換裝、綁定會失效）——**PSD 圖層命名要在專案初期定案，之後不要改名重匯**。
- PSD 圖層的匯出設定（Compression、Export Options）與一般點陣圖完全相同，可逐層個別設，也可整批套用。
- 未查到：PSD 資料夾（group）多層巢狀結構對應到 Rive Group 的規則、是否支援智慧物件／調整圖層、PSD 檔案大小上限。

### 1.3 圖片解析度與檔案大小官方建議

- **解析度要對應實際顯示尺寸**：官方原文舉例——不要用 8192×7022 的大圖卻只顯示在 100×100 的區塊裡；顯示 200×200px 就上傳 200×200px 的圖，用更大的圖「只會多耗記憶體」。大圖即使壓縮過，仍會佔用大量裝置記憶體，行動裝置上尤其嚴重。
- 若圖片很大但畫面上一次只顯示一部分（如可捲動背景），建議「切成小塊」或部分改用向量重畫，混合點陣與向量。
- **壓縮格式建議**：官方原文——「For the smallest image file size and best performance, we recommend exporting assets using the WebP Format.」
- 編輯器內壓縮是非破壞性的：原圖仍保留在編輯器裡，只有匯出 `.riv` 時才依設定的壓縮參數重新編碼。
- 未查到：官方是否有具體的「單張圖檔案大小上限（MB）」或「整個 `.riv` 建議總大小上限」的量化數字——文件只給「按顯示尺寸決定解析度」的原則，沒有硬性數字。

### 1.4 Embedded / Referenced / Hosted 三種資源模式

在 Assets 面板選取已匯入的資源，Inspector 會顯示 **Export Options**：

**(a) Behavior（是否匯出）**：`Automatic`（預設，只有實際被用到才匯出）／`Force Export`（強制匯出）／`Prevent Export`（都不匯出）。

**(b) Type（資源打包方式，三選一，最關鍵）**：
- **Embedded**：圖片資料直接內嵌進 `.riv` 二進位檔。
- **Referenced**：`.riv` 檔裡只存參照／指標，實際圖片資料不在檔案裡，需在 runtime 另外提供。
- **Hosted**：圖片改由 **Rive 伺服器 CDN** 載入，不內嵌也不用自己提供——**僅限付費 Voyager 方案**。

（SVG 只支援 Automatic，因為匯入後已轉成 Rive 向量物件，不是獨立檔案資源。）

**(c) Compression 面板**（點陣圖與 PSD 才有）：選壓縮格式（建議 WebP）＋ Quality 滑桿權衡畫質與檔案大小。

存取路徑：**Assets 面板 → 選取資源 → Inspector（Information／Compression／Export Options 三區塊）**。

### 1.5 Embedded vs Referenced 對 Runtime 動態換圖的影響（重點）

- **Embedded**：載入 `.riv` 時圖片資料自動一起載入，不需程式碼介入，但已固定在檔案裡，彈性低。
- **Referenced**：`.riv` 不含圖片資料，playback 端**必須**提供 `assetLoader` callback 自行決定怎麼載入，因此程式碼可完全控制載入時機與內容，天生適合動態替換。

官方 `assetLoader` 範例（web runtime）：

```javascript
assetLoader: (asset, bytes) => {
    // embedded（bytes 有內容）或 hosted（有 cdnUuid）：回傳 false，交給 Rive 內建流程
    if (asset.cdnUuid.length > 0 || bytes.length > 0) {
        return false;
    }
    if (asset.isImage) {
        // 自行載入這個資源
        return true;
    }
}
```

**但官方文件明確指出：若目的是「執行期動態替換圖片」（本專案換裝場景），正確做法不是 `assetLoader`，而是 Data Binding 的 Image 屬性**（原文：「If you want to dynamically replace images, use image data binding」）。

**Data Binding Image（web runtime，`@rive-app/canvas` / `webgl` 皆適用）**：

```javascript
// 取得 view model instance 上名為 "bound_image" 的 image 屬性
const vmi = r.viewModelInstance;
const imageProperty = vmi.image("bound_image");

// 把外部取得的位元組解碼成 Rive 可用的 RenderImage
const image = await rive.decodeImage(
    new Uint8Array(await res.arrayBuffer())
);

imageProperty.value = image;   // 指定給屬性，畫面立即換圖
image.unref();                 // 選擇性：釋放記憶體
imageProperty.value = null;    // 清空／移除圖片
```

（React 封裝版本是 `useViewModelInstanceImage` hook，回傳 `{ setValue }`，內部一樣呼叫 `decodeImage` 後設值。）

**與 embedded/referenced 的關係**：Data Binding 換圖是「用新解碼出來的 RenderImage 覆蓋顯示」，跟原始資源打包方式（embedded/referenced/hosted）是兩條不同路徑，官方文件沒有寫「必須 referenced 才能用 data binding 換圖」的限制。實務考量：
- 原圖 **embedded**：`.riv` 較大（原圖仍打包在檔案裡），適合當「預設圖／fallback」。
- 原圖 **referenced**：`.riv` 較小，但程式必須自己準備初始圖片，適合「一開始就打算完全由程式決定圖片內容」的情境（例如本專案角色換裝零件）。

未查到：官方對「referenced 圖片在 Nested Artboard 內用 data binding 換圖」的已知限制清單；「embedded 圖片被 data binding 覆蓋後，原 embedded 資料是否會被 tree-shake 掉」的說明。已嘗試 community.rive.app 兩則相關討論串（`Data binding images in Runtime (as embedded assets)`、`How to Switch Out Referenced Images Using Image Inputs...(Nested Artboards)`），因頁面 JS 動態渲染，WebFetch 只抓到標題、抓不到內文。

**來源**：
- https://rive.app/docs/editor/fundamentals/importing-assets
- https://rive.app/docs/editor/fundamentals/assets-overview
- https://rive.app/docs/editor/assets/psd.md
- https://rive.app/docs/editor/assets/svg.md
- https://rive.app/docs/getting-started/best-practices
- https://rive.app/docs/runtimes/web/loading-assets.md
- https://rive.app/docs/runtimes/web/data-binding
- https://rive.app/blog/data-binding-supercharged-lists-images-and-artboards

---

## 2. 骨架基礎

### 2.1 Bone 工具與畫骨頭

- **啟用**：工具列 Transform Tools 選單裡的 Bone 工具，**快捷鍵 `B`**。
- **畫法**：第一下點擊＝骨頭起點（顯示藍色、尚未真正建立）；第二下點擊才真正建立骨頭，同時決定長度與方向。持續點擊可延伸下一根骨頭，**鏈中新畫的每根骨頭自動變成前一根的子骨（child）**。
- **收尾**：按 `Esc`，或切回 Select 工具（快捷鍵 `V`）。
- **分支鏈**：要從既有鏈的某個關節長出新分支，先在畫布或階層面板**選取該關節（joint）**，再啟用 Bone 工具繼續畫。
- **Joint（關節）**：骨頭間的控制點，**不會出現在 Hierarchy 面板中**，本身非獨立物件；拖動 joint 會改變相鄰骨頭的長度與旋轉。

### 2.2 根骨（Root Bone）放哪裡

- **Rive 官方技術定義**：一條骨頭鏈裡**第一根畫出來的骨頭**就是 root bone，特徵是**只有 root bone 有 X／Y 座標屬性**（可在世界／父層空間平移），其餘子骨頭只用 Length 與 Rotation 相對父骨頭定位——這是引擎層級的結構規則，**官方文件本身沒有明講「root 必須放骨盆」**。
- **業界慣例（非 Rive 官方硬性規定）**：learnrive.com 企鵝角色教學中，root 從**雙腳之間（相當於骨盆／髖部）**開始畫，一路到頭部；通用 2D／3D 角色綁定通則也是「root 放骨盆，因為骨盆是軀幹與四肢動作的力學中心」。
- **結論**：骨盆／髖部作為軀幹主鏈 root 起點是**廣泛業界慣例**，但不是 Rive 官方文件白紙黑字的規定；Rive 官方只規定「root＝鏈中第一根、擁有 XY 座標」這個技術定義，實際放哪個身體部位由使用者決定。

### 2.3 骨頭長度與 Pivot

- **建立時決定**：第一次點擊＝pivot（起點），第二次點擊位置同時決定長度與旋轉方向（骨頭尖端指向第二次點擊處）。
- **一般規則**：Bone 的 pivot 預設在**骨頭 Root（起始端）**，即與父骨頭連接的關節上；旋轉一律繞這個起始端發生。
- **建立後調整**：
  - 直接拖動 joint（骨頭尾端關節控制點）：會改變該骨頭長度／旋轉，同時連動改變下一根子骨頭的起點。
  - Inspector 直接輸入數值：Root bone 有 `X`、`Y`、`Length`、`Rotation` 四欄位；子骨頭只有 `Length` 與 `Rotation`。
  - Pivot 視覺位置跑掉時，需用 **Freeze**（見 2.5）重新擺放，不影響已掛的子物件位置。

### 2.4 父子關係（Parenting）

官方文件列出兩種「把美術掛到骨頭上」的方式：

- **方式一：階層拖拉（本專案 PNG 換裝零件適用）**——在 Hierarchy 面板把要跟著骨頭動的圖層（shape／image／group）**直接拖曳到目標骨頭上**，該圖層成為子物件，之後骨頭的位置／旋轉／縮放連動傳給它。任何形狀、圖片、群組，或另一串骨頭群組，都可以這樣掛上去。骨頭建議命名清楚，方便對照時間軸。
- **方式二：Binding（綁定，屬於 mesh／頂點加權範疇）**——選取路徑圖層、按 Enter 進入 Edit Vertices 模式，Inspector 出現「Bind Bones」，按 `+` 選骨頭，手動對每個頂點設百分比權重（總和需 100%）。詳見第 3 節。

### 2.5 Freeze 與 Origin 的差異

- **Origin（原點／pivot／anchor point）**：所有變形（縮放、旋轉…）的計算基準點。例如矩形 Origin 在中心會朝四周等比放大，Origin 靠左只會往右長。骨頭的 pivot 概念上就是它的 Origin。調整方式：用 Freeze 在畫布拖動；或 Inspector 直接輸入數值；或用 Align Tools（選取物件後按住 Option/Mac 或 Alt/Win 重新定位原點）。
- **Freeze（快捷鍵 `Y`）**：一種「操作模式」，讓你**移動父層物件本身、不牽動其子物件的實際位置**——正常移動有子物件的父層，子物件會跟著位移；開啟 Freeze 後畫布出現藍色外框提示，此時移動的是父層 Origin 本身，子物件畫面上維持原地不動。用途：不用重整階層結構就能修正一個位置沒放好的骨頭／群組原點，尤其是把美術掛上骨頭之後發現 pivot 沒對準關節時。
- **差異一句話**：Origin 是「變形要繞哪個點轉」的**設定值**；Freeze 是「怎麼安全地改動那個設定值、同時不波及子物件、不破壞既有關鍵幀」的**操作手法**。
- **實務陷阱**（來自 rive101.com 教學，技術上準確）：在 Design Mode 對已有動畫的圖層按 `Cmd+G` 群組，Rive 會自動把新群組的 Origin 設到該群組 bounding box 中心，這會讓既有位置關鍵幀全部跑掉（Position 數值是相對父層 Origin 算的）。建議先建一個位置對齊原父層（通常是 Artboard 的 0,0）的空群組，再把動畫圖層丟進去。

### 2.6 關節重疊區怎麼藏——「美術多畫一點蓋住」是否必要

- **Rive 官方文件並未直接就此問題給建議**。官方的 Bones Tips 頁面（見 2.7）談的是另一個主題（用權重讓貝茲把手產生立體感），不是「PNG 零件關節破洞」對策。
- **官方提供的技術替代方案是 Mesh**：讓點陣圖產生自然、有機的形變（皮膚彎曲、布料飄動），把頂點綁到骨頭上加權，圖片彎折時本身跟著變形——但這是根據 Mesh 功能定位做的**合理推論**，官方頁面沒有明講「這就是用來解決關節重疊破洞」的因果關係。
- **業界普遍做法（非 Rive 專屬）**：確實存在「美術端在肩、肘、膝、髖等關節處，把該片圖層邊緣往下層連接件下方多延伸一點（隱藏重疊區）」的做法，避免旋轉露出空隙——這是**一般 2D cutout 動畫的泛用業界慣例**（Flash/Spine/DragonBones/Rive 皆適用），不是 Rive 官方文件的規範文字。
- **結論（供實作參考，非官方明文）**：
  1. 對「不需要形變、只需要剛體旋轉」的關節（本專案上臂／前臂、裙／靴這類硬 PNG 換裝零件），**「美術多畫重疊區蓋住破洞」是最務實、成本最低、業界公認可行的做法**，Rive 官方沒有反對，只是沒寫進文件當最佳實踐條列。
  2. 需要更精緻形變（衣服隨手臂自然拉伸）時，官方技術手段是 Mesh + 頂點加權（見第 3 節）。
  3. 未查到 Rive 官方或社群針對「重疊美術 vs mesh」兩種做法的正式比較文章；已嘗試 community.rive.app（含一則因 JS 動態渲染而無法讀取內文的討論串：關節重疊在編輯器內正常、輸出到 Webflow 後變成可見瑕疵）與官方部落格，均未找到具體比較結論。

### 2.7 Bones 官方「Tips and Best Practices」頁面完整內容

官方確實有獨立頁面 **Bone Tips**（`editor/manipulating-shapes/bones/tips-and-best-practices`），完整內容如下：

> 開頭語：「你如何綁定你的設計很重要。一個聰明的骨架設定能讓你用更少的關鍵幀完成動畫，讓時間軸維持整潔好用。」

**(一) 用骨頭同時控制多個頂點**：Rive 可以把「頂點（vertices）」與「貝茲控制把手（bezier handles）」綁定到骨頭上，不同骨頭可控制同一形狀裡不同的頂點群。官方範例：翻書頁動畫，把書頁頂端和底端的貝茲把手都連到**同一根骨頭**，只用少數幾根骨頭當控制器就能做出自然形變。

**(二) 加權方式很重要**：對同一頂點與其貝茲把手設定**不同權重**，可做出有趣形變效果。官方範例：橘子剝皮動畫，背面形狀的上下貝茲把手被設成跟所屬頂點不同的權重，骨頭縮放時把手移動速度與頂點不同步，因而營造出擬 3D 立體感。

**備註**：此頁主題是「骨頭＋vertex/handle 綁定加權」，屬於 mesh/weights 技術範疇，不是「角色骨架搭建流程」或「關節重疊處理」的最佳實踐清單。未查到官方另有一份針對「畫骨頭鏈一般性最佳實踐」（根骨位置、命名規範、關節重疊處理）的獨立條列頁面（已嘗試 `rive.app/docs/editor/bones/`〔404〕、`help.rive.app` 對應頁〔轉址回同頁〕、GitHub help-center 倉庫逐檔比對）。

**來源**：
- https://rive.app/docs/editor/manipulating-shapes/bones
- https://help.rive.app/editor/manipulating-shapes/bones/tips-and-best-practices
- https://rive.app/docs/editor/fundamentals/freeze-and-origin
- https://rive.app/docs/editor/manipulating-shapes/meshes
- https://rive101.com/en/lesson/5-2/
- https://rive101.com/en/lesson/2-7/
- https://www.learnrive.com/creating-animations/intro-to-rigging
- https://drawphics.com/how-to-rig-a-2d-character/ （通用 2D 綁定教學，非 Rive 官方，僅佐證業界慣例）
- https://community.rive.app/c/support/exporting-files-to-webflow-my-character-design-joints-where-they-overlap-are-visible-on-the-webflow-site-design-published-but-not-when-it-is-in-rive-itself-how-do-i-fix-this （討論串存在但內文抓取失敗）

---

## 3. 綁定圖片到骨頭

### 3.1 直接把圖片 Parent 到骨頭（Rigid Parenting）

- **操作**：在 Hierarchy 面板把圖片（或形狀、群組、其他骨頭群組）圖層**拖曳到目標骨頭上**建立親子關係。官方原文：「Make an element a child of a bone to control its transform. When the bone moves, rotates, or scales, its children follow without being deformed.」
- **適用時機**：需要維持原形狀、不需彎曲變形的**剛性部件**——官方例子「a hand, shoe, or mechanical component」。對應本專案：頭、靴子適合直接 parent。
- **限制**：子元素完整跟隨骨頭位置／旋轉／縮放，**整塊剛性移動，不會產生任何內部形變**；旋轉時圖片硬邦邦整塊轉動。需要跟著關節自然彎曲的部件（前臂、袖子）不適用，必須改用 Mesh + Weights。

### 3.2 Mesh + Weights 綁定

**建立 Mesh**：選取圖片按 **Enter** 進入編輯；或在 Inspector 的 **Deform** 區段點 **＋**、選 **Mesh**（部落格教學說法：選圖像後 Inspector 點「Create Mesh」）。建立後自動生成含 4 頂點、2 三角形的基礎輪廓。

**Vertex 新增/編輯**：
- 按 **P** 鍵或勾選 **Edit Contour** 進入「輪廓編輯模式」，用 **Mesh Pen 工具**新增/移動頂點，不會扭曲既有圖像。連續點擊建立強制邊；點擊間按 `Esc` 產生獨立頂點，讓 Rive 自動三角剖分。移除強制邊：`Cmd+click`（Mac）／`Ctrl+click`（Win）點該邊。
- 按 **V** 鍵或取消勾選 Edit Contour，進入「網格編輯模式」——此時移動頂點直接改變三角形形狀、扭曲內部像素（跟輪廓編輯模式不同）。
- 官方建議：「盡量用最少必要的頂點達成想要的變形」，非必要不要多加。

**綁定骨頭（Bind Bones）與 Weights 分配步驟**：
1. 選取 Mesh，Inspector 的 **Bind Bones** 區段點 **＋**。
2. 單擊選一根骨頭，或按 `Shift` 多選，選完按 **Done** 或 `Enter`。
3. Rive 自動給每個頂點初始權重（influence）——「combined weights always equal 100%」，一頂點可被一或多根骨頭共同影響，總和恆 100%。
4. 每個頂點顯示**圓餅圖**，用各骨頭指定顏色表示影響比例。
5. 手動調整權重：
   - Inspector：選一或多個頂點，在 Bind Bones 區段輸入各骨頭百分比（需總和 100%）。
   - **Weight 工具**（快捷鍵 **W**，Edit Mesh 模式下啟用；向量路徑版本快捷鍵 **Shift+B**，顯示 "Weight Pies"）：先選頂點、再選一根骨頭，在舞台**上下拖曳**滑鼠即可增減該骨頭對此頂點的權重。
6. 可對頂點的特定骨頭權重**上鎖（Lock）**，鎖定後調整同頂點其他骨頭權重時該值不變。
7. **前置條件**：程序性形狀（矩形、橢圓）須先轉成自訂路徑（custom path）才能綁定；已有網格的圖片、自訂路徑可直接綁定。
8. **工作流建議**（rive101.com）：「綁定過程中第一根選取的骨頭，會拿到全部頂點的初始 100% 權重」——建議先規劃選取順序以減少後續手動調整。
9. **驗證流程**：退出 Edit Mesh 模式，實際旋轉骨頭測試變形效果，不理想再回去 Edit Mesh 模式微調權重，反覆迭代。

### 3.3 Auto Trace

**用途**：自動偵測光柵圖片可見輪廓（依 alpha 透明度），快速產生一圈追蹤好的 Mesh 輪廓，省去手動描邊。

**可調參數**：
- **Detail**：輪廓貼合小細節的緊密程度
- **Concavity**：貼合內凹曲線的深度
- **Uniform**：頂點沿輪廓分布的均勻程度
- **Alpha**：判定邊緣的透明度閾值
- **Padding**：輪廓外圍額外留出的間距

**限制**：社群回報「因網格節點數量有限，即使從透明背景 PNG 追蹤，也常出現大量畫面被裁切掉」；官方解法是**調高 Detail 數值後重新執行**。整體評價「a pretty good starting point」——可當起點，複雜輪廓、細長突出物（飄動裙擺尖角、外袍下擺鋸齒）通常仍需手動增補/調整頂點。

### 3.4 Auto Weights

**用途**：綁定多根骨頭後，依「每個頂點離哪根骨頭最近」自動計算初始權重分佈，取代逐頂點手動拉權重。

**可調參數**：
- **Blend**：控制兩骨頭交界處權重過渡寬窄——數值越高融合越廣、形變越柔和；越低越死板、形變越生硬。
- **Influence / Max bones**：設定單一頂點最多受幾根骨頭影響。
- 另有 **Smooth 工具**，在複雜幾何形狀上進一步平滑自動綁權重的結果。

**限制**：官方與使用者回饋皆指出這只是「practical starting baseline」，複雜形狀（關節交錯、多層布料）常出現變形不合理或扭曲，仍需人工微調，特別是關節/交界處。**建議定位為快速起手式**，複雜部件（外袍、多層裙擺）綁完仍要進 Edit Mesh 用 Weight 工具手動修正。

### 3.5 Mesh 頂點佈置建議（避免彎曲破圖）

- **「吸管塌陷」（collapsing straw）問題**：若沿肢體的頂點均勻等距分布，肘部彎曲時關節處會失去體積，出現像吸管被折彎那樣塌陷的破圖效果。
- **解法：關節處加密頂點**——關節（如肘部）周圍提高頂點密度讓外側彎曲弧線更平滑、內側摺痕更銳利；相對地，前臂、脛骨這類幾乎不彎曲的剛性段落可減少頂點，兼顧效能。
- **頂點權重規則**：非關節處頂點應讓單一骨頭吃 100% 權重（如前臂中段完全由前臂骨主導）；**關節上的頂點要同時被兩根相鄰骨頭共享影響**（如肘部約 50/50），讓過渡自然、避免撕裂或硬折角。官方原文：「Vertices near a joint often benefit from being influenced by both neighboring bones. Blending their weights creates a smoother bend as the bones move.」
- **輪廓頂點數量原則**：盡量用最少必要頂點，非必要不多加，過多頂點增加調權重複雜度與破圖風險。
- **進階修正法：Corrective Shapes**——單靠骨頭權重在極端姿勢（手臂完全彎曲）下常顯得肌肉/布料萎縮不自然，可在該關鍵姿勢**直接對頂點位置打關鍵影格**（不透過骨頭，直接動畫化頂點座標），手動誇大該處體積做局部修正。

### 3.6 布料類部件（袖子、外袍）自然變形的具體技巧

- **混合綁定策略（官方明確舉例）**：「a character's hand might be parented to an arm bone while the sleeve's vertices are weighted across several bones to create a natural bend.」——**剛性部件（手）直接 parent**，**柔性部件（袖子）用 Mesh + 多骨頭權重**，兩種綁定方式在同一角色混用。對應本專案：頭/靴用直接 parent，手臂/袖子/外袍用 mesh+weights。
- **關節共享權重**：袖子在對應手肘位置的頂點要同時受上臂骨與前臂骨影響，而非整片只綁一根骨頭。
- **層級與體積控制**：外袍前後片、裙擺這種大面積柔性部件，建議搭配「關節加密頂點＋非彎曲段落稀疏頂點」原則，並在舉手等大幅度姿勢用 Corrective Shapes 手動微調體積，避免布料在極限角度拉伸破圖或穿插。
- 未查到 Rive 官方針對「疊層骨頭模擬布料飄動」這類進階技巧的具體教學（已嘗試 rive.app/blog、community.rive.app、YouTube 教學標題/描述、rive101.com、dev.to 第三方教學，均無官方或高信度說明）。若需要更進階布料模擬，需自行實驗（例如額外增加一根未接入手臂鏈、僅供 mesh 綁定用的輔助骨頭），但這是推論而非查到的官方建議。

**來源**：
- https://rive.app/docs/editor/manipulating-shapes/meshes
- https://rive.app/blog/intro-to-meshes
- https://rive.app/docs/editor/manipulating-shapes/bones
- https://rive.app/community/doc/bone-tips/docJsBjzcTNQ
- https://rive.app/community/doc/bones/docYyQwxrgI5
- https://rive101.com/en/lesson/5-4/
- https://dev.to/uianimation/engineering-interactive-mascots-with-rives-state-machine-and-runtime-architecture-4e2h （第三方教學，內容與官方文件交叉驗證一致）

---

## 4. 約束（Constraints）

### 4.1 IK Constraint（反向動力學）

一般骨架動畫是正向運動學（FK）——手動旋轉每根骨頭。IK 相反：鏈條末端放 target，系統反推各父骨頭該用什麼角度才能讓末端到達 target。

**標準設定步驟**：
1. 用 `B` 建立骨頭鏈（如上臂→前臂兩節骨頭）。
2. 用 `G` 建立 group，Inspector 把該 group 的 **Style** 屬性設為 **Target**（也可用任何物件當 target，官方建議用 Style=Target 的 group）。
3. **選取鏈條「最後一根」（末端）骨頭**（本例前臂骨），Inspector 的 **Constraints** 區塊新增 **IK constraint**——明確查證：IK constraint 綁在骨頭鏈**末端骨頭**上，不是父骨頭。
4. 打開該 constraint 的 fly-out 選單，用 target 按鈕選步驟 2 的 target group。
5. 移動 target group 測試 IK 是否生效。

**IK constraint 面板實際參數**：
- **Bone Count**：設定 IK 系統要往上影響鏈條中幾根骨頭。雙節手臂設 Bone Count = 2，上臂也會被 IK 解算影響。選中 target 時受影響骨頭會被高亮。
- **Invert Direction**：切換 IK 解算時關節彎曲角度方向。**這是 Rive 唯一控制彎曲方向的機制**——經查證，**Rive 沒有 3D 軟體（Maya/Blender）那種獨立的 pole vector／pole target 物件**。2D 雙骨鏈只有兩種可能解，Invert Direction 是在兩種解之間切換的布林開關，避免關節彎錯方向（如手肘往後折）。
- **Strength**：控制受影響骨頭跟隨 target 的程度；0% 時 target 完全不影響骨頭。可被動畫化，用來做混合效果。
- **Constraints order（順序）**：同骨頭疊多個 constraint 時，順序影響結果——兩個 Strength 都 100% 的 IK，後加的（清單較下面）蓋掉前一個；非 100% 則混合。可拖曳調整順序。
- **多重 IK / 巢狀 target**：可疊多組 IK 做更複雜裝置，官方範例「腳的 IK（1 根骨頭）+腿的 IK（2 根骨頭）」，讓「腿的 target」成為「腳的 target」的 child，移動腳的 target 時腿也跟著動。

**綁在哪根骨頭上（明確回答）**：綁在受影響鏈條的**末端骨頭**，再用 Bone Count 往上指定要延伸幾節，不是綁在最上層父骨頭。

### 4.2 Transform Constraint

**用途**：讓 owner **同時複製** target 的 **Position + Rotation + Scale 三種變形屬性**，不受兩者階層父子關係限制。

**重要查證**：官方文件描述是「複製全部三種屬性」，**沒有列出可個別勾選 Copy X/Y/Rotation/Scale 的獨立勾選項**——這點與下面 Translation/Rotation/Scale Constraint 明確不同（那三種文件各自寫「These properties can be independently activated」）。Transform Constraint 是一次性套用全部三種變形。

**面板參數**：
- **Strength**：0% 無效果；50% 套用一半數值。
- **Transform Space**：**Source Space**（讀取 target 數值用 World 或 Local）、**Destination Space**（套用到 owner 時用 World 或 Local）。
- 未查到 Offset 選項列在 Transform Constraint 頁面（Offset 只出現在 Translation/Rotation Constraint 頁面）。

**官方範例**：機械手臂＋包裹，包裹加 Transform Constraint，target 設為手臂末端一個 group（該 group 是手臂階層的 child，隨手臂移動）。Strength=100% 時包裹位置、旋轉完全跟著 target（像被夾爪抓住）；Strength=0% 等於「放開」。

### 4.3 Distance Constraint

**用途**：讓 owner 與 target 保持「更近、更遠、或剛好等於」某距離，不受階層限制。典型效果：物件靠近時被推開，或想一直貼近另一物件。

**設定步驟**：Inspector 加 Distance Constraint → fly-out 選單選 target → 移動 target 測試（預設 mode 是 Closer）。

**面板參數**：
- **Strength**：0% 無效果。
- **Distance**：要維持的距離數值，stage 上畫紅色圓圈代表約束範圍。
- **Mode**（三選一）：**Closer**（owner 被限制在距離圈之內）、**Further**（限制在距離圈之外，即「靠近就推開」）、**Exactly**（固定在剛好等於 Distance 的距離）。

**典型應用**：兩物件靠近互相推開、或確保某物件一直貼著另一物件。

### 4.4 Follow Path Constraint

**用途**：讓物件沿路徑（path）移動，適合軌道運動、雲霄飛車式路徑、UI 元件沿自訂曲線移動、角色沿路徑走動、武器沿弧線揮動。開放與封閉路徑皆支援。

**設定步驟**：準備好被約束物件與要跟隨的 path 形狀 → 新增 constraint 選 Follow Path Constraint → target 按鈕選路徑。

**面板參數**：
- **Strength**：控制服從程度。
- **Target**：要跟隨的路徑。
- **Distance**：以百分比控制物件在路徑上的位置，可超過 100%（適合封閉路徑循環運動）。
- **Orient**：開關物件是否隨路徑切線方向自動旋轉。開啟時旋轉自動依路徑角度調整、不能手動改；關閉時旋轉維持固定、可手動調整。
- **Offset**：讓物件沿路徑移動時以目前偏移後位置為起點，而非路徑原點。

### 4.5 Scale Constraint

**用途**：讓 owner 的 Scale 屬性被限制在某範圍內，及/或直接複製 target 的縮放值——這兩種行為（限制／複製）**可獨立分別啟用**。

**設定步驟**：Inspector 加 Scale Constraint → fly-out 選 target → 操作 target 確認 owner Scale 隨之改變。

**面板參數**：
- **Strength**：0% 無效果，50% 套用一半。
- **Transform Space** 三項（皆可 World/Local 各自獨立設定）：**Source Space**（讀取來源）、**Destination Space**（套用目的地）、**Min/Max Space**（縮放限制邊界座標系）。
- 未查到面板上是否有像 Rotation Constraint 那樣獨立命名的「Copy」欄位截圖佐證，此處以官方文件文字敘述為準。

### 4.6「手持物跟著手移動、但保持世界座標直立、不隨手臂旋轉」的具體做法

**查證結論**：官方文件與社群教學中，**沒有查到針對這個確切場景的專門教學範例**（已嘗試多組關鍵字搜尋均未命中）。以下是依各 constraint 文件「可複製哪些屬性」的明確敘述推導出的做法，屬合理技術結論，非官方逐字案例教學：

- **不要用 Transform Constraint**：因為它會一次複製 Position + Rotation + Scale，沒有單獨關閉 Copy Rotation 的選項，用它會讓道具跟著手臂一起轉。
- **建議用 Translation Constraint（只複製位置）**：
  1. 在手持物件上新增 **Translation Constraint**。
  2. Target 設為手部末端骨頭（或該骨頭上再掛一個 Style=Target 的 group，做法同 IK target）。
  3. 打開 **Copy X** 與 **Copy Y**，比率設 100%（道具完全貼著手部座標移動）。
  4. **Destination Space** 建議設為 **World**，讓道具只「跟著手的世界座標位置平移」，不被手臂旋轉牽動角度——Translation Constraint 本身不動 Rotation 屬性，道具 Rotation 保持你原本手動設定或關鍵影格設定的值（如固定 0 度＝直立），完全不受手臂角度影響。
  5. 需要限制移動範圍可搭配 **Min/Max** 欄位；直接跟手移動通常不需要。
  6. **道具不要直接 parent 進手臂骨頭階層**，否則會連 Rotation 一起繼承手臂角度——這是階層繼承（FK 式）與 Translation Constraint 的關鍵差異：前者連旋轉都跟著轉，後者只搬位置、旋轉獨立。
- 若之後想讓道具「跟手部旋轉一部分、但限制在某角度範圍」，可另外疊加 **Rotation Constraint**，把 **Min/Max** 設小範圍角度，Copy 比率設較低值（如 20-30%），做出「跟一點但不整根轉過去」的效果——基於 Rotation Constraint 官方文件「Copy：定義旋轉屬性複製比率」＋「Min/Max：定義旋轉限制邊界」的合理延伸用法，未見官方就此案例的專屬教學。

**補充查證邊界說明**：
- 「Rive 沒有獨立 pole vector/pole target，只有 Invert Direction 布林開關」是查了官方 IK 文件全文＋額外針對性搜尋「pole vector」關鍵字後得到的**否定性查證**，可信度高，但如需 100% 保險，建議實機在編輯器面板上肉眼再次確認。
- Scale Constraint 面板是否有獨立「Copy」欄位命名，官方 markdown 原始檔沒有對應段落（可能是文件遺漏而非功能不存在），已如實標註未查到面板逐項截圖佐證。

**來源**：
- https://rive.app/docs/editor/constraints
- https://rive.app/docs/editor/constraints/ik-constraint
- https://rive.app/docs/editor/constraints/transform-constraint
- https://rive.app/docs/editor/constraints/translation-constraint
- https://rive.app/docs/editor/constraints/rotation-constraint
- https://rive.app/docs/editor/constraints/distance-constraint
- https://rive.app/docs/editor/constraints/scale-constraint
- https://rive.app/docs/editor/constraints/follow-path-constraint
- （GitHub 原始 Markdown 交叉核對：`raw.githubusercontent.com/rive-app/help-center/master/editor/constraints/*.md`）

---

## 5. 換裝系統

### 5.1 官方對三種做法的定調

Rive 官方 Best Practices 文件給出明確選擇依據：

> "Solos can also be an effective way to build skins for a character, but it's important to note that this should only be used **if your skins require binding and weighting**."
> "When looking to build more complex skins (that don't require binding and weighting), or wanting to swap out widgets, icons, etc... **data binding an artboard node is the most performant way to do this**."

換句話說：**只要換裝零件是綁在骨頭上、需要 mesh 變形（本專案的頭、上臂、外袍前後片都是這種），官方就是建議用 Solo，不是巢狀 artboard**。巢狀 artboard + Data Binding 這條路是給「不需骨骼變形、純粹整塊替換」的情境（例如整組圖示、UI widget）。

### 5.2 做法比較

**(a) Solo 節點切換零件**

- 建立方式：①包裝法——選取多個物件 → 右鍵階層項目 →「Wrap in Solo」；②工具法——階層工具下拉選 Solo 工具（快捷鍵 **S**）→ 在畫板點擊 → 拖曳元素進入。官方定義：「A Solo is similar to a group, but only one of the elements inside the solo is rendered at a time.」（同層只有一個會被畫出）
- 切換啟用子物件：Animate 模式時間軸上，點擊階層中 Solo 底下各元素旁的單選按鈕，可對「哪個子物件啟用」做 Hold 型關鍵幀。
- **與 State Machine 整合的官方標準做法**：
  1. 建立一個 **Enum**，值的**名稱與順序需對應 Solo 內各子物件名稱**。
  2. 先 **Export Names**（把 Solo 使用的物件名稱匯出，執行期才能被存取）。
  3. 把該 Enum 綁到 Solo 的 **Active** 屬性，套用 **Convert to Number** 轉換器。
  - 代表「用 enum 選外袍顏色/頭飾款式」可在編輯器內不寫 Bool 分支、直接由一個 Number/Enum 輸入切換。
- 效能／檔案：官方明言 Solo 比單純切換 visibility 更省效能，因為非啟用物件會**停止渲染**（不是隱藏但仍在場景圖裡）；Solo 節點本身幾乎不增加 State Machine 複雜度（只需一個 input/enum），但每個換裝選項都是完整美術資源，**檔案體積隨換裝選項數線性增加**（每套顏色/款式都是各自獨立的 mesh + bone binding 資料）。

**(b) 同骨頭下疊多個 image、用可見度切換**

- 官方沒有把這列為推薦做法（沒有獨立頁面），但 Best Practices 原文暗示：「using a Solo can be more efficient since it stops the rendering of any non active objects」——單純疊圖用 visibility/opacity 切換（未包 Solo）效能較差，因非顯示物件仍會被排入渲染管線判斷。
- 適用：快速原型測試、或零件不需要像 Solo 一樣互斥單選（疊加式配件）。
- 檔案大小：與 Solo 相近，但少了 Solo 的互斥渲染優化。
- State Machine 複雜度：通常要為每個零件各自建 Bool input 或 Opacity 綁定，數量一多容易變成很多條件分支，比單一 enum 驅動 Solo 更難維護。
- **結論：本專案（外袍三色互斥、頭飾互斥）建議用 (a) Solo，不建議 (b)**。(b) 較適合「多層可疊加、非互斥」配件（可同時戴好幾件飾品），目前規格（外袍三色、頭飾單一、手持單一）都是互斥選項。

**(c) Runtime asset swap（程式碼執行期動態換圖）**

有兩種已查證存在的機制：

1. **傳統 `assetLoader`（載入期攔截，換的是「整份 `.riv` 引用到的外部資產」）**——Unity 有明確 API（`File.Load(Asset asset, CustomAssetLoaderCallback)`，callback 內用 `imgRef.SetImage(myImageAsset)`）。Web/JS 版 `FileAsset` 帶有 `name`、`fileExtension`、`cdnUuid`、`isFont`、`isImage`、`isAudio`、`bytes` 屬性，字型有完整範例（`decodeFont()` + `.setFont()` + `.unref()`）；**官方文件把「圖片動態替換」導向 Data Binding，未在此頁給出獨立的圖片 `assetLoader` 完整範例**——未查到純圖片、不經 Data Binding 的官方完整程式碼範例，只查到欄位存在（`isImage`）與字型範例可類推。用途：適合「`.riv` 本身不內嵌某些圖，執行期才從 CDN/伺服器抓對應素材塞進去」，能縮小 `.riv` 體積，但這條路換的是資產「引用位置」，不是專為角色換裝設計的 API。

2. **Data Binding Image 屬性（已驗證可行的圖片動態替換法）**——編輯器：View Model 建立 Image 型別屬性，綁定到 artboard 上放圖片的節點。Web/JS 已驗證 API：

```js
var imageProperty = vmi.image("bound_image");

const randomImageAsset = (imageProperty) => {
  fetch("https://picsum.photos/300/500").then(async (res) => {
    const image = await rive.decodeImage(
      new Uint8Array(await res.arrayBuffer())
    );
    imageProperty.value = image;
    image.unref();
  });
};

const r = new rive.Rive({
  autoBind: true,
  onLoad: () => {
    let vmi = r.viewModelInstance;
    var imageProperty = vmi.image("bound_image");
    randomImageAsset(imageProperty);
  }
});
```
清空：`imageProperty.value = null;`。`rive.decodeImage()` 是真實存在、已驗證的 API 名稱。此法較適合「圖片來源可以是外部 URL/使用者上傳」的情境，跟本專案「換裝選項是內建固定幾套」的情境不完全對口——固定選項用 Solo 更直接、State Machine 更單純，除非未來想開放「玩家上傳自訂圖片」，才該用這條路。

**三法對 `.riv` 檔案大小與 State Machine 複雜度比較**：

| 做法 | `.riv` 檔案大小 | State Machine／繫結複雜度 | 適用本專案零件 |
|---|---|---|---|
| (a) Solo | 隨選項數線性增加（全內嵌） | 低：一個 enum + Convert to Number 綁 Active | 外袍三色、頭飾、手持（互斥、需骨骼變形）✅ 推薦 |
| (b) 同骨頭疊圖+visibility | 與(a)相近，渲染效率較差 | 中：每零件各自 Bool，條件多易亂 | 不推薦，除非要做可疊加非互斥配件 |
| (c-1) assetLoader | 較小（外部資產不內嵌） | 需額外載入邏輯，與 State Machine 無直接關聯 | 不適合固定選項的內建換裝 |
| (c-2) Data Binding Image | 依需求（可完全外部化） | 低，但屬性是「整張圖」，非骨骼綁定零件 | 適合未來「使用者自訂圖片」需求 |

### 5.3 多層圖層（帽兜後片/上片/下片）組織建議

官方 Bones 文件確認：Shape、Image、Group、甚至另一組 Bone 鏈都能被 parent 到單一骨頭下。據此（此為根據官方階層規則的合理延伸整理，非官方逐字建議，但直接依循其文件機制）：
- 用一個 **Group**（如 `hood_group`）包住帽兜三層（後片/上片/下片），Group 本身 parent 到 `bone_head` 或對應骨頭做剛體跟隨。
- 若三層需要獨立變形（帽兜隨低頭動作皺褶），才各自加 Mesh 並各自 Bind Bones；不需要獨立變形的層，parent 到 Group/Bone 即可，不必每層都 Bind。
- 若帽兜本身也是換裝選項之一（可拿掉），整個 `hood_group` 應再被包進上層的 Solo（跟頭飾其他選項同層互斥），Group 內三層的相對畫序用 Hierarchy 順序管理即可，通常不需要再對內部三層各自加 Draw Order Rule。

**來源**：
- https://rive.app/docs/getting-started/best-practices
- https://rive.app/docs/editor/manipulating-shapes/solos
- https://rive.app/docs/editor/data-binding/enums
- https://rive.app/docs/game-runtimes/unity/runtime-asset-swapping
- https://rive.app/docs/runtimes/web/loading-assets
- https://rive.app/docs/runtimes/web/data-binding
- https://rive.app/docs/editor/manipulating-shapes/bones
- https://community.rive.app/c/announcements/data-binding-images-released
- https://rive.app/blog/data-binding-supercharged-lists-images-and-artboards

---

## 6. 畫序（Draw Order）

### 6.1 手動設定畫序

- Hierarchy 面板本身就是畫序：「shows both how objects are nested and the order in which they are rendered」——排在**上面**的物件蓋在排在**下面**的物件之上。
- 直接在 Hierarchy 面板把物件上下拖曳，即可覆寫預設畫序（Normal 規則的來源）。
- **Rive 並沒有一個獨立於 Hierarchy 之外、常駐顯示的「畫序面板」**：選取 Group 或 Shape 後，Draw Order 相關設定出現在 **Inspector** 裡的「Draw Order」區塊，顯示為一組「Draw Order Rules」單選按鈕，預設選項是 **Normal**（「the default order (based on Hierarchy order)」）。日常手動排前後順序，統一在 Hierarchy 面板拖動即可；Inspector 的 Draw Order Rules 主要用來選擇「要不要用動態規則覆蓋預設順序」。
- 未查到類似「Send to Back / Bring to Front」的一鍵置頂/置底快捷鍵；也沒有另外的可視化拖曳排序專屬面板。

### 6.2 Draw Order 能否做關鍵影格

**可以，但只能做離散切換（Hold key），不能內插**。官方原文：「these are Hold keys as **Draw Order cannot be interpolated**」——不能做「畫序從 A 慢慢過渡到 B」的漸變效果，只能在某時間點瞬間切換前後順序。這點務必注意，避免設計「淡入式換層」的動畫。

### 6.3 Draw Rules（畫序規則節點）設定方式

1. 選擇要重新排序的物件。
2. Inspector 的 Draw Order 區段點 **+** 新增規則。
3. 命名規則、選 **Position（Above 或 Below）**、選**目標**。
4. **硬性限制（逐字）**：「You can only set a **Shape layer** as a target for a draw rule; **Groups or Bones cannot be selected as targets**.」——目標必須是 Shape 層，不能是 Group 或 Bone。這對階層設計有直接影響：**要動態控制前臂穿到外袍前面，前臂本身（或其最底層 Shape）必須是可被選為目標/來源的獨立 Shape，不能被包在一個無法拆開的 Group 裡**。
5. **Normal** 規則＝預設畫序（依 Hierarchy 順序），啟用該規則的單選按鈕代表恢復預設順序。
6. 單一物件可建立多個 Draw Rule，適合複雜角色裝備（如前臂同時要跟外袍、頭飾都有前後關係時，各建一條規則）。
7. 關鍵幀操作（Animate 模式）：移動播放頭 → 點擊 Draw Rule 名稱旁單選按鈕建立關鍵幀 → 移動播放頭、切換規則 → 產生離散的前後切換。切到「Normal」若沒自動記錄關鍵幀，教學建議切換規則按鈕強制時間軸註冊狀態變化。

### 6.4 動態切換（用布林值/數值驅動前臂穿到外袍前/後）

**查證結果**：**沒有查到「Draw Order Rule 可以直接綁一個 State Machine Bool/Number input」的官方 API**（沒有類似 Solo 的 Active 屬性可被 Data Binding 直接綁定的說明）。可查證確定可行的機制：

- Draw Order Rule 的值只能在 **Animate mode 的 Timeline** 裡用 Hold 關鍵幀切換；
- State Machine 用 Bool/Number/Trigger input 決定播放哪個 Timeline 動畫或哪個 State；
- 因此標準組合技（依兩份官方文件機制合理推演，邏輯鏈完整可查證，但非官方單頁直接示範）：把「舉手（前臂在前）」與「放下（前臂在後）」做成**兩個完整的 Timeline 動畫**，各自在動畫裡把 Draw Order Rule 的 Hold 關鍵幀設好（放下動畫全程 Normal／前臂在外袍後；舉手動畫在手抬起那一刻切換成「前臂 Above 外袍」規則），再用 State Machine 的一個 Bool input（如 `armRaised`）做 State 之間的 Transition，執行期程式碼呼叫 `stateMachineInputs()` 拿到這個 input 設 `value = true/false`。畫序切換實際上是跟著「哪段動畫在播」走，而非被單獨即時控制。

**Web/JS runtime 呼叫方式（已驗證真實 API）**：

```typescript
stateMachineInputs(stateMachineName: string): StateMachineInput[] | undefined

enum StateMachineInputType { Number = 56, Trigger = 58, Boolean = 59 }

class StateMachineInput {
  public readonly type: StateMachineInputType;
  public get name(): string;
  public get value(): number | boolean;
  public set value(number | boolean);
  public fire(): void;
  public delete(): void;
}
```

巢狀 artboard 路徑版本：`setBooleanStateAtPath(inputName, value, path)` / `setNumberStateAtPath(...)` / `fireStateAtPath(...)`。官方提示：建議優先採用 Data Binding 取代直接操作 State Machine input——直接操作 `stateMachineInputs` 是較舊式但仍受支援的做法。

**來源**：
- https://rive.app/docs/editor/interface-overview/hierarchy
- https://rive.app/docs/editor/animate-mode/animating-draw-order
- https://rive101.com/en/lesson/3-10/
- https://rive.app/docs/runtimes/web/rive-parameters
- https://help.rive.app/runtimes/state-machines

---

## 7. 資深技巧與常見踩坑

### 7.1 命名慣例

官方沒有強制命名規範文件，Best Practices 只泛泛建議「使用資料夾、標籤、群組和清晰命名慣例」。但有一個**技術上的硬約束**必須當鐵律：Rive 多個 runtime／Data Binding API 都是**用名稱字串查找物件**——`stateMachineInputs(stateMachineName)`、`vmi.image("bound_image")`、Enum 綁 Solo 前必須先 **Export Names**（否則執行期找不到）。命名一旦拿去對接程式碼或 Data Binding，就不能隨意改名，改名＝斷連結。**建議定案前先跟前端工程師對好字串**（如 `outfit_color`, `hat_type`, `bone_forearm_L`），一旦寫進 `app.js` 視為 API 契約凍結。

### 7.2 Group／Bone 階層整理原則

- Shape、Image、Group、甚至另一串 Bone 鏈，都能被 parent 到單一 Bone 底下（剛體跟隨，不變形）；要真正變形需另外執行 Bind Bones。
- Draw Rule 目標「只能是 Shape，不能是 Group/Bone」——設計階層時，凡預期未來要單獨做畫序切換的零件，**不能把它跟其他零件合併包進同一個 Group 裡再也拆不出單一 Shape**，否則之後要做 Draw Rule 會卡住。
- 換裝分岔點：需要骨骼變形的用 Solo＋Bind Bones；不需要變形、純粹整塊圖替換的才考慮 Data-bound artboard（見第 5 節 5.1）。

### 7.3 Artboard 尺寸與座標原點設定慣例

- Origin/Pivot 決定物件縮放/旋轉參考點（原點在中心=50%/50% 時從中心擴展，原點在左側=0% 時從左邊生長）。
- **Freeze 工具**（快捷鍵 **Y**）：不牽動子物件位置的前提下重新調整父物件（或骨頭）pivot/origin。操作：按 Y 進入 Freeze（藍色外框提示）→ 移動 origin → 再按 Y 關閉。替代做法：選取圖形按住 Option(Mac)/Alt(Win) 用對齊工具對到特定位置。
- **匯入尺寸常見陷阱**（均為查證確認的具體原因）：
  1. **Figma 貼上尺寸倍增**：從 Figma 複製貼到 Rive，尺寸變兩倍（例：Figma 400×600 貼進 Rive 變 800×1200），需自行除以 2 校正，或改用 Figma 匯出 SVG 再匯入而非直接貼上。
  2. **SVG 單位轉換誤差**：Rive 沒有 pt/mm 概念，SVG 若用這些單位會自動換算成 px（**1pt = 1.33px，1mm = 3.78px**），跟原設計工具數字對不上。
  3. 建議解法：對匯入的 SVG 在 Assets 面板右鍵選 **Generate Artboard**，讓 Rive 依 SVG 原生尺寸自動產生吻合的 artboard，避免手動猜測比例。

### 7.4 Pivot 抖動（jitter）

**誠實說明查證狀況**：官方文件與 community.rive.app **沒有查到專門討論「pivot jitter」成因的官方文章**（已嘗試「rive jitter bone pivot」等關鍵字，並嘗試開啟兩則相關社群討論串 `bone-binding`、`newbie-question-binding-bones-mesh-won-t-deform-raster`，因頁面 JS 動態載入，WebFetch 只取得標題、無法讀內文；建議之後用瀏覽器自動化工具人工開啟查看留言）。

可查證、確定成立的間接成因（依官方 Freeze/Origin 與 Bones 文件推演）：
- **Origin/Pivot 位置設定不當**：父層（骨頭）pivot 沒對齊實際旋轉關節，旋轉時子物件會有明顯位移感，視覺上易被誤認為抖動；解法是用 Freeze 工具精準對到關節。
- **關節附近 mesh 權重沒有平滑過渡**：官方 Bones 文件建議「關節附近頂點應受多根骨頭影響以產生平滑彎曲效果」，若權重是生硬 0/100% 二分（無漸層混合），骨頭旋轉時該頂點會有生硬方向跳動，視覺上也易被誤讀為 jitter。

### 7.5 Mesh 邊緣鋸齒

**誠實說明查證狀況**：沒有查到 Rive 官方文件用「鋸齒/anti-aliasing」字眼直接討論 mesh 邊緣問題；Rive 是向量渲染引擎，編輯器內也沒查到獨立的「反鋸齒品質」設定項。

可查證的相關成因：
1. **點陣圖來源解析度不足被放大**：一般影像縮放原理（非 Rive 專屬），放大產生鋸齒模糊；Best Practices 建議以顯示尺寸的原生解析度上傳圖片，從源頭避免。
2. **Mesh 頂點密度不足導致分面（faceting）**：Mesh 頁面確認「更複雜的網格能產生更平滑變形，但也更難編輯」——Auto-Trace 的 Detail/Uniform 參數與手動增加頂點複雜度，能讓彎曲/旋轉時的輪廓邊緣更平滑，但這是「變形平滑度」而非傳統圖像反鋸齒，兩者機制不同但都影響邊緣觀感；建議裙擺、外袍下擺這類彎曲幅度大的邊緣適度加密頂點。

### 7.6 圖片被壓縮變模糊

- 資源在 Assets 面板可套用 **WebP 壓縮**保持視覺品質、減少檔案大小。
- 常見模糊原因：上傳遠大於顯示尺寸的原圖再靠 Rive 縮小顯示（8192×7022 縮到 100×100 是浪費且畫質未必變好）；或圖片本身已是有損壓縮格式（已模糊過一次）又再套一次 WebP 壓縮，等於雙重壓縮。**建議：素材輸出時直接用遊戲內實際顯示解析度（留一點餘裕給高 DPI 螢幕，如 2x），不要用超大原圖硬塞進 Rive。**

### 7.7「骨頭動了但圖片沒有跟著動」完整檢查清單

（前 4 點逐字/近逐字取自官方 Bones 頁面，第 5 點為基於 parent vs bind 機制差異的合理延伸，已標註）

1. **程序化形狀未轉換**：矩形/橢圓這類程序化 Shape，綁定前必須先轉成 custom path，否則無法 Bind Bones。
2. **點陣圖沒有 Mesh**：「Raster images use the vertices of a mesh」——PNG 圖層必須先加 Mesh、產生頂點，才有東西可被骨頭綁定；只把 PNG 拖進骨頭底下但沒加 Mesh 也沒做 Bind Bones，骨頭旋轉時圖片只會整塊剛體跟著轉，不會變形（這不算 bug，但預期要有變形效果就會覺得「沒反應」）。
3. **權重加總不是 100%，或被鎖死**：頂點的權重圓餅圖顯示各骨頭影響力比例，若某頂點沒正確分配到目標骨頭權重（全部權重被另一根骨頭吃滿），該頂點就不會跟著你動的骨頭移動。
4. **Auto-Weights 的 Blend/Influence 參數設定不當**：導致離骨頭較遠的頂點權重被算成 0，看起來像是「骨頭動了、那塊圖沒反應」。
5. （延伸推論，非官方逐字）**誤以為做了 Bind 其實只做了 Parent**：Rive 裡「把物件拖進骨頭底下當子物件」跟「執行 Inspector → Bind Bones 的 + 按鈕流程」是兩件不同的事——前者只讓物件跟著骨頭做剛體位移/旋轉（不變形），後者才是真正把頂點權重綁到骨頭上。實務上最常見的踩坑是新手以為「拖進去就是綁定」，結果只是 parent，於是覺得「骨頭有動但圖片完全沒有彎曲變形」——這其實是預期行為，不是 bug，解法是照 Bones 頁面四步驟真的執行一次 Bind Bones。

**來源**：
- https://rive.app/docs/getting-started/best-practices
- https://rive.app/docs/editor/fundamentals/freeze-and-origin
- https://rive.app/docs/editor/manipulating-shapes/bones
- https://rive.app/docs/editor/manipulating-shapes/meshes
- https://rive.app/docs/editor/fundamentals/importing-assets （SVG pt/mm 換算與 Generate Artboard）
- https://forum.figma.com/t/svg-export-has-wrong-dimensions/14728 （Figma/SVG 尺寸問題交叉確認，非 Rive 官方）
- 已嘗試但無法取得逐字內容：`community.rive.app/c/support/bone-binding`、`community.rive.app/c/support/newbie-question-binding-bones-mesh-won-t-deform-raster`、`community.rive.app/c/support/low-quality-export`（皆 JS 動態渲染頁面，WebFetch 僅取得標題）

---

## 8. 一步步 SOP

> 本節整合第 1-7 節查證到的機制，寫成「空白 artboard → 站立角色 + 換裝機制 + 舉手動畫」的操作順序。凡標「（推論排序，非官方逐條 SOP）」的段落，是依已查證的個別機制合理串起來的順序，其餘步驟名稱／快捷鍵均對應查證來源。

### Phase 0：Artboard 與原點

1. 新建 Artboard（快捷鍵 **A**，拖曳畫出），尺寸依實際角色顯示區域設定，避免之後整體重新縮放。
2. 匯入去背 PNG（頭、上身、上臂、前臂、裙、靴、外袍前片、外袍後片、帽兜後片/上片/下片…）到 Assets 面板；若素材含 pt/mm 單位，先確認換算後尺寸，或用右鍵「Generate Artboard」核對。
3. 依部位分 Group（快捷鍵 **G** 或 `Cmd/Ctrl+G`）：例如 `torso_group`、`arm_L_group`、`outfit_group`、`hood_group`，帽兜三層先包成一個 Group 待稍後 parent 到頭部骨頭。

### Phase 1：骨架

4. 用 Bone 工具（快捷鍵 **B**）由根（髖部/軀幹）開始拉骨頭鏈：軀幹→頭、軀幹→上臂→前臂（左右各一條鏈）、軀幹→裙/腿→靴。
5. 不需要獨立變形的零件（靴子、頭）直接 parent 到對應骨頭；需要彎曲變形的零件（外袍、裙擺、前臂皮膚）先加 **Mesh**（Auto-Trace 產生輪廓＋頂點，或手動 Mesh Pen，快捷鍵 **P** 進輪廓編輯、**V** 進網格編輯）。
6. 對需要變形的 Mesh 執行 **Bind Bones**：選取元素 → Inspector 的 Bind Bones 區塊按 **+** → 按住 `Cmd/Ctrl`（或 `Shift`）選要綁定的骨頭 → 按 Done；先用 Auto-Weights 自動分配，再用 **Weight 工具（W）**手動微調關節附近頂點的權重混合（避免第 7.4 節提到的生硬轉動抖動）。
7. 用 Freeze 工具（**Y**）逐一檢查每根骨頭/每個父物件的 pivot/origin 是否落在真實關節上，尤其肩、肘這種要做舉手動作的關節。

### Phase 2：換裝機制建置

8. 外袍三色：三張外袍前片圖疊在同一層級 → 全選 → 右鍵「Wrap in Solo」（或用 Solo 工具，快捷鍵 **S**）建立 `outfit_color_solo`；外袍後片若也分三色，同法建第二個 Solo（前片與後片各是獨立 Shape，因稍後 Draw Rule 需要以 Shape 為目標，見步驟 12）。
9. 頭飾／手持物比照步驟 8 各建一個 Solo（`hat_solo`、`held_item_solo`）。
10. 建對應的 **Enum**，值的名稱與順序對齊各 Solo 內子物件名稱（如 `OutfitColor = [Red, Blue, Gold]`）；到選單 **Export Names** 把物件名稱勾選匯出，確保執行期可被存取。
11. 把 Enum 綁到對應 Solo 的 **Active** 屬性，套用 **Convert to Number** 轉換器（每個換裝維度各一組：外袍顏色、頭飾、手持物）。

### Phase 3：待機與基礎動作

12. Animate 模式新建 Timeline：`idle_breathe`（軀幹輕微縮放/位移循環）、`idle_blink`（眼睛 Solo 或圖片切換的短觸發動畫）、`walk`（腿部/裙擺循環）、`look_down`（頭部骨頭旋轉）。
13. 每個循環動畫檢查頭尾影格數值完全一致，避免循環跳幀。

### Phase 4：舉手動畫＋前臂穿到外袍前面（畫序切換核心步驟）

14. 確認外袍前片是**獨立 Shape**（不是被合併在無法拆開的 Group 裡）——這是 Draw Rule 能否設目標的前提。
15. 選取前臂 Shape → Inspector 的 Draw Order 區塊按 **+** 新增 Draw Rule，命名如 `forearm_above_outfit`，Position 選 **Above**，Target 選外袍前片 Shape。
16. 建第二條動畫 Timeline `arm_raise`：把前臂骨頭旋轉到舉起姿勢的關鍵幀打好；手臂開始穿過外袍輪廓的那一影格，點擊該 Draw Rule 旁的單選按鈕，打一個 Hold 關鍵幀切到 `forearm_above_outfit`；動作放下、手臂回身側後，再切回 **Normal** 規則打一個 Hold 關鍵幀（畫序不能內插，只能在確定時間點瞬間切換）。
17. 進 State Machine，新增一個 Boolean input（如 `armRaised`），建立兩個 State（或一個 1D Blend State），分別對應 `idle`／`arm_raise` 兩段 Timeline，用 Transition 讓 `armRaised = true` 時播 `arm_raise`（畫序切換已內嵌在這段動畫的關鍵幀裡，程式碼不需另外處理畫序，只需控制這一個 Bool）。

### Phase 5：匯出與網頁 Runtime 串接

18. 匯出 `.riv`（工具列右側藍色 **Publish** 按鈕，或選單 **Export → For runtime**；**此功能僅限付費方案**）。匯出前先跑一輪美術資源檢查：所有點陣圖是否已套用 WebP 壓縮、尺寸是否等於顯示尺寸（避免第 7.6 節的模糊/肥大問題）。
19. 專案安裝 `@rive-app/canvas`（或 `webgl` 版本），依官方 Web/JS 文件初始化：

```javascript
const r = new rive.Rive({
  src: "character.riv",
  canvas: canvasEl,
  stateMachines: "State Machine 1",
  autoplay: true,
  onLoad: () => {
    const inputs = r.stateMachineInputs("State Machine 1");
    window.outfitColorInput = inputs.find(i => i.name === "OutfitColor");
    window.armRaisedInput = inputs.find(i => i.name === "armRaised");
  }
});
```

20. 換裝呼叫：`outfitColorInput.value = 1;`（對應 Enum 第二個值，如藍色外袍）。
21. 觸發舉手動畫：`armRaisedInput.value = true;`（放下設回 `false`）。
22. 上線前依官方建議在低效能裝置實測一輪（Best Practices 提到「測試低效能設備、必要時做精簡版 state machine」），確認畫序切換沒有因裝置掉幀而看起來像「瞬間閃現」。

**來源**：
- https://rive.app/docs/editor/manipulating-shapes/bones
- https://rive.app/docs/editor/manipulating-shapes/meshes
- https://rive.app/docs/editor/manipulating-shapes/solos
- https://rive.app/docs/editor/data-binding/enums
- https://rive.app/docs/editor/animate-mode/animating-draw-order
- https://rive.app/docs/editor/fundamentals/freeze-and-origin
- https://rive.app/docs/runtimes/web/rive-parameters
- https://rive.app/docs/getting-started/best-practices
- https://rive.app/docs/editor/exporting/exporting-for-runtime.md

---

## 附錄：查不到的項目總表

| 項目 | 已嘗試管道 | 狀態 |
|---|---|---|
| PSD 資料夾多層巢狀結構對應 Rive Group 的規則 | rive.app/docs PSD 頁 | 未查到 |
| 單張圖片檔案大小上限（MB）、`.riv` 建議總大小上限 | Best Practices 頁 | 未查到，僅有「按顯示尺寸決定解析度」原則 |
| Referenced 圖片在 Nested Artboard 內用 Data Binding 換圖的已知限制 | community.rive.app 兩則討論串（JS 動態渲染，抓不到內文） | 未查到 |
| 「疊層骨頭模擬布料飄動」的官方/高信度教學 | rive.app/blog、community.rive.app、YouTube 標題/描述、rive101.com、dev.to | 未查到 |
| Draw Order 面板獨立快捷鍵（Send to Back/Bring to Front） | Hierarchy、Draw Order 官方頁 | 未查到 |
| Draw Order Rule 直接綁 State Machine Bool/Number input 的官方 API | rive.app/docs、rive101.com | 未查到，僅有透過 Timeline Hold 關鍵幀 + State Transition 的間接組合技 |
| Pivot 抖動（jitter）的官方成因說明 | community.rive.app 兩則討論串（抓不到內文）、官方文件關鍵字搜尋 | 未查到，僅有間接推演成因 |
| Mesh 邊緣鋸齒的官方反鋸齒設定 | Mesh 官方頁、Best Practices | 未查到獨立設定項 |
| 純圖片（非 Data Binding）的 `assetLoader` 完整官方程式碼範例 | rive.app/docs/runtimes/web/loading-assets | 未查到，僅有欄位定義與字型範例可類推 |
| Scale Constraint 面板逐項欄位截圖佐證 | GitHub help-center 原始 md | 未查到，以文件文字敘述為準 |
| Rive 官方是否有「pole vector/pole target」機制 | IK constraint 官方頁 + 針對性搜尋 | 已查證為否（Invert Direction 是唯一機制） |
