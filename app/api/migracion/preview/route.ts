import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MigrationService } from "@/modules/migration/migration.service";
import type { DomainMember, DomainShift } from "@/modules/migration/domain/domain.types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function serializeMember(m: DomainMember) {
  return {
    memberNumber: m.memberNumber,
    name: m.name,
    phone: m.phone,
    email: m.email,
    birthDate: m.birthDate?.toISOString() ?? null,
    startDate: m.startDate?.toISOString() ?? null,
    endDate: m.endDate?.toISOString() ?? null,
    membershipType: m.membershipType,
    membershipDescription: m.membershipDescription,
    paymentMethodFromMembership: m.paymentMethodFromMembership,
    totalVisits: m.totalVisits,
    lastVisit: m.lastVisit?.toISOString() ?? null,
    isActive: m.isActive,
  };
}

function serializeShift(s: DomainShift) {
  const cancelledCount = s.sales.filter((sale) => sale.isCancelled).length;
  const regularCount = s.sales.filter((sale) => !sale.isCancelled).length;
  const membershipCount = s.sales.filter((sale) => sale.isMembership && !sale.isCancelled).length;
  return {
    folio: s.folio,
    openingDate: s.openingDate?.toISOString() ?? null,
    openingTime: s.openingTime,
    closingTime: s.closingTime,
    saleCount: regularCount,
    cancelledCount,
    membershipSaleCount: membershipCount,
    inventoryCount: s.inventory.length,
    withdrawalCount: s.withdrawals.length,
    legacyNotes: s.legacyNotes,
    // Detalle completo (Story de batching) — transporte interno para
    // sync-shifts/ejecutar sin volver a subir/parsear archivos. La UI de
    // preview sigue leyendo solo los campos de resumen de arriba.
    cashierName: s.cashierName,
    sales: s.sales.map((sale) => ({
      ticket: sale.ticket,
      saleDate: sale.saleDate?.toISOString() ?? null,
      memberNumber: sale.memberNumber,
      memberName: sale.memberName,
      description: sale.description,
      paymentMethod: sale.paymentMethod,
      sellerName: sale.sellerName,
      price: sale.price,
      discount: sale.discount,
      surcharge: sale.surcharge,
      isCancelled: sale.isCancelled,
      isMembership: sale.isMembership,
    })),
    inventory: s.inventory.map((row) => ({
      productName: row.productName,
      gymStock: row.gymStock,
      warehouseStock: row.warehouseStock,
      adjustment: row.adjustment,
      entries: row.entries,
    })),
    withdrawals: s.withdrawals.map((w) => ({
      withdrawalDate: w.withdrawalDate?.toISOString() ?? null,
      concept: w.concept,
      amount: w.amount,
    })),
    initialCash: s.initialCash,
    ticketCount: s.ticketCount,
    membershipSales: s.membershipSales,
    productSales0Tax: s.productSales0Tax,
    productSales16Tax: s.productSales16Tax,
    subtotal: s.subtotal,
    tax: s.tax,
    totalSales: s.totalSales,
    cashAmount: s.cashAmount,
    debitCardAmount: s.debitCardAmount,
    creditCardAmount: s.creditCardAmount,
    totalVoucher: s.totalVoucher,
    totalWithdrawalsAmount: s.totalWithdrawalsAmount,
    totalCash: s.totalCash,
  };
}

export async function POST(request: Request): Promise<Response> {
  // Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const rawFiles = formData.getAll("files") as File[];
  if (rawFiles.length === 0) {
    return Response.json({ error: "No se recibieron archivos" }, { status: 400 });
  }

  // Validate sizes
  for (const file of rawFiles) {
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `El archivo "${file.name}" excede el límite de 10 MB` },
        { status: 400 },
      );
    }
  }

  // Convert to Buffers
  const files = await Promise.all(
    rawFiles.map(async (file) => ({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    })),
  );

  const result = await MigrationService.previewFiles(files);

  return Response.json({
    members: result.members.map(serializeMember),
    shifts: result.shifts.map(serializeShift),
    warnings: result.warnings,
    membershipTypeDistribution: result.membershipTypeDistribution,
    totalWarnings: result.warnings.length,
    sellerNames: result.sellerNames,
  });
}
