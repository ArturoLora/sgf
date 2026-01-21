// app/(dashboard)/cortes/detalle-corte-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Package, DollarSign, CreditCard, Users } from "lucide-react";

interface DetalleCorteModalProps {
  corteId: number;
  onClose: () => void;
}

export default function DetalleCorteModal({
  corteId,
  onClose,
}: DetalleCorteModalProps) {
  const [corte, setCorte] = useState<any>(null);
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDetalle();
  }, [corteId]);

  const cargarDetalle = async () => {
    try {
      const [corteRes, resumenRes] = await Promise.all([
        fetch(`/api/cortes/${corteId}`),
        fetch(`/api/cortes/${corteId}/resumen`),
      ]);

      if (corteRes.ok) setCorte(await corteRes.json());
      if (resumenRes.ok) setResumen(await resumenRes.json());
    } catch (err) {
      console.error("Error al cargar detalle:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8 text-center">
            <p>Cargando detalle...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!corte) return null;

  // Calcular totales reales para cortes activos
  const esCorteActivo = !corte.fechaCierre;

  let totalVentasReal = Number(corte.totalVentas || 0);
  let efectivoReal = Number(corte.efectivo || 0);
  let tarjetaDebitoReal = Number(corte.tarjetaDebito || 0);
  let tarjetaCreditoReal = Number(corte.tarjetaCredito || 0);
  let ticketsReales = corte.cantidadTickets || 0;

  if (esCorteActivo && corte.inventarios) {
    const ventasActivas = corte.inventarios.filter((v: any) => !v.cancelada);

    totalVentasReal = ventasActivas.reduce(
      (sum: number, v: any) => sum + Number(v.total || 0),
      0,
    );

    efectivoReal = ventasActivas
      .filter((v: any) => v.formaPago === "EFECTIVO")
      .reduce((sum: number, v: any) => sum + Number(v.total || 0), 0);

    tarjetaDebitoReal = ventasActivas
      .filter((v: any) => v.formaPago === "TARJETA_DEBITO")
      .reduce((sum: number, v: any) => sum + Number(v.total || 0), 0);

    tarjetaCreditoReal = ventasActivas
      .filter((v: any) => v.formaPago === "TARJETA_CREDITO")
      .reduce((sum: number, v: any) => sum + Number(v.total || 0), 0);

    ticketsReales = new Set(ventasActivas.map((v: any) => v.ticket)).size;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* ✅ Header fijo con fondo sólido */}
        <CardHeader className="border-b bg-white rounded-t-xl shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                Detalle del Corte {corte.folio}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {corte.cajero.name} ·{" "}
                {new Date(corte.fechaApertura).toLocaleString()}
                {esCorteActivo && (
                  <Badge className="ml-2" variant="default">
                    Activo
                  </Badge>
                )}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* ✅ Contenido con scroll */}
        <CardContent className="space-y-6 p-6 overflow-y-auto">
          {/* Resumen General */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Tickets</p>
                    <p className="text-2xl font-bold">{ticketsReales}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Ventas</p>
                    <p className="text-2xl font-bold">
                      ${totalVentasReal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Efectivo</p>
                    <p className="text-2xl font-bold">
                      ${efectivoReal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Diferencia</p>
                    <p
                      className={`text-2xl font-bold ${
                        corte.diferencia === 0
                          ? "text-green-600"
                          : corte.diferencia > 0
                            ? "text-green-600"
                            : "text-red-600"
                      }`}
                    >
                      ${Number(corte.diferencia || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formas de Pago */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formas de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex justify-between p-3 rounded-lg bg-gray-50">
                  <span className="text-sm font-medium">Efectivo</span>
                  <span className="font-bold">${efectivoReal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-gray-50">
                  <span className="text-sm font-medium">Tarjeta Débito</span>
                  <span className="font-bold">
                    ${tarjetaDebitoReal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-gray-50">
                  <span className="text-sm font-medium">Tarjeta Crédito</span>
                  <span className="font-bold">
                    ${tarjetaCreditoReal.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Productos Vendidos */}
          {resumen?.productos?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Productos Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {resumen.productos.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.producto}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">x{item.cantidad}</Badge>
                        <span className="font-bold w-24 text-right">
                          ${Number(item.total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información Adicional */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Información de Caja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fondo Inicial:</span>
                  <span className="font-medium">
                    ${Number(corte.fondoCaja).toFixed(2)}
                  </span>
                </div>
                {corte.totalRetiros > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Retiros:</span>
                    <span className="font-medium text-red-600">
                      -${Number(corte.totalRetiros).toFixed(2)}
                    </span>
                  </div>
                )}
                {corte.fechaCierre && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total en Caja:</span>
                    <span className="font-medium">
                      ${Number(corte.totalCaja).toFixed(2)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fechas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Apertura:</span>
                  <span className="font-medium">
                    {new Date(corte.fechaApertura).toLocaleString()}
                  </span>
                </div>
                {corte.fechaCierre && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cierre:</span>
                    <span className="font-medium">
                      {new Date(corte.fechaCierre).toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {corte.observaciones && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{corte.observaciones}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
