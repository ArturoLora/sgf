#!/bin/bash

output_file="./inventario-context-$(date +%Y%m%d_%H%M%S).txt"

add() {
  if [ -f "$1" ]; then
    echo -e "\n=== $1 ===\n" >> "$output_file"
    cat "$1" >> "$output_file"
  fi
}

echo "INVENTARIO CONTEXT" > "$output_file"

### Prisma
add "prisma/schema.prisma"

### Dashboard base
add "app/(dashboard)/layout.tsx"
add "app/(dashboard)/layout-client.tsx"
add "app/(dashboard)/page.tsx"
add "app/(dashboard)/dashboard-stats.tsx"

### Historial ventas
add "app/(dashboard)/historial-ventas/page.tsx"
add "app/(dashboard)/historial-ventas/historial-ventas-manager.tsx"
add "app/(dashboard)/historial-ventas/historial-filtros.tsx"
add "app/(dashboard)/historial-ventas/historial-lista.tsx"
add "app/(dashboard)/historial-ventas/historial-stats.tsx"

### INVENTARIO FRONTEND
for f in "app/(dashboard)/inventario"/*.tsx; do
  add "$f"
done

### INVENTARIO API
find app/api/inventory -type f | while read f; do
  add "$f"
done

### INVENTARIO SERVICE
add "services/inventory.service.ts"

echo "Export listo: $output_file"
