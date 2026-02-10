# Módulo de Inventario

Sistema de gestión de inventario con control de stock, movimientos y kardex.

## Arquitectura

Sigue el patrón de arquitectura limpia establecido en el proyecto:

```
app/(dashboard)/inventario/
├── _components/              # Componentes UI (solo presentación)
│   ├── inventario-filtros.tsx
│   ├── inventario-manager.tsx    # Coordinador principal
│   ├── inventario-skeleton.tsx
│   ├── inventario-stats.tsx
│   └── inventario-tabla.tsx
├── kardex/
│   ├── _components/
│   │   ├── kardex-lista.tsx
│   │   └── kardex-skeleton.tsx
│   └── [id]/
│       ├── loading.tsx
│       └── page.tsx
├── loading.tsx
├── page.tsx                  # Solo composición
└── README.md

lib/
├── api/
│   └── inventory.client.ts  # API client (solo fetch)
└── domain/
    └── inventory/
        ├── calculations.ts   # Lógica de cálculos
        ├── filters.ts        # Lógica de filtros
        ├── pagination.ts     # Lógica de paginación
        ├── formatters.ts     # Formateo de datos
        └── index.ts
```

## Responsabilidades por Capa

### API Client (`lib/api/inventory.client.ts`)

- Solo `fetch`
- Sin lógica de negocio
- Sin loops
- 1 función = 1 endpoint

### Domain Layer (`lib/domain/inventory/`)

- Funciones puras
- Sin React
- Sin fetch
- Sin side effects

**calculations.ts**

- `calcularStatsInventario()`: Stats del dashboard
- `calcularStockTotal()`: Stock total de un producto
- `calcularValorProducto()`: Valor en dinero de un producto
- `calcularBalance()`: Balance del kardex

**filters.ts**

- `filtrarPorBusqueda()`: Filtro por texto
- `filtrarPorEstado()`: Filtro por estado de stock
- `ordenarProductos()`: Ordenamiento
- `aplicarFiltros()`: Aplicar todos los filtros

**pagination.ts**

- `calcularPaginacion()`: Info de paginación
- `obtenerPaginasVisibles()`: Números de página visibles
- `paginar()`: Obtener items de la página actual

**formatters.ts**

- `formatearEstadoStock()`: Badge de estado
- `formatearPrecio()`: Formato de precio
- `formatearValor()`: Formato de valor total
- `esProductoFisico()`: Detectar productos físicos
- `filtrarProductosFisicos()`: Filtrar membresías

### UI Components

- Solo presentación
- Sin cálculos
- Sin fetch
- Sin lógica de negocio

### Managers

- Orquestan flujo
- Coordinan state
- Delegan a domain layer
- No calculan
- No formatean

## Flujo de Datos

```
ProductsService.getAllProducts()
    ↓
filtrarProductosFisicos()  (domain/formatters)
    ↓
InventarioManager (coordina)
    ↓
aplicarFiltros()  (domain/filters)
    ↓
calcularPaginacion()  (domain/pagination)
    ↓
calcularStatsInventario()  (domain/calculations)
    ↓
InventarioTabla (presenta)
```

## Características

### Dashboard Principal

- Lista de productos con stock
- Filtros por búsqueda, ubicación, estado
- Ordenamiento configurable
- Paginación
- Stats: total productos, stock bajo, sin stock, valor total

### Kardex

- Historial completo de movimientos por producto
- Balance acumulado
- Detalle de ventas, entradas, traspasos y ajustes
- Información de usuario y fecha

### Responsividad

- Vista desktop con tabla completa
- Vista mobile con cards
- Adaptación de paginación por viewport

## Tipos

Los tipos son la fuente de verdad del backend:

- `types/api/inventory.ts`: Schemas Zod + tipos inferidos
- Domain layer usa estos tipos
- No se duplican tipos

## Testing

Para probar el módulo:

```bash
# Build
npm run build

# Desarrollo
npm run dev
```

Verificar:

- ✅ Sin errores de TypeScript
- ✅ Sin `any`, `as`, `!`
- ✅ Domain layer es puro
- ✅ API client solo hace fetch
- ✅ UI solo presenta
- ✅ Manager solo coordina

## Ejemplo de Uso

```typescript
// ❌ INCORRECTO - lógica en UI
function ProductRow({ producto }) {
  const total = producto.gymStock + producto.warehouseStock;
  const valor = producto.salePrice * total;
  // ...
}

// ✅ CORRECTO - delegar a domain
import {
  calcularStockTotal,
  calcularValorProducto,
} from "@/lib/domain/inventory";

function ProductRow({ producto }) {
  const total = calcularStockTotal(producto);
  const valor = calcularValorProducto(producto);
  // ...
}
```

## Convenciones

- Funciones domain en español
- Props componentes en español
- Tipos backend en inglés (source of truth)
- Sin console.log en producción
- Sin comentarios obvios
