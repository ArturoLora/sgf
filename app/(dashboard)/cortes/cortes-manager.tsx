"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Plus, X } from "lucide-react";
import AbrirCorteModal from "./abrir-corte-modal";
import CerrarCorteModal from "./cerrar-corte-modal";

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

interface CortesManagerProps {
  userId: string;
  initialCorteActivo: Corte | null;
  initialCortes: Corte[];
}

export default function CortesManager({
  userId,
  initialCorteActivo,
  initialCortes,
}: CortesManagerProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);

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

      {/* Historial de Cortes */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cortes</CardTitle>
        </CardHeader>
        <CardContent>
          {initialCortes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay cortes registrados
            </p>
          ) : (
            <div className="space-y-3">
              {initialCortes.map((corte) => (
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
    </div>
  );
}
