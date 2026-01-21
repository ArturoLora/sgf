// app/(dashboard)/cortes/cortes-manager.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Plus,
  X,
  Eye,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AbrirCorteModal from "./abrir-corte-modal";
import CerrarCorteModal from "./cerrar-corte-modal";
import DetalleCorteModal from "./detalle-corte-modal";
import CortesFiltros from "./cortes-filtros";

interface Corte {
  id: number;
  folio: string;
  cajero: {
    id: string;
    name: string;
    email: string;
  };
  fechaApertura: string;
  fechaCierre: string | null;
  fondoCaja: number;
  cantidadTickets: number;
  totalVentas: number;
  efectivo: number;
  tarjetaDebito: number;
  tarjetaCredito: number;
  totalRetiros: number;
  totalCaja: number;
  diferencia: number;
  observaciones: string | null;
}

interface CortesManagerProps {
  userId: string;
  initialCorteActivo: Corte | null;
  initialCortes: Corte[];
  cajeros: Array<{ id: string; name: string }>;
}

interface FiltrosCortes {
  busqueda: string;
  fechaInicio: string;
  fechaFin: string;
  cajero: string;
  estado: "todos" | "activos" | "cerrados";
  ordenarPor: "fecha" | "total" | "diferencia" | "tickets";
  orden: "asc" | "desc";
}

const ITEMS_POR_PAGINA = 10;

