#!/bin/bash

output="./fe4-socios-$(date +%Y%m%d_%H%M%S).txt"

echo "=== FE4 SOCIOS EXPORT ===" > "$output"

add() {
  if [ -f "$1" ]; then
    echo -e "\n\n===== FILE: $1 =====\n" >> "$output"
    cat "$1" >> "$output"
  fi
}

# frontend socios
find "app/(dashboard)/socios" -type f \( -name "*.tsx" -o -name "*.md" \) | while read f; do
  add "$f"
done

# backend domain source of truth
add "types/api/members.ts"

echo "Export completo: $output"
