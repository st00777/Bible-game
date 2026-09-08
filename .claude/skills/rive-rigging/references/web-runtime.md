# Rive Web Runtime 知識庫（給靈修冒險用）

> 寫給資深使用者看的 Rive Web JS runtime 整合筆記。鎖定版本 **2.42.0**（2026-09-06 jsdelivr 最新版）。
> 適用場景：純 HTML＋JS 無建置步驟、GitHub Pages 部署；也可能在 claude.ai Artifact（只允許 cdnjs／jsdelivr 的 `<script>`、禁止任何 `fetch`／XHR）裡預覽。
> 內文會標明「Artifact 安全」或「需要網路請求」，方便判斷能不能直接貼進 Artifact。

---

## 0. 套件選擇速查

Rive 的 Web 套件都是同一支 API，差別只在「怎麼畫」與「WASM 怎麼載」：

| 套件 | 渲染方式 | WASM | 何時用 |
|---|---|---|---|
| `@rive-app/webgl2`（官方預設推薦） | Rive Renderer（WebGL2，和編輯器同一顆渲染器） | 另開一個 `.wasm` 請求 | 一般網站、要 100% 還原編輯器效果（含 Vector Feathering） |
| `@rive-app/canvas` | 瀏覽器原生 Canvas2D | 另開一個 `.wasm` 請求 | 手機上大量用 blend mode 時效能可能更好；WebGL context 數量吃緊時 |
| `@rive-app/canvas-lite` | 同上（Canvas2D） | 較小 | 檔案沒用到文字引擎／Layout／Audio／Scripting，要縮小 bundle |
| `@rive-app/canvas-single` | 同 canvas | **WASM 內嵌在同一支 JS 檔**，零額外請求 | **CDN-only、禁止 fetch 的環境（本專案 Artifact 預覽）**；只想要一個 `<script>` 標籤 |

`@rive-app/webgl` 已棄用（停在 v2.37.0），一律改 `webgl2` 或 `canvas`，API 不用改。

來源：https://rive.app/docs/runtimes/web/canvas-vs-webgl

本文件的完整範例（第 8 節）用 `canvas-single`，因為它「WASM 內嵌」的特性剛好解決 Artifact 環境禁止 fetch 的限制。

---

## 1. 載入

### 1.1 `src` vs `buffer` vs `riveFile`

`Rive` 建構子只能三選一（`canvas` 必填）：

```typescript
export interface RiveParameters {
  canvas: HTMLCanvasElement | OffscreenCanvas; // 必填
  src?: string;       // 三選一：URL 或站內相對路徑
  buffer?: ArrayBuffer; // 三選一：.riv 原始 bytes（自己 fetch 或 base64 轉出來）
  riveFile?: RiveFile;  // 三選一：已經 parse 好的檔案物件，可跨多個 Rive 實例共用
  artboard?: string;
  stateMachine?: string; // 強烈建議一定要填
  layout?: Layout;
  autoplay?: boolean;
  autoBind?: boolean;
  useOffscreenRenderer?: boolean;
  enableRiveAssetCDN?: boolean;   // 預設 true
  assetLoader?: AssetLoadCallback;
  onLoad?: EventCallback;
  onLoadError?: EventCallback;
  // ...其餘見第 2、3 節
}
```

- **`src`**：需要網路請求，GitHub Pages 這種無限制環境隨便用；**Artifact 環境會被 CSP 擋掉**（禁止 fetch）。
- **`buffer`**：把 `.riv` bytes 準備成 `ArrayBuffer` 再傳進去，載入本身不觸發網路請求 —— **Artifact 安全的正解**：把 `.riv` 轉 base64 字串內嵌在 HTML／JS 裡，執行時 `atob()` 解碼成 bytes 再包成 `ArrayBuffer`。
- **`riveFile`**：同一個 `.riv` 要開多個 Rive 實例（例如列表裡每一列都放同一隻角色動畫）時，只 parse 一次，省重複網路請求與 parse 成本。

```javascript
// buffer 範例：base64 → ArrayBuffer（Artifact 安全，全程無 fetch）
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

const riveInstance = new rive.Rive({
  buffer: base64ToArrayBuffer(RIVE_FILE_BASE64), // 你的 .riv 轉出來的字串常數
  canvas: document.getElementById("canvas"),
  stateMachine: "Main",
  autoplay: true,
  onLoad: () => riveInstance.resizeDrawingSurfaceToCanvas(),
});
```

```javascript
// riveFile 共用一份檔案給多個實例
const rive = require("@rive-app/canvas");
function loadRiveFile(src, onSuccess, onError) {
  const file = new rive.RiveFile({ src, onLoad: () => onSuccess(file), onLoadError: onError });
  file.init().catch(onError); // 一定要呼叫 init() 才會真的載入
}
function setupRiveInstance(loadedRiveFile, canvasId) {
  const canvas = document.getElementById(canvasId);
  new rive.Rive({
    riveFile: loadedRiveFile,
    stateMachine: "Motion",
    canvas,
    layout: new rive.Layout({ fit: rive.Fit.FitWidth, alignment: rive.Alignment.Center }),
    autoplay: true,
    onLoad: function () { this.resizeDrawingSurfaceToCanvas(); },
  });
}
```

### 1.2 `canvas-single` 的 WASM 內嵌

`@rive-app/canvas-single` 把 `rive.wasm` 直接打包進 JS 檔，載入 Rive 從「兩個網路請求（JS＋WASM）」變成「一個」。代價是 JS 檔案本身變大。這是唯一在**完全禁止 fetch** 的環境（本專案 claude.ai Artifact 預覽）還能正常初始化 WASM 的方法——其他套件即使 `.riv` 用 `buffer` 傳入不觸發 fetch，runtime 本身仍會在建立第一個 `Rive` 實例時去抓 `rive.wasm`。

```html
<script src="https://cdn.jsdelivr.net/npm/@rive-app/canvas-single@2.42.0/rive.js"></script>
```

### 1.3 DPR 與 `resizeDrawingSurfaceToCanvas()`

Canvas 有兩組尺寸：CSS 顯示尺寸（`width`/`height` style）與畫布解析度（`width`/`height` attribute，無單位）。手機是高 DPR 裝置（2x、3x 很常見），如果兩組尺寸沒對齊，畫面會糊。`resizeDrawingSurfaceToCanvas()` 會讀 `canvas.getBoundingClientRect()` 乘上 `devicePixelRatio`，重設 attribute 尺寸並觸發重繪：