export default function CortesManager({
  userId,
  initialCorteActivo,
  initialCortes,
  cajeros,
}: CortesManagerProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [corteSeleccionado, setCorteSeleccionado] = useState<number | null>(
    null,
  );
  const [paginaActual, setPaginaActual] = useState(1);
  const [filtros, setFiltros] = useState<FiltrosCortes>({
    busqueda: "",
    fechaInicio: "",
    fechaFin: "",
    cajero: "todos",
    estado: "todos",
    ordenarPor: "fecha",
    orden: "desc",
  });

  // Filtrar cortes cerrados (excluir activo del historial)
  const cortesCerrados = useMemo(() => {
    return initialCortes.filter((c) => c.fechaCierre !== null);
  }, [initialCortes]);

  const cortesFiltrados = useMemo(() => {
    let resultado = [...cortesCerrados];

    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(
        (c) =>
          c.folio.toLowerCase().includes(busqueda) ||
          c.cajero.name.toLowerCase().includes(busqueda) ||
          c.observaciones?.toLowerCase().includes(busqueda),
      );
    }

    if (filtros.fechaInicio) {
      const inicio = new Date(filtros.fechaInicio);
      resultado = resultado.filter((c) => new Date(c.fechaApertura) >= inicio);
    }

    if (filtros.fechaFin) {
      const fin = new Date(filtros.fechaFin);
      fin.setHours(23, 59, 59, 999);
      resultado = resultado.filter((c) => new Date(c.fechaApertura) <= fin);
    }

    if (filtros.cajero !== "todos") {
      resultado = resultado.filter((c) => c.cajero.id === filtros.cajero);
    }

    resultado.sort((a, b) => {
      let valorA: any, valorB: any;

      switch (filtros.ordenarPor) {
        case "fecha":
          valorA = new Date(a.fechaApertura).getTime();
          valorB = new Date(b.fechaApertura).getTime();
          break;
        case "total":
          valorA = Number(a.totalVentas);
          valorB = Number(b.totalVentas);
          break;
        case "diferencia":
          valorA = Math.abs(Number(a.diferencia));
          valorB = Math.abs(Number(b.diferencia));
          break;
        case "tickets":
          valorA = a.cantidadTickets;
          valorB = b.cantidadTickets;
          break;
        default:
          valorA = new Date(a.fechaApertura).getTime();
          valorB = new Date(b.fechaApertura).getTime();
      }

      return filtros.orden === "asc" ? valorA - valorB : valorB - valorA;
    });

    return resultado;
  }, [cortesCerrados, filtros]);

  // Paginación
  const totalPaginas = Math.ceil(cortesFiltrados.length / ITEMS_POR_PAGINA);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const cortesPaginados = cortesFiltrados.slice(
    inicio,
    inicio + ITEMS_POR_PAGINA,
  );

  // Reset página al cambiar filtros
  const handleFiltrar = (nuevosFiltros: FiltrosCortes) => {
    setFiltros(nuevosFiltros);
    setPaginaActual(1);
  };

  const handleSuccess = (mensaje: string) => {
    setSuccess(mensaje);
    router.refresh();
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cortes de Caja</h1>
          <p className="text-gray-500">Gestión de cortes y cierres de caja</p>
        </div>
        {!initialCorteActivo && (
          <Button onClick={() => setShowAbrirModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Abrir Corte
          </Button>
        )}
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

      {/* Corte Activo */}
      {initialCorteActivo && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Corte Activo: {initialCorteActivo.folio}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCorteSeleccionado(initialCorteActivo.id)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Ver Detalle
                </Button>
                <Button
                  onClick={() => setShowCerrarModal(true)}
                  variant="destructive"
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Cerrar Corte
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600">Cajero</p>
                <p className="font-semibold">
                  {initialCorteActivo.cajero.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Apertura</p>
                <p className="font-semibold">
                  {new Date(initialCorteActivo.fechaApertura).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fondo Inicial</p>
                <p className="font-semibold">
                  ${Number(initialCorteActivo.fondoCaja).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tickets</p>
                <p className="font-semibold">
                  {initialCorteActivo.cantidadTickets}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Efectivo</p>
                <p className="font-semibold">
                  ${Number(initialCorteActivo.efectivo).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tarjeta Débito</p>
                <p className="font-semibold">
                  ${Number(initialCorteActivo.tarjetaDebito).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tarjeta Crédito</p>
                <p className="font-semibold">
                  ${Number(initialCorteActivo.tarjetaCredito).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Ventas</p>
                <p className="text-lg font-bold text-green-600">
                  ${Number(initialCorteActivo.totalVentas).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <CortesFiltros onFiltrar={handleFiltrar} cajeros={cajeros} />

      {/* Historial de Cortes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historial de Cortes</span>
            <span className="text-sm font-normal text-gray-500">
              {cortesFiltrados.length} resultados
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cortesPaginados.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {cortesFiltrados.length === 0
                ? "No hay cortes que coincidan con los filtros"
                : "No hay cortes cerrados"}
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {cortesPaginados.map((corte) => (
                  <div
                    key={corte.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">{corte.folio}</p>
                        <Badge variant="outline" className="gap-1">
                          <Package className="h-3 w-3" />
                          {corte.cantidadTickets} tickets
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {corte.cajero.name} ·{" "}
                        {new Date(corte.fechaApertura).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Ventas</p>
                        <p className="text-lg font-bold">
                          ${Number(corte.totalVentas).toFixed(2)}
                        </p>
                        {corte.diferencia !== 0 && (
                          <p
                            className={`text-sm ${
                              corte.diferencia > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {corte.diferencia > 0 ? "+" : ""}$
                            {Number(corte.diferencia).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => setCorteSeleccionado(corte.id)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Mostrando {inicio + 1}-
                    {Math.min(
                      inicio + ITEMS_POR_PAGINA,
                      cortesFiltrados.length,
                    )}{" "}
                    de {cortesFiltrados.length}
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

      {/* Modales */}
      {showAbrirModal && (
        <AbrirCorteModal
          userId={userId}
          onClose={() => setShowAbrirModal(false)}
          onSuccess={(msg) => {
            setShowAbrirModal(false);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {showCerrarModal && initialCorteActivo && (
        <CerrarCorteModal
          corte={initialCorteActivo}
          onClose={() => setShowCerrarModal(false)}
          onSuccess={(msg) => {
            setShowCerrarModal(false);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {corteSeleccionado && (
        <DetalleCorteModal
          corteId={corteSeleccionado}
          onClose={() => setCorteSeleccionado(null)}
        />
      )}
    </div>
  );
}
