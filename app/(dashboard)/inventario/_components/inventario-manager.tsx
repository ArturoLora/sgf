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
import {
  calcularStatsInventario,
  aplicarFiltros,
  calcularPaginacion,
  obtenerPaginasVisibles,
  paginar,
  type Producto,
} from "@/lib/domain/inventory";

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

  const productosFiltrados = useMemo(
    () => aplicarFiltros(productos, filtros),
    [productos, filtros],
  );

  const stats = useMemo(() => calcularStatsInventario(productos), [productos]);

  const paginacion = useMemo(
    () =>
      calcularPaginacion(
        productosFiltrados.length,
        paginaActual,
        ITEMS_POR_PAGINA,
      ),
    [productosFiltrados.length, paginaActual],
  );

  const productosPaginados = useMemo(
    () => paginar(productosFiltrados, paginaActual, ITEMS_POR_PAGINA),
    [productosFiltrados, paginaActual],
  );

  const paginasVisibles = useMemo(
    () => obtenerPaginasVisibles(paginaActual, paginacion.totalPaginas),
    [paginaActual, paginacion.totalPaginas],
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
    setPaginaActual((p) => Math.min(paginacion.totalPaginas, p + 1));
  }, [paginacion.totalPaginas]);

  const handleCambiarPagina = useCallback((pagina: number) => {
    setPaginaActual(pagina);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Inventario</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Control de existencias y movimientos
        </p>
      </div>

      <InventarioStats {...stats} />

      <InventarioFiltros
        filtros={filtros}
        onCambiarFiltros={handleCambiarFiltros}
      />

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

          {paginacion.totalPaginas > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
              <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                Mostrando {paginacion.inicio + 1}-{paginacion.fin} de{" "}
                {paginacion.total}
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

                <div className="hidden sm:flex items-center gap-1">
                  {paginasVisibles.map((pageNum) => (
                    <Button
                      key={pageNum}
                      variant={paginaActual === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCambiarPagina(pageNum)}
                      className="w-9"
                    >
                      {pageNum}
                    </Button>
                  ))}
                </div>

                <div className="sm:hidden px-3 py-1 bg-muted rounded text-sm">
                  {paginaActual} / {paginacion.totalPaginas}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePaginaSiguiente}
                  disabled={paginaActual === paginacion.totalPaginas}
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