```javascript
onLoad: () => {
  riveInstance.resizeDrawingSurfaceToCanvas(); // 防止模糊
},
// 視窗大小改變、或手機旋轉／換螢幕（DPR 變化）都要重呼叫
window.addEventListener("resize", () => riveInstance.resizeDrawingSurfaceToCanvas());
window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
  .addEventListener("change", () => riveInstance.resizeDrawingSurfaceToCanvas());
```

也可以傳自訂 DPR：`resizeDrawingSurfaceToCanvas(customDevicePixelRatio?: number)`（原始碼註解：手動改 `canvas.width/height` 前不要自己設，交給這個方法統一算）。

### 1.4 Layout：Fit 與 Alignment

```javascript
export interface LayoutParameters {
  fit?: Fit;
  alignment?: Alignment;
  layoutScaleFactor?: number;
  minX?: number; minY?: number; maxX?: number; maxY?: number;
}
export class Layout {
  constructor(params?: LayoutParameters);
  copyWith(partial: LayoutParameters): Layout;
}
```

`Fit` 全部選項：
- `Layout` —— 用 Rive 的響應式排版引擎（.riv 要在編輯器內設計成 Layout 型），配合 `resizeDrawingSurfaceToCanvas()` 自動撐滿容器
- `Contain`（**預設**）—— 保持比例，長邊貼齊容器，短邊可能留白
- `ScaleDown` —— 內容比容器大時同 `Contain`，比容器小則用原始尺寸
- `Cover` —— 保持比例，短邊貼齊容器，長邊可能被裁
- `FitWidth` / `FitHeight` —— 只固定寬或高，另一軸可能裁切或留白
- `Fill` —— 不保比例，硬撐滿容器
- `None` —— 不縮放，用原始尺寸

`Alignment`：`TopLeft` `TopCenter` `TopRight` `CenterLeft` `Center`（預設）`CenterRight` `BottomLeft` `BottomCenter` `BottomRight`。

`Layout` 型與 `Fill` 之外都可能裁切或留白；也可以用 `minX/minY/maxX/maxY` 直接框住繪製區域（會蓋過 alignment）。

```javascript
let layout = new rive.Layout({ fit: rive.Fit.Cover, alignment: rive.Alignment.Center });
const riveInstance = new rive.Rive({ src: "...", canvas, layout, autoplay: true });

// 之後還能整包換掉
riveInstance.layout = new rive.Layout({ fit: rive.Fit.Fill });
```

Responsive Layout（`Fit.Layout`）四步驟：
1. `fit: Fit.Layout`（.riv 內的 artboard 要用 Rive 編輯器的 Layout 功能設計過）
2. 選填 `layoutScaleFactor` 微調整體縮放
3. 監聽 `window.onresize` → 呼叫 `resizeDrawingSurfaceToCanvas()`
4. 監聽 DPR 變化（跨螢幕拖動視窗）→ 同樣呼叫 `resizeDrawingSurfaceToCanvas()`

### 1.5 多個實例共用檔案

見 1.1 的 `riveFile` 範例；官方特別強調：只有「同一個 `.riv` 要在畫面上出現不只一次」才需要這樣做，一般情況不必自找麻煩管理 `RiveFile`。

來源：
- https://rive.app/docs/runtimes/web/rive-parameters
- https://rive.app/docs/runtimes/web/web-js
- https://rive.app/docs/runtimes/web/layouts
- https://rive.app/docs/runtimes/web/caching-a-rive-file
- https://rive.app/docs/runtimes/web/canvas-vs-webgl

---

## 2. State Machine 控制

### 2.1 兩套並存的機制（重要，官方正在換代）

Rive 目前有兩套控制 state machine 的方式：

1. **經典 State Machine Inputs**（trigger／bool／number，在編輯器的 State Machine 面板直接建立）—— 這是本專案 `.riv`（`Main` state machine 帶 `lift`／`bow`／`walking`／`speed`）用的方式，API 是 `stateMachineInputs()`。
2. **Data Binding View Model 屬性**（`trigger()`／`boolean()`／`number()` 掛在 `viewModelInstance` 上）—— Rive 目前的主推方向，官方部落格〈5 tips to debug Rive files〉直接建議正式檔案改用這套。

**關鍵事實（查證 2.42.0 原始碼 `rive.ts`，官方文件頁面沒有明講）**：`stateMachineInputs()` 已經在執行期發出 deprecation warning（`warnOnce`），文字是：

> "State machine inputs are deprecated and will be removed in a future major version: please use data binding properties instead."

也就是說：**現在呼叫還完全能用**（不是壞掉、也還沒被移除），但每次呼叫會在 console 印一次警告，且官方明說未來大版本會拿掉。若 `.riv` 是既有素材已經用經典 Inputs 做好，繼續用 `stateMachineInputs()` 沒問題；新設計的檔案建議在編輯器裡改用 View Model 屬性。

### 2.2 經典 State Machine Inputs

```typescript
export enum StateMachineInputType { Number = 56, Trigger = 58, Boolean = 59 }

class StateMachineInput {
  readonly type: StateMachineInputType;
  get name(): string;
  get value(): number | boolean;
  set value(v: number | boolean);
  fire(): void;    // 僅 Trigger 可用
  delete(): void;
}
```

```javascript
const riveInstance = new rive.Rive({
  src: "https://cdn.rive.app/animations/vehicles.riv",
  canvas: document.getElementById("canvas"),
  autoplay: true,
  stateMachine: "bumpy",
  onLoad: () => {
    const inputs = riveInstance.stateMachineInputs("bumpy");
    const bumpTrigger = inputs.find((i) => i.name === "bump");
    const speedNumber = inputs.find((i) => i.name === "speed");
    const isBraking = inputs.find((i) => i.name === "isBraking");

    button.onclick = () => bumpTrigger.fire();          // trigger
    speedNumber.value = 42;                              // number
    isBraking.value = true;                               // bool
  },
});
```

`stateMachineInputs(name: string): StateMachineInput[] | undefined` —— 檔案還沒載入完會回傳 `undefined`，一定要在 `onLoad` 裡呼叫。

### 2.3 `onStateChange`（同樣已棄用，但目前能用）

```javascript
const r = new rive.Rive({
  // ...
  onStateChange: (event) => {
    // event.data 是目前進入的 state 名稱陣列
    console.log("進入了", event.data);
  },
});
// 或用 on()
r.on(rive.EventType.StateChange, (event) => console.log(event.data));
```

