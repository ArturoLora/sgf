# Servicios de Negocio - Sistema de Gimnasio

Servicios server-side para el sistema de gestión del gimnasio. Todos los servicios usan Prisma Client y están diseñados para ser usados en Next.js App Router con Server Actions o API Routes.

## 📁 Estructura

```
services/
├── usuarios.service.ts      # Gestión de usuarios (solo ADMIN)
├── socios.service.ts         # Gestión de socios y membresías
├── productos.service.ts      # Gestión de productos e inventario
├── inventario.service.ts     # Ventas, ajustes, traspasos y cancelaciones
├── cortes.service.ts         # Apertura y cierre de cortes de caja
├── reportes.service.ts       # Reportes y estadísticas
└── index.ts                  # Exportación centralizada
```

## 🔐 Control de Acceso

### Solo ADMIN
- `createUser`, `updateUser`, `toggleUserStatus`
- `cancelarCorte`

### ADMIN y EMPLEADO
- Todos los demás servicios

## 📋 Servicios Disponibles

### 1. Usuarios Service

**Funciones:**
- `getAllUsers()` - Lista todos los usuarios
- `getUserById(userId)` - Obtiene un usuario por ID
- `createUser(data, currentUserRole)` - Crea un usuario (solo ADMIN)
- `updateUser(userId, data, currentUserRole)` - Actualiza un usuario (solo ADMIN)
- `toggleUserStatus(userId, currentUserRole)` - Activa/desactiva usuario (solo ADMIN)
- `getActiveUsers()` - Lista usuarios activos

**Ejemplo de uso:**
```typescript
import { UsuariosService } from "@/services";

// En un Server Action o API Route
export async function crearUsuario(data: CreateUserInput) {
  const session = await auth(); // Tu lógica de auth
  
  const usuario = await UsuariosService.createUser(data, session.user.role);
  return usuario;
}
```

---

### 2. Socios Service

**Funciones:**
- `getAllSocios(params?)` - Lista socios con filtros opcionales
- `getSocioById(id)` - Obtiene un socio por ID con historial
- `getSocioByNumero(numeroSocio)` - Busca por número de socio
- `createSocio(data)` - Crea un nuevo socio
- `updateSocio(id, data)` - Actualiza un socio
- `toggleSocioStatus(id)` - Activa/desactiva socio
- `registrarVisita(socioId)` - Registra una visita del socio
- `getSociosActivos()` - Lista socios activos
- `getSociosPorVencer(dias)` - Socios con membresía por vencer
- `getEstadisticasSocios()` - Estadísticas generales

**Ejemplo de uso:**
```typescript
import { SociosService } from "@/services";

// Buscar socio por número
const socio = await SociosService.getSocioByNumero("FN643");

// Registrar visita
await SociosService.registrarVisita(socio.id);
```

---

### 3. Productos Service

**Funciones:**
- `getAllProductos(params?)` - Lista productos con filtros
- `getProductoById(id)` - Obtiene producto con historial de movimientos
- `createProducto(data)` - Crea un nuevo producto
- `updateProducto(id, data)` - Actualiza un producto
- `toggleProductoStatus(id)` - Activa/desactiva producto
- `getProductosActivos()` - Lista productos activos
- `getProductosBajoStock()` - Productos con stock bajo
- `getExistenciaProducto(productoId, ubicacion?)` - Consulta existencias
- `getProductosMembresia()` - Productos de tipo membresía
- `getProductosVenta()` - Productos físicos para venta
- `getEstadisticasProductos()` - Estadísticas generales

**Ejemplo de uso:**
```typescript
import { ProductosService } from "@/services";

// Obtener productos con bajo stock
const productosLowStock = await ProductosService.getProductosBajoStock();

// Verificar existencia
const existencia = await ProductosService.getExistenciaProducto(1, "GYM");
```

---

### 4. Inventario Service

**Funciones:**

#### Ventas
- `createVenta(data)` - Registra una venta y actualiza stock
- `cancelarVenta(data)` - Cancela una venta y restaura stock

#### Entradas
- `createEntrada(data)` - Registra entrada de productos (BODEGA o GYM)

#### Traspasos
- `createTraspaso(data)` - Traspasa productos entre BODEGA ↔ GYM

#### Ajustes
- `createAjuste(data)` - Ajusta inventario (+ o -)

#### Consultas
- `getMovimientosByProducto(productoId, limite?)` - Historial de un producto
- `getMovimientosByFecha(fechaInicio, fechaFin)` - Movimientos por período
- `getVentasByTicket(ticket)` - Ventas de un ticket
- `getVentasByCorte(corteId)` - Ventas de un corte
- `getVentasCanceladas(fechaInicio?, fechaFin?)` - Lista ventas canceladas

