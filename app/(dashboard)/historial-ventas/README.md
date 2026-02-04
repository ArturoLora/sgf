# Historial de Ventas - Sales History Module

## Descripción

Módulo de administración para visualización y análisis del historial de ventas con filtros avanzados, paginación y estadísticas en tiempo real.

## Estructura de Archivos

```
historial-ventas/
├── page.tsx                                    # Server Component - composición
├── loading.tsx                                 # Loading state
├── _components/
│   ├── historial-ventas-manager.tsx            # Client - orquestación y state
│   ├── historial-stats.tsx                     # Client - tarjetas de estadísticas
│   ├── historial-filtros.tsx                   # Client - formulario de filtros (RHF + Zod)
│   ├── historial-lista.tsx                     # Client - lista de tickets + paginación
│   └── historial-skeleton.tsx                  # Skeleton para loading
└── README.md                                   # Este archivo
```

## Arquitectura

### Server Components

**page.tsx**

- Responsabilidad: Solo composición y fetching de datos estáticos
- Permisos: Verifica admin con `requireAdmin()`
- Data fetching: Cashiers, productos y miembros activos desde DB
- Sin lógica de negocio ni state management

**loading.tsx**

- Importa y renderiza `HistorialSkeleton`
- Muestra loading state durante navegación

### Client Components

**historial-ventas-manager.tsx**

- Orquestador principal del módulo
- State management: filtros, paginación, response API, loading, errores
- API calls: `GET /api/sales/history` con query params
- Coordinación: Pasa datos y callbacks a componentes hijos
- Hooks: `useState`, `useEffect`, `useCallback`

**historial-filtros.tsx**

- Formulario de filtros con **react-hook-form**
- Validación con **@hookform/resolvers/zod**
- Schema: `HistorialVentasFiltersSchema` desde `@/types/api/sales`
- Features:
  - Búsqueda por texto
  - Filtros rápidos (Hoy, 7 días, 30 días)
  - Filtros avanzados colapsables (9+ opciones)
  - Estado responsive (mobile-first)
- No crea schemas locales - usa tipos del backend

**historial-stats.tsx**

- Tarjetas de estadísticas calculadas desde tickets actuales
- Métricas: Total ventas, # tickets, # items, # canceladas
- `useMemo` para optimizar cálculos
- Tipos: `TicketVentaAgrupado[]` desde backend

**historial-lista.tsx**

- Renderizado de tickets con detalles completos
- Paginación responsive
- Indicadores visuales para ventas canceladas
- Formateo de fechas y métodos de pago
- Cards en lugar de tablas (mejor UX móvil)

**historial-skeleton.tsx**

- Skeleton matching real UI structure
- Tarjetas stats, filtros, lista de tickets
- Mejora perceived performance

## Flujo de Datos

```
1. page.tsx (Server)
   ↓ fetches static data
   ↓ cashiers, products, members
   ↓
2. HistorialVentasManager (Client)
   ↓ manages state & API calls
   ↓ GET /api/sales/history?params
   ↓
3. Child Components
   - HistorialStats ← tickets[]
   - HistorialFiltros ← options[], callbacks
   - HistorialLista ← tickets[], pagination
```

## Schemas y Tipos

### Backend Types (Source of Truth)

Todos los tipos vienen de `@/types/api/sales`:

- `HistorialVentasFilters` - Filtros del formulario
- `HistorialVentasResponse` - Response de API
- `TicketVentaAgrupado` - Ticket individual
- `ItemVentaTicket` - Item dentro de ticket
- `CashierOption` - Opciones de cajero
- `ProductOption` - Opciones de producto
- `MemberOption` - Opciones de cliente

### Zod Schemas

- `HistorialVentasFiltersSchema` - Validación de formulario
- Definido en `types/api/sales.ts`
- Usado con `zodResolver` en react-hook-form

**Regla**: NUNCA crear schemas frontend. Siempre extender `types/api/sales.ts`.

## React Hook Form Integration

```typescript
const { register, handleSubmit, setValue, watch, reset } =
  useForm<HistorialVentasFilters>({
    resolver: zodResolver(HistorialVentasFiltersSchema),
    defaultValues: {
      search: "",
      orderBy: "date_desc",
      onlyActive: true,
      // ...
    },
  });
```

### Benefits

- Type-safe form handling
- Automatic validation
- Controlled selects via `setValue`
- Form reset functionality
- No manual onChange handlers

## Dark Mode Support

Todos los componentes usan tokens de shadcn/ui:

