#!/bin/bash

OUTPUT="fe-historial-ventas-review-$(date +%Y%m%d_%H%M%S).txt"

echo "### PROJECT TREE (historial-ventas + sales domain) ###" > "$OUTPUT"
tree -L 5 \
  app/'(dashboard)'/historial-ventas \
  lib/api/sales.client.ts \
  lib/domain/sales \
  types/api/sales.ts \
  >> "$OUTPUT"

echo -e "\n\n### FILE CONTENTS ###\n" >> "$OUTPUT"

# --- HISTORIAL PAGES ---
sed -n '1,20000p' "app/(dashboard)/historial-ventas/page.tsx" >> "$OUTPUT"
sed -n '1,20000p' "app/(dashboard)/historial-ventas/loading.tsx" >> "$OUTPUT"

# --- HISTORIAL COMPONENTS ---
for file in app/'(dashboard)'/historial-ventas/_components/*.tsx; do
  echo -e "\n\n### FILE: $file ###\n" >> "$OUTPUT"
  sed -n '1,20000p' "$file" >> "$OUTPUT"
done

# --- API CLIENT ---
echo -e "\n\n### FILE: lib/api/sales.client.ts ###\n" >> "$OUTPUT"
sed -n '1,20000p' lib/api/sales.client.ts >> "$OUTPUT"

# --- DOMAIN SALES ---
for file in lib/domain/sales/*.ts; do
  echo -e "\n\n### FILE: $file ###\n" >> "$OUTPUT"
  sed -n '1,20000p' "$file" >> "$OUTPUT"
done

# --- BACKEND TYPES (SOURCE OF TRUTH) ---
echo -e "\n\n### FILE: types/api/sales.ts ###\n" >> "$OUTPUT"
sed -n '1,20000p' types/api/sales.ts >> "$OUTPUT"

echo "✅ Export de historial-ventas generado en $OUTPUT"
