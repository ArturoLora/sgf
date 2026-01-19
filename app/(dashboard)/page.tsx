/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
} from "lucide-react";

async function getCorteActivo() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/cortes/activo`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getStatsDelDia() {
  const today = new Date().toISOString().split("T")[0];
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/inventario/movimientos?fechaInicio=${today}&fechaFin=${today}`,
      { cache: "no-store" },
    );
    if (!res.ok) return { ventas: 0, total: 0 };
    const data = await res.json();
    const ventas = data.filter((m: any) => m.tipo === "VENTA" && !m.cancelada);
    const total = ventas.reduce(
      (sum: number, v: any) => sum + Number(v.total || 0),
      0,
    );
    return { ventas: ventas.length, total };
  } catch {
    return { ventas: 0, total: 0 };
  }
}

async function getSociosVencidos() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/socios/vencidos`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getStockBajo() {
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/inventario/reporte/stock`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.bajoStock || [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [corteActivo, stats, sociosVencidos, stockBajo] = await Promise.all([
    getCorteActivo(),
    getStatsDelDia(),
    getSociosVencidos(),
    getStockBajo(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Resumen general del gimnasio</p>
      </div>

      {/* Alerta de Corte */}
      {corteActivo ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">
                  Corte Activo: {corteActivo.folio}
                </p>
                <p className="text-sm text-green-700">
                  Cajero: {corteActivo.cajero?.name} | Apertura:{" "}
                  {new Date(corteActivo.fechaApertura).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white">
              Tickets: {corteActivo.cantidadTickets || 0}
            </Badge>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <p className="font-semibold text-yellow-900">
              No hay corte activo. Debe abrir uno para registrar ventas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas del Día
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ventas}</div>
            <p className="text-xs text-gray-500">tickets registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total del Día</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.total.toFixed(2)}</div>
            <p className="text-xs text-gray-500">en ventas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Socios Vencidos
            </CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sociosVencidos.length}</div>
            <p className="text-xs text-gray-500">
              {sociosVencidos.length === 1 ? "socio" : "socios"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockBajo.length}</div>
            <p className="text-xs text-gray-500">
              {stockBajo.length === 1 ? "producto" : "productos"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {sociosVencidos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Socios con Membresía Vencida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sociosVencidos.slice(0, 5).map((socio: any) => (
                  <div
                    key={socio.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{socio.nombre}</p>
                      <p className="text-sm text-gray-500">
                        {socio.numeroSocio}
                      </p>
                    </div>
                    <Badge variant="destructive">Vencido</Badge>
                  </div>
                ))}
                {sociosVencidos.length > 5 && (
                  <p className="text-sm text-gray-500">
                    + {sociosVencidos.length - 5} más
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {stockBajo.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Productos con Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stockBajo.slice(0, 5).map((producto: any) => (
                  <div
                    key={producto.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{producto.nombre}</p>
                      <p className="text-sm text-gray-500">
                        Gym: {producto.existenciaGym} | Bodega:{" "}
                        {producto.existenciaBodega}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50">
                      Min: {producto.existenciaMin}
                    </Badge>
                  </div>
                ))}
                {stockBajo.length > 5 && (
                  <p className="text-sm text-gray-500">
                    + {stockBajo.length - 5} más
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
