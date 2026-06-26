# Story 1.3: Reporte de Inconsistencias y Mapeo de Empleados

Status: ready-for-dev

## Story

As an administrador de SGF,
I want to see all data inconsistencies detected during the preview and manually resolve employee name mappings before importing,
so that the import produces complete, consistent records without silent data loss and every sale can be attributed to a real SGF user.

## Acceptance Criteria

### Mapeo de empleados — detección

1. **Given** the historical files contain sale records with `formaPago = "EFECTIVO (ANDREW)"`,
   **When** I reach Step 3 (Validación),
   **Then** the name `"ANDREW"` appears in the employee mapping section with a `"Requiere mapeo"` amber badge.

2. **Given** `"ANDREW"` appears in historical sales AND a User with `name = "Andrew"` exists in SGF (case-insensitive match),
   **When** Step 3 loads,
   **Then** `"ANDREW"` is automatically pre-mapped to that User and shows a `"Auto-mapeado"` green badge — no manual action required.

3. **Given** `"CARLOS"` appears in historical sales AND no SGF User has `name = "CARLOS"` (case-insensitive),
   **When** Step 3 loads,
   **Then** `"CARLOS"` shows a `"Requiere mapeo"` badge and a User dropdown for manual selection.

### Mapeo de empleados — resolución manual

4. **Given** `"CARLOS"` shows `"Requiere mapeo"`,
   **When** the admin selects an existing SGF User from the dropdown next to `"CARLOS"`,
   **Then** `"CARLOS"` immediately switches to a `"Mapeado"` green badge and the selected User name appears next to it.

5. **Given** an admin selects a User for `"CARLOS"` and then changes their mind,
   **When** they select a different User from the same dropdown,
   **Then** the mapping updates to the new User.

6. **Given** the admin previously mapped `"CARLOS"` → User X,
   **When** they clear the selection (return to empty / "Sin asignar"),
   **Then** `"CARLOS"` reverts to `"Requiere mapeo"` status.

### Bloqueo de avance

7. **Given** at least one employee name still shows `"Requiere mapeo"`,
   **When** the admin clicks `"Continuar"`,
   **Then** the action is blocked and a message appears:
   `"Existen N cajero(s)/vendedor(es) sin mapear. La importación de cortes no puede continuar hasta resolver todos los mapeos."`

8. **Given** all employee names are either auto-mapped or manually mapped,
   **When** the admin clicks `"Continuar"`,
   **Then** the wizard advances to Step 4 passing the complete `employeeMapping: Record<string, string>` to the Manager state.

9. **Given** the historical files contain NO sale records with a named seller (all sales are anonymous),
   **When** Step 3 loads,
   **Then** the employee mapping section displays `"Sin cajeros/vendedores detectados"` and the `"Continuar"` button is immediately enabled.

### Advertencias de parseo

10. **Given** the preview produced warnings with `code = "UNKNOWN_MEMBERSHIP"`,
    **When** Step 3 renders,
    **Then** those warnings appear in a collapsible `"Advertencias de membresía"` section showing: source file, row (if available), original value, message `"Se importará con membershipType = null"`.

11. **Given** the preview produced warnings with `code = "UNKNOWN_PAYMENT_METHOD"`,
    **When** Step 3 renders,
    **Then** those warnings appear in a collapsible `"Advertencias de forma de pago"` section.

12. **Given** the preview produced warnings with `code = "UNRECOGNIZED_DATE_FORMAT"`,
    **When** Step 3 renders,
    **Then** those warnings appear in a collapsible `"Advertencias de fechas"` section.

13. **Given** there are zero parse warnings,
    **When** Step 3 renders,
    **Then** the warnings section displays `"Sin advertencias de parseo"` in green.

### Agrupación y estado general

14. **Given** all employees are mapped AND there are parse warnings (non-blocking),
    **When** the admin views Step 3,
    **Then** the header shows: `"✓ Listo para continuar — N advertencias registradas"` in amber.

15. **Given** all employees are mapped AND there are zero warnings,
    **When** the admin views Step 3,
    **Then** the header shows: `"✓ Sin inconsistencias — todos los registros están listos"` in green.

