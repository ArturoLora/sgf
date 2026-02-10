# Historial de Ventas

Módulo de consulta y análisis del historial de ventas.

## Arquitectura

```
app/(dashboard)/historial-ventas/
├── page.tsx                    # Server component: composición + data fetching
├── loading.tsx                 # Skeleton de carga (Suspense boundary)
├── _components/
│   ├── historial-ventas-manager.tsx  # Container: orquesta flujos
│   ├── historial-filtros.tsx         # Presentacional: formulario de filtros
│   ├── historial-lista.tsx           # Presentacional: lista de tickets
│   ├── historial-stats.tsx           # Presentacional: tarjetas de estadísticas
│   └── historial-skeleton.tsx        # Skeleton loading state
└── README.md

lib/api/
└── sales.client.ts             # API client (fetch only, 1 función = 1 endpoint)
    ├── fetchSalesHistory()     # GET /api/sales/history
    └── fetchTicketDetail()     # GET /api/sales/history/[ticket]

lib/domain/sales/
├── history-filters.ts          # Lógica pura de filtros
│   ├── DEFAULT_HISTORY_FILTERS
│   ├── normalizeDateFilter()
│   ├── hasActiveFilters()
│   └── buildFiltersWithDateRange()
├── history-calculations.ts     # Cálculos puros de estadísticas
│   └── calculateHistorialStats()
├── history-formatting.ts       # Formateo de datos para UI
│   ├── formatDateMX()
│   ├── formatPaymentMethod()
│   └── formatCurrency()
├── history-pagination.ts       # Lógica pura de paginación
│   ├── isValidPage()
│   ├── hasPreviousPage()
│   ├── hasNextPage()
│   └── calculateTotalPages()
├── calculators.ts              # Cálculos POS (subtotal, total)
├── payloads.ts                 # Construcción de payloads POS
├── process.ts                  # Orquestación de ventas POS
├── ticket.ts                   # Generación de tickets
└── index.ts                    # Barrel export

types/api/
└── sales.ts                    # Fuente de verdad: schemas Zod + tipos
```

## Capas y responsabilidades

| Capa       | Archivo                         | Responsabilidad                    |
| ---------- | ------------------------------- | ---------------------------------- |
| Types      | `types/api/sales.ts`            | Schemas Zod + tipos inferidos      |
| API Client | `lib/api/sales.client.ts`       | Fetch puro, 1 función = 1 endpoint |
| Domain     | `lib/domain/sales/*.ts`         | Lógica pura, sin fetch, sin React  |
| Container  | `historial-ventas-manager`      | Orquesta estado + API + domain     |
| UI         | `historial-filtros/lista/stats` | Presentacional puro, sin lógica    |

## Flujo de datos

### 1. Carga inicial

```
page.tsx (Server)
  → getCashiers/Products/Members (DB)
  → HistorialVentasManager (props: options)
    → useEffect → loadSales()
      → fetchSalesHistory() (API)
      → setResponse()
    → HistorialStats (calculateHistorialStats)
    → HistorialFiltros
    → HistorialLista (formatDateMX, formatPaymentMethod)
```

### 2. Aplicar filtros

```
HistorialFiltros
  → react-hook-form (validation)
  → onSubmit → onFilter(filters)
    → Manager: setFilters()
      → useEffect → loadSales(newFilters)
        → fetchSalesHistory()
        → setResponse()
```

### 3. Cambiar página

```
HistorialLista
  → onPageChange(page)
    → Manager: handlePageChange()
      → loadSales(currentFilters, newPage)
        → fetchSalesHistory()
        → setResponse()
```

## Reglas de arquitectura

### API Client (`lib/api/sales.client.ts`)

✅ **HACE:**

- Fetch puro a endpoints
- 1 función = 1 endpoint
- Construir URLSearchParams
- Manejo básico de errores HTTP

❌ **NO HACE:**

