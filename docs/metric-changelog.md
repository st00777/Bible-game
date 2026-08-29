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
