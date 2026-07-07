# Story D2: Corregir Reconstruction para que no vuelva a perder `Product.salePrice`

**Status:** review
**Epic:** Corrección Post-Reconstruction — Consistencia de Datos y Métricas (iniciativa ad-hoc, fuera de la numeración de Epic 1/2/3)
**Prioridad:** Alta — corrige la causa estructural raíz por la que `Productos`, `Inventario` y `Reportes` muestran precios/valores en $0 después de cualquier Reconstruction futura con reimportación de catálogo.
**Orden en el plan aprobado:** 1 de 6 (D2 → D1 → C1 → A1 → A2 → B1). Esta Story es independiente de D1 y no la bloquea ni la implementa.

---

## Story

Como administrador que ejecuta una Reconstruction del sistema,
quiero que `Product.salePrice` se derive del historial real de ventas al reimportar el catálogo,
para que Productos, Inventario y Reportes nunca vuelvan a mostrar precios en $0 después de una reconstrucción.

---

## Contexto del desarrollador

### Por qué existe esta historia (hecho confirmado en esta conversación, no reinvestigar)

`resetProducts()` (`modules/migration/reconstruction.service.ts:142-156`) solo preserva `{name, taxRate}` antes de `deleteMany({})` y recrea cada `Product` con `prisma.product.create({ data: { name: entry.name, taxRate: entry.taxRate } })`. `salePrice` nunca se pasa — vuelve al default `0` del schema (`prisma/schema.prisma`: `salePrice Decimal @default(0)`). Confirmado en DB real: 113/113 `Product` con `salePrice=0`.

Esto solo ocurre cuando `reimportProducts=true` (el admin pidió reimportar el catálogo). Si `reimportProducts=false`, `resetProducts()` nunca corre y `salePrice` no se toca.

### Por qué NO se puede corregir dentro de `resetProducts()`/`buildProductResetPlan()` (contradicción técnica real, documentada — no se amplía el alcance por esto)

El pipeline de `executeReconstruction()` (`modules/migration/reconstruction.service.ts:177-352`) ejecuta las fases en este orden:

```
"delete"   → deleteOperationalData() — BORRA TODO InventoryMovement existente (tx.inventoryMovement.deleteMany({}))
"products" → resetProducts() — recrea Product (aquí es donde salePrice se pierde hoy)
"members"  → syncMembers()
"shifts"   → syncShifts() — RECREA InventoryMovement (con unitPrice) a partir de los archivos subidos
"finalize" → finalizeSyncMode()
```

En el momento en que corre `resetProducts()` (fase `"products"`), **no existe ningún `InventoryMovement` en la base de datos** — la fase `"delete"`, inmediatamente anterior, ya los borró todos. El historial de `unitPrice` del que la regla aprobada debe derivar `salePrice` **se crea recién en la fase `"shifts"`** (`modules/migration/migration.service.ts:251-270`, `syncShifts()`, que puebla `unitPrice: data.unitPrice` en cada `InventoryMovement` de venta).

Por lo tanto: `salePrice` **no puede** calcularse dentro de `resetProducts()`/`buildProductResetPlan()` (son de la fase `"products"`, y `buildProductResetPlan` además es una función pura sin acceso a Prisma — correcto mantenerla así, P-3). Requiere un **paso nuevo, después de que `syncShifts()` complete exitosamente**, que lea los `InventoryMovement` recién creados y actualice `Product.salePrice`.

### Regla aprobada (dato de entrada — no reabrir la discusión de reglas)

Por `Product`: tomar el `unitPrice` del `InventoryMovement` cronológicamente más reciente que cumpla:
- `type = "SALE"`
- `isCancelled = false`
- `unitPrice IS NOT NULL`

Sin ningún movimiento que cumpla esas condiciones → `salePrice = 0` (ya es el valor por defecto al crear el producto; no requiere acción). Si el más reciente que cumple tiene `unitPrice = 0` → `salePrice = 0` (se respeta ese valor, no se busca uno anterior distinto de cero). Sin fallback por nombre, categoría o similitud.

---

## Acceptance Criteria

