# Investigation: Impacto real de los 2 warnings restantes del lote histórico antes de Reconstruction

## Hand-off Brief

1. **Qué se investigó.** Los 2 warnings que quedan tras el patch D/Z (`feb54a8`): `UNKNOWN_MEMBERSHIP` (socio FN477) y `UNKNOWN_PAYMENT_METHOD` (folio FN-279, ticket 5928) — qué persistiría exactamente cada uno si se ejecutara Reconstruction hoy.
2. **Dónde queda el caso.** Ambos warnings confirmados como degradación de metadato puntual, sin pérdida de datos económicos ni de registros — evidencia completa, sin hipótesis abiertas.
3. **Qué sigue.** Ver Conclusión y Recomendación — decisión de negocio/producto (no de código) sobre aceptar ambos warnings o corregir alguno antes de Reconstruction.

## Case Info

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Ticket           | N/A (continuación directa de patch D/Z, commit `feb54a8`)                  |
| Date opened      | 2026-07-03                                                                 |
| Status           | Concluded                                                                  |
| System           | SGF — Next.js/Prisma, lote real `docs/2026/` (243 `.xlsx`)                 |
| Evidence sources | Código real (`modules/migration/domain/**`, `prisma/schema.prisma`), datos reales (`docs/2026/usuarios todos.xlsx`, `docs/2026/0-01-26 ALICIA gAEL.xlsx`), script de solo lectura temporal (creado, ejecutado y borrado en esta sesión) |

## Problem Statement

Tras cerrar D/Z, quedan 2 warnings sin resolver en `previewFiles()` sobre el lote histórico real. Antes de decidir si ejecutar Reconstruction, se necesita saber con evidencia exacta qué dato final persistiría cada uno — no solo que "hay un warning", sino el valor concreto que llegaría a la base de datos.

## Evidence Inventory

| Source   | Status                          | Notes     |
| -------- | ------------------------------- | --------- |
| `modules/migration/domain/parsers/membership-parser.ts` | Available | Leído completo |
| `modules/migration/domain/transformers/member-transformer.ts` | Available | Leído completo |
| `modules/migration/domain/member-upsert.ts` (`buildMemberUpsertData`) | Available | Leído completo |
| `prisma/schema.prisma` (`Member`, `InventoryMovement`) | Available | Leído completo |
| `docs/2026/usuarios todos.xlsx`, fila 96 real | Available | Leído directo con ExcelJS (script temporal, borrado) |
| `modules/migration/domain/parsers/payment-parser.ts` | Available | Ya auditado en el patch D/Z (`feb54a8`) |
| `modules/migration/domain/transformers/shift-transformer.ts` | Available | Leído completo previamente |
| `modules/migration/domain/shift-sync.ts` (`buildSaleMovementData`) | Available | Leído completo |
| `docs/2026/0-01-26 ALICIA gAEL.xlsx`, folio FN-279, ticket 5928 | Available | Leído directo (script temporal, borrado) |
| Los 242 cortes reales, búsqueda de variantes TRANSF/TRANSFER/ELECTRON en Forma Pago | Available | Escaneados en su totalidad (script temporal, borrado) |

## Confirmed Findings

### Finding 1: `parseMembership("ESPECIAL NOV 2025")` no coincide con ninguna entrada de `TYPE_TABLE`

**Evidencia:** `modules/migration/domain/parsers/membership-parser.ts:35-65` (tabla de tipos) y `:108-125` (loop de matching). Tras extraer el sufijo `MES YYYY` (`NOV 2025` → mes=11, año=2025 vía `MONTH_YEAR_RE`), el `remaining` queda `"ESPECIAL"` — ninguna entrada de `TYPE_TABLE` tiene ese patrón (ni exacto ni por `startsWith`). Cae al bloque final: `membershipType: null`, `warning: {code:"UNKNOWN_MEMBERSHIP"}`.

