# Investigation: SGF — Retoma de Contexto (2026-06-22)

## Hand-off Brief

1. **Qué pasó.** SGF completó su primera fase de hardening pre-piloto (v0.1.0-pilot) y aplicó todos los fixes críticos de BH-1/BH-2/BH-3 y el orquestador de renovación atómica. El deploy en Vercel fue configurado, pero los últimos 3 commits son diagnósticos de conectividad a la DB — el deploy puede estar activo pero con problemas de conexión.
2. **Dónde está el caso.** Fase Post-Pilot A parcialmente completada (A1 ✅, A2/A3 pendientes). El único riesgo activo es el estado del deploy en producción. Ningún bug operativo conocido activo.
3. **Qué se necesita.** Confirmar estado del deploy demo, luego retomar Fase A2 (extraer shared utilities) o esperar feedback del piloto real para calibrar prioridades.

---

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | N/A — recuperación de contexto post-pausa |
| Date opened | 2026-06-22 |
| Status | Concluded |
| System | Next.js 16.1.1, Prisma 6.19.2, PostgreSQL, single-cashier, single-gym |
| Evidence sources | docs/PILOT_READY.md, investigations/operational-hardening-investigation.md, investigations/post-pilot-roadmap-investigation.md, git log (últimos 8 commits), commits 741dd18, 0ed0dcb, 7890601, 09bee1b, ded7173, 58031f4 |

---

## 1. QUÉ YA QUEDÓ TERMINADO

### Fase operacional (v0.1.0-pilot baseline)
| Item | Commit | Estado |
|------|--------|--------|
| Gap 1: POS sales ligadas a turno (shiftId) | 1d9d4cf | ✅ |
| Gap 2: Renovaciones visibles en corte (6 keyword types) | 85615a1 | ✅ |
| Gap 3: UI para retiros de efectivo | incluido | ✅ |
| Gap 4: Fix doble resta en fórmula de diferencia | 8cec8fa | ✅ |
| TRANSFER deshabilitado hasta que closeShift soporte transferAmount | 85615a1 | ✅ |
| Smoke tests 25/25 | baseline | ✅ |

### Fase hardening (post-pilot A, parcial)
| Item | Commit | Estado |
|------|--------|--------|
| BH-1: Reemplazar alert() en ventas con UI inline | 741dd18 | ✅ |
| BH-2: Zod parse en 4 inventory routes (sale/entry/adjustment/transfer) | 741dd18 | ✅ |
| BH-3: Mensaje amigable en race condition de folio duplicado | 741dd18 | ✅ |
| A1: Orquestador de renovación atómico (Finding 1 del roadmap) | 0ed0dcb | ✅ |
| UX clarity en cortes (faltante/sobrante visual, efectivo esperado prominente) | 7890601 | ✅ |
| Health endpoint para diagnóstico de deploy | ded7173 + 58031f4 | ✅ |
| Vercel deploy preparado (pg driver adapter, env vars) | 09bee1b + ded7173 | ✅ |

### Decisiones arquitectónicas cerradas
| Decisión | Estado |
|----------|--------|
| D1: Orchestrator pattern | ✅ Implementado — renewal.orchestrator.ts |
| D8: Auth en todos los endpoints | ✅ Confirmado — 100% rutas con getSession |
| D2: Dual Prisma client | ✅ Resuelto — pg driver adapter canónico |
| Arquitectura 8 principios | ✅ Fija — no tocar |

---

## 2. QUÉ QUEDÓ PARCIALMENTE TERMINADO

| Área | Estado parcial | Qué falta |
|------|---------------|-----------|
| Fase A del roadmap post-pilot | A1 ✅, A2 ❌, A3 ❌ | A2: extraer shared utilities a lib/shared/; A3: ampliar MEMBERSHIP_KEYWORDS si el piloto lo confirma |
| Migración services/ → modules/ | members/products/inventory/sales migrados; shifts/reports/users legacy | Bloqueado por A2 — shared utilities siguen en services/ |
| Deploy en producción | Configurado + health endpoint | Estado de conectividad a DB desconocido — últimos commits son diagnósticos |
| Reporte de ventas | Solo muestra stock | D7 no implementado en UI |

---

## 3. QUÉ ESTABA HACIENDO EXACTAMENTE ANTES DE DETENERME