1. **AC-1** — Producto con historial simple de `SALE` (un solo `unitPrice` en su historial) → `salePrice` queda igual a ese `unitPrice`.
2. **AC-2** — Producto con conflicto histórico (ej. `MONSTER BLANCO`: $42 y luego $45) → `salePrice` queda en el valor del `SALE` cronológicamente más reciente ($45), sin importar cuál tuvo más apariciones.
3. **AC-3** — Producto sin ningún `InventoryMovement` de `type=SALE` → `salePrice` permanece en `0` (el default de creación, sin acción adicional necesaria).
4. **AC-4** — Producto cuyo `SALE` cronológicamente más reciente tiene `unitPrice=0` → `salePrice` queda en `0` (no se busca un valor distinto de cero en movimientos anteriores).
5. **AC-5** — Movimientos con `isCancelled=true` se excluyen por completo al determinar cuál es "el más reciente" — un `SALE` cancelado posterior a uno válido no debe ganar.
6. **AC-6** — Movimientos con `type` distinto de `SALE` (`ADJUSTMENT`, `GYM_ENTRY`, transferencias, etc.) se ignoran completamente.
7. **AC-7** — El cálculo de `salePrice` corre **después** de que `syncShifts()` (fase `"shifts"`) complete exitosamente (`shiftsResult.shiftsFailed === 0`) — nunca durante o antes de la fase `"products"`.
8. **AC-8** — El paso nuevo es **obligatorio** cuando `reimportProducts=true` (es decir, cuando `resetProducts()` realmente corrió en esta ejecución): forma parte del pipeline de Reconstruction, no es de mejor esfuerzo. Si `reimportProducts=false`, el paso no se ejecuta y no se reporta ni éxito ni fallo.
9. **AC-9** — `taxRate` no sufre ninguna regresión: `buildProductResetPlan()` y `resetProducts()` seguyen preservando `taxRate` exactamente igual que hoy; el nuevo paso no lee ni escribe `taxRate`.
10. **AC-10** — Un fallo en el nuevo paso (ej. error de DB al hacer los updates) **aborta la Reconstruction completa**: retorna `success:false` con `failedPhase:"pricing"`, siguiendo exactamente el mismo patrón de manejo de error que ya usan las fases `"products"`/`"members"`/`"shifts"` (try/catch → return temprano). `finalizeSyncMode()` **no** se ejecuta en ese caso. El error NO se convierte en advertencia — no existe `pricingWarning`. No se ejecuta rollback manual inventado ni una segunda Reconstruction automática; el mensaje de fallo sigue el patrón real existente ("Restaura desde el respaldo...") usado por las demás fases.
11. **AC-11** — Toda la lógica de decisión (AC-1 a AC-6) vive en una función pura, sin Prisma ni I/O, cubierta por un smoke test que la ejercita con fixtures — sin ejecutar una Reconstruction real ni escribir en DB.

---

## Tasks / Subtasks

- [x] **T1** — Función pura de cómputo (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-11)
  - [x] T1.1 — Crear `modules/migration/domain/product-pricing.ts`
  - [x] T1.2 — Definir tipo de entrada mínimo, ej.:
    ```typescript
    export interface SaleMovementForPricing {
      productId: number;
      unitPrice: number | null;
      isCancelled: boolean;
      type: string; // comparar contra "SALE"
      date: Date;
      id: number; // tie-break determinista si dos movimientos comparten `date` exacto
    }
    ```
  - [x] T1.3 — Implementar `computeLastSalePrices(movements: SaleMovementForPricing[]): Map<number, number>`:
    - filtra `type === "SALE" && !isCancelled && unitPrice !== null`
    - agrupa por `productId`
    - por cada grupo, se queda con el de `date` más reciente; en empate de `date`, gana el de `id` mayor
    - retorna `Map<productId, unitPrice>` — productos sin movimientos válidos simplemente no aparecen en el Map (mantienen `salePrice=0` por default, no requieren entrada)
  - [x] T1.4 — No modificar `product-reset.ts` ni `buildProductResetPlan()` (AC-9) — es una función y un archivo nuevos, separados.

