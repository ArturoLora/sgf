import { z } from "zod";

// ==================== ZOD SCHEMAS ====================

export const UsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(["ADMIN", "EMPLEADO"]).optional(),
  isActive: z.string().optional(),
});

export const CreateEmployeeInputSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["ADMIN", "EMPLEADO"]),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateEmployeeInputSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").optional(),
  email: z.string().email("Correo inválido").optional(),
  role: z.enum(["ADMIN", "EMPLEADO"]).optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

// ==================== INFERRED TYPES ====================

export type UsersQueryInput = z.infer<typeof UsersQuerySchema>;
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeInputSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeInputSchema>;
