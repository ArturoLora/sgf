"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Plus, DollarSign, Clock, CheckCircle } from "lucide-react";
import CortesFiltros, { type FiltrosCorte } from "./cortes-filtros";
import CortesLista from "./cortes-lista";
import AbrirCorteModal from "./abrir-corte-modal";
import CerrarCorteModal from "./cerrar-corte-modal";
import DetalleCorteModal from "./detalle-corte-modal";
import type {
  CorteResponse,
  CorteActivoConVentasResponse,
  OpenShiftInput,
  CloseShiftInput,
  BuscarCortesQuery,
  ResumenCorteResponse,
  CorteConVentasResponse,
} from "@/types/api/shifts";
import {
  abrirCorte,
  cerrarCorte,
  cargarCortes,
  verificarCorteActivo,
  cargarResumenCorte,
  cargarDetalleCorte,
} from "@/lib/domain/shifts";

interface Cajero {
  id: string;
  name: string;
}

interface CortesManagerProps {
  cajeros: Cajero[];
  currentUserId: string;
}

const ITEMS_POR_PAGINA = 10;

const filtrosIniciales: FiltrosCorte = {
  busqueda: "",
  fechaInicio: "",
  fechaFin: "",
  cajero: "todos",
  estado: "todos",
  ordenarPor: "fecha_desc",
};

