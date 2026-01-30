#!/bin/bash

output_file="./sgf-step4-export-$(date +%Y%m%d_%H%M%S).txt"

add() {
  if [ -f "$1" ]; then
    echo -e "\n=== $1 ===\n" >> "$output_file"
    cat "$1" >> "$output_file"
  fi
}

section() {
  echo -e "\n\n### $1 ###\n" >> "$output_file"
}

echo "SGF EXPORT STEP 4" > "$output_file"

# CONFIG
section "CONFIG"
add package.json
add tsconfig.json

# PRISMA
section "PRISMA"
add prisma/schema.prisma

# DB
section "DB"
add lib/db.ts

# TYPES
section "TYPES MODELS"
for f in types/models/*.ts; do add "$f"; done

section "TYPES API"
for f in types/api/*.ts; do add "$f"; done

# SERVICES
section "SERVICES"
for f in services/*.ts; do add "$f"; done

# API ROUTES
section "API ROUTES"
while IFS= read -r f; do
  add "$f"
done < <(find app/api -name route.ts)

echo "DONE -> $output_file"
