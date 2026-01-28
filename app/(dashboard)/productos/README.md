# Módulo Products

Gestión completa de productos del gimnasio con control de inventario.

## Propósito

- CRUD de productos físicos y membresías
- Gestión de stock (Gym / Bodega)
- Operaciones de inventario (traspasos, ajustes, entradas)
- Alertas de stock bajo
- Vista detallada con historial de movimientos

## Estructura

```
productos/
├── page.tsx                    # Server Component - data fetching
├── productos-manager.tsx       # Client - orquestación UI & estado
├── productos-stats.tsx         # Server - estadísticas
├── productos-filtros.tsx       # Client - filtros & búsqueda
├── productos-tabla.tsx         # Client - tabla responsive
└── modals/                     # Client - modales de operaciones
    ├── crear-producto-modal.tsx
    ├── editar-producto-modal.tsx
    ├── detalle-producto-modal.tsx
    ├── traspaso-modal.tsx
    ├── ajuste-modal.tsx
    └── entrada-modal.tsx
```

## Flujo de datos

### Server responsibilities

- `page.tsx`: Fetches products via ProductsService
- `productos-stats.tsx`: Calcula estadísticas (server-side)

### Client responsibilities

- `productos-manager.tsx`: Estado, filtros, paginación, modales
- `productos-filtros.tsx`: UI de filtros
- `productos-tabla.tsx`: Renderizado de tabla
- `modals/*`: Operaciones (fetch a APIs)

## Patrón responsive

### Desktop (lg+)

- Tabla completa con todas las columnas
- Botones con texto
- 4 cards de stats en grid
- Filtros avanzados en 3 columnas

### Tablet (sm-md)

- Tabla con columnas principales
- Botones compactos
- 2 cards de stats por fila
- Filtros en 2 columnas

### Mobile (<sm)

- Cards apiladas (no tabla)
- Botones icon-only con tooltip
- 2 cards de stats por fila
- Filtros en 1 columna
- Paginación simplificada

## Decisiones importantes

1. **Server/Client split**: Data fetching en Server Component, UI interactiva en Client
2. **No usar `use client` en stats**: Se calcula server-side
3. **Filtros en memoria**: No requiere re-fetch, solo re-render
4. **Paginación client-side**: Dataset pequeño, no justifica server pagination
5. **Modales lazy**: Solo se montan cuando se abren
6. **Dominio en inglés**: Backend usa nombres como `warehouseStock`, `salePrice`
7. **UI en español**: Props como `onClose`, `mensaje`, `productId`

## Features

- ✅ Búsqueda en tiempo real
- ✅ Filtros múltiples (estado, ordenamiento)
- ✅ Paginación
- ✅ Alertas de stock bajo
- ✅ CRUD completo
- ✅ Operaciones de inventario (traspaso, ajuste, entrada)
- ✅ Vista detallada con historial
- ✅ Distinción membresías/productos físicos
- ✅ Responsive completo
