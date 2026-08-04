#!/usr/bin/env bash
# Удаляет временный модуль /invite-test целиком.
# Модуль относится к другому проекту и живёт в репозитории отдельно от воронки.
set -euo pipefail

cd "$(dirname "$0")/.."

PATHS=(
  "src/invite-test"
  "src/app/(frontend)/invite-test"
  "src/app/api/invite-test"
  "public/invite-test"
  "scripts/remove-invite-test.sh"
)

echo "Будут удалены:"
for p in "${PATHS[@]}"; do
  [ -e "$p" ] && echo "  $p" || echo "  $p (уже нет)"
done

read -r -p "Продолжить? [y/N] " answer
[ "$answer" = "y" ] || { echo "Отменено"; exit 1; }

for p in "${PATHS[@]}"; do
  rm -rf "$p"
done

cat <<'TEXT'

Удалено.

Осталось руками:
  1. Убрать блок «Тестовый модуль /invite-test» из .env.example и переменные
     INVITE_TEST_* из .env
  2. Убрать раздел «Временный модуль /invite-test» из README.md
  3. Если вебхуки были прописаны, снять их до удаления:
     curl -X DELETE "https://ваш-домен/api/invite-test/setup?key=..."
TEXT
