# Módulo Inventario

## Propósito

Control de existencias físicas de productos del gimnasio (excluyendo membresías). Permite visualizar stocks en tiempo real, consultar kardex de movimientos por producto, y revisar el estado general del inventario.

## Estructura

```
inventario/
├── page.tsx                           # Server Component - composición
├── loading.tsx                        # Loading state
├── _components/
│   ├── inventario-manager.tsx         # Client Island - orquestación
│   ├── inventario-filtros.tsx         # Client Component - filtros
│   ├── inventario-tabla.tsx           # Client Component - tabla responsive
│   ├── inventario-stats.tsx           # Client Component - estadísticas
│   └── inventario-skeleton.tsx        # Loading skeleton
├── kardex/
│   ├── [id]/
│   │   ├── page.tsx                   # Server Component - kardex
│   │   └── loading.tsx                # Loading state
│   └── _components/
│       ├── kardex-lista.tsx           # Client Component - movimientos
│       └── kardex-skeleton.tsx        # Loading skeleton
└── README.md
```

## Flujo de Datos

### Inventario Principal

1. **Server (`page.tsx`)**:
   - Obtiene productos físicos de DB vía `ProductsService`
   - Filtra membresías por keywords
   - Pasa datos a `InventarioManager`

2. **Client (`_components/inventario-manager.tsx`)**:
   - Aplica filtros locales (búsqueda, estado, ubicación)
   - Calcula estadísticas dinámicas
   - Maneja paginación local
   - Orquesta componentes hijos

3. **Client (`_components/inventario-tabla.tsx`)**:
   - Renderiza tabla responsive (desktop) y cards (mobile)
   - Calcula badges de estado por producto
   - Provee navegación a kardex

### Kardex de Producto

1. **Server (`kardex/[id]/page.tsx`)**:
   - Obtiene producto + movimientos de DB
   - Calcula totales y valores
   - Pasa datos a `KardexLista`

2. **Client (`kardex/_components/kardex-lista.tsx`)**:
   - Renderiza historial responsive
   - Formatea fechas y tipos de movimiento
   - Muestra badges por tipo de operación

## Server vs Client Responsibilities

### Server Components

**`page.tsx`**

- Autenticación vía `requireAuth()`
- Fetch de productos vía `ProductsService.getAllProducts()`
- Filtrado de membresías
- Solo composición, sin lógica UI

**`kardex/[id]/page.tsx`**

- Autenticación vía `requireAuth()`
- Fetch de producto vía `ProductsService.getProductById()`
- Fetch de movimientos vía Prisma
- Serialización de decimales
- Solo composición, sin lógica UI

### Client Components

**`_components/inventario-manager.tsx`**

- Estado de filtros (`useState`)
- Paginación local (`useState`)
- Cálculo de estadísticas (`useMemo`)
- Filtrado y ordenamiento (`useMemo`)
- Event handlers con `useCallback`

**`_components/inventario-filtros.tsx`**

- Inputs interactivos (búsqueda, selects)
- Toggle de filtros avanzados
- Detección de filtros activos

**`_components/inventario-tabla.tsx`**

- Render de filas/cards según viewport
- Cálculo de badges de estado
- Links a kardex por producto

**`_components/inventario-stats.tsx`**

- Cards de métricas con iconos
- Formato de valores numéricos

**`kardex/_components/kardex-lista.tsx`**

- Timeline de movimientos
- Formato de fechas con `toLocaleString`
- Badges por tipo de movimiento
- Indicadores visuales (+/-)

## Patrones de Implementación

### 1. React Hook Form + Zod

**Actualmente NO implementado** en este módulo porque:

- No hay formularios de entrada de datos
- Los filtros son state local simple
- Las operaciones de inventario (entradas, traspasos, ventas) se manejan en otros módulos

Si se agregaran formularios en el futuro:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateEntryInputSchema } from "@/types/api/inventory";

const form = useForm({
  resolver: zodResolver(CreateEntryInputSchema),
  defaultValues: { ... }
});
```

### 2. Backend Schema Integration

Los tipos de datos provienen de `types/api/inventory.ts`:

- `MovimientoInventarioResponse` para kardex
- `KardexMovimientoResponse` para movimientos
- Schemas Zod disponibles para validación futura

**Importante**: Frontend **NO duplica schemas**. Si se necesita validación de payloads, se importan desde `types/api/inventory.ts`.

### 3. Dark Mode con Tokens Shadcn

Todos los componentes usan tokens CSS variables:

- `bg-background` en lugar de `bg-white`
- `text-foreground` en lugar de `text-gray-900`
- `text-muted-foreground` en lugar de `text-gray-500`
- `border-border` en lugar de `border-gray-200`
- `bg-muted` en lugar de `bg-gray-50`
- `bg-card` en lugar de hardcoded backgrounds

Colores específicos mantienen sufijos dark mode:

```tsx
className = "text-blue-600 dark:text-blue-400";
className = "bg-green-50 dark:bg-green-950";
```

### 4. TypeScript Estricto

**Reglas aplicadas:**

- ✅ No `any` types
- ✅ No `eslint-disable` comments
- ✅ No non-null assertions (`!`)
- ✅ Typed event handlers
- ✅ Typed component props
- ✅ Proper hook dependencies
- ✅ Union types para valores conocidos

**Ejemplo de tipado correcto:**

```tsx
const handleChange = (key: keyof FiltrosInventario, value: string) => {
  onCambiarFiltros({ ...filtros, [key]: value });
};