官方替代建議：改用 Data Binding 的屬性 observer（見 2.4）或編輯器內 State 的 Actions。

### 2.4 Data Binding 版等價寫法（trigger／bool／number）

```javascript
const r = new rive.Rive({
  src: "avatar.riv",
  canvas: document.getElementById("canvas"),
  stateMachine: "Main",
  autoBind: true, // 自動綁定 artboard 預設的 View Model + 預設 Instance
  autoplay: true,
  onLoad: () => {
    const vmi = r.viewModelInstance;

    const liftTrigger = vmi.trigger("lift");
    liftBtn.onclick = () => liftTrigger.trigger();

    const walkingBool = vmi.boolean("walking");
    walkToggle.onchange = (e) => (walkingBool.value = e.target.checked);

    const speedNumber = vmi.number("speed");
    speedNumber.value = 1.5;

    // 觀察某個屬性被 state machine advance 後的最新值
    speedNumber.on((event) => console.log("speed 現在是", event.data));
  },
});
```

注意：Data Binding 的屬性要在編輯器內建成 View Model 屬性，跟經典 Inputs 是兩套不同的 .riv 內部結構，不能用程式碼把舊檔的 Inputs「轉」成 View Model 屬性 —— 要嘛沿用經典 Inputs，要嘛回編輯器重做綁定。

### 2.5 多層 state machine 同時跑

`stateMachine` 參數目前一次只吃一個名字（`v2.41.0` 起取代舊的複數 `stateMachines`）。若要「同時」跑多個 state machine（例如一個管動作、一個管情緒表情），常見做法：
- 在編輯器把多層邏輯放進**同一個** state machine 的不同 **Layer**（`docs/editor/state-machine/layers`），一次 `stateMachine` 參數即可，layer 之間互不干擾、可同時 advance；這是官方建議的正解。
- 真的需要多個獨立 `stateMachine` 實例同時播，要建立多個 `Rive`／`StateMachineInstance`（走低階 API），高階 `Rive` 類別一個實例只認一個 active state machine 名稱。

來源：
- https://rive.app/docs/runtimes/web/state-machines
- https://rive.app/docs/runtimes/web/rive-parameters
- https://rive.app/docs/runtimes/web/data-binding
- https://github.com/rive-app/rive-wasm/blob/master/js/src/rive.ts（`stateMachineInputsDeprecationWarning`、`stateMachineInputs()` 原始碼，2.42.0 對應版本；文件頁未明講但原始碼已加警告）
- https://rive.app/blog/5-tips-to-debug-rive-files-like-a-developer

---

## 3. 換裝（角色外袍圖片替換）—— 兩種方法完整比較

Rive 官方現在的立場很明確：**「要動態換圖，請用 Data Binding 的 image 屬性」**（`loading-assets` 文件開頭就這樣寫）。但如果 `.riv` 是用「Referenced 匯出的具名圖片資產」（不是 View Model image 屬性），那就要走 `assetLoader` ＋ `setRenderImage()` 這條路。兩者是給不同 .riv 內部結構用的，實務上要先確認美術端在編輯器裡怎麼設定這張外袍圖。

### 3.1 方法 A：`assetLoader` ＋ `decodeImage` ＋ `ImageAsset.setRenderImage()`

**前提**：外袍圖片在編輯器 Assets 面板匯出類型選 **Referenced**（不嵌進 `.riv`、不上 Rive CDN），並且有具名（例如 `cloakU`／`cloakL`）。`.riv` 匯出時這些 Referenced 資產會跟 `.riv` 一起包成 zip。

```javascript
import {
  Rive, Fit, Alignment, Layout, decodeImage,
  ImageAsset, FileAsset, // 型別用途，可選
} from "@rive-app/canvas";

// 記住每個換裝資產對應的 asset 物件，之後才能「已載入後再換」
const cloakAssets = {}; // { cloakU: ImageAsset, cloakL: ImageAsset }

const riveInstance = new Rive({
  src: "avatar.riv",
  canvas: document.getElementById("rive-canvas"),
  stateMachine: "Main",
  layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
  autoplay: true,
  assetLoader: (asset, bytes) => {
    // 每個資產（字型／圖片／音訊）在檔案載入時都會呼叫一次這個 callback
    if (asset.isImage && (asset.name === "cloakU" || asset.name === "cloakL")) {
      cloakAssets[asset.name] = asset; // 存起來，先不設圖，等使用者選了款式再設
      return true; // true = 我自己處理這個資產，runtime 不用管
    }
    // 其餘資產（例如已內嵌 bytes、或有 cdnUuid 的 Hosted 資產）交還 runtime 處理
    if (asset.cdnUuid.length > 0 || bytes.length > 0) {
      return false;
    }
    return false;
  },
  onLoad: () => {
    riveInstance.resizeDrawingSurfaceToCanvas();
    setCloak("cloakU", "img/cloak-red.webp"); // 進場先套預設款
  },
});

// 載入後再換：讀圖片、decode、setRenderImage
async function setCloak(assetName, imageUrl) {
  const asset = cloakAssets[assetName];
  if (!asset) return;
  const res = await fetch(imageUrl); // Artifact 環境要改成本地 base64／Blob，不能 fetch 外部網址
  const bytes = new Uint8Array(await res.arrayBuffer());
  const image = await decodeImage(bytes);
  asset.setRenderImage(image);
  // 設定完就可以手動釋放，Rive 內部也會在不再使用時自動清；
  // 若你之後還要重複使用同一個 decode 結果（例如切回上一件外袍）先不要 unref。
  image.unref();
}
```

要點：
- `assetLoader` 回傳 `true` 代表「這個資產我自己扛」，`false` 代表交給 runtime（例如它有 `cdnUuid` 走 Hosted、或已經是內嵌 bytes）。
- `decodeImage(bytes: Uint8Array): Promise<ImageWrapper>` 支援 **jpeg／png／webp**。
- `ImageAsset.setRenderImage(image: Image | ImageWrapper): void` —— 隨時可以再呼叫，不限制只能在初次載入時設。
- **一定要 `unref()`**：官方原文「Be sure to call `unref` on the image/font once it is no longer needed. This allows the engine to clean it up when it is not used by any more animations.」不 `unref` 會累積記憶體，換裝功能會被頻繁呼叫（玩家在衣櫃裡切來切去），沒清乾淨在手機上很快就有感。
- **referenced vs embedded**：embedded（預設）不用寫任何程式碼，runtime 自動載入，但會讓 `.riv` 體積變大；referenced 完全不進 `.riv` 二進位，檔案最小，但責任全部在你身上（沒接 `assetLoader` 的話那個部位就是空的）。
- **圖片尺寸要不要一致**：Rive 用「原始 placeholder 圖片綁定的網格（mesh）／邊界」去貼新圖，換上去的圖會被拉伸／貼進同一塊區域，**不會自動保留新圖的長寬比**。實務建議：外袍上下兩截的替換圖都裁成與編輯器裡原始佔位圖相同的長寬比與像素尺寸，否則會變形或露出穿幫的邊緣。

