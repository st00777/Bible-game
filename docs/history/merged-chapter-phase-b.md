# 合併章節 Phase B 漸進釋出策略
> 自 CLAUDE.md 搬出（2026-08-24）；歸檔用，不再隨每輪載入。

### Phase B 漸進釋出策略

合併日雙章機制按書卷漸進切換，每書卷獨立 Phase B-X，依「章節物件 + entries 都備齊」原則上線。**戰略意涵待 PM 視窗補。**

- **Phase A**（v2.11 已上線）：5/22 雙入口 UI 框架 + getBookProgress 雙模式分流 + SCHEDULE 陣列結構 + day-info-bar 合併日雙卡。
- **Phase B 各書卷切換進度**：
  - **B-林後** ✅ 完成（v2.11）：COR2_6 章節物件 + entries 補入 + `mergedActive: false`，13/13 完走判定。
  - **B-加拉太** ⏳ 6/03 死線：缺 GAL5 章節物件。entries 補入後切 `mergedActive: false`。
  - **B-羅馬** ⏳ 待做：缺 ROM11 章節物件（4/28 合併日另一章）。
  - **B-林前** ⏳ 待做：缺 COR1_8 章節物件（5/10 合併日另一章）。
  - **B-使徒** ⏳ 待做：缺 ACT15（4/05）+ ACT28（4/17）兩個章節物件。
- **Phase C 歷史補做**：6/04 起書卷尚未開工。COL（西1+2，6/14）、TIM1（提前2+3，6/26）、HEB（來1+2，7/08）三個合併日需先建立整書卷的章節物件與 SCHEDULE 排程，才能 Phase B 切換。

**三條指導原則**：
1. **章節物件與 entries 同 PR 上**：避免「entries 補了但 CHAPTERS 沒對應章節」造成日曆顯示為「🔜 內容更新中」。
2. **任何 Phase 切換都不能讓現有玩家的書卷進度回退**：library_1 / library_3 成就的 `unlockedAchievements` 跳過重算保護是首道防線；新邏輯算出 < total 不會抹掉已解鎖徽章，但書卷頁進度條會降級顯示，需要在 PR 中確認該書卷 entries 已補滿。
3. **切換前先在 dev 驗證書卷統計正確**：跑 dev preview channel，用測試帳號完成該書卷所有章節，確認書架顯示「N/N 完走」、library_1/library_3 觸發解鎖。