- [x] **T2** — Paso de I/O en el orquestador (AC-7, AC-8, AC-10)
  - [x] T2.1 — Nueva función en `modules/migration/reconstruction.service.ts`, ej. `restoreProductSalePrices(): Promise<ProductPricingResult>`:
    - lee los `InventoryMovement` relevantes (`select: { productId, unitPrice, isCancelled, type, date, id }`) — puede filtrar `type: "SALE"` en la query de Prisma como optimización, pero la función pura debe seguir re-validando `type`/`isCancelled`/`unitPrice` igual (T1.3), para que el smoke test (T4) cubra el filtro real usado en producción, no una versión más permisiva
    - llama a `computeLastSalePrices()`
    - por cada entrada del Map resultante, `prisma.product.update({ where: { id: productId }, data: { salePrice } })`
    - retorna `{ productsPriced: number, productsLeftAtZero: number }` (`productsLeftAtZero` = total de `Product` recién creados en `productResult.productsRecreated` menos `productsPriced`)
  - [x] T2.2 — Agregar tipo exportado:
    ```typescript
    export interface ProductPricingResult {
      productsPriced: number;
      productsLeftAtZero: number;
    }
    ```
  - [x] T2.3 — En `executeReconstruction()`: invocar `restoreProductSalePrices()` **solo si** `reimportProducts === true` (es decir, `productResult !== null`) **y** después de que la validación de `shiftsResult.shiftsFailed > 0` ya haya pasado (el bloque que hoy retorna `failedPhase: "shifts"` en caso de fallos) — insertar la llamada justo antes de la invocación actual a `finalizeSyncMode()`. Este paso es obligatorio dentro del pipeline: su fallo debe bloquear la ejecución antes de llegar a `finalizeSyncMode()`.
  - [x] T2.4 — Envolver la llamada en `try/catch`: en caso de error, retornar **inmediatamente** (return temprano) `{ success: false, failedPhase: "pricing", failureMessage, deleteResult, productResult, membersResult, shiftsResult, pricingResult: null, finalizeResult: null, finalizeWarning: null }` — el mismo patrón de return temprano que ya usan las fases `"products"`/`"members"`/`"shifts"` (`reconstruction.service.ts:242-260`), **no** el patrón de `finalizeWarning`. No existe `pricingWarning`. `finalizeSyncMode()` no se invoca tras este return.
  - [x] T2.5 — Agregar `"pricing"` al union type `ReconstructionPhase` (entre `"shifts"` y `"finalize"`) y agregar `pricingResult: ProductPricingResult | null` (sin `pricingWarning`, que no se introduce) a `ReconstructionExecutionResult`. Poblar `pricingResult: null` en TODOS los `return` tempranos existentes de fases anteriores (`validation`, `delete`, `products`, `members`, `shifts`) y en el nuevo `return` temprano de la fase `"pricing"`; solo el `return` final de éxito lleva `pricingResult` con el valor real.

- [x] **T3** — No regresión de `taxRate` (AC-9)
  - [x] T3.1 — Confirmar que `npm run smoke:product-reset` sigue pasando sin modificaciones a su código ni a `product-reset.ts`.

- [x] **T4** — Smoke test de la función pura (AC-1 a AC-6, AC-11)
  - [x] T4.1 — Crear `scripts/product-pricing-smoke-test.ts` siguiendo el patrón exacto de `scripts/product-reset-smoke-test.ts` (función `assert()`, sin dependencias externas, import directo de la función pura).
  - [x] T4.2 — Caso: historial simple → `salePrice` = ese `unitPrice` (AC-1).
  - [x] T4.3 — Caso: conflicto $42 (fecha temprana) / $45 (fecha tardía) → resultado $45 (AC-2).
  - [x] T4.4 — Caso: producto sin movimientos `SALE` en el array de entrada → no aparece en el Map resultante (AC-3).
  - [x] T4.5 — Caso: último `SALE` válido cronológicamente tiene `unitPrice=0` → resultado `0`, no un valor anterior no-cero (AC-4).
  - [x] T4.6 — Caso: `SALE` cancelado (`isCancelled=true`) posterior a uno válido → gana el válido anterior, no el cancelado (AC-5).
  - [x] T4.7 — Caso: movimiento `type="ADJUSTMENT"` con `unitPrice` presente → se ignora completamente (AC-6).
  - [x] T4.8 — Caso: dos movimientos con `date` idéntico para el mismo producto → gana el de `id` mayor (determinismo).
  - [x] T4.9 — Registrar el script en `package.json` como `"smoke:product-pricing": "tsx scripts/product-pricing-smoke-test.ts"`, siguiendo la convención existente.