### 3.2 方法 B：Data Binding Image 屬性

**前提**：外袍在編輯器內是 View Model 的 **Image 屬性**（`vmi.image("cloakU")` 之類），而不是普通 Referenced 資產。

```javascript
const randomImageAsset = (imageProperty) => {
  fetch("https://picsum.photos/300/500").then(async (res) => {
    const image = await rive.decodeImage(new Uint8Array(await res.arrayBuffer()));
    imageProperty.value = image;
    // Rive 會自動清，但官方建議設完就手動 unref（除非你還要重複用這個 decode 結果）
    image.unref();
  });
};

const r = new rive.Rive({
  src: "avatar.riv",
  canvas: document.getElementById("canvas"),
  stateMachine: "Main",
  autoBind: true,
  autoplay: true,
  onLoad: () => {
    const vmi = r.viewModelInstance;
    const cloakUProp = vmi.image("cloakU");
    randomImageAsset(cloakUProp);

    // 清空（不畫任何圖）
    // cloakUProp.value = null;
  },
});
```

### 3.3 兩種方法比較

| | 方法 A：`assetLoader` + `setRenderImage()` | 方法 B：Data Binding image 屬性 |
|---|---|---|
| .riv 端要求 | 圖片標記 **Referenced** 資產，具名 | 圖片是 View Model 的 **Image 屬性**（需要編輯器內先設計 View Model） |
| API 定位 | 舊系統，仍完全支援、**未被標示 deprecated** | 官方目前主推、且明文建議「要換圖就用這個」 |
| 何時觸發載入 | `.riv` 檔案載入時，每個資產都會過一次 `assetLoader` | 任何時間點都能對 `viewModelInstance.image(name)` 賦值 |
| 適合場景 | 整份 `.riv` 沒有導入 Data Binding 架構、只是想換某幾張具名圖片 | `.riv` 已經是 Data Binding 導向設計（本來就有 View Model），换裝是眾多可綁定屬性之一 |
| 記憶體管理 | 手動 `unref()` | 手動 `unref()`（一致） |
| 清空圖片 | 沒有直接「清空」API，只能設一張透明圖或不呼叫 `setRenderImage` | `imageProperty.value = null` 可以直接清空 |

**給本專案的建議**：靈修冒險目前的化身系統（帽子／衣服／手持／背景四部位）如果本來就沒有導入 Data Binding，直接用方法 A 最省事、改動最小；如果之後決定連 state machine 邏輯都遷移到 Data Binding（配合第 2.1 節官方風向），就一次連換裝也搬到方法 B，兩套機制混用會增加維護成本。

來源：
- https://rive.app/docs/runtimes/web/loading-assets
- https://rive.app/docs/runtimes/web/data-binding（「Images」小節）
- https://github.com/rive-app/rive-wasm/blob/master/js/src/rive_advanced.mjs.d.ts（`ImageAsset.setRenderImage()` 型別定義）
- https://help.rive.app/runtimes/loading-assets（已併回同一份新文件，網址會 302 導到上面的 docs 頁）

---

## 4. Events

Rive Events 系統**已整組標示為棄用**（官方原文：「Use Data Binding instead of Events」），但一樣是「現在還能用、未來大版本會移除」，且本專案若沿用經典 State Machine（未上 Data Binding），Events 仍是接「動畫跑到某個時間點通知外部」這件事最直接的方式，值得記錄。

```typescript
export enum RiveEventType { General = 128, OpenUrl = 131 }

interface RiveEvent {
  name: string;            // 編輯器裡取的事件名稱
  type?: number;           // RiveEventType.General 或 .OpenUrl
  properties?: { [key: string]: number | boolean | string }; // 編輯器自訂的附帶屬性
  delay?: number;          // 事件實際觸發後經過的時間
}
interface OpenUrlEvent extends RiveEvent {
  url: string;
  target?: string; // 例如 "_blank"
}
```

```javascript
function onRiveEventReceived(riveEvent) {
  const eventData = riveEvent.data; // 實際的 RiveEvent / OpenUrlEvent
  if (eventData.type === rive.RiveEventType.General) {
    console.log("事件名稱", eventData.name);
    console.log("自訂屬性", eventData.properties); // 例如 { rating: 5 }
  } else if (eventData.type === rive.RiveEventType.OpenUrl) {
    window.open(eventData.url, eventData.target || "_blank");
  }
}

riveInstance.on(rive.EventType.RiveEvent, onRiveEventReceived);
// 不需要時
riveInstance.off(rive.EventType.RiveEvent, onRiveEventReceived);
```

用途舉例（對應本專案）：角色動畫在「舉手」動作播到定格瞬間丟一個 General 事件、名稱 `liftDone`，遊戲端接到就播音效或彈裝備動畫；比起用 `onStateChange`（同樣已棄用）更精準，因為 Events 是設計師在時間軸上手動放的關鍵點，不是狀態切換就觸發。

低階 API（`@rive-app/canvas-advanced`）走輪詢：`stateMachineInstance.reportedEventCount()` / `reportedEventAt(idx)`，一般專案用不到，除非你已經在用低階 render loop。

來源：
- https://rive.app/docs/runtimes/web/rive-events
- https://github.com/rive-app/rive-wasm/blob/master/js/src/rive_advanced.mjs.d.ts（`RiveEvent`／`OpenUrlEvent` 介面定義）

---

## 5. 效能

### 5.1 canvas vs webgl2 怎麼選（手機）

兩者 API 完全相同，換套件只是改 import／CDN 網址：

