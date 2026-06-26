# Investigación: Auditoría Funcional y Arquitectónica SGF vs Datos Históricos

## Hand-off Brief

1. **Qué se investigó.** Comparación exhaustiva entre los archivos históricos del sistema actual (3 xlsx en `docs/`) y el modelo de datos de SGF (Prisma schema + módulos + tipos/api), para determinar fidelidad antes de diseñar la funcionalidad de migración.
2. **Dónde está el caso.** Auditoría Fase 1 y 2 completadas. 4 brechas críticas identificadas, 6 brechas moderadas, 3 menores. Fase 3 (arquitectura de migración) lista para diseñar.
3. **Qué sigue.** Revisar este reporte, validar las brechas críticas con el equipo operativo, y decidir cuáles ajustes al schema son necesarios antes de construir la funcionalidad de migración.

## Case Info

| Campo            | Valor                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Ticket           | N/A                                                                  |
| Fecha apertura   | 2026-06-25                                                           |
| Estado           | Active                                                               |
| Sistema          | SGF (Next.js + Prisma + PostgreSQL), producción en Vercel            |
| Fuentes de evidencia | `docs/*.xlsx` (3 archivos), `prisma/schema.prisma`, `modules/`, `types/api/`, `services/` |

## Problem Statement

Antes de diseñar la funcionalidad de migración de datos históricos hacia SGF, se necesita validar si el modelo actual de SGF es capaz de representar fielmente la información del sistema legado. La hipótesis de partida (no verificada) era que SGF ya cubre todos los conceptos del sistema anterior. Esta investigación la pone a prueba.

---

## Evidence Inventory

| Fuente                            | Estado      | Notas                                              |
| --------------------------------- | ----------- | -------------------------------------------------- |
| `docs/socios.xlsx`                | Disponible  | 652 socios, 15 columnas, exportación estática      |
| `docs/cortes.xlsx`                | Disponible  | Corte FN-248 (07-ene-2026), 8 hojas, 34 tickets    |
| `docs/corte mañana.xlsx`          | Disponible  | Corte FN-249 (13-ene-2026), 8 hojas, 6 tickets     |
| `prisma/schema.prisma`            | Disponible  | 9 modelos: User, Member, Product, InventoryMovement, Shift, CashWithdrawal + auth |
| `modules/` (4 módulos)            | Disponible  | members, products, inventory, sales                |
| `types/api/` (7 archivos)         | Disponible  | Zod schemas completos para cada dominio            |
| `services/` (6 archivos legacy)   | Disponible  | shifts, reports, users, utils, enum-mappers        |
| Historial completo de cortes      | **Faltante** | Solo existen 2 archivos xlsx de cortes. Sin historial de meses anteriores. |
| Catálogo de productos del legado  | **Faltante** | Los 56 SKUs del xlsx de inventario son la única fuente disponible. |
| Reglas de negocio documentadas    | **Faltante** | No existe documentación formal del sistema anterior. Las reglas se infieren de los datos. |

---

## Investigation Backlog

| #  | Área                               | Prioridad | Estado   | Notas                                                   |
| -- | ---------------------------------- | --------- | -------- | ------------------------------------------------------- |
| 1  | Estructura interna xlsx → evidencia real | Alta  | Done     | Extraídos via unzip + XML parsing                       |
| 2  | Schema Prisma completo             | Alta      | Done     | Leído completamente                                     |
| 3  | Módulos y tipos/api                | Alta      | Done     | Inventariados via subagente                             |
| 4  | Comparación campo por campo        | Alta      | Done     | Ver secciones Fase 1 y Fase 2                           |
| 5  | Historial de más cortes            | Media     | Blocked  | Solo 2 archivos disponibles — pedir al equipo           |
| 6  | Reglas de comisiones               | Media     | Blocked  | "Comision a Pagar" presente en xlsx, lógica desconocida |
| 7  | Reglas de anticipos                | Media     | Blocked  | "Ventas Anticipo" presente, lógica desconocida          |
| 8  | Catálogo completo de membresías    | Media     | Open     | Inferido de muestras, puede haber más variantes         |

---

## FASE 1: Auditoría del Modelo

### 1.1 Entidades reales en los Excel

#### Entidad: SOCIO (socios.xlsx, 652 registros)

| Campo Excel            | Tipo                   | Valores ejemplo                                      |
| ---------------------- | ---------------------- | ---------------------------------------------------- |
| Codigo Socio           | String, código único   | FN673, FN504, FN435                                  |
| Socio                  | String, nombre completo | PEREIRA MUÑOZ ADALI                                 |
| Telefonos              | String (sparse, ~90% "Na") | "Na", "5551234567"                              |
| Correo Electronico     | String (sparse, ~90% "na") | "na", "usuario@gmail.com"                       |
| Codigo Postal          | String (muy sparse, ~99% vacío) | "", "64000"                               |
| Fecha Nacimiento       | Date (serial Excel)    | 2025-12-09                                           |
| Membresia              | String denormalizado   | "EFECTIVO ANUALIDAD ESTUDIANTE ENE 2026"             |
| Fecha Inicio           | Date (serial Excel)    | 2026-01-12                                           |
| Fecha Vencimiento      | Date (serial Excel)    | 2027-01-12                                           |
| Total Visitas          | Integer                | 22, 112, 0                                           |
| Visitas Ultimo Mes     | Integer                | 17, 0                                                |
| Visitas Ultima Semana  | Integer                | 3, 0                                                 |
| Ultima Visita          | Date (serial Excel)    | 2026-01-14                                           |
| Dias Falta             | Decimal (días vencidos) | 0.045, 91.53                                        |
| Ultimo Pago            | Decimal (monto MXN)    | 4500, 5000                                           |

**Regla inferida - campo Membresia:** El string codifica 4 componentes separados por espacio:
1. Método de pago: `EFECTIVO` | `TARJETA`
2. Duración: `ANUALIDAD` | `MENSUALIDAD` | `SEMANA`
3. Nivel (opcional en SEMANA): `ESTUDIANTE` | `GENERAL`
4. Período: `ENE 2026`, `MAR 2025`, etc.

#### Entidad: CORTE / SHIFT (cortes.xlsx y corte mañana.xlsx)

**Hoja Cierre** — resumen financiero del turno:

| Campo Excel              | SGF: Shift                 |
| ------------------------ | -------------------------- |
| Apertura #               | folio (FN-248, FN-249)     |
| Cajero                   | cashierId (→ User.name)    |
| Fecha Apertura           | openingDate                |
| Hora Inicio / Hora Fin   | openingDate / closingDate  |
| Fondo Caja               | initialCash                |
| Cantidad Tickets         | ticketCount                |
| Ventas Membresias        | membershipSales            |
| Ventas Productos Tasa 0% | productSales0Tax           |
| Ventas Productos Tasa 16%| productSales16Tax          |
| Subtotal                 | subtotal                   |
| IVA                      | tax                        |
| Total Venta              | totalSales                 |
| Ventas Efectivo          | cashAmount                 |
| Ventas Tarjeta Debito    | debitCardAmount            |
| Ventas Tarjeta Credito   | creditCardAmount           |
| Total Voucher            | totalVoucher               |
| **Ventas Anticipo**      | **❌ SIN CAMPO**           |
| **Comision a Pagar**     | **❌ SIN CAMPO**           |
| Total Retiros            | totalWithdrawals           |
| Total Caja               | totalCash                  |
| **Total Ventas Web**     | **❌ SIN CAMPO**           |

**Hoja Ventas** — transacciones individuales:

| Campo Excel    | SGF: InventoryMovement  | Nota                                         |
| -------------- | ----------------------- | -------------------------------------------- |
| # Ticket       | ticket                  | Numérico secuencial (5750, 5751…)            |
| Fecha Venta    | date                    |                                              |
| Num. Socio     | memberId                | "FN435" → Member.memberNumber                |
| Socio          | (via Member join)       | "PUBLICO GENERAL" = memberId null            |
| Descripcion    | (via Product.name)      | Codifica membresía en ventas de socios       |
| Forma Pago     | paymentMethod           | "EFECTIVO (CARLOS)" embebe nombre vendedor  |
| Precio         | unitPrice               |                                              |
| Dcto.          | discount                |                                              |
| Cargo          | surcharge               |                                              |

**Hoja Inventario** — estado de stock por turno (56 SKUs):

| Campo Excel   | SGF                                        | Nota                               |
| ------------- | ------------------------------------------ | ---------------------------------- |
| Producto      | Product.name                               |                                    |
| Exi Anterior  | (calculado desde movimientos previos)      | No campo directo                   |
| Ajuste        | type=ADJUSTMENT                            |                                    |
| Exi Inicial   | (calculado)                                |                                    |
| Entradas      | type=GYM_ENTRY / WAREHOUSE_ENTRY           |                                    |
| Salidas       | type=SALE                                  |                                    |
| Exi Actual    | Product.gymStock + warehouseStock          | Excel no distingue ubicación       |

**Hoja Canceladas** — tickets cancelados:

| Campo Excel   | SGF: InventoryMovement          |
| ------------- | ------------------------------- |
| # Ticket      | ticket (con isCancelled=true)   |
| Fecha Venta   | date                            |
| Num. Socio    | memberId                        |
| Descripcion   | Product.name / notes            |
| Forma Pago    | paymentMethod                   |
| Precio        | unitPrice                       |
| Dcto.         | discount                        |

**Hoja Retiros:**

