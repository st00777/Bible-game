# 靈修冒險 · 視覺設計系統

> 給 Claude Design / 設計師閱讀的視覺風格規範
> 對應版本：v2.9（2026-05-02）
> 對應檔案：`bible-game-v2.html`（CSS 區塊 line 17-421）、`content.js`（emoji 資產）

---

## 1. 專案速覽

**靈修冒險（Bible Devotional Game）**：一款給大光教會成人查經班的每日靈修輔助遊戲。
玩家規模約 50 人（Google 20% / LINE 80%），年齡跨度從青年到長輩，**深夜 22:00–05:00 是最熱使用時段**。
產品定位是「輔助靈修，不取代靈修」 — 鼓勵玩家先讀經文再來玩。

**技術約束**：
- 純 HTML + CSS + JavaScript，**單一檔案 + emoji，無任何圖檔**
- 部署在 GitHub Pages（手機優先，max-width 420px）
- 跨平台一致（iOS Safari / Android Chrome / Desktop）
- 已支援三段字體大小（14 / 16 / 19px）給長輩

---

## 2. 核心設計風格

**關鍵字**：療癒系、溫暖、輕量、可愛但不幼稚、信仰意涵但不嚴肅。

**視覺隱喻**：
- 背景：藍天白雲漸層（玩家像在天空旅行）
- 卡片：象牙白紙張感（米白底 `#FFFDF8`）
- 木紋書架（書卷收集區）
- Emoji 角色裝備系統（帽子 / 衣服 / 手持 / 背景 四部位）

**情緒定調**：
- 主氛圍：清晨陽光、安靜的退修
- 強調行動：溫暖、不催促
- 完成感：金色閃耀、紫色神聖

---

## 3. 配色系統

### 3.1 主色 token（`:root` CSS 變數）

| 變數 | 色碼 | 用途 |
|---|---|---|
| `--sky` | `#E8F4FD` | 主底色／輸入框背景／柔和區塊 |
| `--sky-deep` | `#B8D9F0` | 邊框／淺強調／頭像背景 |
| `--green` | `#7BC67E` | 正向次要色 |
| `--green-dark` | `#4CAF50` | 主要 CTA 按鈕、完成狀態、勾選 |
| `--sand` | `#F5E6C8` | 經文卡片底（暖色） |
| `--sand-dark` | `#E8D0A0` | 經文卡片邊框、暖色強調 |
| `--warm` | `#FF8A65` | 提醒、未完成、連續天數熱度 |
| `--purple` | `#9C7BB5` | 靈修主題、AI 回應、品牌主強調色 |
| `--text` | `#3D2B1F` | 主要文字（深棕色，非純黑） |
| `--text-soft` | `#7A6050` | 次要文字、說明文字 |
| `--card` | `#FFFDF8` | 卡片底（米白） |
| `--shadow` | `rgba(61,43,31,0.12)` | 通用陰影（暖棕色低透明，非冷灰） |

### 3.2 衍生色與漸層

**頁面背景漸層**（從上而下：天空 → 草原）
```css
linear-gradient(180deg, #C8E6FA 0%, #E8F4FD 40%, #F0F7E8 100%)
```

**常用 135deg 線性漸層**（按鈕、卡片高光）：
- 綠色 CTA：`linear-gradient(135deg, var(--green), var(--green-dark))`
- 紫色 CTA：`linear-gradient(135deg, var(--purple), #7B5EA7)`
- 經文卡片：`linear-gradient(135deg, #FFF8E7, #FFF3D4)`
- 完成狀態：`linear-gradient(135deg, #E8F5E9, #F1F8E9)`
- 紫色狀態：`linear-gradient(135deg, #F3E8FF, #EDE0FF)`
- 已完成 banner：`linear-gradient(135deg, #E3F2FD, #BBDEFB)`
- 金色徽章：`linear-gradient(135deg, #FFD54F, #FFA726)`

**特殊色**：
- LINE 綠 `#06C755`（登入按鈕）
- 木紋書架 `linear-gradient(180deg, #8B6F47, #6B4F2F)`
- 書架隔板 `#5A3E22`
- 書卷 lit（已完走）`#FFD54F → #FFB300`，邊框 `#F9A825`，文字 `#5D4037`
- 書卷 progress（進行中）`#B8D9F0 → #90CAF9`，邊框 `#64B5F6`
- 書卷 locked（未開始）`#D7CCC8 → #BCAAA4`，邊框 `#A1887F`，文字 `#8D6E63`
- 週六文字 `#64B5F6`、週日文字 `#E57373`（淡藍/淡紅，柔和）

