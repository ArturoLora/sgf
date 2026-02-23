#!/bin/bash

OUTPUT="be-phase3-api-execution-context-$(date +%Y%m%d_%H%M%S).txt"

echo "========================================" > "$OUTPUT"
echo " BACKEND — FASE 3: API EXECUTION CONTEXT" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo -e "\n### API ROUTES — FULL CONTENT\n" >> "$OUTPUT"

# Exportar TODAS las routes completas
while IFS= read -r f; do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done < <(find app/api -name "route.ts" | sort)

echo -e "\n\n========================================" >> "$OUTPUT"
echo " SERVICES — REFERENCE (READ ONLY)" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

# Exportar services solo como referencia (NO para modificar)
while IFS= read -r f; do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done < <(find services -name "*.ts" | sort)

echo -e "\n\n========================================" >> "$OUTPUT"
echo " DOMAIN — REFERENCE (READ ONLY)" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

# Exportar domain como referencia arquitectónica
while IFS= read -r f; do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done < <(find lib/domain -name "*.ts" | sort)

echo -e "\n========================================" >> "$OUTPUT"
echo " API EXECUTION CONTEXT COMPLETED" >> "$OUTPUT"
echo " FILE: $OUTPUT" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo "✅ Backend Phase 3 execution context export completo: $OUTPUT"
