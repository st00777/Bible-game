# Rive 中文學習資源（零動畫、零程式基礎版）
> 2026-09-17 查證。給完全沒碰過動畫軟體、也不寫程式的中文使用者。每條都標「語言／免費與否／適合度」，查不到的明寫。
> 原則：**先把介面變中文，再看官方 Rive 101，遇到不懂的詞回中文文檔查。** 不要一開始就買課。

---

## 0. 三分鐘結論（學習順序）

| 步驟 | 做什麼 | 用哪個資源 | 費用 |
|---|---|---|---|
| 1 | 把 Rive 編輯器介面變中文 | RiveCN 漢化插件（Chrome 擴充） | 免費 |
| 2 | 跟著官方入門系列做一遍，88 支短片 | rive101.com 簡中圖文版（或 B 站搬運字幕版） | 免費 |
| 3 | 看不懂的名詞回頭查 | rive.org.cn 或 rivecn.com 的官方文檔中文翻譯 | 免費 |
| 4 | 想做角色（骨骼／換裝／待機）再進階 | 本知識庫 `editor-rigging.md`、`animation-statemachine.md` | — |
| 5 | 卡住問人 | 官方 Discord（英文）／內建 AI Agent（中文可用） | 免費 |

零基礎最容易放棄的點不是「難」，是**英文介面＋英文影片雙重負擔**。步驟 1＋2 就是把這兩層都拿掉。

---

## 1. 介面漢化（先做這個）

### RiveCN 漢化插件 ★首選
- 網址：https://chromewebstore.google.com/detail/rivecn/nhjgmafflpekbjcoljhjlajabjjdmmfa
- 性質：Chrome 擴充功能，把 editor.rive.app 的介面文字換成中文，可自訂字體。
- 查證（2026-09-17 Chrome Web Store 頁面）：版本 2.0.12、最後更新 2026-09-15、約 2,000 用戶、評分 5.0（7 則）、免費、宣告不收集資料。
- 語言：**簡體中文**，未見繁體選項。
- ✅ 2026-09-17 James 實測安裝成功。
- 注意：Rive 編輯器更新很快，插件有時會落後幾天出現英文殘留，屬正常。

### 社群翻譯詞典 riveLanguage（備援）
- 網址：https://gitcode.com/en-qu/riveLanguage
- 性質：社群維護的介面翻譯 JSON 詞典，CC BY 4.0。**不是可直接安裝的插件**，是給工具開發者用的資料。零基礎不用碰，列出只為說明漢化插件背後有開源資料可查。

### Rive 官方有沒有中文介面？
- 未查到官方語言切換選項（2026-09-17）。介面中文目前只能靠上面的插件。

---

## 2. 系統入門課（免費）

### 官方 Rive 101（英文原版）
- YouTube 播放清單：https://www.youtube.com/playlist?list=PLyMGsVcSw2x9ey_gh8LaSdKBKY4G3i5RQ
- 官方學習入口頁：https://rive.app/docs/tutorials/learn-rive
- 性質：Rive 官方做的入門系列，每支 1–5 分鐘，從介面到狀態機到資料綁定。**這是所有中文資源的源頭**，下面兩個都是它的翻譯版。
- YouTube 可開自動翻譯字幕（中文），品質普通但夠用。

### rive101.com 簡中圖文版 ★首選
- 網址：https://rive101.com/zh/
- 性質：第三方做的「Rive 101 學習伴侶」，把官方 88 支影片包成有進度紀錄、章節導航、圖文筆記、版本變化提示的網站。免費，不用登入。
- 章節（共 9 模組 88 課）：入門基礎 5、設計工具 14、動畫 13、文本 5、綁定與約束 14、狀態機 15、布局 6、數據綁定 13、庫 3。
- 語言：簡體中文（有 /en/ 英文版可對照）。影片本身仍是英文原音，**文字說明是中文**。
- 適合度：零基礎最適合。建議順序＝入門基礎 → 設計工具 → 動畫 → 綁定與約束 → 狀態機；文本／布局／數據綁定／庫可先跳過。
- 未查到：製作者身分（About 頁只說是官方 YouTube 內容的替代觀看頁）。

### B 站搬運翻譯版
- 網址：https://www.bilibili.com/video/BV1UW421R7sZ/
- 性質：UP 主「月離萬事屋」搬運官方 Rive 101，加中文標題與翻譯，88 集，2024-07 發布，2.5 萬播放。
- 語言：簡體中文字幕。
- 適合度：習慣看 B 站的人可用；缺點是 2024 年版本，Rive 編輯器之後改過不少（例如 Data Binding、Layout），**遇到介面對不上時以 rive101.com 的「版本變化提示」為準**。

### B 站其他
- 「RIVE 動畫動效軟體教程1」https://www.bilibili.com/video/BV1ML4y187db/ ——舊版教學，僅供參考，未逐一查證內容年份。

---

## 3. 官方文檔中文翻譯（查名詞用）

### rive.org.cn
- 網址：https://rive.org.cn/
- 性質：Rive 官方文檔的簡中翻譯站（VitePress），分「入門指南／編輯器／應用運行時／遊戲運行時／腳本／教程與社區」。
- 查證：2026-09-17 該站 **HTTPS 憑證已過期**，瀏覽器會跳警告；內容仍可讀。維護者未署名。
- 用法：不要從頭讀。當 rive101 出現「約束」「網格」「Solo」這類詞看不懂時，來這裡搜。

