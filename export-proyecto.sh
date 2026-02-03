#!/bin/bash
# FE1 - Ventas frontend + backend schemas export (definitivo)

output_file="./fe1-ventas-$(date +%Y%m%d_%H%M%S).txt"

add_file_content() {
    local file="$1"
    if [ -f "$file" ]; then
        echo -e "\n=== ${file} ===\n" >> "$output_file"
        cat "$file" >> "$output_file"
        echo -e "\n" >> "$output_file"
    fi
}

echo "NACHO GYM - FE1 VENTAS EXPORT $(date +%Y%m%d_%H%M%S)" > "$output_file"

# ================= FRONTEND VENTAS =================

for f in app/\(dashboard\)/ventas/*.tsx; do
  add_file_content "$f"
done

if [ -d "app/(dashboard)/ventas/_components" ]; then
  for f in app/\(dashboard\)/ventas/_components/*.tsx; do
    add_file_content "$f"
  done
fi

add_file_content "app/(dashboard)/ventas/README.md"

# ================= BACKEND SCHEMAS =================

add_file_content "types/api/sales.ts"
add_file_content "types/api/inventory.ts"

echo -e "\n✅ Export generado: ${output_file} ($(du -h "$output_file" | cut -f1))"
