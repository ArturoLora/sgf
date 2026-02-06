#!/bin/bash

output="phase4-fix-$(date +%Y%m%d_%H%M%S).txt"

files=(
services/products.service.ts
services/reports.service.ts
"app/(dashboard)/ventas/page.tsx"
services/index.ts
)

echo "PHASE 4 FIX – PRODUCTS EXPORTS" > $output

for f in "${files[@]}"; do
  echo -e "\n\n===== $f =====\n" >> $output
  sed 's/\x1b\[[0-9;]*m//g' "$f" >> $output
done

echo "Exported to $output"
