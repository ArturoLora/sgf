import { prisma } from "@/lib/db";
import { MembershipType } from "@prisma/client";
import {
  mapMembershipType,
  parseMembershipType,
  mapMembershipTypeToApi,
  mapPaymentMethodFromApi,
} from "./enum-mappers";
import {
  parseISODate,
  parseBooleanQuery,
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
  SocioVencidoResponse,
  VigenciaMembresiaResponse,
  MembersQueryInput,
  CreateMemberInputRaw,
  UpdateMemberInputRaw,
  RenewMemberInputRaw,
  CrearSocioRequest,
  ActualizarSocioRequest,
  RenovarMembresiaRequest,
} from "@/types/api/members";

// ==================== SERIALIZER ====================

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

export interface SearchMembersParams {
  search?: string;
  isActive?: boolean;
  membershipType?: MembershipType;
}

// ==================== PARSING HELPERS ====================

export function parseMembersQuery(raw: MembersQueryInput): SearchMembersParams {
  const validated = MembersQuerySchema.parse(raw);
  return {
    search: validated.search,
    isActive: parseBooleanQuery(validated.isActive),
    membershipType: parseMembershipType(validated.membershipType),
  };
}

export function parseCreateMemberInput(
  raw: CreateMemberInputRaw,
): CrearSocioRequest {
  const validated = CreateMemberInputSchema.parse(raw);
  const parsedMembershipType = parseMembershipType(validated.membershipType);
  return {
    memberNumber: validated.memberNumber,
    name: validated.name,
    phone: validated.phone,
    email: validated.email,
    birthDate: validated.birthDate,
    membershipType: parsedMembershipType
      ? mapMembershipTypeToApi(parsedMembershipType)
      : undefined,
    membershipDescription: validated.membershipDescription,
    startDate: validated.startDate,
    endDate: validated.endDate,
    paymentMethod: validated.paymentMethod
      ? mapPaymentMethodFromApi(validated.paymentMethod)
      : undefined,
  };
}

export function parseUpdateMemberInput(
  raw: UpdateMemberInputRaw,
): ActualizarSocioRequest {
  const validated = UpdateMemberInputSchema.parse(raw);
  const parsedMembershipType = parseMembershipType(validated.membershipType);
  return {
    name: validated.name,
    phone: validated.phone,
    email: validated.email,
    birthDate: validated.birthDate,
    membershipType: parsedMembershipType
      ? mapMembershipTypeToApi(parsedMembershipType)
      : undefined,
    membershipDescription: validated.membershipDescription,
    startDate: validated.startDate,
    endDate: validated.endDate,
    isActive: validated.isActive,
  };
}

export function parseRenewMemberInput(
  raw: RenewMemberInputRaw,
): RenovarMembresiaRequest {
  const validated = RenewMemberInputSchema.parse(raw);
  const membershipType = parseMembershipType(validated.membershipType);
  if (!membershipType)
    throw new Error("membershipType is required for renewal");
  return {
    memberId: validated.memberId,
    membershipType: mapMembershipTypeToApi(membershipType),
    membershipDescription: validated.membershipDescription,
    startDate: validated.startDate,
    paymentMethod: validated.paymentMethod
      ? mapPaymentMethodFromApi(validated.paymentMethod)
      : undefined,
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

  if (params?.isActive !== undefined) where.isActive = params.isActive;
  if (params?.membershipType) where.membershipType = params.membershipType;

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
          product: { select: { name: true, salePrice: true } },
        },
      },
    },
  });

  if (!member) throw new Error("Socio no encontrado");

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
          product: { select: { name: true, salePrice: true } },
        },
      },
    },
  });

  if (!member) throw new Error("Socio no encontrado");

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
  data: CrearSocioRequest,
  // userId kept in signature for FASE 3 orquestador (inventory movement creation)
  _userId: string,
): Promise<SocioResponse> {
  const existingMember = await prisma.member.findUnique({
    where: { memberNumber: data.memberNumber },
  });

  if (existingMember) throw new Error("El número de socio ya existe");

  const member = await prisma.member.create({
    data: {
      memberNumber: data.memberNumber,
      name: data.name,
      phone: data.phone,
      email: data.email,
      birthDate: data.birthDate ? parseISODate(data.birthDate) : undefined,
      membershipType: data.membershipType
        ? parseMembershipType(data.membershipType)
        : undefined,
      membershipDescription: data.membershipDescription,
      startDate: data.startDate ? parseISODate(data.startDate) : undefined,
      endDate: data.endDate ? parseISODate(data.endDate) : undefined,
    },
  });

  // NOTE FASE 3: La creación del movimiento de inventario (venta de membresía)
  // asociado al alta de un socio es una operación multi-contexto (members + inventory).
  // Se manejará en un orquestador de FASE 3. members.service NO crea movimientos
  // de inventario ni accede a products ni shifts.

  return serializeMember(member);
}