---

## Dev Notes

### Archivos que CAMBIAN (UPDATE)

| Archivo | Cambio |
|---|---|
| `modules/migration/reconstruction.service.ts` | Nueva función `restoreProductSalePrices()`; nuevo valor `"pricing"` en el union `ReconstructionPhase`; nuevo campo `pricingResult` en `ReconstructionExecutionResult`; nueva invocación **obligatoria y bloqueante** en `executeReconstruction()` entre la validación de `shiftsResult` y `finalizeSyncMode()` — su fallo produce `return` temprano con `failedPhase:"pricing"` |
| `package.json` | Nuevo script `smoke:product-pricing` |

### Archivos NUEVOS (CREATE)

| Archivo | Contenido |
|---|---|
| `modules/migration/domain/product-pricing.ts` | Función pura `computeLastSalePrices()` + tipo `SaleMovementForPricing` |
| `scripts/product-pricing-smoke-test.ts` | Smoke test de la función pura, sin DB |

### Archivos que NO cambian

- `modules/migration/domain/product-reset.ts` — no se toca (AC-9); la lógica de `taxRate` es completamente independiente y ya funciona.
- `scripts/product-reset-smoke-test.ts` — no se modifica, solo se re-ejecuta como regresión (T3.1).
- `modules/migration/migration.service.ts` (`syncShifts`, `finalizeSyncMode`) — **no se tocan**. El comentario en `reconstruction.service.ts:1-7` es explícito: estas funciones se reutilizan "unmodified" desde Epic 1. El nuevo paso vive enteramente en `reconstruction.service.ts`, consumiendo el resultado ya persistido por `syncShifts()`, no modificando su implementación.
- `prisma/schema.prisma` — no requiere cambios; `salePrice` ya existe como `Decimal @default(0)`.
- D1 (backfill de la DB actual) — explícitamente fuera de esta Story.

### Por qué una función pura separada (`product-pricing.ts`) y no lógica inline en el service

Sigue el mismo patrón ya establecido en este módulo: `product-reset.ts` es puro y testeable sin DB (`buildProductResetPlan`), mientras `reconstruction.service.ts` hace únicamente I/O y orquestación. Aplicar el mismo patrón aquí permite cumplir AC-11 (verificar todos los casos de conflicto/cancelación/tipo sin ejecutar Reconstruction ni tocar DB) reusando la convención de smoke test ya existente en `scripts/`.

### Sobre el filtrado en la query de Prisma vs. en la función pura

`restoreProductSalePrices()` puede optimizar la lectura filtrando `type: "SALE"` en el `where` de Prisma (menos filas transferidas), pero **no debe** confiar únicamente en ese filtro — `computeLastSalePrices()` debe volver a validar `type`/`isCancelled`/`unitPrice` internamente. Esto es intencional: el smoke test (T4) ejercita la función pura con arrays mixtos (incluyendo movimientos cancelados y no-`SALE`) para probar que la regla se respeta con datos reales de forma determinista, independientemente de qué tan permisiva o estricta sea la query SQL real el día de mañana.

### Sobre el manejo de `productsLeftAtZero`

No es necesario consultar aparte "cuántos productos no tienen historial" — se deriva por resta: `productResult.productsRecreated - productsPriced`. Evita una query adicional.

### Punto de inserción exacto en `executeReconstruction()`

Insertar entre este bloque existente (línea ~314-327, verificación de `shiftsResult.shiftsFailed`) y la llamada actual a `finalizeSyncMode()` (línea ~331-339). Pseudocódigo del cambio:

