export enum TipoMembresia {
  VISIT = "VISIT",
  WEEK = "WEEK",
  MONTH_STUDENT = "MONTH_STUDENT",
  MONTH_GENERAL = "MONTH_GENERAL",
  QUARTER_STUDENT = "QUARTER_STUDENT",
  QUARTER_GENERAL = "QUARTER_GENERAL",
  ANNUAL_STUDENT = "ANNUAL_STUDENT",
  ANNUAL_GENERAL = "ANNUAL_GENERAL",
  PROMOTION = "PROMOTION",
  REBIRTH = "REBIRTH",
  NUTRITION_CONSULTATION = "NUTRITION_CONSULTATION",
}

export interface Socio {
  id: number;
  memberNumber: string;
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: Date;
  membershipType?: TipoMembresia;
  membershipDescription?: string;
  startDate?: Date;
  endDate?: Date;
  totalVisits: number;
  lastVisit?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocioConRelaciones extends Socio {
  inventoryMovements: MovimientoInventario[];
}

import type { MovimientoInventario } from "./movimiento-inventario";
