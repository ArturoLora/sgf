# Módulo Socios

Gestión de membresías y clientes del gimnasio.

## Arquitectura

```
app/(dashboard)/socios/
├── page.tsx                          # Server component: auth + data fetch
├── loading.tsx                       # Skeleton durante carga
└── _components/
    ├── socios-manager.tsx            # Orquestador: estado, modales, filtros
    ├── socios-stats.tsx              # Tarjetas de estadísticas (presentacional)
    ├── socios-filtros.tsx            # Búsqueda y filtros avanzados
    ├── socios-lista.tsx              # Tabla desktop + cards móvil + paginación
    ├── crear-socio-modal.tsx         # Modal crear socio (RHF + Zod)
    ├── editar-socio-modal.tsx        # Modal editar socio (RHF + Zod)
    ├── detalle-socio-modal.tsx       # Modal detalle solo lectura
    ├── renovar-membresia-modal.tsx   # Modal renovar membresía (RHF + Zod)
    └── socios-skeleton.tsx           # Skeleton de carga

lib/api/
└── members.client.ts                # 1 función = 1 endpoint, solo fetch

lib/domain/members/
├── index.ts                         # Barrel export
├── types.ts                         # Tipos de dominio, constantes
├── filters.ts                       # Filtrado y ordenamiento
├── calculations.ts                  # Stats, vigencia, edad, paginación
├── formatters.ts                    # Formateo de fechas y labels
└── payloads.ts                      # Constructores form → request
```

## Flujo de datos

```
page.tsx (server)
  → prisma.member.findMany()
  → SociosManager (client, initialMembers)
    → domain/filters   → filtrado + orden
    → domain/calculations → stats + paginación
    → SociosLista       → domain/formatters
    → Modales           → useForm<z.infer<Schema>>
                        → domain/payloads → request object
                        → api/members.client → fetch
                        → recargarDatos()
```

## Reglas

- **types/api/members.ts** es la fuente de verdad para schemas Zod y tipos
- **useForm** usa `z.infer<typeof Schema>` (nunca Request types directamente)
- **onSubmit** construye el Request type via `domain/payloads`
- **lib/api/members.client.ts** solo hace fetch, retorna `ApiResponse<T>`
- **lib/domain/members/** es lógica pura: sin React, sin fetch
- **Prohibido**: `any`, `as`, `!`, `eslint-disable`, schemas duplicados