Los últimos 3 commits (`ded7173` → `58031f4`) son:
1. `fix(auth)`: health endpoint + switch to pg driver adapter — diagnóstico de deploy
2. `fix(health)`: expose db host in health endpoint — más diagnóstico de conectividad

**Conclusión:** Estabas depurando la conexión a la DB en el deploy de Vercel/producción. El pg driver adapter fue necesario porque Prisma + Vercel Edge requiere adaptación específica. El último commit expone más info en el health endpoint para diagnosticar si la DB conecta.

**Estado probable del deploy:** Activo pero con incertidumbre sobre la conectividad real. No hay commit que confirme "DB conecta correctamente en producción".

---

## 4. SIGUIENTE PASO INMEDIATO

**Opción A (si el deploy no está confirmado):**
Verificar `https://[tu-dominio-vercel]/api/health` — responde el DB host correctamente → deploy OK → piloto puede arrancar.

**Opción B (si deploy OK y el piloto ya arrancó):**
Revisar métricas de la semana 1:
```sql
SELECT folio, difference, closingDate FROM shift WHERE closingDate IS NOT NULL ORDER BY openingDate DESC LIMIT 10;
SELECT COUNT(*) FROM inventory_movement WHERE shiftId IS NULL AND type='SALE';
SELECT name FROM product WHERE active=true AND (name ILIKE '%PROMO%' OR name ILIKE '%RENACER%' OR name ILIKE '%NUTRICION%');
```

**Opción C (si deploy OK y piloto no arrancó aún):**
A2 — extraer shared utilities: mover `services/enum-mappers.ts`, `services/utils.ts`, `services/membership-helpers.ts` → `lib/shared/`. Prerequisito para Fase B.

---

## 5. RIESGOS Y BLOCKERS ACTUALES

| Riesgo | Severidad | Estado |
|--------|-----------|--------|
| Deploy DB conectividad | 🔴 Alto | Desconocido — últimos commits son diagnósticos sin confirmación |
| MEMBERSHIP_KEYWORDS 6/11 tipos | 🟡 Medio | Latente — activado solo si gimnasio tiene PROMO/RENACER/NUTRICION activos |
| TRANSFER reactivación parcial | 🟡 Medio | Congelado correctamente — no tocar |
| modules/ depende de services/ shared utilities | 🔵 Bajo-Medio | Bloquea migración limpia, no operación |
| shifts.service.ts sin tests (771L) | 🔵 Bajo | Riesgo al modificar, no en uso normal |

---

## 6. TAREAS PENDIENTES POR PRIORIDAD

### Prioridad 1 — Blocker operativo
- [ ] Confirmar deploy: verificar `/api/health` en producción → DB conecta o no

### Prioridad 2 — Si piloto activo (semana 1)
- [ ] Revisar queries diagnóstico (shiftId null, diferencias, tipos membresía activos)
- [ ] A3: Ampliar MEMBERSHIP_KEYWORDS si hay tipos PROMO/RENACER activos

