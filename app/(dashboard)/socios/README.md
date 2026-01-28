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
├── page.tsx                          # Server component - data fetching inicial
├── socios-manager.tsx                # Client component - orquestación UI
├── socios-filtros.tsx                # Client component - filtros y búsqueda
├── socios-lista.tsx                  # Client component - tabla responsive
├── socios-stats.tsx                  # Client component - estadísticas
├── crear-socio-modal.tsx             # Client component - formulario creación
├── editar-socio-modal.tsx            # Client component - formulario edición
├── detalle-socio-modal.tsx           # Client component - vista detallada
├── renovar-membresia-modal.tsx       # Client component - renovación
└── README.md                         # Esta documentación
```

## Flujo de Datos

### Server Side (page.tsx)

1. Verificación de autenticación (`requireAuth`)
2. Carga inicial de socios desde API
3. Pasa datos serializados al Manager

### Client Side (socios-manager.tsx)

1. Recibe datos iniciales como props
2. Gestiona estado local (filtros, paginación, modales)
3. Maneja mutaciones (crear, editar, renovar)
4. Revalida datos después de cambios
5. Coordina componentes hijos

### Componentes de UI

- **socios-filtros**: Búsqueda, filtros por estado/tipo, ordenamiento
- **socios-lista**: Tabla responsive con acciones
- **socios-stats**: Cards con métricas clave
- **Modales**: Formularios y vistas detalladas

## Responsabilidades Server vs Client

### Server Components

- `page.tsx`: Auth + data fetching inicial
- Props son datos serializados (JSON-safe)

### Client Components

- Todo componente con interactividad
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
// Tailwind breakpoints usados
sm: 640px   // tablet
md: 768px   // tablet landscape
lg: 1024px  // desktop
xl: 1280px  // desktop grande
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

### 4. Validaciones

- Formato de número de socio
- Validación de fechas
- Tipos de membresía desde enum
- Teléfono/email opcionales

### 5. Estados de Membresía

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

## Mejoras Futuras Potenciales

- [ ] Exportar listado a Excel
- [ ] Gráficas de crecimiento de socios
- [ ] Notificaciones de vencimiento
- [ ] Histórico de membresías pasadas
- [ ] Check-in con QR
- [ ] Portal de socio (autogestión)
