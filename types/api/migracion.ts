import { z } from "zod";

// ─── Story 1.1: analysis response ────────────────────────────────────────────

export const AnalysisResultSchema = z.object({
  filename: z.string(),
  fileType: z.enum(["socios", "cortes", "unknown"]),
  validationStatus: z.enum(["valid", "unknown", "error"]),
  recordCount: z.number(),
  detectedFolio: z.string().optional(),
  detectedDate: z.string().optional(),
  skuCount: z.number().optional(),
  inferredUserCount: z.number().optional(),
  errorMessage: z.string().optional(),
});

export const AnalysisResponseSchema = z.array(AnalysisResultSchema);

export type AnalysisResultType = z.infer<typeof AnalysisResultSchema>;
export type AnalysisResponseType = z.infer<typeof AnalysisResponseSchema>;

// ─── Story 1.2: preview response ─────────────────────────────────────────────

export const ParseWarningSchema = z.object({
  filename: z.string(),
  row: z.number().optional(),
  field: z.string(),
  originalValue: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export const MemberPreviewSchema = z.object({
  memberNumber: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  birthDate: z.string().nullable(),       // ISO string
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  membershipType: z.string().nullable(),
  membershipDescription: z.string().nullable(),
  paymentMethodFromMembership: z.string().nullable(),
  totalVisits: z.number(),
  lastVisit: z.string().nullable(),
  isActive: z.boolean(),
});

export const ShiftPreviewSchema = z.object({
  folio: z.string(),
  openingDate: z.string().nullable(),
  openingTime: z.string().nullable(),
  closingTime: z.string().nullable(),
  saleCount: z.number(),
  cancelledCount: z.number(),
  membershipSaleCount: z.number(),
  inventoryCount: z.number(),
  withdrawalCount: z.number(),
  legacyNotes: z.string().nullable(),
});

export const PreviewResponseSchema = z.object({
  members: z.array(MemberPreviewSchema),
  shifts: z.array(ShiftPreviewSchema),
  warnings: z.array(ParseWarningSchema),
  membershipTypeDistribution: z.record(z.string(), z.number()),
  totalWarnings: z.number(),
  sellerNames: z.array(z.string()),
});

export type ParseWarningType = z.infer<typeof ParseWarningSchema>;
export type MemberPreviewType = z.infer<typeof MemberPreviewSchema>;
export type ShiftPreviewType = z.infer<typeof ShiftPreviewSchema>;
export type PreviewResponseType = z.infer<typeof PreviewResponseSchema>;

// ─── Story 1.3: user list for employee mapping ────────────────────────────────

export const UserRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export const UserListResponseSchema = z.array(UserRefSchema);

export type UserRefType = z.infer<typeof UserRefSchema>;
export type UserListResponseType = z.infer<typeof UserListResponseSchema>;

// ─── Story 1.4: sync members result ──────────────────────────────────────────

export const SyncMembersResultSchema = z.object({
  created: z.number(),
  updated: z.number(),
  failed: z.number(),
  errors: z.array(
    z.object({ memberNumber: z.string(), reason: z.string() }),
  ),
});

export type SyncMembersResultType = z.infer<typeof SyncMembersResultSchema>;

// ─── Story 1.5: sync shifts result ────────────────────────────────────────────

export const EmployeeMappingSchema = z.record(z.string(), z.string());

export type EmployeeMappingType = z.infer<typeof EmployeeMappingSchema>;

export const SyncShiftsResultSchema = z.object({
  shiftsCreated: z.number(),
  shiftsUpdated: z.number(),
  shiftsFailed: z.number(),
  movementsCreated: z.number(),
  salesMovements: z.number(),
  adjustmentMovements: z.number(),
  entryMovements: z.number(),
  withdrawalsCreated: z.number(),
  warnings: z.array(z.object({ folio: z.string(), message: z.string() })),
  errors: z.array(z.object({ folio: z.string(), reason: z.string() })),
});

export type SyncShiftsResultType = z.infer<typeof SyncShiftsResultSchema>;

// ─── Story 1.6: post-import finalization ──────────────────────────────────────

export const FinalizeSyncResultSchema = z.object({
  gymStockUpdated: z.number(),
  gymStockSkipped: z.boolean(),
  gymStockSkipReason: z.string().nullable(),
  maxTicketImported: z.string().nullable(),
  consistencyWarnings: z.array(z.string()),
});

export type FinalizeSyncResultType = z.infer<typeof FinalizeSyncResultSchema>;

export const SyncShiftsResponseSchema = SyncShiftsResultSchema.extend({
  finalize: FinalizeSyncResultSchema,
});

export type SyncShiftsResponseType = z.infer<typeof SyncShiftsResponseSchema>;
