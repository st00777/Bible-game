# 指標口徑變更紀錄（metric changelog）

> 任何 UI／埋點改動只要可能改變既有指標的語意，就在這裡追一筆。判讀數據前先查：這週的數字跟上週可不可比？
> 維護者：data-analyst subagent（`.claude/agents/data-analyst.md`）；CC 改埋點時同步追加。

| 日期 | 影響指標／事件 | 改了什麼 | 可比性 |
|---|---|---|---|
| 2026-05-28 | 全部 B1 事件 | `users/{uid}/events` 上線（v2.15），之前無事件流 | 事件類指標自 05-24 週起才有 |
| 2026-06-03 | `submit_reflection.editDuration` | 新增默想編輯秒數 | 之前筆數無此欄 |
| 2026-08-23 | `read_chapter`（閱讀勳章率） | 新增「我已經讀過這章了」按鈕，`source='already'` 也算領勳章 | 8/28 `npm run funnel` 查證：already 僅 2%，閱讀率下滑非口徑造成，仍可比 |
| 2026-08-28 | `question_view / choice_confirm / submit_reflection / complete_devotional` | 各加 `elapsedSec`（自 chapter_select 起算） | 停留時長自此週起才有 |
| 2026-08-28 | `finale_view / finale_close / equipment_change` | 新事件 | 儀式 8/28 上線當天無曝光資料（埋點晚一步） |
| 2026-08-29 | 閱讀率（`read_chapter`） | `npm run funnel` 改為兩條線：外連 bible_com／自述已讀 already，分母＝該週完成靈修人；加 devotionHabit 交叉、events vs chapters 口徑守門 | 舊「閱讀勳章率」不再單列；8/16 週起兩條線可比。8/29 守門：events 14＝chapters 14 |
| 2026-08-30 | 新事件 `focus_enter/focus_exit`、`reward_view/reward_close`、`title_unlocked`、`page_switch`、`book_detail_open`、`tutorial_open/tutorial_close`、`guide_expand`；既有事件加參數：`ai_response_received.withEquipment`、`chapter_select.merged/order`、`login.trigger`、`app_leave.lastStep` | PR ①②③＋說明頁 #53 效果埋點（之前全無）；`npm run funnel` 加「新功能觸及」區塊 | 這些指標自 08-30 週起才有；8/28–8/30 三天新功能曝光永久缺 |
\n| 2026-08-30 | GA4 全部指標（MAU/WAU/DAU、新客 cohort、事件人數） | 前端改為只有正式站 `st00777.github.io` 才送 GA4；`npm run ga4` 加 ④ 層別（hostName／正式站限定活躍／新客週序列／來源／裝置） | 08-30 之前的 GA4 數字含 dev 預覽站與測玩流量（8/23 週新客 75 主因），判讀請用 ④ 的正式站限定值；08-30 起才乾淨 |\n
| 2026-08-30 | GA4 `sessionSource`；`read_chapter`／`tutorial_open` 的 `source` 參數 | gtag 那份把 `source` 改名 `event_source`（撞 GA4 保留字，曾污染流量來源）；Firestore 欄位不變 | GA4 端 08-30 前 source 值不可用；Firestore／funnel 不受影響 |