16. **Given** one or more employees are still unmapped,
    **When** the admin views Step 3,
    **Then** the header shows: `"N acción(es) requerida(s) — resuelve los mapeos antes de continuar"` in red.

### Integridad arquitectónica

17. **Given** Step 3 loads,
    **When** it fetches the SGF User list,
    **Then** zero new records are written to the database (read-only Prisma query only).

18. **Given** the inconsistency classification runs,
    **When** executed with any input,
    **Then** the `classifyInconsistencies()` function is pure — no I/O, no Prisma, no HTTP calls.

## Tasks / Subtasks

- [ ] Task 1: Extender PreviewFilesResult con seller names (AC: 1, 2, 3, 9)
  - [ ] 1.1 En `modules/migration/domain/domain.types.ts`: agregar `sellerNames: string[]` a `PreviewFilesResult` — lista de nombres únicos y no-nulos extraídos de todas las ventas en todos los cortes
  - [ ] 1.2 En `modules/migration/migration.service.ts` función `previewFiles()`: después de construir `allShifts`, extraer nombres únicos de `shift.sales[].sellerName` (filtrar null/vacíos), deduplicar, ordenar alfabéticamente
  - [ ] 1.3 En `types/api/migracion.ts`: agregar `sellerNames: z.array(z.string())` a `PreviewResponseSchema`
  - [ ] 1.4 En `app/api/migracion/preview/route.ts`: incluir `sellerNames: result.sellerNames` en el JSON de respuesta

- [ ] Task 2: Endpoint GET /api/migracion/users (AC: 17)
  - [ ] 2.1 Crear `app/api/migracion/users/route.ts`: GET, auth check con `auth.api.getSession`, consulta Prisma `prisma.user.findMany({ where: { isActive: true }, select: { id, name, email }, orderBy: { name: "asc" } })`, retorna `UserRef[]`
  - [ ] 2.2 En `types/api/migracion.ts`: agregar `UserRefSchema = z.object({ id: z.string(), name: z.string(), email: z.string() })` y `UserListResponseSchema = z.array(UserRefSchema)` con sus tipos exportados
  - [ ] 2.3 Verificar que la ruta importa Prisma desde `@/app/generated/prisma` (no de `@prisma/client`) — consistente con modules/

- [ ] Task 3: Clasificador de inconsistencias (puro) (AC: 2, 3, 10–13, 18)
  - [ ] 3.1 Crear `modules/migration/domain/inconsistency-classifier.ts` con función pura:
    ```typescript
    export function classifyInconsistencies(
      sellerNames: string[],
      warnings: ParseWarning[],
      users: UserRef[],
    ): InconsistencyReport
    ```
  - [ ] 3.2 Para cada `sellerName`: buscar coincidencia case-insensitive en `users[].name`; si la hay → `isAutoMapped: true, resolvedUserId: user.id`; si no → `isAutoMapped: false, resolvedUserId: null`
  - [ ] 3.3 Agrupar `warnings` por `code`: separar en `membershipWarnings`, `paymentMethodWarnings`, `dateWarnings`, `otherWarnings`
  - [ ] 3.4 Computar `totalBlocking = employeeMappings.filter(e => !e.resolvedUserId).length`
  - [ ] 3.5 Computar `canProceed = totalBlocking === 0`
  - [ ] 3.6 Agregar tipos `UserRef`, `EmployeeMappingEntry`, `InconsistencyReport` a `modules/migration/domain/domain.types.ts`

- [ ] Task 4: Smoke tests del clasificador (AC: 2, 3, 7, 8, 18)
  - [ ] 4.1 Agregar casos en `scripts/parse-smoke-test.ts` (o crear `scripts/inconsistency-smoke-test.ts`):
    - sellerName con coincidencia exacta → auto-mapped
    - sellerName con diferencia de case → auto-mapped (case-insensitive)
    - sellerName sin coincidencia → unresolved
    - lista vacía de sellerNames → canProceed = true
    - warnings agrupados correctamente por código
  - [ ] 4.2 Actualizar `package.json` con `"smoke:inconsistency": "tsx scripts/inconsistency-smoke-test.ts"` (o extender el existente)

