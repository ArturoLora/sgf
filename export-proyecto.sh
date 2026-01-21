#!/bin/bash
# Export simple del proyecto - Solo código, sin contexto

output_file="./nacho-gym-export-$(date +%Y%m%d_%H%M%S).txt"

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

# Header mínimo
echo "NACHO GYM - Export $(date +%Y%m%d_%H%M%S)" > "$output_file"

# CONFIGURACIÓN
add_section "CONFIGURACIÓN"
add_file_content "package.json"
add_file_content "tsconfig.json"
add_file_content "next.config.ts"
add_file_content "components.json"

# PRISMA
add_section "PRISMA"
add_file_content "prisma/schema.prisma"
add_file_content "prisma/seed.ts"

# AUTH
add_section "AUTENTICACIÓN"
add_file_content "lib/auth.ts"
add_file_content "lib/auth-client.ts"
add_file_content "lib/utils.ts"
add_file_content "lib/db.ts"

# PAGES
add_section "PÁGINAS"
add_file_content "app/layout.tsx"
add_file_content "app/globals.css"
add_file_content "app/login/page.tsx"
add_file_content "app/(dashboard)/layout.tsx"
add_file_content "app/(dashboard)/page.tsx"
add_file_content "app/(dashboard)/ventas/page.tsx"
add_file_content "app/(dashboard)/cortes/page.tsx"

# COMPONENTS
add_section "COMPONENTES"
add_file_content "components/layout/sidebar.tsx"
add_file_content "components/layout/header.tsx"

# UI
add_file_content "components/ui/button.tsx"
add_file_content "components/ui/card.tsx"
add_file_content "components/ui/input.tsx"
add_file_content "components/ui/label.tsx"
add_file_content "components/ui/select.tsx"
add_file_content "components/ui/badge.tsx"

# NUEVOS COMPONENTES FUNCIONALES
add_file_content "components/ventas/pos-form.tsx"
add_file_content "components/cortes/cortes-manager.tsx"

# API ROUTES
add_section "API ROUTES"
add_file_content "app/api/auth/[...all]/route.ts"
add_file_content "app/api/cortes/route.ts"
add_file_content "app/api/cortes/activo/route.ts"
add_file_content "app/api/cortes/cerrar/route.ts"
add_file_content "app/api/inventario/venta/route.ts"
add_file_content "app/api/productos/route.ts"
add_file_content "app/api/socios/route.ts"

# SERVICES
add_section "SERVICES"
add_file_content "services/index.ts"
add_file_content "services/cortes.service.ts"
add_file_content "services/inventario.service.ts"
add_file_content "services/productos.service.ts"
add_file_content "services/socios.service.ts"

echo -e "\n✅ Export: ${output_file} ($(du -h "$output_file" | cut -f1))"
