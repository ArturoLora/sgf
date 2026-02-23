// lib/domain/members/types.ts
// Tipos internos del dominio de socios
// SIN dependencias externas (no @/types/api, no Prisma)

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

// ==================== ENTIDAD SOCIO (INTERNA) ====================

export interface Socio {
  id: number;
  memberNumber: string;
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: Date | string;
  membershipType?: string;
  membershipDescription?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  totalVisits: number;
  lastVisit?: Date | string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==================== MEMBERSHIP TYPES ====================

export interface TipoMembresiaInfo {
  value: string;
  label: string;
  dias: number;
}

export const TIPOS_MEMBRESIA: TipoMembresiaInfo[] = [
  { value: "VISIT", label: "Visita", dias: 1 },
  { value: "WEEK", label: "Semana", dias: 7 },
  { value: "MONTH_STUDENT", label: "Mes Estudiante", dias: 30 },
  { value: "MONTH_GENERAL", label: "Mes General", dias: 30 },
  { value: "QUARTER_STUDENT", label: "Trimestre Estudiante", dias: 90 },
  { value: "QUARTER_GENERAL", label: "Trimestre General", dias: 90 },
  { value: "ANNUAL_STUDENT", label: "Anual Estudiante", dias: 365 },
  { value: "ANNUAL_GENERAL", label: "Anual General", dias: 365 },
  { value: "PROMOTION", label: "Promoción", dias: 30 },
  { value: "REBIRTH", label: "Renacer", dias: 30 },
  { value: "NUTRITION_CONSULTATION", label: "Consulta Nutrición", dias: 1 },
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
  membershipType?: string;
  membershipDescription?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
}

export interface ActualizarSocioInput {
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  membershipType?: string;
  membershipDescription?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface RenovarMembresiaInput {
  memberId: number;
  membershipType: string;
  membershipDescription?: string;
  startDate?: string;
  paymentMethod?: string;
}
