# Módulo Socios

## Propósito

Gestión completa de socios del gimnasio, incluyendo:

- Registro y actualización de datos personales
- Renovación de membresías
- Consulta de vigencia
- Filtrado y búsqueda de socios
- Vista detallada con historial

## Estructura

```
socios/
├── page.tsx                          # Server component - data fetching y composición
├── loading.tsx                       # Loading state con skeleton
├── _components/
│   ├── socios-manager.tsx            # Client - orquestación principal
│   ├── socios-filtros.tsx            # Client - filtros y búsqueda
│   ├── socios-lista.tsx              # Client - tabla responsive
│   ├── socios-stats.tsx              # Client - estadísticas
│   ├── socios-skeleton.tsx           # Skeleton loading component
│   └── modals/
│       ├── crear-socio-modal.tsx     # Modal creación con RHF + Zod
│       ├── editar-socio-modal.tsx    # Modal edición con RHF + Zod
│       ├── detalle-socio-modal.tsx   # Modal vista detallada
│       └── renovar-membresia-modal.tsx # Modal renovación con RHF + Zod
└── README.md                         # Esta documentación
```

## Tecnologías

### React Hook Form + Zod

Todos los formularios usan:

- `react-hook-form` para manejo de estado y validación
- `@hookform/resolvers/zod` para integración con Zod
- Schemas importados desde `types/api/members.ts` (fuente de verdad backend)

**Ejemplo:**

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateMemberInputSchema } from "@/types/api/members";
import type { CreateMemberInputRaw } from "@/types/api/members";

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<CreateMemberInputRaw>({
  resolver: zodResolver(CreateMemberInputSchema),
});
```

### Dark Mode

Todos los componentes usan tokens de shadcn/ui:

- `bg-background` / `text-foreground`
- `text-muted-foreground`
- `border-border`
- `bg-muted`

**NO** se usan colores hardcodeados como `bg-gray-50` o `text-gray-600`.

### Loading States

- `loading.tsx` importa `SociosSkeleton`
- Skeletons reflejan la estructura real de la UI
- Estados de carga en modales durante submit

## Flujo de Datos

### Server Side (page.tsx)

1. Verificación de autenticación (`requireAuth`)
2. Carga inicial de socios desde base de datos
3. Serialización de datos (manejo de Decimals)
4. Pasa datos al Manager como props

### Client Side (socios-manager.tsx)

1. Recibe datos iniciales como props
2. Gestiona estado local (filtros, paginación, modales)
3. Maneja mutaciones (crear, editar, renovar)
4. Revalida datos después de cambios
5. Coordina componentes hijos

### Componentes de UI

- **socios-stats**: Métricas clave calculadas con `useMemo`
- **socios-filtros**: Búsqueda, filtros por estado/tipo, ordenamiento
- **socios-lista**: Tabla responsive con vista móvil (cards) y desktop
- **Modales**: Formularios con validación y vistas detalladas

## Responsabilidades Server vs Client

### Server Components

- `page.tsx`: Auth + data fetching inicial
- Props son datos serializados (JSON-safe)

### Client Components

- Todo en `_components/`
- Estado local, eventos, hooks
- Llamadas a API para mutaciones
- Modales, formularios, filtros

## Patrón Responsive

### Mobile First

- Grid: 1 columna base
- Stacks verticales
- Cards expandibles
- Botones full-width

### Tablet (sm: 640px+)

- Grid: 2 columnas para stats
- Layout horizontal para filtros
- Tabla con scroll horizontal

### Desktop (lg: 1024px+)

- Grid: 4 columnas para stats
- Filtros en línea
- Tabla completa sin scroll
- Modales más amplios

### Breakpoints Clave

```typescript
sm: 640px   // tablet
md: 768px   // tablet landscape
lg: 1024px  // desktop
xl: 1280px  // desktop grande
```

## Validación de Formularios

### Fuente de Verdad

`types/api/members.ts` contiene todos los schemas Zod:

- `CreateMemberInputSchema` - Creación de socios
- `UpdateMemberInputSchema` - Edición de socios
- `RenewMemberInputSchema` - Renovación de membresías

**NO** crear schemas locales en componentes frontend.

### Tipos TypeScript

```typescript
import type { CreateMemberInputRaw } from "@/types/api/members";
import type { UpdateMemberInputRaw } from "@/types/api/members";
import type { RenewMemberInputRaw } from "@/types/api/members";
```

## Decisiones Importantes

### 1. Separación UX/Dominio

- **Frontend/UX**: Español (componentes, props visuales, textos)
- **Backend/Dominio**: Inglés (Member, membershipType, API)
- Ejemplo: `DetalleSocioModal` usa `member.membershipType`

### 2. Rutas API

- `/api/members` - CRUD
- `/api/members/[id]` - Individual
- `/api/members/renew` - Renovación
- `/api/members/expired` - Listado vencidos
- NO usar `/api/socios`

### 3. Paginación

- 15 items por página
- Paginación del lado cliente (datos pre-cargados)
- Filtrado reactivo sin llamadas API

### 4. Estados de Membresía

- Activa: `endDate >= hoy`
- Vencida: `endDate < hoy`
- Sin membresía: `membershipType === null`

## Tipos de Membresía

Según `prisma/schema.prisma`:

```typescript
enum MembershipType {
  VISIT
  WEEK
  MONTH_STUDENT
  MONTH_GENERAL
  QUARTER_STUDENT
  QUARTER_GENERAL
  ANNUAL_STUDENT
  ANNUAL_GENERAL
  PROMOTION
  REBIRTH
  NUTRITION_CONSULTATION
}
```

## Integración con Otros Módulos

### Ventas

- Al vender membresía → actualiza `Member.membershipType` y fechas
- Registro de visitas → incrementa `totalVisits`

### Inventario

- Productos de membresía asociados a tipos
- Transacciones registradas con `memberId`

## Calidad de Código

### TypeScript

- Sin `any` types
- Sin `eslint-disable`
- Sin non-null assertions (`!`)
- Tipos correctamente inferidos de schemas backend

### React Hooks

- `useMemo` para cálculos pesados (filtrado, ordenamiento)
- `useCallback` para funciones pasadas como props
- Dependencias correctamente especificadas

### Manejo de Errores

- Try-catch en todas las llamadas API
- Estados de error locales en modales
- Mensajes de error descriptivos

## Mejoras Futuras Potenciales

- [ ] Exportar listado a Excel
- [ ] Gráficas de crecimiento de socios
- [ ] Notificaciones de vencimiento
- [ ] Histórico de membresías pasadas
- [ ] Check-in con QR
- [ ] Portal de socio (autogestión)
- [ ] Búsqueda por rango de fechas
- [ ] Reportes de renovación
