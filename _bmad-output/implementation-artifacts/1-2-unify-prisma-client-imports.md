# Story 1.2: Unificar Imports de Prisma Client en Ruta Canónica

Status: done

## Story

Como sistema de infraestructura,
quiero que todos los archivos TypeScript del proyecto importen Prisma desde `@/app/generated/prisma/client`,
para que haya una única fuente de verdad del cliente Prisma, eliminando la ambigüedad entre `@prisma/client` y la ruta canónica generada.

## Acceptance Criteria

1. `lib/db.ts` importa `PrismaClient` desde `@/app/generated/prisma/client` (no desde `@prisma/client`).
2. Todos los archivos de servicios y módulos que importan tipos Prisma (enums como `MembershipType`, `InventoryType`, `Location`, `PaymentMethod`) los importan desde `@/app/generated/prisma/client`.
3. El build del proyecto pasa sin errores (`npm run build`).
4. El singleton de Prisma en `lib/db.ts` sigue funcionando correctamente (patrón `globalForPrisma` preservado).
5. `lib/auth.ts` NO se modifica — ya usa la ruta canónica y tiene su propia instancia para better-auth (esto es intencional).
6. `prisma/seed.ts` puede actualizarse opcionalmente por consistencia, pero no es bloqueante.

## Tasks / Subtasks

- [x] Task 1: Actualizar `lib/db.ts` (AC: 1, 4)
  - [x] Cambiar import de `@prisma/client` a `@/app/generated/prisma`
  - [x] Verificar que el patrón `globalForPrisma` y el singleton no cambian en comportamiento
- [x] Task 2: Actualizar imports de tipos Prisma en módulos (AC: 2)
  - [x] `modules/members/members.service.ts` — `MembershipType`
  - [x] `modules/inventory/inventory.service.ts` — `InventoryType`, `Location`, `PaymentMethod`
  - [x] `modules/products/products.service.ts` — `Location`
  - [x] `modules/sales/sales.service.ts` — `Prisma`, `PaymentMethod`
- [x] Task 3: Actualizar imports en services/ legacy (AC: 2)
  - [x] `services/enum-mappers.ts` — importa múltiples enums de Prisma
  - [x] `services/utils.ts` — `MembershipType`
  - [x] `services/users.service.ts` — `Role`
  - [x] `services/membership-helpers.ts` — `MembershipType`
- [x] Task 4: Verificar build (AC: 3)
  - [x] Ejecutar `npm run build` y confirmar que pasa sin errores
  - [x] Si hay errores de tipos, revisar imports adicionales no listados

## Dev Notes

### Contexto del cambio

El proyecto usa Prisma con output no estándar:
- **Ruta canónica generada:** `app/generated/prisma/client`
- **Ruta de conveniencia legacy:** `@prisma/client` (node_modules, posiblemente re-export)

`lib/auth.ts` ya usa la ruta canónica y crea su propia instancia separada para better-auth — **NO tocar**.

Todos los demás archivos usan `@prisma/client`. El objetivo es unificar a la ruta canónica para eliminar ambigüedad y garantizar que todos usan el mismo código generado.

### Archivos a modificar — inventario completo

| Archivo | Import actual | Import objetivo |
|---------|--------------|-----------------|
| `lib/db.ts` | `from "@prisma/client"` | `from "@/app/generated/prisma/client"` |
| `modules/members/members.service.ts` | `MembershipType from "@prisma/client"` | `from "@/app/generated/prisma/client"` |
| `modules/inventory/inventory.service.ts` | `InventoryType, Location, PaymentMethod from "@prisma/client"` | `from "@/app/generated/prisma/client"` |
| `modules/products/products.service.ts` | verificar en archivo | `from "@/app/generated/prisma/client"` |
| `modules/sales/sales.service.ts` | verificar en archivo | `from "@/app/generated/prisma/client"` |
| `services/enum-mappers.ts` | `from "@prisma/client"` | `from "@/app/generated/prisma/client"` |
| `services/utils.ts` | verificar en archivo | `from "@/app/generated/prisma/client"` |
| `services/users.service.ts` | verificar en archivo | `from "@/app/generated/prisma/client"` |
| `services/membership-helpers.ts` | verificar en archivo | `from "@/app/generated/prisma/client"` |

### Estado actual de lib/db.ts (archivo completo)

```typescript
// lib/db.ts
import { PrismaClient } from "@prisma/client";  // ← CAMBIAR ESTO

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**Estado objetivo:**
```typescript
// lib/db.ts
import { PrismaClient } from "@/app/generated/prisma/client";  // ← SOLO ESTE CAMBIO

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

El patrón de singleton (`globalForPrisma`) no cambia. Solo cambia el origen del import.

### Archivos que NO se modifican

- `lib/auth.ts` — ya usa `@/app/generated/prisma/client` y tiene instancia separada intencional para better-auth
- `app/generated/prisma/` — archivos generados por Prisma, nunca editar manualmente
- `prisma/schema.prisma` — sin cambios
- Cualquier archivo de frontend (componentes, managers, etc.)

