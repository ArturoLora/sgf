#!/bin/bash

output_file="./fe5-inventario-$(date +%Y%m%d_%H%M%S).txt"

echo "=== FRONTEND INVENTARIO ===" > "$output_file"

find "app/(dashboard)/inventario" -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.md" \) \
  | sort | while read -r file; do
    echo -e "\n\n===== FILE: $file =====\n" >> "$output_file"
    sed 's/\t/  /g' "$file" >> "$output_file"
done

echo -e "\n\n=== BACKEND INVENTORY SCHEMAS ===\n" >> "$output_file"

for file in types/api/inventory.ts; do
  echo -e "\n\n===== FILE: $file =====\n" >> "$output_file"
  sed 's/\t/  /g' "$file" >> "$output_file"
done

echo "Export completo: $output_file"
