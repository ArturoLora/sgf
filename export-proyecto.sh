#!/bin/bash

OUTPUT="fe-products-refactor-$(date +%Y%m%d_%H%M%S).txt"

echo "### TREE (productos actuales + types + backend reference)" > "$OUTPUT"
tree -L 5 \
  app/'(dashboard)'/productos \
  types/api/products.ts \
  types/api/inventory.ts \
  services/products.service.ts \
  -I "node_modules|.next|dist|build|generated" >> "$OUTPUT"

echo -e "\n\n### PRODUCTS - CURRENT FRONTEND FILES\n" >> "$OUTPUT"

sed -n '1,20000p' app/'(dashboard)'/productos/page.tsx >> "$OUTPUT"
sed -n '1,20000p' app/'(dashboard)'/productos/loading.tsx >> "$OUTPUT"

for f in app/'(dashboard)'/productos/_components/*.tsx; do
  echo -e "\n\n### FILE: $f\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### TYPES - SOURCE OF TRUTH\n" >> "$OUTPUT"
sed -n '1,20000p' types/api/products.ts >> "$OUTPUT"
sed -n '1,20000p' types/api/inventory.ts >> "$OUTPUT"

echo -e "\n\n### BACKEND SERVICE (REFERENCE ONLY)\n" >> "$OUTPUT"
sed -n '1,20000p' services/products.service.ts >> "$OUTPUT"

echo "✅ Export PRODUCTS (desde 0) completo: $OUTPUT"
