"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Receipt, User, CreditCard, Package } from "lucide-react";

interface DetalleVentaModalProps {
  ticket: string;
  onClose: () => void;
}

export default function DetalleVentaModal({
  ticket,
  onClose,
}: DetalleVentaModalProps) {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDetalle();
  }, [ticket]);

  const cargarDetalle = async () => {
    try {
      const res = await fetch(`/api/ventas/ticket/${ticket}`);
      if (res.ok) {
        const data = await res.json();
        setVentas(data);
      }
    } catch (err) {
      console.error("Error al cargar detalle:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <p>Cargando detalle...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (ventas.length === 0) return null;

  const primeraVenta = ventas[0];
  const totalVenta = ventas.reduce((sum, v) => sum + Number(v.total || 0), 0);
  const esCancelada = primeraVenta.cancelada;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-white rounded-t-xl shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Receipt className="h-6 w-6" />
                Ticket #{ticket}
                {esCancelada && <Badge variant="destructive">CANCELADA</Badge>}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(primeraVenta.fecha).toLocaleString()}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6 overflow-y-auto">
          {/* Información General */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <User className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Cajero</p>
                    <p className="font-semibold">{primeraVenta.usuario.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Forma de Pago</p>
                    <p className="font-semibold">
                      {primeraVenta.formaPago.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cliente */}
          {primeraVenta.socio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{primeraVenta.socio.nombre}</p>
                <p className="text-sm text-gray-600">
                  {primeraVenta.socio.numeroSocio}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Productos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ventas.map((venta, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{venta.producto.nombre}</p>
                      <p className="text-sm text-gray-600">
                        ${Number(venta.precioUnitario || 0).toFixed(2)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">
                        x{Math.abs(venta.cantidad)}
                      </Badge>
                      <span className="font-bold w-24 text-right">
                        ${Number(venta.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Total */}
          <Card className={esCancelada ? "border-red-200 bg-red-50" : ""}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span
                  className={`text-3xl font-bold ${
                    esCancelada ? "text-red-600" : ""
                  }`}
                >
                  ${totalVenta.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Observaciones */}
          {primeraVenta.observaciones && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  {primeraVenta.observaciones}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Info Cancelación */}
          {esCancelada && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-sm text-red-600">
                  Información de Cancelación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <strong>Motivo:</strong> {primeraVenta.motivoCancelacion}
                </p>
                <p className="text-sm text-gray-600">
                  Cancelada el:{" "}
                  {new Date(primeraVenta.fechaCancelacion).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
