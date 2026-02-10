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

## Reglas

- `types/api/sales.ts` es la **única fuente de verdad** para tipos
- API client: solo `fetch`, sin loops, sin lógica de negocio
- Domain: funciones puras, sin `fetch`, sin React, sin UI
- Container: orquesta flujos, **no calcula dominio** directamente
- UI: presentacional puro, **sin lógica de negocio ni cálculos**
- Formularios: `react-hook-form` + `zodResolver` con schemas del backend
- Sin `any`, sin casts forzados (`as`), sin non-null assertions (`!`)
