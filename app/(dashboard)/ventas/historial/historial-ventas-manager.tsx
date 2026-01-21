"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Download,
  Receipt,
} from "lucide-react";
import HistorialFiltros from "./historial-filtros";
import DetalleVentaModal from "./detalle-venta-modal";

interface Cajero {
  id: string;
  name: string;
}

interface Producto {
  id: number;
  nombre: string;
}

interface Socio {
  id: number;
  numeroSocio: string;
  nombre: string | null;
}

interface HistorialVentasManagerProps {
  cajeros: Cajero[];
  productos: Producto[];
  socios: Socio[];
}

interface FiltrosVentas {
  busqueda: string;
  fechaInicio: string;
  fechaFin: string;
  cajero: string;
  producto: string;
  socio: string;
  formaPago: string;
  tipoProducto: "todos" | "membresias" | "productos";
  ordenarPor: "fecha" | "total" | "ticket";
  orden: "asc" | "desc";
  soloActivas: boolean;
}

interface Venta {
  id: number;
  ticket: string;
  fecha: string;
  total: number;
  formaPago: string;
  cancelada: boolean;
  producto: {
    nombre: string;
  };
  socio: {
    numeroSocio: string;
    nombre: string;
  } | null;
  usuario: {
    name: string;
  };
  cantidad: number;
  observaciones: string | null;
}

const ITEMS_POR_PAGINA = 10;

