# Módulo de Ventas

## Propósito

Interfaz de punto de venta (POS) para registrar transacciones de productos y membresías en tiempo real.

## Estructura

### Server Components

- `page.tsx`: Carga inicial de productos activos desde DB

### Client Components

- `ventas-container.tsx`: Estado global del carrito y coordinación
- `ventas-form.tsx`: Búsqueda de productos y selección de cliente
- `producto-item.tsx`: Línea individual del carrito con controles
- `resumen-venta.tsx`: Cálculo de subtotal/descuento/recargo/total
- `finalizar-venta-modal.tsx`: Confirmación y método de pago

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
   - POST a `/api/inventory/sale` con cada item
   - Recibe ticket generado
   - Limpia carrito

## Responsabilidades Server vs Client

### Server (page.tsx)

- Fetch inicial de productos
- Autenticación vía `requireAuth()`
- NO maneja estado del carrito

### Client (todos los demás)

- Estado del carrito
- Búsqueda en tiempo real
- Cálculos de totales
- Interacción con API de ventas

## Decisiones Importantes

1. **Búsqueda en Memoria**: Filtrado de productos en cliente (lista pequeña)
2. **Ticket Único**: Generado en cliente `VEN-${timestamp}-${random}`
3. **Validación de Stock**: Delegada a API `/api/inventory/sale`
4. **Cancelación**: Integrada con `/api/inventory/cancel`

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