- Loops sobre requests
- Lógica de negocio
- Transformaciones de datos
- Cálculos

### Domain Layer (`lib/domain/sales/*.ts`)

✅ **HACE:**

- Funciones puras
- Cálculos de dominio
- Validaciones de negocio
- Transformaciones de datos
- Construcción de payloads

❌ **NO HACE:**

- Fetch
- React hooks
- Acceso a localStorage
- Side effects impuros

### Container (`historial-ventas-manager.tsx`)

✅ **HACE:**

- Orquestar flujos
- Manejar estado local
- Coordinar API + domain
- Gestionar loading/error

❌ **NO HACE:**

- Cálculos de dominio
- Formateo de datos
- Validaciones de negocio
- Renderizar UI directamente

### UI Components

✅ **HACE:**

- Presentación pura
- Eventos a callbacks
- Consumir datos formateados
- Accesibilidad y responsive

❌ **NO HACE:**

- Lógica de negocio
- Cálculos
- Fetch
- Transformaciones

## Separación de responsabilidades

### Formateo

```typescript
// ❌ ANTES: en componente UI
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("es-MX", { ... });
};

// ✅ AHORA: en domain layer
import { formatDateMX } from "@/lib/domain/sales";
```

### Paginación

```typescript
// ❌ ANTES: lógica inline en UI
disabled={currentPage === 1 || loading}

// ✅ AHORA: función pura de dominio
import { hasPreviousPage } from "@/lib/domain/sales";
disabled={!hasPreviousPage(currentPage) || loading}
```

### Cálculos

```typescript
// ❌ ANTES: cálculo directo en UI
const stats = useMemo(
  () => ({
    totalValue: tickets.reduce((sum, t) => sum + Number(t.total), 0),
    // ...
  }),
  [tickets],
);

// ✅ AHORA: función pura importada
import { calculateHistorialStats } from "@/lib/domain/sales";
const stats = useMemo(() => calculateHistorialStats(tickets), [tickets]);
```

## Tipos y validación

### Fuente de verdad

- `types/api/sales.ts` define TODOS los tipos y schemas
- Frontend NO define schemas propios
- Usar `zodResolver` con schemas del backend

### Ejemplo

```typescript
// ✅ CORRECTO: usar schema del backend
import { HistorialVentasFiltersSchema } from "@/types/api/sales";

const { register, handleSubmit } = useForm<HistorialVentasFilters>({
  resolver: zodResolver(HistorialVentasFiltersSchema),
  defaultValues: DEFAULT_HISTORY_FILTERS,
});

// ❌ INCORRECTO: definir schema en frontend
const FormSchema = z.object({ ... });
```

## Reglas de código

1. **Sin `any`**: Siempre usar tipos explícitos
2. **Sin `as`**: No forzar casts, ajustar tipos
3. **Sin `!`**: No usar non-null assertion
4. **Sin duplicación**: Reutilizar funciones de domain
5. **Sin lógica inline**: Extraer a domain layer
6. **Sin side effects**: Mantener funciones puras en domain

## Testing

### Domain layer

```typescript
// Funciones puras = fácil de testear
describe("calculateHistorialStats", () => {
  it("suma totales correctamente", () => {
    const tickets = [
      /* ... */
    ];
    const stats = calculateHistorialStats(tickets);
    expect(stats.totalValue).toBe(1500);
  });
});
```

### Componentes

```typescript
// Componentes presentacionales = fácil de testear
describe("HistorialLista", () => {
  it("renderiza tickets correctamente", () => {
    render(<HistorialLista tickets={mockTickets} />);
    // assertions...
  });
});
```

## Mejoras futuras

- [ ] Implementar virtual scrolling para listas largas
- [ ] Agregar filtros avanzados (rango de montos)
- [ ] Export a CSV/Excel
- [ ] Gráficas de tendencias
- [ ] Cache de búsquedas frecuentes
- [ ] Optimistic updates en cancelaciones
