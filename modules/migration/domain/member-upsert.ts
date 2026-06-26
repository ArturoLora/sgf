import type { DomainMember } from "./domain.types";

export interface MemberUpsertData {
  memberNumber: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  membershipType: string | null; // caller casts to MembershipType enum at DB call site
  membershipDescription: string | null;
  totalVisits: number;
  lastVisit: Date | null;
  isActive: boolean;
  // paymentMethodFromMembership intentionally excluded — no field in Prisma Member
}

export function buildMemberUpsertData(member: DomainMember): MemberUpsertData {
  return {
    memberNumber: member.memberNumber,
    name: member.name || null,
    phone: member.phone,
    email: member.email,
    birthDate: member.birthDate,
    startDate: member.startDate,
    endDate: member.endDate,
    membershipType: member.membershipType,
    membershipDescription: member.membershipDescription,
    totalVisits: member.totalVisits,
    lastVisit: member.lastVisit,
    isActive: member.isActive,
  };
}