- **`@rive-app/webgl2`**（官方預設推薦）：用 Rive Renderer（WebGL2），與編輯器所見一致，支援 Vector Feathering。**缺點**：目前走 MSAA 路徑，任何非 Normal 的 blend mode 都要多一次「重讀畫面」的成本，在手機瀏覽器上這筆成本會放大；而且**每個分頁的 WebGL context 數量有上限**（各瀏覽器不同，超過會被瀏覽器自動丟掉最舊的 context）。
- **`@rive-app/canvas`**：用瀏覽器原生 Canvas2D，blend mode 完全不用額外成本（Canvas2D 原生支援），**沒有 WebGL context 數量上限**，同頁面能放的實例數量比 webgl2 寬鬆很多；代價是還沒支援 Vector Feathering，且外觀在極少數自我相交路徑的情況下可能與編輯器不同（fill rule 差異：Canvas2D 用 nonzero/evenodd，Rive 原生是 clockwise）。

**手機上有大量 blend mode 或要同時放多個 Rive 實例時，`@rive-app/canvas` 通常是更安全的選擇**；只需要單一主角動畫、且用了 Vector Feathering，`webgl2` 是預設正解。兩者換一行 import 就能實測比較。

如果同頁面必須用 `webgl2` 放多個實例（逼近 context 上限），設定：

```javascript
new rive.Rive({
  src: "...", canvas, stateMachine: "bumpy",
  useOffscreenRenderer: true, // 多個實例共用同一個離屏 WebGL context，不會各自佔一個 context 名額
});
```

### 5.2 幀率控制：能不能降到 30fps／暫停不可見時

**高階 `Rive` API 沒有內建「限制到 30fps」的參數。** State machine 是靠瀏覽器的 `requestAnimationFrame`（顯示器更新率，通常 60fps 或更高）逐幀 advance，沒有节流開關。要真的把幀率鎖在 30fps，只有兩條路：
1. 走**低階 API**（`@rive-app/canvas-advanced`）自己寫 render loop，手動用 `setTimeout`／累積時間差來跳過一半的幀，只在該畫的那一幀呼叫 `advance()`／`draw()`。
2. 接受「顯示器更新率」但透過**降低同時活動的 state machine／artboard 數量**、**減少 mesh 頂點與圖片解析度**（見 5.4）來換取實際流暢度，而不是死鎖幀率。

「夜間放慢」這種需求（不是省效能、是設計上要求動作變慢）**不要用降幀率去做**，正解是調 state machine 內的動畫時間軸速度或 Data Binding 的 `speed`／`number` 屬性去驅動 blend 速度（本文件第 8 節範例就是這樣做的：一個 `number` input 控制走路動畫速度）。

**可以做，而且效果立即**的是暫停／恢復整個 render loop：

```javascript
riveInstance.pause();   // 暫停 state machine／animation，畫面停在當前幀，之後 play() 從暫停處續播
riveInstance.play();    // 從暫停處續播
riveInstance.stop();    // 停止並重置到起始狀態
riveInstance.stopRendering(); // 完全停掉 render loop（不只是動畫暫停），適合「確定看不到」的情境，例如捲出畫面外
riveInstance.startRendering(); // 恢復 render loop，唯一能重新啟動的方法
```

`stopRendering()`／`startRendering()` 跟 `pause()`／`play()` 的差別：`pause()` 只是動畫邏輯上暫停（state machine 不 advance），但 render loop 可能還在跑（例如手動觸發重繪）；`stopRendering()` 是直接取消 `requestAnimationFrame`，連 loop 本身都停掉，是更徹底的「不要再消耗任何 CPU/GPU」。搭配 `IntersectionObserver` 判斷 canvas 是否捲出可視範圍，是手機上最有感的省電手法：

```javascript
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) riveInstance.startRendering();
    else riveInstance.stopRendering();
  });
});
io.observe(document.getElementById("canvas"));
```

### 5.3 頁面隱藏時處理（分頁切到背景）

**這件事 runtime 已經內建自動處理，不需要自己寫程式碼。** 查證 2.42.0 原始碼（官方文件頁面沒有明講這段細節）：`Rive` 建構子會自動掛上 `document.addEventListener('visibilitychange', ...)`；分頁被切到背景（`document.hidden === true`）時，內部會自動 `cancelAnimationFrame` 並把時間基準歸零（避免分頁回來時因為累積了一大段沒跑的時間，state machine 一次「跳」很大步）；分頁變回可見時，若動畫原本在播放中、且你沒有手動呼叫過 `stopRendering()`，會自動恢復排程。也就是说：**如果你自己呼叫過 `stopRendering()`，這個自動恢復不會覆蓋你的意圖**——原始碼註解明講「Prevents the visibilitychange handler from restarting a rendering loop the caller intentionally stopped」。

換句話說：手機瀏覽器切到背景 App 這種情境，Rive 預設就會自動省電，你唯一要自己處理的是「捲動出可視範圍但分頁還在前景」這種情況（用上面的 `IntersectionObserver`）。

### 5.4 記憶體釋放 `cleanup()`

```javascript
riveInstance.cleanup();
```

`cleanup()` 會：停掉 render loop、釋放 artboard／animation／state machine instance、renderer、檔案 handle、事件監聽器、以及 view model instance 的參照。這些都是 C++／WASM 端配置的物件，JS 的垃圾回收器碰不到，**不手動 `cleanup()` 就是實質的記憶體洩漏**，在單頁應用（SPA）反覆掛載/卸載同一個 Rive 元件時特別致命。

還有一個較輕量的 `cleanupInstances()`：只釋放 artboard／animation／state machine instance，**保留檔案與 renderer**——適合「同一份 `.riv` 要換播不同 artboard／state machine，但檔案本身還要繼續用」的情境（比 `reset()` 更手動，一般用 `reset()` 就夠）。

### 5.5 大圖片與 mesh 對效能的影響、檔案大小估算

官方 Best Practices 頁面（設計端可控）：
- **圖片格式**：一律建議匯出 **WebP**，同視覺品質下體積最小；PNG 容易讓 `.riv` 體積暴增。
- **圖片解析度要對應實際顯示尺寸**：範例原文用「8192×7022px 的圖只顯示在 100×100px 區域」當反例，明確是浪費記憶體，手機尤其有感。
- 大圖只有捲動時局部可見（例如長背景）：考慮切成數塊或改用向量畫（能轉向量的就不要留點陣）。
- **向量的頂點數要精簡**：特別提醒 AI 生圖／點陣描邊轉出來的向量、或繪圖軟體匯出的向量，常常頂點數暴多，要手動簡化。
- 能用骨架（bones）＋mesh 做出的動作，不要用逐幀點陣動畫（frame-by-frame）取代，檔案體積與記憶體都差非常多。
- Referenced／Hosted 資產（見第 3 節）可以讓 `.riv` 本體維持超小，是控制檔案大小最直接的手段。

