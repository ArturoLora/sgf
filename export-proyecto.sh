#!/bin/bash

output="./api-routes-export-$(date +%Y%m%d_%H%M%S).txt"

FILES=(
  "app/api/inventory/sale/route.ts"
  "app/api/inventory/entry/route.ts"
  "app/api/inventory/adjustment/route.ts"
  "app/api/inventory/transfer/route.ts"
  "app/api/members/route.ts"
  "app/api/members/renew/route.ts"
  "app/api/shifts/route.ts"
)

echo "### API ROUTES EXPORT ###" > "$output"
echo "" >> "$output"

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "===== $file =====" >> "$output"
    cat "$file" >> "$output"
    echo -e "\n\n" >> "$output"
  else
    echo "MISSING: $file" >> "$output"
  fi
done

echo "Export listo: $output"