### Finding 2: el socio de la fila 96 es FN477, con una membresía de tipo "ESPECIAL" única en todo el lote

**Evidencia:** lectura directa de `docs/2026/usuarios todos.xlsx`, fila 96:
- `Codigo Socio`: `FN477`
- `Socio`: `ALEXANDRA YAMILETH AGUAYO PALITRON`
- `Membresia` (raw): `"ESPECIAL NOV 2025"`
- `Fecha Inicio`: 2025-11-10, `Fecha Vencimiento`: 2025-12-10 (1 mes de vigencia, patrón similar a una mensualidad)

Barrido de las 652 filas del archivo (158 valores de `Membresia` distintos en total): **ninguna otra fila contiene la palabra "ESPECIAL"** — es un valor único, sin patrón corroborante dentro del propio lote.

### Finding 3: `membershipDescription` preserva el texto original íntegro, independientemente de `membershipType`

**Evidencia:** `modules/migration/domain/transformers/member-transformer.ts:56` — `membershipDescription: m.membresia` (el string crudo, sin pasar por `parseMembership`). `modules/migration/domain/member-upsert.ts:29` — `membershipDescription: member.membershipDescription` pasa intacto a `MemberUpsertData`. `prisma/schema.prisma:143-144` — `membershipType MembershipType?` y `membershipDescription String?` son columnas **independientes**, ambas nullable.

**Detalle:** el valor final que persistiría en `Member` para FN477 sería `membershipType: null`, `membershipDescription: "ESPECIAL NOV 2025"` (texto exacto conservado). El resto de campos (`memberNumber`, `name`, `phone`, `startDate`, `endDate`, `totalVisits`, etc.) se calculan de forma independiente del resultado de `parseMembership` — ninguno se ve afectado por el warning.

### Finding 4: el socio se persiste igual (no se omite), y su `isActive` se calcula por `endDate`, no por `membershipType`

**Evidencia:** `member-transformer.ts:60` — `isActive: endDateResult.date === null || endDateResult.date >= new Date()`. Con `endDate = 2025-12-10` (pasado respecto a la fecha real de esta corrida), FN477 quedaría `isActive: false` — pero por vencimiento real, no por el warning de membresía. `modules/migration/migration.service.ts::syncMembers` (ya auditado en sesiones previas) hace `upsert` incondicional sobre todos los `DomainMember`, sin filtrar por `membershipType`.

### Finding 5: `parseFormaPago("TRANSF. ELECTRONICA (D)", "AGUA CIEL 1.5L")` no reconoce el método tras el patch D/Z

**Evidencia:** `modules/migration/domain/parsers/payment-parser.ts:46-53` (`METHOD_TABLE`: `EFECTIVO`, `TARJETA DEBITO`, `TARJETA CREDITO`, `TARJETA`, `TRANSFERENCIA`, `VOUCHER`). El método extraído tras quitar el paréntesis es `"TRANSF. ELECTRONICA"` — no coincide (ni exacto ni `startsWith(pattern+" ")`) con ninguna entrada, incluida `TRANSFERENCIA`. `sellerName` sí queda `null` correctamente (D ya excluido por `CONFIRMED_NON_SELLER_VALUES`, confirmado en `feb54a8`). Resultado: `paymentMethod: null`, `recognized: false`, `warning: UNKNOWN_PAYMENT_METHOD`.

### Finding 6: el monto y el ticket se conservan íntegros; solo `paymentMethod` queda `null`

**Evidencia:** `modules/migration/domain/shift-sync.ts:113-129` (`buildSaleMovementData`) — `ticket: sale.ticket`, `unitPrice: sale.price`, `subtotal: sale.price`, `total = sale.price - sale.discount + sale.surcharge`, todos calculados independientemente de `paymentMethod`. Para el ticket 5928: `unitPrice/subtotal/total = 25`, sin descuento ni recargo (no hay evidencia de otro valor en el Excel real). `paymentMethod: sale.paymentMethod` = `null`. `prisma/schema.prisma:198` — `paymentMethod PaymentMethod?` es **nullable** — el registro se inserta sin error de validación.

