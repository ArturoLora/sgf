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

# LIB
add_section "LIB"
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
add_file_content "app/(dashboard)/dashboard-stats.tsx"
add_file_content "app/(dashboard)/corte-alert.tsx"
add_file_content "app/(dashboard)/alertas-dashboard.tsx"
add_file_content "app/(dashboard)/ventas/page.tsx"
add_file_content "app/(dashboard)/ventas/ventas-form.tsx"
add_file_content "app/(dashboard)/ventas/historial/page.tsx"
add_file_content "app/(dashboard)/ventas/historial/historial-ventas-manager.tsx"
add_file_content "app/(dashboard)/ventas/historial/historial-filtros.tsx"
add_file_content "app/(dashboard)/ventas/historial/detalle-venta-modal.tsx"
add_file_content "app/(dashboard)/cortes/page.tsx"
add_file_content "app/(dashboard)/cortes/cortes-manager.tsx"
add_file_content "app/(dashboard)/cortes/cortes-filtros.tsx"
add_file_content "app/(dashboard)/cortes/abrir-corte-modal.tsx"
add_file_content "app/(dashboard)/cortes/cerrar-corte-modal.tsx"
add_file_content "app/(dashboard)/cortes/detalle-corte-modal.tsx"
add_file_content "app/(dashboard)/socios/page.tsx"
add_file_content "app/(dashboard)/socios/socios-manager.tsx"
add_file_content "app/(dashboard)/socios/socios-filtros.tsx"
add_file_content "app/(dashboard)/socios/crear-socio-modal.tsx"
add_file_content "app/(dashboard)/socios/editar-socio-modal.tsx"
add_file_content "app/(dashboard)/socios/detalle-socio-modal.tsx"
add_file_content "app/(dashboard)/socios/renovar-membresia-modal.tsx"

# COMPONENTS
add_section "COMPONENTES"
add_file_content "components/layout/sidebar.tsx"
add_file_content "components/layout/header.tsx"
add_file_content "components/ui/button.tsx"
add_file_content "components/ui/card.tsx"
add_file_content "components/ui/input.tsx"
add_file_content "components/ui/label.tsx"
add_file_content "components/ui/select.tsx"
add_file_content "components/ui/badge.tsx"

# API ROUTES
add_section "API ROUTES"
add_file_content "app/api/auth/[...all]/route.ts"
add_file_content "app/api/cortes/route.ts"
add_file_content "app/api/cortes/activo/route.ts"
add_file_content "app/api/cortes/cerrar/route.ts"
add_file_content "app/api/cortes/[id]/route.ts"
add_file_content "app/api/cortes/[id]/resumen/route.ts"
add_file_content "app/api/inventario/venta/route.ts"
add_file_content "app/api/inventario/entrada/route.ts"
add_file_content "app/api/inventario/ajuste/route.ts"
add_file_content "app/api/inventario/traspaso/route.ts"
add_file_content "app/api/inventario/movimientos/route.ts"
add_file_content "app/api/inventario/reporte/stock/route.ts"
add_file_content "app/api/productos/route.ts"
add_file_content "app/api/productos/[id]/route.ts"
add_file_content "app/api/ventas/productos/route.ts"
add_file_content "app/api/ventas/historial/route.ts"
add_file_content "app/api/ventas/ticket/[ticket]/route.ts"
add_file_content "app/api/socios/route.ts"
add_file_content "app/api/socios/[id]/route.ts"
add_file_content "app/api/socios/renovar/route.ts"
add_file_content "app/api/socios/vencidos/route.ts"

# SERVICES
add_section "SERVICES"
add_file_content "services/index.ts"
add_file_content "services/cortes.service.ts"
add_file_content "services/inventario.service.ts"
add_file_content "services/productos.service.ts"
add_file_content "services/socios.service.ts"
add_file_content "services/reportes.service.ts"
add_file_content "services/usuarios.service.ts"
add_file_content "services/utils.ts"

# TYPES
add_section "TYPES"
add_file_content "types/validator.ts"
add_file_content "types/routes.d.ts"

echo -e "\n✅ Export: ${output_file} ($(du -h "$output_file" | cut -f1))"