### Prioridad 3 — Fase A2 (prerequisito para Fase B)
- [ ] Extraer `services/enum-mappers.ts`, `services/utils.ts`, `services/membership-helpers.ts` → `lib/shared/`
- [ ] Actualizar imports en todos los módulos de `../../services/*` → `@/lib/shared/*`
- [ ] Dejar services/*.ts como re-exportadores temporales

### Prioridad 4 — Fase B (trigger: TRANSFER pedido o piloto estabilizado >2 semanas)
- [ ] B1: Migrar shifts.service.ts + añadir transferAmount (solo cuando TRANSFER sea pedido explícitamente)
- [ ] B2: Migrar reports.service.ts + expandir UI de reportes (solo cuando dueño pida ventas por período)

### Prioridad 5 — Fase C (post-B)
- [ ] Unit tests para lib/domain/shifts/shift-calculations.ts
- [ ] E2E Playwright: flujo completo login→turno→venta→cierre

---

## 7. ESTADO DEL DEPLOY DEMO

| Aspecto | Estado |
|---------|--------|
| Vercel configurado | ✅ (commit 09bee1b) |
| pg driver adapter | ✅ (commit ded7173) |
| Health endpoint activo | ✅ (`/api/health` expone db host) |
| Conectividad DB confirmada | ❓ Desconocido — los últimos commits SON el diagnóstico, no la solución confirmada |
| BETTER_AUTH_URL, DATABASE_URL en env | Presumiblemente sí (parte del 09bee1b prep) |

**Acción:** Visitar `/api/health` en el dominio de producción. Si retorna `{ status: "ok", db: "connected" }` → piloto puede arrancar. Si retorna error → hay que resolver la conexión primero.

---

## 8. ESTADO DEL PILOTO CON EL DUEÑO

Según evidencia documental:
- **Piloto recomendado:** 1 turno/día, 1 cajero, supervisión del dueño las primeras 2 semanas
- **Estado del piloto real:** Desconocido — no hay evidencia de que haya arrancado
- **Prerequisito:** Deploy funcional (ver punto 7)
- **Semáforo operativo:** Verde para piloto controlado una vez que el deploy esté confirmado

---

## 9. DECISIONES ARQUITECTÓNICAS CERRADAS

| Decisión | Resolución | Archivo |
|----------|-----------|---------|
| D1 — Orchestrator para ops multi-contexto | Implementado con Prisma $transaction | lib/orchestrators/renewal.orchestrator.ts |
| D2 — Dual Prisma client | Resuelto con pg driver adapter canónico | lib/db.ts + next.config.ts |
| D4 — Estrategia tests | Smoke tests API (25/25) = baseline; E2E diferido a Fase C | scripts/smoke-test.ts |
| D6 — shifts.service.ts migar o congelar | Congelado funcionalmente; migrar solo con trigger TRANSFER | services/shifts.service.ts |
| D8 — Endpoint público ticket | Resuelto: ya tiene auth | app/api/inventory/ticket/[ticket]/route.ts |
| Arquitectura 8 principios | Canónica, cerrada | CLAUDE.md |
| Fórmula canónica de diferencia | Cerrada post-Gap4 | lib/domain/shifts/shift-calculations.ts |
| TRANSFER deshabilitado | Cerrado hasta schema migration | UI (2 modales) |

---

## 10. QUÉ NO DEBE TOCARSE TODAVÍA

| Área | Motivo |
|------|--------|
| `lib/domain/shifts/shift-calculations.ts` | Correcto post-Gap4; cualquier cambio rompe arqueo |
| `scripts/smoke-test.ts` (625L, 25/25) | Baseline de regresión; solo ampliar, nunca destruir |
| `types/api/` (contratos Zod) | Estables; cambiar solo si hay endpoint nuevo |
| `prisma/schema.prisma` | Solo extender additive; nunca renombrar columnas en producción |
| `services/shifts.service.ts` (771L) | No migrar hasta que haya trigger funcional (TRANSFER) |
| MEMBERSHIP_KEYWORDS (los 6 actuales) | No quitar; solo añadir si A3 lo confirma |
| TRANSFER payment method | Reactivar requiere 4 cambios coordinados (schema + service + shift-calc + UI); no tocar parcialmente |

---

## Conclusion

**Confidence:** High

**Resumen ejecutivo:** SGF está en estado post-hardening. Todos los bugs operativos conocidos están resueltos. El sistema tiene 25/25 smoke tests pasando. La arquitectura está cerrada en sus decisiones fundamentales. El único punto de incertidumbre activo es el estado del deploy en producción — los últimos 3 commits son diagnósticos de conectividad, sin confirmación explícita de éxito.

**Estado:** Concluded — contexto recuperado, no hay investigación abierta pendiente.

---

## RESUMEN EJECUTIVO PARA HOY (1-2 HORAS)

**Si solo tienes 1-2 horas, el orden es:**

1. **(15 min)** Verificar deploy: abrir `/api/health` en el dominio Vercel. ¿Conecta la DB?
   - Si ✅ → el piloto puede arrancar con el dueño. Documentar la URL del deploy.
   - Si ❌ → depurar conexión (revisar DATABASE_URL en Vercel env vars, verificar que la DB acepta conexiones externas, revisar pg vs. pg-pool driver config).

2. **(Si deploy OK + 1 hora libre)** Si el piloto ya tiene datos reales, correr las 3 queries diagnóstico del point 4. Si no hay datos aún, empezar A2 (extraer shared utilities — es mecánico, sin riesgo).

3. **(Si deploy aún roto + 1 hora libre)** Fix del deploy es la prioridad única — sin deploy, el piloto no arranca.

**El riesgo de no hacer nada hoy:** Ninguno en el código. El riesgo es operativo: si el deploy no está funcional y el dueño quiere empezar el piloto, hay un blocker real.
