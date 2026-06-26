import ExcelJS from "exceljs";

export interface StructureValidationResult {
  isValid: boolean;
  fileType: "socios" | "cortes" | null;
  headerRow?: number; // 1-based row index where column headers were found
  errorMessage?: string;
}

const SOCIOS_REQUIRED_SHEET = "SOCIOS";
const SOCIOS_REQUIRED_COLUMNS = ["Codigo Socio", "Socio", "Telefonos"];

const CORTES_REQUIRED_SHEETS = ["Cierre", "Ventas", "Inventario"];
const VENTAS_REQUIRED_COLUMNS = ["# Ticket", "Fecha Venta", "Descripcion", "Forma Pago"];

// Historical files have: row 1 = merged title, row 2 = empty, row 3 = column headers.
// This scans up to MAX_SCAN_ROWS to find the header row robustly.
const MAX_SCAN_ROWS = 6;

function findHeaderRow(
  sheet: ExcelJS.Worksheet,
  requiredColumns: string[]
): number | null {
  for (let r = 1; r <= MAX_SCAN_ROWS; r++) {
    const rowValues: string[] = [];
    sheet.getRow(r).eachCell({ includeEmpty: false }, (cell) => {
      const val = cell.value?.toString().trim() ?? "";
      if (val) rowValues.push(val);
    });
    const hasAll = requiredColumns.every((col) => rowValues.includes(col));
    if (hasAll) return r;
  }
  return null;
}

export function validateFileStructure(workbook: ExcelJS.Workbook): StructureValidationResult {
  const sheetNames = workbook.worksheets.map((ws) => ws.name);

  if (sheetNames.includes(SOCIOS_REQUIRED_SHEET)) {
    const sheet = workbook.getWorksheet(SOCIOS_REQUIRED_SHEET)!;
    const headerRow = findHeaderRow(sheet, SOCIOS_REQUIRED_COLUMNS);
    if (headerRow !== null) {
      return { isValid: true, fileType: "socios", headerRow };
    }
    return {
      isValid: false,
      fileType: null,
      errorMessage: `Hoja SOCIOS encontrada pero faltan columnas requeridas (${SOCIOS_REQUIRED_COLUMNS.join(", ")})`,
    };
  }

  const missingSheets = CORTES_REQUIRED_SHEETS.filter((s) => !sheetNames.includes(s));
  if (missingSheets.length === 0) {
    const ventasSheet = workbook.getWorksheet("Ventas")!;
    const headerRow = findHeaderRow(ventasSheet, VENTAS_REQUIRED_COLUMNS);
    if (headerRow !== null) {
      return { isValid: true, fileType: "cortes", headerRow };
    }
    return {
      isValid: false,
      fileType: null,
      errorMessage: `Hoja Ventas encontrada pero faltan columnas requeridas (${VENTAS_REQUIRED_COLUMNS.join(", ")})`,
    };
  }

  return {
    isValid: false,
    fileType: null,
    errorMessage: `Archivo no reconocido: no contiene las hojas esperadas (SOCIOS o Cierre/Ventas/Inventario)`,
  };
}