### Finding 7: la variante "TRANSF. ELECTRONICA" es una ocurrencia única en todo el lote de 242 cortes

**Evidencia:** barrido completo de las hojas `Ventas` de los 242 cortes buscando `TRANSF`, `TRANSFER`, `ELECTRON`, `ELECTRÓNIC` (case-insensitive) en `Forma Pago`. **Un solo valor único encontrado, una sola ocurrencia:** `"TRANSF. ELECTRONICA (D)"` en `0-01-26 ALICIA gAEL.xlsx`, folio `FN-279`, ticket `5928`. No existe ninguna otra fila en todo el histórico que use la palabra "TRANSFERENCIA" (el método sí reconocido) ni ninguna otra variante de "electrónic[a/o]".

## Deduced Conclusions

### Deduction 1: `UNKNOWN_MEMBERSHIP` (FN477) es degradación de categorización, no pérdida de datos

**Based on:** Findings 1-4.

**Reasoning:** el pipeline completo (parser → transformer → upsert → Prisma) preserva `membershipDescription` verbatim y persiste el socio con todos sus demás campos intactos. Solo el campo enum `membershipType` queda `null` en lugar de un valor categorizado. No hay ningún punto del flujo donde el registro se descarte o el texto se pierda.

**Conclusion:** Reconstruction persistiría a FN477 correctamente como socio, con historial de membresía consultable vía `membershipDescription`, pero sin aparecer en reportes/filtros que agrupen por `membershipType` (caería en el bucket "SIN_TIPO", igual que otros socios con ese campo vacío o no reconocido).

### Deduction 2: `UNKNOWN_PAYMENT_METHOD` (FN-279/5928) es degradación de un solo movimiento de $25, no pérdida de venta

**Based on:** Findings 5-7.

**Reasoning:** el monto, ticket, producto y fecha de la venta se calculan independientemente de si el método de pago fue reconocido. `InventoryMovement.paymentMethod` es nullable — no hay error de escritura. El impacto se limita al campo `paymentMethod` de un único `InventoryMovement`.

**Conclusion:** Reconstruction persistiría el ticket 5928 completo — mismo total ($25), mismo producto (AGUA CIEL 1.5L), misma fecha — pero sin clasificar el método de pago. El efecto observable sería: cualquier reporte que desglose ventas *por método de pago* (ej. `ResumenPorFormaPago`) no contabilizaría estos $25 bajo ninguna categoría de pago — el total general de ventas del corte FN-279 sí seguiría cuadrando (la suma no depende de `paymentMethod`), solo el desglose por método quedaría con un hueco de $25 sin categorizar.

### Deduction 3: la evidencia histórica NO es suficiente para asumir "TRANSF. ELECTRONICA" = "TRANSFERENCIA" como patrón sistemático, pero la evidencia lingüística sí es fuerte

**Based on:** Finding 7 (n=1, sin repetición en 6 meses de historial) contrastado con el propio texto del valor.

**Reasoning:** una sola ocurrencia en ~242 cortes no permite inferir que el sistema legado usaba "TRANSF. ELECTRONICA" de forma consistente como sinónimo de "TRANSFERENCIA" — pudo ser una frase escrita una sola vez por quien cerró esa caja ese día, sin relación necesaria con cómo otros cajeros nombraban ese mismo método en otras ocasiones (que, de hecho, nunca aparece en ningún otro corte tampoco — "TRANSFERENCIA" pura, sin abreviar, no se usó ni una sola vez en todo el lote real). Al mismo tiempo, "Transferencia Electrónica" es terminología bancaria estándar en español — la frase completa que "TRANSFERENCIA" (ya reconocida por el sistema) abrevia — no es una lectura forzada, es el mismo concepto con distinta extensión de texto.

