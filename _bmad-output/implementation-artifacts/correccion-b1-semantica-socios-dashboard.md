# Story B1: Semántica de Socios y Dashboard post-Reconstruction

**Status:** done
**Epic:** Corrección Post-Reconstruction — Consistencia de Datos y Métricas (iniciativa ad-hoc, fuera de la numeración de Epic 1/2/3)
**Prioridad:** Alta — corrige que las cards de `/socios` puedan volverse triviales/engañosas al combinarse con sus propios filtros de estado (activos por default), y que el Dashboard oculte membresías vencidas de socios inactivos.
**Orden en el plan aprobado:** 6 de 6 (D2 → D1 → C1 → A1 → A2 → B1). D2, D1, C1, A1 y A2 ya están `done`. A2 cerrado en commit `1f6e9b6` en `origin/main`. Esta es la última Story del plan ad-hoc post-Reconstruction.

---

## Story

Como administrador que consulta `/socios` o el Dashboard,
quiero que las cards de Socios representen el universo completo bajo búsqueda/tipo (sin verse afectadas por sus propios ejes de estado/vigencia), y que el Dashboard muestre TODAS las membresías vencidas que requieren atención (no solo las de socios activos),
para que ninguna de las dos vistas oculte o trivialice información real por mezclar ejes de negocio independientes.

---

## Contexto del desarrollador

### Dos ejes de negocio — independientes, no derivables entre sí (dato de entrada aprobado, no reabrir la discusión)

1. **Estado operativo** — `Member.isActive` (`prisma/schema.prisma:149`, `Boolean @default(true)`): `true` = activo, `false` = inactivo. Se cambia manualmente (Story 3.4, activación/desactivación de empleados/socios) — no tiene relación automática con fechas de membresía.
2. **Vigencia de membresía** — derivada de `Member.endDate` (`DateTime?`): `endDate >= hoy` = vigente, `endDate < hoy` = vencida, `endDate == null` = sin membresía.

Un socio puede estar en cualquiera de las 4 combinaciones (activo+vigente, activo+vencido, inactivo+vigente, inactivo+vencido) — todas son estados legítimos, ninguno se corrige ni se sincroniza en esta Story. **No** se deriva `isActive` desde `endDate` ni viceversa. **No** hay escritura en DB en ningún punto de esta Story — es 100% lectura/presentación.

### Causa raíz — `/socios`: cards heredan los filtros de estado/vigencia que ellas mismas resumen

`app/(dashboard)/socios/_components/socios-manager.tsx:59-62,119`:

```typescript
const membersFiltrados = useMemo(
  () => filtrarSocios(members, filtros),
  [members, filtros],
);
...
<SociosStats members={membersFiltrados} />
```

`membersFiltrados` aplica los 4 filtros de `SociosFiltros` (`modules/members/types.ts:15-22`: `busqueda`, `estado`, `vigencia`, `tipoMembresia`) vía `filtrarSocios()` (`modules/members/domain/filters.ts:115-128`). El **default** de `estado` es `"activos"` (`FILTROS_INICIALES`, `modules/members/types.ts:24-31`) — así que, sin que el admin toque nada, las cards "Vigentes"/"Vencidos" ya excluyen a los inactivos, volviendo la card "Vencidos" engañosamente baja (solo cuenta vencidos-activos, no el universo real de membresías vencidas). Si el admin filtra `estado=inactivos`, la card "Vigentes" puede caer a un número artificialmente bajo — no porque haya pocos vigentes, sino porque el filtro de estado ya excluyó a los activos. Las cards se vuelven una tautología de su propio filtro en vez de un resumen del universo relevante.

`SociosStats` (`app/(dashboard)/socios/_components/socios-stats.tsx:13-14`) simplemente hace `calcularEstadisticas(members)` sobre lo que reciba — el bug no está en `SociosStats` ni en `calcularEstadisticas()`, está en **qué array se le pasa** desde `socios-manager.tsx`.

### Causa raíz — Dashboard: `getExpiredMembers()` oculta vencidos inactivos

`modules/members/members.service.ts:433-443`:

