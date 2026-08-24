# dev 分支預覽網址方案（選型比較）
> 自 CLAUDE.md 搬出（2026-08-24）；歸檔用，不再隨每輪載入。

GitHub Pages 免費版只能部署一個分支(= main)。dev 分支要有獨立預覽網址,以下**由易到難**:

**① Firebase Hosting Preview Channels(推薦)**
- 已經在用 Firebase,不必再申請新服務
- 指令:`firebase hosting:channel:deploy dev --expires 30d`
- 每次 deploy 拿到類似 `https://bible-game-bcb84--dev-xxxxxx.web.app` 的臨時網址
- 預設 7 天過期,可加 `--expires` 延長,最長 30 天
- 成本:Blaze 方案免費額度內不收費
- **注意事項**:
  - 需在 `firebase.json` 加 Hosting 設定
  - LINE Callback URL 要在 LINE Console 加入 dev 網址(支援多個)
  - Firebase Auth 授權網域也要加入新網域

**② Netlify / Cloudflare Pages(獨立服務,免費)**
- 綁 GitHub repo,指定 dev 分支自動部署
- 拿到固定網址 `<project>-dev.netlify.app` / `.pages.dev`
- 優點:每次 push 自動部署,不用手動指令
- 缺點:多一個服務要管,LINE / Firebase Auth 授權網域一樣要加

**③ 本機預覽(最陽春)**
- `python3 -m http.server 8080` 在 `localhost:8080` 測
- 只有自己看得到,無法手機測試
- Firebase Auth 需把 `localhost` 加入授權網域

**建議**:短期用 ① Firebase Hosting Preview Channels,長期如果想要 push 就自動預覽,改 ② Cloudflare Pages。
