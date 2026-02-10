#!/bin/bash

OUTPUT="fe-cortes-review-$(date +%Y%m%d_%H%M%S).txt"

echo "### PROJECT TREE (cortes + shifts domain) ###" > "$OUTPUT"
tree -L 5 \
  app/'(dashboard)'/cortes \
  lib/api/shifts.client.ts \
  lib/domain/shifts \
  types/api/shifts.ts \
  >> "$OUTPUT"

echo -e "\n\n### FILE CONTENTS ###\n" >> "$OUTPUT"

# --- CORTES PAGES ---
sed -n '1,20000p' "app/(dashboard)/cortes/page.tsx" >> "$OUTPUT"
sed -n '1,20000p' "app/(dashboard)/cortes/loading.tsx" >> "$OUTPUT"

# --- CORTES COMPONENTS ---
for file in app/'(dashboard)'/cortes/_components/*.tsx; do
  echo -e "\n\n### FILE: $file ###\n" >> "$OUTPUT"
  sed -n '1,20000p' "$file" >> "$OUTPUT"
done

# --- API CLIENT ---
echo -e "\n\n### FILE: lib/api/shifts.client.ts ###\n" >> "$OUTPUT"
sed -n '1,20000p' lib/api/shifts.client.ts >> "$OUTPUT"

# --- DOMAIN SHIFTS ---
for file in lib/domain/shifts/*.ts; do
  echo -e "\n\n### FILE: $file ###\n" >> "$OUTPUT"
  sed -n '1,20000p' "$file" >> "$OUTPUT"
done

# --- BACKEND TYPES (SOURCE OF TRUTH) ---
echo -e "\n\n### FILE: types/api/shifts.ts ###\n" >> "$OUTPUT"
sed -n '1,20000p' types/api/shifts.ts >> "$OUTPUT"

echo "✅ Export completo generado en $OUTPUT"