```typescript
export async function getExpiredMembers(): Promise<SocioVencidoResponse[]> {
  const today = new Date();
  const members = await prisma.member.findMany({
    where: {
      isActive: true,           // ← esto oculta vencidos inactivos
      endDate: { lt: today },
      membershipType: { not: "VISIT" },
    },
    orderBy: { endDate: "desc" },
  });
  ...
}
```

Un socio con membresía vencida que además está marcado `isActive:false` (por cualquier razón administrativa) desaparece por completo de las alertas del Dashboard — pero sigue siendo una membresía vencida real que puede requerir atención (ej. contactar para renovación, independientemente de si está "activo" en el sistema). El filtro `isActive:true` no es parte de la semántica aprobada de "membresía vencida" (que depende únicamente de `endDate`), es un criterio de estado operativo que no debería condicionar esta query.

### `calcularEstadisticas()` — verificado, SIN bug de mezcla (no reabrir, no modificar salvo que la implementación real difiera de esto)

`modules/members/domain/calculations.ts:33-62` — revisado línea por línea:

```typescript
export function calcularEstadisticas(members: Socio[]): SociosEstadisticas {
  const today = todayMidnight();
  let activos = 0, conMembresia = 0, vencidos = 0, totalVisitas = 0;

  for (const m of members) {
    if (m.isActive) activos++;              // eje 1: independiente
    totalVisitas += m.totalVisits;

    if (m.endDate) {                          // eje 2: independiente, guard sobre null
      const end = parseDate(m.endDate);
      if (end >= today) conMembresia++;       // vigentes: endDate >= hoy
      else vencidos++;                        // vencidos: endDate < hoy
    }
    // endDate == null: no incrementa conMembresia NI vencidos — correcto (AC-8)
  }

  return { total: members.length, activos, conMembresia, vencidos, totalVisitas };
}
```

Los dos ejes viven en bloques `if` completamente separados dentro del mismo loop — `activos` nunca condiciona `conMembresia`/`vencidos` y viceversa. `endDate == null` cae fuera de ambos contadores (ni vigente ni vencido) — coincide exactamente con la semántica aprobada. **No requiere corrección.** Si al implementar se encuentra que el código real difiere de este extracto, es una contradicción técnica real — detenerse y reportar, no corregir silenciosamente asumiendo que esta Story tenía razón.

Nota de nomenclatura: el campo se llama `conMembresia` internamente pero la card en `socios-stats.tsx:38` lo etiqueta "Vigentes" — son el mismo dato, sin relación con el nombre. No renombrar el campo (fuera de alcance, es un cambio de API interna sin beneficio para esta Story).

Nota sobre "Visitas": la card "Visitas" (`socios-stats.tsx:70-74`, `stats.totalVisitas`) suma `member.totalVisits` (contador de check-ins acumulado por socio) de TODOS los miembros en el array recibido — **no** es un conteo de socios con `membershipType="VISIT"`. Es la semántica real existente y esta Story la conserva sin cambios (AC explícito lo confirma, no se reinterpreta).

### Filtros reales soportados por `filtrarSocios()` (revisado puntualmente — no reauditar el módulo)

`modules/members/domain/filters.ts:115-128` aplica, en este orden, sobre `members`: `matchesBusqueda` (línea 29-38), `matchesEstado` (línea 40-46), `matchesVigencia` (línea 48-66), `matchesTipoMembresia` (línea 68-71) — y luego ordena con `sortMembers`. Cada `matches*` es independiente y **ya soporta un valor neutro que la vuelve no-operativa**:
- `matchesEstado(m, "todos")` → siempre `true` (línea 44).
- `matchesVigencia(m, "todos")` → siempre `true` (línea 52).

Esto permite reutilizar `filtrarSocios()` sin modificarlo ni duplicar su lógica: llamarlo con `{ ...filtros, estado: "todos", vigencia: "todos" }` produce exactamente el universo filtrado solo por `busqueda` + `tipoMembresia` — sin tocar `filters.ts`.

---

## Acceptance Criteria

