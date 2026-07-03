import { classifyReconstructionSeverity } from "../modules/migration/domain/reconstruction-report";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

console.log("\nclassifyReconstructionSeverity");
{
  const green = classifyReconstructionSeverity({
    memberCountMatches: true,
    shiftCountMatches: true,
    orphanCount: 0,
    consistencyWarningCount: 0,
  });
  assert(green === "green", "everything matches, no warnings → green");
}

{
  const amber = classifyReconstructionSeverity({
    memberCountMatches: true,
    shiftCountMatches: true,
    orphanCount: 0,
    consistencyWarningCount: 2,
  });
  assert(amber === "amber", "counts match but financial discrepancies exist → amber");
}

{
  const redCounts = classifyReconstructionSeverity({
    memberCountMatches: false,
    shiftCountMatches: true,
    orphanCount: 0,
    consistencyWarningCount: 0,
  });
  assert(redCounts === "red", "member count mismatch → red, worse than a financial warning");
}

{
  const redShifts = classifyReconstructionSeverity({
    memberCountMatches: true,
    shiftCountMatches: false,
    orphanCount: 0,
    consistencyWarningCount: 0,
  });
  assert(redShifts === "red", "shift count mismatch → red");
}

{
  const redOrphan = classifyReconstructionSeverity({
    memberCountMatches: true,
    shiftCountMatches: true,
    orphanCount: 1,
    consistencyWarningCount: 0,
  });
  assert(redOrphan === "red", "any FK orphan → red, even a single one");
}

{
  const redWins = classifyReconstructionSeverity({
    memberCountMatches: false,
    shiftCountMatches: true,
    orphanCount: 0,
    consistencyWarningCount: 5,
  });
  assert(redWins === "red", "red takes priority over amber when both conditions are present");
}

console.log(`\n──────────────────────────────────────────`);
console.log(`reconstruction-report smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
