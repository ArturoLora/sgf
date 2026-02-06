#!/bin/bash

output="./phase3-types-$(date +%Y%m%d_%H%M%S).txt"

echo "### PHASE 3 - DISCRIMINATED DOMAIN TYPES" > $output

folders=(
  "types/api/inventory.ts"
  "types/api/shifts.ts"
  "services/inventory.service.ts"
  "services/shifts.service.ts"
  "app/api/inventory"
  "app/api/shifts"
)

for path in "${folders[@]}"; do
  echo -e "\n\n===== $path =====\n" >> $output

  if [ -f "$path" ]; then
    echo -e "\n--- FILE: $path ---\n" >> $output
    sed 's/\t/  /g' "$path" >> $output
  else
    find "$path" -type f -name "*.ts" | while read file; do
      echo -e "\n--- FILE: $file ---\n" >> $output
      sed 's/\t/  /g' "$file" >> $output
    done
  fi
done

echo "Phase 3 export terminado → $output"