1. **AC-1** — Las cards de `/socios` (Total Socios, Vigentes, Vencidos, Visitas) NO cambian cuando el admin cambia el filtro `estado` (activos/inactivos/todos) — el array que reciben ignora ese eje.
2. **AC-2** — Las cards de `/socios` NO cambian cuando el admin cambia el filtro `vigencia` (vigentes/vencidos/sin_membresia/todos).
3. **AC-3** — Las cards de `/socios` SÍ cambian cuando el admin escribe en `búsqueda`.
4. **AC-4** — Las cards de `/socios` SÍ cambian cuando el admin cambia `tipoMembresia`.
5. **AC-5** — La tabla de `/socios` (`membersPaginados`, vía `membersFiltrados`) sigue respetando los 4 filtros (`busqueda`, `estado`, `vigencia`, `tipoMembresia`) exactamente como hoy — sin regresión.
6. **AC-6** — El filtro default de la tabla sigue siendo `estado: "activos"` (`FILTROS_INICIALES` sin cambios) — no se "resuelve" el problema cambiando el default a `"todos"`.
7. **AC-7** — `isActive` y vigencia (`endDate`) son ejes verificablemente independientes en `calcularEstadisticas()`: existe un caso de prueba con socio activo+vencido y otro con socio inactivo+vigente, ambos clasificados correctamente en ambos ejes simultáneamente.
8. **AC-8** — Un socio con `endDate == null` no incrementa ni `conMembresia` (vigentes) ni `vencidos` en `calcularEstadisticas()`.
9. **AC-9** — `getExpiredMembers()` (Dashboard) ya NO filtra por `isActive` — un socio inactivo con membresía vencida aparece en el resultado.
10. **AC-10** — `getExpiredMembers()` sigue excluyendo `membershipType: "VISIT"` — sin regresión de esa exclusión.
11. **AC-11** — El label visible del Dashboard asociado a `sociosVencidos`/`getExpiredMembers()` deja explícito que excluye visitas (ej. "Membresías vencidas (excluye visitas)" o redacción equivalente) — en ambos lugares donde se muestra ese dato (`dashboard-stats.tsx` card "Vencidos" y `alertas-dashboard.tsx` sección "Membresías Vencidas").
12. **AC-12** — Ningún cambio de esta Story escribe en `Member.isActive` ni en ningún otro campo — `getExpiredMembers()`, `calcularEstadisticas()` y `filtrarSocios()` siguen siendo de solo lectura; no se agrega ningún recálculo persistido.

---

## Tasks / Subtasks

- [x] **T1** — `/socios`: separar universo de cards del universo de tabla (AC-1 a AC-6)
  - [x] T1.1 — En `app/(dashboard)/socios/_components/socios-manager.tsx`, agregar un segundo `useMemo` junto al de `membersFiltrados` (línea 59-62):
    ```typescript
    const membersFiltradosParaCards = useMemo(
      () => filtrarSocios(members, { ...filtros, estado: "todos", vigencia: "todos" }),
      [members, filtros],
    );
    ```
    Reutiliza `filtrarSocios()` sin modificarlo — los valores `"todos"` en `estado`/`vigencia` hacen que `matchesEstado`/`matchesVigencia` (`filters.ts:44,52`) sean siempre `true`, dejando efectivamente solo `busqueda` + `tipoMembresia` operativos.
  - [x] T1.2 — Cambiar la línea 119 de `<SociosStats members={membersFiltrados} />` a `<SociosStats members={membersFiltradosParaCards} />`.
  - [x] T1.3 — `membersFiltrados` (tabla), `membersPaginados`, `totalPaginas`, `FILTROS_INICIALES` y `SociosFiltrosComponent` quedan exactamente igual — no tocar (AC-5, AC-6).
  - [x] T1.4 — No modificar `filters.ts`, `SociosStats`, ni `calcularEstadisticas()` — el fix es enteramente de composición en `socios-manager.tsx` (AC-7/AC-8 se verifican, no se corrigen, ver T3).

