import { PrismaClient, Role } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { serializeDecimal } from "./utils";

const prisma = new PrismaClient();

// ==================== TIPOS ====================

export interface AbrirCorteInput {
  cajeroId: string;
  fondoCaja: number;
  observaciones?: string;
}

export interface CerrarCorteInput {
  corteId: number;
  totalRetiros?: number;
  conceptoRetiros?: string;
  totalCaja: number;
  observaciones?: string;
}

// ==================== HELPERS ====================

function toDecimal(value: number | Decimal): Decimal {
  return new Decimal(value.toString());
}

function addDecimals(...values: (number | Decimal)[]): Decimal {
  return values.reduce((sum, val) => sum.plus(toDecimal(val)), new Decimal(0));
}

function subtractDecimals(a: number | Decimal, b: number | Decimal): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

// ==================== VALIDACIONES ====================

async function validarCorteAbierto(cajeroId: string) {
  const corteAbierto = await prisma.corte.findFirst({
    where: {
      cajeroId,
      fechaCierre: null,
    },
  });

  if (corteAbierto) {
    throw new Error("Ya tienes un corte abierto");
  }
}

async function validarNoHayCorteAbierto() {
  const corteAbierto = await prisma.corte.findFirst({
    where: {
      fechaCierre: null,
    },
  });

  if (corteAbierto) {
    throw new Error("Ya existe un corte abierto en el sistema");
  }
}

// ==================== SERVICIOS ====================

