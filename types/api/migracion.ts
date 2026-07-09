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

// ─── Story de batching: detalle completo de shift para transporte interno ────
// Superset de ShiftPreviewSchema — la UI sigue leyendo solo los campos de
// resumen; estos campos adicionales existen para que sync-shifts/ejecutar
// reciban el DomainShift completo sin volver a subir/parsear archivos.

export const SaleDetailSchema = z.object({
  ticket: z.string(),
  saleDate: z.string().nullable(), // ISO string — requiere rehidratación a Date
  memberNumber: z.string().nullable(),
  memberName: z.string().nullable(),
  description: z.string(),
  paymentMethod: z.string().nullable(),
  sellerName: z.string().nullable(),
  price: z.number(),
  discount: z.number(),
  surcharge: z.number(),
  isCancelled: z.boolean(),
  isMembership: z.boolean(),
});

export const InventoryRowDetailSchema = z.object({
  productName: z.string(),
  gymStock: z.number(),
  warehouseStock: z.number(),
  adjustment: z.number(),
  entries: z.number(),
});

export const WithdrawalDetailSchema = z.object({
  withdrawalDate: z.string().nullable(), // ISO string — requiere rehidratación a Date
  concept: z.string(),
  amount: z.number(),
});

export const ShiftDetailSchema = ShiftPreviewSchema.extend({
  cashierName: z.string().nullable(),
  sales: z.array(SaleDetailSchema),
  inventory: z.array(InventoryRowDetailSchema),
  withdrawals: z.array(WithdrawalDetailSchema),
  initialCash: z.number(),
  ticketCount: z.number(),
  membershipSales: z.number(),
  productSales0Tax: z.number(),
  productSales16Tax: z.number(),
  subtotal: z.number(),
  tax: z.number(),
  totalSales: z.number(),
  cashAmount: z.number(),
  debitCardAmount: z.number(),
  creditCardAmount: z.number(),
  totalVoucher: z.number(),
  totalWithdrawalsAmount: z.number(),
  totalCash: z.number(),
});

export const PreviewResponseSchema = z.object({
  members: z.array(MemberPreviewSchema),
  shifts: z.array(ShiftDetailSchema),
  warnings: z.array(ParseWarningSchema),
  membershipTypeDistribution: z.record(z.string(), z.number()),
  totalWarnings: z.number(),
  sellerNames: z.array(z.string()),
});

export type ParseWarningType = z.infer<typeof ParseWarningSchema>;
export type MemberPreviewType = z.infer<typeof MemberPreviewSchema>;
export type ShiftPreviewType = z.infer<typeof ShiftPreviewSchema>;
export type SaleDetailType = z.infer<typeof SaleDetailSchema>;
export type InventoryRowDetailType = z.infer<typeof InventoryRowDetailSchema>;
export type WithdrawalDetailType = z.infer<typeof WithdrawalDetailSchema>;
export type ShiftDetailType = z.infer<typeof ShiftDetailSchema>;
export type PreviewResponseType = z.infer<typeof PreviewResponseSchema>;

// ─── Story 1.3: user list for employee mapping ────────────────────────────────

export const UserRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["ADMIN", "EMPLEADO"]),
  isActive: z.boolean(),
});

export const UserListResponseSchema = z.array(UserRefSchema);

export type UserRefType = z.infer<typeof UserRefSchema>;
export type UserListResponseType = z.infer<typeof UserListResponseSchema>;

// ─── Ciclo de vida de empleados en Reconstruction ──────────────────────────────

// El cliente NO puede enviar role/email/password — se fijan server-side
// (ver modules/migration/employee-lifecycle.service.ts).
export const CreateHistoricalEmployeeInputSchema = z.object({
  historicalName: z.string().min(1),
});

export type CreateHistoricalEmployeeInputType = z.infer<
  typeof CreateHistoricalEmployeeInputSchema
>;

export const DeletionCandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  shiftsCount: z.number(),
  movementsCount: z.number(),
  withdrawalsCount: z.number(),
});

