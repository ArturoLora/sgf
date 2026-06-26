// Pure interfaces — no dependencies, no imports.
// All format adapters translate TO these types.
// Business logic (service layer) depends ONLY on these — never on xlsx/xml/csv details. (AD-1)

export interface CanonicalMember {
  codigoSocio: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  codigoPostal: string | null;
  fechaNacimiento: string | null; // raw string — parsed in Story 1.2
  membresia: string | null;       // raw string — parsed in Story 1.2
  fechaInicio: string | null;
  fechaVencimiento: string | null;
  totalVisitas: number | null;
  visitasUltimoMes: number | null;
  visitasUltimaSemana: number | null;
  ultimaVisita: string | null;
  diasFalta: number | null;
  ultimoPago: string | null;
}

export interface CanonicalSale {
  ticket: string;
  fechaVenta: string | null; // raw string — parsed in Story 1.2
  numSocio: string | null;
  socio: string | null;
  descripcion: string;
  formaPago: string | null; // raw "MÉTODO (NOMBRE)" — parsed in Story 1.2
  precio: number;
  descuento: number;
  cargo: number;
  isCancelled: boolean;
}

export interface CanonicalInventoryRow {
  producto: string;
  existenciaAnterior: number;
  ajuste: number;
  existenciaInicial: number;
  entradas: number;
  salidas: number;
  existenciaActual: number;
}

export interface CanonicalWithdrawal {
  folio: string;
  fechaRetiro: string | null; // raw string — parsed in Story 1.2
  concepto: string;
  efectivo: number;
}

export interface CanonicalShift {
  folio: string;
  fechaApertura: string | null; // raw string — parsed in domain layer
  horaInicio: string | null;    // "HH:mm" extracted by adapter from Excel time serial
  horaFin: string | null;       // "HH:mm" extracted by adapter from Excel time serial
  ventas: CanonicalSale[];
  canceladas: CanonicalSale[];
  inventario: CanonicalInventoryRow[];
  retiros: CanonicalWithdrawal[];
  // Legacy Cierre fields — stored in Shift.notes if > 0 (Story 1.2)
  ventasAnticipo?: number;
  comisionAPagar?: number;
  totalVentasWeb?: number;
}

export interface CanonicalMembersFile {
  type: "socios";
  members: CanonicalMember[];
}

export interface CanonicalShiftFile {
  type: "cortes";
  shift: CanonicalShift;
}

export type CanonicalFile = CanonicalMembersFile | CanonicalShiftFile;