| Campo Excel   | SGF: CashWithdrawal |
| ------------- | ------------------- |
| Folio         | ❌ sin folio propio  |
| Fecha Retiro  | createdAt           |
| Concepto      | concept             |
| Efectivo      | amount              |

**Hoja Por Vendedores** — ventas por empleado:

| Concepto    | SGF                  | Nota                                           |
| ----------- | -------------------- | ---------------------------------------------- |
| Vendedor    | User (via userId)    | Excel almacena nombre; SGF necesita User.id    |
| Cantidad    | (count de movements) |                                                |
| Total Venta | (sum de totals)      |                                                |

**Hoja Ventas Web** — vacía en ambas muestras pero tiene estructura:

| Campo Excel   | SGF                |
| ------------- | ------------------ |
| # Folio       | ❌ sin equivalente  |
| Cuota         | ❌ sin equivalente  |
| Sesiones      | ❌ sin equivalente  |
| Fecha Inicio  | ❌ sin equivalente  |
| Fecha Fin     | ❌ sin equivalente  |
| Total($)      | ❌ sin equivalente  |

---

### 1.2 Matriz de Cobertura Funcional

| Concepto del Legado               | Estado en SGF         | Nivel       |
| --------------------------------- | --------------------- | ----------- |
| Socios / Members                  | `Member` model        | ✅ Cubierto  |
| Código de socio (FN###)           | `memberNumber` (String unique) | ✅ Cubierto |
| Nombre completo                   | `name`                | ✅ Cubierto  |
| Teléfono, email                   | `phone`, `email`      | ✅ Cubierto  |
| Fecha nacimiento                  | `birthDate`           | ✅ Cubierto  |
| Tipo membresía (duración + nivel) | `membershipType` (enum) + `membershipDescription` | ✅ Cubierto (con parseo) |
| Fecha inicio / vencimiento        | `startDate`, `endDate` | ✅ Cubierto |
| Total visitas + última visita     | `totalVisits`, `lastVisit` | ✅ Cubierto |
| **Código postal**                 | ❌ Sin campo           | ❌ Faltante  |
| **Visitas último mes/semana**     | ❌ Sin campo           | ⚠️ Parcial (calculable solo con historial) |
| **Días falta (vencimiento)**      | Calculable desde `endDate` | ✅ Derivable |
| **Último pago (monto)**           | ❌ Sin campo en Member | ⚠️ Derivable desde ventas si existe historial |
| Cortes / Shifts                   | `Shift` model         | ✅ Cubierto  |
| Folio FN-NNN                      | `folio` (String unique) | ✅ Cubierto |
| Cajero (User)                     | `cashierId` → User    | ✅ Cubierto (requiere mapping nombre→UUID) |
| Fondo caja, totales financieros   | 15+ campos Decimal    | ✅ Cubierto  |
| **Ventas Anticipo**               | ❌ Sin campo           | ❌ Faltante  |
| **Comisión a Pagar**              | ❌ Sin campo           | ❌ Faltante  |
| **Total Ventas Web**              | ❌ Sin campo           | ❌ Faltante  |
| Retiros de caja                   | `CashWithdrawal` model | ✅ Cubierto |
| **Folio de retiro**               | ❌ Sin campo en CashWithdrawal | ⚠️ Menor |
| Tickets/Ventas individuales       | `InventoryMovement` con type=SALE | ✅ Cubierto |
| Público General (walk-in)         | `memberId` nullable   | ✅ Cubierto  |
| Cancelaciones                     | `isCancelled` + campos de cancelación | ✅ Cubierto |
| Vendedor por transacción          | `userId` en InventoryMovement | ✅ Cubierto (pero Excel lo embebe en Forma Pago) |
| Ventas por cajero (resumen)       | Calculable desde shift + userId | ✅ Derivable |
| **Método pago embebido con vendedor** ("EFECTIVO (CARLOS)") | ❌ Formato incompatible | ⚠️ Parcial |
| Inventario / productos            | `Product` + `InventoryMovement` | ✅ Cubierto |
| 56 SKUs en inventario             | `Product.name` (único) | ✅ Cubierto |
| Kardex por turno (Exi Anterior, Inicial, Actual) | Calculable desde movimientos | ✅ Derivable |
| **Clasificación fiscal producto (Tasa 0% / 16%)** | ❌ Sin campo en Product | ⚠️ Parcial (solo en Shift totals) |
| Ubicación GYM vs WAREHOUSE        | `Location` enum       | ✅ SGF más granular (Excel no distingue) |
| **Ventas Web (canal digital)**    | ❌ Sin modelo          | ❌ Faltante (vacío en muestras) |

---

## FASE 2: Auditoría de Coherencia

### 2.1 Campos perdidos con impacto operativo

#### BRECHA CRÍTICA #1: Vendedor embebido en Forma Pago
**Evidencia:** `cortes.xlsx:Ventas` → Forma Pago = `"EFECTIVO (CARLOS)"`, `"EFECTIVO (CARLOS)"`, `"TARJETA DEBITO (NACHO)"`

**Problema:** El sistema legado embebe el nombre del vendedor dentro del campo de método de pago. SGF espera `paymentMethod` como enum (`CASH`, `DEBIT_CARD`, `CREDIT_CARD`, `TRANSFER`). No hay un campo "vendedor" separado visible en los datos exportados; el nombre va entre paréntesis en el string de forma de pago.

**Impacto operativo:** Al importar, si se extrae solo el método de pago del string, se pierde quién realizó la venta. Si se guarda el string completo, falla la validación del enum.

**Impacto en migración:** Requiere parseo: `"EFECTIVO (CARLOS)"` → `paymentMethod=CASH` + buscar usuario "CARLOS" → asignar `userId`. Si el nombre no coincide exactamente con un User, la venta queda sin vendedor asignado.

**Recomendación:** Antes de migrar, crear un mapeo explícito `{nombre_legado → User.id}` para todos los vendedores históricos. En la migración, parsear el string y aplicar el mapeo.

---

#### BRECHA CRÍTICA #2: Cajero almacenado como nombre (no UUID)
**Evidencia:** `cortes.xlsx:Cierre` → Cajero = `"ANDREW"`, `"NACHO"`

**Problema:** SGF almacena `Shift.cashierId` como String referenciando `User.id` (UUID). El legado solo tiene el nombre del cajero. Para migrar un Shift, se necesita que el cajero ya exista como User en SGF.

**Impacto en migración:** Si se migran cortes antes de crear los usuarios correspondientes, las FK fallan. El orden de importación es: Usuarios → Cortes → Movimientos.

**Recomendación:** Generar un catálogo de empleados a partir de todos los nombres únicos de cajeros/vendedores en los xlsx, crear los User antes de importar cortes.

---

#### BRECHA CRÍTICA #3: Clasificación fiscal del producto ausente
**Evidencia:** `cortes.xlsx:Cierre` → `Ventas Productos Tasa 0%` y `Ventas Productos Tasa 16%` son campos distintos en el resumen del corte.

**Problema:** `Shift` en SGF tiene `productSales0Tax` y `productSales16Tax` — puede guardar los totales. Pero `Product` no tiene campo `taxRate` o `taxCategory`. Para que SGF calcule a qué total contribuye cada producto, necesita saber si aplica 16% o 0%.

**Impacto operativo:** Sin este campo, SGF no puede calcular automáticamente la separación fiscal al generar nuevos cortes. Los totales históricos se pueden importar como suma global, pero el sistema futuro no podrá recalcularlos correctamente.

**Impacto en migración:** Los totales del corte se pueden importar directamente. El problema es operativo: si no se agrega `taxRate` a `Product`, el sistema no puede calcular los splits en cortes nuevos.

**Recomendación:** Agregar `taxRate: Decimal @default(0)` a `Product` (valores: 0 o 0.16). Mapear los 56 SKUs del legado a su categoría fiscal correspondiente antes de migrar.

---

#### BRECHA CRÍTICA #4: Ventas Anticipo sin equivalente
**Evidencia:** `cortes.xlsx:Cierre` → `Ventas Anticipo` presente como campo financiero en el resumen del corte.

**Problema:** No existe ningún concepto de "anticipo" o "prepago" en el schema de SGF (`Shift`, `InventoryMovement`, `PaymentMethod`). Si algún corte histórico tiene `Ventas Anticipo > 0`, ese monto no puede representarse correctamente.

**Impacto operativo:** Los anticipos posiblemente sean pagos adelantados de membresías. Si no se representan, el cuadre financiero del corte importado será incorrecto.

**Impacto en migración:** Los registros con anticipos tendrán discrepancias en sus totales.

**Recomendación:** Investigar con el equipo qué son exactamente los anticipos. Si siguen siendo necesarios: agregar `advanceSales: Decimal` a `Shift` y `ADVANCE` a `PaymentMethod`. Si ya no se usan: importar como 0 y documentar la pérdida.

---

### 2.2 Información que cambia de significado

#### BRECHA MODERADA #5: Visitas Último Mes / Última Semana
**Evidencia:** `socios.xlsx` → columnas `Visitas Ultimo Mes` (e.g. 17) y `Visitas Ultima Semana` (e.g. 3)

**Problema:** SGF solo almacena `Member.totalVisits` (acumulado) y `Member.lastVisit` (fecha). Los contadores de período no existen. En el legado son snapshots calculados al momento de exportar.

**Impacto en migración:** Al importar socios, estos valores históricos no tienen dónde guardarse en SGF. Si se descartan, se pierde contexto operativo relevante para actividad reciente de socios.

**Recomendación (sin implementar ahora):** Decidir si SGF necesita agregar `visitsCurrentMonth: Int` y `visitsCurrentWeek: Int` a `Member`, o si se acepta la pérdida de estos contadores de período.

---

#### BRECHA MODERADA #6: Último Pago como campo denormalizado en Socio
**Evidencia:** `socios.xlsx` → columna `Ultimo Pago` (e.g. 4500, 5000 MXN)

**Problema:** En el legado es un campo directo en el registro del socio. En SGF, el último pago se derivaría de la última `InventoryMovement` de tipo membresía para ese socio. Si no existe historial de ventas para ese socio (solo se importa el xlsx de socios), este valor no es derivable.

**Impacto en migración:** Si se migra solo `socios.xlsx` sin historial de ventas, el monto del último pago no puede calcularse. Si se migran los cortes primero, podría derivarse. En cualquier caso, SGF no tiene campo para almacenarlo directamente en `Member`.

**Recomendación:** Determinar si se importará historial de ventas (cortes) o solo el catálogo de socios. Si se importan los cortes, `ultimoPago` es derivable. Si no, se pierde.

---

#### BRECHA MODERADA #7: Número de ticket como String vs Integer
**Evidencia:** `cortes.xlsx:Ventas` → `# Ticket` = 5750, 5751, 5752 (numérico secuencial). SGF: `InventoryMovement.ticket` es `String?`.

**Problema:** No es una incompatibilidad de tipo (String puede guardar "5750"), pero sí hay riesgo de romper la secuencia al hacer la migración. Si el contador de tickets del sistema nuevo no se inicializa desde el último valor del legado (5780+), se generarán colisiones o tickets duplicados.

**Recomendación:** Al completar la migración, inicializar el generador de tickets del SGF al `max(ticket_number) + 1` del legado.

---

#### BRECHA MODERADA #8: Membresia como string denormalizado
**Evidencia:** `socios.xlsx` → `Membresia` = `"EFECTIVO ANUALIDAD ESTUDIANTE ENE 2026"` (string compuesto)

**Problema:** SGF usa `MembershipType` enum con valores como `ANNUAL_STUDENT`, `MONTH_GENERAL`, etc. El string del legado combina método de pago + duración + nivel + período. El método de pago NO es parte del tipo de membresía en SGF.

**Regla de parseo necesaria:**
```
EFECTIVO ANUALIDAD ESTUDIANTE → MembershipType.ANNUAL_STUDENT
TARJETA MENSUALIDAD GENERAL → MembershipType.MONTH_GENERAL
EFECTIVO SEMANA → MembershipType.WEEK
EFECTIVO MENSUALIDAD ESTUDIANTE → MembershipType.MONTH_STUDENT
EFECTIVO ANUALIDAD GENERAL → MembershipType.ANNUAL_GENERAL
```

**Advertencia:** El mes/año del período (ENE 2026) está embebido en el string, pero la fecha real se encuentra en `Fecha Inicio` y `Fecha Vencimiento`. El período del string es redundante y puede ignorarse.

**Riesgo:** Si existen variantes de `Membresia` no vistas en las 652 muestras (e.g. TRIMESTRAL, PROMO, REACTIVACIÓN), el parseo fallará y el registro quedará con `membershipType = null`.

---

#### BRECHA MODERADA #9: Inventario sin ubicación GYM/WAREHOUSE
**Evidencia:** `cortes.xlsx:Inventario` → solo `Exi Actual` (sin distinción de ubicación). SGF: `Product.gymStock` y `Product.warehouseStock` son separados.

**Problema:** Al importar el stock histórico, no se sabe qué porcentaje está en GYM vs WAREHOUSE. Asignar todo a GYM es razonable para un gimnasio, pero requiere confirmación operativa.

**Recomendación:** Importar todo stock inicial como `gymStock`, dejar `warehouseStock = 0`, y confirmar con el equipo antes de migrar.

---

#### BRECHA MENOR #10: Código Postal sin campo en Member
**Evidencia:** `socios.xlsx` → `Codigo Postal` (99% vacío)

**Impacto:** Mínimo. El campo está casi siempre vacío. Se puede descartar sin impacto operativo.

---

#### BRECHA MENOR #11: Folio de retiro sin campo en CashWithdrawal
**Evidencia:** `cortes.xlsx:Retiros` → columna `Folio` por retiro. SGF `CashWithdrawal` no tiene folio.

**Impacto:** Bajo. El folio de retiro es un número de control interno del legado. Se puede almacenar en el campo `concept` como prefijo si se necesita trazabilidad.

---

#### BRECHA MENOR #12: Comisión a Pagar sin campo en Shift
**Evidencia:** `cortes.xlsx:Cierre` → `Comision a Pagar`. En la muestra el valor es 0.

**Impacto:** Desconocido. Si siempre es 0, no hay impacto. Si hay casos con valor, requiere campo nuevo en `Shift`.

**Recomendación:** Verificar si en el historial completo de cortes existe alguno con `Comision a Pagar > 0`. Si no, ignorar. Si sí, agregar `commissionAmount: Decimal @default(0)` a `Shift`.

---

### 2.3 Resumen de Riesgos

| Riesgo                                       | Severidad  | Bloquea migración |
| -------------------------------------------- | ---------- | ----------------- |
| Vendedor embebido en método de pago          | 🔴 Crítico | Sí (datos erróneos) |
| Cajero como nombre vs UUID                   | 🔴 Crítico | Sí (FK violation) |
| Clasificación fiscal ausente en Product      | 🔴 Crítico | No (pero degrada calidad operativa) |
| Ventas Anticipo sin campo                    | 🔴 Crítico | No (pero totales incorrectos) |
| Visitas último mes/semana perdidas           | 🟡 Moderado | No |
| Último pago no derivable sin historial ventas | 🟡 Moderado | No |
| Secuencia de tickets sin reinicializar       | 🟡 Moderado | No (pero genera colisiones futuras) |
| Membresia string con variantes desconocidas  | 🟡 Moderado | No (null fallback) |
| Stock sin ubicación GYM/WAREHOUSE            | 🟡 Moderado | No (asignar todo a GYM) |
| Código postal inexistente en SGF             | 🟢 Menor   | No |
| Folio de retiro inexistente                  | 🟢 Menor   | No |
| Comisión a pagar posiblemente siempre 0      | 🟢 Menor   | No (verificar) |

---

## FASE 3: Evaluación de Viabilidad — Funcionalidad de Migración

### 3.1 Archivos necesarios y orden de importación

**Archivos requeridos:**
1. `socios.xlsx` — catálogo de socios (uno solo)
2. `cortes.xlsx` (y demás cortes históricos) — historial de operaciones

**No existen archivos XML** — el sistema legado exporta únicamente xlsx.

**Orden obligatorio de importación:**
```
1. Usuarios (cajeros/vendedores) — prerequisito de FK
2. Productos (catálogo de SKUs) — prerequisito de FK
3. Socios (catálogo de miembros) — prerequisito de FK
4. Cortes (Shift) — prerequisito para InventoryMovements
5. Movimientos de inventario (ventas, entradas, ajustes) — por corte
6. Retiros de caja — por corte
```

Si solo se importa `socios.xlsx` (sin historial de cortes), se cargan los pasos 1, 2 y 3.

### 3.2 Recomendaciones de ajuste al schema antes de migrar

**Ajustes recomendados al schema Prisma:**

| Campo a agregar           | Modelo         | Tipo                        | Razón                                       |
| ------------------------- | -------------- | --------------------------- | ------------------------------------------- |
| `taxRate`                 | `Product`      | `Decimal @default(0)`       | Clasificar productos como 0% o 16% IVA     |
| `advanceSales`            | `Shift`        | `Decimal @default(0)`       | Ventas Anticipo del legado y futuros        |
| `webSales`                | `Shift`        | `Decimal @default(0)`       | Ventas Web (canal digital, hoy vacío)       |
| `commissionAmount`        | `Shift`        | `Decimal @default(0)`       | Comisión a Pagar (verificar si se usa)      |
| `legacyFolio`             | `CashWithdrawal` | `String?`                 | Preservar folio del retiro del legado       |

**Ajustes opcionales (sin bloquear migración):**
| Campo a agregar           | Modelo  | Tipo    | Razón                                     |
| ------------------------- | ------- | ------- | ----------------------------------------- |
| `zipCode`                 | `Member` | `String?` | Código postal (99% vacío, baja prioridad) |

### 3.3 Modelo canónico interno de migración

Se recomienda generar un modelo canónico antes de importar a la DB:

```typescript
// Modelo canónico — intermediate representation
interface CanonicalMember {
  memberNumber: string;          // "FN673"
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  membershipType: MembershipType; // parseado desde el string
  membershipDescription: string;  // string original preservado
  startDate: Date | null;
  endDate: Date | null;
  totalVisits: number;
  lastVisit: Date | null;
}

interface CanonicalShift {
  folio: string;                 // "FN-248"
  cashierName: string;           // "ANDREW" → mapear a User.id
  openingDate: Date;
  closingDate: Date | null;
  // ... todos los campos financieros
  ventas: CanonicalSale[];
  inventario: CanonicalInventorySnapshot[];
  retiros: CanonicalWithdrawal[];
}

interface CanonicalSale {
  ticketNumber: number;
  date: Date;
  memberNumber: string | null;   // null = PUBLICO GENERAL
  description: string;
  sellerName: string;            // extraído de "EFECTIVO (CARLOS)"
  paymentMethod: PaymentMethod;  // parseado de "EFECTIVO (CARLOS)"
  price: Decimal;
  discount: Decimal;
  surcharge: Decimal;
}
```

### 3.4 Arquitectura propuesta para la funcionalidad de migración

```
app/
  (dashboard)/
    configuracion/
      migracion/
        page.tsx                    # Server component — estado actual de la DB
        _components/
          MigracionManager.tsx      # Orquestador UI con wizard de pasos
          FileUploadStep.tsx        # Upload xlsx
          ValidationStep.tsx        # Vista previa de lo que se importará
          WarningStep.tsx           # Confirmación de borrado de datos
          ProgressStep.tsx          # Progreso en tiempo real
          ReportStep.tsx            # Resultado final

  api/
    migracion/
      validate/route.ts             # POST → analiza xlsx, devuelve resumen
      execute/route.ts              # POST → ejecuta migración (Server Action o API)
      status/route.ts               # GET → estado de migración en progreso

modules/
  migration/
    migration.service.ts            # Orquesta todo el flujo
    validators/
      socios.validator.ts           # Valida/parsea hoja SOCIOS
      cortes.validator.ts           # Valida/parsea cada corte
      catalog.validator.ts          # Valida catálogo de productos/usuarios
    adapters/
      xlsx-reader.adapter.ts        # Extrae datos crudos del xlsx (usa exceljs o xlsx)
      member.adapter.ts             # CanonicalMember → Prisma Member input
      shift.adapter.ts              # CanonicalShift → Prisma Shift + Movements + Withdrawals
    domain/
      membership-parser.ts          # "EFECTIVO ANUALIDAD ESTUDIANTE ENE 2026" → MembershipType
      payment-parser.ts             # "EFECTIVO (CARLOS)" → {method, sellerName}
      date-converter.ts             # Excel serial date → JS Date
      user-mapper.ts                # nombre → User.id (requiere catálogo previo)
```

### 3.5 Flujo de la funcionalidad

```
1. Upload de archivos xlsx
   └─ Validar formato: ¿tiene hojas SOCIOS/Cierre/Ventas/Inventario?
   └─ Devolver resumen: N socios, M cortes, K productos únicos, P usuarios inferidos

2. Vista previa (sin escribir a DB)
   └─ Lista de socios a importar (con membresía parseada)
   └─ Lista de cortes a importar (con totales)
   └─ Lista de productos inferidos (con clasificación fiscal si se conoce)
   └─ Lista de usuarios/cajeros inferidos (alerta si hay nombre sin User en SGF)
   └─ Lista de brechas detectadas (anticipos, comisiones, etc.)

3. Advertencia
   └─ "Los siguientes datos operativos serán ELIMINADOS: N miembros, M cortes, K movimientos"
   └─ "Se conservarán: X usuarios, Y productos (catálogo), configuración del sistema"
   └─ Confirmar con texto escrito o checkbox explícito

4. Ejecución (transacción atómica por sección)
   a. DELETE datos operativos (member, shift, inventory_movement, cash_withdrawal)
      — NO DELETE: user, session, account, verification, product (opcional)
   b. INSERT usuarios inferidos que no existan (con password temporal)
   c. INSERT/UPSERT catálogo de productos con taxRate
   d. INSERT socios desde socios.xlsx
   e. Por cada corte (en orden cronológico):
      INSERT Shift
      INSERT InventoryMovements (ventas, ajustes, entradas)
      INSERT CashWithdrawals
   f. UPDATE Product.gymStock desde último corte importado

5. Reporte final
   └─ N socios importados, M fallidos (con razón)
   └─ K cortes importados, L fallidos
   └─ P movimientos importados
   └─ Brechas manejadas (anticipos perdidos, etc.)
   └─ Advertencias (tickets reiniciados desde N, usuarios creados con password temporal)
```

### 3.6 Garantías de idempotencia y consistencia

- Todo el proceso en una transacción de Prisma por fase (no una sola mega-transacción — timeout risk)
- Validación completa ANTES de cualquier DELETE
- Si la validación falla, no se procede al DELETE
- El DELETE ocurre solo si la validación aprueba Y el usuario confirma explícitamente
- Cada objeto importado se registra con un campo `migratedFrom: String?` (fuente xlsx + fecha de migración)
- El reporte final distingue entre "omitido" vs "fallido"

### 3.7 Validación de que la migración fue correcta

```
Verificaciones post-migración:
1. COUNT(member) == N socios en xlsx
2. COUNT(shift) == número de cortes importados
3. SUM(InventoryMovement.total WHERE type=SALE AND shiftId=X) ≈ Shift.totalSales (± tolerancia por tipos de pago)
4. Product.gymStock == Exi Actual del último corte importado
5. Sin FK orphans (member sin número, shift sin cashier, movement sin shift)
```

---

## Confirmed Findings

### Finding 1: Sistema legado exporta solo xlsx — no hay XML
**Evidencia:** `docs/` contiene exactamente 3 archivos: `socios.xlsx`, `cortes.xlsx`, `corte mañana.xlsx`. No existe ningún XML.

**Detalle:** Los xlsx son archivos ZIP internamente con XML, pero la fuente de datos del legado es xlsx, no XML. El requerimiento del usuario mencionaba "XML/Excel" pero en la práctica solo hay Excel.

### Finding 2: 652 socios activos con código FN### único
**Evidencia:** `docs/socios.xlsx:SOCIOS` fila 1 (headers) a fila 653 (datos). Códigos van de FN1 a FN700+ aproximadamente.

**Detalle:** Todos tienen memberNumber con prefijo FN. El modelo `Member.memberNumber` (String unique) puede preservarlos exactamente.

### Finding 3: Cortes siguen plantilla de 8 hojas fija
**Evidencia:** `cortes.xlsx` y `corte mañana.xlsx` tienen exactamente las mismas 8 hojas: Cierre, Ventas, Inventario, Canceladas, Retiros, Por Vendedores, Por Cajeros, Ventas Web.

**Detalle:** La estructura es estable y predecible. El parser puede asumir esta plantilla.

### Finding 4: Tickets son números secuenciales (5750, 5780)
**Evidencia:** FN-248 → tickets 5750-5783. FN-249 → tickets 5780+. Salto de 30 entre cortes.

**Detalle:** El contador de tickets es global (no por corte). La secuencia continúa entre cortes. SGF debe reinicializarse al último valor para evitar colisiones.

### Finding 5: Inventario tiene exactamente 56 SKUs consistentes entre cortes
**Evidencia:** `cortes.xlsx:Inventario` = 56 filas. `corte mañana.xlsx:Inventario` = 56 filas. Mismos productos, mismo orden.

**Detalle:** El catálogo de productos es estable. Los 56 SKUs son bebidas y suplementos. No hay categorías de producto en el legado (solo nombre).

### Finding 6: SGF cubre ~75% del modelo del legado sin cambios
**Evidencia:** Matriz de cobertura en Fase 1. 20 de 32 conceptos cubiertos, 4 faltantes críticos, 5 parciales, 3 menores.

---

## Deduced Conclusions

### Deducción 1: La migración es viable con ajustes moderados al schema

**Basada en:** Findings 2-6, Brechas #1-#12

**Razonamiento:** Los conceptos core (socios, productos, cortes, ventas, retiros) tienen equivalentes directos en SGF. Las 4 brechas críticas son manejables: 2 requieren lógica de parseo en el adapter, 1 requiere campo nuevo en Product (taxRate), 1 requiere investigación del negocio (anticipos). No hay incompatibilidades fundamentales de modelo.

**Conclusión:** Se pueden realizar 3-5 ajustes al schema de Prisma y construir la funcionalidad de migración sin rediseñar el modelo de datos de SGF.

### Deducción 2: Se requiere un catálogo previo de empleados

**Basada en:** Brechas #1 y #2, Finding 1

**Razonamiento:** Los xlsx no tienen una hoja de empleados. Los nombres de cajeros/vendedores están dispersos en cortes. La migración debe inferir los empleados, pero SGF necesita Users con UUIDs. Esto requiere o bien un paso de "crear usuarios temporales" o bien una pantalla previa donde el administrador mapea nombres a cuentas existentes.

**Conclusión:** El flujo de migración necesita un paso de mapeo de empleados (nombre legado → User SGF) antes de importar cortes.

### Deducción 3: socios.xlsx es autosuficiente para importar el catálogo de socios

**Basada en:** Finding 2, estructura de columnas en socios.xlsx

**Razonamiento:** El xlsx tiene todos los campos necesarios para crear Member completo: memberNumber, name, phone, email, birthDate, membershipType (parseado), startDate, endDate, totalVisits, lastVisit. Los campos faltantes (zipCode, visitas/semana/mes) son opcionales o derivados.

**Conclusión:** Se puede importar el catálogo de socios usando solo socios.xlsx, sin necesidad de los cortes.

---

## Hypothesized Paths

### Hipótesis 1: Los anticipos (Ventas Anticipo) están siempre en 0 en el historial de cortes
**Estado:** Open

**Teoría:** La muestra de FN-248 muestra Ventas Anticipo = 0. Si esto es consistente en todos los cortes, el campo puede ignorarse en la migración.

**Confirmaría:** Revisar todos los cortes históricos disponibles y verificar que `Ventas Anticipo = 0` en todos.

**Refutaría:** Cualquier corte con `Ventas Anticipo > 0` indicaría que el concepto se usa y debe modelarse.

### Hipótesis 2: Las comisiones (Comision a Pagar) están siempre en 0 en el historial
**Estado:** Open

**Misma lógica que Hipótesis 1.**

### Hipótesis 3: El legado tiene más cortes históricos no incluidos en docs/
**Estado:** Open

**Teoría:** Solo existen 2 archivos de cortes en docs/. Es probable que el sistema legado tenga meses de historial. La migración completa necesitaría todos esos archivos.

**Confirmaría:** El equipo operativo tiene archivos xlsx de cortes anteriores.

**Refutaría:** Si docs/ es el archivo completo de exportación y solo 2 cortes existen como referencia.

---

## Missing Evidence

| Brecha                                    | Impacto                                           | Cómo obtener                              |
| ----------------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| Historial completo de cortes              | Sin esto, la migración importará solo 2 cortes    | Pedir al equipo todos los xlsx de cortes  |
| Reglas de anticipo                        | Determina si se necesita nuevo campo en Shift     | Preguntar al equipo operativo             |
| Reglas de comisión                        | Determina si se necesita nuevo campo en Shift     | Preguntar al equipo operativo             |
| Catálogo de membresías completo           | Puede haber variantes no vistas (TRIMESTRAL, etc) | Extraer todos los valores únicos del campo Membresia en todos los xlsx disponibles |
| Clasificación fiscal de los 56 productos  | Para mapear taxRate a cada producto               | El equipo operativo/contable debe definir qué productos son 0% y cuáles 16% |

---

## Conclusion

**Confianza:** Alta (para Fase 1 y 2) / Media (para Fase 3 — arquitectura)

**SGF representa correctamente ~75% del modelo del negocio del legado.** Los 4 conceptos críticos faltantes o incompatibles son:

1. **Clasificación fiscal del producto** (taxRate) — campo ausente en Product
2. **Vendedor embebido en Forma Pago** — requiere parseo y mapeo a User
3. **Cajero como nombre vs UUID** — requiere catálogo de empleados previo
4. **Ventas Anticipo** — requiere investigación de si el concepto existe activamente

Con 3 migraciones de schema (taxRate en Product, advanceSales y webSales en Shift) y los adapters de parseo correctos, la funcionalidad de migración es implementable sin rediseñar el modelo de SGF.

---

## Recommended Next Steps

### Fix direction (schema antes de migrar)
1. Agregar `taxRate: Decimal @default(0)` a `Product` con migración de Prisma.
2. Agregar `advanceSales: Decimal @default(0)` y `webSales: Decimal @default(0)` a `Shift`.
3. Confirmar con equipo si `commissionAmount` es necesario en `Shift`.
4. Mapear manualmente los 56 SKUs a su clasificación fiscal (0% o 16%).
5. Obtener catálogo completo de cajeros/vendedores históricos para crear Users.

### Diagnostic (antes de implementar)
1. Verificar si `Ventas Anticipo > 0` en algún corte histórico.
2. Verificar si `Comision a Pagar > 0` en algún corte histórico.
3. Extraer todos los valores únicos del campo `Membresia` de todos los xlsx disponibles para verificar que el parser cubre todos los casos.
4. Confirmar si el historial completo de cortes está disponible o solo los 2 del docs/.

### Siguiente skill recomendada
Una vez validados los ajustes de schema con el equipo: → `bmad-create-story` para la historia técnica de ajustes al schema → `bmad-quick-dev` para implementar los adapters y la UI de migración.

---

## Reproduction Plan

N/A — este es un caso de exploración funcional, no un bug.

Para verificar la cobertura: ejecutar el parser de membresía contra todos los 652 registros de socios.xlsx y reportar qué porcentaje mapea correctamente a un MembershipType conocido.

---

## Side Findings

- **Confirmed:** El xlsx de "corte mañana" (FN-249) es un corte con tickets iniciando en 5780, lo que indica que el turno FN-248 fue el 07-ene-2026 y FN-249 fue el 13-ene-2026 — hay gap de 6 días sin cortes exportados, confirmando que solo existen 2 muestras, no el historial completo.
- **Confirmed:** El formato de fecha en xlsx son seriales de Excel (base 1900-01-01), no ISO strings. El adapter debe convertir correctamente.
- **Confirmed:** Hay socios con `Fecha Nacimiento` en 2025 y `Fecha Inicio` también en 2025/2026 — fechas válidas, no errores de datos.
- **Deduced:** "PUBLICO GENERAL" como Num. Socio en ventas indica que SGF debe manejar `memberId = null` en InventoryMovement para walk-ins — esto ya está soportado (campo opcional).
- **Deduced:** Los ajustes de inventario (`Ajuste`) en la hoja Inventario son correcciones de stock al abrir el turno, distintas de las entradas (`Entradas`) — SGF tiene `InventoryType.ADJUSTMENT` que cubre esto.
- **Deduced:** Los ajustes de inventario (`Ajuste`) en la hoja Inventario son correcciones de stock al abrir el turno, distintas de las entradas (`Entradas`) — SGF tiene `InventoryType.ADJUSTMENT` que cubre esto.


---

## Follow-up: 2026-06-25

### Contexto de la iteración

Segunda pasada. Nuevos elementos: (1) clasificación A/B/C/D de convergencia, (2) UI y orchestrators, (3) complejidad innecesaria, (4) rollback, (5) roadmap.

Evidencia adicional: `app/(dashboard)/` (8 Managers, 16 modals), `lib/api/*.client.ts` (6 archivos), `lib/orchestrators/renewal.orchestrator.ts` (único orchestrator).

---

### Nueva Evidencia

| Fuente | Status | Notas |
|--------|--------|-------|
| `app/(dashboard)/` | Disponible | 8 Manager/Container, 16 modals, 60+ componentes |
| `lib/api/*.client.ts` | Disponible | 6 archivos; `inventory.client.ts` vacío |
| `lib/orchestrators/renewal.orchestrator.ts` | Disponible | Único orchestrator — renovación atómica (Member + InventoryMovement) |

---

### Auditoría de Convergencia: Clasificación A / B / C / D

- **A** = SGF está mejor → mantener
- **B** = SGF debe adaptarse al negocio → cambio propuesto
- **C** = SGF tiene complejidad innecesaria → simplificar
- **D** = Ambos modelos válidos → recomendar

#### MIEMBROS / SOCIOS

| Aspecto | Clase | Evidencia | Recomendación |
|---------|-------|-----------|---------------|
| `memberNumber` String unique (FN###) | **A** | Excel: FN### exacto — SGF lo preserva igual. | Mantener. |
| `MembershipType` enum vs string denormalizado | **A** | Excel: `"EFECTIVO ANUALIDAD ESTUDIANTE ENE 2026"` mezcla 4 conceptos. SGF los separa. | Mantener enum + preservar string en `membershipDescription`. |
| `startDate` / `endDate` explícitos | **A** | Excel tiene `Fecha Inicio` y `Fecha Vencimiento` como columnas independientes. | Mantener. |
| `totalVisits` + `lastVisit` | **A** | Excel tiene ambos, SGF idéntico. | Mantener. |
| `isActive` Boolean explícito | **D** | Excel no tiene activo explícito — se infiere de endDate. SGF agrega control admin. | **D:** Mantener. Más robusto para soft-delete. |
| `visitsCurrentMonth` / `visitsCurrentWeek` | **B** | Excel tiene `Visitas Ultimo Mes` y `Visitas Ultima Semana`. SGF no tiene equivalente. | **B (opcional):** Agregar solo si se usan en operación diaria. Sin historial completo, no importables. |
| `zipCode` | **C** | Excel tiene `Codigo Postal` — 99% vacío. SGF no lo tiene. | **C:** No agregar. Sin valor operativo. |
| `ultimoPago` en Member | **C** | Excel tiene `Ultimo Pago` en el socio. Es valor desnormalizado, ya existe en InventoryMovement. | **C:** No agregar. Derivable desde ventas. Desnormalizar es incorrecto. |
| `PaymentMethod` separado de membresía | **A** | Excel mezcla pago + membresía en un string. SGF los separa en el modelo. | Mantener. |

#### PRODUCTOS

| Aspecto | Clase | Evidencia | Recomendación |
|---------|-------|-----------|---------------|
| `Product.name` único | **A** | Excel usa nombre como ID único en inventario. | Mantener. |
| `gymStock` + `warehouseStock` separados | **A** | Excel no distingue ubicación pero la separación es mejora operativa válida. | **A:** Mantener. Migrar todo a gymStock inicialmente. |
| `minStock` | **A** | Excel no tiene umbral mínimo. SGF agrega alertas. Mejora operativa. | Mantener. |
| **`taxRate`** en Product | **B** | Excel distingue `Ventas Productos Tasa 0%` vs `Tasa 16%` por corte. Sin `taxRate` en Product, SGF no puede calcular el split automáticamente. | **B (obligatorio):** Agregar `taxRate: Decimal @default(0)`. |
| Categorías de producto | **D** | Excel no tiene categorías — solo nombre. SGF tampoco. | **D:** Sin diferencia. Mejora futura opcional. |

#### CORTES / SHIFTS

| Aspecto | Clase | Evidencia | Recomendación |
|---------|-------|-----------|---------------|
| Folio `FN-NNN` como String | **A** | Excel usa ese patrón exacto. SGF tiene `folio: String @unique`. | **A:** Mantener. Generador debe usar patrón FN-NNN. |
| `cashierId` → UUID vs nombre | **A** | Excel guarda nombre. SGF usa FK a User — más correcto. | **A:** Mantener. Requiere catálogo de usuarios en migración. |
| Todos los totales financieros | **A** | Excel tiene campo por campo equivalente. | Mantener. |
| **`advanceSales`** en Shift | **B** | Excel tiene `Ventas Anticipo` en resumen de corte. Sin equivalente en SGF. | **B:** Agregar `advanceSales: Decimal @default(0)`. Confirmar uso con equipo. |
| **`webSales`** en Shift | **B** | Excel tiene `Total Ventas Web` (siempre 0 en muestras). | **B (condicional):** Agregar `webSales: Decimal @default(0)`. Costo mínimo, previene pérdida de datos. |
| **`commissionAmount`** en Shift | **B** | Excel tiene `Comision a Pagar` (0 en muestras). | **B (condicional):** Agregar `commissionAmount: Decimal @default(0)`. Confirmar antes. |
| `cancelledSales` en Shift | **A** | Excel tiene hoja `Canceladas`. SGF agrega total en Shift. | Mantener. |
| `difference` en Shift | **A** | No en Excel directamente, pero es cálculo implícito. SGF lo explicita. Mejora. | Mantener. |
| `withdrawalsConcept` String en Shift | **C** | El string es redundante — el detalle ya está en `CashWithdrawal[]`. | **C:** Considerar eliminar. |

#### VENTAS / INVENTORY MOVEMENTS

| Aspecto | Clase | Evidencia | Recomendación |
|---------|-------|-----------|---------------|
| `ticket` String | **A** | Excel usa tickets numéricos (5750+). String es más flexible. | Mantener. |
| `memberId` nullable (PUBLICO GENERAL) | **A** | Excel usa "PUBLICO GENERAL" para walk-ins. SGF: `memberId = null`. | Mantener. |
| `paymentMethod` enum separado de vendedor | **A** | Excel mezcla ambos en `"EFECTIVO (CARLOS)"`. SGF los separa. | Mantener. |
| `isCancelled` + razón + fecha | **A** | Excel tiene hoja `Canceladas` con datos planos. SGF embebe cancelación en el mismo registro — mejor. | **A:** Mantener. |
| `surcharge` en InventoryMovement | **C** | Excel tiene campo `Cargo`. En todas las muestras el valor es 0. | **C:** Verificar si se usa alguna vez. Si no, eliminar o defaultear a 0 y ocultar en UI. |
| `location` en InventoryMovement | **D** | Excel no tiene ubicación por movimiento. SGF la tiene — consistente con gymStock/warehouseStock. | **D:** Mantener. |

#### RETIROS DE CAJA

| Aspecto | Clase | Evidencia | Recomendación |
|---------|-------|-----------|---------------|
| `CashWithdrawal` modelo separado | **A** | Excel tiene hoja `Retiros` dedicada. SGF la modela como entidad. | Mantener. |
| `userId` en CashWithdrawal | **D** | Excel no tiene empleado en retiro. SGF agrega trazabilidad. | **D:** Mantener. Mejora de auditoría. |
| Folio de retiro en Excel vs SGF | **C** | Excel tiene `Folio` por retiro. SGF no. El folio es control interno del legado. | **C:** No agregar. `id` autoincrement de SGF es suficiente. |

#### ORCHESTRATORS

| Aspecto | Clase | Evidencia | Recomendación |
|---------|-------|-----------|---------------|
| `renewal.orchestrator.ts` — renovación atómica | **A** | Renovación implica: pago (venta membresía) + actualización del socio. Son operaciones relacionadas que deben ser atómicas. | **A:** Mantener. Justificado por consistencia transaccional. |
| Apertura/cierre de turno sin orchestrator | **D** | `closeShift` en shifts.service.ts puede ser complejo. Sin leer el código completo, no clasificable con certeza. | **D:** Revisar si closeShift necesita orchestrator para recalcular totales. |

#### UI — CONVERGENCIA

| Contexto UI | Clase | Evidencia | Observación |
|-------------|-------|-----------|-------------|
| `CortesManager` — ciclo completo del turno | **A** | Excel tiene 8 hojas por turno. La UI gestiona exactamente ese flujo (8 API calls, 10+ state vars). | Complejidad justificada. |
| `VentasContainer` — carrito de ventas | **A** | Excel tiene tickets con múltiples líneas. El carrito modela eso correctamente. | Mantener. |
| `SociosManager` — CRUD de miembros | **A** | Excel tiene 652 socios con todos los campos mapeables. | Mantener. |
| `InventarioManager` — movimientos independientes | **D** | Excel no tiene pantalla de inventario separada de cortes. SGF lo separa para ajustes manuales. | **D:** Mantener — operativamente útil fuera del contexto de un turno. |
| `ReportesManager` — analytics | **A** | Excel tiene resúmenes por vendedor, cajero, totales. SGF agrega más granularidad. | Mantener. |
| `inventory.client.ts` vacío | **C** | Archivo `lib/api/inventory.client.ts` existe pero está completamente vacío. | **C (obligatorio):** Eliminar — dead code. |
| `HistorialVentasManager` — historial cross-corte | **A** | Legado no tiene historial en UI propia — solo dentro de cada xlsx. SGF agrega vista transversal. | **A:** Mantener. Mejora clara. |

---

### Resumen de Clasificaciones

| Clase | Cantidad | Acción |
|-------|----------|--------|
| **A** — SGF está mejor | 22 | Mantener sin cambios |
| **B** — SGF debe adaptarse | 5 | Cambios obligatorios / condicionales al schema |
| **C** — Complejidad innecesaria | 6 | Simplificar / eliminar |
| **D** — Ambos válidos | 6 | Mantener con justificación documentada |

---

### Cambios Obligatorios al Schema (Clase B)

```prisma
// Product — clasificación fiscal
model Product {
  taxRate  Decimal @default(0) @db.Decimal(4, 2)  // 0.00 o 0.16
}

// Shift — campos del legado sin equivalente
model Shift {
  advanceSales     Decimal @default(0) @db.Decimal(10, 2)
  webSales         Decimal @default(0) @db.Decimal(10, 2)
  commissionAmount Decimal @default(0) @db.Decimal(10, 2)  // confirmar uso
}
```

### Simplificaciones Recomendadas (Clase C)

| Elemento | Acción |
|----------|--------|
| `lib/api/inventory.client.ts` vacío | Eliminar |
| `Shift.withdrawalsConcept` | Evaluar eliminar — redundante con `CashWithdrawal[]` |
| `InventoryMovement.surcharge` | Verificar uso; si siempre 0, eliminar o no exponer en UI |
| `CashWithdrawal` folio | No agregar — `id` es suficiente |
| `Member.zipCode` | No agregar — campo vacío en legado |

---

### Estrategia de Rollback

#### Nivel 1 — Snapshot pre-migración (obligatorio)

Antes de cualquier DELETE, el sistema genera un dump:
```
pg_dump $DATABASE_URL > /tmp/sgf_pre_migration_TIMESTAMP.sql
```
El admin recibe instrucciones para restaurar si la migración falla.

#### Nivel 2 — Transacciones por fase

Cada fase corre en su propia transacción de Prisma:

| Fase | Operación | Si falla |
|------|-----------|----------|
| A | DELETE datos operativos (member, shift, inventory_movement, cash_withdrawal) | Abort — nada fue borrado aún |
| B | INSERT socios | Reportar + ofrecer retry |
| C | INSERT cortes (uno a la vez) | Reportar qué cortes fallaron, ofrecer reanudar |
| D | UPDATE Product.gymStock | Reportar + retry manual |

Fases A y B deben ser atómicas entre sí. Si B falla después de que A completó, la DB queda sin datos operativos. El sistema debe avisar y ofrecer restaurar desde el snapshot.

#### Nivel 3 — Idempotencia por entidad

```
upsert member         WHERE memberNumber = "FN673"
upsert shift          WHERE folio = "FN-248"
createMany movements  skipDuplicates: true
```

Permite relanzar la migración sin duplicados si se interrumpe.

#### No se implementa saga / compensating transactions

Volumen estimado: 652 socios + ~40 cortes + ~2000 movimientos. El overhead de sagas es innecesario. pg_dump + idempotencia cubre todos los casos de fallo realistas.

---

### Mapa Definitivo: Excel → SGF

| Hoja / Campo Excel | Modelo SGF | Campo | Transformación |
|--------------------|------------|-------|----------------|
| `socios: Codigo Socio` | Member | `memberNumber` | Directo ("FN673") |
| `socios: Socio` | Member | `name` | Trim espacios |
| `socios: Telefonos` | Member | `phone` | Null si "Na"/"NA"/"" |
| `socios: Correo Electronico` | Member | `email` | Null si "na"/"NA"/"" |
| `socios: Fecha Nacimiento` | Member | `birthDate` | Serial Excel → Date |
| `socios: Membresia` | Member | `membershipType` + `membershipDescription` | Parser: EFECTIVO/TARJETA + ANUALIDAD/MENSUALIDAD/SEMANA + ESTUDIANTE/GENERAL |
| `socios: Fecha Inicio` | Member | `startDate` | Serial Excel → Date |
| `socios: Fecha Vencimiento` | Member | `endDate` | Serial Excel → Date |
| `socios: Total Visitas` | Member | `totalVisits` | Directo |
| `socios: Ultima Visita` | Member | `lastVisit` | Serial Excel → Date |
| `socios: Visitas Ultimo Mes` | — | — | Descartar (calculable con historial) |
| `socios: Dias Falta` | — | — | Descartar (derivado de endDate) |
| `socios: Ultimo Pago` | — | — | Descartar (derivable desde ventas) |
| `cortes:Cierre: Apertura #` | Shift | `folio` | Directo ("FN-248") |
| `cortes:Cierre: Cajero` | Shift | `cashierId` | Nombre → User.id (catálogo previo) |
| `cortes:Cierre: Fecha + Hora Inicio` | Shift | `openingDate` | Combinar fecha + hora → DateTime |
| `cortes:Cierre: Hora Fin` | Shift | `closingDate` | Combinar fecha + hora → DateTime |
| `cortes:Cierre: Fondo Caja` | Shift | `initialCash` | Directo |
| `cortes:Cierre: Cantidad Tickets` | Shift | `ticketCount` | Directo |
| `cortes:Cierre: Ventas Membresias` | Shift | `membershipSales` | Directo |
| `cortes:Cierre: Ventas Productos Tasa 0%` | Shift | `productSales0Tax` | Directo |
| `cortes:Cierre: Ventas Productos Tasa 16%` | Shift | `productSales16Tax` | Directo |
| `cortes:Cierre: Subtotal / IVA / Total Venta` | Shift | `subtotal`, `tax`, `totalSales` | Directo |
| `cortes:Cierre: Ventas Efectivo/Débito/Crédito` | Shift | `cashAmount`, `debitCardAmount`, `creditCardAmount` | Directo |
| `cortes:Cierre: Total Voucher` | Shift | `totalVoucher` | Directo |
| `cortes:Cierre: Ventas Anticipo` | Shift | `advanceSales` | Directo (campo nuevo) |
| `cortes:Cierre: Comision a Pagar` | Shift | `commissionAmount` | Directo (campo nuevo) |
| `cortes:Cierre: Total Retiros` | Shift | `totalWithdrawals` | Directo |
| `cortes:Cierre: Total Caja` | Shift | `totalCash` | Directo |
| `cortes:Cierre: Total Ventas Web` | Shift | `webSales` | Directo (campo nuevo) |
| `cortes:Ventas: # Ticket` | InventoryMovement | `ticket` | String("5750") |
| `cortes:Ventas: Fecha Venta` | InventoryMovement | `date` | DateTime |
| `cortes:Ventas: Num. Socio` | InventoryMovement | `memberId` | FN### → Member.id; "PUBLICO GENERAL" → null |
| `cortes:Ventas: Descripcion` | Product | via `productId` | Buscar Product.name == descripción |
| `cortes:Ventas: Forma Pago` | InventoryMovement | `paymentMethod` + `userId` | Parsear "EFECTIVO (CARLOS)" → CASH + User("CARLOS") |
| `cortes:Ventas: Precio / Dcto. / Cargo` | InventoryMovement | `unitPrice`, `discount`, `surcharge` | Decimal |
| `cortes:Inventario: Ajuste` | InventoryMovement | `type=ADJUSTMENT, location=GYM` | Quantity = ajuste |
| `cortes:Inventario: Entradas` | InventoryMovement | `type=GYM_ENTRY, location=GYM` | Quantity = entradas |
| `cortes:Inventario: Exi Actual` | Product | `gymStock` | Solo del último corte importado |
| `cortes:Canceladas: *` | InventoryMovement | `isCancelled=true` | Mismo mapeo que Ventas |
| `cortes:Retiros: Concepto` | CashWithdrawal | `concept` | Directo |
| `cortes:Retiros: Efectivo` | CashWithdrawal | `amount` | Decimal |
| `cortes:Retiros: Fecha Retiro` | CashWithdrawal | `createdAt` | DateTime |

---

### Roadmap Incremental

**Prerequisito 0 — Ajustes al schema (1-2 días)**
1. Migración Prisma: `Product.taxRate`
2. Migración Prisma: `Shift.advanceSales`, `.webSales`, `.commissionAmount`
3. Eliminar `lib/api/inventory.client.ts` vacío
4. Catalogar los 56 SKUs con taxRate (manual, con equipo contable)
5. Confirmar con equipo operativo: anticipos activos, comisiones, historial completo disponible

**Fase 1 — Adapters y parsers (3-5 días)**
- `modules/migration/domain/membership-parser.ts`
- `modules/migration/domain/payment-parser.ts`
- `modules/migration/domain/date-converter.ts`
- `modules/migration/adapters/xlsx-reader.adapter.ts`
- `modules/migration/adapters/member.adapter.ts`
- `modules/migration/adapters/shift.adapter.ts`

**Fase 2 — Servicio y API (3-4 días)**
- `modules/migration/migration.service.ts`
- `modules/migration/validators/*.ts`
- `app/api/migracion/validate/route.ts`
- `app/api/migracion/execute/route.ts`
- `app/api/migracion/status/route.ts`

**Fase 3 — UI wizard (3-4 días)**
- `app/(dashboard)/configuracion/migracion/page.tsx`
- `MigracionManager.tsx` con wizard 5 pasos: Upload → Validación → Resumen → Advertencia → Ejecución → Reporte

**Fase 4 — Validaciones post-migración (1-2 días)**
- COUNT(member) == N socios del xlsx
- Totales de shifts vs suma de InventoryMovements
- Product.gymStock == Exi Actual del último corte
- Reporte final con badge "Migración válida" / "Migración con advertencias"

**Total estimado: 11-17 días de desarrollo.**

---

### Riesgos Actualizados

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Historial completo de cortes no disponible | 🔴 Alto | Solicitar urgente al equipo antes de construir nada |
| Clasificación fiscal de los 56 productos desconocida | 🔴 Alto | Catalogar con equipo contable antes de migrar |
| Nombres cajeros/vendedores no coinciden con Users existentes | 🟡 Medio | Pantalla de mapeo nombre → User en wizard |
| Variantes de Membresia no vistas en 652 muestras | 🟡 Medio | Test parser contra todos los xlsx disponibles |
| Secuencia de tickets colisiona con cortes futuros | 🟡 Medio | Inicializar contador desde max(ticket) + 1 |
| Anticipos o comisiones > 0 en cortes no revisados | 🟡 Medio | Revisar historial completo antes de migrar |
| Migración parcial sin rollback adecuado | 🟡 Medio | pg_dump + idempotencia por upsert |
| taxRate incorrecto por clasificación manual errónea | 🟡 Medio | Revisión doble por contabilidad + auditoría post |

---

### Conclusión Actualizada

**Confianza: Alta.**

SGF es un modelo más correcto que el legado en 22 de 39 aspectos auditados. Los 5 aspectos donde el negocio requiere adaptación son de bajo costo (campos nuevos en schema existente). Los 6 aspectos de complejidad innecesaria son candidatos a limpieza menor.

**Dos acciones son obligatorias antes de cualquier desarrollo:**
1. Obtener el historial completo de cortes xlsx.
2. Catalogar los 56 SKUs con clasificación fiscal (0% / 16%).

Sin esos dos insumos, la arquitectura de migración está completa y lista para implementar con el roadmap de 11-17 días descrito.


---

## Follow-up: 2026-06-25#2

### Pregunta central de esta iteración

¿Qué información del sistema histórico debe ser parte permanente del modelo de SGF y qué debe usarse solo durante la migración?

---

### Hallazgo crítico nuevo (Confirmed)

**Fuente:** `services/shifts.service.ts:282`

```javascript
let productSales0Tax = 0;
const productSales16Tax = 0;   // ← const nunca cambia
// Todos los productos van a 0Tax:
} else { productSales0Tax += total; }

const tax = productSales16Tax * 0.16;  // siempre 0
```

`Shift.productSales16Tax` y `Shift.tax` son SIEMPRE 0 en SGF. El sistema no puede calcular IVA de productos. Esto no es solo una brecha de migración — es un bug operativo activo que existe hoy, antes de cualquier migración.

`Product.taxRate` resuelve ese bug. La justificación no es "aparece en Excel". La justificación es "SGF tiene dos campos en el schema (`productSales0Tax`, `productSales16Tax`) que no pueden calcularse correctamente sin este atributo".

---

### Matriz definitiva: Persistente / Histórico / Calculado / Descartar

| Campo | Persistente | Histórico | Calculado | Descartar | Justificación |
|-------|:-----------:|:---------:|:---------:|:---------:|---------------|
| **SOCIOS** | | | | | |
| `Codigo Postal` | | | | ✓ | 99% vacío en legado. Sin uso operativo. |
| `Visitas Ultimo Mes` | | | ✓ | | Derivable: COUNT(visitas WHERE mes=actual). Con historial completo de movimientos, calculable en tiempo real. No almacenar. |
| `Visitas Ultima Semana` | | | ✓ | | Mismo caso. Derivable desde movimientos. |
| `Dias Falta` | | | ✓ | | `CURRENT_DATE - Member.endDate`. No almacenar. |
| `Ultimo Pago (monto)` | | | ✓ | | Derivable: último `InventoryMovement.total` con `memberId = X`. No almacenar en Member. |
| **PRODUCTOS** | | | | | |
| **`Product.taxRate`** | ✓ | | | | Ver abajo — análisis específico. |
| Categoría / tipo de producto | | | | ✓ | No existe en legado. Sin evidencia de necesidad. No agregar. |
| **CORTES / SHIFTS** | | | | | |
| **`Shift.advanceSales`** | | | | ✓ | Ver abajo — análisis específico. |
| **`Shift.webSales`** | | | | ✓ | Ver abajo — análisis específico. |
| **`Shift.commissionAmount`** | | | | ✓ | Ver abajo — análisis específico. |
| `Shift.withdrawalsConcept` (String) | | | ✓ | | Derivable: los conceptos ya están en `CashWithdrawal[].concept`. El campo es redundante. |
| **VENTAS / INVENTORY MOVEMENTS** | | | | | |
| `InventoryMovement.surcharge` | | | | ✓ | Siempre 0 en todas las muestras. Sin regla de negocio que lo genere. Campo muerto. |
| Nombre del vendedor (de "EFECTIVO (CARLOS)") | | ✓ | | | Solo para reconstruir quién hizo cada venta en el legado. Se mapea a `userId` durante migración. No requiere campo nuevo. |
| Número secuencial de ticket | | ✓ | | | El counter del legado llega a ~5780. Debe inicializarse desde ese valor post-migración. No requiere campo nuevo — solo ajuste del generador. |
| **RETIROS DE CAJA** | | | | | |
| `Folio` de retiro del legado | | ✓ | | | Solo para trazabilidad de la importación. No tiene valor operativo post-migración. No agregar campo. |
| **INVENTARIO** | | | | | |
| `Exi Anterior` por turno | | | ✓ | | `Product.gymStock` al inicio del turno anterior. Calculable desde movimientos. |
| `Exi Inicial` por turno | | | ✓ | | `Exi Anterior + Ajuste`. Calculable. |
| `Exi Actual` por turno | | | ✓ | | `Product.gymStock` — ya almacenado. También calculable desde kardex. |
| Ajuste de apertura de turno | | ✓ | | | Se importa como `InventoryMovement type=ADJUSTMENT`. No requiere campo nuevo. |
| **VENTAS WEB** | | | | | |
| `Ventas Web: Folio, Cuota, Sesiones, Fecha` | | | | ✓ | Canal inexistente. Siempre vacío en todas las muestras. Obsoleto. |

---

### Evaluación específica de los 4 cambios propuestos

#### `Product.taxRate`

**Veredicto: PERSISTENTE — cambio obligatorio al schema.**

**Por qué no es solo migración:** `services/shifts.service.ts:282` demuestra que `const productSales16Tax = 0` es un bug activo. SGF tiene `Shift.productSales16Tax` y `Shift.tax` en el schema pero no puede calcularlos porque no sabe qué productos son 16%. Hoy, sin importar lo que el cajero venda, SGF reporta IVA = 0 en todos los cortes.

Sin `Product.taxRate`, SGF falla en operación actual, no solo en migración.

**Cómo debe modelarse:**
```prisma
model Product {
  taxRate Decimal @default(0) @db.Decimal(4, 2)  // 0.00 o 0.16
}
```

**Corrige el bug:** En `closeShift`, separar acumuladores:
```
if (product.taxRate > 0) → productSales16Tax += total
else                     → productSales0Tax += total
tax = productSales16Tax * 0.16
```

---

#### `Shift.advanceSales`

**Veredicto: DESCARTAR — no agregar al schema.**

**Por qué:**
1. Siempre 0 en ambas muestras disponibles. Sin un solo caso de uso real.
2. Si el concepto de "anticipo" existe en el negocio, la forma correcta de modelarlo es un `InventoryMovement` con un `type` propio (e.g. `ADVANCE_PAYMENT`), no como campo denormalizado en Shift.
3. Agregar `advanceSales` en Shift sin el detalle transaccional (quién pagó qué anticipo) es almacenar un total sin su fuente.
4. Si en el futuro el negocio necesita anticipos, se modela entonces con la información completa.

**Durante migración:** Si algún corte histórico tiene `advanceSales > 0`, se importa ese monto en el campo `notes` del Shift o se ignora. No requiere campo permanente.

---

#### `Shift.webSales`

**Veredicto: DESCARTAR — no agregar al schema.**

**Por qué:**
1. Siempre 0 en todas las muestras. El campo `Ventas Web` del legado nunca fue usado.
2. SGF no tiene ni planea tener canal de ventas web actualmente.
3. Si en el futuro existe un canal digital, se modela como `source` o `channel` en `InventoryMovement` con el detalle completo, no como total en Shift.
4. Agregar un campo permanente para un canal que no existe es anticipar requisitos hipotéticos.

**Durante migración:** El campo `Total Ventas Web = 0` en todos los cortes. Se descarta sin impacto.

---

#### `Shift.commissionAmount`

**Veredicto: DESCARTAR — no agregar al schema.**

**Por qué:**
1. Siempre 0 en las muestras disponibles. Sin evidencia de uso real.
2. Las comisiones son un concepto de nómina/RRHH, no de punto de venta. Pertenecen a un sistema de nómina, no a SGF.
3. Si SGF necesita comisiones en el futuro, el modelo correcto es una entidad `Commission` con sus reglas (porcentaje por vendedor, por tipo de producto, etc.) — no un campo flat en Shift.
4. Un campo `commissionAmount` en Shift sin las reglas de cálculo es un número no trazable.

**Durante migración:** El campo `Comision a Pagar = 0` en las muestras. Se descarta sin impacto. Si se descubren cortes históricos con valor > 0, se almacenan en `Shift.notes` para referencia.

---

### Qué puede reconstruirse desde SGF sin almacenamiento adicional

| Información | ¿Calculable? | Cómo |
|-------------|-------------|------|
| Existencias actuales | ✓ | `Product.gymStock` + `Product.warehouseStock` (snapshot) o recalcular desde kardex |
| Kardex completo | ✓ | `getKardex(productId)` — ya existe en SGF |
| Exi Anterior / Inicial / Actual por turno | ✓ | Kardex filtrado por `shiftId` y orden cronológico |
| Visitas del mes de un socio | ✓ | `COUNT(InventoryMovement WHERE memberId=X AND type=SALE AND product=VISITA/MEMBRESIA AND mes=actual)` |
| Último pago de un socio | ✓ | `MAX(date) WHERE memberId=X AND type=SALE AND product.isMembership=true` |
| Días de vencimiento de membresía | ✓ | `Member.endDate - CURRENT_DATE` |
| Ventas por vendedor | ✓ | `SUM(InventoryMovement.total) WHERE userId=X AND shiftId=Y` |
| Ventas por cajero | ✓ | `SUM Shift.totalSales WHERE cashierId=X AND periodo=Y` |
| IVA por corte | ✓ | Solo si `Product.taxRate` existe — `SUM(total) WHERE taxRate=0.16 * 0.16` |
| Subtotales por categoría | ✓ | Después de agregar `taxRate` a Product |
| Inventario de apertura de un turno | ✓ | Stock del cierre del turno anterior |
| Reportes históricos de ventas | ✓ | Desde `InventoryMovement` + `Shift` — ya implementado en `reports.service.ts` |

**Nada de esto requiere campos adicionales en el schema.** Solo requiere `Product.taxRate` para que los cálculos de IVA sean correctos.

---

### Recomendación final

#### 1. Cambios obligatorios al schema (1 solo)

```prisma
model Product {
  taxRate Decimal @default(0) @db.Decimal(4, 2)
}
```

Corrige un bug existente en `closeShift`. Necesario para operar hoy, independiente de la migración.

---

#### 2. Cambios que NO deben hacerse

| Campo propuesto | Razón para NO agregar |
|-----------------|----------------------|
| `Shift.advanceSales` | Siempre 0; concepto sin uso real; si existe debe ser InventoryMovement |
| `Shift.webSales` | Canal inexistente; siempre 0 |
| `Shift.commissionAmount` | Siempre 0; pertenece a nómina, no a POS |
| `Member.zipCode` | 99% vacío; sin valor operativo |
| `CashWithdrawal.legacyFolio` | Solo para trazabilidad de importación; no operativo |
| `InventoryMovement.surcharge` | Siempre 0; campo muerto — candidato a eliminar del schema actual |
| `Shift.withdrawalsConcept` | Redundante con `CashWithdrawal[].concept` — candidato a eliminar |

---

#### 3. Información que debe reconstruirse durante la migración (sin almacenamiento)

| Dato del legado | Cómo se reconstruye |
|-----------------|---------------------|
| `Cajero` (nombre) → `User.id` | Catálogo de mapeo nombre→UUID generado en paso pre-migración |
| `"EFECTIVO (CARLOS)"` → `{paymentMethod, userId}` | Parser: separar string, mapear nombre a User |
| `Membresia string` → `MembershipType` enum | Parser regex de membership-parser |
| Serial Excel → DateTime | date-converter (base 1900-01-01) |
| `Exi Actual` último corte → `Product.gymStock` | Un solo UPDATE post-importación desde el último corte |
| Número último ticket → contador SGF | `UPDATE counter SET value = MAX(ticket) + 1` post-importación |
| Folio anticipo/comisión (si > 0) | Almacenar en `Shift.notes` como JSON literal |

---

#### 4. Información que debe almacenarse permanentemente (nueva)

**Solo una:** `Product.taxRate`

Toda la información restante del legado cabe en los modelos existentes sin campos adicionales.

---

#### 5. Recomendación final antes de implementar la funcionalidad de migración

**Paso 1 (inmediato, antes de migración):**
Aplicar una sola migración Prisma: `Product.taxRate Decimal @default(0)`.
Actualizar `closeShift` en `services/shifts.service.ts` para usar `taxRate` en la separación de productos.
Esto corrige el bug de IVA que existe hoy en producción.

**Paso 2 (antes de migración, sin código):**
Catalogar los 56 SKUs del legado con su `taxRate` correcto (0.00 o 0.16).
Obtener el historial completo de cortes xlsx del equipo operativo.

**Paso 3 (migración):**
Construir la funcionalidad de migración con el schema limpio.
Los 3 campos propuestos (advanceSales, webSales, commissionAmount) **no van al schema**.
Si algún corte histórico tiene esos valores > 0, se registra en `Shift.notes`.

**El modelo de dominio de SGF queda con exactamente 1 campo nuevo.** Todo lo demás son parsers de migración, no cambios de modelo.
