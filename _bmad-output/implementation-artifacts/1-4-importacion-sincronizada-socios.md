# Story 1.4: Importación Sincronizada de Socios

Status: review

## Story

As an administrador de SGF,
I want to execute the sync import of members from the socios xlsx file after resolving all inconsistencies,
So that historical member records are created or updated in SGF without deleting any existing data, and every run produces the same deterministic state.

## Acceptance Criteria

### Ejecución y resultado básico

1. **Given** all inconsistencies are resolved and the admin is on Step 4,
   **When** they click "Iniciar importación de socios",
   **Then** the system POSTs the files to `/api/migracion/sync-members` and shows "Importando socios (N socios)..." where N = `previewResult.members.length`.

2. **Given** the import completes successfully,
   **When** the results render,
   **Then** the UI shows:
   - `"N socios nuevos"` (created)
   - `"M socios actualizados"` (updated, already existed)
   - `"K fallidos"` (with per-record error list)

3. **Given** the import completes (with or without failures),
   **When** the admin views the result,
   **Then** a "Continuar" button is enabled that advances the wizard to Step 5.

### Upsert por clave natural

4. **Given** socio with `memberNumber = "FN435"` does not exist in SGF,
   **When** the import processes that record,
   **Then** a new `Member` is created with `memberNumber = "FN435"`.

5. **Given** socio with `memberNumber = "FN435"` already exists in SGF (e.g., from a previous import run),
   **When** the import processes that record again,
   **Then** the existing `Member` is updated — no duplicate is created.

6. **Given** the same `socios.xlsx` is imported twice in sequence without any change,
   **When** the second import completes,
   **Then** `created = 0`, `updated = N` (all existing records), and the database state is identical to after the first run.

7. **Given** a socio with `memberNumber = "FN435"` was imported once and then `endDate` changed in the xlsx,
   **When** the same file (with the updated endDate) is imported again,
   **Then** `Member.endDate` reflects the new value, and `created = 0`, `updated = N`.

### Normalización de campos

8. **Given** a socio has `telefono = "Na"` (or `"NA"`, `"N/A"`, `"na"`, empty, `"0"`, `"000"`),
   **When** that record is imported,
   **Then** `Member.phone = null`.

9. **Given** a socio has `correo = "na"` (or `"NA"`, `"N/A"`, empty),
   **When** that record is imported,
   **Then** `Member.email = null`.

10. **Given** a socio has `membresia = "EFECTIVO ANUALIDAD ESTUDIANTE ENE 2026"`,
    **When** that record is imported,
    **Then** `Member.membershipType = ANNUAL_STUDENT` and `Member.membershipDescription = "EFECTIVO ANUALIDAD ESTUDIANTE ENE 2026"` (raw string preserved).

11. **Given** a socio has an unrecognized membership string (e.g., `"PROMOCION ESPECIAL"`),
    **When** that record is imported,
    **Then** `Member.membershipType = null` and `Member.membershipDescription = "PROMOCION ESPECIAL"` — the record is created/updated without blocking the import.

### Manejo de errores por registro

12. **Given** a socio has an unparseable `fechaInicio` (e.g., raw value `"0"` or string `"INVALID"`),
    **When** the import processes that record,
    **Then** `Member.startDate = null` — the field is stored as null, NOT treated as a fatal error — import continues.

13. **Given** a DB error occurs while upserting a specific member (e.g., constraint violation),
    **When** that error is caught,
    **Then** that member is counted as `failed` with reason logged: `"FN435: <error message>"`,
    **And** the import continues processing all remaining members.

14. **Given** some members fail due to DB errors,
    **When** the import completes,
    **Then** successfully processed members are committed and NOT rolled back — partial success is acceptable in sync mode.

### Integridad arquitectónica

15. **Given** the import executes,
    **When** `syncMembers()` runs,
    **Then** it receives `DomainMember[]` — it does NOT call any Excel adapter or re-read files directly. (AD-1 intact)

