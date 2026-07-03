// Pure helper — no Prisma, no I/O. Story 2.3: classifies the severity of a
// post-reconstruction validation report. Purely diagnostic — nothing here
// reverts or modifies data; the reconstruction (Story 2.2) already committed
// before this ever runs.

export type ReconstructionSeverity = "green" | "amber" | "red";

export interface ReconstructionSeverityInput {
  memberCountMatches: boolean;
  shiftCountMatches: boolean;
  orphanCount: number;
  consistencyWarningCount: number;
}

// Red: count mismatch or any FK orphan — both qualitatively worse than a
// per-shift financial rounding difference (H4). Structurally, orphanCount
// should always be 0 given real Postgres FK constraints (H2) — if it's ever
// > 0, that's a data-corruption signal, not a routine warning.
// Amber: everything reconciles except per-shift financial discrepancies
// already surfaced by compareShiftTotals()/finalizeSyncMode() (H1) — reused,
// not recomputed here.
// Green: no discrepancy of any kind.
export function classifyReconstructionSeverity(input: ReconstructionSeverityInput): ReconstructionSeverity {
  if (!input.memberCountMatches || !input.shiftCountMatches || input.orphanCount > 0) {
    return "red";
  }
  if (input.consistencyWarningCount > 0) {
    return "amber";
  }
  return "green";
}
