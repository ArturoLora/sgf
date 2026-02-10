#!/usr/bin/env bash

set -e

OUTPUT="fe-review-$(date +%Y%m%d_%H%M%S).txt"
ROOT="$(pwd)"

echo "📦 Exportando proyecto para revisión" > "$OUTPUT"
echo "Ruta: $ROOT" >> "$OUTPUT"
echo "Fecha: $(date)" >> "$OUTPUT"
echo "----------------------------------------" >> "$OUTPUT"

print_file () {
  local file="$1"
  echo "" >> "$OUTPUT"
  echo "===== $file =====" >> "$OUTPUT"
  sed -n '1,20000p' "$file" >> "$OUTPUT"
}

# ---------- INVENTARIO ----------
echo "" >> "$OUTPUT"
echo "########## INVENTARIO ##########" >> "$OUTPUT"

find "app/(dashboard)/inventario" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.md" \) | sort | while read -r f; do
  print_file "$f"
done

# ---------- CORTES ----------
echo "" >> "$OUTPUT"
echo "########## CORTES ##########" >> "$OUTPUT"

find "app/(dashboard)/cortes" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.md" \) | sort | while read -r f; do
  print_file "$f"
done

# ---------- HISTORIAL VENTAS ----------
echo "" >> "$OUTPUT"
echo "########## HISTORIAL VENTAS ##########" >> "$OUTPUT"

find "app/(dashboard)/historial-ventas" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.md" \) | sort | while read -r f; do
  print_file "$f"
done

# ---------- DOMAIN ----------
echo "" >> "$OUTPUT"
echo "########## DOMAIN ##########" >> "$OUTPUT"

find "lib/domain" -type f -name "*.ts" | sort | while read -r f; do
  print_file "$f"
done

# ---------- API CLIENTS ----------
echo "" >> "$OUTPUT"
echo "########## API CLIENTS ##########" >> "$OUTPUT"

find "lib/api" -type f -name "*.ts" | sort | while read -r f; do
  print_file "$f"
done

echo "" >> "$OUTPUT"
echo "✅ Export finalizado" >> "$OUTPUT"

echo "Archivo generado:"
echo "$OUTPUT"
