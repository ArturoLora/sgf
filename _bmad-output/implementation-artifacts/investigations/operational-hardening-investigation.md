# Investigation: SGF Operational Hardening

## Hand-off Brief

1. **What happened.** Análisis pre-piloto de estabilidad operativa. Sistema funcional (25/25 smoke tests), pero con 3 gaps de hardening confirmados que pueden producir errores opacos para el operador durante el piloto real.
2. **Where the case stands.** Evidencia completa. 3 hallazgos de media severidad y 4 de baja. Race condition en openShift mitigada por constraint de DB pero con mensaje genérico. `alert()` en POS bloquea UI. Sale route sin validación Zod → errores DB en vez de mensajes limpios.
3. **What's needed next.** Revisar y aprobar la lista priorizada. Los 3 ítems "antes del piloto" son pequeños (1–2 horas cada uno) y eliminan los errores más confusos para el cajero.

---

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | N/A — investigación estratégica de hardening |
| Date opened | 2026-05-22 |
| Status | Concluded |
| System | Next.js 16.1.1, Prisma 6.19.2, PostgreSQL, single-cashier, single-gym |
| Evidence sources | services/shifts.service.ts, modules/inventory/inventory.service.ts, app/api/inventory/sale/route.ts, app/(dashboard)/ventas/_components/, prisma/schema.prisma, lib/orchestrators/renewal.orchestrator.ts |

---

## Problem Statement

Pre-piloto: ¿qué mejoras pequeñas pero operativamente críticas mejorarían la estabilidad del sistema en uso real? Foco: logging, observabilidad, UX de errores, race conditions, y recuperación. No sobreingeniería.

