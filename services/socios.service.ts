import { PrismaClient, TipoMembresia } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { serializeDecimal } from "./utils";

const prisma = new PrismaClient();

// ==================== TIPOS ====================

export interface CreateSocioInput {
  numeroSocio: string;
  nombre?: string;
  telefono?: string;
  email?: string;
  fechaNacimiento?: Date;
  tipoMembresia?: TipoMembresia;
  descripcionMembresia?: string;
  fechaInicio?: Date;
  fechaFin?: Date;
}

export interface UpdateSocioInput {
  nombre?: string;
  telefono?: string;
  email?: string;
  fechaNacimiento?: Date;
  tipoMembresia?: TipoMembresia;
  descripcionMembresia?: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  activo?: boolean;
}

export interface RenovarMembresiaInput {
  socioId: number;
  tipoMembresia: TipoMembresia;
  descripcionMembresia?: string;
  fechaInicio?: Date;
}

export interface SearchSociosParams {
  search?: string;
  activo?: boolean;
  tipoMembresia?: TipoMembresia;
}

// ==================== HELPERS ====================

function calcularFechaFin(
  fechaInicio: Date,
  tipoMembresia: TipoMembresia,
): Date {
  const fecha = new Date(fechaInicio);

  switch (tipoMembresia) {
    case "VISITA":
      return fecha;
    case "SEMANA":
      fecha.setDate(fecha.getDate() + 7);
      break;
    case "MES_ESTUDIANTE":
    case "MES_GENERAL":
      fecha.setMonth(fecha.getMonth() + 1);
      break;
    case "TRIMESTRE_ESTUDIANTE":
    case "TRIMESTRE_GENERAL":
      fecha.setMonth(fecha.getMonth() + 3);
      break;
    case "ANUAL_ESTUDIANTE":
    case "ANUAL_GENERAL":
      fecha.setFullYear(fecha.getFullYear() + 1);
      break;
    case "PROMOCION":
    case "RENACER":
    case "CONSULTA_NUTRICION":
      fecha.setMonth(fecha.getMonth() + 1);
      break;
  }

  return fecha;
}

export function calcularFechasMembresia(
  tipoMembresia: TipoMembresia,
  fechaInicio?: Date,
): { fechaInicio: Date; fechaFin: Date } {
  const inicio = fechaInicio || new Date();
  const fin = calcularFechaFin(inicio, tipoMembresia);

  return {
    fechaInicio: inicio,
    fechaFin: fin,
  };
}

// ==================== SERVICIOS ====================