16. **Given** the API route is called,
    **When** the request is processed,
    **Then** the route calls `previewFiles(files)` to obtain `DomainMember[]` and passes only that to `syncMembers()` — the route does not contain upsert logic.

17. **Given** the sync-members endpoint is called,
    **When** the requester is not authenticated,
    **Then** the endpoint returns `401 Unauthorized`.

18. **Given** the sync-members endpoint is called by an authenticated non-ADMIN user,
    **When** the role check runs,
    **Then** the endpoint returns `403 Forbidden`.

### Campos que nunca se modifican en registros existentes

19. **Given** a Member already exists in SGF with a specific `createdAt` value,
    **When** the same member is imported again,
    **Then** `Member.createdAt` is unchanged — Prisma manages it as create-only.

20. **Given** a Member already exists and has `InventoryMovement` records linked via FK,
    **When** that member is upserted,
    **Then** the `inventoryMovements` relation is unaffected — the upsert only touches the Member's own scalar fields.

## Tasks / Subtasks

- [x] Task 1: `buildMemberUpsertData()` pura + smoke tests (AC: 4–7, 10–12, 15)
  - [x] 1.1 Crear `modules/migration/domain/member-upsert.ts` con función pura `buildMemberUpsertData(member: DomainMember): MemberUpsertData` que mapea `DomainMember` a los datos de creación y actualización para Prisma. **No importa Prisma** — retorna un objeto plano.
  - [x] 1.2 `MemberUpsertData` contiene: `create: { memberNumber, name, phone, email, birthDate, startDate, endDate, membershipType, membershipDescription, totalVisits, lastVisit, isActive }` y `update: Omit<create, 'memberNumber'>`.
  - [x] 1.3 `paymentMethodFromMembership` se descarta explícitamente — no existe campo en Prisma Member.
  - [x] 1.4 Crear `scripts/member-upsert-smoke-test.ts` con casos: campo normal, phone "Na" → null, email "na" → null, membershipType reconocido, membershipType null, name vacío → null, todas las fechas null.
  - [x] 1.5 Agregar `"smoke:member-upsert": "tsx scripts/member-upsert-smoke-test.ts"` a `package.json`.

- [x] Task 2: Función `syncMembers()` en `migration.service.ts` (AC: 4–7, 12–16)
  - [x] 2.1 Agregar import: `import { prisma } from "@/lib/db"` y `import type { MembershipType } from "@/app/generated/prisma"` en `migration.service.ts`.
  - [x] 2.2 Definir interfaz `SyncMembersResult` en `migration.service.ts`: `{ created: number; updated: number; failed: number; errors: Array<{ memberNumber: string; reason: string }> }`.
  - [x] 2.3 Implementar `syncMembers(members: DomainMember[]): Promise<SyncMembersResult>`:
    - Pre-fetch existing memberNumbers in one query: `prisma.member.findMany({ select: { memberNumber: true } })` → build `Set<string>`.
    - For each member: call `buildMemberUpsertData(member)`, then `prisma.member.upsert({ where: { memberNumber }, create: { ...data.create, membershipType: data.create.membershipType as MembershipType | null }, update: { ...data.update, membershipType: data.update.membershipType as MembershipType | null } })`.
    - Track `created++` or `updated++` based on pre-fetch Set.
    - Per-member try/catch: on error, push to `errors[]` and `failed++`.
  - [x] 2.4 Export `syncMembers` from `MigrationService` object and as named export.

- [x] Task 3: Schema Zod + tipo `SyncMembersResultType` (AC: 2)
  - [x] 3.1 Agregar a `types/api/migracion.ts`:
    ```typescript
    export const SyncMembersResultSchema = z.object({
      created: z.number(),
      updated: z.number(),
      failed: z.number(),
      errors: z.array(z.object({ memberNumber: z.string(), reason: z.string() })),
    });
    export type SyncMembersResultType = z.infer<typeof SyncMembersResultSchema>;
    ```

