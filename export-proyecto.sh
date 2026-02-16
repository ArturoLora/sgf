#!/bin/bash

OUTPUT="fe-socios-refactor-$(date +%Y%m%d_%H%M%S).txt"

echo "### TREE (socios + related api/domain/types)" > "$OUTPUT"
tree -L 5 \
  app/'(dashboard)'/socios \
  lib/api \
  lib/domain \
  types/api \
  services/members.service.ts \
  -I "node_modules|.next|dist|build|generated" >> "$OUTPUT"

echo -e "\n\n### SOCIOS - PAGE & LOADING\n" >> "$OUTPUT"
sed -n '1,20000p' app/'(dashboard)'/socios/page.tsx >> "$OUTPUT"
sed -n '1,20000p' app/'(dashboard)'/socios/loading.tsx >> "$OUTPUT"

echo -e "\n\n### SOCIOS - COMPONENTS\n" >> "$OUTPUT"
for f in app/'(dashboard)'/socios/_components/*.tsx; do
  echo -e "\n\n### FILE: $f\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### SOCIOS - API ROUTES\n" >> "$OUTPUT"
for f in app/api/members/*/route.ts; do
  echo -e "\n\n### FILE: $f\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### SOCIOS - TYPES (SOURCE OF TRUTH)\n" >> "$OUTPUT"
sed -n '1,20000p' types/api/members.ts >> "$OUTPUT"

echo -e "\n\n### SOCIOS - BACKEND SERVICE (REFERENCE ONLY)\n" >> "$OUTPUT"
sed -n '1,20000p' services/members.service.ts >> "$OUTPUT"

echo "✅ Export SOCIOS completo: $OUTPUT"
