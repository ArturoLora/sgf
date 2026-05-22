# SGF — Cierre de Fase: Pilot Ready

**Fecha:** 2026-05-21  
**Rama:** `main`  
**Tag sugerido:** `v0.1.0-pilot`  
**Smoke tests:** ✅ 25/25 passing

---

## 1. Resumen Ejecutivo Técnico

### Problemas operativos corregidos

| # | Problema | Archivo clave | Commit |
|---|----------|---------------|--------|
| Gap 1 | Ventas POS no se ligaban al turno activo — el campo `shiftId` quedaba nulo | `modules/sales/sales.service.ts` | `1d9d4cf` |
| Gap 2 | Renovaciones de membresía no aparecían en el resumen del corte — solo se detectaban 2 tipos de membresía en vez de 6 | `services/membership-helpers.ts` + `MEMBERSHIP_KEYWORDS` | `85615a1` |
| Gap 3 | No existía UI para registrar retiros de efectivo durante el turno | `cortes/_components/registrar-retiro-modal.tsx` + `api/shifts/[id]/withdrawals/route.ts` | incluido en sesión |
| Gap 4 | Bug de doble resta: `totalWithdrawals` se descontaba dos veces en la fórmula de diferencia, generando faltantes/sobrantes falsos | `lib/domain/shifts/shift-calculations.ts` | `8cec8fa` |
| Env | Motor de Prisma no cargaba bajo Turbopack — causaba HTTP 500 en auth y todas las rutas | `next.config.ts` (detección dinámica de engine path) | sesión S83 |

### Fórmula canónica de cuadre (post Gap 4)

```
totalDeclared = cashAmount + debitCardAmount + creditCardAmount
totalEsperado = initialCash + totalSales − totalWithdrawals
diferencia    = totalDeclared − totalEsperado
```

Los retiros se descuentan **una sola vez** en `totalEsperado`. El cajero ya los retiró físicamente, por lo que `cashAmount` declarado es efectivo neto — no se restan de nuevo.

### Flujo completo que ya funciona

```
Abrir turno → Ventas POS (CASH/DEBIT_CARD) → Renovar membresía (CASH/DEBIT_CARD)
    → Registrar retiros → Cerrar turno con arqueo → Diferencia calculada correctamente
```

Todos los pasos anteriores están cubiertos por los 25 smoke tests a nivel API y validados en entorno de desarrollo local.

---

## 2. Riesgos Clasificados

### 🔴 Bloqueantes (ninguno para piloto controlado)

No hay riesgos bloqueantes conocidos para un piloto supervisado de bajo volumen.

---

### 🟡 Aceptables para piloto

| Riesgo | Descripción | Mitigación |
|--------|-------------|------------|
| **TRANSFER deshabilitado** | El método de pago TRANSFER está comentado en POS y modal de renovación con `TODO`. Si alguien lo activa vía API directa, el monto caería en `creditCardAmount` sin campo dedicado en el arqueo. | UI lo bloquea completamente. Sin acceso directo a API no hay riesgo. Monitorear logs si alguien reporta intentos. |
| **Membresías sin movimiento de inventario (FASE 3)** | Las renovaciones de membresía son visibles en el corte vía keyword match (`MEMBERSHIP_KEYWORDS`), pero **no crean un `InventoryMovement`** asociado. El kardex de membresías queda incompleto. | Para piloto alcanza con ver el resumen de `membershipSales` en el corte. El kardex completo se habilita en FASE 3 post-piloto. |
| **Validación UI manual parcial** | El smoke test cubre el flujo completo a nivel API. La UI en navegador fue validada en sesión S83 (login + auth endpoint), pero el flujo completo login→turno→venta→cierre en browser no tiene E2E automatizado. | Ejecutar el checklist manual de la Sección 3 antes del primer turno real. |
| **Un solo tenant / sin multi-sucursal** | El sistema no tiene aislamiento por sucursal. Todo es un único gimnasio. | Scope del piloto: una sola ubicación. Diseño futuro fuera de alcance. |

---

### 🔵 Mejoras futuras (no afectan piloto)