### 3.3 色彩語意規則（**重要設計慣例**）

| 顏色 | 含義 | 使用情境 |
|---|---|---|
| 🟢 綠（`--green-dark`） | **正向行動／完成** | 主要 CTA、勾選、完成狀態、選中選項 |
| 🟣 紫（`--purple`） | **靈修主題／AI／品牌主色** | 書卷標籤、AI 回應卡、靈修日記、活動 tab |
| 🟠 橘（`--warm`） | **未完成／提醒／熱度** | 連續天數 pill、待完成狀態、預覽選項、橘色強調 |
| 🟡 沙黃（`--sand`） | **經文／神聖文字** | 金句卡、聖經經文背景 |
| 🔵 藍（`--sky`） | **基礎／中性** | 預設邊框、輸入框、平靜區塊 |

---

## 4. 字體與字級

### 4.1 字型族

```css
font-family: 'Noto Sans TC', sans-serif;       /* 全域預設 */
font-family: 'Noto Serif TC', serif;           /* 經文（verse-text、verse-box、ach-unlock-verse）*/
```

**字重使用**：
- `400`（regular）：說明、提示
- `700`（bold）：標題、按鈕、tab、強調
- `900`（black）：主要標題（如 `sheet-title`、`av-name`、`cal-month-title`、`complete-btn`、`setup-title`）

### 4.2 字級階層

**根變數可由使用者切換**：
```css
:root { --fs-body: 16px; }
.fs-sm { --fs-body: 14px; }
.fs-md { --fs-body: 16px; }   /* 預設 */
.fs-lg { --fs-body: 19px; }
```

**固定字級層級**（不隨 `--fs-body` 變化）：

| 用途 | 字級 | 範例 |
|---|---|---|
| 主標題 / 設定畫面 | 24px / 900 | `setup-title` |
| 解鎖名稱 | 22px / 900 | `ach-unlock-name` |
| Sheet 主標 | 18px / 900 | `sheet-title` |
| 金句卡標籤 | 11px / 700 / letter-spacing 0.15em | `verse-lbl-text` |
| 章節 / 教學標題 | 14-15px / 700 | `tut-step-title`、`refl-title` |
| 次要文字 | 12-13px | `tut-step-desc`、`sheet-sub` |
| 微標籤 / 進度 | 9-11px | `equip-name`、`ach-desc`、`log-tag` |

**動態字級**（隨 `--fs-body` 縮放，照顧長輩）：
- 卡片內容：`var(--fs-body)`
- 略小說明：`calc(var(--fs-body) - 2px)`
- 更小說明：`calc(var(--fs-body) - 3px)`
- 最小數字：`calc(var(--fs-body) - 6px)`

### 4.3 行高與字距

- 經文 / 內文段落：`line-height: 1.85`（給大量繁中閱讀預留呼吸）
- 一般卡片內容：`line-height: 1.6 - 1.8`
- 按鈕 / 標籤：`line-height: 1` 或預設
- 金句／標籤強調：`letter-spacing: 0.1 - 0.15em`

---

## 5. 元件樣式規範

### 5.1 圓角階層

| 場景 | 圓角 |
|---|---|
| 大型卡片 / sheet 頂部 | 20-28px |
| 中型卡片（avatar、verse、scenario） | 18-24px |
| 一般按鈕 / 卡片 | 11-17px |
| 小元件（pill、tag、tab） | 8-11px |
| 圓形（letter badge、dot） | 50% |
| 細節微標籤 | 6-8px |

> **趨勢**：所有元件普遍**偏圓潤**，沒有銳角。

### 5.2 陰影規範

```css
/* 卡片預設（柔暖棕陰影）*/
box-shadow: 0 4px 20px var(--shadow);    /* avatar-card、scenario-card */
box-shadow: 0 2px 10px var(--shadow);    /* 小卡片、log-entry */

/* 按鈕陰影（帶色相，配合按鈕主色）*/
box-shadow: 0 6px 20px rgba(76,175,80,.45);    /* 綠色 CTA */
box-shadow: 0 4px 14px rgba(156,123,181,.4);   /* 紫色 CTA */
box-shadow: 0 3px 10px rgba(255,138,101,.4);   /* 橘色 pill */

/* Modal 強調 */
box-shadow: 0 16px 50px rgba(61,43,31,.25);
box-shadow: 0 20px 60px rgba(61,43,31,.3);

/* Hover 提升 */
transform: translateY(-2px) ~ translateY(-3px);
```