- [ ] Task 5: InconsistencyStep.tsx (AC: 1–16)
  - [ ] 5.1 Crear `app/(dashboard)/configuracion/migracion/_components/InconsistencyStep.tsx`
  - [ ] 5.2 Props: `previewResult: PreviewResponseType`, `onComplete: (mapping: Record<string, string>) => void`
  - [ ] 5.3 Al montar: fetch `GET /api/migracion/users`, combinar con `previewResult.sellerNames` → llamar `classifyInconsistencies()` para estado inicial
  - [ ] 5.4 Mantener estado local: `mapping: Record<string, string>` (historicalName → userId), inicializado con los auto-mapped del clasificador
  - [ ] 5.5 Renderizar header de estado: verde/amber/rojo según `canProceed` y `totalWarnings`
  - [ ] 5.6 Sección de mapeo de empleados: una fila por `sellerName` con badge de estado + dropdown de User (shadcn Select). El dropdown lista todos los users del GET. Selección actualiza `mapping[name] = userId`; limpiar opción revierte badge a "Requiere mapeo".
  - [ ] 5.7 Sección de advertencias: tres sub-secciones colapsables (shadcn Collapsible o `<details>`) para `membershipWarnings`, `paymentMethodWarnings`, `dateWarnings`. Cada advertencia muestra: filename, row?, field, originalValue, message.
  - [ ] 5.8 Botón `"Continuar"`: deshabilitado si `totalBlocking > 0`; al hacer click llama `onComplete(mapping)`.

- [ ] Task 6: Actualizar MigracionManager.tsx (AC: 7, 8)
  - [ ] 6.1 Importar `InconsistencyStep` y tipo `EmployeeMapping = Record<string, string>`
  - [ ] 6.2 Agregar estado: `const [employeeMapping, setEmployeeMapping] = useState<Record<string, string>>({})`
  - [ ] 6.3 Agregar handler: `function handleInconsistencyComplete(mapping: Record<string, string>) { setEmployeeMapping(mapping); setStep(4); }`
  - [ ] 6.4 En el render: `{step === 3 && <InconsistencyStep previewResult={previewResult!} onComplete={handleInconsistencyComplete} />}`
  - [ ] 6.5 El placeholder `step >= 3` actual debe cambiar a `step >= 4` para que Step 3 muestre `InconsistencyStep` y solo Step 4+ use el placeholder

## Dev Notes

### Flujo de datos completo

```
PreviewResponseType (de Story 1.2)
  └─ sellerNames: string[]         ← NUEVO en Task 1
  └─ warnings: ParseWarning[]      ← ya existe
  └─ members, shifts, ...          ← ya existen

GET /api/migracion/users            ← NUEVO en Task 2
  └─ users: UserRef[]

classifyInconsistencies(            ← NUEVO en Task 3, puro
  sellerNames, warnings, users
) → InconsistencyReport

InconsistencyStep                   ← NUEVO en Task 5
  └─ renderiza InconsistencyReport
  └─ gestiona mapping local
  └─ onComplete(mapping) → Manager

MigracionManager                    ← MODIFICADO en Task 6
  └─ employeeMapping: Record<string, string>
  └─ pasa mapping a Story 1.4
```

### Tipos nuevos a agregar en `domain.types.ts`

```typescript
// Referencia a usuario SGF (solo lectura, para dropdown de mapeo)
export interface UserRef {
  id: string;
  name: string;
  email: string;
}

// Entrada de mapeo para un nombre histórico de cajero/vendedor
export interface EmployeeMappingEntry {
  historicalName: string;        // tal como aparece en el Excel (e.g. "ANDREW")
  resolvedUserId: string | null; // UUID del User SGF; null = sin mapear
  isAutoMapped: boolean;         // true si se encontró por coincidencia case-insensitive
}

// Resultado del clasificador
export interface InconsistencyReport {
  employeeMappings: EmployeeMappingEntry[];
  membershipWarnings: ParseWarning[];
  paymentMethodWarnings: ParseWarning[];
  dateWarnings: ParseWarning[];
  otherWarnings: ParseWarning[];
  totalBlocking: number;     // = employeeMappings sin resolvedUserId
  totalWarnings: number;     // = suma de todos los warnings
  canProceed: boolean;       // = totalBlocking === 0
}
```

