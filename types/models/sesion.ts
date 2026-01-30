export interface Sesion {
  id: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  userId: string;
}

export interface SesionConRelaciones extends Sesion {
  user: Usuario;
}

import type { Usuario } from "./usuario";
