// services/members.service.ts
import { prisma } from "@/lib/db";
import { MembershipType } from "@prisma/client";
import { mapMembershipType, parseMembershipType } from "./enum-mappers";
import {
  parseISODate,
  parseBooleanQuery,
  calculateEndDate,
  calculateMembershipDates,
} from "./utils";
import {
  MembersQuerySchema,
  CreateMemberInputSchema,
  UpdateMemberInputSchema,
  RenewMemberInputSchema,
} from "@/types/api/members";
import type {
  SocioResponse,
  SocioConHistorialResponse,
  VigenciaMembresiaResponse,
  MembersQueryInput,
  CreateMemberInputRaw,
  UpdateMemberInputRaw,
  RenewMemberInputRaw,
} from "@/types/api/members";

function serializeMember(member: {
  id: number;
  memberNumber: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  membershipType: MembershipType | null;
  membershipDescription: string | null;
  startDate: Date | null;
  endDate: Date | null;
  totalVisits: number;
  lastVisit: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SocioResponse {
  return {
    id: member.id,
    memberNumber: member.memberNumber,
    name: member.name ?? undefined,
    phone: member.phone ?? undefined,
    email: member.email ?? undefined,
    birthDate: member.birthDate ?? undefined,
    membershipType: member.membershipType
      ? mapMembershipType(member.membershipType)
      : undefined,
    membershipDescription: member.membershipDescription ?? undefined,
    startDate: member.startDate ?? undefined,
    endDate: member.endDate ?? undefined,
    totalVisits: member.totalVisits,
    lastVisit: member.lastVisit ?? undefined,
    isActive: member.isActive,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

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
  paymentMethod?: "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "TRANSFER";
  userId: string;
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
  userId: string;
  paymentMethod?: "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "TRANSFER";
}

export interface SearchMembersParams {
  search?: string;
  isActive?: boolean;
  membershipType?: MembershipType;
}

// ==================== PARSING HELPERS ====================

/**
 * Parse and validate members query parameters
 */
export function parseMembersQuery(raw: MembersQueryInput): SearchMembersParams {
  const validated = MembersQuerySchema.parse(raw);

  return {
    search: validated.search,
    isActive: parseBooleanQuery(validated.isActive),
    membershipType: parseMembershipType(validated.membershipType),
  };
}

/**
 * Parse and validate create member input
 */
export function parseCreateMemberInput(
  raw: CreateMemberInputRaw,
  userId: string,
): CreateMemberInput {
  const validated = CreateMemberInputSchema.parse(raw);

  return {
    memberNumber: validated.memberNumber,
    name: validated.name,
    phone: validated.phone,
    email: validated.email,
    birthDate: parseISODate(validated.birthDate),
    membershipType: parseMembershipType(validated.membershipType),
    membershipDescription: validated.membershipDescription,
    startDate: parseISODate(validated.startDate),
    endDate: parseISODate(validated.endDate),
    paymentMethod: validated.paymentMethod,
    userId,
  };
}

/**
 * Parse and validate update member input
 */
export function parseUpdateMemberInput(
  raw: UpdateMemberInputRaw,
): UpdateMemberInput {
  const validated = UpdateMemberInputSchema.parse(raw);

  return {
    name: validated.name,
    phone: validated.phone,
    email: validated.email,
    birthDate: parseISODate(validated.birthDate),
    membershipType: parseMembershipType(validated.membershipType),
    membershipDescription: validated.membershipDescription,
    startDate: parseISODate(validated.startDate),
    endDate: parseISODate(validated.endDate),
    isActive: validated.isActive,
  };
}

/**
 * Parse and validate renew membership input
 */
export function parseRenewMemberInput(
  raw: RenewMemberInputRaw,
  userId: string,
): RenewMembershipInput {
  const validated = RenewMemberInputSchema.parse(raw);

  const membershipType = parseMembershipType(validated.membershipType);
  if (!membershipType) {
    throw new Error("membershipType is required for renewal");
  }

  return {
    memberId: validated.memberId,
    membershipType,
    membershipDescription: validated.membershipDescription,
    startDate: parseISODate(validated.startDate),
    paymentMethod: validated.paymentMethod,
    userId,
  };
}

// ==================== SERVICE METHODS ====================

export async function getAllMembers(
  params?: SearchMembersParams,
): Promise<SocioResponse[]> {
  const where: {
    OR?: Array<{
      memberNumber?: { contains: string; mode: "insensitive" };
      name?: { contains: string; mode: "insensitive" };
      phone?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
    }>;
    isActive?: boolean;
    membershipType?: MembershipType;
  } = {};

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

  return members.map(serializeMember);
}

export async function getMemberById(
  id: number,
): Promise<SocioConHistorialResponse> {
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

  return {
    ...serializeMember(member),
    inventoryMovements: member.inventoryMovements.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      total: m.total ? Number(m.total) : 0,
      date: m.date,
      product: {
        name: m.product.name,
        salePrice: Number(m.product.salePrice),
      },
    })),
  };
}

export async function getMemberByNumber(
  memberNumber: string,
): Promise<SocioConHistorialResponse> {
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

  return {
    ...serializeMember(member),
    inventoryMovements: member.inventoryMovements.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      total: m.total ? Number(m.total) : 0,
      date: m.date,
      product: {
        name: m.product.name,
        salePrice: Number(m.product.salePrice),
      },
    })),
  };
}

export async function createMember(
  data: CreateMemberInput,
): Promise<SocioResponse> {
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
      birthDate: data.birthDate,
      membershipType: data.membershipType,
      membershipDescription: data.membershipDescription,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  });

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

  return serializeMember(member);
}

export async function updateMember(
  id: number,
  data: UpdateMemberInput,
): Promise<SocioResponse> {
  const member = await prisma.member.findUnique({
    where: { id },
  });

  if (!member) {
    throw new Error("Socio no encontrado");
  }

  const updatedMember = await prisma.member.update({
    where: { id },
    data,
  });

  return serializeMember(updatedMember);
}

export async function toggleMemberStatus(id: number): Promise<SocioResponse> {
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

  return serializeMember(updatedMember);
}

export async function registerVisit(memberId: number): Promise<SocioResponse> {
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

  return serializeMember(updatedMember);
}

export async function getActiveMembers(): Promise<SocioResponse[]> {
  const members = await prisma.member.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return members.map(serializeMember);
}

export async function getMembersExpiringSoon(
  days: number = 7,
): Promise<SocioResponse[]> {
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

  return members.map(serializeMember);
}

export async function getMembersStatistics(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byType: Array<{ membershipType: MembershipType | null; _count: number }>;
}> {
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

export async function renewMembership(
  data: RenewMembershipInput,
): Promise<SocioResponse> {
  const member = await prisma.member.findUnique({
    where: { id: data.memberId },
  });

  if (!member) {
    throw new Error("Socio no encontrado");
  }

  const dates = calculateMembershipDates(data.membershipType, data.startDate);

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

  const updatedMember = await prisma.$transaction(async (tx) => {
    const renewed = await tx.member.update({
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
    });

    await tx.inventoryMovement.create({
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
    });

    return renewed;
  });

  return serializeMember(updatedMember);
}

export async function getExpiredMembers(): Promise<SocioResponse[]> {
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

  return members.map(serializeMember);
}

export async function verifyMembershipValidity(
  memberId: number,
): Promise<VigenciaMembresiaResponse> {
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