### Implementación del clasificador

```typescript
// modules/migration/domain/inconsistency-classifier.ts
import type { ParseWarning, UserRef, EmployeeMappingEntry, InconsistencyReport } from "./domain.types";

export function classifyInconsistencies(
  sellerNames: string[],
  warnings: ParseWarning[],
  users: UserRef[],
): InconsistencyReport {
  // Normalización para comparación case-insensitive
  const usersByNormalizedName = new Map(
    users.map((u) => [u.name.trim().toUpperCase(), u]),
  );

  const employeeMappings: EmployeeMappingEntry[] = sellerNames.map((name) => {
    const normalized = name.trim().toUpperCase();
    const matched = usersByNormalizedName.get(normalized) ?? null;
    return {
      historicalName: name,
      resolvedUserId: matched?.id ?? null,
      isAutoMapped: matched !== null,
    };
  });

  const membershipWarnings = warnings.filter((w) => w.code === "UNKNOWN_MEMBERSHIP");
  const paymentMethodWarnings = warnings.filter((w) => w.code === "UNKNOWN_PAYMENT_METHOD");
  const dateWarnings = warnings.filter((w) => w.code === "UNRECOGNIZED_DATE_FORMAT");
  const otherWarnings = warnings.filter(
    (w) => !["UNKNOWN_MEMBERSHIP", "UNKNOWN_PAYMENT_METHOD", "UNRECOGNIZED_DATE_FORMAT"].includes(w.code ?? ""),
  );

  const totalBlocking = employeeMappings.filter((e) => !e.resolvedUserId).length;
  const totalWarnings = membershipWarnings.length + paymentMethodWarnings.length + dateWarnings.length + otherWarnings.length;

  return {
    employeeMappings,
    membershipWarnings,
    paymentMethodWarnings,
    dateWarnings,
    otherWarnings,
    totalBlocking,
    totalWarnings,
    canProceed: totalBlocking === 0,
  };
}
```

### Extensión de `PreviewFilesResult` (Task 1)

Agregar a la interfaz existente en `domain.types.ts`:
```typescript
export interface PreviewFilesResult {
  members: DomainMember[];
  shifts: DomainShift[];
  warnings: ParseWarning[];
  membershipTypeDistribution: Partial<Record<string, number>>;
  sellerNames: string[];   // ← NUEVO: nombres únicos de cajeros/vendedores
}
```

Y en `migration.service.ts`, después de construir `allShifts`:
```typescript
const allSellerNames = [
  ...new Set(
    allShifts
      .flatMap((s) => s.sales.map((sale) => sale.sellerName))
      .filter((n): n is string => n !== null && n.trim() !== ""),
  ),
].sort();
```

### Endpoint GET /api/migracion/users

```typescript
// app/api/migracion/users/route.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";   // ← usar lib/db.ts (consistente con services/)

export async function GET(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return Response.json(users);
}
```

**Nota**: Este endpoint usa `lib/db.ts` (legacy Prisma client con `@prisma/client`) porque las rutas API de otros contextos también lo usan. `modules/migration/` usa `@/app/generated/prisma` para los servicios — pero esta ruta es infraestructura de la API, no lógica de dominio de migración.

### InconsistencyStep — estructura del componente

```typescript
// app/(dashboard)/configuracion/migracion/_components/InconsistencyStep.tsx
"use client"

// Estado local:
// - users: UserRef[]            (resultado del GET /api/migracion/users)
// - mapping: Record<string, string>   (historicalName → userId)
// - report: InconsistencyReport | null

// Al montar:
// 1. fetch("/api/migracion/users") → setUsers()
// 2. classifyInconsistencies(previewResult.sellerNames, previewResult.warnings, users)
//    → setReport()
// 3. Inicializar mapping con auto-mapped entries:
//    report.employeeMappings.filter(e => e.isAutoMapped).reduce(...)

// Cuando admin selecciona un User en el dropdown:
// setMapping(prev => ({ ...prev, [historicalName]: userId }))
// Recompute totalBlocking (sin llamar al clasificador de nuevo — solo contar claves sin valor)

// Botón Continuar:
// disabled = Object.keys(mapping que deben mapearse).some(name => !mapping[name])
// onClick: onComplete(mapping)
```

