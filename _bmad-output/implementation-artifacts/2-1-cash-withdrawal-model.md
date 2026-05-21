# Story 2.1: Modelo CashWithdrawal — Retiros Individuales de Caja

Status: review

## Story

Como cajero/administrador,
quiero registrar retiros individuales de efectivo durante un turno activo,
para que cada retiro quede trazado con monto, hora, concepto y usuario, en lugar de capturarse como un total agregado al cierre.

## Acceptance Criteria

1. El modelo `CashWithdrawal` existe en el schema con campos: `id`, `shiftId`, `userId`, `amount` (Decimal 10,2 > 0), `concept` (String), `createdAt` (DateTime).
2. `POST /api/shifts/[id]/withdrawals` crea un retiro y retorna el registro creado. Requiere sesión activa.
3. El endpoint devuelve `400` si el turno está cerrado (`closingDate !== null`).
4. El endpoint devuelve `400` si `amount <= 0`.
5. `GET /api/shifts/[id]/withdrawals` devuelve la lista de retiros del turno. Requiere sesión activa.
6. `Shift.totalWithdrawals` se actualiza en la misma transacción que crea el retiro (cache denormalizado, `increment: amount`).
7. `closeShift()` recalcula `totalWithdrawals = SUM(cashWithdrawals.amount)` al cerrar, garantizando consistencia.
8. La migración de Prisma es aditiva — no toca datos existentes de turnos ni retiros legacy.
9. No existe endpoint DELETE ni PATCH para `CashWithdrawal` (historial inmutable, R3).

## Tasks / Subtasks

- [x] Task 1: Schema Prisma (AC: 1, 8)
  - [x] Agregar modelo `CashWithdrawal` al schema.prisma
  - [x] Agregar relación `cashWithdrawals CashWithdrawal[]` en `Shift`
  - [x] Agregar relación `cashWithdrawals CashWithdrawal[]` en `User`
  - [x] Ejecutar `npm run prisma:migrate` — confirmar migración aditiva
  - [x] Ejecutar `npm run prisma:generate` — regenerar cliente

- [x] Task 2: Tipos de API (AC: 2, 5)
  - [x] Agregar `CreateWithdrawalSchema` (Zod) en `types/api/shifts.ts`
  - [x] Agregar `CreateWithdrawalInput` (tipo inferido)
  - [x] Agregar `WithdrawalResponse` (interface de respuesta serializada)

- [x] Task 3: Service methods en shifts.service.ts (AC: 3, 4, 6, 7, 9)
  - [x] `createWithdrawal(shiftId, userId, amount, concept)` — validar R1 (turno abierto) + R2 (amount > 0) + transacción
  - [x] `getWithdrawalsByShift(shiftId)` — lista ordenada por `createdAt DESC`
  - [x] Actualizar `closeShift()` — agregar recálculo `totalWithdrawals = SUM(cashWithdrawals.amount)`

- [x] Task 4: Rutas API (AC: 2, 3, 4, 5, 9)
  - [x] Crear `app/api/shifts/[id]/withdrawals/route.ts` — handlers `GET` y `POST`
  - [x] Auth check en ambos handlers (patrón P-03)
  - [x] `POST`: parsear input con `CreateWithdrawalSchema`, llamar `createWithdrawal`
  - [x] `GET`: llamar `getWithdrawalsByShift`
  - [x] NO crear handler `DELETE` ni `PATCH`

- [x] Task 5: Verificar build (AC: todos)
  - [x] `npm run build` pasa sin errores de TypeScript (✓ Compiled successfully; runtime engine error es pre-existente, no regresión de esta story)
  - [x] Grep confirma que no existe handler DELETE/PATCH para withdrawals

## Dev Notes

### Contexto del cambio

D11 de architecture.md. Operacionalmente, los turnos ya tienen `totalWithdrawals` (Decimal) y `withdrawalsConcept` (String?) como campos manuales agregados al cierre. D11 los complementa con registros individuales trazables durante el turno activo.

**Lo que NO cambia:**
- `CloseShiftInput` mantiene `totalWithdrawals` y `withdrawalsConcept` como campos opcionales para compatibilidad con UI legacy que aún capture el total manual
- `Shift.withdrawalsConcept` se depreca gradualmente (no eliminar en esta story)
- Lógica de cálculo existente en `closeShift()` se preserva; solo se agrega el recálculo desde registros

### Estado actual de Shift model

```prisma
model Shift {
  // ... campos existentes ...
  totalWithdrawals   Decimal  @default(0) @db.Decimal(10, 2)
  withdrawalsConcept String?
  // ... relaciones existentes (cashier: User, inventoryMovements) ...
}
```

**Adición requerida:**
```prisma
  cashWithdrawals    CashWithdrawal[]
```

