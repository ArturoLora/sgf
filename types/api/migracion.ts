import { z } from "zod";

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
