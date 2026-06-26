import ExcelJS from "exceljs";
import type { FileAdapter, AnalysisResult } from "./types";
import type { CanonicalFile, CanonicalMember } from "../domain/canonical.types";
import { validateFileStructure } from "../validators/file-structure.validator";
import {
  cellValueToString,
  cellValueToNumber,
  cellDateToRaw,
  buildColumnMap,
} from "./xlsx-cell-utils";

// exceljs types predate Node.js 20 generic Buffer — cast is safe at runtime
type AnyBuffer = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as unknown as AnyBuffer);
  return wb;
}

export const xlsxSociosAdapter: FileAdapter = {
  // ── Story 1.1: structural analysis only ──────────────────────────────────────
  async tryAnalyze(buffer: Buffer, filename: string): Promise<AnalysisResult | null> {
    try {
      const workbook = await loadWorkbook(buffer);
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

      return { filename, fileType: "socios", validationStatus: "valid", recordCount };
    } catch {
      return null;
    }
  },

  // ── Story 1.2: full content parse ─────────────────────────────────────────────
  async tryParse(buffer: Buffer, filename: string): Promise<CanonicalFile | null> {
    try {
      const workbook = await loadWorkbook(buffer);
      const validation = validateFileStructure(workbook);
      if (validation.fileType !== "socios" || !validation.isValid) return null;

      const sheet = workbook.getWorksheet("SOCIOS")!;
      const headerRow = validation.headerRow!;
      const cols = buildColumnMap(sheet, headerRow);

      const col = (name: string, fallback: number) => cols[name] ?? fallback;

      const members: CanonicalMember[] = [];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRow) return;
        const codigoSocio = cellValueToString(row.getCell(col("Codigo Socio", 1)).value).trim();
        if (!codigoSocio) return;

        members.push({
          codigoSocio,
          nombre: cellValueToString(row.getCell(col("Socio", 2)).value).trim(),
          telefono: cellValueToString(row.getCell(col("Telefonos", 3)).value).trim() || null,
          correo: cellValueToString(row.getCell(col("Correo Electronico", 4)).value).trim() || null,
          codigoPostal: cellValueToString(row.getCell(col("Codigo Postal", 5)).value).trim() || null,
          // Dates come as Date objects from exceljs — serialize to ISO for the canonical model
          fechaNacimiento: cellDateToRaw(row.getCell(col("Fecha Nacimiento", 6)).value),
          membresia: cellValueToString(row.getCell(col("Membresia", 7)).value).trim() || null,
          fechaInicio: cellDateToRaw(row.getCell(col("Fecha Inicio", 8)).value),
          fechaVencimiento: cellDateToRaw(row.getCell(col("Fecha Vencimiento", 9)).value),
          totalVisitas: cellValueToNumber(row.getCell(col("Total Visitas", 10)).value),
          visitasUltimoMes: cellValueToNumber(row.getCell(col("Visitas Ultimo Mes", 11)).value),
          visitasUltimaSemana: cellValueToNumber(row.getCell(col("Visitas Ultima Semana", 12)).value),
          ultimaVisita: cellDateToRaw(row.getCell(col("Ultima Visita", 13)).value),
          diasFalta: cellValueToNumber(row.getCell(col("Dias Falta", 14)).value),
          ultimoPago: cellDateToRaw(row.getCell(col("Ultimo Pago", 15)).value),
        });
      });

      return { type: "socios", members };
    } catch {
      return null;
    }
  },
};
