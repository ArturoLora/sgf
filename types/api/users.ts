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

export const SetEmployeeActiveInputSchema = z.object({
  isActive: z.boolean(),
});

// Story 3.5: reinicio de contraseña por ADMIN. min(6) es defensa de borde
// (mismo criterio que CreateEmployeeInputSchema) — Better Auth (setUserPassword)
// también valida minPasswordLength internamente; el service no reimplementa
// esa regla, solo traduce el error real si de todos modos llegara a violarla.
export const ResetPasswordInputSchema = z.object({
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// ==================== INFERRED TYPES ====================

export type UsersQueryInput = z.infer<typeof UsersQuerySchema>;
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeInputSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeInputSchema>;
export type SetEmployeeActiveInput = z.infer<typeof SetEmployeeActiveInputSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;
