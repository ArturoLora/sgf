import { z } from "zod";

// ==================== ZOD SCHEMAS ====================

export const UsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(["ADMIN", "EMPLEADO"]).optional(),
  isActive: z.string().optional(),
});

// ==================== INFERRED TYPES ====================

export type UsersQueryInput = z.infer<typeof UsersQuerySchema>;
