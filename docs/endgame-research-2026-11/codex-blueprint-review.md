唯讀審查完成，未修改檔案。方向可行，但資料相容與驗收範圍尚不足以支撐封版。

**事實錯誤與不精確處**

- 藍圖第47行把既有自檢當待新增；「排程章節須有內容」已在 [content.js:11648](/Users/aitest/bible-work/Bible-game/content.js:11648)。
- 第92行日期應為民1–4分別於12/15–18讀到；目前程式排程只到12/14，年底民19是文件計畫，尚未實裝（[進度表:57](/Users/aitest/bible-work/Bible-game/docs/reading-schedule-2026.md:57)、[content.js:291](/Users/aitest/bible-work/Bible-game/content.js:291)）。
- 第47行應限定「數字10轉ACT10」；字串`'10'`原樣回傳，抽檔若改型別會造成完成紀錄分裂（[core.js:22](/Users/aitest/bible-work/Bible-game/core.js:22)）。
- 第121行26條包含2條退役，現役24條；不能直接判定舊文件28條全錯（[app.js:642](/Users/aitest/bible-work/Bible-game/app.js:642)、[app.js:691](/Users/aitest/bible-work/Bible-game/app.js:691)）。
- 第66行概括過度：GEN10問「普通、不值得被記住」，GEN36才問配角（[content.js:7573](/Users/aitest/bible-work/Bible-game/content.js:7573)）。
- 排序免拖曳已實作，應列回歸驗收；279／98／812章數核算正確（[app.js:1906](/Users/aitest/bible-work/Bible-game/app.js:1906)）。

**建議修改，每條一句**

- 輪次遷移須涵蓋主文件`completed/items/rewardClaimed`、本機、訪客與舊分頁，加入可重跑遷移、回滾及防重複獎勵驗收（[app.js:78](/Users/aitest/bible-work/Bible-game/app.js:78)）。
- 進度加入識別碼與版本、輪次及排程項目識別，因反查目前只取章節第一次出現，同輪重排或跨輪會取錯日期（[core.js:114](/Users/aitest/bible-work/Bible-game/core.js:114)）。
- 合併日驗收須含同日、跨日補讀、換進度及重讀，出席依實際完成日去重，歷史日期不得隨新表改寫。
- 默想保存補上草稿、訪客、帳號隔離、恢復重送與去重，匯出須讀歷史子集合，不能只讀最新章文件（[app.js:2168](/Users/aitest/bible-work/Bible-game/app.js:2168)、[app.js:3015](/Users/aitest/bible-work/Bible-game/app.js:3015)）。
- 12/1前完成民1–4樣品與審稿，依每週一節奏於11/30交付12/14–20內容，民26及代上日期標為待確認。
- 16–19天僅列開發估算，另留遷移演練、真機、無障礙與內容審查時間，取消默想保存依賴章日拆開。

**我不同意的地方**

- 缺98章卻延至第二輪才補，第一輪無法達成「全本完成」終點。
- 各文體尚未驗樣就宣告不加機制過早；完卷卡宜先列樣品，雙軌獎勵也不能留作「封版後新機制」。
- 人物配故事仍可能是知識題；邊界應是提供本章線索、可跳過、無答對門檻，而非只禁止配支派。

本次審查已結束，可 `/clear`。
