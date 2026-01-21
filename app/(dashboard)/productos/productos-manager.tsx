"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Edit,
  Eye,
  Package,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowLeftRight,
} from "lucide-react";
import ProductosFiltros from "./productos-filtros";
import CrearProductoModal from "./crear-producto-modal";
import EditarProductoModal from "./editar-producto-modal";
import DetalleProductoModal from "./detalle-producto-modal";
import TraspasoModal from "./traspaso-modal";
import AjusteModal from "./ajuste-modal";
import EntradaModal from "./entrada-modal";

interface Producto {
  id: number;
  nombre: string;
  precioVenta: number;
  existenciaBodega: number;
  existenciaGym: number;
  existenciaMin: number;
  activo: boolean;
}

interface FiltrosProductos {
  busqueda: string;
  estado: "todos" | "activos" | "inactivos" | "bajoStock";
  ordenarPor: "nombre" | "precioVenta" | "existenciaGym" | "existenciaBodega";
  orden: "asc" | "desc";
}

const ITEMS_POR_PAGINA = 10;

interface ProductosManagerProps {
  initialProductos: Producto[];
}

export default function ProductosManager({
  initialProductos,
}: ProductosManagerProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [productoEditando, setProductoEditando] = useState<number | null>(null);
  const [productoDetalle, setProductoDetalle] = useState<number | null>(null);
  const [productoTraspaso, setProductoTraspaso] = useState<number | null>(null);
  const [productoAjuste, setProductoAjuste] = useState<number | null>(null);
  const [productoEntrada, setProductoEntrada] = useState<number | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);

  const [filtros, setFiltros] = useState<FiltrosProductos>({
    busqueda: "",
    estado: "todos",
    ordenarPor: "nombre",
    orden: "asc",
  });

  const productosFiltrados = useMemo(() => {
    let resultado = [...initialProductos];

    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultado = resultado.filter((p) =>
        p.nombre.toLowerCase().includes(busqueda),
      );
    }

    switch (filtros.estado) {
      case "activos":
        resultado = resultado.filter((p) => p.activo);
        break;
      case "inactivos":
        resultado = resultado.filter((p) => !p.activo);
        break;
      case "bajoStock":
        resultado = resultado.filter(
          (p) =>
            p.existenciaGym < p.existenciaMin ||
            p.existenciaBodega < p.existenciaMin,
        );
        break;
    }

    resultado.sort((a, b) => {
      let valorA: any, valorB: any;

      switch (filtros.ordenarPor) {
        case "nombre":
          valorA = a.nombre;
          valorB = b.nombre;
          break;
        case "precioVenta":
          valorA = Number(a.precioVenta);
          valorB = Number(b.precioVenta);
          break;
        case "existenciaGym":
          valorA = a.existenciaGym;
          valorB = b.existenciaGym;
          break;
        case "existenciaBodega":
          valorA = a.existenciaBodega;
          valorB = b.existenciaBodega;
          break;
        default:
          valorA = a.nombre;
          valorB = b.nombre;
      }

      if (valorA < valorB) return filtros.orden === "asc" ? -1 : 1;
      if (valorA > valorB) return filtros.orden === "asc" ? 1 : -1;
      return 0;
    });

    return resultado;
  }, [initialProductos, filtros]);

  const totalPaginas = Math.ceil(productosFiltrados.length / ITEMS_POR_PAGINA);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const productosPaginados = productosFiltrados.slice(
    inicio,
    inicio + ITEMS_POR_PAGINA,
  );

  const handleFiltrar = (nuevosFiltros: FiltrosProductos) => {
    setFiltros(nuevosFiltros);
    setPaginaActual(1);
  };

  const handleSuccess = (mensaje: string) => {
    setSuccess(mensaje);
    router.refresh();
    setTimeout(() => setSuccess(""), 3000);
  };

  const productosBajoStock = initialProductos.filter(
    (p) =>
      p.activo &&
      (p.existenciaGym < p.existenciaMin ||
        p.existenciaBodega < p.existenciaMin),
  );

  const esMembresia = (producto: Producto) => {
    return (
      producto.nombre.includes("EFECTIVO") ||
      producto.nombre === "VISITA" ||
      producto.nombre.includes("MENSUALIDAD") ||
      producto.nombre.includes("SEMANA")
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-gray-500">
            Gestión de inventario y control de stock
          </p>
        </div>
        <Button onClick={() => setShowCrearModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 font-medium">
          {success}
        </div>
      )}

      {productosBajoStock.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              {productosBajoStock.length} producto
              {productosBajoStock.length === 1 ? "" : "s"} con stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {productosBajoStock.slice(0, 5).map((producto) => (
                <Badge
                  key={producto.id}
                  variant="outline"
                  className="bg-white cursor-pointer hover:bg-orange-100"
                  onClick={() => setProductoDetalle(producto.id)}
                >
                  {producto.nombre}
                </Badge>
              ))}
              {productosBajoStock.length > 5 && (
                <Badge variant="outline" className="bg-white">
                  +{productosBajoStock.length - 5} más
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{initialProductos.length}</div>
            <p className="text-xs text-gray-500">Total de productos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {initialProductos.filter((p) => p.activo).length}
            </div>
            <p className="text-xs text-gray-500">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {productosBajoStock.length}
            </div>
            <p className="text-xs text-gray-500">Stock bajo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              $
              {initialProductos
                .reduce(
                  (sum, p) =>
                    sum +
                    Number(p.precioVenta) *
                      (p.existenciaBodega + p.existenciaGym),
                  0,
                )
                .toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Valor total inventario</p>
          </CardContent>
        </Card>
      </div>

      <ProductosFiltros onFiltrar={handleFiltrar} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Productos</span>
            <span className="text-sm font-normal text-gray-500">
              {productosFiltrados.length} resultados
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No hay productos que coincidan con los filtros
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {productosPaginados.map((producto) => {
                  const bajoStockGym =
                    producto.existenciaGym < producto.existenciaMin;
                  const bajoStockBodega =
                    producto.existenciaBodega < producto.existenciaMin;
                  const isMembership = esMembresia(producto);

                  return (
                    <div
                      key={producto.id}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold">{producto.nombre}</p>
                          {!producto.activo && (
                            <Badge variant="destructive">Inactivo</Badge>
                          )}
                          {isMembership && (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              Membresía
                            </Badge>
                          )}
                          {(bajoStockGym || bajoStockBodega) &&
                            !isMembership && (
                              <Badge variant="destructive">Stock Bajo</Badge>
                            )}
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <p className="font-medium text-lg">
                            ${Number(producto.precioVenta).toFixed(2)}
                          </p>
                          {!isMembership && (
                            <div className="flex items-center gap-4">
                              <div>
                                <span className="font-medium">Gym:</span>{" "}
                                <span
                                  className={
                                    bajoStockGym
                                      ? "text-red-600 font-semibold"
                                      : ""
                                  }
                                >
                                  {producto.existenciaGym}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Bodega:</span>{" "}
                                <span
                                  className={
                                    bajoStockBodega
                                      ? "text-red-600 font-semibold"
                                      : ""
                                  }
                                >
                                  {producto.existenciaBodega}
                                </span>
                              </div>
                              <div className="text-gray-400">
                                Min: {producto.existenciaMin}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isMembership && (
                          <>
                            <Button
                              onClick={() => setProductoTraspaso(producto.id)}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <ArrowLeftRight className="h-4 w-4" />
                              Traspaso
                            </Button>
                            <Button
                              onClick={() => setProductoEntrada(producto.id)}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Package className="h-4 w-4" />
                              Entrada
                            </Button>
                          </>
                        )}
                        <Button
                          onClick={() => setProductoDetalle(producto.id)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                        <Button
                          onClick={() => setProductoEditando(producto.id)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Mostrando {inicio + 1}-
                    {Math.min(
                      inicio + ITEMS_POR_PAGINA,
                      productosFiltrados.length,
                    )}{" "}
                    de {productosFiltrados.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPaginas) },
                        (_, i) => {
                          let pageNum;
                          if (totalPaginas <= 5) {
                            pageNum = i + 1;
                          } else if (paginaActual <= 3) {
                            pageNum = i + 1;
                          } else if (paginaActual >= totalPaginas - 2) {
                            pageNum = totalPaginas - 4 + i;
                          } else {
                            pageNum = paginaActual - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                paginaActual === pageNum ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setPaginaActual(pageNum)}
                              className="w-9"
                            >
                              {pageNum}
                            </Button>
                          );
                        },
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                      }
                      disabled={paginaActual === totalPaginas}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {showCrearModal && (
        <CrearProductoModal
          onClose={() => setShowCrearModal(false)}
          onSuccess={(msg) => {
            setShowCrearModal(false);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {productoEditando && (
        <EditarProductoModal
          productoId={productoEditando}
          onClose={() => setProductoEditando(null)}
          onSuccess={(msg) => {
            setProductoEditando(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {productoDetalle && (
        <DetalleProductoModal
          productoId={productoDetalle}
          onClose={() => setProductoDetalle(null)}
          onEditar={(id) => {
            setProductoDetalle(null);
            setProductoEditando(id);
          }}
          onTraspaso={(id) => {
            setProductoDetalle(null);
            setProductoTraspaso(id);
          }}
          onAjuste={(id) => {
            setProductoDetalle(null);
            setProductoAjuste(id);
          }}
          onEntrada={(id) => {
            setProductoDetalle(null);
            setProductoEntrada(id);
          }}
        />
      )}

      {productoTraspaso && (
        <TraspasoModal
          productoId={productoTraspaso}
          onClose={() => setProductoTraspaso(null)}
          onSuccess={(msg) => {
            setProductoTraspaso(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {productoAjuste && (
        <AjusteModal
          productoId={productoAjuste}
          onClose={() => setProductoAjuste(null)}
          onSuccess={(msg) => {
            setProductoAjuste(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {productoEntrada && (
        <EntradaModal
          productoId={productoEntrada}
          onClose={() => setProductoEntrada(null)}
          onSuccess={(msg) => {
            setProductoEntrada(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}
    </div>
  );
}