---

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------- | ----- |
| services/shifts.service.ts | Available | validateNoOpenShift + validateNoSystemOpenShift (sequential, no lock) |
| modules/inventory/inventory.service.ts | Available | createSale — stock check fuera de transaction, shiftId no validado |
| app/api/inventory/sale/route.ts | Available | Sin Zod parse — body directo al servicio |
| app/(dashboard)/ventas/_components/*.tsx | Available | 5 `alert()` en ventas-container + ventas-form |
| prisma/schema.prisma:217 | Available | `folio String @unique` — constraint protege race condition de shifts |
| lib/orchestrators/renewal.orchestrator.ts | Available | Único console.warn (turno no activo) — bien documentado |
| lib/api/*.client.ts | Available | Sin manejo de 401 — sesión expirada queda opaca |

---

## Investigation Backlog

| # | Path | Priority | Status | Notes |
| - | ---- | -------- | ------ | ----- |
| 1 | Mensaje genérico en race condition de openShift | High | Done | folio @unique captura el race; error llega como string no descriptivo |
| 2 | alert() en ventas — UX bloqueante | High | Done | 5 lugares: container x3 + form x2 |
| 3 | Sale route sin Zod validation | Medium | Done | Body va directo al service |
| 4 | shiftId=null en POS — gap de API | Medium | Done | UI guarda pero API no valida |
| 5 | Stock check fuera de transaction | Medium | Done | Race condition solo relevante con >1 cajero concurrente |
| 6 | Sesión expirada sin redirect | Low | Done | 401 no dispara redirect en clientes API |
| 7 | Close shift sin validación de propietario | Low | Done | Cualquier user puede cerrar shift ajeno |
| 8 | Observabilidad: ventas sin turno | Low | Done | Solo detectable via DB query manual |

---

## Confirmed Findings

### Finding 1: Race condition en openShift — mitigada pero con error opaco

**Evidence:** `services/shifts.service.ts:188-199`

```typescript
async function validateNoOpenShift(cashierId: string): Promise<void> {
  const openShift = await prisma.shift.findFirst({ where: { cashierId, closingDate: null } });
  if (openShift) throw new Error("Ya tienes un corte abierto");
}
// ← no hay lock entre este check y el prisma.shift.create()
async function validateNoSystemOpenShift(): Promise<void> {
  const openShift = await prisma.shift.findFirst({ where: { closingDate: null } });
  if (openShift) throw new Error("Ya existe un corte abierto en el sistema");
}
```

**Mitigación confirmada:** `prisma/schema.prisma:217` → `folio String @unique`. Si dos requests concurrentes pasan ambas validaciones, el segundo `prisma.shift.create` falla con `P2002` (unique constraint violation). El error se propaga como `status 400` con el mensaje interno de Prisma: `"Unique constraint failed on the fields: (folio)"`. El operador ve este mensaje técnico en el toast/alert.

**Impacto real:** En piloto de un cajero por turno, la probabilidad es prácticamente cero. Pero si el botón "Abrir turno" se presiona dos veces rápido (doble-click), el segundo request falla con mensaje confuso.

---

### Finding 2: alert() en POS — 5 lugares, UI bloqueante

**Evidence:**
- `app/(dashboard)/ventas/_components/ventas-container.tsx:80` — "No hay un corte abierto..." al añadir al carrito
- `app/(dashboard)/ventas/_components/ventas-container.tsx:144` — mismo mensaje al finalizar
- `app/(dashboard)/ventas/_components/ventas-container.tsx:185` — cualquier error en finalizar venta
- `app/(dashboard)/ventas/_components/ventas-form.tsx:77` — "Cliente no encontrado"
- `app/(dashboard)/ventas/_components/ventas-form.tsx:81` — "Error al buscar cliente"

**Contraste:** En `socios/`, `cortes/`, `crear-socio-modal.tsx` — todos usan `setError(message)` con UI inline (no alert). El módulo de ventas es el único que usa `window.alert()`.

**Impacto real:** `alert()` abre un diálogo modal del sistema operativo que:
1. Bloquea toda interacción con la página hasta que se cierra
2. No puede ser estilizado — aspecto inconsistente con la app
3. No desaparece automáticamente — el cajero DEBE hacer clic en "OK"
4. En sistemas táctiles o pantallas pequeñas, puede quedar fuera de vista

---

### Finding 3: Sale route pasa body directo a service sin Zod parse

**Evidence:** `app/api/inventory/sale/route.ts:17`

```typescript
const body = await request.json();
const sale = await InventoryService.createSale(body, session.user.id);
// ← sin CreateSaleInputSchema.parse(body)
```

**Contraste:** `app/api/shifts/route.ts:18` usa `OpenShiftSchema.parse(body)` correctamente. La ruta de sales no valida.

**Consecuencia confirmada:** Si llega un body malformado (ej: `productId` como string, `paymentMethod` desconocido), el error será de Prisma/TypeScript en runtime, no un mensaje de Zod con campo específico. El status code será `400` con un mensaje técnico de DB. El cajero no sabe qué campo está mal.

**Mismo patrón en:** `app/api/inventory/entry/route.ts`, `app/api/inventory/adjustment/route.ts`, `app/api/inventory/transfer/route.ts`.

---

### Finding 4: Sale con shiftId=null posible via API directa

**Evidence:** `app/(dashboard)/ventas/_components/ventas-container.tsx:164` → `shiftId: activeShiftId ?? undefined` + `modules/inventory/inventory.service.ts:325` → `shiftId: data.shiftId` (sin validación de non-null).

**UI protege:** La UI verifica `hasActiveShift` antes de permitir añadir al carrito (`ventas-container.tsx:80`). `activeShiftId` se carga al montar el componente via `checkActiveShift()`.

**Gap real:** La API no valida que `shiftId` sea non-null. Si alguien llama directamente a `POST /api/inventory/sale` con `shiftId: null`, la venta se crea con `shiftId: null` y no aparece en ningún corte. Para piloto de un solo cajero usando la UI, esto no ocurre. Sí es un gap de integridad de datos.

---

### Finding 5: Stock check de ventas fuera de transaction — race condition teórica

**Evidence:** `modules/inventory/inventory.service.ts:299-308`

```typescript
const isMembership = isMembershipProduct(product.name);
if (!isMembership) {
  validarStockDisponible(product, data.quantity, "GYM");
  // ← check aquí, ANTES del $transaction a continuación
}
const inventoryMovement = await prisma.$transaction(async (tx) => {
  // ...stock decrement aquí
});
```

**Severidad real para piloto:** En un gimnasio con un cajero, dos ventas del mismo producto raramente son concurrentes. Sería necesario hacer dos requests en paralelo del mismo producto con stock mínimo. Prácticamente imposible en el piloto supervisado de bajo volumen.

---

### Finding 6: Sin manejo de 401 en API clients — sesión expirada silenciosa

**Evidence:** `lib/api/*.client.ts` — ningún archivo tiene lógica de redirect cuando response.status === 401.

**Comportamiento confirmado:** Si la sesión de better-auth expira durante un turno, la siguiente operación (venta, retiro, etc.) fallará con un error genérico del tipo "Error al crear venta" o similar. El cajero no sabrá que necesita hacer login nuevamente.

**Mitigación natural:** En piloto de 1 turno/día, la sesión tiene tiempo de vida suficiente (depende de config de better-auth). Si el dueño supervisa el primer turno, este caso se detectaría inmediatamente.

---

### Finding 7: Close shift no valida propietario

**Evidence:** `app/api/shifts/close/route.ts` — pasa el input a `ShiftsService.closeShift(input)` sin verificar que `session.user.id === shift.cashierId`.

**Severidad real:** Para piloto de un cajero, no es un riesgo. Si hubiera dos usuarios autenticados simultáneamente (improbable), uno podría cerrar el turno del otro.

---

## Deduced Conclusions

### Deduction 1: Los 3 únicos ítems con impacto real en piloto son Finding 1 (mensaje opaco), Finding 2 (alert()), y Finding 3 (Zod en sale route)

**Based on:** Context de piloto (single cashier, supervised, low volume, browser UI only)

**Reasoning:**
- Finding 4 (shiftId null via API) no ocurre cuando se usa la UI. Solo vulnerable a acceso directo a API.
- Finding 5 (stock race) requiere concurrencia — imposible con 1 cajero.
- Finding 6 (401 silencioso) ocurre solo si la sesión expira — el dueño supervisa.
- Finding 7 (cierre sin validar propietario) requiere 2 usuarios simultáneos.
- Finding 2 (alert) ocurre en CADA error en ventas — el módulo más usado.

**Conclusion:** Los 3 ítems "antes del piloto" son los únicos con probabilidad real de impactar la primera semana.

---

### Deduction 2: La observabilidad mínima para el piloto ya existe vía server logs + smoke test

**Based on:** `console.warn` en renewal.orchestrator.ts, Prisma error propagation a route, server logs del proceso `npm run dev`

**Reasoning:** En piloto supervisado, el dueño puede observar:
- Diferencias en corte → se ven directamente en la UI del arqueo
- Ventas sin turno → `SELECT * FROM inventory_movement WHERE shiftId IS NULL`
- Fallos de renovación → server logs del proceso
- Retiros sospechosos → el dueño los registró físicamente también

No se necesita un sistema de logging estructurado para piloto. Sería sobreingeniería.

**Conclusion:** Logging post-piloto (Finding nivel bajo) es trabajo para Fase C del roadmap.

---

## Hypothesized Paths

### Hypothesis 1: Doble-click en "Abrir turno" puede confundir al cajero con error de folio

**Status:** Open

**Theory:** El botón "Abrir turno" no está deshabilitado durante la petición HTTP. Un cajero puede hacer click dos veces. El primer request crea el turno. El segundo falla con `P2002 Unique constraint failed on the fields: (folio)`. El cajero ve este mensaje técnico y no sabe si el turno se abrió o no.

**Would confirm:** Ver el botón "Abrir turno" en cortes-manager.tsx para verificar estado de loading durante el request.

**Would refute:** El botón tiene `disabled` durante la petición y/o usa `isLoading` state.

**Resolution:** Pendiente — verificar `cortes-manager.tsx`.

---

## Missing Evidence

| Gap | Impact | How to Obtain |
|-----|--------|---------------|
| Estado del botón "Abrir turno" durante request | Confirma Hypothesis 1 | `grep -n "isLoading\|disabled\|procesando" app/(dashboard)/cortes/_components/cortes-manager.tsx` |
| Configuración de TTL de sesión en better-auth | Cuantifica riesgo de Finding 6 | `grep -n "expiresIn\|maxAge\|session" lib/auth.ts` |

---

## DIAGNÓSTICO OPERACIONAL

### Estado actual resumido

| Área | Estado | Riesgo piloto |
|------|--------|--------------|
| Shift state machine | Functional + folio @unique como backstop | Race condition: Bajo — DB captura, mensaje confuso |
| POS error UX | 5 `alert()` bloqueantes | Medio — molesto, no bloquea |
| Sale API validation | Sin Zod — DB errors al frontend | Medio — mensajes técnicos confusos |
| shiftId en sales | UI valida, API no | Bajo — solo via API directa |
| Stock concurrencia | Check fuera de tx | Bajo — 1 cajero = no concurrencia real |
| Sesión expirada | Silenciosa | Bajo — TTL largo en piloto |
| Observabilidad | Server logs únicamente | Bajo — suficiente para piloto supervisado |
| Recuperación (browser close) | Shift + datos persisten en DB | Ninguno — reabre browser = estado recuperado |
| Recuperación (internet drop) | Carrito en memoria cliente | Bajo — cart no se pierde en drop, solo al refresh |

---

## LISTA PRIORIZADA

---

### ⚡ ANTES DEL PILOTO (bajo esfuerzo, alto valor)

#### BH-1 — Reemplazar `alert()` en ventas con UI inline
**Archivo:** `app/(dashboard)/ventas/_components/ventas-container.tsx` (3 alerts), `ventas-form.tsx` (2 alerts)  
**Fix:** Mismo patrón que socios/cortes: `const [error, setError] = useState("")` + `{error && <Alert>}</Alert>}` en la UI  
**Esfuerzo:** ~1 hora  
**Valor:** Alto — el módulo de ventas es el más usado en turno. Cada alert() bloquea la UI completa.  
**¿Sobreingeniería?** No. El patrón ya existe en todos los demás módulos.

#### BH-2 — Añadir Zod parse a `app/api/inventory/sale/route.ts`
**Fix:** `const validated = CreateSaleInputSchema.parse(body); const sale = await InventoryService.createSale(validated, session.user.id);`  
**Esfuerzo:** ~15 minutos  
**Valor:** Medio-Alto — si el frontend envía un campo malformado, el cajero recibe "paymentMethod is invalid" en lugar de un error de Prisma.  
**¿Sobreingeniería?** No. Es la misma línea que ya existe en shifts/route.ts.  
**Bonus:** Mismo fix aplica a `entry/`, `adjustment/`, `transfer/` routes — 4 archivos, 15 min cada uno.

#### BH-3 — Mejorar mensaje en error de folio duplicado (race condition de doble-click)
**Archivo:** `services/shifts.service.ts` (openShift) o `app/api/shifts/route.ts`  
**Fix:** En el catch del route, detectar error P2002 y retornar "Ya existe un turno abierto. Recarga la página." en lugar del mensaje de Prisma.  
**Esfuerzo:** ~30 minutos  
**Valor:** Medio — previene confusión en el primer doble-click de un cajero nervioso.  
**¿Sobreingeniería?** No. Un catch + mensaje específico.

---

### 📋 DURANTE EL PILOTO (observar, no implementar)

#### BP-1 — Monitorear ventas con shiftId=null
**Acción:** Query semanal: `SELECT id, date, total FROM inventory_movement WHERE shiftId IS NULL AND type='SALE' ORDER BY date DESC`  
**Qué indica:** Si aparecen registros, alguien llamó a la API directamente o hubo bug de estado en UI.  
**Decisión:** Si 0 registros en 2 semanas → Finding 4 no es real para este piloto. Si hay registros → añadir validación API en Fase A.

#### BP-2 — Monitorear `console.warn` de turno-no-activo en renovaciones
**Acción:** Revisar server logs periódicamente por `[renewal.orchestrator] memberId=X renovado sin turno activo`  
**Qué indica:** Cajero está renovando membresías antes de abrir turno. Enseñar el flujo correcto.

#### BP-3 — Monitorear diferencias en corte
**Acción:** `SELECT folio, difference FROM shift WHERE closingDate IS NOT NULL ORDER BY closingDate DESC`  
**Umbral de alarma:** `|difference| > $100` recurrente o patrón sistemático negativo.

#### BP-4 — Anotar cuándo expira la sesión naturalmente
**Acción:** Cronometrar cuánto dura la sesión de better-auth en uso real. Si expira antes de cerrar turno → priorizar BH-4 post-piloto.

---

### 🔵 DESPUÉS DEL PILOTO (solo si los datos del piloto lo justifican)

#### BP-D1 — Redirect automático en 401 en lib/api clients
**Cuando:** Si sesión expira durante turno en piloto → prioritario. Si no expira → diferir a Fase C.  
**Fix:** En cada `*.client.ts`, detectar `response.status === 401` y hacer `window.location.href = '/login'`.  
**¿Sobreingeniería?** Sí antes de confirmar que es un problema real. No si expira en piloto.

#### BP-D2 — Validar propietario en closeShift
**Cuando:** Si se añade un segundo cajero.  
**Fix:** `if (shift.cashierId !== session.user.id && session.user.role !== 'ADMIN') throw new Error(...)`.  
**¿Sobreingeniería?** Sí para piloto de 1 cajero.

#### BP-D3 — Stock check dentro de transaction
**Cuando:** Si volumen sube a múltiples cajeros concurrentes.  
**Fix:** Mover `validarStockDisponible` dentro del `$transaction`.  
**¿Sobreingeniería?** Sí para piloto de 1 cajero.

#### BP-D4 — Logging estructurado (Pino/Winston)
**Cuando:** En Fase C cuando el equipo crezca y los logs de consola ya no sean suficientes.  
**¿Sobreingeniería?** Sí para piloto.

#### BP-D5 — `shiftId` required en sale API
**Cuando:** Si BP-1 detecta ventas con shiftId=null durante piloto.  
**Fix:** Añadir `.required()` a `CreateSaleInputSchema.shiftId` + validar en createSale.  
**¿Sobreingeniería?** Sí si BP-1 no detecta el problema.

---

## CRITERIO "VALE LA PENA vs SOBREINGENIERÍA"

| Criterio | ¿Vale la pena? |
|----------|---------------|
| El cajero verá este error en la primera semana | Sí |
| El error produce confusión de estado (¿se guardó o no?) | Sí |
| El fix es < 2 horas y no toca lógica de negocio | Sí |
| Solo ocurre con >1 cajero concurrente y el piloto es 1 cajero | No |
| Solo ocurre si alguien llama la API directamente (fuera del flujo UI) | No para piloto |
| Requiere nuevo sistema/infraestructura | No — diferir a Fase C |
| Los datos del piloto aún no confirman que sea un problema | Depende de observación |

---

## RECUPERACIÓN OPERATIVA — Escenarios

| Escenario | Comportamiento actual | Acción requerida |
|-----------|----------------------|-----------------|
| Internet cae durante el turno | Carrito en memoria RAM del navegador. Ventas ya completadas persisten en DB. | Reconectar → la app retoma estado desde DB |
| Navegador cerrado mid-turno | Shift permanece abierto en DB con todas las ventas hasta ese momento | Reabrir browser → login → cortes → turno activo aparece |
| Página recargada con carrito lleno | Carrito se pierde (estado React) | El cajero repite los ítems — no hay persistencia de carrito |
| Dos cajeros simultáneos | El segundo no puede abrir turno propio. PUEDE hacer ventas contra el turno activo. PUEDE cerrar el turno del primero. | Operacionalmente: 1 turno por día, 1 cajero responsable. Documentar en briefing. |
| Turno quedó abierto overnight | Al día siguiente el sistema lo mostrará como activo. Las ventas del día siguiente se agregarán al mismo turno. | Opción manual: cerrar el turno con los valores del día anterior → abrir nuevo turno |
| Turno quedó abierto — ¿cómo detectarlo? | `GET /api/shifts/active` retorna el turno si existe | El dueño verifica en la UI de Cortes al inicio del día |

**Escenario más peligroso: turno olvidado abierto.** Un turno que queda abierto overnight acumulará ventas del día siguiente. El cierre de arqueo mezclará dos días de ventas. 

**Mitigación recomendada (sin código):** Añadir al checklist operativo: "Al inicio del día, verificar que no hay turno activo antes de abrir el nuevo".

---

## Conclusion

**Confidence:** High

**Resumen:** Sistema operativamente sólido para piloto controlado. Los 3 hallazgos de media severidad (Finding 1: mensaje opaco en race condition, Finding 2: alert() en ventas, Finding 3: sin Zod en sale route) son pequeños y tienen fixes de menos de 2 horas cada uno. El resto de los hallazgos solo se materializan en condiciones que no ocurrirán en un piloto de un cajero supervisado.

La única acción urgente es **BH-1** (reemplazar `alert()` en ventas) porque afecta la UX del módulo más usado en cada turno.

## Recommended Next Steps

### Fix direction
1. **BH-1** — `setError()` en ventas-container y ventas-form (patrón ya existe en socios/cortes)
2. **BH-2** — `CreateSaleInputSchema.parse(body)` en 4 rutas de inventario
3. **BH-3** — Catch P2002 en shifts route → mensaje específico

Todos implementables en `bmad-quick-dev` o directamente.

### Diagnostic post-piloto
Query semana 1:
```sql
SELECT id, date, total FROM inventory_movement WHERE shiftId IS NULL AND type='SALE';
SELECT folio, difference, closingDate FROM shift ORDER BY openingDate DESC LIMIT 10;
```

## Side Findings

- `app/api/shifts/close/route.ts` usa `status 400` para todos los errores incluyendo errores de servidor (DB). Los errores de cierre de turno deberían retornar `500` si son errores de infraestructura, no `400`. Impacto: bajo para piloto.
- `lib/orchestrators/renewal.orchestrator.ts:83` tiene el único `console.warn` activo del sistema — bien documentado, comportamiento intencional.
- El módulo de socios (`socios/`), cortes (`cortes/`), y productos (`productos/`) usa `setError()` con inline UI consistentemente — el patrón correcto ya existe, solo ventas se desvió.
