# 技術架構與後端明細
> 自 CLAUDE.md 搬出（2026-09-04 瘦身），內容原樣保留；CLAUDE.md 只留摘要與指標。
> Firestore 完整欄位見 `docs/firestore-schema.md`；安全規則正本在 `firestore.rules`。

## 技術架構

**前端**：HTML + CSS + JavaScript（bible-game-v2.html + app.js + content.js，無建置步驟）
**部署**：GitHub Pages（HTTPS，免費）
**後端**：Firebase（Firestore Database + Authentication + Cloud Functions Gen 2）
**登入方式**：Google 登入、LINE 登入（未登入可繼續使用訪客模式）
**資料同步**：登入後進度自動同步 Firestore；未登入使用 localStorage
**Firebase 專案**：`bible-game-bcb84`
**AI 回應**：Google AI Studio（Gemini 2.5 Flash），透過 Cloud Function `aiReflection` 代理呼叫
**Feature flag**：無現役 flag（`FEATURE_FEEDBACK_V2` 與 `BOOK_DETAIL_ENABLED` 已於 2026-09-01 退役、功能恆開）；曠野呼聲 v2 規格史見 `docs/history/feedback-v2-spec.md`
**追蹤**：Google Analytics GA4（measurement ID `G-HZ3EGYB8BB`；Data API 用的 property ID 是 `534159832`，純數字、在 GA4 屬性設定找）

## 數據分析指令

- `npm run analyze` ── Firestore 6 區塊報告（feedback / users / 靈修進度 / 成就 / 章節品質 ①-④ / 裝備 ⑤ / 默想歷史 ⑥）
- `npm run logs [天數]` ── aiReflection 呼叫量、AI 真實回應比、錯誤類型分布（預設過去 1 天）
- `npm run line-logs [天數]` ── lineLogin 成功率、HTTP 失敗分布、錯誤類型、失敗時段（預設過去 1 天）
- `npm run funnel [週數]` ── B1 事件流漏斗（人／人×章兩種口徑）、掉人最多章節、閱讀勳章來源 bible_com vs already（口徑漂移守門）、各段停留中位數（elapsedSec，2026-08-28 起）、終點儀式 finale_view/close
- `npm run ga4` ── GA4 深度指標：活躍規模 MAU(30天)/WAU(7天)/DAU(昨天)、9 核心事件觸發人數、週 cohort 留存（對齊 data-insights 口徑）

前三支用 Firebase CLI refresh token 直接打 Cloud REST API；`npm run ga4` 改用 service account 金鑰（`ga4-key.json`，屬性檢視者權限）+ 純 Node crypto 簽 JWT 換 token 打 GA4 Data API。四支都不需額外安裝 SDK。

> **GA4 SA 權限怎麼來的**（2026-06-01）：GA4 網頁「資源存取權管理」加 service account 會跳「與帳戶不符」加不進去（已知卡點）。改用管理員 OAuth + Admin API `createAccessBinding` 從程式端加成「檢視者」。`ga4-key.json`（SA 金鑰）與 `token.json`（OAuth 授權）都已 gitignore、絕不進 git。

## scripts/ 一覽

| 檔案 | 用途 |
|---|---|
| `scripts/_shared.js` | 共用：PROJECT 常數 + OAuth token + Cloud Logging 抓取 |
| `scripts/analyze-feedback.js` | Firestore 數據分析（npm run analyze） |
| `scripts/check-ai-logs.js` | aiReflection 呼叫量／成功率（npm run logs） |
| `scripts/check-line-logs.js` | lineLogin 成功率／失敗分布（npm run line-logs） |
| `scripts/list-profiles.js` | 列玩家 profile/data（含 E1 分眾欄位） |
| `scripts/verify-b1-events.js` | B1 事件流落地驗證（列 uid events + 9 事件覆蓋） |
| `scripts/funnel.js` | B1 漏斗：週別選章→看題→確認→送默想→完成、掉人章節、閱讀來源、停留、儀式曝光（npm run funnel） |
| `scripts/ga4-insights.js` | GA4 深度指標（npm run ga4，用 SA 金鑰打 Data API） |
| `scripts/validate-content.js` | Node 端內容自檢（錯誤 exit 1） |
| `scripts/sync-shared.js` | 共用檔正本→三個部署單元複本（--check 只比對） |

其他根目錄檔案：`shared/feedback-schema.js`（曠野呼聲狀態機單一正本；npm run sync-shared 複製到 public/shared、admin/shared、functions/lib）、`public/`（Firebase hosting:main 上傳目錄，deploy.sh 從根目錄同步，不要直接改）、`test/`（npm test：內容自檢、core、feedback-schema、HTML 結構守門）、`.claude/agents/data-analyst.md`（數據分析 subagent，sonnet）、`docs/metric-changelog.md`（指標口徑變更紀錄）。

## Firestore 資料結構

> 完整欄位明細見 `docs/firestore-schema.md`。改 schema 前先跑 `bible-firestore-safety` skill。

