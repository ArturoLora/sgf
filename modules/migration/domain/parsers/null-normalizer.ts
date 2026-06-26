// Pure null-normalization helpers for optional contact fields.

// Values that mean "no phone number" in the historical xlsx.
// Checked lowercase + trimmed.
const PHONE_NULL_SET = new Set(["", "na", "n/a", "n", "0", "000", "ninguno"]);

export function normalizePhone(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const lower = raw.trim().toLowerCase();
  if (PHONE_NULL_SET.has(lower)) return null;
  if (lower.startsWith("sin ")) return null;
  return raw.trim() || null;
}

// Any email string without "@" is treated as absent (garbage value from the xlsx).
export function normalizeEmail(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (!trimmed || !trimmed.includes("@")) return null;
  return trimmed.toLowerCase();
}