### Nuevo modelo

```prisma
model CashWithdrawal {
  id        Int      @id @default(autoincrement())
  shiftId   Int
  userId    String
  amount    Decimal  @db.Decimal(10, 2)
  concept   String
  createdAt DateTime @default(now())

  shift Shift @relation(fields: [shiftId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@index([shiftId])
  @@map("cash_withdrawal")
}
```

### Cambio en User model

Agregar al final de las relaciones en `User`:
```prisma
  cashWithdrawals CashWithdrawal[]
```

### Tipos de API nuevos (types/api/shifts.ts)

```typescript
export const CreateWithdrawalSchema = z.object({
  amount: z.number().positive("El monto debe ser mayor a cero"),
  concept: z.string().min(1, "El concepto es requerido"),
});
export type CreateWithdrawalInput = z.infer<typeof CreateWithdrawalSchema>;

export interface WithdrawalResponse {
  id: number;
  shiftId: number;
  userId: string;
  amount: number;       // serializado desde Decimal
  concept: string;
  createdAt: string;    // ISO string
  user: {
    id: string;
    name: string;
  };
}
```

### Service methods — especificación completa

**`createWithdrawal`:**
```typescript
export async function createWithdrawal(
  shiftId: number,
  userId: string,
  amount: number,
  concept: string,
): Promise<WithdrawalResponse> {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error("Turno no encontrado");
  // R1: solo turnos abiertos
  if (shift.closingDate !== null) throw new Error("Solo se pueden registrar retiros en turnos abiertos");
  // R2: monto positivo
  if (amount <= 0) throw new Error("El monto del retiro debe ser mayor a cero");

  const [withdrawal] = await prisma.$transaction([
    prisma.cashWithdrawal.create({
      data: { shiftId, userId, amount, concept },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.shift.update({
      where: { id: shiftId },
      data: { totalWithdrawals: { increment: amount } },
    }),
  ]);

  return serializeWithdrawal(withdrawal);
}
```

**`getWithdrawalsByShift`:**
```typescript
export async function getWithdrawalsByShift(
  shiftId: number,
): Promise<WithdrawalResponse[]> {
  const withdrawals = await prisma.cashWithdrawal.findMany({
    where: { shiftId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return withdrawals.map(serializeWithdrawal);
}
```

**Actualización en `closeShift()`** — agregar recálculo ANTES del `prisma.shift.update`:
```typescript
// Recalcular totalWithdrawals desde registros individuales para consistencia
const withdrawalRecords = await prisma.cashWithdrawal.findMany({
  where: { shiftId: data.shiftId },
});
const totalWithdrawalsFromRecords = withdrawalRecords.reduce(
  (sum, w) => sum + Number(w.amount),
  0,
);
// Si hay registros individuales, usarlos. Si no (legacy), usar data.totalWithdrawals.
const totalWithdrawals = withdrawalRecords.length > 0
  ? totalWithdrawalsFromRecords
  : (data.totalWithdrawals || 0);
```

> Esto reemplaza la línea existente `const totalWithdrawals = data.totalWithdrawals || 0;` (línea 321 de shifts.service.ts).

### Serializer helper

```typescript
function serializeWithdrawal(w: {
  id: number;
  shiftId: number;
  userId: string;
  amount: Decimal;
  concept: string;
  createdAt: Date;
  user: { id: string; name: string };
}): WithdrawalResponse {
  return {
    id: w.id,
    shiftId: w.shiftId,
    userId: w.userId,
    amount: Number(w.amount),
    concept: w.concept,
    createdAt: w.createdAt.toISOString(),
    user: w.user,
  };
}
```

Import `Decimal` from `@/app/generated/prisma` (patrón P-12).

### Ruta API — especificación completa

