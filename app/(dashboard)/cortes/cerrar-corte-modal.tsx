"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { XCircle, X } from "lucide-react";

interface Corte {
  id: number;
  folio: string;
  fondoCaja: number;
  efectivo: number;
  cantidadTickets: number;
}

interface CerrarCorteModalProps {
  corte: Corte;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

export default function CerrarCorteModal({
  corte,
  onClose,
  onSuccess,
  onError,
}: CerrarCorteModalProps) {
  const [totalRetiros, setTotalRetiros] = useState("0");
  const [conceptoRetiros, setConceptoRetiros] = useState("");
  const [totalCaja, setTotalCaja] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  const calcularTotalEsperado = () => {
    return (
      Number(corte.fondoCaja) + Number(corte.efectivo) - Number(totalRetiros)
    );
  };

  const calcularDiferencia = () => {
    if (!totalCaja) return 0;
    return Number(totalCaja) - calcularTotalEsperado();
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/cortes/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corteId: corte.id,
          totalRetiros: Number(totalRetiros),
          conceptoRetiros: conceptoRetiros || null,
          totalCaja: Number(totalCaja),
          observaciones: observaciones || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al cerrar corte");
      }

      onSuccess("Corte cerrado exitosamente");
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cerrar Corte: {corte.folio}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Fondo Inicial:</span>
              <span className="font-semibold">
                ${Number(corte.fondoCaja).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Efectivo en Ventas:</span>
              <span className="font-semibold">
                ${Number(corte.efectivo).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tickets Procesados:</span>
              <span className="font-semibold">{corte.cantidadTickets}</span>
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
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas del cierre"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
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
  );
}
