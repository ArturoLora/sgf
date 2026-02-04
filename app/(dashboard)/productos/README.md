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
├── page.tsx                    # Server Component - composición
├── loading.tsx                 # Loading state con skeleton
├── _components/                # Client components
│   ├── productos-skeleton.tsx
│   ├── productos-manager.tsx   # Orquestación UI & estado
│   ├── productos-stats.tsx     # Server - estadísticas
│   ├── productos-filtros.tsx   # Filtros & búsqueda
│   ├── productos-tabla.tsx     # Tabla responsive
│   ├── crear-producto-modal.tsx
│   ├── editar-producto-modal.tsx
│   ├── detalle-producto-modal.tsx
│   ├── traspaso-modal.tsx
│   ├── ajuste-modal.tsx
│   └── entrada-modal.tsx
└── README.md
```

## Flujo de datos

### Server responsibilities

- `page.tsx`: Composición y fetch vía ProductsService
- `productos-stats.tsx`: Calcula estadísticas (server-side)
- `loading.tsx`: Skeleton durante carga

### Client responsibilities

- `productos-manager.tsx`: Estado, filtros, paginación, modales
- `productos-filtros.tsx`: UI de filtros
- `productos-tabla.tsx`: Renderizado de tabla
- `modals/*`: Operaciones (fetch a APIs)

## Stack técnico

### Formularios

- **react-hook-form**: Manejo de forms
- **@hookform/resolvers/zod**: Validación con Zod
- **Schemas backend**: Importados desde `types/api/products.ts`

Todos los modals usan:

```tsx
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm({
  resolver: zodResolver(SchemaFromBackend),
});
```

### Validación

- NO schemas locales
- NO helpers frontend
- Toda validación de dominio viene desde `types/api/products.ts`
- Schemas disponibles:
  - `CreateProductInputSchema`
  - `UpdateProductInputSchema`
  - `InventoryEntryInputSchema`
  - `InventoryTransferInputSchema`
  - `InventoryAdjustmentInputSchema`

### Dark Mode

- Tokens shadcn exclusivamente
- `bg-background`, `text-foreground`, `text-muted-foreground`
- `border-border`, `bg-muted`, `text-destructive`
- NO colores hardcodeados

### Loading States

- `ProductosSkeleton` para carga inicial
- `Loader2` en modals durante fetch
- Estados disabled en forms durante submit

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
8. **RHF + Zod**: Todos los forms con validación backend
9. **TypeScript estricto**: No `any`, no `!`, no `eslint-disable`
10. **Skeleton loading**: UX mejorada durante carga

## Features

- ✅ Búsqueda en tiempo real
- ✅ Filtros múltiples (estado, ordenamiento)
- ✅ Paginación
- ✅ Alertas de stock bajo
- ✅ CRUD completo con RHF + Zod
- ✅ Operaciones de inventario (traspaso, ajuste, entrada)
- ✅ Vista detallada con historial
- ✅ Distinción membresías/productos físicos
- ✅ Responsive completo
- ✅ Dark mode support
- ✅ Loading states

## Hooks & Performance

- `useMemo` para filtrado/ordenamiento
- `useCallback` para handlers (con deps correctas)
- `useForm` con `zodResolver` para validación
- `useEffect` con deps array completo
- No re-renders innecesarios

## Errores comunes evitados

- ❌ Schemas locales duplicados
- ❌ Validación manual en frontend
- ❌ Colores hardcodeados
- ❌ `any` types
- ❌ Non-null assertions
- ❌ Lógica de dominio en page.tsx
- ❌ Variables no usadas
- ❌ Deps incorrectas en hooks