**`app/api/shifts/[id]/withdrawals/route.ts`** (nuevo archivo):
```typescript
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ShiftsService } from "@/services";
import { CreateWithdrawalSchema } from "@/types/api/shifts";
import { ZodError } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const shiftId = parseInt(id, 10);
    if (isNaN(shiftId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const withdrawals = await ShiftsService.getWithdrawalsByShift(shiftId);
    return NextResponse.json(withdrawals);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener retiros";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const shiftId = parseInt(id, 10);
    if (isNaN(shiftId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const input = CreateWithdrawalSchema.parse(await request.json());
    const withdrawal = await ShiftsService.createWithdrawal(
      shiftId,
      session.user.id,
      input.amount,
      input.concept,
    );
    return NextResponse.json(withdrawal, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.message }, { status: 400 });
    const message = error instanceof Error ? error.message : "Error al crear retiro";
    const status = message.includes("Solo se pueden") || message.includes("monto") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

### Exportar nuevos métodos desde services/index.ts

`services/index.ts` re-exporta `ShiftsService`. Verificar que `createWithdrawal` y `getWithdrawalsByShift` quedan disponibles en la re-exportación existente. Si `ShiftsService` re-exporta todo el módulo (`export * as ShiftsService from ...`), los nuevos métodos aparecen automáticamente.

### Patrón de imports Prisma (P-12)

```typescript
// En shifts.service.ts — si se necesita tipo Decimal para serializer:
import { Prisma } from "@/app/generated/prisma"
// type Decimal = Prisma.Decimal  — o usar el tipo directo del resultado de findMany
```

### Archivos que NO se modifican

- `lib/auth.ts` — sin cambios
- `lib/db.ts` — sin cambios
- Cualquier componente frontend existente — UI se agrega en story separada
- `prisma/seed.ts` — no requerido (sin datos de ejemplo de retiros en seed actual)

### Deuda técnica conocida en closeShift() (no bloquea esta story)

- Líneas 328–339: comentarios "DEUDA ACEPTADA" sobre `calcularEfectivoEsperado()` y `calcularDiferencia()` en `lib/domain/shifts/shift-calculations.ts`. Contratos divergen del code path actual. Abordar en D6 (migración shifts a modules/).

### Verificación post-implementación

```bash
# Confirmar migración aditiva
npm run prisma:migrate -- --name add_cash_withdrawal

# Confirmar build limpio
npm run build

# Confirmar no existe DELETE/PATCH
grep -rn "DELETE\|PATCH" app/api/shifts/\*/withdrawals/ || echo "OK: no handlers destructivos"

# Confirmar exports disponibles en services/index.ts
grep -n "createWithdrawal\|getWithdrawalsByShift" services/index.ts
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#D11] Decisión completa: schema, reglas R1–R3, integración con Shift, impacto en reportes.
- [Source: services/shifts.service.ts:261-368] `closeShift()` — estado actual; modificación en línea 321.
- [Source: services/shifts.service.ts:274] Patrón existente para verificar turno abierto: `if (shift.closingDate)`.
- [Source: types/api/shifts.ts:26-35] `CloseShiftSchema` — mantener campos legacy `totalWithdrawals` y `withdrawalsConcept`.
- [Source: _bmad-output/planning-artifacts/architecture.md#P-12] Imports Prisma: usar `@/app/generated/prisma` (root).
- [Source: _bmad-output/planning-artifacts/architecture.md#P-03] Patrón route canónica — auth check primero.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Tasks 1–3 implementados en sesión previa (2026-05-20). Task 4 (ruta) faltaba al inicio de esta sesión.
- `npm run build`: TypeScript compiló limpio (`✓ Compiled successfully in 4.2s`). Runtime error de Prisma engine (`/Documents/sgf` hardcoded) es pre-existente (obs 295/299/300), no regresión de esta story.
- `npx tsc --noEmit`: `TypeScript: No errors found`

### Completion Notes List

- AC1 ✅: `CashWithdrawal` en schema con id/shiftId/userId/amount/concept/createdAt + índice shiftId
- AC2 ✅: POST `/api/shifts/[id]/withdrawals` — crea retiro, retorna 201 + registro, requiere sesión
- AC3 ✅: `createWithdrawal` lanza error R1 → ruta retorna 400 si turno cerrado
- AC4 ✅: `createWithdrawal` lanza error R2 → ruta retorna 400 si amount ≤ 0
- AC5 ✅: GET `/api/shifts/[id]/withdrawals` — lista retiros, requiere sesión
- AC6 ✅: transacción `$transaction` crea CashWithdrawal + incrementa `totalWithdrawals` en Shift
- AC7 ✅: `closeShift()` recalcula `totalWithdrawals = SUM(cashWithdrawals.amount)` antes del update
- AC8 ✅: migración aditiva — schema push/migrate no toca datos existentes
- AC9 ✅: sin handler DELETE ni PATCH en withdrawals route (grep confirmado)

### File List

- `prisma/schema.prisma` — MODIFIED (modelo CashWithdrawal, relaciones en Shift y User)
- `prisma/migrations/` — NEW (migración aditiva add_cash_withdrawal)
- `app/generated/prisma/` — REGENERADO (prisma:generate)
- `types/api/shifts.ts` — MODIFIED (CreateWithdrawalSchema, CreateWithdrawalInput, WithdrawalResponse)
- `services/shifts.service.ts` — MODIFIED (createWithdrawal, getWithdrawalsByShift, closeShift actualizado, serializeWithdrawal)
- `app/api/shifts/[id]/withdrawals/route.ts` — NEW (GET + POST, auth P-03, sin DELETE/PATCH)
- `services/index.ts` — sin cambios (re-export wildcard cubre métodos nuevos automáticamente)