export async function abrirCorte(data: AbrirCorteInput) {
  await validarCorteAbierto(data.cajeroId);
  await validarNoHayCorteAbierto();

  const ultimoCorte = await prisma.corte.findFirst({
    orderBy: { createdAt: "desc" },
  });

  let nuevoFolio = "FN-1";
  if (ultimoCorte) {
    const numeroActual = parseInt(ultimoCorte.folio.split("-")[1]) || 0;
    nuevoFolio = `FN-${numeroActual + 1}`;
  }

  const corte = await prisma.corte.create({
    data: {
      folio: nuevoFolio,
      cajeroId: data.cajeroId,
      fechaApertura: new Date(),
      fondoCaja: data.fondoCaja,
      observaciones: data.observaciones,
    },
    include: {
      cajero: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return serializeDecimal(corte);
}

export async function cerrarCorte(data: CerrarCorteInput) {
  const corte = await prisma.corte.findUnique({
    where: { id: data.corteId },
    include: {
      inventarios: {
        where: {
          tipo: "VENTA",
          cancelada: false,
        },
      },
    },
  });

  if (!corte) {
    throw new Error("Corte no encontrado");
  }

  if (corte.fechaCierre) {
    throw new Error("El corte ya está cerrado");
  }

  const tickets = new Set(corte.inventarios.map((i) => i.ticket)).size;

  let ventasMembresias = new Decimal(0);
  let ventasProductosTasa0 = new Decimal(0);
  let ventasProductosTasa16 = new Decimal(0);
  let efectivo = new Decimal(0);
  let tarjetaDebito = new Decimal(0);
  let tarjetaCredito = new Decimal(0);

  const productosMembresia = await prisma.producto.findMany({
    where: {
      OR: [
        { nombre: { contains: "EFECTIVO", mode: "insensitive" } },
        { nombre: { contains: "VISITA", mode: "insensitive" } },
      ],
    },
  });

  const idsMembresias = productosMembresia.map((p) => p.id);

  for (const venta of corte.inventarios) {
    const total = toDecimal(venta.total || 0);

    if (idsMembresias.includes(venta.productoId)) {
      ventasMembresias = ventasMembresias.plus(total);
    } else {
      ventasProductosTasa0 = ventasProductosTasa0.plus(total);
    }

    switch (venta.formaPago) {
      case "EFECTIVO":
        efectivo = efectivo.plus(total);
        break;
      case "TARJETA_DEBITO":
        tarjetaDebito = tarjetaDebito.plus(total);
        break;
      case "TARJETA_CREDITO":
        tarjetaCredito = tarjetaCredito.plus(total);
        break;
    }
  }

  const subtotal = addDecimals(
    ventasMembresias,
    ventasProductosTasa0,
    ventasProductosTasa16,
  );

  const iva = ventasProductosTasa16.times(0.16);

  const totalVentas = addDecimals(subtotal, iva);

  const totalVoucher = addDecimals(tarjetaDebito, tarjetaCredito);

  const totalRetiros = toDecimal(data.totalRetiros || 0);

  const totalCaja = toDecimal(data.totalCaja);

  const totalEsperado = addDecimals(corte.fondoCaja, efectivo).minus(
    totalRetiros,
  );

  const diferencia = subtractDecimals(totalCaja, totalEsperado);

  const corteActualizado = await prisma.corte.update({
    where: { id: data.corteId },
    data: {
      fechaCierre: new Date(),
      cantidadTickets: tickets,
      ventasMembresias,
      ventasProductosTasa0,
      ventasProductosTasa16,
      subtotal,
      iva,
      totalVentas,
      efectivo,
      tarjetaDebito,
      tarjetaCredito,
      totalVoucher,
      totalRetiros,
      conceptoRetiros: data.conceptoRetiros,
      totalCaja,
      diferencia,
      observaciones: data.observaciones || corte.observaciones,
    },
    include: {
      cajero: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return serializeDecimal(corteActualizado);
}

export async function getCorteActivo() {
  const corte = await prisma.corte.findFirst({
    where: {
      fechaCierre: null,
    },
    include: {
      cajero: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      inventarios: {
        where: {
          tipo: "VENTA",
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
        },
        orderBy: { fecha: "desc" },
      },
    },
  });

  return corte ? serializeDecimal(corte) : null;
}

export async function getCorteById(id: number) {
  const corte = await prisma.corte.findUnique({
    where: { id },
    include: {
      cajero: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      inventarios: {
        where: {
          tipo: "VENTA",
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
        },
        orderBy: { fecha: "asc" },
      },
    },
  });

  if (!corte) {
    throw new Error("Corte no encontrado");
  }

  return serializeDecimal(corte);
}

export async function getAllCortes(limite?: number) {
  const cortes = await prisma.corte.findMany({
    include: {
      cajero: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { fechaApertura: "desc" },
    take: limite,
  });

  return serializeDecimal(cortes);
}

export async function getCortesEntreFechas(fechaInicio: Date, fechaFin: Date) {
  const cortes = await prisma.corte.findMany({
    where: {
      fechaApertura: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    include: {
      cajero: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { fechaApertura: "desc" },
  });

  return serializeDecimal(cortes);
}

export async function getCortesPorCajero(cajeroId: string, limite?: number) {
  const cortes = await prisma.corte.findMany({
    where: { cajeroId },
    include: {
      cajero: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { fechaApertura: "desc" },
    take: limite,
  });

  return serializeDecimal(cortes);
}

export async function getResumenVentasCorte(corteId: number) {
  const ventas = await prisma.inventario.findMany({
    where: {
      corteId,
      tipo: "VENTA",
      cancelada: false,
    },
    include: {
      producto: {
        select: {
          nombre: true,
        },
      },
    },
  });

  const resumenPorProducto = ventas.reduce(
    (acc, venta) => {
      const nombre = venta.producto.nombre;
      if (!acc[nombre]) {
        acc[nombre] = {
          producto: nombre,
          cantidad: 0,
          total: new Decimal(0),
        };
      }
      acc[nombre].cantidad += Math.abs(venta.cantidad);
      acc[nombre].total = acc[nombre].total.plus(toDecimal(venta.total || 0));
      return acc;
    },
    {} as Record<
      string,
      { producto: string; cantidad: number; total: Decimal }
    >, // ✅ Todo en una línea
  );

  return serializeDecimal(Object.values(resumenPorProducto));
}

export async function getResumenPorFormaPago(corteId: number) {
  const ventas = await prisma.inventario.findMany({
    where: {
      corteId,
      tipo: "VENTA",
      cancelada: false,
    },
  });

  const resumen = ventas.reduce(
    (acc, venta) => {
      const total = toDecimal(venta.total || 0);
      const formaPago = venta.formaPago || "EFECTIVO";
      acc[formaPago] = acc[formaPago].plus(total);
      return acc;
    },
    {
      EFECTIVO: new Decimal(0),
      TARJETA_DEBITO: new Decimal(0),
      TARJETA_CREDITO: new Decimal(0),
      TRANSFERENCIA: new Decimal(0),
    },
  );

  return serializeDecimal(resumen);
}

export async function getEstadisticasCortes(
  fechaInicio?: Date,
  fechaFin?: Date,
) {
  const where: any = {};

  if (fechaInicio && fechaFin) {
    where.fechaApertura = {
      gte: fechaInicio,
      lte: fechaFin,
    };
  }

  const cortes = await prisma.corte.findMany({
    where,
  });

  const totalCortes = cortes.length;
  const totalVentas = cortes.reduce(
    (sum, c) => sum.plus(toDecimal(c.totalVentas)),
    new Decimal(0),
  );
  const promedioVentas =
    totalCortes > 0 ? totalVentas.dividedBy(totalCortes) : new Decimal(0);

  const totalDiferencias = cortes.reduce(
    (sum, c) => sum.plus(toDecimal(Math.abs(Number(c.diferencia)))),
    new Decimal(0),
  );

  return serializeDecimal({
    totalCortes,
    totalVentas,
    promedioVentas,
    totalDiferencias,
  });
}

export async function cancelarCorte(corteId: number, userRole: Role) {
  if (userRole !== "ADMIN") {
    throw new Error("Solo un administrador puede cancelar un corte");
  }

  const corte = await prisma.corte.findUnique({
    where: { id: corteId },
  });

  if (!corte) {
    throw new Error("Corte no encontrado");
  }

  if (!corte.fechaCierre) {
    throw new Error("No se puede cancelar un corte abierto");
  }

  await prisma.corte.delete({
    where: { id: corteId },
  });

  return { success: true, message: "Corte cancelado exitosamente" };
}
