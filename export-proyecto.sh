#!/bin/bash
# Export Ventas Frontend - Simple Artifact Mode

output_file="./fe-ventas-simple-$(date +%Y%m%d_%H%M%S).txt"

echo "=== FE VENTAS SIMPLE EXPORT ===" > "$output_file"
echo "Generated at: $(date)" >> "$output_file"
echo "" >> "$output_file"

add_file() {
  local file="$1"
  echo "" >> "$output_file"
  echo "===== FILE: $file =====" >> "$output_file"
  sed 's/\t/  /g' "$file" >> "$output_file"
}

scan_dir() {
  local dir="$1"
  if [ -d "$dir" ]; then
    find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" \) | sort | while read -r f; do
      add_file "$f"
    done
  fi
}

# Ventas frontend
scan_dir "./app/(dashboard)/ventas"

# Lib (auth, utils, etc)
scan_dir "./lib"

# Types completos (api + models)
scan_dir "./types"

# UI components usados
scan_dir "./components/ui"

echo ""
echo "Export terminado:"
echo "$output_file"
