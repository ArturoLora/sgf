# Módulo de Cortes (Shifts)

## Propósito

Gestión de turnos de caja con apertura, cierre y arqueo. Permite registrar ventas durante el turno y cerrar con balance detallado.

## Arquitectura

Este módulo sigue el patrón de **Arquitectura Limpia** con separación estricta de responsabilidades:

```
lib/
├── api/
│   └── shifts.client.ts          # Capa de acceso a datos (fetch puro)
└── domain/
    └── shifts/
        ├── shift-operations.ts    # Orquestación de flujos
        ├── shift-calculations.ts  # Cálculos de negocio
        ├── shift-formatters.ts    # Formateadores
        └── index.ts              # Barrel export

app/(dashboard)/cortes/
├── page.tsx                       # Server Component (composición)
├── loading.tsx                    # Skeleton loader
└── _components/
    ├── cortes-skeleton.tsx        # Skeleton component
    ├── cortes-manager.tsx         # Container (orquestación UI)
    ├── cortes-filtros.tsx         # Filtros (presentación)
    ├── cortes-lista.tsx           # Lista (presentación)
    ├── abrir-corte-modal.tsx      # Modal abrir (UI + form)
    ├── cerrar-corte-modal.tsx     # Modal cerrar (UI + form)
    └── detalle-corte-modal.tsx    # Modal detalle (UI)
```

## Capas de Responsabilidad

### 1. API Client (`lib/api/shifts.client.ts`)

**Responsabilidad**: Comunicación HTTP con el backend

- Un fetch = una operación
- Sin lógica de negocio
- Sin orquestación
- Solo tipos desde `@/types/api/shifts`

```typescript
export async function fetchAbrirCorte(
  data: OpenShiftInput,
): Promise<CorteResponse>;
export async function fetchCerrarCorte(
  data: CloseShiftInput,
): Promise<CorteResponse>;
export async function fetchCortes(
  params?: BuscarCortesQuery,
): Promise<ListaCortesResponse>;
```

### 2. Domain Layer (`lib/domain/shifts/`)

**Responsabilidad**: Lógica de negocio y orquestación

#### shift-operations.ts

Orquestación de flujos de negocio:

- `abrirCorte()` - Flujo de apertura
- `cerrarCorte()` - Flujo de cierre
- `cargarCortes()` - Consulta con filtros
- `verificarCorteActivo()` - Estado actual
- `cargarDetalleCorte()` - Detalle completo
- `cargarResumenCorte()` - Resumen para arqueo

#### shift-calculations.ts

Cálculos puros de dominio:

- `calcularDiferencia()` - Diferencia entre real y esperado
- `calcularEfectivoEsperado()` - Efectivo esperado en caja
- `tieneDiferenciaSignificativa()` - Validación de diferencia
- `tipoDiferencia()` - Clasificación (sobrante/faltante)

#### shift-formatters.ts

Formateo de datos:

- `formatearFechaCorte()` - Fecha corta
- `formatearFechaLarga()` - Fecha extendida
- `formatearMontoCorte()` - Formato moneda

### 3. UI Layer

#### Container: `cortes-manager.tsx`

**Responsabilidad**: Orquestación de UI y estado

- Maneja estado global del módulo
- Coordina comunicación con domain layer
- Gestiona modales y navegación
- Propaga datos a componentes presentacionales
- **NO tiene lógica de negocio**
- **NO hace fetch directo**

#### Presentación: `cortes-filtros.tsx`, `cortes-lista.tsx`

**Responsabilidad**: Solo presentación

- Reciben datos por props
- Emiten eventos hacia el container
- Sin estado de negocio
- Sin llamadas a APIs

#### Modales: `abrir-corte-modal.tsx`, `cerrar-corte-modal.tsx`, `detalle-corte-modal.tsx`

**Responsabilidad**: UI + Formularios

- React Hook Form + Zod
- Schemas desde `@/types/api/shifts`
- Emiten datos validados al container
- Reciben handlers por props
- Sin lógica de negocio

### 4. Page Layer

#### `page.tsx`

**Responsabilidad**: Composición y data fetching del servidor

- Server Component
- Verifica autenticación
- Carga datos iniciales
- Pasa datos al manager
- **Cero lógica**