```typescript
// ... (verificación existente de shiftsResult.shiftsFailed > 0, sin cambios)

let pricingResult: ProductPricingResult | null = null;
if (reimportProducts) {
  try {
    pricingResult = await restoreProductSalePrices();
  } catch (e) {
    return {
      success: false,
      failedPhase: "pricing",
      failureMessage:
        "La base de datos fue vaciada, los socios y cortes se importaron correctamente, pero la restauración de precios de venta (salePrice) falló. Restaura desde el respaldo para recuperar el estado anterior. " +
        (e instanceof Error ? e.message : "Error desconocido"),
      deleteResult,
      productResult,
      membersResult,
      shiftsResult,
      pricingResult: null,
      finalizeResult: null,
      finalizeWarning: null,
    };
  }
}

// ... (finalizeSyncMode existente, sin cambios — no se ejecuta si el bloque anterior ya retornó)

return {
  success: true,
  // ...campos existentes...
  pricingResult,
  finalizeResult,
  finalizeWarning,
};
```

Los `return` tempranos de fases previas (`"validation"`, `"delete"`, `"products"`, `"members"`, `"shifts"`) deben agregar `pricingResult: null` para que el tipo `ReconstructionExecutionResult` sea consistente en todos los caminos de retorno. No existe `pricingWarning` — el fallo de este paso siempre es `failedPhase`, nunca advertencia.

### Riesgo de rendimiento (bajo, no bloqueante)

`restoreProductSalePrices()` hace un `update` por producto con precio determinado (hasta ~113 en la DB actual). Aceptable para una operación administrativa infrecuente como Reconstruction — no requiere batching especial. Si el catálogo creciera significativamente, una alternativa es un único `UPDATE ... FROM (VALUES ...)` raw, pero no se justifica para el volumen actual.

---

## Casos de Prueba (smoke test — sin DB, sin Reconstruction real)

Ejecutar con `npm run smoke:product-pricing` una vez creado.

```
Input: [
  { productId: 1, unitPrice: 42, isCancelled: false, type: "SALE", date: 2026-01-01, id: 10 },
  { productId: 1, unitPrice: 45, isCancelled: false, type: "SALE", date: 2026-03-01, id: 55 },
]
Esperado: Map { 1 => 45 }   (AC-2)

Input: [
  { productId: 2, unitPrice: 30, isCancelled: false, type: "SALE", date: 2026-01-01, id: 11 },
  { productId: 2, unitPrice: 0,  isCancelled: false, type: "SALE", date: 2026-02-01, id: 12 },
]
Esperado: Map { 2 => 0 }    (AC-4 — no rescata el 30 anterior)

Input: [
  { productId: 3, unitPrice: 99, isCancelled: false, type: "SALE", date: 2026-01-01, id: 13 },
  { productId: 3, unitPrice: 120, isCancelled: true,  type: "SALE", date: 2026-02-01, id: 14 },
]
Esperado: Map { 3 => 99 }   (AC-5 — ignora el cancelado, aunque sea más reciente)

Input: [
  { productId: 4, unitPrice: 50, isCancelled: false, type: "ADJUSTMENT", date: 2026-01-01, id: 15 },
]
Esperado: Map {}  (sin entrada para productId 4 — AC-6, no es SALE)

Input: []  (producto 5 nunca aparece)
Esperado: Map {}  (AC-3 — salePrice queda en su default 0, sin acción)
```

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Un desarrollador intenta "simplificar" moviendo el cálculo de vuelta a `resetProducts()` | Media | Alto (reintroduce el bug, ya que ahí no existen los `InventoryMovement`) | Este documento deja explícito por qué no es posible — ver sección "Por qué NO se puede corregir dentro de `resetProducts()`" |
| Un fallo aislado en el update de `salePrice` (ej. un solo `Product.update` fallido) aborta la Reconstruction completa aunque socios/cortes ya se importaron con éxito | Baja | Medio | Comportamiento intencional (ver AC-10) — D2 existe justamente para que esta condición nunca termine en éxito silencioso con `salePrice` perdido; el mensaje de fallo indica restaurar desde el respaldo, igual que las demás fases |
| Confundir esta Story con D1 (backfill de la DB actual) | Media si no se lee el plan | Medio | Este documento no toca la DB actual ni ejecuta Reconstruction — es exclusivamente el fix de código para reconstrucciones futuras |

