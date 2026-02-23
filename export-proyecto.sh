#!/bin/bash

OUTPUT="be-phase2-services-context-$(date +%Y%m%d_%H%M%S).txt"

echo "========================================" > "$OUTPUT"
echo " BACKEND — FASE 2: SERVICES SIMETRÍA" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo -e "\n### SERVICES TREE\n" >> "$OUTPUT"
tree services >> "$OUTPUT"

echo -e "\n\n### SERVICES (FULL CONTENT)\n" >> "$OUTPUT"
for f in services/*.ts; do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### DOMAIN (REFERENCE)\n" >> "$OUTPUT"
tree lib/domain >> "$OUTPUT"

echo -e "\n\n### DOMAIN TYPES (FULL)\n" >> "$OUTPUT"
for f in $(find lib/domain -name "types.ts"); do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,2000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### API ROUTES (REFERENCE)\n" >> "$OUTPUT"
tree app/api >> "$OUTPUT"

echo -e "\n\n========================================" >> "$OUTPUT"
echo " SERVICES CONTEXT EXPORT COMPLETED" >> "$OUTPUT"
echo " FILE: $OUTPUT" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo "✅ Backend Phase 2 context export completo: $OUTPUT"
