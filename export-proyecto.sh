#!/bin/bash

output="./phase1-sales-$(date +%Y%m%d_%H%M%S).txt"

echo "### PHASE 1 - SALES DOMAIN EXTRACTION" > $output

folders=(
  "app/api/sales"
  "services"
  "types/api/sales.ts"
)

for dir in "${folders[@]}"; do
  echo -e "\n\n===== $dir =====\n" >> $output

  if [ -f "$dir" ]; then
    echo -e "\n--- FILE: $dir ---\n" >> $output
    sed 's/\t/  /g' "$dir" >> $output
  else
    find "$dir" -type f -name "*.ts" | while read file; do
      echo -e "\n--- FILE: $file ---\n" >> $output
      sed 's/\t/  /g' "$file" >> $output
    done
  fi
done

echo "Phase 1 export terminado → $output"