> **規律**：陰影顏色帶**主色相低透明度**（不是純黑），陰影越大代表階層越高。

### 5.3 邊框規範

- 預設邊框：`2px solid var(--sky-deep)`
- 強調 / 選中：`2px solid var(--green-dark)` 或 `var(--purple)`
- 細邊：`1px solid rgba(61,43,31,.06)` 用於分隔線
- 經文卡：`2px solid var(--sand-dark)`
- 性別選擇：`3px solid` 加重質感

---

## 6. 間距系統

**容器**
- `.container` 最大寬：`max-width: 420px`（單欄手機優先）
- `.container` padding：`16px 16px 80px`

**卡片內距**
- 大卡：`padding: 18px`
- 中卡：`padding: 16px`
- 小卡 / pill：`padding: 5-13px 11-15px`

**Modal / Sheet**
- Sheet：`padding: 26px 22px calc(34px + safe-area-inset-bottom)`
- Modal：`padding: 28px 22px calc(28px + safe-area-inset-bottom)`

**卡片間距**
- 主流程卡片：`margin-bottom: 14px`
- 次區塊：`margin-bottom: 11-12px`

**內部 gap**
- `gap: 4-9px` 小元件群（如 grid item）
- `gap: 10-14px` 卡片內水平排列
- `gap: 16-22px` Modal 區塊間

---

## 7. 互動狀態

### 7.1 Hover

```css
.icon-btn:hover { transform: scale(1.1); }
.cal-nav:hover { background: var(--purple); color: white; }
.complete-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(76,175,80,.5); }
.choice-btn:hover { border-color: var(--green); background: #F0FAF0; transform: translateY(-2px); }
.equip-item:hover { border-color: var(--purple); transform: scale(1.05); }
```

> **規律**：hover 通常是 **scale 放大** 或 **translateY 上浮**，搭配陰影加深 + 主色高亮。

### 7.2 Active / Selected

- Tab：底色換主色（紫）+ 文字翻白 + 陰影加重
- 選項：邊框換綠 + 漸層底
- 選項預覽（兩段點擊確認）：邊框換橘 + 暖色漸層底（與 selected 區分）

### 7.3 Disabled

```css
.complete-btn:disabled,
.day-info-btn:disabled {
  background: #CCC;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}
```

### 7.4 Transition

- 預設：`transition: all .2s` 或 `.15s`
- 進場動畫：`.4s cubic-bezier(.34, 1.56, .64, 1)`（modal 彈跳）
- Sheet 滑入：`.4s cubic-bezier(.34, 1.2, .64, 1)`

---

## 8. 動畫（@keyframes）

```css
@keyframes popIn {
  from { opacity: 0; transform: translateY(16px) scale(.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
/* 預設進場：所有卡片用，搭配 forwards 與不同 delay 形成階梯出場 */

@keyframes bounce {
  from { transform: translateY(0); }
  to   { transform: translateY(-8px); }
}
/* 成就解鎖大 emoji 用 */

@keyframes confetti-fall {
  0%   { transform: translateY(-20px) rotate(0); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
/* 完成靈修彩屑慶祝 */

@keyframes drift {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(15px); }
}
/* 背景雲飄動，20-28s 慢速循環 */

@keyframes dot-blink {
  0%, 80%, 100% { opacity: .2; transform: scale(.8); }
  40%           { opacity: 1; transform: scale(1.2); }
}
/* AI 載入中三點 */
```

**進場節奏**（用 animation-delay 形成階梯）：
- topbar：0.1s
- avatar-card：0.2s
- cal-card：0.28s
- verse-card：0.32s
- scenario-card：0.4s
- refl-card：0.5s
- complete-btn：0.65s

---

## 9. 視覺資產（Emoji 清單）

> 全遊戲沒有任何圖檔，所有「美術」都是 emoji + CSS。

### 9.1 系統 UI Emoji

**書卷標誌**（`bible-game-v2.html:1372` BOOKS）
- 🏛️ 使徒行傳　📜 羅馬書　✉️ 哥林多前書　💌 哥林多後書　✉️ 加拉太書

