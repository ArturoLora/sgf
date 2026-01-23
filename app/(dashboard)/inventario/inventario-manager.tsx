"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  AlertCircle,
  TrendingUp,
  DollarSign,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import InventarioFiltros from "./inventario-filtros";
import InventarioTabla from "./inventario-tabla";
import KardexProducto from "./kardex-producto";

interface Producto {
  id: number;
  nombre: string;
  precioVenta: number;
  existenciaBodega: number;
  existenciaGym: number;
  existenciaMin: number;
  activo: boolean;
}

interface FiltrosInventario {
  busqueda: string;
  ubicacion: "todos" | "gym" | "bodega";
  estado: "todos" | "stock_ok" | "bajo_stock" | "sin_stock";
  ordenarPor: "nombre" | "stockGym" | "stockBodega" | "stockTotal" | "valor";
  orden: "asc" | "desc";
}

const ITEMS_POR_PAGINA = 15;

interface InventarioManagerProps {
  initialProductos: Producto[];
}

export default function InventarioManager({
  initialProductos,
}: InventarioManagerProps) {
  const [filtros, setFiltros] = useState<FiltrosInventario>({
    busqueda: "",
    ubicacion: "todos",
    estado: "todos",
    ordenarPor: "nombre",
    orden: "asc",
  });
  const [paginaActual, setPaginaActual] = useState(1);
  const [vistaKardex, setVistaKardex] = useState<number | null>(null);

  // Filtrar solo productos físicos (excluir membresías)
  const productosInventario = useMemo(() => {
    const keywordsMembresias = [
      "EFECTIVO",
      "VISITA",
      "MENSUALIDAD",
      "SEMANA",
      "TRIMESTRE",
      "ANUAL",
      "PROMOCION",
      "RENACER",
    ];

    return initialProductos.filter((p) => {
      return !keywordsMembresias.some((keyword) =>
        p.nombre.toUpperCase().includes(keyword),
      );
    });
  }, [initialProductos]);

  const productosFiltrados = useMemo(() => {
    let resultado = [...productosInventario];

    // Búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultado = resultado.filter((p) =>
        p.nombre.toLowerCase().includes(busqueda),
      );
    }

    // Filtro por ubicación y estado
    resultado = resultado.filter((p) => {
      // Estado
      const stockTotal = p.existenciaBodega + p.existenciaGym;
      let cumpleEstado = true;

      switch (filtros.estado) {
        case "bajo_stock":
          cumpleEstado =
            p.existenciaGym < p.existenciaMin ||
            p.existenciaBodega < p.existenciaMin;
          break;
        case "sin_stock":
          cumpleEstado = stockTotal === 0;
          break;
        case "stock_ok":
          cumpleEstado =
            p.existenciaGym >= p.existenciaMin &&
            p.existenciaBodega >= p.existenciaMin &&
            stockTotal > 0;
          break;
      }

      return cumpleEstado;
    });

    // Ordenamiento
    resultado.sort((a, b) => {
      let valorA: any, valorB: any;

      switch (filtros.ordenarPor) {
        case "stockGym":
          valorA = a.existenciaGym;
          valorB = b.existenciaGym;
          break;
        case "stockBodega":
          valorA = a.existenciaBodega;
          valorB = b.existenciaBodega;
          break;
        case "stockTotal":
          valorA = a.existenciaBodega + a.existenciaGym;
          valorB = b.existenciaBodega + b.existenciaGym;
          break;
        case "valor":
          valorA =
            Number(a.precioVenta) * (a.existenciaBodega + a.existenciaGym);
          valorB =
            Number(b.precioVenta) * (b.existenciaBodega + b.existenciaGym);
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
  }, [productosInventario, filtros]);

  // Paginación
  const totalPaginas = Math.ceil(productosFiltrados.length / ITEMS_POR_PAGINA);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const productosPaginados = productosFiltrados.slice(
    inicio,
    inicio + ITEMS_POR_PAGINA,
  );

  const handleFiltrar = (nuevosFiltros: FiltrosInventario) => {
    setFiltros(nuevosFiltros);
    setPaginaActual(1);
  };

  // Estadísticas
  const stats = useMemo(() => {
    const totalProductos = productosInventario.length;
    const stockBajo = productosInventario.filter(
      (p) =>
        p.existenciaGym < p.existenciaMin ||
        p.existenciaBodega < p.existenciaMin,
    ).length;
    const sinStock = productosInventario.filter(
      (p) => p.existenciaBodega + p.existenciaGym === 0,
    ).length;

    const valorTotal = productosInventario.reduce((sum, p) => {
      return (
        sum + Number(p.precioVenta) * (p.existenciaBodega + p.existenciaGym)
      );
    }, 0);

    const stockTotalGym = productosInventario.reduce(
      (sum, p) => sum + p.existenciaGym,
      0,
    );
    const stockTotalBodega = productosInventario.reduce(
      (sum, p) => sum + p.existenciaBodega,
      0,
    );

    return {
      totalProductos,
      stockBajo,
      sinStock,
      valorTotal,
      stockTotalGym,
      stockTotalBodega,
    };
  }, [productosInventario]);

  if (vistaKardex) {
    return (
      <KardexProducto
        productoId={vistaKardex}
        onClose={() => setVistaKardex(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-gray-500">Control de existencias y movimientos</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold">{stats.totalProductos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.stockBajo}
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
                  {stats.stockTotalGym + stats.stockTotalBodega}
                </p>
                <p className="text-xs text-gray-500">
                  G:{stats.stockTotalGym} B:{stats.stockTotalBodega}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold">
                  ${stats.valorTotal.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <InventarioFiltros onFiltrar={handleFiltrar} />

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Existencias</span>
            <span className="text-sm font-normal text-gray-500">
              {productosFiltrados.length} productos
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
              <InventarioTabla
                productos={productosPaginados}
                onVerKardex={setVistaKardex}
              />

              {/* Paginación */}
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
    </div>
  );
}