---

## Dev Agent Record

**Estado:** Implementación completa. Todos los AC (AC-1 a AC-11) satisfechos. Validaciones (smoke tests, TypeScript, lint sobre archivos nuevos/modificados) en verde.

### File List

- `modules/migration/domain/product-pricing.ts` (nuevo) — `computeLastSalePrices()` pura + tipo `SaleMovementForPricing`.
- `scripts/product-pricing-smoke-test.ts` (nuevo) — smoke test sin DB, 7 casos (AC-1 a AC-6, más caso extra `unitPrice=null`).
- `modules/migration/reconstruction.service.ts` (modificado) — nueva función `restoreProductSalePrices(productsRecreated)`; tipo `ProductPricingResult`; `"pricing"` agregado a union `ReconstructionPhase`; campo `pricingResult` agregado a `ReconstructionExecutionResult`; invocación obligatoria y bloqueante en `executeReconstruction()` entre la validación de `shiftsResult` y `finalizeSyncMode()`.
- `package.json` (modificado) — nuevo script `smoke:product-pricing`.

### Change Log

- Implementación inicial de D2: derivación de `Product.salePrice` desde historial real de `InventoryMovement` tipo `SALE` tras Reconstruction con `reimportProducts=true`. Fallo del paso aborta la Reconstruction completa (`failedPhase:"pricing"`, `success:false`) — no es advertencia no bloqueante.

### Completion Notes

- `computeLastSalePrices()` implementada exactamente según T1.3: filtra `type==="SALE" && !isCancelled && unitPrice!==null`, agrupa por `productId`, gana el `date` más reciente, empate por `id` mayor. Sin Prisma, sin I/O.
- `restoreProductSalePrices()` recibe `productsRecreated` como parámetro (no hace `prisma.product.count()`) para derivar `productsLeftAtZero` por resta, evitando la query adicional que señalan las Dev Notes.
- La query de Prisma filtra `type: "SALE"` como optimización, pero `computeLastSalePrices()` sigue revalidando `type`/`isCancelled`/`unitPrice` internamente (T2.1) — el smoke test cubre el filtro real de producción, no una versión permisiva.
- `restoreProductSalePrices()` se invoca solo si `reimportProducts && productResult` (AC-8), después de que `shiftsResult.shiftsFailed > 0` ya fue validado y antes de `finalizeSyncMode()`. Su `catch` retorna de inmediato `{ success:false, failedPhase:"pricing", ... }` — mismo patrón de return temprano que las fases `"products"`/`"members"`/`"shifts"` (AC-10). No existe `pricingWarning`; no hay rollback manual ni segunda Reconstruction automática — solo el mensaje sanado ("Restaura desde el respaldo...") que ya usan las demás fases.
- Todos los `return` tempranos de `executeReconstruction()` (incluidos los de `"validation"`, `"delete"`, `"products"`, `"members"`, `"shifts"`) incluyen `pricingResult: null` para mantener el tipo consistente en todos los caminos.
- `taxRate`/`buildProductResetPlan()`/`product-reset.ts` no se tocaron — `npm run smoke:product-reset` sigue en verde sin cambios (AC-9, T3.1).
- Ninguna contradicción técnica encontrada con el diseño aprobado — no fue necesario ampliar el alcance ni detenerse por eso.

**Validación ejecutada:**
- `npm run smoke:product-pricing` → 7/7 ✓
- `npm run smoke:product-reset` → 9/9 ✓ (sin regresión de `taxRate`)
- `npm run smoke:reconstruction-report`, `smoke:sync-finalize`, `smoke:shift-sync` → todos en verde (suite relevante existente del módulo migration)
- `npx tsc --noEmit` → sin errores
- `npm run lint` → sin errores/warnings nuevos en archivos tocados por esta Story (`npx eslint` dirigido a los 3 archivos nuevos/modificados confirma 0 problemas); los 590 errores/2000 warnings reportados por `npm run lint` global son deuda preexistente, ninguno en los archivos de esta Story.
- No se ejecutó Sync ni Reconstruction real, ni se escribió en la DB real, conforme a lo solicitado.