**Conclusion:** la equivalencia semántica es plausible y defendible, pero la evidencia empírica del lote (frecuencia, repetición) es insuficiente por sí sola para confirmarla como un patrón — es una decisión de negocio/producto (interpretar el texto de un cajero), no una inferencia que el código pueda hacer con certeza a partir de los datos disponibles.

## Missing Evidence

| Gap              | Impacto                               | Cómo obtenerla   |
| ---------------- | ------------------------------------ | --------------- |
| Confirmación humana de si "TRANSF. ELECTRONICA" se refería a "TRANSFERENCIA" | Determinaría si corregir el parser (agregar el patrón) o dejar el warning como está | Preguntar al dueño del negocio, igual que se hizo para D/Z |
| Contexto de negocio sobre la membresía "ESPECIAL" de FN477 | Determinaría si amerita un tipo de membresía nuevo o fue un descuento/caso puntual sin categoría formal | Preguntar al dueño del negocio o revisar si FN477 tiene más historial (visitas, pagos) que dé pistas |

## Conclusion

**Confidence:** High (ambos hallazgos son Confirmados por código y datos reales, sin partes Hipotéticas).

Ambos warnings representan **degradación puntual de metadato, no pérdida de datos ni de registros**:

- **`UNKNOWN_MEMBERSHIP` (FN477):** el socio se persiste completo; `membershipDescription="ESPECIAL NOV 2025"` queda disponible como texto libre; solo la categorización enum (`membershipType`) queda vacía. Único caso en todo el lote (158 valores de membresía distintos, "ESPECIAL" aparece exactamente una vez).
- **`UNKNOWN_PAYMENT_METHOD` (FN-279/5928):** la venta se persiste completa ($25, AGUA CIEL 1.5L, ticket 5928); solo `paymentMethod` queda `null`. Único caso en todo el lote (242 cortes, ninguna otra variante de TRANSF/TRANSFER/ELECTRON encontrada).

Ninguno de los dos bloquea la ejecución de Reconstruction ni compromete la integridad de los totales generales del corte o del listado de socios — el efecto se limita a un campo de clasificación en un registro cada uno.

## Recommended Next Steps

### Recomendación: **A — ambos warnings son aceptables, se puede ejecutar Reconstruction sin corregirlos antes**

Justificación: ambos son casos únicos (n=1) sin pérdida de datos económicos ni de registros, con el texto original siempre disponible para auditoría manual posterior (`membershipDescription` en un caso, el propio Excel histórico en el otro). Corregirlos requeriría decisión de negocio (Missing Evidence de arriba), no una inferencia segura del código — forzar una equivalencia sin esa confirmación sería exactamente el mismo riesgo que ya se evitó con D/Z antes de tener la respuesta del dueño.

Si se prefiere de todas formas corregir alguno antes de Reconstruction, el orden de riesgo/beneficio sería: **C (payment method)** primero — es un cambio de una línea en `METHOD_TABLE` una vez confirmado el significado, y afecta un desglose de reportes financieros; **B (membership)** es más discutible porque "ESPECIAL" es un caso único sin patrón, podría ser una promoción ad-hoc sin necesidad de categoría formal nueva.

### Diagnostic

Ninguno adicional necesario — evidencia completa y Confirmada para ambos casos.

## Side Findings

- La distribución `membershipTypeDistribution` de `previewFiles()` reporta `"SIN_TIPO": 8` — esto incluye a FN477, pero **no los 8 corresponden necesariamente a warnings `UNKNOWN_MEMBERSHIP`**: `parseMembership` solo emite warning cuando el texto no está vacío y no coincide con `TYPE_TABLE` (ver `membership-parser.ts:68-79`, un campo `Membresia` vacío no genera warning, solo `membershipType: null` silencioso). Sin expandir esta investigación (fuera del alcance pedido), no se puede afirmar cuántos de los otros 7 "SIN_TIPO" son warnings reales vs. campos vacíos — se deja como nota, no como hallazgo a resolver aquí.