- [x] Task 4: Endpoint `POST /api/migracion/sync-members` (AC: 15–18)
  - [x] 4.1 Crear `app/api/migracion/sync-members/route.ts`:
    - Auth: `auth.api.getSession({ headers: await headers() })` — return `401` if no session.
    - Role: query `prisma.user.findUnique({ where: { id }, select: { role } })` — return `403` if role !== `"ADMIN"`.
    - Accept multipart `files` (same pattern as preview route, same 10 MB limit).
    - Call `await MigrationService.previewFiles(files)` → extract `result.members`.
    - Call `await MigrationService.syncMembers(result.members)` → return JSON.
  - [x] 4.2 **No lógica de upsert en la ruta** — solo orquestación de llamadas al service.

- [x] Task 5: `ImportSociosStep.tsx` (AC: 1–3)
  - [x] 5.1 Crear `app/(dashboard)/configuracion/migracion/_components/ImportSociosStep.tsx`.
  - [x] 5.2 Props: `files: File[]`, `totalMembers: number`, `onComplete: (result: SyncMembersResultType) => void`.
  - [x] 5.3 Estados internos: `"idle"` → `"importing"` → `"done"` | `"error"`.
  - [x] 5.4 Estado `"idle"`: mostrar summary card con `totalMembers` y botón `"Iniciar importación de socios"`.
  - [x] 5.5 Estado `"importing"`: mostrar spinner + `"Importando socios (N socios)..."` donde N = `totalMembers`. Botón deshabilitado.
  - [x] 5.6 Estado `"done"`: mostrar `ResultCard` con `created`, `updated`, `failed`. Si `failed > 0`, mostrar lista colapsable de errores (usar `<details>/<summary>`). Botón `"Continuar"` llama `onComplete(result)`.
  - [x] 5.7 Estado `"error"` (HTTP error en el POST): mostrar mensaje de error con botón `"Reintentar"` que vuelve a `"idle"`.
  - [x] 5.8 La función `handleImport()` POSTea `files` como `FormData` a `/api/migracion/sync-members` y maneja el ciclo de estados.

- [x] Task 6: Actualizar `MigracionManager.tsx` (AC: 1–3)
  - [x] 6.1 Importar `ImportSociosStep` y tipo `SyncMembersResultType`.
  - [x] 6.2 Agregar estado: `const [syncResult, setSyncResult] = useState<SyncMembersResultType | null>(null)`.
  - [x] 6.3 Agregar handler: `function handleSyncComplete(result: SyncMembersResultType) { setSyncResult(result); setStep(5); }`.
  - [x] 6.4 Render: `{step === 4 && <ImportSociosStep files={analysisFiles} totalMembers={previewResult!.members.length} onComplete={handleSyncComplete} />}`.
  - [x] 6.5 El placeholder `step >= 4` actual cambia a `step >= 5`, mostrando info de syncResult si disponible.
  - [x] 6.6 Agregar `setSyncResult(null)` en `handleReset()`.

## Dev Notes

### Flujo completo de datos

```
MigracionManager (step 4)
  │ files: File[]   totalMembers: number
  ▼
ImportSociosStep
  │ POST FormData → /api/migracion/sync-members
  ▼
app/api/migracion/sync-members/route.ts
  │ previewFiles(files) → DomainMember[]
  │ syncMembers(members) → SyncMembersResult
  ▼
modules/migration/migration.service.ts → syncMembers()
  │ buildMemberUpsertData(member) [pure, no Prisma]
  │ prisma.member.upsert(...)
  ▼
PostgreSQL: member table
```

### `buildMemberUpsertData()` — función pura en `member-upsert.ts`