- `bg-background` / `text-foreground`
- `text-muted-foreground`
- `border-border`
- `bg-muted`
- `bg-card`
- `bg-destructive` / `text-destructive`

**Eliminado**: Colores hardcodeados como `bg-red-50`, `text-gray-500`, etc.

## API Integration

**Endpoint**: `GET /api/sales/history`

**Query Parameters**:

```typescript
{
  search?: string
  startDate?: string        // ISO date
  endDate?: string          // ISO date
  cashier?: string          // user ID
  product?: string          // product ID
  member?: string           // member ID
  paymentMethod?: string    // CASH | DEBIT_CARD | CREDIT_CARD | TRANSFER
  productType?: string      // todos | membresias | productos
  orderBy?: string          // date | total | ticket
  order?: string            // asc | desc
  onlyActive?: boolean
  page?: number
  perPage?: number
}
```

**Response Type**: `HistorialVentasResponse`

```typescript
{
  tickets: TicketVentaAgrupado[]
  total: number
  page: number
  perPage: number
  totalPages: number
}
```

## Responsive Design

### Breakpoints

- **Mobile (<640px)**: Stacked layout, compact cards
- **Tablet (≥640px)**: 2-column grids, inline actions
- **Desktop (≥1024px)**: 3-4 column grids, expanded layout

### Mobile Optimizations

- Cards over tables
- Icon-only buttons with hidden text
- Stacked filter layout
- Condensed ticket info
- Truncated long text

## Features

### Filtros

- **Búsqueda**: Texto libre en tickets
- **Rápidos**: Hoy, 7 días, 30 días
- **Avanzados**: Fechas, cajero, producto, cliente, pago, tipo, orden
- **Toggle**: Solo activas vs todas

### Paginación

- Server-side (10 items/página)
- Navegación anterior/siguiente
- Indicador de página actual

### Estadísticas

- Calculadas en tiempo real desde resultados
- Total ventas ($)
- # de tickets
- # de items
- # canceladas (rojo)

### Visual Indicators

- Ventas canceladas: fondo destructivo, badge rojo
- Loading states: skeleton realista
- Error display: toast con botón dismiss

## Performance

### Optimizations

- `useMemo` para cálculos stats
- `useCallback` para handlers estables
- Controlled re-renders via props
- Skeleton loading (no spinners)

### Data Fetching

- Server-side filtering y paginación
- Client solo maneja UI state
- No re-fetch innecesarios

## TypeScript Standards

### ✅ Best Practices

- Tipos explícitos desde backend
- No `any` types
- No `!` non-null assertions
- No `as` unsafe casts
- Proper Date handling
- Exhaustive deps en hooks

### ❌ Prohibited

- Schemas frontend duplicados
- Tipos locales Member/Venta
- `eslint-disable`
- Variables no usadas
- Campos inventados no en backend

## Mejoras Futuras

### Short Term

- Export a Excel/PDF
- Modal de detalle de ticket
- Bulk operations

### Long Term

- Filtros guardados (perfiles)
- Date range presets avanzados
- Gráficas de tendencias
- Comparativas período a período

## Dependencies

### Required

- `react-hook-form` - Form management
- `@hookform/resolvers` - Zod integration
- `zod` - Schema validation
- `lucide-react` - Icons
- `@/components/ui/*` - shadcn components

### Backend

- `@/types/api/sales` - Type definitions
- `@/lib/require-role` - Auth
- `@/lib/db` - Prisma client

## Testing Checklist

- [ ] Form validation (required fields)
- [ ] Date range filters
- [ ] Pagination navigation
- [ ] Quick filters (Hoy, 7d, 30d)
- [ ] Clear filters
- [ ] Loading states
- [ ] Error handling
- [ ] Dark mode toggle
- [ ] Mobile responsive
- [ ] Cancelled sales display

## Troubleshooting

### Filters not applying

- Verificar que `onFilter` callback se llame en submit
- Revisar query params en Network tab
- Confirmar API response format

### TypeScript errors

- Asegurar imports desde `@/types/api/sales`
- No crear tipos duplicados
- Verificar Zod schema matches API contract

### Dark mode issues

- Usar solo tokens shadcn (`bg-background`, etc.)
- No usar Tailwind color classes directas
- Verificar className conditionals

## Maintenance Notes

- **Schemas**: Actualizar `types/api/sales.ts` al cambiar API
- **Filtros**: Agregar nuevos campos en Schema + UI
- **Stats**: Extender cálculos en `historial-stats.tsx`
- **Responsive**: Testear en móvil antes de deploy
