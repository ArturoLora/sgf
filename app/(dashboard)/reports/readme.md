# Módulo Reportes

## Endpoints implementados

| Endpoint                          | Descripción             |
| --------------------------------- | ----------------------- |
| `GET /api/inventory/report/stock` | Reporte de stock actual |

## Arquitectura

```
lib/api/reports.client.ts          → fetch al endpoint real
lib/domain/reports/calculations.ts → cálculos puros
lib/domain/reports/formatters.ts   → formateo y helpers visuales
lib/domain/reports/guards.ts       → type guards
app/(dashboard)/reportes/
  page.tsx                         → composición
  loading.tsx                      → skeleton
  _components/
    reportes-manager.tsx           → orquestación + estado
    reportes-skeleton.tsx          → loading UI
    reportes-stock-stats.tsx       → tarjetas de resumen
    reportes-low-stock.tsx         → tabla de productos con stock bajo
    reportes-stock-tabla.tsx       → tabla completa de stock
```

## Notas

- Solo existe un endpoint de reportes en el backend actual.
- No se construyeron reportes ficticios ni tabs sin API real.
- Si en el futuro se agregan endpoints (ventas, socios, etc.), se extiende `lib/api/reports.client.ts` y se añaden los componentes correspondientes.
