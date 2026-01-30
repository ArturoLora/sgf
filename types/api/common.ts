// ==================== COMMON TYPES ====================

export interface ErrorResponse {
  error: string;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}

export interface PaginacionQuery {
  page?: string;
  perPage?: string;
}

export interface PaginacionResponse {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface OrdenamientoQuery {
  orderBy?: string;
  order?: "asc" | "desc";
}

export interface FiltroFechasQuery {
  startDate?: string;
  endDate?: string;
}

export interface BusquedaQuery {
  search?: string;
}

// ==================== AUTH TYPES ====================

export interface UsuarioSesion {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLEADO";
}

export interface SesionActiva {
  user: UsuarioSesion;
  session: {
    id: string;
    expiresAt: Date;
  };
}
