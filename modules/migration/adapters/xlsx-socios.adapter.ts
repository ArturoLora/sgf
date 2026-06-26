import ExcelJS from "exceljs";
import type { FileAdapter, AnalysisResult } from "./types";
import { validateFileStructure } from "../validators/file-structure.validator";

export const xlsxSociosAdapter: FileAdapter = {
  async tryAnalyze(buffer: Buffer, filename: string): Promise<AnalysisResult | null> {
    try {
      const workbook = new ExcelJS.Workbook();
      // exceljs types predate Node.js 20 generic Buffer — cast is safe at runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(buffer as any);

      const validation = validateFileStructure(workbook);
      if (validation.fileType !== "socios") return null;

      if (!validation.isValid) {
        return {
          filename,
          fileType: "socios",
          validationStatus: "error",
          recordCount: 0,
          errorMessage: validation.errorMessage,
        };
      }

      const sheet = workbook.getWorksheet("SOCIOS")!;
      const dataStartRow = (validation.headerRow ?? 1) + 1;
      let recordCount = 0;

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber >= dataStartRow) {
          const firstCell = row.getCell(1).value;
          if (firstCell !== null && firstCell !== undefined && String(firstCell).trim() !== "") {
            recordCount++;
          }
        }
      });

      return {
        filename,
        fileType: "socios",
        validationStatus: "valid",
        recordCount,
      };
    } catch {
      return null;
    }
  },
};
