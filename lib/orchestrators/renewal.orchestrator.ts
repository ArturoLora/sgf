/**
 * lib/orchestrators/renewal.orchestrator.ts
 *
 * Coordina la renovación de membresía y la creación del InventoryMovement
 * en una sola transacción atómica (Prisma $transaction).
 *
 * Arquitectura (P-2):
 *   Route → executeRenewal() → prisma.$transaction
 *     ├── tx.member.findUnique / tx.member.update   (lógica de MembersContext)
 *     ├── tx.shift.findFirst                        (lógica de ShiftsContext)
 *     └── tx.inventoryMovement.create               (lógica de InventoryContext)
 *
 *   MembersService e InventoryService NO se importan entre sí.
 *   Este orchestrator es la única capa que cruza contextos.
 *
 * Comportamiento de fallo:
 *   - Sin turno activo           → renovación exitosa, sin InventoryMovement (warn)
 *   - Producto no encontrado     → rollback completo (error claro al cajero)
 *   - Cualquier error de DB      → rollback completo (error propagado al route)
 */

import { prisma } from "@/lib/db";
import { calculateMembershipDates, parseISODate } from "@/services/utils";
import { parseMembershipType } from "@/services/enum-mappers";
import { getMembershipProductKeywordFromApi } from "@/services/membership-helpers";
import { generateTicket } from "@/lib/domain/sales/ticket";
import { MembersService } from "@/modules/members/members.service";
import type { RenovarMembresiaRequest, SocioResponse } from "@/types/api/members";

/**
 * Ejecuta la renovación de membresía de forma atómica.
 *
 * Si hay un turno activo:
 *   - La renovación del socio y el InventoryMovement se crean en la misma
 *     transacción. Si cualquiera falla, ambas operaciones hacen rollback.
 *
 * Si no hay turno activo:
 *   - Solo se renueva la membresía. Se registra un warning pero no falla.
 */
export async function executeRenewal(
  data: RenovarMembresiaRequest,
  userId: string,
): Promise<SocioResponse> {
  // ── Pre-computar valores puros fuera de la transacción ──────────────────
  const prismaType = parseMembershipType(data.membershipType);
  if (!prismaType) throw new Error("membershipType is required for renewal");

  const dates = calculateMembershipDates(
    prismaType,
    data.startDate ? parseISODate(data.startDate) : undefined,
  );

  const keyword = getMembershipProductKeywordFromApi(data.membershipType);

  // ── Transacción atómica ─────────────────────────────────────────────────
  const updatedMember = await prisma.$transaction(async (tx) => {
    // 1. Validar existencia del socio
    const member = await tx.member.findUnique({ where: { id: data.memberId } });
    if (!member) throw new Error("Socio no encontrado");

    // 2. Renovar membresía
    const updated = await tx.member.update({
      where: { id: data.memberId },
      data: {
        membershipType: prismaType,
        membershipDescription: data.membershipDescription,
        startDate: dates.startDate,
        endDate: dates.endDate,
        isActive: true,
        totalVisits: { increment: 1 },
        lastVisit: new Date(),
      },
    });

    // 3. Buscar turno activo
    const activeShift = await tx.shift.findFirst({
      where: { closingDate: null },
    });

    if (!activeShift) {
      // Sin turno: renovación válida, pero no queda en el corte del día.
      // El cajero debe abrir un turno antes de registrar ventas.
      console.warn(
        `[renewal.orchestrator] memberId=${data.memberId} renovado sin turno activo — no incluido en corte`,
      );
      return updated;
    }

    // 4. Buscar producto correspondiente a la membresía
    const product = await tx.product.findFirst({
      where: { name: { contains: keyword, mode: "insensitive" } },
    });

    if (!product) {
      // Con turno activo, un producto faltante es un error operativo que
      // causaría un faltante inexplicable en el corte. Hacemos rollback completo.
      throw new Error(
        `Producto para membresía "${data.membershipType}" no encontrado en catálogo ` +
          `(keyword: "${keyword}"). Verifique que exista el producto antes de renovar.`,
      );
    }

    // 5. Crear InventoryMovement para tracking en el corte
    const unitPrice = Number(product.salePrice);
    await tx.inventoryMovement.create({
      data: {
        productId: product.id,
        type: "SALE",
        location: "GYM",
        quantity: -1,
        ticket: generateTicket(),
        memberId: data.memberId,
        userId,
        unitPrice,
        subtotal: unitPrice,
        discount: 0,
        surcharge: 0,
        total: unitPrice,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        paymentMethod: data.paymentMethod as any,
        shiftId: activeShift.id,
      },
    });

    return updated;
  });

  // ── Serializar con la misma lógica que MembersService ──────────────────
  return MembersService.serializeMember(updatedMember);
}
