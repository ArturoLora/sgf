"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Plus, DollarSign, Clock, CheckCircle } from "lucide-react";
import CortesFiltros from "./cortes-filtros";
import CortesLista from "./cortes-lista";
import AbrirCorteModal from "./abrir-corte-modal";
import CerrarCorteModal from "./cerrar-corte-modal";
import DetalleCorteModal from "./detalle-corte-modal";
import type { CorteResponse } from "@/types/api/shifts";

interface Cajero {
  id: string;
  name: string;
}

interface CortesManagerProps {
  cajeros: Cajero[];
  currentUserId: string;
}

interface FiltrosCorte {
  busqueda: string;
  fechaInicio: string;
  fechaFin: string;
  cajero: string;
  estado: "todos" | "abiertos" | "cerrados";
  ordenarPor: "fecha_desc" | "fecha_asc" | "folio_desc" | "folio_asc";
}

const ITEMS_POR_PAGINA = 10;

export default function CortesManager({ cajeros }: CortesManagerProps) {
  const [cortes, setCortes] = useState<CorteResponse[]>([]);
  const [corteActivo, setCorteActivo] = useState<CorteResponse | null>(null);
  const [totalCortes, setTotalCortes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const [mostrarAbrirModal, setMostrarAbrirModal] = useState(false);
  const [mostrarCerrarModal, setMostrarCerrarModal] = useState(false);
  const [corteDetalle, setCorteDetalle] = useState<number | null>(null);

  const [filtros, setFiltros] = useState<FiltrosCorte>({
    busqueda: "",
    fechaInicio: "",
    fechaFin: "",
    cajero: "todos",
    estado: "todos",
    ordenarPor: "fecha_desc",
  });

  const verificarCorteActivo = useCallback(async () => {
    try {
      const res = await fetch("/api/shifts/active");
      if (res.ok) {
        const data = await res.json();
        setCorteActivo(data);
      } else if (res.status === 404) {
        setCorteActivo(null);
      }
    } catch (err) {
      console.error("Error al verificar corte activo:", err);
      setCorteActivo(null);
    }
  }, []);

  const cargarDatos = useCallback(
    async (nuevosFiltros?: FiltrosCorte, pagina: number = 1) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        const filtrosActuales = nuevosFiltros || filtros;

        if (filtrosActuales.busqueda)
          params.append("search", filtrosActuales.busqueda);
        if (filtrosActuales.fechaInicio)
          params.append("startDate", filtrosActuales.fechaInicio);
        if (filtrosActuales.fechaFin)
          params.append("endDate", filtrosActuales.fechaFin);
        if (filtrosActuales.cajero !== "todos")
          params.append("cashier", filtrosActuales.cajero);
        if (filtrosActuales.estado !== "todos")
          params.append("status", filtrosActuales.estado);

        const [campo, orden] = filtrosActuales.ordenarPor.split("_");
        params.append("orderBy", campo);
        params.append("order", orden);

        params.append("page", pagina.toString());
        params.append("perPage", ITEMS_POR_PAGINA.toString());

        const res = await fetch(`/api/shifts?${params}`);
        if (!res.ok) throw new Error("Error al cargar cortes");

        const data = await res.json();
        setCortes(data.shifts);
        setTotalCortes(data.total);
        setPaginaActual(pagina);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    },
    [filtros],
  );

  useEffect(() => {
    cargarDatos();
    verificarCorteActivo();
  }, [cargarDatos, verificarCorteActivo]);

  const handleFiltrar = (nuevosFiltros: FiltrosCorte) => {
    setFiltros(nuevosFiltros);
    cargarDatos(nuevosFiltros, 1);
  };

  const handleCambiarPagina = (pagina: number) => {
    cargarDatos(filtros, pagina);
  };

  const handleAbrirCorte = () => {
    setMostrarAbrirModal(true);
  };

  const handleCerrarCorte = () => {
    if (!corteActivo) return;
    setMostrarCerrarModal(true);
  };

  const handleCorteAbierto = () => {
    setMostrarAbrirModal(false);
    verificarCorteActivo();
    cargarDatos(filtros, 1);
  };

  const handleCorteCerrado = () => {
    setMostrarCerrarModal(false);
    setCorteActivo(null);
    cargarDatos(filtros, 1);
  };

  const handleVerDetalle = (corteId: number) => {
    setCorteDetalle(corteId);
  };

  const totalPaginas = Math.ceil(totalCortes / ITEMS_POR_PAGINA);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Cortes de Caja</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestión de turnos y arqueos
          </p>
        </div>
        <div className="flex gap-2">
          {corteActivo ? (
            <Button
              onClick={handleCerrarCorte}
              variant="destructive"
              className="gap-2 flex-1 sm:flex-initial"
            >
              <CheckCircle className="h-4 w-4" />
              Cerrar Corte
            </Button>
          ) : (
            <Button
              onClick={handleAbrirCorte}
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Plus className="h-4 w-4" />
              Abrir Corte
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex justify-between items-start gap-2">
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {corteActivo && (
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Corte Activo: {corteActivo.folio}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Fondo inicial: ${Number(corteActivo.initialCash).toFixed(2)}
                  </p>
                </div>
              </div>
              <span className="bg-blue-600 dark:bg-blue-700 text-white px-3 py-1 rounded-md text-sm w-fit">
                En curso
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total Cortes
                </p>
                <p className="text-lg sm:text-2xl font-bold truncate">
                  {totalCortes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Cerrados
                </p>
                <p className="text-lg sm:text-2xl font-bold truncate">
                  {(cortes || []).filter((c) => c.status === "CLOSED").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 dark:text-orange-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Abiertos
                </p>
                <p className="text-lg sm:text-2xl font-bold truncate">
                  {(cortes || []).filter((c) => c.status === "CLOSED").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Cajeros Activos
              </p>
              <p className="text-lg sm:text-2xl font-bold truncate">
                {cajeros.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <CortesFiltros
        onFiltrar={handleFiltrar}
        cajeros={cajeros}
        loading={loading}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Historial de Cortes</span>
            <span className="text-xs sm:text-sm font-normal text-muted-foreground">
              {totalCortes} registros
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CortesLista
            cortes={cortes}
            loading={loading}
            currentPage={paginaActual}
            totalPages={totalPaginas}
            onPageChange={handleCambiarPagina}
            onVerDetalle={handleVerDetalle}
          />
        </CardContent>
      </Card>

      {mostrarAbrirModal && (
        <AbrirCorteModal
          onClose={() => setMostrarAbrirModal(false)}
          onSuccess={handleCorteAbierto}
        />
      )}

      {mostrarCerrarModal && corteActivo && (
        <CerrarCorteModal
          corte={corteActivo}
          onClose={() => setMostrarCerrarModal(false)}
          onSuccess={handleCorteCerrado}
        />
      )}

      {corteDetalle && (
        <DetalleCorteModal
          corteId={corteDetalle}
          onClose={() => setCorteDetalle(null)}
        />
      )}
    </div>
  );
}
