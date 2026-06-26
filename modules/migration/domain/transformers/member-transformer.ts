import type { CanonicalMember } from "../canonical.types";
import type { DomainMember, ParseResult, ParseWarning } from "../domain.types";
import { parseMembership } from "../parsers/membership-parser";
import { normalizeDate } from "../parsers/date-parser";
import { normalizePhone, normalizeEmail } from "../parsers/null-normalizer";

export function transformMembers(
  members: CanonicalMember[],
  filename: string,
): ParseResult<DomainMember[]> {
  const warnings: ParseWarning[] = [];
  const domainMembers: DomainMember[] = [];

  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const row = i + 4; // socios start at data row 4 (rows 1-3 = title/empty/header)

    function warn(field: string, originalValue: string, message: string, code?: string) {
      warnings.push({ filename, row, field, originalValue, message, code });
    }

    // Membership
    const membershipResult = parseMembership(m.membresia);
    if (membershipResult.warning) {
      warn("membresia", membershipResult.rawInput, membershipResult.warning.message, membershipResult.warning.code);
    }

    // Dates
    const birthDateResult = normalizeDate(m.fechaNacimiento);
    if (birthDateResult.warning) {
      warn("fechaNacimiento", birthDateResult.rawInput, birthDateResult.warning.message, birthDateResult.warning.code);
    }

    const startDateResult = normalizeDate(m.fechaInicio);
    if (startDateResult.warning) {
      warn("fechaInicio", startDateResult.rawInput, startDateResult.warning.message, startDateResult.warning.code);
    }

    const endDateResult = normalizeDate(m.fechaVencimiento);
    if (endDateResult.warning) {
      warn("fechaVencimiento", endDateResult.rawInput, endDateResult.warning.message, endDateResult.warning.code);
    }

    const lastVisitResult = normalizeDate(m.ultimaVisita);
    // No warning for null lastVisit — it's optional

    domainMembers.push({
      memberNumber: m.codigoSocio,
      name: m.nombre,
      phone: normalizePhone(m.telefono),
      email: normalizeEmail(m.correo),
      birthDate: birthDateResult.date,
      startDate: startDateResult.date,
      endDate: endDateResult.date,
      membershipType: membershipResult.membershipType,
      membershipDescription: m.membresia,
      paymentMethodFromMembership: membershipResult.paymentPrefix,
      totalVisits: m.totalVisitas ?? 0,
      lastVisit: lastVisitResult.date,
      isActive: endDateResult.date === null || endDateResult.date >= new Date(),
    });
  }

  return { data: domainMembers, warnings };
}