### Shadcn/UI a usar

- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` — para el dropdown de User
- `Badge` — para los status "Requiere mapeo" / "Mapeado" / "Auto-mapeado"
- `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` — para secciones de advertencias
- `Button` — "Continuar"
- `AlertCircle`, `CheckCircle2`, `AlertTriangle`, `ChevronDown` de lucide-react

Verificar que `@radix-ui/react-select` y `@radix-ui/react-collapsible` ya están en package.json antes de agregar. Si Collapsible no está, usar `<details>/<summary>` HTML nativo.

### Restricciones que NO deben violarse

- `classifyInconsistencies()` es 100% pura — no llamadas HTTP, no Prisma, no side-effects.
- `InconsistencyStep.tsx` es el único lugar donde se llama a `GET /api/migracion/users` — el Manager no lo llama.
- El Manager NO re-fetches usuarios — los recibe via callback desde `InconsistencyStep`.
- Step 3 NO escribe en la DB — solo lee usuarios vía API.
- `employeeMapping` state en Manager persiste para Story 1.4 — NO lo limpiar en `handleReset()` hasta que el wizard se resetee completamente (ya en `handleReset`).
- AD-1 intacto: `migration.service.ts` NO importa nada nuevo de exceljs — solo extiende la extracción de datos del modelo de dominio ya construido.

### Archivos del codebase que debes leer antes de modificar

- `modules/migration/domain/domain.types.ts` — agregar 3 interfaces, extender `PreviewFilesResult`
- `modules/migration/migration.service.ts` — solo función `previewFiles()`, agregar extracción de sellerNames
- `types/api/migracion.ts` — agregar `UserRefSchema`, `UserListResponseSchema`, y `sellerNames` a `PreviewResponseSchema`
- `app/api/migracion/preview/route.ts` — incluir `sellerNames` en respuesta JSON
- `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` — agregar estado `employeeMapping`, handler, render step 3
- `package.json` — verificar si `@radix-ui/react-collapsible` ya existe

### Verificar antes de continuar a Story 1.4

La historia termina cuando el Manager almacena `employeeMapping: Record<string, string>` con todos los `historicalName → userId` resueltos. Story 1.4 (importación de socios) no necesita el employee mapping directamente, pero Story 1.5 (importación de cortes) sí lo necesita para asignar `Shift.cashierId` y `InventoryMovement.userId`.

El state del Manager actúa como buffer entre historias de UI: `previewResult` y `employeeMapping` persisten mientras el usuario no resetee el wizard.

### Estrategia de pruebas

**Smoke tests** (sin DB, sin HTTP):
- `classifyInconsistencies()` con 0 sellerNames → `canProceed = true`
- `classifyInconsistencies()` con sellerName con match exacto → auto-mapped
- `classifyInconsistencies()` con sellerName en minúsculas vs User en mayúsculas → auto-mapped (case-insensitive)
- `classifyInconsistencies()` con sellerName sin match → unresolved, `totalBlocking = 1`
- Warnings agrupadas correctamente por código
- `canProceed` cambia cuando todos los employeeMappings tienen `resolvedUserId`

**TypeScript**: `npx tsc --noEmit` sin errores.
**Lint**: `npm run lint` limpio.
**Regresiones**: `npm run smoke:parsers` debe seguir pasando.

### Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| `@radix-ui/react-collapsible` no instalado | Verificar package.json; si no está, usar `<details>/<summary>` HTML nativo |
| `PreviewResponseType` ya usado en PreviewStep sin `sellerNames` | Campo nuevo es aditivo — PreviewStep sigue funcionando sin consumirlo |
| Manager re-render rompe mapping al re-montar InconsistencyStep | State en Manager (no en Step) persiste el mapping |
| Múltiples archivos de corte con cajeros solapados | Set deduplication en `previewFiles()` ya maneja esto |
| Usuario con nombre idéntico al cajero pero cuenta desactivada | El GET filtra `isActive: true` — cajero con match a usuario inactivo quedará sin auto-mapear |

## Dev Agent Record

### Debug Log
_Empty_

### Completion Notes
_Empty_

### File List
_Empty_

## Change Log
_Empty_