export async function getAllSocios(params?: SearchSociosParams) {
  const where: any = {};

  if (params?.search) {
    where.OR = [
      { numeroSocio: { contains: params.search, mode: "insensitive" } },
      { nombre: { contains: params.search, mode: "insensitive" } },
      { telefono: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params?.activo !== undefined) {
    where.activo = params.activo;
  }

  if (params?.tipoMembresia) {
    where.tipoMembresia = params.tipoMembresia;
  }

  const socios = await prisma.socio.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return serializeDecimal(socios);
}

export async function getSocioById(id: number) {
  const socio = await prisma.socio.findUnique({
    where: { id },
    include: {
      inventarios: {
        where: { tipo: "VENTA", cancelada: false },
        orderBy: { fecha: "desc" },
        take: 10,
        include: {
          producto: {
            select: {
              nombre: true,
              precioVenta: true,
            },
          },
        },
      },
    },
  });

  if (!socio) {
    throw new Error("Socio no encontrado");
  }

  return serializeDecimal(socio);
}

export async function getSocioByNumero(numeroSocio: string) {
  const socio = await prisma.socio.findUnique({
    where: { numeroSocio },
    include: {
      inventarios: {
        where: { tipo: "VENTA", cancelada: false },
        orderBy: { fecha: "desc" },
        take: 5,
        include: {
          producto: {
            select: {
              nombre: true,
              precioVenta: true,
            },
          },
        },
      },
    },
  });

  if (!socio) {
    throw new Error("Socio no encontrado");
  }

  return serializeDecimal(socio);
}

export async function createSocio(data: CreateSocioInput) {
  const existingSocio = await prisma.socio.findUnique({
    where: { numeroSocio: data.numeroSocio },
  });

  if (existingSocio) {
    throw new Error("El número de socio ya existe");
  }

  const socio = await prisma.socio.create({
    data: {
      ...data,
      fechaNacimiento: data.fechaNacimiento
        ? new Date(data.fechaNacimiento)
        : undefined,
      fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
      fechaFin: data.fechaFin ? new Date(data.fechaFin) : undefined,
    },
  });

  return serializeDecimal(socio);
}

export async function updateSocio(id: number, data: UpdateSocioInput) {
  const socio = await prisma.socio.findUnique({
    where: { id },
  });

  if (!socio) {
    throw new Error("Socio no encontrado");
  }

  const updatedSocio = await prisma.socio.update({
    where: { id },
    data: {
      ...data,
      fechaNacimiento: data.fechaNacimiento
        ? new Date(data.fechaNacimiento)
        : undefined,
      fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
      fechaFin: data.fechaFin ? new Date(data.fechaFin) : undefined,
    },
  });

  return serializeDecimal(updatedSocio);
}

export async function toggleSocioStatus(id: number) {
  const socio = await prisma.socio.findUnique({
    where: { id },
  });

  if (!socio) {
    throw new Error("Socio no encontrado");
  }

  const updatedSocio = await prisma.socio.update({
    where: { id },
    data: { activo: !socio.activo },
  });

  return serializeDecimal(updatedSocio);
}

export async function registrarVisita(socioId: number) {
  const socio = await prisma.socio.findUnique({
    where: { id: socioId },
  });

  if (!socio) {
    throw new Error("Socio no encontrado");
  }

  if (!socio.activo) {
    throw new Error("El socio no está activo");
  }

  const updatedSocio = await prisma.socio.update({
    where: { id: socioId },
    data: {
      totalVisitas: { increment: 1 },
      ultimaVisita: new Date(),
    },
  });

  return serializeDecimal(updatedSocio);
}

export async function getSociosActivos() {
  const socios = await prisma.socio.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  return serializeDecimal(socios);
}

export async function getSociosPorVencer(dias: number = 7) {
  const hoy = new Date();
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + dias);

  const socios = await prisma.socio.findMany({
    where: {
      activo: true,
      fechaFin: {
        gte: hoy,
        lte: fechaLimite,
      },
      tipoMembresia: {
        not: "VISITA",
      },
    },
    orderBy: { fechaFin: "asc" },
  });

  return serializeDecimal(socios);
}

export async function getEstadisticasSocios() {
  const total = await prisma.socio.count();
  const activos = await prisma.socio.count({ where: { activo: true } });
  const inactivos = await prisma.socio.count({ where: { activo: false } });

  const porTipo = await prisma.socio.groupBy({
    by: ["tipoMembresia"],
    where: { activo: true },
    _count: true,
  });

  return {
    total,
    activos,
    inactivos,
    porTipo,
  };
}

export async function renovarMembresia(data: RenovarMembresiaInput) {
  const socio = await prisma.socio.findUnique({
    where: { id: data.socioId },
  });

  if (!socio) {
    throw new Error("Socio no encontrado");
  }

  const fechas = calcularFechasMembresia(data.tipoMembresia, data.fechaInicio);

  const updatedSocio = await prisma.socio.update({
    where: { id: data.socioId },
    data: {
      tipoMembresia: data.tipoMembresia,
      descripcionMembresia: data.descripcionMembresia,
      fechaInicio: fechas.fechaInicio,
      fechaFin: fechas.fechaFin,
      activo: true,
    },
  });

  return serializeDecimal(updatedSocio);
}

export async function getSociosVencidos() {
  const hoy = new Date();

  const socios = await prisma.socio.findMany({
    where: {
      activo: true,
      fechaFin: {
        lt: hoy,
      },
      tipoMembresia: {
        not: "VISITA",
      },
    },
    orderBy: { fechaFin: "desc" },
  });

  return serializeDecimal(socios);
}

export async function verificarVigencia(socioId: number): Promise<{
  vigente: boolean;
  diasRestantes: number;
  fechaFin: Date | null;
}> {
  const socio = await prisma.socio.findUnique({
    where: { id: socioId },
  });

  if (!socio || !socio.fechaFin || socio.tipoMembresia === "VISITA") {
    return {
      vigente: false,
      diasRestantes: 0,
      fechaFin: null,
    };
  }

  const hoy = new Date();
  const fechaFin = new Date(socio.fechaFin);
  const diferencia = fechaFin.getTime() - hoy.getTime();
  const diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

  return {
    vigente: diasRestantes > 0,
    diasRestantes: Math.max(0, diasRestantes),
    fechaFin,
  };
}