**檔案大小估算**：沒有查到官方給出的具體 KB／MB 經驗值公式；判斷依據是上述定性原則（格式、解析度匹配顯示尺寸、向量頂點數、embedded vs referenced）。若要精確量化，建議用第 7 節的 Rive Analyzer 對實際 `.riv` 跑分析報告，它會給每個資產的體積與 A–F 評級。

來源：
- https://rive.app/docs/runtimes/web/canvas-vs-webgl
- https://rive.app/docs/runtimes/web/rive-parameters（`play`/`pause`/`stop`/`stopRendering`/`startRendering`/`cleanup`/`cleanupInstances` 方法列表）
- https://github.com/rive-app/rive-wasm/blob/master/js/src/rive.ts（`stopRendering()`/`startRendering()`/`_onPageVisibilityChange()` 原始碼與註解，含自動 visibilitychange 處理——文件頁未提及此細節）
- https://rive.app/docs/getting-started/best-practices
- https://rive.app/blog/5-tips-to-debug-rive-files-like-a-developer

---

## 6. CSP／離線注意事項

### 6.1 純 jsdelivr script、禁止 fetch 的環境（例如本專案 claude.ai Artifact 預覽）

1. **一定要用 `@rive-app/canvas-single`**：WASM 內嵌在 JS 檔裡，建立 `Rive` 實例時不會再對外發 `rive.wasm` 的請求。其他套件（`webgl2`/`canvas`/`canvas-lite`）建立第一個 `Rive` 實例時都會去抓一個獨立的 `.wasm` 檔，即使是同源也一樣是一次 HTTP 請求，會被 Artifact 的網路限制擋下。
2. **`.riv` 一律用 `buffer`，且來源是內嵌 base64**，不要用 `src`（會觸發 fetch）。
3. **`enableRiveAssetCDN` 一定要設 `false`**：預設是 `true`，遇到 `.riv` 內含 Hosted 資產（cdnUuid 有值）時 runtime 會主動打 Rive 的 CDN——這在禁止 fetch 的環境一定失敗。保險做法：出圖時確認美術端沒有用 Hosted 匯出，或程式端明確關閉這個自動行為。
4. **Referenced 資產**（第 3 節方法 A）在 Artifact 裡也不能用 `fetch()` 去外部網址拿圖，要改成把換裝圖片全部預先轉 base64 內嵌，`decodeImage` 吃的是 `Uint8Array`，跟 base64 解碼完全相容（同 1.1 的 `base64ToArrayBuffer` 手法）。
5. **字型（若有用 Rive Text）**：同理，內嵌字型或走 Embedded 匯出，不要用 `decodeFont` 搭配外部 `fetch`。
6. CSP 的 `script-src` 允許清單只有 cdnjs／jsdelivr／tailwind CDN／jquery——`canvas-single` 走 jsdelivr 完全符合；**不要**嘗試用 `unpkg.com`（Artifact 環境的 CDN 白名單沒有 unpkg，即使 Rive 官方範例常用 unpkg）。

### 6.2 CSP 的 `wasm-unsafe-eval`

一般網站（非 Artifact）若有自訂 CSP，遇到 WASM 初始化被擋，官方 FAQ 明確指出：**改用 `wasm-unsafe-eval` 指令，不要用 `unsafe-eval`**——後者連 JS 的 `eval` 都放行，安全性差很多；`wasm-unsafe-eval` 只放行 WebAssembly 執行。

### 6.3 GitHub Pages（正式站，無此限制）時的建議

- 沒有 CSP／fetch 限制，用 `@rive-app/webgl2` 或 `@rive-app/canvas` 皆可，走「JS＋WASM 分開兩個請求」的標準模式。
- 参考第 1.2／preloading 的做法：`<link rel="preload" as="fetch" crossorigin>` 預抓 `rive.wasm` 與主要 `.riv`，並用 `RuntimeLoader.awaitInstance()` 提早觸發 WASM 編譯，改善首次載入的觀感。
- `.riv` 若放在自家 CDN 或不同網域，記得設定 CORS（`Access-Control-Allow-Origin`），否則會遇到官方 FAQ 提到的「S3 放 `.riv` 常見 CORS 錯誤」。

來源：
- https://rive.app/docs/runtimes/web/canvas-vs-webgl（`canvas-single` 定位）
- https://rive.app/docs/runtimes/web/faq（CSP `wasm-unsafe-eval`、CORS）
- https://rive.app/docs/runtimes/web/preloading-wasm
- https://rive.app/docs/runtimes/web/rive-parameters（`enableRiveAssetCDN` 參數說明）

---

## 7. 除錯工具

### 7.1 `contents` getter —— 用程式碼列出 artboards／animations／state machines／inputs

```typescript
get contents(): RiveFileContents | undefined
interface RiveFileContents {
  artboards: {
    name: string;
    animations: string[];
    stateMachines: { name: string; inputs: { name: string; type: StateMachineInputType }[] }[];
  }[];
}
```

```javascript
const r = new rive.Rive({
  src: "avatar.riv", canvas,
  onLoad: () => {
    console.log(JSON.stringify(r.contents, null, 2));
    // 可以在瀏覽器 devtools 直接看到這個 .riv 到底有哪些 artboard／state machine／input 名稱
    // 對照拿到 .riv 卻沒有文件時特別有用
  },
});
```

檔案還沒載完呼叫會拿到 `undefined`，一定要在 `onLoad` 之後。

### 7.2 `enableFPSCounter()`

```javascript
riveInstance.enableFPSCounter(); // 不傳 callback：右上角自動出現一個浮動 FPS 數字
riveInstance.enableFPSCounter((fps) => console.log("目前 FPS", fps)); // 自訂 callback
riveInstance.disableFPSCounter();
```

配合 `enablePerfMarks: true`（建構子參數）會在瀏覽器 Performance 面板打 `performance.mark`/`measure`，方便用 Chrome DevTools Performance 分頁抓真正卡頓在哪一步（load / fetch-riv / await-wasm 等階段皆有各自的 mark，查證自 2.42.0 原始碼）。

### 7.3 第三方工具