export async function updateMember(
  id: number,
  data: ActualizarSocioRequest,
): Promise<SocioResponse> {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) throw new Error("Socio no encontrado");

  const updatedMember = await prisma.member.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      birthDate: data.birthDate ? parseISODate(data.birthDate) : undefined,
      membershipType: data.membershipType
        ? parseMembershipType(data.membershipType)
        : undefined,
      membershipDescription: data.membershipDescription,
      startDate: data.startDate ? parseISODate(data.startDate) : undefined,
      endDate: data.endDate ? parseISODate(data.endDate) : undefined,
      isActive: data.isActive,
    },
  });

  return serializeMember(updatedMember);
}

export async function toggleMemberStatus(id: number): Promise<SocioResponse> {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) throw new Error("Socio no encontrado");

  const updatedMember = await prisma.member.update({
    where: { id },
    data: { isActive: !member.isActive },
  });

  return serializeMember(updatedMember);
}

export async function registerVisit(memberId: number): Promise<SocioResponse> {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Socio no encontrado");
  if (!member.isActive) throw new Error("El socio no está activo");

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
      endDate: { gte: today, lte: limitDate },
      membershipType: { not: "VISIT" },
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

  return { total, active, inactive, byType };
}

export async function renewMembership(
  data: RenovarMembresiaRequest,
  // userId kept in signature for FASE 3 orquestador (inventory movement creation)
  _userId: string,
): Promise<SocioResponse> {
  const member = await prisma.member.findUnique({
    where: { id: data.memberId },
  });
  if (!member) throw new Error("Socio no encontrado");

  const prismaType = parseMembershipType(data.membershipType);
  if (!prismaType) throw new Error("membershipType is required for renewal");

  const dates = calculateMembershipDates(
    prismaType,
    data.startDate ? parseISODate(data.startDate) : undefined,
  );

  const updatedMember = await prisma.member.update({
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

  // NOTE FASE 3: La creación del movimiento de inventario (venta de membresía)
  // asociado a la renovación es una operación multi-contexto (members + inventory).
  // Se manejará en un orquestador de FASE 3. members.service NO crea movimientos
  // de inventario ni accede a products ni shifts.

  return serializeMember(updatedMember);
}

export async function getExpiredMembers(): Promise<SocioVencidoResponse[]> {
  const today = new Date();

  const members = await prisma.member.findMany({
    where: {
      isActive: true,
      endDate: { lt: today },
      membershipType: { not: "VISIT" },
    },
    orderBy: { endDate: "desc" },
  });

  return members.map((m) => {
    const serialized = serializeMember(m);
    const daysExpired = m.endDate
      ? Math.floor(
          (today.getTime() - m.endDate.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;

    return {
      id: serialized.id,
      memberNumber: serialized.memberNumber,
      name: serialized.name,
      membershipType: serialized.membershipType,
      endDate: serialized.endDate,
      daysExpired,
    };
  });
}

export async function verifyMembershipValidity(
  memberId: number,
): Promise<VigenciaMembresiaResponse> {
  const member = await prisma.member.findUnique({ where: { id: memberId } });

  if (!member || !member.endDate || member.membershipType === "VISIT") {
    return { isValid: false, daysRemaining: 0, endDate: null };
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
