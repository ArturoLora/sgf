#!/bin/bash

output="./fe8-theme-$(date +%Y%m%d_%H%M%S).txt"

echo "=== TREE ===" > "$output"
tree "app/(dashboard)" -L 3 >> "$output"

echo "\n=== DASHBOARD LAYOUT / UI ===" >> "$output"
cat "app/(dashboard)/layout.tsx" >> "$output" 2>/dev/null
cat "app/(dashboard)/layout-client.tsx" >> "$output" 2>/dev/null

echo "\n=== HEADER / SIDEBAR ===" >> "$output"
cat components/layout/header.tsx >> "$output" 2>/dev/null
cat components/layout/sidebar.tsx >> "$output" 2>/dev/null

echo "\n=== GLOBALS ===" >> "$output"
cat app/globals.css >> "$output" 2>/dev/null

echo "\n=== TAILWIND CONFIG ===" >> "$output"
cat components.json >> "$output" 2>/dev/null

echo "\n=== DONE ==="
echo "Archivo generado: $output"
