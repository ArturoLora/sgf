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
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
} from "lucide-react";
import SociosFiltros from "./socios-filtros";
import CrearSocioModal from "./crear-socio-modal";
import EditarSocioModal from "./editar-socio-modal";
import DetalleSocioModal from "./detalle-socio-modal";
import RenovarMembresiaModal from "./renovar-membresia-modal";

interface Socio {
  id: number;
  numeroSocio: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  tipoMembresia: string | null;
  descripcionMembresia: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  totalVisitas: number;
  ultimaVisita: string | null;
  activo: boolean;
}

interface FiltrosSocios {
  busqueda: string;
  tipoMembresia: string;
  estado: "todos" | "activos" | "vencidos" | "proximos";
  ordenarPor: "nombre" | "numero" | "fechaFin" | "visitas";
  orden: "asc" | "desc";
}

const ITEMS_POR_PAGINA = 10;

interface SociosManagerProps {
  initialSocios: Socio[];
  sociosVencidos: Socio[];
}

export default function SociosManager({
  initialSocios,
  sociosVencidos,
}: SociosManagerProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [socioEditando, setSocioEditando] = useState<number | null>(null);
  const [socioDetalle, setSocioDetalle] = useState<number | null>(null);
  const [socioRenovando, setSocioRenovando] = useState<number | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);

  const [filtros, setFiltros] = useState<FiltrosSocios>({
    busqueda: "",
    tipoMembresia: "todos",
    estado: "todos",
    ordenarPor: "nombre",
    orden: "asc",
  });

  const sociosFiltrados = useMemo(() => {
    let resultado = [...initialSocios];
    const hoy = new Date();

    // Búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(
        (s) =>
          s.numeroSocio.toLowerCase().includes(busqueda) ||
          s.nombre?.toLowerCase().includes(busqueda) ||
          s.telefono?.toLowerCase().includes(busqueda) ||
          s.email?.toLowerCase().includes(busqueda),
      );
    }

    // Filtro por tipo de membresía
    if (filtros.tipoMembresia !== "todos") {
      resultado = resultado.filter(
        (s) => s.tipoMembresia === filtros.tipoMembresia,
      );
    }

    // Filtro por estado
    switch (filtros.estado) {
      case "activos":
        resultado = resultado.filter((s) => s.activo);
        break;
      case "vencidos":
        resultado = resultado.filter(
          (s) => s.fechaFin && new Date(s.fechaFin) < hoy,
        );
        break;
      case "proximos":
        const en7Dias = new Date();
        en7Dias.setDate(en7Dias.getDate() + 7);
        resultado = resultado.filter(
          (s) =>
            s.fechaFin &&
            new Date(s.fechaFin) >= hoy &&
            new Date(s.fechaFin) <= en7Dias,
        );
        break;
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      let valorA: any, valorB: any;

      switch (filtros.ordenarPor) {
        case "nombre":
          valorA = a.nombre || "";
          valorB = b.nombre || "";
          break;
        case "numero":
          valorA = a.numeroSocio;
          valorB = b.numeroSocio;
          break;
        case "fechaFin":
          valorA = a.fechaFin ? new Date(a.fechaFin).getTime() : 0;
          valorB = b.fechaFin ? new Date(b.fechaFin).getTime() : 0;
          break;
        case "visitas":
          valorA = a.totalVisitas;
          valorB = b.totalVisitas;
          break;
        default:
          valorA = a.nombre || "";
          valorB = b.nombre || "";
      }

      if (valorA < valorB) return filtros.orden === "asc" ? -1 : 1;
      if (valorA > valorB) return filtros.orden === "asc" ? 1 : -1;
      return 0;
    });

    return resultado;
  }, [initialSocios, filtros]);

  // Paginación
  const totalPaginas = Math.ceil(sociosFiltrados.length / ITEMS_POR_PAGINA);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const sociosPaginados = sociosFiltrados.slice(
    inicio,
    inicio + ITEMS_POR_PAGINA,
  );

  const handleFiltrar = (nuevosFiltros: FiltrosSocios) => {
    setFiltros(nuevosFiltros);
    setPaginaActual(1);
  };

  const handleSuccess = (mensaje: string) => {
    setSuccess(mensaje);
    router.refresh();
    setTimeout(() => setSuccess(""), 3000);
  };

  const getEstadoMembresia = (socio: Socio) => {
    if (!socio.fechaFin) return null;

    const hoy = new Date();
    const fechaFin = new Date(socio.fechaFin);
    const diferencia = fechaFin.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) {
      return {
        tipo: "vencida",
        dias: Math.abs(diasRestantes),
        texto: "Vencida",
      };
    } else if (diasRestantes <= 7) {
      return { tipo: "proximo", dias: diasRestantes, texto: "Por vencer" };
    } else {
      return { tipo: "vigente", dias: diasRestantes, texto: "Vigente" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Socios</h1>
          <p className="text-gray-500">Gestión de socios y membresías</p>
        </div>
        <Button onClick={() => setShowCrearModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Socio
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

      {/* Alertas de Socios Vencidos */}
      {sociosVencidos.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              {sociosVencidos.length}{" "}
              {sociosVencidos.length === 1 ? "socio" : "socios"} con membresía
              vencida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sociosVencidos.slice(0, 5).map((socio) => (
                <Badge
                  key={socio.id}
                  variant="outline"
                  className="bg-white cursor-pointer hover:bg-orange-100"
                  onClick={() => setSocioDetalle(socio.id)}
                >
                  {socio.nombre || socio.numeroSocio}
                </Badge>
              ))}
              {sociosVencidos.length > 5 && (
                <Badge variant="outline" className="bg-white">
                  +{sociosVencidos.length - 5} más
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{initialSocios.length}</div>
            <p className="text-xs text-gray-500">Total de socios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {initialSocios.filter((s) => s.activo).length}
            </div>
            <p className="text-xs text-gray-500">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {sociosVencidos.length}
            </div>
            <p className="text-xs text-gray-500">Vencidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {
                initialSocios.filter((s) => {
                  if (!s.fechaFin) return false;
                  const hoy = new Date();
                  const fechaFin = new Date(s.fechaFin);
                  const en7Dias = new Date();
                  en7Dias.setDate(en7Dias.getDate() + 7);
                  return fechaFin >= hoy && fechaFin <= en7Dias;
                }).length
              }
            </div>
            <p className="text-xs text-gray-500">Por vencer (7 días)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <SociosFiltros onFiltrar={handleFiltrar} />

      {/* Lista de Socios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Socios</span>
            <span className="text-sm font-normal text-gray-500">
              {sociosFiltrados.length} resultados
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sociosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No hay socios que coincidan con los filtros
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {sociosPaginados.map((socio) => {
                  const estado = getEstadoMembresia(socio);
                  return (
                    <div
                      key={socio.id}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold">
                            {socio.nombre || socio.numeroSocio}
                          </p>
                          <Badge variant="outline">{socio.numeroSocio}</Badge>
                          {!socio.activo && (
                            <Badge variant="destructive">Inactivo</Badge>
                          )}
                          {estado && (
                            <Badge
                              variant={
                                estado.tipo === "vencida"
                                  ? "destructive"
                                  : estado.tipo === "proximo"
                                    ? "outline"
                                    : "default"
                              }
                              className={
                                estado.tipo === "proximo"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : estado.tipo === "vigente"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : ""
                              }
                            >
                              {estado.texto}
                              {estado.tipo !== "vigente" &&
                                ` (${estado.dias} días)`}
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          {socio.tipoMembresia && (
                            <p>
                              <span className="font-medium">Membresía:</span>{" "}
                              {socio.tipoMembresia.replace("_", " ")}
                            </p>
                          )}
                          {socio.fechaFin && (
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Vence:{" "}
                              {new Date(socio.fechaFin).toLocaleDateString()}
                            </p>
                          )}
                          <p>
                            Visitas: {socio.totalVisitas}
                            {socio.ultimaVisita && (
                              <span className="text-gray-400">
                                {" "}
                                · Última:{" "}
                                {new Date(
                                  socio.ultimaVisita,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {estado?.tipo === "vencida" && (
                          <Button
                            onClick={() => setSocioRenovando(socio.id)}
                            variant="outline"
                            size="sm"
                            className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                          >
                            <UserPlus className="h-4 w-4" />
                            Renovar
                          </Button>
                        )}
                        <Button
                          onClick={() => setSocioDetalle(socio.id)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                        <Button
                          onClick={() => setSocioEditando(socio.id)}
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

              {/* Paginación - siempre visible */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Mostrando {inicio + 1}-
                  {Math.min(inicio + ITEMS_POR_PAGINA, sociosFiltrados.length)}{" "}
                  de {sociosFiltrados.length}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      {showCrearModal && (
        <CrearSocioModal
          onClose={() => setShowCrearModal(false)}
          onSuccess={(msg) => {
            setShowCrearModal(false);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {socioEditando && (
        <EditarSocioModal
          socioId={socioEditando}
          onClose={() => setSocioEditando(null)}
          onSuccess={(msg) => {
            setSocioEditando(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}

      {socioDetalle && (
        <DetalleSocioModal
          socioId={socioDetalle}
          onClose={() => setSocioDetalle(null)}
          onEditar={(id) => {
            setSocioDetalle(null);
            setSocioEditando(id);
          }}
          onRenovar={(id) => {
            setSocioDetalle(null);
            setSocioRenovando(id);
          }}
        />
      )}

      {socioRenovando && (
        <RenovarMembresiaModal
          socioId={socioRenovando}
          onClose={() => setSocioRenovando(null)}
          onSuccess={(msg) => {
            setSocioRenovando(null);
            handleSuccess(msg);
          }}
          onError={setError}
        />
      )}
    </div>
  );
}
