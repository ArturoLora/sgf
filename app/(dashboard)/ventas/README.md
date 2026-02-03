# Módulo de Ventas

## Propósito

Interfaz de punto de venta (POS) para registrar transacciones de productos y membresías en tiempo real.

## Estructura

### Server Components

- `page.tsx`: Composición pura - solo carga productos y renderiza container

### Client Components (`_components/`)

- `ventas-container.tsx`: Estado global del carrito y coordinación
- `ventas-form.tsx`: Búsqueda de productos y selección de cliente (react-hook-form)
- `producto-item.tsx`: Línea individual del carrito con controles
- `resumen-venta.tsx`: Cálculo de totales con validación Zod
- `finalizar-venta-modal.tsx`: Confirmación con backend schema validation
- `ventas-skeleton.tsx`: Loading state con shadcn Skeleton
- `use-shift-check.tsx`: Hook para validar corte activo

## Validación de Datos

### Schemas del Backend (Fuente de Verdad)

Todos los payloads que cruzan la API se validan usando:

```typescript
import { CreateSaleInputSchema } from "@/types/api/inventory";
```

**Regla**: NO crear schemas locales para dominio. Reutilizar schemas del backend.

### Schemas de UX Locales

Formularios de interfaz pueden tener schemas inline para validación de entrada:

```typescript
const ajustesSchema = z.object({
  descuento: z.number().min(0),
  recargo: z.number().min(0),
});
```

## Formularios con React Hook Form

Todos los formularios usan:

- `react-hook-form` para estado y validación
- `zodResolver` para integración con Zod
- Backend schemas cuando envían datos a API

Ejemplo:

```typescript
const { register, handleSubmit } = useForm<CreateSaleInput>({
  resolver: zodResolver(CreateSaleInputSchema),
});

const onSubmit = async (data: CreateSaleInput) => {
  const validated = CreateSaleInputSchema.parse(data);
  await fetch("/api/inventory/sale", {
    body: JSON.stringify(validated),
  });
};
```

## Dark Mode

Todos los componentes usan tokens de shadcn:

- `bg-background` / `bg-card` / `bg-muted`
- `text-foreground` / `text-muted-foreground`
- `border-border`
- `text-destructive` (en lugar de `text-red-600`)

**Prohibido**: Usar `bg-gray-*`, `text-gray-*` directamente.

## Flujo de Datos

1. **Carga Inicial** (Server)
   - `page.tsx` → fetch productos activos desde DB
   - Pasa a `ventas-container.tsx` como props

2. **Agregar al Carrito** (Client)
   - Usuario busca producto en `ventas-form.tsx`
   - Se agrega a estado local en `ventas-container.tsx`
   - Se renderiza en lista usando `producto-item.tsx`

3. **Modificar Cantidades** (Client)
   - Componente `producto-item.tsx` maneja +/-
   - Actualiza estado en `ventas-container.tsx`
   - `resumen-venta.tsx` recalcula totales

4. **Finalizar Venta** (Client → API)
   - Modal `finalizar-venta-modal.tsx` captura método de pago
   - Valida payload con `CreateSaleInputSchema`
   - POST a `/api/inventory/sale` con cada item
   - Recibe ticket generado
   - Limpia carrito

## Loading States

`loading.tsx` renderiza `<VentasSkeleton />` que muestra:

- Skeleton para header
- Skeleton para formulario de búsqueda
- Skeleton para resumen lateral
- Skeleton para items del carrito

## Responsabilidades Server vs Client

### Server (`page.tsx`)

- Fetch inicial de productos
- Autenticación vía `requireAuth()`
- NO maneja estado del carrito

### Client (`_components/*`)

- Estado del carrito
- Búsqueda en tiempo real
- Cálculos de totales
- Interacción con API de ventas
- Validación de formularios

## Decisiones Importantes

1. **Búsqueda en Memoria**: Filtrado de productos en cliente (lista pequeña)
2. **Ticket Único**: Generado en cliente `VEN-${timestamp}-${random}`
3. **Validación de Stock**: Delegada a API `/api/inventory/sale`
4. **Backend Schemas**: Validación de payloads usando schemas compartidos
5. **Dark Mode**: Tokens shadcn para compatibilidad automática

## Patrón Responsive

- **Mobile**: Carrito en columna única, botones apilados
- **Tablet**: Grid 2 columnas, búsqueda + carrito
- **Desktop**: Grid 3 columnas, panel lateral de resumen

### Breakpoints Tailwind

- `sm:` 640px
- `md:` 768px
- `lg:` 1024px

## Integración con Inventario

Cada venta llama a `InventoryService.createSale()`:

- Descuenta stock de GYM
- Registra en `InventoryMovement` tipo `SALE`
- Actualiza visitas del socio si aplica
- Renueva membresía si es producto de membresía

## Schemas de Referencia

```typescript
// Backend schemas (FUENTE DE VERDAD)
CreateSaleInputSchema; // POST /api/inventory/sale
CreateEntryInputSchema; // POST /api/inventory/entry
CreateTransferInputSchema; // POST /api/inventory/transfer
CreateAdjustmentInputSchema; // POST /api/inventory/adjustment
CancelSaleInputSchema; // POST /api/inventory/cancel

// Ubicados en:
// @/types/api/inventory
// @/types/api/sales
```
