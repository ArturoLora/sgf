// Common types
export type {
  ErrorResponse,
  SuccessResponse,
  PaginacionQuery,
  PaginacionResponse,
  OrdenamientoQuery,
  FiltroFechasQuery,
  BusquedaQuery,
  UsuarioSesion,
  SesionActiva,
} from "./common";

// Inventory
export type {
  CrearVentaRequest,
  CrearEntradaRequest,
  CrearTraspasoRequest,
  CrearAjusteRequest,
  CancelarVentaRequest,
  MovimientoInventarioResponse,
  KardexMovimientoResponse,
  ObtenerMovimientosQuery,
  ObtenerVentasCanceladasQuery,
  VentaCreada,
  EntradaCreada,
  TraspasoCreado,
  AjusteCreado,
  VentaCancelada,
} from "./inventory";

// Sales
export type {
  ObtenerHistorialVentasQuery,
  ProductoVentaResponse,
  ItemVentaTicket,
  TicketVentaAgrupado,
  HistorialVentasResponse,
  DetalleTicketResponse,
} from "./sales";

// Members
export type {
  BuscarSociosQuery,
  CrearSocioRequest,
  ActualizarSocioRequest,
  RenovarMembresiaRequest,
  SocioResponse,
  SocioConHistorialResponse,
  VigenciaMembresiaResponse,
  SocioVencidoResponse,
} from "./members";

// Products
export type {
  BuscarProductosQuery,
  CrearProductoRequest,
  ActualizarProductoRequest,
  ProductoResponse,
  ProductoConMovimientosResponse,
  StockProductoResponse,
  EstadisticasProductosResponse,
  ProductoBajoStockResponse,
} from "./products";

// Shifts
export type {
  BuscarCortesQuery,
  AbrirCorteRequest,
  CerrarCorteRequest,
  CorteResponse,
  CorteConVentasResponse,
  ResumenCorteResponse,
  ListaCortesResponse,
  EstadisticasCortesResponse,
  ResumenVentasPorProducto,
  ResumenPorFormaPago,
} from "./shifts";

// Reports
export type {
  PeriodoReporteQuery,
  ReporteVentasPorProducto,
  ReporteVentasDiarias,
  ReporteFormaPago,
  ReporteVentasCanceladas,
  ReporteMovimientosInventario,
  ReporteStockActual,
  ReporteSociosPorMembresia,
  ReporteSociosNuevos,
  ReporteVisitasSocios,
  ResumenDashboard,
} from "./reports";
