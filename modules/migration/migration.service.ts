import type { AnalysisResult, FileAdapter } from "./adapters/types";
import { xlsxSociosAdapter } from "./adapters/xlsx-socios.adapter";
import { xlsxCortesAdapter } from "./adapters/xlsx-cortes.adapter";

// Registry: add new format adapters here — no other file needs to change. (AD-1)
const ADAPTERS: FileAdapter[] = [xlsxSociosAdapter, xlsxCortesAdapter];

export async function analyzeFile(
  buffer: Buffer,
  filename: string
): Promise<AnalysisResult> {
  for (const adapter of ADAPTERS) {
    const result = await adapter.tryAnalyze(buffer, filename);
    if (result !== null) return result;
  }
  return {
    filename,
    fileType: "unknown",
    validationStatus: "unknown",
    recordCount: 0,
    errorMessage:
      "Archivo no reconocido: no contiene las hojas esperadas (SOCIOS o Cierre/Ventas/Inventario)",
  };
}

export async function analyzeFiles(
  files: Array<{ buffer: Buffer; filename: string }>
): Promise<AnalysisResult[]> {
  return Promise.all(files.map(({ buffer, filename }) => analyzeFile(buffer, filename)));
}

export const MigrationService = { analyzeFile, analyzeFiles };