- **Rive Playground**（開源）：視覺化 `.riv` 檢視器＋即時 ViewModel 編輯器，有 CLI／MCP server（可接 Claude 這類 AI 助手）／網頁版三種形態。適合「不確定這個 .riv 裡 View Model 屬性叫什麼名字」時直接打開看。
- **Rive Analyzer**（開源、純前端）：把 `.riv` 拖進去，依照官方最佳實踐清單打出 A–F 分數＋逐項理由＋優化建議，每條規則都連回官方文件；很適合驗收美術外包交回來的檔案是不是「乾淨」（有沒有殘留未用元件、圖片有沒有用 WebP 等）。
- **Rive Debug Viewer / Rive Dev Playground**（社群工具）：瀏覽器內載入 `.riv`、預覽 artboard／state machine、列出 runtime inputs 與 View Model、即時顯示 Rive Events log，不需要自己寫程式就能核對「這個 state machine 到底有沒有觸發」。

### 7.4 常見錯誤與原因

| 現象 | 原因 |
|---|---|
| 畫面模糊 | 沒呼叫 `resizeDrawingSurfaceToCanvas()`，或 canvas 的 CSS 尺寸與 attribute 尺寸沒同步；用 CSS 設顯示尺寸，attribute 尺寸交給該方法處理 |
| state machine 完全沒動 | `stateMachine` 名稱打錯／沒傳，或忘了 `autoplay: true`（或該部位對應的 input 沒被觸發） |
| S3／自家 CDN 放的 `.riv` 載入失敗 | 缺少 CORS 標頭，瀏覽器擋下跨網域請求（`Access-Control-Allow-Origin`） |
| CSP 擋住 WASM 初始化 | CSP 太嚴、只設了預設 `script-src`；改用 `wasm-unsafe-eval` 指令 |
| 自架 WASM 卻功能跑掉／畫面錯亂 | 自架的 `rive.wasm` 版本跟 npm 套件版本沒對齊——兩者是配對建置的，版號要完全一致，且 `<link rel=preload>` 的 URL 要跟 `RuntimeLoader.setWasmUrl()` 傳的一模一樣，否則會被重複下載一次而不是命中預抓 |
| console 出現 `State machine inputs are deprecated...` | 正常，代表你用了經典 `stateMachineInputs()` API（見第 2.1 節），目前仍可用，只是官方在提醒未來要遷移 |
| 換裝後圖片變形／位置跑掉 | 新圖跟編輯器原始佔位圖的長寬比不一致（見 3.1 的「圖片尺寸要不要一致」） |

來源：
- https://rive.app/docs/runtimes/web/rive-parameters（`contents`、`enableFPSCounter`、`enablePerfMarks`）
- https://rive.app/docs/runtimes/web/faq
- https://rive.app/blog/5-tips-to-debug-rive-files-like-a-developer
- https://github.com/rive-app/rive-wasm（原始碼查證 `contents` getter、`enablePerfMarks` 各階段 mark）
- Rive Playground／Rive Analyzer／Rive Debug Viewer：透過 WebSearch 查得的社群與官方週邊工具描述（未逐一開啟原始網站深驗每個功能細節，僅供入口參考）

---

## 8. 完整範例（可直接貼進 HTML）

情境：`<canvas>` ＋ 三顆動作按鈕（舉手／低頭／走路）＋換外袍下拉選單＋夜間放慢開關。假設 `.riv` 裡：
- state machine 名稱 `"Main"`
- inputs：trigger `lift`、trigger `bow`、bool `walking`、number `speed`
- image asset（Referenced，方法 A）名稱 `"cloakU"`、`"cloakL"`

用 `@rive-app/canvas-single@2.42.0`（jsdelivr，WASM 內嵌，Artifact 安全）；`.riv` 用 `buffer` 傳入（此處示範用 `RIVE_FILE_BASE64` 常數代表你實際內嵌的 base64 字串——正式環境請把美術匯出的 `.riv` 轉 base64 貼進這個常數，或改成 GitHub Pages 環境時直接 `fetch(src).then(r=>r.arrayBuffer())`）。

