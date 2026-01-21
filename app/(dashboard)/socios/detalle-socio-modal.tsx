"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Edit,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  TrendingUp,
  UserPlus,
  Activity,
} from "lucide-react";

interface DetalleSocioModalProps {
  socioId: number;
  onClose: () => void;
  onEditar: (socioId: number) => void;
  onRenovar: (socioId: number) => void;
}

export default function DetalleSocioModal({
  socioId,
  onClose,
  onEditar,
  onRenovar,
}: DetalleSocioModalProps) {
  const [socio, setSocio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const ITEMS_POR_PAGINA_HISTORIAL = 5;

  useEffect(() => {
    cargarSocio();
  }, [socioId]);

  const cargarSocio = async () => {
    try {
      const res = await fetch(`/api/socios/${socioId}`);
      if (res.ok) {
        const data = await res.json();
        setSocio(data);
      }
    } catch (err) {
      console.error("Error al cargar socio:", err);
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

  if (!socio) return null;

  const getEstadoMembresia = () => {
    if (!socio.fechaFin) return null;
    const hoy = new Date();
    const fechaFin = new Date(socio.fechaFin);
    const diasRestantes = Math.ceil(
      (fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diasRestantes < 0) {
      return { tipo: "vencida", dias: Math.abs(diasRestantes) };
    } else if (diasRestantes <= 7) {
      return { tipo: "proximo", dias: diasRestantes };
    }
    return { tipo: "vigente", dias: diasRestantes };
  };

  const estado = getEstadoMembresia();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-white rounded-t-xl shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {socio.nombre || socio.numeroSocio}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Socio #{socio.numeroSocio}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {estado?.tipo === "vencida" && (
                <Button
                  onClick={() => onRenovar(socioId)}
                  variant="outline"
                  size="sm"
                  className="gap-2 text-orange-600 border-orange-200"
                >
                  <UserPlus className="h-4 w-4" />
                  Renovar
                </Button>
              )}
              <Button
                onClick={() => onEditar(socioId)}
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
          {/* Estado */}
          <div className="flex items-center gap-2">
            {!socio.activo && <Badge variant="destructive">Inactivo</Badge>}
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
                {estado.tipo === "vencida" &&
                  `Vencida hace ${estado.dias} días`}
                {estado.tipo === "proximo" && `Vence en ${estado.dias} días`}
                {estado.tipo === "vigente" && "Vigente"}
              </Badge>
            )}
          </div>

          {/* Información de Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {socio.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{socio.telefono}</span>
                </div>
              )}
              {socio.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{socio.email}</span>
                </div>
              )}
              {socio.fechaNacimiento && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>
                    Nacimiento:{" "}
                    {new Date(socio.fechaNacimiento).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Membresía */}
          {socio.tipoMembresia && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Membresía
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <p className="font-medium">
                    {socio.tipoMembresia.replace("_", " ")}
                  </p>
                </div>
                {socio.descripcionMembresia && (
                  <div>
                    <p className="text-sm text-gray-600">Descripción</p>
                    <p className="font-medium">{socio.descripcionMembresia}</p>
                  </div>
                )}
                {socio.fechaInicio && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Inicio</p>
                      <p className="font-medium">
                        {new Date(socio.fechaInicio).toLocaleDateString()}
                      </p>
                    </div>
                    {socio.fechaFin && (
                      <div>
                        <p className="text-sm text-gray-600">Vencimiento</p>
                        <p className="font-medium">
                          {new Date(socio.fechaFin).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Actividad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total de Visitas</p>
                  <p className="text-2xl font-bold">{socio.totalVisitas}</p>
                </div>
                {socio.ultimaVisita && (
                  <div>
                    <p className="text-sm text-gray-600">Última Visita</p>
                    <p className="font-medium">
                      {new Date(socio.ultimaVisita).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Historial de Ventas */}
          {socio.inventarios && socio.inventarios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Historial Reciente
                  </span>
                  <span className="text-xs font-normal text-gray-500">
                    {socio.inventarios.length} compras
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {socio.inventarios
                    .slice(
                      (paginaHistorial - 1) * ITEMS_POR_PAGINA_HISTORIAL,
                      paginaHistorial * ITEMS_POR_PAGINA_HISTORIAL,
                    )
                    .map((inv: any) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-2 rounded border text-sm"
                      >
                        <div>
                          <p className="font-medium">{inv.producto.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(inv.fecha).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-semibold">
                          ${Number(inv.total).toFixed(2)}
                        </p>
                      </div>
                    ))}
                </div>

                {/* Paginación del historial */}
                {socio.inventarios.length > ITEMS_POR_PAGINA_HISTORIAL && (
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
                        socio.inventarios.length / ITEMS_POR_PAGINA_HISTORIAL,
                      )}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPaginaHistorial((p) =>
                          Math.min(
                            Math.ceil(
                              socio.inventarios.length /
                                ITEMS_POR_PAGINA_HISTORIAL,
                            ),
                            p + 1,
                          ),
                        )
                      }
                      disabled={
                        paginaHistorial ===
                        Math.ceil(
                          socio.inventarios.length / ITEMS_POR_PAGINA_HISTORIAL,
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
