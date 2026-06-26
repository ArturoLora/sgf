// Pure function — no I/O, no Prisma, no HTTP calls.
import type { ParseWarning, UserRef, EmployeeMappingEntry, InconsistencyReport } from "./domain.types";

export function classifyInconsistencies(
  sellerNames: string[],
  warnings: ParseWarning[],
  users: UserRef[],
): InconsistencyReport {
  const usersByNormalizedName = new Map(
    users.map((u) => [u.name.trim().toUpperCase(), u]),
  );

  const employeeMappings: EmployeeMappingEntry[] = sellerNames.map((name) => {
    const matched = usersByNormalizedName.get(name.trim().toUpperCase()) ?? null;
    return {
      historicalName: name,
      resolvedUserId: matched?.id ?? null,
      isAutoMapped: matched !== null,
    };
  });

  const membershipWarnings = warnings.filter((w) => w.code === "UNKNOWN_MEMBERSHIP");
  const paymentMethodWarnings = warnings.filter((w) => w.code === "UNKNOWN_PAYMENT_METHOD");
  const dateWarnings = warnings.filter((w) => w.code === "UNRECOGNIZED_DATE_FORMAT");
  const otherWarnings = warnings.filter(
    (w) => !["UNKNOWN_MEMBERSHIP", "UNKNOWN_PAYMENT_METHOD", "UNRECOGNIZED_DATE_FORMAT"].includes(w.code ?? ""),
  );

  const totalBlocking = employeeMappings.filter((e) => !e.resolvedUserId).length;
  const totalWarnings =
    membershipWarnings.length + paymentMethodWarnings.length + dateWarnings.length + otherWarnings.length;

  return {
    employeeMappings,
    membershipWarnings,
    paymentMethodWarnings,
    dateWarnings,
    otherWarnings,
    totalBlocking,
    totalWarnings,
    canProceed: totalBlocking === 0,
  };
}