**心情選項**（曠野呼聲）
- 😇 平靜　🔥 有動力　😴 有點累　🤔 經文太難　✏️ 其他

**回饋分類**
- 🙏 靈性感受　🎮 遊戲體驗　💡 我的異象　✏️ 其他

**狀態 / 流程指示**
- 🔥 連續天數熱度
- 🏜️ 曠野呼聲（玩家回饋）
- 📖 閱讀完整章節
- 💭 默想引導
- 🌅 清晨靈修　🌙 深夜靈修　☀️ 日間
- 👣 / 🐑 旅程／回歸

### 9.2 性別專屬初始裝備

```
弟兄：🧥 先知的斗篷（衣服）　⚔️ 屬靈的寶劍（手持）
姐妹：👘 服事的外袍（衣服）　🕯️ 代禱的燈台（手持）
不設定：🌿 旅人的外衣（衣服）
```

### 9.3 成就 Emoji（28 個，三級制：bronze 銅 / silver 銀 / gold 金）

| 維度 | 銅 | 銀 | 金 |
|---|---|---|---|
| 恆心 | 👣 踏上旅程 / 🔥 三日不間斷 / 🗺️ 十日旅人 / 🐑 重回羊圈 | 🌟 一週堅持 / 🌈 兩週同行 / ⛰️ 月行者 | 💎 三十日挑戰 / 👑 百日門徒 |
| 深度 | 📖 認真讀經 / 💭 初次默想 | 📚 讀經達人 / 🙏 默想成習 | 🏅 聖經行者 / 🌾 默想深耕 |
| 時段 | — | 🌅 晨間靈修 / 🌙 夜間守望 | — |
| 收集 | 🛡️ 全副武裝 | 🎒 裝備收集家 | 🏛️ 聖經博物館 / ⚔️ 全裝甲勇士 |
| 社群 | 📤 分享祝福 / 🏜️ 曠野之聲 | 📢 福音使者 | — |
| 書架 | — | 📕 書架初亮 | 📚 三卷行者 |

### 9.4 章節裝備 Emoji（87 個 unique，全清單）

```
⏳ ☁️ ⚓ ⚔️ ⚖️ ⚡ ⛓️ ⛵ ✉️ ✋ ✝️ ✨ ❤️ ⭐
🌅 🌈 🌊 🌍 🌏 🌙 🌟 🌱 🌳 🌸 🌹 🌾 🌿
🍞 🍷 🍽️ 🎁 🎉 🎗️ 🎤 🎯 🎵
🏃 🏆 🏛️ 🏠 🏰 🏺 🐑 👑 👟 👥
💌 💍 💎 💛 💝 💧 💪 💰
📋 📜 📝 📢 🔄 🔍 🔓 🔥
🕊️ 🕯️ 🗣️ 🗽 🗿 😊 😔 😢 🙌 🙏
🚪 🛡️ 🤗 🤝 🥼 🦋 🧙 🧩 🧭
🩹 🪞 🪡 🪨 🫀 🫂
```

裝備分為四個 slot，分類原則：
- **帽子（hat）**：象徵性標誌、身份、祝福（音符飄頭上、橄欖枝）
- **衣服（body）**：角色外袍、囚衣、身分象徵
- **手持（hand）**：實際拿在手上的物件（鑰匙、書信、盾牌）
- **背景（bg）**：場景意象、地圖、海浪、火焰

---

## 10. 主要頁面結構

整個遊戲為單頁應用（SPA），用 `.page` + `.nav-tabs` 切換。

### 10.1 主流程頁（首頁）

```
┌────────────────────────────────────┐
│ Topbar：書卷 badge + 連續天數 + 帳號 │  popIn .1s
├────────────────────────────────────┤
│ Nav Tabs（首頁／成就／日記／書架）  │  popIn .15s
├────────────────────────────────────┤
│ Avatar Card：頭像（emoji 拼裝）+   │  popIn .2s
│  名字 + Lv + XP bar + 衣櫃按鈕     │
├────────────────────────────────────┤
│ Calendar Card：月份 + 週切換 + 日格 │  popIn .28s
│  + Today Jump + 今日 info bar       │
├────────────────────────────────────┤
│ Verse Card：金句（襯線體）+ 出處   │  popIn .32s
│  + 步驟式導讀（導讀／閱讀章節）     │
├────────────────────────────────────┤
│ Scenario Card：場景 + 問題 + 4 選項 │  popIn .4s
│  + 選擇後回應                       │
├────────────────────────────────────┤
│ Reflection Card：默想引導 + 輸入框  │  popIn .5s
│  + AI 回應區（紫色卡）              │
├────────────────────────────────────┤
│ Complete Button：完成靈修 CTA       │  popIn .65s
└────────────────────────────────────┘
背景：藍綠漸層 + 兩朵慢速飄動的雲
```

