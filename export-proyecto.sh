#!/bin/bash

OUTPUT="fe-products-export-$(date +%Y%m%d_%H%M%S).txt"

echo "### TREE (products + domain + api relacionados)" > "$OUTPUT"
tree -L 5 \
  app/'(dashboard)'/productos \
  lib/domain \
  lib/api \
  types/api \
  -I "node_modules|.next|dist|build|generated" >> "$OUTPUT"

echo -e "\n\n### PRODUCTS - FRONTEND FILES\n" >> "$OUTPUT"

sed -n '1,20000p' app/'(dashboard)'/productos/page.tsx >> "$OUTPUT"
sed -n '1,20000p' app/'(dashboard)'/productos/loading.tsx >> "$OUTPUT"

for f in app/'(dashboard)'/productos/_components/*.tsx; do
  echo -e "\n\n### FILE: $f\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### PRODUCTS - API ROUTES\n" >> "$OUTPUT"

for f in app/api/products/*/route.ts; do
  echo -e "\n\n### FILE: $f\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### PRODUCTS - TYPES (source of truth)\n" >> "$OUTPUT"
sed -n '1,20000p' types/api/products.ts >> "$OUTPUT"

echo -e "\n\n### PRODUCTS - SERVICES (backend reference)\n" >> "$OUTPUT"
sed -n '1,20000p' services/products.service.ts >> "$OUTPUT"

echo "✅ Export completo: $OUTPUT"
