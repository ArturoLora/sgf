// lib/domain/members/types.ts
// Tipos internos del dominio de socios
// SIN dependencias externas (no @/types/api, no Prisma)

// ==================== ENTIDAD SOCIO (reexportada desde types/models) ====================

export type { Socio } from "@/types/models/socio";
import { TipoMembresia } from "@/types/models/socio";
export { TipoMembresia };
import { MetodoPago } from "@/types/models/movimiento-inventario";
export { MetodoPago };

// ==================== FILTER TYPES ====================

export interface SociosFiltros {
  busqueda: string;
  estado: "todos" | "activos" | "inactivos";
  vigencia: "todos" | "vigentes" | "vencidos" | "sin_membresia";
  tipoMembresia: string;
  ordenarPor: "numero" | "nombre" | "fecha_registro" | "visitas";
  orden: "asc" | "desc";
}

export const FILTROS_INICIALES: SociosFiltros = {
  busqueda: "",
  estado: "activos",
  vigencia: "todos",
  tipoMembresia: "todos",
  ordenarPor: "numero",
  orden: "asc",
};

// ==================== MEMBERSHIP TYPES ====================

export interface TipoMembresiaInfo {
  value: TipoMembresia;
  label: string;
  dias: number;
}

export const TIPOS_MEMBRESIA: TipoMembresiaInfo[] = [
  { value: TipoMembresia.VISIT, label: "Visita", dias: 1 },
  { value: TipoMembresia.WEEK, label: "Semana", dias: 7 },
  { value: TipoMembresia.MONTH_STUDENT, label: "Mes Estudiante", dias: 30 },
  { value: TipoMembresia.MONTH_GENERAL, label: "Mes General", dias: 30 },
  {
    value: TipoMembresia.QUARTER_STUDENT,
    label: "Trimestre Estudiante",
    dias: 90,
  },
  {
    value: TipoMembresia.QUARTER_GENERAL,
    label: "Trimestre General",
    dias: 90,
  },
  { value: TipoMembresia.ANNUAL_STUDENT, label: "Anual Estudiante", dias: 365 },
  { value: TipoMembresia.ANNUAL_GENERAL, label: "Anual General", dias: 365 },
  { value: TipoMembresia.PROMOTION, label: "Promoción", dias: 30 },
  { value: TipoMembresia.REBIRTH, label: "Renacer", dias: 30 },
  {
    value: TipoMembresia.NUTRITION_CONSULTATION,
    label: "Consulta Nutrición",
    dias: 1,
  },
];

export const TIPOS_MEMBRESIA_MAP: Record<string, string> = Object.fromEntries(
  TIPOS_MEMBRESIA.map((t) => [t.value, t.label]),
);

// ==================== STATS ====================

export interface SociosEstadisticas {
  total: number;
  activos: number;
  conMembresia: number;
  vencidos: number;
  totalVisitas: number;
}

// ==================== VIGENCIA ====================

export type EstadoVigencia = "vigente" | "vencida" | "sin_membresia";

// ==================== PAYLOADS INTERNOS ====================

export interface CrearSocioInput {
  memberNumber: string;
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  membershipType?: TipoMembresia;
  membershipDescription?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: MetodoPago;
}

export interface ActualizarSocioInput {
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  membershipType?: TipoMembresia;
  membershipDescription?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface RenovarMembresiaInput {
  memberId: number;
  membershipType: TipoMembresia;
  membershipDescription?: string;
  startDate?: string;
  paymentMethod?: MetodoPago;
}
