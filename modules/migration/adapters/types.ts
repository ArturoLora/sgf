// Contract for all format-specific adapters.
//
// Extensibility guarantee (AD-1): to support a new source format (XML, CSV, etc.),
// implement FileAdapter and add the instance to the ADAPTERS array in migration.service.ts.
// No other file needs to change — not the service, not the UI, not the API route.

export type ValidationStatus = "valid" | "unknown" | "error";

export interface AnalysisResult {
  filename: string;
  fileType: "socios" | "cortes" | "unknown";
  validationStatus: ValidationStatus;
  recordCount: number;
  detectedFolio?: string;
  detectedDate?: string;
  skuCount?: number;
  inferredUserCount?: number;
  errorMessage?: string;
}

export interface FileAdapter {
  // Returns null if this adapter does not recognize the file structure.
  // Returns AnalysisResult if it does (valid or with errors).
  tryAnalyze(buffer: Buffer, filename: string): Promise<AnalysisResult | null>;
}
