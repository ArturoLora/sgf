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

// Cierre sheet layout has TWO label/value blocks per row: a left block
// (label in col 1, value starting col 3) and, on the same rows, a right
// "FORMAS DE PAGO" block (label in col 6, value in col 8, col 7 repeats the
// label text). Story 1.5 discovered that scanning cols 3–8 as one block
// would sometimes pick up the OTHER block's cell as the "value" — each
// block's value must be read only from its own column range.
function findCierreBlockColumn(
  cierreSheet: ExcelJS.Worksheet,
  labelFragment: string,
  maxScan: number,
): { row: ExcelJS.Row; valueCol: number } | undefined {
  const fragment = labelFragment.toLowerCase();
  let found: { row: ExcelJS.Row; valueCol: number } | undefined;
  cierreSheet.eachRow((row, rowNumber) => {
    if (rowNumber > maxScan || found) return;
    const col1 = cellValueToString(row.getCell(1).value).trim().toLowerCase();
    if (col1.includes(fragment)) {
      found = { row, valueCol: 3 }; // left block: value starts at col 3
      return;
    }
    const col6 = cellValueToString(row.getCell(6).value).trim().toLowerCase();
    if (col6.includes(fragment)) {
      found = { row, valueCol: 8 }; // right block: single value cell at col 8
    }
  });
  return found;
}

// Scans Cierre sheet rows 1–maxScan for a label (case-insensitive contains)
// in either block, returning the first non-empty string value found.
export function findCierreValue(
  cierreSheet: ExcelJS.Worksheet,
  labelFragment: string,
  maxScan = 25,
): string | undefined {
  const match = findCierreBlockColumn(cierreSheet, labelFragment, maxScan);
  if (!match) return undefined;
  const lastCol = match.valueCol === 3 ? 5 : match.valueCol;
  for (let c = match.valueCol; c <= lastCol; c++) {
    const val = cellValueToString(match.row.getCell(c).value).trim();
    if (val.length > 0) return val;
  }
  return undefined;
}

export function findCierreNumber(
  cierreSheet: ExcelJS.Worksheet,
  labelFragment: string,
  maxScan = 25,
): number | undefined {
  const match = findCierreBlockColumn(cierreSheet, labelFragment, maxScan);
  if (!match) return undefined;
  const lastCol = match.valueCol === 3 ? 5 : match.valueCol;
  for (let c = match.valueCol; c <= lastCol; c++) {
    const n = cellValueToNumber(match.row.getCell(c).value);
    if (n !== null) return n;
  }
  return undefined;
}
