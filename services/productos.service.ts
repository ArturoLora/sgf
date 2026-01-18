import { PrismaClient, Ubicacion } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== TIPOS ====================

export interface CreateProductoInput {
  nombre: string;
  precioVenta: number;
  existenciaMin?: number;
}

export interface UpdateProductoInput {
  nombre?: string;
  precioVenta?: number;
  existenciaMin?: number;
  activo?: boolean;
}

export interface SearchProductosParams {
  search?: string;
  activo?: boolean;
  bajoStock?: boolean;
}

// ==================== SERVICIOS ====================

export async function getAllProductos(params?: SearchProductosParams) {
  const where: any = {};

  if (params?.search) {
    where.nombre = {
      contains: params.search,
      mode: "insensitive",
    };
  }

  if (params?.activo !== undefined) {
    where.activo = params.activo;
  }

  const productos = await prisma.producto.findMany({
    where,
    orderBy: { nombre: "asc" },
  });

  if (params?.bajoStock) {
    return productos.filter(
      (p) =>
        p.existenciaGym < p.existenciaMin ||
        p.existenciaBodega < p.existenciaMin
    );
  }

  return productos;
}

export async function getProductoById(id: number) {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      inventarios: {
        orderBy: { fecha: "desc" },
        take: 20,
        include: {
          usuario: {
            select: {
              name: true,
            },
          },
          socio: {
            select: {
              numeroSocio: true,
              nombre: true,
            },
          },
        },
      },
    },
  });

  if (!producto) {
    throw new Error("Producto no encontrado");
  }

  return producto;
}

export async function createProducto(data: CreateProductoInput) {
  const existingProducto = await prisma.producto.findUnique({
    where: { nombre: data.nombre },
  });

  if (existingProducto) {
    throw new Error("Ya existe un producto con ese nombre");
  }

  const producto = await prisma.producto.create({
    data: {
      nombre: data.nombre,
      precioVenta: data.precioVenta,
      existenciaMin: data.existenciaMin || 0,
    },
  });

  return producto;
}

export async function updateProducto(id: number, data: UpdateProductoInput) {
  const producto = await prisma.producto.findUnique({
    where: { id },
  });

  if (!producto) {
    throw new Error("Producto no encontrado");
  }

  if (data.nombre && data.nombre !== producto.nombre) {
    const existingProducto = await prisma.producto.findUnique({
      where: { nombre: data.nombre },
    });

    if (existingProducto) {
      throw new Error("Ya existe un producto con ese nombre");
    }
  }

  const updatedProducto = await prisma.producto.update({
    where: { id },
    data,
  });

  return updatedProducto;
}

export async function toggleProductoStatus(id: number) {
  const producto = await prisma.producto.findUnique({
    where: { id },
  });

  if (!producto) {
    throw new Error("Producto no encontrado");
  }

  const updatedProducto = await prisma.producto.update({
    where: { id },
    data: { activo: !producto.activo },
  });

  return updatedProducto;
}

export async function getProductosActivos() {
  return await prisma.producto.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });
}

export async function getProductosBajoStock() {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
  });

  return productos.filter(
    (p) =>
      p.existenciaGym < p.existenciaMin ||
      p.existenciaBodega < p.existenciaMin
  );
}

export async function getExistenciaProducto(
  productoId: number,
  ubicacion?: Ubicacion
) {
  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
  });

  if (!producto) {
    throw new Error("Producto no encontrado");
  }

  if (ubicacion === "BODEGA") {
    return producto.existenciaBodega;
  } else if (ubicacion === "GYM") {
    return producto.existenciaGym;
  }

  return {
    bodega: producto.existenciaBodega,
    gym: producto.existenciaGym,
    total: producto.existenciaBodega + producto.existenciaGym,
  };
}

export async function getProductosMembresia() {
  const keywords = ["EFECTIVO", "VISITA", "MENSUALIDAD", "SEMANA"];

  const productos = await prisma.producto.findMany({
    where: {
      activo: true,
      OR: keywords.map((keyword) => ({
        nombre: { contains: keyword, mode: "insensitive" },
      })),
    },
    orderBy: { nombre: "asc" },
  });

  return productos;
}

export async function getProductosVenta() {
  const keywords = ["EFECTIVO", "VISITA", "MENSUALIDAD", "SEMANA"];

  const productos = await prisma.producto.findMany({
    where: {
      activo: true,
      NOT: {
        OR: keywords.map((keyword) => ({
          nombre: { contains: keyword, mode: "insensitive" },
        })),
      },
    },
    orderBy: { nombre: "asc" },
  });

  return productos;
}

export async function getEstadisticasProductos() {
  const total = await prisma.producto.count();
  const activos = await prisma.producto.count({ where: { activo: true } });

  const productos = await prisma.producto.findMany({
    where: { activo: true },
  });

  const bajoStockGym = productos.filter(
    (p) => p.existenciaGym < p.existenciaMin
  ).length;
  const bajoStockBodega = productos.filter(
    (p) => p.existenciaBodega < p.existenciaMin
  ).length;

  const valorInventario = productos.reduce((sum, p) => {
    const totalStock = p.existenciaBodega + p.existenciaGym;
    return sum + Number(p.precioVenta) * totalStock;
  }, 0);

  return {
    total,
    activos,
    bajoStockGym,
    bajoStockBodega,
    valorInventario,
  };
}
