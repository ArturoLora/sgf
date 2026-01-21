import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Construir filtros
    const where: any = {
      tipo: "VENTA",
    };

    // Filtro de fechas
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");
    if (fechaInicio && fechaFin) {
      where.fecha = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin + "T23:59:59"),
      };
    }

    // Filtro de cajero
    const cajero = searchParams.get("cajero");
    if (cajero && cajero !== "todos") {
      where.userId = cajero;
    }

    // Filtro de producto
    const producto = searchParams.get("producto");
    if (producto && producto !== "todos") {
      where.productoId = parseInt(producto);
    }

    // Filtro de socio
    const socio = searchParams.get("socio");
    if (socio && socio !== "todos") {
      where.socioId = parseInt(socio);
    }

    // Filtro de forma de pago
    const formaPago = searchParams.get("formaPago");
    if (formaPago && formaPago !== "todos") {
      where.formaPago = formaPago;
    }

    // Filtro de tipo de producto (membresías vs productos)
    const tipoProducto = searchParams.get("tipoProducto");
    if (tipoProducto && tipoProducto !== "todos") {
      // Obtener IDs de productos según tipo
      const keywordsMembresias = [
        "EFECTIVO",
        "VISITA",
        "MENSUALIDAD",
        "SEMANA",
        "TRIMESTRE",
        "ANUAL",
        "PROMOCION",
        "RENACER",
      ];

      const productos = await prisma.producto.findMany({
        select: { id: true, nombre: true },
      });

      if (tipoProducto === "membresias") {
        const idsMembresias = productos
          .filter((p) =>
            keywordsMembresias.some((k) => p.nombre.toUpperCase().includes(k)),
          )
          .map((p) => p.id);
        where.productoId = { in: idsMembresias };
      } else if (tipoProducto === "productos") {
        const idsProductos = productos
          .filter(
            (p) =>
              !keywordsMembresias.some((k) =>
                p.nombre.toUpperCase().includes(k),
              ),
          )
          .map((p) => p.id);
        where.productoId = { in: idsProductos };
      }
    }

    // Filtro de solo activas
    const soloActivas = searchParams.get("soloActivas") === "true";
    if (soloActivas) {
      where.cancelada = false;
    }

    // Ordenamiento
    const ordenarPor = searchParams.get("ordenarPor") || "fecha";
    const orden = searchParams.get("orden") || "desc";

    const orderBy: any = {};
    switch (ordenarPor) {
      case "total":
        orderBy.total = orden;
        break;
      case "ticket":
        orderBy.ticket = orden;
        break;
      default:
        orderBy.fecha = orden;
    }

    // Paginación
    const pagina = parseInt(searchParams.get("pagina") || "1");
    const porPagina = parseInt(searchParams.get("porPagina") || "10");
    const skip = (pagina - 1) * porPagina;

    // Contar total antes de aplicar skip/take
    const total = await prisma.inventario.count({ where });

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
      orderBy,
      skip,
      take: porPagina,
    });

    return NextResponse.json({
      ventas: serializeDecimal(ventas),
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