### 10.2 其他頁

- **成就頁**：tab（恆心 / 深度 / 時段 / 收集 / 社群）+ 3 欄 grid 卡片，未解鎖灰階 + 透明，解鎖綠框 + 漸層底
- **日記頁**：搜尋框 + 按書卷分組的卡片列，點開跳詳情頁
- **書架頁**：木紋背景 + 書脊立體效果，三態（金黃完成 / 藍色進行 / 灰色未開始）
- **衣櫃頁**：頭像預覽 + slot tab（帽衣手背）+ 4 欄 grid 裝備
- **設定 / 教學 / 變更紀錄**：Sheet（從底部滑入）

### 10.3 全域元素

- **Sheet overlay**：底部彈出，圓角 28px 28px 0 0，cubic-bezier 緩動
- **Modal overlay**：中央彈出，scale + translateY 進場
- **More menu**：定位 fixed 的下拉選單
- **Toast / 解鎖通知**：佔滿螢幕的祝賀層

---

## 11. 設計慣例（給設計師快速上手）

1. **單欄手機優先**：所有設計以 420px 寬為上限思考
2. **色彩語意一致**：綠 = 行動／完成、紫 = 靈修／品牌、橘 = 提醒／熱度、藍 = 中性
3. **圓潤大圓角**：沒有銳角元件
4. **暖色陰影**：絕對不用純黑陰影，全部用 `rgba(61,43,31, X)` 帶暖棕色相
5. **漸層偏好 135deg**：左上到右下對角線
6. **Emoji 不用 SVG**：保持輕量與跨平台一致
7. **進場動畫階梯**：popIn + 不同 delay，避免一次跳出
8. **經文用襯線體**：營造神聖感（Noto Serif TC）
9. **iOS Safe Area**：所有 fixed bottom 元素用 `env(safe-area-inset-bottom)`
10. **三段字體**：所有內容字級用 `var(--fs-body)` 或 `calc(var(--fs-body) - Npx)`，不寫死
11. **兩段點擊確認**：重要選擇（情境題）防誤觸，預覽用橘色、確認用綠色

---

## 12. 技術約束（影響設計可行性）

- ❌ **不能用圖檔**（這是設計選擇，不是限制；維持輕量、跨平台一致）
- ❌ **不能用 Web Font 之外的字型**（GitHub Pages 純前端）
- ⚠️ **iOS Safari 是首要相容目標**（已有大量 hack：`-webkit-overflow-scrolling`、`safe-area-inset`、`min-height: -webkit-fill-available`）
- ⚠️ **單檔案 165KB**：CSS / HTML / JS 全在一份；要避免膨脹
- ✅ **可用 CSS Grid / Flex / 漸層 / 動畫 / clip-path / backdrop-filter**

---

## 13. 美術升級任務池

> 此節原為「待補強的設計問題」，2026-05-02 起升級為**活的工作清單**。
> 每項升級都標註狀態與優先級，依 ROI 與時間節奏依序消化。
> 所有 brief 撰寫請優先參考此節對應子節。

### 優先級定義

- **第一梯隊**：高 ROI、可立刻啟動，1-2 週內處理
- **第二梯隊**:中 ROI、需先做需求或設計決策，1-2 月內考慮
- **第三梯隊**:野心大、跨階段、v3.0 候選，半年以上時程

### 狀態定義

- **未啟動**:清單上但還沒開工
- **進行中**:有 dev 實驗在跑
- **已部分解決**:dev 上有解到一部分，但完整版還沒
- **暫緩**:先決條件未滿足（需先做別的、需先決策、需先看數據）
- **已完成**:已進 main 或 dev 已收尾等待進 main

---

### 13.1 整體美術方向定位

- **狀態**：暫緩
- **優先級**：第三梯隊
- **問題描述**：CSS 風格偏「療癒卡片風」，但缺少統一視覺主題。
  方向未定（像素 / 插畫 / 水彩 / 童書插畫 / 極簡禪意）
