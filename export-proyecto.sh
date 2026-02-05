#!/bin/bash

output="./phase2-membership-$(date +%Y%m%d_%H%M%S).txt"

echo "### PHASE 2 - MEMBERSHIP LOGIC CENTRALIZATION" > $output

folders=(
  "services/products.service.ts"
  "services/inventory.service.ts"
  "services/members.service.ts"
  "app/api/sales/products"
  "types"
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

echo "Phase 2 export terminado → $output"