- [x] **T2** — Dashboard: `getExpiredMembers()` deja de exigir `isActive` (AC-9, AC-10)
  - [x] T2.1 — En `modules/members/members.service.ts` (`getExpiredMembers()`, líneas 433-443), eliminar la línea `isActive: true,` del `where`. El `where` resultante conserva `endDate: { lt: today }` y `membershipType: { not: "VISIT" }` sin cambios.
  - [x] T2.2 — No modificar el resto de la función (`serializeMember`, cálculo de `daysExpired`, `orderBy`) — fuera de alcance.

- [x] **T3** — Dashboard: labels explícitos sobre exclusión de visitas (AC-11)
  - [x] T3.1 — En `app/(dashboard)/_components/dashboard-stats.tsx`, la card con `CardTitle` "Vencidos" (línea 52) y su subtexto "socio"/"socios" (línea 60-62): actualizar el texto visible para dejar explícita la exclusión de visitas — ej. cambiar el subtexto a algo como "membresías (excl. visitas)" o ajustar el título, manteniendo el layout de card compacto existente. No cambiar el dato numérico (`sociosVencidos`), solo el texto.
  - [x] T3.2 — En `app/(dashboard)/_components/alertas-dashboard.tsx`, el `CardTitle` "Membresías Vencidas" (línea 27): cambiar a algo como "Membresías Vencidas (excluye visitas)". No tocar el resto del componente (badges, lista, `+N más`).
  - [x] T3.3 — No modificar ninguna otra métrica de `dashboard-stats.tsx` (Ventas Hoy, Total Hoy, Stock Bajo) ni de `alertas-dashboard.tsx` (sección "Stock Bajo") — fuera de alcance.

- [x] **T4** — Validación (AC-1 a AC-10)
  - [x] T4.1 — Crear `scripts/socios-stats-semantics-smoke-test.ts` (patrón `assert()` existente, sin DB) cubriendo con fixtures puros:
    - socio activo + vencido → cuenta en `vencidos`, y `isActive` sigue `true` en el registro (no se toca).
    - socio inactivo + vigente → cuenta en `conMembresia`, y `isActive` sigue `false`.
    - socio con `endDate == null` → no cuenta en `conMembresia` ni en `vencidos` (AC-8).
    - `filtrarSocios(members, {...filtros, estado:"todos", vigencia:"todos"})` con un set mixto de activos/inactivos/vigentes/vencidos → devuelve TODOS (ignora esos 2 ejes), pero sigue respetando `busqueda`/`tipoMembresia` cuando se activan (AC-1 a AC-4).
    - `filtrarSocios(members, filtros)` (sin neutralizar) con `estado:"activos"` → sigue excluyendo inactivos (AC-5, confirma que la tabla no cambió).
  - [x] T4.2 — Registrar `"smoke:socios-stats-semantics": "tsx scripts/socios-stats-semantics-smoke-test.ts"` en `package.json`.
  - [x] T4.3 — Verificar `getExpiredMembers()` contra la DB actual en solo lectura (sin escritura): confirmar que el resultado incluye socios con `isActive:false` si existen con membresía vencida, y que ningún `membershipType="VISIT"` aparece.
  - [x] T4.4 — `npx tsc --noEmit` y `npm run lint` acotado a los archivos tocados.

---

## Dev Notes

### Archivos que CAMBIAN (UPDATE)

| Archivo | Cambio |
|---|---|
| `app/(dashboard)/socios/_components/socios-manager.tsx` | Nuevo `membersFiltradosParaCards` (composición sobre `filtrarSocios()` existente, sin nueva lógica de dominio); `<SociosStats>` consume ese array en vez de `membersFiltrados` |
| `modules/members/members.service.ts` | `getExpiredMembers()`: elimina `isActive: true` del `where` |
| `app/(dashboard)/_components/dashboard-stats.tsx` | Texto visible de la card "Vencidos" — sin cambio de dato |
| `app/(dashboard)/_components/alertas-dashboard.tsx` | Texto visible del título "Membresías Vencidas" — sin cambio de dato |
| `package.json` | Nuevo script `smoke:socios-stats-semantics` |

### Archivos NUEVOS (CREATE)

| Archivo | Contenido |
|---|---|
| `scripts/socios-stats-semantics-smoke-test.ts` | Smoke test puro (sin DB) de `calcularEstadisticas()` y de la composición `filtrarSocios(..., {estado:"todos", vigencia:"todos"})` |