- **局部試作觀察（2026-05-02 補）**：
  - 在「成就徽章」這個元素上，曾試作過平面插畫與像素兩種呈現
  - 該元素上平面插畫的效果比像素好，玩家反饋顯示像素風格在此元素上效果較弱
  - **不外推**：此為單一元素的局部觀察，不代表整體遊戲風格已定調
- **Claude AI 觀察**：v3.0 級別決策。目前累積的證據只夠支撐
  「成就徽章不走像素」，不夠支撐「整體遊戲走平面風格」。
  建議繼續累積其他元素試作經驗（角色卡、書架、進場動畫等），
  經驗足夠後再回頭做整體風格收斂

### 13.2 Emoji 視覺一致性

- **狀態**：已部分解決
- **優先級**：第二梯隊
- **問題描述**：87 個章節裝備 emoji 來自不同 emoji 集，視覺風格不統一
- **dev 已實作**：三段稀有度容器（銅/銀/金）+ sepia 染色濾鏡
  + 金級 conic-gradient 光暈（commit 累積中）
- **Claude AI 觀察**：等銀級這波進 main 後看玩家反饋，
  再決定要不要加二次視覺處理（描邊、投影等）。
  邊際效益遞減，不要在沒實機測試的情況下繼續疊濾鏡

### 13.3 書架 vs 主頁色彩反差

- **狀態**：未啟動
- **優先級**：第一梯隊
- **問題描述**：主頁是天空藍漸層 + 米白卡片，書架頁是深棕木紋。
  切換時視覺跳躍感強
- **三個方向**：
  - A. 主頁底部加木紋元素（如書架 footer）讓切換有延續感
  - B. 書架頁從深棕改成「淺木紋 + 天空感」更協調
  - C. 用過渡動畫（頁面切換時加漸變）掩蓋色差
- **Claude AI 觀察**：這題本質是品味決策不是對錯題。
  原本對比可能是刻意設計（書架要有「進入收藏室」的儀式感）。
  需先做設計決策再啟動

### 13.4 成就解鎖儀式感

- **狀態**：未啟動
- **優先級**：第一梯隊
- **問題描述**：bounce 動畫 + 金色 emoji + verse 卡，儀式感「平淡」
- **觸及率**：每玩家終生 28 次（28 個成就）
- **可做方向**：
  - 光暈從中心擴散（radial gradient + opacity 動畫）
  - 粒子或星星從卡片飛出（box-shadow 多層 + animation）
  - emoji 從小到大彈跳 + 旋轉（已有 bounce，可加 conic-gradient 旋轉光暈同步）
  - 金色光線掃過卡片（linear-gradient + translateX 動畫）
- **Claude AI 觀察**：純 CSS、0 個資料結構改動、1-2 天工。
  玩家對「成就」的情緒投入比角色卡高，儀式感升級會直接放大正向回饋。
  ROI 比角色卡升級更高

### 13.5 長者友善視覺優化

- **狀態**：暫緩
- **優先級**：第二梯隊
- **問題描述**：已有三段字體切換，但對比度、按鈕命中區、
  icon 辨識度未專為長者調整
- **可做方向**：
  - 全頁面 WCAG AA 對比度審計
  - 按鈕命中區 ≥ 44×44px（iOS 建議值）
  - 「長者模式」一鍵切換（lg 字體 + 加強對比 + 加大按鈕）
- **Claude AI 觀察**：價值取決於長輩玩家實際比例，
  CLAUDE.md 寫了「年齡跨度青年到長輩」但沒說比例。
  需先確認需求量（可能要 LINE 那邊反推年齡分布）再啟動

### 13.6 暗黑模式

- **狀態**：暫緩
- **優先級**：第三梯隊
- **問題描述**：完全沒做，深夜 22:00-05:00 佔總使用 50%
- **Claude AI 觀察**：v3.0 候選。目前不該做，理由：
  - 工程量大（全色票 + 全狀態翻譯）會吃掉其他升級進度
  - 跟階段 1「容器類升級」性質完全不同
  - 應先解 Lv.1→Lv.2 流失（86%）等更高槓桿問題
  - 夜間玩家「沒抱怨」不等於「不痛苦」，但也代表現況可接受

### 13.7 教會場域氛圍

