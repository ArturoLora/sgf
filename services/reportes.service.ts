import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { serializeDecimal } from "./utils";

const prisma = new PrismaClient();

// ==================== TIPOS ====================

export interface ReportePeriodoParams {
  fechaInicio: Date;
  fechaFin: Date;
}

export interface ReporteVentasProducto {
  productoId: number;
  productoNombre: string;
  cantidadVendida: number;
  totalVentas: Decimal;
  cantidadCancelada: number;
  totalCancelado: Decimal;
}

export interface ReporteVentasDiarias {
  fecha: string;
  cantidadTickets: number;
  totalVentas: Decimal;
  totalCancelado: Decimal;
}

// ==================== HELPERS ====================

function toDecimal(value: number | Decimal): Decimal {
  return new Decimal(value.toString());
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ==================== REPORTES DE VENTAS ====================

export async function getReporteVentasPorProducto(
  params: ReportePeriodoParams,
): Promise<ReporteVentasProducto[]> {
  const ventas = await prisma.inventario.findMany({
    where: {
      tipo: "VENTA",
      fecha: {
        gte: params.fechaInicio,
        lte: params.fechaFin,
      },
    },
    include: {
      producto: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  const reportePorProducto = ventas.reduce(
    (acc, venta) => {
      const id = venta.producto.id;
      if (!acc[id]) {
        acc[id] = {
          productoId: id,
          productoNombre: venta.producto.nombre,
          cantidadVendida: 0,
          totalVentas: new Decimal(0),
          cantidadCancelada: 0,
          totalCancelado: new Decimal(0),
        };
      }

      const cantidad = Math.abs(venta.cantidad);
      const total = toDecimal(venta.total || 0);

      if (venta.cancelada) {
        acc[id].cantidadCancelada += cantidad;
        acc[id].totalCancelado = acc[id].totalCancelado.plus(total);
      } else {
        acc[id].cantidadVendida += cantidad;
        acc[id].totalVentas = acc[id].totalVentas.plus(total);
      }

      return acc;
    },
    {} as Record<number, ReporteVentasProducto>,
  );

  return Object.values(reportePorProducto).sort(
    (a, b) => Number(b.totalVentas) - Number(a.totalVentas),
  );
}

export async function getReporteVentasDiarias(
  params: ReportePeriodoParams,
): Promise<ReporteVentasDiarias[]> {
  const ventas = await prisma.inventario.findMany({
    where: {
      tipo: "VENTA",
      fecha: {
        gte: params.fechaInicio,
        lte: params.fechaFin,
      },
    },
  });

  const ventasPorDia = ventas.reduce(
    (acc, venta) => {
      const fecha = formatDate(venta.fecha);
      if (!acc[fecha]) {
        acc[fecha] = {
          fecha,
          tickets: new Set<string>(),
          totalVentas: new Decimal(0),
          totalCancelado: new Decimal(0),
        };
      }

      if (venta.ticket) {
        acc[fecha].tickets.add(venta.ticket);
      }

      const total = toDecimal(venta.total || 0);

      if (venta.cancelada) {
        acc[fecha].totalCancelado = acc[fecha].totalCancelado.plus(total);
      } else {
        acc[fecha].totalVentas = acc[fecha].totalVentas.plus(total);
      }

      return acc;
    },
    {} as Record<
      string,
      {
        fecha: string;
        tickets: Set<string>;
        totalVentas: Decimal;
        totalCancelado: Decimal;
      }
    >,
  );

  return Object.values(ventasPorDia)
    .map((dia) => ({
      fecha: dia.fecha,
      cantidadTickets: dia.tickets.size,
      totalVentas: dia.totalVentas,
      totalCancelado: dia.totalCancelado,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function getReporteVentasPorFormaPago(
  params: ReportePeriodoParams,
) {
  const ventas = await prisma.inventario.findMany({
    where: {
      tipo: "VENTA",
      cancelada: false,
      fecha: {
        gte: params.fechaInicio,
        lte: params.fechaFin,
      },
    },
  });

  const reporte = ventas.reduce(
    (acc, venta) => {
      const formaPago = venta.formaPago || "EFECTIVO";
      const total = toDecimal(venta.total || 0);

      acc[formaPago].cantidad += 1;
      acc[formaPago].total = acc[formaPago].total.plus(total);

      return acc;
    },
    {
      EFECTIVO: { formaPago: "EFECTIVO", cantidad: 0, total: new Decimal(0) },
      TARJETA_DEBITO: {
        formaPago: "TARJETA_DEBITO",
        cantidad: 0,
        total: new Decimal(0),
      },
      TARJETA_CREDITO: {
        formaPago: "TARJETA_CREDITO",
        cantidad: 0,
        total: new Decimal(0),
      },
      TRANSFERENCIA: {
        formaPago: "TRANSFERENCIA",
        cantidad: 0,
        total: new Decimal(0),
      },
    },
  );

  return Object.values(reporte);
}

export async function getReporteVentasCanceladas(params: ReportePeriodoParams) {
  const ventas = await prisma.inventario.findMany({
    where: {
      tipo: "VENTA",
      cancelada: true,
      fechaCancelacion: {
        gte: params.fechaInicio,
        lte: params.fechaFin,
      },
    },
    include: {
      producto: {
        select: {
          nombre: true,
        },
      },
      socio: {
        select: {
          numeroSocio: true,
          nombre: true,
        },
      },
      usuario: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { fechaCancelacion: "desc" },
  });

  const totalCancelado = ventas.reduce(
    (sum, v) => sum.plus(toDecimal(v.total || 0)),
    new Decimal(0),
  );

  return {
    ventas,
    totalCancelado,
    cantidadCancelaciones: ventas.length,
  };
}

// ==================== REPORTES DE INVENTARIO ====================

export async function getReporteMovimientosInventario(
  params: ReportePeriodoParams,
) {
  const movimientos = await prisma.inventario.findMany({
    where: {
      fecha: {
        gte: params.fechaInicio,
        lte: params.fechaFin,
      },
    },
    include: {
      producto: {
        select: {
          nombre: true,
        },
      },
      usuario: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { fecha: "desc" },
  });

  const resumenPorTipo = movimientos.reduce(
    (acc, mov) => {
      const tipo = mov.tipo;
      if (!acc[tipo]) {
        acc[tipo] = {
          tipo,
          cantidad: 0,
        };
      }
      acc[tipo].cantidad += 1;
      return acc;
    },
    {} as Record<string, { tipo: string; cantidad: number }>,
  );

  return {
    movimientos,
    resumenPorTipo: Object.values(resumenPorTipo),
  };
}

export async function getReporteStockActual() {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  const stockTotal = productos.reduce(
    (acc, p) => {
      acc.bodega += p.existenciaBodega;
      acc.gym += p.existenciaGym;
      acc.total += p.existenciaBodega + p.existenciaGym;
      acc.valorTotal +=
        Number(p.precioVenta) * (p.existenciaBodega + p.existenciaGym);
      return acc;
    },
    { bodega: 0, gym: 0, total: 0, valorTotal: 0 },
  );

  const bajoStock = productos.filter(
    (p) =>
      p.existenciaGym < p.existenciaMin || p.existenciaBodega < p.existenciaMin,
  );

  // ✅ Serializar antes de retornar
  return serializeDecimal({
    productos,
    stockTotal,
    bajoStock,
  });
}

// ==================== REPORTES DE SOCIOS ====================

export async function getReporteSociosPorMembresia() {
  const socios = await prisma.socio.groupBy({
    by: ["tipoMembresia", "activo"],
    _count: true,
  });

  return socios.map((s) => ({
    tipoMembresia: s.tipoMembresia || "SIN_MEMBRESIA",
    activo: s.activo,
    cantidad: s._count,
  }));
}

export async function getReporteNuevosSocios(params: ReportePeriodoParams) {
  const socios = await prisma.socio.findMany({
    where: {
      createdAt: {
        gte: params.fechaInicio,
        lte: params.fechaFin,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const porDia = socios.reduce(
    (acc, socio) => {
      const fecha = formatDate(socio.createdAt);
      if (!acc[fecha]) {
        acc[fecha] = {
          fecha,
          cantidad: 0,
        };
      }
      acc[fecha].cantidad += 1;
      return acc;
    },
    {} as Record<string, { fecha: string; cantidad: number }>,
  );

  return {
    socios,
    porDia: Object.values(porDia).sort((a, b) =>
      a.fecha.localeCompare(b.fecha),
    ),
    total: socios.length,
  };
}

export async function getReporteVisitasSocios(params: ReportePeriodoParams) {
  const visitas = await prisma.inventario.findMany({
    where: {
      tipo: "VENTA",
      cancelada: false,
      socioId: { not: null },
      fecha: {
        gte: params.fechaInicio,
        lte: params.fechaFin,
      },
    },
    include: {
      socio: {
        select: {
          numeroSocio: true,
          nombre: true,
          tipoMembresia: true,
        },
      },
    },
  });

  const visitasPorSocio = visitas.reduce(
    (acc, visita) => {
      const socioId = visita.socioId!;
      if (!acc[socioId]) {
        acc[socioId] = {
          socio: visita.socio!,
          cantidadVisitas: 0,
        };
      }
      acc[socioId].cantidadVisitas += 1;
      return acc;
    },
    {} as Record<number, { socio: any; cantidadVisitas: number }>,
  );

  return Object.values(visitasPorSocio).sort(
    (a, b) => b.cantidadVisitas - a.cantidadVisitas,
  );
}

// ==================== DASHBOARD ====================

export async function getDashboardResumen(params?: ReportePeriodoParams) {
  const fechaInicio =
    params?.fechaInicio || new Date(new Date().setHours(0, 0, 0, 0));
  const fechaFin =
    params?.fechaFin || new Date(new Date().setHours(23, 59, 59, 999));

  const [ventasHoy, sociosActivos, productosActivos, corteActivo] =
    await Promise.all([
      prisma.inventario.findMany({
        where: {
          tipo: "VENTA",
          cancelada: false,
          fecha: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
      }),
      prisma.socio.count({ where: { activo: true } }),
      prisma.producto.count({ where: { activo: true } }),
      prisma.corte.findFirst({
        where: { fechaCierre: null },
        include: {
          cajero: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

  const totalVentasHoy = ventasHoy.reduce(
    (sum, v) => sum.plus(toDecimal(v.total || 0)),
    new Decimal(0),
  );

  const ticketsHoy = new Set(ventasHoy.map((v) => v.ticket)).size;

  const productosLowStock = await prisma.producto.count({
    where: {
      activo: true,
      OR: [
        {
          existenciaGym: {
            lt: prisma.producto.fields.existenciaMin,
          },
        },
        {
          existenciaBodega: {
            lt: prisma.producto.fields.existenciaMin,
          },
        },
      ],
    },
  });

  return {
    ventasHoy: {
      total: totalVentasHoy,
      tickets: ticketsHoy,
      cantidad: ventasHoy.length,
    },
    socios: {
      activos: sociosActivos,
    },
    productos: {
      activos: productosActivos,
      lowStock: productosLowStock,
    },
    corteActivo,
  };
}

// ==================== REPORTES DE CORTES ====================

export async function getReporteCortes(params: ReportePeriodoParams) {
  const cortes = await prisma.corte.findMany({
    where: {
      fechaApertura: {
        gte: params.fechaInicio,
        lte: params.fechaFin,
      },
    },
    include: {
      cajero: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { fechaApertura: "desc" },
  });

  const totalVentas = cortes.reduce(
    (sum, c) => sum.plus(toDecimal(c.totalVentas)),
    new Decimal(0),
  );

  const totalDiferencias = cortes.reduce(
    (sum, c) => sum.plus(toDecimal(Math.abs(Number(c.diferencia)))),
    new Decimal(0),
  );

  const promedioVentas =
    cortes.length > 0 ? totalVentas.dividedBy(cortes.length) : new Decimal(0);

  return {
    cortes,
    resumen: {
      totalCortes: cortes.length,
      totalVentas,
      totalDiferencias,
      promedioVentas,
    },
  };
}
