/**
 * UBICACIÓN: app/(dashboard)/cortes/page.tsx
 *
 * Vista de Cortes de Caja
 * ✅ Usa el usuario de la sesión actual
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface Corte {
  id: number;
  folio: string;
  cajero: {
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

export default function CortesPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [corteActivo, setCorteActivo] = useState<Corte | null>(null);
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal estados
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);

  // Form data
  const [fondoCaja, setFondoCaja] = useState("500");
  const [observacionesApertura, setObservacionesApertura] = useState("");
  const [totalRetiros, setTotalRetiros] = useState("0");
  const [conceptoRetiros, setConceptoRetiros] = useState("");
  const [totalCaja, setTotalCaja] = useState("");
  const [observacionesCierre, setObservacionesCierre] = useState("");

  useEffect(() => {
    obtenerUsuarioActual();
    cargarDatos();
  }, []);

  const obtenerUsuarioActual = async () => {
    const { data: session } = await authClient.getSession();
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
    }
  };

  const cargarDatos = async () => {
    try {
      const [corteRes, cortesRes] = await Promise.all([
        fetch("/api/cortes/activo"),
        fetch("/api/cortes"),
      ]);

      if (corteRes.ok) {
        const corte = await corteRes.json();
        setCorteActivo(corte);
      } else {
        setCorteActivo(null);
      }

      if (cortesRes.ok) {
        const data = await cortesRes.json();
        setCortes(data);
      }
    } catch (err) {
      setError("Error al cargar cortes");
    }
  };

  const abrirCorte = async () => {
    if (!currentUserId) {
      setError("No se pudo obtener el usuario actual");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/cortes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cajeroId: currentUserId, // ✅ Usuario actual de la sesión
          fondoCaja: Number(fondoCaja),
          observaciones: observacionesApertura || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al abrir corte");
      }

      setSuccess("Corte abierto exitosamente");
      setShowAbrirModal(false);
      setFondoCaja("500");
      setObservacionesApertura("");
      await cargarDatos();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cerrarCorte = async () => {
    if (!corteActivo) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/cortes/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corteId: corteActivo.id,
          totalRetiros: Number(totalRetiros),
          conceptoRetiros: conceptoRetiros || null,
          totalCaja: Number(totalCaja),
          observaciones: observacionesCierre || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al cerrar corte");
      }

      setSuccess("Corte cerrado exitosamente");
      setShowCerrarModal(false);
      setTotalRetiros("0");
      setConceptoRetiros("");
      setTotalCaja("");
      setObservacionesCierre("");
      await cargarDatos();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotalEsperado = () => {
    if (!corteActivo) return 0;
    return (
      Number(corteActivo.fondoCaja) +
      Number(corteActivo.efectivo) -
      Number(totalRetiros)
    );
  };

  const calcularDiferencia = () => {
    if (!totalCaja) return 0;
    return Number(totalCaja) - calcularTotalEsperado();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cortes de Caja</h1>
          <p className="text-gray-500">Gestión de cortes y cierres de caja</p>
        </div>
        {!corteActivo && (
          <Button onClick={() => setShowAbrirModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Abrir Corte
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-600">
          {success}
        </div>
      )}

      {/* Corte Activo */}
      {corteActivo && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Corte Activo: {corteActivo.folio}
              </CardTitle>
              <Button
                onClick={() => setShowCerrarModal(true)}
                variant="destructive"
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cerrar Corte
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600">Cajero</p>
                <p className="font-semibold">{corteActivo.cajero.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Apertura</p>
                <p className="font-semibold">
                  {new Date(corteActivo.fechaApertura).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fondo Inicial</p>
                <p className="font-semibold">
                  ${Number(corteActivo.fondoCaja).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tickets</p>
                <p className="font-semibold">{corteActivo.cantidadTickets}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Efectivo</p>
                <p className="font-semibold">
                  ${Number(corteActivo.efectivo).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tarjeta Débito</p>
                <p className="font-semibold">
                  ${Number(corteActivo.tarjetaDebito).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tarjeta Crédito</p>
                <p className="font-semibold">
                  ${Number(corteActivo.tarjetaCredito).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Ventas</p>
                <p className="text-lg font-bold text-green-600">
                  ${Number(corteActivo.totalVentas).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Cortes */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cortes</CardTitle>
        </CardHeader>
        <CardContent>
          {cortes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay cortes registrados
            </p>
          ) : (
            <div className="space-y-3">
              {cortes.map((corte) => (
                <div
                  key={corte.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{corte.folio}</p>
                      <Badge
                        variant={corte.fechaCierre ? "secondary" : "default"}
                      >
                        {corte.fechaCierre ? "Cerrado" : "Activo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {corte.cajero.name} ·{" "}
                      {new Date(corte.fechaApertura).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Ventas</p>
                    <p className="text-lg font-bold">
                      ${Number(corte.totalVentas).toFixed(2)}
                    </p>
                    {corte.fechaCierre && corte.diferencia !== 0 && (
                      <p
                        className={`text-sm ${corte.diferencia > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {corte.diferencia > 0 ? "+" : ""}
                        {Number(corte.diferencia).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Abrir Corte */}
      {showAbrirModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Abrir Nuevo Corte</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAbrirModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Fondo de Caja Inicial</Label>
                <Input
                  type="number"
                  value={fondoCaja}
                  onChange={(e) => setFondoCaja(e.target.value)}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label>Observaciones (opcional)</Label>
                <Input
                  value={observacionesApertura}
                  onChange={(e) => setObservacionesApertura(e.target.value)}
                  placeholder="Turno matutino"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAbrirModal(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={abrirCorte}
                  className="flex-1 gap-2"
                  disabled={loading}
                >
                  <Calculator className="h-4 w-4" />
                  {loading ? "Abriendo..." : "Abrir Corte"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Cerrar Corte */}
      {showCerrarModal && corteActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Cerrar Corte: {corteActivo.folio}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCerrarModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Resumen */}
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Fondo Inicial:</span>
                  <span className="font-semibold">
                    ${Number(corteActivo.fondoCaja).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Efectivo en Ventas:</span>
                  <span className="font-semibold">
                    ${Number(corteActivo.efectivo).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tickets Procesados:</span>
                  <span className="font-semibold">
                    {corteActivo.cantidadTickets}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Total de Retiros</Label>
                <Input
                  type="number"
                  value={totalRetiros}
                  onChange={(e) => setTotalRetiros(e.target.value)}
                  placeholder="0"
                />
              </div>

              {Number(totalRetiros) > 0 && (
                <div className="space-y-2">
                  <Label>Concepto de Retiros</Label>
                  <Input
                    value={conceptoRetiros}
                    onChange={(e) => setConceptoRetiros(e.target.value)}
                    placeholder="Pago a proveedor, gastos, etc."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Total en Caja (Conteo Real)</Label>
                <Input
                  type="number"
                  value={totalCaja}
                  onChange={(e) => setTotalCaja(e.target.value)}
                  placeholder="Contar efectivo en caja"
                />
              </div>

              {totalCaja && (
                <div className="rounded-lg bg-blue-50 p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Esperado:</span>
                    <span className="font-semibold">
                      ${calcularTotalEsperado().toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Contado:</span>
                    <span className="font-semibold">
                      ${Number(totalCaja).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Diferencia:</span>
                    <span
                      className={
                        calcularDiferencia() === 0
                          ? "text-green-600"
                          : calcularDiferencia() > 0
                            ? "text-green-600"
                            : "text-red-600"
                      }
                    >
                      {calcularDiferencia() > 0 ? "+" : ""}
                      {calcularDiferencia().toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observaciones (opcional)</Label>
                <Input
                  value={observacionesCierre}
                  onChange={(e) => setObservacionesCierre(e.target.value)}
                  placeholder="Notas del cierre"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowCerrarModal(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={cerrarCorte}
                  variant="destructive"
                  className="flex-1 gap-2"
                  disabled={loading || !totalCaja}
                >
                  <XCircle className="h-4 w-4" />
                  {loading ? "Cerrando..." : "Cerrar Corte"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
