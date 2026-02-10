#!/bin/bash

OUTPUT="fe-inventario-export-$(date +%Y%m%d_%H%M%S).txt"

echo "### TREE (inventario + domain + api relacionados)" > "$OUTPUT"
tree -L 5 \
  app/'(dashboard)'/inventario \
  lib/domain \
  lib/api \
  types/api \
  -I "node_modules|.next|dist|build|generated" >> "$OUTPUT"

echo -e "\n\n### INVENTARIO - FRONTEND FILES\n" >> "$OUTPUT"

sed -n '1,20000p' app/'(dashboard)'/inventario/page.tsx >> "$OUTPUT"
sed -n '1,20000p' app/'(dashboard)'/inventario/loading.tsx >> "$OUTPUT"

for f in app/'(dashboard)'/inventario/_components/*.tsx; do
  echo -e "\n\n### FILE: $f\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### INVENTARIO - API ROUTES\n" >> "$OUTPUT"

for f in app/api/inventory/*/route.ts; do
  echo -e "\n\n### FILE: $f\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### INVENTARIO - TYPES (source of truth)\n" >> "$OUTPUT"
sed -n '1,20000p' types/api/inventory.ts >> "$OUTPUT"

echo -e "\n\n### INVENTARIO - SERVICES (backend reference)\n" >> "$OUTPUT"
sed -n '1,20000p' services/inventory.service.ts >> "$OUTPUT"

echo "✅ Export completo: $OUTPUT"
