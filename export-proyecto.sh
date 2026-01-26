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

echo "NACHO GYM - Export $(date +%Y%m%d_%H%M%S)" > "$output_file"

# ================= CONFIG =================
add_section "CONFIG"
add_file_content "package.json"
add_file_content "tsconfig.json"
add_file_content "next.config.ts"
add_file_content "components.json"

# ================= PRISMA =================
add_section "PRISMA"
add_file_content "prisma/schema.prisma"
add_file_content "prisma/seed.ts"

# ================= LIB =================
add_section "LIB"
add_file_content "lib/auth.ts"
add_file_content "lib/auth-client.ts"
add_file_content "lib/db.ts"
add_file_content "lib/utils.ts"

# ================= ROOT / LOGIN =================
add_section "ROOT"
add_file_content "app/layout.tsx"
add_file_content "app/globals.css"
add_file_content "app/login/page.tsx"

# ================= DASHBOARD =================
add_section "DASHBOARD"
add_file_content "app/(dashboard)/layout.tsx"
add_file_content "app/(dashboard)/page.tsx"
add_file_content "app/(dashboard)/dashboard-stats.tsx"
add_file_content "app/(dashboard)/corte-alert.tsx"
add_file_content "app/(dashboard)/alertas-dashboard.tsx"

add_file_content "app/(dashboard)/dashboard.container.tsx"

# Cortes
add_file_content "app/(dashboard)/cortes/page.tsx"
add_file_content "app/(dashboard)/cortes/cortes-manager.tsx"
add_file_content "app/(dashboard)/cortes/cortes-filtros.tsx"
add_file_content "app/(dashboard)/cortes/abrir-corte-modal.tsx"
add_file_content "app/(dashboard)/cortes/cerrar-corte-modal.tsx"
add_file_content "app/(dashboard)/cortes/detalle-corte-modal.tsx"

# Inventario
add_file_content "app/(dashboard)/inventario/page.tsx"
add_file_content "app/(dashboard)/inventario/inventario-manager.tsx"
add_file_content "app/(dashboard)/inventario/inventario-filtros.tsx"
add_file_content "app/(dashboard)/inventario/inventario-tabla.tsx"
add_file_content "app/(dashboard)/inventario/kardex-producto.tsx"

# Productos
add_file_content "app/(dashboard)/productos/page.tsx"
add_file_content "app/(dashboard)/productos/productos-manager.tsx"
add_file_content "app/(dashboard)/productos/productos-filtros.tsx"
add_file_content "app/(dashboard)/productos/crear-producto-modal.tsx"
add_file_content "app/(dashboard)/productos/editar-producto-modal.tsx"
add_file_content "app/(dashboard)/productos/detalle-producto-modal.tsx"
add_file_content "app/(dashboard)/productos/entrada-modal.tsx"
add_file_content "app/(dashboard)/productos/ajuste-modal.tsx"
add_file_content "app/(dashboard)/productos/traspaso-modal.tsx"

# Socios
add_file_content "app/(dashboard)/socios/page.tsx"
add_file_content "app/(dashboard)/socios/socios-manager.tsx"
add_file_content "app/(dashboard)/socios/socios-filtros.tsx"
add_file_content "app/(dashboard)/socios/crear-socio-modal.tsx"
add_file_content "app/(dashboard)/socios/editar-socio-modal.tsx"
add_file_content "app/(dashboard)/socios/detalle-socio-modal.tsx"
add_file_content "app/(dashboard)/socios/renovar-membresia-modal.tsx"

# Ventas activas
add_file_content "app/(dashboard)/ventas/page.tsx"
add_file_content "app/(dashboard)/ventas/ventas-form.tsx"

# Historial ventas
add_file_content "app/(dashboard)/historial-ventas/page.tsx"
add_file_content "app/(dashboard)/historial-ventas/historial-ventas-manager.tsx"
add_file_content "app/(dashboard)/historial-ventas/historial-filtros.tsx"
add_file_content "app/(dashboard)/historial-ventas/detalle-venta-modal.tsx"


# ================= COMPONENTS =================
add_section "COMPONENTS"
add_file_content "components/layout/sidebar.tsx"
add_file_content "components/layout/header.tsx"
add_file_content "components/ui/button.tsx"
add_file_content "components/ui/card.tsx"
add_file_content "components/ui/input.tsx"
add_file_content "components/ui/label.tsx"
add_file_content "components/ui/select.tsx"
add_file_content "components/ui/badge.tsx"

# ================= API ROUTES =================
add_section "API ROUTES"

# Auth
add_file_content "app/api/auth/[...all]/route.ts"

# Shifts
add_file_content "app/api/shifts/route.ts"
add_file_content "app/api/shifts/active/route.ts"
add_file_content "app/api/shifts/close/route.ts"
add_file_content "app/api/shifts/[id]/route.ts"
add_file_content "app/api/shifts/[id]/summary/route.ts"

# Inventory
add_file_content "app/api/inventory/sale/route.ts"
add_file_content "app/api/inventory/cancel/route.ts"
add_file_content "app/api/inventory/cancelled/route.ts"
add_file_content "app/api/inventory/entry/route.ts"
add_file_content "app/api/inventory/adjustment/route.ts"
add_file_content "app/api/inventory/transfer/route.ts"
add_file_content "app/api/inventory/movements/route.ts"
add_file_content "app/api/inventory/kardex/[id]/route.ts"
add_file_content "app/api/inventory/report/stock/route.ts"
add_file_content "app/api/inventory/ticket/[ticket]/route.ts"

# Products
add_file_content "app/api/products/route.ts"
add_file_content "app/api/products/[id]/route.ts"

# Members
add_file_content "app/api/members/route.ts"
add_file_content "app/api/members/[id]/route.ts"
add_file_content "app/api/members/[id]/validity/route.ts"
add_file_content "app/api/members/renew/route.ts"
add_file_content "app/api/members/expired/route.ts"

# Sales
add_file_content "app/api/sales/history/route.ts"
add_file_content "app/api/sales/products/route.ts"
add_file_content "app/api/sales/ticket/[ticket]/route.ts"

# ================= SERVICES =================
add_section "SERVICES"
add_file_content "services/index.ts"
add_file_content "services/shifts.service.ts"
add_file_content "services/members.service.ts"
add_file_content "services/products.service.ts"
add_file_content "services/inventory.service.ts"
add_file_content "services/reports.service.ts"
add_file_content "services/users.service.ts"
add_file_content "services/utils.ts"

# ================= TYPES =================
add_section "TYPES"
add_file_content "types/validator.ts"
add_file_content "types/routes.d.ts"

echo -e "\n✅ Export generado: ${output_file} ($(du -h "$output_file" | cut -f1))"
