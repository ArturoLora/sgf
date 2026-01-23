"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowLeft, TrendingUp, TrendingDown, Package } from "lucide-react";

interface KardexProductoProps {
  productoId: number;
  onClose: () => void;
}

export default function KardexProducto({
  productoId,
  onClose,
}: KardexProductoProps) {
  const [producto, setProducto] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [productoId]);

  const cargarDatos = async () => {
    try {
      const [productoRes, movimientosRes] = await Promise.all([
        fetch(`/api/productos/${productoId}`),
        fetch(`/api/inventario/kardex/${productoId}`),
      ]);

      if (productoRes.ok) setProducto(await productoRes.json());
      if (movimientosRes.ok) setMovimientos(await movimientosRes.json());
    } catch (err) {
      console.error("Error al cargar kardex:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Cargando...</h1>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  if (!producto) return null;

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "VENTA":
        return "destructive";
      case "ENTRADA_BODEGA":
      case "ENTRADA_GYM":
        return "default";
      case "TRASPASO_A_GYM":
      case "TRASPASO_A_BODEGA":
        return "outline";
      case "AJUSTE":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kardex - {producto.nombre}</h1>
          <p className="text-gray-500">Historial completo de movimientos</p>
        </div>
        <Button variant="outline" onClick={onClose} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a Inventario
        </Button>
      </div>

      {/* Resumen Actual */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Stock Gym</p>
                <p className="text-2xl font-bold">{producto.existenciaGym}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Stock Bodega</p>
                <p className="text-2xl font-bold">
                  {producto.existenciaBodega}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Stock Total</p>
                <p className="text-2xl font-bold">
                  {producto.existenciaBodega + producto.existenciaGym}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600">Precio Venta</p>
              <p className="text-2xl font-bold">
                ${Number(producto.precioVenta).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Mínimo: {producto.existenciaMin}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          {movimientos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movimientos.map((mov) => (
                <div
                  key={mov.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={getTipoColor(mov.tipo) as any}>
                        {mov.tipo.replace("_", " ")}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {mov.ubicacion}
                      </span>
                      {mov.ticket && (
                        <Badge variant="outline">Ticket: {mov.ticket}</Badge>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Usuario:</span>{" "}
                        {mov.usuario.name}
                      </p>
                      <p>
                        <span className="font-medium">Fecha:</span>{" "}
                        {new Date(mov.fecha).toLocaleString()}
                      </p>
                      {mov.observaciones && (
                        <p className="text-gray-500 italic">
                          {mov.observaciones}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {mov.cantidad > 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                      <span
                        className={`text-2xl font-bold ${
                          mov.cantidad > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {mov.cantidad > 0 ? "+" : ""}
                        {mov.cantidad}
                      </span>
                    </div>
                    {mov.total && (
                      <p className="text-sm text-gray-500 mt-1">
                        ${Number(mov.total).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