```typescript
// modules/migration/domain/member-upsert.ts
// Pure — no Prisma, no I/O, no imports from generated client.

import type { DomainMember } from "./domain.types";

export interface MemberUpsertData {
  memberNumber: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  membershipType: string | null;  // string — caller casts to MembershipType enum
  membershipDescription: string | null;
  totalVisits: number;
  lastVisit: Date | null;
  isActive: boolean;
  // paymentMethodFromMembership deliberately excluded — no field in Member schema
}

export function buildMemberUpsertData(member: DomainMember): MemberUpsertData {
  return {
    memberNumber: member.memberNumber,
    name: member.name || null,
    phone: member.phone,           // already null-normalized by transformer
    email: member.email,           // already null-normalized by transformer
    birthDate: member.birthDate,
    startDate: member.startDate,
    endDate: member.endDate,
    membershipType: member.membershipType,  // cast: member.membershipType as MembershipType | null
    membershipDescription: member.membershipDescription,
    totalVisits: member.totalVisits,
    lastVisit: member.lastVisit,
    isActive: member.isActive,
  };
}
```

**Nota crítica**: `paymentMethodFromMembership` NO se incluye — el modelo `Member` de Prisma no tiene este campo. Incluirlo sería un error de TypeScript que el dev debería ver inmediatamente.

### `syncMembers()` — implementación en `migration.service.ts`

```typescript
export async function syncMembers(members: DomainMember[]): Promise<SyncMembersResult> {
  const existingSet = new Set(
    (await prisma.member.findMany({ select: { memberNumber: true } }))
      .map((m) => m.memberNumber),
  );

  let created = 0, updated = 0, failed = 0;
  const errors: Array<{ memberNumber: string; reason: string }> = [];

  for (const member of members) {
    const data = buildMemberUpsertData(member);
    const isNew = !existingSet.has(data.memberNumber);
    try {
      await prisma.member.upsert({
        where: { memberNumber: data.memberNumber },
        create: { ...data, membershipType: data.membershipType as MembershipType | null },
        update: {
          name: data.name,
          phone: data.phone,
          email: data.email,
          birthDate: data.birthDate,
          startDate: data.startDate,
          endDate: data.endDate,
          membershipType: data.membershipType as MembershipType | null,
          membershipDescription: data.membershipDescription,
          totalVisits: data.totalVisits,
          lastVisit: data.lastVisit,
          isActive: data.isActive,
        },
      });
      if (isNew) created++; else updated++;
    } catch (e) {
      failed++;
      errors.push({
        memberNumber: data.memberNumber,
        reason: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  }

  return { created, updated, failed, errors };
}
```

### Campos que se actualizan en upsert (update branch)

| Campo | Actualiza en update | Razón |
|-------|---------------------|-------|
| `name` | ✅ | El socio puede haber corregido su nombre |
| `phone` | ✅ | Puede haberse registrado por primera vez |
| `email` | ✅ | Puede haberse registrado por primera vez |
| `birthDate` | ✅ | Corrección posible |
| `startDate` | ✅ | Fuente de verdad es el Excel |
| `endDate` | ✅ | Refleja la vigencia actual de la membresía |
| `membershipType` | ✅ | Puede haber cambiado |
| `membershipDescription` | ✅ | Raw string para auditoría |
| `totalVisits` | ✅ | Excel es fuente de verdad histórica |
| `lastVisit` | ✅ | Excel es fuente de verdad histórica |
| `isActive` | ✅ | Calculado de endDate en el transformer |
| `createdAt` | ❌ | Prisma-managed, no en update branch |
| `id` | ❌ | Auto-increment, nunca en input |
| `memberNumber` | ❌ | Es la clave — solo en `where`, no en update |

### Imports requeridos en `migration.service.ts`

```typescript
import { prisma } from "@/lib/db";
import type { MembershipType } from "@/app/generated/prisma";
import { buildMemberUpsertData } from "./domain/member-upsert";
```

`SyncMembersResult` se define localmente en `migration.service.ts`, no importada de ningún otro módulo.

### Endpoint `POST /api/migracion/sync-members`

