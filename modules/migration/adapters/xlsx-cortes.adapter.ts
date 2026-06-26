import ExcelJS from "exceljs";
import type { FileAdapter, AnalysisResult } from "./types";
import { validateFileStructure } from "../validators/file-structure.validator";

function findColumnIndex(sheet: ExcelJS.Worksheet, headerRowNum: number, header: string): number {
  let colIdx = -1;
  sheet.getRow(headerRowNum).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (cell.value?.toString().trim() === header) {
      colIdx = colNumber;
    }
  });
  return colIdx;
}

function extractNameInParentheses(value: string): string | null {
  const match = value.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : null;
}

function cellValueToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "richText" in value) {
    return (value as ExcelJS.CellRichTextValue).richText.map((rt) => rt.text).join("");
  }
  if (typeof value === "object" && "result" in value) {
    const result = (value as ExcelJS.CellFormulaValue).result;
    return result instanceof Date ? result.toISOString() : String(result ?? "");
  }
  return String(value);
}

// Scans Cierre sheet rows for a label like "Apertura #:" and returns the value from column 3.
function findCierreValue(cierreSheet: ExcelJS.Worksheet, labelFragment: string): string | undefined {
  let found: string | undefined;
  cierreSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 15 || found) return;
    const col1 = cellValueToString(row.getCell(1).value).trim().toLowerCase();
    if (col1.includes(labelFragment.toLowerCase())) {
      // Value is in the first non-empty cell after column 2
      for (let c = 3; c <= 8; c++) {
        const val = cellValueToString(row.getCell(c).value).trim();
        if (val.length > 0) {
          found = val;
          break;
        }
      }
    }
  });
  return found;
}

export const xlsxCortesAdapter: FileAdapter = {
  async tryAnalyze(buffer: Buffer, filename: string): Promise<AnalysisResult | null> {
    try {
      const workbook = new ExcelJS.Workbook();
      // exceljs types predate Node.js 20 generic Buffer — cast is safe at runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(buffer as any);

      const validation = validateFileStructure(workbook);
      if (validation.fileType !== "cortes") return null;

      if (!validation.isValid) {
        return {
          filename,
          fileType: "cortes",
          validationStatus: "error",
          recordCount: 0,
          errorMessage: validation.errorMessage,
        };
      }

      const cierreSheet = workbook.getWorksheet("Cierre")!;
      const detectedFolio = findCierreValue(cierreSheet, "apertura #");
      const detectedDate = findCierreValue(cierreSheet, "fecha apertura");

      const ventasSheet = workbook.getWorksheet("Ventas")!;
      const headerRow = validation.headerRow ?? 3;
      const dataStartRow = headerRow + 1;

      const formaPagoColIdx = findColumnIndex(ventasSheet, headerRow, "Forma Pago");
      const inferredUsers = new Set<string>();
      let recordCount = 0;

      ventasSheet.eachRow((row, rowNumber) => {
        if (rowNumber >= dataStartRow) {
          const firstCell = cellValueToString(row.getCell(1).value).trim();
          if (firstCell.length > 0) {
            recordCount++;
            if (formaPagoColIdx > 0) {
              const formaPago = cellValueToString(row.getCell(formaPagoColIdx).value);
              const name = extractNameInParentheses(formaPago);
              if (name) inferredUsers.add(name.toUpperCase());
            }
          }
        }
      });

      const inventarioSheet = workbook.getWorksheet("Inventario")!;
      const skus = new Set<string>();
      // Inventario also has the same row-1-title, row-3-header pattern
      let invDataStart = 2;
      for (let r = 1; r <= 6; r++) {
        const cell1 = cellValueToString(inventarioSheet.getRow(r).getCell(1).value).trim();
        if (cell1 === "Producto") { invDataStart = r + 1; break; }
      }
      inventarioSheet.eachRow((row, rowNumber) => {
        if (rowNumber >= invDataStart) {
          const producto = cellValueToString(row.getCell(1).value).trim();
          if (producto.length > 0) skus.add(producto);
        }
      });

      return {
        filename,
        fileType: "cortes",
        validationStatus: "valid",
        recordCount,
        detectedFolio,
        detectedDate,
        skuCount: skus.size,
        inferredUserCount: inferredUsers.size,
      };
    } catch {
      return null;
    }
  },
};
