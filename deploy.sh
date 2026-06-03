#!/usr/bin/env bash
# 部署封裝：Agent View 只送短指令「bash deploy.sh <子指令>」，繞過長管線指令格式 bug。
# 沿用現行實際部署指令，不改部署邏輯。不自動 git push / merge。
set -euo pipefail
cd /Users/aitest/Desktop/Bible-game

CMD="${1:-}"

echo "== 分支 / HEAD =="
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
echo

case "$CMD" in
  hosting)
    echo "▶ 固定測試站：firebase deploy --only hosting:main  (→ bible-game-bcb84.web.app)"
    firebase deploy --only hosting:main 2>&1 | tee deploy.log
    ;;
  channel)
    CH="${2:-dev}"
    EXP="${3:-30d}"
    # ⚠️ 紀律：channel:deploy 用 --only main（不是 hosting:main）
    echo "▶ Preview channel '$CH' (expires $EXP)：firebase hosting:channel:deploy $CH --only main --expires $EXP"
    firebase hosting:channel:deploy "$CH" --only main --expires "$EXP" 2>&1 | tee deploy.log
    ;;
  functions)
    echo "▶ Functions：firebase deploy --only functions:aiReflection,functions:lineLogin"
    firebase deploy --only functions:aiReflection,functions:lineLogin 2>&1 | tee deploy.log
    ;;
  *)
    echo "用法：bash deploy.sh <hosting|channel|functions> [channel名稱] [expires]"
    echo "  hosting               固定測試站  firebase deploy --only hosting:main"
    echo "  channel [名稱] [天數]  preview     firebase hosting:channel:deploy <名稱:dev> --only main --expires <天數:30d>"
    echo "  functions             後端        firebase deploy --only functions:aiReflection,functions:lineLogin"
    exit 1
    ;;
esac
