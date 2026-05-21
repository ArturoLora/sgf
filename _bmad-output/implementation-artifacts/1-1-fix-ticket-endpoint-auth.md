# Story 1.1: Fix Endpoint Ticket Sin Autenticación

Status: done

## Story

Como sistema de seguridad,
quiero que el endpoint `/api/inventory/ticket/[ticket]` valide la sesión del usuario antes de devolver datos,
para que los datos de ventas no sean accesibles sin autenticación, en consistencia con todos los demás 24 endpoints del sistema.

## Acceptance Criteria

1. El endpoint `GET /api/inventory/ticket/[ticket]` devuelve `{ error: "No autorizado" }` con status `401` cuando no hay sesión activa.
2. El endpoint devuelve los datos de ventas correctamente cuando hay sesión válida (comportamiento existente preservado).
3. La implementación es idéntica al patrón de auth del resto de routes (`auth.api.getSession` + `headers()`).
4. No se rompe ningún flujo existente que ya consumía este endpoint desde contexto autenticado.

## Tasks / Subtasks

- [x] Task 1: Agregar auth check al handler GET (AC: 1, 2, 3)
  - [x] Agregar imports: `headers` de `next/headers`, `auth` de `@/lib/auth`
  - [x] Agregar session check al inicio del try block, antes de leer params
  - [x] Retornar 401 si `!session`
- [x] Task 2: Verificar que el endpoint sigue funcionando con sesión válida (AC: 2, 4)
  - [x] Confirmar que `InventoryService.getSalesByTicket(ticket)` sigue siendo llamado igual
  - [x] Confirmar que el response shape no cambia

## Dev Notes

### Archivo a modificar

**`app/api/inventory/ticket/[ticket]/route.ts`** — ÚNICO archivo a tocar.

**Estado actual (código completo):**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticket: string }> },
) {
  try {
    const { ticket } = await params;

    const sales = await InventoryService.getSalesByTicket(ticket);

    return NextResponse.json(sales);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al obtener ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Estado objetivo (código completo):**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticket: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { ticket } = await params;

    const sales = await InventoryService.getSalesByTicket(ticket);

    return NextResponse.json(sales);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al obtener ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### Patrón de referencia (P-03 — Route Canónica)

El patrón exacto usado por los otros 24 endpoints. Ver `app/api/members/route.ts`:

```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
```

- Import `headers` de `"next/headers"` (no de `"next/server"`)
- Import `auth` de `"@/lib/auth"`
- Session check SIEMPRE antes de parsear params o body
- Response de error: `{ error: "No autorizado" }` (campo `error`, no `message`)

### Contexto de seguridad

- Este es el ÚNICO de los 25 endpoints sin auth check — todos los demás lo tienen
- No existe flujo público de tickets confirmado; el endpoint quedó sin auth por omisión
- Si en el futuro se necesita un endpoint de recibo público, se crea uno nuevo separado con DTO limitado, rate limiting y token temporal (decisión D8 en architecture.md)

### Lo que NO debe cambiar

- La firma del handler (`request`, `params`) — no cambiarla
- El import de `InventoryService` — no moverlo
- El behavior cuando la sesión ES válida — la lógica de negocio no cambia
- El error shape en el catch — ya usa `{ error: message }` correctamente

### Lo que NO hacer

- No cambiar el import de `InventoryService` a otra ubicación
- No agregar validación del ticket más allá de lo existente
- No cambiar el response shape en el caso exitoso
- No agregar rate limiting (es futura, decisión diferida)

### Project Structure Notes

```
app/api/inventory/ticket/[ticket]/route.ts  ← ÚNICO archivo a modificar
```

Sin cambios en servicios, módulos, tipos o frontend.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#D8] Decisión D8: endpoint debe ser autenticado. Patrón futuro público es separado.
- [Source: _bmad-output/planning-artifacts/architecture.md#P-03] Patrón P-03: Route canónica — auth check es el primer paso.
- [Source: app/api/members/route.ts] Patrón de referencia de auth check.
- [Source: _bmad-output/implementation-artifacts/investigations/sgf-analisis-estado-investigation.md#Issue-1] Finding confirmado: endpoint sin auth.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Agregados imports `headers` (next/headers) y `auth` (@/lib/auth) al inicio del archivo
- Session check implementado como primer paso del try block, antes de `await params`
- Patrón idéntico a P-03 (app/api/members/route.ts): `auth.api.getSession({ headers: await headers() })`
- 401 response: `{ error: "No autorizado" }` — consistente con otros 24 endpoints
- InventoryService.getSalesByTicket(ticket) sin cambios; response shape preservado

### File List

- `app/api/inventory/ticket/[ticket]/route.ts` — MODIFIED
