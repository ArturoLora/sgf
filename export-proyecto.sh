#!/bin/bash

OUTPUT="fe-domain-audit-context-$(date +%Y%m%d_%H%M%S).txt"

echo "========================================" > "$OUTPUT"
echo " DOMAIN AUDIT CONTEXT — CONSTITUCIÓN v1.1" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo -e "\n### DOMAIN TREE\n" >> "$OUTPUT"
tree -L 5 lib/domain >> "$OUTPUT"

echo -e "\n\n### DOMAIN FILES (FULL)\n" >> "$OUTPUT"
for f in $(find lib/domain -type f -name "*.ts"); do
  echo -e "\n--- FILE: $f ---\n" >> "$OUTPUT"
  sed -n '1,20000p' "$f" >> "$OUTPUT"
done

echo -e "\n========================================" >> "$OUTPUT"
echo " DOMAIN AUDIT CONTEXT EXPORT COMPLETED" >> "$OUTPUT"
echo " FILE: $OUTPUT" >> "$OUTPUT"
echo "========================================" >> "$OUTPUT"

echo "✅ Domain audit context export completo: $OUTPUT"