export default function HistorialVentasManager({
  cajeros,
  productos,
  socios,
}: HistorialVentasManagerProps) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<string | null>(
    null,
  );
  const [filtros, setFiltros] = useState<FiltrosVentas>({
    busqueda: "",
    fechaInicio: "",
    fechaFin: "",
    cajero: "todos",
    producto: "todos",
    socio: "todos",
    formaPago: "todos",
    tipoProducto: "todos",
    ordenarPor: "fecha",
    orden: "desc",
    soloActivas: true,
  });

  // Cargar últimas 10 ventas al montar
  useEffect(() => {
    cargarVentas(filtros, 1);
  }, []);

  const cargarVentas = async (
    nuevosFiltros: FiltrosVentas,
    pagina: number = 1,
  ) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (nuevosFiltros.fechaInicio)
        params.append("fechaInicio", nuevosFiltros.fechaInicio);
      if (nuevosFiltros.fechaFin)
        params.append("fechaFin", nuevosFiltros.fechaFin);
      if (nuevosFiltros.cajero !== "todos")
        params.append("cajero", nuevosFiltros.cajero);
      if (nuevosFiltros.producto !== "todos")
        params.append("producto", nuevosFiltros.producto);
      if (nuevosFiltros.socio !== "todos")
        params.append("socio", nuevosFiltros.socio);
      if (nuevosFiltros.formaPago !== "todos")
        params.append("formaPago", nuevosFiltros.formaPago);
      if (nuevosFiltros.tipoProducto !== "todos")
        params.append("tipoProducto", nuevosFiltros.tipoProducto);
      if (nuevosFiltros.busqueda)
        params.append("busqueda", nuevosFiltros.busqueda);
      params.append("soloActivas", nuevosFiltros.soloActivas.toString());
      params.append("ordenarPor", nuevosFiltros.ordenarPor);
      params.append("orden", nuevosFiltros.orden);

      // Paginación server-side
      params.append("pagina", pagina.toString());
      params.append("porPagina", ITEMS_POR_PAGINA.toString());

      const res = await fetch(`/api/ventas/historial?${params}`);

      if (!res.ok) {
        throw new Error("Error al cargar ventas");
      }

      const data = await res.json();
      setVentas(data.ventas);
      setTotalVentas(data.total);
      setPaginaActual(pagina);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = (nuevosFiltros: FiltrosVentas) => {
    setFiltros(nuevosFiltros);
    cargarVentas(nuevosFiltros, 1);
  };

  // Paginación server-side - usar ventas directamente
  const totalPaginas = Math.ceil(totalVentas / ITEMS_POR_PAGINA);

  // Agrupar por ticket
  const ventasAgrupadasPorTicket = useMemo(() => {
    const grupos: Record<string, Venta[]> = {};
    ventas.forEach((venta) => {
      if (!grupos[venta.ticket]) {
        grupos[venta.ticket] = [];
      }
      grupos[venta.ticket].push(venta);
    });
    return grupos;
  }, [ventas]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const totalVentasValor = ventas.reduce(
      (sum, v) => sum + Number(v.total),
      0,
    );
    const ticketsUnicos = new Set(ventas.map((v) => v.ticket)).size;
    const canceladas = ventas.filter((v) => v.cancelada).length;

    return {
      totalVentas: totalVentasValor,
      ticketsUnicos,
      canceladas,
      totalItems: ventas.length,
    };
  }, [ventas]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Historial de Ventas</h1>
          <p className="text-gray-500">Consulta y análisis de ventas</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
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

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              ${estadisticas.totalVentas.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Total en ventas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {estadisticas.ticketsUnicos}
            </div>
            <p className="text-xs text-gray-500">Tickets únicos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{estadisticas.totalItems}</div>
            <p className="text-xs text-gray-500">Artículos vendidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {estadisticas.canceladas}
            </div>
            <p className="text-xs text-gray-500">Ventas canceladas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <HistorialFiltros
        onFiltrar={handleFiltrar}
        cajeros={cajeros}
        productos={productos}
        socios={socios}
        loading={loading}
      />

      {/* Lista de Ventas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Resultados</span>
            <span className="text-sm font-normal text-gray-500">
              {totalVentas} ventas totales
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando ventas...</p>
            </div>
          ) : ventas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No hay ventas que coincidan con los filtros
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {Object.entries(ventasAgrupadasPorTicket).map(
                  ([ticket, ventasTicket]) => {
                    const totalTicket = ventasTicket.reduce(
                      (sum, v) => sum + Number(v.total),
                      0,
                    );
                    const primeraVenta = ventasTicket[0];
                    const esCancelado = primeraVenta.cancelada;

                    return (
                      <div
                        key={ticket}
                        className={`rounded-lg border p-4 transition-colors ${
                          esCancelado
                            ? "border-red-200 bg-red-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-gray-400" />
                                <p className="font-semibold">#{ticket}</p>
                              </div>
                              <Badge variant="outline" className="gap-1">
                                {ventasTicket.length}{" "}
                                {ventasTicket.length === 1 ? "item" : "items"}
                              </Badge>
                              {esCancelado && (
                                <Badge variant="destructive">Cancelada</Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={
                                  primeraVenta.formaPago === "EFECTIVO"
                                    ? "bg-green-50"
                                    : "bg-blue-50"
                                }
                              >
                                {primeraVenta.formaPago.replace("_", " ")}
                              </Badge>
                            </div>

                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                Cajero: {primeraVenta.usuario.name} ·{" "}
                                {new Date(primeraVenta.fecha).toLocaleString()}
                              </p>
                              {primeraVenta.socio && (
                                <p>
                                  Cliente: {primeraVenta.socio.nombre} (
                                  {primeraVenta.socio.numeroSocio})
                                </p>
                              )}
                            </div>

                            <div className="mt-3 space-y-1">
                              {ventasTicket.map((venta) => (
                                <div
                                  key={venta.id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-700">
                                    {Math.abs(venta.cantidad)}x{" "}
                                    {venta.producto.nombre}
                                  </span>
                                  <span className="font-medium">
                                    ${Number(venta.total).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 ml-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Total</p>
                              <p
                                className={`text-lg font-bold ${
                                  esCancelado ? "text-red-600" : ""
                                }`}
                              >
                                ${totalTicket.toFixed(2)}
                              </p>
                            </div>
                            <Button
                              onClick={() => setTicketSeleccionado(ticket)}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Página {paginaActual} de {totalPaginas} ({totalVentas}{" "}
                    ventas totales)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cargarVentas(filtros, paginaActual - 1)}
                      disabled={paginaActual === 1 || loading}
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
                              onClick={() => cargarVentas(filtros, pageNum)}
                              disabled={loading}
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
                      onClick={() => cargarVentas(filtros, paginaActual + 1)}
                      disabled={paginaActual === totalPaginas || loading}
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

      {/* Modal de Detalle */}
      {ticketSeleccionado && (
        <DetalleVentaModal
          ticket={ticketSeleccionado}
          onClose={() => setTicketSeleccionado(null)}
        />
      )}
    </div>
  );
}
