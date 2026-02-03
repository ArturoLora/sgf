#!/bin/bash
# Export FASE 7 - Shifts secondary endpoints cleanup

output_file="./shifts-secondary-phase7-$(date +%Y%m%d_%H%M%S).txt"

add_file_content() {
    local file="$1"
    local label="${2:-$file}"
    if [ -f "$file" ]; then
        echo -e "\n=== ${label} ===\n" >> "$output_file"
        cat "$file" >> "$output_file"
        echo -e "\n" >> "$output_file"
    fi
}

add_section() {
    echo -e "\n\n### ${1} ###\n" >> "$output_file"
}

echo "NACHO GYM - SHIFTS SECONDARY PHASE 7 EXPORT $(date +%Y%m%d_%H%M%S)" > "$output_file"

# ================= SERVICES =================
add_section "SERVICES"
add_file_content "services/shifts.service.ts"
add_file_content "services/utils.ts"

# ================= API SHIFTS SECONDARY =================
add_section "API SHIFTS SECONDARY"

add_file_content "app/api/shifts/close/route.ts"
add_file_content "app/api/shifts/active/route.ts"
add_file_content "app/api/shifts/[id]/summary/route.ts"

# ================= TYPES =================
add_section "TYPES"
add_file_content "types/api/shifts.ts"

echo -e "\n✅ Export generado: ${output_file} ($(du -h "$output_file" | cut -f1))"
