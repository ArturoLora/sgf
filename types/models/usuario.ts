export enum Rol {
  ADMIN = "ADMIN",
  EMPLEADO = "EMPLEADO",
}

export interface Usuario {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  role: Rol;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsuarioConRelaciones extends Usuario {
  sessions: Sesion[];
  accounts: Cuenta[];
  shifts: Corte[];
  inventoryMovements: MovimientoInventario[];
}

// Importaciones necesarias para las relaciones
import type { Sesion } from "./sesion";
import type { Cuenta } from "./cuenta";
import type { Corte } from "./corte";
import type { MovimientoInventario } from "./movimiento-inventario";