```typescript
// app/api/migracion/sync-members/route.ts
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MigrationService } from "@/modules/migration/migration.service";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  // Auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return Response.json({ error: "No autenticado" }, { status: 401 });

  // Role check (ADMIN only — not just any authenticated user)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") return Response.json({ error: "Acceso restringido" }, { status: 403 });

  // Parse files (same pattern as preview route)
  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: "Cuerpo inválido" }, { status: 400 }); }

  const rawFiles = formData.getAll("files") as File[];
  if (!rawFiles.length) return Response.json({ error: "No se recibieron archivos" }, { status: 400 });
  for (const f of rawFiles) {
    if (f.size > MAX_FILE_SIZE)
      return Response.json({ error: `"${f.name}" excede 10 MB` }, { status: 400 });
  }

  const files = await Promise.all(rawFiles.map(async (f) => ({
    buffer: Buffer.from(await f.arrayBuffer()), filename: f.name,
  })));

  const preview = await MigrationService.previewFiles(files);
  const result = await MigrationService.syncMembers(preview.members);
  return Response.json(result);
}
```

### `ImportSociosStep.tsx` — estructura del componente

```typescript
"use client"

type ImportState = "idle" | "importing" | "done" | "error";

// Estado idle: summary + botón "Iniciar importación de socios"
// Estado importing: spinner + "Importando socios (N socios)..."
// Estado done: ResultCard + errores colapsables + botón "Continuar"
// Estado error: mensaje + botón "Reintentar"

async function handleImport() {
  setState("importing");
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  try {
    const res = await fetch("/api/migracion/sync-members", { method: "POST", body: fd });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: SyncMembersResultType = await res.json();
    setResult(data);
    setState("done");
  } catch (e) {
    setErrorMsg(e instanceof Error ? e.message : "Error de red");
    setState("error");
  }
}
```

### `MigracionManager.tsx` — cambios mínimos

- Import `ImportSociosStep`, `SyncMembersResultType`
- Add state: `syncResult: SyncMembersResultType | null`
- Add handler: `handleSyncComplete(result) → setSyncResult(result); setStep(5)`
- Render: `step === 4 → <ImportSociosStep files={analysisFiles} totalMembers={previewResult!.members.length} onComplete={handleSyncComplete} />`
- Placeholder: `step >= 5` (was `step >= 4`)
- Reset: include `setSyncResult(null)`

### Verificación de idempotencia

La idempotencia está garantizada por:
1. `upsert` por `memberNumber` (único en DB)
2. La pre-fetch del Set de existentes determina create vs update de forma estable
3. Los mismos archivos producen el mismo `DomainMember[]` (parsers son deterministas)
4. En la segunda ejecución: `created = 0`, `updated = N`, estado de DB idéntico

### Smoke tests para `buildMemberUpsertData()`

El archivo `scripts/member-upsert-smoke-test.ts` debe cubrir:
- Todos los campos normales mapean correctamente
- `phone = "Na"` → `null` (ya manejado por transformer — solo verificar que la función no lo altera)
- `membershipType = null` → `null` en output
- `membershipType = "ANNUAL_STUDENT"` → `"ANNUAL_STUDENT"` en output (sin cast de Prisma aquí)
- `paymentMethodFromMembership` no aparece en output (`"paymentMethodFromMembership" in result === false`)
- `name = ""` → `null`
- Todos los campos Date se pasan sin modificar (no se re-parsean)

### Archivos a leer antes de implementar

- `modules/migration/domain/domain.types.ts` — `DomainMember`, `PreviewFilesResult` (ya en contexto)
- `modules/migration/migration.service.ts` — agregar imports y funciones (ya en contexto)
- `app/api/migracion/preview/route.ts` — patrón de la ruta a replicar (ya en contexto)
- `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` — cambios mínimos (ya en contexto)
- `prisma/schema.prisma` — verificar campos de `Member` (ya en contexto)

