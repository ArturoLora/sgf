import ExcelJS from "exceljs";
import type { FileAdapter, AnalysisResult } from "./types";
import type {
  CanonicalFile,
  CanonicalSale,
  CanonicalInventoryRow,
  CanonicalWithdrawal,
  CanonicalShift,
} from "../domain/canonical.types";
import { validateFileStructure } from "../validators/file-structure.validator";
import {
  cellValueToString,
  cellValueToNumber,
  cellTimeToString,
  buildColumnMap,
  findScanRow,
  findCierreValue,
  findCierreNumber,
} from "./xlsx-cell-utils";

// exceljs types predate Node.js 20 generic Buffer — cast is safe at runtime
type AnyBuffer = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as unknown as AnyBuffer);
  return wb;
}

function findColumnIndex(sheet: ExcelJS.Worksheet, headerRowNum: number, header: string): number {
  let idx = -1;
  sheet.getRow(headerRowNum).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (cell.value?.toString().trim() === header) idx = colNumber;
  });
  return idx;
}

function extractNameInParentheses(value: string): string | null {
  const match = value.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : null;
}

// ── Story 1.1 helpers (unchanged) ────────────────────────────────────────────

export const xlsxCortesAdapter: FileAdapter = {
  async tryAnalyze(buffer: Buffer, filename: string): Promise<AnalysisResult | null> {
    try {
      const workbook = await loadWorkbook(buffer);
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

  // ── Story 1.2: full content parse ─────────────────────────────────────────────
  async tryParse(buffer: Buffer, filename: string): Promise<CanonicalFile | null> {
    try {
      const workbook = await loadWorkbook(buffer);
      const validation = validateFileStructure(workbook);
      if (validation.fileType !== "cortes" || !validation.isValid) return null;

      const cierreSheet = workbook.getWorksheet("Cierre")!;
      const folio = findCierreValue(cierreSheet, "apertura #") ?? "";
      const fechaApertura = findCierreValue(cierreSheet, "fecha apertura") ?? null;
      const cajero = findCierreValue(cierreSheet, "cajero") ?? null;

      // Time values — exceljs returns as Date with 1899-12-30 base
      const horaInicioRaw = cierreSheet.getRow(
        findCierreRowForLabel(cierreSheet, "hora inicio") ?? 0,
      ).getCell(3).value;
      const horaFinRaw = cierreSheet.getRow(
        findCierreRowForLabel(cierreSheet, "hora fin") ?? 0,
      ).getCell(3).value;

      const horaInicio = cellTimeToString(horaInicioRaw) ??
        (horaInicioRaw ? cellValueToString(horaInicioRaw) : null);
      const horaFin = cellTimeToString(horaFinRaw) ??
        (horaFinRaw ? cellValueToString(horaFinRaw) : null);

      // Legacy Cierre summary rows
      const ventasAnticipo = findCierreNumber(cierreSheet, "ventas anticipo");
      const comisionAPagar = findCierreNumber(cierreSheet, "comision a pagar");
      const totalVentasWeb = findCierreNumber(cierreSheet, "total ventas web");

      // Ventas
      const ventasSheet = workbook.getWorksheet("Ventas")!;
      const ventasHeaderRow = validation.headerRow ?? 3;
      const ventasCols = buildColumnMap(ventasSheet, ventasHeaderRow);
      const ventas = readSalesSheet(ventasSheet, ventasHeaderRow, ventasCols, false);

      // Canceladas (optional separate sheet)
      const canceladasSheet = workbook.getWorksheet("Canceladas");
      let canceladas: CanonicalSale[] = [];
      if (canceladasSheet) {
        const cancelHdr = findScanRow(canceladasSheet, "# Ticket") ?? ventasHeaderRow;
        const cancelCols = buildColumnMap(canceladasSheet, cancelHdr);
        canceladas = readSalesSheet(canceladasSheet, cancelHdr, cancelCols, true);
      }

      // Inventario
      const inventarioSheet = workbook.getWorksheet("Inventario")!;
      const invHdrRow = findScanRow(inventarioSheet, "Producto") ?? 3;
      const invCols = buildColumnMap(inventarioSheet, invHdrRow);
      const inventario = readInventarioSheet(inventarioSheet, invHdrRow, invCols);

      // Retiros (optional)
      const retirosSheet = workbook.getWorksheet("Retiros");
      let retiros: CanonicalWithdrawal[] = [];
      if (retirosSheet) {
        const retHdrRow = findScanRow(retirosSheet, "Folio") ??
          findScanRow(retirosSheet, "Concepto") ?? 3;
        const retCols = buildColumnMap(retirosSheet, retHdrRow);
        retiros = readRetirosSheet(retirosSheet, retHdrRow, retCols);
      }

      const shift: CanonicalShift = {
        folio,
        fechaApertura,
        horaInicio: horaInicio || null,
        horaFin: horaFin || null,
        cajero,
        ventas,
        canceladas,
        inventario,
        retiros,
        ventasAnticipo,
        comisionAPagar,
        totalVentasWeb,
      };

      return { type: "cortes", shift };
    } catch {
      return null;
    }
  },
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function findCierreRowForLabel(sheet: ExcelJS.Worksheet, label: string): number | null {
  let found: number | null = null;
  sheet.eachRow((row, r) => {
    if (r > 25 || found !== null) return;
    const col1 = cellValueToString(row.getCell(1).value).trim().toLowerCase();
    if (col1.includes(label.toLowerCase())) found = r;
  });
  return found;
}

function readSalesSheet(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  cols: Record<string, number>,
  isCancelled: boolean,
): CanonicalSale[] {
  const c = (name: string, fb: number) => cols[name] ?? fb;
  const sales: CanonicalSale[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const ticket = cellValueToString(row.getCell(c("# Ticket", 1)).value).trim();
    if (!ticket) return;

    sales.push({
      ticket,
      fechaVenta: cellValueToString(row.getCell(c("Fecha Venta", 2)).value).trim() || null,
      numSocio: cellValueToString(row.getCell(c("Num Socio", 3)).value).trim() || null,
      socio: cellValueToString(row.getCell(c("Socio", 4)).value).trim() || null,
      descripcion: cellValueToString(row.getCell(c("Descripcion", 5)).value).trim(),
      formaPago: cellValueToString(row.getCell(c("Forma Pago", 6)).value).trim() || null,
      precio: cellValueToNumber(row.getCell(c("Precio", 7)).value) ?? 0,
      descuento: cellValueToNumber(row.getCell(c("Descuento", 8)).value) ?? 0,
      cargo: cellValueToNumber(row.getCell(c("Cargo", 9)).value) ?? 0,
      isCancelled,
    });
  });

  return sales;
}

function readInventarioSheet(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  cols: Record<string, number>,
): CanonicalInventoryRow[] {
  const c = (name: string, fb: number) => cols[name] ?? fb;
  const rows: CanonicalInventoryRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const producto = cellValueToString(row.getCell(c("Producto", 1)).value).trim();
    if (!producto) return;

    rows.push({
      producto,
      existenciaAnterior: cellValueToNumber(row.getCell(c("Existencia Anterior", 2)).value) ?? 0,
      ajuste: cellValueToNumber(row.getCell(c("Ajuste", 3)).value) ?? 0,
      existenciaInicial: cellValueToNumber(row.getCell(c("Existencia Inicial", 4)).value) ?? 0,
      entradas: cellValueToNumber(row.getCell(c("Entradas", 5)).value) ?? 0,
      salidas: cellValueToNumber(row.getCell(c("Salidas", 6)).value) ?? 0,
      existenciaActual: cellValueToNumber(row.getCell(c("Existencia Actual", 7)).value) ?? 0,
    });
  });

  return rows;
}

function readRetirosSheet(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  cols: Record<string, number>,
): CanonicalWithdrawal[] {
  const c = (name: string, fb: number) => cols[name] ?? fb;
  const withdrawals: CanonicalWithdrawal[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const folio = cellValueToString(row.getCell(c("Folio", 1)).value).trim();
    const concepto = cellValueToString(row.getCell(c("Concepto", 3)).value).trim();
    if (!folio && !concepto) return;

    withdrawals.push({
      folio: folio || "-",
      fechaRetiro: cellValueToString(row.getCell(c("Fecha Retiro", 2)).value).trim() || null,
      concepto: concepto || "-",
      efectivo: cellValueToNumber(row.getCell(c("Efectivo", 4)).value) ?? 0,
    });
  });

  return withdrawals;
}
