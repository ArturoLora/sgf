# Módulo de Cortes (Shifts)

## Propósito

Gestión de turnos de caja con apertura, cierre y arqueo. Permite registrar ventas durante el turno y cerrar con balance detallado.

## Estructura

```
cortes/
├── page.tsx                    # Server Component - auth y data fetching
├── loading.tsx                 # Skeleton de carga
├── _components/
│   ├── cortes-skeleton.tsx     # Skeleton component
│   ├── cortes-manager.tsx      # Orquestación principal
│   ├── cortes-filtros.tsx      # Filtros de búsqueda
│   ├── cortes-lista.tsx        # Tabla de cortes
│   ├── abrir-corte-modal.tsx   # Modal apertura (RHF + Zod)
│   ├── cerrar-corte-modal.tsx  # Modal cierre con arqueo (RHF + Zod)
│   └── detalle-corte-modal.tsx # Vista detallada
└── README.md
```

## Validación de Datos

### Schemas del Backend (Fuente de Verdad)

Todos los payloads se validan usando schemas de `@/types/api/shifts`:

```typescript
import { OpenShiftSchema, CloseShiftSchema } from "@/types/api/shifts";
```

**Regla**: NO crear schemas locales para dominio. Reutilizar del backend.

### Formularios con React Hook Form

Todos los formularios usan:

- `react-hook-form` para estado
- `zodResolver` para validación
- Backend schemas para payloads

Ejemplo:

```typescript
const { register, handleSubmit } = useForm<OpenShiftInput>({
  resolver: zodResolver(OpenShiftSchema),
});

const onSubmit = async (data: OpenShiftInput) => {
  const validated = OpenShiftSchema.parse(data);
  await fetch("/api/shifts", { body: JSON.stringify(validated) });
};
```

## Dark Mode

Todos los componentes usan tokens shadcn:

- `bg-background` / `bg-card` / `bg-muted`
- `text-foreground` / `text-muted-foreground`
- `border-border`
- `text-destructive` (no `text-red-600`)

## Flujo de Datos

### Server (page.tsx)

- Verifica autenticación
- Carga lista de cajeros
- Pasa datos a manager

### Client (cortes-manager.tsx)

- Maneja estado (filtros, paginación, modales)
- Coordina comunicación con API
- Orquesta componentes hijos

### Presentational (cortes-lista.tsx)

- Muestra tabla de cortes
- Delega acciones al manager

## Endpoints API

```
GET  /api/shifts              # Lista de cortes con filtros
GET  /api/shifts/active       # Corte activo del usuario
POST /api/shifts              # Abrir nuevo corte
POST /api/shifts/close        # Cerrar corte actual
GET  /api/shifts/[id]         # Detalle de un corte
GET  /api/shifts/[id]/summary # Resumen completo
```

## Flujo de Usuario

### Apertura de Corte

1. Click en "Abrir Corte"
2. Modal solicita fondo inicial
3. Valida con `OpenShiftSchema`
4. Crea registro de Shift en DB
5. Actualiza estado, corte ahora "activo"

### Cierre de Corte

1. Click en "Cerrar Corte"
2. Sistema calcula totales esperados
3. Modal muestra arqueo (efectivo, tarjetas, retiros)
4. Usuario confirma o ajusta montos
5. Valida con `CloseShiftSchema`
6. Sistema cierra Shift y calcula diferencia

### Consulta Histórica

1. Filtros por fecha, cajero, folio
2. Paginación (10 items por página)
3. Vista detallada al hacer clic

## Consideraciones Técnicas

- Cortes activos impiden abrir nuevos
- Solo admins pueden cerrar cortes ajenos
- Diferencias se marcan visualmente
- Validación de montos positivos
- Skeleton real durante carga

## Schemas de Referencia

```typescript
// Backend schemas (FUENTE DE VERDAD)
OpenShiftSchema; // POST /api/shifts
CloseShiftSchema; // POST /api/shifts/close

// Ubicados en:
// @/types/api/shifts
```
