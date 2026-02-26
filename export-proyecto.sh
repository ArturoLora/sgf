#!/bin/bash

OUTPUT="fe-phase5-orchestration-context-$(date +%Y%m%d_%H%M%S).txt"

echo "========================================" > "$OUTPUT"
echo " FRONTEND — FASE 5: MANAGER ORCHESTRATION CONTEXT" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo -e "\n### FRONTEND TREE (dashboard only)\n" >> "$OUTPUT"
tree -L 6 app/'(dashboard)' \
  -I "node_modules|.next|dist|build|generated" >> "$OUTPUT"

echo -e "\n\n### PRODUCTOS MODULE (FULL)\n" >> "$OUTPUT"
for f in app/'(dashboard)'/productos/_components/*.tsx; do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### VENTAS MODULE (FULL)\n" >> "$OUTPUT"
for f in app/'(dashboard)'/ventas/_components/*.tsx; do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### SOCIOS MODULE (FULL)\n" >> "$OUTPUT"
for f in app/'(dashboard)'/socios/_components/*.tsx; do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### CORTES MODULE (FULL)\n" >> "$OUTPUT"
for f in app/'(dashboard)'/cortes/_components/*.tsx; do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### API CLIENTS (REFERENCE)\n" >> "$OUTPUT"
for f in lib/api/*.ts; do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n========================================" >> "$OUTPUT"
echo " FASE 5 CONTEXT EXPORT COMPLETED" >> "$OUTPUT"
echo " FILE: $OUTPUT" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo "✅ Frontend Phase 5 execution context export completo: $OUTPUT"