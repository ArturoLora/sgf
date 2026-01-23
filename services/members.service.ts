// services/members.service.ts
import { prisma } from "@/lib/db";
import { MembershipType } from "@prisma/client";
import { serializeDecimal } from "./utils";

// ==================== TYPES ====================

export interface CreateMemberInput {
  memberNumber: string;
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: Date;
  membershipType?: MembershipType;
  membershipDescription?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateMemberWithSaleInput extends CreateMemberInput {
  userId?: string;
  paymentMethod?: "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "TRANSFER";
}

export interface UpdateMemberInput {
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: Date;
  membershipType?: MembershipType;
  membershipDescription?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface RenewMembershipInput {
  memberId: number;
  membershipType: MembershipType;
  membershipDescription?: string;
  startDate?: Date;
}

export interface RenewMembershipWithSaleInput extends RenewMembershipInput {
  userId: string;
  paymentMethod?: "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "TRANSFER";
}

export interface SearchMembersParams {
  search?: string;
  isActive?: boolean;
  membershipType?: MembershipType;
}

// ==================== HELPERS ====================

/**
 * Calcula la fecha de fin según el tipo de membresía
 */
function calculateEndDate(
  startDate: Date,
  membershipType: MembershipType,
): Date {
  const date = new Date(startDate);

  switch (membershipType) {
    case "VISIT":
      return date;
    case "WEEK":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTH_STUDENT":
    case "MONTH_GENERAL":
      date.setMonth(date.getMonth() + 1);
      break;
    case "QUARTER_STUDENT":
    case "QUARTER_GENERAL":
      date.setMonth(date.getMonth() + 3);
      break;
    case "ANNUAL_STUDENT":
    case "ANNUAL_GENERAL":
      date.setFullYear(date.getFullYear() + 1);
      break;
    case "PROMOTION":
    case "REBIRTH":
    case "NUTRITION_CONSULTATION":
      date.setMonth(date.getMonth() + 1);
      break;
  }

  return date;
}

/**
 * Calcula fechas de inicio y fin para una membresía
 */
export function calculateMembershipDates(
  membershipType: MembershipType,
  startDate?: Date,
): { startDate: Date; endDate: Date } {
  const start = startDate || new Date();
  const end = calculateEndDate(start, membershipType);

  return {
    startDate: start,
    endDate: end,
  };
}

// ==================== PUBLIC SERVICES ====================

/**
 * Lista todos los socios con filtros opcionales
 */
export async function getAllMembers(params?: SearchMembersParams) {
  const where: any = {};

  if (params?.search) {
    where.OR = [
      { memberNumber: { contains: params.search, mode: "insensitive" } },
      { name: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params?.isActive !== undefined) {
    where.isActive = params.isActive;
  }

  if (params?.membershipType) {
    where.membershipType = params.membershipType;
  }

  const members = await prisma.member.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return serializeDecimal(members);
}

/**
 * Obtiene un socio por ID con su historial de compras
 */
export async function getMemberById(id: number) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      inventoryMovements: {
        where: { type: "SALE", isCancelled: false },
        orderBy: { date: "desc" },
        take: 20,
        include: {
          product: {
            select: {
              name: true,
              salePrice: true,
            },
          },
        },
      },
    },
  });

  if (!member) {
    throw new Error("Socio no encontrado");
  }

  return serializeDecimal(member);
}

/**
 * Obtiene un socio por número de socio
 */
export async function getMemberByNumber(memberNumber: string) {
  const member = await prisma.member.findUnique({
    where: { memberNumber },
    include: {
      inventoryMovements: {
        where: { type: "SALE", isCancelled: false },
        orderBy: { date: "desc" },
        take: 5,
        include: {
          product: {
            select: {
              name: true,
              salePrice: true,
            },
          },
        },
      },
    },
  });

  if (!member) {
    throw new Error("Socio no encontrado");
  }

  return serializeDecimal(member);
}