### Procedimiento para cada archivo

1. Abrir el archivo
2. Localizar líneas con `from "@prisma/client"` o `from '@prisma/client'`
3. Cambiar a `from "@/app/generated/prisma/client"`
4. Si el archivo importa SOLO tipos (`import type { ... }`), mantener el `import type` modificando solo el path
5. No cambiar ninguna otra línea del archivo

### Verificación post-cambio

```bash
# Verificar que no quedan imports legacy
grep -rn 'from "@prisma/client"' --include="*.ts" app/ modules/ services/ lib/

# Solo debe aparecer en prisma/seed.ts (opcional) y CERO ocurrencias en los archivos de negocio

# Build completo
npm run build
```

Si el build falla, el error indicará qué tipo o símbolo no se resuelve — agregar ese archivo al listado y repetir.

### Nota sobre @prisma/client en package.json

`@prisma/client` puede seguir en `node_modules` como paquete — no eliminar. Solo se cambia desde dónde se importa en el código fuente. El paquete puede seguir siendo una dependencia en `package.json`.

### Nota sobre prisma/seed.ts

`prisma/seed.ts` usa `@prisma/client` y puede quedarse así por ahora — es un script de desarrollo, no código de producción. Si el dev agent quiere actualizarlo por consistencia, puede hacerlo, pero no es AC bloqueante.

### Project Structure Notes

No se crean ni eliminan archivos. Solo se modifican imports en archivos existentes.

```
lib/db.ts                              ← import line 1
modules/members/members.service.ts     ← import line(s)
modules/inventory/inventory.service.ts ← import line(s)
modules/products/products.service.ts   ← verificar + cambiar
modules/sales/sales.service.ts         ← verificar + cambiar
services/enum-mappers.ts               ← import line(s)
services/utils.ts                      ← verificar + cambiar
services/users.service.ts              ← verificar + cambiar
services/membership-helpers.ts         ← verificar + cambiar
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#D2] Decisión D2: unificar en canonical `app/generated/prisma/`.
- [Source: lib/db.ts] Estado actual del singleton — solo cambia el import.
- [Source: lib/auth.ts] Usa canonical ya — NO modificar; instancia separada para better-auth es intencional.
- [Source: _bmad-output/implementation-artifacts/investigations/sgf-analisis-estado-investigation.md#Hipotesis-1] Dual client risk identificado.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- **Ruta canónica real: `@/app/generated/prisma` (root), NO `/client`**
  - Prisma 6 genera `client.ts` con `@ts-nocheck` y `enums.ts` vacío (bug/cambio de comportamiento)
  - `@/app/generated/prisma/client` resuelve a `client.ts` vía TypeScript (`.ts` > `.d.ts`) — no exporta enums
  - `@/app/generated/prisma` (root) resuelve a `index.d.ts` que tiene todos los tipos y enums en top-level
  - `lib/auth.ts` mantiene `/client` ya que solo usa `PrismaClient` (no enums) — NO modificado ✓
- **Correcciones adicionales durante build:**
  - `dashboard.container.tsx`: `totalTickets`/`totalSales` no existen en `CorteActivoResponse` — fixed usando type guard `status === "CLOSED"` con `ticketCount`
  - `cortes/page.tsx`: `isActive` no existía en `.prisma/client` cacheado (stale) — resuelto al unificar imports al generated client regenerado
  - Prisma client regenerado (`npm run prisma:generate`) para sincronizar schema con tipos
- Build pasa: `✓ Compiled successfully` + `✓ Generating static pages`

### File List

- `lib/db.ts` — MODIFIED (`@prisma/client` → `@/app/generated/prisma`)
- `modules/members/members.service.ts` — MODIFIED (`@prisma/client` → `@/app/generated/prisma`)
- `modules/inventory/inventory.service.ts` — MODIFIED (`@prisma/client` → `@/app/generated/prisma`)
- `modules/products/products.service.ts` — MODIFIED (`@prisma/client` → `@/app/generated/prisma`)
- `modules/sales/sales.service.ts` — MODIFIED (`@/app/generated/prisma/client` → `@/app/generated/prisma`)
- `services/enum-mappers.ts` — MODIFIED (`@prisma/client` → `@/app/generated/prisma`)
- `services/utils.ts` — MODIFIED (`@prisma/client` → `@/app/generated/prisma`)
- `services/users.service.ts` — MODIFIED (`@prisma/client` → `@/app/generated/prisma`)
- `services/membership-helpers.ts` — MODIFIED (`@prisma/client` → `@/app/generated/prisma`)
- `app/(dashboard)/_components/dashboard.container.tsx` — MODIFIED (fix type error pre-existente: `totalTickets`→`ticketCount` con guard `status === "CLOSED"`)
- `app/generated/prisma/` — REGENERADO (`npm run prisma:generate`)