export type DeletionCandidateType = z.infer<typeof DeletionCandidateSchema>;

export const DeletionCandidatesResponseSchema = z.array(DeletionCandidateSchema);

export const DeletionCandidatesRequestSchema = z.object({
  employeeMapping: z.record(z.string(), z.string()),
});

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

// ─── Story 2.1: reconstruction mode — preview and backup ──────────────────────

export const ReconstructionPreviewSchema = z.object({
  membersToDelete: z.number(),
  shiftsToDelete: z.number(),
  movementsToDelete: z.number(),
  withdrawalsToDelete: z.number(),
  usersToPreserve: z.number(),
});

export type ReconstructionPreviewType = z.infer<typeof ReconstructionPreviewSchema>;

export const PgDumpAvailabilitySchema = z.object({
  available: z.boolean(),
  reason: z.string().nullable(),
});

export type PgDumpAvailabilityType = z.infer<typeof PgDumpAvailabilitySchema>;

export const BackupResultSchema = z.object({
  filePath: z.string(),
  fileSizeBytes: z.number(),
  restoreCommand: z.string(),
});

export type BackupResultType = z.infer<typeof BackupResultSchema>;

export const SyncShiftsResponseSchema = SyncShiftsResultSchema.extend({
  finalize: FinalizeSyncResultSchema,
});

export type SyncShiftsResponseType = z.infer<typeof SyncShiftsResponseSchema>;

// ─── Story 2.2: reconstruction execution ──────────────────────────────────────

export const DeleteOperationalDataResultSchema = z.object({
  cashWithdrawalsDeleted: z.number(),
  movementsDeleted: z.number(),
  shiftsDeleted: z.number(),
  membersDeleted: z.number(),
});

export const ProductResetResultSchema = z.object({
  productsRecreated: z.number(),
  taxRatesPreserved: z.number(),
});

// Story D2: salePrice restoration after Reconstruction reimports the catalog.
export const ProductPricingResultSchema = z.object({
  productsPriced: z.number(),
  productsLeftAtZero: z.number(),
});

// Ciclo de vida de empleados: eliminación de usersToDelete vía Better Auth.
export const EmployeeRemovalResultSchema = z.object({
  requested: z.number(),
  removed: z.number(),
});

export const ReconstructionPhaseSchema = z.enum([
  "validation",
  "delete",
  "employees",
  "products",
  "members",
  "shifts",
  "pricing",
  "finalize",
]);

export const ReconstructionExecutionResultSchema = z.object({
  success: z.boolean(),
  failedPhase: ReconstructionPhaseSchema.nullable(),
  failureMessage: z.string().nullable(),
  deleteResult: DeleteOperationalDataResultSchema.nullable(),
  employeeRemovalResult: EmployeeRemovalResultSchema.nullable(),
  productResult: ProductResetResultSchema.nullable(),
  membersResult: SyncMembersResultSchema.nullable(),
  shiftsResult: SyncShiftsResultSchema.nullable(),
  pricingResult: ProductPricingResultSchema.nullable(),
  finalizeResult: FinalizeSyncResultSchema.nullable(),
  finalizeWarning: z.string().nullable(),
});

export type ReconstructionExecutionResultType = z.infer<typeof ReconstructionExecutionResultSchema>;

// ─── Story 2.3: post-reconstruction validation and report ─────────────────────

export const ReconstructionSeveritySchema = z.enum(["green", "amber", "red"]);

export const ReconstructionValidationSchema = z.object({
  actualMembers: z.number(),
  expectedMembers: z.number(),
  memberCountMatches: z.boolean(),
  actualShifts: z.number(),
  expectedShifts: z.number(),
  shiftCountMatches: z.boolean(),
  orphanCount: z.number(),
  orphanDetails: z.array(z.string()),
  severity: ReconstructionSeveritySchema,
});

export type ReconstructionValidationType = z.infer<typeof ReconstructionValidationSchema>;