- **狀態**：暫緩
- **優先級**：第三梯隊
- **問題描述**：視覺中性偏可愛，沒有強烈宗教元素
- **Claude AI 觀察**：這題是價值取捨題不是工程題。
  需先做質性訪談（教會、玩家對視覺語彙的偏好），
  決定「不嚇跑慕道友」與「教會內部認同感」的平衡點

### 13.8 進場動畫精緻化

- **狀態**：未啟動
- **優先級**：第一梯隊
- **問題描述**：所有卡片用同一個 `popIn` keyframe + 不同 delay，
  進場節奏整齊但缺乏個性
- **可做方向**：avatar 用呼吸感 / verse 用書頁翻開感 /
  scenario 用淡入 / refl 用打字機感 等差異化進場
- **Claude AI 觀察**：投資低、效果普遍，每個玩家每次開遊戲都會看到。
  純 CSS @keyframes 擴充，不動 JS 邏輯

### 13.9 成就未解鎖「神秘感」重設計

- **狀態**：未啟動
- **優先級**：第二梯隊
- **問題描述**：未解鎖 = 灰階 + 透明 = 「缺席感」，
  改成「神秘感」會給玩家「想看清楚」的動機
- **可做方向**：剪影 / 問號 / 模糊 / 部分遮蔽
- **Claude AI 觀察**：呼應「想用等級解鎖驅動留存」的設計方向，
  讓未解鎖成為驅動力而非空缺。投資低、可玩性升級

### 13.10 連續天數熱度視覺化

- **狀態**：未啟動
- **優先級**：第一梯隊
- **問題描述**：🔥 在 topbar 只是小 icon，撐不起核心玩家成就感
  （5/2 數據：曠野之息 31 天、真旭 32 天）
- **可做方向**：
  - 火焰大小隨天數成長
  - 特定天數解鎖特殊顏色（7 天藍焰 / 30 天紫焰 / 100 天彩焰）
- **Claude AI 觀察**：給核心玩家強回饋的低成本方案。
  也可作為等級系統之外的另一條成長線，分散等級無感的問題

### 13.11 主頁角色卡視覺升級

- **狀態**：暫緩
- **優先級**：第一梯隊
- **問題描述**：78×78 小頭像 + 一行字 + 7px 進度條，
  視覺 weight 撐不起在主頁第二棒進場的核心地位
- **方向**：A 質感升級 + B 情感連結強化 + D 風格 showcase
  （emoji 局部換掉、等級徽章客製化）
- **暫緩原因**：等功能視窗確定「等級解鎖背景」機制規格，
  避免角色卡設計做完後對不上機制
- **重啟條件**：等級解鎖背景機制規格定案

---

### 13.12 已完成項目

| 項目 | 完成日 | 對應子節 | 備註 |
|---|---|---|---|
| Emoji 容器三段稀有度（銅/銀/金）+ sepia 染色 | 2026-05-01 | 13.2 | dev 累積中，等下波進 main |
| 金級 conic-gradient 光暈（靜態） | 2026-05-01 | 13.4 部分 | dev 累積中 |
| 銀級成就色票對比度修正 | 2026-05-02 | 13.2 延伸 | dev commit `b3cc85d`，等下波進 main |
| 成就徽章可點擊回顧 | 2026-05-02 | — | dev 累積中（另一視窗開發） |
| 「更多功能」說明區塊 | 2026-05-02 | — | dev 累積中 |

### 13.13 推薦施工順序（依 ROI）

> 此順序為 Claude AI 建議，實際以 James 判斷與玩家反饋為準。
> 實機測試或玩家回報會動態調整優先級。

1. **13.4 成就解鎖儀式感** —— 高 ROI、純 CSS、有 dev 基礎延伸
2. **13.10 連續天數熱度視覺化** —— 給核心玩家強回饋，分散等級無感
3. **13.8 進場動畫精緻化** —— 投資低、效果普遍
4. **13.3 書架 vs 主頁色彩反差** —— 視覺整體性升級
5. **13.9 成就未解鎖神秘感** —— 配合等級解鎖驅動的設計方向

以上五題完成後可累積成下一波 main 的美術主題。

---

## 附錄：CSS 主檔位置

完整 CSS 在 `bible-game-v2.html` 的 `<style>` 區塊（line 17-421，405 行）。
建議閱讀順序：`:root` 變數 → 主流程卡片（avatar / verse / scenario / refl / complete）→ overlay / modal → 動畫 keyframes。