### rivecn.com 漢化文檔
- 網址：https://rivecn.com/docs/
- 性質：RiveCN 站（做漢化插件的同一團隊）維護的官方文檔中文版，另有「入門知識」分類。
- 與 rive.org.cn 二選一即可；rivecn.com 憑證正常、更新較勤（插件 9/15 剛更新）。

---

## 4. 繁體中文資源（少，只有概念文）

| 資源 | 性質 | 適合度 |
|---|---|---|
| Tenten〈Rive 入門指南〉https://tenten.co/learning/what-is-rive/ | 2025-02 概念介紹，18 分鐘閱讀，有程式碼範例 | 只適合「先搞懂 Rive 是什麼」，不是操作教學 |
| Tenten〈Rive: 網頁動畫設計的終極工具〉https://tenten.co/learning/rive-app-web-animation/ | 同上，偏網頁應用 | 同上 |
| yujih〈Rive：Duolingo 動畫背後的新創〉https://yujih.com/blog/rive-animation-startup/ | 產業介紹 | 想知道「誰在用」再看 |
| Flutter Formosa〈教你製作強大的 Rive 動畫〉（Medium） | 偏 Flutter 程式整合 | 零程式基礎跳過（2026-09-17 抓取 403，未能驗證內文） |
| YouTube〈Rive 高級動畫技巧｜互動漸層光環 Hover〉https://www.youtube.com/watch?v=PFXHAu94W1M | 繁中單支進階技巧 | 入門完再看 |

**結論：繁中沒有系統性入門課。** 零基礎者請直接用簡中資源（rive101.com／漢化插件），繁簡閱讀障礙遠小於英文。

---

## 5. 付費課程（入門完再考慮，不建議一開始買）

| 課程 | 語言 | 價格 | 適合度 | 備註 |
|---|---|---|---|---|
| RiveCN「零基礎入門到實踐中文系列課」https://rivecn.com/courses | 簡中 | 頁面未標價 | 標零基礎 | 先導 1＋交互 4＋動畫 3＋設計 2＋加餐；B 站課堂或 Flowus 上課，兩版內容相同，**站方提醒不要在 iOS 上購買（抽成貴）**。與 Rive.cool 站長合作。免費版 Rive 101 讀完再決定 |
| School of Motion「Rive Academy Kickstart」 | 英文 | 頁面未標價（走 All-Access 會員） | **標 Intermediate**，不是零基礎 | Joey Korenman 講，6 小時以上 |
| Rive Masterclass https://www.rivemasterclass.com/ | 英文 | 未查 | 70+ 課含 Scripting | 本知識庫已引用其眨眼教學 |
| The Motion Magic「Ultimate Rive Course」 | 英文 | 未查 | 自稱零基礎可 | 未查證內容 |

---

## 6. 問人與練習

- **官方 Discord**（英文，約 2 萬人）：https://discord.com/invite/FGjmaTr —— 貼圖＋簡單英文就能問；用 Chrome 翻譯外掛看回覆。
- **官方社群論壇** community.rive.app —— 網頁 JS 動態渲染，搜尋引擎找不到內文，要直接進站搜。
- **編輯器內建 AI Agent**（中文可用，免費版可用）：左側欄開 Agent、切 Build 模式；規則與踩坑見 `ai-agent-and-mcp.md`。零基礎者最實用的用法是**用 Ask 模式問「這個按鈕是什麼」**，比翻文檔快。
- **Marketplace 範例檔**（rive.app/community）：把別人的 .riv 開進編輯器拆著看，是官方推薦的學法；免費版可開可改，只是不能匯出。

---

## 7. 零基礎專屬提醒

1. **不需要先學 Illustrator／After Effects**。Rive 內建向量工具夠畫簡單角色；本專案素材是 PNG 匯入，更不用畫。
2. **「動畫基礎」在 Rive 101 的「動畫」13 課裡就教完了**：關鍵影格、緩動、循環。不用另外找動畫原理課。
3. **程式完全不用碰**。狀態機是拖拉連線；Data Binding、Scripting 那兩章零基礎可整章跳過，本專案接網頁的部分由 Claude Code 負責（`web-runtime.md`）。
4. **免費方案限制**：可學、可做、不能匯出 .riv（見 `ecosystem-and-pipeline.md` 第 1 節）。學習期間不需要付費。
5. 影片教學看到的介面跟自己的不一樣，先看 rive101.com 該課的「版本變化提示」，通常是改名或搬位置，不是功能沒了。

---

## 8. James 學習進度（rive101.com/zh）

| 日期 | 完成 | 備註 |
|---|---|---|
| 2026-09-17 | 漢化插件安裝成功 | |
| 2026-09-18 | 入門基礎 5/5 | 下一步：設計工具挑 5 課（畫形狀、選取移動、群組、匯入圖片、圖層順序） |

實作計畫：動畫 13 課全做、綁定與約束 14 課全做、狀態機前 8 課做；文本／布局／數據綁定／庫跳過。練習用教程素材，不用自己的角色圖。

## 9. 查證狀況與未查到

| 項目 | 狀態 |
|---|---|
| RiveCN 插件是否支援繁體 | 未查到，商店頁只寫中文（簡體） |
| rive101.com 製作者 | 未查到署名 |
| RiveCN 付費課價格 | 頁面未公開 |
| Rive 官方是否有中文介面 | 未查到，判斷為無 |
| Flutter Formosa Medium 文內容 | 抓取 403，未驗證 |
| YouTube Rive 101 播放清單影片數 | 抓取只拿到頁尾，未驗證；rive101.com 標 88 |