```
users/{uid}                                   主文件：completed / streak / items / 裝備 / level / xp / name / gender / setup
users/{uid}/profile/data                      登入資訊 + E1 分眾 5 欄位（ageGroup/churchKey/district/groupName/devotionHabit）
users/{uid}/chapters/{chapterKey}             每章完成記錄（date/timeOfDay/choiceSelected/reflectionText/aiResponse/aiIsFallback/mood）
users/{uid}/chapters/{chapterKey}/reflections/{ts}   默想歷史（每次寫默想新增一筆）
users/{uid}/stats/data                        累計統計（totalDays/reflectionCount/readCount/…）
users/{uid}/achievements/data                 成就 unlockedAt / progress
users/{uid}/events/{eventId}                  B1 事件流（9 核心事件、sessionId；訪客不寫）
feedback/{docId}                              曠野呼聲（v1 欄位 + v2 wantReply/status/unread*/messageCount）
feedback/{docId}/messages/{msgId}             多輪對話（role player|admin，≤300 字）
```

關鍵注意：`chapters/{key}` 用 `.set()` 會覆蓋，只保留最後一次默想，歷史請查 `reflections` 子集合；`events` 為 fire-and-forget、訪客不寫。
時段定義：morning 05:00–11:59 / afternoon 12:00–17:59 / evening 18:00–21:59 / night 22:00–04:59（清晨統計用 05:00–08:59）。

## 安全規則

- 每個玩家只能讀寫自己的 `users/{uid}/**`。
- `feedback` 集合：write 受 hasOnly／300 字等 schema 檢查；read 限 owner（uid 比對，匿名留言永遠讀不到）或 admin（2026-05-01 修正，原本任何登入玩家可讀所有人）。
- `feedback/{id}/messages` 子集合：append-only，role／authorUid 一致性檢查。
- **Admin 機制**：`isAdmin()` 用 Google email 白名單（`st00777@hotmail.com`）。新增 admin 直接改函式 + `firebase deploy --only firestore:rules`。
- 完整規則見 `firestore.rules`（正本，不在此重抄）。

## 授權網域

Firebase Authentication 已授權：`st00777.github.io`、`bible-game-bcb84--dev-01luz2yz.web.app`

## 自動備份

- 每日自動備份 Firestore（2026-04-17 起）
- 保留 7 天，超過自動清除
- 排程 ID：`7611676d-7c03-4bd3-bd63-b9e4fc8387af`
- 查看備份：`firebase firestore:backups:list --location asia-east1`
- 還原指令：`firebase firestore:databases:restore --backup <backup-name>`

## Cloud Functions

**lineLogin**（us-central1，2nd Gen）
- 功能：LINE OAuth 2.0 授權碼換 Firebase 自訂 Token
- URL：`https://linelogin-kvjdptgk7q-uc.a.run.app`
- CORS：允許 `https://st00777.github.io`（正式版）和 `https://bible-game-bcb84--dev-01luz2yz.web.app`（測試版）
- Channel ID：`2009801861`（公開，可硬編碼）
- Channel Secret：存放於 Firebase Secret Manager（`LINE_CHANNEL_SECRET`）
- Firebase UID 格式：`line:{lineUserId}`（與 Google 帳號 UID 空間隔離）
- 流程：接收 `code` + `redirect_uri` → 換 access token → 取 LINE profile → 建立 custom token → 回傳 token + 姓名 + 頭像

**aiReflection**（us-central1，2nd Gen）
- 功能：AI 靈修默想回應
- URL：`https://aireflection-kvjdptgk7q-uc.a.run.app`
- CORS：允許 prod + dev
- 模型：Gemini 2.5 Flash (`gemini-2.5-flash`)
- API Key：存放於 Firebase Secret Manager（`GOOGLE_AI_API_KEY`）
- 流程：接收 `chapter` + `reflectionTitle` + `playerText` → 呼叫 Gemini → 回傳 `{ aiResponse }`
- generationConfig：`maxOutputTokens: 1500, temperature: 0.9`（2026-05-01 從 1000/0.7 升級，避免回應被截斷）
- **失敗處理**：Gemini 回 503 最多重試 3 次（1.5±0.5 秒 jitter）；其餘錯誤回 fallback 文字「謝謝你願意把心裡的話帶到神面前。祂看見了。」（玩家不會看到錯誤）
- 監控：`npm run logs` 看當天呼叫成功率，目標 90% 以上；若 fallback 持續 >10% 考慮加 Gemini Pro 備援，或調整 generationConfig（譬如降 maxOutputTokens / temperature 讓回應更快、減少超時觸發）

**autoCloseInactiveThreads**（us-central1，2nd Gen）
- 功能：30 天無新訊息的曠野呼聲 thread 自動標記 `status='closed'`（每日排程掃描，cron `0 4 * * *` Asia/Taipei）
- 部署：2026-05-24（v2.14 上線時部署到 production）

## 管理後台

admin web app 已部署（reply 回覆功能上線，2026-05-24，URL: `https://bible-game-admin.web.app`）；SCHEDULE 管理仍未做。

## 預覽網址方案（dev 分支）

> 選型比較（Firebase preview channel／Cloudflare Pages／本機）見 `docs/history/preview-channel-options.md`；已拍板用 Firebase Hosting Preview Channels。

部署指令：`bash deploy.sh channel dev`（等同 `firebase hosting:channel:deploy dev --expires 30d`）。

**目前使用中的 dev 預覽網址**：
`https://bible-game-bcb84--dev-01luz2yz.web.app/bible-game-v2.html`
每次 channel deploy 自動延長 30 天（到期就再跑一次 deploy）
