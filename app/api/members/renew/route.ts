import { NextRequest, NextResponse } from "next/server";
import { MembersService } from "@/modules/members/members.service";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMembershipProductKeywordFromApi } from "@/services/membership-helpers";
import { generateTicket } from "@/lib/domain/sales/ticket";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const serviceInput = MembersService.parseRenewMemberInput(body);
    const member = await MembersService.renewMembership(
      serviceInput,
      session.user.id,
    );

    // ─── Post-renewal: crear InventoryMovement para tracking de corte ───
    // Non-blocking: renovación ya exitosa; fallo aquí solo se loguea.
    try {
      const activeShift = await prisma.shift.findFirst({
        where: { closingDate: null },
      });

      if (!activeShift) {
        console.warn(
          `[renew] memberId=${serviceInput.memberId} renovado sin turno activo — no incluido en corte`,
        );
      } else {
        const keyword = getMembershipProductKeywordFromApi(
          serviceInput.membershipType,
        );
        const product = await prisma.product.findFirst({
          where: { name: { contains: keyword, mode: "insensitive" } },
        });

        if (!product) {
          console.warn(
            `[renew] No se encontró producto para membresía "${serviceInput.membershipType}" (keyword: "${keyword}") — movimiento no creado`,
          );
        } else {
          const unitPrice = Number(product.salePrice);
          await prisma.inventoryMovement.create({
            data: {
              productId: product.id,
              type: "SALE",
              location: "GYM",
              quantity: -1,
              ticket: generateTicket(),
              memberId: serviceInput.memberId,
              userId: session.user.id,
              unitPrice,
              subtotal: unitPrice,
              discount: 0,
              surcharge: 0,
              total: unitPrice,
              paymentMethod: serviceInput.paymentMethod,
              shiftId: activeShift.id,
            },
          });
        }
      }
    } catch (movErr) {
      console.error(
        "[renew] Error creando movimiento de inventario (renovación completada):",
        movErr,
      );
    }

    return NextResponse.json(member);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al renovar membresía";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
