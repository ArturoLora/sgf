import {
  PrismaClient,
  TipoInventario,
  Ubicacion,
  FormaPago,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { calcularFechasMembresia } from "./socios.service";
import { serializeDecimal } from "./utils";

const prisma = new PrismaClient();

// ==================== TIPOS ====================

export interface CreateVentaInput {
  productoId: number;
  cantidad: number;
  socioId?: number;
  userId: string;
  precioUnitario?: number;
  descuento?: number;
  cargo?: number;
  formaPago: FormaPago;
  ticket: string;
  corteId?: number;
  observaciones?: string;
}

export interface CreateEntradaInput {
  productoId: number;
  cantidad: number;
  ubicacion: Ubicacion;
  userId: string;
  observaciones?: string;
}

export interface CreateTraspasoInput {
  productoId: number;
  cantidad: number;
  destino: Ubicacion;
  userId: string;
  observaciones?: string;
}

export interface CreateAjusteInput {
  productoId: number;
  cantidad: number;
  ubicacion: Ubicacion;
  userId: string;
  observaciones: string;
}

export interface CancelarVentaInput {
  inventarioId: number;
  userId: string;
  motivoCancelacion: string;
}

// ==================== VALIDACIONES ====================

async function validarExistencia(
  productoId: number,
  cantidad: number,
  ubicacion: Ubicacion,
) {
  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
  });

  if (!producto) {
    throw new Error("Producto no encontrado");
  }

  const esMembresia =
    producto.nombre.includes("EFECTIVO") ||
    producto.nombre.includes("VISITA") ||
    producto.nombre.includes("MENSUALIDAD") ||
    producto.nombre.includes("SEMANA") ||
    producto.nombre.includes("TRIMESTRE") ||
    producto.nombre.includes("ANUAL");

  if (!esMembresia) {
    const existenciaActual =
      ubicacion === "BODEGA"
        ? producto.existenciaBodega
        : producto.existenciaGym;

    if (existenciaActual < cantidad) {
      throw new Error(
        `Stock insuficiente en ${ubicacion}. Disponible: ${existenciaActual}, Solicitado: ${cantidad}`,
      );
    }
  }

  return producto;
}

// ==================== SERVICIOS DE VENTA ====================

export async function createVenta(data: CreateVentaInput) {
  const producto = await validarExistencia(
    data.productoId,
    data.cantidad,
    "GYM",
  );

  const precioUnitario = data.precioUnitario || producto.precioVenta;
  const subtotal = Number(precioUnitario) * data.cantidad;
  const descuento = data.descuento || 0;
  const cargo = data.cargo || 0;
  const total = subtotal - Number(descuento) + Number(cargo);

  const esMembresia =
    producto.nombre.includes("EFECTIVO") ||
    producto.nombre.includes("VISITA") ||
    producto.nombre.includes("MENSUALIDAD") ||
    producto.nombre.includes("SEMANA") ||
    producto.nombre.includes("TRIMESTRE") ||
    producto.nombre.includes("ANUAL");

  const operaciones: any[] = [
    prisma.inventario.create({
      data: {
        productoId: data.productoId,
        tipo: "VENTA",
        ubicacion: "GYM",
        cantidad: -data.cantidad,
        ticket: data.ticket,
        socioId: data.socioId,
        userId: data.userId,
        precioUnitario,
        subtotal,
        descuento,
        cargo,
        total,
        formaPago: data.formaPago,
        corteId: data.corteId,
        observaciones: data.observaciones,
      },
      include: {
        producto: true,
        socio: true,
        usuario: {
          select: {
            name: true,
          },
        },
      },
    }),
  ];

  if (!esMembresia) {
    operaciones.push(
      prisma.producto.update({
        where: { id: data.productoId },
        data: {
          existenciaGym: producto.existenciaGym - data.cantidad,
        },
      }),
    );
  }

  const [inventario] = await prisma.$transaction(operaciones);

  if (data.socioId && esMembresia) {
    const socio = await prisma.socio.findUnique({
      where: { id: data.socioId },
    });

    if (socio && socio.tipoMembresia) {
      const fechas = calcularFechasMembresia(socio.tipoMembresia);

      await prisma.socio.update({
        where: { id: data.socioId },
        data: {
          fechaInicio: fechas.fechaInicio,
          fechaFin: fechas.fechaFin,
          totalVisitas: { increment: 1 },
          ultimaVisita: new Date(),
        },
      });
    }
  } else if (data.socioId) {
    await prisma.socio.update({
      where: { id: data.socioId },
      data: {
        totalVisitas: { increment: 1 },
        ultimaVisita: new Date(),
      },
    });
  }

  return serializeDecimal(inventario);
}

export async function cancelarVenta(data: CancelarVentaInput) {
  const venta = await prisma.inventario.findUnique({
    where: { id: data.inventarioId },
    include: { producto: true },
  });

  if (!venta) {
    throw new Error("Venta no encontrada");
  }

  if (venta.tipo !== "VENTA") {
    throw new Error("Solo se pueden cancelar ventas");
  }

  if (venta.cancelada) {
    throw new Error("La venta ya fue cancelada");
  }

  const cantidadADevolver = Math.abs(venta.cantidad);

  const [inventarioCancelado] = await prisma.$transaction([
    prisma.inventario.update({
      where: { id: data.inventarioId },
      data: {
        cancelada: true,
        motivoCancelacion: data.motivoCancelacion,
        fechaCancelacion: new Date(),
      },
      include: {
        producto: true,
        socio: true,
      },
    }),
    prisma.producto.update({
      where: { id: venta.productoId },
      data: {
        existenciaGym: venta.producto.existenciaGym + cantidadADevolver,
      },
    }),
  ]);

  return serializeDecimal(inventarioCancelado);
}