**Ejemplo de uso:**
```typescript
import { InventarioService } from "@/services";

// Registrar venta
const venta = await InventarioService.createVenta({
  productoId: 1,
  cantidad: 2,
  socioId: 5,
  userId: "admin-001",
  formaPago: "EFECTIVO",
  ticket: "5790",
  corteId: 10,
});

// Traspaso de BODEGA a GYM
const traspaso = await InventarioService.createTraspaso({
  productoId: 3,
  cantidad: 10,
  destino: "GYM",
  userId: "admin-001",
  observaciones: "Reabastecimiento semanal",
});

// Cancelar venta
const cancelacion = await InventarioService.cancelarVenta({
  inventarioId: venta.id,
  userId: "admin-001",
  motivoCancelacion: "Error en precio",
});
```

---

### 5. Cortes Service

**Funciones:**
- `abrirCorte(data)` - Abre un nuevo corte de caja
- `cerrarCorte(data)` - Cierra un corte y calcula totales
- `getCorteActivo()` - Obtiene el corte abierto actual
- `getCorteById(id)` - Obtiene un corte específico
- `getAllCortes(limite?)` - Lista todos los cortes
- `getCortesEntreFechas(fechaInicio, fechaFin)` - Cortes por período
- `getCortesPorCajero(cajeroId, limite?)` - Cortes de un cajero
- `getResumenVentasCorte(corteId)` - Resumen de ventas por producto
- `getResumenPorFormaPago(corteId)` - Resumen por forma de pago
- `getEstadisticasCortes(fechaInicio?, fechaFin?)` - Estadísticas generales
- `cancelarCorte(corteId, userRole)` - Cancela un corte (solo ADMIN)

**Ejemplo de uso:**
```typescript
import { CortesService } from "@/services";

// Abrir corte
const corte = await CortesService.abrirCorte({
  cajeroId: "employee-001",
  fondoCaja: 500,
  observaciones: "Turno matutino",
});

// Cerrar corte
const corteCerrado = await CortesService.cerrarCorte({
  corteId: corte.id,
  totalRetiros: 100,
  conceptoRetiros: "Pago a proveedor",
  totalCaja: 2340,
  observaciones: "Cierre normal",
});

// Obtener resumen de ventas
const resumen = await CortesService.getResumenVentasCorte(corte.id);
```

---

### 6. Reportes Service

**Funciones:**

#### Reportes de Ventas
- `getReporteVentasPorProducto(params)` - Ventas agrupadas por producto
- `getReporteVentasDiarias(params)` - Ventas diarias en un período
- `getReporteVentasPorFormaPago(params)` - Ventas por forma de pago
- `getReporteVentasCanceladas(params)` - Reporte de cancelaciones

#### Reportes de Inventario
- `getReporteMovimientosInventario(params)` - Todos los movimientos
- `getReporteStockActual()` - Estado actual del stock

#### Reportes de Socios
- `getReporteSociosPorMembresia()` - Socios agrupados por tipo
- `getReporteNuevosSocios(params)` - Nuevos registros en período
- `getReporteVisitasSocios(params)` - Visitas por socio

#### Reportes de Cortes
- `getReporteCortes(params)` - Cortes en un período con totales

#### Dashboard
- `getDashboardResumen(params?)` - Resumen general del día/período

**Ejemplo de uso:**
```typescript
import { ReportesService } from "@/services";

// Reporte de ventas del mes
const reporteVentas = await ReportesService.getReporteVentasPorProducto({
  fechaInicio: new Date("2026-01-01"),
  fechaFin: new Date("2026-01-31"),
});

// Dashboard del día actual
const dashboard = await ReportesService.getDashboardResumen();

// Stock actual
const stockReport = await ReportesService.getReporteStockActual();
```

---

## 🔄 Flujo Típico de Trabajo

### Apertura de Turno
```typescript
// 1. Abrir corte
const corte = await CortesService.abrirCorte({
  cajeroId: session.user.id,
  fondoCaja: 500,
});

// 2. El corte queda activo para registrar ventas
```

### Registro de Venta
```typescript
// 1. Buscar socio (opcional)
const socio = await SociosService.getSocioByNumero("FN643");

// 2. Obtener corte activo
const corteActivo = await CortesService.getCorteActivo();

// 3. Registrar venta
const venta = await InventarioService.createVenta({
  productoId: 18,
  cantidad: 1,
  socioId: socio.id,
  userId: session.user.id,
  formaPago: "EFECTIVO",
  ticket: "5800",
  corteId: corteActivo.id,
});

// 4. Registrar visita del socio
await SociosService.registrarVisita(socio.id);
```