/**
 * Crea un nuevo socio
 * Si tiene membresía y userId, crea la venta automáticamente
 */
export async function createMember(data: CreateMemberWithSaleInput) {
  const existingMember = await prisma.member.findUnique({
    where: { memberNumber: data.memberNumber },
  });

  if (existingMember) {
    throw new Error("El número de socio ya existe");
  }

  const member = await prisma.member.create({
    data: {
      memberNumber: data.memberNumber,
      name: data.name,
      phone: data.phone,
      email: data.email,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      membershipType: data.membershipType,
      membershipDescription: data.membershipDescription,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });

  // Si tiene membresía y userId, crear venta
  if (data.membershipType && data.userId) {
    const keywordMap: Record<string, string> = {
      MONTH_STUDENT: "MENSUALIDAD ESTUDIANTE",
      MONTH_GENERAL: "MENSUALIDAD GENERAL",
      WEEK: "SEMANA",
      VISIT: "VISITA",
      QUARTER_STUDENT: "TRIMESTRE ESTUDIANTE",
      QUARTER_GENERAL: "TRIMESTRE GENERAL",
      ANNUAL_STUDENT: "ANUAL ESTUDIANTE",
      ANNUAL_GENERAL: "ANUAL GENERAL",
      PROMOTION: "PROMOCION",
      REBIRTH: "RENACER",
    };

    const keyword = keywordMap[data.membershipType] || data.membershipType;

    const product = await prisma.product.findFirst({
      where: {
        name: { contains: keyword, mode: "insensitive" },
        isActive: true,
      },
    });

    if (product) {
      const activeShift = await prisma.shift.findFirst({
        where: { closingDate: null },
      });

      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, "0");
      const ticket = `NEW${timestamp}${random}`;

      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "SALE",
          location: "GYM",
          quantity: -1,
          ticket,
          memberId: member.id,
          userId: data.userId,
          unitPrice: product.salePrice,
          subtotal: product.salePrice,
          discount: 0,
          surcharge: 0,
          total: product.salePrice,
          paymentMethod: data.paymentMethod || "CASH",
          shiftId: activeShift?.id,
          notes: `Alta de socio: ${data.membershipDescription || data.membershipType}`,
        },
      });
    }
  }

  return serializeDecimal(member);
}

/**
 * Actualiza un socio existente
 */
export async function updateMember(id: number, data: UpdateMemberInput) {
  const member = await prisma.member.findUnique({
    where: { id },
  });

  if (!member) {
    throw new Error("Socio no encontrado");
  }

  const updatedMember = await prisma.member.update({
    where: { id },
    data: {
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });

  return serializeDecimal(updatedMember);
}

/**
 * Activa/desactiva un socio
 */
export async function toggleMemberStatus(id: number) {
  const member = await prisma.member.findUnique({
    where: { id },
  });

  if (!member) {
    throw new Error("Socio no encontrado");
  }

  const updatedMember = await prisma.member.update({
    where: { id },
    data: { isActive: !member.isActive },
  });

  return serializeDecimal(updatedMember);
}

/**
 * Registra una visita de un socio
 */
export async function registerVisit(memberId: number) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    throw new Error("Socio no encontrado");
  }

  if (!member.isActive) {
    throw new Error("El socio no está activo");
  }

  const updatedMember = await prisma.member.update({
    where: { id: memberId },
    data: {
      totalVisits: { increment: 1 },
      lastVisit: new Date(),
    },
  });

  return serializeDecimal(updatedMember);
}

/**
 * Lista solo socios activos
 */
export async function getActiveMembers() {
  const members = await prisma.member.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return serializeDecimal(members);
}

/**
 * Lista socios con membresía próxima a vencer
 */
export async function getMembersExpiringSoon(days: number = 7) {
  const today = new Date();
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + days);

  const members = await prisma.member.findMany({
    where: {
      isActive: true,
      endDate: {
        gte: today,
        lte: limitDate,
      },
      membershipType: {
        not: "VISIT",
      },
    },
    orderBy: { endDate: "asc" },
  });

  return serializeDecimal(members);
}