// ==================== SERVICIOS DE ENTRADA ====================

export async function createEntrada(data: CreateEntradaInput) {
  const producto = await prisma.producto.findUnique({
    where: { id: data.productoId },
  });

  if (!producto) {
    throw new Error("Producto no encontrado");
  }

  const tipo: TipoInventario =
    data.ubicacion === "BODEGA" ? "ENTRADA_BODEGA" : "ENTRADA_GYM";

  const [inventario] = await prisma.$transaction([
    prisma.inventario.create({
      data: {
        productoId: data.productoId,
        tipo,
        ubicacion: data.ubicacion,
        cantidad: data.cantidad,
        userId: data.userId,
        observaciones: data.observaciones,
      },
      include: {
        producto: true,
        usuario: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.producto.update({
      where: { id: data.productoId },
      data: {
        [data.ubicacion === "BODEGA" ? "existenciaBodega" : "existenciaGym"]: {
          increment: data.cantidad,
        },
      },
    }),
  ]);

  return serializeDecimal(inventario);
}

// ==================== SERVICIOS DE TRASPASO ====================

export async function createTraspaso(data: CreateTraspasoInput) {
  const origen: Ubicacion = data.destino === "GYM" ? "BODEGA" : "GYM";

  const producto = await validarExistencia(
    data.productoId,
    data.cantidad,
    origen,
  );

  const tipo: TipoInventario =
    data.destino === "GYM" ? "TRASPASO_A_GYM" : "TRASPASO_A_BODEGA";

  const [inventario] = await prisma.$transaction([
    prisma.inventario.create({
      data: {
        productoId: data.productoId,
        tipo,
        ubicacion: data.destino,
        cantidad: data.cantidad,
        userId: data.userId,
        observaciones:
          data.observaciones ||
          `Traspaso de ${data.cantidad} unidades de ${origen} a ${data.destino}`,
      },
      include: {
        producto: true,
        usuario: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.producto.update({
      where: { id: data.productoId },
      data: {
        existenciaBodega:
          origen === "BODEGA"
            ? producto.existenciaBodega - data.cantidad
            : producto.existenciaBodega + data.cantidad,
        existenciaGym:
          origen === "GYM"
            ? producto.existenciaGym - data.cantidad
            : producto.existenciaGym + data.cantidad,
      },
    }),
  ]);

  return serializeDecimal(inventario);
}

// ==================== SERVICIOS DE AJUSTE ====================

export async function createAjuste(data: CreateAjusteInput) {
  const producto = await prisma.producto.findUnique({
    where: { id: data.productoId },
  });

  if (!producto) {
    throw new Error("Producto no encontrado");
  }

  const existenciaActual =
    data.ubicacion === "BODEGA"
      ? producto.existenciaBodega
      : producto.existenciaGym;
  const nuevaExistencia = existenciaActual + data.cantidad;

  if (nuevaExistencia < 0) {
    throw new Error(
      `El ajuste resultaría en existencia negativa. Existencia actual: ${existenciaActual}`,
    );
  }

  const [inventario] = await prisma.$transaction([
    prisma.inventario.create({
      data: {
        productoId: data.productoId,
        tipo: "AJUSTE",
        ubicacion: data.ubicacion,
        cantidad: data.cantidad,
        userId: data.userId,
        observaciones: data.observaciones,
      },
      include: {
        producto: true,
        usuario: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.producto.update({
      where: { id: data.productoId },
      data: {
        [data.ubicacion === "BODEGA" ? "existenciaBodega" : "existenciaGym"]:
          nuevaExistencia,
      },
    }),
  ]);

  return serializeDecimal(inventario);
}

// ==================== CONSULTAS ====================

export async function getMovimientosByProducto(
  productoId: number,
  limite?: number,
) {
  const movimientos = await prisma.inventario.findMany({
    where: { productoId },
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
    orderBy: { fecha: "desc" },
    take: limite,
  });

  return serializeDecimal(movimientos);
}

export async function getMovimientosByFecha(fechaInicio: Date, fechaFin: Date) {
  const movimientos = await prisma.inventario.findMany({
    where: {
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    include: {
      producto: {
        select: {
          nombre: true,
          precioVenta: true,
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
    orderBy: { fecha: "desc" },
  });

  return serializeDecimal(movimientos);
}

export async function getVentasByTicket(ticket: string) {
  const ventas = await prisma.inventario.findMany({
    where: {
      ticket,
      tipo: "VENTA",
    },
    include: {
      producto: {
        select: {
          nombre: true,
          precioVenta: true,
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
    orderBy: { fecha: "asc" },
  });

  return serializeDecimal(ventas);
}

export async function getVentasByCorte(corteId: number) {
  const ventas = await prisma.inventario.findMany({
    where: {
      corteId,
      tipo: "VENTA",
    },
    include: {
      producto: {
        select: {
          nombre: true,
          precioVenta: true,
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
  });

  return serializeDecimal(ventas);
}

export async function getVentasCanceladas(fechaInicio?: Date, fechaFin?: Date) {
  const where: any = {
    tipo: "VENTA",
    cancelada: true,
  };

  if (fechaInicio && fechaFin) {
    where.fechaCancelacion = {
      gte: fechaInicio,
      lte: fechaFin,
    };
  }

  const ventas = await prisma.inventario.findMany({
    where,
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

  return serializeDecimal(ventas);
}
