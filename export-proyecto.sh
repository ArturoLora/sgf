#!/bin/bash

output_file="./dashboard-polish-$(date +%Y%m%d_%H%M%S).txt"

add() {
  if [ -f "$1" ]; then
    echo -e "\n=== $1 ===\n" >> "$output_file"
    cat "$1" >> "$output_file"
  fi
}

echo "DASHBOARD POLISH CONTEXT" > "$output_file"

# Layout base
add "app/(dashboard)/layout.tsx"
add "app/(dashboard)/layout-client.tsx"
add "components/layout/sidebar.tsx"
add "components/layout/header.tsx"

# Dashboard main
add "app/(dashboard)/page.tsx"
add "app/(dashboard)/dashboard-stats.tsx"
add "app/(dashboard)/alertas-dashboard.tsx"
add "app/(dashboard)/corte-alert.tsx"
add "app/(dashboard)/dashboard.container.tsx"

echo "Export listo: $output_file"
