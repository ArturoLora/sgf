// Shared Excel cell-reading utilities for xlsx adapters.
// These are format-translation helpers — no domain logic.

import ExcelJS from "exceljs";

export function cellValueToString(value: ExcelJS.CellValue): string {
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

export function cellValueToNumber(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return isFinite(value) ? value : null;
  if (typeof value === "object" && "result" in value) {
    return cellValueToNumber((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
  }
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/,/g, ""));
    return isNaN(n) ? null : n;
  }
  return null;
}

// For date-valued cells: returns ISO string for Date, raw string for strings, null otherwise.
export function cellDateToRaw(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value.toISOString();
  const s = cellValueToString(value).trim();
  return s || null;
}

// Converts a Date representing an Excel time serial (1899-12-30 base) to "HH:mm".
export function cellTimeToString(value: ExcelJS.CellValue): string | null {
  if (!(value instanceof Date)) return null;
  const h = String(value.getHours()).padStart(2, "0");
  const m = String(value.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// Builds a column-name → column-index map from a header row.
export function buildColumnMap(
  sheet: ExcelJS.Worksheet,
  headerRowNum: number,
): Record<string, number> {
  const map: Record<string, number> = {};
  sheet.getRow(headerRowNum).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const val = cell.value?.toString().trim() ?? "";
    if (val) map[val] = colNumber;
  });
  return map;
}

// Scans rows 1–maxScan looking for a row that contains the markerColumn value.
// Returns the row number if found, null otherwise.
export function findScanRow(
  sheet: ExcelJS.Worksheet,
  markerColumn: string,
  maxScan = 6,
): number | null {
  for (let r = 1; r <= maxScan; r++) {
    let found = false;
    sheet.getRow(r).eachCell({ includeEmpty: false }, (cell) => {
      if (cell.value?.toString().trim() === markerColumn) found = true;
    });
    if (found) return r;
  }
  return null;
}

// Scans Cierre sheet rows 1–maxScan for a label (case-insensitive contains),
// then returns the numeric value from the first non-empty cell in columns 3–8.
export function findCierreValue(
  cierreSheet: ExcelJS.Worksheet,
  labelFragment: string,
  maxScan = 25,
): string | undefined {
  let found: string | undefined;
  cierreSheet.eachRow((row, rowNumber) => {
    if (rowNumber > maxScan || found) return;
    const col1 = cellValueToString(row.getCell(1).value).trim().toLowerCase();
    if (col1.includes(labelFragment.toLowerCase())) {
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

export function findCierreNumber(
  cierreSheet: ExcelJS.Worksheet,
  labelFragment: string,
  maxScan = 25,
): number | undefined {
  let found: number | undefined;
  cierreSheet.eachRow((row, rowNumber) => {
    if (rowNumber > maxScan || found !== undefined) return;
    const col1 = cellValueToString(row.getCell(1).value).trim().toLowerCase();
    if (col1.includes(labelFragment.toLowerCase())) {
      for (let c = 3; c <= 8; c++) {
        const n = cellValueToNumber(row.getCell(c).value);
        if (n !== null) { found = n; break; }
      }
    }
  });
  return found;
}