const handleCambiarPagina = useCallback((pagina: number) => {
  setPaginaActual(pagina);
}, []);
```

### 5. Loading States

**Skeleton Components:**

- `_components/inventario-skeleton.tsx`: Estado de carga principal
- `kardex/_components/kardex-skeleton.tsx`: Estado de carga kardex

**Loading Pages:**

- `loading.tsx`: Importa y renderiza skeleton principal
- `kardex/[id]/loading.tsx`: Importa y renderiza skeleton kardex

**Beneficios:**

- Mejor percepción de velocidad
- Evita layout shifts
- Consistencia visual durante carga

## Decisiones Importantes

### 1. Separación Productos Físicos vs Membresías

Los productos de membresía se excluyen porque:

- No tienen stock físico
- No requieren control de existencias
- Se manejan desde módulos Ventas/Socios

**Implementación:**

```tsx
const keywords = [
  "EFECTIVO",
  "VISITA",
  "MENSUALIDAD",
  "SEMANA",
  "TRIMESTRE",
  "ANUAL",
  "PROMOCION",
  "RENACER",
];

const physicalProducts = allProducts.filter((p) => {
  return !keywords.some((keyword) => p.name.toUpperCase().includes(keyword));
});
```

### 2. Cálculo de Estadísticas en Cliente

Stats se calculan en `inventario-manager.tsx` con `useMemo` porque:

- Dependen de filtros locales
- Dataset completo ya está en memoria
- No requiere re-fetch al servidor
- Recalcula automáticamente con cambios

### 3. Kardex como Ruta Separada

`/inventario/kardex/[id]` en lugar de modal porque:

- URLs compartibles
- Mejor historial de navegación
- Server Component puede fetchear datos frescos
- Soporte nativo de loading states

### 4. Filtros sin Debounce

Búsqueda y filtros aplican inmediatamente porque:

- Dataset pequeño (<100 productos típicamente)
- Filtrado en memoria es instantáneo
- Mejor UX sin delay artificial
- `useMemo` previene recálculos innecesarios

### 5. Paginación Local

No se usa paginación server-side porque:

- Dataset completo es pequeño
- Filtros son dinámicos en cliente
- Evita round-trips innecesarios
- Mejor UX (cambios instantáneos)

## Patrón Responsive

### Mobile (< 640px)

- **Stats**: Grid 2x2
- **Filtros**: Stack vertical, botones full-width, iconos sin texto
- **Tabla**: Cards verticales con info condensada
- **Paginación**: Indicador simple (1/5), botones con iconos

### Tablet (640px - 1024px)

- **Stats**: Grid 2x2 o transición a 4x1
- **Filtros**: Grid 2 columnas para inputs avanzados
- **Tabla**: Tabla completa con scroll horizontal si necesario
- **Paginación**: Botones con texto, sin números

### Desktop (> 1024px)

- **Stats**: Grid 4x1
- **Filtros**: Grid 4 columnas para inputs avanzados
- **Tabla**: Tabla completa sin scroll
- **Paginación**: Full con números de página visibles

**Clases Tailwind clave:**

```tsx
"hidden md:block"; // Solo desktop/tablet
"md:hidden"; // Solo mobile
"sm:flex-row"; // Horizontal en tablet+
"lg:grid-cols-4"; // 4 columnas en desktop
"gap-3 sm:gap-4"; // Espaciado adaptativo
```

## Contratos API Usados

### ProductsService

- `getAllProducts()`: Lista completa de productos
- `getProductById(id)`: Detalle de un producto

### Direct Prisma Queries

```tsx
// kardex/[id]/page.tsx
prisma.inventoryMovement.findMany({
  where: { productId: id },
  include: {
    user: { select: { name: true } },
    member: { select: { memberNumber: true, name: true } },
  },
  orderBy: { date: "desc" },
  take: 100,
});
```

**Nota**: Los movimientos se obtienen directamente por Prisma en lugar de API route porque:

- Es un Server Component
- No hay exposición pública necesaria
- Mejor performance (sin capa HTTP extra)
- Serialización manejada con `serializeDecimal()`

## UX vs Dominio (Naming)

### UX Layer (Español)

**Componentes:**

- `InventarioManager`, `InventarioFiltros`, `InventarioTabla`
- `InventarioStats`, `KardexLista`

**Props y State:**

- `onCambiarFiltros`, `productos`, `stockBajo`
- `paginaActual`, `filtros`, `movimientos`

**Carpetas:**

- `inventario/`, `kardex/`, `_components/`

**UI Text:**

- "Stock Bajo", "Ver Kardex", "Existencias"
- "Entrada Bodega", "Traspaso a Gym"

### Domain Layer (Inglés)

**Models:**

- `Product`, `InventoryMovement`
- `Location`, `InventoryType`

**Services:**

- `ProductsService`, `InventoryService`

**API Routes:**

- `/api/inventory/*`, `/api/products/*`

**Props de Datos:**

- `productId`, `warehouseStock`, `gymStock`
- `minStock`, `isActive`, `salePrice`

**Enums:**

- `Location.WAREHOUSE`, `Location.GYM`
- `InventoryType.SALE`, `InventoryType.WAREHOUSE_ENTRY`

## Notas de Implementación

### Hooks Best Practices

```tsx
// ✅ Correcto: useCallback con deps
const handleCambiarFiltros = useCallback(
  (nuevosFiltros: FiltrosInventario) => {
    setFiltros(nuevosFiltros);
    setPaginaActual(1);
  },
  [] // deps vacío porque setters son estables
);

// ✅ Correcto: useMemo para cálculos pesados
const productosFiltrados = useMemo(() => {
  // ... lógica de filtrado
}, [productos, filtros]);

// ❌ Incorrecto: función inline en prop
<Button onClick={() => setPagina(n)} />

// ✅ Correcto: función estable
<Button onClick={handleCambiarPagina(n)} />
```

### Event Handlers

```tsx
// ✅ Correcto: tipado explícito
const handleChange = (
  key: keyof FiltrosInventario,
  value: string
) => { ... };

// ❌ Incorrecto: any implícito
const handleChange = (key, value) => { ... };
```

### Serialización

```tsx
// Necesario para Decimal de Prisma
import { serializeDecimal } from "@/services/utils";

const movements = await prisma.inventoryMovement.findMany(...);
return serializeDecimal(movements);
```

### Navegación

```tsx
// ✅ Links estáticos: usar <Link>
<Link href="/inventario">
  <Button>Volver</Button>
</Link>;

// ✅ Navegación programática: usar useRouter
const router = useRouter();
router.push(`/inventario/kardex/${id}`);
```

## Calidad de Código

### Checklist Pre-Commit

- [ ] No `any` types
- [ ] No `eslint-disable` comments
- [ ] No non-null assertions (`!`)
- [ ] Todos los hooks tienen dependencies correctas
- [ ] Componentes exportan con nombres (no default export en components)
- [ ] Props interfaces exportadas cuando son compartidas
- [ ] Dark mode tokens usados (no colores hardcoded)
- [ ] Loading states implementados
- [ ] Responsive design probado
- [ ] TypeScript compila sin errores
- [ ] ESLint pasa sin warnings

### Performance Considerations

- `useMemo` para filtrado (re-calcula solo cuando cambian deps)
- `useCallback` para event handlers (previene re-renders innecesarios)
- Paginación local (evita network requests)
- Componentes granulares (re-renders localizados)

## Extensibilidad Futura

### Para Agregar Formularios

1. Crear schema en `types/api/inventory.ts` (backend)
2. Importar schema en componente
3. Usar `react-hook-form` + `zodResolver`
4. Validar antes de enviar a API

### Para Agregar Filtros

1. Extender `FiltrosInventario` interface
2. Agregar lógica en `useMemo` de `productosFiltrados`
3. Agregar UI en `inventario-filtros.tsx`
4. Mantener state management consistente

### Para Agregar Estadísticas

1. Calcular en `useMemo` de stats
2. Agregar card en `inventario-stats.tsx`
3. Usar tokens dark mode
4. Mantener responsive grid

## Troubleshooting

### Productos no aparecen

- Verificar filtro de keywords de membresías
- Revisar `isActive` del producto
- Comprobar permisos de autenticación

### Estadísticas incorrectas

- Verificar que `useMemo` deps incluye `productos`
- Confirmar tipo de datos (number vs string)
- Revisar conversión con `Number()`

### Paginación rota

- Verificar `totalPaginas` cálculo
- Comprobar límite `ITEMS_POR_PAGINA`
- Revisar `Math.min/max` en handlers

### Dark mode no funciona

- Verificar tokens CSS variables
- Confirmar sufijos `dark:` en colores específicos
- Revisar configuración Tailwind