export default function CortesManager({ cajeros }: CortesManagerProps) {
  // Estados de datos
  const [cortes, setCortes] = useState<CorteResponse[]>([]);
  const [corteActivo, setCorteActivo] =
    useState<CorteActivoConVentasResponse | null>(null);
  const [totalCortes, setTotalCortes] = useState(0);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [filtros, setFiltros] = useState<FiltrosCorte>(filtrosIniciales);

  // Estados de modales
  const [mostrarAbrirModal, setMostrarAbrirModal] = useState(false);
  const [mostrarCerrarModal, setMostrarCerrarModal] = useState(false);
  const [corteDetalle, setCorteDetalle] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState("");

  /**
   * Verifica si existe un corte activo
   */
  const verificarActivo = useCallback(async () => {
    const resultado = await verificarCorteActivo();
    if (resultado.success) {
      setCorteActivo(resultado.corte ?? null);
    }
  }, []);

  /**
   * Carga la lista de cortes con filtros
   */
  const cargarDatos = useCallback(
    async (nuevosFiltros?: FiltrosCorte, pagina: number = 1) => {
      setLoading(true);
      setError("");

      try {
        const filtrosActuales = nuevosFiltros || filtros;
        const params: BuscarCortesQuery = {};

        if (filtrosActuales.busqueda) params.search = filtrosActuales.busqueda;
        if (filtrosActuales.fechaInicio)
          params.startDate = filtrosActuales.fechaInicio;
        if (filtrosActuales.fechaFin) params.endDate = filtrosActuales.fechaFin;
        if (filtrosActuales.cajero !== "todos")
          params.cashier = filtrosActuales.cajero;
        if (filtrosActuales.estado !== "todos")
          params.status = filtrosActuales.estado;

        const [campo, orden] = filtrosActuales.ordenarPor.split("_");
        params.orderBy = campo;
        params.order = orden;
        params.page = pagina.toString();
        params.perPage = ITEMS_POR_PAGINA.toString();

        const resultado = await cargarCortes(params);

        if (resultado.success && resultado.data) {
          setCortes(resultado.data.shifts);
          setTotalCortes(resultado.data.total);
          setPaginaActual(pagina);
        } else {
          setError(resultado.error || "Error al cargar cortes");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    },
    [filtros],
  );

  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarDatos();
    verificarActivo();
  }, [cargarDatos, verificarActivo]);

  /**
   * Handlers de filtros
   */
  const handleFiltrosChange = (nuevosFiltros: FiltrosCorte) => {
    setFiltros(nuevosFiltros);
  };

  const handleAplicarFiltros = () => {
    cargarDatos(filtros, 1);
  };

  const handleCambiarPagina = (pagina: number) => {
    cargarDatos(filtros, pagina);
  };

  /**
   * Handlers de modales
   */
  const handleAbrirModal = () => {
    setMostrarAbrirModal(true);
    setErrorModal("");
  };

  const handleCerrarModal = () => {
    if (!corteActivo) return;
    setMostrarCerrarModal(true);
    setErrorModal("");
  };

  /**
   * Handler de abrir corte
   */
  const handleAbrirCorte = async (data: OpenShiftInput) => {
    const resultado = await abrirCorte(data);

    if (resultado.success) {
      setMostrarAbrirModal(false);
      await verificarActivo();
      await cargarDatos(filtros, 1);
    } else {
      setErrorModal(resultado.error || "Error al abrir corte");
      throw new Error(resultado.error);
    }
  };

  /**
   * Handler de cerrar corte
   */
  const handleCerrarCorte = async (data: CloseShiftInput) => {
    const resultado = await cerrarCorte(data);

    if (resultado.success) {
      setMostrarCerrarModal(false);
      setCorteActivo(null);
      await cargarDatos(filtros, 1);
    } else {
      setErrorModal(resultado.error || "Error al cerrar corte");
      throw new Error(resultado.error);
    }
  };

  /**
   * Handler de ver detalle
   */
  const handleVerDetalle = (corteId: number) => {
    setCorteDetalle(corteId);
  };

  /**
   * Handler de cargar resumen para modal de cierre
   */
  const handleCargarResumen = async (
    corteId: number,
  ): Promise<ResumenCorteResponse> => {
    const resultado = await cargarResumenCorte(corteId);

    if (resultado.success && resultado.resumen) {
      return resultado.resumen;
    }

    throw new Error(resultado.error || "Error al cargar resumen");
  };

  /**
   * Handler de cargar detalle para modal de detalle
   */
  const handleCargarDetalleCorte = async (
    corteId: number,
  ): Promise<CorteConVentasResponse> => {
    const resultado = await cargarDetalleCorte(corteId);

    if (resultado.success && resultado.corte) {
      return resultado.corte;
    }

    throw new Error(resultado.error || "Error al cargar detalle");
  };

  const totalPaginas = Math.ceil(totalCortes / ITEMS_POR_PAGINA);
  const cortesCerrados = cortes.filter((c) => c.status === "CLOSED").length;
  const cortesAbiertos = cortes.filter((c) => c.status === "OPEN").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
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
              onClick={handleCerrarModal}
              variant="destructive"
              className="gap-2 flex-1 sm:flex-initial"
            >
              <CheckCircle className="h-4 w-4" />
              Cerrar Corte
            </Button>
          ) : (
            <Button
              onClick={handleAbrirModal}
              className="gap-2 flex-1 sm:flex-initial"
            >
              <Plus className="h-4 w-4" />
              Abrir Corte
            </Button>
          )}
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex justify-between items-start gap-2">
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Corte activo */}
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

      {/* Estadísticas */}
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
                  {cortesCerrados}
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
                  {cortesAbiertos}
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

      {/* Filtros */}
      <CortesFiltros
        filtros={filtros}
        onFiltrosChange={handleFiltrosChange}
        onAplicarFiltros={handleAplicarFiltros}
        cajeros={cajeros}
        loading={loading}
      />

      {/* Lista de cortes */}
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

      {/* Modales */}
      <AbrirCorteModal
        open={mostrarAbrirModal}
        onClose={() => setMostrarAbrirModal(false)}
        onSubmit={handleAbrirCorte}
        error={errorModal}
      />

      {corteActivo && (
        <CerrarCorteModal
          open={mostrarCerrarModal}
          corte={corteActivo}
          onClose={() => setMostrarCerrarModal(false)}
          onLoadResumen={handleCargarResumen}
          onSubmit={handleCerrarCorte}
          error={errorModal}
        />
      )}

      {corteDetalle !== null && (
        <DetalleCorteModal
          open={true}
          corteId={corteDetalle}
          onClose={() => setCorteDetalle(null)}
          onLoadDetalle={handleCargarDetalleCorte}
        />
      )}
    </div>
  );
}
