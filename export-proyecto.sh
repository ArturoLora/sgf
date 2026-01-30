#!/bin/bash
# Export PASO 2 — API + Services + Types(models)

output_file="./paso2-api-contracts-$(date +%Y%m%d_%H%M%S).txt"

add_file() {
    if [ -f "$1" ]; then
        echo -e "\n=== $1 ===\n" >> "$output_file"
        cat "$1" >> "$output_file"
        echo -e "\n" >> "$output_file"
    fi
}

add_section() {
    echo -e "\n\n### $1 ###\n" >> "$output_file"
}

echo "PASO 2 - API CONTRACTS EXPORT $(date)" > "$output_file"

# ================= CONFIG =================
add_section "CONFIG"
add_file "package.json"
add_file "tsconfig.json"

# ================= PRISMA =================
add_section "PRISMA"
add_file "prisma/schema.prisma"

# ================= TYPES MODELS =================
add_section "TYPES MODELS"

for f in types/models/*.ts; do
  add_file "$f"
done

# ================= API ROUTES =================
add_section "API ROUTES"

find app/api -name "route.ts" | sort | while read f; do
  add_file "$f"
done

# ================= SERVICES =================
add_section "SERVICES"

find services -name "*.ts" | sort | while read f; do
  add_file "$f"
done

echo -e "\n✅ Export PASO 2 generado: ${output_file} ($(du -h "$output_file" | cut -f1))"