```html
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <title>角色動畫示範</title>
  <script src="https://cdn.jsdelivr.net/npm/@rive-app/canvas-single@2.42.0/rive.js"></script>
  <style>
    :root { --bg: #f5f0e8; --ink: #2c2418; --accent: #8a6d3b; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: system-ui, sans-serif; }
    #stage { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px; }
    canvas { width: 100%; max-width: 360px; aspect-ratio: 3 / 4; background: #fff; border-radius: 12px; }
    .controls { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 360px; }
    button, select { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--accent); background: #fff; color: var(--ink); font-size: 14px; }
    button:active { background: var(--accent); color: #fff; }
    label { display: flex; align-items: center; gap: 6px; font-size: 14px; }
  </style>
</head>
<body>
  <div id="stage">
    <canvas id="rive-canvas" width="360" height="480"></canvas>
    <div class="controls">
      <button id="btn-lift">舉手</button>
      <button id="btn-bow">低頭</button>
      <button id="btn-walk">走路 開/關</button>
    </div>
    <div class="controls">
      <label>外袍款式：
        <select id="cloak-select">
          <option value="default">預設</option>
          <option value="red">紅袍</option>
          <option value="blue">藍袍</option>
        </select>
      </label>
      <label><input type="checkbox" id="night-toggle" /> 夜間放慢</label>
    </div>
  </div>

  <script>
    // ---- 1. 準備 .riv bytes：Artifact 安全（base64 → ArrayBuffer，全程無 fetch） ----
    // 正式環境：把美術匯出的 avatar.riv 轉成 base64 貼進這個常數。
    // 這裡先放一個空字串佔位，實際使用時務必替換成真正的 base64 內容。
    const RIVE_FILE_BASE64 = "PASTE_BASE64_OF_avatar.riv_HERE";

    function base64ToArrayBuffer(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }

    // ---- 2. 換裝用：外袍圖片也一律內嵌 base64（Artifact 環境不能對外 fetch 圖片） ----
    // key 對應下拉選單的 value，值是各外袍款式的「上截／下截」base64 圖片（webp 或 png）
    const CLOAK_LIBRARY = {
      default: null, // null = 用 .riv 原本內建的預設圖，不呼叫 setRenderImage
      red: { cloakU: "PASTE_BASE64_cloakU_red", cloakL: "PASTE_BASE64_cloakL_red" },
      blue: { cloakU: "PASTE_BASE64_cloakU_blue", cloakL: "PASTE_BASE64_cloakL_blue" },
    };

    const cloakAssets = {}; // { cloakU: ImageAsset, cloakL: ImageAsset }，assetLoader 裡收集

    async function applyCloak(styleKey) {
      const entry = CLOAK_LIBRARY[styleKey];
      if (!entry) return; // "default"：保留 .riv 原圖，不動作
      for (const assetName of ["cloakU", "cloakL"]) {
        const asset = cloakAssets[assetName];
        const base64 = entry[assetName];
        if (!asset || !base64) continue;
        const bytes = new Uint8Array(base64ToArrayBuffer(base64));
        const image = await rive.decodeImage(bytes);
        asset.setRenderImage(image);
        image.unref(); // 換裝很頻繁，務必釋放，避免手機端記憶體累積
      }
    }

    // ---- 3. 建立 Rive 實例 ----
    const canvas = document.getElementById("rive-canvas");
    let inputs = {}; // { lift, bow, walking, speed }
    let baseSpeed = 1; // 白天速度基準，供夜間放慢換算

    const riveInstance = new rive.Rive({
      buffer: base64ToArrayBuffer(RIVE_FILE_BASE64),
      canvas,
      stateMachine: "Main",
      autoplay: true,
      layout: new rive.Layout({ fit: rive.Fit.Cover, alignment: rive.Alignment.Center }),
      enableRiveAssetCDN: false, // Artifact 環境：絕不讓 runtime 自己去打 Rive CDN
      assetLoader: (asset, bytes) => {
        if (asset.isImage && (asset.name === "cloakU" || asset.name === "cloakL")) {
          cloakAssets[asset.name] = asset;
          return true; // 我們自己管，等使用者選款式才 setRenderImage
        }
        // 其餘資產（若有內嵌 bytes）交還 runtime 自行載入
        return false;
      },
      onLoad: () => {
        riveInstance.resizeDrawingSurfaceToCanvas();

        const smInputs = riveInstance.stateMachineInputs("Main");
        inputs.lift = smInputs.find((i) => i.name === "lift");
        inputs.bow = smInputs.find((i) => i.name === "bow");
        inputs.walking = smInputs.find((i) => i.name === "walking");
        inputs.speed = smInputs.find((i) => i.name === "speed");
        // 注意：stateMachineInputs() 目前(2.42.0)仍可用，但會在 console 印一次 deprecation 提示，
        // 這是官方預告的遷移方向（見知識庫第 2.1 節），不是錯誤。

        baseSpeed = inputs.speed ? inputs.speed.value : 1;
        applyCloak("default");
      },
      onLoadError: (e) => console.error("Rive 檔案載入失敗", e),
    });

    // ---- 4. DPR／視窗變化時重繪，避免模糊 ----
    window.addEventListener("resize", () => riveInstance.resizeDrawingSurfaceToCanvas());
    window
      .matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      .addEventListener("change", () => riveInstance.resizeDrawingSurfaceToCanvas());

    // ---- 5. 分頁不可見時完全停掉 render loop（額外保險；tab 切背景其實 runtime 已自動處理，
    //         這裡示範的是「畫布捲出可視範圍」這種 runtime 不會自動判斷的情況） ----
    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) riveInstance.startRendering();
        else riveInstance.stopRendering();
      });
    });
    visibilityObserver.observe(canvas);

    // ---- 6. 動作按鈕 ----
    document.getElementById("btn-lift").onclick = () => inputs.lift && inputs.lift.fire();
    document.getElementById("btn-bow").onclick = () => inputs.bow && inputs.bow.fire();
    document.getElementById("btn-walk").onclick = () => {
      if (!inputs.walking) return;
      inputs.walking.value = !inputs.walking.value;
    };

    // ---- 7. 換裝下拉選單 ----
    document.getElementById("cloak-select").onchange = (e) => applyCloak(e.target.value);

    // ---- 8. 夜間放慢：用 number input 直接調速度，不是降幀率 ----
    document.getElementById("night-toggle").onchange = (e) => {
      if (!inputs.speed) return;
      inputs.speed.value = e.target.checked ? baseSpeed * 0.5 : baseSpeed;
    };

    // ---- 9. 頁面卸載時記得釋放（若這段 HTML 是被動態插入/移除的元件時特別重要） ----
    window.addEventListener("beforeunload", () => riveInstance.cleanup());
  </script>
</body>
</html>
```

使用前務必替換：`RIVE_FILE_BASE64` 與 `CLOAK_LIBRARY` 裡的三個 `PASTE_BASE64_...` 佔位字串，換成真正的 `.riv` 與換裝圖片 base64 內容；若是部署到 GitHub Pages（無 fetch 限制），也可以把 `buffer: base64ToArrayBuffer(...)` 整組改回 `src: "avatar.riv"`，並把 `applyCloak` 內的 base64 解碼改回 `fetch(url).then(r=>r.arrayBuffer())`，其餘程式碼不用動。

來源：綜合本文件第 1–7 節列出的官方文件與原始碼出處。

---

## 未查到的點（誠實列出）

- **檔案大小與效能的具體量化公式**（例如「每 100 個 mesh 頂點大約多少 ms」「圖片超過多少 KB 開始掉幀」）：官方 Best Practices 只給定性建議，沒有查到量化基準；建議實測用 Rive Analyzer 或 Chrome Performance 面板抓真機數據。
- **多個獨立 state machine 用高階 `Rive` API 同時播放**的官方明確範例：官方建議改用同一個 state machine 的多個 Layer，沒有查到「兩個獨立 `stateMachine` 名稱同時在同一個 `Rive` 實例上跑」的高階 API 官方範例（推斷高階 API 一個實例僅認一個 active `stateMachine` 名稱，多開需要走低階 API 或多個 `Rive` 實例）。
- **text 功能**（`docs/editor/text`／`runtimes/web/fonts`）：使用者需求裡列為「若需要」，本次判斷角色換裝／動作/事件與本專案（靈修冒險，無 Rive Text 需求）關聯度低，故未深入查證，僅在第 6.1 節提了一句字型內嵌注意事項。
- **`@rive-app/canvas-lite` 是否也支援 `canvas-single` 式的 WASM 內嵌**：查到的是 `canvas-single` 專門對應 `canvas` 系列（Canvas2D），沒有查到官方是否另外提供 `canvas-lite` 的內嵌 WASM 單檔版本（`canvas-advanced-single` 是低階 API 版本，非同一件事），若之後要進一步縮小 Artifact 環境的 bundle size 可以再查證一次。
