// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ==================== USUARIOS ====================
  console.log("\n📋 Creando usuarios...");

  const users = [
    {
      name: "Nacho",
      email: "nacho@nachogym.com",
      password: "123",
      role: "ADMIN",
    },
    {
      name: "Carlos",
      email: "carlos@nachogym.com",
      password: "123",
      role: "EMPLEADO",
    },
    {
      name: "Andrew",
      email: "andrew@nachogym.com",
      password: "123",
      role: "EMPLEADO",
    },
  ];

  for (const userData of users) {
    try {
      await auth.api.signUpEmail({
        body: {
          name: userData.name,
          email: userData.email,
          password: userData.password,
        },
      });
      console.log(`✅ ${userData.name} creado`);
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log(`ℹ️  ${userData.name} ya existe`);
      } else {
        throw e;
      }
    }
  }

  // Actualizar roles
  for (const userData of users) {
    await prisma.user.update({
      where: { email: userData.email },
      data: { role: userData.role, isActive: true },
    });
  }
  console.log("✅ Roles actualizados");

  // Obtener IDs de usuarios
  const adminNacho = await prisma.user.findUnique({
    where: { email: "nacho@nachogym.com" },
  });
  const employeeCarlos = await prisma.user.findUnique({
    where: { email: "carlos@nachogym.com" },
  });
  const employeeAndrew = await prisma.user.findUnique({
    where: { email: "andrew@nachogym.com" },
  });

  if (!adminNacho || !employeeCarlos || !employeeAndrew) {
    throw new Error("No se pudieron crear los usuarios");
  }

  // ==================== PRODUCTOS ====================
  console.log("\n📦 Creando productos...");

  const productosData = [
    // Bebidas
    { name: "AGUA 1L", price: 15.0, minStock: 10 },
    { name: "AGUA CIEL 1.5L", price: 25.0, minStock: 8 },
    { name: "AGUA CIEL 600ML", price: 10.0, minStock: 15 },
    { name: "GATORADE 500ML", price: 22.0, minStock: 10 },
    { name: "COCA COLA", price: 18.0, minStock: 12 },
    { name: "DELAWARE PUNCH 600", price: 20.0, minStock: 8 },
    { name: "POWERADE 600ML", price: 20.0, minStock: 10 },

    // Energéticas
    { name: "MONSTER ENERGY", price: 35.0, minStock: 6 },
    { name: "MONSTER BLANCO", price: 42.0, minStock: 4 },
    { name: "RED BULL", price: 38.0, minStock: 6 },

    // Hidratantes
    { name: "ELECTROLIT COCO", price: 25.0, minStock: 8 },
    { name: "ELECTROLIT NARANJA MANDARINA", price: 25.0, minStock: 8 },
    { name: "H2O POWER", price: 25.0, minStock: 6 },
    { name: "HIDRO PLEX ROMPOPE", price: 30.0, minStock: 4 },

    // Snacks
    { name: "BARRA PROTEINA", price: 45.0, minStock: 10 },
    { name: "GALLETAS PROTEINA", price: 35.0, minStock: 8 },
    { name: "CREATINA MONOHIDRATADA", price: 350.0, minStock: 3 },
    { name: "PROTEINA WHEY 1KG", price: 680.0, minStock: 2 },

    // Membresías
    { name: "VISITA", price: 50.0, minStock: 0 },
    { name: "EFECTIVO SEMANA", price: 180.0, minStock: 0 },
    { name: "EFECTIVO MENSUALIDAD ESTUDIANTE", price: 450.0, minStock: 0 },
    { name: "EFECTIVO MENSUALIDAD GENERAL", price: 540.0, minStock: 0 },
    { name: "EFECTIVO TRIMESTRE ESTUDIANTE", price: 1215.0, minStock: 0 },
    { name: "EFECTIVO TRIMESTRE GENERAL", price: 1458.0, minStock: 0 },
    { name: "EFECTIVO ANUAL ESTUDIANTE", price: 4320.0, minStock: 0 },
    { name: "EFECTIVO ANUAL GENERAL", price: 5184.0, minStock: 0 },
  ];

  for (const product of productosData) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: { salePrice: product.price },
      create: {
        name: product.name,
        salePrice: product.price,
        warehouseStock: 0,
        gymStock: 0,
        minStock: product.minStock,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${productosData.length} productos creados`);

  // ==================== INVENTARIO INICIAL ====================
  console.log("\n📊 Estableciendo inventario inicial...");

  const inventarioInicial = [
    { product: "AGUA 1L", warehouse: 30, gym: 20 },
    { product: "AGUA CIEL 1.5L", warehouse: 40, gym: 15 },
    { product: "AGUA CIEL 600ML", warehouse: 50, gym: 25 },
    { product: "GATORADE 500ML", warehouse: 24, gym: 12 },
    { product: "COCA COLA", warehouse: 30, gym: 15 },
    { product: "DELAWARE PUNCH 600", warehouse: 20, gym: 10 },
    { product: "POWERADE 600ML", warehouse: 24, gym: 12 },
    { product: "MONSTER ENERGY", warehouse: 12, gym: 6 },
    { product: "MONSTER BLANCO", warehouse: 8, gym: 4 },
    { product: "RED BULL", warehouse: 12, gym: 6 },
    { product: "ELECTROLIT COCO", warehouse: 16, gym: 8 },
    { product: "ELECTROLIT NARANJA MANDARINA", warehouse: 16, gym: 8 },
    { product: "H2O POWER", warehouse: 12, gym: 6 },
    { product: "HIDRO PLEX ROMPOPE", warehouse: 10, gym: 4 },
    { product: "BARRA PROTEINA", warehouse: 30, gym: 15 },
    { product: "GALLETAS PROTEINA", warehouse: 20, gym: 10 },
    { product: "CREATINA MONOHIDRATADA", warehouse: 6, gym: 2 },
    { product: "PROTEINA WHEY 1KG", warehouse: 4, gym: 2 },
  ];

  for (const inv of inventarioInicial) {
    const product = await prisma.product.findFirst({
      where: { name: inv.product },
    });

    if (product) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          warehouseStock: inv.warehouse,
          gymStock: inv.gym,
        },
      });

      // Entrada a bodega
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "WAREHOUSE_ENTRY",
          location: "WAREHOUSE",
          quantity: inv.warehouse,
          userId: adminNacho.id,
          notes: "Inventario inicial bodega",
          date: new Date("2026-01-10T08:00:00"),
        },
      });

      // Entrada a gym
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "GYM_ENTRY",
          location: "GYM",
          quantity: inv.gym,
          userId: adminNacho.id,
          notes: "Inventario inicial gym",
          date: new Date("2026-01-10T08:30:00"),
        },
      });
    }
  }
  console.log("✅ Inventario inicial establecido");

  // ==================== SOCIOS ====================
  console.log("\n👥 Creando socios...");

  const sociosData = [
    {
      memberNumber: "FN643",
      name: "VANESSA CORTES ROMERO",
      phone: "311-555-0101",
      email: "vanessa.cortes@email.com",
      membershipType: "MONTH_GENERAL",
      membershipDescription: "EFECTIVO MENSUALIDAD GENERAL ENE 2026",
      startDate: new Date("2026-01-13"),
      endDate: new Date("2026-02-13"),
    },
    {
      memberNumber: "FN671",
      name: "TANIA NERINA JIMENEZ PEÑA",
      phone: "311-555-0102",
      email: "tania.jimenez@email.com",
      membershipType: "MONTH_STUDENT",
      membershipDescription: "EFECTIVO MENSUALIDAD ESTUDIANTE ENE 2026",
      startDate: new Date("2026-01-13"),
      endDate: new Date("2026-02-13"),
    },
    {
      memberNumber: "FN687",
      name: "GOLIAT ORTIZ LOPEZ",
      phone: "311-555-0103",
      membershipType: "WEEK",
      membershipDescription: "EFECTIVO SEMANA ENE 2026",
      startDate: new Date("2026-01-13"),
      endDate: new Date("2026-01-20"),
    },
    {
      memberNumber: "FN389",
      name: "PAOLA VELAZQUEZ ORNELAS",
      phone: "311-555-0104",
      email: "paola.velazquez@email.com",
      membershipType: "MONTH_GENERAL",
      membershipDescription: "EFECTIVO MENSUALIDAD GENERAL ENE 2026",
      startDate: new Date("2026-01-13"),
      endDate: new Date("2026-02-13"),
    },
    {
      memberNumber: "FN512",
      name: "ROBERTO MARTINEZ CRUZ",
      phone: "311-555-0105",
      membershipType: "QUARTER_GENERAL",
      membershipDescription: "EFECTIVO TRIMESTRE GENERAL ENE 2026",
      startDate: new Date("2026-01-11"),
      endDate: new Date("2026-04-11"),
    },
    {
      memberNumber: "FN598",
      name: "MARIA FERNANDA LOPEZ",
      phone: "311-555-0106",
      email: "mafe.lopez@email.com",
      membershipType: "MONTH_STUDENT",
      membershipDescription: "EFECTIVO MENSUALIDAD ESTUDIANTE ENE 2026",
      startDate: new Date("2026-01-12"),
      endDate: new Date("2026-02-12"),
    },
    {
      memberNumber: "FN723",
      name: "JORGE ALBERTO RAMIREZ",
      phone: "311-555-0107",
      membershipType: "ANNUAL_GENERAL",
      membershipDescription: "EFECTIVO ANUAL GENERAL ENE 2026",
      startDate: new Date("2026-01-10"),
      endDate: new Date("2027-01-10"),
    },
    {
      memberNumber: "FN801",
      name: "DIANA PATRICIA MORALES",
      phone: "311-555-0108",
      email: "diana.morales@email.com",
      membershipType: "MONTH_GENERAL",
      membershipDescription: "EFECTIVO MENSUALIDAD GENERAL ENE 2026",
      startDate: new Date("2026-01-14"),
      endDate: new Date("2026-02-14"),
    },
  ];

  for (const socio of sociosData) {
    await prisma.member.upsert({
      where: { memberNumber: socio.memberNumber },
      update: {},
      create: socio,
    });
  }
  console.log(`✅ ${sociosData.length} socios creados`);

  // ==================== CORTE 1 (11 de enero) ====================
  console.log("\n💰 Creando corte 1 (11 de enero)...");

  const shift1 = await prisma.shift.create({
    data: {
      folio: "FN-247",
      cashierId: adminNacho.id,
      openingDate: new Date("2026-01-11T09:00:00"),
      closingDate: new Date("2026-01-11T15:00:00"),
      initialCash: 500.0,
      ticketCount: 5,
      membershipSales: 6399.0,
      productSales0Tax: 175.0,
      productSales16Tax: 0,
      subtotal: 6574.0,
      tax: 0,
      totalSales: 6574.0,
      cashAmount: 6574.0,
      debitCardAmount: 0,
      creditCardAmount: 0,
      totalVoucher: 0,
      totalWithdrawals: 0,
      totalCash: 7074.0,
      difference: 0,
      notes: "Turno mañana - Sábado",
    },
  });

  // Ventas del corte 1
  const ventas1 = [
    {
      ticket: "5770",
      member: "FN512",
      product: "EFECTIVO TRIMESTRE GENERAL",
      user: adminNacho.id,
      time: "09:15:00",
    },
    {
      ticket: "5771",
      member: "FN723",
      product: "EFECTIVO ANUAL GENERAL",
      user: employeeCarlos.id,
      time: "09:45:00",
    },
    {
      ticket: "5772",
      member: "FN598",
      product: "EFECTIVO MENSUALIDAD ESTUDIANTE",
      user: employeeCarlos.id,
      time: "10:30:00",
    },
    {
      ticket: "5773",
      member: null,
      product: "VISITA",
      user: adminNacho.id,
      time: "11:15:00",
    },
  ];

  for (const venta of ventas1) {
    const product = await prisma.product.findFirst({
      where: { name: venta.product },
    });

    let memberData = null;
    if (venta.member) {
      memberData = await prisma.member.findFirst({
        where: { memberNumber: venta.member },
      });
    }

    if (product) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "SALE",
          location: "GYM",
          quantity: -1,
          ticket: venta.ticket,
          memberId: memberData?.id,
          userId: venta.user,
          unitPrice: product.salePrice,
          subtotal: product.salePrice,
          discount: 0,
          surcharge: 0,
          total: product.salePrice,
          paymentMethod: "CASH",
          shiftId: shift1.id,
          date: new Date(`2026-01-11T${venta.time}`),
          notes: `Venta a ${memberData ? memberData.name : "PUBLICO GENERAL"}`,
        },
      });
    }
  }

  // Venta de productos físicos corte 1
  const agua = await prisma.product.findFirst({
    where: { name: "AGUA CIEL 1.5L" },
  });

  if (agua) {
    await prisma.inventoryMovement.create({
      data: {
        productId: agua.id,
        type: "SALE",
        location: "GYM",
        quantity: -3,
        ticket: "5774",
        userId: employeeAndrew.id,
        unitPrice: agua.salePrice,
        subtotal: agua.salePrice.toNumber() * 3,
        total: agua.salePrice.toNumber() * 3,
        paymentMethod: "CASH",
        shiftId: shift1.id,
        date: new Date("2026-01-11T14:00:00"),
        notes: "Venta de 3 aguas",
      },
    });

    await prisma.product.update({
      where: { id: agua.id },
      data: { gymStock: { decrement: 3 } },
    });
  }

  const gatorade = await prisma.product.findFirst({
    where: { name: "GATORADE 500ML" },
  });

  if (gatorade) {
    await prisma.inventoryMovement.create({
      data: {
        productId: gatorade.id,
        type: "SALE",
        location: "GYM",
        quantity: -2,
        ticket: "5774",
        userId: employeeAndrew.id,
        unitPrice: gatorade.salePrice,
        subtotal: gatorade.salePrice.toNumber() * 2,
        total: gatorade.salePrice.toNumber() * 2,
        paymentMethod: "CASH",
        shiftId: shift1.id,
        date: new Date("2026-01-11T14:00:00"),
        notes: "Venta de 2 gatorades",
      },
    });

    await prisma.product.update({
      where: { id: gatorade.id },
      data: { gymStock: { decrement: 2 } },
    });
  }

  console.log("✅ Corte 1 completado");

  // ==================== CORTE 2 (12 de enero) ====================
  console.log("\n💰 Creando corte 2 (12 de enero)...");

  const shift2 = await prisma.shift.create({
    data: {
      folio: "FN-248",
      cashierId: employeeCarlos.id,
      openingDate: new Date("2026-01-12T09:00:00"),
      closingDate: new Date("2026-01-12T14:30:00"),
      initialCash: 500.0,
      ticketCount: 4,
      membershipSales: 450.0,
      productSales0Tax: 132.0,
      productSales16Tax: 0,
      subtotal: 582.0,
      tax: 0,
      totalSales: 582.0,
      cashAmount: 582.0,
      debitCardAmount: 0,
      creditCardAmount: 0,
      totalVoucher: 0,
      totalWithdrawals: 0,
      totalCash: 1082.0,
      difference: 0,
      notes: "Turno tarde - Domingo",
    },
  });

  const ventas2 = [
    {
      ticket: "5775",
      member: "FN598",
      product: "EFECTIVO MENSUALIDAD ESTUDIANTE",
      user: employeeCarlos.id,
      time: "09:30:00",
    },
  ];

  for (const venta of ventas2) {
    const product = await prisma.product.findFirst({
      where: { name: venta.product },
    });

    const memberData = await prisma.member.findFirst({
      where: { memberNumber: venta.member },
    });

    if (product && memberData) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "SALE",
          location: "GYM",
          quantity: -1,
          ticket: venta.ticket,
          memberId: memberData.id,
          userId: venta.user,
          unitPrice: product.salePrice,
          subtotal: product.salePrice,
          discount: 0,
          surcharge: 0,
          total: product.salePrice,
          paymentMethod: "CASH",
          shiftId: shift2.id,
          date: new Date(`2026-01-12T${venta.time}`),
          notes: `Venta a ${memberData.name}`,
        },
      });
    }
  }

  // Ventas de productos varios
  const productosVenta2 = [
    { name: "BARRA PROTEINA", qty: 2, ticket: "5776" },
    { name: "ELECTROLIT COCO", qty: 2, ticket: "5777" },
    { name: "MONSTER ENERGY", qty: 1, ticket: "5778" },
  ];

  for (const pv of productosVenta2) {
    const product = await prisma.product.findFirst({
      where: { name: pv.name },
    });

    if (product) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "SALE",
          location: "GYM",
          quantity: -pv.qty,
          ticket: pv.ticket,
          userId: employeeAndrew.id,
          unitPrice: product.salePrice,
          subtotal: product.salePrice.toNumber() * pv.qty,
          total: product.salePrice.toNumber() * pv.qty,
          paymentMethod: "CASH",
          shiftId: shift2.id,
          date: new Date("2026-01-12T11:00:00"),
          notes: `Venta de ${pv.qty} ${pv.name}`,
        },
      });

      await prisma.product.update({
        where: { id: product.id },
        data: { gymStock: { decrement: pv.qty } },
      });
    }
  }

  console.log("✅ Corte 2 completado");

  // ==================== CORTE 3 (13 de enero) ====================
  console.log("\n💰 Creando corte 3 (13 de enero)...");

  const shift3 = await prisma.shift.create({
    data: {
      folio: "FN-249",
      cashierId: adminNacho.id,
      openingDate: new Date("2026-01-13T09:25:00"),
      closingDate: new Date("2026-01-13T14:08:00"),
      initialCash: 500.0,
      ticketCount: 6,
      membershipSales: 0,
      productSales0Tax: 1940.0,
      productSales16Tax: 0,
      subtotal: 1890.0,
      tax: 50.0,
      totalSales: 1940.0,
      cashAmount: 1940.0,
      debitCardAmount: 0,
      creditCardAmount: 0,
      totalVoucher: 0,
      totalWithdrawals: 0,
      totalCash: 2440.0,
      difference: 0,
      notes: "Turno mañana",
    },
  });

  const ventas3 = [
    {
      ticket: "5780",
      member: "FN643",
      product: "EFECTIVO MENSUALIDAD GENERAL",
      user: employeeCarlos.id,
      time: "09:28:00",
    },
    {
      ticket: "5781",
      member: "FN671",
      product: "EFECTIVO MENSUALIDAD ESTUDIANTE",
      user: employeeCarlos.id,
      time: "09:32:00",
    },
    {
      ticket: "5782",
      member: null,
      product: "VISITA",
      user: employeeCarlos.id,
      time: "10:03:00",
    },
    {
      ticket: "5783",
      member: "FN687",
      product: "EFECTIVO SEMANA",
      user: employeeCarlos.id,
      time: "10:20:00",
    },
    {
      ticket: "5784",
      member: "FN389",
      product: "EFECTIVO MENSUALIDAD GENERAL",
      user: employeeCarlos.id,
      time: "13:29:00",
    },
  ];

  for (const venta of ventas3) {
    const product = await prisma.product.findFirst({
      where: { name: venta.product },
    });

    let memberData = null;
    if (venta.member) {
      memberData = await prisma.member.findFirst({
        where: { memberNumber: venta.member },
      });
    }

    if (product) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "SALE",
          location: "GYM",
          quantity: -1,
          ticket: venta.ticket,
          memberId: memberData?.id,
          userId: venta.user,
          unitPrice: product.salePrice,
          subtotal: product.salePrice,
          discount: 0,
          surcharge: 0,
          total: product.salePrice,
          paymentMethod: "CASH",
          shiftId: shift3.id,
          date: new Date(`2026-01-13T${venta.time}`),
          notes: `Venta a ${memberData ? memberData.name : "PUBLICO GENERAL"}`,
        },
      });
    }
  }

  // Venta de producto físico
  const aguaCiel = await prisma.product.findFirst({
    where: { name: "AGUA CIEL 1.5L" },
  });

  if (aguaCiel) {
    await prisma.inventoryMovement.create({
      data: {
        productId: aguaCiel.id,
        type: "SALE",
        location: "GYM",
        quantity: -2,
        ticket: "5785",
        userId: employeeAndrew.id,
        unitPrice: aguaCiel.salePrice,
        subtotal: aguaCiel.salePrice.toNumber() * 2,
        total: aguaCiel.salePrice.toNumber() * 2,
        paymentMethod: "CASH",
        shiftId: shift3.id,
        date: new Date("2026-01-13T14:00:00"),
        notes: "Venta de 2 aguas",
      },
    });

    await prisma.product.update({
      where: { id: aguaCiel.id },
      data: { gymStock: { decrement: 2 } },
    });
  }

  console.log("✅ Corte 3 completado");

  // ==================== CORTE 4 (14 de enero) ====================
  console.log("\n💰 Creando corte 4 (14 de enero)...");

  const shift4 = await prisma.shift.create({
    data: {
      folio: "FN-250",
      cashierId: employeeCarlos.id,
      openingDate: new Date("2026-01-14T09:00:00"),
      closingDate: new Date("2026-01-14T15:30:00"),
      initialCash: 500.0,
      ticketCount: 7,
      membershipSales: 540.0,
      productSales0Tax: 287.0,
      productSales16Tax: 0,
      subtotal: 827.0,
      tax: 0,
      totalSales: 827.0,
      cashAmount: 627.0,
      debitCardAmount: 200.0,
      creditCardAmount: 0,
      totalVoucher: 200.0,
      totalWithdrawals: 0,
      totalCash: 1127.0,
      difference: 0,
      notes: "Turno completo",
    },
  });

  const ventas4 = [
    {
      ticket: "5786",
      member: "FN801",
      product: "EFECTIVO MENSUALIDAD GENERAL",
      user: employeeCarlos.id,
      payment: "CASH",
      time: "09:30:00",
    },
    {
      ticket: "5787",
      member: null,
      product: "VISITA",
      user: employeeAndrew.id,
      payment: "CASH",
      time: "10:15:00",
    },
    {
      ticket: "5788",
      member: null,
      product: "VISITA",
      user: employeeCarlos.id,
      payment: "CASH",
      time: "11:00:00",
    },
  ];

  for (const venta of ventas4) {
    const product = await prisma.product.findFirst({
      where: { name: venta.product },
    });

    let memberData = null;
    if (venta.member) {
      memberData = await prisma.member.findFirst({
        where: { memberNumber: venta.member },
      });
    }

    if (product) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "SALE",
          location: "GYM",
          quantity: -1,
          ticket: venta.ticket,
          memberId: memberData?.id,
          userId: venta.user,
          unitPrice: product.salePrice,
          subtotal: product.salePrice,
          discount: 0,
          surcharge: 0,
          total: product.salePrice,
          paymentMethod: venta.payment as any,
          shiftId: shift4.id,
          date: new Date(`2026-01-14T${venta.time}`),
          notes: `Venta a ${memberData ? memberData.name : "PUBLICO GENERAL"}`,
        },
      });
    }
  }

  // Ventas con tarjeta
  const productosVenta4 = [
    {
      name: "PROTEINA WHEY 1KG",
      qty: 1,
      ticket: "5789",
      payment: "DEBIT_CARD",
    },
    { name: "RED BULL", qty: 2, ticket: "5790", payment: "CASH" },
    { name: "BARRA PROTEINA", qty: 3, ticket: "5791", payment: "CASH" },
  ];

  for (const pv of productosVenta4) {
    const product = await prisma.product.findFirst({
      where: { name: pv.name },
    });

    if (product) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "SALE",
          location: "GYM",
          quantity: -pv.qty,
          ticket: pv.ticket,
          userId: employeeAndrew.id,
          unitPrice: product.salePrice,
          subtotal: product.salePrice.toNumber() * pv.qty,
          total: product.salePrice.toNumber() * pv.qty,
          paymentMethod: pv.payment as any,
          shiftId: shift4.id,
          date: new Date("2026-01-14T13:00:00"),
          notes: `Venta de ${pv.qty} ${pv.name}`,
        },
      });

      await prisma.product.update({
        where: { id: product.id },
        data: { gymStock: { decrement: pv.qty } },
      });
    }
  }

  console.log("✅ Corte 4 completado");

  // ==================== MOVIMIENTOS DE INVENTARIO ====================
  console.log("\n📦 Creando movimientos de inventario...");

  // Traspaso BODEGA → GYM
  const cocaCola = await prisma.product.findFirst({
    where: { name: "COCA COLA" },
  });

  if (cocaCola) {
    const transferQty = 10;

    await prisma.inventoryMovement.create({
      data: {
        productId: cocaCola.id,
        type: "TRANSFER_TO_GYM",
        location: "GYM",
        quantity: transferQty,
        userId: adminNacho.id,
        date: new Date("2026-01-13T16:00:00"),
        notes: `Traspaso de ${transferQty} unidades de BODEGA a GYM`,
      },
    });

    await prisma.product.update({
      where: { id: cocaCola.id },
      data: {
        warehouseStock: { decrement: transferQty },
        gymStock: { increment: transferQty },
      },
    });
  }

  // Ajuste de inventario
  const agua1L = await prisma.product.findFirst({
    where: { name: "AGUA 1L" },
  });

  if (agua1L) {
    const adjustment = -3;

    await prisma.inventoryMovement.create({
      data: {
        productId: agua1L.id,
        type: "ADJUSTMENT",
        location: "GYM",
        quantity: adjustment,
        userId: adminNacho.id,
        date: new Date("2026-01-14T17:00:00"),
        notes: "Ajuste por rotura de envases",
      },
    });

    await prisma.product.update({
      where: { id: agua1L.id },
      data: { gymStock: { increment: adjustment } },
    });
  }

  // Entrada de producto
  const creatina = await prisma.product.findFirst({
    where: { name: "CREATINA MONOHIDRATADA" },
  });

  if (creatina) {
    const entryQty = 5;

    await prisma.inventoryMovement.create({
      data: {
        productId: creatina.id,
        type: "WAREHOUSE_ENTRY",
        location: "WAREHOUSE",
        quantity: entryQty,
        userId: adminNacho.id,
        date: new Date("2026-01-15T10:00:00"),
        notes: "Entrada de proveedor - Factura #12345",
      },
    });

    await prisma.product.update({
      where: { id: creatina.id },
      data: { warehouseStock: { increment: entryQty } },
    });
  }

  console.log("✅ Movimientos de inventario creados");

  // ==================== RESUMEN ====================
  console.log("\n✅ Seed completado exitosamente!");
  console.log("");
  console.log("📊 Resumen:");
  console.log("   👤 3 usuarios creados");
  console.log(`   📦 ${productosData.length} productos creados`);
  console.log(`   👥 ${sociosData.length} socios creados`);
  console.log("   💰 4 cortes creados");
  console.log("   🔄 Múltiples movimientos de inventario");
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
