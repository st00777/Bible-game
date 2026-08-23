#!/usr/bin/env bash
# 部署封裝：Agent View 只送短指令「bash deploy.sh <子指令>」，繞過長管線指令格式 bug。
# 沿用現行實際部署指令，不改部署邏輯。不自動 git push / merge。
set -euo pipefail
cd /Users/aitest/Desktop/Bible-game

CMD="${1:-}"

# 白名單部署（安全事件收尾）：hosting 只上傳 public/ 內的遊戲檔。
# 每次部署前強制從根目錄同步，確保 public/ 版本不會落後、preview 不會驗到舊版。
# 共用純邏輯正本在 shared/（issue #5），由 scripts/sync-shared.js 複製到 public/shared、admin/shared、functions/lib。
sync_public() {
  mkdir -p public
  node scripts/sync-shared.js
  cp -f bible-game-v2.html content.js public/
  echo "▶ 已同步 public/（bible-game-v2.html + content.js + shared/）"
}

# AI fallback 文案守門（issue #7）：單一正本在 content.js 的 AI_FALLBACK_TEXT，
# functions/index.js 因部署邊界留有複本；部署 functions 前自動比對，不一致就中止，不靠人腦同步。
check_fallback_text() {
  local a b
  a=$(grep -m1 "^const AI_FALLBACK_TEXT = " content.js | sed "s/^const AI_FALLBACK_TEXT = '\(.*\)';.*/\1/")
  b=$(grep -m1 "^const FALLBACK_TEXT = " functions/index.js | sed "s/^const FALLBACK_TEXT = '\(.*\)';.*/\1/")
  if [ -z "$a" ] || [ -z "$b" ]; then
    echo "✖ 找不到 fallback 文案常數（content.js AI_FALLBACK_TEXT / functions/index.js FALLBACK_TEXT）"; exit 1
  fi
  if [ "$a" != "$b" ]; then
    echo "✖ AI fallback 文案不一致，中止部署："
    echo "   content.js        ：${a}"
    echo "   functions/index.js：${b}"
    echo "   請把 functions/index.js 的 FALLBACK_TEXT 改成與 content.js 相同後再部署。"
    exit 1
  fi
  echo "▶ fallback 文案一致 ✓（${a}）"
}

echo "== 分支 / HEAD =="
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
echo

case "$CMD" in
  hosting)
    sync_public
    echo "▶ 固定測試站：firebase deploy --only hosting:main  (→ bible-game-bcb84.web.app)"
    firebase deploy --only hosting:main 2>&1 | tee deploy.log
    ;;
  channel)
    CH="${2:-dev}"
    EXP="${3:-30d}"
    sync_public
    # ⚠️ 紀律：channel:deploy 用 --only main（不是 hosting:main）
    echo "▶ Preview channel '$CH' (expires $EXP)：firebase hosting:channel:deploy $CH --only main --expires $EXP"
    firebase hosting:channel:deploy "$CH" --only main --expires "$EXP" 2>&1 | tee deploy.log
    ;;
  functions)
    # 部署「全部」functions：舊寫法硬列 aiReflection,lineLogin，
    # 導致 autoCloseInactiveThreads（30 天自動關閉討論串）改了永遠上不了線（issue #7）。
    check_fallback_text
    node scripts/sync-shared.js --check   # functions/lib/feedback-schema.js 必須與 shared/ 正本一致（issue #5）
    echo "▶ Functions：firebase deploy --only functions（全部，含 autoCloseInactiveThreads）"
    firebase deploy --only functions 2>&1 | tee deploy.log
    ;;
  *)
    echo "用法：bash deploy.sh <hosting|channel|functions> [channel名稱] [expires]"
    echo "  hosting               固定測試站  firebase deploy --only hosting:main"
    echo "  channel [名稱] [天數]  preview     firebase hosting:channel:deploy <名稱:dev> --only main --expires <天數:30d>"
    echo "  functions             後端        firebase deploy --only functions（全部）"
    exit 1
    ;;
esac
