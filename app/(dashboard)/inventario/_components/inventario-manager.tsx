"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  InventarioFiltros,
  type FiltrosInventario,
} from "./inventario-filtros";
import { InventarioTabla } from "./inventario-tabla";
import { InventarioStats } from "./inventario-stats";

interface Producto {
  id: number;
  name: string;
  salePrice: number;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  isActive: boolean;
}

interface InventarioManagerProps {
  productos: Producto[];
}

const ITEMS_POR_PAGINA = 15;

export function InventarioManager({ productos }: InventarioManagerProps) {
  const [filtros, setFiltros] = useState<FiltrosInventario>({
    busqueda: "",
    ubicacion: "todos",
    estado: "todos",
    ordenarPor: "nombre",
    orden: "asc",
  });
  const [paginaActual, setPaginaActual] = useState(1);

  // Aplicar filtros y ordenamiento
  const productosFiltrados = useMemo(() => {
    let resultado = [...productos];

    // Búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultado = resultado.filter((p) =>
        p.name.toLowerCase().includes(busqueda),
      );
    }

    // Filtro por estado
    if (filtros.estado !== "todos") {
      resultado = resultado.filter((p) => {
        const stockTotal = p.warehouseStock + p.gymStock;

        switch (filtros.estado) {
          case "bajo_stock":
            return p.gymStock < p.minStock || p.warehouseStock < p.minStock;
          case "sin_stock":
            return stockTotal === 0;
          case "stock_ok":
            return (
              p.gymStock >= p.minStock &&
              p.warehouseStock >= p.minStock &&
              stockTotal > 0
            );
          default:
            return true;
        }
      });
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      let valorA: number | string;
      let valorB: number | string;

      switch (filtros.ordenarPor) {
        case "stockGym":
          valorA = a.gymStock;
          valorB = b.gymStock;
          break;
        case "stockBodega":
          valorA = a.warehouseStock;
          valorB = b.warehouseStock;
          break;
        case "stockTotal":
          valorA = a.warehouseStock + a.gymStock;
          valorB = b.warehouseStock + b.gymStock;
          break;
        case "valor":
          valorA = Number(a.salePrice) * (a.warehouseStock + a.gymStock);
          valorB = Number(b.salePrice) * (b.warehouseStock + b.gymStock);
          break;
        default:
          valorA = a.name;
          valorB = b.name;
      }

      if (valorA < valorB) return filtros.orden === "asc" ? -1 : 1;
      if (valorA > valorB) return filtros.orden === "asc" ? 1 : -1;
      return 0;
    });

    return resultado;
  }, [productos, filtros]);

  // Estadísticas
  const stats = useMemo(() => {
    const totalProductos = productos.length;
    const stockBajo = productos.filter(
      (p) => p.gymStock < p.minStock || p.warehouseStock < p.minStock,
    ).length;
    const sinStock = productos.filter(
      (p) => p.warehouseStock + p.gymStock === 0,
    ).length;

    const valorTotal = productos.reduce((sum, p) => {
      return sum + Number(p.salePrice) * (p.warehouseStock + p.gymStock);
    }, 0);

    const stockTotalGym = productos.reduce((sum, p) => sum + p.gymStock, 0);
    const stockTotalBodega = productos.reduce(
      (sum, p) => sum + p.warehouseStock,
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
  }, [productos]);

  // Paginación
  const totalPaginas = Math.ceil(productosFiltrados.length / ITEMS_POR_PAGINA);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const productosPaginados = productosFiltrados.slice(
    inicio,
    inicio + ITEMS_POR_PAGINA,
  );

  const handleCambiarFiltros = useCallback(
    (nuevosFiltros: FiltrosInventario) => {
      setFiltros(nuevosFiltros);
      setPaginaActual(1);
    },
    [],
  );

  const handlePaginaAnterior = useCallback(() => {
    setPaginaActual((p) => Math.max(1, p - 1));
  }, []);

  const handlePaginaSiguiente = useCallback(() => {
    setPaginaActual((p) => Math.min(totalPaginas, p + 1));
  }, [totalPaginas]);

  const handleCambiarPagina = useCallback((pagina: number) => {
    setPaginaActual(pagina);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Inventario</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Control de existencias y movimientos
        </p>
      </div>

      {/* Stats */}
      <InventarioStats {...stats} />

      {/* Filtros */}
      <InventarioFiltros
        filtros={filtros}
        onCambiarFiltros={handleCambiarFiltros}
      />

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Existencias</span>
            <span className="text-xs sm:text-sm font-normal text-muted-foreground">
              {productosFiltrados.length} productos
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InventarioTabla productos={productosPaginados} />

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
              <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                Mostrando {inicio + 1}-
                {Math.min(inicio + ITEMS_POR_PAGINA, productosFiltrados.length)}{" "}
                de {productosFiltrados.length}
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePaginaAnterior}
                  disabled={paginaActual === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>

                {/* Números de página - solo desktop */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pageNum: number;
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
                        onClick={() => handleCambiarPagina(pageNum)}
                        className="w-9"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                {/* Indicador mobile */}
                <div className="sm:hidden px-3 py-1 bg-muted rounded text-sm">
                  {paginaActual} / {totalPaginas}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePaginaSiguiente}
                  disabled={paginaActual === totalPaginas}
                  className="gap-1"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