### Archivos que NO cambian

- `modules/members/domain/calculations.ts` (`calcularEstadisticas()`) — verificado sin bug de mezcla de ejes (ver "Contexto del desarrollador"). Si la implementación real difiere de lo documentado aquí, es una contradicción técnica — detenerse y reportar, no corregir por asunción.
- `modules/members/domain/filters.ts` (`filtrarSocios()`, `matchesEstado`, `matchesVigencia`) — ya soporta el valor `"todos"` como no-op en ambos ejes; no requiere ninguna función nueva.
- `app/(dashboard)/socios/_components/socios-stats.tsx` — sigue recibiendo `members: SocioResponse[]` y llamando `calcularEstadisticas()` igual que hoy; el cambio es exclusivamente en qué array le pasa el padre.
- `modules/members/types.ts` (`FILTROS_INICIALES`, `SociosFiltros`) — sin cambios (AC-6).
- `types/api/members.ts` (`SocioVencidoResponse`) — sin cambios de forma; `getExpiredMembers()` cambia su filtro `where`, no su tipo de retorno.
- Cualquier lógica de activación/desactivación de socios (Story 3.4) — fuera de alcance, no se sincroniza `isActive` con nada.

### Por qué la composición `{...filtros, estado:"todos", vigencia:"todos"}` y no una función nueva

`filtrarSocios()` ya es la función pura canónica para "aplicar los filtros de Socios" — reimplementar un subconjunto de su lógica en una función paralela (`filtrarSociosParaCards()`) duplicaría `matchesBusqueda`/`matchesTipoMembresia` innecesariamente. Como `matchesEstado`/`matchesVigencia` ya tratan `"todos"` como no-op, pasar un objeto de filtros con esos dos campos neutralizados logra exactamente el resultado deseado reutilizando el 100% de la función existente — cero código de dominio nuevo, cero riesgo de divergencia futura entre las dos rutas de filtrado.

### Riesgo de confundir "Vencidos" de Socios con "Vencidos" del Dashboard

Después de esta Story, ambos números pueden diferir legítimamente: la card "Vencidos" de `/socios` cuenta TODO vencido (activos+inactivos, cualquier `membershipType` incluyendo `VISIT` si tuviera `endDate`), mientras el Dashboard cuenta vencidos de cualquier estado EXCLUYENDO `VISIT`. Son intencionalmente distintos — el AC-11 (labels explícitos) existe precisamente para que esta divergencia no se lea como inconsistencia de datos.

### Contradicción técnica — ninguna encontrada

La implementación real de `calcularEstadisticas()`, `filtrarSocios()` y `getExpiredMembers()` revisada coincide exactamente con lo asumido en las decisiones aprobadas — no se encontró ninguna divergencia que requiera reabrir el diseño.

---

## Relación con la inconsistencia post-Reconstruction

B1 es la sexta y última Story del plan ad-hoc post-Reconstruction (D2 → D1 → C1 → A1 → A2 → B1). A diferencia de D2/D1 (pérdida de `salePrice`), C1 (contaminación de stock por pseudo-productos) y A1/A2 (stats derivadas de la página en vez del universo, en Cortes e Historial de Ventas respectivamente), B1 combina dos causas relacionadas pero distintas dentro del mismo dominio (Socios): cards que heredan filtros que deberían ignorar (mismo patrón conceptual que A1/A2 — una vista "resumen" contaminada por un filtro que el propio resumen describe) y una query de Dashboard que mezcla un eje de estado operativo con la semántica de vigencia que debería representar exclusivamente. Ninguna requiere backfill de datos (a diferencia de D1) — ambas son correcciones de lectura/presentación sobre datos ya correctos.

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Un desarrollador "corrige" `calcularEstadisticas()` sin necesidad, introduciendo mezcla de ejes donde no existía | Media | Alto (reintroduce exactamente el bug que B1 previene) | Sección "`calcularEstadisticas()` — verificado, SIN bug de mezcla" documenta explícitamente por qué no se toca |
| Cambiar el default de `estado` a `"todos"` como "solución rápida" al problema de las cards | Media si no se lee el plan | Alto (viola AC-6, cambia el comportamiento por defecto de la tabla para todos los admins) | AC-6 explícito; Dev Notes aclara que el fix es de composición, no de default |
| Confundir la card "Vencidos" de Socios con el widget "Vencidos" del Dashboard como si debieran coincidir siempre | Media | Bajo (confusión de usuario, no bug de datos) | AC-11 (labels) + sección "Riesgo de confundir..." explican la divergencia intencional |
| Reimplementar el filtro de cards como función nueva en `filters.ts` en vez de reutilizar `filtrarSocios()` con `"todos"` | Baja | Bajo (duplicación evitable, no bug funcional) | Sección "Por qué la composición..." documenta el enfoque aprobado |