#### `loading.tsx`

**Responsabilidad**: Estado de carga

- Solo importa y renderiza skeleton
- Sin lógica

## Flujo de Datos

### Flujo de Apertura de Corte

```
Usuario → abrir-corte-modal.tsx (RHF validación)
       → cortes-manager.tsx (handleAbrirCorte)
       → domain/shifts (abrirCorte)
       → api/shifts.client (fetchAbrirCorte)
       → Backend POST /api/shifts
```

### Flujo de Cierre de Corte

```
Usuario → cerrar-corte-modal.tsx
       → Carga resumen via domain (cargarResumenCorte)
       → Calcula diferencia via domain (calcularDiferencia)
       → Submit → cortes-manager.tsx (handleCerrarCorte)
       → domain/shifts (cerrarCorte)
       → api/shifts.client (fetchCerrarCorte)
       → Backend POST /api/shifts/close
```

### Flujo de Consulta

```
Usuario → cortes-filtros.tsx (cambio de filtros)
       → cortes-manager.tsx (handleAplicarFiltros)
       → domain/shifts (cargarCortes)
       → api/shifts.client (fetchCortes)
       → Backend GET /api/shifts?filters
       → cortes-lista.tsx (presentación)
```

## Validación de Datos

### Fuente de Verdad: Backend

Todos los schemas vienen de `@/types/api/shifts`:

```typescript
import { OpenShiftSchema, CloseShiftSchema } from "@/types/api/shifts";
```

**Regla**: NUNCA crear schemas locales para dominio. Siempre reutilizar del backend.

### Formularios

Todos los formularios usan:

- `react-hook-form` para estado
- `zodResolver` para validación
- Backend schemas para payloads

```typescript
const { register, handleSubmit } = useForm<OpenShiftInput>({
  resolver: zodResolver(OpenShiftSchema),
});
```

## Endpoints API

```
GET  /api/shifts              # Lista con filtros
GET  /api/shifts/active       # Corte activo
POST /api/shifts              # Abrir corte
POST /api/shifts/close        # Cerrar corte
GET  /api/shifts/[id]         # Detalle
GET  /api/shifts/[id]/summary # Resumen
```

## Dark Mode

Todos los componentes usan tokens de shadcn:

- `bg-background` / `bg-card` / `bg-muted`
- `text-foreground` / `text-muted-foreground`
- `border-border`
- `text-destructive` (no `text-red-600`)

## Principios de Calidad

### TypeScript

- ✅ Sin `any`
- ✅ Sin `as` casts forzados
- ✅ Sin `!` non-null assertions
- ✅ Tipos explícitos en interfaces
- ✅ Zod solo valida, no tipa retornos

### Arquitectura

- ✅ Separación clara de responsabilidades
- ✅ Domain sin referencias a UI
- ✅ UI sin lógica de negocio
- ✅ API client delgado
- ✅ Single Source of Truth (backend types)

### Mantenibilidad

- ✅ Fácil de leer
- ✅ Fácil de razonar
- ✅ Fácil de testear
- ✅ Fácil de extender

## Ejemplos de Uso

### Abrir un corte desde el manager

```typescript
const handleAbrirCorte = async (data: OpenShiftInput) => {
  const resultado = await abrirCorte(data);

  if (resultado.success) {
    // Actualizar UI
    await verificarActivo();
    await cargarDatos();
  } else {
    // Mostrar error
    setError(resultado.error);
  }
};
```

### Calcular diferencia en el modal de cierre

```typescript
const diferencia = resumen
  ? calcularDiferencia(resumen, {
      cashAmount: watchedValues.cashAmount,
      debitCardAmount: watchedValues.debitCardAmount,
      creditCardAmount: watchedValues.creditCardAmount,
      totalWithdrawals: watchedValues.totalWithdrawals,
    })
  : 0;
```

## Consideraciones Técnicas

- Cortes activos impiden abrir nuevos
- Solo admins pueden cerrar cortes ajenos
- Diferencias se marcan visualmente
- Validación de montos positivos
- Skeleton refleja UI real
- Estado local mínimo en componentes
- Máximo reuso de funciones de dominio
