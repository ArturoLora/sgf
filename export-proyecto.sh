#!/bin/bash

OUTPUT="fe-reports-refactor-$(date +%Y%m%d_%H%M%S).txt"

echo "### PROJECT TREE (dashboard + domain + api)" > "$OUTPUT"

tree -L 4 \
  app/'(dashboard)' \
  lib/domain \
  lib/api \
  types/api \
  services \
  -I "node_modules|.next|dist|build|generated" >> "$OUTPUT"

echo -e "\n\n### API REPORT ENDPOINTS\n" >> "$OUTPUT"
grep -R "report" app/api -n --include="route.ts" >> "$OUTPUT"

echo -e "\n\n### BACKEND REPORT SERVICES\n" >> "$OUTPUT"
grep -R "report" services -n --include="*.ts" >> "$OUTPUT"

echo -e "\n\n### REPORT TYPES (SOURCE OF TRUTH)\n" >> "$OUTPUT"
sed -n '1,20000p' types/api/reports.ts >> "$OUTPUT"

echo "✅ Export REPORTS completo: $OUTPUT"
