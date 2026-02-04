#!/bin/bash
# FE2 - Cortes frontend + backend schemas export

output_file="./fe2-cortes-$(date +%Y%m%d_%H%M%S).txt"

add_file_content() {
  local file="$1"
  if [ -f "$file" ]; then
    echo -e "\n=== ${file} ===\n" >> "$output_file"
    cat "$file" >> "$output_file"
    echo -e "\n" >> "$output_file"
  fi
}

echo "NACHO GYM - FE2 CORTES EXPORT $(date +%Y%m%d_%H%M%S)" > "$output_file"

# ================= FRONTEND CORTES =================

for f in app/\(dashboard\)/cortes/*.tsx; do
  add_file_content "$f"
done

if [ -d "app/(dashboard)/cortes/modals" ]; then
  for f in app/\(dashboard\)/cortes/modals/*.tsx; do
    add_file_content "$f"
  done
fi

add_file_content "app/(dashboard)/cortes/README.md"

# ================= BACKEND SCHEMAS =================

add_file_content "types/api/shifts.ts"

echo -e "\n✅ Export generado: ${output_file} ($(du -h "$output_file" | cut -f1))"