/**
 * Genera estadísticas de socios
 */
export async function getMembersStatistics() {
  const total = await prisma.member.count();
  const active = await prisma.member.count({ where: { isActive: true } });
  const inactive = await prisma.member.count({ where: { isActive: false } });

  const byType = await prisma.member.groupBy({
    by: ["membershipType"],
    where: { isActive: true },
    _count: true,
  });

  return {
    total,
    active,
    inactive,
    byType,
  };
}

/**
 * Renueva la membresía de un socio
 * Crea la venta automáticamente
 */
export async function renewMembership(data: RenewMembershipWithSaleInput) {
  const member = await prisma.member.findUnique({
    where: { id: data.memberId },
  });

  if (!member) {
    throw new Error("Socio no encontrado");
  }

  const dates = calculateMembershipDates(data.membershipType, data.startDate);

  // Buscar producto de membresía
  const keywordMap: Record<string, string> = {
    MONTH_STUDENT: "MENSUALIDAD ESTUDIANTE",
    MONTH_GENERAL: "MENSUALIDAD GENERAL",
    WEEK: "SEMANA",
    VISIT: "VISITA",
    QUARTER_STUDENT: "TRIMESTRE ESTUDIANTE",
    QUARTER_GENERAL: "TRIMESTRE GENERAL",
    ANNUAL_STUDENT: "ANUAL ESTUDIANTE",
    ANNUAL_GENERAL: "ANUAL GENERAL",
    PROMOTION: "PROMOCION",
    REBIRTH: "RENACER",
  };

  const keyword = keywordMap[data.membershipType] || data.membershipType;

  const product = await prisma.product.findFirst({
    where: {
      name: { contains: keyword, mode: "insensitive" },
      isActive: true,
    },
  });

  if (!product) {
    throw new Error(
      `No se encontró producto para membresía: ${data.membershipType}`,
    );
  }

  const activeShift = await prisma.shift.findFirst({
    where: { closingDate: null },
  });

  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  const ticket = `REN${timestamp}${random}`;

  const [updatedMember] = await prisma.$transaction([
    prisma.member.update({
      where: { id: data.memberId },
      data: {
        membershipType: data.membershipType,
        membershipDescription: data.membershipDescription,
        startDate: dates.startDate,
        endDate: dates.endDate,
        isActive: true,
        totalVisits: { increment: 1 },
        lastVisit: new Date(),
      },
    }),
    prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        type: "SALE",
        location: "GYM",
        quantity: -1,
        ticket,
        memberId: data.memberId,
        userId: data.userId,
        unitPrice: product.salePrice,
        subtotal: product.salePrice,
        discount: 0,
        surcharge: 0,
        total: product.salePrice,
        paymentMethod: data.paymentMethod || "CASH",
        shiftId: activeShift?.id,
        notes: `Renovación: ${data.membershipDescription || data.membershipType}`,
      },
    }),
  ]);

  return serializeDecimal(updatedMember);
}

/**
 * Lista socios con membresía vencida
 */
export async function getExpiredMembers() {
  const today = new Date();

  const members = await prisma.member.findMany({
    where: {
      isActive: true,
      endDate: {
        lt: today,
      },
      membershipType: {
        not: "VISIT",
      },
    },
    orderBy: { endDate: "desc" },
  });

  return serializeDecimal(members);
}

/**
 * Verifica la vigencia de una membresía
 */
export async function verifyMembershipValidity(memberId: number): Promise<{
  isValid: boolean;
  daysRemaining: number;
  endDate: Date | null;
}> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member || !member.endDate || member.membershipType === "VISIT") {
    return {
      isValid: false,
      daysRemaining: 0,
      endDate: null,
    };
  }

  const today = new Date();
  const endDate = new Date(member.endDate);
  const difference = endDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(difference / (1000 * 60 * 60 * 24));

  return {
    isValid: daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
    endDate,
  };
}
