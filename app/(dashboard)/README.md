# Dashboard Module - Nacho Gym

## Propósito

Módulo principal del sistema que muestra el estado general del gimnasio:

- Resumen de ventas del día
- Alertas de socios con membresías vencidas
- Productos con stock bajo
- Estado del corte activo

## Estructura de Archivos

```
app/(dashboard)/
├── layout.tsx                 # Layout principal con sidebar + header (Server Component)
├── page.tsx                   # Entry point del dashboard (Server Component)
├── dashboard.container.tsx    # Container que obtiene datos (Server Component)
├── dashboard-stats.tsx        # Cards de estadísticas (Client Component)
├── corte-alert.tsx           # Alerta de corte activo/inactivo (Client Component)
├── alertas-dashboard.tsx     # Alertas de socios y productos (Client Component)

components/layout/
├── sidebar.tsx               # Navegación lateral responsive (Client Component)
├── header.tsx                # Header con info de usuario (Client Component)
```

## Flujo de Datos

### Server Components (datos)

1. **page.tsx**: Entry point que requiere autenticación
2. **dashboard.container.tsx**: Obtiene datos del servidor
   - Estado del corte activo (ShiftsService)
   - Estadísticas del día (query directo a Prisma)
   - Socios vencidos (MembersService)
   - Reporte de stock (ReportsService)

### Client Components (UI/interactividad)

3. **dashboard-stats.tsx**: Recibe props y muestra 4 cards de métricas
4. **corte-alert.tsx**: Recibe corte y muestra alerta verde/amarilla
5. **alertas-dashboard.tsx**: Recibe arrays y muestra listas de alertas

## Server vs Client Responsibilities

### Server Components ✅

- Autenticación/autorización (requireAuth)
- Queries a base de datos (Prisma)
- Llamadas a services
- Data fetching
- Preparación de datos

### Client Components ⚡

- Interactividad (click, hover, formularios)
- Estado local (useState, useReducer)
- Navegación (useRouter, usePathname)
- Efectos de UI (useEffect para scroll lock)
- Event handlers

**Regla de oro**: Si no necesita interactividad, es Server Component.

## Patrón Responsive

### Breakpoints (Tailwind)

```
sm:  640px  (tablets pequeñas)
md:  768px  (tablets)
lg:  1024px (laptops)
xl:  1280px (desktops)
```

### Estrategia de Layout

#### Mobile (<1024px)

- Sidebar oculta por defecto
- Hamburger button fixed en top-left
- Drawer slide-in con overlay
- Body scroll locked cuando drawer abierto
- Drawer se cierra al navegar

#### Desktop (≥1024px)

- Sidebar siempre visible (lg:flex)
- No hamburger button (lg:hidden)
- Sin drawer/overlay

### Componentes Responsive

#### Sidebar

```tsx
// Desktop: siempre visible
<div className="hidden lg:flex">...</div>

// Mobile: drawer con overlay
<div className="fixed ... lg:hidden">...</div>

// Hamburger: solo mobile
<Button className="lg:hidden">...</Button>
```

#### Header

```tsx
// Texto responsive
<h2 className="text-sm sm:text-lg">...</h2>

// Badge oculto en mobile
<span className="hidden sm:inline-flex">...</span>

// Botón: solo icono mobile, icono+texto desktop
<LogOut className="h-4 w-4" />
<span className="hidden sm:inline">Cerrar Sesión</span>
```

#### Stats Grid

```tsx
// 1 col mobile → 2 cols tablet → 4 cols desktop
<div className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
```

#### Alertas Grid

```tsx
// 1 col mobile → 2 cols desktop
<div className="grid-cols-1 lg:grid-cols-2">
```

### Patrones de Spacing

- Padding: `p-4 sm:p-6` (menor en mobile)
- Gap: `gap-4 sm:gap-6` (menor en mobile)
- Text: `text-sm sm:text-base` (menor en mobile)

### Manejo de Overflow

```tsx
// Texto truncado en espacios pequeños
<p className="truncate">...</p>

// Flex con min-width para evitar overflow
<div className="min-w-0 flex-1">...</div>

// Shrink previene que iconos se compriman
<Icon className="shrink-0" />
```

## Decisiones Arquitectónicas

### 1. Server-First Architecture

- Máximo uso de Server Components
- Client Components solo donde se necesita interactividad
- Reduce bundle JS enviado al cliente

### 2. No State Management Global

- Props drilling intencional
- Sin Context API innecesario
- Estado local donde se necesita

### 3. Mobile Drawer Manual

- No usamos shadcn Sheet component (evita dependencias)
- Implementación manual con Tailwind transitions
- Overlay + drawer con clases utilitarias
- Body scroll lock con useEffect

### 4. Responsive-First

- Mobile-first CSS (clases base sin prefijo)
- Progressive enhancement (sm:, lg:, etc.)
- Touch-friendly targets (min 44x44px buttons)

### 5. Composition Over Abstraction

- Componentes pequeños, enfocados
- Sin abstracciones prematuras
- Fácil de seguir el flujo de datos

## Dependencias

### Externas

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- shadcn/ui (Button, Card, Badge)
- Lucide React (iconos)

### Internas

- @/lib/auth (requireAuth)
- @/lib/navigation (dashboardRoutes)
- @/services/\* (data fetching)

## Notas de Implementación

### Body Scroll Lock

```tsx
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "unset";
  }
  return () => {
    document.body.style.overflow = "unset";
  };
}, [isOpen]);
```

### Auto-close on Route Change

```tsx
useEffect(() => {
  onClose();
}, [pathname, onClose]);
```

### Fixed Button Positioning

```tsx
// Hamburger fixed en top-left, z-index 30
<Button className="lg:hidden fixed top-4 left-4 z-30" />

// Drawer z-index 50, overlay z-index 40
```

## Testing Manual

### Desktop

- [ ] Sidebar visible al cargar
- [ ] Navegación funciona
- [ ] Header muestra rol completo
- [ ] Stats en 4 columnas

### Tablet

- [ ] Stats en 2 columnas
- [ ] Spacing apropiado
- [ ] Touch targets ≥44px

### Mobile

- [ ] Hamburger visible
- [ ] Drawer abre/cierra suave
- [ ] Overlay cierra drawer
- [ ] No scroll del body con drawer abierto
- [ ] Navegación cierra drawer
- [ ] Stats en 1 columna
- [ ] Texto truncado correctamente

## Mejoras Futuras (Fuera de Scope)

- [ ] Persistencia de estado del drawer (localStorage)
- [ ] Transiciones con Framer Motion
- [ ] Skeleton loaders en Server Components
- [ ] Virtualization para listas largas
- [ ] Progressive Web App (PWA)
- [ ] Offline support
