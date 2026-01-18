import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("🌱 Iniciando seed...");

  const hashedPassword = hashPassword("123");

  // Usuarios
  const adminNacho = await prisma.user.upsert({
    where: { email: "nacho@nachogym.com" },
    update: {},
    create: {
      id: "admin-001",
      name: "Nacho",
      email: "nacho@nachogym.com",
      emailVerified: true,
      role: "ADMIN",
      activo: true,
      accounts: {
        create: {
          id: "account-admin-001",
          accountId: "admin-001",
          providerId: "credential",
          password: hashedPassword,
        },
      },
    },
  });

  const employeeCarlos = await prisma.user.upsert({
    where: { email: "carlos@nachogym.com" },
    update: {},
    create: {
      id: "employee-001",
      name: "Carlos",
      email: "carlos@nachogym.com",
      emailVerified: true,
      role: "EMPLEADO",
      activo: true,
      accounts: {
        create: {
          id: "account-employee-001",
          accountId: "employee-001",
          providerId: "credential",
          password: hashedPassword,
        },
      },
    },
  });

  const employeeAndrew = await prisma.user.upsert({
    where: { email: "andrew@nachogym.com" },
    update: {},
    create: {
      id: "employee-002",
      name: "Andrew",
      email: "andrew@nachogym.com",
      emailVerified: true,
      role: "EMPLEADO",
      activo: true,
      accounts: {
        create: {
          id: "account-employee-002",
          accountId: "employee-002",
          providerId: "credential",
          password: hashedPassword,
        },
      },
    },
  });

  console.log("✅ Usuarios creados");

  // Socios con fechaFin calculada
  const socios = [
    {
      numeroSocio: "FN643",
      nombre: "VANESSA CORTES ROMERO",
      tipoMembresia: "MES_GENERAL",
      descripcionMembresia: "EFECTIVO MENSUALIDAD GENERAL ENE 2026",
      fechaInicio: new Date("2026-01-13"),
      fechaFin: new Date("2026-02-13"),
    },
    {
      numeroSocio: "FN671",
      nombre: "TANIA NERINA JIMENEZ PEÑA",
      tipoMembresia: "MES_ESTUDIANTE",
      descripcionMembresia: "EFECTIVO MENSUALIDAD ESTUDIANTE ENE 2026",
      fechaInicio: new Date("2026-01-13"),
      fechaFin: new Date("2026-02-13"),
    },
    {
      numeroSocio: "FN687",
      nombre: "GOLIAT ORTIZ LOPEZ",
      tipoMembresia: "SEMANA",
      descripcionMembresia: "EFECTIVO SEMANA ENE 2026",
      fechaInicio: new Date("2026-01-13"),
      fechaFin: new Date("2026-01-20"),
    },
    {
      numeroSocio: "FN389",
      nombre: "PAOLA VELAZQUEZ ORNELAS",
      tipoMembresia: "MES_GENERAL",
      descripcionMembresia: "EFECTIVO MENSUALIDAD GENERAL ENE 2026",
      fechaInicio: new Date("2026-01-13"),
      fechaFin: new Date("2026-02-13"),
    },
  ];

  for (const socio of socios) {
    await prisma.socio.upsert({
      where: { numeroSocio: socio.numeroSocio },
      update: {},
      create: socio,
    });
  }

  console.log("✅ Socios creados");

  // Productos
  const productos = [
    { nombre: "AGUA 1L", precio: 15.0 },
    { nombre: "AGUA CIEL 1.5L", precio: 25.0 },
    { nombre: "AGUA CIEL 600ML", precio: 10.0 },
    { nombre: "AGUA DE 1L", precio: 15.0 },
    { nombre: "GATORADE 500ML", precio: 22.0 },
    { nombre: "COCA COLA", precio: 18.0 },
    { nombre: "DELAWARE PUNCH 600", precio: 20.0 },
    { nombre: "MONSTER ENERGY", precio: 35.0 },
    { nombre: "MONSTER BLANCO", precio: 42.0 },
    { nombre: "RED BULL", precio: 38.0 },
    { nombre: "ELECTROLIT COCO", precio: 25.0 },
    { nombre: "ELECTROLIT NARANJA MANDARINA", precio: 25.0 },
    { nombre: "H2O POWER", precio: 25.0 },
    { nombre: "HIDRO PLEX ROMPOPE", precio: 30.0 },
    { nombre: "BARRA PROTEINA", precio: 45.0 },
    { nombre: "VISITA", precio: 50.0 },
    { nombre: "EFECTIVO SEMANA", precio: 180.0 },
    { nombre: "EFECTIVO MENSUALIDAD ESTUDIANTE", precio: 450.0 },
    { nombre: "EFECTIVO MENSUALIDAD GENERAL", precio: 540.0 },
  ];

  for (const producto of productos) {
    const esMembresia =
      producto.nombre.includes("EFECTIVO") || producto.nombre === "VISITA";
    await prisma.producto.upsert({
      where: { nombre: producto.nombre },
      update: { precioVenta: producto.precio },
      create: {
        nombre: producto.nombre,
        precioVenta: producto.precio,
        existenciaBodega: 0,
        existenciaGym: 0,
        existenciaMin: esMembresia ? 0 : 5,
        activo: true,
      },
    });
  }

  console.log("✅ Productos creados");

  // Inventario inicial
  const inventarioInicial = [
    { producto: "AGUA 1L", bodega: 20, gym: 13 },
    { producto: "AGUA CIEL 1.5L", bodega: 30, gym: 12 },
    { producto: "AGUA DE 1L", bodega: 15, gym: 9 },
    { producto: "COCA COLA", bodega: 18, gym: 5 },
    { producto: "ELECTROLIT COCO", bodega: 12, gym: 2 },
    { producto: "ELECTROLIT NARANJA MANDARINA", bodega: 15, gym: 3 },
    { producto: "H2O POWER", bodega: 10, gym: 2 },
    { producto: "HIDRO PLEX ROMPOPE", bodega: 8, gym: 1 },
    { producto: "BARRA PROTEINA", bodega: 20, gym: 3 },
    { producto: "DELAWARE PUNCH 600", bodega: 12, gym: 1 },
  ];

  for (const inv of inventarioInicial) {
    const producto = await prisma.producto.findFirst({
      where: { nombre: inv.producto },
    });

    if (producto) {
      await prisma.producto.update({
        where: { id: producto.id },
        data: {
          existenciaBodega: inv.bodega,
          existenciaGym: inv.gym,
        },
      });

      await prisma.inventario.create({
        data: {
          productoId: producto.id,
          tipo: "ENTRADA_BODEGA",
          ubicacion: "BODEGA",
          cantidad: inv.bodega,
          userId: adminNacho.id,
          observaciones: "Inventario inicial bodega",
        },
      });

      await prisma.inventario.create({
        data: {
          productoId: producto.id,
          tipo: "ENTRADA_GYM",
          ubicacion: "GYM",
          cantidad: inv.gym,
          userId: adminNacho.id,
          observaciones: "Inventario inicial gym",
        },
      });
    }
  }

  console.log("✅ Inventario inicial creado");

  // Corte FN-249
  const corte249 = await prisma.corte.create({
    data: {
      folio: "FN-249",
      cajeroId: adminNacho.id,
      fechaApertura: new Date("2026-01-13T09:25:00"),
      fechaCierre: new Date("2026-01-13T14:08:00"),
      fondoCaja: 500.0,
      cantidadTickets: 6,
      ventasMembresias: 0,
      ventasProductosTasa0: 1940.0,
      ventasProductosTasa16: 0,
      subtotal: 1890.0,
      iva: 50.0,
      totalVentas: 1940.0,
      efectivo: 1940.0,
      tarjetaDebito: 0,
      tarjetaCredito: 0,
      totalVoucher: 0,
      totalRetiros: 0,
      ventasCanceladas: 0,
      totalCaja: 2440.0,
      diferencia: 0,
      observaciones: "Turno mañana",
    },
  });

  console.log("✅ Corte creado");

  // Ventas del corte
  const ventas = [
    {
      ticket: "5780",
      socio: "FN643",
      producto: "EFECTIVO MENSUALIDAD GENERAL",
      usuario: employeeCarlos.id,
      fecha: new Date("2026-01-13T09:28:00"),
    },
    {
      ticket: "5781",
      socio: "FN671",
      producto: "EFECTIVO MENSUALIDAD ESTUDIANTE",
      usuario: employeeCarlos.id,
      fecha: new Date("2026-01-13T09:32:00"),
    },
    {
      ticket: "5782",
      socio: null,
      producto: "VISITA",
      usuario: employeeCarlos.id,
      fecha: new Date("2026-01-13T10:03:00"),
    },
    {
      ticket: "5783",
      socio: "FN687",
      producto: "EFECTIVO SEMANA",
      usuario: employeeCarlos.id,
      fecha: new Date("2026-01-13T10:20:00"),
    },
    {
      ticket: "5784",
      socio: "FN389",
      producto: "EFECTIVO MENSUALIDAD GENERAL",
      usuario: employeeCarlos.id,
      fecha: new Date("2026-01-13T13:29:00"),
    },
  ];

  for (const venta of ventas) {
    const producto = await prisma.producto.findFirst({
      where: { nombre: venta.producto },
    });

    let socioData = null;
    if (venta.socio) {
      socioData = await prisma.socio.findFirst({
        where: { numeroSocio: venta.socio },
      });
    }

    if (producto) {
      await prisma.inventario.create({
        data: {
          productoId: producto.id,
          tipo: "VENTA",
          ubicacion: "GYM",
          cantidad: -1,
          ticket: venta.ticket,
          socioId: socioData?.id,
          userId: venta.usuario,
          precioUnitario: producto.precioVenta,
          subtotal: producto.precioVenta,
          descuento: 0,
          cargo: 0,
          total: producto.precioVenta,
          formaPago: "EFECTIVO",
          corteId: corte249.id,
          fecha: venta.fecha,
          observaciones: `Venta a ${
            socioData ? socioData.nombre : "PUBLICO GENERAL"
          }`,
        },
      });
    }
  }

  console.log("✅ Ventas registradas");

  // Venta de producto físico
  const aguaCiel = await prisma.producto.findFirst({
    where: { nombre: "AGUA CIEL 1.5L" },
  });

  if (aguaCiel) {
    await prisma.inventario.create({
      data: {
        productoId: aguaCiel.id,
        tipo: "VENTA",
        ubicacion: "GYM",
        cantidad: -2,
        ticket: "5785",
        userId: employeeAndrew.id,
        precioUnitario: aguaCiel.precioVenta,
        subtotal: aguaCiel.precioVenta * 2,
        total: aguaCiel.precioVenta * 2,
        formaPago: "EFECTIVO",
        fecha: new Date("2026-01-13T14:00:00"),
        observaciones: "Venta de 2 aguas",
      },
    });

    await prisma.producto.update({
      where: { id: aguaCiel.id },
      data: { existenciaGym: aguaCiel.existenciaGym - 2 },
    });
  }

  // Traspaso BODEGA → GYM
  const cocaCola = await prisma.producto.findFirst({
    where: { nombre: "COCA COLA" },
  });

  if (cocaCola) {
    const cantidadTraspaso = 5;

    await prisma.inventario.create({
      data: {
        productoId: cocaCola.id,
        tipo: "TRASPASO_A_GYM",
        ubicacion: "GYM",
        cantidad: cantidadTraspaso,
        userId: adminNacho.id,
        observaciones: `Traspaso de ${cantidadTraspaso} unidades de BODEGA a GYM`,
      },
    });

    await prisma.producto.update({
      where: { id: cocaCola.id },
      data: {
        existenciaBodega: cocaCola.existenciaBodega - cantidadTraspaso,
        existenciaGym: cocaCola.existenciaGym + cantidadTraspaso,
      },
    });
  }

  // Ajuste de inventario
  const agua1L = await prisma.producto.findFirst({
    where: { nombre: "AGUA 1L" },
  });

  if (agua1L) {
    const ajuste = 4;

    await prisma.inventario.create({
      data: {
        productoId: agua1L.id,
        tipo: "AJUSTE",
        ubicacion: "GYM",
        cantidad: ajuste,
        userId: adminNacho.id,
        observaciones: "Ajuste de inventario - diferencia en conteo",
      },
    });

    await prisma.producto.update({
      where: { id: agua1L.id },
      data: { existenciaGym: agua1L.existenciaGym + ajuste },
    });
  }

  console.log("✅ Seed completado!");
  console.log("");
  console.log("🔑 Credenciales:");
  console.log("   Nacho (admin): nacho@nachogym.com / 123");
  console.log("   Carlos: carlos@nachogym.com / 123");
  console.log("   Andrew: andrew@nachogym.com / 123");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
