// Contract for all format-specific adapters.
//
// Extensibility guarantee (AD-1): to support a new source format (XML, CSV, etc.),
// implement FileAdapter and add the instance to the ADAPTERS array in migration.service.ts.
// No other file needs to change — not the service, not the UI, not the API route.

import type { CanonicalFile } from "../domain/canonical.types";

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
  // Structural analysis only — fast, no content parsing (Story 1.1).
  // Returns null if this adapter does not recognize the file structure.
  tryAnalyze(buffer: Buffer, filename: string): Promise<AnalysisResult | null>;
  // Full content parse — builds complete CanonicalFile with all rows (Story 1.2+).
  // Returns null if this adapter does not recognize the file.
  tryParse(buffer: Buffer, filename: string): Promise<CanonicalFile | null>;
}
