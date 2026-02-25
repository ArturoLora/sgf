#!/bin/bash

OUTPUT="be-phase3c-routing-context-$(date +%Y%m%d_%H%M%S).txt"

echo "========================================" > "$OUTPUT"
echo " BACKEND — FASE 3C: ROUTING CONSOLIDATION CONTEXT" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo -e "\n### API ROUTES (FULL)\n" >> "$OUTPUT"
for f in $(find app/api -name "route.ts"); do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### SERVICES (REFERENCE — READ ONLY)\n" >> "$OUTPUT"
for f in services/*.ts; do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n========================================" >> "$OUTPUT"
echo " ROUTING CONTEXT COMPLETED" >> "$OUTPUT"
echo " FILE: $OUTPUT" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo "✅ Backend Phase 3C routing context export completo: $OUTPUT"