### Restricciones que NO deben violarse

- `syncMembers()` recibe `DomainMember[]` — NUNCA llama `adapter.tryParse()` ni importa exceljs. AD-1 intacto.
- No schema changes en Prisma — `Member` ya cubre todos los campos necesarios.
- `paymentMethodFromMembership` no se almacena en `Member` — no existe ese campo.
- La ruta API no contiene lógica de upsert — solo orquesta llamadas al service.
- El Manager no llama directamente a la API ni contiene lógica de mapeo.
- Sin transacción única para todos los socios — cada upsert individual permite partial success.

### Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| `membershipType` cast incorrecto | `MigrationMembershipType` valores son idénticos a `MembershipType` enum Prisma — cast seguro. Los unrecognized quedan null. |
| Timeout de 60s de Vercel en 652 upserts | 652 upserts secuenciales ≈ 1-3s en PostgreSQL normal. No es problema en práctica. |
| Race condition en pre-fetch de existentes | Si dos admins corren sync simultáneamente, upsert sigue siendo idempotente — la pre-fetch solo determina la estadística create/update, no la corrección del upsert. |
| `name` en `DomainMember` es `string` (no nullable) pero en Prisma es `String?` | `member.name || null` maneja el caso de string vacío. |
| Preview route no verifica ADMIN role | Pre-existing gap. Story 1.4 agrega ADMIN check en el nuevo endpoint. No modifica preview/users. |

### Estrategia de pruebas

**Smoke tests** (sin DB):
- `buildMemberUpsertData()` — 100% cobertura de casos edge
- `npm run smoke:member-upsert` — deben pasar junto con smoke:parsers e smoke:inconsistency

**TypeScript**: `npx tsc --noEmit` sin errores.

**Lint**: `npm run lint` limpio en archivos modificados.

**Regresiones**: `npm run smoke:parsers && npm run smoke:inconsistency` deben seguir pasando.

**No hay integración tests automáticos** para las escrituras de DB en esta historia — la verificación funcional es manual con la UI real.

## Dev Agent Record

### Debug Log

- `employeeMapping` state generó warning lint `no-unused-vars` al reemplazar el placeholder step>=4. Fix: se usa en el placeholder de step>=5 mostrando cajeros mapeados.
- Lint errors en `.agents/skills/` son pre-existentes (CJS require imports en scripts de terceros). No afectan el proyecto.

### Completion Notes

- `buildMemberUpsertData()` es función pura sin imports de Prisma. Cast a `MembershipType` se realiza en el call site de `syncMembers()`.
- `syncMembers()` pre-fetch de memberNumbers en una sola query determina create vs update. Idempotencia garantizada por `upsert` en `memberNumber @unique`.
- Endpoint ADMIN-only con role check via `prisma.user.findUnique`. Patrón consistente con el existente en preview route para auth check.
- `ImportSociosStep` cycle: idle → importing → done|error. Estado "error" permite reintentar sin recargar la página.
- AD-1 intacto: `syncMembers` recibe `DomainMember[]` — no importa exceljs ni adapters.

### File List

- `modules/migration/domain/member-upsert.ts` — CREATED
- `modules/migration/migration.service.ts` — MODIFIED (syncMembers + imports)
- `types/api/migracion.ts` — MODIFIED (SyncMembersResultSchema + SyncMembersResultType)
- `app/api/migracion/sync-members/route.ts` — CREATED
- `app/(dashboard)/configuracion/migracion/_components/ImportSociosStep.tsx` — CREATED
- `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` — MODIFIED
- `scripts/member-upsert-smoke-test.ts` — CREATED
- `package.json` — MODIFIED (smoke:member-upsert script)

## Change Log

- feat(migration): implement Story 1.4 — idempotent member sync with upsert by memberNumber, ADMIN-only API endpoint, ImportSociosStep UI with idle/importing/done/error states, pure buildMemberUpsertData helper with 24 smoke tests passing