| Item | Descripción |
|------|-------------|
| **FASE 3 — Orquestador de membresías** | Crear `InventoryMovement` al renovar membresía y ligar al turno activo. Requiere un orquestador que coordine `members.service` + `inventory.service`. |
| **TRANSFER en arqueo** | Añadir campo `transferAmount` en `Shift` y en el formulario de cierre. Reactivar TRANSFER en POS y modal de renovación. |
| **E2E automatizado en browser** | Playwright/Cypress cubriendo el flujo completo login→turno→venta→cierre. |
| **Reportes de turno históricos** | `reports.service.ts` existe pero la UI de reportes no está integrada al flujo de piloto. |
| **Refactor estructural** | Ver Sección 6. |

---

## 3. Checklist de Operación (Cajero / Dueño)

### Antes de empezar el día

- [ ] Verificar que el servidor esté corriendo (`npm run dev` o proceso de producción activo)
- [ ] Ingresar con tu usuario y contraseña en `/login`
- [ ] Confirmar que no hay turno activo sin cerrar del día anterior

### Abrir turno

1. Menú lateral → **Cortes**
2. Botón **"Abrir Turno"**
3. Ingresar el efectivo inicial (fondo de caja)
4. Confirmar — el turno queda activo

### Vender producto (POS)

1. Menú lateral → **Ventas**
2. Agregar productos al carrito
3. **"Finalizar Venta"**
4. Seleccionar método de pago: **EFECTIVO** o **TARJETA DE DÉBITO**
5. Confirmar — la venta queda ligada al turno activo

> ⚠️ **NO usar TRANSFERENCIA** — está deshabilitada temporalmente. Si un cliente paga por transferencia, registrarlo como pendiente fuera del sistema por ahora.

### Renovar membresía de socio

1. Menú lateral → **Socios**
2. Buscar al socio → botón **"Renovar"**
3. Seleccionar tipo de membresía y fecha de inicio
4. Seleccionar método de pago: **EFECTIVO** o **TARJETA DE DÉBITO**
5. Confirmar — la renovación queda registrada y visible en el corte del turno

> ⚠️ **NO seleccionar TRANSFERENCIA** — deshabilitado hasta próxima versión.

### Registrar retiro de efectivo

1. Menú lateral → **Cortes** → ver tarjeta del turno activo
2. Botón **"Registrar Retiro"**
3. Ingresar monto y concepto (ej: "Pago proveedor agua")
4. Confirmar — el retiro queda guardado y se descuenta del efectivo esperado en el cierre

### Cerrar turno (arqueo)

1. Menú lateral → **Cortes**
2. Botón **"Cerrar Turno"**
3. Revisar el resumen del sistema:
   - Ventas en efectivo (sistema)
   - Ventas tarjeta (sistema)
   - Ventas membresías (sistema)
   - Total retiros registrados
   - Efectivo esperado en caja
4. Contar físicamente el dinero y declarar:
   - Efectivo contado
   - Total tarjeta (vouchers)
5. Confirmar cierre
6. El sistema calcula la **diferencia** (`declarado − esperado`):
   - `0` = cuadre perfecto
   - Positivo = **sobrante**
   - Negativo = **faltante**

### Qué NO usar todavía

| Función | Estado | Motivo |
|---------|--------|--------|
| Método de pago **TRANSFERENCIA** | ❌ Deshabilitado | El arqueo no tiene campo para declarar transferencias; se habilitará en v0.2 |
| Reportes históricos avanzados | ⚠️ Disponible pero no prioritario | Funciona a nivel API, UI no optimizada para piloto |

---

## 4. Recomendación de Piloto

### ¿Está listo para piloto controlado?

**Sí**, con las siguientes condiciones:

- **Volumen**: máximo 1 turno por día, un solo cajero
- **Tipos de pago permitidos**: CASH y DEBIT_CARD únicamente
- **Supervisión**: el dueño revisa el corte diario durante las primeras 2 semanas

### Nivel de supervisión recomendado

**Alto durante semana 1–2**, luego reducir gradualmente:

| Período | Supervisión |
|---------|------------|
| Días 1–5 | Dueño presente durante cierre de turno. Comparar diferencia del sistema vs. conteo manual independiente. |
| Días 6–14 | Revisión del corte al final del día. Validar que `difference` sea coherente con lo reportado verbalmente. |
| Desde día 15 | Revisión semanal + alertas si `\|difference\| > $50` |

### Métricas y errores a observar