---

## Dev Agent Record

**Estado:** Implementación completa. Todos los AC (AC-1 a AC-12) verificados. Sin contradicción técnica — `calcularEstadisticas()` confirmada tal cual documentada, sin necesidad de cambios.

### File List

- `app/(dashboard)/socios/_components/socios-manager.tsx` (modificado) — nuevo `membersFiltradosParaCards` (composición sobre `filtrarSocios()` con `estado`/`vigencia` neutralizados a `"todos"`); `<SociosStats>` lo consume en vez de `membersFiltrados`.
- `modules/members/members.service.ts` (modificado) — `getExpiredMembers()`: eliminado `isActive: true` del `where`.
- `app/(dashboard)/_components/dashboard-stats.tsx` (modificado) — card renombrada de "Vencidos" a "Membresías Vencidas", subtexto cambiado a "excluye visitas".
- `app/(dashboard)/_components/alertas-dashboard.tsx` (modificado) — título cambiado de "Membresías Vencidas" a "Membresías Vencidas (excluye visitas)".
- `scripts/socios-stats-semantics-smoke-test.ts` (nuevo) — smoke test puro (sin DB): independencia isActive/vigencia, endDate null, visita vencida, cards ignoran estado/vigencia, cards responden búsqueda/tipo, tabla conserva los 4 filtros, default `activos` intacto.
- `package.json` (modificado) — nuevo script `smoke:socios-stats-semantics`.

### Change Log

- Implementación de B1: `/socios` separa `membersFiltradosParaCards` (búsqueda+tipoMembresia) de `membersFiltrados` (los 4 filtros, para la tabla) — reutiliza `filtrarSocios()` sin duplicar lógica. `getExpiredMembers()` deja de exigir `isActive:true` — ahora incluye membresías vencidas de socios inactivos, conservando la exclusión de `VISIT`. Labels de Dashboard actualizados para comunicar explícitamente la exclusión de visitas.

### Completion Notes

- `calcularEstadisticas()` (`modules/members/domain/calculations.ts:33-62`) verificada contra el código real — coincide exactamente con lo documentado en la Story: `activos` e independiente de `conMembresia`/`vencidos`, `endDate==null` no cuenta en ningún lado. **No se modificó** — sin contradicción técnica encontrada (AC-7, AC-8).
- `membersFiltradosParaCards` implementado exactamente como diseñado: `filtrarSocios(members, { ...filtros, estado: "todos", vigencia: "todos" })` — cero código nuevo de dominio, reutiliza `matchesEstado`/`matchesVigencia` ya soportando `"todos"` como no-op. `membersFiltrados` (tabla), `FILTROS_INICIALES` (`estado:"activos"` default) y `SociosFiltrosComponent` sin tocar (AC-5, AC-6).
- `getExpiredMembers()`: solo se eliminó la línea `isActive: true,`; `endDate:{lt:today}` y `membershipType:{not:"VISIT"}` intactos (AC-9, AC-10). No se tocó `serializeMember`, `daysExpired`, ni `orderBy`.
- Labels: `dashboard-stats.tsx` (card corta) y `alertas-dashboard.tsx` (sección de alertas) — ambos ahora comunican la exclusión de visitas; ningún otro texto ni dato de esas cards/secciones se modificó (AC-11).
- Sin escrituras en DB en ningún punto — `getExpiredMembers()`, `calcularEstadisticas()`, `filtrarSocios()` siguen siendo de solo lectura/cómputo puro; `Member.isActive` no se sincroniza ni se recalcula (AC-12).
- Ninguna contradicción técnica real encontrada — no fue necesario detenerse ni reportar desviación del diseño aprobado.

