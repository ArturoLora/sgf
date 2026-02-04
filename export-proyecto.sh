#!/bin/bash

output_file="./fe3-productos-$(date +%Y%m%d_%H%M%S).txt"

add_file() {
  if [ -f "$1" ]; then
    echo -e "\n=== $1 ===\n" >> "$output_file"
    cat "$1" >> "$output_file"
  fi
}

echo "FE3 PRODUCTOS FRONTEND EXPORT" > "$output_file"

# Productos frontend
add_file "app/(dashboard)/productos/page.tsx"
add_file "app/(dashboard)/productos/loading.tsx"

find "app/(dashboard)/productos" -type f -name "*.tsx" > /tmp/productos_files.txt

while read file; do
  add_file "$file"
done < /tmp/productos_files.txt

add_file "app/(dashboard)/productos/README.md"

# Backend types
add_file "types/api/products.ts"

# shadcn ui (needed for props + darkmode)
add_file "components/ui/button.tsx"
add_file "components/ui/input.tsx"
add_file "components/ui/select.tsx"
add_file "components/ui/card.tsx"
add_file "components/ui/skeleton.tsx"
add_file "components/ui/badge.tsx"
add_file "components/ui/dialog.tsx"


echo -e "\nDONE" >> "$output_file"

rm /tmp/productos_files.txt

echo "Export generado: $output_file"