### Cierre de Turno
```typescript
// 1. Obtener resumen
const resumen = await CortesService.getResumenVentasCorte(corte.id);

// 2. Cerrar corte
const corteCerrado = await CortesService.cerrarCorte({
  corteId: corte.id,
  totalRetiros: 0,
  totalCaja: 2500, // Lo que hay físicamente en caja
});

// 3. Revisar diferencia
console.log(corteCerrado.diferencia); // Debe ser 0 o cercano
```

### Gestión de Inventario
```typescript
// 1. Revisar productos con bajo stock
const lowStock = await ProductosService.getProductosBajoStock();

// 2. Hacer entrada a bodega
await InventarioService.createEntrada({
  productoId: 1,
  cantidad: 50,
  ubicacion: "BODEGA",
  userId: session.user.id,
  observaciones: "Compra semanal",
});

// 3. Traspasar a GYM
await InventarioService.createTraspaso({
  productoId: 1,
  cantidad: 20,
  destino: "GYM",
  userId: session.user.id,
});
```

---

## ⚠️ Reglas de Negocio Importantes

### Ventas
- Las ventas **siempre** se registran desde `GYM` (ubicacion: "GYM")
- La cantidad en ventas es **negativa** automáticamente
- Solo se puede vender si hay stock suficiente
- Al cancelar una venta, se restaura el stock

### Traspasos
- Solo se puede traspasar entre `BODEGA` ↔ `GYM`
- Se valida que exista stock suficiente en origen
- Se actualiza ambas ubicaciones automáticamente

### Ajustes
- Pueden ser positivos (+) o negativos (-)
- Requieren observación obligatoria
- Se valida que no resulten en existencias negativas

### Cortes
- Solo puede haber **un corte abierto** a la vez
- Un usuario solo puede tener **un corte abierto**
- Al cerrar se calculan automáticamente todos los totales
- La diferencia se calcula: `totalCaja - (fondoCaja + efectivo - retiros)`

### Stock
- `existenciaGym` - Stock disponible para venta
- `existenciaBodega` - Stock en almacén
- `existenciaMin` - Nivel mínimo de alerta

---

## 🛡️ Manejo de Errores

Todos los servicios lanzan errores descriptivos:

```typescript
try {
  const venta = await InventarioService.createVenta(data);
} catch (error) {
  // Errores típicos:
  // - "Producto no encontrado"
  // - "Stock insuficiente en GYM. Disponible: 5, Solicitado: 10"
  // - "Socio no encontrado"
  console.error(error.message);
}
```

---

## 📊 Tipos de Datos

Los tipos están definidos en cada servicio:

```typescript
// Importar tipos
import type { CreateVentaInput } from "@/services/inventario.service";
import type { AbrirCorteInput } from "@/services/cortes.service";
import type { ReportePeriodoParams } from "@/services/reportes.service";
```

---

## 🔌 Integración con Next.js

### Server Actions
```typescript
// app/actions/ventas.ts
"use server";

import { InventarioService } from "@/services";
import { auth } from "@/lib/auth"; // Tu sistema de auth

export async function registrarVenta(data: CreateVentaInput) {
  const session = await auth();
  
  if (!session) {
    throw new Error("No autorizado");
  }

  const venta = await InventarioService.createVenta({
    ...data,
    userId: session.user.id,
  });

  return venta;
}
```

### API Routes
```typescript
// app/api/productos/route.ts
import { NextResponse } from "next/server";
import { ProductosService } from "@/services";

export async function GET() {
  const productos = await ProductosService.getAllProductos();
  return NextResponse.json(productos);
}
```

---

## 📝 Notas Adicionales

1. **Prisma Client**: Todos los servicios usan la misma instancia de Prisma
2. **Transacciones**: Operaciones críticas usan `$transaction` para garantizar consistencia
3. **Decimal.js**: Se usa para cálculos monetarios precisos
4. **Validaciones**: Las validaciones están a nivel de servicio, no en el schema
5. **Includes**: Las consultas incluyen relaciones relevantes automáticamente

---

## 🚀 Próximos Pasos

Para usar estos servicios en tu aplicación:

1. Copiar la carpeta `services/` a tu proyecto Next.js
2. Configurar Better Auth para manejar la sesión
3. Crear Server Actions o API Routes que consuman estos servicios
4. Implementar el UI con los componentes que necesites

---

**Fecha de creación:** Enero 2026  
**Versión del schema:** Prisma 6.19.2  
**Compatible con:** Next.js 16.1+ (App Router)
