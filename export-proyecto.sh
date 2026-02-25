#!/bin/bash

OUTPUT="fe-phase4-execution-context-$(date +%Y%m%d_%H%M%S).txt"

echo "========================================" > "$OUTPUT"
echo " FRONTEND — FASE 4: EXECUTION CONTEXT" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo -e "\n### DASHBOARD TREE\n" >> "$OUTPUT"
tree -L 4 app/'(dashboard)' >> "$OUTPUT"

echo -e "\n\n### SERVER PAGES (page.tsx)\n" >> "$OUTPUT"
for f in $(find app/'(dashboard)' -name "page.tsx"); do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n\n### MANAGERS / CONTAINERS\n" >> "$OUTPUT"
grep -R -i "manager\|container" app/'(dashboard)' \
  --include="*.tsx" -n >> "$OUTPUT"

echo -e "\n\n### CLIENT FETCHES (ANTI-PATTERN)\n" >> "$OUTPUT"
grep -R "fetch(" app/'(dashboard)' \
  --include="*.tsx" -n >> "$OUTPUT"

echo -e "\n\n### MODALS (CHECK FETCH & DATA FLOW)\n" >> "$OUTPUT"
grep -R "modal" app/'(dashboard)' \
  --include="*.tsx" -n >> "$OUTPUT"

echo -e "\n\n### API CLIENT USAGE\n" >> "$OUTPUT"
grep -R "@/lib/api" app/'(dashboard)' \
  --include="*.tsx" -n >> "$OUTPUT"

echo -e "\n========================================" >> "$OUTPUT"
echo " FRONTEND EXECUTION CONTEXT COMPLETED" >> "$OUTPUT"
echo " FILE: $OUTPUT" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo "✅ Frontend Phase 4 execution context export completo: $OUTPUT"