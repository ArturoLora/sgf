"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Edit,
  Package,
  DollarSign,
  TrendingUp,
  ArrowLeftRight,
  Settings,
  Activity,
} from "lucide-react";

interface DetalleProductoModalProps {
  productoId: number;
  onClose: () => void;
  onEditar: (productoId: number) => void;
  onTraspaso: (productoId: number) => void;
  onAjuste: (productoId: number) => void;
  onEntrada: (productoId: number) => void;
}

export default function DetalleProductoModal({
  productoId,
  onClose,
  onEditar,
  onTraspaso,
  onAjuste,
  onEntrada,
}: DetalleProductoModalProps) {
  const [producto, setProducto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const ITEMS_POR_PAGINA = 5;

  useEffect(() => {
    cargarProducto();
  }, [productoId]);

  const cargarProducto = async () => {
    try {
      const res = await fetch(`/api/productos/${productoId}`);
      if (res.ok) {
        const data = await res.json();
        setProducto(data);
      }
    } catch (err) {
      console.error("Error al cargar producto:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-3xl">
          <CardContent className="p-8 text-center">
            <p>Cargando información...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!producto) return null;

  const esMembresia =
    producto.nombre.includes("EFECTIVO") ||
    producto.nombre === "VISITA" ||
    producto.nombre.includes("MENSUALIDAD") ||
    producto.nombre.includes("SEMANA");

  const bajoStockGym = producto.existenciaGym < producto.existenciaMin;
  const bajoStockBodega = producto.existenciaBodega < producto.existenciaMin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-white rounded-t-xl shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{producto.nombre}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                {!producto.activo && (
                  <Badge variant="destructive">Inactivo</Badge>
                )}
                {esMembresia && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    Membresía
                  </Badge>
                )}
                {(bajoStockGym || bajoStockBodega) && !esMembresia && (
                  <Badge variant="destructive">Stock Bajo</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!esMembresia && (
                <>
                  <Button
                    onClick={() => onEntrada(productoId)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Entrada
                  </Button>
                  <Button
                    onClick={() => onTraspaso(productoId)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    Traspaso
                  </Button>
                  <Button
                    onClick={() => onAjuste(productoId)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Ajuste
                  </Button>
                </>
              )}
              <Button
                onClick={() => onEditar(productoId)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6 overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Precio</p>
                    <p className="text-2xl font-bold">
                      ${Number(producto.precioVenta).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!esMembresia && (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Package className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Stock Gym</p>
                        <p
                          className={`text-2xl font-bold ${
                            bajoStockGym ? "text-red-600" : ""
                          }`}
                        >
                          {producto.existenciaGym}
                        </p>
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
                        <p
                          className={`text-2xl font-bold ${
                            bajoStockBodega ? "text-red-600" : ""
                          }`}
                        >
                          {producto.existenciaBodega}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {!esMembresia && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Información de Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock Mínimo:</span>
                  <span className="font-medium">{producto.existenciaMin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">
                    {producto.existenciaBodega + producto.existenciaGym}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Total:</span>
                  <span className="font-bold">
                    $
                    {(
                      Number(producto.precioVenta) *
                      (producto.existenciaBodega + producto.existenciaGym)
                    ).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {producto.inventarios && producto.inventarios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Movimientos Recientes
                  </span>
                  <span className="text-xs font-normal text-gray-500">
                    {producto.inventarios.length} registros
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {producto.inventarios
                    .slice(
                      (paginaHistorial - 1) * ITEMS_POR_PAGINA,
                      paginaHistorial * ITEMS_POR_PAGINA,
                    )
                    .map((mov: any) => (
                      <div
                        key={mov.id}
                        className="flex items-center justify-between p-2 rounded border text-sm"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {mov.tipo.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {mov.usuario.name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(mov.fecha).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-semibold ${
                              mov.cantidad > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {mov.cantidad > 0 ? "+" : ""}
                            {mov.cantidad}
                          </p>
                          {mov.total && (
                            <p className="text-xs text-gray-500">
                              ${Number(mov.total).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {producto.inventarios.length > ITEMS_POR_PAGINA && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPaginaHistorial((p) => Math.max(1, p - 1))
                      }
                      disabled={paginaHistorial === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-gray-600">
                      {paginaHistorial} /{" "}
                      {Math.ceil(
                        producto.inventarios.length / ITEMS_POR_PAGINA,
                      )}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPaginaHistorial((p) =>
                          Math.min(
                            Math.ceil(
                              producto.inventarios.length / ITEMS_POR_PAGINA,
                            ),
                            p + 1,
                          ),
                        )
                      }
                      disabled={
                        paginaHistorial ===
                        Math.ceil(
                          producto.inventarios.length / ITEMS_POR_PAGINA,
                        )
                      }
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
