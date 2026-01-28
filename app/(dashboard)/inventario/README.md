# Módulo Inventario

## Propósito

Control de existencias físicas de productos del gimnasio (excluyendo membresías). Permite visualizar stocks en tiempo real, consultar kardex de movimientos por producto, y revisar el estado general del inventario.

## Estructura

```
inventario/
├── page.tsx                    # Server Component - data fetching inicial
├── inventario-manager.tsx      # Client Island - orquestación UI
├── inventario-filtros.tsx      # Client Component - filtros interactivos
├── inventario-tabla.tsx        # Client Component - tabla responsive
├── inventario-stats.tsx        # Client Component - estadísticas visuales
├── kardex/
│   ├── [id]/
│   │   └── page.tsx           # Server Component - kardex por producto
│   └── kardex-lista.tsx       # Client Component - lista de movimientos
└── README.md
```

## Flujo de Datos

### Inventario Principal

1. **Server (`page.tsx`)**: Obtiene productos físicos de DB
2. **Client (`inventario-manager.tsx`)**: Aplica filtros locales, paginación, ordenamiento
3. **Client (`inventario-tabla.tsx`)**: Renderiza tabla responsive
4. **Navegación**: Link a `/inventario/kardex/[id]` para ver detalle

### Kardex de Producto

1. **Server (`kardex/[id]/page.tsx`)**: Obtiene producto + movimientos de DB
2. **Client (`kardex-lista.tsx`)**: Renderiza historial responsive

## Server vs Client Responsibilities

### Server Components

- `page.tsx`: Fetch inicial de productos vía `ProductosService`
- `kardex/[id]/page.tsx`: Fetch de producto + movimientos vía API

### Client Components

- `inventario-manager.tsx`: Estado de filtros, paginación, cálculo de stats
- `inventario-filtros.tsx`: Inputs interactivos, quick filters
- `inventario-tabla.tsx`: Render de filas, badges de estado, botones de acción
- `inventario-stats.tsx`: Cards de métricas calculadas
- `kardex-lista.tsx`: Timeline de movimientos con badges

## Decisiones Importantes

### 1. Separación Productos Físicos vs Membresías

Los productos de membresía (EFECTIVO, VISITA, MENSUALIDAD, etc.) se excluyen del inventario ya que:

- No tienen stock físico
- No requieren control de existencias
- Se manejan desde el módulo Ventas/Socios

### 2. Cálculo de Estadísticas en Cliente

Stats se calculan en `inventario-manager.tsx` porque:

- Dependen de filtros locales
- No requieren re-fetch al servidor
- Datos ya están cargados

### 3. Kardex como Ruta Separada

`/inventario/kardex/[id]` en lugar de modal porque:

- Permite compartir URLs de kardex específico
- Mejor manejo de historial de navegación
- Server Component puede fetchear datos frescos

### 4. Filtros sin Debounce

Búsqueda y filtros aplican inmediatamente porque:

- Dataset es pequeño (<100 productos)
- Filtrado en memoria es instantáneo
- Mejor UX sin delay artificial

## Patrón Responsive

### Mobile (< 640px)

- Stats: Grid 2x2
- Filtros: Stack vertical, botones full-width
- Tabla: Cards verticales con info condensada
- Paginación: Botones sin texto, iconos centrados

### Tablet (640px - 1024px)

- Stats: Grid 2x2 o 4x1
- Filtros: Grid 2 columnas
- Tabla: Tabla completa con scroll horizontal
- Paginación: Botones con texto

### Desktop (> 1024px)

- Stats: Grid 4x1
- Filtros: Grid 3-4 columnas
- Tabla: Tabla completa sin scroll
- Paginación: Full con números de página

## Contratos API Usados

- `ProductosService.getAllProductos()` - Obtiene todos los productos
- `GET /api/inventory/kardex/[id]` - Movimientos de un producto
- `GET /api/products/[id]` - Detalle de un producto

## UX vs Dominio (Naming)

### UX (Español)

- Componentes: `InventarioManager`, `InventarioFiltros`
- Props: `onVerKardex`, `productos`, `stockBajo`
- Carpetas: `inventario/`, `kardex/`
- UI Text: "Stock Bajo", "Ver Kardex", "Existencias"

### Dominio (Inglés)

- Models: `Product`, `InventoryMovement`
- Services: `ProductosService`, `InventoryService`
- API: `/api/inventory/*`, `/api/products/*`
- Props de datos: `productId`, `warehouseStock`, `gymStock`
- Enums: `Location.WAREHOUSE`, `InventoryType.SALE`

## Notas de Implementación

- **Sin `useEffect` para filtros**: Cambios aplican en render
- **Paginación local**: No requiere server-side pagination
- **Badges dinámicos**: Color según stock vs mínimo
- **Navegación**: `useRouter()` para kardex, `<Link>` en botones
- **Serialización**: `serializeDecimal()` en API responses (Prisma Decimal)
