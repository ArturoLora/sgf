#!/bin/bash

output="./fe6-historial-$(date +%Y%m%d_%H%M%S).txt"

HISTORIAL_PATH="app/(dashboard)/historial-ventas"

echo "### HISTORIAL FRONTEND AUDIT ###" > "$output"

echo -e "\n--- TREE ---\n" >> "$output"
tree "$HISTORIAL_PATH" >> "$output"

echo -e "\n--- FILES ---\n" >> "$output"

find "$HISTORIAL_PATH" -type f \( -name "*.tsx" -o -name "*.md" \) | while read file; do
  echo -e "\n===============================" >> "$output"
  echo "FILE: $file" >> "$output"
  echo "===============================" >> "$output"
  sed -n '1,400p' "$file" >> "$output"
done

echo -e "\n--- BACKEND TYPES (sales + inventory) ---\n" >> "$output"

sed -n '1,400p' types/api/sales.ts >> "$output"
sed -n '1,400p' types/api/inventory.ts >> "$output"

echo -e "\nDONE → $output"