| Métrica | Qué buscar | Umbral de alarma |
|---------|-----------|-----------------|
| `Shift.difference` | Faltantes/sobrantes frecuentes o sistemáticos | `\|difference\| > $100` recurrente |
| Errores HTTP 500 | Cualquier error en la consola del servidor | > 0 en operación normal |
| `membershipSales` en corte | Renovaciones del día aparecen en el resumen | Si una renovación no aparece, reportar |
| Retiros registrados vs. retiros físicos | Que el número de retiros coincida | Diferencia inexplicable = revisar concepto |
| Login / sesión | Expiración inesperada de sesión | Si ocurre más de 1 vez/turno |

### Cómo reportar un problema

Registrar en bitácora física:
```
Fecha | Acción | Resultado esperado | Resultado obtenido | Captura de pantalla
```

---

## 5. Refactor Estructural Pendiente

> **Este refactor se realizará DESPUÉS del piloto, no antes.**

### Estado actual

El código de negocio está distribuido en dos capas:

| Capa | Contenido | Estado |
|------|-----------|--------|
| `modules/` | members, products, sales, inventory | ✅ Migrados |
| `services/` | shifts, reports, users | ⏳ Pendientes de migrar |
| `lib/domain/` | Lógica legacy de ventas, cortes, reportes | ⏳ Siendo migrada gradualmente |

### Por qué esperar

- Migrar `services/shifts.service.ts` (22.9 KB, core del corte de caja) durante el piloto introduce riesgo innecesario
- La arquitectura modular ya funciona; la ubicación de los archivos es una deuda técnica sin impacto en usuario final
- Post-piloto, con datos reales y flujos validados, el refactor será más seguro y con criterios más claros

### Qué incluirá el refactor (v0.2)

1. Mover `services/shifts.service.ts` → `modules/shifts/shifts.service.ts`
2. Mover `services/reports.service.ts` → `modules/reports/reports.service.ts`
3. Mover `services/users.service.ts` → `modules/users/users.service.ts`
4. Limpiar `lib/domain/` delegando a módulos correspondientes
5. Actualizar `services/index.ts` para re-exportar desde nuevas ubicaciones
6. Habilitar TRANSFER + campo `transferAmount` en `Shift` + UI de arqueo

---

## 6. Tag y Commit de Estabilización

### Tag

```
v0.1.0-pilot
```

### Mensaje de commit

```
chore(release): v0.1.0-pilot — phase closure

Closes all 4 operational gaps for pilot launch:
- Gap 1: POS sales linked to active shift via shiftId
- Gap 2: Membership renewals visible in shift summaries (6 keyword types)
- Gap 3: Cash withdrawal UI (RegistrarRetiroModal + CashWithdrawal API)
- Gap 4: Fix double-subtraction bug in shift difference formula

Additional:
- Fix Prisma engine resolution under Turbopack (next.config.ts)
- Disable TRANSFER payment method until closeShift supports transferAmount
- Smoke test suite: 25/25 assertions passing

Known limitations (post-pilot):
- TRANSFER payment method disabled (UI-level only)
- Membership renewals do not create InventoryMovements (FASE 3 pending)
- services/ → modules/ structural migration deferred to v0.2

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### Comandos para taggear

```bash
git add -A
git commit -m "chore(release): v0.1.0-pilot — phase closure

Closes all 4 operational gaps for pilot launch:
- Gap 1: POS sales linked to active shift via shiftId
- Gap 2: Membership renewals visible in shift summaries (6 keyword types)
- Gap 3: Cash withdrawal UI (RegistrarRetiroModal + CashWithdrawal API)
- Gap 4: Fix double-subtraction bug in shift difference formula

Additional:
- Fix Prisma engine resolution under Turbopack (next.config.ts)
- Disable TRANSFER payment method until closeShift supports transferAmount
- Smoke test suite: 25/25 assertions passing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git tag -a v0.1.0-pilot -m "Pilot release — all 4 gaps closed, 25/25 smoke tests passing"
```

---

## Verificaciones Pre-Piloto

| Check | Estado |
|-------|--------|
| `npm run smoke` → 25/25 | ✅ |
| Prisma engine bajo Turbopack | ✅ (next.config.ts) |
| `lucide-react` instalado | ✅ v0.562.0 |
| TRANSFER deshabilitado en POS | ✅ (finalizar-venta-modal.tsx:149) |
| TRANSFER deshabilitado en renovación | ✅ (renovar-membresia-modal.tsx:209) |
| Fórmula de diferencia sin doble resta | ✅ (shift-calculations.ts) |
| Auth endpoint respondiendo | ✅ (validado sesión S83) |
| Flujo manual básico en browser | ⚠️ Ejecutar checklist Sección 3 antes del primer turno |