**Validación ejecutada:**
- `npm run smoke:socios-stats-semantics` (nuevo) → 10/10 ✓.
- `npm run smoke:member-upsert` (existente, relevante al dominio de Member) → 24/24 ✓, sin regresión.
- `npx tsc --noEmit` → sin errores.
- `npm run lint` acotado a los 5 archivos tocados → 0 errores (2 warnings preexistentes de `_userId` sin uso en `members.service.ts`, no relacionados con esta Story ni introducidos por ella).
- **Cifras reales verificadas en solo lectura (DB actual, sin escritura):**
  - Total socios en DB: 652.
  - Tabla (`estado=activos` default): 1 socio (activo+vigente) — sin cambio de comportamiento (AC-6).
  - Cards (post-fix, estado/vigencia neutralizados): 652 total, `activos=1`, `conMembresia=1`, `vencidos=651`.
  - **Impacto real del bug de Dashboard confirmado dramáticamente**: `getExpiredMembers()` con `isActive:true` forzado (comportamiento ANTES del fix) → **0 resultados**. Sin ese filtro (comportamiento DESPUÉS) → **643 resultados**. Los 643 vencidos reales eran 100% invisibles en el Dashboard antes de este fix — `AlertasDashboard` incluso ocultaba la sección completa (`sociosVencidos.length === 0` → `return null`).
  - No se ejecutó Sync ni Reconstruction, ni se escribió en la DB real.

---

## Senior Developer Review (AI)

**Fecha:** 2026-07-06
**Resultado:** Aprobada. Sin hallazgos bloqueantes.
**Alcance revisado:** diff exacto del commit `e4135ed` (`socios-manager.tsx`, `members.service.ts`, `dashboard-stats.tsx`, `alertas-dashboard.tsx`). No se reauditaron members/dashboard completos, no se usaron subagentes, no se escribió en DB.

### Verificado sin hallazgos

1. **`membersFiltradosParaCards` correcto** — `{...filtros, estado:"todos", vigencia:"todos"}` conserva `busqueda`/`tipoMembresia`/`ordenarPor`/`orden` del spread; solo sobrescribe los dos ejes que debía neutralizar.
2. **Tabla intacta** — `membersFiltrados = filtrarSocios(members, filtros)` sin cambios en el diff; `FILTROS_INICIALES`/`types.ts` no aparecen en el diff → default `estado:"activos"` confirmado sin tocar.
3. **`calcularEstadisticas()` no aparece en el diff** — confirmado sin modificar, tal como exigía la Story.
4. **Query final de `getExpiredMembers()`** — `{endDate:{lt:today}, membershipType:{not:"VISIT"}}`, sin `isActive`. Verificado contra DB real (solo lectura): total=643, de los cuales 0 son `VISIT` y 0 tienen `endDate=null` coincidiendo en el resultado — coherente: el semántico `lt` de Prisma excluye `NULL` de forma nativa (comparación SQL `NULL < fecha` = desconocido, no verdadero).
5. **Labels** — `dashboard-stats.tsx` ("Membresías Vencidas" / "excluye visitas") y `alertas-dashboard.tsx` ("Membresías Vencidas (excluye visitas)") — ambos comunican la exclusión explícitamente.

### Observación no bloqueante

6. **`smoke:socios-stats-semantics` no detectaría una regresión en el wiring de `socios-manager.tsx`** (ej. si alguien revirtiera `<SociosStats members={membersFiltrados}>` en vez de `membersFiltradosParaCards`) — el smoke test cubre la composición de `filtrarSocios()` a nivel de dominio, no el JSX del componente. Mismo patrón ya aceptado en la revisión de A1 (`1e66083`): el repo no tiene infraestructura de test de componentes. No es hallazgo — es el mismo trade-off ya documentado y aceptado en esta iniciativa.

### Action Items

Ninguno — sin hallazgos que corregir.
